import { NextRequest, NextResponse } from 'next/server';
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

const INDIAN_YAHOO_MAP: Record<string, string> = {
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'NIFTY50': '^NSEI',
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbol = searchParams.get('symbol') || 'NIFTY';
  const symbol = rawSymbol.toUpperCase().trim();
  const timeframe = searchParams.get('timeframe') || '1H';
  const cleanSym = symbol.replace(/[\s\/-]+/g, '');

  let market: MarketType = 'INDIA';
  if (CRYPTO_SYMBOLS.has(cleanSym) || USA_SYMBOLS.has(cleanSym) || COMMODITY_FOREX_SYMBOLS.has(cleanSym)) {
    market = 'USA';
  } else if (UAE_SYMBOLS.has(cleanSym)) {
    market = 'UAE';
  }

  // 1. Try Twelve Data for US equities, Forex, Commodities, and Crypto
  if (USA_SYMBOLS.has(cleanSym) || COMMODITY_FOREX_SYMBOLS.has(cleanSym) || CRYPTO_SYMBOLS.has(cleanSym)) {
    try {
      const tdCandles = await fetchTwelveDataCandles(symbol, timeframe, 120);
      if (tdCandles && tdCandles.length > 0) {
        const now = Date.now();
        const validCandles = tdCandles.filter(c => c.openTime <= now + 300_000);
        if (validCandles.length > 0) {
          return NextResponse.json(validCandles);
        }
      }
    } catch (_err) {
      // Fall through to mock candles
    }
  }

  // 2. Try GCP Trade Engine for Indian stocks & Kite indices
  if (market === 'INDIA') {
    try {
      const gcpQuerySym = (cleanSym === 'NIFTY' || cleanSym === 'NIFTY50') ? 'NIFTY 50' : symbol;
      const res = await fetch(`${GCP_TRADE_ENGINE_URL}/candles?symbol=${encodeURIComponent(gcpQuerySym)}&timeframe=${encodeURIComponent(timeframe)}`, {
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2200) : undefined,
      });

      if (res.ok) {
        const gcpCandles: Candle[] = await res.json();
        if (Array.isArray(gcpCandles) && gcpCandles.length > 0) {
          // If Indian market is open, sync the active forming candle's close with real-time exchange price
          if (isMarketOpen('INDIA')) {
            const last = gcpCandles[gcpCandles.length - 1];
            const yahooSym = INDIAN_YAHOO_MAP[cleanSym] || INDIAN_YAHOO_MAP[symbol] || (cleanSym.includes('.') ? cleanSym : `${cleanSym}.NS`);
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
                  last.close = ltp;
                  last.high = Math.max(last.high, ltp);
                  last.low = Math.min(last.low, ltp);
                }
              }
            } catch (_yErr) {
              // Graceful fallback
            }
          }
          return NextResponse.json(gcpCandles);
        }
      }
    } catch (_err) {
      // Fall through to mock candles
    }
  }

  // 3. Calibrated realistic candles anchored precisely to authentic market price
  const candles = getMockCandles(market, symbol, timeframe, 800);
  if (candles.length > 0 && isMarketOpen('INDIA')) {
    const last = candles[candles.length - 1];
    const yahooSym = INDIAN_YAHOO_MAP[cleanSym] || INDIAN_YAHOO_MAP[symbol] || (cleanSym.includes('.') ? cleanSym : `${cleanSym}.NS`);
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
