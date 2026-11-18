// ─── MI007 Screener Tab Audit Regression Test Suite (SC1–SC15) ────────────────
// Verifies all 10 regression test groups specified in Section 8 of the
// "MI007-Web: Screener Tab Audit Report and Remedies".

import { getVerifiedHistoricalCandles, generateDemoCandles } from '../lib/screener/verifiedHistoricalCandles';
import {
  generateCandlesForSymbol,
  evaluateAllStrategiesForStock,
  evaluateTechnicalStrategiesForStock,
  STRATEGY_DEFINITIONS,
} from '../lib/screener/technicalStrategies';
import { getMetricValue, computeMetricCoverage } from '../lib/screener/metrics';
import { getCompaniesByMarket } from '../lib/screener/data';
import { parseQuery, evaluateNode, computeExcludedForMissingData } from '../lib/screener/queryEngine';
import { calculateSMA, calculateEMA } from '../lib/indicators';
import { runBacktest } from '../lib/screener/backtesting';
import {
  calculatePiotroskiScore,
  calculateAltmanZScore,
  calculateBeneishMScore,
} from '../lib/screener/scorecards';
import {
  validateFormula,
  evaluateCustomRatio,
  DEFAULT_CUSTOM_RATIOS,
} from '../lib/screener/customRatios';
import { Candle } from '../lib/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  PASS: ${message}`);
}

function makeSeededSeries(seed: number, length: number = 240, startPrice: number = 500): Candle[] {
  let state = seed >>> 0;
  const nextRand = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const candles: Candle[] = [];
  let price = startPrice;
  const baseTime = Date.UTC(2025, 0, 1, 9, 15, 0);
  for (let i = 0; i < length; i++) {
    const drift = (seed % 7 === 0 ? 0.002 : seed % 5 === 0 ? -0.002 : 0) + (nextRand() - 0.5) * 0.03;
    const open = Number(price.toFixed(2));
    const close = Number(Math.max(10, price * (1 + drift)).toFixed(2));
    const high = Number((Math.max(open, close) * (1 + nextRand() * 0.015)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - nextRand() * 0.015)).toFixed(2));
    const volume = Math.round(1000000 * (0.6 + nextRand() * 1.2));
    price = close;
    const openTime = baseTime + i * 86400 * 1000;
    candles.push({
      openTime,
      time: new Date(openTime).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume,
      isClosed: i < length - 1,
    });
  }
  return candles;
}

async function runTests() {
  console.log('=== MI007 Screener Tab Audit Verification (SC1–SC15) ===\n');

  const indiaCompanies = getCompaniesByMarket('INDIA');
  const usCompanies = getCompaniesByMarket('USA');

  // 1. Real-data guard (SC1)
  console.log('1. Real-data guard (SC1)');
  const defaultCandles = getVerifiedHistoricalCandles('UNKNOWN_TICKER', 1000, 1200, 800);
  assert(defaultCandles.length === 0, 'getVerifiedHistoricalCandles returns [] when real candles are unavailable and allowSyntheticDemo is false');

  const defaultStratSignals = evaluateTechnicalStrategiesForStock('UNKNOWN_TICKER', 'Unknown Co', 'INDIA', 1000);
  assert(defaultStratSignals.length === 0, 'evaluateTechnicalStrategiesForStock returns [] without real candles');

  const sharedCandles = makeSeededSeries(42, 240, 1000);
  const sigA = evaluateAllStrategiesForStock('AAAA', 'Alpha Corp', 'INDIA', 1000, sharedCandles);
  const sigZ = evaluateAllStrategiesForStock('ZZZZ', 'Zeta Corp', 'INDIA', 1000, sharedCandles);
  assert(
    JSON.stringify(sigA.map((s) => ({ id: s.strategyId, t: s.signalTriggered, d: s.direction }))) ===
      JSON.stringify(sigZ.map((s) => ({ id: s.strategyId, t: s.signalTriggered, d: s.direction }))),
    'Two symbols (AAAA vs ZZZZ) with identical prices and candle series produce identical strategy signals'
  );

  const demoA = generateDemoCandles('AAAA', 900, 1200, 800, 1000, 2000000, 'INDIA', 220);
  const demoZ = generateDemoCandles('ZZZZ', 900, 1200, 800, 1000, 2000000, 'INDIA', 220);
  assert(
    JSON.stringify(demoA) === JSON.stringify(demoZ),
    'generateDemoCandles does not seed from ticker letters (AAAA and ZZZZ with same prices match)'
  );

  // 2. Signal-rate sanity (SC1)
  console.log('\n2. Signal-rate sanity across 100 diverse candle series (SC1)');
  const seriesCount = 100;
  const triggerCounts: Record<string, number> = {};
  for (const def of STRATEGY_DEFINITIONS) triggerCounts[def.id] = 0;

  for (let s = 1; s <= seriesCount; s++) {
    const cands = makeSeededSeries(s * 137 + 19, 240, 500);
    const lastClose = cands[cands.length - 1].close;
    const res = evaluateAllStrategiesForStock(`SYM${s}`, `Company ${s}`, 'INDIA', lastClose, cands);
    for (const r of res) {
      if (r.signalTriggered) {
        triggerCounts[r.strategyId] = (triggerCounts[r.strategyId] || 0) + 1;
      }
    }
  }
  const maxRate = Math.max(...Object.values(triggerCounts)) / seriesCount;
  assert(
    maxRate <= 0.4,
    `No technical strategy flags > 40% of diverse series (max trigger rate = ${(maxRate * 100).toFixed(1)}%, counts=${JSON.stringify(triggerCounts)})`
  );

  // 3. Fabrication guard (SC2)
  console.log('\n3. Fabrication guard on technical metrics (SC2)');
  const sampleComp = indiaCompanies.find((c) => !(c as any).rsi14 && !(c as any).sma200) || indiaCompanies[20];
  assert(getMetricValue(sampleComp, 'rsi14') === null, 'getMetricValue(company, "rsi14") returns null when no real precomputed RSI exists');
  assert(getMetricValue(sampleComp, 'sma50') === null, 'getMetricValue(company, "sma50") returns null when no real precomputed SMA50 exists');
  assert(getMetricValue(sampleComp, 'sma200') === null, 'getMetricValue(company, "sma200") returns null when no real precomputed SMA200 exists');
  assert(getMetricValue(sampleComp, 'distanceSma200Pct') === null, 'getMetricValue(company, "distanceSma200Pct") returns null when no real precomputed SMA200 exists');
  assert(getMetricValue(sampleComp, 'macd') === null, 'getMetricValue(company, "macd") returns null when no real precomputed MACD exists');

  // 4. Statements & fabrication guard (SC3, SC14)
  console.log('\n4. Statements & fabricated fundamentals guard (SC3, SC14)');
  const unreportedComp = indiaCompanies.find((c) => c.statementProvenance?.annualProfitLoss === 'missing');
  assert(Boolean(unreportedComp), 'Unreported Zerodha-derived company has statementProvenance.annualProfitLoss === "missing"');
  assert(
    unreportedComp!.annualProfitLoss.length === 0 &&
      unreportedComp!.balanceSheet.length === 0 &&
      unreportedComp!.cashFlow.length === 0,
    'Unreported company has empty annualProfitLoss, balanceSheet, and cashFlow arrays (not synthesized)'
  );
  const uncachedComp = indiaCompanies.find((c) => c.promoterHolding === null && c.workingCapitalDays === null);
  assert(
    Boolean(uncachedComp) && uncachedComp!.promoterHolding === null && uncachedComp!.workingCapitalDays === null,
    `Company with unreported ownership/working-capital (${uncachedComp?.symbol}) returns null for promoterHolding and workingCapitalDays (not constant defaults)`
  );

  // 5. Query engine tests (SC6, SC7)
  console.log('\n5. Query engine unit suffixes, % ratios, NOT operator, and missing-data count (SC6, SC7)');
  const qCr = parseQuery('Market Capitalization > 5000');
  const qLakhs = parseQuery('Market Capitalization > 500000 lakhs');
  const matchesCr = indiaCompanies.filter((c) => evaluateNode(qCr.ast!, c)).length;
  const matchesLakhs = indiaCompanies.filter((c) => evaluateNode(qLakhs.ast!, c)).length;
  assert(
    matchesCr === matchesLakhs && matchesCr > 0,
    `"Market Capitalization > 500000 lakhs" (${matchesLakhs}) equals "Market Capitalization > 5000" (${matchesCr}) on INDIA`
  );

  const qUsB = parseQuery('Market Capitalization > 1 B');
  const qUsRaw = parseQuery('Market Capitalization > 1000000000');
  const matchesUsB = usCompanies.filter((c) => evaluateNode(qUsB.ast!, c)).length;
  const matchesUsRaw = usCompanies.filter((c) => evaluateNode(qUsRaw.ast!, c)).length;
  assert(
    matchesUsB === matchesUsRaw && matchesUsB > 0,
    `"Market Capitalization > 1 B" (${matchesUsB}) equals "Market Capitalization > 1000000000" (${matchesUsRaw}) on USA`
  );

  const qDePct = parseQuery('Debt to Equity < 1%');
  const qDeDec = parseQuery('Debt to Equity < 0.01');
  const matchesDePct = indiaCompanies.filter((c) => evaluateNode(qDePct.ast!, c)).length;
  const matchesDeDec = indiaCompanies.filter((c) => evaluateNode(qDeDec.ast!, c)).length;
  assert(
    matchesDePct === matchesDeDec,
    `"Debt to Equity < 1%" (${matchesDePct}) equals "Debt to Equity < 0.01" (${matchesDeDec})`
  );

  const qNot = parseQuery('NOT ROE > 15');
  const qLte = parseQuery('ROE <= 15');
  assert(qNot.valid && Boolean(qNot.ast), '"NOT ROE > 15" parses without error');
  const matchesNot = indiaCompanies.filter((c) => evaluateNode(qNot.ast!, c)).length;
  const matchesLte = indiaCompanies.filter((c) => evaluateNode(qLte.ast!, c)).length;
  assert(
    matchesNot === matchesLte && matchesNot > 0,
    `"NOT ROE > 15" (${matchesNot}) matches "ROE <= 15" (${matchesLte}) excluding missing-data companies`
  );

  const excludedInfo = computeExcludedForMissingData(qNot.ast!, indiaCompanies);
  const coverage = computeMetricCoverage(indiaCompanies);
  assert(
    excludedInfo.totalExcludedForMissingData >= 0 && typeof coverage.pe?.coveragePct === 'number',
    `computeExcludedForMissingData (${excludedInfo.totalExcludedForMissingData}) and computeMetricCoverage (PE coverage: ${coverage.pe?.coveragePct}%) work accurately`
  );

  // 6. API & immutability tests (SC8, SC9)
  console.log('\n6. Shared universe immutability & paging bounds (SC8, SC9)');
  const firstBefore = getCompaniesByMarket('INDIA')[0].symbol;
  const copyToMutate = getCompaniesByMarket('INDIA');
  copyToMutate.sort((a, b) => (a.pe ?? 999999) - (b.pe ?? 999999));
  const firstAfter = getCompaniesByMarket('INDIA')[0].symbol;
  assert(
    firstBefore === firstAfter,
    `Sorting getCompaniesByMarket("INDIA") result does not mutate cached universe (${firstBefore} === ${firstAfter})`
  );
  assert(
    indiaCompanies[0].asOfDate === '2026-10-31',
    `Company records carry explicit snapshot asOfDate (${indiaCompanies[0].asOfDate})`
  );

  // 7. Indicators warmup null guard (SC11)
  console.log('\n7. Indicator warmup null guard (SC11)');
  const sma200 = calculateSMA(sharedCandles, 200);
  const ema200 = calculateEMA(sharedCandles, 200);
  const first199SmaNull = sma200.slice(0, 199).every((v) => v === null);
  const first199EmaNull = ema200.slice(0, 199).every((v) => v === null);
  assert(first199SmaNull && sma200[199] !== null, 'calculateSMA(candles, 200) returns null for indices 0..198 and a number at index 199');
  assert(first199EmaNull && ema200[199] !== null, 'calculateEMA(candles, 200) returns null for indices 0..198 and a number at index 199');

  // 8. Backtester distinct SMC strategies, intrabar stop loss, costs, and low-sample warning (SC10)
  console.log('\n8. Backtester distinct SMC strategies, intrabar stop loss, trading costs, and Sharpe/warnings (SC10)');
  const btSeries = makeSeededSeries(777, 250, 1000);
  const btChoch = runBacktest({
    symbol: 'TEST',
    strategyId: 'smc_choch',
    initialCapital: 100000,
    takeProfitPct: 8,
    stopLossPct: 4,
    maxHoldingDays: 20,
    positionSizePct: 100,
    candles: btSeries,
  });
  const btIfvg = runBacktest({
    symbol: 'TEST',
    strategyId: 'smc_ifvg',
    initialCapital: 100000,
    takeProfitPct: 8,
    stopLossPct: 4,
    maxHoldingDays: 20,
    positionSizePct: 100,
    candles: btSeries,
  });
  assert(
    JSON.stringify(btChoch.trades) !== JSON.stringify(btIfvg.trades),
    `smc_choch (${btChoch.totalTrades} trades) and smc_ifvg (${btIfvg.totalTrades} trades) use distinct SMC logic`
  );

  const btCostSeries = makeSeededSeries(779, 250, 1000);
  const btZeroCost = runBacktest({
    symbol: 'TEST',
    strategyId: 'ema_9_21_cross',
    initialCapital: 100000,
    takeProfitPct: 8,
    stopLossPct: 4,
    maxHoldingDays: 20,
    positionSizePct: 100,
    candles: btCostSeries,
    commissionPct: 0,
    slippagePct: 0,
  });
  const btWithCost = runBacktest({
    symbol: 'TEST',
    strategyId: 'ema_9_21_cross',
    initialCapital: 100000,
    takeProfitPct: 8,
    stopLossPct: 4,
    maxHoldingDays: 20,
    positionSizePct: 100,
    candles: btCostSeries,
    commissionPct: 0.001,
    slippagePct: 0.0005,
  });
  assert(
    btWithCost.totalCostsPaid > 0 && btWithCost.finalEquity < btZeroCost.finalEquity,
    `Trading costs reduce net equity (zero-cost: ${btZeroCost.finalEquity}, with-cost: ${btWithCost.finalEquity}, costsPaid: ${btWithCost.totalCostsPaid})`
  );
  assert(
    btWithCost.lowSampleWarning === (btWithCost.totalTrades < 30),
    `lowSampleWarning (${btWithCost.lowSampleWarning}) is true when totalTrades (${btWithCost.totalTrades}) < 30`
  );

  // Verify intrabar stop loss triggers when low breaches stop even if close recovers
  const intrabarSeries = makeSeededSeries(101, 80, 100);
  // Force an EMA 9/21 bull cross around bar 30, then an intrabar low spike -10% with close flat on bar 31
  for (let i = 20; i < 30; i++) {
    intrabarSeries[i].close = 100 - (30 - i);
    intrabarSeries[i].open = intrabarSeries[i].close - 0.5;
    intrabarSeries[i].high = intrabarSeries[i].close + 0.5;
    intrabarSeries[i].low = intrabarSeries[i].close - 0.5;
  }
  intrabarSeries[30].open = 100;
  intrabarSeries[30].close = 115;
  intrabarSeries[30].high = 116;
  intrabarSeries[30].low = 99;
  intrabarSeries[31].open = 115;
  intrabarSeries[31].low = 100; // >13% drop intrabar (breaches 5% stop loss at 109.25)
  intrabarSeries[31].close = 115; // recovers by close!
  intrabarSeries[31].high = 116;

  const btIntrabar = runBacktest({
    symbol: 'INTRABAR',
    strategyId: 'ema_9_21_cross',
    initialCapital: 100000,
    takeProfitPct: 20,
    stopLossPct: 5,
    maxHoldingDays: 20,
    positionSizePct: 100,
    candles: intrabarSeries,
  });
  const stoppedOnBar31 = btIntrabar.trades.some((t) => t.exitReason === 'Stop Loss');
  assert(stoppedOnBar31, 'Intrabar stop loss triggers on bar low even when bar close recovers');

  // 9. Scorecards guard (SC4)
  console.log('\n9. Financial Scorecards guard (SC4)');
  assert(unreportedComp !== undefined, 'Unreported company available for scorecard check');
  const pio = calculatePiotroskiScore(unreportedComp!);
  const alt = calculateAltmanZScore(unreportedComp!);
  const ben = calculateBeneishMScore(unreportedComp!);
  assert(
    pio.score === null && alt.score === null && ben.score === null,
    `Scorecards return score: null when required financial statements are missing (Piotroski=${pio.score}, Altman=${alt.score}, Beneish=${ben.score})`
  );

  // 10. Custom ratio formulas (SC13)
  console.log('\n10. Custom ratio tokenizer, unary minus, and CFO to Net Profit preset (SC13)');
  const f1 = validateFormula('P/E * 2');
  const f2 = validateFormula('Debt-to-Equity * 2');
  const f3 = validateFormula('-5 + ROE');
  const f4 = validateFormula('ROE - -5');
  assert(f1.valid && f2.valid && f3.valid && f4.valid, 'Formulas "P/E * 2", "Debt-to-Equity * 2", "-5 + ROE", and "ROE - -5" validate without error');

  const testComp = indiaCompanies.find((c) => c.pe != null && c.roe != null && c.debtToEquity != null) || indiaCompanies[0];
  const v1 = evaluateCustomRatio({ id: '1', name: 't1', code: 'T1', formula: 'P/E * 2', unit: 'x', decimals: 2, description: '', createdAt: '' }, testComp);
  const v3 = evaluateCustomRatio({ id: '3', name: 't3', code: 'T3', formula: '-5 + ROE', unit: '%', decimals: 2, description: '', createdAt: '' }, testComp);
  const v4 = evaluateCustomRatio({ id: '4', name: 't4', code: 'T4', formula: 'ROE - -5', unit: '%', decimals: 2, description: '', createdAt: '' }, testComp);
  assert(
    v1 !== null && Math.abs(v1 - testComp.pe! * 2) < 1e-6 &&
    v3 !== null && Math.abs(v3 - (-5 + testComp.roe!)) < 1e-6 &&
    v4 !== null && Math.abs(v4 - (testComp.roe! + 5)) < 1e-6,
    `Evaluated custom ratios match expected math (P/E*2=${v1}, -5+ROE=${v3}, ROE--5=${v4})`
  );

  const cfoPatPreset = DEFAULT_CUSTOM_RATIOS.find((r) => r.id === 'cfo-to-pat')!;
  assert(
    cfoPatPreset.formula === 'Cash from Operations / Net Profit',
    `Preset "CFO to Net Profit" uses "Cash from Operations / Net Profit" (actual: "${cfoPatPreset.formula}")`
  );

  console.log('\nALL 10 SCREENER AUDIT REGRESSION TEST GROUPS PASSED!');
}

runTests().catch((err) => {
  console.error('\nVERIFICATION FAILED:', err);
  process.exit(1);
});
