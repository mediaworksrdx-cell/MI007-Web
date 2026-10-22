// ─── Manual Position Entry Bar (Opstra Definedge Compatible) ─────────────────
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
    <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3 sm:p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Segment Toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
          <button
            type="button"
            onClick={() => setSegment('OPTIONS')}
            className={`px-3 py-1 rounded-md mono text-[11px] font-bold transition-all cursor-pointer ${
              segment === 'OPTIONS'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                : 'text-[var(--theme-card-subtitle)] hover:text-white'
            }`}
          >
            Options
          </button>
          <button
            type="button"
            onClick={() => setSegment('FUTURES')}
            className={`px-3 py-1 rounded-md mono text-[11px] font-bold transition-all cursor-pointer ${
              segment === 'FUTURES'
                ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                : 'text-[var(--theme-card-subtitle)] hover:text-white'
            }`}
          >
            Futures
          </button>
        </div>

        {/* Expiry Selector */}
        <div className="flex items-center gap-1.5">
          <span className="mono text-[10px] uppercase font-bold text-[var(--theme-card-subtitle)]">
            Expiry:
          </span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] mono text-[11.5px] font-bold text-[var(--theme-card-text)] focus:outline-hidden cursor-pointer"
          >
            {instrument.expiries.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
        </div>

        {/* Buy / Sell Radio */}
        <div className="flex items-center gap-2 mono text-[11px] font-black">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="action-radio"
              checked={action === 'BUY'}
              onChange={() => setAction('BUY')}
              className="accent-emerald-500 cursor-pointer"
            />
            <span className={action === 'BUY' ? 'text-emerald-400' : 'text-[var(--theme-card-subtitle)]'}>
              Buy
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="action-radio"
              checked={action === 'SELL'}
              onChange={() => setAction('SELL')}
              className="accent-rose-500 cursor-pointer"
            />
            <span className={action === 'SELL' ? 'text-rose-400' : 'text-[var(--theme-card-subtitle)]'}>
              Sell
            </span>
          </label>
        </div>

        {/* Strike & Type (If Options) */}
        {segment === 'OPTIONS' ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="mono text-[10px] uppercase font-bold text-[var(--theme-card-subtitle)]">
                Strike:
              </span>
              <select
                value={strike}
                onChange={(e) => setStrike(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] mono text-[11.5px] font-black text-[var(--theme-card-text)] focus:outline-hidden cursor-pointer"
              >
                {availableStrikes.map((s) => (
                  <option key={s} value={s}>
                    {s} {s === atmStrike ? '(ATM)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center p-0.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
              <button
                type="button"
                onClick={() => setOptionType('CE')}
                className={`px-2.5 py-0.5 rounded mono text-[10.5px] font-black cursor-pointer transition-colors ${
                  optionType === 'CE'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-[var(--theme-card-subtitle)]'
                }`}
              >
                CE
              </button>
              <button
                type="button"
                onClick={() => setOptionType('PE')}
                className={`px-2.5 py-0.5 rounded mono text-[10.5px] font-black cursor-pointer transition-colors ${
                  optionType === 'PE'
                    ? 'bg-rose-500 text-slate-950'
                    : 'text-[var(--theme-card-subtitle)]'
                }`}
              >
                PE
              </button>
            </div>
          </div>
        ) : (
          <span className="mono text-[11px] font-bold text-amber-400">
            FUT Price: ₹{spotPrice.toLocaleString('en-IN')}
          </span>
        )}

        {/* Lot Qty Stepper */}
        <div className="flex items-center gap-1.5">
          <span className="mono text-[10px] uppercase font-bold text-[var(--theme-card-subtitle)]">
            Lots:
          </span>
          <div className="flex items-center rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
            <button
              type="button"
              onClick={() => setLots((q) => Math.max(1, q - 1))}
              className="w-6 h-6 flex items-center justify-center mono font-black text-[12px] text-[var(--theme-card-subtitle)] hover:text-white cursor-pointer"
            >
              -
            </button>
            <span className="w-6 text-center mono text-[11px] font-black">
              {lots}
            </span>
            <button
              type="button"
              onClick={() => setLots((q) => q + 1)}
              className="w-6 h-6 flex items-center justify-center mono font-black text-[12px] text-[var(--theme-card-subtitle)] hover:text-white cursor-pointer"
            >
              +
            </button>
          </div>
          <span className="mono text-[10px] text-[var(--theme-card-subtitle)]">
            ({lots * instrument.lotSize} qty)
          </span>
        </div>

        {/* Estimated Price */}
        <div className="flex items-center gap-1 mono text-[11px]">
          <span className="text-[var(--theme-card-subtitle)] font-bold">LTP:</span>
          <span className="font-black text-[var(--theme-card-text)]">
            ₹{estimatedPrice.toFixed(2)}
          </span>
        </div>

        {/* Add Button */}
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-1.5 rounded-lg mono text-[11px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer shadow-xs"
        >
          + ADD POSITION
        </button>
      </div>
    </div>
  );
}
