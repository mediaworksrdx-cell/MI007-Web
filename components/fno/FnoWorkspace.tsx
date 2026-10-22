// ─── F&O Intelligence Hub Master Workspace ──────────────────────────────────
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  getWeeklyAndMonthlyExpiries,
} from '@/lib/fno/fnoDataService';
import {
  INSTITUTIONAL_STRATEGY_PRESETS,
  buildLegsFromPreset,
} from '@/lib/fno/strategyPresets';
import { useFnoDataFeed } from '@/lib/fno/useFnoDataFeed';
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
  const [selectedInstrument, setSelectedInstrument] = useState<FnoInstrument>(() => {
    return SUPPORTED_FNO_INSTRUMENTS.find((i) => i.market === market) || SUPPORTED_FNO_INSTRUMENTS[0];
  });

  // Active expiry
  const [selectedExpiry, setSelectedExpiry] = useState<string>(() => {
    const initialInst = SUPPORTED_FNO_INSTRUMENTS.find((i) => i.market === market) || SUPPORTED_FNO_INSTRUMENTS[0];
    return initialInst.currentExpiry;
  });

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<FnoTabId>(initialTab);

  // Synchronize instrument when active market toggle changes
  useEffect(() => {
    if (selectedInstrument.market !== market) {
      const match = SUPPORTED_FNO_INSTRUMENTS.find((i) => i.market === market);
      if (match) {
        handleSelectInstrument(match);
      }
    }
  }, [market, selectedInstrument.market]);

  // Connect to dedicated Twelve Data F&O Engine (isolated from general trade engine)
  const fnoFeed = useFnoDataFeed({
    symbol: selectedInstrument.symbol,
    market: selectedInstrument.market,
    fallbackSpot: selectedInstrument.spotPrice,
  });

  // Prioritize dedicated F&O engine spot, fallback to central trade engine
  const liveSpotData = getSymbolPrice(selectedInstrument.symbol);
  const liveSpot = fnoFeed.liveSpot && fnoFeed.liveSpot > 0
    ? fnoFeed.liveSpot
    : (liveSpotData ? liveSpotData.price : selectedInstrument.spotPrice);

  // Option Chain Data (active selected expiry)
  const chainData = useMemo(() => {
    return generateOptionChain(selectedInstrument.symbol, selectedExpiry, liveSpot);
  }, [selectedInstrument.symbol, selectedExpiry, liveSpot]);

  // Weekly & Monthly Expiries
  const { weeklyExpiry, monthlyExpiry } = useMemo(() => {
    return getWeeklyAndMonthlyExpiries(selectedInstrument.expiries);
  }, [selectedInstrument.expiries]);

  // Weekly Option Chain Data
  const weeklyChainData = useMemo(() => {
    if (selectedExpiry === weeklyExpiry) return chainData;
    return generateOptionChain(selectedInstrument.symbol, weeklyExpiry, liveSpot);
  }, [selectedInstrument.symbol, weeklyExpiry, liveSpot, selectedExpiry, chainData]);

  // Monthly Option Chain Data
  const monthlyChainData = useMemo(() => {
    if (selectedExpiry === monthlyExpiry) return chainData;
    return generateOptionChain(selectedInstrument.symbol, monthlyExpiry, liveSpot);
  }, [selectedInstrument.symbol, monthlyExpiry, liveSpot, selectedExpiry, chainData]);

  // Futures Term Structure
  const termStructure = useMemo(() => {
    return getFuturesTermStructure(selectedInstrument.symbol, liveSpot);
  }, [selectedInstrument.symbol, liveSpot]);

  // Active Strategy Legs (Starts clean and empty until user adds legs or selects a preset)
  const [activeLegs, setActiveLegs] = useState<StrategyLeg[]>([]);

  // Switch instrument
  const handleSelectInstrument = (inst: FnoInstrument) => {
    setSelectedInstrument(inst);
    setSelectedExpiry(inst.currentExpiry);
    if (inst.market && inst.market !== market) {
      setMarket(inst.market);
    }
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

            <div className="flex h-[47px] w-[47px] sm:h-[55px] sm:w-[55px] items-center justify-center flex-shrink-0 overflow-visible">
              <Falcon3DLogo
                src="/images/logo-falcon-transparent.png"
                alt="MARKET INTELLIGENCE MI-007"
                width={55}
                height={55}
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
            <MarketToggle selected={market} onChange={setMarket} market={market} onMarketChange={setMarket} />
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
          weeklyChainData={weeklyChainData}
          monthlyChainData={monthlyChainData}
          weeklyExpiry={weeklyExpiry}
          monthlyExpiry={monthlyExpiry}
          termStructure={termStructure}
          liveSpot={liveSpot}
          engineConnected={tradeEngineStatus === 'connected'}
          fnoEngineStatus={fnoFeed.engineStatus}
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
              market={selectedInstrument.market}
              onSelectInstrument={handleSelectInstrument}
              onOpenChainTab={() => setActiveTab('chain')}
            />
          )}

          {activeTab === 'analytics' && (
            <DerivativesAnalyticsTab
              instrument={selectedInstrument}
              chainData={chainData}
              weeklyChainData={weeklyChainData}
              monthlyChainData={monthlyChainData}
              onDeployStrategy={handleLoadSavedStrategy}
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
