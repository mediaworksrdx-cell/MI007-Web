// ─── 4-Quadrant Institutional Derivatives Buildup Scanner ────────────────────
'use client';

import React, { useState, useMemo } from 'react';
import { BuildupRecord, BuildupType, FnoInstrument } from '@/lib/fno/fnoTypes';
import { getBuildupScannerData, findFnoInstrument } from '@/lib/fno/fnoDataService';
import { MarketType } from '@/lib/types';
import { useTradeEngine } from '@/lib/tradeEngineContext';

interface BuildupScannerTabProps {
  market?: MarketType;
  onSelectInstrument: (inst: FnoInstrument) => void;
  onOpenChainTab?: () => void;
}

type FilterTab = 'ALL' | BuildupType;
type SortField = 'priceChangePct' | 'oiChangePct' | 'openInterest' | 'volume';

export function BuildupScannerTab({
  market = 'INDIA',
  onSelectInstrument,
  onOpenChainTab,
}: BuildupScannerTabProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('oiChangePct');
  const [sortAsc, setSortAsc] = useState(false);

  const { livePrices, getSymbolPrice } = useTradeEngine();

  const rawData = useMemo(() => getBuildupScannerData(market), [market]);

  const enrichedRecords = useMemo(() => {
    return rawData.map((r) => {
      const live = getSymbolPrice(r.symbol);
      if (!live || !live.price) return r;
      const spotPrice = live.price;
      const priceChangePct = live.changePct ?? r.priceChangePct;
      const priceDelta = r.spotPrice > 0 ? (spotPrice - r.spotPrice) / r.spotPrice : 0;
      const oiChangePct = +(r.oiChangePct + priceDelta * 25).toFixed(2);
      const openInterest = Math.max(10000, Math.round(r.openInterest * (1 + priceDelta * 0.5)));
      const volume = Math.max(5000, Math.round(r.volume * (1 + Math.abs(priceDelta) * 1.2)));

      let buildupType: BuildupType = r.buildupType;
      let sentiment = r.sentiment;
      if (priceChangePct >= 0 && oiChangePct >= 0) {
        buildupType = 'LONG_BUILDUP';
        sentiment = 'Strong Bullish';
      } else if (priceChangePct < 0 && oiChangePct >= 0) {
        buildupType = 'SHORT_BUILDUP';
        sentiment = 'Strong Bearish';
      } else if (priceChangePct >= 0 && oiChangePct < 0) {
        buildupType = 'SHORT_COVERING';
        sentiment = 'Moderate Bullish';
      } else {
        buildupType = 'LONG_UNWINDING';
        sentiment = 'Weakening';
      }

      return {
        ...r,
        spotPrice,
        priceChangePct,
        oiChangePct,
        openInterest,
        volume,
        buildupType,
        sentiment,
      };
    });
  }, [rawData, livePrices, getSymbolPrice]);

  const curr = market === 'USA' ? '$' : market === 'UAE' ? 'AED ' : '₹';
  const loc = market === 'INDIA' ? 'en-IN' : 'en-US';
  const volSuffix = market === 'INDIA' ? ' L' : ' K';
  const volDivisor = market === 'INDIA' ? 100000 : 1000;
  const volHeader = market === 'INDIA' ? 'Volume (Lakhs)' : 'Volume (Contracts)';

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    let list = [...enrichedRecords];

    // Filter by quadrant tab
    if (activeTab !== 'ALL') {
      list = list.filter((r) => r.buildupType === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.symbol.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    });

    return list;
  }, [enrichedRecords, activeTab, searchQuery, sortField, sortAsc]);

  const handleSelectStock = (record: BuildupRecord) => {
    const inst = findFnoInstrument(record.symbol);
    onSelectInstrument(inst);
    if (onOpenChainTab) {
      onOpenChainTab();
    }
  };

  const QUADRANT_EXPLAINERS = [
    {
      type: 'LONG_BUILDUP' as const,
      title: 'LONG BUILDUP',
      subtitle: 'Price Up ▲ · OI Up ▲',
      color: 'emerald',
      sentiment: 'Strong Bullish',
      desc: 'Institutional participants aggressively buying futures and writing puts. High conviction accumulation indicates expectations of upward continuation.',
    },
    {
      type: 'SHORT_BUILDUP' as const,
      title: 'SHORT BUILDUP',
      subtitle: 'Price Down ▼ · OI Up ▲',
      color: 'rose',
      sentiment: 'Strong Bearish',
      desc: 'Fresh short contracts being written by smart money. Heavy open interest accumulation accompanied by lower prices signals strong downside momentum.',
    },
    {
      type: 'SHORT_COVERING' as const,
      title: 'SHORT COVERING',
      subtitle: 'Price Up ▲ · OI Down ▼',
      color: 'cyan',
      sentiment: 'Defensive Squeeze',
      desc: 'Short sellers trapped by rising prices and forced to buy back contracts. Characterized by decreasing OI with positive price velocity.',
    },
    {
      type: 'LONG_UNWINDING' as const,
      title: 'LONG UNWINDING',
      subtitle: 'Price Down ▼ · OI Down ▼',
      color: 'amber',
      sentiment: 'Exhaustion',
      desc: 'Existing long position holders closing trades and booking profits or capitulating. Declining open interest confirms weakening bullish trend.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── 1. Quadrant Explanatory Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {QUADRANT_EXPLAINERS.map((q) => {
          const isActive = activeTab === q.type;
          return (
            <div
              key={q.type}
              onClick={() => setActiveTab(isActive ? 'ALL' : q.type)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? q.color === 'emerald'
                    ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                    : q.color === 'rose'
                    ? 'bg-rose-500/15 border-rose-500 ring-1 ring-rose-500 shadow-md'
                    : q.color === 'cyan'
                    ? 'bg-cyan-500/15 border-cyan-500 ring-1 ring-cyan-500 shadow-md'
                    : 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500 shadow-md'
                  : 'bg-[var(--theme-card-surface)] border-[var(--theme-card-border)] hover:border-[var(--theme-card-subtitle)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`mono text-[12px] font-black uppercase tracking-wider ${
                    q.color === 'emerald'
                      ? 'text-emerald-400'
                      : q.color === 'rose'
                      ? 'text-rose-400'
                      : q.color === 'cyan'
                      ? 'text-cyan-400'
                      : 'text-amber-400'
                  }`}
                >
                  {q.title}
                </span>
                <span className="mono text-[9px] font-bold text-[var(--theme-card-subtitle)]">
                  {q.subtitle}
                </span>
              </div>
              <p className="mt-2 text-[10.5px] text-[var(--theme-card-subtitle)] leading-relaxed">
                {q.desc}
              </p>
              <div className="mt-2.5 pt-2 border-t border-[var(--theme-card-border)]/50 flex items-center justify-between text-[10px] mono">
                <span className="text-[var(--theme-card-subtitle)]">Flow Bias:</span>
                <span
                  className={`font-black ${
                    q.color === 'emerald'
                      ? 'text-emerald-400'
                      : q.color === 'rose'
                      ? 'text-rose-400'
                      : q.color === 'cyan'
                      ? 'text-cyan-400'
                      : 'text-amber-400'
                  }`}
                >
                  {q.sentiment}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 2. Scanner Controls: Quadrant Tabs & Search ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-3 shadow-sm">
        {/* Quadrant Tabs */}
        <div className="flex items-center gap-1 bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] p-1 rounded-lg overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'ALL', label: '🌐 All Quadrants' },
              { id: 'LONG_BUILDUP', label: '🟢 Long Buildup' },
              { id: 'SHORT_BUILDUP', label: '🔴 Short Buildup' },
              { id: 'SHORT_COVERING', label: '🔵 Short Covering' },
              { id: 'LONG_UNWINDING', label: '🟡 Long Unwinding' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'text-[var(--theme-card-text)] hover:text-emerald-400 hover:bg-[var(--theme-card-border)]/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search stock or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 sm:w-60 px-3 py-1.5 rounded-lg bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-[11px] mono text-[var(--theme-card-text)] focus:outline-hidden focus:border-emerald-500"
          />
          <span className="mono text-[11px] text-[var(--theme-card-subtitle)]">
            Showing <span className="font-bold text-[var(--theme-card-text)]">{filteredRecords.length}</span> stocks
          </span>
        </div>
      </div>

      {/* ── 3. Buildup Universe Data Table ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left mono text-[12px]">
            <thead className="bg-[var(--theme-card-subsurface)] border-b border-[var(--theme-card-border)] text-[10px] text-[var(--theme-card-subtitle)] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Symbol & Name</th>
                <th
                  onClick={() => {
                    setSortField('priceChangePct');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-emerald-400"
                >
                  Spot ({curr.trim()}) · % Chg {sortField === 'priceChangePct' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => {
                    setSortField('oiChangePct');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-emerald-400"
                >
                  OI Change (%) {sortField === 'oiChangePct' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  onClick={() => {
                    setSortField('openInterest');
                    setSortAsc(!sortAsc);
                  }}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-emerald-400"
                >
                  Total OI (Contracts) {sortField === 'openInterest' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="py-2.5 px-3 text-center">Buildup Classification</th>
                <th className="py-2.5 px-3 text-center">Flow Bias</th>
                <th className="py-2.5 px-3 text-right">{volHeader}</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/50">
              {filteredRecords.map((r) => {
                const isPriceUp = r.priceChangePct >= 0;
                const isOIUp = r.oiChangePct >= 0;

                return (
                  <tr
                    key={r.symbol}
                    className="hover:bg-emerald-500/5 transition-colors group"
                  >
                    {/* Symbol */}
                    <td className="py-3 px-3">
                      <div className="font-black text-[var(--theme-card-text)] text-[13px] group-hover:text-emerald-400 transition-colors">
                        {r.symbol}
                      </div>
                      <div className="text-[10px] text-[var(--theme-card-subtitle)] truncate max-w-[160px]">
                        {r.name} · {r.sector}
                      </div>
                    </td>

                    {/* Spot & % Chg */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-black text-[var(--theme-card-text)]">
                        {curr}{r.spotPrice.toLocaleString(loc, { minimumFractionDigits: 2 })}
                      </div>
                      <div
                        className={`text-[10.5px] font-bold ${
                          isPriceUp ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPriceUp ? '+' : ''}{r.priceChangePct.toFixed(2)}%
                      </div>
                    </td>

                    {/* OI Change % */}
                    <td className="py-3 px-3 text-right">
                      <div
                        className={`font-black text-[13px] ${
                          isOIUp ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isOIUp ? '+' : ''}{r.oiChangePct.toFixed(2)}%
                      </div>
                      <div className="text-[9.5px] text-[var(--theme-card-subtitle)]">
                        {isOIUp ? 'Fresh Positions' : 'Positions Closed'}
                      </div>
                    </td>

                    {/* Total OI */}
                    <td className="py-3 px-3 text-right font-medium text-[var(--theme-card-text)]">
                      {(r.openInterest / volDivisor).toFixed(1)}{volSuffix}
                    </td>

                    {/* Buildup Classification Badge */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[10.5px] font-black border ${
                          r.buildupType === 'LONG_BUILDUP'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                            : r.buildupType === 'SHORT_BUILDUP'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                            : r.buildupType === 'SHORT_COVERING'
                            ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                        }`}
                      >
                        {r.buildupType.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Sentiment */}
                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] font-bold text-[var(--theme-card-subtitle)]">
                        {r.sentiment}
                      </span>
                    </td>

                    {/* Volume */}
                    <td className="py-3 px-3 text-right text-[var(--theme-card-text)]">
                      {(r.volume / volDivisor).toFixed(1)}{volSuffix}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleSelectStock(r)}
                        className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                      >
                        Analyze →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
