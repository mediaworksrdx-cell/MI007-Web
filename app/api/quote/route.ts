import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_SEED_ITEMS } from '@/lib/seedData';
import { normalizeSymbolKey } from '@/lib/tradeEngineClient';
import { getZerodhaStockPrice, findZerodhaStockBySymbol } from '@/lib/screener/zerodhaStocks';
import { fetchTwelveDataQuote } from '@/lib/twelveDataService';

export const dynamic = 'force-dynamic';

const YAHOO_GLOBAL_MAP: Record<string, string> = {
  // US Cash Indices & Benchmarks (Authentic Index Feeds)
  'SPX': '^GSPC',
  'S&P 500': '^GSPC',
  'SP500': '^GSPC',
  'NDX': '^IXIC',
  'NASDAQ': '^IXIC',
  'NASDAQ 100': '^NDX',
  'DJI': '^DJI',
  'DOW JONES': '^DJI',
  'DOW': '^DJI',
  'VIX': '^VIX',
  'QQQ': 'QQQ',
  'SPY': 'SPY',
  'DIA': 'DIA',

  // Top US Equities
  'NVDA': 'NVDA',
  'AAPL': 'AAPL',
  'MSFT': 'MSFT',
  'TSLA': 'TSLA',
  'AMZN': 'AMZN',
  'META': 'META',
  'GOOGL': 'GOOGL',
  'GOOG': 'GOOGL',

  // Indian Indices & Equities
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'NIFTY50': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'BANK NIFTY': '^NSEBANK',
  'NIFTYBANK': '^NSEBANK',
  'SENSEX': '^BSESN',
  'BSE SENSEX': '^BSESN',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
  'NIFTY FINANCIAL': 'NIFTY_FIN_SERVICE.NS',
  'RELIANCE': 'RELIANCE.NS',
  'TCS': 'TCS.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'INFY': 'INFY.NS',
  'ICICIBANK': 'ICICIBANK.NS',
  'TATAMOTORS': 'TMPV.NS',
  'TATA MOTORS': 'TMPV.NS',
  'SBIN': 'SBIN.NS',
  'BHARTIARTL': 'BHARTIARTL.NS',
  'ITC': 'ITC.NS',
  'LT': 'LT.NS',

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
};

// In-memory quote cache with 15-second TTL to keep live prices blazing fast
interface CachedQuote {
  timestamp: number;
  data: {
    instrumentToken: number;
    symbol: string;
    ltp: number;
    change: number;
    changePercent: number;
    timestamp: number;
  };
}
const quoteCache = new Map<string, CachedQuote>();
const QUOTE_TTL_MS = 15_000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || '';
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol query parameter required' }, { status: 400 });
  }

  const cleanUpper = symbol.toUpperCase().trim();
  const cleanKey = normalizeSymbolKey(symbol);

  // Check in-memory cache
  const cached = quoteCache.get(cleanUpper) || quoteCache.get(cleanKey);
  if (cached && Date.now() - cached.timestamp < QUOTE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // 1. Authentic Quote from Yahoo Finance (Works 24/7/365 for live ticks and official exchange closes)
  const yahooSym = YAHOO_GLOBAL_MAP[cleanUpper] || YAHOO_GLOBAL_MAP[cleanKey];
  if (yahooSym) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m&range=5d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          const ltp = +meta.regularMarketPrice.toFixed(yahooSym.includes('=X') ? 4 : 2);
          const prevClose = meta.chartPreviousClose || ltp;
          const change = +(ltp - prevClose).toFixed(yahooSym.includes('=X') ? 4 : 2);
          const changePercent = +(((ltp - prevClose) / Math.max(0.001, prevClose)) * 100).toFixed(2);
          const timestamp = (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000;

          const quoteData = {
            instrumentToken: 999100,
            symbol: cleanUpper,
            ltp,
            change,
            changePercent,
            timestamp,
          };
          quoteCache.set(cleanUpper, { timestamp: Date.now(), data: quoteData });
          return NextResponse.json(quoteData);
        }
      }
    } catch (_yErr) {
      // Fall through to Twelve Data or Seed
    }
  }

  // 2. Twelve Data Quote for Forex, Commodities, or US equities
  if (cleanUpper.includes('/') || cleanUpper.endsWith('USD') || ['EURUSD', 'GBPUSD', 'USDJPY', 'USDINR'].includes(cleanUpper)) {
    try {
      const tdQuote = await fetchTwelveDataQuote(cleanUpper);
      if (tdQuote && tdQuote.price > 0) {
        const quoteData = {
          instrumentToken: 999000,
          symbol: cleanUpper,
          ltp: tdQuote.price,
          change: tdQuote.change,
          changePercent: tdQuote.changePct,
          timestamp: Date.now(),
        };
        quoteCache.set(cleanUpper, { timestamp: Date.now(), data: quoteData });
        return NextResponse.json(quoteData);
      }
    } catch (_err) {
      // Fall through
    }
  }

  // 3. Seed items
  const seed = INITIAL_SEED_ITEMS.find(
    (item) => normalizeSymbolKey(item.symbol) === cleanKey || item.symbol.toUpperCase() === cleanUpper
  );

  let ltp = seed ? seed.price : 0;
  let change = seed ? seed.change : 0;
  let changePercent = seed ? seed.changePct : 0;

  // 4. Indian stocks fallback
  if (ltp <= 0) {
    const zd = findZerodhaStockBySymbol(cleanKey);
    if (zd && zd.lastPrice && zd.lastPrice > 0) {
      ltp = zd.lastPrice;
    } else {
      ltp = getZerodhaStockPrice(cleanKey);
    }
  }

  const finalData = {
    instrumentToken: 999999,
    symbol: cleanUpper,
    ltp,
    change,
    changePercent,
    timestamp: Date.now(),
  };
  return NextResponse.json(finalData);
}
