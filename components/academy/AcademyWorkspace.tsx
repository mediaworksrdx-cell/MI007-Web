'use client';

import React, { useState } from 'react';
import {
  TrainingModule,
  ACADEMY_MODULES_BY_MARKET,
  MarketCode,
} from '@/lib/academy/academyData';
import { useMarket } from '@/lib/marketContext';
import { CurriculumTabView } from './CurriculumTabView';
import { AskMentorTabView } from './AskMentorTabView';
import { ModuleDetailModal } from './ModuleDetailModal';

export function AcademyWorkspace() {
  const { market } = useMarket();
  const [selectedTab, setSelectedTab] = useState<'LIBRARY' | 'MENTOR'>('LIBRARY');
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [mentorQuery, setMentorQuery] = useState<string | undefined>(undefined);

  // Map market context to MarketCode
  const activeMarketCode: MarketCode =
    market === 'INDIA' ? 'IN' : market === 'UAE' ? 'UAE' : 'US';

  const modules = ACADEMY_MODULES_BY_MARKET[activeMarketCode] ?? ACADEMY_MODULES_BY_MARKET.IN;

  const handleAskMentor = (query: string) => {
    setMentorQuery(query);
    setSelectedTab('MENTOR');
    setSelectedModule(null);
  };

  return (
    <div className="space-y-7">
      {/* Tab Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--theme-card-border)] pb-4">
        <div className="flex items-center gap-2 font-mono text-[13px] font-bold">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setSelectedTab('LIBRARY');
            }}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              selectedTab === 'LIBRARY'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] opacity-75 hover:opacity-100'
            }`}
          >
            📚 Learning Library
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setSelectedTab('MENTOR');
            }}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'MENTOR'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] opacity-75 hover:opacity-100'
            }`}
          >
            <span>🧠 Ask Aarka Mentor</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Primary Tab Content (preserve DOM elements to prevent layout jumps and maintain chat state) */}
      <div className={selectedTab === 'LIBRARY' ? 'block' : 'hidden'}>
        <CurriculumTabView
          modules={modules}
          activeMarket={activeMarketCode}
          onSelectModule={mod => setSelectedModule(mod)}
        />
      </div>

      <div className={selectedTab === 'MENTOR' ? 'block' : 'hidden'}>
        <AskMentorTabView initialQuery={mentorQuery} />
      </div>

      {/* Module Detail Overlay Modal */}
      {selectedModule && (
        <ModuleDetailModal
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
          onAskMentor={handleAskMentor}
        />
      )}
    </div>
  );
}
