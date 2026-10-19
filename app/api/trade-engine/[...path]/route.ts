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
    { instrumentToken: 900001, symbol: 'SPX', base: 766.48, change: 3.23, changePercent: 0.42 },
    { instrumentToken: 900002, symbol: 'S&P 500', base: 766.48, change: 3.23, changePercent: 0.42 },
    { instrumentToken: 900003, symbol: 'NDX', base: 718.36, change: 8.56, changePercent: 1.21 },
    { instrumentToken: 900004, symbol: 'NASDAQ 100', base: 718.36, change: 8.56, changePercent: 1.21 },
    { instrumentToken: 900005, symbol: 'NASDAQ', base: 718.36, change: 8.56, changePercent: 1.21 },
    { instrumentToken: 900006, symbol: 'DJI', base: 518.92, change: -0.18, changePercent: -0.03 },
    { instrumentToken: 900007, symbol: 'DOW JONES', base: 518.92, change: -0.18, changePercent: -0.03 },
    { instrumentToken: 900008, symbol: 'VIX', base: 17.01, change: -0.72, changePercent: -4.06 },
    { instrumentToken: 900009, symbol: 'QQQ', base: 718.36, change: 8.56, changePercent: 1.21 },
    { instrumentToken: 900010, symbol: 'NVDA', base: 217.09, change: 2.96, changePercent: 1.38 },
    { instrumentToken: 900011, symbol: 'AAPL', base: 342.94, change: -0.52, changePercent: -0.15 },
    { instrumentToken: 900012, symbol: 'MSFT', base: 533.52, change: 4.47, changePercent: 0.84 },
    { instrumentToken: 900013, symbol: 'TSLA', base: 368.06, change: 13.34, changePercent: 3.76 },
    { instrumentToken: 900014, symbol: 'META', base: 705.44, change: -3.89, changePercent: -0.55 },
    { instrumentToken: 900015, symbol: 'AMZN', base: 262.45, change: 12.45, changePercent: 4.98 },
    { instrumentToken: 900016, symbol: 'GOOGL', base: 344.18, change: 3.59, changePercent: 1.05 },
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
    // 6 Major Commodities
    { yahoo: 'GC=F', symbols: ['GOLD', 'XAU/USD', 'XAUUSD', 'XAU'], format: (p: number) => p.toFixed(2) },
    { yahoo: 'SI=F', symbols: ['SILVER', 'XAG/USD', 'XAGUSD', 'XAG'], format: (p: number) => p.toFixed(2) },
    { yahoo: 'BZ=F', symbols: ['CRUDEOIL', 'BRENT', 'OIL'], format: (p: number) => p.toFixed(2) },
    { yahoo: 'CL=F', symbols: ['WTI', 'CRUDE_WTI'], format: (p: number) => p.toFixed(2) },
    { yahoo: 'NG=F', symbols: ['NATGAS', 'NATURALGAS'], format: (p: number) => p.toFixed(3) },
    { yahoo: 'HG=F', symbols: ['COPPER', 'HIGH_GRADE_COPPER'], format: (p: number) => p.toFixed(3) },

    // 6 Major Forex Pairs
    { yahoo: 'EURUSD=X', symbols: ['EURUSD', 'EUR/USD'], format: (p: number) => p.toFixed(4) },
    { yahoo: 'GBPUSD=X', symbols: ['GBPUSD', 'GBP/USD'], format: (p: number) => p.toFixed(4) },
    { yahoo: 'USDJPY=X', symbols: ['USDJPY', 'USD/JPY'], format: (p: number) => p.toFixed(2) },
    { yahoo: 'USDINR=X', symbols: ['USDINR', 'USD/INR'], format: (p: number) => p.toFixed(2) },
    { yahoo: 'USDCHF=X', symbols: ['USDCHF', 'USD/CHF'], format: (p: number) => p.toFixed(4) },
    { yahoo: 'AUDUSD=X', symbols: ['AUDUSD', 'AUD/USD'], format: (p: number) => p.toFixed(4) },

    // Global Macro Benchmarks
    { yahoo: 'DX-Y.NYB', symbols: ['DXY'], format: (p: number) => p.toFixed(2) },
    { yahoo: '^TNX', symbols: ['US10Y'], format: (p: number) => `${p.toFixed(2)}%` },
    { yahoo: '^VIX', symbols: ['VIX'], format: (p: number) => p.toFixed(2) },
  ];

  try {
    const promises = symbolMap.map(async (item) => {
      const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
      for (const host of hosts) {
        try {
          const res = await fetch(
            `https://${host}/v8/finance/chart/${encodeURIComponent(item.yahoo)}?interval=1d&range=1d`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json',
              },
              cache: 'no-store',
            }
          );
          if (res.status === 429) continue; // Rate limited on host, failover to next host
          if (!res.ok) continue;

          const json = await res.json();
          const meta = json?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice;
          const prevClose = meta?.chartPreviousClose || price;
          if (typeof price === 'number') {
            const chg = +(price - prevClose).toFixed(2);
            const chgPct = +((chg / Math.max(0.001, prevClose)) * 100).toFixed(2);
            return item.symbols.map(sym => ({
              symbol: sym,
              value: item.format(price),
              change: chg,
              changePercent: chgPct,
            }));
          }
        } catch {
          // Continue to next host
        }
      }
      return null;
    });

    const settled = await Promise.all(promises);
    const results = settled.filter((item): item is NonNullable<typeof item> => item !== null).flat();
    if (results.length >= 6) {
      return { value: results, Count: results.length };
    }
  } catch (err) {
    console.warn('[YahooMacro] Error fetching Yahoo macro data:', err);
  }
  return null;
}

const DEFAULT_TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY || '3925d32210e845e087ea7b75b1b7720b';

async function fetchTwelveDataUsPrices(apiKey: string): Promise<any[]> {
  // Query only the 7 US Strategic Watchlist stocks (7 symbols = 7 credits, strictly <= 8 credits/min limit)
  const stockSymbols = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'META', 'AMZN', 'GOOGL'];
  const tokenMap: Record<string, number> = {
    NVDA: 900010,
    AAPL: 900011,
    MSFT: 900012,
    TSLA: 900013,
    META: 900014,
    AMZN: 900015,
    GOOGL: 900016,
  };

  try {
    const symbolsParam = stockSymbols.join(',');
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbolsParam}&apikey=${apiKey}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const raw = await res.json();
    if (!raw || typeof raw !== 'object' || raw.status === 'error') {
      if (raw?.message) {
        console.warn('[TwelveDataUsPrices] API notice:', raw.message);
      }
      return [];
    }

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
        ltp: +ltp.toFixed(2),
        change: +chg.toFixed(2),
        changePercent: +pct.toFixed(2),
        timestamp: now,
      });
    }
    return items;
  } catch (err) {
    console.warn('[TwelveDataUsPrices] Error fetching Twelve Data quotes:', err);
    return [];
  }
}

async function fetchYahooFallbackUsPrices(): Promise<any[]> {
  const stockMap = [
    { yahoo: 'NVDA', token: 900010 },
    { yahoo: 'AAPL', token: 900011 },
    { yahoo: 'MSFT', token: 900012 },
    { yahoo: 'TSLA', token: 900013 },
    { yahoo: 'META', token: 900014 },
    { yahoo: 'AMZN', token: 900015 },
    { yahoo: 'GOOGL', token: 900016 },
  ];

  try {
    const promises = stockMap.map(async (item) => {
      const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
      for (const host of hosts) {
        try {
          const res = await fetch(`https://${host}/v8/finance/chart/${item.yahoo}?interval=1d&range=1d`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json',
            },
            cache: 'no-store',
          });
          if (res.status === 429) continue;
          if (!res.ok) continue;

          const json = await res.json();
          const meta = json?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice;
          const prevClose = meta?.chartPreviousClose || price;
          if (typeof price === 'number') {
            const chg = +(price - prevClose).toFixed(2);
            const pct = +((chg / Math.max(0.001, prevClose)) * 100).toFixed(2);
            return {
              instrumentToken: item.token,
              symbol: item.yahoo,
              ltp: +price.toFixed(2),
              change: chg,
              changePercent: pct,
              timestamp: Date.now(),
            };
          }
        } catch {
          // Try next host
        }
      }
      return null;
    });

    const settled = await Promise.all(promises);
    return settled.filter((s): s is NonNullable<typeof s> => s !== null);
  } catch {
    return [];
  }
}

let lastTwelveDataCallTimestamp = 0;

async function fetchTwelveDataIndices(apiKey: string): Promise<any[]> {
  try {
    // 3 Index (SPY for SPX, QQQ for NDX, DIA for DJI) + 1 VIX (VIXY for VIX) = 4 symbols = 4 credits
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=SPY,QQQ,DIA,VIXY&apikey=${apiKey}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const raw = await res.json();
    if (!raw || typeof raw !== 'object' || raw.status === 'error') {
      if (raw?.message) {
        console.warn('[TwelveDataIndices] API notice:', raw.message);
      }
      return [];
    }

    const now = Date.now();
    const items: any[] = [];

    if (raw.SPY && raw.SPY.close) {
      const ltp = parseFloat(raw.SPY.close);
      const prevClose = parseFloat(raw.SPY.previous_close || raw.SPY.close);
      const chg = parseFloat(raw.SPY.change || (ltp - prevClose).toFixed(2));
      const pct = parseFloat(raw.SPY.percent_change || (((ltp - prevClose) / Math.max(0.01, prevClose)) * 100).toFixed(2));
      items.push({ instrumentToken: 900001, symbol: 'SPX', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
      items.push({ instrumentToken: 900002, symbol: 'S&P 500', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
    }

    if (raw.QQQ && raw.QQQ.close) {
      const ltp = parseFloat(raw.QQQ.close);
      const prevClose = parseFloat(raw.QQQ.previous_close || raw.QQQ.close);
      const chg = parseFloat(raw.QQQ.change || (ltp - prevClose).toFixed(2));
      const pct = parseFloat(raw.QQQ.percent_change || (((ltp - prevClose) / Math.max(0.01, prevClose)) * 100).toFixed(2));
      items.push({ instrumentToken: 900003, symbol: 'NDX', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
      items.push({ instrumentToken: 900004, symbol: 'NASDAQ 100', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
      items.push({ instrumentToken: 900005, symbol: 'NASDAQ', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
      items.push({ instrumentToken: 900009, symbol: 'QQQ', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
    }

    if (raw.DIA && raw.DIA.close) {
      const ltp = parseFloat(raw.DIA.close);
      const prevClose = parseFloat(raw.DIA.previous_close || raw.DIA.close);
      const chg = parseFloat(raw.DIA.change || (ltp - prevClose).toFixed(2));
      const pct = parseFloat(raw.DIA.percent_change || (((ltp - prevClose) / Math.max(0.01, prevClose)) * 100).toFixed(2));
      items.push({ instrumentToken: 900006, symbol: 'DJI', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
      items.push({ instrumentToken: 900007, symbol: 'DOW JONES', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
    }

    if (raw.VIXY && raw.VIXY.close) {
      const ltp = parseFloat(raw.VIXY.close);
      const prevClose = parseFloat(raw.VIXY.previous_close || raw.VIXY.close);
      const chg = parseFloat(raw.VIXY.change || (ltp - prevClose).toFixed(2));
      const pct = parseFloat(raw.VIXY.percent_change || (((ltp - prevClose) / Math.max(0.01, prevClose)) * 100).toFixed(2));
      items.push({ instrumentToken: 900008, symbol: 'VIX', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
      items.push({ instrumentToken: 900008, symbol: 'Volatility Index', ltp: +ltp.toFixed(2), change: +chg.toFixed(2), changePercent: +pct.toFixed(2), timestamp: now });
    }

    return items;
  } catch (err) {
    console.warn('[TwelveDataIndices] Error fetching Twelve Data indices:', err);
    return [];
  }
}

async function fetchRealUsIndices(): Promise<any[]> {
  const indexMap = [
    { yahoo: '^GSPC', symbol: 'SPX', altSymbol: 'S&P 500', token: 900001, altToken: 900002 },
    { yahoo: '^NDX', symbol: 'NDX', altSymbol: 'NASDAQ 100', token: 900003, altToken: 900004 },
    { yahoo: '^DJI', symbol: 'DJI', altSymbol: 'DOW JONES', token: 900006, altToken: 900007 },
    { yahoo: '^VIX', symbol: 'VIX', altSymbol: 'Volatility Index', token: 900008, altToken: 900008 },
    { yahoo: 'QQQ', symbol: 'QQQ', altSymbol: 'QQQ', token: 900009, altToken: 900009 },
  ];

  try {
    const promises = indexMap.map(async (item) => {
      const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
      for (const host of hosts) {
        try {
          const res = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(item.yahoo)}?interval=1d&range=1d`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json',
            },
            cache: 'no-store',
          });
          if (res.status === 429) continue;
          if (!res.ok) continue;

          const json = await res.json();
          const meta = json?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice;
          const prevClose = meta?.chartPreviousClose || price;
          if (typeof price === 'number') {
            const chg = +(price - prevClose).toFixed(2);
            const pct = +((chg / Math.max(0.001, prevClose)) * 100).toFixed(2);
            const now = Date.now();
            const results = [
              { instrumentToken: item.token, symbol: item.symbol, ltp: +price.toFixed(2), change: chg, changePercent: pct, timestamp: now },
            ];
            if (item.symbol !== item.altSymbol) {
              results.push({ instrumentToken: item.altToken, symbol: item.altSymbol, ltp: +price.toFixed(2), change: chg, changePercent: pct, timestamp: now });
            }
            if (item.symbol === 'NDX') {
              results.push({ instrumentToken: 900005, symbol: 'NASDAQ', ltp: +price.toFixed(2), change: chg, changePercent: pct, timestamp: now });
            }
            return results;
          }
        } catch {
          // Try next host
        }
      }
      return [];
    });

    const settled = await Promise.all(promises);
    return settled.flat();
  } catch {
    return [];
  }
}

async function getActiveUsPrices(): Promise<any[]> {
  const isUsOpen = isMarketOpen('USA');
  // 30 min cache TTL plan (48 updates/day * 11 symbols = 528 credits/day, well within 800 daily limit)
  const ttl = isUsOpen ? (30 * 60 * 1000) : (60 * 60 * 1000);

  let cachedStocks = getCached('twelve-data-stocks', ttl);
  let cachedIndices = getCached('twelve-data-indices', ttl);

  if (cachedStocks && cachedIndices) {
    return [...cachedIndices, ...cachedStocks];
  }

  const apiKey = DEFAULT_TWELVE_DATA_KEY;
  const now = Date.now();

  // 1. Fetch 7 US stocks from Twelve Data (7 symbols = 7 credits, strictly <= 8/min limit)
  if (!cachedStocks && apiKey) {
    const fetched = await fetchTwelveDataUsPrices(apiKey);
    if (fetched.length > 0) {
      setCached('twelve-data-stocks', fetched);
      cachedStocks = fetched;
      lastTwelveDataCallTimestamp = Date.now();
    }
  }

  // 2. Fetch 3 Index + 1 VIX from Twelve Data (4 symbols = 4 credits, strictly <= 8/min limit)
  if (!cachedIndices && apiKey) {
    const timeSinceLastCall = now - lastTwelveDataCallTimestamp;
    // Ensure >= 60s cooldown if stocks were fetched in this same minute
    if (timeSinceLastCall >= 60000 || lastTwelveDataCallTimestamp === 0) {
      const fetched = await fetchTwelveDataIndices(apiKey);
      if (fetched.length > 0) {
        setCached('twelve-data-indices', fetched);
        cachedIndices = fetched;
        lastTwelveDataCallTimestamp = Date.now();
      }
    } else {
      cachedIndices = serverCache['twelve-data-indices']?.data || null;
    }
  }

  // Fallbacks if Twelve Data temporarily unreachable
  if (!cachedStocks) {
    cachedStocks = await fetchYahooFallbackUsPrices();
  }
  if (!cachedIndices) {
    cachedIndices = await fetchRealUsIndices();
  }

  const combined = [...(cachedIndices || []), ...(cachedStocks || [])];
  if (combined.length > 0) {
    return combined;
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
    const isCommOpen = isMarketOpen('COMMODITY');
    // Active session: 30m TTL (only 30 requests/hr across 15 symbols, ~1.5% of Yahoo limit). Weekend closed: 60m TTL.
    const ttl = isCommOpen ? (30 * 60 * 1000) : (60 * 60 * 1000);

    const cachedMacro = getCached(cacheKey, ttl);
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
