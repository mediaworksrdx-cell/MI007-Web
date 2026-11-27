import { calculateSMC } from '../lib/smcEngine';
import { calculateEMA, calculateMACD, calculateRSI, calculateSMA, calculateBollinger } from '../lib/indicators';
import { analyzeMultiTimeframeSmc, resampleCandlesToHtf } from '../lib/mi007/mtfSmc';
import { compareMi007Strategies, runMi007Backtest } from '../lib/mi007/mi007Backtest';
import { generateMi007Intelligence } from '../lib/mi007/mi007Intelligence';
import { Candle } from '../lib/types';

let passed = 0;
let failed = 0;

function check(cond: boolean, name: string, detail?: string) {
  if (cond) {
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${name}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

function buildDeterministicSeries(n = 260): Candle[] {
  const tfMs = 3_600_000;
  const startMs = Date.now() - (n + 10) * tfMs;
  const out: Candle[] = [];
  let prevClose = 1000;

  for (let i = 0; i < n; i++) {
    // Mix uptrend, pullback, downtrend, and range waves so swings, BOS, CHoCH, OB, FVG all trigger naturally
    const wave = Math.sin(i * 0.22) * 35 + Math.cos(i * 0.07) * 25;
    const drift = i < 140 ? 1.1 : i < 210 ? -0.9 : 0.4;
    const target = 1000 + wave + i * drift * 0.45;
    const open = prevClose;
    const close = Number(target.toFixed(2));
    const spread = Math.max(4, Math.abs(close - open) * 0.6 + 6);
    const high = Number((Math.max(open, close) + spread * 0.6).toFixed(2));
    const low = Number((Math.min(open, close) - spread * 0.55).toFixed(2));
    const vol = Math.round(12_000 + (i % 7 === 0 ? 28_000 : (i % 5) * 3_200) + Math.abs(close - open) * 400);

    out.push({
      openTime: startMs + i * tfMs,
      open,
      high,
      low,
      close,
      volume: vol,
    });
    prevClose = close;
  }
  return out;
}

console.log('\n======================================================================');
console.log('MI007 PLATFORM VALIDATION SUITE (SMC, MTF, BACKTEST, AI, RELIABILITY)');
console.log('======================================================================\n');

const candles = buildDeterministicSeries(260);

// 1. SMC Calculation Accuracy & New Modules
console.log('── [1] SMC Engine Accuracy & Structure Coverage ──');
const smc = calculateSMC(candles, { enabled: true }, 'RELIANCE', '1H');
check(smc.swings.length > 0, 'Detects swings (HH/HL/LH/LL)');
check((smc.internalSwings?.length ?? 0) > 0 && (smc.externalSwings?.length ?? 0) > 0, 'Separates Internal vs External swings');
check(smc.structureBreaks.length > 0, 'Detects BOS / CHoCH / MSS structure breaks');
check(Array.isArray(smc.mitigationBlocks), 'Exposes Mitigation Blocks array');
check(Array.isArray(smc.supplyDemandZones), 'Exposes Supply & Demand Zones array');
check(smc.dealingRange.highPrice >= smc.equilibriumPrice && smc.equilibriumPrice >= smc.dealingRange.lowPrice, 'Equilibrium (50%) sits strictly within Dealing Range');

// 2. Zero-Repainting & Historical Signal Consistency
console.log('\n── [2] Zero-Repainting & Walk-Forward Consistency ──');
const cutoff = 180;
const partialCandles = candles.slice(0, cutoff);
const smcPartial = calculateSMC(partialCandles, { enabled: true }, 'RELIANCE', '1H');
const fullBreaksBeforeCutoff = smc.structureBreaks.filter((b) => b.candleIndex < cutoff - 5);
const partialBreaksBeforeCutoff = smcPartial.structureBreaks.filter((b) => b.candleIndex < cutoff - 5);
const allBreaksPreserved = partialBreaksBeforeCutoff.every((pb) =>
  fullBreaksBeforeCutoff.some(
    (fb) => fb.candleIndex === pb.candleIndex && fb.isBullish === pb.isBullish && fb.type === pb.type
  )
);
check(allBreaksPreserved, 'Zero-repainting: confirmed structure breaks in partial slice remain immutable in full slice');

// Duplicate break detection
const breakKeys = new Set(smc.structureBreaks.map((b) => `${b.candleIndex}-${b.isBullish}-${b.type}-${b.structureType}`));
check(breakKeys.size === smc.structureBreaks.length, 'Zero duplicate structure break signals');

// 3. Indicator Calculation Accuracy
console.log('\n── [3] Technical Indicator Accuracy ──');
const rsi = calculateRSI(candles, 14).filter((v): v is number => v !== null);
const ema20 = calculateEMA(candles, 20);
const sma50 = calculateSMA(candles, 50);
const macd = calculateMACD(candles, 12, 26, 9);
const bb = calculateBollinger(candles, 20, 2);
check(rsi.length > 0 && rsi.every((v) => v >= 0 && v <= 100), 'RSI(14) strictly bounded in [0, 100]');
check(ema20.length === candles.length && sma50.length === candles.length, 'EMA(20) and SMA(50) series align with candle count');
check(macd.macd.length === candles.length && macd.signal.length === candles.length, 'MACD(12,26,9) series align with candle count');
check(
  bb.upper.every((u, idx) => u === null || (u >= bb.middle[idx]! && bb.middle[idx]! >= bb.lower[idx]!)),
  'Bollinger Bands maintain Upper >= Middle >= Lower'
);

// 4. Multi-Timeframe Consistency
console.log('\n── [4] Multi-Timeframe SMC Consistency ──');
const htf = resampleCandlesToHtf(candles, 4);
check(htf.length === Math.floor(candles.length / 4), 'HTF resampler produces exact expected bar count');
check(htf.every((b) => b.high >= Math.max(b.open, b.close) && b.low <= Math.min(b.open, b.close)), 'Resampled HTF bars satisfy strict OHLC invariants');
const mtf = analyzeMultiTimeframeSmc(candles, { symbol: 'RELIANCE', timeframe: '1H', baseSmc: smc });
check(['ALIGNED_BULLISH', 'ALIGNED_BEARISH', 'CONFLICTING', 'NEUTRAL'].includes(mtf.alignment), `MTF alignment valid (${mtf.alignment})`);

// 5. Backtesting & Strategy Ranking
console.log('\n── [5] Backtesting Engine & Cost Accounting ──');
const btZeroCost = runMi007Backtest(candles, {
  symbol: 'RELIANCE',
  timeframe: '1H',
  strategyId: 'SMC_OB_FVG',
  targetRR: 2.5,
  brokerageBps: 0,
  slippageBps: 0,
  transactionCostBps: 0,
});
const btWithCost = runMi007Backtest(candles, {
  symbol: 'RELIANCE',
  timeframe: '1H',
  strategyId: 'SMC_OB_FVG',
  targetRR: 2.5,
  brokerageBps: 10,
  slippageBps: 10,
  transactionCostBps: 5,
});
check(btWithCost.finalCapital <= btZeroCost.finalCapital + 0.01, 'Brokerage + slippage + transaction costs strictly reduce or equal final equity');
check(btWithCost.winRate + btWithCost.lossRate <= 100.01 && btWithCost.maxDrawdownPct >= 0, 'Win/Loss rates and Max Drawdown mathematically valid');
check(btWithCost.conditionBreakdown.length === 3, 'Performance breakdown covers TRENDING_UP, TRENDING_DOWN, RANGING');

const cmp = compareMi007Strategies(candles, { symbol: 'RELIANCE', timeframe: '1H', targetRR: 2.5 });
check(cmp.rankings.length === 4 && cmp.rankings[0].rank === 1, 'Strategy comparison ranks all 4 strategies cleanly');

// 6. AI Market Intelligence & Calibrated Confidence
console.log('\n── [6] AI Market Intelligence & Calibrated Confidence ──');
const t0 = performance.now();
const intel = generateMi007Intelligence(candles, { symbol: 'RELIANCE', timeframe: '1H' });
const elapsedMs = performance.now() - t0;
check(intel !== null, 'Generates structured MI-007 Intelligence report');
if (intel) {
  check(['BULLISH', 'BEARISH', 'NEUTRAL'].includes(intel.marketDirection), `Market Direction valid (${intel.marketDirection})`);
  check(intel.target1 > 0 && intel.target2 > 0 && intel.target3 > 0, 'TP1, TP2, TP3 are strictly positive');
  check(intel.confidence.calibratedScore >= 0 && intel.confidence.calibratedScore <= 100, `Calibrated confidence in [0,100] (${intel.confidence.calibratedScore}%)`);
  check(intel.supportingEvidence.length >= 5, `Provides multi-factor supporting evidence (${intel.supportingEvidence.length} items)`);
  check(intel.invalidatingConditions.length >= 1, `Provides explicit invalidating conditions (${intel.invalidatingConditions.length} items)`);
}
check(elapsedMs < 1500, `Performance & latency within budget (${elapsedMs.toFixed(1)}ms < 1500ms)`);

// 7. Data Integrity & Edge-Case Handling
console.log('\n── [7] Data Integrity & Missing/Flat Candle Handling ──');
const flatCandles: Candle[] = Array.from({ length: 40 }, (_, i) => ({
  openTime: 1_700_000_000_000 + i * 86_400_000,
  open: 100,
  high: 100,
  low: 100,
  close: 100,
  volume: 0,
}));
const flatSmc = calculateSMC(flatCandles, { enabled: true }, 'FLAT', '1H');
check(flatSmc.swings.length === 0, 'Flat zero-volume candles produce 0 phantom swings');
check(generateMi007Intelligence(candles.slice(0, 10), { symbol: 'SHORT', timeframe: '1H' }) === null, 'Safely rejects insufficient candle history (< 30 bars)');

console.log('\n======================================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================================\n');

if (failed > 0) process.exit(1);
