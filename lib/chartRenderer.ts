// ═══════════════════════════════════════════════════════════════════════════
// chartRenderer.ts — 10-Layer Canvas Chart Engine
// Pixel-perfect translation of Android Market Intelligence 007 chart layers
// ═══════════════════════════════════════════════════════════════════════════

// ── Types ──────────────────────────────────────────────────────────────────
import {
  Candle, ChartType, IndicatorType, IndicatorConfig,
  MACDResult, BollingerResult, SupertrendResult, StochasticResult,
  IchimokuResult, AdxResult, CvdResult,
  VolumeProfileBucket, VolumeProfileData,
  SmcFvg, SmcLiquiditySweep, SmcAnalysis,
  ChartOptions, ViewState, Crosshair,
  INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES, isOverlay,
} from './types';

export type {
  Candle, ChartType, IndicatorType, IndicatorConfig,
  MACDResult, BollingerResult, SupertrendResult, StochasticResult,
  IchimokuResult, AdxResult, CvdResult,
  VolumeProfileBucket, VolumeProfileData,
  SmcFvg, SmcLiquiditySweep, SmcAnalysis,
  ChartOptions, ViewState, Crosshair,
};
export { INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES, isOverlay };

// ── Color Constants (Crisp Professional Light Theme) ──────────────────────
const BULL  = '#00A35C';
const BEAR  = '#E11D48';
const LINE_COLOR = '#2563EB';
const GRID  = '#F1F5F9';
const AXIS_TEXT = '#475569';
const CROSSHAIR_COLOR = 'rgba(71, 85, 105, 0.45)';
const LABEL_BG = '#0F172A';
const PANEL_BG = '#F8FAFC';
const PANEL_SEP = '#E2E8F0';
const VOL_LABEL = '#0284C7';
const VOL_AXIS = '#64748B';

// ── Formatters ────────────────────────────────────────────────────────────
export function formatPrice(p: number): string {
  if (p >= 10000) return p.toFixed(0);
  if (p >= 100) return p.toFixed(1);
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
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
// INDICATOR CALCULATIONS (exact from IndicatorCalculator.kt)
// ═══════════════════════════════════════════════════════════════════════════

export function calculateSMA(candles: Candle[], period: number): (number|null)[] {
  if (candles.length < period) return Array(candles.length).fill(null);
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0; for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    return sum / period;
  });
}

export function calculateEMA(candles: Candle[], period: number): (number|null)[] {
  if (candles.length < period) return Array(candles.length).fill(null);
  const mult = 2 / (period + 1);
  const result: (number|null)[] = Array(candles.length).fill(null);
  let sum = 0; for (let i = 0; i < period; i++) sum += candles[i].close;
  result[period - 1] = sum / period;
  for (let i = period; i < candles.length; i++) {
    const prev = result[i-1]!;
    result[i] = (candles[i].close - prev) * mult + prev;
  }
  return result;
}

export function calculateRSI(candles: Candle[], period: number): (number|null)[] {
  if (candles.length < period + 1) return Array(candles.length).fill(null);
  const result: (number|null)[] = Array(candles.length).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const chg = candles[i].close - candles[i-1].close;
    if (chg > 0) avgGain += chg; else avgLoss += Math.abs(chg);
  }
  avgGain /= period; avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < candles.length; i++) {
    const chg = candles[i].close - candles[i-1].close;
    const gain = chg > 0 ? chg : 0;
    const loss = chg < 0 ? Math.abs(chg) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export function calculateMACD(candles: Candle[], fast=12, slow=26, signal=9): MACDResult {
  const fastEma = calculateEMA(candles, fast);
  const slowEma = calculateEMA(candles, slow);
  const sz = candles.length;
  const macdLine: (number|null)[] = Array(sz).fill(null);
  for (let i = 0; i < sz; i++) {
    const f = fastEma[i], s = slowEma[i];
    macdLine[i] = (f !== null && s !== null) ? f - s : null;
  }
  const signalLine: (number|null)[] = Array(sz).fill(null);
  const histogram: (number|null)[] = Array(sz).fill(null);
  const macdVals = macdLine.filter(v => v !== null) as number[];
  if (macdVals.length >= signal) {
    const macdStart = macdLine.findIndex(v => v !== null);
    const mult = 2 / (signal + 1);
    let sigSum = 0; for (let i = 0; i < signal; i++) sigSum += macdVals[i];
    const seedIdx = macdStart + signal - 1;
    if (seedIdx < sz) {
      signalLine[seedIdx] = sigSum / signal;
      histogram[seedIdx] = macdLine[seedIdx]! - signalLine[seedIdx]!;
      for (let i = seedIdx + 1; i < sz; i++) {
        const mv = macdLine[i], ps = signalLine[i-1];
        if (mv !== null && ps !== null) {
          signalLine[i] = (mv - ps) * mult + ps;
          histogram[i] = mv - signalLine[i]!;
        }
      }
    }
  }
  return { macdLine, signalLine, histogram };
}

export function calculateBollingerBands(candles: Candle[], period=20, deviation=2): BollingerResult {
  const sma = calculateSMA(candles, period);
  const upper: (number|null)[] = Array(candles.length).fill(null);
  const lower: (number|null)[] = Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    const mid = sma[i]; if (mid === null || i < period - 1) continue;
    let sumSqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) { const d = candles[j].close - mid; sumSqDiff += d*d; }
    const stdDev = Math.sqrt(sumSqDiff / period);
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
    const c = candles[i]; const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume; cumVol += c.volume;
    result[i] = cumVol > 0 ? cumTPV / cumVol : null;
  }
  return result;
}

export function calculateATR(candles: Candle[], period=14): (number|null)[] {
  if (candles.length < 2) return Array(candles.length).fill(null);
  const result: (number|null)[] = Array(candles.length).fill(null);
  const tr = Array(candles.length).fill(0);
  tr[0] = candles[0].high - candles[0].low;
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hpc = Math.abs(candles[i].high - candles[i-1].close);
    const lpc = Math.abs(candles[i].low - candles[i-1].close);
    tr[i] = Math.max(hl, hpc, lpc);
  }
  if (candles.length >= period) {
    let sum = 0; for (let i = 0; i < period; i++) sum += tr[i];
    result[period - 1] = sum / period;
    for (let i = period; i < candles.length; i++) {
      result[i] = (result[i-1]! * (period - 1) + tr[i]) / period;
    }
  }
  return result;
}

export function calculateSupertrend(candles: Candle[], period=10, multiplier=3): SupertrendResult {
  const atr = calculateATR(candles, period);
  const values: (number|null)[] = Array(candles.length).fill(null);
  const directions: (boolean|null)[] = Array(candles.length).fill(null);
  if (candles.length < period) return { values, directions };
  let prevUB = 0, prevLB = 0, prevST = 0;
  for (let i = period - 1; i < candles.length; i++) {
    const atrVal = atr[i]; if (atrVal === null) continue;
    const hl2 = (candles[i].high + candles[i].low) / 2;
    let ub = hl2 + multiplier * atrVal;
    let lb = hl2 - multiplier * atrVal;
    if (i > period - 1) {
      if (!(lb > prevLB || candles[i-1].close < prevLB)) lb = prevLB;
      if (!(ub < prevUB || candles[i-1].close > prevUB)) ub = prevUB;
      const dir = prevST === prevUB ? candles[i].close > ub : candles[i].close >= lb;
      const st = dir ? lb : ub;
      values[i] = st; directions[i] = dir; prevST = st;
    } else {
      const dir = candles[i].close > hl2;
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
  for (let i = kPeriod - 1; i < sz; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) { hh = Math.max(hh, candles[j].high); ll = Math.min(ll, candles[j].low); }
    const range = hh - ll;
    kLine[i] = range > 0 ? ((candles[i].close - ll) / range) * 100 : 50;
  }
  const kStart = kLine.findIndex(v => v !== null);
  if (kStart >= 0) {
    for (let i = kStart + dPeriod - 1; i < sz; i++) {
      let sum = 0, cnt = 0;
      for (let j = i - dPeriod + 1; j <= i; j++) { if (kLine[j] !== null) { sum += kLine[j]!; cnt++; } }
      if (cnt === dPeriod) dLine[i] = sum / dPeriod;
    }
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
  function midpoint(end: number, period: number): number | null {
    if (end < period - 1) return null;
    let hh = -Infinity, ll = Infinity;
    for (let j = end - period + 1; j <= end; j++) { hh = Math.max(hh, candles[j].high); ll = Math.min(ll, candles[j].low); }
    return (hh + ll) / 2;
  }
  for (let i = 0; i < sz; i++) {
    tenkanSen[i] = midpoint(i, tenkanP);
    kijunSen[i] = midpoint(i, kijunP);
    const t = tenkanSen[i], k = kijunSen[i];
    if (t !== null && k !== null) senkouSpanA[i + kijunP] = (t + k) / 2;
    const sb = midpoint(i, senkouBP);
    if (sb !== null) senkouSpanB[i + kijunP] = sb;
    const pi = i - kijunP;
    if (pi >= 0) chikouSpan[pi] = candles[i].close;
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

export function detectSMC(candles: Candle[]): SmcAnalysis {
  if (candles.length < 5) return { fvgs: [], sweeps: [] };
  const fvgs: SmcFvg[] = [];
  const sweeps: SmcLiquiditySweep[] = [];
  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i-2], c3 = candles[i];
    if (c3.low > c1.high) {
      const fvg: SmcFvg = { startIndex: i-1, endIndex: candles.length-1, topPrice: c3.low, bottomPrice: c1.high, isBullish: true, isMitigated: false };
      for (let k = i+1; k < candles.length; k++) { if (candles[k].low <= fvg.bottomPrice) { fvg.isMitigated = true; fvg.endIndex = k; break; } }
      fvgs.push(fvg);
    } else if (c3.high < c1.low) {
      const fvg: SmcFvg = { startIndex: i-1, endIndex: candles.length-1, topPrice: c1.low, bottomPrice: c3.high, isBullish: false, isMitigated: false };
      for (let k = i+1; k < candles.length; k++) { if (candles[k].high >= fvg.topPrice) { fvg.isMitigated = true; fvg.endIndex = k; break; } }
      fvgs.push(fvg);
    }
  }
  const pp = 5;
  for (let i = pp * 2; i < candles.length; i++) {
    const cH = candles[i-pp].high, cL = candles[i-pp].low;
    let isPH = true, isPL = true;
    for (let p = i - pp * 2; p < i; p++) {
      if (p !== i - pp) { if (candles[p].high > cH) isPH = false; if (candles[p].low < cL) isPL = false; }
    }
    const cur = candles[i];
    if (isPH && cur.high > cH && cur.close < cH) sweeps.push({ candleIndex: i, price: cur.high, isHighSweep: true, label: 'BSL Sweep ($$$)' });
    if (isPL && cur.low < cL && cur.close > cL) sweeps.push({ candleIndex: i, price: cur.low, isHighSweep: false, label: 'SSL Sweep ($$$)' });
  }
  return { fvgs, sweeps };
}

export function calculateParabolicSAR(candles: Candle[], step=0.02, maxAf=0.20): (number|null)[] {
  if (candles.length < 2) return Array(candles.length).fill(null);
  const sar: (number|null)[] = Array(candles.length).fill(null);
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
  if (sz <= period) return { plusDI, minusDI, adx };
  const tr = Array(sz).fill(0), plusDM = Array(sz).fill(0), minusDM = Array(sz).fill(0);
  for (let i = 1; i < sz; i++) {
    const hd = candles[i].high - candles[i-1].high, ld = candles[i-1].low - candles[i].low;
    tr[i] = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i-1].close), Math.abs(candles[i].low - candles[i-1].close));
    plusDM[i] = (hd > ld && hd > 0) ? hd : 0;
    minusDM[i] = (ld > hd && ld > 0) ? ld : 0;
  }
  let trSum = 0, pDMSum = 0, mDMSum = 0;
  for (let i = 1; i <= period; i++) { trSum += tr[i]; pDMSum += plusDM[i]; mDMSum += minusDM[i]; }
  const dx: (number|null)[] = Array(sz).fill(null);
  for (let i = period; i < sz; i++) {
    if (i > period) { trSum = trSum - trSum / period + tr[i]; pDMSum = pDMSum - pDMSum / period + plusDM[i]; mDMSum = mDMSum - mDMSum / period + minusDM[i]; }
    const pdi = trSum === 0 ? 0 : 100 * pDMSum / trSum;
    const mdi = trSum === 0 ? 0 : 100 * mDMSum / trSum;
    plusDI[i] = pdi; minusDI[i] = mdi;
    dx[i] = (pdi + mdi === 0) ? 0 : 100 * Math.abs(pdi - mdi) / (pdi + mdi);
  }
  let dxSum = 0, dxCnt = 0;
  for (let i = period; i < sz; i++) {
    dxSum += dx[i]!; dxCnt++;
    if (dxCnt === period) adx[i] = dxSum / period;
    else if (dxCnt > period) adx[i] = (adx[i-1]! * (period - 1) + dx[i]!) / period;
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
  if (sz < period) return cci;
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);
  for (let i = period - 1; i < sz; i++) {
    let sum = 0; for (let j = i - period + 1; j <= i; j++) sum += tp[j];
    const sma = sum / period;
    let mdSum = 0; for (let j = i - period + 1; j <= i; j++) mdSum += Math.abs(tp[j] - sma);
    const md = mdSum / period;
    cci[i] = md === 0 ? 0 : (tp[i] - sma) / (0.015 * md);
  }
  return cci;
}

export function calculateWilliamsR(candles: Candle[], period=14): (number|null)[] {
  const sz = candles.length;
  const r: (number|null)[] = Array(sz).fill(null);
  if (sz < period) return r;
  for (let i = period - 1; i < sz; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) { hh = Math.max(hh, candles[j].high); ll = Math.min(ll, candles[j].low); }
    const d = hh - ll;
    r[i] = d === 0 ? 0 : ((hh - candles[i].close) / d) * -100;
  }
  return r;
}

export function calculateMFI(candles: Candle[], period=14): (number|null)[] {
  const sz = candles.length;
  const mfi: (number|null)[] = Array(sz).fill(null);
  if (sz <= period) return mfi;
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);
  const rmf = candles.map((c, i) => tp[i] * c.volume);
  for (let i = period; i < sz; i++) {
    let pos = 0, neg = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] > tp[j-1]) pos += rmf[j]; else if (tp[j] < tp[j-1]) neg += rmf[j];
    }
    mfi[i] = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
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
  const RM = 58 * dpr;  // right price axis margin
  const BM = 22 * dpr;  // time axis margin

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

  // Price range with 5% padding
  let pMin = Infinity, pMax = -Infinity;
  for (let i = startIdx; i < Math.min(endIdx, candles.length); i++) {
    pMin = Math.min(pMin, candles[i].low);
    pMax = Math.max(pMax, candles[i].high);
  }
  const pad = (pMax - pMin) * 0.05 || 1;
  pMin -= pad; pMax += pad;
  const pRange = pMax - pMin;

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

  // ── LAYER 1: Grid & Axes (Light Mode) ──────────────────────────────────
  ctx.save();
  const gridDash = [4*dpr, 4*dpr];
  const numHL = 5;
  const pStep = pRange / numHL;
  ctx.setLineDash(gridDash);
  ctx.lineWidth = 0.8 * dpr;
  ctx.strokeStyle = '#F1F5F9';
  ctx.font = `${9*dpr}px "JetBrains Mono",monospace`;
  ctx.fillStyle = AXIS_TEXT;
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= numHL; i++) {
    const price = pMin + i * pStep;
    const y = priceToY(price);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    ctx.fillText(formatPrice(price), chartW + 4*dpr, y);
  }

  // Vertical grid + time labels
  const timeStep = Math.max(1, Math.floor(visCnt / 6));
  ctx.font = `${8*dpr}px "JetBrains Mono",monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let prevDay = -1;
  for (let i = startIdx; i < endIdx; i += timeStep) {
    const li = i - startIdx;
    const x = li * candleW + candleW / 2;
    ctx.strokeStyle = '#F1F5F9'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, chartH); ctx.stroke();
    if (i < candles.length) {
      const ts = candles[i].openTime;
      const d = new Date(ts);
      const curDay = d.getDate();
      const multiDay = !isDailyOrHigher && Math.abs(lastMs - firstMs) > 86400000;
      let label: string;
      if (isDailyOrHigher) label = formatTimeLabel(ts, true);
      else if (multiDay && prevDay !== curDay) label = formatTimeLabel(ts, true);
      else label = formatTimeLabel(ts, false);
      prevDay = curDay;
      ctx.fillStyle = AXIS_TEXT;
      ctx.fillText(label, x, chartH + 5*dpr);
    }
  }

  // Solid separators for right price scale and bottom time scale
  ctx.setLineDash([]);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, chartH + BM); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, chartH); ctx.lineTo(W, chartH); ctx.stroke();
  ctx.restore();

  // ── LAYER 2: Volume Profile (VPVR) ────────────────────────────────────
  if (options.showVolumeProfile) {
    const visCandles = candles.slice(startIdx, Math.min(endIdx, candles.length));
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

  // ── LAYER 3: SMC Overlays ─────────────────────────────────────────────
  if (options.showSmcOverlay) {
    const smcData = detectSMC(candles);
    // FVGs
    for (const fvg of smcData.fvgs) {
      if (fvg.endIndex < startIdx || fvg.startIndex > endIdx) continue;
      const ls = Math.max(0, fvg.startIndex - startIdx);
      const le = Math.min(visCnt, fvg.endIndex - startIdx);
      const lx = ls * candleW, rx = le * candleW + candleW;
      const bw = Math.max(rx - lx, candleW);
      const yT = priceToY(fvg.topPrice), yB = priceToY(fvg.bottomPrice);
      const bTop = Math.min(yT, yB), bH = Math.max(Math.abs(yT - yB), 2);
      const base = fvg.isBullish ? [0,230,118] : [255,82,82];
      const fa = fvg.isMitigated ? 0.05 : 0.18;
      const ba = fvg.isMitigated ? 0.15 : 0.45;
      ctx.fillStyle = `rgba(${base},${fa})`; ctx.fillRect(lx, bTop, bw, bH);
      ctx.strokeStyle = `rgba(${base},${ba})`; ctx.lineWidth = 0.8*dpr;
      ctx.strokeRect(lx, bTop, bw, bH);
      if (!fvg.isMitigated && bw > 20*dpr) {
        ctx.font = `bold ${7*dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = `rgba(${base},0.8)`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(fvg.isBullish ? '+FVG' : '-FVG', lx+2*dpr, bTop+1*dpr);
      }
    }
    // Sweeps
    for (const sw of smcData.sweeps) {
      if (sw.candleIndex >= startIdx && sw.candleIndex < endIdx) {
        const li = sw.candleIndex - startIdx;
        const x = li * candleW + candleW / 2;
        const y = priceToY(sw.price);
        ctx.font = `900 ${7*dpr}px "JetBrains Mono",monospace`;
        ctx.textAlign = 'center';
        if (sw.isHighSweep) {
          ctx.fillStyle = BEAR; ctx.textBaseline = 'bottom';
          ctx.fillText('▼ BSL', x, y - 3*dpr);
        } else {
          ctx.fillStyle = BULL; ctx.textBaseline = 'top';
          ctx.fillText('▲ SSL', x, y + 2*dpr);
        }
      }
    }
  }

  // ── LAYER 4: Volume Overlay (behind candles) ──────────────────────────
  if (options.showVolume && !options.showVolumePanel) {
    const volH = chartH * 0.15;
    const volBodyW = candleW * 0.7;
    let maxV = 0;
    for (let i = startIdx; i < Math.min(endIdx, candles.length); i++) maxV = Math.max(maxV, candles[i].volume);
    if (maxV > 0) {
      for (let i = startIdx; i < Math.min(endIdx, candles.length); i++) {
        const li = i - startIdx;
        const x = li * candleW + (candleW - volBodyW) / 2;
        const c = candles[i];
        const ratio = Math.min(1, Math.max(0.08, c.volume / maxV));
        const barH = ratio * volH * 0.9;
        const bTop = chartH - barH;
        const bull = c.close >= c.open;
        ctx.fillStyle = bull ? 'rgba(0,230,118,0.35)' : 'rgba(255,23,68,0.35)';
        ctx.fillRect(x, bTop, volBodyW, barH);
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
    for (let i = startIdx; i < Math.min(endIdx, candles.length); i++) {
      const x = (i-startIdx)*candleW + candleW/2, y = priceToY(candles[i].close);
      if (!started) { ctx.moveTo(x,y); started=true; } else ctx.lineTo(x,y);
    }
    ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = 1.5*dpr; ctx.stroke();
  } else if (options.chartType === 'AREA') {
    const pts: {x:number;y:number}[] = [];
    for (let i = startIdx; i < Math.min(endIdx, candles.length); i++) {
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
    const bodyW = candleW * 0.65;
    const wickW = 1 * dpr;
    const isHollow = options.chartType === 'HOLLOW_CANDLE';
    for (let i = startIdx; i < Math.min(endIdx, drawCandles.length); i++) {
      const li = i - startIdx;
      const c = drawCandles[i];
      const bull = c.close >= c.open;
      const color = bull ? BULL : BEAR;
      const cx = li * candleW + candleW / 2;
      const hY = priceToY(c.high), lY = priceToY(c.low);
      const oY = priceToY(c.open), cY = priceToY(c.close);
      const bTop = Math.min(oY, cY), bBot = Math.max(oY, cY);
      const bH = Math.max(bBot - bTop, 1);
      // Wick
      ctx.strokeStyle = color; ctx.lineWidth = wickW;
      ctx.beginPath(); ctx.moveTo(cx, hY); ctx.lineTo(cx, lY); ctx.stroke();
      // Body
      const bLeft = cx - bodyW / 2;
      if (isHollow && bull) {
        ctx.strokeStyle = color; ctx.lineWidth = 1*dpr;
        ctx.strokeRect(bLeft, bTop, bodyW, bH);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(bLeft, bTop, bodyW, bH);
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
    // Glow halo
    ctx.strokeStyle = bull ? 'rgba(0,230,118,0.28)' : 'rgba(255,23,68,0.28)';
    ctx.lineWidth = 3.5*dpr;
    ctx.beginPath(); ctx.moveTo(0, clY); ctx.lineTo(chartW, clY); ctx.stroke();
    // Dashed line
    ctx.save(); ctx.setLineDash([6*dpr, 4*dpr]);
    ctx.strokeStyle = accent; ctx.lineWidth = 1.6*dpr;
    ctx.beginPath(); ctx.moveTo(0, clY); ctx.lineTo(chartW, clY); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    // Pill badge on right axis
    const prStr = formatPrice(curPrice);
    ctx.font = `900 ${9*dpr}px "JetBrains Mono",monospace`;
    const tm = ctx.measureText(prStr);
    const padH = 5*dpr, padV = 3*dpr, dotR = 2*dpr;
    const bW = tm.width + padH*2 + 8*dpr;
    const bH2 = 9*dpr + padV*2;
    const bL = chartW + 2*dpr;
    const bT = clY - bH2/2;
    // Pill bg
    ctx.fillStyle = accent;
    ctx.beginPath();
    const cr = 4*dpr;
    ctx.moveTo(bL+cr, bT); ctx.lineTo(bL+bW-cr, bT); ctx.arcTo(bL+bW, bT, bL+bW, bT+cr, cr);
    ctx.lineTo(bL+bW, bT+bH2-cr); ctx.arcTo(bL+bW, bT+bH2, bL+bW-cr, bT+bH2, cr);
    ctx.lineTo(bL+cr, bT+bH2); ctx.arcTo(bL, bT+bH2, bL, bT+bH2-cr, cr);
    ctx.lineTo(bL, bT+cr); ctx.arcTo(bL, bT, bL+cr, bT, cr);
    ctx.closePath(); ctx.fill();
    // Live dot
    const txtColor = bull ? '#000000' : '#FFFFFF';
    ctx.fillStyle = txtColor;
    ctx.beginPath(); ctx.arc(bL+padH+dotR, clY, dotR, 0, Math.PI*2); ctx.fill();
    // Price text
    ctx.fillStyle = txtColor;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(prStr, bL+padH+dotR*2+3*dpr, clY);
  }

  // ── LAYER 6.5: User Drawings (Trendlines, Horizontal Rays, Boxes, Fibonacci) ──
  const allDrawings = [...(options.drawings || [])];
  if (options.activeDrawing) allDrawings.push(options.activeDrawing);

  if (allDrawings.length > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, chartW, chartH); ctx.clip();

    for (const item of allDrawings) {
      if (!item.points || item.points.length === 0) continue;
      const p1 = item.points[0];
      const x1 = (p1.index - startIdx) * candleW + candleW / 2;
      const y1 = priceToY(p1.price);

      ctx.strokeStyle = item.color || '#2563EB';
      ctx.fillStyle = item.color || '#2563EB';
      ctx.lineWidth = (item.lineWidth || 2) * dpr;

      if (item.tool === 'HORIZONTAL') {
        ctx.save();
        ctx.setLineDash([6 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.moveTo(0, y1); ctx.lineTo(chartW, y1); ctx.stroke();
        ctx.restore();
        ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillText(`H-Line: ${formatPrice(p1.price)}`, 6 * dpr, y1 - 4 * dpr);
      } else if (item.points.length >= 2) {
        const p2 = item.points[1];
        const x2 = (p2.index - startIdx) * candleW + candleW / 2;
        const y2 = priceToY(p2.price);

        if (item.tool === 'TRENDLINE') {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          ctx.beginPath(); ctx.arc(x1, y1, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x2, y2, 3.5 * dpr, 0, Math.PI * 2); ctx.fill();
        } else if (item.tool === 'RECTANGLE') {
          const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
          ctx.fillStyle = item.color ? `${item.color}22` : 'rgba(37, 99, 235, 0.12)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);
        } else if (item.tool === 'FIBONACCI') {
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
          const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
          for (const lvl of levels) {
            const ly = y1 + (y2 - y1) * lvl;
            const pVal = p1.price + (p2.price - p1.price) * lvl;
            ctx.save();
            ctx.setLineDash([3 * dpr, 3 * dpr]);
            ctx.beginPath(); ctx.moveTo(minX, ly); ctx.lineTo(maxX, ly); ctx.stroke();
            ctx.restore();
            ctx.font = `${7.5 * dpr}px "JetBrains Mono",monospace`;
            ctx.fillText(`${(lvl * 100).toFixed(1)}% (${formatPrice(pVal)})`, minX + 4 * dpr, ly - 3 * dpr);
          }
        }
      }
    }
    ctx.restore();
  }

  // ── LAYER 7: Indicator Overlays ───────────────────────────────────────
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, chartW, chartH); ctx.clip();
  for (const cfg of options.indicators) {
    if (!cfg.enabled || !isOverlay(cfg.type)) continue;
    const result = options.indicatorResults.get(cfg.type);
    if (!result) continue;

    function drawLine(vals: (number|null)[], color: string, sw: number) {
      ctx.beginPath(); let s = false;
      for (let i = startIdx; i < Math.min(endIdx, vals.length); i++) {
        const v = vals[i]; if (v === null) { s = false; continue; }
        const x = (i-startIdx)*candleW+candleW/2, y = priceToY(v);
        if (!s) { ctx.moveTo(x,y); s=true; } else ctx.lineTo(x,y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = sw*dpr; ctx.stroke();
    }

    function drawBandFill(upper: (number|null)[], lower: (number|null)[], color: string) {
      const ups: {x:number;y:number}[] = [], lows: {x:number;y:number}[] = [];
      for (let i = startIdx; i < Math.min(endIdx, Math.min(upper.length, lower.length)); i++) {
        const u = upper[i], l = lower[i]; if (u === null || l === null) continue;
        const x = (i-startIdx)*candleW+candleW/2;
        ups.push({x, y: priceToY(u)}); lows.push({x, y: priceToY(l)});
      }
      if (ups.length < 2) return;
      ctx.beginPath(); ctx.moveTo(ups[0].x, ups[0].y);
      ups.forEach(p => ctx.lineTo(p.x, p.y));
      for (let i = lows.length-1; i >= 0; i--) ctx.lineTo(lows[i].x, lows[i].y);
      ctx.closePath(); ctx.fillStyle = color; ctx.fill();
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
        for (let i = startIdx; i < Math.min(endIdx, st.values.length); i++) {
          const v = st.values[i], d = st.directions[i]; if (v===null||d===null) continue;
          const x = (i-startIdx)*candleW+candleW/2, y = priceToY(v);
          if (curBull !== null && curBull !== d) {
            ctx.beginPath(); path.forEach((p,j)=> j===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
            ctx.strokeStyle = curBull ? BULL : BEAR; ctx.lineWidth=2*dpr; ctx.stroke();
            path = [{x,y}];
          } else { path.push({x,y}); }
          curBull = d;
        }
        if (path.length > 0) {
          ctx.beginPath(); path.forEach((p,j)=> j===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
          ctx.strokeStyle = curBull ? BULL : BEAR; ctx.lineWidth=2*dpr; ctx.stroke();
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
        for (let i = startIdx; i < Math.min(endIdx, sarVals.length); i++) {
          const v = sarVals[i]; if (v === null) continue;
          const x = (i-startIdx)*candleW+candleW/2, y = priceToY(v);
          ctx.fillStyle = cfg.color; ctx.beginPath(); ctx.arc(x, y, 2*dpr, 0, Math.PI*2); ctx.fill();
        }
        break;
      }
    }
  }
  ctx.restore();

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
    // Find max vol
    let maxV = 0;
    for (let i = startIdx; i < Math.min(endIdx, candles.length); i++) maxV = Math.max(maxV, candles[i].volume);
    // Label
    const lastC = candles[Math.min(endIdx-1, candles.length-1)];
    const volTxt = lastC && lastC.volume > 0 ? `Vol ${formatVolume(lastC.volume)}` : 'Vol';
    ctx.font = `bold ${8.5*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle = VOL_LABEL;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(volTxt, 4*dpr, panelOffset+2*dpr);
    // Max vol label right
    if (maxV > 0) {
      ctx.font = `${7.5*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle = VOL_AXIS; ctx.textAlign = 'left';
      ctx.fillText(formatVolume(maxV), chartW+3*dpr, panelOffset+2*dpr);
      ctx.fillText('0', chartW+3*dpr, panelOffset+pH-11*dpr);
    }
    // Bars
    if (maxV > 0) {
      const topPad = 12*dpr;
      const avH = Math.max(1, pH - topPad - 2*dpr);
      const bw = (candleW * 0.72);
      for (let i = startIdx; i < Math.min(endIdx, candles.length); i++) {
        const li = i - startIdx;
        const x = li * candleW + (candleW - bw) / 2;
        const c = candles[i];
        const barH = Math.max(1.5, (c.volume / maxV) * avH);
        const bT = panelOffset + pH - barH;
        ctx.fillStyle = c.close >= c.open ? 'rgba(0,163,92,0.7)' : 'rgba(225,29,72,0.7)';
        ctx.fillRect(x, bT, bw, barH);
      }
    }
    panelOffset += pH;
  }

  // Indicator Panels
  for (const cfg of panelInds) {
    const result = options.indicatorResults.get(cfg.type);
    // Panel bg + separator
    ctx.fillStyle = PANEL_BG; ctx.fillRect(0, panelOffset, chartW+RM, pH);
    ctx.strokeStyle = PANEL_SEP; ctx.lineWidth = 1*dpr;
    ctx.beginPath(); ctx.moveTo(0, panelOffset); ctx.lineTo(chartW+RM, panelOffset); ctx.stroke();
    // Label
    ctx.font = `bold ${9*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle = cfg.color;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(INDICATOR_DEFAULTS[cfg.type].label, 4*dpr, panelOffset+3*dpr);

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
      ctx.beginPath(); let s = false;
      for (let i = startIdx; i < Math.min(endIdx, vals.length); i++) {
        const v = vals[i]; if (v === null) { s=false; continue; }
        const li = i - startIdx;
        const x = li*candleW+candleW/2;
        const y = dT + dH * (1 - (v - minV) / (range || 1));
        if (!s) { ctx.moveTo(x,y); s=true; } else ctx.lineTo(x,y);
      }
      ctx.strokeStyle = color; ctx.lineWidth = sw*dpr; ctx.stroke();
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
        ctx.font=`${7.5*dpr}px "JetBrains Mono",monospace`; ctx.fillStyle='#64748B'; ctx.textAlign='left'; ctx.textBaseline='middle';
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
        ctx.strokeStyle='#333333'; ctx.lineWidth=0.5*dpr; ctx.beginPath(); ctx.moveTo(0,zeroY); ctx.lineTo(chartW,zeroY); ctx.stroke();
        // Histogram
        const barW = candleW * 0.5;
        for (let i = startIdx; i < Math.min(endIdx, m.histogram.length); i++) {
          const v = m.histogram[i]; if (v===null) continue;
          const li = i-startIdx; const x = li*candleW+(candleW-barW)/2;
          const barY = dT + dH * (1 - (v-minV)/range);
          const top = Math.min(barY, zeroY), h = Math.abs(barY - zeroY);
          ctx.fillStyle = v >= 0 ? 'rgba(0,230,118,0.5)' : 'rgba(255,23,68,0.5)';
          ctx.fillRect(x, top, barW, h);
        }
        drawPanelLine(m.macdLine, minV, range, cfg.color, 1);
        drawPanelLine(m.signalLine, minV, range, cfg.tertiaryColor, 1);
        break;
      }
      case 'STOCHASTIC': {
        const st = result as StochasticResult;
        const y80 = dT+dH*(1-80/100), y20 = dT+dH*(1-20/100);
        ctx.save(); ctx.setLineDash([3*dpr,3*dpr]); ctx.lineWidth=0.5*dpr;
        ctx.strokeStyle='rgba(255,23,68,0.3)'; ctx.beginPath(); ctx.moveTo(0,y80); ctx.lineTo(chartW,y80); ctx.stroke();
        ctx.strokeStyle='rgba(0,230,118,0.3)'; ctx.beginPath(); ctx.moveTo(0,y20); ctx.lineTo(chartW,y20); ctx.stroke();
        ctx.setLineDash([]); ctx.restore();
        drawPanelLine(st.kLine, 0, 100, cfg.color, 1);
        drawPanelLine(st.dLine, 0, 100, cfg.secondaryColor, 1);
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
        ctx.strokeStyle='#37474F'; ctx.lineWidth=0.8*dpr; ctx.beginPath(); ctx.moveTo(0,zeroY); ctx.lineTo(chartW,zeroY); ctx.stroke();
        // Delta bars
        const barW = candleW*0.45;
        let maxDelta = 1;
        for (let i = startIdx; i < Math.min(endIdx, cvd.deltaBars.length); i++) { const v=cvd.deltaBars[i]; if(v!==null) maxDelta=Math.max(maxDelta,Math.abs(v)); }
        const maxBarH = dH * 0.25;
        for (let i = startIdx; i < Math.min(endIdx, cvd.deltaBars.length); i++) {
          const d = cvd.deltaBars[i]; if(d===null) continue;
          const li=i-startIdx; const x=li*candleW+(candleW-barW)/2;
          const bH3 = Math.max(1, Math.abs(d)/maxDelta * maxBarH);
          ctx.fillStyle = d>=0 ? 'rgba(0,230,118,0.4)' : 'rgba(255,23,68,0.4)';
          ctx.fillRect(x, d>=0?zeroY-bH3:zeroY, barW, bH3);
        }
        drawPanelLine(cvd.cvdLine, minV, range, cfg.color, 1.5);
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
  if (crosshair) {
    const cx = Math.max(0, Math.min(chartW, crosshair.x));
    const cy = Math.max(0, Math.min(chartH, crosshair.y));
    ctx.save(); ctx.setLineDash([4*dpr, 4*dpr]);
    ctx.strokeStyle = CROSSHAIR_COLOR; ctx.lineWidth = 0.8*dpr;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, chartH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(chartW, cy); ctx.stroke();
    ctx.setLineDash([]);
    // Price label on right
    const price = pMax - (cy / chartH) * pRange;
    const pTxt = formatPrice(price);
    ctx.font = `bold ${9*dpr}px "JetBrains Mono",monospace`;
    const pMeas = ctx.measureText(pTxt);
    const pLW = pMeas.width + 8*dpr, pLH = 9*dpr + 4*dpr;
    ctx.fillStyle = LABEL_BG; ctx.fillRect(chartW, cy-pLH/2, pLW, pLH);
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(pTxt, chartW+4*dpr, cy);
    // Time label on bottom
    const cidx = startIdx + Math.floor(cx / candleW);
    if (cidx >= 0 && cidx < candles.length) {
      const ts = candles[cidx].openTime;
      const tStr = formatCrosshairTime(ts, isDailyOrHigher);
      ctx.font = `bold ${8*dpr}px "JetBrains Mono",monospace`;
      const tMeas = ctx.measureText(tStr);
      const tLW = tMeas.width+8*dpr, tLH = 8*dpr+4*dpr;
      const tLX = Math.min(Math.max(0, cx-tLW/2), chartW-tLW);
      ctx.fillStyle = LABEL_BG; ctx.fillRect(tLX, chartH, tLW, tLH);
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText(tStr, tLX+4*dpr, chartH+2*dpr);
    }
    ctx.restore();
  }
}
