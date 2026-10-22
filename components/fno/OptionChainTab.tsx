// ─── Advanced Institutional Option Chain Workspace ─────────────────────────
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
}

type ViewMode = 'ALL' | 'OI_VOL' | 'GREEKS' | 'PRICING';
type StrikeRange = 'ALL' | '20' | '10' | 'NEAR_ATM';

export function OptionChainTab({
  chainData,
  onAddLegToBuilder,
  onOpenBuilderTab,
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
              { id: 'ALL', label: '📊 All Columns' },
              { id: 'OI_VOL', label: '📈 OI & Volume' },
              { id: 'GREEKS', label: '🧮 Greeks Matrix' },
              { id: 'PRICING', label: '🏷️ LTP & Spreads' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
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

      {/* ── Option Chain Table ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl overflow-hidden shadow-sm">
        {/* Table Master Header */}
        <div className="grid grid-cols-2 text-center mono font-extrabold text-[12px] py-2 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)]">
          <div className="text-rose-400 border-r border-[var(--theme-card-border)] flex items-center justify-center gap-2">
            <span>CALL OPTIONS (CE)</span>
            <span className="text-[10px] text-[var(--theme-card-subtitle)] font-normal">
              Resistance & Call Writing
            </span>
          </div>
          <div className="text-emerald-400 flex items-center justify-center gap-2">
            <span>PUT OPTIONS (PE)</span>
            <span className="text-[10px] text-[var(--theme-card-subtitle)] font-normal">
              Support & Put Writing
            </span>
          </div>
        </div>

        {/* Dense Table Body */}
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto no-scrollbar">
          <table className="w-full text-center mono text-[11px] border-collapse">
            <thead className="sticky top-0 z-20 bg-[var(--theme-card-surface)] border-b border-[var(--theme-card-border)] shadow-xs">
              <tr className="text-[9.5px] text-[var(--theme-card-subtitle)] uppercase tracking-wider">
                {/* ── Call Columns ── */}
                <th className="py-2 px-1 text-center font-bold">Action</th>
                {(viewMode === 'ALL' || viewMode === 'OI_VOL') && (
                  <>
                    <th className="py-2 px-1 text-left font-bold min-w-[90px]">Call OI</th>
                    <th className="py-2 px-1 text-center font-bold">OI Chg</th>
                    <th className="py-2 px-1 text-center font-bold">Volume</th>
                  </>
                )}
                {(viewMode === 'ALL' || viewMode === 'GREEKS') && (
                  <>
                    <th className="py-2 px-1 text-center font-bold text-cyan-400">Delta</th>
                    <th className="py-2 px-1 text-center font-bold text-fuchsia-400">Theta</th>
                    <th className="py-2 px-1 text-center font-bold">IV %</th>
                  </>
                )}
                {(viewMode === 'ALL' || viewMode === 'PRICING') && (
                  <>
                    <th className="py-2 px-1 text-center font-bold">Bid / Ask</th>
                  </>
                )}
                <th className="py-2 px-1 text-right font-black pr-2 text-rose-400">Call LTP</th>

                {/* ── Central Strike ── */}
                <th className="py-2 px-2 text-center font-black bg-[var(--theme-card-subsurface)] border-x border-[var(--theme-card-border)] min-w-[75px] text-[var(--theme-card-text)]">
                  STRIKE
                </th>

                {/* ── Put Columns ── */}
                <th className="py-2 px-1 text-left font-black pl-2 text-emerald-400">Put LTP</th>
                {(viewMode === 'ALL' || viewMode === 'PRICING') && (
                  <>
                    <th className="py-2 px-1 text-center font-bold">Bid / Ask</th>
                  </>
                )}
                {(viewMode === 'ALL' || viewMode === 'GREEKS') && (
                  <>
                    <th className="py-2 px-1 text-center font-bold">IV %</th>
                    <th className="py-2 px-1 text-center font-bold text-fuchsia-400">Theta</th>
                    <th className="py-2 px-1 text-center font-bold text-cyan-400">Delta</th>
                  </>
                )}
                {(viewMode === 'ALL' || viewMode === 'OI_VOL') && (
                  <>
                    <th className="py-2 px-1 text-center font-bold">Volume</th>
                    <th className="py-2 px-1 text-center font-bold">OI Chg</th>
                    <th className="py-2 px-1 text-right font-bold min-w-[90px]">Put OI</th>
                  </>
                )}
                <th className="py-2 px-1 text-center font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/40">
              {visibleRows.map((row) => {
                const callOIBarWidth = Math.min(100, Math.round((row.call.openInterest / maxOI) * 100));
                const putOIBarWidth = Math.min(100, Math.round((row.put.openInterest / maxOI) * 100));
                const isITMCall = row.call.isITM;
                const isITMPut = row.put.isITM;
                const isATM = row.isATM;

                return (
                  <tr
                    key={row.strike}
                    className={`transition-colors group ${
                      isATM
                        ? 'bg-amber-500/10 font-bold border-y border-amber-500/40'
                        : 'hover:bg-emerald-500/5'
                    }`}
                  >
                    {/* ── Call Action Buttons ── */}
                    <td className="py-1.5 px-1 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleQuickAdd('BUY', 'CE', row.call)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                          title="Buy Call"
                        >
                          B
                        </button>
                        <button
                          onClick={() => handleQuickAdd('SELL', 'CE', row.call)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500 hover:text-slate-950 transition-colors cursor-pointer"
                          title="Sell Call"
                        >
                          S
                        </button>
                      </div>
                    </td>

                    {/* ── Call OI & Depth Bar ── */}
                    {(viewMode === 'ALL' || viewMode === 'OI_VOL') && (
                      <>
                        <td
                          className={`py-1.5 px-1 text-left relative ${
                            isITMCall ? 'bg-rose-500/5' : ''
                          }`}
                        >
                          <div className="relative z-10 flex items-center justify-between text-[10.5px]">
                            <span className="font-bold text-[var(--theme-card-text)]">
                              {(row.call.openInterest / 1000).toFixed(0)}k
                            </span>
                          </div>
                          <div
                            className="absolute inset-y-1 left-0 bg-rose-500/20 rounded-r pointer-events-none transition-all"
                            style={{ width: `${callOIBarWidth}%` }}
                          />
                        </td>
                        <td
                          className={`py-1.5 px-1 text-center font-bold text-[10px] ${
                            row.call.changeInOI >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {row.call.changeInOI >= 0 ? '+' : ''}
                          {(row.call.changeInOI / 1000).toFixed(0)}k
                        </td>
                        <td className="py-1.5 px-1 text-center text-[var(--theme-card-subtitle)] text-[10px]">
                          {(row.call.volume / 1000).toFixed(0)}k
                        </td>
                      </>
                    )}

                    {/* ── Call Greeks ── */}
                    {(viewMode === 'ALL' || viewMode === 'GREEKS') && (
                      <>
                        <td className="py-1.5 px-1 text-center text-cyan-400 font-semibold text-[10.5px]">
                          {row.call.greeks.delta.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-1 text-center text-fuchsia-400 text-[10px]">
                          {row.call.greeks.theta.toFixed(1)}
                        </td>
                        <td className="py-1.5 px-1 text-center text-[var(--theme-card-subtitle)] text-[10px]">
                          {row.call.impliedVolatility.toFixed(1)}%
                        </td>
                      </>
                    )}

                    {/* ── Call Bid/Ask ── */}
                    {(viewMode === 'ALL' || viewMode === 'PRICING') && (
                      <td className="py-1.5 px-1 text-center text-[9.5px] text-[var(--theme-card-subtitle)]">
                        {row.call.bid.toFixed(1)} / {row.call.ask.toFixed(1)}
                      </td>
                    )}

                    {/* ── Call LTP ── */}
                    <td
                      className={`py-1.5 px-1 text-right pr-2 font-black text-[11px] ${
                        isITMCall ? 'bg-rose-500/10 text-rose-300' : 'text-[var(--theme-card-text)]'
                      }`}
                    >
                      {curr}{row.call.ltp.toFixed(2)}
                    </td>

                    {/* ── Central Strike ── */}
                    <td
                      className={`py-1.5 px-2 text-center font-black border-x border-[var(--theme-card-border)] text-[11.5px] ${
                        isATM
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-[var(--theme-card-subsurface)] text-[var(--theme-card-text)]'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{curr}{row.strike}</span>
                        {isATM && (
                          <span className="text-[8px] px-1 py-0.2 bg-amber-500 text-slate-950 rounded font-black">
                            ATM
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ── Put LTP ── */}
                    <td
                      className={`py-1.5 px-1 text-left pl-2 font-black text-[11px] ${
                        isITMPut ? 'bg-emerald-500/10 text-emerald-300' : 'text-[var(--theme-card-text)]'
                      }`}
                    >
                      {curr}{row.put.ltp.toFixed(2)}
                    </td>

                    {/* ── Put Bid/Ask ── */}
                    {(viewMode === 'ALL' || viewMode === 'PRICING') && (
                      <td className="py-1.5 px-1 text-center text-[9.5px] text-[var(--theme-card-subtitle)]">
                        {row.put.bid.toFixed(1)} / {row.put.ask.toFixed(1)}
                      </td>
                    )}

                    {/* ── Put Greeks ── */}
                    {(viewMode === 'ALL' || viewMode === 'GREEKS') && (
                      <>
                        <td className="py-1.5 px-1 text-center text-[var(--theme-card-subtitle)] text-[10px]">
                          {row.put.impliedVolatility.toFixed(1)}%
                        </td>
                        <td className="py-1.5 px-1 text-center text-fuchsia-400 text-[10px]">
                          {row.put.greeks.theta.toFixed(1)}
                        </td>
                        <td className="py-1.5 px-1 text-center text-cyan-400 font-semibold text-[10.5px]">
                          {row.put.greeks.delta.toFixed(2)}
                        </td>
                      </>
                    )}

                    {/* ── Put OI & Depth Bar ── */}
                    {(viewMode === 'ALL' || viewMode === 'OI_VOL') && (
                      <>
                        <td className="py-1.5 px-1 text-center text-[var(--theme-card-subtitle)] text-[10px]">
                          {(row.put.volume / 1000).toFixed(0)}k
                        </td>
                        <td
                          className={`py-1.5 px-1 text-center font-bold text-[10px] ${
                            row.put.changeInOI >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {row.put.changeInOI >= 0 ? '+' : ''}
                          {(row.put.changeInOI / 1000).toFixed(0)}k
                        </td>
                        <td
                          className={`py-1.5 px-1 text-right relative ${
                            isITMPut ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          <div className="relative z-10 flex items-center justify-end text-[10.5px]">
                            <span className="font-bold text-[var(--theme-card-text)]">
                              {(row.put.openInterest / 1000).toFixed(0)}k
                            </span>
                          </div>
                          <div
                            className="absolute inset-y-1 right-0 bg-emerald-500/20 rounded-l pointer-events-none transition-all"
                            style={{ width: `${putOIBarWidth}%` }}
                          />
                        </td>
                      </>
                    )}

                    {/* ── Put Action Buttons ── */}
                    <td className="py-1.5 px-1 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleQuickAdd('BUY', 'PE', row.put)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                          title="Buy Put"
                        >
                          B
                        </button>
                        <button
                          onClick={() => handleQuickAdd('SELL', 'PE', row.put)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500 hover:text-slate-950 transition-colors cursor-pointer"
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
        <div className="p-3 bg-[var(--theme-card-subsurface)] border-t border-[var(--theme-card-border)] flex flex-wrap items-center justify-between gap-3 text-[10.5px] mono text-[var(--theme-card-subtitle)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-rose-500/20 border border-rose-500/50" />
              ITM Calls / Call OI
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-emerald-500/20 border border-emerald-500/50" />
              ITM Puts / Put OI
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-amber-500/40 border border-amber-500" />
              ATM (At-The-Money)
            </span>
          </div>
          <div>
            Click <span className="font-bold text-emerald-400">B</span> to Buy or <span className="font-bold text-rose-400">S</span> to Sell and inject directly into Strategy Builder.
          </div>
        </div>
      </div>
    </div>
  );
}
