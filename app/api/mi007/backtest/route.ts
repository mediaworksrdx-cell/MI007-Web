import { NextRequest, NextResponse } from 'next/server';
import { Candle } from '@/lib/types';
import {
  BacktestConfig,
  compareMi007Strategies,
  runMi007Backtest,
} from '@/lib/mi007/mi007Backtest';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const candles = body?.candles as Candle[] | undefined;
    const compareAll = Boolean(body?.compareAll);
    const config = (body?.config ?? {}) as BacktestConfig;

    if (!Array.isArray(candles) || candles.length < 60) {
      return NextResponse.json(
        { error: 'At least 60 closed OHLCV candles are required for MI-007 backtesting.' },
        { status: 400 }
      );
    }

    if (compareAll) {
      const comparison = compareMi007Strategies(candles, config);
      return NextResponse.json({ ok: true, ...comparison });
    }

    const result = runMi007Backtest(candles, config);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error running MI-007 backtest.' },
      { status: 500 }
    );
  }
}
