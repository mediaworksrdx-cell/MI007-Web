// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE AI (MI-007) — ORDER FLOW FOOTPRINT TOOLBAR MENU
// ═══════════════════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import {
  OrderFlowConfig,
  FootprintViewMode,
  DEFAULT_ORDER_FLOW_CONFIG,
} from '../../lib/orderflow/types';

interface OrderFlowToolbarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  config: OrderFlowConfig;
  onChangeConfig: (updates: Partial<OrderFlowConfig>) => void;
  onOpenSignalsModal?: () => void;
  signalsCount?: number;
}

export function OrderFlowToolbarMenu({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onOpenSignalsModal,
  signalsCount = 0,
}: OrderFlowToolbarMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute top-full left-0 mt-1 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F19] shadow-2xl z-[100] max-h-[540px] flex flex-col animate-in fade-in duration-75 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── 1. Header ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
            OF
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Order Flow Footprint</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close Order Flow menu"
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
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">Enable Order Flow Footprint</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">Render Bid × Ask volume matrices inside candles</div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChangeConfig({ enabled: !config.enabled });
          }}
          className={`w-8 h-4.5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
            config.enabled ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-3.5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* ── 3. Data Integrity Indicator ── */}
      <div className="px-3.5 py-1.5 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
        <span className="text-slate-500 dark:text-slate-400 font-medium">Data Source:</span>
        <span
          className={`font-mono font-bold flex items-center gap-1 ${
            config.dataSource === 'VERIFIED_L2'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              config.dataSource === 'VERIFIED_L2' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          {config.dataSource === 'VERIFIED_L2' ? 'L2 Real-Time Trades' : 'OHLCV Estimated Footprint'}
        </span>
      </div>

      {/* ── 4. Scrollable Controls Body ── */}
      <div className="p-3.5 space-y-3.5 overflow-y-auto text-xs flex-1">
        {/* A. View Mode Selector */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Footprint View Mode
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                { id: 'BID_ASK', label: 'Bid × Ask' },
                { id: 'DELTA', label: 'Delta' },
                { id: 'PROFILE', label: 'Profile' },
                { id: 'HEATMAP', label: 'Heatmap' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => onChangeConfig({ viewMode: mode.id as FootprintViewMode })}
                className={`py-1 text-center font-mono text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                  config.viewMode === mode.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-black'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* B. Imbalance Parameters */}
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Diagonal Imbalance Filters
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-700 dark:text-slate-300">Imbalance Ratio:</span>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              {[2.5, 3.0, 4.0, 5.0].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onChangeConfig({ imbalanceRatio: ratio })}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    config.imbalanceRatio === ratio
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {ratio}×
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-700 dark:text-slate-300">Min Imbalance Volume:</span>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              {[5, 10, 25, 50].map((vol) => (
                <button
                  key={vol}
                  type="button"
                  onClick={() => onChangeConfig({ minImbalanceVolume: vol })}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    config.minImbalanceVolume === vol
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {vol}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* C. Cluster & Microstructure Toggles */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Display Elements
          </div>

          <ToggleRow
            label="Volume Point of Control (POC)"
            sublabel="Amber box around maximum volume price slice"
            checked={config.showPoc}
            onChange={(v) => onChangeConfig({ showPoc: v })}
          />
          <ToggleRow
            label="70% Value Area (VAH / VAL)"
            sublabel="Institutional fair value boundary shading"
            checked={config.showValueArea}
            onChange={(v) => onChangeConfig({ showValueArea: v })}
          />
          <ToggleRow
            label="Diagonal Imbalances"
            sublabel="Highlight aggressive buying & selling spikes"
            checked={config.showImbalances}
            onChange={(v) => onChangeConfig({ showImbalances: v })}
          />
          <ToggleRow
            label="Stacked Imbalance Zones"
            sublabel="3+ contiguous imbalances as order flow S/R"
            checked={config.showStackedImbalances}
            onChange={(v) => onChangeConfig({ showStackedImbalances: v, showOrderFlowZones: v })}
          />
          <ToggleRow
            label="Passive Absorption Detection"
            sublabel="Flag institutional absorption at candle extremes"
            checked={config.showAbsorption}
            onChange={(v) => onChangeConfig({ showAbsorption: v })}
          />
          <ToggleRow
            label="Delta Summary Footer"
            sublabel="Show Total Volume, Bar Delta & Min/Max Delta"
            checked={config.showDeltaSummary}
            onChange={(v) => onChangeConfig({ showDeltaSummary: v })}
          />
          <ToggleRow
            label="Institutional Signal Setups"
            sublabel="Display detected setups with Entry, SL, TP, R:R"
            checked={config.showSignals}
            onChange={(v) => onChangeConfig({ showSignals: v })}
          />
        </div>
      </div>

      {/* ── 5. Footer Quick Actions ── */}
      <div className="p-2.5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => onChangeConfig(DEFAULT_ORDER_FLOW_CONFIG)}
          className="text-[11px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          Reset Defaults
        </button>

        {config.showSignals && (
          <button
            type="button"
            onClick={onOpenSignalsModal}
            className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-bold border border-blue-200 dark:border-blue-500/40 hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>⚡ Setups</span>
            {signalsCount > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-blue-600 text-white text-[9px]">
                {signalsCount}
              </span>
            )}
          </button>
        )}
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
          checked ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
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
