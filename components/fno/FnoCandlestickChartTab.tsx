// ─── F&O Interactive Futures & Option Strike Candlestick Charts ───────────────
// Real-time Candlestick Charts for Futures and individual Call (CE) & Put (PE) strikes.
// Features Technical Analysis, Candlestick Pattern Recognition, Split Dual View, and Greeks Breakdown.
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  FnoInstrument,
  OptionChainData,
  FuturesTermStructure,
  OptionType,
  OptionContract,
  TradeAction,
  Greeks,
} from '@/lib/fno/fnoTypes';
import { calculateBSPrice } from '@/lib/fno/blackScholes';
import type { Candle, IndicatorConfig } from '@/lib/types';
import {
  calculateEMA,
  calculateSMA,
  calculateVWAP,
  calculateRSI,
  INDICATOR_DEFAULTS,
} from '@/lib/chartRenderer';
import { getMockCandles } from '@/lib/mockData';
import { CandlestickCanvas } from '@/components/chart/CandlestickCanvas';
import { OHLCVHeader } from '@/components/chart/OHLCVHeader';

export type ChartContractMode = 'FUTURES' | 'CE' | 'PE';
export type ChartLayoutMode = 'SINGLE' | 'DUAL';

export interface FnoCandlestickChartTabProps {
  instrument: FnoInstrument;
  chainData: OptionChainData;
  termStructure: FuturesTermStructure;
  selectedExpiry: string;
  onSelectExpiry: (exp: string) => void;
  initialContractType?: 'FUTURES' | 'CE' | 'PE';
  initialStrike?: number;
  onAddLegToBuilder?: (
    action: TradeAction,
    instrument: 'CE' | 'PE',
    strike: number,
    price: number,
    iv: number,
    greeks: Greeks
  ) => void;
  onOpenBuilderTab?: () => void;
}

interface PatternInfo {
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  description: string;
  reliability: 'HIGH' | 'MEDIUM' | 'MODERATE';
}

function detectCandlePattern(candles: Candle[]): PatternInfo | null {
  if (candles.length < 3) return null;
  const c1 = candles[candles.length - 1]; // current
  const c2 = candles[candles.length - 2]; // previous
  const c3 = candles[candles.length - 3];

  const body1 = Math.abs(c1.close - c1.open);
  const range1 = c1.high - c1.low || 0.001;
  const upperWick1 = c1.high - Math.max(c1.open, c1.close);
  const lowerWick1 = Math.min(c1.open, c1.close) - c1.low;
  const isGreen1 = c1.close >= c1.open;

  const body2 = Math.abs(c2.close - c2.open);
  const isGreen2 = c2.close >= c2.open;

  const body3 = Math.abs(c3.close - c3.open);
  const isGreen3 = c3.close >= c3.open;

  // 1. Hammer (Bullish Reversal)
  if (lowerWick1 >= 2 * body1 && upperWick1 <= 0.2 * body1 && !isGreen2) {
    return {
      name: 'Hammer Reversal',
      type: 'BULLISH',
      description: 'Long lower shadow indicates institutional absorption of sell orders.',
      reliability: 'HIGH',
    };
  }

  // 2. Shooting Star / Inverted Hammer (Bearish Reversal)
  if (upperWick1 >= 2 * body1 && lowerWick1 <= 0.2 * body1 && isGreen2) {
    return {
      name: 'Shooting Star',
      type: 'BEARISH',
      description: 'Long upper shadow reflects buyers rejected at high resistance.',
      reliability: 'HIGH',
    };
  }

  // 3. Bullish Engulfing
  if (isGreen1 && !isGreen2 && c1.open <= c2.close && c1.close >= c2.open && body1 > body2) {
    return {
      name: 'Bullish Engulfing',
      type: 'BULLISH',
      description: 'Buyers completely enveloped previous selling candle with momentum.',
      reliability: 'HIGH',
    };
  }

  // 4. Bearish Engulfing
  if (!isGreen1 && isGreen2 && c1.open >= c2.close && c1.close <= c2.open && body1 > body2) {
    return {
      name: 'Bearish Engulfing',
      type: 'BEARISH',
      description: 'Heavy distribution extinguished previous bullish advance.',
      reliability: 'HIGH',
    };
  }

  // 5. Morning Star (Bullish Reversal 3-candle)
  if (!isGreen3 && isGreen1 && body2 < body1 * 0.4 && body2 < body3 * 0.4 && c1.close > (c3.open + c3.close) / 2) {
    return {
      name: 'Morning Star',
      type: 'BULLISH',
      description: 'Classic 3-candle exhaustion followed by vigorous trend reversal.',
      reliability: 'HIGH',
    };
  }

  // 6. Doji (Indecision)
  if (body1 / range1 < 0.08) {
    return {
      name: 'Doji Equilibrium',
      type: 'NEUTRAL',
      description: 'Tug-of-war between option writers and buyers in temporary balance.',
      reliability: 'MEDIUM',
    };
  }

  // 7. Marubozu (Trend Continuation)
  if (body1 / range1 > 0.88) {
    return isGreen1
      ? {
          name: 'Bullish Marubozu',
          type: 'BULLISH',
          description: 'Pure directional expansion with virtually zero wick rejection.',
          reliability: 'MEDIUM',
        }
      : {
          name: 'Bearish Marubozu',
          type: 'BEARISH',
          description: 'Aggressive selling pressure with relentless downside volume.',
          reliability: 'MEDIUM',
        };
  }

  return null;
}

export function FnoCandlestickChartTab({
  instrument,
  chainData,
  termStructure,
  selectedExpiry,
  onSelectExpiry,
  initialContractType = 'FUTURES',
  initialStrike,
  onAddLegToBuilder,
  onOpenBuilderTab,
}: FnoCandlestickChartTabProps) {
  // Chart Modes & View Layout
  const [layoutMode, setLayoutMode] = useState<ChartLayoutMode>('SINGLE');
  const [contractType, setContractType] = useState<ChartContractMode>(initialContractType);
  const [timeframe, setTimeframe] = useState<string>('5m');

  // Indicators toggle
  const [showEma9, setShowEma9] = useState(true);
  const [showEma21, setShowEma21] = useState(true);
  const [showVwap, setShowVwap] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // Active strike selection
  const liveSpot = chainData.spotPrice;
  const defaultAtmStrike = useMemo(() => {
    if (chainData.strikes.length === 0) return 0;
    return chainData.strikes.reduce((prev, curr) =>
      Math.abs(curr.strike - liveSpot) < Math.abs(prev.strike - liveSpot) ? curr : prev
    ).strike;
  }, [chainData.strikes, liveSpot]);

  const [selectedStrike, setSelectedStrike] = useState<number>(() => {
    return initialStrike ?? defaultAtmStrike;
  });

  // Keep strike in sync if props change or empty
  useEffect(() => {
    if (initialStrike && initialStrike > 0) {
      setSelectedStrike(initialStrike);
    }
  }, [initialStrike]);

  useEffect(() => {
    if (initialContractType) {
      setContractType(initialContractType);
    }
  }, [initialContractType]);

  // Selected Option Row & Contract
  const activeStrikeRow = useMemo(() => {
    return chainData.strikes.find((s) => s.strike === selectedStrike) || chainData.strikes[0];
  }, [chainData.strikes, selectedStrike]);

  const activeOptionContract: OptionContract | undefined = useMemo(() => {
    if (!activeStrikeRow) return undefined;
    return contractType === 'PE' ? activeStrikeRow.put : activeStrikeRow.call;
  }, [activeStrikeRow, contractType]);

  const curr = instrument.market === 'USA' ? '$' : instrument.market === 'UAE' ? 'AED ' : '₹';
  const loc = instrument.market === 'INDIA' ? 'en-IN' : 'en-US';

  // Moneyness calculation
  const isAtmStrike = Math.abs(selectedStrike - liveSpot) < (instrument.strikeStep || 50) / 2;
  const currentMoneyness: 'ITM' | 'ATM' | 'OTM' = isAtmStrike
    ? 'ATM'
    : contractType === 'CE'
    ? selectedStrike < liveSpot
      ? 'ITM'
      : 'OTM'
    : selectedStrike > liveSpot
    ? 'ITM'
    : 'OTM';

  // Futures basis
  const currentFuture = termStructure.contracts[0];
  const basis = currentFuture ? Math.round((currentFuture.ltp - liveSpot) * 100) / 100 : 0;

  // ════════════════════════════════════════════════════════════════════════════
  // 1. CANDLE GENERATION ENGINE FOR FUTURES & OPTIONS CONTRACTS
  // ════════════════════════════════════════════════════════════════════════════
  const baseSpotCandles = useMemo(() => {
    return getMockCandles(instrument.market, instrument.symbol, timeframe, 100);
  }, [instrument.market, instrument.symbol, timeframe]);

  // Futures Candlesticks
  const futuresCandles: Candle[] = useMemo(() => {
    if (!baseSpotCandles || baseSpotCandles.length === 0) return [];
    return baseSpotCandles.map((c, idx) => {
      const isLast = idx === baseSpotCandles.length - 1;
      const targetClose = isLast && currentFuture ? currentFuture.ltp : c.close + basis;
      const o = c.open + basis;
      const h = Math.max(c.high + basis, o, targetClose);
      const l = Math.min(c.low + basis, o, targetClose);
      return {
        openTime: c.openTime,
        time: c.time,
        open: Math.round(o * 100) / 100,
        high: Math.round(h * 100) / 100,
        low: Math.round(l * 100) / 100,
        close: Math.round(targetClose * 100) / 100,
        volume: Math.round(c.volume * 0.42),
      };
    });
  }, [baseSpotCandles, basis, currentFuture]);

  // Option Strike Candlesticks
  const optionCandles: Candle[] = useMemo(() => {
    if (!baseSpotCandles || baseSpotCandles.length === 0 || !activeOptionContract) return [];
    const iv = activeOptionContract.impliedVolatility || 15;
    const currentDte = Math.max(1, chainData.daysToExpiry ?? 7);
    const lastBarTime = baseSpotCandles[baseSpotCandles.length - 1]?.openTime || Date.now();
    const isCall = contractType !== 'PE';
    const type: OptionType = isCall ? 'CE' : 'PE';

    return baseSpotCandles.map((c, idx) => {
      const isLast = idx === baseSpotCandles.length - 1;
      const daysPrior = Math.max(0, (lastBarTime - c.openTime) / 86_400_000);
      const timeYears = (currentDte + daysPrior) / 365;
      let o = calculateBSPrice(type, { spot: c.open, strike: selectedStrike, timeYears, volatility: iv / 100 });
      let cl = isLast
        ? activeOptionContract.ltp
        : calculateBSPrice(type, { spot: c.close, strike: selectedStrike, timeYears, volatility: iv / 100 });
      let h1 = calculateBSPrice(type, { spot: isCall ? c.high : c.low, strike: selectedStrike, timeYears, volatility: iv / 100 });
      let l1 = calculateBSPrice(type, { spot: isCall ? c.low : c.high, strike: selectedStrike, timeYears, volatility: iv / 100 });

      o = Math.max(0.05, Math.round(o * 100) / 100);
      cl = Math.max(0.05, Math.round(cl * 100) / 100);
      let high = Math.max(o, cl, Math.round(h1 * 100) / 100);
      let low = Math.min(o, cl, Math.max(0.05, Math.round(l1 * 100) / 100));

      // Deterministic volume scaling seeded by openTime & strike
      const seed = Math.abs(Math.sin(c.openTime * 0.0001 + selectedStrike * 0.13 + idx * 0.71));
      const volFactor = 0.8 + seed * 0.4;

      return {
        openTime: c.openTime,
        time: c.time,
        open: o,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: cl,
        volume: Math.round((activeOptionContract.volume / 80) * volFactor),
      };
    });
  }, [baseSpotCandles, activeOptionContract, contractType, selectedStrike, chainData.daysToExpiry]);

  // Primary active candle set
  const activeCandles = contractType === 'FUTURES' ? futuresCandles : optionCandles;
  const activeDisplayPrice = contractType === 'FUTURES'
    ? currentFuture?.ltp || liveSpot
    : activeOptionContract?.ltp || 0;

  // Active Symbol Title
  const activeContractLabel = useMemo(() => {
    if (contractType === 'FUTURES') {
      return `${instrument.symbol} FUT (${selectedExpiry})`;
    }
    return `${instrument.symbol} ${selectedStrike} ${contractType} (${selectedExpiry})`;
  }, [instrument.symbol, contractType, selectedStrike, selectedExpiry]);

  // ════════════════════════════════════════════════════════════════════════════
  // 2. INDICATOR CONFIGURATIONS & COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════
  const indicatorConfigs = useMemo(() => {
    const list: IndicatorConfig[] = [];
    if (showEma9) {
      list.push({
        ...INDICATOR_DEFAULTS.EMA,
        type: 'EMA',
        id: 'ema-9',
        period: 9,
        color: '#06b6d4',
        enabled: true,
      });
    }
    if (showEma21) {
      list.push({
        ...INDICATOR_DEFAULTS.EMA,
        type: 'EMA',
        id: 'ema-21',
        period: 21,
        color: '#f59e0b',
        enabled: true,
      });
    }
    if (showVwap) {
      list.push({
        ...INDICATOR_DEFAULTS.VWAP,
        type: 'VWAP',
        id: 'vwap-def',
        color: '#a855f7',
        enabled: true,
      });
    }
    return list;
  }, [showEma9, showEma21, showVwap]);

  const indicatorResults = useMemo(() => {
    const map = new Map<string, unknown>();
    if (activeCandles.length === 0) return map;

    if (showEma9) {
      map.set('ema-9', calculateEMA(activeCandles, 9));
    }
    if (showEma21) {
      map.set('ema-21', calculateEMA(activeCandles, 21));
    }
    if (showVwap) {
      map.set('vwap-def', calculateVWAP(activeCandles));
    }
    return map;
  }, [activeCandles, showEma9, showEma21, showVwap]);

  // Indicator results for Futures in Dual View
  const futuresIndicatorResults = useMemo(() => {
    const map = new Map<string, unknown>();
    if (futuresCandles.length === 0) return map;
    if (showEma9) map.set('ema-9', calculateEMA(futuresCandles, 9));
    if (showEma21) map.set('ema-21', calculateEMA(futuresCandles, 21));
    if (showVwap) map.set('vwap-def', calculateVWAP(futuresCandles));
    return map;
  }, [futuresCandles, showEma9, showEma21, showVwap]);

  // Pattern Detection on current candles
  const detectedPattern = useMemo(() => {
    return detectCandlePattern(activeCandles);
  }, [activeCandles]);

  // Hovered candle state
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [hoveredFuturesCandle, setHoveredFuturesCandle] = useState<Candle | null>(null);

  // Intrinsic vs Extrinsic value for active option
  const intrinsicValue = useMemo(() => {
    if (!activeOptionContract || contractType === 'FUTURES') return 0;
    if (contractType === 'CE') {
      return Math.max(0, liveSpot - selectedStrike);
    } else {
      return Math.max(0, selectedStrike - liveSpot);
    }
  }, [activeOptionContract, contractType, liveSpot, selectedStrike]);

  const extrinsicValue = useMemo(() => {
    if (!activeOptionContract || contractType === 'FUTURES') return 0;
    return Math.max(0, activeOptionContract.ltp - intrinsicValue);
  }, [activeOptionContract, contractType, intrinsicValue]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* ── Top Interactive Control Bar ── */}
      <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left: Contract Type & Strike Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout Mode (Single vs Dual Split) */}
          <div className="flex items-center p-0.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
            <button
              type="button"
              onClick={() => setLayoutMode('SINGLE')}
              className={`px-2.5 py-1 rounded-md text-[11px] mono font-bold cursor-pointer transition ${
                layoutMode === 'SINGLE'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
              }`}
              title="Single Full Screen Chart"
            >
              SINGLE
            </button>
            <button
              type="button"
              onClick={() => {
                setLayoutMode('DUAL');
                if (contractType === 'FUTURES') setContractType('CE');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] mono font-bold cursor-pointer transition flex items-center gap-1 ${
                layoutMode === 'DUAL'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
              }`}
              title="Dual Split View: Futures (Left) vs Option Strike (Right)"
            >
              <span>DUAL SPLIT</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-950 text-emerald-300">FUT+OPT</span>
            </button>
          </div>

          <div className="h-5 w-px bg-[var(--theme-card-border)] mx-1 hidden sm:block" />

          {/* Contract Type Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
            {layoutMode === 'SINGLE' && (
              <button
                type="button"
                onClick={() => setContractType('FUTURES')}
                className={`px-3 py-1 rounded-md text-[11px] mono font-bold cursor-pointer transition ${
                  contractType === 'FUTURES'
                    ? 'bg-sky-500 text-white font-black shadow-xs'
                    : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
                }`}
              >
                FUTURES
              </button>
            )}
            <button
              type="button"
              onClick={() => setContractType('CE')}
              className={`px-3 py-1 rounded-md text-[11px] mono font-bold cursor-pointer transition ${
                contractType === 'CE'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
              }`}
            >
              CALL (CE)
            </button>
            <button
              type="button"
              onClick={() => setContractType('PE')}
              className={`px-3 py-1 rounded-md text-[11px] mono font-bold cursor-pointer transition ${
                contractType === 'PE'
                  ? 'bg-rose-600 text-white font-black shadow-xs'
                  : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
              }`}
            >
              PUT (PE)
            </button>
          </div>

          {/* Strike Selector (Visible for CE / PE) */}
          {(contractType !== 'FUTURES' || layoutMode === 'DUAL') && (
            <div className="flex items-center gap-1.5">
              <label className="text-[10.5px] mono font-bold text-[var(--theme-card-subtitle)] uppercase">
                STRIKE:
              </label>
              <select
                value={selectedStrike}
                onChange={(e) => setSelectedStrike(Number(e.target.value))}
                className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-xs mono font-black text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              >
                {chainData.strikes.map((s) => {
                  const isAtm = Math.abs(s.strike - liveSpot) < (instrument.strikeStep || 50) / 2;
                  const callTag = isAtm ? 'ATM' : s.strike < liveSpot ? 'ITM' : 'OTM';
                  const putTag = isAtm ? 'ATM' : s.strike > liveSpot ? 'ITM' : 'OTM';
                  const tag = contractType === 'PE' ? putTag : callTag;
                  return (
                    <option key={s.strike} value={s.strike} className="bg-[var(--theme-card-surface)]">
                      {s.strike} ({tag}) {isAtm ? '★' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Dynamic Moneyness Pill */}
              <span
                className={`text-[9.5px] mono font-black px-2 py-0.5 rounded-full uppercase border ${
                  currentMoneyness === 'ATM'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-xs'
                    : currentMoneyness === 'ITM'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {currentMoneyness} CONTRACT
              </span>
            </div>
          )}

          {/* Expiry Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10.5px] mono font-bold text-[var(--theme-card-subtitle)] uppercase">
              EXPIRY:
            </label>
            <select
              value={selectedExpiry}
              onChange={(e) => onSelectExpiry(e.target.value)}
              className="px-2 py-1 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-xs mono font-bold text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              {instrument.expiries.map((exp) => (
                <option key={exp} value={exp} className="bg-[var(--theme-card-surface)]">
                  {exp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Timeframe & Technical Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
            {(['1m', '5m', '15m', '1H', '1D'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-md text-[10.5px] mono font-bold cursor-pointer transition ${
                  timeframe === tf
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator Quick Toggles */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowEma9((v) => !v)}
              className={`px-2 py-1 rounded-lg text-[10px] mono font-bold border transition cursor-pointer ${
                showEma9
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-[var(--theme-card-subsurface)] text-[var(--theme-card-subtitle)] border-[var(--theme-card-border)] opacity-60'
              }`}
              title="Toggle 9 EMA (Cyan)"
            >
              9 EMA
            </button>
            <button
              type="button"
              onClick={() => setShowEma21((v) => !v)}
              className={`px-2 py-1 rounded-lg text-[10px] mono font-bold border transition cursor-pointer ${
                showEma21
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-[var(--theme-card-subsurface)] text-[var(--theme-card-subtitle)] border-[var(--theme-card-border)] opacity-60'
              }`}
              title="Toggle 21 EMA (Amber)"
            >
              21 EMA
            </button>
            <button
              type="button"
              onClick={() => setShowVwap((v) => !v)}
              className={`px-2 py-1 rounded-lg text-[10px] mono font-bold border transition cursor-pointer ${
                showVwap
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                  : 'bg-[var(--theme-card-subsurface)] text-[var(--theme-card-subtitle)] border-[var(--theme-card-border)] opacity-60'
              }`}
              title="Toggle VWAP (Purple)"
            >
              VWAP
            </button>
          </div>
        </div>
      </div>

      {/* ── Key Contract Metrics & Pattern Detection Strip ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] text-xs mono">
        {/* Metric 1: Contract Name & Current LTP */}
        <div className="flex flex-col justify-between">
          <div className="text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase">
            ACTIVE CONTRACT
          </div>
          <div className="text-base font-black text-[var(--theme-card-text)] truncate mt-0.5">
            {activeContractLabel}
          </div>
          <div className="text-[11px] font-bold text-slate-400 mt-0.5">
            LTP: <strong className="text-emerald-400 text-sm">{curr}{activeDisplayPrice.toLocaleString(loc, { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        {/* Metric 2: Pattern Recognition Signal */}
        <div className="flex flex-col justify-between">
          <div className="text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase flex items-center justify-between">
            <span>CANDLESTICK PATTERN</span>
            {detectedPattern && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                {detectedPattern.reliability}
              </span>
            )}
          </div>
          {detectedPattern ? (
            <div className="mt-1 space-y-0.5">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-black border ${
                  detectedPattern.type === 'BULLISH'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : detectedPattern.type === 'BEARISH'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {detectedPattern.name}
              </span>
              <p className="text-[10px] text-[var(--theme-card-subtitle)] leading-tight truncate">
                {detectedPattern.description}
              </p>
            </div>
          ) : (
            <div className="text-[11px] text-[var(--theme-card-subtitle)] mt-1 italic">
              No confirmed single-bar or dual-bar reversal pattern detected.
            </div>
          )}
        </div>

        {/* Metric 3: Greeks (For Options) or Basis (For Futures) */}
        {contractType !== 'FUTURES' && activeOptionContract ? (
          <div className="flex flex-col justify-between">
            <div className="text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase">
              OPTION GREEKS &amp; IV
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] mt-1">
              <div>
                <span className="text-slate-400">Delta (Δ): </span>
                <strong className="text-cyan-300">{activeOptionContract.greeks.delta.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Theta (Θ): </span>
                <strong className="text-fuchsia-300">{activeOptionContract.greeks.theta.toFixed(1)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Gamma (Γ): </span>
                <strong className="text-amber-300">{activeOptionContract.greeks.gamma.toFixed(4)}</strong>
              </div>
              <div>
                <span className="text-slate-400">IV: </span>
                <strong className="text-emerald-300">{activeOptionContract.impliedVolatility.toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-between">
            <div className="text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase">
              FUTURES CARRY &amp; BASIS
            </div>
            <div className="text-[12px] font-bold mt-1 space-y-0.5">
              <div>
                Basis: <strong className={basis >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{basis >= 0 ? '+' : ''}{basis}</strong>
              </div>
              <div className="text-[10.5px] text-slate-400">
                Annualized Cost-of-Carry: <strong className="text-sky-300">{((basis / liveSpot) * (365 / Math.max(1, chainData.daysToExpiry ?? 7)) * 100).toFixed(2)}%</strong>
              </div>
            </div>
          </div>
        )}

        {/* Metric 4: Value Breakdown & Builder Actions */}
        <div className="flex flex-col justify-between">
          <div className="text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase">
            VALUE COMPOSITION &amp; TRADE
          </div>
          {contractType !== 'FUTURES' && activeOptionContract ? (
            <div className="space-y-1 mt-0.5">
              <div className="flex justify-between text-[10.5px]">
                <span className="text-amber-300">Intrinsic: {curr}{intrinsicValue.toFixed(2)}</span>
                <span className="text-sky-300">Extrinsic: {curr}{extrinsicValue.toFixed(2)}</span>
              </div>
              {onAddLegToBuilder && (
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onAddLegToBuilder('BUY', contractType, selectedStrike, activeOptionContract.ltp, activeOptionContract.impliedVolatility, activeOptionContract.greeks);
                      onOpenBuilderTab?.();
                    }}
                    className="flex-1 py-1 px-2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black hover:bg-emerald-500 hover:text-slate-950 transition cursor-pointer"
                  >
                    + BUY TO BUILDER
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAddLegToBuilder('SELL', contractType, selectedStrike, activeOptionContract.ltp, activeOptionContract.impliedVolatility, activeOptionContract.greeks);
                      onOpenBuilderTab?.();
                    }}
                    className="flex-1 py-1 px-2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-black hover:bg-rose-500 hover:text-white transition cursor-pointer"
                  >
                    + SELL TO BUILDER
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 mt-1">
              Near Month Contract: {currentFuture?.expiry || selectedExpiry}
              <div className="text-[10px] text-slate-500 mt-0.5">
                Lot Size: {instrument.lotSize} · Step: {instrument.strikeStep}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Candlestick Chart Area ── */}
      {layoutMode === 'SINGLE' ? (
        /* ════ Single Chart Canvas ════ */
        <div className="rounded-2xl border border-[var(--theme-card-border)] overflow-hidden bg-white shadow-md">
          <OHLCVHeader
            symbol={activeContractLabel}
            candle={hoveredCandle || (activeCandles.length > 0 ? activeCandles[activeCandles.length - 1] : null)}
            currency={curr}
            timeframe={timeframe}
            currentPrice={hoveredCandle ? hoveredCandle.close : activeDisplayPrice}
          />
          <div className="h-[520px] w-full relative">
            <CandlestickCanvas
              candles={activeCandles}
              chartType="CANDLESTICK"
              showVolume={showVolume}
              showVolumePanel={showVolume}
              showSmcOverlay={false}
              showVolumeProfile={false}
              indicators={indicatorConfigs}
              indicatorResults={indicatorResults}
              currentPriceOverride={activeDisplayPrice}
              timeframe={timeframe}
              onHoverCandle={setHoveredCandle}
            />
          </div>
        </div>
      ) : (
        /* ════ Dual Split Chart (Futures Left, Option Strike Right) ════ */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Pane: Futures Candlestick Chart */}
          <div className="rounded-2xl border border-[var(--theme-card-border)] overflow-hidden bg-white shadow-md">
            <div className="px-3 py-1.5 bg-slate-900 text-white font-mono text-[11px] font-black flex items-center justify-between border-b border-slate-700">
              <span className="flex items-center gap-1.5 text-sky-300">
                <span>📈</span>
                <span>{instrument.symbol} FUTURES ({selectedExpiry})</span>
              </span>
              <span className="text-slate-300">
                Basis: {basis >= 0 ? '+' : ''}{basis}
              </span>
            </div>
            <OHLCVHeader
              symbol={`${instrument.symbol} FUT`}
              candle={hoveredFuturesCandle || (futuresCandles.length > 0 ? futuresCandles[futuresCandles.length - 1] : null)}
              currency={curr}
              timeframe={timeframe}
              currentPrice={hoveredFuturesCandle ? hoveredFuturesCandle.close : currentFuture?.ltp || liveSpot}
            />
            <div className="h-[460px] w-full relative">
              <CandlestickCanvas
                candles={futuresCandles}
                chartType="CANDLESTICK"
                showVolume={showVolume}
                showVolumePanel={showVolume}
                showSmcOverlay={false}
                showVolumeProfile={false}
                indicators={indicatorConfigs}
                indicatorResults={futuresIndicatorResults}
                currentPriceOverride={currentFuture?.ltp || liveSpot}
                timeframe={timeframe}
                onHoverCandle={setHoveredFuturesCandle}
              />
            </div>
          </div>

          {/* Right Pane: Option Strike Candlestick Chart */}
          <div className="rounded-2xl border border-[var(--theme-card-border)] overflow-hidden bg-white shadow-md">
            <div className="px-3 py-1.5 bg-slate-900 text-white font-mono text-[11px] font-black flex items-center justify-between border-b border-slate-700">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span>📊</span>
                <span>{instrument.symbol} {selectedStrike} {contractType}</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black">
                  {currentMoneyness}
                </span>
              </span>
              <span className="text-emerald-400">
                LTP: {curr}{activeOptionContract?.ltp.toFixed(2) || '0.00'}
              </span>
            </div>
            <OHLCVHeader
              symbol={`${selectedStrike} ${contractType}`}
              candle={hoveredCandle || (optionCandles.length > 0 ? optionCandles[optionCandles.length - 1] : null)}
              currency={curr}
              timeframe={timeframe}
              currentPrice={hoveredCandle ? hoveredCandle.close : activeOptionContract?.ltp || 0}
            />
            <div className="h-[460px] w-full relative">
              <CandlestickCanvas
                candles={optionCandles}
                chartType="CANDLESTICK"
                showVolume={showVolume}
                showVolumePanel={showVolume}
                showSmcOverlay={false}
                showVolumeProfile={false}
                indicators={indicatorConfigs}
                indicatorResults={indicatorResults}
                currentPriceOverride={activeOptionContract?.ltp || 0}
                timeframe={timeframe}
                onHoverCandle={setHoveredCandle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
