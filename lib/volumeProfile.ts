import { Candle } from './types';

export type VolumeQuality = 'ACTUAL' | 'ESTIMATED';

export interface UnifiedVolumeBucket {
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  buyVolume: number;   // Estimated from close position in bar range (not tick-level bid/ask)
  sellVolume: number;  // Estimated from close position in bar range
  totalVolume: number;
  isHvn: boolean;
  isLvn: boolean;
}

export interface UnifiedVolumeProfile {
  hasVolume: boolean;
  volumeQuality: VolumeQuality;
  estimatedDelta: true;
  buckets: UnifiedVolumeBucket[];
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  maxBucketVolume: number;
  totalVolume: number;
  rangeMin: number;
  rangeMax: number;
}

export interface ComputeVolumeProfileOptions {
  bucketCount?: number;
  valueAreaPct?: number; // default 0.70 (70% Value Area)
}

function roundPrice(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (Math.abs(v) >= 100) return Number(v.toFixed(2));
  if (Math.abs(v) >= 1) return Number(v.toFixed(4));
  return Number(v.toFixed(6));
}

/**
 * Determines whether candle volume represents actual traded volume or missing/constant/estimated data.
 */
export function detectVolumeQuality(candles: Candle[]): VolumeQuality {
  if (!candles || candles.length === 0) return 'ESTIMATED';
  const sample = candles.slice(-120);
  let positive = 0;
  const uniqueVols = new Set<number>();
  for (const c of sample) {
    if (typeof c.volume === 'number' && Number.isFinite(c.volume) && c.volume > 0) {
      positive++;
      uniqueVols.add(Math.round(c.volume));
    }
  }
  const positiveRatio = positive / sample.length;
  if (positiveRatio < 0.7 || uniqueVols.size < Math.min(8, Math.max(3, Math.floor(positive * 0.4)))) {
    return 'ESTIMATED';
  }
  return 'ACTUAL';
}

/**
 * Single canonical Volume Profile engine shared by Chart VPVR and MI-007.
 * - Buckets are derived strictly from candle highs/lows (independent of padded chart price axis).
 * - Flat bars (high === low) deposit 100% of their volume into their exact containing bucket.
 * - Zero-volume series return hasVolume: false with no fabricated volume or bin-0 POC.
 * - 70% Value Area uses standard 2-row outward expansion around POC (adding both rows on the heavier side).
 */
export function computeVolumeProfile(
  candles: Candle[],
  options: ComputeVolumeProfileOptions = {}
): UnifiedVolumeProfile {
  const bucketCount = Math.max(4, options.bucketCount ?? 40);
  const vaPct = options.valueAreaPct ?? 0.70;
  const volumeQuality = detectVolumeQuality(candles);

  const empty = (rangeMin = 0, rangeMax = 0): UnifiedVolumeProfile => ({
    hasVolume: false,
    volumeQuality,
    estimatedDelta: true,
    buckets: [],
    pocPrice: 0,
    vahPrice: 0,
    valPrice: 0,
    maxBucketVolume: 0,
    totalVolume: 0,
    rangeMin,
    rangeMax,
  });

  if (!candles || candles.length === 0) return empty();

  let minP = Infinity;
  let maxP = -Infinity;
  let rawVolSum = 0;
  for (const c of candles) {
    if (Number.isFinite(c.low) && c.low < minP) minP = c.low;
    if (Number.isFinite(c.high) && c.high > maxP) maxP = c.high;
    if (typeof c.volume === 'number' && Number.isFinite(c.volume) && c.volume > 0) {
      rawVolSum += c.volume;
    }
  }

  // VP1: Never fabricate volume or emit a bin-0 POC when there is no actual volume
  if (!Number.isFinite(minP) || !Number.isFinite(maxP) || rawVolSum <= 0) {
    return empty(Number.isFinite(minP) ? minP : 0, Number.isFinite(maxP) ? maxP : 0);
  }

  // Handle degenerate completely flat series (maxP === minP) with positive volume
  if (maxP <= minP) {
    const p = roundPrice(minP);
    return {
      hasVolume: true,
      volumeQuality,
      estimatedDelta: true,
      buckets: [
        {
          priceLow: p,
          priceHigh: p,
          priceMid: p,
          buyVolume: rawVolSum * 0.5,
          sellVolume: rawVolSum * 0.5,
          totalVolume: rawVolSum,
          isHvn: true,
          isLvn: false,
        },
      ],
      pocPrice: p,
      vahPrice: p,
      valPrice: p,
      maxBucketVolume: rawVolSum,
      totalVolume: rawVolSum,
      rangeMin: p,
      rangeMax: p,
    };
  }

  const step = (maxP - minP) / bucketCount;
  const buyArr = new Float64Array(bucketCount);
  const sellArr = new Float64Array(bucketCount);
  const totArr = new Float64Array(bucketCount);
  let totalVolume = 0;

  for (const c of candles) {
    const vol = typeof c.volume === 'number' && Number.isFinite(c.volume) && c.volume > 0 ? c.volume : 0;
    if (vol <= 0) continue;
    totalVolume += vol;

    const range = c.high - c.low;
    if (range <= 1e-12) {
      // VP3: Flat bar (high === low) deposits 100% of its volume into its single containing bucket
      const idx = Math.max(0, Math.min(bucketCount - 1, Math.floor((c.close - minP) / step)));
      const buyFrac = c.close >= c.open ? 0.5 : 0.5;
      buyArr[idx] += vol * buyFrac;
      sellArr[idx] += vol * (1 - buyFrac);
      totArr[idx] += vol;
      continue;
    }

    const buyFrac = Math.min(1, Math.max(0, (c.close - c.low) / range));
    const buyVol = vol * buyFrac;
    const sellVol = vol * (1 - buyFrac);

    const loIdx = Math.max(0, Math.min(bucketCount - 1, Math.floor((c.low - minP) / step)));
    const hiIdx = Math.max(loIdx, Math.min(bucketCount - 1, Math.floor((c.high - minP) / step)));

    for (let i = loIdx; i <= hiIdx; i++) {
      const bLow = minP + i * step;
      const bHigh = i === bucketCount - 1 ? maxP : bLow + step;
      const oLow = Math.max(bLow, c.low);
      const oHigh = Math.min(bHigh, c.high);
      if (oHigh > oLow) {
        const portion = (oHigh - oLow) / range;
        buyArr[i] += buyVol * portion;
        sellArr[i] += sellVol * portion;
        totArr[i] += vol * portion;
      }
    }
  }

  if (totalVolume <= 0) return empty(minP, maxP);

  let pocIdx = 0;
  let maxVol = totArr[0];
  for (let i = 1; i < bucketCount; i++) {
    if (totArr[i] > maxVol) {
      maxVol = totArr[i];
      pocIdx = i;
    }
  }

  // Standard 2-row outward 70% Value Area expansion (adds both rows of the heavier side)
  const targetVaVol = totalVolume * vaPct;
  let curVaVol = totArr[pocIdx];
  let vaLow = pocIdx;
  let vaHigh = pocIdx;
  while (curVaVol < targetVaVol && (vaLow > 0 || vaHigh < bucketCount - 1)) {
    const up1 = vaHigh + 1 < bucketCount ? totArr[vaHigh + 1] : -1;
    const up2 = vaHigh + 2 < bucketCount ? totArr[vaHigh + 2] : 0;
    const dn1 = vaLow - 1 >= 0 ? totArr[vaLow - 1] : -1;
    const dn2 = vaLow - 2 >= 0 ? totArr[vaLow - 2] : 0;

    const canUp = up1 >= 0;
    const canDn = dn1 >= 0;
    const upSum = canUp ? up1 + up2 : -1;
    const dnSum = canDn ? dn1 + dn2 : -1;

    if (canUp && (!canDn || upSum >= dnSum)) {
      vaHigh++;
      curVaVol += totArr[vaHigh];
      if (curVaVol < targetVaVol && vaHigh + 1 < bucketCount) {
        vaHigh++;
        curVaVol += totArr[vaHigh];
      }
    } else if (canDn) {
      vaLow--;
      curVaVol += totArr[vaLow];
      if (curVaVol < targetVaVol && vaLow - 1 >= 0) {
        vaLow--;
        curVaVol += totArr[vaLow];
      }
    } else {
      break;
    }
  }

  // 3-bin Gaussian smoothing for HVN/LVN structural nodes
  const smoothed = new Float64Array(bucketCount);
  for (let i = 0; i < bucketCount; i++) {
    const prev = i > 0 ? totArr[i - 1] : totArr[i];
    const next = i < bucketCount - 1 ? totArr[i + 1] : totArr[i];
    smoothed[i] = prev * 0.25 + totArr[i] * 0.5 + next * 0.25;
  }

  const meanVol = totalVolume / bucketCount;
  const buckets: UnifiedVolumeBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const pLow = minP + i * step;
    const pHigh = i === bucketCount - 1 ? maxP : pLow + step;
    const v = totArr[i];
    const sv = smoothed[i];
    const isLocalPeak = (i === 0 || sv >= smoothed[i - 1]) && (i === bucketCount - 1 || sv >= smoothed[i + 1]);
    const isLocalTrough = i > 0 && i < bucketCount - 1 && sv <= smoothed[i - 1] && sv <= smoothed[i + 1];
    buckets.push({
      priceLow: roundPrice(pLow),
      priceHigh: roundPrice(pHigh),
      priceMid: roundPrice((pLow + pHigh) / 2),
      buyVolume: buyArr[i],
      sellVolume: sellArr[i],
      totalVolume: v,
      isHvn: meanVol > 0 && ((isLocalPeak && sv >= meanVol * 1.25) || v >= meanVol * 1.55),
      isLvn: meanVol > 0 && v > 0 && ((isLocalTrough && sv <= meanVol * 0.55) || v <= meanVol * 0.35),
    });
  }

  return {
    hasVolume: true,
    volumeQuality,
    estimatedDelta: true,
    buckets,
    pocPrice: buckets[pocIdx].priceMid,
    vahPrice: buckets[vaHigh].priceHigh,
    valPrice: buckets[vaLow].priceLow,
    maxBucketVolume: maxVol,
    totalVolume,
    rangeMin: roundPrice(minP),
    rangeMax: roundPrice(maxP),
  };
}
