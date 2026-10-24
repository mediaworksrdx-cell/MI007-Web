// ─── Exact Opstra Definedge Manual Position Adder (Image 2) ──────────────────
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
    let greeks: StrategyLeg['greeks'] = { delta: 1.0, gamma: 0, theta: 0, vega: 0, rho: 0 };

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
    <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Segment Dropdown */}
        <div className="flex flex-col">
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value as any)}
            className="text-[13px] font-bold text-slate-800 border-b-2 border-slate-300 pb-0.5 bg-transparent focus:outline-hidden focus:border-[#4CAF50] cursor-pointer"
          >
            <option value="OPTIONS">Options</option>
            <option value="FUTURES">Futures</option>
          </select>
          <span className="text-[9.5px] text-slate-400 mt-0.5">Select Segment</span>
        </div>

        {/* Expiry Dropdown */}
        <div className="flex flex-col">
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="text-[13px] font-bold text-slate-800 border-b-2 border-slate-300 pb-0.5 bg-transparent focus:outline-hidden focus:border-[#4CAF50] cursor-pointer"
          >
            {instrument.expiries.map((exp) => (
              <option key={exp} value={exp}>
                {exp}
              </option>
            ))}
          </select>
          <span className="text-[9.5px] text-slate-400 mt-0.5">Select Expiry</span>
        </div>

        {/* Buy / Sell Radio */}
        <div className="flex items-center gap-3 text-[12px] font-semibold text-slate-700">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="opstra-action"
              checked={action === 'BUY'}
              onChange={() => setAction('BUY')}
              className="accent-[#4CAF50] cursor-pointer w-3.5 h-3.5"
            />
            <span>Buy</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="opstra-action"
              checked={action === 'SELL'}
              onChange={() => setAction('SELL')}
              className="accent-[#F44336] cursor-pointer w-3.5 h-3.5"
            />
            <span>Sell</span>
          </label>
        </div>

        {/* Strike & Option Type (If Options) */}
        {segment === 'OPTIONS' && (
          <>
            <div className="flex flex-col">
              <select
                value={strike}
                onChange={(e) => setStrike(Number(e.target.value))}
                className="text-[13px] font-bold text-slate-800 border-b-2 border-slate-300 pb-0.5 bg-transparent focus:outline-hidden focus:border-[#4CAF50] cursor-pointer"
              >
                {availableStrikes.map((s) => (
                  <option key={s} value={s}>
                    {s} {s === atmStrike ? '(ATM)' : ''}
                  </option>
                ))}
              </select>
              <span className="text-[9.5px] text-slate-400 mt-0.5">Select Strike</span>
            </div>

            <div className="flex flex-col">
              <select
                value={optionType}
                onChange={(e) => setOptionType(e.target.value as any)}
                className="text-[13px] font-bold text-slate-800 border-b-2 border-slate-300 pb-0.5 bg-transparent focus:outline-hidden focus:border-[#4CAF50] cursor-pointer"
              >
                <option value="CE">CE</option>
                <option value="PE">PE</option>
              </select>
              <span className="text-[9.5px] text-slate-400 mt-0.5">Option Type</span>
            </div>
          </>
        )}

        {/* Lot Qty Stepper */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-slate-600">Lot Qty.</span>
          <div className="flex items-center border border-slate-300 rounded-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setLots((q) => Math.max(1, q - 1))}
              className="px-2.5 py-0.5 bg-slate-50 text-slate-600 hover:bg-slate-100 text-[13px] font-bold cursor-pointer"
            >
              -
            </button>
            <span className="px-3 py-0.5 text-[12px] font-bold text-slate-800 border-x border-slate-300 min-w-[28px] text-center">
              {lots}
            </span>
            <button
              type="button"
              onClick={() => setLots((q) => q + 1)}
              className="px-2.5 py-0.5 bg-slate-50 text-slate-600 hover:bg-slate-100 text-[13px] font-bold cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Price display in red */}
        <div className="text-[12px] font-semibold text-slate-700">
          <span>{segment === 'FUTURES' ? 'Futures Price: ' : 'LTP: '}</span>
          <span className="text-[#D32F2F] font-bold">
            {estimatedPrice.toFixed(2)}
          </span>
        </div>

        {/* Dark Blue-Slate [ ADD POSITION ] Button */}
        <button
          type="button"
          onClick={handleAdd}
          className="bg-[#455A64] hover:bg-[#37474F] text-white font-bold text-[11px] px-5 py-2 rounded-sm transition-colors cursor-pointer uppercase tracking-wider shadow-xs"
        >
          ADD POSITION
        </button>
      </div>
    </div>
  );
}
