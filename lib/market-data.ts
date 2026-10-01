// ─── Market Intelligence AI — Deterministic OHLCV Data Generator ───────────
// Generates realistic-looking market data for the cinematic experience.

export interface CinematicCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Seeded pseudo-random number generator (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateCandles(
  count: number,
  seed: number = 42,
  basePrice: number = 24000,
  volatility: number = 0.015
): CinematicCandle[] {
  const rng = mulberry32(seed);
  const candles: CinematicCandle[] = [];
  let price = basePrice;
  const startTime = Date.now() - count * 60000;

  for (let i = 0; i < count; i++) {
    const drift = (rng() - 0.48) * volatility * price; // slight bullish bias
    const open = price;
    const close = open + drift;
    const wickUp = Math.abs(drift) * (0.3 + rng() * 0.7);
    const wickDown = Math.abs(drift) * (0.3 + rng() * 0.7);
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    const volume = 500000 + rng() * 2000000;

    candles.push({
      time: startTime + i * 60000,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.round(volume),
    });

    price = close;
  }

  return candles;
}

export function generateEMA(candles: CinematicCandle[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prev = candles[0]?.close ?? 0;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      // Simple average for first 'period' candles
      const slice = candles.slice(0, i + 1);
      prev = slice.reduce((s, c) => s + c.close, 0) / slice.length;
    } else {
      prev = candles[i].close * k + prev * (1 - k);
    }
    ema.push(Math.round(prev * 100) / 100);
  }

  return ema;
}

export function generateSMA(candles: CinematicCandle[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      sma.push(candles[i].close);
    } else {
      const slice = candles.slice(i - period + 1, i + 1);
      sma.push(Math.round((slice.reduce((s, c) => s + c.close, 0) / period) * 100) / 100);
    }
  }
  return sma;
}

export function generateRSI(candles: CinematicCandle[], period: number = 14): number[] {
  const rsi: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      rsi.push(50);
      continue;
    }

    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      rsi.push(i === period ? 100 - 100 / (1 + avgGain / (avgLoss || 0.001)) : 50);
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      rsi.push(Math.round((100 - 100 / (1 + avgGain / (avgLoss || 0.001))) * 100) / 100);
    }
  }

  return rsi;
}

export function generateMACD(
  candles: CinematicCandle[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const emaFast = generateEMA(candles, fast);
  const emaSlow = generateEMA(candles, slow);

  const macdLine = emaFast.map((v, i) => Math.round((v - emaSlow[i]) * 100) / 100);

  // Signal line = EMA of MACD line
  const signalK = 2 / (signal + 1);
  const signalLine: number[] = [];
  let prev = macdLine[0];

  for (let i = 0; i < macdLine.length; i++) {
    if (i < signal - 1) {
      const slice = macdLine.slice(0, i + 1);
      prev = slice.reduce((s, v) => s + v, 0) / slice.length;
    } else {
      prev = macdLine[i] * signalK + prev * (1 - signalK);
    }
    signalLine.push(Math.round(prev * 100) / 100);
  }

  const histogram = macdLine.map((v, i) => Math.round((v - signalLine[i]) * 100) / 100);

  return { macd: macdLine, signal: signalLine, histogram };
}

// Generate floating market numbers for the 3D scene
export function generateFloatingNumbers(count: number, seed: number = 99): string[] {
  const rng = mulberry32(seed);
  const results: string[] = [];
  const prefixes = ['', '+', '-', '$', '₹', ''];
  const suffixes = ['', '%', 'K', 'M', '', '.00'];

  for (let i = 0; i < count; i++) {
    const prefix = prefixes[Math.floor(rng() * prefixes.length)];
    const num = (rng() * 50000).toFixed(2);
    const suffix = suffixes[Math.floor(rng() * suffixes.length)];
    results.push(`${prefix}${num}${suffix}`);
  }

  return results;
}
