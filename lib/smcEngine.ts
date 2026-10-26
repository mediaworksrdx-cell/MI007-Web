// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE AI (MI-007) — SHARED SMART MONEY CONCEPTS (SMC) ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Pure quantitative SMC calculation engine used identically by:
// 1. Candlestick Canvas Overlays (Chart Mode)
// 2. Screener SMC Institutional Scanner
// 3. Technical Strategy Screening Engine
//
// Features & Invariants (Revision 5.0 Audit Specification):
// - Mandatory Trusted Exchange Clock & Ingestion Separation (no Date.now() defaults)
// - Deterministic Swing Detection (HH, HL, LH, LL) with dual formation/confirmation timestamps
// - Close-based BOS & CHoCH / MSS with configurable displacement & volume options
// - Mirrored Liquidity Sweeps (BSL Upper Wick ratio vs SSL Lower Wick ratio)
// - Invalidation-First FVG Waterfall (evaluating structural invalidation before mitigation)
// - Unambiguous Session Windows & IANA Timezone Awareness (London, NY RTH/Full, Tokyo, India)
// - Complete 9-State Lifecycle State Machine with single & multi-target scaling
// - True 64-bit BigInt FNV-1a Dataset Hashing & Reentrant LRU Caching
// - All 16 Institutional SMC Strategies with Stop Loss & Take Profit targets
// ═══════════════════════════════════════════════════════════════════════════

import { Candle } from './types';

// ── Types & Configuration ──────────────────────────────────────────────────

export type SmcSwingType = 'HH' | 'HL' | 'LH' | 'LL';

export interface SmcSwingPoint {
  index: number;
  time: number; // Formation time (T_i) for chart geometry
  price: number;
  type: SmcSwingType;
  isHigh: boolean;
  formationTime: number; // T_i
  confirmationTime: number; // T_{i+R} (Zero look-ahead signal availability)
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
  confirmationTime: number;
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
  wickRatio: number; // Upper wick for BSL, lower wick for SSL
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
  formationTime: number;
}

export type SmcFvgState = 'FRESH' | 'PARTIALLY_MITIGATED' | 'MITIGATED' | 'INVALIDATED';

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
  state: SmcFvgState;
  isInvalidated: boolean;
  isInverse?: boolean;
  residualTop?: number;
  residualBottom?: number;
  formationTime: number;
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
  sessionSweeps?: SmcLiquiditySweep[];
}

export type SmcSetupType =
  | 'CHOCH_REVERSAL'
  | 'BOS_CONTINUATION'
  | 'OB_RETEST'
  | 'FVG_TAP'
  | 'LIQUIDITY_SWEEP'
  | 'BREAKER_RETEST'
  | 'EQH_EQL_SWEEP'
  | 'PREMIUM_DISCOUNT_OTE'
  | 'MTF_CONFLUENCE'
  | 'SESSION_LIQUIDITY'
  | 'THREE_STAGE_REVERSAL'
  | 'BOS_FVG_RETEST'
  | 'OB_FVG_CONFLUENCE'
  | 'INDUCEMENT_SWEEP'
  | 'POWER_OF_THREE_AMD'
  | 'INVERSE_FVG';

export const SmcLifecycleState = {
  DETECTED: 'DETECTED',
  FORMING: 'FORMING',
  CONFIRMED: 'CONFIRMED',
  ENTRY_ZONE_REACHED: 'ENTRY_ZONE_REACHED',
  RETESTED: 'RETESTED',
  TARGET_HIT: 'TARGET_HIT',
  EXITED: 'EXITED',
  INVALIDATED: 'INVALIDATED',
  EXPIRED: 'EXPIRED',
} as const;

export type SmcLifecycleState = typeof SmcLifecycleState[keyof typeof SmcLifecycleState];

export type SmcLifecycleAction =
  | 'START_FORMING'
  | 'CONFIRM_SETUP'
  | 'PRICE_ENTERED_ZONE'
  | 'CONFIRM_RETEST'
  | 'HIT_TARGET'
  | 'EXIT'
  | 'INVALIDATE'
  | 'EXPIRE';

export function transitionSmcLifecycle(
  currentState: SmcLifecycleState,
  action: SmcLifecycleAction
): SmcLifecycleState {
  // Terminal states cannot transition to active states
  if (currentState === 'INVALIDATED' || currentState === 'EXPIRED' || currentState === 'EXITED') {
    return currentState;
  }

  // Universal terminal transitions from any active state
  if (action === 'INVALIDATE') return 'INVALIDATED';
  if (action === 'EXPIRE') return 'EXPIRED';

  switch (currentState) {
    case 'DETECTED':
      if (action === 'START_FORMING') return 'FORMING';
      if (action === 'CONFIRM_SETUP') return 'CONFIRMED';
      break;

    case 'FORMING':
      if (action === 'CONFIRM_SETUP') return 'CONFIRMED';
      break;

    case 'CONFIRMED':
      if (action === 'PRICE_ENTERED_ZONE') return 'ENTRY_ZONE_REACHED';
      if (action === 'CONFIRM_RETEST') return 'RETESTED';
      if (action === 'HIT_TARGET') return 'TARGET_HIT';
      break;

    case 'ENTRY_ZONE_REACHED':
      if (action === 'CONFIRM_RETEST') return 'RETESTED';
      if (action === 'HIT_TARGET') return 'TARGET_HIT';
      break;

    case 'RETESTED':
      if (action === 'HIT_TARGET') return 'TARGET_HIT';
      break;

    case 'TARGET_HIT':
      if (action === 'EXIT') return 'EXITED';
      break;
  }

  return currentState;
}

export interface SmcConfirmedSetup {
  id: string;
  name: string;
  setupType: SmcSetupType;
  direction: 'BULLISH' | 'BEARISH';
  candleIndex: number;
  time: number; // formation candle openTime
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  targetPrice2?: number; // For multi-target scaling
  riskReward: number;
  status: 'CONFIRMED' | 'RETESTING' | 'PENDING' | 'DETECTED' | 'FORMING' | 'ENTRY_ZONE_REACHED' | 'TARGET_HIT' | 'EXITED' | 'INVALIDATED' | 'EXPIRED';
  lifecycleState: SmcLifecycleState;
  retestCount: number;
  description: string;
  invalidationLevel?: number;
  formationTime: number;
  confirmationTime: number;
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
  allSetups: SmcConfirmedSetup[];
  equilibriumPrice: number;
  datasetFingerprint?: string;
}

export interface SmcFilterOptions {
  requireDisplacement?: boolean;     // Default: false (configurable opt-in)
  displacementAtrMultiple?: number;  // Default: 1.25 * ATR(14)
  requireVolumeExpansion?: boolean;  // Default: false (configurable opt-in)
  volumeSmaMultiple?: number;        // Default: 1.10 * SMA(Volume, 20)
  structureType?: 'INTERNAL' | 'SWING'; // Default: 'SWING'
  targetMode?: 'SINGLE' | 'MULTI_STAGE'; // Default: 'SINGLE'
}

export interface SmcConfig {
  enabled: boolean;

  // ── SMC Setup Direction (Master Controls) ──
  showBullishSetups: boolean;       // Master toggle: Long-side signals & demand-side patterns
  showBearishSetups: boolean;       // Master toggle: Short-side signals & supply-side patterns

  // ── Market Structure (Directionally Configurable) ──
  showBos: boolean;
  showChoch: boolean;
  showBullishStructure: boolean;    // Bullish BOS, CHoCH, MSS
  showBearishStructure: boolean;    // Bearish BOS, CHoCH, MSS
  showSwings: boolean;

  // ── Liquidity Pools & Sweeps ──
  showSweeps: boolean;
  showSslSweeps: boolean;           // Bullish Sell-Side Liquidity (SSL) sweep
  showBslSweeps: boolean;           // Bearish Buy-Side Liquidity (BSL) sweep
  showEqualHighLow: boolean;
  showLiquidityLevels: boolean;

  // ── Institutional Order Blocks & Breakers ──
  showBullishOb: boolean;           // Bullish Demand OB
  showBearishOb: boolean;           // Bearish Supply OB
  showBreakers: boolean;            // Master Breaker Blocks toggle
  showBullishBreakers: boolean;     // Bullish demand breaker block
  showBearishBreakers: boolean;     // Bearish supply breaker block
  showMitigatedOb: boolean;

  // ── Fair Value Gaps (FVG) & Inverse FVGs (IFVG) ──
  showBullishFvg: boolean;          // Bullish FVG
  showBearishFvg: boolean;          // Bearish FVG
  showBullishIfvg: boolean;         // Bullish Inverse FVG (support flip)
  showBearishIfvg: boolean;         // Bearish Inverse FVG (resistance flip)
  showFvgMidpoint: boolean;         // 50% CE Midline
  showMitigatedFvg: boolean;

  // ── Confluence & Reversal Setups ──
  showBullishConfluence: boolean;   // Bullish confluence and reversal setups
  showBearishConfluence: boolean;   // Bearish confluence and reversal setups

  // ── Premium / Discount Context ──
  showPremiumDiscount: boolean;     // Dealing Range background zones
  showEquilibrium: boolean;         // 50% EQ midline (strictly neutral context)
  showOte: boolean;                 // Optimal Trade Entry (61.8% - 78.6%)

  // ── Session & Key Levels ──
  showPdhPdl: boolean;
  showPwhPwl: boolean;

  // ── Display limits & filters ──
  maxVisibleZones?: number;
  swingLength?: number;
  filters?: SmcFilterOptions;
}

export const DEFAULT_SMC_CONFIG: SmcConfig = {
  enabled: true,
  swingLength: 5,                   // Institutional pivot standard (5-bar lookback for clean structure)

  // Master Direction Controls
  showBullishSetups: true,
  showBearishSetups: true,

  // Market Structure
  showBos: true,
  showChoch: true,
  showBullishStructure: true,
  showBearishStructure: true,
  showSwings: true,

  // Liquidity
  showSweeps: true,
  showSslSweeps: true,
  showBslSweeps: true,
  showEqualHighLow: true,
  showLiquidityLevels: true,

  // Order Blocks & Breakers
  showBullishOb: true,
  showBearishOb: true,
  showBreakers: true,
  showBullishBreakers: true,
  showBearishBreakers: true,
  showMitigatedOb: false,

  // FVGs & IFVGs
  showBullishFvg: true,
  showBearishFvg: true,
  showBullishIfvg: false,           // Default false: Secondary advanced structure to eliminate chart clutter
  showBearishIfvg: false,           // Default false: Secondary advanced structure to eliminate chart clutter
  showFvgMidpoint: true,
  showMitigatedFvg: false,

  // Confluence Setups
  showBullishConfluence: true,
  showBearishConfluence: true,

  // Premium / Discount Context
  showPremiumDiscount: true,
  showEquilibrium: true,
  showOte: true,

  // Session Levels
  showPdhPdl: true,
  showPwhPwl: false,

  maxVisibleZones: 6,               // Production grade: max 6 active proximity zones
  filters: {
    requireDisplacement: false,
    displacementAtrMultiple: 1.25,
    requireVolumeExpansion: false,
    volumeSmaMultiple: 1.10,
    structureType: 'SWING',
    targetMode: 'SINGLE',
  },
};

const SMC_STORAGE_KEY = 'mi007_smc_config';
const SMC_CONFIG_VERSION = 2; // Version 2: Sanitized IFVG default noise

export function getStoredSmcConfig(): SmcConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_SMC_CONFIG };
  try {
    const raw = localStorage.getItem(SMC_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SMC_CONFIG };
    const parsed = JSON.parse(raw);
    const isV2 = parsed._version === SMC_CONFIG_VERSION;
    return {
      ...DEFAULT_SMC_CONFIG,
      ...parsed,
      // Suppress legacy unconstrained IFVG clutter on first upgrade to v2
      showBullishIfvg: isV2 ? !!parsed.showBullishIfvg : false,
      showBearishIfvg: isV2 ? !!parsed.showBearishIfvg : false,
      maxVisibleZones: parsed.maxVisibleZones || 8,
    };
  } catch {
    return { ...DEFAULT_SMC_CONFIG };
  }
}

export function saveStoredSmcConfig(cfg: SmcConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SMC_STORAGE_KEY, JSON.stringify({ ...cfg, _version: SMC_CONFIG_VERSION }));
  } catch (err) {
    console.error('Failed to save SMC config:', err);
  }
}

// ── 0. Candle-Completion Validation (Historical vs Live Trusted Clock) ─────────

export interface ExchangeClock {
  readonly market: string;
  getExchangeTimeMs(): number;
}

export function isLiveCandleCompleted(
  candle: Candle,
  intervalMs: number,
  trustedExchangeTimeMs: number,
  maxClockDriftMs = 5000
): boolean {
  if (candle.openTime > trustedExchangeTimeMs + maxClockDriftMs) {
    return false; // Future candle rejected
  }
  if (typeof candle.isClosed === 'boolean') {
    if (candle.isClosed) {
      const isPhysicallyElapsed = (candle.openTime + intervalMs) <= (trustedExchangeTimeMs + maxClockDriftMs);
      if (isPhysicallyElapsed) return true;
    } else {
      return false; // Intrabar forming
    }
  }
  return (candle.openTime + intervalMs) <= trustedExchangeTimeMs;
}

export function isCandleSeriesBarCompleted(
  candleIndex: number,
  totalCandles: number,
  candle: Candle,
  intervalMs: number,
  isHistoricalSeries: boolean,
  trustedExchangeTimeMs?: number
): boolean {
  if (isHistoricalSeries) return true;
  if (candleIndex < totalCandles - 1) return true;
  if (trustedExchangeTimeMs === undefined) return false;
  return isLiveCandleCompleted(candle, intervalMs, trustedExchangeTimeMs);
}

// ── 1. Swing Points Detection (Dual Timestamps: Formation vs Confirmation) ────

export function detectSwingPoints(
  candles: Candle[],
  lookback = 3,
  intervalMs = 60000
): SmcSwingPoint[] {
  const rawSwings: SmcSwingPoint[] = [];
  if (candles.length < lookback * 2 + 1) return rawSwings;

  for (let i = lookback; i < candles.length - lookback; i++) {
    const cur = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high > cur.high) isHigh = false;
      if (candles[j].low < cur.low) isLow = false;
    }

    const confIdx = Math.min(candles.length - 1, i + lookback);
    const confirmationTime = candles[confIdx].openTime;

    if (isHigh) {
      rawSwings.push({
        index: i,
        time: cur.openTime,
        price: cur.high,
        type: 'HH',
        isHigh: true,
        formationTime: cur.openTime,
        confirmationTime,
      });
    }

    if (isLow) {
      rawSwings.push({
        index: i,
        time: cur.openTime,
        price: cur.low,
        type: 'LL',
        isHigh: false,
        formationTime: cur.openTime,
        confirmationTime,
      });
    }
  }

  // Filter raw swings to enforce true structural alternation (Peak -> Trough -> Peak -> Trough)
  const swings: SmcSwingPoint[] = [];
  for (const sw of rawSwings) {
    if (swings.length === 0) {
      swings.push(sw);
      continue;
    }
    const prev = swings[swings.length - 1];
    if (prev.isHigh === sw.isHigh) {
      // Consecutive swings in same direction: keep the more extreme peak or trough
      if (sw.isHigh && sw.price >= prev.price) {
        swings[swings.length - 1] = sw;
      } else if (!sw.isHigh && sw.price <= prev.price) {
        swings[swings.length - 1] = sw;
      }
    } else {
      swings.push(sw);
    }
  }

  // Assign accurate institutional labels (HH / LH, HL / LL)
  let prevHigh: SmcSwingPoint | null = null;
  let prevLow: SmcSwingPoint | null = null;
  for (const sw of swings) {
    if (sw.isHigh) {
      sw.type = !prevHigh || sw.price >= prevHigh.price ? 'HH' : 'LH';
      prevHigh = sw;
    } else {
      sw.type = !prevLow || sw.price <= prevLow.price ? 'LL' : 'HL';
      prevLow = sw;
    }
  }

  return swings;
}

// ── 2. Market Structure Breaks (BOS vs CHoCH / MSS with Filters) ──────────────

export function detectStructureBreaks(
  candles: Candle[],
  swings: SmcSwingPoint[],
  options?: SmcFilterOptions
): SmcStructureBreak[] {
  const breaks: SmcStructureBreak[] = [];
  if (candles.length < 5 || swings.length < 2) return breaks;

  // Calculate ATR(14) and Volume SMA(20) if filters requested
  const reqDisp = options?.requireDisplacement ?? false;
  const dispMult = options?.displacementAtrMultiple ?? 1.25;
  const reqVol = options?.requireVolumeExpansion ?? false;
  const volMult = options?.volumeSmaMultiple ?? 1.10;

  const atrValues: number[] = [];
  const volSmaValues: number[] = [];
  if (reqDisp || reqVol) {
    let trSum = 0;
    for (let i = 0; i < candles.length; i++) {
      const cur = candles[i];
      const prev = i > 0 ? candles[i - 1] : cur;
      const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
      if (i < 14) {
        trSum += tr;
        atrValues.push(trSum / (i + 1));
      } else {
        atrValues.push((atrValues[i - 1] * 13 + tr) / 14);
      }

      let vSum = 0;
      let count = 0;
      for (let j = Math.max(0, i - 19); j <= i; j++) {
        vSum += candles[j].volume;
        count++;
      }
      volSmaValues.push(vSum / count);
    }
  }

  let trendDirection = 0; // 1 = Bullish, -1 = Bearish
  let activeHigh: SmcSwingPoint | null = null;
  let activeLow: SmcSwingPoint | null = null;
  let swingPtr = 0;

  for (let i = 0; i < candles.length; i++) {
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

    // Check displacement / volume criteria if enabled
    let passFilters = true;
    if (reqDisp && atrValues[i]) {
      const body = Math.abs(cur.close - cur.open);
      if (body < dispMult * atrValues[i]) passFilters = false;
    }
    if (reqVol && volSmaValues[i]) {
      if (cur.volume < volMult * volSmaValues[i]) passFilters = false;
    }

    // Break Above Active High
    if (activeHigh && cur.close > activeHigh.price && prev.close <= activeHigh.price && passFilters) {
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
        confirmationTime: cur.openTime,
      });

      trendDirection = 1;
      activeHigh = null;
    }

    // Break Below Active Low
    if (activeLow && cur.close < activeLow.price && prev.close >= activeLow.price && passFilters) {
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
        confirmationTime: cur.openTime,
      });

      trendDirection = -1;
      activeLow = null;
    }
  }

  return breaks;
}

// ── 3. Liquidity Levels & Mirrored Sweeps (BSL / SSL / EQH / EQL) ──────────────

export function detectLiquidity(
  candles: Candle[],
  swings: SmcSwingPoint[],
  minWickRatio = 0.40
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

  // Detect Sweeps with Mirrored Rejection Wick Calculations
  for (let i = 0; i < candles.length; i++) {
    const cur = candles[i];
    const totalRange = cur.high - cur.low;
    if (totalRange <= 0) continue;

    for (const lvl of levels) {
      const maxIdx = Math.max(...lvl.candleIndices);
      if (i <= maxIdx + 1) continue;
      if (lvl.isSwept) continue;

      if (lvl.type === 'BSL' || lvl.type === 'EQH') {
        // Buy-Side Liquidity (BSL) Sweep: Upper wick rejection
        if (cur.high > lvl.price && cur.close < lvl.price) {
          const upperWick = cur.high - Math.max(cur.open, cur.close);
          const upperWickRatio = upperWick / totalRange;

          if (upperWickRatio >= minWickRatio || totalRange / cur.open > 0.01) {
            lvl.isSwept = true;
            lvl.sweepCandleIndex = i;
            sweeps.push({
              candleIndex: i,
              time: cur.openTime,
              price: cur.high,
              isHighSweep: true,
              label: `${lvl.type} Sweep ($$$)`,
              sweptLevelPrice: lvl.price,
              wickRatio: Number(upperWickRatio.toFixed(3)),
            });
          }
        }
      } else if (lvl.type === 'SSL' || lvl.type === 'EQL') {
        // Sell-Side Liquidity (SSL) Sweep: Lower wick rejection
        if (cur.low < lvl.price && cur.close > lvl.price) {
          const lowerWick = Math.min(cur.open, cur.close) - cur.low;
          const lowerWickRatio = lowerWick / totalRange;

          if (lowerWickRatio >= minWickRatio || totalRange / cur.open > 0.01) {
            lvl.isSwept = true;
            lvl.sweepCandleIndex = i;
            sweeps.push({
              candleIndex: i,
              time: cur.openTime,
              price: cur.low,
              isHighSweep: false,
              label: `${lvl.type} Sweep ($$$)`,
              sweptLevelPrice: lvl.price,
              wickRatio: Number(lowerWickRatio.toFixed(3)),
            });
          }
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
      if (orderBlocks.length > 0) {
        const lastOb = orderBlocks[orderBlocks.length - 1];
        if (lastOb.isBullish && Math.abs(lastOb.startIndex - i) <= 1) {
          lastOb.bottomPrice = Math.min(lastOb.bottomPrice, candle.low);
          lastOb.topPrice = Math.max(lastOb.topPrice, candle.high);
          continue;
        }
      }

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
        formationTime: candle.openTime,
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
      if (orderBlocks.length > 0) {
        const lastOb = orderBlocks[orderBlocks.length - 1];
        if (!lastOb.isBullish && Math.abs(lastOb.startIndex - i) <= 1) {
          lastOb.bottomPrice = Math.min(lastOb.bottomPrice, candle.low);
          lastOb.topPrice = Math.max(lastOb.topPrice, candle.high);
          continue;
        }
      }

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
        formationTime: candle.openTime,
      };

      for (let k = i + 2; k < candles.length; k++) {
        if (candles[k].close > ob.topPrice) {
          ob.isMitigated = true;
          ob.isBreaker = true;
          ob.endIndex = k;
          ob.mitigationIndex = k;
          ob.label = 'Breaker (Bull)';
          breakers.push({ ...ob });
          break;
        } else if (candles[k].high >= ob.bottomPrice) {
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

// ── 5. Fair Value Gaps (FVG) with Invalidation-First Waterfall ────────────────

export function evaluateFvgState(
  fvg: SmcFvg,
  candle: Candle,
  minLowSinceCreation: number,
  maxHighSinceCreation: number
): SmcFvgState {
  if (fvg.isBullish) {
    // STEP 1: Structural Invalidation evaluated FIRST
    if (candle.close < fvg.bottomPrice) {
      return 'INVALIDATED';
    }
    // STEP 2: Full Mitigation (100% Traversal) evaluated ONLY IF NOT INVALIDATED
    if (minLowSinceCreation <= fvg.bottomPrice && candle.close >= fvg.bottomPrice) {
      return 'MITIGATED';
    }
    // STEP 3: Partial Mitigation
    if (minLowSinceCreation <= fvg.topPrice && minLowSinceCreation > fvg.bottomPrice) {
      return 'PARTIALLY_MITIGATED';
    }
    return 'FRESH';
  } else {
    // STEP 1: Structural Invalidation evaluated FIRST
    if (candle.close > fvg.topPrice) {
      return 'INVALIDATED';
    }
    // STEP 2: Full Mitigation evaluated ONLY IF NOT INVALIDATED
    if (maxHighSinceCreation >= fvg.topPrice && candle.close <= fvg.topPrice) {
      return 'MITIGATED';
    }
    // STEP 3: Partial Mitigation
    if (maxHighSinceCreation >= fvg.bottomPrice && maxHighSinceCreation < fvg.topPrice) {
      return 'PARTIALLY_MITIGATED';
    }
    return 'FRESH';
  }
}

export function detectFairValueGaps(candles: Candle[], minGapThreshold?: number): SmcFvg[] {
  const fvgs: SmcFvg[] = [];
  if (candles.length < 3) return fvgs;

  // Adaptive threshold: ignore micro-pip noise on high-nominal instruments (e.g. BTC)
  let minGap = minGapThreshold || 0;
  if (!minGapThreshold && candles.length > 5) {
    const lastPrice = candles[candles.length - 1].close || 100;
    let recentRange = 0;
    const sampleSize = Math.min(20, candles.length);
    for (let s = candles.length - sampleSize; s < candles.length; s++) {
      recentRange += Math.abs(candles[s].high - candles[s].low);
    }
    const avgBarRange = recentRange / sampleSize;
    // Gap must be at least 10% of average candle height or 0.01% of price
    minGap = Math.max(avgBarRange * 0.1, lastPrice * 0.0001);
  }

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];

    const c2Range = c2.high - c2.low;
    const c2BullBody = c2.close - c2.open;
    const isBullDisplacement = c2BullBody > 0 && (c2Range === 0 || c2BullBody >= c2Range * 0.35);

    // Bullish FVG (+FVG): Candle 3 low > Candle 1 high with green displacement
    if (c3.low - c1.high > minGap && isBullDisplacement) {
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
        state: 'FRESH',
        isInvalidated: false,
        residualTop: topPrice,
        residualBottom: bottomPrice,
        formationTime: candles[i - 1].openTime,
      };

      let minLow = Infinity;
      for (let k = i + 1; k < candles.length; k++) {
        const cur = candles[k];
        minLow = Math.min(minLow, cur.low);

        const state = evaluateFvgState(fvg, cur, minLow, 0);
        fvg.state = state;

        if (state === 'INVALIDATED') {
          fvg.isInvalidated = true;
          fvg.isMitigated = true;
          fvg.mitigationIndex = k;
          fvg.endIndex = k;
          fvg.mitigationPercent = 100;

          // Spawn Inverse FVG (Bearish Resistance Flip from failed bullish gap)
          const ifvg: SmcFvg = {
            id: `ifvg-bear-${i - 1}`,
            startIndex: k,
            endIndex: candles.length - 1,
            topPrice,
            bottomPrice,
            cePrice,
            isBullish: false,
            isMitigated: false,
            mitigationPercent: 0,
            state: 'FRESH',
            isInvalidated: false,
            isInverse: true,
            formationTime: cur.openTime,
          };

          // Full subsequent lifecycle tracking for spawned IFVG
          for (let m = k + 1; m < candles.length; m++) {
            const sub = candles[m];
            if (sub.close > topPrice) {
              ifvg.isInvalidated = true;
              ifvg.isMitigated = true;
              ifvg.mitigationIndex = m;
              ifvg.endIndex = m;
              ifvg.mitigationPercent = 100;
              ifvg.state = 'INVALIDATED';
              break;
            }
            if (sub.high >= bottomPrice) {
              ifvg.isMitigated = true;
              ifvg.mitigationIndex = m;
              ifvg.endIndex = m;
              ifvg.mitigationPercent = 100;
              ifvg.state = 'MITIGATED';
              break;
            }
          }
          fvgs.push(ifvg);
          break;
        } else if (state === 'MITIGATED') {
          fvg.isMitigated = true;
          fvg.mitigationIndex = k;
          fvg.endIndex = k;
          fvg.mitigationPercent = 100;
          break;
        } else if (state === 'PARTIALLY_MITIGATED') {
          fvg.residualTop = minLow;
          const penetration = (topPrice - minLow) / (topPrice - bottomPrice);
          fvg.mitigationPercent = Math.max(fvg.mitigationPercent, Math.round(penetration * 100));
        }
      }
      fvgs.push(fvg);
    }

    const c2BearBody = c2.open - c2.close;
    const isBearDisplacement = c2BearBody > 0 && (c2Range === 0 || c2BearBody >= c2Range * 0.35);

    // Bearish FVG (-FVG): Candle 3 high < Candle 1 low with red displacement
    if (c1.low - c3.high > minGap && isBearDisplacement) {
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
        state: 'FRESH',
        isInvalidated: false,
        residualTop: topPrice,
        residualBottom: bottomPrice,
        formationTime: candles[i - 1].openTime,
      };

      let maxHigh = -Infinity;
      for (let k = i + 1; k < candles.length; k++) {
        const cur = candles[k];
        maxHigh = Math.max(maxHigh, cur.high);

        const state = evaluateFvgState(fvg, cur, 0, maxHigh);
        fvg.state = state;

        if (state === 'INVALIDATED') {
          fvg.isInvalidated = true;
          fvg.isMitigated = true;
          fvg.mitigationIndex = k;
          fvg.endIndex = k;
          fvg.mitigationPercent = 100;

          // Spawn Inverse FVG (Bullish Support Flip from failed bearish gap)
          const ifvg: SmcFvg = {
            id: `ifvg-bull-${i - 1}`,
            startIndex: k,
            endIndex: candles.length - 1,
            topPrice,
            bottomPrice,
            cePrice,
            isBullish: true,
            isMitigated: false,
            mitigationPercent: 0,
            state: 'FRESH',
            isInvalidated: false,
            isInverse: true,
            formationTime: cur.openTime,
          };

          // Full subsequent lifecycle tracking for spawned IFVG
          for (let m = k + 1; m < candles.length; m++) {
            const sub = candles[m];
            if (sub.close < bottomPrice) {
              ifvg.isInvalidated = true;
              ifvg.isMitigated = true;
              ifvg.mitigationIndex = m;
              ifvg.endIndex = m;
              ifvg.mitigationPercent = 100;
              ifvg.state = 'INVALIDATED';
              break;
            }
            if (sub.low <= topPrice) {
              ifvg.isMitigated = true;
              ifvg.mitigationIndex = m;
              ifvg.endIndex = m;
              ifvg.mitigationPercent = 100;
              ifvg.state = 'MITIGATED';
              break;
            }
          }
          fvgs.push(ifvg);
          break;
        } else if (state === 'MITIGATED') {
          fvg.isMitigated = true;
          fvg.mitigationIndex = k;
          fvg.endIndex = k;
          fvg.mitigationPercent = 100;
          break;
        } else if (state === 'PARTIALLY_MITIGATED') {
          fvg.residualBottom = maxHigh;
          const penetration = (maxHigh - bottomPrice) / (topPrice - bottomPrice);
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

// ── 7. Previous Day / Week & IANA Session Levels ────────────────────────────

export interface SessionSchedule {
  name: string;
  timezone: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  openSweepMinutes: number;
}

export const SESSION_SCHEDULES: Record<string, SessionSchedule> = {
  LONDON: {
    name: 'London Session',
    timezone: 'Europe/London',
    startHour: 8,
    startMin: 0,
    endHour: 16,
    endMin: 30,
    openSweepMinutes: 60,
  },
  NY_RTH: {
    name: 'New York Equities (RTH)',
    timezone: 'America/New_York',
    startHour: 9,
    startMin: 30,
    endHour: 16,
    endMin: 0,
    openSweepMinutes: 60,
  },
  NY_FULL: {
    name: 'New York Full / Forex',
    timezone: 'America/New_York',
    startHour: 8,
    startMin: 0,
    endHour: 17,
    endMin: 0,
    openSweepMinutes: 60,
  },
  TOKYO: {
    name: 'Asian / Tokyo Session',
    timezone: 'Asia/Tokyo',
    startHour: 9,
    startMin: 0,
    endHour: 15,
    endMin: 0,
    openSweepMinutes: 60,
  },
  INDIA: {
    name: 'Indian Cash Session',
    timezone: 'Asia/Kolkata',
    startHour: 9,
    startMin: 15,
    endHour: 15,
    endMin: 30,
    openSweepMinutes: 60,
  },
};

export function detectSessionLevels(candles: Candle[]): SmcSessionLevels {
  if (candles.length < 2) return {};

  const levels: SmcSessionLevels = {};
  const dayGroups = new Map<string, { high: number; low: number }>();
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

// ── 8. Complete 16 Institutional SMC Strategy Detectors ─────────────────────

export function detectAll16SmcSetups(
  candles: Candle[],
  swingsOrConfig?: SmcSwingPoint[] | Partial<SmcConfig>,
  breaks?: SmcStructureBreak[],
  sweeps?: SmcLiquiditySweep[],
  orderBlocks?: SmcOrderBlock[],
  breakers?: SmcOrderBlock[],
  fvgs?: SmcFvg[],
  dealingRange?: SmcDealingRange,
  sessionLevels?: SmcSessionLevels,
  options?: SmcFilterOptions
): SmcConfirmedSetup[] {
  if (!candles || candles.length < 5) return [];

  // Convenience overload if called with (candles, config?)
  if (!Array.isArray(swingsOrConfig)) {
    const analysis = calculateSMC(candles, swingsOrConfig);
    return detectAll16SmcSetups(
      candles,
      analysis.swings,
      analysis.structureBreaks,
      analysis.sweeps,
      analysis.orderBlocks,
      analysis.breakers,
      analysis.fvgs,
      analysis.dealingRange,
      analysis.sessionLevels,
      swingsOrConfig?.filters
    );
  }

  const swings = swingsOrConfig;
  breaks = breaks || [];
  sweeps = sweeps || [];
  orderBlocks = orderBlocks || [];
  breakers = breakers || [];
  fvgs = fvgs || [];
  const lastPrice = candles[candles.length - 1].close;
  dealingRange = dealingRange || {
    highPrice: lastPrice * 1.05,
    lowPrice: lastPrice * 0.95,
    equilibriumPrice: lastPrice,
    premiumRange: [lastPrice, lastPrice * 1.05],
    discountRange: [lastPrice * 0.95, lastPrice],
    oteRange: [lastPrice * 0.96, lastPrice * 0.98],
  };
  sessionLevels = sessionLevels || {};

  const setups: SmcConfirmedSetup[] = [];
  const lastCandle = candles[candles.length - 1];

  // Helper to construct setup with deterministic ID
  const makeSetup = (
    baseId: string,
    name: string,
    setupType: SmcSetupType,
    direction: 'BULLISH' | 'BEARISH',
    candleIndex: number,
    time: number,
    entryPrice: number,
    stopLoss: number,
    targetPrice: number,
    description: string,
    statusOverride?: 'CONFIRMED' | 'RETESTING' | 'PENDING' | 'DETECTED' | 'FORMING' | 'ENTRY_ZONE_REACHED' | 'TARGET_HIT' | 'EXITED' | 'INVALIDATED' | 'EXPIRED'
  ): SmcConfirmedSetup => {
    const risk = Math.max(Math.abs(entryPrice - stopLoss), entryPrice * 0.005);
    const guaranteedTarget = direction === 'BULLISH'
      ? (targetPrice > entryPrice ? targetPrice : entryPrice + risk * 2.5)
      : (targetPrice < entryPrice ? targetPrice : entryPrice - risk * 2.5);
    const reward = Math.abs(guaranteedTarget - entryPrice);
    const rr = Number((reward / risk).toFixed(2));
    const targetPrice2 = direction === 'BULLISH'
      ? Number((entryPrice + reward * 1.5).toFixed(2))
      : Number((entryPrice - reward * 1.5).toFixed(2));

    let status: 'CONFIRMED' | 'RETESTING' | 'PENDING' | 'DETECTED' | 'FORMING' | 'ENTRY_ZONE_REACHED' | 'TARGET_HIT' | 'EXITED' | 'INVALIDATED' | 'EXPIRED' = statusOverride || 'CONFIRMED';
    let lifecycleState: SmcLifecycleState = statusOverride === 'CONFIRMED' ? 'CONFIRMED' : (status === 'RETESTING' ? 'RETESTED' : 'CONFIRMED');
    let retestCount = 0;

    // Track post-formation bar outcomes to determine historical lifecycle state
    for (let k = candleIndex + 1; k < candles.length; k++) {
      const bar = candles[k];
      if (direction === 'BULLISH') {
        if (bar.low <= stopLoss) {
          status = 'INVALIDATED';
          lifecycleState = 'INVALIDATED';
          break;
        }
        if (bar.high >= targetPrice) {
          status = 'TARGET_HIT';
          lifecycleState = 'TARGET_HIT';
          break;
        }
        if (bar.low <= entryPrice && bar.close >= stopLoss) {
          status = 'RETESTING';
          lifecycleState = 'RETESTED';
          retestCount++;
        }
      } else {
        if (bar.high >= stopLoss) {
          status = 'INVALIDATED';
          lifecycleState = 'INVALIDATED';
          break;
        }
        if (bar.low <= targetPrice) {
          status = 'TARGET_HIT';
          lifecycleState = 'TARGET_HIT';
          break;
        }
        if (bar.high >= entryPrice && bar.close <= stopLoss) {
          status = 'RETESTING';
          lifecycleState = 'RETESTED';
          retestCount++;
        }
      }
    }

    const intervalMs = candles.length > 1 ? candles[1].openTime - candles[0].openTime : 3600000;
    const confirmationTime = candles[candleIndex].openTime + intervalMs;

    return {
      id: `${baseId}_${time}`,
      name,
      setupType,
      direction,
      candleIndex,
      time,
      entryPrice: Number(entryPrice.toFixed(2)),
      stopLoss: Number(stopLoss.toFixed(2)),
      targetPrice: Number(guaranteedTarget.toFixed(2)),
      targetPrice2,
      riskReward: Math.max(1.0, rr),
      status,
      lifecycleState,
      retestCount,
      description,
      invalidationLevel: stopLoss,
      formationTime: time,
      confirmationTime,
    };
  };

  // ── Strategy 1: BOS Continuation Scanner
  const recentBOS = breaks.filter((b) => b.breakType === 'BOS').slice(-2);
  for (const brk of recentBOS) {
    const isBull = brk.isBullish;
    const entry = brk.price;
    const sl = isBull ? brk.brokenSwingPrice * 0.995 : brk.brokenSwingPrice * 1.005;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    setups.push(makeSetup(
      `setup_bos_${brk.candleIndex}`,
      isBull ? 'BOS Trend Continuation (Bullish)' : 'BOS Trend Continuation (Bearish)',
      'BOS_CONTINUATION',
      isBull ? 'BULLISH' : 'BEARISH',
      brk.candleIndex,
      brk.time,
      entry,
      sl,
      tp,
      `Decisive break of structure at ${brk.price.toFixed(2)} in trend direction.`
    ));
  }

  // ── Strategy 2: CHoCH / MSS Reversal Scanner
  const recentCHoCH = breaks.filter((b) => b.breakType === 'CHoCH' || b.breakType === 'MSS').slice(-2);
  for (const brk of recentCHoCH) {
    const isBull = brk.isBullish;
    const entry = brk.price;
    const sl = isBull ? brk.price * 0.992 : brk.price * 1.008;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    setups.push(makeSetup(
      `setup_choch_${brk.candleIndex}`,
      isBull ? `${brk.breakType} Structural Reversal (Bullish)` : `${brk.breakType} Structural Reversal (Bearish)`,
      'CHOCH_REVERSAL',
      isBull ? 'BULLISH' : 'BEARISH',
      brk.candleIndex,
      brk.time,
      entry,
      sl,
      tp,
      `Structural ${brk.breakType} trend invalidation confirmed at ${brk.price.toFixed(2)}.`
    ));
  }

  // ── Strategy 3: Liquidity Sweep Reversal (Mirrored BSL/SSL)
  const recentSweeps = sweeps.slice(-2);
  for (const sw of recentSweeps) {
    const isBull = !sw.isHighSweep; // SSL sweep = Bullish reversal
    const entry = lastPrice;
    const sl = isBull ? sw.price * 0.995 : sw.price * 1.005;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    setups.push(makeSetup(
      `setup_sweep_${sw.candleIndex}`,
      isBull ? 'SSL Liquidity Pool Sweep (Bullish)' : 'BSL Liquidity Pool Sweep (Bearish)',
      'LIQUIDITY_SWEEP',
      isBull ? 'BULLISH' : 'BEARISH',
      sw.candleIndex,
      sw.time,
      entry,
      sl,
      tp,
      `Rejection wick (${(sw.wickRatio * 100).toFixed(0)}%) swept ${sw.sweptLevelPrice.toFixed(2)} liquidity pool.`
    ));
  }

  // ── Strategy 4: Equal Highs & Equal Lows (EQH / EQL Sweep)
  const eqSwept = sweeps.filter((s) => s.label.includes('EQH') || s.label.includes('EQL')).slice(-2);
  for (const eq of eqSwept) {
    const isBull = !eq.isHighSweep;
    const entry = lastPrice;
    const sl = isBull ? eq.price * 0.996 : eq.price * 1.004;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    setups.push(makeSetup(
      `setup_eq_${eq.candleIndex}`,
      isBull ? 'EQL Pool Liquidity Purge (Bullish)' : 'EQH Pool Liquidity Purge (Bearish)',
      'EQH_EQL_SWEEP',
      isBull ? 'BULLISH' : 'BEARISH',
      eq.candleIndex,
      eq.time,
      entry,
      sl,
      tp,
      `Engineered ${isBull ? 'Equal Lows' : 'Equal Highs'} pool at ${eq.sweptLevelPrice.toFixed(2)} purged.`
    ));
  }

  // ── Strategy 5: Fair Value Gap (FVG) Retracement
  const activeFvgs = fvgs.filter((f) => !f.isInverse && !f.isInvalidated && !f.isMitigated && f.state !== 'MITIGATED' && f.state !== 'INVALIDATED').slice(-2);
  for (const fvg of activeFvgs) {
    const isBull = fvg.isBullish;
    const entry = fvg.cePrice; // 50% CE entry
    const sl = isBull ? fvg.bottomPrice * 0.998 : fvg.topPrice * 1.002;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    setups.push(makeSetup(
      `setup_fvg_${fvg.id}`,
      isBull ? 'Bullish FVG 50% CE Retracement' : 'Bearish FVG 50% CE Retracement',
      'FVG_TAP',
      isBull ? 'BULLISH' : 'BEARISH',
      fvg.startIndex,
      fvg.formationTime,
      entry,
      sl,
      tp,
      `Imbalance gap [${fvg.bottomPrice.toFixed(2)} - ${fvg.topPrice.toFixed(2)}] with Consequent Encroachment at ${fvg.cePrice.toFixed(2)}.`
    ));
  }

  // ── Strategy 6: Order Block (OB) Retest in Discount/Premium
  const activeObs = orderBlocks.filter((ob) => !ob.isMitigated).slice(-2);
  for (const ob of activeObs) {
    const isBull = ob.isBullish;
    const entry = (ob.topPrice + ob.bottomPrice) / 2;
    const sl = isBull ? ob.bottomPrice * 0.997 : ob.topPrice * 1.003;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    setups.push(makeSetup(
      `setup_ob_${ob.id}`,
      isBull ? 'Bullish Demand Order Block Retest' : 'Bearish Supply Order Block Retest',
      'OB_RETEST',
      isBull ? 'BULLISH' : 'BEARISH',
      ob.startIndex,
      ob.formationTime,
      entry,
      sl,
      tp,
      `High-volume order block [${ob.bottomPrice.toFixed(2)} - ${ob.topPrice.toFixed(2)}] with ${ob.volumeRatio.toFixed(1)}x impulse volume.`
    ));
  }

  // ── Strategy 7: Breaker Block Role Reversal
  const activeBreakers = breakers.slice(-2);
  for (const brk of activeBreakers) {
    const isBull = !brk.isBullish; // Violated supply becomes demand
    const entry = (brk.topPrice + brk.bottomPrice) / 2;
    const sl = isBull ? brk.bottomPrice * 0.997 : brk.topPrice * 1.003;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    setups.push(makeSetup(
      `setup_breaker_${brk.id}`,
      isBull ? 'Bullish Breaker Block Role Reversal' : 'Bearish Breaker Block Role Reversal',
      'BREAKER_RETEST',
      isBull ? 'BULLISH' : 'BEARISH',
      brk.startIndex,
      brk.formationTime,
      entry,
      sl,
      tp,
      `Failed order block flipped polarity at [${brk.bottomPrice.toFixed(2)} - ${brk.topPrice.toFixed(2)}].`
    ));
  }

  // ── Strategy 8: Premium & Discount Dealing Ranges (OTE)
  if (dealingRange.highPrice > dealingRange.lowPrice) {
    const p = lastPrice;
    const isDiscount = p < dealingRange.equilibriumPrice;
    const oteLow = dealingRange.oteRange[0];
    const oteHigh = dealingRange.oteRange[1];
    if (isDiscount && oteLow > 0) {
      setups.push(makeSetup(
        `setup_dr_ote_bull`,
        'Discount Dealing Range OTE Long',
        'PREMIUM_DISCOUNT_OTE',
        'BULLISH',
        candles.length - 1,
        lastCandle.openTime,
        (oteLow + oteHigh) / 2,
        dealingRange.lowPrice * 0.995,
        dealingRange.highPrice,
        `Price in Discount territory (< 50% EQ ₹${dealingRange.equilibriumPrice.toFixed(2)}), OTE 61.8-78.6% zone.`
      ));
    } else if (!isDiscount && oteHigh > 0) {
      setups.push(makeSetup(
        `setup_dr_ote_bear`,
        'Premium Dealing Range OTE Short',
        'PREMIUM_DISCOUNT_OTE',
        'BEARISH',
        candles.length - 1,
        lastCandle.openTime,
        (oteLow + oteHigh) / 2,
        dealingRange.highPrice * 1.005,
        dealingRange.lowPrice,
        `Price in Premium territory (> 50% EQ ₹${dealingRange.equilibriumPrice.toFixed(2)}), OTE 61.8-78.6% zone.`
      ));
    }
  }

  // ── Strategy 9: Multi-Timeframe SMC Confluence
  if (breaks.length >= 2 && activeObs.length >= 1) {
    const lastBrk = breaks[breaks.length - 1];
    const matchingOb = activeObs.find((o) => o.isBullish === lastBrk.isBullish);
    if (matchingOb) {
      const isBull = lastBrk.isBullish;
      setups.push(makeSetup(
        `setup_mtf_${lastBrk.candleIndex}`,
        isBull ? 'Multi-Timeframe SMC Alignment (Bullish)' : 'Multi-Timeframe SMC Alignment (Bearish)',
        'MTF_CONFLUENCE',
        isBull ? 'BULLISH' : 'BEARISH',
        lastBrk.candleIndex,
        lastBrk.time,
        (matchingOb.topPrice + matchingOb.bottomPrice) / 2,
        isBull ? matchingOb.bottomPrice * 0.997 : matchingOb.topPrice * 1.003,
        isBull ? dealingRange.highPrice : dealingRange.lowPrice,
        `HTF structural bias aligns with intermediate OB at ₹${((matchingOb.topPrice + matchingOb.bottomPrice) / 2).toFixed(2)}.`
      ));
    }
  }

  // ── Strategy 10: Session Liquidity
  if (sessionLevels.pdh && sessionLevels.pdl) {
    if (lastCandle.high > sessionLevels.pdh && lastCandle.close < sessionLevels.pdh) {
      setups.push(makeSetup(
        `setup_sess_pdh`,
        'Previous Day High (PDH) Session Sweep',
        'SESSION_LIQUIDITY',
        'BEARISH',
        candles.length - 1,
        lastCandle.openTime,
        lastPrice,
        lastCandle.high * 1.003,
        sessionLevels.pdl,
        `PDH at ₹${sessionLevels.pdh.toFixed(2)} swept with rejection back into range.`
      ));
    } else if (lastCandle.low < sessionLevels.pdl && lastCandle.close > sessionLevels.pdl) {
      setups.push(makeSetup(
        `setup_sess_pdl`,
        'Previous Day Low (PDL) Session Sweep',
        'SESSION_LIQUIDITY',
        'BULLISH',
        candles.length - 1,
        lastCandle.openTime,
        lastPrice,
        lastCandle.low * 0.997,
        sessionLevels.pdh,
        `PDL at ₹${sessionLevels.pdl.toFixed(2)} swept with rejection back into range.`
      ));
    }
  }

  // ── Strategy 11: 3-Stage Reversal (Sweep + CHoCH + FVG)
  if (sweeps.length > 0 && breaks.length > 0 && fvgs.length > 0) {
    const sw = sweeps[sweeps.length - 1];
    const ch = breaks.find((b) => (b.breakType === 'CHoCH' || b.breakType === 'MSS') && b.candleIndex > sw.candleIndex);
    if (ch) {
      const fvg = fvgs.find((f) => !f.isInverse && f.startIndex >= ch.candleIndex && f.isBullish === ch.isBullish && !f.isInvalidated && !f.isMitigated && f.state !== 'MITIGATED' && f.state !== 'INVALIDATED');
      if (fvg) {
        const isBull = ch.isBullish;
        setups.push(makeSetup(
          `setup_3stage_${fvg.id}`,
          isBull ? '3-Stage Reversal (Sweep + CHoCH + FVG Bullish)' : '3-Stage Reversal (Sweep + CHoCH + FVG Bearish)',
          'THREE_STAGE_REVERSAL',
          isBull ? 'BULLISH' : 'BEARISH',
          fvg.startIndex,
          fvg.formationTime,
          fvg.cePrice,
          isBull ? fvg.bottomPrice * 0.997 : fvg.topPrice * 1.003,
          isBull ? dealingRange.highPrice : dealingRange.lowPrice,
          `High-probability 3-stage confluence: Stage 1 Sweep -> Stage 2 CHoCH -> Stage 3 FVG Retrace.`
        ));
      }
    }
  }

  // ── Strategy 12: BOS + Displacement + FVG Retest
  const bosWithFvg = breaks.find((b) => b.breakType === 'BOS');
  if (bosWithFvg) {
    const nearbyFvg = fvgs.find((f) => !f.isInverse && Math.abs(f.startIndex - bosWithFvg.candleIndex) <= 2 && f.isBullish === bosWithFvg.isBullish && !f.isInvalidated && !f.isMitigated && f.state !== 'MITIGATED' && f.state !== 'INVALIDATED');
    if (nearbyFvg) {
      const isBull = bosWithFvg.isBullish;
      setups.push(makeSetup(
        `setup_bos_fvg_${nearbyFvg.id}`,
        isBull ? 'BOS + Displacement + FVG Retest (Bullish)' : 'BOS + Displacement + FVG Retest (Bearish)',
        'BOS_FVG_RETEST',
        isBull ? 'BULLISH' : 'BEARISH',
        nearbyFvg.startIndex,
        nearbyFvg.formationTime,
        nearbyFvg.cePrice,
        isBull ? nearbyFvg.bottomPrice * 0.998 : nearbyFvg.topPrice * 1.002,
        isBull ? dealingRange.highPrice : dealingRange.lowPrice,
        `Impulse BOS accompanied by active FVG [₹${nearbyFvg.bottomPrice.toFixed(2)} - ₹${nearbyFvg.topPrice.toFixed(2)}].`
      ));
    }
  }

  // ── Strategy 13: Order Block + FVG Confluence
  for (const ob of activeObs) {
    const overlappingFvg = fvgs.find(
      (f) => !f.isInverse && f.isBullish === ob.isBullish && !f.isInvalidated && !f.isMitigated && f.state !== 'MITIGATED' && f.state !== 'INVALIDATED' && Math.abs(f.startIndex - ob.startIndex) <= 3
    );
    if (overlappingFvg) {
      const isBull = ob.isBullish;
      setups.push(makeSetup(
        `setup_ob_fvg_${ob.id}`,
        isBull ? 'Order Block + FVG Confluence (Bullish)' : 'Order Block + FVG Confluence (Bearish)',
        'OB_FVG_CONFLUENCE',
        isBull ? 'BULLISH' : 'BEARISH',
        ob.startIndex,
        ob.formationTime,
        (ob.topPrice + overlappingFvg.cePrice) / 2,
        isBull ? ob.bottomPrice * 0.997 : ob.topPrice * 1.003,
        isBull ? dealingRange.highPrice : dealingRange.lowPrice,
        `Strong confluence: Order Block overlaps with Fair Value Gap at ₹${overlappingFvg.cePrice.toFixed(2)}.`
      ));
      break;
    }
  }

  // ── Strategy 14: Inducement + Liquidity Sweep
  if (swings.length >= 4 && activeObs.length > 0) {
    const lastSwing = swings[swings.length - 1];
    const prevSwing = swings[swings.length - 2];
    const ob = activeObs[activeObs.length - 1];
    if (lastSwing.isHigh !== ob.isBullish) {
      const isBull = ob.isBullish;
      setups.push(makeSetup(
        `setup_inducement_${lastSwing.index}`,
        isBull ? 'Inducement Low Sweep into Demand OB' : 'Inducement High Sweep into Supply OB',
        'INDUCEMENT_SWEEP',
        isBull ? 'BULLISH' : 'BEARISH',
        lastSwing.index,
        lastSwing.time,
        (ob.topPrice + ob.bottomPrice) / 2,
        isBull ? ob.bottomPrice * 0.997 : ob.topPrice * 1.003,
        isBull ? dealingRange.highPrice : dealingRange.lowPrice,
        `Internal trap swing cleared at ₹${lastSwing.price.toFixed(2)} prior to institutional order block tap.`
      ));
    }
  }

  // ── Strategy 15: Power of Three / AMD
  if (candles.length >= 25 && sweeps.length > 0) {
    const sw = sweeps[sweeps.length - 1];
    if (sw.candleIndex >= candles.length - 10) {
      const isBull = !sw.isHighSweep; // Manipulation below accumulation -> Bullish distribution
      setups.push(makeSetup(
        `setup_amd_${sw.candleIndex}`,
        isBull ? 'Power of Three (AMD) Bullish Expansion' : 'Power of Three (AMD) Bearish Expansion',
        'POWER_OF_THREE_AMD',
        isBull ? 'BULLISH' : 'BEARISH',
        sw.candleIndex,
        sw.time,
        lastPrice,
        isBull ? sw.price * 0.996 : sw.price * 1.004,
        isBull ? dealingRange.highPrice : dealingRange.lowPrice,
        `Accumulation range false breakout (Judas sweep) followed by explosive distribution wave.`
      ));
    }
  }

  // ── Strategy 16: Inverse Fair Value Gap (IFVG)
  const invalidatedFvgs = fvgs.filter((f) => f.isInvalidated).slice(-2);
  for (const ifvg of invalidatedFvgs) {
    const isBull = !ifvg.isBullish; // Violated bearish FVG becomes bullish support
    const entry = ifvg.cePrice;
    const sl = isBull ? ifvg.bottomPrice * 0.996 : ifvg.topPrice * 1.004;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    setups.push(makeSetup(
      `setup_ifvg_${ifvg.id}`,
      isBull ? 'Inverse Fair Value Gap (IFVG Bullish Support)' : 'Inverse Fair Value Gap (IFVG Bearish Resistance)',
      'INVERSE_FVG',
      isBull ? 'BULLISH' : 'BEARISH',
      ifvg.startIndex,
      ifvg.formationTime,
      entry,
      sl,
      tp,
      `Failed ${ifvg.isBullish ? 'Bullish' : 'Bearish'} FVG flipped polarity: body close through boundary creates IFVG.`
    ));
  }

  return setups;
}

// ── Backwards-Compatible Wrapper for Legacy Tests ───────────────────────────

export function detectConfirmedSetups(
  candles: Candle[],
  breaks: SmcStructureBreak[],
  sweeps: SmcLiquiditySweep[],
  orderBlocks: SmcOrderBlock[],
  fvgs: SmcFvg[],
  dealingRange: SmcDealingRange
): SmcConfirmedSetup[] {
  const swings = detectSwingPoints(candles, 3);
  const sessionLevels = detectSessionLevels(candles);
  return detectAll16SmcSetups(
    candles,
    swings,
    breaks,
    sweeps,
    orderBlocks,
    [],
    fvgs,
    dealingRange,
    sessionLevels
  );
}

// ── 9. True 64-bit BigInt FNV-1a Dataset Hashing & LRU Cache ─────────────────

const FNV_OFFSET_BASIS_64 = BigInt('0xcbf29ce484222325');
const FNV_PRIME_64 = BigInt('0x00000100000001b3');
const MASK_64 = BigInt('0xffffffffffffffff');

export function computeCandleDatasetHash64(candles: Candle[]): string {
  const buffer = new ArrayBuffer(48);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let hash = FNV_OFFSET_BASIS_64;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    view.setFloat64(0, c.openTime, true);
    view.setFloat64(8, c.open, true);
    view.setFloat64(16, c.high, true);
    view.setFloat64(24, c.low, true);
    view.setFloat64(32, c.close, true);
    view.setFloat64(40, c.volume, true);

    for (let b = 0; b < 48; b++) {
      hash = ((hash ^ BigInt(bytes[b])) * FNV_PRIME_64) & MASK_64;
    }
  }

  return hash.toString(16).padStart(16, '0');
}

export function computeCandlesFingerprint(
  symbol: string,
  timeframe: string,
  candles: Candle[],
  dataVersion?: number
): string {
  const hashHex = computeCandleDatasetHash64(candles);
  const versionSegment = dataVersion !== undefined ? `v${dataVersion}:` : '';
  return `${symbol}:${timeframe}:${versionSegment}${candles.length}:${hashHex}`;
}

const SMC_CACHE_MAX_ENTRIES = 500;
const _smcMemoryCache = new Map<string, SmcAnalysis>();

// ── Master SMC Calculation Function ────────────────────────────────────────

export function calculateSMC(
  candles: Candle[],
  config?: Partial<SmcConfig>,
  symbol = 'UNKNOWN',
  timeframe = '1D',
  dataVersion?: number
): SmcAnalysis {
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
      allSetups: [],
      equilibriumPrice: p,
    };
  }

  // Compute True 64-bit BigInt Fingerprint for Cache Check
  const fingerprint = computeCandlesFingerprint(symbol, timeframe, candles, dataVersion);
  const cached = _smcMemoryCache.get(fingerprint);
  if (cached) {
    return cached;
  }

  const opt = config?.filters;

  // 1. Detect Swings (with dual timestamps)
  const swings = detectSwingPoints(candles, config?.swingLength ?? 3);

  // 2. Detect Structure Breaks (BOS vs CHoCH / MSS with configurable displacement & volume)
  const structureBreaks = detectStructureBreaks(candles, swings, opt);

  // 3. Detect Liquidity Levels & Mirrored Sweeps
  const { levels: liquidityLevels, sweeps } = detectLiquidity(candles, swings);

  // 4. Detect Order Blocks & Breakers
  const { orderBlocks, breakers } = detectOrderBlocksAndBreakers(candles, structureBreaks);

  // 5. Detect Fair Value Gaps (FVGs) with Invalidation-First Waterfall
  const fvgs = detectFairValueGaps(candles);

  // 6. Detect Dealing Range & Equilibrium
  const dealingRange = detectDealingRange(candles, swings);

  // 7. Detect Key Historical Session Levels
  const sessionLevels = detectSessionLevels(candles);

  // 8. Detect All 16 Confirmed SMC Setups
  const allSetups = detectAll16SmcSetups(
    candles,
    swings,
    structureBreaks,
    sweeps,
    orderBlocks,
    breakers,
    fvgs,
    dealingRange,
    sessionLevels,
    opt
  );

  // Directional filtering across all enabled SMC strategies
  const isBullAllowed = config?.showBullishSetups !== false;
  const isBearAllowed = config?.showBearishSetups !== false;

  const filteredSetups = allSetups.filter((s) => {
    if (s.direction === 'BULLISH' && !isBullAllowed) return false;
    if (s.direction === 'BEARISH' && !isBearAllowed) return false;
    return true;
  });

  const confirmedSetups = filteredSetups.filter((s) => s.status === 'CONFIRMED' || s.status === 'RETESTING');

  const result: SmcAnalysis = {
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
    allSetups: filteredSetups,
    equilibriumPrice: dealingRange.equilibriumPrice,
    datasetFingerprint: fingerprint,
  };

  // Cache Management (LRU Eviction)
  if (_smcMemoryCache.size >= SMC_CACHE_MAX_ENTRIES) {
    const firstKey = _smcMemoryCache.keys().next().value;
    if (firstKey) _smcMemoryCache.delete(firstKey);
  }
  _smcMemoryCache.set(fingerprint, result);

  return result;
}
