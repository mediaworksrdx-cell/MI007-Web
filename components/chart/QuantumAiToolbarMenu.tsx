// ═══════════════════════════════════════════════════════════════════════════
// QUANTUM AI — SMC & RESONANCE TOOLBAR MENU
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import {
  QuantumAiConfig,
  QuantumAiSubTab,
  DEFAULT_QUANTUM_AI_CONFIG,
  QuantumAiAnalysisResult,
} from '../../lib/quantumai/types';

interface QuantumAiToolbarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  config: QuantumAiConfig;
  onChangeConfig: (updates: Partial<QuantumAiConfig>) => void;
  onOpenModal: (subTab?: QuantumAiSubTab) => void;
  analysis?: QuantumAiAnalysisResult;
}

export function QuantumAiToolbarMenu({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onOpenModal,
  analysis,
}: QuantumAiToolbarMenuProps) {
  if (!isOpen) return null;

  const SUB_MODULES: { id: QuantumAiSubTab; label: string; icon: string; desc: string }[] = [
    { id: 'smc', label: 'SMC Analysis', icon: '🏛️', desc: 'Smart Money institutional flow & price zones' },
    { id: 'structure', label: 'Market Structure', icon: '📈', desc: 'BOS (Break of Structure) & CHoCH detection' },
    { id: 'orderblocks', label: 'Order Blocks', icon: '🧱', desc: 'Bullish & Bearish institutional supply/demand' },
    { id: 'liquidity', label: 'Liquidity Analysis', icon: '💧', desc: 'BSL / SSL pools and sweep rejections' },
    { id: 'premium-discount', label: 'Premium / Discount', icon: '⚖️', desc: '40-bar Dealing Range & Equilibrium (EQ)' },
    { id: 'volatility-momentum', label: 'Volatility & Momentum', icon: '⚡', desc: 'BB inside KC squeeze & LinReg momentum' },
    { id: 'resonance', label: 'Multi-Timeframe Resonance', icon: '🔄', desc: 'HTF, MTF & LTF cross-timeframe alignment' },
    { id: 'confluence', label: 'Confluence Engine', icon: '🎯', desc: 'Multi-factor weighted scoring (9.5 max, 7.0 th)' },
    { id: 'signals', label: 'Trading Signals', icon: '🔔', desc: 'Qualified Long / Short high-probability entries' },
    { id: 'risk-mgmt', label: 'Entry / SL / TP Management', icon: '🛡️', desc: '1:1.5, 1:2.5, 1:4.0 targets & Break-Even' },
    { id: 'backtesting', label: 'Strategy Backtesting', icon: '📊', desc: 'Historical trade analytics, win rate & expectancy' },
  ];

  return (
    <div
      className="absolute top-full left-0 mt-1 w-88 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-2xl z-[100] max-h-[580px] flex flex-col animate-in fade-in duration-75 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── 1. Header ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">
            Q-AI
          </span>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Quantum AI – SMC &amp; Resonance</div>
            <div className="text-[9px] text-purple-600 dark:text-purple-400 font-mono font-medium">Multi-Timeframe Quantitative Engine</div>
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

      {/* ── 2. Master Switch ── */}
      <div
        onClick={() => onChangeConfig({ enabled: !config.enabled })}
        className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-900/40 cursor-pointer select-none shrink-0"
      >
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">Enable Quantum AI Engine</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">Render SMC zones, resonance HUD &amp; execution levels</div>
        </div>
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
      </div>

      {/* ── 3. Quick Confluence & Resonance Status ── */}
      {analysis && (
        <div className="px-3.5 py-2 bg-purple-50/50 dark:bg-purple-950/20 border-b border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px] shrink-0 font-mono">
          <div>
            <div className="text-slate-400">Bull Score</div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">{analysis.confluence.bullScore} / 9.5</div>
          </div>
          <div>
            <div className="text-slate-400">Bear Score</div>
            <div className="font-bold text-rose-600 dark:text-rose-400">{analysis.confluence.bearScore} / 9.5</div>
          </div>
          <div>
            <div className="text-slate-400">Resonance</div>
            <div className="font-bold text-purple-600 dark:text-purple-400">{analysis.resonance.resonancePct}% Match</div>
          </div>
        </div>
      )}

      {/* ── 4. Scrollable 11 Sub-Modules & Display Toggles ── */}
      <div className="p-3.5 space-y-3.5 overflow-y-auto text-xs flex-1">
        {/* A. Sub-Module Jump List */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Strategy Architecture Modules</span>
            <span className="text-[9px] text-purple-600 dark:text-purple-400 font-mono">11 Sub-Systems</span>
          </div>

          <div className="space-y-1">
            {SUB_MODULES.map((sub) => (
              <div
                key={sub.id}
                onClick={() => {
                  onClose();
                  onOpenModal(sub.id);
                }}
                className="flex items-center justify-between p-1.5 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs">{sub.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                      {sub.label}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{sub.desc}</div>
                  </div>
                </div>
                <span className="text-slate-400 group-hover:text-purple-600 text-xs shrink-0 font-bold">→</span>
              </div>
            ))}
          </div>
        </div>

        {/* B. Core Display Toggles */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Canvas Overlay Elements
          </div>

          <ToggleRow
            label="Quantum AI Strategy Dashboard (HUD)"
            sublabel="Top-corner HUD with regime, vol, zone, ADX & score"
            checked={config.showDashboard}
            onChange={(v) => onChangeConfig({ showDashboard: v })}
          />
          <ToggleRow
            label="Institutional Order Blocks"
            sublabel="Demand & Supply zones with retest/invalidation"
            checked={config.showOrderBlocks}
            onChange={(v) => onChangeConfig({ showOrderBlocks: v })}
          />
          <ToggleRow
            label="Market Structure (BOS & CHoCH)"
            sublabel="Break of Structure and Change of Character lines"
            checked={config.showStructure}
            onChange={(v) => onChangeConfig({ showStructure: v })}
          />
          <ToggleRow
            label="Liquidity Pools & Sweeps"
            sublabel="Buy-Side & Sell-Side liquidity sweep triggers"
            checked={config.showLiquidity}
            onChange={(v) => onChangeConfig({ showLiquidity: v })}
          />
          <ToggleRow
            label="Premium / Discount / EQ Range"
            sublabel="40-bar Dealing Range with shaded valuation zones"
            checked={config.showDealingRange}
            onChange={(v) => onChangeConfig({ showDealingRange: v })}
          />
          <ToggleRow
            label="Trading Signal Badges"
            sublabel="Confluence-qualified Long and Short entry pills"
            checked={config.showSignals}
            onChange={(v) => onChangeConfig({ showSignals: v })}
          />
          <ToggleRow
            label="Automated Risk & Execution Levels"
            sublabel="Entry, SL, TP1 (1.5R), TP2 (2.5R), TP3 (4.0R)"
            checked={config.showExecutionLevels}
            onChange={(v) => onChangeConfig({ showExecutionLevels: v })}
          />
        </div>
      </div>

      {/* ── 5. Footer Quick Actions ── */}
      <div className="p-2.5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => onChangeConfig(DEFAULT_QUANTUM_AI_CONFIG)}
          className="text-[11px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          Reset Defaults
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenModal('backtesting');
          }}
          className="px-2.5 py-1 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono text-[11px] font-bold border border-purple-200 dark:border-purple-500/40 hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>⚡ Quantum Studio &amp; Backtest</span>
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  sublabel,
  checked,
  onChange,
}: {
  label: string;
  sublabel: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer select-none transition-colors"
    >
      <div className="min-w-0 pr-2">
        <div className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-tight">
          {label}
        </div>
        <div className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight truncate">
          {sublabel}
        </div>
      </div>
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
  );
}
