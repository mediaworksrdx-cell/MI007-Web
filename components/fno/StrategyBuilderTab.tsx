// ─── Institutional Derivatives Strategy Builder & Analytics Hub ──────────────
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
  StrategyPayoff,
} from '@/lib/fno/fnoTypes';
import { calculateStrategyPayoff, resolveLegExpiries } from '@/lib/fno/payoffEngine';
import { PayoffDiagram } from './PayoffDiagram';
import { StrategyPresetGallery } from './StrategyPresetGallery';
import { PresetConfigModal } from './PresetConfigModal';
import { ManualPositionBar } from './ManualPositionBar';
import { CollapsibleOptionChain } from './CollapsibleOptionChain';
import { StrategyPositionsList } from './StrategyPositionsList';
import StrategyOptimizer from './StrategyOptimizer';
import PositionRepairPanel from './PositionRepairPanel';
import { saveTrackedStrategy } from '@/lib/fno/savedStrategiesService';
import { calculateBSPrice, calculateBSGreeks } from '@/lib/fno/blackScholes';
import {
  generateOptionChain,
  parseExpiryDaysToExpiry,
} from '@/lib/fno/fnoDataService';
import {
  DEFAULT_VOL_SURFACE_CONFIG,
  VolSurfaceConfig,
  evaluateShockedLegVolatility,
} from '@/lib/fno/volatilitySurface';
import { DealerPositioningAssumption } from '@/lib/fno/dealerExposure';
import { OptimizerCandidate } from '@/lib/fno/strategyOptimizer';
import { PositionRepairProposal } from '@/lib/fno/positionRepair';

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
  const [selectedPresetForModal, setSelectedPresetForModal] =
    useState<OptionStrategyPreset | null>(null);
  const [strategyName, setStrategyName] = useState<string>('Custom Strategy');
  const [strategyCategory, setStrategyCategory] =
    useState<StrategyCategory>('BULLISH');
  const [timeShiftDays, setTimeShiftDays] = useState<number>(0);
  const [ivShiftPct, setIvShiftPct] = useState<number>(0);
  const [spotShockPct, setSpotShockPct] = useState<number>(0);
  const [savedToast, setSavedToast] = useState(false);

  // Next-Gen Desk State: Volatility Surface, Dealer Assumption, AI Optimizer & Position Repair
  const [volSurfaceConfig, setVolSurfaceConfig] = useState<VolSurfaceConfig>(
    DEFAULT_VOL_SURFACE_CONFIG
  );
  const [dealerAssumption, setDealerAssumption] =
    useState<DealerPositioningAssumption>('DEALER_LONG_CALL_SHORT_PUT');
  const [activeIntelligencePanel, setActiveIntelligencePanel] = useState<
    'NONE' | 'OPTIMIZER' | 'REPAIR'
  >('NONE');

  // Undo & Ghost Baseline Comparison State
  const [undoStack, setUndoStack] = useState<StrategyLeg[][]>([]);
  const [initialBaselineLegs, setInitialBaselineLegs] = useState<
    StrategyLeg[] | null
  >(null);
  const [pinnedBaselinePayoff, setPinnedBaselinePayoff] =
    useState<StrategyPayoff | null>(null);
  const [previewGhost, setPreviewGhost] = useState<{
    id: string;
    label: string;
    payoff: StrategyPayoff;
  } | null>(null);

  const curr =
    instrument.market === 'USA'
      ? '$'
      : instrument.market === 'UAE'
      ? 'AED '
      : '₹';

  // Ensure we always have a valid OptionChainData instance
  const effectiveChain = useMemo(() => {
    if (chainData && chainData.strikes && chainData.strikes.length > 0) {
      return chainData;
    }
    return generateOptionChain(instrument.symbol, selectedExpiry, spotPrice);
  }, [chainData, instrument.symbol, selectedExpiry, spotPrice]);

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
    return parseExpiryDaysToExpiry(selectedExpiry || instrument.currentExpiry);
  }, [selectedExpiry, instrument.currentExpiry]);

  // Dynamic simulated spot price under slider scenario shock
  const simulatedSpot = spotPrice * (1 + spotShockPct / 100);
  const isScenarioActive =
    spotShockPct !== 0 ||
    ivShiftPct !== 0 ||
    timeShiftDays !== 0 ||
    volSurfaceConfig.mode !== 'STICKY_STRIKE' ||
    volSurfaceConfig.autoSpotVolCoupling;

  // Dynamically revalue legs under Spot (%), IV (%), Next n Days, and Volatility Surface mode
  const simulatedLegs = useMemo<StrategyLeg[]>(() => {
    const { legExtraDays } = resolveLegExpiries(activeLegs, daysToExpiry);
    const baseRemainingDays = Math.max(0.01, daysToExpiry - timeShiftDays);

    return activeLegs.map((leg, idx) => {
      if (leg.instrument === 'FUT') {
        return {
          ...leg,
          currentPrice: isScenarioActive
            ? Math.round(simulatedSpot * 100) / 100
            : leg.currentPrice ?? leg.entryPrice,
          greeks: {
            delta: 1.0,
            gamma: 0,
            theta: 0,
            vega: 0,
            rho: 0,
            vanna: 0,
            charm: 0,
            vomma: 0,
          },
        };
      }

      const extraDays = legExtraDays[idx] ?? 0;
      const legRemainingDays = Math.max(0.01, baseRemainingDays + extraDays);
      const timeYearsScenario = legRemainingDays / 365.0;

      const shockedVol = evaluateShockedLegVolatility({
        strike: leg.strike,
        instrument: leg.instrument,
        baselineIvDecimal: Math.max(0.05, (leg.iv || 14.5) / 100.0),
        referenceSpot: spotPrice,
        simulatedSpot,
        legDaysToExpiry: daysToExpiry + extraDays,
        frontDaysToExpiry: daysToExpiry,
        config: {
          ...volSurfaceConfig,
          parallelIvShockPct: ivShiftPct,
        },
      });

      const scenarioPrice = isScenarioActive
        ? Math.max(
            0.05,
            Math.round(
              calculateBSPrice(leg.instrument, {
                spot: simulatedSpot,
                strike: leg.strike,
                timeYears: timeYearsScenario,
                volatility: shockedVol,
              }) * 100
            ) / 100
          )
        : leg.currentPrice ?? leg.entryPrice;

      const scenarioGreeks = calculateBSGreeks(leg.instrument, {
        spot: simulatedSpot,
        strike: leg.strike,
        timeYears: timeYearsScenario,
        volatility: shockedVol,
      });

      return {
        ...leg,
        currentPrice: scenarioPrice,
        greeks: scenarioGreeks,
      };
    });
  }, [
    activeLegs,
    simulatedSpot,
    spotPrice,
    isScenarioActive,
    daysToExpiry,
    timeShiftDays,
    ivShiftPct,
    volSurfaceConfig,
  ]);

  // Calculate Payoff with active simulation & volatility surface parameters (X-axis anchored to original spotPrice)
  const payoff = useMemo(() => {
    return calculateStrategyPayoff(
      simulatedLegs,
      simulatedSpot,
      strategyName,
      strategyCategory,
      {
        timeShiftDays,
        ivShiftPct,
        daysToExpiry,
        baseSpotPrice: spotPrice,
        volSurfaceConfig,
      }
    );
  }, [
    simulatedLegs,
    simulatedSpot,
    spotPrice,
    strategyName,
    strategyCategory,
    timeShiftDays,
    ivShiftPct,
    daysToExpiry,
    volSurfaceConfig,
  ]);

  const pushUndoSnapshot = (current: StrategyLeg[]) => {
    setUndoStack((prev) => [...prev.slice(-9), current]);
    if (!initialBaselineLegs && current.length > 0) {
      setInitialBaselineLegs(current);
    }
  };

  // Apply a preset from modal
  const handleApplyPreset = (newLegs: StrategyLeg[], replaceAll: boolean) => {
    pushUndoSnapshot(activeLegs);
    if (replaceAll) {
      onUpdateLegs(newLegs);
      setInitialBaselineLegs(newLegs);
    } else {
      onUpdateLegs([...activeLegs, ...newLegs]);
    }
    if (selectedPresetForModal) {
      setStrategyName(selectedPresetForModal.name);
      setStrategyCategory(selectedPresetForModal.category);
    }
    setPreviewGhost(null);
  };

  const handleAddLeg = (newLeg: StrategyLeg) => {
    pushUndoSnapshot(activeLegs);
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
          merged.greeks = {
            delta: 1.0,
            gamma: 0,
            theta: 0,
            vega: 0,
            rho: 0,
            vanna: 0,
            charm: 0,
            vomma: 0,
          };
        } else {
          const legDte = parseExpiryDaysToExpiry(merged.expiry || selectedExpiry);
          const timeYears = Math.max(0.002, legDte / 365.0);
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

  const handleShiftLegStrike = (legId: string, newStrike: number) => {
    handleUpdateLeg(legId, { strike: newStrike });
  };

  const handleRemoveLeg = (id: string) => {
    pushUndoSnapshot(activeLegs);
    onUpdateLegs(activeLegs.filter((l) => l.id !== id));
  };

  const handleToggleAll = (enable: boolean) => {
    onUpdateLegs(activeLegs.map((l) => ({ ...l, disabled: !enable })));
  };

  const handleClearAll = () => {
    pushUndoSnapshot(activeLegs);
    onUpdateLegs([]);
    setPreviewGhost(null);
  };

  const handleApplyOptimizerCandidate = (cand: OptimizerCandidate) => {
    pushUndoSnapshot(activeLegs);
    onUpdateLegs(cand.legs);
    setStrategyName(cand.name);
    setStrategyCategory(cand.category);
    setPreviewGhost(null);
  };

  const handleApplyRepairProposal = (prop: PositionRepairProposal) => {
    pushUndoSnapshot(activeLegs);
    if (!pinnedBaselinePayoff) {
      setPinnedBaselinePayoff(payoff);
    }
    onUpdateLegs(prop.afterLegs);
    setStrategyName(`${strategyName} (${prop.badge})`);
    setPreviewGhost(null);
  };

  const handleUndoRepair = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    onUpdateLegs(prev);
    setPreviewGhost(null);
  };

  const handleResetBaseline = () => {
    if (!initialBaselineLegs) return;
    onUpdateLegs(initialBaselineLegs);
    setUndoStack([]);
    setPreviewGhost(null);
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

  const activeGhostPayoff = previewGhost?.payoff || pinnedBaselinePayoff;
  const activeGhostLabel = previewGhost?.label || 'Pinned Baseline';

  return (
    <div className="space-y-3 bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] p-2 sm:p-4 rounded-xl border border-[var(--theme-card-border)]">
      {/* ── Saved Toast Notification ── */}
      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-2xl text-[12px] font-bold flex items-center gap-2">
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

      {/* ── Top Header Line: Instrument, Data Provenance Badge & Next-Gen AI / Repair Drawers ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--theme-card-border)]">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[18px] font-extrabold text-[var(--theme-card-text)] tracking-tight">
              {instrument.symbol}
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Institutional Derivatives Desk • {instrument.exchange}
            </span>
          </div>

          {effectiveChain.provenance && (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30"
              title={effectiveChain.provenance.disclaimer}
            >
              <span>🛡️</span>
              Spot: {effectiveChain.provenance.spotSource} • Chain:{' '}
              {effectiveChain.provenance.chainSource}
            </span>
          )}
        </div>

        {/* AI Optimizer & Position Repair Quick Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveIntelligencePanel(
                activeIntelligencePanel === 'OPTIMIZER' ? 'NONE' : 'OPTIMIZER'
              )
            }
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              activeIntelligencePanel === 'OPTIMIZER'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] border-[var(--theme-card-border)] hover:border-blue-500/50'
            }`}
          >
            <span>✨</span>
            AI Pareto Strategy Optimizer
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveIntelligencePanel(
                activeIntelligencePanel === 'REPAIR' ? 'NONE' : 'REPAIR'
              )
            }
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              activeIntelligencePanel === 'REPAIR'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : 'bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] border-[var(--theme-card-border)] hover:border-amber-500/50'
            }`}
          >
            <span>🛠️</span>
            Position Repair & Delta Hedge
          </button>

          <div className="text-right pl-2 border-l border-[var(--theme-card-border)]">
            <span className="text-[12px] font-semibold text-slate-400">
              Expiry:{' '}
              <strong className="text-[var(--theme-card-text)]">
                {selectedExpiry}
              </strong>
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              {daysToExpiry} Calendar Days
            </span>
          </div>
        </div>
      </div>

      {/* ── Metric Badges Row ── */}
      <div className="flex flex-wrap items-center gap-2 text-[11.5px] pb-1">
        <div className="inline-flex items-center gap-1.5 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-slate-400 px-2.5 py-1 rounded-lg">
          <span className="font-semibold">Spot:</span>
          <span className="font-mono font-bold text-[var(--theme-card-text)] tabular-nums">
            {spotPrice.toFixed(1)}
          </span>
          {spotShockPct !== 0 && (
            <span className="font-mono font-bold text-blue-500 tabular-nums">
              → {simulatedSpot.toFixed(1)} (
              {spotShockPct > 0 ? `+${spotShockPct}%` : `${spotShockPct}%`})
            </span>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-slate-400 px-2.5 py-1 rounded-lg">
          <span className="font-semibold">Futures:</span>
          <span className="font-mono font-bold text-[var(--theme-card-text)] tabular-nums">
            {futuresPrice.toFixed(1)}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-slate-400 px-2.5 py-1 rounded-lg">
          <span className="font-semibold">Lot Size:</span>
          <span className="font-mono font-bold text-[var(--theme-card-text)] tabular-nums">
            {instrument.lotSize}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-slate-400 px-2.5 py-1 rounded-lg">
          <span className="font-semibold">ATM IV:</span>
          <span className="font-mono font-bold text-[var(--theme-card-text)] tabular-nums">
            {ivValue}%
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-slate-400 px-2.5 py-1 rounded-lg">
          <span className="font-semibold">IVP:</span>
          <span className="font-mono font-bold text-[var(--theme-card-text)] tabular-nums">
            {ivPercentile}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-slate-400 px-2.5 py-1 rounded-lg">
          <span className="font-semibold">DTE:</span>
          <span className="font-mono font-bold text-[var(--theme-card-text)] tabular-nums">
            {daysToExpiry}d
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-slate-400 px-2.5 py-1 rounded-lg">
          <span className="font-semibold">Surface Mode:</span>
          <span className="font-mono font-bold text-blue-500 tabular-nums">
            {volSurfaceConfig.mode}
          </span>
        </div>
      </div>

      {/* ── Collapsible AI Strategy Optimizer Drawer ── */}
      {activeIntelligencePanel === 'OPTIMIZER' && (
        <div className="p-3 rounded-xl bg-[var(--theme-card-surface)]/50 border border-blue-500/30">
          <StrategyOptimizer
            chain={effectiveChain}
            currencySymbol={curr}
            onApplyCandidate={handleApplyOptimizerCandidate}
            previewCandidateId={previewGhost?.id || null}
            onPreviewCandidate={(cand) =>
              setPreviewGhost(
                cand
                  ? {
                      id: cand.id,
                      label: `Pareto: ${cand.name}`,
                      payoff: cand.payoff,
                    }
                  : null
              )
            }
          />
        </div>
      )}

      {/* ── Collapsible Position Repair & Delta Hedging Drawer ── */}
      {activeIntelligencePanel === 'REPAIR' && (
        <div className="p-3 rounded-xl bg-[var(--theme-card-surface)]/50 border border-amber-500/30">
          <PositionRepairPanel
            legs={simulatedLegs}
            chain={effectiveChain}
            simulatedSpot={simulatedSpot}
            referenceSpot={spotPrice}
            strikeStep={instrument.strikeStep}
            daysToExpiry={daysToExpiry}
            timeShiftDays={timeShiftDays}
            ivShiftPct={ivShiftPct}
            strategyName={strategyName}
            category={strategyCategory}
            currencySymbol={curr}
            previewProposalId={previewGhost?.id || null}
            onPreviewProposal={(prop) =>
              setPreviewGhost(
                prop
                  ? {
                      id: prop.id,
                      label: `Repair: ${prop.badge}`,
                      payoff: prop.afterPayoff,
                    }
                  : null
              )
            }
            onApplyProposal={handleApplyRepairProposal}
            canUndo={undoStack.length > 0}
            onUndo={handleUndoRepair}
            canReset={Boolean(initialBaselineLegs && undoStack.length > 0)}
            onReset={handleResetBaseline}
          />
        </div>
      )}

      {/* ── 1. Strategy Presets Visual Grid ── */}
      <StrategyPresetGallery
        onSelectPreset={(preset) => setSelectedPresetForModal(preset)}
      />

      {/* ── 2. Manual Position Adder Bar ── */}
      <ManualPositionBar
        instrument={instrument}
        spotPrice={spotPrice}
        selectedExpiry={selectedExpiry}
        onAddLeg={handleAddLeg}
      />

      {/* ── 3. Option Chain Collapsible Accordion ── */}
      {chainData && (
        <CollapsibleOptionChain chainData={chainData} onAddLeg={handleAddLeg} />
      )}

      {/* ── 4. Two-Column Layout (Left Positions & Metrics, Right Payoff & Multi-Engine Desk) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
        {/* Left Column (5 cols): Positions & Financial Metrics */}
        <div className="lg:col-span-5 space-y-3">
          <StrategyPositionsList
            legs={simulatedLegs}
            payoff={payoff}
            instrument={instrument}
            onUpdateLeg={handleUpdateLeg}
            onRemoveLeg={handleRemoveLeg}
            onClearAll={handleClearAll}
            onToggleAll={handleToggleAll}
          />
        </div>

        {/* Right Column (7 cols): Payoff Diagram & Multidimensional Analytics Desk */}
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
            activeLegs={simulatedLegs}
            payoff={payoff}
            iv={ivValue}
            symbol={instrument.symbol}
            onSaveStrategy={handleSaveStrategy}
            chainData={effectiveChain}
            volSurfaceConfig={volSurfaceConfig}
            onChangeVolSurfaceConfig={setVolSurfaceConfig}
            dealerAssumption={dealerAssumption}
            onChangeDealerAssumption={setDealerAssumption}
            ghostPayoff={activeGhostPayoff}
            ghostLabel={activeGhostLabel}
            hasPinnedBaseline={Boolean(pinnedBaselinePayoff)}
            onPinBaseline={() => setPinnedBaselinePayoff(payoff)}
            onClearBaseline={() => {
              setPinnedBaselinePayoff(null);
              setPreviewGhost(null);
            }}
            strikeStep={instrument.strikeStep}
            onShiftLegStrike={handleShiftLegStrike}
          />
        </div>
      </div>

      {/* ── Preset Configuration Popover Modal ── */}
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
