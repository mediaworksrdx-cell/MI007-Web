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
  let netSpeed = 0;
  let netZomma = 0;
  let netColor = 0;

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
    netSpeed += g.speed * signedQty;
    netZomma += g.zomma * signedQty;
    netColor += g.color * signedQty;
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
      speed: netSpeed,
      zomma: netZomma,
      color: netColor,
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
      netGreeks: { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, vanna: 0, charm: 0, vomma: 0, speed: 0, zomma: 0, color: 0 },
      capitalRequired: 0,
      marginRequired: 0,
      isUnlimitedRisk: false,
      unlimitedRiskSide: 'NONE',
      riskClassification: 'DEFINED_RISK',
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
    const notional = (leg.instrument === 'FUT' ? spotPrice : leg.strike) * leg.lots * leg.lotSize;
    if (leg.instrument === 'FUT') {
      // Futures require initial margin (~12% of notional) but generate zero upfront option cash flow
      marginRequired += notional * 0.12;
    } else {
      // Options cash flow: premium paid or received
      const totalPremium = leg.entryPrice * leg.lots * leg.lotSize;
      if (leg.action === 'BUY') {
        netCashFlow -= totalPremium;
        capitalRequired += totalPremium;
      } else {
        netCashFlow += totalPremium;
        // Short option margin: SPAN + Exposure margin approx 12% of notional (minimum ₹25,000)
        marginRequired += Math.max(25000, notional * 0.12);
      }
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

  // Helper for pure unshocked expiration P&L at any arbitrary spot price
  const evalExpiryAtSpot = (s: number): number => {
    return evaluatePortfolioAtScenario({
      legs: activeLegs,
      candidateSpot: s,
      referenceSpot: anchorSpot,
      timeShiftDays: 0,
      ivShiftPct: 0,
      frontDaysToExpiry: daysToExpiry,
      volSurfaceConfig: options.volSurfaceConfig,
    }).expiryPnl;
  };

  // Asymptotic net slopes:
  // slopeAboveMaxK = d(ExpiryPnL)/dS as S -> infinity
  // slopeBelowMinK = d(ExpiryPnL)/dS as S -> 0
  let slopeAboveMaxK = 0;
  let slopeBelowMinK = 0;
  for (const leg of activeLegs) {
    const mult = (leg.action === 'BUY' ? 1 : -1) * leg.lots * leg.lotSize;
    if (leg.instrument === 'FUT') {
      slopeAboveMaxK += mult;
      slopeBelowMinK += mult;
    } else if (leg.instrument === 'CE') {
      slopeAboveMaxK += mult;
    } else if (leg.instrument === 'PE') {
      slopeBelowMinK -= mult;
    }
  }

  const hasUnlimitedProfit = slopeAboveMaxK > 0;
  const hasUnlimitedLoss = slopeAboveMaxK < 0;

  // Unhedged risk classification
  const hasShortPut = activeLegs.some((l) => l.action === 'SELL' && l.instrument === 'PE');
  const hasShortFut = activeLegs.some((l) => l.action === 'SELL' && l.instrument === 'FUT');
  const hasHeavyDownsideRisk = slopeBelowMinK > 0 && (hasShortPut || hasShortFut);

  const isUnlimitedRisk = hasUnlimitedLoss || hasHeavyDownsideRisk;
  let unlimitedRiskSide: 'UPSIDE' | 'DOWNSIDE' | 'BOTH' | 'NONE' = 'NONE';
  if (hasUnlimitedLoss && hasHeavyDownsideRisk) {
    unlimitedRiskSide = 'BOTH';
  } else if (hasUnlimitedLoss) {
    unlimitedRiskSide = 'UPSIDE';
  } else if (hasHeavyDownsideRisk) {
    unlimitedRiskSide = 'DOWNSIDE';
  }
  const riskClassification: 'DEFINED_RISK' | 'UNLIMITED_RISK' = isUnlimitedRisk
    ? 'UNLIMITED_RISK'
    : 'DEFINED_RISK';

  // Analytical Extrema Evaluation across all strike kinks, spot, and boundary points
  const criticalStrikes = Array.from(
    new Set([0, ...strikes, anchorSpot, spotPrice])
  )
    .filter((p) => p >= 0)
    .sort((a, b) => a - b);

  const criticalPnls = criticalStrikes.map((s) => evalExpiryAtSpot(s));
  const maxAnalyticalPnl = Math.round(Math.max(...criticalPnls));
  const minAnalyticalPnl = Math.round(Math.min(...criticalPnls));

  const maxProfit = hasUnlimitedProfit ? 'UNLIMITED' : maxAnalyticalPnl;
  const maxLoss = hasUnlimitedLoss ? 'UNLIMITED' : minAnalyticalPnl;

  // Analytical Piecewise Linear Breakeven Solver
  const rawBreakevens: number[] = [];

  // 1. Between critical points
  for (let i = 0; i < criticalStrikes.length - 1; i++) {
    const s1 = criticalStrikes[i];
    const s2 = criticalStrikes[i + 1];
    const p1 = criticalPnls[i];
    const p2 = criticalPnls[i + 1];

    if (Math.abs(p1) < 1e-4) {
      rawBreakevens.push(s1);
    } else if (Math.abs(p2) < 1e-4) {
      rawBreakevens.push(s2);
    } else if ((p1 < 0 && p2 > 0) || (p1 > 0 && p2 < 0)) {
      const root = s1 + (-p1 / (p2 - p1)) * (s2 - s1);
      rawBreakevens.push(Math.round(root * 10) / 10);
    }
  }

  // 2. Beyond highest strike kink
  const highestK = criticalStrikes[criticalStrikes.length - 1];
  const pAtHighestK = criticalPnls[criticalPnls.length - 1];
  if (Math.abs(slopeAboveMaxK) > 1e-4) {
    const rootAbove = highestK - pAtHighestK / slopeAboveMaxK;
    if (rootAbove > highestK + 0.1) {
      rawBreakevens.push(Math.round(rootAbove * 10) / 10);
    }
  }

  // Deduplicate and filter out non-positive roots
  const breakevens = Array.from(new Set(rawBreakevens.filter((b) => b > 0))).sort((a, b) => a - b);

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

  // Probability of Profit (POP) via Institutional Black-Scholes Risk-Neutral Probabilities
  let totalIvWeight = 0;
  let weightedIvSum = 0;
  for (const leg of activeLegs) {
    if (leg.instrument !== 'FUT' && leg.iv > 0) {
      const w = leg.lots * leg.lotSize;
      weightedIvSum += (leg.iv / 100.0) * w;
      totalIvWeight += w;
    }
  }
  const effectiveSigma = totalIvWeight > 0 ? weightedIvSum / totalIvWeight : 0.145;
  const tYears = Math.max(0.002, daysToExpiry / 365.0);
  const r = 0.068;

  const probSpotAbove = (k: number): number => {
    if (k <= 0) return 1.0;
    const d2 =
      (Math.log(spotPrice / k) + (r - 0.5 * effectiveSigma * effectiveSigma) * tYears) /
      (effectiveSigma * Math.sqrt(tYears));
    return cdfNormal(d2);
  };

  let probabilityOfProfit = 50;
  if (breakevens.length === 0) {
    const pnlAtSpot = evalExpiryAtSpot(spotPrice);
    probabilityOfProfit = pnlAtSpot >= 0 ? 99 : 1;
  } else if (breakevens.length === 1) {
    const be = breakevens[0];
    const pnlAbove = evalExpiryAtSpot(be + 5);
    if (pnlAbove > 0) {
      probabilityOfProfit = Math.round(probSpotAbove(be) * 100);
    } else {
      probabilityOfProfit = Math.round((1 - probSpotAbove(be)) * 100);
    }
  } else if (breakevens.length >= 2) {
    const beLow = breakevens[0];
    const beHigh = breakevens[breakevens.length - 1];
    const probBetween = Math.max(0, probSpotAbove(beLow) - probSpotAbove(beHigh));
    const midPrice = (beLow + beHigh) / 2;
    const pnlAtMid = evalExpiryAtSpot(midPrice);
    const isProfitableInside = pnlAtMid >= 0;

    probabilityOfProfit = Math.round((isProfitableInside ? probBetween : 1 - probBetween) * 100);
  }
  probabilityOfProfit = Math.max(1, Math.min(99, probabilityOfProfit));

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
    isUnlimitedRisk,
    unlimitedRiskSide,
    riskClassification,
    netGreeks: {
      delta: Math.round(rawGreeks.delta * 10) / 10,
      gamma: Math.round(rawGreeks.gamma * 1000000) / 1000000,
      theta: Math.round(rawGreeks.theta),
      vega: Math.round(rawGreeks.vega),
      rho: Math.round(rawGreeks.rho),
      vanna: Math.round(rawGreeks.vanna * 100) / 100,
      charm: Math.round(rawGreeks.charm * 100) / 100,
      vomma: Math.round(rawGreeks.vomma * 100) / 100,
      speed: Math.round(rawGreeks.speed * 10000000) / 10000000,
      zomma: Math.round(rawGreeks.zomma * 10000) / 10000,
      color: Math.round(rawGreeks.color * 10000) / 10000,
    },
    capitalRequired: Math.round(capitalRequired),
    marginRequired: Math.round(marginRequired),
    expiryPoints,
    todayPoints,
  };
}
