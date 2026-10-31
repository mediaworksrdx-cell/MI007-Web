// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE AI (MI-007) — QUANTITATIVE ORDER FLOW FOOTPRINT ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Pure quantitative microstructure calculations:
// 1. Bid x Ask Price-Level Discretization & Binning
// 2. Diagonal Imbalance & Stacked Imbalance Detection
// 3. Absorption Detection at Extremes
// 4. Volume Point of Control (POC) & 70% Value Area
// 5. Delta & Cumulative Volume Delta (CVD) with Divergence
// 6. Actionable Institutional Signals with Entry, Invalidation (SL), Target (TP), R:R
// ═══════════════════════════════════════════════════════════════════════════

import { Candle } from '../types';
import {
  CandleFootprint,
  FootprintDataSource,
  OrderFlowConfig,
  OrderFlowAnalysisResult,
  OrderFlowSignal,
  PriceLevelFootprint,
  StackedImbalanceZone,
  AbsorptionEvent,
  DEFAULT_ORDER_FLOW_CONFIG,
} from './types';

// ── Adaptive Tick Size Calculator ──────────────────────────────────────────

export function calculateAdaptiveTickSize(candles: Candle[], configTick: number | 'auto'): number {
  if (typeof configTick === 'number' && configTick > 0) {
    return configTick;
  }
  if (!candles || candles.length === 0) return 1.0;

  // Compute median candle range over the last 30 bars
  const sample = candles.slice(-30);
  const ranges = sample.map(c => Math.max(0.01, c.high - c.low));
  ranges.sort((a, b) => a - b);
  const medianRange = ranges[Math.floor(ranges.length / 2)] || 1.0;
  const lastPrice = sample[sample.length - 1]?.close || 1000;

  // Target roughly 15 to 25 price slices per candle
  const rawStep = medianRange / 18;

  // Pick clean human-readable step sizes
  if (lastPrice >= 20000) {
    if (rawStep > 25) return 50.0;
    if (rawStep > 15) return 20.0;
    if (rawStep > 7) return 10.0;
    if (rawStep > 3) return 5.0;
    return 2.0;
  } else if (lastPrice >= 2000) {
    if (rawStep > 10) return 10.0;
    if (rawStep > 4) return 5.0;
    if (rawStep > 1.5) return 2.0;
    if (rawStep > 0.7) return 1.0;
    return 0.5;
  } else if (lastPrice >= 200) {
    if (rawStep > 2) return 2.0;
    if (rawStep > 0.8) return 1.0;
    if (rawStep > 0.3) return 0.5;
    if (rawStep > 0.15) return 0.25;
    return 0.1;
  } else if (lastPrice >= 20) {
    if (rawStep > 0.2) return 0.25;
    if (rawStep > 0.08) return 0.1;
    return 0.05;
  } else {
    if (rawStep > 0.02) return 0.05;
    if (rawStep > 0.008) return 0.01;
    return 0.005;
  }
}

// ── Discretize Price to Nearest Tick ────────────────────────────────────────

export function roundToTick(price: number, tickSize: number): number {
  if (tickSize <= 0) return price;
  const factor = 1 / tickSize;
  const decimals = tickSize < 0.01 ? 4 : tickSize < 0.1 ? 3 : tickSize < 1 ? 2 : 1;
  return +(Math.round(price * factor) / factor).toFixed(decimals);
}

function roundSignalPrice(price: number): number {
  const abs = Math.abs(price);
  const decimals = abs > 0 && abs < 1 ? 4 : abs < 10 ? 3 : 2;
  return +price.toFixed(decimals);
}

// ── Microstructure Volume Distributor for Simulated / OHLCV Feeds ─────────
// Generates deterministic order flow distributions from OHLCV price action

export function generateMicrostructureFootprint(
  candle: Candle,
  candleIndex: number,
  tickSize: number,
  cumDeltaPrev: number,
  config: OrderFlowConfig
): CandleFootprint {
  const rawRange = Math.max(0, candle.high - candle.low);
  // Cap maximum levels per candle at 60 to prevent memory/render spikes on outlier bars
  const effectiveTick = rawRange / Math.max(tickSize, 0.0001) > 60
    ? roundToTick(rawRange / 50, tickSize) || rawRange / 50
    : tickSize;

  const lowTick = roundToTick(candle.low, effectiveTick);
  const highTick = roundToTick(candle.high, effectiveTick);

  const levels = new Map<number, PriceLevelFootprint>();
  const isBull = candle.close >= candle.open;

  // Approximate typical price and standard deviation for volume Gaussian curve
  const typicalPrice = (candle.high + candle.low + candle.close) / 3;
  const range = Math.max(effectiveTick, candle.high - candle.low);

  // Base volume per price level using a bell curve centered near typicalPrice / close
  const levelPrices: number[] = [];
  let curr = lowTick;
  let guard = 0;
  while (curr <= highTick + 0.00001 && guard < 65) {
    levelPrices.push(+curr.toFixed(4));
    curr = roundToTick(curr + effectiveTick, effectiveTick);
    guard++;
  }
  if (levelPrices.length === 0) {
    levelPrices.push(+lowTick.toFixed(4));
  }

  // Deterministic PRNG seeded by candle openTime + open (NOT close) so live ticks never reshuffle historical levels
  let seed = ((candle.openTime % 1000000) ^ (candleIndex * 7919) ^ Math.round(candle.open * 100)) >>> 0;
  function pseudoRand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 8) / 16777216;
  }

  let totalVolSum = 0;
  const rawVols: { price: number; weight: number }[] = [];

  for (const p of levelPrices) {
    // Distance from center of bar
    const dist = Math.abs(p - typicalPrice) / (range * 0.45);
    const gaussian = Math.exp(-0.5 * dist * dist);
    const noise = 0.75 + 0.5 * pseudoRand();
    const weight = Math.max(0.05, gaussian * noise);
    rawVols.push({ price: p, weight });
    totalVolSum += weight;
  }

  const barVolume = Math.max(candle.volume || 0, levelPrices.length * 2);
  let accumulatedVol = 0;
  let runningDelta = 0;
  let minDelta = 0;
  let maxDelta = 0;

  // Close Location Value (CLV) in [-1, +1] anchors directional delta deterministically to bar structure
  const clv = rawRange > 0 ? ((candle.close - candle.low) - (candle.high - candle.close)) / rawRange : 0;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;

  for (const { price, weight } of rawVols) {
    const levelVol = Math.max(1, Math.round((weight / totalVolSum) * barVolume));
    accumulatedVol += levelVol;

    const relPos = range > 0 ? (price - candle.low) / range : 0.5; // 0 at low, 1 at high
    let buyRatio = 0.5 + 0.22 * clv + 0.15 * (relPos - 0.5) * (isBull ? 1 : -1) + (pseudoRand() - 0.5) * 0.10;

    // Structural wick rejection absorption at extremes:
    // Upper wick >= 35% of bar range: trapped aggressive buyers absorbed by passive limit sellers at high
    if (relPos > 0.85 && upperWick >= rawRange * 0.35) {
      buyRatio = 0.70;
    }
    // Lower wick >= 35% of bar range: trapped aggressive sellers absorbed by passive limit buyers at low
    if (relPos < 0.15 && lowerWick >= rawRange * 0.35) {
      buyRatio = 0.30;
    }

    buyRatio = Math.max(0.10, Math.min(0.90, buyRatio));

    const askVol = Math.round(levelVol * buyRatio);
    const bidVol = Math.max(0, levelVol - askVol);
    const delta = askVol - bidVol;

    runningDelta += delta;
    if (runningDelta < minDelta) minDelta = runningDelta;
    if (runningDelta > maxDelta) maxDelta = runningDelta;

    levels.set(price, {
      price,
      bidVolume: bidVol,
      askVolume: askVol,
      totalVolume: bidVol + askVol,
      delta,
      hasBuyImbalance: false,
      hasSellImbalance: false,
      imbalanceRatio: 1.0,
      isPoc: false,
      isValueArea: false,
    });
  }

  // Sort ascending by price for diagonal calculations
  const sortedAsc = Array.from(levels.values()).sort((a, b) => a.price - b.price);

  // 1. Identify POC
  let maxLevelVol = -1;
  let pocPrice = sortedAsc[0]?.price || candle.close;
  for (const lvl of sortedAsc) {
    if (lvl.totalVolume > maxLevelVol) {
      maxLevelVol = lvl.totalVolume;
      pocPrice = lvl.price;
    }
  }
  const pocLevel = levels.get(pocPrice);
  if (pocLevel) pocLevel.isPoc = true;

  // 2. Identify 70% Value Area (VAH & VAL)
  const targetVaVol = accumulatedVol * 0.7;
  let curVaVol = pocLevel ? pocLevel.totalVolume : 0;
  if (pocLevel) pocLevel.isValueArea = true;

  const pocIdx = sortedAsc.findIndex(l => l.price === pocPrice);
  let upIdx = pocIdx >= 0 ? pocIdx + 1 : 0;
  let downIdx = pocIdx >= 0 ? pocIdx - 1 : 0;

  let valPrice = pocPrice;
  let vahPrice = pocPrice;

  while (curVaVol < targetVaVol && (upIdx < sortedAsc.length || downIdx >= 0)) {
    const upVol = upIdx < sortedAsc.length ? sortedAsc[upIdx].totalVolume : -1;
    const downVol = downIdx >= 0 ? sortedAsc[downIdx].totalVolume : -1;

    if (upVol >= downVol && upIdx < sortedAsc.length) {
      curVaVol += sortedAsc[upIdx].totalVolume;
      sortedAsc[upIdx].isValueArea = true;
      vahPrice = sortedAsc[upIdx].price;
      upIdx++;
    } else if (downIdx >= 0) {
      curVaVol += sortedAsc[downIdx].totalVolume;
      sortedAsc[downIdx].isValueArea = true;
      valPrice = sortedAsc[downIdx].price;
      downIdx--;
    } else {
      break;
    }
  }

  // 3. Diagonal Imbalances:
  // Buy imbalance at level i occurs when Ask[i] >= Bid[i - 1] * ratio
  // Sell imbalance at level i occurs when Bid[i] >= Ask[i + 1] * ratio
  const buyImbalances: number[] = [];
  const sellImbalances: number[] = [];

  for (let i = 0; i < sortedAsc.length; i++) {
    const curr = sortedAsc[i];

    // Check diagonal buy imbalance with level below (i - 1)
    if (i > 0) {
      const below = sortedAsc[i - 1];
      if (
        curr.askVolume >= config.minImbalanceVolume &&
        below.bidVolume > 0 &&
        curr.askVolume / below.bidVolume >= config.imbalanceRatio
      ) {
        curr.hasBuyImbalance = true;
        curr.imbalanceRatio = +(curr.askVolume / below.bidVolume).toFixed(1);
        buyImbalances.push(curr.price);
      }
    }

    // Check diagonal sell imbalance with level above (i + 1)
    if (i < sortedAsc.length - 1) {
      const above = sortedAsc[i + 1];
      if (
        curr.bidVolume >= config.minImbalanceVolume &&
        above.askVolume > 0 &&
        curr.bidVolume / above.askVolume >= config.imbalanceRatio
      ) {
        curr.hasSellImbalance = true;
        curr.imbalanceRatio = +(curr.bidVolume / above.askVolume).toFixed(1);
        sellImbalances.push(curr.price);
      }
    }
  }

  // 4. Stacked Imbalances (contiguous >= threshold)
  const stackedZones: StackedImbalanceZone[] = [];
  let currentBuyStreak: number[] = [];
  let currentSellStreak: number[] = [];

  for (const lvl of sortedAsc) {
    if (lvl.hasBuyImbalance) {
      currentBuyStreak.push(lvl.price);
    } else {
      if (currentBuyStreak.length >= config.stackedImbalanceThreshold) {
        stackedZones.push({
          id: `stack-buy-${candleIndex}-${currentBuyStreak[0]}`,
          startIndex: candleIndex,
          endIndex: candleIndex + 12,
          openTime: candle.openTime,
          bottomPrice: currentBuyStreak[0],
          topPrice: currentBuyStreak[currentBuyStreak.length - 1],
          isBuy: true,
          levelCount: currentBuyStreak.length,
          totalVolume: currentBuyStreak.reduce((acc, p) => acc + (levels.get(p)?.totalVolume || 0), 0),
          isMitigated: false,
        });
      }
      currentBuyStreak = [];
    }

    if (lvl.hasSellImbalance) {
      currentSellStreak.push(lvl.price);
    } else {
      if (currentSellStreak.length >= config.stackedImbalanceThreshold) {
        stackedZones.push({
          id: `stack-sell-${candleIndex}-${currentSellStreak[0]}`,
          startIndex: candleIndex,
          endIndex: candleIndex + 12,
          openTime: candle.openTime,
          bottomPrice: currentSellStreak[0],
          topPrice: currentSellStreak[currentSellStreak.length - 1],
          isBuy: false,
          levelCount: currentSellStreak.length,
          totalVolume: currentSellStreak.reduce((acc, p) => acc + (levels.get(p)?.totalVolume || 0), 0),
          isMitigated: false,
        });
      }
      currentSellStreak = [];
    }
  }

  // Final check for trailing streaks
  if (currentBuyStreak.length >= config.stackedImbalanceThreshold) {
    stackedZones.push({
      id: `stack-buy-${candleIndex}-${currentBuyStreak[0]}`,
      startIndex: candleIndex,
      endIndex: candleIndex + 12,
      openTime: candle.openTime,
      bottomPrice: currentBuyStreak[0],
      topPrice: currentBuyStreak[currentBuyStreak.length - 1],
      isBuy: true,
      levelCount: currentBuyStreak.length,
      totalVolume: currentBuyStreak.reduce((acc, p) => acc + (levels.get(p)?.totalVolume || 0), 0),
      isMitigated: false,
    });
  }
  if (currentSellStreak.length >= config.stackedImbalanceThreshold) {
    stackedZones.push({
      id: `stack-sell-${candleIndex}-${currentSellStreak[0]}`,
      startIndex: candleIndex,
      endIndex: candleIndex + 12,
      openTime: candle.openTime,
      bottomPrice: currentSellStreak[0],
      topPrice: currentSellStreak[currentSellStreak.length - 1],
      isBuy: false,
      levelCount: currentSellStreak.length,
      totalVolume: currentSellStreak.reduce((acc, p) => acc + (levels.get(p)?.totalVolume || 0), 0),
      isMitigated: false,
    });
  }

  // 5. Absorption Detection:
  // Bullish: Meaningful lower wick rejection (>= 35% of bar range) with elevated sell volume absorbed at low
  // Bearish: Meaningful upper wick rejection (>= 35% of bar range) with elevated buy volume absorbed at high
  let absorption: AbsorptionEvent | null = null;
  const lowestLevel = sortedAsc[0];
  const highestLevel = sortedAsc[sortedAsc.length - 1];

  if (
    lowestLevel &&
    rawRange > 0 &&
    lowerWick >= rawRange * 0.35 &&
    lowestLevel.bidVolume >= (accumulatedVol / Math.max(1, sortedAsc.length)) * 0.8 &&
    candle.close > candle.low + rawRange * 0.45
  ) {
    absorption = {
      candleIndex,
      time: candle.openTime,
      price: lowestLevel.price,
      isBullish: true,
      volume: lowestLevel.totalVolume,
      delta: lowestLevel.delta,
      description: `Passive limit buyers absorbed ${lowestLevel.bidVolume} aggressive sells at wick low`,
    };
  } else if (
    highestLevel &&
    rawRange > 0 &&
    upperWick >= rawRange * 0.35 &&
    highestLevel.askVolume >= (accumulatedVol / Math.max(1, sortedAsc.length)) * 0.8 &&
    candle.close < candle.high - rawRange * 0.45
  ) {
    absorption = {
      candleIndex,
      time: candle.openTime,
      price: highestLevel.price,
      isBullish: false,
      volume: highestLevel.totalVolume,
      delta: highestLevel.delta,
      description: `Passive limit sellers absorbed ${highestLevel.askVolume} aggressive buys at wick high`,
    };
  }

  // 6. Unfinished Business:
  // Only flagged when the candle closes near the extreme with balanced two-sided auction volume (no zero-print exhaustion)
  const unfinishedBusiness = {
    high: Boolean(
      highestLevel &&
      upperWick <= rawRange * 0.12 &&
      highestLevel.bidVolume >= highestLevel.totalVolume * 0.30 &&
      highestLevel.askVolume >= highestLevel.totalVolume * 0.30
    ),
    low: Boolean(
      lowestLevel &&
      lowerWick <= rawRange * 0.12 &&
      lowestLevel.bidVolume >= lowestLevel.totalVolume * 0.30 &&
      lowestLevel.askVolume >= lowestLevel.totalVolume * 0.30
    ),
  };

  // Sorted levels high-to-low for top-down canvas rendering
  const sortedLevels = [...sortedAsc].reverse();

  return {
    candleIndex,
    openTime: candle.openTime,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    totalVolume: accumulatedVol,
    totalDelta: runningDelta,
    minDelta,
    maxDelta,
    cumDelta: cumDeltaPrev + runningDelta,
    pocPrice,
    vahPrice,
    valPrice,
    levels,
    sortedLevels,
    buyImbalancePrices: buyImbalances,
    sellImbalancePrices: sellImbalances,
    stackedZones,
    absorption,
    unfinishedBusiness,
  };
}

// ── Master Order Flow Analyzer ─────────────────────────────────────────────

export function analyzeOrderFlow(
  candles: Candle[],
  config: OrderFlowConfig = DEFAULT_ORDER_FLOW_CONFIG
): OrderFlowAnalysisResult {
  if (!candles || candles.length === 0) {
    return {
      footprints: [],
      activeZones: [],
      signals: [],
      dataSource: config.dataSource,
      tickSizeUsed: 1.0,
    };
  }

  const tickSizeUsed = calculateAdaptiveTickSize(candles, config.tickSize);
  const footprints: CandleFootprint[] = [];
  const activeZones: StackedImbalanceZone[] = [];
  const signals: OrderFlowSignal[] = [];

  // Process all candles
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const prevCum = footprints.length > 0 ? footprints[footprints.length - 1].cumDelta : 0;
    const fp = generateMicrostructureFootprint(c, i, tickSizeUsed, prevCum, config);
    footprints.push(fp);

    // Collect stacked imbalance zones
    for (const z of fp.stackedZones) {
      activeZones.push(z);
    }
  }

  // Update mitigation status of active zones and index by mitigation candle for O(1) lookup
  const buyZonesByMitigation = new Map<number, StackedImbalanceZone>();
  const sellZonesByMitigation = new Map<number, StackedImbalanceZone>();

  for (const zone of activeZones) {
    for (let j = zone.startIndex + 1; j < candles.length; j++) {
      const c = candles[j];
      const hit = zone.isBuy
        ? c.low <= zone.topPrice && c.high >= zone.bottomPrice
        : c.high >= zone.bottomPrice && c.low <= zone.topPrice;
      if (hit) {
        zone.isMitigated = true;
        zone.mitigationIndex = j;
        zone.endIndex = Math.min(candles.length - 1, j + 3);
        if (zone.isBuy) {
          buyZonesByMitigation.set(j, zone);
        } else {
          sellZonesByMitigation.set(j, zone);
        }
        break;
      }
    }
  }

  // ── Signal Generation ──────────────────────────────────────────────────
  if (config.showSignals && footprints.length >= 5) {
    for (let i = 3; i < footprints.length; i++) {
      const curr = footprints[i];
      const prev = footprints[i - 1];
      const prev2 = footprints[i - 2];
      const range = Math.max(tickSizeUsed, curr.high - curr.low);

      // Signal 1: Bullish Absorption
      if (config.showAbsorption && curr.absorption && curr.absorption.isBullish) {
        const inv = curr.low - range * 0.15;
        const entry = curr.close;
        const target = curr.close + (curr.close - inv) * 2.5;
        signals.push({
          id: `sig-bull-abs-${curr.openTime}`,
          type: 'BULLISH_ABSORPTION',
          title: 'Bullish Absorption Setup',
          isBullish: true,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry),
          invalidationPrice: roundSignalPrice(inv),
          targetPrice: roundSignalPrice(target),
          riskReward: 2.5,
          conditions: [
            'Aggressive sell volume absorbed at lower wick rejection',
            'Passive buyer defense confirmed above 45% bar range',
            `Point of Control (POC) anchored at ${curr.pocPrice}`,
          ],
        });
      }

      // Signal 2: Bearish Absorption
      if (config.showAbsorption && curr.absorption && !curr.absorption.isBullish) {
        const inv = curr.high + range * 0.15;
        const entry = curr.close;
        const target = curr.close - (inv - curr.close) * 2.5;
        signals.push({
          id: `sig-bear-abs-${curr.openTime}`,
          type: 'BEARISH_ABSORPTION',
          title: 'Bearish Absorption Setup',
          isBullish: false,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry),
          invalidationPrice: roundSignalPrice(inv),
          targetPrice: roundSignalPrice(target),
          riskReward: 2.5,
          conditions: [
            'Aggressive buy volume absorbed at upper wick rejection',
            'Passive seller defense confirmed below 55% bar range',
            `Point of Control (POC) anchored at ${curr.pocPrice}`,
          ],
        });
      }

      // Signal 3: Stacked Buy Imbalance Retest
      const buyZoneRetest = buyZonesByMitigation.get(i);
      if (buyZoneRetest && curr.close > curr.open) {
        const inv = buyZoneRetest.bottomPrice - range * 0.1;
        const entry = curr.close;
        const target = curr.close + (curr.close - inv) * 2.8;
        signals.push({
          id: `sig-bull-stack-${curr.openTime}`,
          type: 'BULLISH_STACKED_IMBALANCE',
          title: 'Stacked Imbalance Support Bounce',
          isBullish: true,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry),
          invalidationPrice: roundSignalPrice(inv),
          targetPrice: roundSignalPrice(target),
          riskReward: 2.8,
          conditions: [
            `${buyZoneRetest.levelCount}-level stacked buy imbalance confirmed`,
            'Clean test and buyer response off order flow demand zone',
            `Zone range: ${buyZoneRetest.bottomPrice} - ${buyZoneRetest.topPrice}`,
          ],
        });
      }

      // Signal 4: Stacked Sell Imbalance Retest
      const sellZoneRetest = sellZonesByMitigation.get(i);
      if (sellZoneRetest && curr.close < curr.open) {
        const inv = sellZoneRetest.topPrice + range * 0.1;
        const entry = curr.close;
        const target = curr.close - (inv - curr.close) * 2.8;
        signals.push({
          id: `sig-bear-stack-${curr.openTime}`,
          type: 'BEARISH_STACKED_IMBALANCE',
          title: 'Stacked Imbalance Resistance Rejection',
          isBullish: false,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry),
          invalidationPrice: roundSignalPrice(inv),
          targetPrice: roundSignalPrice(target),
          riskReward: 2.8,
          conditions: [
            `${sellZoneRetest.levelCount}-level stacked sell imbalance confirmed`,
            'Rejection off order flow supply zone',
            `Zone range: ${sellZoneRetest.bottomPrice} - ${sellZoneRetest.topPrice}`,
          ],
        });
      }

      // Signal 5: Multi-Bar CVD / Delta Bullish Divergence (3-bar lower low with higher CVD/Delta & bullish close)
      const minPrevLow = Math.min(prev.low, prev2.low);
      const minPrevDelta = Math.min(prev.totalDelta, prev2.totalDelta);
      if (
        curr.low < minPrevLow &&
        curr.close > curr.open &&
        curr.totalDelta > 0 &&
        minPrevDelta < 0 &&
        curr.cumDelta > Math.min(prev.cumDelta, prev2.cumDelta)
      ) {
        const inv = curr.low - range * 0.1;
        const entry = curr.close;
        const target = curr.close + (curr.close - inv) * 2.2;
        signals.push({
          id: `sig-bull-div-${curr.openTime}`,
          type: 'CVD_DIVERGENCE_BULL',
          title: 'Bullish CVD Divergence',
          isBullish: true,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry),
          invalidationPrice: roundSignalPrice(inv),
          targetPrice: roundSignalPrice(target),
          riskReward: 2.2,
          conditions: [
            'Price swept 3-bar low while CVD & bar delta flipped positive',
            'Seller exhaustion confirmed with bullish close recovery',
            `Bar Delta: +${curr.totalDelta.toLocaleString()}`,
          ],
        });
      }

      // Signal 6: Multi-Bar CVD / Delta Bearish Divergence (3-bar higher high with lower CVD/Delta & bearish close)
      const maxPrevHigh = Math.max(prev.high, prev2.high);
      const maxPrevDelta = Math.max(prev.totalDelta, prev2.totalDelta);
      if (
        curr.high > maxPrevHigh &&
        curr.close < curr.open &&
        curr.totalDelta < 0 &&
        maxPrevDelta > 0 &&
        curr.cumDelta < Math.max(prev.cumDelta, prev2.cumDelta)
      ) {
        const inv = curr.high + range * 0.1;
        const entry = curr.close;
        const target = curr.close - (inv - curr.close) * 2.2;
        signals.push({
          id: `sig-bear-div-${curr.openTime}`,
          type: 'CVD_DIVERGENCE_BEAR',
          title: 'Bearish CVD Divergence',
          isBullish: false,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry),
          invalidationPrice: roundSignalPrice(inv),
          targetPrice: roundSignalPrice(target),
          riskReward: 2.2,
          conditions: [
            'Price swept 3-bar high while CVD & bar delta turned negative',
            'Buyer exhaustion confirmed with bearish close rejection',
            `Bar Delta: ${curr.totalDelta.toLocaleString()}`,
          ],
        });
      }
    }
  }

  return {
    footprints,
    activeZones: activeZones.filter(z => !z.isMitigated || (z.mitigationIndex && z.mitigationIndex >= candles.length - 20)),
    signals: signals.slice(-15), // Keep latest 15 signals
    dataSource: config.dataSource,
    tickSizeUsed,
  };
}
