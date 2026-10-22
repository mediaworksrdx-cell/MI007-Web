// ─── Derivatives Analytics, Max Pain & Market Regime Workspace ──────────────
'use client';

import React, { useState, useMemo } from 'react';
import { OptionChainData, FnoInstrument } from '@/lib/fno/fnoTypes';
import { classifyMarketRegime } from '@/lib/fno/fnoDataService';

interface DerivativesAnalyticsTabProps {
  instrument: FnoInstrument;
  chainData: OptionChainData;
  onSelectStrike?: (strike: number) => void;
  onOpenBuilderTab?: () => void;
}

export function DerivativesAnalyticsTab({
  instrument,
  chainData,
  onOpenBuilderTab,
}: DerivativesAnalyticsTabProps) {
  const [candidatePrice, setCandidatePrice] = useState<number>(chainData.maxPain);

  // Maximum OI for bar chart normalization
  const maxOI = useMemo(() => {
    let m = 1;
    for (const row of chainData.strikes) {
      if (row.call.openInterest > m) m = row.call.openInterest;
      if (row.put.openInterest > m) m = row.put.openInterest;
    }
    return m;
  }, [chainData.strikes]);

  // Max Pain Payout simulation across strikes
  const maxPainCurve = useMemo(() => {
    return chainData.strikes.map((s) => {
      const k = s.strike;
      let callLoss = 0;
      let putLoss = 0;

      for (const row of chainData.strikes) {
        if (k > row.strike) {
          callLoss += (k - row.strike) * row.call.openInterest;
        }
        if (k < row.strike) {
          putLoss += (row.strike - k) * row.put.openInterest;
        }
      }

      return {
        strike: k,
        callLoss: Math.round(callLoss / 1000000), // in Crores / Millions
        putLoss: Math.round(putLoss / 1000000),
        totalLoss: Math.round((callLoss + putLoss) / 1000000),
      };
    });
  }, [chainData.strikes]);

  const maxTotalLoss = useMemo(() => {
    return Math.max(...maxPainCurve.map((p) => p.totalLoss), 1);
  }, [maxPainCurve]);

  // Market Regime
  const regimeInfo = useMemo(() => {
    return classifyMarketRegime(chainData.pcr, 14.8, chainData);
  }, [chainData]);

  // Dealer Gamma Positioning
  const gammaState = useMemo(() => {
    const deviation = Math.abs(chainData.spotPrice - chainData.maxPain) / chainData.maxPain;
    if (deviation < 0.01) {
      return {
        state: 'LONG GAMMA (PINNING LIKELY)',
        desc: 'Spot is pinned within 1% of Max Pain. Market makers hedge against momentum by buying dips and selling rips, dampening volatility.',
        color: 'emerald',
      };
    } else if (chainData.spotPrice > chainData.maxPain) {
      return {
        state: 'SHORT GAMMA (VOL EXPANSION UP)',
        desc: 'Spot has broken above dealer gamma resistance. Market makers are forced to buy futures into the rally to maintain delta-neutrality, accelerating upside.',
        color: 'cyan',
      };
    } else {
      return {
        state: 'SHORT GAMMA (VOL EXPANSION DOWN)',
        desc: 'Spot has breached key put clusters. Market makers must sell delta into market weakness, accelerating downside velocity.',
        color: 'rose',
      };
    }
  }, [chainData.spotPrice, chainData.maxPain]);

  return (
    <div className="space-y-5">
      {/* ── 1. Top Regime & Gamma Intelligence Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Market Regime Identifier */}
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--theme-card-border)]">
            <span className="mono text-[10.5px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🧠</span> MARKET REGIME CLASSIFIER
            </span>
            <span className="text-[10px] mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
              {regimeInfo.regime}
            </span>
          </div>
          <div className="mt-3">
            <h4 className="mono text-[16px] font-black text-[var(--theme-card-text)]">
              {regimeInfo.title}
            </h4>
            <div className="mono text-[12px] font-bold text-emerald-400 mt-0.5">
              Bias: {regimeInfo.bias}
            </div>
            <p className="mt-2 text-[11px] text-[var(--theme-card-subtitle)] leading-relaxed">
              {regimeInfo.rationale}
            </p>
          </div>
        </div>

        {/* Dealer Net Gamma State */}
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--theme-card-border)]">
            <span className="mono text-[10.5px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡</span> DEALER NET GAMMA POSITIONING
            </span>
            <span
              className={`text-[10px] mono px-2 py-0.5 rounded font-bold border ${
                gammaState.color === 'emerald'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : gammaState.color === 'cyan'
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {gammaState.state}
            </span>
          </div>
          <div className="mt-3">
            <h4 className="mono text-[15px] font-black text-[var(--theme-card-text)]">
              Pinning Distance: {Math.abs(chainData.spotPrice - chainData.maxPain).toFixed(1)} pts
            </h4>
            <p className="mt-2 text-[11px] text-[var(--theme-card-subtitle)] leading-relaxed">
              {gammaState.desc}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Open Interest Distribution Visualizer (Side-by-Side Call vs Put) ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--theme-card-border)]">
          <div>
            <h3 className="mono text-[14px] font-black text-[var(--theme-card-text)] uppercase tracking-wider flex items-center gap-2">
              <span>📊 OPEN INTEREST DISTRIBUTION ACROSS STRIKES</span>
            </h3>
            <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-0.5">
              Dual Call (Red) vs Put (Green) open interest clustering indicating structural support and resistance walls.
            </p>
          </div>
          <div className="flex items-center gap-3 mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-rose-500" />
              Call OI: {(chainData.totalCallOI / 100000).toFixed(1)}L
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
              Put OI: {(chainData.totalPutOI / 100000).toFixed(1)}L
            </span>
          </div>
        </div>

        {/* Visual Dual Bars */}
        <div className="space-y-1.5 max-h-[360px] overflow-y-auto no-scrollbar pr-1">
          {chainData.strikes.map((s) => {
            const callPct = Math.round((s.call.openInterest / maxOI) * 100);
            const putPct = Math.round((s.put.openInterest / maxOI) * 100);
            const isATM = s.isATM;

            return (
              <div
                key={s.strike}
                className={`flex items-center gap-2 text-[10.5px] mono py-1 px-2 rounded transition-colors ${
                  isATM ? 'bg-amber-500/10 font-bold border border-amber-500/30' : 'hover:bg-emerald-500/5'
                }`}
              >
                {/* Call Bar (Right-aligned, expands left) */}
                <div className="flex-1 flex items-center justify-end gap-2">
                  <span className="text-[10px] text-[var(--theme-card-subtitle)]">
                    {(s.call.openInterest / 1000).toFixed(0)}k
                  </span>
                  <div className="w-48 h-3.5 bg-[var(--theme-card-subsurface)] rounded-l flex justify-end overflow-hidden">
                    <div
                      className="h-full bg-rose-500/70 hover:bg-rose-400 transition-all rounded-l"
                      style={{ width: `${callPct}%` }}
                    />
                  </div>
                </div>

                {/* Strike Center */}
                <div
                  className={`w-20 text-center font-black px-1.5 py-0.5 rounded text-[11px] ${
                    isATM
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : s.strike === chainData.maxPain
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-[var(--theme-card-text)]'
                  }`}
                >
                  ₹{s.strike}
                </div>

                {/* Put Bar (Left-aligned, expands right) */}
                <div className="flex-1 flex items-center justify-start gap-2">
                  <div className="w-48 h-3.5 bg-[var(--theme-card-subsurface)] rounded-r flex justify-start overflow-hidden">
                    <div
                      className="h-full bg-emerald-500/70 hover:bg-emerald-400 transition-all rounded-r"
                      style={{ width: `${putPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--theme-card-subtitle)]">
                    {(s.put.openInterest / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Max Pain Payout Simulation & Chart ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--theme-card-border)]">
          <div>
            <h3 className="mono text-[14px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span>🎯 MAX PAIN PAYOUT SIMULATOR</span>
            </h3>
            <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-0.5">
              Simulates total monetary liability for option writers at candidate expiry settlement prices. The lowest point represents Max Pain (₹{chainData.maxPain}).
            </p>
          </div>
          <div className="mono text-[11px]">
            Selected Test Price: <span className="font-black text-amber-400">₹{candidatePrice}</span>
          </div>
        </div>

        {/* Max Pain Slider */}
        <div className="mb-4">
          <input
            type="range"
            min={chainData.strikes[0]?.strike ?? 20000}
            max={chainData.strikes[chainData.strikes.length - 1]?.strike ?? 25000}
            step={instrument.strikeStep}
            value={candidatePrice}
            onChange={(e) => setCandidatePrice(Number(e.target.value))}
            className="w-full h-2 bg-[var(--theme-card-subsurface)] rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Loss Curve Bars */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto no-scrollbar">
          {maxPainCurve.map((point) => {
            const lossPct = Math.round((point.totalLoss / maxTotalLoss) * 100);
            const isMin = point.strike === chainData.maxPain;
            const isSelected = point.strike === candidatePrice;

            return (
              <div
                key={point.strike}
                onClick={() => setCandidatePrice(point.strike)}
                className={`flex items-center gap-3 text-[10.5px] mono py-1 px-2.5 rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-amber-500/20 border border-amber-500'
                    : isMin
                    ? 'bg-amber-500/10 font-black'
                    : 'hover:bg-emerald-500/5'
                }`}
              >
                <div className="w-16 font-bold text-[var(--theme-card-text)]">
                  ₹{point.strike}
                </div>
                <div className="flex-1 h-3.5 bg-[var(--theme-card-subsurface)] rounded overflow-hidden flex items-center">
                  <div
                    className={`h-full transition-all rounded ${
                      isMin
                        ? 'bg-amber-400 font-bold'
                        : 'bg-slate-500/40'
                    }`}
                    style={{ width: `${lossPct}%` }}
                  />
                </div>
                <div className="w-24 text-right font-black">
                  ₹{point.totalLoss} Cr
                  {isMin && <span className="text-[9px] text-amber-400 ml-1">★ PAIN</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
