import { Candle } from '../types';
import {
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateSMA,
  calculateBollinger,
} from '../indicators';
import {
  computeAtrSeries,
  inferCandleIntervalMs,
  isCandleClosed,
  timeframeToMs,
} from '../smcEngine';
import { analyzeMi007Strategy } from './mi007Engine';
import { analyzeMultiTimeframeSmc, MtfStructureSummary } from './mtfSmc';
import { Mi007AnalysisResult } from './types';

export interface IndicatorSnapshot {
  rsi14: number | null;
  rsiState: 'OVERSOLD' | 'OVERBOUGHT' | 'BULLISH_MOMENTUM' | 'BEARISH_MOMENTUM' | 'NEUTRAL';
  ema20: number | null;
  ema50: number | null;
  sma200: number | null;
  maTrend: 'BULLISH_STACK' | 'BEARISH_STACK' | 'MIXED';
  macdLine: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  macdState: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  atr14: number;
  atrPct: number;
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH';
  bollingerWidthPct: number | null;
  relativeVolume: number | null;
}

export interface EvidenceItem {
  category: 'SMC' | 'MTF' | 'VOLUME_PROFILE' | 'MOMENTUM' | 'TREND_MA' | 'VOLATILITY' | 'ORDER_FLOW';
  polarity: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  weight: number;
  summary: string;
}

export interface CalibratedConfidence {
  rawScore: number;               // 0..100 structural + technical score
  calibratedScore: number;        // 0..100 statistically calibrated probability-adjusted score
  historicalSampleSize: number;   // setups observed in smc.setupHistory
  empiricalWinRatePct: number | null;
  bayesianWinRatePct: number;     // shrunk toward 50% prior
  calibrationNote: string;
}

export interface Mi007IntelligenceReport {
  symbol: string;
  timeframe: string;
  generatedAt: number;
  lastClosedPrice: number;
  marketDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  entryZone: [number, number];
  entryMid: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward1: number;
  riskReward2: number;
  riskReward3: number;
  confidence: CalibratedConfidence;
  supportingEvidence: EvidenceItem[];
  invalidatingConditions: string[];
  indicators: IndicatorSnapshot;
  mtf: MtfStructureSummary;
  mi007: Mi007AnalysisResult;
}

function roundPrice(p: number): number {
  if (!Number.isFinite(p)) return 0;
  if (p >= 1000) return Number(p.toFixed(2));
  if (p >= 10) return Number(p.toFixed(3));
  return Number(p.toFixed(4));
}

function lastValid(arr: Array<number | null>): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== null && Number.isFinite(v)) return v;
  }
  return null;
}

/**
 * Compute statistically calibrated confidence using Bayesian Beta-Binomial shrinkage
 * against the symbol's own unbiased `smc.setupHistory` (including stopped-out & expired setups).
 * Prior = 50% (alpha0 = 5, beta0 = 5, k = 10 pseudo-observations).
 */
function calibrateConfidence(
  rawScore: number,
  setupHistory: Mi007AnalysisResult['smc']['setupHistory']
): CalibratedConfidence {
  const isWin = (s: NonNullable<Mi007AnalysisResult['smc']['setupHistory']>[number]) =>
    s.status === 'TARGET_HIT';

  const closedOutcomes = (setupHistory ?? []).filter(
    (s) => isWin(s) || s.signalState === 'INVALIDATED' || s.signalState === 'EXPIRED'
  );
  const n = closedOutcomes.length;
  const wins = closedOutcomes.filter(isWin).length;
  const empiricalWinRatePct = n > 0 ? Number(((wins / n) * 100).toFixed(1)) : null;

  // Bayesian posterior mean with Beta(5, 5) prior
  const posteriorWinProb = (wins + 5) / (n + 10);
  const bayesianWinRatePct = Number((posteriorWinProb * 100).toFixed(1));

  // Blend structural rawScore (65%) with calibrated empirical posterior (35%) when n >= 3
  const calibrated =
    n >= 3
      ? Math.round(rawScore * 0.65 + bayesianWinRatePct * 0.35)
      : Math.round(rawScore * 0.85 + 50 * 0.15);

  const clamped = Math.max(0, Math.min(100, calibrated));
  const calibrationNote =
    n >= 3
      ? `Calibrated via Beta(5,5) shrinkage on ${n} historical closed setups (${wins} wins, ${empiricalWinRatePct}% empirical win rate → ${bayesianWinRatePct}% posterior).`
      : `Prior-regularized (${n} closed historical setups; shrunk toward 50% baseline to prevent small-sample overfitting).`;

  return {
    rawScore: Math.max(0, Math.min(100, Math.round(rawScore))),
    calibratedScore: clamped,
    historicalSampleSize: n,
    empiricalWinRatePct,
    bayesianWinRatePct,
    calibrationNote,
  };
}

/**
 * Generate a full AI-driven Market Intelligence Report combining:
 * - Market Structure & Multi-Timeframe Analysis
 * - Smart Money Concepts (OB, FVG, IFVG, Breaker, Mitigation, Supply/Demand, Liquidity)
 * - Volume Profile & Order Flow
 * - RSI, EMA(20/50), SMA(200), MACD(12,26,9), ATR Volatility, Bollinger Bands
 * - Calibrated Confidence, Supporting Evidence, and Invalidating Conditions
 */
export function generateMi007Intelligence(
  candles: Candle[],
  options: {
    symbol?: string;
    timeframe?: string;
    htfCandles?: Candle[];
  } = {}
): Mi007IntelligenceReport | null {
  if (!candles || candles.length < 30) return null;

  const symbol = options.symbol || 'UNKNOWN';
  const timeframe = options.timeframe || '1D';
  const tfMs = options.timeframe ? timeframeToMs(options.timeframe) : inferCandleIntervalMs(candles);
  const nowMs = Date.now();
  const closed = candles.filter((c) => isCandleClosed(c, tfMs, nowMs));
  if (closed.length < 25) return null;

  const mi007 = analyzeMi007Strategy(closed, {
    symbol,
    timeframe,
    htfCandles: options.htfCandles,
  });
  if (!mi007) return null;

  const mtf = analyzeMultiTimeframeSmc(closed, {
    symbol,
    timeframe,
    htfCandles: options.htfCandles,
    baseSmc: mi007.smc,
  });

  // Technical Indicators on closed bars
  const rsiArr = calculateRSI(closed, 14);
  const ema20Arr = calculateEMA(closed, 20);
  const ema50Arr = calculateEMA(closed, 50);
  const sma200Arr = calculateSMA(closed, 200);
  const macdRes = calculateMACD(closed, 12, 26, 9);
  const bbRes = calculateBollinger(closed, 20, 2);
  const atrSeries = computeAtrSeries(closed, 14);

  const lastIdx = closed.length - 1;
  const lastPrice = closed[lastIdx].close;
  const rsi14 = lastValid(rsiArr);
  const ema20 = lastValid(ema20Arr);
  const ema50 = lastValid(ema50Arr);
  const sma200 = lastValid(sma200Arr);
  const macdLine = lastValid(macdRes.macd);
  const macdSignal = lastValid(macdRes.signal);
  const macdHistogram = lastValid(macdRes.histogram);
  const bbUpper = lastValid(bbRes.upper);
  const bbLower = lastValid(bbRes.lower);
  const bbMid = lastValid(bbRes.middle);
  const atr14 = atrSeries[lastIdx] ?? Math.max(1e-6, lastPrice * 0.01);
  const atrPct = Number(((atr14 / Math.max(1e-9, lastPrice)) * 100).toFixed(2));

  const rsiState: IndicatorSnapshot['rsiState'] =
    rsi14 === null
      ? 'NEUTRAL'
      : rsi14 <= 30
      ? 'OVERSOLD'
      : rsi14 >= 70
      ? 'OVERBOUGHT'
      : rsi14 >= 55
      ? 'BULLISH_MOMENTUM'
      : rsi14 <= 45
      ? 'BEARISH_MOMENTUM'
      : 'NEUTRAL';

  let maTrend: IndicatorSnapshot['maTrend'] = 'MIXED';
  if (ema20 !== null && ema50 !== null) {
    if (lastPrice > ema20 && ema20 > ema50 && (sma200 === null || ema50 >= sma200)) {
      maTrend = 'BULLISH_STACK';
    } else if (lastPrice < ema20 && ema20 < ema50 && (sma200 === null || ema50 <= sma200)) {
      maTrend = 'BEARISH_STACK';
    }
  }

  let macdState: IndicatorSnapshot['macdState'] = 'NEUTRAL';
  if (macdLine !== null && macdSignal !== null && macdHistogram !== null) {
    const prevHist = macdRes.histogram[lastIdx - 1];
    if (prevHist !== null && prevHist <= 0 && macdHistogram > 0) macdState = 'BULLISH_CROSS';
    else if (prevHist !== null && prevHist >= 0 && macdHistogram < 0) macdState = 'BEARISH_CROSS';
    else if (macdHistogram > 0) macdState = 'BULLISH';
    else if (macdHistogram < 0) macdState = 'BEARISH';
  }

  const bollingerWidthPct =
    bbUpper !== null && bbLower !== null && bbMid !== null && bbMid > 0
      ? Number((((bbUpper - bbLower) / bbMid) * 100).toFixed(2))
      : null;

  // Relative volume (20-bar trailing)
  let relVolSum = 0;
  let relVolCnt = 0;
  for (let k = Math.max(0, lastIdx - 20); k < lastIdx; k++) {
    if (closed[k].volume > 0) {
      relVolSum += closed[k].volume;
      relVolCnt++;
    }
  }
  const avgVol = relVolCnt > 0 ? relVolSum / relVolCnt : 0;
  const relativeVolume =
    avgVol > 0 && closed[lastIdx].volume > 0
      ? Number((closed[lastIdx].volume / avgVol).toFixed(2))
      : null;

  const indicators: IndicatorSnapshot = {
    rsi14: rsi14 !== null ? Number(rsi14.toFixed(2)) : null,
    rsiState,
    ema20: ema20 !== null ? roundPrice(ema20) : null,
    ema50: ema50 !== null ? roundPrice(ema50) : null,
    sma200: sma200 !== null ? roundPrice(sma200) : null,
    maTrend,
    macdLine: macdLine !== null ? Number(macdLine.toFixed(4)) : null,
    macdSignal: macdSignal !== null ? Number(macdSignal.toFixed(4)) : null,
    macdHistogram: macdHistogram !== null ? Number(macdHistogram.toFixed(4)) : null,
    macdState,
    atr14: roundPrice(atr14),
    atrPct,
    volatilityRegime: mi007.regime.volatility,
    bollingerWidthPct,
    relativeVolume,
  };

  // Build Supporting Evidence
  const evidence: EvidenceItem[] = [];
  const active = mi007.activeSetup;

  evidence.push({
    category: 'MTF',
    polarity:
      mtf.alignment === 'ALIGNED_BULLISH'
        ? 'BULLISH'
        : mtf.alignment === 'ALIGNED_BEARISH'
        ? 'BEARISH'
        : 'NEUTRAL',
    weight: 15,
    summary: `HTF (${mtf.htfTimeframe}) is ${mtf.htfBias}, LTF (${mtf.baseTimeframe}) is ${mtf.ltfBias} (${mtf.alignment}). Price is in HTF ${mtf.htfPremiumDiscount}.`,
  });

  if (active?.supportingOb) {
    evidence.push({
      category: 'SMC',
      polarity: active.supportingOb.isBullish ? 'BULLISH' : 'BEARISH',
      weight: 20,
      summary: `${active.supportingOb.label} at ${roundPrice(active.supportingOb.bottomPrice)}–${roundPrice(active.supportingOb.topPrice)} (${active.supportingOb.mitigationState ?? 'FRESH'}).`,
    });
  }
  if (active?.supportingFvg) {
    evidence.push({
      category: 'SMC',
      polarity: active.supportingFvg.isBullish ? 'BULLISH' : 'BEARISH',
      weight: 10,
      summary: `${active.supportingFvg.isInverse ? 'Inverse FVG' : 'Fair Value Gap'} at ${roundPrice(active.supportingFvg.bottomPrice)}–${roundPrice(active.supportingFvg.topPrice)}.`,
    });
  }
  if (active?.supportingSweep) {
    evidence.push({
      category: 'SMC',
      polarity: active.supportingSweep.isHighSweep ? 'BEARISH' : 'BULLISH',
      weight: 15,
      summary: `Liquidity sweep detected (${active.supportingSweep.label}) at ${roundPrice(active.supportingSweep.price)}.`,
    });
  }

  evidence.push({
    category: 'VOLUME_PROFILE',
    polarity:
      lastPrice >= mi007.volumeProfile.fixedRange.poc ? 'BULLISH' : 'BEARISH',
    weight: 15,
    summary: `Volume Profile (${mi007.volumeProfile.volumeQuality}): POC=${roundPrice(mi007.volumeProfile.fixedRange.poc)}, VAH=${roundPrice(mi007.volumeProfile.fixedRange.vah)}, VAL=${roundPrice(mi007.volumeProfile.fixedRange.val)}.`,
  });

  evidence.push({
    category: 'TREND_MA',
    polarity:
      maTrend === 'BULLISH_STACK' ? 'BULLISH' : maTrend === 'BEARISH_STACK' ? 'BEARISH' : 'NEUTRAL',
    weight: 10,
    summary: `Moving Averages (${maTrend}): EMA20=${indicators.ema20 ?? '—'}, EMA50=${indicators.ema50 ?? '—'}, SMA200=${indicators.sma200 ?? '—'}.`,
  });

  evidence.push({
    category: 'MOMENTUM',
    polarity:
      macdState.startsWith('BULLISH') || rsiState === 'BULLISH_MOMENTUM' || rsiState === 'OVERSOLD'
        ? 'BULLISH'
        : macdState.startsWith('BEARISH') || rsiState === 'BEARISH_MOMENTUM' || rsiState === 'OVERBOUGHT'
        ? 'BEARISH'
        : 'NEUTRAL',
    weight: 10,
    summary: `RSI(14)=${indicators.rsi14 ?? '—'} (${rsiState}), MACD=${macdState}${relativeVolume ? `, RelVol=${relativeVolume}x` : ''}.`,
  });

  evidence.push({
    category: 'VOLATILITY',
    polarity: 'NEUTRAL',
    weight: 5,
    summary: `ATR(14)=${indicators.atr14} (${atrPct}% of price, ${indicators.volatilityRegime} volatility)${bollingerWidthPct !== null ? `, BB Width=${bollingerWidthPct}%` : ''}.`,
  });

  // Determine Market Direction & Entry/SL/TP1/TP2/TP3
  const bullVotes = evidence.filter((e) => e.polarity === 'BULLISH').reduce((s, e) => s + e.weight, 0);
  const bearVotes = evidence.filter((e) => e.polarity === 'BEARISH').reduce((s, e) => s + e.weight, 0);

  let marketDirection: Mi007IntelligenceReport['marketDirection'] = 'NEUTRAL';
  if (active && active.isTradeable) {
    marketDirection = active.direction;
  } else if (bullVotes - bearVotes >= 20) {
    marketDirection = 'BULLISH';
  } else if (bearVotes - bullVotes >= 20) {
    marketDirection = 'BEARISH';
  }

  const entryMid = active ? roundPrice(active.entryPrice) : roundPrice(lastPrice);
  const entryZone: [number, number] = active?.supportingOb
    ? [roundPrice(active.supportingOb.bottomPrice), roundPrice(active.supportingOb.topPrice)]
    : [roundPrice(entryMid - atr14 * 0.25), roundPrice(entryMid + atr14 * 0.25)];

  const isBullDir = marketDirection !== 'BEARISH';
  const stopLoss = active
    ? roundPrice(active.stopLoss)
    : roundPrice(isBullDir ? Math.max(0.0001, entryMid - atr14 * 1.5) : entryMid + atr14 * 1.5);

  const riskDist = Math.max(1e-6, Math.abs(entryMid - stopLoss));
  const target1 = active ? roundPrice(active.target1) : roundPrice(isBullDir ? entryMid + riskDist * 2.0 : Math.max(0.0001, entryMid - riskDist * 2.0));
  const target2 = active ? roundPrice(active.target2) : roundPrice(isBullDir ? entryMid + riskDist * 3.0 : Math.max(0.0001, entryMid - riskDist * 3.0));
  const target3 = active ? roundPrice(active.target3) : roundPrice(isBullDir ? entryMid + riskDist * 4.0 : Math.max(0.0001, entryMid - riskDist * 4.0));

  const rr1 = Number((Math.abs(target1 - entryMid) / riskDist).toFixed(2));
  const rr2 = Number((Math.abs(target2 - entryMid) / riskDist).toFixed(2));
  const rr3 = Number((Math.abs(target3 - entryMid) / riskDist).toFixed(2));

  // Invalidating Conditions
  const invalidatingConditions: string[] = [];
  if (marketDirection === 'BULLISH') {
    invalidatingConditions.push(
      `Candle close below Stop Loss (${stopLoss}) invalidates the bullish setup and flips near-term bias.`
    );
    if (mtf.htfBias === 'BEARISH') {
      invalidatingConditions.push(
        `Caution: Higher Timeframe (${mtf.htfTimeframe}) remains BEARISH — failure to reclaim HTF equilibrium (${mtf.htfEquilibriumPrice}) weakens upside.`
      );
    }
    if (rsi14 !== null && rsi14 >= 75) {
      invalidatingConditions.push(`RSI(14) is overbought (${indicators.rsi14}) — avoid chasing above ${entryZone[1]}.`);
    }
  } else if (marketDirection === 'BEARISH') {
    invalidatingConditions.push(
      `Candle close above Stop Loss (${stopLoss}) invalidates the bearish setup and signals structural recovery.`
    );
    if (mtf.htfBias === 'BULLISH') {
      invalidatingConditions.push(
        `Caution: Higher Timeframe (${mtf.htfTimeframe}) remains BULLISH — strong demand near ${mi007.volumeProfile.fixedRange.val} may absorb selling.`
      );
    }
    if (rsi14 !== null && rsi14 <= 25) {
      invalidatingConditions.push(`RSI(14) is oversold (${indicators.rsi14}) — short-covering bounce risk below ${entryZone[0]}.`);
    }
  } else {
    invalidatingConditions.push(
      `Market is NEUTRAL / RANGING between ${roundPrice(mi007.smc.dealingRange.lowPrice)} and ${roundPrice(mi007.smc.dealingRange.highPrice)}. Wait for a confirmed BOS/CHoCH outside range.`
    );
  }

  if (mi007.volumeProfile.volumeQuality === 'ESTIMATED') {
    invalidatingConditions.push(
      `Volume feed is ESTIMATED — institutional Volume Profile execution gate is locked (Indicative Only).`
    );
  }

  // Raw score blends MI-007 structural score + indicator alignment bonus
  const baseScore = active?.score ?? 45;
  const indicatorBonus =
    (marketDirection === 'BULLISH' && maTrend === 'BULLISH_STACK' ? 5 : 0) +
    (marketDirection === 'BEARISH' && maTrend === 'BEARISH_STACK' ? 5 : 0) +
    (marketDirection === 'BULLISH' && macdState.startsWith('BULLISH') ? 5 : 0) +
    (marketDirection === 'BEARISH' && macdState.startsWith('BEARISH') ? 5 : 0) +
    (mtf.alignment === `ALIGNED_${marketDirection}` ? 5 : mtf.alignment === 'CONFLICTING' ? -8 : 0);

  const confidence = calibrateConfidence(baseScore + indicatorBonus, mi007.smc.setupHistory);

  return {
    symbol,
    timeframe,
    generatedAt: nowMs,
    lastClosedPrice: roundPrice(lastPrice),
    marketDirection,
    entryZone,
    entryMid,
    stopLoss,
    target1,
    target2,
    target3,
    riskReward1: rr1,
    riskReward2: rr2,
    riskReward3: rr3,
    confidence,
    supportingEvidence: evidence,
    invalidatingConditions,
    indicators,
    mtf,
    mi007,
  };
}
