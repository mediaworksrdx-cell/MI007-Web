'use client';

import React, { useState } from 'react';
import {
  TrainingModule,
  AiTradeSignal,
  ScannerSignalInfo,
  ACADEMY_MODULES_BY_MARKET,
  MarketCode,
} from '@/lib/academy/academyData';
import { useMarket } from '@/lib/marketContext';
import { CurriculumTabView } from './CurriculumTabView';
import { AskMentorTabView } from './AskMentorTabView';
import { LiveTrainingTabView } from './LiveTrainingTabView';
import { ModuleDetailModal } from './ModuleDetailModal';
import { LiveSignalDetailModal } from './LiveSignalDetailModal';

export function AcademyWorkspace() {
  const { market } = useMarket();
  const [selectedTab, setSelectedTab] = useState<'LIBRARY' | 'MENTOR' | 'TRAINING'>('LIBRARY');
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [selectedFnoSignal, setSelectedFnoSignal] = useState<AiTradeSignal | null>(null);
  const [selectedScannerSignal, setSelectedScannerSignal] = useState<ScannerSignalInfo | null>(null);
  const [mentorQuery, setMentorQuery] = useState<string | undefined>(undefined);

  // Map market context to MarketCode
  const activeMarketCode: MarketCode =
    market === 'INDIA' ? 'IN' : market === 'UAE' ? 'UAE' : 'US';

  const modules = ACADEMY_MODULES_BY_MARKET[activeMarketCode] ?? ACADEMY_MODULES_BY_MARKET.IN;

  const handleAskMentor = (query: string) => {
    setMentorQuery(query);
    setSelectedTab('MENTOR');
    setSelectedModule(null);
    setSelectedFnoSignal(null);
    setSelectedScannerSignal(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-card-border)] pb-3">
        <div className="flex items-center gap-2 font-mono text-[13px] font-bold">
          <button
            type="button"
            onClick={() => setSelectedTab('LIBRARY')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              selectedTab === 'LIBRARY'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] opacity-75 hover:opacity-100'
            }`}
          >
            📚 Library & Curriculum
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('MENTOR')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              selectedTab === 'MENTOR'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] opacity-75 hover:opacity-100'
            }`}
          >
            <span>🧠 Ask Aarka Mentor</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('TRAINING')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              selectedTab === 'TRAINING'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] opacity-75 hover:opacity-100'
            }`}
          >
            ⚡ Live Training & Signals
          </button>
        </div>

        {/* Active Region Pill */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="opacity-60 uppercase">Region:</span>
          <span className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] font-bold text-emerald-400">
            {activeMarketCode === 'IN' ? '🇮🇳 India (NSE/BSE)' : activeMarketCode === 'UAE' ? '🇦🇪 UAE (DFM/ADX)' : '🇺🇸 USA (NYSE/NASDAQ)'}
          </span>
        </div>
      </div>

      {/* Primary Tab Content */}
      {selectedTab === 'LIBRARY' && (
        <CurriculumTabView
          modules={modules}
          activeMarket={activeMarketCode}
          onSelectModule={mod => setSelectedModule(mod)}
        />
      )}

      {selectedTab === 'MENTOR' && (
        <AskMentorTabView initialQuery={mentorQuery} />
      )}

      {selectedTab === 'TRAINING' && (
        <LiveTrainingTabView
          onOpenSignal={sig => setSelectedFnoSignal(sig)}
          onOpenScannerSignal={sig => setSelectedScannerSignal(sig)}
        />
      )}

      {/* Module Detail Overlay Modal */}
      {selectedModule && (
        <ModuleDetailModal
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
          onAskMentor={handleAskMentor}
        />
      )}

      {/* Live Signal Detail Overlay Modal */}
      {(selectedFnoSignal || selectedScannerSignal) && (
        <LiveSignalDetailModal
          fnoSignal={selectedFnoSignal}
          scannerSignal={selectedScannerSignal}
          onClose={() => {
            setSelectedFnoSignal(null);
            setSelectedScannerSignal(null);
          }}
          onAskMentor={handleAskMentor}
        />
      )}
    </div>
  );
}
