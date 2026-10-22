// ─── Derivatives Analytics Workspace ──────────────────────────────────────────
// Focused exclusively on the 5 core institutional pillars:
// 1. Max Pain (Payout Simulation & Pinning Odds)
// 2. PCR (Put-Call Ratio & Market Sentiment Gauge)
// 3. Greeks (Delta, Gamma, Theta, Vega, Rho strike distribution & net aggregates)
// 4. DEX (Delta Exposure & Dealer Positioning across strikes)
// 5. IV (Implied Volatility Smile & Skew curve)
'use client';

import React, { useState, useMemo } from 'react';
import { OptionChainData, FnoInstrument } from '@/lib/fno/fnoTypes';

interface DerivativesAnalyticsTabProps {
  instrument: FnoInstrument;
  chainData: OptionChainData;
  onSelectStrike?: (strike: number) => void;
  onOpenBuilderTab?: () => void;
}

type ActivePillar = 'ALL' | 'MAX_PAIN' | 'PCR' | 'GREEKS' | 'DEX' | 'IV';
type GreekType = 'delta' | 'gamma' | 'theta' | 'vega' | 'rho';

export function DerivativesAnalyticsTab({
  instrument,
  chainData,
  onOpenBuilderTab,
}: DerivativesAnalyticsTabProps) {
  const [activePillar, setActivePillar] = useState<ActivePillar>('ALL');
  const [selectedGreek, setSelectedGreek] = useState<GreekType>('delta');
  const [candidatePrice, setCandidatePrice] = useState<number>(chainData.maxPain);
  const [hoveredStrike, setHoveredStrike] = useState<number | null>(null);

  const curr = instrument.market === 'USA' ? '$' : instrument.market === 'UAE' ? 'AED ' : '₹';
  const loc = instrument.market === 'INDIA' ? 'en-IN' : 'en-US';
  const unit = instrument.market === 'INDIA' ? 'Cr' : 'M';
  const currencyName = instrument.market === 'USA' ? 'dollar' : instrument.market === 'UAE' ? 'dirham' : 'rupee';

  const lotSize = instrument.lotSize || chainData.lotSize || 1;
  const spot = chainData.spotPrice;

  // ════════════════════════════════════════════════════════════════════════════
  // 1. MAX PAIN COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════
  const maxPainData = useMemo(() => {
    const strikes = chainData.strikes;
    const points = strikes.map((s) => {
      const k = s.strike;
      let callLoss = 0;
      let putLoss = 0;

      for (const row of strikes) {
        if (k > row.strike) {
          callLoss += (k - row.strike) * row.call.openInterest * lotSize;
        }
        if (k < row.strike) {
          putLoss += (row.strike - k) * row.put.openInterest * lotSize;
        }
      }

      const callLossCr = callLoss / 1e7;
      const putLossCr = putLoss / 1e7;
      const totalLossCr = callLossCr + putLossCr;

      return {
        strike: k,
        callLossCr: Math.round(callLossCr * 10) / 10,
        putLossCr: Math.round(putLossCr * 10) / 10,
        totalLossCr: Math.round(totalLossCr * 10) / 10,
      };
    });

    const maxLoss = Math.max(...points.map((p) => p.totalLossCr), 1);
    const minLossPoint = points.reduce((min, p) => (p.totalLossCr < min.totalLossCr ? p : min), points[0] || { strike: chainData.maxPain, totalLossCr: 0 });
    const maxPainStrike = minLossPoint?.strike ?? chainData.maxPain;
    const minLossCr = minLossPoint?.totalLossCr ?? 0;
    const distanceToSpot = Math.abs(spot - maxPainStrike);
    const distancePct = Math.round((distanceToSpot / spot) * 10000) / 100;

    return { points, maxLoss, maxPainStrike, minLossCr, distanceToSpot, distancePct };
  }, [chainData.strikes, chainData.maxPain, lotSize, spot]);

  // ════════════════════════════════════════════════════════════════════════════
  // 2. PCR (PUT-CALL RATIO) COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════
  const pcrData = useMemo(() => {
    const callOI = chainData.totalCallOI;
    const putOI = chainData.totalPutOI;
    const oiPcr = callOI > 0 ? Math.round((putOI / callOI) * 100) / 100 : chainData.pcr;

    const callVol = chainData.totalCallVolume || 1;
    const putVol = chainData.totalPutVolume || 0;
    const volPcr = callVol > 0 ? Math.round((putVol / callVol) * 100) / 100 : 0.95;

    let sentiment: 'EXTREME OVERSOLD' | 'BEARISH' | 'NEUTRAL' | 'BULLISH' | 'EXTREME OVERBOUGHT';
    let sentimentColor: string;
    let desc: string;

    if (oiPcr < 0.65) {
      sentiment = 'EXTREME OVERSOLD';
      sentimentColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      desc = 'Call writing heavily dominant. Market is historically oversold; sharp short-covering bounce watch.';
    } else if (oiPcr < 0.85) {
      sentiment = 'BEARISH';
      sentimentColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      desc = 'Call writers capping upside momentum. Heavy supply resistance stacked above current spot.';
    } else if (oiPcr <= 1.25) {
      sentiment = 'NEUTRAL';
      sentimentColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      desc = 'Equilibrium between Call resistance and Put support. Sideways rangebound movement favored.';
    } else if (oiPcr <= 1.55) {
      sentiment = 'BULLISH';
      sentimentColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      desc = 'Strong Put writing providing deep downside cushion. Bulls firmly controlling trajectory.';
    } else {
      sentiment = 'EXTREME OVERBOUGHT';
      sentimentColor = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      desc = 'Extreme Put writing concentration. Market overextended; vulnerable to profit-taking unwinding.';
    }

    const totalOI = callOI + putOI || 1;
    const callSharePct = Math.round((callOI / totalOI) * 100);
    const putSharePct = 100 - callSharePct;

    return { oiPcr, volPcr, callOI, putOI, totalOI, callSharePct, putSharePct, sentiment, sentimentColor, desc };
  }, [chainData]);

  // ════════════════════════════════════════════════════════════════════════════
  // 3. GREEKS MATRIX & AGGREGATES
  // ════════════════════════════════════════════════════════════════════════════
  const greeksData = useMemo(() => {
    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;
    let netRho = 0;

    const rows = chainData.strikes.map((s) => {
      const cG = s.call.greeks;
      const pG = s.put.greeks;
      const cOI = s.call.openInterest;
      const pOI = s.put.openInterest;

      netDelta += (cOI * cG.delta + pOI * pG.delta) * lotSize;
      netGamma += (cOI * cG.gamma + pOI * pG.gamma) * lotSize;
      netTheta += (cOI * cG.theta + pOI * pG.theta) * lotSize;
      netVega += (cOI * cG.vega + pOI * pG.vega) * lotSize;
      netRho += (cOI * (cG.rho || 0) + pOI * (pG.rho || 0)) * lotSize;

      return {
        strike: s.strike,
        isATM: s.isATM,
        callDelta: cG.delta,
        putDelta: pG.delta,
        callGamma: cG.gamma,
        putGamma: pG.gamma,
        callTheta: cG.theta,
        putTheta: pG.theta,
        callVega: cG.vega,
        putVega: pG.vega,
        callRho: cG.rho || 0,
        putRho: pG.rho || 0,
      };
    });

    return {
      rows,
      netDelta: Math.round(netDelta),
      netGamma: Math.round(netGamma * 100) / 100,
      netThetaCr: Math.round((netTheta / 1e7) * 100) / 100,
      netVegaCr: Math.round((netVega / 1e7) * 100) / 100,
      netRho: Math.round(netRho),
    };
  }, [chainData.strikes, lotSize]);

  // ════════════════════════════════════════════════════════════════════════════
  // 4. DEX (DELTA EXPOSURE) COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════
  const dexData = useMemo(() => {
    let totalCallDex = 0;
    let totalPutDex = 0;

    const rows = chainData.strikes.map((s) => {
      // Call DEX in ₹ Cr = Call OI * Call Delta * LotSize * Spot / 1e7
      const callDex = (s.call.openInterest * s.call.greeks.delta * lotSize * spot) / 1e7;
      // Put DEX in ₹ Cr = Put OI * Put Delta * LotSize * Spot / 1e7 (Put Delta is negative)
      const putDex = (s.put.openInterest * s.put.greeks.delta * lotSize * spot) / 1e7;
      const netDex = callDex + putDex;

      totalCallDex += callDex;
      totalPutDex += putDex;

      return {
        strike: s.strike,
        isATM: s.isATM,
        callDex: Math.round(callDex * 10) / 10,
        putDex: Math.round(putDex * 10) / 10,
        netDex: Math.round(netDex * 10) / 10,
      };
    });

    const totalNetDex = Math.round((totalCallDex + totalPutDex) * 10) / 10;
    const maxAbsDex = Math.max(...rows.map((r) => Math.max(Math.abs(r.callDex), Math.abs(r.putDex), Math.abs(r.netDex))), 1);

    // Identify Zero Delta Flip Strike
    let flipStrike = chainData.maxPain;
    for (let i = 0; i < rows.length - 1; i++) {
      if ((rows[i].netDex <= 0 && rows[i + 1].netDex > 0) || (rows[i].netDex >= 0 && rows[i + 1].netDex < 0)) {
        flipStrike = rows[i + 1].strike;
        break;
      }
    }

    const regime =
      totalNetDex >= 0
        ? {
            title: 'POSITIVE DELTA REGIME (STABILIZING)',
            badge: 'LONG DELTA',
            color: 'emerald',
            desc: 'Market makers are net Long Delta. Dealers hedge by buying dips and selling rips, dampening overall intraday realized volatility.',
          }
        : {
            title: 'NEGATIVE DELTA REGIME (VOL ACCELERATOR)',
            badge: 'SHORT DELTA',
            color: 'rose',
            desc: 'Market makers are net Short Delta. Dealers must sell underlying futures into market sell-offs, accelerating downward price velocity.',
          };

    return {
      rows,
      totalCallDex: Math.round(totalCallDex * 10) / 10,
      totalPutDex: Math.round(totalPutDex * 10) / 10,
      totalNetDex,
      maxAbsDex,
      flipStrike,
      regime,
    };
  }, [chainData.strikes, chainData.maxPain, lotSize, spot]);

  // ════════════════════════════════════════════════════════════════════════════
  // 5. IV (IMPLIED VOLATILITY SMILE & SKEW) COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════
  const ivData = useMemo(() => {
    const rows = chainData.strikes.map((s) => ({
      strike: s.strike,
      isATM: s.isATM,
      callIV: s.call.impliedVolatility,
      putIV: s.put.impliedVolatility,
      skew: Math.round((s.put.impliedVolatility - s.call.impliedVolatility) * 10) / 10,
    }));

    const atmRow = rows.find((r) => r.isATM) || rows[Math.floor(rows.length / 2)];
    const atmIV = atmRow ? Math.round(((atmRow.callIV + atmRow.putIV) / 2) * 10) / 10 : 14.5;
    const minIV = Math.min(...rows.flatMap((r) => [r.callIV, r.putIV]), 10);
    const maxIV = Math.max(...rows.flatMap((r) => [r.callIV, r.putIV]), 25);
    const ivSpread = Math.round((maxIV - minIV) * 10) / 10;
    const avgSkew = Math.round((rows.reduce((acc, r) => acc + r.skew, 0) / rows.length) * 10) / 10;

    return { rows, atmIV, minIV, maxIV, ivSpread, avgSkew, atmRow };
  }, [chainData.strikes]);

  // Quick Pillar Navigation Options
  const PILLARS: Array<{ id: ActivePillar; label: string; icon: string; countBadge?: string }> = [
    { id: 'ALL', label: 'ALL 5 PILLARS', icon: '⚡' },
    { id: 'MAX_PAIN', label: 'MAX PAIN', icon: '🎯', countBadge: `${curr}${maxPainData.maxPainStrike}` },
    { id: 'PCR', label: 'PCR GAUGE', icon: '⚖️', countBadge: `${pcrData.oiPcr}` },
    { id: 'GREEKS', label: 'GREEKS MATRIX', icon: '📐', countBadge: 'Δ Γ Θ ν ρ' },
    { id: 'DEX', label: 'DEX (DELTA EXPOSURE)', icon: '⚡', countBadge: `${dexData.totalNetDex >= 0 ? '+' : ''}${dexData.totalNetDex}${unit}` },
    { id: 'IV', label: 'IV SMILE & SKEW', icon: '🌊', countBadge: `${ivData.atmIV}%` },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ── 5 Pillar Institutional Header Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Max Pain KPI */}
        <div
          onClick={() => setActivePillar('MAX_PAIN')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activePillar === 'MAX_PAIN'
              ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/30'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-amber-400/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="mono text-[10.5px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
              1. MAX PAIN
            </span>
            <span className="text-amber-400 text-xs">🎯</span>
          </div>
          <div className="mono text-[19px] sm:text-[21px] font-black text-amber-300 mt-1">
            {curr}{maxPainData.maxPainStrike.toLocaleString(loc)}
          </div>
          <div className="text-[11px] mono text-[var(--theme-card-subtitle)] mt-0.5 truncate">
            Spot gap: {maxPainData.distanceToSpot.toFixed(1)} ({maxPainData.distancePct}%)
          </div>
        </div>

        {/* 2. PCR KPI */}
        <div
          onClick={() => setActivePillar('PCR')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activePillar === 'PCR'
              ? 'border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400/30'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-400/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="mono text-[10.5px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
              2. PCR (OI)
            </span>
            <span className="text-emerald-400 text-xs">⚖️</span>
          </div>
          <div className="mono text-[19px] sm:text-[21px] font-black text-emerald-400 mt-1">
            {pcrData.oiPcr}
          </div>
          <div className="text-[11px] mono text-[var(--theme-card-subtitle)] mt-0.5 truncate">
            Vol PCR: <span className="text-[var(--theme-card-text)] font-bold">{pcrData.volPcr}</span> · {pcrData.sentiment.split(' ')[0]}
          </div>
        </div>

        {/* 3. Greeks KPI */}
        <div
          onClick={() => setActivePillar('GREEKS')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activePillar === 'GREEKS'
              ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/30'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-cyan-400/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="mono text-[10.5px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
              3. NET GREEKS
            </span>
            <span className="text-cyan-400 text-xs">📐</span>
          </div>
          <div className="mono text-[18px] sm:text-[20px] font-black text-cyan-400 mt-1">
            Δ {greeksData.netDelta >= 0 ? '+' : ''}{(greeksData.netDelta / 1000).toFixed(1)}k
          </div>
          <div className="text-[11px] mono text-[var(--theme-card-subtitle)] mt-0.5 truncate">
            Θ {greeksData.netThetaCr} Cr/d · Γ {greeksData.netGamma}
          </div>
        </div>

        {/* 4. DEX KPI */}
        <div
          onClick={() => setActivePillar('DEX')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activePillar === 'DEX'
              ? 'border-purple-400 bg-purple-500/10 ring-1 ring-purple-400/30'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-purple-400/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="mono text-[10.5px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
              4. DEX (DELTA EXP)
            </span>
            <span className="text-purple-400 text-xs">⚡</span>
          </div>
          <div className={`mono text-[19px] sm:text-[21px] font-black mt-1 ${dexData.totalNetDex >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {dexData.totalNetDex >= 0 ? '+' : ''}{curr}{dexData.totalNetDex} {unit}
          </div>
          <div className="text-[11px] mono text-[var(--theme-card-subtitle)] mt-0.5 truncate">
            Flip: <span className="font-bold text-[var(--theme-card-text)]">{curr}{dexData.flipStrike}</span> · {dexData.regime.badge}
          </div>
        </div>

        {/* 5. IV Smile KPI */}
        <div
          onClick={() => setActivePillar('IV')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs col-span-2 sm:col-span-1 ${
            activePillar === 'IV'
              ? 'border-sky-400 bg-sky-500/10 ring-1 ring-sky-400/30'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-sky-400/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="mono text-[10.5px] font-bold text-[var(--theme-card-subtitle)] uppercase tracking-wider">
              5. IV SMILE & SKEW
            </span>
            <span className="text-sky-400 text-xs">🌊</span>
          </div>
          <div className="mono text-[19px] sm:text-[21px] font-black text-sky-400 mt-1">
            {ivData.atmIV}% ATM
          </div>
          <div className="text-[11px] mono text-[var(--theme-card-subtitle)] mt-0.5 truncate">
            Skew: <span className="font-bold text-[var(--theme-card-text)]">+{ivData.avgSkew}%</span> · Range {ivData.ivSpread}%
          </div>
        </div>
      </div>

      {/* ── Pillar View Switcher Ribbon ── */}
      <div className="flex items-center gap-1.5 p-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] overflow-x-auto no-scrollbar">
        <span className="mono text-[10.5px] font-black text-[var(--theme-card-subtitle)] uppercase tracking-wider px-2 shrink-0">
          ANALYTICS PILLARS:
        </span>
        {PILLARS.map((p) => {
          const isActive = activePillar === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePillar(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs mono font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                  : 'bg-[var(--theme-card-subsurface)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] hover:border-emerald-500/50'
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
              {p.countBadge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                  isActive ? 'bg-slate-950 text-emerald-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {p.countBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 1. MAX PAIN WORKSPACE                                                   */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'MAX_PAIN') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="mono text-[15px] sm:text-[16px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 1: MAX PAIN PAYOUT SIMULATOR & PINNING ODDS
                </h3>
              </div>
              <p className="text-[11.5px] text-[var(--theme-card-subtitle)] mt-0.5">
                Evaluates total cumulative writer payout liability. Expiry tends to pin near the strike that inflicts maximum financial pain on option buyers ({curr}{maxPainData.maxPainStrike}).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="mono text-xs px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold">
                Max Pain Strike: {curr}{maxPainData.maxPainStrike}
              </span>
              <span className="mono text-xs px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] text-[var(--theme-card-text)] font-bold">
                Min Writer Loss: {curr}{maxPainData.minLossCr} {unit}
              </span>
            </div>
          </div>

          {/* Interactive Candidate Strike Slider */}
          <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="mono text-xs font-black text-amber-400 shrink-0">
                TEST SETTLEMENT PRICE:
              </span>
              <input
                type="range"
                min={chainData.strikes[0]?.strike ?? 20000}
                max={chainData.strikes[chainData.strikes.length - 1]?.strike ?? 25000}
                step={instrument.strikeStep}
                value={candidatePrice}
                onChange={(e) => setCandidatePrice(Number(e.target.value))}
                className="w-full sm:w-64 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>
            <div className="flex items-center gap-3 mono text-xs">
              <span>Candidate: <strong className="text-amber-300 font-black">{curr}{candidatePrice}</strong></span>
              <button
                type="button"
                onClick={() => setCandidatePrice(maxPainData.maxPainStrike)}
                className="px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/20 text-amber-300 text-[10.5px] font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                Snap to Max Pain
              </button>
            </div>
          </div>

          {/* High-Quality Visual Payout Bars Across Strikes */}
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
            {maxPainData.points.map((pt) => {
              const lossPct = Math.round((pt.totalLossCr / maxPainData.maxLoss) * 100);
              const isMaxPain = pt.strike === maxPainData.maxPainStrike;
              const isSelected = pt.strike === candidatePrice;
              const isAtm = Math.abs(pt.strike - spot) < instrument.strikeStep;

              return (
                <div
                  key={pt.strike}
                  onClick={() => setCandidatePrice(pt.strike)}
                  className={`flex items-center gap-3 text-[11px] mono py-1.5 px-3 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 shadow-sm'
                      : isMaxPain
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'border-transparent hover:bg-[var(--theme-card-subsurface)]'
                  }`}
                >
                  <div className="w-20 font-black flex items-center gap-1.5 shrink-0">
                    <span className={isMaxPain ? 'text-amber-300' : 'text-[var(--theme-card-text)]'}>
                      {curr}{pt.strike}
                    </span>
                    {isAtm && (
                      <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-400 font-bold">ATM</span>
                    )}
                  </div>

                  {/* Dual Loss Segment Bar */}
                  <div className="flex-1 h-4 bg-slate-800/80 rounded overflow-hidden flex items-center relative">
                    {/* Call Loss Portion */}
                    <div
                      className="h-full bg-rose-500/60"
                      style={{ width: `${(pt.callLossCr / maxPainData.maxLoss) * 100}%` }}
                      title={`Call Loss: ${curr}${pt.callLossCr} ${unit}`}
                    />
                    {/* Put Loss Portion */}
                    <div
                      className="h-full bg-emerald-500/60"
                      style={{ width: `${(pt.putLossCr / maxPainData.maxLoss) * 100}%` }}
                      title={`Put Loss: ${curr}${pt.putLossCr} ${unit}`}
                    />
                    {isMaxPain && (
                      <div className="absolute right-2 text-[9.5px] font-black text-amber-300 tracking-wider">
                        ★ MINIMAL WRITER LOSS (PAIN POINT)
                      </div>
                    )}
                  </div>

                  <div className="w-28 text-right font-black shrink-0">
                    <span className={isMaxPain ? 'text-amber-300 font-black' : 'text-[var(--theme-card-text)]'}>
                      {curr}{pt.totalLossCr.toLocaleString()} {unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 2. PCR (PUT-CALL RATIO) SPEEDOMETER & OI DISTRIBUTION                   */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'PCR') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="mono text-[15px] sm:text-[16px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 2: PCR (PUT-CALL RATIO) & MARKET SENTIMENT GAUGE
                </h3>
              </div>
              <p className="text-[11.5px] text-[var(--theme-card-subtitle)] mt-0.5">
                Measures market sentiment and writer positioning. High PCR indicates strong Put writing (bullish support floor); low PCR indicates aggressive Call writing (overhead ceiling).
              </p>
            </div>
            <div className={`mono text-xs px-3 py-1 rounded-lg border font-black ${pcrData.sentimentColor}`}>
              {pcrData.sentiment}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Speedometer Gauge Visualizer */}
            <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] flex flex-col items-center justify-center text-center">
              <span className="mono text-[11px] font-black text-[var(--theme-card-subtitle)] uppercase tracking-wider mb-2">
                SENTIMENT SPEEDOMETER
              </span>

              {/* Semi-Circle SVG Gauge */}
              <div className="relative w-48 h-28 flex items-center justify-center">
                <svg viewBox="0 0 100 55" className="w-48 h-28 overflow-visible">
                  {/* Gauge Arc Zones */}
                  {/* 1. Oversold (Red) */}
                  <path d="M 10 50 A 40 40 0 0 1 25 22" fill="none" stroke="#f43f5e" strokeWidth="8" strokeLinecap="round" />
                  {/* 2. Bearish (Amber) */}
                  <path d="M 27 20 A 40 40 0 0 1 45 11" fill="none" stroke="#f59e0b" strokeWidth="8" />
                  {/* 3. Neutral (Cyan) */}
                  <path d="M 47 10 A 40 40 0 0 1 53 10" fill="none" stroke="#06b6d4" strokeWidth="8" />
                  {/* 4. Bullish (Emerald) */}
                  <path d="M 55 11 A 40 40 0 0 1 73 20" fill="none" stroke="#10b981" strokeWidth="8" />
                  {/* 5. Overbought (Purple) */}
                  <path d="M 75 22 A 40 40 0 0 1 90 50" fill="none" stroke="#a855f7" strokeWidth="8" strokeLinecap="round" />

                  {/* Indicator Needle */}
                  {(() => {
                    // Map PCR (0.5 to 1.8) to angle (-180 to 0 degrees)
                    const clampedPcr = Math.max(0.5, Math.min(1.8, pcrData.oiPcr));
                    const angleDeg = -180 + ((clampedPcr - 0.5) / 1.3) * 180;
                    const rad = (angleDeg * Math.PI) / 180;
                    const nx = 50 + 32 * Math.cos(rad);
                    const ny = 50 + 32 * Math.sin(rad);

                    return (
                      <g>
                        <line x1="50" y1="50" x2={nx} y2={ny} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="50" cy="50" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                      </g>
                    );
                  })()}
                </svg>
              </div>

              <div className="mono text-2xl font-black text-emerald-400 -mt-2">
                {pcrData.oiPcr}
              </div>
              <div className="text-[10.5px] mono text-[var(--theme-card-subtitle)]">
                OI PCR (Ratio &gt; 1.0 = Put Heavy)
              </div>
            </div>

            {/* Put vs Call Total OI Breakdown */}
            <div className="md:col-span-2 p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] space-y-3">
              <div className="flex items-center justify-between mono text-xs font-bold">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                  TOTAL CALL OI: {(pcrData.callOI / 100000).toFixed(2)} Lakh ({pcrData.callSharePct}%)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  TOTAL PUT OI: {(pcrData.putOI / 100000).toFixed(2)} Lakh ({pcrData.putSharePct}%)
                </span>
              </div>

              {/* Progress Split Bar */}
              <div className="h-4 w-full bg-slate-800 rounded-lg overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-linear-to-r from-rose-600 to-rose-400 transition-all flex items-center justify-start pl-2 text-[10px] mono font-black text-white"
                  style={{ width: `${pcrData.callSharePct}%` }}
                >
                  {pcrData.callSharePct}% Calls
                </div>
                <div
                  className="h-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-all flex items-center justify-end pr-2 text-[10px] mono font-black text-slate-950"
                  style={{ width: `${pcrData.putSharePct}%` }}
                >
                  {pcrData.putSharePct}% Puts
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 mono text-xs">
                <div className="p-2 rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
                  <span className="text-[10px] text-[var(--theme-card-subtitle)] block">VOLUME PCR</span>
                  <span className="text-base font-black text-[var(--theme-card-text)]">{pcrData.volPcr}</span>
                </div>
                <div className="p-2 rounded bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
                  <span className="text-[10px] text-[var(--theme-card-subtitle)] block">TOTAL OI LOTS</span>
                  <span className="text-base font-black text-[var(--theme-card-text)]">
                    {Math.round(pcrData.totalOI / lotSize).toLocaleString()} lots
                  </span>
                </div>
              </div>

              <p className="text-[11.5px] text-[var(--theme-card-subtitle)] leading-relaxed italic">
                💡 {pcrData.desc}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 3. GREEKS MATRIX (DELTA, GAMMA, THETA, VEGA, RHO)                       */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'GREEKS') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <h3 className="mono text-[15px] sm:text-[16px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 3: GREEKS DISTRIBUTION & NET ACCUMULATION (Δ, Γ, Θ, ν, ρ)
                </h3>
              </div>
              <p className="text-[11.5px] text-[var(--theme-card-subtitle)] mt-0.5">
                Deconstructs option price sensitivity parameters across strike boundaries. Select a Greek to inspect Call vs Put curves across strikes.
              </p>
            </div>

            {/* Greek Selector Pills */}
            <div className="flex items-center gap-1 bg-[var(--theme-card-subsurface)] p-1 rounded-xl border border-[var(--theme-card-border)]">
              {(['delta', 'gamma', 'theta', 'vega', 'rho'] as GreekType[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGreek(g)}
                  className={`px-3 py-1 rounded-lg text-xs mono font-bold uppercase transition-all cursor-pointer ${
                    selectedGreek === g
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                      : 'text-[var(--theme-card-subtitle)] hover:text-cyan-400'
                  }`}
                >
                  {g === 'delta' ? 'Delta (Δ)' : g === 'gamma' ? 'Gamma (Γ)' : g === 'theta' ? 'Theta (Θ)' : g === 'vega' ? 'Vega (ν)' : 'Rho (ρ)'}
                </button>
              ))}
            </div>
          </div>

          {/* Greeks Table & Visual Distribution */}
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
            {greeksData.rows.map((row) => {
              const cVal =
                selectedGreek === 'delta'
                  ? row.callDelta
                  : selectedGreek === 'gamma'
                  ? row.callGamma
                  : selectedGreek === 'theta'
                  ? row.callTheta
                  : selectedGreek === 'vega'
                  ? row.callVega
                  : row.callRho;

              const pVal =
                selectedGreek === 'delta'
                  ? row.putDelta
                  : selectedGreek === 'gamma'
                  ? row.putGamma
                  : selectedGreek === 'theta'
                  ? row.putTheta
                  : selectedGreek === 'vega'
                  ? row.putVega
                  : row.putRho;

              return (
                <div
                  key={row.strike}
                  className={`flex items-center gap-2 text-[11px] mono py-1.5 px-3 rounded-lg transition-colors ${
                    row.isATM ? 'bg-amber-500/10 border border-amber-500/40 font-bold' : 'hover:bg-[var(--theme-card-subsurface)]'
                  }`}
                >
                  {/* Call Value (Left) */}
                  <div className="flex-1 flex items-center justify-end gap-2 text-right">
                    <span className="text-cyan-400 font-bold tabular-nums">
                      {typeof cVal === 'number' ? (selectedGreek === 'gamma' ? cVal.toFixed(4) : cVal.toFixed(2)) : '—'}
                    </span>
                    <div className="w-32 h-2.5 bg-slate-800 rounded-l overflow-hidden flex justify-end">
                      <div
                        className="h-full bg-cyan-500/70 rounded-l"
                        style={{
                          width: `${Math.min(100, Math.abs(cVal) * (selectedGreek === 'gamma' ? 1500 : selectedGreek === 'delta' ? 100 : 2))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Strike Center Anchor */}
                  <div
                    className={`w-20 text-center font-black px-1.5 py-0.5 rounded text-[11px] shrink-0 ${
                      row.isATM ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-[var(--theme-card-text)]'
                    }`}
                  >
                    {curr}{row.strike}
                  </div>

                  {/* Put Value (Right) */}
                  <div className="flex-1 flex items-center justify-start gap-2 text-left">
                    <div className="w-32 h-2.5 bg-slate-800 rounded-r overflow-hidden flex justify-start">
                      <div
                        className="h-full bg-pink-500/70 rounded-r"
                        style={{
                          width: `${Math.min(100, Math.abs(pVal) * (selectedGreek === 'gamma' ? 1500 : selectedGreek === 'delta' ? 100 : 2))}%`,
                        }}
                      />
                    </div>
                    <span className="text-pink-400 font-bold tabular-nums">
                      {typeof pVal === 'number' ? (selectedGreek === 'gamma' ? pVal.toFixed(4) : pVal.toFixed(2)) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 4. DEX (DELTA EXPOSURE / DEALER POSITIONING)                            */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'DEX') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <h3 className="mono text-[15px] sm:text-[16px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 4: DEX (DELTA EXPOSURE) & DEALER HEDGING CORRIDOR
                </h3>
              </div>
              <p className="text-[11.5px] text-[var(--theme-card-subtitle)] mt-0.5">
                Quantifies the {currencyName} delta sensitivity across strikes. Spot trading above the Zero DEX Flip ({curr}{dexData.flipStrike}) forces dealers into stabilizing long delta; trading below forces aggressive downside selling.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="mono text-xs px-2.5 py-1 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 font-bold">
                Zero Flip: {curr}{dexData.flipStrike}
              </span>
              <span className={`mono text-xs px-2.5 py-1 rounded-lg border font-black ${
                dexData.totalNetDex >= 0 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}>
                Net DEX: {dexData.totalNetDex >= 0 ? '+' : ''}{curr}{dexData.totalNetDex} {unit}
              </span>
            </div>
          </div>

          {/* DEX Strike Histogram */}
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
            {dexData.rows.map((row) => {
              const isPositive = row.netDex >= 0;
              const barPct = Math.min(100, Math.round((Math.abs(row.netDex) / dexData.maxAbsDex) * 100));
              const isFlip = row.strike === dexData.flipStrike;

              return (
                <div
                  key={row.strike}
                  className={`flex items-center gap-3 text-[11px] mono py-1 px-3 rounded-lg border transition-colors ${
                    isFlip
                      ? 'bg-purple-500/15 border-purple-400 font-black'
                      : row.isATM
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'border-transparent hover:bg-[var(--theme-card-subsurface)]'
                  }`}
                >
                  <div className="w-20 font-black shrink-0 flex items-center gap-1">
                    <span className={isFlip ? 'text-purple-300' : 'text-[var(--theme-card-text)]'}>
                      {curr}{row.strike}
                    </span>
                    {isFlip && <span className="text-[9px] px-1 rounded bg-purple-500 text-slate-950 font-black">FLIP</span>}
                  </div>

                  {/* Left Side (Negative DEX) */}
                  <div className="flex-1 h-3.5 bg-slate-800/80 rounded-l overflow-hidden flex justify-end items-center">
                    {!isPositive && (
                      <div
                        className="h-full bg-rose-500/80 rounded-l transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    )}
                  </div>

                  {/* Zero Divider */}
                  <div className="w-1 h-4 bg-slate-500/40 shrink-0" />

                  {/* Right Side (Positive DEX) */}
                  <div className="flex-1 h-3.5 bg-slate-800/80 rounded-r overflow-hidden flex justify-start items-center">
                    {isPositive && (
                      <div
                        className="h-full bg-emerald-500/80 rounded-r transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    )}
                  </div>

                  <div className={`w-24 text-right font-black shrink-0 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? '+' : ''}{row.netDex} Cr
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 5. IV (IMPLIED VOLATILITY SMILE & SKEW)                                  */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'IV') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <h3 className="mono text-[15px] sm:text-[16px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 5: IV (IMPLIED VOLATILITY SMILE & SKEW CURVE)
                </h3>
              </div>
              <p className="text-[11.5px] text-[var(--theme-card-subtitle)] mt-0.5">
                Displays the volatility smile across strike boundaries. Higher Put IV (left wing) highlights institutional demand for downside crash hedging.
              </p>
            </div>
            <div className="flex items-center gap-3 mono text-xs">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
                Call IV
              </span>
              <span className="flex items-center gap-1.5 text-pink-400 font-bold">
                <span className="w-2.5 h-0.5 bg-pink-400 inline-block" />
                Put IV
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 font-bold">
                ATM IV: {ivData.atmIV}%
              </span>
            </div>
          </div>

          {/* SVG Volatility Smile Chart */}
          <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)]">
            <div className="h-56 w-full relative">
              <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Horizontal IV Grid lines */}
                {[0.25, 0.5, 0.75].map((pct, idx) => {
                  const y = 200 * pct;
                  const ivVal = Math.round((ivData.maxIV - (ivData.maxIV - ivData.minIV) * pct) * 10) / 10;
                  return (
                    <g key={idx}>
                      <line x1="0" y1={y} x2="800" y2={y} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.4" />
                      <text x="795" y={y - 4} fill="#64748b" fontSize="9" textAnchor="end" className="mono">
                        {ivVal}%
                      </text>
                    </g>
                  );
                })}

                {/* Call IV Polyline */}
                {(() => {
                  const pts = ivData.rows.map((r, i) => {
                    const x = (i / (ivData.rows.length - 1)) * 800;
                    const y = 180 - ((r.callIV - ivData.minIV) / (ivData.maxIV - ivData.minIV || 1)) * 160;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ');

                  return (
                    <polyline
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pts}
                    />
                  );
                })()}

                {/* Put IV Polyline */}
                {(() => {
                  const pts = ivData.rows.map((r, i) => {
                    const x = (i / (ivData.rows.length - 1)) * 800;
                    const y = 180 - ((r.putIV - ivData.minIV) / (ivData.maxIV - ivData.minIV || 1)) * 160;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ');

                  return (
                    <polyline
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pts}
                    />
                  );
                })()}

                {/* ATM Vertical Line */}
                {(() => {
                  const atmIdx = ivData.rows.findIndex((r) => r.isATM);
                  if (atmIdx >= 0) {
                    const x = (atmIdx / (ivData.rows.length - 1)) * 800;
                    return (
                      <g>
                        <line x1={x} y1="10" x2={x} y2="190" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
                        <text x={x} y="8" fill="#f59e0b" fontSize="9" textAnchor="middle" className="mono font-bold">
                          ATM SPOT {curr}{spot}
                        </text>
                      </g>
                    );
                  }
                  return null;
                })()}
              </svg>
            </div>

            {/* Strike & IV Hoverable Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-4 max-h-36 overflow-y-auto no-scrollbar">
              {ivData.rows.map((r) => (
                <div
                  key={r.strike}
                  onMouseEnter={() => setHoveredStrike(r.strike)}
                  onMouseLeave={() => setHoveredStrike(null)}
                  className={`p-2 rounded-lg border text-center transition-all mono text-xs ${
                    r.isATM
                      ? 'border-amber-400 bg-amber-500/10'
                      : hoveredStrike === r.strike
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]'
                  }`}
                >
                  <div className="font-black text-[var(--theme-card-text)]">{curr}{r.strike}</div>
                  <div className="flex items-center justify-between text-[10.5px] mt-1">
                    <span className="text-cyan-400 font-bold">{r.callIV}%</span>
                    <span className="text-pink-400 font-bold">{r.putIV}%</span>
                  </div>
                  <div className="text-[9.5px] text-[var(--theme-card-subtitle)] mt-0.5">
                    Skew: {r.skew > 0 ? '+' : ''}{r.skew}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
