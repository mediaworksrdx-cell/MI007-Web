'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Timeframe, IndicatorType, INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES } from '@/lib/types';
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
  { value: 'VERTICAL_LINE',       label: 'Vertical Line (1 click)', icon: '│' },
  { value: 'CHANNEL',             label: 'Parallel Channel (3 clicks)', icon: '⫽' },
  { value: 'RECTANGLE',           label: 'Support/Resistance Box (2 clicks)', icon: '▭' },
  { value: 'FIBONACCI',           label: 'Fibonacci Retracement (2 clicks)', icon: '≡' },
  { value: 'FIBONACCI_EXTENSION', label: 'Fib Extension Targets (3 clicks)', icon: '⤢' },
  { value: 'MEASURE',             label: 'Price Range & Bars (2 clicks)', icon: '↔' },
  { value: 'TEXT',                label: 'Text Annotation (1 click)', icon: 'T' },
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
  timeframe, chartType, activeDrawingTool,
  showVolume, showVolumePanel: _showVolumePanel, showSmcOverlay, showVolumeProfile,
  activeIndicators,
  engineStatus, isLiveFromEngine, currency = '₹', displayPrice, displayChange, displayChangePct,
  templates, activeTemplateId, saveStatus = 'idle',
  onTimeframeChange, onChartTypeChange, onDrawingToolChange, onClearDrawings, onUndoDrawing,
  onToggleVolume, onToggleVolumePanel: _onToggleVolumePanel, onToggleSmcOverlay, onToggleVolumeProfile,
  onToggleIndicator, onOpenIndicatorSettings,
  onSelectTemplate, onSaveToTemplate, onRenameTemplate, onRemoveTemplate, onSaveChartLayout, onClearAllIndicators,
  onOpenIndicatorsModal,
  onExportSnapshot,
}: ChartToolbarProps) {
  const [openMenu, setOpenMenu] = useState<'TF' | 'CANDLES' | 'INDICATORS' | 'DRAWING' | 'TEMPLATES' | null>(null);
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [renamingSlotId, setRenamingSlotId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setRenamingSlotId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentChartTypeMeta = CHART_TYPES.find(c => c.value === chartType) || CHART_TYPES[0];
  const currentDrawingMeta = DRAWING_TOOLS.find(d => d.value === activeDrawingTool) || DRAWING_TOOLS[0];
  const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0];
  const isActiveInd = (t: IndicatorType) => activeIndicators.includes(t);

  const filteredOverlays = OVERLAY_TYPES.filter(t =>
    INDICATOR_DEFAULTS[t].label.toLowerCase().includes(indicatorSearch.toLowerCase())
  );
  const filteredPanels = PANEL_TYPES.filter(t =>
    INDICATOR_DEFAULTS[t].label.toLowerCase().includes(indicatorSearch.toLowerCase())
  );

  const handleStartRename = (tpl: ChartTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSlotId(tpl.id);
    setRenamingValue(tpl.name);
  };

  const handleConfirmRename = (tplId: string, e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (renamingValue.trim()) {
      onRenameTemplate(tplId, renamingValue.trim());
    }
    setRenamingSlotId(null);
  };

  return (
    <div
      ref={menuRef}
      className="flex items-center justify-between border-b border-[var(--theme-page-border)] bg-[var(--theme-card-bg)] px-3 py-1.5 text-xs text-[var(--theme-page-text)] shadow-xs flex-wrap gap-2 relative z-30 select-none"
    >
      {/* ── Left Controls: Timeframe, Chart Type, Indicators, Drawing, Overlays, Save & Templates ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* 1. Timeframe Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'TF' ? null : 'TF')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-bold font-mono transition-all ${
              openMenu === 'TF'
                ? 'border-emerald-600 bg-emerald-500/15 text-emerald-400'
                : 'border-[var(--theme-page-border)] hover:border-emerald-500/50 bg-[var(--theme-card-surface)] text-[var(--theme-page-text)]'
            }`}
          >
            <span>{timeframe}</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {openMenu === 'TF' && (
            <div className="absolute top-full left-0 mt-1 w-36 rounded-xl border border-[var(--theme-page-border)] bg-[var(--theme-card-bg)] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[var(--theme-page-border)]/50">
                Timeframe
              </div>
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => {
                    onTimeframeChange(tf.value);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-1.5 text-left text-xs font-mono font-medium transition-colors ${
                    timeframe === tf.value
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                      : 'text-[var(--theme-page-text)] hover:bg-emerald-500/10'
                  }`}
                >
                  <span>{tf.label}</span>
                  {timeframe === tf.value && <span className="text-emerald-400 font-bold">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Chart Type Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'CANDLES' ? null : 'CANDLES')}
            title="Chart Type Style"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
              openMenu === 'CANDLES'
                ? 'border-emerald-600 bg-emerald-500/15 text-emerald-400'
                : 'border-[var(--theme-page-border)] hover:border-emerald-500/50 bg-[var(--theme-card-surface)] text-[var(--theme-page-text)]'
            }`}
          >
            <span className="font-mono text-sm leading-none">{currentChartTypeMeta.icon}</span>
            <span className="hidden sm:inline font-bold">{currentChartTypeMeta.label}</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {openMenu === 'CANDLES' && (
            <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-[var(--theme-page-border)] bg-[var(--theme-card-bg)] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[var(--theme-page-border)]/50">
                Chart Style
              </div>
              {CHART_TYPES.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => {
                    onChartTypeChange(ct.value);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    chartType === ct.value
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                      : 'text-[var(--theme-page-text)] hover:bg-emerald-500/10'
                  }`}
                >
                  <span className="font-mono text-sm w-4 text-center">{ct.icon}</span>
                  <span className="flex-1">{ct.label}</span>
                  {chartType === ct.value && <span className="text-emerald-400 text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-[var(--theme-page-border)] mx-0.5" />

        {/* 3. Indicators Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => {
              if (onOpenIndicatorsModal) {
                onOpenIndicatorsModal();
              } else {
                setOpenMenu(openMenu === 'INDICATORS' ? null : 'INDICATORS');
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
              openMenu === 'INDICATORS' || activeIndicators.length > 0
                ? 'border-emerald-600 bg-emerald-500/15 text-emerald-400'
                : 'border-[var(--theme-page-border)] hover:border-emerald-500/50 bg-[var(--theme-card-surface)] text-[var(--theme-page-text)]'
            }`}
          >
            <span className="font-mono font-black text-xs px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400">ƒx</span>
            <span className="font-bold">Indicators</span>
            {activeIndicators.length > 0 && (
              <span className="h-4 px-1.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                {activeIndicators.length}
              </span>
            )}
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {openMenu === 'INDICATORS' && (
            <div className="absolute top-full left-0 mt-1.5 w-72 rounded-xl border border-[var(--theme-page-border)] bg-[var(--theme-card-bg)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 max-h-96 flex flex-col overflow-hidden">
              {/* Quick Launch Full Library */}
              {onOpenIndicatorsModal && (
                <div className="p-2 border-b border-[var(--theme-page-border)] bg-emerald-500/10">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onOpenIndicatorsModal();
                    }}
                    className="w-full py-1 px-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>ƒx</span>
                    <span>Browse All 22 Indicators...</span>
                  </button>
                </div>
              )}

              {/* Search */}
              <div className="p-2 border-b border-[var(--theme-page-border)] bg-[var(--theme-card-surface)]">
                <input
                  type="text"
                  placeholder="Search indicators..."
                  value={indicatorSearch}
                  onChange={e => setIndicatorSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--theme-page-border)] bg-[var(--theme-card-bg)] text-xs text-[var(--theme-page-text)] placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Scrollable list */}
              <div className="overflow-y-auto p-2 space-y-3">
                {/* Overlays */}
                {filteredOverlays.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                      Main Chart Overlays
                    </div>
                    <div className="space-y-0.5">
                      {filteredOverlays.map(t => {
                        const active = isActiveInd(t);
                        return (
                          <div
                            key={t}
                            className={`flex items-center justify-between px-2 py-1 rounded-lg transition-colors ${
                              active ? 'bg-emerald-500/15 text-emerald-400 font-bold' : 'hover:bg-slate-500/10 text-[var(--theme-page-text)]'
                            }`}
                          >
                            <button
                              onClick={() => onToggleIndicator(t)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: INDICATOR_DEFAULTS[t].color }}
                              />
                              <span className="text-xs">{INDICATOR_DEFAULTS[t].label}</span>
                            </button>
                            <div className="flex items-center gap-1">
                              {active && onOpenIndicatorSettings && (
                                <button
                                  onClick={() => {
                                    onOpenIndicatorSettings(t);
                                    setOpenMenu(null);
                                  }}
                                  title="Settings"
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-200 hover:bg-slate-500/20"
                                >
                                  ⚙
                                </button>
                              )}
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => onToggleIndicator(t)}
                                className="rounded text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Panels */}
                {filteredPanels.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">
                      Sub-Chart Panels
                    </div>
                    <div className="space-y-0.5">
                      {filteredPanels.map(t => {
                        const active = isActiveInd(t);
                        return (
                          <div
                            key={t}
                            className={`flex items-center justify-between px-2 py-1 rounded-lg transition-colors ${
                              active ? 'bg-emerald-500/15 text-emerald-400 font-bold' : 'hover:bg-slate-500/10 text-[var(--theme-page-text)]'
                            }`}
                          >
                            <button
                              onClick={() => onToggleIndicator(t)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: INDICATOR_DEFAULTS[t].color }}
                              />
                              <span className="text-xs">{INDICATOR_DEFAULTS[t].label}</span>
                            </button>
                            <div className="flex items-center gap-1">
                              {active && onOpenIndicatorSettings && (
                                <button
                                  onClick={() => {
                                    onOpenIndicatorSettings(t);
                                    setOpenMenu(null);
                                  }}
                                  title="Settings"
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-200 hover:bg-slate-500/20"
                                >
                                  ⚙
                                </button>
                              )}
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => onToggleIndicator(t)}
                                className="rounded text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {activeIndicators.length > 0 && onClearAllIndicators && (
                <div className="p-2 border-t border-[var(--theme-page-border)] bg-[var(--theme-card-surface)]">
                  <button
                    onClick={() => {
                      onClearAllIndicators();
                      setOpenMenu(null);
                    }}
                    className="w-full py-1 text-center font-bold text-xs text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                  >
                    Clear All Indicators
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Drawing Tools Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'DRAWING' ? null : 'DRAWING')}
            title="Drawing Tools"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
              activeDrawingTool !== 'NONE'
                ? 'border-indigo-600 bg-indigo-500/15 text-indigo-400'
                : 'border-[var(--theme-page-border)] hover:border-emerald-500/50 bg-[var(--theme-card-surface)] text-[var(--theme-page-text)]'
            }`}
          >
            <span className="font-mono text-sm leading-none">{currentDrawingMeta.icon}</span>
            <span className="hidden md:inline font-bold">
              {activeDrawingTool === 'NONE' ? 'Draw Tools' : currentDrawingMeta.label.split(' ')[0]}
            </span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {openMenu === 'DRAWING' && (
            <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-[var(--theme-page-border)] bg-[var(--theme-card-bg)] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-96 overflow-y-auto">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[var(--theme-page-border)]/50">
                Drawing Tools
              </div>
              {DRAWING_TOOLS.map(d => (
                <button
                  key={d.value}
                  onClick={() => {
                    onDrawingToolChange(d.value);
                    setOpenMenu(null);
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    activeDrawingTool === d.value
                      ? 'bg-indigo-500/15 text-indigo-400 font-bold'
                      : 'text-[var(--theme-page-text)] hover:bg-indigo-500/10'
                  }`}
                >
                  <span className="font-mono text-sm w-4 text-center">{d.icon}</span>
                  <span className="flex-1">{d.label}</span>
                  {activeDrawingTool === d.value && <span className="text-indigo-400 text-xs">✓</span>}
                </button>
              ))}
              <div className="h-px bg-[var(--theme-page-border)] my-1" />
              {onUndoDrawing && (
                <button
                  onClick={() => onUndoDrawing()}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs text-[var(--theme-page-text)] hover:bg-slate-500/10 transition-colors"
                >
                  <span>Undo Last Drawing (Ctrl+Z)</span>
                </button>
              )}
              <button
                onClick={() => {
                  onClearDrawings();
                  setOpenMenu(null);
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <span>Clear All Drawings</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-[var(--theme-page-border)] mx-0.5" />

        {/* 5. Optional Clean Overlays (SMC, VOL, VPVR) */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSmcOverlay}
            title="Toggle Smart Money Concepts (Order Blocks & Equilibrium)"
            className={`px-2 py-1 rounded-md text-[11px] font-bold mono border transition-colors cursor-pointer ${
              showSmcOverlay
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : 'border-[var(--theme-page-border)] text-slate-400 hover:border-slate-400'
            }`}
          >
            SMC
          </button>
          <button
            onClick={onToggleVolume}
            title="Toggle Volume Bars"
            className={`px-2 py-1 rounded-md text-[11px] font-bold mono border transition-colors cursor-pointer ${
              showVolume
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'border-[var(--theme-page-border)] text-slate-400 hover:border-slate-400'
            }`}
          >
            VOL
          </button>
          <button
            onClick={onToggleVolumeProfile}
            title="Toggle Volume Profile Visible Range (VPVR)"
            className={`px-2 py-1 rounded-md text-[11px] font-bold mono border transition-colors cursor-pointer ${
              showVolumeProfile
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                : 'border-[var(--theme-page-border)] text-slate-400 hover:border-slate-400'
            }`}
          >
            VPVR
          </button>
        </div>

        <div className="h-4 w-px bg-[var(--theme-page-border)] mx-0.5" />

        {/* 6. SAVE BUTTON */}
        <button
          onClick={onSaveChartLayout}
          title="Save current chart layout, indicators, and template setup"
          className={`px-3 py-1.5 rounded-lg border font-bold text-xs mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
            saveStatus === 'saved'
              ? 'border-emerald-500 bg-emerald-500 text-slate-950 font-black'
              : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
          }`}
        >
          <span>{saveStatus === 'saved' ? '✓' : '💾'}</span>
          <span>{saveStatus === 'saved' ? 'SAVED' : 'SAVE'}</span>
        </button>

        {/* 6.5. SNAPSHOT CAMERA TOOL */}
        {onExportSnapshot && (
          <button
            type="button"
            onClick={() => onExportSnapshot('download')}
            title="Download High-Resolution Chart Image (Alt+S)"
            className="px-2.5 py-1.5 rounded-lg border border-[var(--theme-page-border)] hover:border-emerald-500/60 bg-[var(--theme-card-surface)] text-[var(--theme-page-text)] hover:text-emerald-400 font-bold text-xs mono flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <span className="text-sm leading-none">📷</span>
            <span className="hidden md:inline">SNAPSHOT</span>
          </button>
        )}

        {/* 7. TEMPLATES (5 SLOTS — NAME, RENAME, EDIT, REMOVE) */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'TEMPLATES' ? null : 'TEMPLATES')}
            title="5 Chart Templates — Name, Rename, Edit, or Remove"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-xs mono transition-all shadow-xs cursor-pointer ${
              openMenu === 'TEMPLATES'
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                : 'border-[var(--theme-page-border)] hover:border-emerald-500/60 bg-[var(--theme-card-surface)] text-[var(--theme-page-text)]'
            }`}
          >
            <span>📑</span>
            <span className="max-w-[120px] truncate">{activeTemplate?.name || 'Templates'}</span>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {openMenu === 'TEMPLATES' && (
            <div className="absolute top-full left-0 mt-1.5 w-80 sm:w-88 rounded-xl border border-[var(--theme-page-border)] bg-[var(--theme-card-bg)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-3.5 py-2.5 border-b border-[var(--theme-page-border)] bg-[var(--theme-card-surface)] flex items-center justify-between">
                <div>
                  <div className="mono text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                    Chart Templates (5 Slots)
                  </div>
                  <div className="text-[10.5px] text-[var(--theme-page-text)] opacity-70">
                    Apply, rename, edit with current chart, or remove
                  </div>
                </div>
                <button
                  onClick={onSaveChartLayout}
                  className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 mono text-[10px] font-bold hover:bg-emerald-500 hover:text-slate-950 transition-colors"
                  title="Save current state to active template"
                >
                  Save Active
                </button>
              </div>

              {/* 5 Template Slots */}
              <div className="p-2 space-y-1.5">
                {templates.slice(0, 5).map(tpl => {
                  const isActive = tpl.id === activeTemplateId;
                  const isRenaming = renamingSlotId === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      className={`p-2 rounded-xl border transition-all ${
                        isActive
                          ? 'border-emerald-500/60 bg-emerald-500/10 shadow-xs'
                          : 'border-[var(--theme-page-border)]/80 bg-[var(--theme-card-surface)] hover:border-slate-500'
                      }`}
                    >
                      {isRenaming ? (
                        <form
                          onSubmit={(e) => handleConfirmRename(tpl.id, e)}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={renamingValue}
                            onChange={(e) => setRenamingValue(e.target.value)}
                            className="flex-1 px-2 py-1 rounded-lg border border-emerald-500 bg-[var(--theme-card-bg)] mono text-xs text-[var(--theme-page-text)] font-bold focus:outline-none"
                            placeholder="Enter template name..."
                          />
                          <button
                            type="submit"
                            className="px-2 py-1 rounded bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400"
                            title="Save Name"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingSlotId(null)}
                            className="px-2 py-1 rounded bg-slate-700 text-slate-200 text-xs hover:bg-slate-600"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              onSelectTemplate(tpl);
                              setOpenMenu(null);
                            }}
                            className="flex items-center gap-2.5 text-left flex-1 min-w-0 group cursor-pointer"
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-black shrink-0 ${
                              isActive ? 'bg-emerald-500 text-slate-950' : 'bg-[var(--theme-card-bg)] border border-[var(--theme-page-border)] text-slate-400'
                            }`}>
                              {tpl.slotNumber}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`mono text-xs font-black truncate ${
                                  isActive ? 'text-emerald-400' : 'text-[var(--theme-page-text)] group-hover:text-emerald-400'
                                }`}>
                                  {tpl.name}
                                </span>
                                {isActive && (
                                  <span className="mono text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="mono text-[10px] text-slate-400 truncate">
                                {tpl.activeIndicators && tpl.activeIndicators.length > 0
                                  ? `${tpl.activeIndicators.join(', ')} · ${tpl.timeframe}`
                                  : `Clean Price Action · ${tpl.timeframe}`}
                              </div>
                            </div>
                          </button>

                          {/* Action Buttons: Save Current, Rename, Remove */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                onSaveToTemplate(tpl.id);
                                setOpenMenu(null);
                              }}
                              title="Update this template with current chart setup"
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 text-xs transition-colors cursor-pointer"
                            >
                              💾
                            </button>
                            <button
                              onClick={(e) => handleStartRename(tpl, e)}
                              title="Rename this template"
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 text-xs transition-colors cursor-pointer"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => onRemoveTemplate(tpl.id)}
                              title="Reset / remove this template"
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs transition-colors cursor-pointer"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Template Quick Actions */}
              <div className="p-2 border-t border-[var(--theme-page-border)] bg-[var(--theme-card-surface)] flex items-center justify-between text-[10.5px] mono">
                <span className="text-slate-400">Total: 5 Slots</span>
                {onClearAllIndicators && (
                  <button
                    onClick={() => {
                      onClearAllIndicators();
                      setOpenMenu(null);
                    }}
                    className="text-rose-400 hover:underline font-bold"
                  >
                    Clear All Indicators
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Controls: Live Beacon & Quote ── */}
      <div className="flex items-center gap-3">
        {/* Beacon */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-[var(--theme-page-border)] bg-[var(--theme-card-surface)] text-[11px] font-mono font-bold text-[var(--theme-page-text)]">
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
            <span className="text-[14px] font-black text-[var(--theme-page-text)]">
              {currency}
              {displayPrice.toLocaleString(undefined, {
                minimumFractionDigits: displayPrice < 10 ? 2 : 2,
                maximumFractionDigits: 2,
              })}
            </span>
            {displayChange !== undefined && displayChangePct !== undefined && (
              <span
                className={`text-[12px] font-bold ${
                  displayChange >= 0 ? 'text-emerald-500' : 'text-rose-500'
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
