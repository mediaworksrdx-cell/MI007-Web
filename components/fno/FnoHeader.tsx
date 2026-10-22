// ─── F&O Terminal Market Header ─────────────────────────────────────────────
'use client';

import React, { useState } from 'react';
import { FnoInstrument, OptionChainData, FuturesTermStructure } from '@/lib/fno/fnoTypes';
import { SUPPORTED_FNO_INSTRUMENTS } from '@/lib/fno/fnoDataService';

interface FnoHeaderProps {
  selectedInstrument: FnoInstrument;
  onSelectInstrument: (inst: FnoInstrument) => void;
  selectedExpiry: string;
  onSelectExpiry: (expiry: string) => void;
  chainData: OptionChainData;
  termStructure: FuturesTermStructure;
  liveSpot?: number;
  engineConnected?: boolean;
}

export function FnoHeader({
  selectedInstrument,
  onSelectInstrument,
  selectedExpiry,
  onSelectExpiry,
  chainData,
  termStructure,
  liveSpot,
  engineConnected = true,
}: FnoHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displaySpot = liveSpot && liveSpot > 0 ? liveSpot : selectedInstrument.spotPrice;
  const isPositive = selectedInstrument.change >= 0;

  const currentFuture = termStructure.contracts[0];
  const basis = currentFuture ? Math.round((currentFuture.ltp - displaySpot) * 100) / 100 : 0;
  const isContango = basis >= 0;

  const filteredInstruments = SUPPORTED_FNO_INSTRUMENTS.filter(
    (i) =>
      i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const QUICK_SYMBOLS = ['NIFTY 50', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE', 'HDFCBANK', 'TCS', 'INFY'];

  return (
    <div className="relative z-30 mb-5 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3 sm:p-4 shadow-sm">
      {/* ── Top Bar: Quick Instrument Pills & Search ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-[var(--theme-card-border)]">
        {/* Quick Instrument Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider mr-1">
            DERIVATIVES:
          </span>
          {QUICK_SYMBOLS.map((sym) => {
            const isSelected = selectedInstrument.symbol === sym;
            const inst = SUPPORTED_FNO_INSTRUMENTS.find((i) => i.symbol === sym);
            return (
              <button
                key={sym}
                onClick={() => inst && onSelectInstrument(inst)}
                className={`px-2.5 py-1 rounded-lg text-[11px] mono font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-xs'
                    : 'bg-[var(--theme-card-subsurface)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] hover:border-emerald-500/30'
                }`}
              >
                {sym}
              </button>
            );
          })}
        </div>

        {/* Search Modal Trigger & Status */}
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="px-3 py-1 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] hover:border-emerald-500/50 text-[11px] mono font-bold text-[var(--theme-card-text)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>🔍 SEARCH F&O</span>
              <span className="text-[9px] px-1 py-0.2 bg-[var(--theme-card-border)] rounded text-[var(--theme-card-subtitle)]">
                {SUPPORTED_FNO_INSTRUMENTS.length}
              </span>
            </button>

            {/* Dropdown Menu */}
            {searchOpen && (
              <div className="absolute right-0 top-9 w-72 max-h-80 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1.5">
                <input
                  type="text"
                  placeholder="Filter F&O Stock/Index..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-[12px] mono text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500"
                />
                <div className="overflow-y-auto max-h-60 flex flex-col gap-1">
                  {filteredInstruments.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        onSelectInstrument(item);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/15 flex items-center justify-between text-[11.5px] mono text-[var(--theme-card-text)] transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-bold">{item.symbol}</div>
                        <div className="text-[10px] text-[var(--theme-card-subtitle)] truncate max-w-[170px]">
                          {item.name}
                        </div>
                      </div>
                      <span className="text-[10.5px] font-bold text-emerald-400">
                        ₹{item.spotPrice.toLocaleString('en-IN')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Connection Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] mono text-emerald-400 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>KITE CONNECT LIVE</span>
          </div>
        </div>
      </div>

      {/* ── Main Ticker & Primary Derivatives Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 pt-3.5 items-center">
        {/* Spot Price & Change */}
        <div className="col-span-2 sm:col-span-1">
          <div className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
            UNDERLYING SPOT
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="mono text-[20px] sm:text-[23px] font-black text-[var(--theme-card-text)] tracking-tight">
              ₹{displaySpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`mono text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                isPositive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {isPositive ? '+' : ''}
              {selectedInstrument.changePct.toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] mono text-[var(--theme-card-subtitle)] truncate">
            {selectedInstrument.name} · {selectedInstrument.exchange}
          </div>
        </div>

        {/* Expiry Selector */}
        <div>
          <label className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider block">
            ACTIVE EXPIRY
          </label>
          <select
            value={selectedExpiry}
            onChange={(e) => onSelectExpiry(e.target.value)}
            className="mt-1 w-full px-2 py-1.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-[12px] mono font-bold text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            {selectedInstrument.expiries.map((exp) => (
              <option key={exp} value={exp} className="bg-[var(--theme-card-surface)] text-[var(--theme-card-text)]">
                {exp}
              </option>
            ))}
          </select>
          <div className="text-[9.5px] mono text-[var(--theme-card-subtitle)] mt-0.5">
            Lot Size: <span className="font-bold text-[var(--theme-card-text)]">{selectedInstrument.lotSize}</span>
          </div>
        </div>

        {/* Futures Price & Basis */}
        <div>
          <div className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
            FUTURES (NEAR)
          </div>
          <div className="mono text-[15px] font-black text-[var(--theme-card-text)] mt-0.5">
            ₹{currentFuture?.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] mono font-bold flex items-center gap-1.5 mt-0.5">
            <span className={isContango ? 'text-emerald-400' : 'text-rose-400'}>
              Basis: {basis >= 0 ? '+' : ''}{basis}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--theme-card-subsurface)] text-[var(--theme-card-subtitle)]">
              {isContango ? 'Contango' : 'Backwardation'}
            </span>
          </div>
        </div>

        {/* Put-Call Ratio (PCR) */}
        <div>
          <div className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
            PUT-CALL RATIO (OI)
          </div>
          <div className="mono text-[16px] font-black mt-0.5 flex items-center gap-1.5">
            <span
              className={
                chainData.pcr >= 1.2
                  ? 'text-emerald-400'
                  : chainData.pcr <= 0.8
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }
            >
              {chainData.pcr.toFixed(2)}
            </span>
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                chainData.pcr >= 1.2
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : chainData.pcr <= 0.8
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {chainData.pcr >= 1.2 ? 'BULLISH' : chainData.pcr <= 0.8 ? 'BEARISH' : 'NEUTRAL'}
            </span>
          </div>
          <div className="text-[9.5px] mono text-[var(--theme-card-subtitle)] mt-0.5">
            CE: {(chainData.totalCallOI / 100000).toFixed(1)}L · PE: {(chainData.totalPutOI / 100000).toFixed(1)}L
          </div>
        </div>

        {/* Max Pain Strike */}
        <div>
          <div className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
            MAX PAIN STRIKE
          </div>
          <div className="mono text-[16px] font-black text-amber-400 mt-0.5">
            ₹{chainData.maxPain.toLocaleString('en-IN')}
          </div>
          <div className="text-[9.5px] mono text-[var(--theme-card-subtitle)] mt-0.5">
            Diff: {chainData.maxPain - displaySpot >= 0 ? '+' : ''}
            {(chainData.maxPain - displaySpot).toFixed(1)} pts
          </div>
        </div>

        {/* OI Magnets (Support / Resistance) */}
        <div>
          <div className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
            OI MAGNET LEVELS
          </div>
          <div className="text-[11px] mono font-bold flex items-center justify-between mt-1">
            <span className="text-rose-400">RES: ₹{chainData.highestCallOIStrike}</span>
          </div>
          <div className="text-[11px] mono font-bold flex items-center justify-between mt-0.5">
            <span className="text-emerald-400">SUP: ₹{chainData.highestPutOIStrike}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
