// ─── Market Intelligence MI- 007 — Realistic Mock Data Generator ─────────────
import { Candle, MarketType } from './types';
import { getZerodhaStockPrice } from './screener/zerodhaStocks';

/** Base prices for different instruments */
const BASE_PRICES: Record<MarketType, Record<string, number>> = {
  INDIA: {
    NIFTY: 22687.65,
    BANKNIFTY: 54925.70,
    SENSEX: 73249.39,
    FINNIFTY: 24657.70,
    RELIANCE: 1184.50,
    TCS: 2506.90,
    HDFCBANK: 694.05,
    INFY: 1153.35,
    SBIN: 970.00,
    TATAMOTORS: 270.00,
    LT: 3638.30,
    ICICIBANK: 1398.50,
    BHARTIARTL: 1895.00,
  },
  USA: {
    SPX: 7703.58,
    'S&P 500': 7703.58,
    NDX: 29630.77,
    'NASDAQ 100': 29630.77,
    NASDAQ: 29630.77,
    DJI: 51964.04,
    'DOW JONES': 51964.04,
    QQQ: 717.71,
    VIX: 18.56,
    RUT: 2721.37,
    'RUSSELL 2000': 2721.37,
    NVDA: 214.10,
    AAPL: 343.50,
    MSFT: 529.00,
    TSLA: 354.70,
    AMZN: 250.00,
    META: 733.40,
    GOOGL: 340.60,
    GOOG: 340.60,
  },
  UAE: {
    DFMGI: 4850,
    'DFM GENERAL': 4850,
    ADXGI: 9250,
    ADX: 9250,
    'ADX GENERAL': 9250,
    'FTSE ADX 15': 9410.20,
    EMAAR: 8.45,
    FAB: 13.80,
    DEWA: 2.92,
    ALDAR: 6.82,
    ENBD: 18.65,
    ADNOC: 3.78,
    AIRARABIA: 2.65,
  },
};

const CRYPTO_BASE_PRICES: Record<string, number> = {
  BTC: 82010.0,
  ETH: 2403.0,
  SOL: 104.37,
  BNB: 727.0,
  DOGE: 0.079,
  SHIB: 0.0000185,
  XRP: 0.60,
  ADA: 0.45,
  AVAX: 28.50,
};

export const COMMODITY_BASE_PRICES: Record<string, number> = {
  GOLD: 2735.40,
  XAU: 2735.40,
  XAUUSD: 2735.40,
  SILVER: 31.85,
  XAG: 31.85,
  XAGUSD: 31.85,
  CRUDEOIL: 74.20,
  BRENT: 74.20,
  WTI: 70.80,
  NATGAS: 2.85,
  COPPER: 4.38,
  PLATINUM: 1024.50,
};

export const FOREX_BASE_PRICES: Record<string, number> = {
  EURUSD: 1.0845,
  GBPUSD: 1.2980,
  USDJPY: 152.40,
  USDINR: 84.08,
  USDCAD: 1.4092,
  AUDCAD: 0.9838,
  USDCHF: 0.8850,
  USDAED: 3.6725,
  AUDUSD: 0.6650,
};

/** Generate realistic OHLCV candles with volatility clustering */
export function generateMockCandles(
  market: MarketType,
  symbol: string,
  count: number = 800,
  timeframeMs: number = 60 * 60 * 1000 // 1H default
): Candle[] {
  const symClean = symbol.toUpperCase().replace(/[\s\/-]+/g, '');
  const market_prices = BASE_PRICES[market] || BASE_PRICES.INDIA;
  const basePrice =
    CRYPTO_BASE_PRICES[symClean] ??
    COMMODITY_BASE_PRICES[symClean] ??
    FOREX_BASE_PRICES[symClean] ??
    market_prices[symbol] ??
    market_prices[symClean] ??
    BASE_PRICES.INDIA[symClean] ??
    BASE_PRICES.USA[symClean] ??
    BASE_PRICES.UAE[symClean] ??
    getZerodhaStockPrice(symClean);

  const decimals = basePrice < 2 ? 4 : basePrice < 10 ? 3 : 2;
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now();
  const startTime = now - count * timeframeMs;

  // Scale typical body movement proportional to timeframe
  const isHighTf = timeframeMs >= 86_400_000;
  const isMedTf = timeframeMs >= 3_600_000;
  const basePct = isHighTf ? 0.008 : isMedTf ? 0.0045 : 0.0022;

  let waveTrend = Math.random() > 0.5 ? 1 : -1;
  let waveSteps = Math.floor(3 + Math.random() * 5);

  for (let i = 0; i < count; i++) {
    if (waveSteps <= 0) {
      waveTrend = Math.random() > 0.48 ? 1 : -1;
      waveSteps = Math.floor(3 + Math.random() * 6); // 3 to 8 bars per swing
    }
    waveSteps--;

    // Healthy institutional candle body (0.3% to 1.1% of price on 1H/1D)
    const variance = (0.5 + Math.random() * 1.0);
    const movePct = basePct * variance * (Math.random() > 0.38 ? waveTrend : -waveTrend);
    const bodySize = Math.max(price * Math.abs(movePct), price * 0.0005);
    const isBull = movePct >= 0;

    const open = price;
    const close = isBull ? open + bodySize : Math.max(open - bodySize, open * 0.01);

    // Realistic wicks: 15% to 45% of the body height, never overpowering the body
    const wickUp = bodySize * (0.15 + Math.random() * 0.35);
    const wickDown = bodySize * (0.15 + Math.random() * 0.35);
    const high = Math.max(open, close) + wickUp;
    const low = Math.max(Math.min(open, close) - wickDown, open * 0.005);
    const volume = Math.floor(basePrice * (800 + Math.random() * 2400));

    candles.push({
      openTime: startTime + i * timeframeMs,
      open: +open.toFixed(decimals),
      high: +high.toFixed(decimals),
      low: +low.toFixed(decimals),
      close: +close.toFixed(decimals),
      volume,
    });

    price = close;
  }
  return candles;
}

const TIMEFRAME_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1H': 60 * 60_000,
  '4H': 4 * 60 * 60_000,
  '1D': 24 * 60 * 60_000,
  '1W': 7 * 24 * 60 * 60_000,
  '1M': 30 * 24 * 60 * 60_000,
};

/** Get candles for a given market, symbol, and timeframe */
export function getMockCandles(
  market: MarketType,
  symbol: string,
  timeframe: string,
  count: number = 800
): Candle[] {
  const ms = TIMEFRAME_MS[timeframe] ?? TIMEFRAME_MS['1H'];
  return generateMockCandles(market, symbol, count, ms);
}

/** Mock live quote for a given market and symbol */
export function getMockQuote(
  market: MarketType,
  symbol: string
): { price: number; change: number; changePct: number; high: number; low: number; volume: number; open: number } {
  const symClean = symbol.toUpperCase().replace(/[\s\/-]+/g, '');
  const market_prices = BASE_PRICES[market] || BASE_PRICES.INDIA;
  const basePrice =
    CRYPTO_BASE_PRICES[symClean] ??
    COMMODITY_BASE_PRICES[symClean] ??
    FOREX_BASE_PRICES[symClean] ??
    market_prices[symbol] ??
    market_prices[symClean] ??
    BASE_PRICES.INDIA[symClean] ??
    BASE_PRICES.USA[symClean] ??
    BASE_PRICES.UAE[symClean] ??
    getZerodhaStockPrice(symClean);
  const change = (Math.random() - 0.48) * basePrice * 0.018;
  const open = basePrice - change * 0.3;
  const high = basePrice + Math.abs(change) * 1.4;
  const low = basePrice - Math.abs(change) * 1.1;
  const decimals = basePrice < 2 ? 4 : basePrice < 10 ? 3 : 2;
  return {
    price: +basePrice.toFixed(decimals),
    change: +change.toFixed(decimals),
    changePct: +((change / basePrice) * 100).toFixed(2),
    high: +high.toFixed(decimals),
    low: +low.toFixed(decimals),
    open: +open.toFixed(decimals),
    volume: Math.floor(basePrice * (1000 + Math.random() * 3000)),
  };
}

export const TICKER_DATA_BY_MARKET: Record<MarketType, { symbol: string; price: number; change: number; changePct: number }[]> = {
  INDIA: [
    { symbol: 'NIFTY', price: 22687.65, change: -201.25, changePct: -0.88 },
    { symbol: 'BANKNIFTY', price: 54925.70, change: -562.40, changePct: -1.01 },
    { symbol: 'SENSEX', price: 73249.39, change: -870.61, changePct: -1.17 },
    { symbol: 'RELIANCE', price: 1184.50, change: -19.50, changePct: -1.62 },
    { symbol: 'TCS', price: 2506.90, change: 22.40, changePct: 0.90 },
    { symbol: 'HDFCBANK', price: 694.05, change: -12.90, changePct: -1.82 },
    { symbol: 'INFY', price: 1153.35, change: -15.80, changePct: -1.35 },
    { symbol: 'ICICIBANK', price: 1398.50, change: 14.20, changePct: 1.03 },
    { symbol: 'TATAMOTORS', price: 270.00, change: -4.80, changePct: -1.75 },
    { symbol: 'SBIN', price: 970.00, change: 8.50, changePct: 0.88 },
    { symbol: 'BHARTIARTL', price: 1895.00, change: 12.20, changePct: 0.65 },
  ],
  USA: [
    { symbol: 'S&P 500', price: 7703.58, change: 44.14, changePct: 0.58 },
    { symbol: 'NASDAQ 100', price: 29630.77, change: 443.22, changePct: 1.52 },
    { symbol: 'DOW JONES', price: 51964.04, change: -38.37, changePct: -0.07 },
    { symbol: 'VIX', price: 18.56, change: -1.43, changePct: -7.15 },
    { symbol: 'NVDA', price: 214.10, change: 3.80, changePct: 1.81 },
    { symbol: 'AAPL', price: 343.50, change: 2.20, changePct: 0.64 },
    { symbol: 'MSFT', price: 529.00, change: -2.60, changePct: -0.49 },
    { symbol: 'TSLA', price: 354.70, change: 8.20, changePct: 2.37 },
    { symbol: 'META', price: 733.40, change: 9.60, changePct: 1.33 },
    { symbol: 'AMZN', price: 250.00, change: -1.05, changePct: -0.42 },
    { symbol: 'GOOGL', price: 340.60, change: 2.30, changePct: 0.68 },
  ],
  UAE: [
    { symbol: 'DFMGI', price: 4324.80, change: 18.40, changePct: 0.43 },
    { symbol: 'ADXGI', price: 9852.10, change: -22.60, changePct: -0.23 },
    { symbol: 'FTSE ADX 15', price: 9410.20, change: 15.30, changePct: 0.16 },
    { symbol: 'EMAAR', price: 8.48, change: 0.08, changePct: 0.95 },
    { symbol: 'FAB', price: 13.85, change: -0.10, changePct: -0.72 },
    { symbol: 'DEWA', price: 2.94, change: 0.02, changePct: 0.68 },
    { symbol: 'ALDAR', price: 6.82, change: 0.06, changePct: 0.89 },
    { symbol: 'ENBD', price: 18.65, change: -0.15, changePct: -0.80 },
    { symbol: 'ADNOC', price: 3.78, change: 0.01, changePct: 0.27 },
    { symbol: 'AIRARABIA', price: 2.65, change: 0.03, changePct: 1.15 },
  ],
};

/** Ticker tape data for scrolling ribbon */
export function getTickerData(market: MarketType): { symbol: string; price: number; change: number; changePct: number }[] {
  return TICKER_DATA_BY_MARKET[market] ?? TICKER_DATA_BY_MARKET.INDIA;
}
