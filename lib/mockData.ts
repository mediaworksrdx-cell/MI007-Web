// ─── Market Intelligence MI- 007 — Realistic Mock Data Generator ─────────────
import { Candle, MarketType } from './types';

/** Base prices for different instruments */
const BASE_PRICES: Record<MarketType, Record<string, number>> = {
  INDIA: {
    NIFTY: 23146.15,
    BANKNIFTY: 55844.00,
    SENSEX: 74729.27,
    FINNIFTY: 25480.00,
    RELIANCE: 1211.20,
    TCS: 2465.00,
    HDFCBANK: 728.85,
    INFY: 1161.20,
    ITC: 485.50,
    SBIN: 865.40,
    TATAMOTORS: 283.70,
    LT: 3749.10,
    ICICIBANK: 1383.00,
    BHARTIARTL: 1882.80,
  },
  USA: {
    SPX: 7659.40,
    'S&P 500': 7659.40,
    NDX: 29187.50,
    'NASDAQ 100': 29187.50,
    NASDAQ: 29187.50,
    DJI: 52002.40,
    'DOW JONES': 52002.40,
    QQQ: 715.20,
    VIX: 18.40,
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
  BTC: 83651.0,
  ETH: 2687.59,
  SOL: 103.50,
  BNB: 754.0,
  DOGE: 0.090,
  SHIB: 0.0000185,
  XRP: 0.60,
  ADA: 0.45,
  AVAX: 28.50,
};

/** Generate realistic OHLCV candles with volatility clustering */
export function generateMockCandles(
  market: MarketType,
  symbol: string,
  count: number = 300,
  timeframeMs: number = 60 * 60 * 1000 // 1H default
): Candle[] {
  const symClean = symbol.toUpperCase().replace(/\s+/g, '');
  const market_prices = BASE_PRICES[market] || BASE_PRICES.INDIA;
  const basePrice =
    CRYPTO_BASE_PRICES[symClean] ??
    market_prices[symbol] ??
    market_prices[symClean] ??
    BASE_PRICES.INDIA[symClean] ??
    BASE_PRICES.USA[symClean] ??
    BASE_PRICES.UAE[symClean] ??
    1000;

  // Volatility coefficients per market
  const volFactor = market === 'INDIA' ? 0.0008
    : market === 'USA' ? 0.0006
    : 0.0004;

  const candles: Candle[] = [];
  let price = basePrice;
  let trend = 0; // drift
  const now = Date.now();
  const startTime = now - count * timeframeMs;

  for (let i = 0; i < count; i++) {
    // Random walk with mean reversion
    if (i % 20 === 0) trend = (Math.random() - 0.48) * basePrice * 0.002;
    const volatility = basePrice * volFactor * (0.5 + Math.random());
    const change = trend + (Math.random() - 0.5) * volatility * 2;

    const open = price;
    const close = Math.max(open + change, open * 0.005);
    const wickUp = Math.random() * volatility;
    const wickDown = Math.random() * volatility;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    const volume = Math.floor(basePrice * (500 + Math.random() * 1500));

    candles.push({
      openTime: startTime + i * timeframeMs,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +Math.max(low, open * 0.001).toFixed(2),
      close: +close.toFixed(2),
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
  count: number = 250
): Candle[] {
  const ms = TIMEFRAME_MS[timeframe] ?? TIMEFRAME_MS['1H'];
  return generateMockCandles(market, symbol, count, ms);
}

/** Mock live quote for a given market and symbol */
export function getMockQuote(
  market: MarketType,
  symbol: string
): { price: number; change: number; changePct: number; high: number; low: number; volume: number; open: number } {
  const symClean = symbol.toUpperCase().replace(/\s+/g, '');
  const market_prices = BASE_PRICES[market] || BASE_PRICES.INDIA;
  const basePrice =
    CRYPTO_BASE_PRICES[symClean] ??
    market_prices[symbol] ??
    market_prices[symClean] ??
    BASE_PRICES.INDIA[symClean] ??
    BASE_PRICES.USA[symClean] ??
    BASE_PRICES.UAE[symClean] ??
    1000;
  const change = (Math.random() - 0.48) * basePrice * 0.018;
  const open = basePrice - change * 0.3;
  const high = basePrice + Math.abs(change) * 1.4;
  const low = basePrice - Math.abs(change) * 1.1;
  return {
    price: +basePrice.toFixed(2),
    change: +change.toFixed(2),
    changePct: +((change / basePrice) * 100).toFixed(2),
    high: +high.toFixed(2),
    low: +low.toFixed(2),
    open: +open.toFixed(2),
    volume: Math.floor(basePrice * (1000 + Math.random() * 3000)),
  };
}

export const TICKER_DATA_BY_MARKET: Record<MarketType, { symbol: string; price: number; change: number; changePct: number }[]> = {
  INDIA: [
    { symbol: 'NIFTY', price: 23146.15, change: 148.80, changePct: 0.65 },
    { symbol: 'BANKNIFTY', price: 55844.00, change: 33.50, changePct: 0.06 },
    { symbol: 'SENSEX', price: 74729.27, change: 413.66, changePct: 0.56 },
    { symbol: 'RELIANCE', price: 1211.20, change: -12.40, changePct: -1.01 },
    { symbol: 'TCS', price: 2465.00, change: 38.50, changePct: 1.59 },
    { symbol: 'HDFCBANK', price: 728.85, change: 4.20, changePct: 0.58 },
    { symbol: 'INFY', price: 1161.20, change: 24.30, changePct: 2.14 },
    { symbol: 'ICICIBANK', price: 1383.00, change: -6.40, changePct: -0.46 },
    { symbol: 'ITC', price: 485.50, change: -2.30, changePct: -0.47 },
    { symbol: 'SBIN', price: 865.40, change: -4.60, changePct: -0.53 },
    { symbol: 'BHARTIARTL', price: 1882.80, change: 28.80, changePct: 1.55 },
  ],
  USA: [
    { symbol: 'S&P 500', price: 7659.40, change: 38.50, changePct: 0.51 },
    { symbol: 'NASDAQ 100', price: 29187.50, change: 165.20, changePct: 0.57 },
    { symbol: 'DOW JONES', price: 52002.40, change: -85.40, changePct: -0.16 },
    { symbol: 'VIX', price: 18.40, change: -0.25, changePct: -1.25 },
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
