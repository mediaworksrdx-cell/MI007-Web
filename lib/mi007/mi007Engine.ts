import { Candle } from '../types';
import {
  calculateSMC,
  computeAtrSeries,
  inferCandleIntervalMs,
  isCandleClosed,
  timeframeToMs,
  SmcAnalysis,
  SmcSwingPoint,
} from '../smcEngine';
import {
  Mi007AnalysisResult,
  Mi007Bias,
  Mi007ChecklistItem,
  Mi007Classification,
  Mi007FibonacciConfluence,
  Mi007FibLevel,
  Mi007MarketRegime,
  Mi007OrderFlowConfirmation,
  Mi007ProfileSummary,
  Mi007TradeSetup,
  Mi007VolumeBin,
  Mi007VolumeProfile,
  Mi007VolumeQuality,
} from './types';

// Closed-bar fingerprint cache: guarantees zero repainting on forming ticks
const mi007Cache = new Map<string, Mi007AnalysisResult>();
const MAX_CACHE = 40;

function roundPrice(p: number): number {
  if (!Number.isFinite(p)) return 0;
  if (Math.abs(p) < 2) return Number(p.toFixed(5));
  if (Math.abs(p) < 20) return Number(p.toFixed(4));
  return Number(p.toFixed(2));
}

function classifyScore(score: number): Mi007Classification {
  if (score < 60) return 'No trade';
  if (score < 70) return 'Weak setup';
  if (score < 80) return 'Valid setup';
  if (score < 90) return 'Strong setup';
  return 'High-confluence setup';
}

function detectVolumeQuality(candles: Candle[]): Mi007VolumeQuality {
  if (candles.length === 0) return 'ESTIMATED';
  const window = candles.slice(-100);
  let estimatedOrZero = 0;
  for (const c of window) {
    if (c.volumeEstimated || !Number.isFinite(c.volume) || c.volume <= 0) {
      estimatedOrZero++;
    }
  }
  return estimatedOrZero / window.length > 0.25 ? 'ESTIMATED' : 'ACTUAL';
}

// ── Module 01: Market Regime Engine ──────────────────────────────────────────

function computeMarketRegime(
  closedCandles: Candle[],
  smc: SmcAnalysis,
  atrSeries: number[]
): Mi007MarketRegime {
  const lastIdx = closedCandles.length - 1;
  const last = closedCandles[lastIdx];
  const atr = atrSeries[lastIdx] || (last ? last.close * 0.004 : 1);
  const atrPct = last && last.close > 0 ? (atr / last.close) * 100 : 0;

  // Volatility regime from rolling ATR percentile
  const recentAtrs = atrSeries.slice(Math.max(0, lastIdx - 60), lastIdx + 1).filter((v) => v > 0);
  const avgAtr = recentAtrs.length > 0 ? recentAtrs.reduce((a, b) => a + b, 0) / recentAtrs.length : atr;
  const atrRatio = avgAtr > 0 ? atr / avgAtr : 1;
  const volatility = atrRatio >= 1.3 ? 'HIGH' : atrRatio <= 0.72 ? 'LOW' : 'NORMAL';

  const htfBias: Mi007Bias =
    smc.htfBias === 'BULLISH' ? 'BULLISH' : smc.htfBias === 'BEARISH' ? 'BEARISH' : 'NEUTRAL';
  const ltfBias: Mi007Bias =
    smc.ltfBias === 'BULLISH' ? 'BULLISH' : smc.ltfBias === 'BEARISH' ? 'BEARISH' : 'NEUTRAL';

  let regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' = 'RANGING';
  if (htfBias === 'BULLISH' && (ltfBias === 'BULLISH' || smc.structureBreaks.slice(-3).some((b) => b.isBullish))) {
    regime = 'TRENDING_UP';
  } else if (htfBias === 'BEARISH' && (ltfBias === 'BEARISH' || smc.structureBreaks.slice(-3).some((b) => !b.isBullish))) {
    regime = 'TRENDING_DOWN';
  }

  return {
    regime,
    volatility,
    htfBias,
    ltfBias,
    atr: roundPrice(atr),
    atrPct: Number(atrPct.toFixed(3)),
    timestamp: last?.openTime ?? Date.now(),
  };
}

// ── Module 04: Institutional Volume Profile Engine ───────────────────────────

function buildRangeProfile(
  candles: Candle[],
  startIdx: number,
  endIdx: number,
  numBins = 32
): { summary: Mi007ProfileSummary; bins: Mi007VolumeBin[] } {
  const s = Math.max(0, startIdx);
  const e = Math.min(candles.length - 1, endIdx);
  if (e < s || candles.length === 0) {
    return {
      summary: { poc: 0, vah: 0, val: 0, totalVolume: 0, startIndex: s, endIndex: e },
      bins: [],
    };
  }

  let minP = Infinity;
  let maxP = -Infinity;
  for (let i = s; i <= e; i++) {
    if (candles[i].low < minP) minP = candles[i].low;
    if (candles[i].high > maxP) maxP = candles[i].high;
  }
  if (!Number.isFinite(minP) || !Number.isFinite(maxP) || maxP <= minP) {
    const p = candles[e]?.close || 1;
    return {
      summary: { poc: p, vah: p, val: p, totalVolume: 0, startIndex: s, endIndex: e },
      bins: [],
    };
  }

  const binSize = (maxP - minP) / numBins;
  const volArr = new Float64Array(numBins);
  const buyArr = new Float64Array(numBins);
  const sellArr = new Float64Array(numBins);
  let totalVolume = 0;

  for (let i = s; i <= e; i++) {
    const c = candles[i];
    const v = Math.max(0, Number.isFinite(c.volume) ? c.volume : 0);
    if (v <= 0) continue;
    totalVolume += v;

    const loBin = Math.max(0, Math.min(numBins - 1, Math.floor((c.low - minP) / binSize)));
    const hiBin = Math.max(0, Math.min(numBins - 1, Math.floor((c.high - minP) / binSize)));
    const span = Math.max(1, hiBin - loBin + 1);
    const perBin = v / span;
    const range = Math.max(1e-9, c.high - c.low);
    const buyFrac = Math.max(0.15, Math.min(0.85, (c.close - c.low) / range));

    for (let b = loBin; b <= hiBin; b++) {
      volArr[b] += perBin;
      buyArr[b] += perBin * buyFrac;
      sellArr[b] += perBin * (1 - buyFrac);
    }
  }

  let pocIdx = 0;
  for (let b = 1; b < numBins; b++) {
    if (volArr[b] > volArr[pocIdx]) pocIdx = b;
  }

  // 70% Value Area expansion around POC
  const targetVaVol = totalVolume * 0.7;
  let vaVol = volArr[pocIdx];
  let vaLo = pocIdx;
  let vaHi = pocIdx;
  while (vaVol < targetVaVol && (vaLo > 0 || vaHi < numBins - 1)) {
    const upVol = vaHi < numBins - 1 ? volArr[vaHi + 1] : -1;
    const dnVol = vaLo > 0 ? volArr[vaLo - 1] : -1;
    if (upVol >= dnVol && vaHi < numBins - 1) {
      vaHi++;
      vaVol += volArr[vaHi];
    } else if (vaLo > 0) {
      vaLo--;
      vaVol += volArr[vaLo];
    } else {
      break;
    }
  }

  const meanBinVol = totalVolume / numBins;
  const bins: Mi007VolumeBin[] = [];
  for (let b = 0; b < numBins; b++) {
    const pLow = minP + b * binSize;
    const pHigh = pLow + binSize;
    const v = volArr[b];
    bins.push({
      priceLow: roundPrice(pLow),
      priceHigh: roundPrice(pHigh),
      priceMid: roundPrice((pLow + pHigh) / 2),
      volume: v,
      buyVolume: buyArr[b],
      sellVolume: sellArr[b],
      isHvn: meanBinVol > 0 && v >= meanBinVol * 1.4,
      isLvn: meanBinVol > 0 && v > 0 && v <= meanBinVol * 0.45,
    });
  }

  const poc = bins[pocIdx]?.priceMid ?? candles[e].close;
  const vah = bins[vaHi]?.priceHigh ?? maxP;
  const val = bins[vaLo]?.priceLow ?? minP;

  return {
    summary: {
      poc: roundPrice(poc),
      vah: roundPrice(vah),
      val: roundPrice(val),
      totalVolume,
      startIndex: s,
      endIndex: e,
    },
    bins,
  };
}

function computeVolumeProfiles(
  closedCandles: Candle[],
  majorSwings: SmcSwingPoint[]
): Mi007VolumeProfile {
  const n = closedCandles.length;
  const volumeQuality = detectVolumeQuality(closedCandles);

  // 1. Fixed Range Profile (last 180 closed bars)
  const frStart = Math.max(0, n - 180);
  const { summary: fixedRange, bins } = buildRangeProfile(closedCandles, frStart, n - 1, 32);

  // 2. Session & Daily Profiles by UTC day boundary
  const lastTime = closedCandles[n - 1]?.openTime ?? 0;
  const dayStartMs = Math.floor(lastTime / 86_400_000) * 86_400_000;
  let sessionStart = n - 1;
  while (sessionStart > 0 && closedCandles[sessionStart - 1].openTime >= dayStartMs) {
    sessionStart--;
  }
  const session = n - sessionStart >= 3 ? buildRangeProfile(closedCandles, sessionStart, n - 1, 20).summary : null;

  let prevDayEnd = sessionStart - 1;
  let prevDayStart = Math.max(0, prevDayEnd);
  if (prevDayEnd >= 2) {
    const prevDayFloor = Math.floor(closedCandles[prevDayEnd].openTime / 86_400_000) * 86_400_000;
    while (prevDayStart > 0 && closedCandles[prevDayStart - 1].openTime >= prevDayFloor) {
      prevDayStart--;
    }
  }
  const daily =
    prevDayEnd - prevDayStart >= 2
      ? buildRangeProfile(closedCandles, prevDayStart, prevDayEnd, 20).summary
      : null;

  // 3. Weekly Profile (last 7 calendar days)
  const weekCutoff = lastTime - 7 * 86_400_000;
  let weekStart = n - 1;
  while (weekStart > 0 && closedCandles[weekStart - 1].openTime >= weekCutoff) {
    weekStart--;
  }
  const weekly = n - weekStart >= 5 ? buildRangeProfile(closedCandles, weekStart, n - 1, 24).summary : null;

  // 4. Anchored Volume Profile (from latest confirmed major swing point)
  const lastMajor = majorSwings.length > 0 ? majorSwings[majorSwings.length - 1] : null;
  const anchorIdx = lastMajor && n - 1 - lastMajor.index >= 4 ? lastMajor.index : Math.max(0, n - 40);
  const anchored = buildRangeProfile(closedCandles, anchorIdx, n - 1, 24).summary;

  // 5. POC Migration (prior daily POC vs current session/anchored POC)
  const refOldPoc = daily?.poc || fixedRange.poc;
  const refNewPoc = session?.poc || anchored.poc;
  const pocDiffPct = refOldPoc > 0 ? ((refNewPoc - refOldPoc) / refOldPoc) * 100 : 0;
  const pocMigration: 'UP' | 'DOWN' | 'FLAT' =
    pocDiffPct > 0.15 ? 'UP' : pocDiffPct < -0.15 ? 'DOWN' : 'FLAT';

  // 6. Causal Developing POC over the last 40 bars (strictly using bars <= i)
  const devLen = Math.min(40, n - frStart);
  const developingPoc: number[] = [];
  if (devLen >= 5) {
    const devStart = n - devLen;
    for (let i = devStart; i < n; i++) {
      // Lightweight causal running POC from sessionStart or frStart up to i
      const subStart = Math.max(frStart, i - 60);
      developingPoc.push(buildRangeProfile(closedCandles, subStart, i, 16).summary.poc);
    }
  }

  const hvnPrices = bins.filter((b) => b.isHvn).map((b) => b.priceMid);
  const lvnPrices = bins.filter((b) => b.isLvn).map((b) => b.priceMid);

  return {
    volumeQuality,
    fixedRange,
    session,
    daily,
    weekly,
    anchored,
    pocMigration,
    hvnPrices,
    lvnPrices,
    bins,
    developingPoc,
  };
}

// ── Module 05: Fibonacci Confluence Engine ───────────────────────────────────

function computeFibonacciConfluence(
  closedCandles: Candle[],
  majorSwings: SmcSwingPoint[]
): Mi007FibonacciConfluence | null {
  const highs = majorSwings.filter((s) => s.isHigh);
  const lows = majorSwings.filter((s) => !s.isHigh);
  if (highs.length === 0 || lows.length === 0) return null;

  const lastHigh = highs[highs.length - 1];
  const lastLow = lows[lows.length - 1];
  if (lastHigh.price <= lastLow.price) return null;

  // Direction of the most recent impulse leg (low -> high = BULLISH impulse, retracing down; high -> low = BEARISH impulse, retracing up)
  const direction: 'BULLISH' | 'BEARISH' = lastHigh.index > lastLow.index ? 'BULLISH' : 'BEARISH';
  const span = lastHigh.price - lastLow.price;
  const lastClose = closedCandles[closedCandles.length - 1].close;

  // For BULLISH impulse (Low -> High), retracement pulls down from High toward Low:
  //   0.50 = High - 0.50 * span, 0.618 = High - 0.618 * span, 0.705 = High - 0.705 * span, 0.786 = High - 0.786 * span
  //   Extensions project above High: 1.272 = Low + 1.272 * span, 1.618 = Low + 1.618 * span
  // For BEARISH impulse (High -> Low), retracement pulls up from Low toward High:
  //   0.50 = Low + 0.50 * span, 0.618 = Low + 0.618 * span, etc.
  //   Extensions project below Low: 1.272 = High - 1.272 * span, 1.618 = High - 1.618 * span
  const retracementPrice = (r: number) =>
    roundPrice(direction === 'BULLISH' ? lastHigh.price - span * r : lastLow.price + span * r);
  const extensionPrice = (r: number) =>
    roundPrice(direction === 'BULLISH' ? lastLow.price + span * r : lastHigh.price - span * r);

  const p050 = retracementPrice(0.5);
  const p618 = retracementPrice(0.618);
  const p705 = retracementPrice(0.705);
  const p786 = retracementPrice(0.786);
  const p100 = retracementPrice(1.0);
  const ext1272 = extensionPrice(1.272);
  const ext1618 = extensionPrice(1.618);

  const levels: Mi007FibLevel[] = [
    { ratio: 0.5, label: '0.50 EQ', price: p050, isExtension: false, isOte: false },
    { ratio: 0.618, label: '0.618 Golden', price: p618, isExtension: false, isOte: true },
    { ratio: 0.705, label: '0.705 OTE', price: p705, isExtension: false, isOte: true },
    { ratio: 0.786, label: '0.786 Deep', price: p786, isExtension: false, isOte: true },
    { ratio: 1.0, label: '1.00 Full', price: p100, isExtension: false, isOte: false },
    { ratio: 1.272, label: '1.272 Ext', price: ext1272, isExtension: true, isOte: false },
    { ratio: 1.618, label: '1.618 Ext', price: ext1618, isExtension: true, isOte: false },
  ];

  const oteLow = Math.min(p618, p786);
  const oteHigh = Math.max(p618, p786);
  const inPremium = lastClose > p050;
  const inDiscount = lastClose < p050;
  const inOteZone = lastClose >= oteLow && lastClose <= oteHigh;

  return {
    direction,
    swingHigh: { index: lastHigh.index, price: lastHigh.price, time: lastHigh.time },
    swingLow: { index: lastLow.index, price: lastLow.price, time: lastLow.time },
    levels,
    equilibrium: p050,
    oteZone: [oteLow, oteHigh],
    oteMid: p705,
    ext1272,
    ext1618,
    inPremium,
    inDiscount,
    inOteZone,
  };
}

// ── Module 06: Order Flow Confirmation (Strictly Gated by Actual Volume) ─────

function evaluateOrderFlow(
  closedCandles: Candle[],
  volumeQuality: Mi007VolumeQuality
): Mi007OrderFlowConfirmation {
  if (volumeQuality === 'ESTIMATED' || closedCandles.length < 15) {
    return {
      volumeQuality: 'ESTIMATED',
      confirmed: false,
      direction: 'NEUTRAL',
      barDelta: 0,
      cvdTrend: 'NEUTRAL',
      absorptionDetected: false,
      imbalanceDetected: false,
      note: 'Estimated tick volume — not labeled as institutional order flow (0/10)',
    };
  }

  const window = closedCandles.slice(-20);
  let cvdStart = 0;
  let cvdMid = 0;
  let cvdEnd = 0;
  let runningCvd = 0;
  let volSum = 0;
  let lastBarDelta = 0;

  for (let i = 0; i < window.length; i++) {
    const c = window[i];
    const range = Math.max(1e-9, c.high - c.low);
    const buyFrac = (c.close - c.low) / range;
    const delta = c.volume * (2 * buyFrac - 1);
    runningCvd += delta;
    volSum += c.volume;
    if (i === 0) cvdStart = runningCvd;
    if (i === Math.floor(window.length / 2)) cvdMid = runningCvd;
    if (i === window.length - 1) {
      cvdEnd = runningCvd;
      lastBarDelta = delta;
    }
  }

  const avgVol = volSum / window.length;
  const last = window[window.length - 1];
  const lastRange = Math.max(1e-9, last.high - last.low);
  const lastBody = Math.abs(last.close - last.open);
  const bodyRatio = lastBody / lastRange;
  const lowerWickRatio = (Math.min(last.open, last.close) - last.low) / lastRange;
  const upperWickRatio = (last.high - Math.max(last.open, last.close)) / lastRange;

  const cvdTrend: Mi007Bias =
    cvdEnd > cvdMid && cvdEnd > cvdStart
      ? 'BULLISH'
      : cvdEnd < cvdMid && cvdEnd < cvdStart
      ? 'BEARISH'
      : 'NEUTRAL';

  // Absorption: elevated actual volume with small body and strong rejection wick
  const absorptionDetected =
    last.volume >= avgVol * 1.25 && bodyRatio <= 0.42 && (lowerWickRatio >= 0.38 || upperWickRatio >= 0.38);

  // Imbalance: strong directional volume delta (> 1.35x avg vol with decisive close)
  const imbalanceDetected = last.volume >= avgVol * 1.35 && Math.abs(lastBarDelta) >= last.volume * 0.45;

  const direction: Mi007Bias =
    absorptionDetected
      ? (lowerWickRatio > upperWickRatio ? 'BULLISH' : 'BEARISH')
      : lastBarDelta > 0 && cvdTrend === 'BULLISH'
      ? 'BULLISH'
      : lastBarDelta < 0 && cvdTrend === 'BEARISH'
      ? 'BEARISH'
      : cvdTrend;

  const confirmed = (absorptionDetected || imbalanceDetected) && direction !== 'NEUTRAL';

  return {
    volumeQuality: 'ACTUAL',
    confirmed,
    direction,
    barDelta: Math.round(lastBarDelta),
    cvdTrend,
    absorptionDetected,
    imbalanceDetected,
    note: confirmed
      ? `Actual volume ${absorptionDetected ? 'absorption' : 'imbalance'} + CVD ${cvdTrend.toLowerCase()}`
      : `Actual volume monitored — CVD ${cvdTrend.toLowerCase()}, awaiting confirmation`,
  };
}

// ── Module 07: Unified 100-Point Trade Decision Engine ───────────────────────

function evaluateDirectionalSetup(
  direction: 'BULLISH' | 'BEARISH',
  closedCandles: Candle[],
  regime: Mi007MarketRegime,
  smc: SmcAnalysis,
  vp: Mi007VolumeProfile,
  fib: Mi007FibonacciConfluence | null,
  of: Mi007OrderFlowConfirmation,
  atrSeries: number[]
): Mi007TradeSetup | null {
  const isBull = direction === 'BULLISH';
  const n = closedCandles.length;
  const lastIdx = n - 1;
  const last = closedCandles[lastIdx];
  const atr = regime.atr || last.close * 0.004;

  // 1. Higher-Timeframe Structure (15 pts)
  const htfConfirmed = (isBull && regime.htfBias === 'BULLISH') || (!isBull && regime.htfBias === 'BEARISH');
  const htfPts = htfConfirmed ? 15 : regime.htfBias === 'NEUTRAL' ? 7 : 0;

  // 2. Liquidity Sweep (15 pts): recent genuine opposing liquidity sweep (SSL for bullish, BSL for bearish)
  const recentSweep = [...smc.sweeps]
    .reverse()
    .find((sw) => sw.isHighSweep !== isBull && lastIdx - sw.candleIndex <= 25 && sw.isGenuineSweep);
  const sweepPts = recentSweep ? 15 : 0;

  // 3. BOS / MSS Confirmation with Displacement (15 pts)
  const recentBreak = [...smc.structureBreaks]
    .reverse()
    .find((b) => b.isBullish === isBull && lastIdx - b.candleIndex <= 25);
  let hasDisplacement = false;
  if (recentBreak) {
    const brkBar = closedCandles[recentBreak.candleIndex];
    const brkAtr = atrSeries[recentBreak.candleIndex] || atr;
    if (brkBar && Math.abs(brkBar.close - brkBar.open) >= brkAtr * 1.1) {
      hasDisplacement = true;
    }
  }
  const bosMssPts = recentBreak ? (hasDisplacement || recentBreak.breakType === 'CHoCH' || recentBreak.breakType === 'MSS' ? 15 : 10) : 0;

  // 4. Valid Order Block / Breaker / FVG (15 pts)
  const activeOb = [...smc.orderBlocks, ...smc.breakers]
    .filter((ob) => ob.isBullish === isBull && !ob.isMitigated && lastIdx - ob.startIndex <= 80)
    .sort((a, b) => Math.abs((a.topPrice + a.bottomPrice) / 2 - last.close) - Math.abs((b.topPrice + b.bottomPrice) / 2 - last.close))[0];
  const activeFvg = smc.fvgs
    .filter((f) => f.isBullish === isBull && !f.isMitigated && !f.isInvalidated && lastIdx - f.startIndex <= 60)
    .sort((a, b) => Math.abs(a.cePrice - last.close) - Math.abs(b.cePrice - last.close))[0];
  const obNear = activeOb ? Math.abs((activeOb.topPrice + activeOb.bottomPrice) / 2 - last.close) <= atr * 4.5 : false;
  const fvgNear = activeFvg ? Math.abs(activeFvg.cePrice - last.close) <= atr * 4.5 : false;
  const obFvgPts = obNear && fvgNear ? 15 : (obNear || fvgNear ? 12 : activeOb || activeFvg ? 8 : 0);

  // 5. Volume Profile Support / Resistance or LVN Rejection (15 pts)
  const keyVpLevels = [
    vp.fixedRange.poc,
    vp.fixedRange.val,
    vp.fixedRange.vah,
    vp.anchored?.poc,
    vp.session?.poc,
    ...vp.lvnPrices,
  ].filter((v): v is number => typeof v === 'number' && v > 0);
  const nearVpSupport = keyVpLevels.some((lvl) => Math.abs(last.close - lvl) <= atr * 1.5);
  const vpBiasAligned = (isBull && vp.pocMigration === 'UP') || (!isBull && vp.pocMigration === 'DOWN');
  const vpPts = nearVpSupport && vpBiasAligned ? 15 : nearVpSupport ? 12 : vpBiasAligned ? 8 : 0;

  // 6. Fibonacci Confluence (10 pts): OTE (0.618–0.786) or Discount/Premium alignment
  const fibOteHit = Boolean(fib && fib.direction === direction && fib.inOteZone);
  const fibZoneAligned = Boolean(fib && ((isBull && fib.inDiscount) || (!isBull && fib.inPremium)));
  const fibPts = fibOteHit ? 10 : fibZoneAligned ? 6 : 0;

  // 7. Order Flow Confirmation (10 pts — strictly 0 if volume is ESTIMATED)
  const ofAligned = of.volumeQuality === 'ACTUAL' && of.confirmed && of.direction === direction;
  const ofPts = ofAligned ? 10 : of.volumeQuality === 'ACTUAL' && of.cvdTrend === direction ? 5 : 0;

  // 8. Entry Candle Confirmation (5 pts): rejection wick or directional displacement close on latest closed bar
  const barRange = Math.max(1e-9, last.high - last.low);
  const lowerWick = (Math.min(last.open, last.close) - last.low) / barRange;
  const upperWick = (last.high - Math.max(last.open, last.close)) / barRange;
  const entryCandleConfirmed = isBull
    ? (last.close > last.open && (last.close - last.open) / barRange >= 0.45) || lowerWick >= 0.35
    : (last.close < last.open && (last.open - last.close) / barRange >= 0.45) || upperWick >= 0.35;
  const entryCandlePts = entryCandleConfirmed ? 5 : 0;

  const totalScore = Math.min(
    100,
    htfPts + sweepPts + bosMssPts + obFvgPts + vpPts + fibPts + ofPts + entryCandlePts
  );
  const classification = classifyScore(totalScore);

  // Determine Entry, Structural SL, and Liquidity/Fib Targets (minimum 1:2 R:R)
  const entryPrice = roundPrice(
    obNear && activeOb
      ? (activeOb.topPrice + activeOb.bottomPrice) / 2
      : fvgNear && activeFvg
      ? activeFvg.cePrice
      : last.close
  );

  // Structural Invalidation Stop Loss
  const structuralInvalidation = isBull
    ? Math.min(
        activeOb ? activeOb.bottomPrice : entryPrice - atr * 1.4,
        recentSweep ? recentSweep.price : entryPrice - atr * 1.4,
        last.low
      ) - atr * 0.25
    : Math.max(
        activeOb ? activeOb.topPrice : entryPrice + atr * 1.4,
        recentSweep ? recentSweep.price : entryPrice + atr * 1.4,
        last.high
      ) + atr * 0.25;

  // Clamp risk to sane structural bounds [0.6 * ATR, 3.5 * ATR]
  const rawRisk = Math.abs(entryPrice - structuralInvalidation);
  const clampedRisk = Math.max(atr * 0.65, Math.min(atr * 3.5, rawRisk));
  const stopLoss = roundPrice(isBull ? entryPrice - clampedRisk : entryPrice + clampedRisk);
  const risk = Math.max(1e-9, Math.abs(entryPrice - stopLoss));

  // Opposing Liquidity Pools for TP1 & TP2 (strictly enforcing >= 1:2 RR for TP1)
  const opposingPools = smc.liquidityLevels
    .filter((lvl) => !lvl.isSwept && (isBull ? lvl.price >= entryPrice + risk * 2.0 : lvl.price <= entryPrice - risk * 2.0))
    .map((lvl) => lvl.price)
    .sort((a, b) => (isBull ? a - b : b - a));

  const target1 = roundPrice(opposingPools[0] ?? (isBull ? entryPrice + risk * 2.0 : entryPrice - risk * 2.0));
  const fallbackTp2 = isBull ? Math.max(entryPrice + risk * 3.0, target1 + risk) : Math.min(entryPrice - risk * 3.0, target1 - risk);
  const target2 = roundPrice(
    opposingPools.find((p) => (isBull ? p >= target1 + risk * 0.8 : p <= target1 - risk * 0.8)) ?? fallbackTp2
  );
  const fibExtCandidate = fib && fib.direction === direction ? fib.ext1272 : undefined;
  const fibExtValid =
    fibExtCandidate !== undefined &&
    (isBull ? fibExtCandidate > target2 + risk * 0.4 : fibExtCandidate < target2 - risk * 0.4);
  const fallbackTp3 = isBull ? Math.max(entryPrice + risk * 4.0, target2 + risk) : Math.min(entryPrice - risk * 4.0, target2 - risk);
  const target3 = roundPrice(fibExtValid ? fibExtCandidate! : fallbackTp3);

  const riskReward1 = Number((Math.abs(target1 - entryPrice) / risk).toFixed(2));
  const riskReward2 = Number((Math.abs(target2 - entryPrice) / risk).toFixed(2));
  const riskReward3 = Number((Math.abs(target3 - entryPrice) / risk).toFixed(2));

  const anchorBarIdx = Math.max(
    recentBreak?.candleIndex ?? Math.max(0, lastIdx - 12),
    recentSweep?.candleIndex ?? Math.max(0, lastIdx - 12),
    Math.max(0, lastIdx - 18)
  );

  const checklist: Mi007ChecklistItem[] = [
    {
      id: 'htf',
      label: `Higher-timeframe ${isBull ? 'bullish' : 'bearish'} structure`,
      status: htfConfirmed ? 'Confirmed' : htfPts > 0 ? 'Pending' : 'Unconfirmed',
      weight: 15,
      awarded: htfPts,
      detail: `HTF: ${regime.htfBias} | Regime: ${regime.regime.replace('_', ' ')}`,
    },
    {
      id: 'sweep',
      label: `${isBull ? 'Sell-side' : 'Buy-side'} liquidity sweep`,
      status: recentSweep ? 'Confirmed' : 'Unconfirmed',
      weight: 15,
      awarded: sweepPts,
      detail: recentSweep ? `${recentSweep.label} @ Bar #${recentSweep.candleIndex}` : 'No recent opposing sweep',
    },
    {
      id: 'bos_mss',
      label: `${isBull ? 'Bullish' : 'Bearish'} ${recentBreak?.breakType || 'BOS / MSS'}`,
      status: bosMssPts >= 15 ? 'Confirmed' : bosMssPts > 0 ? 'Pending' : 'Unconfirmed',
      weight: 15,
      awarded: bosMssPts,
      detail: recentBreak ? `${recentBreak.type} @ ${roundPrice(recentBreak.price)}` : 'Awaiting structural break',
    },
    {
      id: 'ob_fvg',
      label: `Valid ${isBull ? 'bullish' : 'bearish'} OB / FVG`,
      status: obFvgPts >= 12 ? 'Confirmed' : obFvgPts > 0 ? 'Pending' : 'Unconfirmed',
      weight: 15,
      awarded: obFvgPts,
      detail: activeOb && activeFvg ? 'OB + FVG overlap' : activeOb ? 'Unmitigated OB' : activeFvg ? 'Fresh FVG' : 'No nearby zone',
    },
    {
      id: 'vp',
      label: `Volume Profile ${isBull ? 'support' : 'resistance'} / LVN`,
      status: vpPts >= 12 ? 'Confirmed' : vpPts > 0 ? 'Pending' : 'Unconfirmed',
      weight: 15,
      awarded: vpPts,
      detail: `POC ${vp.fixedRange.poc} | Migration ${vp.pocMigration} (${vp.volumeQuality})`,
    },
    {
      id: 'fib',
      label: 'Fibonacci confluence (OTE)',
      status: fibOteHit ? 'Confirmed' : fibZoneAligned ? 'Pending' : 'Unconfirmed',
      weight: 10,
      awarded: fibPts,
      detail: fib ? `0.705 OTE ${fib.oteMid} | ${isBull ? (fib.inDiscount ? 'Discount' : 'Premium') : (fib.inPremium ? 'Premium' : 'Discount')}` : 'No major swing anchor',
    },
    {
      id: 'of',
      label: `Order Flow (${of.volumeQuality === 'ACTUAL' ? 'Actual Vol' : 'Est. Vol'})`,
      status: ofAligned ? 'Confirmed' : ofPts > 0 ? 'Pending' : 'Unconfirmed',
      weight: 10,
      awarded: ofPts,
      detail: of.note,
    },
    {
      id: 'candle',
      label: 'Entry candle confirmation',
      status: entryCandleConfirmed ? 'Confirmed' : 'Pending',
      weight: 5,
      awarded: entryCandlePts,
      detail: entryCandleConfirmed ? 'Rejection / displacement close confirmed' : 'Awaiting trigger candle close',
    },
  ];

  const isTradeable = totalScore >= 60 && riskReward1 >= 2.0;

  return {
    id: `mi007_${direction}_${anchorBarIdx}_${roundPrice(entryPrice)}`,
    direction,
    score: totalScore,
    classification,
    isTradeable,
    entryPrice,
    stopLoss,
    target1,
    target2,
    target3,
    riskReward1,
    riskReward2,
    riskReward3,
    candleIndex: anchorBarIdx,
    timestamp: closedCandles[anchorBarIdx]?.openTime ?? last.openTime,
    status: totalScore >= 70 && entryCandleConfirmed ? 'ACTIVE' : 'WAIT_CONFIRMATION',
    checklist,
    scoreBreakdown: {
      htfStructure: htfPts,
      liquiditySweep: sweepPts,
      bosMss: bosMssPts,
      orderBlockFvg: obFvgPts,
      volumeProfile: vpPts,
      fibonacci: fibPts,
      orderFlow: ofPts,
      entryCandle: entryCandlePts,
    },
    supportingOb: activeOb,
    supportingFvg: activeFvg,
    supportingBreak: recentBreak,
    supportingSweep: recentSweep,
  };
}

// ── Public Entry Point ───────────────────────────────────────────────────────

export function analyzeMi007Strategy(
  candles: Candle[],
  options: {
    symbol?: string;
    timeframe?: string;
    htfCandles?: Candle[];
  } = {}
): Mi007AnalysisResult | null {
  if (!candles || candles.length < 20) return null;

  const symbol = options.symbol || 'UNKNOWN';
  const timeframe = options.timeframe || '1H';
  const tfMs = options.timeframe ? timeframeToMs(options.timeframe) : inferCandleIntervalMs(candles);
  const nowMs = Date.now();

  // Strictly isolate closed candles so forming ticks never repaint structure, VP, Fib, or setup
  const closedCandles = candles.filter((c) => isCandleClosed(c, tfMs, nowMs));
  if (closedCandles.length < 15) return null;

  const lastClosed = closedCandles[closedCandles.length - 1];
  const fp = `${symbol}|${timeframe}|${closedCandles.length}|${lastClosed.openTime}|${lastClosed.close}|${options.htfCandles?.length || 0}`;
  const cached = mi007Cache.get(fp);
  if (cached) return cached;

  // Modules 02 & 03: Independent SMC Structure & Liquidity Engine
  const smc = calculateSMC(
    closedCandles,
    { enabled: true, htfCandles: options.htfCandles },
    symbol,
    timeframe
  );

  const atrSeries = computeAtrSeries(closedCandles, 14);
  const majorSwings = smc.swings.filter((s) => s.significance === 'MAJOR');

  // Module 01: Market Regime
  const regime = computeMarketRegime(closedCandles, smc, atrSeries);

  // Module 04: Volume Profile (Fixed Range, Session, Daily, Weekly, Anchored, HVN/LVN, POC migration)
  const volumeProfile = computeVolumeProfiles(closedCandles, majorSwings);

  // Module 05: Fibonacci Confluence (anchored strictly to confirmed major swings)
  const fibonacci = computeFibonacciConfluence(closedCandles, majorSwings);

  // Module 06: Order Flow Confirmation (gated by ACTUAL vs ESTIMATED volume)
  const orderFlow = evaluateOrderFlow(closedCandles, volumeProfile.volumeQuality);

  // Module 07: Unified Decision Engine (evaluate both directions, pick strictly highest valid confluence)
  const bullSetup = evaluateDirectionalSetup('BULLISH', closedCandles, regime, smc, volumeProfile, fibonacci, orderFlow, atrSeries);
  const bearSetup = evaluateDirectionalSetup('BEARISH', closedCandles, regime, smc, volumeProfile, fibonacci, orderFlow, atrSeries);

  let activeSetup: Mi007TradeSetup | null = null;
  if (bullSetup && bearSetup) {
    activeSetup = bullSetup.score >= bearSetup.score ? bullSetup : bearSetup;
  } else {
    activeSetup = bullSetup || bearSetup;
  }

  const result: Mi007AnalysisResult = {
    symbol,
    timeframe,
    computedAt: nowMs,
    closedBarCount: closedCandles.length,
    regime,
    smc,
    volumeProfile,
    fibonacci,
    orderFlow,
    activeSetup,
    swings: smc.swings,
  };

  if (mi007Cache.size >= MAX_CACHE) {
    const oldest = mi007Cache.keys().next().value;
    if (oldest) mi007Cache.delete(oldest);
  }
  mi007Cache.set(fp, result);
  return result;
}
