import { NextResponse } from 'next/server';
import { INITIAL_SEED_ITEMS } from '@/lib/seedData';
import { isMarketOpen } from '@/lib/marketHours';

export const dynamic = 'force-dynamic';

const GCP_TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'https://synthetixanalytics.com';

export interface LivePriceResponse {
  instrumentToken: number;
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

// In-memory cache for fast sub-50ms responses and upstream rate-limit protection
let cachedPayload: LivePriceResponse[] | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 2500;

// Yahoo Finance Indian Market mapping
const INDIAN_YAHOO_MAP: Record<string, string> = {
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'BANK NIFTY': '^NSEBANK',
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
  'SBIN': 'SBIN.NS',
  'BHARTIARTL': 'BHARTIARTL.NS',
  'ITC': 'ITC.NS',
  'LT': 'LT.NS',
};

// Yahoo Finance Commodity & Forex mapping (24/5)
const COMMODITY_FOREX_YAHOO_MAP: Record<string, string> = {
  'GOLD': 'GC=F',
  'XAU/USD': 'GC=F',
  'SILVER': 'SI=F',
  'XAG/USD': 'SI=F',
  'BRENT': 'BZ=F',
  'EUR/USD': 'EURUSD=X',
  'EURUSD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'USD/JPY': 'JPY=X',
  'USDJPY': 'JPY=X',
  'USD/INR': 'INR=X',
  'USDINR': 'INR=X',
};

// Binance 24hr Crypto mapping (24/7)
const BINANCE_CRYPTO_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT', 'POLUSDT', 'SHIBUSDT'
];

const BINANCE_MAP: Record<string, string> = {
  'BTCUSDT': 'BTC',
  'ETHUSDT': 'ETH',
  'SOLUSDT': 'SOL',
  'BNBUSDT': 'BNB',
  'XRPUSDT': 'XRP',
  'DOGEUSDT': 'DOGE',
  'ADAUSDT': 'ADA',
  'AVAXUSDT': 'AVAX',
  'LINKUSDT': 'LINK',
  'DOTUSDT': 'DOT',
  'POLUSDT': 'MATIC',
  'SHIBUSDT': 'SHIB',
};

export async function GET() {
  const now = Date.now();

  // 1. Serve fresh cache if within TTL
  if (cachedPayload && (now - lastCacheTimestamp < CACHE_TTL_MS)) {
    return NextResponse.json(cachedPayload);
  }

  const pricesMap = new Map<string, LivePriceResponse>();

  // 2. Populate baseline seed items
  INITIAL_SEED_ITEMS.forEach((item, idx) => {
    pricesMap.set(item.symbol.toUpperCase(), {
      instrumentToken: 100000 + idx,
      symbol: item.symbol,
      ltp: item.price,
      change: item.change,
      changePercent: item.changePct,
      timestamp: now,
    });
  });

  const fetchPromises: Promise<void>[] = [];

  // 3. Indian Market: Check GCP Trade Engine or fallback to real-time Yahoo Finance during market hours
  const isIndiaOpen = isMarketOpen('INDIA');
  fetchPromises.push((async () => {
    let gcpFresh = false;
    try {
      const res = await fetch(`${GCP_TRADE_ENGINE_URL}/live-prices`, {
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(1800) : undefined,
      });

      if (res.ok) {
        const gcpPrices = await res.json();
        if (Array.isArray(gcpPrices) && gcpPrices.length > 0) {
          const maxTs = Math.max(...gcpPrices.map(x => x.timestamp || 0));
          if (now - maxTs < 60_000) {
            gcpFresh = true;
          }
          for (const item of gcpPrices) {
            if (!item.symbol || typeof item.ltp !== 'number' || item.ltp <= 0) continue;
            const cleanSym = item.symbol.replace(/\.NS$/, '').replace(/\.BO$/, '').trim();
            const cleanUpper = cleanSym.toUpperCase();
            const existing = pricesMap.get(cleanUpper) || pricesMap.get(item.symbol.toUpperCase());

            pricesMap.set(cleanUpper, {
              instrumentToken: item.instrumentToken || (existing?.instrumentToken ?? 200000),
              symbol: item.symbol,
              ltp: item.ltp,
              change: item.change ?? existing?.change ?? 0,
              changePercent: item.changePercent ?? existing?.changePercent ?? 0,
              timestamp: item.timestamp || now,
            });
          }
        }
      }
    } catch (_err) {
      // GCP unreachable
    }

    // If Indian market is open and GCP data is stale or unavailable, stream directly from live exchange via Yahoo Finance
    if (isIndiaOpen && !gcpFresh) {
      const indianFetches = Object.entries(INDIAN_YAHOO_MAP).map(async ([symbol, yahooSym], idx) => {
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            cache: 'no-store',
            signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
          });
          if (!res.ok) return;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;
          const ltp = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || ltp;
          const change = +(ltp - prevClose).toFixed(2);
          const changePercent = +(((ltp - prevClose) / Math.max(0.001, prevClose)) * 100).toFixed(2);
          const timestamp = (meta.regularMarketTime || Math.floor(now / 1000)) * 1000;

          const cleanUpper = symbol.toUpperCase();
          pricesMap.set(cleanUpper, {
            instrumentToken: 300000 + idx,
            symbol,
            ltp,
            change,
            changePercent,
            timestamp,
          });

          if (cleanUpper === 'NIFTY') {
            pricesMap.set('NIFTY 50', { instrumentToken: 300000 + idx, symbol: 'NIFTY 50', ltp, change, changePercent, timestamp });
            pricesMap.set('NIFTY50', { instrumentToken: 300000 + idx, symbol: 'NIFTY50', ltp, change, changePercent, timestamp });
          }
          if (cleanUpper === 'BANKNIFTY') {
            pricesMap.set('BANK NIFTY', { instrumentToken: 300000 + idx, symbol: 'BANK NIFTY', ltp, change, changePercent, timestamp });
          }
          if (cleanUpper === 'FINNIFTY') {
            pricesMap.set('NIFTY FINANCIAL', { instrumentToken: 300000 + idx, symbol: 'NIFTY FINANCIAL', ltp, change, changePercent, timestamp });
          }
          if (cleanUpper === 'SENSEX') {
            pricesMap.set('BSE SENSEX', { instrumentToken: 300000 + idx, symbol: 'BSE SENSEX', ltp, change, changePercent, timestamp });
          }
        } catch (_err) {
          // Individual symbol fetch failure graceful skip
        }
      });
      await Promise.all(indianFetches);
    }
  })());

  // 4. Crypto Market (24/7/365 live Binance streaming)
  fetchPromises.push((async () => {
    try {
      const symbolsParam = JSON.stringify(BINANCE_CRYPTO_SYMBOLS);
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`;
      const res = await fetch(url, {
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
      });

      if (res.ok) {
        const binanceData = await res.json();
        if (Array.isArray(binanceData)) {
          for (const item of binanceData) {
            const sym = BINANCE_MAP[item.symbol];
            if (!sym) continue;
            const price = parseFloat(item.lastPrice);
            const change = parseFloat(item.priceChange);
            const changePct = parseFloat(item.priceChangePercent);
            if (!isNaN(price) && price > 0) {
              const decimals = price < 0.01 ? 7 : price < 2 ? 4 : price < 20 ? 3 : 2;
              const formattedPrice = +price.toFixed(decimals);
              const formattedChange = !isNaN(change) ? +change.toFixed(decimals) : 0;
              const formattedPct = !isNaN(changePct) ? +changePct.toFixed(2) : 0;

              const entry: LivePriceResponse = {
                instrumentToken: 400000 + BINANCE_CRYPTO_SYMBOLS.indexOf(item.symbol),
                symbol: sym,
                ltp: formattedPrice,
                change: formattedChange,
                changePercent: formattedPct,
                timestamp: now,
              };

              pricesMap.set(sym, entry);
              pricesMap.set(`${sym}USDT`, entry);
              pricesMap.set(`${sym}-USD`, entry);
            }
          }
        }
      }
    } catch (_err) {
      // Graceful fallback to baseline seed crypto
    }
  })());

  // 5. Forex & Commodities (24/5 live quotes when market is open)
  if (isMarketOpen('FOREX') || isMarketOpen('COMMODITY')) {
    fetchPromises.push((async () => {
      const cfFetches = Object.entries(COMMODITY_FOREX_YAHOO_MAP).map(async ([symbol, yahooSym], idx) => {
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cache: 'no-store',
            signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
          });
          if (!res.ok) return;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;
          const ltp = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || ltp;
          const decimals = ltp < 2 ? 4 : 2;
          const change = +(ltp - prevClose).toFixed(decimals);
          const changePercent = +(((ltp - prevClose) / Math.max(0.001, prevClose)) * 100).toFixed(2);
          const timestamp = (meta.regularMarketTime || Math.floor(now / 1000)) * 1000;

          pricesMap.set(symbol.toUpperCase(), {
            instrumentToken: 500000 + idx,
            symbol,
            ltp: +ltp.toFixed(decimals),
            change,
            changePercent,
            timestamp,
          });
        } catch (_err) {
          // Graceful skip
        }
      });
      await Promise.all(cfFetches);
    })());
  }

  // 6. USA Market (Only fetch live quotes when US market is open; when closed, keep static closing prices)
  if (isMarketOpen('USA')) {
    const US_YAHOO_MAP: Record<string, { yahoo: string; mult: number }> = {
      'SPX': { yahoo: 'SPY', mult: 10.0 },
      'S&P 500': { yahoo: 'SPY', mult: 10.0 },
      'NDX': { yahoo: 'QQQ', mult: 41.0 },
      'NASDAQ 100': { yahoo: 'QQQ', mult: 41.0 },
      'DJI': { yahoo: 'DIA', mult: 100.0 },
      'DOW JONES': { yahoo: 'DIA', mult: 100.0 },
      'VIX': { yahoo: '^VIX', mult: 1.0 },
      'NVDA': { yahoo: 'NVDA', mult: 1.0 },
      'AAPL': { yahoo: 'AAPL', mult: 1.0 },
      'MSFT': { yahoo: 'MSFT', mult: 1.0 },
      'TSLA': { yahoo: 'TSLA', mult: 1.0 },
      'AMZN': { yahoo: 'AMZN', mult: 1.0 },
      'META': { yahoo: 'META', mult: 1.0 },
      'GOOGL': { yahoo: 'GOOGL', mult: 1.0 },
    };

    fetchPromises.push((async () => {
      const usFetches = Object.entries(US_YAHOO_MAP).map(async ([symbol, { yahoo, mult }], idx) => {
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1m`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cache: 'no-store',
            signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
          });
          if (!res.ok) return;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;
          const rawPrice = meta.regularMarketPrice * mult;
          const rawPrev = (meta.chartPreviousClose || meta.regularMarketPrice) * mult;
          const ltp = +rawPrice.toFixed(2);
          const change = +(rawPrice - rawPrev).toFixed(2);
          const changePercent = +(((rawPrice - rawPrev) / Math.max(0.01, rawPrev)) * 100).toFixed(2);
          const timestamp = (meta.regularMarketTime || Math.floor(now / 1000)) * 1000;

          pricesMap.set(symbol.toUpperCase(), {
            instrumentToken: 600000 + idx,
            symbol,
            ltp,
            change,
            changePercent,
            timestamp,
          });
        } catch (_err) {
          // Graceful skip
        }
      });
      await Promise.all(usFetches);
    })());
  }

  await Promise.all(fetchPromises);

  const result = Array.from(pricesMap.values());
  cachedPayload = result;
  lastCacheTimestamp = Date.now();

  return NextResponse.json(result);
}
