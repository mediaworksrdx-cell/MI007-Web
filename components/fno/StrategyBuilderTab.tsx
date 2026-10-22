// ─── Exact Opstra Definedge Strategy Builder Workspace (Image 2, 3, 4) ─────────
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
  const [spotShockPct, setSpotShockPct] = useState<number>(0);
  const [savedToast, setSavedToast] = useState(false);

  // Futures price
  const futuresPrice = useMemo(() => {
    if (termStructure && termStructure.contracts.length > 0) {
      return termStructure.contracts[0].ltp;
    }
    return Math.round(spotPrice * 1.002 * 10) / 10;
  }, [termStructure, spotPrice]);

  const ivValue = 15.87;
  const ivPercentile = 75.51;

  // Dynamic Days to Expiry derived from selectedExpiry
  const daysToExpiry = useMemo(() => {
    if (selectedExpiry) {
      const expDate = new Date(selectedExpiry);
      if (!isNaN(expDate.getTime())) {
        const diffMs = expDate.getTime() - Date.now();
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(1, days);
      }
    }
    return 7;
  }, [selectedExpiry]);

  // Dynamic simulated spot price under slider scenario shock
  const simulatedSpot = spotPrice * (1 + spotShockPct / 100);

  // Calculate Payoff with active simulation parameters
  const payoff = useMemo(() => {
    return calculateStrategyPayoff(
      activeLegs,
      simulatedSpot,
      strategyName,
      strategyCategory,
      {
        timeShiftDays,
        ivShiftPct,
        daysToExpiry,
      }
    );
  }, [activeLegs, simulatedSpot, strategyName, strategyCategory, timeShiftDays, ivShiftPct, daysToExpiry]);

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

  const handleAddLeg = (newLeg: StrategyLeg) => {
    onUpdateLegs([...activeLegs, newLeg]);
  };

  const handleUpdateLeg = (id: string, updates: Partial<StrategyLeg>) => {
    const updated = activeLegs.map((leg) => {
      if (leg.id !== id) return leg;
      const merged = { ...leg, ...updates };

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

  const handleRemoveLeg = (id: string) => {
    onUpdateLegs(activeLegs.filter((l) => l.id !== id));
  };

  const handleToggleAll = (enable: boolean) => {
    onUpdateLegs(activeLegs.map((l) => ({ ...l, disabled: !enable })));
  };

  const handleClearAll = () => {
    onUpdateLegs([]);
  };

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
    <div className="space-y-3 bg-white p-2 sm:p-4 rounded-md border border-slate-200">
      {/* ── Saved Toast Notification ── */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#4CAF50] text-white px-4 py-2.5 rounded shadow-2xl text-[12px] font-bold flex items-center gap-2">
          <span>✓</span>
          <span>Strategy Saved to Tracked Portfolio!</span>
          {onOpenSavedTab && (
            <button
              onClick={onOpenSavedTab}
              className="ml-2 px-2 py-0.5 rounded bg-black/20 text-white text-[10px] uppercase font-bold hover:bg-black/30 cursor-pointer"
            >
              View Tracked →
            </button>
          )}
        </div>
      )}

      {/* ── Top Header Line: Instrument & Pay-off Date (Exact Opstra Style) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <span className="text-[18px] font-bold text-slate-900 tracking-tight">
            {instrument.symbol}
          </span>
          <span className="text-[10px] text-slate-400 block -mt-0.5">
            Select Index/Stock
          </span>
        </div>

        <div className="text-right">
          <span className="text-[12px] font-semibold text-slate-700">
            Date: <strong className="text-slate-900">{selectedExpiry}</strong>
          </span>
          <span className="text-[10px] text-slate-400 block -mt-0.5">
            Select Pay-off Date
          </span>
        </div>
      </div>

      {/* ── Metric Badges Row (Exact Opstra Definedge Pastel Colors) ── */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold pb-2">
        {/* Spot Price */}
        <span className="bg-[#80CBC4] text-[#004D40] px-2.5 py-1 rounded">
          Spot Price: {spotPrice.toFixed(1)}
        </span>

        {/* Futures Price */}
        <span className="bg-[#FFE0B2] text-[#E65100] px-2.5 py-1 rounded">
          Futures Price: {futuresPrice.toFixed(1)}
        </span>

        {/* Lot Size */}
        <span className="bg-[#DCEDC8] text-[#33691E] px-2.5 py-1 rounded">
          Lot Size: {instrument.lotSize}
        </span>

        {/* IV */}
        <span className="bg-[#FFF9C4] text-[#F57F17] px-2.5 py-1 rounded">
          IV: {ivValue}
        </span>

        {/* IV Percentile */}
        <span className="bg-[#E1BEE7] text-[#4A148C] px-2.5 py-1 rounded">
          IV Percentile: {ivPercentile}
        </span>

        {/* NIFTY IV Chart */}
        <span className="bg-[#CFD8DC] text-[#37474F] px-2.5 py-1 rounded cursor-pointer hover:bg-slate-300 transition-colors">
          {instrument.symbol} IV Chart
        </span>

        {/* DTE */}
        <span className="bg-[#F48FB1] text-[#880E4F] px-2.5 py-1 rounded">
          DTE: {daysToExpiry}
        </span>
      </div>

      {/* ── 1. Strategy Presets Visual Grid (Exact Opstra Style) ── */}
      <StrategyPresetGallery
        onSelectPreset={(preset) => setSelectedPresetForModal(preset)}
      />

      {/* ── 2. Manual Position Adder Bar (Exact Opstra Style) ── */}
      <ManualPositionBar
        instrument={instrument}
        spotPrice={spotPrice}
        selectedExpiry={selectedExpiry}
        onAddLeg={handleAddLeg}
      />

      {/* ── 3. Option Chain Collapsible Accordion (Exact Opstra Style) ── */}
      {chainData && (
        <CollapsibleOptionChain
          chainData={chainData}
          onAddLeg={handleAddLeg}
        />
      )}

      {/* ── 4. Two-Column Layout (Image 4: Left Positions & Metrics, Right Payoff Chart) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
        {/* Left Column (5 cols): Positions & Financial Metrics */}
        <div className="lg:col-span-5 space-y-3">
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

        {/* Right Column (7 cols): Payoff Diagram Workspace */}
        <div className="lg:col-span-7">
          <PayoffDiagram
            expiryPoints={payoff.expiryPoints}
            todayPoints={payoff.todayPoints}
            spotPrice={simulatedSpot}
            originalSpotPrice={spotPrice}
            breakevens={payoff.breakevens}
            timeShiftDays={timeShiftDays}
            onChangeTimeShift={setTimeShiftDays}
            ivShiftPct={ivShiftPct}
            onChangeIvShift={setIvShiftPct}
            spotShockPct={spotShockPct}
            onChangeSpotShock={setSpotShockPct}
            daysToExpiry={daysToExpiry}
            activeLegs={activeLegs}
            payoff={payoff}
            iv={ivValue}
            symbol={instrument.symbol}
            onSaveStrategy={handleSaveStrategy}
          />
        </div>
      </div>

      {/* ── Preset Configuration Popover Modal (Image 3) ── */}
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
