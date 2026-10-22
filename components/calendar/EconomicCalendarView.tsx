'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  EconomicEvent,
  EventRegion,
  EventImpact,
  getBaselineEconomicEvents,
  filterEconomicEvents,
  formatSimpleNumber,
} from '@/lib/terminal/economicCalendarData';

// Helper to parse and sanitize event title, subtitle, and deduplicate periods
function parseEventTitle(rawEvent: string, rawPeriod?: string): { title: string; subtitle: string | null; periodTag: string | null } {
  if (!rawEvent) return { title: '', subtitle: null, periodTag: null };

  let title = rawEvent.trim();
  let subtitle: string | null = null;

  // Extract trailing date/period clutter separated by colon (e.g. "Producer price inflation, UK: September 2026...")
  const colonIdx = title.indexOf(': ');
  if (colonIdx > 0 && colonIdx < 55) {
    subtitle = title.slice(colonIdx + 2).trim();
    title = title.slice(0, colonIdx).trim();
  }

  // If subtitle is very long, shorten to clean month/quarter
  if (subtitle && subtitle.length > 30) {
    const match = subtitle.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}|Q[1-4]\s*\d{4}/i);
    subtitle = match ? match[0] : subtitle.slice(0, 26) + '...';
  }

  // Deduplicate rawPeriod
  let periodTag: string | null = null;
  if (rawPeriod && rawPeriod.trim()) {
    const p = rawPeriod.trim();
    const isDup =
      (subtitle && subtitle.toLowerCase().includes(p.toLowerCase())) ||
      title.toLowerCase().includes(p.toLowerCase()) ||
      p.toLowerCase().includes(title.toLowerCase());
    if (!isDup) {
      const match = p.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}|Q[1-4]\s*\d{4}/i);
      periodTag = match ? match[0] : p.length > 20 ? p.slice(0, 18) + '...' : p;
    }
  }

  return { title, subtitle, periodTag };
}

export function EconomicCalendarView() {
  const [events, setEvents] = useState<EconomicEvent[]>(() => getBaselineEconomicEvents());
  const [range, setRange] = useState<'today' | 'tomorrow' | 'week' | 'all'>('week');
  const [region, setRegion] = useState<EventRegion>('ALL');
  const [impact, setImpact] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Live Next Event Countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch updated data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('range', range);
      params.set('region', region);
      params.set('impact', impact);
      if (search.trim()) params.set('q', search.trim());

      const res = await fetch(`/api/terminal/economic-calendar?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.events) {
          setEvents(data.events);
        }
      }
    } catch (err) {
      console.warn('[EconomicCalendar] API load failed, using local baseline:', err);
    } finally {
      setLoading(false);
    }
  }, [range, region, impact, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Computed displayed list
  const filteredList = useMemo(() => {
    return filterEconomicEvents(events, { range, region, impact, search });
  }, [events, range, region, impact, search]);

  // Next upcoming high-impact event
  const nextHighImpact = useMemo(() => {
    return events
      .filter((e) => e.impact === 'HIGH' && e.timestamp > now)
      .sort((a, b) => a.timestamp - b.timestamp)[0] || null;
  }, [events, now]);

  // Countdown formatter
  const countdownStr = useMemo(() => {
    if (!nextHighImpact) return null;
    const diff = Math.max(0, nextHighImpact.timestamp - now);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
  }, [nextHighImpact, now]);

  // Summary counts
  const highImpactCount = useMemo(() => filteredList.filter((e) => e.impact === 'HIGH').length, [filteredList]);
  const beatCount = useMemo(() => filteredList.filter((e) => e.isBeat === true).length, [filteredList]);
  const missCount = useMemo(() => filteredList.filter((e) => e.isBeat === false).length, [filteredList]);

  return (
    <div className="w-full flex flex-col gap-5 sm:gap-6">
      {/* ── Filter Controls Bar ── */}
      <div className="p-4 sm:p-5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] shadow-sm flex flex-col gap-3">
        {/* Row 1: Date Horizons & Live Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Date Segmented Tabs */}
          <div className="inline-flex items-center p-0.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-2xs gap-0.5">
            {(['today', 'tomorrow', 'week', 'all'] as const).map((r) => {
              const labels = {
                today: 'Today',
                tomorrow: 'Tomorrow',
                week: 'This Week',
                all: 'All Schedule',
              };
              const active = range === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-md mono text-[11px] font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-white/5'
                  }`}
                >
                  {labels[r]}
                </button>
              );
            })}
          </div>

          {/* Impact Quick Toggle */}
          <div className="flex items-center gap-1.5">
            <span className="mono text-[10.5px] font-bold uppercase tracking-wider opacity-60 hidden md:inline">
              Impact:
            </span>
            {(['ALL', 'HIGH', 'MEDIUM'] as const).map((imp) => {
              const active = impact === imp;
              const labels = {
                ALL: 'All Impact',
                HIGH: '🔴 High',
                MEDIUM: '🟡 Med+',
              };
              return (
                <button
                  key={imp}
                  type="button"
                  onClick={() => setImpact(imp)}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] mono font-bold border transition-all cursor-pointer ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 font-black'
                      : 'border-transparent text-[var(--theme-card-text-muted)] hover:border-[var(--theme-card-border)]'
                  }`}
                >
                  {labels[imp]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Regional Toggles & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-[var(--theme-card-border)]/50">
          {/* Region Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: 'ALL', label: 'All Regions' },
                { id: 'INDIA', label: '🇮🇳 India' },
                { id: 'USA', label: '🇺🇸 USA' },
                { id: 'EUROPE', label: '🇪🇺 Eurozone' },
                { id: 'UAE', label: '🇦🇪 UAE' },
                { id: 'GLOBAL', label: '🌐 Global' },
              ] as const
            ).map((reg) => {
              const active = region === reg.id;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => setRegion(reg.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-white/5'
                  }`}
                >
                  {reg.label}
                </button>
              );
            })}
          </div>

          {/* Refresh & Search Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--theme-card-border)] text-[9.5px] mono hover:bg-white/5 cursor-pointer disabled:opacity-40 transition-all shrink-0"
              title="Refresh calendar"
            >
              <span>{loading ? '⏳' : '🔄'}</span>
              <span>{loading ? 'Updating...' : 'Sync'}</span>
            </button>

            <div className="relative min-w-[180px] flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by indicator (CPI, GDP)..."
                className="w-full px-2.5 py-1 pl-7 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[11.5px] mono text-[var(--theme-card-text)] placeholder-[var(--theme-card-text-muted)] focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute left-2 top-1.5 text-[11px] opacity-50">🔍</span>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1 text-[11px] opacity-60 hover:opacity-100 cursor-pointer font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Summary Bar (Compact) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-2.5 sm:p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="text-[10px] mono font-bold uppercase opacity-60">Total Scheduled</div>
          <div className="text-[16px] sm:text-[19px] font-black mono text-[var(--theme-card-text)] mt-0.5">
            {filteredList.length}
          </div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl border border-rose-500/30 bg-rose-500/5">
          <div className="text-[10px] mono font-bold uppercase text-rose-400 opacity-90">High Impact</div>
          <div className="text-[16px] sm:text-[19px] font-black mono text-rose-400 mt-0.5">
            {highImpactCount}
          </div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <div className="text-[10px] mono font-bold uppercase text-emerald-400 opacity-90">Beats (Positive)</div>
          <div className="text-[16px] sm:text-[19px] font-black mono text-emerald-400 mt-0.5">
            {beatCount}
          </div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <div className="text-[10px] mono font-bold uppercase text-amber-400 opacity-90">Misses (Negative)</div>
          <div className="text-[16px] sm:text-[19px] font-black mono text-amber-400 mt-0.5">
            {missCount}
          </div>
        </div>
      </div>

      {/* ── Economic Events High-Density Table ── */}
      <div className="rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden">
        {loading ? (
          <div className="p-10 text-center mono text-sm flex items-center justify-center gap-2.5 opacity-60">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span>Synchronizing macroeconomic telemetry...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-10 text-center mono text-sm opacity-60">
            No economic events match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[95px] sm:w-[105px]" />
                <col className="w-[66px] sm:w-[74px]" />
                <col className="w-[66px] sm:w-[74px]" />
                <col className="w-auto" />
                <col className="w-[95px] sm:w-[110px]" />
                <col className="w-[85px] sm:w-[95px]" />
                <col className="w-[85px] sm:w-[95px]" />
                <col className="w-[85px] sm:w-[95px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] mono text-[10px] font-black uppercase tracking-wider text-[var(--theme-card-text-muted)]">
                  <th className="py-2.5 px-3">Time (Local)</th>
                  <th className="py-2.5 px-2.5">Region</th>
                  <th className="py-2.5 px-2.5">Impact</th>
                  <th className="py-2.5 px-3">Economic Event</th>
                  <th className="py-2.5 px-2.5 text-right">Actual</th>
                  <th className="py-2.5 px-2.5 text-right">Forecast</th>
                  <th className="py-2.5 px-2.5 text-right">Previous</th>
                  <th className="py-2.5 px-3 text-center">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/40 text-[12.5px]">
                {filteredList.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isPast = item.actual !== null;
                  const { title, subtitle, periodTag } = parseEventTitle(item.event, item.period);

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className={`hover:bg-emerald-500/[0.04] transition-colors cursor-pointer group ${
                          isExpanded ? 'bg-emerald-500/[0.06]' : ''
                        }`}
                      >
                        {/* Time */}
                        <td className="py-2 px-3 whitespace-nowrap mono align-middle">
                          <div className="font-bold text-[12px] leading-tight">{item.timeStr}</div>
                          <div className="text-[9.5px] opacity-60 font-normal">{item.dateStr}</div>
                        </td>

                        {/* Region */}
                        <td className="py-2 px-2.5 whitespace-nowrap align-middle">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[10.5px] mono font-bold">
                            <span>{item.flag}</span>
                            <span>{item.countryCode}</span>
                          </span>
                        </td>

                        {/* Impact */}
                        <td className="py-2 px-2.5 whitespace-nowrap align-middle">
                          {item.impact === 'HIGH' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-500 font-mono">
                              <span>🔴</span>
                              <span>HIGH</span>
                            </span>
                          ) : item.impact === 'MEDIUM' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 font-mono">
                              <span>🟡</span>
                              <span>MED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 font-mono">
                              <span>🟢</span>
                              <span>LOW</span>
                            </span>
                          )}
                        </td>

                        {/* Event Name (absorbs remaining width, never awkwardly wrapped) */}
                        <td className="py-2 px-3 align-middle">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[12.5px] text-[var(--theme-card-text)] group-hover:text-emerald-400 transition-colors leading-snug">
                              {title}
                            </span>
                            {periodTag && (
                              <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-black/20 border border-[var(--theme-card-border)] opacity-75 shrink-0">
                                {periodTag}
                              </span>
                            )}
                          </div>
                          {subtitle && (
                            <div className="text-[10px] font-mono text-emerald-400/80 leading-tight mt-0.5 truncate max-w-xl">
                              {subtitle}
                            </div>
                          )}
                        </td>

                        {/* Actual */}
                        <td className="py-2 px-2.5 text-right mono font-black whitespace-nowrap align-middle text-[12px]">
                          {item.actual ? (
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                item.isBeat === true
                                  ? 'text-emerald-400 bg-emerald-500/15'
                                  : item.isBeat === false
                                  ? 'text-rose-400 bg-rose-500/15'
                                  : 'text-[var(--theme-card-text)]'
                              }`}
                            >
                              {formatSimpleNumber(item.actual)}
                            </span>
                          ) : (
                            <span className="opacity-40 font-normal text-[11px]">Pending</span>
                          )}
                        </td>

                        {/* Forecast */}
                        <td className="py-2 px-2.5 text-right mono font-semibold opacity-75 whitespace-nowrap align-middle text-[11.5px]">
                          {formatSimpleNumber(item.forecast)}
                        </td>

                        {/* Previous */}
                        <td className="py-2 px-2.5 text-right mono opacity-55 whitespace-nowrap align-middle text-[11.5px]">
                          {formatSimpleNumber(item.previous)}
                        </td>

                        {/* Outcome Pill */}
                        <td className="py-2 px-3 text-center whitespace-nowrap align-middle">
                          {item.isBeat === true ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ▲ BEAT
                            </span>
                          ) : item.isBeat === false ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black mono bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              ▼ MISS
                            </span>
                          ) : isPast ? (
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold mono bg-slate-500/15 text-slate-300">
                              IN LINE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold mono bg-white/5 text-slate-400 border border-white/10">
                              UPCOMING
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Context Drawer */}
                      {isExpanded && (
                        <tr className="bg-[var(--theme-card-surface)]/80">
                          <td colSpan={8} className="py-2.5 px-4 text-xs text-[var(--theme-card-text)]">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                              <p className="leading-relaxed opacity-85 max-w-2xl font-sans text-[12px]">
                                {item.description || 'Monitored by institutional macro trading desks for interest rate deviations.'}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 shrink-0 text-[10.5px] mono">
                                {item.actual && item.actual.length > 8 && item.actual !== formatSimpleNumber(item.actual) && (
                                  <span className="opacity-90 mr-2 text-[var(--theme-card-text)]">
                                    Detail: <strong className="text-emerald-400">{item.actual}</strong>
                                  </span>
                                )}
                                <span className="opacity-60">Region:</span>
                                <span className="font-bold uppercase text-emerald-400">{item.country}</span>
                                <span className="opacity-30">•</span>
                                <span className="opacity-60">Status:</span>
                                <span className="font-bold">{isPast ? 'Reported' : 'Scheduled'}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
