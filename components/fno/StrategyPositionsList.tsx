// ─── Strategy Positions List & Financial KPI Summary (Opstra Definedge Compatible) ─
'use client';

import React from 'react';
import { StrategyLeg, StrategyPayoff, FnoInstrument } from '@/lib/fno/fnoTypes';

interface StrategyPositionsListProps {
  legs: StrategyLeg[];
  payoff: StrategyPayoff;
  instrument: FnoInstrument;
  onUpdateLeg: (id: string, updates: Partial<StrategyLeg>) => void;
  onRemoveLeg: (id: string) => void;
  onClearAll: () => void;
  onToggleAll: (enable: boolean) => void;
}

export function StrategyPositionsList({
  legs,
  payoff,
  instrument,
  onUpdateLeg,
  onRemoveLeg,
  onClearAll,
  onToggleAll,
}: StrategyPositionsListProps) {
  const allEnabled = legs.length > 0 && legs.every((l) => !l.disabled);

  return (
    <div className="space-y-4">
      {/* ── 1. Strategy Positions Container ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3">
        {/* Positions Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[var(--theme-card-border)]">
          <div className="flex items-center gap-2">
            <h4 className="mono text-[13px] font-black uppercase tracking-wider text-[var(--theme-card-text)]">
              STRATEGY POSITIONS ({legs.length})
            </h4>
          </div>
          <button
            type="button"
            onClick={onClearAll}
            disabled={legs.length === 0}
            className="px-2.5 py-1 rounded-lg text-[10.5px] mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-40"
          >
            RESET
          </button>
        </div>

        {/* Select All Row */}
        {legs.length > 0 && (
          <div className="flex items-center justify-between px-2 py-1 bg-[var(--theme-card-subsurface)] rounded-lg text-[11px] mono">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allEnabled}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="accent-emerald-500 rounded cursor-pointer"
              />
              <span className="font-bold text-[var(--theme-card-subtitle)]">
                Select All ({legs.filter((l) => !l.disabled).length}/{legs.length} active)
              </span>
            </label>
            <span className="text-[10px] text-[var(--theme-card-subtitle)]">
              Uncheck leg to exclude from payoff
            </span>
          </div>
        )}

        {/* Legs List */}
        {legs.length === 0 ? (
          <div className="text-center py-8 mono text-[12px] text-[var(--theme-card-subtitle)] border border-dashed border-[var(--theme-card-border)] rounded-xl">
            No active strategy legs.
            <div className="text-[10.5px] mt-1 text-[var(--theme-card-subtitle)]/70">
              Pick a preset above, use the manual bar, or expand the option chain.
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
            {legs.map((leg) => {
              const isBuy = leg.action === 'BUY';
              const isEnabled = !leg.disabled;

              return (
                <div
                  key={leg.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isEnabled
                      ? 'bg-[var(--theme-card-subsurface)] border-[var(--theme-card-border)]'
                      : 'bg-white/2 border-white/5 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Checkbox & Action Pill */}
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => onUpdateLeg(leg.id, { disabled: !e.target.checked })}
                        className="accent-emerald-500 rounded cursor-pointer"
                        title="Enable/disable leg in payoff"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLeg(leg.id, {
                            action: isBuy ? 'SELL' : 'BUY',
                          })
                        }
                        className={`w-5 h-5 rounded flex items-center justify-center mono text-[10.5px] font-black cursor-pointer shadow-xs transition-colors shrink-0 ${
                          isBuy
                            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                            : 'bg-rose-500 text-slate-950 hover:bg-rose-400'
                        }`}
                        title="Click to flip Buy/Sell"
                      >
                        {isBuy ? 'B' : 'S'}
                      </button>

                      <div className="mono text-[11px] font-bold text-[var(--theme-card-text)] truncate">
                        <span>{leg.lots}x {leg.expiry} </span>
                        <span className="font-black text-cyan-400">
                          {leg.instrument === 'FUT' ? 'FUT' : `${leg.strike}${leg.instrument}`}
                        </span>
                        <span className="text-[var(--theme-card-subtitle)] ml-1">
                          @ ₹{leg.entryPrice.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Lots Stepper */}
                      <div className="flex items-center rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-[10px] mono">
                        <button
                          type="button"
                          onClick={() => onUpdateLeg(leg.id, { lots: Math.max(1, leg.lots - 1) })}
                          className="px-1.5 py-0.5 hover:text-white cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-black">
                          {leg.lots}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateLeg(leg.id, { lots: leg.lots + 1 })}
                          className="px-1.5 py-0.5 hover:text-white cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Strike Stepper (if not FUT) */}
                      {leg.instrument !== 'FUT' && (
                        <div className="flex items-center rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-[10px] mono">
                          <button
                            type="button"
                            onClick={() => onUpdateLeg(leg.id, { strike: leg.strike - instrument.strikeStep })}
                            className="px-1.5 py-0.5 hover:text-white cursor-pointer"
                            title="Lower strike"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateLeg(leg.id, { strike: leg.strike + instrument.strikeStep })}
                            className="px-1.5 py-0.5 hover:text-white cursor-pointer"
                            title="Raise strike"
                          >
                            ▲
                          </button>
                        </div>
                      )}

                      {/* Flip Buy/Sell */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLeg(leg.id, {
                            action: isBuy ? 'SELL' : 'BUY',
                          })
                        }
                        className="p-1 rounded text-[var(--theme-card-subtitle)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px]"
                        title="Flip Buy/Sell"
                      >
                        🔁
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onRemoveLeg(leg.id)}
                        className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer text-[11px]"
                        title="Remove leg"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2. Financial KPI Summary Table (Opstra Definedge Compatible) ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
        <h4 className="mono text-[12px] font-black uppercase tracking-wider text-[var(--theme-card-text)] border-b border-[var(--theme-card-border)] pb-2">
          FINANCIAL METRICS
        </h4>

        <div className="space-y-1.5 text-[11.5px] mono">
          {/* POP */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/40">
            <span className="text-[var(--theme-card-subtitle)]">Prob. of Profit (POP)</span>
            <span className="font-black text-cyan-400">
              {payoff.probabilityOfProfit.toFixed(1)}%
            </span>
          </div>

          {/* Max Profit */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/40">
            <span className="text-[var(--theme-card-subtitle)]">Max. Profit</span>
            <span className="font-black text-emerald-400">
              {typeof payoff.maxProfit === 'number'
                ? `₹${payoff.maxProfit.toLocaleString('en-IN')}`
                : 'UNLIMITED'}
            </span>
          </div>

          {/* Max Loss */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/40">
            <span className="text-[var(--theme-card-subtitle)]">Max. Loss</span>
            <span className="font-black text-rose-400">
              {typeof payoff.maxLoss === 'number'
                ? `-₹${Math.abs(payoff.maxLoss).toLocaleString('en-IN')}`
                : 'UNLIMITED'}
            </span>
          </div>

          {/* Max RR Ratio */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/40">
            <span className="text-[var(--theme-card-subtitle)]">Max. RR Ratio</span>
            <span className="font-black text-[var(--theme-card-text)]">
              {payoff.riskRewardRatio}
            </span>
          </div>

          {/* Breakeven */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/40">
            <span className="text-[var(--theme-card-subtitle)]">Breakeven(s)</span>
            <span className="font-black text-amber-400 truncate max-w-[150px]">
              {payoff.breakevens.length > 0
                ? payoff.breakevens.map((b) => `₹${b}`).join(', ')
                : 'None'}
            </span>
          </div>

          {/* Total PNL */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/40">
            <span className="text-[var(--theme-card-subtitle)]">Total PNL</span>
            <span
              className={`font-black ${
                payoff.netDebitCredit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {payoff.netDebitCredit >= 0 ? '+₹' : '-₹'}
              {Math.abs(payoff.netDebitCredit).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Net Credit / Debit */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/40">
            <span className="text-[var(--theme-card-subtitle)]">Net Premium</span>
            <span className="font-black text-[var(--theme-card-text)]">
              {payoff.netDebitCredit >= 0 ? 'Net Credit ₹' : 'Net Debit -₹'}
              {Math.abs(payoff.netDebitCredit).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Estimated Margin */}
          <div className="flex items-center justify-between py-1">
            <span className="text-[var(--theme-card-subtitle)]">Estimated Margin</span>
            <span className="font-black text-purple-400">
              ₹{(payoff.marginRequired || payoff.capitalRequired).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
