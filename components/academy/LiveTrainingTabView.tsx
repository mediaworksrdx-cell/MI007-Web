'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AiTradeSignal,
  ScannerSignalInfo,
  defaultFeaturedFnoSignal,
  defaultScannerSignals,
} from '@/lib/academy/academyData';

interface LiveTrainingTabProps {
  onOpenSignal: (signal: AiTradeSignal) => void;
  onOpenScannerSignal: (signal: ScannerSignalInfo) => void;
}

export function LiveTrainingTabView({
  onOpenSignal,
  onOpenScannerSignal,
}: LiveTrainingTabProps) {
  const [simulationMode, setSimulationMode] = useState(false);
  const [simPnl, setSimPnl] = useState(12450.0);
  const fnoSignal = defaultFeaturedFnoSignal();
  const scannerSignals = defaultScannerSignals();

  return (
    <div className="space-y-6">
      {/* Top Banner: Simulation Toggle & Live Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="mono text-[11px] font-black uppercase tracking-wider text-emerald-400">
            LIVE SIGNAL MONITORING & SIMULATION ENGINE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-bold opacity-75">
            {simulationMode ? 'SIMULATION DRILL ACTIVE' : 'SIMULATION MODE'}
          </span>
          <button
            type="button"
            onClick={() => setSimulationMode(prev => !prev)}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-black transition-all cursor-pointer ${
              simulationMode
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'border border-[var(--theme-card-border)] opacity-60 hover:opacity-100'
            }`}
          >
            {simulationMode ? 'ACTIVE' : 'STANDBY'}
          </button>
        </div>
      </div>

      {/* Simulation Active Banner (if turned on) */}
      {simulationMode && (
        <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-3 font-mono">
          <div>
            <div className="text-[10px] font-black uppercase text-emerald-400">
              ⚡ LIVE REPLAY DRILL ENGAGED
            </div>
            <div className="text-xs opacity-90 mt-0.5 font-sans">
              Simulating real-time market replay for NIFTY 50. Delta-neutral gamma hedge active.
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] opacity-60 uppercase block">Virtual Portfolio P&L</span>
            <span className="text-base font-black text-emerald-400">
              ₹+{simPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* 1. Featured F&O Strategy Signal Card */}
      <div className="p-5 rounded-2xl border-2 border-emerald-500/50 bg-[var(--theme-card-surface)] space-y-4 shadow-lg relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--theme-card-border)]">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/40 font-mono text-xs font-black text-emerald-400">
              FEATURED F&O STRATEGY
            </span>
            <span className="mono text-xs opacity-60">High-Probability Spread</span>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-slate-950 font-mono text-xs font-black">
            86.5% CONFIDENCE ACCURACY
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mono text-[10px] opacity-60 uppercase font-bold">Underlying & Setup</div>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[var(--theme-card-text)]">
              {fnoSignal.underlyingSymbol} · {fnoSignal.strategyName}
            </h3>
            <p className="text-xs opacity-75 mt-1 max-w-xl font-sans leading-relaxed">
              Institutional Order Block mitigation confirmed with volume delta expansion and liquidity pool absorption across higher timeframes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenSignal(fnoSignal)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Open Full Analysis →
            </button>
            <Link
              href="/chart/NIFTY"
              className="px-3.5 py-2 rounded-xl border border-[var(--theme-card-border)] hover:bg-[var(--theme-card-bg)] text-xs font-mono font-bold transition-all"
            >
              📊 View Chart
            </Link>
          </div>
        </div>

        {/* Level Badges */}
        <div className="grid grid-cols-3 gap-3 font-mono text-center pt-2">
          <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]">
            <div className="text-[10px] opacity-60 uppercase font-bold">Study Zone (Entry)</div>
            <div className="text-sm font-black text-slate-200">₹{fnoSignal.entryPrice.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-xl border border-rose-500/40 bg-[var(--theme-card-bg)]">
            <div className="text-[10px] uppercase font-bold text-rose-400">Invalidation (SL)</div>
            <div className="text-sm font-black text-rose-400">₹{fnoSignal.stopLoss.toFixed(2)}</div>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-[var(--theme-card-bg)]">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Projection (TP)</div>
            <div className="text-sm font-black text-emerald-400">₹{fnoSignal.target.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* 2. Active Confluence Scanner Studies List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="mono text-[11px] font-black uppercase text-emerald-400 tracking-wider">
            Active Confluence Scanner Studies ({scannerSignals.length})
          </h3>
          <span className="text-[11px] font-mono opacity-60">
            Select any setup below to inspect order flow rationale
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
          {scannerSignals.map(sig => {
            const isBull = sig.bias.toUpperCase().includes('BULL');
            return (
              <div
                key={sig.symbol}
                onClick={() => onOpenScannerSignal(sig)}
                className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500/60 transition-all cursor-pointer flex flex-col justify-between group select-none shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[var(--theme-card-text)] group-hover:text-emerald-400 transition-colors">
                        {sig.symbol}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] opacity-75">
                        {sig.timeframe}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isBull ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {sig.bias} · {sig.confidence}%
                    </span>
                  </div>

                  <p className="text-[12px] opacity-80 line-clamp-2 leading-relaxed mb-3">
                    {sig.rationale}
                  </p>
                </div>

                {/* Level Footer */}
                <div className="pt-2.5 border-t border-[var(--theme-card-border)] flex items-center justify-between font-mono text-[11px]">
                  <div className="flex items-center gap-3">
                    <span>Zone: ₹{sig.entryPrice.toLocaleString()}</span>
                    <span className="text-rose-400">SL: ₹{sig.stopLoss.toLocaleString()}</span>
                    <span className="text-emerald-400">TP: ₹{sig.target.toLocaleString()}</span>
                  </div>
                  <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
                    Inspect →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
