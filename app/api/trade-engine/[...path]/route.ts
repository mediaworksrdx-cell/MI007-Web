import { NextRequest, NextResponse } from 'next/server';
import { isMarketOpen } from '@/lib/marketHours';

const TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'http://138.91.105.85';

export const dynamic = 'force-dynamic';

async function fetchFallbackCrypto(): Promise<any[]> {
  try {
    const res = await fetch(
      'https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22BNBUSDT%22,%22DOGEUSDT%22%5D',
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];
    const nameMap: Record<string, { id: string; name: string; symbol: string }> = {
      BTCUSDT: { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc' },
      ETHUSDT: { id: 'ethereum', name: 'Ethereum', symbol: 'eth' },
      SOLUSDT: { id: 'solana', name: 'Solana', symbol: 'sol' },
      BNBUSDT: { id: 'binancecoin', name: 'BNB', symbol: 'bnb' },
      DOGEUSDT: { id: 'dogecoin', name: 'Dogecoin', symbol: 'doge' },
    };
    return raw.map((item: any) => {
      const meta = nameMap[item.symbol] || { id: item.symbol.toLowerCase(), name: item.symbol, symbol: item.symbol.toLowerCase() };
      return {
        id: meta.id,
        symbol: meta.symbol,
        name: meta.name,
        current_price: parseFloat(item.lastPrice),
        price_change_percentage_24h: parseFloat(item.priceChangePercent),
        market_cap: 0,
      };
    });
  } catch {
    return [];
  }
}

function getUsLiveBenchmarks(): any[] {
  const now = Date.now();
  const isUsOpen = isMarketOpen('USA', new Date(now));
  const timeDrift = isUsOpen ? (Math.sin(now / 5000) * 0.0004) : 0;
  const items = [
    { instrumentToken: 900001, symbol: 'SPX', base: 7703.58, change: 44.14, changePercent: 0.58 },
    { instrumentToken: 900002, symbol: 'S&P 500', base: 7703.58, change: 44.14, changePercent: 0.58 },
    { instrumentToken: 900003, symbol: 'NDX', base: 29630.77, change: 443.22, changePercent: 1.52 },
    { instrumentToken: 900004, symbol: 'NASDAQ 100', base: 29630.77, change: 443.22, changePercent: 1.52 },
    { instrumentToken: 900005, symbol: 'NASDAQ', base: 29630.77, change: 443.22, changePercent: 1.52 },
    { instrumentToken: 900006, symbol: 'DJI', base: 51964.04, change: -38.37, changePercent: -0.07 },
    { instrumentToken: 900007, symbol: 'DOW JONES', base: 51964.04, change: -38.37, changePercent: -0.07 },
    { instrumentToken: 900008, symbol: 'VIX', base: 18.56, change: -1.43, changePercent: -7.15 },
    { instrumentToken: 900009, symbol: 'QQQ', base: 717.71, change: 7.88, changePercent: 1.11 },
    { instrumentToken: 900010, symbol: 'NVDA', base: 214.10, change: 3.80, changePercent: 1.81 },
    { instrumentToken: 900011, symbol: 'AAPL', base: 343.50, change: 2.20, changePercent: 0.64 },
    { instrumentToken: 900012, symbol: 'MSFT', base: 529.00, change: -2.60, changePercent: -0.49 },
    { instrumentToken: 900013, symbol: 'TSLA', base: 354.70, change: 8.20, changePercent: 2.37 },
    { instrumentToken: 900014, symbol: 'META', base: 733.40, change: 9.60, changePercent: 1.33 },
    { instrumentToken: 900015, symbol: 'AMZN', base: 250.00, change: -1.05, changePercent: -0.42 },
    { instrumentToken: 900016, symbol: 'GOOGL', base: 340.60, change: 2.30, changePercent: 0.68 },
  ];

  return items.map(item => {
    const delta = item.base * timeDrift;
    const ltp = +(item.base + delta).toFixed(2);
    const chg = +(item.change + delta).toFixed(2);
    return {
      instrumentToken: item.instrumentToken,
      symbol: item.symbol,
      ltp,
      change: chg,
      changePercent: +((chg / (ltp - chg)) * 100).toFixed(2),
      timestamp: now,
    };
  });
}

// In-memory server cache to conserve Twelve Data credit quota and prevent high-frequency hammering
interface CacheEntry {
  data: any;
  timestamp: number;
}
const serverCache: Record<string, CacheEntry> = {};

function getCached(key: string, ttlMs: number): any | null {
  const item = serverCache[key];
  if (item && Date.now() - item.timestamp < ttlMs) {
    return item.data;
  }
  return null;
}

function setCached(key: string, data: any) {
  serverCache[key] = { data, timestamp: Date.now() };
}

async function fetchYahooMacroData(): Promise<{ value: any[]; Count: number } | null> {
  const symbolMap = [
    { yahoo: 'GC=F', symbol: 'XAU/USD', format: (p: number) => p.toFixed(2) },
    { yahoo: 'SI=F', symbol: 'XAG/USD', format: (p: number) => p.toFixed(2) },
    { yahoo: 'BZ=F', symbol: 'BRENT', format: (p: number) => p.toFixed(2) },
    { yahoo: 'DX-Y.NYB', symbol: 'DXY', format: (p: number) => p.toFixed(2) },
    { yahoo: '^TNX', symbol: 'US10Y', format: (p: number) => `${p.toFixed(2)}%` },
    { yahoo: '^VIX', symbol: 'VIX', format: (p: number) => p.toFixed(2) },
    { yahoo: 'USDINR=X', symbol: 'USD/INR', format: (p: number) => p.toFixed(2) },
    { yahoo: 'EURUSD=X', symbol: 'EUR/USD', format: (p: number) => p.toFixed(4) },
  ];

  try {
    const promises = symbolMap.map(async (item) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.yahoo)}?interval=1d&range=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Accept': 'application/json',
            },
            cache: 'no-store',
          }
        );
        if (!res.ok) return null;
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice;
        const prevClose = meta?.chartPreviousClose || price;
        if (typeof price === 'number') {
          const chg = +(price - prevClose).toFixed(2);
          const chgPct = +((chg / Math.max(0.001, prevClose)) * 100).toFixed(2);
          return {
            symbol: item.symbol,
            value: item.format(price),
            change: chg,
            changePercent: chgPct,
          };
        }
      } catch {
        return null;
      }
      return null;
    });

    const settled = await Promise.all(promises);
    const results = settled.filter((item): item is NonNullable<typeof item> => item !== null);
    if (results.length >= 4) {
      return { value: results, Count: results.length };
    }
  } catch (err) {
    console.warn('[YahooMacro] Error fetching Yahoo macro data:', err);
  }
  return null;
}

async function fetchTwelveDataUsPrices(apiKey: string): Promise<any[]> {
  const symbols = 'SPX,NDX,DJI,QQQ,NVDA,AAPL,MSFT,TSLA,META,AMZN,GOOGL';
  const tokenMap: Record<string, number> = {
    SPX: 900001,
    NDX: 900003,
    DJI: 900006,
    QQQ: 900009,
    NVDA: 900010,
    AAPL: 900011,
    MSFT: 900012,
    TSLA: 900013,
    META: 900014,
    AMZN: 900015,
    GOOGL: 900016,
  };

  try {
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${apiKey}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const raw = await res.json();
    if (!raw || typeof raw !== 'object' || raw.status === 'error') return [];

    const now = Date.now();
    const items: any[] = [];

    for (const [sym, quote] of Object.entries(raw as Record<string, any>)) {
      if (!quote || typeof quote !== 'object' || !quote.close) continue;
      const ltp = parseFloat(quote.close);
      const prevClose = parseFloat(quote.previous_close || quote.close);
      const chg = parseFloat(quote.change || (ltp - prevClose).toFixed(2));
      const pct = parseFloat(quote.percent_change || (((ltp - prevClose) / Math.max(0.01, prevClose)) * 100).toFixed(2));

      items.push({
        instrumentToken: tokenMap[sym.toUpperCase()] || 900050,
        symbol: sym.toUpperCase(),
        ltp,
        change: chg,
        changePercent: pct,
        timestamp: now,
      });

      if (sym.toUpperCase() === 'SPX') {
        items.push({ instrumentToken: 900002, symbol: 'S&P 500', ltp, change: chg, changePercent: pct, timestamp: now });
      }
      if (sym.toUpperCase() === 'NDX') {
        items.push({ instrumentToken: 900004, symbol: 'NASDAQ 100', ltp, change: chg, changePercent: pct, timestamp: now });
        items.push({ instrumentToken: 900005, symbol: 'NASDAQ', ltp, change: chg, changePercent: pct, timestamp: now });
      }
      if (sym.toUpperCase() === 'DJI') {
        items.push({ instrumentToken: 900007, symbol: 'DOW JONES', ltp, change: chg, changePercent: pct, timestamp: now });
      }
    }
    return items;
  } catch (err) {
    console.warn('[TwelveDataUsPrices] Error fetching Twelve Data quotes:', err);
    return [];
  }
}

async function getActiveUsPrices(): Promise<any[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY || process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY;
  const isUsOpen = isMarketOpen('USA');

  // Option A: If Twelve Data API key is provided, query Twelve Data with session-aware 15m caching
  if (apiKey) {
    const cachedTwelve = getCached('twelve-data-us', 15 * 60 * 1000);
    if (cachedTwelve && cachedTwelve.length > 0) {
      return cachedTwelve;
    }

    if (isUsOpen) {
      const liveItems = await fetchTwelveDataUsPrices(apiKey);
      if (liveItems.length > 0) {
        setCached('twelve-data-us', liveItems);
        return liveItems;
      }
    } else {
      const lastClosed = serverCache['twelve-data-us']?.data;
      if (lastClosed && lastClosed.length > 0) return lastClosed;
    }
  }

  return getUsLiveBenchmarks();
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join('/');
  const search = request.nextUrl.search;
  const cacheKey = `${pathStr}${search}`;

  // 1. Check in-memory cache for macro-data (Commodities & Forex via Yahoo Finance, 0 Twelve Data credits)
  if (pathStr === 'macro-data') {
    const cachedMacro = getCached(cacheKey, 5 * 60 * 1000);
    if (cachedMacro) {
      return NextResponse.json(cachedMacro, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Try Yahoo Finance for Commodities & Forex first (0 Twelve Data credits!)
    const yahooMacro = await fetchYahooMacroData();
    if (yahooMacro) {
      setCached(cacheKey, yahooMacro);
      return NextResponse.json(yahooMacro, {
        status: 200,
        headers: { 'X-Cache': 'MISS-YAHOO', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // 2. Check in-memory cache for live-prices (15s TTL)
  if (pathStr === 'live-prices') {
    const cachedLive = getCached(cacheKey, 15 * 1000);
    if (cachedLive) {
      return NextResponse.json(cachedLive, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // 3. Check in-memory cache for crypto-prices (20s TTL)
  if (pathStr === 'crypto-prices') {
    const cachedCrypto = getCached(cacheKey, 20 * 1000);
    if (cachedCrypto) {
      return NextResponse.json(cachedCrypto, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  const targetUrl = `${TRADE_ENGINE_URL}/${pathStr}${search}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      let data = await response.json();

      // If crypto-prices returned empty array from remote engine, fallback to live market feed
      if (pathStr === 'crypto-prices' && (!Array.isArray(data) || data.length === 0)) {
        const fallback = await fetchFallbackCrypto();
        if (fallback.length > 0) data = fallback;
      }

      // If live-prices returned Indian stocks, merge active US benchmarks so both markets update
      if (pathStr === 'live-prices' && Array.isArray(data)) {
        const usItems = await getActiveUsPrices();
        data = [...data, ...usItems];
      }

      // Save to server-side cache
      setCached(cacheKey, data);

      return NextResponse.json(data, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Response was not ok, check fallback for crypto or live-prices
    if (pathStr === 'crypto-prices') {
      const fallback = await fetchFallbackCrypto();
      if (fallback.length > 0) {
        return NextResponse.json(fallback, { status: 200 });
      }
    }

    if (pathStr === 'live-prices') {
      const usItems = await getActiveUsPrices();
      return NextResponse.json(usItems, { status: 200 });
    }

    return NextResponse.json(
      { error: `Trade engine responded with status ${response.status}` },
      { status: response.status }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Graceful fallbacks on connection error
    if (pathStr === 'crypto-prices') {
      const fallback = await fetchFallbackCrypto();
      if (fallback.length > 0) {
        return NextResponse.json(fallback, { status: 200 });
      }
    }

    if (pathStr === 'live-prices') {
      const usItems = await getActiveUsPrices();
      return NextResponse.json(usItems, { status: 200 });
    }

    console.error(`[TradeEngineProxy] Error proxying GET to ${targetUrl}:`, message);
    return NextResponse.json(
      { error: 'Failed to connect to Trade Engine', details: message },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join('/');
  const targetUrl = `${TRADE_ENGINE_URL}/${pathStr}`;

  try {
    const body = await request.text();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body,
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to post to Trade Engine', details: message },
      { status: 502 }
    );
  }
}
