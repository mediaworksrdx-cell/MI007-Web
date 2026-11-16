import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_SEED_ITEMS } from '@/lib/tradeEngineContext';
import { normalizeSymbolKey } from '@/lib/tradeEngineClient';
import { getZerodhaStockPrice, findZerodhaStockBySymbol } from '@/lib/screener/zerodhaStocks';
import { fetchTwelveDataQuote } from '@/lib/twelveDataService';

export const dynamic = 'force-dynamic';

const US_SYMBOLS = new Set([
  'SPX', 'NDX', 'DJI', 'VIX', 'QQQ', 'SPY', 'DIA', 'IWM',
  'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'NFLX', 'AMD', 'INTC',
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'AUD/USD',
  'XAU/USD', 'GOLD', 'XAG/USD', 'SILVER', 'BRENT', 'CRUDEOIL'
]);

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
      // Fall through to seed / zerodha lookup
    }
  }

  // 2. Seed items
  const seed = INITIAL_SEED_ITEMS.find(
    (item) => normalizeSymbolKey(item.symbol) === cleanKey || item.symbol.toUpperCase() === cleanUpper
  );

  let ltp = seed ? seed.price : 0;
  let change = seed ? seed.change : 0;
  let changePercent = seed ? seed.changePct : 0;

  // 3. Indian stocks fallback
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
