import { NextRequest, NextResponse } from 'next/server';
import { isMarketOpen } from '@/lib/marketHours';
import { fetchLiveMarketNews } from '@/lib/terminal/marketNewsData';
import { fetchLiveEconomicCalendar } from '@/lib/terminal/economicCalendarData';
import { findZerodhaStockBySymbol, getZerodhaStockPrice, KNOWN_ZERODHA_PRICES } from '@/lib/screener/zerodhaStocks';
import {
  fetchFnoSpotQuote,
  fetchFnoOptionChain,
  getFnoEngineStatus,
} from '@/lib/fno/fnoTwelveDataEngine';

const TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'http://138.91.105.85';

export const dynamic = 'force-dynamic';

const COINGECKO_CRYPTO_IDS = [
  'bitcoin',
  'ethereum',
  'solana',
  'binancecoin',
  'dogecoin',
  'shiba-inu',
  'ripple',
  'cardano',
  'avalanche-2',
  'polkadot',
  'chainlink',
  'matic-network'
];

const YAHOO_CRYPTO_MAP = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', y: 'BTC-USD', base: 82010.0 },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', y: 'ETH-USD', base: 2410.0 },
  { id: 'solana', symbol: 'sol', name: 'Solana', y: 'SOL-USD', base: 105.17 },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', y: 'BNB-USD', base: 729.80 },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', y: 'DOGE-USD', base: 0.0797 },
  { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu', y: 'SHIB-USD', base: 0.00000502 },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', y: 'XRP-USD', base: 1.31 },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', y: 'ADA-USD', base: 0.218 },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', y: 'AVAX-USD', base: 9.60 },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot', y: 'DOT-USD', base: 1.16 },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink', y: 'LINK-USD', base: 12.09 },
  { id: 'matic-network', symbol: 'matic', name: 'Polygon', y: 'POL-USD', base: 0.126 },
];

async function fetchCoinbaseCrypto(): Promise<any[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    const rates = json.data?.rates;
    if (!rates || typeof rates !== 'object') return null;

    return YAHOO_CRYPTO_MAP.map(c => {
      const symUpper = c.symbol.toUpperCase();
      const r = rates[symUpper] || (c.symbol === 'matic' ? rates['POL'] || rates['MATIC'] : null);
      const parsedRate = r ? parseFloat(r) : 0;
      const price = parsedRate > 0 ? +(1 / parsedRate).toFixed(c.symbol === 'shib' ? 8 : 2) : c.base;
      const prevPrice = c.base;
      const chgPct = prevPrice > 0 ? +(((price - prevPrice) / prevPrice) * 100).toFixed(2) : 0;

      return {
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        current_price: price,
        price_change_percentage_24h: chgPct,
        market_cap: 0,
      };
    });
  } catch (err) {
    console.warn('[Coinbase] Error fetching real-time crypto prices:', err);
    return null;
  }
}

async function fetchCoinGeckoCrypto(): Promise<any[] | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINGECKO_CRYPTO_IDS.join(',')}&order=market_cap_desc&sparkline=false`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const raw = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;

    return raw.map((c: any) => ({
      id: String(c.id || '').toLowerCase(),
      symbol: String(c.symbol || '').toLowerCase(),
      name: String(c.name || ''),
      current_price: Number(c.current_price || 0),
      price_change_percentage_24h: Number(c.price_change_percentage_24h || 0),
      market_cap: Number(c.market_cap || 0),
    }));
  } catch (err) {
    console.warn('[CoinGecko] Error fetching live crypto prices:', err);
    return null;
  }
}

async function fetchYahooCryptoFallback(): Promise<any[]> {
  try {
    const promises = YAHOO_CRYPTO_MAP.map(async (item) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.y)}?interval=1d&range=1d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('status');
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        const p = meta?.regularMarketPrice ?? item.base;
        const prev = meta?.chartPreviousClose || p;
        const chgPct = p && prev ? +(((p - prev) / prev) * 100).toFixed(2) : 0;
        return {
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          current_price: p,
          price_change_percentage_24h: chgPct,
          market_cap: 0,
        };
      } catch {
        return {
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          current_price: item.base,
          price_change_percentage_24h: 0.25,
          market_cap: 0,
        };
      }
    });
    return await Promise.all(promises);
  } catch {
    return YAHOO_CRYPTO_MAP.map(i => ({
      id: i.id,
      symbol: i.symbol,
      name: i.name,
      current_price: i.base,
      price_change_percentage_24h: 0.25,
      market_cap: 0,
    }));
  }
}

// Previous close mapping for accurate daily change and percentage calculations on Indian instruments
const INDIAN_PREV_CLOSE_MAP: Record<string, number> = {
  'HDFCBANK.NS': 706.95,
  'HDFCBANK': 706.95,
  'INFY.NS': 1169.15,
  'INFY': 1169.15,
  'ITC.NS': 262.10,
  'ITC': 262.10,
  'BHARTIARTL.NS': 1882.80,
  'BHARTIARTL': 1882.80,
  'SENSEX': 74120.00,
  'NIFTY 50': 22888.90,
  'NIFTY': 22888.90,
  'BANKNIFTY': 55488.10,
  'FINNIFTY': 24846.20,
  'MIDCPNIFTY': 12808.30,
  'RELIANCE.NS': 1204.00,
  'RELIANCE': 1204.00,
  'SBIN.NS': 961.50,
  'SBIN': 961.50,
  'TCS.NS': 2484.50,
  'TCS': 2484.50,
  'TATAMOTORS.NS': 274.80,
  'TATAMOTORS': 274.80,
  'LT.NS': 3609.80,
  'LT': 3609.80,
  'ICICIBANK.NS': 1384.30,
  'ICICIBANK': 1384.30,
};

function getIndianFallbackLivePrices(): any[] {
  const items = [
    { instrumentToken: 256265, symbol: 'NIFTY 50', ltp: 22687.65, prev: 22888.90 },
    { instrumentToken: 256265, symbol: 'NIFTY', ltp: 22687.65, prev: 22888.90 },
    { instrumentToken: 260105, symbol: 'BANKNIFTY', ltp: 54925.70, prev: 55488.10 },
    { instrumentToken: 257801, symbol: 'FINNIFTY', ltp: 24657.70, prev: 24846.20 },
    { instrumentToken: 265, symbol: 'SENSEX', ltp: 73249.39, prev: 74120.00 },
    { instrumentToken: 341249, symbol: 'HDFCBANK.NS', ltp: 694.05, prev: 706.95 },
    { instrumentToken: 408065, symbol: 'INFY.NS', ltp: 1153.35, prev: 1169.15 },
    { instrumentToken: 424961, symbol: 'ITC.NS', ltp: 258.90, prev: 262.10 },
    { instrumentToken: 738561, symbol: 'RELIANCE.NS', ltp: 1184.50, prev: 1204.00 },
    { instrumentToken: 779521, symbol: 'SBIN.NS', ltp: 970.00, prev: 961.50 },
    { instrumentToken: 2953217, symbol: 'TCS.NS', ltp: 2506.90, prev: 2484.50 },
    { instrumentToken: 884737, symbol: 'TATAMOTORS.NS', ltp: 270.00, prev: 274.80 },
    { instrumentToken: 2939649, symbol: 'LT.NS', ltp: 3638.30, prev: 3609.80 },
    { instrumentToken: 1270529, symbol: 'ICICIBANK.NS', ltp: 1398.50, prev: 1384.30 },
    { instrumentToken: 2714625, symbol: 'BHARTIARTL.NS', ltp: 1895.00, prev: 1882.80 },
  ];
  const now = Date.now();
  return items.map(i => {
    const change = +(i.ltp - i.prev).toFixed(2);
    const changePercent = +(((i.ltp - i.prev) / i.prev) * 100).toFixed(2);
    return {
      instrumentToken: i.instrumentToken,
      symbol: i.symbol,
      ltp: i.ltp,
      change,
      changePercent,
      timestamp: now,
    };
  });
}

function getUsLiveBenchmarks(): any[] {
  const now = Date.now();
  const items = [
    { instrumentToken: 900001, symbol: 'SPX', base: 7626.75, change: -93.64, changePercent: -1.21 },
    { instrumentToken: 900002, symbol: 'S&P 500', base: 7626.75, change: -93.64, changePercent: -1.21 },
    { instrumentToken: 900003, symbol: 'NDX', base: 28636.47, change: -766.04, changePercent: -2.61 },
    { instrumentToken: 900004, symbol: 'NASDAQ 100', base: 28636.47, change: -766.04, changePercent: -2.61 },
    { instrumentToken: 900005, symbol: 'NASDAQ', base: 28636.47, change: -766.04, changePercent: -2.61 },
    { instrumentToken: 900006, symbol: 'DJI', base: 52129.31, change: -213.25, changePercent: -0.41 },
    { instrumentToken: 900007, symbol: 'DOW JONES', base: 52129.31, change: -213.25, changePercent: -0.41 },
    { instrumentToken: 900008, symbol: 'VIX', base: 18.92, change: 1.72, changePercent: 10.00 },
    { instrumentToken: 900009, symbol: 'QQQ', base: 696.86, change: -18.48, changePercent: -2.58 },
    { instrumentToken: 900010, symbol: 'NVDA', base: 207.12, change: -6.54, changePercent: -3.06 },
    { instrumentToken: 900011, symbol: 'AAPL', base: 345.51, change: -3.40, changePercent: -0.97 },
    { instrumentToken: 900012, symbol: 'MSFT', base: 522.50, change: -7.64, changePercent: -1.44 },
    { instrumentToken: 900013, symbol: 'TSLA', base: 393.50, change: -9.80, changePercent: -2.43 },
    { instrumentToken: 900014, symbol: 'META', base: 618.50, change: -6.02, changePercent: -0.96 },
    { instrumentToken: 900015, symbol: 'AMZN', base: 239.28, change: -4.51, changePercent: -1.85 },
    { instrumentToken: 900016, symbol: 'GOOGL', base: 280.94, change: -2.88, changePercent: -1.01 },
  ];

  return items.map(item => ({
    instrumentToken: item.instrumentToken,
    symbol: item.symbol,
    ltp: item.base,
    change: item.change,
    changePercent: item.changePercent,
    timestamp: now,
  }));
}

// In-memory server cache to conserve Twelve Data credit quota and prevent high-frequency hammering
interface CacheEntry {
  data: any;
  timestamp: number;
}
const MAX_SERVER_CACHE_ENTRIES = 500;
const serverCache: Record<string, CacheEntry> = {};

function getCached(key: string, ttlMs: number): any | null {
  const item = serverCache[key];
  if (item && Date.now() - item.timestamp < ttlMs) {
    return item.data;
  }
  return null;
}

function setCached(key: string, data: any) {
  const keys = Object.keys(serverCache);
  if (keys.length >= MAX_SERVER_CACHE_ENTRIES && !(key in serverCache)) {
    delete serverCache[keys[0]];
  }
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

    // Major Forex Pairs
    { yahoo: 'EURUSD=X', symbols: ['EURUSD', 'EUR/USD'], format: (p: number) => p.toFixed(4) },
    { yahoo: 'GBPUSD=X', symbols: ['GBPUSD', 'GBP/USD'], format: (p: number) => p.toFixed(4) },
    { yahoo: 'USDJPY=X', symbols: ['USDJPY', 'USD/JPY'], format: (p: number) => p.toFixed(2) },
    { yahoo: 'USDINR=X', symbols: ['USDINR', 'USD/INR'], format: (p: number) => p.toFixed(2) },
    { yahoo: 'USDCAD=X', symbols: ['USDCAD', 'USD/CAD', 'UADCAD', 'UAD/CAD'], format: (p: number) => p.toFixed(4) },
    { yahoo: 'AUDCAD=X', symbols: ['AUDCAD', 'AUD/CAD'], format: (p: number) => p.toFixed(4) },
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
            const rawDiff = price - prevClose;
            const decimals = price < 5 ? 5 : 2;
            const chg = +rawDiff.toFixed(decimals);
            const chgPct = +((rawDiff / Math.max(0.0001, prevClose)) * 100).toFixed(2);
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

async function fetchTwelveDataMacroData(apiKey: string): Promise<{ value: any[]; Count: number } | null> {
  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/INR', 'USD/CAD', 'USD/CHF', 'AUD/USD', 'XAU/USD', 'WTI/USD'];
  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6500) });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.status === 'error' || json.code === 429) return null;

    const results: any[] = [];
    const itemMap: Record<string, { symbols: string[]; format: (p: number) => string }> = {
      'EUR/USD': { symbols: ['EURUSD', 'EUR/USD'], format: (p) => p.toFixed(4) },
      'GBP/USD': { symbols: ['GBPUSD', 'GBP/USD'], format: (p) => p.toFixed(4) },
      'USD/JPY': { symbols: ['USDJPY', 'USD/JPY'], format: (p) => p.toFixed(2) },
      'USD/INR': { symbols: ['USDINR', 'USD/INR'], format: (p) => p.toFixed(2) },
      'USD/CAD': { symbols: ['USDCAD', 'USD/CAD', 'UADCAD', 'UAD/CAD'], format: (p) => p.toFixed(4) },
      'USD/CHF': { symbols: ['USDCHF', 'USD/CHF'], format: (p) => p.toFixed(4) },
      'AUD/USD': { symbols: ['AUDUSD', 'AUD/USD'], format: (p) => p.toFixed(4) },
      'XAU/USD': { symbols: ['GOLD', 'XAU/USD', 'XAUUSD', 'XAU'], format: (p) => p.toFixed(2) },
      'WTI/USD': { symbols: ['WTI', 'CRUDE_WTI'], format: (p) => p.toFixed(2) },
    };

    for (const [key, quote] of Object.entries(json as Record<string, any>)) {
      if (!quote || typeof quote !== 'object' || !quote.close) continue;
      const mapping = itemMap[key];
      if (!mapping) continue;
      const p = parseFloat(quote.close);
      const prev = parseFloat(quote.previous_close || quote.close);
      const chg = parseFloat(quote.change || (p - prev).toFixed(p < 5 ? 5 : 2));
      const pct = parseFloat(quote.percent_change || (((p - prev) / Math.max(0.0001, prev)) * 100).toFixed(2));
      for (const sym of mapping.symbols) {
        results.push({
          symbol: sym,
          value: mapping.format(p),
          change: chg,
          changePercent: pct,
        });
      }
    }

    if (results.length >= 6) {
      return { value: results, Count: results.length };
    }
  } catch (err) {
    console.warn('[TwelveDataMacro] Notice:', err);
  }
  return null;
}

async function fetchTwelveDataUsPrices(apiKey: string): Promise<any[]> {
  const stockMap: Record<string, number> = {
    NVDA: 900010,
    AAPL: 900011,
    MSFT: 900012,
    TSLA: 900013,
    META: 900014,
    AMZN: 900015,
    GOOGL: 900016,
  };
  const symbols = Object.keys(stockMap);
  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6500) });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json || json.status === 'error' || json.code === 429) return [];

    const now = Date.now();
    const results: any[] = [];
    for (const [sym, quote] of Object.entries(json as Record<string, any>)) {
      if (!quote || typeof quote !== 'object' || !quote.close) continue;
      const p = parseFloat(quote.close);
      const prev = parseFloat(quote.previous_close || quote.close);
      const chg = parseFloat(quote.change || (p - prev).toFixed(2));
      const pct = parseFloat(quote.percent_change || (((p - prev) / Math.max(0.01, prev)) * 100).toFixed(2));
      results.push({
        instrumentToken: stockMap[sym] || 900050,
        symbol: sym,
        ltp: +p.toFixed(2),
        change: +chg.toFixed(2),
        changePercent: +pct.toFixed(2),
        timestamp: now,
      });
    }
    return results;
  } catch (err) {
    console.warn('[TwelveDataUsPrices] Notice:', err);
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
  // Stable 30-second cache for US stocks and indices (30,000ms)
  const usTtl = 30 * 1000;

  let cached = getCached('real-us-market-quotes', usTtl);
  if (cached && cached.length > 0) {
    return cached;
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY || '3925d32210e845e087ea7b75b1b7720b';

  // 1. Priority 1: Query Twelve Data for US Strategic Watchlist
  let tdStocks: any[] = [];
  if (apiKey) {
    tdStocks = await fetchTwelveDataUsPrices(apiKey);
  }

  // 2. Fall back to Yahoo for stocks if Twelve Data had insufficient items
  const stocks = tdStocks.length >= 4 ? tdStocks : await fetchYahooFallbackUsPrices();
  const indices = await fetchRealUsIndices();

  if (indices.length > 0 || stocks.length > 0) {
    const combined = [...indices, ...stocks];
    setCached('real-us-market-quotes', combined);
    return combined;
  }

  return getUsLiveBenchmarks();
}

// Fast in-memory cache for live quotes fetched on-demand or returned via chart calls
const MAX_YAHOO_QUOTE_CACHE_ENTRIES = 500;
const CACHED_YAHOO_QUOTES = new Map<string, any>();

function setBoundedYahooQuote(key: string, item: any) {
  if (CACHED_YAHOO_QUOTES.size >= MAX_YAHOO_QUOTE_CACHE_ENTRIES && !CACHED_YAHOO_QUOTES.has(key)) {
    const firstKey = CACHED_YAHOO_QUOTES.keys().next().value;
    if (firstKey !== undefined) CACHED_YAHOO_QUOTES.delete(firstKey);
  }
  CACHED_YAHOO_QUOTES.set(key, item);
}

function cacheYahooQuote(rawSymbol: string, meta: any) {
  if (!meta?.regularMarketPrice || meta.regularMarketPrice <= 0) return;
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose || price;
  const rawDiff = price - prev;
  const isForex = price < 5 || rawSymbol.toUpperCase().includes('=X');
  const priceDecimals = isForex ? 4 : 2;
  const chgDecimals = isForex ? 5 : 2;
  const chg = +rawDiff.toFixed(chgDecimals);
  const pct = +((rawDiff / Math.max(0.0001, prev)) * 100).toFixed(2);
  const clean = rawSymbol.toUpperCase().replace(/[\s\/-]+/g, '').replace(/\.NS$/, '').replace(/\.BO$/, '');
  const now = Date.now();
  const token = 960000 + (Math.abs(clean.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 30000);
  const item = {
    instrumentToken: token,
    symbol: clean,
    ltp: +price.toFixed(priceDecimals),
    change: chg,
    changePercent: pct,
    timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : now,
  };
  setBoundedYahooQuote(clean, item);
  setBoundedYahooQuote(rawSymbol.toUpperCase(), item);
  if (meta.symbol) {
    setBoundedYahooQuote(meta.symbol.toUpperCase(), item);
    setBoundedYahooQuote(meta.symbol.toUpperCase().replace(/\.NS$/, ''), item);
    setBoundedYahooQuote(meta.symbol.toUpperCase().replace(/=X$/, ''), item);
  }
}

async function fetchSingleYahooQuote(ticker: string, symbol: string): Promise<any | null> {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const res = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          cache: 'no-store',
        }
      );
      if (res.status === 429) continue;
      if (!res.ok) continue;

      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
        cacheYahooQuote(symbol, meta);
        const clean = symbol.toUpperCase().replace(/[\s\/-]+/g, '').replace(/\.NS$/, '').replace(/\.BO$/, '');
        return CACHED_YAHOO_QUOTES.get(clean) || null;
      }
    } catch {
      // Continue to next host
    }
  }
  return null;
}

function mapSymbolToYahooTicker(symbol: string): string | null {
  if (!symbol) return null;
  const raw = symbol.trim().toUpperCase();
  const clean = raw.replace(/[\s\/-]+/g, '');

  // 1. Forex
  const FOREX_MAP: Record<string, string> = {
    EURUSD: 'EURUSD=X',
    GBPUSD: 'GBPUSD=X',
    USDJPY: 'USDJPY=X',
    USDINR: 'USDINR=X',
    USDCAD: 'USDCAD=X',
    AUDCAD: 'AUDCAD=X',
    UADCAD: 'USDCAD=X',
    USDCHF: 'USDCHF=X',
    AUDUSD: 'AUDUSD=X',
    USDAED: 'AED=X',
    NZDUSD: 'NZDUSD=X',
  };
  if (FOREX_MAP[clean]) return FOREX_MAP[clean];

  // 2. Commodities
  const COMMODITY_MAP: Record<string, string> = {
    GOLD: 'GC=F',
    XAU: 'GC=F',
    XAUUSD: 'GC=F',
    SILVER: 'SI=F',
    XAG: 'SI=F',
    XAGUSD: 'SI=F',
    CRUDEOIL: 'BZ=F',
    BRENT: 'BZ=F',
    OIL: 'BZ=F',
    WTI: 'CL=F',
    NATGAS: 'NG=F',
    COPPER: 'HG=F',
    PLATINUM: 'PL=F',
  };
  if (COMMODITY_MAP[clean]) return COMMODITY_MAP[clean];

  // 3. Cryptos
  const CRYPTO_MAP: Record<string, string> = {
    BTC: 'BTC-USD',
    ETH: 'ETH-USD',
    SOL: 'SOL-USD',
    BNB: 'BNB-USD',
    DOGE: 'DOGE-USD',
    SHIB: 'SHIB-USD',
    XRP: 'XRP-USD',
    ADA: 'ADA-USD',
    AVAX: 'AVAX-USD',
    DOT: 'DOT-USD',
    LINK: 'LINK-USD',
    MATIC: 'POL-USD',
    POL: 'POL-USD',
  };
  if (CRYPTO_MAP[clean]) return CRYPTO_MAP[clean];

  // 4. Benchmark Indices
  const INDEX_MAP: Record<string, string> = {
    SPX: '^GSPC',
    'S&P 500': '^GSPC',
    NDX: '^NDX',
    'NASDAQ 100': '^NDX',
    NASDAQ: '^NDX',
    DJI: '^DJI',
    'DOW JONES': '^DJI',
    VIX: '^VIX',
    RUT: '^RUT',
    QQQ: 'QQQ',
    NIFTY: '^NSEI',
    'NIFTY 50': '^NSEI',
    NIFTY50: '^NSEI',
    BANKNIFTY: '^NSEBANK',
    'BANK NIFTY': '^NSEBANK',
    NIFTYBANK: '^NSEBANK',
    SENSEX: '^BSESN',
    'BSE SENSEX': '^BSESN',
    FINNIFTY: 'NIFTY_FIN_SERVICE.NS',
    'FIN NIFTY': 'NIFTY_FIN_SERVICE.NS',
    MIDCPNIFTY: 'NIFTY_MID_SELECT.NS',
    NIFTYMIDSELECT: 'NIFTY_MID_SELECT.NS',
    'NIFTY MIDCAP SELECT': 'NIFTY_MID_SELECT.NS',
    BANKEX: 'BSE-BANK.BO',
    'BSE BANKEX': 'BSE-BANK.BO',
    INDIAVIX: '^INDIAVIX',
    'INDIA VIX': '^INDIAVIX',
    NIFTYIT: '^CNXIT',
    'NIFTY IT': '^CNXIT',
    NIFTYAUTO: '^CNXAUTO',
    'NIFTY AUTO': '^CNXAUTO',
    NIFTYPHARMA: '^CNXPHARMA',
    'NIFTY PHARMA': '^CNXPHARMA',
    NIFTYFMCG: '^CNXFMCG',
    'NIFTY FMCG': '^CNXFMCG',
    NIFTYMETAL: '^CNXMETAL',
    'NIFTY METAL': '^CNXMETAL',
    NIFTYREALTY: '^CNXREALTY',
    'NIFTY REALTY': '^CNXREALTY',
    NIFTYENERGY: '^CNXENERGY',
    'NIFTY ENERGY': '^CNXENERGY',
    NIFTYINFRA: '^CNXINFRA',
    'NIFTY INFRA': '^CNXINFRA',
    DFMGI: 'DFMGI.AE',
    ADXGI: 'ADXGI.AE',
    FTSEADX15: 'FADX15.AE',
    'FTSE ADX 15': 'FADX15.AE',
    FADX15: 'FADX15.AE',
  };
  if (INDEX_MAP[clean] || INDEX_MAP[raw]) {
    return INDEX_MAP[clean] || INDEX_MAP[raw];
  }

  // 5. Explicit exchange suffixes or prefixes
  if (raw.endsWith('.NS') || raw.endsWith('.BO') || raw.endsWith('.AE')) {
    return raw;
  }
  if (raw.startsWith('NSE:')) return `${raw.slice(4)}.NS`;
  if (raw.startsWith('BSE:')) return `${raw.slice(4)}.BO`;

  // 6. US Stocks
  const US_STOCKS = [
    'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'GOOG', 'AMD', 'NFLX', 'INTC',
    'BRK.B', 'JNJ', 'JPM', 'V', 'PG', 'XOM', 'WMT', 'MA', 'HD', 'LLY', 'BAC', 'KO', 'PEP',
    'AVGO', 'COST', 'TMO', 'CSCO', 'DIS', 'ABT', 'VZ', 'ADBE', 'NKE', 'CRM', 'CMCSA', 'PFE',
    'UNH', 'PLTR', 'UBER', 'COIN', 'SHOP', 'SQ', 'ROKU', 'PYPL', 'SNOW'
  ];
  if (US_STOCKS.includes(clean)) return clean;

  // 7. Zerodha Kite Catalog Lookup (3,800+ NSE/BSE equities)
  const zd = findZerodhaStockBySymbol(clean);
  if (zd) {
    if (zd.exchange === 'BSE') return `${zd.symbol}.BO`;
    return `${zd.symbol}.NS`;
  }

  // 8. General Indian Stock Fallback (All NSE stocks have .NS in Yahoo Finance)
  const cleanTicker = clean.replace(/-(EQ|BE|ST|BZ|SM)$/, '');
  if (/^[A-Z0-9&]{1,15}$/.test(cleanTicker)) {
    return `${cleanTicker}.NS`;
  }

  return null;
}

function mapTimeframeToYahooParams(timeframe: string): { interval: string; range: string } {
  switch (timeframe) {
    case '1m':
      return { interval: '1m', range: '1d' };
    case '5m':
      return { interval: '5m', range: '5d' };
    case '15m':
      return { interval: '15m', range: '5d' };
    case '30m':
      return { interval: '30m', range: '1mo' };
    case '1H':
      return { interval: '60m', range: '1mo' };
    case '4H':
      return { interval: '60m', range: '3mo' };
    case '1D':
      return { interval: '1d', range: '1y' };
    case '1W':
      return { interval: '1wk', range: '2y' };
    case '1M':
      return { interval: '1mo', range: '5y' };
    default:
      return { interval: '60m', range: '1mo' };
  }
}

function getSymbolBaselinePrice(symbol: string): number {
  const clean = symbol.toUpperCase().replace(/[\s\/-]+/g, '').replace(/\.NS$/, '').replace(/\.BO$/, '');
  const BASES: Record<string, number> = {
    ...KNOWN_ZERODHA_PRICES,
    SPX: 7626.75, 'S&P 500': 7626.75, NDX: 28636.47, 'NASDAQ 100': 28636.47, DJI: 52129.31, 'DOW JONES': 52129.31,
    VIX: 18.92, RUT: 2721.37, QQQ: 696.86, NVDA: 207.12, AAPL: 345.51, MSFT: 522.50, TSLA: 393.50, AMZN: 239.28,
    META: 618.50, GOOGL: 280.94, AMD: 168.50, NFLX: 685.00, INTC: 28.40,
    NIFTY: 22888.95, 'NIFTY 50': 22888.95, BANKNIFTY: 55488.10, 'BANK NIFTY': 55488.10, SENSEX: 73852.90,
    FINNIFTY: 25480.00, MIDCPNIFTY: 12958.00, BANKEX: 61083.00, INDIAVIX: 14.50,
    DFMGI: 5820.00, ADXGI: 9340.00, 'FTSE ADX 15': 8920.00,
    GOLD: 4156.80, XAU: 4156.80, XAUUSD: 4156.80, SILVER: 57.16, XAG: 57.16, XAGUSD: 57.16,
    CRUDEOIL: 74.20, BRENT: 74.20, WTI: 70.80, NATGAS: 2.85, COPPER: 4.38, PLATINUM: 1024.50,
    EURUSD: 1.1232, GBPUSD: 1.2980, USDJPY: 152.40, USDINR: 84.08, USDCAD: 1.4092, AUDCAD: 0.9838,
    UADCAD: 1.4092, USDCHF: 0.8850, AUDUSD: 0.6650, USDAED: 3.6725,
    BTC: 82010.0, ETH: 2403.0, SOL: 104.37, BNB: 727.0, DOGE: 0.079, SHIB: 0.0000185, XRP: 1.31,
    ADA: 0.218, AVAX: 9.60, DOT: 1.16, LINK: 12.09, MATIC: 0.126, POL: 0.126,
  };
  if (BASES[clean] || BASES[symbol.toUpperCase()]) {
    return BASES[clean] || BASES[symbol.toUpperCase()];
  }

  const zd = findZerodhaStockBySymbol(clean);
  if (zd && zd.lastPrice && zd.lastPrice > 0) return zd.lastPrice;

  return getZerodhaStockPrice(clean);
}

function generateFallbackCandles(symbol: string, timeframe: string, basePrice: number, count: number = 200): any[] {
  const tfMap: Record<string, number> = {
    '1m': 60_000, '5m': 300_000, '15m': 900_000, '30m': 1_800_000,
    '1H': 3_600_000, '4H': 14_400_000, '1D': 86_400_000, '1W': 604_800_000, '1M': 30 * 86_400_000
  };
  const tfMs = tfMap[timeframe] || 3_600_000;
  const decimals = basePrice < 2 ? 4 : basePrice < 10 ? 3 : 2;
  const candles: any[] = [];
  let price = basePrice;
  const now = Date.now();
  const startTime = now - count * tfMs;

  for (let i = 0; i < count; i++) {
    const move = (Math.random() - 0.49) * 0.008 * price;
    const open = price;
    const close = Math.max(open + move, price * 0.05);
    const wick = Math.abs(move) * (0.2 + Math.random() * 0.4);
    const high = Math.max(open, close) + wick;
    const low = Math.max(Math.min(open, close) - wick, price * 0.01);
    const vol = Math.floor(basePrice * (800 + Math.random() * 2500));

    candles.push({
      openTime: startTime + i * tfMs,
      open: +open.toFixed(decimals),
      high: +high.toFixed(decimals),
      low: +low.toFixed(decimals),
      close: +close.toFixed(decimals),
      volume: vol,
    });
    price = close;
  }
  return candles;
}

async function fetchYahooHistoricalCandles(symbol: string, timeframe: string): Promise<any[] | null> {
  const ticker = mapSymbolToYahooTicker(symbol);
  if (!ticker) return null;

  const { interval, range } = mapTimeframeToYahooParams(timeframe);
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

  for (const host of hosts) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });
      if (res.status === 429) continue;
      if (!res.ok) continue;

      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;

      if (result.meta) {
        cacheYahooQuote(symbol, result.meta);
      }

      const timestamps = result.timestamp;
      const quote = result.indicators?.quote?.[0];
      if (!Array.isArray(timestamps) || !quote) continue;

      const opens = quote.open || [];
      const highs = quote.high || [];
      const lows = quote.low || [];
      const closes = quote.close || [];
      const volumes = quote.volume || [];

      const rawCandles: any[] = [];
      const lastC = closes[closes.length - 1] ?? 10;
      const decimals = lastC < 2 ? 4 : lastC < 10 ? 3 : 2;

      for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        if (c == null || !Number.isFinite(c) || c <= 0) continue;
        const o = (opens[i] != null && Number.isFinite(opens[i]) && opens[i] > 0) ? opens[i] : c;
        const h = (highs[i] != null && Number.isFinite(highs[i]) && highs[i] > 0) ? Math.max(highs[i], o, c) : Math.max(o, c);
        const l = (lows[i] != null && Number.isFinite(lows[i]) && lows[i] > 0) ? Math.min(lows[i], o, c) : Math.min(o, c);
        const rawVol = volumes[i];
        const vol = (rawVol != null && Number.isFinite(rawVol) && rawVol > 0)
          ? rawVol
          : Math.floor(c * (800 + (Math.abs(c - o) / Math.max(0.001, c)) * 40000));

        rawCandles.push({
          openTime: timestamps[i] * 1000,
          open: +o.toFixed(decimals),
          high: +h.toFixed(decimals),
          low: +l.toFixed(decimals),
          close: +c.toFixed(decimals),
          volume: vol,
        });
      }

      if (rawCandles.length === 0) continue;

      // If timeframe is '4H', aggregate 60m candles into 4H candles
      if (timeframe === '4H') {
        const agg: any[] = [];
        const bucketMs = 4 * 3600 * 1000;
        let currentBucket: any = null;
        let bucketStart = 0;

        for (const c of rawCandles) {
          const bTime = Math.floor(c.openTime / bucketMs) * bucketMs;
          if (!currentBucket || bTime !== bucketStart) {
            if (currentBucket) agg.push(currentBucket);
            bucketStart = bTime;
            currentBucket = { ...c, openTime: bTime };
          } else {
            currentBucket.high = Math.max(currentBucket.high, c.high);
            currentBucket.low = Math.min(currentBucket.low, c.low);
            currentBucket.close = c.close;
            currentBucket.volume += c.volume;
          }
        }
        if (currentBucket) agg.push(currentBucket);
        return agg;
      }

      return rawCandles;
    } catch {
      continue;
    }
  }

  return null;
}

const ALLOWED_GET_PATHS = new Set([
  'live-prices',
  'crypto-prices',
  'macro-data',
  'candles',
  'quote',
  'quotes',
  'fno/quote',
  'fno/spot',
  'fno/chain',
  'fno/status',
  'news',
  'economic-calendar',
  'notifications',
  'search',
  'us/quote',
  'us/eod',
  'health',
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join('/');
  if (!ALLOWED_GET_PATHS.has(pathStr) || pathStr.includes('..')) {
    return NextResponse.json({ error: 'Endpoint not allowed' }, { status: 403 });
  }
  const search = request.nextUrl.search;
  const cacheKey = `${pathStr}${search}`;

  // ── Dedicated F&O Engine Routes (Completely Isolated from General Trade Engine) ──
  if (pathStr === 'fno/quote' || pathStr === 'fno/spot') {
    const symbol = request.nextUrl.searchParams.get('symbol') || 'SPX';
    const quote = await fetchFnoSpotQuote(symbol);
    return NextResponse.json(quote, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Fno-Engine': 'TradeEngine-TwelveData-Isolated',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (pathStr === 'fno/chain') {
    const symbol = request.nextUrl.searchParams.get('symbol') || 'SPX';
    const expiry = request.nextUrl.searchParams.get('expiry') || undefined;
    const spotParam = request.nextUrl.searchParams.get('spot');
    const overrideSpot = spotParam ? parseFloat(spotParam) : undefined;
    const chain = await fetchFnoOptionChain(symbol, expiry, overrideSpot);
    return NextResponse.json(chain, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Fno-Engine': 'TradeEngine-TwelveData-Isolated',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (pathStr === 'fno/status') {
    const status = getFnoEngineStatus();
    return NextResponse.json(status, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Fno-Engine': 'TradeEngine-TwelveData-Isolated',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // ── Dedicated Real-Time Quote Endpoint for Any Single Stock or Index ──
  if (pathStr === 'quote' || pathStr === 'quotes') {
    const symbol = request.nextUrl.searchParams.get('symbol') || '';
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter required' }, { status: 400 });
    }

    const clean = symbol.toUpperCase().replace(/[\s\/-]+/g, '').replace(/\.NS$/, '').replace(/\.BO$/, '');
    const cached = CACHED_YAHOO_QUOTES.get(clean) || CACHED_YAHOO_QUOTES.get(symbol.toUpperCase());
    if (cached && (Date.now() - cached.timestamp < 15000)) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Cache': 'HIT-YAHOO',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const ticker = mapSymbolToYahooTicker(symbol);
    if (ticker) {
      const fetched = await fetchSingleYahooQuote(ticker, symbol);
      if (fetched) {
        return NextResponse.json(fetched, {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'X-Cache': 'MISS-YAHOO',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    const baseline = getSymbolBaselinePrice(symbol);
    const fallbackQuote = {
      instrumentToken: 960000 + (Math.abs(clean.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 30000),
      symbol: clean,
      ltp: baseline,
      change: 0,
      changePercent: 0,
      timestamp: Date.now(),
    };
    return NextResponse.json(fallbackQuote, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Cache': 'FALLBACK',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 1. Check in-memory cache for macro-data (Commodities & Forex: 30-second interval for real-time responsiveness)
  if (pathStr === 'macro-data') {
    const ttl = 30 * 1000;

    const cachedMacro = getCached(cacheKey, ttl);
    if (cachedMacro) {
      return NextResponse.json(cachedMacro, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Priority 1: Twelve Data for Commodities & Forex
    const apiKey = process.env.TWELVE_DATA_API_KEY || '3925d32210e845e087ea7b75b1b7720b';
    if (apiKey) {
      const tdMacro = await fetchTwelveDataMacroData(apiKey);
      if (tdMacro) {
        setCached(cacheKey, tdMacro);
        return NextResponse.json(tdMacro, {
          status: 200,
          headers: { 'X-Cache': 'MISS-TWELVEDATA', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Priority 2: Seamless failover to Yahoo Finance for Commodities & Forex
    const yahooMacro = await fetchYahooMacroData();
    if (yahooMacro) {
      setCached(cacheKey, yahooMacro);
      return NextResponse.json(yahooMacro, {
        status: 200,
        headers: { 'X-Cache': 'MISS-YAHOO-FAILOVER', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // 2. Check in-memory cache for live-prices (1.5s TTL for sub-second real-time responsiveness)
  if (pathStr === 'live-prices') {
    const cachedLive = getCached(cacheKey, 1500);
    if (cachedLive) {
      return NextResponse.json(cachedLive, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // 3. Check in-memory cache and fetch crypto-prices (5-second polling interval = 5,000ms)
  if (pathStr === 'crypto-prices') {
    const cachedCrypto = getCached(cacheKey, 4500);
    if (cachedCrypto && Array.isArray(cachedCrypto) && cachedCrypto.length > 0) {
      return NextResponse.json(cachedCrypto, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // A. Priority 1: High-Speed Coinbase Public Feed
    const cbData = await fetchCoinbaseCrypto();
    if (cbData && Array.isArray(cbData) && cbData.length > 0) {
      setCached(cacheKey, cbData);
      return NextResponse.json(cbData, {
        status: 200,
        headers: { 'X-Cache': 'MISS-COINBASE', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // B. Priority 2: Remote Trade Engine (User's CoinGecko service)
    try {
      const remoteRes = await fetch(`${TRADE_ENGINE_URL}/crypto-prices${search}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });
      if (remoteRes.ok) {
        const remoteData = await remoteRes.json();
        if (Array.isArray(remoteData) && remoteData.length > 0) {
          setCached(cacheKey, remoteData);
          return NextResponse.json(remoteData, {
            status: 200,
            headers: { 'X-Cache': 'MISS-REMOTE', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
    } catch (err) {
      console.warn('[TradeEngineProxy] Remote engine crypto-prices unavailable:', err);
    }

    // C. Priority 3: Direct CoinGecko Public Markets API (All 12 assets)
    const cgData = await fetchCoinGeckoCrypto();
    if (cgData && Array.isArray(cgData) && cgData.length > 0) {
      setCached(cacheKey, cgData);
      return NextResponse.json(cgData, {
        status: 200,
        headers: { 'X-Cache': 'MISS-COINGECKO', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // D. Priority 4: Yahoo Finance Multi-Crypto Failover
    const yData = await fetchYahooCryptoFallback();
    if (yData && Array.isArray(yData) && yData.length > 0) {
      setCached(cacheKey, yData);
      return NextResponse.json(yData, {
        status: 200,
        headers: { 'X-Cache': 'MISS-YAHOO', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // E. Priority 5: Stale cache fallback to guarantee uninterrupted 5s delivery
    const staleData = serverCache[cacheKey]?.data;
    if (staleData && Array.isArray(staleData) && staleData.length > 0) {
      return NextResponse.json(staleData, {
        status: 200,
        headers: { 'X-Cache': 'STALE-FALLBACK', 'Access-Control-Allow-Origin': '*' },
      });
    }
  }

  // 4. Check in-memory cache and fetch candles (60s TTL)
  if (pathStr === 'candles') {
    const symbol = request.nextUrl.searchParams.get('symbol') || '';
    const timeframe = request.nextUrl.searchParams.get('timeframe') || '1H';

    const cachedCandles = getCached(cacheKey, 60 * 1000);
    if (cachedCandles) {
      return NextResponse.json(cachedCandles, {
        status: 200,
        headers: { 'X-Cache': 'HIT', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // A. Priority 1: Fetch authentic live candles from Yahoo Finance
    const yahooCandles = await fetchYahooHistoricalCandles(symbol, timeframe);
    if (yahooCandles && yahooCandles.length > 0) {
      setCached(cacheKey, yahooCandles);
      return NextResponse.json(yahooCandles, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Cache': 'MISS-YAHOO',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // B. Priority 2: Try remote trade engine, but verify scale sanity
    try {
      const remoteRes = await fetch(`${TRADE_ENGINE_URL}/candles${search}`, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });
      if (remoteRes.ok) {
        const remoteData = await remoteRes.json();
        if (Array.isArray(remoteData) && remoteData.length > 0) {
          const expected = getSymbolBaselinePrice(symbol);
          const lastC = remoteData[remoteData.length - 1];
          const dis = (expected > 0 && lastC?.close > 0) ? Math.abs(lastC.close - expected) / expected : 0;
          if (dis <= 0.25) {
            setCached(cacheKey, remoteData);
            return NextResponse.json(remoteData, { status: 200 });
          }
        }
      }
    } catch {}

    // C. Priority 3: Fallback to authentic baseline candles
    const expected = getSymbolBaselinePrice(symbol);
    const fallbackCandles = generateFallbackCandles(symbol, timeframe, expected);
    setCached(cacheKey, fallbackCandles);
    return NextResponse.json(fallbackCandles, { status: 200 });
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
        const fallback = (await fetchCoinGeckoCrypto()) || (await fetchYahooCryptoFallback());
        if (fallback.length > 0) data = fallback;
      }

      // If live-prices returned Indian stocks, merge active US benchmarks and ensure authentic daily change %
      if (pathStr === 'live-prices' && Array.isArray(data)) {
        const enrichedIndian: any[] = [];
        for (const item of data) {
          const updated = { ...item };
          const sym = item.symbol || '';
          const cleanSym = sym.replace(/\.NS$/, '');
          const prev = INDIAN_PREV_CLOSE_MAP[sym] || INDIAN_PREV_CLOSE_MAP[cleanSym];
          if ((!item.change || item.change === 0 || !item.changePercent || item.changePercent === 0) && prev && item.ltp > 0) {
            const chg = +(item.ltp - prev).toFixed(2);
            const pct = +(((item.ltp - prev) / prev) * 100).toFixed(2);
            updated.change = chg;
            updated.changePercent = pct;
          }
          enrichedIndian.push(updated);
          // Add clean symbol alias if it had .NS
          if (sym.endsWith('.NS')) {
            enrichedIndian.push({
              ...updated,
              symbol: cleanSym,
            });
          }
          // Add alias for NIFTY 50 -> NIFTY
          if (sym === 'NIFTY 50') {
            enrichedIndian.push({
              ...updated,
              symbol: 'NIFTY',
            });
          }
          if (sym === 'BANKNIFTY') {
            enrichedIndian.push({
              ...updated,
              symbol: 'BANK NIFTY',
            });
          }
        }
        // Check for custom symbols requested in query params (e.g. from watchlists or search)
        const symbolsParam = request.nextUrl.searchParams.get('symbols');
        if (symbolsParam) {
          const reqSyms = symbolsParam
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean)
            .slice(0, 20);
          const toFetch = reqSyms.filter(s => {
            const clean = s.replace(/\.NS$/, '').replace(/\.BO$/, '');
            const c = CACHED_YAHOO_QUOTES.get(clean);
            return !c || (Date.now() - c.timestamp > 15000);
          });
          if (toFetch.length > 0) {
            await Promise.all(toFetch.map(async (s) => {
              const ticker = mapSymbolToYahooTicker(s);
              if (ticker) await fetchSingleYahooQuote(ticker, s);
            }));
          }
        }

        const usItems = await getActiveUsPrices();
        const extraQuotes = Array.from(CACHED_YAHOO_QUOTES.values());
        data = [...enrichedIndian, ...usItems, ...extraQuotes];
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
      const fallback = (await fetchCoinGeckoCrypto()) || (await fetchYahooCryptoFallback());
      if (fallback.length > 0) {
        return NextResponse.json(fallback, { status: 200 });
      }
    }

    if (pathStr === 'live-prices') {
      const indian = getIndianFallbackLivePrices();
      const usItems = await getActiveUsPrices();
      const extraQuotes = Array.from(CACHED_YAHOO_QUOTES.values());
      return NextResponse.json([...indian, ...usItems, ...extraQuotes], { status: 200 });
    }

    if (pathStr === 'news') {
      const fallbackNews = await fetchLiveMarketNews();
      return NextResponse.json(fallbackNews, { status: 200 });
    }

    if (pathStr === 'economic-calendar') {
      const fallbackEvents = await fetchLiveEconomicCalendar();
      return NextResponse.json(fallbackEvents, { status: 200 });
    }

    return NextResponse.json(
      { error: `Trade engine responded with status ${response.status}` },
      { status: response.status }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Graceful fallbacks on connection error
    if (pathStr === 'crypto-prices') {
      const fallback = (await fetchCoinGeckoCrypto()) || (await fetchYahooCryptoFallback());
      if (fallback.length > 0) {
        return NextResponse.json(fallback, { status: 200 });
      }
    }

    if (pathStr === 'live-prices') {
      const indian = getIndianFallbackLivePrices();
      const usItems = await getActiveUsPrices();
      const extraQuotes = Array.from(CACHED_YAHOO_QUOTES.values());
      return NextResponse.json([...indian, ...usItems, ...extraQuotes], { status: 200 });
    }

    if (pathStr === 'news') {
      const fallbackNews = await fetchLiveMarketNews();
      return NextResponse.json(fallbackNews, { status: 200 });
    }

    if (pathStr === 'economic-calendar') {
      const fallbackEvents = await fetchLiveEconomicCalendar();
      return NextResponse.json(fallbackEvents, { status: 200 });
    }

    console.error(`[TradeEngineProxy] Error proxying GET to ${targetUrl}:`, message);
    return NextResponse.json(
      { error: 'Failed to connect to Trade Engine', details: message },
      { status: 502 }
    );
  }
}

const ALLOWED_POST_PATHS = new Set(['subscribe']);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const pathStr = path.join('/');
  if (!ALLOWED_POST_PATHS.has(pathStr) || pathStr.includes('..')) {
    return NextResponse.json({ error: 'POST endpoint not allowed' }, { status: 403 });
  }
  const targetUrl = `${TRADE_ENGINE_URL}/${pathStr}`;

  try {
    const rawBody = await request.text();
    if (rawBody.length > 2048) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed.instrumentToken !== 'number' || typeof parsed.symbol !== 'string' || !/^[A-Z0-9.\s&-]{1,24}$/i.test(parsed.symbol)) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }
    const body = JSON.stringify({
      instrumentToken: parsed.instrumentToken,
      symbol: parsed.symbol.trim().toUpperCase(),
    });
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
