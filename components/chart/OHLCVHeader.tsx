'use client';

import { Candle } from '@/lib/types';

interface OHLCVHeaderProps {
  symbol?: string;
  candle: Candle | null;
  currency: string;
  timeframe: string;
  currentPrice?: number;
}

export function OHLCVHeader({ symbol, candle, currency, timeframe, currentPrice }: OHLCVHeaderProps) {
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-white border-b border-slate-200 px-3.5 py-1.5 font-mono text-[13px] text-slate-700">
      {symbol && (
        <span className="font-extrabold text-[13px] text-slate-900 tracking-tight flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {symbol}
        </span>
      )}
      <span className="text-emerald-700 font-black tracking-widest text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
        {timeframe}
      </span>

      <span>
        <span className="text-slate-400 font-bold">O</span>{' '}
        <span className="text-slate-900 font-bold">{currency}{fmt(candle.open)}</span>
      </span>
      <span>
        <span className="text-slate-400 font-bold">H</span>{' '}
        <span className="text-emerald-600 font-bold">{currency}{fmt(candle.high)}</span>
      </span>
      <span>
        <span className="text-slate-400 font-bold">L</span>{' '}
        <span className="text-rose-600 font-bold">{currency}{fmt(candle.low)}</span>
      </span>
      <span>
        <span className="text-slate-400 font-bold">C</span>{' '}
        <span className={`font-black ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>{currency}{fmt(price)}</span>
      </span>
      <span>
        <span className="text-slate-400 font-bold">V</span>{' '}
        <span className="text-slate-700 font-medium">{candle.volume.toLocaleString()}</span>
      </span>

      <span className={`ml-auto font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isUp ? '+' : ''}{fmt(change)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
      </span>
    </div>
  );
}
