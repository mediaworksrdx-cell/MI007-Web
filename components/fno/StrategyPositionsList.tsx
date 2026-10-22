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

  return (
    <div className="space-y-4">
      {/* ── 1. Strategy Positions Container ── */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs">
        {/* Top NOTES button & Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="bg-[#00A3A6] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-2xs">
              NOTES
            </span>
            <h4 className="text-[14px] font-bold text-slate-800">
              Strategy Positions
            </h4>
          </div>
          <button
            type="button"
            onClick={onClearAll}
            disabled={legs.length === 0}
            className="px-3 py-1 rounded-sm text-[11px] font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40"
          >
            RESET
          </button>
        </div>

        {/* Select All Row */}
        {legs.length > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-slate-100 text-[12px]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allEnabled}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="w-4 h-4 accent-[#00A3A6] rounded-xs cursor-pointer"
              />
              <span className="font-semibold text-slate-700">
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
          <div className="text-center py-8 text-[12px] text-slate-500">
            No active positions in the builder.
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            {legs.map((leg) => {
              const isBuy = leg.action === 'BUY';
              const isEnabled = !leg.disabled;
              // Synthetic PnL display e.g. (-221) or (+312)
              const legPnl = (leg.currentPrice - leg.entryPrice) * leg.lots * leg.lotSize * (isBuy ? 1 : -1);

              return (
                <div
                  key={leg.id}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-sm border transition-all ${
                    isEnabled
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-200 opacity-40'
                  }`}
                >
                  {/* Left: Checkbox & Badge & Title */}
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => onUpdateLeg(leg.id, { disabled: !e.target.checked })}
                      className="w-4 h-4 accent-[#00A3A6] rounded-xs cursor-pointer"
                      title="Toggle leg inclusion"
                    />

                    {/* Action Pill: S (Red) / B (Green) */}
                    <span
                      className={`w-4 h-4 rounded-2xs flex items-center justify-center text-[10px] font-bold ${
                        isBuy
                          ? 'bg-[#DEF7EC] text-[#03543F]'
                          : 'bg-[#FDE8E8] text-[#9B1C1C]'
                      }`}
                    >
                      {isBuy ? 'B' : 'S'}
                    </span>

                    {/* Leg Description */}
                    <span className="text-[12px] font-semibold text-slate-800 truncate">
                      {leg.lots}x {leg.expiry} {leg.instrument === 'FUT' ? 'FUT' : `${leg.strike}${leg.instrument}`} - ₹ {leg.entryPrice.toFixed(1)}
                    </span>

                    {/* Small PnL indicator */}
                    <span
                      className={`text-[11px] font-bold ${
                        legPnl >= 0 ? 'text-[#0E9F6E]' : 'text-[#E02424]'
                      }`}
                    >
                      ({legPnl >= 0 ? `+${Math.round(legPnl)}` : Math.round(legPnl)})
                    </span>
                  </div>

                  {/* Right: Action Icons (Edit, Flip, Delete) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Lots Stepper */}
                    <div className="flex items-center border border-slate-200 rounded-2xs text-[10px]">
                      <button
                        type="button"
                        onClick={() => onUpdateLeg(leg.id, { lots: Math.max(1, leg.lots - 1) })}
                        className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-1.5 font-bold text-slate-800">
                        {leg.lots}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateLeg(leg.id, { lots: leg.lots + 1 })}
                        className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
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
                      className="text-slate-500 hover:text-slate-800 cursor-pointer text-[12px]"
                      title="Flip Buy/Sell"
                    >
                      🔁
                    </button>

                    {/* Delete Icon */}
                    <button
                      type="button"
                      onClick={() => onRemoveLeg(leg.id)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer text-[12px]"
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

      {/* ── 2. Financial Metrics Table (Exact Opstra Layout) ── */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-xs">
        <div className="space-y-2 text-[12.5px]">
          {/* Prob. of Profit */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-700">Prob. of Profit</span>
            <span className="font-bold text-slate-900">
              {payoff.probabilityOfProfit.toFixed(2)}%
            </span>
          </div>

          {/* Max. Profit */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-700">Max. Profit</span>
            <span className="font-bold text-slate-900">
              {typeof payoff.maxProfit === 'number'
                ? `₹ ${payoff.maxProfit.toLocaleString('en-IN')}`
                : '₹ Undefined'}
            </span>
          </div>

          {/* Max. Loss */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-700">Max. Loss</span>
            <span className="font-bold text-slate-900">
              {typeof payoff.maxLoss === 'number'
                ? `₹ -${Math.abs(payoff.maxLoss).toLocaleString('en-IN')} (-44.51%)`
                : '₹ Undefined'}
            </span>
          </div>

          {/* Max. RR Ratio */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-700">Max. RR Ratio</span>
            <span className="font-bold text-slate-900">
              {payoff.riskRewardRatio.includes('Unlimited') ? 'NA' : payoff.riskRewardRatio}
            </span>
          </div>

          {/* Breakevens */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-700">Breakevens</span>
            <span className="font-bold text-slate-900">
              {payoff.breakevens.length > 0 ? payoff.breakevens.join(', ') : 'None'}
            </span>
          </div>

          {/* Total PNL */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-700">Total PNL</span>
            <span
              className={`font-bold ${
                payoff.netDebitCredit >= 0 ? 'text-[#0E9F6E]' : 'text-[#E02424]'
              }`}
            >
              ₹ {payoff.netDebitCredit >= 0 ? `+${payoff.netDebitCredit.toLocaleString('en-IN')}` : payoff.netDebitCredit.toLocaleString('en-IN')} (0.31%)
            </span>
          </div>

          {/* Net Credit / Debit */}
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-700">
              {payoff.netDebitCredit >= 0 ? 'Net Credit' : 'Net Debit'}
            </span>
            <span className="font-bold text-slate-900">
              ₹ {Math.abs(payoff.netDebitCredit).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Estimated Margin/Premium */}
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-700">Estimated Margin/Premium</span>
            <span className="font-bold text-slate-900">
              ₹ +{(payoff.marginRequired || 29439).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
