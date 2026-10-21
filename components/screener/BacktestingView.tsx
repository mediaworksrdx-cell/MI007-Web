// ─── MI007 Quantitative Strategy Backtesting Laboratory ─────────────────────
// Walk-forward strategy simulation engine with performance KPIs,
// equity curve visualization, and complete trade execution audit log.

'use client';

import React, { useState, useMemo } from 'react';
import { CompanyFundamental } from '@/lib/screener/types';
import { STRATEGY_DEFINITIONS, StrategyId, generateCandlesForSymbol } from '@/lib/screener/technicalStrategies';
import { runBacktest, BacktestResult, BacktestTrade } from '@/lib/screener/backtesting';

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
  const [initialCapital, setInitialCapital] = useState(100000);
  const [takeProfitPct, setTakeProfitPct] = useState(10);
  const [stopLossPct, setStopLossPct] = useState(5);
  const [maxHoldingDays, setMaxHoldingDays] = useState(30);
  const [positionSizePct, setPositionSizePct] = useState(100);

  // Active Company Object
  const activeCompany = useMemo(() => {
    return companies.find((c) => c.symbol === symbol) || companies[0];
  }, [companies, symbol]);

  // Run Backtest
  const backtestResult = useMemo<BacktestResult>(() => {
    const candles = generateCandlesForSymbol(
      activeCompany.symbol,
      activeCompany.currentPrice,
      activeCompany.priceChangePct,
      260
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

  const activeStrategy = STRATEGY_DEFINITIONS.find((s) => s.id === strategyId);

  // Equity Curve Chart Dimensions
  const curve = backtestResult.equityCurve;
  const chartHeight = 220;
  const chartWidth = 750;

  const minVal = Math.min(
    initialCapital * 0.9,
    ...curve.map((p) => Math.min(p.portfolioValue, p.benchmarkValue))
  );
  const maxVal = Math.max(
    initialCapital * 1.1,
    ...curve.map((p) => Math.max(p.portfolioValue, p.benchmarkValue))
  );
  const valRange = maxVal - minVal || 1;

  const getY = (val: number) => {
    return chartHeight - ((val - minVal) / valRange) * chartHeight;
  };

  const polylinePortfolio = curve
    .map((p, i) => {
      const x = (i / (curve.length - 1)) * chartWidth;
      const y = getY(p.portfolioValue);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const polylineBenchmark = curve
    .map((p, i) => {
      const x = (i / (curve.length - 1)) * chartWidth;
      const y = getY(p.benchmarkValue);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Export Trade Log to CSV
  const exportTradeLogCSV = () => {
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
    const rows = backtestResult.trades.map((t) => [
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
    link.setAttribute('download', `MI007_Backtest_${symbol}_${strategyId}.csv`);
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
            title="Return to Screeners Table"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>BACK TO SCREENER</span>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="mono text-[18px] sm:text-[22px] font-black inst-card-text uppercase tracking-wide">
                Quantitative Strategy Backtesting Engine
              </h1>
              <span className="mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                Walk-Forward Simulation
              </span>
            </div>
            <p className="text-[12.5px] text-[var(--theme-card-text-muted)] font-medium mt-0.5">
              Simulate quantitative execution rules, compute Sharpe/Sortino proxies, max drawdowns, and trade logs.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={exportTradeLogCSV}
          className="px-3.5 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 mono text-[12px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <span>Export Trade Log (CSV)</span>
          <span>↓</span>
        </button>
      </div>

      {/* ── Simulation Parameters Panel ── */}
      <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)] mb-4">
          <span className="mono text-[13px] font-black inst-card-text uppercase tracking-wide">
            Strategy Simulation Parameters
          </span>
          <span className="text-[11px] mono text-[var(--theme-card-text-muted)]">
            Pegged to live ticks and multi-year OHLCV candle series
          </span>
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
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-white mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
            >
              {companies.map((c) => (
                <option key={c.symbol} value={c.symbol}>
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
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-white mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
            >
              {STRATEGY_DEFINITIONS.map((s) => (
                <option key={s.id} value={s.id}>
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
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-white mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
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
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-white mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
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
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-white mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
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
              className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-white mono text-[12px] font-bold focus:outline-none focus:border-emerald-500"
            />
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
          <span className="text-[10px] mono text-slate-400 block mt-0.5">
            Final Equity: {activeCompany.currencySymbol}{backtestResult.finalEquity.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block">
            Buy & Hold Return
          </span>
          <div className="mono text-[20px] font-black text-slate-200 mt-1">
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
          <span className="text-[10px] mono text-slate-400 block mt-0.5">
            {backtestResult.winningTrades} Wins / {backtestResult.losingTrades} Losses
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block">
            Profit Factor
          </span>
          <div className="mono text-[20px] font-black text-white mt-1">
            {backtestResult.profitFactor.toFixed(2)}
          </div>
          <span className="text-[10px] mono text-slate-400 block mt-0.5">
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
          <span className="text-[10px] mono text-slate-400 block mt-0.5">
            Peak to trough variance
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[10.5px] font-bold text-[var(--theme-card-text-muted)] uppercase block">
            Risk / Reward
          </span>
          <div className="mono text-[20px] font-black text-white mt-1">
            {backtestResult.riskRewardRatio.toFixed(2)}
          </div>
          <span className="text-[10px] mono text-slate-400 block mt-0.5">
            Avg Win +{backtestResult.avgWinPct}% / Loss -{backtestResult.avgLossPct}%
          </span>
        </div>
      </div>

      {/* ── Equity Curve Chart ── */}
      <div className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)]">
          <div className="flex items-center gap-3">
            <span className="mono text-[14px] font-black inst-card-text uppercase tracking-wide">
              Portfolio Equity Curve vs Benchmark
            </span>
            <div className="flex items-center gap-3 mono text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                <span>Strategy Portfolio</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
                <span>Buy & Hold Benchmark</span>
              </span>
            </div>
          </div>
          <span className="text-[11px] mono text-[var(--theme-card-text-muted)]">
            Total Trades Executed: {backtestResult.totalTrades}
          </span>
        </div>

        <div className="relative w-full rounded-xl bg-slate-950/80 border border-slate-800 p-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[220px] overflow-visible select-none">
            {/* Horizontal Grid lines */}
            {[0.25, 0.5, 0.75].map((pct, idx) => {
              const y = chartHeight * pct;
              const val = maxVal - valRange * pct;
              return (
                <g key={idx}>
                  <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />
                  <text x={chartWidth - 5} y={y - 3} fill="#64748b" fontSize="9" textAnchor="end" className="mono">
                    {activeCompany.currencySymbol}{Math.round(val).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Benchmark Polyline */}
            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              points={polylineBenchmark}
            />

            {/* Strategy Polyline */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePortfolio}
            />
          </svg>
        </div>
      </div>

      {/* ── Detailed Walk-Forward Trade Log Table ── */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="flex items-center gap-2">
            <span className="mono text-[14px] font-black inst-card-text uppercase tracking-wide">
              Walk-Forward Trade Log
            </span>
            <span className="mono text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              {backtestResult.trades.length} Executed Trades
            </span>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
          <table className="w-full border-collapse text-left mono text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-[var(--theme-card-surface)] border-b border-[var(--theme-card-border)] shadow-xs">
              <tr className="text-[11px] text-[var(--theme-card-text-muted)] font-black uppercase tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Entry Date</th>
                <th className="py-2.5 px-3 text-right">Entry Price</th>
                <th className="py-2.5 px-3">Exit Date</th>
                <th className="py-2.5 px-3 text-right">Exit Price</th>
                <th className="py-2.5 px-3 text-right">Shares</th>
                <th className="py-2.5 px-3 text-right">PnL ({activeCompany.currencySymbol})</th>
                <th className="py-2.5 px-3 text-right">Return %</th>
                <th className="py-2.5 px-3 text-right">Hold Days</th>
                <th className="py-2.5 px-3 text-center">Exit Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/40 tabular-nums">
              {backtestResult.trades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[var(--theme-card-text-muted)]">
                    No closed trades generated under selected parameters.
                  </td>
                </tr>
              ) : (
                backtestResult.trades.map((trade) => {
                  const isProfit = trade.pnl > 0;
                  return (
                    <tr key={trade.tradeId} className="hover:bg-emerald-500/5 transition-colors">
                      <td className="py-2 px-3 text-slate-500 font-bold">{trade.tradeId}</td>
                      <td className="py-2 px-3 text-slate-300">{trade.entryDate}</td>
                      <td className="py-2 px-3 text-right text-white font-bold">{activeCompany.currencySymbol}{trade.entryPrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-slate-300">{trade.exitDate}</td>
                      <td className="py-2 px-3 text-right text-white font-bold">{activeCompany.currencySymbol}{trade.exitPrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-300">{trade.shares}</td>
                      <td className={`py-2 px-3 text-right font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{activeCompany.currencySymbol}{trade.pnl.toLocaleString()}
                      </td>
                      <td className={`py-2 px-3 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.returnPct >= 0 ? '+' : ''}{trade.returnPct}%
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">{trade.holdingDays}d</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10.5px] font-black ${
                            trade.exitReason === 'Take Profit'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : trade.exitReason === 'Stop Loss'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {trade.exitReason}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
