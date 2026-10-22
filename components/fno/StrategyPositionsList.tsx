// ─── 2026 Executive Financial Cockpit & Sculpted Strategy Positions ─────────
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
  const activeCount = legs.filter((l) => !l.disabled).length;

  return (
    <div className="space-y-4">
      {/* ── 1. Strategy Positions Container ── */}
      <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <h4 className="mono text-[13px] font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>💼 STRATEGY POSITIONS</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {activeCount}/{legs.length} ACTIVE
              </span>
            </h4>
          </div>
          <button
            type="button"
            onClick={onClearAll}
            disabled={legs.length === 0}
            className="px-3 py-1 rounded-lg text-[10.5px] mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-40"
          >
            RESET ALL
          </button>
        </div>

        {/* Select All Bar */}
        {legs.length > 0 && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 rounded-xl border border-white/5 text-[11px] mono">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allEnabled}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
              />
              <span className="font-bold text-slate-300">
                Select All Positions
              </span>
            </label>
            <span className="text-[10px] text-slate-400">
              Uncheck leg to isolate payoff
            </span>
          </div>
        )}

        {/* Legs List */}
        {legs.length === 0 ? (
          <div className="text-center py-8 mono text-[12px] text-slate-400 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
            No active strategy positions.
            <div className="text-[10.5px] mt-1 text-slate-500">
              Select an architecture above or add legs via the manual bar or option chain.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {legs.map((leg) => {
              const isBuy = leg.action === 'BUY';
              const isEnabled = !leg.disabled;

              return (
                <div
                  key={leg.id}
                  className={`p-3 rounded-xl border transition-all duration-200 ${
                    isEnabled
                      ? 'bg-slate-900/70 border-white/10 hover:border-emerald-400/40 shadow-sm'
                      : 'bg-slate-950/40 border-white/5 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    {/* Checkbox, Action Pill, Strike */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => onUpdateLeg(leg.id, { disabled: !e.target.checked })}
                        className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                        title="Enable/disable leg in payoff"
                      />

                      {/* Glowing Action Pill */}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLeg(leg.id, {
                            action: isBuy ? 'SELL' : 'BUY',
                          })
                        }
                        className={`w-6 h-6 rounded-lg flex items-center justify-center mono text-[11px] font-black cursor-pointer transition-all shrink-0 ${
                          isBuy
                            ? 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.4)] hover:bg-emerald-400'
                            : 'bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)] hover:bg-rose-400'
                        }`}
                        title="Click to flip Buy/Sell"
                      >
                        {isBuy ? 'B' : 'S'}
                      </button>

                      <div className="mono text-[11.5px] font-bold text-white truncate">
                        <span className="text-slate-400">{leg.lots}x {leg.expiry} </span>
                        <span className="font-black text-cyan-400">
                          {leg.instrument === 'FUT' ? 'FUT' : `${leg.strike}${leg.instrument}`}
                        </span>
                        <span className="text-emerald-400 ml-1.5 font-black">
                          ₹{leg.entryPrice.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Lots Stepper */}
                      <div className="flex items-center rounded-lg bg-slate-950 border border-white/10 text-[10px] mono">
                        <button
                          type="button"
                          onClick={() => onUpdateLeg(leg.id, { lots: Math.max(1, leg.lots - 1) })}
                          className="px-2 py-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-black text-white">
                          {leg.lots}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateLeg(leg.id, { lots: leg.lots + 1 })}
                          className="px-2 py-1 text-slate-400 hover:text-white cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Strike Stepper */}
                      {leg.instrument !== 'FUT' && (
                        <div className="flex items-center rounded-lg bg-slate-950 border border-white/10 text-[10px] mono">
                          <button
                            type="button"
                            onClick={() => onUpdateLeg(leg.id, { strike: leg.strike - instrument.strikeStep })}
                            className="px-1.5 py-1 text-slate-400 hover:text-cyan-400 cursor-pointer"
                            title="Lower strike"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateLeg(leg.id, { strike: leg.strike + instrument.strikeStep })}
                            className="px-1.5 py-1 text-slate-400 hover:text-cyan-400 cursor-pointer"
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
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[12px]"
                        title="Flip Buy/Sell"
                      >
                        🔁
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onRemoveLeg(leg.id)}
                        className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer text-[12px]"
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

      {/* ── 2. Executive Financial Cockpit (2026 High-Impact Layout) ── */}
      <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h4 className="mono text-[13px] font-black uppercase tracking-wider text-white flex items-center gap-2">
            <span>⚡ FINANCIAL COCKPIT</span>
          </h4>
          <span className="mono text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            REAL-TIME METRICS
          </span>
        </div>

        {/* Win Probability POP % Gauge Meter */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
          <div className="flex items-center justify-between mono">
            <span className="text-[11px] font-bold text-slate-300 uppercase">
              Probability of Profit (POP)
            </span>
            <span className="text-[16px] font-black text-cyan-400">
              {payoff.probabilityOfProfit.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar meter */}
          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              style={{ width: `${Math.min(100, Math.max(5, payoff.probabilityOfProfit))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] mono text-slate-400">
            <span>Standard Normal Model</span>
            <span className="text-emerald-400 font-bold">
              {payoff.probabilityOfProfit >= 60 ? 'HIGH PROBABILITY SETUP' : payoff.probabilityOfProfit >= 45 ? 'BALANCED PROFILE' : 'ASYMMETRIC VOLATILITY'}
            </span>
          </div>
        </div>

        {/* 4 Primary Metric Tiles (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Max Profit */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <span className="mono text-[9.5px] font-bold text-emerald-400 uppercase tracking-wider block">
              MAX PROFIT
            </span>
            <div className="mono text-[15px] font-black text-emerald-400 mt-1 truncate">
              {typeof payoff.maxProfit === 'number'
                ? `₹${payoff.maxProfit.toLocaleString('en-IN')}`
                : 'UNLIMITED'}
            </div>
            <span className="mono text-[9px] text-slate-400 block mt-0.5">
              Target Upper Bound
            </span>
          </div>

          {/* Max Loss */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-rose-500/20 hover:border-rose-500/40 transition-colors">
            <span className="mono text-[9.5px] font-bold text-rose-400 uppercase tracking-wider block">
              MAX LOSS
            </span>
            <div className="mono text-[15px] font-black text-rose-400 mt-1 truncate">
              {typeof payoff.maxLoss === 'number'
                ? `-₹${Math.abs(payoff.maxLoss).toLocaleString('en-IN')}`
                : 'UNLIMITED'}
            </div>
            <span className="mono text-[9px] text-slate-400 block mt-0.5">
              Defined Risk Cap
            </span>
          </div>

          {/* Risk:Reward Ratio */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 hover:border-white/20 transition-colors">
            <span className="mono text-[9.5px] font-bold text-amber-400 uppercase tracking-wider block">
              MAX RR RATIO
            </span>
            <div className="mono text-[15px] font-black text-white mt-1">
              {payoff.riskRewardRatio}
            </div>
            <span className="mono text-[9px] text-slate-400 block mt-0.5">
              Reward to Risk Unit
            </span>
          </div>

          {/* Estimated Margin */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-purple-500/20 hover:border-purple-500/40 transition-colors">
            <span className="mono text-[9.5px] font-bold text-purple-400 uppercase tracking-wider block">
              EST. MARGIN
            </span>
            <div className="mono text-[14px] font-black text-purple-300 mt-1 truncate">
              ₹{(payoff.marginRequired || payoff.capitalRequired).toLocaleString('en-IN')}
            </div>
            <span className="mono text-[9px] text-slate-400 block mt-0.5">
              Span + Exposure
            </span>
          </div>
        </div>

        {/* Breakeven Range Pill Tags */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 space-y-1.5 mono text-[11px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            BREAKEVEN TRIGGER LEVEL(S)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {payoff.breakevens.length > 0 ? (
              payoff.breakevens.map((be) => (
                <span
                  key={be}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 font-black text-[12px] shadow-xs"
                >
                  ₹{be.toLocaleString('en-IN')}
                </span>
              ))
            ) : (
              <span className="text-slate-400 text-[11px]">No zero-crossings detected</span>
            )}
          </div>
        </div>

        {/* Net Premium Summary Row */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-white/10 mono text-[12px]">
          <span className="text-slate-300 font-bold">Total Net Premium:</span>
          <span
            className={`font-black text-[14px] ${
              payoff.netDebitCredit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {payoff.netDebitCredit >= 0 ? 'Net Credit +₹' : 'Net Debit -₹'}
            {Math.abs(payoff.netDebitCredit).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
