'use client';

import React, { useState } from 'react';
import {
  TrainingModule,
  Greeks,
  NiftyConstituentItem,
  defaultNiftyConstituents,
} from '@/lib/academy/academyData';

// ── 1. Institutional Simulation Engine Component ──────────────────────────────
interface SimulationEngineProps {
  simulationPnl: number;
  simulationStep: number;
  simulationMessage: string;
  simGreeks: Greeks;
  simSpot: number;
  simHistory: string[];
  onSimAction: (action: string) => void;
}

export function SimulationEngineInteractiveContent({
  simulationPnl,
  simulationStep,
  simulationMessage,
  simGreeks,
  simSpot,
  simHistory,
  onSimAction,
}: SimulationEngineProps) {
  return (
    <div className="space-y-4">
      {/* Simulation Replay Banner */}
      <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-black uppercase text-emerald-400">
              NIFTY 50 Expiry Replay · Step {simulationStep}/4
            </span>
          </div>
          <div className="text-[14px] font-mono font-black text-emerald-400">
            SIM P&L: ₹{simulationPnl >= 0 ? '+' : ''}
            {simulationPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <p className="text-[12px] opacity-80 leading-relaxed font-sans">{simulationMessage}</p>
      </div>

      {/* Spot Price & Greeks Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
        <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="text-[9.5px] uppercase opacity-60 font-bold">Sim Spot</div>
          <div className="text-[14px] font-black text-emerald-400">
            ₹{simSpot.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="text-[9.5px] uppercase opacity-60 font-bold">Delta (Δ)</div>
          <div className="text-[14px] font-black text-cyan-400">{simGreeks.delta.toFixed(3)}</div>
        </div>
        <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="text-[9.5px] uppercase opacity-60 font-bold">Gamma (Γ)</div>
          <div className="text-[14px] font-black text-amber-400">{simGreeks.gamma.toFixed(4)}</div>
        </div>
        <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
          <div className="text-[9.5px] uppercase opacity-60 font-bold">Theta (Θ)</div>
          <div className="text-[14px] font-black text-rose-400">{simGreeks.theta.toFixed(1)}/day</div>
        </div>
        <div className="p-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] col-span-2 sm:col-span-1">
          <div className="text-[9.5px] uppercase opacity-60 font-bold">Vega (ν)</div>
          <div className="text-[14px] font-black text-purple-400">₹{simGreeks.vega.toFixed(1)}</div>
        </div>
      </div>

      {/* Interactive Institutional Action Buttons */}
      <div className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] space-y-2">
        <div className="text-[10px] mono font-bold uppercase opacity-60">Interactive Portfolio Interventions</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onSimAction('HEDGE')}
            className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-400 text-[11px] font-mono font-black transition-all cursor-pointer active:scale-95"
          >
            🛡️ Hedge Put Leg
          </button>
          <button
            type="button"
            onClick={() => onSimAction('ROLL')}
            className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/40 hover:bg-cyan-500/25 text-cyan-400 text-[11px] font-mono font-black transition-all cursor-pointer active:scale-95"
          >
            🔄 Roll Strikes (23900)
          </button>
          <button
            type="button"
            onClick={() => onSimAction('TICK')}
            className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-400 text-[11px] font-mono font-black transition-all cursor-pointer active:scale-95"
          >
            ⏩ Advance Tick
          </button>
          <button
            type="button"
            onClick={() => onSimAction('SQUARE')}
            className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 text-rose-400 text-[11px] font-mono font-black transition-all cursor-pointer active:scale-95"
          >
            ⏹️ Square Off
          </button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onSimAction('RESET')}
            className="text-[10.5px] font-mono opacity-60 hover:opacity-100 underline cursor-pointer"
          >
            Reset Simulation Scenario
          </button>
        </div>
      </div>

      {/* Audit History Log */}
      <div className="p-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] max-h-36 overflow-y-auto font-mono text-[11px] space-y-1">
        <div className="text-[10px] font-bold uppercase opacity-50 pb-1 border-b border-[var(--theme-card-border)]">
          Audit Execution Trail
        </div>
        {simHistory.map((h, idx) => (
          <div key={idx} className="opacity-75 flex items-center gap-1.5">
            <span className="text-emerald-400">›</span>
            <span>{h}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. NIFTY 50 Dynamics Engine Component ─────────────────────────────────────
interface NiftyDynamicsProps {
  constituents: NiftyConstituentItem[];
  sectorFilter: string;
  projectedMove: number;
  onSectorFilter: (sec: string) => void;
  onToggleBias: (name: string) => void;
}

export function NiftyDynamicsInteractiveContent({
  constituents,
  sectorFilter,
  projectedMove,
  onSectorFilter,
  onToggleBias,
}: NiftyDynamicsProps) {
  const [drillAnswer, setDrillAnswer] = useState<number | null>(null);

  const filtered = sectorFilter === 'ALL'
    ? constituents
    : constituents.filter(c => c.sector === sectorFilter);

  const sectors = ['ALL', 'BANKING', 'IT', 'OIL & GAS', 'INFRA'];

  return (
    <div className="space-y-4">
      {/* Point Impact Calculator Display */}
      <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase text-emerald-400">
            Constituent Point Impact Matrix
          </div>
          <div className="text-sm font-sans opacity-80 mt-0.5">
            Toggle constituent stance below to simulate weighted index impact.
          </div>
        </div>
        <div className="text-right font-mono">
          <div className="text-[10px] opacity-60 uppercase font-bold">Projected NIFTY Move</div>
          <div className={`text-xl font-black ${projectedMove >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {projectedMove >= 0 ? '+' : ''}{projectedMove.toFixed(1)} pts
          </div>
        </div>
      </div>

      {/* Sector Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
        {sectors.map(sec => (
          <button
            key={sec}
            type="button"
            onClick={() => onSectorFilter(sec)}
            className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
              sectorFilter === sec
                ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-xs'
                : 'border-[var(--theme-card-border)] opacity-70 hover:opacity-100'
            }`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Constituents Interactive Catalog */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[12px]">
        {filtered.map(item => (
          <div
            key={item.name}
            onClick={() => onToggleBias(item.name)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
              item.isSimulatedBullish
                ? 'bg-emerald-500/10 border-emerald-500/40 hover:border-emerald-500'
                : 'bg-rose-500/10 border-rose-500/40 hover:border-rose-500'
            }`}
          >
            <div>
              <div className="font-extrabold text-[13px]">{item.name}</div>
              <div className="text-[10px] opacity-60">{item.sector} · {item.weight}% weight</div>
            </div>
            <div className="text-right">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  item.isSimulatedBullish ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                }`}
              >
                {item.isSimulatedBullish ? '▲ Bullish' : '▼ Bearish'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Smart Money Concepts (SMC) & Liquidity Pools Mapping */}
      <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] space-y-2">
        <div className="text-[10.5px] font-mono font-bold uppercase text-emerald-400">
          Mapped SMC Liquidity Pools & Imbalances
        </div>
        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between p-1.5 rounded bg-amber-500/10 border border-amber-500/30">
            <span>Equal Highs Buy-Side Liquidity Pool</span>
            <span className="font-black text-amber-400">₹23,920.00</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-rose-500/10 border border-rose-500/30">
            <span>Bearish Fair Value Gap (FVG)</span>
            <span className="font-black text-rose-400">₹23,880.00 – ₹23,895.00</span>
          </div>
          <div className="flex items-center justify-between p-1.5 rounded bg-emerald-500/10 border border-emerald-500/30">
            <span>Bullish Order Block (OB) Retest</span>
            <span className="font-black text-emerald-400">₹23,760.00 – ₹23,780.00</span>
          </div>
        </div>
      </div>

      {/* Institutional Quiz Assessment */}
      <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] space-y-2">
        <div className="text-[11px] font-mono font-bold uppercase text-cyan-400">
          Knowledge Drill: Heavyweight Drag
        </div>
        <p className="text-[12px] opacity-85 font-sans">
          If 40 out of 50 NIFTY stocks advance (+0.4%), but HDFC Bank and Reliance drop (-1.8%), what is the most probable index trajectory?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
          {[
            { id: 1, label: 'A) Upwards (+100 pts)' },
            { id: 2, label: 'B) Flat / Drag Downward (Correct)' },
            { id: 3, label: 'C) Massive Short Squeeze' },
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDrillAnswer(opt.id)}
              className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                drillAnswer === opt.id
                  ? opt.id === 2
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-rose-500/20 border-rose-500 text-rose-400'
                  : 'border-[var(--theme-card-border)] hover:bg-[var(--theme-card-surface)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 3. Behavioral Bias Detection Engine Component ─────────────────────────────
interface BehavioralBiasProps {
  disciplineScore: number;
  emotionShield: boolean;
  cooldownSeconds: number;
  neutralizedBiases: string[];
  onToggleEmotionShield: () => void;
  onNeutralizeBias: (biasKey: string) => void;
  onActivateCooldown: () => void;
}

export function BehavioralBiasInteractiveContent({
  disciplineScore,
  emotionShield,
  cooldownSeconds,
  neutralizedBiases,
  onToggleEmotionShield,
  onNeutralizeBias,
  onActivateCooldown,
}: BehavioralBiasProps) {
  const [cooldown, setCooldown] = useState(cooldownSeconds);

  const biasCards = [
    {
      key: 'LOSS_AVERSION',
      title: 'Loss Aversion Trap',
      desc: 'Holding losing trades 2.5x longer than winners in hopes of a breakeven exit.',
    },
    {
      key: 'FOMO_CHASE',
      title: 'FOMO Extended Candle Chase',
      desc: 'Entering market orders at the pinnacle of green momentum candles without retest.',
    },
    {
      key: 'REVENGE_TRADING',
      title: 'Revenge Trading Surge',
      desc: 'Doubling lot sizes immediately following an invalidation stop-loss hit.',
    },
    {
      key: 'DISPOSITION_EFFECT',
      title: 'Disposition Effect',
      desc: 'Locking tiny gains prematurely while allowing adverse moves to reach liquidation.',
    },
    {
      key: 'OVERCONFIDENCE',
      title: 'Overconfidence Sizing',
      desc: 'Oversizing portfolio allocation following 3 consecutive winning setups.',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Discipline Score Gauge & Emotion Shield */}
      <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase text-emerald-400">
            Psychological Discipline Metric
          </div>
          <div className="text-2xl font-mono font-black text-emerald-400 mt-0.5">
            {disciplineScore} / 100
          </div>
          <div className="text-[11px] opacity-70">Neutralize biases below to increase score to 100.</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <div className="text-[10px] opacity-60 uppercase font-bold">Emotion Shield</div>
            <div className="text-[12px] font-black text-cyan-400">
              {emotionShield ? 'ARMED & ACTIVE' : 'DISARMED'}
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleEmotionShield}
            className={`px-3 py-1.5 rounded-lg border font-mono text-[11px] font-bold transition-all cursor-pointer ${
              emotionShield
                ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                : 'border-[var(--theme-card-border)] opacity-60'
            }`}
          >
            {emotionShield ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* 5 Cognitive Bias Cards */}
      <div className="space-y-2">
        {biasCards.map(b => {
          const isNeutralized = neutralizedBiases.includes(b.key);
          return (
            <div
              key={b.key}
              className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                isNeutralized
                  ? 'bg-emerald-500/10 border-emerald-500/40 opacity-75'
                  : 'bg-[var(--theme-card-surface)] border-[var(--theme-card-border)]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[13px]">{b.title}</span>
                  {isNeutralized && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 text-[9.5px] font-mono font-black">
                      NEUTRALIZED (+3)
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] opacity-75 mt-0.5">{b.desc}</div>
              </div>

              <button
                type="button"
                disabled={isNeutralized}
                onClick={() => onNeutralizeBias(b.key)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-black shrink-0 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isNeutralized
                    ? 'border border-emerald-500/40 text-emerald-400'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 shadow-xs'
                }`}
              >
                {isNeutralized ? '✓ Neutralized' : 'Neutralize Bias'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Revenge Trading Lockout Cooldown */}
      <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[12px] font-black text-rose-400 uppercase">
            20-Minute Operational Revenge Cooldown
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">
            Lock terminal order submissions following a high-volatility stop loss.
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onActivateCooldown();
            setCooldown(1200);
          }}
          className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-mono text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
        >
          {cooldown > 0 ? `Active: ${Math.floor(cooldown / 60)}m Left` : 'Engage Cooldown'}
        </button>
      </div>
    </div>
  );
}

// ── 4. Risk Discipline Engine Component ───────────────────────────────────────
interface RiskDisciplineProps {
  capital: number;
  riskPct: number;
  entry: number;
  stopLoss: number;
  drawdown: number;
  circuitBreakerHalted: boolean;
  onUpdateRisk: (cap: number, risk: number, entry: number, sl: number) => void;
  onSimulateLoss: () => void;
  onResetHalt: () => void;
}

export function RiskDisciplineInteractiveContent({
  capital,
  riskPct,
  entry,
  stopLoss,
  drawdown,
  circuitBreakerHalted,
  onUpdateRisk,
  onSimulateLoss,
  onResetHalt,
}: RiskDisciplineProps) {
  const [inpCapital, setInpCapital] = useState(capital.toString());
  const [inpRisk, setInpRisk] = useState(riskPct.toString());
  const [inpEntry, setInpEntry] = useState(entry.toString());
  const [inpSl, setInpSl] = useState(stopLoss.toString());

  const numCap = parseFloat(inpCapital) || 500000;
  const numRisk = parseFloat(inpRisk) || 1.0;
  const numEntry = parseFloat(inpEntry) || 23800;
  const numSl = parseFloat(inpSl) || 23720;

  const maxRiskAmount = numCap * (numRisk / 100.0);
  const slDistance = Math.max(Math.abs(numEntry - numSl), 1.0);
  const allowedUnits = maxRiskAmount / slDistance;
  const allowedLots = Math.max(Math.floor(allowedUnits / 25), 1);

  return (
    <div className="space-y-4">
      {/* Circuit Breaker Status Banner */}
      {circuitBreakerHalted ? (
        <div className="p-3.5 rounded-xl border-2 border-rose-500 bg-rose-500/20 text-rose-300 space-y-2 animate-pulse">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-black uppercase tracking-wider text-rose-400">
              🚨 DAILY CIRCUIT BREAKER ENGAGED · EXECUTION HALTED
            </span>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-500 text-slate-950">
              Drawdown: {drawdown.toFixed(1)}% ≥ 3.0%
            </span>
          </div>
          <p className="text-[12px] opacity-90 font-sans">
            Your daily cumulative drawdown reached or exceeded the institutional 3.0% threshold. Trading is mathematically halted to prevent catastrophic capital destruction.
          </p>
          <button
            type="button"
            onClick={onResetHalt}
            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono text-[11px] font-black transition-all cursor-pointer"
          >
            Reset Circuit Breaker & Unfreeze
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-emerald-400">
              Drawdown Circuit Breaker Telemetry
            </div>
            <div className="text-sm font-mono font-black text-emerald-400 mt-0.5">
              Current: {drawdown.toFixed(1)}% / Max Limit: 3.0%
            </div>
          </div>
          <button
            type="button"
            onClick={onSimulateLoss}
            className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-400 font-mono text-[11px] font-bold cursor-pointer active:scale-95"
          >
            ⚡ Simulate +1.1% Loss Hit
          </button>
        </div>
      )}

      {/* 1% Capital Allocation Sizing Calculator Inputs */}
      <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] space-y-3">
        <div className="text-[11px] font-mono font-black uppercase text-cyan-400">
          Mathematical 1% Position Sizing Calculator
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-[11px]">
          <div>
            <label className="text-[9.5px] opacity-60 uppercase font-bold block mb-1">Capital (₹)</label>
            <input
              type="number"
              value={inpCapital}
              onChange={e => setInpCapital(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[12px] font-bold focus:outline-emerald-500"
            />
          </div>
          <div>
            <label className="text-[9.5px] opacity-60 uppercase font-bold block mb-1">Risk %</label>
            <input
              type="number"
              step="0.1"
              value={inpRisk}
              onChange={e => setInpRisk(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[12px] font-bold focus:outline-emerald-500"
            />
          </div>
          <div>
            <label className="text-[9.5px] opacity-60 uppercase font-bold block mb-1">Entry Price (₹)</label>
            <input
              type="number"
              value={inpEntry}
              onChange={e => setInpEntry(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[12px] font-bold focus:outline-emerald-500"
            />
          </div>
          <div>
            <label className="text-[9.5px] opacity-60 uppercase font-bold block mb-1">Stop Loss (₹)</label>
            <input
              type="number"
              value={inpSl}
              onChange={e => setInpSl(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[12px] font-bold focus:outline-emerald-500"
            />
          </div>
        </div>

        {/* Calculated Results Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono pt-2 border-t border-[var(--theme-card-border)]">
          <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
            <div className="text-[9px] opacity-60 uppercase font-bold">Max Risk Allowed</div>
            <div className="text-[13px] font-black text-rose-400">
              ₹{maxRiskAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
            <div className="text-[9px] opacity-60 uppercase font-bold">Stop Distance</div>
            <div className="text-[13px] font-black text-cyan-400">
              {slDistance.toFixed(1)} pts
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
            <div className="text-[9px] opacity-60 uppercase font-bold">Allowed Units</div>
            <div className="text-[13px] font-black text-amber-400">
              {allowedUnits.toFixed(0)} shares
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
            <div className="text-[9px] opacity-60 uppercase font-bold">Allowed Lots</div>
            <div className="text-[13px] font-black text-emerald-400">
              {allowedLots} lots (25x)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 5. General Module Interactive View (for US & UAE Modules) ─────────────────
export function GeneralModuleInteractiveContent({
  module,
  onAskMentor,
}: {
  module: TrainingModule;
  onAskMentor: (q: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <h3 className="font-mono text-sm font-black uppercase text-emerald-400">{module.title}</h3>
        </div>
        <p className="text-[13px] opacity-85 leading-relaxed">{module.description}</p>
      </div>

      <div className="p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] space-y-2">
        <div className="text-[11px] font-mono font-bold uppercase opacity-60">Syllabus Breakdown</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
          {module.topics.map(t => (
            <div key={t} className="p-2 rounded-lg bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => onAskMentor(`Explain ${module.title} and institutional key concepts: ${module.topics.join(', ')}`)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-[12px] font-black transition-all cursor-pointer shadow-xs"
        >
          Consult AI Mentor About This Topic →
        </button>
      </div>
    </div>
  );
}
