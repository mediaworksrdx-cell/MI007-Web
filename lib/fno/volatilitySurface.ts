// ─── Institutional Volatility Surface, Skew & Spot-Vol Coupling Engine ──────
// Models strike-level implied volatility, Sticky-Strike vs Sticky-Delta dynamics,
// Panic Skew steepening, Spot-Vol coupling, and multi-expiry term-structure scaling.

import { OptionChainData, OptionType } from './fnoTypes';
import { parseExpiryDaysToExpiry } from './fnoDataService';

export type VolSurfaceMode =
  | 'STICKY_STRIKE'
  | 'STICKY_DELTA'
  | 'PANIC_SKEW'
  | 'VOL_CRUSH';

export type TermStructureScalingMode = 'SQRT_TIME' | 'UNIFORM';

export interface VolSurfaceConfig {
  mode: VolSurfaceMode;
  /** User parallel IV shift in percentage points (e.g. +5 means +5% IV) */
  parallelIvShockPct: number;
  /** Automatically couple spot return dS/S0 to ATM IV and downside skew */
  autoSpotVolCoupling: boolean;
  /** Beta of ATM IV (in IV %-pts) per 1% negative spot return (default: -1.25) */
  spotVolBeta: number;
  /** Additional downside put skew multiplier in PANIC_SKEW or downside shocks */
  downsideSkewSteepening: number;
  /** How IV shocks scale across expiries for Calendar / Diagonal spreads */
  termStructureScaling: TermStructureScalingMode;
}

export const DEFAULT_VOL_SURFACE_CONFIG: VolSurfaceConfig = {
  mode: 'STICKY_STRIKE',
  parallelIvShockPct: 0,
  autoSpotVolCoupling: false,
  spotVolBeta: -1.25,
  downsideSkewSteepening: 1.6,
  termStructureScaling: 'SQRT_TIME',
};

export interface StrikeVolSurfacePoint {
  strike: number;
  moneynessPct: number;
  baselineCallIvPct: number;
  baselinePutIvPct: number;
  shockedCallIvPct: number;
  shockedPutIvPct: number;
  ivShiftCallPct: number;
  ivShiftPutPct: number;
}

export interface TermStructureNode {
  expiry: string;
  daysToExpiry: number;
  baselineAtmIvPct: number;
  shockedAtmIvPct: number;
  termShockMultiplier: number;
}

export interface VolatilitySurfaceAnalytics {
  underlyingSymbol: string;
  referenceSpot: number;
  simulatedSpot: number;
  spotMovePct: number;
  atmStrike: number;
  baselineAtmIvPct: number;
  shockedAtmIvPct: number;
  coupledAtmShiftPct: number;
  /** 5% OTM Put IV minus 5% OTM Call IV (in IV %-pts) */
  baselineSkew25dPct: number;
  shockedSkew25dPct: number;
  config: VolSurfaceConfig;
  strikes: StrikeVolSurfacePoint[];
  termStructure: TermStructureNode[];
}

/**
 * Computes the spot-volatility coupled ATM IV shift (in percentage points, e.g. +2.5 for +2.5%)
 * given a spot percentage move.
 */
export function computeSpotCoupledIvShiftPct(
  spotMovePct: number,
  config: VolSurfaceConfig
): number {
  if (!config.autoSpotVolCoupling || Math.abs(spotMovePct) < 1e-6) {
    return 0;
  }
  if (spotMovePct < 0) {
    // Downside spot move expands volatility (spotVolBeta is negative, e.g. -1.25 => -2% spot * -1.25 = +2.5% IV)
    return Math.min(35, Math.abs(spotMovePct) * Math.abs(config.spotVolBeta));
  }
  // Upside spot rally mildly compresses volatility (asymmetric leverage effect)
  return Math.max(-10, -spotMovePct * Math.abs(config.spotVolBeta) * 0.35);
}

/**
 * Computes the term-structure shock scaling factor for a leg with legDaysToExpiry
 * relative to the front/reference expiry.
 */
export function computeTermStructureMultiplier(
  legDaysToExpiry: number,
  frontDaysToExpiry: number,
  scalingMode: TermStructureScalingMode
): number {
  if (scalingMode === 'UNIFORM') return 1.0;
  const safeFront = Math.max(1, frontDaysToExpiry);
  const safeLeg = Math.max(1, legDaysToExpiry);
  // sqrt(T_front / T_leg) bounded to [0.35, 2.0] for numerical stability
  return Math.max(0.35, Math.min(2.0, Math.sqrt(safeFront / safeLeg)));
}

/**
 * Evaluates the effective Implied Volatility (in decimal, e.g. 0.165 for 16.5%)
 * for an option contract of given strike, type, and expiry under a simulated spot
 * price and volatility surface configuration.
 */
export function evaluateShockedLegVolatility(params: {
  strike: number;
  instrument: OptionType;
  baselineIvDecimal: number;
  referenceSpot: number;
  simulatedSpot: number;
  legDaysToExpiry: number;
  frontDaysToExpiry: number;
  config?: Partial<VolSurfaceConfig>;
}): number {
  const {
    strike,
    instrument,
    baselineIvDecimal,
    referenceSpot,
    simulatedSpot,
    legDaysToExpiry,
    frontDaysToExpiry,
  } = params;

  const cfg: VolSurfaceConfig = {
    ...DEFAULT_VOL_SURFACE_CONFIG,
    ...(params.config || {}),
  };

  const safeRefSpot = Math.max(1, referenceSpot);
  const safeSimSpot = Math.max(1, simulatedSpot);
  const spotMovePct = ((safeSimSpot - safeRefSpot) / safeRefSpot) * 100.0;

  // Base moneyness at reference spot vs simulated spot
  const refMoneyness = (strike - safeRefSpot) / safeRefSpot;
  const simMoneyness = (strike - safeSimSpot) / safeSimSpot;

  let effectiveBaseIv = baselineIvDecimal;

  // 1. Surface Regime Adjustment (Sticky-Strike vs Sticky-Delta vs Panic-Skew vs Vol-Crush)
  if (cfg.mode === 'STICKY_DELTA') {
    // Smile floats with simulated spot: re-anchor skew/smile to simMoneyness instead of refMoneyness
    const refSkew = -refMoneyness * 0.12;
    const refSmile = refMoneyness * refMoneyness * 0.45;
    const simSkew = -simMoneyness * 0.12;
    const simSmile = simMoneyness * simMoneyness * 0.45;

    const refSurfaceAddon =
      (instrument === 'CE' ? refSkew * 0.5 : -refSkew * 1.2) + refSmile;
    const simSurfaceAddon =
      (instrument === 'CE' ? simSkew * 0.5 : -simSkew * 1.2) + simSmile;

    effectiveBaseIv = baselineIvDecimal - refSurfaceAddon + simSurfaceAddon;
  } else if (cfg.mode === 'PANIC_SKEW') {
    // Downside strikes (simMoneyness < 0) experience steep IV expansion; upside calls compress slightly
    if (simMoneyness < 0) {
      const downsideDistance = Math.abs(simMoneyness);
      const panicBoost =
        downsideDistance * 0.32 * cfg.downsideSkewSteepening +
        downsideDistance * downsideDistance * 0.85;
      effectiveBaseIv = baselineIvDecimal + panicBoost + 0.025;
    } else {
      effectiveBaseIv = baselineIvDecimal + 0.01 - simMoneyness * 0.04;
    }
  } else if (cfg.mode === 'VOL_CRUSH') {
    // Post-event crush: near-term ATM/OTM wings compress sharply
    const crushDecimal = -0.045;
    const smileFlattening = -Math.abs(simMoneyness) * 0.08;
    effectiveBaseIv = baselineIvDecimal + crushDecimal + smileFlattening;
  }

  // 2. Spot-Volatility Coupled Shift (in decimal)
  const coupledAtmShiftDecimal = computeSpotCoupledIvShiftPct(spotMovePct, cfg) / 100.0;

  // Additional skew steepening on downside spot moves when coupling is active
  let coupledSkewAddon = 0;
  if (cfg.autoSpotVolCoupling && spotMovePct < 0 && simMoneyness < 0) {
    coupledSkewAddon =
      Math.abs(spotMovePct / 100.0) * Math.abs(simMoneyness) * 0.65 * cfg.downsideSkewSteepening;
  }

  // 3. User Parallel Shock + Coupled Shift scaled by Term Structure
  const termMult = computeTermStructureMultiplier(
    legDaysToExpiry,
    frontDaysToExpiry,
    cfg.termStructureScaling
  );
  const totalShockDecimal =
    (cfg.parallelIvShockPct / 100.0 + coupledAtmShiftDecimal + coupledSkewAddon) * termMult;

  return Math.max(0.03, Math.min(3.0, effectiveBaseIv + totalShockDecimal));
}

/**
 * Builds complete Volatility Surface & Term-Structure analytics from an OptionChainData snapshot.
 */
export function buildVolatilitySurfaceAnalytics(
  chain: OptionChainData,
  simulatedSpot: number,
  config: Partial<VolSurfaceConfig> = {}
): VolatilitySurfaceAnalytics {
  const cfg: VolSurfaceConfig = {
    ...DEFAULT_VOL_SURFACE_CONFIG,
    ...config,
  };

  const refSpot = chain.spotPrice;
  const safeSimSpot = simulatedSpot > 0 ? simulatedSpot : refSpot;
  const spotMovePct = refSpot > 0 ? ((safeSimSpot - refSpot) / refSpot) * 100 : 0;
  const frontDte = chain.daysToExpiry ?? parseExpiryDaysToExpiry(chain.expiry);

  const atmRow =
    chain.strikes.find((r) => r.isATM) ||
    chain.strikes[Math.floor(chain.strikes.length / 2)];
  const atmStrike = atmRow ? atmRow.strike : refSpot;
  const baselineAtmIvPct = atmRow
    ? Math.round(((atmRow.call.impliedVolatility + atmRow.put.impliedVolatility) / 2) * 100) / 100
    : 14.5;

  const coupledAtmShiftPct =
    Math.round(computeSpotCoupledIvShiftPct(spotMovePct, cfg) * 100) / 100;

  const strikes: StrikeVolSurfacePoint[] = chain.strikes.map((row) => {
    const baseCallIvDec = (row.call.impliedVolatility || 14.5) / 100.0;
    const basePutIvDec = (row.put.impliedVolatility || 14.5) / 100.0;

    const shockedCallDec = evaluateShockedLegVolatility({
      strike: row.strike,
      instrument: 'CE',
      baselineIvDecimal: baseCallIvDec,
      referenceSpot: refSpot,
      simulatedSpot: safeSimSpot,
      legDaysToExpiry: frontDte,
      frontDaysToExpiry: frontDte,
      config: cfg,
    });

    const shockedPutDec = evaluateShockedLegVolatility({
      strike: row.strike,
      instrument: 'PE',
      baselineIvDecimal: basePutIvDec,
      referenceSpot: refSpot,
      simulatedSpot: safeSimSpot,
      legDaysToExpiry: frontDte,
      frontDaysToExpiry: frontDte,
      config: cfg,
    });

    const baselineCallIvPct = Math.round(baseCallIvDec * 10000) / 100;
    const baselinePutIvPct = Math.round(basePutIvDec * 10000) / 100;
    const shockedCallIvPct = Math.round(shockedCallDec * 10000) / 100;
    const shockedPutIvPct = Math.round(shockedPutDec * 10000) / 100;

    return {
      strike: row.strike,
      moneynessPct: Math.round(((row.strike - refSpot) / refSpot) * 10000) / 100,
      baselineCallIvPct,
      baselinePutIvPct,
      shockedCallIvPct,
      shockedPutIvPct,
      ivShiftCallPct: Math.round((shockedCallIvPct - baselineCallIvPct) * 100) / 100,
      ivShiftPutPct: Math.round((shockedPutIvPct - baselinePutIvPct) * 100) / 100,
    };
  });

  const atmSurfacePt =
    strikes.find((s) => s.strike === atmStrike) ||
    strikes[Math.floor(strikes.length / 2)];
  const shockedAtmIvPct = atmSurfacePt
    ? Math.round(((atmSurfacePt.shockedCallIvPct + atmSurfacePt.shockedPutIvPct) / 2) * 100) / 100
    : baselineAtmIvPct;

  // Compute ~3-5% OTM Put vs OTM Call skew
  const otmPutPt =
    strikes.find((s) => s.moneynessPct <= -2.5) || strikes[0];
  const otmCallPt =
    [...strikes].reverse().find((s) => s.moneynessPct >= 2.5) ||
    strikes[strikes.length - 1];

  const baselineSkew25dPct =
    otmPutPt && otmCallPt
      ? Math.round((otmPutPt.baselinePutIvPct - otmCallPt.baselineCallIvPct) * 100) / 100
      : 0;
  const shockedSkew25dPct =
    otmPutPt && otmCallPt
      ? Math.round((otmPutPt.shockedPutIvPct - otmCallPt.shockedCallIvPct) * 100) / 100
      : 0;

  // Build multi-expiry term structure across chain.expiries
  const expiries =
    chain.expiries && chain.expiries.length > 0 ? chain.expiries : [chain.expiry];
  const termStructure: TermStructureNode[] = expiries.map((exp, idx) => {
    const dte = parseExpiryDaysToExpiry(exp);
    const termMult = computeTermStructureMultiplier(
      dte,
      frontDte,
      cfg.termStructureScaling
    );
    // Natural slight contango in baseline term structure (+0.35% per expiry step)
    const expBaseAtmPct = Math.round((baselineAtmIvPct + idx * 0.35) * 100) / 100;
    const expShockedDec = evaluateShockedLegVolatility({
      strike: atmStrike,
      instrument: 'CE',
      baselineIvDecimal: expBaseAtmPct / 100.0,
      referenceSpot: refSpot,
      simulatedSpot: safeSimSpot,
      legDaysToExpiry: dte,
      frontDaysToExpiry: frontDte,
      config: cfg,
    });

    return {
      expiry: exp,
      daysToExpiry: dte,
      baselineAtmIvPct: expBaseAtmPct,
      shockedAtmIvPct: Math.round(expShockedDec * 10000) / 100,
      termShockMultiplier: Math.round(termMult * 1000) / 1000,
    };
  });

  return {
    underlyingSymbol: chain.underlyingSymbol,
    referenceSpot: refSpot,
    simulatedSpot: safeSimSpot,
    spotMovePct: Math.round(spotMovePct * 100) / 100,
    atmStrike,
    baselineAtmIvPct,
    shockedAtmIvPct,
    coupledAtmShiftPct,
    baselineSkew25dPct,
    shockedSkew25dPct,
    config: cfg,
    strikes,
    termStructure,
  };
}
