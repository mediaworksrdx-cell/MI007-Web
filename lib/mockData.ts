// ─── Market Intelligence MI- 007 — Realistic Mock Data Generator ─────────────
import { Candle, MarketType } from './types';
import { getZerodhaStockPrice } from './screener/zerodhaStocks';

/** Base prices for different instruments */
const BASE_PRICES: Record<MarketType, Record<string, number>> = {
  INDIA: {
    NIFTY: 25291.10,
    BANKNIFTY: 61575.90,
    SENSEX: 82104.79,
    FINNIFTY: 28015.40,
    RELIANCE: 1344.80,
    TCS: 2405.00,
    HDFCBANK: 816.50,
    INFY: 1145.10,
    SBIN: 1090.50,
    TATAMOTORS: 262.40,
    LT: 4140.00,
    ICICIBANK: 1585.00,
    BHARTIARTL: 2153.50,
    ITC: 295.10,
  },
  USA: {
    SPX: 7399.50,
    'S&P 500': 7399.50,
    NDX: 27131.75,
    'NASDAQ 100': 27131.75,
    NASDAQ: 27131.75,
    DJI: 51568.00,
    'DOW JONES': 51568.00,
    QQQ: 661.75,
    SPY: 739.95,
    DIA: 515.68,
    VIX: 19.57,
    RUT: 2721.37,
    'RUSSELL 2000': 2721.37,
    NVDA: 156.14,
    AAPL: 352.78,
    MSFT: 517.99,
    TSLA: 379.74,
    AMZN: 257.75,
    META: 626.41,
    GOOGL: 283.72,
    GOOG: 283.72,
  },
  UAE: {
    DFMGI: 4850,
    'DFM GENERAL': 4850,
    ADXGI: 9250,
    ADX: 9250,
    'ADX GENERAL': 9250,
    'FTSE ADX 15': 9410.20,
    EMAAR: 8.48,
    FAB: 13.85,
    DEWA: 2.94,
    ALDAR: 6.82,
    ENBD: 18.65,
    ADNOC: 3.78,
    AIRARABIA: 2.65,
  },
};

const CRYPTO_BASE_PRICES: Record<string, number> = {
  BTC: 64682.67,
  ETH: 2403.44,
  SOL: 104.37,
  BNB: 726.72,
  DOGE: 0.079,
  SHIB: 0.0000185,
  XRP: 1.31,
  ADA: 0.218,
  AVAX: 9.60,
  DOT: 1.16,
  LINK: 12.09,
  MATIC: 0.126,
};

export const COMMODITY_BASE_PRICES: Record<string, number> = {
  GOLD: 3856.74,
  XAU: 3856.74,
  XAUUSD: 3856.74,
  SILVER: 42.39,
  XAG: 42.39,
  XAGUSD: 42.39,
  CRUDEOIL: 58.67,
  BRENT: 58.67,
  WTI: 56.40,
  NATGAS: 2.85,
  COPPER: 4.38,
  PLATINUM: 1024.50,
};

export const FOREX_BASE_PRICES: Record<string, number> = {
  EURUSD: 1.0997,
  GBPUSD: 1.3388,
  USDJPY: 157.28,
  USDINR: 84.15,
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
      waveTrend = Math.random() > 0.50 ? 1 : -1;
      waveSteps = Math.floor(3 + Math.random() * 6); // 3 to 8 bars per swing
    }
    waveSteps--;

    // Healthy institutional candle body with mean reversion pull to prevent exponential drift
    const variance = (0.5 + Math.random() * 1.0);
    const deviation = (basePrice - price) / Math.max(1, basePrice);
    const meanReversion = deviation * 0.15;
    const direction = (Math.random() > 0.50 ? waveTrend : -waveTrend) + meanReversion;
    const movePct = basePct * variance * direction;
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

  // Anchor the entire historical series to terminate precisely at basePrice
  // This guarantees smooth scale alignment with live ticks and eliminates vertical price jumps
  if (candles.length > 0) {
    const finalClose = candles[candles.length - 1].close;
    if (finalClose > 0 && Math.abs(finalClose - basePrice) > 0.0001) {
      const scale = basePrice / finalClose;
      for (let j = 0; j < candles.length; j++) {
        candles[j].open = +(candles[j].open * scale).toFixed(decimals);
        candles[j].high = +(candles[j].high * scale).toFixed(decimals);
        candles[j].low = +(candles[j].low * scale).toFixed(decimals);
        candles[j].close = +(candles[j].close * scale).toFixed(decimals);
      }
      candles[candles.length - 1].close = basePrice;
    }
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
    { symbol: 'NIFTY', price: 25291.10, change: 0.0, changePct: 0.0 },
    { symbol: 'BANKNIFTY', price: 61575.90, change: 0.0, changePct: 0.0 },
    { symbol: 'SENSEX', price: 82104.79, change: 0.0, changePct: 0.0 },
    { symbol: 'RELIANCE', price: 1344.80, change: 0.0, changePct: 0.0 },
    { symbol: 'TCS', price: 2405.00, change: 0.0, changePct: 0.0 },
    { symbol: 'HDFCBANK', price: 816.50, change: 0.0, changePct: 0.0 },
    { symbol: 'INFY', price: 1145.10, change: 0.0, changePct: 0.0 },
    { symbol: 'ICICIBANK', price: 1585.00, change: 0.0, changePct: 0.0 },
    { symbol: 'TATAMOTORS', price: 262.40, change: 0.0, changePct: 0.0 },
    { symbol: 'SBIN', price: 1090.50, change: 0.0, changePct: 0.0 },
    { symbol: 'BHARTIARTL', price: 2153.50, change: 0.0, changePct: 0.0 },
  ],
  USA: [
    { symbol: 'S&P 500', price: 7399.50, change: -144.20, changePct: -1.91 },
    { symbol: 'NASDAQ 100', price: 27131.75, change: -743.74, changePct: -2.67 },
    { symbol: 'DOW JONES', price: 51568.00, change: -750.00, changePct: -1.43 },
    { symbol: 'VIX', price: 19.57, change: 1.65, changePct: 9.21 },
    { symbol: 'NVDA', price: 156.14, change: -6.71, changePct: -4.12 },
    { symbol: 'AAPL', price: 352.78, change: -3.49, changePct: -0.98 },
    { symbol: 'MSFT', price: 517.99, change: -5.89, changePct: -1.12 },
    { symbol: 'TSLA', price: 379.74, change: -10.48, changePct: -2.69 },
    { symbol: 'META', price: 626.41, change: -15.28, changePct: -2.38 },
    { symbol: 'AMZN', price: 257.75, change: -8.91, changePct: -3.34 },
    { symbol: 'GOOGL', price: 283.72, change: -12.05, changePct: -4.07 },
  ],
  UAE: [
    { symbol: 'DFMGI', price: 4850.00, change: 20.60, changePct: 0.43 },
    { symbol: 'ADXGI', price: 9250.00, change: -21.40, changePct: -0.23 },
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
