'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { DrawingToolType } from '@/lib/drawingTypes';

export type CursorMode = 'crosshair' | 'pan' | 'dot' | 'arrow' | 'eraser';

export interface DrawingToolbarProps {
  activeDrawingTool: DrawingToolType;
  cursorMode?: CursorMode;
  onDrawingToolChange: (tool: DrawingToolType) => void;
  onCursorModeChange?: (mode: CursorMode) => void;
  onClearAllDrawings?: () => void;
  onClearDrawings?: () => void;
  onUndoDrawing?: () => void;
  onOpenDrawingsManager?: () => void;
  onOpenObjectsTree?: () => void;
  isMagnetActive?: boolean;
  onToggleMagnet?: () => void;
  isMagnifierActive?: boolean;
  onToggleMagnifier?: () => void;
  isDrawingModeLocked?: boolean;
  onToggleDrawingModeLock?: () => void;
  isAllDrawingsLocked?: boolean;
  onToggleLockAllDrawings?: () => void;
  isAllDrawingsHidden?: boolean;
  onToggleHideAllDrawings?: () => void;
  drawingsCount?: number;
  className?: string;
}

interface ToolItem {
  id: DrawingToolType;
  label: string;
  desc: string;
  icon: string;
}

interface ToolGroup {
  id: string;
  title: string;
  defaultTool: DrawingToolType;
  tools: ToolItem[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'lines',
    title: 'Lines & Rays',
    defaultTool: 'TRENDLINE',
    tools: [
      { id: 'TRENDLINE', label: 'Trendline', desc: '2 points: connect swings or trend', icon: '╱' },
      { id: 'RAY', label: 'Extended Ray', desc: 'Projects forward past 2nd point', icon: '⟶' },
      { id: 'INFO_LINE', label: 'Info Line', desc: 'Price delta, %, bar count & angle badges', icon: 'ⓘ' },
      { id: 'EXTENDED_LINE', label: 'Extended Line', desc: 'Projects infinitely in both directions', icon: '⟷' },
      { id: 'TREND_ANGLE', label: 'Trend Angle', desc: '2 points: angle in degrees from horizontal', icon: '∠' },
      { id: 'HORIZONTAL', label: 'Horizontal Line', desc: 'Full-width support/resistance level', icon: '―' },
      { id: 'HORIZONTAL_RAY', label: 'Horizontal Ray', desc: 'Starts at anchor and extends right', icon: '⭢' },
      { id: 'VERTICAL_LINE', label: 'Vertical Line', desc: 'Time-anchor vertical timeline bar', icon: '│' },
      { id: 'CROSS_LINE', label: 'Cross Line', desc: 'Crosshair intersection on chart', icon: '┼' },
      { id: 'CHANNEL', label: 'Parallel Channel', desc: '3 points: upper, lower rails & median', icon: '⫽' },
      { id: 'DISJOINT_CHANNEL', label: 'Disjoint Channel', desc: '3 points: non-parallel channel band', icon: '⫿' },
    ],
  },
  {
    id: 'fib',
    title: 'Fibonacci & Gann',
    defaultTool: 'FIBONACCI',
    tools: [
      { id: 'FIBONACCI', label: 'Fib Retracement', desc: '0.236, 0.382, 0.5, 0.618 golden pocket', icon: '≡' },
      { id: 'FIBONACCI_EXTENSION', label: 'Fib Extension', desc: '3 points: 1.0, 1.618, 2.618 targets', icon: '⤢' },
      { id: 'FIB_CHANNEL', label: 'Fib Channel', desc: '3 points: Fibonacci channel rails', icon: '⫸' },
      { id: 'FIB_TIME_ZONE', label: 'Fib Time Zone', desc: 'Vertical Fibonacci interval cycles', icon: '⏱' },
      { id: 'PIVOT_POINTS', label: 'Pivot Points', desc: '1 point: click anchor candle to plot Pivot (P), R1-R3, S1-S3 levels', icon: '☩' },
      { id: 'GANN_BOX', label: 'Gann Box', desc: '4x4 square grid with diagonal rays', icon: '⊞' },
      { id: 'GANN_FAN', label: 'Gann Fan', desc: '1x8 to 8x1 geometric Gann angles', icon: '◬' },
    ],
  },
  {
    id: 'shapes',
    title: 'Geometric Shapes',
    defaultTool: 'RECTANGLE',
    tools: [
      { id: 'RECTANGLE', label: 'Rectangle / Zone', desc: '2 points: draw supply/demand zones', icon: '▭' },
      { id: 'ROTATED_RECTANGLE', label: 'Rotated Rectangle', desc: '3 points: slanted zone box', icon: '▱' },
      { id: 'CIRCLE', label: 'Circle', desc: '2 points: radius marker for price action', icon: '○' },
      { id: 'ELLIPSE', label: 'Ellipse', desc: '3 points: oval highlight for reversals', icon: '⬯' },
      { id: 'TRIANGLE', label: 'Triangle', desc: '3 points: symmetrical, ascending, descending', icon: '△' },
      { id: 'POLYLINE', label: 'Polyline', desc: 'Multi-point path connecting key swings', icon: '☡' },
      { id: 'CURVE', label: 'Curve', desc: '3 points: smooth bezier arc', icon: '⌒' },
      { id: 'BRUSH', label: 'Brush', desc: 'Freehand drawing on canvas', icon: '✎' },
      { id: 'HIGHLIGHTER', label: 'Highlighter', desc: 'Semi-transparent wide stroke', icon: '🖍' },
    ],
  },
  {
    id: 'prediction',
    title: 'Risk & Forecasting',
    defaultTool: 'RISK_REWARD_LONG',
    tools: [
      { id: 'RISK_REWARD_LONG', label: 'Long Position', desc: 'Calculate target profit, stop loss & R:R ratio', icon: '📈' },
      { id: 'RISK_REWARD_SHORT', label: 'Short Position', desc: 'Calculate short profit, stop loss & R:R ratio', icon: '📉' },
      { id: 'PRICE_RANGE', label: 'Price Range', desc: 'Measure exact pip/cent change & percentage', icon: '↕' },
      { id: 'DATE_RANGE', label: 'Date Range', desc: 'Measure elapsed bars & duration', icon: '↔' },
      { id: 'MEASURE', label: 'Measure (Price & Time)', desc: 'Combined 2D box with price, time & bar count', icon: '📐' },
      { id: 'BARS_PATTERN', label: 'Bars Pattern', desc: 'Copy and reposition historical price sequence with scaling and measurements', icon: '𝄘' },
      { id: 'GHOST_FEED', label: 'Ghost Feed', desc: 'Manually draw hypothetical future candle scenarios (bullish/bearish path)', icon: '👻' },
    ],
  },
  {
    id: 'annotations',
    title: 'Text & Annotations',
    defaultTool: 'TEXT',
    tools: [
      { id: 'TEXT', label: 'Text Annotation', desc: 'Place customized text label on chart', icon: 'T' },
      { id: 'ANCHORED_TEXT', label: 'Anchored Text', desc: 'Text pinned to price level and coordinates', icon: '⚓' },
      { id: 'CALLOUT', label: 'Callout Arrow', desc: '2 points: arrow tip to wick + text bubble', icon: '💬' },
      { id: 'PRICE_LABEL', label: 'Price Label', desc: '1-click flag badge with exact price', icon: '🏷' },
      { id: 'ARROW_UP', label: 'Bullish Arrow Up', desc: 'Green upward marker on pivot low', icon: '↑' },
      { id: 'ARROW_DOWN', label: 'Bearish Arrow Down', desc: 'Red downward marker on pivot high', icon: '↓' },
      { id: 'FLAG', label: 'Flag Marker', desc: 'Signal flag marker pinned to candle', icon: '🚩' },
    ],
  },
];

export const CURSOR_OPTIONS: { id: CursorMode; label: string; desc: string; icon: string }[] = [
  { id: 'arrow', label: 'Arrow / Cursor', desc: 'Standard mouse pointer for selecting and moving drawings', icon: '↖' },
  { id: 'crosshair', label: 'Crosshair', desc: 'Precision coordinates with price & time badges', icon: '✛' },
  { id: 'pan', label: 'Pan / Hand', desc: 'Drag chart freely to scroll history & prices', icon: '✋' },
  { id: 'dot', label: 'Dot', desc: 'Minimalist point reticle with coordinates', icon: '•' },
  { id: 'eraser', label: 'Eraser', desc: 'Click any drawing on the chart to delete it', icon: '⌫' },
];

export function DrawingToolbar({
  activeDrawingTool,
  cursorMode = 'crosshair',
  onDrawingToolChange,
  onCursorModeChange,
  onClearAllDrawings,
  onClearDrawings,
  onUndoDrawing,
  onOpenDrawingsManager,
  onOpenObjectsTree,
  isMagnetActive = false,
  onToggleMagnet,
  isMagnifierActive = false,
  onToggleMagnifier,
  isDrawingModeLocked = false,
  onToggleDrawingModeLock,
  isAllDrawingsLocked = false,
  onToggleLockAllDrawings,
  isAllDrawingsHidden = false,
  onToggleHideAllDrawings,
  drawingsCount = 0,
  className = '',
}: DrawingToolbarProps) {
  const handleClear = onClearAllDrawings || onClearDrawings || (() => {});
  const handleOpenManager = onOpenDrawingsManager || onOpenObjectsTree;

  // Active flyout menu state and screen-space viewport anchor coordinates
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const [selectedToolsInGroup, setSelectedToolsInGroup] = useState<Record<string, DrawingToolType>>({
    lines: 'TRENDLINE',
    fib: 'FIBONACCI',
    shapes: 'RECTANGLE',
    prediction: 'RISK_REWARD_LONG',
    annotations: 'TEXT',
  });

  const toolbarRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);

  // Sync selected tool in group whenever an active tool is chosen externally
  useEffect(() => {
    if (activeDrawingTool === 'NONE') return;
    for (const group of TOOL_GROUPS) {
      if (group.tools.some((t) => t.id === activeDrawingTool)) {
        setSelectedToolsInGroup((prev) => {
          if (prev[group.id] === activeDrawingTool) return prev;
          return { ...prev, [group.id]: activeDrawingTool };
        });
        break;
      }
    }
  }, [activeDrawingTool]);

  // Open / toggle group menu and compute unclipped viewport positioning
  const openGroupMenu = useCallback((groupId: string, anchorEl: HTMLElement) => {
    if (openGroupId === groupId) {
      setOpenGroupId(null);
      setMenuPos(null);
      return;
    }

    const rect = anchorEl.getBoundingClientRect();
    // Position menu directly to the right of the toolbar button
    const left = Math.round(rect.right + 4);
    // Clamp top position so flyout remains safely within screen bounds
    const maxMenuHeight = 440;
    const clampedTop = Math.max(8, Math.min(window.innerHeight - maxMenuHeight, Math.round(rect.top - 6)));

    setMenuPos({ top: clampedTop, left });
    setOpenGroupId(groupId);
  }, [openGroupId]);

  // Close flyouts on click outside, Esc key, window resize, or fullscreen changes
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(target) &&
        flyoutRef.current &&
        !flyoutRef.current.contains(target)
      ) {
        setOpenGroupId(null);
        setMenuPos(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenGroupId(null);
        setMenuPos(null);
      }
    }

    function handleDismiss() {
      setOpenGroupId(null);
      setMenuPos(null);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleDismiss);
    document.addEventListener('fullscreenchange', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleDismiss);
      document.removeEventListener('fullscreenchange', handleDismiss);
    };
  }, []);

  const isCursorActive = activeDrawingTool === 'NONE';
  const openGroup = TOOL_GROUPS.find((g) => g.id === openGroupId);

  return (
    <>
      <div
        ref={toolbarRef}
        onScroll={() => {
          if (openGroupId) {
            setOpenGroupId(null);
            setMenuPos(null);
          }
        }}
        className={`relative z-30 flex flex-col items-center bg-white dark:bg-[#0B0F19] border-r border-slate-200 dark:border-slate-800 py-1.5 px-0.5 sm:px-1 select-none shadow-sm overflow-y-auto scrollbar-none max-h-full ${className}`}
        style={{ width: '42px' }}
      >
        {/* ── 1. Cursor / Arrow Mode (Standard Selection Cursor ↖) ── */}
        <button
          type="button"
          onClick={() => {
            onDrawingToolChange('NONE');
            onCursorModeChange?.('arrow');
            setOpenGroupId(null);
            setMenuPos(null);
          }}
          title="Cursor Tool (Arrow / Pointer) - Click to select, inspect or move drawings"
          aria-label="Cursor tool"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer mb-1 ${
            isCursorActive && cursorMode === 'arrow'
              ? 'bg-[#089981] text-white shadow-md font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
          </svg>
        </button>

        {/* ── 2. Crosshair Mode (Precision Reticle ✛) ── */}
        <div className="relative group w-8 h-8 mb-1">
          <button
            type="button"
            onClick={(e) => {
              if (isCursorActive && (cursorMode === 'crosshair' || cursorMode === 'dot' || cursorMode === 'eraser')) {
                openGroupMenu('cursor', e.currentTarget);
              } else {
                onDrawingToolChange('NONE');
                onCursorModeChange?.('crosshair');
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              openGroupMenu('cursor', e.currentTarget);
            }}
            title="Crosshair Tool (Inspect prices & time coordinates) - Click to activate, click again or ▾ for cursor options"
            aria-label="Crosshair tool"
            className={`w-full h-full rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isCursorActive && (cursorMode === 'crosshair' || cursorMode === 'dot' || cursorMode === 'eraser')
                ? 'bg-[#089981] text-white shadow-md font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cursorMode === 'dot' ? (
              <span className="w-2.5 h-2.5 rounded-full bg-current" />
            ) : cursorMode === 'eraser' ? (
              <span className="text-xs font-mono font-bold">⌫</span>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="3" x2="12" y2="7" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <line x1="3" y1="12" x2="7" y2="12" />
                <line x1="17" y1="12" x2="21" y2="12" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const anchor = e.currentTarget.parentElement || e.currentTarget;
              openGroupMenu('cursor', anchor);
            }}
            title="Crosshair & Cursor modes"
            aria-label="Crosshair modes"
            className={`absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center text-[8px] font-bold rounded-tl transition-colors cursor-pointer select-none ${
              isCursorActive && (cursorMode === 'crosshair' || cursorMode === 'dot' || cursorMode === 'eraser')
                ? 'text-white/80 hover:text-white hover:bg-white/20'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            ▾
          </button>
        </div>

        {/* ── 3. Pan / Hand Mode Tool ── */}
        <button
          type="button"
          onClick={() => {
            onDrawingToolChange('NONE');
            onCursorModeChange?.('pan');
            setOpenGroupId(null);
            setMenuPos(null);
          }}
          title="Pan Tool (Hand ✋) - Drag chart freely to scroll history"
          aria-label="Pan tool"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer mb-1 ${
            isCursorActive && cursorMode === 'pan'
              ? 'bg-[#089981] text-white shadow-md font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </button>

        <div className="w-5 h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />

        {/* ── 4. Drawing Tool Groups (5 Groups: Lines, Fib, Shapes, Risk & Forecasting, Annotations) ── */}
        <div className="flex flex-col items-center gap-1">
          {TOOL_GROUPS.map((group) => {
            const isGroupActive = group.tools.some((t) => t.id === activeDrawingTool);
            const currentToolId = isGroupActive
              ? activeDrawingTool
              : selectedToolsInGroup[group.id] || group.defaultTool;
            const currentTool = group.tools.find((t) => t.id === currentToolId) || group.tools[0];

            return (
              <div key={group.id} className="relative group w-8 h-8">
                <button
                  type="button"
                  onClick={(e) => {
                    if (isGroupActive) {
                      // Already active in this group: toggling opens options to pick another tool
                      openGroupMenu(group.id, e.currentTarget);
                    } else {
                      onDrawingToolChange(currentTool.id);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openGroupMenu(group.id, e.currentTarget);
                  }}
                  title={`${group.title}: ${currentTool.label} (Click to select, click again or ▾ for all ${group.tools.length} tools)`}
                  className={`w-full h-full rounded-lg flex items-center justify-center transition-all cursor-pointer font-mono text-sm ${
                    isGroupActive
                      ? 'bg-[#089981] text-white font-bold shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="leading-none">{currentTool.icon}</span>
                </button>

                {/* Dedicated Caret Button for immediate toolbox options opening */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const anchor = e.currentTarget.parentElement || e.currentTarget;
                    openGroupMenu(group.id, anchor);
                  }}
                  title={`Show all ${group.title} (${group.tools.length} tools)`}
                  aria-label={`${group.title} options`}
                  className={`absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center text-[8px] font-bold rounded-tl transition-colors cursor-pointer select-none ${
                    isGroupActive
                      ? 'text-white/80 hover:text-white hover:bg-white/20'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  ▾
                </button>
              </div>
            );
          })}
        </div>

        <div className="w-5 h-[1px] bg-slate-200 dark:bg-slate-800 my-1.5" />

        {/* ── 5. Smart Magnet Snap Mode ── */}
        <button
          type="button"
          onClick={() => onToggleMagnet?.()}
          title={isMagnetActive ? 'Magnet Mode ON (Snapping to OHLC wicks) [Hold Shift]' : 'Magnet Mode OFF (Hold Shift to snap to wicks)'}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer mb-1 ${
            isMagnetActive
              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 11V6a7 7 0 0 1 14 0v5"
              stroke="#F43F5E"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <rect x="3.4" y="11" width="3.2" height="4.5" rx="0.5" fill="#94A3B8" />
            <rect x="17.4" y="11" width="3.2" height="4.5" rx="0.5" fill="#94A3B8" />
          </svg>
        </button>

        {/* ── 6. Stay in Drawing Mode (Locks active drawing tool across consecutive draws) ── */}
        <button
          type="button"
          onClick={() => onToggleDrawingModeLock?.()}
          title={isDrawingModeLocked ? 'Stay in Drawing Mode: ON (Tool remains selected after drawing)' : 'Stay in Drawing Mode: OFF'}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer mb-1 text-xs ${
            isDrawingModeLocked
              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="font-mono font-bold leading-none">✏️</span>
        </button>

        {/* ── 7. Lock All Drawings (Padlock toggle) ── */}
        <button
          type="button"
          onClick={() => onToggleLockAllDrawings?.()}
          title={isAllDrawingsLocked ? 'Lock All Drawings: LOCKED (Drawings cannot be modified)' : 'Lock All Drawings: UNLOCKED'}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer mb-1 ${
            isAllDrawingsLocked
              ? 'bg-[#089981] text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {isAllDrawingsLocked ? (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            ) : (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </>
            )}
          </svg>
        </button>

        {/* ── 8. Hide / Show All Drawings (Eye toggle) ── */}
        <button
          type="button"
          onClick={() => onToggleHideAllDrawings?.()}
          title={isAllDrawingsHidden ? 'Show All Drawings' : 'Hide All Drawings'}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer mb-1 ${
            isAllDrawingsHidden
              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {isAllDrawingsHidden ? (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>

        {/* ── 9. Drawings Manager / Objects Tree (Stacked Layers) ── */}
        <button
          type="button"
          onClick={() => handleOpenManager?.()}
          title={`Drawings Manager (${drawingsCount} active object${drawingsCount === 1 ? '' : 's'})`}
          className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer mb-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          {drawingsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#089981] text-white font-mono text-[9px] font-black flex items-center justify-center">
              {drawingsCount}
            </span>
          )}
        </button>

        {/* ── 10. Undo Drawing (↺) ── */}
        {onUndoDrawing && (
          <button
            type="button"
            onClick={() => onUndoDrawing()}
            title="Undo Last Drawing (Ctrl+Z)"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer mb-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        )}

        {/* ── 11. Clear All Drawings (Trash) ── */}
        <button
          type="button"
          onClick={() => {
            if (drawingsCount === 0 || window.confirm('Are you sure you want to remove all drawings on this chart?')) {
              handleClear();
            }
          }}
          title="Clear All Drawings from Chart"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer mt-auto"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* ── Fixed Position Flyout Menus (Rendered outside the scroll container to eliminate clipping) ── */}
      {openGroupId === 'cursor' && menuPos && (
        <div
          ref={flyoutRef}
          style={{
            position: 'fixed',
            left: `${menuPos.left}px`,
            top: `${menuPos.top}px`,
            zIndex: 99999,
          }}
          className="w-64 max-h-[min(480px,calc(100vh-80px))] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E131F] shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#0E131F] z-10 flex items-center justify-between">
            <span>Cursor Modes</span>
            <span className="text-[9px] font-mono text-slate-400 opacity-70">
              {CURSOR_OPTIONS.length} Options
            </span>
          </div>
          {CURSOR_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onCursorModeChange?.(opt.id);
                onDrawingToolChange('NONE');
                setOpenGroupId(null);
                setMenuPos(null);
              }}
              className={`flex items-start gap-2.5 w-full px-3 py-2 text-left transition-colors cursor-pointer ${
                cursorMode === opt.id && isCursorActive
                  ? 'bg-[#089981]/15 text-[#089981] dark:text-[#089981] font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="font-mono text-base w-5 text-center mt-0.5">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{opt.label}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-tight mt-0.5">
                  {opt.desc}
                </div>
              </div>
              {cursorMode === opt.id && isCursorActive && (
                <span className="text-[#089981] font-bold text-xs mt-0.5">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {openGroup && menuPos && (
        <div
          ref={flyoutRef}
          style={{
            position: 'fixed',
            left: `${menuPos.left}px`,
            top: `${menuPos.top}px`,
            zIndex: 99999,
          }}
          className="w-72 max-h-[min(480px,calc(100vh-80px))] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E131F] shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#0E131F] z-10 flex items-center justify-between">
            <span>{openGroup.title}</span>
            <span className="text-[9px] font-mono text-slate-400 opacity-70">
              {openGroup.tools.length} Tools
            </span>
          </div>
          {openGroup.tools.map((tool) => {
            const isSelected = activeDrawingTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  setSelectedToolsInGroup((prev) => ({ ...prev, [openGroup.id]: tool.id }));
                  onDrawingToolChange(tool.id);
                  setOpenGroupId(null);
                  setMenuPos(null);
                }}
                className={`flex items-start gap-2.5 w-full px-3 py-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#089981]/15 text-[#089981] dark:text-[#089981] font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="font-mono text-base w-5 text-center mt-0.5">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">{tool.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-tight mt-0.5">
                    {tool.desc}
                  </div>
                </div>
                {isSelected && (
                  <span className="text-[#089981] font-bold text-xs mt-0.5">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
