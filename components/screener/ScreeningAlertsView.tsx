// ─── Screening Alerts & Scheduled Notification Workspace ────────────────────
'use client';

import React, { useState, useMemo } from 'react';
import { ScreeningAlert, MarketRegion, CompanyFundamental } from '@/lib/screener/types';
import { getCompaniesByMarket } from '@/lib/screener/data';
import { getMetricValue } from '@/lib/screener/metrics';
import { parseQuery, evaluateNode } from '@/lib/screener/queryEngine';

export function evaluateAlertAgainstUniverse(
  alert: ScreeningAlert,
  companies: CompanyFundamental[]
): { symbol: string; name: string; value?: number | null; message: string }[] {
  if (!alert.enabled) return [];
  const matches: { symbol: string; name: string; value?: number | null; message: string }[] = [];

  if (alert.triggerType === 'METRIC_CROSS' && alert.metricKey && typeof alert.threshold === 'number') {
    for (const comp of companies) {
      const val = getMetricValue(comp, alert.metricKey);
      if (val !== null && val > alert.threshold) {
        matches.push({
          symbol: comp.symbol,
          name: comp.name,
          value: val,
          message: `${alert.metricKey.toUpperCase()} is ${val.toFixed(2)} (threshold > ${alert.threshold})`,
        });
      }
    }
  } else if ((alert as any).query) {
    const parsed = parseQuery((alert as any).query);
    if (parsed.valid && parsed.ast) {
      for (const comp of companies) {
        if (evaluateNode(parsed.ast, comp)) {
          matches.push({
            symbol: comp.symbol,
            name: comp.name,
            message: `Matches screen condition: ${(alert as any).query}`,
          });
        }
      }
    }
  }
  return matches;
}

interface ScreeningAlertsViewProps {
  alerts: ScreeningAlert[];
  market?: MarketRegion;
  onToggleAlert: (alertId: string) => void;
  onCreateAlert: (alert: Partial<ScreeningAlert>) => void;
  onSelectCompany: (symbol: string) => void;
  onBackToScreener?: () => void;
}

export function ScreeningAlertsView({
  alerts,
  market = 'INDIA',
  onToggleAlert,
  onCreateAlert,
  onSelectCompany,
  onBackToScreener,
}: ScreeningAlertsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<'SCREEN_ENTRY_EXIT' | 'METRIC_CROSS'>('SCREEN_ENTRY_EXIT');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'STATEMENT_RELEASE'>('STATEMENT_RELEASE');
  const [metricKey, setMetricKey] = useState('roce');
  const [threshold, setThreshold] = useState(25);

  const universe = useMemo(() => getCompaniesByMarket(market), [market]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newAlert: ScreeningAlert = {
      id: `alert-${Date.now()}`,
      name: name.trim(),
      triggerType,
      frequency,
      enabled: true,
      metricKey: triggerType === 'METRIC_CROSS' ? metricKey : undefined,
      threshold: triggerType === 'METRIC_CROSS' ? threshold : undefined,
      recentTriggers: [],
    };
    const evaluated = evaluateAlertAgainstUniverse(newAlert, universe).slice(0, 5);
    newAlert.recentTriggers = evaluated.map((m) => ({
      timestamp: `Snapshot (${universe[0]?.asOfDate || '2026-10-31'})`,
      symbol: m.symbol,
      message: m.message,
    }));

    onCreateAlert(newAlert);

    setName('');
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="p-6 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {onBackToScreener && (
            <button
              type="button"
              onClick={onBackToScreener}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[12px] font-black shadow-xs shrink-0 group cursor-pointer"
              title="Return to Screeners Table"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>BACK TO SCREENER</span>
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
                Screening Alerts & Triggers
              </h2>
            </div>
            <p className="text-[13px] text-[var(--theme-card-text-muted)] font-medium mt-1">
              Automated alerts when companies enter/exit saved screens or cross fundamental ratio thresholds on periodic financial statement filings.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black hover:bg-emerald-400 transition-colors shadow-xs"
        >
          + Create Alert Rule
        </button>
      </div>

      {/* Alert Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="mono text-[11px] font-black px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 uppercase">
                  {alert.frequency}
                </span>

                <button
                  type="button"
                  onClick={() => onToggleAlert(alert.id)}
                  className={`mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                    alert.enabled
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {alert.enabled ? '● ACTIVE' : '○ PAUSED'}
                </button>
              </div>

              <h3 className="mono text-[15px] font-black text-[var(--theme-card-text)]">
                {alert.name}
              </h3>

              <div className="text-[12px] text-[var(--theme-card-text-muted)] mt-1 mono">
                Type: {alert.triggerType === 'SCREEN_ENTRY_EXIT' ? 'Screen Entry / Exit' : `Fundamental Metric Cross`}
              </div>

              {/* Live Snapshot Matches & Trigger History */}
              <div className="mt-4 pt-3 border-t border-[var(--theme-card-border)]/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider">
                    In-App Snapshot Evaluation (Push Delivery: Coming Soon)
                  </span>
                </div>
                {(() => {
                  const liveMatches = evaluateAlertAgainstUniverse(alert, universe);
                  const displayList =
                    liveMatches.length > 0
                      ? liveMatches.slice(0, 5).map((m) => ({
                          symbol: m.symbol,
                          timestamp: `Snapshot (${universe[0]?.asOfDate || '2026-10-31'})`,
                          message: m.message,
                        }))
                      : alert.recentTriggers || [];
                  if (displayList.length === 0) {
                    return (
                      <div className="p-2.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[11.5px] text-[var(--theme-card-text-muted)] mono">
                        {alert.enabled
                          ? '0 companies currently match this alert threshold in the loaded fundamental snapshot.'
                          : 'Alert is paused.'}
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-col gap-2">
                      {liveMatches.length > 0 && (
                        <div className="text-[11px] mono font-bold text-emerald-400">
                          {liveMatches.length} matching companies in {market} universe (showing top {Math.min(5, liveMatches.length)}):
                        </div>
                      )}
                      {displayList.map((trig, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[12px]"
                        >
                          <div className="flex items-center justify-between mono text-[10.5px] text-[var(--theme-card-text-muted)] mb-0.5">
                            <button
                              type="button"
                              onClick={() => onSelectCompany(trig.symbol)}
                              className="font-bold text-emerald-400 hover:underline"
                            >
                              {trig.symbol}
                            </button>
                            <span>{trig.timestamp}</span>
                          </div>
                          <p className="text-[12px] text-[var(--theme-card-text)]">
                            {trig.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Alert Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 terminal-page-panel p-6 bg-[var(--theme-card-bg)] shadow-2xl">
            <h3 className="mono text-[16px] font-black inst-card-text uppercase tracking-wider mb-4">
              Configure New Fundamental Alert
            </h3>
            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase mb-1">
                  Alert Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High ROCE Outlier Alert"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl mono text-[13px] border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase mb-1">
                  Trigger Condition
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl mono text-[13px] border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500"
                >
                  <option value="SCREEN_ENTRY_EXIT">When Company Enters/Exits a Screen</option>
                  <option value="METRIC_CROSS">When Metric Crosses Threshold</option>
                </select>
              </div>

              {triggerType === 'METRIC_CROSS' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase mb-1">
                      Metric
                    </label>
                    <select
                      value={metricKey}
                      onChange={(e) => setMetricKey(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl mono text-[12.5px] border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none"
                    >
                      <option value="roce">ROCE %</option>
                      <option value="roe">ROE %</option>
                      <option value="debtToEquity">Debt to Equity</option>
                      <option value="pe">P/E Ratio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase mb-1">
                      Threshold
                    </label>
                    <input
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl mono text-[12.5px] border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none text-right"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase mb-1">
                  Evaluation Cadence
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl mono text-[13px] border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500"
                >
                  <option value="STATEMENT_RELEASE">On Quarterly / Annual Statement Release</option>
                  <option value="DAILY">Daily Market Close</option>
                  <option value="WEEKLY">Weekly Summary</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 mono text-[12px] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12px] font-black hover:bg-emerald-400"
                >
                  Save Alert Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
