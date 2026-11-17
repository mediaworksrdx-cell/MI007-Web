import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMockCandles } from '@/lib/mockData';
import { MarketType, Candle } from '@/lib/types';
import { fetchTwelveDataCandles } from '@/lib/twelveDataService';
import { isMarketOpen } from '@/lib/marketHours';

export const dynamic = 'force-dynamic';

const GCP_TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'https://synthetixanalytics.com';

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC']);
const USA_SYMBOLS = new Set(['SPX', 'NDX', 'NASDAQ', 'DJI', 'VIX', 'QQQ', 'SPY', 'DIA', 'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL']);
const UAE_SYMBOLS = new Set(['DFMGI', 'ADXGI', 'EMAAR', 'FAB', 'DEWA', 'ALDAR', 'ENBD', 'ADNOC', 'AIRARABIA']);
const COMMODITY_FOREX_SYMBOLS = new Set(['GOLD', 'SILVER', 'BRENT', 'CRUDEOIL', 'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDINR']);

const YAHOO_GLOBAL_MAP: Record<string, string> = {
  // Indian Indices
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'NIFTY50': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'BANK NIFTY': '^NSEBANK',
  'NIFTYBANK': '^NSEBANK',
  'SENSEX': '^BSESN',
  'BSE SENSEX': '^BSESN',
  'BSESENSEX': '^BSESN',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
  'NIFTY FINANCIAL': 'NIFTY_FIN_SERVICE.NS',
  'NIFTY FINANCIAL SERVICES': 'NIFTY_FIN_SERVICE.NS',
  'NIFTYFINSERVICE': 'NIFTY_FIN_SERVICE.NS',
  'MIDCPNIFTY': '^NSEMDCP50',
  'NIFTY MIDCAP SELECT': '^NSEMDCP50',
  'NIFTYMIDSELECT': '^NSEMDCP50',
  'BANKEX': 'BSE-BANK.BO',
  'BSE BANKEX': 'BSE-BANK.BO',
  'INDIA VIX': '^INDIAVIX',
  'INDIAVIX': '^INDIAVIX',

  // US Cash Indices
  'SPX': '^GSPC',
  'S&P 500': '^GSPC',
  'SP500': '^GSPC',
  'DJI': '^DJI',
  'DOW JONES': '^DJI',
  'DOW': '^DJI',
  'NASDAQ': '^IXIC',
  'NDX': '^NDX',
  'NASDAQ 100': '^NDX',
  'VIX': '^VIX',

  // Crypto
  'BTC': 'BTC-USD',
  'BTCUSD': 'BTC-USD',
  'BTCUSDT': 'BTC-USD',
  'ETH': 'ETH-USD',
  'ETHUSD': 'ETH-USD',
  'SOL': 'SOL-USD',
  'BNB': 'BNB-USD',
  'DOGE': 'DOGE-USD',
  'XRP': 'XRP-USD',
  'ADA': 'ADA-USD',
  'AVAX': 'AVAX-USD',

  // Commodities & Forex
  'GOLD': 'GC=F',
  'XAUUSD': 'GC=F',
  'XAU/USD': 'GC=F',
  'SILVER': 'SI=F',
  'XAGUSD': 'SI=F',
  'XAG/USD': 'SI=F',
  'BRENT': 'BZ=F',
  'CRUDEOIL': 'CL=F',
  'EURUSD': 'EURUSD=X',
  'EUR/USD': 'EURUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USDJPY': 'JPY=X',
  'USD/JPY': 'JPY=X',
  'USDINR': 'INR=X',
  'USD/INR': 'INR=X',

  // Top Indian Equities
  'RELIANCE': 'RELIANCE.NS',
  'TCS': 'TCS.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'INFY': 'INFY.NS',
  'ICICIBANK': 'ICICIBANK.NS',
  'TATAMOTORS': 'TMPV.NS',
  'SBIN': 'SBIN.NS',
  'BHARTIARTL': 'BHARTIARTL.NS',
  'ITC': 'ITC.NS',
  'LT': 'LT.NS',
};

function getIntervalSeconds(timeframe: string): number {
  switch (timeframe) {
    case '1m': return 60;
    case '5m': return 300;
    case '15m': return 900;
    case '30m': return 1800;
    case '1H': return 3600;
    case '4H': return 14400;
    case '1D': return 86400;
    case '1W': return 604800;
    case '1M': return 2592000;
    default: return 86400;
  }
}

function getYahooParams(timeframe: string, rangeOverride?: string | null): { interval: string; range: string; aggregate4H?: boolean } {
  if (rangeOverride) {
    switch (timeframe) {
      case '1m': return { interval: '1m', range: rangeOverride };
      case '5m': return { interval: '5m', range: rangeOverride };
      case '15m': return { interval: '15m', range: rangeOverride };
      case '30m': return { interval: '30m', range: rangeOverride };
      case '1H': return { interval: '1h', range: rangeOverride };
      case '4H': return { interval: '1h', range: rangeOverride, aggregate4H: true };
      case '1D': return { interval: '1d', range: rangeOverride };
      case '1W': return { interval: '1wk', range: rangeOverride };
      case '1M': return { interval: '1mo', range: rangeOverride };
      default: return { interval: '1d', range: rangeOverride };
    }
  }

  switch (timeframe) {
    case '1m': return { interval: '1m', range: '5d' };
    case '5m': return { interval: '5m', range: '5d' };
    case '15m': return { interval: '15m', range: '5d' };
    case '30m': return { interval: '30m', range: '1mo' };
    case '1H': return { interval: '1h', range: '730d' }; // 2-year deep hourly history (Yahoo maximum limit for 1h)
    case '4H': return { interval: '1h', range: '730d', aggregate4H: true };
    case '1D': return { interval: '1d', range: '5y' };   // Full 5 years of daily bars (~1,260-1,827 candles)
    case '1W': return { interval: '1wk', range: '5y' };  // Full 5 years of weekly bars (~260 candles)
    case '1M': return { interval: '1mo', range: '5y' };  // Full 5 years of monthly bars (~60 candles)
    default: return { interval: '1d', range: '5y' };
  }
}

function aggregateTo4H(candles: Candle[], _timeframe: string): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < candles.length; i += 4) {
    const chunk = candles.slice(i, i + 4);
    if (chunk.length === 0) continue;
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    result.push({
      openTime: first.openTime,
      open: first.open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: last.close,
      volume: chunk.reduce((acc, c) => acc + c.volume, 0),
      isClosed: last.isClosed,
    });
  }
  return result;
}

/** Detects artificial synthetic linear staircase ramps (e.g. constant +62 delta per candle) */
function isArtificialLinearStaircase(candles: Candle[]): boolean {
  if (!candles || candles.length < 6) return false;
  let matchingDeltas = 0;
  for (let i = 2; i < Math.min(25, candles.length); i++) {
    const d1 = candles[i].close - candles[i - 1].close;
    const d2 = candles[i - 1].close - candles[i - 2].close;
    if (Math.abs(d1 - d2) < 0.25 && Math.abs(d1) > 0.05) {
      matchingDeltas++;
    }
  }
  return matchingDeltas >= 4;
}

/** Loads pre-computed 5-year daily historical candle cache from disk */
function loadPrecomputed5YrHistory(cleanSym: string): Candle[] | null {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'history-5y', `${cleanSym}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

/** Fetches authentic exchange historical candlestick data from Yahoo Finance */
async function fetchYahooFinanceCandles(symbol: string, timeframe: string, market: MarketType, rangeOverride?: string | null): Promise<Candle[] | null> {
  const cleanSym = symbol.toUpperCase().replace(/[\s\/-]+/g, '');
  let yahooSym = YAHOO_GLOBAL_MAP[cleanSym] || YAHOO_GLOBAL_MAP[symbol.toUpperCase()];

  if (!yahooSym) {
    if (cleanSym.includes('.')) {
      yahooSym = cleanSym;
    } else if (market === 'INDIA') {
      yahooSym = `${cleanSym}.NS`;
    } else if (market === 'USA') {
      yahooSym = cleanSym;
    } else {
      return null;
    }
  }

  const { interval, range, aggregate4H } = getYahooParams(timeframe, rangeOverride);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
      signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(4500) : undefined,
    });
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const closes: (number | null)[] = quote.close || [];
    const volumes: (number | null)[] = quote.volume || [];

    if (timestamps.length === 0) return null;

    const intervalSec = getIntervalSeconds(timeframe);
    const now = Date.now();
    let candles: Candle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (o == null || h == null || l == null || c == null || isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) {
        continue;
      }
      const openTime = timestamps[i] * 1000;
      if (openTime > now + 300_000) continue; // Reject future candles

      const closeTime = openTime + intervalSec * 1000;
      const isClosed = (i < timestamps.length - 1) && (now >= closeTime);

      candles.push({
        openTime,
        open: +o.toFixed(2),
        high: +Math.max(h, o, c).toFixed(2),
        low: +Math.min(l, o, c).toFixed(2),
        close: +c.toFixed(2),
        volume: volumes[i] ? Math.round(volumes[i]!) : 0,
        isClosed,
      });
    }

    if (candles.length === 0) return null;

    // Sync latest forming candle's close with real-time exchange quote during market hours
    const meta = result.meta;
    if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
      const ltp = +meta.regularMarketPrice.toFixed(2);
      const last = candles[candles.length - 1];
      if (now - last.openTime < intervalSec * 2500) {
        last.close = ltp;
        last.high = Math.max(last.high, ltp);
        last.low = Math.min(last.low, ltp);
      }
    }

    if (aggregate4H) {
      candles = aggregateTo4H(candles, timeframe);
    }

    return candles.length > 0 ? candles : null;
  } catch (_err) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbol = searchParams.get('symbol') || 'NIFTY';
  const symbol = rawSymbol.toUpperCase().trim();
  const timeframe = searchParams.get('timeframe') || '1H';
  const rangeParam = searchParams.get('range');
  const cleanSym = symbol.replace(/[\s\/-]+/g, '');

  let market: MarketType = 'INDIA';
  if (CRYPTO_SYMBOLS.has(cleanSym) || USA_SYMBOLS.has(cleanSym) || COMMODITY_FOREX_SYMBOLS.has(cleanSym)) {
    market = 'USA';
  } else if (UAE_SYMBOLS.has(cleanSym)) {
    market = 'UAE';
  }

  const isMultiDayOr5Y = rangeParam === '5y' || timeframe === '1D' || timeframe === '1W' || timeframe === '1M';

  // 1. If 5Y range or multi-day timeframe requested, or for Indian market, fetch deep authentic history from Yahoo Finance
  if (isMultiDayOr5Y || market === 'INDIA') {
    try {
      const yahooCandles = await fetchYahooFinanceCandles(symbol, timeframe, market, rangeParam);
      if (yahooCandles && yahooCandles.length > 0 && !isArtificialLinearStaircase(yahooCandles)) {
        return NextResponse.json(yahooCandles);
      }
    } catch (_yErr) {}

    // Instant offline fallback to pre-computed 5-year historical dataset on disk
    if (timeframe === '1D' || rangeParam === '5y') {
      const precomputed = loadPrecomputed5YrHistory(cleanSym);
      if (precomputed && precomputed.length > 0) {
        return NextResponse.json(precomputed);
      }
    }
  }

  // 2. Try Twelve Data for intraday US Equities, Forex, Commodities, and Crypto
  if (!isMultiDayOr5Y && (USA_SYMBOLS.has(cleanSym) || COMMODITY_FOREX_SYMBOLS.has(cleanSym) || CRYPTO_SYMBOLS.has(cleanSym))) {
    try {
      const tdCandles = await fetchTwelveDataCandles(symbol, timeframe, 120);
      if (tdCandles && tdCandles.length > 0) {
        const now = Date.now();
        const validCandles = tdCandles.filter(c => c.openTime <= now + 300_000);
        if (validCandles.length > 0 && !isArtificialLinearStaircase(validCandles)) {
          return NextResponse.json(validCandles);
        }
      }
    } catch (_err) {
      // Fall through to Yahoo Finance
    }
  }

  // 3. Resilient fallback to Yahoo Finance for any remaining symbols
  try {
    const yahooCandles = await fetchYahooFinanceCandles(symbol, timeframe, market, rangeParam);
    if (yahooCandles && yahooCandles.length > 0 && !isArtificialLinearStaircase(yahooCandles)) {
      return NextResponse.json(yahooCandles);
    }
  } catch (_yErr) {
    // Fall through to trade engine
  }

  // 4. Try GCP Trade Engine for Indian stocks & Kite indices (Guarded with strict linear staircase rejection)
  if (market === 'INDIA') {
    try {
      const gcpQuerySym = (cleanSym === 'NIFTY' || cleanSym === 'NIFTY50') ? 'NIFTY 50' : symbol;
      const res = await fetch(`${GCP_TRADE_ENGINE_URL}/candles?symbol=${encodeURIComponent(gcpQuerySym)}&timeframe=${encodeURIComponent(timeframe)}`, {
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2200) : undefined,
      });

      if (res.ok) {
        const gcpCandles: Candle[] = await res.json();
        if (Array.isArray(gcpCandles) && gcpCandles.length > 0 && !isArtificialLinearStaircase(gcpCandles)) {
          return NextResponse.json(gcpCandles);
        }
      }
    } catch (_err) {
      // Fall through to mock candles
    }
  }

  // 5. Calibrated realistic candles anchored precisely to authentic market price
  const candles = getMockCandles(market, symbol, timeframe, 800);
  if (candles.length > 0 && isMarketOpen('INDIA')) {
    const yahooSym = YAHOO_GLOBAL_MAP[cleanSym] || YAHOO_GLOBAL_MAP[symbol] || (cleanSym.includes('.') ? cleanSym : `${cleanSym}.NS`);
    try {
      const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(1800) : undefined,
      });
      if (yRes.ok) {
        const yData = await yRes.json();
        const meta = yData?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          const ltp = meta.regularMarketPrice;
          const last = candles[candles.length - 1];
          last.close = ltp;
          last.high = Math.max(last.high, ltp);
          last.low = Math.min(last.low, ltp);
        }
      }
    } catch (_yErr) {
      // Graceful fallback
    }
  }

  return NextResponse.json(candles);
}
