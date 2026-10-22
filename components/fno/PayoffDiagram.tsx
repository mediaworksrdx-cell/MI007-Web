// ─── Interactive Institutional Payoff Chart ─────────────────────────────────
// High-precision SVG Payoff Diagram with Expiry Curve, T+0 Decay, Crosshairs & Breakevens.
'use client';

import React, { useState, useRef, useMemo } from 'react';
import { PayoffPoint } from '@/lib/fno/fnoTypes';

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
}: PayoffDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  // Chart dimensions
  const width = 800;
  const height = 340;
  const padding = { top: 25, right: 35, bottom: 35, left: 65 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Domain & Ranges
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

    // Add padding to PnL so zero line isn't stuck at border
    const pnlSpan = Math.max(100, maxL - minL);
    minL -= pnlSpan * 0.12;
    maxL += pnlSpan * 0.12;

    return { minPrice: minP, maxPrice: maxP, minPnl: minL, maxPnl: maxL };
  }, [expiryPoints, todayPoints]);

  const priceRange = Math.max(1, maxPrice - minPrice);
  const pnlRange = Math.max(1, maxPnl - minPnl);

  const getX = (price: number) => padding.left + ((price - minPrice) / priceRange) * plotWidth;
  const getY = (pnl: number) => padding.top + (1 - (pnl - minPnl) / pnlRange) * plotHeight;

  // Zero PnL Y coordinate
  const zeroY = getY(0);

  // Spot X coordinate
  const spotX = getX(spotPrice);

  // Expiry SVG Path
  const expiryPath = useMemo(() => {
    if (expiryPoints.length === 0) return '';
    return expiryPoints.reduce((acc, pt, i) => {
      const x = getX(pt.price);
      const y = getY(pt.pnl);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [expiryPoints, minPrice, maxPrice, minPnl, maxPnl]);

  // Today / Scenario SVG Path
  const todayPath = useMemo(() => {
    if (todayPoints.length === 0) return '';
    return todayPoints.reduce((acc, pt, i) => {
      const x = getX(pt.price);
      const y = getY(pt.pnl);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [todayPoints, minPrice, maxPrice, minPnl, maxPnl]);

  // Hover Point Detection
  const hoverData = useMemo(() => {
    if (hoverX === null || expiryPoints.length === 0) return null;
    const ratio = Math.max(0, Math.min(1, (hoverX - padding.left) / plotWidth));
    const targetPrice = minPrice + ratio * priceRange;

    // Find closest point
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

  const handleMouseLeave = () => {
    setHoverX(null);
  };

  return (
    <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* ── Chart Top Legend & Simulation Sliders ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] mono font-bold">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-full bg-emerald-400" />
            <span className="text-[var(--theme-card-text)]">Expiry Payoff (Solid)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-6 border-t-2 border-dashed border-cyan-400" />
            <span className="text-cyan-400">T+{timeShiftDays} Scenario (Dashed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-amber-400">Breakeven(s)</span>
          </div>
        </div>

        {/* Simulation Sliders */}
        <div className="flex items-center gap-4 text-[11px] mono">
          {/* Time Decay Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--theme-card-subtitle)]">Time Decay:</span>
            <input
              type="range"
              min={0}
              max={daysToExpiry}
              value={timeShiftDays}
              onChange={(e) => onChangeTimeShift(Number(e.target.value))}
              className="w-20 h-1.5 bg-[var(--theme-card-subsurface)] rounded appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="font-bold text-cyan-400 w-12">+{timeShiftDays}d</span>
          </div>

          {/* IV Shock Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--theme-card-subtitle)]">IV Shock:</span>
            <input
              type="range"
              min={-10}
              max={15}
              value={ivShiftPct}
              onChange={(e) => onChangeIvShift(Number(e.target.value))}
              className="w-20 h-1.5 bg-[var(--theme-card-subsurface)] rounded appearance-none cursor-pointer accent-fuchsia-400"
            />
            <span className="font-bold text-fuchsia-400 w-10">
              {ivShiftPct >= 0 ? '+' : ''}{ivShiftPct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── High-Precision SVG Diagram ── */}
      <div ref={containerRef} className="relative w-full aspect-[8/3.4] overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Subtle Grid Lines */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="currentColor"
            className="text-[var(--theme-card-border)]"
            strokeWidth="1.5"
          />

          {/* Current Spot Price Vertical Line */}
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
              <text
                x={spotX}
                y={padding.top - 6}
                fill="#38BDF8"
                fontSize="10"
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
              strokeWidth="2.5"
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
                  y={zeroY + 15}
                  fill="#FBBF24"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ₹{be}
                </text>
              </g>
            );
          })}

          {/* Interactive Crosshair & Tooltip */}
          {hoverData && (
            <g>
              {/* Vertical Crosshair */}
              <line
                x1={hoverData.x}
                y1={padding.top}
                x2={hoverData.x}
                y2={height - padding.bottom}
                stroke="#fff"
                strokeOpacity="0.4"
                strokeDasharray="2 2"
              />
              {/* Points on Curves */}
              <circle cx={hoverData.x} cy={hoverData.yExp} r="4.5" fill="#00F59B" stroke="#000" />
              <circle cx={hoverData.x} cy={hoverData.yTod} r="4" fill="#00E5FF" stroke="#000" />

              {/* Tooltip Box */}
              <g transform={`translate(${Math.min(width - 150, Math.max(padding.left + 10, hoverData.x - 70))}, ${padding.top + 10})`}>
                <rect
                  width="140"
                  height="60"
                  rx="6"
                  fill="#0B192C"
                  fillOpacity="0.95"
                  stroke="#1B3B60"
                  strokeWidth="1"
                />
                <text x="8" y="16" fill="#7DD3FC" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Price: ₹{hoverData.price}
                </text>
                <text
                  x="8"
                  y="34"
                  fill={hoverData.expiryPnl >= 0 ? '#00F59B' : '#FF4D4D'}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="black"
                >
                  Exp PnL: {hoverData.expiryPnl >= 0 ? '+' : ''}₹{hoverData.expiryPnl.toLocaleString('en-IN')}
                </text>
                <text
                  x="8"
                  y="50"
                  fill={hoverData.todayPnl >= 0 ? '#00E5FF' : '#FF4D4D'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  T+{timeShiftDays} PnL: {hoverData.todayPnl >= 0 ? '+' : ''}₹{hoverData.todayPnl.toLocaleString('en-IN')}
                </text>
              </g>
            </g>
          )}

          {/* Left Y Axis Label (PnL) */}
          <text
            x={padding.left - 8}
            y={getY(maxPnl * 0.8)}
            fill="#00F59B"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="end"
          >
            +₹{(maxPnl * 0.8).toFixed(0)}
          </text>
          <text
            x={padding.left - 8}
            y={zeroY + 3}
            fill="#7DD3FC"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="end"
          >
            ₹0
          </text>
          <text
            x={padding.left - 8}
            y={getY(minPnl * 0.8)}
            fill="#FF4D4D"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="end"
          >
            -₹{Math.abs(minPnl * 0.8).toFixed(0)}
          </text>

          {/* Bottom X Axis Labels (Price) */}
          <text
            x={padding.left}
            y={height - 10}
            fill="#7DD3FC"
            fontSize="9.5"
            fontFamily="monospace"
            textAnchor="start"
          >
            ₹{minPrice.toFixed(0)}
          </text>
          <text
            x={width - padding.right}
            y={height - 10}
            fill="#7DD3FC"
            fontSize="9.5"
            fontFamily="monospace"
            textAnchor="end"
          >
            ₹{maxPrice.toFixed(0)}
          </text>
        </svg>
      </div>
    </div>
  );
}
