// ─── 2026 Preset Configuration Popover / Modal ──────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden text-white relative">
        {/* Subtle radial glow */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-slate-900/60 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className={`mono text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
              preset.category === 'BULLISH'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : preset.category === 'BEARISH'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {preset.category}
            </span>
            <h3 className="mono text-[15px] font-black uppercase tracking-wider text-white">
              {preset.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[14px] font-bold"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 relative z-10">
          <p className="text-[12.5px] text-slate-300 leading-relaxed">
            {preset.description}
          </p>

          {/* Legs Configuration */}
          <div className="space-y-2">
            <label className="mono text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
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
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/80 border border-white/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] mono font-black ${
                          isBuy
                            ? 'bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                            : 'bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                        }`}
                      >
                        {tmpl.action}
                      </span>
                      <span className="mono text-[12px] font-black text-white">
                        {tmpl.lots * lotQty}x
                      </span>
                      <span className="mono text-[12px] font-black text-cyan-400">
                        {tmpl.instrument}
                      </span>
                    </div>

                    {/* Strike Dropdown */}
                    {tmpl.instrument !== 'FUT' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] mono text-slate-400 font-bold">Strike:</span>
                        <select
                          value={currentStrike}
                          onChange={(e) => handleOffsetChange(idx, Number(e.target.value))}
                          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-[12px] mono font-black text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-inner"
                        >
                          {strikeOptions.map((strk) => (
                            <option key={strk} value={strk} className="bg-slate-950 text-white">
                              {strk} {strk === atmStrike ? '(ATM ★)' : strk > atmStrike ? `(+${strk - atmStrike})` : `(${strk - atmStrike})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="mono text-[11px] text-amber-400 font-bold px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
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
              <label className="mono text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Expiry Date
              </label>
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-[12px] mono font-black text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-inner"
              >
                {expiries.map((exp) => (
                  <option key={exp} value={exp} className="bg-slate-950 text-white">
                    {exp}
                  </option>
                ))}
              </select>
            </div>

            {/* Lot Stepper */}
            <div>
              <label className="mono text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Lot Multiplier
              </label>
              <div className="flex items-center rounded-xl bg-slate-900/90 border border-white/10 p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setLotQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[14px] font-black text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  -
                </button>
                <div className="flex-1 text-center mono text-[12.5px] font-black text-white">
                  {lotQty} <span className="text-[10px] text-slate-400 font-normal">({lotQty * lotSize} qty)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLotQty((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[14px] font-black text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-white/[0.08] bg-slate-900/60 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl mono text-[11px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleConfirm(false)}
            className="px-4 py-2 rounded-xl mono text-[11px] font-bold bg-white/5 border border-white/15 text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            + Append to Strategy
          </button>
          <button
            type="button"
            onClick={() => handleConfirm(true)}
            className="px-5 py-2 rounded-xl mono text-[11.5px] font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer shadow-md"
          >
            ✓ Apply Preset
          </button>
        </div>
      </div>
    </div>
  );
}
