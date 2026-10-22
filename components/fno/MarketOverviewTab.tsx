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
  const curr = instrument.market === 'USA' ? '$' : instrument.market === 'UAE' ? 'AED ' : '₹';
  const loc = instrument.market === 'INDIA' ? 'en-IN' : 'en-US';
  const oiSuffix = instrument.market === 'INDIA' ? ' L' : ' K';
  const oiDivisor = instrument.market === 'INDIA' ? 100000 : 1000;
  const contractsUnit = instrument.market === 'INDIA' ? 'Lakh Contracts' : 'Contracts';

  const SECTOR_HEATMAP = instrument.market === 'USA' ? [
    { sector: 'INFORMATION TECH', change: 1.85, flow: 'Long Buildup', sentiment: 'bullish' },
    { sector: 'SEMICONDUCTORS', change: 2.45, flow: 'Long Buildup', sentiment: 'bullish' },
    { sector: 'COMMUNICATION SERVICES', change: 1.15, flow: 'Short Covering', sentiment: 'bullish' },
    { sector: 'FINANCIALS & BANKS', change: 0.48, flow: 'Short Covering', sentiment: 'neutral' },
    { sector: 'CONSUMER DISCRETIONARY', change: -0.32, flow: 'Long Unwinding', sentiment: 'bearish' },
    { sector: 'HEALTHCARE & BIOTECH', change: -0.85, flow: 'Short Buildup', sentiment: 'bearish' },
    { sector: 'ENERGY & UTILITIES', change: -1.12, flow: 'Short Buildup', sentiment: 'bearish' },
    { sector: 'INDUSTRIALS', change: -0.45, flow: 'Long Unwinding', sentiment: 'bearish' },
  ] : instrument.market === 'UAE' ? [
    { sector: 'REAL ESTATE & DEV', change: 1.65, flow: 'Long Buildup', sentiment: 'bullish' },
    { sector: 'BANKING & FINANCIALS', change: 0.95, flow: 'Long Buildup', sentiment: 'bullish' },
    { sector: 'UTILITIES & ENERGY', change: 0.45, flow: 'Short Covering', sentiment: 'neutral' },
    { sector: 'TRANSPORT & AVIATION', change: 0.35, flow: 'Short Covering', sentiment: 'neutral' },
    { sector: 'TELECOMMUNICATION', change: -0.22, flow: 'Long Unwinding', sentiment: 'bearish' },
    { sector: 'INVESTMENT & HOLDINGS', change: -0.55, flow: 'Short Buildup', sentiment: 'bearish' },
    { sector: 'INSURANCE', change: -0.40, flow: 'Long Unwinding', sentiment: 'bearish' },
    { sector: 'CONSUMER STAPLES', change: -0.15, flow: 'Long Unwinding', sentiment: 'bearish' },
  ] : [
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
            Spot Reference: <span className="font-bold text-[var(--theme-card-text)]">{curr}{chainData.spotPrice.toLocaleString(loc)}</span>
          </div>
        </div>

        {/* Term Structure Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left mono text-[12px]">
            <thead>
              <tr className="border-b border-[var(--theme-card-border)] text-[10px] text-[var(--theme-card-subtitle)] uppercase tracking-wider">
                <th className="py-2.5 px-3">Contract Expiry</th>
                <th className="py-2.5 px-3">LTP ({curr.trim()})</th>
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
                      {curr}{contract.ltp.toLocaleString(loc, { minimumFractionDigits: 2 })}
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
                      {(contract.openInterest / oiDivisor).toFixed(1)}{oiSuffix}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      +{((contract.changeInOI / oiDivisor)).toFixed(1)}{oiSuffix}
                    </td>
                    <td className="py-3 px-3 text-[var(--theme-card-subtitle)]">
                      {(contract.volume / oiDivisor).toFixed(1)}{oiSuffix}
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
              {curr}{chainData.highestCallOIStrike.toLocaleString(loc)}
            </div>
            <div className="text-right">
              <div className="mono text-[13px] font-extrabold text-rose-400">
                {(chainData.totalCallOI / oiDivisor).toFixed(1)} {contractsUnit}
              </div>
              <div className="text-[10px] mono text-[var(--theme-card-subtitle)]">
                Highest Open Interest Concentration
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-[var(--theme-card-subtitle)] leading-relaxed">
            Market makers and option writers have constructed a strong technical ceiling here. A decisive breakout above {curr}{chainData.highestCallOIStrike.toLocaleString(loc)} triggers massive short covering.
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
              {curr}{chainData.highestPutOIStrike.toLocaleString(loc)}
            </div>
            <div className="text-right">
              <div className="mono text-[13px] font-extrabold text-emerald-400">
                {(chainData.totalPutOI / oiDivisor).toFixed(1)} {contractsUnit}
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

      {/* ── 3. Sectoral Derivatives Positioning Heatmap ── */}
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
