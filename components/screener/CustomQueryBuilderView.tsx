// ─── Custom Query Builder & Diagnostic Lab Workspace ───────────────────────
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { METRIC_DEFINITIONS } from '@/lib/screener/metrics';
import { parseQuery, evaluateNode } from '@/lib/screener/queryEngine';
import { MASTER_COMPANIES } from '@/lib/screener/data';
import { CompanyFundamental, SavedScreen, MarketRegion } from '@/lib/screener/types';
import { DEFAULT_COLUMNS, deduplicateScreens } from '@/lib/screener/persistence';

interface CustomQueryBuilderViewProps {
  initialQuery: string;
  onApplyQuery: (query: string) => void;
  onSaveStrategy?: (screen: SavedScreen) => void;
  onBackToScreener?: () => void;
  onNavigateToDiscover?: () => void;
  onSelectCompany?: (symbol: string) => void;
  companies?: CompanyFundamental[];
  savedScreens?: SavedScreen[];
  onDeleteSavedScreen?: (screenId: string) => void;
  market?: MarketRegion;
}

export function CustomQueryBuilderView({
  initialQuery,
  onApplyQuery,
  onSaveStrategy,
  onBackToScreener,
  onNavigateToDiscover,
  onSelectCompany,
  companies = MASTER_COMPANIES,
  savedScreens = [],
  onDeleteSavedScreen,
  market = 'INDIA',
}: CustomQueryBuilderViewProps) {
  const [queryText, setQueryText] = useState(initialQuery);
  const [metricFilter, setMetricFilter] = useState('');
  const [selectedScreenId, setSelectedScreenId] = useState<string>('');

  // In-Tab Test Execution State
  const [testResults, setTestResults] = useState<CompanyFundamental[]>([]);
  const [hasExecutedTest, setHasExecutedTest] = useState(false);
  const [testDurationMs, setTestDurationMs] = useState<number>(0);
  const [resultsSearch, setResultsSearch] = useState('');
  const [testSortColumn, setTestSortColumn] = useState<string>('marketCap');
  const [testSortDirection, setTestSortDirection] = useState<'asc' | 'desc'>('desc');

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [strategyCategory, setStrategyCategory] = useState('Custom');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Sync if initialQuery changes from outside
  useEffect(() => {
    if (initialQuery) {
      setQueryText(initialQuery);
    }
  }, [initialQuery]);

  const parseResult = useMemo(() => {
    return parseQuery(queryText);
  }, [queryText]);

  // Execute test in this tab function
  const runTestInTab = (overrideQuery?: string) => {
    const textToTest = overrideQuery !== undefined ? overrideQuery : queryText;
    const res = parseQuery(textToTest);
    if (!res.valid || !res.ast || companies.length === 0) {
      setTestResults([]);
      setHasExecutedTest(true);
      setTestDurationMs(0);
      return;
    }

    const t0 = performance.now();
    try {
      const matched = companies.filter((c) => evaluateNode(res.ast!, c));
      const t1 = performance.now();
      setTestResults(matched);
      setTestDurationMs(Math.max(1, Math.round(t1 - t0)));
      setHasExecutedTest(true);
    } catch (err) {
      console.warn('Error evaluating query test:', err);
      setTestResults([]);
      setHasExecutedTest(true);
    }
  };

  // Run initial test on mount / query change
  useEffect(() => {
    if (parseResult.valid && queryText.trim()) {
      runTestInTab();
    }
  }, [queryText, companies]);

  // Deduplicate saved screens for the selector
  const cleanSavedScreens = useMemo(() => {
    return deduplicateScreens(savedScreens);
  }, [savedScreens]);

  // Check if currently selected screen is a user custom screen
  const currentlyLoadedUserScreen = useMemo(() => {
    return cleanSavedScreens.find((s) => s.id === selectedScreenId && !s.isPredefined);
  }, [cleanSavedScreens, selectedScreenId]);

  const filteredMetrics = METRIC_DEFINITIONS.filter((m) => {
    if (!metricFilter) return true;
    const f = metricFilter.toLowerCase();
    return (
      m.label.toLowerCase().includes(f) ||
      m.key.toLowerCase().includes(f) ||
      m.aliases.some((a) => a.toLowerCase().includes(f))
    );
  });

  const appendCondition = (metricLabel: string, op: string = '>', val: string = '15') => {
    const snippet = `${metricLabel} ${op} ${val}`;
    const nextQuery = !queryText.trim() ? snippet : `${queryText.trim()}\nAND ${snippet}`;
    setQueryText(nextQuery);
  };

  const handleOpenSaveModal = () => {
    if (!parseResult.valid || !queryText.trim()) return;
    if (currentlyLoadedUserScreen) {
      setStrategyName(currentlyLoadedUserScreen.name);
      setStrategyCategory(currentlyLoadedUserScreen.category || 'Custom');
      setStrategyDescription(currentlyLoadedUserScreen.description || '');
    } else {
      setStrategyName('');
      setStrategyCategory('Custom');
      setStrategyDescription('');
    }
    setIsSaveModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyName.trim() || !parseResult.valid) return;

    const newScreen: SavedScreen = {
      id: currentlyLoadedUserScreen?.id || `user-screen-${Date.now()}`,
      name: strategyName.trim(),
      description: strategyDescription.trim(),
      category: strategyCategory,
      query: queryText.trim(),
      columns: DEFAULT_COLUMNS,
      sortColumn: 'marketCap',
      sortDirection: 'desc',
      market,
      isPredefined: false,
      matchCount: testResults.length,
      createdAt: currentlyLoadedUserScreen?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (onSaveStrategy) {
      onSaveStrategy(newScreen);
    }
    setSelectedScreenId(newScreen.id);
    setIsSaveModalOpen(false);
    setSaveFeedback(`Strategy "${newScreen.name}" saved successfully! It is now available in Discover Screens.`);
  };

  const handleClearQuery = () => {
    setQueryText('');
    setSelectedScreenId('');
    setSaveFeedback(null);
    setTestResults([]);
    setHasExecutedTest(false);
  };

  const handleDeleteCurrentStrategy = () => {
    if (!currentlyLoadedUserScreen || !onDeleteSavedScreen) return;
    if (window.confirm(`Are you sure you want to delete strategy "${currentlyLoadedUserScreen.name}"?`)) {
      onDeleteSavedScreen(currentlyLoadedUserScreen.id);
      setSelectedScreenId('');
      setSaveFeedback(`Strategy "${currentlyLoadedUserScreen.name}" has been deleted.`);
    }
  };

  const handleSelectSavedScreen = (screenId: string) => {
    setSelectedScreenId(screenId);
    setSaveFeedback(null);
    if (!screenId) return;
    const found = cleanSavedScreens.find((s) => s.id === screenId);
    if (found) {
      setQueryText(found.query);
      runTestInTab(found.query);
    }
  };

  // Filtered and sorted test results for table
  const displayedResults = useMemo(() => {
    let list = testResults;
    if (resultsSearch) {
      const q = resultsSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.symbol.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.sector && c.sector.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      const valA = (a as any)[testSortColumn] ?? 0;
      const valB = (b as any)[testSortColumn] ?? 0;
      if (typeof valA === 'string') {
        return testSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return testSortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [testResults, resultsSearch, testSortColumn, testSortDirection]);

  const toggleSort = (col: string) => {
    if (testSortColumn === col) {
      setTestSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTestSortColumn(col);
      setTestSortDirection('desc');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-150">
      {/* Header bar */}
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
                Financial Query Builder & Test Lab
              </h2>
            </div>
            <p className="text-[13px] text-[var(--theme-card-text-muted)] font-medium mt-1">
              Construct logic expressions, run tests right in this tab, and save strategies directly to Discover Screens.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleClearQuery}
            disabled={!queryText.trim()}
            className="px-3 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 mono text-[12px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            title="Clear expression"
          >
            <span>🗑️</span>
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSaveModal}
            disabled={!parseResult.valid || !queryText.trim()}
            className="px-4 py-2 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 mono text-[12.5px] font-black hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Save strategy to Discover Screens"
          >
            <span>💾</span>
            <span>Save Strategy</span>
          </button>

          <button
            type="button"
            onClick={() => runTestInTab()}
            disabled={!parseResult.valid || !queryText.trim()}
            className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black tracking-wide hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5"
            title="Execute test and display matching stocks right here in this tab"
          >
            <span>▶</span>
            <span>Run Test</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveFeedback && (
        <div className="p-4 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] mono font-bold shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-[16px]">✓</span>
            <span>{saveFeedback}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToDiscover && (
              <button
                type="button"
                onClick={onNavigateToDiscover}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 transition-colors shadow-xs cursor-pointer"
              >
                View in Discover Screens →
              </button>
            )}
            <button
              type="button"
              onClick={() => onApplyQuery(queryText)}
              className="px-3.5 py-1.5 rounded-xl border border-emerald-500 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 font-black transition-colors cursor-pointer"
            >
              Open in Screener Tab ▶
            </button>
            <button
              type="button"
              onClick={() => setSaveFeedback(null)}
              className="px-2 py-1 text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] transition-colors cursor-pointer"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Top Grid: Query Textarea (Left) and Metrics Dictionary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Query Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm flex flex-col flex-1">
            {/* Top Bar inside Card */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="mono text-[13px] font-black inst-card-text uppercase tracking-wider">
                  Financial Logic Expression
                </span>
                {currentlyLoadedUserScreen && (
                  <span className="mono text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 uppercase">
                    Editing: {currentlyLoadedUserScreen.name}
                  </span>
                )}
              </div>

              {/* Load Saved Strategy Dropdown (Deduplicated) */}
              {cleanSavedScreens.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedScreenId}
                    onChange={(e) => handleSelectSavedScreen(e.target.value)}
                    className="px-2.5 py-1 rounded-xl mono text-[11.5px] font-bold border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500 max-w-56 truncate"
                  >
                    <option value="">Load Strategy Preset...</option>
                    <optgroup label="My Saved Strategies">
                      {cleanSavedScreens
                        .filter((s) => !s.isPredefined)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            ★ {s.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Curated Preset Screens">
                      {cleanSavedScreens
                        .filter((s) => s.isPredefined)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              )}
            </div>

            <textarea
              rows={12}
              value={queryText}
              onChange={(e) => {
                setQueryText(e.target.value);
                setSaveFeedback(null);
              }}
              placeholder="Type screening conditions (e.g. ROCE > 20 AND Debt to Equity < 0.5)..."
              className="w-full font-mono text-[14px] leading-relaxed p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder:italic placeholder:font-normal placeholder:opacity-50 placeholder-[var(--theme-card-text-muted)] focus:outline-none focus:border-emerald-500 font-bold resize-y flex-1"
              spellCheck={false}
            />

            {/* Error Message */}
            {!parseResult.valid && parseResult.error && (
              <div className="mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[12px] mono font-bold">
                ✕ Syntax Error: {parseResult.error}
              </div>
            )}

            {/* In-Card Action Toolbar: Run Test, Save Strategy, Clear, Delete */}
            <div className="mt-4 pt-3.5 border-t border-[var(--theme-card-border)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Run Test Button */}
                <button
                  type="button"
                  onClick={() => runTestInTab()}
                  disabled={!parseResult.valid || !queryText.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[12.5px] font-black tracking-wide hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Run test right here in this tab and display matching stocks below"
                >
                  <span>▶</span>
                  <span>Run Test</span>
                </button>

                {/* Save Strategy Button */}
                <button
                  type="button"
                  onClick={handleOpenSaveModal}
                  disabled={!parseResult.valid || !queryText.trim()}
                  className="px-3.5 py-2 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 mono text-[12.5px] font-black hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Save strategy to Discover Screens"
                >
                  <span>💾</span>
                  <span>{currentlyLoadedUserScreen ? 'Update Strategy' : 'Save Strategy'}</span>
                </button>

                {/* Clear Button */}
                <button
                  type="button"
                  onClick={handleClearQuery}
                  disabled={!queryText.trim()}
                  className="px-3 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 mono text-[12px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Clear expression"
                >
                  <span>🗑️</span>
                  <span>Clear</span>
                </button>

                {/* Delete Strategy Button (if a user-saved screen is currently loaded) */}
                {currentlyLoadedUserScreen && onDeleteSavedScreen && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentStrategy}
                    className="px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white mono text-[12px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    title={`Delete "${currentlyLoadedUserScreen.name}" permanently`}
                  >
                    <span>✕</span>
                    <span>Delete Strategy</span>
                  </button>
                )}
              </div>

              {/* Live Match Counter */}
              {parseResult.valid && queryText.trim() && (
                <div className="flex items-center gap-2 mono text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {testResults.length} of {companies.length} stocks match
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Metrics Library & Snippet Inserter (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm flex flex-col max-h-[640px]">
          <div className="flex items-center justify-between mb-3">
            <span className="mono text-[13px] font-black inst-card-text uppercase tracking-wider">
              Metrics Dictionary
            </span>
            <span className="mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              {filteredMetrics.length} Available
            </span>
          </div>

          <input
            type="text"
            placeholder="Search metrics library..."
            value={metricFilter}
            onChange={(e) => setMetricFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-[12.5px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500 mb-3"
          />

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--theme-card-border)]/50 pr-1">
            {filteredMetrics.map((m) => (
              <div
                key={m.key}
                className="py-2.5 flex items-start justify-between gap-2 group"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="mono text-[12.5px] font-bold text-[var(--theme-card-text)]">
                      {m.label}
                    </span>
                    <span className="mono text-[10px] font-bold px-1.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)]">
                      {m.unit || m.dataType}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--theme-card-text-muted)] line-clamp-1 mt-0.5">
                    {m.description}
                  </div>
                  {m.benchmarkGood && (
                    <div className="text-[10.5px] mono text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                      Target: {m.benchmarkGood}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => appendCondition(m.label, '>', '15')}
                  className="px-2.5 py-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 mono text-[11.5px] font-black hover:bg-emerald-500 hover:text-slate-950 transition-all shrink-0 cursor-pointer"
                  title="Append to query"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Interactive In-Tab Test Execution Results Section ── */}
      <div className="p-6 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col gap-4">
        {/* Test Results Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="mono text-[16px] sm:text-[18px] font-black inst-card-text uppercase tracking-wide">
              Test Execution Results — {testResults.length} of {companies.length} Stocks Passed
            </h3>
            <span className="mono text-[11.5px] font-bold px-2.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
              {((testResults.length / (companies.length || 1)) * 100).toFixed(1)}% Match Rate
            </span>
            {testDurationMs > 0 && (
              <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)]">
                • Executed in {testDurationMs}ms
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Search inside test results */}
            <input
              type="text"
              placeholder="Filter test stocks..."
              value={resultsSearch}
              onChange={(e) => setResultsSearch(e.target.value)}
              className="px-3 py-1.5 rounded-xl mono text-[12px] border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
            />

            {/* Re-Run Test button */}
            <button
              type="button"
              onClick={() => runTestInTab()}
              className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 mono text-[12px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              title="Refresh and re-run test"
            >
              <span>↻</span>
              <span>Re-Test</span>
            </button>

            {/* Open in Main Screener Tab */}
            <button
              type="button"
              onClick={() => onApplyQuery(queryText)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 mono text-[12px] font-black hover:bg-emerald-400 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              title="Transfer query and view in primary Screeners table"
            >
              <span>Apply to Screener Tab ▶</span>
            </button>
          </div>
        </div>

        {/* Results Table */}
        {!parseResult.valid ? (
          <div className="py-8 text-center text-rose-600 dark:text-rose-400 mono text-[13px] font-bold">
            Fix syntax errors in the query expression above to execute the test.
          </div>
        ) : testResults.length === 0 ? (
          <div className="py-12 text-center text-[var(--theme-card-text-muted)] mono text-[13.5px]">
            {hasExecutedTest
              ? 'No companies currently match the criteria. Adjust threshold numbers above and click "Run Test".'
              : 'Click "Run Test" to evaluate this query against market stocks.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <table className="w-full border-collapse text-left mono text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] text-[11px] font-black uppercase">
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--theme-card-text)] select-none"
                    onClick={() => toggleSort('symbol')}
                  >
                    Symbol {testSortColumn === 'symbol' && (testSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-[var(--theme-card-text)] select-none"
                    onClick={() => toggleSort('name')}
                  >
                    Company Name {testSortColumn === 'name' && (testSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-4">Sector</th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-[var(--theme-card-text)] select-none"
                    onClick={() => toggleSort('currentPrice')}
                  >
                    Price ({market === 'USA' ? '$' : market === 'UAE' ? 'AED' : '₹'}) {testSortColumn === 'currentPrice' && (testSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-[var(--theme-card-text)] select-none"
                    onClick={() => toggleSort('marketCap')}
                  >
                    Market Cap ({market === 'INDIA' ? 'Cr' : 'B'}) {testSortColumn === 'marketCap' && (testSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-[var(--theme-card-text)] select-none"
                    onClick={() => toggleSort('pe')}
                  >
                    P/E {testSortColumn === 'pe' && (testSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-[var(--theme-card-text)] select-none"
                    onClick={() => toggleSort('roce')}
                  >
                    ROCE % {testSortColumn === 'roce' && (testSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-[var(--theme-card-text)] select-none"
                    onClick={() => toggleSort('roe')}
                  >
                    ROE % {testSortColumn === 'roe' && (testSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:text-[var(--theme-card-text)] select-none"
                    onClick={() => toggleSort('debtToEquity')}
                  >
                    Debt/Eq {testSortColumn === 'debtToEquity' && (testSortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/50">
                {displayedResults.map((c) => (
                  <tr
                    key={c.symbol}
                    className="hover:bg-emerald-500/5 transition-colors group cursor-default"
                  >
                    <td className="py-2.5 px-4 font-black text-emerald-700 dark:text-emerald-400">
                      {c.symbol}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-[var(--theme-card-text)]">
                      {c.name}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--theme-card-text-muted)] text-[11.5px]">
                      {c.sector}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[var(--theme-card-text)]">
                      {c.currencySymbol || (market === 'USA' ? '$' : market === 'UAE' ? 'AED ' : '₹')}{c.currentPrice?.toLocaleString() || c.currentPrice}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[var(--theme-card-text-muted)]">
                      {c.currencySymbol || (market === 'USA' ? '$' : market === 'UAE' ? 'AED ' : '₹')}{c.marketCap?.toLocaleString() || c.marketCap}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[var(--theme-card-text)]">
                      {c.pe ? `${c.pe.toFixed(1)}x` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {c.roce ? `${c.roce.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[var(--theme-card-text)]">
                      {c.roe ? `${c.roe.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[var(--theme-card-text-muted)]">
                      {c.debtToEquity != null ? c.debtToEquity.toFixed(2) : '0.00'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {onSelectCompany && (
                        <button
                          type="button"
                          onClick={() => onSelectCompany(c.symbol)}
                          className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 mono text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Inspect ↗
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Strategy Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border-2 terminal-page-panel shadow-2xl overflow-hidden bg-[var(--theme-card-bg)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="mono text-[16px] font-black inst-card-text uppercase tracking-wider">
                  {currentlyLoadedUserScreen ? 'Update Saved Strategy' : 'Save Strategy to Discover Screens'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-slate-500/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider mb-1.5">
                  Strategy Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Compounders Under 25 PE"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[14px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider mb-1.5">
                  Investment Philosophy / Thesis
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Filters companies with ROCE > 20% and net debt below 0.3 for quality compounding."
                  value={strategyDescription}
                  onChange={(e) => setStrategyDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block mono text-[12px] font-bold text-[var(--theme-card-text-muted)] uppercase tracking-wider mb-1.5">
                  Strategy Category
                </label>
                <select
                  value={strategyCategory}
                  onChange={(e) => setStrategyCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[13px] mono border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="Custom">Custom Research</option>
                  <option value="Quality">Quality & Moats</option>
                  <option value="Growth">Growth & Scale</option>
                  <option value="Valuation">Valuation & Deep Value</option>
                  <option value="Cash Flow">Cash Flow & Dividends</option>
                  <option value="Ownership">Institutional / Promoter Holding</option>
                  <option value="Special">Special Situations</option>
                </select>
              </div>

              {/* Conditions Summary */}
              <div className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="mono text-[11px] font-bold text-[var(--theme-card-text-muted)] uppercase">
                    Query Expression Preview
                  </span>
                  <span className="mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Matches {testResults.length} stocks
                  </span>
                </div>
                <pre className="mono text-[12px] font-bold text-[var(--theme-card-text)] max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {queryText}
                </pre>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--theme-card-border)] mono text-[12.5px] font-bold text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!strategyName.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 mono text-[13px] font-black hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                >
                  💾 Save Strategy to Discover Screens
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
