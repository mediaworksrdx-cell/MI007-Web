// ─── Screening Alerts & Scheduled Notification Workspace ────────────────────
'use client';

import React, { useState } from 'react';
import { ScreeningAlert } from '@/lib/screener/types';

interface ScreeningAlertsViewProps {
  alerts: ScreeningAlert[];
  onToggleAlert: (alertId: string) => void;
  onCreateAlert: (alert: Partial<ScreeningAlert>) => void;
  onSelectCompany: (symbol: string) => void;
  onBackToScreener?: () => void;
}

export function ScreeningAlertsView({
  alerts,
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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateAlert({
      id: `alert-${Date.now()}`,
      name: name.trim(),
      triggerType,
      frequency,
      enabled: true,
      metricKey: triggerType === 'METRIC_CROSS' ? metricKey : undefined,
      threshold: triggerType === 'METRIC_CROSS' ? threshold : undefined,
      recentTriggers: [
        {
          timestamp: new Date().toLocaleString(),
          symbol: 'TCS',
          message: `Alert activated: Monitoring for ${triggerType === 'METRIC_CROSS' ? `${metricKey} > ${threshold}` : 'screen entry'} on financial report release.`,
        },
      ],
    });

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
              title="Return to Stock Screener Table"
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
                      : 'border-slate-600 bg-slate-800 text-slate-400'
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

              {/* Recent Triggers */}
              <div className="mt-4 pt-3 border-t border-[var(--theme-card-border)]/60">
                <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider block mb-2">
                  Recent Trigger History
                </span>
                <div className="flex flex-col gap-2">
                  {alert.recentTriggers?.map((trig, idx) => (
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
