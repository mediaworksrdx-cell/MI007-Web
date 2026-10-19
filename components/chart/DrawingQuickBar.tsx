'use client';

import React from 'react';
import type { DrawingItem } from '@/lib/drawingTypes';

interface DrawingQuickBarProps {
  drawing: DrawingItem;
  position: { x: number; y: number };
  onUpdateDrawing: (drawing: DrawingItem) => void;
  onDeleteDrawing: (drawingId: string) => void;
  onClose: () => void;
}

const PALETTE_COLORS = [
  { value: '#2563EB', label: 'Blue' },
  { value: '#10B981', label: 'Emerald' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Rose' },
  { value: '#9333EA', label: 'Purple' },
  { value: '#0F172A', label: 'Slate' },
  { value: '#FFFFFF', label: 'White' },
];

const LINE_WIDTHS = [1, 2, 3, 4];

export function DrawingQuickBar({
  drawing,
  position,
  onUpdateDrawing,
  onDeleteDrawing,
  onClose,
}: DrawingQuickBarProps) {
  // Clamp position to remain inside the chart canvas container
  const left = Math.max(12, Math.min(position.x - 120, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 340));
  const top = Math.max(12, position.y - 48);

  const handleColorChange = (color: string) => {
    onUpdateDrawing({ ...drawing, color });
  };

  const handleWidthChange = (lineWidth: number) => {
    onUpdateDrawing({ ...drawing, lineWidth });
  };

  const handleEditText = () => {
    const current = drawing.text || 'Key Level';
    const updated = window.prompt('Edit annotation text:', current);
    if (updated !== null && updated.trim()) {
      onUpdateDrawing({ ...drawing, text: updated.trim() });
    }
  };

  const handleEditRatio = () => {
    const current = drawing.riskRewardRatio || 2.0;
    const updated = window.prompt('Enter target Risk:Reward ratio (e.g. 2.5):', String(current));
    if (updated !== null) {
      const val = parseFloat(updated);
      if (!isNaN(val) && val > 0.1) {
        onUpdateDrawing({ ...drawing, riskRewardRatio: val });
      }
    }
  };

  return (
    <div
      style={{ left: `${left}px`, top: `${top}px` }}
      className="absolute z-40 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-900/15 px-2.5 py-1.5 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Tool Label */}
      <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mr-1 uppercase">
        {drawing.tool.replace(/_/g, ' ')}
      </span>

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />

      {/* Color Palette Dots */}
      <div className="flex items-center gap-1">
        {PALETTE_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => handleColorChange(c.value)}
            title={c.label}
            className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
              drawing.color === c.value
                ? 'scale-125 border-blue-600 ring-2 ring-blue-500/30'
                : 'border-slate-300 dark:border-slate-600 hover:scale-110'
            }`}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />

      {/* Stroke Width Selector */}
      <div className="flex items-center gap-0.5">
        {LINE_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => handleWidthChange(w)}
            title={`Line Width ${w}px`}
            className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
              (drawing.lineWidth || 2) === w
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Custom Tool Properties (Text / Risk-Reward) */}
      {(drawing.tool === 'TEXT' || drawing.tool === 'CALLOUT') && (
        <>
          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={handleEditText}
            title="Edit annotation text"
            className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Edit Text
          </button>
        </>
      )}

      {(drawing.tool === 'RISK_REWARD_LONG' || drawing.tool === 'RISK_REWARD_SHORT') && (
        <>
          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={handleEditRatio}
            title="Adjust Risk-to-Reward ratio"
            className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            R:R 1:{drawing.riskRewardRatio || 2}
          </button>
        </>
      )}

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />

      {/* ── 🗑️ ONE-CLICK DELETE BUTTON ── */}
      <button
        type="button"
        onClick={() => onDeleteDrawing(drawing.id)}
        title="Delete this drawing (or press Delete key)"
        className="w-6 h-6 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/15 hover:text-rose-600 transition-all cursor-pointer font-bold"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>

      {/* Close / Deselect */}
      <button
        type="button"
        onClick={onClose}
        title="Deselect"
        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
      >
        ×
      </button>
    </div>
  );
}
