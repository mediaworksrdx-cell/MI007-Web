// ─── Institutional Derivatives Analytics Workspace ────────────────────────────
// High-precision visual intelligence across 5 core institutional pillars:
// 1. Max Pain & Writer Liability Curve (SVG Area + Dual Payout Histogram)
// 2. PCR Gauge, Strike OI Towers & Intraday Change-in-OI Flow
// 3. Multi-Greek Curve Visualizer & Tornado Distribution (Δ, Γ, Θ, ν, ρ)
// 4. SpotGamma-Style GEX (Gamma Exposure) & DEX (Delta Exposure) Corridor
// 5. Implied Volatility Smile, 25Δ Skew & ATM Straddle Expected Move Cone
'use client';

import React, { useState, useMemo } from 'react';
import { OptionChainData, FnoInstrument, StrategyLeg } from '@/lib/fno/fnoTypes';

interface DerivativesAnalyticsTabProps {
  instrument: FnoInstrument;
  chainData: OptionChainData;
  weeklyChainData?: OptionChainData;
  monthlyChainData?: OptionChainData;
  onSelectStrike?: (strike: number) => void;
  onDeployStrategy?: (legs: StrategyLeg[]) => void;
  onOpenBuilderTab?: () => void;
}

type ActivePillar = 'ALL' | 'MAX_PAIN' | 'PCR' | 'GREEKS' | 'DEX' | 'IV';
type GreekType = 'delta' | 'gamma' | 'theta' | 'vega' | 'rho';
type OiViewMode = 'TOTAL_OI' | 'CHANGE_IN_OI';
type ExposureMode = 'GEX' | 'DEX';

export function DerivativesAnalyticsTab({
  instrument,
  chainData,
  weeklyChainData,
  monthlyChainData,
  onDeployStrategy,
  onOpenBuilderTab,
}: DerivativesAnalyticsTabProps) {
  const [activePillar, setActivePillar] = useState<ActivePillar>('ALL');
  const [selectedGreek, setSelectedGreek] = useState<GreekType>('gamma');
  const [oiViewMode, setOiViewMode] = useState<OiViewMode>('TOTAL_OI');
  const [exposureMode, setExposureMode] = useState<ExposureMode>('GEX');
  const [candidatePrice, setCandidatePrice] = useState<number>(chainData.maxPain);
  const [hoveredStrike, setHoveredStrike] = useState<number | null>(null);
  const [hoveredMaxPainStrike, setHoveredMaxPainStrike] = useState<number | null>(null);

  const isIndia = instrument.market === 'INDIA';
  const curr = instrument.market === 'USA' ? '$' : instrument.market === 'UAE' ? 'AED ' : '₹';
  const loc = isIndia ? 'en-IN' : 'en-US';
  const scaleDivisor = isIndia ? 1e7 : 1e6; // Cr (10M) for India, Millions (1M) for USA/UAE
  const unit = isIndia ? 'Cr' : 'M';
  const oiUnitLabel = isIndia ? 'Lakh' : 'K';
  const oiDivisor = isIndia ? 1e5 : 1e3;
  const currencyName = instrument.market === 'USA' ? 'dollar' : instrument.market === 'UAE' ? 'dirham' : 'rupee';

  const lotSize = instrument.lotSize || chainData.lotSize || 1;
  const spot = chainData.spotPrice;
  const isIndex = instrument.sector?.toLowerCase().includes('index') ||
    ['NIFTY 50', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX', 'BANKEX', 'SPX', 'NDX', 'DJI'].includes(instrument.symbol);

  // Sync candidatePrice when instrument changes
  React.useEffect(() => {
    setCandidatePrice(chainData.maxPain);
  }, [chainData.maxPain, instrument.symbol]);

  // ════════════════════════════════════════════════════════════════════════════
  // 1. MAX PAIN & WRITER PAYOUT LIABILITY COMPUTATION
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

      const callLossScaled = callLoss / scaleDivisor;
      const putLossScaled = putLoss / scaleDivisor;
      const totalLossScaled = callLossScaled + putLossScaled;

      return {
        strike: k,
        callLossCr: Math.round(callLossScaled * 10) / 10,
        putLossCr: Math.round(putLossScaled * 10) / 10,
        totalLossCr: Math.round(totalLossScaled * 10) / 10,
      };
    });

    const maxLoss = Math.max(...points.map((p) => p.totalLossCr), 1);
    const minLossPoint = points.reduce(
      (min, p) => (p.totalLossCr < min.totalLossCr ? p : min),
      points[0] || { strike: chainData.maxPain, totalLossCr: 0, callLossCr: 0, putLossCr: 0 }
    );
    const maxPainStrike = minLossPoint?.strike ?? chainData.maxPain;
    const minLossCr = minLossPoint?.totalLossCr ?? 0;
    const distanceToSpot = spot - maxPainStrike;
    const distancePct = spot > 0 ? Math.round((Math.abs(distanceToSpot) / spot) * 10000) / 100 : 0;

    return { points, maxLoss, maxPainStrike, minLossCr, distanceToSpot, distancePct };
  }, [chainData.strikes, chainData.maxPain, lotSize, spot, scaleDivisor]);

  // ════════════════════════════════════════════════════════════════════════════
  // 2. PCR (PUT-CALL RATIO) & STRIKE-BY-STRIKE OI / CHANGE IN OI
  // ════════════════════════════════════════════════════════════════════════════
  const pcrData = useMemo(() => {
    const callOI = chainData.totalCallOI;
    const putOI = chainData.totalPutOI;
    const oiPcr = callOI > 0 ? Math.round((putOI / callOI) * 100) / 100 : chainData.pcr;

    const callVol = chainData.totalCallVolume || 1;
    const putVol = chainData.totalPutVolume || 0;
    const volPcr = callVol > 0 ? Math.round((putVol / callVol) * 100) / 100 : 0.95;

    let totalCallChgOI = 0;
    let totalPutChgOI = 0;

    const strikeRows = chainData.strikes.map((s) => {
      totalCallChgOI += s.call.changeInOI;
      totalPutChgOI += s.put.changeInOI;
      return {
        strike: s.strike,
        isATM: s.isATM,
        callOI: s.call.openInterest,
        putOI: s.put.openInterest,
        callChgOI: s.call.changeInOI,
        putChgOI: s.put.changeInOI,
        pcr: s.call.openInterest > 0 ? Math.round((s.put.openInterest / s.call.openInterest) * 100) / 100 : 1.0,
      };
    });

    const maxStrikeOI = Math.max(...strikeRows.flatMap((r) => [r.callOI, r.putOI]), 1);
    const maxStrikeChgOI = Math.max(...strikeRows.flatMap((r) => [Math.abs(r.callChgOI), Math.abs(r.putChgOI)]), 1);

    // Highest Call & Put OI Walls
    const callWallRow = strikeRows.reduce((best, r) => (r.callOI > best.callOI ? r : best), strikeRows[0]);
    const putWallRow = strikeRows.reduce((best, r) => (r.putOI > best.putOI ? r : best), strikeRows[0]);

    let sentiment: 'EXTREME OVERSOLD' | 'BEARISH' | 'NEUTRAL' | 'BULLISH' | 'EXTREME OVERBOUGHT';
    let sentimentColor: string;
    let desc: string;

    if (oiPcr < 0.65) {
      sentiment = 'EXTREME OVERSOLD';
      sentimentColor = 'text-rose-400 bg-rose-500/15 border-rose-500/40';
      desc = 'Aggressive Call writing dominates. Market is deeply oversold; high probability of short-covering squeeze.';
    } else if (oiPcr < 0.85) {
      sentiment = 'BEARISH';
      sentimentColor = 'text-amber-400 bg-amber-500/15 border-amber-500/40';
      desc = 'Call writers capping upside advances. Supply resistance stacked heavily above current spot.';
    } else if (oiPcr <= 1.25) {
      sentiment = 'NEUTRAL';
      sentimentColor = 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40';
      desc = 'Balanced equilibrium between Call resistance and Put support. Favors theta-decay range strategies.';
    } else if (oiPcr <= 1.55) {
      sentiment = 'BULLISH';
      sentimentColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40';
      desc = 'Aggressive Put writing creating a strong downside floor. Institutional bulls defending dips.';
    } else {
      sentiment = 'EXTREME OVERBOUGHT';
      sentimentColor = 'text-purple-400 bg-purple-500/15 border-purple-500/40';
      desc = 'Extreme Put concentration. Market is stretched; monitor for sudden profit-booking unwinds.';
    }

    const totalOI = callOI + putOI || 1;
    const callSharePct = Math.round((callOI / totalOI) * 100);
    const putSharePct = 100 - callSharePct;

    return {
      oiPcr,
      volPcr,
      callOI,
      putOI,
      totalOI,
      totalCallChgOI,
      totalPutChgOI,
      callSharePct,
      putSharePct,
      sentiment,
      sentimentColor,
      desc,
      strikeRows,
      maxStrikeOI,
      maxStrikeChgOI,
      callWallStrike: callWallRow?.strike ?? chainData.highestCallOIStrike,
      putWallStrike: putWallRow?.strike ?? chainData.highestPutOIStrike,
    };
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
      netThetaScaled: Math.round((netTheta / scaleDivisor) * 100) / 100,
      netVegaScaled: Math.round((netVega / scaleDivisor) * 100) / 100,
      netRho: Math.round(netRho),
    };
  }, [chainData.strikes, lotSize, scaleDivisor]);

  // ════════════════════════════════════════════════════════════════════════════
  // 4. GEX (GAMMA EXPOSURE) & DEX (DELTA EXPOSURE) COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════
  const exposureData = useMemo(() => {
    let totalCallDex = 0;
    let totalPutDex = 0;
    let totalCallGex = 0;
    let totalPutGex = 0;

    const rows = chainData.strikes.map((s) => {
      // DEX: OI * Delta * LotSize * Spot
      const callDex = (s.call.openInterest * s.call.greeks.delta * lotSize * spot) / scaleDivisor;
      const putDex = (s.put.openInterest * s.put.greeks.delta * lotSize * spot) / scaleDivisor;
      const netDex = callDex + putDex;

      // GEX (SpotGamma convention: Call Gamma is positive dealer gamma, Put Gamma is negative dealer gamma for 1% spot move)
      const callGex = (s.call.openInterest * s.call.greeks.gamma * lotSize * spot * spot * 0.01) / scaleDivisor;
      const putGex = -(s.put.openInterest * s.put.greeks.gamma * lotSize * spot * spot * 0.01) / scaleDivisor;
      const netGex = callGex + putGex;

      totalCallDex += callDex;
      totalPutDex += putDex;
      totalCallGex += callGex;
      totalPutGex += putGex;

      return {
        strike: s.strike,
        isATM: s.isATM,
        callDex: Math.round(callDex * 10) / 10,
        putDex: Math.round(putDex * 10) / 10,
        netDex: Math.round(netDex * 10) / 10,
        callGex: Math.round(callGex * 100) / 100,
        putGex: Math.round(putGex * 100) / 100,
        netGex: Math.round(netGex * 100) / 100,
      };
    });

    const totalNetDex = Math.round((totalCallDex + totalPutDex) * 10) / 10;
    const totalNetGex = Math.round((totalCallGex + totalPutGex) * 10) / 10;

    const maxAbsDex = Math.max(...rows.map((r) => Math.max(Math.abs(r.callDex), Math.abs(r.putDex), Math.abs(r.netDex))), 0.1);
    const maxAbsGex = Math.max(...rows.map((r) => Math.max(Math.abs(r.callGex), Math.abs(r.putGex), Math.abs(r.netGex))), 0.01);

    // Identify Zero Gamma Flip & Zero Delta Flip Strikes
    let dexFlipStrike = chainData.maxPain;
    let gexFlipStrike = chainData.maxPain;
    for (let i = 0; i < rows.length - 1; i++) {
      if ((rows[i].netDex <= 0 && rows[i + 1].netDex > 0) || (rows[i].netDex >= 0 && rows[i + 1].netDex < 0)) {
        dexFlipStrike = rows[i + 1].strike;
      }
      if ((rows[i].netGex <= 0 && rows[i + 1].netGex > 0) || (rows[i].netGex >= 0 && rows[i + 1].netGex < 0)) {
        gexFlipStrike = rows[i + 1].strike;
      }
    }

    // Call Wall (Highest Positive GEX) & Put Wall (Lowest Negative GEX)
    const callGexWall = rows.reduce((best, r) => (r.netGex > best.netGex ? r : best), rows[0] || { strike: spot, netGex: 0 });
    const putGexWall = rows.reduce((best, r) => (r.netGex < best.netGex ? r : best), rows[0] || { strike: spot, netGex: 0 });

    const regime =
      totalNetGex >= 0
        ? {
            title: 'POSITIVE GAMMA REGIME (MEAN-REVERTING)',
            badge: 'POSITIVE GEX',
            color: 'emerald',
            desc: 'Dealers are Long Gamma. Market makers hedge by buying dips and selling rallies, compressing realized volatility and pinning price toward Max Pain.',
          }
        : {
            title: 'NEGATIVE GAMMA REGIME (VOLATILITY ACCELERATOR)',
            badge: 'NEGATIVE GEX',
            color: 'rose',
            desc: 'Dealers are Short Gamma. Market makers must hedge in the same direction as price movement, amplifying directional breakouts and intraday momentum.',
          };

    return {
      rows,
      totalCallDex: Math.round(totalCallDex * 10) / 10,
      totalPutDex: Math.round(totalPutDex * 10) / 10,
      totalNetDex,
      totalCallGex: Math.round(totalCallGex * 10) / 10,
      totalPutGex: Math.round(totalPutGex * 10) / 10,
      totalNetGex,
      maxAbsDex,
      maxAbsGex,
      dexFlipStrike,
      gexFlipStrike,
      callGexWallStrike: callGexWall.strike,
      putGexWallStrike: putGexWall.strike,
      regime,
    };
  }, [chainData.strikes, chainData.maxPain, lotSize, spot, scaleDivisor]);

  // ════════════════════════════════════════════════════════════════════════════
  // 5. IV SMILE, SKEW & ATM STRADDLE EXPECTED MOVE COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════
  const ivData = useMemo(() => {
    const rows = chainData.strikes.map((s) => ({
      strike: s.strike,
      isATM: s.isATM,
      callIV: s.call.impliedVolatility,
      putIV: s.put.impliedVolatility,
      callLtp: s.call.ltp,
      putLtp: s.put.ltp,
      straddleLtp: Math.round((s.call.ltp + s.put.ltp) * 100) / 100,
      skew: Math.round((s.put.impliedVolatility - s.call.impliedVolatility) * 10) / 10,
    }));

    const atmRow = rows.find((r) => r.isATM) || rows[Math.floor(rows.length / 2)];
    const atmIV = atmRow ? Math.round(((atmRow.callIV + atmRow.putIV) / 2) * 10) / 10 : 14.5;
    const atmStraddle = atmRow ? Math.round((atmRow.callLtp + atmRow.putLtp) * 10) / 10 : Math.round(spot * 0.015);
    const expectedMovePct = spot > 0 ? Math.round((atmStraddle / spot) * 10000) / 100 : 1.5;
    const upperBreakeven = Math.round((spot + atmStraddle) * 10) / 10;
    const lowerBreakeven = Math.round((spot - atmStraddle) * 10) / 10;

    const minIV = Math.min(...rows.flatMap((r) => [r.callIV, r.putIV]), 8);
    const maxIV = Math.max(...rows.flatMap((r) => [r.callIV, r.putIV]), 22);
    const ivSpread = Math.round((maxIV - minIV) * 10) / 10;
    const avgSkew = rows.length > 0 ? Math.round((rows.reduce((acc, r) => acc + r.skew, 0) / rows.length) * 10) / 10 : 0;

    // Synthetic IV Percentile & IV Rank based on ATM IV level
    const ivRank = Math.min(98, Math.max(12, Math.round(((atmIV - 10) / 22) * 100)));
    const ivPercentile = Math.min(99, Math.max(15, Math.round(ivRank * 1.08)));

    return {
      rows,
      atmIV,
      atmStraddle,
      expectedMovePct,
      upperBreakeven,
      lowerBreakeven,
      minIV,
      maxIV,
      ivSpread,
      avgSkew,
      ivRank,
      ivPercentile,
      atmRow,
    };
  }, [chainData.strikes, spot]);

  // Pillar Navigation Options
  const PILLARS: Array<{ id: ActivePillar; label: string; icon: string; countBadge?: string }> = [
    { id: 'ALL', label: 'ALL 5 PILLARS', icon: '⚡' },
    { id: 'MAX_PAIN', label: 'MAX PAIN & PINNING', icon: '🎯', countBadge: `${curr}${maxPainData.maxPainStrike.toLocaleString(loc)}` },
    { id: 'PCR', label: 'PCR & OI FLOW', icon: '⚖️', countBadge: `${pcrData.oiPcr}` },
    { id: 'GREEKS', label: 'GREEKS TORNADO', icon: '📐', countBadge: 'Δ Γ Θ ν ρ' },
    { id: 'DEX', label: 'GEX & DEX WALLS', icon: '🛡️', countBadge: `${exposureData.totalNetGex >= 0 ? '+' : ''}${exposureData.totalNetGex}${unit}` },
    { id: 'IV', label: 'IV SMILE & EXPECTED MOVE', icon: '🌊', countBadge: `±${ivData.expectedMovePct}%` },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* TOP COMMAND DECK: 5-PILLAR BENTO KPI CARDS                              */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* 1. Max Pain KPI Card */}
        <div
          onClick={() => setActivePillar(activePillar === 'MAX_PAIN' ? 'ALL' : 'MAX_PAIN')}
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer group min-w-0 ${
            activePillar === 'MAX_PAIN'
              ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/30 shadow-lg shadow-amber-500/5'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-amber-400/60'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-black text-amber-400 uppercase tracking-widest truncate">
              01 · MAX PAIN MAGNET
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 mono text-[9.5px] font-bold text-amber-300 shrink-0 ml-1">
              {maxPainData.distancePct}% GAP
            </span>
          </div>
          <div className="mono text-2xl font-black text-[var(--theme-card-text)] mt-2 tracking-tight truncate">
            {curr}{maxPainData.maxPainStrike.toLocaleString(loc)}
          </div>
          <div className="flex items-center justify-between text-[11px] mono text-[var(--theme-card-subtitle)] mt-2 pt-2 border-t border-[var(--theme-card-border)]/60 gap-1">
            <span className="shrink-0">Min Payout:</span>
            <span className="font-bold text-amber-300 truncate">{curr}{maxPainData.minLossCr} {unit}</span>
          </div>
        </div>

        {/* 2. PCR & OI Flow KPI Card */}
        <div
          onClick={() => setActivePillar(activePillar === 'PCR' ? 'ALL' : 'PCR')}
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer group min-w-0 ${
            activePillar === 'PCR'
              ? 'border-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-400/30 shadow-lg shadow-emerald-500/5'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-400/60'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-rose-500 via-emerald-400 to-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-black text-emerald-400 uppercase tracking-widest truncate">
              02 · PUT-CALL RATIO
            </span>
            <span className={`px-1.5 py-0.5 rounded border mono text-[9px] font-black shrink-0 ml-1 ${pcrData.sentimentColor}`}>
              {pcrData.sentiment.split(' ')[0]}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2 flex-wrap">
            <span className="mono text-2xl font-black text-emerald-400 tracking-tight">
              {pcrData.oiPcr.toFixed(2)}
            </span>
            <span className="mono text-xs text-[var(--theme-card-subtitle)] truncate">
              Vol PCR: <strong className="text-[var(--theme-card-text)]">{pcrData.volPcr}</strong>
            </span>
          </div>
          {/* Mini Call vs Put Bar */}
          <div className="mt-2.5 space-y-1">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-rose-500" style={{ width: `${pcrData.callSharePct}%` }} />
              <div className="h-full bg-emerald-500" style={{ width: `${pcrData.putSharePct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] mono text-[var(--theme-card-subtitle)]">
              <span className="text-rose-400 font-bold">CE {pcrData.callSharePct}%</span>
              <span className="text-emerald-400 font-bold">PE {pcrData.putSharePct}%</span>
            </div>
          </div>
        </div>

        {/* 3. ATM Straddle & Expected Move KPI Card */}
        <div
          onClick={() => setActivePillar(activePillar === 'IV' ? 'ALL' : 'IV')}
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer group min-w-0 ${
            activePillar === 'IV'
              ? 'border-sky-400 bg-sky-500/10 ring-1 ring-sky-400/30 shadow-lg shadow-sky-500/5'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-sky-400/60'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-black text-sky-400 uppercase tracking-widest truncate">
              03 · IMPLIED MOVE (1σ)
            </span>
            <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 mono text-[9.5px] font-bold text-sky-300 shrink-0 ml-1">
              ±{ivData.expectedMovePct}%
            </span>
          </div>
          <div className="mono text-2xl font-black text-[var(--theme-card-text)] mt-2 tracking-tight truncate">
            ±{curr}{ivData.atmStraddle.toLocaleString(loc)}
          </div>
          <div className="flex items-center justify-between text-[10.5px] mono text-[var(--theme-card-subtitle)] mt-2 pt-2 border-t border-[var(--theme-card-border)]/60 gap-1">
            <span className="shrink-0">Range:</span>
            <span className="font-bold text-sky-300 text-[10px] tracking-tight truncate">
              {curr}{ivData.lowerBreakeven.toLocaleString(loc)} – {curr}{ivData.upperBreakeven.toLocaleString(loc)}
            </span>
          </div>
        </div>

        {/* 4. GEX & DEX Dealer Regime KPI Card */}
        <div
          onClick={() => setActivePillar(activePillar === 'DEX' ? 'ALL' : 'DEX')}
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer group min-w-0 ${
            activePillar === 'DEX'
              ? 'border-purple-400 bg-purple-500/10 ring-1 ring-purple-400/30 shadow-lg shadow-purple-500/5'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-purple-400/60'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-purple-500 via-fuchsia-400 to-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-black text-purple-400 uppercase tracking-widest truncate">
              04 · DEALER GAMMA (GEX)
            </span>
            <span
              className={`px-1.5 py-0.5 rounded mono text-[9px] font-black border shrink-0 ml-1 ${
                exposureData.totalNetGex >= 0
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {exposureData.regime.badge}
            </span>
          </div>
          <div
            className={`mono text-2xl font-black mt-2 tracking-tight truncate ${
              exposureData.totalNetGex >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {exposureData.totalNetGex >= 0 ? '+' : ''}{curr}{exposureData.totalNetGex} {unit}
          </div>
          <div className="flex items-center justify-between text-[11px] mono text-[var(--theme-card-subtitle)] mt-2 pt-2 border-t border-[var(--theme-card-border)]/60 gap-1">
            <span className="shrink-0">Zero Γ Flip:</span>
            <span className="font-bold text-purple-300 truncate">{curr}{exposureData.gexFlipStrike.toLocaleString(loc)}</span>
          </div>
        </div>

        {/* 5. Net Greeks & IV Regime KPI Card */}
        <div
          onClick={() => setActivePillar(activePillar === 'GREEKS' ? 'ALL' : 'GREEKS')}
          className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-pointer group min-w-0 ${
            activePillar === 'GREEKS'
              ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/30 shadow-lg shadow-cyan-500/5'
              : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-cyan-400/60'
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400" />
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-black text-cyan-400 uppercase tracking-widest truncate">
              05 · IV & GREEKS PULSE
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 mono text-[9.5px] font-bold text-cyan-300 shrink-0 ml-1">
              IVP {ivData.ivPercentile}%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2 flex-wrap">
            <span className="mono text-2xl font-black text-cyan-400 tracking-tight">
              {ivData.atmIV}%
            </span>
            <span className="mono text-xs text-[var(--theme-card-subtitle)] truncate">
              ATM IV (Skew {ivData.avgSkew > 0 ? `+${ivData.avgSkew}` : ivData.avgSkew}%)
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] mono text-[var(--theme-card-subtitle)] mt-2 pt-2 border-t border-[var(--theme-card-border)]/60 gap-1">
            <span className="shrink-0">Chain Decay (Θ):</span>
            <span className="font-bold text-cyan-300 truncate">{curr}{greeksData.netThetaScaled} {unit}/d</span>
          </div>
        </div>
      </div>

      {/* ── Pillar Filter Switcher Ribbon ── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="mono text-[10.5px] font-black text-[var(--theme-card-subtitle)] uppercase tracking-wider px-1 shrink-0">
            FOCUS MODULE:
          </span>
          {PILLARS.map((p) => {
            const isActive = activePillar === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePillar(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs mono font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'bg-[var(--theme-card-subsurface)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] hover:border-emerald-500/50'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                {p.countBadge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                      isActive ? 'bg-slate-950 text-emerald-300' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {p.countBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {onOpenBuilderTab && (
          <button
            type="button"
            onClick={onOpenBuilderTab}
            className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 mono text-xs font-bold shrink-0 cursor-pointer transition-colors ml-auto"
          >
            Open Strategy Builder →
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* PILLAR 1: MAX PAIN PAYOUT CURVE & SETTLEMENT SIMULATOR                  */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'MAX_PAIN') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/80 via-yellow-400/50 to-transparent" />

          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                <h3 className="mono text-[15px] sm:text-[17px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 1 · MAX PAIN SETTLEMENT CURVE & WRITER LIABILITY SIMULATOR
                </h3>
              </div>
              <p className="text-xs text-[var(--theme-card-subtitle)] mt-1">
                Models aggregate intrinsic payout owed by option writers at every candidate expiry settlement price. Gravitation toward <strong className="text-amber-300">{curr}{maxPainData.maxPainStrike.toLocaleString(loc)}</strong> minimizes institutional seller payout.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 mono text-xs">
                <span className="text-[var(--theme-card-subtitle)] mr-1.5">Max Pain Pin:</span>
                <strong className="text-amber-300 font-black">{curr}{maxPainData.maxPainStrike.toLocaleString(loc)}</strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] mono text-xs">
                <span className="text-[var(--theme-card-subtitle)] mr-1.5">Spot Drift:</span>
                <strong className={maxPainData.distanceToSpot >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {maxPainData.distanceToSpot >= 0 ? '+' : ''}{maxPainData.distanceToSpot.toFixed(1)} pts ({maxPainData.distancePct}%)
                </strong>
              </div>
            </div>
          </div>

          {/* High-Precision SVG Max Pain V-Curve Visualizer */}
          <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mono">
              <span className="font-bold text-[var(--theme-card-subtitle)] uppercase">
                CUMULATIVE WRITER PAYOUT CURVE ({curr} {unit})
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> Call Writer Pain
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> Put Writer Pain
                </span>
                <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Max Pain ({curr}{maxPainData.maxPainStrike.toLocaleString(loc)})
                </span>
              </div>
            </div>

            <div className="h-52 w-full relative select-none">
              <svg viewBox="0 0 840 190" className="w-full h-full overflow-visible">
                {/* Horizontal Reference Grid */}
                {[0.2, 0.5, 0.8].map((ratio, idx) => {
                  const y = 15 + ratio * 145;
                  const val = Math.round(maxPainData.maxLoss * (1 - ratio));
                  return (
                    <g key={idx}>
                      <line x1="45" y1={y} x2="820" y2={y} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.45" />
                      <text x="40" y={y + 3} fill="#64748b" fontSize="9.5" textAnchor="end" className="mono">
                        {curr}{val}{unit}
                      </text>
                    </g>
                  );
                })}

                {/* Stacked Bars per Strike */}
                {maxPainData.points.map((pt, i) => {
                  const count = maxPainData.points.length;
                  const plotW = 760;
                  const barW = Math.max(8, Math.min(28, plotW / Math.max(1, count) - 6));
                  const x = 55 + (i / Math.max(1, count - 1)) * (plotW - barW);

                  const callH = (pt.callLossCr / maxPainData.maxLoss) * 140;
                  const putH = (pt.putLossCr / maxPainData.maxLoss) * 140;
                  const totalH = callH + putH;
                  const baseY = 160;

                  const isMaxPain = pt.strike === maxPainData.maxPainStrike;
                  const isHovered = hoveredMaxPainStrike === pt.strike || candidatePrice === pt.strike;

                  return (
                    <g
                      key={pt.strike}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredMaxPainStrike(pt.strike)}
                      onMouseLeave={() => setHoveredMaxPainStrike(null)}
                      onClick={() => setCandidatePrice(pt.strike)}
                    >
                      {/* Put Pain Bottom Segment */}
                      <rect
                        x={x}
                        y={baseY - putH}
                        width={barW}
                        height={Math.max(1, putH)}
                        rx="2"
                        fill={isMaxPain ? '#fbbf24' : '#10b981'}
                        fillOpacity={isHovered ? '0.95' : '0.7'}
                      />
                      {/* Call Pain Top Segment */}
                      <rect
                        x={x}
                        y={baseY - totalH}
                        width={barW}
                        height={Math.max(0, callH)}
                        rx="2"
                        fill={isMaxPain ? '#f59e0b' : '#f43f5e'}
                        fillOpacity={isHovered ? '0.95' : '0.75'}
                      />

                      {/* Max Pain Crown Beacon */}
                      {isMaxPain && (
                        <g>
                          <line x1={x + barW / 2} y1="12" x2={x + barW / 2} y2={baseY} stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 3" />
                          <circle cx={x + barW / 2} cy={baseY - totalH - 6} r="4.5" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
                          <text x={x + barW / 2} y="10" fill="#fbbf24" fontSize="9.5" textAnchor="middle" className="mono font-black">
                            ★ MAX PAIN {curr}{pt.strike}
                          </text>
                        </g>
                      )}

                      {/* X-Axis Strike Label (every 2nd or 3rd strike to prevent crowding) */}
                      {(i % Math.max(1, Math.floor(count / 10)) === 0 || isMaxPain) && (
                        <text
                          x={x + barW / 2}
                          y="176"
                          fill={isMaxPain ? '#fbbf24' : '#94a3b8'}
                          fontSize="9"
                          textAnchor="middle"
                          className={`mono ${isMaxPain ? 'font-black' : ''}`}
                        >
                          {pt.strike}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Interactive Settlement Simulator Slider */}
          <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <span className="mono text-xs font-black text-amber-400 shrink-0">
                SIMULATE EXPIRY SETTLEMENT:
              </span>
              <input
                type="range"
                min={chainData.strikes[0]?.strike ?? Math.round(spot * 0.9)}
                max={chainData.strikes[chainData.strikes.length - 1]?.strike ?? Math.round(spot * 1.1)}
                step={instrument.strikeStep}
                value={candidatePrice}
                onChange={(e) => setCandidatePrice(Number(e.target.value))}
                className="w-full max-w-md h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {(() => {
              const selectedPt = maxPainData.points.find((p) => p.strike === candidatePrice) || maxPainData.points[0];
              return (
                <div className="flex flex-wrap items-center gap-3 mono text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
                    Strike: <strong className="text-amber-300 font-black">{curr}{candidatePrice.toLocaleString(loc)}</strong>
                  </span>
                  {selectedPt && (
                    <span className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
                      Total Writer Payout: <strong className="text-[var(--theme-card-text)] font-black">{curr}{selectedPt.totalLossCr} {unit}</strong>
                      <span className="text-[10.5px] text-[var(--theme-card-subtitle)] ml-1.5">
                        (CE: {curr}{selectedPt.callLossCr}{unit} | PE: {curr}{selectedPt.putLossCr}{unit})
                      </span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCandidatePrice(maxPainData.maxPainStrike)}
                    className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/20 text-amber-300 text-[11px] font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
                  >
                    Reset to Max Pain
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* PILLAR 2: PCR SPEEDOMETER + STRIKE OI & INTRADAY CHANGE-IN-OI TOWERS    */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'PCR') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-rose-500" />

          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <h3 className="mono text-[15px] sm:text-[17px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 2 · PUT-CALL RATIO, OI WALLS & INTRADAY WRITING FLOW
                </h3>
              </div>
              <p className="text-xs text-[var(--theme-card-subtitle)] mt-1">
                Maps institutional support and resistance walls across strikes. Toggle between <strong className="text-[var(--theme-card-text)]">Total Open Interest</strong> and <strong className="text-[var(--theme-card-text)]">Intraday Change in OI</strong> to spot fresh writing vs. short covering.
              </p>
            </div>

            {/* Mode Switcher: Total OI vs Change in OI */}
            <div className="flex items-center gap-1.5 bg-[var(--theme-card-subsurface)] p-1 rounded-xl border border-[var(--theme-card-border)]">
              <button
                type="button"
                onClick={() => setOiViewMode('TOTAL_OI')}
                className={`px-3 py-1.5 rounded-lg mono text-xs font-bold transition-all cursor-pointer ${
                  oiViewMode === 'TOTAL_OI'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
                }`}
              >
                📊 Total OI Towers
              </button>
              <button
                type="button"
                onClick={() => setOiViewMode('CHANGE_IN_OI')}
                className={`px-3 py-1.5 rounded-lg mono text-xs font-bold transition-all cursor-pointer ${
                  oiViewMode === 'CHANGE_IN_OI'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                    : 'text-[var(--theme-card-subtitle)] hover:text-[var(--theme-card-text)]'
                }`}
              >
                ⚡ Intraday Change in OI
              </button>
            </div>
          </div>

          {/* Top Row: Speedometer Gauge + OI Breakdown + Weekly/Monthly Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. Sentiment Speedometer */}
            <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] flex flex-col items-center justify-center text-center">
              <div className="flex items-center justify-between w-full mb-1">
                <span className="mono text-[10.5px] font-black text-[var(--theme-card-subtitle)] uppercase tracking-wider">
                  PCR SENTIMENT DIAL
                </span>
                <span className={`mono text-[10px] px-2 py-0.5 rounded border font-black ${pcrData.sentimentColor}`}>
                  {pcrData.sentiment}
                </span>
              </div>

              <div className="relative w-48 h-28 flex items-center justify-center my-1">
                <svg viewBox="0 0 100 55" className="w-48 h-28 overflow-visible">
                  <path d="M 10 50 A 40 40 0 0 1 25 22" fill="none" stroke="#f43f5e" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 27 20 A 40 40 0 0 1 45 11" fill="none" stroke="#f59e0b" strokeWidth="8" />
                  <path d="M 47 10 A 40 40 0 0 1 53 10" fill="none" stroke="#06b6d4" strokeWidth="8" />
                  <path d="M 55 11 A 40 40 0 0 1 73 20" fill="none" stroke="#10b981" strokeWidth="8" />
                  <path d="M 75 22 A 40 40 0 0 1 90 50" fill="none" stroke="#a855f7" strokeWidth="8" strokeLinecap="round" />

                  {(() => {
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
                {pcrData.oiPcr.toFixed(2)}
              </div>
              <p className="text-[11px] text-[var(--theme-card-subtitle)] mt-1 leading-snug">
                {pcrData.desc}
              </p>
            </div>

            {/* 2. Call Resistance vs Put Support Summary */}
            <div className="lg:col-span-2 p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] flex flex-col justify-between space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mono text-xs font-bold">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                  CALL OI (RESISTANCE): {(pcrData.callOI / oiDivisor).toFixed(2)} {oiUnitLabel} ({pcrData.callSharePct}%)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  PUT OI (SUPPORT): {(pcrData.putOI / oiDivisor).toFixed(2)} {oiUnitLabel} ({pcrData.putSharePct}%)
                </span>
              </div>

              {/* Split Tug-of-War Bar */}
              <div className="h-5 w-full bg-slate-800 rounded-xl overflow-hidden flex shadow-inner p-0.5 gap-0.5">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-l-lg transition-all flex items-center justify-start pl-2.5 text-[10.5px] mono font-black text-white"
                  style={{ width: `${pcrData.callSharePct}%` }}
                >
                  {pcrData.callSharePct}% CALL WRITERS
                </div>
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-r-lg transition-all flex items-center justify-end pr-2.5 text-[10.5px] mono font-black text-slate-950"
                  style={{ width: `${pcrData.putSharePct}%` }}
                >
                  {pcrData.putSharePct}% PUT WRITERS
                </div>
              </div>

              {/* Key OI Magnets & Intraday Flow Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 mono text-xs">
                <div className="p-2.5 rounded-xl bg-[var(--theme-card-surface)] border border-rose-500/30">
                  <span className="text-[10px] text-rose-400 font-bold block uppercase">Call Ceiling Wall</span>
                  <span className="text-base font-black text-[var(--theme-card-text)]">
                    {curr}{pcrData.callWallStrike.toLocaleString(loc)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--theme-card-surface)] border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase">Put Floor Wall</span>
                  <span className="text-base font-black text-[var(--theme-card-text)]">
                    {curr}{pcrData.putWallStrike.toLocaleString(loc)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
                  <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Today Call ΔOI</span>
                  <span className={`text-sm font-black ${pcrData.totalCallChgOI >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {pcrData.totalCallChgOI >= 0 ? '+' : ''}{(pcrData.totalCallChgOI / oiDivisor).toFixed(1)} {oiUnitLabel}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)]">
                  <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Today Put ΔOI</span>
                  <span className={`text-sm font-black ${pcrData.totalPutChgOI >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pcrData.totalPutChgOI >= 0 ? '+' : ''}{(pcrData.totalPutChgOI / oiDivisor).toFixed(1)} {oiUnitLabel}
                  </span>
                </div>
              </div>

              {/* Weekly/Near vs Monthly/Next Cycle Comparison Strip */}
              {weeklyChainData && monthlyChainData && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--theme-card-border)]/60 text-[11px] mono">
                  <span className="text-[var(--theme-card-subtitle)] font-bold">CYCLE COMPARISON:</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      <strong>{isIndex ? 'WK' : 'NEAR MO'} ({weeklyChainData.expiry}):</strong> PCR {weeklyChainData.pcr} · Max Pain {curr}{weeklyChainData.maxPain.toLocaleString(loc)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      <strong>{isIndex ? 'MO' : 'NEXT MO'} ({monthlyChainData.expiry}):</strong> PCR {monthlyChainData.pcr} · Max Pain {curr}{monthlyChainData.maxPain.toLocaleString(loc)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Strike-by-Strike Call vs Put OI / Change in OI Butterfly Histogram */}
          <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)] space-y-2.5">
            <div className="flex items-center justify-between text-xs mono pb-2 border-b border-[var(--theme-card-border)]">
              <span className="text-rose-400 font-black uppercase">
                ← {oiViewMode === 'TOTAL_OI' ? `CALL OPEN INTEREST (${oiUnitLabel})` : `INTRADAY CALL OI CHANGE (${oiUnitLabel})`}
              </span>
              <span className="text-[var(--theme-card-subtitle)] font-black uppercase">
                STRIKE LADDER
              </span>
              <span className="text-emerald-400 font-black uppercase">
                {oiViewMode === 'TOTAL_OI' ? `PUT OPEN INTEREST (${oiUnitLabel})` : `INTRADAY PUT OI CHANGE (${oiUnitLabel})`} →
              </span>
            </div>

            <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
              {pcrData.strikeRows.map((row) => {
                const cVal = oiViewMode === 'TOTAL_OI' ? row.callOI : row.callChgOI;
                const pVal = oiViewMode === 'TOTAL_OI' ? row.putOI : row.putChgOI;
                const maxDenom = oiViewMode === 'TOTAL_OI' ? pcrData.maxStrikeOI : pcrData.maxStrikeChgOI;

                const cPct = Math.min(100, Math.round((Math.abs(cVal) / maxDenom) * 100));
                const pPct = Math.min(100, Math.round((Math.abs(pVal) / maxDenom) * 100));

                const isCallWall = row.strike === pcrData.callWallStrike;
                const isPutWall = row.strike === pcrData.putWallStrike;

                return (
                  <div
                    key={row.strike}
                    className={`flex items-center gap-2.5 text-[11px] mono py-1.5 px-3 rounded-lg transition-colors ${
                      row.isATM
                        ? 'bg-amber-500/15 border border-amber-500/40 font-black'
                        : 'hover:bg-[var(--theme-card-surface)]'
                    }`}
                  >
                    {/* Call Side (Left) */}
                    <div className="flex-1 flex items-center justify-end gap-2">
                      {isCallWall && oiViewMode === 'TOTAL_OI' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-black hidden sm:inline">
                          CALL WALL
                        </span>
                      )}
                      <span className="text-rose-400 font-bold tabular-nums">
                        {oiViewMode === 'CHANGE_IN_OI' && cVal > 0 ? '+' : ''}
                        {(cVal / oiDivisor).toFixed(1)}
                      </span>
                      <div className="w-28 sm:w-44 h-3 bg-slate-800/90 rounded-l overflow-hidden flex justify-end">
                        <div
                          className={`h-full rounded-l transition-all ${
                            cVal >= 0 ? 'bg-gradient-to-l from-rose-500 to-rose-400' : 'bg-amber-400/70'
                          }`}
                          style={{ width: `${cPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Center Strike Pill */}
                    <div
                      className={`w-24 text-center font-black px-2 py-0.5 rounded text-[11px] shrink-0 ${
                        row.isATM
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)]'
                      }`}
                    >
                      {curr}{row.strike}
                    </div>

                    {/* Put Side (Right) */}
                    <div className="flex-1 flex items-center justify-start gap-2">
                      <div className="w-28 sm:w-44 h-3 bg-slate-800/90 rounded-r overflow-hidden flex justify-start">
                        <div
                          className={`h-full rounded-r transition-all ${
                            pVal >= 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-amber-400/70'
                          }`}
                          style={{ width: `${pPct}%` }}
                        />
                      </div>
                      <span className="text-emerald-400 font-bold tabular-nums">
                        {oiViewMode === 'CHANGE_IN_OI' && pVal > 0 ? '+' : ''}
                        {(pVal / oiDivisor).toFixed(1)}
                      </span>
                      {isPutWall && oiViewMode === 'TOTAL_OI' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black hidden sm:inline">
                          PUT WALL
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* PILLAR 3: GREEKS TORNADO & SENSITIVITY DISTRIBUTION                     */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'GREEKS') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyan-400 via-sky-500 to-pink-500" />

          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                <h3 className="mono text-[15px] sm:text-[17px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 3 · GREEKS SENSITIVITY TORNADO & NET CHAIN EXPOSURE
                </h3>
              </div>
              <p className="text-xs text-[var(--theme-card-subtitle)] mt-1">
                Inspects strike-by-strike Black-Scholes sensitivity across <strong className="text-cyan-400">Calls (Left)</strong> vs. <strong className="text-pink-400">Puts (Right)</strong>. Gamma peaks sharply at ATM ({curr}{spot.toLocaleString(loc)}).
              </p>
            </div>

            {/* Greek Selector Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-[var(--theme-card-subsurface)] p-1 rounded-xl border border-[var(--theme-card-border)]">
              {(['delta', 'gamma', 'theta', 'vega', 'rho'] as GreekType[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGreek(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs mono font-bold uppercase transition-all cursor-pointer ${
                    selectedGreek === g
                      ? 'bg-cyan-400 text-slate-950 font-black shadow-xs'
                      : 'text-[var(--theme-card-subtitle)] hover:text-cyan-400'
                  }`}
                >
                  {g === 'delta' ? 'Delta (Δ)' : g === 'gamma' ? 'Gamma (Γ)' : g === 'theta' ? 'Theta (Θ)' : g === 'vega' ? 'Vega (ν)' : 'Rho (ρ)'}
                </button>
              ))}
            </div>
          </div>

          {/* Net Chain Greeks Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mono text-xs">
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
              <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Net Chain Delta (Δ)</span>
              <span className="text-base font-black text-cyan-400">
                {greeksData.netDelta >= 0 ? '+' : ''}{(greeksData.netDelta / 1000).toFixed(1)}K
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
              <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Net Chain Gamma (Γ)</span>
              <span className="text-base font-black text-emerald-400">{greeksData.netGamma.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
              <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Daily Theta Decay (Θ)</span>
              <span className="text-base font-black text-rose-400">
                {curr}{greeksData.netThetaScaled} {unit}/day
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
              <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Net Chain Vega (ν)</span>
              <span className="text-base font-black text-purple-400">
                {curr}{greeksData.netVegaScaled} {unit}/1% IV
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)] col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[var(--theme-card-subtitle)] block uppercase">Active Parameter</span>
              <span className="text-base font-black text-amber-300 uppercase">{selectedGreek}</span>
            </div>
          </div>

          {/* Tornado Distribution Rows */}
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

              const scaleFactor =
                selectedGreek === 'gamma' ? 1800 : selectedGreek === 'delta' ? 100 : selectedGreek === 'theta' ? 2.5 : 3;

              return (
                <div
                  key={row.strike}
                  className={`flex items-center gap-2.5 text-[11px] mono py-1.5 px-3 rounded-lg transition-colors ${
                    row.isATM
                      ? 'bg-amber-500/15 border border-amber-500/40 font-black'
                      : 'hover:bg-[var(--theme-card-subsurface)]'
                  }`}
                >
                  {/* Call Value (Left) */}
                  <div className="flex-1 flex items-center justify-end gap-2.5 text-right">
                    <span className="text-cyan-400 font-bold tabular-nums">
                      {typeof cVal === 'number' ? (selectedGreek === 'gamma' ? cVal.toFixed(4) : cVal.toFixed(2)) : '—'}
                    </span>
                    <div className="w-28 sm:w-44 h-3 bg-slate-800/90 rounded-l overflow-hidden flex justify-end">
                      <div
                        className="h-full bg-gradient-to-l from-cyan-400 to-sky-600 rounded-l"
                        style={{ width: `${Math.min(100, Math.abs(cVal) * scaleFactor)}%` }}
                      />
                    </div>
                  </div>

                  {/* Strike Center Anchor */}
                  <div
                    className={`w-24 text-center font-black px-2 py-0.5 rounded text-[11px] shrink-0 ${
                      row.isATM
                        ? 'bg-amber-400 text-slate-950 shadow-xs'
                        : 'bg-[var(--theme-card-subsurface)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)]'
                    }`}
                  >
                    {curr}{row.strike}
                  </div>

                  {/* Put Value (Right) */}
                  <div className="flex-1 flex items-center justify-start gap-2.5 text-left">
                    <div className="w-28 sm:w-44 h-3 bg-slate-800/90 rounded-r overflow-hidden flex justify-start">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-r"
                        style={{ width: `${Math.min(100, Math.abs(pVal) * scaleFactor)}%` }}
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
      {/* PILLAR 4: SPOTGAMMA-STYLE GEX (GAMMA) & DEX (DELTA) EXPOSURE            */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'DEX') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-purple-500 via-fuchsia-400 to-emerald-400" />

          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50" />
                <h3 className="mono text-[15px] sm:text-[17px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 4 · DEALER {exposureMode === 'GEX' ? 'GAMMA EXPOSURE (GEX)' : 'DELTA EXPOSURE (DEX)'} & HEDGING WALLS
                </h3>
              </div>
              <p className="text-xs text-[var(--theme-card-subtitle)] mt-1">
                {exposureMode === 'GEX'
                  ? `Quantifies dealer gamma hedging flows per 1% underlying move. Above Zero Gamma Flip (${curr}${exposureData.gexFlipStrike.toLocaleString(loc)}), dealers dampen volatility; below it, dealers amplify directional moves.`
                  : `Quantifies net ${currencyName} delta sensitivity across strikes. Spot above Zero Delta Flip (${curr}${exposureData.dexFlipStrike.toLocaleString(loc)}) indicates stabilizing long-delta positioning.`}
              </p>
            </div>

            {/* GEX vs DEX Switcher */}
            <div className="flex items-center gap-1.5 bg-[var(--theme-card-subsurface)] p-1 rounded-xl border border-[var(--theme-card-border)]">
              <button
                type="button"
                onClick={() => setExposureMode('GEX')}
                className={`px-3 py-1.5 rounded-lg mono text-xs font-bold transition-all cursor-pointer ${
                  exposureMode === 'GEX'
                    ? 'bg-purple-500 text-white font-black shadow-xs'
                    : 'text-[var(--theme-card-subtitle)] hover:text-purple-300'
                }`}
              >
                🛡️ Gamma Exposure (GEX)
              </button>
              <button
                type="button"
                onClick={() => setExposureMode('DEX')}
                className={`px-3 py-1.5 rounded-lg mono text-xs font-bold transition-all cursor-pointer ${
                  exposureMode === 'DEX'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                    : 'text-[var(--theme-card-subtitle)] hover:text-cyan-300'
                }`}
              >
                ⚡ Delta Exposure (DEX)
              </button>
            </div>
          </div>

          {/* Dealer Hedging Regime & Walls Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mono text-xs">
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 font-bold block uppercase">Positive Gamma Call Wall</span>
              <span className="text-base font-black text-[var(--theme-card-text)]">
                {curr}{exposureData.callGexWallStrike.toLocaleString(loc)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-rose-500/30">
              <span className="text-[10px] text-rose-400 font-bold block uppercase">Negative Gamma Put Wall</span>
              <span className="text-base font-black text-[var(--theme-card-text)]">
                {curr}{exposureData.putGexWallStrike.toLocaleString(loc)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-purple-500/30">
              <span className="text-[10px] text-purple-300 font-bold block uppercase">
                Zero {exposureMode} Flip Level
              </span>
              <span className="text-base font-black text-purple-300">
                {curr}{(exposureMode === 'GEX' ? exposureData.gexFlipStrike : exposureData.dexFlipStrike).toLocaleString(loc)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
              <span className="text-[10px] text-[var(--theme-card-subtitle)] font-bold block uppercase">
                Net Chain {exposureMode}
              </span>
              <span
                className={`text-base font-black ${
                  (exposureMode === 'GEX' ? exposureData.totalNetGex : exposureData.totalNetDex) >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {(exposureMode === 'GEX' ? exposureData.totalNetGex : exposureData.totalNetDex) >= 0 ? '+' : ''}
                {curr}
                {exposureMode === 'GEX' ? exposureData.totalNetGex : exposureData.totalNetDex} {unit}
              </span>
            </div>
          </div>

          {/* GEX / DEX Strike Profile Histogram */}
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar pr-1">
            {exposureData.rows.map((row) => {
              const val = exposureMode === 'GEX' ? row.netGex : row.netDex;
              const maxAbs = exposureMode === 'GEX' ? exposureData.maxAbsGex : exposureData.maxAbsDex;
              const flipStrike = exposureMode === 'GEX' ? exposureData.gexFlipStrike : exposureData.dexFlipStrike;

              const isPositive = val >= 0;
              const barPct = Math.min(100, Math.round((Math.abs(val) / maxAbs) * 100));
              const isFlip = row.strike === flipStrike;

              return (
                <div
                  key={row.strike}
                  className={`flex items-center gap-3 text-[11px] mono py-1.5 px-3 rounded-lg border transition-colors ${
                    isFlip
                      ? 'bg-purple-500/15 border-purple-400 font-black'
                      : row.isATM
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'border-transparent hover:bg-[var(--theme-card-subsurface)]'
                  }`}
                >
                  <div className="w-24 font-black shrink-0 flex items-center gap-1.5">
                    <span className={isFlip ? 'text-purple-300' : 'text-[var(--theme-card-text)]'}>
                      {curr}{row.strike}
                    </span>
                    {isFlip && (
                      <span className="text-[9px] px-1 rounded bg-purple-500 text-slate-950 font-black">
                        FLIP
                      </span>
                    )}
                  </div>

                  {/* Left Side: Negative GEX / DEX (Red Volatility Accelerator) */}
                  <div className="flex-1 h-3.5 bg-slate-800/80 rounded-l overflow-hidden flex justify-end items-center">
                    {!isPositive && (
                      <div
                        className="h-full bg-gradient-to-l from-rose-500 to-rose-400 rounded-l transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    )}
                  </div>

                  {/* Center Zero Axis */}
                  <div className="w-0.5 h-4 bg-slate-400/50 shrink-0" />

                  {/* Right Side: Positive GEX / DEX (Green Stabilizing Pin) */}
                  <div className="flex-1 h-3.5 bg-slate-800/80 rounded-r overflow-hidden flex justify-start items-center">
                    {isPositive && (
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-r transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    )}
                  </div>

                  <div className={`w-28 text-right font-black shrink-0 tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? '+' : ''}{val} {unit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* PILLAR 5: IV SMILE, 25Δ SKEW & EXPECTED MOVE CORRIDOR                   */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activePillar === 'ALL' || activePillar === 'IV') && (
        <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-sky-400 via-cyan-400 to-pink-500" />

          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--theme-card-border)]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-sky-400 shadow-sm shadow-sky-400/50" />
                <h3 className="mono text-[15px] sm:text-[17px] font-black text-[var(--theme-card-text)] uppercase tracking-wider">
                  PILLAR 5 · IMPLIED VOLATILITY SMILE, SKEW & STRADDLE EXPECTED MOVE
                </h3>
              </div>
              <p className="text-xs text-[var(--theme-card-subtitle)] mt-1">
                Visualizes implied volatility across strikes alongside the ATM Straddle implied move (<strong className="text-sky-300">±{curr}{ivData.atmStraddle.toLocaleString(loc)}</strong> or <strong className="text-sky-300">±{ivData.expectedMovePct}%</strong>).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mono text-xs">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Call IV Curve
              </span>
              <span className="flex items-center gap-1.5 text-pink-400 font-bold">
                <span className="w-3 h-0.5 bg-pink-400 inline-block" /> Put IV Curve
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-300 font-black">
                ATM IV: {ivData.atmIV}% · IVR: {ivData.ivRank}
              </span>
            </div>
          </div>

          {/* Expected Move Breakeven Corridor Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mono text-xs">
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-sky-500/30">
              <span className="text-[10px] text-sky-400 font-bold block uppercase">ATM Straddle (CE + PE)</span>
              <span className="text-base font-black text-[var(--theme-card-text)]">
                {curr}{ivData.atmStraddle.toLocaleString(loc)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-rose-500/30">
              <span className="text-[10px] text-rose-400 font-bold block uppercase">Lower Breakeven (-1σ)</span>
              <span className="text-base font-black text-rose-300">
                {curr}{ivData.lowerBreakeven.toLocaleString(loc)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 font-bold block uppercase">Upper Breakeven (+1σ)</span>
              <span className="text-base font-black text-emerald-300">
                {curr}{ivData.upperBreakeven.toLocaleString(loc)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--theme-card-subsurface)] border border-[var(--theme-card-border)]">
              <span className="text-[10px] text-[var(--theme-card-subtitle)] font-bold block uppercase">Put-Call Skew</span>
              <span className="text-base font-black text-pink-400">
                {ivData.avgSkew >= 0 ? `+${ivData.avgSkew}%` : `${ivData.avgSkew}%`} ({ivData.avgSkew >= 0 ? 'Put Premium' : 'Call Premium'})
              </span>
            </div>
          </div>

          {/* High-Definition SVG Volatility Smile Curve */}
          <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-subsurface)]">
            <div className="h-60 w-full relative select-none">
              <svg viewBox="0 0 840 215" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="callIvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="putIvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal IV Grid Lines */}
                {[0.15, 0.45, 0.75].map((pct, idx) => {
                  const y = 20 + 160 * pct;
                  const ivVal = Math.round((ivData.maxIV - (ivData.maxIV - ivData.minIV) * pct) * 10) / 10;
                  return (
                    <g key={idx}>
                      <line x1="45" y1={y} x2="815" y2={y} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.45" />
                      <text x="38" y={y + 3} fill="#64748b" fontSize="9.5" textAnchor="end" className="mono">
                        {ivVal}%
                      </text>
                    </g>
                  );
                })}

                {/* Call IV Area + Smooth Polyline */}
                {(() => {
                  const count = Math.max(1, ivData.rows.length - 1);
                  const coords = ivData.rows.map((r, i) => {
                    const x = 50 + (i / count) * 760;
                    const y = 180 - ((r.callIV - ivData.minIV) / (ivData.maxIV - ivData.minIV || 1)) * 155;
                    return { x, y, r };
                  });
                  const pts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
                  const areaPts = `50,180 ${pts} 810,180`;

                  return (
                    <g>
                      <polygon points={areaPts} fill="url(#callIvGrad)" />
                      <polyline
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={pts}
                      />
                    </g>
                  );
                })()}

                {/* Put IV Area + Smooth Polyline */}
                {(() => {
                  const count = Math.max(1, ivData.rows.length - 1);
                  const coords = ivData.rows.map((r, i) => {
                    const x = 50 + (i / count) * 760;
                    const y = 180 - ((r.putIV - ivData.minIV) / (ivData.maxIV - ivData.minIV || 1)) * 155;
                    return { x, y, r };
                  });
                  const pts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
                  const areaPts = `50,180 ${pts} 810,180`;

                  return (
                    <g>
                      <polygon points={areaPts} fill="url(#putIvGrad)" />
                      <polyline
                        fill="none"
                        stroke="#ec4899"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={pts}
                      />
                    </g>
                  );
                })()}

                {/* Interactive Strike Nodes & X-Axis Labels */}
                {ivData.rows.map((r, i) => {
                  const count = Math.max(1, ivData.rows.length - 1);
                  const x = 50 + (i / count) * 760;
                  const cyCall = 180 - ((r.callIV - ivData.minIV) / (ivData.maxIV - ivData.minIV || 1)) * 155;
                  const cyPut = 180 - ((r.putIV - ivData.minIV) / (ivData.maxIV - ivData.minIV || 1)) * 155;
                  const isHovered = hoveredStrike === r.strike;

                  return (
                    <g
                      key={r.strike}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredStrike(r.strike)}
                      onMouseLeave={() => setHoveredStrike(null)}
                    >
                      {isHovered && (
                        <line x1={x} y1="15" x2={x} y2="180" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
                      )}
                      <circle cx={x} cy={cyCall} r={isHovered || r.isATM ? 4.5 : 2.5} fill="#06b6d4" stroke="#0f172a" strokeWidth="1" />
                      <circle cx={x} cy={cyPut} r={isHovered || r.isATM ? 4.5 : 2.5} fill="#ec4899" stroke="#0f172a" strokeWidth="1" />

                      {(i % Math.max(1, Math.floor(ivData.rows.length / 10)) === 0 || r.isATM) && (
                        <text
                          x={x}
                          y="198"
                          fill={r.isATM ? '#fbbf24' : '#94a3b8'}
                          fontSize="9"
                          textAnchor="middle"
                          className={`mono ${r.isATM ? 'font-black' : ''}`}
                        >
                          {r.strike}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* ATM Spot Vertical Beacon */}
                {(() => {
                  const atmIdx = ivData.rows.findIndex((r) => r.isATM);
                  if (atmIdx >= 0) {
                    const x = 50 + (atmIdx / Math.max(1, ivData.rows.length - 1)) * 760;
                    return (
                      <g>
                        <line x1={x} y1="14" x2={x} y2="182" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
                        <text x={x} y="10" fill="#fbbf24" fontSize="9.5" textAnchor="middle" className="mono font-black">
                          ATM SPOT ({curr}{spot.toLocaleString(loc)})
                        </text>
                      </g>
                    );
                  }
                  return null;
                })()}
              </svg>
            </div>

            {/* Interactive Strike & Straddle Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-4 max-h-40 overflow-y-auto no-scrollbar">
              {ivData.rows.map((r) => (
                <div
                  key={r.strike}
                  onMouseEnter={() => setHoveredStrike(r.strike)}
                  onMouseLeave={() => setHoveredStrike(null)}
                  className={`p-2.5 rounded-xl border text-center transition-all mono text-xs cursor-pointer ${
                    r.isATM
                      ? 'border-amber-400 bg-amber-500/15 shadow-xs'
                      : hoveredStrike === r.strike
                      ? 'border-cyan-400 bg-cyan-500/15'
                      : 'border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-sky-500/40'
                  }`}
                >
                  <div className="font-black text-[var(--theme-card-text)] flex items-center justify-center gap-1">
                    <span>{curr}{r.strike}</span>
                    {r.isATM && <span className="text-[8.5px] px-1 rounded bg-amber-400 text-slate-950 font-black">ATM</span>}
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] mt-1">
                    <span className="text-cyan-400 font-bold">CE {r.callIV}%</span>
                    <span className="text-pink-400 font-bold">PE {r.putIV}%</span>
                  </div>
                  <div className="text-[9.5px] text-[var(--theme-card-subtitle)] mt-1 pt-1 border-t border-[var(--theme-card-border)]/50 flex justify-between">
                    <span>Straddle:</span>
                    <strong className="text-[var(--theme-card-text)]">{curr}{r.straddleLtp}</strong>
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
