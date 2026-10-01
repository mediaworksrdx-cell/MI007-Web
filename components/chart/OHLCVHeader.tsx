'use client';

import { Candle } from '@/lib/types';

interface OHLCVHeaderProps {
  candle: Candle | null;
  currency: string;
  timeframe: string;
  currentPrice?: number;
}

export function OHLCVHeader({ candle, currency, timeframe, currentPrice }: OHLCVHeaderProps) {
  if (!candle) return null;

  const price = currentPrice ?? candle.close;
  const isUp = price >= candle.open;
  const change = price - candle.open;
  const changePct = (change / candle.open) * 100;

  const fmt = (v: number) => v.toLocaleString(undefined, {
    minimumFractionDigits: v > 100 ? 0 : 2,
    maximumFractionDigits: v > 100 ? 2 : 2,
  });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-chart-bg px-3.5 py-2 font-mono text-[14px]">
      <span className="text-black font-black tracking-widest text-[12px]">{timeframe}</span>

      <span>
        <span className="text-black font-bold">O</span>{' '}
        <span className="text-black font-semibold">{currency}{fmt(candle.open)}</span>
      </span>
      <span>
        <span className="text-black font-bold">H</span>{' '}
        <span className="text-mint-green font-bold">{currency}{fmt(candle.high)}</span>
      </span>
      <span>
        <span className="text-black font-bold">L</span>{' '}
        <span className="text-crimson-red font-bold">{currency}{fmt(candle.low)}</span>
      </span>
      <span>
        <span className="text-black font-bold">C</span>{' '}
        <span className={`font-bold ${isUp ? 'text-mint-green' : 'text-crimson-red'}`}>{currency}{fmt(price)}</span>
      </span>
      <span>
        <span className="text-black font-bold">V</span>{' '}
        <span className="text-black font-semibold">{candle.volume.toLocaleString()}</span>
      </span>

      <span className={`ml-auto font-bold ${isUp ? 'text-mint-green' : 'text-crimson-red'}`}>
        {isUp ? '+' : ''}{fmt(change)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
      </span>
    </div>
  );
}
