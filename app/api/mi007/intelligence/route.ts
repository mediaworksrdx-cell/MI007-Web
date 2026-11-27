import { NextRequest, NextResponse } from 'next/server';
import { Candle } from '@/lib/types';
import { generateMi007Intelligence } from '@/lib/mi007/mi007Intelligence';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const candles = body?.candles as Candle[] | undefined;
    const symbol = typeof body?.symbol === 'string' ? body.symbol : 'UNKNOWN';
    const timeframe = typeof body?.timeframe === 'string' ? body.timeframe : '1D';
    const htfCandles = body?.htfCandles as Candle[] | undefined;

    if (!Array.isArray(candles) || candles.length < 30) {
      return NextResponse.json(
        { error: 'At least 30 closed OHLCV candles are required for MI-007 Intelligence analysis.' },
        { status: 400 }
      );
    }

    const report = generateMi007Intelligence(candles, { symbol, timeframe, htfCandles });
    if (!report) {
      return NextResponse.json(
        { error: 'Unable to compute MI-007 Intelligence on the provided dataset.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error generating MI-007 intelligence.' },
      { status: 500 }
    );
  }
}
