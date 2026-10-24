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
    <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start gap-3">
        {/* Left Stacked 3 Category Buttons (Pro Institutional Palette) */}
        <div className="flex sm:flex-col gap-1.5 w-full sm:w-36 shrink-0">
          <button
            type="button"
            onClick={() => setActiveCategory('BULLISH')}
            style={activeCategory === 'BULLISH' ? { color: '#FFFFFF' } : undefined}
            className={`w-full py-1.5 px-3 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'BULLISH'
                ? 'bg-[#059669] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:border-[#059669] hover:text-[#059669]'
            }`}
          >
            BULLISH
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('BEARISH')}
            style={activeCategory === 'BEARISH' ? { color: '#FFFFFF' } : undefined}
            className={`w-full py-1.5 px-3 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'BEARISH'
                ? 'bg-[#DC2626] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:border-[#DC2626] hover:text-[#DC2626]'
            }`}
          >
            BEARISH
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('NON_DIRECTIONAL')}
            style={activeCategory === 'NON_DIRECTIONAL' ? { color: '#FFFFFF' } : undefined}
            className={`w-full py-1.5 px-3 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'NON_DIRECTIONAL'
                ? 'bg-[#1E293B] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:border-slate-500 hover:text-slate-900'
            }`}
          >
            NON-DIRECTIONAL
          </button>
        </div>

        {/* Right Cards: Horizontal Row of White Mini Payoff Thumbnails */}
        <div className="flex-1 flex flex-wrap gap-2 overflow-x-auto pb-1">
          {presetsForCategory.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            const svgPath = preset.payoffSvgPath || 'M 6 20 L 54 20';

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`w-[88px] sm:w-[94px] h-[82px] flex flex-col items-center justify-between p-1.5 rounded-sm border transition-all cursor-pointer select-none bg-white ${
                  isSelected
                    ? 'border-[#4CAF50] ring-1 ring-[#4CAF50] shadow-xs'
                    : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
                }`}
                title={preset.name}
              >
                {/* Mini Payoff Chart Box */}
                <div className="w-full h-[46px] border border-slate-200 rounded-2xs bg-white relative overflow-hidden flex items-center justify-center">
                  <svg viewBox="0 0 60 40" className="w-full h-full">
                    {/* Zero axis line */}
                    <line x1="2" y1="20" x2="58" y2="20" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2 1" />

                    {/* Payoff Curve line */}
                    <path
                      d={svgPath}
                      fill="none"
                      stroke={activeCategory === 'BEARISH' ? '#E53E3E' : '#2E7D32'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Strategy Name */}
                <span className="text-[10px] text-slate-700 font-semibold text-center leading-tight line-clamp-2 w-full">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
