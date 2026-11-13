// ═══════════════════════════════════════════════════════════════════════════
// MASTER STRATEGY-TO-INDICATOR MAPPING & CHART CONFIGURATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
// Defines the exact corresponding indicators, overlays, and chart setups
// for all 38 institutional trading strategies.
// ═══════════════════════════════════════════════════════════════════════════

import type { IndicatorType, IndicatorConfig } from '@/lib/types';
import { INDICATOR_DEFAULTS } from '@/lib/types';

export interface StrategyIndicatorSetup {
  strategyId: string;
  strategyName: string;
  category: string;
  correspondingIndicators: string[];
  indicatorKeys: string[];
  indicatorConfigs: IndicatorConfig[];
  isSmc: boolean;
  smcSetupId?: string;
  isVolumeProfile: boolean;
  isOrderFlow: boolean;
  isQuantumAi: boolean;
  timeframe: string;
  badgeLabel: string;
}

export const STRATEGY_INDICATOR_MAP: Record<string, StrategyIndicatorSetup> = {
  // ── 1. Flagship Institutional ──
  quantum_ai_smc_resonance: {
    strategyId: 'quantum_ai_smc_resonance',
    strategyName: 'Quantum AI Multi-Timeframe SMC & Resonance',
    category: 'Flagship Institutional',
    correspondingIndicators: ['Quantum AI Resonance Engine (0-100% HUD)', 'SMC Structure Overlay', 'Volume Profile (VPVR)'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    isVolumeProfile: true,
    isOrderFlow: false,
    isQuantumAi: true,
    timeframe: '1D',
    badgeLabel: 'Quantum AI + SMC + Volume Profile',
  },

  // ── 2. Classic Technical Trend Following ──
  ma_alignment: {
    strategyId: 'ma_alignment',
    strategyName: 'Moving Average Trend Alignment',
    category: 'Trend Following',
    correspondingIndicators: ['SMA (50)', 'SMA (200)'],
    indicatorKeys: ['sma50', 'sma200'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.SMA, type: 'SMA', id: 'sma_50', period: 50, color: '#38BDF8', enabled: true },
      { ...INDICATOR_DEFAULTS.SMA, type: 'SMA', id: 'sma_200', period: 200, color: '#F59E0B', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMA 50 + SMA 200',
  },
  golden_cross: {
    strategyId: 'golden_cross',
    strategyName: 'Golden Cross (50/200 SMA)',
    category: 'Trend Following',
    correspondingIndicators: ['SMA (50)', 'SMA (200)'],
    indicatorKeys: ['sma50', 'sma200'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.SMA, type: 'SMA', id: 'sma_50', period: 50, color: '#10B981', enabled: true },
      { ...INDICATOR_DEFAULTS.SMA, type: 'SMA', id: 'sma_200', period: 200, color: '#F59E0B', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMA 50 + SMA 200 (Golden Cross)',
  },
  death_cross: {
    strategyId: 'death_cross',
    strategyName: 'Death Cross (50/200 SMA)',
    category: 'Trend Following',
    correspondingIndicators: ['SMA (50)', 'SMA (200)'],
    indicatorKeys: ['sma50', 'sma200'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.SMA, type: 'SMA', id: 'sma_50', period: 50, color: '#EF4444', enabled: true },
      { ...INDICATOR_DEFAULTS.SMA, type: 'SMA', id: 'sma_200', period: 200, color: '#F59E0B', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMA 50 + SMA 200 (Death Cross)',
  },
  ma_20_50_cross: {
    strategyId: 'ma_20_50_cross',
    strategyName: '20/50 Moving Average Crossover',
    category: 'Trend Following',
    correspondingIndicators: ['SMA (20)', 'SMA (50)'],
    indicatorKeys: ['sma20', 'sma50'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.SMA, type: 'SMA', id: 'sma_20', period: 20, color: '#10B981', enabled: true },
      { ...INDICATOR_DEFAULTS.SMA, type: 'SMA', id: 'sma_50', period: 50, color: '#38BDF8', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMA 20 + SMA 50',
  },
  ema_9_21_cross: {
    strategyId: 'ema_9_21_cross',
    strategyName: '9/21 EMA Trend Ribbon',
    category: 'Trend Following',
    correspondingIndicators: ['EMA (9)', 'EMA (21)'],
    indicatorKeys: ['ema9', 'ema21'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.EMA, type: 'EMA', id: 'ema_9', period: 9, color: '#A855F7', enabled: true },
      { ...INDICATOR_DEFAULTS.EMA, type: 'EMA', id: 'ema_21', period: 21, color: '#EC4899', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'EMA 9 + EMA 21 Ribbon',
  },
  adx_trend: {
    strategyId: 'adx_trend',
    strategyName: 'ADX Strong Trend Continuation',
    category: 'Trend Following',
    correspondingIndicators: ['ADX (14)', 'EMA (9)', 'EMA (21)'],
    indicatorKeys: ['adx', 'ema9', 'ema21'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.ADX, type: 'ADX', id: 'adx_14', period: 14, color: '#EAB308', enabled: true },
      { ...INDICATOR_DEFAULTS.EMA, type: 'EMA', id: 'ema_9', period: 9, color: '#A855F7', enabled: true },
      { ...INDICATOR_DEFAULTS.EMA, type: 'EMA', id: 'ema_21', period: 21, color: '#EC4899', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'ADX 14 + EMA 9/21',
  },

  // ── 3. Momentum & Mean Reversion ──
  rsi_momentum: {
    strategyId: 'rsi_momentum',
    strategyName: 'RSI Multi-Timeframe Momentum',
    category: 'Momentum',
    correspondingIndicators: ['RSI (14)'],
    indicatorKeys: ['rsi'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.RSI, type: 'RSI', id: 'rsi_14', period: 14, color: '#818CF8', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'RSI (14)',
  },
  macd_cross: {
    strategyId: 'macd_cross',
    strategyName: 'MACD Signal Line Crossover',
    category: 'Momentum',
    correspondingIndicators: ['MACD (12, 26, 9)'],
    indicatorKeys: ['macd'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.MACD, type: 'MACD', id: 'macd_default', color: '#38BDF8', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'MACD (12, 26, 9)',
  },
  bb_reversal: {
    strategyId: 'bb_reversal',
    strategyName: 'Bollinger Band Squeeze & Expansion',
    category: 'Mean Reversion',
    correspondingIndicators: ['Bollinger Bands (20, 2σ)'],
    indicatorKeys: ['bollinger'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.BOLLINGER_BANDS, type: 'BOLLINGER_BANDS', id: 'bb_20', period: 20, multiplier: 2, color: '#6366F1', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'Bollinger Bands (20, 2σ)',
  },
  breakout: {
    strategyId: 'breakout',
    strategyName: 'Volume Breakout (20-Day Range)',
    category: 'Breakout',
    correspondingIndicators: ['Donchian Channel (20)', 'Volume (200%)'],
    indicatorKeys: ['donchian'],
    indicatorConfigs: [
      { ...INDICATOR_DEFAULTS.DONCHIAN, type: 'DONCHIAN', id: 'donchian_20', period: 20, color: '#F97316', enabled: true },
    ],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'Donchian 20 + Volume',
  },

  // ── 4. Smart Money Concepts (SMC) Core & Confluence ──
  smc_master: {
    strategyId: 'smc_master',
    strategyName: 'Smart Money Concepts (SMC) Master Strategy',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Market Structure', 'Order Blocks', 'FVGs', 'Liquidity Sweeps', 'BOS & CHoCH'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Master Overlay',
  },
  smc_bos: {
    strategyId: 'smc_bos',
    strategyName: 'Break of Structure (BOS) Continuation',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Break of Structure (BOS)', 'Swing Pivots (HH/HL or LH/LL)'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_bos',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Break of Structure',
  },
  smc_choch: {
    strategyId: 'smc_choch',
    strategyName: 'Change of Character (CHoCH) Reversal',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Change of Character (CHoCH)', 'Major Swing Reversal Level'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_choch',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Change of Character',
  },
  smc_liquidity_sweep: {
    strategyId: 'smc_liquidity_sweep',
    strategyName: 'Liquidity Pool Sweep (BSL / SSL)',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Buy-Side & Sell-Side Liquidity Sweeps', 'Wick Invalidation'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_liquidity_sweep',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Liquidity Sweeps',
  },
  smc_eqh_eql: {
    strategyId: 'smc_eqh_eql',
    strategyName: 'Equal Highs / Equal Lows (EQH/EQL)',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Equal Highs (EQH) & Lows (EQL) Pools'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_eqh_eql',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Equal Highs/Lows',
  },
  smc_fvg: {
    strategyId: 'smc_fvg',
    strategyName: 'Fair Value Gap (FVG) Imbalance',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Fair Value Gaps (FVG)', '50% Consequent Encroachment (CE)'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_fvg',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Fair Value Gaps',
  },
  smc_order_block: {
    strategyId: 'smc_order_block',
    strategyName: 'Institutional Order Block (OB)',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Demand & Supply Order Blocks', 'Mitigation Tracking'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_order_block',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Order Blocks',
  },
  smc_breaker_block: {
    strategyId: 'smc_breaker_block',
    strategyName: 'Breaker Block Mitigation',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Bullish & Bearish Breaker Blocks', 'Failed Order Blocks'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_breaker_block',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Breaker Blocks',
  },
  smc_premium_discount: {
    strategyId: 'smc_premium_discount',
    strategyName: 'Premium vs Discount Dealing Range',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC 50% Equilibrium Line', 'Premium & Discount Color Zones'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_premium_discount',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Premium/Discount',
  },
  smc_mtf_confluence: {
    strategyId: 'smc_mtf_confluence',
    strategyName: 'Multi-Timeframe SMC Confluence',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Multi-Timeframe Structure', 'Higher Timeframe Bias'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_mtf_confluence',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Multi-TF Confluence',
  },
  smc_session_liquidity: {
    strategyId: 'smc_session_liquidity',
    strategyName: 'Session Liquidity (Asian/London/NY)',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Session High/Low Projections', 'Asian Range Invalidation'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_session_liquidity',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '15m',
    badgeLabel: 'SMC Session Liquidity',
  },
  smc_3stage_reversal: {
    strategyId: 'smc_3stage_reversal',
    strategyName: '3-Stage Invalidation Reversal',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Liquidity Sweep', 'Market Structure Shift (MSS)', 'FVG Retest Entry'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_3stage_reversal',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC 3-Stage Reversal',
  },
  smc_bos_fvg_retest: {
    strategyId: 'smc_bos_fvg_retest',
    strategyName: 'BOS + FVG Retest Continuation',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Break of Structure', 'Fair Value Gap Retest'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_bos_fvg_retest',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC BOS + FVG Retest',
  },
  smc_ob_fvg_confluence: {
    strategyId: 'smc_ob_fvg_confluence',
    strategyName: 'Order Block + FVG Dual Confluence',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Order Block + FVG Overlap Zone'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_ob_fvg_confluence',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC OB + FVG Confluence',
  },
  smc_inducement_sweep: {
    strategyId: 'smc_inducement_sweep',
    strategyName: 'Inducement (IDM) Sweep Reversal',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Minor Inducement Sweeps', 'True Order Block Confirmation'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_inducement_sweep',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Inducement Sweep',
  },
  smc_amd: {
    strategyId: 'smc_amd',
    strategyName: 'Accumulation, Manipulation, Distribution (AMD)',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Power of 3 (AMD)', 'Judas Swing Manipulation'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_amd',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC AMD / Power of 3',
  },
  smc_ifvg: {
    strategyId: 'smc_ifvg',
    strategyName: 'Inverse Fair Value Gap (IFVG)',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Inverse FVG (Support/Resistance Role Reversal)'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_ifvg',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC Inverse FVG',
  },
  smc_fibonacci: {
    strategyId: 'smc_fibonacci',
    strategyName: 'SMC + Fibonacci Confluence Strategy',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Structure Overlay', 'Fibonacci OTE (0.618 - 0.786 Golden Pocket)'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_fibonacci',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC + Fibonacci OTE (0.618)',
  },
  smc_volume_profile: {
    strategyId: 'smc_volume_profile',
    strategyName: 'SMC + Volume Profile (VPVR) Confluence Strategy',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Structure Overlay', 'Volume Profile VPVR (POC, VAH, VAL)'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_volume_profile',
    isVolumeProfile: true,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC + Volume Profile (POC/VAH)',
  },
  smc_pivot_points: {
    strategyId: 'smc_pivot_points',
    strategyName: 'SMC + Pivot Points Confluence Strategy',
    category: 'Smart Money Concepts',
    correspondingIndicators: ['SMC Structure Overlay', 'Camarilla & Floor Pivots (P, S1-S3, R1-R3)'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: true,
    smcSetupId: 'smc_pivot_points',
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'SMC + Camarilla Pivots',
  },

  // ── 5. Order Flow Footprint Strategies ──
  of_bullish_absorption: {
    strategyId: 'of_bullish_absorption',
    strategyName: 'Order Flow: Bullish Absorption at Liquidity Low',
    category: 'Order Flow Footprint',
    correspondingIndicators: ['Order Flow Footprint', 'Bid × Ask Volume Imbalance', 'Absorption Delta Matrix'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: true,
    isQuantumAi: false,
    timeframe: '15m',
    badgeLabel: 'Order Flow Absorption Low',
  },
  of_bearish_absorption: {
    strategyId: 'of_bearish_absorption',
    strategyName: 'Order Flow: Bearish Absorption at Liquidity High',
    category: 'Order Flow Footprint',
    correspondingIndicators: ['Order Flow Footprint', 'Bid × Ask Volume Imbalance', 'Absorption Delta Matrix'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: true,
    isQuantumAi: false,
    timeframe: '15m',
    badgeLabel: 'Order Flow Absorption High',
  },
  of_stacked_buy_imbalance: {
    strategyId: 'of_stacked_buy_imbalance',
    strategyName: 'Order Flow: Stacked Buy Imbalance Retest',
    category: 'Order Flow Footprint',
    correspondingIndicators: ['Order Flow Footprint', 'Stacked Buy Imbalances (3+ Diagonal Levels)'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: true,
    isQuantumAi: false,
    timeframe: '15m',
    badgeLabel: 'Order Flow Stacked Buy Imbalance',
  },
  of_stacked_sell_imbalance: {
    strategyId: 'of_stacked_sell_imbalance',
    strategyName: 'Order Flow: Stacked Sell Imbalance Retest',
    category: 'Order Flow Footprint',
    correspondingIndicators: ['Order Flow Footprint', 'Stacked Sell Imbalances (3+ Diagonal Levels)'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: true,
    isQuantumAi: false,
    timeframe: '15m',
    badgeLabel: 'Order Flow Stacked Sell Imbalance',
  },
  of_cvd_bull_div: {
    strategyId: 'of_cvd_bull_div',
    strategyName: 'Order Flow: CVD Bullish Divergence',
    category: 'Order Flow Footprint',
    correspondingIndicators: ['Order Flow Footprint', 'Cumulative Volume Delta (CVD) Bullish Divergence'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: true,
    isQuantumAi: false,
    timeframe: '15m',
    badgeLabel: 'Order Flow CVD Bullish Divergence',
  },
  of_cvd_bear_div: {
    strategyId: 'of_cvd_bear_div',
    strategyName: 'Order Flow: CVD Bearish Divergence',
    category: 'Order Flow Footprint',
    correspondingIndicators: ['Order Flow Footprint', 'Cumulative Volume Delta (CVD) Bearish Divergence'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: true,
    isQuantumAi: false,
    timeframe: '15m',
    badgeLabel: 'Order Flow CVD Bearish Divergence',
  },
  of_unfinished_business: {
    strategyId: 'of_unfinished_business',
    strategyName: 'Order Flow: Unfinished Business Re-auction',
    category: 'Order Flow Footprint',
    correspondingIndicators: ['Order Flow Footprint', 'Unfinished Business Auction Level'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: true,
    isQuantumAi: false,
    timeframe: '15m',
    badgeLabel: 'Order Flow Unfinished Business',
  },
};

/**
 * Returns the indicator setup for a strategy ID, falling back to clean defaults if unknown.
 */
export function getStrategyIndicatorSetup(strategyId: string): StrategyIndicatorSetup {
  if (STRATEGY_INDICATOR_MAP[strategyId]) {
    return STRATEGY_INDICATOR_MAP[strategyId];
  }

  // Handle prefix patterns (e.g. smc_*, of_*)
  if (strategyId.startsWith('smc_')) {
    return {
      strategyId,
      strategyName: strategyId.replace(/_/g, ' ').toUpperCase(),
      category: 'Smart Money Concepts',
      correspondingIndicators: ['Smart Money Concepts (SMC) Overlay'],
      indicatorKeys: [],
      indicatorConfigs: [],
      isSmc: true,
      smcSetupId: strategyId,
      isVolumeProfile: strategyId.includes('volume_profile'),
      isOrderFlow: false,
      isQuantumAi: false,
      timeframe: '1D',
      badgeLabel: 'SMC Overlay',
    };
  }

  if (strategyId.startsWith('of_')) {
    return {
      strategyId,
      strategyName: strategyId.replace(/_/g, ' ').toUpperCase(),
      category: 'Order Flow Footprint',
      correspondingIndicators: ['Order Flow Footprint Engine', 'Volume Delta'],
      indicatorKeys: [],
      indicatorConfigs: [],
      isSmc: false,
      isVolumeProfile: false,
      isOrderFlow: true,
      isQuantumAi: false,
      timeframe: '15m',
      badgeLabel: 'Order Flow Footprint',
    };
  }

  // Default fallback
  return {
    strategyId,
    strategyName: strategyId.replace(/_/g, ' '),
    category: 'Technical Strategy',
    correspondingIndicators: ['Volume'],
    indicatorKeys: [],
    indicatorConfigs: [],
    isSmc: false,
    isVolumeProfile: false,
    isOrderFlow: false,
    isQuantumAi: false,
    timeframe: '1D',
    badgeLabel: 'Standard Chart',
  };
}

/**
 * Builds a comprehensive URL targeting the chart route with all corresponding indicators,
 * overlays (SMC, Volume Profile, Order Flow, Quantum AI), and timeframe configured.
 */
export function buildChartUrlForStrategy(
  symbol: string,
  market: string = 'NSE',
  strategyId: string,
  extraParams?: Record<string, string | number>
): string {
  const setup = getStrategyIndicatorSetup(strategyId);
  const params = new URLSearchParams();

  params.set('market', market);
  params.set('strategies', setup.strategyId);

  if (setup.indicatorKeys.length > 0) {
    params.set('indicators', setup.indicatorKeys.join(','));
  }

  if (setup.isSmc) {
    params.set('smc', '1');
    if (setup.smcSetupId) {
      params.set('setupId', setup.smcSetupId);
    }
  } else {
    params.set('smc', '0');
  }

  if (setup.isVolumeProfile) {
    params.set('vp', '1');
  }

  if (setup.isOrderFlow) {
    params.set('of', '1');
  }

  if (setup.isQuantumAi) {
    params.set('module', 'quantum-ai');
  }

  params.set('tf', setup.timeframe);
  params.set('from', 'screener');

  if (extraParams) {
    Object.entries(extraParams).forEach(([key, val]) => {
      params.set(key, String(val));
    });
  }

  return `/chart/${encodeURIComponent(symbol)}?${params.toString()}`;
}
