// ─── Visual Strategy Preset Gallery (Opstra Definedge Compatible) ─────────────
'use client';

import React, { useState, useMemo } from 'react';
import { OptionStrategyPreset, StrategyCategory } from '@/lib/fno/fnoTypes';
import { INSTITUTIONAL_STRATEGY_PRESETS } from '@/lib/fno/strategyPresets';

interface StrategyPresetGalleryProps {
  onSelectPreset: (preset: OptionStrategyPreset) => void;
  selectedPresetId?: string;
}

export function StrategyPresetGallery({
  onSelectPreset,
  selectedPresetId,
}: StrategyPresetGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<'BULLISH' | 'BEARISH' | 'NON_DIRECTIONAL'>('BULLISH');

  // Map non-directional to NEUTRAL / VOLATILE presets
  const presetsForCategory = useMemo(() => {
    if (activeCategory === 'BULLISH') {
      return INSTITUTIONAL_STRATEGY_PRESETS.filter((p) => p.category === 'BULLISH');
    }
    if (activeCategory === 'BEARISH') {
      return INSTITUTIONAL_STRATEGY_PRESETS.filter((p) => p.category === 'BEARISH');
    }
    return INSTITUTIONAL_STRATEGY_PRESETS.filter(
      (p) => p.category === 'NEUTRAL' || p.category === 'VOLATILE'
    );
  }, [activeCategory]);

  return (
    <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3">
      {/* Category Toggle Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--theme-card-border)]">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
          <button
            type="button"
            onClick={() => setActiveCategory('BULLISH')}
            className={`px-3.5 py-1.5 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeCategory === 'BULLISH'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            BULLISH
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('BEARISH')}
            className={`px-3.5 py-1.5 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeCategory === 'BEARISH'
                ? 'bg-rose-500 text-slate-950 shadow-xs'
                : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
            }`}
          >
            BEARISH
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('NON_DIRECTIONAL')}
            className={`px-3.5 py-1.5 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeCategory === 'NON_DIRECTIONAL'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            NON-DIRECTIONAL
          </button>
        </div>

        <span className="mono text-[10.5px] text-[var(--theme-card-subtitle)] hidden sm:inline">
          {presetsForCategory.length} Templates · Click any card to customize strikes
        </span>
      </div>

      {/* Visual Preset Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-2">
        {presetsForCategory.map((preset) => {
          const isSelected = preset.id === selectedPresetId;
          const svgPath = preset.payoffSvgPath || 'M 6 20 L 54 20';

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`group flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-md ring-1 ring-emerald-500'
                  : 'bg-[var(--theme-card-subsurface)] border-[var(--theme-card-border)] text-[var(--theme-card-text)] hover:border-emerald-500/50 hover:bg-[var(--theme-card-surface)]'
              }`}
            >
              {/* Mini SVG Payoff Thumbnail */}
              <div className="w-full h-11 flex items-center justify-center p-1 bg-slate-950/40 rounded-lg border border-white/5 mb-1.5 overflow-hidden">
                <svg
                  viewBox="0 0 60 40"
                  className="w-full h-full text-emerald-400 stroke-current group-hover:scale-105 transition-transform"
                >
                  {/* Zero dashed line */}
                  <line
                    x1="4"
                    y1="20"
                    x2="56"
                    y2="20"
                    stroke="#475569"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />
                  {/* Payoff Curve */}
                  <path
                    d={svgPath}
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={
                      activeCategory === 'BEARISH'
                        ? 'text-rose-400'
                        : activeCategory === 'NON_DIRECTIONAL'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }
                  />
                </svg>
              </div>

              {/* Strategy Name */}
              <span className="mono text-[10.5px] font-bold line-clamp-2 leading-tight tracking-tight">
                {preset.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
