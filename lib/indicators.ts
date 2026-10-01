// ─── Market Intelligence 007 — Technical Indicator Math ─────────────────────
import { Candle } from './types';

/** Simple Moving Average */
export function calculateSMA(candles: Candle[], period: number): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    const slice = candles.slice(i - period + 1, i + 1);
    return slice.reduce((s, c) => s + c.close, 0) / period;
  });
}

/** Exponential Moving Average */
export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const k = 2 / (period + 1);
  let ema: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result[i] = null;
      continue;
    }
    if (ema === null) {
      // Seed with SMA
      ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
      result[i] = ema;
    } else {
      ema = candles[i].close * k + ema * (1 - k);
      result[i] = ema;
    }
  }
  return result;
}

/** Bollinger Bands */
export function calculateBollinger(
  candles: Candle[],
  period: number = 20,
  multiplier: number = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null); middle.push(null); lower.push(null);
      continue;
    }
    const slice = candles.slice(i - period + 1, i + 1).map(c => c.close);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - sma) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper.push(sma + multiplier * std);
    middle.push(sma);
    lower.push(sma - multiplier * std);
  }
  return { upper, middle, lower };
}

/** VWAP (resets daily / session-based) */
export function calculateVWAP(candles: Candle[]): (number | null)[] {
  let cumulativeTP = 0;
  let cumulativeVol = 0;
  return candles.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    cumulativeTP += tp * c.volume;
    cumulativeVol += c.volume;
    return cumulativeVol > 0 ? cumulativeTP / cumulativeVol : null;
  });
}

/** RSI */
export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return result;

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < candles.length; i++) {
    if (i === period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    } else {
      const diff = candles[i].close - candles[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }
  return result;
}

/** MACD: returns { macd, signal, histogram } */
export function calculateMACD(
  candles: Candle[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = calculateEMA(candles, fast);
  const emaSlow = calculateEMA(candles, slow);

  const macdLine: (number | null)[] = candles.map((_, i) => {
    if (emaFast[i] === null || emaSlow[i] === null) return null;
    return (emaFast[i] as number) - (emaSlow[i] as number);
  });

  // Signal: EMA of macd line
  const macdCandles: Candle[] = candles.map((c, i) => ({
    ...c,
    close: macdLine[i] ?? 0,
  }));

  // Only compute signal from first non-null macd value
  const firstValid = macdLine.findIndex(v => v !== null);
  const signalLine: (number | null)[] = new Array(candles.length).fill(null);
  const k = 2 / (signal + 1);
  let ema: number | null = null;
  let seed = 0;
  for (let i = firstValid; i < candles.length; i++) {
    if (macdLine[i] === null) continue;
    if (ema === null) {
      seed++;
      if (seed < signal) continue;
      // seed EMA
      ema = macdLine.slice(firstValid, firstValid + signal)
        .filter((v): v is number => v !== null)
        .reduce((a, b) => a + b, 0) / signal;
      signalLine[i] = ema;
    } else {
      ema = (macdLine[i] as number) * k + ema * (1 - k);
      signalLine[i] = ema;
    }
  }

  const histogram = candles.map((_, i) => {
    if (macdLine[i] === null || signalLine[i] === null) return null;
    return (macdLine[i] as number) - (signalLine[i] as number);
  });

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
