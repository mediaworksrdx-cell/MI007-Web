'use client';

import React, { useMemo, useState } from 'react';
import { StrategyLeg } from '@/lib/fno/fnoTypes';
import {
  InnovationDistribution,
  MonteCarloRegime,
  runMonteCarloSimulation,
} from '@/lib/fno/monteCarloEngine';
import { VolSurfaceConfig } from '@/lib/fno/volatilitySurface';

interface MonteCarloViewProps {
  legs: StrategyLeg[];
  referenceSpot: number;
  frontDaysToExpiry: number;
  volSurfaceConfig?: Partial<VolSurfaceConfig>;
  currencySymbol?: string;
}

export default function MonteCarloView({
  legs,
  referenceSpot,
  frontDaysToExpiry,
  volSurfaceConfig,
  currencySymbol = '₹',
}: MonteCarloViewProps) {
  const [numPaths, setNumPaths] = useState<number>(5000);
  const [distribution, setDistribution] =
    useState<InnovationDistribution>('STUDENT_T_FAT_TAIL');
  const [regime, setRegime] = useState<MonteCarloRegime>('VOL_CLUSTER_JUMP');
  const [horizonDays, setHorizonDays] = useState<number>(frontDaysToExpiry);
  const [seed, setSeed] = useState<number>(42007);

  const effectiveHorizon = Math.max(1, Math.min(frontDaysToExpiry, horizonDays));

  const sim = useMemo(
    () =>
      runMonteCarloSimulation({
        legs,
        referenceSpot,
        frontDaysToExpiry,
        config: {
          seed,
          numPaths,
          horizonDays: effectiveHorizon,
          distribution,
          regime,
          volSurfaceConfig,
        },
      }),
    [
      legs,
      referenceSpot,
      frontDaysToExpiry,
      seed,
      numPaths,
      effectiveHorizon,
      distribution,
      regime,
      volSurfaceConfig,
    ]
  );

  const formatMoney = (val: number, signed = true) => {
    const abs = Math.abs(val);
    const sign = signed ? (val > 0 ? '+' : val < 0 ? '-' : '') : '';
    return `${sign}${currencySymbol}${Math.round(abs).toLocaleString()}`;
  };

  const maxBinFreq = Math.max(1, ...sim.histogram.map((b) => b.frequencyPct));

  return (
    <div className="space-y-3">
      {/* Simulation Configuration Bar */}
      <div className="p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <span className="text-blue-500">🎲</span>
            <span className="text-xs font-extrabold text-[var(--theme-card-text)]">
              Monte Carlo Risk & Tail CVaR Engine
            </span>
          </div>

          {/* Paths selector */}
          <div className="flex items-center rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] p-0.5 text-[10px] font-bold">
            {[2000, 5000, 10000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumPaths(n)}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  numPaths === n
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--theme-card-text)] opacity-70 hover:opacity-100'
                }`}
              >
                {(n / 1000).toFixed(0)}k Paths
              </button>
            ))}
          </div>

          {/* Distribution selector */}
          <button
            type="button"
            onClick={() =>
              setDistribution(
                distribution === 'STUDENT_T_FAT_TAIL' ? 'NORMAL' : 'STUDENT_T_FAT_TAIL'
              )
            }
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] cursor-pointer"
          >
            Innovations:{' '}
            <span className="text-indigo-400">
              {distribution === 'STUDENT_T_FAT_TAIL'
                ? 'Student-t (ν=5 Fat Tails)'
                : 'Gaussian N(0,1)'}
            </span>
          </button>

          {/* Regime selector */}
          <button
            type="button"
            onClick={() =>
              setRegime(regime === 'VOL_CLUSTER_JUMP' ? 'CALM_GBM' : 'VOL_CLUSTER_JUMP')
            }
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] cursor-pointer"
          >
            Regime:{' '}
            <span className="text-amber-500">
              {regime === 'VOL_CLUSTER_JUMP' ? 'Vol-Cluster + Crash Jump' : 'Calm Constant-Vol'}
            </span>
          </button>
        </div>

        {/* Horizon & Deterministic Seed */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <label className="flex items-center gap-1.5 bg-[var(--theme-card-bg)] px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)]">
            <span className="text-[10px] font-sans font-bold text-slate-400">Horizon:</span>
            <input
              type="range"
              min={1}
              max={Math.max(1, frontDaysToExpiry)}
              value={effectiveHorizon}
              onChange={(e) => setHorizonDays(Number(e.target.value))}
              className="w-20 accent-blue-600 cursor-pointer"
            />
            <span className="font-bold text-blue-500">{effectiveHorizon}d</span>
          </label>

          <button
            type="button"
            onClick={() => setSeed((s) => (s === 42007 ? 99007 : 42007))}
            className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[10px] font-bold text-[var(--theme-card-text)] flex items-center gap-1 cursor-pointer"
            title="Deterministic PRNG Seed — identical seed + inputs reproduce identical paths"
          >
            <span className="text-blue-500">↻</span>
            Seed #{seed}
          </button>
        </div>
      </div>

      {/* 6 Risk KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono tabular-nums">
        <div className="p-2.5 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
          <div className="text-[9px] font-sans font-bold uppercase text-slate-400">
            Expected Value E[PnL]
          </div>
          <div
            className={`text-sm font-extrabold mt-0.5 ${
              sim.expectedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {formatMoney(sim.expectedPnl)}
          </div>
          <div className="text-[9px] font-sans text-slate-400">
            Median P50: {formatMoney(sim.medianPnl)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
          <div className="text-[9px] font-sans font-bold uppercase text-slate-400">
            Monte Carlo POP
          </div>
          <div className="text-sm font-extrabold text-blue-500 mt-0.5">{sim.popPct}%</div>
          <div className="text-[9px] font-sans text-slate-400">
            {sim.isAtExpiryValuation ? 'At Expiry Valuation' : `Mark-to-Model T+${effectiveHorizon}d`}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
          <div className="text-[9px] font-sans font-bold uppercase text-slate-400">
            P25 / P75 Interquartile
          </div>
          <div className="text-xs font-extrabold text-[var(--theme-card-text)] mt-1">
            {formatMoney(sim.p25Pnl)} / {formatMoney(sim.p75Pnl)}
          </div>
          <div className="text-[9px] font-sans text-slate-400">Core 50% Outcome Band</div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
          <div className="text-[9px] font-sans font-bold uppercase text-amber-500">
            VaR 95% (Loss)
          </div>
          <div className="text-sm font-extrabold text-amber-500 mt-0.5">
            {formatMoney(sim.var95Loss, false)}
          </div>
          <div className="text-[9px] font-sans text-slate-400">
            P5 PnL: {formatMoney(sim.p5Pnl)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
          <div className="text-[9px] font-sans font-bold uppercase text-rose-500">
            VaR 99% (Loss)
          </div>
          <div className="text-sm font-extrabold text-rose-500 mt-0.5">
            {formatMoney(sim.var99Loss, false)}
          </div>
          <div className="text-[9px] font-sans text-slate-400">
            P1 PnL: {formatMoney(sim.p1Pnl)}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <div className="text-[9px] font-sans font-extrabold uppercase text-rose-500 flex items-center gap-1">
            <span>⚠️</span>
            CVaR 99% (Expected Shortfall)
          </div>
          <div className="text-sm font-extrabold text-rose-500 mt-0.5">
            {formatMoney(sim.cvar99Loss, false)}
          </div>
          <div className="text-[9px] font-sans text-rose-400/90">
            Worst 1% Tail Mean: {formatMoney(sim.tailMeanPnl99)}
          </div>
        </div>
      </div>

      {/* Histogram + Price Cone Fan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* P&L Distribution Histogram */}
        <div className="lg:col-span-8 p-3 rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-extrabold text-[var(--theme-card-text)]">
              Simulated Terminal P&L Distribution ({sim.config.numPaths.toLocaleString()} Paths)
            </span>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                Profitable Paths
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block" />
                Moderate Loss
              </span>
              <span className="flex items-center gap-1 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                CVaR 99% Tail Loss
              </span>
            </div>
          </div>

          <div className="h-40 flex items-end gap-1 pt-4 pb-1 px-2 border-b border-[var(--theme-card-border)]">
            {sim.histogram.map((bin, idx) => {
              const heightPct = Math.max(3, (bin.frequencyPct / maxBinFreq) * 100);
              const barColor = bin.isTailLoss99
                ? 'bg-rose-500'
                : bin.isProfit
                ? 'bg-emerald-500/85'
                : 'bg-slate-500/70';

              return (
                <div
                  key={idx}
                  className="flex-1 h-full flex flex-col justify-end items-center group relative"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${barColor} group-hover:opacity-100 opacity-90`}
                  />
                  {/* Hover tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 bg-slate-900 text-white text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-20 shadow">
                    {formatMoney(bin.binMid)}: {bin.frequencyPct}%
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
            <span>Min: {formatMoney(sim.minSimulatedPnl)}</span>
            <span>P5: {formatMoney(sim.p5Pnl)}</span>
            <span>Median: {formatMoney(sim.p50Pnl)}</span>
            <span>P95: {formatMoney(sim.p95Pnl)}</span>
            <span>Max: {formatMoney(sim.maxSimulatedPnl)}</span>
          </div>
        </div>

        {/* Underlying Price Fan Table */}
        <div className="lg:col-span-4 p-3 rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-extrabold text-[var(--theme-card-text)] mb-2">
              Underlying Spot Percentile Cone (T+0 → T+{effectiveHorizon}d)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right font-mono text-[10px] tabular-nums">
                <thead>
                  <tr className="text-slate-400 border-b border-[var(--theme-card-border)]">
                    <th className="py-1 text-left">Step</th>
                    <th className="py-1 text-rose-400">P5</th>
                    <th className="py-1">P25</th>
                    <th className="py-1 text-blue-500">P50</th>
                    <th className="py-1">P75</th>
                    <th className="py-1 text-emerald-400">P95</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.priceFan.map((step) => (
                    <tr
                      key={step.day}
                      className="border-b border-[var(--theme-card-border)]/50 last:border-b-0"
                    >
                      <td className="py-1.5 text-left font-bold text-[var(--theme-card-text)]">
                        T+{step.day}d
                      </td>
                      <td className="py-1.5 text-rose-400">{step.p5Spot.toFixed(0)}</td>
                      <td className="py-1.5 text-slate-400">{step.p25Spot.toFixed(0)}</td>
                      <td className="py-1.5 font-bold text-blue-500">{step.p50Spot.toFixed(0)}</td>
                      <td className="py-1.5 text-slate-400">{step.p75Spot.toFixed(0)}</td>
                      <td className="py-1.5 text-emerald-400">{step.p95Spot.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--theme-card-border)] text-[9px] text-slate-400">
            {sim.lossConventionNote}
          </div>
        </div>
      </div>
    </div>
  );
}
