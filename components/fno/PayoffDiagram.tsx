// ─── Interactive Institutional Payoff Workspace (Opstra Definedge Compatible) ─
// Features: Multi-tab (Payoff, Futures, Greeks, P&L Table), SD Markers (-2σ to +2σ),
// Shaded Profit/Loss Areas, T+0 Line, Positional Greeks Strip & Shock Sliders.
'use client';

import React, { useState, useRef, useMemo } from 'react';
import { PayoffPoint, StrategyLeg, StrategyPayoff, Greeks } from '@/lib/fno/fnoTypes';

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
  const height = 360;
  const padding = { top: 35, right: 35, bottom: 40, left: 70 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // ── Standard Deviation Band Calculations (-2σ to +2σ) ──
  const sigma1 = useMemo(() => {
    const dteSafe = Math.max(1, daysToExpiry);
    return spotPrice * (iv / 100.0) * Math.sqrt(dteSafe / 365.0);
  }, [spotPrice, iv, daysToExpiry]);

  const sdMarkers = useMemo(() => {
    return [
      { label: '-2σ', price: Math.round(spotPrice - 2 * sigma1) },
      { label: '-1σ', price: Math.round(spotPrice - 1 * sigma1) },
      { label: 'Spot', price: Math.round(spotPrice) },
      { label: '+1σ', price: Math.round(spotPrice + 1 * sigma1) },
      { label: '+2σ', price: Math.round(spotPrice + 2 * sigma1) },
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

  // Shaded Profit (Area above zero line) and Loss (Area below zero line)
  const { profitAreaPath, lossAreaPath } = useMemo(() => {
    if (expiryPoints.length === 0) return { profitAreaPath: '', lossAreaPath: '' };

    // Profit polygon (clamped at zeroY)
    let pPath = `M ${getX(expiryPoints[0].price)} ${zeroY}`;
    expiryPoints.forEach((pt) => {
      const x = getX(pt.price);
      const y = pt.pnl >= 0 ? getY(pt.pnl) : zeroY;
      pPath += ` L ${x} ${y}`;
    });
    pPath += ` L ${getX(expiryPoints[expiryPoints.length - 1].price)} ${zeroY} Z`;

    // Loss polygon (clamped at zeroY)
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

  // Reset shock sliders
  const handleResetShocks = () => {
    setSpotShockPct(0);
    onChangeTimeShift(0);
    onChangeIvShift(0);
  };

  // P&L Table Scenario Data (-5% to +5% in 1% steps)
  const pnlTableRows = useMemo(() => {
    const rows = [];
    const steps = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
    for (const pct of steps) {
      const targetPrice = Math.round(spotPrice * (1 + pct / 100.0));
      // Closest expiry point
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
    <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl overflow-hidden shadow-sm space-y-0">
      {/* ── 1. Top Sub-Tabs Navigation Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[var(--theme-card-subsurface)] border-b border-[var(--theme-card-border)]">
        {/* Workspace Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('PAYOFF')}
            className={`px-3 py-1 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeWorkspaceTab === 'PAYOFF'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-[var(--theme-card-subtitle)] hover:text-white hover:bg-white/5'
            }`}
          >
            📈 PAYOFF CHART
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('FUTURES')}
            className={`px-3 py-1 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeWorkspaceTab === 'FUTURES'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-[var(--theme-card-subtitle)] hover:text-white hover:bg-white/5'
            }`}
          >
            📊 FUTURES CHART
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('GREEKS')}
            className={`px-3 py-1 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeWorkspaceTab === 'GREEKS'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-[var(--theme-card-subtitle)] hover:text-white hover:bg-white/5'
            }`}
          >
            🔢 GREEKS MATRIX
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspaceTab('PNL_TABLE')}
            className={`px-3 py-1 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              activeWorkspaceTab === 'PNL_TABLE'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-[var(--theme-card-subtitle)] hover:text-white hover:bg-white/5'
            }`}
          >
            📑 P&amp;L TABLE
          </button>
        </div>

        {/* Right Toggle & Reset */}
        <div className="flex items-center gap-2 mono text-[11px]">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
            <button
              type="button"
              onClick={() => setSpotVsFuturesToggle('SPOT')}
              className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                spotVsFuturesToggle === 'SPOT'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-[var(--theme-card-subtitle)]'
              }`}
            >
              SPOT
            </button>
            <button
              type="button"
              onClick={() => setSpotVsFuturesToggle('FUTURES')}
              className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                spotVsFuturesToggle === 'FUTURES'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-[var(--theme-card-subtitle)]'
              }`}
            >
              FUTURES
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetShocks}
            className="p-1 rounded text-[var(--theme-card-subtitle)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Reset Scenario Shocks"
          >
            🔄
          </button>
        </div>
      </div>

      {/* ── 2. Standard Deviation Markers Bar ── */}
      <div className="px-4 py-2 border-b border-[var(--theme-card-border)]/50 bg-slate-950/20 flex flex-wrap items-center justify-between text-[11px] mono">
        <span className="text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
          Standard Deviation Bands (IV {iv.toFixed(1)}% · {daysToExpiry} DTE):
        </span>
        <div className="flex items-center gap-2 sm:gap-4 font-bold">
          {sdMarkers.map((m) => (
            <div key={m.label} className="flex items-center gap-1">
              <span
                className={`text-[9.5px] px-1 py-0.2 rounded font-black ${
                  m.label === 'Spot'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : m.label.includes('-')
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {m.label}
              </span>
              <span className="text-[var(--theme-card-text)]">₹{m.price.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Main Workspace Tab View ── */}
      <div className="p-3 sm:p-4">
        {/* VIEW 1: PAYOFF CHART */}
        {activeWorkspaceTab === 'PAYOFF' && (
          <div className="space-y-3">
            {/* Legend strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] mono font-bold text-[var(--theme-card-subtitle)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-5 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400">Expiry Payoff (Solid)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-0.5 w-5 border-t-2 border-dashed border-cyan-400" />
                  <span className="text-cyan-400">T+{timeShiftDays} Scenario (Dashed)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-amber-400">Breakeven(s)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/50" />
                  <span>Profit Zone</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500/50" />
                  <span>Loss Zone</span>
                </div>
              </div>
            </div>

            {/* High-Precision SVG Diagram */}
            <div ref={containerRef} className="relative w-full aspect-[8.6/3.6] overflow-hidden select-none bg-slate-950/40 rounded-xl border border-[var(--theme-card-border)]">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverX(null)}
              >
                <defs>
                  {/* Profit Fill Gradient */}
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
                  </linearGradient>
                  {/* Loss Fill Gradient */}
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.03" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.25" />
                  </linearGradient>
                </defs>

                {/* Shaded Profit & Loss Areas */}
                {profitAreaPath && (
                  <path d={profitAreaPath} fill="url(#profitGrad)" />
                )}
                {lossAreaPath && (
                  <path d={lossAreaPath} fill="url(#lossGrad)" />
                )}

                {/* Zero PnL Horizontal Line */}
                <line
                  x1={padding.left}
                  y1={zeroY}
                  x2={width - padding.right}
                  y2={zeroY}
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                <text
                  x={padding.left - 8}
                  y={zeroY + 4}
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  ₹0
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
                        stroke="#334155"
                        strokeDasharray="2 3"
                        strokeWidth="1"
                      />
                      <text
                        x={sX}
                        y={height - padding.bottom + 14}
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {m.label}
                      </text>
                      <text
                        x={sX}
                        y={height - padding.bottom + 26}
                        fill="#94a3b8"
                        fontSize="8.5"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {m.price}
                      </text>
                    </g>
                  );
                })}

                {/* Current Spot Vertical Line */}
                {spotX >= padding.left && spotX <= width - padding.right && (
                  <g>
                    <line
                      x1={spotX}
                      y1={padding.top}
                      x2={spotX}
                      y2={height - padding.bottom}
                      stroke="#38BDF8"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={spotX - 44}
                      y={padding.top - 20}
                      width="88"
                      height="16"
                      rx="4"
                      fill="#0284c7"
                    />
                    <text
                      x={spotX}
                      y={padding.top - 8}
                      fill="#ffffff"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      SPOT: ₹{spotPrice}
                    </text>
                  </g>
                )}

                {/* Expiry Curve Path */}
                {expiryPath && (
                  <path
                    d={expiryPath}
                    fill="none"
                    stroke="#00F59B"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* T+0 / Scenario Curve Path */}
                {todayPath && (
                  <path
                    d={todayPath}
                    fill="none"
                    stroke="#00E5FF"
                    strokeWidth="2"
                    strokeDasharray="5 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Breakeven Circles on Zero Line */}
                {breakevens.map((be) => {
                  const beX = getX(be);
                  if (beX < padding.left || beX > width - padding.right) return null;
                  return (
                    <g key={be}>
                      <circle cx={beX} cy={zeroY} r="5" fill="#FBBF24" stroke="#000" strokeWidth="1.5" />
                      <text
                        x={beX}
                        y={zeroY - 9}
                        fill="#FBBF24"
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        BE: ₹{be}
                      </text>
                    </g>
                  );
                })}

                {/* Interactive Crosshair & Tooltip */}
                {hoverData && (
                  <g>
                    <line
                      x1={hoverData.x}
                      y1={padding.top}
                      x2={hoverData.x}
                      y2={height - padding.bottom}
                      stroke="#ffffff"
                      strokeOpacity="0.5"
                      strokeDasharray="2 2"
                    />
                    <circle cx={hoverData.x} cy={hoverData.yExp} r="5" fill="#00F59B" stroke="#000" strokeWidth="1.5" />
                    <circle cx={hoverData.x} cy={hoverData.yTod} r="4.5" fill="#00E5FF" stroke="#000" strokeWidth="1.5" />

                    <g transform={`translate(${Math.min(width - 165, Math.max(padding.left + 5, hoverData.x - 75))}, ${padding.top + 5})`}>
                      <rect
                        width="150"
                        height="62"
                        rx="8"
                        fill="#030712"
                        fillOpacity="0.95"
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                      <text x="10" y="18" fill="#38bdf8" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                        Price: ₹{hoverData.price.toLocaleString('en-IN')}
                      </text>
                      <text
                        x="10"
                        y="36"
                        fill={hoverData.expiryPnl >= 0 ? '#00F59B' : '#ff4d4d'}
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="black"
                      >
                        Exp PnL: {hoverData.expiryPnl >= 0 ? '+' : ''}₹{hoverData.expiryPnl.toLocaleString('en-IN')}
                      </text>
                      <text
                        x="10"
                        y="52"
                        fill={hoverData.todayPnl >= 0 ? '#00e5ff' : '#fb923c'}
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        T+{timeShiftDays} PnL: {hoverData.todayPnl >= 0 ? '+' : ''}₹{hoverData.todayPnl.toLocaleString('en-IN')}
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
          <div className="p-6 bg-slate-950/40 rounded-xl border border-[var(--theme-card-border)] space-y-4 mono text-[12px]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)]">
              <span className="font-bold text-amber-400 uppercase tracking-wider">
                Underlying Futures &amp; Spot Positioning
              </span>
              <span className="text-[var(--theme-card-subtitle)]">
                Spot: ₹{spotPrice.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
                <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Lower Boundary (-2σ)</span>
                <span className="font-black text-rose-400 text-[14px]">₹{sdMarkers[0].price}</span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
                <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Current Spot Axis</span>
                <span className="font-black text-cyan-400 text-[14px]">₹{spotPrice}</span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
                <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Upper Boundary (+2σ)</span>
                <span className="font-black text-emerald-400 text-[14px]">₹{sdMarkers[4].price}</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-cyan-300 text-[11px] leading-relaxed">
              💡 Breakeven price levels are situated at {breakevens.length > 0 ? breakevens.map((b) => `₹${b}`).join(' and ') : 'N/A'}.
              Holding this position past the nearest breakeven shifts risk into the positive payoff regime.
            </div>
          </div>
        )}

        {/* VIEW 3: GREEKS MATRIX */}
        {activeWorkspaceTab === 'GREEKS' && (
          <div className="overflow-x-auto rounded-xl border border-[var(--theme-card-border)]">
            <table className="w-full mono text-[11px] text-center border-collapse">
              <thead>
                <tr className="bg-[var(--theme-card-subsurface)] text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase border-b border-[var(--theme-card-border)]">
                  <th className="py-2 px-3 text-left">Leg</th>
                  <th className="py-2 px-2">Action</th>
                  <th className="py-2 px-2">Strike</th>
                  <th className="py-2 px-2">IV %</th>
                  <th className="py-2 px-2 text-cyan-400">Delta (Δ)</th>
                  <th className="py-2 px-2 text-purple-400">Gamma (Γ)</th>
                  <th className="py-2 px-2 text-rose-400">Theta (θ/d)</th>
                  <th className="py-2 px-2 text-emerald-400">Vega (ν/%)</th>
                </tr>
              </thead>
              <tbody>
                {activeLegs.map((leg, idx) => (
                  <tr
                    key={leg.id}
                    className={`border-b border-[var(--theme-card-border)]/40 hover:bg-white/5 ${
                      leg.disabled ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-left font-bold text-[var(--theme-card-text)]">
                      Leg #{idx + 1} ({leg.lots}x {leg.instrument})
                    </td>
                    <td className="py-2 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${
                        leg.action === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-slate-950'
                      }`}>
                        {leg.action}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-black">{leg.strike}</td>
                    <td className="py-2 px-2">{leg.iv.toFixed(1)}%</td>
                    <td className="py-2 px-2 font-bold text-cyan-400">{leg.greeks.delta.toFixed(3)}</td>
                    <td className="py-2 px-2 font-bold text-purple-400">{leg.greeks.gamma.toFixed(4)}</td>
                    <td className="py-2 px-2 font-bold text-rose-400">₹{leg.greeks.theta.toFixed(1)}</td>
                    <td className="py-2 px-2 font-bold text-emerald-400">₹{leg.greeks.vega.toFixed(1)}</td>
                  </tr>
                ))}
                {/* Total Row */}
                {payoff && (
                  <tr className="bg-[var(--theme-card-subsurface)] font-black border-t-2 border-[var(--theme-card-border)]">
                    <td colSpan={4} className="py-2 px-3 text-left uppercase text-emerald-400">
                      Total Strategy Net Greeks
                    </td>
                    <td className="py-2 px-2 text-cyan-400">
                      {payoff.netGreeks.delta >= 0 ? '+' : ''}{payoff.netGreeks.delta.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-purple-400">
                      {payoff.netGreeks.gamma.toFixed(4)}
                    </td>
                    <td className="py-2 px-2 text-rose-400">
                      ₹{payoff.netGreeks.theta.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-2 text-emerald-400">
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
          <div className="overflow-x-auto rounded-xl border border-[var(--theme-card-border)] max-h-[320px] overflow-y-auto">
            <table className="w-full mono text-[11px] text-center border-collapse">
              <thead className="sticky top-0 z-10 bg-[var(--theme-card-subsurface)]">
                <tr className="text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase border-b border-[var(--theme-card-border)]">
                  <th className="py-2 px-3">Underlying Price</th>
                  <th className="py-2 px-2">% Shock</th>
                  <th className="py-2 px-3 text-emerald-400">Expiry P&amp;L</th>
                  <th className="py-2 px-3 text-cyan-400">T+{timeShiftDays} P&amp;L</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pnlTableRows.map((r) => {
                  const isExpProf = r.expPnl >= 0;
                  const isTodProf = r.todPnl >= 0;
                  return (
                    <tr
                      key={r.pct}
                      className={`border-b border-[var(--theme-card-border)]/40 hover:bg-white/5 ${
                        r.pct === 0 ? 'bg-cyan-500/10 font-black' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-black text-[var(--theme-card-text)]">
                        ₹{r.price.toLocaleString('en-IN')} {r.pct === 0 ? '(Current Spot)' : ''}
                      </td>
                      <td className="py-2 px-2 font-bold text-[var(--theme-card-subtitle)]">
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
                          isExpProf ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
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

      {/* ── 4. Bottom Greeks Strip (Opstra Definedge Compatible) ── */}
      {payoff && (
        <div className="px-4 py-2 bg-slate-950/60 border-t border-[var(--theme-card-border)] flex flex-wrap items-center justify-between gap-3 text-[11px] mono">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 font-bold">
            <div>
              <span className="text-[var(--theme-card-subtitle)] mr-1">Delta:</span>
              <span className="text-cyan-400 font-black">
                {payoff.netGreeks.delta >= 0 ? '+' : ''}{payoff.netGreeks.delta.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[var(--theme-card-subtitle)] mr-1">Theta:</span>
              <span className="text-rose-400 font-black">
                ₹{payoff.netGreeks.theta.toLocaleString('en-IN')}/day
              </span>
            </div>
            <div>
              <span className="text-[var(--theme-card-subtitle)] mr-1">Gamma:</span>
              <span className="text-purple-400 font-black">
                {payoff.netGreeks.gamma.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-[var(--theme-card-subtitle)] mr-1">Vega:</span>
              <span className="text-emerald-400 font-black">
                ₹{payoff.netGreeks.vega.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[var(--theme-card-subtitle)] mr-1.5 font-bold">Total PNL:</span>
            <span
              className={`font-black text-[12px] ${
                payoff.netDebitCredit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {payoff.netDebitCredit >= 0 ? '+₹' : '-₹'}
              {Math.abs(payoff.netDebitCredit).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* ── 5. Bottom Scenario Shock Sliders (Spot % and IV %) ── */}
      <div className="px-4 py-3 bg-[var(--theme-card-subsurface)] border-t border-[var(--theme-card-border)] grid grid-cols-1 sm:grid-cols-2 gap-4 mono text-[11px]">
        {/* Spot Shock Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[var(--theme-card-subtitle)] font-bold">
              Target Spot Shock:
            </span>
            <span className="font-black text-cyan-400">
              {spotShockPct >= 0 ? `+${spotShockPct}%` : `${spotShockPct}%`}{' '}
              (₹{Math.round(spotPrice * (1 + spotShockPct / 100.0)).toLocaleString('en-IN')})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] text-[var(--theme-card-subtitle)]">-5%</span>
            <input
              type="range"
              min={-5}
              max={5}
              step={0.5}
              value={spotShockPct}
              onChange={(e) => setSpotShockPct(Number(e.target.value))}
              className="w-full h-1.5 bg-[var(--theme-card-surface)] rounded appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[9.5px] text-[var(--theme-card-subtitle)]">+5%</span>
          </div>
        </div>

        {/* IV Shift Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[var(--theme-card-subtitle)] font-bold">
              Target IV Shock:
            </span>
            <span className="font-black text-fuchsia-400">
              {ivShiftPct >= 0 ? `+${ivShiftPct}%` : `${ivShiftPct}%`}{' '}
              (Shifted IV: {(iv + ivShiftPct).toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] text-[var(--theme-card-subtitle)]">-15%</span>
            <input
              type="range"
              min={-15}
              max={20}
              step={1}
              value={ivShiftPct}
              onChange={(e) => onChangeIvShift(Number(e.target.value))}
              className="w-full h-1.5 bg-[var(--theme-card-surface)] rounded appearance-none cursor-pointer accent-fuchsia-400"
            />
            <span className="text-[9.5px] text-[var(--theme-card-subtitle)]">+20%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
