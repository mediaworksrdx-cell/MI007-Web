'use client';

import React, { useState, useEffect } from 'react';
import {
  TrainingModule,
  EngineInitStatus,
  AcademyEngineType,
  Greeks,
  NiftyConstituentItem,
  defaultNiftyConstituents,
} from '@/lib/academy/academyData';
import {
  SimulationEngineInteractiveContent,
  NiftyDynamicsInteractiveContent,
  BehavioralBiasInteractiveContent,
  RiskDisciplineInteractiveContent,
  GeneralModuleInteractiveContent,
} from './ModuleInteractiveEngines';

interface ModuleDetailModalProps {
  module: TrainingModule;
  onClose: () => void;
  onAskMentor: (q: string) => void;
}

export function ModuleDetailModal({
  module,
  onClose,
  onAskMentor,
}: ModuleDetailModalProps) {
  const [initStatus, setInitStatus] = useState<EngineInitStatus>(EngineInitStatus.IDLE);
  const [initProgress, setInitProgress] = useState(0);
  const [initMessage, setInitMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'CURRICULUM' | 'ENGINE'>('CURRICULUM');

  // Engine states
  // 1. Simulation Engine State
  const [simPnl, setSimPnl] = useState(12450.0);
  const [simStep, setSimStep] = useState(1);
  const [simMessage, setSimMessage] = useState('NIFTY 50 Expiry Day Gamma Squeeze Replay. Position: Bull Call Spread 23800/23950 CE.');
  const [simSpot, setSimSpot] = useState(23824.50);
  const [simGreeks, setSimGreeks] = useState<Greeks>({ delta: 0.28, gamma: 0.014, theta: -380.0, vega: 240.0 });
  const [simHistory, setSimHistory] = useState<string[]>([
    'Scenario mounted: Spot ₹23,824.50. Position: Bull Call Spread 23800/23950 CE.',
  ]);

  // 2. NIFTY 50 Dynamics Engine State
  const [constituents, setConstituents] = useState<NiftyConstituentItem[]>(defaultNiftyConstituents());
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [projectedMove, setProjectedMove] = useState(0.0);

  // 3. Behavioral Bias State
  const [disciplineScore, setDisciplineScore] = useState(88);
  const [emotionShield, setEmotionShield] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [neutralizedBiases, setNeutralizedBiases] = useState<string[]>([]);

  // 4. Risk Discipline State
  const [capital, setCapital] = useState(500000);
  const [riskPct, setRiskPct] = useState(1.0);
  const [entry, setEntry] = useState(23800);
  const [stopLoss, setStopLoss] = useState(23720);
  const [drawdown, setDrawdown] = useState(0.0);
  const [circuitBreakerHalted, setCircuitBreakerHalted] = useState(false);

  const startInitialization = () => {
    setInitStatus(EngineInitStatus.INITIALIZING);
    setInitProgress(0.15);
    setInitMessage(`Bootstrapping ${module.title} runtime...`);

    const stages = [
      { p: 0.35, msg: 'Querying order book telemetry & constituent weights...' },
      { p: 0.65, msg: 'Calibrating delta-neutral risk & smart money pools...' },
      { p: 0.85, msg: 'Mounting institutional Greeks & behavioral matrix...' },
      { p: 1.0, msg: `${module.title} Online & Ready.` },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < stages.length) {
        setInitProgress(stages[idx].p);
        setInitMessage(stages[idx].msg);
        idx++;
      } else {
        clearInterval(interval);
        setInitStatus(EngineInitStatus.READY);
        setActiveTab('ENGINE');
      }
    }, 180);
  };

  // Actions for Simulation Engine
  const handleSimAction = (action: string) => {
    if (action === 'HEDGE') {
      const newPnl = simPnl + 1850;
      setSimPnl(newPnl);
      setSimStep(prev => Math.min(prev + 1, 4));
      setSimGreeks(prev => ({
        ...prev,
        delta: Math.max(prev.delta * 0.36, 0.05),
        gamma: prev.gamma * 0.5,
      }));
      setSimMessage(`Protective Put Leg deployed. Gamma risk reduced by 64%. P&L: +₹${newPnl.toLocaleString()}.`);
      setSimHistory(prev => [...prev, `Step ${simStep}: Protective Put Hedge Deployed (+₹1,850)`]);
    } else if (action === 'ROLL') {
      const newPnl = simPnl + 3200;
      setSimPnl(newPnl);
      setSimStep(prev => Math.min(prev + 1, 4));
      setSimMessage(`Strikes rolled to 23,900 CE. Profit locked at ₹${newPnl.toLocaleString()}.`);
      setSimHistory(prev => [...prev, `Step ${simStep}: Strikes Rolled to 23900 CE (+₹3,200)`]);
    } else if (action === 'SQUARE') {
      setSimStep(4);
      setSimMessage(`Position squared off. Discipline Score: 96/100 · Return on Capital: +21.4% · Final P&L: +₹${simPnl.toLocaleString()}.`);
      setSimHistory(prev => [...prev, `Final: Position Squared Off (+₹${simPnl.toLocaleString()})`]);
    } else if (action === 'RESET') {
      setSimStep(1);
      setSimPnl(12450.0);
      setSimSpot(23824.50);
      setSimGreeks({ delta: 0.28, gamma: 0.014, theta: -380.0, vega: 240.0 });
      setSimMessage('Simulation scenario reset to tick 1.');
      setSimHistory(['Scenario reset: Spot ₹23,824.50. Position: Bull Call Spread 23800/23950 CE.']);
    } else {
      // Advance Tick
      const drift = Math.random() * 24 - 10;
      const newSpot = simSpot + drift;
      const newPnl = simPnl + drift * 35;
      setSimSpot(newSpot);
      setSimPnl(newPnl);
      setSimStep(prev => Math.min(prev + 1, 4));
      setSimMessage(`Advanced tick: Spot ₹${newSpot.toFixed(2)}. Volatility expansion detected.`);
      setSimHistory(prev => [...prev, `Tick advanced: Spot -> ₹${newSpot.toFixed(2)}`]);
    }
  };

  // Actions for NIFTY 50 Dynamics
  const handleToggleBias = (name: string) => {
    const updated = constituents.map(c =>
      c.name.toLowerCase() === name.toLowerCase()
        ? { ...c, isSimulatedBullish: !c.isSimulatedBullish }
        : c
    );
    setConstituents(updated);
    const netWeightDelta = updated.reduce(
      (sum, item) => sum + (item.isSimulatedBullish ? 1 : -1) * item.weight,
      0
    );
    setProjectedMove((netWeightDelta - 15.0) * 2.8);
  };

  // Actions for Behavioral Bias
  const handleNeutralizeBias = (biasKey: string) => {
    if (!neutralizedBiases.includes(biasKey)) {
      setNeutralizedBiases(prev => [...prev, biasKey]);
      setDisciplineScore(prev => Math.min(prev + 3, 100));
    }
  };

  // Actions for Risk Discipline
  const handleSimulateLoss = () => {
    const newDrawdown = Math.min(drawdown + 1.1, 10.0);
    setDrawdown(newDrawdown);
    if (newDrawdown >= 3.0) {
      setCircuitBreakerHalted(true);
    }
  };

  const handleResetHalt = () => {
    setDrawdown(0.0);
    setCircuitBreakerHalted(false);
  };

  const engineType = module.engineType ?? AcademyEngineType.GENERAL;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl border-2 terminal-page-panel bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="mono text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                INSTITUTIONAL RUNTIME MODULE
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                {module.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--theme-card-border)] hover:bg-[var(--theme-card-bg)] text-sm cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Strip: Curriculum vs Interactive Engine */}
        <div className="px-5 pt-3 border-b border-[var(--theme-card-border)] flex items-center justify-between font-mono text-[12px] font-bold">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('CURRICULUM')}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'CURRICULUM'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              Curriculum Overview
            </button>
            <button
              type="button"
              onClick={() => {
                if (initStatus !== EngineInitStatus.READY) {
                  startInitialization();
                }
                setActiveTab('ENGINE');
              }}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ENGINE'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span>Interactive Engine</span>
              {initStatus === EngineInitStatus.READY && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          <div className="hidden sm:block text-[11px] opacity-60">
            Duration: {module.duration}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'CURRICULUM' ? (
            <div className="space-y-4 font-sans">
              <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
                <h4 className="mono text-[11px] font-black uppercase text-emerald-400 mb-1">
                  Module Summary
                </h4>
                <p className="text-sm opacity-90 leading-relaxed">
                  {module.description ?? 'Institutional learning framework covering advanced execution, market microstructure, and quantitative discipline.'}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] space-y-2">
                <h4 className="mono text-[11px] font-black uppercase text-emerald-400">
                  Key Topics & Studies
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mono text-xs">
                  {module.topics.map(topic => (
                    <div
                      key={topic}
                      className="p-2.5 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex items-center gap-2"
                    >
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engine Initialization Trigger */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mono text-xs font-black uppercase text-emerald-400">
                    Live Telemetry Ready
                  </div>
                  <div className="text-xs opacity-80 mt-0.5">
                    Launch the interactive simulation environment to test execution and risk metrics.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    startInitialization();
                    setActiveTab('ENGINE');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 mono text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  🚀 Initialize Engine Now
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* If Initializing */}
              {initStatus === EngineInitStatus.INITIALIZING && (
                <div className="p-8 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-center space-y-4">
                  <div className="mono text-xs font-black uppercase tracking-wider text-emerald-400 animate-pulse">
                    {initMessage}
                  </div>
                  <div className="w-full bg-[var(--theme-card-bg)] h-3 rounded-full overflow-hidden border border-[var(--theme-card-border)]">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${initProgress * 100}%` }}
                    />
                  </div>
                  <div className="mono text-xs opacity-60">
                    Calibrating execution feeds · {Math.round(initProgress * 100)}%
                  </div>
                </div>
              )}

              {/* If Idle (not started yet) */}
              {initStatus === EngineInitStatus.IDLE && (
                <div className="p-8 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-center space-y-3">
                  <div className="mono text-sm font-black uppercase text-emerald-400">
                    Engine Runtime Standby
                  </div>
                  <p className="text-xs opacity-70 max-w-md mx-auto">
                    Mount the simulation runtime to interact with real-time order flow and risk controls.
                  </p>
                  <button
                    type="button"
                    onClick={startInitialization}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 mono text-xs font-black cursor-pointer shadow-xs"
                  >
                    Start Initialization
                  </button>
                </div>
              )}

              {/* If Ready: Mount Selected Engine Component */}
              {initStatus === EngineInitStatus.READY && (
                <div>
                  {engineType === AcademyEngineType.INSTITUTIONAL_SIMULATION && (
                    <SimulationEngineInteractiveContent
                      simulationPnl={simPnl}
                      simulationStep={simStep}
                      simulationMessage={simMessage}
                      simGreeks={simGreeks}
                      simSpot={simSpot}
                      simHistory={simHistory}
                      onSimAction={handleSimAction}
                    />
                  )}

                  {engineType === AcademyEngineType.NIFTY_50_DYNAMICS && (
                    <NiftyDynamicsInteractiveContent
                      constituents={constituents}
                      sectorFilter={sectorFilter}
                      projectedMove={projectedMove}
                      onSectorFilter={setSectorFilter}
                      onToggleBias={handleToggleBias}
                    />
                  )}

                  {engineType === AcademyEngineType.BEHAVIORAL_BIAS && (
                    <BehavioralBiasInteractiveContent
                      disciplineScore={disciplineScore}
                      emotionShield={emotionShield}
                      cooldownSeconds={cooldownSeconds}
                      neutralizedBiases={neutralizedBiases}
                      onToggleEmotionShield={() => setEmotionShield(!emotionShield)}
                      onNeutralizeBias={handleNeutralizeBias}
                      onActivateCooldown={() => setCooldownSeconds(1200)}
                    />
                  )}

                  {engineType === AcademyEngineType.RISK_DISCIPLINE && (
                    <RiskDisciplineInteractiveContent
                      capital={capital}
                      riskPct={riskPct}
                      entry={entry}
                      stopLoss={stopLoss}
                      drawdown={drawdown}
                      circuitBreakerHalted={circuitBreakerHalted}
                      onUpdateRisk={(c, r, e, s) => {
                        setCapital(c);
                        setRiskPct(r);
                        setEntry(e);
                        setStopLoss(s);
                      }}
                      onSimulateLoss={handleSimulateLoss}
                      onResetHalt={handleResetHalt}
                    />
                  )}

                  {engineType === AcademyEngineType.GENERAL && (
                    <GeneralModuleInteractiveContent
                      module={module}
                      onAskMentor={onAskMentor}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
