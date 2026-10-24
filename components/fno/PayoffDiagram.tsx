// ─── Institutional Derivatives Payoff, Dealer GEX & Multidimensional Desk ────
'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  OptionChainData,
  PayoffPoint,
  StrategyLeg,
  StrategyPayoff,
} from '@/lib/fno/fnoTypes';
import { findFnoInstrument, generateOptionChain } from '@/lib/fno/fnoDataService';
import {
  DealerPositioningAssumption,
  calculateDealerExposure,
} from '@/lib/fno/dealerExposure';
import {
  DEFAULT_VOL_SURFACE_CONFIG,
  VolSurfaceConfig,
} from '@/lib/fno/volatilitySurface';
import ScenarioSurface from './ScenarioSurface';
import VolatilitySurfaceView from './VolatilitySurfaceView';
import DealerExposureView from './DealerExposureView';
import MonteCarloView from './MonteCarloView';

export type PayoffWorkspaceTab =
  | 'PAYOFF'
  | 'SCENARIO_2D'
  | 'VOL_SURFACE'
  | 'DEALER_GEX'
  | 'MONTE_CARLO'
  | 'GREEKS'
  | 'PNL';

interface PayoffDiagramProps {
  expiryPoints: PayoffPoint[];
  todayPoints: PayoffPoint[];
  spotPrice: number;
  originalSpotPrice?: number;
  breakevens: number[];
  timeShiftDays: number;
  onChangeTimeShift: (days: number) => void;
  ivShiftPct: number;
  onChangeIvShift: (iv: number) => void;
  spotShockPct?: number;
  onChangeSpotShock?: (spot: number) => void;
  daysToExpiry?: number;
  activeLegs?: StrategyLeg[];
  payoff?: StrategyPayoff;
  iv?: number;
  symbol?: string;
  onSaveStrategy?: () => void;
  // Next-Gen Derivatives Desk Extensions
  chainData?: OptionChainData;
  volSurfaceConfig?: VolSurfaceConfig;
  onChangeVolSurfaceConfig?: (next: VolSurfaceConfig) => void;
  dealerAssumption?: DealerPositioningAssumption;
  onChangeDealerAssumption?: (next: DealerPositioningAssumption) => void;
  ghostPayoff?: StrategyPayoff | null;
  ghostLabel?: string;
  onPinBaseline?: () => void;
  onClearBaseline?: () => void;
  hasPinnedBaseline?: boolean;
  strikeStep?: number;
  onShiftLegStrike?: (legId: string, newStrike: number) => void;
}

/**
 * Reusable Institutional Slider with discrete tick dots and Teardrop Pin Balloon
 */
function OpstraSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  color = '#2563EB',
  infoTooltip,
  ticksCount = 21,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  color?: string;
  infoTooltip?: string;
  ticksCount?: number;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-[11px] font-bold text-[var(--theme-card-text)] select-none shrink-0">
        {label}
      </span>
      <div className="flex-1 relative flex items-center h-8 select-none">
        {/* Discrete tick marks across track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-1">
          {Array.from({ length: ticksCount }).map((_, idx) => (
            <div
              key={idx}
              className={`w-1 h-1 rounded-full ${
                (idx / (ticksCount - 1)) * 100 <= pct
                  ? 'bg-blue-500'
                  : 'bg-slate-400/40'
              }`}
            />
          ))}
        </div>

        {/* Center horizontal dotted line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] border-b border-dotted border-slate-500/50 pointer-events-none" />

        {/* Teardrop Balloon Pin above Thumb */}
        <div
          className="absolute -top-4 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20 transition-all duration-75"
          style={{ left: `${pct}%` }}
        >
          <div
            className="slider-pin-badge font-mono tabular-nums text-[9.5px] font-bold px-1.5 py-0.5 rounded-full min-w-[22px] text-center shadow-sm leading-none"
            style={{ backgroundColor: color, color: '#FFFFFF' }}
          >
            {value > 0 && label.includes('(%)') ? `+${value}` : value}
          </div>
          <div
            className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px]"
            style={{ borderTopColor: color }}
          />
        </div>

        {/* Native Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full relative z-10 appearance-none bg-transparent cursor-pointer h-6 focus:outline-hidden"
          style={{ accentColor: color }}
        />
      </div>

      {/* Info Icon with Tooltip */}
      <div
        className="w-4 h-4 rounded-full bg-slate-500/30 text-[var(--theme-card-text)] text-[10px] font-bold flex items-center justify-center cursor-help shrink-0 hover:bg-blue-500 hover:text-white transition"
        title={infoTooltip || label}
      >
        ?
      </div>
    </div>
  );
}

export function PayoffDiagram({
  expiryPoints,
  todayPoints,
  spotPrice,
  originalSpotPrice,
  breakevens,
  timeShiftDays,
  onChangeTimeShift,
  ivShiftPct,
  onChangeIvShift,
  spotShockPct,
  onChangeSpotShock,
  daysToExpiry = 7,
  activeLegs = [],
  payoff,
  iv = 15.87,
  symbol = 'NIFTY',
  onSaveStrategy,
  chainData,
  volSurfaceConfig,
  onChangeVolSurfaceConfig,
  dealerAssumption = 'DEALER_LONG_CALL_SHORT_PUT',
  onChangeDealerAssumption,
  ghostPayoff = null,
  ghostLabel = 'Pinned Baseline',
  onPinBaseline,
  onClearBaseline,
  hasPinnedBaseline = false,
  strikeStep,
  onShiftLegStrike,
}: PayoffDiagramProps) {
  const inst = findFnoInstrument(symbol);
  const curr = inst.market === 'USA' ? '$' : inst.market === 'UAE' ? 'AED ' : '₹';
  const loc = inst.market === 'INDIA' ? 'en-IN' : 'en-US';
  const effectiveStrikeStep = strikeStep || inst.strikeStep || 50;

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<PayoffWorkspaceTab>('PAYOFF');
  const [isSpotMode, setIsSpotMode] = useState<boolean>(true);
  const [showGexOverlay, setShowGexOverlay] = useState<boolean>(true);
  const [draggingLegId, setDraggingLegId] = useState<string | null>(null);

  const [internalSpotShock, setInternalSpotShock] = useState<number>(0);
  const activeSpotShock = spotShockPct !== undefined ? spotShockPct : internalSpotShock;
  const handleSpotShockChange = onChangeSpotShock || setInternalSpotShock;

  const [internalVolConfig, setInternalVolConfig] = useState<VolSurfaceConfig>(
    DEFAULT_VOL_SURFACE_CONFIG
  );
  const effectiveVolConfig = volSurfaceConfig || internalVolConfig;
  const handleVolConfigChange = onChangeVolSurfaceConfig || setInternalVolConfig;

  const [internalDealerAssumption, setInternalDealerAssumption] =
    useState<DealerPositioningAssumption>('DEALER_LONG_CALL_SHORT_PUT');
  const effectiveDealerAssumption =
    dealerAssumption || internalDealerAssumption;
  const handleDealerAssumptionChange =
    onChangeDealerAssumption || setInternalDealerAssumption;

  const baseSpot = originalSpotPrice || spotPrice;

  // Ensure we always have an OptionChainData snapshot for Dealer GEX & Vol Surface tabs
  const effectiveChain = useMemo(() => {
    if (chainData && chainData.strikes && chainData.strikes.length > 0) {
      return chainData;
    }
    return generateOptionChain(symbol, inst.currentExpiry, baseSpot);
  }, [chainData, symbol, inst.currentExpiry, baseSpot]);

  // Compute Dealer GEX profile for overlay on Payoff Chart
  const dealerProfile = useMemo(
    () => calculateDealerExposure(effectiveChain, effectiveDealerAssumption),
    [effectiveChain, effectiveDealerAssumption]
  );

  const scenarioPnl = useMemo(() => {
    if (!activeLegs || activeLegs.length === 0) return 0;
    const enabledLegs = activeLegs.filter((l) => !l.disabled);
    if (enabledLegs.length === 0) return 0;
    return Math.round(
      enabledLegs.reduce((sum, leg) => {
        const cur = leg.currentPrice ?? leg.entryPrice;
        const mult = leg.action === 'BUY' ? 1 : -1;
        return sum + (cur - leg.entryPrice) * leg.lots * leg.lotSize * mult;
      }, 0)
    );
  }, [activeLegs]);

  // Evaluate exact Expiry & T+n points at current simulated spotPrice for live slider tracking dots
  const simulatedSpotMarker = useMemo(() => {
    if (!expiryPoints || expiryPoints.length === 0) return null;
    let closestIdx = 0;
    let minDiff = Infinity;
    expiryPoints.forEach((pt, idx) => {
      const diff = Math.abs(pt.price - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    const expPt = expiryPoints[closestIdx];
    const todPt = todayPoints[closestIdx] ?? expPt;
    return {
      price: spotPrice,
      expiryPnl: expPt.pnl,
      todayPnl: todPt.pnl,
    };
  }, [expiryPoints, todayPoints, spotPrice]);

  // SVG Chart Dimensions
  const width = 840;
  const height = 380;
  const padding = { top: 30, right: 35, bottom: 45, left: 75 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const sigma1 = useMemo(() => {
    const dteSafe = Math.max(1, daysToExpiry);
    return baseSpot * (iv / 100.0) * Math.sqrt(dteSafe / 365.0);
  }, [baseSpot, iv, daysToExpiry]);

  const sdMarkers = useMemo(() => {
    return [
      { label: '-2σ', price: Math.round(baseSpot - 2 * sigma1) },
      { label: '-1σ', price: Math.round(baseSpot - 1 * sigma1) },
      {
        label: `${spotPrice.toLocaleString(loc, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        price: Math.round(spotPrice),
        isSpot: true,
      },
      { label: '+1σ', price: Math.round(baseSpot + 1 * sigma1) },
      { label: '+2σ', price: Math.round(baseSpot + 2 * sigma1) },
    ];
  }, [baseSpot, spotPrice, sigma1, loc]);

  // Price & PnL Domains (includes Ghost Baseline curve if active)
  const { minPrice, maxPrice, minPnl, maxPnl } = useMemo(() => {
    if (!expiryPoints || expiryPoints.length === 0) {
      const sp = baseSpot > 0 ? baseSpot : 22000;
      return {
        minPrice: Math.round(sp * 0.92),
        maxPrice: Math.round(sp * 1.08),
        minPnl: -20000,
        maxPnl: 20000,
      };
    }
    const allPrices = expiryPoints.map((p) => p.price);
    const ghostPnls = ghostPayoff
      ? [
          ...ghostPayoff.expiryPoints.map((p) => p.pnl),
          ...ghostPayoff.todayPoints.map((p) => p.pnl),
        ]
      : [];
    const allPnls = [
      ...expiryPoints.map((p) => p.pnl),
      ...todayPoints.map((p) => p.pnl),
      ...ghostPnls,
    ];

    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    let minL = Math.min(...allPnls, 0);
    let maxL = Math.max(...allPnls, 0);

    const pnlSpan = Math.max(1000, maxL - minL);
    minL -= pnlSpan * 0.12;
    maxL += pnlSpan * 0.12;

    return { minPrice: minP, maxPrice: maxP, minPnl: minL, maxPnl: maxL };
  }, [expiryPoints, todayPoints, ghostPayoff, baseSpot]);

  const priceRange = Math.max(1, maxPrice - minPrice);
  const pnlRange = Math.max(1, maxPnl - minPnl);

  const getX = (price: number) =>
    padding.left + ((price - minPrice) / priceRange) * plotWidth;
  const getY = (pnl: number) =>
    padding.top + (1 - (pnl - minPnl) / pnlRange) * plotHeight;

  const zeroY = getY(0);

  // SVG Expiry Path
  const expiryPath = useMemo(() => {
    if (expiryPoints.length === 0) return '';
    return expiryPoints.reduce((acc, pt, i) => {
      const x = getX(pt.price);
      const y = getY(pt.pnl);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [expiryPoints, minPrice, maxPrice, minPnl, maxPnl]);

  // SVG Today / Scenario Path
  const todayPath = useMemo(() => {
    if (todayPoints.length === 0) return '';
    return todayPoints.reduce((acc, pt, i) => {
      const x = getX(pt.price);
      const y = getY(pt.pnl);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [todayPoints, minPrice, maxPrice, minPnl, maxPnl]);

  // Ghost Comparison Expiry Path
  const ghostExpiryPath = useMemo(() => {
    if (!ghostPayoff || !ghostPayoff.expiryPoints.length) return '';
    const clampedPts = ghostPayoff.expiryPoints.filter(
      (pt) => pt.price >= minPrice && pt.price <= maxPrice
    );
    if (!clampedPts.length) return '';
    return clampedPts.reduce((acc, pt, i) => {
      const x = getX(pt.price);
      const y = getY(pt.pnl);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [ghostPayoff, minPrice, maxPrice, minPnl, maxPnl]);

  // Shaded Profit / Loss Polygons
  const { profitAreaPath, lossAreaPath } = useMemo(() => {
    if (expiryPoints.length === 0) return { profitAreaPath: '', lossAreaPath: '' };

    let pPath = `M ${getX(expiryPoints[0].price)} ${zeroY}`;
    expiryPoints.forEach((pt) => {
      const x = getX(pt.price);
      const y = pt.pnl >= 0 ? getY(pt.pnl) : zeroY;
      pPath += ` L ${x} ${y}`;
    });
    pPath += ` L ${getX(expiryPoints[expiryPoints.length - 1].price)} ${zeroY} Z`;

    let lPath = `M ${getX(expiryPoints[0].price)} ${zeroY}`;
    expiryPoints.forEach((pt) => {
      const x = getX(pt.price);
      const y = pt.pnl <= 0 ? getY(pt.pnl) : zeroY;
      lPath += ` L ${x} ${y}`;
    });
    lPath += ` L ${getX(expiryPoints[expiryPoints.length - 1].price)} ${zeroY} Z`;

    return { profitAreaPath: pPath, lossAreaPath: lPath };
  }, [expiryPoints, minPrice, maxPrice, minPnl, maxPnl, zeroY]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 7;
    const step = (maxPnl - minPnl) / (count - 1);
    for (let i = 0; i < count; i++) {
      ticks.push(Math.round(minPnl + i * step));
    }
    return ticks;
  }, [minPnl, maxPnl]);

  const xTicks = useMemo(() => {
    const ticks = [];
    const count = 9;
    const step = (maxPrice - minPrice) / (count - 1);
    for (let i = 0; i < count; i++) {
      ticks.push(Math.round(minPrice + i * step));
    }
    return ticks;
  }, [minPrice, maxPrice]);

  const hoverData = useMemo(() => {
    if (hoverX === null || expiryPoints.length === 0) return null;
    const ratio = Math.max(0, Math.min(1, (hoverX - padding.left) / plotWidth));
    const targetPrice = minPrice + ratio * priceRange;

    let closestIndex = 0;
    let minDiff = Infinity;
    expiryPoints.forEach((p, idx) => {
      const diff = Math.abs(p.price - targetPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    const expPt = expiryPoints[closestIndex];
    const todPt = todayPoints[closestIndex] ?? expPt;

    let ghostPnlAtHover: number | null = null;
    if (ghostPayoff && ghostPayoff.expiryPoints.length > 0) {
      let gClosest = ghostPayoff.expiryPoints[0];
      let gDiff = Infinity;
      ghostPayoff.expiryPoints.forEach((gp) => {
        const d = Math.abs(gp.price - expPt.price);
        if (d < gDiff) {
          gDiff = d;
          gClosest = gp;
        }
      });
      ghostPnlAtHover = gClosest.pnl;
    }

    return {
      price: expPt.price,
      expiryPnl: expPt.pnl,
      todayPnl: todPt.pnl,
      ghostPnl: ghostPnlAtHover,
      x: getX(expPt.price),
      yExp: getY(expPt.pnl),
      yTod: getY(todPt.pnl),
    };
  }, [hoverX, expiryPoints, todayPoints, ghostPayoff, minPrice, maxPrice, priceRange]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;

    if (draggingLegId && onShiftLegStrike) {
      const ratio = Math.max(0, Math.min(1, (x - padding.left) / plotWidth));
      const rawPrice = minPrice + ratio * priceRange;
      const snappedStrike =
        Math.round(rawPrice / effectiveStrikeStep) * effectiveStrikeStep;
      if (snappedStrike > 0) {
        onShiftLegStrike(draggingLegId, snappedStrike);
      }
      return;
    }

    setHoverX(x);
  };

  const handleMouseUp = () => {
    if (draggingLegId) {
      setDraggingLegId(null);
    }
  };

  const maxAbsOverlayGex = useMemo(() => {
    if (!dealerProfile.strikes.length) return 1;
    return Math.max(
      1,
      ...dealerProfile.strikes.map((s) => Math.abs(s.netGex))
    );
  }, [dealerProfile.strikes]);

  const enabledOptionLegs = useMemo(
    () =>
      (activeLegs || []).filter(
        (l) => !l.disabled && (l.instrument === 'CE' || l.instrument === 'PE')
      ),
    [activeLegs]
  );

  return (
    <div className="bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] rounded-xl shadow-xs space-y-0 overflow-hidden">
      {/* ── 1. Top Institutional Action Bar (Pin Ghost Baseline, GEX Overlay Toggle, Save Strategy) ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowGexOverlay(!showGexOverlay)}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
              showGexOverlay
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
                : 'bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] opacity-75 border-[var(--theme-card-border)]'
            }`}
            title="Overlay Dealer GEX bars, Call/Put Gamma Walls, and Zero-Gamma Flip on Payoff Chart"
          >
            ⚡ Dealer GEX & Walls {showGexOverlay ? 'ON' : 'OFF'}
          </button>

          {onPinBaseline && (
            <button
              type="button"
              onClick={hasPinnedBaseline ? onClearBaseline : onPinBaseline}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                hasPinnedBaseline
                  ? 'bg-amber-500/15 text-amber-500 border-amber-500/40'
                  : 'bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] opacity-80 hover:opacity-100 border-[var(--theme-card-border)]'
              }`}
              title="Pin current payoff curve as a Ghost Baseline to compare against subsequent strike or repair edits"
            >
              {hasPinnedBaseline ? '📌 Clear Pinned Baseline' : '📌 Pin Baseline Curve'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onSaveStrategy}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] uppercase tracking-wider px-4 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
        >
          SAVE STRATEGY
        </button>
      </div>

      {/* ── 2. Multi-Engine Desk Tabs Bar ── */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
          {(
            [
              { id: 'PAYOFF', label: '📈 PAYOFF & GEX' },
              { id: 'SCENARIO_2D', label: '⊞ 2D SCENARIO MATRIX' },
              { id: 'VOL_SURFACE', label: '🌊 VOL SURFACE & SKEW' },
              { id: 'DEALER_GEX', label: '🏛️ DEALER GEX WALLS' },
              { id: 'MONTE_CARLO', label: '🎲 MONTE CARLO CVaR' },
              { id: 'GREEKS', label: '▦ 1ST/2ND GREEKS' },
              { id: 'PNL', label: '📋 P&L TABLE' },
            ] as Array<{ id: PayoffWorkspaceTab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`pb-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? 'text-blue-500 border-b-2 border-blue-500 font-extrabold'
                  : 'text-slate-400 hover:text-[var(--theme-card-text)]'
              }`}
            >
              {t.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              handleSpotShockChange(0);
              onChangeTimeShift(0);
              onChangeIvShift(0);
            }}
            className="text-slate-400 hover:text-blue-500 pb-1.5 cursor-pointer transition text-xs"
            title="Reset All Simulation Sliders"
          >
            🔄
          </button>
        </div>

        {/* Spot vs Futures Toggle */}
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className={isSpotMode ? 'text-blue-500 font-extrabold' : 'text-slate-400'}>
            SPOT
          </span>
          <button
            type="button"
            onClick={() => setIsSpotMode(!isSpotMode)}
            className="w-7 h-3.5 bg-slate-500/30 rounded-full p-0.5 transition-colors cursor-pointer relative"
          >
            <div
              className={`w-2.5 h-2.5 bg-blue-500 rounded-full shadow-xs transition-transform ${
                isSpotMode ? 'translate-x-0' : 'translate-x-3.5'
              }`}
            />
          </button>
          <span className={!isSpotMode ? 'text-blue-500 font-extrabold' : 'text-slate-400'}>
            FUTURES
          </span>
        </div>
      </div>

      {/* ── Before / After Ghost Baseline Comparison Strip (Visible whenever Ghost Curve is active) ── */}
      {ghostPayoff && payoff && (
        <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
          <div className="font-sans font-extrabold text-amber-500 flex items-center gap-1.5">
            <span>👻 Comparing vs {ghostLabel}:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Delta:{' '}
              <strong>
                {ghostPayoff.netGreeks.delta} → {payoff.netGreeks.delta}
              </strong>
            </span>
            <span>
              Theta:{' '}
              <strong>
                {ghostPayoff.netGreeks.theta} → {payoff.netGreeks.theta}
              </strong>
            </span>
            <span>
              Max Loss:{' '}
              <strong>
                {ghostPayoff.maxLoss === 'UNLIMITED'
                  ? 'Unlim'
                  : `${curr}${Math.abs(ghostPayoff.maxLoss).toLocaleString(loc)}`}{' '}
                →{' '}
                {payoff.maxLoss === 'UNLIMITED'
                  ? 'Unlim'
                  : `${curr}${Math.abs(payoff.maxLoss).toLocaleString(loc)}`}
              </strong>
            </span>
            <span>
              POP:{' '}
              <strong>
                {ghostPayoff.probabilityOfProfit}% → {payoff.probabilityOfProfit}%
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* ── 3. VIEW 1: PAYOFF CHART + GEX OVERLAY + INTERACTIVE STRIKE DRAGGING ── */}
      {activeTab === 'PAYOFF' && (
        <div className="p-3 bg-[var(--theme-card-bg)] relative space-y-2">
          {/* Interactive Keyboard & Mouse Strike Stepper Bar */}
          {enabledOptionLegs.length > 0 && onShiftLegStrike && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-[10px]">
              <span className="font-extrabold uppercase tracking-wider text-slate-400">
                Interactive Strike Shifter (Drag on Chart or Step ±{effectiveStrikeStep}):
              </span>
              <div className="flex flex-wrap items-center gap-1.5 font-mono tabular-nums">
                {enabledOptionLegs.map((leg) => (
                  <div
                    key={leg.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]"
                  >
                    <span
                      className={`font-sans font-extrabold text-[9px] ${
                        leg.action === 'BUY' ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {leg.action[0]}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onShiftLegStrike(
                          leg.id,
                          Math.max(effectiveStrikeStep, leg.strike - effectiveStrikeStep)
                        )
                      }
                      className="px-1 rounded hover:bg-blue-500/20 text-blue-500 font-bold cursor-pointer"
                      title={`Shift strike down by ${effectiveStrikeStep}`}
                    >
                      −
                    </button>
                    <span className="font-bold text-[var(--theme-card-text)]">
                      {leg.strike} {leg.instrument}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onShiftLegStrike(leg.id, leg.strike + effectiveStrikeStep)
                      }
                      className="px-1 rounded hover:bg-blue-500/20 text-blue-500 font-bold cursor-pointer"
                      title={`Shift strike up by ${effectiveStrikeStep}`}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            ref={containerRef}
            className="relative w-full aspect-[8.4/3.8] overflow-hidden select-none bg-white rounded-lg border border-slate-200"
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className={`w-full h-full ${
                draggingLegId ? 'cursor-ew-resize' : 'cursor-crosshair'
              }`}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => {
                setHoverX(null);
                setDraggingLegId(null);
              }}
            >
              {/* Subtle Light Grey Grid Lines */}
              {yTicks.map((tick) => {
                const y = getY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3.5}
                      fill="#64748B"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="sans-serif"
                    >
                      {tick.toLocaleString('en-IN')}
                    </text>
                  </g>
                );
              })}

              {/* X-axis ticks */}
              {xTicks.map((tick) => {
                const x = getX(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={height - padding.bottom}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={height - padding.bottom + 14}
                      fill="#64748B"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="sans-serif"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Rotated Y-Axis Label: Profit / Loss */}
              <text
                x={-(height / 2)}
                y="18"
                transform="rotate(-90)"
                fill="#475569"
                fontSize="10"
                fontFamily="sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                Profit / Loss
              </text>

              {/* Bottom X-Axis Label: Underlying Price */}
              <text
                x={width / 2}
                y={height - 8}
                fill="#475569"
                fontSize="10"
                fontFamily="sans-serif"
                fontWeight="bold"
                textAnchor="middle"
              >
                Underlying Price
              </text>

              {/* ── Standard Deviation Probability Zones ── */}
              {(() => {
                const x2Left = Math.max(padding.left, getX(baseSpot - 2 * sigma1));
                const x2Right = Math.min(
                  width - padding.right,
                  getX(baseSpot + 2 * sigma1)
                );
                if (x2Right > x2Left) {
                  return (
                    <rect
                      x={x2Left}
                      y={padding.top}
                      width={x2Right - x2Left}
                      height={plotHeight}
                      fill="#F8FAFC"
                      opacity="0.8"
                    />
                  );
                }
                return null;
              })()}

              {(() => {
                const x1Left = Math.max(padding.left, getX(baseSpot - 1 * sigma1));
                const x1Right = Math.min(
                  width - padding.right,
                  getX(baseSpot + 1 * sigma1)
                );
                if (x1Right > x1Left) {
                  return (
                    <rect
                      x={x1Left}
                      y={padding.top}
                      width={x1Right - x1Left}
                      height={plotHeight}
                      fill="#EBFBF2"
                      opacity="0.75"
                    />
                  );
                }
                return null;
              })()}

              {/* ── Shaded Profit / Loss Polygons ── */}
              {profitAreaPath && (
                <path d={profitAreaPath} fill="#D4EDDA" opacity="0.85" />
              )}
              {lossAreaPath && (
                <path d={lossAreaPath} fill="#FCE8E6" opacity="0.85" />
              )}

              {/* ── Dealer GEX Overlay (Subtle Strike GEX Bars + Call/Put Gamma Walls + Zero-Gamma Flip) ── */}
              {showGexOverlay && (
                <g>
                  {/* Subtle Per-Strike Net GEX Bars anchored at bottom of plot */}
                  {dealerProfile.strikes.map((st) => {
                    const sx = getX(st.strike);
                    if (sx < padding.left + 8 || sx > width - padding.right - 8)
                      return null;
                    const maxBarH = 44;
                    const barH = Math.max(
                      2,
                      (Math.abs(st.netGex) / maxAbsOverlayGex) * maxBarH
                    );
                    const isPos = st.netGex >= 0;
                    return (
                      <rect
                        key={`gex-bar-${st.strike}`}
                        x={sx - 3}
                        y={height - padding.bottom - barH}
                        width="6"
                        height={barH}
                        rx="1"
                        fill={isPos ? '#10B981' : '#F43F5E'}
                        opacity="0.32"
                      />
                    );
                  })}

                  {/* Call Gamma Wall Marker */}
                  {(() => {
                    const cwX = getX(dealerProfile.callGammaWallStrike);
                    if (cwX >= padding.left && cwX <= width - padding.right) {
                      return (
                        <g>
                          <line
                            x1={cwX}
                            y1={padding.top}
                            x2={cwX}
                            y2={height - padding.bottom}
                            stroke="#059669"
                            strokeWidth="1.2"
                            strokeDasharray="5 3"
                            opacity="0.65"
                          />
                          <rect
                            x={cwX - 30}
                            y={height - padding.bottom - 18}
                            width="60"
                            height="13"
                            rx="2"
                            fill="#065F46"
                            opacity="0.9"
                          />
                          <text
                            x={cwX}
                            y={height - padding.bottom - 9}
                            fill="#ECFDF5"
                            fontSize="7.5"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                          >
                            CALL Γ WALL
                          </text>
                        </g>
                      );
                    }
                    return null;
                  })()}

                  {/* Put Gamma Wall Marker */}
                  {(() => {
                    const pwX = getX(dealerProfile.putGammaWallStrike);
                    if (pwX >= padding.left && pwX <= width - padding.right) {
                      return (
                        <g>
                          <line
                            x1={pwX}
                            y1={padding.top}
                            x2={pwX}
                            y2={height - padding.bottom}
                            stroke="#E11D48"
                            strokeWidth="1.2"
                            strokeDasharray="5 3"
                            opacity="0.65"
                          />
                          <rect
                            x={pwX - 28}
                            y={height - padding.bottom - 18}
                            width="56"
                            height="13"
                            rx="2"
                            fill="#9F1239"
                            opacity="0.9"
                          />
                          <text
                            x={pwX}
                            y={height - padding.bottom - 9}
                            fill="#FFF1F2"
                            fontSize="7.5"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                            textAnchor="middle"
                          >
                            PUT Γ WALL
                          </text>
                        </g>
                      );
                    }
                    return null;
                  })()}

                  {/* Dynamically Repriced Zero-Gamma Flip Marker */}
                  {dealerProfile.zeroGammaFlip !== null &&
                    (() => {
                      const flipX = getX(dealerProfile.zeroGammaFlip);
                      if (
                        flipX >= padding.left &&
                        flipX <= width - padding.right
                      ) {
                        return (
                          <g>
                            <line
                              x1={flipX}
                              y1={padding.top}
                              x2={flipX}
                              y2={height - padding.bottom}
                              stroke="#D97706"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                            />
                            <rect
                              x={flipX - 34}
                              y={padding.top + 4}
                              width="68"
                              height="14"
                              rx="3"
                              fill="#B45309"
                            />
                            <text
                              x={flipX}
                              y={padding.top + 13.5}
                              fill="#FFFBEB"
                              fontSize="7.5"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                              textAnchor="middle"
                            >
                              0-Γ FLIP {dealerProfile.zeroGammaFlip.toFixed(0)}
                            </text>
                          </g>
                        );
                      }
                      return null;
                    })()}
                </g>
              )}

              {/* Zero PnL Horizontal Line */}
              <line
                x1={padding.left}
                y1={zeroY}
                x2={width - padding.right}
                y2={zeroY}
                stroke="#64748B"
                strokeWidth="1.2"
              />

              {/* Standard Deviation Top Markers */}
              {sdMarkers.map((m) => {
                const sX = getX(m.price);
                if (sX < padding.left || sX > width - padding.right) return null;
                return (
                  <g key={m.label}>
                    <line
                      x1={sX}
                      y1={padding.top}
                      x2={sX}
                      y2={height - padding.bottom}
                      stroke={m.isSpot ? '#16A34A' : '#CBD5E1'}
                      strokeDasharray={m.isSpot ? '3 3' : '2 3'}
                      strokeWidth={m.isSpot ? '1.5' : '1'}
                    />
                    <line
                      x1={sX}
                      y1={padding.top}
                      x2={sX}
                      y2={padding.top - 5}
                      stroke={m.isSpot ? '#16A34A' : '#64748B'}
                      strokeWidth="1.2"
                    />
                    <text
                      x={sX}
                      y={padding.top - 8}
                      fill={m.isSpot ? '#15803D' : '#475569'}
                      fontSize={m.isSpot ? '10' : '9'}
                      fontFamily="sans-serif"
                      fontWeight={m.isSpot ? 'bold' : 'normal'}
                      textAnchor="middle"
                    >
                      {m.label}
                    </text>
                  </g>
                );
              })}

              {/* Ghost Baseline Comparison Curve (if active) */}
              {ghostExpiryPath && (
                <path
                  d={ghostExpiryPath}
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  opacity="0.75"
                />
              )}

              {/* Expiry Curve (Crisp Institutional Royal Blue) */}
              {expiryPath && (
                <path
                  d={expiryPath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* T+n Scenario Curve (Institutional Emerald) */}
              {todayPath && (
                <path
                  d={todayPath}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.1"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Draggable Strike Markers on Zero Line */}
              {onShiftLegStrike &&
                enabledOptionLegs.map((leg, idx) => {
                  const lx = getX(leg.strike);
                  if (lx < padding.left || lx > width - padding.right) return null;
                  const isBuy = leg.action === 'BUY';
                  const yOffset = (idx % 2 === 0 ? -1 : 1) * 14;
                  return (
                    <g
                      key={leg.id}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingLegId(leg.id);
                      }}
                      className="cursor-ew-resize"
                    >
                      <line
                        x1={lx}
                        y1={zeroY - 6}
                        x2={lx}
                        y2={zeroY + 6}
                        stroke={isBuy ? '#059669' : '#E11D48'}
                        strokeWidth="2"
                      />
                      <rect
                        x={lx - 22}
                        y={zeroY + yOffset - 7}
                        width="44"
                        height="14"
                        rx="3"
                        fill={isBuy ? '#059669' : '#E11D48'}
                        stroke="#FFFFFF"
                        strokeWidth="1"
                      />
                      <text
                        x={lx}
                        y={zeroY + yOffset + 2.5}
                        fill="#FFFFFF"
                        fontSize="7.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {leg.action[0]} {leg.strike}
                      </text>
                    </g>
                  );
                })}

              {/* Breakeven Marker Pins */}
              {breakevens.map((be) => {
                const beX = getX(be);
                if (beX < padding.left || beX > width - padding.right) return null;
                return (
                  <g key={be}>
                    <circle
                      cx={beX}
                      cy={zeroY}
                      r="4.5"
                      fill="#F59E0B"
                      stroke="#000"
                      strokeWidth="1"
                    />
                    <text
                      x={beX}
                      y={zeroY + 12}
                      fill="#B45309"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      textAnchor="middle"
                    >
                      {be.toLocaleString(loc)}
                    </text>
                  </g>
                );
              })}

              {/* Original Spot Reference Line when Spot (%) Slider is Shifted */}
              {activeSpotShock !== 0 &&
                originalSpotPrice &&
                (() => {
                  const origX = getX(originalSpotPrice);
                  if (origX < padding.left || origX > width - padding.right)
                    return null;
                  return (
                    <g>
                      <line
                        x1={origX}
                        y1={padding.top}
                        x2={origX}
                        y2={height - padding.bottom}
                        stroke="#94A3B8"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                      <text
                        x={origX}
                        y={height - padding.bottom - 6}
                        fill="#64748B"
                        fontSize="8.5"
                        fontFamily="sans-serif"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        Spot: {originalSpotPrice.toFixed(1)}
                      </text>
                    </g>
                  );
                })()}

              {/* Live Simulated Spot Tracking Dots & Callout Badge */}
              {simulatedSpotMarker &&
                activeLegs.length > 0 &&
                (() => {
                  const simX = getX(simulatedSpotMarker.price);
                  if (simX < padding.left || simX > width - padding.right)
                    return null;
                  const yExp = getY(simulatedSpotMarker.expiryPnl);
                  const yTod = getY(simulatedSpotMarker.todayPnl);
                  return (
                    <g>
                      <circle
                        cx={simX}
                        cy={yExp}
                        r="4.5"
                        fill="#2563EB"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={simX}
                        cy={yTod}
                        r="5"
                        fill="#16A34A"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                      {hoverData === null &&
                        (activeSpotShock !== 0 ||
                          ivShiftPct !== 0 ||
                          timeShiftDays !== 0) && (
                          <g
                            transform={`translate(${Math.min(
                              width - 155,
                              Math.max(padding.left + 6, simX + 8)
                            )}, ${Math.max(
                              padding.top + 8,
                              Math.min(height - padding.bottom - 56, yTod - 26)
                            )})`}
                          >
                            <rect
                              width="145"
                              height="50"
                              rx="4"
                              fill="#0F172A"
                              fillOpacity="0.92"
                              stroke="#16A34A"
                              strokeWidth="1"
                            />
                            <text
                              x="8"
                              y="14"
                              fill="#F8FAFC"
                              fontSize="9.5"
                              fontFamily="sans-serif"
                              fontWeight="bold"
                            >
                              Sim Spot: {curr}
                              {simulatedSpotMarker.price.toLocaleString(loc, {
                                maximumFractionDigits: 1,
                              })}{' '}
                              (
                              {activeSpotShock >= 0
                                ? `+${activeSpotShock}%`
                                : `${activeSpotShock}%`}
                              )
                            </text>
                            <text
                              x="8"
                              y="29"
                              fill="#4ADE80"
                              fontSize="10"
                              fontFamily="sans-serif"
                              fontWeight="bold"
                            >
                              T+{timeShiftDays} P&amp;L:{' '}
                              {simulatedSpotMarker.todayPnl >= 0 ? '+' : ''}
                              {curr}
                              {simulatedSpotMarker.todayPnl.toLocaleString(loc)}
                            </text>
                            <text
                              x="8"
                              y="43"
                              fill="#93C5FD"
                              fontSize="9.5"
                              fontFamily="sans-serif"
                              fontWeight="bold"
                            >
                              Exp P&amp;L:{' '}
                              {simulatedSpotMarker.expiryPnl >= 0 ? '+' : ''}
                              {curr}
                              {simulatedSpotMarker.expiryPnl.toLocaleString(loc)}
                            </text>
                          </g>
                        )}
                    </g>
                  );
                })()}

              {/* Curve Legend */}
              <g transform={`translate(${padding.left + 8}, ${padding.top + 16})`}>
                <rect
                  x="0"
                  y="0"
                  width="180"
                  height={ghostExpiryPath ? '52' : '38'}
                  rx="3"
                  fill="#FFFFFF"
                  fillOpacity="0.94"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <line
                  x1="8"
                  y1="12"
                  x2="28"
                  y2="12"
                  stroke="#2563EB"
                  strokeWidth="2.4"
                />
                <text
                  x="34"
                  y="15"
                  fill="#0F172A"
                  fontSize="9.5"
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  Expiry P&amp;L
                </text>
                <line
                  x1="8"
                  y1="26"
                  x2="28"
                  y2="26"
                  stroke="#059669"
                  strokeWidth="2.1"
                  strokeDasharray="4 2"
                />
                <text
                  x="34"
                  y="29"
                  fill="#0F172A"
                  fontSize="9.5"
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  Today (T+{timeShiftDays}) P&amp;L
                </text>
                {ghostExpiryPath && (
                  <>
                    <line
                      x1="8"
                      y1="40"
                      x2="28"
                      y2="40"
                      stroke="#7C3AED"
                      strokeWidth="2"
                      strokeDasharray="5 3"
                    />
                    <text
                      x="34"
                      y="43"
                      fill="#5B21B6"
                      fontSize="9"
                      fontFamily="sans-serif"
                      fontWeight="600"
                    >
                      {ghostLabel}
                    </text>
                  </>
                )}
              </g>

              {/* Interactive Crosshair & Tooltip */}
              {hoverData && (
                <g>
                  <line
                    x1={hoverData.x}
                    y1={padding.top}
                    x2={hoverData.x}
                    y2={height - padding.bottom}
                    stroke="#000"
                    strokeOpacity="0.3"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={hoverData.x}
                    cy={hoverData.yExp}
                    r="4.5"
                    fill="#2563EB"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={hoverData.x}
                    cy={hoverData.yTod}
                    r="4.5"
                    fill="#16A34A"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />

                  <g
                    transform={`translate(${Math.min(
                      width - 155,
                      Math.max(padding.left + 5, hoverData.x - 70)
                    )}, ${padding.top + 5})`}
                  >
                    <rect
                      width="150"
                      height={hoverData.ghostPnl !== null ? '68' : '55'}
                      rx="4"
                      fill="#FFFFFF"
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <text
                      x="8"
                      y="15"
                      fill="#1E293B"
                      fontSize="10"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      Price: {curr}
                      {hoverData.price.toLocaleString(loc)}
                    </text>
                    <text
                      x="8"
                      y="31"
                      fill="#2563EB"
                      fontSize="10"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      Exp PnL: {hoverData.expiryPnl >= 0 ? '+' : ''}
                      {curr}
                      {hoverData.expiryPnl.toLocaleString(loc)}
                    </text>
                    <text
                      x="8"
                      y="45"
                      fill="#16A34A"
                      fontSize="9.5"
                      fontFamily="sans-serif"
                      fontWeight="600"
                    >
                      T+{timeShiftDays} PnL: {hoverData.todayPnl >= 0 ? '+' : ''}
                      {curr}
                      {hoverData.todayPnl.toLocaleString(loc)}
                    </text>
                    {hoverData.ghostPnl !== null && (
                      <text
                        x="8"
                        y="60"
                        fill="#7C3AED"
                        fontSize="9"
                        fontFamily="sans-serif"
                        fontWeight="bold"
                      >
                        Ghost: {hoverData.ghostPnl >= 0 ? '+' : ''}
                        {curr}
                        {hoverData.ghostPnl.toLocaleString(loc)}
                      </text>
                    )}
                  </g>
                </g>
              )}
            </svg>

            {/* Empty State Overlay */}
            {activeLegs.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px]">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 max-w-sm text-center">
                  <div className="w-10 h-10 mx-auto mb-2.5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-lg">
                    📈
                  </div>
                  <h4 className="text-[13px] font-bold text-slate-800 mb-1">
                    Payoff Chart Ready
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-normal">
                    No active positions. Add strikes from the Option Chain below, use
                    the AI Strategy Optimizer, or select an institutional preset.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW 2: 2D SCENARIO MATRIX (Spot × Time & Spot × IV) ── */}
      {activeTab === 'SCENARIO_2D' && (
        <div className="p-3 bg-[var(--theme-card-bg)]">
          <ScenarioSurface
            legs={activeLegs}
            referenceSpot={baseSpot}
            frontDaysToExpiry={daysToExpiry}
            timeShiftDays={timeShiftDays}
            ivShiftPct={ivShiftPct}
            volSurfaceConfig={effectiveVolConfig}
            currencySymbol={curr}
          />
        </div>
      )}

      {/* ── VIEW 3: VOLATILITY SURFACE & SKEW ── */}
      {activeTab === 'VOL_SURFACE' && (
        <div className="p-3 bg-[var(--theme-card-bg)]">
          <VolatilitySurfaceView
            chain={effectiveChain}
            simulatedSpot={spotPrice}
            config={effectiveVolConfig}
            onChangeConfig={handleVolConfigChange}
            currencySymbol={curr}
          />
        </div>
      )}

      {/* ── VIEW 4: DEALER GAMMA EXPOSURE & ZERO-GAMMA FLIP ── */}
      {activeTab === 'DEALER_GEX' && (
        <div className="p-3 bg-[var(--theme-card-bg)]">
          <DealerExposureView
            chain={effectiveChain}
            assumption={effectiveDealerAssumption}
            onChangeAssumption={handleDealerAssumptionChange}
            currencySymbol={curr}
          />
        </div>
      )}

      {/* ── VIEW 5: MONTE CARLO RISK & TAIL CVaR ── */}
      {activeTab === 'MONTE_CARLO' && (
        <div className="p-3 bg-[var(--theme-card-bg)]">
          <MonteCarloView
            legs={activeLegs}
            referenceSpot={baseSpot}
            frontDaysToExpiry={daysToExpiry}
            volSurfaceConfig={effectiveVolConfig}
            currencySymbol={curr}
          />
        </div>
      )}

      {/* ── VIEW 6: 1ST & 2ND ORDER GREEKS MATRIX ── */}
      {activeTab === 'GREEKS' && (
        <div className="overflow-x-auto p-4 bg-[var(--theme-card-bg)]">
          <table className="w-full text-[11px] text-center border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-[var(--theme-card-surface)] text-[10px] font-sans font-bold text-slate-400 uppercase border-b border-[var(--theme-card-border)]">
                <th className="py-2 px-3 text-left">Leg</th>
                <th className="py-2 px-2">Action</th>
                <th className="py-2 px-2">Strike</th>
                <th className="py-2 px-2">IV %</th>
                <th className="py-2 px-2">Delta</th>
                <th className="py-2 px-2">Gamma</th>
                <th className="py-2 px-2">Theta/d</th>
                <th className="py-2 px-2">Vega</th>
                <th className="py-2 px-2 text-indigo-400">Vanna</th>
                <th className="py-2 px-2 text-indigo-400">Charm/d</th>
                <th className="py-2 px-2 text-indigo-400">Vomma</th>
              </tr>
            </thead>
            <tbody>
              {activeLegs.map((leg, idx) => (
                <tr
                  key={leg.id}
                  className="border-b border-[var(--theme-card-border)]/60 hover:bg-[var(--theme-card-surface)]"
                >
                  <td className="py-2 px-3 text-left font-sans font-semibold text-[var(--theme-card-text)]">
                    Leg #{idx + 1} ({leg.lots}x {leg.instrument} {leg.expiry})
                  </td>
                  <td
                    className={`py-2 px-2 font-bold ${
                      leg.action === 'BUY' ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {leg.action}
                  </td>
                  <td className="py-2 px-2 font-bold">{leg.strike}</td>
                  <td className="py-2 px-2">{leg.iv.toFixed(1)}%</td>
                  <td className="py-2 px-2 font-bold">{leg.greeks.delta.toFixed(3)}</td>
                  <td className="py-2 px-2">{leg.greeks.gamma.toFixed(5)}</td>
                  <td className="py-2 px-2">
                    {curr}
                    {leg.greeks.theta.toFixed(2)}
                  </td>
                  <td className="py-2 px-2">
                    {curr}
                    {leg.greeks.vega.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-indigo-400">
                    {(leg.greeks.vanna ?? 0).toFixed(4)}
                  </td>
                  <td className="py-2 px-2 text-indigo-400">
                    {(leg.greeks.charm ?? 0).toFixed(4)}
                  </td>
                  <td className="py-2 px-2 text-indigo-400">
                    {(leg.greeks.vomma ?? 0).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── VIEW 7: P&L TABLE ── */}
      {activeTab === 'PNL' && (
        <div className="overflow-x-auto p-4 bg-[var(--theme-card-bg)]">
          <table className="w-full text-[11.5px] text-center border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-[var(--theme-card-surface)] text-[10px] font-sans font-bold text-slate-400 uppercase border-b border-[var(--theme-card-border)]">
                <th className="py-2 px-3">Underlying Price</th>
                <th className="py-2 px-3 text-emerald-500">Expiry P&amp;L</th>
                <th className="py-2 px-3 text-blue-500">T+{timeShiftDays} P&amp;L</th>
                {ghostPayoff && (
                  <th className="py-2 px-3 text-purple-400">{ghostLabel} P&amp;L</th>
                )}
              </tr>
            </thead>
            <tbody>
              {expiryPoints
                .filter((_, i) => i % 6 === 0)
                .map((pt, i) => (
                  <tr
                    key={pt.price}
                    className="border-b border-[var(--theme-card-border)]/60 hover:bg-[var(--theme-card-surface)]"
                  >
                    <td className="py-2 px-3 font-semibold text-[var(--theme-card-text)]">
                      {curr}
                      {pt.price}
                    </td>
                    <td
                      className={`py-2 px-3 font-bold ${
                        pt.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {pt.pnl >= 0 ? '+' : ''}
                      {curr}
                      {pt.pnl.toLocaleString(loc)}
                    </td>
                    <td className="py-2 px-3 font-bold text-[var(--theme-card-text)]">
                      {curr}
                      {(todayPoints[i * 6]?.pnl ?? pt.pnl).toLocaleString(loc)}
                    </td>
                    {ghostPayoff && (
                      <td className="py-2 px-3 font-bold text-purple-400">
                        {curr}
                        {(
                          ghostPayoff.expiryPoints[i * 6]?.pnl ?? 0
                        ).toLocaleString(loc)}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 4. Bottom 1st & 2nd Order Greeks Strip ── */}
      <div className="px-4 py-2.5 bg-[var(--theme-card-surface)] border-t border-[var(--theme-card-border)] flex flex-wrap items-center justify-between text-[11px] font-semibold text-slate-400 font-mono tabular-nums">
        <div className="flex flex-wrap items-center gap-4">
          <span>
            Delta:{' '}
            <strong className="text-[var(--theme-card-text)]">
              {payoff ? payoff.netGreeks.delta.toFixed(2) : '0.00'}
            </strong>
          </span>
          <span>
            Gamma:{' '}
            <strong className="text-[var(--theme-card-text)]">
              {payoff ? payoff.netGreeks.gamma.toFixed(4) : '0.0000'}
            </strong>
          </span>
          <span>
            Theta:{' '}
            <strong className="text-[var(--theme-card-text)]">
              {payoff ? `${payoff.netGreeks.theta}` : '0'}
            </strong>
          </span>
          <span>
            Vega:{' '}
            <strong className="text-[var(--theme-card-text)]">
              {payoff ? payoff.netGreeks.vega.toFixed(2) : '0.00'}
            </strong>
          </span>
          <span className="text-indigo-400">
            Vanna:{' '}
            <strong>
              {payoff ? (payoff.netGreeks.vanna ?? 0).toFixed(2) : '0.00'}
            </strong>
          </span>
          <span className="text-indigo-400">
            Charm:{' '}
            <strong>
              {payoff ? (payoff.netGreeks.charm ?? 0).toFixed(2) : '0.00'}
            </strong>
          </span>
          <span className="text-indigo-400">
            Vomma:{' '}
            <strong>
              {payoff ? (payoff.netGreeks.vomma ?? 0).toFixed(2) : '0.00'}
            </strong>
          </span>
        </div>
        <div>
          <span className="font-sans">Total Scenario PNL: </span>
          <strong
            className={scenarioPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}
          >
            {scenarioPnl >= 0
              ? `${curr} +${scenarioPnl.toLocaleString(loc)}`
              : `-${curr} ${Math.abs(scenarioPnl).toLocaleString(loc)}`}
          </strong>
        </div>
      </div>

      {/* ── 5. Bottom Scenario Shock Sliders ── */}
      <div className="px-4 py-3 bg-[var(--theme-card-bg)] border-t border-[var(--theme-card-border)] space-y-2.5">
        <OpstraSlider
          label="Spot (%)"
          value={activeSpotShock}
          min={-10}
          max={10}
          step={0.5}
          onChange={handleSpotShockChange}
          color="#334155"
          infoTooltip="Simulate underlying price movement by percentage shock"
          ticksCount={21}
        />

        <OpstraSlider
          label="IV (%)"
          value={ivShiftPct}
          min={-20}
          max={20}
          step={1}
          onChange={onChangeIvShift}
          color="#2563EB"
          infoTooltip="Simulate implied volatility shift across all legs"
          ticksCount={21}
        />

        <OpstraSlider
          label="Next n Days"
          value={timeShiftDays}
          min={0}
          max={Math.max(1, daysToExpiry)}
          step={1}
          onChange={onChangeTimeShift}
          color="#475569"
          infoTooltip="Simulate forward time decay towards contract expiration"
          ticksCount={Math.min(15, Math.max(1, daysToExpiry) + 1)}
        />
      </div>
    </div>
  );
}
