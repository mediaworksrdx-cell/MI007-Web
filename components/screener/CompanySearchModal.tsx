// ─── Company Quick Search & Navigation Modal ────────────────────────────────
// Full-text search across screened companies AND complete Zerodha Kite NSE catalog (3,800+ stocks)
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CompanyFundamental } from '@/lib/screener/types';
import { MASTER_COMPANIES } from '@/lib/screener/data';
import {
  searchZerodhaStocks,
  ZerodhaStockItem,
  getZerodhaStocksCount,
  getZerodhaCatalog,
} from '@/lib/screener/zerodhaStocks';

interface CompanySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCompany: (symbol: string) => void;
  companies?: CompanyFundamental[];
}

export function CompanySearchModal({
  isOpen,
  onClose,
  onSelectCompany,
  companies = MASTER_COMPANIES,
}: CompanySearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'screener' | 'zerodha'>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [totalZerodha, setTotalZerodha] = useState<number>(() => getZerodhaStocksCount());
  const inputRef = useRef<HTMLInputElement>(null);

  // Dragging state to allow freely repositioning the search modal
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialOffsetX: 0, initialOffsetY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button') || target.closest('input')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: dragOffset.x,
      initialOffsetY: dragOffset.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      setDragOffset({
        x: dragStartRef.current.initialOffsetX + dx,
        y: dragStartRef.current.initialOffsetY + dy,
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSyncMessage(null);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Pull fresh instruments directly from Zerodha Kite endpoint
  const handlePullFromZerodha = async () => {
    setSyncing(true);
    setSyncMessage('Updating exchange directory...');
    try {
      const res = await fetch('/api/screener/zerodha-stocks?action=sync');
      const data = await res.json();
      if (data.success) {
        setTotalZerodha(data.count);
        setSyncMessage(`✓ Synced ${data.count} active NSE equity stocks!`);
      } else {
        setSyncMessage(data.message || 'Updated catalog');
      }
    } catch {
      setSyncMessage('Failed to contact catalog endpoint');
    } finally {
      setSyncing(false);
    }
  };

  // Primary matches from screened universe
  const screenedMatches = useMemo(() => {
    if (!query.trim()) return companies.slice(0, 15);
    const q = query.toLowerCase();
    return companies.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q)
    );
  }, [companies, query]);

  // Matches from complete 3,820+ Zerodha Kite catalog
  const zerodhaMatches = useMemo<ZerodhaStockItem[]>(() => {
    const screenedSyms = new Set(screenedMatches.map((c) => c.symbol.toUpperCase()));
    if (!query.trim()) {
      if (activeTab === 'zerodha') {
        return getZerodhaCatalog().slice(0, 50).filter((z) => !screenedSyms.has(z.symbol.toUpperCase()));
      }
      return [];
    }
    return searchZerodhaStocks(query, 50).filter((z) => !screenedSyms.has(z.symbol.toUpperCase()));
  }, [query, screenedMatches, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-44 sm:pt-52 md:pt-60 p-4 pb-12 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div
        style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
        className="relative w-full max-w-2xl rounded-2xl border-2 terminal-page-panel shadow-2xl overflow-hidden bg-[var(--theme-card-bg)] flex flex-col max-h-[68vh] my-auto"
      >
        {/* Search Input Bar with Reposition Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`p-3.5 sm:p-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center gap-3 select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          title="Drag anywhere on header to reposition search window"
        >
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 shrink-0 cursor-grab" title="Drag window">
            <span className="mono text-xs font-black tracking-tighter">⋮⋮</span>
            <svg className="w-5 h-5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search all 3,800+ NSE stocks (e.g. RELIANCE, TCS, ETERNAL, SUZLON, HAL)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent mono text-[14px] sm:text-[15px] font-bold text-[var(--theme-card-text)] placeholder:text-slate-400 focus:outline-none min-w-0"
          />
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Filter Tabs & Zerodha Sync Ribbon */}
        <div className="px-4 py-2 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <div className="flex items-center gap-1.5 mono">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
              }`}
            >
              All Results
            </button>
            <button
              onClick={() => setActiveTab('screener')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                activeTab === 'screener'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
              }`}
            >
              Screened ({screenedMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('zerodha')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                activeTab === 'zerodha'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
              }`}
            >
              ⚡ All NSE Stocks ({query ? zerodhaMatches.length : totalZerodha})
            </button>
          </div>

          <button
            onClick={handlePullFromZerodha}
            disabled={syncing}
            className="px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold mono text-[11px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Sync fresh stock instruments from exchange directory"
          >
            <span className={syncing ? 'animate-spin' : ''}>⚡</span>
            <span>{syncing ? 'Syncing...' : 'Sync Catalog'}</span>
          </button>
        </div>

        {syncMessage && (
          <div className="px-4 py-1.5 bg-emerald-500/15 border-b border-emerald-500/30 mono text-[11px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-between">
            <span>{syncMessage}</span>
            <button onClick={() => setSyncMessage(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-white">✕</button>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[var(--theme-card-border)]/50">
          {screenedMatches.length === 0 && zerodhaMatches.length === 0 ? (
            <div className="p-8 text-center mono text-[13px] text-[var(--theme-card-text-muted)]">
              No matching companies found for &quot;{query}&quot;
            </div>
          ) : (
            <>
              {/* Screened Universe Results */}
              {(activeTab === 'all' || activeTab === 'screener') &&
                screenedMatches.map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => {
                      onSelectCompany(comp.symbol);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-emerald-500/10 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                      <div className="w-9 h-9 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-center mono text-[12px] font-black text-emerald-400 shrink-0">
                        {comp.symbol.slice(0, 3)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="mono text-[14px] font-black text-[var(--theme-card-text)] group-hover:text-emerald-400 transition-colors">
                            {comp.symbol}
                          </span>
                          <span className="mono text-[10.5px] font-bold px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] inline-flex items-center leading-none">
                            {comp.exchange}
                          </span>
                          <span className="mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Screened
                          </span>
                        </div>
                        <div className="text-[12px] text-[var(--theme-card-text-muted)] font-medium truncate">
                          {comp.name} · {comp.sector}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 min-w-[120px] tabular-nums">
                      <div className="mono text-[14px] font-black text-[var(--theme-card-text)]">
                        {comp.currencySymbol}{comp.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className={`mono text-[11.5px] font-bold ${comp.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {comp.priceChangePct >= 0 ? '+' : ''}{comp.priceChangePct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}

              {/* Zerodha Kite Catalog Results */}
              {(activeTab === 'all' || activeTab === 'zerodha') &&
                zerodhaMatches.map((z) => (
                  <div
                    key={`zerodha-${z.token}`}
                    onClick={() => {
                      onSelectCompany(z.symbol);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-emerald-500/10 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                      <div className="w-9 h-9 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center mono text-[12px] font-black text-emerald-400 shrink-0">
                        ⚡
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="mono text-[14px] font-black text-[var(--theme-card-text)] group-hover:text-emerald-400 transition-colors">
                            {z.symbol}
                          </span>
                          <span className="mono text-[10.5px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 inline-flex items-center leading-none">
                            NSE Equity
                          </span>
                          <span className="mono text-[10px] text-[var(--theme-card-text-muted)]">
                            Token: #{z.token}
                          </span>
                        </div>
                        <div className="text-[12px] text-[var(--theme-card-text-muted)] font-medium truncate">
                          {z.name} · {z.sector}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 min-w-[100px]">
                      <span className="mono text-[11px] font-bold px-2 py-1 rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-emerald-400 group-hover:border-emerald-500 transition-colors">
                        Analyze →
                      </span>
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>

        {/* Footer info banner */}
        <div className="px-4 py-2 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-between text-[11px] text-[var(--theme-card-text-muted)] mono">
          <span>⚡ Active Exchange Directory ({totalZerodha.toLocaleString()} active NSE instruments)</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
