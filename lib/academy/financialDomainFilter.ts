// ─── Financial Domain Filter & RedX First-Principles Knowledge Base ───────

export const FINANCIAL_KEYWORDS: string[] = [
  // Market & Asset types
  'nifty', 'sensex', 'banknifty', 'finnifty', 'stock', 'stocks', 'share', 'shares', 'equity', 'equities',
  'market', 'markets', 'indices', 'index', 'nse', 'bse', 'nasdaq', 'nyse', 'spx', 'dow', 'crypto',
  'btc', 'eth', 'forex', 'commodity', 'gold', 'silver', 'crude', 'oil', 'midcap', 'vix', 'india vix',

  // Top Companies & Tickers
  'reliance', 'ril', 'tcs', 'tata consultancy', 'infy', 'infosys', 'hdfc', 'hdfcbank', 'icici',
  'icicibank', 'sbi', 'sbin', 'state bank', 'tata steel', 'tatasteel', 'tata motors', 'tatamotors',
  'airtel', 'bhartiartl', 'bharti airtel', 'larsen', 'l&t', 'lt', 'itc', 'wipro', 'maruti',
  'titan', 'sunpharma', 'bajfinance', 'bajaj finance', 'adanient', 'adani', 'hindunilvr', 'hul',
  'zomato', 'paytm', 'jio', 'apple', 'aapl', 'microsoft', 'msft', 'google', 'googl', 'amazon',
  'amzn', 'tesla', 'tsla', 'nvidia', 'nvda', 'meta', 'dfmgi', 'emaar', 'dewa',

  // Technical Analysis & SMC Studies
  'technical', 'technicals', 'chart', 'charts', 'candlestick', 'candle', 'pattern', 'trend',
  'support', 'resistance', 'breakout', 'breakdown', 'smc', 'order block', 'orderblock', 'fvg',
  'fair value gap', 'liquidity', 'liquidity sweep', 'choch', 'bos', 'change of character',
  'break of structure', 'swing high', 'swing low', 'pullback', 'volume', 'rsi', 'macd', 'ema',
  'sma', 'moving average', 'bollinger', 'atr', 'supertrend', 'vwap', 'price action', 'invalidation',
  'projection', 'study zone', 'demand zone', 'supply zone', 'imbalance', 'mitigation', 'premium', 'discount',

  // Fundamental Analysis & Valuation Metrics
  'fundamental', 'fundamentals', 'valuation', 'pe', 'pe ratio', 'p/e', 'pb', 'pb ratio', 'p/b',
  'eps', 'roe', 'roce', 'return on capital', 'return on equity', 'book value', 'market cap',
  'market capitalization', 'large cap', 'mid cap', 'small cap', 'debt', 'debt to equity', 'debt/equity',
  'cash flow', 'free cash flow', 'fcf', 'operating cash flow', 'dividend', 'dividend yield', 'yield',
  'payout ratio', 'ebitda', 'ebit', 'operating margin', 'net margin', 'gross margin', 'pat',
  'profit after tax', 'pbt', 'capex', 'promoter', 'fii', 'dii', 'shareholding', 'balance sheet',
  'income statement', 'annual report', 'financial statements', 'financial report', 'working capital',

  // Company Results & Earnings
  'result', 'results', 'quarterly', 'quarter', 'q1', 'q2', 'q3', 'q4', 'earning', 'earnings',
  'revenue', 'profit', 'net profit', 'loss', 'guidance', 'sales', 'turnover', 'audit', 'yoy', 'qoq',

  // F&O & Derivatives
  'fno', 'futures', 'options', 'option', 'option chain', 'strike', 'expiry', 'call', 'put',
  'pcr', 'put-call ratio', 'put call ratio', 'max pain', 'open interest', 'oi', 'call wall',
  'put wall', 'gamma', 'theta', 'vega', 'delta', 'greeks', 'iv', 'implied volatility', 'buildup',
  'long buildup', 'short buildup', 'short covering', 'long unwinding', 'straddle', 'strangle',
  'iron condor', 'spread', 'bull call spread', 'bear put spread',

  // Portfolio, Personal Finance & Investment Education
  'portfolio', 'holding', 'holdings', 'pnl', 'profit and loss', 'allocation', 'investment',
  'investments', 'invest', 'investing', 'investor', 'investors', 'returns', 'risk', 'rebalance',
  'sip', 'systematic investment plan', 'mutual fund', 'mutual funds', 'etf', 'etfs', 'compound',
  'compounding', 'dollar cost averaging', 'dca', 'lump sum', 'diversification', 'diversify',
  'asset allocation', 'emergency fund', 'wealth', 'rule of 72', 'cagr', 'passive investing',
  'active investing', 'index fund', 'index funds', 'fixed deposit', 'fd', 'debt fund',
  'capital preservation', 'financial freedom', 'risk management', '1% risk', 'position size',
  'position sizing', 'drawdown', 'loss aversion', 'fomo', 'revenge trading', 'disposition effect',
  'trading psychology', 'discipline', 'bias', 'behavioral bias',

  // General Financial Terms & Macro
  'inflation', 'interest rate', 'interest rates', 'gdp', 'rbi', 'fed', 'fiscal', 'monetary',
  'sector', 'banking', 'it', 'pharma', 'auto', 'fmcg', 'metal', 'energy', 'realty', 'trade',
  'trading', 'trader', 'traders', 'broker', 'demat'
];

export interface RedXKnowledgeEntry {
  id: string;
  title: string;
  content: string;
  keywords: string[];
}

export const REDX_KNOWLEDGE_BASE: RedXKnowledgeEntry[] = [
  {
    id: 'KB-CORE-001',
    title: 'Market First Principles',
    content: 'Price exists strictly due to order execution. Directional movement occurs when liquidity at one side of the book is completely consumed. Candlestick charts are historical records of institutional order execution interaction footprints.',
    keywords: ['market', 'first principles', 'order', 'liquidity', 'charts'],
  },
  {
    id: 'KB-CORE-002',
    title: 'Candlesticks (Price Language)',
    content: 'Candles are time-compressed records of trading activity representing Open, High, Low, and Close. They show institutional control across auction timeframes, not future certainty.',
    keywords: ['candlestick', 'candle', 'price language', 'open', 'high', 'low', 'close'],
  },
  {
    id: 'KB-CORE-003',
    title: 'Candlestick Anatomy & Wicks',
    content: 'Bodies represent conviction between Open and Close. Wicks represent price rejection: upper wicks demonstrate sell-side absorption, whereas lower wicks indicate buy-side liquidity capture.',
    keywords: ['anatomy', 'body', 'wick', 'absorption', 'liquidity capture'],
  },
  {
    id: 'KB-CORE-004',
    title: 'Smart Money Concepts (SMC)',
    content: 'Smart Money participants (FIIs, DIIs, prop desks) require massive counterparty liquidity to enter positions. Break of Structure (BOS) indicates trend continuation, while Change of Character (CHoCH) signals potential institutional trend reversal.',
    keywords: ['smc', 'smart money', 'bos', 'choch', 'market structure'],
  },
  {
    id: 'KB-CORE-005',
    title: 'Fair Value Gap (FVG)',
    content: 'An FVG occurs when aggressive institutional displacement causes an imbalance across a 3-candle sequence, leaving an unfilled price pocket. These gaps serve as high-probability rebalancing and re-entry zones.',
    keywords: ['fvg', 'fair value gap', 'inefficient', 'displacement', 'rebalancing'],
  },
  {
    id: 'KB-CORE-006',
    title: 'Order Blocks (OB)',
    content: 'An Order Block is the last opposing candle prior to an impulsive displacement. It represents the origin of institutional positioning where pending limit orders frequently absorb retests.',
    keywords: ['order block', 'ob', 'impulse', 'reaction zone'],
  },
  {
    id: 'KB-CORE-007',
    title: 'Liquidity Pools & Sweeps',
    content: 'Retail stop-losses cluster predictably above equal highs (Buy-Side Liquidity) and below equal lows (Sell-Side Liquidity). Institutional algorithms sweep these pools before accelerating in the true intended direction.',
    keywords: ['liquidity', 'equal highs', 'equal lows', 'sweep', 'bssl', 'sssl'],
  },
  {
    id: 'KB-CORE-008',
    title: '1% Mathematical Risk Allocation',
    content: 'Risk no more than 1% of total portfolio capital on any single setup. Position size is calculated mathematically as: Position Size = (Account Capital × 1%) ÷ (Entry Price - Stop Loss). Never adapt stop-loss to lot size; adapt lot size to stop-loss distance.',
    keywords: ['1% risk', 'position size', 'position sizing', 'stop loss', 'risk management'],
  },
  {
    id: 'KB-CORE-009',
    title: 'Option Greeks Framework',
    content: 'Delta (Δ) measures price sensitivity per ₹1 underlying move. Gamma (Γ) is the acceleration rate of Delta. Theta (Θ) quantifies daily time decay. Vega (ν) determines option pricing sensitivity to Implied Volatility (IV) changes.',
    keywords: ['greeks', 'delta', 'gamma', 'theta', 'vega', 'options', 'decay'],
  },
  {
    id: 'KB-CORE-010',
    title: 'Cognitive Biases in Trading',
    content: 'Loss aversion causes traders to hold losing trades 2.5x longer than winners. FOMO triggers buying at candle peaks. Revenge trading compounds drawdown. Strict circuit breakers and cooldown rules neutralize emotional distortion.',
    keywords: ['bias', 'loss aversion', 'fomo', 'revenge trading', 'psychology'],
  },
];

export const REDIRECTION_MESSAGE =
  'I am your Market Intelligence Cognitive AI Mentor, dedicated strictly to financial markets, quantitative strategy, company quarterly results, Smart Money Concepts (SMC), and investment discipline. Please submit a question regarding financial markets or trading concepts.';

export function isFinancialQuery(query: string): boolean {
  const lower = query.toLowerCase().trim();
  if (!lower) return false;

  // Single word or ticker check (e.g., RELIANCE, TCS, INFY, NIFTY, AAPL, PE)
  const words = lower.split(/\s+/);
  if (words.length <= 2 && lower.length >= 2 && lower.length <= 15 && words.every(w => /^[a-z0-9.]+$/.test(w))) {
    return true;
  }

  // Multi-word phrase matches against financial dictionary
  return FINANCIAL_KEYWORDS.some(keyword => {
    if (keyword.includes(' ')) {
      return lower.includes(keyword);
    }
    const regex = new RegExp(`\\b${keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(lower);
  });
}

export function generateMentorResponse(
  query: string,
  context?: { spot?: number; market?: string }
): string {
  if (!isFinancialQuery(query)) {
    return REDIRECTION_MESSAGE;
  }

  const lower = query.toLowerCase();

  // Check Knowledge Base for exact matches
  const matchedEntry = REDX_KNOWLEDGE_BASE.find(e =>
    e.keywords.some(k => lower.includes(k))
  );

  const spotText = context?.spot ? ` Current NIFTY Spot: ₹${context.spot.toLocaleString('en-US', { minimumFractionDigits: 2 })}.` : '';

  if (matchedEntry) {
    return `### Institutional Study: ${matchedEntry.title}\n\n${matchedEntry.content}\n\n${spotText}\n\n*Source: Aarka AI Cognitive Framework & Smart Money Analytics*`;
  }

  if (lower.includes('nifty') || lower.includes('heavyweight') || lower.includes('hdfc')) {
    return `### NIFTY 50 Microstructure & Constituent Beta\n\nNIFTY 50 index point movement is disproportionately governed by high-weighting constituents: HDFC Bank (13.5%), Reliance (9.8%), ICICI Bank (8.2%), and Infosys (5.9%). A simultaneous 1% push across HDFC and Reliance generates over +35 index points independently of broader market breadth.\n\nInstitutional desks monitor the FII Long-Short Index Futures Ratio and the Put-Call Ratio (PCR) wall to identify delta-neutral absorption zones.\n\n${spotText}\n\n*Generated by Aarka AI 7B Neural Engine*`;
  }

  if (lower.includes('risk') || lower.includes('drawdown') || lower.includes('position')) {
    return `### Mathematical Risk Discipline Mandate\n\n1. **Fixed Fractional Sizing**: Max loss capped at 1.0% of total capital per trade.\n2. **Position Sizing Formula**: Lot Size = (Capital × 0.01) ÷ (Entry - Invalidation SL).\n3. **Daily Circuit Breaker**: If total portfolio drawdown reaches ≥ 3.0% on a single trading day, all discretionary trading halts immediately to eliminate emotional revenge trading.\n\n*Generated by Aarka AI 7B Neural Engine*`;
  }

  return `### Aarka AI Cognitive Market Intelligence\n\nAnalyzing query within institutional market structure.\n\nKey Observation: Market liquidity seeks unmitigated Fair Value Gaps (FVGs) and Order Blocks prior to continuation. Always align trade execution with multi-timeframe order flow and strictly enforce invalidation levels.\n\n${spotText}\n\n*Generated by Aarka AI 7B Neural Engine*`;
}
