// ─── Institutional AI Strategy Optimizer & Pareto Multi-Objective Solver ────
// Parses natural-language trading intents into inspectable quantitative constraints,
// generates valid option-chain candidate structures across strike/width combinations,
// evaluates EV / POP / CVaR-99 / Theta-to-Gamma, and ranks Pareto-optimal candidates.

import {
  Greeks,
  OptionChainData,
  StrategyCategory,
  StrategyLeg,
  StrategyPayoff,
} from './fnoTypes';
import { calculateBSGreeks, calculateBSPrice } from './blackScholes';
import { parseExpiryDaysToExpiry } from './fnoDataService';
import { calculateStrategyPayoff } from './payoffEngine';
import { runMonteCarloSimulation } from './monteCarloEngine';

export interface OptimizerConstraints {
  rawPrompt: string;
  outlook: StrategyCategory;
  targetSpotPrice: number | null;
  maxLossLimit: number | null;
  requireDefinedRisk: boolean;
  minPopPct: number;
  preferPositiveTheta: boolean;
  lots: number;
}

export interface OptimizerCandidate {
  id: string;
  presetId: string;
  name: string;
  variantLabel: string;
  category: StrategyCategory;
  paretoRole: string;
  rationale: string;
  legs: StrategyLeg[];
  payoff: StrategyPayoff;
  expectedPnl: number;
  popPct: number;
  cvar99Loss: number;
  var95Loss: number;
  maxProfitNum: number;
  maxLossAbs: number;
  isDefinedRisk: boolean;
  returnOnRisk: number;
  thetaToGammaScore: number;
  compositeUtilityScore: number;
  isParetoOptimal: boolean;
  dominatedByCount: number;
}

export interface OptimizerSolveResult {
  constraints: OptimizerConstraints;
  totalCandidatesEvaluated: number;
  feasibleCount: number;
  paretoCandidates: OptimizerCandidate[];
  rejectedSummary: string;
  disclaimer: string;
}

/**
 * Deterministically parses a natural-language derivative trading view into an
 * inspectable, editable OptimizerConstraints object.
 */
export function parseOptimizerIntent(
  prompt: string,
  spotPrice: number,
  overrides?: Partial<OptimizerConstraints>
): OptimizerConstraints {
  const text = (prompt || '').toLowerCase();

  // 1. Detect directional / volatility outlook
  let outlook: StrategyCategory = 'NEUTRAL';
  if (
    /\b(bull|bullish|upside|rally|long|breakout up|above|up to|support)\b/.test(text) &&
    !/\b(bear|bearish)\b/.test(text)
  ) {
    outlook = 'BULLISH';
  } else if (
    /\b(bear|bearish|downside|crash|drop|put|selloff|below|down to)\b/.test(text)
  ) {
    outlook = 'BEARISH';
  } else if (
    /\b(volatile|volatility|straddle|strangle|big move|event|earnings|budget|explosion|breakout)\b/.test(
      text
    ) &&
    !/\b(range|neutral|condor|theta)\b/.test(text)
  ) {
    outlook = 'VOLATILE';
  } else if (/\b(range|neutral|sideways|flat|condor|theta|pinning|decay)\b/.test(text)) {
    outlook = 'NEUTRAL';
  }

  // 2. Detect max loss limit (e.g. "max loss 18000", "max loss ₹25,000", "risk 15k")
  let maxLossLimit: number | null = null;
  const lossMatch = text.match(
    /(?:max\s*loss|risk|cap\s*loss|stop\s*loss|within)\s*(?:of|at|to|under|<|<=)?\s*[$₹aed\s]*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k)?/i
  );
  if (lossMatch) {
    const rawNum = parseFloat(lossMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(rawNum) && rawNum > 0) {
      maxLossLimit = lossMatch[2] ? rawNum * 1000 : rawNum;
    }
  }

  // 3. Detect minimum POP (e.g. "pop > 60%", "win rate 65%")
  let minPopPct = 42;
  const popMatch = text.match(/(?:pop|win\s*rate|probability)\s*(?:>|>=|of|above|at\s*least)?\s*([0-9]{2})\s*%/i);
  if (popMatch) {
    const p = parseInt(popMatch[1], 10);
    if (p >= 20 && p <= 88) {
      minPopPct = p;
    }
  }

  // 4. Detect target spot price (numbers within ±20% of current spotPrice)
  let targetSpotPrice: number | null = null;
  const allNumbers = Array.from(text.matchAll(/\b([0-9][0-9,]*(?:\.[0-9]+)?)\b/g)).map((m) =>
    parseFloat(m[1].replace(/,/g, ''))
  );
  for (const n of allNumbers) {
    if (
      spotPrice > 0 &&
      n >= spotPrice * 0.82 &&
      n <= spotPrice * 1.18 &&
      n !== maxLossLimit
    ) {
      targetSpotPrice = n;
      break;
    }
  }

  // 5. Defined risk & Theta preferences
  const requireDefinedRisk =
    maxLossLimit !== null ||
    !/\b(naked|unlimited|short\s+straddle|short\s+strangle)\b/.test(text);
  const preferPositiveTheta =
    outlook === 'NEUTRAL' ||
    /\b(theta|credit|income|decay|carry|sell\s+vol)\b/.test(text);

  return {
    rawPrompt: prompt,
    outlook: overrides?.outlook ?? outlook,
    targetSpotPrice:
      overrides?.targetSpotPrice !== undefined ? overrides.targetSpotPrice : targetSpotPrice,
    maxLossLimit:
      overrides?.maxLossLimit !== undefined ? overrides.maxLossLimit : maxLossLimit,
    requireDefinedRisk: overrides?.requireDefinedRisk ?? requireDefinedRisk,
    minPopPct: overrides?.minPopPct ?? minPopPct,
    preferPositiveTheta: overrides?.preferPositiveTheta ?? preferPositiveTheta,
    lots: Math.max(1, overrides?.lots ?? 1),
  };
}

interface CandidateBlueprint {
  presetId: string;
  name: string;
  variantLabel: string;
  category: StrategyCategory;
  legsSpec: Array<{
    action: 'BUY' | 'SELL';
    instrument: 'CE' | 'PE';
    stepOffset: number;
    lotsMult: number;
    expiryIndexOffset?: number;
  }>;
}

const CANDIDATE_BLUEPRINTS: CandidateBlueprint[] = [
  // BULLISH
  {
    presetId: 'bull-call-spread',
    name: 'Bull Call Spread',
    variantLabel: 'ATM / +2 OTM Tight Debit',
    category: 'BULLISH',
    legsSpec: [
      { action: 'BUY', instrument: 'CE', stepOffset: 0, lotsMult: 1 },
      { action: 'SELL', instrument: 'CE', stepOffset: 2, lotsMult: 1 },
    ],
  },
  {
    presetId: 'bull-call-spread-wide',
    name: 'Bull Call Spread (Wide)',
    variantLabel: 'ATM / +4 OTM Convexity',
    category: 'BULLISH',
    legsSpec: [
      { action: 'BUY', instrument: 'CE', stepOffset: 0, lotsMult: 1 },
      { action: 'SELL', instrument: 'CE', stepOffset: 4, lotsMult: 1 },
    ],
  },
  {
    presetId: 'bull-put-spread',
    name: 'Bull Put Credit Spread',
    variantLabel: '-1 OTM / -3 OTM Theta Harvest',
    category: 'BULLISH',
    legsSpec: [
      { action: 'SELL', instrument: 'PE', stepOffset: -1, lotsMult: 1 },
      { action: 'BUY', instrument: 'PE', stepOffset: -3, lotsMult: 1 },
    ],
  },
  {
    presetId: 'bull-put-spread-defensive',
    name: 'Bull Put Credit Spread (Deep OTM)',
    variantLabel: '-2 OTM / -5 OTM High-POP',
    category: 'BULLISH',
    legsSpec: [
      { action: 'SELL', instrument: 'PE', stepOffset: -2, lotsMult: 1 },
      { action: 'BUY', instrument: 'PE', stepOffset: -5, lotsMult: 1 },
    ],
  },
  // BEARISH
  {
    presetId: 'bear-put-spread',
    name: 'Bear Put Spread',
    variantLabel: 'ATM / -2 OTM Tight Debit',
    category: 'BEARISH',
    legsSpec: [
      { action: 'BUY', instrument: 'PE', stepOffset: 0, lotsMult: 1 },
      { action: 'SELL', instrument: 'PE', stepOffset: -2, lotsMult: 1 },
    ],
  },
  {
    presetId: 'bear-put-spread-wide',
    name: 'Bear Put Spread (Wide)',
    variantLabel: 'ATM / -4 OTM Convexity',
    category: 'BEARISH',
    legsSpec: [
      { action: 'BUY', instrument: 'PE', stepOffset: 0, lotsMult: 1 },
      { action: 'SELL', instrument: 'PE', stepOffset: -4, lotsMult: 1 },
    ],
  },
  {
    presetId: 'bear-call-spread',
    name: 'Bear Call Credit Spread',
    variantLabel: '+1 OTM / +3 OTM Theta Harvest',
    category: 'BEARISH',
    legsSpec: [
      { action: 'SELL', instrument: 'CE', stepOffset: 1, lotsMult: 1 },
      { action: 'BUY', instrument: 'CE', stepOffset: 3, lotsMult: 1 },
    ],
  },
  {
    presetId: 'bear-call-spread-defensive',
    name: 'Bear Call Credit Spread (Deep OTM)',
    variantLabel: '+2 OTM / +5 OTM High-POP',
    category: 'BEARISH',
    legsSpec: [
      { action: 'SELL', instrument: 'CE', stepOffset: 2, lotsMult: 1 },
      { action: 'BUY', instrument: 'CE', stepOffset: 5, lotsMult: 1 },
    ],
  },
  // NEUTRAL
  {
    presetId: 'iron-condor-standard',
    name: 'Iron Condor (Standard)',
    variantLabel: '±2 Short / ±4 Wing Protection',
    category: 'NEUTRAL',
    legsSpec: [
      { action: 'SELL', instrument: 'CE', stepOffset: 2, lotsMult: 1 },
      { action: 'BUY', instrument: 'CE', stepOffset: 4, lotsMult: 1 },
      { action: 'SELL', instrument: 'PE', stepOffset: -2, lotsMult: 1 },
      { action: 'BUY', instrument: 'PE', stepOffset: -4, lotsMult: 1 },
    ],
  },
  {
    presetId: 'iron-condor-wide',
    name: 'Iron Condor (Wide High-POP)',
    variantLabel: '±3 Short / ±6 Wing Protection',
    category: 'NEUTRAL',
    legsSpec: [
      { action: 'SELL', instrument: 'CE', stepOffset: 3, lotsMult: 1 },
      { action: 'BUY', instrument: 'CE', stepOffset: 6, lotsMult: 1 },
      { action: 'SELL', instrument: 'PE', stepOffset: -3, lotsMult: 1 },
      { action: 'BUY', instrument: 'PE', stepOffset: -6, lotsMult: 1 },
    ],
  },
  {
    presetId: 'iron-butterfly',
    name: 'Iron Butterfly',
    variantLabel: 'ATM Straddle / ±3 Wings',
    category: 'NEUTRAL',
    legsSpec: [
      { action: 'SELL', instrument: 'CE', stepOffset: 0, lotsMult: 1 },
      { action: 'SELL', instrument: 'PE', stepOffset: 0, lotsMult: 1 },
      { action: 'BUY', instrument: 'CE', stepOffset: 3, lotsMult: 1 },
      { action: 'BUY', instrument: 'PE', stepOffset: -3, lotsMult: 1 },
    ],
  },
  {
    presetId: 'long-call-butterfly',
    name: 'Long Call Butterfly',
    variantLabel: '-2 / ATM×2 / +2 Low-Debit Pin',
    category: 'NEUTRAL',
    legsSpec: [
      { action: 'BUY', instrument: 'CE', stepOffset: -2, lotsMult: 1 },
      { action: 'SELL', instrument: 'CE', stepOffset: 0, lotsMult: 2 },
      { action: 'BUY', instrument: 'CE', stepOffset: 2, lotsMult: 1 },
    ],
  },
  {
    presetId: 'calendar-spread',
    name: 'Calendar Time Spread',
    variantLabel: 'Short Near ATM / Long Next-Expiry ATM',
    category: 'NEUTRAL',
    legsSpec: [
      { action: 'SELL', instrument: 'CE', stepOffset: 0, lotsMult: 1, expiryIndexOffset: 0 },
      { action: 'BUY', instrument: 'CE', stepOffset: 0, lotsMult: 1, expiryIndexOffset: 1 },
    ],
  },
  {
    presetId: 'short-strangle',
    name: 'Short Strangle (Undefined Risk)',
    variantLabel: '±3 OTM Unhedged Theta',
    category: 'NEUTRAL',
    legsSpec: [
      { action: 'SELL', instrument: 'CE', stepOffset: 3, lotsMult: 1 },
      { action: 'SELL', instrument: 'PE', stepOffset: -3, lotsMult: 1 },
    ],
  },
  // VOLATILE
  {
    presetId: 'reverse-iron-condor',
    name: 'Reverse Iron Condor',
    variantLabel: '±1 Long / ±3 Short Defined Breakout',
    category: 'VOLATILE',
    legsSpec: [
      { action: 'BUY', instrument: 'CE', stepOffset: 1, lotsMult: 1 },
      { action: 'SELL', instrument: 'CE', stepOffset: 3, lotsMult: 1 },
      { action: 'BUY', instrument: 'PE', stepOffset: -1, lotsMult: 1 },
      { action: 'SELL', instrument: 'PE', stepOffset: -3, lotsMult: 1 },
    ],
  },
  {
    presetId: 'long-strangle',
    name: 'Long Strangle',
    variantLabel: '±2 OTM Convexity Breakout',
    category: 'VOLATILE',
    legsSpec: [
      { action: 'BUY', instrument: 'CE', stepOffset: 2, lotsMult: 1 },
      { action: 'BUY', instrument: 'PE', stepOffset: -2, lotsMult: 1 },
    ],
  },
  {
    presetId: 'long-straddle',
    name: 'Long Straddle',
    variantLabel: 'ATM Pure Gamma/Vega Expansion',
    category: 'VOLATILE',
    legsSpec: [
      { action: 'BUY', instrument: 'CE', stepOffset: 0, lotsMult: 1 },
      { action: 'BUY', instrument: 'PE', stepOffset: 0, lotsMult: 1 },
    ],
  },
];

function materializeBlueprintFromChain(
  bp: CandidateBlueprint,
  chain: OptionChainData,
  lots: number
): StrategyLeg[] | null {
  if (!chain.strikes || chain.strikes.length < 7) return null;

  const atmIdx = chain.strikes.findIndex((r) => r.isATM);
  const centerIdx = atmIdx >= 0 ? atmIdx : Math.floor(chain.strikes.length / 2);
  const expiries =
    chain.expiries && chain.expiries.length > 0 ? chain.expiries : [chain.expiry];
  const baseExpiryIdx = Math.max(0, expiries.indexOf(chain.expiry));

  const legs: StrategyLeg[] = [];
  for (let i = 0; i < bp.legsSpec.length; i++) {
    const spec = bp.legsSpec[i];
    const targetIdx = centerIdx + spec.stepOffset;
    if (targetIdx < 0 || targetIdx >= chain.strikes.length) {
      return null; // Strike out of chain bounds
    }
    const row = chain.strikes[targetIdx];
    const contract = spec.instrument === 'CE' ? row.call : row.put;

    const expOffset = spec.expiryIndexOffset ?? 0;
    const legExpiry =
      expOffset > 0
        ? expiries[Math.min(expiries.length - 1, baseExpiryIdx + expOffset)] || '26 NOV 2026'
        : chain.expiry;

    let entryPrice = contract.ltp;
    let greeks: Greeks = contract.greeks;

    if (expOffset > 0) {
      // Price far-month leg using Black-Scholes at back-month DTE
      const farDte = parseExpiryDaysToExpiry(legExpiry);
      const timeYears = Math.max(0.01, farDte / 365.0);
      const ivDec = Math.max(0.08, (contract.impliedVolatility || 14.5) / 100.0);
      entryPrice = Math.max(
        0.05,
        Math.round(
          calculateBSPrice(spec.instrument, {
            spot: chain.spotPrice,
            strike: row.strike,
            timeYears,
            volatility: ivDec,
          }) * 20
        ) / 20
      );
      greeks = calculateBSGreeks(spec.instrument, {
        spot: chain.spotPrice,
        strike: row.strike,
        timeYears,
        volatility: ivDec,
      });
    }

    legs.push({
      id: `opt-${bp.presetId}-${i}`,
      action: spec.action,
      instrument: spec.instrument,
      strike: row.strike,
      expiry: legExpiry,
      lots: lots * spec.lotsMult,
      lotSize: chain.lotSize,
      entryPrice,
      currentPrice: entryPrice,
      iv: contract.impliedVolatility,
      greeks,
      disabled: false,
    });
  }

  return legs;
}

/**
 * Evaluates candidate strategies from real option chain contracts and returns up to 3
 * Pareto-optimal (non-dominated) structures satisfying the user's constraints.
 */
export function optimizeStrategiesForIntent(
  chain: OptionChainData,
  constraints: OptimizerConstraints
): OptimizerSolveResult {
  const frontDte = chain.daysToExpiry ?? parseExpiryDaysToExpiry(chain.expiry);
  const spot = chain.spotPrice;

  // Drift aligned with directional view or target spot for Monte Carlo EV evaluation
  let impliedDrift = 0.068;
  if (constraints.targetSpotPrice && constraints.targetSpotPrice > 0) {
    const targetReturn = (constraints.targetSpotPrice - spot) / spot;
    impliedDrift = Math.max(-0.6, Math.min(0.6, targetReturn * (365.0 / Math.max(3, frontDte))));
  } else if (constraints.outlook === 'BULLISH') {
    impliedDrift = 0.24;
  } else if (constraints.outlook === 'BEARISH') {
    impliedDrift = -0.24;
  } else if (constraints.outlook === 'NEUTRAL') {
    impliedDrift = 0.02;
  }

  const allEvaluated: OptimizerCandidate[] = [];
  let rejectedUndefinedRisk = 0;
  let rejectedMaxLoss = 0;
  let rejectedOutlook = 0;

  for (const bp of CANDIDATE_BLUEPRINTS) {
    // Filter by directional outlook
    if (bp.category !== constraints.outlook) {
      rejectedOutlook++;
      continue;
    }

    const legs = materializeBlueprintFromChain(bp, chain, constraints.lots);
    if (!legs) continue;

    const payoff = calculateStrategyPayoff(legs, spot, bp.name, bp.category, {
      daysToExpiry: frontDte,
      baseSpotPrice: spot,
    });

    const isDefinedRisk = payoff.maxLoss !== 'UNLIMITED';
    if (constraints.requireDefinedRisk && !isDefinedRisk) {
      rejectedUndefinedRisk++;
      continue;
    }

    const maxLossAbs =
      payoff.maxLoss === 'UNLIMITED'
        ? spot * chain.lotSize * constraints.lots * 0.25
        : Math.abs(payoff.maxLoss);
    const maxProfitNum =
      payoff.maxProfit === 'UNLIMITED'
        ? spot * chain.lotSize * constraints.lots * 0.2
        : Math.max(0, payoff.maxProfit);

    if (
      constraints.maxLossLimit !== null &&
      constraints.maxLossLimit > 0 &&
      maxLossAbs > constraints.maxLossLimit * 1.15
    ) {
      rejectedMaxLoss++;
      continue;
    }

    // Run deterministic 1,000-path Monte Carlo to evaluate EV, POP, and CVaR 99%
    const mc = runMonteCarloSimulation({
      legs,
      referenceSpot: spot,
      frontDaysToExpiry: frontDte,
      config: {
        seed: 7007,
        numPaths: 1000,
        horizonDays: frontDte,
        annualDrift: impliedDrift,
        distribution: 'STUDENT_T_FAT_TAIL',
        regime: constraints.outlook === 'VOLATILE' ? 'VOL_CLUSTER_JUMP' : 'CALM_GBM',
      },
    });

    const returnOnRisk =
      maxLossAbs > 0 ? Math.round((maxProfitNum / maxLossAbs) * 100) / 100 : 1.0;
    const dailySigma = 0.145 / Math.sqrt(365);
    const gammaBenchmark = Math.max(
      1,
      0.5 * Math.abs(payoff.netGreeks.gamma) * (spot * dailySigma) ** 2
    );
    const thetaToGammaScore =
      Math.round((payoff.netGreeks.theta / gammaBenchmark) * 100) / 100;

    // Composite utility score for tie-breaking among Pareto-optimal structures
    const popScore = Math.max(payoff.probabilityOfProfit, mc.popPct);
    const thetaBonus =
      constraints.preferPositiveTheta && payoff.netGreeks.theta > 0 ? 15 : 0;
    const riskPenalty =
      constraints.maxLossLimit && maxLossAbs > constraints.maxLossLimit ? -25 : 0;
    const compositeUtilityScore =
      Math.round(
        (popScore * 0.45 +
          Math.min(100, returnOnRisk * 30) * 0.3 +
          (mc.expectedPnl / Math.max(1000, maxLossAbs)) * 25 +
          thetaBonus +
          riskPenalty) *
          10
      ) / 10;

    allEvaluated.push({
      id: bp.presetId,
      presetId: bp.presetId,
      name: bp.name,
      variantLabel: bp.variantLabel,
      category: bp.category,
      paretoRole: 'Balanced Risk/Reward',
      rationale: '',
      legs,
      payoff,
      expectedPnl: mc.expectedPnl,
      popPct: Math.round(popScore * 10) / 10,
      cvar99Loss: mc.cvar99Loss,
      var95Loss: mc.var95Loss,
      maxProfitNum,
      maxLossAbs,
      isDefinedRisk,
      returnOnRisk,
      thetaToGammaScore,
      compositeUtilityScore,
      isParetoOptimal: true,
      dominatedByCount: 0,
    });
  }

  // Compute Pareto Non-Dominated Frontier across:
  // (1) Maximize expectedPnl, (2) Maximize popPct, (3) Minimize cvar99Loss, (4) Maximize returnOnRisk
  for (let i = 0; i < allEvaluated.length; i++) {
    const a = allEvaluated[i];
    let dominatedBy = 0;
    for (let j = 0; j < allEvaluated.length; j++) {
      if (i === j) continue;
      const b = allEvaluated[j];
      const noWorseInAll =
        b.expectedPnl >= a.expectedPnl &&
        b.popPct >= a.popPct &&
        b.cvar99Loss <= a.cvar99Loss &&
        b.returnOnRisk >= a.returnOnRisk;
      const strictlyBetterInOne =
        b.expectedPnl > a.expectedPnl ||
        b.popPct > a.popPct ||
        b.cvar99Loss < a.cvar99Loss ||
        b.returnOnRisk > a.returnOnRisk;

      if (noWorseInAll && strictlyBetterInOne) {
        dominatedBy++;
      }
    }
    a.dominatedByCount = dominatedBy;
    a.isParetoOptimal = dominatedBy === 0;
  }

  // Sort: Pareto-optimal first (dominatedByCount === 0), then by compositeUtilityScore descending
  const sorted = [...allEvaluated].sort((a, b) => {
    if (a.dominatedByCount !== b.dominatedByCount) {
      return a.dominatedByCount - b.dominatedByCount;
    }
    return b.compositeUtilityScore - a.compositeUtilityScore;
  });

  const top3 = sorted.slice(0, 3);

  // Assign transparent Pareto roles and explanations to top 3 candidates
  top3.forEach((cand, idx) => {
    if (idx === 0) {
      cand.paretoRole = 'Primary Pareto Frontier #1';
    } else if (cand.popPct >= Math.max(...top3.map((c) => c.popPct))) {
      cand.paretoRole = 'Max Win-Probability (POP)';
    } else if (cand.cvar99Loss <= Math.min(...top3.map((c) => c.cvar99Loss))) {
      cand.paretoRole = 'Min Tail Risk (CVaR 99%)';
    } else {
      cand.paretoRole = 'Max Convexity / Return-on-Risk';
    }

    cand.rationale = `${cand.variantLabel} • POP ${cand.popPct}% • Expected Value ${
      cand.expectedPnl >= 0 ? `+${cand.expectedPnl.toLocaleString()}` : cand.expectedPnl.toLocaleString()
    } • CVaR(99%) Tail Loss ${cand.cvar99Loss.toLocaleString()} • Net Theta ${
      cand.payoff.netGreeks.theta >= 0 ? `+${cand.payoff.netGreeks.theta}` : cand.payoff.netGreeks.theta
    }/day.`;
  });

  const rejectedSummary = `Evaluated ${CANDIDATE_BLUEPRINTS.length} architectures: ${allEvaluated.length} matched ${constraints.outlook} view (${rejectedUndefinedRisk} filtered for undefined risk, ${rejectedMaxLoss} filtered by max-loss cap).`;

  return {
    constraints,
    totalCandidatesEvaluated: CANDIDATE_BLUEPRINTS.length,
    feasibleCount: allEvaluated.length,
    paretoCandidates: top3,
    rejectedSummary,
    disclaimer:
      'Pareto optimization ranks candidates by model-derived Expected Value, POP, and CVaR(99%). Analytical decision-support only — never guarantees future profit.',
  };
}
