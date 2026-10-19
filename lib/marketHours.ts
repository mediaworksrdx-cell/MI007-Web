// ─── Market Intelligence MI-007 — Market Hours & Trading Sessions ─────────────

export type MarketRegion = 'INDIA' | 'USA' | 'UAE' | 'CRYPTO' | 'FOREX' | 'COMMODITY';

export interface MarketSessionStatus {
  isOpen: boolean;
  market: MarketRegion;
  sessionName: string;
}

/**
 * Check if a market region is currently open for active trading.
 * Uses exact IANA timezones so Daylight Saving Time (DST) is handled accurately.
 */
export function isMarketOpen(market: MarketRegion, date = new Date()): boolean {
  // 1. Crypto is open 24/7/365 without exception
  if (market === 'CRYPTO') return true;

  // 2. INDIA (NSE / BSE): Mon-Fri 09:15 to 15:30 IST (Asia/Kolkata, UTC+5:30)
  if (market === 'INDIA') {
    const istString = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istString);
    const day = istDate.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return false;
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    // 09:15 IST = 555 min, 15:30 IST = 930 min
    return timeInMinutes >= 555 && timeInMinutes <= 930;
  }

  // 3. USA (NYSE / NASDAQ): Mon-Fri 09:30 to 16:00 US Eastern (America/New_York)
  if (market === 'USA') {
    const etString = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const etDate = new Date(etString);
    const day = etDate.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return false;
    const hours = etDate.getHours();
    const minutes = etDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    // 09:30 ET = 570 min, 16:00 ET = 960 min
    return timeInMinutes >= 570 && timeInMinutes <= 960;
  }

  // 4. UAE (DFM / ADX): Mon-Fri 10:00 to 15:00 GST (Asia/Dubai, UTC+4)
  if (market === 'UAE') {
    const gstString = date.toLocaleString('en-US', { timeZone: 'Asia/Dubai' });
    const gstDate = new Date(gstString);
    const day = gstDate.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return false;
    const hours = gstDate.getHours();
    const minutes = gstDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    // 10:00 GST = 600 min, 15:00 GST = 900 min
    return timeInMinutes >= 600 && timeInMinutes <= 900;
  }

  // 5. FOREX & COMMODITIES:
  // Continuous 24/5: Opens Sunday 17:00 ET, Closes Friday 17:00 ET.
  if (market === 'FOREX' || market === 'COMMODITY') {
    const etString = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const etDate = new Date(etString);
    const day = etDate.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const hours = etDate.getHours();
    // Friday after 17:00 ET -> closed for weekend
    if (day === 5 && hours >= 17) return false;
    // Saturday all day -> closed
    if (day === 6) return false;
    // Sunday before 17:00 ET -> closed until Asia open
    if (day === 0 && hours < 17) return false;
    return true;
  }

  return true;
}

/**
 * Determine the asset class / market region of any symbol
 */
export function getSymbolMarket(sym: string): MarketRegion {
  if (!sym) return 'INDIA';
  const clean = sym.toUpperCase().trim();

  // Crypto
  const CRYPTO_LIST = ['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC'];
  if (CRYPTO_LIST.includes(clean) || clean.endsWith('USDT') || clean.endsWith('-USD')) {
    return 'CRYPTO';
  }

  // Forex
  const FOREX_LIST = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDINR', 'USDAED', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'];
  if (FOREX_LIST.includes(clean) || clean.includes('/USD') || clean.includes('/INR') || clean.includes('/AED')) {
    return 'FOREX';
  }

  // Commodities
  const COMMODITY_LIST = ['GOLD', 'SILVER', 'CRUDEOIL', 'BRENT', 'WTI', 'NATGAS', 'COPPER', 'PLATINUM', 'XAU/USD', 'XAG/USD'];
  if (COMMODITY_LIST.includes(clean)) {
    return 'COMMODITY';
  }

  // UAE
  const UAE_LIST = ['DFMGI', 'ADX', 'ADXGI', 'FTSE ADX 15', 'EMAAR', 'FAB', 'DEWA', 'SALIK', 'ALDAR', 'ENBD', 'ADNOC', 'AIRARABIA'];
  if (UAE_LIST.includes(clean)) {
    return 'UAE';
  }

  // USA
  const US_LIST = [
    'SPX', 'S&P 500', 'NDX', 'NASDAQ 100', 'NASDAQ', 'DJI', 'DOW JONES', 'VIX', 'QQQ', 'RUT',
    'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'AMD', 'NFLX', 'INTC'
  ];
  if (US_LIST.includes(clean)) {
    return 'USA';
  }

  // Default to INDIA (Zerodha Kite NSE / BSE Equities & Indices)
  return 'INDIA';
}

/**
 * Check if the market for a specific symbol is currently open for live trading
 */
export function isSymbolMarketOpen(symbol: string, date = new Date()): boolean {
  const market = getSymbolMarket(symbol);
  return isMarketOpen(market, date);
}
