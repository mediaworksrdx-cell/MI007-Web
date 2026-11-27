'use client';

import React, { useMemo, useState } from 'react';
import { Candle } from '@/lib/types';
import { generateMi007Intelligence } from '@/lib/mi007/mi007Intelligence';
import {
  BacktestStrategyId,
  compareMi007Strategies,
  Mi007BacktestResult,
  runMi007Backtest,
  StrategyRankingEntry,
} from '@/lib/mi007/mi007Backtest';

interface Mi007IntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  candles: Candle[];
  symbol: string;
  timeframe: string;
  theme?: 'dark' | 'light';
}

export function Mi007IntelligenceModal({
  isOpen,
  onClose,
  candles,
  symbol,
  timeframe,
  theme = 'dark',
}: Mi007IntelligenceModalProps) {
  const [activeTab, setActiveTab] = useState<'intelligence' | 'backtest'>('intelligence');
  const [strategyId, setStrategyId] = useState<BacktestStrategyId>('MI007_CONFLUENCE');
  const [targetRR, setTargetRR] = useState<number>(2.5);
  const [brokerageBps, setBrokerageBps] = useState<number>(5);
  const [slippageBps, setSlippageBps] = useState<number>(5);
  const [btResult, setBtResult] = useState<Mi007BacktestResult | null>(null);
  const [rankings, setRankings] = useState<StrategyRankingEntry[] | null>(null);

  const report = useMemo(() => {
    if (!isOpen || candles.length < 30) return null;
    return generateMi007Intelligence(candles, { symbol, timeframe });
  }, [isOpen, candles, symbol, timeframe]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const card = isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  const handleRunBacktest = () => {
    const res = runMi007Backtest(candles, {
      symbol,
      timeframe,
      strategyId,
      targetRR,
      brokerageBps,
      slippageBps,
    });
    setBtResult(res);
  };

  const handleCompareAll = () => {
    const cmp = compareMi007Strategies(candles, {
      symbol,
      timeframe,
      targetRR,
      brokerageBps,
      slippageBps,
    });
    setRankings(cmp.rankings);
    setBtResult(cmp.results[strategyId]);
  };

  const dirColor =
    report?.marketDirection === 'BULLISH'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : report?.marketDirection === 'BEARISH'
      ? 'text-rose-400 border-rose-500/40 bg-rose-500/10'
      : 'text-amber-400 border-amber-500/40 bg-amber-500/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className={`w-full max-w-5xl max-h-[88vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${bg}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
              MI-007 LAB
            </span>
            <h2 className="text-base font-bold">
              {symbol} · {timeframe} — Institutional Intelligence &amp; Backtest Engine
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('intelligence')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'intelligence'
                  ? 'bg-sky-500 text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              AI Market Intelligence
            </button>
            <button
              onClick={() => setActiveTab('backtest')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'backtest'
                  ? 'bg-sky-500 text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Backtest &amp; Strategy Ranking
            </button>
            <button
              onClick={onClose}
              className={`ml-2 px-2.5 py-1 text-xs font-semibold rounded-md ${
                isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'intelligence' && (
            <>
              {!report ? (
                <div className={`p-6 rounded-lg border text-center text-sm ${card} ${muted}`}>
                  At least 30 closed OHLCV candles are required to generate MI-007 Market Intelligence.
                </div>
              ) : (
                <>
                  {/* Top Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className={`p-4 rounded-lg border ${dirColor}`}>
                      <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80">
                        Market Direction
                      </div>
                      <div className="text-2xl font-bold mt-1">{report.marketDirection}</div>
                      <div className="text-xs mt-1 opacity-85">
                        Last Close: <span className="font-mono font-semibold">{report.lastClosedPrice}</span> · MTF: {report.mtf.alignment}
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg border ${card}`}>
                      <div className={`text-[11px] uppercase tracking-wider font-semibold ${muted}`}>
                        Calibrated Confidence Score
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-amber-400">
                          {report.confidence.calibratedScore}%
                        </span>
                        <span className={`text-xs ${muted}`}>
                          (Raw: {report.confidence.rawScore}%)
                        </span>
                      </div>
                      <div className={`text-[11px] mt-1 ${muted}`}>
                        {report.confidence.calibrationNote}
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg border ${card}`}>
                      <div className={`text-[11px] uppercase tracking-wider font-semibold ${muted}`}>
                        Trade Parameters (Entry / SL / TP1–TP3)
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-1.5 font-mono">
                        <div>Entry: {report.entryZone[0]}–{report.entryZone[1]}</div>
                        <div className="text-rose-400">SL: {report.stopLoss}</div>
                        <div className="text-emerald-400">TP1: {report.target1} ({report.riskReward1}R)</div>
                        <div className="text-emerald-400">TP2: {report.target2} ({report.riskReward2}R)</div>
                        <div className="text-emerald-400 col-span-2">TP3: {report.target3} ({report.riskReward3}R)</div>
                      </div>
                    </div>
                  </div>

                  {/* Indicators & MTF */}
                  <div className={`p-4 rounded-lg border ${card}`}>
                    <div className="text-xs font-bold uppercase tracking-wider mb-2 text-sky-400">
                      Technical Indicators &amp; Multi-Timeframe Snapshot
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div><span className={muted}>RSI (14):</span> <span className="font-mono font-semibold">{report.indicators.rsi14 ?? '—'}</span> ({report.indicators.rsiState})</div>
                      <div><span className={muted}>MACD:</span> <span className="font-mono font-semibold">{report.indicators.macdState}</span></div>
                      <div><span className={muted}>MA Stack:</span> <span className="font-mono font-semibold">{report.indicators.maTrend}</span></div>
                      <div><span className={muted}>ATR(14):</span> <span className="font-mono font-semibold">{report.indicators.atr14} ({report.indicators.atrPct}%)</span></div>
                      <div><span className={muted}>HTF ({report.mtf.htfTimeframe}):</span> <span className="font-semibold">{report.mtf.htfBias}</span></div>
                      <div><span className={muted}>HTF Zone:</span> <span className="font-semibold">{report.mtf.htfPremiumDiscount}</span></div>
                      <div><span className={muted}>VP POC:</span> <span className="font-mono font-semibold">{report.mi007.volumeProfile.fixedRange.poc}</span></div>
                      <div><span className={muted}>Mitigation / S&amp;D:</span> <span className="font-mono font-semibold">{report.mi007.smc.mitigationBlocks?.length ?? 0} MB / {report.mi007.smc.supplyDemandZones?.length ?? 0} S&amp;D</span></div>
                    </div>
                  </div>

                  {/* Supporting Evidence & Invalidating Conditions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className={`p-4 rounded-lg border ${card}`}>
                      <div className="text-xs font-bold uppercase tracking-wider mb-2 text-emerald-400">
                        Supporting Technical Evidence
                      </div>
                      <ul className="space-y-1.5 text-xs">
                        {report.supportingEvidence.map((ev, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              ev.polarity === 'BULLISH'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : ev.polarity === 'BEARISH'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-slate-600/30 text-slate-300'
                            }`}>
                              {ev.category}
                            </span>
                            <span>{ev.summary}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className={`p-4 rounded-lg border ${card}`}>
                      <div className="text-xs font-bold uppercase tracking-wider mb-2 text-rose-400">
                        Invalidating Conditions
                      </div>
                      <ul className="space-y-1.5 text-xs">
                        {report.invalidatingConditions.map((cond, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{cond}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'backtest' && (
            <>
              {/* Backtest Controls */}
              <div className={`p-4 rounded-lg border ${card} flex flex-wrap items-end gap-3`}>
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${muted}`}>Strategy</label>
                  <select
                    value={strategyId}
                    onChange={(e) => setStrategyId(e.target.value as BacktestStrategyId)}
                    className={`px-2.5 py-1.5 text-xs rounded border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  >
                    <option value="MI007_CONFLUENCE">MI-007 Full Confluence</option>
                    <option value="SMC_OB_FVG">SMC Order Block + FVG</option>
                    <option value="SMC_SWEEP_CHOCH">SMC Liquidity Sweep + CHoCH</option>
                    <option value="SMC_BREAKER_IFVG">SMC Breaker + IFVG</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${muted}`}>Target R:R</label>
                  <select
                    value={targetRR}
                    onChange={(e) => setTargetRR(Number(e.target.value))}
                    className={`px-2.5 py-1.5 text-xs rounded border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  >
                    <option value={2.0}>1:2.0</option>
                    <option value={2.5}>1:2.5</option>
                    <option value={3.0}>1:3.0</option>
                    <option value={4.0}>1:4.0</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${muted}`}>Brokerage (bps)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={brokerageBps}
                    onChange={(e) => setBrokerageBps(Number(e.target.value))}
                    className={`w-20 px-2.5 py-1.5 text-xs rounded border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${muted}`}>Slippage (bps)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={slippageBps}
                    onChange={(e) => setSlippageBps(Number(e.target.value))}
                    className={`w-20 px-2.5 py-1.5 text-xs rounded border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>

                <button
                  onClick={handleRunBacktest}
                  className="px-3.5 py-1.5 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition"
                >
                  Run Backtest
                </button>
                <button
                  onClick={handleCompareAll}
                  className="px-3.5 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950 transition"
                >
                  Compare &amp; Rank All 4
                </button>
              </div>

              {/* Backtest Metrics */}
              {btResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-3 rounded-lg border ${card}`}>
                      <div className={`text-[11px] ${muted}`}>Win Rate / Loss Rate</div>
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        {btResult.winRate}% <span className="text-xs text-rose-400">/ {btResult.lossRate}%</span>
                      </div>
                      <div className={`text-[11px] ${muted}`}>{btResult.totalTrades} total trades</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${card}`}>
                      <div className={`text-[11px] ${muted}`}>Profit Factor</div>
                      <div className="text-lg font-bold font-mono text-sky-400">{btResult.profitFactor}</div>
                      <div className={`text-[11px] ${muted}`}>Expectancy: {btResult.expectancyR}R</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${card}`}>
                      <div className={`text-[11px] ${muted}`}>Max Drawdown</div>
                      <div className="text-lg font-bold font-mono text-rose-400">-{btResult.maxDrawdownPct}%</div>
                      <div className={`text-[11px] ${muted}`}>Max Consec. Losses: {btResult.maxConsecutiveLosses}</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${card}`}>
                      <div className={`text-[11px] ${muted}`}>Net Return (After Costs)</div>
                      <div className={`text-lg font-bold font-mono ${btResult.netReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {btResult.netReturnPct >= 0 ? '+' : ''}{btResult.netReturnPct}%
                      </div>
                      <div className={`text-[11px] ${muted}`}>Avg R:R: {btResult.averageRR} · Costs: {btResult.totalCostsAbs}</div>
                    </div>
                  </div>

                  {/* Condition Breakdown */}
                  <div className={`p-4 rounded-lg border ${card}`}>
                    <div className="text-xs font-bold uppercase tracking-wider mb-2 text-sky-400">
                      Performance by Market Condition
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {btResult.conditionBreakdown.map((c) => (
                        <div key={c.condition} className={`p-2.5 rounded border ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
                          <div className="font-bold">{c.condition}</div>
                          <div className={muted}>Trades: {c.trades} · Win: {c.winRate}%</div>
                          <div className="font-mono">PF: {c.profitFactor} · Net: {c.netR}R</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Strategy Comparison Ranking Table */}
              {rankings && (
                <div className={`p-4 rounded-lg border ${card} overflow-x-auto`}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 text-amber-400">
                    Strategy Comparison &amp; Ranking
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                        <th className="py-1.5 pr-3">Rank</th>
                        <th className="py-1.5 pr-3">Strategy</th>
                        <th className="py-1.5 pr-3">Trades</th>
                        <th className="py-1.5 pr-3">Win %</th>
                        <th className="py-1.5 pr-3">Profit Factor</th>
                        <th className="py-1.5 pr-3">Expectancy</th>
                        <th className="py-1.5 pr-3">Max DD</th>
                        <th className="py-1.5 pr-3">Net Return</th>
                        <th className="py-1.5">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((r) => (
                        <tr key={r.strategyId} className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                          <td className="py-1.5 pr-3 font-bold text-amber-400">#{r.rank}</td>
                          <td className="py-1.5 pr-3 font-semibold">{r.label}</td>
                          <td className="py-1.5 pr-3 font-mono">{r.totalTrades}</td>
                          <td className="py-1.5 pr-3 font-mono">{r.winRate}%</td>
                          <td className="py-1.5 pr-3 font-mono">{r.profitFactor}</td>
                          <td className="py-1.5 pr-3 font-mono">{r.expectancyR}R</td>
                          <td className="py-1.5 pr-3 font-mono text-rose-400">-{r.maxDrawdownPct}%</td>
                          <td className="py-1.5 pr-3 font-mono">{r.netReturnPct}%</td>
                          <td className="py-1.5 font-mono font-bold">{r.compositeScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
