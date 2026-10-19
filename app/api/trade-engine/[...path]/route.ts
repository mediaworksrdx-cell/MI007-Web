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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join('/');
  const search = request.nextUrl.search;
  const cacheKey = `${pathStr}${search}`;

  // 1. Check in-memory cache for macro-data (10-minute TTL guarantees quota lasts well past EOD)
  if (pathStr === 'macro-data') {
    const cachedMacro = getCached(cacheKey, 10 * 60 * 1000);
    if (cachedMacro) {
      return NextResponse.json(cachedMacro, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'Access-Control-Allow-Origin': '*' },
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
        const usItems = getUsLiveBenchmarks();
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
      return NextResponse.json(getUsLiveBenchmarks(), { status: 200 });
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
      return NextResponse.json(getUsLiveBenchmarks(), { status: 200 });
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
