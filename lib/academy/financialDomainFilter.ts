// ─── Financial Domain Filter & Aarka AI Domain Intelligence Engine ─────────
// Specializes across: Finance, Technicals, Fundamentals, Stock Market, Forex, Commodities, Crypto

export type FinancialDomain =
  | 'FINANCE'
  | 'TECHNICALS'
  | 'FUNDAMENTALS'
  | 'STOCK_MARKET'
  | 'FOREX'
  | 'COMMODITIES'
  | 'CRYPTO'
  | 'GENERAL_FINANCE';

export const DOMAIN_KEYWORDS: Record<FinancialDomain, string[]> = {
  FINANCE: [
    'finance', 'financial', 'risk', 'risk management', 'capital', 'allocation', 'position size',
    'position sizing', 'drawdown', 'sharpe', 'sortino', 'portfolio', 'diversification',
    'compounding', 'cagr', 'sip', 'mutual fund', 'etf', 'inflation', 'interest rate',
    'yield curve', 'repo rate', 'rbi', 'fed', 'monetary policy', 'quantitative easing',
    'fomo', 'revenge trading', 'psychology', 'bias', 'loss aversion', 'discipline',
    'wealth', 'emergency fund', 'asset allocation', 'debt fund', 'fixed deposit'
  ],
  TECHNICALS: [
    'technical', 'technicals', 'chart', 'charts', 'candlestick', 'candle', 'pattern',
    'support', 'resistance', 'trend', 'trendline', 'breakout', 'breakdown', 'smc',
    'smart money', 'order block', 'orderblock', 'ob', 'fvg', 'fair value gap',
    'imbalance', 'liquidity', 'liquidity sweep', 'liquidity pool', 'bssl', 'sssl',
    'bos', 'break of structure', 'choch', 'change of character', 'premium', 'discount',
    'fibonacci', 'fib', 'ote', 'optimal trade entry', 'invalidation', 'rsi', 'macd',
    'ema', 'sma', 'moving average', 'bollinger', 'bollinger bands', 'vwap', 'volume profile',
    'poc', 'point of control', 'value area', 'divergence', 'price action', 'rejection wick'
  ],
  FUNDAMENTALS: [
    'fundamental', 'fundamentals', 'valuation', 'pe', 'pe ratio', 'p/e', 'pb', 'pb ratio',
    'p/b', 'ev/ebitda', 'peg', 'eps', 'roe', 'roce', 'roic', 'return on equity',
    'return on capital', 'book value', 'market cap', 'market capitalization',
    'free cash flow', 'fcf', 'cash flow', 'operating cash flow', 'ebitda', 'ebit',
    'operating margin', 'net margin', 'debt to equity', 'debt/equity', 'solvency',
    'current ratio', 'interest coverage', 'dividend', 'dividend yield', 'payout ratio',
    'balance sheet', 'income statement', 'annual report', 'results', 'quarterly',
    'quarter', 'q1', 'q2', 'q3', 'q4', 'revenue', 'net profit', 'pat', 'pbt', 'capex',
    'working capital', 'moat', 'economic moat', 'promoter holding', 'fii holding', 'dii holding'
  ],
  STOCK_MARKET: [
    'stock', 'stocks', 'share', 'shares', 'equity', 'equities', 'nifty', 'nifty 50',
    'sensex', 'banknifty', 'finnifty', 'midcap', 'bse', 'nse', 'nyse', 'nasdaq', 'spx',
    's&p 500', 'dow', 'russell', 'reliance', 'ril', 'hdfc', 'hdfcbank', 'icici',
    'icicibank', 'tcs', 'infy', 'infosys', 'sbi', 'sbin', 'tata motors', 'tatamotors',
    'tata steel', 'airtel', 'bhartiartl', 'itc', 'l&t', 'apple', 'aapl', 'microsoft',
    'msft', 'nvidia', 'nvda', 'tesla', 'tsla', 'amazon', 'amzn', 'google', 'googl',
    'meta', 'fno', 'futures', 'options', 'option', 'option chain', 'strike', 'expiry',
    'call', 'put', 'pcr', 'put call ratio', 'max pain', 'open interest', 'oi',
    'greeks', 'delta', 'gamma', 'theta', 'vega', 'iv', 'implied volatility',
    'long buildup', 'short buildup', 'short covering', 'long unwinding'
  ],
  FOREX: [
    'forex', 'fx', 'currency', 'currencies', 'eurusd', 'eur/usd', 'gbpusd', 'gbp/usd',
    'usdjpy', 'usd/jpy', 'usdinr', 'usd/inr', 'usdcad', 'usd/cad', 'audusd', 'aud/usd',
    'dxy', 'dollar index', 'us dollar', 'euro', 'pound', 'yen', 'pip', 'pips', 'spread',
    'carry trade', 'central bank', 'ecb', 'bank of england', 'boj', 'forex session',
    'london open', 'new york session', 'fx swap', 'exchange rate'
  ],
  COMMODITIES: [
    'commodity', 'commodities', 'gold', 'xau', 'xauusd', 'silver', 'xag', 'xagusd',
    'crude', 'crude oil', 'oil', 'brent', 'wti', 'natural gas', 'copper', 'platinum',
    'opec', 'opec+', 'bullion', 'precious metal', 'industrial metal', 'energy',
    'inventory report', 'eia', 'barrel', 'gold silver ratio'
  ],
  CRYPTO: [
    'crypto', 'cryptocurrency', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol',
    'altcoin', 'altcoins', 'blockchain', 'halving', 'hashrate', 'on-chain', 'onchain',
    'wallet', 'exchange reserve', 'mvrv', 'realized price', 'btc.d', 'bitcoin dominance',
    'defi', 'staking', 'proof of stake', 'proof of work', 'liquidity pool', 'amm',
    'tokenomics', 'smart contract', 'stablecoin', 'usdt', 'usdc'
  ],
  GENERAL_FINANCE: [
    'trade', 'trading', 'trader', 'traders', 'invest', 'investing', 'investor', 'investors',
    'market', 'markets', 'broker', 'demat', 'order', 'execution'
  ]
};

// Flatten all keywords into a single lookup set for domain gatekeeper
export const ALL_FINANCIAL_KEYWORDS: string[] = Object.values(DOMAIN_KEYWORDS).flat();

export const REDIRECTION_MESSAGE =
  'I am **Aarka AI Mentor**, specialized strictly in financial intelligence across **Finance**, **Technical Analysis**, **Fundamental Valuation**, **Stock Markets**, **Forex**, **Commodities**, and **Crypto**.\n\nPlease submit an inquiry concerning trade execution, market analysis, asset valuation, macroeconomics, or quantitative risk discipline.';

export function detectDomains(query: string): FinancialDomain[] {
  const lower = query.toLowerCase();
  const matchedDomains: FinancialDomain[] = [];

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (domain === 'GENERAL_FINANCE') continue;
    const hasMatch = keywords.some(k => {
      if (k.includes(' ') || k.includes('/')) {
        return lower.includes(k);
      }
      const regex = new RegExp(`\\b${k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      return regex.test(lower);
    });
    if (hasMatch) {
      matchedDomains.push(domain as FinancialDomain);
    }
  }

  return matchedDomains;
}

export function isFinancialQuery(query: string): boolean {
  const lower = query.toLowerCase().trim();
  if (!lower) return false;

  // Single ticker or currency check (e.g., RELIANCE, NIFTY, BTC, XAU, EURUSD, AAPL, PE, FVG)
  const words = lower.split(/\s+/);
  if (words.length <= 2 && lower.length >= 2 && lower.length <= 15 && words.every(w => /^[a-z0-9./-]+$/.test(w))) {
    return true;
  }

  // Check any domain match
  return ALL_FINANCIAL_KEYWORDS.some(keyword => {
    if (keyword.includes(' ') || keyword.includes('/')) {
      return lower.includes(keyword);
    }
    const regex = new RegExp(`\\b${keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(lower);
  });
}

// ─── Domain-Specific Intelligence Generators ────────────────────────────────

function generateFinanceAnalysis(query: string, spotText: string): string {
  const lower = query.toLowerCase();

  if (lower.includes('risk') || lower.includes('position size') || lower.includes('drawdown') || lower.includes('1%')) {
    return `### Quantitative Risk Discipline & Position Sizing Framework

**1. The 1.0% Fixed Fractional Allocation Rule**
Institutional capital protection mandates that no single trade risk exceeds **1.0% of liquid portfolio capital**. The distance to the technical invalidation level determines position sizing—never arbitrary lot sizing:

$$\\text{Position Size (Lots/Shares)} = \\frac{\\text{Total Capital} \\times 0.01}{\\left| \\text{Execution Entry} - \\text{Structural Invalidation SL} \\right|}$$

**2. Institutional Drawdown Mitigation Circuit Breaker**
- **Daily Drawdown Limit**: Discretionary trading terminates for the session upon reaching a **-3.0% cumulative portfolio drawdown**.
- **Weekly Drawdown Ceiling**: Reaching **-6.0%** triggers an immediate 50% position scale-down for the subsequent 5 trading days.

**3. Risk-to-Reward (R:R) Threshold**
Only execute setups presenting a minimum **1:2.5 asymmetric payoff**. At a 1:2.5 R:R, an analytical model remains mathematically profitable with a conservative 35% win rate.

${spotText}`;
  }

  if (lower.includes('bias') || lower.includes('fomo') || lower.includes('revenge') || lower.includes('psychology')) {
    return `### Behavioral Finance & Cognitive Bias Neutralization

**1. Loss Aversion Bias (Kahneman-Tversky Prospect Theory)**
Traders hold losing positions 2.5x longer than winners to avoid emotional pain.
- *Countermeasure*: Place mechanical hard stops immediately upon order fill. Never adjust a stop loss further from entry.

**2. FOMO (Fear of Missing Out) & Extended Candlestick Chasing**
Entering after consecutive impulse candles forces entry into institutional distribution zones.
- *Countermeasure*: Rule of Confirmation: If price has expanded more than 1.5 ATR (Average True Range) from the 20 EMA or Origin Order Block, wait for a multi-timeframe discount mitigation before considering entry.

**3. Revenge Trading Neutralization**
Emotional distress following an unexpected stop-out produces cognitive impairment.
- *Protocol*: Enforce a mandatory 15-minute terminal disconnection protocol post-invalidation. Journal the invalidation rationale prior to re-entering the order queue.

${spotText}`;
  }

  return `### Macroeconomic Finance & Capital Structure Intelligence

**1. Central Bank Monetary Policy & Yield Dynamics**
Global asset valuation is driven by real interest rates $(\\text{Nominal Yield} - \\text{Inflation Expectation})$. When central banks (RBI, Fed, ECB) conduct Quantitative Tightening, liquidity contractions compress P/E multiples and penalize speculative long duration assets.

**2. Portfolio Capital Allocation Architecture**
- **Core Tactical Bucket (60%)**: High-beta index constituents and sovereign debt instruments.
- **Asymmetric Alpha Bucket (30%)**: Institutional momentum, SMC order flow reversals, and swing opportunities.
- **Cash & Liquidity Buffer (10%)**: Dry powder reserved for structural flash corrections into high-timeframe demand pools.

${spotText}`;
}

function generateTechnicalsAnalysis(query: string, spotText: string): string {
  const lower = query.toLowerCase();

  if (lower.includes('smc') || lower.includes('order block') || lower.includes('fvg') || lower.includes('liquidity') || lower.includes('bos') || lower.includes('choch')) {
    return `### Smart Money Concepts (SMC) & Institutional Market Structure

**1. Order Block (OB) Identification & Mitigation**
An institutional Order Block is the final opposing candle before aggressive displacement that breaches structural swing points:
- **Bullish OB**: The lowest down-close candle prior to an impulsive upside displacement breaking structure (BOS). Limit bids cluster at the 50% equilibrium (Mean Threshold) of the candle body.
- **Bearish OB**: The highest up-close candle before impulsive downside expansion. Invalidation occurs if candle bodies close beyond the OB extreme.

**2. Fair Value Gaps (FVG) & Imbalance Inefficiencies**
Formed across a 3-candle sequence where Candle 1 High and Candle 3 Low do not overlap, leaving an inefficient void:
- Price acts like a vacuum, seeking to rebalance the imbalance (Balanced Price Range / BPR) before resuming the macro trend.

**3. Liquidity Engineering & Sweeps (BSL / SSL)**
- **Buy-Side Liquidity (BSL)**: Clustered stop-buys above equal highs.
- **Sell-Side Liquidity (SSL)**: Stop-loss clusters below equal lows.
- *Institutional Signature*: Algorithms trigger stops to accumulate counterparty liquidity before reversing aggressively in the true directional intent.

**4. Market Structure Transition: BOS vs CHoCH**
- **BOS (Break of Structure)**: Confirms trend continuation along the dominant institutional order flow.
- **CHoCH (Change of Character)**: First structural failure of a swing point, signaling potential trend exhaustion and phase shift.

${spotText}`;
  }

  if (lower.includes('rsi') || lower.includes('macd') || lower.includes('indicator') || lower.includes('moving average') || lower.includes('ema') || lower.includes('vwap')) {
    return `### Technical Indicators & Quantitative Flow Mechanics

**1. Volume Weighted Average Price (VWAP)**
- The true benchmark for institutional execution. Trading above VWAP indicates institutional net buy-side control; below VWAP reflects net distribution.
- *Standard Deviation Bands (+1σ, +2σ, -1σ, -2σ)*: Serve as statistical mean-reversion overbought/oversold boundaries.

**2. Multi-Timeframe EMA Alignment (20 / 50 / 200 EMA)**
- **Trend Filter**: 20 EMA > 50 EMA > 200 EMA indicates stacked bullish momentum.
- **Dynamic Support**: In strong trends, the 20 EMA pullback zone provides high-probability trend continuation triggers.

**3. RSI Divergence Protocol**
- **Regular Bearish Divergence**: Price prints higher highs while RSI makes lower highs → signals institutional exhaustion.
- **Hidden Bullish Divergence**: Price prints higher lows while RSI prints lower lows → signals trend continuation re-accumulation.

${spotText}`;
  }

  return `### Comprehensive Price Action & Market Structure Framework

**1. Fractal Multi-Timeframe Alignment**
Institutional analysis utilizes top-down decomposition:
- **Macro (Daily / Weekly)**: Identifies dominant liquidity pools and macro bias.
- **Intermediate (4-Hour / 1-Hour)**: Maps structural ranges, swing highs/lows, and unmitigated Order Blocks.
- **Execution (15-Min / 5-Min)**: Pinpoints entry triggers following liquidity sweeps and local CHoCH.

**2. Premium vs. Discount Pricing Arrays**
Using a 50% equilibrium Fibonacci grid across the dealing range:
- Never initiate longs in the **Premium Zone (> 50%)**.
- Never initiate shorts in the **Discount Zone (< 50%)**.

${spotText}`;
}

function generateFundamentalsAnalysis(query: string, spotText: string): string {
  const lower = query.toLowerCase();

  return `### Institutional Fundamental Valuation & Financial Statement Analysis

**1. Valuation Multiples & Intrinsic Pricing**
- **Price-to-Earnings (P/E)**: Must be benchmarked against 5-year historical median and industry peers. A high P/E is justified only when accompanied by superior Return on Equity (ROE > 20%) and earnings compounding.
- **EV/EBITDA (Enterprise Value / EBITDA)**: Neutralizes capital structure distortions (debt vs equity) across capital-intensive industries.
- **Free Cash Flow (FCF) Yield**: $\\text{FCF Yield} = \\frac{\\text{Operating Cash Flow} - \\text{CapEx}}{\\text{Market Capitalization}}$. True owner earnings indicator.

**2. Return on Capital Efficiency (ROCE vs. Cost of Capital)**
- Companies creating genuine shareholder value generate **ROCE consistently exceeding their Weighted Average Cost of Capital (WACC)** by $\\ge 500$ bps.
- **DuPont Analysis Breakdown**: $\\text{ROE} = \\text{Net Profit Margin} \\times \\text{Asset Turnover} \\times \\text{Financial Leverage}$. Dissects whether returns stem from operational superiority or excessive debt leverage.

**3. Solvency & Balance Sheet Health**
- **Debt-to-Equity (D/E) Ratio**: Desired $< 0.5\\times$ for cyclical sectors; zero net debt preferred.
- **Interest Coverage Ratio**: Operating Profit $\\div$ Finance Costs. A ratio $> 4.0\\times$ ensures resilience during interest rate hike cycles.

**4. Quarterly Results (Earnings Quality Checklist)**
- Assess YoY and QoQ revenue vs EBITDA growth.
- Verify whether earnings growth is driven by volume expansion rather than temporary price hikes or other non-operating income.
- Inspect Cash Flow from Operations (CFO) to Net Profit ratio: a ratio $< 0.8$ flags aggressive revenue recognition or working capital stress.

${spotText}`;
}

function generateStockMarketAnalysis(query: string, spotText: string): string {
  const lower = query.toLowerCase();

  if (lower.includes('option') || lower.includes('greek') || lower.includes('fno') || lower.includes('pcr') || lower.includes('max pain')) {
    return `### Stock Market Derivatives & F&O Greeks Architecture

**1. Option Greeks Mechanics**
- **Delta ($\\Delta$)**: Rate of change of option premium per ₹1 underlying movement. At-the-Money (ATM) options maintain $\\Delta \\approx 0.50$.
- **Gamma ($\\Gamma$)**: Acceleration of Delta. Peaks ATM near expiry, creating rapid "Gamma Squeezes" when market makers hedge delta-neutral exposure.
- **Theta ($\\Theta$)**: Temporal decay. Accelerates non-linearly during the final 7 days into contract expiry.
- **Vega ($\\nu$)**: Premium sensitivity per 1% change in Implied Volatility (IV). Essential for volatility contraction/expansion trades.

**2. Put-Call Ratio (PCR) & Open Interest (OI) Walls**
- **PCR > 1.30**: Extreme put writing; signals oversold market conditions and structural support near high-OI Put strikes.
- **PCR < 0.65**: Heavy call accumulation; signals overbought territory and impending resistance overhead.
- **Max Pain Theory**: Price gravitates toward the strike price where option writers (institutional sellers) incur the lowest cumulative monetary loss at expiry.

**3. Institutional Buildup Categorization**
- **Long Buildup**: Price $\\uparrow$, OI $\\uparrow$ (Fresh long positioning).
- **Short Buildup**: Price $\\downarrow$, OI $\\uparrow$ (Aggressive short initiation).
- **Short Covering**: Price $\\uparrow$, OI $\\downarrow$ (Bears liquidating positions).
- **Long Unwinding**: Price $\\downarrow$, OI $\\downarrow$ (Bulls taking profits or stopping out).

${spotText}`;
  }

  return `### Equities & Market Microstructure Intelligence

**1. Index Heavyweight Beta Dynamics**
Indices like the **NIFTY 50** are heavily top-weighted:
- **Banking & Financials**: HDFC Bank (~13.5%), ICICI Bank (~8.2%), SBI (~3.2%) control over 30% of aggregate movement.
- **Energy & Tech**: Reliance Industries (~9.8%) and Infosys (~5.9%) create heavy directional torque.
- Simultaneous alignment between HDFC Bank and Reliance moves the index decisively regardless of broader market breadth.

**2. Sectoral Rotation Flow**
Institutions rotate capital cyclically:
- **Risk-On Expansion**: Capital flows into High-Beta, Banking, Capital Goods, and Realty.
- **Defensive Consolidation**: Capital migrates into FMCG, Pharmaceuticals, and IT to preserve capital during volatility spikes.

**3. Execution Discipline in Equities**
- Align individual stock trade setups with sector index relative strength.
- Ensure volume expansion confirms any breakout above major resistance or consolidation range.

${spotText}`;
}

function generateForexAnalysis(query: string, spotText: string): string {
  const lower = query.toLowerCase();

  return `### Global Forex Intelligence & Currency Microstructure

**1. Foreign Exchange Valuation Drivers**
- **Interest Rate Differentials**: The primary catalyst of medium-term FX trends. Currencies backed by higher sovereign yields (or aggressive central bank rate hikes) attract global institutional capital flows.
- **US Dollar Index (DXY)**: The global currency anchor. DXY maintains a strong inverse correlation with risk assets, emerging market currencies (like USD/INR), and bullion.

**2. Major Currency Pair Characteristics**
- **EUR/USD**: The world's most liquid pair; sensitive to ECB vs Fed policy spreads, eurozone manufacturing PMIs, and energy costs.
- **GBP/USD (Cable)**: Higher volatility profile; sensitive to UK inflation data and Bank of England MPC voting splits.
- **USD/JPY**: Heavily driven by US 10-Year Treasury Yield differentials and Bank of Japan yield curve control policies.
- **USD/INR**: Managed floating regime overseen by RBI interventions via forex reserves to dampen extreme volatility.

**3. Forex Session Overlaps & Liquidity Windows**
- **London / New York Overlap (1:00 PM – 5:00 PM GMT)**: Generates over 55% of daily FX volume; highest liquidity and narrowest spreads.
- **Asian Session (Tokyo/Sydney)**: Typically exhibits consolidation and liquidity engineering, establishing daily highs/lows that get swept in London.

**4. Risk Parameters in FX Execution**
- Always calculate pip value accurately relative to lot size (Standard Lot = 100k units; Mini Lot = 10k units).
- Factor in overnight swap/rollover rates when running swing positions across differing interest rate regimes.

${spotText}`;
}

function generateCommoditiesAnalysis(query: string, spotText: string): string {
  const lower = query.toLowerCase();

  return `### Commodities, Bullion & Global Energy Intelligence

**1. Precious Metals: Gold (XAU/USD) & Silver (XAG/USD)**
- **Real Yield Relationship**: Gold exhibits a deep inverse correlation with US 10-Year Real Yields. As real yields fall or enter negative territory, the opportunity cost of holding non-yielding bullion collapses, sparking institutional rallies.
- **Central Bank Reserve Diversification**: Massive sovereign central bank accumulation acts as a non-commercial structural floor.
- **Gold/Silver Ratio**: When the ratio exceeds 85:1, Silver historically presents asymmetric mean-reversion upside as an industrial/precious hybrid asset.

**2. Energy: Crude Oil (WTI & Brent)**
- **Supply Drivers**: OPEC+ production quotas, US shale oil rig counts, Strategic Petroleum Reserve (SPR) balances, and refining crack spreads.
- **Geopolitical Chokepoints**: Maritime supply lanes (Strait of Hormuz, Bab el-Mandeb, Suez Canal) introduce rapid risk premiums upon regional friction.
- **Inventory Telemetry**: Weekly US EIA and API inventory releases trigger immediate intraday volatility sweeps.

**3. Industrial Metals: Copper (Dr. Copper)**
- Recognized as the premier leading barometer of global industrial manufacturing and GDP growth. Strong copper demand confirms global industrial expansion; weakness signals macroeconomic stagnation.

${spotText}`;
}

function generateCryptoAnalysis(query: string, spotText: string): string {
  const lower = query.toLowerCase();

  return `### Cryptocurrency & Digital Asset Market Structure

**1. Bitcoin (BTC) Halving & 4-Year Macro Cycles**
- **Supply Shock Dynamics**: Every 210,000 blocks (~4 years), Bitcoin miner block rewards are cut by 50%, reducing daily structural sell pressure from mining operations.
- Historically, post-halving supply contractions transition into institutional parabolic expansion phases once speculative leverage flushes.

**2. Institutional On-Chain Telemetry**
- **MVRV Z-Score (Market Value to Realized Value)**: Identifies extreme cycle tops ($Z > 6.0$) and historical generational accumulation bottoms ($Z < 0.1$).
- **Exchange Net Flow**: Sustained net outflows from centralized exchanges signal institutional cold-storage accumulation; net inflows indicate potential spot distribution.
- **Whale Wallet Accumulation**: Monitoring large wallet transactions reveals smart money absorption during market pullbacks.

**3. Market Structure & Altcoin Dynamics**
- **Bitcoin Dominance (BTC.D)**:
  - *Rising BTC.D + Rising Price*: Healthy institutional BTC-led bull run.
  - *Falling BTC.D + Consolidating BTC*: Altcoin Season trigger—capital rotates into Ethereum, major Layer 1s (Solana), and high-beta DeFi protocols.
- **Liquidity Pool & AMM Mechanics**: Decentralized liquidity providers earn yield through trading fees, balanced against impermanent loss risk.

**4. Risk Management Protocol for Crypto Assets**
- Crypto markets trade 24/7 with zero circuit breakers. Enforce tight hard stop-losses to eliminate liquidation cascade risk during weekend thin-order-book liquidity sweeps.

${spotText}`;
}

// ─── Main Mentor Response Orchestrator ──────────────────────────────────────

export function generateMentorResponse(
  query: string,
  context?: { spot?: number; market?: string }
): string {
  if (!isFinancialQuery(query)) {
    return REDIRECTION_MESSAGE;
  }

  const spotText = context?.spot
    ? `\n\n*Reference Spot Telemetry: ₹${context.spot.toLocaleString('en-US', { minimumFractionDigits: 2 })}*`
    : '';

  const domains = detectDomains(query);
  const lower = query.toLowerCase();

  // If specific asset matches are identified, route appropriately
  if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('btc') || lower.includes('eth') || lower.includes('solana')) {
    return generateCryptoAnalysis(query, spotText);
  }

  if (lower.includes('commodity') || lower.includes('gold') || lower.includes('silver') || lower.includes('crude') || lower.includes('oil') || lower.includes('xau')) {
    return generateCommoditiesAnalysis(query, spotText);
  }

  if (lower.includes('forex') || lower.includes('fx') || lower.includes('eurusd') || lower.includes('usdinr') || lower.includes('dxy') || lower.includes('currency')) {
    return generateForexAnalysis(query, spotText);
  }

  if (lower.includes('option') || lower.includes('fno') || lower.includes('nifty') || lower.includes('stock') || lower.includes('share') || lower.includes('sensex') || lower.includes('reliance') || lower.includes('hdfc')) {
    return generateStockMarketAnalysis(query, spotText);
  }

  if (lower.includes('fundamental') || lower.includes('valuation') || lower.includes('pe ratio') || lower.includes('p/e') || lower.includes('roe') || lower.includes('balance sheet') || lower.includes('quarterly')) {
    return generateFundamentalsAnalysis(query, spotText);
  }

  if (lower.includes('smc') || lower.includes('order block') || lower.includes('fvg') || lower.includes('technical') || lower.includes('chart') || lower.includes('liquidity') || lower.includes('support') || lower.includes('rsi')) {
    return generateTechnicalsAnalysis(query, spotText);
  }

  // Fallback routing based on detected domain
  if (domains.includes('CRYPTO')) return generateCryptoAnalysis(query, spotText);
  if (domains.includes('COMMODITIES')) return generateCommoditiesAnalysis(query, spotText);
  if (domains.includes('FOREX')) return generateForexAnalysis(query, spotText);
  if (domains.includes('STOCK_MARKET')) return generateStockMarketAnalysis(query, spotText);
  if (domains.includes('FUNDAMENTALS')) return generateFundamentalsAnalysis(query, spotText);
  if (domains.includes('TECHNICALS')) return generateTechnicalsAnalysis(query, spotText);

  // Default comprehensive finance response
  return generateFinanceAnalysis(query, spotText);
}
