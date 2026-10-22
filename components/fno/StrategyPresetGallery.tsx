// ─── 2026 Institutional Visual Strategy Preset Gallery ──────────────────────
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

  const categoryColor = useMemo(() => {
    if (activeCategory === 'BULLISH') return { stroke: '#00F59B', glow: 'rgba(0, 245, 155, 0.4)', text: 'text-emerald-400', tag: 'BULLISH' };
    if (activeCategory === 'BEARISH') return { stroke: '#FF4D6D', glow: 'rgba(255, 77, 109, 0.4)', text: 'text-rose-400', tag: 'BEARISH' };
    return { stroke: '#FBBF24', glow: 'rgba(251, 191, 36, 0.4)', text: 'text-amber-400', tag: 'NEUTRAL' };
  }, [activeCategory]);

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 relative overflow-hidden isolate">
      {/* Ambient background glow */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-500"
        style={{
          background: activeCategory === 'BULLISH' ? '#00F59B' : activeCategory === 'BEARISH' ? '#FF4D6D' : '#FBBF24',
        }}
      />

      {/* Header & Category Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2">
          {/* 2026 Tactile Segmented Pill Container */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveCategory('BULLISH')}
              className={`px-4 py-1.5 rounded-lg mono text-[11px] font-black tracking-wider transition-all duration-200 cursor-pointer ${
                activeCategory === 'BULLISH'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.45)]'
                  : 'text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/10'
              }`}
            >
              ▲ BULLISH
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('BEARISH')}
              className={`px-4 py-1.5 rounded-lg mono text-[11px] font-black tracking-wider transition-all duration-200 cursor-pointer ${
                activeCategory === 'BEARISH'
                  ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.45)]'
                  : 'text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/10'
              }`}
            >
              ▼ BEARISH
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('NON_DIRECTIONAL')}
              className={`px-4 py-1.5 rounded-lg mono text-[11px] font-black tracking-wider transition-all duration-200 cursor-pointer ${
                activeCategory === 'NON_DIRECTIONAL'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.45)]'
                  : 'text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              ◆ NON-DIRECTIONAL
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mono text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: categoryColor.stroke }} />
          <span className="font-bold text-white">{presetsForCategory.length}</span>
          <span>Architectures</span>
          <span className="opacity-40">·</span>
          <span className="hidden sm:inline opacity-70">Click to customize strikes &amp; lots</span>
        </div>
      </div>

      {/* 2026 Micro-Canvases Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-2.5 relative z-10">
        {presetsForCategory.map((preset) => {
          const isSelected = preset.id === selectedPresetId;
          const svgPath = preset.payoffSvgPath || 'M 6 20 L 54 20';
          const legsCount = preset.legsTemplate.length;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`group relative flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400 scale-[1.02]'
                  : 'bg-slate-900/60 border-white/[0.08] hover:border-emerald-400/50 hover:bg-slate-800/80 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)]'
              }`}
            >
              {/* Corner Ambient Glow on hover */}
              <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-full blur-md group-hover:bg-emerald-500/15 transition-colors pointer-events-none" />

              {/* Top micro-tag */}
              <div className="flex items-center justify-between gap-1 w-full mb-1.5 mono text-[9px] font-bold">
                <span className="text-slate-400 tracking-wider">
                  {legsCount} {legsCount === 1 ? 'LEG' : 'LEGS'}
                </span>
                <span className={`text-[8.5px] px-1 py-0.2 rounded font-black tracking-tight ${
                  activeCategory === 'BEARISH'
                    ? 'text-rose-400 bg-rose-500/10'
                    : activeCategory === 'NON_DIRECTIONAL'
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-emerald-400 bg-emerald-500/10'
                }`}>
                  {preset.outlook.includes('Debit') ? 'DEBIT' : preset.outlook.includes('Credit') ? 'CREDIT' : 'STRATEGY'}
                </span>
              </div>

              {/* 2026 Glowing Neon Mini-Canvas */}
              <div className="w-full h-12 flex items-center justify-center p-1 bg-slate-950/80 rounded-lg border border-white/5 mb-2 overflow-hidden relative">
                <svg
                  viewBox="0 0 60 40"
                  className="w-full h-full stroke-current group-hover:scale-105 transition-transform duration-300"
                >
                  <defs>
                    <filter id={`glow-${preset.id}`} x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Zero reference axis */}
                  <line
                    x1="4"
                    y1="20"
                    x2="56"
                    y2="20"
                    stroke="#334155"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />

                  {/* Glowing Payoff Curve */}
                  <path
                    d={svgPath}
                    fill="none"
                    stroke={categoryColor.stroke}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={`url(#glow-${preset.id})`}
                  />
                </svg>
              </div>

              {/* Strategy Name */}
              <div className="w-full">
                <span className="mono text-[11px] font-black text-white group-hover:text-emerald-300 transition-colors line-clamp-1 leading-tight tracking-tight">
                  {preset.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
