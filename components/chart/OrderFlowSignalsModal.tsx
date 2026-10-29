// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE AI (MI-007) — ORDER FLOW SIGNALS & SETUPS MODAL
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import { OrderFlowSignal } from '../../lib/orderflow/types';

interface OrderFlowSignalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  signals: OrderFlowSignal[];
  symbol: string;
}

export function OrderFlowSignalsModal({
  isOpen,
  onClose,
  signals,
  symbol,
}: OrderFlowSignalsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
              OF
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Order Flow Setup Inspector</span>
                <span className="text-xs font-mono font-medium text-slate-400">({symbol})</span>
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Validated setups with Entry, Invalidation (SL), Target (TP) &amp; R:R
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Signals List */}
        <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
          {signals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              <span className="text-2xl block mb-2">🔍</span>
              No active order flow setups meeting threshold criteria on current timeframe.
            </div>
          ) : (
            signals.map((sig) => {
              const isBull = sig.isBullish;
              const dateStr = new Date(sig.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={sig.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isBull
                      ? 'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : 'border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10'
                  }`}
                >
                  {/* Top Bar: Title, Badge, Time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                          isBull
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {isBull ? 'LONG' : 'SHORT'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {sig.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{dateStr}</span>
                  </div>

                  {/* Pricing Matrix: Entry / SL / TP / R:R */}
                  <div className="grid grid-cols-4 gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 font-mono text-[11px] mb-2.5">
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase">Entry</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{sig.entryPrice}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-rose-500 uppercase">Invalidation (SL)</div>
                      <div className="font-bold text-rose-600 dark:text-rose-400">{sig.invalidationPrice}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-emerald-500 uppercase">Target (TP)</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">{sig.targetPrice}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-blue-500 uppercase">Risk : Reward</div>
                      <div className="font-bold text-blue-600 dark:text-blue-400">1 : {sig.riskReward}R</div>
                    </div>
                  </div>

                  {/* Conditions List */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                      Confirmed Microstructure Conditions:
                    </div>
                    {sig.conditions.map((cond, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5"
                      >
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        <span>{cond}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold font-mono text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
