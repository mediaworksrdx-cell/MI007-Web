// ─── MI-007 Next-Gen Derivatives Desk — Quantitative & Regression Test Suite ──
// Validates 1st/2nd-order Greeks against finite differences, Dealer GEX & Zero-Gamma
// Flip, Volatility Surface & 2D Scenario Matrices, Seeded Monte Carlo & CVaR-99,
// Pareto Strategy Optimizer, and Position Repair / Delta Hedging.

import {
  BSParams,
  calculateBSGreeks,
  calculateBSGreeksUnrounded,
  calculateBSPrice,
} from '../lib/fno/blackScholes';
import { generateOptionChain } from '../lib/fno/fnoDataService';
import { calculateDealerExposure } from '../lib/fno/dealerExposure';
import {
  buildVolatilitySurfaceAnalytics,
  evaluateShockedLegVolatility,
} from '../lib/fno/volatilitySurface';
import { calculateStrategyPayoff } from '../lib/fno/payoffEngine';
import {
  computeScenarioMatrix,
  exportScenarioMatrixToCsv,
} from '../lib/fno/scenarioEngine';
import { runMonteCarloSimulation } from '../lib/fno/monteCarloEngine';
import {
  optimizeStrategiesForIntent,
  parseOptimizerIntent,
} from '../lib/fno/strategyOptimizer';
import { generatePositionRepairProposals } from '../lib/fno/positionRepair';
import {
  INSTITUTIONAL_STRATEGY_PRESETS,
  buildLegsFromPreset,
} from '../lib/fno/strategyPresets';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function assertApprox(
  actual: number,
  expected: number,
  tolerance: number,
  message: string
) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance && Number.isFinite(actual)) {
    passed++;
    console.log(
      `  ✅ PASS: ${message} (actual=${actual.toFixed(6)}, expected=${expected.toFixed(
        6
      )}, diff=${diff.toExponential(2)})`
    );
  } else {
    failed++;
    console.error(
      `  ❌ FAIL: ${message} (actual=${actual}, expected=${expected}, diff=${diff}, tol=${tolerance})`
    );
  }
}

console.log('\n================================================================');
console.log('🧪 PHASE 1: 1ST & 2ND ORDER GREEKS vs FINITE-DIFFERENCE CHECKS');
console.log('================================================================');

const testParams: BSParams = {
  spot: 22150,
  strike: 22400,
  timeYears: 14 / 365.0,
  rate: 0.068,
  volatility: 0.16,
  dividendYield: 0.012,
};

for (const optType of ['CE', 'PE'] as const) {
  const g = calculateBSGreeksUnrounded(optType, testParams);

  // Finite difference steps
  const dS = 1.0;
  const dSigma = 0.0001; // 0.01% = 0.0001 in decimal
  const dT = (1 / 365.0) * 0.01; // 0.01 calendar day

  const pPlusS = calculateBSPrice(optType, { ...testParams, spot: testParams.spot + dS });
  const pMinusS = calculateBSPrice(optType, { ...testParams, spot: testParams.spot - dS });
  const p0 = calculateBSPrice(optType, testParams);

  const fdDelta = (pPlusS - pMinusS) / (2 * dS);
  const fdGamma = (pPlusS - 2 * p0 + pMinusS) / (dS * dS);

  // Vega per 1% (+0.01) vol change
  const pPlusVol = calculateBSPrice(optType, {
    ...testParams,
    volatility: testParams.volatility + dSigma,
  });
  const pMinusVol = calculateBSPrice(optType, {
    ...testParams,
    volatility: testParams.volatility - dSigma,
  });
  const fdVega = ((pPlusVol - pMinusVol) / (2 * dSigma)) * 0.01;

  // Theta per 1 calendar day passage of time (-dV/dT / 365)
  const pPlusT = calculateBSPrice(optType, {
    ...testParams,
    timeYears: testParams.timeYears + dT,
  });
  const pMinusT = calculateBSPrice(optType, {
    ...testParams,
    timeYears: testParams.timeYears - dT,
  });
  const fdTheta = -((pPlusT - pMinusT) / (2 * dT)) / 365.0;

  // Vanna: dDelta / dSigma per 1% (+0.01) vol change
  const gPlusVol = calculateBSGreeksUnrounded(optType, {
    ...testParams,
    volatility: testParams.volatility + dSigma,
  });
  const gMinusVol = calculateBSGreeksUnrounded(optType, {
    ...testParams,
    volatility: testParams.volatility - dSigma,
  });
  const fdVanna = ((gPlusVol.delta - gMinusVol.delta) / (2 * dSigma)) * 0.01;

  // Charm: -dDelta / dT per 1 calendar day passage of time
  const gPlusT = calculateBSGreeksUnrounded(optType, {
    ...testParams,
    timeYears: testParams.timeYears + dT,
  });
  const gMinusT = calculateBSGreeksUnrounded(optType, {
    ...testParams,
    timeYears: testParams.timeYears - dT,
  });
  const fdCharm = -((gPlusT.delta - gMinusT.delta) / (2 * dT)) / 365.0;

  // Vomma: dVega / dSigma per 1% (+0.01) vol change
  const fdVomma = ((gPlusVol.vega - gMinusVol.vega) / (2 * dSigma)) * 0.01;

  assertApprox(g.delta, fdDelta, 1e-4, `${optType} Analytical Delta matches Finite Difference`);
  assertApprox(g.gamma, fdGamma, 1e-6, `${optType} Analytical Gamma matches Finite Difference`);
  assertApprox(g.vega, fdVega, 1e-3, `${optType} Analytical Vega matches Finite Difference`);
  assertApprox(g.theta, fdTheta, 1e-2, `${optType} Analytical Theta matches Finite Difference`);
  assertApprox(g.vanna, fdVanna, 1e-4, `${optType} Analytical Vanna matches Finite Difference`);
  assertApprox(g.charm, fdCharm, 1e-4, `${optType} Analytical Charm matches Finite Difference`);
  assertApprox(g.vomma, fdVomma, 1e-4, `${optType} Analytical Vomma matches Finite Difference`);
}

// Edge-case checks: near-zero T and near-zero volatility
const edgeGreeks = calculateBSGreeks('CE', {
  spot: 22000,
  strike: 22000,
  timeYears: 0,
  volatility: 0,
});
assert(
  Number.isFinite(edgeGreeks.delta) &&
    Number.isFinite(edgeGreeks.vanna ?? 0) &&
    Number.isFinite(edgeGreeks.charm ?? 0) &&
    Number.isFinite(edgeGreeks.vomma ?? 0),
  'Near-zero T and volatility edge case produces finite, non-NaN Greeks'
);

console.log('\n================================================================');
console.log('🧪 PHASE 1B: DEALER GAMMA EXPOSURE & ZERO-GAMMA FLIP VALIDATION');
console.log('================================================================');

const niftyChain = generateOptionChain('NIFTY', '29 OCT 2026', 22150);
assert(
  Boolean(niftyChain.provenance && niftyChain.provenance.chainSource === 'MODEL_SYNTHESIZED_BSM'),
  'OptionChainData carries explicit DataProvenance metadata'
);

const gexInstitutional = calculateDealerExposure(
  niftyChain,
  'DEALER_LONG_CALL_SHORT_PUT'
);
assert(
  gexInstitutional.strikes.length === niftyChain.strikes.length,
  'Dealer GEX evaluated across all option chain strikes'
);
assert(
  gexInstitutional.zeroGammaFlip !== null &&
    gexInstitutional.zeroGammaFlip >= niftyChain.strikes[0].strike &&
    gexInstitutional.zeroGammaFlip <=
      niftyChain.strikes[niftyChain.strikes.length - 1].strike,
  `DEALER_LONG_CALL_SHORT_PUT produces valid dynamically repriced Zero-Gamma Flip (${gexInstitutional.zeroGammaFlip})`
);

const gexShortAll = calculateDealerExposure(niftyChain, 'DEALER_SHORT_ALL');
assert(
  gexShortAll.zeroGammaFlip === null && gexShortAll.flipStatus === 'NO_CROSSING',
  'DEALER_SHORT_ALL (strictly negative GEX) returns zeroGammaFlip=null and NO_CROSSING status'
);
assert(
  gexShortAll.flipMessage.includes('No valid zero-gamma crossing'),
  'No-crossing state displays transparent institutional message'
);

console.log('\n================================================================');
console.log('🧪 PHASE 2: VOLATILITY SURFACE, MULTI-EXPIRY & 2D SCENARIO MATRIX');
console.log('================================================================');

const volSurf = buildVolatilitySurfaceAnalytics(niftyChain, 21500, {
  mode: 'PANIC_SKEW',
  autoSpotVolCoupling: true,
  parallelIvShockPct: 2,
});
assert(
  volSurf.coupledAtmShiftPct > 0,
  `Negative spot shock (-2.9%) with Spot-Vol Coupling increases ATM IV (+${volSurf.coupledAtmShiftPct}%)`
);
assert(
  volSurf.shockedSkew25dPct > volSurf.baselineSkew25dPct,
  `PANIC_SKEW steepens 25-delta Put-Call skew (${volSurf.baselineSkew25dPct}% -> ${volSurf.shockedSkew25dPct}%)`
);
assert(
  volSurf.termStructure.length >= 2 &&
    volSurf.termStructure[0].termShockMultiplier >=
      volSurf.termStructure[1].termShockMultiplier,
  'Multi-expiry term structure applies sqrt(T_front / T_leg) shock decay across expiries'
);

// Test Calendar Spread multi-expiry valuation
const calendarPreset = INSTITUTIONAL_STRATEGY_PRESETS.find(
  (p) => p.id === 'calendar-spread'
)!;
const calendarLegs = buildLegsFromPreset(
  calendarPreset,
  niftyChain.spotPrice,
  50,
  '29 OCT 2026',
  75,
  undefined,
  1,
  niftyChain.expiries
);
assert(
  calendarLegs[0].expiry !== calendarLegs[1].expiry,
  `Calendar Spread assigns distinct near (${calendarLegs[0].expiry}) and far (${calendarLegs[1].expiry}) expiries`
);
const calendarPayoff = calculateStrategyPayoff(
  calendarLegs,
  niftyChain.spotPrice,
  'Calendar Spread',
  'NEUTRAL',
  { daysToExpiry: 7, baseSpotPrice: niftyChain.spotPrice }
);
assert(
  typeof calendarPayoff.maxProfit === 'number' && calendarPayoff.maxProfit > 0,
  `Multi-expiry Calendar Spread generates positive peak profit at front expiry (${calendarPayoff.maxProfit})`
);

// Test 2D Scenario Matrix (Spot × Time and Spot × IV)
const condorPreset = INSTITUTIONAL_STRATEGY_PRESETS.find(
  (p) => p.id === 'iron-condor'
)!;
const condorLegs = buildLegsFromPreset(
  condorPreset,
  niftyChain.spotPrice,
  50,
  '29 OCT 2026',
  75
);
const matrixSpotTime = computeScenarioMatrix({
  legs: condorLegs,
  referenceSpot: niftyChain.spotPrice,
  frontDaysToExpiry: 7,
  mode: 'SPOT_TIME',
});
const matrixSpotIv = computeScenarioMatrix({
  legs: condorLegs,
  referenceSpot: niftyChain.spotPrice,
  frontDaysToExpiry: 7,
  mode: 'SPOT_IV',
});
assert(
  matrixSpotTime.cells.length > 0 &&
    matrixSpotTime.cells[0].length === matrixSpotTime.spotShocksPct.length,
  `Spot × Time matrix populated (${matrixSpotTime.cells.length}×${matrixSpotTime.spotShocksPct.length})`
);
assert(
  matrixSpotIv.cells.length === 8 &&
    matrixSpotIv.cells[0].length === matrixSpotIv.spotShocksPct.length,
  `Spot × IV matrix populated (${matrixSpotIv.cells.length}×${matrixSpotIv.spotShocksPct.length})`
);
const csvOut = exportScenarioMatrixToCsv(matrixSpotTime, 'PNL');
assert(
  csvOut.split('\n').length === matrixSpotTime.cells.length + 1,
  'Scenario Matrix CSV export serializes header and all horizon rows'
);

console.log('\n================================================================');
console.log('🧪 PHASE 3A: SEEDED MONTE CARLO REPRODUCIBILITY & CVaR ORDERING');
console.log('================================================================');

const mcRun1 = runMonteCarloSimulation({
  legs: condorLegs,
  referenceSpot: niftyChain.spotPrice,
  frontDaysToExpiry: 7,
  config: {
    seed: 42007,
    numPaths: 5000,
    horizonDays: 7,
    distribution: 'STUDENT_T_FAT_TAIL',
    regime: 'VOL_CLUSTER_JUMP',
  },
});
const mcRun2 = runMonteCarloSimulation({
  legs: condorLegs,
  referenceSpot: niftyChain.spotPrice,
  frontDaysToExpiry: 7,
  config: {
    seed: 42007,
    numPaths: 5000,
    horizonDays: 7,
    distribution: 'STUDENT_T_FAT_TAIL',
    regime: 'VOL_CLUSTER_JUMP',
  },
});

assert(
  mcRun1.expectedPnl === mcRun2.expectedPnl &&
    mcRun1.cvar99Loss === mcRun2.cvar99Loss &&
    mcRun1.popPct === mcRun2.popPct,
  'Deterministic seeded PRNG produces 100% identical Monte Carlo outputs across runs'
);
assert(
  mcRun1.cvar99Loss >= mcRun1.var99Loss &&
    mcRun1.var99Loss >= mcRun1.var95Loss &&
    mcRun1.var95Loss >= 0,
  `Loss-based risk ordering holds: CVaR99 (${mcRun1.cvar99Loss}) >= VaR99 (${mcRun1.var99Loss}) >= VaR95 (${mcRun1.var95Loss}) >= 0`
);
assert(
  mcRun1.p5Pnl <= mcRun1.p25Pnl &&
    mcRun1.p25Pnl <= mcRun1.p50Pnl &&
    mcRun1.p50Pnl <= mcRun1.p75Pnl &&
    mcRun1.p75Pnl <= mcRun1.p95Pnl,
  'Monte Carlo P&L percentiles are monotonically ordered (P5 <= P25 <= P50 <= P75 <= P95)'
);

console.log('\n================================================================');
console.log('🧪 PHASE 3B: AI STRATEGY OPTIMIZER & PARETO DOMINANCE VALIDATION');
console.log('================================================================');

const parsedIntent = parseOptimizerIntent(
  'Neutral range-bound market with max loss 22000, defined risk and positive theta',
  niftyChain.spotPrice
);
assert(
  parsedIntent.outlook === 'NEUTRAL' &&
    parsedIntent.maxLossLimit === 22000 &&
    parsedIntent.requireDefinedRisk === true &&
    parsedIntent.preferPositiveTheta === true,
  'Intent parser extracts outlook=NEUTRAL, maxLossLimit=22000, requireDefinedRisk=true, preferPositiveTheta=true'
);

const optResult = optimizeStrategiesForIntent(niftyChain, parsedIntent);
assert(
  optResult.paretoCandidates.length > 0 && optResult.paretoCandidates.length <= 3,
  `Strategy Optimizer returned ${optResult.paretoCandidates.length} Pareto-optimal candidates`
);
assert(
  optResult.paretoCandidates.every((c) => c.isDefinedRisk),
  'All returned candidates strictly satisfy Defined-Risk constraint (Short Strangle excluded)'
);
assert(
  optResult.paretoCandidates[0].isParetoOptimal &&
    optResult.paretoCandidates[0].dominatedByCount === 0,
  `Top ranked candidate (${optResult.paretoCandidates[0].name}) is Pareto non-dominated (dominatedByCount=0)`
);

console.log('\n================================================================');
console.log('🧪 PHASE 3C: POSITION REPAIR & LOT-ROUNDED DELTA HEDGING');
console.log('================================================================');

const stranglePreset = INSTITUTIONAL_STRATEGY_PRESETS.find(
  (p) => p.id === 'short-strangle'
)!;
const strangleLegs = buildLegsFromPreset(
  stranglePreset,
  niftyChain.spotPrice,
  50,
  '29 OCT 2026',
  75,
  undefined,
  2 // 2 lots so a spot move creates > 1 lot of Delta
);

// Simulate a +2.5% spot rally that puts the Short Strangle into negative Delta
const ralliedSpot = Math.round(niftyChain.spotPrice * 1.025);
const repairProposals = generatePositionRepairProposals({
  legs: strangleLegs,
  chain: niftyChain,
  simulatedSpot: ralliedSpot,
  referenceSpot: niftyChain.spotPrice,
  strikeStep: 50,
  daysToExpiry: 7,
});

const deltaHedgeProp = repairProposals.find(
  (p) => p.id === 'NEUTRALIZE_DELTA_FUT' || p.id === 'NEUTRALIZE_DELTA_OPTION'
)!;
assert(
  Boolean(deltaHedgeProp) &&
    Math.abs(deltaHedgeProp.afterDelta) < Math.abs(deltaHedgeProp.beforeDelta),
  `Delta Hedge reduces portfolio |Delta| from |${deltaHedgeProp.beforeDelta}| to residual |${deltaHedgeProp.afterDelta}|`
);

const capTailProp = repairProposals.find((p) => p.id === 'CAP_TAIL_RISK')!;
assert(
  capTailProp.beforeMaxLoss === 'UNLIMITED' &&
    typeof capTailProp.afterMaxLoss === 'number',
  `Cap Tail Risk converts Short Strangle from UNLIMITED risk to Defined Max Loss (${capTailProp.afterMaxLoss})`
);

console.log('\n================================================================');
console.log(`🏁 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
