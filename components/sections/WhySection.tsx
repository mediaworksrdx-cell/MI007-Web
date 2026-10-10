'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';

interface TokenDetail {
  title: string;
  category: string;
  categoryColor: string;
  description: string;
  signal: string;
  formulaOrRule: string;
}

const TOKEN_EXPLANATIONS: Record<string, TokenDetail> = {
  // ── Category 5: MOMENTUM & TREND (Row 1) ──
  'PRICE ACTION': {
    title: 'Price Action Geometry',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Raw candlestick range, wick rejection, and market structure analysis without lagging indicators. Detects real-time continuous auction imbalances between aggressive buyers and sellers.',
    signal: 'Bullish wick rejection confirming liquidity defense at structural swing pivot.',
    formulaOrRule: 'Auction Price Delivery & Swing High/Low Range',
  },
  'RSI 64.2': {
    title: 'Relative Strength Index (RSI)',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Momentum oscillator measuring the velocity and magnitude of directional price movements on a 0–100 scale. At 64.2, momentum exhibits firm institutional buying velocity before the overbought threshold (70+).',
    signal: 'Bullish momentum acceleration holding strong above the 50 median centerline.',
    formulaOrRule: 'RSI = 100 - [100 / (1 + RS)] · 14 Periods',
  },
  'EMA 21 CROSS': {
    title: '21 Exponential Moving Average Cross',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Dynamic 21-period EMA trend boundary. When fast price action crosses and sustains above EMA 21, it confirms short-term order flow has overpowered baseline multi-session distribution.',
    signal: 'Confirmed bullish continuation vector above dynamic equilibrium.',
    formulaOrRule: 'EMA = Price(t) × k + EMA(y) × (1 - k), k = 2/(N+1)',
  },
  'MACD HIST': {
    title: 'MACD Histogram Delta',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Differential divergence between the 12-day fast EMA and 26-day slow EMA signal line. Expanding green histogram bars indicate accelerating institutional accumulation velocity.',
    signal: 'Expanding positive momentum delta accelerating through zero-line.',
    formulaOrRule: 'Histogram = MACD Line (12-26) - Signal Line (9 EMA)',
  },
  'TREND +1.40%': {
    title: 'Session Trend Velocity (+1.40%)',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Intraday directional statistical expansion. A +1.40% continuous advance with compressed volatility indicates steady institutional accumulation rather than speculative spikes.',
    signal: 'Strong directional bias holding above volume-weighted average price (VWAP).',
    formulaOrRule: 'Normalized Return = (P_current - P_open) / P_open',
  },
  'SUPER TREND': {
    title: 'Volatility-Smoothed Continuation Band',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Adaptive indicator combining ATR volatility bands with median price equilibrium to filter out market noise and clearly define the current macro regime.',
    signal: 'Bullish regime confirmed: price trajectory holding firmly above dynamic trailing band.',
    formulaOrRule: 'Band = (High + Low)/2 ± (Multiplier × ATR)',
  },
  'ADX 38.4': {
    title: 'Average Directional Index Trend Strength (38.4)',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Quantifies the statistical momentum and conviction of a trend without regard to direction. Scores above 25 indicate a powerful, non-ranging trend state.',
    signal: 'Strong trending momentum: directional conviction overpowering chop.',
    formulaOrRule: 'ADX = 100 × Smoothed Moving Average of DX over 14 Periods',
  },
  'STOCH RSI': {
    title: 'Stochastics of Relative Strength Momentum',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Applies the stochastic oscillator formula to RSI values rather than standard price data, increasing sensitivity to pinpoint short-term cyclical turning points.',
    signal: 'Bullish cycle crossover emerging from oversold compression band.',
    formulaOrRule: 'StochRSI = (RSI - Lowest RSI) / (Highest RSI - Lowest RSI)',
  },

  // ── Category 6: QUANTITATIVE AI & ARBITRAGE (Row 2) ──
  'MOMENTUM AI': {
    title: 'Proprietary Quantitative AI Score',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Synthetix MI007 proprietary multi-dimensional machine learning score synthesizing tape velocity, order book imbalance, volatility smile, and sentiment vectors into a unified index.',
    signal: 'Quant confidence index: 94.2% directional conviction score.',
    formulaOrRule: 'Multi-Factor Neural Tensor across 40+ Micro-Indicators',
  },
  'SMT DIVERGE': {
    title: 'Smart Money Divergence (SMT)',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Inter-market non-confirmation between closely correlated assets (e.g., NQ vs ES or BTC vs ETH). When one asset breaks a high while the other fails, institutional manipulation is indicated.',
    signal: 'Inter-asset crack: correlated benchmark failing to confirm higher high.',
    formulaOrRule: 'Asset A Higher High vs Asset B Lower High Divergence',
  },
  'ARBITRAGE +42': {
    title: 'Cross-Exchange Synthetic Basis Mispricing',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Temporary dislocation in price between spot index and perpetual futures basis yielding 42 basis points of risk-neutral statistical yield.',
    signal: 'Cash-and-carry basis arbitrage window active for high-speed algorithmic execution.',
    formulaOrRule: 'Basis Delta = Futures Price - Spot Underlying Index Price',
  },
  'DXY 104.2': {
    title: 'US Dollar Index Global Liquidity Correlation (104.2)',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Weighted geometric mean of the US dollar against a basket of six world reserve currencies. Inversely correlated with risk asset liquidity expansion.',
    signal: 'Dollar plateau: easing pressure on equities, crypto, and emerging market liquidity.',
    formulaOrRule: 'DXY = 50.14348112 × EURUSD^-0.576 × USDJPY^0.136 × ...',
  },
  'DARK POOL 1.8M': {
    title: 'Alternative Trading System (ATS) Block Prints',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Off-exchange institutional block trades transacted without public pre-trade quotes to prevent market impact. Aggregated telemetry captures 1.8M buy print.',
    signal: 'Major institutional accumulation print detected at discrete wholesale benchmark.',
    formulaOrRule: 'ATS & FINRA TRF Consolidated High-Volume Block Prints',
  },
  'BULL PINBAR': {
    title: 'Long Lower Wick Rejection Candlestick',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Single-candle reversal pattern featuring a lower wick extending at least twice the length of the candle body, confirming violent rejection of lower prices.',
    signal: 'Liquidity rejection: aggressive sellers trapped at the lows and forced into cover.',
    formulaOrRule: 'Lower Wick Length ≥ 2 × Real Body Length & Upper Wick Minimal',
  },
  'PREMIUM 78.6%': {
    title: 'Fibonacci Optimal Trade Entry Discount/Premium',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Golden ratio retracement level between 61.8% and 78.6% of the dealing range, representing the high-probability institutional discount entry zone.',
    signal: 'Optimal trade entry: deep pullback into institutional pricing discount.',
    formulaOrRule: 'Retracement Level = Swing Low + 0.786 × (Swing High - Swing Low)',
  },
  'ORDER RATIO 2.4': {
    title: 'Real-Time Bid/Ask Limit Book Density Ratio',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Ratio of total bids to total asks within 1% of mid-market price. A 2.4 ratio indicates buyers have committed more than double the liquidity of sellers.',
    signal: 'Strong structural bid support absorbing all passive selling pressure.',
    formulaOrRule: 'Density Ratio = Cumulative Bid Volume(±1%) / Cumulative Ask Volume(±1%)',
  },

  // ── Category 1: ORDER FLOW & MICROSTRUCTURE (Row 3) ──
  'BULL DELTA': {
    title: 'Cumulative Buyer Delta (CVD)',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Cumulative Volume Delta (CVD) tracking aggressive market orders hitting the ask versus passive limits. Heavy Bull Delta signifies institutional market orders aggressively sweeping supply.',
    signal: 'Aggressive buy delta dominant (+62% net aggressive buyer volume).',
    formulaOrRule: 'Delta = Aggressive Ask Volume - Aggressive Bid Volume',
  },
  'VOLUME 3.4M': {
    title: 'Aggregated Tape Volume (3.4M)',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Multi-exchange consolidated transaction volume (3.4 Million units) validating directional price breakout. High volume confirms institutional commitment and invalidates false retail breakouts.',
    signal: 'Institutional participation confirmed: 184% above 20-day rolling baseline.',
    formulaOrRule: 'Consolidated L1 + L2 Order Fill Aggregation',
  },
  'TAPE AGGR 82%': {
    title: 'High-Frequency Tape Aggression Ratio',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: '82% of all matched transactions across Time & Sales executed at the ask price rather than the bid price over the rolling 60-second window.',
    signal: 'Extreme taker aggression: market buyers sweeping passive book depth.',
    formulaOrRule: 'Tape Aggression = (Ask Market Volume) / (Total Taker Volume)',
  },
  'ABSORPTION': {
    title: 'Passive Limit Absorption Dynamic',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Aggressive selling pressure fails to move price downward because massive passive institutional limit orders absorb every market sell print without yielding ground.',
    signal: 'High seller effort with zero downward price progression: bullish absorption.',
    formulaOrRule: 'High Volume / CVD Delta Divergence at Static Support Price',
  },
  'ICEBERG BID': {
    title: 'Hidden Iceberg Limit Defense',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Algorithmic synthetic order where a massive institutional limit buy is split into small visible tranches. Automatically reloads as soon as the displayed tranche is executed.',
    signal: 'Hidden accumulation: repetitive refresh of bid tranches absorbing sell volume.',
    formulaOrRule: 'Native / Synthetic Native Exchange Iceberg Detection',
  },
  'DOM DEPTH L2': {
    title: 'Level-2 Limit Book Depth Imbalance',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Real-time depth-of-market ratio comparing resting limit bids against limit asks across the top 20 tiers of the order book.',
    signal: 'Order book skew: 3.1x heavier limit liquidity on bid side preventing downside slip.',
    formulaOrRule: 'Depth Imbalance = ∑Bid Depth (Top 20) / ∑Ask Depth (Top 20)',
  },
  'DELTA CLUSTER': {
    title: 'Footprint Delta Concentration Cluster',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Heavy anomalous positive delta concentrated within a single price tick or rotation bar on the footprint chart, showing aggressive market orders dominating the order flow.',
    signal: 'Localized buyer exhaustion or explosive absorption breakout tick.',
    formulaOrRule: 'Tick Net Delta = ∑Ask Fills - ∑Bid Fills at Price Node',
  },
  'HFT SPREAD': {
    title: 'Sub-Millisecond Bid-Ask Latency Spread',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Ultra-tight micro-tick spread maintained by market-making algorithms through colocated cross-connects, minimizing friction for institutional sizing.',
    signal: 'Optimal execution efficiency: tightest spread regime with minimal price impact.',
    formulaOrRule: 'Spread = Best Ask - Best Bid ≤ 1 Minimum Price Increment',
  },

  // ── Category 2: SMART MONEY CONCEPTS (SMC) (Row 4) ──
  'ORDER BLOCK': {
    title: 'Institutional Order Block',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'The final counter-trend candle before an aggressive institutional impulse move. Represents unfilled institutional limit orders waiting to be mitigated upon price retest.',
    signal: 'Prime re-entry zone: high probability liquidity mitigation target.',
    formulaOrRule: 'Last Down-Candle before Bullish Break of Structure (BOS)',
  },
  'FVG GAP ZONE': {
    title: 'Fair Value Gap (FVG Zone)',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'A 3-candle price delivery imbalance where one-sided aggressive buying left a void between Candle 1 high and Candle 3 low. Acts as a magnetic algorithmic rebalance target.',
    signal: 'Inefficiency magnet: algorithmic models trigger mean-reversion rebalance.',
    formulaOrRule: 'Fair Value Gap = Candle 1 Wick High < Candle 3 Wick Low Void',
  },
  'BOS BREAK': {
    title: 'Break of Structure (BOS)',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'A definitive candlestick close beyond a major swing high or swing low in the direction of the dominant trend, confirming institutional trend continuation.',
    signal: 'Trend continuation validated: bullish higher-high candle close above prior structural swing.',
    formulaOrRule: 'Candle Close > Prior Swing High in Trending Direction',
  },
  'CHoCH PIVOT': {
    title: 'Change of Character (CHoCH)',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'Initial structural break signaling an impending trend shift. Violates the most recent counter-trend swing low/high before a macro trend transition.',
    signal: 'Early warning: institutional supply overcomes previous demand pivot.',
    formulaOrRule: 'First Counter-Trend Swing Structural Violation',
  },
  'LIQ POOL HIGH': {
    title: 'Buy-Side Liquidity Pool Target',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'Dense clusters of buy-stop orders placed by retail breakout traders and short sellers above key swing highs, acting as a magnet for smart-money distribution.',
    signal: 'Attractor node: market makers driving price toward resting buy stops.',
    formulaOrRule: 'Equal Highs / Untapped Swing High Clusters',
  },
  'BEAR SWEEP': {
    title: 'Liquidity Bear Sweep',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'Algorithmic manipulation event where price intentionally penetrates below structural support to trigger retail stop-loss orders and capture deep buy-side liquidity before rapid mean reversion.',
    signal: 'Short-trap completed: resting stops cleared, liquidity absorbed by institutions.',
    formulaOrRule: 'Stop Run below Prior Swing Low + Immediate Reclaim',
  },
  'MITIGATION OB': {
    title: 'Unfilled Institutional Order Block Retest',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'Price returns to the originating structural order block to allow institutional algorithms to break even on drawdown positions before directional expansion.',
    signal: 'Mitigation complete: retest respected with immediate directional continuation.',
    formulaOrRule: 'Price Retest of 50% Mean Threshold of Prior Breaker / Order Block',
  },
  'SWEEP HIGH': {
    title: 'Stop-Run on Prior Session High Liquidity',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'Algorithmic surge above the previous day or session high to trigger buy stops and induce retail breakout longs, immediately followed by distribution.',
    signal: 'Liquidity harvested: false breakout trap trapping retail longs at the peak.',
    formulaOrRule: 'Session High Penetration + Immediate Candlestick Reversal Close Below',
  },

  // ── Category 4: DERIVATIVES & VOLATILITY (Row 5) ──
  'VIX 13.40': {
    title: 'CBOE Implied Volatility Index (13.40)',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Market-wide 30-day forward implied volatility priced from S&P 500 index options. Sub-14 readings indicate low volatility, complacency, and steady equity trends.',
    signal: 'Low implied volatility regime favors systematic carry and trend following.',
    formulaOrRule: 'CBOE 30-Day Forward SPX Option Strip Variance',
  },
  'IV CRUSH 32%': {
    title: 'Post-Catalyst Volatility Contraction (-32%)',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Sharp deflation in implied volatility immediately following an earnings release, CPI announcement, or regulatory decision, drastically deflating option premiums.',
    signal: 'Premium collapse: long option extrinsic value decays rapidly post-event.',
    formulaOrRule: 'IV_post = IV_pre × (1 - ΔIV_event) / Mean Volatility Baseline',
  },
  'GAMMA FLIP': {
    title: 'Option Dealer Gamma Flip Level',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'The exact price benchmark where aggregate market maker options delta-hedging switches from stabilizing positive gamma to volatility-amplifying negative gamma.',
    signal: 'Volatility accelerant: crossing below flip triggers aggressive trend-chasing dealer hedges.',
    formulaOrRule: 'Net GEX = ∑(Open Interest × Gamma × Spot × 100)',
  },
  'DELTA NEUTRAL': {
    title: 'Market Maker Dynamic Delta Hedging',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Institutional portfolio state where overall directional sensitivity equals zero. Market makers continuously trade spot underlying assets to balance portfolio delta.',
    signal: 'Automated dealer rebalancing flow stabilizing price around key strikes.',
    formulaOrRule: 'Portfolio Net Δ = ∑(Position_i × Delta_i) = 0',
  },
  'SKEW 138.2': {
    title: 'Tail Risk Out-of-the-Money Volatility Skew',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Relative implied volatility price premium of out-of-the-money put options versus out-of-the-money calls. Readings above 135 indicate heavy institutional black-swan hedging.',
    signal: 'Elevated tail-risk insurance demand: institutions buying deep downside puts.',
    formulaOrRule: 'CBOE SKEW Index = 100 - 10 × S_3 (Third Moment Skewness)',
  },
  'ATR 42.8': {
    title: 'Average True Range Normalized Volatility (42.8)',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Exponential moving average of true trading ranges over 14 periods. Reflects current expansion or compression of intraday trading bars.',
    signal: 'Normalizing volatility bandwidth: ideal conditions for structured trailing stops.',
    formulaOrRule: 'True Range = max(H-L, |H - C_prev|, |L - C_prev|)',
  },
  'PCR 0.74': {
    title: 'Total Market Options Put-Call Ratio (0.74)',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Volume ratio comparing traded put contracts against call contracts across all major exchanges. A 0.74 reading indicates bullish speculative call appetite.',
    signal: 'Moderate bullish bias: call volume outpaces protective puts across open interest.',
    formulaOrRule: 'PCR = Aggregate Put Volume / Aggregate Call Volume',
  },
  'MAX PAIN 24.5K': {
    title: 'Options Strike Max Pain Theoretical Anchor',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'The strike price where option buyers would lose the maximum cumulative value upon options expiration, maximizing profits for option-selling institutions.',
    signal: 'Expiration magnet: institutional market makers pinning price into expiration Friday.',
    formulaOrRule: 'Min ∑(Total Intrinsic Cash Value of All Puts + Calls at Strike K)',
  },

  // ── Category 3: AUCTION THEORY & PROFILE (Row 6) ──
  'VWAP ANCHOR': {
    title: 'Anchored Volume-Weighted Average Price',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'True institutional fair value benchmark calculated from the high-impact session open or catalyst event. Used by institutional execution algorithms as prime fill reference.',
    signal: 'Dynamic institutional equilibrium holding as solid demand support.',
    formulaOrRule: 'Anchored VWAP = ∑(Volume × Typical Price) / ∑Volume',
  },
  'POC 24.95K': {
    title: 'Point of Control Volume Node (24.95K)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'The exact single price level where the highest volume was transacted during the session. Represents undisputed fair value accepted by both buyers and sellers.',
    signal: 'Gravitational fair value anchor: mean reversion point of the current auction.',
    formulaOrRule: 'Max Volume Tick in Session Volume Profile Histogram',
  },
  'VAH 25.10K': {
    title: 'Value Area High Boundary (25.10K)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'The upper perimeter of the 70% value area distribution. Price trading above VAH indicates buyers are auctioning price into new higher territory.',
    signal: 'Auction expansion: accepted pricing above Value Area High signals markup.',
    formulaOrRule: 'Upper Limit of 70% First Standard Deviation Auction Volume',
  },
  'VAL 24.65K': {
    title: 'Value Area Low Boundary (24.65K)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'The bottom boundary containing 70% of transacted volume. When price drops below VAL and quickly re-enters, an auction failure / responsive buy setup forms.',
    signal: 'Responsive buyers defending wholesale boundary below value area.',
    formulaOrRule: 'Lower Limit of 70% First Standard Deviation Auction Volume',
  },
  'LVN VOID': {
    title: 'Low Volume Node Slippage Pocket',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'A price bracket where very little trading activity took place. Because minimal liquidity rests here, price accelerates rapidly through this zone with zero friction.',
    signal: 'Fast travel zone: price slices through void without resistance.',
    formulaOrRule: 'Volume Profile Troughs < 20% of Adjacent Volume Peaks',
  },
  'INITIAL BAL': {
    title: 'Initial Balance (First Hour) Extension',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'High-to-low range formed during the first 60 minutes of the trading day (IB). Extensions beyond 1.5x IB range signal a strong institutional trend day.',
    signal: 'Session range expansion: institutional participants extending auction limits.',
    formulaOrRule: 'Range = Max High(First 60m) - Min Low(First 60m)',
  },
  'AUCTION IMB': {
    title: 'Opening Cross Single-Sided Auction Imbalance',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'Unpaired share quantity heading into the opening or closing market cross auction, indicating directional institutional rebalancing requirements.',
    signal: 'Net buy imbalance on closing bell auction driving late-day bid surge.',
    formulaOrRule: 'Continuous Book + Paired Auction Imbalance Delta',
  },
  'SUPPORT 24.8K': {
    title: 'Macro High-Volume Support (24.8K)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'High-timeframe Point of Control (POC) and structural demand zone anchored at 24,800. Represents a heavy historical volume node where smart money defends inventory with resting limit buy bids.',
    signal: 'Critical floor: high concentration of resting limit buy bids.',
    formulaOrRule: 'Volume Profile Point of Control (POC) & Value Area Low',
  },
};

const tokenTypes = [
  // ── Row 1: Category 5 (MOMENTUM & TREND OSCILLATORS) ──
  { text: 'PRICE ACTION', color: 'token-chip-txt-white' },
  { text: 'RSI 64.2', color: 'token-chip-txt-cyan' },
  { text: 'EMA 21 CROSS', color: 'token-chip-txt-blue' },
  { text: 'MACD HIST', color: 'token-chip-txt-green' },
  { text: 'TREND +1.40%', color: 'token-chip-txt-green' },
  { text: 'SUPER TREND', color: 'token-chip-txt-green' },
  { text: 'ADX 38.4', color: 'token-chip-txt-cyan' },
  { text: 'STOCH RSI', color: 'token-chip-txt-blue' },

  // ── Row 2: Category 6 (QUANTITATIVE AI & STATISTICAL ARBITRAGE) ──
  { text: 'MOMENTUM AI', color: 'token-chip-txt-teal' },
  { text: 'SMT DIVERGE', color: 'token-chip-txt-purple' },
  { text: 'ARBITRAGE +42', color: 'token-chip-txt-green' },
  { text: 'DXY 104.2', color: 'token-chip-txt-amber' },
  { text: 'DARK POOL 1.8M', color: 'token-chip-txt-white' },
  { text: 'BULL PINBAR', color: 'token-chip-txt-teal' },
  { text: 'PREMIUM 78.6%', color: 'token-chip-txt-purple' },
  { text: 'ORDER RATIO 2.4', color: 'token-chip-txt-green' },

  // ── Row 3: Category 1 (ORDER FLOW & MICROSTRUCTURE) ──
  { text: 'BULL DELTA', color: 'token-chip-txt-green' },
  { text: 'VOLUME 3.4M', color: 'token-chip-txt-purple' },
  { text: 'TAPE AGGR 82%', color: 'token-chip-txt-cyan' },
  { text: 'ABSORPTION', color: 'token-chip-txt-white' },
  { text: 'ICEBERG BID', color: 'token-chip-txt-amber' },
  { text: 'DOM DEPTH L2', color: 'token-chip-txt-blue' },
  { text: 'DELTA CLUSTER', color: 'token-chip-txt-green' },
  { text: 'HFT SPREAD', color: 'token-chip-txt-cyan' },

  // ── Row 4: Category 2 (SMART MONEY CONCEPTS / SMC) ──
  { text: 'ORDER BLOCK', color: 'token-chip-txt-amber' },
  { text: 'FVG GAP ZONE', color: 'token-chip-txt-green' },
  { text: 'BOS BREAK', color: 'token-chip-txt-cyan' },
  { text: 'CHoCH PIVOT', color: 'token-chip-txt-blue' },
  { text: 'LIQ POOL HIGH', color: 'token-chip-txt-red' },
  { text: 'BEAR SWEEP', color: 'token-chip-txt-red' },
  { text: 'MITIGATION OB', color: 'token-chip-txt-amber' },
  { text: 'SWEEP HIGH', color: 'token-chip-txt-red' },

  // ── Row 5: Category 4 (DERIVATIVES & VOLATILITY GREEKS) ──
  { text: 'VIX 13.40', color: 'token-chip-txt-white' },
  { text: 'IV CRUSH 32%', color: 'token-chip-txt-red' },
  { text: 'GAMMA FLIP', color: 'token-chip-txt-cyan' },
  { text: 'DELTA NEUTRAL', color: 'token-chip-txt-blue' },
  { text: 'SKEW 138.2', color: 'token-chip-txt-purple' },
  { text: 'ATR 42.8', color: 'token-chip-txt-amber' },
  { text: 'PCR 0.74', color: 'token-chip-txt-teal' },
  { text: 'MAX PAIN 24.5K', color: 'token-chip-txt-red' },

  // ── Row 6: Category 3 (AUCTION MARKET THEORY & PROFILE) ──
  { text: 'VWAP ANCHOR', color: 'token-chip-txt-teal' },
  { text: 'POC 24.95K', color: 'token-chip-txt-amber' },
  { text: 'VAH 25.10K', color: 'token-chip-txt-green' },
  { text: 'VAL 24.65K', color: 'token-chip-txt-red' },
  { text: 'LVN VOID', color: 'token-chip-txt-purple' },
  { text: 'INITIAL BAL', color: 'token-chip-txt-blue' },
  { text: 'AUCTION IMB', color: 'token-chip-txt-teal' },
  { text: 'SUPPORT 24.8K', color: 'token-chip-txt-amber' },
];

interface ActiveTokenInfo {
  id: number;
  text: string;
  color: string;
  rect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
}

export default function WhySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [tokens, setTokens] = useState<any[]>([]);
  const [activeToken, setActiveToken] = useState<ActiveTokenInfo | null>(null);
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
      });
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setActiveToken(null);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const COLS = 8;
    const list = tokenTypes.map((type, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;

      // Vertical waterfall drop from top (up to down)
      const startY = -45 - row * 10;
      const startX = 0;

      // Staggered delay: Row 1 (Cat 5) lands first, down to Row 6 (Cat 3)
      const delay = row * 0.10 + col * 0.025;

      return {
        id: i,
        ...type,
        startX,
        startY,
        delay,
      };
    });
    setTokens(list);
  }, []);

  const handleTokenHover = useCallback((token: any, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveToken({
      id: token.id,
      text: token.text,
      color: token.color,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    });
  }, []);

  const handleTokenLeave = useCallback(() => {
    setActiveToken(null);
  }, []);

  const handleTokenClick = useCallback((token: any, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveToken((prev) =>
      prev?.id === token.id
        ? null
        : {
            id: token.id,
            text: token.text,
            color: token.color,
            rect: {
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
              width: rect.width,
              height: rect.height,
            },
          }
    );
  }, []);

  // Compute pop-up positioning
  const popoverWidth = Math.min(340, viewport.width - 32);
  const popoverLeft = activeToken
    ? Math.max(16, Math.min(viewport.width - popoverWidth - 16, activeToken.rect.left + activeToken.rect.width / 2 - popoverWidth / 2))
    : 16;
  const isAbove = activeToken ? activeToken.rect.top > 320 : true;

  const activeDetail = activeToken ? TOKEN_EXPLANATIONS[activeToken.text] : null;

  return (
    <section
      ref={containerRef}
      id="market-intelligence"
      className="relative min-h-screen bg-transparent z-10 py-28 flex flex-col items-center justify-center overflow-visible"
    >
      <div className="max-w-5xl mx-auto px-6 w-full text-center relative z-10 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border page-section-pill mb-3 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="mono text-[13px] tracking-[0.25em] uppercase font-black page-section-pill-text whitespace-nowrap">
            06 // MI-007 · MARKET INTELLIGENCE
          </span>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 page-heading"
        >
          Convergence Into a <span className="font-extrabold text-emerald-600">Singular Layer</span>
        </motion.h2>
        <p className="text-[17px] sm:text-[19px] font-medium max-w-xl mx-auto leading-relaxed page-subtitle mb-4">
          Where thousands of isolated micro-signals unite into one coherent, institutional-grade perspective.
        </p>

        {/* Interactive guidance tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-600 text-[11.5px] font-mono font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Hover or tap any market token below for institutional explanation</span>
        </div>
      </div>

      {/* Synchronized Token Cloud (Interactive Uniform Grid) */}
      <div className="relative w-full max-w-6xl mx-auto flex items-center justify-center px-4 sm:px-6 my-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3 w-full">
          {tokens.map((token) => {
            const isHovered = activeToken?.id === token.id;
            const isSameCategory = Boolean(
              activeToken &&
              TOKEN_EXPLANATIONS[activeToken.text]?.category === TOKEN_EXPLANATIONS[token.text]?.category
            );

            return (
              <motion.button
                key={token.id}
                type="button"
                initial={{ x: 0, y: token.startY, opacity: 0, scale: 0.88 }}
                animate={isInView ? { x: 0, y: 0, opacity: 1, scale: 1 } : {}}
                transition={{
                  duration: 0.55,
                  delay: token.delay,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onMouseEnter={(e) => handleTokenHover(token, e)}
                onMouseLeave={handleTokenLeave}
                onClick={(e) => handleTokenClick(token, e)}
                className={`w-full h-11 flex items-center justify-center px-1.5 sm:px-2.5 rounded-xl border why-token-chip text-[10.5px] sm:text-[11.5px] lg:text-[12px] font-mono font-bold tracking-tight whitespace-nowrap text-center shadow-xs transition-all cursor-pointer relative group select-none ${
                  isHovered
                    ? 'ring-2 ring-emerald-400 border-emerald-400 scale-[1.06] shadow-lg shadow-emerald-500/20 z-20'
                    : isSameCategory
                    ? 'border-emerald-400/80 bg-emerald-950/35 scale-[1.02] shadow-sm shadow-emerald-500/20 z-10 ring-1 ring-emerald-400/30'
                    : activeToken
                    ? 'opacity-35 transition-opacity'
                    : 'hover:scale-[1.03] hover:border-emerald-500/60 hover:shadow-md'
                }`}
              >
                <span className={token.color}>{token.text}</span>
                {/* Visual hint indicator dot */}
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500/60 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Global Interactive Floating Explanation Pop-up */}
      <AnimatePresence>
        {activeToken && activeDetail && (
          <div className="fixed inset-0 pointer-events-none z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: isAbove ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: `${popoverLeft}px`,
                ...(isAbove
                  ? { bottom: `${viewport.height - activeToken.rect.top + 10}px` }
                  : { top: `${activeToken.rect.bottom + 10}px` }),
                width: `${popoverWidth}px`,
              }}
              className="pointer-events-auto rounded-xl border border-emerald-500/50 bg-slate-950/95 text-white p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/20"
            >
              {/* Header row: category badge + live indicator */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold tracking-wider ${activeDetail.categoryColor}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeDetail.category}
                </span>
                <span className="text-[11px] font-mono font-extrabold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded">
                  {activeToken.text}
                </span>
              </div>

              {/* Title */}
              <h4 className="text-[15px] font-black text-white tracking-tight leading-snug">
                {activeDetail.title}
              </h4>

              {/* Detailed Description */}
              <p className="text-[12px] text-slate-300 leading-relaxed font-sans mt-1.5">
                {activeDetail.description}
              </p>

              {/* Signal telemetry box */}
              <div className="mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  Telemetry Signal / Bias
                </div>
                <p className="text-[11.5px] font-medium text-slate-200 mt-1 leading-snug">
                  {activeDetail.signal}
                </p>
              </div>

              {/* Rule / Formula footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10.5px] font-mono text-slate-400 gap-2">
                <span className="text-slate-500 uppercase tracking-wider text-[9.5px] flex-shrink-0">
                  Rule / Engine:
                </span>
                <span className="text-slate-300 font-semibold truncate text-right">
                  {activeDetail.formulaOrRule}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Atmospheric Conclusion */}
      <div className="max-w-2xl mx-auto px-6 w-full text-center mt-12 relative z-10">
        <div className="text-3xl sm:text-4xl md:text-5xl font-light page-heading flex flex-col gap-2">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            One market.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="font-semibold"
          >
            Multiple dimensions.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-500"
          >
            One living intelligence system.
          </motion.div>
        </div>
      </div>
    </section>
  );
}
