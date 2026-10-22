'use client';

import React from 'react';
import { TrainingModule, MarketCode } from '@/lib/academy/academyData';

interface CurriculumTabProps {
  modules: TrainingModule[];
  activeMarket: MarketCode;
  onSelectModule: (module: TrainingModule) => void;
}

export function CurriculumTabView({
  modules,
  activeMarket,
  onSelectModule,
}: CurriculumTabProps) {
  return (
    <div className="space-y-6">
      {/* Institutional KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-3 sm:p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="text-[10px] uppercase opacity-60 font-bold">Theory Mastery</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">84.2%</div>
          <div className="text-[10.5px] opacity-60 mt-0.5">Verified Institutional Core</div>
        </div>
        <div className="p-3 sm:p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="text-[10px] uppercase opacity-60 font-bold">Sim Accuracy</div>
          <div className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">72.0%</div>
          <div className="text-[10.5px] opacity-60 mt-0.5">Order Flow & Gamma Drills</div>
        </div>
        <div className="p-3 sm:p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="text-[10px] uppercase opacity-60 font-bold">Active Modules</div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{modules.length}</div>
          <div className="text-[10.5px] opacity-60 mt-0.5">Region: {activeMarket}</div>
        </div>
        <div className="p-3 sm:p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="text-[10px] uppercase opacity-60 font-bold">Discipline Metric</div>
          <div className="text-xl sm:text-2xl font-black text-purple-400 mt-1">88 / 100</div>
          <div className="text-[10.5px] opacity-60 mt-0.5">Emotion Shield Armed</div>
        </div>
      </div>

      {/* Curriculum Module Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="mono text-[11px] font-black uppercase text-emerald-400 tracking-wider">
            Unified Knowledge Framework ({activeMarket})
          </h3>
          <span className="text-[11px] font-mono opacity-60">Select any module to mount interactive engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {modules.map(module => (
            <div
              key={module.id}
              onClick={() => !module.locked && onSelectModule(module)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group select-none ${
                module.locked
                  ? 'border-[var(--theme-card-border)] opacity-60 cursor-not-allowed bg-[var(--theme-card-surface)]'
                  : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500/70 hover:shadow-lg'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[11px] font-black ${
                        module.locked ? 'bg-black/20 text-slate-500' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {module.locked ? '🔒' : '▶'}
                    </span>
                    <h4 className="font-extrabold text-[14px] uppercase tracking-tight group-hover:text-emerald-400 transition-colors">
                      {module.title}
                    </h4>
                  </div>
                  <span className="mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] opacity-80 shrink-0">
                    ⏱ {module.duration}
                  </span>
                </div>

                <p className="text-[12px] opacity-75 line-clamp-2 mb-3 leading-relaxed">
                  {module.description}
                </p>

                {/* Topics Pills */}
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                  {module.topics.map(t => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] opacity-85"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Action Hint */}
              <div className="mt-4 pt-3 border-t border-[var(--theme-card-border)] flex items-center justify-between mono text-[11px]">
                <span className="text-emerald-400 font-bold group-hover:underline">
                  {module.locked ? 'Locked (Requires Institutional Clearance)' : 'Launch Interactive Engine →'}
                </span>
                <span className="opacity-50">ID: #{module.id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
