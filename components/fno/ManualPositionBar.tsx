// ─── 2026 Floating Command Bar for Position Entry ───────────────────────────
'use client';

import React, { useState, useMemo } from 'react';
import { StrategyLeg, TradeAction, InstrumentType, FnoInstrument } from '@/lib/fno/fnoTypes';
import { calculateBSPrice, calculateBSGreeks } from '@/lib/fno/blackScholes';

interface ManualPositionBarProps {
  instrument: FnoInstrument;
  spotPrice: number;
  selectedExpiry: string;
  onAddLeg: (leg: StrategyLeg) => void;
}

export function ManualPositionBar({
  instrument,
  spotPrice,
  selectedExpiry,
  onAddLeg,
}: ManualPositionBarProps) {
  const [segment, setSegment] = useState<'OPTIONS' | 'FUTURES'>('OPTIONS');
  const [expiry, setExpiry] = useState<string>(selectedExpiry || instrument.currentExpiry);
  const [action, setAction] = useState<TradeAction>('BUY');
  const [optionType, setOptionType] = useState<'CE' | 'PE'>('CE');
  const [lots, setLots] = useState<number>(1);

  const atmStrike = Math.round(spotPrice / instrument.strikeStep) * instrument.strikeStep;
  const [strike, setStrike] = useState<number>(atmStrike);

  // Available strikes
  const availableStrikes = useMemo(() => {
    const list: number[] = [];
    for (let i = -12; i <= 12; i++) {
      list.push(atmStrike + i * instrument.strikeStep);
    }
    return list;
  }, [atmStrike, instrument.strikeStep]);

  // Estimated Price
  const estimatedPrice = useMemo(() => {
    if (segment === 'FUTURES') return spotPrice;
    const timeYears = 7 / 365.0;
    const moneyness = (strike - spotPrice) / spotPrice;
    const iv = Math.max(0.08, 0.145 + (optionType === 'PE' ? -moneyness * 0.12 : moneyness * 0.05));
    const price = calculateBSPrice(optionType, {
      spot: spotPrice,
      strike,
      timeYears,
      volatility: iv,
    });
    return Math.max(0.05, Math.round(price * 20) / 20);
  }, [segment, spotPrice, strike, optionType]);

  const handleAdd = () => {
    const instrumentType: InstrumentType = segment === 'FUTURES' ? 'FUT' : optionType;
    let greeks = { delta: 1.0, gamma: 0, theta: 0, vega: 0, rho: 0 };

    if (segment === 'OPTIONS') {
      const timeYears = 7 / 365.0;
      greeks = calculateBSGreeks(optionType, {
        spot: spotPrice,
        strike,
        timeYears,
        volatility: 0.145,
      });
    }

    const newLeg: StrategyLeg = {
      id: `manual-leg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      instrument: instrumentType,
      strike: segment === 'FUTURES' ? spotPrice : strike,
      expiry,
      lots,
      lotSize: instrument.lotSize,
      entryPrice: estimatedPrice,
      currentPrice: estimatedPrice,
      iv: 14.5,
      greeks,
      disabled: false,
    };

    onAddLeg(newLeg);
  };

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-2xl relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        {/* 1. Segment Toggle (Options vs Futures) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setSegment('OPTIONS')}
            className={`px-3.5 py-1.5 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              segment === 'OPTIONS'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Options
          </button>
          <button
            type="button"
            onClick={() => setSegment('FUTURES')}
            className={`px-3.5 py-1.5 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              segment === 'FUTURES'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Futures
          </button>
        </div>

        {/* 2. Expiry Selector with custom styling */}
        <div className="flex items-center gap-1.5">
          <span className="mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            EXPIRY:
          </span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 mono text-[11.5px] font-black text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer shadow-inner"
          >
            {instrument.expiries.map((exp) => (
              <option key={exp} value={exp} className="bg-slate-900 text-white">
                {exp}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Buy / Sell Segmented Pill */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setAction('BUY')}
            className={`px-3 py-1 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              action === 'BUY'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setAction('SELL')}
            className={`px-3 py-1 rounded-lg mono text-[11px] font-black transition-all cursor-pointer ${
              action === 'SELL'
                ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            SELL
          </button>
        </div>

        {/* 4. Strike & Type (If Options) */}
        {segment === 'OPTIONS' ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                STRIKE:
              </span>
              <select
                value={strike}
                onChange={(e) => setStrike(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 mono text-[11.5px] font-black text-cyan-400 focus:outline-hidden focus:border-cyan-500 cursor-pointer shadow-inner"
              >
                {availableStrikes.map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-white">
                    {s} {s === atmStrike ? '(ATM ★)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setOptionType('CE')}
                className={`px-2.5 py-1 rounded-lg mono text-[10.5px] font-black cursor-pointer transition-all ${
                  optionType === 'CE'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CE
              </button>
              <button
                type="button"
                onClick={() => setOptionType('PE')}
                className={`px-2.5 py-1 rounded-lg mono text-[10.5px] font-black cursor-pointer transition-all ${
                  optionType === 'PE'
                    ? 'bg-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                PE
              </button>
            </div>
          </div>
        ) : (
          <span className="mono text-[11px] font-black text-amber-400 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            FUT: ₹{spotPrice.toLocaleString('en-IN')}
          </span>
        )}

        {/* 5. Lot Stepper */}
        <div className="flex items-center gap-1.5">
          <span className="mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            LOTS:
          </span>
          <div className="flex items-center rounded-xl bg-slate-900/90 border border-white/10 p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => setLots((q) => Math.max(1, q - 1))}
              className="w-7 h-6 flex items-center justify-center mono font-black text-[13px] text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              -
            </button>
            <span className="w-7 text-center mono text-[12px] font-black text-white">
              {lots}
            </span>
            <button
              type="button"
              onClick={() => setLots((q) => q + 1)}
              className="w-7 h-6 flex items-center justify-center mono font-black text-[13px] text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              +
            </button>
          </div>
          <span className="mono text-[10px] text-slate-400 hidden xl:inline">
            ({lots * instrument.lotSize} qty)
          </span>
        </div>

        {/* 6. Estimated LTP */}
        <div className="flex items-center gap-1 mono text-[11.5px] px-2.5 py-1 rounded-xl bg-slate-900/60 border border-white/5">
          <span className="text-slate-400 font-bold">LTP:</span>
          <span className="font-black text-emerald-400">
            ₹{estimatedPrice.toFixed(2)}
          </span>
        </div>

        {/* 7. Radiant CTA Button */}
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 rounded-xl mono text-[11.5px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all cursor-pointer shadow-md"
        >
          + ADD POSITION
        </button>
      </div>
    </div>
  );
}
