'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { DrawingToolType } from '@/lib/drawingTypes';

interface DrawingToolbarProps {
  activeDrawingTool: DrawingToolType;
  onDrawingToolChange: (tool: DrawingToolType) => void;
  onClearAllDrawings?: () => void;
  onClearDrawings?: () => void;
  onUndoDrawing?: () => void;
  onOpenDrawingsManager?: () => void;
  onOpenObjectsTree?: () => void;
  isMagnetActive?: boolean;
  onToggleMagnet?: () => void;
  onOpenHotkeys?: () => void;
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
  icon: string;
  defaultTool: DrawingToolType;
  tools: ToolItem[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'lines',
    title: 'Lines & Rays',
    icon: '╱',
    defaultTool: 'TRENDLINE',
    tools: [
      { id: 'TRENDLINE', label: 'Trendline', desc: '2 clicks to connect two price points', icon: '╱' },
      { id: 'RAY', label: 'Extended Ray', desc: 'Starts at point 1 and extends past point 2', icon: '⟶' },
      { id: 'HORIZONTAL', label: 'Horizontal Line', desc: 'Full-width support/resistance level', icon: '―' },
      { id: 'HORIZONTAL_RAY', label: 'Horizontal Ray', desc: 'Starts at point and projects right', icon: '⭢' },
      { id: 'EXTENDED_LINE', label: 'Extended Line', desc: 'Projects infinitely in both directions', icon: '⟷' },
      { id: 'VERTICAL_LINE', label: 'Vertical Line', desc: 'Time-anchor vertical timeline bar', icon: '│' },
    ],
  },
  {
    id: 'fib',
    title: 'Fibonacci & Channels',
    icon: '≡',
    defaultTool: 'FIBONACCI',
    tools: [
      { id: 'FIBONACCI', label: 'Fib Retracement', desc: '0.236, 0.382, 0.5, 0.618 golden pocket', icon: '≡' },
      { id: 'FIBONACCI_EXTENSION', label: 'Fib Extension', desc: '3 clicks for 1.0, 1.618, 2.618 targets', icon: '⤢' },
      { id: 'CHANNEL', label: 'Parallel Channel', desc: '3 clicks: upper, lower rails & median', icon: '⫽' },
    ],
  },
  {
    id: 'shapes',
    title: 'Shapes & Zones',
    icon: '▭',
    defaultTool: 'RECTANGLE',
    tools: [
      { id: 'RECTANGLE', label: 'Support / Resistance Box', desc: '2 clicks to frame consolidation zones', icon: '▭' },
      { id: 'CIRCLE', label: 'Circle / Pivot Marker', desc: '2 clicks: center point and radius', icon: '○' },
      { id: 'BRUSH', label: 'Freehand Pen', desc: 'Click and drag to sketch freeform paths', icon: '✎' },
    ],
  },
  {
    id: 'prediction',
    title: 'Risk & Forecasting',
    icon: '⚖',
    defaultTool: 'RISK_REWARD_LONG',
    tools: [
      { id: 'RISK_REWARD_LONG', label: 'Long Position Box', desc: 'Entry, stop-loss & take-profit targets', icon: '▲' },
      { id: 'RISK_REWARD_SHORT', label: 'Short Position Box', desc: 'Short entry, stop & reward projection', icon: '▼' },
      { id: 'MEASURE', label: 'Price & Bar Measure', desc: '2 clicks: delta price, % change, bar count', icon: '↔' },
    ],
  },
  {
    id: 'annotations',
    title: 'Text & Notes',
    icon: 'T',
    defaultTool: 'TEXT',
    tools: [
      { id: 'TEXT', label: 'Text Annotation', desc: 'Click to place customized text label', icon: 'T' },
      { id: 'CALLOUT', label: 'Callout Arrow', desc: '2 clicks: arrow tip to wick + text bubble', icon: '💬' },
    ],
  },
];

export function DrawingToolbar({
  activeDrawingTool,
  onDrawingToolChange,
  onClearAllDrawings,
  onClearDrawings,
  onUndoDrawing,
  onOpenDrawingsManager,
  onOpenObjectsTree,
  isMagnetActive = false,
  onToggleMagnet,
  onOpenHotkeys,
  drawingsCount = 0,
  className = '',
}: DrawingToolbarProps) {
  const handleClear = onClearAllDrawings || onClearDrawings || (() => {});
  const handleOpenManager = onOpenDrawingsManager || onOpenObjectsTree;
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close flyout menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenGroupId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={toolbarRef}
      className={`relative z-20 flex flex-col items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200/90 dark:border-slate-800 py-2 px-1 select-none shadow-xs ${className}`}
      style={{ width: '42px' }}
    >
      {/* ── 1. Default Pointer / Selection Mode ── */}
      <button
        type="button"
        onClick={() => {
          onDrawingToolChange('NONE');
          setOpenGroupId(null);
        }}
        title="Cursor / Select Mode (Click to inspect or select drawings)"
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer mb-1 ${
          activeDrawingTool === 'NONE'
            ? 'bg-blue-600 text-white shadow-xs font-black'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
      </button>

      <div className="w-5 h-px bg-slate-200 dark:bg-slate-800 my-1" />

      {/* ── 2. Tool Groups with Flyout Popovers ── */}
      <div className="flex flex-col items-center gap-1">
        {TOOL_GROUPS.map((group) => {
          const isGroupActive = group.tools.some((t) => t.id === activeDrawingTool);
          const activeToolMeta = group.tools.find((t) => t.id === activeDrawingTool) || group.tools[0];
          const isMenuOpen = openGroupId === group.id;

          return (
            <div key={group.id} className="relative">
              <button
                type="button"
                onClick={() => {
                  onDrawingToolChange(activeToolMeta.id);
                  setOpenGroupId(null);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setOpenGroupId(isMenuOpen ? null : group.id);
                }}
                title={`${group.title}: ${activeToolMeta.label} (Click to activate, right-click for more)`}
                className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer font-mono text-sm ${
                  isGroupActive
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{activeToolMeta.icon}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenGroupId(isMenuOpen ? null : group.id);
                  }}
                  title="More tools in this group"
                  className="absolute bottom-0 right-0 p-0.5 text-[8px] opacity-70 hover:opacity-100 hover:text-emerald-400 leading-none"
                >
                  ▾
                </span>
              </button>

              {/* Flyout Submenu */}
              {isMenuOpen && (
                <div className="absolute left-full top-0 ml-2 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    {group.title}
                  </div>
                  {group.tools.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        onDrawingToolChange(tool.id);
                        setOpenGroupId(null);
                      }}
                      className={`flex items-start gap-2.5 w-full px-3 py-2 text-left transition-colors cursor-pointer ${
                        activeDrawingTool === tool.id
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-mono text-base w-5 text-center mt-0.5">{tool.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">{tool.label}</div>
                        <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-normal leading-tight mt-0.5">
                          {tool.desc}
                        </div>
                      </div>
                      {activeDrawingTool === tool.id && <span className="text-emerald-600 font-bold text-xs mt-0.5">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-5 h-px bg-slate-200 dark:bg-slate-800 my-2" />

      {/* ── 2.5. Smart Magnet Snap Mode ── */}
      <button
        type="button"
        onClick={() => onToggleMagnet?.()}
        title={isMagnetActive ? 'Magnet Mode ON (Snaps drawing vertices to wicks) [Hold Shift]' : 'Magnet Mode OFF (Hold Shift to snap)'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer mb-1 ${
          isMagnetActive
            ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/40 shadow-xs font-bold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <span className="text-sm leading-none">🧲</span>
      </button>

      {/* ── 3. Objects Tree / Drawings Manager ── */}
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

      {/* ── 4. Undo Drawing ── */}
      {onUndoDrawing && (
        <button
          type="button"
          onClick={() => onUndoDrawing()}
          title="Undo Last Drawing (Ctrl+Z)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer mb-1"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
      )}

      {/* ── 4.5. Keyboard Shortcuts Cheat Sheet (?) ── */}
      {onOpenHotkeys && (
        <button
          type="button"
          onClick={() => onOpenHotkeys()}
          title="Keyboard Shortcuts Cheat Sheet (?)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer mb-1 font-mono font-bold text-xs"
        >
          ⌨
        </button>
      )}

      {/* ── 5. Clear All Drawings (Trash) ── */}
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
