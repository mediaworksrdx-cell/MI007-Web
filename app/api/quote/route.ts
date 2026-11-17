import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_SEED_ITEMS } from '@/lib/seedData';
import { normalizeSymbolKey } from '@/lib/tradeEngineClient';
import { getZerodhaStockPrice, findZerodhaStockBySymbol } from '@/lib/screener/zerodhaStocks';
import { fetchTwelveDataQuote } from '@/lib/twelveDataService';
import { isMarketOpen } from '@/lib/marketHours';

export const dynamic = 'force-dynamic';

const US_SYMBOLS = new Set([
  'SPX', 'NDX', 'DJI', 'VIX', 'QQQ', 'SPY', 'DIA', 'IWM',
  'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'NFLX', 'AMD', 'INTC',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'AUD/USD',
  'XAU/USD', 'GOLD', 'XAG/USD', 'SILVER', 'BRENT', 'CRUDEOIL'
]);

const INDIAN_MAP: Record<string, string> = {
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'NIFTY50': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'BANK NIFTY': '^NSEBANK',
  'SENSEX': '^BSESN',
  'BSE SENSEX': '^BSESN',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
  'NIFTY FINANCIAL': 'NIFTY_FIN_SERVICE.NS',
  'TATAMOTORS': 'TMPV.NS',
  'TATA MOTORS': 'TMPV.NS',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || '';
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol query parameter required' }, { status: 400 });
  }

  const cleanUpper = symbol.toUpperCase().trim();
  const cleanKey = normalizeSymbolKey(symbol);

  // 1. Twelve Data Quote for US stocks, Forex, and Commodities
  if (US_SYMBOLS.has(cleanUpper) || symbol.includes('/') || cleanUpper.endsWith('USD')) {
    try {
      const tdQuote = await fetchTwelveDataQuote(cleanUpper);
      if (tdQuote && tdQuote.price > 0) {
        return NextResponse.json({
          instrumentToken: 999000,
          symbol: cleanUpper,
          ltp: tdQuote.price,
          change: tdQuote.change,
          changePercent: tdQuote.changePct,
          timestamp: Date.now(),
        });
      }
    } catch (_err) {
      // Fall through
    }
  }

  // 2. Real-time Indian Quote from Yahoo Finance during market hours
  if (isMarketOpen('INDIA')) {
    const yahooSym = INDIAN_MAP[cleanKey] || INDIAN_MAP[cleanUpper] || (cleanUpper.includes('.') ? cleanUpper : `${cleanKey}.NS`);
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1m`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2000) : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
          const ltp = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || ltp;
          const change = +(ltp - prevClose).toFixed(2);
          const changePercent = +(((ltp - prevClose) / Math.max(0.001, prevClose)) * 100).toFixed(2);
          return NextResponse.json({
            instrumentToken: 999100,
            symbol: cleanUpper,
            ltp,
            change,
            changePercent,
            timestamp: (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000,
          });
        }
      }
    } catch (_err) {
      // Fall through to seed
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

  return NextResponse.json({
    instrumentToken: 999999,
    symbol: cleanUpper,
    ltp,
    change,
    changePercent,
    timestamp: Date.now(),
  });
}
