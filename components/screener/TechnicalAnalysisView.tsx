// ─── MI007 Interactive Technical Analysis Charting Cockpit ───────────────────
// Institutional multi-indicator candlestick charting with moving average overlays,
// Bollinger bands, RSI, MACD oscillators, and automated pattern detection markers.

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CompanyFundamental } from '@/lib/screener/types';
import { Candle } from '@/lib/types';
import { generateCandlesForSymbol, evaluateAllStrategiesForStock } from '@/lib/screener/technicalStrategies';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollinger } from '@/lib/indicators';
import { useTradeEngine } from '@/lib/tradeEngineContext';

interface TechnicalAnalysisViewProps {
  company: CompanyFundamental;
  allCompanies: CompanyFundamental[];
  onSelectCompany: (symbol: string) => void;
  onBackToScreener: () => void;
  onOpenBacktest?: (symbol: string) => void;
}

export function TechnicalAnalysisView({
  company,
  allCompanies,
  onSelectCompany,
  onBackToScreener,
  onOpenBacktest,
}: TechnicalAnalysisViewProps) {
  const [timeframe, setTimeframe] = useState<'60' | '120' | '220'>('120');
  const [showSMA50, setShowSMA50] = useState(true);
  const [showSMA200, setShowSMA200] = useState(true);
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA21, setShowEMA21] = useState(false);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { getSymbolPrice, status: tradeEngineStatus } = useTradeEngine();
  const live = getSymbolPrice(company.symbol);
  const currentPrice = live?.price ?? company.currentPrice;
  const changePct = live?.changePct ?? company.priceChangePct;

  // Generate historical candle series
  const candles = useMemo(() => {
    return generateCandlesForSymbol(company.symbol, currentPrice, changePct, parseInt(timeframe, 10));
  }, [company.symbol, currentPrice, changePct, timeframe]);

  // Indicator Calculations
  const sma50 = useMemo(() => calculateSMA(candles, 50), [candles]);
  const sma200 = useMemo(() => calculateSMA(candles, 200), [candles]);
  const ema9 = useMemo(() => calculateEMA(candles, 9), [candles]);
  const ema21 = useMemo(() => calculateEMA(candles, 21), [candles]);
  const bollinger = useMemo(() => calculateBollinger(candles, 20, 2), [candles]);
  const rsi = useMemo(() => calculateRSI(candles, 14), [candles]);
  const macd = useMemo(() => calculateMACD(candles, 12, 26, 9), [candles]);

  // Active Signals for this stock
  const signals = useMemo(() => {
    return evaluateAllStrategiesForStock(company.symbol, company.name, company.market, currentPrice, candles);
  }, [company.symbol, company.name, company.market, currentPrice, candles]);

  // Active bar for tooltip
  const activeBarIndex = hoveredIndex !== null ? hoveredIndex : candles.length - 1;
  const activeCandle = candles[activeBarIndex] || candles[candles.length - 1];

  // Chart Geometry Math
  const chartHeight = 280;
  const chartWidth = 800; // viewBox width
  const minPrice = Math.min(...candles.map((c) => c.low)) * 0.985;
  const maxPrice = Math.max(...candles.map((c) => c.high)) * 1.015;
  const priceRange = maxPrice - minPrice || 1;

  const getY = (val: number | null) => {
    if (val === null) return null;
    return chartHeight - ((val - minPrice) / priceRange) * chartHeight;
  };

  const candleWidth = chartWidth / candles.length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToScreener}
            className="px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[12px] font-black shadow-xs cursor-pointer group"
            title="Return to Screeners Table"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>BACK TO SCREENER</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="mono text-[20px] sm:text-[24px] font-black inst-card-text uppercase tracking-wide">
                {company.name}
              </h1>
              <span className="mono text-[13px] font-black px-2.5 py-0.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                {company.symbol}
              </span>
              <span className="mono text-[11px] font-bold px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)]">
                {company.exchange} · {company.country}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mono text-[10.5px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE FEED</span>
              </div>
            </div>
            <div className="text-[12.5px] text-[var(--theme-card-text-muted)] font-medium mt-0.5">
              Sector: <span className="font-bold text-[var(--theme-card-text)]">{company.sector}</span> · 52W High: <span className="font-bold text-[var(--theme-card-text)]">{company.currencySymbol}{company.high52W}</span> · 52W Low: <span className="font-bold text-[var(--theme-card-text)]">{company.currencySymbol}{company.low52W}</span>
            </div>
          </div>
        </div>

        {/* Quick Stock Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={company.symbol}
            onChange={(e) => onSelectCompany(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12.5px] font-bold focus:outline-none focus:border-emerald-500"
          >
            {allCompanies.map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.symbol} — {c.name}
              </option>
            ))}
          </select>

          {onOpenBacktest && (
            <button
              type="button"
              onClick={() => onOpenBacktest(company.symbol)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12px] font-black hover:bg-emerald-400 transition-colors shadow-xs cursor-pointer"
            >
              Backtest Strategy ↗
            </button>
          )}
        </div>
      </div>

      {/* ── Active Bar HUD Ribbon ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 p-3 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs mono text-[12px]">
        <div>
          <span className="text-[10px] text-[var(--theme-card-text-muted)] block uppercase">Date</span>
          <span className="font-black text-[var(--theme-card-text)]">{activeCandle.time || new Date(activeCandle.openTime).toISOString().slice(0, 10)}</span>
        </div>
        <div>
          <span className="text-[10px] text-[var(--theme-card-text-muted)] block uppercase">Open</span>
          <span className="font-black text-[var(--theme-card-text)]">{company.currencySymbol}{activeCandle.open.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] text-[var(--theme-card-text-muted)] block uppercase">High</span>
          <span className="font-black text-emerald-700 dark:text-emerald-400">{company.currencySymbol}{activeCandle.high.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] text-[var(--theme-card-text-muted)] block uppercase">Low</span>
          <span className="font-black text-rose-700 dark:text-rose-400">{company.currencySymbol}{activeCandle.low.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] text-[var(--theme-card-text-muted)] block uppercase">Close / LTP</span>
          <span className={`font-black ${activeCandle.close >= activeCandle.open ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {company.currencySymbol}{activeCandle.close.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-[var(--theme-card-text-muted)] block uppercase">Volume</span>
          <span className="font-bold text-slate-300">
            {company.market === 'INDIA'
              ? `${(activeCandle.volume / 100000).toFixed(1)}L`
              : `${(activeCandle.volume / 1000000).toFixed(1)}M`}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-[var(--theme-card-text-muted)] block uppercase">RSI (14)</span>
          <span className="font-bold text-amber-300">
            {rsi[activeBarIndex] !== null ? rsi[activeBarIndex]!.toFixed(1) : '—'}
          </span>
        </div>
      </div>

      {/* ── Chart & Toggles Panel ── */}
      <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col gap-4">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
          {/* Lookback Timeframes */}
          <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            {[
              { id: '60', label: '60 Days' },
              { id: '120', label: '120 Days' },
              { id: '220', label: '220 Days (Full Cycle)' },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id as any)}
                className={`px-3 py-1 rounded-lg mono text-[11px] font-bold transition-all cursor-pointer ${
                  timeframe === tf.id
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-[var(--theme-card-text-muted)] hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Indicator Toggles */}
          <div className="flex flex-wrap items-center gap-2 mono text-[11px]">
            <button
              type="button"
              onClick={() => setShowSMA50(!showSMA50)}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                showSMA50
                  ? 'border-amber-400/80 bg-amber-400/15 text-amber-300'
                  : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)]'
              }`}
            >
              ● SMA 50
            </button>
            <button
              type="button"
              onClick={() => setShowSMA200(!showSMA200)}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                showSMA200
                  ? 'border-purple-400/80 bg-purple-400/15 text-purple-300'
                  : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)]'
              }`}
            >
              ● SMA 200
            </button>
            <button
              type="button"
              onClick={() => setShowEMA9(!showEMA9)}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                showEMA9
                  ? 'border-sky-400/80 bg-sky-400/15 text-sky-300'
                  : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)]'
              }`}
            >
              ● EMA 9
            </button>
            <button
              type="button"
              onClick={() => setShowBollinger(!showBollinger)}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                showBollinger
                  ? 'border-emerald-400/80 bg-emerald-400/15 text-emerald-300'
                  : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)]'
              }`}
            >
              ● Bollinger Bands
            </button>
            <button
              type="button"
              onClick={() => setShowRSI(!showRSI)}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                showRSI
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)]'
              }`}
            >
              RSI (14)
            </button>
            <button
              type="button"
              onClick={() => setShowMACD(!showMACD)}
              className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                showMACD
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-[var(--theme-card-border)] text-[var(--theme-card-text-muted)]'
              }`}
            >
              MACD (12,26)
            </button>
          </div>
        </div>

        {/* ── Main Candlestick SVG Chart ── */}
        <div className="relative w-full overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800 p-2">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-[280px] overflow-visible select-none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Price horizontal grid lines */}
            {[0.2, 0.4, 0.6, 0.8].map((pct, idx) => {
              const y = chartHeight * pct;
              const price = maxPrice - priceRange * pct;
              return (
                <g key={idx}>
                  <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />
                  <text x={chartWidth - 5} y={y - 3} fill="#64748b" fontSize="9" textAnchor="end" className="mono">
                    {company.currencySymbol}{price.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Bollinger Band Shading */}
            {showBollinger && bollinger && (
              <path
                d={candles
                  .map((_, i) => {
                    const ux = i * candleWidth + candleWidth / 2;
                    const uy = getY(bollinger.upper[i]);
                    return uy !== null ? `${i === 0 ? 'M' : 'L'} ${ux} ${uy}` : '';
                  })
                  .filter(Boolean)
                  .join(' ') +
                  ' ' +
                  candles
                    .slice()
                    .reverse()
                    .map((_, revIdx) => {
                      const i = candles.length - 1 - revIdx;
                      const lx = i * candleWidth + candleWidth / 2;
                      const ly = getY(bollinger.lower[i]);
                      return ly !== null ? `L ${lx} ${ly}` : '';
                    })
                    .filter(Boolean)
                    .join(' ') +
                  ' Z'}
                fill="#10b981"
                fillOpacity="0.06"
              />
            )}

            {/* Bollinger Upper & Lower Lines */}
            {showBollinger && (
              <>
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  points={candles
                    .map((_, i) => {
                      const y = getY(bollinger.upper[i]);
                      return y !== null ? `${i * candleWidth + candleWidth / 2},${y}` : null;
                    })
                    .filter(Boolean)
                    .join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  points={candles
                    .map((_, i) => {
                      const y = getY(bollinger.lower[i]);
                      return y !== null ? `${i * candleWidth + candleWidth / 2},${y}` : null;
                    })
                    .filter(Boolean)
                    .join(' ')}
                />
              </>
            )}

            {/* Moving Averages */}
            {showSMA50 && (
              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.8"
                points={candles
                  .map((_, i) => {
                    const y = getY(sma50[i]);
                    return y !== null ? `${i * candleWidth + candleWidth / 2},${y}` : null;
                  })
                  .filter(Boolean)
                  .join(' ')}
              />
            )}
            {showSMA200 && (
              <polyline
                fill="none"
                stroke="#c084fc"
                strokeWidth="1.8"
                points={candles
                  .map((_, i) => {
                    const y = getY(sma200[i]);
                    return y !== null ? `${i * candleWidth + candleWidth / 2},${y}` : null;
                  })
                  .filter(Boolean)
                  .join(' ')}
              />
            )}
            {showEMA9 && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                points={candles
                  .map((_, i) => {
                    const y = getY(ema9[i]);
                    return y !== null ? `${i * candleWidth + candleWidth / 2},${y}` : null;
                  })
                  .filter(Boolean)
                  .join(' ')}
              />
            )}

            {/* Candlestick Bars */}
            {candles.map((c, i) => {
              const xCenter = i * candleWidth + candleWidth / 2;
              const yHigh = getY(c.high)!;
              const yLow = getY(c.low)!;
              const yOpen = getY(c.open)!;
              const yClose = getY(c.close)!;

              const isUp = c.close >= c.open;
              const color = isUp ? '#10b981' : '#f43f5e';
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));
              const bodyWidth = Math.max(2, candleWidth * 0.7);

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredIndex(i)}
                  className="cursor-crosshair"
                >
                  {/* Wick */}
                  <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={color} strokeWidth="1" />
                  {/* Real Body */}
                  <rect
                    x={xCenter - bodyWidth / 2}
                    y={bodyTop}
                    width={bodyWidth}
                    height={bodyHeight}
                    fill={color}
                    rx="0.5"
                  />
                </g>
              );
            })}

            {/* Hover Crosshair */}
            {hoveredIndex !== null && (
              <line
                x1={hoveredIndex * candleWidth + candleWidth / 2}
                y1={0}
                x2={hoveredIndex * candleWidth + candleWidth / 2}
                y2={chartHeight}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
            )}

            {/* Top-Left Corner Watermark */}
            <text
              x={12}
              y={18}
              fill="#64748b"
              fontSize="10"
              fontFamily="sans-serif"
              fontWeight="bold"
              textAnchor="start"
              opacity="0.45"
            >
              Synthetix Analytics
            </text>
          </svg>
        </div>

        {/* ── Subplot 1: RSI (14) Oscillator ── */}
        {showRSI && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10.5px] mono font-bold">
              <span className="text-amber-400">RSI (14): {rsi[activeBarIndex] !== null ? rsi[activeBarIndex]!.toFixed(1) : '—'}</span>
              <span className="text-slate-500">Overbought: 70 · Oversold: 30</span>
            </div>
            <svg viewBox={`0 0 ${chartWidth} 60`} className="w-full h-[60px] overflow-visible">
              {/* Reference threshold lines 70 & 30 */}
              <line x1="0" y1="18" x2={chartWidth} y2="18" stroke="#f43f5e" strokeDasharray="2 2" strokeOpacity="0.4" />
              <line x1="0" y1="42" x2={chartWidth} y2="42" stroke="#10b981" strokeDasharray="2 2" strokeOpacity="0.4" />
              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.6"
                points={candles
                  .map((_, i) => {
                    const r = rsi[i];
                    if (r === null) return null;
                    const y = 60 - (r / 100) * 60;
                    return `${i * candleWidth + candleWidth / 2},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ')}
              />
            </svg>
          </div>
        )}

        {/* ── Subplot 2: MACD (12, 26, 9) Oscillator ── */}
        {showMACD && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10.5px] mono font-bold">
              <div className="flex items-center gap-3">
                <span className="text-sky-400">MACD: {macd.macd[activeBarIndex]?.toFixed(2) || '0.00'}</span>
                <span className="text-amber-400">Signal: {macd.signal[activeBarIndex]?.toFixed(2) || '0.00'}</span>
                <span className="text-slate-300">Hist: {macd.histogram[activeBarIndex]?.toFixed(2) || '0.00'}</span>
              </div>
              <span className="text-slate-500">Fast 12 · Slow 26 · Signal 9</span>
            </div>
            <svg viewBox={`0 0 ${chartWidth} 60`} className="w-full h-[60px] overflow-visible">
              <line x1="0" y1="30" x2={chartWidth} y2="30" stroke="#475569" strokeDasharray="2 2" />
              {/* Histogram Bars */}
              {candles.map((_, i) => {
                const hist = macd.histogram[i] || 0;
                const hHeight = Math.min(26, Math.abs(hist) * 8);
                const isPositive = hist >= 0;
                const y = isPositive ? 30 - hHeight : 30;
                return (
                  <rect
                    key={i}
                    x={i * candleWidth + candleWidth * 0.1}
                    y={y}
                    width={candleWidth * 0.8}
                    height={Math.max(1, hHeight)}
                    fill={isPositive ? '#10b981' : '#f43f5e'}
                    opacity="0.75"
                  />
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* ── Automated Signals Teardown for this Symbol ── */}
      <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)] mb-4">
          <div className="flex items-center gap-2">
            <span className="mono text-[14px] font-black inst-card-text uppercase tracking-wide">
              Active Quantitative Strategy Signals for {company.symbol}
            </span>
            <span className="mono text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              {signals.filter((s) => s.signalTriggered).length} Triggered
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {signals.map((sig) => {
            const isBull = sig.direction === 'bullish';
            const isBear = sig.direction === 'bearish';
            return (
              <div
                key={sig.strategyId}
                className={`p-3.5 rounded-xl border transition-all ${
                  sig.signalTriggered
                    ? isBull
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-rose-500/40 bg-rose-500/10'
                    : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/50 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="mono text-[12px] font-black text-[var(--theme-card-text)]">{sig.strategyName}</span>
                  <span
                    className={`mono text-[10px] font-black px-1.5 py-0.5 rounded leading-none ${
                      isBull
                        ? 'bg-emerald-500 text-slate-950'
                        : isBear
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isBull ? '▲ BULLISH' : isBear ? '▼ BEARISH' : 'NEUTRAL'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--theme-card-text-muted)] line-clamp-2">
                  {sig.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
