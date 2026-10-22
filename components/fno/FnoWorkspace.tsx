// ─── F&O Intelligence Hub Master Workspace ──────────────────────────────────
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';
import { MarketToggle } from '@/components/market/MarketToggle';
import { useMarket } from '@/lib/marketContext';
import { useTradeEngine } from '@/lib/tradeEngineContext';
import {
  FnoInstrument,
  StrategyLeg,
  TradeAction,
  Greeks,
} from '@/lib/fno/fnoTypes';
import {
  SUPPORTED_FNO_INSTRUMENTS,
  generateOptionChain,
  getFuturesTermStructure,
} from '@/lib/fno/fnoDataService';
import {
  INSTITUTIONAL_STRATEGY_PRESETS,
  buildLegsFromPreset,
} from '@/lib/fno/strategyPresets';
import { FnoHeader } from './FnoHeader';
import { MarketOverviewTab } from './MarketOverviewTab';
import { OptionChainTab } from './OptionChainTab';
import { BuildupScannerTab } from './BuildupScannerTab';
import { DerivativesAnalyticsTab } from './DerivativesAnalyticsTab';
import { StrategyBuilderTab } from './StrategyBuilderTab';
import { SavedStrategiesTab } from './SavedStrategiesTab';

export type FnoTabId =
  | 'overview'
  | 'chain'
  | 'buildup'
  | 'analytics'
  | 'builder'
  | 'strategies';

interface FnoWorkspaceProps {
  initialTab?: FnoTabId;
}

export function FnoWorkspace({ initialTab = 'overview' }: FnoWorkspaceProps) {
  const { market, setMarket } = useMarket();
  const { getSymbolPrice, status: tradeEngineStatus } = useTradeEngine();

  // Active instrument
  const [selectedInstrument, setSelectedInstrument] = useState<FnoInstrument>(
    SUPPORTED_FNO_INSTRUMENTS[0]
  );

  // Active expiry
  const [selectedExpiry, setSelectedExpiry] = useState<string>(
    SUPPORTED_FNO_INSTRUMENTS[0].currentExpiry
  );

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<FnoTabId>(initialTab);

  // Synchronize with live price from tradeEngine
  const liveSpotData = getSymbolPrice(selectedInstrument.symbol);
  const liveSpot = liveSpotData ? liveSpotData.price : selectedInstrument.spotPrice;

  // Option Chain Data
  const chainData = useMemo(() => {
    return generateOptionChain(selectedInstrument.symbol, selectedExpiry, liveSpot);
  }, [selectedInstrument.symbol, selectedExpiry, liveSpot]);

  // Futures Term Structure
  const termStructure = useMemo(() => {
    return getFuturesTermStructure(selectedInstrument.symbol, liveSpot);
  }, [selectedInstrument.symbol, liveSpot]);

  // Active Strategy Legs (seeded with initial preset)
  const [activeLegs, setActiveLegs] = useState<StrategyLeg[]>(() => {
    const defaultPreset = INSTITUTIONAL_STRATEGY_PRESETS[0]; // Bull Call Spread
    return buildLegsFromPreset(
      defaultPreset,
      selectedInstrument.spotPrice,
      selectedInstrument.strikeStep,
      selectedInstrument.currentExpiry,
      selectedInstrument.lotSize
    );
  });

  // Switch instrument
  const handleSelectInstrument = (inst: FnoInstrument) => {
    setSelectedInstrument(inst);
    setSelectedExpiry(inst.currentExpiry);

    // Rebuild default preset for new instrument
    const defaultPreset = INSTITUTIONAL_STRATEGY_PRESETS[0];
    const newLegs = buildLegsFromPreset(
      defaultPreset,
      inst.spotPrice,
      inst.strikeStep,
      inst.currentExpiry,
      inst.lotSize
    );
    setActiveLegs(newLegs);
  };

  // Add leg from Option Chain table
  const handleAddLegFromChain = (
    action: TradeAction,
    instrument: 'CE' | 'PE',
    strike: number,
    price: number,
    iv: number,
    greeks: Greeks
  ) => {
    const newLeg: StrategyLeg = {
      id: `chain-leg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      instrument,
      strike,
      expiry: selectedExpiry,
      lots: 1,
      lotSize: selectedInstrument.lotSize,
      entryPrice: price,
      currentPrice: price,
      iv,
      greeks,
    };

    setActiveLegs((prev) => [...prev, newLeg]);
  };

  // Load a saved strategy into builder
  const handleLoadSavedStrategy = (legs: StrategyLeg[]) => {
    setActiveLegs(legs);
    setActiveTab('builder');
  };

  const WORKSPACE_TABS = [
    { id: 'overview' as const, label: 'OVERVIEW', icon: '⚡' },
    { id: 'chain' as const, label: 'OPTION CHAIN', icon: '⛓️' },
    { id: 'buildup' as const, label: 'BUILDUP SCANNER', icon: '📡' },
    { id: 'analytics' as const, label: 'ANALYTICS', icon: '📊' },
    { id: 'builder' as const, label: 'STRATEGY BUILDER', icon: '🛠️' },
    { id: 'strategies' as const, label: 'SAVED STRATEGIES', icon: '💼' },
  ];

  return (
    <div className="mx-auto max-w-[1700px] px-3 sm:px-4 lg:px-6 relative z-20 isolate">
      <div className="relative rounded-2xl border-2 terminal-page-panel shadow-xl p-3.5 sm:p-6 lg:p-8 overflow-hidden">
        {/* Top Outer Hairline Accent */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-600 pointer-events-none" />

        {/* ── Outer Bezel Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-[var(--theme-card-border)] relative z-[100]">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <Link
              href="/terminal"
              className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-2 mono text-[12px] font-bold shadow-xs shrink-0 group cursor-pointer"
              title="Return to Dashboard"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span className="font-black">BACK TO DASHBOARD</span>
            </Link>

            <div className="flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center flex-shrink-0 overflow-visible">
              <Falcon3DLogo
                src="/images/logo-falcon-transparent.png"
                alt="MARKET INTELLIGENCE MI-007"
                width={52}
                height={52}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="mono text-[17px] sm:text-[23px] font-black inst-card-text tracking-wider uppercase whitespace-nowrap">
                F&amp;O INTELLIGENCE HUB
              </h1>
              <p className="mono text-[10.5px] sm:text-[12px] font-bold text-[var(--theme-card-subtitle)] tracking-wide uppercase truncate">
                Institutional Derivatives Terminal · Options Analytics &amp; Strategy Architect
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <MarketToggle market={market} onMarketChange={setMarket} />
          </div>
        </div>

        {/* ── Centered Segmented Module Tabs (Institutional Style) ── */}
        <div className="flex justify-center mb-6">
          <div className="w-full sm:w-fit inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] shadow-xs">
            {WORKSPACE_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg mono text-[13px] tracking-wide text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'font-bold text-[var(--theme-card-text-muted)] hover:text-emerald-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── F&O Market Header ── */}
        <FnoHeader
          selectedInstrument={selectedInstrument}
          onSelectInstrument={handleSelectInstrument}
          selectedExpiry={selectedExpiry}
          onSelectExpiry={setSelectedExpiry}
          chainData={chainData}
          termStructure={termStructure}
          liveSpot={liveSpot}
          engineConnected={tradeEngineStatus === 'connected'}
        />

        {/* ── Active Tab Workspace Body ── */}
        <div>
          {activeTab === 'overview' && (
            <MarketOverviewTab
              instrument={selectedInstrument}
              chainData={chainData}
              termStructure={termStructure}
              onOpenChainTab={() => setActiveTab('chain')}
              onOpenBuildupTab={() => setActiveTab('buildup')}
            />
          )}

          {activeTab === 'chain' && (
            <OptionChainTab
              chainData={chainData}
              onAddLegToBuilder={handleAddLegFromChain}
              onOpenBuilderTab={() => setActiveTab('builder')}
            />
          )}

          {activeTab === 'buildup' && (
            <BuildupScannerTab
              onSelectInstrument={handleSelectInstrument}
              onOpenChainTab={() => setActiveTab('chain')}
            />
          )}

          {activeTab === 'analytics' && (
            <DerivativesAnalyticsTab
              instrument={selectedInstrument}
              chainData={chainData}
              onOpenBuilderTab={() => setActiveTab('builder')}
            />
          )}

          {activeTab === 'builder' && (
            <StrategyBuilderTab
              instrument={selectedInstrument}
              spotPrice={liveSpot}
              activeLegs={activeLegs}
              onUpdateLegs={setActiveLegs}
              selectedExpiry={selectedExpiry}
              onOpenSavedTab={() => setActiveTab('strategies')}
              chainData={chainData}
              termStructure={termStructure}
            />
          )}

          {activeTab === 'strategies' && (
            <SavedStrategiesTab
              onLoadStrategy={handleLoadSavedStrategy}
              onOpenBuilderTab={() => setActiveTab('builder')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
