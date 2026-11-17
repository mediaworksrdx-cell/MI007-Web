import { NextResponse } from 'next/server';
import { INITIAL_SEED_ITEMS } from '@/lib/seedData';
import { fetchTwelveDataQuote } from '@/lib/twelveDataService';

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

// In-memory cache for fast sub-50ms responses
let cachedPayload: LivePriceResponse[] | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 2500; // 2.5-second cache

// ─── 1. ZERODHA (INDIA) MAPPING ─────────────────────────────────────────────
const INDIAN_YAHOO_MAP: Record<string, string> = {
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'BANK NIFTY': '^NSEBANK',
  'SENSEX': '^BSESN',
  'BSE SENSEX': '^BSESN',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
  'NIFTY FINANCIAL': 'NIFTY_FIN_SERVICE.NS',
  'MIDCPNIFTY': 'NIFTY_MID_SELECT.NS',
  'BANKEX': '^BSEBK',
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

const INDIAN_SYMBOLS = new Set([
  'NIFTY', 'NIFTY 50', 'NIFTY50', 'BANKNIFTY', 'BANK NIFTY', 'SENSEX', 'BSE SENSEX',
  'FINNIFTY', 'NIFTY FINANCIAL', 'MIDCPNIFTY', 'BANKEX', 'RELIANCE', 'TCS', 'HDFCBANK',
  'INFY', 'ICICIBANK', 'TATAMOTORS', 'SBIN', 'BHARTIARTL', 'ITC', 'LT'
]);

// ─── 2. YAHOO FINANCE FOREX & COMMODITIES MAPPING (24/5) ────────────────────
const COMMODITY_FOREX_YAHOO_MAP: Record<string, string> = {
  // Commodities
  'GOLD': 'GC=F',
  'XAU/USD': 'GC=F',
  'XAUUSD': 'GC=F',
  'SILVER': 'SI=F',
  'XAG/USD': 'SI=F',
  'XAGUSD': 'SI=F',
  'COPPER': 'HG=F',
  'PLATINUM': 'PL=F',
  'CRUDEOIL': 'CL=F',
  'CRUDE OIL': 'CL=F',
  'WTI': 'CL=F',
  'WTI CRUDE': 'CL=F',
  'BRENT': 'BZ=F',
  'BRENT CRUDE': 'BZ=F',
  'NATGAS': 'NG=F',
  'NATURAL GAS': 'NG=F',

  // Major Forex Pairs
  'EUR/USD': 'EURUSD=X',
  'EURUSD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'USD/JPY': 'JPY=X',
  'USDJPY': 'JPY=X',
  'USD/INR': 'INR=X',
  'USDINR': 'INR=X',
  'USD/CAD': 'CAD=X',
  'USDCAD': 'CAD=X',
  'UADCAD': 'CAD=X',
  'AUD/CAD': 'AUDCAD=X',
  'AUDCAD': 'AUDCAD=X',
  'USD/CHF': 'CHF=X',
  'USDCHF': 'CHF=X',
  'AUD/USD': 'AUDUSD=X',
  'AUDUSD': 'AUDUSD=X',
  'USD/AED': 'AED=X',
  'USDAED': 'AED=X',
};

// ─── 3. CRYPTO SYMBOLS (BINANCE) ────────────────────────────────────────────
const US_STOCKS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL'];
const US_INDEX_YAHOO: Record<string, string> = {
  'SPX': '^GSPC',
  'S&P 500': '^GSPC',
  'DJI': '^DJI',
  'DOW JONES': '^DJI',
  'NASDAQ': '^IXIC',
  'NDX': '^IXIC',
  'NASDAQ 100': '^NDX',
  'VIX': '^VIX',
};

// UAE Stocks
const UAE_YAHOO_MAP: Record<string, string> = {
  'EMAAR': 'EMAAR.AE',
  'DEWA': 'DEWA.AE',
  'SALIK': 'SALIK.AE',
  'DFMGI': 'DFMGI.AE',
  'ADX': 'ADI.AE',
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

  // ══════════════════════════════════════════════════════════════════════════
  // DOMAIN 1: INDIA -> ZERODHA (TRADE ENGINE) WITH YAHOO FALLBACK
  // ══════════════════════════════════════════════════════════════════════════
  fetchPromises.push((async () => {
    let gcpFresh = false;
    try {
      const res = await fetch(`${GCP_TRADE_ENGINE_URL}/live-prices`, {
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2000) : undefined,
      });

      if (res.ok) {
        const gcpPrices = await res.json();
        if (Array.isArray(gcpPrices) && gcpPrices.length > 0) {
          const maxTs = Math.max(...gcpPrices.map((x: any) => x.timestamp || 0));
          if (now - maxTs < 120_000) {
            for (const item of gcpPrices) {
              if (!item.symbol || typeof item.ltp !== 'number' || item.ltp <= 0) continue;
              const rawSym = String(item.symbol).toUpperCase();
              const cleanSym = rawSym.replace(/\.NS$/, '').replace(/\.BO$/, '').trim();

              const isIndian = rawSym.includes('.NS') || rawSym.includes('.BO') || INDIAN_SYMBOLS.has(cleanSym) || Boolean(INDIAN_YAHOO_MAP[cleanSym]);
              if (!isIndian) continue;

              gcpFresh = true;
              const existing = pricesMap.get(cleanSym) || pricesMap.get(rawSym);

              pricesMap.set(cleanSym, {
                instrumentToken: item.instrumentToken || (existing?.instrumentToken ?? 200000),
                symbol: item.symbol,
                ltp: item.ltp,
                change: item.change ?? existing?.change ?? 0,
                changePercent: item.changePercent ?? existing?.changePercent ?? 0,
                timestamp: item.timestamp || now,
              });
              if (rawSym.includes('.NS') || rawSym.includes('.BO')) {
                pricesMap.set(rawSym, {
                  instrumentToken: item.instrumentToken || 200000,
                  symbol: item.symbol,
                  ltp: item.ltp,
                  change: item.change ?? 0,
                  changePercent: item.changePercent ?? 0,
                  timestamp: item.timestamp || now,
                });
              }
            }
          }
        }
      }
    } catch (_err) {}

    // Fallback to 1-day accurate Yahoo Finance quotes for Indian market
    if (!gcpFresh) {
      const indianFetches = Object.entries(INDIAN_YAHOO_MAP).map(async ([symbol, yahooSym], idx) => {
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=2d`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            cache: 'no-store',
            signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
          });
          if (!res.ok) return;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;

          const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
          const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
          const ltp = meta.regularMarketPrice;
          const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
          const change = +(ltp - prevClose).toFixed(2);
          const changePercent = +(((ltp - prevClose) / Math.max(0.001, prevClose)) * 100).toFixed(2);
          const timestamp = (meta.regularMarketTime || Math.floor(now / 1000)) * 1000;

          const cleanUpper = symbol.toUpperCase();
          const entry: LivePriceResponse = {
            instrumentToken: 300000 + idx,
            symbol,
            ltp,
            change,
            changePercent,
            timestamp,
          };
          pricesMap.set(cleanUpper, entry);

          if (cleanUpper === 'NIFTY') {
            pricesMap.set('NIFTY 50', { ...entry, symbol: 'NIFTY 50' });
            pricesMap.set('NIFTY50', { ...entry, symbol: 'NIFTY50' });
          }
          if (cleanUpper === 'BANKNIFTY') {
            pricesMap.set('BANK NIFTY', { ...entry, symbol: 'BANK NIFTY' });
          }
          if (cleanUpper === 'FINNIFTY') {
            pricesMap.set('NIFTY FINANCIAL', { ...entry, symbol: 'NIFTY FINANCIAL' });
          }
          if (cleanUpper === 'SENSEX') {
            pricesMap.set('BSE SENSEX', { ...entry, symbol: 'BSE SENSEX' });
          }
        } catch (_err) {}
      });
      await Promise.all(indianFetches);
    }
  })());

  // ══════════════════════════════════════════════════════════════════════════
  // DOMAIN 2: CRYPTO -> BINANCE (24/7 Dual Endpoint API)
  // ══════════════════════════════════════════════════════════════════════════
  fetchPromises.push((async () => {
    const baseUrls = ['https://api.binance.com/api/v3', 'https://api.binance.us/api/v3'];
    let fetched = false;

    for (const baseUrl of baseUrls) {
      if (fetched) break;
      try {
        const pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'SHIBUSDT', 'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'POLUSDT'];
        const symbolsParam = encodeURIComponent(JSON.stringify(pairs));
        const res = await fetch(`${baseUrl}/ticker/24hr?symbols=${symbolsParam}`, {
          cache: 'no-store',
          signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
        });

        if (res.ok) {
          const tickers = await res.json();
          if (Array.isArray(tickers) && tickers.length > 0) {
            fetched = true;
            for (const t of tickers) {
              const price = parseFloat(t.lastPrice);
              const pct = parseFloat(t.priceChangePercent);
              const chg = parseFloat(t.priceChange);
              if (!isNaN(price) && price > 0) {
                const rawCoin = t.symbol.replace(/USDT$/, '').replace(/-USD$/, '');
                const cleanSym = rawCoin === 'POL' ? 'MATIC' : rawCoin;
                const decimals = price < 0.01 ? 7 : price < 2 ? 4 : price < 20 ? 3 : 2;

                const entry: LivePriceResponse = {
                  instrumentToken: 400000,
                  symbol: cleanSym,
                  ltp: +price.toFixed(decimals),
                  change: !isNaN(chg) ? +chg.toFixed(decimals) : 0,
                  changePercent: !isNaN(pct) ? +pct.toFixed(2) : 0,
                  timestamp: t.closeTime || now,
                };

                pricesMap.set(cleanSym, entry);
                pricesMap.set(`${cleanSym}USDT`, entry);
                pricesMap.set(`${cleanSym}-USD`, entry);
                if (cleanSym === 'MATIC') {
                  pricesMap.set('POL', entry);
                  pricesMap.set('POLUSDT', entry);
                }
              }
            }
          }
        }
      } catch (_err) {}
    }
  })());

  // ══════════════════════════════════════════════════════════════════════════
  // DOMAIN 3: FOREX & COMMODITIES -> YAHOO FINANCE (Exact 1-Day Daily Return)
  // ══════════════════════════════════════════════════════════════════════════
  fetchPromises.push((async () => {
    const cfFetches = Object.entries(COMMODITY_FOREX_YAHOO_MAP).map(async ([symbol, yahooSym], idx) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=2d`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          cache: 'no-store',
          signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
        });
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;

        const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
        const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
        const ltp = meta.regularMarketPrice;
        // Use true yesterday close from 2d series for accurate daily percentage fluctuation
        const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
        const isForex = yahooSym.includes('=X');
        const decimals = isForex ? (ltp < 2 ? 4 : 2) : 2;
        const change = +(ltp - prevClose).toFixed(decimals);
        const changePercent = +(((ltp - prevClose) / Math.max(0.0001, prevClose)) * 100).toFixed(2);
        const timestamp = (meta.regularMarketTime || Math.floor(now / 1000)) * 1000;

        pricesMap.set(symbol.toUpperCase(), {
          instrumentToken: 500000 + idx,
          symbol,
          ltp: +ltp.toFixed(decimals),
          change,
          changePercent,
          timestamp,
        });
      } catch (_err) {}
    });
    await Promise.all(cfFetches);
  })());

  // ══════════════════════════════════════════════════════════════════════════
  // DOMAIN 4: US STOCKS & INDICES -> TWELVE DATA (With Spot Benchmark Scale)
  // ══════════════════════════════════════════════════════════════════════════
  fetchPromises.push((async () => {
    // 1. Twelve Data Batch Query for 7 US Strategic Stocks (Single API credit)
    const missingStocks = new Set(US_STOCKS);
    try {
      const apiKey = process.env.TWELVE_DATA_API_KEY || '3925d32210e845e087ea7b75b1b7720b';
      const symbolsBatch = US_STOCKS.join(',');
      const res = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolsBatch)}&apikey=${apiKey}`, {
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          US_STOCKS.forEach((sym, idx) => {
            const item = data[sym];
            if (item && item.close) {
              const price = parseFloat(item.close);
              const change = parseFloat(item.change || '0');
              const changePct = parseFloat(item.percent_change || '0');
              if (!isNaN(price) && price > 0) {
                pricesMap.set(sym, {
                  instrumentToken: 600000 + idx,
                  symbol: sym,
                  ltp: +price.toFixed(2),
                  change: !isNaN(change) ? +change.toFixed(2) : 0,
                  changePercent: !isNaN(changePct) ? +changePct.toFixed(2) : 0,
                  timestamp: item.timestamp ? item.timestamp * 1000 : now,
                });
                missingStocks.delete(sym);
              }
            }
          });
        }
      }
    } catch (_err) {}

    // Fallback to Yahoo Finance (1-day daily return) for any US stock missing or rate-limited
    if (missingStocks.size > 0) {
      const fbFetches = Array.from(missingStocks).map(async (sym, idx) => {
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cache: 'no-store',
            signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
          });
          if (!res.ok) return;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;
          const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
          const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
          const ltp = +meta.regularMarketPrice.toFixed(2);
          const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
          const change = +(ltp - prevClose).toFixed(2);
          const changePercent = +(((ltp - prevClose) / Math.max(0.01, prevClose)) * 100).toFixed(2);
          pricesMap.set(sym, {
            instrumentToken: 600000 + idx,
            symbol: sym,
            ltp,
            change,
            changePercent,
            timestamp: (meta.regularMarketTime || Math.floor(now / 1000)) * 1000,
          });
        } catch (_fErr) {}
      });
      await Promise.all(fbFetches);
    }

    // 2. Authentic Spot Benchmarks for Cash Indices (^GSPC, ^IXIC, ^DJI, ^VIX)

    // 2. Authentic Spot Benchmarks for Cash Indices (^GSPC, ^IXIC, ^DJI, ^VIX)
    const indexFetches = Object.entries(US_INDEX_YAHOO).map(async ([symbol, yahooSym], idx) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=2d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store',
          signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
        });
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;

        const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
        const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
        const ltp = +meta.regularMarketPrice.toFixed(2);
        const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
        const change = +(ltp - prevClose).toFixed(2);
        const changePercent = +(((ltp - prevClose) / Math.max(0.01, prevClose)) * 100).toFixed(2);
        const timestamp = (meta.regularMarketTime || Math.floor(now / 1000)) * 1000;

        pricesMap.set(symbol.toUpperCase(), {
          instrumentToken: 650000 + idx,
          symbol,
          ltp,
          change,
          changePercent,
          timestamp,
        });
      } catch (_err) {}
    });

    await Promise.all([...stockFetches, ...indexFetches]);
  })());

  // ══════════════════════════════════════════════════════════════════════════
  // UAE STOCKS & INDICES
  // ══════════════════════════════════════════════════════════════════════════
  fetchPromises.push((async () => {
    const uaeFetches = Object.entries(UAE_YAHOO_MAP).map(async ([symbol, yahooSym], idx) => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=2d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store',
          signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
        });
        if (!res.ok) return;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;

        const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
        const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
        const ltp = meta.regularMarketPrice;
        const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
        const change = +(ltp - prevClose).toFixed(2);
        const changePercent = +(((ltp - prevClose) / Math.max(0.001, prevClose)) * 100).toFixed(2);
        const timestamp = (meta.regularMarketTime || Math.floor(now / 1000)) * 1000;

        pricesMap.set(symbol.toUpperCase(), {
          instrumentToken: 700000 + idx,
          symbol,
          ltp: +ltp.toFixed(2),
          change,
          changePercent,
          timestamp,
        });
      } catch (_err) {}
    });
    await Promise.all(uaeFetches);
  })());

  await Promise.all(fetchPromises);

  const result = Array.from(pricesMap.values());
  cachedPayload = result;
  lastCacheTimestamp = Date.now();

  return NextResponse.json(result);
}
