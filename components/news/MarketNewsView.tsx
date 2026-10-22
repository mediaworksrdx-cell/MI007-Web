'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  NewsItem,
  NewsCategory,
  NewsSentiment,
  getBaselineNews,
  filterMarketNews,
} from '@/lib/terminal/marketNewsData';

export function MarketNewsView() {
  const [news, setNews] = useState<NewsItem[]>(() => getBaselineNews());
  const [category, setCategory] = useState<NewsCategory>('ALL');
  const [sentimentFilter, setSentimentFilter] = useState<'ALL' | NewsSentiment>('ALL');
  const [search, setSearch] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Fetch from live API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('category', category);
      if (search.trim()) params.set('q', search.trim());
      if (selectedTicker.trim()) params.set('ticker', selectedTicker.trim());

      const res = await fetch(`/api/terminal/news?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.news) {
          setNews(data.news);
        }
      }
    } catch (err) {
      console.warn('[MarketNews] API load failed, using local baseline:', err);
    } finally {
      setLoading(false);
    }
  }, [category, search, selectedTicker]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute filtered news
  const filteredNews = useMemo(() => {
    let list = filterMarketNews(news, {
      category,
      search,
      ticker: selectedTicker,
    });
    if (sentimentFilter !== 'ALL') {
      list = list.filter((n) => n.sentiment === sentimentFilter);
    }
    return list;
  }, [news, category, search, selectedTicker, sentimentFilter]);

  // Breaking news items
  const breakingNews = useMemo(() => news.filter((n) => n.isBreaking), [news]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* ── Breaking News Marquee Banner ── */}
      {breakingNews.length > 0 && (
        <div className="p-3 sm:p-4 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent flex items-center gap-3 overflow-hidden shadow-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500 text-white mono text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs animate-pulse">
            <span>⚡</span>
            <span>BREAKING NEWS</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="truncate text-xs sm:text-sm font-bold text-[var(--theme-card-text)]">
              {breakingNews[0].title} —{' '}
              <span className="opacity-70 font-normal">{breakingNews[0].summary}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Controls & Filter Header ── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] shadow-md flex flex-col gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: 'All Intelligence' },
                { id: 'EQUITIES', label: '📈 Equities (NSE/BSE/US)' },
                { id: 'COMMODITIES', label: '🛢️ Commodities' },
                { id: 'FOREX', label: '💱 Forex & Rates' },
                { id: 'CRYPTO', label: '🪙 Crypto' },
                { id: 'MACRO', label: '🏛️ Macro' },
              ] as const
            ).map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setSelectedTicker('');
                  }}
                  className={`px-3 py-1.5 rounded-lg mono text-[12px] font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Sentiment Filter */}
          <div className="flex items-center gap-1.5">
            <span className="mono text-[11px] font-bold uppercase tracking-wider opacity-60 hidden md:inline">
              Sentiment:
            </span>
            {(['ALL', 'BULLISH', 'BEARISH'] as const).map((sent) => {
              const active = sentimentFilter === sent;
              const labels = {
                ALL: 'All Sentiment',
                BULLISH: '🟢 Bullish',
                BEARISH: '🔴 Bearish',
              };
              return (
                <button
                  key={sent}
                  type="button"
                  onClick={() => setSentimentFilter(sent)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] mono font-bold border transition-all cursor-pointer ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-black'
                      : 'border-transparent text-[var(--theme-card-text-muted)] hover:border-[var(--theme-card-border)]'
                  }`}
                >
                  {labels[sent]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Active Filter Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--theme-card-border)]/60">
          <div className="flex items-center gap-2.5 flex-wrap">
            {selectedTicker && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] mono font-black">
                <span>Filter: ${selectedTicker}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTicker('')}
                  className="hover:text-white cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            <span className="mono text-[11.5px] opacity-60">
              Showing {filteredNews.length} verified news reports
            </span>
            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--theme-card-border)] text-[10px] mono hover:bg-white/5 cursor-pointer disabled:opacity-40 transition-all"
              title="Refresh news"
            >
              <span>{loading ? '⏳' : '🔄'}</span>
              <span>{loading ? 'Updating...' : 'Sync'}</span>
            </button>
          </div>

          <div className="relative min-w-[260px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search news by ticker or keyword..."
              className="w-full px-3 py-1.5 pl-8 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-xs mono text-[var(--theme-card-text)] placeholder-[var(--theme-card-text-muted)] focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute left-2.5 top-2 text-xs opacity-50">🔍</span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1.5 text-xs opacity-60 hover:opacity-100 cursor-pointer font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── News Cards Grid ── */}
      {loading ? (
        <div className="p-16 text-center mono text-sm flex items-center justify-center gap-2.5 opacity-60 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span>Aggregating institutional market intelligence feeds...</span>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="p-16 text-center mono text-sm opacity-60 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]">
          No market news matching the active filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between gap-3.5 group"
            >
              <div>
                {/* Meta Row: Source, Time, Sentiment */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] mono font-black uppercase bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] text-[var(--theme-card-text)]">
                      {item.source}
                    </span>
                    <span className="mono text-[11px] opacity-60">{item.timeAgo}</span>
                  </div>

                  {/* Sentiment Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black mono ${
                      item.sentiment === 'BULLISH'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : item.sentiment === 'BEARISH'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {item.sentiment === 'BULLISH' ? '▲ BULLISH' : item.sentiment === 'BEARISH' ? '▼ BEARISH' : '● NEUTRAL'}
                  </span>
                </div>

                {/* Headline */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-black text-[15px] sm:text-[16px] leading-snug group-hover:text-emerald-400 transition-colors block"
                >
                  {item.title}
                </a>

                {/* Summary */}
                <p className="text-xs sm:text-[13px] opacity-75 leading-relaxed mt-2 line-clamp-3">
                  {item.summary}
                </p>
              </div>

              {/* Bottom Row: Tickers & Action */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--theme-card-border)]/50 mt-1">
                {/* Ticker Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.tickers.map((sym) => (
                    <Link
                      key={sym}
                      href={`/chart/${sym}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-400 text-[11px] mono font-black transition-colors"
                      title={`Open interactive chart for ${sym}`}
                    >
                      <span>${sym}</span>
                      <span className="text-[9px] opacity-60">↗</span>
                    </Link>
                  ))}
                </div>

                {/* Source link */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-[11px] font-bold opacity-60 hover:opacity-100 hover:text-emerald-400 transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>Read Story</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
