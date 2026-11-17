// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE AI (MI-007) — QUANTITATIVE ORDER FLOW FOOTPRINT ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Pure quantitative microstructure calculations:
// 1. Bid/Ask Classification (Lee-Ready Tick Rule + Exchange Aggressor Flags)
// 2. Footprint Calculation & Binning from Exchange Ticks or Inferred Microstructure
// 3. Delta (Ask Volume - Bid Volume) at each price level & candle
// 4. Cumulative Volume Delta (CVD) with NSE 09:15 IST / Daily Session Resets
// 5. Configurable Diagonal Bid/Ask Imbalance & Stacked Imbalance Zones
// 6. Volume Point of Control (POC)
// 7. Configurable Value Area (VAH, VAL, POC) using dual-expansion algorithm
// 8. True Passive Absorption (Displacement Efficiency & Aggressive Volume vs Resistance)
// 9. Exhaustion Detection (Declining aggressive activity at price extremes)
// 10. Volume Reconciliation against exchange-reported traded volume
// 11. NSE Trading Session & Timestamp Handling
// 12. Institutional Signal Generation with Entry, SL, TP, R:R
// ═══════════════════════════════════════════════════════════════════════════

import { Candle, getInstrumentDecimals } from '../types';
import {
  CandleFootprint,
  FootprintDataSource,
  FeedClassification,
  OrderFlowConfig,
  OrderFlowAnalysisResult,
  OrderFlowSignal,
  PriceLevelFootprint,
  StackedImbalanceZone,
  AbsorptionEvent,
  ExhaustionEvent,
  FootprintDataValidation,
  ExchangeTradeTick,
  AggressorSide,
  TradeClassificationMethod,
  DEFAULT_ORDER_FLOW_CONFIG,
} from './types';

// ── 1. NSE Session & IST Timestamp Handling ────────────────────────────────

export interface IstDateComponents {
  year: number;
  month: number;
  date: number;
  hours: number;
  minutes: number;
  dayOfWeek: number;
  dateKey: string; // YYYY-MM-DD
}

/**
 * Converts a Unix timestamp (ms) to Indian Standard Time (IST = UTC + 05:30) components.
 */
export function toIstDateComponents(timestampMs: number): IstDateComponents {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(timestampMs + istOffsetMs);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth() + 1;
  const date = istDate.getUTCDate();
  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  const dayOfWeek = istDate.getUTCDay();
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  return { year, month, date, hours, minutes, dayOfWeek, dateKey };
}

function getTimeZoneComponents(
  timestampMs: number,
  timeZone: string
): { dateKey: string; minuteOfDay: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(timestampMs));
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const hour = Number(map.hour ?? 0) % 24;
  const minute = Number(map.minute ?? 0);
  const dateKey = `${map.year}-${map.month}-${map.day}`;
  return { dateKey, minuteOfDay: hour * 60 + minute };
}

/**
 * Checks whether the current timestamp marks the start of a new market session
 * for the given market/timezone (fixing OF5: per-market CVD session reset).
 * - INDIA: Asia/Kolkata, 09:15 open
 * - USA: America/New_York, 09:30 open (handles EST/EDT DST automatically)
 * - UAE: Asia/Dubai, 10:00 open
 * - CRYPTO / FOREX / 24h continuous: UTC 00:00 daily boundary (no intrabar market-open reset)
 */
export function isNewMarketSession(
  currentTimestampMs: number,
  prevTimestampMs?: number,
  market: string = 'INDIA',
  isContinuous24h: boolean = false
): boolean {
  if (!prevTimestampMs) return true;

  const upperMarket = market.toUpperCase();
  if (isContinuous24h || upperMarket === 'CRYPTO' || upperMarket === 'FOREX' || upperMarket === 'FX') {
    const currUtc = new Date(currentTimestampMs).toISOString().slice(0, 10);
    const prevUtc = new Date(prevTimestampMs).toISOString().slice(0, 10);
    return currUtc !== prevUtc;
  }

  let timeZone = 'Asia/Kolkata';
  let openMinute = 9 * 60 + 15; // 09:15 IST
  if (upperMarket === 'USA' || upperMarket === 'US' || upperMarket === 'NASDAQ' || upperMarket === 'NYSE') {
    timeZone = 'America/New_York';
    openMinute = 9 * 60 + 30; // 09:30 ET
  } else if (upperMarket === 'UAE' || upperMarket === 'DFM' || upperMarket === 'ADX') {
    timeZone = 'Asia/Dubai';
    openMinute = 10 * 60; // 10:00 GST
  }

  const curr = getTimeZoneComponents(currentTimestampMs, timeZone);
  const prev = getTimeZoneComponents(prevTimestampMs, timeZone);

  if (curr.dateKey !== prev.dateKey) return true;
  if (prev.minuteOfDay < openMinute && curr.minuteOfDay >= openMinute) return true;
  if (currentTimestampMs - prevTimestampMs > 10 * 60 * 60 * 1000) return true;

  return false;
}

/**
 * Checks whether the current timestamp marks the start of a new NSE trading session.
 */
export function isNewNseSession(currentTimestampMs: number, prevTimestampMs?: number): boolean {
  return isNewMarketSession(currentTimestampMs, prevTimestampMs, 'INDIA', false);
}

// ── 2. Trade-Side Classification (Lee-Ready Algorithm) ──────────────────────

/**
 * Classifies an individual trade tick into aggressive BUY or aggressive SELL:
 * 1. Explicit exchange-reported aggressor flag (if provided).
 * 2. Quote Rule: Midpoint comparison when top-of-book Bid/Ask are present.
 * 3. Tick Rule: Price comparison with previous execution price (uptick/downtick).
 * 4. Zero-tick: Carry forward previous aggressor side.
 */
export function classifyTradeTick(
  tick: ExchangeTradeTick,
  prevPrice?: number,
  prevSide?: AggressorSide
): { side: AggressorSide; method: TradeClassificationMethod } {
  // 1. Explicit exchange-reported aggressor flag
  if (tick.side === 'BUY' || tick.side === 'SELL') {
    return { side: tick.side, method: 'EXCHANGE_FLAG' };
  }

  // 2. Quote Rule: Midpoint comparison when bid and ask are valid
  if (tick.bid !== undefined && tick.ask !== undefined && tick.ask > tick.bid) {
    const midpoint = (tick.bid + tick.ask) / 2;
    if (tick.price > midpoint) {
      return { side: 'BUY', method: 'QUOTE_MIDPOINT' };
    }
    if (tick.price < midpoint) {
      return { side: 'SELL', method: 'QUOTE_MIDPOINT' };
    }
  }

  // 3. Tick Rule (Lee & Ready, 1991)
  if (prevPrice !== undefined) {
    if (tick.price > prevPrice) {
      return { side: 'BUY', method: 'TICK_RULE' }; // Uptick = market buy lifted ask
    }
    if (tick.price < prevPrice) {
      return { side: 'SELL', method: 'TICK_RULE' }; // Downtick = market sell hit bid
    }
    if (prevSide) {
      return { side: prevSide, method: 'TICK_RULE' }; // Zero-tick = carry forward
    }
  }

  return { side: 'BUY', method: 'TICK_RULE' };
}

// ── 3. Adaptive Tick Size & Discretization ──────────────────────────────────

export function calculateAdaptiveTickSize(
  candles: Candle[],
  configTick: number | 'auto',
  symbol?: string
): number {
  if (typeof configTick === 'number' && configTick > 0) {
    return configTick;
  }
  if (!candles || candles.length === 0) return 1.0;

  const sample = candles.slice(-30);
  const lastPrice = sample[sample.length - 1]?.close || 1000;
  const decimals = getInstrumentDecimals(symbol || '', lastPrice);
  const minTick = Math.pow(10, -decimals);

  // Compute median positive candle range without clamping to 0.01 (fixing OF4 for FX)
  const ranges = sample
    .map(c => Math.max(0, c.high - c.low))
    .filter(r => r > 0)
    .sort((a, b) => a - b);
  const medianRange =
    ranges.length > 0 ? ranges[Math.floor(ranges.length / 2)] : Math.max(minTick * 10, Math.abs(lastPrice) * 0.002);

  // Target roughly 15 to 25 price slices per candle, snapped to clean 1 / 2 / 2.5 / 5 * 10^k
  const rawStep = Math.max(minTick, medianRange / 18);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let cleanFactor = 1;
  if (normalized >= 5) cleanFactor = 5;
  else if (normalized >= 2.5) cleanFactor = 2.5;
  else if (normalized >= 2) cleanFactor = 2;
  else if (normalized >= 1) cleanFactor = 1;

  const tick = +(cleanFactor * magnitude).toFixed(Math.min(8, decimals + 2));
  return Math.max(minTick, tick);
}

export function roundToTick(price: number, tickSize: number): number {
  if (tickSize <= 0) return price;
  const factor = 1 / tickSize;
  const decimals = Math.max(0, Math.min(8, Math.ceil(-Math.log10(tickSize)) + 1));
  return +(Math.round(price * factor) / factor).toFixed(decimals);
}

function roundSignalPrice(price: number, symbol?: string): number {
  const decimals = symbol
    ? getInstrumentDecimals(symbol, price)
    : Math.abs(price) > 0 && Math.abs(price) < 2
      ? 4
      : 2;
  return +price.toFixed(decimals);
}

// ── 4. Value Area Calculation (Configurable % via Dual Expansion) ───────────

/**
 * Institutional Market Profile / Steidlmayer Dual-Expansion Value Area:
 * 1. Starts at the POC (price level with highest traded volume).
 * 2. Compares the sum of the next 2 levels above vs the next 2 levels below.
 * 3. Expands on the higher-volume side until total VA volume reaches totalVolume * (valueAreaPct / 100).
 */
export function calculateValueArea(
  sortedAsc: PriceLevelFootprint[],
  pocPrice: number,
  totalVolume: number,
  valueAreaPct: number = 70
): { vahPrice: number; valPrice: number } {
  if (sortedAsc.length === 0) {
    return { vahPrice: pocPrice, valPrice: pocPrice };
  }

  const targetVaVol = totalVolume * (Math.max(10, Math.min(95, valueAreaPct)) / 100);
  const pocIdx = sortedAsc.findIndex(l => l.price === pocPrice);
  if (pocIdx < 0) {
    return { vahPrice: pocPrice, valPrice: pocPrice };
  }

  sortedAsc[pocIdx].isValueArea = true;
  let curVaVol = sortedAsc[pocIdx].totalVolume;
  let upIdx = pocIdx + 1;
  let downIdx = pocIdx - 1;

  let valPrice = pocPrice;
  let vahPrice = pocPrice;
  let upSteps = 0;
  let downSteps = 0;

  while (curVaVol < targetVaVol && (upIdx < sortedAsc.length || downIdx >= 0)) {
    const canUp = upIdx < sortedAsc.length;
    const canDown = downIdx >= 0;

    const up2Vol = canUp
      ? sortedAsc[upIdx].totalVolume + (upIdx + 1 < sortedAsc.length ? sortedAsc[upIdx + 1].totalVolume : 0)
      : -1;
    const down2Vol = canDown
      ? sortedAsc[downIdx].totalVolume + (downIdx - 1 >= 0 ? sortedAsc[downIdx - 1].totalVolume : 0)
      : -1;

    const chooseUp =
      canUp && (!canDown || up2Vol > down2Vol || (up2Vol === down2Vol && upSteps <= downSteps));

    if (chooseUp) {
      for (let step = 0; step < 2 && upIdx < sortedAsc.length && curVaVol < targetVaVol; step++) {
        curVaVol += sortedAsc[upIdx].totalVolume;
        sortedAsc[upIdx].isValueArea = true;
        vahPrice = sortedAsc[upIdx].price;
        upIdx++;
        upSteps++;
      }
    } else if (canDown) {
      for (let step = 0; step < 2 && downIdx >= 0 && curVaVol < targetVaVol; step++) {
        curVaVol += sortedAsc[downIdx].totalVolume;
        sortedAsc[downIdx].isValueArea = true;
        valPrice = sortedAsc[downIdx].price;
        downIdx--;
        downSteps++;
      }
    } else {
      break;
    }
  }

  return { vahPrice, valPrice };
}

// ── 5. Imbalances & Stacked Zones Detection ─────────────────────────────────

export function calculateDiagonalImbalances(
  sortedAsc: PriceLevelFootprint[],
  candleIndex: number,
  openTime: number,
  config: OrderFlowConfig,
  tickSize?: number
): {
  buyImbalances: number[];
  sellImbalances: number[];
  stackedZones: StackedImbalanceZone[];
} {
  const buyImbalances: number[] = [];
  const sellImbalances: number[] = [];

  // Infer tickSize from minimum positive price delta if not explicitly provided
  let effectiveTick = tickSize && tickSize > 0 ? tickSize : 0;
  if (effectiveTick === 0 && sortedAsc.length >= 2) {
    let minGap = Infinity;
    for (let i = 1; i < sortedAsc.length; i++) {
      const gap = sortedAsc[i].price - sortedAsc[i - 1].price;
      if (gap > 0 && gap < minGap) minGap = gap;
    }
    if (Number.isFinite(minGap)) effectiveTick = minGap;
  }

  const isAdjacentTick = (lowPrice: number, highPrice: number): boolean => {
    if (effectiveTick <= 0) return true;
    const diff = highPrice - lowPrice;
    return diff > 0 && diff <= effectiveTick * 1.25;
  };

  // Diagonal comparison across adjacent price ticks ONLY (fixing OF3 price-gap bug):
  // Buy imbalance at level p: Ask[p] >= Bid[p - tick] * ratio (including zero-bid sweep)
  // Sell imbalance at level p: Bid[p] >= Ask[p + tick] * ratio (including zero-ask sweep)
  for (let i = 0; i < sortedAsc.length; i++) {
    const curr = sortedAsc[i];

    if (i > 0) {
      const below = sortedAsc[i - 1];
      if (isAdjacentTick(below.price, curr.price) && curr.askVolume >= config.minImbalanceVolume) {
        const ratio = below.bidVolume === 0 ? 999.9 : +(curr.askVolume / below.bidVolume).toFixed(1);
        if (ratio >= config.imbalanceRatio) {
          curr.hasBuyImbalance = true;
          curr.buyImbalanceRatio = ratio;
          curr.imbalanceRatio = Math.max(curr.imbalanceRatio || 0, ratio);
          buyImbalances.push(curr.price);
        }
      }
    }

    if (i < sortedAsc.length - 1) {
      const above = sortedAsc[i + 1];
      if (isAdjacentTick(curr.price, above.price) && curr.bidVolume >= config.minImbalanceVolume) {
        const ratio = above.askVolume === 0 ? 999.9 : +(curr.bidVolume / above.askVolume).toFixed(1);
        if (ratio >= config.imbalanceRatio) {
          curr.hasSellImbalance = true;
          curr.sellImbalanceRatio = ratio;
          curr.imbalanceRatio = Math.max(curr.imbalanceRatio || 0, ratio);
          sellImbalances.push(curr.price);
        }
      }
    }
  }

  // Stacked Imbalance Zones (contiguous adjacent levels >= threshold)
  const stackedZones: StackedImbalanceZone[] = [];
  const levelByPrice = new Map<number, PriceLevelFootprint>();
  for (const lvl of sortedAsc) levelByPrice.set(lvl.price, lvl);

  const pushStackedZone = (streak: number[], isBuy: boolean) => {
    if (streak.length < config.stackedImbalanceThreshold) return;
    stackedZones.push({
      id: `stack-${isBuy ? 'buy' : 'sell'}-${candleIndex}-${streak[0]}`,
      startIndex: candleIndex,
      endIndex: candleIndex + 12,
      openTime,
      bottomPrice: streak[0],
      topPrice: streak[streak.length - 1],
      isBuy,
      levelCount: streak.length,
      totalVolume: streak.reduce((acc, p) => acc + (levelByPrice.get(p)?.totalVolume || 0), 0),
      isMitigated: false,
    });
  };

  let currentBuyStreak: number[] = [];
  let currentSellStreak: number[] = [];

  for (const lvl of sortedAsc) {
    if (lvl.hasBuyImbalance) {
      if (
        currentBuyStreak.length > 0 &&
        !isAdjacentTick(currentBuyStreak[currentBuyStreak.length - 1], lvl.price)
      ) {
        pushStackedZone(currentBuyStreak, true);
        currentBuyStreak = [];
      }
      currentBuyStreak.push(lvl.price);
    } else {
      pushStackedZone(currentBuyStreak, true);
      currentBuyStreak = [];
    }

    if (lvl.hasSellImbalance) {
      if (
        currentSellStreak.length > 0 &&
        !isAdjacentTick(currentSellStreak[currentSellStreak.length - 1], lvl.price)
      ) {
        pushStackedZone(currentSellStreak, false);
        currentSellStreak = [];
      }
      currentSellStreak.push(lvl.price);
    } else {
      pushStackedZone(currentSellStreak, false);
      currentSellStreak = [];
    }
  }

  pushStackedZone(currentBuyStreak, true);
  pushStackedZone(currentSellStreak, false);

  return { buyImbalances, sellImbalances, stackedZones };
}

// ── 6. True Absorption Detection ───────────────────────────────────────────
// Detects heavy aggressive order flow hitting a passive limit wall with limited price progress,
// followed by rejection away from the extreme.

export function detectAbsorption(
  candle: Candle,
  candleIndex: number,
  sortedAsc: PriceLevelFootprint[],
  totalVolume: number,
  effectiveTick: number
): AbsorptionEvent | null {
  if (sortedAsc.length === 0 || totalVolume <= 0) return null;

  const rawRange = Math.max(effectiveTick, candle.high - candle.low);
  const avgLevelVol = totalVolume / Math.max(1, sortedAsc.length);
  const lowestLevel = sortedAsc[0];
  const highestLevel = sortedAsc[sortedAsc.length - 1];

  // 1. Bullish Absorption at Candle Low:
  // Aggressive sellers hit the bid heavily at the low, but price displacement fails
  // and price closes well above the low (lower wick rejection + positive close recovery).
  if (lowestLevel) {
    const aggressiveSells = lowestLevel.bidVolume;
    // Price progress downward beyond lowest tick is essentially 0
    const priceDisplacement = Math.max(0.0001, candle.close - candle.low);
    const displacementRatio = +(priceDisplacement / (aggressiveSells + 1)).toFixed(4);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const isWickRejection = lowerWick >= rawRange * 0.35;
    const hasHeavyAggressiveSelling = aggressiveSells >= avgLevelVol * 1.5;
    const strongCloseRecovery = candle.close >= candle.low + rawRange * 0.45;

    if (hasHeavyAggressiveSelling && isWickRejection && strongCloseRecovery) {
      const absorptionRatio = +((aggressiveSells / avgLevelVol) * (lowerWick / rawRange) * 2.0).toFixed(2);
      return {
        candleIndex,
        time: candle.openTime,
        price: lowestLevel.price,
        isBullish: true,
        volume: lowestLevel.totalVolume,
        delta: lowestLevel.delta,
        aggressiveVolume: aggressiveSells,
        displacementRatio,
        absorptionRatio,
        description: `Passive limit buyers absorbed ${aggressiveSells.toLocaleString()} aggressive sells at low (Displacement Ratio: ${displacementRatio})`,
      };
    }
  }

  // 2. Bearish Absorption at Candle High:
  // Aggressive buyers lift the ask heavily at the high, but upward price displacement fails
  // and price closes well below the high (upper wick rejection + negative close rejection).
  if (highestLevel) {
    const aggressiveBuys = highestLevel.askVolume;
    const priceDisplacement = Math.max(0.0001, candle.high - candle.close);
    const displacementRatio = +(priceDisplacement / (aggressiveBuys + 1)).toFixed(4);
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const isWickRejection = upperWick >= rawRange * 0.35;
    const hasHeavyAggressiveBuying = aggressiveBuys >= avgLevelVol * 1.5;
    const strongCloseRejection = candle.close <= candle.high - rawRange * 0.45;

    if (hasHeavyAggressiveBuying && isWickRejection && strongCloseRejection) {
      const absorptionRatio = +((aggressiveBuys / avgLevelVol) * (upperWick / rawRange) * 2.0).toFixed(2);
      return {
        candleIndex,
        time: candle.openTime,
        price: highestLevel.price,
        isBullish: false,
        volume: highestLevel.totalVolume,
        delta: highestLevel.delta,
        aggressiveVolume: aggressiveBuys,
        displacementRatio,
        absorptionRatio,
        description: `Passive limit sellers absorbed ${aggressiveBuys.toLocaleString()} aggressive buys at high (Displacement Ratio: ${displacementRatio})`,
      };
    }
  }

  return null;
}

// ── 7. Exhaustion Detection ────────────────────────────────────────────────
// Detects evaporation / drying up of aggressive volume near price extremes.
// Unlike absorption (heavy aggressive volume blocked by passive wall), exhaustion
// is characterized by aggressive activity collapsing to near zero.

export function detectExhaustion(
  candle: Candle,
  candleIndex: number,
  sortedAsc: PriceLevelFootprint[],
  totalVolume: number,
  effectiveTick: number
): ExhaustionEvent | null {
  if (sortedAsc.length < 3 || totalVolume <= 0) return null;

  const rawRange = Math.max(effectiveTick, candle.high - candle.low);
  const avgLevelVol = totalVolume / sortedAsc.length;
  const lowestLevel = sortedAsc[0];
  const highestLevel = sortedAsc[sortedAsc.length - 1];

  // 1. Bullish Exhaustion (Sellers Exhausted at Low):
  // Unit-independent proportional threshold (<= 12% of bar average) + both wick & close rejection
  if (lowestLevel && avgLevelVol > 0 && lowestLevel.bidVolume <= avgLevelVol * 0.12) {
    const volumeDropPct = Math.round((1 - lowestLevel.bidVolume / avgLevelVol) * 100);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    if (candle.close > candle.low + rawRange * 0.40 && lowerWick >= rawRange * 0.30) {
      return {
        candleIndex,
        time: candle.openTime,
        price: lowestLevel.price,
        isBullish: true,
        extremeVolume: lowestLevel.totalVolume,
        avgLevelVolume: +avgLevelVol.toFixed(2),
        volumeDropPct,
        description: `Aggressive selling dried up at candle low (${lowestLevel.bidVolume} sells, ${volumeDropPct}% below bar average)`,
      };
    }
  }

  // 2. Bearish Exhaustion (Buyers Exhausted at High):
  // Unit-independent proportional threshold (<= 12% of bar average) + both wick & close rejection
  if (highestLevel && avgLevelVol > 0 && highestLevel.askVolume <= avgLevelVol * 0.12) {
    const volumeDropPct = Math.round((1 - highestLevel.askVolume / avgLevelVol) * 100);
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    if (candle.close < candle.high - rawRange * 0.40 && upperWick >= rawRange * 0.30) {
      return {
        candleIndex,
        time: candle.openTime,
        price: highestLevel.price,
        isBullish: false,
        extremeVolume: highestLevel.totalVolume,
        avgLevelVolume: +avgLevelVol.toFixed(2),
        volumeDropPct,
        description: `Aggressive buying dried up at candle high (${highestLevel.askVolume} buys, ${volumeDropPct}% below bar average)`,
      };
    }
  }

  return null;
}

// ── 8. Footprint from Verified Exchange Ticks ──────────────────────────────

export function buildFootprintFromTicks(
  candle: Candle,
  candleIndex: number,
  ticks: ExchangeTradeTick[],
  tickSize: number,
  cumDeltaPrev: number,
  config: OrderFlowConfig,
  isNewSession: boolean = false
): CandleFootprint {
  const effectiveTick = tickSize;
  const levels = new Map<number, PriceLevelFootprint>();

  let prevPrice: number | undefined;
  let prevSide: AggressorSide | undefined;
  let tickTotalVolume = 0;
  let runningDelta = 0;
  let minDelta = 0;
  let maxDelta = 0;
  let exchangeAggressorCount = 0;

  for (const tick of ticks) {
    const priceTick = roundToTick(tick.price, effectiveTick);
    const { side, method } = classifyTradeTick(tick, prevPrice, prevSide);
    if (method === 'EXCHANGE_FLAG' || method === 'QUOTE_MIDPOINT') {
      exchangeAggressorCount++;
    }

    let lvl = levels.get(priceTick);
    if (!lvl) {
      lvl = {
        price: priceTick,
        bidVolume: 0,
        askVolume: 0,
        totalVolume: 0,
        delta: 0,
        hasBuyImbalance: false,
        hasSellImbalance: false,
        imbalanceRatio: 1.0,
        isPoc: false,
        isValueArea: false,
      };
      levels.set(priceTick, lvl);
    }

    if (side === 'BUY') {
      lvl.askVolume += tick.volume;
    } else {
      lvl.bidVolume += tick.volume;
    }

    lvl.totalVolume = lvl.bidVolume + lvl.askVolume;
    lvl.delta = lvl.askVolume - lvl.bidVolume;
    tickTotalVolume += tick.volume;

    const deltaChange = side === 'BUY' ? tick.volume : -tick.volume;
    runningDelta += deltaChange;
    if (runningDelta < minDelta) minDelta = runningDelta;
    if (runningDelta > maxDelta) maxDelta = runningDelta;

    prevPrice = tick.price;
    prevSide = side;
  }

  // Volume Reconciliation & Exchange Aggressor Verification (fixing OF1)
  const reportedVolume = candle.volume || tickTotalVolume;
  const discrepancy = Math.abs(tickTotalVolume - reportedVolume);
  const discrepancyPct = reportedVolume > 0 ? (discrepancy / reportedVolume) * 100 : 0;
  const reconciled = reportedVolume > 0 ? discrepancyPct <= 5 : discrepancy === 0;
  const hasExchangeAggressorData = ticks.length > 0 && exchangeAggressorCount >= ticks.length * 0.5;
  const classification: FeedClassification =
    hasExchangeAggressorData && reconciled ? 'VERIFIED_EXCHANGE_DATA' : 'INFERRED_ESTIMATE';

  const validation: FootprintDataValidation = {
    reconciled,
    exchangeVolume: reportedVolume,
    footprintVolume: tickTotalVolume,
    discrepancy,
    discrepancyPct: +discrepancyPct.toFixed(2),
    classification,
  };

  const sortedAsc = Array.from(levels.values()).sort((a, b) => a.price - b.price);

  // Identify POC
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

  // Value Area calculation
  const { vahPrice, valPrice } = calculateValueArea(sortedAsc, pocPrice, tickTotalVolume, config.valueAreaPct);

  // Diagonal imbalances & stacked zones
  const { buyImbalances, sellImbalances, stackedZones } = calculateDiagonalImbalances(
    sortedAsc,
    candleIndex,
    candle.openTime,
    config,
    effectiveTick
  );

  // Absorption & Exhaustion
  const absorption = detectAbsorption(candle, candleIndex, sortedAsc, tickTotalVolume, effectiveTick);
  const exhaustion = detectExhaustion(candle, candleIndex, sortedAsc, tickTotalVolume, effectiveTick);

  // Cumulative Delta with Session Reset
  const cumDelta = isNewSession && config.sessionReset === 'DAILY'
    ? runningDelta
    : cumDeltaPrev + runningDelta;

  const istDate = toIstDateComponents(candle.openTime);

  // Unfinished Business check
  const highestLevel = sortedAsc[sortedAsc.length - 1];
  const lowestLevel = sortedAsc[0];
  const rawRange = Math.max(effectiveTick, candle.high - candle.low);
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;

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

  const sortedLevels = [...sortedAsc].reverse();

  return {
    candleIndex,
    openTime: candle.openTime,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    totalVolume: tickTotalVolume,
    totalDelta: runningDelta,
    minDelta,
    maxDelta,
    cumDelta,
    pocPrice,
    vahPrice,
    valPrice,
    levels,
    sortedLevels,
    buyImbalancePrices: buyImbalances,
    sellImbalancePrices: sellImbalances,
    stackedZones,
    absorption,
    exhaustion,
    validation,
    isNewSession,
    sessionDate: istDate.dateKey,
    classification,
    unfinishedBusiness,
  };
}

// ── 9. Microstructure Footprint for Inferred / OHLCV Feeds ─────────────────
// When verified exchange trade-level ticks are unavailable, this accurately distributes
// volume across price slices using deterministic Close Location Value (CLV) and Gaussian profiling.
// CRITICAL: Explicitly classified as INFERRED_ESTIMATE per quantitative audit requirements.

export function generateMicrostructureFootprint(
  candle: Candle,
  candleIndex: number,
  tickSize: number,
  cumDeltaPrev: number,
  config: OrderFlowConfig,
  isNewSession: boolean = false
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

  // Approximate typical price for volume Gaussian curve
  const typicalPrice = (candle.high + candle.low + candle.close) / 3;
  const range = Math.max(effectiveTick, candle.high - candle.low);

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

  // Deterministic PRNG seeded by candle openTime + open (NOT close)
  let seed = ((candle.openTime % 1000000) ^ (candleIndex * 7919) ^ Math.round(candle.open * 100)) >>> 0;
  function pseudoRand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 8) / 16777216;
  }

  let totalWeightSum = 0;
  const rawVols: { price: number; weight: number }[] = [];

  for (const p of levelPrices) {
    const dist = Math.abs(p - typicalPrice) / (range * 0.45);
    const gaussian = Math.exp(-0.5 * dist * dist);
    const noise = 0.75 + 0.5 * pseudoRand();
    const weight = Math.max(0.05, gaussian * noise);
    rawVols.push({ price: p, weight });
    totalWeightSum += weight;
  }

  const reportedVolume = Math.max(candle.volume || 0, levelPrices.length * 2);
  let accumulatedVol = 0;
  let runningDelta = 0;
  let minDelta = 0;
  let maxDelta = 0;

  // Close Location Value (CLV) anchors directional delta deterministically to bar structure
  const clv = rawRange > 0 ? ((candle.close - candle.low) - (candle.high - candle.close)) / rawRange : 0;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;

  // Distribute volume with exact reconciliation to candle.volume
  for (let idx = 0; idx < rawVols.length; idx++) {
    const { price, weight } = rawVols[idx];
    let levelVol = Math.max(1, Math.round((weight / totalWeightSum) * reportedVolume));

    // Reconcile residue on the last level to match candle volume exactly
    if (idx === rawVols.length - 1) {
      const remaining = reportedVolume - accumulatedVol;
      if (remaining > 0) {
        levelVol = remaining;
      }
    }
    accumulatedVol += levelVol;

    const relPos = range > 0 ? (price - candle.low) / range : 0.5;
    let buyRatio = 0.5 + 0.22 * clv + 0.15 * (relPos - 0.5) * (isBull ? 1 : -1) + (pseudoRand() - 0.5) * 0.10;

    // Trapped aggressive orders at wicks
    if (relPos > 0.85 && upperWick >= rawRange * 0.35) {
      buyRatio = 0.70;
    }
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

  // Exact volume reconciliation
  const discrepancy = Math.abs(accumulatedVol - reportedVolume);
  const validation: FootprintDataValidation = {
    reconciled: discrepancy === 0,
    exchangeVolume: reportedVolume,
    footprintVolume: accumulatedVol,
    discrepancy,
    discrepancyPct: reportedVolume > 0 ? (discrepancy / reportedVolume) * 100 : 0,
    classification: 'INFERRED_ESTIMATE',
  };

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

  // 2. Identify Value Area using Configurable %
  const { vahPrice, valPrice } = calculateValueArea(sortedAsc, pocPrice, accumulatedVol, config.valueAreaPct);

  // 3. Diagonal Imbalances & Stacked Zones
  const { buyImbalances, sellImbalances, stackedZones } = calculateDiagonalImbalances(
    sortedAsc,
    candleIndex,
    candle.openTime,
    config,
    effectiveTick
  );

  // 4. True Absorption & Exhaustion
  const absorption = detectAbsorption(candle, candleIndex, sortedAsc, accumulatedVol, effectiveTick);
  const exhaustion = detectExhaustion(candle, candleIndex, sortedAsc, accumulatedVol, effectiveTick);

  // 5. Cumulative Delta with Session Reset
  const cumDelta = isNewSession && config.sessionReset === 'DAILY'
    ? runningDelta
    : cumDeltaPrev + runningDelta;

  const istDate = toIstDateComponents(candle.openTime);

  // 6. Unfinished Business
  const highestLevel = sortedAsc[sortedAsc.length - 1];
  const lowestLevel = sortedAsc[0];
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
    cumDelta,
    pocPrice,
    vahPrice,
    valPrice,
    levels,
    sortedLevels,
    buyImbalancePrices: buyImbalances,
    sellImbalancePrices: sellImbalances,
    stackedZones,
    absorption,
    exhaustion,
    validation,
    isNewSession,
    sessionDate: istDate.dateKey,
    classification: 'INFERRED_ESTIMATE',
    unfinishedBusiness,
  };
}

// ── 10. Master Order Flow Analyzer ─────────────────────────────────────────

export function analyzeOrderFlow(
  candles: Candle[],
  config: OrderFlowConfig = DEFAULT_ORDER_FLOW_CONFIG,
  ticksPerCandle?: Map<number, ExchangeTradeTick[]>,
  symbol?: string,
  market?: string
): OrderFlowAnalysisResult {
  if (!candles || candles.length === 0) {
    return {
      footprints: [],
      activeZones: [],
      signals: [],
      dataSource: config.dataSource,
      tickSizeUsed: 1.0,
      feedClassification: 'INFERRED_ESTIMATE',
    };
  }

  const tickSizeUsed = calculateAdaptiveTickSize(candles, config.tickSize, symbol);
  const footprints: CandleFootprint[] = [];
  const activeZones: StackedImbalanceZone[] = [];
  const signals: OrderFlowSignal[] = [];

  let verifiedCandleCount = 0;

  // Process all candles with per-market session boundary awareness (fixing OF5)
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const prevC = i > 0 ? candles[i - 1] : undefined;
    const isNewSession = isNewMarketSession(c.openTime, prevC?.openTime, market || 'INDIA');

    const prevCum = footprints.length > 0 ? footprints[footprints.length - 1].cumDelta : 0;
    const ticksForCandle = ticksPerCandle?.get(c.openTime);

    let fp: CandleFootprint;
    if (ticksForCandle && ticksForCandle.length > 0) {
      fp = buildFootprintFromTicks(c, i, ticksForCandle, tickSizeUsed, prevCum, config, isNewSession);
      if (fp.classification === 'VERIFIED_EXCHANGE_DATA') {
        verifiedCandleCount++;
      }
    } else {
      fp = generateMicrostructureFootprint(c, i, tickSizeUsed, prevCum, config, isNewSession);
    }

    footprints.push(fp);

    // Collect stacked zones
    for (const z of fp.stackedZones) {
      z.endIndex = Math.min(candles.length - 1, z.endIndex);
      activeZones.push(z);
    }
  }

  // Only label the chart VERIFIED_EXCHANGE_DATA if >= 50% of bars have verified exchange aggressor ticks (fixing OF1)
  const overallFeedClassification: FeedClassification =
    verifiedCandleCount > 0 && verifiedCandleCount >= Math.ceil(footprints.length * 0.5)
      ? 'VERIFIED_EXCHANGE_DATA'
      : 'INFERRED_ESTIMATE';

  // Update mitigation status of active zones
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

  // Precompute 14-bar ATR for volatility-normalized stop placement (fixing OF7)
  const atrByIdx: number[] = new Array(candles.length).fill(0);
  for (let i = 0; i < candles.length; i++) {
    const tr =
      i === 0
        ? candles[0].high - candles[0].low
        : Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i - 1].close),
            Math.abs(candles[i].low - candles[i - 1].close)
          );
    atrByIdx[i] = i === 0 ? tr : i < 14 ? (atrByIdx[i - 1] * i + tr) / (i + 1) : (atrByIdx[i - 1] * 13 + tr) / 14;
  }

  // ── 11. Institutional Signal Generation ──────────────────────────────────
  // Gated strictly to closed bars with verified exchange aggressor data (fixing OF2 & OF7)
  if (config.showSignals && footprints.length >= 5) {
    for (let i = 3; i < footprints.length; i++) {
      if (candles[i]?.isClosed === false) continue;
      const curr = footprints[i];
      if (curr.classification !== 'VERIFIED_EXCHANGE_DATA') continue;

      const prev = footprints[i - 1];
      const prev2 = footprints[i - 2];
      const atrPad = Math.max(tickSizeUsed * 2, atrByIdx[i] * 0.5);
      const rrRatio = 2.0;

      // Signal 1: Bullish Absorption (Aggressive sellers absorbed by passive limit buyers)
      if (config.showAbsorption && curr.absorption && curr.absorption.isBullish) {
        const inv = curr.low - atrPad;
        const entry = curr.close;
        const target = curr.close + (curr.close - inv) * rrRatio;
        signals.push({
          id: `sig-bull-abs-${curr.openTime}`,
          type: 'BULLISH_ABSORPTION',
          title: 'Bullish Passive Absorption',
          isBullish: true,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry, symbol),
          invalidationPrice: roundSignalPrice(inv, symbol),
          targetPrice: roundSignalPrice(target, symbol),
          riskReward: rrRatio,
          conditions: [
            `Aggressive sells absorbed: ${curr.absorption.aggressiveVolume.toLocaleString()}`,
            `Price displacement ratio: ${curr.absorption.displacementRatio} (low displacement under heavy volume)`,
            `Absorption metric score: ${curr.absorption.absorptionRatio}×`,
            `POC anchored at ${curr.pocPrice}`,
          ],
        });
      }

      // Signal 2: Bearish Absorption (Aggressive buyers absorbed by passive limit sellers)
      if (config.showAbsorption && curr.absorption && !curr.absorption.isBullish) {
        const inv = curr.high + atrPad;
        const entry = curr.close;
        const target = curr.close - (inv - curr.close) * rrRatio;
        signals.push({
          id: `sig-bear-abs-${curr.openTime}`,
          type: 'BEARISH_ABSORPTION',
          title: 'Bearish Passive Absorption',
          isBullish: false,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry, symbol),
          invalidationPrice: roundSignalPrice(inv, symbol),
          targetPrice: roundSignalPrice(target, symbol),
          riskReward: rrRatio,
          conditions: [
            `Aggressive buys absorbed: ${curr.absorption.aggressiveVolume.toLocaleString()}`,
            `Price displacement ratio: ${curr.absorption.displacementRatio} (ceiling hit under heavy volume)`,
            `Absorption metric score: ${curr.absorption.absorptionRatio}×`,
            `POC anchored at ${curr.pocPrice}`,
          ],
        });
      }

      // Signal 3: Bullish Exhaustion (Aggressive sellers drying up at candle low)
      if (config.showExhaustion && curr.exhaustion && curr.exhaustion.isBullish) {
        const inv = curr.low - atrPad;
        const entry = curr.close;
        const target = curr.close + (curr.close - inv) * rrRatio;
        signals.push({
          id: `sig-bull-exh-${curr.openTime}`,
          type: 'BULLISH_EXHAUSTION',
          title: 'Seller Exhaustion Setup',
          isBullish: true,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry, symbol),
          invalidationPrice: roundSignalPrice(inv, symbol),
          targetPrice: roundSignalPrice(target, symbol),
          riskReward: rrRatio,
          conditions: [
            `Extreme low aggressive volume dried up (${curr.exhaustion.volumeDropPct}% below bar avg)`,
            'Zero or minimal market seller participation at low',
            'Strong reversal close above low',
          ],
        });
      }

      // Signal 4: Bearish Exhaustion (Aggressive buyers drying up at candle high)
      if (config.showExhaustion && curr.exhaustion && !curr.exhaustion.isBullish) {
        const inv = curr.high + atrPad;
        const entry = curr.close;
        const target = curr.close - (inv - curr.close) * rrRatio;
        signals.push({
          id: `sig-bear-exh-${curr.openTime}`,
          type: 'BEARISH_EXHAUSTION',
          title: 'Buyer Exhaustion Setup',
          isBullish: false,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry, symbol),
          invalidationPrice: roundSignalPrice(inv, symbol),
          targetPrice: roundSignalPrice(target, symbol),
          riskReward: rrRatio,
          conditions: [
            `Extreme high aggressive volume dried up (${curr.exhaustion.volumeDropPct}% below bar avg)`,
            'Zero or minimal market buyer participation at high',
            'Rejection close below high',
          ],
        });
      }

      // Signal 5: Stacked Buy Imbalance Retest
      const buyZoneRetest = buyZonesByMitigation.get(i);
      if (buyZoneRetest && curr.close > curr.open) {
        const inv = buyZoneRetest.bottomPrice - atrPad;
        const entry = curr.close;
        const target = curr.close + (curr.close - inv) * rrRatio;
        signals.push({
          id: `sig-bull-stack-${curr.openTime}`,
          type: 'BULLISH_STACKED_IMBALANCE',
          title: 'Stacked Imbalance Support Bounce',
          isBullish: true,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry, symbol),
          invalidationPrice: roundSignalPrice(inv, symbol),
          targetPrice: roundSignalPrice(target, symbol),
          riskReward: rrRatio,
          conditions: [
            `${buyZoneRetest.levelCount}-level stacked buy imbalance confirmed`,
            'Clean test and buyer response off order flow demand zone',
            `Zone range: ${buyZoneRetest.bottomPrice} - ${buyZoneRetest.topPrice}`,
          ],
        });
      }

      // Signal 6: Stacked Sell Imbalance Retest
      const sellZoneRetest = sellZonesByMitigation.get(i);
      if (sellZoneRetest && curr.close < curr.open) {
        const inv = sellZoneRetest.topPrice + atrPad;
        const entry = curr.close;
        const target = curr.close - (inv - curr.close) * rrRatio;
        signals.push({
          id: `sig-bear-stack-${curr.openTime}`,
          type: 'BEARISH_STACKED_IMBALANCE',
          title: 'Stacked Imbalance Resistance Rejection',
          isBullish: false,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry, symbol),
          invalidationPrice: roundSignalPrice(inv, symbol),
          targetPrice: roundSignalPrice(target, symbol),
          riskReward: rrRatio,
          conditions: [
            `${sellZoneRetest.levelCount}-level stacked sell imbalance confirmed`,
            'Rejection off order flow supply zone',
            `Zone range: ${sellZoneRetest.bottomPrice} - ${sellZoneRetest.topPrice}`,
          ],
        });
      }

      // Signal 7: Multi-Bar CVD Bullish Divergence
      const minPrevLow = Math.min(prev.low, prev2.low);
      const minPrevDelta = Math.min(prev.totalDelta, prev2.totalDelta);
      if (
        curr.low < minPrevLow &&
        curr.close > curr.open &&
        curr.totalDelta > 0 &&
        minPrevDelta < 0 &&
        curr.cumDelta > Math.min(prev.cumDelta, prev2.cumDelta)
      ) {
        const inv = curr.low - atrPad;
        const entry = curr.close;
        const target = curr.close + (curr.close - inv) * rrRatio;
        signals.push({
          id: `sig-bull-div-${curr.openTime}`,
          type: 'CVD_DIVERGENCE_BULL',
          title: 'Bullish CVD Divergence',
          isBullish: true,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry, symbol),
          invalidationPrice: roundSignalPrice(inv, symbol),
          targetPrice: roundSignalPrice(target, symbol),
          riskReward: rrRatio,
          conditions: [
            'Price swept 3-bar low while CVD & bar delta flipped positive',
            'Seller exhaustion confirmed with bullish close recovery',
            `Bar Delta: +${curr.totalDelta.toLocaleString()}`,
          ],
        });
      }

      // Signal 8: Multi-Bar CVD Bearish Divergence
      const maxPrevHigh = Math.max(prev.high, prev2.high);
      const maxPrevDelta = Math.max(prev.totalDelta, prev2.totalDelta);
      if (
        curr.high > maxPrevHigh &&
        curr.close < curr.open &&
        curr.totalDelta < 0 &&
        maxPrevDelta > 0 &&
        curr.cumDelta < Math.max(prev.cumDelta, prev2.cumDelta)
      ) {
        const inv = curr.high + atrPad;
        const entry = curr.close;
        const target = curr.close - (inv - curr.close) * rrRatio;
        signals.push({
          id: `sig-bear-div-${curr.openTime}`,
          type: 'CVD_DIVERGENCE_BEAR',
          title: 'Bearish CVD Divergence',
          isBullish: false,
          candleIndex: i,
          time: curr.openTime,
          price: curr.close,
          entryPrice: roundSignalPrice(entry, symbol),
          invalidationPrice: roundSignalPrice(inv, symbol),
          targetPrice: roundSignalPrice(target, symbol),
          riskReward: rrRatio,
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
    signals: signals.slice(-20), // Keep latest 20 signals
    dataSource: overallFeedClassification === 'VERIFIED_EXCHANGE_DATA' ? 'VERIFIED_L2' : 'INFERRED_MICROSTRUCTURE',
    tickSizeUsed,
    feedClassification: overallFeedClassification,
  };
}
