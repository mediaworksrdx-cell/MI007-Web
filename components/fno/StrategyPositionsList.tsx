// ─── Exact Opstra Definedge Positions & Financial Metrics (Image 4) ───────────
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
  const curr = instrument.market === 'USA' ? '$' : instrument.market === 'UAE' ? 'AED ' : '₹';
  const loc = instrument.market === 'INDIA' ? 'en-IN' : 'en-US';

  const activeLegs = legs.filter((l) => !l.disabled);
  const hasLegs = activeLegs.length > 0;

  // Live real unrealized PnL from legs' current prices vs entry prices
  const currentPnl = Math.round(
    activeLegs.reduce((sum, leg) => {
      const cur = leg.currentPrice ?? leg.entryPrice;
      const mult = leg.action === 'BUY' ? 1 : -1;
      return sum + (cur - leg.entryPrice) * leg.lots * leg.lotSize * mult;
    }, 0)
  );

  const capitalBase = payoff.capitalRequired > 0
    ? payoff.capitalRequired
    : (payoff.marginRequired > 0 ? payoff.marginRequired : Math.max(1, Math.abs(payoff.netDebitCredit)));

  const pnlPct = capitalBase > 0 ? (currentPnl / capitalBase) * 100 : 0;

  const maxLossPct = typeof payoff.maxLoss === 'number' && capitalBase > 0
    ? (Math.abs(payoff.maxLoss) / capitalBase) * 100
    : 100;

  const requiredCapital = payoff.marginRequired > 0
    ? payoff.marginRequired
    : (payoff.capitalRequired > 0 ? payoff.capitalRequired : Math.abs(payoff.netDebitCredit));

  return (
    <div className="space-y-4">
      {/* ── 1. Strategy Positions Container ── */}
      <div className="bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] rounded-xl p-4 shadow-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)]">
          <h4 className="text-[14px] font-bold text-[var(--theme-card-text)]">
            Strategy Positions
          </h4>
          <button
            type="button"
            onClick={onClearAll}
            disabled={legs.length === 0}
            className="px-3 py-1 rounded-lg text-[11px] font-semibold text-[var(--theme-card-text)] bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] hover:border-blue-500/50 transition-colors cursor-pointer disabled:opacity-40"
          >
            RESET
          </button>
        </div>

        {/* Select All Row */}
        {legs.length > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-[var(--theme-card-border)]/60 text-[12px]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allEnabled}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded-xs cursor-pointer"
              />
              <span className="font-semibold text-[var(--theme-card-text)]">
                Select All
              </span>
            </label>
            <span className="text-[11px] text-slate-400">
              {legs.filter((l) => !l.disabled).length} of {legs.length} selected
            </span>
          </div>
        )}

        {/* Legs List */}
        {legs.length === 0 ? (
          <div className="text-center py-8 text-[12px] text-slate-400">
            No active positions in the builder.
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {legs.map((leg) => {
              const isBuy = leg.action === 'BUY';
              const isEnabled = !leg.disabled;
              const legPnl = (leg.currentPrice - leg.entryPrice) * leg.lots * leg.lotSize * (isBuy ? 1 : -1);

              return (
                <div
                  key={leg.id}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-lg border transition-all ${
                    isEnabled
                      ? 'bg-[var(--theme-card-surface)] border-[var(--theme-card-border)]'
                      : 'bg-[var(--theme-card-surface)]/40 border-[var(--theme-card-border)]/40 opacity-40'
                  }`}
                >
                  {/* Left: Checkbox & Badge & Title */}
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => onUpdateLeg(leg.id, { disabled: !e.target.checked })}
                      className="w-4 h-4 accent-blue-600 rounded-xs cursor-pointer"
                      title="Toggle leg inclusion"
                    />

                    {/* Action Pill: S (Red) / B (Green) */}
                    <span
                      className={`w-4 h-4 rounded-xs flex items-center justify-center text-[10px] font-bold ${
                        isBuy
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-rose-500/20 text-rose-500'
                      }`}
                    >
                      {isBuy ? 'B' : 'S'}
                    </span>

                    {/* Leg Description */}
                    <span className="text-[12px] font-semibold text-[var(--theme-card-text)] truncate font-mono tabular-nums">
                      {leg.lots}x {leg.expiry} {leg.instrument === 'FUT' ? 'FUT' : `${leg.strike}${leg.instrument}`} - {curr}{leg.entryPrice.toFixed(1)}
                      {Math.abs(leg.currentPrice - leg.entryPrice) >= 0.05 && (
                        <span className="text-slate-400 font-normal"> → {curr}{leg.currentPrice.toFixed(1)}</span>
                      )}
                    </span>

                    {/* Small PnL indicator */}
                    <span
                      className={`text-[11px] font-bold font-mono tabular-nums ${
                        legPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      ({legPnl >= 0 ? `+${Math.round(legPnl)}` : Math.round(legPnl)})
                    </span>
                  </div>

                  {/* Right: Action Icons (Edit, Flip, Delete) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Lots Stepper */}
                    <div className="flex items-center border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] rounded-md text-[10px]">
                      <button
                        type="button"
                        onClick={() => onUpdateLeg(leg.id, { lots: Math.max(1, leg.lots - 1) })}
                        className="px-1.5 py-0.5 text-slate-400 hover:text-[var(--theme-card-text)] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-1.5 font-bold font-mono text-[var(--theme-card-text)]">
                        {leg.lots}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateLeg(leg.id, { lots: leg.lots + 1 })}
                        className="px-1.5 py-0.5 text-slate-400 hover:text-[var(--theme-card-text)] cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Flip Buy/Sell */}
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateLeg(leg.id, {
                          action: isBuy ? 'SELL' : 'BUY',
                        })
                      }
                      className="text-slate-400 hover:text-blue-500 cursor-pointer text-[12px]"
                      title="Flip Buy/Sell"
                    >
                      🔁
                    </button>

                    {/* Delete Icon */}
                    <button
                      type="button"
                      onClick={() => onRemoveLeg(leg.id)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer text-[12px]"
                      title="Delete Position"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2. Financial Metrics & Second-Order Greeks Table ── */}
      <div className="bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] rounded-xl p-4 shadow-xs">
        <div className="space-y-2 text-[12.5px] font-mono tabular-nums">
          {/* Prob. of Profit */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/60">
            <span className="font-sans text-slate-400">Prob. of Profit</span>
            <span className="font-bold text-[var(--theme-card-text)]">
              {hasLegs ? `${payoff.probabilityOfProfit.toFixed(2)}%` : '-'}
            </span>
          </div>

          {/* Max. Profit */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/60">
            <span className="font-sans text-slate-400">Max. Profit</span>
            <span className="font-bold text-emerald-500">
              {!hasLegs
                ? '-'
                : typeof payoff.maxProfit === 'number'
                ? `${curr}${payoff.maxProfit.toLocaleString(loc)}`
                : 'Unlimited (∞)'}
            </span>
          </div>

          {/* Max. Loss */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/60">
            <span className="font-sans text-slate-400">Max. Loss</span>
            <span className="font-bold text-rose-500">
              {!hasLegs
                ? '-'
                : typeof payoff.maxLoss === 'number'
                ? `-${curr}${Math.abs(payoff.maxLoss).toLocaleString(loc)} (-${maxLossPct.toFixed(1)}%)`
                : 'Unlimited Risk'}
            </span>
          </div>

          {/* Max. RR Ratio */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/60">
            <span className="font-sans text-slate-400">Max. RR Ratio</span>
            <span className="font-bold text-[var(--theme-card-text)]">
              {!hasLegs
                ? '-'
                : payoff.riskRewardRatio.includes('Unlimited')
                ? '1 : Unlimited'
                : payoff.riskRewardRatio}
            </span>
          </div>

          {/* Breakevens */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/60">
            <span className="font-sans text-slate-400">Breakevens</span>
            <span className="font-bold text-[var(--theme-card-text)]">
              {hasLegs && payoff.breakevens.length > 0
                ? payoff.breakevens.map((b) => `${curr}${b.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`).join(', ')
                : 'None'}
            </span>
          </div>

          {/* Total PNL */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/60">
            <span className="font-sans text-slate-400">Total PNL</span>
            <span
              className={`font-bold ${
                currentPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {hasLegs
                ? `${currentPnl >= 0 ? `+${curr}${currentPnl.toLocaleString(loc)}` : `-${curr}${Math.abs(currentPnl).toLocaleString(loc)}`} (${currentPnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`
                : `${curr}0 (0.00%)`}
            </span>
          </div>

          {/* Net Credit / Debit */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/60">
            <span className="font-sans text-slate-400">
              {payoff.netDebitCredit >= 0 ? 'Net Credit' : 'Net Debit'}
            </span>
            <span className="font-bold text-[var(--theme-card-text)]">
              {curr}{Math.abs(payoff.netDebitCredit).toLocaleString(loc)}
            </span>
          </div>

          {/* Estimated Margin/Premium */}
          <div className="flex items-center justify-between py-1 border-b border-[var(--theme-card-border)]/60">
            <span className="font-sans text-slate-400">Estimated Margin/Premium</span>
            <span className="font-bold text-[var(--theme-card-text)]">
              {curr}{requiredCapital.toLocaleString(loc)}
            </span>
          </div>

          {/* 2nd-Order Greeks Summary Row */}
          <div className="flex items-center justify-between py-1">
            <span className="font-sans text-indigo-400 text-[11px] font-semibold">
              2nd-Order (Vanna / Charm / Vomma)
            </span>
            <span className="font-bold text-indigo-400 text-[11.5px]">
              {hasLegs
                ? `${(payoff.netGreeks.vanna ?? 0).toFixed(2)} / ${(payoff.netGreeks.charm ?? 0).toFixed(2)} / ${(payoff.netGreeks.vomma ?? 0).toFixed(2)}`
                : '0.00 / 0.00 / 0.00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
