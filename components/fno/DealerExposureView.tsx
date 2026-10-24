'use client';

import React, { useMemo } from 'react';
import { OptionChainData } from '@/lib/fno/fnoTypes';
import {
  DEALER_POSITIONING_ASSUMPTIONS,
  DealerPositioningAssumption,
  calculateDealerExposure,
} from '@/lib/fno/dealerExposure';

interface DealerExposureViewProps {
  chain: OptionChainData;
  assumption: DealerPositioningAssumption;
  onChangeAssumption: (next: DealerPositioningAssumption) => void;
  currencySymbol?: string;
}

export default function DealerExposureView({
  chain,
  assumption,
  onChangeAssumption,
  currencySymbol = '₹',
}: DealerExposureViewProps) {
  const profile = useMemo(
    () => calculateDealerExposure(chain, assumption),
    [chain, assumption]
  );

  const formatGex = (val: number) => {
    const abs = Math.abs(val);
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    if (abs >= 1e9) {
      return `${sign}${currencySymbol}${(abs / 1e9).toFixed(2)}B`;
    }
    if (abs >= 1e7) {
      return `${sign}${currencySymbol}${(abs / 1e7).toFixed(2)}Cr`;
    }
    if (abs >= 1e5) {
      return `${sign}${currencySymbol}${(abs / 1e5).toFixed(2)}L`;
    }
    if (abs >= 1000) {
      return `${sign}${currencySymbol}${(abs / 1000).toFixed(1)}k`;
    }
    return `${sign}${currencySymbol}${Math.round(abs)}`;
  };

  const maxAbsStrikeGex = Math.max(
    1,
    ...profile.strikes.map((s) => Math.max(s.absCallGex, s.absPutGex, Math.abs(s.netGex)))
  );

  return (
    <div className="space-y-3">
      {/* Positioning Assumption Selector & Regime Banner */}
      <div className="p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-blue-500">🏛️</span>
            <span className="text-xs font-extrabold text-[var(--theme-card-text)]">
              Dealer Gamma Exposure (GEX) & Zero-Gamma Flip Model
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
              {profile.expiry} ({profile.daysToExpiry} DTE)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(DEALER_POSITIONING_ASSUMPTIONS) as DealerPositioningAssumption[]).map(
              (key) => {
                const meta = DEALER_POSITIONING_ASSUMPTIONS[key];
                const isActive = assumption === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChangeAssumption(key)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] opacity-75 hover:opacity-100 border-[var(--theme-card-border)]'
                    }`}
                    title={meta.description}
                  >
                    {meta.shortLabel}
                  </button>
                );
              }
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--theme-card-border)]/60">
          <span>
            <strong className="text-[var(--theme-card-text)]">Active Assumption:</strong>{' '}
            {profile.assumption.description}
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            Calc: {profile.timestamp}
          </span>
        </div>
      </div>

      {/* 4 Institutional KPI Cards: Net GEX, Zero-Gamma Flip, Call Gamma Wall vs OI, Put Gamma Wall vs OI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono tabular-nums">
        <div className="p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
          <div className="text-[10px] font-sans font-bold uppercase text-slate-400">
            Net Estimated GEX (1% Move)
          </div>
          <div
            className={`text-base font-extrabold mt-0.5 ${
              profile.totalNetGex >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {formatGex(profile.totalNetGex)}
          </div>
          <div className="text-[10px] font-sans text-slate-400 mt-1 leading-tight">
            {profile.regime === 'POSITIVE_GAMMA_PINNING'
              ? 'Pinning / Mean-Reverting Dealer Flow'
              : profile.regime === 'NEGATIVE_GAMMA_ACCELERATION'
              ? 'Trend-Accelerating Dealer Hedge Flow'
              : 'Balanced Gamma Transition'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
          <div className="text-[10px] font-sans font-bold uppercase text-amber-500 flex items-center gap-1">
            <span>🎯</span>
            Zero-Gamma Flip Level
          </div>
          {profile.zeroGammaFlip !== null ? (
            <>
              <div className="text-base font-extrabold text-amber-500 mt-0.5">
                {currencySymbol}
                {profile.zeroGammaFlip.toLocaleString()}
              </div>
              <div className="text-[10px] font-sans text-slate-400 mt-1 leading-tight">
                {profile.flipMessage}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-sans font-extrabold text-slate-400 mt-1">
                No Valid Zero-Gamma Crossing
              </div>
              <div className="text-[10px] font-sans text-slate-400 mt-0.5 leading-tight">
                {profile.flipMessage}
              </div>
            </>
          )}
        </div>

        <div className="p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
          <div className="text-[10px] font-sans font-bold uppercase text-emerald-500">
            Call Gamma Wall vs Call OI Magnet
          </div>
          <div className="text-base font-extrabold text-[var(--theme-card-text)] mt-0.5">
            Wall: {profile.callGammaWallStrike.toLocaleString()}{' '}
            <span className="text-xs text-emerald-500">
              ({formatGex(profile.callGammaWallValue)})
            </span>
          </div>
          <div className="text-[10px] font-sans text-slate-400 mt-1">
            Highest Call OI Strike:{' '}
            <strong className="text-[var(--theme-card-text)] font-mono">
              {profile.highestCallOIStrike.toLocaleString()}
            </strong>{' '}
            {profile.callGammaWallStrike !== profile.highestCallOIStrike &&
              '(Gamma peak differs from raw OI)'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
          <div className="text-[10px] font-sans font-bold uppercase text-rose-500">
            Put Gamma Wall vs Put OI Magnet
          </div>
          <div className="text-base font-extrabold text-[var(--theme-card-text)] mt-0.5">
            Wall: {profile.putGammaWallStrike.toLocaleString()}{' '}
            <span className="text-xs text-rose-500">
              ({formatGex(profile.putGammaWallValue)})
            </span>
          </div>
          <div className="text-[10px] font-sans text-slate-400 mt-1">
            Highest Put OI Strike:{' '}
            <strong className="text-[var(--theme-card-text)] font-mono">
              {profile.highestPutOIStrike.toLocaleString()}
            </strong>{' '}
            {profile.putGammaWallStrike !== profile.highestPutOIStrike &&
              '(Gamma peak differs from raw OI)'}
          </div>
        </div>
      </div>

      {/* Per-Strike GEX Distribution Profile */}
      <div className="p-3 rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <span className="text-[11px] font-extrabold text-[var(--theme-card-text)]">
            Strike-by-Strike Dealer Gamma Exposure Profile (Spot: {currencySymbol}
            {profile.spotPrice.toLocaleString()})
          </span>
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              Positive GEX (+Gamma Pin)
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
              Negative GEX (-Gamma Acceleration)
            </span>
          </div>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto pr-1 font-mono text-[10px] tabular-nums">
          {profile.strikes.map((st) => {
            const pct = Math.min(100, (Math.abs(st.netGex) / maxAbsStrikeGex) * 100);
            const isPositive = st.netGex >= 0;
            const isCallWall = st.strike === profile.callGammaWallStrike;
            const isPutWall = st.strike === profile.putGammaWallStrike;
            const isNearSpot =
              Math.abs(st.strike - profile.spotPrice) <=
              (profile.strikes[1]?.strike - profile.strikes[0]?.strike || 50) * 0.6;

            return (
              <div
                key={st.strike}
                className={`grid grid-cols-12 items-center gap-2 py-1 px-2 rounded ${
                  isNearSpot
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : 'hover:bg-[var(--theme-card-surface)]'
                }`}
              >
                <div className="col-span-2 font-bold text-[var(--theme-card-text)] flex items-center gap-1">
                  <span>{st.strike}</span>
                  {isCallWall && (
                    <span className="text-[8px] px-1 rounded bg-emerald-500/20 text-emerald-500 font-sans font-extrabold">
                      C-WALL
                    </span>
                  )}
                  {isPutWall && (
                    <span className="text-[8px] px-1 rounded bg-rose-500/20 text-rose-500 font-sans font-extrabold">
                      P-WALL
                    </span>
                  )}
                </div>

                {/* Bidirectional Bar */}
                <div className="col-span-7 flex items-center h-3.5 bg-[var(--theme-card-surface)] rounded overflow-hidden relative">
                  <div className="w-1/2 h-full flex justify-end border-r border-slate-500/30">
                    {!isPositive && (
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-rose-500/80 rounded-l"
                      />
                    )}
                  </div>
                  <div className="w-1/2 h-full flex justify-start">
                    {isPositive && (
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full bg-emerald-500/80 rounded-r"
                      />
                    )}
                  </div>
                </div>

                <div
                  className={`col-span-3 text-right font-bold ${
                    isPositive ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {formatGex(st.netGex)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Provenance & Methodology Footnote */}
        <div className="mt-3 pt-2 border-t border-[var(--theme-card-border)] flex items-start gap-2 text-[10px] text-slate-400">
          <span className="text-amber-500 shrink-0">⚠️</span>
          <div>
            <strong className="text-[var(--theme-card-text)]">
              Methodology & Data Provenance:
            </strong>{' '}
            {profile.scalingConvention}. {profile.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
}
