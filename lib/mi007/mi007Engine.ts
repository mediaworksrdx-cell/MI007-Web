import { Candle } from '../types';
import { computeVolumeProfile, detectVolumeQuality as detectSharedVolumeQuality } from '../volumeProfile';
import {
  calculateSMC,
  computeAtrSeries,
  getSmcTradingDayKey,
  inferCandleIntervalMs,
  isCandleClosed,
  timeframeToMs,
  SmcAnalysis,
  SmcStructureBreak,
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
  Mi007VolumeBubble,
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

// ── Module 04: Institutional Volume Profile Engine (Unified with Chart VPVR) ─

export function buildRangeProfile(
  candles: Candle[],
  startIdx: number,
  endIdx: number,
  numBins = 40
): { summary: Mi007ProfileSummary; bins: Mi007VolumeBin[] } {
  const s = Math.max(0, startIdx);
  const e = Math.min(candles.length - 1, endIdx);
  if (e < s || candles.length === 0) {
    return {
      summary: { poc: 0, vah: 0, val: 0, totalVolume: 0, startIndex: s, endIndex: e },
      bins: [],
    };
  }

  const slice = candles.slice(s, e + 1);
  const vp = computeVolumeProfile(slice, { bucketCount: numBins });
  // VP1: Zero-volume series returns no profile (poc=0, bins=[]) instead of collapsing to bin 0
  if (!vp.hasVolume || vp.totalVolume <= 0 || vp.buckets.length === 0) {
    return {
      summary: { poc: 0, vah: 0, val: 0, totalVolume: 0, startIndex: s, endIndex: e },
      bins: [],
    };
  }

  const bins: Mi007VolumeBin[] = vp.buckets.map((b) => ({
    priceLow: b.priceLow,
    priceHigh: b.priceHigh,
    priceMid: b.priceMid,
    volume: b.totalVolume,
    buyVolume: b.buyVolume,
    sellVolume: b.sellVolume,
    isHvn: b.isHvn,
    isLvn: b.isLvn,
  }));

  return {
    summary: {
      poc: vp.pocPrice,
      vah: vp.vahPrice,
      val: vp.valPrice,
      totalVolume: vp.totalVolume,
      startIndex: s,
      endIndex: e,
    },
    bins,
  };
}

function computeVolumeProfiles(
  closedCandles: Candle[],
  majorSwings: SmcSwingPoint[],
  symbol?: string
): Mi007VolumeProfile {
  const n = closedCandles.length;
  const volumeQuality = detectSharedVolumeQuality(closedCandles);

  // 1. Fixed Range Profile (40 bins matching Chart VPVR over last 150 closed bars)
  const frStart = Math.max(0, n - 150);
  const { summary: fixedRange, bins } = buildRangeProfile(closedCandles, frStart, n - 1, 40);

  if (volumeQuality !== 'ACTUAL' || fixedRange.totalVolume <= 0) {
    return {
      volumeQuality,
      fixedRange: { poc: 0, vah: 0, val: 0, totalVolume: 0, startIndex: frStart, endIndex: Math.max(0, n - 1) },
      session: null,
      daily: null,
      weekly: null,
      anchored: null,
      pocMigration: 'FLAT',
      hvnPrices: [],
      lvnPrices: [],
      bins: [],
      developingPoc: [],
    };
  }

  // 2. Important 04: Session & Daily Profiles aligned to exchange-specific trading day (IST NSE / NY US / UTC Crypto)
  const lastTime = closedCandles[n - 1]?.openTime ?? 0;
  const currentSessionKey = getSmcTradingDayKey(lastTime, symbol);
  let sessionStart = n - 1;
  while (sessionStart > 0 && getSmcTradingDayKey(closedCandles[sessionStart - 1].openTime, symbol) === currentSessionKey) {
    sessionStart--;
  }
  const sessRes = n - sessionStart >= 3 ? buildRangeProfile(closedCandles, sessionStart, n - 1, 40).summary : null;
  const session = sessRes && sessRes.totalVolume > 0 ? sessRes : null;

  let prevDayEnd = sessionStart - 1;
  let prevDayStart = Math.max(0, prevDayEnd);
  if (prevDayEnd >= 2) {
    const prevSessionKey = getSmcTradingDayKey(closedCandles[prevDayEnd].openTime, symbol);
    while (prevDayStart > 0 && getSmcTradingDayKey(closedCandles[prevDayStart - 1].openTime, symbol) === prevSessionKey) {
      prevDayStart--;
    }
  }
  const dailyRes =
    prevDayEnd - prevDayStart >= 2
      ? buildRangeProfile(closedCandles, prevDayStart, prevDayEnd, 40).summary
      : null;
  const daily = dailyRes && dailyRes.totalVolume > 0 ? dailyRes : null;

  // 3. Weekly Profile (last 7 calendar days)
  const weekCutoff = lastTime - 7 * 86_400_000;
  let weekStart = n - 1;
  while (weekStart > 0 && closedCandles[weekStart - 1].openTime >= weekCutoff) {
    weekStart--;
  }
  const weekRes = n - weekStart >= 5 ? buildRangeProfile(closedCandles, weekStart, n - 1, 40).summary : null;
  const weekly = weekRes && weekRes.totalVolume > 0 ? weekRes : null;

  // 4. Anchored Volume Profile (from latest confirmed major swing point)
  const lastMajor = majorSwings.length > 0 ? majorSwings[majorSwings.length - 1] : null;
  const anchorIdx = lastMajor && n - 1 - lastMajor.index >= 4 ? lastMajor.index : Math.max(0, n - 40);
  const anchoredRes = buildRangeProfile(closedCandles, anchorIdx, n - 1, 40).summary;
  const anchored = anchoredRes.totalVolume > 0 ? anchoredRes : null;

  // 5. POC Migration (prior daily POC vs current session/anchored POC)
  const refOldPoc = daily?.poc || fixedRange.poc;
  const refNewPoc = session?.poc || anchored?.poc || fixedRange.poc;
  const pocDiffPct = refOldPoc > 0 ? ((refNewPoc - refOldPoc) / refOldPoc) * 100 : 0;
  const pocMigration: 'UP' | 'DOWN' | 'FLAT' =
    pocDiffPct > 0.15 ? 'UP' : pocDiffPct < -0.15 ? 'DOWN' : 'FLAT';

  // 6. Causal Developing POC over the last 40 bars (strictly using bars <= i)
  const devLen = Math.min(40, n - frStart);
  const developingPoc: number[] = [];
  if (devLen >= 5) {
    const devStart = n - devLen;
    for (let i = devStart; i < n; i++) {
      const subStart = Math.max(frStart, i - 60);
      const subPoc = buildRangeProfile(closedCandles, subStart, i, 24).summary.poc;
      if (subPoc > 0) developingPoc.push(subPoc);
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
  majorSwings: SmcSwingPoint[],
  structureBreaks: SmcStructureBreak[] = []
): Mi007FibonacciConfluence | null {
  const n = closedCandles.length;
  if (n < 10) return null;

  const lookbackStart = Math.max(0, n - 100);
  let anchorHigh: { index: number; price: number; time: number } | null = null;
  let anchorLow: { index: number; price: number; time: number } | null = null;
  let bosDirection: 'BULLISH' | 'BEARISH' | null = null;

  // Priority 1 (Institutional SMC Strategy): Anchor strictly to the latest confirmed BOS / MSS Impulse Leg
  const recentBreaks = structureBreaks.filter(
    (b) => (b.breakType === 'BOS' || b.breakType === 'MSS' || b.breakType === 'CHoCH') && b.candleIndex >= lookbackStart
  );
  const latestBreak = recentBreaks.length > 0 ? recentBreaks[recentBreaks.length - 1] : null;

  if (latestBreak) {
    // FB5: Search strictly from the broken swing index (not swingIndex - 20) and verify origin hasn't been invalidated
    const searchStart = Math.max(0, latestBreak.swingIndex);
    const searchEnd = Math.min(n - 1, latestBreak.candleIndex);
    if (latestBreak.isBullish) {
      let origIdx = searchStart;
      let origLow = Infinity;
      for (let i = searchStart; i <= searchEnd; i++) {
        if (closedCandles[i].low < origLow) {
          origLow = closedCandles[i].low;
          origIdx = i;
        }
      }
      let peakIdx = origIdx;
      let peakHigh = -Infinity;
      let originBroken = false;
      for (let i = origIdx; i < n; i++) {
        if (closedCandles[i].high > peakHigh) {
          peakHigh = closedCandles[i].high;
          peakIdx = i;
        }
        if (i > origIdx && closedCandles[i].close < origLow) {
          originBroken = true;
        }
      }
      if (!originBroken && peakIdx > origIdx && peakHigh > origLow) {
        anchorLow = { index: origIdx, price: origLow, time: closedCandles[origIdx].openTime };
        anchorHigh = { index: peakIdx, price: peakHigh, time: closedCandles[peakIdx].openTime };
        bosDirection = 'BULLISH';
      }
    } else {
      let origIdx = searchStart;
      let origHigh = -Infinity;
      for (let i = searchStart; i <= searchEnd; i++) {
        if (closedCandles[i].high > origHigh) {
          origHigh = closedCandles[i].high;
          origIdx = i;
        }
      }
      let troughIdx = origIdx;
      let troughLow = Infinity;
      let originBroken = false;
      for (let i = origIdx; i < n; i++) {
        if (closedCandles[i].low < troughLow) {
          troughLow = closedCandles[i].low;
          troughIdx = i;
        }
        if (i > origIdx && closedCandles[i].close > origHigh) {
          originBroken = true;
        }
      }
      if (!originBroken && troughIdx > origIdx && origHigh > troughLow) {
        anchorHigh = { index: origIdx, price: origHigh, time: closedCandles[origIdx].openTime };
        anchorLow = { index: troughIdx, price: troughLow, time: closedCandles[troughIdx].openTime };
        bosDirection = 'BEARISH';
      }
    }
  }

  // Priority 2 (Fallback): Highest confirmed major swing high & lowest major swing low in active 100-bar window
  if (!anchorHigh || !anchorLow) {
    const recentMajors = majorSwings.filter((s) => s.index >= lookbackStart);
    const pool = recentMajors.length >= 2 ? recentMajors : majorSwings;
    const highs = pool.filter((s) => s.isHigh);
    const lows = pool.filter((s) => !s.isHigh);

    for (const h of highs) {
      if (!anchorHigh || h.price >= anchorHigh.price) {
        anchorHigh = { index: h.index, price: h.price, time: h.time };
      }
    }
    for (const l of lows) {
      if (!anchorLow || l.price <= anchorLow.price) {
        anchorLow = { index: l.index, price: l.price, time: l.time };
      }
    }

    if (!anchorHigh || !anchorLow) {
      for (let i = lookbackStart; i < n; i++) {
        const c = closedCandles[i];
        if (!anchorHigh || c.high > anchorHigh.price) {
          anchorHigh = { index: i, price: c.high, time: c.openTime };
        }
        if (!anchorLow || c.low < anchorLow.price) {
          anchorLow = { index: i, price: c.low, time: c.openTime };
        }
      }
    }

    if (anchorHigh && anchorLow) {
      const legStart = Math.min(anchorHigh.index, anchorLow.index);
      for (let i = legStart; i < n; i++) {
        const c = closedCandles[i];
        if (c.high > anchorHigh.price) {
          anchorHigh = { index: i, price: c.high, time: c.openTime };
        }
        if (c.low < anchorLow.price) {
          anchorLow = { index: i, price: c.low, time: c.openTime };
        }
      }
    }
  }

  if (!anchorHigh || !anchorLow || anchorHigh.price <= anchorLow.price) return null;

  // Direction of the primary impulse leg:
  //   Low before High -> BULLISH impulse (1.00 = Low, 0.00 = High; retraces DOWN from High; extends UP above High)
  //   High before Low -> BEARISH impulse (1.00 = High, 0.00 = Low; retraces UP from Low; extends DOWN below Low)
  const direction: 'BULLISH' | 'BEARISH' = bosDirection || (anchorHigh.index >= anchorLow.index ? 'BULLISH' : 'BEARISH');
  const span = anchorHigh.price - anchorLow.price;
  if (span <= 0) return null;

  const lastClose = closedCandles[n - 1].close;

  const retracementPrice = (r: number) =>
    roundPrice(direction === 'BULLISH' ? anchorHigh!.price - span * r : anchorLow!.price + span * r);
  const extensionPrice = (r: number) =>
    roundPrice(direction === 'BULLISH' ? anchorLow!.price + span * r : anchorHigh!.price - span * r);

  const p000 = retracementPrice(0.0);
  const p236 = retracementPrice(0.236);
  const p382 = retracementPrice(0.382);
  const p050 = retracementPrice(0.5);
  const p618 = retracementPrice(0.618);
  const p705 = retracementPrice(0.705);
  const p786 = retracementPrice(0.786);
  const p100 = retracementPrice(1.0);
  const rawExt1272 = extensionPrice(1.272);
  const rawExt1618 = extensionPrice(1.618);
  const ext1272 = rawExt1272 > 0 ? rawExt1272 : 0;
  const ext1618 = rawExt1618 > 0 ? rawExt1618 : 0;

  const levels: Mi007FibLevel[] = [
    { ratio: 0.0, label: '0.00', price: p000, isExtension: false, isOte: false },
    { ratio: 0.236, label: '0.236', price: p236, isExtension: false, isOte: false },
    { ratio: 0.382, label: '0.382', price: p382, isExtension: false, isOte: false },
    { ratio: 0.5, label: '0.50 EQ', price: p050, isExtension: false, isOte: false },
    { ratio: 0.618, label: '0.618 Golden', price: p618, isExtension: false, isOte: true },
    { ratio: 0.705, label: '0.705 OTE', price: p705, isExtension: false, isOte: true },
    { ratio: 0.786, label: '0.786 Deep', price: p786, isExtension: false, isOte: true },
    { ratio: 1.0, label: '1.00', price: p100, isExtension: false, isOte: false },
    ...(ext1272 > 0 ? [{ ratio: 1.272, label: '1.272 Ext', price: ext1272, isExtension: true, isOte: false }] : []),
    ...(ext1618 > 0 ? [{ ratio: 1.618, label: '1.618 Ext', price: ext1618, isExtension: true, isOte: false }] : []),
  ];

  const oteLow = Math.min(p618, p786);
  const oteHigh = Math.max(p618, p786);
  const inPremium = lastClose > p050;
  const inDiscount = lastClose < p050;
  const inOteZone = lastClose >= oteLow && lastClose <= oteHigh;

  return {
    direction,
    swingHigh: anchorHigh,
    swingLow: anchorLow,
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

  // 5. Align 1:1 with Main SMC Engine's active confirmed setup + check Volume Profile overlap (POC/VAL/VAH/LVN)
  const matchingSmcSetup = (smc.confirmedSetups || [])
    .filter(
      (s) =>
        s.direction === direction &&
        (s.qualityScore ?? 0) >= 60 &&
        !s.isRejectedPermanently &&
        !s.retestFailed &&
        s.signalState !== 'INVALIDATED' &&
        s.signalState !== 'RETEST_FAILED' &&
        (isBull ? last.close >= s.stopLoss : last.close <= s.stopLoss) &&
        lastIdx - s.candleIndex <= 60
    )
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0) || b.candleIndex - a.candleIndex)[0];

  const rawSmcEntry = roundPrice(
    matchingSmcSetup
      ? matchingSmcSetup.entryPrice
      : obNear && activeOb
      ? (activeOb.topPrice + activeOb.bottomPrice) / 2
      : fvgNear && activeFvg
      ? activeFvg.cePrice
      : last.close
  );
  // VP2: Gate Volume Profile scoring strictly on ACTUAL volume quality
  const hasActualVp = vp.volumeQuality === 'ACTUAL' && vp.fixedRange.totalVolume > 0;
  const keyVpLevels = hasActualVp
    ? [
        vp.fixedRange.poc,
        vp.fixedRange.val,
        vp.fixedRange.vah,
        vp.anchored?.poc,
        vp.session?.poc,
        ...vp.lvnPrices,
      ].filter((v): v is number => typeof v === 'number' && v > 0)
    : [];

  // Directional Volume Profile Support (for Longs: at/below entry) / Resistance (for Shorts: at/above entry)
  const directionalVpLevels = keyVpLevels.filter((lvl) =>
    isBull ? lvl <= rawSmcEntry + atr * 0.35 : lvl >= rawSmcEntry - atr * 0.35
  );

  let nearestVpDist = Infinity;
  for (const lvl of directionalVpLevels) {
    const d = Math.abs(rawSmcEntry - lvl);
    if (d < nearestVpDist) {
      nearestVpDist = d;
    }
  }

  // Strict directional confluence: supporting/resisting VP level must align with SMC Entry or its OB/FVG zone
  const vpInsideZone = Boolean(
    hasActualVp && (
      (activeOb && directionalVpLevels.some((lvl) => lvl >= activeOb.bottomPrice - atr * 0.4 && lvl <= activeOb.topPrice + atr * 0.4)) ||
      (activeFvg && directionalVpLevels.some((lvl) => lvl >= activeFvg.bottomPrice - atr * 0.4 && lvl <= activeFvg.topPrice + atr * 0.4))
    )
  );
  const vpEntryAligned = hasActualVp && (vpInsideZone || nearestVpDist <= atr * 1.5);
  const vpBiasAligned = hasActualVp && ((isBull && vp.pocMigration === 'UP') || (!isBull && vp.pocMigration === 'DOWN'));
  const vpPts = !hasActualVp ? 0 : vpEntryAligned && vpBiasAligned ? 15 : vpEntryAligned ? 12 : vpBiasAligned ? 6 : 0;

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

  // Lock Entry / SL / TP1 / TP2 1:1 to our main SMC Engine setup when present so SMC & MI-007 match identically
  const entryPrice = roundPrice(rawSmcEntry);

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
  // FB2: Enforce strictly positive prices for SL and all targets (never emit negative targets/extensions)
  const minPriceFloor = Math.max(0.01, roundPrice(last.close * 0.01));
  const rawStopLoss = matchingSmcSetup
    ? matchingSmcSetup.stopLoss
    : (isBull ? entryPrice - clampedRisk : entryPrice + clampedRisk);
  const stopLoss = roundPrice(Math.max(minPriceFloor, rawStopLoss));
  const risk = Math.max(1e-9, Math.abs(entryPrice - stopLoss));

  // Opposing Liquidity Pools for TP1 & TP2 (strictly positive & on the correct side of entry)
  const opposingPools = smc.liquidityLevels
    .filter(
      (lvl) =>
        !lvl.isSwept &&
        lvl.price > minPriceFloor &&
        (isBull ? lvl.price >= entryPrice + risk * 2.0 : lvl.price <= entryPrice - risk * 2.0)
    )
    .map((lvl) => lvl.price)
    .sort((a, b) => (isBull ? a - b : b - a));

  const rawTp1 = matchingSmcSetup
    ? matchingSmcSetup.targetPrice
    : (opposingPools[0] ?? (isBull ? entryPrice + risk * 2.0 : entryPrice - risk * 2.0));
  const target1 = roundPrice(Math.max(minPriceFloor, rawTp1));

  // Enforce clean >= 0.8R separation between TP1 and TP2 so targets never bunch up
  const fallbackTp2 = isBull
    ? Math.max(entryPrice + risk * 3.0, target1 + risk)
    : Math.max(minPriceFloor, Math.min(entryPrice - risk * 3.0, target1 - risk * 0.8));
  const smcTp2Separated =
    matchingSmcSetup?.targetPrice2 !== undefined &&
    (isBull
      ? matchingSmcSetup.targetPrice2 >= target1 + risk * 0.8
      : matchingSmcSetup.targetPrice2 <= target1 - risk * 0.8 && matchingSmcSetup.targetPrice2 > minPriceFloor);
  const rawTp2 = smcTp2Separated
    ? matchingSmcSetup!.targetPrice2!
    : (opposingPools.find((p) => (isBull ? p >= target1 + risk * 0.8 : p <= target1 - risk * 0.8)) ?? fallbackTp2);
  const target2 = roundPrice(Math.max(minPriceFloor, rawTp2));

  const fibExtCandidate = fib && fib.direction === direction && fib.ext1272 > minPriceFloor ? fib.ext1272 : undefined;
  const fibExtValid =
    fibExtCandidate !== undefined &&
    (isBull ? fibExtCandidate > target2 + risk * 0.4 : fibExtCandidate < target2 - risk * 0.4 && fibExtCandidate > minPriceFloor);
  const fallbackTp3 = isBull
    ? Math.max(entryPrice + risk * 4.0, target2 + risk)
    : Math.max(minPriceFloor, Math.min(entryPrice - risk * 4.0, target2 - risk * 0.5));
  const target3 = roundPrice(Math.max(minPriceFloor, fibExtValid ? fibExtCandidate! : fallbackTp3));

  const targetsValid =
    entryPrice > 0 &&
    stopLoss > 0 &&
    target1 > 0 &&
    target2 > 0 &&
    target3 > 0 &&
    (isBull
      ? stopLoss < entryPrice && target1 > entryPrice && target2 >= target1 && target3 >= target2
      : stopLoss > entryPrice && target1 < entryPrice && target2 <= target1 && target3 <= target2);

  // FB2: Stale / passed-TP1 / SL-violated check
  const pricePassedTp1 = isBull ? last.close >= target1 : last.close <= target1;
  const priceViolatedSl = isBull ? last.close <= stopLoss : last.close >= stopLoss;
  const entryDistancePct = last.close > 0 ? Math.abs(entryPrice - last.close) / last.close : 1;
  const entryTooFar = Math.abs(entryPrice - last.close) > atr * 4.5 || entryDistancePct > 0.12;
  const isStaleSetup = pricePassedTp1 || priceViolatedSl || entryTooFar;

  const riskReward1 = Number((Math.abs(target1 - entryPrice) / risk).toFixed(2));
  const riskReward2 = Number((Math.abs(target2 - entryPrice) / risk).toFixed(2));
  const riskReward3 = Number((Math.abs(target3 - entryPrice) / risk).toFixed(2));

  const anchorBarIdx = matchingSmcSetup
    ? matchingSmcSetup.candleIndex
    : Math.max(
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
      status: !hasActualVp ? 'Unconfirmed' : vpPts >= 12 ? 'Confirmed' : vpPts > 0 ? 'Pending' : 'Unconfirmed',
      weight: 15,
      awarded: vpPts,
      detail: hasActualVp
        ? `POC ${vp.fixedRange.poc} | Migration ${vp.pocMigration} (ACTUAL)`
        : 'Not available (no actual volume)',
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
      label: `Order Flow (${of.volumeQuality === 'ACTUAL' ? 'OHLCV Delta Proxy' : 'Unavailable'})`,
      status: ofAligned ? 'Confirmed' : ofPts > 0 ? 'Pending' : 'Unconfirmed',
      weight: 10,
      awarded: ofPts,
      detail: of.volumeQuality === 'ACTUAL' ? `${of.note} (OHLCV close-position proxy, not tick tape)` : of.note,
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

  // Guarantee totalScore === exact sum of checklist items (no discrepancy possible)
  const verifiedTotalScore = Math.min(100, checklist.reduce((acc, item) => acc + item.awarded, 0));
  const verifiedClassification = classifyScore(verifiedTotalScore);

  // Strict institutional execution gate (Important 05 & 06):
  // - Never bypass Volume Profile confluence when actual volume is unavailable
  // - status === 'ACTIVE' iff isTradeable === true (zero status/isTradeable disagreement)
  const vpGate = hasActualVp && vpEntryAligned;
  const isTradeable =
    verifiedTotalScore >= 60 &&
    riskReward1 >= 2.0 &&
    targetsValid &&
    !isStaleSetup &&
    entryCandleConfirmed &&
    vpGate;

  return {
    id: `mi007_${direction}_${anchorBarIdx}_${roundPrice(entryPrice)}`,
    direction,
    score: verifiedTotalScore,
    classification: verifiedClassification,
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
    status: isTradeable ? 'ACTIVE' : 'WAIT_CONFIRMATION',
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

  // Module 04: Volume Profile (Fixed Range, Exchange-Session, Daily, Weekly, Anchored, HVN/LVN, POC migration)
  const volumeProfile = computeVolumeProfiles(closedCandles, majorSwings, symbol);

  // Module 05: Fibonacci Confluence (anchored strictly to latest confirmed BOS/MSS impulse leg)
  const fibonacci = computeFibonacciConfluence(closedCandles, majorSwings, smc.structureBreaks);

function detectVolumeBubbles(
  closedCandles: Candle[],
  volumeQuality: Mi007VolumeQuality
): Mi007VolumeBubble[] {
  // Strictly gate on ACTUAL volume so zero-volume feeds never fabricate volume bubbles
  if (volumeQuality !== 'ACTUAL' || closedCandles.length < 25) return [];

  const bubbles: Mi007VolumeBubble[] = [];
  const start = Math.max(20, closedCandles.length - 180);
  for (let i = start; i < closedCandles.length; i++) {
    const c = closedCandles[i];
    const vol = typeof c.volume === 'number' && Number.isFinite(c.volume) && c.volume > 0 ? c.volume : 0;
    if (vol <= 0) continue;

    // Causal 20-bar trailing SMA(volume) strictly excluding bar i
    let sum = 0;
    let cnt = 0;
    for (let j = i - 20; j < i; j++) {
      const v = closedCandles[j]?.volume;
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        sum += v;
        cnt++;
      }
    }
    if (cnt < 10) continue;
    const avgVol = sum / cnt;
    if (avgVol <= 0) continue;
    const relVolume = vol / avgVol;
    if (relVolume < 1.75) continue;

    const range = Math.max(1e-9, c.high - c.low);
    const body = Math.abs(c.close - c.open);
    const bodyRatio = body / range;
    const closePos = (c.close - c.low) / range;
    const isAbsorption = relVolume >= 2.0 && bodyRatio <= 0.38;
    const side: 'BUY' | 'SELL' = closePos >= 0.5 ? 'BUY' : 'SELL';
    // Anchor bubble at the extreme absorption wick or close for visual clarity
    const price = isAbsorption
      ? (side === 'BUY' ? c.low + range * 0.25 : c.high - range * 0.25)
      : c.close;

    bubbles.push({
      candleIndex: i,
      time: c.openTime,
      price: roundPrice(price),
      volume: vol,
      relVolume: Number(relVolume.toFixed(2)),
      side,
      isAbsorption,
    });
  }
  return bubbles;
}

  // Module 06: Order Flow Confirmation & Volume Bubbles (gated by ACTUAL vs ESTIMATED volume)
  const orderFlow = evaluateOrderFlow(closedCandles, volumeProfile.volumeQuality);
  const volumeBubbles = detectVolumeBubbles(closedCandles, volumeProfile.volumeQuality);

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
    volumeBubbles,
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
