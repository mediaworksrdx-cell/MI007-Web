import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_SEED_ITEMS } from '@/lib/seedData';
import { normalizeSymbolKey } from '@/lib/tradeEngineClient';
import { getZerodhaStockPrice, findZerodhaStockBySymbol } from '@/lib/screener/zerodhaStocks';

export const dynamic = 'force-dynamic';

// ─── 1. YAHOO FINANCE MAPPINGS (FOREX & COMMODITIES ONLY) ───────────────────
const COMMODITY_FOREX_YAHOO_MAP: Record<string, string> = {
  // Commodities
  'GOLD': 'GC=F',
  'XAUUSD': 'GC=F',
  'XAU/USD': 'GC=F',
  'SILVER': 'SI=F',
  'XAGUSD': 'SI=F',
  'XAG/USD': 'SI=F',
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
  'EURUSD': 'EURUSD=X',
  'EUR/USD': 'EURUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USDJPY': 'JPY=X',
  'USD/JPY': 'JPY=X',
  'USDINR': 'INR=X',
  'USD/INR': 'INR=X',
  'USDCAD': 'CAD=X',
  'USD/CAD': 'CAD=X',
  'UADCAD': 'CAD=X',
  'AUDCAD': 'AUDCAD=X',
  'AUD/CAD': 'AUDCAD=X',
  'USDCHF': 'CHF=X',
  'USD/CHF': 'CHF=X',
  'AUDUSD': 'AUDUSD=X',
  'AUD/USD': 'AUDUSD=X',
  'USDAED': 'AED=X',
  'USD/AED': 'AED=X',
};

// ─── 2. CRYPTO SYMBOLS (BINANCE) ────────────────────────────────────────────
const CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC', 'POL',
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT', 'SHIBUSDT', 'XRPUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'POLUSDT', 'MATICUSDT'
]);

// ─── 3. US CASH INDICES & EQUITIES (TWELVE DATA) ────────────────────────────
const US_SYMBOLS = new Set([
  'SPX', 'S&P 500', 'SP500', 'NDX', 'NASDAQ', 'NASDAQ 100', 'DJI', 'DOW JONES', 'DOW', 'VIX',
  'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'GOOG', 'AMD', 'NFLX', 'INTC', 'JPM', 'V', 'WMT', 'DIS'
]);

// ─── 4. INDIAN YAHOO MAPPING (ZERODHA FALLBACK) ─────────────────────────────
const INDIAN_YAHOO_MAP: Record<string, string> = {
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
  'MIDCPNIFTY': 'NIFTY_MID_SELECT.NS',
  'BANKEX': 'BSE-BANK.BO',
  'INDIAVIX': '^INDIAVIX',
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
};

// ─── 4B. UAE YAHOO MAPPING ───────────────────────────────────────────────────
const UAE_YAHOO_MAP: Record<string, string> = {
  'DFMGI': 'DFMGI.AE',
  'ADXGI': 'FADGI.FGI',
  'ADX': 'FADGI.FGI',
  'EMAAR': 'EMAAR.AE',
  'DEWA': 'DEWA.AE',
  'SALIK': 'SALIK.AE',
  'ENBD': 'EMIRATESNBD.AE',
  'AIRARABIA': 'AIRARABIA.AE',
  'DFM': 'DFM.AE',
};

// In-memory quote cache with 15-second TTL
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

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1: FOREX & COMMODITIES -> YAHOO FINANCE (24/5 Live Exchange Feeds)
  // ══════════════════════════════════════════════════════════════════════════
  const yahooForexSym = COMMODITY_FOREX_YAHOO_MAP[cleanUpper] || COMMODITY_FOREX_YAHOO_MAP[cleanKey];
  if (yahooForexSym) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooForexSym)}?interval=1d&range=2d`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
          const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
          const ltp = meta.regularMarketPrice;
          const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
          const isForex = yahooForexSym.includes('=X');
          const decimals = isForex ? (meta.regularMarketPrice < 2 ? 4 : 2) : 2;
          const change = +(ltp - prevClose).toFixed(decimals);
          const changePercent = +(((ltp - prevClose) / Math.max(0.0001, prevClose)) * 100).toFixed(2);
          const timestamp = (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000;

          const quoteData = {
            instrumentToken: 999100,
            symbol: cleanUpper,
            ltp: +ltp.toFixed(decimals),
            change,
            changePercent,
            timestamp,
          };
          quoteCache.set(cleanUpper, { timestamp: Date.now(), data: quoteData });
          return NextResponse.json(quoteData);
        }
      }
    } catch (_yErr) {}
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2: CRYPTO -> BINANCE (24/7 Authentic Binance Market Rates)
  // ══════════════════════════════════════════════════════════════════════════
  const isCrypto = CRYPTO_SYMBOLS.has(cleanUpper) || CRYPTO_SYMBOLS.has(cleanKey) || cleanUpper.endsWith('USDT') || cleanUpper.endsWith('-USD');
  if (isCrypto) {
    const rawCoin = cleanUpper.replace(/USDT$/, '').replace(/-USD$/, '');
    const binanceCoin = rawCoin === 'MATIC' ? 'POL' : rawCoin;
    const binancePair = `${binanceCoin}USDT`;
    const baseUrls = ['https://api.binance.com/api/v3', 'https://api.binance.us/api/v3'];

    for (const baseUrl of baseUrls) {
      try {
        const res = await fetch(`${baseUrl}/ticker/24hr?symbol=${binancePair}`, {
          cache: 'no-store',
          signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
        });
        if (res.ok) {
          const ticker = await res.json();
          const price = parseFloat(ticker.lastPrice);
          const pct = parseFloat(ticker.priceChangePercent);
          const chg = parseFloat(ticker.priceChange);
          if (!isNaN(price) && price > 0) {
            const decimals = price < 0.0001 ? 8 : price < 0.01 ? 7 : price < 2 ? 4 : price < 20 ? 3 : 2;
            const quoteData = {
              instrumentToken: 999400,
              symbol: cleanUpper,
              ltp: +price.toFixed(decimals),
              change: !isNaN(chg) ? +chg.toFixed(decimals) : 0,
              changePercent: !isNaN(pct) ? +pct.toFixed(2) : 0,
              timestamp: ticker.closeTime || Date.now(),
            };
            quoteCache.set(cleanUpper, { timestamp: Date.now(), data: quoteData });
            return NextResponse.json(quoteData);
          }
        }
      } catch (_bErr) {}
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 3: US EQUITIES & INDICES -> YAHOO FINANCE (EXACT EXCHANGE RATES)
  // ══════════════════════════════════════════════════════════════════════════
  const isUsSymbol = US_SYMBOLS.has(cleanUpper) || US_SYMBOLS.has(cleanKey);
  if (isUsSymbol) {
    const US_INDEX_YAHOO: Record<string, string> = {
      'SPX': '^GSPC', 'S&P 500': '^GSPC', 'SP500': '^GSPC',
      'NDX': '^NDX', 'NASDAQ': '^IXIC', 'NASDAQ 100': '^NDX',
      'DJI': '^DJI', 'DOW JONES': '^DJI', 'DOW': '^DJI',
      'VIX': '^VIX',
    };
    const usYahooTicker = US_INDEX_YAHOO[cleanUpper] || US_INDEX_YAHOO[cleanKey] || cleanUpper;
    if (usYahooTicker) {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(usYahooTicker)}?interval=1d&range=2d`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store',
          signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
            const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
            const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
            const ltp = +meta.regularMarketPrice.toFixed(2);
            const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
            const change = +(ltp - prevClose).toFixed(2);
            const changePercent = +(((ltp - prevClose) / Math.max(0.001, prevClose)) * 100).toFixed(2);
            const quoteData = {
              instrumentToken: 999310,
              symbol: cleanUpper,
              ltp,
              change,
              changePercent,
              timestamp: (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000,
            };
            quoteCache.set(cleanUpper, { timestamp: Date.now(), data: quoteData });
            return NextResponse.json(quoteData);
          }
        }
      } catch (_uyErr) {}
    }
    // Never fall through to Indian market for US instruments
    return NextResponse.json({
      instrumentToken: 999399,
      symbol: cleanUpper,
      ltp: 0,
      change: 0,
      changePercent: 0,
      timestamp: Date.now(),
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 3B: UAE EQUITIES & INDICES -> YAHOO FINANCE
  // ══════════════════════════════════════════════════════════════════════════
  const uaeYahooSym = UAE_YAHOO_MAP[cleanUpper] || UAE_YAHOO_MAP[cleanKey];
  if (uaeYahooSym) {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(uaeYahooSym)}?interval=1d&range=2d`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
          const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
          const ltp = +meta.regularMarketPrice.toFixed(2);
          const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
          const change = +(ltp - prevClose).toFixed(2);
          const changePercent = +(((ltp - prevClose) / Math.max(0.001, prevClose)) * 100).toFixed(2);
          const quoteData = {
            instrumentToken: 999500,
            symbol: cleanUpper,
            ltp,
            change,
            changePercent,
            timestamp: (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000,
          };
          quoteCache.set(cleanUpper, { timestamp: Date.now(), data: quoteData });
          return NextResponse.json(quoteData);
        }
      }
    } catch {}
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 4: INDIA -> EXACT NSE/BSE QUOTES VIA YAHOO FINANCE
  // ══════════════════════════════════════════════════════════════════════════
  const indianYahooSym = INDIAN_YAHOO_MAP[cleanUpper] || INDIAN_YAHOO_MAP[cleanKey] || (cleanUpper.endsWith('.NS') ? cleanUpper : `${cleanUpper}.NS`);
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(indianYahooSym)}?interval=1d&range=2d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
      signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2500) : undefined,
    });
    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
        const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
        const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
        const ltp = +meta.regularMarketPrice.toFixed(2);
        const prevClose = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
        const change = +(ltp - prevClose).toFixed(2);
        const changePercent = +(((ltp - prevClose) / Math.max(0.001, prevClose)) * 100).toFixed(2);
        const timestamp = (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000;

        const quoteData = {
          instrumentToken: 999210,
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
  } catch (_iyErr) {}

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 5: BASELINE SEED DATA
  // ══════════════════════════════════════════════════════════════════════════
  const seed = INITIAL_SEED_ITEMS.find(
    (item) => normalizeSymbolKey(item.symbol) === cleanKey || item.symbol.toUpperCase() === cleanUpper
  );

  let ltp = seed ? seed.price : 0;
  let change = seed ? seed.change : 0;
  let changePercent = seed ? seed.changePct : 0;

  if (ltp <= 0) {
    const zd = findZerodhaStockBySymbol(cleanKey);
    if (zd && zd.lastPrice && zd.lastPrice > 0) {
      ltp = zd.lastPrice;
    } else if (zd) {
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
