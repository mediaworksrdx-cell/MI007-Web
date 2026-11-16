import { NextResponse } from 'next/server';
import { INITIAL_SEED_ITEMS } from '@/lib/tradeEngineContext';

export const dynamic = 'force-dynamic';

const GCP_TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'https://synthetixanalytics.com';

interface LivePriceResponse {
  instrumentToken: number;
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export async function GET() {
  const now = Date.now();
  const pricesMap = new Map<string, LivePriceResponse>();

  // 1. Populate with calibrated baseline seed items
  INITIAL_SEED_ITEMS.forEach((item, idx) => {
    const isSubDollar = item.price < 5;
    const isForex = item.symbol.includes('USD') || item.symbol.includes('EUR') || item.symbol.includes('GBP') || item.symbol.includes('JPY');
    const decimals = (isSubDollar || isForex) ? 4 : item.price < 20 ? 3 : 2;
    const jitter = (Math.random() - 0.49) * 0.0005 * item.price;
    const ltp = +(item.price + jitter).toFixed(decimals);

    pricesMap.set(item.symbol.toUpperCase(), {
      instrumentToken: 100000 + idx,
      symbol: item.symbol,
      ltp,
      change: item.change,
      changePercent: item.changePct,
      timestamp: now,
    });
  });

  // 2. Fetch authentic Zerodha Kite live prices from GCP Trade Engine if reachable
  try {
    const res = await fetch(`${GCP_TRADE_ENGINE_URL}/live-prices`, {
      cache: 'no-store',
      signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(1800) : undefined,
    });

    if (res.ok) {
      const gcpPrices = await res.json();
      if (Array.isArray(gcpPrices)) {
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
    // Graceful fallback to baseline prices
  }

  return NextResponse.json(Array.from(pricesMap.values()));
}
