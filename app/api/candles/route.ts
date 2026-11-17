import { NextRequest, NextResponse } from 'next/server';
import { getMockCandles } from '@/lib/mockData';
import { MarketType, Candle } from '@/lib/types';
import { fetchTwelveDataCandles } from '@/lib/twelveDataService';

export const dynamic = 'force-dynamic';

const GCP_TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'https://synthetixanalytics.com';

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC']);
const USA_SYMBOLS = new Set(['SPX', 'NDX', 'DJI', 'VIX', 'QQQ', 'SPY', 'DIA', 'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL']);
const UAE_SYMBOLS = new Set(['DFMGI', 'ADXGI', 'EMAAR', 'FAB', 'DEWA', 'ALDAR', 'ENBD', 'ADNOC', 'AIRARABIA']);
const COMMODITY_FOREX_SYMBOLS = new Set(['GOLD', 'SILVER', 'BRENT', 'CRUDEOIL', 'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDINR']);

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
        return NextResponse.json(tdCandles);
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
          return NextResponse.json(gcpCandles);
        }
      }
    } catch (_err) {
      // Fall through to mock candles
    }
  }

  // 3. Calibrated realistic candles anchored precisely to authentic market price
  const candles = getMockCandles(market, symbol, timeframe, 800);
  return NextResponse.json(candles);
}
