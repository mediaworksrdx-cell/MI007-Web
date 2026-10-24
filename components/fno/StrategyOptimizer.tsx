'use client';

import React, { useMemo, useState } from 'react';
import { OptionChainData, StrategyCategory, StrategyLeg } from '@/lib/fno/fnoTypes';
import {
  OptimizerCandidate,
  OptimizerConstraints,
  optimizeStrategiesForIntent,
  parseOptimizerIntent,
} from '@/lib/fno/strategyOptimizer';

interface StrategyOptimizerProps {
  chain: OptionChainData;
  currencySymbol?: string;
  onApplyCandidate: (candidate: OptimizerCandidate) => void;
  onPreviewCandidate?: (candidate: OptimizerCandidate | null) => void;
  previewCandidateId?: string | null;
}

const QUICK_INTENT_TEMPLATES = [
  'Bullish upside rally with max loss 18000, defined risk and positive theta',
  'Neutral range-bound market, max loss 25000, high POP > 65% and theta harvest',
  'Bearish downside protection with max loss 20000 and defined risk',
  'Volatile event breakout expected, defined risk max loss 22000',
];

export default function StrategyOptimizer({
  chain,
  currencySymbol = '₹',
  onApplyCandidate,
  onPreviewCandidate,
  previewCandidateId,
}: StrategyOptimizerProps) {
  const [prompt, setPrompt] = useState<string>(QUICK_INTENT_TEMPLATES[1]);
  const [overrideOutlook, setOverrideOutlook] = useState<StrategyCategory | undefined>(
    undefined
  );
  const [overrideDefinedRisk, setOverrideDefinedRisk] = useState<boolean | undefined>(
    undefined
  );

  const constraints: OptimizerConstraints = useMemo(
    () =>
      parseOptimizerIntent(prompt, chain.spotPrice, {
        outlook: overrideOutlook,
        requireDefinedRisk: overrideDefinedRisk,
      }),
    [prompt, chain.spotPrice, overrideOutlook, overrideDefinedRisk]
  );

  const result = useMemo(
    () => optimizeStrategiesForIntent(chain, constraints),
    [chain, constraints]
  );

  const formatMoney = (val: number, signed = true) => {
    const abs = Math.abs(val);
    const sign = signed ? (val > 0 ? '+' : val < 0 ? '-' : '') : '';
    return `${sign}${currencySymbol}${Math.round(abs).toLocaleString()}`;
  };

  return (
    <div className="space-y-3">
      {/* Intent Input & Quick Templates */}
      <div className="p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-blue-500">✨</span>
            <span className="text-xs font-extrabold text-[var(--theme-card-text)]">
              AI Intent-to-Constraint Pareto Strategy Optimizer
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {result.rejectedSummary}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setOverrideOutlook(undefined);
            }}
            placeholder="Describe market outlook, target price, max loss limit, and theta preference..."
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Quick Intent Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">
            Presets:
          </span>
          {QUICK_INTENT_TEMPLATES.map((tpl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setPrompt(tpl);
                setOverrideOutlook(undefined);
              }}
              className="px-2 py-1 rounded-md text-[10px] font-semibold bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] opacity-80 hover:opacity-100 border border-[var(--theme-card-border)] hover:border-blue-500/50 transition-all cursor-pointer truncate max-w-[240px]"
            >
              {tpl}
            </button>
          ))}
        </div>

        {/* Inspectable & Editable Parsed Constraints Bar */}
        <div className="pt-2 border-t border-[var(--theme-card-border)]/60 flex flex-wrap items-center gap-2 text-[10px]">
          <span className="font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <span className="text-blue-500">🧭</span>
            Parsed Constraints:
          </span>

          {(['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILE'] as StrategyCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setOverrideOutlook(cat)}
              className={`px-2 py-0.5 rounded font-bold border cursor-pointer ${
                constraints.outlook === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] opacity-70 border-[var(--theme-card-border)]'
              }`}
            >
              {cat}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setOverrideDefinedRisk(!constraints.requireDefinedRisk)}
            className={`px-2 py-0.5 rounded font-bold border flex items-center gap-1 cursor-pointer ${
              constraints.requireDefinedRisk
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
                : 'bg-amber-500/15 text-amber-500 border-amber-500/40'
            }`}
          >
            <span>🛡️</span>
            {constraints.requireDefinedRisk ? 'Defined Risk Enforced' : 'Undefined Risk Allowed'}
          </button>

          {constraints.maxLossLimit && (
            <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              Max Loss Cap: {currencySymbol}
              {constraints.maxLossLimit.toLocaleString()}
            </span>
          )}

          {constraints.preferPositiveTheta && (
            <span className="px-2 py-0.5 rounded font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              +Theta Carry Preferred
            </span>
          )}
        </div>
      </div>

      {/* Top 3 Pareto-Optimal Candidate Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {result.paretoCandidates.map((cand, idx) => {
          const isPreviewing = previewCandidateId === cand.id;
          return (
            <div
              key={cand.id}
              className={`p-3 rounded-xl bg-[var(--theme-card-bg)] border transition-all flex flex-col justify-between ${
                isPreviewing
                  ? 'border-blue-500 ring-1 ring-blue-500/40'
                  : idx === 0
                  ? 'border-emerald-500/50'
                  : 'border-[var(--theme-card-border)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500">
                      {cand.paretoRole}
                    </span>
                    <h4 className="text-xs font-extrabold text-[var(--theme-card-text)] mt-1">
                      {cand.name}
                    </h4>
                    <div className="text-[10px] text-slate-400">{cand.variantLabel}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-[9px] uppercase text-slate-400">POP</div>
                    <div className="text-sm font-extrabold text-emerald-500">{cand.popPct}%</div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-1.5 my-2.5 p-2 rounded-lg bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] font-mono text-[10px] tabular-nums">
                  <div>
                    <span className="text-[8px] font-sans uppercase text-slate-400 block">
                      Expected EV
                    </span>
                    <span
                      className={`font-extrabold ${
                        cand.expectedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {formatMoney(cand.expectedPnl)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-sans uppercase text-slate-400 block">
                      Max Profit
                    </span>
                    <span className="font-bold text-emerald-500">
                      {cand.payoff.maxProfit === 'UNLIMITED'
                        ? 'Unlimited'
                        : formatMoney(cand.maxProfitNum, false)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-sans uppercase text-slate-400 block">
                      CVaR 99% Loss
                    </span>
                    <span className="font-bold text-rose-500">
                      {formatMoney(cand.cvar99Loss, false)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-sans uppercase text-slate-400 block">
                      Net Delta
                    </span>
                    <span className="font-bold text-[var(--theme-card-text)]">
                      {cand.payoff.netGreeks.delta}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-sans uppercase text-slate-400 block">
                      Net Theta/d
                    </span>
                    <span
                      className={`font-bold ${
                        cand.payoff.netGreeks.theta >= 0 ? 'text-emerald-500' : 'text-rose-400'
                      }`}
                    >
                      {cand.payoff.netGreeks.theta >= 0 ? '+' : ''}
                      {cand.payoff.netGreeks.theta}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-sans uppercase text-slate-400 block">
                      Max Loss
                    </span>
                    <span className="font-bold text-rose-400">
                      {cand.payoff.maxLoss === 'UNLIMITED'
                        ? 'Unlimited'
                        : formatMoney(cand.maxLossAbs, false)}
                    </span>
                  </div>
                </div>

                {/* Leg Pills */}
                <div className="space-y-1 mb-3">
                  {cand.legs.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--theme-card-surface)]/70"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`px-1 rounded text-[8px] font-sans font-extrabold ${
                            l.action === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-500'
                              : 'bg-rose-500/20 text-rose-500'
                          }`}
                        >
                          {l.action}
                        </span>
                        <span className="font-bold text-[var(--theme-card-text)]">
                          {l.lots}x {l.strike} {l.instrument}
                        </span>
                        <span className="text-[9px] text-slate-400">({l.expiry})</span>
                      </span>
                      <span className="text-slate-400">
                        {currencySymbol}
                        {l.entryPrice.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--theme-card-border)]">
                {onPreviewCandidate && (
                  <button
                    type="button"
                    onClick={() => onPreviewCandidate(isPreviewing ? null : cand)}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isPreviewing
                        ? 'bg-amber-500/15 text-amber-500 border-amber-500/40'
                        : 'bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] border-[var(--theme-card-border)] hover:border-blue-500/50'
                    }`}
                  >
                    <span>👁️</span>
                    {isPreviewing ? 'Clear Ghost' : 'Ghost Preview'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onApplyCandidate(cand)}
                  className="flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                >
                  <span>✓</span>
                  Load Strategy
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-400 px-1">{result.disclaimer}</div>
    </div>
  );
}
