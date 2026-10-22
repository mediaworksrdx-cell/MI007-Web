// ─── 2026 Bloomberg/Linear Grade Payoff Workspace ─────────────────────────────
// High-precision SVG Payoff Diagram with Neon Glow Curves, Feathered Gradient Washes,
// Pulsing Radar Breakevens, SD Markers (-2σ to +2σ), Floating HUD & Shock Sliders.
'use client';

import React, { useState, useRef, useMemo } from 'react';
import { PayoffPoint, StrategyLeg, StrategyPayoff } from '@/lib/fno/fnoTypes';

interface PayoffDiagramProps {
  expiryPoints: PayoffPoint[];
  todayPoints: PayoffPoint[];
  spotPrice: number;
  breakevens: number[];
  timeShiftDays: number;
  onChangeTimeShift: (days: number) => void;
  ivShiftPct: number;
  onChangeIvShift: (iv: number) => void;
  daysToExpiry?: number;
  activeLegs?: StrategyLeg[];
  payoff?: StrategyPayoff;
  iv?: number;
}

export function PayoffDiagram({
  expiryPoints,
  todayPoints,
  spotPrice,
  breakevens,
  timeShiftDays,
  onChangeTimeShift,
  ivShiftPct,
  onChangeIvShift,
  daysToExpiry = 7,
  activeLegs = [],
  payoff,
  iv = 15.5,
}: PayoffDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'PAYOFF' | 'FUTURES' | 'GREEKS' | 'PNL_TABLE'>('PAYOFF');
  const [spotVsFuturesToggle, setSpotVsFuturesToggle] = useState<'SPOT' | 'FUTURES'>('SPOT');
  const [spotShockPct, setSpotShockPct] = useState<number>(0);

  // SVG dimensions
  const width = 860;
  const height = 370;
  const padding = { top: 38, right: 35, bottom: 42, left: 70 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // ── Standard Deviation Band Calculations (-2σ to +2σ) ──
  const sigma1 = useMemo(() => {
    const dteSafe = Math.max(1, daysToExpiry);
    return spotPrice * (iv / 100.0) * Math.sqrt(dteSafe / 365.0);
  }, [spotPrice, iv, daysToExpiry]);

  const sdMarkers = useMemo(() => {
    return [
      { label: '-2σ', price: Math.round(spotPrice - 2 * sigma1), color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
      { label: '-1σ', price: Math.round(spotPrice - 1 * sigma1), color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
      { label: 'Spot', price: Math.round(spotPrice), color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40' },
      { label: '+1σ', price: Math.round(spotPrice + 1 * sigma1), color: 'text-lime-400 bg-lime-500/10 border-lime-500/30' },
      { label: '+2σ', price: Math.round(spotPrice + 2 * sigma1), color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    ];
  }, [spotPrice, sigma1]);

  // Price & PnL Domains
  const { minPrice, maxPrice, minPnl, maxPnl } = useMemo(() => {
    if (!expiryPoints || expiryPoints.length === 0) {
      return { minPrice: 0, maxPrice: 100, minPnl: -1000, maxPnl: 1000 };
    }
    const allPrices = expiryPoints.map((p) => p.price);
    const allPnls = [...expiryPoints.map((p) => p.pnl), ...todayPoints.map((p) => p.pnl)];

    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    let minL = Math.min(...allPnls, 0);
    let maxL = Math.max(...allPnls, 0);

    const pnlSpan = Math.max(100, maxL - minL);
    minL -= pnlSpan * 0.12;
    maxL += pnlSpan * 0.12;

    return { minPrice: minP, maxPrice: maxP, minPnl: minL, maxPnl: maxL };
  }, [expiryPoints, todayPoints]);

  const priceRange = Math.max(1, maxPrice - minPrice);
  const pnlRange = Math.max(1, maxPnl - minPnl);

  const getX = (price: number) => padding.left + ((price - minPrice) / priceRange) * plotWidth;
  const getY = (pnl: number) => padding.top + (1 - (pnl - minPnl) / pnlRange) * plotHeight;

  const zeroY = getY(0);
  const spotX = getX(spotPrice);

  // SVG Expiry Line Path
  const expiryPath = useMemo(() => {
    if (expiryPoints.length === 0) return '';
    return expiryPoints.reduce((acc, pt, i) => {
      const x = getX(pt.price);
      const y = getY(pt.pnl);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [expiryPoints, minPrice, maxPrice, minPnl, maxPnl]);

  // SVG Today / Scenario Line Path
  const todayPath = useMemo(() => {
    if (todayPoints.length === 0) return '';
    return todayPoints.reduce((acc, pt, i) => {
      const x = getX(pt.price);
      const y = getY(pt.pnl);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [todayPoints, minPrice, maxPrice, minPnl, maxPnl]);

  // Feathered Gradient Washes for Profit (Above Zero) and Loss (Below Zero)
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
    const priceMovePct = ((expPt.price - spotPrice) / spotPrice) * 100;

    return {
      price: expPt.price,
      priceMovePct,
      expiryPnl: expPt.pnl,
      todayPnl: todPt.pnl,
      x: getX(expPt.price),
      yExp: getY(expPt.pnl),
      yTod: getY(todPt.pnl),
    };
  }, [hoverX, expiryPoints, todayPoints, minPrice, maxPrice, priceRange, spotPrice]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    setHoverX(x);
  };

  const handleResetShocks = () => {
    setSpotShockPct(0);
    onChangeTimeShift(0);
    onChangeIvShift(0);
  };

  // P&L Table Scenario Data
  const pnlTableRows = useMemo(() => {
    const rows = [];
    const steps = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
    for (const pct of steps) {
      const targetPrice = Math.round(spotPrice * (1 + pct / 100.0));
      let closestExpPnl = 0;
      let closestTodPnl = 0;
      let minDiff = Infinity;
      expiryPoints.forEach((pt, i) => {
        const d = Math.abs(pt.price - targetPrice);
        if (d < minDiff) {
          minDiff = d;
          closestExpPnl = pt.pnl;
          closestTodPnl = todayPoints[i]?.pnl ?? pt.pnl;
        }
      });
      rows.push({
        pct,
        price: targetPrice,
        expPnl: closestExpPnl,
        todPnl: closestTodPnl,
      });
    }
    return rows;
  }, [spotPrice, expiryPoints, todayPoints]);

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative isolate">
      {/* ── 1. Top Sub-Tabs Navigation Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-900/80 border-b border-white/[0.08]">
        {/* Workspace Sub-Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('PAYOFF')}
            className={`px-3.5 py-1.5 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeWorkspaceTab === 'PAYOFF'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📈 PAYOFF CHART
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('FUTURES')}
            className={`px-3.5 py-1.5 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeWorkspaceTab === 'FUTURES'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 FUTURES CHART
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('GREEKS')}
            className={`px-3.5 py-1.5 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeWorkspaceTab === 'GREEKS'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔢 GREEKS MATRIX
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('PNL_TABLE')}
            className={`px-3.5 py-1.5 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeWorkspaceTab === 'PNL_TABLE'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📑 P&amp;L TABLE
          </button>
        </div>

        {/* Right Toggle & Reset Button */}
        <div className="flex items-center gap-2 mono text-[11px]">
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setSpotVsFuturesToggle('SPOT')}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-all ${
                spotVsFuturesToggle === 'SPOT'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SPOT
            </button>
            <button
              type="button"
              onClick={() => setSpotVsFuturesToggle('FUTURES')}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer transition-all ${
                spotVsFuturesToggle === 'FUTURES'
                  ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              FUTURES
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetShocks}
            className="p-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-emerald-500/40 transition-all cursor-pointer group"
            title="Reset Scenario Shocks"
          >
            <span className="group-hover:rotate-180 transition-transform inline-block">🔄</span>
          </button>
        </div>
      </div>

      {/* ── 2. Standard Deviation Markers Bar (-2σ to +2σ) ── */}
      <div className="px-4 py-2.5 border-b border-white/[0.06] bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 text-[11px] mono">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            STANDARD DEVIATION BANDS (IV {iv.toFixed(1)}% · {daysToExpiry} DTE):
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 font-bold">
          {sdMarkers.map((m) => (
            <div key={m.label} className="flex items-center gap-1.5">
              <span className={`text-[9.5px] px-2 py-0.5 rounded-lg font-black border ${m.color}`}>
                {m.label}
              </span>
              <span className="text-white">₹{m.price.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Workspace Main View ── */}
      <div className="p-3 sm:p-4">
        {/* VIEW 1: PAYOFF CHART */}
        {activeWorkspaceTab === 'PAYOFF' && (
          <div className="space-y-3">
            {/* Chart Legend Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] mono font-bold">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(0,245,155,0.6)]" />
                  <span className="text-emerald-400">Expiry Payoff (Solid)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5 border-t-2 border-dashed border-cyan-400 shadow-[0_0_6px_rgba(0,229,255,0.6)]" />
                  <span className="text-cyan-400">T+{timeShiftDays} Scenario (Dashed)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                  <span className="text-amber-400">Breakeven(s)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-400/60" />
                  <span className="text-slate-300">Profit Zone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-400/60" />
                  <span className="text-slate-300">Loss Zone</span>
                </div>
              </div>
            </div>

            {/* High-Precision SVG Diagram */}
            <div ref={containerRef} className="relative w-full aspect-[8.6/3.7] overflow-hidden select-none bg-[#050a14] rounded-2xl border border-white/10 shadow-inner">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverX(null)}
              >
                <defs>
                  {/* Neon Glow Filter */}
                  <filter id="neonPayoffGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Feathered Profit Gradient Wash */}
                  <linearGradient id="profitGrad2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00F59B" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#00F59B" stopOpacity="0.01" />
                  </linearGradient>

                  {/* Feathered Loss Gradient Wash */}
                  <linearGradient id="lossGrad2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF4D4D" stopOpacity="0.01" />
                    <stop offset="100%" stopColor="#FF4D4D" stopOpacity="0.22" />
                  </linearGradient>
                </defs>

                {/* Shaded Feathered Profit & Loss Areas */}
                {profitAreaPath && (
                  <path d={profitAreaPath} fill="url(#profitGrad2026)" />
                )}
                {lossAreaPath && (
                  <path d={lossAreaPath} fill="url(#lossGrad2026)" />
                )}

                {/* Zero PnL Horizontal Hairline */}
                <line
                  x1={padding.left}
                  y1={zeroY}
                  x2={width - padding.right}
                  y2={zeroY}
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <text
                  x={padding.left - 8}
                  y={zeroY + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="end"
                >
                  ₹0.00
                </text>

                {/* Standard Deviation Vertical Reference Guides */}
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
                        stroke="#1e293b"
                        strokeDasharray="2 3"
                        strokeWidth="1"
                      />
                      <text
                        x={sX}
                        y={height - padding.bottom + 14}
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {m.label}
                      </text>
                      <text
                        x={sX}
                        y={height - padding.bottom + 27}
                        fill="#cbd5e1"
                        fontSize="8.5"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {m.price}
                      </text>
                    </g>
                  );
                })}

                {/* Spot Price Vertical Dashed Guide */}
                {spotX >= padding.left && spotX <= width - padding.right && (
                  <g>
                    <line
                      x1={spotX}
                      y1={padding.top}
                      x2={spotX}
                      y2={height - padding.bottom}
                      stroke="#00E5FF"
                      strokeDasharray="4 4"
                      strokeWidth="1.8"
                    />
                    <rect
                      x={spotX - 48}
                      y={padding.top - 22}
                      width="96"
                      height="18"
                      rx="6"
                      fill="#0284c7"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <text
                      x={spotX}
                      y={padding.top - 10}
                      fill="#ffffff"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="black"
                      textAnchor="middle"
                    >
                      SPOT: ₹{spotPrice}
                    </text>
                  </g>
                )}

                {/* Expiry Curve (Solid Neon Matrix Emerald) */}
                {expiryPath && (
                  <path
                    d={expiryPath}
                    fill="none"
                    stroke="#00F59B"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#neonPayoffGlow)"
                  />
                )}

                {/* T+0 Scenario Curve (Dashed Electric Cyan) */}
                {todayPath && (
                  <path
                    d={todayPath}
                    fill="none"
                    stroke="#00E5FF"
                    strokeWidth="2.2"
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Pulsing Radar Breakeven Pins */}
                {breakevens.map((be) => {
                  const beX = getX(be);
                  if (beX < padding.left || beX > width - padding.right) return null;
                  return (
                    <g key={be}>
                      {/* Outer radar ping */}
                      <circle cx={beX} cy={zeroY} r="8" fill="none" stroke="#FBBF24" strokeWidth="1" opacity="0.4" />
                      {/* Inner solid marker */}
                      <circle cx={beX} cy={zeroY} r="5" fill="#FBBF24" stroke="#000" strokeWidth="1.5" />
                      <rect
                        x={beX - 32}
                        y={zeroY - 24}
                        width="64"
                        height="16"
                        rx="4"
                        fill="#0b1329"
                        stroke="#FBBF24"
                        strokeWidth="1"
                      />
                      <text
                        x={beX}
                        y={zeroY - 13}
                        fill="#FBBF24"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="black"
                        textAnchor="middle"
                      >
                        ₹{be}
                      </text>
                    </g>
                  );
                })}

                {/* 2026 Floating Frosted-Glass HUD Crosshair Tooltip */}
                {hoverData && (
                  <g>
                    {/* Vertical Hairline */}
                    <line
                      x1={hoverData.x}
                      y1={padding.top}
                      x2={hoverData.x}
                      y2={height - padding.bottom}
                      stroke="#ffffff"
                      strokeOpacity="0.45"
                      strokeDasharray="2 2"
                    />
                    <circle cx={hoverData.x} cy={hoverData.yExp} r="5.5" fill="#00F59B" stroke="#000" strokeWidth="1.5" />
                    <circle cx={hoverData.x} cy={hoverData.yTod} r="5" fill="#00E5FF" stroke="#000" strokeWidth="1.5" />

                    {/* HUD Tooltip Box */}
                    <g transform={`translate(${Math.min(width - 175, Math.max(padding.left + 5, hoverData.x - 85))}, ${padding.top + 5})`}>
                      <rect
                        width="170"
                        height="68"
                        rx="10"
                        fill="#030712"
                        fillOpacity="0.95"
                        stroke="#334155"
                        strokeWidth="1.2"
                      />
                      <text x="12" y="18" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold">
                        ₹{hoverData.price.toLocaleString('en-IN')} ({hoverData.priceMovePct >= 0 ? '+' : ''}{hoverData.priceMovePct.toFixed(1)}%)
                      </text>
                      <text
                        x="12"
                        y="38"
                        fill={hoverData.expiryPnl >= 0 ? '#00F59B' : '#ff4d4d'}
                        fontSize="12.5"
                        fontFamily="monospace"
                        fontWeight="black"
                      >
                        Exp PnL: {hoverData.expiryPnl >= 0 ? '+' : ''}₹{hoverData.expiryPnl.toLocaleString('en-IN')}
                      </text>
                      <text
                        x="12"
                        y="56"
                        fill={hoverData.todayPnl >= 0 ? '#00e5ff' : '#fb923c'}
                        fontSize="10.5"
                        fontFamily="monospace"
                      >
                        T+{timeShiftDays} Scenario: {hoverData.todayPnl >= 0 ? '+' : ''}₹{hoverData.todayPnl.toLocaleString('en-IN')}
                      </text>
                    </g>
                  </g>
                )}
              </svg>
            </div>
          </div>
        )}

        {/* VIEW 2: FUTURES CHART */}
        {activeWorkspaceTab === 'FUTURES' && (
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/10 space-y-4 mono text-[12px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="font-bold text-amber-400 uppercase tracking-wider">
                Underlying Futures &amp; Spot Positioning
              </span>
              <span className="text-slate-400">
                Spot: ₹{spotPrice.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-500/20">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Lower Boundary (-2σ)</span>
                <span className="font-black text-rose-400 text-[15px]">₹{sdMarkers[0].price}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/20">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Spot Axis</span>
                <span className="font-black text-cyan-400 text-[15px]">₹{spotPrice}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/20">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Upper Boundary (+2σ)</span>
                <span className="font-black text-emerald-400 text-[15px]">₹{sdMarkers[4].price}</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: GREEKS MATRIX */}
        {activeWorkspaceTab === 'GREEKS' && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full mono text-[11.5px] text-center border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-[10px] font-bold text-slate-400 uppercase border-b border-white/10">
                  <th className="py-2.5 px-3 text-left">Leg</th>
                  <th className="py-2.5 px-2">Action</th>
                  <th className="py-2.5 px-2">Strike</th>
                  <th className="py-2.5 px-2">IV %</th>
                  <th className="py-2.5 px-2 text-cyan-400">Delta (Δ)</th>
                  <th className="py-2.5 px-2 text-purple-400">Gamma (Γ)</th>
                  <th className="py-2.5 px-2 text-rose-400">Theta (θ/d)</th>
                  <th className="py-2.5 px-2 text-emerald-400">Vega (ν/%)</th>
                </tr>
              </thead>
              <tbody>
                {activeLegs.map((leg, idx) => (
                  <tr
                    key={leg.id}
                    className={`border-b border-white/[0.04] hover:bg-white/5 ${
                      leg.disabled ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-left font-bold text-white">
                      Leg #{idx + 1} ({leg.lots}x {leg.instrument})
                    </td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        leg.action === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                      }`}>
                        {leg.action}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-black text-white">{leg.strike}</td>
                    <td className="py-2 px-2 text-slate-300">{leg.iv.toFixed(1)}%</td>
                    <td className="py-2 px-2 font-black text-cyan-400">{leg.greeks.delta.toFixed(3)}</td>
                    <td className="py-2 px-2 font-black text-purple-400">{leg.greeks.gamma.toFixed(4)}</td>
                    <td className="py-2 px-2 font-black text-rose-400">₹{leg.greeks.theta.toFixed(1)}</td>
                    <td className="py-2 px-2 font-black text-emerald-400">₹{leg.greeks.vega.toFixed(1)}</td>
                  </tr>
                ))}
                {payoff && (
                  <tr className="bg-slate-900/90 font-black border-t-2 border-white/20">
                    <td colSpan={4} className="py-2.5 px-3 text-left uppercase text-emerald-400">
                      Total Strategy Net Greeks
                    </td>
                    <td className="py-2.5 px-2 text-cyan-400">
                      {payoff.netGreeks.delta >= 0 ? '+' : ''}{payoff.netGreeks.delta.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-purple-400">
                      {payoff.netGreeks.gamma.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-2 text-rose-400">
                      ₹{payoff.netGreeks.theta.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-2 text-emerald-400">
                      ₹{payoff.netGreeks.vega.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 4: P&L TABLE */}
        {activeWorkspaceTab === 'PNL_TABLE' && (
          <div className="overflow-x-auto rounded-2xl border border-white/10 max-h-[320px] overflow-y-auto">
            <table className="w-full mono text-[11.5px] text-center border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900/95">
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-white/10">
                  <th className="py-2.5 px-3">Underlying Price</th>
                  <th className="py-2.5 px-2">% Shock</th>
                  <th className="py-2.5 px-3 text-emerald-400">Expiry P&amp;L</th>
                  <th className="py-2.5 px-3 text-cyan-400">T+{timeShiftDays} P&amp;L</th>
                  <th className="py-2.5 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pnlTableRows.map((r) => {
                  const isExpProf = r.expPnl >= 0;
                  const isTodProf = r.todPnl >= 0;
                  return (
                    <tr
                      key={r.pct}
                      className={`border-b border-white/[0.04] hover:bg-white/5 ${
                        r.pct === 0 ? 'bg-cyan-500/10 font-black' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-black text-white">
                        ₹{r.price.toLocaleString('en-IN')} {r.pct === 0 ? '(Spot)' : ''}
                      </td>
                      <td className="py-2 px-2 font-bold text-slate-400">
                        {r.pct >= 0 ? `+${r.pct}%` : `${r.pct}%`}
                      </td>
                      <td className={`py-2 px-3 font-black ${isExpProf ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isExpProf ? '+' : ''}₹{r.expPnl.toLocaleString('en-IN')}
                      </td>
                      <td className={`py-2 px-3 font-black ${isTodProf ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {isTodProf ? '+' : ''}₹{r.todPnl.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                          isExpProf ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {isExpProf ? 'PROFIT' : 'LOSS'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Bottom Greeks Strip ── */}
      {payoff && (
        <div className="px-4 py-2.5 bg-slate-900/95 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-[11px] mono">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-bold">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Delta (Δ):</span>
              <span className="text-cyan-400 font-black">
                {payoff.netGreeks.delta >= 0 ? '+' : ''}{payoff.netGreeks.delta.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Theta (θ):</span>
              <span className="text-rose-400 font-black">
                ₹{payoff.netGreeks.theta.toLocaleString('en-IN')}/day
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Gamma (Γ):</span>
              <span className="text-purple-400 font-black">
                {payoff.netGreeks.gamma.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Vega (ν):</span>
              <span className="text-emerald-400 font-black">
                ₹{payoff.netGreeks.vega.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Total PNL:</span>
            <span
              className={`font-black text-[13px] px-2.5 py-0.5 rounded-lg ${
                payoff.netDebitCredit >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {payoff.netDebitCredit >= 0 ? '+₹' : '-₹'}
              {Math.abs(payoff.netDebitCredit).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* ── 5. Bottom Scenario Shock Sliders ── */}
      <div className="px-4 py-3 bg-slate-950/90 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-4 mono text-[11px]">
        {/* Spot Shock Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold">
              Target Spot Shock:
            </span>
            <span className="font-black text-cyan-400">
              {spotShockPct >= 0 ? `+${spotShockPct}%` : `${spotShockPct}%`}{' '}
              (₹{Math.round(spotPrice * (1 + spotShockPct / 100.0)).toLocaleString('en-IN')})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] text-slate-500">-5%</span>
            <input
              type="range"
              min={-5}
              max={5}
              step={0.5}
              value={spotShockPct}
              onChange={(e) => setSpotShockPct(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[9.5px] text-slate-500">+5%</span>
          </div>
        </div>

        {/* IV Shift Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold">
              Target IV Shock:
            </span>
            <span className="font-black text-fuchsia-400">
              {ivShiftPct >= 0 ? `+${ivShiftPct}%` : `${ivShiftPct}%`}{' '}
              (Shifted IV: {(iv + ivShiftPct).toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] text-slate-500">-15%</span>
            <input
              type="range"
              min={-15}
              max={20}
              step={1}
              value={ivShiftPct}
              onChange={(e) => onChangeIvShift(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
            />
            <span className="text-[9.5px] text-slate-500">+20%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
