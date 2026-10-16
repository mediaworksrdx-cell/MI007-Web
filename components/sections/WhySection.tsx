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
    title: 'Price Action Geometry & Structural Auction',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Raw continuous double-auction mechanics analyzing candlestick spread, wick rejections, and swing pivot topology without lagging smoothing filters. Directly maps real-time aggression where market orders aggressively absorb passive resting limit orders at structural swing highs and lows.',
    signal: 'Bullish wick rejection confirming liquidity defense and passive absorption at the lower structural swing pivot.',
    formulaOrRule: 'Liquidity Defense Rule: (Low - Close) / (High - Low) > 0.65 ∧ Volume > 1.35 × MA(Volume, 20)',
  },
  'RSI 64.2': {
    title: 'Relative Strength Index (RSI 14-Period Momentum)',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Wilder normalized momentum oscillator tracking the velocity and magnitude of directional price gains relative to losses on a 0–100 scale. At 64.2, price velocity is accelerating within the institutional markup corridor (55–68), indicating strong momentum before the extreme overbought exhaustion threshold (75+).',
    signal: 'Bullish momentum expansion holding firmly above the 50 neutral centerline with positive slope.',
    formulaOrRule: 'RSI = 100 - [100 / (1 + (Smoothed Gain / Smoothed Loss))] · Lookback: 14 Periods',
  },
  'EMA 21 CROSS': {
    title: '21-Period Exponential Moving Average Dynamic Equilibrium',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'High-conviction intermediate trend filter weighting recent price ticks exponentially. When price or fast moving averages cross and sustain above the 21 EMA, it confirms multi-session order flow has overpowered baseline institutional distribution.',
    signal: 'Confirmed bullish continuation vector; dynamic EMA 21 acting as trailing institutional support.',
    formulaOrRule: 'EMA(t) = Price(t) × [2 / (21 + 1)] + EMA(t-1) × [1 - (2 / (21 + 1))]',
  },
  'MACD HIST': {
    title: 'MACD Histogram Momentum Delta',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Measures the differential velocity between the 12-period fast EMA and 26-period slow EMA against their 9-period signal line. Expanding histogram bars confirm accelerating secondary momentum and the inflow of algorithmic trend-following capital.',
    signal: 'Expanding positive momentum delta accelerating through the zero-line threshold.',
    formulaOrRule: 'Histogram = [EMA(12) - EMA(26)] - EMA(9, [EMA(12) - EMA(26)])',
  },
  'TREND +1.40%': {
    title: 'Intraday Trend Expansion Velocity (+1.40%)',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Quantifies cumulative session directional expansion relative to daily opening price and implied volatility bandwidth. A steady +1.40% gain accompanied by compressed tick variance signals continuous institutional accumulation rather than speculative squeeze spikes.',
    signal: 'Dominant upside trend regime established above Volume-Weighted Average Price (VWAP).',
    formulaOrRule: 'Session Drift = [(Price_current - Price_open) / Price_open] × 100 ∧ Price > Session VWAP',
  },
  'SUPER TREND': {
    title: 'ATR-Volatility Smoothed Directional Regime',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Hybrid trend-following indicator combining median candlestick equilibrium with Average True Range (ATR) multipliers. Functions as a volatility-adjusted trailing stop-loss that filters market noise during high-volatility chop.',
    signal: 'Bullish regime active; trailing volatility band locked below current price action.',
    formulaOrRule: 'Lower Band = (High + Low) / 2 - [Multiplier (3.0) × ATR(10)]; Trigger: Close > Lower Band',
  },
  'ADX 38.4': {
    title: 'Average Directional Index (ADX Trend Conviction)',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Welles Wilder directional movement index quantifying pure trend strength regardless of direction. An ADX reading of 38.4 indicates an exceptionally powerful trending regime (>25 signifies strong trend; >35 denotes high-conviction institutional momentum).',
    signal: 'High-conviction directional trend active; mean-reversion strategies disabled by engine.',
    formulaOrRule: 'ADX = 100 × Smoothed MA of [|+DI - -DI| / (+DI + -DI)] over 14 Periods',
  },
  'STOCH RSI': {
    title: 'Stochastic Relative Strength Cycle Oscillator',
    category: 'MOMENTUM & TREND',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'High-sensitivity 2nd-derivative momentum indicator calculating the Stochastic oscillator of RSI values. Eliminates RSI lag to pinpoint cycle turning points, exhaustion extremes, and swift momentum reversals.',
    signal: 'Bullish cycle cross emerging from oversold compression band below 20.',
    formulaOrRule: 'StochRSI = [RSI(14) - LowestLow(RSI, 14)] / [HighestHigh(RSI, 14) - LowestLow(RSI, 14)]',
  },

  // ── Category 6: QUANTITATIVE AI & ARBITRAGE (Row 2) ──
  'MOMENTUM AI': {
    title: 'Proprietary Quantitative Neural Momentum Score',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Deep neural tensor processing 40+ sub-second features including tape velocity, order book shape, gamma exposure, and cross-asset beta. Outputs a real-time probabilistic conviction index for multi-timeframe directional price delivery.',
    signal: 'High-confidence bullish vector: 94.2% institutional conviction score.',
    formulaOrRule: 'Tensor Output: Probability(Upmove_30m > 1.2σ) > 0.85 across 40+ L2/L3 Inputs',
  },
  'SMT DIVERGE': {
    title: 'Smart Money Divergence (Inter-Market SMT)',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Inter-market relative strength anomaly detected between highly correlated assets (e.g., NIFTY vs BANK NIFTY, or ES vs NQ). When one index breaks a structural high while the twin index fails to confirm, institutional manipulation and impending reversal are signalled.',
    signal: 'Bearish smart-money cracking: reference benchmark failing to make higher high.',
    formulaOrRule: 'SMT = (Asset_A.High > SwingHigh_A) ∧ (Asset_B.High ≤ SwingHigh_B) at Key HTF Level',
  },
  'ARBITRAGE +42': {
    title: 'Cash-and-Carry Synthetic Futures Basis Spread',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Measures the basis premium between the underlying cash index and its near-month futures contract. A +42 bps spread reveals mispriced cost-of-carry yielding risk-free annualized return for algorithmic arbitrage desks.',
    signal: 'Cash-and-carry basis arbitrage window open for sub-millisecond execution.',
    formulaOrRule: 'Basis Spread = [(Futures Price - Cash Index Price) / Cash Index Price] × 10,000 bps',
  },
  'DXY 104.2': {
    title: 'US Dollar Index (DXY) Global Macro Liquidity Vector',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Geometric trade-weighted index of the US Dollar against six world reserve currencies (EUR, JPY, GBP, CAD, SEK, CHF). A softening or plateauing DXY relieves global financial conditions, triggering capital allocation into equities and emerging markets.',
    signal: 'Dollar resistance plateau: risk-on liquidity tailwind for domestic and global equities.',
    formulaOrRule: 'DXY = 50.14348112 × EURUSD^-0.576 × USDJPY^0.136 × GBPUSD^-0.119 × USDCAD^0.091',
  },
  'DARK POOL 1.8M': {
    title: 'Alternative Trading System (ATS) Off-Exchange Block Prints',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Captures non-displayed institutional block orders executed in dark venues and reported to FINRA/TRF or institutional block reporting facilities. A 1.8M block at the offer confirms heavy institutional position building without moving retail public quotes.',
    signal: 'Institutional accumulation: wholesale block transaction cleared at key benchmark.',
    formulaOrRule: 'Volume_ATS ≥ 50,000 shares ∧ Execution_Price ≈ Inside Spread Benchmark',
  },
  'BULL PINBAR': {
    title: 'High-Timeframe Liquidity Rejection Pinbar',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Single-bar price rejection structure where a lower wick is at least 2.5x the height of the real candle body. Indicates that aggressive market sellers pushed price below support but were instantly overwhelmed by massive passive institutional bids.',
    signal: 'Bear trap triggered; aggressive short sellers trapped at the lows and forced to cover.',
    formulaOrRule: 'LowerWick ≥ 2.5 × RealBody ∧ UpperWick ≤ 0.2 × RealBody ∧ Close in Upper 25%',
  },
  'PREMIUM 78.6%': {
    title: 'Fibonacci Optimal Trade Entry (OTE 78.6% Retracement)',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'High-probability equilibrium retracement zone between the 61.8% golden ratio and 78.6% boundary of the dealing range. Smart money algorithms systematically enter continuation positions in this discount/premium tier to optimize risk-to-reward.',
    signal: 'Optimal Trade Entry reached; deep discount mitigation completed inside macro range.',
    formulaOrRule: 'OTE Level = SwingLow + 0.786 × (SwingHigh - SwingLow); Validation: Volume Reversal',
  },
  'ORDER RATIO 2.4': {
    title: 'Order Book Limit Bid/Ask Depth Imbalance Ratio',
    category: 'QUANTITATIVE AI & ARBITRAGE',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Evaluates the cumulative depth of limit buy orders versus limit sell orders within a ±1.5% band of the current mid-market price. A ratio of 2.4 indicates buyers have stacked 140% more resting liquidity than sellers.',
    signal: 'Heavy limit bid cushion; passive institutional support absorbing market sell orders.',
    formulaOrRule: 'Book Ratio = [∑ Resting Bids (±1.5% Mid)] / [∑ Resting Asks (±1.5% Mid)] = 2.40',
  },

  // ── Category 1: ORDER FLOW & MICROSTRUCTURE (Row 3) ──
  'BULL DELTA': {
    title: 'Cumulative Volume Delta (CVD Buyer Dominance)',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Real-time tick-by-tick subtraction of aggressive market sell volume (hitting bids) from aggressive market buy volume (lifting offers). Sustained Bull Delta proves institutional participants are using aggressive market orders to sweep liquidity.',
    signal: 'Aggressive buyer market dominance; continuous positive delta expansion.',
    formulaOrRule: 'CVD(t) = CVD(t-1) + (Volume_TradeAtAsk - Volume_TradeAtBid); Slope > 0',
  },
  'VOLUME 3.4M': {
    title: 'Aggregated Continuous Tape Volume (3.4M Units)',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Consolidated multi-venue transaction volume representing 3.4 million executed contracts/shares. High volume at structural breakout levels confirms real institutional sponsorship and prevents false retail breakouts.',
    signal: 'High institutional turnover: 184% above rolling 20-session baseline volume.',
    formulaOrRule: 'Session Volume > 1.8 × EMA(Volume, 20) ∧ Price Change > 1.2 × Daily ATR',
  },
  'TAPE AGGR 82%': {
    title: 'High-Frequency Time & Sales Taker Aggression Ratio',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Percentage of total market transactions filled at the ask price over a rolling 60-second window. An 82% aggression reading reflects extreme buyer urgency, as traders refuse to wait for limit fills and willingly pay the spread.',
    signal: 'Extreme buyer aggression; market participants aggressively sweeping book depth.',
    formulaOrRule: 'Taker Aggression = (Executed Volume at Ask) / (Total Taker Volume) × 100 = 82%',
  },
  'ABSORPTION': {
    title: 'Passive Limit Order Block Absorption',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Occurs when massive aggressive market orders hit the bid or ask, but price refuses to move because an iceberg or institutional limit block absorbs all liquidity. Creates a high-volume node with near-zero price progression.',
    signal: 'Bullish limit absorption: aggressive sellers exhausted into stationary bids.',
    formulaOrRule: 'High Taker Sell Volume (Top 5%) ∧ ΔPrice ≤ 1 Tick ∧ Subsequent Reversal Bar',
  },
  'ICEBERG BID': {
    title: 'Synthetic Algorithmic Iceberg Order Detection',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Proprietary execution algorithm splitting a multi-million share institutional buy order into small visible clips (e.g., 500 shares). As soon as the visible tranche is filled, the algorithm instantly reloads from hidden reserve inventory.',
    signal: 'Stealth institutional accumulation; automated replenishment of resting bids.',
    formulaOrRule: 'Executed Bid Volume > 10 × Displayed L2 Depth at Price P without Level Depletion',
  },
  'DOM DEPTH L2': {
    title: 'Level-2 Depth of Market Multitier Imbalance',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Real-time multi-tier aggregation of the full limit order book across the top 20 bid and ask price steps. Detects structural asymmetry, spoofing cancellations, and institutional liquidity walls before trade execution.',
    signal: '3.1x heavier limit liquidity on bid side preventing downside execution slippage.',
    formulaOrRule: 'Depth Imbalance = [∑ Bids(Tiers 1..20)] / [∑ Asks(Tiers 1..20)] > 2.0',
  },
  'DELTA CLUSTER': {
    title: 'Footprint Chart Delta Density Concentration',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Localized concentration of extreme positive or negative delta at a specific price node within a footprint bar. Identifies where institutional market participants fought and either formed an explosive breakout base or trapped participants.',
    signal: 'Trapped short sellers: massive aggressive sells absorbed at bottom of candle.',
    formulaOrRule: 'Node Delta ≥ 3.0σ Above Session Mean Node Delta at Structural Support Price',
  },
  'HFT SPREAD': {
    title: 'Colocated Sub-Millisecond Bid-Ask Spread',
    category: 'ORDER FLOW & MICROSTRUCTURE',
    categoryColor: 'text-teal-200 border-teal-500/60 bg-teal-950/80',
    description: 'Micro-tick spread maintained by market-making algorithms operating via direct optical exchange cross-connects. Ultra-tight spreads signify deep liquidity and allow large institutional orders to enter with minimal market impact.',
    signal: 'Maximum execution efficiency: minimum tick friction and zero liquidity gap risk.',
    formulaOrRule: 'Spread = BestAsk - BestBid = 1 Minimum Price Increment (Tick Size)',
  },

  // ── Category 2: SMART MONEY CONCEPTS (SMC) (Row 4) ──
  'ORDER BLOCK': {
    title: 'Institutional Supply & Demand Order Block (OB)',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'The final counter-trend candlestick immediately prior to a violent institutional breakout impulse. Marks the exact price zone where bank algorithms accumulated positions and where unmitigated resting limit orders remain.',
    signal: 'Prime mitigation target; high probability of aggressive demand upon first retest.',
    formulaOrRule: 'Bullish OB: Last Down-Candle before Bullish Break of Structure (BOS) + Fair Value Gap',
  },
  'FVG GAP ZONE': {
    title: 'Fair Value Gap (3-Bar Algorithmic Imbalance)',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'A 3-candlestick structural void where rapid one-sided institutional buying left an imbalance between Candle 1 high and Candle 3 low. Market-making algorithms treat this price inefficiency as a magnetic target to fill before continuing the trend.',
    signal: 'Liquidity vacuum magnet: price rebalancing into imbalance before trend resumption.',
    formulaOrRule: 'Bullish FVG = Candle 3 Low > Candle 1 High; Imbalance Zone = [High(1), Low(3)]',
  },
  'BOS BREAK': {
    title: 'Break of Structure (Trend Continuation BOS)',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'A definitive candlestick body close beyond a previous major swing high or swing low in the direction of the macro trend. Proves that institutional capital is continuing to mark prices up and establish higher structural highs.',
    signal: 'Bullish trend continuation validated; structural high conquered and flipped to support.',
    formulaOrRule: 'Candle Body Close(t) > Highest High(Swing Period N) in Direction of Trend',
  },
  'CHoCH PIVOT': {
    title: 'Change of Character (Structural Market Shift CHoCH)',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'The first structural failure where price breaks the most recent counter-trend swing point. Signals that the prevailing trend is losing momentum and that smart money is transitioning inventory from distribution into accumulation (or vice-versa).',
    signal: 'Early macro trend reversal warning: prior trend order flow officially broken.',
    formulaOrRule: 'Close(t) < Lowest Swing Low of Previous Bullish Leg (First Counter-Trend Violation)',
  },
  'LIQ POOL HIGH': {
    title: 'Buy-Side Liquidity Pool Target (Equal Highs)',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'A dense cluster of stop-loss orders and breakout buy stops resting just above equal highs or prominent swing peaks. Institutional algorithms systematically drive price into these pools to trigger liquidity for wholesale order execution.',
    signal: 'Liquidity magnet: price drawn upward toward resting buy stops above the range.',
    formulaOrRule: '|SwingHigh(1) - SwingHigh(2)| ≤ 0.05% × Price (Engine Target = High + 0.15%)',
  },
  'BEAR SWEEP': {
    title: 'Liquidity Bear Sweep & Stop Run Reclaim',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'A manipulation move where price spikes beneath a known support level or equal lows to harvest retail sell stops, followed by an immediate aggressive reclaim back inside the range. Traps breakdown traders into bad short positions.',
    signal: 'Short squeeze triggered: liquidity captured at the lows and promptly reclaimed.',
    formulaOrRule: 'Low(t) < Structural Support Low ∧ Close(t) > Structural Support Low (Wick Only)',
  },
  'MITIGATION OB': {
    title: 'Breaker Block & Order Block 50% Mean Threshold',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'The precise mathematical retest of the median price (50% mean threshold) of an originating institutional order block. Allows institutional algorithms to balance legacy inventory before initiating the next impulsive expansion wave.',
    signal: 'Institutional mitigation completed: high-probability entry for trend continuation.',
    formulaOrRule: 'Mitigation Point = OrderBlock.Low + 0.50 × (OrderBlock.High - OrderBlock.Low)',
  },
  'SWEEP HIGH': {
    title: 'Prior Session High Liquidity Sweep',
    category: 'SMART MONEY CONCEPTS (SMC)',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'Algorithmic thrust above the Previous Day High (PDH) or Previous Session High (PSH) to trigger breakout buy stops. If price fails to hold above the level and closes back beneath it, a high-probability false breakout distribution occurs.',
    signal: 'Liquidity harvested: retail breakout buyers trapped above previous session high.',
    formulaOrRule: 'High(t) > PriorDayHigh ∧ Close(t) < PriorDayHigh ∧ Delta Reversal Triggered',
  },

  // ── Category 4: DERIVATIVES & VOLATILITY (Row 5) ──
  'VIX 13.40': {
    title: 'CBOE Volatility Index (SPX 30-Day Forward Implied Volatility)',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Market-wide gauge of 30-day expected equity volatility derived from real-time S&P 500 out-of-the-money index options. A subdued reading of 13.40 reflects complacency, low tail-risk hedging demand, and a stable environment for systematic momentum and carry strategies.',
    signal: 'Low-volatility regime active; favorable conditions for trend following and long delta.',
    formulaOrRule: 'VIX = 100 × √[ (2 / T) × ∑ (ΔK_i / K_i^2) × e^(RT) × Q(K_i) - (1 / T) × (F / K_0 - 1)^2 ]',
  },
  'IV CRUSH 32%': {
    title: 'Post-Earnings / Macro Catalyst Volatility Contraction',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Rapid collapse in option implied volatility immediately after a high-impact catalyst (earnings, CPI, central bank rate decision) passes. The elimination of event uncertainty deflates the extrinsic value of all option strikes, penalizing option buyers.',
    signal: 'Volatility implosion: premium decay favors short option sellers and structural spreads.',
    formulaOrRule: 'ΔIV = [(IV_post - IV_pre) / IV_pre] × 100 = -32.0%; Extrinsic Decay Realized',
  },
  'GAMMA FLIP': {
    title: 'Options Market Maker Gamma Neutral Boundary',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'The exact index price where total dealer option gamma exposure flips from positive to negative. In positive gamma, market makers trade against the trend (stabilizing price); in negative gamma, market makers must chase trends by buying highs and selling lows (amplifying volatility).',
    signal: 'Above flip level: dealer hedging stabilizes market and dampens intraday volatility.',
    formulaOrRule: 'Net GEX = ∑ [OI × Gamma × Spot × 100 × (Call +1, Put -1)]; Flip Level: Net GEX = 0',
  },
  'DELTA NEUTRAL': {
    title: 'Dynamic Black-Scholes Delta-Neutral Hedging State',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Portfolio positioning where the net first-order directional sensitivity (delta) of an option book is dynamically balanced to zero by holding offsetting positions in the underlying equity or futures contract.',
    signal: 'Systematic dealer rebalancing flow anchoring price near maximum open interest strikes.',
    formulaOrRule: 'Portfolio Delta = ∑ (Option_Contracts × Delta_i × 100) + Shares_Underlying = 0',
  },
  'SKEW 138.2': {
    title: 'CBOE SKEW Index (Out-of-the-Money Tail Risk Pricing)',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Ratio measuring the relative implied volatility pricing of deep out-of-the-money put options versus at-the-money calls. A reading of 138.2 indicates that institutional asset managers are paying heavy volatility premiums for black-swan downside insurance.',
    signal: 'Elevated tail-risk hedging: institutional funds purchasing defensive downside puts.',
    formulaOrRule: 'SKEW = 100 - 10 × S_3 (Third Standardized Moment of SPX 30-Day Log-Returns)',
  },
  'ATR 42.8': {
    title: 'Average True Range Normalized Volatility (14 Periods)',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Exponential moving average of the greatest of: current high minus current low, absolute value of high minus previous close, or absolute value of low minus previous close. An ATR of 42.8 provides the baseline distance for dynamic stop-loss sizing.',
    signal: 'Volatility range calibrated; optimal stop-loss parameter set at 1.5x to 2.0x ATR.',
    formulaOrRule: 'ATR(14) = [ATR(t-1) × 13 + TrueRange(t)] / 14; TrueRange = max(H-L, |H-Cp|, |L-Cp|)',
  },
  'PCR 0.74': {
    title: 'Options Put/Call Open Interest & Volume Ratio',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Ratio of aggregate put option trading volume to call option trading volume across all exchange strikes. A ratio of 0.74 signals that call buying exceeds put buying by 35%, reflecting bullish institutional speculation and lower defensive put positioning.',
    signal: 'Bullish sentiment posture: call buying activity dominant across speculative strikes.',
    formulaOrRule: 'PCR = (Total Put Volume or Open Interest) / (Total Call Volume or Open Interest) = 0.74',
  },
  'MAX PAIN 24.5K': {
    title: 'Options Expiration Strike Max Pain Equilibrium',
    category: 'DERIVATIVES & VOLATILITY',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'The precise underlying price strike at which the aggregate cash payout of all expiring call and put options is minimized. As expiration approaches, dealer delta hedging and option selling desks exert gravitational pull toward this strike.',
    signal: 'Expiration gravitational anchor: market makers incentivize price settlement toward 24,500.',
    formulaOrRule: 'Max Pain = ArgMin_K { ∑ [Puts_OI × max(0, K - Strike)] + ∑ [Calls_OI × max(0, Strike - K)] }',
  },

  // ── Category 3: AUCTION THEORY & PROFILE (Row 6) ──
  'VWAP ANCHOR': {
    title: 'Event-Anchored Volume-Weighted Average Price (AVWAP)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'Cumulative volume-weighted execution benchmark anchored to a specific milestone (session open, earnings release, or major swing pivot). Represents the true average price paid per share by institutional execution algorithms.',
    signal: 'Dynamic institutional value anchor; price holding above AVWAP signals buyer control.',
    formulaOrRule: 'Anchored VWAP = [ ∑_{i=Anchor}^{t} (TypicalPrice_i × Volume_i) ] / [ ∑_{i=Anchor}^{t} Volume_i ]',
  },
  'POC 24.95K': {
    title: 'Point of Control (POC Volume Distribution Node)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'The exact single price tick where the largest volume of contracts or shares was transacted during the session. Serves as the undisputed fair value consensus accepted by both aggressive buyers and sellers.',
    signal: 'Gravitational fair value center; prime mean-reversion target for extended auction rotations.',
    formulaOrRule: 'POC = Price Tick P where VolumeProfile(P) = max(VolumeProfile_Session)',
  },
  'VAH 25.10K': {
    title: 'Value Area High Boundary (VAH Upper 70% Cutoff)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'The upper boundary containing approximately 70% of the normal distribution of session volume (one standard deviation). When price breaks above VAH and establishes acceptance (volume prints), an auction expansion into higher prices begins.',
    signal: 'Auction expansion mode: buyers accepted above VAH, driving price markup.',
    formulaOrRule: 'VAH = Price level bounding the upper 70% cumulative volume integral around the POC',
  },
  'VAL 24.65K': {
    title: 'Value Area Low Boundary (VAL Lower 70% Cutoff)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'The bottom boundary containing 70% of transacted volume. When price dips below VAL and quickly rotates back inside, responsive institutional buyers are stepping in to defend wholesale prices.',
    signal: 'Responsive buying activated: wholesale discount defended below Value Area Low.',
    formulaOrRule: 'VAL = Price level bounding the lower 70% cumulative volume integral around the POC',
  },
  'LVN VOID': {
    title: 'Low Volume Node Slippage Pocket (LVN)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'A price bracket where very little volume was transacted due to swift directional movement. Because virtually no resting limit liquidity exists in this void, price travels through it with near-zero friction and elevated slippage.',
    signal: 'Low-friction zone: price will slice rapidly through the void to reach the next volume node.',
    formulaOrRule: 'LVN = Price Range where VolumeProfile(P) < 0.20 × Neighboring High Volume Nodes',
  },
  'INITIAL BAL': {
    title: 'Market Profile Initial Balance (IB 60-Minute Range)',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'The price range established during the first 60 minutes of regular market hours. Range extensions exceeding 1.5x the Initial Balance signal that other-timeframe (institutional) participants have entered, creating a trend day.',
    signal: 'Range extension confirmed: institutional participants expanding auction boundaries.',
    formulaOrRule: 'IB Range = Max(High, 09:15-10:15) - Min(Low, 09:15-10:15); Extension Trigger: Price > IB_High',
  },
  'AUCTION IMB': {
    title: 'Continuous Book & Cross Auction Single-Sided Imbalance',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'Unpaired share volume accumulating heading into the opening or closing market cross auction. Large net buy or sell imbalances compel market makers to adjust pairing prices, generating powerful late-session price drifts.',
    signal: 'Net buy cross imbalance: institutional closing orders driving end-of-day bid surge.',
    formulaOrRule: 'Cross Imbalance = Eligible Buy Shares - Eligible Sell Shares at Current Reference Price',
  },
  'SUPPORT 24.8K': {
    title: 'Macro High-Volume Node (HVN) Structural Support',
    category: 'AUCTION THEORY & PROFILE',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'High-timeframe composite Volume Profile node anchored at 24,800. Represents a historical liquidity shelf where institutional algorithms have resting limit orders waiting to absorb downside inventory.',
    signal: 'Critical demand floor: dense concentration of resting institutional buy orders.',
    formulaOrRule: 'Structural Support = Composite Volume Profile HVN Node + 20-Day Swing Pivot Low',
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
  const popoverWidth = Math.min(420, viewport.width - 24);
  const popoverLeft = activeToken
    ? Math.max(12, Math.min(viewport.width - popoverWidth - 12, activeToken.rect.left + activeToken.rect.width / 2 - popoverWidth / 2))
    : 12;
  const isAbove = activeToken ? activeToken.rect.top > 340 : true;

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
            06 // MARKET INTELLIGENCE MI-007
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

              {/* Rule footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/90 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Rule:</span>
                </div>
                <div className="text-[11px] font-mono font-semibold text-emerald-300/90 bg-slate-900/95 border border-slate-800/90 rounded-lg px-2.5 py-1.5 leading-relaxed break-words whitespace-normal shadow-inner">
                  {activeDetail.formulaOrRule}
                </div>
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
