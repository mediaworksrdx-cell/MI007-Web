// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE AI (MI-007) — SHARED SMART MONEY CONCEPTS (SMC) ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Pure quantitative SMC calculation engine used identically by:
// 1. Candlestick Canvas Overlays (Chart Mode)
// 2. Screener SMC Institutional Scanner
//
// Features:
// - Deterministic Swing Detection (HH, HL, LH, LL) with configurable pivot bars
// - Market Structure Breaks (BOS continuation vs CHoCH / MSS reversal)
// - Liquidity Framework (BSL, SSL, Equal Highs EQH, Equal Lows EQL, Sweeps)
// - Order Blocks (Demand / Supply) & Breaker Blocks with Volume validation
// - Fair Value Gaps (FVG) with Consequent Encroachment (50% CE) & Fill Tracking
// - Dealing Range (Equilibrium 50%, Premium > 50%, Discount < 50%, OTE 61.8-78.6%)
// - Historical Session Levels (PDH, PDL, PWH, PWL)
// - High-Probability Setup Detection with Stop Loss & Take Profit targets
// ═══════════════════════════════════════════════════════════════════════════

import { Candle } from './types';

// ── Types & Configuration ──────────────────────────────────────────────────

export type SmcSwingType = 'HH' | 'HL' | 'LH' | 'LL';

export interface SmcSwingPoint {
  index: number;
  time: number;
  price: number;
  type: SmcSwingType;
  isHigh: boolean;
}

export type SmcBreakType = 'BOS' | 'CHoCH' | 'MSS';

export interface SmcStructureBreak {
  candleIndex: number;
  time: number;
  price: number;
  isBullish: boolean;
  type: string; // 'BOS ↑' | 'BOS ↓' | 'CHoCH ↑' | 'CHoCH ↓'
  breakType: SmcBreakType;
  swingIndex: number;
  brokenSwingPrice: number;
}

export interface SmcLiquidityLevel {
  id: string;
  price: number;
  type: 'BSL' | 'SSL' | 'EQH' | 'EQL';
  label: string;
  candleIndices: number[];
  isSwept: boolean;
  sweepCandleIndex?: number;
}

export interface SmcLiquiditySweep {
  candleIndex: number;
  time: number;
  price: number;
  isHighSweep: boolean;
  label: string;
  sweptLevelPrice: number;
}

export interface SmcOrderBlock {
  id: string;
  startIndex: number;
  endIndex: number;
  topPrice: number;
  bottomPrice: number;
  isBullish: boolean;
  isBreaker: boolean;
  isMitigated: boolean;
  mitigationIndex?: number;
  volumeRatio: number;
  label: string;
}

export interface SmcFvg {
  id: string;
  startIndex: number;
  endIndex: number;
  topPrice: number;
  bottomPrice: number;
  cePrice: number; // Consequent Encroachment (50% Midline)
  isBullish: boolean;
  isMitigated: boolean;
  mitigationIndex?: number;
  mitigationPercent: number; // 0 to 100%
}

export interface SmcDealingRange {
  highPrice: number;
  lowPrice: number;
  equilibriumPrice: number;
  premiumRange: [number, number]; // [50%, 100%]
  discountRange: [number, number]; // [0%, 50%]
  oteRange: [number, number]; // [61.8%, 78.6%]
}

export interface SmcSessionLevels {
  pdh?: number; // Previous Day High
  pdl?: number; // Previous Day Low
  pwh?: number; // Previous Week High
  pwl?: number; // Previous Week Low
}

export type SmcSetupType =
  | 'CHOCH_REVERSAL'
  | 'BOS_CONTINUATION'
  | 'OB_RETEST'
  | 'FVG_TAP'
  | 'LIQUIDITY_SWEEP'
  | 'BREAKER_RETEST';

export interface SmcConfirmedSetup {
  id: string;
  name: string;
  setupType: SmcSetupType;
  direction: 'BULLISH' | 'BEARISH';
  candleIndex: number;
  time: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  riskReward: number;
  status: 'CONFIRMED' | 'RETESTING' | 'PENDING';
  description: string;
}

export interface SmcAnalysis {
  swings: SmcSwingPoint[];
  structureBreaks: SmcStructureBreak[];
  liquidityLevels: SmcLiquidityLevel[];
  sweeps: SmcLiquiditySweep[];
  orderBlocks: SmcOrderBlock[];
  breakers: SmcOrderBlock[];
  fvgs: SmcFvg[];
  dealingRange: SmcDealingRange;
  sessionLevels: SmcSessionLevels;
  confirmedSetups: SmcConfirmedSetup[];
  equilibriumPrice: number;
}

export interface SmcConfig {
  enabled: boolean;
  // Market Structure
  showBos: boolean;
  showChoch: boolean;
  showSwings: boolean;
  // Liquidity
  showSweeps: boolean;
  showEqualHighLow: boolean;
  showLiquidityLevels: boolean;
  // Order Blocks
  showBullishOb: boolean;
  showBearishOb: boolean;
  showBreakers: boolean;
  showMitigatedOb: boolean;
  // Fair Value Gaps
  showBullishFvg: boolean;
  showBearishFvg: boolean;
  showFvgMidpoint: boolean;
  showMitigatedFvg: boolean;
  // Premium / Discount
  showPremiumDiscount: boolean;
  showEquilibrium: boolean;
  showOte: boolean;
  // Session & Key Levels
  showPdhPdl: boolean;
  showPwhPwl: boolean;
  // Display limits
  maxVisibleZones?: number;
}

export const DEFAULT_SMC_CONFIG: SmcConfig = {
  enabled: true,
  showBos: true,
  showChoch: true,
  showSwings: true,
  showSweeps: true,
  showEqualHighLow: true,
  showLiquidityLevels: true,
  showBullishOb: true,
  showBearishOb: true,
  showBreakers: true,
  showMitigatedOb: false,
  showBullishFvg: true,
  showBearishFvg: true,
  showFvgMidpoint: true,
  showMitigatedFvg: false,
  showPremiumDiscount: true,
  showEquilibrium: true,
  showOte: true,
  showPdhPdl: true,
  showPwhPwl: false,
  maxVisibleZones: 15,
};

const SMC_STORAGE_KEY = 'mi007_smc_config';

export function getStoredSmcConfig(): SmcConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_SMC_CONFIG };
  try {
    const raw = localStorage.getItem(SMC_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SMC_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SMC_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_SMC_CONFIG };
  }
}

export function saveStoredSmcConfig(cfg: SmcConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SMC_STORAGE_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.error('Failed to save SMC config:', err);
  }
}

// ── 1. Swing Points Detection (HH, HL, LH, LL) ─────────────────────────────

export function detectSwingPoints(candles: Candle[], lookback = 3): SmcSwingPoint[] {
  const swings: SmcSwingPoint[] = [];
  if (candles.length < lookback * 2 + 1) return swings;

  let lastSwingHigh: SmcSwingPoint | null = null;
  let lastSwingLow: SmcSwingPoint | null = null;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const cur = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high > cur.high) isHigh = false;
      if (candles[j].low < cur.low) isLow = false;
    }

    if (isHigh) {
      const type: SmcSwingType =
        !lastSwingHigh || cur.high >= lastSwingHigh.price ? 'HH' : 'LH';
      const pt: SmcSwingPoint = {
        index: i,
        time: cur.openTime,
        price: cur.high,
        type,
        isHigh: true,
      };
      swings.push(pt);
      lastSwingHigh = pt;
    }

    if (isLow) {
      const type: SmcSwingType =
        !lastSwingLow || cur.low <= lastSwingLow.price ? 'LL' : 'HL';
      const pt: SmcSwingPoint = {
        index: i,
        time: cur.openTime,
        price: cur.low,
        type,
        isHigh: false,
      };
      swings.push(pt);
      lastSwingLow = pt;
    }
  }

  return swings;
}

// ── 2. Market Structure Breaks (BOS vs CHoCH / MSS) ─────────────────────────

export function detectStructureBreaks(
  candles: Candle[],
  swings: SmcSwingPoint[]
): SmcStructureBreak[] {
  const breaks: SmcStructureBreak[] = [];
  if (candles.length < 5 || swings.length < 2) return breaks;

  // Track prevailing trend: 1 = Bullish, -1 = Bearish, 0 = Undefined
  let trendDirection = 0;
  let activeHigh: SmcSwingPoint | null = null;
  let activeLow: SmcSwingPoint | null = null;
  let swingPtr = 0;

  for (let i = 0; i < candles.length; i++) {
    // Add swing points that became confirmed by bar i
    while (swingPtr < swings.length && swings[swingPtr].index + 3 <= i) {
      const sw = swings[swingPtr];
      if (sw.isHigh) {
        activeHigh = sw;
      } else {
        activeLow = sw;
      }
      swingPtr++;
    }

    const cur = candles[i];
    const prev = i > 0 ? candles[i - 1] : cur;

    // Break Above Active High
    if (activeHigh && cur.close > activeHigh.price && prev.close <= activeHigh.price) {
      const isReversal = trendDirection === -1;
      const breakType: SmcBreakType = isReversal ? 'CHoCH' : 'BOS';
      const label = `${breakType} ↑`;

      breaks.push({
        candleIndex: i,
        time: cur.openTime,
        price: activeHigh.price,
        isBullish: true,
        type: label,
        breakType,
        swingIndex: activeHigh.index,
        brokenSwingPrice: activeHigh.price,
      });

      trendDirection = 1;
      activeHigh = null; // Level breached
    }

    // Break Below Active Low
    if (activeLow && cur.close < activeLow.price && prev.close >= activeLow.price) {
      const isReversal = trendDirection === 1;
      const breakType: SmcBreakType = isReversal ? 'CHoCH' : 'BOS';
      const label = `${breakType} ↓`;

      breaks.push({
        candleIndex: i,
        time: cur.openTime,
        price: activeLow.price,
        isBullish: false,
        type: label,
        breakType,
        swingIndex: activeLow.index,
        brokenSwingPrice: activeLow.price,
      });

      trendDirection = -1;
      activeLow = null; // Level breached
    }
  }

  return breaks;
}

// ── 3. Liquidity Levels & Sweeps (BSL, SSL, EQH, EQL) ───────────────────────

export function detectLiquidity(
  candles: Candle[],
  swings: SmcSwingPoint[]
): { levels: SmcLiquidityLevel[]; sweeps: SmcLiquiditySweep[] } {
  const levels: SmcLiquidityLevel[] = [];
  const sweeps: SmcLiquiditySweep[] = [];

  const highs = swings.filter((s) => s.isHigh);
  const lows = swings.filter((s) => !s.isHigh);

  // Equal Highs (EQH) within 0.15% threshold
  for (let i = 0; i < highs.length; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const diff = Math.abs(highs[i].price - highs[j].price);
      const avg = (highs[i].price + highs[j].price) / 2;
      if (diff / avg <= 0.0015) {
        levels.push({
          id: `eqh-${highs[i].index}-${highs[j].index}`,
          price: Math.max(highs[i].price, highs[j].price),
          type: 'EQH',
          label: 'EQH ($$$)',
          candleIndices: [highs[i].index, highs[j].index],
          isSwept: false,
        });
      }
    }
  }

  // Equal Lows (EQL) within 0.15% threshold
  for (let i = 0; i < lows.length; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      const diff = Math.abs(lows[i].price - lows[j].price);
      const avg = (lows[i].price + lows[j].price) / 2;
      if (diff / avg <= 0.0015) {
        levels.push({
          id: `eql-${lows[i].index}-${lows[j].index}`,
          price: Math.min(lows[i].price, lows[j].price),
          type: 'EQL',
          label: 'EQL ($$$)',
          candleIndices: [lows[i].index, lows[j].index],
          isSwept: false,
        });
      }
    }
  }

  // Key Swing Highs (BSL) and Swing Lows (SSL)
  for (const sw of swings) {
    if (sw.isHigh) {
      levels.push({
        id: `bsl-${sw.index}`,
        price: sw.price,
        type: 'BSL',
        label: 'BSL ($$$)',
        candleIndices: [sw.index],
        isSwept: false,
      });
    } else {
      levels.push({
        id: `ssl-${sw.index}`,
        price: sw.price,
        type: 'SSL',
        label: 'SSL ($$$)',
        candleIndices: [sw.index],
        isSwept: false,
      });
    }
  }

  // Detect Sweeps: Candle wick exceeds level but candle close settles back inside
  for (let i = 0; i < candles.length; i++) {
    const cur = candles[i];
    for (const lvl of levels) {
      const maxIdx = Math.max(...lvl.candleIndices);
      if (i <= maxIdx + 1) continue; // Must be after the level was established
      if (lvl.isSwept) continue;

      if (lvl.type === 'BSL' || lvl.type === 'EQH') {
        if (cur.high > lvl.price && cur.close < lvl.price) {
          lvl.isSwept = true;
          lvl.sweepCandleIndex = i;
          sweeps.push({
            candleIndex: i,
            time: cur.openTime,
            price: cur.high,
            isHighSweep: true,
            label: `${lvl.type} Sweep ($$$)`,
            sweptLevelPrice: lvl.price,
          });
        }
      } else if (lvl.type === 'SSL' || lvl.type === 'EQL') {
        if (cur.low < lvl.price && cur.close > lvl.price) {
          lvl.isSwept = true;
          lvl.sweepCandleIndex = i;
          sweeps.push({
            candleIndex: i,
            time: cur.openTime,
            price: cur.low,
            isHighSweep: false,
            label: `${lvl.type} Sweep ($$$)`,
            sweptLevelPrice: lvl.price,
          });
        }
      }
    }
  }

  return { levels, sweeps };
}

// ── 4. Order Blocks & Breaker Blocks ────────────────────────────────────────

export function detectOrderBlocksAndBreakers(
  candles: Candle[],
  breaks: SmcStructureBreak[]
): { orderBlocks: SmcOrderBlock[]; breakers: SmcOrderBlock[] } {
  const orderBlocks: SmcOrderBlock[] = [];
  const breakers: SmcOrderBlock[] = [];
  if (candles.length < 5) return { orderBlocks, breakers };

  // 20-period volume moving average for relative volume confirmation
  const volMa20: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - 19); j <= i; j++) {
      sum += candles[j].volume;
      count++;
    }
    volMa20.push(sum / count);
  }

  for (let i = 2; i < candles.length - 1; i++) {
    const candle = candles[i];
    const next = candles[i + 1];
    const ma = volMa20[i + 1] || next.volume || 1;
    const isHighVol = next.volume >= 1.15 * ma;

    // Bullish OB (Demand): Bearish candle followed by high volume impulse candle breaking high
    if (candle.close < candle.open && next.close > candle.high && isHighVol) {
      const ob: SmcOrderBlock = {
        id: `ob-bull-${i}`,
        startIndex: i,
        endIndex: candles.length - 1,
        topPrice: candle.high,
        bottomPrice: candle.low,
        isBullish: true,
        isBreaker: false,
        isMitigated: false,
        volumeRatio: next.volume / ma,
        label: 'OB (Demand)',
      };

      for (let k = i + 2; k < candles.length; k++) {
        // Violated -> flipped to Breaker
        if (candles[k].close < ob.bottomPrice) {
          ob.isMitigated = true;
          ob.isBreaker = true;
          ob.endIndex = k;
          ob.mitigationIndex = k;
          ob.label = 'Breaker (Bear)';
          breakers.push({ ...ob });
          break;
        } else if (candles[k].low <= ob.topPrice) {
          // Mitigated (tapped)
          ob.isMitigated = true;
          ob.endIndex = k;
          ob.mitigationIndex = k;
          break;
        }
      }
      orderBlocks.push(ob);
    }

    // Bearish OB (Supply): Bullish candle followed by high volume breakdown candle breaking low
    if (candle.close > candle.open && next.close < candle.low && isHighVol) {
      const ob: SmcOrderBlock = {
        id: `ob-bear-${i}`,
        startIndex: i,
        endIndex: candles.length - 1,
        topPrice: candle.high,
        bottomPrice: candle.low,
        isBullish: false,
        isBreaker: false,
        isMitigated: false,
        volumeRatio: next.volume / ma,
        label: 'OB (Supply)',
      };

      for (let k = i + 2; k < candles.length; k++) {
        // Violated -> flipped to Breaker
        if (candles[k].close > ob.topPrice) {
          ob.isMitigated = true;
          ob.isBreaker = true;
          ob.endIndex = k;
          ob.mitigationIndex = k;
          ob.label = 'Breaker (Bull)';
          breakers.push({ ...ob });
          break;
        } else if (candles[k].high >= ob.bottomPrice) {
          // Mitigated (tapped)
          ob.isMitigated = true;
          ob.endIndex = k;
          ob.mitigationIndex = k;
          break;
        }
      }
      orderBlocks.push(ob);
    }
  }

  return { orderBlocks, breakers };
}

// ── 5. Fair Value Gaps (FVG) with Consequent Encroachment (50% CE) ──────────

export function detectFairValueGaps(candles: Candle[]): SmcFvg[] {
  const fvgs: SmcFvg[] = [];
  if (candles.length < 3) return fvgs;

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];

    // Bullish FVG (+FVG): Candle 3 low > Candle 1 high
    if (c3.low > c1.high) {
      const topPrice = c3.low;
      const bottomPrice = c1.high;
      const cePrice = (topPrice + bottomPrice) / 2;
      const fvg: SmcFvg = {
        id: `fvg-bull-${i - 1}`,
        startIndex: i - 1,
        endIndex: candles.length - 1,
        topPrice,
        bottomPrice,
        cePrice,
        isBullish: true,
        isMitigated: false,
        mitigationPercent: 0,
      };

      for (let k = i + 1; k < candles.length; k++) {
        const cur = candles[k];
        if (cur.low <= fvg.bottomPrice) {
          fvg.isMitigated = true;
          fvg.mitigationIndex = k;
          fvg.endIndex = k;
          fvg.mitigationPercent = 100;
          break;
        } else if (cur.low <= fvg.cePrice) {
          fvg.mitigationPercent = Math.max(fvg.mitigationPercent, 50);
        } else if (cur.low < fvg.topPrice) {
          const penetration = (fvg.topPrice - cur.low) / (fvg.topPrice - fvg.bottomPrice);
          fvg.mitigationPercent = Math.max(fvg.mitigationPercent, Math.round(penetration * 100));
        }
      }
      fvgs.push(fvg);
    }

    // Bearish FVG (-FVG): Candle 3 high < Candle 1 low
    if (c3.high < c1.low) {
      const topPrice = c1.low;
      const bottomPrice = c3.high;
      const cePrice = (topPrice + bottomPrice) / 2;
      const fvg: SmcFvg = {
        id: `fvg-bear-${i - 1}`,
        startIndex: i - 1,
        endIndex: candles.length - 1,
        topPrice,
        bottomPrice,
        cePrice,
        isBullish: false,
        isMitigated: false,
        mitigationPercent: 0,
      };

      for (let k = i + 1; k < candles.length; k++) {
        const cur = candles[k];
        if (cur.high >= fvg.topPrice) {
          fvg.isMitigated = true;
          fvg.mitigationIndex = k;
          fvg.endIndex = k;
          fvg.mitigationPercent = 100;
          break;
        } else if (cur.high >= fvg.cePrice) {
          fvg.mitigationPercent = Math.max(fvg.mitigationPercent, 50);
        } else if (cur.high > fvg.bottomPrice) {
          const penetration = (cur.high - fvg.bottomPrice) / (fvg.topPrice - fvg.bottomPrice);
          fvg.mitigationPercent = Math.max(fvg.mitigationPercent, Math.round(penetration * 100));
        }
      }
      fvgs.push(fvg);
    }
  }

  return fvgs;
}

// ── 6. Dealing Range & Equilibrium (Premium / Discount / OTE) ───────────────

export function detectDealingRange(candles: Candle[], swings: SmcSwingPoint[]): SmcDealingRange {
  if (candles.length === 0) {
    return {
      highPrice: 0,
      lowPrice: 0,
      equilibriumPrice: 0,
      premiumRange: [0, 0],
      discountRange: [0, 0],
      oteRange: [0, 0],
    };
  }

  // Use recent major swing high & swing low if available, otherwise look across candles
  let highPrice = -Infinity;
  let lowPrice = Infinity;

  const recentSwings = swings.slice(-10);
  const recentHighs = recentSwings.filter((s) => s.isHigh);
  const recentLows = recentSwings.filter((s) => !s.isHigh);

  if (recentHighs.length > 0 && recentLows.length > 0) {
    highPrice = Math.max(...recentHighs.map((s) => s.price));
    lowPrice = Math.min(...recentLows.map((s) => s.price));
  } else {
    for (const c of candles) {
      if (c.high > highPrice) highPrice = c.high;
      if (c.low < lowPrice) lowPrice = c.low;
    }
  }

  if (highPrice === lowPrice || highPrice <= 0) {
    const p = candles[candles.length - 1]?.close || 100;
    highPrice = p * 1.05;
    lowPrice = p * 0.95;
  }

  const range = highPrice - lowPrice;
  const equilibriumPrice = (highPrice + lowPrice) / 2;
  const premiumRange: [number, number] = [equilibriumPrice, highPrice];
  const discountRange: [number, number] = [lowPrice, equilibriumPrice];
  // Optimal Trade Entry (61.8% to 78.6% retracement)
  const oteRange: [number, number] = [
    Number((lowPrice + range * 0.618).toFixed(4)),
    Number((lowPrice + range * 0.786).toFixed(4)),
  ];

  return {
    highPrice,
    lowPrice,
    equilibriumPrice,
    premiumRange,
    discountRange,
    oteRange,
  };
}

// ── 7. Previous Day & Week Session Levels (PDH, PDL, PWH, PWL) ──────────────

export function detectSessionLevels(candles: Candle[]): SmcSessionLevels {
  if (candles.length < 2) return {};

  const levels: SmcSessionLevels = {};
  const lastTime = candles[candles.length - 1].openTime;
  const lastDate = new Date(lastTime);

  // Group candles by calendar day
  const dayGroups = new Map<string, { high: number; low: number }>();
  // Group candles by calendar week (Year-W)
  const weekGroups = new Map<string, { high: number; low: number }>();

  for (const c of candles) {
    const d = new Date(c.openTime);
    const dayKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    const weekKey = `${d.getUTCFullYear()}-W${Math.floor(d.getUTCDate() / 7)}`;

    const curDay = dayGroups.get(dayKey);
    if (!curDay) {
      dayGroups.set(dayKey, { high: c.high, low: c.low });
    } else {
      curDay.high = Math.max(curDay.high, c.high);
      curDay.low = Math.min(curDay.low, c.low);
    }

    const curWeek = weekGroups.get(weekKey);
    if (!curWeek) {
      weekGroups.set(weekKey, { high: c.high, low: c.low });
    } else {
      curWeek.high = Math.max(curWeek.high, c.high);
      curWeek.low = Math.min(curWeek.low, c.low);
    }
  }

  const dayEntries = Array.from(dayGroups.values());
  if (dayEntries.length >= 2) {
    const prevDay = dayEntries[dayEntries.length - 2];
    levels.pdh = prevDay.high;
    levels.pdl = prevDay.low;
  }

  const weekEntries = Array.from(weekGroups.values());
  if (weekEntries.length >= 2) {
    const prevWeek = weekEntries[weekEntries.length - 2];
    levels.pwh = prevWeek.high;
    levels.pwl = prevWeek.low;
  }

  return levels;
}

// ── 8. High-Probability SMC Setup Detector (For Scanner & Annotations) ───────

export function detectConfirmedSetups(
  candles: Candle[],
  breaks: SmcStructureBreak[],
  sweeps: SmcLiquiditySweep[],
  orderBlocks: SmcOrderBlock[],
  fvgs: SmcFvg[],
  dealingRange: SmcDealingRange
): SmcConfirmedSetup[] {
  const setups: SmcConfirmedSetup[] = [];
  if (candles.length < 5) return setups;

  const lastCandle = candles[candles.length - 1];
  const lastPrice = lastCandle.close;

  // 1. CHoCH Reversal Setups (Trend reversal confirmation)
  const recentBreaks = breaks.slice(-3);
  for (const brk of recentBreaks) {
    if (brk.breakType === 'CHoCH') {
      const isBull = brk.isBullish;
      const relevantOB = orderBlocks.find(
        (ob) => ob.isBullish === isBull && !ob.isMitigated && ob.startIndex <= brk.candleIndex
      );
      const entryPrice = relevantOB ? (relevantOB.topPrice + relevantOB.bottomPrice) / 2 : brk.price;
      const stopLoss = isBull
        ? (relevantOB ? relevantOB.bottomPrice * 0.998 : brk.price * 0.99)
        : (relevantOB ? relevantOB.topPrice * 1.002 : brk.price * 1.01);
      const targetPrice = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
      const risk = Math.abs(entryPrice - stopLoss);
      const reward = Math.abs(targetPrice - entryPrice);
      const rr = risk > 0 ? Number((reward / risk).toFixed(2)) : 2.5;

      setups.push({
        id: `setup-choch-${brk.candleIndex}`,
        name: isBull ? 'Bullish CHoCH Reversal' : 'Bearish CHoCH Reversal',
        setupType: 'CHOCH_REVERSAL',
        direction: isBull ? 'BULLISH' : 'BEARISH',
        candleIndex: brk.candleIndex,
        time: brk.time,
        entryPrice: Number(entryPrice.toFixed(2)),
        stopLoss: Number(stopLoss.toFixed(2)),
        targetPrice: Number(targetPrice.toFixed(2)),
        riskReward: Math.max(1.0, rr),
        status: lastPrice >= entryPrice * 0.995 && lastPrice <= entryPrice * 1.005 ? 'RETESTING' : 'CONFIRMED',
        description: `${isBull ? 'Bullish' : 'Bearish'} shift with structure break at ${brk.price.toFixed(2)} targeting dealing range liquidity.`,
      });
    }
  }

  // 2. Order Block Retests in Discount / Premium
  const activeObs = orderBlocks.filter((ob) => !ob.isMitigated).slice(-3);
  for (const ob of activeObs) {
    const isBull = ob.isBullish;
    const inFavorableZone = isBull
      ? ob.topPrice <= dealingRange.equilibriumPrice
      : ob.bottomPrice >= dealingRange.equilibriumPrice;

    if (inFavorableZone) {
      const entryPrice = (ob.topPrice + ob.bottomPrice) / 2;
      const stopLoss = isBull ? ob.bottomPrice * 0.997 : ob.topPrice * 1.003;
      const targetPrice = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
      const risk = Math.abs(entryPrice - stopLoss);
      const reward = Math.abs(targetPrice - entryPrice);
      const rr = risk > 0 ? Number((reward / risk).toFixed(2)) : 3.0;

      const isRetesting = isBull
        ? lastPrice >= ob.bottomPrice && lastPrice <= ob.topPrice * 1.01
        : lastPrice <= ob.topPrice && lastPrice >= ob.bottomPrice * 0.99;

      setups.push({
        id: `setup-ob-${ob.id}`,
        name: isBull ? 'Bullish Demand OB Retest' : 'Bearish Supply OB Retest',
        setupType: 'OB_RETEST',
        direction: isBull ? 'BULLISH' : 'BEARISH',
        candleIndex: ob.startIndex,
        time: candles[ob.startIndex]?.openTime || lastCandle.openTime,
        entryPrice: Number(entryPrice.toFixed(2)),
        stopLoss: Number(stopLoss.toFixed(2)),
        targetPrice: Number(targetPrice.toFixed(2)),
        riskReward: Math.max(1.2, rr),
        status: isRetesting ? 'RETESTING' : 'CONFIRMED',
        description: `High-volume order block in ${isBull ? 'Discount' : 'Premium'} zone with ${ob.volumeRatio.toFixed(1)}x volume impulse.`,
      });
    }
  }

  // 3. Liquidity Sweeps
  const recentSweeps = sweeps.slice(-2);
  for (const sw of recentSweeps) {
    const isBull = !sw.isHighSweep; // SSL sweep = Bullish reversal
    const entryPrice = lastPrice;
    const stopLoss = isBull ? sw.price * 0.997 : sw.price * 1.003;
    const targetPrice = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(targetPrice - entryPrice);
    const rr = risk > 0 ? Number((reward / risk).toFixed(2)) : 2.8;

    setups.push({
      id: `setup-sweep-${sw.candleIndex}`,
      name: isBull ? 'SSL Liquidity Sweep Reversal' : 'BSL Liquidity Sweep Reversal',
      setupType: 'LIQUIDITY_SWEEP',
      direction: isBull ? 'BULLISH' : 'BEARISH',
      candleIndex: sw.candleIndex,
      time: sw.time,
      entryPrice: Number(entryPrice.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      targetPrice: Number(targetPrice.toFixed(2)),
      riskReward: Math.max(1.5, rr),
      status: 'CONFIRMED',
      description: `Institutional liquidity run at ${sw.sweptLevelPrice.toFixed(2)} with candle close rejection back into range.`,
    });
  }

  return setups;
}

// ── Master SMC Calculation Function ────────────────────────────────────────

export function calculateSMC(candles: Candle[], config?: Partial<SmcConfig>): SmcAnalysis {
  if (!candles || candles.length < 5) {
    const p = candles?.length ? candles[candles.length - 1].close : 0;
    return {
      swings: [],
      structureBreaks: [],
      liquidityLevels: [],
      sweeps: [],
      orderBlocks: [],
      breakers: [],
      fvgs: [],
      dealingRange: {
        highPrice: p * 1.05,
        lowPrice: p * 0.95,
        equilibriumPrice: p,
        premiumRange: [p, p * 1.05],
        discountRange: [p * 0.95, p],
        oteRange: [p * 0.96, p * 0.98],
      },
      sessionLevels: {},
      confirmedSetups: [],
      equilibriumPrice: p,
    };
  }

  // 1. Detect Swings
  const swings = detectSwingPoints(candles, 3);

  // 2. Detect Structure Breaks (BOS vs CHoCH)
  const structureBreaks = detectStructureBreaks(candles, swings);

  // 3. Detect Liquidity Levels & Sweeps
  const { levels: liquidityLevels, sweeps } = detectLiquidity(candles, swings);

  // 4. Detect Order Blocks & Breakers
  const { orderBlocks, breakers } = detectOrderBlocksAndBreakers(candles, structureBreaks);

  // 5. Detect Fair Value Gaps (FVGs)
  const fvgs = detectFairValueGaps(candles);

  // 6. Detect Dealing Range & Equilibrium
  const dealingRange = detectDealingRange(candles, swings);

  // 7. Detect Key Historical Session Levels
  const sessionLevels = detectSessionLevels(candles);

  // 8. Detect Confirmed High-Probability Setups
  const confirmedSetups = detectConfirmedSetups(
    candles,
    structureBreaks,
    sweeps,
    orderBlocks,
    fvgs,
    dealingRange
  );

  return {
    swings,
    structureBreaks,
    liquidityLevels,
    sweeps,
    orderBlocks,
    breakers,
    fvgs,
    dealingRange,
    sessionLevels,
    confirmedSetups,
    equilibriumPrice: dealingRange.equilibriumPrice,
  };
}
