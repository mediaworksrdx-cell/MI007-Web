// ─── Institutional Multi-Leg Strategy Builder & Analyzer ───────────────────
'use client';

import React, { useState, useMemo } from 'react';
import {
  FnoInstrument,
  StrategyLeg,
  StrategyCategory,
  TradeAction,
  InstrumentType,
  TrackedStrategy,
} from '@/lib/fno/fnoTypes';
import {
  INSTITUTIONAL_STRATEGY_PRESETS,
  buildLegsFromPreset,
} from '@/lib/fno/strategyPresets';
import { calculateStrategyPayoff } from '@/lib/fno/payoffEngine';
import { PayoffDiagram } from './PayoffDiagram';
import { saveTrackedStrategy } from '@/lib/fno/savedStrategiesService';
import { calculateBSGreeks, calculateBSPrice } from '@/lib/fno/blackScholes';

interface StrategyBuilderTabProps {
  instrument: FnoInstrument;
  spotPrice: number;
  activeLegs: StrategyLeg[];
  onUpdateLegs: (legs: StrategyLeg[]) => void;
  selectedExpiry: string;
  onOpenSavedTab?: () => void;
}

export function StrategyBuilderTab({
  instrument,
  spotPrice,
  activeLegs,
  onUpdateLegs,
  selectedExpiry,
  onOpenSavedTab,
}: StrategyBuilderTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<StrategyCategory>('BULLISH');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('bull-call-spread');
  const [strategyName, setStrategyName] = useState<string>('Bull Call Spread');
  const [timeShiftDays, setTimeShiftDays] = useState<number>(0);
  const [ivShiftPct, setIvShiftPct] = useState<number>(0);
  const [savedToast, setSavedToast] = useState(false);

  // Filter presets by category
  const filteredPresets = useMemo(() => {
    return INSTITUTIONAL_STRATEGY_PRESETS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // Apply a preset
  const handleSelectPreset = (presetId: string) => {
    const preset = INSTITUTIONAL_STRATEGY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setSelectedCategory(preset.category);
    setStrategyName(preset.name);

    const newLegs = buildLegsFromPreset(
      preset,
      spotPrice,
      instrument.strikeStep,
      selectedExpiry,
      instrument.lotSize
    );
    onUpdateLegs(newLegs);
  };

  // Add custom leg
  const handleAddCustomLeg = () => {
    const atmStrike = Math.round(spotPrice / instrument.strikeStep) * instrument.strikeStep;
    const timeYears = 7 / 365.0;
    const ltp = Math.max(0.05, Math.round(calculateBSPrice('CE', {
      spot: spotPrice,
      strike: atmStrike,
      timeYears,
      volatility: 0.145,
    }) * 20) / 20);

    const greeks = calculateBSGreeks('CE', {
      spot: spotPrice,
      strike: atmStrike,
      timeYears,
      volatility: 0.145,
    });

    const newLeg: StrategyLeg = {
      id: `custom-leg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: 'BUY',
      instrument: 'CE',
      strike: atmStrike,
      expiry: selectedExpiry,
      lots: 1,
      lotSize: instrument.lotSize,
      entryPrice: ltp,
      currentPrice: ltp,
      iv: 14.5,
      greeks,
    };

    onUpdateLegs([...activeLegs, newLeg]);
  };

  // Modify a leg
  const handleUpdateLeg = (id: string, updates: Partial<StrategyLeg>) => {
    const updated = activeLegs.map((leg) => {
      if (leg.id !== id) return leg;
      const merged = { ...leg, ...updates };

      // Re-estimate theoretical price and Greeks if strike or instrument changed
      if (updates.strike !== undefined || updates.instrument !== undefined) {
        if (merged.instrument === 'FUT') {
          merged.entryPrice = spotPrice;
          merged.currentPrice = spotPrice;
          merged.greeks = { delta: 1.0, gamma: 0, theta: 0, vega: 0 };
        } else {
          const timeYears = 7 / 365.0;
          const vol = Math.max(0.05, merged.iv / 100.0);
          merged.entryPrice = Math.max(0.05, Math.round(calculateBSPrice(merged.instrument, {
            spot: spotPrice,
            strike: merged.strike,
            timeYears,
            volatility: vol,
          }) * 20) / 20);
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

  // Clear all
  const handleClearAll = () => {
    onUpdateLegs([]);
  };

  // Calculate Payoff
  const payoff = useMemo(() => {
    return calculateStrategyPayoff(
      activeLegs,
      spotPrice,
      strategyName,
      selectedCategory,
      {
        timeShiftDays,
        ivShiftPct,
        daysToExpiry: 7,
      }
    );
  }, [activeLegs, spotPrice, strategyName, selectedCategory, timeShiftDays, ivShiftPct]);

  // Save to tracked strategies
  const handleSaveStrategy = () => {
    if (activeLegs.length === 0) return;
    const tracked: TrackedStrategy = {
      id: `tracked-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${instrument.symbol} ${strategyName}`,
      category: selectedCategory,
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
    <div className="space-y-5">
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

      {/* ── 1. Strategy Selector Header ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
          <div>
            <h3 className="mono text-[14px] font-black text-[var(--theme-card-text)] uppercase tracking-wider flex items-center gap-2">
              <span>🛠 INSTITUTIONAL STRATEGY ARCHITECT</span>
            </h3>
            <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-0.5">
              Select an institutional template or construct custom multi-leg options structures.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAll}
              className="px-2.5 py-1 rounded-lg text-[10.5px] mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              Clear Legs
            </button>
            <button
              onClick={handleSaveStrategy}
              disabled={activeLegs.length === 0}
              className="px-3 py-1 rounded-lg text-[11px] mono font-black bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer shadow-xs disabled:opacity-40"
            >
              Save & Track Strategy
            </button>
          </div>
        </div>

        {/* Category & Preset Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Selector */}
          <div>
            <label className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase block mb-1">
              1. MARKET OUTLOOK CATEGORY
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-[var(--theme-card-subsurface)] p-1 rounded-lg border border-[var(--theme-card-border)]">
              {(['BULLISH', 'BEARISH', 'NEUTRAL', 'VOLATILE'] as StrategyCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    const firstInCat = INSTITUTIONAL_STRATEGY_PRESETS.find((p) => p.category === cat);
                    if (firstInCat) handleSelectPreset(firstInCat.id);
                  }}
                  className={`py-1 rounded text-[10.5px] mono font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? cat === 'BULLISH'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : cat === 'BEARISH'
                        ? 'bg-rose-500 text-slate-950 font-black'
                        : cat === 'NEUTRAL'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-fuchsia-500 text-slate-950 font-black'
                      : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Selector */}
          <div className="sm:col-span-2">
            <label className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase block mb-1">
              2. SELECT INSTITUTIONAL PRESET TEMPLATE
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-[12px] mono font-bold text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              {filteredPresets.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--theme-card-surface)] text-[var(--theme-card-text)]">
                  {p.name} — {p.outlook}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 2. Financial Summary KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Net Debit / Credit */}
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3">
          <div className="mono text-[9.5px] font-bold text-[var(--theme-card-subtitle)] uppercase">
            NET PREMIUM
          </div>
          <div
            className={`mono text-[15px] font-black mt-0.5 ${
              payoff.netDebitCredit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {payoff.netDebitCredit >= 0 ? '+₹' : '-₹'}
            {Math.abs(payoff.netDebitCredit).toLocaleString('en-IN')}
          </div>
          <div className="text-[9px] mono text-[var(--theme-card-subtitle)]">
            {payoff.netDebitCredit >= 0 ? 'Net Credit Received' : 'Net Debit Paid'}
          </div>
        </div>

        {/* Max Profit */}
        <div className="bg-[var(--theme-card-surface)] border border-emerald-500/30 rounded-xl p-3">
          <div className="mono text-[9.5px] font-bold text-emerald-400 uppercase">
            MAX PROFIT
          </div>
          <div className="mono text-[15px] font-black text-emerald-400 mt-0.5 truncate">
            {typeof payoff.maxProfit === 'number'
              ? `₹${payoff.maxProfit.toLocaleString('en-IN')}`
              : 'UNLIMITED'}
          </div>
          <div className="text-[9px] mono text-[var(--theme-card-subtitle)]">
            Capped Target
          </div>
        </div>

        {/* Max Loss */}
        <div className="bg-[var(--theme-card-surface)] border border-rose-500/30 rounded-xl p-3">
          <div className="mono text-[9.5px] font-bold text-rose-400 uppercase">
            MAX LOSS
          </div>
          <div className="mono text-[15px] font-black text-rose-400 mt-0.5 truncate">
            {typeof payoff.maxLoss === 'number'
              ? `-₹${Math.abs(payoff.maxLoss).toLocaleString('en-IN')}`
              : 'UNLIMITED'}
          </div>
          <div className="text-[9px] mono text-[var(--theme-card-subtitle)]">
            Defined Risk
          </div>
        </div>

        {/* Breakeven */}
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3">
          <div className="mono text-[9.5px] font-bold text-[var(--theme-card-subtitle)] uppercase">
            BREAKEVEN(S)
          </div>
          <div className="mono text-[13px] font-black text-[var(--theme-card-text)] mt-0.5 truncate">
            {payoff.breakevens.length > 0
              ? payoff.breakevens.map((b) => `₹${b}`).join(', ')
              : 'None'}
          </div>
          <div className="text-[9px] mono text-[var(--theme-card-subtitle)]">
            Zero PnL Level
          </div>
        </div>

        {/* Win Probability (POP) */}
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3">
          <div className="mono text-[9.5px] font-bold text-cyan-400 uppercase">
            WIN PROB (POP)
          </div>
          <div className="mono text-[15px] font-black text-cyan-400 mt-0.5">
            {payoff.probabilityOfProfit}%
          </div>
          <div className="text-[9px] mono text-[var(--theme-card-subtitle)]">
            Probability of Profit
          </div>
        </div>

        {/* Risk-Reward */}
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3">
          <div className="mono text-[9.5px] font-bold text-[var(--theme-card-subtitle)] uppercase">
            RISK : REWARD
          </div>
          <div className="mono text-[14px] font-black text-[var(--theme-card-text)] mt-0.5">
            {payoff.riskRewardRatio}
          </div>
          <div className="text-[9px] mono text-[var(--theme-card-subtitle)]">
            Return on Risk
          </div>
        </div>

        {/* Net Delta */}
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3">
          <div className="mono text-[9.5px] font-bold text-fuchsia-400 uppercase">
            NET DELTA (Δ)
          </div>
          <div className="mono text-[15px] font-black text-fuchsia-400 mt-0.5">
            {payoff.netGreeks.delta >= 0 ? '+' : ''}{payoff.netGreeks.delta.toFixed(1)}
          </div>
          <div className="text-[9px] mono text-[var(--theme-card-subtitle)]">
            θ: ₹{payoff.netGreeks.theta}/day
          </div>
        </div>
      </div>

      {/* ── 3. Payoff Diagram ── */}
      <PayoffDiagram
        expiryPoints={payoff.expiryPoints}
        todayPoints={payoff.todayPoints}
        spotPrice={spotPrice}
        breakevens={payoff.breakevens}
        timeShiftDays={timeShiftDays}
        onChangeTimeShift={setTimeShiftDays}
        ivShiftPct={ivShiftPct}
        onChangeIvShift={setIvShiftPct}
      />

      {/* ── 4. Strategy Legs Table & Editor ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-[var(--theme-card-border)]">
          <h4 className="mono text-[13px] font-black text-[var(--theme-card-text)] uppercase tracking-wider flex items-center gap-2">
            <span>STRATEGY LEGS ({activeLegs.length})</span>
          </h4>
          <button
            onClick={handleAddCustomLeg}
            className="px-3 py-1 rounded-lg text-[11px] mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>+</span> ADD CUSTOM LEG
          </button>
        </div>

        {/* Legs List */}
        {activeLegs.length === 0 ? (
          <div className="text-center py-8 mono text-[12px] text-[var(--theme-card-subtitle)]">
            No active strategy legs. Choose a preset template above or click &quot;+ ADD CUSTOM LEG&quot;.
          </div>
        ) : (
          <div className="space-y-2">
            {activeLegs.map((leg) => {
              const isBuy = leg.action === 'BUY';
              return (
                <div
                  key={leg.id}
                  className="bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] rounded-lg p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 text-[11.5px] mono"
                >
                  {/* Action Toggle (BUY/SELL) */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateLeg(leg.id, { action: isBuy ? 'SELL' : 'BUY' })}
                      className={`px-2.5 py-1 rounded font-black text-[10px] cursor-pointer transition-colors ${
                        isBuy
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'bg-rose-500 text-slate-950 shadow-xs'
                      }`}
                    >
                      {leg.action}
                    </button>

                    {/* Instrument Toggle (CE / PE / FUT) */}
                    <select
                      value={leg.instrument}
                      onChange={(e) => handleUpdateLeg(leg.id, { instrument: e.target.value as InstrumentType })}
                      className="px-2 py-1 rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] font-bold text-[var(--theme-card-text)] focus:outline-hidden cursor-pointer"
                    >
                      <option value="CE">CALL (CE)</option>
                      <option value="PE">PUT (PE)</option>
                      <option value="FUT">FUTURES</option>
                    </select>
                  </div>

                  {/* Strike Stepper */}
                  {leg.instrument !== 'FUT' && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[var(--theme-card-subtitle)]">Strike:</span>
                      <button
                        onClick={() => handleUpdateLeg(leg.id, { strike: leg.strike - instrument.strikeStep })}
                        className="px-1.5 py-0.5 rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] hover:bg-[var(--theme-card-border)] font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-16 text-center font-black text-[var(--theme-card-text)]">
                        ₹{leg.strike}
                      </span>
                      <button
                        onClick={() => handleUpdateLeg(leg.id, { strike: leg.strike + instrument.strikeStep })}
                        className="px-1.5 py-0.5 rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] hover:bg-[var(--theme-card-border)] font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Lots Stepper */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[var(--theme-card-subtitle)]">Lots:</span>
                    <button
                      onClick={() => handleUpdateLeg(leg.id, { lots: Math.max(1, leg.lots - 1) })}
                      className="px-1.5 py-0.5 rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] hover:bg-[var(--theme-card-border)] font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold text-[var(--theme-card-text)]">
                      {leg.lots}
                    </span>
                    <button
                      onClick={() => handleUpdateLeg(leg.id, { lots: leg.lots + 1 })}
                      className="px-1.5 py-0.5 rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] hover:bg-[var(--theme-card-border)] font-bold cursor-pointer"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-[var(--theme-card-subtitle)] ml-1">
                      ({leg.lots * leg.lotSize} qty)
                    </span>
                  </div>

                  {/* Entry Premium */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[var(--theme-card-subtitle)]">Price:</span>
                    <span className="font-black text-[var(--theme-card-text)]">
                      ₹{leg.entryPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Greeks Preview */}
                  <div className="hidden lg:flex items-center gap-3 text-[10px] text-[var(--theme-card-subtitle)]">
                    <span>Δ {leg.greeks.delta.toFixed(2)}</span>
                    <span>θ ₹{leg.greeks.theta.toFixed(1)}</span>
                    <span>ν ₹{leg.greeks.vega.toFixed(1)}</span>
                  </div>

                  {/* Delete Leg Button */}
                  <button
                    onClick={() => handleRemoveLeg(leg.id)}
                    className="p-1 rounded text-rose-400 hover:bg-rose-500/20 font-bold transition-colors cursor-pointer"
                    title="Remove Leg"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
