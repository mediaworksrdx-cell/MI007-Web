// ─── Institutional Strategy Payoff & Scenario Analysis Engine ───────────────
// Multi-leg options payoff simulation at Expiry, T+0, and under IV/time shocks.

import { StrategyLeg, StrategyPayoff, PayoffPoint, Greeks, StrategyCategory } from './fnoTypes';
import { calculateBSPrice, calculateBSGreeksUnrounded, cdfNormal } from './blackScholes';
import { parseExpiryDaysToExpiry } from './fnoDataService';
import {
  VolSurfaceConfig,
  evaluateShockedLegVolatility,
} from './volatilitySurface';

export interface PayoffSimulationOptions {
  timeShiftDays?: number; // Days forward from today (0 = today, up to daysToExpiry)
  ivShiftPct?: number; // IV shock in % (e.g. +2 = +2% IV expansion, -3 = -3% crush)
  daysToExpiry?: number;
  baseSpotPrice?: number; // Unshocked spot price used to anchor chart X-axis domain
  volSurfaceConfig?: Partial<VolSurfaceConfig>;
}

/**
 * Helper to resolve per-leg initial DTE and front-month DTE across multi-expiry legs.
 */
export function resolveLegExpiries(
  legs: StrategyLeg[],
  overrideFrontDte?: number
): { frontDte: number; legExtraDays: number[] } {
  if (!legs || legs.length === 0) {
    return { frontDte: overrideFrontDte ?? 7, legExtraDays: [] };
  }
  const parsedDtes = legs.map((l) => parseExpiryDaysToExpiry(l.expiry || '29 OCT 2026'));
  const minParsedDte = Math.min(...parsedDtes);
  const frontDte = overrideFrontDte ?? minParsedDte;
  const legExtraDays = parsedDtes.map((d) => Math.max(0, d - minParsedDte));
  return { frontDte, legExtraDays };
}

/**
 * Evaluates exact portfolio P&L and contract-adjusted 1st & 2nd order Greeks
 * at any given (candidateSpot, timeShiftDays, ivShiftPct) state.
 */
export function evaluatePortfolioAtScenario(params: {
  legs: StrategyLeg[];
  candidateSpot: number;
  referenceSpot: number;
  timeShiftDays: number;
  ivShiftPct: number;
  frontDaysToExpiry: number;
  volSurfaceConfig?: Partial<VolSurfaceConfig>;
}): {
  pnl: number;
  expiryPnl: number;
  netGreeks: Required<Greeks>;
} {
  const {
    legs,
    candidateSpot,
    referenceSpot,
    timeShiftDays,
    ivShiftPct,
    frontDaysToExpiry,
    volSurfaceConfig,
  } = params;
  const activeLegs = (legs || []).filter((l) => !l.disabled);
  const { legExtraDays } = resolveLegExpiries(activeLegs, frontDaysToExpiry);
  const baseRemainingFrontDays = Math.max(0.01, frontDaysToExpiry - timeShiftDays);

  let pnlToday = 0;
  let pnlExpiry = 0;

  let netDelta = 0;
  let netGamma = 0;
  let netTheta = 0;
  let netVega = 0;
  let netRho = 0;
  let netVanna = 0;
  let netCharm = 0;
  let netVomma = 0;

  for (let idx = 0; idx < activeLegs.length; idx++) {
    const leg = activeLegs[idx];
    const extraDays = legExtraDays[idx] ?? 0;
    const multiplier = leg.action === 'BUY' ? 1 : -1;
    const contractQty = leg.lots * leg.lotSize;
    const signedQty = multiplier * contractQty;

    const legRemainingScenarioDays = Math.max(0.01, baseRemainingFrontDays + extraDays);
    const legScenarioYears = legRemainingScenarioDays / 365.0;

    if (leg.instrument === 'FUT') {
      const legProfit = (candidateSpot - leg.entryPrice) * signedQty;
      pnlExpiry += legProfit;
      pnlToday += legProfit;
      netDelta += 1.0 * signedQty;
      continue;
    }

    const baseIvDec = Math.max(0.05, (leg.iv || 14.5) / 100.0);
    const shockedVol = evaluateShockedLegVolatility({
      strike: leg.strike,
      instrument: leg.instrument,
      baselineIvDecimal: baseIvDec,
      referenceSpot,
      simulatedSpot: candidateSpot,
      legDaysToExpiry: frontDaysToExpiry + extraDays,
      frontDaysToExpiry,
      config: {
        ...volSurfaceConfig,
        parallelIvShockPct: ivShiftPct,
      },
    });

    // 1. Front-month expiration value (intrinsic for front-month legs; BS remaining value for back-month legs)
    let valueAtFrontExpiry = 0;
    if (extraDays <= 0.05) {
      valueAtFrontExpiry =
        leg.instrument === 'CE'
          ? Math.max(0, candidateSpot - leg.strike)
          : Math.max(0, leg.strike - candidateSpot);
    } else {
      valueAtFrontExpiry = calculateBSPrice(leg.instrument, {
        spot: candidateSpot,
        strike: leg.strike,
        timeYears: extraDays / 365.0,
        volatility: shockedVol,
      });
    }
    pnlExpiry += (valueAtFrontExpiry - leg.entryPrice) * signedQty;

    // 2. Scenario T+n value & Greeks
    const theoreticalValueToday = calculateBSPrice(leg.instrument, {
      spot: candidateSpot,
      strike: leg.strike,
      timeYears: legScenarioYears,
      volatility: shockedVol,
    });
    pnlToday += (theoreticalValueToday - leg.entryPrice) * signedQty;

    const g = calculateBSGreeksUnrounded(leg.instrument, {
      spot: candidateSpot,
      strike: leg.strike,
      timeYears: legScenarioYears,
      volatility: shockedVol,
    });

    netDelta += g.delta * signedQty;
    netGamma += g.gamma * signedQty;
    netTheta += g.theta * signedQty;
    netVega += g.vega * signedQty;
    netRho += g.rho * signedQty;
    netVanna += g.vanna * signedQty;
    netCharm += g.charm * signedQty;
    netVomma += g.vomma * signedQty;
  }

  return {
    pnl: pnlToday,
    expiryPnl: pnlExpiry,
    netGreeks: {
      delta: netDelta,
      gamma: netGamma,
      theta: netTheta,
      vega: netVega,
      rho: netRho,
      vanna: netVanna,
      charm: netCharm,
      vomma: netVomma,
    },
  };
}

/**
 * Calculates complete strategy payoff metrics, curves, breakevens, and risk parameters.
 */
export function calculateStrategyPayoff(
  legs: StrategyLeg[],
  spotPrice: number,
  strategyName: string = 'Custom Architecture',
  category: StrategyCategory = 'BULLISH',
  options: PayoffSimulationOptions = {}
): StrategyPayoff {
  const activeLegs = (legs || []).filter((l) => !l.disabled);

  if (!activeLegs || activeLegs.length === 0) {
    return {
      strategyName,
      category,
      spotPrice,
      maxProfit: 0,
      maxLoss: 0,
      breakevens: [],
      probabilityOfProfit: 50,
      netDebitCredit: 0,
      riskRewardRatio: '1 : 1',
      netGreeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, vanna: 0, charm: 0, vomma: 0 },
      capitalRequired: 0,
      marginRequired: 0,
      expiryPoints: [],
      todayPoints: [],
    };
  }

  const daysToExpiry = options.daysToExpiry ?? 7;
  const timeShiftDays = options.timeShiftDays ?? 0;
  const ivShiftPct = options.ivShiftPct ?? 0;

  // Anchor chart X-axis range to baseSpotPrice (unshocked spot) and strikes with 12% padding
  // so moving the Spot (%) slider (-10% to +10%) moves the spot cursor along a stationary chart
  const anchorSpot = options.baseSpotPrice && options.baseSpotPrice > 0 ? options.baseSpotPrice : spotPrice;
  const strikes = activeLegs.filter((l) => l.instrument !== 'FUT').map((l) => l.strike);
  const minStrike = strikes.length > 0 ? Math.min(...strikes, anchorSpot) : anchorSpot;
  const maxStrike = strikes.length > 0 ? Math.max(...strikes, anchorSpot) : anchorSpot;

  const rangePadding = anchorSpot * 0.12; // 12% range around base spot/strikes (covers ±10% spot slider)
  const priceStart = Math.max(1, Math.min(minStrike, anchorSpot) - rangePadding);
  const priceEnd = Math.max(maxStrike, anchorSpot) + rangePadding;
  const steps = 60;
  const priceStep = (priceEnd - priceStart) / steps;

  const expiryPoints: PayoffPoint[] = [];
  const todayPoints: PayoffPoint[] = [];

  // Net Debit / Credit calculation
  let netCashFlow = 0; // Positive = credit received, Negative = debit paid
  let capitalRequired = 0;
  let marginRequired = 0;

  for (const leg of activeLegs) {
    const totalLegCost = leg.entryPrice * leg.lots * leg.lotSize;
    if (leg.action === 'BUY') {
      netCashFlow -= totalLegCost;
      capitalRequired += totalLegCost;
    } else {
      netCashFlow += totalLegCost;
      // Short leg margin: ~15% of notional minus premium received
      marginRequired += Math.max(25000, leg.strike * leg.lots * leg.lotSize * 0.12);
    }
  }

  // Calculate Payoff across the entire price spectrum (including exact leg strikes so kinks are never missed)
  const priceSet = new Set<number>();
  for (let i = 0; i <= steps; i++) {
    priceSet.add(Math.round((priceStart + i * priceStep) * 10) / 10);
  }
  for (const s of strikes) {
    if (s >= priceStart && s <= priceEnd) {
      priceSet.add(Math.round(s * 10) / 10);
    }
  }
  if (spotPrice >= priceStart && spotPrice <= priceEnd) {
    priceSet.add(Math.round(spotPrice * 10) / 10);
  }
  const testPrices = Array.from(priceSet).sort((a, b) => a - b);

  for (const testPrice of testPrices) {
    const evalPt = evaluatePortfolioAtScenario({
      legs: activeLegs,
      candidateSpot: testPrice,
      referenceSpot: anchorSpot,
      timeShiftDays,
      ivShiftPct,
      frontDaysToExpiry: daysToExpiry,
      volSurfaceConfig: options.volSurfaceConfig,
    });

    expiryPoints.push({
      price: testPrice,
      pnl: Math.round(evalPt.expiryPnl),
    });

    todayPoints.push({
      price: testPrice,
      pnl: Math.round(evalPt.pnl),
    });
  }

  // Find Breakevens (Points where expiry P&L crosses zero)
  const breakevens: number[] = [];
  for (let i = 0; i < expiryPoints.length - 1; i++) {
    const p1 = expiryPoints[i];
    const p2 = expiryPoints[i + 1];
    if ((p1.pnl <= 0 && p2.pnl > 0) || (p1.pnl >= 0 && p2.pnl < 0)) {
      // Linear interpolation for exact crossing
      const fraction = Math.abs(p1.pnl) / (Math.abs(p1.pnl) + Math.abs(p2.pnl));
      const crossingPrice = p1.price + fraction * (p2.price - p1.price);
      breakevens.push(Math.round(crossingPrice * 10) / 10);
    }
  }

  // Detect Unlimited Profit / Loss via exact asymptotic net slope above max strike
  const midPoint = expiryPoints[Math.floor(expiryPoints.length / 2)];
  const minPnlVal = Math.min(...expiryPoints.map((p) => p.pnl));
  const maxPnlVal = Math.max(...expiryPoints.map((p) => p.pnl));

  let upsideSlope = 0;
  let downsideSlope = 0;
  for (const leg of activeLegs) {
    const mult = (leg.action === 'BUY' ? 1 : -1) * leg.lots * leg.lotSize;
    if (leg.instrument === 'CE' || leg.instrument === 'FUT') {
      upsideSlope += mult;
    }
    if (leg.instrument === 'PE') {
      downsideSlope += mult;
    } else if (leg.instrument === 'FUT') {
      downsideSlope -= mult;
    }
  }

  const hasUnlimitedProfit = upsideSlope > 0;
  const hasUnlimitedLoss = upsideSlope < 0 || downsideSlope < 0;

  const maxProfit = hasUnlimitedProfit ? 'UNLIMITED' : maxPnlVal;
  const maxLoss = hasUnlimitedLoss ? 'UNLIMITED' : minPnlVal;

  // Aggregate Portfolio Greeks (1st & 2nd order) dynamically evaluated at simulated spot, shifted IV, and remaining DTE
  const currentScenarioEval = evaluatePortfolioAtScenario({
    legs: activeLegs,
    candidateSpot: spotPrice,
    referenceSpot: anchorSpot,
    timeShiftDays,
    ivShiftPct,
    frontDaysToExpiry: daysToExpiry,
    volSurfaceConfig: options.volSurfaceConfig,
  });
  const rawGreeks = currentScenarioEval.netGreeks;

  // Risk-Reward Ratio
  let riskRewardRatio = '1 : 1.5';
  if (typeof maxProfit === 'number' && typeof maxLoss === 'number' && Math.abs(maxLoss) > 0) {
    const ratio = Math.round((maxProfit / Math.abs(maxLoss)) * 10) / 10;
    riskRewardRatio = `1 : ${ratio}`;
  } else if (maxProfit === 'UNLIMITED') {
    riskRewardRatio = '1 : Unlimited';
  } else if (maxLoss === 'UNLIMITED') {
    riskRewardRatio = 'Unlimited Risk';
  }

  // Probability of Profit (POP)
  let probabilityOfProfit = 50;
  if (breakevens.length === 1) {
    const be = breakevens[0];
    const stdDev = spotPrice * 0.15 * Math.sqrt(daysToExpiry / 365.0);
    const z = (be - spotPrice) / stdDev;
    if (category === 'BULLISH') {
      probabilityOfProfit = Math.round((1 - cdfNormal(z)) * 100);
    } else {
      probabilityOfProfit = Math.round(cdfNormal(z) * 100);
    }
  } else if (breakevens.length >= 2) {
    const beLow = Math.min(...breakevens);
    const beHigh = Math.max(...breakevens);
    const stdDev = spotPrice * 0.15 * Math.sqrt(daysToExpiry / 365.0);
    const zHigh = (beHigh - spotPrice) / stdDev;
    const zLow = (beLow - spotPrice) / stdDev;
    const betweenProb = cdfNormal(zHigh) - cdfNormal(zLow);
    const isProfitableInside = midPoint.pnl >= 0 && category !== 'VOLATILE';
    probabilityOfProfit = Math.round((isProfitableInside ? betweenProb : 1 - betweenProb) * 100);
  }
  probabilityOfProfit = Math.max(10, Math.min(92, probabilityOfProfit));

  return {
    strategyName,
    category,
    spotPrice,
    maxProfit,
    maxLoss,
    breakevens,
    probabilityOfProfit,
    netDebitCredit: Math.round(netCashFlow),
    riskRewardRatio,
    netGreeks: {
      delta: Math.round(rawGreeks.delta * 10) / 10,
      gamma: Math.round(rawGreeks.gamma * 1000000) / 1000000,
      theta: Math.round(rawGreeks.theta),
      vega: Math.round(rawGreeks.vega),
      rho: Math.round(rawGreeks.rho),
      vanna: Math.round(rawGreeks.vanna * 100) / 100,
      charm: Math.round(rawGreeks.charm * 100) / 100,
      vomma: Math.round(rawGreeks.vomma * 100) / 100,
    },
    capitalRequired: Math.round(capitalRequired),
    marginRequired: Math.round(marginRequired),
    expiryPoints,
    todayPoints,
  };
}
