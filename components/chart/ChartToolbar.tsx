'use client';

import React from 'react';
import { Timeframe, IndicatorType } from '@/lib/types';
import type { ChartType } from '@/lib/types';
import { DrawingToolType } from '@/lib/drawingTypes';
import { ChartTemplate } from '@/lib/chartTemplates';

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '1m',  label: '1m (1 Min)' },
  { value: '5m',  label: '5m (5 Min)' },
  { value: '15m', label: '15m (15 Min)' },
  { value: '30m', label: '30m (30 Min)' },
  { value: '1H',  label: '1H (1 Hour)' },
  { value: '4H',  label: '4H (4 Hours)' },
  { value: '1D',  label: '1D (1 Day)' },
  { value: '1W',  label: '1W (1 Week)' },
  { value: '1M',  label: '1M (1 Month)' },
];

const CHART_TYPES: { value: ChartType; label: string; icon: string }[] = [
  { value: 'CANDLESTICK',   label: 'Candlestick', icon: '❚' },
  { value: 'HOLLOW_CANDLE', label: 'Hollow Candle', icon: '▯' },
  { value: 'LINE',          label: 'Line Chart', icon: '∿' },
  { value: 'AREA',          label: 'Area Mountain', icon: '▲' },
  { value: 'HEIKIN_ASHI',   label: 'Heikin-Ashi', icon: 'HA' },
];

const DRAWING_TOOLS: { value: DrawingToolType; label: string; icon: string }[] = [
  { value: 'NONE',                label: 'Cursor / Pan Mode', icon: '↖' },
  { value: 'TRENDLINE',           label: 'Trendline (2 clicks)', icon: '╱' },
  { value: 'RAY',                 label: 'Extended Ray (2 clicks)', icon: '⟶' },
  { value: 'HORIZONTAL',          label: 'Horizontal Line (1 click)', icon: '―' },
  { value: 'HORIZONTAL_RAY',      label: 'Horizontal Ray (1 click)', icon: '⭢' },
  { value: 'EXTENDED_LINE',       label: 'Extended Line (2 clicks)', icon: '⟷' },
  { value: 'VERTICAL_LINE',       label: 'Vertical Line (1 click)', icon: '│' },
  { value: 'CHANNEL',             label: 'Parallel Channel (3 clicks)', icon: '⫽' },
  { value: 'RECTANGLE',           label: 'Support / Resistance Box (2 clicks)', icon: '▭' },
  { value: 'CIRCLE',              label: 'Circle Marker (2 clicks)', icon: '○' },
  { value: 'FIBONACCI',           label: 'Fibonacci Retracement (2 clicks)', icon: '≡' },
  { value: 'FIBONACCI_EXTENSION', label: 'Fib Extension Targets (3 clicks)', icon: '⤢' },
  { value: 'RISK_REWARD_LONG',    label: 'Long Position Box (2 clicks)', icon: '▲' },
  { value: 'RISK_REWARD_SHORT',   label: 'Short Position Box (2 clicks)', icon: '▼' },
  { value: 'MEASURE',             label: 'Price & Bar Range (2 clicks)', icon: '↔' },
  { value: 'TEXT',                label: 'Text Annotation (1 click)', icon: 'T' },
  { value: 'CALLOUT',             label: 'Callout Arrow (2 clicks)', icon: '💬' },
  { value: 'BRUSH',               label: 'Freehand Pen (drag)', icon: '✎' },
];

interface ChartToolbarProps {
  timeframe: Timeframe;
  chartType: ChartType;
  activeDrawingTool: DrawingToolType;
  showVolume: boolean;
  showVolumePanel: boolean;
  showSmcOverlay: boolean;
  showVolumeProfile: boolean;
  activeIndicators: IndicatorType[];
  engineStatus?: string;
  isLiveFromEngine?: boolean;
  currency?: string;
  displayPrice?: number;
  displayChange?: number;
  displayChangePct?: number;
  templates: ChartTemplate[];
  activeTemplateId: string;
  saveStatus?: 'idle' | 'saved';
  onTimeframeChange: (tf: Timeframe) => void;
  onChartTypeChange: (type: ChartType) => void;
  onDrawingToolChange: (tool: DrawingToolType) => void;
  onClearDrawings: () => void;
  onUndoDrawing?: () => void;
  onToggleVolume: () => void;
  onToggleVolumePanel: () => void;
  onToggleSmcOverlay: () => void;
  onToggleVolumeProfile: () => void;
  onToggleIndicator: (type: IndicatorType) => void;
  onOpenIndicatorSettings?: (type: IndicatorType) => void;
  onSelectTemplate: (template: ChartTemplate) => void;
  onSaveToTemplate: (slotId: string) => void;
  onRenameTemplate: (slotId: string, newName: string) => void;
  onRemoveTemplate: (slotId: string) => void;
  onSaveChartLayout: () => void;
  onClearAllIndicators?: () => void;
  onOpenIndicatorsModal?: () => void;
  onExportSnapshot?: (mode: 'download' | 'clipboard') => void;
}

export function ChartToolbar({
  timeframe,
  chartType,
  activeDrawingTool,
  showVolume,
  showVolumePanel: _showVolumePanel,
  showSmcOverlay,
  showVolumeProfile,
  activeIndicators,
  engineStatus,
  isLiveFromEngine,
  currency = '₹',
  displayPrice,
  displayChange,
  displayChangePct,
  templates,
  activeTemplateId,
  saveStatus = 'idle',
  onTimeframeChange,
  onChartTypeChange,
  onDrawingToolChange,
  onClearDrawings,
  onUndoDrawing,
  onToggleVolume,
  onToggleVolumePanel: _onToggleVolumePanel,
  onToggleSmcOverlay,
  onToggleVolumeProfile,
  onSaveChartLayout,
  onClearAllIndicators,
  onOpenIndicatorsModal,
  onExportSnapshot,
  onSelectTemplate,
}: ChartToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-[#0B0F19] px-3 py-1.5 text-xs text-slate-200 shadow-md gap-2 relative z-30 select-none">
      {/* ── Left Controls: Timeframe, Chart Type, Indicators, Drawing, Overlays, Save & Templates ── */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {/* 1. Timeframe Selector Dropdown */}
        <select
          value={timeframe}
          onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
          className="h-7 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 hover:border-emerald-500 font-bold font-mono text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          title="Select Timeframe"
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf.value} value={tf.value} className="bg-slate-900 text-white py-1">
              {tf.label}
            </option>
          ))}
        </select>

        {/* 2. Chart Type Dropdown */}
        <select
          value={chartType}
          onChange={(e) => onChartTypeChange(e.target.value as ChartType)}
          className="h-7 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-100 hover:border-emerald-500 font-medium text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          title="Select Chart Style"
        >
          {CHART_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value} className="bg-slate-900 text-white py-1">
              {ct.icon} {ct.label}
            </option>
          ))}
        </select>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        {/* 3. Indicators Button */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              if (onOpenIndicatorsModal) onOpenIndicatorsModal();
            }}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg border font-medium text-xs transition-all cursor-pointer ${
              activeIndicators.length > 0
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold'
                : 'border-slate-700 hover:border-emerald-500/60 bg-slate-900 text-slate-200'
            }`}
            title="Open Technical Indicators Library"
          >
            <span className="font-mono font-black text-xs px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400">ƒx</span>
            <span>Indicators</span>
            {activeIndicators.length > 0 && (
              <span className="h-4 px-1.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                {activeIndicators.length}
              </span>
            )}
          </button>
          {activeIndicators.length > 0 && onClearAllIndicators && (
            <button
              type="button"
              onClick={onClearAllIndicators}
              title="Clear all active indicators"
              className="h-7 px-1.5 rounded-md border border-rose-500/30 hover:border-rose-500 bg-rose-500/10 text-rose-400 hover:text-rose-300 text-[11px] font-bold cursor-pointer transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        {/* 4. Normal Drawing Tools Dropdown */}
        <div className="flex items-center gap-1">
          <select
            value={activeDrawingTool}
            onChange={(e) => onDrawingToolChange(e.target.value as DrawingToolType)}
            className={`h-7 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer focus:outline-none transition-colors ${
              activeDrawingTool !== 'NONE'
                ? 'border-indigo-500 bg-indigo-500/25 text-indigo-300 font-bold'
                : 'border-slate-700 hover:border-indigo-500/60 bg-slate-900 text-slate-200'
            }`}
            title="Select Drawing Tool"
          >
            {DRAWING_TOOLS.map((dt) => (
              <option key={dt.value} value={dt.value} className="bg-slate-900 text-white py-1">
                {dt.icon} {dt.label}
              </option>
            ))}
          </select>

          {activeDrawingTool !== 'NONE' && (
            <button
              type="button"
              onClick={() => onDrawingToolChange('NONE')}
              title="Exit tool back to Cursor mode (Esc)"
              className="h-7 px-2 rounded-lg border border-slate-600 hover:border-slate-400 bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Esc
            </button>
          )}

          {onUndoDrawing && (
            <button
              type="button"
              onClick={onUndoDrawing}
              title="Undo Last Drawing (Ctrl+Z)"
              className="h-7 px-2 rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition-colors"
            >
              ↩
            </button>
          )}

          <button
            type="button"
            onClick={onClearDrawings}
            title="Clear all drawings on chart"
            className="h-7 px-2 rounded-lg border border-rose-500/40 hover:border-rose-500 bg-rose-500/10 text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
          >
            <span>🗑</span>
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        {/* 5. Optional Clean Overlays (SMC, VOL, VPVR) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSmcOverlay}
            title="Toggle Smart Money Concepts (Order Blocks & Equilibrium)"
            className={`h-7 px-2 rounded-md text-[11px] font-bold font-mono border transition-colors cursor-pointer ${
              showSmcOverlay
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            SMC
          </button>
          <button
            type="button"
            onClick={onToggleVolume}
            title="Toggle Volume Bars"
            className={`h-7 px-2 rounded-md text-[11px] font-bold font-mono border transition-colors cursor-pointer ${
              showVolume
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            VOL
          </button>
          <button
            type="button"
            onClick={onToggleVolumeProfile}
            title="Toggle Volume Profile Visible Range (VPVR)"
            className={`h-7 px-2 rounded-md text-[11px] font-bold font-mono border transition-colors cursor-pointer ${
              showVolumeProfile
                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            VPVR
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-0.5" />

        {/* 6. SAVE BUTTON */}
        <button
          type="button"
          onClick={onSaveChartLayout}
          title="Save current chart layout and settings"
          className={`h-7 px-3 rounded-lg border font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            saveStatus === 'saved'
              ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-black'
              : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
          }`}
        >
          <span>{saveStatus === 'saved' ? '✓' : '💾'}</span>
          <span>{saveStatus === 'saved' ? 'SAVED' : 'SAVE'}</span>
        </button>

        {/* 7. SNAPSHOT CAMERA TOOL */}
        {onExportSnapshot && (
          <button
            type="button"
            onClick={() => onExportSnapshot('download')}
            title="Download High-Resolution Chart Image"
            className="h-7 px-2.5 rounded-lg border border-slate-700 hover:border-emerald-500/60 bg-slate-900 text-slate-200 hover:text-emerald-400 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <span className="text-sm leading-none">📷</span>
            <span className="hidden md:inline">SNAPSHOT</span>
          </button>
        )}

        {/* 8. TEMPLATES NORMAL SELECTOR */}
        <div className="flex items-center gap-1">
          <select
            value={activeTemplateId}
            onChange={(e) => {
              const t = templates.find((tpl) => tpl.id === e.target.value);
              if (t) onSelectTemplate(t);
            }}
            className="h-7 px-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500 font-bold text-xs cursor-pointer focus:outline-none"
            title="Select Template Slot"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id} className="bg-slate-900 text-white py-1">
                📑 {tpl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Right Controls: Live Beacon & Quote ── */}
      <div className="flex items-center gap-2.5 shrink-0 ml-auto">
        {/* Beacon */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900/80 text-[11px] font-mono font-bold text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              engineStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>{engineStatus === 'connected' ? (isLiveFromEngine ? 'LIVE ENGINE' : 'CONNECTED') : 'RECONNECTING'}</span>
        </div>

        {/* Price Tracker */}
        {displayPrice !== undefined && displayPrice > 0 && (
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[14px] font-black text-slate-100">
              {currency}
              {displayPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {displayChange !== undefined && displayChangePct !== undefined && (
              <span
                className={`text-[12px] font-bold ${
                  displayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {displayChange >= 0 ? '+' : ''}
                {displayChange.toFixed(2)} ({displayChangePct >= 0 ? '+' : ''}
                {displayChangePct.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
