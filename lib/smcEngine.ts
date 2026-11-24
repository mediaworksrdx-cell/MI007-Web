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
// - Unambiguous Session Windows & IANA Timezone Awareness (Tokyo, London, New York)
// - Complete 9-State Lifecycle State Machine with single & multi-target scaling
// - True 64-bit BigInt FNV-1a Dataset Hashing & Reentrant LRU Caching
// - All 16 Institutional SMC Strategies with Stop Loss & Take Profit targets
// ═══════════════════════════════════════════════════════════════════════════

import { Candle, getInstrumentDecimals } from './types';

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
  /** Exact structural break (BOS / CHoCH) that validates this setup */
  validatingBreak?: {
    breakType: SmcBreakType;
    price: number;
    candleIndex: number;
    swingIndex?: number;
    brokenSwingPrice?: number;
  };
  /** Explicit execution state separating CONDITIONAL_SETUP, RETEST_TOUCHED, RETEST_FAILED, REJECTION_CONFIRMED, ENTRY_READY, and EXECUTED */
  signalState?: 'REJECTED' | 'WATCHLIST_ONLY' | 'CONDITIONAL_SETUP' | 'WAITING_FOR_RETEST' | 'PENDING_RETEST' | 'RETEST_TOUCHED' | 'RETEST_FAILED' | 'REJECTION_CONFIRMED' | 'RETEST_CONFIRMED' | 'ENTRY_READY' | 'ORDER_SUBMITTED' | 'EXECUTED' | 'MISSED_ENTRY' | 'EXPIRED' | 'INVALIDATED' | 'PENDING' | 'CONFIRMED';
  /** True when price has revisited/touched the entry zone after the structural break */
  retestTouched?: boolean;
  /** True when a confirmed candle closed beyond the BOS/entry reference against the trade direction */
  retestFailed?: boolean;
  /** True only when a completed directional rejection candle closed at the entry zone and price remains rejected */
  rejectionConfirmed?: boolean;
  /** True only after a completed rejection candle reclaims and holds the BOS/entry level; false for all conditional/touched setups */
  isExecutable?: boolean;
  /** True once entry confirmation (REJECTION_CONFIRMED / ENTRY_READY) freezes entryPrice, stopLoss, and targets */
  isEntryLocked?: boolean;
  /** Incremented (1, 2, ...) whenever a previously locked setup is invalidated and re-confirms on a new rejection bar */
  setupVersion?: number;
  /** Structural invalidation reference used for stop-loss placement */
  invalidationBasis?: string;
  /** Score-based system action tier (<60 Reject, 60-69 Watchlist only, 70-79 Conditional, 80-89 High-quality, 90-100 Highest-priority) */
  actionTier?: 'REJECT' | 'WATCHLIST_ONLY' | 'CONDITIONAL_SETUP' | 'HIGH_QUALITY_SETUP' | 'HIGHEST_PRIORITY_SETUP';
  /** Separate trade-quality approval from structural confirmation */
  qualityApproval?: 'REJECTED' | 'WATCHLIST_ONLY' | 'APPROVED' | 'LOW_QUALITY';
  /** True only when confirmed exchange order-fill data is present */
  confirmedOrderFill?: boolean;
  /** True when the signal was rejected (<70 quality score); permanently locked from becoming executable without a new setup */
  isRejectedPermanently?: boolean;
  /** Exact diagnostic reason why the setup was rejected */
  rejectionReason?: string;
  /** Exact candle-close timestamp (ms) when the signal was rejected */
  rejectionTimestamp?: number;
  /** Individual confluence factors that failed validation */
  rejectionFactors?: string[];
  /** Explicit entry basis label (e.g. 'BOS Level', 'Breaker 50%', 'OB 50%', 'FVG CE') */
  entryBasis?: string;
  /** Structural liquidity source for TP1 (e.g. 'Swing', 'PDL', '2.0R') */
  tp1Source?: string;
  /** Structural liquidity source for TP2 (e.g. 'PDL', 'Range Low', '3.0R') */
  tp2Source?: string;
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
  executableSetups?: SmcConfirmedSetup[];
  activeSetups?: SmcConfirmedSetup[];
  allSetups: SmcConfirmedSetup[];
  /** Unbiased setup history including stopped-out (INVALIDATED), EXPIRED, winners, and open setups (SMC-A) */
  setupHistory?: SmcConfirmedSetup[];
  rejectedSetups?: SmcConfirmedSetup[];
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
  maxRetestWaitBars?: number;         // Max bars to wait for entry-zone retest before expiring. Default: 18
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
  /** Optional lower-timeframe candle dataset to deterministically resolve same-candle TP/SL conflicts */
  ltfCandles?: Candle[];
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
  showMitigatedOb: true,

  // FVGs & IFVGs
  showBullishFvg: true,
  showBearishFvg: true,
  showBullishIfvg: true,
  showBearishIfvg: true,
  showFvgMidpoint: true,
  showMitigatedFvg: true,

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
    displacementAtrMultiple: 0.5,   // Institutional standard: 0.5x ATR(14) displacement body
    requireVolumeExpansion: true,
    volumeSmaMultiple: 1.10,
    requireBreakDisplacement: false,
    requireBreakVolume: false,
    obStructureLinkBars: 10,
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
      filters: {
        ...DEFAULT_SMC_CONFIG.filters,
        ...(parsed.filters || {}),
        displacementAtrMultiple: parsed.filters?.displacementAtrMultiple && parsed.filters.displacementAtrMultiple < 1.0
          ? parsed.filters.displacementAtrMultiple
          : 0.5,
        obStructureLinkBars: Math.max(10, parsed.filters?.obStructureLinkBars || 10),
      },
      // System decides Bullish vs. Bearish automatically from market structure & HTF bias
      showBullishSetups: true,
      showBearishSetups: true,
      showBullishStructure: true,
      showBearishStructure: true,
      showSslSweeps: parsed.showSweeps ?? true,
      showBslSweeps: parsed.showSweeps ?? true,
      showBullishBreakers: parsed.showBreakers ?? true,
      showBearishBreakers: parsed.showBreakers ?? true,
      showBullishConfluence: true,
      showBearishConfluence: true,
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

function roundSmcPrice(price: number, symbol?: string): number {
  if (!Number.isFinite(price)) return 0;
  if (symbol && symbol !== 'UNKNOWN') {
    const dec = getInstrumentDecimals(symbol, price);
    return Number(price.toFixed(dec));
  }
  const abs = Math.abs(price);
  const decimals = abs > 0 && abs < 0.0001 ? 8 : abs < 0.01 ? 6 : abs < 2 ? 4 : 2;
  return Number(price.toFixed(decimals));
}

// ── 0. Shared point-in-time helpers ──────────────────────────────────────────

/** RR-005: Single source of truth for setup lifespan, shared by engine and renderer. */
export const SMC_TRADE_LIFESPAN_BARS = 50;
export const SMC_RETEST_EXPIRY_BARS = 18;

/** RR-002: Configurable risk-reward profile (defaults 1:1.5 and 1:2). */
export interface SmcRiskProfile {
  target1R: number;
  target2R: number;
  minRiskReward: number;
}
export const DEFAULT_SMC_RISK_PROFILE: SmcRiskProfile = { target1R: 2.0, target2R: 3.0, minRiskReward: 2.0 };

/** Converts a timeframe string (e.g. '15m', '1H', '4H', '1D', '1W', '1M') to milliseconds. */
export function timeframeToMs(timeframe?: string): number {
  switch ((timeframe || '').trim()) {
    case '1m': return 60_000;
    case '3m': return 3 * 60_000;
    case '5m': return 5 * 60_000;
    case '15m': return 15 * 60_000;
    case '30m': return 30 * 60_000;
    case '1H':
    case '1h': return 60 * 60_000;
    case '4H':
    case '4h': return 4 * 60 * 60_000;
    case '1D':
    case '1d': return 24 * 60 * 60_000;
    case '1W':
    case '1w': return 7 * 24 * 60 * 60_000;
    case '1M': return 30 * 24 * 60 * 60_000;
    default: return 3_600_000;
  }
}

/**
 * Data validation guard: rejects synthetic staircase, unverified/unclosed, non-positive, or out-of-order candle arrays.
 */
export function isValidVerifiedCandleDataset(candles: Candle[] | undefined | null, timeframeMs?: number): boolean {
  if (!candles || !Array.isArray(candles) || candles.length < 5) return false;
  const ivMs = timeframeMs ?? inferCandleIntervalMs(candles);
  const nowMs = Date.now();
  let closedCount = 0;
  let identicalDeltaCount = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (!c || !Number.isFinite(c.openTime) || c.openTime <= 0) return false;
    if (!Number.isFinite(c.open) || !Number.isFinite(c.high) || !Number.isFinite(c.low) || !Number.isFinite(c.close)) return false;
    if (c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0 || c.high < c.low) return false;
    if (i > 0 && c.openTime < candles[i - 1].openTime) return false;
    if (isCandleClosed(c, ivMs, nowMs)) closedCount++;
    if (i >= 2) {
      const d1 = c.close - candles[i - 1].close;
      const d2 = candles[i - 1].close - candles[i - 2].close;
      if (d1 * d2 > 0 && Math.abs(d1) > 1e-6 && Math.abs(d1 - d2) / Math.abs(d1) < 0.0005) {
        identicalDeltaCount++;
      }
    }
  }
  if (candles.length >= 10 && identicalDeltaCount === candles.length - 2) {
    return false;
  }
  return closedCount >= 5;
}

/**
 * Resolves execution order when both TP and SL are touched within the same candle:
 * 1. Uses lower-timeframe (LTF) closed sub-candles inside [bar.openTime, nextBarOpenTime) when available.
 * 2. Otherwise falls back to intrabar open-proximity path with indeterminate flag.
 */
export function resolveSameBarTpSlOrder(
  bar: Candle,
  nextBarOpenTime: number,
  isBull: boolean,
  stopPrice: number,
  tpPrice: number,
  ltfCandles?: Candle[]
): { order: 'SL_FIRST' | 'TP_FIRST'; usedLtf: boolean } {
  if (ltfCandles && ltfCandles.length > 0) {
    for (let i = 0; i < ltfCandles.length; i++) {
      const sub = ltfCandles[i];
      if (!sub || sub.isClosed !== true) continue;
      if (sub.openTime < bar.openTime) continue;
      if (sub.openTime >= nextBarOpenTime) break;
      const slHit = isBull ? (sub.low <= stopPrice || sub.close <= stopPrice) : (sub.high >= stopPrice || sub.close >= stopPrice);
      const tpHit = isBull ? sub.high >= tpPrice : sub.low <= tpPrice;
      if (slHit && !tpHit) return { order: 'SL_FIRST', usedLtf: true };
      if (tpHit && !slHit) return { order: 'TP_FIRST', usedLtf: true };
      if (slHit && tpHit) return { order: 'SL_FIRST', usedLtf: true };
    }
  }
  return { order: 'SL_FIRST', usedLtf: false };
}

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

/** SMC-002: A candle is usable for signal generation once closed; if `isClosed` is omitted, falls back to `now >= openTime + timeframeMs`. */
export function isCandleClosed(c: Candle | undefined, timeframeMs: number = 3_600_000, nowMs: number = Date.now()): boolean {
  if (!c) return false;
  if (c.isClosed === true) return true;
  if (c.isClosed === false) return false;
  return Number.isFinite(c.openTime) && nowMs >= c.openTime + timeframeMs;
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
    let strictlyLowerLeft = false;
    let strictlyLowerRight = false;
    let strictlyHigherLeft = false;
    let strictlyHigherRight = false;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high > cur.high) isHigh = false;
      if (candles[j].low < cur.low) isLow = false;
      if (j < i) {
        if (candles[j].high < cur.high) strictlyLowerLeft = true;
        if (candles[j].low > cur.low) strictlyHigherLeft = true;
      } else {
        if (candles[j].high < cur.high) strictlyLowerRight = true;
        if (candles[j].low > cur.low) strictlyHigherRight = true;
      }
    }
    // Guard against flat / circuit-locked bars emitting phantom swings on both sides
    isHigh = isHigh && strictlyLowerLeft && strictlyLowerRight;
    isLow = isLow && strictlyHigherLeft && strictlyHigherRight;

    const confIdx = i + lookback;
    // SMC-002: the confirming bar must be closed, otherwise the swing can still repaint
    if (!isCandleClosed(candles[confIdx], ivMs)) continue;
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
      // Append-only confirmed swings: never retroactively erase an already-confirmed swing
      // (erasing prev when a later extreme forms causes partial-vs-full break instability).
      if (sw.isHigh && sw.price >= prev.price) {
        swings.push(sw);
      } else if (!sw.isHigh && sw.price <= prev.price) {
        swings.push(sw);
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
  let activeHighs: SmcSwingPoint[] = [];
  let activeLows: SmcSwingPoint[] = [];
  let protectedLowSwing: SmcSwingPoint | null = null;
  let protectedHighSwing: SmcSwingPoint | null = null;
  let swingPtr = 0;
  // SMC-001: a swing becomes active only after ITS OWN confirmation bar closed
  // (major swings use a longer lookback than `swingLength`).
  const swingConfIdx = (sw: SmcSwingPoint) => sw.confirmationIndex ?? sw.index + confirmBars;
  const orderedSwings = [...swings].sort((a, b) => swingConfIdx(a) - swingConfIdx(b));

  for (let i = 0; i < candles.length; i++) {
    // SMC-002: never generate structure on a forming candle (only break if the latest candle is forming)
    if (i === candles.length - 1 && !isCandleClosed(candles[i], ivMs)) break;
    while (swingPtr < orderedSwings.length && swingConfIdx(orderedSwings[swingPtr]) <= i) {
      const sw = orderedSwings[swingPtr];
      if (sw.isHigh) {
        activeHighs.push(sw);
        if (activeHighs.length > 5) activeHighs.shift();
        if (trendDirection === -1) protectedHighSwing = sw;
      } else {
        activeLows.push(sw);
        if (activeLows.length > 5) activeLows.shift();
        if (trendDirection === 1) protectedLowSwing = sw;
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

    // Break Above Active Highs: pick the most recent broken swing and remove all broken swings from activeHighs.
    // Classify CHoCH only when the protected swing high breaks.
    if (activeHighs.length > 0 && passFilters) {
      const brokenHighs = activeHighs.filter((h) => {
        if (swingConfIdx(h) >= i) return false;
        if (!(cur.close > h.price && prev.close <= h.price)) return false;
        for (let k = h.index + 1; k < i; k++) {
          if (candles[k].close > h.price) return false;
        }
        return true;
      });
      if (brokenHighs.length > 0) {
        const brokenHigh = brokenHighs[brokenHighs.length - 1];
        const brokeProtected = protectedHighSwing
          ? (cur.close > protectedHighSwing.price || brokenHigh.price >= protectedHighSwing.price)
          : trendDirection === -1;
        const isReversal = trendDirection === -1 && brokeProtected;
        const breakType: SmcBreakType = isReversal ? 'CHoCH' : 'BOS';
        const label = `${breakType} ↑`;
        let protectedLow = activeLows[activeLows.length - 1]?.price;
        for (let k = brokenHigh.index; k <= i; k++) {
          if (protectedLow === undefined || candles[k].low < protectedLow) {
            protectedLow = candles[k].low;
          }
        }

        breaks.push({
          candleIndex: i,
          time: cur.openTime,
          price: brokenHigh.price,
          isBullish: true,
          type: label,
          breakType,
          swingIndex: brokenHigh.index,
          brokenSwingPrice: brokenHigh.price,
          protectedSwingPrice: protectedLow,
          confirmationTime: candleCloseTime(candles, i, ivMs),
          significance: brokenHigh.significance || 'MAJOR',
        });

        trendDirection = 1;
        protectedLowSwing = activeLows[activeLows.length - 1] ?? null;
        protectedHighSwing = null;
        // Remove all broken swings from activeHighs
        activeHighs = activeHighs.filter((h) => !(swingConfIdx(h) < i && cur.close > h.price));
      }
    }

    // Break Below Active Lows: pick the most recent broken swing and remove all broken swings from activeLows.
    // Classify CHoCH only when the protected swing low breaks.
    if (activeLows.length > 0 && passFilters) {
      const brokenLows = activeLows.filter((l) => {
        if (swingConfIdx(l) >= i) return false;
        if (!(cur.close < l.price && prev.close >= l.price)) return false;
        for (let k = l.index + 1; k < i; k++) {
          if (candles[k].close < l.price) return false;
        }
        return true;
      });
      if (brokenLows.length > 0) {
        const brokenLow = brokenLows[brokenLows.length - 1];
        const brokeProtected = protectedLowSwing
          ? (cur.close < protectedLowSwing.price || brokenLow.price <= protectedLowSwing.price)
          : trendDirection === 1;
        const isReversal = trendDirection === 1 && brokeProtected;
        const breakType: SmcBreakType = isReversal ? 'CHoCH' : 'BOS';
        const label = `${breakType} ↓`;
        let protectedHigh = activeHighs[activeHighs.length - 1]?.price;
        for (let k = brokenLow.index; k <= i; k++) {
          if (protectedHigh === undefined || candles[k].high > protectedHigh) {
            protectedHigh = candles[k].high;
          }
        }

        breaks.push({
          candleIndex: i,
          time: cur.openTime,
          price: brokenLow.price,
          isBullish: false,
          type: label,
          breakType,
          swingIndex: brokenLow.index,
          brokenSwingPrice: brokenLow.price,
          protectedSwingPrice: protectedHigh,
          confirmationTime: candleCloseTime(candles, i, ivMs),
          significance: brokenLow.significance || 'MAJOR',
        });

        trendDirection = -1;
        protectedHighSwing = activeHighs[activeHighs.length - 1] ?? null;
        protectedLowSwing = null;
        // Remove all broken swings from activeLows
        activeLows = activeLows.filter((l) => !(swingConfIdx(l) < i && cur.close < l.price));
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

  const levelItems = levels.map((lvl) => {
    let avail = 0;
    for (let k = 0; k < lvl.candleIndices.length; k++) {
      const ix = lvl.candleIndices[k];
      const c = confByIndex.get(ix) ?? ix;
      if (c > avail) avail = c;
    }
    return { lvl, avail };
  });
  levelItems.sort((a, b) => a.avail - b.avail);

  const activeLevels: SmcLiquidityLevel[] = [];
  let lvlPtr = 0;
  const ivMs = inferCandleIntervalMs(candles);

  for (let i = 0; i < candles.length; i++) {
    const cur = candles[i];
    // SMC-002: never classify a sweep on a forming candle
    if (!isCandleClosed(cur, ivMs)) break;
    while (lvlPtr < levelItems.length && levelItems[lvlPtr].avail < i) {
      activeLevels.push(levelItems[lvlPtr].lvl);
      lvlPtr++;
    }
    const totalRange = cur.high - cur.low;
    if (totalRange <= 0) continue;
    const next = candles[i + 1];

    for (let j = activeLevels.length - 1; j >= 0; j--) {
      const lvl = activeLevels[j];

      if (lvl.type === 'BSL' || lvl.type === 'EQH') {
        // If candle body closes above the confirmed swing high, the level was broken (BOS), not swept
        if (cur.close > lvl.price) {
          lvl.isSwept = true;
          activeLevels[j] = activeLevels[activeLevels.length - 1];
          activeLevels.pop();
          continue;
        }
        // Buy-Side Liquidity (BSL) Sweep: wick above confirmed swing high, close back below
        if (cur.high > lvl.price && cur.close < lvl.price) {
          const upperWick = cur.high - Math.max(cur.open, cur.close);
          const upperWickRatio = upperWick / totalRange;
          const isGenuineSweep = upperWickRatio >= minWickRatio;
          const rejectionConfirmed = !!next && isCandleClosed(next, ivMs) && next.close < lvl.price;
          if (isGenuineSweep) {
            lvl.isSwept = true;
            lvl.sweepCandleIndex = i;
            sweeps.push({
              candleIndex: i,
              time: cur.openTime,
              price: cur.high,
              isHighSweep: true,
              label: `${lvl.type} Sweep (${roundSmcPrice(lvl.price)})`,
              sweptLevelPrice: lvl.price,
              wickRatio: Number(upperWickRatio.toFixed(3)),
              isGenuineSweep,
              rejectionConfirmed,
            });
            activeLevels[j] = activeLevels[activeLevels.length - 1];
            activeLevels.pop();
          }
        }
      } else if (lvl.type === 'SSL' || lvl.type === 'EQL') {
        // If candle body closes below the confirmed swing low, the level was broken (BOS), not swept
        if (cur.close < lvl.price) {
          lvl.isSwept = true;
          activeLevels[j] = activeLevels[activeLevels.length - 1];
          activeLevels.pop();
          continue;
        }
        // Sell-Side Liquidity (SSL) Sweep: wick below confirmed swing low, close back above
        if (cur.low < lvl.price && cur.close > lvl.price) {
          const lowerWick = Math.min(cur.open, cur.close) - cur.low;
          const lowerWickRatio = lowerWick / totalRange;
          const isGenuineSweep = lowerWickRatio >= minWickRatio;
          const rejectionConfirmed = !!next && isCandleClosed(next, ivMs) && next.close > lvl.price;
          if (isGenuineSweep) {
            lvl.isSwept = true;
            lvl.sweepCandleIndex = i;
            sweeps.push({
              candleIndex: i,
              time: cur.openTime,
              price: cur.low,
              isHighSweep: false,
              label: `${lvl.type} Sweep (${roundSmcPrice(lvl.price)})`,
              sweptLevelPrice: lvl.price,
              wickRatio: Number(lowerWickRatio.toFixed(3)),
              isGenuineSweep,
              rejectionConfirmed,
            });
            activeLevels[j] = activeLevels[activeLevels.length - 1];
            activeLevels.pop();
          }
        }
      }
    }
  }

  return { levels, sweeps };
}

// ── 4. Order Blocks & Breaker Blocks ────────────────────────────────────────

/** Returns true when the target bar has estimated volume or >30% of the baseline window has estimated volume. */
function isWindowVolumeEstimated(candles: Candle[], startIdx: number, endIdx: number): boolean {
  const target = candles[endIdx];
  if (!target || target.volumeEstimated) return true;
  const lo = Math.max(0, startIdx);
  const hi = Math.min(candles.length - 1, endIdx);
  if (hi < lo) return true;
  let estCount = 0;
  const total = hi - lo + 1;
  for (let k = lo; k <= hi; k++) {
    if (candles[k]?.volumeEstimated) estCount++;
  }
  return estCount / total > 0.3;
}

export function detectOrderBlocksAndBreakers(
  candles: Candle[],
  breaks: SmcStructureBreak[],
  options?: SmcFilterOptions
): { orderBlocks: SmcOrderBlock[]; breakers: SmcOrderBlock[] } {
  const orderBlocks: SmcOrderBlock[] = [];
  const breakers: SmcOrderBlock[] = [];
  if (candles.length < 5) return { orderBlocks, breakers };

  const reqDisp = options?.requireDisplacement ?? true;
  const dispMult = options?.displacementAtrMultiple ?? 0.5;
  const volMult = options?.volumeSmaMultiple ?? 1.10;
  const linkBars = Math.max(1, options?.obStructureLinkBars ?? 10);
  const reqVolSetting = options?.requireVolumeExpansion ?? true;
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
    // SMC-002: the impulse candle must be closed (only check forming bar for the latest candle)
    if (i + 1 === candles.length - 1 && !isCandleClosed(next)) return;
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
    const obVolEstimated = isWindowVolumeEstimated(candles, Math.max(0, i + 1 - 20), i + 1);
    if (reqVolSetting && !obVolEstimated && next.volume < volMult * ma) return;

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
      volumeEstimated: obVolEstimated || undefined,
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
        const brkVolEstimated = isWindowVolumeEstimated(candles, Math.max(0, k - 20), k);
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
          volumeEstimated: brkVolEstimated || undefined,
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

export function detectDealingRange(candles: Candle[], swings: SmcSwingPoint[], maxLen?: number): SmcDealingRange {
  const len = maxLen !== undefined ? Math.min(candles.length, maxLen) : candles.length;
  if (len === 0) {
    return {
      highPrice: 0,
      lowPrice: 0,
      equilibriumPrice: 0,
      premiumRange: [0, 0],
      discountRange: [0, 0],
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
    highPrice = recentHighs[recentHighs.length - 1].price;
    lowPrice = recentLows[recentLows.length - 1].price;
  } else {
    for (let i = 0; i < len; i++) {
      const c = candles[i];
      if (c.high > highPrice) highPrice = c.high;
      if (c.low < lowPrice) lowPrice = c.low;
    }
  }

  // Active Impulse Expansion Anchor:
  // In institutional SMC, if live price or candles have broken beyond historical swing boundaries
  // after the anchor swing points formed (ongoing impulse leg / breakout),
  // the dealing range dynamically incorporates the active impulse expansion high and low.
  const anchorStart = Math.min(
    recentHighs[recentHighs.length - 1]?.index ?? (len - 1),
    recentLows[recentLows.length - 1]?.index ?? (len - 1)
  );
  for (let i = anchorStart; i < len; i++) {
    const bar = candles[i];
    if (bar.high > highPrice) highPrice = bar.high;
    if (bar.low < lowPrice && bar.low > 0) lowPrice = bar.low;
  }

  if (highPrice === lowPrice || highPrice <= 0) {
    const p = candles[len - 1]?.close || 100;
    highPrice = p * 1.05;
    lowPrice = p * 0.95;
  }

  const range = highPrice - lowPrice;
  const equilibriumPrice = (highPrice + lowPrice) / 2;
  const premiumRange: [number, number] = [equilibriumPrice, highPrice];
  const discountRange: [number, number] = [lowPrice, equilibriumPrice];
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

  // PDH/PDL, PWH/PWL, and latest session ranges only depend on recent history (last ~21 days)
  const lastTime = candles[candles.length - 1].openTime;
  const cutoffTime = lastTime - 21 * 86_400_000;
  let startIdx = 0;
  if (candles.length > 400 && candles[0].openTime < cutoffTime) {
    let lo = 0, hi = candles.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (candles[mid].openTime < cutoffTime) lo = mid + 1;
      else hi = mid;
    }
    startIdx = Math.max(0, lo - 2);
  }

  for (let ci = startIdx; ci < candles.length; ci++) {
    const c = candles[ci];
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
    htfBias?: 'BULLISH' | 'BEARISH' | 'RANGE';
    hasConfirmedTargetPool?: boolean;
    atrSeries?: number[];
    precomputedMacroSwings?: SmcSwingPoint[];
  }
): {
  qualityScore: number;
  confluenceTier: SmcConfluenceTier;
  institutionalClass: SmcInstitutionalClass;
  confluenceBreakdown: SmcConfluenceBreakdown;
  auditReasons: string[];
  failedFactors: string[];
} {
  const isBull = setup.direction === 'BULLISH';
  const entry = setup.entryPrice;
  const auditReasons: string[] = [];
  const failedFactors: string[] = [];
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
    : detectDealingRange(candles, pitSwings, idx + 1);

  // 1. Higher-Timeframe Alignment (Max 20%) — point-in-time as of bar idx (no future hindsight)
  let htfScore = 0;
  let htfReason = 'HTF Bias: Unconfirmed (0/20)';
  const barTimeAtIdx = candles[idx]?.openTime ?? 0;
  let macroSwings: SmcSwingPoint[];
  if (context.precomputedMacroSwings && context.precomputedMacroSwings.length > 0) {
    const pitMacro = context.precomputedMacroSwings.filter(ms => (ms.confirmationTime ?? ms.time) <= barTimeAtIdx);
    macroSwings = pitMacro.length >= 3 ? pitMacro : pitSwings.filter(s => s.significance === 'MAJOR');
  } else {
    const macroCandles = aggregateMacroCandles(candles.slice(0, idx + 1), 4);
    macroSwings = macroCandles.length >= 12 ? detectSwingPoints(macroCandles, 2, true) : pitSwings.filter(s => s.significance === 'MAJOR');
  }
  const pitHtfBias: 'BULLISH' | 'BEARISH' | 'RANGE' = macroSwings.length >= 3 ? (() => {
    const recent = macroSwings.slice(-4);
    const highs = recent.filter(s => s.isHigh);
    const lows = recent.filter(s => !s.isHigh);
    const hh = highs.length >= 2 && highs[highs.length - 1].price > highs[highs.length - 2].price;
    const hl = lows.length >= 2 && lows[lows.length - 1].price > lows[lows.length - 2].price;
    const lh = highs.length >= 2 && highs[highs.length - 1].price < highs[highs.length - 2].price;
    const ll = lows.length >= 2 && lows[lows.length - 1].price < lows[lows.length - 2].price;
    if (hh || hl) return 'BULLISH';
    if (lh || ll) return 'BEARISH';
    return 'RANGE';
  })() : 'RANGE';
  const independentHtfBias = idx >= candles.length - 1 && context.htfBias ? context.htfBias : pitHtfBias;

  if ((isBull && independentHtfBias === 'BULLISH') || (!isBull && independentHtfBias === 'BEARISH')) {
    htfScore = 20;
    htfReason = `HTF Alignment: Independent ${independentHtfBias} macro structure confirmed (+20/20)`;
  } else if (independentHtfBias === 'RANGE') {
    htfScore = 12;
    htfReason = 'HTF Alignment: Macro range / consolidation structure (+12/20)';
    failedFactors.push('Neutral HTF Bias');
  } else if (setup.setupType === 'CHOCH_REVERSAL' || setup.setupType === 'THREE_STAGE_REVERSAL') {
    htfScore = 14;
    htfReason = 'HTF Alignment: Structural CHoCH reversal at macro extreme (+14/20)';
  } else {
    htfScore = 4;
    htfReason = `HTF Alignment: Counter-trend against ${independentHtfBias} HTF bias (+4/20)`;
    failedFactors.push('Counter-Trend HTF Bias');
  }
  auditReasons.push(htfReason);

  // 2. Liquidity Confirmation (Max 15%) — independently validated sweep or session liquidity pool
  let liqScore = 0;
  let liqReason = 'Liquidity: No confirmed sweep or pool interaction (0/15)';
  const matchingSweep = pitSweeps
    .filter(sw => idx - sw.candleIndex <= 20 && (isBull ? !sw.isHighSweep : sw.isHighSweep))
    .sort((a, b) => b.candleIndex - a.candleIndex)[0];
  if (matchingSweep) {
    const rejectionKnown = matchingSweep.candleIndex + 1 <= idx && matchingSweep.rejectionConfirmed === true;
    if (matchingSweep.isGenuineSweep === true && rejectionKnown) {
      liqScore = 15;
      liqReason = `Liquidity: Confirmed ${matchingSweep.label} (${(matchingSweep.wickRatio * 100).toFixed(0)}% wick + closed rejection) (+15/15)`;
    } else if (matchingSweep.isGenuineSweep === true) {
      liqScore = 12;
      liqReason = `Liquidity: ${matchingSweep.label} (${(matchingSweep.wickRatio * 100).toFixed(0)}% rejection wick) (+12/15)`;
    } else {
      liqScore = 6;
      liqReason = `Liquidity: Minor wick grab at ${matchingSweep.sweptLevelPrice.toFixed(2)} below threshold (+6/15)`;
      failedFactors.push('Weak Liquidity Sweep');
    }
  } else {
    const { pdh, pdl } = prevDayLevelsAt(candles, idx);
    if (isBull && pdl && Math.abs(entry - pdl) / pdl < 0.015) {
      liqScore = 13;
      liqReason = 'Liquidity: Confirmed reaction at Previous Day Low (PDL) pool (+13/15)';
    } else if (!isBull && pdh && Math.abs(entry - pdh) / pdh < 0.015) {
      liqScore = 13;
      liqReason = 'Liquidity: Confirmed reaction at Previous Day High (PDH) pool (+13/15)';
    } else {
      failedFactors.push('No Liquidity Sweep');
    }
  }
  auditReasons.push(liqReason);

  // 3. LTF Market Structure Break Validation (Max 15%) — independently verified closed-candle swing break
  let structScore = 0;
  let structReason = 'Market Structure: No confirmed recent BOS/CHoCH break (0/15)';
  const recentBreaks = pitBreaks.filter(b => b.isBullish === isBull && idx - b.candleIndex <= 15);
  if (recentBreaks.length > 0) {
    const externalBrk = recentBreaks.filter(b => b.structureType === 'EXTERNAL' || b.significance === 'MAJOR');
    const latestBreak = (externalBrk.length > 0 ? externalBrk : recentBreaks)[(externalBrk.length > 0 ? externalBrk : recentBreaks).length - 1];
    structScore = externalBrk.length > 0 ? 15 : 11;
    structReason = `Market Structure: Confirmed ${latestBreak.structureType || 'EXTERNAL'} ${isBull ? '+' : '-'}${latestBreak.breakType} at ${latestBreak.price.toFixed(2)} (+${structScore}/15)`;
    if (externalBrk.length === 0) {
      failedFactors.push('Internal-Only BOS');
    }
  } else if (pitBreaks.some(b => b.isBullish === isBull)) {
    structScore = 6;
    structReason = 'Market Structure: Older structural break (>15 bars ago) (+6/15)';
    failedFactors.push('Stale Structure Break');
  } else {
    failedFactors.push('Unconfirmed BOS/CHoCH');
  }
  auditReasons.push(structReason);

  // 4. Order Block / Breaker Validity (Max 15%) — independently verified unmitigated zone at setup bar
  let obScore = 0;
  let obReason = 'Order Block: No active unmitigated OB or Breaker zone (0/15)';
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
      obReason = `Order Block: Fresh ${isBull ? 'Demand' : 'Supply'} OB [${ob.bottomPrice.toFixed(2)} - ${ob.topPrice.toFixed(2)}] (+${obScore}/15)`;
    } else {
      obScore = 9;
      obReason = 'Order Block: Unmitigated OB adjacent to entry zone (+9/15)';
      failedFactors.push('Entry Outside OB Bounds');
    }
  } else if (matchingBreakers.length > 0) {
    const brk = matchingBreakers[0];
    obScore = 13;
    obReason = `Order Block: Validated Breaker Block [${brk.bottomPrice.toFixed(2)} - ${brk.topPrice.toFixed(2)}] (+13/15)`;
  } else {
    failedFactors.push('No Active Order Block');
  }
  auditReasons.push(obReason);

  // 5. FVG / IFVG Imbalance Confluence (Max 10%) — independently verified 3-candle price imbalance overlap
  let fvgScore = 0;
  let fvgReason = 'FVG Confluence: No active FVG/IFVG overlapping setup zone (0/10)';
  const activeGaps = pitFvgs.filter(f => f.isBullish === isBull);
  const containing = activeGaps.find(f => entry >= f.bottomPrice && entry <= f.topPrice);
  const riskLo = Math.min(entry, setup.stopLoss);
  const riskHi = Math.max(entry, setup.stopLoss);
  const intersecting = activeGaps.find(f => f.bottomPrice <= riskHi && f.topPrice >= riskLo);
  if (containing) {
    fvgScore = 10;
    fvgReason = `FVG Confluence: Entry inside unmitigated ${containing.isInverse ? 'IFVG' : 'FVG'} [${containing.bottomPrice.toFixed(2)} - ${containing.topPrice.toFixed(2)}] (+10/10)`;
  } else if (intersecting) {
    fvgScore = 7;
    fvgReason = `FVG Confluence: Active ${intersecting.isInverse ? 'IFVG' : 'FVG'} intersects entry-to-stop zone (+7/10)`;
  } else {
    failedFactors.push('No FVG Confluence');
  }
  auditReasons.push(fvgReason);

  // 6. Displacement Strength (Max 10%) — independently validated true-range ATR(14) impulse & body ratio
  let dispScore = 0;
  let dispReason = 'Displacement: Insufficient impulse body expansion (0/10)';
  if (candles.length > 10 && idx >= 5) {
    const atr = (context.atrSeries && context.atrSeries[idx - 1])
      ? context.atrSeries[idx - 1]
      : (computeAtrSeries(candles.slice(0, idx), 14).slice(-1)[0] || 0.001);
    let bestMult = 0;
    let bestBodyRatio = 0;
    for (let k = Math.max(0, idx - 2); k <= idx; k++) {
      const c = candles[k];
      if (!c) continue;
      const body = Math.abs(c.close - c.open);
      const range = Math.max(1e-9, c.high - c.low);
      const mult = body / Math.max(1e-9, atr);
      if (mult > bestMult) {
        bestMult = mult;
        bestBodyRatio = body / range;
      }
    }
    if (bestMult >= 1.5 && bestBodyRatio >= 0.55) {
      dispScore = 10;
      dispReason = `Displacement: Strong institutional impulse (${bestMult.toFixed(1)}x ATR14, ${(bestBodyRatio * 100).toFixed(0)}% body) (+10/10)`;
    } else if (bestMult >= 1.0 && bestBodyRatio >= 0.45) {
      dispScore = 8;
      dispReason = `Displacement: Validated impulse expansion (${bestMult.toFixed(1)}x ATR14) (+8/10)`;
    } else if (bestMult >= 0.70) {
      dispScore = 6;
      dispReason = `Displacement: Moderate candle body (${bestMult.toFixed(1)}x ATR14) (+6/10)`;
      failedFactors.push(`Weak Displacement (${bestMult.toFixed(1)}x ATR)`);
    } else {
      failedFactors.push(`No Displacement (${bestMult.toFixed(1)}x ATR)`);
    }
  } else {
    failedFactors.push('Insufficient ATR History');
  }
  auditReasons.push(dispReason);

  // 7. Premium / Discount Positioning (Max 10%) — independently validated dealing-range Fib zone
  let pdScore = 0;
  let pdReason = 'Dealing Range: Unfavorable zone positioning (0/10)';
  const dr = pitDealingRange;
  if (dr.highPrice > dr.lowPrice) {
    const eq = dr.equilibriumPrice;
    if (isBull) {
      if (entry < eq) {
        const [dOteMin, dOteMax] = dr.discountOteRange;
        if (entry >= dOteMin && entry <= dOteMax) {
          pdScore = 10;
          pdReason = 'Dealing Range: Optimal Trade Entry (OTE 62%-79% Discount) (+10/10)';
        } else {
          pdScore = 8;
          pdReason = 'Dealing Range: Validated Discount Zone (< 50% EQ) (+8/10)';
        }
      } else {
        pdScore = 0;
        pdReason = 'Dealing Range: Long entry in Premium Zone (> 50% EQ) (0/10)';
        failedFactors.push('Long Entry in Premium');
      }
    } else {
      if (entry > eq) {
        const [pOteMin, pOteMax] = dr.premiumOteRange;
        if (entry >= pOteMin && entry <= pOteMax) {
          pdScore = 10;
          pdReason = 'Dealing Range: Optimal Trade Entry (OTE 62%-79% Premium) (+10/10)';
        } else {
          pdScore = 8;
          pdReason = 'Dealing Range: Validated Premium Zone (> 50% EQ) (+8/10)';
        }
      } else {
        pdScore = 0;
        pdReason = 'Dealing Range: Short entry in Discount Zone (< 50% EQ) (0/10)';
        failedFactors.push('Short Entry in Discount');
      }
    }
  }
  auditReasons.push(pdReason);

  // 8. Independent Volume & Confirmed Target Liquidity Validation (Max 5%)
  let volScore = 0;
  let volReason = 'Volume & Target Liquidity: Unconfirmed (0/5)';
  const volWindowStart = Math.max(0, idx - 20);
  const volEstimated = isWindowVolumeEstimated(candles, volWindowStart, idx);
  const targetLiqPts = context.hasConfirmedTargetPool ? 2 : 0;
  if (!context.hasConfirmedTargetPool) {
    failedFactors.push('Unconfirmed Target Liquidity');
  }
  if (volEstimated) {
    volScore = 2 + targetLiqPts;
    volReason = `Volume & Liquidity: Estimated volume (2/3) + Confirmed Target Pool (+${targetLiqPts}/2) (+${volScore}/5)`;
    failedFactors.push('Unverified Exchange Volume');
  } else if (idx >= 10) {
    let vSum = 0;
    for (let k = volWindowStart; k < idx; k++) vSum += candles[k].volume;
    const volSma = vSum / Math.max(1, idx - volWindowStart);
    const volMult = candles[idx].volume / Math.max(1, volSma);
    const vPts = volMult >= 1.3 ? 3 : volMult >= 1.0 ? 2 : 0;
    if (vPts === 0) failedFactors.push(`Low Volume (${volMult.toFixed(1)}x SMA)`);
    volScore = vPts + targetLiqPts;
    volReason = `Volume & Liquidity: ${volMult.toFixed(1)}x Vol SMA (+${vPts}/3) + Target Liquidity (+${targetLiqPts}/2) (+${volScore}/5)`;
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
    failedFactors,
  };
}

// ── 7.5. Structural Bias Evaluator (HTF & LTF Trend Separation) ─────────────

/**
 * Aggregates closed LTF bars into 4x macro bars when an independent HTF dataset
 * was not provided by the caller.
 */
function aggregateMacroCandles(candles: Candle[], factor = 4): Candle[] {
  const closed = candles.filter(c => isCandleClosed(c));
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
  let pathLen = 0;
  for (let i = macroSrc.length - lookback; i < macroSrc.length; i++) {
    sum += macroSrc[i].close;
    if (i > macroSrc.length - lookback) {
      pathLen += Math.abs(macroSrc[i].close - macroSrc[i - 1].close);
    }
  }
  const sma = sum / lookback;
  const lastHtfClose = macroSrc[macroSrc.length - 1].close;
  const firstHtfClose = macroSrc[macroSrc.length - lookback].close;
  const htfEfficiency = pathLen > 0 ? Math.abs(lastHtfClose - firstHtfClose) / pathLen : 0;
  const distFromSmaPct = sma > 0 ? Math.abs(lastHtfClose - sma) / sma : 0;

  if (lastHtfClose > sma * 1.002) bullHtfPoints += 2;
  else if (lastHtfClose < sma * 0.998) bearHtfPoints += 2;

  let htfBias: 'BULLISH' | 'BEARISH' | 'RANGE' = 'RANGE';
  // Suppress directional HTF bias during tight sideways chop (low directional efficiency near SMA)
  const isSidewaysChop = htfEfficiency < 0.18 && distFromSmaPct < 0.008;
  if (!isSidewaysChop) {
    if (bullHtfPoints >= bearHtfPoints + 2) htfBias = 'BULLISH';
    else if (bearHtfPoints >= bullHtfPoints + 2) htfBias = 'BEARISH';
  }

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

  const closedCandles = candles.filter(c => isCandleClosed(c));
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

const US_EQUITY_SYMBOLS = new Set([
  'SPX', 'NDX', 'DJI', 'SPY', 'QQQ', 'IWM', 'DIA', 'VIX',
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA', 'NFLX', 'AMD',
  'INTC', 'JPM', 'V', 'MA', 'WMT', 'DIS', 'BA', 'GS', 'MS', 'BAC', 'XOM', 'CVX',
]);

/**
 * Returns the local trading session date key (YYYY-MM-DD) for a timestamp:
 * - Crypto / Forex / Commodities: UTC date
 * - US equities & indices: America/New_York date
 * - Indian / NSE / default: Asia/Kolkata (IST = UTC + 5:30) date
 */
export function getSmcTradingDayKey(timestampMs: number, symbol?: string): string {
  if (!timestampMs || timestampMs <= 0) return '';
  const sym = (symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isCommodity = [
    'GOLD', 'XAU', 'XAUUSD', 'SILVER', 'XAG', 'XAGUSD', 'CRUDEOIL', 'CRUDE', 'OIL',
    'BRENT', 'WTI', 'NATGAS', 'COPPER', 'PLATINUM'
  ].includes(sym);
  const isForex = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDINR', 'USDAED', 'AUDUSD', 'USDCAD', 'AUDCAD',
    'UADCAD', 'USDCHF', 'NZDUSD'
  ].includes(sym) || /^(EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY|INR|AED){2}$/.test(sym);
  const isCrypto =
    sym.endsWith('USDT') ||
    sym.endsWith('USD') ||
    ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC', 'POL', 'SHIB'].includes(sym);

  if (isCommodity || isForex || isCrypto) {
    return new Date(timestampMs).toISOString().slice(0, 10);
  }
  if (US_EQUITY_SYMBOLS.has(sym)) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(timestampMs));
  }
  // Default: IST (UTC + 05:30)
  return new Date(timestampMs + 5.5 * 3600_000).toISOString().slice(0, 10);
}

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
  riskProfile?: Partial<SmcRiskProfile>,
  ltfCandles?: Candle[],
  liquidityLevels?: SmcLiquidityLevel[],
  rejectedOut?: SmcConfirmedSetup[],
  symbol?: string,
  historyOut?: SmcConfirmedSetup[]
): SmcConfirmedSetup[] {
  if (!isValidVerifiedCandleDataset(candles)) return [];

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
      { htfBias: analysis.htfBias, ltfBias: analysis.ltfBias },
      swingsOrConfig?.riskProfile,
      swingsOrConfig?.ltfCandles,
      analysis.liquidityLevels
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
    discountOteRange: [lastPrice * 0.96, lastPrice * 0.98],
    premiumOteRange: [lastPrice * 1.02, lastPrice * 1.04],
  };
  sessionLevels = sessionLevels || {};

  const setups: SmcConfirmedSetup[] = [];
  const lastCandle = candles[candles.length - 1];
  const atrSeries = computeAtrSeries(candles, 14);
  const fullMacroCandles = aggregateMacroCandles(candles, 4);
  const precomputedMacroSwings = fullMacroCandles.length >= 12 ? detectSwingPoints(fullMacroCandles, 2, true) : [];
  const intervalMs = inferCandleIntervalMs(candles);
  // Single-day intraday expiry applies strictly to sub-1H scalping timeframes (< 1H); 1H+ run as multi-day swing setups
  const isIntradaySession = intervalMs > 0 && intervalMs < 3_600_000;
  const latestDayKey = isIntradaySession ? getSmcTradingDayKey(lastCandle.openTime, symbol) : '';
  let firstTodayIdx = 0;
  if (isIntradaySession && latestDayKey) {
    for (let i = candles.length - 1; i >= 0; i--) {
      if (getSmcTradingDayKey(candles[i].openTime, symbol) === latestDayKey) {
        firstTodayIdx = i;
      } else {
        break;
      }
    }
  }

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

    // 0. Entry Validation: Trigger entry ONLY after candle-close confirmation
    const sigBar = candles[candleIndex];
    if (!isCandleClosed(sigBar)) {
      statusOverride = 'INVALIDATED';
    }

    // 0b. Structure Confirmation & BOS Validation:
    // Require a confirmed BOS/CHoCH where the break candle is closed and body-closed beyond a verified confirmed swing.
    const cleanEntry = roundSmcPrice(entryPrice);
    const swingMap = new Map<number, SmcSwingPoint>();
    for (const s of swings) swingMap.set(s.index, s);

    const validBreaks = (breaks || []).filter(b => {
      if (b.isBullish !== isBull) return false;
      if (b.candleIndex > Math.min(candles.length - 1, candleIndex + 8)) return false;
      if (Math.abs(b.candleIndex - candleIndex) > 18) return false;
      const brkBar = candles[b.candleIndex];
      if (!isCandleClosed(brkBar)) return false;
      if (b.swingIndex < 0 || b.swingIndex >= b.candleIndex) return false;
      const brokenSw = swingMap.get(b.swingIndex);
      if (brokenSw) {
        if (brokenSw.isHigh !== isBull) return false;
        if ((brokenSw.confirmationIndex ?? brokenSw.index) >= b.candleIndex) return false;
      }
      const closedBeyond = isBull ? brkBar.close > b.brokenSwingPrice : brkBar.close < b.brokenSwingPrice;
      if (!closedBeyond) return false;
      for (let k = b.swingIndex + 1; k < b.candleIndex; k++) {
        if (isBull ? candles[k].close > b.brokenSwingPrice : candles[k].close < b.brokenSwingPrice) {
          return false;
        }
      }
      return true;
    });
    const externalValidBreaks = validBreaks.filter(b => b.structureType === 'EXTERNAL' || b.significance === 'MAJOR');
    const candidateBreaks = externalValidBreaks.length > 0 ? externalValidBreaks : validBreaks;
    const alignedBreak = [...candidateBreaks]
      .sort((a, b) => Math.abs(a.brokenSwingPrice - cleanEntry) - Math.abs(b.brokenSwingPrice - cleanEntry))[0]
      ?? candidateBreaks[candidateBreaks.length - 1];

    const effectiveConfirmIdx = alignedBreak ? Math.max(candleIndex, alignedBreak.candleIndex) : candleIndex;
    const effectiveConfirmTime = candles[effectiveConfirmIdx]?.openTime ?? time;

    const validatingBreak = alignedBreak
      ? {
          breakType: alignedBreak.breakType,
          price: roundSmcPrice(alignedBreak.brokenSwingPrice),
          candleIndex: alignedBreak.candleIndex,
          swingIndex: alignedBreak.swingIndex,
          brokenSwingPrice: roundSmcPrice(alignedBreak.brokenSwingPrice),
        }
      : undefined;

    if (
      !validatingBreak &&
      breaks &&
      breaks.length > 0 &&
      (setupType === 'BOS_CONTINUATION' ||
       setupType === 'CHOCH_REVERSAL' ||
       setupType === 'BOS_FVG_RETEST')
    ) {
      statusOverride = 'INVALIDATED';
    }

    // Explicit Entry Basis definition
    const entryBasis =
      setupType === 'BOS_CONTINUATION' ? 'BOS Level' :
      setupType === 'CHOCH_REVERSAL' ? 'CHoCH Level' :
      setupType === 'BREAKER_RETEST' ? 'Breaker 50%' :
      setupType === 'OB_RETEST' ? 'OB 50%' :
      setupType === 'FVG_TAP' || setupType === 'BOS_FVG_RETEST' || setupType === 'THREE_STAGE_REVERSAL' ? 'FVG 50% CE' :
      setupType === 'PREMIUM_DISCOUNT_OTE' ? 'OTE Fib' :
      'Zone Level';

    // 1. Numerical Sanity Check
    if (
      !Number.isFinite(cleanEntry) || cleanEntry <= 0 ||
      !Number.isFinite(stopLoss) || stopLoss <= 0 ||
      !Number.isFinite(targetPrice) || targetPrice <= 0
    ) {
      statusOverride = 'INVALIDATED';
    }

    // 1b. Point-in-Time Anti-Late-Entry & Dealing Range Positioning Guard (uses only swings/bars available at effectiveConfirmIdx):
    // Reject short entries in deep discount and reject long entries in deep premium.
    const pitSwingsAtSetup = swings.filter(s => (s.confirmationIndex ?? s.index) <= effectiveConfirmIdx);
    const pitDr = effectiveConfirmIdx >= candles.length - 1
      ? dealingRange
      : detectDealingRange(candles, pitSwingsAtSetup, effectiveConfirmIdx + 1);
    if (pitDr && pitDr.highPrice > pitDr.lowPrice) {
      const drSpan = pitDr.highPrice - pitDr.lowPrice;
      const deepPremium = pitDr.equilibriumPrice + drSpan * 0.20;
      const deepDiscount = pitDr.equilibriumPrice - drSpan * 0.20;
      if (isBull && cleanEntry > deepPremium && setupType !== 'CHOCH_REVERSAL' && setupType !== 'BOS_CONTINUATION') {
        statusOverride = 'INVALIDATED';
      } else if (!isBull && cleanEntry < deepDiscount && setupType !== 'CHOCH_REVERSAL' && setupType !== 'BOS_CONTINUATION') {
        statusOverride = 'INVALIDATED';
      }
    }

    // 2. Stop-Loss: Validate SL strictly against the local structural invalidation level + ATR buffer (never arbitrary wide distance)
    const atrVal = atrSeries[Math.min(Math.max(0, effectiveConfirmIdx), atrSeries.length - 1)] || cleanEntry * 0.003;
    const atrBuffer = Math.max(atrVal * 0.20, cleanEntry * 0.0005);
    let cleanStopLoss = roundSmcPrice(stopLoss);
    let invalidationBasis = isBull ? 'Zone Low - ATR' : 'Zone High + ATR';

    if (swings && swings.length > 0) {
      const localLookbackStart = Math.max(0, effectiveConfirmIdx - 12);
      if (!isBull) {
        // Find the confirmed swing high and the actual impulse-leg structural high (<= 3.0x ATR) so SL is above the true invalidation high
        const confSwingHigh = [...swings]
          .filter(
            s =>
              s.isHigh &&
              (s.confirmationIndex ?? s.index) <= effectiveConfirmIdx &&
              s.index >= localLookbackStart &&
              s.price > cleanEntry &&
              (s.price - cleanEntry) <= atrVal * 3.0
          )
          .sort((a, b) => b.price - a.price)[0];

        let legStructuralHigh = -Infinity;
        for (let k = Math.max(0, effectiveConfirmIdx - 10); k <= effectiveConfirmIdx; k++) {
          if (candles[k] && candles[k].high > legStructuralHigh && candles[k].high > cleanEntry && (candles[k].high - cleanEntry) <= atrVal * 3.0) {
            legStructuralHigh = candles[k].high;
          }
        }

        const zoneHighValid = Number.isFinite(cleanStopLoss) && cleanStopLoss > cleanEntry && (cleanStopLoss - cleanEntry) <= atrVal * 3.0;
        const trueInvalidationHigh = Math.max(
          confSwingHigh ? confSwingHigh.price : -Infinity,
          Number.isFinite(legStructuralHigh) ? legStructuralHigh : -Infinity,
          zoneHighValid ? cleanStopLoss : -Infinity
        );

        if (Number.isFinite(trueInvalidationHigh) && trueInvalidationHigh > cleanEntry) {
          cleanStopLoss = roundSmcPrice(trueInvalidationHigh + atrBuffer);
          invalidationBasis = confSwingHigh && confSwingHigh.price >= (legStructuralHigh || 0)
            ? 'Confirmed Swing High + ATR'
            : Number.isFinite(legStructuralHigh) && legStructuralHigh >= (zoneHighValid ? cleanStopLoss : 0)
            ? 'Structural High + ATR'
            : 'POI Invalidation High + ATR';
        } else {
          cleanStopLoss = roundSmcPrice(cleanEntry + atrVal * 1.2 + atrBuffer);
          invalidationBasis = 'Structure High + ATR';
        }
      } else {
        // Find the confirmed swing low and the actual impulse-leg structural low (<= 3.0x ATR) so SL is below the true invalidation low
        const confSwingLow = [...swings]
          .filter(
            s =>
              !s.isHigh &&
              (s.confirmationIndex ?? s.index) <= effectiveConfirmIdx &&
              s.index >= localLookbackStart &&
              s.price < cleanEntry &&
              (cleanEntry - s.price) <= atrVal * 3.0
          )
          .sort((a, b) => a.price - b.price)[0];

        let legStructuralLow = Infinity;
        for (let k = Math.max(0, effectiveConfirmIdx - 10); k <= effectiveConfirmIdx; k++) {
          if (candles[k] && candles[k].low < legStructuralLow && candles[k].low < cleanEntry && (cleanEntry - candles[k].low) <= atrVal * 3.0) {
            legStructuralLow = candles[k].low;
          }
        }

        const zoneLowValid = Number.isFinite(cleanStopLoss) && cleanStopLoss < cleanEntry && (cleanEntry - cleanStopLoss) <= atrVal * 3.0;
        const trueInvalidationLow = Math.min(
          confSwingLow ? confSwingLow.price : Infinity,
          Number.isFinite(legStructuralLow) ? legStructuralLow : Infinity,
          zoneLowValid ? cleanStopLoss : Infinity
        );

        if (Number.isFinite(trueInvalidationLow) && trueInvalidationLow < cleanEntry) {
          cleanStopLoss = roundSmcPrice(trueInvalidationLow - atrBuffer);
          invalidationBasis = confSwingLow && confSwingLow.price <= (legStructuralLow || Infinity)
            ? 'Confirmed Swing Low - ATR'
            : Number.isFinite(legStructuralLow) && legStructuralLow <= (zoneLowValid ? cleanStopLoss : Infinity)
            ? 'Structural Low - ATR'
            : 'POI Invalidation Low - ATR';
        } else {
          cleanStopLoss = roundSmcPrice(cleanEntry - atrVal * 1.2 - atrBuffer);
          invalidationBasis = 'Structure Low - ATR';
        }
      }
    }

    let stopLossAdjusted = false;
    const slInvalid = isBull
      ? (!Number.isFinite(cleanStopLoss) || cleanStopLoss >= cleanEntry)
      : (!Number.isFinite(cleanStopLoss) || cleanStopLoss <= cleanEntry);
    if (slInvalid) {
      stopLossAdjusted = true;
      statusOverride = 'INVALIDATED';
      cleanStopLoss = roundSmcPrice(isBull ? cleanEntry - atrBuffer : cleanEntry + atrBuffer);
    }
    const rawRisk = isBull ? (cleanEntry - cleanStopLoss) : (cleanStopLoss - cleanEntry);
    const riskDistance = rawRisk > 0 ? rawRisk : Math.max(Math.abs(cleanEntry - cleanStopLoss), cleanEntry * 0.005);

    // 3. Target Calculation: Validate TP1 (1:2+) & TP2 (1:3+) strictly against confirmed opposing liquidity levels (SSL/BSL/EQH/EQL/PDL/PDH/Swings)
    const rp: SmcRiskProfile = { ...DEFAULT_SMC_RISK_PROFILE, ...riskProfile };
    const swingConfMap = new Map<number, number>();
    for (const s of swings) swingConfMap.set(s.index, s.confirmationIndex ?? s.index);

    const rawPools: { price: number; label: string }[] = [];
    if (liquidityLevels && liquidityLevels.length > 0) {
      for (const lvl of liquidityLevels) {
        if (lvl.isSwept) continue;
        const allSwingsConfirmed = lvl.candleIndices.every(ix => (swingConfMap.get(ix) ?? ix) <= effectiveConfirmIdx);
        if (allSwingsConfirmed) {
          if (isBull && (lvl.type === 'BSL' || lvl.type === 'EQH') && lvl.price > cleanEntry) {
            rawPools.push({ price: lvl.price, label: `${lvl.type} Liquidity` });
          } else if (!isBull && (lvl.type === 'SSL' || lvl.type === 'EQL') && lvl.price < cleanEntry) {
            rawPools.push({ price: lvl.price, label: `${lvl.type} Liquidity` });
          }
        }
      }
    }
    for (const s of swings) {
      if ((s.confirmationIndex ?? s.index) <= effectiveConfirmIdx) {
        if (isBull && s.isHigh && s.price > cleanEntry) rawPools.push({ price: s.price, label: 'BSL Swing' });
        if (!isBull && !s.isHigh && s.price < cleanEntry) rawPools.push({ price: s.price, label: 'SSL Swing' });
      }
    }
    for (let pIdx = 2; pIdx <= effectiveConfirmIdx - 2; pIdx++) {
      const pc = candles[pIdx];
      if (!pc) continue;
      if (isBull) {
        if (
          pc.high > cleanEntry &&
          pc.high >= candles[pIdx - 1].high &&
          pc.high >= candles[pIdx - 2].high &&
          pc.high >= candles[pIdx + 1].high &&
          pc.high >= candles[pIdx + 2].high
        ) {
          rawPools.push({ price: pc.high, label: 'BSL Swing' });
        }
      } else {
        if (
          pc.low < cleanEntry &&
          pc.low <= candles[pIdx - 1].low &&
          pc.low <= candles[pIdx - 2].low &&
          pc.low <= candles[pIdx + 1].low &&
          pc.low <= candles[pIdx + 2].low
        ) {
          rawPools.push({ price: pc.low, label: 'SSL Swing' });
        }
      }
    }
    if (sessionLevels?.pdh && isBull && sessionLevels.pdh > cleanEntry) rawPools.push({ price: sessionLevels.pdh, label: 'PDH' });
    if (sessionLevels?.pdl && !isBull && sessionLevels.pdl < cleanEntry) rawPools.push({ price: sessionLevels.pdl, label: 'PDL' });
    if (sessionLevels?.pwh && isBull && sessionLevels.pwh > cleanEntry) rawPools.push({ price: sessionLevels.pwh, label: 'PWH' });
    if (sessionLevels?.pwl && !isBull && sessionLevels.pwl < cleanEntry) rawPools.push({ price: sessionLevels.pwl, label: 'PWL' });
    if (dealingRange) {
      if (isBull && dealingRange.highPrice > cleanEntry) rawPools.push({ price: dealingRange.highPrice, label: 'Range High' });
      if (!isBull && dealingRange.lowPrice < cleanEntry) rawPools.push({ price: dealingRange.lowPrice, label: 'Range Low' });
    }
    rawPools.sort((a, b) => Math.abs(a.price - cleanEntry) - Math.abs(b.price - cleanEntry));

    const candidatePools: { price: number; label: string }[] = [];
    for (const p of rawPools) {
      if (!candidatePools.some(existing => Math.abs(existing.price - p.price) <= atrVal * 0.15)) {
        candidatePools.push(p);
      }
    }

    const minTp1Dist = riskDistance * rp.target1R;
    const poolsAbove2R = candidatePools.filter(p => {
      const d = Math.abs(p.price - cleanEntry);
      return d >= minTp1Dist && d <= riskDistance * 4.5;
    });
    const structuralTp1 = poolsAbove2R[0];
    const effectiveTarget1 = roundSmcPrice(
      structuralTp1 ? structuralTp1.price : (isBull ? cleanEntry + minTp1Dist : cleanEntry - minTp1Dist)
    );
    const tp1Source = structuralTp1 ? structuralTp1.label : `${rp.target1R.toFixed(1)}R (${isBull ? 'BSL' : 'SSL'} Target)`;
    const rewardDistance = Math.abs(effectiveTarget1 - cleanEntry);
    const computedRr = Number((rewardDistance / Math.max(1e-9, riskDistance)).toFixed(2));

    const minTp2Dist = Math.max(rewardDistance + Math.max(riskDistance * 0.35, atrVal * 0.4), riskDistance * rp.target2R);
    const structuralTp2 =
      poolsAbove2R.find(p => {
        const d = Math.abs(p.price - cleanEntry);
        return d >= minTp2Dist && d <= riskDistance * 4.5;
      }) ??
      poolsAbove2R.find(p => {
        const d = Math.abs(p.price - cleanEntry);
        return d >= rewardDistance + Math.max(riskDistance * 0.35, atrVal * 0.4);
      });
    // Never project a synthetic TP2 past the deepest confirmed liquidity pool on the chart when structuralTp1 is already at Range Low / High
    const targetPrice2 = roundSmcPrice(
      structuralTp2
        ? structuralTp2.price
        : structuralTp1
        ? structuralTp1.price
        : (isBull ? cleanEntry + riskDistance * rp.target2R : cleanEntry - riskDistance * rp.target2R)
    );
    const tp2Source = structuralTp2
      ? structuralTp2.label
      : structuralTp1
      ? `${structuralTp1.label} (Max Confirmed Liquidity)`
      : `${rp.target2R.toFixed(1)}R (${isBull ? 'BSL' : 'SSL'} Target)`;
    if (computedRr < rp.minRiskReward && !statusOverride) {
      statusOverride = 'INVALIDATED';
    }

    let status: 'CONFIRMED' | 'RETESTING' | 'PENDING' | 'DETECTED' | 'FORMING' | 'ENTRY_ZONE_REACHED' | 'TARGET_HIT' | 'EXITED' | 'INVALIDATED' | 'EXPIRED' = statusOverride || 'CONFIRMED';
    let lifecycleState: SmcLifecycleState = statusOverride === 'INVALIDATED'
      ? 'INVALIDATED'
      : statusOverride === 'CONFIRMED' ? 'CONFIRMED' : (status === 'RETESTING' ? 'RETESTED' : 'CONFIRMED');
    let retestCount = 0;
    let retestTouched = false;
    let retestFailed = false;
    let closedBelowBosCount = 0;
    let rejectionConfirmed = false;
    let firstLockedRejectionBarIdx = -1;
    let lastRejectionBarIdx = -1;
    let setupVersion = 1;
    let hadPriorLockedRejection = false;
    let tp1Hit = false;
    let tp1HitIndex: number | undefined;
    let tp2Hit = false;
    let tp2HitIndex: number | undefined;
    let resolutionIndeterminate = false;

    const isBreakLevelSetup = setupType === 'BOS_CONTINUATION' || setupType === 'CHOCH_REVERSAL';
    const bosRefLevel = isBreakLevelSetup && validatingBreak ? validatingBreak.price : cleanEntry;
    const requiredHoldLevel = isBull ? Math.max(cleanEntry, bosRefLevel) : Math.min(cleanEntry, bosRefLevel);

    // 1. Confirmation bar validation
    const formBar = candles[effectiveConfirmIdx];
    if (formBar) {
      if (isBull ? formBar.close <= cleanStopLoss : formBar.close >= cleanStopLoss) {
        status = 'INVALIDATED';
        lifecycleState = 'INVALIDATED';
      }
    }

    // 2. RR-004 / RR-005 / RR-006: Track post-confirmation outcomes starting strictly AFTER effectiveConfirmIdx
    const maxLifespanBars = SMC_TRADE_LIFESPAN_BARS;
    const zoneHalfWidth = Math.max(atrVal * 0.20, riskDistance * 0.12);
    const entryZoneLow = isBull ? cleanEntry - zoneHalfWidth : cleanEntry - zoneHalfWidth * 0.5;
    const entryZoneHigh = isBull ? cleanEntry + zoneHalfWidth * 0.5 : cleanEntry + zoneHalfWidth;
    let hasDepartedZone = Boolean(
      validatingBreak || (formBar && (isBull ? formBar.close >= cleanEntry : formBar.close <= cleanEntry))
    );
    // Entry fill tracking: if the confirmation bar already closed beyond the entry zone in the
    // profitable direction (e.g. CHoCH/BOS breakout pullback entry), a limit order at cleanEntry
    // is NOT filled until a subsequent bar actually retests the entry zone.
    let entryFilled = Boolean(
      formBar && (isBull ? formBar.close <= entryZoneHigh : formBar.close >= entryZoneLow)
    );

    const setupDayKey = isIntradaySession ? getSmcTradingDayKey(effectiveConfirmTime, symbol) : '';

    if (status !== 'INVALIDATED') {
      for (let k = effectiveConfirmIdx + 1; k < candles.length; k++) {
        const bar = candles[k];
        if (!isCandleClosed(bar)) break;

        // Every trading day starts fresh on intraday charts: expire yesterday's strategy at the new day boundary
        if (setupType === 'SESSION_LIQUIDITY' && isIntradaySession && setupDayKey && getSmcTradingDayKey(bar.openTime, symbol) !== setupDayKey) {
          status = tp1Hit ? 'EXITED' : 'EXPIRED';
          lifecycleState = tp1Hit ? 'EXITED' : 'EXPIRED';
          break;
        }

        // Check if a pending pullback limit order got filled on this bar before evaluating TP
        if (!entryFilled) {
          const barFilledEntry = isBull
            ? (bar.low <= entryZoneHigh && bar.high >= cleanStopLoss)
            : (bar.high >= entryZoneLow && bar.low <= cleanStopLoss);
          if (barFilledEntry) {
            entryFilled = true;
          }
        }

        const slTouched = isBull ? (bar.low <= cleanStopLoss || bar.close <= cleanStopLoss) : (bar.high >= cleanStopLoss || bar.close >= cleanStopLoss);
        const tp1Touched = isBull ? bar.high >= effectiveTarget1 : bar.low <= effectiveTarget1;
        const tp2Touched = isBull ? bar.high >= targetPrice2 : bar.low <= targetPrice2;

        // If price reaches TP1 before a pending pullback limit entry was ever filled, it is a missed entry (EXPIRED), not TARGET_HIT
        if (!entryFilled && tp1Touched) {
          status = 'EXPIRED';
          lifecycleState = 'EXPIRED';
          break;
        }

        // Trade Management: Resolve same-candle TP & SL conflict using LTF data when available
        if (slTouched && (tp1Touched || tp2Touched)) {
          const nextOpen = candles[k + 1]?.openTime ?? (bar.openTime + intervalMs);
          const resolved = resolveSameBarTpSlOrder(
            bar,
            nextOpen,
            isBull,
            cleanStopLoss,
            tp1Hit ? targetPrice2 : effectiveTarget1,
            ltfCandles
          );
          if (!resolved.usedLtf) {
            resolutionIndeterminate = true;
          }
          if (resolved.order === 'TP_FIRST') {
            if (tp2Touched) {
              tp1Hit = true;
              tp2Hit = true;
              tp2HitIndex = k;
              status = 'EXITED';
              lifecycleState = 'EXITED';
              break;
            }
            if (tp1Touched && !tp1Hit) {
              tp1Hit = true;
              tp1HitIndex = k;
              status = 'EXITED';
              lifecycleState = 'EXITED';
              break;
            }
          }
        }

        // Signal Invalidation / Stop Hit
        if (slTouched) {
          if (!tp1Hit) {
            status = 'INVALIDATED';
            lifecycleState = 'INVALIDATED';
          } else {
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

        // Automatic structural invalidation: expire/invalidate setup if an opposing External/Major BOS/CHoCH occurs
        const opposingBreakOccurred = (breaks || []).some(
          b => b.isBullish !== isBull && b.candleIndex === k && (b.structureType === 'EXTERNAL' || b.significance === 'MAJOR')
        );
        if (opposingBreakOccurred) {
          status = 'INVALIDATED';
          lifecycleState = 'INVALIDATED';
          break;
        }

        // Track departure from entry zone before evaluating pullback retests
        if (!hasDepartedZone) {
          if (isBull ? bar.close > entryZoneHigh : bar.close < entryZoneLow) {
            hasDepartedZone = true;
          }
          continue;
        }

        // Separate RETEST_TOUCHED vs REJECTION_CONFIRMED on completed bars with genuine range:
        const hasRealRange = bar.high > bar.low && (bar.high - bar.low) / Math.max(1e-9, bar.close) >= 0.00005;
        const tappedZone = hasRealRange && (isBull
          ? (bar.low <= entryZoneHigh && bar.high >= cleanStopLoss)
          : (bar.high >= entryZoneLow && bar.low <= cleanStopLoss));

        const barRange = Math.max(1e-9, bar.high - bar.low);
        const upperWickRatio = (bar.high - Math.max(bar.open, bar.close)) / barRange;
        const lowerWickRatio = (Math.min(bar.open, bar.close) - bar.low) / barRange;
        const closePosInBar = (bar.close - bar.low) / barRange;

        const confirmedRejection = hasRealRange && (isBull
          ? (bar.close > cleanStopLoss && bar.close >= requiredHoldLevel && bar.close > bar.open && (closePosInBar >= 0.50 || lowerWickRatio >= 0.25))
          : (bar.close < cleanStopLoss && bar.close <= requiredHoldLevel && bar.close < bar.open && (closePosInBar <= 0.50 || upperWickRatio >= 0.25)));

        const closedBelowBosOrEntry = isBull ? bar.close < requiredHoldLevel : bar.close > requiredHoldLevel;
        const closedBeyondZone = isBull ? bar.close < entryZoneLow : bar.close > entryZoneHigh;

        if (!tp1Hit && tappedZone && confirmedRejection) {
          retestTouched = true;
          // Freeze at the first confirmed rejection bar; only create a new version if a prior locked rejection was negated
          if (firstLockedRejectionBarIdx < 0) {
            if (hadPriorLockedRejection) {
              setupVersion++;
            }
            firstLockedRejectionBarIdx = k;
            hadPriorLockedRejection = true;
          }
          rejectionConfirmed = true;
          retestFailed = false;
          closedBelowBosCount = 0;
          lastRejectionBarIdx = firstLockedRejectionBarIdx;
          status = 'RETESTING';
          lifecycleState = 'RETESTED';
          retestCount++;
        } else if (!tp1Hit && closedBelowBosOrEntry) {
          // Confirmed candle closed below bullish BOS/entry (or above bearish BOS/entry) -> retest failed
          retestTouched = true;
          rejectionConfirmed = false;
          firstLockedRejectionBarIdx = -1;
          retestFailed = true;
          closedBelowBosCount++;
          if (closedBeyondZone || closedBelowBosCount >= 2) {
            status = 'INVALIDATED';
            lifecycleState = 'INVALIDATED';
            break;
          } else {
            status = 'ENTRY_ZONE_REACHED';
            lifecycleState = 'ENTRY_ZONE_REACHED';
          }
        } else if (!tp1Hit && tappedZone && !rejectionConfirmed) {
          retestTouched = true;
          status = 'ENTRY_ZONE_REACHED';
          lifecycleState = 'ENTRY_ZONE_REACHED';
        }

        // If price subsequently closes back beyond requiredHoldLevel against the trade direction, any prior rejection is negated
        if (rejectionConfirmed && k > lastRejectionBarIdx) {
          const recoveredAgainstTrade = isBull ? bar.close < requiredHoldLevel : bar.close > requiredHoldLevel;
          if (recoveredAgainstTrade) {
            rejectionConfirmed = false;
            firstLockedRejectionBarIdx = -1;
            retestTouched = true;
            retestFailed = true;
            status = 'ENTRY_ZONE_REACHED';
            lifecycleState = 'ENTRY_ZONE_REACHED';
          }
        }

        // Signal Expiry: Expire setup if neither touch nor rejection occurs within configurable maxRetestWaitBars
        const maxRetestWaitBars = options?.maxRetestWaitBars ?? SMC_RETEST_EXPIRY_BARS;
        if (!retestTouched && retestCount === 0 && k - effectiveConfirmIdx >= maxRetestWaitBars) {
          status = 'EXPIRED';
          lifecycleState = 'EXPIRED';
          break;
        }

        if (k - effectiveConfirmIdx >= maxLifespanBars && !tp1Hit) {
          status = 'EXPIRED';
          lifecycleState = 'EXPIRED';
          break;
        }
      }
    }

    // 3. Current Bar Reality Invariant Check (governed strictly by setup stopLoss, current price recovery, retest expiry & lifespan)
    const maxRetestWaitBars = options?.maxRetestWaitBars ?? SMC_RETEST_EXPIRY_BARS;
    const lastBar = candles[candles.length - 1];
    if (lastBar && (status === 'CONFIRMED' || status === 'RETESTING' || status === 'ENTRY_ZONE_REACHED' || status === 'PENDING')) {
      if (setupType === 'SESSION_LIQUIDITY' && isIntradaySession && setupDayKey && latestDayKey && setupDayKey !== latestDayKey) {
        // New trading day started: yesterday's strategy does not carry over into today
        status = tp1Hit ? 'EXITED' : 'EXPIRED';
        lifecycleState = tp1Hit ? 'EXITED' : 'EXPIRED';
      } else if (isBull && (lastBar.low <= cleanStopLoss || lastBar.close <= cleanStopLoss)) {
        status = 'INVALIDATED';
        lifecycleState = 'INVALIDATED';
      } else if (!isBull && (lastBar.high >= cleanStopLoss || lastBar.close >= cleanStopLoss)) {
        status = 'INVALIDATED';
        lifecycleState = 'INVALIDATED';
      } else if (!retestTouched && retestCount === 0 && candles.length - 1 - effectiveConfirmIdx >= maxRetestWaitBars) {
        status = 'EXPIRED';
        lifecycleState = 'EXPIRED';
      } else if (candles.length - 1 - effectiveConfirmIdx >= maxLifespanBars) {
        status = 'EXPIRED';
        lifecycleState = 'EXPIRED';
      } else {
        // Check if current price has recovered above short entry or dropped below long entry,
        // or if recent candles show strong opposing recovery momentum:
        // If so, rejection is NOT confirmed — keep setup conditional as RETEST_TOUCHED awaiting a completed rejection candle.
        const prevClosedBar = candles.length >= 2 ? candles[candles.length - 2] : undefined;
        const twoBarOpposingRecovery = Boolean(
          prevClosedBar &&
          (isBull
            ? (prevClosedBar.close < prevClosedBar.open && lastBar.close < lastBar.open && lastBar.close < cleanEntry)
            : (prevClosedBar.close > prevClosedBar.open && lastBar.close > lastBar.open && lastBar.close > cleanEntry))
        );
        const recoveredPastEntryNow = isBull ? lastBar.close < cleanEntry : lastBar.close > cleanEntry;
        const touchingZoneNow = lastBar.high > lastBar.low && (isBull ? lastBar.low <= entryZoneHigh : lastBar.high >= entryZoneLow);
        if (recoveredPastEntryNow || twoBarOpposingRecovery) {
          rejectionConfirmed = false;
          if (hasDepartedZone || touchingZoneNow) {
            retestTouched = true;
            status = 'ENTRY_ZONE_REACHED';
            lifecycleState = 'ENTRY_ZONE_REACHED';
          }
        } else if (!retestTouched && hasDepartedZone && touchingZoneNow) {
          retestTouched = true;
          status = 'ENTRY_ZONE_REACHED';
          lifecycleState = 'ENTRY_ZONE_REACHED';
        }
      }
    }

    // RR-007: use actual next-bar open / close time rather than candles[1] - candles[0]
    const confirmationTime = candleCloseTime(candles, effectiveConfirmIdx);

    const confluence = evaluateInstitutionalConfluence(
      {
        setupType,
        direction,
        candleIndex: effectiveConfirmIdx,
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
        htfBias,
        hasConfirmedTargetPool: Boolean(structuralTp1),
        atrSeries,
        precomputedMacroSwings,
      }
    );

    // 1. Score-based Required Execution Rules (Only accept >= 70; reject all < 70):
    //    < 70  -> REJECT (permanently excluded from active trade list)
    //    70-79 -> CONDITIONAL_SETUP
    //    80-89 -> HIGH_QUALITY_SETUP
    //    90-100-> HIGHEST_PRIORITY_SETUP
    const score = confluence.qualityScore;
    const actionTier: 'REJECT' | 'WATCHLIST_ONLY' | 'CONDITIONAL_SETUP' | 'HIGH_QUALITY_SETUP' | 'HIGHEST_PRIORITY_SETUP' =
      score < 70
        ? 'REJECT'
        : score < 80
        ? 'CONDITIONAL_SETUP'
        : score < 90
        ? 'HIGH_QUALITY_SETUP'
        : 'HIGHEST_PRIORITY_SETUP';

    const qualityApproval: 'REJECTED' | 'WATCHLIST_ONLY' | 'APPROVED' | 'LOW_QUALITY' =
      score < 70 ? 'REJECTED' : 'APPROVED';

    const wasStructurallyActive = status !== 'INVALIDATED' && status !== 'EXPIRED';
    const isRejectedPermanently = score < 70 && wasStructurallyActive;
    const rejectionFactors = score < 70 ? confluence.failedFactors : undefined;
    const rejectionTimestamp = score < 70 ? confirmationTime : undefined;
    const rejectionReason = score < 70
      ? (confluence.failedFactors.length > 0
          ? `Quality ${Math.round(score)}/100 < 70 Min (${confluence.failedFactors.slice(0, 3).join(', ')})`
          : `Quality ${Math.round(score)}/100 < 70 Minimum Threshold`)
      : undefined;

    // Prevent rejected signals (<70) from ever becoming executable without a new setup
    if (score < 70) {
      retestTouched = false;
      rejectionConfirmed = false;
      retestCount = 0;
      tp1Hit = false;
      tp2Hit = false;
      tp1HitIndex = undefined;
      tp2HitIndex = undefined;
    }

    let missedEntry = false;
    let waitingForRetest = false;

    if (!isRejectedPermanently) {
      if (!retestTouched && !rejectionConfirmed && (tp1Hit || tp2Hit)) {
        // Price reached target without ever pulling back to touch the entry zone
        missedEntry = true;
        tp1Hit = false;
        tp2Hit = false;
        status = 'EXPIRED';
        lifecycleState = 'EXPIRED';
      } else if (!retestTouched && !rejectionConfirmed && lastBar) {
        const distPastEntry = isBull ? (lastBar.close - cleanEntry) : (cleanEntry - lastBar.close);
        if (distPastEntry >= riskDistance * 0.65) {
          missedEntry = true;
          status = 'PENDING';
        } else {
          waitingForRetest = true;
          status = 'CONFIRMED';
        }
      }
    }

    // If a confirmed candle closed beyond BOS/entry and price never reclaimed it with a rejection candle, mark retest as FAILED / INVALIDATED
    if (retestFailed && !rejectionConfirmed) {
      status = 'INVALIDATED';
      lifecycleState = 'INVALIDATED';
    }

    // Requirement 5: Recalculate entry, stop-loss and targets after confirmation from the actual confirmed rejection candle
    let finalEntry = cleanEntry;
    let finalSl = roundSmcPrice(cleanStopLoss);
    let finalRisk = riskDistance;
    let finalTp1 = effectiveTarget1;
    let finalTp2 = targetPrice2;
    let finalReward = rewardDistance;
    let finalRr = computedRr;

    if (rejectionConfirmed && !retestFailed && lastRejectionBarIdx >= 0 && status !== 'INVALIDATED' && status !== 'EXPIRED') {
      const rejBar = candles[lastRejectionBarIdx];
      if (rejBar) {
        const recalcEntry = roundSmcPrice(
          isBull ? Math.max(requiredHoldLevel, rejBar.close) : Math.min(requiredHoldLevel, rejBar.close)
        );
        const recalcSl = roundSmcPrice(
          isBull
            ? Math.min(cleanStopLoss, rejBar.low - atrVal * 0.25)
            : Math.max(cleanStopLoss, rejBar.high + atrVal * 0.25)
        );
        const recalcRisk = Math.max(Math.abs(recalcEntry - recalcSl), atrVal * 0.25);
        const recalcMinTp1 = recalcRisk * rp.target1R;
        const recalcPools = candidatePools.filter(p => {
          const inDir = isBull ? p.price > recalcEntry : p.price < recalcEntry;
          const d = Math.abs(p.price - recalcEntry);
          return inDir && d >= recalcMinTp1 && d <= recalcRisk * 4.5;
        });
        const recalcStructTp1 = recalcPools[0];
        const recalcTp1 = roundSmcPrice(
          recalcStructTp1
            ? recalcStructTp1.price
            : isBull
              ? recalcEntry + recalcMinTp1
              : recalcEntry - recalcMinTp1
        );
        const recalcReward = Math.abs(recalcTp1 - recalcEntry);
        const recalcRr = Number((recalcReward / Math.max(1e-9, recalcRisk)).toFixed(2));
        if (recalcRr >= rp.minRiskReward) {
          finalEntry = recalcEntry;
          finalSl = recalcSl;
          finalRisk = recalcRisk;
          finalTp1 = recalcTp1;
          finalReward = recalcReward;
          finalRr = recalcRr;
          const recalcMinTp2 = Math.max(recalcReward + Math.max(recalcRisk * 0.35, atrVal * 0.4), recalcRisk * rp.target2R);
          const recalcStructTp2 = recalcPools.find(p => Math.abs(p.price - recalcEntry) >= recalcMinTp2);
          finalTp2 = roundSmcPrice(
            recalcStructTp2
              ? recalcStructTp2.price
              : isBull
                ? recalcEntry + recalcRisk * rp.target2R
                : recalcEntry - recalcRisk * rp.target2R
          );
        }
      }
    }

    // Separate independent states: CONDITIONAL_SETUP, RETEST_TOUCHED, RETEST_FAILED, REJECTION_CONFIRMED, ENTRY_READY, and EXECUTED
    const confirmedOrderFill = false;
    const lastClosedIdx = candles[candles.length - 1]?.isClosed === true ? candles.length - 1 : Math.max(0, candles.length - 2);
    const distInTradeDir = lastBar ? (isBull ? (lastBar.close - finalEntry) : (finalEntry - lastBar.close)) : -1;
    const holdingAboveBosNow = lastBar ? (isBull ? lastBar.close >= requiredHoldLevel : lastBar.close <= requiredHoldLevel) : false;
    const isEntryReadyNow = Boolean(
      !isRejectedPermanently &&
      !retestFailed &&
      rejectionConfirmed &&
      holdingAboveBosNow &&
      lastBar &&
      lastBar.high > lastBar.low &&
      distInTradeDir >= 0 &&
      distInTradeDir <= finalRisk * 0.30 &&
      lastRejectionBarIdx >= 0 &&
      (lastClosedIdx - lastRejectionBarIdx <= 3)
    );

    const signalState: 'REJECTED' | 'WATCHLIST_ONLY' | 'CONDITIONAL_SETUP' | 'WAITING_FOR_RETEST' | 'PENDING_RETEST' | 'RETEST_TOUCHED' | 'RETEST_FAILED' | 'REJECTION_CONFIRMED' | 'RETEST_CONFIRMED' | 'ENTRY_READY' | 'ORDER_SUBMITTED' | 'EXECUTED' | 'MISSED_ENTRY' | 'EXPIRED' | 'INVALIDATED' | 'PENDING' | 'CONFIRMED' =
      isRejectedPermanently || actionTier === 'REJECT'
        ? 'REJECTED'
        : retestFailed && closedBelowBosCount === 1
        ? 'RETEST_FAILED'
        : status === 'INVALIDATED'
        ? 'INVALIDATED'
        : status === 'EXPIRED'
        ? (missedEntry ? 'MISSED_ENTRY' : 'EXPIRED')
        : missedEntry
        ? 'MISSED_ENTRY'
        : confirmedOrderFill
        ? 'EXECUTED'
        : rejectionConfirmed && holdingAboveBosNow
        ? (score >= 75 && isEntryReadyNow ? 'ENTRY_READY' : 'REJECTION_CONFIRMED')
        : retestTouched
        ? 'RETEST_TOUCHED'
        : waitingForRetest
        ? 'CONDITIONAL_SETUP'
        : 'CONDITIONAL_SETUP';

    const isExecutable = Boolean(
      !isRejectedPermanently &&
      !retestFailed &&
      rejectionConfirmed &&
      holdingAboveBosNow &&
      (signalState === 'ENTRY_READY' || signalState === 'REJECTION_CONFIRMED' || signalState === 'EXECUTED') &&
      status !== 'INVALIDATED' &&
      status !== 'EXPIRED'
    );

    const isEntryLocked = Boolean(
      !isRejectedPermanently &&
      !retestFailed &&
      rejectionConfirmed &&
      firstLockedRejectionBarIdx >= 0 &&
      (signalState === 'ENTRY_READY' || signalState === 'REJECTION_CONFIRMED' || signalState === 'EXECUTED') &&
      status !== 'INVALIDATED' &&
      status !== 'EXPIRED'
    );

    const versionSuffix = setupVersion > 1 ? `_v${setupVersion}` : '';

    return {
      id: `${baseId}${versionSuffix}_${effectiveConfirmTime}`,
      name: setupVersion > 1 ? `${name} (v${setupVersion})` : name,
      setupType,
      direction,
      candleIndex: effectiveConfirmIdx,
      time: effectiveConfirmTime,
      entryPrice: finalEntry,
      stopLoss: finalSl,
      targetPrice: finalTp1,
      targetPrice2: finalTp2,
      riskReward: finalRr,
      status: isRejectedPermanently ? 'INVALIDATED' : status,
      lifecycleState: isRejectedPermanently ? 'INVALIDATED' : lifecycleState,
      retestCount,
      retestTouched,
      retestFailed,
      rejectionConfirmed,
      isExecutable,
      isEntryLocked,
      setupVersion,
      invalidationBasis,
      description,
      invalidationLevel: finalSl,
      formationTime: effectiveConfirmTime,
      confirmationTime,
      qualityScore: confluence.qualityScore,
      confluenceTier: confluence.confluenceTier,
      institutionalClass: confluence.institutionalClass,
      confluenceBreakdown: confluence.confluenceBreakdown,
      auditReasons: confluence.auditReasons,
      htfBias,
      ltfBias,
      riskDistance: roundSmcPrice(finalRisk),
      rewardDistance: roundSmcPrice(finalReward),
      confluenceScore: confluence.qualityScore,
      tp1Hit,
      tp1HitIndex,
      tp2Hit,
      tp2HitIndex,
      signalState,
      actionTier,
      qualityApproval,
      confirmedOrderFill,
      isRejectedPermanently,
      ...(rejectionReason ? { rejectionReason } : {}),
      ...(rejectionTimestamp ? { rejectionTimestamp } : {}),
      ...(rejectionFactors ? { rejectionFactors } : {}),
      entryBasis,
      tp1Source,
      tp2Source,
      ...(validatingBreak ? { validatingBreak } : {}),
      ...(stopLossAdjusted ? { stopLossAdjusted: true } : {}),
      ...(resolutionIndeterminate ? { resolutionIndeterminate: true } : {}),
    };
  };

  const rpDefault: SmcRiskProfile = { ...DEFAULT_SMC_RISK_PROFILE, ...riskProfile };
  const atrBufferAt = (idx: number, factor = 0.25): number => {
    const a = atrSeries[Math.min(Math.max(0, idx), atrSeries.length - 1)] || lastPrice * 0.003;
    return Math.max(a * factor, lastPrice * 0.0003);
  };

  // ── Strategy 1: BOS Continuation Scanner
  const recentBOS = breaks.filter((b) => b.breakType === 'BOS').slice(-40);
  for (const brk of recentBOS) {
    const isBull = brk.isBullish;
    const entry = brk.price;
    const refSwing = brk.protectedSwingPrice ?? brk.brokenSwingPrice;
    const buf = atrBufferAt(brk.candleIndex);
    const sl = isBull
      ? roundSmcPrice(Math.min(refSwing, entry - buf) - buf * 0.25, symbol)
      : roundSmcPrice(Math.max(refSwing, entry + buf) + buf * 0.25, symbol);
    const risk = Math.max(Math.abs(entry - sl), buf);
    const tp = isBull
      ? roundSmcPrice(entry + risk * rpDefault.target1R, symbol)
      : roundSmcPrice(entry - risk * rpDefault.target1R, symbol);
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
      `Decisive break of structure at ${roundSmcPrice(brk.price, symbol)} in trend direction.`
    ));
  }

  // ── Strategy 2: CHoCH / MSS Reversal Scanner
  const recentCHoCH = breaks.filter((b) => b.breakType === 'CHoCH' || b.breakType === 'MSS').slice(-40);
  for (const brk of recentCHoCH) {
    const isBull = brk.isBullish;
    const entry = brk.price;
    const refSwing = brk.protectedSwingPrice ?? brk.brokenSwingPrice;
    const buf = atrBufferAt(brk.candleIndex);
    const sl = isBull
      ? roundSmcPrice(Math.min(refSwing, entry - buf) - buf * 0.25, symbol)
      : roundSmcPrice(Math.max(refSwing, entry + buf) + buf * 0.25, symbol);
    const risk = Math.max(Math.abs(entry - sl), buf);
    const tp = isBull
      ? roundSmcPrice(entry + risk * rpDefault.target1R, symbol)
      : roundSmcPrice(entry - risk * rpDefault.target1R, symbol);
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
      `Structural ${brk.breakType} trend invalidation confirmed at ${roundSmcPrice(brk.price, symbol)}.`
    ));
  }

  const findSweepConfirmationBar = (sw: SmcLiquiditySweep, isBull: boolean): number | null => {
    const sweepCandle = candles[sw.candleIndex];
    if (!sweepCandle) return null;
    const maxLookahead = Math.min(candles.length - 1, sw.candleIndex + 15);
    for (let k = sw.candleIndex + 1; k <= maxLookahead; k++) {
      const bar = candles[k];
      if (!isCandleClosed(bar)) break;
      const hasBreak = breaks.some((b) => b.isBullish === isBull && b.candleIndex === k);
      const hasDisplacementClose = isBull ? bar.close > sweepCandle.high : bar.close < sweepCandle.low;
      if (hasBreak || hasDisplacementClose) {
        return k;
      }
    }
    return null;
  };

  // ── Strategy 3: Liquidity Sweep Reversal (Mirrored BSL/SSL)
  const recentSweeps = sweeps.slice(-40);
  for (const sw of recentSweeps) {
    const isBull = !sw.isHighSweep; // SSL sweep = Bullish reversal
    const confirmIdx = findSweepConfirmationBar(sw, isBull);
    if (confirmIdx === null) continue;

    const validation = validateSetupDirectionalConfirmation(
      isBull ? 'BULLISH' : 'BEARISH',
      'LIQUIDITY_SWEEP',
      confirmIdx,
      candles,
      breaks,
      sweeps,
      htfBias,
      ltfBias
    );
    if (!validation.isValid) continue;

    const confirmBar = candles[confirmIdx];
    const entry = confirmBar?.close || lastPrice;
    const slAtr = atrSeries[Math.min(confirmIdx, atrSeries.length - 1)] || entry * 0.003;
    const sl = isBull ? roundSmcPrice(sw.price - slAtr * 0.25) : roundSmcPrice(sw.price + slAtr * 0.25);
    const risk = Math.max(Math.abs(entry - sl), entry * 0.005);
    const tp = isBull
      ? roundSmcPrice(entry + risk * rpDefault.target1R)
      : roundSmcPrice(entry - risk * rpDefault.target1R);
    setups.push(makeSetup(
      `setup_sweep_${sw.candleIndex}`,
      isBull ? 'SSL Liquidity Pool Sweep (Bullish)' : 'BSL Liquidity Pool Sweep (Bearish)',
      'LIQUIDITY_SWEEP',
      isBull ? 'BULLISH' : 'BEARISH',
      confirmIdx,
      confirmBar?.openTime ?? sw.time,
      entry,
      sl,
      tp,
      `Rejection wick (${(sw.wickRatio * 100).toFixed(0)}%) swept ${roundSmcPrice(sw.sweptLevelPrice)} liquidity pool and confirmed at bar #${confirmIdx}. ${validation.reason}`
    ));
  }

  // ── Strategy 4: Equal Highs & Equal Lows (EQH / EQL Sweep)
  const eqSwept = sweeps.filter((s) => s.label.includes('EQH') || s.label.includes('EQL')).slice(-40);
  for (const eq of eqSwept) {
    const isBull = !eq.isHighSweep;
    const confirmIdx = findSweepConfirmationBar(eq, isBull);
    if (confirmIdx === null) continue;

    const validation = validateSetupDirectionalConfirmation(
      isBull ? 'BULLISH' : 'BEARISH',
      'EQH_EQL_SWEEP',
      confirmIdx,
      candles,
      breaks,
      sweeps,
      htfBias,
      ltfBias
    );
    if (!validation.isValid) continue;

    const confirmBar = candles[confirmIdx];
    const entry = confirmBar?.close || lastPrice;
    const slAtr = atrSeries[Math.min(confirmIdx, atrSeries.length - 1)] || entry * 0.003;
    const sl = isBull ? roundSmcPrice(eq.price - slAtr * 0.25) : roundSmcPrice(eq.price + slAtr * 0.25);
    const risk = Math.max(Math.abs(entry - sl), entry * 0.005);
    const tp = isBull
      ? roundSmcPrice(entry + risk * rpDefault.target1R)
      : roundSmcPrice(entry - risk * rpDefault.target1R);
    setups.push(makeSetup(
      `setup_eq_${eq.candleIndex}`,
      isBull ? 'EQL Pool Liquidity Purge (Bullish)' : 'EQH Pool Liquidity Purge (Bearish)',
      'EQH_EQL_SWEEP',
      isBull ? 'BULLISH' : 'BEARISH',
      confirmIdx,
      confirmBar?.openTime ?? eq.time,
      entry,
      sl,
      tp,
      `Engineered ${isBull ? 'Equal Lows' : 'Equal Highs'} pool at ${roundSmcPrice(eq.sweptLevelPrice)} purged and confirmed at bar #${confirmIdx}. ${validation.reason}`
    ));
  }

  // ── Strategy 5: Fair Value Gap (FVG) Retracement (Genuine unmitigated gap with ATR displacement)
  const activeFvgs = fvgs.filter((f) => !f.isInverse && !f.isInvalidated && !f.isMitigated && f.state === 'FRESH').slice(-40);
  for (const fvg of activeFvgs) {
    const isBull = fvg.isBullish;
    const impulseBar = candles[fvg.startIndex + 1];
    if (!impulseBar || !isCandleClosed(impulseBar)) continue;
    const impulseBody = isBull ? (impulseBar.close - impulseBar.open) : (impulseBar.open - impulseBar.close);
    const localAtr = atrSeries[Math.min(fvg.startIndex + 1, atrSeries.length - 1)] || fvg.cePrice * 0.002;
    if (impulseBody < localAtr * 0.6) continue;

    let confIdx = fvg.confirmationIndex ?? Math.min(candles.length - 1, fvg.startIndex + 2);
    if (isIntradaySession && confIdx < firstTodayIdx) {
      let todayTap = -1;
      for (let k = firstTodayIdx; k < candles.length; k++) {
        if (candles[k].low <= fvg.topPrice && candles[k].high >= fvg.bottomPrice) {
          todayTap = k;
          break;
        }
      }
      if (todayTap >= firstTodayIdx) confIdx = todayTap;
    }
    const confTime = candles[confIdx]?.openTime ?? fvg.formationTime;
    const entry = fvg.cePrice; // 50% CE entry
    const buf = atrBufferAt(confIdx);
    const sl = isBull ? fvg.bottomPrice - buf : fvg.topPrice + buf;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;
    setups.push(makeSetup(
      `setup_fvg_${fvg.id}`,
      isBull ? 'Bullish FVG 50% CE Retracement' : 'Bearish FVG 50% CE Retracement',
      'FVG_TAP',
      isBull ? 'BULLISH' : 'BEARISH',
      confIdx,
      confTime,
      entry,
      sl,
      tp,
      `Unmitigated displacement FVG [${fvg.bottomPrice.toFixed(2)} - ${fvg.topPrice.toFixed(2)}] with Consequent Encroachment at ${fvg.cePrice.toFixed(2)}.`
    ));
  }

  // ── Strategy 6: Order Block (OB) Retest in Discount/Premium
  const activeObs = orderBlocks.filter((ob) => !ob.isMitigated).slice(-40);
  for (const ob of activeObs) {
    const isBull = ob.isBullish;

    let anchorIdx = ob.confirmationIndex ?? Math.min(candles.length - 1, ob.startIndex + 1);
    if (isIntradaySession && anchorIdx < firstTodayIdx) {
      let todayTap = -1;
      for (let k = firstTodayIdx; k < candles.length; k++) {
        if (candles[k].low <= ob.topPrice && candles[k].high >= ob.bottomPrice) {
          todayTap = k;
          break;
        }
      }
      if (todayTap >= firstTodayIdx) anchorIdx = todayTap;
    }
    const anchorTime = candles[anchorIdx]?.openTime ?? ob.formationTime;
    const entry = (ob.topPrice + ob.bottomPrice) / 2;
    const buf = atrBufferAt(anchorIdx);
    const sl = isBull ? ob.bottomPrice - buf : ob.topPrice + buf;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;

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
      `High-volume ${isBull ? 'Demand' : 'Supply'} order block [${ob.bottomPrice.toFixed(2)} - ${ob.topPrice.toFixed(2)}] confirmed. ${validation.reason}`
    ));
  }

  // ── Strategy 7: Breaker Block Role Reversal
  const activeBreakers = breakers.filter((b) => !b.isMitigated).slice(-40);
  for (const brk of activeBreakers) {
    const isBull = brk.label.includes('Bull') || (brk.isBreaker ? brk.isBullish : !brk.isBullish);

    let anchorIdx = brk.confirmationIndex ?? Math.min(candles.length - 1, brk.endIndex);
    if (isIntradaySession && anchorIdx < firstTodayIdx) {
      let todayTap = -1;
      for (let k = firstTodayIdx; k < candles.length; k++) {
        if (candles[k].low <= brk.topPrice && candles[k].high >= brk.bottomPrice) {
          todayTap = k;
          break;
        }
      }
      if (todayTap >= firstTodayIdx) anchorIdx = todayTap;
    }
    const anchorTime = candles[anchorIdx]?.openTime ?? brk.formationTime;
    const entry = (brk.topPrice + brk.bottomPrice) / 2;
    const buf = atrBufferAt(anchorIdx);
    const sl = isBull ? brk.bottomPrice - buf : brk.topPrice + buf;
    const tp = isBull ? dealingRange.highPrice : dealingRange.lowPrice;

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
      `Failed order block flipped polarity at [${brk.bottomPrice.toFixed(2)} - ${brk.topPrice.toFixed(2)}] confirmed. ${validation.reason}`
    ));
  }

  // ── Strategy 8: Premium & Discount Dealing Ranges (OTE)
  if (dealingRange.highPrice > dealingRange.lowPrice) {
    const dOteMin = dealingRange.discountOteRange ? dealingRange.discountOteRange[0] : dealingRange.lowPrice + (dealingRange.highPrice - dealingRange.lowPrice) * 0.214;
    const dOteMax = dealingRange.discountOteRange ? dealingRange.discountOteRange[1] : dealingRange.lowPrice + (dealingRange.highPrice - dealingRange.lowPrice) * 0.382;
    const pOteMin = dealingRange.premiumOteRange ? dealingRange.premiumOteRange[0] : dealingRange.lowPrice + (dealingRange.highPrice - dealingRange.lowPrice) * 0.618;
    const pOteMax = dealingRange.premiumOteRange ? dealingRange.premiumOteRange[1] : dealingRange.lowPrice + (dealingRange.highPrice - dealingRange.lowPrice) * 0.786;

    // Scan forward over closed candles in the current window so the initial OTE anchor does not jump on every new bar
    const lookback = Math.min(candles.length, 12);
    const startOteScanIdx = Math.max(0, candles.length - lookback);

    // Bullish: Price tapped Discount OTE zone (deep discount retracement)
    for (let i = startOteScanIdx; i < candles.length; i++) {
      const c = candles[i];
      if (!isCandleClosed(c)) continue;
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
        const sl = dealingRange.lowPrice - atrBufferAt(i);
        const tp = dealingRange.highPrice;
        if (entry > sl && tp > entry) {
          const st = makeSetup(
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
          );
          setups.push(st);
          if (st.qualityScore >= 60 && st.status !== 'INVALIDATED' && st.status !== 'EXPIRED') {
            break; // Lock to first valid active OTE tap in current window so entry does not shift on newer bars
          }
        }
      }
    }

    // Bearish: Price tapped Premium OTE zone (high premium retracement)
    for (let i = startOteScanIdx; i < candles.length; i++) {
      const c = candles[i];
      if (!isCandleClosed(c)) continue;
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
        const sl = dealingRange.highPrice + atrBufferAt(i);
        const tp = dealingRange.lowPrice;
        if (entry < sl && tp < entry) {
          const st = makeSetup(
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
          );
          setups.push(st);
          if (st.qualityScore >= 60 && st.status !== 'INVALIDATED' && st.status !== 'EXPIRED') {
            break; // Lock to first valid active OTE tap in current window so entry does not shift on newer bars
          }
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
        isBull ? matchingOb.bottomPrice - atrBufferAt(lastBrk.candleIndex) : matchingOb.topPrice + atrBufferAt(lastBrk.candleIndex),
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
        lastCandle.high + atrBufferAt(candles.length - 1),
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
        lastCandle.low - atrBufferAt(candles.length - 1),
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
          isBull ? fvg.bottomPrice - atrBufferAt(fvg.startIndex) : fvg.topPrice + atrBufferAt(fvg.startIndex),
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
        isBull ? nearbyFvg.bottomPrice - atrBufferAt(nearbyFvg.startIndex) : nearbyFvg.topPrice + atrBufferAt(nearbyFvg.startIndex),
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
        isBull ? ob.bottomPrice - atrBufferAt(ob.startIndex) : ob.topPrice + atrBufferAt(ob.startIndex),
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
        isBull ? ob.bottomPrice - atrBufferAt(lastSwing.index) : ob.topPrice + atrBufferAt(lastSwing.index),
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
        isBull ? sw.price - atrBufferAt(sw.candleIndex) : sw.price + atrBufferAt(sw.candleIndex),
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
    const sl = isBull ? ifvg.bottomPrice - atrBufferAt(ifvg.startIndex) : ifvg.topPrice + atrBufferAt(ifvg.startIndex);
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

    // Keep REJECTED signals (< 70 score) strictly out of the active/accepted trade list,
    // while recording them in rejectedOut with their exact rejection reason, timestamp, and invalidation level.
    if (st.isRejectedPermanently || st.qualityScore < 60 || st.signalState === 'REJECTED' || st.actionTier === 'REJECT') {
      if (st.isRejectedPermanently && rejectedOut) {
        rejectedOut.push(st);
      }
      return false;
    }

    // SMC-A: Record EVERY validated setup (open, winner, stopped-out INVALIDATED, and EXPIRED) in setupHistory
    if (historyOut) {
      historyOut.push(st);
    }

    // If setup is structurally invalidated or expired, do not emit as active setup
    if (st.status === 'INVALIDATED' || st.status === 'EXPIRED') return false;

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
  const tfMs = timeframeToMs(timeframe);
  const nowMs = Date.now();
  let closedCount = 0;
  let firstClosedOpen = 0;
  let lastClosedOpen = 0;
  let lastClosedClose = 0;
  for (let i = 0; i < candles.length; i++) {
    if (isCandleClosed(candles[i], tfMs, nowMs)) {
      if (closedCount === 0) firstClosedOpen = candles[i].openTime;
      closedCount++;
      lastClosedOpen = candles[i].openTime;
      lastClosedClose = candles[i].close;
    }
  }
  const htfCandles = config?.htfCandles;
  let htfLastClosedOpen = 0;
  let htfClosedCount = 0;
  if (htfCandles && htfCandles.length > 0) {
    for (let i = htfCandles.length - 1; i >= 0; i--) {
      if (htfCandles[i]?.isClosed === true) {
        if (htfLastClosedOpen === 0) htfLastClosedOpen = htfCandles[i].openTime;
        htfClosedCount++;
      }
    }
  }
  const htfHash = htfClosedCount > 0 ? `${htfClosedCount}_${htfLastClosedOpen}` : 'no_htf';
  const versionSegment = dataVersion !== undefined ? `v${dataVersion}:` : '';
  const f = config?.filters;
  const cfgSegment = config
    ? `sw${config.swingLength ?? DEFAULT_SMC_CONFIG.swingLength}_b${config.showBullishSetups !== false ? 1 : 0}_s${config.showBearishSetups !== false ? 1 : 0}_d${f?.requireDisplacement ? f?.displacementAtrMultiple ?? 1.0 : 0}_v${f?.requireVolumeExpansion ? f?.volumeSmaMultiple ?? 1.1 : 0}_htf${htfHash}:`
    : '';
  return `${symbol}:${timeframe}:${versionSegment}${cfgSegment}${closedCount}:${firstClosedOpen}:${lastClosedOpen}:${lastClosedClose}`;
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
  if (!isValidVerifiedCandleDataset(candles, timeframeToMs(timeframe))) {
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
        discountOteRange: [p * 0.96, p * 0.98],
        premiumOteRange: [p * 1.02, p * 1.04],
      },
      sessionLevels: {},
      confirmedSetups: [],
      allSetups: [],
      equilibriumPrice: p,
    };
  }

  // Compute O(1) Closed-Bar Fingerprint for Cache Check (including SmcConfig)
  const fingerprint = computeCandlesFingerprint(symbol, timeframe, candles, dataVersion, config);
  const cached = _smcMemoryCache.get(fingerprint);
  if (cached) {
    return cached;
  }

  // Run SMC engine strictly on closed bars only
  const tfMs = timeframeToMs(timeframe);
  const nowMs = Date.now();
  const closedCandles = candles.filter(c => isCandleClosed(c, tfMs, nowMs));
  candles = closedCandles;

  const opt = config?.filters;
  const swingLen: number = (config?.swingLength ?? DEFAULT_SMC_CONFIG.swingLength) ?? 5;

  // 1. Detect Swings (Adaptive to dataset length so all timeframes including 1W / 1M / 1m work cleanly)
  const majorLookback =
    candles.length < 35
      ? 2
      : candles.length < 70
      ? 3
      : candles.length < 120
      ? Math.min(5, Math.max(3, swingLen))
      : Math.max(5, swingLen);
  const majorSwings = detectSwingPoints(candles, majorLookback, true);
  const minorLookback =
    candles.length < 35
      ? 1
      : Math.max(2, Math.floor(majorLookback / 2));
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

  // 8. Detect All 16 Confirmed SMC Setups (strictly separating >= 70 accepted setups from < 70 rejected setups)
  const rawRejectedSetups: SmcConfirmedSetup[] = [];
  const rawSetupHistory: SmcConfirmedSetup[] = [];
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
    config?.riskProfile,
    config?.ltfCandles,
    liquidityLevels,
    rawRejectedSetups,
    symbol,
    rawSetupHistory
  );

  // Directional filtering across all enabled SMC strategies
  const isBullAllowed = config?.showBullishSetups !== false;
  const isBearAllowed = config?.showBearishSetups !== false;

  const filteredSetups = allSetups.filter((s) => {
    if (s.direction === 'BULLISH' && !isBullAllowed) return false;
    if (s.direction === 'BEARISH' && !isBearAllowed) return false;
    if (s.qualityScore < 60 || s.isRejectedPermanently || s.signalState === 'REJECTED' || s.actionTier === 'REJECT') return false;
    return true;
  });

  const rejectedSetups = rawRejectedSetups.filter((s) => {
    if (s.direction === 'BULLISH' && !isBullAllowed) return false;
    if (s.direction === 'BEARISH' && !isBearAllowed) return false;
    return true;
  });

  const setupHistory = rawSetupHistory.filter((s) => {
    if (s.direction === 'BULLISH' && !isBullAllowed) return false;
    if (s.direction === 'BEARISH' && !isBearAllowed) return false;
    return true;
  });

  const confirmedSetups = filteredSetups.filter(
    (s) =>
      (s.status === 'CONFIRMED' || s.status === 'RETESTING' || s.status === 'ENTRY_ZONE_REACHED') &&
      s.qualityScore >= 60 &&
      !s.isRejectedPermanently &&
      !s.retestFailed &&
      s.signalState !== 'REJECTED' &&
      s.signalState !== 'RETEST_FAILED' &&
      s.signalState !== 'INVALIDATED' &&
      s.actionTier !== 'REJECT'
  );

  const executableSetups = confirmedSetups.filter((s) => s.isExecutable === true);

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
    executableSetups,
    activeSetups: filteredSetups,
    allSetups: filteredSetups,
    setupHistory,
    rejectedSetups,
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
