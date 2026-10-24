'use client';

import React, { useMemo } from 'react';
import {
  OptionChainData,
  StrategyCategory,
  StrategyLeg,
} from '@/lib/fno/fnoTypes';
import {
  PositionRepairProposal,
  generatePositionRepairProposals,
} from '@/lib/fno/positionRepair';

interface PositionRepairPanelProps {
  legs: StrategyLeg[];
  chain: OptionChainData;
  simulatedSpot: number;
  referenceSpot: number;
  strikeStep: number;
  daysToExpiry: number;
  timeShiftDays: number;
  ivShiftPct: number;
  strategyName: string;
  category: StrategyCategory;
  currencySymbol?: string;
  previewProposalId: string | null;
  onPreviewProposal: (proposal: PositionRepairProposal | null) => void;
  onApplyProposal: (proposal: PositionRepairProposal) => void;
  canUndo: boolean;
  onUndo: () => void;
  canReset: boolean;
  onReset: () => void;
}

export default function PositionRepairPanel({
  legs,
  chain,
  simulatedSpot,
  referenceSpot,
  strikeStep,
  daysToExpiry,
  timeShiftDays,
  ivShiftPct,
  strategyName,
  category,
  currencySymbol = '₹',
  previewProposalId,
  onPreviewProposal,
  onApplyProposal,
  canUndo,
  onUndo,
  canReset,
  onReset,
}: PositionRepairPanelProps) {
  const proposals = useMemo(
    () =>
      generatePositionRepairProposals({
        legs,
        chain,
        simulatedSpot,
        referenceSpot,
        strikeStep,
        daysToExpiry,
        timeShiftDays,
        ivShiftPct,
        strategyName,
        category,
      }),
    [
      legs,
      chain,
      simulatedSpot,
      referenceSpot,
      strikeStep,
      daysToExpiry,
      timeShiftDays,
      ivShiftPct,
      strategyName,
      category,
    ]
  );

  const formatMaxLoss = (val: number | 'UNLIMITED') => {
    if (val === 'UNLIMITED') return 'Unlimited';
    return `${currencySymbol}${Math.abs(Math.round(val)).toLocaleString()}`;
  };

  return (
    <div className="space-y-3">
      {/* Header Bar with Undo / Reset Controls */}
      <div className="p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-blue-500">🛠️</span>
          <div>
            <span className="text-xs font-extrabold text-[var(--theme-card-text)]">
              Dynamic Position Repair, Wing Rolling & Delta Hedging Desk
            </span>
            <span className="text-[10px] text-slate-400 block">
              Preview adjustments as a Ghost Curve on the payoff diagram before applying.
              Analytical decision-support only — never auto-submits broker orders.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all ${
              canUndo
                ? 'bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border-[var(--theme-card-border)] hover:border-blue-500 cursor-pointer'
                : 'opacity-40 cursor-not-allowed bg-[var(--theme-card-bg)] text-slate-400 border-[var(--theme-card-border)]'
            }`}
          >
            <span>↶</span>
            Undo Repair
          </button>

          <button
            type="button"
            disabled={!canReset}
            onClick={onReset}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all ${
              canReset
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20 cursor-pointer'
                : 'opacity-40 cursor-not-allowed bg-[var(--theme-card-bg)] text-slate-400 border-[var(--theme-card-border)]'
            }`}
          >
            <span>⟲</span>
            Reset Baseline
          </button>
        </div>
      </div>

      {/* 4 Repair Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {proposals.map((prop) => {
          const isPreviewing = previewProposalId === prop.id;
          return (
            <div
              key={prop.id}
              className={`p-3 rounded-xl bg-[var(--theme-card-bg)] border transition-all flex flex-col justify-between ${
                isPreviewing
                  ? 'border-amber-500 ring-1 ring-amber-500/40'
                  : 'border-[var(--theme-card-border)]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500">
                      {prop.badge}
                    </span>
                    <h4 className="text-xs font-extrabold text-[var(--theme-card-text)] mt-1">
                      {prop.title}
                    </h4>
                  </div>
                  {prop.deltaReductionPct > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                      -{prop.deltaReductionPct}% |Δ|
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{prop.summary}</p>

                {/* Before -> After Quantitative Comparison Strip */}
                <div className="grid grid-cols-3 gap-2 my-2.5 p-2 rounded-lg bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] font-mono text-[10px] tabular-nums">
                  <div>
                    <span className="text-[8px] font-sans uppercase text-slate-400 block">
                      Net Delta (Residual)
                    </span>
                    <div className="font-bold text-[var(--theme-card-text)] flex items-center gap-1">
                      <span>{prop.beforeDelta}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-blue-500 font-extrabold">{prop.afterDelta}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] font-sans uppercase text-slate-400 block">
                      Daily Theta
                    </span>
                    <div className="font-bold text-[var(--theme-card-text)] flex items-center gap-1">
                      <span>{prop.beforeTheta}</span>
                      <span className="text-slate-400">→</span>
                      <span
                        className={
                          prop.afterTheta >= prop.beforeTheta
                            ? 'text-emerald-500 font-extrabold'
                            : 'text-amber-500 font-extrabold'
                        }
                      >
                        {prop.afterTheta}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] font-sans uppercase text-slate-400 block">
                      Max Loss
                    </span>
                    <div className="font-bold text-[var(--theme-card-text)] flex items-center gap-1">
                      <span>{formatMaxLoss(prop.beforeMaxLoss)}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-emerald-500 font-extrabold">
                        {formatMaxLoss(prop.afterMaxLoss)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Proposed Adjustment Legs */}
                {prop.tradesDescription.length > 0 && (
                  <div className="space-y-1 mb-2.5">
                    {prop.tradesDescription.map((desc, idx) => (
                      <div
                        key={idx}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-[var(--theme-card-surface)]/80 text-[var(--theme-card-text)] border border-[var(--theme-card-border)]/60"
                      >
                        {desc}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--theme-card-border)]">
                <button
                  type="button"
                  onClick={() => onPreviewProposal(isPreviewing ? null : prop)}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isPreviewing
                      ? 'bg-amber-500/20 text-amber-500 border-amber-500/50'
                      : 'bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] border-[var(--theme-card-border)] hover:border-amber-500/50'
                  }`}
                >
                  <span>👁️</span>
                  {isPreviewing ? 'Hide Ghost Curve' : 'Preview Ghost Curve'}
                </button>

                <button
                  type="button"
                  disabled={!prop.isApplicable}
                  onClick={() => onApplyProposal(prop)}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                    prop.isApplicable
                      ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-sm'
                      : 'bg-slate-500/20 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>✓</span>
                  Apply Adjustment
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
