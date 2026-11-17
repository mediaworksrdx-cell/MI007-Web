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
  confirmationTime: number; // T_{i+R} close (Zero look-ahead signal availability)
  /** Index of the bar whose close confirms this swing (index + lookback). Swing is unusable before this bar closes. */
  confirmationIndex?: number;
  significance?: 'MAJOR' | 'MINOR';
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
  protectedSwingPrice?: number;
  confirmationTime: number;
  structureType?: 'INTERNAL' | 'EXTERNAL';
  confirmationType?: 'CANDLE_CLOSE' | 'WICK';
  displacementMultiple?: number;
  volumeRatio?: number;
  significance?: 'MAJOR' | 'MINOR';
}

export interface SmcLiquidityLevel {
  id: string;
  price: number;
  type: 'BSL' | 'SSL' | 'EQH' | 'EQL';
  label: string;
  candleIndices: number[];
  isSwept: boolean;
  sweepCandleIndex?: number;
  subtype?: 'BSL' | 'SSL' | 'EQH' | 'EQL' | 'PDH' | 'PDL' | 'PWH' | 'PWL' | 'SESSION_ASIAN' | 'SESSION_LONDON' | 'SESSION_NY' | 'INDUCEMENT';
  isInternal?: boolean;
  isInducement?: boolean;
}

export interface SmcLiquiditySweep {
  candleIndex: number;
  time: number;
  price: number;
  isHighSweep: boolean;
  label: string;
  sweptLevelPrice: number;
  wickRatio: number; // Upper wick for BSL, lower wick for SSL
  isGenuineSweep?: boolean;
  rejectionConfirmed?: boolean;
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
  mitigationState?: 'FRESH' | 'PARTIALLY_MITIGATED' | 'MITIGATED' | 'INVALIDATED';
  volumeRatio: number;
  label: string;
  formationTime: number;
  isExternal?: boolean;
  displacementAtr?: number;
  originatingCandleIndex?: number;
  clusterSize?: number;
  /** Bar index at which this zone became known (linked structure break / breaker conversion). */
  confirmationIndex?: number;
  /** Index of the structural break that this OB's displacement caused (SMC-013). */
  linkedBreakIndex?: number;
  /** First bar that traded back into the zone after confirmation. */
  firstTouchIndex?: number;
  /** Breaker retest bar (SMC-018). */
  retestIndex?: number;
  /** True when volumeRatio was derived from estimated (synthetic) volume. */
  volumeEstimated?: boolean;
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
  /** Bar index at which the gap became known (third candle close / IFVG flip bar). */
  confirmationIndex?: number;
}

export interface SmcDealingRange {
  highPrice: number;
  lowPrice: number;
  equilibriumPrice: number;
  premiumRange: [number, number]; // [50%, 100%]
  discountRange: [number, number]; // [0%, 50%]
  oteRange: [number, number]; // [61.8%, 78.6%] - preserved for backwards compatibility
  discountOteRange: [number, number]; // [21.4%, 38.2%] - 61.8% to 78.6% deep retracement down into discount
  premiumOteRange: [number, number]; // [61.8%, 78.6%] - 61.8% to 78.6% retracement up into premium
}

export interface SmcSessionLevels {
  pdh?: number; // Previous Day High
  pdl?: number; // Previous Day Low
  pwh?: number; // Previous Week High
  pwl?: number; // Previous Week Low
  asianHigh?: number;
  asianLow?: number;
  londonHigh?: number;
  londonLow?: number;
  nyHigh?: number;
  nyLow?: number;
  sessionSweeps?: SmcLiquiditySweep[];
}

export interface SmcConfluenceBreakdown {
  htfAlignment: number;           // Max 20%
  liquidityConfirmation: number; // Max 15%
  marketStructure: number;       // Max 15%
  orderBlockValidity: number;    // Max 15%
  fvgConfluence: number;         // Max 10%
  displacementStrength: number;  // Max 10%
  premiumDiscount: number;       // Max 10%
  volumeConfirmation: number;    // Max 5%
}

export type SmcConfluenceTier = 'HIGH' | 'STRONG' | 'MODERATE' | 'WEAK';

export type SmcInstitutionalClass =
  | 'Bullish Institutional Setup'
  | 'Bearish Institutional Setup'
  | 'Potential Reversal'
  | 'Continuation Setup'
  | 'No Valid Setup';

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
  qualityScore: number;
  confluenceTier: SmcConfluenceTier;
  institutionalClass: SmcInstitutionalClass;
  confluenceBreakdown: SmcConfluenceBreakdown;
  auditReasons?: string[];
  htfBias?: 'BULLISH' | 'BEARISH' | 'RANGE';
  ltfBias?: 'BULLISH' | 'BEARISH' | 'RANGE';
  riskDistance?: number;
  rewardDistance?: number;
  confluenceScore?: number;
  /** RR-004: independent TP1 / TP2 tracking */
  tp1Hit?: boolean;
  tp1HitIndex?: number;
  tp2Hit?: boolean;
  tp2HitIndex?: number;
  /** RR-001: true when supplied stopLoss was invalid and had to be clamped/flagged */
  stopLossAdjusted?: boolean;
  /** RR-006: true when both SL and TP were touched inside the same bar (worst-case SL applied) */
  resolutionIndeterminate?: boolean;
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
  inducements?: SmcLiquidityLevel[];
  internalSwings?: SmcSwingPoint[];
  externalSwings?: SmcSwingPoint[];
  htfBias?: 'BULLISH' | 'BEARISH' | 'RANGE';
  ltfBias?: 'BULLISH' | 'BEARISH' | 'RANGE';
}

export interface SmcFilterOptions {
  requireDisplacement?: boolean;     // OB impulse must be >= displacementAtrMultiple × ATR(14). Default: true (SMC-016)
  displacementAtrMultiple?: number;  // Default: 1.0 × ATR(14)
  requireVolumeExpansion?: boolean;  // Default: true; auto-bypassed when volume is estimated (SMC-016, CH-003)
  volumeSmaMultiple?: number;        // Default: 1.10 × SMA(Volume, 20) excluding the displacement bar
  requireBreakDisplacement?: boolean; // Structure-break candle body >= displacementAtrMultiple × ATR. Default: false
  requireBreakVolume?: boolean;       // Structure-break candle volume expansion. Default: false
  obStructureLinkBars?: number;       // Max bars between OB and the structural break it caused. Default: 6
}

export type SmcVisualizationMode = 'clean' | 'advanced' | 'analysis';

export interface SmcConfig {
  enabled: boolean;
  visualizationMode?: SmcVisualizationMode; // 'clean' (default) | 'advanced' | 'analysis'
  enableCollisionControl?: boolean;         // Centralized Smart Annotation Collision Engine
  enableHistoricalFading?: boolean;         // Institutional age-dependent visual fading
  showMajorStructureOnly?: boolean;         // Prioritize major swing structure (HH, HL, LH, LL)
  showInternalStructure?: boolean;          // Short-term internal BOS vs Major External BOS

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
  /** RR-002: configurable risk-reward profile */
  riskProfile?: Partial<SmcRiskProfile>;
  /** SMC-006: optional independently-fetched higher-timeframe candle dataset for HTF bias */
  htfCandles?: Candle[];
}

export const DEFAULT_SMC_CONFIG: SmcConfig = {
  enabled: true,
  visualizationMode: 'clean',       // Default: Institutional Clean Mode
  enableCollisionControl: true,     // Smart collision management active by default
  enableHistoricalFading: true,     // Fade older annotations to prioritize live price action
  showMajorStructureOnly: true,     // Prioritize high-conviction major structure pivots
  showInternalStructure: false,     // Internal structure subtle/hidden in Clean mode
  swingLength: 5,                   // Institutional pivot standard (5-bar lookback for high-conviction structural swings)

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
    requireDisplacement: true,
    displacementAtrMultiple: 1.0,
    requireVolumeExpansion: true,
    volumeSmaMultiple: 1.10,
    requireBreakDisplacement: false,
    requireBreakVolume: false,
    obStructureLinkBars: 6,
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

function roundSmcPrice(price: number): number {
  const abs = Math.abs(price);
  const decimals = abs > 0 && abs < 1 ? 4 : abs < 10 ? 3 : 2;
  return Number(price.toFixed(decimals));
}

// ── 0. Shared point-in-time helpers ──────────────────────────────────────────

/** RR-005: Single source of truth for setup lifespan, shared by engine and renderer. */
export const SMC_TRADE_LIFESPAN_BARS = 50;

/** RR-002: Configurable risk-reward profile (defaults 1:1.5 and 1:2). */
export interface SmcRiskProfile {
  target1R: number;
  target2R: number;
  minRiskReward: number;
}
export const DEFAULT_SMC_RISK_PROFILE: SmcRiskProfile = { target1R: 1.5, target2R: 2.0, minRiskReward: 1.0 };

/** Median spacing between consecutive candles (robust to session gaps). */
export function inferCandleIntervalMs(candles: Candle[]): number {
  if (candles.length < 2) return 3_600_000;
  const diffs: number[] = [];
  const start = Math.max(1, candles.length - 200);
  for (let i = start; i < candles.length; i++) {
    const d = candles[i].openTime - candles[i - 1].openTime;
    if (d > 0) diffs.push(d);
  }
  if (diffs.length === 0) return 3_600_000;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

/** Time at which candle `idx` closes (i.e. when its information becomes available). */
export function candleCloseTime(candles: Candle[], idx: number, intervalMs?: number): number {
  const iv = intervalMs ?? inferCandleIntervalMs(candles);
  const c = candles[idx];
  if (!c) return 0;
  const next = candles[idx + 1];
  // Use the next bar's open when it is contiguous; otherwise open + interval (handles session gaps)
  if (next && next.openTime - c.openTime <= iv * 1.5) return next.openTime;
  return c.openTime + iv;
}

/** SMC-002: A candle is usable for signal generation only once closed. */
export function isCandleClosed(c: Candle | undefined): boolean {
  return !!c && c.isClosed !== false;
}

/** SMC-020 / SMC-036: Wilder ATR using true range. */
export function computeAtrSeries(candles: Candle[], period = 14): number[] {
  const out: number[] = [];
  let trSum = 0;
  for (let i = 0; i < candles.length; i++) {
    const cur = candles[i];
    const prev = i > 0 ? candles[i - 1] : cur;
    const tr = Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close));
    if (i < period) {
      trSum += tr;
      out.push(trSum / (i + 1));
    } else {
      out.push((out[i - 1] * (period - 1) + tr) / period);
    }
  }
  return out;
}

// ── 1. Swing Points Detection (Dual Timestamps: Formation vs Confirmation) ────

export function detectSwingPoints(
  candles: Candle[],
  lookback = 3,
  isMajor = true
): SmcSwingPoint[] {
  const rawSwings: SmcSwingPoint[] = [];
  if (candles.length < lookback * 2 + 1) return rawSwings;
  const ivMs = inferCandleIntervalMs(candles);

  for (let i = lookback; i < candles.length - lookback; i++) {
    const cur = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high > cur.high) isHigh = false;
      if (candles[j].low < cur.low) isLow = false;
    }

    const confIdx = i + lookback;
    // SMC-002: the confirming bar must be closed, otherwise the swing can still repaint
    if (!isCandleClosed(candles[confIdx])) continue;
    // SMC-007: confirmation is the CLOSE of the right-most lookback bar, not its open
    const confirmationTime = candleCloseTime(candles, confIdx, ivMs);

    if (isHigh) {
      rawSwings.push({
        index: i,
        time: cur.openTime,
        price: cur.high,
        type: 'HH',
        isHigh: true,
        formationTime: cur.openTime,
        confirmationTime,
        confirmationIndex: confIdx,
        significance: isMajor ? 'MAJOR' : 'MINOR',
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
        confirmationIndex: confIdx,
        significance: isMajor ? 'MAJOR' : 'MINOR',
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
    sw.significance = isMajor ? 'MAJOR' : 'MINOR';
  }

  return swings;
}

// ── 2. Market Structure Breaks (BOS vs CHoCH / MSS with Filters) ──────────────

export function detectStructureBreaks(
  candles: Candle[],
  swings: SmcSwingPoint[],
  options?: SmcFilterOptions,
  swingLength = 3
): SmcStructureBreak[] {
  const breaks: SmcStructureBreak[] = [];
  if (candles.length < 5 || swings.length < 2) return breaks;

  const confirmBars = Math.max(1, swingLength);
  // Structure-break filters are opt-in and separate from OB displacement filters
  const reqDisp = options?.requireBreakDisplacement ?? false;
  const dispMult = options?.displacementAtrMultiple ?? 1.0;
  const reqVol = options?.requireBreakVolume ?? false;
  const volMult = options?.volumeSmaMultiple ?? 1.10;

  const atrValues: number[] = (reqDisp || reqVol) ? computeAtrSeries(candles, 14) : [];
  const volSmaValues: number[] = [];
  if (reqVol) {
    for (let i = 0; i < candles.length; i++) {
      // SMC-015: volume baseline excludes the bar being evaluated
      let vSum = 0;
      let count = 0;
      for (let j = Math.max(0, i - 20); j < i; j++) {
        vSum += candles[j].volume;
        count++;
      }
      volSmaValues.push(count > 0 ? vSum / count : candles[i].volume);
    }
  }
  const ivMs = inferCandleIntervalMs(candles);

  let trendDirection = 0; // 1 = Bullish, -1 = Bearish
  const activeHighs: SmcSwingPoint[] = [];
  const activeLows: SmcSwingPoint[] = [];
  let swingPtr = 0;
  // SMC-001: a swing becomes active only after ITS OWN confirmation bar closed
  // (major swings use a longer lookback than `swingLength`).
  const swingConfIdx = (sw: SmcSwingPoint) => sw.confirmationIndex ?? sw.index + confirmBars;
  const orderedSwings = [...swings].sort((a, b) => swingConfIdx(a) - swingConfIdx(b));

  for (let i = 0; i < candles.length; i++) {
    // SMC-002: never generate structure on a forming candle
    if (!isCandleClosed(candles[i])) break;
    while (swingPtr < orderedSwings.length && swingConfIdx(orderedSwings[swingPtr]) <= i) {
      const sw = orderedSwings[swingPtr];
      if (sw.isHigh) {
        activeHighs.push(sw);
        if (activeHighs.length > 5) activeHighs.shift();
      } else {
        activeLows.push(sw);
        if (activeLows.length > 5) activeLows.shift();
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

    // Break Above Active Highs (Bullish BOS / CHoCH)
    if (activeHighs.length > 0 && passFilters) {
      const brokenHighIdx = activeHighs.findIndex(
        (h) => cur.close > h.price && (prev.close <= h.price || i === swingConfIdx(h))
      );
      if (brokenHighIdx !== -1) {
        const brokenHigh = activeHighs[brokenHighIdx];
        const isReversal = trendDirection === -1;
        const breakType: SmcBreakType = isReversal ? 'CHoCH' : 'BOS';
        const label = `${breakType} ↑`;
        const lastLow = activeLows[activeLows.length - 1];

        breaks.push({
          candleIndex: i,
          time: cur.openTime,
          price: brokenHigh.price,
          isBullish: true,
          type: label,
          breakType,
          swingIndex: brokenHigh.index,
          brokenSwingPrice: brokenHigh.price,
          protectedSwingPrice: lastLow?.price,
          confirmationTime: candleCloseTime(candles, i, ivMs),
          significance: brokenHigh.significance || 'MAJOR',
        });

        trendDirection = 1;
        activeHighs.splice(brokenHighIdx, 1);
      }
    }

    // Break Below Active Lows (Bearish BOS / CHoCH)
    if (activeLows.length > 0 && passFilters) {
      const brokenLowIdx = activeLows.findIndex(
        (l) => cur.close < l.price && (prev.close >= l.price || i === swingConfIdx(l))
      );
      if (brokenLowIdx !== -1) {
        const brokenLow = activeLows[brokenLowIdx];
        const isReversal = trendDirection === 1;
        const breakType: SmcBreakType = isReversal ? 'CHoCH' : 'BOS';
        const label = `${breakType} ↓`;
        const lastHigh = activeHighs[activeHighs.length - 1];

        breaks.push({
          candleIndex: i,
          time: cur.openTime,
          price: brokenLow.price,
          isBullish: false,
          type: label,
          breakType,
          swingIndex: brokenLow.index,
          brokenSwingPrice: brokenLow.price,
          protectedSwingPrice: lastHigh?.price,
          confirmationTime: candleCloseTime(candles, i, ivMs),
          significance: brokenLow.significance || 'MAJOR',
        });

        trendDirection = -1;
        activeLows.splice(brokenLowIdx, 1);
      }
    }
  }

  return breaks;
}

// ── 3. Liquidity Levels & Mirrored Sweeps (BSL / SSL / EQH / EQL) ──────────────

export function detectLiquidity(
  candles: Candle[],
  swings: SmcSwingPoint[],
  minWickRatio = 0.25
): { levels: SmcLiquidityLevel[]; sweeps: SmcLiquiditySweep[] } {
  const levels: SmcLiquidityLevel[] = [];
  const sweeps: SmcLiquiditySweep[] = [];

  const highs = swings.filter((s) => s.isHigh);
  const lows = swings.filter((s) => !s.isHigh);

  // SMC-009: volatility-adjusted equality tolerance (0.25 × ATR14 at the later swing),
  // bounded to [0.05%, 0.35%] of price so it degrades gracefully on tiny datasets.
  const atr = computeAtrSeries(candles, 14);
  const tolAt = (idx: number, price: number) => {
    const a = atr[Math.min(Math.max(0, idx), atr.length - 1)] || price * 0.002;
    return Math.min(price * 0.0035, Math.max(price * 0.0005, a * 0.25));
  };

  // SMC-008: cluster equal highs / lows into a single level per cluster
  // instead of emitting one level for every qualifying pair.
  const clusterEqual = (pts: SmcSwingPoint[], isHigh: boolean) => {
    const sorted = [...pts].sort((a, b) => a.index - b.index);
    const clusters: SmcSwingPoint[][] = [];
    for (const p of sorted) {
      let placed = false;
      for (const cl of clusters) {
        const ref = cl.reduce((s, x) => s + x.price, 0) / cl.length;
        const last = cl[cl.length - 1];
        if (p.index - last.index >= 3 && Math.abs(p.price - ref) <= tolAt(p.index, ref)) {
          cl.push(p);
          placed = true;
          break;
        }
      }
      if (!placed) clusters.push([p]);
    }
    for (const cl of clusters) {
      if (cl.length < 2) continue;
      const idxs = cl.map(x => x.index);
      levels.push({
        id: `${isHigh ? 'eqh' : 'eql'}-${idxs.join('-')}`,
        price: isHigh ? Math.max(...cl.map(x => x.price)) : Math.min(...cl.map(x => x.price)),
        type: isHigh ? 'EQH' : 'EQL',
        label: `${isHigh ? 'EQH' : 'EQL'} ($$$)`,
        candleIndices: idxs,
        isSwept: false,
      });
    }
  };
  clusterEqual(highs, true);
  clusterEqual(lows, false);

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
  // A level is only sweepable after every swing forming it has been CONFIRMED (no look-ahead).
  const confByIndex = new Map<number, number>();
  for (const s of swings) confByIndex.set(s.index, s.confirmationIndex ?? s.index);
  const levelAvailableFrom = (lvl: SmcLiquidityLevel) =>
    Math.max(...lvl.candleIndices.map(ix => confByIndex.get(ix) ?? ix));

  for (let i = 0; i < candles.length; i++) {
    const cur = candles[i];
    // SMC-002: never classify a sweep on a forming candle
    if (!isCandleClosed(cur)) break;
    const totalRange = cur.high - cur.low;
    if (totalRange <= 0) continue;
    const next = candles[i + 1];

    for (const lvl of levels) {
      if (i <= levelAvailableFrom(lvl)) continue;
      if (lvl.isSwept) continue;

      if (lvl.type === 'BSL' || lvl.type === 'EQH') {
        // Buy-Side Liquidity (BSL) Sweep: wick above level, close back below
        if (cur.high > lvl.price && cur.close < lvl.price) {
          const upperWick = cur.high - Math.max(cur.open, cur.close);
          const upperWickRatio = upperWick / totalRange;
          // SMC-010: the wick-ratio requirement is MANDATORY. Penetration depth no longer bypasses it.
          const isGenuineSweep = upperWickRatio >= minWickRatio;
          // Rejection is confirmed only when the NEXT closed bar fails to reclaim the level
          const rejectionConfirmed = !!next && isCandleClosed(next) && next.close < lvl.price;
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
            isGenuineSweep,
            rejectionConfirmed,
          });
        }
      } else if (lvl.type === 'SSL' || lvl.type === 'EQL') {
        // Sell-Side Liquidity (SSL) Sweep: wick below level, close back above
        if (cur.low < lvl.price && cur.close > lvl.price) {
          const lowerWick = Math.min(cur.open, cur.close) - cur.low;
          const lowerWickRatio = lowerWick / totalRange;
          const isGenuineSweep = lowerWickRatio >= minWickRatio;
          const rejectionConfirmed = !!next && isCandleClosed(next) && next.close > lvl.price;
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
            isGenuineSweep,
            rejectionConfirmed,
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
  breaks: SmcStructureBreak[],
  options?: SmcFilterOptions
): { orderBlocks: SmcOrderBlock[]; breakers: SmcOrderBlock[] } {
  const orderBlocks: SmcOrderBlock[] = [];
  const breakers: SmcOrderBlock[] = [];
  if (candles.length < 5) return { orderBlocks, breakers };

  const reqDisp = options?.requireDisplacement ?? true;
  const dispMult = options?.displacementAtrMultiple ?? 1.0;
  const volMult = options?.volumeSmaMultiple ?? 1.10;
  const linkBars = Math.max(1, options?.obStructureLinkBars ?? 6);
  // SMC-016 / CH-003: volume expansion is only meaningful with real exchange volume
  const volumeIsEstimated = candles.some(c => c.volumeEstimated);
  const reqVol = (options?.requireVolumeExpansion ?? true) && !volumeIsEstimated;
  const atr = computeAtrSeries(candles, 14);

  // SMC-015: SMA(volume, 20) over the 20 bars BEFORE bar j (excludes the displacement bar itself)
  const volBaseline = (j: number) => {
    let sum = 0, count = 0;
    for (let k = Math.max(0, j - 20); k < j; k++) { sum += candles[k].volume; count++; }
    return count > 0 ? sum / count : (candles[j]?.volume || 1);
  };

  const build = (i: number, isBull: boolean) => {
    const candle = candles[i];
    const next = candles[i + 1];
    // SMC-002: the impulse candle must be closed
    if (!isCandleClosed(next)) return;
    const isOpposing = isBull ? candle.close < candle.open : candle.close > candle.open;
    if (!isOpposing) return;

    const impulseBody = isBull ? next.close - next.open : next.open - next.close;
    const brokeCandle = isBull ? next.close > candle.high : next.close < candle.low;
    if (!brokeCandle || impulseBody <= 0) return;
    // SMC-014: fixed impulse threshold — a nearby break no longer lowers it
    if (impulseBody < (candle.high - candle.low) * 0.35) return;
    // SMC-020-style ATR displacement for the impulse (SMC-016 default on)
    if (reqDisp && atr[i + 1] && impulseBody < dispMult * atr[i + 1]) return;

    const ma = volBaseline(i + 1);
    const volumeRatio = next.volume / Math.max(1, ma);
    if (reqVol && next.volume < volMult * ma) return;

    // SMC-013 / SMC-014: require a same-direction structural break caused by this displacement.
    // "Caused" = break occurs within linkBars of the OB AND price never closed back through the OB
    // between the impulse and the break (the leg is unbroken from the block).
    const linked = breaks.find(b => {
      if (b.isBullish !== isBull) return false;
      if (b.candleIndex < i + 1 || b.candleIndex > i + linkBars) return false;
      for (let k = i + 1; k <= b.candleIndex; k++) {
        if (isBull ? candles[k].close < candle.low : candles[k].close > candle.high) return false;
      }
      return true;
    });
    if (!linked) return;

    // Merge adjacent same-direction blocks into one cluster
    const lastOb = orderBlocks[orderBlocks.length - 1];
    if (lastOb && lastOb.isBullish === isBull && Math.abs(lastOb.startIndex - i) <= 1) {
      lastOb.bottomPrice = Math.min(lastOb.bottomPrice, candle.low);
      lastOb.topPrice = Math.max(lastOb.topPrice, candle.high);
      lastOb.clusterSize = (lastOb.clusterSize || 1) + 1;
      return;
    }

    const ob: SmcOrderBlock = {
      id: `ob-${isBull ? 'bull' : 'bear'}-${i}`,
      startIndex: i,
      endIndex: candles.length - 1,
      topPrice: candle.high,
      bottomPrice: candle.low,
      isBullish: isBull,
      isBreaker: false,
      isMitigated: false,
      mitigationState: 'FRESH',
      volumeRatio,
      volumeEstimated: volumeIsEstimated || undefined,
      label: isBull ? 'OB (Demand)' : 'OB (Supply)',
      formationTime: candle.openTime,
      originatingCandleIndex: i,
      displacementAtr: atr[i + 1] ? impulseBody / atr[i + 1] : undefined,
      linkedBreakIndex: linked.candleIndex,
      confirmationIndex: linked.candleIndex,
      clusterSize: 1,
    };
    const mt = (ob.topPrice + ob.bottomPrice) / 2; // 50% mean threshold

    // SMC-017: progressive mitigation lifecycle, evaluated only after the OB is confirmed
    for (let k = linked.candleIndex + 1; k < candles.length; k++) {
      const bar = candles[k];
      if (!isCandleClosed(bar)) break;
      const violated = isBull ? bar.close < ob.bottomPrice : bar.close > ob.topPrice;
      if (violated) {
        ob.mitigationState = 'INVALIDATED';
        ob.isMitigated = true;
        ob.isBreaker = true;
        ob.endIndex = k;
        ob.mitigationIndex = ob.mitigationIndex ?? k;
        ob.label = isBull ? 'Breaker (Bear)' : 'Breaker (Bull)';

        // SMC-018: breaker has its own lifecycle (FRESH → retest → INVALIDATED)
        const brk: SmcOrderBlock = {
          id: `breaker-${isBull ? 'bear' : 'bull'}-${i}`,
          startIndex: k,
          endIndex: candles.length - 1,
          topPrice: ob.topPrice,
          bottomPrice: ob.bottomPrice,
          isBullish: !isBull,
          isBreaker: true,
          isMitigated: false,
          mitigationState: 'FRESH',
          mitigationIndex: k,
          volumeRatio: bar.volume / Math.max(1, volBaseline(k)),
          volumeEstimated: volumeIsEstimated || undefined,
          label: isBull ? 'Breaker (Bear)' : 'Breaker (Bull)',
          formationTime: bar.openTime,
          originatingCandleIndex: i,
          confirmationIndex: k,
        };
        for (let m = k + 1; m < candles.length; m++) {
          const b2 = candles[m];
          if (!isCandleClosed(b2)) break;
          // Breaker (now opposite polarity) invalidated by close back through its far side
          const brkInvalid = brk.isBullish ? b2.close < brk.bottomPrice : b2.close > brk.topPrice;
          if (brkInvalid) {
            brk.isMitigated = true;
            brk.mitigationState = 'INVALIDATED';
            brk.endIndex = m;
            break;
          }
          const touched = brk.isBullish ? b2.low <= brk.topPrice : b2.high >= brk.bottomPrice;
          if (touched && brk.retestIndex === undefined) {
            brk.retestIndex = m;
            brk.mitigationState = 'PARTIALLY_MITIGATED';
          }
        }
        breakers.push(brk);
        break;
      }

      const touched = isBull ? bar.low <= ob.topPrice : bar.high >= ob.bottomPrice;
      if (!touched) continue;
      if (ob.firstTouchIndex === undefined) ob.firstTouchIndex = k;
      const deep = isBull ? bar.low <= mt : bar.high >= mt;
      if (deep && ob.mitigationState !== 'MITIGATED') {
        ob.mitigationState = 'MITIGATED';
        ob.isMitigated = true;
        ob.mitigationIndex = k;
        ob.endIndex = k;
        // keep scanning: a later close-through still converts it into a breaker
      } else if (ob.mitigationState === 'FRESH') {
        ob.mitigationState = 'PARTIALLY_MITIGATED';
      }
    }
    orderBlocks.push(ob);
  };

  for (let i = 2; i < candles.length - 1; i++) {
    build(i, true);
    build(i, false);
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

  const atr = computeAtrSeries(candles, 14);
  const DISP_ATR_MULT = 1.0; // SMC-020: displacement candle range must be >= 1.0 × ATR(14)

  // Noise floor: gap must exceed 10% of ATR or 0.01% of price
  const gapFloor = (i: number, price: number) =>
    minGapThreshold || Math.max((atr[i] || 0) * 0.1, price * 0.0001);

  /**
   * SMC-021 / SMC-023: unified FVG / IFVG lifecycle with separate mitigation and invalidation paths.
   * `support` = zone acts as support (bullish FVG or bullish IFVG): fills from the top down.
   *  - INVALIDATED: a candle CLOSES beyond the far edge
   *  - MITIGATED: wicks have filled 100% of the zone but no close beyond
   *  - PARTIALLY_MITIGATED: any penetration < 100%
   */
  const trackLifecycle = (z: SmcFvg, fromIdx: number, support: boolean): number | null => {
    const height = Math.max(1e-9, z.topPrice - z.bottomPrice);
    let extreme = support ? Infinity : -Infinity;
    for (let k = fromIdx; k < candles.length; k++) {
      const bar = candles[k];
      if (!isCandleClosed(bar)) break;
      const invalid = support ? bar.close < z.bottomPrice : bar.close > z.topPrice;
      if (invalid) {
        z.state = 'INVALIDATED';
        z.isInvalidated = true;
        z.isMitigated = true;
        z.mitigationIndex = z.mitigationIndex ?? k;
        z.endIndex = k;
        z.mitigationPercent = 100;
        return k;
      }
      extreme = support ? Math.min(extreme, bar.low) : Math.max(extreme, bar.high);
      const pen = support ? (z.topPrice - extreme) / height : (extreme - z.bottomPrice) / height;
      if (pen <= 0) continue;
      const pct = Math.min(100, Math.round(pen * 100));
      z.mitigationPercent = Math.max(z.mitigationPercent, pct);
      if (pct >= 100) {
        z.state = 'MITIGATED';
        z.isMitigated = true;
        z.mitigationIndex = k;
        z.endIndex = k;
        // keep scanning — a later close-through still invalidates (and may spawn an IFVG)
      } else if (z.state === 'FRESH') {
        z.state = 'PARTIALLY_MITIGATED';
      }
      if (support) z.residualTop = Math.max(z.bottomPrice, Math.min(z.topPrice, extreme));
      else z.residualBottom = Math.min(z.topPrice, Math.max(z.bottomPrice, extreme));
    }
    return null;
  };

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1];
    const c3 = candles[i];
    // SMC-022: the gap only exists once the third candle has CLOSED
    if (!isCandleClosed(c3)) break;

    const c2Range = c2.high - c2.low;
    const refAtr = atr[i - 2] || c2Range; // ATR before the displacement bar
    const strongRange = c2Range >= DISP_ATR_MULT * refAtr;

    for (const isBull of [true, false]) {
      const body = isBull ? c2.close - c2.open : c2.open - c2.close;
      const isDisplacement = body > 0 && body >= c2Range * 0.5 && strongRange;
      const gap = isBull ? c3.low - c1.high : c1.low - c3.high;
      if (!(gap > gapFloor(i, c3.close) && isDisplacement)) continue;

      const topPrice = isBull ? c3.low : c1.low;
      const bottomPrice = isBull ? c1.high : c3.high;
      const fvg: SmcFvg = {
        id: `fvg-${isBull ? 'bull' : 'bear'}-${i - 1}`,
        startIndex: i - 1, // geometry anchor (displacement candle)
        endIndex: candles.length - 1,
        topPrice,
        bottomPrice,
        cePrice: (topPrice + bottomPrice) / 2,
        isBullish: isBull,
        isMitigated: false,
        mitigationPercent: 0,
        state: 'FRESH',
        isInvalidated: false,
        residualTop: topPrice,
        residualBottom: bottomPrice,
        // SMC-019: the gap is formed/confirmed by the THIRD candle
        formationTime: c3.openTime,
        confirmationIndex: i,
      };

      const invalidIdx = trackLifecycle(fvg, i + 1, isBull);
      fvgs.push(fvg);

      if (invalidIdx !== null) {
        // Failed gap flips polarity → Inverse FVG
        const ifvg: SmcFvg = {
          id: `ifvg-${isBull ? 'bear' : 'bull'}-${i - 1}`,
          startIndex: invalidIdx,
          endIndex: candles.length - 1,
          topPrice,
          bottomPrice,
          cePrice: (topPrice + bottomPrice) / 2,
          isBullish: !isBull,
          isMitigated: false,
          mitigationPercent: 0,
          state: 'FRESH',
          isInvalidated: false,
          isInverse: true,
          residualTop: topPrice,
          residualBottom: bottomPrice,
          formationTime: candles[invalidIdx].openTime,
          confirmationIndex: invalidIdx,
        };
        trackLifecycle(ifvg, invalidIdx + 1, !isBull);
        fvgs.push(ifvg);
      }
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
      discountOteRange: [0, 0],
      premiumOteRange: [0, 0],
    };
  }

  let highPrice = -Infinity;
  let lowPrice = Infinity;

  // SMC-024: anchor the dealing range to validated EXTERNAL (major) structure when available
  const majorOnly = swings.filter(s => s.significance === 'MAJOR');
  const structuralSwings =
    majorOnly.some(s => s.isHigh) && majorOnly.some(s => !s.isHigh) ? majorOnly : swings;
  const recentSwings = structuralSwings.slice(-10);
  const recentHighs = recentSwings.filter((s) => s.isHigh);
  const recentLows = recentSwings.filter((s) => !s.isHigh);

  if (recentHighs.length > 0 && recentLows.length > 0) {
    // Structural dealing range: anchor to the active confirmed impulse leg
    const latestHigh = recentHighs[recentHighs.length - 1];
    const latestLow = recentLows[recentLows.length - 1];

    if (latestHigh.index > latestLow.index) {
      // Upward impulse leg from latestLow to latestHigh
      lowPrice = latestLow.price;
      highPrice = latestHigh.price;
    } else {
      // Downward impulse leg from latestHigh to latestLow
      highPrice = latestHigh.price;
      lowPrice = latestLow.price;
    }
  } else {
    for (const c of candles) {
      if (c.high > highPrice) highPrice = c.high;
      if (c.low < lowPrice) lowPrice = c.low;
    }
  }

  // Active Impulse Expansion Anchor:
  // In institutional SMC, if live price or candles have broken beyond historical swing boundaries
  // after the anchor swing points formed (ongoing impulse leg / breakout),
  // the dealing range dynamically incorporates the active impulse expansion high and low.
  const anchorStart = Math.min(
    recentHighs[recentHighs.length - 1]?.index ?? (candles.length - 1),
    recentLows[recentLows.length - 1]?.index ?? (candles.length - 1)
  );
  for (let i = anchorStart; i < candles.length; i++) {
    const bar = candles[i];
    if (bar.high > highPrice) highPrice = bar.high;
    if (bar.low < lowPrice && bar.low > 0) lowPrice = bar.low;
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
  const discountOteRange: [number, number] = [
    Number((lowPrice + range * 0.214).toFixed(4)),
    Number((lowPrice + range * 0.382).toFixed(4)),
  ];
  const premiumOteRange: [number, number] = [
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
    discountOteRange,
    premiumOteRange,
  };
}

// ── 7. Previous Day / Week Session Levels ───────────────────────────────────

// SMC-027: session windows defined in each venue's LOCAL time via IANA zones (DST-aware)
const SESSION_DEFS = [
  { key: 'asian', tz: 'Asia/Tokyo', start: 9, end: 15 },          // Tokyo cash session
  { key: 'london', tz: 'Europe/London', start: 8, end: 16.5 },    // London (GMT/BST)
  { key: 'ny', tz: 'America/New_York', start: 8, end: 17 },       // New York (EST/EDT)
] as const;

const tzFormatterCache = new Map<string, Intl.DateTimeFormat>();
function localParts(ts: number, tz: string): { dateKey: string; hourDec: number } {
  let f = tzFormatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    tzFormatterCache.set(tz, f);
  }
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(new Date(ts))) p[part.type] = part.value;
  return { dateKey: `${p.year}-${p.month}-${p.day}`, hourDec: Number(p.hour) + Number(p.minute) / 60 };
}

export function detectSessionLevels(candles: Candle[]): SmcSessionLevels {
  if (candles.length < 2) return {};

  const levels: SmcSessionLevels = {};
  const dayGroups = new Map<string, { high: number; low: number }>();
  const weekGroups = new Map<string, { high: number; low: number }>();
  // SMC-026: each session instance (e.g. "london 2026-11-16") is tracked independently
  const sessionGroups: Record<string, Map<string, { high: number; low: number }>> = {
    asian: new Map(), london: new Map(), ny: new Map(),
  };
  const intervalMs = inferCandleIntervalMs(candles);
  const isIntraday = intervalMs < 86_400_000;

  for (const c of candles) {
    const d = new Date(c.openTime);
    const dayKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    const dayOfWeek = (d.getUTCDay() + 6) % 7; // 0 = Monday
    const monDate = new Date(Math.floor(c.openTime / 86_400_000) * 86_400_000 - dayOfWeek * 86_400_000);
    const weekKey = `${monDate.getUTCFullYear()}-${monDate.getUTCMonth()}-${monDate.getUTCDate()}`;

    const curDay = dayGroups.get(dayKey);
    if (!curDay) dayGroups.set(dayKey, { high: c.high, low: c.low });
    else { curDay.high = Math.max(curDay.high, c.high); curDay.low = Math.min(curDay.low, c.low); }

    const curWeek = weekGroups.get(weekKey);
    if (!curWeek) weekGroups.set(weekKey, { high: c.high, low: c.low });
    else { curWeek.high = Math.max(curWeek.high, c.high); curWeek.low = Math.min(curWeek.low, c.low); }

    if (!isIntraday) continue; // session ranges are meaningless on daily+ bars
    for (const s of SESSION_DEFS) {
      const { dateKey, hourDec } = localParts(c.openTime, s.tz);
      if (hourDec >= s.start && hourDec < s.end) {
        const g = sessionGroups[s.key];
        const cur = g.get(dateKey);
        if (!cur) g.set(dateKey, { high: c.high, low: c.low });
        else { cur.high = Math.max(cur.high, c.high); cur.low = Math.min(cur.low, c.low); }
      }
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

  // Most recent instance of each session (not the all-history extreme)
  const latest = (m: Map<string, { high: number; low: number }>) => {
    const vals = Array.from(m.values());
    return vals[vals.length - 1];
  };
  const a = latest(sessionGroups.asian);
  if (a) { levels.asianHigh = a.high; levels.asianLow = a.low; }
  const l = latest(sessionGroups.london);
  if (l) { levels.londonHigh = l.high; levels.londonLow = l.low; }
  const n = latest(sessionGroups.ny);
  if (n) { levels.nyHigh = n.high; levels.nyLow = n.low; }

  return levels;
}

// ── 7.5 Institutional Confluence Engine & Setup Quality Scoring ──────────────

/** Previous-UTC-day high/low as of bar `idx` (point-in-time, no future candles). */
function prevDayLevelsAt(candles: Candle[], idx: number): { pdh?: number; pdl?: number } {
  const dayOf = (t: number) => Math.floor(t / 86_400_000);
  const today = dayOf(candles[idx].openTime);
  let k = idx;
  while (k >= 0 && dayOf(candles[k].openTime) === today) k--;
  if (k < 0) return {};
  const prevDay = dayOf(candles[k].openTime);
  let pdh = -Infinity, pdl = Infinity;
  while (k >= 0 && dayOf(candles[k].openTime) === prevDay) {
    pdh = Math.max(pdh, candles[k].high);
    pdl = Math.min(pdl, candles[k].low);
    k--;
  }
  return Number.isFinite(pdh) ? { pdh, pdl } : {};
}

/** True if the zone was still active (not mitigated / invalidated) at bar `idx`. */
function zoneActiveAt(
  z: { isMitigated: boolean; mitigationIndex?: number; endIndex: number; state?: SmcFvgState; mitigationState?: string },
  idx: number,
): boolean {
  if (!z.isMitigated) return true;
  // Fully mitigated/invalidated only from endIndex (FVG) or mitigationIndex (OB) onward
  const doneAt = z.state ? z.endIndex : (z.mitigationIndex ?? z.endIndex);
  return doneAt > idx;
}

export function evaluateInstitutionalConfluence(
  setup: {
    setupType: SmcSetupType;
    direction: 'BULLISH' | 'BEARISH';
    candleIndex: number;
    entryPrice: number;
    stopLoss: number;
    targetPrice: number;
    riskReward: number;
  },
  candles: Candle[],
  context: {
    swings: SmcSwingPoint[];
    structureBreaks: SmcStructureBreak[];
    sweeps: SmcLiquiditySweep[];
    orderBlocks: SmcOrderBlock[];
    breakers: SmcOrderBlock[];
    fvgs: SmcFvg[];
    dealingRange: SmcDealingRange;
    sessionLevels?: SmcSessionLevels;
  }
): {
  qualityScore: number;
  confluenceTier: SmcConfluenceTier;
  institutionalClass: SmcInstitutionalClass;
  confluenceBreakdown: SmcConfluenceBreakdown;
  auditReasons: string[];
} {
  const isBull = setup.direction === 'BULLISH';
  const entry = setup.entryPrice;
  const auditReasons: string[] = [];
  const idx = Math.max(0, Math.min(setup.candleIndex, candles.length - 1));

  // ── Point-in-time view (SMC-025, SMC-028..031): only information available at bar `idx` ──
  const pitSwings = context.swings.filter(s => (s.confirmationIndex ?? s.index) <= idx);
  const pitBreaks = context.structureBreaks.filter(b => b.candleIndex <= idx);
  const pitSweeps = context.sweeps.filter(sw => sw.candleIndex <= idx);
  const pitObs = context.orderBlocks.filter(ob => (ob.confirmationIndex ?? ob.startIndex + 1) <= idx && zoneActiveAt(ob, idx));
  const pitBreakers = context.breakers.filter(b => (b.confirmationIndex ?? b.startIndex) <= idx && zoneActiveAt(b, idx));
  const pitFvgs = context.fvgs.filter(f => (f.confirmationIndex ?? f.startIndex + 1) <= idx && zoneActiveAt(f, idx));
  const pitDealingRange = idx >= candles.length - 1
    ? context.dealingRange
    : detectDealingRange(candles.slice(0, idx + 1), pitSwings);

  // 1. Higher-Timeframe Alignment (Max 20%) — external (major) structure only
  let htfScore = 10;
  let htfReason = 'HTF Bias: Neutral / Consolidating (+10/20)';
  const majorPit = pitSwings.filter(s => s.significance === 'MAJOR');
  const structSwings = majorPit.length >= 3 ? majorPit : pitSwings;
  if (structSwings.length >= 3) {
    const recentSwings = structSwings.slice(-4);
    const highs = recentSwings.filter(s => s.isHigh);
    const lows = recentSwings.filter(s => !s.isHigh);
    const hasHH = highs.length >= 2 && highs[highs.length - 1].price > highs[highs.length - 2].price;
    const hasHL = lows.length >= 2 && lows[lows.length - 1].price > lows[lows.length - 2].price;
    const hasLH = highs.length >= 2 && highs[highs.length - 1].price < highs[highs.length - 2].price;
    const hasLL = lows.length >= 2 && lows[lows.length - 1].price < lows[lows.length - 2].price;

    if (isBull && (hasHH || hasHL)) {
      htfScore = 20;
      htfReason = 'HTF Alignment: Confirmed Bullish Structure (Higher Highs / Lows) (+20/20)';
    } else if (!isBull && (hasLH || hasLL)) {
      htfScore = 20;
      htfReason = 'HTF Alignment: Confirmed Bearish Structure (Lower Highs / Lows) (+20/20)';
    } else if ((isBull && (hasLH || hasLL)) || (!isBull && (hasHH || hasHL))) {
      if (setup.setupType === 'CHOCH_REVERSAL' || setup.setupType === 'THREE_STAGE_REVERSAL') {
        htfScore = 14;
        htfReason = 'HTF Alignment: Structural Reversal Shift at Key Macro Extreme (+14/20)';
      } else {
        htfScore = 6;
        htfReason = 'HTF Alignment: Counter-Trend Structure (+6/20)';
      }
    } else {
      htfScore = 12;
      htfReason = 'HTF Alignment: Mixed Range Structure (+12/20)';
    }
  }
  auditReasons.push(htfReason);

  // 2. Liquidity Confirmation (Max 15%)
  let liqScore = 4;
  let liqReason = 'Liquidity: No recent sweep detected (+4/15)';
  // SMC-012 / SMC-029: most recent relevant sweep at or before the setup (within 20 bars)
  const matchingSweep = pitSweeps
    .filter(sw => idx - sw.candleIndex <= 20 && (isBull ? !sw.isHighSweep : sw.isHighSweep))
    .sort((a, b) => b.candleIndex - a.candleIndex)[0];
  if (matchingSweep) {
    // SMC-011: explicit validation — undefined is NOT genuine
    const rejectionKnown = matchingSweep.candleIndex + 1 <= idx && matchingSweep.rejectionConfirmed === true;
    if (matchingSweep.isGenuineSweep === true && rejectionKnown) {
      liqScore = 15;
      liqReason = `Liquidity: Confirmed ${matchingSweep.label} with ${(matchingSweep.wickRatio * 100).toFixed(0)}% rejection wick + follow-through (+15/15)`;
    } else if (matchingSweep.isGenuineSweep === true) {
      liqScore = 12;
      liqReason = `Liquidity: ${matchingSweep.label} with ${(matchingSweep.wickRatio * 100).toFixed(0)}% rejection wick, follow-through unconfirmed (+12/15)`;
    } else {
      liqScore = 8;
      liqReason = `Liquidity: Minor liquidity grab at ${matchingSweep.sweptLevelPrice.toFixed(2)} — wick below threshold (+8/15)`;
    }
  } else {
    const { pdh, pdl } = prevDayLevelsAt(candles, idx);
    if (isBull && pdl && Math.abs(entry - pdl) / pdl < 0.015) {
      liqScore = 13;
      liqReason = `Liquidity: Trading at Previous Day Low (PDL) liquidity pool (+13/15)`;
    } else if (!isBull && pdh && Math.abs(entry - pdh) / pdh < 0.015) {
      liqScore = 13;
      liqReason = `Liquidity: Trading at Previous Day High (PDH) liquidity pool (+13/15)`;
    }
  }
  auditReasons.push(liqReason);

  // 3. Market Structure Alignment (Max 15%) — SMC-028: breaks at or before the setup only
  let structScore = 4;
  let structReason = 'Market Structure: Neutral / Forming (+4/15)';
  const recentBreaks = pitBreaks.filter(b => b.isBullish === isBull && idx - b.candleIndex <= 15);
  if (recentBreaks.length > 0) {
    const latestBreak = recentBreaks[recentBreaks.length - 1];
    structScore = 15;
    structReason = latestBreak.breakType === 'BOS'
      ? `Market Structure: Confirmed ${isBull ? '+BOS' : '-BOS'} trend expansion at ${latestBreak.price.toFixed(2)} (+15/15)`
      : `Market Structure: Confirmed ${isBull ? '+CHoCH' : '-CHoCH'} structural reversal at ${latestBreak.price.toFixed(2)} (+15/15)`;
  } else if (pitBreaks.length > 0) {
    structScore = 8;
    structReason = 'Market Structure: Prior structure break active (+8/15)';
  }
  auditReasons.push(structReason);

  // 4. Order Block Validity (Max 15%) — SMC-030: OBs confirmed and unmitigated at setup time
  let obScore = 3;
  let obReason = 'Order Block: Minor structural support/resistance (+3/15)';
  const matchingObs = pitObs
    .filter(ob => ob.isBullish === isBull && idx - ob.startIndex <= 30)
    .sort((a, b) => b.startIndex - a.startIndex);
  const matchingBreakers = pitBreakers
    .filter(brk => brk.isBullish === isBull)
    .sort((a, b) => b.startIndex - a.startIndex);

  if (matchingObs.length > 0) {
    const ob = matchingObs[0];
    const inRange = entry >= ob.bottomPrice && entry <= ob.topPrice;
    if (inRange) {
      const strongVol = !ob.volumeEstimated && ob.volumeRatio >= 1.25;
      obScore = strongVol ? 15 : 13;
      obReason = `Order Block: Fresh ${isBull ? 'Demand' : 'Supply'} OB [${ob.bottomPrice.toFixed(2)} - ${ob.topPrice.toFixed(2)}]${ob.volumeEstimated ? ' (volume estimated)' : ` (${ob.volumeRatio.toFixed(1)}x Vol)`} (+${obScore}/15)`;
    } else {
      obScore = 10;
      obReason = `Order Block: Unmitigated OB near dealing range (+10/15)`;
    }
  } else if (matchingBreakers.length > 0) {
    const brk = matchingBreakers[0];
    obScore = 13;
    obReason = `Order Block: Breaker Block polarity flip at [${brk.bottomPrice.toFixed(2)} - ${brk.topPrice.toFixed(2)}] (+13/15)`;
  }
  auditReasons.push(obReason);

  // 5. FVG / IFVG Confluence (Max 10%) — SMC-031 point-in-time, SMC-035 real zone intersection
  let fvgScore = 2;
  let fvgReason = 'FVG Confluence: Clean price delivery (+2/10)';
  const activeGaps = pitFvgs.filter(f => f.isBullish === isBull);
  const containing = activeGaps.find(f => entry >= f.bottomPrice && entry <= f.topPrice);
  const riskLo = Math.min(entry, setup.stopLoss);
  const riskHi = Math.max(entry, setup.stopLoss);
  const intersecting = activeGaps.find(f => f.bottomPrice <= riskHi && f.topPrice >= riskLo);
  if (containing) {
    fvgScore = 10;
    fvgReason = `FVG Confluence: Entry inside active ${containing.isInverse ? 'IFVG' : 'FVG'} [${containing.bottomPrice.toFixed(2)} - ${containing.topPrice.toFixed(2)}] (+10/10)`;
  } else if (intersecting) {
    fvgScore = 7;
    fvgReason = `FVG Confluence: Active ${intersecting.isInverse ? 'IFVG' : 'FVG'} intersects entry-to-stop zone (+7/10)`;
  } else if (activeGaps.length > 0) {
    fvgScore = 4;
    fvgReason = `FVG Confluence: Unfilled imbalance exists but does not intersect the trade zone (+4/10)`;
  }
  auditReasons.push(fvgReason);

  // 6. Displacement Strength (Max 10%) — SMC-036: true-range ATR(14) prior to the setup bar
  let dispScore = 5;
  let dispReason = 'Displacement: Standard candle expansion (+5/10)';
  if (candles.length > 15 && idx >= 15) {
    const atrSeries = computeAtrSeries(candles.slice(0, idx), 14);
    const atr = atrSeries[atrSeries.length - 1] || 0.001;
    const cur = candles[idx];
    const body = Math.abs(cur.close - cur.open);
    const atrMult = body / Math.max(1e-9, atr);
    if (atrMult >= 1.6) {
      dispScore = 10;
      dispReason = `Displacement: Strong impulse expansion (${atrMult.toFixed(1)}x ATR14) (+10/10)`;
    } else if (atrMult >= 1.1) {
      dispScore = 8;
      dispReason = `Displacement: Moderate impulse expansion (${atrMult.toFixed(1)}x ATR14) (+8/10)`;
    } else {
      dispScore = 4;
      dispReason = `Displacement: Normal candle body (${atrMult.toFixed(1)}x ATR14) (+4/10)`;
    }
  }
  auditReasons.push(dispReason);

  // 7. Premium / Discount Positioning (Max 10%) — dealing range as of the setup bar
  let pdScore = 4;
  let pdReason = 'Dealing Range: At Equilibrium (+4/10)';
  const dr = pitDealingRange;
  if (dr.highPrice > dr.lowPrice) {
    const eq = dr.equilibriumPrice;
    if (isBull) {
      if (entry < eq) {
        const [dOteMin, dOteMax] = dr.discountOteRange;
        if (entry >= dOteMin && entry <= dOteMax) {
          pdScore = 10;
          pdReason = `Dealing Range: Optimal Trade Entry (OTE 62%-79% Discount) (+10/10)`;
        } else {
          pdScore = 8;
          pdReason = `Dealing Range: In Discount Zone (< 50% Dealing Range) (+8/10)`;
        }
      } else {
        pdScore = 2;
        pdReason = `Dealing Range: In Premium Zone (Unfavorable for Longs) (+2/10)`;
      }
    } else {
      if (entry > eq) {
        const [pOteMin, pOteMax] = dr.premiumOteRange;
        if (entry >= pOteMin && entry <= pOteMax) {
          pdScore = 10;
          pdReason = `Dealing Range: Optimal Trade Entry (OTE 62%-79% Premium) (+10/10)`;
        } else {
          pdScore = 8;
          pdReason = `Dealing Range: In Premium Zone (> 50% Dealing Range) (+8/10)`;
        }
      } else {
        pdScore = 2;
        pdReason = `Dealing Range: In Discount Zone (Unfavorable for Shorts) (+2/10)`;
      }
    }
  }
  auditReasons.push(pdReason);

  // 8. Volume Confirmation (Max 5%) — CH-003: estimated volume is never scored as institutional
  let volScore = 2;
  let volReason = 'Volume: Average participation (+2/5)';
  const volWindowStart = Math.max(0, idx - 20);
  const volEstimated = candles.slice(volWindowStart, idx + 1).some(c => c.volumeEstimated);
  if (volEstimated) {
    volScore = 2;
    volReason = 'Volume: Exchange volume unavailable (estimated) — neutral score (+2/5)';
  } else if (idx >= 20) {
    let vSum = 0;
    for (let k = volWindowStart; k < idx; k++) vSum += candles[k].volume;
    const volSma = vSum / Math.max(1, idx - volWindowStart);
    const volMult = candles[idx].volume / Math.max(1, volSma);
    if (volMult >= 1.4) {
      volScore = 5;
      volReason = `Volume: High volume surge (${volMult.toFixed(1)}x Vol SMA) (+5/5)`;
    } else if (volMult >= 1.05) {
      volScore = 4;
      volReason = `Volume: Above-average volume expansion (${volMult.toFixed(1)}x Vol SMA) (+4/5)`;
    } else {
      volScore = 1;
      volReason = `Volume: Light volume participation (+1/5)`;
    }
  }
  auditReasons.push(volReason);

  const totalScore = Math.min(100, Math.max(0, htfScore + liqScore + structScore + obScore + fvgScore + dispScore + pdScore + volScore));

  let confluenceTier: SmcConfluenceTier = 'WEAK';
  if (totalScore >= 85) confluenceTier = 'HIGH';
  else if (totalScore >= 70) confluenceTier = 'STRONG';
  else if (totalScore >= 50) confluenceTier = 'MODERATE';

  let institutionalClass: SmcInstitutionalClass = 'No Valid Setup';
  if (totalScore >= 70) {
    if (setup.setupType === 'CHOCH_REVERSAL' || setup.setupType === 'THREE_STAGE_REVERSAL') {
      institutionalClass = 'Potential Reversal';
    } else if (setup.setupType === 'BOS_CONTINUATION' || setup.setupType === 'BOS_FVG_RETEST') {
      institutionalClass = 'Continuation Setup';
    } else {
      institutionalClass = isBull ? 'Bullish Institutional Setup' : 'Bearish Institutional Setup';
    }
  } else if (totalScore >= 50) {
    institutionalClass = isBull ? 'Bullish Institutional Setup' : 'Bearish Institutional Setup';
  }

  const confluenceBreakdown: SmcConfluenceBreakdown = {
    htfAlignment: htfScore,
    liquidityConfirmation: liqScore,
    marketStructure: structScore,
    orderBlockValidity: obScore,
    fvgConfluence: fvgScore,
    displacementStrength: dispScore,
    premiumDiscount: pdScore,
    volumeConfirmation: volScore,
  };

  return {
    qualityScore: totalScore,
    confluenceTier,
    institutionalClass,
    confluenceBreakdown,
    auditReasons,
  };
}

// ── 7.5. Structural Bias Evaluator (HTF & LTF Trend Separation) ─────────────

/**
 * Aggregates closed LTF bars into 4x macro bars when an independent HTF dataset
 * was not provided by the caller.
 */
function aggregateMacroCandles(candles: Candle[], factor = 4): Candle[] {
  const closed = candles.filter(isCandleClosed);
  const out: Candle[] = [];
  for (let i = 0; i + factor <= closed.length; i += factor) {
    const slice = closed.slice(i, i + factor);
    out.push({
      openTime: slice[0].openTime,
      open: slice[0].open,
      high: Math.max(...slice.map(c => c.high)),
      low: Math.min(...slice.map(c => c.low)),
      close: slice[slice.length - 1].close,
      volume: slice.reduce((s, c) => s + c.volume, 0),
      isClosed: true,
    });
  }
  return out;
}

export function computeStructureBias(
  candles: Candle[],
  swings: SmcSwingPoint[],
  breaks: SmcStructureBreak[],
  htfCandles?: Candle[]
): { htfBias: 'BULLISH' | 'BEARISH' | 'RANGE'; ltfBias: 'BULLISH' | 'BEARISH' | 'RANGE' } {
  if (!candles || candles.length < 5) {
    return { htfBias: 'RANGE', ltfBias: 'RANGE' };
  }

  // 1. HTF Bias (SMC-006): use independently supplied HTF candles if available;
  // otherwise evaluate macro swings/breaks on a 4x aggregated HTF series so HTF and LTF
  // never derive from the exact same bar resolution.
  const htfSeries = htfCandles && htfCandles.length >= 10 ? htfCandles : aggregateMacroCandles(candles, 4);
  const htfSwings = htfSeries.length >= 15 ? detectSwingPoints(htfSeries, 3, true) : swings.filter(s => s.significance !== 'MINOR');
  const htfBreaks = htfSeries.length >= 15
    ? detectStructureBreaks(htfSeries, htfSwings, undefined, 3)
    : breaks.filter(b => b.structureType === 'EXTERNAL');

  let bullHtfPoints = 0;
  let bearHtfPoints = 0;

  for (const b of htfBreaks.slice(-5)) {
    const w = (b.breakType === 'CHoCH' || b.breakType === 'MSS') ? 3 : 2;
    if (b.isBullish) bullHtfPoints += w;
    else bearHtfPoints += w;
  }

  const htfHighs = htfSwings.filter(s => s.isHigh);
  const htfLows = htfSwings.filter(s => !s.isHigh);
  if (htfHighs.length >= 2) {
    if (htfHighs[htfHighs.length - 1].price > htfHighs[htfHighs.length - 2].price) bullHtfPoints += 2;
    else bearHtfPoints += 2;
  }
  if (htfLows.length >= 2) {
    if (htfLows[htfLows.length - 1].price > htfLows[htfLows.length - 2].price) bullHtfPoints += 2;
    else bearHtfPoints += 2;
  }

  const macroSrc = htfSeries.length >= 10 ? htfSeries : candles;
  const lookback = Math.min(macroSrc.length, 20);
  let sum = 0;
  for (let i = macroSrc.length - lookback; i < macroSrc.length; i++) sum += macroSrc[i].close;
  const sma = sum / lookback;
  const lastHtfClose = macroSrc[macroSrc.length - 1].close;
  if (lastHtfClose > sma * 1.002) bullHtfPoints += 2;
  else if (lastHtfClose < sma * 0.998) bearHtfPoints += 2;

  let htfBias: 'BULLISH' | 'BEARISH' | 'RANGE' = 'RANGE';
  if (bullHtfPoints >= bearHtfPoints + 2) htfBias = 'BULLISH';
  else if (bearHtfPoints >= bullHtfPoints + 2) htfBias = 'BEARISH';

  // 2. LTF Bias (SMC-005): strictly filter to INTERNAL breaks
  let bullLtfPoints = 0;
  let bearLtfPoints = 0;
  const internalOnly = breaks.filter(b => b.structureType === 'INTERNAL');
  const recentInternalBreaks = (internalOnly.length > 0 ? internalOnly : breaks).slice(-6);
  for (const b of recentInternalBreaks) {
    const w = (b.breakType === 'CHoCH' || b.breakType === 'MSS') ? 3 : 2;
    if (b.isBullish) bullLtfPoints += w;
    else bearLtfPoints += w;
  }

  const closedCandles = candles.filter(isCandleClosed);
  const recentCandles = closedCandles.slice(-10);
  if (recentCandles.length >= 4) {
    if (recentCandles[recentCandles.length - 1].close > recentCandles[0].close) bullLtfPoints += 2;
    else bearLtfPoints += 2;
  }

  let ltfBias: 'BULLISH' | 'BEARISH' | 'RANGE' = 'RANGE';
  if (bullLtfPoints > bearLtfPoints) ltfBias = 'BULLISH';
  else if (bearLtfPoints > bullLtfPoints) ltfBias = 'BEARISH';

  return { htfBias, ltfBias };
}

// ── 7.6. Institutional Directional Signal Validation Engine ───────────────────

export type SmcDirectionalState =
  | 'BULLISH_STRUCTURAL_CONFIRMATION'
  | 'BEARISH_STRUCTURAL_CONFIRMATION'
  | 'LIQUIDITY_SWEEP_UNCONFIRMED'
  | 'CONFLICTING_SIGNALS'
  | 'CONFIRMED_REVERSAL';

export interface SmcDirectionalValidation {
  state: SmcDirectionalState;
  isValid: boolean;
  reason: string;
}

export function validateSetupDirectionalConfirmation(
  direction: 'BULLISH' | 'BEARISH',
  setupType: SmcSetupType,
  candleIndex: number,
  candles: Candle[],
  breaks: SmcStructureBreak[],
  sweeps: SmcLiquiditySweep[],
  htfBias: 'BULLISH' | 'BEARISH' | 'RANGE',
  ltfBias: 'BULLISH' | 'BEARISH' | 'RANGE'
): SmcDirectionalValidation {
  const isBull = direction === 'BULLISH';

  // Point-in-time only: never include breaks or sweeps after `candleIndex`
  const relevantBreaks = breaks
    .filter(b => b.candleIndex <= candleIndex && b.candleIndex >= Math.max(0, candleIndex - 25))
    .sort((a, b) => b.candleIndex - a.candleIndex);

  const latestBreak = relevantBreaks[0];
  const latestChoch = relevantBreaks.find(b => b.breakType === 'CHoCH' || b.breakType === 'MSS');

  const relevantSweeps = sweeps
    .filter(s => s.candleIndex <= candleIndex && s.candleIndex >= Math.max(0, candleIndex - 20))
    .sort((a, b) => b.candleIndex - a.candleIndex);
  const latestSweep = relevantSweeps[0];

  // 1. Conflict check: a recent opposing CHoCH/MSS without a subsequent break in our direction
  if (latestChoch && latestChoch.isBullish !== isBull) {
    const subsequent = relevantBreaks.find(b => b.isBullish === isBull && b.candleIndex > latestChoch.candleIndex);
    if (!subsequent) {
      return {
        state: 'CONFLICTING_SIGNALS',
        isValid: false,
        reason: `Opposing ${latestChoch.breakType} at bar #${latestChoch.candleIndex} has not been reversed; setup suppressed.`,
      };
    }
  }

  // 2. Sweep reconciliation (SMC-033): break or displacement must occur STRICTLY AFTER the sweep bar
  if (latestSweep && latestSweep.isHighSweep === !isBull) {
    const sweepCandle = candles[latestSweep.candleIndex];
    const hasBreakAfterSweep = relevantBreaks.some(b => b.isBullish === isBull && b.candleIndex > latestSweep.candleIndex);
    let hasDisplacementAfterSweep = false;
    if (sweepCandle) {
      for (let k = latestSweep.candleIndex + 1; k <= Math.min(candleIndex, candles.length - 1); k++) {
        if (isBull ? candles[k].close > sweepCandle.high : candles[k].close < sweepCandle.low) {
          hasDisplacementAfterSweep = true;
          break;
        }
      }
    }

    if (!hasBreakAfterSweep && !hasDisplacementAfterSweep) {
      return {
        state: 'LIQUIDITY_SWEEP_UNCONFIRMED',
        isValid: false,
        reason: `Liquidity sweep at ${latestSweep.sweptLevelPrice.toFixed(2)} lacks subsequent displacement or ${isBull ? 'bullish' : 'bearish'} shift.`,
      };
    }

    return {
      state: 'CONFIRMED_REVERSAL',
      isValid: true,
      reason: `Liquidity sweep at ${latestSweep.sweptLevelPrice.toFixed(2)} confirmed by subsequent structural shift.`,
    };
  }

  // 3. Structural break confirmation + counter-trend HTF/LTF check (SMC-034)
  if (latestBreak && latestBreak.isBullish === isBull) {
    const opposingHtf = isBull ? htfBias === 'BEARISH' : htfBias === 'BULLISH';
    if (opposingHtf) {
      const hasExternalReversal = relevantBreaks.some(
        b => b.isBullish === isBull && b.structureType === 'EXTERNAL' && (b.breakType === 'CHoCH' || b.breakType === 'MSS')
      );
      const ltfAligned = isBull ? ltfBias === 'BULLISH' : ltfBias === 'BEARISH';
      if (!hasExternalReversal || !ltfAligned || setupType !== 'CHOCH_REVERSAL') {
        return {
          state: 'CONFLICTING_SIGNALS',
          isValid: false,
          reason: `Counter-trend against HTF ${htfBias} bias without independent external CHoCH + LTF alignment.`,
        };
      }
    }
    return {
      state: isBull ? 'BULLISH_STRUCTURAL_CONFIRMATION' : 'BEARISH_STRUCTURAL_CONFIRMATION',
      isValid: true,
      reason: `${isBull ? 'Bullish' : 'Bearish'} ${latestBreak.breakType} confirmed structural alignment.`,
    };
  }

  // 4. SMC-032: No confirmed structural event at setup time → NEVER return isValid: true with LIQUIDITY_SWEEP_UNCONFIRMED
  return {
    state: 'LIQUIDITY_SWEEP_UNCONFIRMED',
    isValid: false,
    reason: `No confirmed ${isBull ? 'bullish' : 'bearish'} structural break or confirmed sweep at bar #${candleIndex}.`,
  };
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
  options?: SmcFilterOptions,
  biasOverride?: { htfBias?: 'BULLISH' | 'BEARISH' | 'RANGE'; ltfBias?: 'BULLISH' | 'BEARISH' | 'RANGE' },
  riskProfile?: Partial<SmcRiskProfile>
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
      swingsOrConfig?.filters,
      { htfBias: analysis.htfBias, ltfBias: analysis.ltfBias }
    );
  }

  const swings = swingsOrConfig;
  breaks = breaks || [];
  sweeps = sweeps || [];
  orderBlocks = orderBlocks || [];
  breakers = breakers || [];
  fvgs = fvgs || [];

  // Derive explicit HTF & LTF Structural Bias
  const computedBias = biasOverride?.htfBias ? { htfBias: biasOverride.htfBias, ltfBias: biasOverride.ltfBias || biasOverride.htfBias } : computeStructureBias(candles, swings, breaks);
  const htfBias = computedBias.htfBias;
  const ltfBias = computedBias.ltfBias;
  const lastPrice = candles[candles.length - 1].close;
  dealingRange = dealingRange || {
    highPrice: lastPrice * 1.05,
    lowPrice: lastPrice * 0.95,
    equilibriumPrice: lastPrice,
    premiumRange: [lastPrice, lastPrice * 1.05],
    discountRange: [lastPrice * 0.95, lastPrice],
    oteRange: [lastPrice * 0.96, lastPrice * 0.98],
    discountOteRange: [lastPrice * 0.96, lastPrice * 0.98],
    premiumOteRange: [lastPrice * 1.02, lastPrice * 1.04],
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
    const isBull = direction === 'BULLISH';

    // 1. Numerical Sanity Check
    if (
      !Number.isFinite(entryPrice) || entryPrice <= 0 ||
      !Number.isFinite(stopLoss) || stopLoss <= 0 ||
      !Number.isFinite(targetPrice) || targetPrice <= 0
    ) {
      statusOverride = 'INVALIDATED';
    }

    // 1b. SMC Proximity Invariant (±5.0% of terminal close)
    const terminalBar = candles[candles.length - 1];
    if (terminalBar && terminalBar.close > 0) {
      const priceDistancePct = Math.abs(entryPrice - terminalBar.close) / terminalBar.close;
      if (priceDistancePct > 0.05) {
        statusOverride = 'INVALIDATED';
      }
    }

    // 1c. Liquidity-Sweep & Premium/Discount Confluence Guard:
    // Do not confirm a BULLISH setup deep in Premium right after a BSL sweep (or BEARISH deep in Discount after SSL sweep)
    if (dealingRange && dealingRange.highPrice > dealingRange.lowPrice) {
      const drSpan = dealingRange.highPrice - dealingRange.lowPrice;
      const deepPremium = dealingRange.equilibriumPrice + drSpan * 0.25;
      const deepDiscount = dealingRange.equilibriumPrice - drSpan * 0.25;
      if (isBull && entryPrice > deepPremium) {
        const recentBslSweep = sweeps.some(s => s.isHighSweep && candleIndex - s.candleIndex >= 0 && candleIndex - s.candleIndex <= 6);
        if (recentBslSweep) statusOverride = 'INVALIDATED';
      } else if (!isBull && entryPrice < deepDiscount) {
        const recentSslSweep = sweeps.some(s => !s.isHighSweep && candleIndex - s.candleIndex >= 0 && candleIndex - s.candleIndex <= 6);
        if (recentSslSweep) statusOverride = 'INVALIDATED';
      }
    }

    // 2. RR-001: Directional Risk Ordering — flag & invalidate broken stops instead of silently replacing them
    let cleanStopLoss = stopLoss;
    let stopLossAdjusted = false;
    const slInvalid = isBull
      ? (!Number.isFinite(cleanStopLoss) || cleanStopLoss >= entryPrice)
      : (!Number.isFinite(cleanStopLoss) || cleanStopLoss <= entryPrice);
    if (slInvalid) {
      stopLossAdjusted = true;
      statusOverride = 'INVALIDATED';
      cleanStopLoss = roundSmcPrice(isBull ? entryPrice * 0.992 : entryPrice * 1.008);
    }
    const rawRisk = isBull ? (entryPrice - cleanStopLoss) : (cleanStopLoss - entryPrice);
    const riskDistance = rawRisk > 0 ? rawRisk : Math.max(Math.abs(entryPrice - cleanStopLoss), entryPrice * 0.005);

    // 3. RR-002 / RR-003: Configurable risk profile + honour valid strategy-supplied targets
    const rp: SmcRiskProfile = { ...DEFAULT_SMC_RISK_PROFILE, ...riskProfile };
    const suppliedTargetValid = Number.isFinite(targetPrice) && (isBull ? targetPrice > entryPrice : targetPrice < entryPrice);
    const effectiveTarget1 = suppliedTargetValid
      ? roundSmcPrice(targetPrice)
      : roundSmcPrice(isBull ? entryPrice + riskDistance * rp.target1R : entryPrice - riskDistance * rp.target1R);
    const rewardDistance = Math.abs(effectiveTarget1 - entryPrice);
    const computedRr = Number((rewardDistance / Math.max(1e-9, riskDistance)).toFixed(2));
    const targetPrice2 = roundSmcPrice(
      isBull
        ? entryPrice + Math.max(rewardDistance * (rp.target2R / rp.target1R), riskDistance * rp.target2R)
        : entryPrice - Math.max(rewardDistance * (rp.target2R / rp.target1R), riskDistance * rp.target2R)
    );
    if (computedRr < rp.minRiskReward && !statusOverride) {
      statusOverride = 'INVALIDATED';
    }

    let status: 'CONFIRMED' | 'RETESTING' | 'PENDING' | 'DETECTED' | 'FORMING' | 'ENTRY_ZONE_REACHED' | 'TARGET_HIT' | 'EXITED' | 'INVALIDATED' | 'EXPIRED' = statusOverride || 'CONFIRMED';
    let lifecycleState: SmcLifecycleState = statusOverride === 'INVALIDATED'
      ? 'INVALIDATED'
      : statusOverride === 'CONFIRMED' ? 'CONFIRMED' : (status === 'RETESTING' ? 'RETESTED' : 'CONFIRMED');
    let retestCount = 0;
    let tp1Hit = false;
    let tp1HitIndex: number | undefined;
    let tp2Hit = false;
    let tp2HitIndex: number | undefined;
    let resolutionIndeterminate = false;

    // 1. Formation bar validation
    const formBar = candles[candleIndex];
    if (formBar) {
      if (isBull ? formBar.close <= cleanStopLoss : formBar.close >= cleanStopLoss) {
        status = 'INVALIDATED';
        lifecycleState = 'INVALIDATED';
      }
    }

    // 2. RR-004 / RR-005 / RR-006: Track post-formation outcomes with shared lifespan,
    // worst-case SL-before-TP ordering, and independent TP1 & TP2 lifecycle states.
    const maxLifespanBars = SMC_TRADE_LIFESPAN_BARS;

    if (status !== 'INVALIDATED') {
      for (let k = candleIndex + 1; k < candles.length; k++) {
        const bar = candles[k];
        if (!isCandleClosed(bar)) break;

        const slTouched = isBull ? (bar.low <= cleanStopLoss || bar.close <= cleanStopLoss) : (bar.high >= cleanStopLoss || bar.close >= cleanStopLoss);
        const tp1Touched = isBull ? bar.high >= effectiveTarget1 : bar.low <= effectiveTarget1;
        const tp2Touched = isBull ? bar.high >= targetPrice2 : bar.low <= targetPrice2;

        // Worst-case SL check FIRST (RR-006)
        if (slTouched) {
          if (tp1Touched && !tp1Hit) resolutionIndeterminate = true;
          if (!tp1Hit) {
            status = 'INVALIDATED';
            lifecycleState = 'INVALIDATED';
          } else {
            // TP1 already banked; remaining position stopped out → EXITED
            status = 'EXITED';
            lifecycleState = 'EXITED';
          }
          break;
        }

        if (tp1Touched && !tp1Hit) {
          tp1Hit = true;
          tp1HitIndex = k;
          status = 'TARGET_HIT';
          lifecycleState = 'TARGET_HIT';
        }

        if (tp2Touched && !tp2Hit) {
          tp2Hit = true;
          tp2HitIndex = k;
          status = 'EXITED';
          lifecycleState = 'EXITED';
          break;
        }

        // Hard adverse failure (> 3.2% adverse close) before TP1
        if (!tp1Hit && (isBull ? bar.close < entryPrice * 0.968 : bar.close > entryPrice * 1.032)) {
          status = 'INVALIDATED';
          lifecycleState = 'INVALIDATED';
          break;
        }

        // Valid retest tap in entry zone before TP1
        if (!tp1Hit && (isBull ? (bar.low <= entryPrice && bar.close > cleanStopLoss) : (bar.high >= entryPrice && bar.close < cleanStopLoss))) {
          status = 'RETESTING';
          lifecycleState = 'RETESTED';
          retestCount++;
        }

        if (k - candleIndex >= maxLifespanBars && !tp1Hit) {
          status = 'EXPIRED';
          lifecycleState = 'EXPIRED';
          break;
        }
      }
    }

    // 3. Current Bar Reality Invariant Check
    const lastBar = candles[candles.length - 1];
    if (lastBar && (status === 'CONFIRMED' || status === 'RETESTING' || status === 'ENTRY_ZONE_REACHED')) {
      if (isBull && (lastBar.close <= cleanStopLoss || lastBar.close < entryPrice * 0.97)) {
        status = 'INVALIDATED';
        lifecycleState = 'INVALIDATED';
      } else if (!isBull && (lastBar.close >= cleanStopLoss || lastBar.close > entryPrice * 1.03)) {
        status = 'INVALIDATED';
        lifecycleState = 'INVALIDATED';
      } else if (candles.length - 1 - candleIndex >= maxLifespanBars) {
        status = 'EXPIRED';
        lifecycleState = 'EXPIRED';
      }
    }

    // RR-007: use actual next-bar open / close time rather than candles[1] - candles[0]
    const confirmationTime = candleCloseTime(candles, candleIndex);

    const confluence = evaluateInstitutionalConfluence(
      {
        setupType,
        direction,
        candleIndex,
        entryPrice: roundSmcPrice(entryPrice),
        stopLoss: roundSmcPrice(cleanStopLoss),
        targetPrice: effectiveTarget1,
        riskReward: computedRr,
      },
      candles,
      {
        swings,
        structureBreaks: breaks,
        sweeps,
        orderBlocks,
        breakers,
        fvgs,
        dealingRange,
        sessionLevels,
      }
    );

    return {
      id: `${baseId}_${time}`,
      name,
      setupType,
      direction,
      candleIndex,
      time,
      entryPrice: roundSmcPrice(entryPrice),
      stopLoss: roundSmcPrice(cleanStopLoss),
      targetPrice: effectiveTarget1,
      targetPrice2,
      riskReward: computedRr,
      status,
      lifecycleState,
      retestCount,
      description,
      invalidationLevel: roundSmcPrice(cleanStopLoss),
      formationTime: time,
      confirmationTime,
      qualityScore: confluence.qualityScore,
      confluenceTier: confluence.confluenceTier,
      institutionalClass: confluence.institutionalClass,
      confluenceBreakdown: confluence.confluenceBreakdown,
      auditReasons: confluence.auditReasons,
      htfBias,
      ltfBias,
      riskDistance: roundSmcPrice(riskDistance),
      rewardDistance: roundSmcPrice(rewardDistance),
      confluenceScore: confluence.qualityScore,
      tp1Hit,
      tp1HitIndex,
      tp2Hit,
      tp2HitIndex,
      ...(stopLossAdjusted ? { stopLossAdjusted: true } : {}),
      ...(resolutionIndeterminate ? { resolutionIndeterminate: true } : {}),
    };
  };

  // ── Strategy 1: BOS Continuation Scanner
  const recentBOS = breaks.filter((b) => b.breakType === 'BOS').slice(-8);
  for (const brk of recentBOS) {
    const isBull = brk.isBullish;
    const entry = brk.price;
    const refSwing = brk.protectedSwingPrice ?? brk.brokenSwingPrice;
    const slDist = Math.max(Math.abs(entry - refSwing), entry * 0.008);
    const sl = isBull
      ? roundSmcPrice(entry - Math.min(slDist, entry * 0.022))
      : roundSmcPrice(entry + Math.min(slDist, entry * 0.022));
    const risk = Math.max(Math.abs(entry - sl), entry * 0.005);
    const tp = isBull
      ? roundSmcPrice(entry + risk * 2.8)
      : roundSmcPrice(entry - risk * 2.8);
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
      `Decisive break of structure at ${roundSmcPrice(brk.price)} in trend direction.`
    ));
  }

  // ── Strategy 2: CHoCH / MSS Reversal Scanner
  const recentCHoCH = breaks.filter((b) => b.breakType === 'CHoCH' || b.breakType === 'MSS').slice(-8);
  for (const brk of recentCHoCH) {
    const isBull = brk.isBullish;
    const entry = brk.price;
    const refSwing = brk.protectedSwingPrice ?? brk.brokenSwingPrice;
    const slDist = Math.max(Math.abs(entry - refSwing), entry * 0.008);
    const sl = isBull
      ? roundSmcPrice(entry - Math.min(slDist, entry * 0.022))
      : roundSmcPrice(entry + Math.min(slDist, entry * 0.022));
    const risk = Math.max(Math.abs(entry - sl), entry * 0.005);
    const tp = isBull
      ? roundSmcPrice(entry + risk * 2.6)
      : roundSmcPrice(entry - risk * 2.6);
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
      `Structural ${brk.breakType} trend invalidation confirmed at ${roundSmcPrice(brk.price)}.`
    ));
  }

  // ── Strategy 3: Liquidity Sweep Reversal (Mirrored BSL/SSL)
  const recentSweeps = sweeps.slice(-8);
  for (const sw of recentSweeps) {
    const isBull = !sw.isHighSweep; // SSL sweep = Bullish reversal
    const validation = validateSetupDirectionalConfirmation(
      isBull ? 'BULLISH' : 'BEARISH',
      'LIQUIDITY_SWEEP',
      sw.candleIndex,
      candles,
      breaks,
      sweeps,
      htfBias,
      ltfBias
    );
    if (!validation.isValid) continue;

    const entry = candles[sw.candleIndex]?.close || lastPrice;
    const sl = isBull ? Number((sw.price * 0.994).toFixed(2)) : Number((sw.price * 1.006).toFixed(2));
    const risk = Math.max(Math.abs(entry - sl), entry * 0.005);
    const tp = isBull ? Number((entry + risk * 2.5).toFixed(2)) : Number((entry - risk * 2.5).toFixed(2));
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
      `Rejection wick (${(sw.wickRatio * 100).toFixed(0)}%) swept ${sw.sweptLevelPrice.toFixed(2)} liquidity pool. ${validation.reason}`
    ));
  }

  // ── Strategy 4: Equal Highs & Equal Lows (EQH / EQL Sweep)
  const eqSwept = sweeps.filter((s) => s.label.includes('EQH') || s.label.includes('EQL')).slice(-8);
  for (const eq of eqSwept) {
    const isBull = !eq.isHighSweep;
    const validation = validateSetupDirectionalConfirmation(
      isBull ? 'BULLISH' : 'BEARISH',
      'EQH_EQL_SWEEP',
      eq.candleIndex,
      candles,
      breaks,
      sweeps,
      htfBias,
      ltfBias
    );
    if (!validation.isValid) continue;

    const entry = candles[eq.candleIndex]?.close || lastPrice;
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
      `Engineered ${isBull ? 'Equal Lows' : 'Equal Highs'} pool at ${eq.sweptLevelPrice.toFixed(2)} purged. ${validation.reason}`
    ));
  }

  // ── Strategy 5: Fair Value Gap (FVG) Retracement
  const activeFvgs = fvgs.filter((f) => !f.isInverse && !f.isInvalidated && !f.isMitigated && f.state !== 'MITIGATED' && f.state !== 'INVALIDATED').slice(-8);
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
  const activeObs = orderBlocks.filter((ob) => !ob.isMitigated).slice(-8);
  for (const ob of activeObs) {
    const isBull = ob.isBullish;

    const entry = (ob.topPrice + ob.bottomPrice) / 2;
    const sl = isBull ? ob.bottomPrice * 0.997 : ob.topPrice * 1.003;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;

    // Scan if price has actively retested this unmitigated order block
    let lastRetestIdx = -1;
    let lastRetestTime = ob.formationTime;
    for (let k = ob.startIndex + 1; k < candles.length; k++) {
      const c = candles[k];
      const isRetest = isBull
        ? (c.low <= ob.topPrice && c.high >= ob.bottomPrice && c.close >= ob.bottomPrice * 0.995)
        : (c.high >= ob.bottomPrice && c.low <= ob.topPrice && c.close <= ob.topPrice * 1.005);
      if (isRetest) {
        lastRetestIdx = k;
        lastRetestTime = c.openTime;
      }
    }

    const anchorIdx = lastRetestIdx >= 0 ? lastRetestIdx : ob.startIndex;
    const anchorTime = lastRetestIdx >= 0 ? lastRetestTime : ob.formationTime;
    const statusOverride = lastRetestIdx >= 0 ? 'RETESTING' : undefined;

    // Directional validation engine audit
    const validation = validateSetupDirectionalConfirmation(
      isBull ? 'BULLISH' : 'BEARISH',
      'OB_RETEST',
      anchorIdx,
      candles,
      breaks,
      sweeps,
      htfBias,
      ltfBias
    );
    if (!validation.isValid) continue;

    setups.push(makeSetup(
      `setup_ob_${ob.id}`,
      isBull ? 'Bullish Demand Order Block Retest' : 'Bearish Supply Order Block Retest',
      'OB_RETEST',
      isBull ? 'BULLISH' : 'BEARISH',
      anchorIdx,
      anchorTime,
      entry,
      sl,
      tp,
      `High-volume ${isBull ? 'Demand' : 'Supply'} order block [${ob.bottomPrice.toFixed(2)} - ${ob.topPrice.toFixed(2)}] ${lastRetestIdx >= 0 ? 'actively retested' : 'confirmed'}. ${validation.reason}`,
      statusOverride
    ));
  }

  // ── Strategy 7: Breaker Block Role Reversal
  const activeBreakers = breakers.filter((b) => !b.isMitigated).slice(-8);
  for (const brk of activeBreakers) {
    const isBull = brk.label.includes('Bull') || (brk.isBreaker ? brk.isBullish : !brk.isBullish);

    const entry = (brk.topPrice + brk.bottomPrice) / 2;
    const sl = isBull ? brk.bottomPrice * 0.997 : brk.topPrice * 1.003;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;

    // Scan if price has actively retested this breaker block after formation/breakout
    let lastRetestIdx = -1;
    let lastRetestTime = brk.formationTime;
    for (let k = brk.startIndex + 1; k < candles.length; k++) {
      const c = candles[k];
      const isRetest = isBull
        ? (c.low <= brk.topPrice && c.high >= brk.bottomPrice && c.close >= brk.bottomPrice * 0.995)
        : (c.high >= brk.bottomPrice && c.low <= brk.topPrice && c.close <= brk.topPrice * 1.005);
      if (isRetest) {
        lastRetestIdx = k;
        lastRetestTime = c.openTime;
      }
    }

    const anchorIdx = lastRetestIdx >= 0 ? lastRetestIdx : brk.startIndex;
    const anchorTime = lastRetestIdx >= 0 ? lastRetestTime : brk.formationTime;
    const statusOverride = lastRetestIdx >= 0 ? 'RETESTING' : undefined;

    // Directional validation engine audit
    const validation = validateSetupDirectionalConfirmation(
      isBull ? 'BULLISH' : 'BEARISH',
      'BREAKER_RETEST',
      anchorIdx,
      candles,
      breaks,
      sweeps,
      htfBias,
      ltfBias
    );
    if (!validation.isValid) continue;

    setups.push(makeSetup(
      `setup_breaker_${brk.id}`,
      isBull ? 'Bullish Breaker Block Role Reversal' : 'Bearish Breaker Block Role Reversal',
      'BREAKER_RETEST',
      isBull ? 'BULLISH' : 'BEARISH',
      anchorIdx,
      anchorTime,
      entry,
      sl,
      tp,
      `Failed order block flipped polarity at [${brk.bottomPrice.toFixed(2)} - ${brk.topPrice.toFixed(2)}] ${lastRetestIdx >= 0 ? 'actively retested' : 'confirmed'}. ${validation.reason}`,
      statusOverride
    ));
  }

  // ── Strategy 8: Premium & Discount Dealing Ranges (OTE)
  if (dealingRange.highPrice > dealingRange.lowPrice) {
    const dOteMin = dealingRange.discountOteRange ? dealingRange.discountOteRange[0] : dealingRange.lowPrice + (dealingRange.highPrice - dealingRange.lowPrice) * 0.214;
    const dOteMax = dealingRange.discountOteRange ? dealingRange.discountOteRange[1] : dealingRange.lowPrice + (dealingRange.highPrice - dealingRange.lowPrice) * 0.382;
    const pOteMin = dealingRange.premiumOteRange ? dealingRange.premiumOteRange[0] : dealingRange.lowPrice + (dealingRange.highPrice - dealingRange.lowPrice) * 0.618;
    const pOteMax = dealingRange.premiumOteRange ? dealingRange.premiumOteRange[1] : dealingRange.lowPrice + (dealingRange.highPrice - dealingRange.lowPrice) * 0.786;

    // Scan recent candles (up to 12 bars back) for confirmed OTE entries
    const lookback = Math.min(candles.length, 12);

    // Bullish: Price tapped Discount OTE zone (deep discount retracement)
    for (let i = candles.length - 1; i >= candles.length - lookback; i--) {
      const c = candles[i];
      if (c.low <= dOteMax && c.high >= dOteMin && c.close >= dealingRange.lowPrice) {
        const validation = validateSetupDirectionalConfirmation(
          'BULLISH',
          'PREMIUM_DISCOUNT_OTE',
          i,
          candles,
          breaks,
          sweeps,
          htfBias,
          ltfBias
        );
        if (!validation.isValid) continue;

        const entry = Math.max(dOteMin, Math.min(dOteMax, c.close));
        const sl = dealingRange.lowPrice * 0.998;
        const tp = dealingRange.highPrice;
        if (entry > sl && tp > entry) {
          setups.push(makeSetup(
            `setup_dr_ote_bull_${i}`,
            'Discount Dealing Range OTE Long',
            'PREMIUM_DISCOUNT_OTE',
            'BULLISH',
            i,
            c.openTime,
            entry,
            sl,
            tp,
            `Price tapped institutional Discount OTE zone (62%-79% retracement [${dOteMin.toFixed(2)} - ${dOteMax.toFixed(2)}]), targeting range high. ${validation.reason}`
          ));
          break; // Retain most recent confirmed tap
        }
      }
    }

    // Bearish: Price tapped Premium OTE zone (high premium retracement)
    for (let i = candles.length - 1; i >= candles.length - lookback; i--) {
      const c = candles[i];
      if (c.high >= pOteMin && c.low <= pOteMax && c.close <= dealingRange.highPrice) {
        const validation = validateSetupDirectionalConfirmation(
          'BEARISH',
          'PREMIUM_DISCOUNT_OTE',
          i,
          candles,
          breaks,
          sweeps,
          htfBias,
          ltfBias
        );
        if (!validation.isValid) continue;

        const entry = Math.min(pOteMax, Math.max(pOteMin, c.close));
        const sl = dealingRange.highPrice * 1.002;
        const tp = dealingRange.lowPrice;
        if (entry < sl && tp < entry) {
          setups.push(makeSetup(
            `setup_dr_ote_bear_${i}`,
            'Premium Dealing Range OTE Short',
            'PREMIUM_DISCOUNT_OTE',
            'BEARISH',
            i,
            c.openTime,
            entry,
            sl,
            tp,
            `Price tapped institutional Premium OTE zone (62%-79% retracement [${pOteMin.toFixed(2)} - ${pOteMax.toFixed(2)}]), targeting range low. ${validation.reason}`
          ));
          break; // Retain most recent confirmed tap
        }
      }
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
        `HTF structural bias aligns with intermediate OB at ${((matchingOb.topPrice + matchingOb.bottomPrice) / 2).toFixed(2)}.`
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
        lastCandle.close,
        lastCandle.high * 1.003,
        sessionLevels.pdl,
        `PDH at ${sessionLevels.pdh.toFixed(2)} swept with rejection back into range.`
      ));
    } else if (lastCandle.low < sessionLevels.pdl && lastCandle.close > sessionLevels.pdl) {
      setups.push(makeSetup(
        `setup_sess_pdl`,
        'Previous Day Low (PDL) Session Sweep',
        'SESSION_LIQUIDITY',
        'BULLISH',
        candles.length - 1,
        lastCandle.openTime,
        lastCandle.close,
        lastCandle.low * 0.997,
        sessionLevels.pdh,
        `PDL at ${sessionLevels.pdl.toFixed(2)} swept with rejection back into range.`
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
        `Impulse BOS accompanied by active FVG [${nearbyFvg.bottomPrice.toFixed(2)} - ${nearbyFvg.topPrice.toFixed(2)}].`
      ));
    }
  }

  // ── Strategy 13: Order Block + FVG Confluence
  let foundBullObFvg = false;
  let foundBearObFvg = false;
  for (const ob of activeObs) {
    if (ob.isBullish && foundBullObFvg) continue;
    if (!ob.isBullish && foundBearObFvg) continue;
    const overlappingFvg = fvgs.find(
      (f) => !f.isInverse && f.isBullish === ob.isBullish && !f.isInvalidated && !f.isMitigated && f.state !== 'MITIGATED' && f.state !== 'INVALIDATED' && Math.abs(f.startIndex - ob.startIndex) <= 3
    );
    if (overlappingFvg) {
      const isBull = ob.isBullish;
      if (isBull) foundBullObFvg = true;
      else foundBearObFvg = true;
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
        `Strong confluence: Order Block overlaps with Fair Value Gap at ${overlappingFvg.cePrice.toFixed(2)}.`
      ));
      if (foundBullObFvg && foundBearObFvg) break;
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
        `Internal trap swing cleared at ${lastSwing.price.toFixed(2)} prior to institutional order block tap.`
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
        candles[sw.candleIndex]?.close || lastPrice,
        isBull ? sw.price * 0.996 : sw.price * 1.004,
        isBull ? dealingRange.highPrice : dealingRange.lowPrice,
        `Accumulation range false breakout (Judas sweep) followed by explosive distribution wave.`
      ));
    }
  }

  // ── Strategy 16: Inverse Fair Value Gap (IFVG)
  // Strictly filter out mitigated or fully violated IFVGs
  const activeInverseGaps = fvgs.filter((f) => f.isInverse && !f.isMitigated && !f.isInvalidated && f.state !== 'MITIGATED' && f.state !== 'INVALIDATED').slice(-8);
  const ifvgCandidates = activeInverseGaps.length > 0
    ? activeInverseGaps
    : fvgs.filter((f) => f.isInvalidated && !f.isMitigated && f.state !== 'MITIGATED').slice(-8);

  for (const ifvg of ifvgCandidates) {
    const isBull = ifvg.isInverse ? ifvg.isBullish : !ifvg.isBullish;
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
      `Failed ${!isBull ? 'Bullish' : 'Bearish'} FVG flipped polarity: body close through boundary creates IFVG.`
    ));
  }

  // Filter all generated setups through the Institutional Directional Validation Engine
  const validatedSetups = setups.filter((st) => {
    // If setup is already invalidated or expired, do not emit as active setup
    if (st.status === 'INVALIDATED' || st.status === 'EXPIRED') return false;

    const validation = validateSetupDirectionalConfirmation(
      st.direction,
      st.setupType,
      st.candleIndex,
      candles,
      breaks,
      sweeps,
      htfBias,
      ltfBias
    );

    if (!validation.isValid) {
      return false; // Suppress conflicting, unconfirmed, or counter-trend setups
    }

    // Attach validation state and reason to audit trail
    if (st.auditReasons) {
      st.auditReasons.push(`[${validation.state}] ${validation.reason}`);
    } else {
      st.auditReasons = [`[${validation.state}] ${validation.reason}`];
    }

    return true;
  });

  return validatedSetups;
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
  dataVersion?: number,
  config?: Partial<SmcConfig>
): string {
  // CH-017: O(1) structural fingerprint so live ticks do not re-hash all 5,000 candles on every tick
  const len = candles.length;
  const first = candles[0];
  const last = candles[len - 1];
  const prev = len > 1 ? candles[len - 2] : last;
  const tailSig = last
    ? `${first?.openTime ?? 0}:${prev?.openTime ?? 0}:${prev?.close ?? 0}:${last.openTime}:${last.high}:${last.low}:${last.close}:${last.volume}:${last.isClosed === false ? 0 : 1}`
    : 'empty';
  const versionSegment = dataVersion !== undefined ? `v${dataVersion}:` : '';
  const f = config?.filters;
  const cfgSegment = config
    ? `sw${config.swingLength ?? DEFAULT_SMC_CONFIG.swingLength}_b${config.showBullishSetups !== false ? 1 : 0}_s${config.showBearishSetups !== false ? 1 : 0}_d${f?.requireDisplacement ? f?.displacementAtrMultiple ?? 1.0 : 0}_v${f?.requireVolumeExpansion ? f?.volumeSmaMultiple ?? 1.1 : 0}_htf${config.htfCandles?.length ?? 0}:`
    : '';
  return `${symbol}:${timeframe}:${versionSegment}${cfgSegment}${len}:${tailSig}`;
}

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
  if (
    currentState === SmcLifecycleState.TARGET_HIT ||
    currentState === SmcLifecycleState.EXITED ||
    currentState === SmcLifecycleState.INVALIDATED ||
    currentState === SmcLifecycleState.EXPIRED
  ) {
    if (currentState === SmcLifecycleState.TARGET_HIT && action === 'EXIT') {
      return SmcLifecycleState.EXITED;
    }
    return currentState;
  }

  if (action === 'INVALIDATE') return SmcLifecycleState.INVALIDATED;
  if (action === 'EXPIRE') return SmcLifecycleState.EXPIRED;
  if (action === 'EXIT') return SmcLifecycleState.EXITED;

  switch (currentState) {
    case SmcLifecycleState.DETECTED:
      if (action === 'START_FORMING') return SmcLifecycleState.FORMING;
      if (action === 'CONFIRM_SETUP') return SmcLifecycleState.CONFIRMED;
      break;
    case SmcLifecycleState.FORMING:
      if (action === 'CONFIRM_SETUP') return SmcLifecycleState.CONFIRMED;
      break;
    case SmcLifecycleState.CONFIRMED:
      if (action === 'PRICE_ENTERED_ZONE') return SmcLifecycleState.ENTRY_ZONE_REACHED;
      if (action === 'CONFIRM_RETEST') return SmcLifecycleState.RETESTED;
      if (action === 'HIT_TARGET') return SmcLifecycleState.TARGET_HIT;
      break;
    case SmcLifecycleState.ENTRY_ZONE_REACHED:
      if (action === 'CONFIRM_RETEST') return SmcLifecycleState.RETESTED;
      if (action === 'HIT_TARGET') return SmcLifecycleState.TARGET_HIT;
      break;
    case SmcLifecycleState.RETESTED:
      if (action === 'HIT_TARGET') return SmcLifecycleState.TARGET_HIT;
      break;
  }

  return currentState;
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
        discountOteRange: [p * 0.96, p * 0.98],
        premiumOteRange: [p * 1.02, p * 1.04],
      },
      sessionLevels: {},
      confirmedSetups: [],
      allSetups: [],
      equilibriumPrice: p,
    };
  }

  // Compute True 64-bit BigInt Fingerprint for Cache Check (including SmcConfig)
  const fingerprint = computeCandlesFingerprint(symbol, timeframe, candles, dataVersion, config);
  const cached = _smcMemoryCache.get(fingerprint);
  if (cached) {
    return cached;
  }

  const opt = config?.filters;
  const swingLen: number = (config?.swingLength ?? DEFAULT_SMC_CONFIG.swingLength) ?? 5;

  // 1. Detect Swings (Major External Swings & Sub-Structure Internal Swings)
  const majorLookback = Math.max(7, swingLen);
  const majorSwings = detectSwingPoints(candles, majorLookback, true);
  const minorLookback = Math.max(3, Math.floor(swingLen / 2));
  const minorSwings = detectSwingPoints(candles, minorLookback, false);

  const swings = [...majorSwings];
  for (const ms of minorSwings) {
    if (!swings.some(s => Math.abs(s.index - ms.index) <= 2)) {
      swings.push(ms);
    }
  }
  swings.sort((a, b) => a.index - b.index);
  const internalSwingLen = minorLookback;
  const internalSwings = minorSwings;

  // 2. Detect Structure Breaks (SMC-003: External structure uses ONLY major swings, never combined minor swings)
  const externalBreaks = detectStructureBreaks(candles, majorSwings, opt, majorLookback);
  externalBreaks.forEach(b => { b.structureType = 'EXTERNAL'; });

  const rawInternalBreaks = detectStructureBreaks(candles, internalSwings, opt, internalSwingLen);
  rawInternalBreaks.forEach(b => { b.structureType = 'INTERNAL'; });

  // Merge structure breaks preserving order and tagging
  const structureBreaks = [...externalBreaks];
  for (const ib of rawInternalBreaks) {
    if (!structureBreaks.some(eb => Math.abs(eb.candleIndex - ib.candleIndex) <= 1 && eb.isBullish === ib.isBullish)) {
      structureBreaks.push(ib);
    }
  }
  structureBreaks.sort((a, b) => a.candleIndex - b.candleIndex);

  // 3. Detect Liquidity Levels & Mirrored Sweeps
  const { levels: liquidityLevels, sweeps } = detectLiquidity(candles, swings);

  // 4. Detect Order Blocks & Breakers
  const { orderBlocks, breakers } = detectOrderBlocksAndBreakers(candles, structureBreaks, opt);

  // 5. Detect Fair Value Gaps (FVGs) with Invalidation-First Waterfall
  const fvgs = detectFairValueGaps(candles);

  // 6. Detect Dealing Range & Equilibrium (SMC-024: major external structure swings)
  const dealingRange = detectDealingRange(candles, majorSwings);

  // 7. Detect Key Historical Session Levels
  const sessionLevels = detectSessionLevels(candles);

  // 7.5 Compute Structure Bias (SMC-006: independent HTF candles if supplied, else 4x macro aggregation)
  const { htfBias, ltfBias } = computeStructureBias(candles, swings, structureBreaks, config?.htfCandles);

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
    opt,
    { htfBias, ltfBias },
    config?.riskProfile
  );

  // Directional filtering across all enabled SMC strategies
  const isBullAllowed = config?.showBullishSetups !== false;
  const isBearAllowed = config?.showBearishSetups !== false;

  const filteredSetups = allSetups.filter((s) => {
    if (s.direction === 'BULLISH' && !isBullAllowed) return false;
    if (s.direction === 'BEARISH' && !isBearAllowed) return false;
    return true;
  });

  const confirmedSetups = filteredSetups.filter(
    (s) => s.status === 'CONFIRMED' || s.status === 'RETESTING' || s.status === 'ENTRY_ZONE_REACHED'
  );

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
    internalSwings,
    externalSwings: majorSwings, // SMC-004: strictly major swings, not the combined array
    htfBias,
    ltfBias,
  };

  // Cache Management (LRU Eviction)
  if (_smcMemoryCache.size >= SMC_CACHE_MAX_ENTRIES) {
    const firstKey = _smcMemoryCache.keys().next().value;
    if (firstKey) _smcMemoryCache.delete(firstKey);
  }
  _smcMemoryCache.set(fingerprint, result);

  return result;
}
