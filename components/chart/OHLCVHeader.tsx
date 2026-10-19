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
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-1.5 bg-white border-b border-slate-200 px-4 py-2 font-mono text-[14px] text-slate-800 shadow-xs tabular-nums select-none"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {symbol && (
        <span className="font-black text-[15px] text-slate-900 tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          {symbol}
        </span>
      )}
      <span className="text-emerald-800 font-black tracking-wider text-[12px] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-300">
        {timeframe}
      </span>

      <span className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 font-extrabold text-[12px] mr-1">O</span>
        <span className="text-slate-900 font-bold tabular-nums">{currency}{fmt(candle.open)}</span>
      </span>
      <span className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 font-extrabold text-[12px] mr-1">H</span>
        <span className="text-emerald-600 font-bold tabular-nums">{currency}{fmt(candle.high)}</span>
      </span>
      <span className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 font-extrabold text-[12px] mr-1">L</span>
        <span className="text-rose-600 font-bold tabular-nums">{currency}{fmt(candle.low)}</span>
      </span>
      <span className="flex items-center tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 font-extrabold text-[12px] mr-1">C</span>
        <span className={`text-[16px] font-black px-1.5 py-0.5 rounded tabular-nums ${isUp ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'}`}>
          {currency}{fmt(price)}
        </span>
      </span>
      <span className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 font-extrabold text-[12px] mr-1">V</span>
        <span className="text-slate-800 font-semibold tabular-nums">{candle.volume.toLocaleString()}</span>
      </span>

      <span
        className={`ml-auto font-black text-[14px] px-2 py-0.5 rounded tabular-nums ${isUp ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {isUp ? '+' : ''}{fmt(change)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
      </span>
    </div>
  );
}
