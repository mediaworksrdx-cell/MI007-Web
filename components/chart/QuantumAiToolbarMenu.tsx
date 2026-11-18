// ═══════════════════════════════════════════════════════════════════════════
// QUANTUM AI — SMC & RESONANCE TOOLBAR MENU (SIMPLE 12-ITEM UNIFIED MENU)
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import {
  QuantumAiConfig,
  DEFAULT_QUANTUM_AI_CONFIG,
  QuantumAiAnalysisResult,
} from '../../lib/quantumai/types';

interface QuantumAiToolbarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  config: QuantumAiConfig;
  onChangeConfig: (updates: Partial<QuantumAiConfig>) => void;
  analysis?: QuantumAiAnalysisResult;
}

export function QuantumAiToolbarMenu({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  analysis,
}: QuantumAiToolbarMenuProps) {
  if (!isOpen) return null;

  const activeObs = analysis ? analysis.orderBlocks.filter((o) => !o.isInvalidated).length : 0;
  const breakCount = analysis ? analysis.structures.length : 0;
  const sweepCount = analysis ? analysis.liquidityPools.filter((l) => l.isSwept).length : 0;
  const setupCount = analysis ? analysis.setups.length : 0;
  const zoneLabel = analysis?.dealingRange.currentZone || 'EQ';
  const adxLabel = analysis ? `ADX ${analysis.trend.adx.toFixed(1)}` : 'EMA 20';
  const squeezeLabel = analysis
    ? analysis.volatility.isSqueeze
      ? `SQUEEZE (${analysis.volatility.squeezeLength}b)`
      : analysis.momentum.isPositive
        ? 'MOM ▲'
        : 'MOM ▼'
    : 'BB / KC';
  const resLabel = analysis ? `${analysis.resonance.resonancePct}%` : 'MTF';
  const confLabel = analysis
    ? `${Math.max(analysis.confluence.bullScore, analysis.confluence.bearScore)}/${analysis.confluence.maxScore}`
    : `${config.confluenceThreshold}/9.5`;
  const btLabel = analysis
    ? `${analysis.backtest.winRate}% (${analysis.backtest.totalTrades}T · ${analysis.backtest.averageR}R)`
    : '1.5R BE';

  return (
    <div
      className="absolute top-full left-0 mt-1 w-88 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-2xl z-[100] max-h-[min(560px,calc(100vh-120px))] flex flex-col animate-in fade-in duration-75 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── 1. Header ── */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">
            Q-AI
          </span>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Quantum AI (12 Modules)</div>
            <div className="text-[9px] text-purple-600 dark:text-purple-400 font-mono font-medium">
              Simple Unified Strategy Menu
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close Quantum AI menu"
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer font-bold text-sm"
        >
          ✕
        </button>
      </div>

      {/* ── 2. Master Switch & Simple Presets ── */}
      <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/30 shrink-0">
        <div
          onClick={() => onChangeConfig({ enabled: !config.enabled })}
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeConfig({ enabled: !config.enabled });
            }}
            className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              config.enabled ? 'bg-purple-600 dark:bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-3.5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Enable Quantum AI</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onChangeConfig({
                enabled: true,
                showDashboard: true,
                showStructure: true,
                showOrderBlocks: true,
                showLiquidity: true,
                showDealingRange: true,
                showEma20: true,
                showSignals: true,
                showExecutionLevels: true,
                enableBreakEven: true,
              })
            }
            className="px-2 py-0.5 text-[10px] font-semibold rounded border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-100 cursor-pointer"
          >
            All On
          </button>
          <button
            type="button"
            onClick={() => onChangeConfig(DEFAULT_QUANTUM_AI_CONFIG)}
            className="px-2 py-0.5 text-[10px] font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── 3. Simple 12-Module List in One Menu ── */}
      <div className={`p-2.5 space-y-1 min-h-0 overflow-y-auto text-xs flex-1 ${!config.enabled ? 'opacity-50' : ''}`}>
        <ToggleRow
          num={1}
          label="SMC Overview Dashboard"
          sublabel="Regime, zone & confluence HUD"
          badge={analysis?.dashboard.marketRegime || 'HUD'}
          checked={config.showDashboard}
          onChange={(v) => onChangeConfig({ enabled: true, showDashboard: v })}
        />
        <ToggleRow
          num={2}
          label="Market Structure (BOS & CHoCH)"
          sublabel="Confirmed swing breaks & shifts"
          badge={`${breakCount} breaks`}
          checked={config.showStructure}
          onChange={(v) => onChangeConfig({ enabled: true, showStructure: v })}
        />
        <ToggleRow
          num={3}
          label="Order Blocks (Supply & Demand)"
          sublabel="Structure-linked impulse zones"
          badge={`${activeObs} active`}
          checked={config.showOrderBlocks}
          onChange={(v) => onChangeConfig({ enabled: true, showOrderBlocks: v })}
        />
        <ToggleRow
          num={4}
          label="Liquidity Pools & Sweeps"
          sublabel="BSL / SSL pools & rejection sweeps"
          badge={`${sweepCount} swept`}
          checked={config.showLiquidity}
          onChange={(v) => onChangeConfig({ enabled: true, showLiquidity: v })}
        />
        <ToggleRow
          num={5}
          label="Premium / Discount / EQ Range"
          sublabel="40-bar dealing range & 50% equilibrium"
          badge={zoneLabel}
          checked={config.showDealingRange}
          onChange={(v) => onChangeConfig({ enabled: true, showDealingRange: v })}
        />
        <ToggleRow
          num={6}
          label="EMA 20 & ADX Trend Filter"
          sublabel="Dynamic trend baseline & strength"
          badge={adxLabel}
          checked={config.showEma20}
          onChange={(v) => onChangeConfig({ enabled: true, showEma20: v })}
        />
        <StatusRow
          num={7}
          label="Volatility Squeeze & Momentum"
          sublabel="Bollinger inside Keltner & LinReg slope"
          badge={squeezeLabel}
          positive={analysis?.momentum.isPositive}
        />
        <StatusRow
          num={8}
          label="Multi-Timeframe Resonance"
          sublabel={analysis?.resonance.htf.timeframe || 'HTF + Chart TF + Trigger alignment'}
          badge={`${resLabel} Match`}
          positive={(analysis?.resonance.resonancePct ?? 0) >= 60}
        />
        <StatusRow
          num={9}
          label="Confluence Scoring Engine"
          sublabel={`Bull ${analysis?.confluence.bullScore ?? 0} vs Bear ${analysis?.confluence.bearScore ?? 0} (min ${config.confluenceThreshold})`}
          badge={confLabel}
          positive={Boolean(analysis?.confluence.isLongQualified || analysis?.confluence.isShortQualified)}
        />
        <ToggleRow
          num={10}
          label="Trading Signal Badges"
          sublabel="Confluence-qualified Long / Short markers"
          badge={`${setupCount} setups`}
          checked={config.showSignals}
          onChange={(v) => onChangeConfig({ enabled: true, showSignals: v })}
        />
        <ToggleRow
          num={11}
          label="Entry / SL / TP Execution Levels"
          sublabel={`TP1 ${config.riskReward1}R · TP2 ${config.riskReward2}R · TP3 ${config.riskReward3}R`}
          badge="1.5/2.5/4R"
          checked={config.showExecutionLevels}
          onChange={(v) => onChangeConfig({ enabled: true, showExecutionLevels: v })}
        />
        <ToggleRow
          num={12}
          label="Break-Even & Backtest Engine"
          sublabel="Auto SL-to-Entry on TP1 & walk-forward stats"
          badge={btLabel}
          checked={config.enableBreakEven}
          onChange={(v) => onChangeConfig({ enabled: true, enableBreakEven: v })}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  num,
  label,
  sublabel,
  badge,
  checked,
  onChange,
}: {
  num: number;
  label: string;
  sublabel: string;
  badge?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <span className="w-4.5 h-4.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
          {num}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight truncate">
            {label}
          </div>
          <div className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight truncate">
            {sublabel}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {badge && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(!checked);
          }}
          className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer shrink-0 ${
            checked ? 'bg-purple-600 dark:bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
              checked ? 'translate-x-3' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function StatusRow({
  num,
  label,
  sublabel,
  badge,
  positive,
}: {
  num: number;
  label: string;
  sublabel: string;
  badge: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 select-none">
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <span className="w-4.5 h-4.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
          {num}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight truncate">
            {label}
          </div>
          <div className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight truncate">
            {sublabel}
          </div>
        </div>
      </div>
      <span
        className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
          positive
            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400'
        }`}
      >
        {badge}
      </span>
    </div>
  );
}
