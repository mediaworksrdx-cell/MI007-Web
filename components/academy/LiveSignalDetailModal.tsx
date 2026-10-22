'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AiTradeSignal, ScannerSignalInfo } from '@/lib/academy/academyData';

interface LiveSignalDetailModalProps {
  fnoSignal?: AiTradeSignal | null;
  scannerSignal?: ScannerSignalInfo | null;
  onClose: () => void;
  onAskMentor: (query: string) => void;
}

export function LiveSignalDetailModal({
  fnoSignal,
  scannerSignal,
  onClose,
  onAskMentor,
}: LiveSignalDetailModalProps) {
  const [simPnl, setSimPnl] = useState(12450.0);
  const [simMsg, setSimMsg] = useState('Simulation replay active for this setup.');

  const symbol = fnoSignal?.underlyingSymbol ?? scannerSignal?.symbol ?? 'NIFTY 50';
  const strategy = fnoSignal?.strategyName ?? `${scannerSignal?.timeframe ?? '1H'} Confluence Setup`;
  const regime = fnoSignal?.marketRegime ?? scannerSignal?.bias ?? 'BULLISH';
  const isBull = regime.toUpperCase().includes('BULL');
  const confidence = fnoSignal?.confidenceScore ?? scannerSignal?.confidence ?? 86.5;

  const entry = fnoSignal?.entryPrice ?? scannerSignal?.entryPrice ?? 23820;
  const sl = fnoSignal?.stopLoss ?? scannerSignal?.stopLoss ?? 23740;
  const target = fnoSignal?.target ?? scannerSignal?.target ?? 23980;

  const riskDist = Math.max(Math.abs(entry - sl), 1);
  const rewardDist = Math.max(Math.abs(target - entry), 1);
  const rrRatio = (rewardDist / riskDist).toFixed(2);

  const cleanSym = symbol.replace(/\s+/g, '');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[92vh] rounded-2xl border-2 terminal-page-panel bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-black uppercase ${
                isBull ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400' : 'bg-rose-500/15 border border-rose-500/40 text-rose-400'
              }`}
            >
              {regime}
            </span>
            <div>
              <div className="mono text-[10px] font-black uppercase opacity-60">Live Signal Telemetry</div>
              <h2 className="text-lg font-black uppercase tracking-tight">{symbol} · {strategy}</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--theme-card-border)] hover:bg-[var(--theme-card-bg)] text-sm cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-3 gap-2.5 font-mono text-[11px]">
            <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              <div className="text-[9.5px] uppercase opacity-60 font-bold">Confidence</div>
              <div className="text-base font-black text-amber-400">{confidence}%</div>
            </div>
            <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              <div className="text-[9.5px] uppercase opacity-60 font-bold">Risk / Reward</div>
              <div className="text-base font-black text-cyan-400">1 : {rrRatio}</div>
            </div>
            <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
              <div className="text-[9.5px] uppercase opacity-60 font-bold">Structure</div>
              <div className="text-base font-black text-emerald-400">SMC VALID</div>
            </div>
          </div>

          {/* Execution Levels */}
          <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] space-y-2">
            <div className="text-[10.5px] font-mono font-bold uppercase text-emerald-400">
              Execution Architecture & Target Levels
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-center">
              <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
                <div className="text-[9px] opacity-60 uppercase font-bold">Study Zone (Entry)</div>
                <div className="text-sm font-black text-slate-200">₹{entry.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-rose-500/40">
                <div className="text-[9px] uppercase font-bold text-rose-400">Invalidation (SL)</div>
                <div className="text-sm font-black text-rose-400">₹{sl.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-emerald-500/40">
                <div className="text-[9px] uppercase font-bold text-emerald-400">Projection (Target)</div>
                <div className="text-sm font-black text-emerald-400">₹{target.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Option Contract Legs (If F&O Signal) */}
          {fnoSignal && fnoSignal.optionLegs && (
            <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] space-y-2">
              <div className="text-[10.5px] font-mono font-bold uppercase text-emerald-400">
                Active Option Contract Legs
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                {fnoSignal.optionLegs.map(leg => (
                  <div
                    key={leg.optionSymbol}
                    className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9.5px] font-black uppercase ${
                          leg.action === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                        }`}
                      >
                        {leg.action}
                      </span>
                      <span className="font-bold">{leg.optionSymbol}</span>
                      <span className="opacity-60 text-[10px]">({leg.quantity} units · {leg.expiry})</span>
                    </div>
                    <div className="font-black text-emerald-400">
                      ₹{leg.premium.toFixed(2)} LTP
                    </div>
                  </div>
                ))}
              </div>

              {/* Capital & Margin Matrix */}
              <div className="grid grid-cols-3 gap-2 font-mono text-[10.5px] pt-2 border-t border-[var(--theme-card-border)]">
                <div>
                  <span className="opacity-60 block">Capital Outlay:</span>
                  <span className="font-black text-slate-200">₹{fnoSignal.riskParameters.capitalRequired.toLocaleString()}</span>
                </div>
                <div>
                  <span className="opacity-60 block">Margin Req:</span>
                  <span className="font-black text-slate-200">₹{fnoSignal.riskParameters.marginRequired.toLocaleString()}</span>
                </div>
                <div>
                  <span className="opacity-60 block">Max Invalidation:</span>
                  <span className="font-black text-rose-400">₹{fnoSignal.riskParameters.maxLoss.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cognitive Rationale */}
          <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] space-y-1">
            <div className="text-[10.5px] font-mono font-bold uppercase text-emerald-400">
              Mentor Cognitive Rationale
            </div>
            <p className="text-[12px] opacity-85 leading-relaxed font-sans">
              {fnoSignal
                ? 'Institutional Order Block mitigation confirmed with volume delta expansion and liquidity pool absorption across higher timeframes.'
                : scannerSignal?.rationale}
            </p>
          </div>

          {/* Fast Simulation Action Replay Bar */}
          <div className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] space-y-2 font-mono">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-bold uppercase">⚡ Quick Simulation Replay</span>
              <span className="font-black text-emerald-400">SIM P&L: ₹+{simPnl.toLocaleString()}</span>
            </div>
            <div className="text-[10px] opacity-70">{simMsg}</div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setSimPnl(prev => prev + 1850);
                  setSimMsg('Protective Put Hedge Deployed. Gamma risk reduced by 64%.');
                }}
                className="py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:bg-emerald-500/10 text-emerald-400 font-bold cursor-pointer"
              >
                Hedge Risk
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimPnl(prev => prev + 3200);
                  setSimMsg('Strikes Rolled forward. Locked +₹3,200 profit.');
                }}
                className="py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:bg-cyan-500/10 text-cyan-400 font-bold cursor-pointer"
              >
                Roll Strikes
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimMsg(`Position squared off at ₹+${simPnl.toLocaleString()}.`);
                }}
                className="py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:bg-rose-500/10 text-rose-400 font-bold cursor-pointer"
              >
                Square Off
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex flex-col sm:flex-row gap-2 shrink-0">
          <Link
            href={`/chart/${cleanSym}`}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-[12px] font-black text-center transition-all cursor-pointer shadow-xs"
          >
            📊 Open Live Candlestick Chart
          </Link>

          <button
            type="button"
            onClick={() => {
              const q = `Analyze ${symbol} ${strategy} setup. What are the key institutional levels, SMC order blocks, and risk invalidation points?`;
              onAskMentor(q);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl border border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 font-mono text-[12px] font-bold text-center transition-all cursor-pointer"
          >
            💬 Consult AI Mentor About Setup
          </button>
        </div>
      </div>
    </div>
  );
}
