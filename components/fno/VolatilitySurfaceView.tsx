'use client';

import React, { useMemo } from 'react';
import { OptionChainData } from '@/lib/fno/fnoTypes';
import {
  VolSurfaceConfig,
  VolSurfaceMode,
  buildVolatilitySurfaceAnalytics,
} from '@/lib/fno/volatilitySurface';

interface VolatilitySurfaceViewProps {
  chain: OptionChainData;
  simulatedSpot: number;
  config: VolSurfaceConfig;
  onChangeConfig: (next: VolSurfaceConfig) => void;
  currencySymbol?: string;
}

const SURFACE_MODES: Array<{
  id: VolSurfaceMode;
  label: string;
  desc: string;
}> = [
  {
    id: 'STICKY_STRIKE',
    label: 'Sticky-Strike',
    desc: 'Each fixed strike retains its anchor IV unless explicitly shifted.',
  },
  {
    id: 'STICKY_DELTA',
    label: 'Sticky-Delta (Floating Smile)',
    desc: 'Volatility smile floats with simulated spot moneyness.',
  },
  {
    id: 'PANIC_SKEW',
    label: 'Panic Skew (Downside Crash)',
    desc: 'Asymmetric OTM Put IV expansion + upside Call wing flattening.',
  },
  {
    id: 'VOL_CRUSH',
    label: 'Event Vol Crush',
    desc: 'Post-event IV collapse scaled by term-structure √T weight.',
  },
];

export default function VolatilitySurfaceView({
  chain,
  simulatedSpot,
  config,
  onChangeConfig,
  currencySymbol = '₹',
}: VolatilitySurfaceViewProps) {
  const analytics = useMemo(
    () => buildVolatilitySurfaceAnalytics(chain, simulatedSpot, config),
    [chain, simulatedSpot, config]
  );

  // SVG dimensions for Strike Skew Smile chart
  const svgW = 680;
  const svgH = 220;
  const padL = 46;
  const padR = 20;
  const padT = 18;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const allIvs = analytics.strikes.flatMap((s) => [
    s.baselineCallIvPct,
    s.baselinePutIvPct,
    s.shockedCallIvPct,
    s.shockedPutIvPct,
  ]);
  const minIv = Math.max(4, Math.floor((Math.min(...allIvs, 10) - 1.5) * 10) / 10);
  const maxIv = Math.ceil((Math.max(...allIvs, 22) + 1.5) * 10) / 10;
  const ivSpan = Math.max(2, maxIv - minIv);

  const count = Math.max(1, analytics.strikes.length - 1);
  const toX = (idx: number) => padL + (idx / count) * plotW;
  const toY = (ivVal: number) => padT + plotH - ((ivVal - minIv) / ivSpan) * plotH;

  const basePutPath = analytics.strikes
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(s.baselinePutIvPct).toFixed(1)}`)
    .join(' ');
  const shockedPutPath = analytics.strikes
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(s.shockedPutIvPct).toFixed(1)}`)
    .join(' ');
  const shockedCallPath = analytics.strikes
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(s.shockedCallIvPct).toFixed(1)}`)
    .join(' ');

  return (
    <div className="space-y-3">
      {/* Top Regime Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="text-blue-500">🌊</span>
              Volatility Skew & Surface Regime
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    autoSpotVolCoupling: !config.autoSpotVolCoupling,
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                  config.autoSpotVolCoupling
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40'
                    : 'bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] opacity-75 border-[var(--theme-card-border)]'
                }`}
              >
                <span>🔗</span>
                Spot–Vol Coupling ({config.autoSpotVolCoupling ? 'ON' : 'OFF'})
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    ...config,
                    termStructureScaling:
                      config.termStructureScaling === 'SQRT_TIME' ? 'UNIFORM' : 'SQRT_TIME',
                  })
                }
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] cursor-pointer"
              >
                Term Scaling:{' '}
                <span className="text-blue-500">
                  {config.termStructureScaling === 'SQRT_TIME' ? '√(T_front / T)' : 'Uniform'}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SURFACE_MODES.map((m) => {
              const active = config.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeConfig({ ...config, mode: m.id })}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600/15 border-blue-500 text-[var(--theme-card-text)]'
                      : 'bg-[var(--theme-card-bg)] border-[var(--theme-card-border)] text-[var(--theme-card-text)] opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="text-[11px] font-extrabold flex items-center justify-between">
                    <span>{m.label}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight mt-0.5">{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary KPI Box */}
        <div className="lg:col-span-4 p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] grid grid-cols-2 gap-2 font-mono tabular-nums">
          <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
            <span className="text-[9px] font-sans font-bold uppercase text-slate-400 block">
              ATM IV (Base → Sim)
            </span>
            <span className="text-xs font-extrabold text-[var(--theme-card-text)]">
              {analytics.baselineAtmIvPct.toFixed(1)}% →{' '}
              <span className="text-blue-500">{analytics.shockedAtmIvPct.toFixed(1)}%</span>
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
            <span className="text-[9px] font-sans font-bold uppercase text-slate-400 block">
              25Δ Put-Call Skew
            </span>
            <span className="text-xs font-extrabold text-[var(--theme-card-text)]">
              {analytics.baselineSkew25dPct >= 0 ? '+' : ''}
              {analytics.baselineSkew25dPct.toFixed(1)}% →{' '}
              <span className="text-amber-500">
                {analytics.shockedSkew25dPct >= 0 ? '+' : ''}
                {analytics.shockedSkew25dPct.toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
            <span className="text-[9px] font-sans font-bold uppercase text-slate-400 block">
              Spot-Coupled Shift
            </span>
            <span
              className={`text-xs font-extrabold ${
                analytics.coupledAtmShiftPct > 0
                  ? 'text-rose-500'
                  : analytics.coupledAtmShiftPct < 0
                  ? 'text-emerald-500'
                  : 'text-slate-400'
              }`}
            >
              {analytics.coupledAtmShiftPct >= 0 ? '+' : ''}
              {analytics.coupledAtmShiftPct.toFixed(2)}% IV
            </span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
            <span className="text-[9px] font-sans font-bold uppercase text-slate-400 block">
              Simulated Spot
            </span>
            <span className="text-xs font-extrabold text-[var(--theme-card-text)]">
              {currencySymbol}
              {analytics.simulatedSpot.toLocaleString()} ({analytics.spotMovePct >= 0 ? '+' : ''}
              {analytics.spotMovePct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Volatility Smile / Skew SVG + Multi-Expiry Term Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 p-3 rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-extrabold text-[var(--theme-card-text)]">
              Strike Implied Volatility Smile & Skew ({chain.expiry})
            </span>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-400 inline-block border-t border-dashed" />
                Baseline Put IV
              </span>
              <span className="flex items-center gap-1 text-rose-500">
                <span className="w-3 h-0.5 bg-rose-500 inline-block" />
                Shocked Put IV
              </span>
              <span className="flex items-center gap-1 text-blue-500">
                <span className="w-3 h-0.5 bg-blue-500 inline-block" />
                Shocked Call IV
              </span>
            </div>
          </div>

          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-48 overflow-visible">
            {/* Horizontal IV grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const ivVal = minIv + f * ivSpan;
              const y = toY(ivVal);
              return (
                <g key={f}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={svgW - padR}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-500/15"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 font-mono text-[9px]"
                  >
                    {ivVal.toFixed(1)}%
                  </text>
                </g>
              );
            })}

            {/* Baseline Put IV dashed curve */}
            <path
              d={basePutPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            {/* Shocked Call IV curve */}
            <path d={shockedCallPath} fill="none" stroke="#3b82f6" strokeWidth="2" />
            {/* Shocked Put IV curve */}
            <path d={shockedPutPath} fill="none" stroke="#f43f5e" strokeWidth="2.2" />

            {/* Strike labels along X axis */}
            {analytics.strikes
              .filter((_, idx) => idx % 4 === 0 || analytics.strikes[idx].strike === analytics.atmStrike)
              .map((s) => {
                const idx = analytics.strikes.findIndex((pt) => pt.strike === s.strike);
                const x = toX(idx);
                const isAtm = s.strike === analytics.atmStrike;
                return (
                  <g key={s.strike}>
                    {isAtm && (
                      <line
                        x1={x}
                        y1={padT}
                        x2={x}
                        y2={svgH - padB}
                        stroke="#3b82f6"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}
                    <text
                      x={x}
                      y={svgH - 10}
                      textAnchor="middle"
                      className={`font-mono text-[9px] ${
                        isAtm ? 'fill-blue-500 font-bold' : 'fill-slate-400'
                      }`}
                    >
                      {s.strike}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        {/* Multi-Expiry Term Structure Table */}
        <div className="lg:col-span-4 p-3 rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-extrabold text-[var(--theme-card-text)] mb-2 flex items-center justify-between">
              <span>Multi-Expiry Term Structure</span>
              <span className="text-[9px] font-mono text-blue-500">Calendar / Diagonal</span>
            </div>
            <div className="space-y-2">
              {analytics.termStructure.map((node) => (
                <div
                  key={node.expiry}
                  className="p-2 rounded-lg bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] flex items-center justify-between font-mono text-[11px] tabular-nums"
                >
                  <div>
                    <div className="font-sans font-bold text-[var(--theme-card-text)] text-[11px]">
                      {node.expiry}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {node.daysToExpiry} DTE • Shock Weight {node.termShockMultiplier.toFixed(2)}×
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-blue-500">
                      {node.shockedAtmIvPct.toFixed(2)}%
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Base {node.baselineAtmIvPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-[var(--theme-card-border)] text-[10px] text-slate-400 leading-relaxed">
            When <strong className="text-[var(--theme-card-text)]">√(T_front / T)</strong> scaling is
            active, near-dated options react with higher IV elasticity than back-month legs in
            Calendar and Diagonal spreads.
          </div>
        </div>
      </div>
    </div>
  );
}
