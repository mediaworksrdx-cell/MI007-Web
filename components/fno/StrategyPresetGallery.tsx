// ─── Exact Opstra Definedge Visual Strategy Preset Gallery ────────────────────
'use client';

import React, { useState, useMemo } from 'react';
import { OptionStrategyPreset } from '@/lib/fno/fnoTypes';
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

  // Filter presets by category
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
    <div className="bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] rounded-xl p-3 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start gap-3">
        {/* Left Stacked 3 Category Buttons (Pro Institutional Palette) */}
        <div className="flex sm:flex-col gap-1.5 w-full sm:w-36 shrink-0">
          <button
            type="button"
            onClick={() => setActiveCategory('BULLISH')}
            style={activeCategory === 'BULLISH' ? { color: '#FFFFFF' } : undefined}
            className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'BULLISH'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-[var(--theme-card-text)] hover:border-[#059669] hover:text-[#059669]'
            }`}
          >
            BULLISH
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('BEARISH')}
            style={activeCategory === 'BEARISH' ? { color: '#FFFFFF' } : undefined}
            className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'BEARISH'
                ? 'bg-[#DC2626] text-white shadow-xs'
                : 'bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-[var(--theme-card-text)] hover:border-[#DC2626] hover:text-[#DC2626]'
            }`}
          >
            BEARISH
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('NON_DIRECTIONAL')}
            style={activeCategory === 'NON_DIRECTIONAL' ? { color: '#FFFFFF' } : undefined}
            className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'NON_DIRECTIONAL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-[var(--theme-card-text)] hover:border-blue-500 hover:text-blue-500'
            }`}
          >
            NON-DIRECTIONAL
          </button>
        </div>

        {/* Right Cards: Horizontal Row of Mini Payoff Thumbnails */}
        <div className="flex-1 flex flex-wrap gap-2 overflow-x-auto pb-1">
          {presetsForCategory.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            const svgPath = preset.payoffSvgPath || 'M 6 20 L 54 20';

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`w-[96px] sm:w-[102px] h-[98px] flex flex-col items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer select-none bg-[var(--theme-card-surface)] ${
                  isSelected
                    ? 'border-blue-500 ring-1 ring-blue-500 shadow-xs'
                    : 'border-[var(--theme-card-border)] hover:border-blue-500/50 hover:shadow-xs'
                }`}
                title={`${preset.name} (${preset.contractComposition || ''})`}
              >
                {/* Mini Payoff Chart Box */}
                <div className="w-full h-[42px] border border-[var(--theme-card-border)] rounded bg-[var(--theme-card-bg)] relative overflow-hidden flex items-center justify-center">
                  <svg viewBox="0 0 60 40" className="w-full h-full">
                    {/* Zero axis line */}
                    <line x1="2" y1="20" x2="58" y2="20" stroke="#64748B" strokeWidth="0.8" strokeDasharray="2 1" opacity="0.5" />

                    {/* Payoff Curve line */}
                    <path
                      d={svgPath}
                      fill="none"
                      stroke={activeCategory === 'BEARISH' ? '#F43F5E' : '#10B981'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Strategy Name */}
                <span className="text-[10px] text-[var(--theme-card-text)] font-semibold text-center leading-tight line-clamp-1 w-full">
                  {preset.name}
                </span>

                {/* Contract Composition Badge */}
                {preset.contractComposition && (
                  <span className="text-[7.5px] px-1 py-0.2 rounded font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 truncate max-w-full text-center">
                    {preset.contractComposition}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
