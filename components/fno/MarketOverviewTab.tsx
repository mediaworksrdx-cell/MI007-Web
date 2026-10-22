// ─── F&O Market Overview & Futures Term Structure Workspace ─────────────────
'use client';

import React from 'react';
import {
  FnoInstrument,
  OptionChainData,
  FuturesTermStructure,
} from '@/lib/fno/fnoTypes';

interface MarketOverviewTabProps {
  instrument: FnoInstrument;
  chainData: OptionChainData;
  termStructure: FuturesTermStructure;
  onSelectStrike?: (strike: number) => void;
  onOpenChainTab?: () => void;
  onOpenBuildupTab?: () => void;
}

export function MarketOverviewTab({
  instrument,
  chainData,
  termStructure,
  onOpenChainTab,
  onOpenBuildupTab,
}: MarketOverviewTabProps) {
  const SECTOR_HEATMAP = [
    { sector: 'INFORMATION TECH', change: 1.85, flow: 'Long Buildup', sentiment: 'bullish' },
    { sector: 'CAPITAL GOODS & INFRA', change: 1.15, flow: 'Long Buildup', sentiment: 'bullish' },
    { sector: 'TELECOMMUNICATION', change: 0.95, flow: 'Short Covering', sentiment: 'bullish' },
    { sector: 'PRIVATE BANKING', change: 0.48, flow: 'Short Covering', sentiment: 'neutral' },
    { sector: 'PSU BANKING', change: -0.52, flow: 'Long Unwinding', sentiment: 'bearish' },
    { sector: 'AUTOMOBILES', change: -1.05, flow: 'Short Buildup', sentiment: 'bearish' },
    { sector: 'OIL & GAS / ENERGY', change: -1.12, flow: 'Short Buildup', sentiment: 'bearish' },
    { sector: 'FMCG & CONSUMER', change: -0.45, flow: 'Long Unwinding', sentiment: 'bearish' },
  ];

  return (
    <div className="space-y-5">
      {/* ── 1. Futures Term Structure Card ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--theme-card-border)]">
          <div>
            <h3 className="mono text-[14px] font-black text-[var(--theme-card-text)] uppercase tracking-wider flex items-center gap-2">
              <span>📈 FUTURES TERM STRUCTURE</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE MONTHS
              </span>
            </h3>
            <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-0.5">
              Cost of carry, contango / backwardation spread across near, next, and far-month futures expiries.
            </p>
          </div>
          <div className="mono text-[11px] text-[var(--theme-card-subtitle)]">
            Spot Reference: <span className="font-bold text-[var(--theme-card-text)]">₹{chainData.spotPrice.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Term Structure Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left mono text-[12px]">
            <thead>
              <tr className="border-b border-[var(--theme-card-border)] text-[10px] text-[var(--theme-card-subtitle)] uppercase tracking-wider">
                <th className="py-2.5 px-3">Contract Expiry</th>
                <th className="py-2.5 px-3">LTP (₹)</th>
                <th className="py-2.5 px-3">Change (%)</th>
                <th className="py-2.5 px-3">Basis (Spread)</th>
                <th className="py-2.5 px-3">Cost of Carry</th>
                <th className="py-2.5 px-3">Open Interest</th>
                <th className="py-2.5 px-3">OI Chg</th>
                <th className="py-2.5 px-3">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-card-border)]/50">
              {termStructure.contracts.map((contract, idx) => {
                const isContango = contract.basis >= 0;
                const isPositive = contract.change >= 0;
                return (
                  <tr key={contract.expiry} className="hover:bg-emerald-500/5 transition-colors">
                    <td className="py-3 px-3 font-black text-[var(--theme-card-text)] flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] text-[var(--theme-card-subtitle)]">
                        {idx === 0 ? 'NEAR' : idx === 1 ? 'NEXT' : 'FAR'}
                      </span>
                      <span>{contract.expiry}</span>
                    </td>
                    <td className="py-3 px-3 font-black text-[var(--theme-card-text)]">
                      ₹{contract.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 px-3 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{contract.changePct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 font-bold">
                      <span className={isContango ? 'text-emerald-400' : 'text-rose-400'}>
                        {contract.basis >= 0 ? '+' : ''}{contract.basis.toFixed(2)}
                      </span>
                      <span className="text-[9.5px] text-[var(--theme-card-subtitle)] ml-1">
                        ({isContango ? 'Contango' : 'Backwardation'})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[var(--theme-card-subtitle)] font-medium">
                      +{(contract.basis * 0.08).toFixed(2)}% p.a.
                    </td>
                    <td className="py-3 px-3 text-[var(--theme-card-text)] font-semibold">
                      {(contract.openInterest / 100000).toFixed(2)} L
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      +{((contract.changeInOI / 100000)).toFixed(2)} L
                    </td>
                    <td className="py-3 px-3 text-[var(--theme-card-subtitle)]">
                      {(contract.volume / 100000).toFixed(2)} L
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. Open Interest Concentration Magnets ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resistance Magnet */}
        <div className="bg-[var(--theme-card-surface)] border border-rose-500/30 rounded-xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="mono text-[10.5px] font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              PRIMARY RESISTANCE (CALL OI MAGNET)
            </span>
            <span className="text-[10px] mono text-[var(--theme-card-subtitle)]">
              Heavy Call Writing Overhead
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="mono text-[26px] font-black text-[var(--theme-card-text)]">
              ₹{chainData.highestCallOIStrike.toLocaleString('en-IN')}
            </div>
            <div className="text-right">
              <div className="mono text-[13px] font-extrabold text-rose-400">
                {(chainData.totalCallOI / 100000).toFixed(2)} Lakh Contracts
              </div>
              <div className="text-[10px] mono text-[var(--theme-card-subtitle)]">
                Highest Open Interest Concentration
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-[var(--theme-card-subtitle)] leading-relaxed">
            Market makers and option writers have constructed a strong technical ceiling here. A decisive breakout above ₹{chainData.highestCallOIStrike} triggers massive short covering.
          </p>
        </div>

        {/* Support Magnet */}
        <div className="bg-[var(--theme-card-surface)] border border-emerald-500/30 rounded-xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="mono text-[10.5px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              PRIMARY SUPPORT (PUT OI MAGNET)
            </span>
            <span className="text-[10px] mono text-[var(--theme-card-subtitle)]">
              Aggressive Put Writing Floor
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="mono text-[26px] font-black text-[var(--theme-card-text)]">
              ₹{chainData.highestPutOIStrike.toLocaleString('en-IN')}
            </div>
            <div className="text-right">
              <div className="mono text-[13px] font-extrabold text-emerald-400">
                {(chainData.totalPutOI / 100000).toFixed(2)} Lakh Contracts
              </div>
              <div className="text-[10px] mono text-[var(--theme-card-subtitle)]">
                Highest Put Base Defense
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-[var(--theme-card-subtitle)] leading-relaxed">
            Strong institutional put accumulation provides an underlying cushion. Bullish participants defend this zone; a sustained break below triggers panic long unwinding.
          </p>
        </div>
      </div>

      {/* ── 3. Quick Action Banners: Option Chain & Buildup Scanner ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Go to Option Chain */}
        <div
          onClick={onOpenChainTab}
          className="group bg-gradient-to-r from-emerald-500/10 via-[var(--theme-card-surface)] to-[var(--theme-card-surface)] border border-emerald-500/30 hover:border-emerald-500 rounded-xl p-4 cursor-pointer transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="mono text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                INTERACTIVE OPTION CHAIN
              </span>
              <h4 className="mono text-[15px] font-black text-[var(--theme-card-text)] mt-0.5 group-hover:text-emerald-400 transition-colors">
                Launch Advanced Chain & Greeks Matrix →
              </h4>
              <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-1">
                Examine dual Call/Put OI depth bars, IV smile, Black-Scholes Greeks, and 1-click strategy builder legs.
              </p>
            </div>
            <span className="text-2xl text-emerald-400 font-bold group-hover:translate-x-1 transition-transform">
              ⚡
            </span>
          </div>
        </div>

        {/* Go to Buildup Scanner */}
        <div
          onClick={onOpenBuildupTab}
          className="group bg-gradient-to-r from-cyan-500/10 via-[var(--theme-card-surface)] to-[var(--theme-card-surface)] border border-cyan-500/30 hover:border-cyan-500 rounded-xl p-4 cursor-pointer transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="mono text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                INSTITUTIONAL POSITIONING
              </span>
              <h4 className="mono text-[15px] font-black text-[var(--theme-card-text)] mt-0.5 group-hover:text-cyan-400 transition-colors">
                Open 4-Quadrant Buildup Scanner →
              </h4>
              <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-1">
                Scan Long Buildup, Short Buildup, Short Covering, and Long Unwinding across 50+ major F&O stocks.
              </p>
            </div>
            <span className="text-2xl text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">
              📊
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. Sectoral Derivatives Positioning Heatmap ── */}
      <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="mb-3.5 pb-2.5 border-b border-[var(--theme-card-border)] flex items-center justify-between">
          <div>
            <h3 className="mono text-[13px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
              🏭 SECTORAL DERIVATIVES POSITIONING HEATMAP
            </h3>
            <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-0.5">
              Aggregated institutional open interest flow and price momentum across core industrial sectors.
            </p>
          </div>
          <span className="mono text-[10px] text-[var(--theme-card-subtitle)]">
            Updated Real-Time
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SECTOR_HEATMAP.map((item) => {
            const isBullish = item.sentiment === 'bullish';
            const isNeutral = item.sentiment === 'neutral';
            return (
              <div
                key={item.sector}
                className="bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] rounded-lg p-2.5"
              >
                <div className="mono text-[10px] font-bold text-[var(--theme-card-subtitle)] truncate">
                  {item.sector}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span
                    className={`mono text-[14px] font-black ${
                      isBullish
                        ? 'text-emerald-400'
                        : isNeutral
                        ? 'text-cyan-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                  <span
                    className={`text-[9px] mono font-extrabold px-1.5 py-0.2 rounded border ${
                      isBullish
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : isNeutral
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {item.flow}
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
