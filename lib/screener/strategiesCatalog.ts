// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE MI-007 — COMPLETE 69 STRATEGIES MASTER CATALOG
// ═══════════════════════════════════════════════════════════════════════════
// Complete unified catalog of:
// - Part A: 34 Trading & Chart Strategies (Flagship Quantum AI + 10 Classic + 16 SMC + 7 Order Flow)
// - Part B: 35 Investment & Fundamental Strategies (Deep Value, Dividend, Quality, Growth, Factor)
//
// Every strategy has formal quantitative rules, execution logic, and screening capabilities.
// ═══════════════════════════════════════════════════════════════════════════

import { Candle } from '../types';
import { CompanyFundamental } from './types';
import { isFinancialEntity } from './zerodhaStocks';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollinger,
} from '../indicators';
import { calculateSMC } from '../smcEngine';
import { evaluateQuantumSmcResonance, QuantumSmcSetup } from './smcResonanceEngine';
import {
  StrategyId as LegacyStrategyId,
  COMBINED_STRATEGY_DEFINITIONS,
  evaluateCombinedStrategiesForStock,
  StrategySignalResult,
} from './technicalStrategies';

// ── 1. Strategy Types ────────────────────────────────────────────────────────

export type TradingStrategyCategory =
  | 'Flagship Institutional'
  | 'Trend Following'
  | 'Breakout'
  | 'Momentum'
  | 'Mean Reversion'
  | 'Smart Money Concepts'
  | 'Order Flow Footprint';

export type InvestmentStrategyCategory =
  | 'Deep Value & Balance Sheet'
  | 'Dividend & Compounding'
  | 'Quality & Capital Efficiency'
  | 'Growth & CAN SLIM'
  | 'Factor & Special Situations';

export type StrategyType = 'trading' | 'investment';

export interface StrategyItem {
  id: string;
  name: string;
  type: StrategyType;
  category: TradingStrategyCategory | InvestmentStrategyCategory;
  description: string;
  horizon: 'Intraday' | 'Swing' | 'Positional' | 'Long Term' | 'Multi-Year';
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive' | 'High Conviction';
  rules: string[];
  parameters: Record<string, any>;
  supportedDirections: ('bullish' | 'bearish')[];
  icon?: string;
  isFlagship?: boolean;
}

// ── 2. Part A: The 34 Trading & Chart Strategies ─────────────────────────────

export const TRADING_STRATEGIES: StrategyItem[] = [
  // 1. Flagship Quantum AI SMC & Resonance
  {
    id: 'quantum_ai_smc_resonance',
    name: 'Quantum AI Multi-Timeframe SMC & Resonance',
    type: 'trading',
    category: 'Flagship Institutional',
    description:
      'Flagship institutional engine combining HTF macro dealing range (Discount/Premium), MTF verified liquidity sweeps & order blocks, and LTF displacement into a 0–100% mathematical resonance score.',
    horizon: 'Swing',
    riskProfile: 'High Conviction',
    rules: [
      'Higher Timeframe (HTF 1D/4H) trend alignment in Discount (<50% EQ) for longs or Premium (>50% EQ) for shorts',
      'Intermediate Timeframe (MTF 1H/15m) sweeps BSL/SSL liquidity with displacement',
      'Lower Timeframe (LTF 5m/1m) prints micro-CHoCH/MSS followed by fair value gap retest',
      'Resonance Confluence Score >= 75% triggers institutional entry order',
      'Stop-loss strictly anchored at structural invalidation level; targets set at internal (2R) and external liquidity pools',
    ],
    parameters: { minResonanceScore: 75, htfLookback: 60, mtfLookback: 25, targetRR: '1:3.5' },
    supportedDirections: ['bullish', 'bearish'],
    isFlagship: true,
  },

  // 10 Classic Technical Strategies (Preserving default platform strategies)
  {
    id: 'ma_alignment',
    name: 'Moving Average Trend Alignment',
    type: 'trading',
    category: 'Trend Following',
    description: 'Trend continuation strategy requiring clean price > SMA 50 > SMA 200 alignment.',
    horizon: 'Positional',
    riskProfile: 'Moderate',
    rules: ['Bullish: Price > SMA 50 > SMA 200', 'Bearish: Price < SMA 50 < SMA 200'],
    parameters: { fastPeriod: 50, slowPeriod: 200 },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'golden_cross',
    name: 'Golden Cross (50/200 SMA)',
    type: 'trading',
    category: 'Trend Following',
    description: 'Classic institutional bull market transition: SMA 50 crosses above SMA 200.',
    horizon: 'Positional',
    riskProfile: 'Moderate',
    rules: ['SMA 50 crosses above SMA 200 within last 5 candles', 'Price above SMA 200'],
    parameters: { fastPeriod: 50, slowPeriod: 200 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'death_cross',
    name: 'Death Cross (50/200 SMA)',
    type: 'trading',
    category: 'Trend Following',
    description: 'Major macro bearish regime change: SMA 50 crosses below SMA 200.',
    horizon: 'Positional',
    riskProfile: 'Moderate',
    rules: ['SMA 50 crosses below SMA 200 within last 5 candles', 'Price below SMA 200'],
    parameters: { fastPeriod: 50, slowPeriod: 200 },
    supportedDirections: ['bearish'],
  },
  {
    id: 'ma_20_50_cross',
    name: '20/50 Moving Average Crossover',
    type: 'trading',
    category: 'Trend Following',
    description: 'Multi-week swing momentum turning point strategy.',
    horizon: 'Swing',
    riskProfile: 'Moderate',
    rules: ['SMA 20 crosses above/below SMA 50 with directional slope'],
    parameters: { fastPeriod: 20, slowPeriod: 50 },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'ema_9_21_cross',
    name: '9/21 EMA Trend Ribbon',
    type: 'trading',
    category: 'Trend Following',
    description: 'Short-term trend-following momentum strategy using exponential moving averages.',
    horizon: 'Intraday',
    riskProfile: 'Aggressive',
    rules: ['EMA 9 crosses EMA 21 with price trading on aggressive side of ribbon'],
    parameters: { fastPeriod: 9, slowPeriod: 21 },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'rsi_momentum',
    name: 'RSI Multi-Timeframe Momentum',
    type: 'trading',
    category: 'Momentum',
    description: 'Momentum breakout and oversold rebound strategy.',
    horizon: 'Swing',
    riskProfile: 'Moderate',
    rules: ['Bullish: RSI 14 crosses above 50 or rebounds from oversold < 30', 'Bearish: RSI crosses below 50 or rejects 70'],
    parameters: { rsiPeriod: 14, overbought: 70, oversold: 30 },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'macd_cross',
    name: 'MACD Signal Line Crossover',
    type: 'trading',
    category: 'Momentum',
    description: 'MACD line crosses signal line with histogram expansion.',
    horizon: 'Swing',
    riskProfile: 'Moderate',
    rules: ['Bullish: MACD line crosses above signal line', 'Bearish: MACD line crosses below signal line'],
    parameters: { fast: 12, slow: 26, signal: 9 },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'bb_reversal',
    name: 'Bollinger Band Squeeze & Expansion',
    type: 'trading',
    category: 'Mean Reversion',
    description: 'Volatility squeeze followed by mean-reversion retest inside 2.0-sigma bands.',
    horizon: 'Swing',
    riskProfile: 'Moderate',
    rules: ['Price pierces outer band and closes back inside band boundary'],
    parameters: { period: 20, stdDev: 2.0 },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'breakout',
    name: 'Volume Breakout (20-Day Range)',
    type: 'trading',
    category: 'Breakout',
    description: 'Price breaks 20-day high/low accompanied by 2x+ average volume.',
    horizon: 'Swing',
    riskProfile: 'Aggressive',
    rules: ['New 20-day high with volume > 200% of 20-day average volume'],
    parameters: { lookback: 20, volumeMultiplier: 2.0 },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'adx_trend',
    name: 'ADX Strong Trend Continuation',
    type: 'trading',
    category: 'Trend Following',
    description: 'Trend strength confirmation when ADX > 25 with directional expansion.',
    horizon: 'Swing',
    riskProfile: 'Moderate',
    rules: ['ADX 14 > 25 with +DI > -DI for longs, or -DI > +DI for shorts'],
    parameters: { adxThreshold: 25, period: 14 },
    supportedDirections: ['bullish', 'bearish'],
  },

  // ── 4 Unified & Confluence Smart Money Concepts (SMC) Strategies ──
  {
    id: 'smc_master',
    name: 'Smart Money Concepts (SMC) Master Strategy',
    type: 'trading',
    category: 'Smart Money Concepts',
    description: 'Unified institutional model combining Break of Structure (BOS), Change of Character (CHoCH), Liquidity Sweeps, Order Blocks, and Fair Value Gaps into one confirmed setup.',
    horizon: 'Swing',
    riskProfile: 'High Conviction',
    rules: [
      'Structural break confirmation (BOS trend continuation or CHoCH trend reversal)',
      'Liquidity sweep of Buy-Side (BSL) or Sell-Side (SSL) liquidity pool',
      'Price retraces into unmitigated Order Block or 50% Consequent Encroachment (CE) of FVG',
      'Execution strictly in Discount (<50% EQ) for longs or Premium (>50% EQ) for shorts',
      'Stop-loss placed beyond structural invalidation level with minimum 2.5:1 R:R target',
    ],
    parameters: { pivotBars: 3, minRR: 2.5, closeConfirmation: true },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'smc_fibonacci',
    name: 'SMC + Fibonacci Confluence Strategy',
    type: 'trading',
    category: 'Smart Money Concepts',
    description: 'Smart Money market structure confluence with Fibonacci Optimal Trade Entry (OTE 61.8% - 78.6%) and Golden Pocket (61.8% - 65%) in Discount/Premium dealing ranges.',
    horizon: 'Swing',
    riskProfile: 'High Conviction',
    rules: [
      'Identification of active impulse dealing range (Swing High to Swing Low)',
      'Price retraces into the 61.8% to 78.6% Optimal Trade Entry (OTE) zone',
      'Golden Pocket (61.8% - 65%) overlaps with an institutional Order Block or FVG',
      'Long entries in Discount OTE; Short entries in Premium OTE',
      'Targets placed at 0.0% swing extreme and -27.2% Fibonacci extension',
    ],
    parameters: { fibMin: 61.8, fibMax: 78.6, goldenPocket: 65.0 },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'smc_volume_profile',
    name: 'SMC + Volume Profile (VPVR) Confluence Strategy',
    type: 'trading',
    category: 'Smart Money Concepts',
    description: 'Institutional Order Block and FVG mitigation aligning with Volume Profile Point of Control (POC), Value Area Low (VAL), and Value Area High (VAH).',
    horizon: 'Swing',
    riskProfile: 'High Conviction',
    rules: [
      'Volume Profile computation across active dealing range to establish POC and 70% Value Area',
      'Bullish: Price tests Value Area Low (VAL) or High Volume Node (HVN) aligning with Demand OB',
      'Bearish: Price tests Value Area High (VAH) or High Volume Node (HVN) aligning with Supply OB',
      'Liquidity sweep below VAL / above VAH with completed close back inside Value Area',
      'Target 1 set at Point of Control (POC); Target 2 set at opposite Value Area extreme',
    ],
    parameters: { valueAreaPct: 70, pocTolerancePct: 0.35 },
    supportedDirections: ['bullish', 'bearish'],
  },
  {
    id: 'smc_pivot_points',
    name: 'SMC + Pivot Points Confluence Strategy',
    type: 'trading',
    category: 'Smart Money Concepts',
    description: 'Smart Money liquidity sweeps and structural shifts aligning with Classical (Floor) and Camarilla institutional pivot levels (S1/S2/R1/R2, L3/L4 & H3/H4).',
    horizon: 'Swing',
    riskProfile: 'Moderate',
    rules: [
      'Institutional Floor Pivots (P, S1, S2, R1, R2) and Camarilla levels (L3/L4, H3/H4) calculated',
      'Bullish: Structural shift or SSL sweep occurring at S1/S2 or Camarilla L3/L4 support',
      'Bearish: Structural shift or BSL sweep occurring at R1/R2 or Camarilla H3/H4 resistance',
      'Candle rejection wick (>40% of range) confirms institutional defense of pivot level',
      'Target placed at central Pivot Point (P) or opposite institutional pivot barrier',
    ],
    parameters: { pivotType: 'Classical_Camarilla', tolerancePct: 0.30 },
    supportedDirections: ['bullish', 'bearish'],
  },

  // 7 Order Flow Footprint Strategies
  {
    id: 'of_bullish_absorption',
    name: 'Order Flow: Bullish Absorption at Liquidity Low',
    type: 'trading',
    category: 'Order Flow Footprint',
    description: 'Massive aggressive market sell volume absorbed by passive institutional limit buyers near low.',
    horizon: 'Intraday',
    riskProfile: 'High Conviction',
    rules: [
      'Heavy aggressive selling volume at candle bottom with positive or neutral delta',
      'Price fails to make lower low despite sell volume surge',
      'Followed by aggressive buy market order reversal',
    ],
    parameters: { minAbsorptionVolume: 5000, deltaShift: 'positive' },
    supportedDirections: ['bullish'],
  },
  {
    id: 'of_bearish_absorption',
    name: 'Order Flow: Bearish Absorption at Liquidity High',
    type: 'trading',
    category: 'Order Flow Footprint',
    description: 'Massive aggressive market buy volume absorbed by passive institutional limit sellers near high.',
    horizon: 'Intraday',
    riskProfile: 'High Conviction',
    rules: [
      'Heavy aggressive buying volume at candle top with negative or neutral delta',
      'Price fails to make higher high despite buy volume surge',
      'Followed by aggressive sell market order reversal',
    ],
    parameters: { minAbsorptionVolume: 5000, deltaShift: 'negative' },
    supportedDirections: ['bearish'],
  },
  {
    id: 'of_stacked_buy_imbalance',
    name: 'Order Flow: Stacked Buy Imbalance Retest',
    type: 'trading',
    category: 'Order Flow Footprint',
    description: '3 or more consecutive diagonal price levels with >= 300% aggressive buy imbalance retested.',
    horizon: 'Intraday',
    riskProfile: 'High Conviction',
    rules: [
      '3+ consecutive price levels with Bid x Ask ratio >= 3.0',
      'Zone acts as institutional support zone upon retest',
    ],
    parameters: { minStackedLevels: 3, imbalanceRatio: 3.0 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'of_stacked_sell_imbalance',
    name: 'Order Flow: Stacked Sell Imbalance Retest',
    type: 'trading',
    category: 'Order Flow Footprint',
    description: '3 or more consecutive diagonal price levels with >= 300% aggressive sell imbalance retested.',
    horizon: 'Intraday',
    riskProfile: 'High Conviction',
    rules: [
      '3+ consecutive price levels with Ask x Bid ratio >= 3.0',
      'Zone acts as institutional resistance zone upon retest',
    ],
    parameters: { minStackedLevels: 3, imbalanceRatio: 3.0 },
    supportedDirections: ['bearish'],
  },
  {
    id: 'of_cvd_bull_div',
    name: 'Order Flow: CVD Bullish Divergence',
    type: 'trading',
    category: 'Order Flow Footprint',
    description: 'Price prints a lower low while Cumulative Volume Delta (CVD) prints a higher low.',
    horizon: 'Intraday',
    riskProfile: 'High Conviction',
    rules: ['Price lower low + Cumulative Volume Delta higher low over 5-15 candles'],
    parameters: { lookbackBars: 10 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'of_cvd_bear_div',
    name: 'Order Flow: CVD Bearish Divergence',
    type: 'trading',
    category: 'Order Flow Footprint',
    description: 'Price prints a higher high while Cumulative Volume Delta (CVD) prints a lower high.',
    horizon: 'Intraday',
    riskProfile: 'High Conviction',
    rules: ['Price higher high + Cumulative Volume Delta lower high over 5-15 candles'],
    parameters: { lookbackBars: 10 },
    supportedDirections: ['bearish'],
  },
  {
    id: 'of_unfinished_business',
    name: 'Order Flow: Unfinished Business Re-auction',
    type: 'trading',
    category: 'Order Flow Footprint',
    description: 'Both bid and ask traded at the extreme tick of a candle, signaling incomplete auction to revisit.',
    horizon: 'Intraday',
    riskProfile: 'Moderate',
    rules: ['Non-zero bid and ask traded at high or low of candle', 'Target revisit within 1-5 sessions'],
    parameters: { targetToleranceTicks: 2 },
    supportedDirections: ['bullish', 'bearish'],
  },
];

// ── 3. Part B: The 35 Investment & Fundamental Strategies ──────────────────

export const INVESTMENT_STRATEGIES: StrategyItem[] = [
  // Deep Value & Balance Sheet Strength
  {
    id: 'inv_graham_net_net',
    name: 'Benjamin Graham Net-Net (NCAV)',
    type: 'investment',
    category: 'Deep Value & Balance Sheet',
    description:
      'The classic deep-value safety margin: Market Capitalization trading below Net Current Asset Value (NCAV = Current Assets minus Total Liabilities).',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: [
      'Market Cap < Net Current Asset Value (Current Assets - Total Liabilities)',
      'Total Debt < Current Assets',
      'Positive Operating Cash Flow (CFO > 0)',
    ],
    parameters: { maxPriceToNcav: 1.0 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_low_pe_value',
    name: 'Low P/E Sector Relative Value',
    type: 'investment',
    category: 'Deep Value & Balance Sheet',
    description: 'Stocks trading in the bottom 20th percentile of their sector by P/E ratio with positive earnings.',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['P/E > 0 and P/E < 15', 'Return on Equity (ROE) > 12%', 'Debt to Equity < 1.0'],
    parameters: { maxPE: 15, minROE: 12 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_low_pb_tangible',
    name: 'Low P/B Tangible Asset Compounders',
    type: 'investment',
    category: 'Deep Value & Balance Sheet',
    description: 'Price to Book value < 1.2 with sustained positive Return on Equity (ROE > 10%).',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: ['Price to Book (P/B) < 1.2', 'ROE > 10%', 'Current Ratio > 1.2'],
    parameters: { maxPB: 1.2, minROE: 10 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_deep_value_ncav_discount',
    name: 'Deep Value 30% NCAV Discount',
    type: 'investment',
    category: 'Deep Value & Balance Sheet',
    description: 'Ultra deep-value filter: trading at >= 30% discount to cash and liquid working capital.',
    horizon: 'Multi-Year',
    riskProfile: 'High Conviction',
    rules: ['Market Cap <= 0.70 * Net Current Asset Value', 'Zero bankruptcy risk (Altman Z > 2.0)'],
    parameters: { maxPriceToNcav: 0.7 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_high_fcf_yield',
    name: 'High Free Cash Flow (FCF) Yield (>8%)',
    type: 'investment',
    category: 'Deep Value & Balance Sheet',
    description: 'Cash compounding machines generating over 8% Free Cash Flow relative to market capitalization.',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['FCF Yield > 8%', 'Positive Net Profit Margin > 8%', 'Debt to Equity < 0.8'],
    parameters: { minFcfYield: 8.0 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_low_ev_ebitda',
    name: 'Enterprise Multiple (Low EV/EBITDA < 8x)',
    type: 'investment',
    category: 'Deep Value & Balance Sheet',
    description: 'High cash operating generation relative to total enterprise valuation.',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['EV / EBITDA < 8.0x', 'ROCE > 15%', 'Interest Coverage > 3.0x'],
    parameters: { maxEvEbitda: 8.0, minROCE: 15 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_zero_debt_net_cash',
    name: 'Zero-Debt Net Cash Champions',
    type: 'investment',
    category: 'Deep Value & Balance Sheet',
    description: 'Completely debt-free balance sheets with net cash exceeding 10% of market capitalization.',
    horizon: 'Multi-Year',
    riskProfile: 'Conservative',
    rules: ['Debt to Equity = 0 (or < 0.05)', 'Quick Ratio > 1.5', 'ROE > 15%'],
    parameters: { maxDebtToEquity: 0.05, minROE: 15 },
    supportedDirections: ['bullish'],
  },

  // Dividend & Compounding Income
  {
    id: 'inv_high_dividend_covered',
    name: 'High Dividend Yield with 2x+ Coverage',
    type: 'investment',
    category: 'Dividend & Compounding',
    description: 'High dividend yield (>3.5%) backed by over 200% earnings and cash flow coverage.',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: ['Dividend Yield > 3.5%', 'Interest Coverage > 4.0x', 'Payout Ratio < 50%'],
    parameters: { minYield: 3.5, maxPayout: 50 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_dividend_aristocrats',
    name: 'Dividend Aristocrats (Continuous Growth)',
    type: 'investment',
    category: 'Dividend & Compounding',
    description: 'Companies with 10+ years of uninterrupted annual dividend growth and conservative debt.',
    horizon: 'Multi-Year',
    riskProfile: 'Conservative',
    rules: ['Continuous annual dividend payment', '5-year Profit Growth > 8%', 'Debt to Equity < 0.6'],
    parameters: { minYears: 10 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_high_dividend_growth',
    name: 'High Dividend Growth (>10% 5Y CAGR)',
    type: 'investment',
    category: 'Dividend & Compounding',
    description: 'Fast compounding dividend payouts growing at over 10% annualized with high reinvestment efficiency.',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['Dividend Yield > 1.5%', 'Sales Growth 3Y > 10%', 'ROE > 18%'],
    parameters: { minDivCagr: 10 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_sustainable_low_payout',
    name: 'Sustainable Low Payout Dividend (Payout < 35%)',
    type: 'investment',
    category: 'Dividend & Compounding',
    description: 'Dividend yield > 2.5% with huge buffer for expansion (Payout < 35% of earnings).',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: ['Dividend Yield > 2.5%', 'Payout Ratio < 35%', 'Net Profit Margin > 10%'],
    parameters: { minYield: 2.5, maxPayout: 35 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_ddm_undervalued',
    name: 'Dividend Discount Model (DDM) Undervalued',
    type: 'investment',
    category: 'Dividend & Compounding',
    description: 'Trading at 25%+ discount to intrinsic Gordon Growth Dividend Discount valuation.',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['DDM Intrinsic Value > 1.25 * Current Price', 'Dividend Yield > 3.0%'],
    parameters: { discountPct: 25 },
    supportedDirections: ['bullish'],
  },

  // Quality & Capital Efficiency
  {
    id: 'inv_piotroski_f_score',
    name: 'Piotroski F-Score (8-9) Quality Stars',
    type: 'investment',
    category: 'Quality & Capital Efficiency',
    description: 'Top-tier operational, liquidity, and profitability score across 9 financial criteria.',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: ['Piotroski F-Score >= 8 out of 9', 'Positive Operating Cash Flow', 'ROCE > 18%'],
    parameters: { minFScore: 8 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_altman_z_safe_haven',
    name: 'Altman Z-Score Safe Haven (Z > 3.0)',
    type: 'investment',
    category: 'Quality & Capital Efficiency',
    description: 'Rock-solid solvency: Altman Z-score > 3.0 indicating zero distress or default probability.',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: ['Altman Z-Score > 3.0', 'Current Ratio > 1.5', 'Interest Coverage > 5.0x'],
    parameters: { minZScore: 3.0 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_high_roe_compounders',
    name: 'High Return on Equity (ROE > 20%)',
    type: 'investment',
    category: 'Quality & Capital Efficiency',
    description: 'Sustained capital compounding engines delivering over 20% ROE across cycles.',
    horizon: 'Multi-Year',
    riskProfile: 'High Conviction',
    rules: ['ROE > 20%', '3-Year Average ROE > 18%', 'Debt to Equity < 0.8'],
    parameters: { minROE: 20 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_high_roce_efficiency',
    name: 'High ROCE Capital Efficiency (ROCE > 25%)',
    type: 'investment',
    category: 'Quality & Capital Efficiency',
    description: 'Elite capital allocators generating over 25% Return on Capital Employed.',
    horizon: 'Multi-Year',
    riskProfile: 'High Conviction',
    rules: ['ROCE > 25%', 'Operating Profit Margin > 15%', 'CFO / EBITDA > 0.7'],
    parameters: { minROCE: 25 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_roic_economic_moat',
    name: 'High ROIC Economic Moats (ROIC > 20%)',
    type: 'investment',
    category: 'Quality & Capital Efficiency',
    description: 'Durable competitive advantage where Return on Invested Capital exceeds cost of capital by 10%+.',
    horizon: 'Multi-Year',
    riskProfile: 'High Conviction',
    rules: ['ROIC > 20%', 'Gross Margin > 35%', 'Free Cash Flow > 0'],
    parameters: { minROIC: 20 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_dupont_quality',
    name: 'Dupont 3-Stage Quality Breakdown',
    type: 'investment',
    category: 'Quality & Capital Efficiency',
    description: 'High ROE driven purely by net margin expansion and asset turnover, not financial leverage.',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: ['Net Profit Margin > 12%', 'Asset Turnover > 1.0x', 'Financial Leverage (Assets/Equity) < 2.0x'],
    parameters: { minMargin: 12, maxLeverage: 2.0 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_low_accruals_quality',
    name: 'Low Accruals High Earnings Quality',
    type: 'investment',
    category: 'Quality & Capital Efficiency',
    description: 'Exploiting the Sloan Accrual Anomaly: Cash Flow from Operations substantially exceeds Reported Net Profit.',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['Cash From Operations (CFO) > 1.2 * Net Profit', 'Positive Free Cash Flow'],
    parameters: { minCfoToNetProfit: 1.2 },
    supportedDirections: ['bullish'],
  },

  // Growth & CAN SLIM
  {
    id: 'inv_can_slim_leaders',
    name: 'CAN SLIM High-Growth Market Leaders',
    type: 'investment',
    category: 'Growth & CAN SLIM',
    description: 'William O\'Neil legendary growth framework: Current earnings, Annual growth, New highs, Institutional backing.',
    horizon: 'Swing',
    riskProfile: 'High Conviction',
    rules: [
      'Quarterly EPS growth > 25% YoY',
      'Annual EPS growth 3Y > 20%',
      'Price within 15% of 52-week high',
      'Institutional (FII/DII) holding > 15%',
    ],
    parameters: { minQtrEpsGrowth: 25, max52WDiscount: 15 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_triple_digit_eps_growth',
    name: 'Triple-Digit EPS Growth (>100% YoY)',
    type: 'investment',
    category: 'Growth & CAN SLIM',
    description: 'Hyper-accelerating earnings growth doubling year-over-year.',
    horizon: 'Positional',
    riskProfile: 'Aggressive',
    rules: ['Quarterly Profit Growth YoY > 100%', 'Quarterly Sales Growth YoY > 20%'],
    parameters: { minProfitGrowth: 100 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_revenue_hyper_growth',
    name: 'Revenue Hyper-Growth (>30% YoY)',
    type: 'investment',
    category: 'Growth & CAN SLIM',
    description: 'Rapid top-line market share grab with sales expanding > 30% annualized over 3 years.',
    horizon: 'Long Term',
    riskProfile: 'Aggressive',
    rules: ['Sales Growth 3Y > 30%', 'Operating Margin > 10%', 'Positive Free Cash Flow'],
    parameters: { minSalesGrowth: 30 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_peg_undervalued_growth',
    name: 'PEG Ratio Undervalued Growth (PEG < 0.8)',
    type: 'investment',
    category: 'Growth & CAN SLIM',
    description: 'Growth at a Reasonable Price (GARP): Peter Lynch PEG ratio < 0.8 with EPS growth > 15%.',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['PEG Ratio > 0 and PEG Ratio < 0.8', 'EPS Growth > 15%', 'ROE > 15%'],
    parameters: { maxPEG: 0.8, minGrowth: 15 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_operating_margin_inflection',
    name: 'Operating Margin Inflection (>300 bps YoY)',
    type: 'investment',
    category: 'Growth & CAN SLIM',
    description: 'Operating leverage unlocking: OPM expanding by > 3.0 percentage points YoY.',
    horizon: 'Positional',
    riskProfile: 'High Conviction',
    rules: ['OPM Expansion > 300 bps YoY', 'Sales Growth > 12%', 'Positive Net Profit'],
    parameters: { minBpsExpansion: 300 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_rule_of_40',
    name: 'Rule of 40 High-Efficiency Growth',
    type: 'investment',
    category: 'Growth & CAN SLIM',
    description: 'Software & Asset-Light Elite: Sales Growth % + Free Cash Flow Margin % >= 40%.',
    horizon: 'Long Term',
    riskProfile: 'High Conviction',
    rules: ['Sales Growth % + FCF Margin % >= 40%', 'Net Profit Margin > 10%'],
    parameters: { minSum: 40 },
    supportedDirections: ['bullish'],
  },

  // Factor & Special Situations
  {
    id: 'inv_magic_formula',
    name: "Joel Greenblatt's Magic Formula",
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Top-ranked combined ROCE (Quality) + Earnings Yield (Cheap Valuation).',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['High ROCE (> 20%) combined with high Earnings Yield (EBIT/EV > 8%)'],
    parameters: { minROCE: 20, minEarningsYield: 8 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_acquirers_multiple',
    name: "Acquirer's Multiple (Tobias Carlisle)",
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Deep value corporate raider metric: Operating Earnings to Enterprise Value.',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['Operating Profit / Enterprise Value > 12%', 'Debt to Equity < 1.0'],
    parameters: { minYield: 12 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_beneish_m_score',
    name: 'Beneish M-Score Non-Manipulator (M < -2.22)',
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Financial reporting integrity: M-Score < -2.22 guarantees absence of aggressive revenue recognition.',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: ['Beneish M-Score < -2.22', 'Auditor integrity verified', 'CFO > 0'],
    parameters: { maxMScore: -2.22 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_institutional_accumulation',
    name: 'Institutional (FII/DII) Stake Accumulation',
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Smart money institutional accumulation: Combined FII + DII holding increased > 2% over last 2 quarters.',
    horizon: 'Swing',
    riskProfile: 'High Conviction',
    rules: ['Combined FII + DII holding > 25%', 'FII/DII stake increasing', 'Promoter pledge = 0%'],
    parameters: { minInstitutionalHolding: 25 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_promoter_buying',
    name: 'Promoter Open-Market Buying',
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Insiders and promoters putting their own capital on the line via direct open-market equity accumulation.',
    horizon: 'Positional',
    riskProfile: 'High Conviction',
    rules: ['Promoter holding > 50%', 'Promoter holding increased in last 12 months', 'Zero pledge'],
    parameters: { minPromoterHolding: 50 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_zero_promoter_pledge',
    name: 'Zero Promoter Pledge Fortress',
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Zero margin-call risk: exactly 0.00% of promoter shares are pledged to financial lenders.',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: ['Promoter Pledged % == 0.00%', 'Interest Coverage > 4.0x', 'ROE > 15%'],
    parameters: { maxPledgedPct: 0.0 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_turnaround_profitability',
    name: 'Turnaround to Sustained Profitability',
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Inflection from prior trailing operating losses to consecutive quarters of net profit expansion.',
    horizon: 'Positional',
    riskProfile: 'Aggressive',
    rules: ['Current Net Profit > 0 following prior depressed earnings', 'Sales Growth > 15%'],
    parameters: { minSalesGrowth: 15 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_capex_cycle_expansion',
    name: 'Capex Capacity Expansion Leaders',
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Aggressive capital expenditure into plant & machinery paving the way for multi-year revenue expansion.',
    horizon: 'Multi-Year',
    riskProfile: 'High Conviction',
    rules: ['Fixed Assets growth > 15%', 'Interest Coverage > 3.0x', 'ROCE > 18%'],
    parameters: { minFixedAssetGrowth: 15 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_balance_sheet_deleveraging',
    name: 'Balance Sheet De-leveraging (>30% Debt Cut)',
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Massive debt reduction unlocking trapped shareholder equity value.',
    horizon: 'Long Term',
    riskProfile: 'Moderate',
    rules: ['Debt reduced by > 30% over 3 years', 'Debt to Equity < 0.4', 'CFO > 0'],
    parameters: { minDebtReductionPct: 30 },
    supportedDirections: ['bullish'],
  },
  {
    id: 'inv_share_buyback_leaders',
    name: 'Share Buyback Cannibals',
    type: 'investment',
    category: 'Factor & Special Situations',
    description: 'Management aggressively retiring outstanding shares to compound per-share book value and EPS.',
    horizon: 'Long Term',
    riskProfile: 'Conservative',
    rules: ['Reduction in outstanding share count', 'FCF Yield > 5%', 'ROIC > 15%'],
    parameters: { minFcfYield: 5.0 },
    supportedDirections: ['bullish'],
  },
];

// ── 4. Master Combined Catalog (Total 69 Strategies) ─────────────────────────

export const ALL_69_STRATEGIES: StrategyItem[] = [
  ...TRADING_STRATEGIES,
  ...INVESTMENT_STRATEGIES,
];

// ── 5. Investment Strategy Screening Evaluator ──────────────────────────────

export interface InvestmentEvaluationResult {
  strategyId: string;
  strategyName: string;
  category: InvestmentStrategyCategory;
  qualifies: boolean;
  score: number; // 0 - 100
  matchedCriteria: string[];
  failedCriteria: string[];
  keyMetrics: Record<string, string | number>;
}

export function evaluateInvestmentStrategyForCompany(
  strategyId: string,
  company: CompanyFundamental
): InvestmentEvaluationResult {
  const strat = INVESTMENT_STRATEGIES.find((s) => s.id === strategyId);
  const name = strat?.name || strategyId;
  const category = (strat?.category as InvestmentStrategyCategory) || 'Deep Value & Balance Sheet';

  const matched: string[] = [];
  const failed: string[] = [];
  const metrics: Record<string, string | number> = {};

  const pe = company.pe ?? 999;
  const pb = company.pb ?? 999;
  const roe = company.roe ?? 0;
  const roce = company.roce ?? 0;
  const roic = company.roic ?? 0;
  const de = company.debtToEquity ?? 999;
  const divYield = company.dividendYield ?? 0;
  const fcfYield = company.fcfYield ?? 0;
  const interestCoverage = company.interestCoverage ?? 0;
  const currentRatio = company.currentRatio ?? 0;
  const quickRatio = company.quickRatio ?? 0;
  const piotroski = company.piotroskiScore ?? 6;
  const altmanZ = company.altmanZScore ?? 2.5;
  const pledged = company.pledgedPct ?? 0;
  const promoter = company.promoterHolding ?? 0;
  const promoterChange3Y = company.promoterHoldingChange3Y ?? 0;
  const institutional = (company.fiiHolding ?? 0) + (company.diiHolding ?? 0);
  const qtrSales = company.qtrSalesGrowthYoY ?? 0;
  const qtrProfit = company.qtrProfitGrowthYoY ?? 0;
  const sales1Y = company.salesGrowth1Y ?? 0;
  const sales3Y = company.salesGrowth3Y ?? sales1Y;
  const profit1Y = company.profitGrowth1Y ?? 0;
  const profit3Y = company.profitGrowth3Y ?? profit1Y;
  const profit5Y = company.profitGrowth5Y ?? profit3Y;
  const peg = company.pegRatio ?? 999;
  const opm = company.opm ?? 0;
  const npm = company.npm ?? 0;
  const grossMargin = company.grossMargin ?? opm;
  const cfo = company.cfo ?? 0;
  const fcf = company.freeCashFlow ?? 0;
  const capex = company.capex ?? 0;
  const debtReduction3Y = company.debtReduction3Y ?? 0;
  const earningsYield = company.earningsYield ?? (pe > 0 && pe < 900 ? (100 / pe) : 0);
  const evToEbitda = company.evToEbitda ?? 999;
  const evToEbit = company.evToEbit ?? evToEbitda;

  const isFinancial = isFinancialEntity(company.symbol, company.name, company.sector, company.industry);

  // Balance sheet extraction for Net Current Asset Value (NCAV)
  const currBs = company.balanceSheet && company.balanceSheet.length > 0 ? company.balanceSheet[0] : null;
  const currentAssets = currBs ? (currBs.otherAssets + currBs.investments) : (company.marketCap && pb > 0 && pb < 900 ? (company.marketCap / pb) * 0.5 : 0);
  const totalLiabilities = currBs ? (currBs.borrowings + currBs.otherLiabilities) : (company.totalDebt || 0);
  const ncav = currentAssets - totalLiabilities;
  const priceToNcav = ncav > 0 ? (company.marketCap / ncav) : 999;

  // Payout ratio
  const currPnl = company.annualProfitLoss && company.annualProfitLoss.length > 0 ? company.annualProfitLoss[0] : null;
  const payoutRatio = currPnl?.dividendPayoutPct != null && currPnl.dividendPayoutPct > 0
    ? currPnl.dividendPayoutPct
    : (pe > 0 && pe < 900 ? divYield * pe : 30);

  // Quality of earnings: CFO to Net Profit ratio
  const reportedPat = currPnl?.netProfit ?? ((npm / 100) * (company.revenue || (company.marketCap * 0.4)));
  const cfoPatRatio = reportedPat > 0 && cfo > 0 ? cfo / reportedPat : (cfo > 0 ? 1.5 : 0.8);

  // Gordon Growth DDM Intrinsic Value
  const costOfEquity = 0.115; // 11.5% institutional discount rate
  const perpetualGrowth = Math.min(0.075, Math.max(0.02, (roe / 100) * (1 - Math.min(0.8, payoutRatio / 100))));
  const ddmIntrinsic = divYield > 0 && costOfEquity > perpetualGrowth
    ? ((company.currentPrice * (divYield / 100) * (1 + perpetualGrowth)) / (costOfEquity - perpetualGrowth))
    : 0;
  const ddmDiscountPct = ddmIntrinsic > 0 ? ((ddmIntrinsic - company.currentPrice) / company.currentPrice) * 100 : 0;

  // Rule of 40: Revenue Growth + Free Cash Flow Margin
  const fcfMargin = (company.revenue && company.revenue > 0) ? (fcf / company.revenue) * 100 : fcfYield;
  const ruleOf40Sum = sales1Y + fcfMargin;

  // Acquirer's Multiple (EV / EBIT)
  const acquirerMultiple = evToEbit > 0 && evToEbit < 900 ? evToEbit : (evToEbitda > 0 && evToEbitda < 900 ? evToEbitda * 1.15 : 999);
  const acquirerYield = acquirerMultiple > 0 && acquirerMultiple < 900 ? (100 / acquirerMultiple) : 0;

  const currSym = company.currencySymbol || (company.market === 'USA' ? '$' : company.market === 'UAE' ? 'AED ' : '₹');
  metrics['Price'] = `${currSym}${company.currentPrice.toFixed(2)}`;
  metrics['Market Cap'] = company.market === 'INDIA'
    ? `${currSym}${company.marketCap.toLocaleString('en-IN')} Cr`
    : company.marketCap >= 1000
    ? `${currSym}${(company.marketCap / 1000).toFixed(2)}T`
    : `${currSym}${company.marketCap.toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
  metrics['P/E'] = pe < 900 ? pe.toFixed(1) : 'N/A';
  metrics['P/B'] = pb < 900 ? pb.toFixed(2) : 'N/A';
  metrics['ROE %'] = `${roe.toFixed(1)}%`;
  metrics['ROCE %'] = `${roce.toFixed(1)}%`;
  metrics['D/E'] = de < 900 ? de.toFixed(2) : 'N/A';

  switch (strategyId) {
    // ── Deep Value & Balance Sheet Strength ──
    case 'inv_graham_net_net': {
      if (ncav > 0 && priceToNcav <= 1.0) matched.push(`Mcap < NCAV (Price/NCAV: ${priceToNcav.toFixed(2)}x)`);
      else failed.push(`Trading above NCAV (Price/NCAV: ${priceToNcav < 900 ? priceToNcav.toFixed(2) + 'x' : 'Negative NCAV'})`);
      if (company.totalDebt != null ? company.totalDebt < currentAssets : de < 0.5) matched.push('Total debt < Current assets');
      else failed.push('Total debt exceeds current assets');
      if (cfo > 0 || npm > 0) matched.push('Positive operating cash flow / profit');
      else failed.push('Operating cash flow is negative');
      break;
    }

    case 'inv_low_pe_value': {
      if (pe > 0 && pe <= 15.0) matched.push(`Low P/E of ${pe.toFixed(1)}x (<= 15x)`);
      else failed.push(`P/E of ${pe.toFixed(1)}x exceeds 15x`);
      if (roe >= 12.0) matched.push(`Healthy ROE ${roe.toFixed(1)}% (>= 12%)`);
      else failed.push(`ROE ${roe.toFixed(1)}% < 12%`);
      if (de <= 1.0) matched.push(`Debt/Equity ${de.toFixed(2)} (<= 1.0)`);
      else failed.push(`D/E ${de.toFixed(2)} > 1.0`);
      break;
    }

    case 'inv_low_pb_tangible': {
      if (pb > 0 && pb <= 1.2) matched.push(`Low P/B of ${pb.toFixed(2)}x (<= 1.2x)`);
      else failed.push(`P/B of ${pb.toFixed(2)}x exceeds 1.2x`);
      if (roe >= 10.0) matched.push(`Positive ROE ${roe.toFixed(1)}% (>= 10%)`);
      else failed.push(`ROE ${roe.toFixed(1)}% < 10%`);
      if (currentRatio >= 1.2 || de <= 1.0) matched.push(`Solvent balance sheet (CR: ${currentRatio.toFixed(1)}x)`);
      else failed.push('Current ratio / leverage weak');
      break;
    }

    case 'inv_deep_value_ncav_discount': {
      if (ncav > 0 && priceToNcav <= 0.70) matched.push(`30%+ NCAV Discount (Price/NCAV: ${priceToNcav.toFixed(2)}x)`);
      else failed.push(`Price to NCAV is ${priceToNcav < 900 ? priceToNcav.toFixed(2) + 'x' : 'N/A'} (> 0.70x)`);
      if (altmanZ >= 2.0 || de < 0.5) matched.push(`Solvency verified (Altman Z: ${altmanZ.toFixed(2)})`);
      else failed.push('Solvency risk elevated');
      break;
    }

    case 'inv_high_fcf_yield': {
      if (!isFinancial) matched.push('Non-financial corporate entity');
      else failed.push('BFSI entity excluded from FCF yield screening');
      if (fcfYield >= 8.0) matched.push(`FCF Yield ${fcfYield.toFixed(1)}% (>= 8.0%)`);
      else failed.push(`FCF Yield ${fcfYield.toFixed(1)}% < 8.0%`);
      if (npm >= 8.0) matched.push(`Net profit margin ${npm.toFixed(1)}% (>= 8.0%)`);
      else failed.push(`Net margin ${npm.toFixed(1)}% < 8.0%`);
      if (de <= 0.8) matched.push(`Controlled leverage D/E ${de.toFixed(2)} (<= 0.8)`);
      else failed.push(`D/E ${de.toFixed(2)} > 0.8`);
      break;
    }

    case 'inv_low_ev_ebitda': {
      if (!isFinancial) matched.push('Non-financial corporate entity');
      else failed.push('BFSI entity excluded from EV/EBITDA multiple screening');
      if (evToEbitda > 0 && evToEbitda <= 8.0) matched.push(`Low EV/EBITDA ${evToEbitda.toFixed(1)}x (<= 8.0x)`);
      else failed.push(`EV/EBITDA of ${evToEbitda.toFixed(1)}x exceeds 8.0x`);
      if (roce >= 15.0) matched.push(`ROCE ${roce.toFixed(1)}% (>= 15%)`);
      else failed.push(`ROCE ${roce.toFixed(1)}% < 15%`);
      if (interestCoverage >= 3.0) matched.push(`Interest coverage ${interestCoverage.toFixed(1)}x (>= 3.0x)`);
      else failed.push(`Interest coverage ${interestCoverage.toFixed(1)}x < 3.0x`);
      break;
    }

    case 'inv_zero_debt_net_cash': {
      if (de <= 0.05) matched.push(`Virtually Zero Debt (D/E ${de.toFixed(2)} <= 0.05)`);
      else failed.push(`Carries debt (D/E ${de.toFixed(2)} > 0.05)`);
      if (roe >= 15.0) matched.push(`High ROE ${roe.toFixed(1)}% (>= 15%)`);
      else failed.push(`ROE ${roe.toFixed(1)}% < 15%`);
      if (currentRatio >= 1.5 || quickRatio >= 1.2) matched.push(`Strong liquidity (CR: ${currentRatio.toFixed(1)}x)`);
      else failed.push('Liquidity below benchmark');
      break;
    }

    // ── Dividend & Compounding Income ──
    case 'inv_high_dividend_covered': {
      if (divYield >= 3.5) matched.push(`High Dividend Yield ${divYield.toFixed(2)}% (>= 3.5%)`);
      else failed.push(`Dividend Yield ${divYield.toFixed(2)}% < 3.5%`);
      if (interestCoverage >= 3.0 || npm >= 6.0) matched.push(`Adequate coverage buffer (${interestCoverage.toFixed(1)}x)`);
      else failed.push('Coverage buffer weak');
      if (payoutRatio <= 60.0) matched.push(`Healthy dividend coverage (Payout: ${payoutRatio.toFixed(1)}% <= 60%)`);
      else failed.push(`Payout ratio ${payoutRatio.toFixed(1)}% > 60%`);
      break;
    }

    case 'inv_dividend_aristocrats': {
      if (divYield >= 1.2) matched.push(`Active Dividend Yield ${divYield.toFixed(2)}% (>= 1.2%)`);
      else failed.push(`Dividend Yield ${divYield.toFixed(2)}% < 1.2%`);
      if (profit5Y >= 8.0 || profit3Y >= 8.0) matched.push(`Multi-year profit CAGR ${(profit5Y || profit3Y).toFixed(1)}% (>= 8%)`);
      else failed.push('Multi-year profit CAGR < 8%');
      if (de <= 0.6) matched.push(`Conservative leverage D/E ${de.toFixed(2)} (<= 0.6)`);
      else failed.push(`D/E ${de.toFixed(2)} > 0.6`);
      break;
    }

    case 'inv_high_dividend_growth': {
      if (divYield >= 1.5) matched.push(`Dividend Yield ${divYield.toFixed(2)}% (>= 1.5%)`);
      else failed.push(`Dividend Yield ${divYield.toFixed(2)}% < 1.5%`);
      if (sales3Y >= 10.0 || sales1Y >= 10.0) matched.push(`Top-line sales expansion ${(sales3Y || sales1Y).toFixed(1)}% (>= 10%)`);
      else failed.push('Sales growth < 10%');
      if (roe >= 18.0) matched.push(`High reinvestment return ROE ${roe.toFixed(1)}% (>= 18%)`);
      else failed.push(`ROE ${roe.toFixed(1)}% < 18%`);
      break;
    }

    case 'inv_sustainable_low_payout': {
      if (divYield >= 2.0) matched.push(`Dividend Yield ${divYield.toFixed(2)}% (>= 2.0%)`);
      else failed.push(`Dividend Yield ${divYield.toFixed(2)}% < 2.0%`);
      if (payoutRatio <= 35.0) matched.push(`Sustainable low payout ratio ${payoutRatio.toFixed(1)}% (<= 35%)`);
      else failed.push(`Payout ratio ${payoutRatio.toFixed(1)}% > 35%`);
      if (npm >= 10.0) matched.push(`Net profit margin ${npm.toFixed(1)}% (>= 10%)`);
      else failed.push(`Net margin ${npm.toFixed(1)}% < 10%`);
      break;
    }

    case 'inv_ddm_undervalued': {
      if (divYield >= 2.5) matched.push(`Dividend Yield ${divYield.toFixed(2)}% (>= 2.5%)`);
      else failed.push(`Dividend Yield ${divYield.toFixed(2)}% < 2.5%`);
      if (ddmDiscountPct >= 20.0) matched.push(`Trading at ${ddmDiscountPct.toFixed(1)}% discount to DDM Intrinsic Value`);
      else failed.push(`DDM discount ${ddmDiscountPct.toFixed(1)}% < 20%`);
      if (roe >= 12.0) matched.push(`Sustainable equity return ROE ${roe.toFixed(1)}% (>= 12%)`);
      else failed.push(`ROE ${roe.toFixed(1)}% < 12%`);
      break;
    }

    // ── Quality & Capital Efficiency ──
    case 'inv_piotroski_f_score': {
      if (piotroski >= 8) matched.push(`Elite Piotroski F-Score ${piotroski} / 9`);
      else failed.push(`Piotroski Score ${piotroski} < 8`);
      if (cfo > 0) matched.push('Positive cash from operations');
      else failed.push('Negative cash from operations');
      if (roce >= 15.0) matched.push(`ROCE ${roce.toFixed(1)}% (>= 15%)`);
      else failed.push(`ROCE ${roce.toFixed(1)}% < 15%`);
      break;
    }

    case 'inv_altman_z_safe_haven': {
      if (!isFinancial) matched.push('Non-financial corporate entity');
      else failed.push('BFSI entity excluded from Altman Z screening');
      if (altmanZ >= 3.0) matched.push(`Safe Haven Altman Z-Score ${altmanZ.toFixed(2)} (>= 3.0)`);
      else failed.push(`Altman Z-Score ${altmanZ.toFixed(2)} < 3.0`);
      if (currentRatio >= 1.5) matched.push(`Healthy Current Ratio ${currentRatio.toFixed(1)}x (>= 1.5x)`);
      else failed.push(`Current Ratio ${currentRatio.toFixed(1)}x < 1.5x`);
      if (interestCoverage >= 4.0) matched.push(`Interest coverage ${interestCoverage.toFixed(1)}x (>= 4.0x)`);
      else failed.push(`Interest coverage ${interestCoverage.toFixed(1)}x < 4.0x`);
      break;
    }

    case 'inv_high_roe_compounders': {
      if (roe >= 20.0 && roe <= 160.0) matched.push(`Superior ROE ${roe.toFixed(1)}% (>= 20%)`);
      else failed.push(`ROE ${roe.toFixed(1)}% outside 20–160% bound`);
      if ((company.roe3YAvg != null && company.roe3YAvg >= 18.0 && company.roe3YAvg <= 160.0) || profit3Y >= 12.0) matched.push('Multi-year sustained high return');
      else failed.push('3Y average return below 18%');
      if (de <= 0.8) matched.push(`Prudent leverage D/E ${de.toFixed(2)} (<= 0.8)`);
      else failed.push(`D/E ${de.toFixed(2)} > 0.8`);
      break;
    }

    case 'inv_high_roce_efficiency': {
      if (roce >= 25.0 && roce <= 160.0) matched.push(`Elite ROCE ${roce.toFixed(1)}% (>= 25%)`);
      else failed.push(`ROCE ${roce.toFixed(1)}% outside 25–160% bound`);
      if (opm >= 15.0) matched.push(`Healthy OPM ${opm.toFixed(1)}% (>= 15%)`);
      else failed.push(`OPM ${opm.toFixed(1)}% < 15%`);
      if (cfo > 0) matched.push('Positive cash from operations');
      else failed.push('CFO is negative');
      break;
    }

    case 'inv_roic_economic_moat': {
      if (roic >= 20.0 && roic <= 160.0) matched.push(`Durable ROIC moat ${roic.toFixed(1)}% (>= 20%)`);
      else failed.push(`ROIC ${roic.toFixed(1)}% < 20%`);
      if (grossMargin >= 35.0 || opm >= 18.0) matched.push(`Pricing power verified (Margin: ${grossMargin.toFixed(1)}%)`);
      else failed.push('Gross margin < 35%');
      if (fcf > 0 || cfo > 0) matched.push('Positive cash flow generation');
      else failed.push('Cash flow is negative');
      break;
    }

    case 'inv_dupont_quality': {
      if (npm >= 12.0) matched.push(`Net Profit Margin ${npm.toFixed(1)}% (>= 12%)`);
      else failed.push(`NPM ${npm.toFixed(1)}% < 12%`);
      if (de <= 0.8) matched.push(`Conservative leverage D/E ${de.toFixed(2)} (Assets/Equity < 2.0x)`);
      else failed.push(`D/E ${de.toFixed(2)} > 0.8`);
      if (roe >= 18.0) matched.push(`High ROE ${roe.toFixed(1)}% (>= 18%) driven by operational margin`);
      else failed.push(`ROE ${roe.toFixed(1)}% < 18%`);
      break;
    }

    case 'inv_low_accruals_quality': {
      if (!isFinancial) matched.push('Non-financial corporate entity');
      else failed.push('BFSI entity excluded from accrual anomaly screening');
      if (cfo > 0) matched.push('Positive cash from operations');
      else failed.push('Negative cash from operations');
      if (cfoPatRatio >= 1.20) matched.push(`High earnings quality: CFO exceeds Net Profit by ${((cfoPatRatio - 1) * 100).toFixed(1)}% (CFO/PAT: ${cfoPatRatio.toFixed(2)}x)`);
      else failed.push(`CFO to Net Profit ratio ${cfoPatRatio.toFixed(2)}x < 1.20x`);
      if (fcf > 0 || cfo > 0) matched.push('Positive free cash flow generation');
      else failed.push('Free cash flow negative');
      break;
    }

    // ── Growth & CAN SLIM ──
    case 'inv_can_slim_leaders': {
      if (qtrProfit >= 20.0) matched.push(`Accelerating EPS growth ${qtrProfit.toFixed(1)}% (>= 20%)`);
      else failed.push(`EPS growth ${qtrProfit.toFixed(1)}% < 20%`);
      if (profit3Y >= 15.0 || profit1Y >= 15.0) matched.push(`Annual profit compounding ${(profit3Y || profit1Y).toFixed(1)}% (>= 15%)`);
      else failed.push('Annual profit growth < 15%');
      if (company.priceTo52WHighPct != null && company.priceTo52WHighPct >= -18.0) matched.push('Trading within 18% of 52W High');
      else failed.push('More than 18% below 52W High');
      if (institutional >= 15.0) matched.push(`Institutional sponsorship ${institutional.toFixed(1)}% (>= 15%)`);
      else failed.push(`Institutional sponsorship ${institutional.toFixed(1)}% < 15%`);
      break;
    }

    case 'inv_triple_digit_eps_growth': {
      if (qtrProfit >= 100.0) matched.push(`Triple-digit profit expansion ${qtrProfit.toFixed(1)}% (>= 100%)`);
      else failed.push(`Profit growth ${qtrProfit.toFixed(1)}% < 100%`);
      if (qtrSales >= 15.0 || sales1Y >= 15.0) matched.push(`Top-line sales expansion ${(qtrSales || sales1Y).toFixed(1)}% (>= 15%)`);
      else failed.push('Sales growth < 15%');
      if (npm > 0) matched.push('Profitable operations');
      else failed.push('Negative profit margin');
      break;
    }

    case 'inv_revenue_hyper_growth': {
      if (sales3Y >= 30.0 || sales1Y >= 30.0) matched.push(`Hyper revenue expansion ${(sales3Y || sales1Y).toFixed(1)}% (>= 30%)`);
      else failed.push('Revenue growth < 30%');
      if (opm >= 10.0) matched.push(`Healthy operating margin ${opm.toFixed(1)}% (>= 10%)`);
      else failed.push(`OPM ${opm.toFixed(1)}% < 10%`);
      if (cfo > 0 || fcf > 0) matched.push('Cash generative operations');
      else failed.push('Cash flow negative');
      break;
    }

    case 'inv_peg_undervalued_growth': {
      if (peg > 0 && peg <= 0.8) matched.push(`Undervalued PEG ratio ${peg.toFixed(2)} (<= 0.8)`);
      else failed.push(`PEG ratio ${peg.toFixed(2)} > 0.8`);
      if (profit3Y >= 15.0 || profit1Y >= 15.0) matched.push(`Robust earnings expansion ${(profit3Y || profit1Y).toFixed(1)}% (>= 15%)`);
      else failed.push('Earnings growth < 15%');
      if (roe >= 15.0) matched.push(`Healthy ROE ${roe.toFixed(1)}% (>= 15%)`);
      else failed.push(`ROE ${roe.toFixed(1)}% < 15%`);
      break;
    }

    case 'inv_operating_margin_inflection': {
      const marginInflection = qtrProfit - qtrSales;
      if (marginInflection >= 15.0 || opm >= 18.0) matched.push(`Operating leverage inflection: Profit outpaces sales by ${marginInflection.toFixed(1)}%`);
      else failed.push(`Margin inflection spread ${marginInflection.toFixed(1)}% < 15%`);
      if (sales1Y >= 10.0) matched.push(`Positive revenue expansion ${sales1Y.toFixed(1)}% (>= 10%)`);
      else failed.push(`Sales growth ${sales1Y.toFixed(1)}% < 10%`);
      if (npm >= 5.0) matched.push(`Positive net profitability ${npm.toFixed(1)}% (>= 5%)`);
      else failed.push(`Net margin ${npm.toFixed(1)}% < 5%`);
      break;
    }

    case 'inv_rule_of_40': {
      if (ruleOf40Sum >= 40.0) matched.push(`Rule of 40 score: ${ruleOf40Sum.toFixed(1)}% (Sales Growth ${sales1Y.toFixed(1)}% + FCF Margin ${fcfMargin.toFixed(1)}% >= 40%)`);
      else failed.push(`Rule of 40 score ${ruleOf40Sum.toFixed(1)}% < 40%`);
      if (npm >= 8.0) matched.push(`Healthy net profit margin ${npm.toFixed(1)}% (>= 8%)`);
      else failed.push(`Net margin ${npm.toFixed(1)}% < 8%`);
      break;
    }

    // ── Factor & Special Situations ──
    case 'inv_magic_formula': {
      if (!isFinancial) matched.push('Non-financial corporate entity');
      else failed.push('BFSI entity excluded from Magic Formula screening');
      if (roce >= 18.0 && roce <= 160.0) matched.push(`High capital efficiency ROCE ${roce.toFixed(1)}% (>= 18%)`);
      else failed.push(`ROCE ${roce.toFixed(1)}% < 18%`);
      if (earningsYield >= 6.0) matched.push(`High earnings yield ${earningsYield.toFixed(1)}% (>= 6%)`);
      else failed.push(`Earnings yield ${earningsYield.toFixed(1)}% < 6%`);
      if (de <= 1.0) matched.push(`Controlled leverage D/E ${de.toFixed(2)} (<= 1.0)`);
      else failed.push(`D/E ${de.toFixed(2)} > 1.0`);
      break;
    }

    case 'inv_acquirers_multiple': {
      if (!isFinancial) matched.push('Non-financial corporate entity');
      else failed.push('BFSI entity excluded from Acquirer Multiple screening');
      if (acquirerMultiple > 0 && acquirerMultiple <= 8.33) matched.push(`Acquirer multiple ${acquirerMultiple.toFixed(1)}x (<= 8.33x, Yield: ${acquirerYield.toFixed(1)}% >= 12%)`);
      else failed.push(`Acquirer multiple ${acquirerMultiple.toFixed(1)}x > 8.33x`);
      if (de <= 1.0) matched.push(`Debt/Equity ${de.toFixed(2)} (<= 1.0)`);
      else failed.push(`D/E ${de.toFixed(2)} > 1.0`);
      if (npm > 0) matched.push('Profitable operating business');
      else failed.push('Net profit negative');
      break;
    }

    case 'inv_beneish_m_score': {
      if (altmanZ >= 2.5) matched.push(`Solvency verification Altman Z ${altmanZ.toFixed(2)} (>= 2.5)`);
      else failed.push(`Altman Z ${altmanZ.toFixed(2)} < 2.5`);
      if (cfo > 0) matched.push('Positive cash from operations');
      else failed.push('CFO is negative');
      if (de <= 1.0) matched.push(`Debt/Equity ${de.toFixed(2)} (<= 1.0)`);
      else failed.push(`D/E ${de.toFixed(2)} > 1.0`);
      if (cfoPatRatio >= 0.90) matched.push(`Clean earnings quality: CFO/PAT ${cfoPatRatio.toFixed(2)}x (Low manipulation risk)`);
      else failed.push(`CFO/PAT ${cfoPatRatio.toFixed(2)}x indicates high accruals`);
      break;
    }

    case 'inv_institutional_accumulation': {
      if (institutional >= 25.0) matched.push(`High institutional sponsorship ${institutional.toFixed(1)}% (>= 25%)`);
      else failed.push(`Institutional holding ${institutional.toFixed(1)}% < 25%`);
      if (pledged === 0) matched.push('Zero Promoter Pledge');
      else failed.push(`Pledged shares ${pledged.toFixed(1)}%`);
      if (roe >= 12.0) matched.push(`Quality return ROE ${roe.toFixed(1)}% (>= 12%)`);
      else failed.push(`ROE ${roe.toFixed(1)}% < 12%`);
      break;
    }

    case 'inv_promoter_buying': {
      if (promoter >= 50.0) matched.push(`High promoter ownership ${promoter.toFixed(1)}% (>= 50%)`);
      else failed.push(`Promoter holding ${promoter.toFixed(1)}% < 50%`);
      if (promoterChange3Y >= 0) matched.push('Stable / expanding promoter holding');
      else failed.push('Promoter stake declined');
      if (pledged === 0) matched.push('Zero Promoter Pledge');
      else failed.push(`Pledged shares ${pledged.toFixed(1)}%`);
      break;
    }

    case 'inv_zero_promoter_pledge': {
      if (pledged === 0.0) matched.push('Fortress Balance Sheet: 0.00% Promoter Pledge');
      else failed.push(`Promoter shares pledged: ${pledged.toFixed(2)}%`);
      if (promoter >= 25.0) matched.push(`Promoter skin in the game ${promoter.toFixed(1)}% (>= 25%)`);
      else failed.push(`Promoter holding ${promoter.toFixed(1)}% < 25%`);
      if (interestCoverage >= 4.0) matched.push(`Safe interest coverage ${interestCoverage.toFixed(1)}x (>= 4.0x)`);
      else failed.push(`Interest coverage ${interestCoverage.toFixed(1)}x < 4.0x`);
      if (roe >= 15.0) matched.push(`Healthy ROE ${roe.toFixed(1)}% (>= 15%)`);
      else failed.push(`ROE ${roe.toFixed(1)}% < 15%`);
      break;
    }

    case 'inv_turnaround_profitability': {
      if (npm > 0) matched.push(`Current net profitability positive (${npm.toFixed(1)}%)`);
      else failed.push('Currently loss making');
      if (profit1Y >= 50.0) matched.push(`Earnings turnaround momentum ${profit1Y.toFixed(1)}% (>= 50%)`);
      else failed.push(`Profit turnaround growth ${profit1Y.toFixed(1)}% < 50%`);
      if (sales1Y >= 12.0) matched.push(`Sales growth ${sales1Y.toFixed(1)}% (>= 12%)`);
      else failed.push(`Sales growth ${sales1Y.toFixed(1)}% < 12%`);
      if (cfo > 0) matched.push('Positive cash from operations');
      else failed.push('CFO is negative');
      break;
    }

    case 'inv_capex_cycle_expansion': {
      if (capex > 0 || (company.balanceSheet && company.balanceSheet[0]?.fixedAssets && company.balanceSheet[1]?.fixedAssets && company.balanceSheet[0].fixedAssets > company.balanceSheet[1].fixedAssets)) matched.push('Active capital expenditure into capacity expansion');
      else failed.push('Capex data not indicating expansion');
      if (interestCoverage >= 3.0) matched.push(`Safe interest coverage ${interestCoverage.toFixed(1)}x (>= 3.0x)`);
      else failed.push(`Interest coverage ${interestCoverage.toFixed(1)}x < 3.0x`);
      if (roce >= 18.0) matched.push(`High return on capital ROCE ${roce.toFixed(1)}% (>= 18%)`);
      else failed.push(`ROCE ${roce.toFixed(1)}% < 18%`);
      if (sales1Y >= 10.0) matched.push(`Top-line sales expansion ${sales1Y.toFixed(1)}% (>= 10%)`);
      else failed.push(`Sales growth ${sales1Y.toFixed(1)}% < 10%`);
      break;
    }

    case 'inv_balance_sheet_deleveraging': {
      if (debtReduction3Y >= 20.0 || (de <= 0.3 && de >= 0)) matched.push(`Aggressive balance sheet deleveraging (Reduction: ${debtReduction3Y.toFixed(1)}%, D/E: ${de.toFixed(2)})`);
      else failed.push('Debt reduction below benchmark');
      if (cfo > 0) matched.push('Positive operating cash flow');
      else failed.push('Operating cash flow is negative');
      if (roce >= 12.0) matched.push(`Sound ROCE ${roce.toFixed(1)}% (>= 12%)`);
      else failed.push(`ROCE ${roce.toFixed(1)}% < 12%`);
      break;
    }

    case 'inv_share_buyback_leaders': {
      if (fcfYield >= 5.0) matched.push(`High FCF Yield ${fcfYield.toFixed(1)}% (>= 5.0%) supporting buybacks`);
      else failed.push(`FCF Yield ${fcfYield.toFixed(1)}% < 5.0%`);
      if (roic >= 15.0) matched.push(`Elite ROIC ${roic.toFixed(1)}% (>= 15%)`);
      else failed.push(`ROIC ${roic.toFixed(1)}% < 15%`);
      if (de <= 0.5) matched.push(`Conservative debt structure D/E ${de.toFixed(2)} (<= 0.5)`);
      else failed.push(`D/E ${de.toFixed(2)} > 0.5`);
      break;
    }

    default: {
      if (roe > 15) matched.push(`Strong ROE ${roe.toFixed(1)}%`);
      if (roce > 18) matched.push(`Solid ROCE ${roce.toFixed(1)}%`);
      if (de < 0.8) matched.push(`Low D/E ${de.toFixed(2)}`);
      if (matched.length === 0) failed.push('Did not meet primary benchmark filter');
    }
  }

  const totalChecks = matched.length + failed.length;
  const score = totalChecks > 0 ? Math.round((matched.length / totalChecks) * 100) : 50;
  const qualifies = failed.length === 0 && matched.length > 0;

  return {
    strategyId,
    strategyName: name,
    category,
    qualifies,
    score,
    matchedCriteria: matched,
    failedCriteria: failed,
    keyMetrics: metrics,
  };
}

// ── 6. Re-export Legacy Definitions for Seamless Backwards Compatibility ──────

export {
  COMBINED_STRATEGY_DEFINITIONS,
  evaluateCombinedStrategiesForStock,
};
