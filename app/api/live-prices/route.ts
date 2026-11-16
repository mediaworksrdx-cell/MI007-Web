import { NextResponse } from 'next/server';
import { INITIAL_SEED_ITEMS } from '@/lib/tradeEngineContext';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = Date.now();
  const prices = INITIAL_SEED_ITEMS.map((item, idx) => {
    // Add micro jitter to give authentic live price variance per pull
    const jitter = (Math.random() - 0.49) * 0.0006 * item.price;
    const ltp = +(item.price + jitter).toFixed(item.price < 5 ? 4 : item.price < 20 ? 3 : 2);
    return {
      instrumentToken: 100000 + idx,
      symbol: item.symbol,
      ltp,
      change: item.change,
      changePercent: item.changePct,
      timestamp: now,
    };
  });

  return NextResponse.json(prices);
}
