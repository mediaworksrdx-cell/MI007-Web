// ─── Institutional Strategy Builder & Analyzer (Opstra Definedge Layout) ──────
'use client';

import React, { useState, useMemo } from 'react';
import {
  FnoInstrument,
  StrategyLeg,
  StrategyCategory,
  OptionStrategyPreset,
  OptionChainData,
  FuturesTermStructure,
  TrackedStrategy,
} from '@/lib/fno/fnoTypes';
import { INSTITUTIONAL_STRATEGY_PRESETS, buildLegsFromPreset } from '@/lib/fno/strategyPresets';
import { calculateStrategyPayoff } from '@/lib/fno/payoffEngine';
import { PayoffDiagram } from './PayoffDiagram';
import { StrategyPresetGallery } from './StrategyPresetGallery';
import { PresetConfigModal } from './PresetConfigModal';
import { ManualPositionBar } from './ManualPositionBar';
import { CollapsibleOptionChain } from './CollapsibleOptionChain';
import { StrategyPositionsList } from './StrategyPositionsList';
import { saveTrackedStrategy } from '@/lib/fno/savedStrategiesService';
import { calculateBSPrice, calculateBSGreeks } from '@/lib/fno/blackScholes';

interface StrategyBuilderTabProps {
  instrument: FnoInstrument;
  spotPrice: number;
  activeLegs: StrategyLeg[];
  onUpdateLegs: (legs: StrategyLeg[]) => void;
  selectedExpiry: string;
  onOpenSavedTab?: () => void;
  chainData?: OptionChainData;
  termStructure?: FuturesTermStructure;
}

export function StrategyBuilderTab({
  instrument,
  spotPrice,
  activeLegs,
  onUpdateLegs,
  selectedExpiry,
  onOpenSavedTab,
  chainData,
  termStructure,
}: StrategyBuilderTabProps) {
  const [selectedPresetForModal, setSelectedPresetForModal] = useState<OptionStrategyPreset | null>(null);
  const [strategyName, setStrategyName] = useState<string>('Custom Strategy');
  const [strategyCategory, setStrategyCategory] = useState<StrategyCategory>('BULLISH');
  const [timeShiftDays, setTimeShiftDays] = useState<number>(0);
  const [ivShiftPct, setIvShiftPct] = useState<number>(0);
  const [savedToast, setSavedToast] = useState(false);

  // Futures price
  const futuresPrice = useMemo(() => {
    if (termStructure && termStructure.contracts.length > 0) {
      return termStructure.contracts[0].ltp;
    }
    return Math.round(spotPrice * 1.002 * 10) / 10;
  }, [termStructure, spotPrice]);

  // Implied Volatility & IV Percentile
  const ivValue = 15.87;
  const ivPercentile = 75.51;
  const daysToExpiry = 7;

  // Calculate Payoff
  const payoff = useMemo(() => {
    return calculateStrategyPayoff(
      activeLegs,
      spotPrice,
      strategyName,
      strategyCategory,
      {
        timeShiftDays,
        ivShiftPct,
        daysToExpiry,
      }
    );
  }, [activeLegs, spotPrice, strategyName, strategyCategory, timeShiftDays, ivShiftPct, daysToExpiry]);

  // Apply a preset from modal
  const handleApplyPreset = (newLegs: StrategyLeg[], replaceAll: boolean) => {
    if (replaceAll) {
      onUpdateLegs(newLegs);
    } else {
      onUpdateLegs([...activeLegs, ...newLegs]);
    }
    if (selectedPresetForModal) {
      setStrategyName(selectedPresetForModal.name);
      setStrategyCategory(selectedPresetForModal.category);
    }
  };

  // Add a leg (from manual bar or option chain)
  const handleAddLeg = (newLeg: StrategyLeg) => {
    onUpdateLegs([...activeLegs, newLeg]);
  };

  // Modify leg
  const handleUpdateLeg = (id: string, updates: Partial<StrategyLeg>) => {
    const updated = activeLegs.map((leg) => {
      if (leg.id !== id) return leg;
      const merged = { ...leg, ...updates };

      // Re-estimate price and greeks if strike or instrument changed
      if (updates.strike !== undefined || updates.instrument !== undefined) {
        if (merged.instrument === 'FUT') {
          merged.entryPrice = spotPrice;
          merged.currentPrice = spotPrice;
          merged.greeks = { delta: 1.0, gamma: 0, theta: 0, vega: 0, rho: 0 };
        } else {
          const timeYears = 7 / 365.0;
          const vol = Math.max(0.05, merged.iv / 100.0);
          merged.entryPrice = Math.max(
            0.05,
            Math.round(
              calculateBSPrice(merged.instrument, {
                spot: spotPrice,
                strike: merged.strike,
                timeYears,
                volatility: vol,
              }) * 20
            ) / 20
          );
          merged.currentPrice = merged.entryPrice;
          merged.greeks = calculateBSGreeks(merged.instrument, {
            spot: spotPrice,
            strike: merged.strike,
            timeYears,
            volatility: vol,
          });
        }
      }

      return merged;
    });

    onUpdateLegs(updated);
  };

  // Remove leg
  const handleRemoveLeg = (id: string) => {
    onUpdateLegs(activeLegs.filter((l) => l.id !== id));
  };

  // Toggle All Legs Enabled/Disabled
  const handleToggleAll = (enable: boolean) => {
    onUpdateLegs(activeLegs.map((l) => ({ ...l, disabled: !enable })));
  };

  // Clear all
  const handleClearAll = () => {
    onUpdateLegs([]);
  };

  // Save to tracked strategies
  const handleSaveStrategy = () => {
    if (activeLegs.length === 0) return;
    const tracked: TrackedStrategy = {
      id: `tracked-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${instrument.symbol} ${strategyName}`,
      category: strategyCategory,
      underlyingSymbol: instrument.symbol,
      spotPriceAtCreation: spotPrice,
      currentSpotPrice: spotPrice,
      createdAt: new Date().toISOString().slice(0, 10),
      expiry: selectedExpiry,
      legs: activeLegs,
      entryNetCost: payoff.netDebitCredit,
      currentPnl: 0,
      probabilityOfProfit: payoff.probabilityOfProfit,
      maxProfit: payoff.maxProfit,
      maxLoss: payoff.maxLoss,
      breakevens: payoff.breakevens,
    };

    saveTrackedStrategy(tracked);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="space-y-4 fno-dark-cockpit">
      {/* ── Saved Toast Notification ── */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl shadow-2xl mono text-[12px] font-black flex items-center gap-2 border border-emerald-300">
          <span>✓</span>
          <span>Strategy Saved to Tracked Portfolio!</span>
          {onOpenSavedTab && (
            <button
              onClick={onOpenSavedTab}
              className="ml-2 px-2 py-0.5 rounded bg-slate-950 text-emerald-400 text-[10px] uppercase font-bold hover:bg-slate-900 cursor-pointer"
            >
              View Tracked →
            </button>
          )}
        </div>
      )}

      {/* ── 1. Top Metrics Bar (2026 Institutional Badges) ── */}
      <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-[11px] mono">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Spot Price */}
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase text-slate-400 font-bold">Spot:</span>
            <span className="font-black text-emerald-400 text-[13px]">
              ₹{spotPrice.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Futures Price */}
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] uppercase text-slate-400 font-bold">Futures:</span>
            <span className="font-black text-amber-400 text-[13px]">
              ₹{futuresPrice.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Lot Size */}
          <div className="px-3 py-1.5 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center gap-1.5 shadow-xs">
            <span className="text-[10px] uppercase text-slate-400 font-bold">Lot Size:</span>
            <span className="font-black text-lime-400">
              {instrument.lotSize}
            </span>
          </div>

          {/* IV */}
          <div className="px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-1.5 shadow-xs">
            <span className="text-[10px] uppercase text-slate-400 font-bold">IV:</span>
            <span className="font-black text-yellow-400">
              {ivValue}%
            </span>
          </div>

          {/* IV Percentile */}
          <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-1.5 shadow-xs">
            <span className="text-[10px] uppercase text-slate-400 font-bold">IVP:</span>
            <span className="font-black text-purple-400">
              {ivPercentile}%
            </span>
          </div>

          {/* DTE */}
          <div className="px-3 py-1.5 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center gap-1.5 shadow-xs">
            <span className="text-[10px] uppercase text-slate-400 font-bold">DTE:</span>
            <span className="font-black text-fuchsia-400">
              {daysToExpiry} Days
            </span>
          </div>
        </div>

        {/* Save & Track Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveStrategy}
            disabled={activeLegs.length === 0}
            className="px-4 py-2 rounded-xl mono text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer shadow-md disabled:opacity-40"
          >
            💼 Save &amp; Track Strategy
          </button>
        </div>
      </div>

      {/* ── 2. Visual Strategy Preset Gallery (Opstra Definedge Compatible) ── */}
      <StrategyPresetGallery
        onSelectPreset={(preset) => setSelectedPresetForModal(preset)}
      />

      {/* ── 3. Manual Position Entry Bar (Opstra Definedge Compatible) ── */}
      <ManualPositionBar
        instrument={instrument}
        spotPrice={spotPrice}
        selectedExpiry={selectedExpiry}
        onAddLeg={handleAddLeg}
      />

      {/* ── 4. Collapsible Option Chain Accordion ── */}
      {chainData && (
        <CollapsibleOptionChain
          chainData={chainData}
          onAddLeg={handleAddLeg}
        />
      )}

      {/* ── 5. Two-Column Professional Layout (Image 4) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (5 of 12 columns): Positions & KPI Summary */}
        <div className="lg:col-span-5 space-y-4">
          <StrategyPositionsList
            legs={activeLegs}
            payoff={payoff}
            instrument={instrument}
            onUpdateLeg={handleUpdateLeg}
            onRemoveLeg={handleRemoveLeg}
            onClearAll={handleClearAll}
            onToggleAll={handleToggleAll}
          />
        </div>

        {/* Right Column (7 of 12 columns): Payoff Workspace */}
        <div className="lg:col-span-7">
          <PayoffDiagram
            expiryPoints={payoff.expiryPoints}
            todayPoints={payoff.todayPoints}
            spotPrice={spotPrice}
            breakevens={payoff.breakevens}
            timeShiftDays={timeShiftDays}
            onChangeTimeShift={setTimeShiftDays}
            ivShiftPct={ivShiftPct}
            onChangeIvShift={setIvShiftPct}
            daysToExpiry={daysToExpiry}
            activeLegs={activeLegs}
            payoff={payoff}
            iv={ivValue}
          />
        </div>
      </div>

      {/* ── Modal: Preset Strike & Lots Configuration ── */}
      {selectedPresetForModal && (
        <PresetConfigModal
          preset={selectedPresetForModal}
          spotPrice={spotPrice}
          strikeStep={instrument.strikeStep}
          expiries={instrument.expiries}
          selectedExpiry={selectedExpiry}
          lotSize={instrument.lotSize}
          onClose={() => setSelectedPresetForModal(null)}
          onApplyStrategy={handleApplyPreset}
        />
      )}
    </div>
  );
}
