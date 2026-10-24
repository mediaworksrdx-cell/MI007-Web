// ─── Tracked & Saved Options Strategies Workspace ────────────────────────────
'use client';

import React, { useState, useEffect } from 'react';
import { TrackedStrategy, StrategyLeg } from '@/lib/fno/fnoTypes';
import { findFnoInstrument } from '@/lib/fno/fnoDataService';
import {
  getTrackedStrategies,
  deleteTrackedStrategy,
} from '@/lib/fno/savedStrategiesService';

interface SavedStrategiesTabProps {
  onLoadStrategy: (legs: StrategyLeg[], name: string) => void;
  onOpenBuilderTab?: () => void;
}

export function SavedStrategiesTab({
  onLoadStrategy,
  onOpenBuilderTab,
}: SavedStrategiesTabProps) {
  const [strategies, setStrategies] = useState<TrackedStrategy[]>([]);

  useEffect(() => {
    setStrategies(getTrackedStrategies());
  }, []);

  const handleDelete = (id: string) => {
    const updated = deleteTrackedStrategy(id);
    setStrategies(updated);
  };

  const handleLoad = (strat: TrackedStrategy) => {
    onLoadStrategy(strat.legs, strat.name);
    if (onOpenBuilderTab) {
      onOpenBuilderTab();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--theme-card-border)]">
          <div>
            <h3 className="mono text-[14px] font-black text-[var(--theme-card-text)] uppercase tracking-wider flex items-center gap-2">
              <span>💼 SAVED & TRACKED DERIVATIVES PORTFOLIO</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {strategies.length} ACTIVE
              </span>
            </h3>
            <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-0.5">
              Live tracking of custom-built multi-leg option strategies with real-time simulated P&L, delta risk, and expiry countdown.
            </p>
          </div>
        </div>

        {/* Strategies Cards Grid */}
        {strategies.length === 0 ? (
          <div className="text-center py-12 mono text-[12px] text-[var(--theme-card-subtitle)]">
            No saved strategies found. Build an option structure in the Strategy Builder and click &quot;Save & Track Strategy&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {strategies.map((strat) => {
              const isProfit = strat.currentPnl >= 0;
              const inst = findFnoInstrument(strat.underlyingSymbol);
              const curr = inst.market === 'USA' ? '$' : inst.market === 'UAE' ? 'AED ' : '₹';
              const loc = inst.market === 'INDIA' ? 'en-IN' : 'en-US';
              return (
                <div
                  key={strat.id}
                  className="bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] hover:border-emerald-500/40 rounded-xl p-4 transition-all shadow-xs space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] mono font-black px-1.5 py-0.5 rounded border ${
                            strat.category === 'BULLISH'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                              : strat.category === 'BEARISH'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                              : strat.category === 'NEUTRAL'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                              : 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/40'
                          }`}
                        >
                          {strat.category}
                        </span>
                        <span className="mono text-[10px] text-[var(--theme-card-subtitle)]">
                          Expiry: {strat.expiry}
                        </span>
                      </div>
                      <h4 className="mono text-[14px] font-black text-[var(--theme-card-text)] mt-1">
                        {strat.name}
                      </h4>
                    </div>

                    {/* Simulated PnL */}
                    <div className="text-right">
                      <div
                        className={`mono text-[16px] font-black ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}{curr}{strat.currentPnl.toLocaleString(loc)}
                      </div>
                      <div className="text-[9.5px] mono text-[var(--theme-card-subtitle)]">
                        POP: {strat.probabilityOfProfit}%
                      </div>
                    </div>
                  </div>

                  {/* Legs Preview */}
                  <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-lg p-2.5 space-y-1 text-[11px] mono">
                    <div className="text-[9px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider mb-1">
                      STRUCTURE LEGS:
                    </div>
                    {strat.legs.map((leg) => (
                      <div key={leg.id} className="flex items-center justify-between">
                        <span
                          className={`font-black ${
                            leg.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {leg.action} {leg.lots * leg.lotSize} {leg.instrument} @ {curr}{leg.strike}
                        </span>
                        <span className="text-[var(--theme-card-subtitle)]">
                          {curr}{leg.entryPrice.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] mono pt-1 border-t border-[var(--theme-card-border)]/50">
                    <div>
                      <div className="text-[9px] text-[var(--theme-card-subtitle)]">MAX PROFIT</div>
                      <div className="font-bold text-emerald-400 mt-0.5 truncate">
                        {typeof strat.maxProfit === 'number'
                          ? `${curr}${strat.maxProfit.toLocaleString(loc)}`
                          : 'UNLIMITED'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[var(--theme-card-subtitle)]">MAX LOSS</div>
                      <div className="font-bold text-rose-400 mt-0.5 truncate">
                        {typeof strat.maxLoss === 'number'
                          ? `-${curr}${Math.abs(strat.maxLoss).toLocaleString(loc)}`
                          : 'UNLIMITED'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[var(--theme-card-subtitle)]">BREAKEVEN</div>
                      <div className="font-bold text-[var(--theme-card-text)] mt-0.5 truncate">
                        {strat.breakevens.length > 0 ? strat.breakevens.map((b) => `${curr}${b}`).join(', ') : 'None'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleDelete(strat.id)}
                      className="px-2.5 py-1 rounded text-[10px] mono font-bold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleLoad(strat)}
                      className="px-3 py-1 rounded-lg text-[10.5px] mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                    >
                      Load into Builder →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
