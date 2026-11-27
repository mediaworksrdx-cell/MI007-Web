import { Candle } from '../types';
import { calculateSMC, SmcAnalysis, timeframeToMs } from '../smcEngine';

export interface MtfStructureSummary {
  baseTimeframe: string;
  htfTimeframe: string;
  htfCandleCount: number;
  htfBias: 'BULLISH' | 'BEARISH' | 'RANGE';
  ltfBias: 'BULLISH' | 'BEARISH' | 'RANGE';
  alignment: 'ALIGNED_BULLISH' | 'ALIGNED_BEARISH' | 'CONFLICTING' | 'NEUTRAL';
  htfLatestBreak: {
    type: 'BOS' | 'CHoCH' | 'MSS';
    direction: 'BULLISH' | 'BEARISH';
    price: number;
    time: number;
  } | null;
  htfPremiumDiscount: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
  htfEquilibriumPrice: number;
  htfAnalysis: SmcAnalysis;
}

const HTF_MAP: Record<string, { label: string; factor: number }> = {
  '1m': { label: '15m', factor: 15 },
  '3m': { label: '15m', factor: 5 },
  '5m': { label: '1H', factor: 12 },
  '15m': { label: '1H', factor: 4 },
  '30m': { label: '4H', factor: 8 },
  '1H': { label: '4H', factor: 4 },
  '4H': { label: '1D', factor: 6 },
  '1D': { label: '1W', factor: 5 },
  '1W': { label: '1M', factor: 4 },
};

/**
 * Resample base OHLCV candles into higher-timeframe bars with strict causal aggregation.
 * Preserves `volumeEstimated` if any constituent bar was estimated.
 */
export function resampleCandlesToHtf(candles: Candle[], factor = 4): Candle[] {
  if (!candles || candles.length === 0) return [];
  const f = Math.max(2, Math.floor(factor));
  const out: Candle[] = [];

  for (let i = 0; i + f <= candles.length; i += f) {
    const slice = candles.slice(i, i + f);
    const first = slice[0];
    const last = slice[slice.length - 1];
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;
    let anyEstimated = false;

    for (const c of slice) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      if (typeof c.volume === 'number' && Number.isFinite(c.volume) && c.volume > 0) {
        volume += c.volume;
      }
      if ((c as Candle & { volumeEstimated?: boolean }).volumeEstimated) {
        anyEstimated = true;
      }
    }

    const bar: Candle & { volumeEstimated?: boolean } = {
      openTime: first.openTime,
      open: first.open,
      high,
      low,
      close: last.close,
      volume: Number(volume.toFixed(4)),
    };
    if (anyEstimated) bar.volumeEstimated = true;
    out.push(bar);
  }
  return out;
}

/**
 * Compute Multi-Timeframe SMC Structure by analyzing both the base timeframe
 * and an automatically derived (or caller-supplied) Higher Timeframe.
 */
export function analyzeMultiTimeframeSmc(
  candles: Candle[],
  options: {
    symbol?: string;
    timeframe?: string;
    htfCandles?: Candle[];
    baseSmc?: SmcAnalysis;
  } = {}
): MtfStructureSummary {
  const symbol = options.symbol || 'UNKNOWN';
  const baseTf = options.timeframe || '1D';
  const mapping = HTF_MAP[baseTf] ?? { label: '4x HTF', factor: 4 };

  // Ensure enough HTF bars exist (adapt factor downward if dataset is short)
  let factor = mapping.factor;
  if (!options.htfCandles && candles.length / factor < 20) {
    factor = Math.max(2, Math.floor(candles.length / 20));
  }

  const htfCandles =
    options.htfCandles && options.htfCandles.length >= 20
      ? options.htfCandles
      : resampleCandlesToHtf(candles, factor);

  const baseSmc =
    options.baseSmc ?? calculateSMC(candles, { enabled: true }, symbol, baseTf);
  const htfSmc = calculateSMC(
    htfCandles,
    { enabled: true },
    symbol,
    options.htfCandles ? mapping.label : `${baseTf}_HTF`
  );

  const htfBias = htfSmc.ltfBias ?? htfSmc.htfBias ?? 'RANGE';
  const ltfBias = baseSmc.ltfBias ?? 'RANGE';

  let alignment: MtfStructureSummary['alignment'] = 'NEUTRAL';
  if (htfBias === 'BULLISH' && ltfBias === 'BULLISH') alignment = 'ALIGNED_BULLISH';
  else if (htfBias === 'BEARISH' && ltfBias === 'BEARISH') alignment = 'ALIGNED_BEARISH';
  else if (
    (htfBias === 'BULLISH' && ltfBias === 'BEARISH') ||
    (htfBias === 'BEARISH' && ltfBias === 'BULLISH')
  ) {
    alignment = 'CONFLICTING';
  }

  const lastBreak =
    htfSmc.structureBreaks.length > 0
      ? htfSmc.structureBreaks[htfSmc.structureBreaks.length - 1]
      : null;

  const lastPrice = candles[candles.length - 1]?.close ?? 0;
  const eq = htfSmc.equilibriumPrice || lastPrice;
  const band = Math.abs(htfSmc.dealingRange.highPrice - htfSmc.dealingRange.lowPrice) * 0.03;
  const htfPremiumDiscount: MtfStructureSummary['htfPremiumDiscount'] =
    Math.abs(lastPrice - eq) <= band
      ? 'EQUILIBRIUM'
      : lastPrice > eq
      ? 'PREMIUM'
      : 'DISCOUNT';

  return {
    baseTimeframe: baseTf,
    htfTimeframe: mapping.label,
    htfCandleCount: htfCandles.length,
    htfBias,
    ltfBias,
    alignment,
    htfLatestBreak: lastBreak
      ? {
          type: lastBreak.type as 'BOS' | 'CHoCH' | 'MSS',
          direction: lastBreak.isBullish ? 'BULLISH' : 'BEARISH',
          price: lastBreak.price,
          time: lastBreak.time,
        }
      : null,
    htfPremiumDiscount,
    htfEquilibriumPrice: Number(eq.toFixed(4)),
    htfAnalysis: htfSmc,
  };
}
