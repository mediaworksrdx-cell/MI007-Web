// ─── Exact Opstra Definedge Payoff Diagram Workspace (Image 4) ───────────────
'use client';

import React, { useState, useRef, useMemo } from 'react';
import { PayoffPoint, StrategyLeg, StrategyPayoff } from '@/lib/fno/fnoTypes';
import { findFnoInstrument } from '@/lib/fno/fnoDataService';

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
  symbol?: string;
  onSaveStrategy?: () => void;
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
  const [spotShockPct, setSpotShockPct] = useState<number>(0);

  // SVG Chart Dimensions
  const width = 840;
  const height = 380;
  const padding = { top: 30, right: 35, bottom: 45, left: 75 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Standard Deviation Bands (Opstra top markers: -2σ, -1σ, Spot, +1σ, +2σ)
  const sigma1 = useMemo(() => {
    const dteSafe = Math.max(1, daysToExpiry);
    return spotPrice * (iv / 100.0) * Math.sqrt(dteSafe / 365.0);
  }, [spotPrice, iv, daysToExpiry]);

  const sdMarkers = useMemo(() => {
    return [
      { label: '-2σ', price: Math.round(spotPrice - 2 * sigma1) },
      { label: '-1σ', price: Math.round(spotPrice - 1 * sigma1) },
      { label: `${spotPrice}`, price: Math.round(spotPrice), isSpot: true },
      { label: '+1σ', price: Math.round(spotPrice + 1 * sigma1) },
      { label: '+2σ', price: Math.round(spotPrice + 2 * sigma1) },
    ];
  }, [spotPrice, sigma1]);

  // Price & PnL Domains
  const { minPrice, maxPrice, minPnl, maxPnl } = useMemo(() => {
    if (!expiryPoints || expiryPoints.length === 0) {
      return { minPrice: 20950, maxPrice: 24310, minPnl: -40000, maxPnl: 120000 };
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
  }, [expiryPoints, todayPoints]);

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
      {/* ── 1. Top Header Banner & SAVE STRATEGY Button (Exact Opstra Style) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-slate-200 bg-white">
        {/* Promotional pill */}
        <div className="hidden sm:flex items-center gap-2 bg-[#004D40] text-white text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-xs">
          <span>Manage All Your Positions In One Place</span>
          <span className="text-[#FFD54F] font-bold">★ With Live Terminal</span>
        </div>

        {/* Black [ SAVE STRATEGY ] Button */}
        <button
          type="button"
          onClick={onSaveStrategy}
          className="bg-slate-900 hover:bg-black text-white font-bold text-[11px] uppercase tracking-wider px-5 py-2 rounded-sm transition-colors cursor-pointer shadow-xs ml-auto"
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
              setSpotShockPct(0);
              onChangeTimeShift(0);
              onChangeIvShift(0);
            }}
            className="text-slate-500 hover:text-slate-800 pb-2 cursor-pointer"
            title="Reset"
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

              {/* ── Exact Opstra Shaded Areas ── */}
              {/* Soft Light Green Profit Area (above zero line) */}
              {profitAreaPath && (
                <path d={profitAreaPath} fill="#DEF7EC" opacity="0.85" />
              )}
              {/* Soft Light Orange Loss Area (below zero line) */}
              {lossAreaPath && (
                <path d={lossAreaPath} fill="#FEF08A" opacity="0.65" />
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

              {/* Standard Deviation Top Markers (-2σ, -1σ, Spot, +1σ, +2σ) */}
              {sdMarkers.map((m) => {
                const sX = getX(m.price);
                if (sX < padding.left || sX > width - padding.right) return null;
                return (
                  <g key={m.label}>
                    <line x1={sX} y1={padding.top} x2={sX} y2={padding.top - 6} stroke="#334155" strokeWidth="1" />
                    <text
                      x={sX}
                      y={padding.top - 9}
                      fill={m.isSpot ? '#15803D' : '#475569'}
                      fontSize={m.isSpot ? '9.5' : '9'}
                      fontFamily="sans-serif"
                      fontWeight={m.isSpot ? 'bold' : 'normal'}
                      textAnchor="middle"
                    >
                      {m.label}
                    </text>
                  </g>
                );
              })}

              {/* Dotted Vertical Green Line at Current Spot */}
              {spotX >= padding.left && spotX <= width - padding.right && (
                <line
                  x1={spotX}
                  y1={padding.top}
                  x2={spotX}
                  y2={height - padding.bottom}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
              )}

              {/* Expiry Curve (Solid Green/Blue line matching Opstra) */}
              {expiryPath && (
                <path
                  d={expiryPath}
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* T+0 Scenario Curve (Dashed Orange line) */}
              {todayPath && (
                <path
                  d={todayPath}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Breakeven Marker Pins */}
              {breakevens.map((be) => {
                const beX = getX(be);
                if (beX < padding.left || beX > width - padding.right) return null;
                return (
                  <circle key={be} cx={beX} cy={zeroY} r="4" fill="#F59E0B" stroke="#000" strokeWidth="1" />
                );
              })}

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
                  <circle cx={hoverData.x} cy={hoverData.yExp} r="4.5" fill="#16A34A" stroke="#000" />
                  <circle cx={hoverData.x} cy={hoverData.yTod} r="4" fill="#D97706" stroke="#000" />

                  <g transform={`translate(${Math.min(width - 150, Math.max(padding.left + 5, hoverData.x - 70))}, ${padding.top + 5})`}>
                    <rect width="140" height="55" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
                    <text x="8" y="15" fill="#1E293B" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                      Price: {curr}{hoverData.price.toLocaleString(loc)}
                    </text>
                    <text
                      x="8"
                      y="32"
                      fill={hoverData.expiryPnl >= 0 ? '#15803D' : '#DC2626'}
                      fontSize="10.5"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      Exp PnL: {hoverData.expiryPnl >= 0 ? '+' : ''}{curr}{hoverData.expiryPnl.toLocaleString(loc)}
                    </text>
                    <text x="8" y="47" fill="#D97706" fontSize="9.5" fontFamily="sans-serif">
                      T+{timeShiftDays} PnL: {hoverData.todayPnl >= 0 ? '+' : ''}{curr}{hoverData.todayPnl.toLocaleString(loc)}
                    </text>
                  </g>
                </g>
              )}
            </svg>
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
          <strong className="text-[#0E9F6E]">
            {payoff && payoff.netDebitCredit >= 0 ? `${curr} +${payoff.netDebitCredit.toLocaleString(loc)}` : `${curr} +91`}
          </strong>
        </div>
      </div>

      {/* ── 5. Bottom Scenario Shock Sliders with Purple Pin (Exact Opstra Style) ── */}
      <div className="px-4 py-3 bg-white border-t border-slate-200 space-y-3 text-[11px] font-semibold text-slate-600">
        {/* Spot Slider */}
        <div className="flex items-center gap-4">
          <span className="w-16">Spot (%):</span>
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min={-5}
              max={5}
              step={0.5}
              value={spotShockPct}
              onChange={(e) => setSpotShockPct(Number(e.target.value))}
              className="w-full h-1 bg-purple-700 rounded-lg appearance-none cursor-pointer accent-purple-700"
            />
          </div>
          <span className="w-8 text-center text-purple-800 font-bold">{spotShockPct}</span>
        </div>

        {/* IV Slider */}
        <div className="flex items-center gap-4">
          <span className="w-16">IV (%):</span>
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min={-15}
              max={15}
              step={1}
              value={ivShiftPct}
              onChange={(e) => onChangeIvShift(Number(e.target.value))}
              className="w-full h-1 bg-purple-700 rounded-lg appearance-none cursor-pointer accent-purple-700"
            />
          </div>
          <span className="w-8 text-center text-purple-800 font-bold">{ivShiftPct}</span>
        </div>
      </div>
    </div>
  );
}
