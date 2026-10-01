// ─── Market Intelligence 007 — Realistic Mock Data Generator ────────────────
import { Candle, MarketType } from './types';

/** Base prices for different instruments */
const BASE_PRICES: Record<MarketType, Record<string, number>> = {
  INDIA: {
    NIFTY: 24850,
    BANKNIFTY: 53200,
    RELIANCE: 2980,
    TCS: 4250,
    HDFCBANK: 1785,
  },
  USA: {
    SPX: 5480,
    NDX: 19200,
    AAPL: 228,
    NVDA: 875,
    TSLA: 248,
  },
  UAE: {
    DFMGI: 4320,
    ADXGI: 9850,
    EMAAR: 8.45,
    FAB: 13.80,
    DEWA: 2.92,
  },
};

/** Generate realistic OHLCV candles with volatility clustering */
export function generateMockCandles(
  market: MarketType,
  symbol: string,
  count: number = 300,
  timeframeMs: number = 60 * 60 * 1000 // 1H default
): Candle[] {
  const market_prices = BASE_PRICES[market];
  const basePrice = market_prices[symbol] ?? 1000;

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
  const basePrice = BASE_PRICES[market]?.[symbol] ?? 1000;
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
    { symbol: 'NIFTY 50', price: 24976.95, change: 126.85, changePct: 0.51 },
    { symbol: 'BANKNIFTY', price: 53362.75, change: 164.20, changePct: 0.31 },
    { symbol: 'SENSEX', price: 82410.50, change: 382.40, changePct: 0.47 },
    { symbol: 'RELIANCE', price: 2966.75, change: -13.10, changePct: -0.44 },
    { symbol: 'TCS', price: 4237.32, change: -12.75, changePct: -0.30 },
    { symbol: 'HDFCBANK', price: 1779.92, change: -5.00, changePct: -0.28 },
    { symbol: 'INFY', price: 1924.40, change: 18.60, changePct: 0.98 },
    { symbol: 'ICICIBANK', price: 1248.80, change: 8.20, changePct: 0.66 },
    { symbol: 'ITC', price: 489.15, change: -1.25, changePct: -0.25 },
    { symbol: 'WIPRO', price: 544.60, change: 4.80, changePct: 0.89 },
  ],
  USA: [
    { symbol: 'S&P 500', price: 5482.30, change: 24.15, changePct: 0.44 },
    { symbol: 'NASDAQ 100', price: 19215.60, change: 148.90, changePct: 0.78 },
    { symbol: 'DOW JONES', price: 43120.40, change: -45.20, changePct: -0.10 },
    { symbol: 'NVDA', price: 875.40, change: 21.60, changePct: 2.53 },
    { symbol: 'AAPL', price: 228.60, change: 1.45, changePct: 0.64 },
    { symbol: 'MSFT', price: 432.80, change: -2.10, changePct: -0.48 },
    { symbol: 'TSLA', price: 248.50, change: 5.75, changePct: 2.37 },
    { symbol: 'META', price: 562.10, change: 7.40, changePct: 1.33 },
    { symbol: 'AMZN', price: 198.30, change: -0.85, changePct: -0.43 },
    { symbol: 'GOOGL', price: 176.40, change: 1.20, changePct: 0.68 },
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
