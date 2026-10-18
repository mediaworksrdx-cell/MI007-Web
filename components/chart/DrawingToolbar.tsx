'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DrawingToolType } from '@/lib/drawingTypes';

export type CursorMode = 'crosshair' | 'dot' | 'arrow' | 'eraser';

interface DrawingToolbarProps {
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

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'lines',
    title: 'Lines & Rays',
    defaultTool: 'TRENDLINE',
    tools: [
      { id: 'TRENDLINE', label: 'Trendline', desc: '2 points: connect swings or trend', icon: '/' },
      { id: 'RAY', label: 'Extended Ray', desc: 'Projects forward past 2nd point', icon: '⟶' },
      { id: 'HORIZONTAL', label: 'Horizontal Line', desc: 'Full-width support/resistance level', icon: '―' },
      { id: 'HORIZONTAL_RAY', label: 'Horizontal Ray', desc: 'Starts at anchor and extends right', icon: '⭢' },
      { id: 'EXTENDED_LINE', label: 'Extended Line', desc: 'Projects infinitely in both directions', icon: '⟷' },
      { id: 'VERTICAL_LINE', label: 'Vertical Line', desc: 'Time-anchor vertical timeline bar', icon: '│' },
    ],
  },
  {
    id: 'fib',
    title: 'Fibonacci & Channels',
    defaultTool: 'FIBONACCI',
    tools: [
      { id: 'FIBONACCI', label: 'Fib Retracement', desc: '0.236, 0.382, 0.5, 0.618 golden pocket', icon: '≡' },
      { id: 'FIBONACCI_EXTENSION', label: 'Fib Extension', desc: '3 points: 1.0, 1.618, 2.618 targets', icon: '⤢' },
      { id: 'CHANNEL', label: 'Parallel Channel', desc: '3 points: upper, lower rails & median', icon: '⫽' },
    ],
  },
  {
    id: 'shapes',
    title: 'Shapes & Zones',
    defaultTool: 'RECTANGLE',
    tools: [
      { id: 'RECTANGLE', label: 'Support / Resistance Box', desc: '2 points: frame order blocks & zones', icon: '▭' },
      { id: 'CIRCLE', label: 'Circle Marker', desc: '2 points: center point and radius', icon: '○' },
      { id: 'BRUSH', label: 'Freehand Pen', desc: 'Click and drag to sketch freeform paths', icon: '✎' },
    ],
  },
  {
    id: 'prediction',
    title: 'Risk & Forecasting',
    defaultTool: 'RISK_REWARD_LONG',
    tools: [
      { id: 'RISK_REWARD_LONG', label: 'Long Position Box', desc: 'Entry, stop-loss & take-profit targets', icon: '▲' },
      { id: 'RISK_REWARD_SHORT', label: 'Short Position Box', desc: 'Short entry, stop & reward projection', icon: '▼' },
      { id: 'MEASURE', label: 'Price & Bar Measure', desc: 'Delta price, % change, and bar count', icon: '↔' },
    ],
  },
  {
    id: 'annotations',
    title: 'Text & Notes',
    defaultTool: 'TEXT',
    tools: [
      { id: 'TEXT', label: 'Text Annotation', desc: 'Place customized text label on chart', icon: 'T' },
      { id: 'CALLOUT', label: 'Callout Arrow', desc: '2 points: arrow tip to wick + text bubble', icon: '💬' },
    ],
  },
];

const CURSOR_OPTIONS: { id: CursorMode; label: string; desc: string; icon: string }[] = [
  { id: 'crosshair', label: 'Crosshair', desc: 'Precision coordinates with price & time badges', icon: '✛' },
  { id: 'dot', label: 'Dot', desc: 'Minimalist point reticle with coordinates', icon: '•' },
  { id: 'arrow', label: 'Arrow', desc: 'Standard mouse pointer for clean chart inspection', icon: '↖' },
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
  drawingsCount = 0,
  className = '',
}: DrawingToolbarProps) {
  const handleClear = onClearAllDrawings || onClearDrawings || (() => {});
  const handleOpenManager = onOpenDrawingsManager || onOpenObjectsTree;
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [selectedToolsInGroup, setSelectedToolsInGroup] = useState<Record<string, DrawingToolType>>({
    lines: 'TRENDLINE',
    fib: 'FIBONACCI',
    shapes: 'RECTANGLE',
    prediction: 'RISK_REWARD_LONG',
    annotations: 'TEXT',
  });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close flyouts on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenGroupId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCursorActive = activeDrawingTool === 'NONE';

  return (
    <div
      ref={toolbarRef}
      className={`relative z-30 flex flex-col items-center bg-white dark:bg-[#0B0F19] border-r border-slate-200 dark:border-slate-800 py-2 px-1 select-none shadow-sm ${className}`}
      style={{ width: '44px' }}
    >
      {/* ── 1. Cursor / Select Mode (Matches Image 1: Blue rounded box with cursor arrow) ── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            onDrawingToolChange('NONE');
            if (openGroupId === 'cursor') setOpenGroupId(null);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setOpenGroupId(openGroupId === 'cursor' ? null : 'cursor');
          }}
          title={`Cursor Tool (${cursorMode.toUpperCase()}) - Click to inspect or pan, right-click for options`}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer mb-1 relative ${
            isCursorActive
              ? 'bg-blue-600 text-white shadow-md font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {cursorMode === 'crosshair' && (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              <path d="M13 13l6 6" />
            </svg>
          )}
          {cursorMode === 'arrow' && (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            </svg>
          )}
          {cursorMode === 'dot' && (
            <span className="w-2.5 h-2.5 rounded-full bg-current" />
          )}
          {cursorMode === 'eraser' && (
            <span className="text-xs font-mono font-bold">⌫</span>
          )}

          <span
            onClick={(e) => {
              e.stopPropagation();
              setOpenGroupId(openGroupId === 'cursor' ? null : 'cursor');
            }}
            title="Cursor mode options"
            className="absolute bottom-0 right-0 p-0.5 text-[8px] opacity-75 hover:opacity-100 leading-none"
          >
            ▾
          </span>
        </button>

        {/* Cursor Mode Flyout */}
        {openGroupId === 'cursor' && (
          <div className="absolute left-full top-0 ml-1.5 w-60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E131F] shadow-2xl py-1 z-[100] animate-in fade-in duration-75">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              Cursor Modes
            </div>
            {CURSOR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onCursorModeChange?.(opt.id);
                  onDrawingToolChange('NONE');
                  setOpenGroupId(null);
                }}
                className={`flex items-start gap-2.5 w-full px-3 py-2 text-left transition-colors cursor-pointer ${
                  cursorMode === opt.id && isCursorActive
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
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
                {cursorMode === opt.id && <span className="text-blue-600 font-bold text-xs mt-0.5">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-5 h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />

      {/* ── 2. Tool Groups (Lines, Fib, Shapes, Positions, Text) ── */}
      <div className="flex flex-col items-center gap-1">
        {TOOL_GROUPS.map((group) => {
          const isGroupActive = group.tools.some((t) => t.id === activeDrawingTool);
          const currentToolId = isGroupActive
            ? activeDrawingTool
            : selectedToolsInGroup[group.id] || group.defaultTool;
          const currentTool = group.tools.find((t) => t.id === currentToolId) || group.tools[0];
          const isMenuOpen = openGroupId === group.id;

          return (
            <div key={group.id} className="relative">
              <button
                type="button"
                onClick={() => {
                  onDrawingToolChange(currentTool.id);
                  setOpenGroupId(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setOpenGroupId(isMenuOpen ? null : group.id);
                }}
                title={`${group.title}: ${currentTool.label} (Click to activate, click arrow for more)`}
                className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer font-mono text-sm ${
                  isGroupActive
                    ? 'bg-blue-600 text-white font-bold shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{currentTool.icon}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenGroupId(isMenuOpen ? null : group.id);
                  }}
                  title="More tools in this group"
                  className="absolute bottom-0 right-0 p-0.5 text-[8px] opacity-75 hover:opacity-100 leading-none"
                >
                  ▾
                </span>
              </button>

              {/* Flyout Submenu */}
              {isMenuOpen && (
                <div className="absolute left-full top-0 ml-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E131F] shadow-2xl py-1 z-[100] animate-in fade-in duration-75">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    {group.title}
                  </div>
                  {group.tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        setSelectedToolsInGroup((prev) => ({ ...prev, [group.id]: tool.id }));
                        onDrawingToolChange(tool.id);
                        setOpenGroupId(null);
                      }}
                      className={`flex items-start gap-2.5 w-full px-3 py-2 text-left transition-colors cursor-pointer ${
                        activeDrawingTool === tool.id
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
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
                      {activeDrawingTool === tool.id && <span className="text-blue-600 font-bold text-xs mt-0.5">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-5 h-[1px] bg-slate-200 dark:bg-slate-800 my-1.5" />

      {/* ── 3. Smart Magnet Snap Mode (Matches Image 1: Pink Horseshoe Magnet) ── */}
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
          {/* Horseshoe Magnet Top Arc (Pink/Rose) */}
          <path
            d="M5 11V6a7 7 0 0 1 14 0v5"
            stroke="#F43F5E"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Left Silver Pole Tip */}
          <rect x="3.4" y="11" width="3.2" height="4.5" rx="0.5" fill="#94A3B8" />
          {/* Right Silver Pole Tip */}
          <rect x="17.4" y="11" width="3.2" height="4.5" rx="0.5" fill="#94A3B8" />
        </svg>
      </button>

      {/* ── 4. Drawings Manager / Objects Tree (Matches Image 1: Stacked Layers) ── */}
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
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white font-mono text-[9px] font-black flex items-center justify-center">
            {drawingsCount}
          </span>
        )}
      </button>

      {/* ── 5. Undo Drawing (Matches Image 1: Counter-clockwise circle arrow ↺) ── */}
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

      {/* ── 6. Clear All Drawings (Trash) ── */}
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
  );
}
