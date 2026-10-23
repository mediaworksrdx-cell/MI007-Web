// ─── F&O Terminal Market Header ─────────────────────────────────────────────
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FnoInstrument, OptionChainData, FuturesTermStructure } from '@/lib/fno/fnoTypes';
import { SUPPORTED_FNO_INSTRUMENTS, searchFnoInstruments } from '@/lib/fno/fnoDataService';
import { FnoEngineStatus } from '@/lib/fno/fnoTwelveDataEngine';

interface FnoHeaderProps {
  selectedInstrument: FnoInstrument;
  onSelectInstrument: (inst: FnoInstrument) => void;
  selectedExpiry: string;
  onSelectExpiry: (expiry: string) => void;
  chainData: OptionChainData;
  weeklyChainData?: OptionChainData | null;
  monthlyChainData?: OptionChainData | null;
  weeklyExpiry?: string;
  monthlyExpiry?: string;
  termStructure: FuturesTermStructure;
  liveSpot?: number;
  liveChange?: number;
  liveChangePct?: number;
  engineConnected?: boolean;
  fnoEngineStatus?: FnoEngineStatus | null;
}

export function FnoHeader({
  selectedInstrument,
  onSelectInstrument,
  selectedExpiry,
  onSelectExpiry,
  chainData,
  weeklyChainData,
  monthlyChainData,
  weeklyExpiry,
  monthlyExpiry,
  termStructure,
  liveSpot,
  liveChange,
  liveChangePct,
  engineConnected = true,
  fnoEngineStatus,
}: FnoHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [metricMode, setMetricMode] = useState<'DUAL' | 'ACTIVE'>('DUAL');

  const wkExp = weeklyExpiry || selectedInstrument.expiries[0] || selectedExpiry;
  const moExp = monthlyExpiry || (selectedInstrument.expiries.length >= 3 ? selectedInstrument.expiries[2] : (selectedInstrument.expiries[1] || selectedInstrument.expiries[0] || selectedExpiry));

  const wkData = weeklyChainData || chainData;
  const moData = monthlyChainData || chainData;

  const displaySpot = liveSpot && liveSpot > 0 ? liveSpot : selectedInstrument.spotPrice;
  const displayChange = liveChange !== undefined ? liveChange : selectedInstrument.change;
  const displayChangePct = liveChangePct !== undefined ? liveChangePct : selectedInstrument.changePct;
  const isPositive = displayChange >= 0;

  const currentFuture = termStructure.contracts[0];
  const basis = currentFuture ? Math.round((currentFuture.ltp - displaySpot) * 100) / 100 : 0;
  const isContango = basis >= 0;

  const curr = selectedInstrument.market === 'USA' ? '$' : selectedInstrument.market === 'UAE' ? 'AED ' : '₹';
  const loc = selectedInstrument.market === 'INDIA' ? 'en-IN' : 'en-US';

  const marketInstruments = useMemo(() => {
    return SUPPORTED_FNO_INSTRUMENTS.filter((i) => i.market === selectedInstrument.market);
  }, [selectedInstrument.market]);

  const quickInstruments = useMemo(() => {
    return marketInstruments.slice(0, 7);
  }, [marketInstruments]);

  const filteredInstruments = useMemo(() => {
    return searchFnoInstruments(searchQuery, selectedInstrument.market, 60);
  }, [searchQuery, selectedInstrument.market]);

  return (
    <div className="relative z-30 mb-5 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3 sm:p-4 shadow-sm">
      {/* ── Top Bar: Quick Instrument Pills & Search ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-[var(--theme-card-border)]">
        {/* Quick Instrument Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider mr-1">
            DERIVATIVES:
          </span>
          {quickInstruments.map((inst) => {
            const isSelected = selectedInstrument.symbol === inst.symbol;
            return (
              <button
                key={inst.symbol}
                onClick={() => onSelectInstrument(inst)}
                className={`px-3 py-1.5 rounded-lg text-[11px] mono font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'bg-[var(--theme-card-subsurface)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] hover:border-emerald-500/40 hover:text-emerald-400'
                }`}
              >
                {inst.symbol}
              </button>
            );
          })}
        </div>

        {/* Real-time Integrated Search Bar & Dedicated F&O Engine Indicator */}
        <div className="flex items-center gap-2.5 relative flex-1 sm:flex-initial" ref={searchRef}>
          {/* Engine Status Badge: Kite Connect for Indian assets, Twelve Data for US/Global */}
          {selectedInstrument.market === 'INDIA' ? (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--theme-card-subsurface)] border border-emerald-500/30 cursor-default select-none shadow-xs"
              title="Indian F&O Market Engine: Zerodha Kite Connect WebSocket & REST Feed (138.91.105.85)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] mono font-extrabold text-emerald-400">
                KITE CONNECT
              </span>
              <span className="text-[8.5px] mono px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                LIVE
              </span>
            </div>
          ) : (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] cursor-default select-none shadow-xs"
              title={`Isolated F&O Engine: ${fnoEngineStatus?.isVentureReady ? 'Venture Ready' : 'Active'} • Plan: ${fnoEngineStatus?.plan || 'Isolated'} • Calls Limit: ${fnoEngineStatus?.callsPerMinuteLimit || 8}/min`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] mono font-extrabold text-cyan-400">
                {fnoEngineStatus?.isVentureReady ? '12DATA VENTURE READY' : '12DATA FNO'}
              </span>
              <span className="text-[8.5px] mono px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30">
                ISOLATED
              </span>
            </div>
          )}

          <div className="relative w-full sm:w-72 md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--theme-card-subtitle)] pointer-events-none">
              🔍
            </span>
            <input
              ref={inputRef}
              type="text"
              placeholder={
                selectedInstrument.market === 'INDIA'
                  ? 'Search 3,800+ Zerodha Kite & NSE F&O assets... (Press /)'
                  : `Search ${selectedInstrument.market} Derivatives... (Press /)`
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              className="w-full pl-8 pr-16 py-1.5 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] hover:border-emerald-500/50 focus:border-emerald-500 text-[11.5px] mono font-bold text-[var(--theme-card-text)] placeholder-[var(--theme-card-subtitle)] focus:outline-hidden transition-all shadow-xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)] px-1 cursor-pointer"
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9.5px] px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-subtitle)] pointer-events-none font-mono">
                /
              </span>
            )}

            {/* Autocomplete Dropdown */}
            {searchOpen && (
              <div className="absolute right-0 top-10 w-full sm:w-88 max-h-80 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md">
                <div className="px-2 py-1 text-[9.5px] mono font-bold text-[var(--theme-card-subtitle)] uppercase border-b border-[var(--theme-card-border)] flex items-center justify-between">
                  <span>
                    {selectedInstrument.market === 'INDIA'
                      ? 'INDIA F&O UNIVERSE (3,800+ KITE EQUITIES)'
                      : `${selectedInstrument.market} F&O UNIVERSE`}
                  </span>
                  <span>{filteredInstruments.length} RESULTS</span>
                </div>
                <div className="overflow-y-auto max-h-64 flex flex-col gap-0.5 no-scrollbar">
                  {filteredInstruments.length === 0 ? (
                    <div className="text-center py-6 text-[11px] mono text-[var(--theme-card-subtitle)]">
                      No matching F&amp;O symbols found.
                    </div>
                  ) : (
                    filteredInstruments.map((item) => {
                      const isItemActive = selectedInstrument.symbol === item.symbol;
                      return (
                        <button
                          key={item.symbol}
                          type="button"
                          onClick={() => {
                            onSelectInstrument(item);
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11.5px] mono transition-colors cursor-pointer ${
                            isItemActive
                              ? 'bg-emerald-500/20 text-emerald-400 font-black'
                              : 'hover:bg-emerald-500/10 text-[var(--theme-card-text)]'
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{item.symbol}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--theme-card-subsurface)] text-[var(--theme-card-subtitle)] font-normal">
                                {item.exchange} · Lot {item.lotSize}
                              </span>
                              {item.isZerodha && (
                                <span className="text-[8.5px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold tracking-wide">
                                  KITE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--theme-card-subtitle)] truncate max-w-[190px]">
                              {item.name} · {item.sector}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-bold text-emerald-400">
                              {item.market === 'USA' ? '$' : item.market === 'UAE' ? 'AED ' : '₹'}{item.spotPrice.toLocaleString(item.market === 'INDIA' ? 'en-IN' : 'en-US')}
                            </div>
                            <div
                              className={`text-[9.5px] font-bold ${
                                item.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
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
              {curr}{displaySpot.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`mono text-[11px] font-extrabold px-1.5 py-0.5 rounded ${
                isPositive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {isPositive ? '+' : ''}
              {displayChangePct.toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] mono text-[var(--theme-card-subtitle)] truncate">
            {selectedInstrument.name} · {selectedInstrument.exchange}
          </div>
        </div>

        {/* Expiry Selector */}
        <div>
          <div className="flex items-center justify-between">
            <label className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider block">
              ACTIVE EXPIRY
            </label>
            <span className="text-[8.5px] mono font-bold text-emerald-400">
              {selectedExpiry === wkExp ? 'WK' : selectedExpiry === moExp ? 'MO' : 'CYCLE'}
            </span>
          </div>
          <select
            value={selectedExpiry}
            onChange={(e) => onSelectExpiry(e.target.value)}
            className="mt-1 w-full px-2 py-1.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-[12px] mono font-bold text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            {selectedInstrument.expiries.map((exp) => {
              const tag = exp === wkExp ? ' • Weekly' : exp === moExp ? ' • Monthly' : '';
              return (
                <option key={exp} value={exp} className="bg-[var(--theme-card-surface)] text-[var(--theme-card-text)]">
                  {exp}{tag}
                </option>
              );
            })}
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
            {curr}{currentFuture?.ltp.toLocaleString(loc, { minimumFractionDigits: 2 })}
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

        {/* Put-Call Ratio (PCR) with Dual Weekly vs Monthly view */}
        <div>
          <div className="flex items-center justify-between">
            <div className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
              PUT-CALL RATIO (OI)
            </div>
            <button
              type="button"
              onClick={() => setMetricMode((m) => (m === 'DUAL' ? 'ACTIVE' : 'DUAL'))}
              className="text-[8px] mono font-extrabold px-1.5 py-0.2 rounded bg-[var(--theme-card-subsurface)] text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 transition cursor-pointer"
              title="Toggle between Dual (Weekly + Monthly) and Active Expiry view"
            >
              {metricMode === 'DUAL' ? 'DUAL: WK & MO' : 'ACTIVE ONLY'}
            </button>
          </div>

          {metricMode === 'DUAL' ? (
            <div className="mt-1 space-y-1">
              {/* Weekly PCR */}
              <div
                onClick={() => onSelectExpiry(wkExp)}
                className={`px-1.5 py-0.8 rounded text-[11px] mono flex items-center justify-between cursor-pointer transition border ${
                  selectedExpiry === wkExp
                    ? 'bg-amber-500/10 border-amber-500/40 text-[var(--theme-card-text)]'
                    : 'bg-[var(--theme-card-subsurface)]/60 border-transparent hover:border-amber-500/30 text-[var(--theme-card-subtitle)]'
                }`}
                title={`Click to switch option chain to Weekly (${wkExp})`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-black px-1 py-0.2 rounded bg-amber-500/20 text-amber-400">WK</span>
                  <span className={`font-black ${wkData.pcr >= 1.2 ? 'text-emerald-400' : wkData.pcr <= 0.8 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {wkData.pcr.toFixed(2)}
                  </span>
                  <span className="text-[7.5px] font-bold px-1 rounded bg-[var(--theme-card-subsurface)]">
                    {wkData.pcr >= 1.2 ? 'BULL' : wkData.pcr <= 0.8 ? 'BEAR' : 'NEUT'}
                  </span>
                </div>
                <span className="text-[8.5px]">
                  {(wkData.totalCallOI / 100000).toFixed(1)}L / {(wkData.totalPutOI / 100000).toFixed(1)}L
                </span>
              </div>

              {/* Monthly PCR */}
              <div
                onClick={() => onSelectExpiry(moExp)}
                className={`px-1.5 py-0.8 rounded text-[11px] mono flex items-center justify-between cursor-pointer transition border ${
                  selectedExpiry === moExp
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-[var(--theme-card-text)]'
                    : 'bg-[var(--theme-card-subsurface)]/60 border-transparent hover:border-indigo-500/30 text-[var(--theme-card-subtitle)]'
                }`}
                title={`Click to switch option chain to Monthly (${moExp})`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-black px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400">MO</span>
                  <span className={`font-black ${moData.pcr >= 1.2 ? 'text-emerald-400' : moData.pcr <= 0.8 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {moData.pcr.toFixed(2)}
                  </span>
                  <span className="text-[7.5px] font-bold px-1 rounded bg-[var(--theme-card-subsurface)]">
                    {moData.pcr >= 1.2 ? 'BULL' : moData.pcr <= 0.8 ? 'BEAR' : 'NEUT'}
                  </span>
                </div>
                <span className="text-[8.5px]">
                  {(moData.totalCallOI / 100000).toFixed(1)}L / {(moData.totalPutOI / 100000).toFixed(1)}L
                </span>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Max Pain Strike with Dual Weekly vs Monthly view */}
        <div>
          <div className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
            MAX PAIN STRIKE
          </div>

          {metricMode === 'DUAL' ? (
            <div className="mt-1 space-y-1">
              {/* Weekly Max Pain */}
              <div
                onClick={() => onSelectExpiry(wkExp)}
                className={`px-1.5 py-0.8 rounded text-[11px] mono flex items-center justify-between cursor-pointer transition border ${
                  selectedExpiry === wkExp
                    ? 'bg-amber-500/10 border-amber-500/40 text-[var(--theme-card-text)]'
                    : 'bg-[var(--theme-card-subsurface)]/60 border-transparent hover:border-amber-500/30 text-[var(--theme-card-subtitle)]'
                }`}
                title={`Weekly (${wkExp}) Max Pain`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-black px-1 py-0.2 rounded bg-amber-500/20 text-amber-400">WK</span>
                  <span className="font-black text-amber-400">
                    {curr}{wkData.maxPain.toLocaleString(loc)}
                  </span>
                </div>
                <span className="text-[8.5px]">
                  {wkData.maxPain - displaySpot >= 0 ? '+' : ''}{(wkData.maxPain - displaySpot).toFixed(1)} pts
                </span>
              </div>

              {/* Monthly Max Pain */}
              <div
                onClick={() => onSelectExpiry(moExp)}
                className={`px-1.5 py-0.8 rounded text-[11px] mono flex items-center justify-between cursor-pointer transition border ${
                  selectedExpiry === moExp
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-[var(--theme-card-text)]'
                    : 'bg-[var(--theme-card-subsurface)]/60 border-transparent hover:border-indigo-500/30 text-[var(--theme-card-subtitle)]'
                }`}
                title={`Monthly (${moExp}) Max Pain`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[8.5px] font-black px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400">MO</span>
                  <span className="font-black text-indigo-400">
                    {curr}{moData.maxPain.toLocaleString(loc)}
                  </span>
                </div>
                <span className="text-[8.5px]">
                  {moData.maxPain - displaySpot >= 0 ? '+' : ''}{(moData.maxPain - displaySpot).toFixed(1)} pts
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="mono text-[16px] font-black text-amber-400 mt-0.5">
                {curr}{chainData.maxPain.toLocaleString(loc)}
              </div>
              <div className="text-[9.5px] mono text-[var(--theme-card-subtitle)] mt-0.5">
                Diff: {chainData.maxPain - displaySpot >= 0 ? '+' : ''}
                {(chainData.maxPain - displaySpot).toFixed(1)} pts
              </div>
            </>
          )}
        </div>

        {/* OI Magnets (Support / Resistance) with Dual Weekly vs Monthly view */}
        <div>
          <div className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
            OI MAGNET LEVELS
          </div>

          {metricMode === 'DUAL' ? (
            <div className="mt-1 space-y-1">
              {/* Weekly Magnets */}
              <div
                onClick={() => onSelectExpiry(wkExp)}
                className={`px-1.5 py-0.8 rounded text-[10px] mono font-bold flex items-center justify-between cursor-pointer transition border ${
                  selectedExpiry === wkExp
                    ? 'bg-amber-500/10 border-amber-500/40 text-[var(--theme-card-text)]'
                    : 'bg-[var(--theme-card-subsurface)]/60 border-transparent hover:border-amber-500/30 text-[var(--theme-card-subtitle)]'
                }`}
                title={`Weekly (${wkExp}) Magnets`}
              >
                <span className="text-[8.5px] font-black px-1 py-0.2 rounded bg-amber-500/20 text-amber-400">WK</span>
                <span className="text-rose-400">R: {curr}{wkData.highestCallOIStrike.toLocaleString(loc)}</span>
                <span className="text-emerald-400">S: {curr}{wkData.highestPutOIStrike.toLocaleString(loc)}</span>
              </div>

              {/* Monthly Magnets */}
              <div
                onClick={() => onSelectExpiry(moExp)}
                className={`px-1.5 py-0.8 rounded text-[10px] mono font-bold flex items-center justify-between cursor-pointer transition border ${
                  selectedExpiry === moExp
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-[var(--theme-card-text)]'
                    : 'bg-[var(--theme-card-subsurface)]/60 border-transparent hover:border-indigo-500/30 text-[var(--theme-card-subtitle)]'
                }`}
                title={`Monthly (${moExp}) Magnets`}
              >
                <span className="text-[8.5px] font-black px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400">MO</span>
                <span className="text-rose-400">R: {curr}{moData.highestCallOIStrike.toLocaleString(loc)}</span>
                <span className="text-emerald-400">S: {curr}{moData.highestPutOIStrike.toLocaleString(loc)}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="text-[11px] mono font-bold flex items-center justify-between mt-1">
                <span className="text-rose-400">RES: {curr}{chainData.highestCallOIStrike.toLocaleString(loc)}</span>
              </div>
              <div className="text-[11px] mono font-bold flex items-center justify-between mt-0.5">
                <span className="text-emerald-400">SUP: {curr}{chainData.highestPutOIStrike.toLocaleString(loc)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
