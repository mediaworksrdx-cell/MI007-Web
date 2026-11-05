// ═══════════════════════════════════════════════════════════════════════════
// QUANTUM AI — SMC & RESONANCE STRATEGY STUDIO & BACKTESTING MODAL
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import React, { useState } from 'react';
import {
  QuantumAiAnalysisResult,
  QuantumAiConfig,
  QuantumAiSubTab,
} from '../../lib/quantumai/types';
import {
  generatePineScriptCode,
  generatePythonEngineCode,
} from '../../lib/quantumai/quantumAiBacktest';

interface QuantumAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: QuantumAiAnalysisResult;
  config: QuantumAiConfig;
  onChangeConfig: (updates: Partial<QuantumAiConfig>) => void;
  symbol: string;
  initialTab?: QuantumAiSubTab;
}

export function QuantumAiModal({
  isOpen,
  onClose,
  analysis,
  config,
  onChangeConfig,
  symbol,
  initialTab = 'smc',
}: QuantumAiModalProps) {
  const [activeTab, setActiveTab] = useState<QuantumAiSubTab>(initialTab);
  const [copiedCode, setCopiedCode] = useState<'pine' | 'python' | null>(null);

  if (!isOpen) return null;

  const SUB_TABS: { id: QuantumAiSubTab; label: string; icon: string }[] = [
    { id: 'smc', label: 'SMC Analysis', icon: '🏛️' },
    { id: 'structure', label: 'Market Structure', icon: '📈' },
    { id: 'orderblocks', label: 'Order Blocks', icon: '🧱' },
    { id: 'liquidity', label: 'Liquidity Analysis', icon: '💧' },
    { id: 'premium-discount', label: 'Premium / Discount', icon: '⚖️' },
    { id: 'volatility-momentum', label: 'Volatility & Momentum', icon: '⚡' },
    { id: 'resonance', label: 'Resonance Engine', icon: '🔄' },
    { id: 'confluence', label: 'Confluence Engine', icon: '🎯' },
    { id: 'signals', label: 'Trading Signals', icon: '🔔' },
    { id: 'risk-mgmt', label: 'Risk & TP Management', icon: '🛡️' },
    { id: 'backtesting', label: 'Strategy Backtesting', icon: '📊' },
  ];

  const { dealingRange, volatility, momentum, trend, confluence, resonance, orderBlocks, structures, liquidityPools, setups, backtest } = analysis;

  const copyToClipboard = (text: string, type: 'pine' | 'python') => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Top Bar ── */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">
              QUANTUM AI
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Multi-Timeframe SMC &amp; Resonance System</span>
                <span className="text-xs font-mono font-medium text-slate-400">({symbol})</span>
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Institutional confluence engine, cross-timeframe resonance &amp; quantitative backtest
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* ── 2. Horizontal Sub-Tabs Bar ── */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0B0F19] overflow-x-auto shrink-0 scrollbar-none">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-500/40'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── 3. Tab Content Body ── */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: SMC Analysis */}
          {activeTab === 'smc' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-950/20">
                <h3 className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1.5">
                  Smart Money Concepts Institutional Engine
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Identifies institutional footprint via impulsive expansion candles, preceding reference order blocks,
                  premium/discount dealing ranges, and structural character changes (CHoCH / BOS).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard title="Market Regime" value={trend.isTrending ? 'TRENDING' : 'RANGING'} sub={`ADX ${trend.adx}`} isPositive={trend.isTrending} />
                <MetricCard title="Dealing Range" value={dealingRange.currentZone} sub={`EQ: ${dealingRange.equilibrium}`} isPositive={dealingRange.currentZone === 'DISCOUNT'} />
                <MetricCard title="Active Order Blocks" value={`${orderBlocks.length} Tracked`} sub={`${orderBlocks.filter(o => o.isMitigated).length} Retested`} />
              </div>

              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Active Order Blocks on Current Timeframe</div>
                {orderBlocks.length === 0 ? (
                  <div className="text-xs text-slate-400 py-3">No active order blocks detected on visible candles.</div>
                ) : (
                  <div className="space-y-2">
                    {orderBlocks.slice(-5).map((ob) => (
                      <div key={ob.id} className="flex items-center justify-between text-xs font-mono p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className={`font-bold ${ob.isBullish ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {ob.isBullish ? '▲ BULLISH OB' : '▼ BEARISH OB'}
                        </span>
                        <span>{ob.bottom} - {ob.top}</span>
                        <span className="text-slate-400">{ob.isMitigated ? 'RETESTED' : 'UNMITIGATED'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Market Structure */}
          {activeTab === 'structure' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/20">
                <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1.5">
                  Market Structure Breaks: BOS &amp; CHoCH
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Break of Structure (BOS) indicates trend continuation, while Change of Character (CHoCH) confirms early reversal when an established swing high/low is broken in the opposite direction.
                </p>
              </div>

              <div className="space-y-2">
                {structures.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center">No structural breaks on active lookback.</div>
                ) : (
                  structures.slice(-8).reverse().map((brk) => (
                    <div key={brk.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-xs bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          brk.type === 'CHOCH' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                        }`}>
                          {brk.type}
                        </span>
                        <span className={brk.isBullish ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                          {brk.isBullish ? 'BULLISH' : 'BEARISH'}
                        </span>
                      </div>
                      <span className="text-slate-600 dark:text-slate-300">Level: {brk.breakPrice}</span>
                      <span className="text-slate-400 text-[11px]">{new Date(brk.time).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Order Blocks */}
          {activeTab === 'orderblocks' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Institutional order blocks constructed from impulsive expansion candles and validated against subsequent retests and invalidation violations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2">Bullish Order Blocks (Demand)</div>
                  <div className="space-y-1.5 text-xs font-mono">
                    {orderBlocks.filter(o => o.isBullish).slice(-4).map(o => (
                      <div key={o.id} className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30">
                        <span>{o.bottom} - {o.top}</span>
                        <span className={o.isMitigated ? 'text-emerald-500' : 'text-slate-400'}>{o.isMitigated ? 'Retested' : 'Fresh'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-50/20 dark:bg-rose-950/10">
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2">Bearish Order Blocks (Supply)</div>
                  <div className="space-y-1.5 text-xs font-mono">
                    {orderBlocks.filter(o => !o.isBullish).slice(-4).map(o => (
                      <div key={o.id} className="flex justify-between p-2 rounded bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30">
                        <span>{o.bottom} - {o.top}</span>
                        <span className={o.isMitigated ? 'text-rose-500' : 'text-slate-400'}>{o.isMitigated ? 'Retested' : 'Fresh'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Liquidity Analysis */}
          {activeTab === 'liquidity' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800/40 bg-cyan-50/20 dark:bg-cyan-950/20">
                <div className="text-xs font-bold text-cyan-700 dark:text-cyan-400 mb-1">Buy-Side (BSL) &amp; Sell-Side (SSL) Liquidity Pools</div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Tracks resting stop liquidity above swing highs and below swing lows, detecting institutional sweeps where wick triggers stops and closes inside.
                </div>
              </div>

              <div className="space-y-2">
                {liquidityPools.slice(-6).map((pool) => (
                  <div key={pool.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-mono">
                    <span className={`font-bold ${pool.isHigh ? 'text-cyan-500' : 'text-amber-500'}`}>
                      {pool.isHigh ? 'BUY-SIDE LIQUIDITY (BSL)' : 'SELL-SIDE LIQUIDITY (SSL)'}
                    </span>
                    <span>Level: {pool.price}</span>
                    <span className={pool.isSwept ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                      {pool.isSwept ? '✓ SWEPT & REJECTED' : 'UNTOUCHED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Premium / Discount */}
          {activeTab === 'premium-discount' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  40-Bar Institutional Dealing Range
                </div>
                <div className="grid grid-cols-3 gap-3 font-mono text-center">
                  <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
                    <div className="text-[10px] text-rose-500">Premium High</div>
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{dealingRange.swingHigh}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">Equilibrium (EQ)</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{dealingRange.equilibrium}</div>
                  </div>
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                    <div className="text-[10px] text-emerald-500">Discount Low</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{dealingRange.swingLow}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Current Valuation: <span className="font-bold text-purple-600">{dealingRange.currentZone} ZONE</span> (Contributes {dealingRange.currentZone === 'DISCOUNT' ? '+2.0 Bullish Confluence' : dealingRange.currentZone === 'PREMIUM' ? '+2.0 Bearish Confluence' : 'Neutral'}).
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Volatility & Momentum */}
          {activeTab === 'volatility-momentum' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Volatility Squeeze Engine</div>
                  <div className="text-[11px] text-slate-500">Bollinger Bands (20, 2.0) vs Keltner Channels (20, 1.5)</div>
                  <div className={`text-sm font-mono font-bold ${volatility.isSqueeze ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {volatility.isSqueeze ? `● SQUEEZE ACTIVE (${volatility.squeezeLength} bars)` : '◌ EXPANSION (NO SQUEEZE)'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    BB: {volatility.bbLower} - {volatility.bbUpper} | KC: {volatility.kcLower} - {volatility.kcUpper}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Momentum Analysis Engine</div>
                  <div className="text-[11px] text-slate-500">LinReg(Close - SMA20, 20, 0)</div>
                  <div className={`text-sm font-mono font-bold ${momentum.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {momentum.isPositive ? `▲ POSITIVE (+${momentum.linRegMomentum})` : `▼ NEGATIVE (${momentum.linRegMomentum})`}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Raw Close - SMA20: {momentum.rawDiff}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Resonance Engine */}
          {activeTab === 'resonance' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-950/20">
                <div className="text-xs font-bold text-purple-700 dark:text-purple-400 mb-1">Cross-Timeframe Resonance Matrix</div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Synthesizes Layer 1 (HTF Macro Bias), Layer 2 (MTF Structure &amp; Order Blocks), and Layer 3 (LTF Execution Trigger).
                </div>
              </div>

              <div className="space-y-2">
                {[resonance.htf, resonance.mtf, resonance.ltf].map((layer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{layer.timeframe}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      layer.bias === 'BULLISH' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                    }`}>
                      {layer.bias}
                    </span>
                    <span className="text-slate-500">Zone: {layer.zone}</span>
                    <span className="text-slate-400">Score: {layer.score}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between font-mono text-xs">
                <span className="text-slate-500 font-bold">Overall Alignment:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{resonance.overallAlignment} ({resonance.resonancePct}% Match)</span>
              </div>
            </div>
          )}

          {/* TAB 8: Confluence Engine */}
          {activeTab === 'confluence' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center font-mono">
                <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20">
                  <div className="text-[10px] text-emerald-500 uppercase">Bullish Confluence</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{confluence.bullScore} <span className="text-xs text-slate-400">/ 9.5</span></div>
                  <div className="text-[10px] text-slate-400">{confluence.bullScore >= confluence.threshold ? '✓ QUALIFIED FOR LONG' : 'Below 7.0 Threshold'}</div>
                </div>

                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-50/20 dark:bg-rose-950/20">
                  <div className="text-[10px] text-rose-500 uppercase">Bearish Confluence</div>
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{confluence.bearScore} <span className="text-xs text-slate-400">/ 9.5</span></div>
                  <div className="text-[10px] text-slate-400">{confluence.bearScore >= confluence.threshold ? '✓ QUALIFIED FOR SHORT' : 'Below 7.0 Threshold'}</div>
                </div>
              </div>

              {/* Confluence Weights Table */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden text-xs">
                <table className="w-full text-left font-mono">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 text-[10px]">
                    <tr>
                      <th className="p-2.5">Analytical Condition</th>
                      <th className="p-2.5 text-center">Weight</th>
                      <th className="p-2.5 text-right">Bullish</th>
                      <th className="p-2.5 text-right">Bearish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="p-2.5">Discount / Premium Zone</td>
                      <td className="p-2.5 text-center text-slate-400">+2.0</td>
                      <td className="p-2.5 text-right text-emerald-500 font-bold">+{confluence.breakdown.discountOrPremium.bull}</td>
                      <td className="p-2.5 text-right text-rose-500 font-bold">+{confluence.breakdown.discountOrPremium.bear}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">Order Block Proximity</td>
                      <td className="p-2.5 text-center text-slate-400">+3.0</td>
                      <td className="p-2.5 text-right text-emerald-500 font-bold">+{confluence.breakdown.orderBlock.bull}</td>
                      <td className="p-2.5 text-right text-rose-500 font-bold">+{confluence.breakdown.orderBlock.bear}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">Linear Regression Momentum</td>
                      <td className="p-2.5 text-center text-slate-400">+2.0</td>
                      <td className="p-2.5 text-right text-emerald-500 font-bold">+{confluence.breakdown.momentum.bull}</td>
                      <td className="p-2.5 text-right text-rose-500 font-bold">+{confluence.breakdown.momentum.bear}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">EMA 20 Confirmation</td>
                      <td className="p-2.5 text-center text-slate-400">+1.5</td>
                      <td className="p-2.5 text-right text-emerald-500 font-bold">+{confluence.breakdown.ema20.bull}</td>
                      <td className="p-2.5 text-right text-rose-500 font-bold">+{confluence.breakdown.ema20.bear}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">ADX Trend Strength (&ge; 25)</td>
                      <td className="p-2.5 text-center text-slate-400">+1.0</td>
                      <td className="p-2.5 text-right text-emerald-500 font-bold">+{confluence.breakdown.adxTrend.bull}</td>
                      <td className="p-2.5 text-right text-rose-500 font-bold">+{confluence.breakdown.adxTrend.bear}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: Trading Signals */}
          {activeTab === 'signals' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500">
                Institutional setups meeting confluence threshold &ge; {config.confluenceThreshold} with automated Entry, SL, TP1, TP2, TP3.
              </div>

              {setups.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No active qualified setups on current timeframe.</div>
              ) : (
                setups.map((setup) => (
                  <div key={setup.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        setup.isBullish ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                      }`}>
                        {setup.isBullish ? 'LONG SETUP' : 'SHORT SETUP'}
                      </span>
                      <span className="text-xs text-slate-400">{new Date(setup.time).toLocaleDateString()}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                      <div><div className="text-[9px] text-slate-400">ENTRY</div><div className="font-bold">{setup.entryPrice}</div></div>
                      <div><div className="text-[9px] text-rose-500">SL</div><div className="font-bold text-rose-600">{setup.stopLossPrice}</div></div>
                      <div><div className="text-[9px] text-emerald-500">TP1 (1.5R)</div><div className="font-bold text-emerald-600">{setup.tp1Price}</div></div>
                      <div><div className="text-[9px] text-blue-500">TP3 (4.0R)</div><div className="font-bold text-blue-600">{setup.tp3Price}</div></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 10: Risk Management */}
          {activeTab === 'risk-mgmt' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Automated Partial Exits &amp; Break-Even Protection
                </div>
                <div className="grid grid-cols-3 gap-3 font-mono text-center">
                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">TP1 Exit (33%)</div>
                    <div className="text-xs font-bold text-emerald-500">1 : {config.riskReward1}R</div>
                    <div className="text-[9px] text-slate-400 mt-1">Triggers Break-Even</div>
                  </div>
                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">TP2 Exit (33%)</div>
                    <div className="text-xs font-bold text-emerald-500">1 : {config.riskReward2}R</div>
                    <div className="text-[9px] text-slate-400 mt-1">Runner target</div>
                  </div>
                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">TP3 Exit (34%)</div>
                    <div className="text-xs font-bold text-emerald-500">1 : {config.riskReward3}R</div>
                    <div className="text-[9px] text-slate-400 mt-1">Full 100% position close</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Total exit allocation exactly equals 100% (33% + 33% + 34%) with zero conflicting reservations.
                </p>
              </div>
            </div>
          )}

          {/* TAB 11: Strategy Backtesting & Exporter */}
          {activeTab === 'backtesting' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
                <MetricCard title="Net Return" value={`${backtest.returnPct}%`} sub={`+$${backtest.netProfit}`} isPositive={backtest.netProfit >= 0} />
                <MetricCard title="Win Rate" value={`${backtest.winRate}%`} sub={`${backtest.winCount}W / ${backtest.lossCount}L`} isPositive={backtest.winRate >= 50} />
                <MetricCard title="Profit Factor" value={`${backtest.profitFactor}`} sub="Gross W / L" isPositive={backtest.profitFactor >= 1.5} />
                <MetricCard title="Max Drawdown" value={`-${backtest.maxDrawdownPct}%`} sub={`-$${backtest.maxDrawdown}`} isPositive={false} />
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-center font-mono">
                <MetricCard title="Average R" value={`${backtest.averageR}R`} sub="Per trade return" isPositive={backtest.averageR > 0} />
                <MetricCard title="Expectancy" value={`$${backtest.expectancy}`} sub="Expected P&L / trade" isPositive={backtest.expectancy > 0} />
              </div>

              {/* Code Exporter Buttons */}
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Export Strategy Code</div>
                  <div className="text-[10px] text-slate-400">Generate TradingView Pine Script v5 or Python quantitative engine</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatePineScriptCode(config), 'pine')}
                    className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/40 text-xs font-mono font-bold cursor-pointer"
                  >
                    {copiedCode === 'pine' ? '✓ Copied' : 'Pine Script v5'}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatePythonEngineCode(config), 'python')}
                    className="px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 text-xs font-mono font-bold cursor-pointer"
                  >
                    {copiedCode === 'python' ? '✓ Copied' : 'Python Engine'}
                  </button>
                </div>
              </div>

              {/* Trade Log */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Historical Simulated Trade Log ({backtest.totalTrades} Trades)</div>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded border border-slate-100 dark:border-slate-800 p-1 font-mono text-[11px]">
                  {backtest.trades.length === 0 ? (
                    <div className="text-xs text-slate-400 py-4 text-center">No completed trades recorded in lookback.</div>
                  ) : (
                    backtest.trades.map((tr) => (
                      <div key={tr.id} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-900">
                        <span className={`font-bold ${tr.type === 'LONG' ? 'text-emerald-500' : 'text-rose-500'}`}>{tr.type}</span>
                        <span>Entry: {tr.entryPrice}</span>
                        <span>Exit: {tr.exitPrice} ({tr.exitReason})</span>
                        <span className={`font-bold ${tr.status === 'WIN' ? 'text-emerald-500' : tr.status === 'LOSS' ? 'text-rose-500' : 'text-slate-400'}`}>
                          {tr.returnR > 0 ? `+${tr.returnR}R` : `${tr.returnR}R`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Footer ── */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
          <span className="text-[10px] font-mono text-slate-400">
            MI007 QUANTUM AI • SMC &amp; RESONANCE ENGINE
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold font-mono text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  sub,
  isPositive,
}: {
  title: string;
  value: string;
  sub?: string;
  isPositive?: boolean;
}) {
  return (
    <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 font-mono">
      <div className="text-[9px] text-slate-400 uppercase tracking-wider">{title}</div>
      <div className={`text-sm font-bold ${
        isPositive === true ? 'text-emerald-600 dark:text-emerald-400' : isPositive === false ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
      }`}>
        {value}
      </div>
      {sub && <div className="text-[9px] text-slate-400">{sub}</div>}
    </div>
  );
}
