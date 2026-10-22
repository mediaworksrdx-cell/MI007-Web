'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useMarket } from '@/lib/marketContext';
import { useAppTheme, THEMES, AppTheme } from '@/lib/themeContext';
import { MASTER_COMPANIES } from '@/lib/screener/data';
import { PREDEFINED_SCREENS } from '@/lib/screener/templates';
import { STRATEGY_DEFINITIONS } from '@/lib/screener/technicalStrategies';
import { MarketType } from '@/lib/types';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Equities & Charts' | 'Screener Templates' | 'Technical Strategies' | 'Market Region' | 'Appearance & Theme';
  title: string;
  subtitle: string;
  badge?: string;
  icon: string;
  keywords: string;
  onSelect: () => void;
}

export function GlobalCommandPalette({
  externalOpen,
  onExternalClose,
}: {
  externalOpen?: boolean;
  onExternalClose?: () => void;
}) {
  const router = useRouter();
  const { market, setMarket } = useMarket();
  const { theme, setTheme } = useAppTheme();

  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;

  const closePalette = () => {
    setInternalOpen(false);
    onExternalClose?.();
    setQuery('');
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global keyboard shortcut: Ctrl+K / Cmd+K or Ctrl+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.key === '/')) {
        e.preventDefault();
        setInternalOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closePalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // 1. Navigation
      {
        id: 'nav-terminal',
        category: 'Navigation',
        title: 'Institutional Terminal Dashboard',
        subtitle: 'Live multi-market equities, indices, commodities, forex & crypto',
        badge: '/terminal',
        icon: '⚡',
        keywords: 'dashboard terminal home live overview',
        onSelect: () => router.push('/terminal'),
      },
      {
        id: 'nav-screener',
        category: 'Navigation',
        title: 'Fundamental & Technical Screener Hub',
        subtitle: 'Query engine, 14 templates, Piotroski F-Score, Altman Z & SWOT',
        badge: '/terminal/screener',
        icon: '🔍',
        keywords: 'screener fundamental filter scanner query',
        onSelect: () => router.push('/terminal/screener'),
      },
      {
        id: 'nav-backtest',
        category: 'Navigation',
        title: 'Quantitative Strategy Backtesting Lab',
        subtitle: 'Walk-forward simulation, equity curve, win rate & trade logs',
        badge: 'Backtester',
        icon: '📈',
        keywords: 'backtest simulation walk forward equity curve strategy',
        onSelect: () => router.push('/terminal/screener?tab=backtesting'),
      },
      {
        id: 'nav-fno',
        category: 'Navigation',
        title: 'F&O Intelligence & Strategy Architect',
        subtitle: 'Option chain Greeks, OI buildup scanner & payoff diagram builder',
        badge: '/terminal/fno',
        icon: '⛓️',
        keywords: 'fno options futures derivatives greeks chain payoff',
        onSelect: () => router.push('/terminal/fno'),
      },
      {
        id: 'nav-chart-nifty',
        category: 'Navigation',
        title: 'Interactive Pro Charting Workstation',
        subtitle: '20+ indicators, SMC overlay, Volume Profile (VPVR) & drawing tools',
        badge: '/chart/NIFTY',
        icon: '📊',
        keywords: 'chart technical candlesticks indicators drawing',
        onSelect: () => router.push(`/chart/${market === 'USA' ? 'SPX' : market === 'UAE' ? 'DFMGI' : 'NIFTY'}?market=${market}`),
      },
      {
        id: 'nav-calendar',
        category: 'Navigation',
        title: 'Global Macro Economic Calendar',
        subtitle: 'Central bank decisions, CPI, NFP & high-impact economic releases',
        badge: '/calendar',
        icon: '📅',
        keywords: 'calendar macro economic events fed rbi cpi gdp',
        onSelect: () => router.push('/calendar'),
      },
      {
        id: 'nav-news',
        category: 'Navigation',
        title: 'Real-Time Institutional News Wire',
        subtitle: 'Breaking market catalysts, earnings releases & sector intelligence',
        badge: '/news',
        icon: '📰',
        keywords: 'news headlines breaking wire catalyst',
        onSelect: () => router.push('/news'),
      },
      {
        id: 'nav-academy',
        category: 'Navigation',
        title: 'Quantitative Trading Academy & AI Mentor',
        subtitle: 'Interactive modules, live signal training & domain mentor',
        badge: '/academy',
        icon: '🎓',
        keywords: 'academy learn mentor education training',
        onSelect: () => router.push('/academy'),
      },
    ];

    // 2. Market Regions
    const markets: Array<{ id: MarketType; name: string; desc: string; flag: string }> = [
      { id: 'INDIA', name: 'Switch Market to INDIA (NSE / BSE)', desc: 'INR (₹) · NIFTY 50, BANKNIFTY, SENSEX & Indian Equities', flag: '🇮🇳' },
      { id: 'USA', name: 'Switch Market to USA (NYSE / NASDAQ)', desc: 'USD ($) · S&P 500, NASDAQ 100, DOW & US Wall Street Equities', flag: '🇺🇸' },
      { id: 'UAE', name: 'Switch Market to UAE (DFM / ADX)', desc: 'AED (د.إ) · DFMGI, ADX & Middle East Institutional Equities', flag: '🇦🇪' },
    ];
    for (const m of markets) {
      items.push({
        id: `mkt-${m.id}`,
        category: 'Market Region',
        title: m.name,
        subtitle: m.desc,
        badge: market === m.id ? 'ACTIVE' : m.id,
        icon: m.flag,
        keywords: `market region switch ${m.id.toLowerCase()} ${m.name.toLowerCase()}`,
        onSelect: () => setMarket(m.id),
      });
    }

    // 3. Appearance & Themes
    (Object.keys(THEMES) as AppTheme[]).forEach((tKey) => {
      const cfg = THEMES[tKey];
      items.push({
        id: `theme-${tKey}`,
        category: 'Appearance & Theme',
        title: `Theme: ${cfg.name}`,
        subtitle: cfg.tagline,
        badge: theme === tKey ? 'ACTIVE' : cfg.badge,
        icon: cfg.mode === 'dark' ? '🌙' : '☀️',
        keywords: `theme color appearance ${cfg.name.toLowerCase()} ${tKey} ${cfg.mode}`,
        onSelect: () => setTheme(tKey),
      });
    });

    // 4. Master Companies (Equities & Charts + Fundamental Teardown)
    for (const comp of MASTER_COMPANIES) {
      items.push({
        id: `chart-${comp.symbol}`,
        category: 'Equities & Charts',
        title: `${comp.symbol} — ${comp.name}`,
        subtitle: `Open Live Interactive Chart · ${comp.sector} (${comp.exchange})`,
        badge: `${comp.currencySymbol}${comp.currentPrice.toLocaleString()}`,
        icon: '📈',
        keywords: `${comp.symbol.toLowerCase()} ${comp.name.toLowerCase()} ${comp.sector.toLowerCase()} chart stock`,
        onSelect: () => router.push(`/chart/${comp.symbol}?market=${comp.market}`),
      });
      items.push({
        id: `analysis-${comp.symbol}`,
        category: 'Equities & Charts',
        title: `${comp.symbol} — Fundamental Teardown & Scorecards`,
        subtitle: `Piotroski F-Score, Altman Z-Score, SWOT & Financials for ${comp.name}`,
        badge: `Analysis · ${comp.market}`,
        icon: '🏛️',
        keywords: `${comp.symbol.toLowerCase()} ${comp.name.toLowerCase()} fundamental analysis piotroski altman swot`,
        onSelect: () => router.push(`/terminal/screener?tab=analysis&symbol=${comp.symbol}`),
      });
    }

    // 5. Screener Templates
    for (const tmpl of PREDEFINED_SCREENS) {
      items.push({
        id: `screen-${tmpl.id}`,
        category: 'Screener Templates',
        title: `Screen: ${tmpl.name}`,
        subtitle: tmpl.description,
        badge: tmpl.category || 'Screen',
        icon: '🧪',
        keywords: `screen template ${tmpl.name.toLowerCase()} ${(tmpl.category || '').toLowerCase()} ${tmpl.query.toLowerCase()}`,
        onSelect: () => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('mi007_cmd_query', tmpl.query);
          }
          router.push(`/terminal/screener?tab=screener&template=${encodeURIComponent(tmpl.id)}`);
        },
      });
    }

    // 6. Technical Strategies
    for (const strat of STRATEGY_DEFINITIONS) {
      items.push({
        id: `strat-${strat.id}`,
        category: 'Technical Strategies',
        title: `Strategy Scanner: ${strat.name}`,
        subtitle: strat.description,
        badge: strat.category,
        icon: '🎯',
        keywords: `technical strategy scanner ${strat.name.toLowerCase()} ${strat.id.toLowerCase()}`,
        onSelect: () => router.push(`/terminal/screener?tab=technicalScreener&strategy=${strat.id}`),
      });
    }

    return items;
  }, [market, theme, router, setMarket, setTheme]);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default curated view when query is empty
      return commands.slice(0, 22);
    }
    return commands
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.keywords.includes(q) ||
          (item.badge && item.badge.toLowerCase().includes(q))
      )
      .slice(0, 35);
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(1, filteredCommands.length)) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      closePalette();
      target.onSelect();
    }
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePalette();
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border-2 border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] shadow-2xl overflow-hidden flex flex-col max-h-[76vh]">
        {/* Top Accent Line */}
        <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500" />

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <span className="text-emerald-400 font-mono text-base font-black">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInput}
            placeholder="Jump to any symbol chart, fundamental teardown, screener template, F&O, or theme..."
            className="w-full bg-transparent text-[14px] mono font-bold text-[var(--theme-card-text)] placeholder-[var(--theme-card-text-muted)]/60 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="px-2 py-0.5 rounded text-xs mono font-bold text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] cursor-pointer"
            >
              CLEAR
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[10px] mono font-bold text-[var(--theme-card-text-muted)] shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-[var(--theme-card-border)]/20">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center mono text-xs text-[var(--theme-card-text-muted)]">
              No matching symbols, screens, or commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    closePalette();
                    item.onSelect();
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/50 shadow-xs'
                      : 'border border-transparent hover:bg-[var(--theme-card-surface)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-center text-sm shrink-0">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="mono text-[13px] font-black text-[var(--theme-card-text)] truncate">
                          {item.title}
                        </span>
                        <span className="mono text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-slate-800/70 text-slate-300 uppercase">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[var(--theme-card-text-muted)] truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span className="mono text-[11px] font-black px-2 py-0.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex flex-wrap items-center justify-between gap-2 text-[11px] mono text-[var(--theme-card-text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[10px] font-bold">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[10px] font-bold">↵</kbd>
              <span>Execute</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[10px] font-bold">Ctrl+K</kbd>
              <span>Toggle Spotlight</span>
            </span>
          </div>
          <span className="text-emerald-400 font-bold">MI-007 Institutional Spotlight</span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
