// ─── Market Intelligence MI-007 — Technical Indicator Math ──────────────────
import { Candle } from './types';

/** Simple Moving Average with adaptive warmup */
export function calculateSMA(candles: Candle[], period: number): (number | null)[] {
  if (!candles || candles.length === 0) return [];
  const p = Math.max(1, period);
  return candles.map((_, i) => {
    const effPeriod = Math.min(p, i + 1);
    let sum = 0;
    for (let j = i - effPeriod + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    return sum / effPeriod;
  });
}

/** Exponential Moving Average with adaptive warmup */
export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  if (!candles || candles.length === 0) return [];
  const p = Math.max(1, period);
  const result: (number | null)[] = new Array(candles.length).fill(null);
  result[0] = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    const effPeriod = Math.min(p, i + 1);
    const mult = 2 / (effPeriod + 1);
    const prev = result[i - 1]!;
    result[i] = (candles[i].close - prev) * mult + prev;
  }
  return result;
}

/** Bollinger Bands with adaptive warmup */
export function calculateBollinger(
  candles: Candle[],
  period: number = 20,
  multiplier: number = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const p = Math.max(1, period);
  const sma = calculateSMA(candles, p);
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const mid = sma[i];
    if (mid === null) {
      upper.push(null); middle.push(null); lower.push(null);
      continue;
    }
    const effPeriod = Math.min(p, i + 1);
    let sumSqDiff = 0;
    for (let j = i - effPeriod + 1; j <= i; j++) {
      const d = candles[j].close - mid;
      sumSqDiff += d * d;
    }
    const std = Math.sqrt(sumSqDiff / effPeriod);
    upper.push(mid + multiplier * std);
    middle.push(mid);
    lower.push(mid - multiplier * std);
  }
  return { upper, middle, lower };
}

/** VWAP (resets daily / session-based) */
export function calculateVWAP(candles: Candle[]): (number | null)[] {
  if (!candles || candles.length === 0) return [];
  let cumulativeTP = 0;
  let cumulativeVol = 0;
  return candles.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    cumulativeTP += tp * c.volume;
    cumulativeVol += c.volume;
    return cumulativeVol > 0 ? cumulativeTP / cumulativeVol : tp;
  });
}

/** RSI with adaptive warmup */
export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  if (!candles || candles.length === 0) return [];
  const p = Math.max(1, period);
  const result: (number | null)[] = new Array(candles.length).fill(null);
  result[0] = 50;
  if (candles.length === 1) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < candles.length; i++) {
    const chg = candles[i].close - candles[i - 1].close;
    const gain = chg > 0 ? chg : 0;
    const loss = chg < 0 ? Math.abs(chg) : 0;
    const effPeriod = Math.min(p, i);
    if (i === 1) {
      avgGain = gain;
      avgLoss = loss;
    } else {
      avgGain = (avgGain * (effPeriod - 1) + gain) / effPeriod;
      avgLoss = (avgLoss * (effPeriod - 1) + loss) / effPeriod;
    }
    if (avgLoss === 0 && avgGain === 0) {
      result[i] = 50;
    } else if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }
  return result;
}

/** MACD with adaptive warmup */
export function calculateMACD(
  candles: Candle[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const sz = candles.length;
  const macdLine: (number | null)[] = new Array(sz).fill(null);
  const signalLine: (number | null)[] = new Array(sz).fill(null);
  const histogram: (number | null)[] = new Array(sz).fill(null);
  if (sz === 0) return { macd: macdLine, signal: signalLine, histogram };

  const fastEma = calculateEMA(candles, fast);
  const slowEma = calculateEMA(candles, slow);

  for (let i = 0; i < sz; i++) {
    const f = fastEma[i] ?? candles[i].close;
    const s = slowEma[i] ?? candles[i].close;
    macdLine[i] = f - s;
  }

  const sigP = Math.max(1, signal);
  signalLine[0] = macdLine[0];
  histogram[0] = 0;

  for (let i = 1; i < sz; i++) {
    const effP = Math.min(sigP, i + 1);
    const mult = 2 / (effP + 1);
    const m = macdLine[i] ?? 0;
    const prevSig = signalLine[i - 1] ?? m;
    const sig = (m - prevSig) * mult + prevSig;
    signalLine[i] = sig;
    histogram[i] = m - sig;
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/** Convert to Heikin-Ashi candles */
export function toHeikinAshi(candles: Candle[]): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0
      ? (c.open + c.close) / 2
      : (result[i - 1].open + result[i - 1].close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    result.push({ ...c, open: haOpen, high: haHigh, low: haLow, close: haClose });
  }
  return result;
}


/** Average True Range (ATR) with RMA smoothing */
export function calculateATR(candles: Candle[], period: number = 14): (number | null)[] {
  if (!candles || candles.length === 0) return [];
  const p = Math.max(1, period);
  const trs: number[] = new Array(candles.length);
  trs[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hpc = Math.abs(candles[i].high - candles[i - 1].close);
    const lpc = Math.abs(candles[i].low - candles[i - 1].close);
    trs[i] = Math.max(hl, hpc, lpc);
  }
  const result: (number | null)[] = new Array(candles.length).fill(null);
  let sum = 0;
  const warmup = Math.min(p, candles.length);
  for (let i = 0; i < warmup; i++) {
    sum += trs[i];
  }
  let prevAtr = sum / warmup;
  result[warmup - 1] = prevAtr;
  for (let i = p; i < candles.length; i++) {
    prevAtr = (prevAtr * (p - 1) + trs[i]) / p;
    result[i] = prevAtr;
  }
  return result;
}
