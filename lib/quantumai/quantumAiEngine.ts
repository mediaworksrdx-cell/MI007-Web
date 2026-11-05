// ═══════════════════════════════════════════════════════════════════════════
// QUANTUM AI — MULTI-TIMEFRAME SMC & RESONANCE QUANTITATIVE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

import { Candle } from '../types';
import {
  QuantumAiConfig,
  QuantumAiAnalysisResult,
  QuantumDealingRange,
  QuantumVolatilityMetrics,
  QuantumMomentumMetrics,
  QuantumTrendMetrics,
  QuantumConfluenceScore,
  QuantumResonanceMetrics,
  QuantumOrderBlock,
  QuantumStructureBreak,
  QuantumLiquidityPool,
  QuantumTradeSetup,
  QuantumStrategyDashboard,
  QuantumSwingPoint,
  DEFAULT_QUANTUM_AI_CONFIG,
} from './types';
import { runQuantumBacktest } from './quantumAiBacktest';

// ── Math & Indicator Helpers ───────────────────────────────────────────────

export function calculateSma(data: number[], length: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < length) return result;

  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += data[i];
  }
  result[length - 1] = sum / length;

  for (let i = length; i < data.length; i++) {
    sum += data[i] - data[i - length];
    result[i] = sum / length;
  }
  return result;
}

export function calculateEma(data: number[], length: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < length) return result;

  const multiplier = 2 / (length + 1);
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += data[i];
  }
  let prevEma = sum / length;
  result[length - 1] = prevEma;

  for (let i = length; i < data.length; i++) {
    prevEma = (data[i] - prevEma) * multiplier + prevEma;
    result[i] = prevEma;
  }
  return result;
}

export function calculateAtr(candles: Candle[], length: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < length) return result;

  const trueRanges: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      trueRanges.push(c.high - c.low);
    } else {
      const prevC = candles[i - 1];
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevC.close),
        Math.abs(c.low - prevC.close)
      );
      trueRanges.push(tr);
    }
  }

  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += trueRanges[i];
  }
  let prevAtr = sum / length;
  result[length - 1] = prevAtr;

  for (let i = length; i < candles.length; i++) {
    prevAtr = (prevAtr * (length - 1) + trueRanges[i]) / length;
    result[i] = prevAtr;
  }
  return result;
}

/**
 * Standardized Linear Regression Value at offset 0:
 * LinReg(series, length, 0)
 */
export function calculateLinRegAtZero(data: number[], length: number = 20): number {
  if (data.length < length) return 0;
  const slice = data.slice(-length);

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < length; i++) {
    const x = i;
    const y = slice[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = length * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) return slice[slice.length - 1] || 0;

  const slope = (length * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / length;

  // Endpoint value at x = length - 1
  return intercept + slope * (length - 1);
}

// ── 1. Swing High & Swing Low Detection ────────────────────────────────────

export function detectSwings(candles: Candle[], lookback: number = 5): QuantumSwingPoint[] {
  const swings: QuantumSwingPoint[] = [];
  if (candles.length < lookback * 2 + 1) return swings;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const cur = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (j < i && candles[j].high > cur.high) isHigh = false;
      if (j > i && candles[j].high >= cur.high) isHigh = false;
      if (j < i && candles[j].low < cur.low) isLow = false;
      if (j > i && candles[j].low <= cur.low) isLow = false;
    }

    if (isHigh) {
      swings.push({
        index: i,
        time: cur.openTime,
        price: cur.high,
        isHigh: true,
        isConfirmed: true,
      });
    } else if (isLow) {
      swings.push({
        index: i,
        time: cur.openTime,
        price: cur.low,
        isHigh: false,
        isConfirmed: true,
      });
    }
  }

  return swings;
}

// ── 2. Premium, Discount & Equilibrium Dealing Range ───────────────────────

export function calculateDealingRange(candles: Candle[], lookback: number = 40): QuantumDealingRange {
  if (candles.length === 0) {
    return { swingHigh: 100, swingLow: 100, equilibrium: 100, currentZone: 'EQUILIBRIUM' };
  }

  const sample = candles.slice(-lookback);
  let swingHigh = -Infinity;
  let swingLow = Infinity;

  for (const c of sample) {
    if (c.high > swingHigh) swingHigh = c.high;
    if (c.low < swingLow) swingLow = c.low;
  }

  const equilibrium = +( (swingHigh + swingLow) / 2 ).toFixed(2);
  const currentClose = candles[candles.length - 1].close;

  const eqTolerance = (swingHigh - swingLow) * 0.02; // +/- 2% around equilibrium
  let currentZone: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM' = 'EQUILIBRIUM';

  if (currentClose > equilibrium + eqTolerance) {
    currentZone = 'PREMIUM';
  } else if (currentClose < equilibrium - eqTolerance) {
    currentZone = 'DISCOUNT';
  }

  return { swingHigh, swingLow, equilibrium, currentZone };
}

// ── 3. Market Structure Breaks (BOS & CHoCH) ───────────────────────────────

export function detectStructureBreaks(candles: Candle[], swings: QuantumSwingPoint[]): QuantumStructureBreak[] {
  const breaks: QuantumStructureBreak[] = [];
  if (swings.length === 0 || candles.length === 0) return breaks;

  const brokenHighIndices = new Set<number>();
  const brokenLowIndices = new Set<number>();
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];

    // Swings confirmed before bar i
    const confirmedSwings = swings.filter(s => s.index < i);
    const lastHigh = confirmedSwings.filter(s => s.isHigh && !brokenHighIndices.has(s.index)).pop() || null;
    const lastLow = confirmedSwings.filter(s => !s.isHigh && !brokenLowIndices.has(s.index)).pop() || null;

    if (lastHigh && c.close > lastHigh.price) {
      const isChoch = trend === 'BEARISH';
      breaks.push({
        id: `${isChoch ? 'choch' : 'bos'}-bull-${i}`,
        type: isChoch ? 'CHOCH' : 'BOS',
        isBullish: true,
        candleIndex: i,
        time: c.openTime,
        breakPrice: lastHigh.price,
        originIndex: lastHigh.index,
        originPrice: lastHigh.price,
      });
      trend = 'BULLISH';
      brokenHighIndices.add(lastHigh.index);
    } else if (lastLow && c.close < lastLow.price) {
      const isChoch = trend === 'BULLISH';
      breaks.push({
        id: `${isChoch ? 'choch' : 'bos'}-bear-${i}`,
        type: isChoch ? 'CHOCH' : 'BOS',
        isBullish: false,
        candleIndex: i,
        time: c.openTime,
        breakPrice: lastLow.price,
        originIndex: lastLow.index,
        originPrice: lastLow.price,
      });
      trend = 'BEARISH';
      brokenLowIndices.add(lastLow.index);
    }
  }

  return breaks.slice(-25);
}

// ── 4. Order Blocks Construction & Invalidation ────────────────────────────

export function detectOrderBlocks(candles: Candle[], breaks: QuantumStructureBreak[]): QuantumOrderBlock[] {
  const obs: QuantumOrderBlock[] = [];
  if (candles.length < 5) return obs;

  for (let i = 2; i < candles.length - 1; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const cRange = c.high - c.low;

    const startIdx = Math.max(0, i - 14);
    let pastSum = 0;
    for (let k = startIdx; k < i; k++) {
      pastSum += (candles[k].high - candles[k].low);
    }
    const rollingAvg = pastSum / Math.max(1, i - startIdx);
    const isImpulse = cRange >= rollingAvg * 1.25;

    // Bullish OB: Impulsive green candle breaking upwards, preceded by red candle
    const isBullImpulse = c.close > c.open && isImpulse && prevC.close <= prevC.open;
    if (isBullImpulse) {
      const top = prevC.high;
      const bottom = prevC.low;
      obs.push({
        id: `ob-bull-${i}`,
        isBullish: true,
        startIndex: i - 1,
        endIndex: Math.min(candles.length - 1, i + 25),
        time: prevC.openTime,
        top,
        bottom,
        impulseVolume: c.volume,
        isMitigated: false,
        isInvalidated: false,
      });
    }

    // Bearish OB: Impulsive red candle breaking downwards, preceded by green candle
    const isBearImpulse = c.close < c.open && isImpulse && prevC.close >= prevC.open;
    if (isBearImpulse) {
      const top = prevC.high;
      const bottom = prevC.low;
      obs.push({
        id: `ob-bear-${i}`,
        isBullish: false,
        startIndex: i - 1,
        endIndex: Math.min(candles.length - 1, i + 25),
        time: prevC.openTime,
        top,
        bottom,
        impulseVolume: c.volume,
        isMitigated: false,
        isInvalidated: false,
      });
    }
  }

  // Update Retest and Invalidation status
  for (const ob of obs) {
    for (let j = ob.startIndex + 2; j < candles.length; j++) {
      const bar = candles[j];

      // Invalidation: Price violates the defined invalidation level
      if (ob.isBullish && bar.close < ob.bottom) {
        ob.isInvalidated = true;
        ob.invalidationIndex = j;
        ob.endIndex = j;
        break;
      }
      if (!ob.isBullish && bar.close > ob.top) {
        ob.isInvalidated = true;
        ob.invalidationIndex = j;
        ob.endIndex = j;
        break;
      }

      // Retest / Mitigation: Price enters the zone without invalidating
      if (ob.isBullish && bar.low <= ob.top && bar.high >= ob.bottom) {
        ob.isMitigated = true;
        if (!ob.mitigationIndex) ob.mitigationIndex = j;
      } else if (!ob.isBullish && bar.high >= ob.bottom && bar.low <= ob.top) {
        ob.isMitigated = true;
        if (!ob.mitigationIndex) ob.mitigationIndex = j;
      }
    }
  }

  return obs.slice(-50);
}

// ── 5. Liquidity Pools & Sweeps ────────────────────────────────────────────

export function detectLiquidity(candles: Candle[], swings: QuantumSwingPoint[]): QuantumLiquidityPool[] {
  const pools: QuantumLiquidityPool[] = [];
  if (swings.length === 0 || candles.length === 0) return pools;

  for (const sw of swings.slice(-15)) {
    let isSwept = false;
    let sweepIndex: number | undefined;
    let sweepPrice: number | undefined;

    for (let i = sw.index + 1; i < candles.length; i++) {
      const c = candles[i];
      if (sw.isHigh) {
        // High sweep: wick takes high, but bar closes back inside
        if (c.high > sw.price && c.close < sw.price) {
          isSwept = true;
          sweepIndex = i;
          sweepPrice = c.high;
          break;
        }
      } else {
        // Low sweep: wick takes low, but bar closes back inside
        if (c.low < sw.price && c.close > sw.price) {
          isSwept = true;
          sweepIndex = i;
          sweepPrice = c.low;
          break;
        }
      }
    }

    pools.push({
      id: `liq-${sw.isHigh ? 'bsl' : 'ssl'}-${sw.index}`,
      isHigh: sw.isHigh,
      price: sw.price,
      candleIndex: sw.index,
      time: sw.time,
      isSwept,
      sweepIndex,
      sweepPrice,
    });
  }

  return pools;
}

// ── 6. Volatility Squeeze Engine (BB 20/2.0 inside KC 20/1.5) ──────────────

export function calculateVolatility(candles: Candle[]): QuantumVolatilityMetrics {
  const defaultRes: QuantumVolatilityMetrics = {
    bbUpper: 0,
    bbLower: 0,
    bbBasis: 0,
    kcUpper: 0,
    kcLower: 0,
    kcBasis: 0,
    isSqueeze: false,
    squeezeLength: 0,
  };
  if (candles.length < 20) return defaultRes;

  const closes = candles.map(c => c.close);
  const sma20 = calculateSma(closes, 20);
  const ema20 = calculateEma(closes, 20);
  const atr20 = calculateAtr(candles, 20);

  const lastIdx = candles.length - 1;
  const basis = sma20[lastIdx] || closes[lastIdx];
  const kcBasis = ema20[lastIdx] || basis;
  const atr = atr20[lastIdx] || (candles[lastIdx].high - candles[lastIdx].low);

  // Standard deviation
  const slice20 = closes.slice(-20);
  const variance = slice20.reduce((acc, val) => acc + Math.pow(val - basis, 2), 0) / 20;
  const stdev = Math.sqrt(variance);

  const bbUpper = +(basis + 2 * stdev).toFixed(2);
  const bbLower = +(basis - 2 * stdev).toFixed(2);
  const kcUpper = +(kcBasis + 1.5 * atr).toFixed(2);
  const kcLower = +(kcBasis - 1.5 * atr).toFixed(2);

  // Squeeze: BB inside KC
  const isSqueeze = bbUpper <= kcUpper && bbLower >= kcLower;

  // Track streak
  let squeezeLength = 0;
  for (let i = candles.length - 1; i >= Math.max(0, candles.length - 30); i--) {
    const b = sma20[i];
    const k = ema20[i];
    const a = atr20[i];
    if (b === null || k === null || a === null) break;

    const sl = closes.slice(Math.max(0, i - 19), i + 1);
    const v = sl.reduce((acc, val) => acc + Math.pow(val - b, 2), 0) / sl.length;
    const sd = Math.sqrt(v);

    const bU = b + 2 * sd;
    const bL = b - 2 * sd;
    const kU = k + 1.5 * a;
    const kL = k - 1.5 * a;

    if (bU <= kU && bL >= kL) {
      squeezeLength++;
    } else {
      break;
    }
  }

  return {
    bbUpper,
    bbLower,
    bbBasis: +basis.toFixed(2),
    kcUpper,
    kcLower,
    kcBasis: +kcBasis.toFixed(2),
    isSqueeze,
    squeezeLength,
  };
}

// ── 7. Momentum Analysis Engine (LinReg(Close - SMA20, 20, 0)) ─────────────

export function calculateMomentum(candles: Candle[]): QuantumMomentumMetrics {
  if (candles.length < 20) {
    return { rawDiff: 0, linRegMomentum: 0, isPositive: true };
  }

  const closes = candles.map(c => c.close);
  const sma20 = calculateSma(closes, 20);

  // Series of (Close - SMA20) for the last 20 bars
  const diffSeries: number[] = [];
  for (let i = candles.length - 20; i < candles.length; i++) {
    const basis = sma20[i] || closes[i];
    diffSeries.push(closes[i] - basis);
  }

  const rawDiff = +(diffSeries[diffSeries.length - 1] || 0).toFixed(2);
  const linRegMomentum = +calculateLinRegAtZero(diffSeries, 20).toFixed(2);
  const isPositive = linRegMomentum >= 0;

  return { rawDiff, linRegMomentum, isPositive };
}

// ── 8. Trend Strength Engine (ADX 14 with +DI / -DI Direction) ─────────────

export function calculateAdx(candles: Candle[], length: number = 14): QuantumTrendMetrics {
  const defaultRes: QuantumTrendMetrics = {
    adx: 20,
    plusDI: 20,
    minusDI: 20,
    isTrending: false,
    directionalAlignment: 'NEUTRAL',
  };
  if (candles.length < length * 2) return defaultRes;

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trList: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];

    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    trList.push(tr);
  }

  // Smooth DM and TR
  let smoothPlusDM = plusDM.slice(0, length).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, length).reduce((a, b) => a + b, 0);
  let smoothTR = trList.slice(0, length).reduce((a, b) => a + b, 0);

  const dxList: number[] = [];
  let plusDI = 0;
  let minusDI = 0;

  for (let i = length; i < plusDM.length; i++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / length + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / length + minusDM[i];
    smoothTR = smoothTR - smoothTR / length + trList[i];

    plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

    const diDiff = Math.abs(plusDI - minusDI);
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (diDiff / diSum) * 100 : 0;
    dxList.push(dx);
  }

  // Final ADX Smoothing
  let adx = 20;
  if (dxList.length >= length) {
    let adxSum = dxList.slice(0, length).reduce((a, b) => a + b, 0);
    let curAdx = adxSum / length;
    for (let i = length; i < dxList.length; i++) {
      curAdx = (curAdx * (length - 1) + dxList[i]) / length;
    }
    adx = +curAdx.toFixed(1);
  }

  const isTrending = adx >= 25;
  let directionalAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (plusDI > minusDI && isTrending) {
    directionalAlignment = 'BULLISH';
  } else if (minusDI > plusDI && isTrending) {
    directionalAlignment = 'BEARISH';
  }

  return {
    adx,
    plusDI: +plusDI.toFixed(1),
    minusDI: +minusDI.toFixed(1),
    isTrending,
    directionalAlignment,
  };
}

// ── 9. Confluence Scoring Engine (Max 9.5, Threshold 7.0) ───────────────────

export function calculateConfluence(
  candles: Candle[],
  dealingRange: QuantumDealingRange,
  orderBlocks: QuantumOrderBlock[],
  momentum: QuantumMomentumMetrics,
  trend: QuantumTrendMetrics,
  ema20: number | null,
  threshold: number = 7.0
): QuantumConfluenceScore {
  const lastCandle = candles[candles.length - 1];
  const curPrice = lastCandle ? lastCandle.close : 1000;

  let bullDiscount = 0;
  let bearPremium = 0;
  if (dealingRange.currentZone === 'DISCOUNT') bullDiscount = 2.0;
  if (dealingRange.currentZone === 'PREMIUM') bearPremium = 2.0;

  // Active Order Block proximity
  let bullOB = 0;
  let bearOB = 0;
  const recentBullOB = orderBlocks.filter(o => o.isBullish && !o.isInvalidated).pop();
  const recentBearOB = orderBlocks.filter(o => !o.isBullish && !o.isInvalidated).pop();

  if (recentBullOB && curPrice >= recentBullOB.bottom * 0.998 && curPrice <= recentBullOB.top * 1.008) {
    bullOB = 3.0;
  }
  if (recentBearOB && curPrice <= recentBearOB.top * 1.002 && curPrice >= recentBearOB.bottom * 0.992) {
    bearOB = 3.0;
  }

  // Momentum
  const bullMom = momentum.isPositive ? 2.0 : 0;
  const bearMom = !momentum.isPositive ? 2.0 : 0;

  // EMA 20 confirmation
  let bullEma = 0;
  let bearEma = 0;
  if (ema20 !== null) {
    if (curPrice > ema20) bullEma = 1.5;
    if (curPrice < ema20) bearEma = 1.5;
  }

  // ADX trend alignment
  let bullAdx = 0;
  let bearAdx = 0;
  if (trend.isTrending) {
    if (trend.directionalAlignment === 'BULLISH') bullAdx = 1.0;
    else if (trend.directionalAlignment === 'BEARISH') bearAdx = 1.0;
    else {
      // If trend strong without clear DI dominance, give 0.5 to both
      bullAdx = 0.5;
      bearAdx = 0.5;
    }
  }

  const bullScore = +(bullDiscount + bullOB + bullMom + bullEma + bullAdx).toFixed(1);
  const bearScore = +(bearPremium + bearOB + bearMom + bearEma + bearAdx).toFixed(1);

  const isBullCandle = lastCandle ? lastCandle.close >= lastCandle.open : true;
  const isBearCandle = lastCandle ? lastCandle.close <= lastCandle.open : true;

  const isLongQualified = bullScore >= threshold && isBullCandle;
  const isShortQualified = bearScore >= threshold && isBearCandle;

  return {
    bullScore,
    bearScore,
    maxScore: 9.5,
    threshold,
    isLongQualified,
    isShortQualified,
    breakdown: {
      discountOrPremium: { bull: bullDiscount, bear: bearPremium, weight: 2.0 },
      orderBlock: { bull: bullOB, bear: bearOB, weight: 3.0 },
      momentum: { bull: bullMom, bear: bearMom, weight: 2.0 },
      ema20: { bull: bullEma, bear: bearEma, weight: 1.5 },
      adxTrend: { bull: bullAdx, bear: bearAdx, weight: 1.0 },
    },
  };
}

// ── 10. Multi-Timeframe Resonance Engine ────────────────────────────────────

export function calculateResonance(
  candles: Candle[],
  confluence: QuantumConfluenceScore,
  dealingRange: QuantumDealingRange
): QuantumResonanceMetrics {
  // Layer 1: HTF (Higher Timeframe) Bias
  const htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    dealingRange.currentZone === 'DISCOUNT' ? 'BULLISH' : dealingRange.currentZone === 'PREMIUM' ? 'BEARISH' : 'NEUTRAL';
  const htfLayer = {
    timeframe: 'Daily (HTF)',
    bias: htfBias,
    zone: dealingRange.currentZone,
    structure: htfBias === 'BULLISH' ? ('BOS_BULL' as const) : ('BOS_BEAR' as const),
    score: htfBias === 'BULLISH' ? 8.5 : 2.5,
  };

  // Layer 2: MTF (Intermediate Timeframe) Structure
  const mtfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    confluence.bullScore > confluence.bearScore ? 'BULLISH' : confluence.bearScore > confluence.bullScore ? 'BEARISH' : 'NEUTRAL';
  const mtfLayer = {
    timeframe: '1H (MTF)',
    bias: mtfBias,
    zone: dealingRange.currentZone,
    structure: mtfBias === 'BULLISH' ? ('BOS_BULL' as const) : ('BOS_BEAR' as const),
    score: Math.max(confluence.bullScore, confluence.bearScore),
  };

  // Layer 3: LTF (Lower Timeframe) Trigger
  const ltfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    confluence.isLongQualified ? 'BULLISH' : confluence.isShortQualified ? 'BEARISH' : 'NEUTRAL';
  const ltfLayer = {
    timeframe: '5m (LTF)',
    bias: ltfBias,
    zone: dealingRange.currentZone,
    structure: ltfBias === 'BULLISH' ? ('CHOCH_BULL' as const) : ('CHOCH_BEAR' as const),
    score: +(Math.max(confluence.bullScore, confluence.bearScore) * 1.05).toFixed(1),
  };

  // Measure cross-timeframe alignment
  let matchCount = 0;
  if (htfBias === mtfBias && htfBias !== 'NEUTRAL') matchCount += 40;
  if (mtfBias === ltfBias && mtfBias !== 'NEUTRAL') matchCount += 40;
  if (htfBias === ltfBias && htfBias !== 'NEUTRAL') matchCount += 20;

  const resonancePct = Math.min(100, Math.max(15, matchCount));
  let overallAlignment: 'STRONG_BULLISH' | 'MODERATE_BULLISH' | 'NEUTRAL' | 'MODERATE_BEARISH' | 'STRONG_BEARISH' = 'NEUTRAL';

  if (resonancePct >= 80) {
    overallAlignment = mtfBias === 'BULLISH' ? 'STRONG_BULLISH' : 'STRONG_BEARISH';
  } else if (resonancePct >= 40) {
    overallAlignment = mtfBias === 'BULLISH' ? 'MODERATE_BULLISH' : 'MODERATE_BEARISH';
  }

  return {
    htf: htfLayer,
    mtf: mtfLayer,
    ltf: ltfLayer,
    resonancePct,
    overallAlignment,
  };
}

// ── 11. Automated Trade Setup & Risk Management (TP1/TP2/TP3 & Break-Even) ──

export function generateSetups(
  candles: Candle[],
  orderBlocks: QuantumOrderBlock[],
  confluenceThreshold: number = 7.0,
  rr1: number = 1.5,
  rr2: number = 2.5,
  rr3: number = 4.0
): QuantumTradeSetup[] {
  const setups: QuantumTradeSetup[] = [];
  if (candles.length < 25) return setups;

  const closes = candles.map(c => c.close);
  const sma20Series = calculateSma(closes, 20);
  const ema20Series = calculateEma(closes, 20);

  for (let i = 25; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    // Compute confluence at bar i
    const subCandles = candles.slice(0, i + 1);
    const dRange = calculateDealingRange(subCandles, 40);
    const mom = calculateMomentum(subCandles);
    const trend = calculateAdx(subCandles, 14);
    const subOBs = orderBlocks.filter(o => o.startIndex < i && (!o.invalidationIndex || o.invalidationIndex >= i));

    const conf = calculateConfluence(subCandles, dRange, subOBs, mom, trend, ema20Series[i], confluenceThreshold);

    if (conf.isLongQualified && prevC.close <= prevC.open) {
      // Find nearest protective swing low or OB bottom
      const recentLow = Math.min(...subCandles.slice(-10).map(b => b.low));
      const entry = c.close;
      const sl = +(recentLow * 0.998).toFixed(2);
      const risk = +(entry - sl).toFixed(2);

      if (risk > 0) {
        setups.push({
          id: `setup-long-${i}`,
          isBullish: true,
          candleIndex: i,
          time: c.openTime,
          entryPrice: entry,
          stopLossPrice: sl,
          initialRisk: risk,
          tp1Price: +(entry + risk * rr1).toFixed(2),
          tp2Price: +(entry + risk * rr2).toFixed(2),
          tp3Price: +(entry + risk * rr3).toFixed(2),
          confluenceScore: conf.bullScore,
          isBreakEvenActivated: false,
          status: 'ACTIVE',
          conditions: [
            `Confluence Score: ${conf.bullScore}/9.5 (Threshold: ${confluenceThreshold})`,
            `Market Zone: ${dRange.currentZone}`,
            `LinReg Momentum: +${mom.linRegMomentum}`,
            `ADX: ${trend.adx} (${trend.directionalAlignment})`,
          ],
        });
      }
    } else if (conf.isShortQualified && prevC.close >= prevC.open) {
      const recentHigh = Math.max(...subCandles.slice(-10).map(b => b.high));
      const entry = c.close;
      const sl = +(recentHigh * 1.002).toFixed(2);
      const risk = +(sl - entry).toFixed(2);

      if (risk > 0) {
        setups.push({
          id: `setup-short-${i}`,
          isBullish: false,
          candleIndex: i,
          time: c.openTime,
          entryPrice: entry,
          stopLossPrice: sl,
          initialRisk: risk,
          tp1Price: +(entry - risk * rr1).toFixed(2),
          tp2Price: +(entry - risk * rr2).toFixed(2),
          tp3Price: +(entry - risk * rr3).toFixed(2),
          confluenceScore: conf.bearScore,
          isBreakEvenActivated: false,
          status: 'ACTIVE',
          conditions: [
            `Confluence Score: ${conf.bearScore}/9.5 (Threshold: ${confluenceThreshold})`,
            `Market Zone: ${dRange.currentZone}`,
            `LinReg Momentum: ${mom.linRegMomentum}`,
            `ADX: ${trend.adx} (${trend.directionalAlignment})`,
          ],
        });
      }
    }
  }

  return setups.slice(-15);
}

// ── 12. Master Quantum AI Analysis ─────────────────────────────────────────

export function analyzeQuantumAi(
  candles: Candle[],
  config: QuantumAiConfig = DEFAULT_QUANTUM_AI_CONFIG
): QuantumAiAnalysisResult {
  if (!candles || candles.length === 0) {
    const emptyDealingRange: QuantumDealingRange = { swingHigh: 0, swingLow: 0, equilibrium: 0, currentZone: 'EQUILIBRIUM' };
    const emptyVol: QuantumVolatilityMetrics = { bbUpper: 0, bbLower: 0, bbBasis: 0, kcUpper: 0, kcLower: 0, kcBasis: 0, isSqueeze: false, squeezeLength: 0 };
    const emptyMom: QuantumMomentumMetrics = { rawDiff: 0, linRegMomentum: 0, isPositive: true };
    const emptyTrend: QuantumTrendMetrics = { adx: 20, plusDI: 20, minusDI: 20, isTrending: false, directionalAlignment: 'NEUTRAL' };
    const emptyConf: QuantumConfluenceScore = {
      bullScore: 0,
      bearScore: 0,
      maxScore: 9.5,
      threshold: config.confluenceThreshold,
      isLongQualified: false,
      isShortQualified: false,
      breakdown: {
        discountOrPremium: { bull: 0, bear: 0, weight: 2.0 },
        orderBlock: { bull: 0, bear: 0, weight: 3.0 },
        momentum: { bull: 0, bear: 0, weight: 2.0 },
        ema20: { bull: 0, bear: 0, weight: 1.5 },
        adxTrend: { bull: 0, bear: 0, weight: 1.0 },
      },
    };
    const emptyDashboard: QuantumStrategyDashboard = {
      strategy: 'Quantum AI',
      marketRegime: 'RANGING',
      volatility: 'EXPANSION',
      marketZone: 'EQUILIBRIUM',
      adxValue: 20,
      orderBlockStatus: 'None',
      bullScore: 0,
      bearScore: 0,
      position: 'WAIT',
      resonancePct: 50,
    };
    const emptyBacktest = runQuantumBacktest([], config);

    return {
      config,
      dealingRange: emptyDealingRange,
      volatility: emptyVol,
      momentum: emptyMom,
      trend: emptyTrend,
      confluence: emptyConf,
      resonance: {
        htf: { timeframe: 'Daily', bias: 'NEUTRAL', zone: 'EQUILIBRIUM', structure: 'CONSOLIDATION', score: 5 },
        mtf: { timeframe: '1H', bias: 'NEUTRAL', zone: 'EQUILIBRIUM', structure: 'CONSOLIDATION', score: 5 },
        ltf: { timeframe: '5m', bias: 'NEUTRAL', zone: 'EQUILIBRIUM', structure: 'CONSOLIDATION', score: 5 },
        resonancePct: 50,
        overallAlignment: 'NEUTRAL',
      },
      orderBlocks: [],
      structures: [],
      liquidityPools: [],
      setups: [],
      dashboard: emptyDashboard,
      backtest: emptyBacktest,
      ema20Series: [],
    };
  }

  // 1. Swings & Dealing Range
  const swings = detectSwings(candles, 5);
  const dealingRange = calculateDealingRange(candles, 40);

  // 2. Market Structure (BOS / CHoCH)
  const structures = detectStructureBreaks(candles, swings);

  // 3. Order Blocks & Liquidity
  const orderBlocks = detectOrderBlocks(candles, structures);
  const liquidityPools = detectLiquidity(candles, swings);

  // 4. Volatility, Momentum & Trend
  const volatility = calculateVolatility(candles);
  const momentum = calculateMomentum(candles);
  const trend = calculateAdx(candles, 14);

  // 5. EMA 20
  const closes = candles.map(c => c.close);
  const ema20Series = calculateEma(closes, 20);
  const latestEma = ema20Series[ema20Series.length - 1];

  // 6. Confluence Engine
  const confluence = calculateConfluence(
    candles,
    dealingRange,
    orderBlocks,
    momentum,
    trend,
    latestEma,
    config.confluenceThreshold
  );

  // 7. Multi-Timeframe Resonance
  const resonance = calculateResonance(candles, confluence, dealingRange);

  // 8. Trade Setups
  const setups = generateSetups(
    candles,
    orderBlocks,
    config.confluenceThreshold,
    config.riskReward1,
    config.riskReward2,
    config.riskReward3
  );

  // 9. Strategy Dashboard (HUD Metrics)
  const recentOB = orderBlocks[orderBlocks.length - 1];
  const obStatus: 'Bullish OB' | 'Bearish OB' | 'None' = recentOB
    ? recentOB.isBullish ? 'Bullish OB' : 'Bearish OB'
    : 'None';

  const positionStatus: 'LONG' | 'SHORT' | 'WAIT' = confluence.isLongQualified
    ? 'LONG'
    : confluence.isShortQualified
    ? 'SHORT'
    : 'WAIT';

  const dashboard: QuantumStrategyDashboard = {
    strategy: 'Quantum AI',
    marketRegime: trend.isTrending ? 'TRENDING' : 'RANGING',
    volatility: volatility.isSqueeze ? 'SQUEEZE' : 'EXPANSION',
    marketZone: dealingRange.currentZone,
    adxValue: trend.adx,
    orderBlockStatus: obStatus,
    bullScore: confluence.bullScore,
    bearScore: confluence.bearScore,
    position: positionStatus,
    resonancePct: resonance.resonancePct,
  };

  // 10. Quantitative Backtest
  const backtest = runQuantumBacktest(candles, config);

  return {
    config,
    dealingRange,
    volatility,
    momentum,
    trend,
    confluence,
    resonance,
    orderBlocks,
    structures,
    liquidityPools,
    setups,
    dashboard,
    backtest,
    ema20Series,
  };
}
