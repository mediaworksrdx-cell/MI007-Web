// ═══════════════════════════════════════════════════════════════════════════
// chartRenderer.ts — 10-Layer Canvas Chart Engine
// Pixel-perfect translation of Android Market Intelligence MI- 007 chart layers
// ═══════════════════════════════════════════════════════════════════════════

// ── Types ──────────────────────────────────────────────────────────────────
import {
  Candle, ChartType, IndicatorType, IndicatorConfig,
  MACDResult, BollingerResult, SupertrendResult, StochasticResult,
  IchimokuResult, AdxResult, CvdResult,
  VolumeProfileBucket, VolumeProfileData,
  SmcFvg, SmcLiquiditySweep, SmcOrderBlock, SmcStructureBreak, SmcAnalysis,
  FnoOverlayLevels, StrategyPayoffOverlay,
  ChartOptions, ViewState, Crosshair, MagnetReticle, ScaleState,
  INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES, isOverlay, formatIndicatorBadgeLabel,
  CHART_RIGHT_MARGIN, CHART_BOTTOM_MARGIN,
} from './types';
import { calculateSMC, DEFAULT_SMC_CONFIG, type SmcConfig } from './smcEngine';

export type {
  Candle, ChartType, IndicatorType, IndicatorConfig,
  MACDResult, BollingerResult, SupertrendResult, StochasticResult,
  IchimokuResult, AdxResult, CvdResult,
  VolumeProfileBucket, VolumeProfileData,
  SmcFvg, SmcLiquiditySweep, SmcOrderBlock, SmcStructureBreak, SmcAnalysis,
  FnoOverlayLevels, StrategyPayoffOverlay,
  ChartOptions, ViewState, Crosshair, MagnetReticle, ScaleState,
};
export { INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES, isOverlay, formatIndicatorBadgeLabel };


// ── Color Constants (Soft Institutional Theme) ──────────────────────────
const BULL  = '#089981';
const BEAR  = '#F23645';
const LINE_COLOR = '#2563EB';
const GRID  = '#F1F5F9';
const AXIS_TEXT = '#475569';
const CROSSHAIR_COLOR = 'rgba(51, 65, 85, 0.85)';
const LABEL_BG = '#0F172A';
const PANEL_BG = '#F8FAFC';
const PANEL_SEP = '#E2E8F0';
const VOL_LABEL = '#0284C7';
const VOL_AXIS = '#64748B';

// TradingView standard typography stack
export const TV_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';

// ── Formatters ────────────────────────────────────────────────────────────
export function formatPrice(p: number): string {
  if (p >= 10000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 100) return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.toFixed(4);
}

/**
 * Institutional "Nice Numbers" algorithm for price axis intervals.
 * Snaps levels to clean, rounded numbers like 52,000, 52,500, 53,000.
 */
export function computeNicePriceTicks(pMin: number, pMax: number, targetTicks: number = 6): number[] {
  const range = pMax - pMin;
  if (range <= 0 || !Number.isFinite(range)) return [pMin];

  const rawStep = range / Math.max(2, targetTicks);
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / Math.pow(10, exponent);

  let niceFraction = 1;
  if (fraction < 1.5) niceFraction = 1;
  else if (fraction < 3) niceFraction = 2;
  else if (fraction < 7) niceFraction = 5;
  else niceFraction = 10;

  const step = niceFraction * Math.pow(10, exponent);
  const startTick = Math.ceil(pMin / step) * step;

  const ticks: number[] = [];
  const decimals = exponent < 0 ? Math.min(6, Math.abs(exponent) + 1) : 0;

  for (let p = startTick; p <= pMax + step * 0.001; p += step) {
    const cleanP = Number(p.toFixed(decimals));
    if (cleanP >= pMin - step * 0.05 && cleanP <= pMax + step * 0.05) {
      ticks.push(cleanP);
    }
  }

  if (ticks.length < 2) {
    return [pMin, (pMin + pMax) / 2, pMax];
  }

  return ticks;
}

/**
 * Institutional Calendar-Aligned Time Axis Intervals.
 * Snaps bottom X-axis grid lines and labels strictly to clean calendar intervals:
 * - Multi-month / Daily: Exact 1st and 15th of each month (Semi-Monthly) or 1st of month
 * - Multi-week / Daily: Exact Mondays (Weekly)
 * - Intraday: Clean hour and session boundaries
 */
export function computeCalendarTimeTicks(
  candles: Candle[],
  startIdx: number,
  endIdx: number,
  chartW: number,
  candleW: number,
  isDailyOrHigher: boolean,
  dpr: number
): { x: number; label: string; isYear?: boolean }[] {
  const safeStart = Math.max(0, startIdx);
  const safeEnd = Math.min(endIdx, candles.length);
  if (safeEnd <= safeStart || candles.length === 0) return [];

  const firstTs = candles[safeStart].openTime;
  const lastTs = candles[safeEnd - 1].openTime;
  const spanMs = Math.max(1, lastTs - firstTs);
  const spanDays = spanMs / 86_400_000;
  const minSpacing = 68 * dpr;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ticks: { x: number; label: string; isYear?: boolean }[] = [];

  const startYear = new Date(firstTs).getFullYear();
  const endYear = new Date(lastTs).getFullYear();
  const crossesYear = endYear > startYear;

  // Binary search helper to find the first trading candle on or immediately after target timestamp
  function findClosestCandleIndex(targetTs: number): number {
    let low = safeStart, high = safeEnd - 1;
    let bestIdx = low;
    let bestDiff = Math.abs(candles[low].openTime - targetTs);

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const diff = Math.abs(candles[mid].openTime - targetTs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = mid;
      }
      if (candles[mid].openTime < targetTs) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return bestIdx;
  }

  if (isDailyOrHigher) {
    const anchors: { ts: number; label: string; isYear?: boolean }[] = [];
    const startDate = new Date(firstTs);
    const endDate = new Date(lastTs);

    if (spanDays > 730) {
      // Multi-year: Jan 1 of each year
      for (let y = startDate.getFullYear(); y <= endDate.getFullYear() + 1; y++) {
        const d = new Date(y, 0, 1);
        anchors.push({ ts: d.getTime(), label: `${y}`, isYear: true });
      }
    } else if (spanDays > 120) {
      // Multi-month: 1st of every month (Aug, Sep, Oct...).
      // Only highlight year at Jan 1 or when range crosses distinct calendar years
      const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (cur.getTime() <= lastTs + 15 * 86_400_000) {
        const isJan = cur.getMonth() === 0;
        anchors.push({
          ts: cur.getTime(),
          label: isJan ? `${cur.getFullYear()}` : months[cur.getMonth()],
          isYear: isJan,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else if (spanDays > 32) {
      // Medium Range: Semi-Monthly (1st and 15th of each month)
      const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (cur.getTime() <= lastTs + 15 * 86_400_000) {
        const d1 = new Date(cur.getFullYear(), cur.getMonth(), 1);
        const isJan = d1.getMonth() === 0;
        anchors.push({
          ts: d1.getTime(),
          label: isJan ? `${d1.getFullYear()}` : months[d1.getMonth()],
          isYear: isJan,
        });
        const d15 = new Date(cur.getFullYear(), cur.getMonth(), 15);
        anchors.push({ ts: d15.getTime(), label: '15', isYear: false });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else if (spanDays > 12) {
      // Weekly: Every Monday, with month names on first week of month
      const cur = new Date(startDate);
      const day = cur.getDay();
      const diff = (day === 0 ? 1 : (day === 1 ? 0 : 8 - day));
      cur.setDate(cur.getDate() + diff);
      cur.setHours(0, 0, 0, 0);
      let prevMonth = -1;
      while (cur.getTime() <= lastTs + 7 * 86_400_000) {
        const curM = cur.getMonth();
        const isNewMonth = prevMonth !== -1 && prevMonth !== curM;
        anchors.push({
          ts: cur.getTime(),
          label: (isNewMonth && cur.getDate() <= 7) ? months[curM] : `${cur.getDate()}`,
          isYear: false,
        });
        prevMonth = curM;
        cur.setDate(cur.getDate() + 7);
      }
    } else {
      // Short: Every 2 days
      const cur = new Date(startDate);
      cur.setHours(0, 0, 0, 0);
      let prevMonth = -1;
      while (cur.getTime() <= lastTs + 2 * 86_400_000) {
        const curM = cur.getMonth();
        const isNewMonth = prevMonth !== -1 && prevMonth !== curM;
        anchors.push({
          ts: cur.getTime(),
          label: (isNewMonth && cur.getDate() <= 2) ? months[curM] : `${cur.getDate()}`,
          isYear: false,
        });
        prevMonth = curM;
        cur.setDate(cur.getDate() + 2);
      }
    }

    // Map anchors to visible candle indices
    let lastX = -Infinity;
    const seenIndices = new Set<number>();
    for (const anchor of anchors) {
      const idx = findClosestCandleIndex(anchor.ts);
      if (idx < safeStart || idx >= safeEnd || seenIndices.has(idx)) continue;
      const c = candles[idx];
      // Tolerance check: must be within 3.5 calendar days of anchor
      if (Math.abs(c.openTime - anchor.ts) > 3.5 * 86_400_000) continue;

      const li = idx - startIdx;
      const x = Math.round(li * candleW + candleW / 2);
      if (x >= 20 * dpr && x <= chartW - 20 * dpr && x - lastX >= minSpacing) {
        ticks.push({ x, label: anchor.label, isYear: anchor.isYear });
        lastX = x;
        seenIndices.add(idx);
      }
    }
  } else {
    // Intraday: Clean hour and session boundaries
    let lastX = -Infinity;
    const timeStep = Math.max(1, Math.floor((endIdx - startIdx) / Math.max(2, Math.floor(chartW / (95 * dpr)))));
    let prevDay = -1;
    for (let i = startIdx; i < endIdx; i += timeStep) {
      if (i < 0 || i >= candles.length) continue;
      const li = i - startIdx;
      const x = Math.round(li * candleW + candleW / 2);
      if (x - lastX < minSpacing) continue;

      const ts = candles[i].openTime;
      const d = new Date(ts);
      const curDay = d.getDate();
      const multiDay = Math.abs(lastTs - firstTs) > 86_400_000;
      let label: string;
      if (multiDay && prevDay !== curDay) {
        label = `${d.getDate()} ${months[d.getMonth()]}`;
      } else {
        label = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      prevDay = curDay;
      ticks.push({ x, label, isYear: false });
      lastX = x;
    }
  }

  // Fallback if sparse
  if (ticks.length < 2 && safeEnd - safeStart >= 2) {
    const midIdx = Math.floor((safeStart + safeEnd) / 2);
    const x1 = Math.round((safeStart - startIdx) * candleW + candleW / 2);
    const xMid = Math.round((midIdx - startIdx) * candleW + candleW / 2);
    const x2 = Math.round((safeEnd - 1 - startIdx) * candleW + candleW / 2);
    return [
      { x: x1, label: formatTimeLabel(candles[safeStart].openTime, isDailyOrHigher) },
      { x: xMid, label: formatTimeLabel(candles[midIdx].openTime, isDailyOrHigher) },
      { x: x2, label: formatTimeLabel(candles[safeEnd - 1].openTime, isDailyOrHigher) },
    ];
  }

  return ticks;
}

/**
 * Resolves the accurate candle index for a drawing point across reloads,
 * timeframes, and shifting candle series using timestamp proximity (minDiff).
 */
export function resolveDrawingPointIndex(
  pt: { index: number; time?: number },
  candles: Candle[]
): number {
  if (!candles || candles.length === 0) return pt.index ?? 0;
  let idx = pt.index ?? 0;
  const lastIdx = candles.length - 1;

  // If point is within known candle history
  if (idx >= 0 && idx <= lastIdx) {
    if (pt.time && candles[idx]?.openTime !== pt.time) {
      let bestIdx = idx;
      let minDiff = Infinity;
      for (let i = 0; i < candles.length; i++) {
        const diff = Math.abs(candles[i].openTime - pt.time);
        if (diff < minDiff) {
          minDiff = diff;
          bestIdx = i;
        }
      }
      idx = bestIdx;
    }
    return idx;
  }

  // If point is projected forward into future/buffer bars
  if (idx > lastIdx) {
    if (pt.time && candles[lastIdx]) {
      const lastBar = candles[lastIdx];
      const prevBar = candles[lastIdx - 1];
      const barDuration = (prevBar && lastBar.openTime > prevBar.openTime)
        ? (lastBar.openTime - prevBar.openTime)
        : 86_400_000;
      if (pt.time > lastBar.openTime) {
        const projectedOffset = Math.round((pt.time - lastBar.openTime) / barDuration);
        return lastIdx + Math.max(1, projectedOffset);
      }
    }
    return idx;
  }

  return Math.max(0, idx);
}

/**
 * Unified price scale bounding helper used across renderChart, renderOverlay,
 * and CandlestickCanvas interaction hit-testing to ensure 100% pixel-perfect alignment.
 */
export function computeChartPriceBounds(
  candles: Candle[],
  startIdx: number,
  endIdx: number,
  currentPriceOverride?: number,
  priceOffset: number = 0,
  priceScaleRatio: number = 1.0
): { pMin: number; pMax: number; pRange: number; minValidBound: number; maxValidBound: number } {
  const safeStart = Math.max(0, startIdx);
  const safeEnd = Math.min(endIdx, candles.length);

  let pMin = Infinity, pMax = -Infinity;
  for (let i = safeStart; i < safeEnd; i++) {
    const c = candles[i];
    if (!c || !Number.isFinite(c.low) || !Number.isFinite(c.high)) continue;
    if (c.low > 0) pMin = Math.min(pMin, c.low);
    if (c.high > 0) pMax = Math.max(pMax, c.high);
  }
  // Fallback if no valid data
  if (!Number.isFinite(pMin) || !Number.isFinite(pMax) || pMin >= pMax) {
    const fallback = (currentPriceOverride && currentPriceOverride > 0) ? currentPriceOverride : 1000;
    pMin = fallback * 0.99;
    pMax = fallback * 1.01;
  }
  if (currentPriceOverride && currentPriceOverride > 0 && endIdx >= candles.length && Number.isFinite(pMin) && Number.isFinite(pMax)) {
    const disMin = Math.abs(currentPriceOverride - pMin) / Math.max(0.0001, pMin);
    const disMax = Math.abs(currentPriceOverride - pMax) / Math.max(0.0001, pMax);
    // Scale dislocation guard: only expand viewport bounds if currentPriceOverride is reasonably continuous (< 30%)
    if (disMin < 0.30 || disMax < 0.30) {
      pMin = Math.min(pMin, currentPriceOverride);
      pMax = Math.max(pMax, currentPriceOverride);
    }
  }
  const pad = (pMax - pMin) * 0.05 || 1;
  pMin -= pad; pMax += pad;

  const center = (pMax + pMin) / 2 + priceOffset;
  const scaledRange = (pMax - pMin) * priceScaleRatio;
  pMin = center - scaledRange / 2;
  pMax = center + scaledRange / 2;
  const pRange = Math.max(pMax - pMin, 0.01);

  // minValidBound/maxValidBound kept for API compatibility but set to very wide range
  const minValidBound = pMin * 0.5;
  const maxValidBound = pMax * 2.0;

  return { pMin, pMax, pRange, minValidBound, maxValidBound };
}
function formatVolume(v: number): string {
  if (v >= 1e9) return (v/1e9).toFixed(2)+'B';
  if (v >= 1e6) return (v/1e6).toFixed(2)+'M';
  if (v >= 1e3) return (v/1e3).toFixed(1)+'K';
  if (v >= 10) return v.toFixed(1);
  if (v >= 1) return v.toFixed(2);
  if (v > 0) return v.toFixed(3);
  return '0';
}
function formatTimeLabel(ts: number, isDailyOrHigher: boolean): string {
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (isDailyOrHigher) return `${d.getDate()} ${months[d.getMonth()]}`;
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function formatCrosshairTime(ts: number, isDailyOrHigher: boolean): string {
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (isDailyOrHigher) return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// INDICATOR CALCULATIONS (Adaptive warmup & full-span continuity)
// ═══════════════════════════════════════════════════════════════════════════

export function calculateSMA(candles: Candle[], period: number): (number|null)[] {
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

export function calculateEMA(candles: Candle[], period: number): (number|null)[] {
  if (!candles || candles.length === 0) return [];
  const p = Math.max(1, period);
  const result: (number|null)[] = Array(candles.length).fill(null);
  result[0] = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    const effPeriod = Math.min(p, i + 1);
    const mult = 2 / (effPeriod + 1);
    const prev = result[i - 1]!;
    result[i] = (candles[i].close - prev) * mult + prev;
  }
  return result;
}

export function calculateRSI(candles: Candle[], period: number): (number|null)[] {
  if (!candles || candles.length === 0) return [];
  const p = Math.max(1, period);
  const result: (number|null)[] = Array(candles.length).fill(null);
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

export function calculateMACD(candles: Candle[], fast=12, slow=26, signal=9): MACDResult {
  const sz = candles.length;
  const macdLine: (number|null)[] = Array(sz).fill(null);
  const signalLine: (number|null)[] = Array(sz).fill(null);
  const histogram: (number|null)[] = Array(sz).fill(null);
  if (sz === 0) return { macdLine, signalLine, histogram };

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

  return { macdLine, signalLine, histogram };
}

export function calculateBollingerBands(candles: Candle[], period=20, deviation=2): BollingerResult {
  const p = Math.max(1, period);
  const sma = calculateSMA(candles, p);
  const upper: (number|null)[] = Array(candles.length).fill(null);
  const lower: (number|null)[] = Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    const mid = sma[i];
    if (mid === null) continue;
    const effPeriod = Math.min(p, i + 1);
    let sumSqDiff = 0;
    for (let j = i - effPeriod + 1; j <= i; j++) {
      const d = candles[j].close - mid;
      sumSqDiff += d * d;
    }
    const stdDev = Math.sqrt(sumSqDiff / effPeriod);
    upper[i] = mid + deviation * stdDev;
    lower[i] = mid - deviation * stdDev;
  }
  return { upper, middle: sma, lower };
}

export function calculateVWAP(candles: Candle[]): (number|null)[] {
  if (!candles.length) return [];
  const result: (number|null)[] = Array(candles.length).fill(null);
  let cumTPV = 0, cumVol = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumVol += c.volume;
    result[i] = cumVol > 0 ? cumTPV / cumVol : tp;
  }
  return result;
}

export function calculateATR(candles: Candle[], period=14): (number|null)[] {
  if (!candles || candles.length === 0) return [];
  const p = Math.max(1, period);
  const result: (number|null)[] = Array(candles.length).fill(null);
  const tr = Array(candles.length).fill(0);
  tr[0] = Math.max(candles[0].high - candles[0].low, 0.0001);
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hpc = Math.abs(candles[i].high - candles[i-1].close);
    const lpc = Math.abs(candles[i].low - candles[i-1].close);
    tr[i] = Math.max(hl, hpc, lpc);
  }
  result[0] = tr[0];
  for (let i = 1; i < candles.length; i++) {
    const effPeriod = Math.min(p, i + 1);
    result[i] = (result[i-1]! * (effPeriod - 1) + tr[i]) / effPeriod;
  }
  return result;
}

export function calculateSupertrend(candles: Candle[], period=10, multiplier=3): SupertrendResult {
  const p = Math.max(1, period);
  const atr = calculateATR(candles, p);
  const values: (number|null)[] = Array(candles.length).fill(null);
  const directions: (boolean|null)[] = Array(candles.length).fill(null);
  if (!candles || candles.length === 0) return { values, directions };
  let prevUB = 0, prevLB = 0, prevST = 0;
  for (let i = 0; i < candles.length; i++) {
    const atrVal = atr[i] ?? Math.max(candles[i].high - candles[i].low, 0.0001);
    const hl2 = (candles[i].high + candles[i].low) / 2;
    let ub = hl2 + multiplier * atrVal;
    let lb = hl2 - multiplier * atrVal;
    if (i > 0) {
      if (!(lb > prevLB || candles[i-1].close < prevLB)) lb = prevLB;
      if (!(ub < prevUB || candles[i-1].close > prevUB)) ub = prevUB;
      const dir = prevST === prevUB ? candles[i].close > ub : candles[i].close >= lb;
      const st = dir ? lb : ub;
      values[i] = st; directions[i] = dir; prevST = st;
    } else {
      const dir = candles[i].close >= hl2;
      const st = dir ? lb : ub;
      values[i] = st; directions[i] = dir; prevST = st;
    }
    prevUB = ub; prevLB = lb;
  }
  return { values, directions };
}

export function calculateStochastic(candles: Candle[], kPeriod=14, dPeriod=3): StochasticResult {
  const sz = candles.length;
  const kLine: (number|null)[] = Array(sz).fill(null);
  const dLine: (number|null)[] = Array(sz).fill(null);
  if (sz === 0) return { kLine, dLine };

  const kp = Math.max(1, kPeriod);
  const dp = Math.max(1, dPeriod);

  for (let i = 0; i < sz; i++) {
    const effK = Math.min(kp, i + 1);
    let hh = -Infinity, ll = Infinity;
    for (let j = i - effK + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high);
      ll = Math.min(ll, candles[j].low);
    }
    const range = hh - ll;
    kLine[i] = range > 0 ? ((candles[i].close - ll) / range) * 100 : 50;
  }

  for (let i = 0; i < sz; i++) {
    const effD = Math.min(dp, i + 1);
    let sum = 0;
    for (let j = i - effD + 1; j <= i; j++) {
      sum += kLine[j] ?? 50;
    }
    dLine[i] = sum / effD;
  }
  return { kLine, dLine };
}

export function calculateIchimoku(candles: Candle[], tenkanP=9, kijunP=26, senkouBP=52): IchimokuResult {
  const sz = candles.length;
  const tenkanSen: (number|null)[] = Array(sz).fill(null);
  const kijunSen: (number|null)[] = Array(sz).fill(null);
  const senkouSpanA: (number|null)[] = Array(sz + kijunP).fill(null);
  const senkouSpanB: (number|null)[] = Array(sz + kijunP).fill(null);
  const chikouSpan: (number|null)[] = Array(sz).fill(null);
  if (sz === 0) return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan };

  function midpoint(end: number, period: number): number {
    const effP = Math.min(period, end + 1);
    let hh = -Infinity, ll = Infinity;
    for (let j = end - effP + 1; j <= end; j++) {
      hh = Math.max(hh, candles[j].high);
      ll = Math.min(ll, candles[j].low);
    }
    return (hh + ll) / 2;
  }

  for (let i = 0; i < sz; i++) {
    tenkanSen[i] = midpoint(i, tenkanP);
    kijunSen[i] = midpoint(i, kijunP);
    const t = tenkanSen[i]!, k = kijunSen[i]!;
    senkouSpanA[i + kijunP] = (t + k) / 2;
    senkouSpanB[i + kijunP] = midpoint(i, senkouBP);
    const pi = i - kijunP;
    if (pi >= 0) chikouSpan[pi] = candles[i].close;
    else chikouSpan[i] = candles[i].close;
  }
  for (let i = 0; i < Math.min(kijunP, sz); i++) {
    senkouSpanA[i] = (tenkanSen[i]! + kijunSen[i]!) / 2;
    senkouSpanB[i] = midpoint(i, senkouBP);
  }
  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan };
}

export function calculateCVD(candles: Candle[]): CvdResult {
  if (!candles.length) return { cvdLine: [], deltaBars: [] };
  const deltaBars: (number|null)[] = [];
  const cvdLine: (number|null)[] = [];
  let cum = 0;
  for (const c of candles) {
    const range = c.high - c.low;
    const delta = range > 0 ? c.volume * ((c.close - c.low) / range - (c.high - c.close) / range) : 0;
    cum += delta; deltaBars.push(delta); cvdLine.push(cum);
  }
  return { cvdLine, deltaBars };
}

export function calculateVolumeProfile(candles: Candle[], priceMin: number, priceMax: number, bucketCount=40): VolumeProfileData {
  if (!candles.length || priceMin >= priceMax || bucketCount <= 0) return { buckets: [], pocPrice: 0, vahPrice: 0, valPrice: 0, maxBucketVolume: 0 };
  const step = (priceMax - priceMin) / bucketCount;
  const buckets: VolumeProfileBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    priceLow: priceMin + i * step, priceHigh: priceMin + (i + 1) * step, buyVolume: 0, sellVolume: 0, totalVolume: 0
  }));
  for (const c of candles) {
    if (c.high < priceMin || c.low > priceMax) continue;
    const range = Math.max(c.high - c.low, 1e-9);
    const buyFrac = Math.min(1, Math.max(0, (c.close - c.low) / range));
    const buyVol = c.volume * buyFrac, sellVol = c.volume * (1 - buyFrac);
    for (let i = 0; i < bucketCount; i++) {
      const b = buckets[i];
      const oLow = Math.max(b.priceLow, c.low), oHigh = Math.min(b.priceHigh, c.high);
      if (oHigh > oLow) {
        const portion = (oHigh - oLow) / range;
        b.buyVolume += buyVol * portion; b.sellVolume += sellVol * portion; b.totalVolume += (buyVol + sellVol) * portion;
      }
    }
  }
  let maxVol = 0, pocIdx = 0, totalVol = 0;
  buckets.forEach((b, i) => { totalVol += b.totalVolume; if (b.totalVolume > maxVol) { maxVol = b.totalVolume; pocIdx = i; } });
  const pocPrice = (buckets[pocIdx].priceLow + buckets[pocIdx].priceHigh) / 2;
  const targetVaVol = totalVol * 0.70;
  let curVaVol = maxVol, vaLow = pocIdx, vaHigh = pocIdx;
  while (curVaVol < targetVaVol && (vaLow > 0 || vaHigh < bucketCount - 1)) {
    const nL = vaLow > 0 ? buckets[vaLow - 1].totalVolume : -1;
    const nH = vaHigh < bucketCount - 1 ? buckets[vaHigh + 1].totalVolume : -1;
    if (nH >= nL && nH >= 0) { vaHigh++; curVaVol += nH; }
    else if (nL >= 0) { vaLow--; curVaVol += nL; }
    else break;
  }
  return { buckets, pocPrice, vahPrice: buckets[vaHigh].priceHigh, valPrice: buckets[vaLow].priceLow, maxBucketVolume: maxVol };
}

// EMA Ribbon (4 EMAs: 20, 50, 100, 200)
export function calculateEmaRibbon(candles: Candle[], p1 = 20, p2 = 50, p3 = 100, p4 = 200) {
  return {
    ema20: calculateEMA(candles, p1),
    ema50: calculateEMA(candles, p2),
    ema100: calculateEMA(candles, p3),
    ema200: calculateEMA(candles, p4),
  };
}

// Pivot Points (Standard Daily / Swing Pivots: P, R1-R3, S1-S3)
export function calculatePivotPoints(candles: Candle[], lookback = 15) {
  const sz = candles.length;
  const result: {
    pivot: (number|null)[];
    r1: (number|null)[];
    r2: (number|null)[];
    r3: (number|null)[];
    s1: (number|null)[];
    s2: (number|null)[];
    s3: (number|null)[];
  } = {
    pivot: Array(sz).fill(null),
    r1: Array(sz).fill(null),
    r2: Array(sz).fill(null),
    r3: Array(sz).fill(null),
    s1: Array(sz).fill(null),
    s2: Array(sz).fill(null),
    s3: Array(sz).fill(null),
  };
  if (sz === 0) return result;

  for (let i = 0; i < sz; i++) {
    const effLb = Math.min(lookback, Math.max(1, i));
    let hh = -Infinity, ll = Infinity;
    const startJ = Math.max(0, i - effLb);
    for (let j = startJ; j <= i; j++) {
      hh = Math.max(hh, candles[j].high);
      ll = Math.min(ll, candles[j].low);
    }
    const cc = candles[i].close;
    const p = (hh + ll + cc) / 3;
    const rng = hh - ll;
    result.pivot[i] = p;
    result.r1[i] = 2 * p - ll;
    result.s1[i] = 2 * p - hh;
    result.r2[i] = p + rng;
    result.s2[i] = p - rng;
    result.r3[i] = hh + 2 * (p - ll);
    result.s3[i] = ll - 2 * (hh - p);
  }
  return result;
}

// Donchian Channels
export function calculateDonchian(candles: Candle[], period = 20) {
  const p = Math.max(1, period);
  const upper: (number|null)[] = Array(candles.length).fill(null);
  const middle: (number|null)[] = Array(candles.length).fill(null);
  const lower: (number|null)[] = Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const effPeriod = Math.min(p, i + 1);
    let hh = -Infinity, ll = Infinity;
    for (let j = i - effPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high);
      ll = Math.min(ll, candles[j].low);
    }
    upper[i] = hh;
    lower[i] = ll;
    middle[i] = (hh + ll) / 2;
  }
  return { upper, middle, lower };
}

// Hull Moving Average (HMA)
export function calculateHMA(candles: Candle[], period = 9): (number|null)[] {
  if (!candles || candles.length === 0) return [];
  const p = Math.max(1, period);

  function wma(values: number[], len: number): (number|null)[] {
    const res: (number|null)[] = Array(values.length).fill(null);
    for (let i = 0; i < values.length; i++) {
      const effLen = Math.min(len, i + 1);
      const weightSum = (effLen * (effLen + 1)) / 2;
      let sum = 0;
      for (let j = 0; j < effLen; j++) {
        sum += values[i - effLen + 1 + j] * (j + 1);
      }
      res[i] = sum / weightSum;
    }
    return res;
  }

  const closes = candles.map(c => c.close);
  const halfLen = Math.max(1, Math.floor(p / 2));
  const sqrtLen = Math.max(1, Math.floor(Math.sqrt(p)));

  const wmaHalf = wma(closes, halfLen);
  const wmaFull = wma(closes, p);

  const diffSeries: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const h = wmaHalf[i] ?? closes[i];
    const f = wmaFull[i] ?? closes[i];
    diffSeries.push(2 * h - f);
  }

  return wma(diffSeries, sqrtLen);
}

// Chaikin Money Flow (CMF)
export function calculateCMF(candles: Candle[], period = 20): (number|null)[] {
  if (!candles || candles.length === 0) return [];
  const p = Math.max(1, period);
  const res: (number|null)[] = Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    const effPeriod = Math.min(p, i + 1);
    let mfvSum = 0;
    let volSum = 0;
    for (let j = i - effPeriod + 1; j <= i; j++) {
      const c = candles[j];
      const range = c.high - c.low;
      const mfm = range > 0 ? ((c.close - c.low) - (c.high - c.close)) / range : 0;
      mfvSum += mfm * c.volume;
      volSum += c.volume;
    }
    res[i] = volSum > 0 ? mfvSum / volSum : 0;
  }
  return res;
}

export function detectSMC(candles: Candle[], config?: Partial<SmcConfig>): SmcAnalysis {
  return calculateSMC(candles, config);
}


export function calculateParabolicSAR(candles: Candle[], step=0.02, maxAf=0.20): (number|null)[] {
  if (!candles || candles.length === 0) return [];
  const sar: (number|null)[] = Array(candles.length).fill(null);
  sar[0] = candles[0].low;
  if (candles.length === 1) return sar;

  let isUp = candles[1].close > candles[0].close;
  let ep = isUp ? Math.max(candles[0].high, candles[1].high) : Math.min(candles[0].low, candles[1].low);
  let af = step;
  sar[1] = isUp ? Math.min(candles[0].low, candles[1].low) : Math.max(candles[0].high, candles[1].high);
  for (let i = 2; i < candles.length; i++) {
    const prev = sar[i-1]!;
    let cur = prev + af * (ep - prev);
    if (isUp) {
      cur = Math.min(cur, candles[i-1].low, candles[i-2].low);
      if (candles[i].low < cur) { isUp = false; sar[i] = ep; ep = candles[i].low; af = step; }
      else { sar[i] = cur; if (candles[i].high > ep) { ep = candles[i].high; af = Math.min(af + step, maxAf); } }
    } else {
      cur = Math.max(cur, candles[i-1].high, candles[i-2].high);
      if (candles[i].high > cur) { isUp = true; sar[i] = ep; ep = candles[i].high; af = step; }
      else { sar[i] = cur; if (candles[i].low < ep) { ep = candles[i].low; af = Math.min(af + step, maxAf); } }
    }
  }
  return sar;
}

export function calculateADX(candles: Candle[], period=14): AdxResult {
  const sz = candles.length;
  const plusDI: (number|null)[] = Array(sz).fill(null);
  const minusDI: (number|null)[] = Array(sz).fill(null);
  const adx: (number|null)[] = Array(sz).fill(null);
  if (sz === 0) return { plusDI, minusDI, adx };

  const p = Math.max(1, period);
  const tr = Array(sz).fill(0), plusDM = Array(sz).fill(0), minusDM = Array(sz).fill(0);
  tr[0] = Math.max(candles[0].high - candles[0].low, 0.0001);

  for (let i = 1; i < sz; i++) {
    const hd = candles[i].high - candles[i-1].high, ld = candles[i-1].low - candles[i].low;
    tr[i] = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i-1].close), Math.abs(candles[i].low - candles[i-1].close));
    plusDM[i] = (hd > ld && hd > 0) ? hd : 0;
    minusDM[i] = (ld > hd && ld > 0) ? ld : 0;
  }

  let trSum = tr[0], pDMSum = 0, mDMSum = 0;
  const dx: number[] = Array(sz).fill(0);

  plusDI[0] = 0;
  minusDI[0] = 0;
  adx[0] = 20;

  for (let i = 1; i < sz; i++) {
    const effP = Math.min(p, i + 1);
    trSum = (trSum * (effP - 1) + tr[i]) / effP;
    pDMSum = (pDMSum * (effP - 1) + plusDM[i]) / effP;
    mDMSum = (mDMSum * (effP - 1) + minusDM[i]) / effP;

    const pdi = trSum === 0 ? 0 : 100 * pDMSum / trSum;
    const mdi = trSum === 0 ? 0 : 100 * mDMSum / trSum;
    plusDI[i] = pdi;
    minusDI[i] = mdi;
    dx[i] = (pdi + mdi === 0) ? 0 : 100 * Math.abs(pdi - mdi) / (pdi + mdi);

    const prevAdx = adx[i - 1] ?? 20;
    adx[i] = (prevAdx * (effP - 1) + dx[i]) / effP;
  }
  return { plusDI, minusDI, adx };
}

export function calculateOBV(candles: Candle[]): (number|null)[] {
  if (!candles.length) return [];
  const obv: (number|null)[] = Array(candles.length).fill(null);
  let cur = 0; obv[0] = 0;
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i-1].close) cur += candles[i].volume;
    else if (candles[i].close < candles[i-1].close) cur -= candles[i].volume;
    obv[i] = cur;
  }
  return obv;
}

export function calculateCCI(candles: Candle[], period=20): (number|null)[] {
  const sz = candles.length;
  const cci: (number|null)[] = Array(sz).fill(null);
  if (sz === 0) return cci;
  const p = Math.max(1, period);
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);

  for (let i = 0; i < sz; i++) {
    const effPeriod = Math.min(p, i + 1);
    let sum = 0;
    for (let j = i - effPeriod + 1; j <= i; j++) sum += tp[j];
    const sma = sum / effPeriod;
    let mdSum = 0;
    for (let j = i - effPeriod + 1; j <= i; j++) mdSum += Math.abs(tp[j] - sma);
    const md = mdSum / effPeriod;
    cci[i] = md === 0 ? 0 : (tp[i] - sma) / (0.015 * md);
  }
  return cci;
}

export function calculateWilliamsR(candles: Candle[], period=14): (number|null)[] {
  const sz = candles.length;
  const r: (number|null)[] = Array(sz).fill(null);
  if (sz === 0) return r;
  const p = Math.max(1, period);

  for (let i = 0; i < sz; i++) {
    const effPeriod = Math.min(p, i + 1);
    let hh = -Infinity, ll = Infinity;
    for (let j = i - effPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high);
      ll = Math.min(ll, candles[j].low);
    }
    const d = hh - ll;
    r[i] = d === 0 ? -50 : ((hh - candles[i].close) / d) * -100;
  }
  return r;
}

export function calculateMFI(candles: Candle[], period=14): (number|null)[] {
  const sz = candles.length;
  const mfi: (number|null)[] = Array(sz).fill(null);
  if (sz === 0) return mfi;
  const p = Math.max(1, period);
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);
  const rmf = candles.map((c, i) => tp[i] * c.volume);
  mfi[0] = 50;

  for (let i = 1; i < sz; i++) {
    const effPeriod = Math.min(p, i);
    let pos = 0, neg = 0;
    for (let j = i - effPeriod + 1; j <= i; j++) {
      if (tp[j] > tp[j - 1]) pos += rmf[j];
      else if (tp[j] < tp[j - 1]) neg += rmf[j];
    }
    mfi[i] = neg === 0 ? 100 : (pos === 0 ? 0 : 100 - 100 / (1 + pos / neg));
  }
  return mfi;
}

export function toHeikinAshi(candles: Candle[]): Candle[] {
  if (!candles.length) return [];
  const result: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (result[i-1].open + result[i-1].close) / 2;
    result.push({ open: haOpen, high: Math.max(c.high, haOpen, haClose), low: Math.min(c.low, haOpen, haClose), close: haClose, openTime: c.openTime, volume: c.volume });
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RENDERER
// ═══════════════════════════════════════════════════════════════════════════

export function renderChart(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  options: ChartOptions,
  view: ViewState,
  crosshair: Crosshair | null,
  dpr: number
) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const RM = CHART_RIGHT_MARGIN * dpr;  // institutional right price axis margin
  const BM = CHART_BOTTOM_MARGIN * dpr; // institutional bottom time axis margin

  // Panel layout
  const panelInds = options.indicators.filter(i => !isOverlay(i.type) && i.enabled);
  const hasVolPanel = options.showVolumePanel;
  const totalPanels = panelInds.length + (hasVolPanel ? 1 : 0);
  const panelH = totalPanels === 0 ? 0 : Math.min(H * 0.38, totalPanels * 95 * dpr);
  const chartH = H - panelH - BM;
  const chartW = W - RM;

  const { startIdx, endIdx } = view;
  const visCnt = endIdx - startIdx;
  if (visCnt <= 0 || candles.length === 0) return;

  const candleW = chartW / visCnt;
  const safeStart = Math.max(0, startIdx);
  const safeEnd = Math.min(endIdx, candles.length);

  // Price range with 5% padding & rogue spike protection
  const { pMin, pMax, pRange, minValidBound, maxValidBound } = computeChartPriceBounds(
    candles,
    startIdx,
    endIdx,
    options.currentPriceOverride,
    options.scaleState?.priceOffset || 0,
    options.scaleState?.priceScaleRatio || 1.0
  );

  function priceToY(p: number): number { return chartH - ((p - pMin) / pRange * chartH); }

  // Clear canvas with crisp white background
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Timeframe detection
  const firstMs = candles.length > 0 ? candles[0].openTime : 0;
  const lastMs = candles.length > 0 ? candles[candles.length - 1].openTime : 0;
  const avgDur = candles.length > 1 ? Math.abs(lastMs - firstMs) / (candles.length - 1) : 86400000;
  const tf = options.timeframe.toUpperCase();
  const isDailyOrHigher = ['1D','D','1W','W','1M','M'].includes(tf) || avgDur >= 20 * 3600000;

  // ── LAYER 1: Grid & Axes (Light Mode with Institutional Nice Numbers) ──
  ctx.save();
  const tvFontStack = TV_FONT_STACK;
  const gridDash = [Math.max(1, 1.5 * dpr), Math.max(1.5, 2 * dpr)];
  ctx.setLineDash(gridDash);
  ctx.lineWidth = 1 * dpr;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.font = `500 ${11 * dpr}px ${tvFontStack}`;
  ctx.fillStyle = '#787B86';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const priceTicks = computeNicePriceTicks(pMin, pMax, 6);
  for (const price of priceTicks) {
    const y = Math.round(priceToY(price));
    if (y < 8 * dpr || y > chartH - 8 * dpr) continue;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartW, y);
    ctx.stroke();
    ctx.fillText(formatPrice(price), W - 8 * dpr, y);
  }

  // Vertical grid + uniform calendar-aligned date/time labels
  const timeTicks = computeCalendarTimeTicks(candles, startIdx, endIdx, chartW, candleW, isDailyOrHigher, dpr);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const tick of timeTicks) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.beginPath();
    ctx.moveTo(tick.x, 0);
    ctx.lineTo(tick.x, chartH);
    ctx.stroke();

    ctx.save();
    if (tick.isYear) {
      ctx.font = `bold ${11 * dpr}px ${tvFontStack}`;
      ctx.fillStyle = '#1E293B';
    } else {
      ctx.font = `500 ${11 * dpr}px ${tvFontStack}`;
      ctx.fillStyle = '#787B86';
    }
    ctx.fillText(tick.label, tick.x, chartH + BM / 2);
    ctx.restore();
  }

  // Solid separators for right price scale and bottom time scale
  ctx.setLineDash([]);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, chartH + BM); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, chartH); ctx.lineTo(W, chartH); ctx.stroke();
  ctx.restore();

  // ── LAYER 1.5: Top-Left Corner (Synthetix Analytics) ──
  ctx.save();
  ctx.font = `800 ${11 * dpr}px ${tvFontStack}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(100, 116, 139, 0.35)';
  ctx.fillText('SYNTHETIX ANALYTICS', 14 * dpr, 12 * dpr);
  ctx.restore();

  // ── LAYER 2: Volume Profile (VPVR) ────────────────────────────────────
  if (options.showVolumeProfile) {
    const visCandles = candles.slice(safeStart, safeEnd);
    const vpData = calculateVolumeProfile(visCandles, pMin, pMax, 40);
    if (vpData.buckets.length > 0 && vpData.maxBucketVolume > 0) {
      const maxBarW = chartW * 0.22;
      for (const b of vpData.buckets) {
        const yT = priceToY(b.priceHigh), yB = priceToY(b.priceLow);
        const barH = Math.max(Math.abs(yB - yT) - 0.5, 1);
        const y = Math.min(yT, yB);
        const inVA = b.priceLow >= vpData.valPrice && b.priceHigh <= vpData.vahPrice;
        const alphaM = inVA ? 1 : 0.4;
        const totalFrac = Math.min(1, b.totalVolume / vpData.maxBucketVolume);
        const barTW = maxBarW * totalFrac;
        const buyR = b.totalVolume > 0 ? b.buyVolume / b.totalVolume : 0.5;
        const buyW = barTW * buyR, sellW = barTW - buyW;
        ctx.fillStyle = `rgba(0,230,118,${0.45*alphaM})`; ctx.fillRect(0, y, buyW, barH);
        ctx.fillStyle = `rgba(255,23,68,${0.45*alphaM})`; ctx.fillRect(buyW, y, sellW, barH);
      }
      // VAH/VAL/POC lines
      if (vpData.vahPrice >= pMin && vpData.vahPrice <= pMax) {
        const vy = priceToY(vpData.vahPrice);
        ctx.save(); ctx.setLineDash([4*dpr,4*dpr]); ctx.strokeStyle='rgba(66,165,245,0.7)'; ctx.lineWidth=1*dpr;
        ctx.beginPath(); ctx.moveTo(0,vy); ctx.lineTo(chartW,vy); ctx.stroke(); ctx.setLineDash([]);
        ctx.font=`bold ${8*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle='rgba(66,165,245,0.9)'; ctx.textAlign='right';
        ctx.fillText(`VAH: ${formatPrice(vpData.vahPrice)}`, chartW-4*dpr, vy-4*dpr); ctx.restore();
      }
      if (vpData.valPrice >= pMin && vpData.valPrice <= pMax) {
        const vy = priceToY(vpData.valPrice);
        ctx.save(); ctx.setLineDash([4*dpr,4*dpr]); ctx.strokeStyle='rgba(66,165,245,0.7)'; ctx.lineWidth=1*dpr;
        ctx.beginPath(); ctx.moveTo(0,vy); ctx.lineTo(chartW,vy); ctx.stroke(); ctx.setLineDash([]);
        ctx.font=`bold ${8*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle='rgba(66,165,245,0.9)'; ctx.textAlign='right';
        ctx.fillText(`VAL: ${formatPrice(vpData.valPrice)}`, chartW-4*dpr, vy+2*dpr); ctx.restore();
      }
      if (vpData.pocPrice >= pMin && vpData.pocPrice <= pMax) {
        const py = priceToY(vpData.pocPrice);
        ctx.save(); ctx.strokeStyle='#FF5252'; ctx.lineWidth=1.5*dpr;
        ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(chartW,py); ctx.stroke();
        ctx.font=`900 ${8*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle='#FF5252'; ctx.textAlign='left';
        ctx.fillText(`POC: ${formatPrice(vpData.pocPrice)}`, 4*dpr, py-4*dpr); ctx.restore();
      }
    }
  }

  // ── LAYER 3: Smart Money Concepts (SMC) Overlays ──
  const smcCfg = options.smcConfig || (options.showSmcOverlay ? DEFAULT_SMC_CONFIG : null);
  if (smcCfg && smcCfg.enabled) {
    const smcData = calculateSMC(candles, smcCfg);

    // 1. Premium & Discount Zones (Dealing Range)
    if (smcCfg.showPremiumDiscount && smcData.dealingRange.highPrice > smcData.dealingRange.lowPrice) {
      const dr = smcData.dealingRange;
      const yHigh = Math.max(0, Math.min(chartH, priceToY(dr.highPrice)));
      const yLow = Math.max(0, Math.min(chartH, priceToY(dr.lowPrice)));
      const yEq = Math.max(0, Math.min(chartH, priceToY(dr.equilibriumPrice)));

      ctx.save();
      // Premium Zone (>50% to High) - Subtle Red/Rose Tint
      if (yEq > yHigh) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.04)';
        ctx.fillRect(0, yHigh, chartW, yEq - yHigh);
        ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = 'rgba(244, 63, 94, 0.5)';
        ctx.textAlign = 'right';
        ctx.fillText('PREMIUM (Sell Zone)', chartW - 8 * dpr, yHigh + 10 * dpr);
      }

      // Discount Zone (<50% to Low) - Subtle Emerald/Green Tint
      if (yLow > yEq) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
        ctx.fillRect(0, yEq, chartW, yLow - yEq);
        ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
        ctx.textAlign = 'right';
        ctx.fillText('DISCOUNT (Buy Zone)', chartW - 8 * dpr, yLow - 4 * dpr);
      }

      // OTE (Optimal Trade Entry 61.8% to 78.6%)
      if (smcCfg.showOte && dr.oteRange[0] > 0 && dr.oteRange[1] > 0) {
        const yOte1 = priceToY(dr.oteRange[0]);
        const yOte2 = priceToY(dr.oteRange[1]);
        const oteTop = Math.min(yOte1, yOte2);
        const oteH = Math.max(Math.abs(yOte1 - yOte2), 2 * dpr);
        ctx.fillStyle = 'rgba(217, 119, 6, 0.06)';
        ctx.fillRect(0, oteTop, chartW, oteH);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
        ctx.lineWidth = 0.8 * dpr;
        ctx.strokeRect(0, oteTop, chartW, oteH);
        ctx.font = `bold ${6.5 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = 'rgba(217, 119, 6, 0.7)';
        ctx.textAlign = 'left';
        ctx.fillText('OTE (61.8% - 78.6%)', 10 * dpr, oteTop + oteH / 2 + 2 * dpr);
      }
      ctx.restore();
    }

    // 2. Equilibrium Midline (EQ 50% — Golden Dash)
    if (smcCfg.showEquilibrium && smcData.equilibriumPrice > 0 && smcData.equilibriumPrice >= pMin && smcData.equilibriumPrice <= pMax) {
      const eqY = priceToY(smcData.equilibriumPrice);
      ctx.save();
      ctx.setLineDash([8 * dpr, 6 * dpr]);
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.75)';
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, eqY);
      ctx.lineTo(chartW, eqY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
      ctx.fillStyle = '#D97706';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`EQ (50%): ${formatPrice(smcData.equilibriumPrice)}`, 10 * dpr, eqY - 3 * dpr);
      ctx.restore();
    }

    // 3. Swing Point Labels (HH, HL, LH, LL)
    if (smcCfg.showSwings && smcData.swings) {
      ctx.save();
      for (const sw of smcData.swings) {
        if (sw.index < startIdx || sw.index >= endIdx) continue;
        const li = sw.index - startIdx;
        const x = li * candleW + candleW / 2;
        const y = priceToY(sw.price);
        const isH = sw.isHigh;

        ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = isH ? 'bottom' : 'top';
        ctx.fillStyle = isH ? '#E11D48' : '#059669';
        const yOffset = isH ? -4 * dpr : 4 * dpr;
        ctx.fillText(sw.type, x, y + yOffset);
      }
      ctx.restore();
    }

    // 4. Order Blocks & Breakers (Demand, Supply, Breakers)
    const blocksToRender = [
      ...(smcCfg.showBullishOb || smcCfg.showBearishOb ? smcData.orderBlocks : []),
      ...(smcCfg.showBreakers ? smcData.breakers : []),
    ];
    for (const ob of blocksToRender) {
      if (ob.isBreaker && !smcCfg.showBreakers) continue;
      if (!ob.isBreaker && ob.isBullish && !smcCfg.showBullishOb) continue;
      if (!ob.isBreaker && !ob.isBullish && !smcCfg.showBearishOb) continue;
      if (ob.isMitigated && !smcCfg.showMitigatedOb) continue;
      if (ob.endIndex < startIdx || ob.startIndex > endIdx) continue;

      const ls = Math.max(0, ob.startIndex - startIdx);
      const le = Math.min(visCnt, ob.endIndex - startIdx);
      const lx = ls * candleW;
      const rx = le * candleW + candleW;
      const bw = Math.max(rx - lx, candleW);
      const yT = priceToY(ob.topPrice);
      const yB = priceToY(ob.bottomPrice);
      const bTop = Math.min(yT, yB);
      const bH = Math.max(Math.abs(yT - yB), 3 * dpr);

      let obColor = ob.isBullish ? '#0284C7' : '#EA580C';
      let obBg = ob.isBullish ? 'rgba(2, 132, 199, 0.16)' : 'rgba(234, 88, 12, 0.16)';
      let obBorder = ob.isBullish ? 'rgba(2, 132, 199, 0.55)' : 'rgba(234, 88, 12, 0.55)';

      if (ob.isBreaker) {
        obColor = '#8B5CF6';
        obBg = 'rgba(139, 92, 246, 0.16)';
        obBorder = 'rgba(139, 92, 246, 0.55)';
      }

      ctx.save();
      ctx.fillStyle = obBg;
      ctx.fillRect(lx, bTop, bw, bH);
      ctx.strokeStyle = obBorder;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(lx, bTop, bw, bH);

      if (bw > 25 * dpr) {
        ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = obColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(ob.label || (ob.isBullish ? 'OB (Demand)' : 'OB (Supply)'), lx + 4 * dpr, bTop + 2 * dpr);
      }
      ctx.restore();
    }

    // 5. Fair Value Gaps (FVGs)
    for (const fvg of smcData.fvgs) {
      if (fvg.isBullish && !smcCfg.showBullishFvg) continue;
      if (!fvg.isBullish && !smcCfg.showBearishFvg) continue;
      if (fvg.isMitigated && !smcCfg.showMitigatedFvg) continue;
      if (fvg.endIndex < startIdx || fvg.startIndex > endIdx) continue;

      const ls = Math.max(0, fvg.startIndex - startIdx);
      const le = Math.min(visCnt, fvg.endIndex - startIdx);
      const lx = ls * candleW;
      const rx = le * candleW + candleW;
      const bw = Math.max(rx - lx, candleW);
      const yT = priceToY(fvg.topPrice);
      const yB = priceToY(fvg.bottomPrice);
      const bTop = Math.min(yT, yB);
      const bH = Math.max(Math.abs(yT - yB), 2 * dpr);
      const base = fvg.isBullish ? [0, 230, 118] : [255, 82, 82];
      const fa = fvg.isMitigated ? 0.05 : 0.18;
      const ba = fvg.isMitigated ? 0.15 : 0.45;

      ctx.save();
      ctx.fillStyle = `rgba(${base},${fa})`;
      ctx.fillRect(lx, bTop, bw, bH);
      ctx.strokeStyle = `rgba(${base},${ba})`;
      ctx.lineWidth = 0.8 * dpr;
      ctx.strokeRect(lx, bTop, bw, bH);

      // Consequent Encroachment (50% Midline)
      if (smcCfg.showFvgMidpoint && fvg.cePrice) {
        const yCe = priceToY(fvg.cePrice);
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.strokeStyle = `rgba(${base},0.6)`;
        ctx.lineWidth = 0.8 * dpr;
        ctx.beginPath();
        ctx.moveTo(lx, yCe);
        ctx.lineTo(lx + bw, yCe);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (!fvg.isMitigated && bw > 20 * dpr) {
        ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = `rgba(${base},0.85)`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(fvg.isBullish ? '+FVG' : '-FVG', lx + 2 * dpr, bTop + 1 * dpr);
      }
      ctx.restore();
    }

    // 6. Market Structure Breaks (BOS / CHoCH)
    for (const sb of smcData.structureBreaks) {
      const isBos = sb.breakType === 'BOS';
      const isChoch = sb.breakType === 'CHoCH' || sb.breakType === 'MSS';
      if (isBos && !smcCfg.showBos) continue;
      if (isChoch && !smcCfg.showChoch) continue;
      if (sb.candleIndex >= startIdx && sb.candleIndex < endIdx && sb.price >= pMin && sb.price <= pMax) {
        const y = priceToY(sb.price);
        const color = sb.isBullish ? BULL : BEAR;
        ctx.save();
        ctx.setLineDash([5 * dpr, 4 * dpr]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.1 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartW, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = `900 ${7.5 * dpr}px "JetBrains Mono",monospace`;
        const text = sb.type;
        const tm = ctx.measureText(text);
        const tw = tm.width + 6 * dpr;
        const th = 11 * dpr;
        const tx = chartW - tw - 4 * dpr;
        const ty = y - th / 2;

        ctx.fillStyle = sb.isBullish ? 'rgba(0, 163, 92, 0.15)' : 'rgba(225, 29, 72, 0.15)';
        ctx.fillRect(tx, ty, tw, th);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8 * dpr;
        ctx.strokeRect(tx, ty, tw, th);

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tx + tw / 2, y);
        ctx.restore();
      }
    }

    // 7. Liquidity Levels (BSL, SSL, EQH, EQL)
    if (smcCfg.showLiquidityLevels && smcData.liquidityLevels) {
      for (const lvl of smcData.liquidityLevels) {
        if (lvl.price >= pMin && lvl.price <= pMax) {
          const y = priceToY(lvl.price);
          const isHighSide = lvl.type === 'BSL' || lvl.type === 'EQH';
          const color = isHighSide ? 'rgba(244, 63, 94, 0.6)' : 'rgba(16, 185, 129, 0.6)';

          ctx.save();
          ctx.setLineDash([2 * dpr, 4 * dpr]);
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.9 * dpr;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartW - 60 * dpr, y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = `bold ${6.5 * dpr}px "JetBrains Mono",monospace`;
          ctx.fillStyle = color;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(lvl.label, chartW - 65 * dpr, y - 2 * dpr);
          ctx.restore();
        }
      }
    }

    // 8. Liquidity Sweeps
    if (smcCfg.showSweeps) {
      for (const sw of smcData.sweeps) {
        if (sw.candleIndex >= startIdx && sw.candleIndex < endIdx) {
          const li = sw.candleIndex - startIdx;
          const x = li * candleW + candleW / 2;
          const y = priceToY(sw.price);
          ctx.save();
          ctx.font = `900 ${7 * dpr}px "JetBrains Mono",monospace`;
          ctx.textAlign = 'center';
          if (sw.isHighSweep) {
            ctx.fillStyle = BEAR;
            ctx.textBaseline = 'bottom';
            ctx.fillText('▼ BSL', x, y - 3 * dpr);
          } else {
            ctx.fillStyle = BULL;
            ctx.textBaseline = 'top';
            ctx.fillText('▲ SSL', x, y + 2 * dpr);
          }
          ctx.restore();
        }
      }
    }

    // 9. Session Levels (PDH, PDL)
    if (smcCfg.showPdhPdl && smcData.sessionLevels) {
      const { pdh, pdl } = smcData.sessionLevels;
      ctx.save();
      if (pdh && pdh >= pMin && pdh <= pMax) {
        const yPdh = priceToY(pdh);
        ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, yPdh);
        ctx.lineTo(chartW, yPdh);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = '#3B82F6';
        ctx.textAlign = 'left';
        ctx.fillText(`PDH: ${formatPrice(pdh)}`, 12 * dpr, yPdh - 2 * dpr);
      }
      if (pdl && pdl >= pMin && pdl <= pMax) {
        const yPdl = priceToY(pdl);
        ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, yPdl);
        ctx.lineTo(chartW, yPdl);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = '#3B82F6';
        ctx.textAlign = 'left';
        ctx.fillText(`PDL: ${formatPrice(pdl)}`, 12 * dpr, yPdl + 9 * dpr);
      }
      ctx.restore();
    }
  }


  // ── LAYER 4: Volume Overlay (behind candles - quiet opacity & anchored baseline divider) ──
  if (options.showVolume && !options.showVolumePanel) {
    const volHeightRatio = 0.13; // locked to 13% of canvas height
    const volH = chartH * volHeightRatio;
    const volDividerY = Math.floor(chartH - volH) + 0.5; // razor-sharp 1px baseline line

    ctx.save();
    // 1px anchored baseline divider across volume pane
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, volDividerY);
    ctx.lineTo(chartW, volDividerY);
    ctx.stroke();
    ctx.restore();

    const volGap = Math.max(1.5 * dpr, Math.min(3 * dpr, candleW * 0.25));
    const volBodyW = Math.max(1 * dpr, candleW - volGap);
    let maxV = 0;
    for (let i = safeStart; i < safeEnd; i++) maxV = Math.max(maxV, candles[i].volume);
    if (maxV > 0) {
      for (let i = safeStart; i < safeEnd; i++) {
        const li = i - startIdx;
        const x = Math.round(li * candleW + (candleW - volBodyW) / 2);
        const c = candles[i];
        const ratio = Math.min(1, Math.max(0.06, c.volume / maxV));
        const barH = Math.round(ratio * volH * 0.95);
        const bTop = Math.round(chartH - barH);
        const bull = c.close >= c.open;
        ctx.fillStyle = bull ? 'rgba(8, 153, 129, 0.28)' : 'rgba(242, 54, 69, 0.28)';
        ctx.fillRect(x, bTop, Math.max(1, Math.round(volBodyW)), barH);
      }
    }
  }

  // ── LAYER 5: Candles ──────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, chartW, chartH); ctx.clip();

  const haCandles = options.chartType === 'HEIKIN_ASHI' ? toHeikinAshi(candles) : candles;
  const drawCandles = options.chartType === 'HEIKIN_ASHI' ? haCandles : candles;

  if (options.chartType === 'LINE') {
    ctx.beginPath(); let started = false;
    for (let i = safeStart; i < safeEnd; i++) {
      const x = (i-startIdx)*candleW + candleW/2, y = priceToY(candles[i].close);
      if (!started) { ctx.moveTo(x,y); started=true; } else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 1.5*dpr; ctx.stroke();
  } else if (options.chartType === 'AREA') {
    const pts: {x:number;y:number}[] = [];
    for (let i = safeStart; i < safeEnd; i++) {
      pts.push({ x: (i-startIdx)*candleW+candleW/2, y: priceToY(candles[i].close) });
    }
    if (pts.length > 1) {
      // Fill
      ctx.beginPath(); ctx.moveTo(pts[0].x, chartH);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length-1].x, chartH); ctx.closePath();
      ctx.fillStyle = 'rgba(66,165,245,0.12)'; ctx.fill();
      // Line
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 1.5*dpr; ctx.stroke();
    }
  } else {
    // Candlestick, Hollow, Heikin-Ashi
    const candleGap = Math.max(1.5 * dpr, Math.min(3 * dpr, candleW * 0.25));
    const bodyW = Math.max(1 * dpr, candleW - candleGap);
    const wickW = Math.max(1 * dpr, 1);
    const isHollow = options.chartType === 'HOLLOW_CANDLE';
    for (let i = safeStart; i < Math.min(safeEnd, drawCandles.length); i++) {
      const li = i - startIdx;
      const c = drawCandles[i];
      const isLastBar = i === drawCandles.length - 1;
      const isDislocated = (isLastBar && c.close > 0 && options.currentPriceOverride && options.currentPriceOverride > 0)
        ? Math.abs(options.currentPriceOverride - c.close) / c.close > 0.25
        : false;
      const effectiveClose = (isLastBar && options.currentPriceOverride && options.currentPriceOverride > 0 && !isDislocated)
        ? options.currentPriceOverride
        : c.close;
      const effectiveHigh = isLastBar ? Math.max(c.high, effectiveClose) : c.high;
      const effectiveLow = isLastBar ? Math.min(c.low, effectiveClose) : c.low;

      // Use actual OHLC values directly — data sanitization is handled upstream
      const barClose = effectiveClose;
      const barOpen = c.open;
      const barHigh = effectiveHigh;
      const barLow = effectiveLow;

      const isOriginalBear = (c.close < c.open);
      const bull = isOriginalBear ? false : (barClose >= barOpen);
      const color = bull ? BULL : BEAR;
      const strokeColor = bull ? '#067A67' : '#CF2232';
      const cx = li * candleW + candleW / 2;
      const hY = priceToY(barHigh), lY = priceToY(barLow);
      const oY = priceToY(barOpen), cY = priceToY(barClose);
      const bTop = Math.min(oY, cY), bBot = Math.max(oY, cY);
      const rawBodyH = bBot - bTop;
      const minBodyH = Math.max(2.5 * dpr, 2.5);
      const bH = Math.max(rawBodyH, minBodyH);
      const midY = (oY + cY) / 2;
      const renderTop = rawBodyH < minBodyH ? midY - minBodyH / 2 : bTop;

      // Sub-Pixel Line Drawing: +0.5px offset centers 1px wick on physical pixel row for razor sharpness
      const wickX = Math.floor(cx) + 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = wickW;
      ctx.beginPath();
      ctx.moveTo(wickX, Math.round(hY));
      ctx.lineTo(wickX, Math.round(lY));
      ctx.stroke();

      // Body (crisp rectangular institutional fill with subtle definition outer stroke)
      const bLeft = Math.round(cx - bodyW / 2);
      const rTop = Math.round(renderTop);
      const bWidth = Math.max(1, Math.round(bodyW));
      const bHeight = Math.max(1, Math.round(bH));
      if (isHollow && bull) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(bLeft, rTop, bWidth, bHeight);
        ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.2 * dpr, 1);
        ctx.strokeRect(bLeft, rTop, bWidth, bHeight);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(bLeft, rTop, bWidth, bHeight);
        // Subtle 1px outer stroke for high visual definition against light canvas
        if (bWidth >= 3 * dpr && bHeight >= 3 * dpr) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1 * dpr;
          ctx.strokeRect(bLeft + 0.5 * dpr, rTop + 0.5 * dpr, bWidth - 1 * dpr, bHeight - 1 * dpr);
        }
      }

      // Active Bar Highlight & Glow: Commercial terminal outline & close level pulse
      if (isLastBar) {
        ctx.save();
        // 1. Subtle 1px outline with soft glow on active forming candle body
        ctx.shadowColor = bull ? 'rgba(8, 153, 129, 0.45)' : 'rgba(242, 54, 69, 0.45)';
        ctx.shadowBlur = 5 * dpr;
        ctx.strokeStyle = bull ? '#089981' : '#F23645';
        ctx.lineWidth = 1.2 * dpr;
        ctx.strokeRect(bLeft - 0.5 * dpr, rTop - 0.5 * dpr, bWidth + 1 * dpr, bHeight + 1 * dpr);
        ctx.restore();

        // 2. Subtle glow and 1px live tick highlight on active close level
        ctx.save();
        const closeY = Math.round(cY) + 0.5;
        // Soft luminous glow on close level
        ctx.strokeStyle = bull ? 'rgba(8, 153, 129, 0.45)' : 'rgba(242, 54, 69, 0.45)';
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        ctx.moveTo(bLeft - 2 * dpr, closeY);
        ctx.lineTo(bLeft + bWidth + 2 * dpr, closeY);
        ctx.stroke();

        // Crisp 1px close tick marker indicating live stream update
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(bLeft - 1 * dpr, closeY);
        ctx.lineTo(bLeft + bWidth + 1 * dpr, closeY);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  ctx.restore();

  // ── LAYER 6: Current Price Line ───────────────────────────────────────
  if (candles.length > 0) {
    const lastC = candles[Math.min(endIdx-1, candles.length-1)];
    const curPrice = options.currentPriceOverride && options.currentPriceOverride > 0 ? options.currentPriceOverride : lastC.close;
    const bull = curPrice >= lastC.open;
    const accent = bull ? BULL : BEAR;
    const rawY = priceToY(curPrice);
    const clY = Math.max(2, Math.min(chartH - 2, rawY));

    // Dotted active tracker line across to price scale (TradingView standard)
    ctx.save();
    const lineY = Math.floor(clY) + 0.5;
    ctx.setLineDash([2 * dpr, 4 * dpr]);
    ctx.strokeStyle = bull ? 'rgba(8, 153, 129, 0.65)' : 'rgba(242, 54, 69, 0.65)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(chartW, lineY);
    ctx.stroke();
    ctx.restore();

    // Pill badge on right axis
    const prStr = formatPrice(curPrice);
    ctx.font = `bold ${11.5 * dpr}px ${TV_FONT_STACK}`;
    const tm = ctx.measureText(prStr);
    const padH = 6 * dpr, padV = 3.5 * dpr, dotR = 2.5 * dpr;
    const bW = Math.max(tm.width + padH * 2 + 10 * dpr, W - chartW - 4 * dpr);
    const bH2 = Math.round(11.5 * dpr + padV * 2);
    const bL = Math.round(chartW + 2 * dpr);
    const bT = Math.round(clY - bH2 / 2);
    // Pill bg
    ctx.fillStyle = accent;
    ctx.beginPath();
    const cr = 3.5 * dpr;
    ctx.moveTo(bL + cr, bT); ctx.lineTo(bL + bW - cr, bT); ctx.arcTo(bL + bW, bT, bL + bW, bT + cr, cr);
    ctx.lineTo(bL + bW, bT + bH2 - cr); ctx.arcTo(bL + bW, bT + bH2, bL + bW - cr, bT + bH2, cr);
    ctx.lineTo(bL + cr, bT + bH2); ctx.arcTo(bL, bT + bH2, bL, bT + bH2 - cr, cr);
    ctx.lineTo(bL, bT + cr); ctx.arcTo(bL, bT, bL + cr, bT, cr);
    ctx.closePath(); ctx.fill();
    // Live dot
    const txtColor = '#FFFFFF';
    ctx.fillStyle = txtColor;
    ctx.beginPath(); ctx.arc(bL + padH + dotR, Math.round(bT + bH2 / 2), dotR, 0, Math.PI * 2); ctx.fill();
    // Price text (high contrast bold white)
    ctx.fillStyle = txtColor;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(prStr, bL + padH + dotR * 2 + 3 * dpr, Math.round(bT + bH2 / 2));

    // ── Real-time Candle Countdown Timer (Clean stacked container with boundary clamping) ──
    const TF_DURATIONS: Record<string, number> = {
      '1M': 60_000,
      '5M': 300_000,
      '15M': 900_000,
      '30M': 1_800_000,
      '1H': 3_600_000,
      '4H': 14_400_000,
      '1D': 86_400_000,
      '1W': 604_800_000,
      'MONTH': 2_592_000_000,
    };
    const upperTf = options.timeframe.toUpperCase();
    const durKey = upperTf === '1M' && isDailyOrHigher ? 'MONTH' : upperTf;
    const barDuration = TF_DURATIONS[durKey] || (isDailyOrHigher ? 86_400_000 : 3_600_000);
    const nextClose = lastC.openTime + barDuration;
    const now = Date.now();
    const remainingMs = Math.max(0, nextClose - now);

    const totSecs = Math.floor(remainingMs / 1000);
    const cdDays = Math.floor(totSecs / 86400);
    const cdHours = Math.floor((totSecs % 86400) / 3600);
    const cdMins = Math.floor((totSecs % 3600) / 60);
    const cdSecs = totSecs % 60;

    let timerText = '';
    if (cdDays > 0) {
      timerText = `${cdDays}d ${cdHours}h`;
    } else if (cdHours > 0) {
      timerText = `${String(cdHours).padStart(2, '0')}:${String(cdMins).padStart(2, '0')}:${String(cdSecs).padStart(2, '0')}`;
    } else {
      timerText = `${String(cdMins).padStart(2, '0')}:${String(cdSecs).padStart(2, '0')}`;
    }

    const timerBadgeStr = `⏱ ${timerText}`;
    const tPadV = 2.5 * dpr;
    const tH = Math.round(9 * dpr + tPadV * 2);
    const tW = bW; // Perfectly matches width of price pill for clean vertical stacking
    const tL = bL;

    // Position 3px below price pill, or flip 3px above if near bottom scale
    const marginGap = Math.round(3 * dpr);
    let tT = bT + bH2 + marginGap;
    if (tT + tH > chartH - 8 * dpr) {
      tT = bT - tH - marginGap;
    }

    if (tT >= 2 * dpr && tT + tH <= H) {
      ctx.save();
      // Subtle deep slate pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.beginPath();
      const tcr = 3 * dpr;
      ctx.moveTo(tL + tcr, tT);
      ctx.lineTo(tL + tW - tcr, tT);
      ctx.arcTo(tL + tW, tT, tL + tW, tT + tcr, tcr);
      ctx.lineTo(tL + tW, tT + tH - tcr);
      ctx.arcTo(tL + tW, tT + tH, tL + tW - tcr, tT + tH, tcr);
      ctx.lineTo(tL + tcr, tT + tH);
      ctx.arcTo(tL, tT + tH, tL, tT + tH - tcr, tcr);
      ctx.lineTo(tL, tT + tcr);
      ctx.arcTo(tL, tT, tL + tcr, tT, tcr);
      ctx.closePath();
      ctx.fill();

      // Clean muted tabular typography for countdown
      ctx.fillStyle = 'rgba(241, 245, 249, 0.78)';
      ctx.font = `600 ${9.5 * dpr}px ${TV_FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timerBadgeStr, tL + tW / 2, tT + tH / 2);
      ctx.restore();
    }
  }

  // ── LAYER 6.5: User Drawings (Extended Suite matching Android DrawingLayer) ──
  const allDrawings = [...(options.drawings || [])];
  if (options.activeDrawing && !options.skipCrosshair) allDrawings.push(options.activeDrawing);

  if (allDrawings.length > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, chartW, chartH); ctx.clip();

    // Helper to calculate X coordinate for a drawing point with time-anchor fallback
    const getPointX = (pt: { index: number; time?: number }) => {
      const idx = resolveDrawingPointIndex(pt, candles);
      return (idx - startIdx) * candleW + candleW / 2;
    };

    for (const item of allDrawings) {
      if (item.hidden || !item.points || item.points.length === 0) continue;
      const p1 = item.points[0];
      const x1 = getPointX(p1);
      const y1 = priceToY(p1.price);
      const color = item.color || '#2563EB';

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = (item.lineWidth || 2) * dpr;

      if (item.tool === 'HORIZONTAL') {
        ctx.save();
        if (item.lineStyle === 'solid') ctx.setLineDash([]);
        else if (item.lineStyle === 'dotted') ctx.setLineDash([2 * dpr, 2 * dpr]);
        else ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(chartW, y1); ctx.stroke();
        ctx.restore();
        ctx.font = `bold ${11 * dpr}px "JetBrains Mono",monospace`;
        const label = item.text ? `${item.text}: ${formatPrice(p1.price)}` : `H-Line: ${formatPrice(p1.price)}`;
        ctx.fillText(label, 6 * dpr, y1 - 5 * dpr);
      } else if (item.tool === 'HORIZONTAL_RAY') {
        ctx.save();
        if (item.lineStyle === 'solid') ctx.setLineDash([]);
        else if (item.lineStyle === 'dotted') ctx.setLineDash([2 * dpr, 2 * dpr]);
        else ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(chartW, y1); ctx.stroke();
        ctx.restore();
        ctx.font = `bold ${11 * dpr}px "JetBrains Mono",monospace`;
        const label = item.text ? `${item.text}: ${formatPrice(p1.price)}` : `H-Ray: ${formatPrice(p1.price)}`;
        ctx.fillText(label, x1 + 6 * dpr, y1 - 5 * dpr);
      } else if (item.tool === 'VERTICAL_LINE') {
        ctx.save();
        ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, chartH); ctx.stroke();
        ctx.restore();
        const cTime = candles[Math.min(Math.max(0, p1.index), candles.length - 1)]?.openTime;
        if (cTime) {
          const tText = formatCrosshairTime(cTime, isDailyOrHigher);
          ctx.font = `bold ${10.5 * dpr}px "JetBrains Mono",monospace`;
          ctx.fillText(tText, Math.max(4 * dpr, x1 - 35 * dpr), 15 * dpr);
        }
      } else if (item.tool === 'CROSS_LINE') {
        ctx.save();
        ctx.setLineDash([5 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(chartW, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, chartH); ctx.stroke();
        ctx.restore();
        ctx.font = `bold ${10.5 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = color;
        ctx.fillText(`+ ${formatPrice(p1.price)}`, Math.max(6 * dpr, x1 + 6 * dpr), y1 - 5 * dpr);
      } else if (item.tool === 'TEXT') {
        const textContent = item.text || 'Annotation';
        const lines = textContent.split('\n');
        ctx.font = `bold ${11.5 * dpr}px "JetBrains Mono",monospace`;
        const lineH = 16 * dpr;
        let maxW = 0;
        for (const l of lines) {
          maxW = Math.max(maxW, ctx.measureText(l).width);
        }
        const bW = maxW + 14 * dpr;
        const bH = lines.length * lineH + 8 * dpr;
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x1, y1 - bH, bW, bH, 4 * dpr);
        } else {
          ctx.rect(x1, y1 - bH, bW, bH);
        }
        ctx.fill();
        ctx.strokeStyle = color || '#3B82F6';
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lines.forEach((l, li) => {
          ctx.fillText(l, x1 + 7 * dpr, y1 - bH + 5 * dpr + li * lineH);
        });
        ctx.restore();
      } else if (item.tool === 'ANCHORED_TEXT') {
        const textContent = item.text || 'Note';
        const lines = textContent.split('\n');
        ctx.font = `bold ${11.5 * dpr}px "JetBrains Mono",monospace`;
        const lineH = 16 * dpr;
        let maxW = 0;
        for (const l of lines) {
          maxW = Math.max(maxW, ctx.measureText(l).width);
        }
        const bW = maxW + 14 * dpr;
        const bH = lines.length * lineH + 8 * dpr;
        ctx.save();
        ctx.beginPath(); ctx.arc(x1, y1, 4 * dpr, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + 14 * dpr, y1 - 14 * dpr); ctx.stroke();
        ctx.fillStyle = '#0F172A';
        const bx = x1 + 14 * dpr;
        const by = y1 - 14 * dpr - bH / 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bx, by, bW, bH, 4 * dpr);
        } else {
          ctx.rect(bx, by, bW, bH);
        }
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lines.forEach((l, li) => {
          ctx.fillText(l, bx + 7 * dpr, by + 4 * dpr + li * lineH);
        });
        ctx.restore();
      } else if (item.tool === 'PRICE_LABEL') {
        const priceStr = formatPrice(p1.price);
        ctx.font = `bold ${11.5 * dpr}px "JetBrains Mono",monospace`;
        const tm = ctx.measureText(priceStr);
        const bW = tm.width + 16 * dpr, bH = 20 * dpr;
        ctx.save();
        ctx.fillStyle = color || '#2563EB';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + 8 * dpr, y1 - bH / 2);
        ctx.lineTo(x1 + 8 * dpr + bW, y1 - bH / 2);
        ctx.lineTo(x1 + 8 * dpr + bW, y1 + bH / 2);
        ctx.lineTo(x1 + 8 * dpr, y1 + bH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(priceStr, x1 + 12 * dpr, y1);
        ctx.restore();
      } else if (item.tool === 'ARROW_UP') {
        ctx.save();
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - 6 * dpr, y1 + 10 * dpr);
        ctx.lineTo(x1 - 2.5 * dpr, y1 + 10 * dpr);
        ctx.lineTo(x1 - 2.5 * dpr, y1 + 18 * dpr);
        ctx.lineTo(x1 + 2.5 * dpr, y1 + 18 * dpr);
        ctx.lineTo(x1 + 2.5 * dpr, y1 + 10 * dpr);
        ctx.lineTo(x1 + 6 * dpr, y1 + 10 * dpr);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (item.tool === 'ARROW_DOWN') {
        ctx.save();
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - 6 * dpr, y1 - 10 * dpr);
        ctx.lineTo(x1 - 2.5 * dpr, y1 - 10 * dpr);
        ctx.lineTo(x1 - 2.5 * dpr, y1 - 18 * dpr);
        ctx.lineTo(x1 + 2.5 * dpr, y1 - 18 * dpr);
        ctx.lineTo(x1 + 2.5 * dpr, y1 - 10 * dpr);
        ctx.lineTo(x1 + 6 * dpr, y1 - 10 * dpr);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (item.tool === 'FLAG') {
        ctx.save();
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1, y1 - 20 * dpr); ctx.stroke();
        ctx.fillStyle = color || '#EF4444';
        ctx.beginPath();
        ctx.moveTo(x1, y1 - 20 * dpr);
        ctx.lineTo(x1 + 13 * dpr, y1 - 15 * dpr);
        ctx.lineTo(x1, y1 - 10 * dpr);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (item.tool === 'BRUSH') {
        if (item.points.length > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          for (let k = 1; k < item.points.length; k++) {
            const pk = item.points[k];
            ctx.lineTo(getPointX(pk), priceToY(pk.price));
          }
          ctx.stroke();
          ctx.restore();
        }
      } else if (item.tool === 'HIGHLIGHTER') {
        if (item.points.length > 1) {
          ctx.save();
          ctx.strokeStyle = color ? `${color}35` : 'rgba(250, 204, 21, 0.35)';
          ctx.lineWidth = 14 * dpr;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          for (let k = 1; k < item.points.length; k++) {
            const pk = item.points[k];
            ctx.lineTo(getPointX(pk), priceToY(pk.price));
          }
          ctx.stroke();
          ctx.restore();
        }
      } else if (item.tool === 'POLYLINE') {
        if (item.points.length > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          for (let k = 1; k < item.points.length; k++) {
            const pk = item.points[k];
            ctx.lineTo(getPointX(pk), priceToY(pk.price));
          }
          ctx.stroke();
          for (const pt of item.points) {
            ctx.beginPath(); ctx.arc(getPointX(pt), priceToY(pt.price), 3 * dpr, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
        }
      } else if (item.points.length >= 2) {
        const p2 = item.points[1];
        const x2 = getPointX(p2);
        const y2 = priceToY(p2.price);

        if (item.tool === 'TRENDLINE') {
          if (item.lineStyle === 'dashed') ctx.setLineDash([6 * dpr, 4 * dpr]);
          else if (item.lineStyle === 'dotted') ctx.setLineDash([2 * dpr, 2 * dpr]);
          else ctx.setLineDash([]);

          let startX = x1, startY = y1, endX = x2, endY = y2;
          const dx = x2 - x1, dy = y2 - y1;
          const hyp = Math.hypot(dx, dy);
          if (hyp > 0.001) {
            const factor = Math.max(chartW, chartH) * 2 / hyp;
            if (item.extendLeft) {
              startX = x1 - dx * factor;
              startY = y1 - dy * factor;
            }
            if (item.extendRight) {
              endX = x2 + dx * factor;
              endY = y2 + dy * factor;
            }
          }
          ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
          ctx.setLineDash([]);

          if (item.text) {
            ctx.save();
            ctx.font = `bold ${(item.fontSize || 10) * dpr}px "JetBrains Mono",monospace`;
            ctx.fillStyle = item.color || '#2563EB';
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            ctx.fillText(item.text, midX + 4 * dpr, midY - 6 * dpr);
            ctx.restore();
          }

          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'RAY') {
          if (item.lineStyle === 'dashed') ctx.setLineDash([6 * dpr, 4 * dpr]);
          else if (item.lineStyle === 'dotted') ctx.setLineDash([2 * dpr, 2 * dpr]);
          else ctx.setLineDash([]);
          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            const factor = Math.max(chartW, chartH) * 3 / len;
            const rayX = x1 + dx * factor;
            const rayY = y1 + dy * factor;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(rayX, rayY); ctx.stroke();
          }
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'EXTENDED_LINE') {
          if (item.lineStyle === 'dashed') ctx.setLineDash([6 * dpr, 4 * dpr]);
          else if (item.lineStyle === 'dotted') ctx.setLineDash([2 * dpr, 2 * dpr]);
          else ctx.setLineDash([]);
          const dx = x2 - x1, dy = y2 - y1;
          if (Math.abs(dx) > 0.001) {
            const slope = dy / dx;
            const yAt0 = y1 - x1 * slope;
            const yAtW = y1 + (chartW - x1) * slope;
            ctx.beginPath(); ctx.moveTo(0, yAt0); ctx.lineTo(chartW, yAtW); ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, chartH); ctx.stroke();
          }
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'CHANNEL') {
          const p3 = item.points[2] || { price: p1.price + (pMax - pMin) * 0.04, index: p1.index };
          const x3 = getPointX(p3);
          const y3 = priceToY(p3.price);
          const yBaseAtX3 = Math.abs(x2 - x1) > 0.001 ? y1 + ((x3 - x1) / (x2 - x1)) * (y2 - y1) : y1;
          const dyOffset = y3 - yBaseAtX3;
          const y1p = y1 + dyOffset;
          const y2p = y2 + dyOffset;
          const y1m = (y1 + y1p) / 2;
          const y2m = (y2 + y2p) / 2;

          // Shaded fill between rails
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2p); ctx.lineTo(x1, y1p); ctx.closePath();
          ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
          ctx.fill();

          // Rails
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x1, y1p); ctx.lineTo(x2, y2p); ctx.stroke();

          // 50% Dashed Midline
          ctx.setLineDash([4 * dpr, 4 * dpr]);
          ctx.beginPath(); ctx.moveTo(x1, y1m); ctx.lineTo(x2, y2m); ctx.stroke();
          ctx.restore();

          // Anchors
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x3, y3, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'RECTANGLE') {
          const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
          ctx.fillStyle = item.color ? `${item.color}22` : 'rgba(37, 99, 235, 0.12)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);
        } else if (item.tool === 'CIRCLE') {
          const r = Math.hypot(x2 - x1, y2 - y1);
          ctx.save();
          ctx.beginPath();
          ctx.arc(x1, y1, r, 0, Math.PI * 2);
          ctx.fillStyle = item.color ? `${item.color}1A` : 'rgba(37, 99, 235, 0.10)';
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          // Anchors: Center point (p1) and radius perimeter handle (p2)
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'RISK_REWARD_LONG') {
          const entryP = p1.price;
          const stopP = p2.price < entryP ? p2.price : entryP * 0.98;
          const risk = entryP - stopP;
          const ratio = item.riskRewardRatio || 2.0;
          const targetP = item.targetPrice || (entryP + risk * ratio);
          const boxW = Math.max(90 * dpr, Math.abs(x2 - x1) || 120 * dpr);
          const boxLeft = Math.min(x1, x2);

          const yEntry = priceToY(entryP);
          const yStop = priceToY(stopP);
          const yTarget = priceToY(targetP);

          ctx.save();
          // Target Box (Green)
          ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
          ctx.fillRect(boxLeft, yTarget, boxW, yEntry - yTarget);
          ctx.strokeStyle = '#10B981';
          ctx.strokeRect(boxLeft, yTarget, boxW, yEntry - yTarget);

          // Stop Box (Red)
          ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
          ctx.fillRect(boxLeft, yEntry, boxW, yStop - yEntry);
          ctx.strokeStyle = '#EF4444';
          ctx.strokeRect(boxLeft, yEntry, boxW, yStop - yEntry);

          // Entry line
          ctx.strokeStyle = '#64748B';
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath(); ctx.moveTo(boxLeft, yEntry); ctx.lineTo(boxLeft + boxW, yEntry); ctx.stroke();

          const gainPct = ((targetP - entryP) / entryP) * 100;
          const lossPct = ((entryP - stopP) / entryP) * 100;
          const labelTxt = `LONG 1:${ratio.toFixed(1)} | Target +${gainPct.toFixed(1)}% | Stop -${lossPct.toFixed(1)}%`;
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(boxLeft, Math.max(0, yTarget - 16 * dpr), boxW, 15 * dpr);
          ctx.fillStyle = '#10B981';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(labelTxt, boxLeft + 4 * dpr, Math.max(8 * dpr, yTarget - 8 * dpr));
          ctx.restore();
        } else if (item.tool === 'RISK_REWARD_SHORT') {
          const entryP = p1.price;
          const stopP = p2.price > entryP ? p2.price : entryP * 1.02;
          const risk = stopP - entryP;
          const ratio = item.riskRewardRatio || 2.0;
          const targetP = item.targetPrice || (entryP - risk * ratio);
          const boxW = Math.max(90 * dpr, Math.abs(x2 - x1) || 120 * dpr);
          const boxLeft = Math.min(x1, x2);

          const yEntry = priceToY(entryP);
          const yStop = priceToY(stopP);
          const yTarget = priceToY(targetP);

          ctx.save();
          // Stop Box (Red on top)
          ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
          ctx.fillRect(boxLeft, yStop, boxW, yEntry - yStop);
          ctx.strokeStyle = '#EF4444';
          ctx.strokeRect(boxLeft, yStop, boxW, yEntry - yStop);

          // Target Box (Green on bottom)
          ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
          ctx.fillRect(boxLeft, yEntry, boxW, yTarget - yEntry);
          ctx.strokeStyle = '#10B981';
          ctx.strokeRect(boxLeft, yEntry, boxW, yTarget - yEntry);

          // Entry line
          ctx.strokeStyle = '#64748B';
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath(); ctx.moveTo(boxLeft, yEntry); ctx.lineTo(boxLeft + boxW, yEntry); ctx.stroke();

          const gainPct = ((entryP - targetP) / entryP) * 100;
          const lossPct = ((stopP - entryP) / entryP) * 100;
          const labelTxt = `SHORT 1:${ratio.toFixed(1)} | Target +${gainPct.toFixed(1)}% | Stop -${lossPct.toFixed(1)}%`;
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(boxLeft, Math.max(0, yStop - 16 * dpr), boxW, 15 * dpr);
          ctx.fillStyle = '#EF4444';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(labelTxt, boxLeft + 4 * dpr, Math.max(8 * dpr, yStop - 8 * dpr));
          ctx.restore();
        } else if (item.tool === 'CALLOUT') {
          ctx.save();
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          const angle = Math.atan2(y1 - y2, x1 - x2);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1 - 10 * dpr * Math.cos(angle - Math.PI / 6), y1 - 10 * dpr * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(x1 - 10 * dpr * Math.cos(angle + Math.PI / 6), y1 - 10 * dpr * Math.sin(angle + Math.PI / 6));
          ctx.closePath(); ctx.fill();

          const txt = item.text || 'Key Level';
          const lines = txt.split('\n');
          ctx.font = `bold ${10.5 * dpr}px "JetBrains Mono",monospace`;
          const lineH = 15 * dpr;
          let maxW = 0;
          for (const l of lines) {
            maxW = Math.max(maxW, ctx.measureText(l).width);
          }
          const bw = maxW + 14 * dpr;
          const bh = lines.length * lineH + 6 * dpr;
          ctx.fillStyle = '#0F172A';
          const bx = x2;
          const by = y2 - bh / 2;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(bx, by, bw, bh, 4 * dpr);
          } else {
            ctx.rect(bx, by, bw, bh);
          }
          ctx.fill();
          ctx.strokeStyle = item.color || '#0284C7';
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          lines.forEach((l, li) => {
            ctx.fillText(l, bx + 7 * dpr, by + 3 * dpr + li * lineH);
          });
          ctx.restore();
        } else if (item.tool === 'FIBONACCI') {
          const levels = (item.fibLevels && item.fibLevels.length > 0)
            ? item.fibLevels.filter(f => f.enabled !== false).map(f => ({
                lvl: f.lvl,
                color: f.color,
                label: f.label || `${(f.lvl * 100).toFixed(1)}%`,
              }))
            : [
                { lvl: 0.0,   color: '#EF4444', label: '0.0%' },
                { lvl: 0.236, color: '#F97316', label: '23.6%' },
                { lvl: 0.382, color: '#F59E0B', label: '38.2%' },
                { lvl: 0.5,   color: '#10B981', label: '50.0%' },
                { lvl: 0.618, color: '#06B6D4', label: '61.8%' },
                { lvl: 0.786, color: '#8B5CF6', label: '78.6%' },
                { lvl: 1.0,   color: '#EF4444', label: '100.0%' },
              ];
          const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);

          // Golden pocket fill (0.382 - 0.618)
          const y382 = y1 + (y2 - y1) * 0.382;
          const y618 = y1 + (y2 - y1) * 0.618;
          ctx.save();
          ctx.fillStyle = item.fillColor || 'rgba(16, 185, 129, 0.10)';
          ctx.fillRect(minX, Math.min(y382, y618), maxX - minX, Math.abs(y618 - y382));
          ctx.restore();

          for (const itemFib of levels) {
            const ly = y1 + (y2 - y1) * itemFib.lvl;
            const pVal = p1.price + (p2.price - p1.price) * itemFib.lvl;
            ctx.save();
            ctx.strokeStyle = itemFib.color;
            ctx.setLineDash([3 * dpr, 3 * dpr]);
            ctx.beginPath(); ctx.moveTo(minX, ly); ctx.lineTo(maxX, ly); ctx.stroke();
            ctx.restore();
            ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
            ctx.fillStyle = itemFib.color;
            ctx.fillText(`${itemFib.label} (${formatPrice(pVal)})`, minX + 4 * dpr, ly - 3 * dpr);
          }
        } else if (item.tool === 'FIBONACCI_EXTENSION') {
          const p3 = item.points[2] || p2;
          const baseRange = p2.price - p1.price;
          const extLevels = [
            { lvl: 0.0,   color: '#64748B', label: '0.0 (Base)' },
            { lvl: 0.618, color: '#0284C7', label: '0.618 Target' },
            { lvl: 1.0,   color: '#10B981', label: '1.0 Target' },
            { lvl: 1.618, color: '#F59E0B', label: '1.618 Golden Ext' },
            { lvl: 2.618, color: '#EF4444', label: '2.618 Ultra Ext' },
          ];
          const minX = Math.min(x1, x2);
          for (const ext of extLevels) {
            const targetP = p3.price + baseRange * ext.lvl;
            if (targetP >= pMin && targetP <= pMax) {
              const ly = priceToY(targetP);
              ctx.save();
              ctx.strokeStyle = ext.color;
              ctx.setLineDash([4 * dpr, 4 * dpr]);
              ctx.beginPath(); ctx.moveTo(minX, ly); ctx.lineTo(chartW, ly); ctx.stroke();
              ctx.restore();
              ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
              ctx.fillStyle = ext.color;
              ctx.fillText(`${ext.label}: ${formatPrice(targetP)}`, minX + 6 * dpr, ly - 3 * dpr);
            }
          }
        } else if (item.tool === 'PIVOT_POINTS') {
          const high = Math.max(p1.price, p2.price);
          const low = Math.min(p1.price, p2.price);
          const range = high - low;
          const pivot = (high + low) / 2;

          const minX = Math.min(x1, x2);
          const maxX = Math.max(Math.max(x1, x2), chartW);

          // Standard Pivot Levels (P, R1, R2, R3, S1, S2, S3)
          const pivotLevels = [
            { id: 'R3', lvl: high + range,  color: '#DC2626', label: 'R3' },
            { id: 'R2', lvl: pivot + range, color: '#EF4444', label: 'R2' },
            { id: 'R1', lvl: high,          color: '#FB923C', label: 'R1' },
            { id: 'P',  lvl: pivot,         color: '#EAB308', label: 'P (Pivot)' },
            { id: 'S1', lvl: low,           color: '#34D399', label: 'S1' },
            { id: 'S2', lvl: pivot - range, color: '#10B981', label: 'S2' },
            { id: 'S3', lvl: low - range,   color: '#059669', label: 'S3' },
          ];

          // Soft central equilibrium band between R1 and S1
          const yR1 = priceToY(high);
          const yS1 = priceToY(low);
          ctx.save();
          ctx.fillStyle = 'rgba(234, 179, 8, 0.07)';
          ctx.fillRect(minX, Math.min(yR1, yS1), maxX - minX, Math.abs(yS1 - yR1));
          ctx.restore();

          for (const pl of pivotLevels) {
            if (pl.lvl >= pMin && pl.lvl <= pMax) {
              const ly = priceToY(pl.lvl);
              ctx.save();
              ctx.strokeStyle = pl.color;
              ctx.lineWidth = pl.id === 'P' ? 1.8 * dpr : 1 * dpr;
              ctx.setLineDash(pl.id === 'P' ? [] : [4 * dpr, 3 * dpr]);
              ctx.beginPath();
              ctx.moveTo(minX, ly);
              ctx.lineTo(maxX, ly);
              ctx.stroke();
              ctx.restore();

              // Level label badge
              ctx.save();
              ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
              ctx.fillStyle = pl.color;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'bottom';
              ctx.fillText(`${pl.label}: ${formatPrice(pl.lvl)}`, minX + 6 * dpr, ly - 3 * dpr);
              ctx.restore();
            }
          }
        } else if (item.tool === 'MEASURE') {
          const deltaPrice = p2.price - p1.price;
          const pct = p1.price !== 0 ? (deltaPrice / p1.price) * 100 : 0;
          const bars = Math.abs(p2.index - p1.index);
          const isBull = deltaPrice >= 0;
          const measureColor = isBull ? BULL : BEAR;

          const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
          const rw = Math.max(Math.abs(x2 - x1), 1);
          const rh = Math.max(Math.abs(y2 - y1), 1);

          ctx.save();
          ctx.fillStyle = isBull ? 'rgba(0, 163, 92, 0.12)' : 'rgba(225, 29, 72, 0.12)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeStyle = measureColor;
          ctx.lineWidth = 1 * dpr;
          ctx.strokeRect(rx, ry, rw, rh);

          // Diagonal arrow guideline
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

          // Central badge
          const sign = isBull ? '+' : '';
          const infoStr = `${sign}${formatPrice(deltaPrice)} (${sign}${pct.toFixed(2)}%) | ${bars} bars`;
          ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono",monospace`;
          const tm = ctx.measureText(infoStr);
          const bW = tm.width + 10 * dpr, bH = 14 * dpr;
          const bX = rx + rw / 2 - bW / 2;
          const bY = ry + rh / 2 - bH / 2;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
          ctx.beginPath();
          const cr = 3 * dpr;
          ctx.moveTo(bX + cr, bY); ctx.lineTo(bX + bW - cr, bY); ctx.arcTo(bX + bW, bY, bX + bW, bY + cr, cr);
          ctx.lineTo(bX + bW, bY + bH - cr); ctx.arcTo(bX + bW, bY + bH, bX + bW - cr, bY + bH, cr);
          ctx.lineTo(bX + cr, bY + bH); ctx.arcTo(bX, bY + bH, bX, bY + bH - cr, cr);
          ctx.lineTo(bX, bY + cr); ctx.arcTo(bX, bY, bX + cr, bY, cr);
          ctx.closePath(); ctx.fill();

          ctx.fillStyle = measureColor;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(infoStr, bX + bW / 2, bY + bH / 2);
          ctx.restore();
        } else if (item.tool === 'INFO_LINE') {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          const dP = p2.price - p1.price;
          const pct = p1.price !== 0 ? (dP / p1.price) * 100 : 0;
          const bars = Math.abs(p2.index - p1.index);
          const angle = Math.round(Math.atan2(-(y2 - y1), x2 - x1) * 180 / Math.PI);
          const sign = dP >= 0 ? '+' : '';
          const info = `${sign}${formatPrice(dP)} (${sign}${pct.toFixed(1)}%) | ${bars}b | ${angle}°`;
          const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          const tm = ctx.measureText(info);
          ctx.save();
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(midX - tm.width / 2 - 4 * dpr, midY - 14 * dpr, tm.width + 8 * dpr, 13 * dpr);
          ctx.fillStyle = dP >= 0 ? '#10B981' : '#EF4444';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(info, midX, midY - 7.5 * dpr);
          ctx.restore();
        } else if (item.tool === 'TREND_ANGLE') {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.save();
          ctx.setLineDash([3 * dpr, 3 * dpr]);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.stroke();
          ctx.restore();
          const angle = Math.round(Math.atan2(-(y2 - y1), x2 - x1) * 180 / Math.PI);
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          ctx.save();
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(x1 + 8 * dpr, y1 - 12 * dpr, 36 * dpr, 13 * dpr);
          ctx.fillStyle = '#22D3EE';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${angle}°`, x1 + 26 * dpr, y1 - 5.5 * dpr);
          ctx.restore();
          // Anchors: Origin (p1) and angle terminal endpoint (p2)
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'DISJOINT_CHANNEL') {
          const p3 = item.points[2] || { price: p2.price, index: p2.index };
          const x3 = getPointX(p3);
          const y3 = priceToY(p3.price);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x1, y1 + (y3 - y2)); ctx.lineTo(x3, y3); ctx.stroke();
          ctx.save();
          ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x1, y1 + (y3 - y2)); ctx.closePath();
          ctx.fill();
          ctx.restore();
          // Anchors
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x3, y3, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'ROTATED_RECTANGLE') {
          const p3 = item.points[2] || { price: p1.price + (pMax - pMin) * 0.03, index: p1.index };
          const x3 = getPointX(p3), y3 = priceToY(p3.price);
          const yBaseAtX3 = Math.abs(x2 - x1) > 0.001 ? y1 + ((x3 - x1) / (x2 - x1)) * (y2 - y1) : y1;
          const offY = y3 - yBaseAtX3;
          ctx.save();
          ctx.fillStyle = color ? `${color}1F` : 'rgba(37, 99, 235, 0.12)';
          ctx.beginPath();
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 + offY); ctx.lineTo(x1, y1 + offY);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.restore();
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x3, y3, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'ELLIPSE') {
          const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
          const rx = Math.max(1, Math.abs(x2 - x1) / 2);
          const ry = Math.max(1, Math.abs(y2 - y1) / 2);
          ctx.save();
          ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = color ? `${color}1A` : 'rgba(37, 99, 235, 0.10)';
          ctx.fill(); ctx.stroke();
          ctx.restore();
        } else if (item.tool === 'TRIANGLE') {
          const p3 = item.points[2] || { price: (p1.price + p2.price) / 2, index: Math.round((p1.index + p2.index) / 2) };
          const x3 = getPointX(p3), y3 = priceToY(p3.price);
          ctx.save();
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
          ctx.fillStyle = color ? `${color}1F` : 'rgba(168, 85, 247, 0.12)';
          ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x3, y3, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else if (item.tool === 'CURVE') {
          const p3 = item.points[2] || p2;
          const x3 = getPointX(p3), y3 = priceToY(p3.price);
          ctx.save();
          ctx.beginPath(); ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(x2, y2, x3, y3);
          ctx.stroke();
          ctx.restore();
        } else if (item.tool === 'FIB_CHANNEL') {
          const p3 = item.points[2] || { price: p1.price + (pMax - pMin) * 0.05, index: p1.index };
          const x3 = getPointX(p3), y3 = priceToY(p3.price);
          const yBaseAtX3 = Math.abs(x2 - x1) > 0.001 ? y1 + ((x3 - x1) / (x2 - x1)) * (y2 - y1) : y1;
          const baseDy = y3 - yBaseAtX3;
          const fibRatios = [0, 0.382, 0.5, 0.618, 1.0, 1.618];
          ctx.save();
          for (const r of fibRatios) {
            const off = baseDy * r;
            ctx.setLineDash(r === 0 || r === 1.0 ? [] : [3 * dpr, 3 * dpr]);
            ctx.beginPath(); ctx.moveTo(x1, y1 + off); ctx.lineTo(x2, y2 + off); ctx.stroke();
            ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
            ctx.fillText(`${r}`, x2 + 4 * dpr, y2 + off);
          }
          ctx.restore();
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x3, y3, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'FIB_TIME_ZONE') {
          const fibSeq = [1, 2, 3, 5, 8, 13, 21, 34, 55];
          const dxIdx = Math.max(1, Math.abs(p2.index - p1.index));
          ctx.save();
          ctx.setLineDash([3 * dpr, 3 * dpr]);
          for (const f of fibSeq) {
            const targetIdx = p1.index + f * dxIdx;
            if (targetIdx >= startIdx && targetIdx <= endIdx) {
              const fx = (targetIdx - startIdx) * candleW + candleW / 2;
              ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx, chartH); ctx.stroke();
              ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
              ctx.fillText(`${f}`, fx + 2 * dpr, 14 * dpr);
            }
          }
          ctx.restore();
        } else if (item.tool === 'GANN_BOX') {
          const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
          const w = maxX - minX, h = maxY - minY;
          ctx.save();
          ctx.strokeRect(minX, minY, w, h);
          ctx.setLineDash([2 * dpr, 2 * dpr]);
          for (const r of [0.25, 0.5, 0.75]) {
            ctx.beginPath(); ctx.moveTo(minX + w * r, minY); ctx.lineTo(minX + w * r, maxY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(minX, minY + h * r); ctx.lineTo(maxX, minY + h * r); ctx.stroke();
          }
          ctx.beginPath(); ctx.moveTo(minX, minY); ctx.lineTo(maxX, maxY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(minX, maxY); ctx.lineTo(maxX, minY); ctx.stroke();
          ctx.restore();
        } else if (item.tool === 'GANN_FAN') {
          const slopes = [
            { label: '1/8', s: 0.125 }, { label: '1/4', s: 0.25 }, { label: '1/3', s: 0.333 },
            { label: '1/2', s: 0.5 }, { label: '1/1', s: 1.0 }, { label: '2/1', s: 2.0 },
            { label: '3/1', s: 3.0 }, { label: '4/1', s: 4.0 }, { label: '8/1', s: 8.0 }
          ];
          const dx = x2 - x1, baseDy = y2 - y1;
          ctx.save();
          for (const sl of slopes) {
            ctx.beginPath(); ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + dx * 2, y1 + baseDy * sl.s * 2);
            ctx.stroke();
          }
          ctx.restore();
        } else if (item.tool === 'PRICE_RANGE') {
          const dP = p2.price - p1.price;
          const pct = p1.price !== 0 ? (dP / p1.price) * 100 : 0;
          const isUp = dP >= 0;
          const col = isUp ? '#10B981' : '#EF4444';
          ctx.save();
          ctx.strokeStyle = col; ctx.fillStyle = col;
          ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath(); ctx.moveTo(x1 - 10 * dpr, y1); ctx.lineTo(x1 + 10 * dpr, y1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1, y2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x1 - 10 * dpr, y2); ctx.lineTo(x1 + 10 * dpr, y2); ctx.stroke();
          const midY = (y1 + y2) / 2;
          const txt = `${isUp ? '+' : ''}${formatPrice(dP)} (${isUp ? '+' : ''}${pct.toFixed(2)}%)`;
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          const tm = ctx.measureText(txt);
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(x1 + 6 * dpr, midY - 8 * dpr, tm.width + 8 * dpr, 15 * dpr);
          ctx.fillStyle = col;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(txt, x1 + 10 * dpr, midY);
          ctx.restore();
        } else if (item.tool === 'DATE_RANGE') {
          const bars = Math.abs(p2.index - p1.index);
          const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
          ctx.save();
          ctx.strokeStyle = '#0284C7'; ctx.fillStyle = '#0284C7';
          ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath(); ctx.moveTo(minX, y1 - 10 * dpr); ctx.lineTo(minX, y1 + 10 * dpr); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(minX, y1); ctx.lineTo(maxX, y1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(maxX, y1 - 10 * dpr); ctx.lineTo(maxX, y1 + 10 * dpr); ctx.stroke();
          const midX = (minX + maxX) / 2;
          const txt = `${bars} bars`;
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          const tm = ctx.measureText(txt);
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(midX - tm.width / 2 - 4 * dpr, y1 - 16 * dpr, tm.width + 8 * dpr, 14 * dpr);
          ctx.fillStyle = '#38BDF8';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(txt, midX, y1 - 9 * dpr);
          ctx.restore();
        } else if (item.tool === 'HEAD_AND_SHOULDERS') {
          const labels = ['LS', 'Head', 'RS', 'NL1', 'NL2'];
          ctx.save();
          ctx.beginPath(); ctx.moveTo(x1, y1);
          for (let k = 1; k < Math.min(item.points.length, 3); k++) {
            ctx.lineTo(getPointX(item.points[k]), priceToY(item.points[k].price));
          }
          ctx.stroke();
          if (item.points.length >= 5) {
            const x4 = getPointX(item.points[3]), y4 = priceToY(item.points[3].price);
            const x5 = getPointX(item.points[4]), y5 = priceToY(item.points[4].price);
            ctx.setLineDash([4 * dpr, 3 * dpr]);
            ctx.beginPath(); ctx.moveTo(x4, y4); ctx.lineTo(x5, y5); ctx.stroke();
          }
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          item.points.forEach((pt, idx) => {
            const px = getPointX(pt), py = priceToY(pt.price);
            ctx.beginPath(); ctx.arc(px, py, 4 * dpr, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(labels[idx] || `${idx + 1}`, px + 6 * dpr, py - 6 * dpr);
          });
          ctx.restore();
        } else if (item.tool === 'ELLIOTT_IMPULSE') {
          const waveLabels = ['(1)', '(2)', '(3)', '(4)', '(5)'];
          ctx.save();
          ctx.beginPath(); ctx.moveTo(x1, y1);
          for (let k = 1; k < item.points.length; k++) {
            ctx.lineTo(getPointX(item.points[k]), priceToY(item.points[k].price));
          }
          ctx.stroke();
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          item.points.forEach((pt, idx) => {
            const px = getPointX(pt), py = priceToY(pt.price);
            ctx.beginPath(); ctx.arc(px, py, 8 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#0F172A'; ctx.fill();
            ctx.strokeStyle = color; ctx.stroke();
            ctx.fillStyle = '#F59E0B'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(waveLabels[idx] || `${idx + 1}`, px, py);
          });
          ctx.restore();
        } else if (item.tool === 'ELLIOTT_CORRECTION') {
          const waveLabels = ['(A)', '(B)', '(C)'];
          ctx.save();
          ctx.beginPath(); ctx.moveTo(x1, y1);
          for (let k = 1; k < item.points.length; k++) {
            ctx.lineTo(getPointX(item.points[k]), priceToY(item.points[k].price));
          }
          ctx.stroke();
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          item.points.forEach((pt, idx) => {
            const px = getPointX(pt), py = priceToY(pt.price);
            ctx.beginPath(); ctx.arc(px, py, 8 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#0F172A'; ctx.fill();
            ctx.strokeStyle = color; ctx.stroke();
            ctx.fillStyle = '#38BDF8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(waveLabels[idx] || `(${String.fromCharCode(65 + idx)})`, px, py);
          });
          ctx.restore();
        } else if (item.tool === 'XABCD_PATTERN') {
          const harmLabels = ['X', 'A', 'B', 'C', 'D'];
          ctx.save();
          ctx.beginPath(); ctx.moveTo(x1, y1);
          for (let k = 1; k < item.points.length; k++) {
            ctx.lineTo(getPointX(item.points[k]), priceToY(item.points[k].price));
          }
          ctx.stroke();
          if (item.points.length >= 3) {
            const xA = getPointX(item.points[1]), yA = priceToY(item.points[1].price);
            const xB = getPointX(item.points[2]), yB = priceToY(item.points[2].price);
            ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(xA, yA); ctx.lineTo(xB, yB); ctx.closePath();
            ctx.fill();
          }
          if (item.points.length >= 5) {
            const xB = getPointX(item.points[2]), yB = priceToY(item.points[2].price);
            const xC = getPointX(item.points[3]), yC = priceToY(item.points[3].price);
            const xD = getPointX(item.points[4]), yD = priceToY(item.points[4].price);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
            ctx.beginPath(); ctx.moveTo(xB, yB); ctx.lineTo(xC, yC); ctx.lineTo(xD, yD); ctx.closePath();
            ctx.fill();
          }
          ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono",monospace`;
          item.points.forEach((pt, idx) => {
            const px = getPointX(pt), py = priceToY(pt.price);
            ctx.beginPath(); ctx.arc(px, py, 4 * dpr, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(harmLabels[idx] || `${idx}`, px + 6 * dpr, py - 6 * dpr);
          });
          ctx.restore();
        } else if (item.tool === 'ABCD_PATTERN') {
          const abcdLabels = ['A', 'B', 'C', 'D'];
          ctx.save();
          ctx.beginPath(); ctx.moveTo(x1, y1);
          for (let k = 1; k < item.points.length; k++) {
            ctx.lineTo(getPointX(item.points[k]), priceToY(item.points[k].price));
          }
          ctx.stroke();
          ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono",monospace`;
          item.points.forEach((pt, idx) => {
            const px = getPointX(pt), py = priceToY(pt.price);
            ctx.beginPath(); ctx.arc(px, py, 4 * dpr, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(abcdLabels[idx] || `${idx}`, px + 6 * dpr, py - 6 * dpr);
          });
          ctx.restore();
        } else if (item.tool === 'BARS_PATTERN') {
          const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
          ctx.save();
          ctx.setLineDash([4 * dpr, 4 * dpr]);
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
          ctx.fillStyle = '#38BDF8';
          ctx.fillText('BARS PROJECTION', rx + 6 * dpr, ry + 12 * dpr);
          ctx.restore();
        }
      }

      // Selection Highlight Anchors (TradingView Circular Rings)
      if (options.selectedDrawingId && options.selectedDrawingId === item.id && !options.skipCrosshair) {
        ctx.save();
        for (const pt of item.points) {
          const px = getPointX(pt);
          const py = priceToY(pt.price);
          // Outer white circular ring with TradingView blue border
          ctx.beginPath();
          ctx.arc(px, py, 6 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.lineWidth = 2 * dpr;
          ctx.strokeStyle = '#2563EB';
          ctx.stroke();

          // Inner blue center dot
          ctx.beginPath();
          ctx.arc(px, py, 2 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = '#2563EB';
          ctx.fill();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }


  // ── LAYER 7: Indicator Overlays ───────────────────────────────────────
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, chartW, chartH); ctx.clip();
  for (const cfg of options.indicators) {
    if (!cfg.enabled || !isOverlay(cfg.type)) continue;
    const result = options.indicatorResults.get(cfg.id || cfg.type);
    if (!result) continue;

    function drawLine(vals: (number|null)[], color: string, sw: number) {
      if (!vals || vals.length === 0) return;
      ctx.beginPath();
      let s = false;
      let lastPoint: { x: number; y: number } | null = null;
      const loopStart = Math.max(0, startIdx - 1);
      const loopEnd = Math.min(vals.length, endIdx + 1);
      for (let i = loopStart; i < loopEnd; i++) {
        const v = vals[i];
        if (v === null || v === undefined || typeof v !== 'number' || !Number.isFinite(v)) {
          s = false;
          continue;
        }
        const x = (i - startIdx) * candleW + candleW / 2;
        const y = priceToY(v);
        if (!s) { ctx.moveTo(x, y); s = true; } else { ctx.lineTo(x, y); }
        if (i < endIdx) lastPoint = { x, y };
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = sw * dpr;
      ctx.stroke();

      // Continuous edge-to-edge extension and live bead at rightmost active candle
      if (lastPoint && endIdx >= vals.length) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(Math.min(chartW, lastPoint.x + candleW / 2), lastPoint.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = sw * dpr;
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lastPoint.x, lastPoint.y, (sw + 1.2) * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.2 * dpr;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawBandFill(upper: (number|null)[], lower: (number|null)[], color: string) {
      if (!upper || !lower) return;
      const ups: {x:number;y:number}[] = [], lows: {x:number;y:number}[] = [];
      const loopStart = Math.max(0, startIdx - 1);
      const loopEnd = Math.min(Math.min(upper.length, lower.length), endIdx + 1);
      for (let i = loopStart; i < loopEnd; i++) {
        const u = upper[i], l = lower[i];
        if (u === null || l === null || typeof u !== 'number' || typeof l !== 'number' || !Number.isFinite(u) || !Number.isFinite(l)) continue;
        const x = (i - startIdx) * candleW + candleW / 2;
        ups.push({ x, y: priceToY(u) });
        lows.push({ x, y: priceToY(l) });
      }
      if (ups.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(ups[0].x, ups[0].y);
      ups.forEach(p => ctx.lineTo(p.x, p.y));
      for (let i = lows.length - 1; i >= 0; i--) ctx.lineTo(lows[i].x, lows[i].y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    switch (cfg.type) {
      case 'SMA': case 'EMA': case 'VWAP':
        drawLine(result as (number|null)[], cfg.color, 1.8); break;
      case 'BOLLINGER_BANDS': {
        const bb = result as BollingerResult;
        drawLine(bb.upper, cfg.color+'B3', 1.2);
        drawLine(bb.middle, cfg.color, 1.6);
        drawLine(bb.lower, cfg.color+'B3', 1.2);
        drawBandFill(bb.upper, bb.lower, cfg.color+'14');
        break;
      }
      case 'SUPERTREND': {
        const st = result as SupertrendResult;
        let path: {x:number;y:number}[] = [];
        let curBull: boolean|null = null;
        let lastPoint: { x: number; y: number } | null = null;
        const loopStart = Math.max(0, startIdx - 1);
        const loopEnd = Math.min(st.values.length, endIdx + 1);
        for (let i = loopStart; i < loopEnd; i++) {
          const v = st.values[i], d = st.directions[i];
          if (v === null || d === null || typeof v !== 'number' || !Number.isFinite(v)) continue;
          const x = (i - startIdx) * candleW + candleW / 2;
          const y = priceToY(v);
          if (curBull !== null && curBull !== d) {
            ctx.beginPath();
            path.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.strokeStyle = curBull ? BULL : BEAR;
            ctx.lineWidth = 2 * dpr;
            ctx.stroke();
            path = [{ x, y }];
          } else {
            path.push({ x, y });
          }
          curBull = d;
          if (i < endIdx) lastPoint = { x, y };
        }
        if (path.length > 0) {
          ctx.beginPath();
          path.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          ctx.strokeStyle = curBull ? BULL : BEAR;
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        }
        if (lastPoint && endIdx >= st.values.length) {
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(Math.min(chartW, lastPoint.x + candleW / 2), lastPoint.y);
          ctx.strokeStyle = curBull ? BULL : BEAR;
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();

          ctx.save();
          ctx.fillStyle = curBull ? BULL : BEAR;
          ctx.beginPath();
          ctx.arc(lastPoint.x, lastPoint.y, 3 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1.2 * dpr;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case 'ICHIMOKU': {
        const ich = result as IchimokuResult;
        drawLine(ich.tenkanSen, '#2196F3', 1.2);
        drawLine(ich.kijunSen, '#FF5722', 1.2);
        drawLine(ich.chikouSpan, 'rgba(76,175,80,0.6)', 1.2);
        drawBandFill(ich.senkouSpanA, ich.senkouSpanB, 'rgba(38,166,154,0.12)');
        drawLine(ich.senkouSpanA, 'rgba(0,230,118,0.6)', 1.2);
        drawLine(ich.senkouSpanB, 'rgba(255,23,68,0.6)', 1.2);
        break;
      }
      case 'PARABOLIC_SAR': {
        const sarVals = result as (number|null)[];
        for (let i = safeStart; i < Math.min(safeEnd, sarVals.length); i++) {
          const v = sarVals[i]; if (v === null) continue;
          const x = (i-startIdx)*candleW+candleW/2, y = priceToY(v);
          ctx.fillStyle = cfg.color; ctx.beginPath(); ctx.arc(x, y, 2*dpr, 0, Math.PI*2); ctx.fill();
        }
        break;
      }
      case 'EMA_RIBBON': {
        const rib = result as { ema20: (number|null)[]; ema50: (number|null)[]; ema100: (number|null)[]; ema200: (number|null)[] };
        drawBandFill(rib.ema20, rib.ema50, 'rgba(59, 130, 246, 0.08)');
        drawLine(rib.ema20, '#3B82F6', 1.5);
        drawLine(rib.ema50, '#10B981', 1.5);
        drawLine(rib.ema100, '#F59E0B', 1.5);
        drawLine(rib.ema200, '#EF4444', 1.8);
        break;
      }
      case 'PIVOT_POINTS': {
        const pvt = result as {
          pivot: (number|null)[];
          r1: (number|null)[];
          r2: (number|null)[];
          r3: (number|null)[];
          s1: (number|null)[];
          s2: (number|null)[];
          s3: (number|null)[];
        };
        drawLine(pvt.pivot, '#EAB308', 1.4);
        drawLine(pvt.r1, '#FB923C', 1.2);
        drawLine(pvt.r2, '#EF4444', 1.2);
        drawLine(pvt.r3, '#B91C1C', 1.2);
        drawLine(pvt.s1, '#34D399', 1.2);
        drawLine(pvt.s2, '#10B981', 1.2);
        drawLine(pvt.s3, '#059669', 1.2);
        break;
      }
      case 'DONCHIAN': {
        const don = result as { upper: (number|null)[]; middle: (number|null)[]; lower: (number|null)[] };
        drawBandFill(don.upper, don.lower, 'rgba(6, 182, 212, 0.08)');
        drawLine(don.upper, '#06B6D4', 1.3);
        drawLine(don.middle, '#0EA5E9', 1.0);
        drawLine(don.lower, '#06B6D4', 1.3);
        break;
      }
      case 'HMA': {
        drawLine(result as (number|null)[], cfg.color || '#A855F7', 2.0);
        break;
      }
    }
  }
  ctx.restore();

  // Price scale tags for active overlay indicators (TradingView institutional parity)
  if (endIdx >= candles.length && !options.skipCrosshair) {
    for (const cfg of options.indicators) {
      if (!cfg.enabled || !isOverlay(cfg.type)) continue;
      const result = options.indicatorResults.get(cfg.id || cfg.type);
      if (!result) continue;
      let lastVal: number | null = null;
      if (Array.isArray(result)) {
        lastVal = (result as (number | null)[])[Math.min(endIdx - 1, result.length - 1)];
      } else if (cfg.type === 'BOLLINGER_BANDS') {
        const bb = result as BollingerResult;
        lastVal = bb.middle[Math.min(endIdx - 1, bb.middle.length - 1)];
      } else if (cfg.type === 'SUPERTREND') {
        const st = result as SupertrendResult;
        lastVal = st.values[Math.min(endIdx - 1, st.values.length - 1)];
      } else if (cfg.type === 'ICHIMOKU') {
        const ich = result as IchimokuResult;
        lastVal = ich.kijunSen[Math.min(endIdx - 1, ich.kijunSen.length - 1)];
      } else if (cfg.type === 'DONCHIAN') {
        const don = result as { upper: (number|null)[]; middle: (number|null)[]; lower: (number|null)[] };
        lastVal = don.middle[Math.min(endIdx - 1, don.middle.length - 1)];
      } else if (cfg.type === 'PIVOT_POINTS') {
        const pvt = result as { pivot: (number|null)[]; r1: (number|null)[]; r2: (number|null)[]; r3: (number|null)[]; s1: (number|null)[]; s2: (number|null)[]; s3: (number|null)[] };
        lastVal = pvt.pivot[Math.min(endIdx - 1, pvt.pivot.length - 1)];
      } else if (cfg.type === 'EMA_RIBBON') {
        const rib = result as { ema20: (number|null)[]; ema50: (number|null)[]; ema100: (number|null)[]; ema200: (number|null)[] };
        lastVal = rib.ema20[Math.min(endIdx - 1, rib.ema20.length - 1)];
      }
      if (lastVal !== null && lastVal !== undefined && typeof lastVal === 'number' && Number.isFinite(lastVal) && lastVal >= pMin && lastVal <= pMax) {
        const tagY = priceToY(lastVal);
        const tagText = `${formatPrice(lastVal)}`;
        ctx.save();
        ctx.font = `bold ${10.5 * dpr}px "JetBrains Mono",monospace`;
        const tw = ctx.measureText(tagText).width;
        const bw = Math.min(W - chartW - 2 * dpr, tw + 10 * dpr);
        const bh = 17 * dpr;
        const bx = chartW + 1 * dpr;
        const by = Math.max(1, Math.min(chartH - bh, tagY - bh / 2));
        ctx.fillStyle = cfg.color;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, bx + 5 * dpr, by + bh / 2);
        ctx.restore();
      }
    }
  }

  // ── LAYER 7.5: Institutional F&O Overlay (Dealer Walls: CW, PW, Gamma Flip, Max Pain) ──
  if (options.showFnoOverlay && options.fnoLevels && options.fnoLevels.enabled) {
    const fno = options.fnoLevels;
    const fnoDash = [5 * dpr, 4 * dpr];

    function drawFnoLevel(price: number | undefined, color: string, label: string, gex?: number) {
      if (price === undefined || price < pMin || price > pMax) return;
      const y = priceToY(price);

      ctx.save();
      ctx.setLineDash(fnoDash);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Format level text with GEX badge if available
      let fullText = `${label}: ${formatPrice(price)}`;
      if (gex !== undefined && gex !== null) {
        const gexStr = Math.abs(gex) >= 1e9 ? `${(gex / 1e9).toFixed(1)}B` : Math.abs(gex) >= 1e6 ? `${(gex / 1e6).toFixed(1)}M` : `${gex.toFixed(0)}`;
        fullText = `${label}: ${formatPrice(price)} (${gexStr} GEX)`;
      }

      ctx.font = `900 ${8 * dpr}px "JetBrains Mono",monospace`;
      const tm = ctx.measureText(fullText);
      const bW = tm.width + 12 * dpr;
      const bH = 13 * dpr;
      const bX = chartW - bW - 6 * dpr;
      const bY = y - bH - 2 * dpr;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)'; // Dark Slate pill
      ctx.beginPath();
      const cr = 3 * dpr;
      ctx.moveTo(bX + cr, bY); ctx.lineTo(bX + bW - cr, bY); ctx.arcTo(bX + bW, bY, bX + bW, bY + cr, cr);
      ctx.lineTo(bX + bW, bY + bH - cr); ctx.arcTo(bX + bW, bY + bH, bX + bW - cr, bY + bH, cr);
      ctx.lineTo(bX + cr, bY + bH); ctx.arcTo(bX, bY + bH, bX, bY + bH - cr, cr);
      ctx.lineTo(bX, bY + cr); ctx.arcTo(bX, bY, bX + cr, bY, cr);
      ctx.closePath();
      ctx.fill();

      // Color indicator stripe on the left of badge
      ctx.fillStyle = color;
      ctx.fillRect(bX + 2.5 * dpr, bY + 2.5 * dpr, 2.5 * dpr, bH - 5 * dpr);

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(fullText, bX + 8 * dpr, bY + bH / 2);
      ctx.restore();
    }

    // Call Wall (Red #FF1744)
    drawFnoLevel(fno.callWall, '#FF1744', 'CW', fno.callWallGex);
    // Put Wall (Green #00A35C)
    drawFnoLevel(fno.putWall, '#00A35C', 'PW', fno.putWallGex);
    // Gamma Flip (Gold / Amber #D97706)
    drawFnoLevel(fno.gammaFlip, '#D97706', 'γ-Flip');
    // Max Pain (Purple #9333EA)
    drawFnoLevel(fno.maxPain, '#9333EA', 'Max Pain');
  }

  // ── Strategy Payoff Overlay (Max Profit/Loss Zones, Breakevens, Strategy Name — Android parity) ──
  if (options.strategyOverlay && options.strategyOverlay.enabled) {
    const strat = options.strategyOverlay;

    // 1. Max Profit Zone (Translucent Green)
    if (strat.maxProfitZone) {
      const zLow = Math.max(pMin, strat.maxProfitZone.low);
      const zHigh = Math.min(pMax, strat.maxProfitZone.high);
      if (zHigh > zLow) {
        const yTop = priceToY(zHigh);
        const yBot = priceToY(zLow);
        const bH = Math.max(Math.abs(yBot - yTop), 2);
        ctx.save();
        ctx.fillStyle = 'rgba(0, 163, 92, 0.12)';
        ctx.fillRect(0, yTop, chartW, bH);
        ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = 'rgba(0, 163, 92, 0.85)';
        ctx.textAlign = 'right';
        ctx.fillText('MAX PROFIT ZONE', chartW - 8 * dpr, yTop + 10 * dpr);
        ctx.restore();
      }
    }

    // 2. Max Loss Zone (Translucent Red)
    if (strat.maxLossZone) {
      const zLow = Math.max(pMin, strat.maxLossZone.low);
      const zHigh = Math.min(pMax, strat.maxLossZone.high);
      if (zHigh > zLow) {
        const yTop = priceToY(zHigh);
        const yBot = priceToY(zLow);
        const bH = Math.max(Math.abs(yBot - yTop), 2);
        ctx.save();
        ctx.fillStyle = 'rgba(225, 29, 72, 0.12)';
        ctx.fillRect(0, yTop, chartW, bH);
        ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = 'rgba(225, 29, 72, 0.85)';
        ctx.textAlign = 'right';
        ctx.fillText('MAX LOSS ZONE', chartW - 8 * dpr, yTop + 10 * dpr);
        ctx.restore();
      }
    }

    // 3. Breakeven Points (Yellow Dotted Lines)
    if (strat.breakevenPoints && strat.breakevenPoints.length > 0) {
      for (const be of strat.breakevenPoints) {
        if (be >= pMin && be <= pMax) {
          const beY = priceToY(be);
          ctx.save();
          ctx.setLineDash([3 * dpr, 3 * dpr]);
          ctx.strokeStyle = '#EAB308';
          ctx.lineWidth = 1.2 * dpr;
          ctx.beginPath(); ctx.moveTo(0, beY); ctx.lineTo(chartW, beY); ctx.stroke();
          ctx.setLineDash([]);

          // Badge
          const beTxt = `BE: ${formatPrice(be)}`;
          ctx.font = `900 ${8 * dpr}px "JetBrains Mono",monospace`;
          const tm = ctx.measureText(beTxt);
          const bW = tm.width + 8 * dpr, bH = 12 * dpr;
          const bX = chartW - bW - 6 * dpr;
          const bY = beY - bH / 2;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(bX, bY, bW, bH);
          ctx.fillStyle = '#EAB308';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(beTxt, bX + bW / 2, beY);
          ctx.restore();
        }
      }
    }

    // 4. Strategy Watermark in top-left
    if (strat.strategyName) {
      ctx.save();
      ctx.font = `900 ${9.5 * dpr}px "JetBrains Mono",monospace`;
      ctx.fillStyle = 'rgba(2, 132, 199, 0.75)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`STRATEGY: ${strat.strategyName.toUpperCase()}`, 12 * dpr, 28 * dpr);
      ctx.restore();
    }
  }


  // ── LAYER 8 & 9: Sub-panels ───────────────────────────────────────────
  let panelOffset = chartH + BM;
  const pH = totalPanels > 0 ? panelH / totalPanels : 0;

  // Volume Panel
  if (hasVolPanel) {
    // Bg
    ctx.fillStyle = PANEL_BG; ctx.fillRect(0, panelOffset, chartW+RM, pH);
    // Separator
    ctx.strokeStyle = PANEL_SEP; ctx.lineWidth = 1*dpr;
    ctx.beginPath(); ctx.moveTo(0, panelOffset); ctx.lineTo(chartW+RM, panelOffset); ctx.stroke();

    // 20-period Volume MA calculation with adaptive warmup
    const volMa20Values: (number | null)[] = [];
    for (let i = 0; i < candles.length; i++) {
      const effP = Math.min(20, i + 1);
      let s = 0;
      for (let j = i - effP + 1; j <= i; j++) s += candles[j].volume;
      volMa20Values.push(s / effP);
    }

    // Find max vol (including volume MA)
    let maxV = 0;
    for (let i = safeStart; i < safeEnd; i++) {
      maxV = Math.max(maxV, candles[i].volume);
      const maV = volMa20Values[i];
      if (maV !== null && maV !== undefined && maV > maxV) maxV = maV;
    }

    // Label with Volume MA readout
    const lastC = candles[Math.min(endIdx-1, candles.length-1)];
    const lastMa = volMa20Values[Math.min(endIdx - 1, volMa20Values.length - 1)];
    const volTxt = lastC && lastC.volume > 0 ? `Vol ${formatVolume(lastC.volume)}` : 'Vol';
    const maTxt = lastMa !== null && lastMa !== undefined ? ` | MA(20) ${formatVolume(lastMa)}` : '';
    ctx.font = `bold ${10.5*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle = VOL_LABEL;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${volTxt}${maTxt}`, 4*dpr, panelOffset+3*dpr);

    // Max vol label right
    if (maxV > 0) {
      ctx.font = `bold ${9.5*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle = VOL_AXIS; ctx.textAlign = 'left';
      ctx.fillText(formatVolume(maxV), chartW+4*dpr, panelOffset+3*dpr);
      ctx.fillText('0', chartW+4*dpr, panelOffset+pH-12*dpr);
    }
    // Bars
    if (maxV > 0) {
      const topPad = 12*dpr;
      const avH = Math.max(1, pH - topPad - 2*dpr);
      const bw = (candleW * 0.72);
      for (let i = safeStart; i < safeEnd; i++) {
        const li = i - startIdx;
        const x = Math.round(li * candleW + (candleW - bw) / 2);
        const c = candles[i];
        const barH = Math.max(1.5, Math.round((c.volume / maxV) * avH));
        const bT = Math.round(panelOffset + pH - barH);
        ctx.fillStyle = c.close >= c.open ? 'rgba(8, 153, 129, 0.32)' : 'rgba(242, 54, 69, 0.32)';
        ctx.fillRect(x, bT, Math.round(bw), barH);
      }

      // Draw Volume MA 20 Curve (Amber/Orange line on top of volume bars)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, panelOffset, chartW, pH);
      ctx.clip();
      ctx.beginPath();
      let startedMa = false;
      for (let i = safeStart; i < Math.min(safeEnd, volMa20Values.length); i++) {
        const v = volMa20Values[i];
        if (v === null) { startedMa = false; continue; }
        const li = i - startIdx;
        const x = li * candleW + candleW / 2;
        const y = panelOffset + pH - Math.max(1, (v / maxV) * avH);
        if (!startedMa) { ctx.moveTo(x, y); startedMa = true; } else { ctx.lineTo(x, y); }
      }
      ctx.strokeStyle = '#FFB74D'; // Amber/Orange
      ctx.lineWidth = 1.4 * dpr;
      ctx.stroke();
      ctx.restore();
    }
    panelOffset += pH;
  }


  // Indicator Panels
  for (const cfg of panelInds) {
    const result = options.indicatorResults.get(cfg.id || cfg.type);
    // Panel bg + separator
    ctx.fillStyle = PANEL_BG; ctx.fillRect(0, panelOffset, chartW+RM, pH);
    ctx.strokeStyle = PANEL_SEP; ctx.lineWidth = 1*dpr;
    ctx.beginPath(); ctx.moveTo(0, panelOffset); ctx.lineTo(chartW+RM, panelOffset); ctx.stroke();
    // Label with live value
    const baseLabel = formatIndicatorBadgeLabel(cfg);
    let valSnippet = '';
    if (result) {
      if (cfg.type === 'RSI') {
        const rsiArr = result as (number|null)[];
        const lv = rsiArr[Math.min(endIdx - 1, rsiArr.length - 1)];
        if (lv !== null && lv !== undefined) valSnippet = `: ${lv.toFixed(1)}`;
      } else if (cfg.type === 'MACD') {
        const mR = result as MACDResult;
        const li = Math.min(endIdx - 1, mR.macdLine.length - 1);
        const lm = mR.macdLine[li], ls = mR.signalLine[li], lh = mR.histogram[li];
        if (lm !== null && lm !== undefined) valSnippet = `: ${lm.toFixed(2)} / Sig ${ls?.toFixed(2) ?? '-'} / Hist ${lh?.toFixed(2) ?? '-'}`;
      } else if (cfg.type === 'STOCHASTIC') {
        const stR = result as StochasticResult;
        const li = Math.min(endIdx - 1, stR.kLine.length - 1);
        const lk = stR.kLine[li], ld = stR.dLine[li];
        if (lk !== null && lk !== undefined) valSnippet = `: %K ${lk.toFixed(1)} / %D ${ld?.toFixed(1) ?? '-'}`;
      } else if (Array.isArray(result)) {
        const arr = result as (number|null)[];
        const lv = arr[Math.min(endIdx - 1, arr.length - 1)];
        if (lv !== null && lv !== undefined) valSnippet = `: ${formatPrice(lv)}`;
      }
    }

    ctx.font = `bold ${11*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle = cfg.color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`${baseLabel}${valSnippet}`, 4*dpr, panelOffset+3*dpr);

    if (!result) {
      ctx.font = `${11*dpr}px sans-serif`; ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Calculating...', chartW/2, panelOffset+pH/2);
      panelOffset += pH; continue;
    }

    const padding = 6*dpr;
    const dH = Math.max(10, pH - padding*2);
    const dT = panelOffset + padding;

    function drawPanelLine(vals: (number|null)[], minV: number, range: number, color: string, sw=1.2) {
      if (!vals || vals.length === 0) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(0, panelOffset, chartW, pH); ctx.clip();
      ctx.beginPath(); let s = false;
      let lastPoint: { x: number; y: number } | null = null;
      const loopStart = Math.max(0, startIdx - 1);
      const loopEnd = Math.min(vals.length, endIdx + 1);
      for (let i = loopStart; i < loopEnd; i++) {
        const v = vals[i];
        if (v === null || v === undefined || typeof v !== 'number' || !Number.isFinite(v)) {
          s = false;
          continue;
        }
        const li = i - startIdx;
        const x = li * candleW + candleW / 2;
        const y = dT + dH * (1 - (v - minV) / (range || 1));
        if (!s) { ctx.moveTo(x, y); s = true; } else { ctx.lineTo(x, y); }
        if (i < endIdx) lastPoint = { x, y };
      }
      ctx.strokeStyle = color; ctx.lineWidth = sw * dpr; ctx.stroke();

      if (lastPoint && endIdx >= vals.length) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(Math.min(chartW, lastPoint.x + candleW / 2), lastPoint.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = sw * dpr;
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(lastPoint.x, lastPoint.y, (sw + 1.2) * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1 * dpr;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    switch (cfg.type) {
      case 'RSI': {
        const vals = result as (number|null)[];
        const ob = dT + dH * (1 - 70/100), os = dT + dH * (1 - 30/100), mid = dT + dH * 0.5;
        ctx.save(); ctx.setLineDash([3*dpr,3*dpr]); ctx.lineWidth=0.8*dpr;
        ctx.strokeStyle='rgba(225,29,72,0.45)'; ctx.beginPath(); ctx.moveTo(0,ob); ctx.lineTo(chartW,ob); ctx.stroke();
        ctx.strokeStyle='rgba(0,163,92,0.45)'; ctx.beginPath(); ctx.moveTo(0,os); ctx.lineTo(chartW,os); ctx.stroke();
        ctx.strokeStyle='#CBD5E1'; ctx.beginPath(); ctx.moveTo(0,mid); ctx.lineTo(chartW,mid); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
        // Level labels on right axis
        ctx.font=`bold ${9.5*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle='#64748B'; ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText('70', chartW+4*dpr, ob); ctx.fillText('30', chartW+4*dpr, os);
        drawPanelLine(vals, 0, 100, cfg.color, 1.5);
        break;
      }
      case 'MACD': {
        const m = result as MACDResult;
        let minV = Infinity, maxV = -Infinity;
        for (let i = startIdx; i < Math.min(endIdx, m.macdLine.length); i++) {
          [m.macdLine[i], m.signalLine[i], m.histogram[i]].forEach(v => { if (v!==null) { minV=Math.min(minV,v); maxV=Math.max(maxV,v); } });
        }
        if (minV >= maxV) break;
        const range = maxV - minV;
        const zeroY = dT + dH * (1 - (0-minV)/range);
        ctx.save(); ctx.setLineDash([3*dpr,3*dpr]); ctx.strokeStyle='#CBD5E1'; ctx.lineWidth=0.8*dpr;
        ctx.beginPath(); ctx.moveTo(0,zeroY); ctx.lineTo(chartW,zeroY); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
        // Histogram
        const barW = candleW * 0.5;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, panelOffset, chartW, pH); ctx.clip();
        for (let i = startIdx; i < Math.min(endIdx, m.histogram.length); i++) {
          const v = m.histogram[i]; if (v===null) continue;
          const li = i-startIdx; const x = li*candleW+(candleW-barW)/2;
          const barY = dT + dH * (1 - (v-minV)/range);
          const top = Math.min(barY, zeroY), h = Math.abs(barY - zeroY);
          ctx.fillStyle = v >= 0 ? 'rgba(0,163,92,0.6)' : 'rgba(225,29,72,0.6)';
          ctx.fillRect(x, top, barW, h);
        }
        ctx.restore();
        drawPanelLine(m.macdLine, minV, range, cfg.color, 1.2);
        drawPanelLine(m.signalLine, minV, range, cfg.tertiaryColor, 1.2);
        break;
      }
      case 'STOCHASTIC': {
        const st = result as StochasticResult;
        const y80 = dT+dH*(1-80/100), y20 = dT+dH*(1-20/100);
        ctx.save(); ctx.setLineDash([3*dpr,3*dpr]); ctx.lineWidth=0.5*dpr;
        ctx.strokeStyle='rgba(225,29,72,0.35)'; ctx.beginPath(); ctx.moveTo(0,y80); ctx.lineTo(chartW,y80); ctx.stroke();
        ctx.strokeStyle='rgba(0,163,92,0.35)'; ctx.beginPath(); ctx.moveTo(0,y20); ctx.lineTo(chartW,y20); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
        ctx.font = `bold ${9.5*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle = '#64748B'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('80', chartW + 4 * dpr, y80); ctx.fillText('20', chartW + 4 * dpr, y20);
        drawPanelLine(st.kLine, 0, 100, cfg.color, 1.2);
        drawPanelLine(st.dLine, 0, 100, cfg.secondaryColor, 1.2);
        break;
      }
      case 'CVD': {
        const cvd = result as CvdResult;
        let minV=Infinity, maxV=-Infinity;
        for (let i = startIdx; i < Math.min(endIdx, cvd.cvdLine.length); i++) {
          const v = cvd.cvdLine[i]; if (v!==null) { minV=Math.min(minV,v); maxV=Math.max(maxV,v); }
        }
        if (minV>=maxV) break;
        minV=Math.min(minV,0); maxV=Math.max(maxV,0);
        const range = maxV - minV; if (range<=0) break;
        const zeroY = dT+dH*(1-(0-minV)/range);
        ctx.save(); ctx.setLineDash([3*dpr,3*dpr]); ctx.strokeStyle='#CBD5E1'; ctx.lineWidth=0.8*dpr;
        ctx.beginPath(); ctx.moveTo(0,zeroY); ctx.lineTo(chartW,zeroY); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
        // Delta bars
        const barW = candleW*0.45;
        let maxDelta = 1;
        for (let i = startIdx; i < Math.min(endIdx, cvd.deltaBars.length); i++) { const v=cvd.deltaBars[i]; if(v!==null) maxDelta=Math.max(maxDelta,Math.abs(v)); }
        const maxBarH = dH * 0.25;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, panelOffset, chartW, pH); ctx.clip();
        for (let i = startIdx; i < Math.min(endIdx, cvd.deltaBars.length); i++) {
          const d = cvd.deltaBars[i]; if(d===null) continue;
          const li=i-startIdx; const x=li*candleW+(candleW-barW)/2;
          const bH3 = Math.max(1, Math.abs(d)/maxDelta * maxBarH);
          ctx.fillStyle = d>=0 ? 'rgba(0,163,92,0.5)' : 'rgba(225,29,72,0.5)';
          ctx.fillRect(x, d>=0?zeroY-bH3:zeroY, barW, bH3);
        }
        ctx.restore();
        drawPanelLine(cvd.cvdLine, minV, range, cfg.color, 1.5);
        break;
      }
      case 'CMF': {
        const vals = result as (number|null)[];
        const zeroY = dT + dH * 0.5;
        ctx.save(); ctx.setLineDash([3*dpr,3*dpr]); ctx.strokeStyle='#CBD5E1'; ctx.lineWidth=0.8*dpr;
        ctx.beginPath(); ctx.moveTo(0,zeroY); ctx.lineTo(chartW,zeroY); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
        drawPanelLine(vals, -0.5, 1.0, cfg.color, 1.4);
        break;
      }
      default: {
        // Generic line panel (ATR, OBV, CCI, Williams R, MFI, ADX)
        const vals = (cfg.type === 'ADX' ? (result as AdxResult).adx : result) as (number|null)[];
        let minV=Infinity, maxV=-Infinity;
        for (let i = startIdx; i < Math.min(endIdx, vals.length); i++) { const v=vals[i]; if(v!==null) { minV=Math.min(minV,v); maxV=Math.max(maxV,v); } }
        if (minV>=maxV) break;
        drawPanelLine(vals, minV, maxV-minV, cfg.color, 1);
        // ADX: also draw +DI and -DI
        if (cfg.type === 'ADX') {
          const adxR = result as AdxResult;
          drawPanelLine(adxR.plusDI, minV, maxV-minV, BULL, 0.8);
          drawPanelLine(adxR.minusDI, minV, maxV-minV, BEAR, 0.8);
        }
        break;
      }
    }
    panelOffset += pH;
  }

  // ── LAYER 10: Crosshair ───────────────────────────────────────────────
  if (crosshair && !options.skipCrosshair) {
    const cx = Math.max(0, Math.min(chartW, crosshair.x));
    const cy = Math.max(0, Math.min(H, crosshair.y));
    ctx.save();
    ctx.setLineDash([4 * dpr, 3 * dpr]);
    ctx.strokeStyle = CROSSHAIR_COLOR;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(chartW, cy); ctx.stroke();
    ctx.setLineDash([]);

    // Precision reticle dot at intersection
    if (cy <= chartH) {
      ctx.beginPath();
      ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = '#2563EB';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();
    }

    // Price label on right (only when inside main chart)
    if (cy <= chartH) {
      const price = pMax - (cy / chartH) * pRange;
      const pTxt = formatPrice(price);
      ctx.font = `600 ${11.5 * dpr}px ${TV_FONT_STACK}`;
      const pMeas = ctx.measureText(pTxt);
      const pLW = Math.min(W - chartW, pMeas.width + 16 * dpr);
      const pLH = 22 * dpr;
      const pX = W - pLW;
      ctx.fillStyle = LABEL_BG;
      ctx.fillRect(pX, cy - pLH / 2, pLW, pLH);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pTxt, pX + pLW / 2, cy);
    }
    // Time label on bottom
    const cidx = startIdx + Math.floor(cx / candleW);
    if (cidx >= 0 && cidx < candles.length) {
      const c = candles[cidx];
      const ts = c.openTime;
      const tStr = formatCrosshairTime(ts, isDailyOrHigher);
      ctx.font = `600 ${11 * dpr}px ${TV_FONT_STACK}`;
      const tMeas = ctx.measureText(tStr);
      const tLW = tMeas.width + 16 * dpr;
      const tLH = 22 * dpr;
      const tLX = Math.min(Math.max(0, cx - tLW / 2), chartW - tLW);
      ctx.fillStyle = LABEL_BG;
      ctx.fillRect(tLX, chartH + (BM - tLH) / 2, tLW, tLH);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tStr, tLX + tLW / 2, chartH + BM / 2);
    }
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DUAL-CANVAS OVERLAY RENDERER (60-120 FPS Crosshair, Magnet & Active Previews)
// ═══════════════════════════════════════════════════════════════════════════

export function renderOverlay(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  options: ChartOptions,
  view: ViewState,
  crosshair: Crosshair | null,
  dpr: number,
  magnetReticle?: MagnetReticle | null
) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);

  const RM = CHART_RIGHT_MARGIN * dpr;
  const BM = CHART_BOTTOM_MARGIN * dpr;

  const panelInds = options.indicators.filter(i => !isOverlay(i.type) && i.enabled);
  const hasVolPanel = options.showVolumePanel;
  const totalPanels = panelInds.length + (hasVolPanel ? 1 : 0);
  const panelH = totalPanels === 0 ? 0 : Math.min(H * 0.38, totalPanels * 95 * dpr);
  const chartH = H - panelH - BM;
  const chartW = W - RM;

  const { startIdx, endIdx } = view;
  const visCnt = endIdx - startIdx;
  if (visCnt <= 0 || candles.length === 0) return;

  const candleW = chartW / visCnt;
  const safeStart = Math.max(0, startIdx);
  const safeEnd = Math.min(endIdx, candles.length);

  const { pMin, pMax, pRange } = computeChartPriceBounds(
    candles,
    startIdx,
    endIdx,
    options.currentPriceOverride,
    options.scaleState?.priceOffset || 0,
    options.scaleState?.priceScaleRatio || 1.0
  );

  function priceToY(p: number): number { return chartH - ((p - pMin) / pRange * chartH); }

  const getPointX = (pt: { index: number; time?: number }) => {
    const idx = resolveDrawingPointIndex(pt, candles);
    return (idx - startIdx) * candleW + candleW / 2;
  };

  // 1. Draw Active In-Progress Rubber-Band Drawing
  if (options.activeDrawing) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, chartW, chartH); ctx.clip();
    const item = options.activeDrawing;
    const color = item.color || '#2563EB';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = (item.lineWidth || 2) * dpr;

    if (item.points.length > 0) {
      const p1 = item.points[0];
      const x1 = getPointX(p1);
      const y1 = priceToY(p1.price);

      if (item.tool === 'HORIZONTAL') {
        ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(chartW, y1); ctx.stroke();
      } else if (item.tool === 'HORIZONTAL_RAY') {
        ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(chartW, y1); ctx.stroke();
      } else if (item.tool === 'VERTICAL_LINE') {
        ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, chartH); ctx.stroke();
      } else if (item.tool === 'BRUSH') {
        if (item.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          for (let k = 1; k < item.points.length; k++) {
            ctx.lineTo(getPointX(item.points[k]), priceToY(item.points[k].price));
          }
          ctx.stroke();
        }
      } else if (item.points.length >= 2) {
        const p2 = item.points[1];
        const x2 = getPointX(p2);
        const y2 = priceToY(p2.price);

        if (item.tool === 'TRENDLINE' || item.tool === 'CALLOUT') {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'RAY') {
          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            const factor = Math.max(chartW, chartH) * 3 / len;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + dx * factor, y1 + dy * factor); ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'EXTENDED_LINE') {
          const dx = x2 - x1, dy = y2 - y1;
          if (Math.abs(dx) > 0.001) {
            const slope = dy / dx;
            ctx.beginPath(); ctx.moveTo(0, y1 - x1 * slope); ctx.lineTo(chartW, y1 + (chartW - x1) * slope); ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x1, chartH); ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'FIB_CHANNEL') {
          if (item.points.length >= 3) {
            const p3 = item.points[2];
            const x3 = getPointX(p3), y3 = priceToY(p3.price);
            const yBaseAtX3 = Math.abs(x2 - x1) > 0.001 ? y1 + ((x3 - x1) / (x2 - x1)) * (y2 - y1) : y1;
            const baseDy = y3 - yBaseAtX3;
            const fibRatios = [0, 0.382, 0.5, 0.618, 1.0, 1.618];
            ctx.save();
            for (const r of fibRatios) {
              const off = baseDy * r;
              ctx.setLineDash(r === 0 || r === 1.0 ? [] : [3 * dpr, 3 * dpr]);
              ctx.beginPath(); ctx.moveTo(x1, y1 + off); ctx.lineTo(x2, y2 + off); ctx.stroke();
            }
            ctx.restore();
            ctx.beginPath(); ctx.arc(x3, y3, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'CHANNEL') {
          if (item.points.length >= 3) {
            const p3 = item.points[2];
            const x3 = getPointX(p3), y3 = priceToY(p3.price);
            const yBaseAtX3 = Math.abs(x2 - x1) > 0.001 ? y1 + ((x3 - x1) / (x2 - x1)) * (y2 - y1) : y1;
            const dyOffset = y3 - yBaseAtX3;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x1, y1 + dyOffset); ctx.lineTo(x2, y2 + dyOffset); ctx.stroke();
            ctx.beginPath(); ctx.arc(x3, y3, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'RECTANGLE') {
          const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
          ctx.fillStyle = item.color ? `${item.color}22` : 'rgba(37, 99, 235, 0.12)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);
        } else if (item.tool === 'CIRCLE') {
          const r = Math.hypot(x2 - x1, y2 - y1);
          ctx.beginPath(); ctx.arc(x1, y1, r, 0, Math.PI * 2);
          ctx.fillStyle = item.color ? `${item.color}1A` : 'rgba(37, 99, 235, 0.10)';
          ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'TREND_ANGLE') {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.save();
          ctx.setLineDash([3 * dpr, 3 * dpr]);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.stroke();
          ctx.restore();
          const angle = Math.round(Math.atan2(-(y2 - y1), x2 - x1) * 180 / Math.PI);
          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          ctx.save();
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(x1 + 8 * dpr, y1 - 12 * dpr, 36 * dpr, 13 * dpr);
          ctx.fillStyle = '#22D3EE';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${angle}°`, x1 + 26 * dpr, y1 - 5.5 * dpr);
          ctx.restore();
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.setLineDash([4 * dpr, 3 * dpr]);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    ctx.restore();
  }

  // 2. Draw Selected Drawing Anchor Rings & Selection Outline
  if (options.selectedDrawingId && options.drawings) {
    const sel = options.drawings.find(d => d.id === options.selectedDrawingId);
    if (sel && !sel.hidden && sel.points) {
      ctx.save();
      for (const pt of sel.points) {
        const px = getPointX(pt);
        const py = priceToY(pt.price);
        // Outer circular ring with TradingView blue border and white fill
        ctx.beginPath();
        ctx.arc(px, py, 6 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = '#2563EB';
        ctx.stroke();

        // Inner blue center dot
        ctx.beginPath();
        ctx.arc(px, py, 2 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#2563EB';
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 3. Draw Smart Magnet Snap Reticle
  const reticle = magnetReticle || options.magnetReticle;
  if (reticle) {
    const rx = reticle.x * dpr;
    const ry = reticle.y * dpr;
    ctx.save();
    ctx.beginPath();
    ctx.arc(rx, ry, 7.5 * dpr, 0, Math.PI * 2);
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1.8 * dpr;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rx - 10 * dpr, ry); ctx.lineTo(rx + 10 * dpr, ry);
    ctx.moveTo(rx, ry - 10 * dpr); ctx.lineTo(rx, ry + 10 * dpr);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rx, ry, 2.5 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#06B6D4';
    ctx.fill();

    const badgeText = `${reticle.type[0]} ${formatPrice(reticle.price)}`;
    ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
    const m = ctx.measureText(badgeText);
    const bw = m.width + 6 * dpr, bh = 13 * dpr;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(rx + 8 * dpr, ry - bh / 2, bw, bh);
    ctx.fillStyle = '#22D3EE';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, rx + 11 * dpr, ry);
    ctx.restore();
  }

  // 4. Draw Crosshair & Coordinate Badges
  if (crosshair) {
    const cx = Math.max(0, Math.min(chartW, crosshair.x));
    const cy = Math.max(0, Math.min(H, crosshair.y));
    ctx.save();
    ctx.setLineDash([4 * dpr, 3 * dpr]);
    ctx.strokeStyle = options.cursorMode === 'arrow' ? 'rgba(51, 65, 85, 0.45)' : CROSSHAIR_COLOR;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(chartW, cy); ctx.stroke();
    ctx.setLineDash([]);

    if (cy <= chartH) {
      if (options.cursorMode !== 'arrow') {
        ctx.beginPath();
        ctx.arc(cx, cy, 3 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = '#2563EB';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.2 * dpr;
        ctx.stroke();
      }

      const price = pMax - (cy / chartH) * pRange;
      const pTxt = formatPrice(price);
      ctx.font = `600 ${11.5 * dpr}px ${TV_FONT_STACK}`;
      const pMeas = ctx.measureText(pTxt);
      const pLW = Math.min(W - chartW, pMeas.width + 16 * dpr);
      const pLH = 22 * dpr;
      const pX = W - pLW;
      ctx.fillStyle = LABEL_BG;
      ctx.fillRect(pX, cy - pLH / 2, pLW, pLH);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pTxt, pX + pLW / 2, cy);
    }

    const firstMs = candles.length > 0 ? candles[0].openTime : 0;
    const lastMs = candles.length > 0 ? candles[candles.length - 1].openTime : 0;
    const avgDur = candles.length > 1 ? Math.abs(lastMs - firstMs) / (candles.length - 1) : 86400000;
    const tf = options.timeframe.toUpperCase();
    const isDailyOrHigher = ['1D','D','1W','W','1M','M'].includes(tf) || avgDur >= 20 * 3600000;

    const cidx = startIdx + Math.floor(cx / candleW);
    if (cidx >= 0 && cidx < candles.length) {
      const c = candles[cidx];
      const ts = c.openTime;
      const tStr = formatCrosshairTime(ts, isDailyOrHigher);
      ctx.font = `600 ${11 * dpr}px ${TV_FONT_STACK}`;
      const tMeas = ctx.measureText(tStr);
      const tLW = tMeas.width + 16 * dpr;
      const tLH = 22 * dpr;
      const tLX = Math.min(Math.max(0, cx - tLW / 2), chartW - tLW);
      ctx.fillStyle = LABEL_BG;
      ctx.fillRect(tLX, chartH + (BM - tLH) / 2, tLW, tLH);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tStr, tLX + tLW / 2, chartH + BM / 2);
    }
    ctx.restore();
  }
}
