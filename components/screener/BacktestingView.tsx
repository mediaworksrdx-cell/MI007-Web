// ─── MI007 Quantitative Strategy Backtesting Laboratory & Portfolio ─────────
// Strategy simulation engine with performance KPIs, interactive chart launcher,
// saved portfolio persistence, and portfolio trade execution management.

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { CompanyFundamental } from '@/lib/screener/types';
import { COMBINED_STRATEGY_DEFINITIONS, StrategyId, generateCandlesForSymbol } from '@/lib/screener/technicalStrategies';
import { runBacktest, BacktestResult, BacktestTrade } from '@/lib/screener/backtesting';
import { searchZerodhaStocks } from '@/lib/screener/zerodhaStocks';

export interface SavedPortfolio {
  id: string;
  name: string;
  symbol: string;
  companyName: string;
  market: string;
  strategyId: StrategyId;
  strategyName: string;
  savedAt: string;
  initialCapital: number;
  finalEquity: number;
  totalReturnPct: number;
  winRate: number;
  totalTrades: number;
  currencySymbol: string;
  trades: BacktestTrade[];
}

const PORTFOLIO_STORAGE_KEY = 'mi007_saved_portfolios';

function loadSavedPortfolios(): SavedPortfolio[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load saved portfolios', e);
    return [];
  }
}

function persistSavedPortfolios(list: SavedPortfolio[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to persist saved portfolios', e);
  }
}

interface BacktestingViewProps {
  companies: CompanyFundamental[];
  initialSymbol?: string;
  initialStrategyId?: StrategyId;
  onBackToScreener: () => void;
  onSelectCompany: (symbol: string) => void;
}

export function BacktestingView({
  companies,
  initialSymbol = 'RELIANCE',
  initialStrategyId = 'ma_alignment',
  onBackToScreener,
  onSelectCompany,
}: BacktestingViewProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [strategyId, setStrategyId] = useState<StrategyId>(initialStrategyId);

  // Sync state when props change (e.g. clicking Backtest on a stock in Technical Strategies screener)
  useEffect(() => {
    if (initialSymbol) setSymbol(initialSymbol);
    if (initialStrategyId) setStrategyId(initialStrategyId);
  }, [initialSymbol, initialStrategyId]);
  const [initialCapital, setInitialCapital] = useState(100000);
  const [takeProfitPct, setTakeProfitPct] = useState(10);
  const [stopLossPct, setStopLossPct] = useState(5);
  const [maxHoldingDays, setMaxHoldingDays] = useState(30);
  const [positionSizePct, setPositionSizePct] = useState(100);

  // Saved Portfolios State & Modal
  const [savedPortfolios, setSavedPortfolios] = useState<SavedPortfolio[]>([]);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [portfolioViewTab, setPortfolioViewTab] = useState<'trades' | 'holdings'>('trades');
  const [justSaved, setJustSaved] = useState(false);

  // Manual exit overrides on individual simulated positions
  const [manuallyExitedTradeIds, setManuallyExitedTradeIds] = useState<number[]>([]);

  // Load saved portfolios on mount
  useEffect(() => {
    setSavedPortfolios(loadSavedPortfolios());
  }, []);

  // Active Company Object
  const activeCompany = useMemo<CompanyFundamental>(() => {
    const found = companies.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
    if (found) return found;

    // Graceful resolution for Zerodha Kite stocks or external catalog symbols
    const zd = searchZerodhaStocks(symbol, 1)[0];
    if (zd) {
      return {
        symbol: zd.symbol,
        name: zd.name,
        market: 'INDIA',
        sector: zd.sector || 'Indian Equity',
        industry: zd.sector || 'Equities',
        currentPrice: zd.lastPrice || 1000,
        priceChangePct: 1.2,
        marketCap: (zd.lastPrice || 1000) * 1000000,
        pe: 22.5,
        pb: 3.2,
        dividendYield: 1.2,
        roce: 18.5,
        roe: 16.2,
        debtToEquity: 0.35,
        eps: (zd.lastPrice || 1000) / 22.5,
        salesGrowth3Y: 14.5,
        profitGrowth3Y: 16.8,
        high52W: (zd.lastPrice || 1000) * 1.15,
        low52W: (zd.lastPrice || 1000) * 0.82,
        currencySymbol: '₹',
        isConsolidated: true,
        quarterlyResults: [],
        annualProfitLoss: [],
        balanceSheet: [],
        cashFlow: [],
        historicalRatios: [],
        shareholdingPattern: [],
      } as unknown as CompanyFundamental;
    }

    return companies[0] || ({
      symbol: symbol || 'RELIANCE',
      name: symbol || 'Reliance Industries Ltd.',
      market: 'INDIA',
      sector: 'Energy',
      industry: 'Oil & Gas',
      currentPrice: 1211.20,
      priceChangePct: 1.2,
      marketCap: 1800000,
      pe: 24.5,
      pb: 2.1,
      dividendYield: 0.8,
      roce: 12.5,
      roe: 10.5,
      debtToEquity: 0.4,
      eps: 55.4,
      salesGrowth3Y: 12.0,
      profitGrowth3Y: 10.0,
      high52W: 1350,
      low52W: 1050,
      currencySymbol: '₹',
      isConsolidated: true,
      quarterlyResults: [],
      annualProfitLoss: [],
      balanceSheet: [],
      cashFlow: [],
      historicalRatios: [],
      shareholdingPattern: [],
    } as unknown as CompanyFundamental);
  }, [companies, symbol]);

  // Run Backtest
  const backtestResult = useMemo<BacktestResult>(() => {
    const candles = generateCandlesForSymbol(
      activeCompany.symbol,
      activeCompany.currentPrice,
      activeCompany.priceChangePct,
      300
    );
    return runBacktest({
      symbol: activeCompany.symbol,
      strategyId,
      initialCapital,
      takeProfitPct,
      stopLossPct,
      maxHoldingDays,
      positionSizePct,
      candles,
    });
  }, [activeCompany, strategyId, initialCapital, takeProfitPct, stopLossPct, maxHoldingDays, positionSizePct]);

  const activeStrategy = COMBINED_STRATEGY_DEFINITIONS.find((s) => s.id === strategyId);

  // Strategy-specific chart link ensuring only this strategy's corresponding indicators/SMC state render
  const strategyChartHref = useMemo(() => {
    const isSmc = strategyId.startsWith('smc_');
    const indList: string[] = [];
    if (strategyId === 'ma_alignment' || strategyId === 'golden_cross' || strategyId === 'death_cross') {
      indList.push('sma50', 'sma200');
    } else if (strategyId === 'ma_20_50_cross') {
      indList.push('sma20', 'sma50');
    } else if (strategyId === 'ema_9_21_cross') {
      indList.push('ema9', 'ema21');
    } else if (strategyId === 'rsi_momentum') {
      indList.push('rsi');
    } else if (strategyId === 'macd_cross') {
      indList.push('macd');
    } else if (strategyId === 'bb_reversal') {
      indList.push('bollinger');
    } else if (strategyId === 'breakout') {
      indList.push('donchian');
    } else if (strategyId === 'adx_trend') {
      indList.push('adx', 'ema9', 'ema21');
    }
    const stratParam = encodeURIComponent(strategyId);
    const indParam = encodeURIComponent(indList.join(','));
    return `/chart/${activeCompany.symbol}?market=${activeCompany.market}&tf=1D&smc=${isSmc ? `1&setupId=${strategyId}` : '0'}&strategies=${stratParam}&indicators=${indParam}&from=screener`;
  }, [activeCompany.symbol, activeCompany.market, strategyId]);

  // Adjusted trades with any manual user exits applied
  const displayedTrades = useMemo<BacktestTrade[]>(() => {
    return backtestResult.trades.map((t) => {
      if (manuallyExitedTradeIds.includes(t.tradeId)) {
        return {
          ...t,
          exitReason: 'Manual Exit (User Closed)' as const,
        };
      }
      return t;
    });
  }, [backtestResult.trades, manuallyExitedTradeIds]);

  // Add current simulated stock & strategy to portfolio
  const handleAddToPortfolio = () => {
    const newPortfolio: SavedPortfolio = {
      id: `pf_${Date.now()}_${activeCompany.symbol}`,
      name: `${activeCompany.symbol} ${activeStrategy?.name || strategyId}`,
      symbol: activeCompany.symbol,
      companyName: activeCompany.name,
      market: activeCompany.market,
      strategyId,
      strategyName: activeStrategy?.name || strategyId,
      savedAt: new Date().toISOString(),
      initialCapital,
      finalEquity: backtestResult.finalEquity,
      totalReturnPct: backtestResult.totalReturnPct,
      winRate: backtestResult.winRate,
      totalTrades: displayedTrades.length,
      currencySymbol: activeCompany.currencySymbol,
      trades: displayedTrades,
    };

    const updated = [newPortfolio, ...savedPortfolios.filter((p) => !(p.symbol === activeCompany.symbol && p.strategyId === strategyId))];
    setSavedPortfolios(updated);
    persistSavedPortfolios(updated);
    setPortfolioViewTab('holdings');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);

    setSaveFeedback(`✓ Saved & Added ${activeCompany.symbol} (${activeStrategy?.name || strategyId}) to Portfolio! Capital: ${activeCompany.currencySymbol}${Number(initialCapital).toLocaleString()}`);
    setTimeout(() => setSaveFeedback(null), 5000);
  };

  // Save current simulated portfolio and open Saved Portfolios Manager
  const handleSavePortfolio = () => {
    handleAddToPortfolio();
    setIsSavedModalOpen(true);
  };

  // Load a saved portfolio into active parameters
  const handleLoadPortfolio = (pf: SavedPortfolio) => {
    setSymbol(pf.symbol);
    setStrategyId(pf.strategyId);
    setInitialCapital(pf.initialCapital);
    setIsSavedModalOpen(false);
    setSaveFeedback(`Loaded portfolio: ${pf.name}`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // Delete a saved portfolio
  const handleDeletePortfolio = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPortfolios.filter((p) => p.id !== id);
    setSavedPortfolios(updated);
    persistSavedPortfolios(updated);
  };

  // Manual exit position
  const handleManualExitTrade = (tradeId: number) => {
    if (manuallyExitedTradeIds.includes(tradeId)) return;
    setManuallyExitedTradeIds((prev) => [...prev, tradeId]);
    setSaveFeedback(`Position #${tradeId} manually closed.`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // Exit all positions in portfolio
  const handleExitAllPositions = () => {
    const allIds = backtestResult.trades.map((t) => t.tradeId);
    setManuallyExitedTradeIds(allIds);
    setSaveFeedback(`All ${allIds.length} positions in portfolio closed.`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  // Export Portfolio to CSV
  const exportPortfolioCSV = (tradesToExport = displayedTrades, customName?: string) => {
    const headers = [
      'Trade ID',
      'Symbol',
      'Strategy',
      'Entry Date',
      'Entry Price',
      'Exit Date',
      'Exit Price',
      'Shares',
      `PnL (${activeCompany.currencySymbol})`,
      'Return (%)',
      'Holding Days',
      'Exit Reason',
    ];
    const rows = tradesToExport.map((t) => [
      t.tradeId,
      t.symbol,
      t.strategyId,
      t.entryDate,
      t.entryPrice,
      t.exitDate,
      t.exitPrice,
      t.shares,
      t.pnl,
      `${t.returnPct}%`,
      t.holdingDays,
      `"${t.exitReason}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', customName || `MI007_Portfolio_${symbol}_${strategyId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToScreener}
            className="px-3.5 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 mono text-[12px] font-black shadow-xs cursor-pointer group"
            title="Exit back to Screener"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>EXIT TO SCREENER</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
                Quantitative Strategy Portfolio & Engine
              </h1>
              <span className="mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                Portfolio Simulation
              </span>
            </div>
            <p className="text-[12.5px] text-[var(--theme-card-text-muted)] font-medium mt-0.5">
              Simulate quantitative execution rules, track holdings, analyze risk/reward, and save strategy portfolios.
            </p>
          </div>
        </div>

        {/* Header Action Buttons: Add to Portfolio, View Chart, Save Portfolio, Saved Portfolios, Export CSV, Exit */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add to Portfolio Button */}
          <button
            type="button"
            onClick={handleAddToPortfolio}
            className={`px-3.5 py-2 rounded-xl font-black mono text-[12px] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              justSaved
                ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
            title="Add current stock strategy simulation to Portfolio"
          >
            <span className="font-black text-sm">{justSaved ? '✓' : '+'}</span>
            <span>{justSaved ? 'ADDED!' : 'ADD TO PORTFOLIO'}</span>
          </button>

          {/* View Chart Link */}
          <Link
            href={strategyChartHref}
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('mi007_return_tab', 'backtesting');
                sessionStorage.setItem('mi007_return_symbol', activeCompany.symbol);
              }
            }}
            className="px-3.5 py-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-black mono text-[12px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer group"
            title={`View Interactive Chart for ${activeCompany.symbol}`}
          >
            <span>📈 VIEW CHART</span>
            <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
          </Link>

          {/* Save Portfolio Button */}
          <button
            type="button"
            onClick={handleSavePortfolio}
            className={`px-3.5 py-2 rounded-xl font-bold mono text-[12px] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              justSaved
                ? 'bg-emerald-500 text-slate-950 border border-emerald-400 font-black'
                : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
            }`}
            title="Save current simulation and open portfolio manager"
          >
            <span>{justSaved ? '✓ SAVED!' : '💾 SAVE PORTFOLIO'}</span>
          </button>

          {/* Saved Portfolios Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsSavedModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 mono text-[12px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="View saved portfolios"
          >
            <span>📁 SAVED ({savedPortfolios.length})</span>
          </button>

          {/* Export Portfolio CSV */}
          <button
            type="button"
            onClick={() => exportPortfolioCSV()}
            className="px-3.5 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 mono text-[12px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Export portfolio trades to CSV"
          >
            <span>Export CSV</span>
            <span>↓</span>
          </button>

          {/* Explicit Exit Button */}
          <button
            type="button"
            onClick={onBackToScreener}
            className="px-3.5 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white mono text-[12px] font-black transition-all shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
            title="Exit to Screener"
          >
            <span>✕ EXIT</span>
          </button>
        </div>
      </div>

      {/* ── Fixed Floating Toast Feedback Notification (Always visible at any scroll depth) ── */}
      {saveFeedback && (
        <div className="fixed bottom-6 right-6 z-50 max-w-lg p-4 rounded-2xl border-2 border-emerald-500/60 bg-slate-950/95 dark:bg-slate-950/95 text-white shadow-2xl backdrop-blur-md mono text-[12.5px] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shrink-0 shadow-sm">
              ✓
            </span>
            <span className="font-bold text-emerald-300 truncate">{saveFeedback}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSavedModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black cursor-pointer shadow-xs transition-transform active:scale-95"
            >
              📁 VIEW SAVED
            </button>
            <button
              type="button"
              onClick={() => setSaveFeedback(null)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-black text-sm flex items-center justify-center cursor-pointer transition-colors"
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Simulation Parameters Panel ── */}
      <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)] mb-4">
          <div>
            <span className="mono text-[13px] font-black inst-card-text uppercase tracking-wide">
              Strategy Simulation Parameters
            </span>
            <span className="text-[11px] mono text-[var(--theme-card-text-muted)] block mt-0.5">
              Pegged to live ticks and multi-year OHLCV candle series
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddToPortfolio}
              className={`px-4 py-2 rounded-xl font-black mono text-[12.5px] shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                justSaved
                  ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
              title={`Add ${activeCompany.symbol} (${activeStrategy?.name || strategyId}) to Portfolio`}
            >
              <span className="font-black text-sm">{justSaved ? '✓' : '+'}</span>
              <span>{justSaved ? 'ADDED!' : 'ADD TO PORTFOLIO'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Symbol */}
          <div>
            <label className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block mb-1">
              Symbol
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
            >
              {!companies.some((c) => c.symbol.toUpperCase() === symbol.toUpperCase()) && (
                <option value={symbol} className="bg-[var(--theme-card-surface)] text-[var(--theme-card-text)]">
                  {symbol} ({activeCompany.name})
                </option>
              )}
              {companies.map((c) => (
                <option key={c.symbol} value={c.symbol} className="bg-[var(--theme-card-surface)] text-[var(--theme-card-text)]">
                  {c.symbol} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block mb-1">
              Strategy
            </label>
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value as StrategyId)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
            >
              {COMBINED_STRATEGY_DEFINITIONS.map((s) => (
                <option key={s.id} value={s.id} className="bg-[var(--theme-card-surface)] text-[var(--theme-card-text)]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Capital */}
          <div>
            <label className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block mb-1">
              Initial Capital ({activeCompany.currencySymbol})
            </label>
            <input
              type="number"
              value={initialCapital || ''}
              placeholder="100000"
              onChange={(e) => setInitialCapital(e.target.value === '' ? ('' as any) : Number(e.target.value))}
              step={10000}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block mb-1">
              Take Profit Target %
            </label>
            <input
              type="number"
              value={takeProfitPct || ''}
              placeholder="10"
              onChange={(e) => setTakeProfitPct(e.target.value === '' ? ('' as any) : Number(e.target.value))}
              step={1}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block mb-1">
              Stop Loss Target %
            </label>
            <input
              type="number"
              value={stopLossPct || ''}
              placeholder="5"
              onChange={(e) => setStopLossPct(e.target.value === '' ? ('' as any) : Number(e.target.value))}
              step={1}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Max Holding Days */}
          <div>
            <label className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block mb-1">
              Max Holding Days
            </label>
            <input
              type="number"
              value={maxHoldingDays || ''}
              placeholder="30"
              onChange={(e) => setMaxHoldingDays(e.target.value === '' ? ('' as any) : Number(e.target.value))}
              step={5}
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Action Toolbar directly below parameter inputs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 mt-4 border-t border-[var(--theme-card-border)]/60">
          <div className="flex items-center gap-2 text-[12px] mono text-[var(--theme-card-text-muted)]">
            <span>Configured for:</span>
            <span className="font-black text-emerald-400">{activeCompany.symbol}</span>
            <span className="text-[11px]">({activeCompany.name})</span>
            <span>·</span>
            <span className="font-bold text-[var(--theme-card-text)]">{activeStrategy?.name || strategyId}</span>
            <span>·</span>
            <span>Capital: {activeCompany.currencySymbol}{Number(initialCapital).toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleAddToPortfolio}
              className={`px-5 py-2.5 rounded-xl font-black mono text-[13px] shadow-sm transition-all cursor-pointer flex items-center gap-2 group active:scale-95 ${
                justSaved
                  ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
              title={`Add ${activeCompany.symbol} (${activeStrategy?.name || strategyId}) to Portfolio`}
            >
              <span className="text-base group-hover:scale-125 transition-transform font-black">
                {justSaved ? '✓' : '+'}
              </span>
              <span>{justSaved ? 'ADDED TO PORTFOLIO!' : 'ADD TO PORTFOLIO'}</span>
            </button>
            <button
              type="button"
              onClick={handleSavePortfolio}
              className={`px-4 py-2.5 rounded-xl font-black mono text-[12.5px] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                justSaved
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                  : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
              }`}
              title="Save this portfolio simulation and open manager"
            >
              <span>{justSaved ? '✓ SAVED!' : '💾 SAVE PORTFOLIO'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Backtest Performance Scorecard KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block">
            Strategy Return
          </span>
          <div className="mono text-[20px] font-black text-emerald-400 mt-1">
            {backtestResult.totalReturnPct >= 0 ? '+' : ''}{backtestResult.totalReturnPct}%
          </div>
          <span className="text-[10px] mono text-[var(--theme-card-text-muted)] block mt-0.5">
            Final Equity: {activeCompany.currencySymbol}{backtestResult.finalEquity.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block">
            Buy & Hold Return
          </span>
          <div className="mono text-[20px] font-black text-[var(--theme-card-text)] mt-1">
            {backtestResult.benchmarkReturnPct >= 0 ? '+' : ''}{backtestResult.benchmarkReturnPct}%
          </div>
          <span className="text-[10px] mono text-emerald-400 font-bold block mt-0.5">
            Alpha: {backtestResult.alphaPct >= 0 ? '+' : ''}{backtestResult.alphaPct}%
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block">
            Win Rate
          </span>
          <div className="mono text-[20px] font-black text-emerald-400 mt-1">
            {backtestResult.winRate}%
          </div>
          <span className="text-[10px] mono text-[var(--theme-card-text-muted)] block mt-0.5">
            {backtestResult.winningTrades} Wins / {backtestResult.losingTrades} Losses
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block">
            Profit Factor
          </span>
          <div className="mono text-[20px] font-black text-[var(--theme-card-text)] mt-1">
            {backtestResult.profitFactor.toFixed(2)}
          </div>
          <span className="text-[10px] mono text-[var(--theme-card-text-muted)] block mt-0.5">
            Gross Profit / Gross Loss
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block">
            Max Drawdown
          </span>
          <div className="mono text-[20px] font-black text-rose-400 mt-1">
            -{backtestResult.maxDrawdownPct}%
          </div>
          <span className="text-[10px] mono text-[var(--theme-card-text-muted)] block mt-0.5">
            Peak to trough variance
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block">
            Risk / Reward
          </span>
          <div className="mono text-[20px] font-black text-[var(--theme-card-text)] mt-1">
            {backtestResult.riskRewardRatio.toFixed(2)}
          </div>
          <span className="text-[10px] mono text-[var(--theme-card-text-muted)] block mt-0.5">
            Avg Win +{backtestResult.avgWinPct}% / Loss -{backtestResult.avgLossPct}%
          </span>
        </div>
      </div>

      {/* ── Interactive Technical Chart Banner (Replaces SVG Chart) ── */}
      <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl shrink-0">
            📈
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="mono text-[15px] sm:text-[17px] font-black inst-card-text uppercase tracking-wide">
                Interactive Chart for {activeCompany.symbol} ({activeCompany.name})
              </span>
              <span className="mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                Live Technical Canvas
              </span>
            </div>
            <p className="text-[12px] text-[var(--theme-card-text-muted)] mt-1 max-w-2xl leading-relaxed">
              Open our full-featured interactive TradingView/Canvas candlestick chart with multi-timeframe candles, technical overlays (RSI, MACD, Bollinger Bands, EMAs), drawing tools, and real-time tick streaming.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          <Link
            href={strategyChartHref}
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('mi007_return_tab', 'backtesting');
                sessionStorage.setItem('mi007_return_symbol', activeCompany.symbol);
              }
            }}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black mono text-[13px] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer group"
            title={`Open full interactive chart for ${activeCompany.symbol}`}
          >
            <span>VIEW {activeCompany.symbol} CHART</span>
            <span className="group-hover:translate-x-0.5 transition-transform">↗</span>
          </Link>
        </div>
      </div>

      {/* ── Detailed PORTFOLIO Table (Changed from Walk-Forward Trade Log) ── */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden flex flex-col">
        {/* Portfolio Card Header with Tabs, Add to Portfolio, Save, Export CSV, and Exit Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="mono text-[15px] sm:text-[16px] font-black inst-card-text uppercase tracking-wide">
              PORTFOLIO
            </span>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              <button
                type="button"
                onClick={() => setPortfolioViewTab('trades')}
                className={`px-3 py-1.5 rounded-lg mono text-[11.5px] font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  portfolioViewTab === 'trades'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm border border-emerald-400'
                    : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-emerald-500/10 border border-transparent'
                }`}
              >
                <span>📊</span>
                <span>Simulation Trades ({displayedTrades.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPortfolioViewTab('holdings')}
                className={`px-3 py-1.5 rounded-lg mono text-[11.5px] font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  portfolioViewTab === 'holdings'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm border border-emerald-400'
                    : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-emerald-500/10 border border-transparent'
                }`}
              >
                <span>💼</span>
                <span>Added Holdings ({savedPortfolios.length})</span>
              </button>
            </div>
          </div>

          {/* Action Toolbar on Portfolio Section */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Add to Portfolio Button */}
            <button
              type="button"
              onClick={handleAddToPortfolio}
              className={`px-3 py-1.5 rounded-xl font-black mono text-[11.5px] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                justSaved
                  ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
              title={`Add ${activeCompany.symbol} (${activeStrategy?.name || strategyId}) to Portfolio`}
            >
              <span className="font-black text-sm">{justSaved ? '✓' : '+'}</span>
              <span>{justSaved ? 'ADDED!' : 'ADD TO PORTFOLIO'}</span>
            </button>

            {/* Save Portfolio Option */}
            <button
              type="button"
              onClick={handleSavePortfolio}
              className={`px-3 py-1.5 rounded-xl font-bold mono text-[11.5px] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                justSaved
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-400 font-black'
                  : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
              }`}
              title="Save this portfolio simulation and open manager"
            >
              <span>{justSaved ? '✓ SAVED!' : '💾 SAVE PORTFOLIO'}</span>
            </button>

            {/* View Saved Portfolios Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsSavedModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 mono text-[11.5px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="View all saved portfolios"
            >
              <span>📁 SAVED ({savedPortfolios.length})</span>
            </button>

            {/* Exit All Positions Option (Only in trades view) */}
            {portfolioViewTab === 'trades' && displayedTrades.length > 0 && (
              <button
                type="button"
                onClick={handleExitAllPositions}
                className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 mono text-[11.5px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                title="Manually exit all open positions"
              >
                <span>⚡ EXIT ALL POSITIONS</span>
              </button>
            )}

            {/* Export CSV Option */}
            <button
              type="button"
              onClick={() => {
                if (portfolioViewTab === 'trades') {
                  exportPortfolioCSV();
                } else {
                  const headers = 'Symbol,Name,Strategy,Initial Capital,Final Equity,Return %,Win Rate %,Trades,Saved At\n';
                  const rows = savedPortfolios
                    .map(
                      (p) =>
                        `"${p.symbol}","${p.companyName}","${p.strategyName}",${p.initialCapital},${p.finalEquity},${p.totalReturnPct},${p.winRate},${p.totalTrades},"${p.savedAt}"`
                    )
                    .join('\n');
                  const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `MI007_Portfolio_Holdings_${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 mono text-[11.5px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              title="Export portfolio to CSV"
            >
              <span>Export CSV ↓</span>
            </button>

            {/* Exit Option right in Portfolio Card */}
            <button
              type="button"
              onClick={onBackToScreener}
              className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white mono text-[11.5px] font-black transition-all shadow-xs cursor-pointer flex items-center gap-1"
              title="Exit portfolio and return to screener"
            >
              <span>✕ EXIT</span>
            </button>
          </div>
        </div>

        {/* Portfolio Table - Conditional Switch between Holdings and Trades */}
        {portfolioViewTab === 'holdings' ? (
          <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
            <table className="w-full border-collapse text-left mono text-[12px]">
              <thead className="sticky top-0 z-10 bg-[var(--theme-card-surface)] border-b border-[var(--theme-card-border)] shadow-xs">
                <tr className="text-[10.5px] text-[var(--theme-card-text-muted)] font-black uppercase tracking-wider">
                  <th className="py-2 px-2.5">Symbol</th>
                  <th className="py-2 px-2.5">Strategy</th>
                  <th className="py-2 px-2.5 text-right">Capital</th>
                  <th className="py-2 px-2.5 text-right">Equity</th>
                  <th className="py-2 px-2.5 text-right">Return</th>
                  <th className="py-2 px-2.5 text-right">Win %</th>
                  <th className="py-2 px-2.5 text-right">Trades</th>
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
                {savedPortfolios.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[var(--theme-card-text-muted)] mono">
                      <p className="font-bold text-[13px] mb-1">No stocks added to portfolio yet</p>
                      <p className="text-[11.5px] opacity-75">
                        Configure your parameters above and click &quot;+ ADD TO PORTFOLIO&quot; to track your stock strategies here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  savedPortfolios.map((pf) => {
                    const isProfit = pf.totalReturnPct >= 0;
                    return (
                      <tr key={pf.id} className="hover:bg-emerald-500/5 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-400">{pf.symbol}</span>
                            <span className="text-[11px] text-[var(--theme-card-text-muted)] font-normal hidden sm:inline">
                              {pf.companyName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {pf.strategyName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--theme-card-text)] font-bold">
                          {pf.currencySymbol}{Number(pf.initialCapital).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--theme-card-text)] font-bold">
                          {pf.currencySymbol}{Number(pf.finalEquity).toLocaleString()}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pf.totalReturnPct >= 0 ? '+' : ''}{pf.totalReturnPct}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--theme-card-text)] font-bold">
                          {pf.winRate}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--theme-card-text-muted)]">
                          {pf.totalTrades}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)] text-[11px]">
                          {new Date(pf.savedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleLoadPortfolio(pf)}
                              className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 mono text-[10.5px] font-black transition-colors cursor-pointer"
                              title="Load this portfolio configuration into simulator"
                            >
                              ⚡ LOAD
                            </button>
                            <Link
                              href={`/chart/${pf.symbol}?market=${pf.market}&from=screener`}
                              className="px-2 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 mono text-[10.5px] font-bold transition-colors cursor-pointer"
                              title={`View ${pf.symbol} interactive chart`}
                            >
                              📈 CHART
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => handleDeletePortfolio(pf.id, e)}
                              className="px-2 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white mono text-[10.5px] font-bold transition-colors cursor-pointer"
                              title="Remove from portfolio"
                            >
                              ✕ REMOVE
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
            <table className="w-full border-collapse text-left mono text-[12px]">
              <thead className="sticky top-0 z-10 bg-[var(--theme-card-surface)] border-b border-[var(--theme-card-border)] shadow-xs">
                <tr className="text-[10.5px] text-[var(--theme-card-text-muted)] font-black uppercase tracking-wider">
                  <th className="py-2 px-2.5">#</th>
                  <th className="py-2 px-2.5">Entry Date</th>
                  <th className="py-2 px-2.5 text-right">Entry</th>
                  <th className="py-2 px-2.5">Exit Date</th>
                  <th className="py-2 px-2.5 text-right">Exit</th>
                  <th className="py-2 px-2.5 text-right">Shares</th>
                  <th className="py-2 px-2.5 text-right">PnL</th>
                  <th className="py-2 px-2.5 text-right">Return</th>
                  <th className="py-2 px-2.5 text-right">Days</th>
                  <th className="py-2 px-2.5 text-center">Trigger</th>
                  <th className="py-2 px-2.5 text-center">Option</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
                {displayedTrades.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-[var(--theme-card-text-muted)]">
                      No closed positions generated under selected parameters.
                    </td>
                  </tr>
                ) : (
                  displayedTrades.map((trade) => {
                    const isProfit = trade.pnl > 0;
                    const isManuallyExited = manuallyExitedTradeIds.includes(trade.tradeId);

                    return (
                      <tr key={trade.tradeId} className="hover:bg-emerald-500/5 transition-colors">
                        <td className="py-2.5 px-3 text-[var(--theme-card-text-muted)] font-bold">{trade.tradeId}</td>
                        <td className="py-2.5 px-3 text-[var(--theme-card-text)]">{trade.entryDate}</td>
                        <td className="py-2.5 px-3 text-right text-[var(--theme-card-text)] font-bold">
                          {activeCompany.currencySymbol}{trade.entryPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--theme-card-text)]">{trade.exitDate}</td>
                        <td className="py-2.5 px-3 text-right text-[var(--theme-card-text)] font-bold">
                          {activeCompany.currencySymbol}{trade.exitPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--theme-card-text)]">{trade.shares}</td>
                        <td className={`py-2.5 px-3 text-right font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{activeCompany.currencySymbol}{trade.pnl.toLocaleString()}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.returnPct >= 0 ? '+' : ''}{trade.returnPct}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--theme-card-text-muted)]">{trade.holdingDays}d</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10.5px] font-black ${
                              trade.exitReason === 'Take Profit'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : trade.exitReason === 'Stop Loss'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : isManuallyExited
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {trade.exitReason}
                          </span>
                        </td>

                        {/* Exit Option Action Column */}
                        <td className="py-2.5 px-3 text-center">
                          {isManuallyExited ? (
                            <span className="mono text-[10.5px] text-amber-500 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                              Exited ✓
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleManualExitTrade(trade.tradeId)}
                              className="px-2.5 py-0.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white mono text-[10.5px] font-bold transition-all cursor-pointer"
                              title={`Exit position #${trade.tradeId}`}
                            >
                              Exit Trade
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Portfolio Table Footer & Quick Exit */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-5 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="flex items-center gap-4 text-[12px] mono font-bold text-[var(--theme-card-text-muted)]">
            {portfolioViewTab === 'holdings' ? (
              <>
                <span>Added Portfolio Holdings: {savedPortfolios.length}</span>
                <span>
                  Total Capital:{' '}
                  {activeCompany.currencySymbol}
                  {savedPortfolios.reduce((acc, p) => acc + (p.initialCapital || 0), 0).toLocaleString()}
                </span>
              </>
            ) : (
              <>
                <span>Total Portfolio Positions: {displayedTrades.length}</span>
                <span>Final Equity: {activeCompany.currencySymbol}{backtestResult.finalEquity.toLocaleString()}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAddToPortfolio}
              className={`px-3.5 py-1.5 rounded-xl font-black mono text-[11.5px] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                justSaved
                  ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              <span className="font-black text-sm">{justSaved ? '✓' : '+'}</span>
              <span>{justSaved ? 'ADDED!' : 'ADD TO PORTFOLIO'}</span>
            </button>
            <button
              type="button"
              onClick={handleSavePortfolio}
              className={`px-3.5 py-1.5 rounded-xl font-black mono text-[11.5px] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                justSaved
                  ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                  : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950'
              }`}
            >
              <span>{justSaved ? '✓ SAVED!' : '💾 SAVE PORTFOLIO'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSavedModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 mono text-[11.5px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>📁 SAVED ({savedPortfolios.length})</span>
            </button>
            <button
              type="button"
              onClick={onBackToScreener}
              className="px-3.5 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white mono text-[11.5px] font-black transition-all shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <span>← EXIT TO SCREENER</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Saved Portfolios Modal ── */}
      {isSavedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              <div className="flex items-center gap-2.5">
                <span className="mono text-[16px] font-black inst-card-text uppercase tracking-wide">
                  Saved Portfolios ({savedPortfolios.length})
                </span>
                <span className="mono text-[10.5px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                  LocalStorage Tracked
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSavedModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-slate-500/10 transition-colors cursor-pointer"
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal List */}
            <div className="p-5 overflow-y-auto flex flex-col gap-3">
              {savedPortfolios.length === 0 ? (
                <div className="py-12 text-center text-[var(--theme-card-text-muted)] mono text-[13px]">
                  <p className="font-bold mb-1">No saved portfolios found</p>
                  <p className="text-[11.5px] opacity-70">
                    Click &quot;💾 SAVE PORTFOLIO&quot; on any backtest simulation to store and track your strategies here.
                  </p>
                </div>
              ) : (
                savedPortfolios.map((pf) => (
                  <div
                    key={pf.id}
                    className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="mono text-[14px] font-black text-emerald-400">{pf.symbol}</span>
                        <span className="text-[12px] text-[var(--theme-card-text-muted)] font-medium">({pf.companyName})</span>
                        <span className="mono text-[10.5px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                          {pf.strategyName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 mono text-[11px] text-[var(--theme-card-text-muted)]">
                        <span>Capital: {pf.currencySymbol}{pf.initialCapital.toLocaleString()}</span>
                        <span>Final: {pf.currencySymbol}{pf.finalEquity.toLocaleString()}</span>
                        <span className={pf.totalReturnPct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          Return: {pf.totalReturnPct >= 0 ? '+' : ''}{pf.totalReturnPct}%
                        </span>
                        <span>Win Rate: {pf.winRate}%</span>
                      </div>
                      <span className="text-[10px] mono text-[var(--theme-card-text-muted)] block mt-1 opacity-70">
                        Saved on {new Date(pf.savedAt).toLocaleDateString()} at {new Date(pf.savedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleLoadPortfolio(pf)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 mono text-[11px] font-black transition-colors cursor-pointer"
                        title="Load this portfolio into simulation parameters"
                      >
                        ⚡ LOAD
                      </button>
                      <Link
                        href={`/chart/${pf.symbol}?market=${pf.market}&from=screener`}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 mono text-[11px] font-bold transition-colors cursor-pointer"
                        title={`View ${pf.symbol} interactive chart`}
                      >
                        📈 CHART
                      </Link>
                      <button
                        type="button"
                        onClick={() => exportPortfolioCSV(pf.trades, `MI007_Portfolio_${pf.symbol}_${pf.strategyId}.csv`)}
                        className="px-2.5 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] hover:text-emerald-400 mono text-[11px] font-bold transition-colors cursor-pointer"
                        title="Export CSV"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePortfolio(pf.id, e)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white mono text-[11px] font-bold transition-colors cursor-pointer"
                        title="Delete saved portfolio"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              <span className="mono text-[11px] text-[var(--theme-card-text-muted)]">
                {savedPortfolios.length} Total Portfolios Stored
              </span>
              <button
                type="button"
                onClick={() => setIsSavedModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] hover:text-emerald-400 mono text-[12px] font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
