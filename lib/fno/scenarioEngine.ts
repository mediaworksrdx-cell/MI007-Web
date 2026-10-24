// ─── Institutional Multidimensional Scenario & Carry Efficiency Engine ────────
// Evaluates strategy P&L, ROI%, 1st/2nd-order Greeks, and Theta-to-Gamma carry
// efficiency across 2D (Spot × Time) and (Spot × IV) scenario grids.

import { Greeks, StrategyLeg } from './fnoTypes';
import { evaluatePortfolioAtScenario } from './payoffEngine';
import { VolSurfaceConfig } from './volatilitySurface';

export type ScenarioMatrixMode = 'SPOT_TIME' | 'SPOT_IV';

export interface ScenarioCell {
  rowIndex: number;
  colIndex: number;
  rowLabel: string;
  colLabel: string;
  spotPrice: number;
  spotShockPct: number;
  timeShiftDays: number;
  remainingDays: number;
  ivShiftPct: number;
  pnl: number;
  roiPct: number;
  netGreeks: Required<Greeks>;
  /**
   * Analytical Theta-to-Gamma Carry Ratio:
   * Daily Theta divided by expected 1-sigma daily Gamma rent (0.5 * |Gamma| * (S * sigma_daily)^2).
   * Positive values > 1.0 indicate positive time-decay carry exceeding 1-sigma gamma curvature cost.
   */
  thetaGammaRatio: number;
  /** Heuristic indicator for cells with positive Theta, positive/flat P&L, and high carry-to-curvature ratio */
  isThetaSweetSpot: boolean;
}

export interface ScenarioMatrixResult {
  mode: ScenarioMatrixMode;
  referenceSpot: number;
  deployedCapital: number;
  frontDaysToExpiry: number;
  spotShocksPct: number[];
  spotPrices: number[];
  rowValues: number[];
  rowLabels: string[];
  cells: ScenarioCell[][];
  minPnl: number;
  maxPnl: number;
  bestCell: ScenarioCell | null;
  worstCell: ScenarioCell | null;
  sweetSpotFormulaNote: string;
}

export const DEFAULT_SPOT_SHOCKS_PCT = [-8, -6, -4, -2, -1, 0, 1, 2, 4, 6, 8];
export const DEFAULT_IV_SHOCKS_PCT = [-10, -5, -2.5, 0, 2.5, 5, 10, 15];

/**
 * Computes deployed capital (premium paid for long legs + estimated margin for short legs)
 * used as the denominator for ROI% across scenario grids.
 */
export function computeDeployedCapital(legs: StrategyLeg[]): number {
  const activeLegs = (legs || []).filter((l) => !l.disabled);
  let capitalRequired = 0;
  let marginRequired = 0;

  for (const leg of activeLegs) {
    const legCost = leg.entryPrice * leg.lots * leg.lotSize;
    if (leg.action === 'BUY') {
      capitalRequired += legCost;
    } else {
      marginRequired += Math.max(25000, leg.strike * leg.lots * leg.lotSize * 0.12);
    }
  }

  return Math.max(1, marginRequired > 0 ? marginRequired : capitalRequired);
}

/**
 * Generates adaptive time-horizon rows from T+0 up to Expiry (daysToExpiry).
 */
export function buildTimeHorizonRows(daysToExpiry: number): {
  shifts: number[];
  labels: string[];
} {
  const safeDte = Math.max(1, Math.round(daysToExpiry));
  if (safeDte <= 7) {
    const shifts: number[] = [];
    const labels: string[] = [];
    for (let d = 0; d <= safeDte; d++) {
      shifts.push(d);
      labels.push(d === 0 ? 'T+0 (Now)' : d === safeDte ? `T+${d} (Expiry)` : `T+${d}d (${safeDte - d}DTE)`);
    }
    return { shifts, labels };
  }

  // For longer expiries (e.g. 28d or 63d), sample 7 evenly spaced horizons ending at Expiry
  const steps = 7;
  const shifts: number[] = [];
  const labels: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const d = Math.round((i / steps) * safeDte);
    if (shifts.length === 0 || shifts[shifts.length - 1] !== d) {
      shifts.push(d);
      labels.push(
        d === 0
          ? 'T+0 (Now)'
          : d === safeDte
          ? `T+${d}d (Expiry)`
          : `T+${d}d (${safeDte - d}DTE)`
      );
    }
  }
  return { shifts, labels };
}

/**
 * Evaluates a full 2D Scenario Matrix (Spot × Time or Spot × IV).
 */
export function computeScenarioMatrix(params: {
  legs: StrategyLeg[];
  referenceSpot: number;
  frontDaysToExpiry: number;
  mode: ScenarioMatrixMode;
  baseTimeShiftDays?: number;
  baseIvShiftPct?: number;
  spotShocksPct?: number[];
  ivShocksPct?: number[];
  volSurfaceConfig?: Partial<VolSurfaceConfig>;
}): ScenarioMatrixResult {
  const {
    legs,
    referenceSpot,
    frontDaysToExpiry,
    mode,
    baseTimeShiftDays = 0,
    baseIvShiftPct = 0,
    spotShocksPct = DEFAULT_SPOT_SHOCKS_PCT,
    ivShocksPct = DEFAULT_IV_SHOCKS_PCT,
    volSurfaceConfig,
  } = params;

  const activeLegs = (legs || []).filter((l) => !l.disabled);
  const deployedCapital = computeDeployedCapital(activeLegs);
  const spotPrices = spotShocksPct.map(
    (pct) => Math.round(referenceSpot * (1 + pct / 100.0) * 100) / 100
  );

  let rowValues: number[] = [];
  let rowLabels: string[] = [];

  if (mode === 'SPOT_TIME') {
    const horizons = buildTimeHorizonRows(frontDaysToExpiry);
    rowValues = horizons.shifts;
    rowLabels = horizons.labels;
  } else {
    rowValues = ivShocksPct;
    rowLabels = ivShocksPct.map((v) =>
      v > 0 ? `+${v}% IV` : v === 0 ? '0% (Base IV)' : `${v}% IV`
    );
  }

  // Average leg IV for daily 1-sigma move normalization in Theta/Gamma ratio
  const avgIvDec =
    activeLegs.length > 0
      ? activeLegs.reduce((acc, l) => acc + (l.iv || 14.5) / 100.0, 0) / activeLegs.length
      : 0.145;
  const dailySigma = avgIvDec / Math.sqrt(365.0);

  const cells: ScenarioCell[][] = [];
  let minPnl = Infinity;
  let maxPnl = -Infinity;
  let bestCell: ScenarioCell | null = null;
  let worstCell: ScenarioCell | null = null;

  for (let r = 0; r < rowValues.length; r++) {
    const rowCells: ScenarioCell[] = [];
    const timeShift = mode === 'SPOT_TIME' ? rowValues[r] : baseTimeShiftDays;
    const ivShift = mode === 'SPOT_IV' ? rowValues[r] : baseIvShiftPct;
    const remainingDays = Math.max(0, frontDaysToExpiry - timeShift);

    for (let c = 0; c < spotShocksPct.length; c++) {
      const shockPct = spotShocksPct[c];
      const candSpot = spotPrices[c];

      const evalRes = evaluatePortfolioAtScenario({
        legs: activeLegs,
        candidateSpot: candSpot,
        referenceSpot,
        timeShiftDays: timeShift,
        ivShiftPct: ivShift,
        frontDaysToExpiry,
        volSurfaceConfig,
      });

      const isAtExpiry = mode === 'SPOT_TIME' && remainingDays <= 0.05;
      const cellPnl = Math.round(isAtExpiry ? evalRes.expiryPnl : evalRes.pnl);
      const roiPct = Math.round((cellPnl / deployedCapital) * 10000) / 100;

      // Analytical Theta-to-Gamma Carry Ratio:
      // Expected 1-sigma daily gamma curvature cost = 0.5 * |Gamma| * (candSpot * dailySigma)^2
      const oneSigmaSpotMove = candSpot * dailySigma;
      const dailyGammaBenchmark = Math.max(
        1.0,
        0.5 * Math.abs(evalRes.netGreeks.gamma) * oneSigmaSpotMove * oneSigmaSpotMove
      );
      const thetaGammaRatio = isAtExpiry
        ? 0
        : Math.round((evalRes.netGreeks.theta / dailyGammaBenchmark) * 100) / 100;

      // Theta Sweet-Spot heuristic: positive daily Theta carry, ratio >= 0.85, and non-negative P&L
      const isThetaSweetSpot =
        !isAtExpiry &&
        evalRes.netGreeks.theta > 0 &&
        thetaGammaRatio >= 0.85 &&
        cellPnl >= -deployedCapital * 0.015;

      const cell: ScenarioCell = {
        rowIndex: r,
        colIndex: c,
        rowLabel: rowLabels[r],
        colLabel: shockPct > 0 ? `+${shockPct}%` : `${shockPct}%`,
        spotPrice: candSpot,
        spotShockPct: shockPct,
        timeShiftDays: timeShift,
        remainingDays,
        ivShiftPct: ivShift,
        pnl: cellPnl,
        roiPct,
        netGreeks: {
          delta: Math.round(evalRes.netGreeks.delta * 100) / 100,
          gamma: Math.round(evalRes.netGreeks.gamma * 1000000) / 1000000,
          theta: Math.round(evalRes.netGreeks.theta * 100) / 100,
          vega: Math.round(evalRes.netGreeks.vega * 100) / 100,
          rho: Math.round(evalRes.netGreeks.rho * 100) / 100,
          vanna: Math.round(evalRes.netGreeks.vanna * 1000) / 1000,
          charm: Math.round(evalRes.netGreeks.charm * 1000) / 1000,
          vomma: Math.round(evalRes.netGreeks.vomma * 1000) / 1000,
        },
        thetaGammaRatio,
        isThetaSweetSpot,
      };

      if (cellPnl < minPnl) {
        minPnl = cellPnl;
        worstCell = cell;
      }
      if (cellPnl > maxPnl) {
        maxPnl = cellPnl;
        bestCell = cell;
      }

      rowCells.push(cell);
    }
    cells.push(rowCells);
  }

  if (minPnl === Infinity) minPnl = 0;
  if (maxPnl === -Infinity) maxPnl = 0;

  return {
    mode,
    referenceSpot,
    deployedCapital: Math.round(deployedCapital),
    frontDaysToExpiry,
    spotShocksPct,
    spotPrices,
    rowValues,
    rowLabels,
    cells,
    minPnl,
    maxPnl,
    bestCell,
    worstCell,
    sweetSpotFormulaNote:
      'Theta Carry Ratio = Daily Theta / [0.5 × |Gamma| × (Spot × σ_daily)²]. Highlights analytical zones where daily time-decay carry exceeds 1σ gamma curvature cost (decision-support heuristic, not guaranteed profit).',
  };
}

/**
 * Serializes a ScenarioMatrixResult to CSV format for desk export.
 */
export function exportScenarioMatrixToCsv(
  matrix: ScenarioMatrixResult,
  metric: 'PNL' | 'ROI' = 'PNL'
): string {
  const headerCols = [
    matrix.mode === 'SPOT_TIME' ? 'Horizon \\ Spot Shock' : 'IV Shift \\ Spot Shock',
    ...matrix.spotShocksPct.map(
      (pct, idx) => `${pct > 0 ? `+${pct}%` : `${pct}%`} (${matrix.spotPrices[idx]})`
    ),
  ];
  const lines = [headerCols.join(',')];

  for (let r = 0; r < matrix.cells.length; r++) {
    const row = matrix.cells[r];
    const values = row.map((c) => (metric === 'ROI' ? `${c.roiPct.toFixed(2)}%` : `${c.pnl}`));
    lines.push([`"${matrix.rowLabels[r]}"`, ...values].join(','));
  }

  return lines.join('\n');
}
