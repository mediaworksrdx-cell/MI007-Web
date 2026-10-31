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
      className="flex items-center gap-x-2.5 sm:gap-x-4 overflow-x-auto scrollbar-none whitespace-nowrap bg-white dark:bg-[#0B0F19] border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-1 sm:py-1.5 font-mono text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 shadow-xs tabular-nums select-none"
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {symbol && (
        <span className="font-black text-xs sm:text-[14px] text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {symbol}
        </span>
      )}
      <span className="text-emerald-800 dark:text-emerald-400 font-black tracking-wider text-[11px] sm:text-[12px] bg-emerald-50 dark:bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-500/30 shrink-0">
        {timeframe}
      </span>

      <span className="tabular-nums shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 dark:text-slate-500 font-extrabold text-[11px] mr-1">O</span>
        <span className="text-slate-800 dark:text-slate-200 font-bold tabular-nums">{currency}{fmt(candle.open)}</span>
      </span>
      <span className="tabular-nums shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 dark:text-slate-500 font-extrabold text-[11px] mr-1">H</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{currency}{fmt(candle.high)}</span>
      </span>
      <span className="tabular-nums shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 dark:text-slate-500 font-extrabold text-[11px] mr-1">L</span>
        <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">{currency}{fmt(candle.low)}</span>
      </span>
      <span className="flex items-center tabular-nums shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 dark:text-slate-500 font-extrabold text-[11px] mr-1">C</span>
        <span className={`text-xs sm:text-[14px] font-black px-1.5 py-0.2 rounded tabular-nums ${isUp ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30' : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30'}`}>
          {currency}{fmt(price)}
        </span>
      </span>
      <span className="tabular-nums shrink-0 hidden xs:inline" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <span className="text-slate-400 dark:text-slate-500 font-extrabold text-[11px] mr-1">V</span>
        <span className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums">{candle.volume.toLocaleString()}</span>
      </span>

      <span
        className={`ml-auto font-black text-xs sm:text-[13px] px-1.5 py-0.2 rounded tabular-nums shrink-0 ${isUp ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15' : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/15'}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {isUp ? '+' : ''}{fmt(change)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
      </span>
    </div>
  );
}
