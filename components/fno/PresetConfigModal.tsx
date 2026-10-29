// ─── Exact Opstra Definedge Preset Config Popover Modal (Image 3) ───────────
'use client';

import React, { useState } from 'react';
import { OptionStrategyPreset, StrategyLeg } from '@/lib/fno/fnoTypes';
import { buildLegsFromPreset } from '@/lib/fno/strategyPresets';

interface PresetConfigModalProps {
  preset: OptionStrategyPreset | null;
  spotPrice: number;
  strikeStep: number;
  expiries: string[];
  selectedExpiry: string;
  lotSize: number;
  onClose: () => void;
  onApplyStrategy: (legs: StrategyLeg[], replaceAll: boolean) => void;
}

export function PresetConfigModal({
  preset,
  spotPrice,
  strikeStep,
  expiries,
  selectedExpiry,
  lotSize,
  onClose,
  onApplyStrategy,
}: PresetConfigModalProps) {
  const [expiry, setExpiry] = useState<string>(selectedExpiry || expiries[0] || '27OCT2026');
  const [lotQty, setLotQty] = useState<number>(1);
  const [offsets, setOffsets] = useState<number[]>(
    preset ? preset.legsTemplate.map((t) => t.strikeOffset) : []
  );

  if (!preset) return null;

  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;

  // Available strikes
  const strikeOptions: number[] = [];
  for (let i = -10; i <= 10; i++) {
    strikeOptions.push(atmStrike + i * strikeStep);
  }

  const handleOffsetChange = (legIndex: number, newStrike: number) => {
    const newOffset = Math.round((newStrike - atmStrike) / strikeStep);
    setOffsets((prev) => {
      const copy = [...prev];
      copy[legIndex] = newOffset;
      return copy;
    });
  };

  const handleConfirm = () => {
    const newLegs = buildLegsFromPreset(
      preset,
      spotPrice,
      strikeStep,
      expiry,
      lotSize,
      offsets,
      lotQty,
      expiries
    );
    onApplyStrategy(newLegs, true);
    onClose();
  };

  // Determine button text: if first leg is BUY -> BUY, if SELL -> SELL, or ADD STRATEGY
  const actionButtonText = preset.legsTemplate.length === 1
    ? preset.legsTemplate[0].action
    : 'ADD STRATEGY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-100">
      <div className="bg-[var(--theme-card-bg)] rounded-xl border border-[var(--theme-card-border)] shadow-2xl w-full max-w-[340px] p-4 text-[var(--theme-card-text)] relative">
        {/* Top-Right Red [x] Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-5 h-5 bg-rose-600 text-white text-[11px] font-bold rounded flex items-center justify-center hover:bg-rose-500 cursor-pointer"
          title="Close"
        >
          ✕
        </button>

        {/* Header: Strategy Name & Contract Composition */}
        <div className="text-center mb-4">
          <h3 className="text-[15px] font-bold text-[var(--theme-card-text)]">
            {preset.name}
          </h3>
          {preset.contractComposition && (
            <div className="mt-1.5 flex justify-center">
              <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold tracking-wide">
                Composition: {preset.contractComposition}
              </span>
            </div>
          )}
        </div>

        {/* Contract Composition Variant Pills */}
        {preset.compositionVariants && preset.compositionVariants.length > 0 && (
          <div className="mb-3.5 p-2 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
            <span className="text-[9px] uppercase font-bold text-[var(--theme-card-subtitle)] block mb-1.5">
              Contract Composition Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {preset.compositionVariants.map((v, vIdx) => (
                <button
                  key={vIdx}
                  type="button"
                  onClick={() => setOffsets([...v.offsets])}
                  className="px-2 py-1 rounded text-[9.5px] font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition"
                  title={v.description}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legs rows */}
        <div className="space-y-3 mb-4">
          {preset.legsTemplate.map((tmpl, idx) => {
            const currentOffset = offsets[idx] !== undefined ? offsets[idx] : tmpl.strikeOffset;
            const currentStrike = atmStrike + currentOffset * strikeStep;

            return (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate-400 w-6 font-mono">
                  {tmpl.lots * lotQty}x
                </span>

                {tmpl.instrument !== 'FUT' ? (
                  <div className="flex-1 flex flex-col items-center">
                    <select
                      value={currentStrike}
                      onChange={(e) => handleOffsetChange(idx, Number(e.target.value))}
                      className="w-full text-center py-1 px-2 border-b-2 border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[13px] font-bold text-[var(--theme-card-text)] focus:outline-hidden focus:border-blue-500 cursor-pointer font-mono"
                    >
                      {strikeOptions.map((strk) => (
                        <option key={strk} value={strk}>
                          {strk}
                        </option>
                      ))}
                    </select>
                    <span className="text-[9.5px] text-slate-400 mt-0.5">
                      Select {tmpl.instrument} Strike
                    </span>
                  </div>
                ) : (
                  <span className="flex-1 text-center text-[12px] font-bold text-slate-400">
                    Underlying Future
                  </span>
                )}

                <span className="text-[13px] font-bold text-[var(--theme-card-text)] w-8 text-right">
                  {tmpl.instrument}
                </span>
              </div>
            );
          })}

          {/* Expiry Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[12px] text-slate-400 w-16">
              Expiry:
            </span>
            <div className="flex-1 flex flex-col items-center">
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full text-center py-1 px-2 border-b-2 border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[13px] font-bold text-[var(--theme-card-text)] focus:outline-hidden focus:border-blue-500 cursor-pointer"
              >
                {expiries.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
              <span className="text-[9.5px] text-slate-400 mt-0.5">
                Select Expiry
              </span>
            </div>
            <div className="w-8" />
          </div>

          {/* Lot Qty Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[12px] text-slate-400 w-16">
              Lot Qty:
            </span>
            <div className="flex items-center border border-[var(--theme-card-border)] rounded-lg overflow-hidden bg-[var(--theme-card-surface)]">
              <button
                type="button"
                onClick={() => setLotQty((q) => Math.max(1, q - 1))}
                className="px-2.5 py-0.5 text-slate-400 hover:text-[var(--theme-card-text)] text-[13px] font-bold cursor-pointer"
              >
                -
              </button>
              <span className="px-3 py-0.5 text-[12px] font-bold text-[var(--theme-card-text)] border-x border-[var(--theme-card-border)] min-w-[28px] text-center font-mono">
                {lotQty}
              </span>
              <button
                type="button"
                onClick={() => setLotQty((q) => q + 1)}
                className="px-2.5 py-0.5 text-slate-400 hover:text-[var(--theme-card-text)] text-[13px] font-bold cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="w-8" />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[12px] px-8 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs uppercase tracking-wider"
          >
            {actionButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
