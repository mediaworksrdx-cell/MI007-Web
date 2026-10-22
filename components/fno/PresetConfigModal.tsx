// ─── Preset Configuration Popover / Modal (Opstra Definedge Compatible) ─────
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
  if (!preset) return null;

  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;
  const [expiry, setExpiry] = useState<string>(selectedExpiry || expiries[0] || '27OCT2026');
  const [lotQty, setLotQty] = useState<number>(1);
  const [offsets, setOffsets] = useState<number[]>(
    preset.legsTemplate.map((t) => t.strikeOffset)
  );

  // Generate strike choices around ATM (-10 to +10 steps)
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

  const handleConfirm = (replaceAll: boolean = true) => {
    const newLegs = buildLegsFromPreset(
      preset,
      spotPrice,
      strikeStep,
      expiry,
      lotSize,
      offsets,
      lotQty
    );
    onApplyStrategy(newLegs, replaceAll);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-[var(--theme-card-text)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)]">
          <div className="flex items-center gap-2.5">
            <span className="mono text-[11px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {preset.category}
            </span>
            <h3 className="mono text-[14px] font-black uppercase tracking-wider text-[var(--theme-card-text)]">
              {preset.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--theme-card-subtitle)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[13px] font-bold"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-[12px] text-[var(--theme-card-subtitle)]">
            {preset.description}
          </p>

          {/* Legs Configuration */}
          <div className="space-y-2">
            <label className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase block">
              Legs Configuration ({preset.legsTemplate.length} Legs)
            </label>
            <div className="space-y-2">
              {preset.legsTemplate.map((tmpl, idx) => {
                const currentOffset = offsets[idx] !== undefined ? offsets[idx] : tmpl.strikeOffset;
                const currentStrike = atmStrike + currentOffset * strikeStep;
                const isBuy = tmpl.action === 'BUY';

                return (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] mono font-black ${
                          isBuy
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-rose-500 text-slate-950'
                        }`}
                      >
                        {tmpl.action}
                      </span>
                      <span className="mono text-[11px] font-bold">
                        {tmpl.lots * lotQty}x
                      </span>
                      <span className="mono text-[11px] font-black text-cyan-400">
                        {tmpl.instrument}
                      </span>
                    </div>

                    {/* Strike Dropdown */}
                    {tmpl.instrument !== 'FUT' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] mono text-[var(--theme-card-subtitle)]">Strike:</span>
                        <select
                          value={currentStrike}
                          onChange={(e) => handleOffsetChange(idx, Number(e.target.value))}
                          className="px-2.5 py-1 rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-[12px] mono font-black text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                        >
                          {strikeOptions.map((strk) => (
                            <option key={strk} value={strk}>
                              {strk} {strk === atmStrike ? '(ATM)' : strk > atmStrike ? `(+${strk - atmStrike})` : `(${strk - atmStrike})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="mono text-[11px] text-[var(--theme-card-subtitle)] font-bold">
                        Underlying Spot/Future
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expiry & Lot Qty Controls */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Expiry Selector */}
            <div>
              <label className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase block mb-1">
                Expiry Date
              </label>
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-[12px] mono font-black text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                {expiries.map((exp) => (
                  <option key={exp} value={exp}>
                    {exp}
                  </option>
                ))}
              </select>
            </div>

            {/* Lot Stepper */}
            <div>
              <label className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase block mb-1">
                Lot Multiplier
              </label>
              <div className="flex items-center rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] p-0.5">
                <button
                  type="button"
                  onClick={() => setLotQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-7 flex items-center justify-center rounded text-[14px] font-black text-[var(--theme-card-subtitle)] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  -
                </button>
                <div className="flex-1 text-center mono text-[12px] font-black">
                  {lotQty} <span className="text-[10px] text-[var(--theme-card-subtitle)] font-normal">({lotQty * lotSize} qty)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLotQty((q) => q + 1)}
                  className="w-8 h-7 flex items-center justify-center rounded text-[14px] font-black text-[var(--theme-card-subtitle)] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg mono text-[11px] font-bold text-[var(--theme-card-subtitle)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleConfirm(false)}
            className="px-3.5 py-1.5 rounded-lg mono text-[11px] font-bold bg-white/5 border border-white/15 text-[var(--theme-card-text)] hover:bg-white/10 transition-colors cursor-pointer"
          >
            + Append to Strategy
          </button>
          <button
            type="button"
            onClick={() => handleConfirm(true)}
            className="px-5 py-1.5 rounded-lg mono text-[11.5px] font-black bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer shadow-md"
          >
            ✓ Apply Preset
          </button>
        </div>
      </div>
    </div>
  );
}
