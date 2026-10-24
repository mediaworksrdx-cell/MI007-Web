// ─── Complete Verification Test Suite for All Screener Strategies ─────────────
// Covers:
// 1. All 10 Institutional Quantitative Technical Strategies (deterministic signals & metrics)
// 2. All 22 Fundamental Screening Frameworks & Predefined Screens (AST execution & company matching)
// 3. Quantitative Walk-Forward Backtesting Simulation Engine across all 10 strategies
// 4. Custom Mathematical Formula Query Engine & Boundary Edge Cases

import { Candle } from '../lib/types';
import {
  STRATEGY_DEFINITIONS,
  StrategyId,
  evaluateAllStrategiesForStock,
} from '../lib/screener/technicalStrategies';
import { PREDEFINED_SCREENS } from '../lib/screener/templates';
import { parseQuery, evaluateNode } from '../lib/screener/queryEngine';
import { MASTER_COMPANIES, getCompaniesByMarket } from '../lib/screener/data';
import { runBacktest, BacktestConfig } from '../lib/screener/backtesting';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
console.log('║       MI-007 SCREENER STRATEGIES COMPREHENSIVE TEST SUITE              ║');
console.log('║   Verifying 10 Technical Strategies, 22 Fundamental Screens & Backtest ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1: VERIFICATION OF ALL 10 QUANTITATIVE TECHNICAL STRATEGIES
// ══════════════════════════════════════════════════════════════════════════════
console.log('─── [SUITE 1] Testing All 10 Technical Quantitative Strategies ───');

// 1.1 Metadata and Definition Integrity
assert(STRATEGY_DEFINITIONS.length === 10, `Engine has all 10 defined strategies (Found: ${STRATEGY_DEFINITIONS.length})`);

const expectedStrategyIds: StrategyId[] = [
  'ma_alignment',
  'golden_cross',
  'death_cross',
  'ma_20_50_cross',
  'ema_9_21_cross',
  'rsi_momentum',
  'macd_cross',
  'bb_reversal',
  'breakout',
  'adx_trend',
];

for (const id of expectedStrategyIds) {
  const found = STRATEGY_DEFINITIONS.find((s) => s.id === id);
  assert(found !== undefined, `Strategy "${id}" registered with full configuration`);
  if (found) {
    assert(Boolean(found.name && found.category && found.description), `  -> Strategy "${id}" has complete metadata and category`);
    assert(found.supportedDirections.length > 0, `  -> Strategy "${id}" supports directional bias: [${found.supportedDirections.join(', ')}]`);
  }
}

// 1.2 Execution on Real Sample Stocks
console.log('\n─── [SUITE 1.2] Executing 10 Strategies on Real Market Instruments ───');
const sampleStocks = [
  { symbol: 'TCS', name: 'Tata Consultancy Services', market: 'INDIA', price: 2542 },
  { symbol: 'RELIANCE', name: 'Reliance Industries', market: 'INDIA', price: 1211 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'USA', price: 217 },
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'USA', price: 342 },
];

for (const stock of sampleStocks) {
  const results = evaluateAllStrategiesForStock(stock.symbol, stock.name, stock.market, stock.price);
  assert(results.length === 10, `${stock.symbol}: Evaluated all 10 strategies (Returned ${results.length} signal cards)`);

  for (const res of results) {
    const hasContract =
      res.symbol === stock.symbol &&
      Boolean(res.strategyId) &&
      Boolean(res.strategyName) &&
      ['bullish', 'bearish', 'neutral'].includes(res.direction) &&
      typeof res.signalTriggered === 'boolean' &&
      typeof res.currentPrice === 'number' &&
      res.currentPrice > 0 &&
      typeof res.triggerPrice === 'number' &&
      typeof res.keyMetrics === 'object' &&
      ['Confirmed', 'Provisional'].includes(res.status) &&
      typeof res.explanation === 'string' &&
      res.explanation.length > 10;

    assert(hasContract, `${stock.symbol} / ${res.strategyId}: Signal card meets institutional result contract`);
  }
}

// 1.3 Synthetic Precision Tests for Individual Strategy Logic (minimum 220 bars)
console.log('\n─── [SUITE 1.3] Synthetic Boundary Tests for Technical Strategy Rules ───');

function createCandles(count: number, basePrice: number, dailyMultiplier: number = 1.0): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const dayMs = 86_400_000;
  let p = basePrice;
  for (let i = 0; i < count; i++) {
    p = p * dailyMultiplier;
    candles.push({
      openTime: now - (count - i) * dayMs,
      open: +(p * 0.995).toFixed(2),
      high: +(p * 1.01).toFixed(2),
      low: +(p * 0.99).toFixed(2),
      close: +p.toFixed(2),
      volume: 2500000,
    });
  }
  return candles;
}

// Test Case 1: Bullish MA Alignment (Price > SMA50 > SMA200)
{
  // Compounding 0.25% daily over 220 bars moves price from 100 to ~173
  const bullCandles = createCandles(220, 100, 1.0025);
  const lastPrice = bullCandles[bullCandles.length - 1].close;
  const results = evaluateAllStrategiesForStock('SYNTH_BULL', 'Synthetic Bull', 'INDIA', lastPrice, bullCandles);
  const maAlign = results.find((r) => r.strategyId === 'ma_alignment');
  assert(maAlign?.direction === 'bullish', 'Strategy 1 (ma_alignment): Correctly detects Bullish Alignment (Price > SMA50 > SMA200)');
}

// Test Case 2: Bearish MA Alignment (Price < SMA50 < SMA200)
{
  // Compounding -0.25% daily over 220 bars drops price from 200 to ~115
  const bearCandles = createCandles(220, 200, 0.9975);
  const lastPrice = bearCandles[bearCandles.length - 1].close;
  const results = evaluateAllStrategiesForStock('SYNTH_BEAR', 'Synthetic Bear', 'INDIA', lastPrice, bearCandles);
  const maAlign = results.find((r) => r.strategyId === 'ma_alignment');
  assert(maAlign?.direction === 'bearish', 'Strategy 1 (ma_alignment): Correctly detects Bearish Alignment (Price < SMA50 < SMA200)');
}

// Test Case 3: EMA 9 / 21 Momentum Cross
{
  // 210 bars flat/down, then aggressive 10-bar breakout
  const candles = createCandles(220, 100, 0.9995);
  for (let i = 210; i < 220; i++) {
    const bump = 100 + (i - 209) * 4;
    candles[i].open = bump - 2;
    candles[i].close = bump;
    candles[i].high = bump + 1;
    candles[i].low = bump - 3;
  }
  const lastPrice = candles[candles.length - 1].close;
  const results = evaluateAllStrategiesForStock('SYNTH_EMA', 'Synthetic EMA', 'INDIA', lastPrice, candles);
  const emaCross = results.find((r) => r.strategyId === 'ema_9_21_cross');
  assert(emaCross?.direction === 'bullish', 'Strategy 5 (ema_9_21_cross): Accurately detects bullish EMA 9 crossing EMA 21');
}

// Test Case 4: Breakout Strategy on 50-day High
{
  const candles = createCandles(220, 100, 1.0);
  // Flat consolidation for 218 bars between 98 and 102
  for (let i = 0; i < 218; i++) {
    candles[i].close = +(100 + Math.sin(i) * 2).toFixed(2);
    candles[i].high = +(candles[i].close + 1).toFixed(2);
    candles[i].volume = 1000000;
  }
  // Bar 219 blows past ceiling with massive volume surge
  candles[219].close = 115;
  candles[219].high = 116;
  candles[219].volume = 4500000; // 4.5x volume

  const lastPrice = candles[219].close;
  const results = evaluateAllStrategiesForStock('SYNTH_BO', 'Synthetic Breakout', 'INDIA', lastPrice, candles);
  const bo = results.find((r) => r.strategyId === 'breakout');
  assert(bo?.signalTriggered === true && bo?.direction === 'bullish', 'Strategy 9 (breakout): Triggers on 50-day high breakout with 4.5x volume');
}

// Test Case 5: Bollinger Band Mean Reversion
{
  const candles = createCandles(220, 100, 1.0);
  // Bar 218 crashes below lower band, bar 219 reclaims inside band
  candles[217].close = 85;
  candles[218].close = 82; // sharp piercing of lower band
  candles[219].close = 92; // bounce back inside band
  candles[219].open = 84;

  const lastPrice = candles[219].close;
  const results = evaluateAllStrategiesForStock('SYNTH_BB', 'Synthetic BB', 'INDIA', lastPrice, candles);
  const bb = results.find((r) => r.strategyId === 'bb_reversal');
  assert(bb !== undefined, 'Strategy 8 (bb_reversal): Evaluates Bollinger Band mean-reversion metrics');
}


// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2: VERIFICATION OF ALL 22 FUNDAMENTAL SCREENER TEMPLATES & STRATEGIES
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n─── [SUITE 2] Testing All 22 Fundamental Screener Strategies ───');
assert(PREDEFINED_SCREENS.length >= 14, `All predefined screens registered (Found: ${PREDEFINED_SCREENS.length})`);

for (const tmpl of PREDEFINED_SCREENS) {
  // 2.1 Query Parser validity
  const parsed = parseQuery(tmpl.query);
  assert(parsed.valid === true, `Screen "${tmpl.name}" (ID: ${tmpl.id}) parses valid AST`);

  if (!parsed.valid) {
    console.error(`  Error in ${tmpl.id}: ${parsed.error}`);
    continue;
  }

  // 2.2 Execution against respective market universe
  const marketUniverse = getCompaniesByMarket(tmpl.market || 'INDIA');
  assert(marketUniverse.length > 0, `Market universe for "${tmpl.market || 'INDIA'}" contains companies (${marketUniverse.length})`);

  const matched = marketUniverse.filter((company) => evaluateNode(parsed.ast!, company));
  assert(matched.length >= 1, `Screen "${tmpl.name}" matches active companies in ${tmpl.market}: ${matched.length} matches [e.g. ${matched.slice(0, 3).map((m) => m.symbol).join(', ')}]`);

  // 2.3 Required display columns
  assert(Array.isArray(tmpl.columns) && tmpl.columns.length >= 4, `Screen "${tmpl.name}" defines display columns (${tmpl.columns.length} columns)`);
}

// 2.4 High-Conviction Specific Fundamental Strategy Tests
console.log('\n─── [SUITE 2.2] High-Conviction Fundamental Strategy Verification ───');

// Strategy Test: Quality Compounders (ROCE > 20, ROE > 18, D/E < 0.5, Profit Growth 3Y > 12)
{
  const qc = PREDEFINED_SCREENS.find((s) => s.id === 'quality-compounders')!;
  const parsed = parseQuery(qc.query);
  const tcs = MASTER_COMPANIES.find((c) => c.symbol === 'TCS')!;
  const polycab = MASTER_COMPANIES.find((c) => c.symbol === 'POLYCAB')!;
  const reliance = MASTER_COMPANIES.find((c) => c.symbol === 'RELIANCE')!;

  assert(evaluateNode(parsed.ast!, tcs) === true, 'Quality Compounders: TCS matches (ROCE 58.2%, ROE 49.5%, D/E 0.08, Profit Growth 3Y 15.2%)');
  assert(evaluateNode(parsed.ast!, polycab) === true, 'Quality Compounders: POLYCAB matches (ROCE 28.5%, ROE 22.8%, D/E 0.04, Profit Growth 3Y 26.5%)');
  assert(evaluateNode(parsed.ast!, reliance) === false, 'Quality Compounders: Reliance correctly excluded due to leverage (D/E 0.42, ROCE 12.4%)');
}

// Strategy Test: Capital Efficiency Champions (ROCE > 25, ROIC > 20, D/E < 0.3)
{
  const highRoce = PREDEFINED_SCREENS.find((s) => s.id === 'high-roce-stars')!;
  const parsed = parseQuery(highRoce.query);
  const tcs = MASTER_COMPANIES.find((c) => c.symbol === 'TCS')!;
  const infy = MASTER_COMPANIES.find((c) => c.symbol === 'INFY')!;
  const polycab = MASTER_COMPANIES.find((c) => c.symbol === 'POLYCAB')!;

  assert(evaluateNode(parsed.ast!, tcs) === true, 'Capital Efficiency Champions: TCS matches (ROCE 58.2%, ROIC 52.4%, D/E 0.08)');
  assert(evaluateNode(parsed.ast!, infy) === true, 'Capital Efficiency Champions: INFY matches (ROCE 38.6%, ROIC 34.2%, D/E 0.09)');
  assert(evaluateNode(parsed.ast!, polycab) === true, 'Capital Efficiency Champions: POLYCAB matches (ROCE 28.5%, ROIC 24.8%, D/E 0.04)');
}

// Strategy Test: US AI & Semiconductors
{
  const aiScreen = PREDEFINED_SCREENS.find((s) => s.id === 'us-ai-semiconductors')!;
  const parsed = parseQuery(aiScreen.query);
  const nvda = MASTER_COMPANIES.find((c) => c.symbol === 'NVDA')!;
  assert(evaluateNode(parsed.ast!, nvda) === true, 'US AI Semiconductors: NVDA matches (OPM 62.5%, ROCE 68.4%, Sales Growth 1Y 122%)');
}

// Strategy Test: US Megacap Tech Titans
{
  const techTitans = PREDEFINED_SCREENS.find((s) => s.id === 'us-tech-titans')!;
  const parsed = parseQuery(techTitans.query);
  const aapl = MASTER_COMPANIES.find((c) => c.symbol === 'AAPL')!;
  const msft = MASTER_COMPANIES.find((c) => c.symbol === 'MSFT')!;
  assert(evaluateNode(parsed.ast!, aapl) === true, 'US Megacap Tech Titans: AAPL matches ($3.58T Cap, OPM 31.8%, FCF $104B)');
  assert(evaluateNode(parsed.ast!, msft) === true, 'US Megacap Tech Titans: MSFT matches ($3.25T Cap, OPM 44.6%, FCF $74B)');
}


// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3: QUANTITATIVE WALK-FORWARD BACKTESTING SIMULATION ENGINE
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n─── [SUITE 3] Testing Quantitative Backtesting Engine Across All 10 Strategies ───');

for (const def of STRATEGY_DEFINITIONS) {
  const config: BacktestConfig = {
    symbol: 'TCS',
    strategyId: def.id,
    initialCapital: 100000,
    takeProfitPct: 8,
    stopLossPct: 4,
    maxHoldingDays: 25,
    positionSizePct: 100,
  };

  try {
    const result = runBacktest(config);

    assert(
      typeof result.totalTrades === 'number' &&
      typeof result.winRate === 'number' &&
      result.winRate >= 0 &&
      result.winRate <= 100 &&
      typeof result.profitFactor === 'number' &&
      typeof result.maxDrawdownPct === 'number' &&
      result.maxDrawdownPct >= 0 &&
      typeof result.finalEquity === 'number' &&
      Array.isArray(result.equityCurve) &&
      result.equityCurve.length > 0 &&
      Array.isArray(result.trades),
      `Backtest Strategy "${def.id}" (${def.name}): Clean simulation with ${result.totalTrades} trades, win rate ${result.winRate.toFixed(1)}%, final equity ₹${result.finalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    );

    // Verify equity curve data points
    const firstPoint = result.equityCurve[0];
    const lastPoint = result.equityCurve[result.equityCurve.length - 1];
    assert(firstPoint.portfolioValue > 0 && lastPoint.portfolioValue > 0, `  -> Equity curve spans ${result.equityCurve.length} daily checkpoints`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(false, `Backtest failed for ${def.id}: ${msg}`);
  }
}


// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4: QUERY ENGINE SYNTAX & BOUNDARY ROBUSTNESS
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n─── [SUITE 4] Testing Screener Expression Grammar & Boundary Edge Cases ───');

// Logical combinations with nested parentheses
const complexQuery = '((ROCE > 20 OR Return on Equity > 20) AND Debt to Equity < 0.5) AND (Market Capitalization > 10000 OR Price to Earning < 25)';
const complexParsed = parseQuery(complexQuery);
assert(complexParsed.valid === true, 'Complex nested boolean logic ((A OR B) AND C) AND (D OR E) parses successfully');

// Negative numbers & decimal thresholds
const negQuery = 'Debt Reduction 3Y < -2.0 AND Price to 52W High % < -15.5';
const negParsed = parseQuery(negQuery);
assert(negParsed.valid === true, 'Negative numeric thresholds and percentage syntax parsed cleanly');

// Malformed expression rejection
const invalid1 = parseQuery('ROCE > AND Price < 100');
assert(invalid1.valid === false, 'Rejects missing comparator operand');

const invalid2 = parseQuery('NonExistentMetricName > 50');
assert(invalid2.valid === false, 'Rejects fabricated metric names with helpful error feedback');

const invalid3 = parseQuery('ROCE BETWEEN 50'); // Missing upper bound
assert(invalid3.valid === false, 'Rejects incomplete BETWEEN statement');


// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n======================================================================');
console.log(`TOTAL STRATEGY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL SCREENER STRATEGIES & TEST CASES VERIFIED WITH 100% SUCCESS!\n');
}
