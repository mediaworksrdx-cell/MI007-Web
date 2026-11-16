import { NextRequest, NextResponse } from 'next/server';
import { getMockCandles } from '@/lib/mockData';
import { MarketType } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC']);
const USA_SYMBOLS = new Set(['SPX', 'NDX', 'DJI', 'VIX', 'QQQ', 'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL']);
const UAE_SYMBOLS = new Set(['DFMGI', 'ADXGI', 'EMAAR', 'FAB', 'DEWA', 'ALDAR', 'ENBD', 'ADNOC', 'AIRARABIA']);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get('symbol') || 'NIFTY').toUpperCase().trim();
  const timeframe = searchParams.get('timeframe') || '1H';
  const cleanSym = symbol.replace(/[\s\/-]+/g, '');

  let market: MarketType = 'INDIA';
  if (CRYPTO_SYMBOLS.has(cleanSym) || USA_SYMBOLS.has(cleanSym)) {
    market = 'USA';
  } else if (UAE_SYMBOLS.has(cleanSym)) {
    market = 'UAE';
  }

  const candles = getMockCandles(market, symbol, timeframe, 800);
  return NextResponse.json(candles);
}
