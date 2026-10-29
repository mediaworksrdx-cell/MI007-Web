// ─── Advanced Institutional Option Chain Workspace ─────────────────────────
// Modeled after NSE Institutional Option Chain specification
'use client';

import React, { useState, useMemo } from 'react';
import {
  OptionChainData,
  OptionChainStrikeRow,
  OptionContract,
  TradeAction,
  Greeks,
} from '@/lib/fno/fnoTypes';
import { findFnoInstrument } from '@/lib/fno/fnoDataService';

interface OptionChainTabProps {
  chainData: OptionChainData;
  onAddLegToBuilder: (
    action: TradeAction,
    instrument: 'CE' | 'PE',
    strike: number,
    price: number,
    iv: number,
    greeks: Greeks
  ) => void;
  onOpenBuilderTab?: () => void;
  onOpenChart?: (contractType: 'CE' | 'PE', strike: number) => void;
}

type ViewMode = 'ALL' | 'OI_VOL' | 'GREEKS';
type StrikeRange = 'ALL' | '20' | '10' | 'NEAR_ATM';

function formatNumber(num: number): string {
  if (!num || num === 0) return '-';
  return num.toLocaleString();
}

function formatChange(chg: number): string {
  if (chg === undefined || chg === null || chg === 0) return '-';
  const prefix = chg > 0 ? '+' : '';
  return `${prefix}${chg.toFixed(2)}`;
}

function formatOiChange(chg: number): string {
  if (chg === undefined || chg === null || chg === 0) return '-';
  const prefix = chg > 0 ? '+' : '';
  return `${prefix}${chg.toLocaleString()}`;
}

export function OptionChainTab({
  chainData,
  onAddLegToBuilder,
  onOpenBuilderTab,
  onOpenChart,
}: OptionChainTabProps) {
  const inst = findFnoInstrument(chainData.underlyingSymbol);
  const curr = inst.market === 'USA' ? '$' : inst.market === 'UAE' ? 'AED ' : '₹';

  const [viewMode, setViewMode] = useState<ViewMode>('ALL');
  const [strikeRange, setStrikeRange] = useState<StrikeRange>('ALL');
  const [searchStrike, setSearchStrike] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Maximum OI across all strikes for proportional depth bar scaling
  const maxOI = useMemo(() => {
    let m = 1;
    for (const row of chainData.strikes) {
      if (row.call.openInterest > m) m = row.call.openInterest;
      if (row.put.openInterest > m) m = row.put.openInterest;
    }
    return m;
  }, [chainData.strikes]);

  // Filter strikes based on range and search
  const visibleRows = useMemo(() => {
    let rows = [...chainData.strikes];

    if (searchStrike.trim()) {
      rows = rows.filter((r) => r.strike.toString().includes(searchStrike.trim()));
    } else {
      const atmIndex = rows.findIndex((r) => r.isATM);
      if (atmIndex !== -1) {
        if (strikeRange === 'NEAR_ATM') {
          rows = rows.slice(Math.max(0, atmIndex - 4), Math.min(rows.length, atmIndex + 5));
        } else if (strikeRange === '10') {
          rows = rows.slice(Math.max(0, atmIndex - 5), Math.min(rows.length, atmIndex + 6));
        } else if (strikeRange === '20') {
          rows = rows.slice(Math.max(0, atmIndex - 10), Math.min(rows.length, atmIndex + 11));
        }
      }
    }

    return rows;
  }, [chainData.strikes, strikeRange, searchStrike]);

  const handleQuickAdd = (
    action: TradeAction,
    instrument: 'CE' | 'PE',
    contract: OptionContract
  ) => {
    onAddLegToBuilder(
      action,
      instrument,
      contract.strike,
      contract.ltp,
      contract.impliedVolatility,
      contract.greeks
    );
    setToastMessage(`Added ${action} ${contract.strike} ${instrument} @ ${curr}${contract.ltp}`);
    setTimeout(() => setToastMessage(null), 2800);
  };

  return (
    <div className="space-y-4">
      {/* ── Toast Notification for Quick Leg Addition ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl shadow-2xl mono text-[12px] font-black flex items-center gap-2 border border-emerald-300 animate-bounce">
          <span>✓</span>
          <span>{toastMessage}</span>
          {onOpenBuilderTab && (
            <button
              type="button"
              onClick={onOpenBuilderTab}
              className="ml-2 px-2 py-0.5 rounded bg-slate-950 text-emerald-400 text-[10px] uppercase font-bold hover:bg-slate-900 cursor-pointer"
            >
              Open Builder →
            </button>
          )}
        </div>
      )}

      {/* ── Toolbar: View Modes, Strike Range & Search ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3 shadow-sm">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] p-1 rounded-lg">
          <span className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase px-1.5 hidden sm:inline">
            MODE:
          </span>
          {(
            [
              { id: 'ALL', label: '📊 Standard Chain' },
              { id: 'OI_VOL', label: '📈 OI & Volume' },
              { id: 'GREEKS', label: '🧮 Greeks Matrix' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setViewMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] mono font-bold transition-all cursor-pointer ${
                viewMode === m.id
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-[var(--theme-card-text)] hover:text-emerald-400 hover:bg-[var(--theme-card-border)]/40'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Strike Range & Search */}
        <div className="flex items-center gap-2">
          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] p-1 rounded-lg">
            {(
              [
                { id: 'ALL', label: '🌐 All' },
                { id: '20', label: '±10 Strikes' },
                { id: '10', label: '±5 Strikes' },
                { id: 'NEAR_ATM', label: '🎯 Near ATM' },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setStrikeRange(r.id);
                  setSearchStrike('');
                }}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] mono font-bold transition-all cursor-pointer ${
                  strikeRange === r.id && !searchStrike
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Quick Strike Search */}
          <input
            type="text"
            placeholder="Strike..."
            value={searchStrike}
            onChange={(e) => setSearchStrike(e.target.value)}
            className="w-24 px-2 py-1 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-[11px] mono text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* ── Option Chain Table (Reference: NSE Institutional Layout) ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl overflow-hidden shadow-sm">
        {/* Table Master Header (Deep Purple / Indigo) */}
        <div className="grid grid-cols-[1fr_auto_1fr] text-center mono font-extrabold text-[12px] bg-[#2a2254] dark:bg-[#1c1638] text-white border-b border-indigo-900/60">
          <div className="py-2 px-3 flex items-center justify-center gap-2 border-r border-indigo-900/60">
            <span className="tracking-widest font-black uppercase text-[12.5px] text-white">CALLS</span>
            <span className="text-[10px] text-indigo-200/70 font-normal hidden md:inline">
              (Resistance & Call Writing)
            </span>
          </div>
          <div className="py-2 px-6 font-black tracking-widest text-[12.5px] text-amber-300 border-x border-indigo-900/60 bg-[#221a46] dark:bg-[#15102c] min-w-[90px]">
            STRIKE
          </div>
          <div className="py-2 px-3 flex items-center justify-center gap-2 border-l border-indigo-900/60">
            <span className="tracking-widest font-black uppercase text-[12.5px] text-white">PUTS</span>
            <span className="text-[10px] text-indigo-200/70 font-normal hidden md:inline">
              (Support & Put Writing)
            </span>
          </div>
        </div>

        {/* Dense Table Body */}
        <div className="overflow-x-auto max-h-[660px] overflow-y-auto no-scrollbar">
          <table className="w-full text-center mono text-[11px] border-collapse">
            <thead className="sticky top-0 z-20 bg-[#31275f] dark:bg-[#231c46] text-white border-b border-indigo-900/60 shadow-xs">
              <tr className="text-[9.5px] uppercase tracking-wider text-indigo-100 font-extrabold">
                {/* ── Call Columns ── */}
                <th className="py-2.5 px-1 text-center font-bold w-10">Action</th>
                <th className="py-2.5 px-2 text-right font-bold min-w-[70px]">OI</th>
                <th className="py-2.5 px-2 text-right font-bold min-w-[75px]">Chng in OI</th>
                <th className="py-2.5 px-2 text-right font-bold min-w-[70px]">Volume</th>
                <th className="py-2.5 px-1.5 text-right font-bold min-w-[50px]">IV</th>
                {viewMode === 'GREEKS' && (
                  <>
                    <th className="py-2.5 px-1.5 text-right font-bold text-cyan-300">Delta</th>
                    <th className="py-2.5 px-1.5 text-right font-bold text-fuchsia-300">Theta</th>
                  </>
                )}
                <th className="py-2.5 px-2 text-right font-black min-w-[70px]">LTP</th>
                <th className="py-2.5 px-2 text-right font-black pr-2.5 min-w-[65px]">Chng</th>

                {/* ── Central Strike ── */}
                <th className="py-2.5 px-2 text-center font-black bg-[#221a46] dark:bg-[#15102c] border-x border-indigo-900/80 min-w-[130px] text-amber-300">
                  <div className="flex items-center justify-between text-[9px] px-1">
                    <span className="text-emerald-400 font-black">CE</span>
                    <span className="text-amber-300 font-black tracking-wider text-[11px]">STRIKE</span>
                    <span className="text-rose-400 font-black">PE</span>
                  </div>
                </th>

                {/* ── Put Columns ── */}
                <th className="py-2.5 px-2 text-left font-black pl-2.5 min-w-[65px]">Chng</th>
                <th className="py-2.5 px-2 text-left font-black min-w-[70px]">LTP</th>
                {viewMode === 'GREEKS' && (
                  <>
                    <th className="py-2.5 px-1.5 text-left font-bold text-fuchsia-300">Theta</th>
                    <th className="py-2.5 px-1.5 text-left font-bold text-cyan-300">Delta</th>
                  </>
                )}
                <th className="py-2.5 px-1.5 text-left font-bold min-w-[50px]">IV</th>
                <th className="py-2.5 px-2 text-left font-bold min-w-[70px]">Volume</th>
                <th className="py-2.5 px-2 text-left font-bold min-w-[75px]">Chng in OI</th>
                <th className="py-2.5 px-2 text-left font-bold min-w-[70px]">OI</th>
                <th className="py-2.5 px-1 text-center font-bold w-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60 tabular-nums">
              {visibleRows.map((row) => {
                const liveSpot = chainData.spotPrice;
                const callOIBarWidth = Math.min(100, Math.round((row.call.openInterest / maxOI) * 100));
                const putOIBarWidth = Math.min(100, Math.round((row.put.openInterest / maxOI) * 100));
                
                // Dynamic moneyness calculation based on live spot
                const minStrikeDiff = Math.min(...chainData.strikes.map(s => Math.abs(s.strike - liveSpot)));
                const isATM = row.isATM || (Math.abs(row.strike - liveSpot) === minStrikeDiff);
                const callMoneyness: 'ITM' | 'ATM' | 'OTM' = isATM ? 'ATM' : row.strike < liveSpot ? 'ITM' : 'OTM';
                const putMoneyness: 'ITM' | 'ATM' | 'OTM' = isATM ? 'ATM' : row.strike > liveSpot ? 'ITM' : 'OTM';

                const isITMCall = callMoneyness === 'ITM';
                const isITMPut = putMoneyness === 'ITM';

                // Color classes matching reference image:
                // ITM = warm light cream/ivory tint (#fffbee in light mode, #272115 in dark mode)
                // OTM = clean crisp white / card background
                const callBgClass = isITMCall
                  ? 'bg-[#fffbee] dark:bg-[#272115]'
                  : 'bg-white dark:bg-[#0f172a]';
                const putBgClass = isITMPut
                  ? 'bg-[#fffbee] dark:bg-[#272115]'
                  : 'bg-white dark:bg-[#0f172a]';

                return (
                  <tr
                    key={row.strike}
                    className={`transition-colors group ${
                      isATM
                        ? 'border-y-2 border-amber-500 font-bold'
                        : 'hover:brightness-95 dark:hover:brightness-110'
                    }`}
                  >
                    {/* ── Call Action Buttons ── */}
                    <td className={`py-1.5 px-1 text-center whitespace-nowrap ${callBgClass}`}>
                      <div className="flex items-center justify-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd('BUY', 'CE', row.call)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                          title="Buy Call"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd('SELL', 'CE', row.call)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                          title="Sell Call"
                        >
                          S
                        </button>
                        {onOpenChart && (
                          <button
                            type="button"
                            onClick={() => onOpenChart('CE', row.strike)}
                            className="px-1 py-0.5 rounded text-[9px] font-black bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40 hover:bg-sky-500 hover:text-white transition-colors cursor-pointer"
                            title={`View CE ${row.strike} Candlestick Chart`}
                          >
                            📊
                          </button>
                        )}
                      </div>
                    </td>

                    {/* ── Call OI & Depth Bar ── */}
                    <td className={`py-1.5 px-2 text-right relative font-bold text-slate-800 dark:text-slate-200 ${callBgClass}`}>
                      <div className="relative z-10">
                        {formatNumber(row.call.openInterest)}
                      </div>
                      <div
                        className="absolute inset-y-1 right-0 bg-rose-500/10 rounded-l pointer-events-none"
                        style={{ width: `${callOIBarWidth}%` }}
                      />
                    </td>

                    {/* ── Call Change in OI ── */}
                    <td
                      className={`py-1.5 px-2 text-right font-bold text-[10.5px] ${callBgClass} ${
                        row.call.changeInOI > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.call.changeInOI < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatOiChange(row.call.changeInOI)}
                    </td>

                    {/* ── Call Volume ── */}
                    <td className={`py-1.5 px-2 text-right text-slate-600 dark:text-slate-300 text-[10.5px] ${callBgClass}`}>
                      {formatNumber(row.call.volume)}
                    </td>

                    {/* ── Call IV ── */}
                    <td className={`py-1.5 px-1.5 text-right text-slate-700 dark:text-slate-300 text-[10.5px] ${callBgClass}`}>
                      {row.call.impliedVolatility.toFixed(2)}
                    </td>

                    {/* ── Call Greeks (Optional) ── */}
                    {viewMode === 'GREEKS' && (
                      <>
                        <td className={`py-1.5 px-1.5 text-right text-cyan-600 dark:text-cyan-300 font-semibold text-[10.5px] ${callBgClass}`}>
                          {row.call.greeks.delta.toFixed(2)}
                        </td>
                        <td className={`py-1.5 px-1.5 text-right text-fuchsia-600 dark:text-fuchsia-300 text-[10px] ${callBgClass}`}>
                          {row.call.greeks.theta.toFixed(1)}
                        </td>
                      </>
                    )}

                    {/* ── Call LTP (Bold Blue like reference) ── */}
                    <td className={`py-1.5 px-2 text-right font-black text-[12px] text-[#1e40af] dark:text-sky-300 ${callBgClass}`}>
                      {row.call.ltp.toFixed(2)}
                    </td>

                    {/* ── Call Net Change ── */}
                    <td
                      className={`py-1.5 px-2 pr-2.5 text-right font-bold text-[11px] ${callBgClass} ${
                        row.call.change > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.call.change < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatChange(row.call.change)}
                    </td>

                    {/* ── Central Strike with Adjacent Moneyness Labels ── */}
                    <td
                      className={`py-1.5 px-2 text-center font-extrabold border-x border-slate-300 dark:border-slate-700 text-[12px] ${
                        isATM
                          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
                          : 'bg-[#f4f6fa] dark:bg-[#161c2d] text-[#1d4ed8] dark:text-sky-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 px-0.5">
                        <span
                          className={`text-[8.5px] px-1 py-0.5 rounded font-black tracking-wider uppercase inline-block min-w-[28px] text-center ${
                            callMoneyness === 'ITM'
                              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                              : callMoneyness === 'ATM'
                              ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                          title={`Call is ${callMoneyness} (Strike ${row.strike} vs Spot ${liveSpot.toFixed(2)})`}
                        >
                          {callMoneyness}
                        </span>
                        <span
                          onClick={() => onOpenChart?.('CE', row.strike)}
                          className="cursor-pointer hover:underline font-mono font-black text-slate-900 dark:text-slate-100 px-1"
                          title="Click to view CE/PE Candlestick Chart"
                        >
                          {row.strike.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span
                          className={`text-[8.5px] px-1 py-0.5 rounded font-black tracking-wider uppercase inline-block min-w-[28px] text-center ${
                            putMoneyness === 'ITM'
                              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                              : putMoneyness === 'ATM'
                              ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                          title={`Put is ${putMoneyness} (Strike ${row.strike} vs Spot ${liveSpot.toFixed(2)})`}
                        >
                          {putMoneyness}
                        </span>
                      </div>
                    </td>

                    {/* ── Put Net Change ── */}
                    <td
                      className={`py-1.5 px-2 pl-2.5 text-left font-bold text-[11px] ${putBgClass} ${
                        row.put.change > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.put.change < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatChange(row.put.change)}
                    </td>

                    {/* ── Put LTP (Bold Blue like reference) ── */}
                    <td className={`py-1.5 px-2 text-left font-black text-[12px] text-[#1e40af] dark:text-sky-300 ${putBgClass}`}>
                      {row.put.ltp.toFixed(2)}
                    </td>

                    {/* ── Put Greeks (Optional) ── */}
                    {viewMode === 'GREEKS' && (
                      <>
                        <td className={`py-1.5 px-1.5 text-left text-fuchsia-600 dark:text-fuchsia-300 text-[10px] ${putBgClass}`}>
                          {row.put.greeks.theta.toFixed(1)}
                        </td>
                        <td className={`py-1.5 px-1.5 text-left text-cyan-600 dark:text-cyan-300 font-semibold text-[10.5px] ${putBgClass}`}>
                          {row.put.greeks.delta.toFixed(2)}
                        </td>
                      </>
                    )}

                    {/* ── Put IV ── */}
                    <td className={`py-1.5 px-1.5 text-left text-slate-700 dark:text-slate-300 text-[10.5px] ${putBgClass}`}>
                      {row.put.impliedVolatility.toFixed(2)}
                    </td>

                    {/* ── Put Volume ── */}
                    <td className={`py-1.5 px-2 text-left text-slate-600 dark:text-slate-300 text-[10.5px] ${putBgClass}`}>
                      {formatNumber(row.put.volume)}
                    </td>

                    {/* ── Put Change in OI ── */}
                    <td
                      className={`py-1.5 px-2 text-left font-bold text-[10.5px] ${putBgClass} ${
                        row.put.changeInOI > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : row.put.changeInOI < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatOiChange(row.put.changeInOI)}
                    </td>

                    {/* ── Put OI & Depth Bar ── */}
                    <td className={`py-1.5 px-2 text-left relative font-bold text-slate-800 dark:text-slate-200 ${putBgClass}`}>
                      <div className="relative z-10">
                        {formatNumber(row.put.openInterest)}
                      </div>
                      <div
                        className="absolute inset-y-1 left-0 bg-emerald-500/10 rounded-r pointer-events-none"
                        style={{ width: `${putOIBarWidth}%` }}
                      />
                    </td>

                    {/* ── Put Action Buttons ── */}
                    <td className={`py-1.5 px-1 text-center whitespace-nowrap ${putBgClass}`}>
                      <div className="flex items-center justify-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity">
                        {onOpenChart && (
                          <button
                            type="button"
                            onClick={() => onOpenChart('PE', row.strike)}
                            className="px-1 py-0.5 rounded text-[9px] font-black bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40 hover:bg-sky-500 hover:text-white transition-colors cursor-pointer"
                            title={`View PE ${row.strike} Candlestick Chart`}
                          >
                            📊
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleQuickAdd('BUY', 'PE', row.put)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                          title="Buy Put"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd('SELL', 'PE', row.put)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                          title="Sell Put"
                        >
                          S
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Option Chain Legend & Info Footer */}
        <div className="p-3 bg-[var(--theme-card-subsurface)] border-t border-[var(--theme-card-border)] flex flex-wrap items-center justify-between gap-3 text-[11px] mono text-[var(--theme-card-subtitle)]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-3 w-3 rounded bg-[#fffbee] dark:bg-[#272115] border border-amber-300 dark:border-amber-700" />
              ITM (In-The-Money Contracts)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-3 w-3 rounded bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700" />
              OTM (Out-of-The-Money Contracts)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-3 w-3 rounded bg-amber-400 border border-amber-600" />
              ATM (At-The-Money Strike)
            </span>
          </div>
          <div>
            Click <span className="font-black text-emerald-600 dark:text-emerald-400">B</span> (Buy) or{' '}
            <span className="font-black text-rose-600 dark:text-rose-400">S</span> (Sell) to inject directly into Strategy Builder.
          </div>
        </div>
      </div>
    </div>
  );
}
