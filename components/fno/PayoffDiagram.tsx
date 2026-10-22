// ─── Exact Opstra Definedge Payoff Diagram Workspace (Image 4) ───────────────
'use client';

import React, { useState, useRef, useMemo } from 'react';
import { PayoffPoint, StrategyLeg, StrategyPayoff } from '@/lib/fno/fnoTypes';
import { findFnoInstrument } from '@/lib/fno/fnoDataService';

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
}

/**
 * Reusable Opstra Definedge Style Slider with discrete tick dots and Teardrop Pin Balloon
 */
function OpstraSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  color = '#800040',
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
      <span className="w-24 text-[11px] font-bold text-slate-700 select-none shrink-0">{label}</span>
      <div className="flex-1 relative flex items-center h-8 select-none">
        {/* Discrete tick marks across track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-1">
          {Array.from({ length: ticksCount }).map((_, idx) => (
            <div
              key={idx}
              className={`w-1 h-1 rounded-full ${
                (idx / (ticksCount - 1)) * 100 <= pct ? 'bg-slate-700' : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Center horizontal dotted line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] border-b border-dotted border-slate-700 pointer-events-none" />

        {/* Teardrop Balloon Pin above Thumb */}
        <div
          className="absolute -top-4 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20 transition-all duration-75"
          style={{ left: `${pct}%` }}
        >
          <div
            className="text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-md leading-none"
            style={{ backgroundColor: color }}
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
        className="w-4 h-4 rounded-full bg-slate-400 text-white text-[10px] font-bold flex items-center justify-center cursor-help shrink-0 shadow-2xs hover:bg-slate-600 transition"
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
}: PayoffDiagramProps) {
  const inst = findFnoInstrument(symbol);
  const curr = inst.market === 'USA' ? '$' : inst.market === 'UAE' ? 'AED ' : '₹';
  const loc = inst.market === 'INDIA' ? 'en-IN' : 'en-US';

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'PAYOFF' | 'FUTURES' | 'GREEKS' | 'PNL'>('PAYOFF');
  const [isSpotMode, setIsSpotMode] = useState<boolean>(true);
  
  const [internalSpotShock, setInternalSpotShock] = useState<number>(0);
  const activeSpotShock = spotShockPct !== undefined ? spotShockPct : internalSpotShock;
  const handleSpotShockChange = onChangeSpotShock || setInternalSpotShock;

  const scenarioPnl = useMemo(() => {
    if (!activeLegs || activeLegs.length === 0) return 0;
    if (activeSpotShock === 0 && ivShiftPct === 0 && timeShiftDays === 0) {
      return activeLegs.filter((l) => !l.disabled).reduce((sum, leg) => {
        const cur = leg.currentPrice ?? leg.entryPrice;
        const mult = leg.action === 'BUY' ? 1 : -1;
        return sum + (cur - leg.entryPrice) * leg.lots * leg.lotSize * mult;
      }, 0);
    }
    // Dynamic simulated PnL under slider shocks evaluated at simulated spot
    if (todayPoints && todayPoints.length > 0) {
      let closestPt = todayPoints[0];
      let minDiff = Math.abs(todayPoints[0].price - spotPrice);
      for (const pt of todayPoints) {
        const diff = Math.abs(pt.price - spotPrice);
        if (diff < minDiff) {
          minDiff = diff;
          closestPt = pt;
        }
      }
      return closestPt.pnl;
    }
    return 0;
  }, [activeLegs, activeSpotShock, ivShiftPct, timeShiftDays, todayPoints, spotPrice]);

  // SVG Chart Dimensions
  const width = 840;
  const height = 380;
  const padding = { top: 30, right: 35, bottom: 45, left: 75 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Standard Deviation Bands (Opstra top markers: -2σ, -1σ, Spot, +1σ, +2σ)
  const baseSpot = originalSpotPrice || spotPrice;
  const sigma1 = useMemo(() => {
    const dteSafe = Math.max(1, daysToExpiry);
    return baseSpot * (iv / 100.0) * Math.sqrt(dteSafe / 365.0);
  }, [baseSpot, iv, daysToExpiry]);

  const sdMarkers = useMemo(() => {
    return [
      { label: '-2σ', price: Math.round(baseSpot - 2 * sigma1) },
      { label: '-1σ', price: Math.round(baseSpot - 1 * sigma1) },
      { label: `${spotPrice.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, price: Math.round(spotPrice), isSpot: true },
      { label: '+1σ', price: Math.round(baseSpot + 1 * sigma1) },
      { label: '+2σ', price: Math.round(baseSpot + 2 * sigma1) },
    ];
  }, [baseSpot, spotPrice, sigma1, loc]);

  // Price & PnL Domains
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
    const allPnls = [...expiryPoints.map((p) => p.pnl), ...todayPoints.map((p) => p.pnl)];

    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    let minL = Math.min(...allPnls, 0);
    let maxL = Math.max(...allPnls, 0);

    const pnlSpan = Math.max(1000, maxL - minL);
    minL -= pnlSpan * 0.12;
    maxL += pnlSpan * 0.12;

    return { minPrice: minP, maxPrice: maxP, minPnl: minL, maxPnl: maxL };
  }, [expiryPoints, todayPoints, baseSpot]);

  const priceRange = Math.max(1, maxPrice - minPrice);
  const pnlRange = Math.max(1, maxPnl - minPnl);

  const getX = (price: number) => padding.left + ((price - minPrice) / priceRange) * plotWidth;
  const getY = (pnl: number) => padding.top + (1 - (pnl - minPnl) / pnlRange) * plotHeight;

  const zeroY = getY(0);
  const spotX = getX(spotPrice);

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

  // Exact Opstra Shaded Area: Green above zero line, Orange/Red below zero line
  const { profitAreaPath, lossAreaPath } = useMemo(() => {
    if (expiryPoints.length === 0) return { profitAreaPath: '', lossAreaPath: '' };

    // Profit area polygon (green fill)
    let pPath = `M ${getX(expiryPoints[0].price)} ${zeroY}`;
    expiryPoints.forEach((pt) => {
      const x = getX(pt.price);
      const y = pt.pnl >= 0 ? getY(pt.pnl) : zeroY;
      pPath += ` L ${x} ${y}`;
    });
    pPath += ` L ${getX(expiryPoints[expiryPoints.length - 1].price)} ${zeroY} Z`;

    // Loss area polygon (orange fill)
    let lPath = `M ${getX(expiryPoints[0].price)} ${zeroY}`;
    expiryPoints.forEach((pt) => {
      const x = getX(pt.price);
      const y = pt.pnl <= 0 ? getY(pt.pnl) : zeroY;
      lPath += ` L ${x} ${y}`;
    });
    lPath += ` L ${getX(expiryPoints[expiryPoints.length - 1].price)} ${zeroY} Z`;

    return { profitAreaPath: pPath, lossAreaPath: lPath };
  }, [expiryPoints, minPrice, maxPrice, minPnl, maxPnl, zeroY]);

  // Y-Axis Ticks (e.g. 5 steps between minPnl and maxPnl)
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 7;
    const step = (maxPnl - minPnl) / (count - 1);
    for (let i = 0; i < count; i++) {
      ticks.push(Math.round(minPnl + i * step));
    }
    return ticks;
  }, [minPnl, maxPnl]);

  // X-Axis Ticks (10 price intervals)
  const xTicks = useMemo(() => {
    const ticks = [];
    const count = 9;
    const step = (maxPrice - minPrice) / (count - 1);
    for (let i = 0; i < count; i++) {
      ticks.push(Math.round(minPrice + i * step));
    }
    return ticks;
  }, [minPrice, maxPrice]);

  // Hover detection
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

    return {
      price: expPt.price,
      expiryPnl: expPt.pnl,
      todayPnl: todPt.pnl,
      x: getX(expPt.price),
      yExp: getY(expPt.pnl),
      yTod: getY(todPt.pnl),
    };
  }, [hoverX, expiryPoints, todayPoints, minPrice, maxPrice, priceRange]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    setHoverX(x);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-sm shadow-xs space-y-0">
      {/* ── 1. Top Header & SAVE STRATEGY Button ── */}
      <div className="flex items-center justify-end p-3 border-b border-slate-200 bg-white">
        {/* Black [ SAVE STRATEGY ] Button */}
        <button
          type="button"
          onClick={onSaveStrategy}
          className="bg-slate-900 hover:bg-black text-white font-bold text-[11px] uppercase tracking-wider px-5 py-2 rounded-sm transition-colors cursor-pointer shadow-xs"
        >
          SAVE STRATEGY
        </button>
      </div>

      {/* ── 2. Sub-Tabs Bar: PAYOFF CHART | FUTURES CHART | GREEKS | P&L (Exact Opstra Style) ── */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-6 text-[12px] font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('PAYOFF')}
            className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PAYOFF'
                ? 'text-[#00A3A6] border-b-2 border-[#00A3A6]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📈</span> PAYOFF CHART
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FUTURES')}
            className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'FUTURES'
                ? 'text-[#00A3A6] border-b-2 border-[#00A3A6]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📊</span> FUTURES CHART
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GREEKS')}
            className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'GREEKS'
                ? 'text-[#00A3A6] border-b-2 border-[#00A3A6]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>▦</span> GREEKS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PNL')}
            className={`pb-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PNL'
                ? 'text-[#00A3A6] border-b-2 border-[#00A3A6]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⊞</span> P&amp;L
          </button>
          <button
            type="button"
            onClick={() => {
              handleSpotShockChange(0);
              onChangeTimeShift(0);
              onChangeIvShift(0);
            }}
            className="text-slate-500 hover:text-slate-800 pb-2 cursor-pointer transition"
            title="Reset All Simulation Sliders"
          >
            🔄
          </button>
        </div>

        {/* Spot vs Futures Toggle */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
          <span className={isSpotMode ? 'text-slate-900 font-extrabold' : 'text-slate-400'}>SPOT</span>
          <button
            type="button"
            onClick={() => setIsSpotMode(!isSpotMode)}
            className="w-8 h-4 bg-slate-300 rounded-full p-0.5 transition-colors cursor-pointer relative"
          >
            <div
              className={`w-3 h-3 bg-white rounded-full shadow-xs transition-transform ${
                isSpotMode ? 'translate-x-0' : 'translate-x-4'
              }`}
            />
          </button>
          <span className={!isSpotMode ? 'text-slate-900 font-extrabold' : 'text-slate-400'}>FUTURES</span>
        </div>
      </div>

      {/* ── 3. Payoff Chart Canvas (Exact Opstra Layout) ── */}
      {activeTab === 'PAYOFF' && (
        <div className="p-4 bg-white relative">
          {/* Centered Underlying Title */}
          <div className="text-center font-bold text-[15px] text-slate-800 mb-2">
            {symbol}
          </div>

          <div ref={containerRef} className="relative w-full aspect-[8.4/3.8] overflow-hidden select-none bg-white">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverX(null)}
            >
              {/* Subtle Light Grey Grid Lines */}
              {yTicks.map((tick) => {
                const y = getY(tick);
                return (
                  <g key={tick}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                    <text x={padding.left - 8} y={y + 3.5} fill="#64748B" fontSize="9" textAnchor="end" fontFamily="sans-serif">
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
                    <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="#F1F5F9" strokeWidth="1" />
                    <text x={x} y={height - padding.bottom + 14} fill="#64748B" fontSize="9" textAnchor="middle" fontFamily="sans-serif">
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

              {/* ── Opstra Standard Deviation Probability Zones ── */}
              {/* ±2σ Zone: 95.4% Probability Band (Soft Slate Background) */}
              {(() => {
                const x2Left = Math.max(padding.left, getX(baseSpot - 2 * sigma1));
                const x2Right = Math.min(width - padding.right, getX(baseSpot + 2 * sigma1));
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

              {/* ±1σ Zone: 68.2% Probability Cone (Soft Mint Opstra Band) */}
              {(() => {
                const x1Left = Math.max(padding.left, getX(baseSpot - 1 * sigma1));
                const x1Right = Math.min(width - padding.right, getX(baseSpot + 1 * sigma1));
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

              {/* ── Exact Opstra Shaded Areas ── */}
              {/* Soft Light Green Profit Area (above zero line) */}
              {profitAreaPath && (
                <path d={profitAreaPath} fill="#D4EDDA" opacity="0.85" />
              )}
              {/* Soft Light Peach Loss Area (below zero line) */}
              {lossAreaPath && (
                <path d={lossAreaPath} fill="#FCE8E6" opacity="0.85" />
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

              {/* Standard Deviation Top Markers & Subtle Vertical Guidelines */}
              {sdMarkers.map((m) => {
                const sX = getX(m.price);
                if (sX < padding.left || sX > width - padding.right) return null;
                return (
                  <g key={m.label}>
                    {/* Vertical guideline */}
                    <line
                      x1={sX}
                      y1={padding.top}
                      x2={sX}
                      y2={height - padding.bottom}
                      stroke={m.isSpot ? '#16A34A' : '#CBD5E1'}
                      strokeDasharray={m.isSpot ? '3 3' : '2 3'}
                      strokeWidth={m.isSpot ? '1.5' : '1'}
                    />
                    {/* Top tick mark */}
                    <line
                      x1={sX}
                      y1={padding.top}
                      x2={sX}
                      y2={padding.top - 5}
                      stroke={m.isSpot ? '#16A34A' : '#64748B'}
                      strokeWidth="1.2"
                    />
                    {/* Label at top */}
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

              {/* Expiry Curve (Solid Royal Blue line matching Opstra) */}
              {expiryPath && (
                <path
                  d={expiryPath}
                  fill="none"
                  stroke="#0000FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* T+n Scenario Curve (Dashed Green line matching Opstra) */}
              {todayPath && (
                <path
                  d={todayPath}
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.2"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Breakeven Marker Pins */}
              {breakevens.map((be) => {
                const beX = getX(be);
                if (beX < padding.left || beX > width - padding.right) return null;
                return (
                  <g key={be}>
                    <circle cx={beX} cy={zeroY} r="4.5" fill="#F59E0B" stroke="#000" strokeWidth="1" />
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

              {/* Opstra Curve Legend */}
              <g transform={`translate(${padding.left + 8}, ${padding.top + 16})`}>
                <rect x="0" y="0" width="165" height="38" rx="3" fill="#FFFFFF" fillOpacity="0.9" stroke="#E2E8F0" strokeWidth="1" />
                {/* Expiry line */}
                <line x1="8" y1="12" x2="28" y2="12" stroke="#0000FF" strokeWidth="2.5" />
                <text x="34" y="15" fill="#1E293B" fontSize="9.5" fontFamily="sans-serif" fontWeight="600">
                  Expiry P&amp;L
                </text>
                {/* Today line */}
                <line x1="8" y1="26" x2="28" y2="26" stroke="#16A34A" strokeWidth="2.2" strokeDasharray="4 2" />
                <text x="34" y="29" fill="#1E293B" fontSize="9.5" fontFamily="sans-serif" fontWeight="600">
                  Today (T+{timeShiftDays}) P&amp;L
                </text>
              </g>

              {/* Watermark in bottom right */}
              <text
                x={width - padding.right - 10}
                y={height - padding.bottom - 10}
                fill="#94A3B8"
                fontSize="9"
                fontFamily="sans-serif"
                textAnchor="end"
                opacity="0.6"
              >
                MI007 F&amp;O Intelligence Hub
              </text>

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
                  <circle cx={hoverData.x} cy={hoverData.yExp} r="4.5" fill="#0000FF" stroke="#fff" strokeWidth="1.5" />
                  <circle cx={hoverData.x} cy={hoverData.yTod} r="4.5" fill="#16A34A" stroke="#fff" strokeWidth="1.5" />

                  <g transform={`translate(${Math.min(width - 150, Math.max(padding.left + 5, hoverData.x - 70))}, ${padding.top + 5})`}>
                    <rect width="140" height="55" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
                    <text x="8" y="15" fill="#1E293B" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                      Price: {curr}{hoverData.price.toLocaleString(loc)}
                    </text>
                    <text
                      x="8"
                      y="32"
                      fill="#0000FF"
                      fontSize="10.5"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      Exp PnL: {hoverData.expiryPnl >= 0 ? '+' : ''}{curr}{hoverData.expiryPnl.toLocaleString(loc)}
                    </text>
                    <text x="8" y="47" fill="#16A34A" fontSize="9.5" fontFamily="sans-serif" fontWeight="600">
                      T+{timeShiftDays} PnL: {hoverData.todayPnl >= 0 ? '+' : ''}{curr}{hoverData.todayPnl.toLocaleString(loc)}
                    </text>
                  </g>
                </g>
              )}
            </svg>

            {/* Empty State Overlay when no positions are added */}
            {activeLegs.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px]">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 max-w-sm text-center">
                  <div className="w-10 h-10 mx-auto mb-2.5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-lg">
                    📈
                  </div>
                  <h4 className="text-[13px] font-bold text-slate-800 mb-1">Payoff Chart Ready</h4>
                  <p className="text-[11.5px] text-slate-500 leading-normal">
                    No active positions. Add strikes from the Option Chain below or select an institutional preset from the gallery to visualize your strategy payoff curve.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: FUTURES CHART */}
      {activeTab === 'FUTURES' && (
        <div className="p-6 bg-white text-center text-slate-600 text-[13px]">
          Underlying Futures chart tracking spot {curr}{spotPrice.toLocaleString(loc)}.
        </div>
      )}

      {/* VIEW 3: GREEKS MATRIX */}
      {activeTab === 'GREEKS' && (
        <div className="overflow-x-auto p-4 bg-white">
          <table className="w-full text-[11.5px] text-center border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10.5px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <th className="py-2 px-3 text-left">Leg</th>
                <th className="py-2 px-2">Action</th>
                <th className="py-2 px-2">Strike</th>
                <th className="py-2 px-2">IV %</th>
                <th className="py-2 px-2">Delta</th>
                <th className="py-2 px-2">Gamma</th>
                <th className="py-2 px-2">Theta</th>
                <th className="py-2 px-2">Vega</th>
              </tr>
            </thead>
            <tbody>
              {activeLegs.map((leg, idx) => (
                <tr key={leg.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 text-left font-semibold text-slate-800">
                    Leg #{idx + 1} ({leg.lots}x {leg.instrument})
                  </td>
                  <td className="py-2 px-2 font-bold">{leg.action}</td>
                  <td className="py-2 px-2">{leg.strike}</td>
                  <td className="py-2 px-2">{leg.iv.toFixed(1)}%</td>
                  <td className="py-2 px-2 font-bold">{leg.greeks.delta.toFixed(3)}</td>
                  <td className="py-2 px-2">{leg.greeks.gamma.toFixed(4)}</td>
                  <td className="py-2 px-2">{curr}{leg.greeks.theta.toFixed(1)}</td>
                  <td className="py-2 px-2">{curr}{leg.greeks.vega.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 4: P&L TABLE */}
      {activeTab === 'PNL' && (
        <div className="overflow-x-auto p-4 bg-white">
          <table className="w-full text-[11.5px] text-center border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10.5px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <th className="py-2 px-3">Underlying Price</th>
                <th className="py-2 px-3 text-emerald-700">Expiry P&amp;L</th>
                <th className="py-2 px-3 text-amber-700">T+{timeShiftDays} P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {expiryPoints.filter((_, i) => i % 6 === 0).map((pt, i) => (
                <tr key={pt.price} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-800">{curr}{pt.price}</td>
                  <td className={`py-2 px-3 font-bold ${pt.pnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {pt.pnl >= 0 ? '+' : ''}{curr}{pt.pnl.toLocaleString(loc)}
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-700">
                    {curr}{todayPoints[i]?.pnl ?? pt.pnl}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 4. Bottom Greeks Strip (Exact Opstra Style) ── */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-[11.5px] font-semibold text-slate-700">
        <div className="flex flex-wrap items-center gap-6">
          <span>Positional Delta: <strong className="text-slate-900">{payoff ? payoff.netGreeks.delta.toFixed(2) : '0.00'}</strong></span>
          <span>Theta: <strong className="text-slate-900">{payoff ? `-${Math.abs(payoff.netGreeks.theta)}` : '0'}</strong></span>
          <span>Gamma: <strong className="text-slate-900">{payoff ? payoff.netGreeks.gamma.toFixed(2) : '0.00'}</strong></span>
          <span>Vega: <strong className="text-slate-900">{payoff ? payoff.netGreeks.vega.toFixed(2) : '0.00'}</strong></span>
        </div>
        <div>
          <span>Total PNL: </span>
          <strong className={scenarioPnl >= 0 ? 'text-[#0E9F6E]' : 'text-[#E02424]'}>
            {scenarioPnl >= 0 ? `${curr} +${scenarioPnl.toLocaleString(loc)}` : `-${curr} ${Math.abs(scenarioPnl).toLocaleString(loc)}`}
          </strong>
        </div>
      </div>

      {/* ── 5. Bottom Scenario Shock Sliders (Exact Opstra Definedge Style) ── */}
      <div className="px-4 py-3 bg-white border-t border-slate-200 space-y-2.5">
        {/* Spot (%) Slider */}
        <OpstraSlider
          label="Spot (%)"
          value={activeSpotShock}
          min={-10}
          max={10}
          step={0.5}
          onChange={handleSpotShockChange}
          color="#800040"
          infoTooltip="Simulate underlying price movement by percentage shock"
          ticksCount={21}
        />

        {/* IV (%) Slider */}
        <OpstraSlider
          label="IV (%)"
          value={ivShiftPct}
          min={-20}
          max={20}
          step={1}
          onChange={onChangeIvShift}
          color="#800040"
          infoTooltip="Simulate implied volatility shift across all legs"
          ticksCount={21}
        />

        {/* Next n Days Slider */}
        <OpstraSlider
          label="Next n Days"
          value={timeShiftDays}
          min={0}
          max={Math.max(1, daysToExpiry)}
          step={1}
          onChange={onChangeTimeShift}
          color="#718096"
          infoTooltip="Simulate forward time decay towards contract expiration"
          ticksCount={Math.min(15, Math.max(1, daysToExpiry) + 1)}
        />
      </div>
    </div>
  );
}
