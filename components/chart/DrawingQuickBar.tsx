'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { DrawingItem } from '@/lib/drawingTypes';

interface DrawingQuickBarProps {
  drawing: DrawingItem;
  position: { x: number; y: number };
  containerWidth?: number;
  containerHeight?: number;
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
  containerWidth,
  containerHeight,
  onUpdateDrawing,
  onDeleteDrawing,
  onClose,
}: DrawingQuickBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0, initialLeft: 0, initialTop: 0 });

  // 4-side clamped position
  const [coords, setCoords] = useState<{ left: number; top: number }>({
    left: Math.max(56, position.x - 180),
    top: Math.max(48, position.y - 52),
  });

  // Calculate clamped position with exact pixel bounds for all 4 sides
  const updatePosition = () => {
    if (!barRef.current) return;
    const parent = barRef.current.parentElement;
    const parentW = containerWidth || parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1000);
    const parentH = containerHeight || parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
    const barRect = barRef.current.getBoundingClientRect();

    const barW = Math.ceil(barRect.width) || 380;
    const barH = Math.ceil(barRect.height) || 42;

    // Chart margins for all 4 boundaries
    const RIGHT_MARGIN = 75;  // Right price scale axis (CHART_RIGHT_MARGIN)
    const LEFT_MARGIN = 56;   // Left drawing toolbar
    const TOP_MARGIN = 44;    // Top OHLCV / indicator bar
    const BOTTOM_MARGIN = 36; // Bottom time axis (CHART_BOTTOM_MARGIN)

    // 1. Horizontal clamping (Left & Right sides)
    const maxLeft = Math.max(LEFT_MARGIN, parentW - RIGHT_MARGIN - barW - 10);
    const minLeft = LEFT_MARGIN;

    // Anchor x: if user dragged manually, use drag offset, else center on position.x
    const targetX = dragOffset ? dragOffset.x : position.x - barW / 2;
    const clampedLeft = Math.max(minLeft, Math.min(targetX, maxLeft));

    // 2. Vertical clamping (Top & Bottom sides)
    let targetY = dragOffset ? dragOffset.y : position.y - barH - 14;
    // If too close to top edge, flip to render below anchor
    if (!dragOffset && targetY < TOP_MARGIN) {
      targetY = position.y + 24;
    }

    const maxTop = Math.max(TOP_MARGIN, parentH - BOTTOM_MARGIN - barH - 10);
    const minTop = TOP_MARGIN;
    const clampedTop = Math.max(minTop, Math.min(targetY, maxTop));

    setCoords({ left: Math.round(clampedLeft), top: Math.round(clampedTop) });
  };

  useLayoutEffect(() => {
    updatePosition();
  }, [position.x, position.y, containerWidth, containerHeight, drawing.id, drawing.tool, dragOffset]);

  // Window resize observer to maintain 4-side bounds
  useEffect(() => {
    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [containerWidth, containerHeight]);

  // Reset drag offset if selecting a different drawing
  useEffect(() => {
    setDragOffset(null);
  }, [drawing.id]);

  // Drag handle support (TradingView style re-positioning)
  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialLeft: coords.left,
      initialTop: coords.top,
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - dragStartPosRef.current.x;
      const dy = ev.clientY - dragStartPosRef.current.y;
      setDragOffset({
        x: dragStartPosRef.current.initialLeft + dx,
        y: dragStartPosRef.current.initialTop + dy,
      });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

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
      ref={barRef}
      style={{ left: `${coords.left}px`, top: `${coords.top}px` }}
      className="absolute z-40 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl shadow-slate-900/15 px-2.5 py-1.5 select-none animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100%-85px)] overflow-x-auto whitespace-nowrap pointer-events-auto"
    >
      {/* Drag Grip Handle */}
      <div
        onPointerDown={handleDragStart}
        title="Drag toolbar"
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center pr-0.5 select-none"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="8" cy="6" r="1.5" />
          <circle cx="16" cy="6" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="16" cy="12" r="1.5" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="16" cy="18" r="1.5" />
        </svg>
      </div>

      {/* Tool Label */}
      <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mr-1 uppercase truncate max-w-[110px]">
        {drawing.tool.replace(/_/g, ' ')}
      </span>

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 shrink-0" />

      {/* Color Palette Dots */}
      <div className="flex items-center gap-1 shrink-0">
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

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 shrink-0" />

      {/* Stroke Width Selector */}
      <div className="flex items-center gap-0.5 shrink-0">
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
          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 shrink-0" />
          <button
            type="button"
            onClick={handleEditText}
            title="Edit annotation text"
            className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            Edit Text
          </button>
        </>
      )}

      {(drawing.tool === 'RISK_REWARD_LONG' || drawing.tool === 'RISK_REWARD_SHORT') && (
        <>
          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 shrink-0" />
          <button
            type="button"
            onClick={handleEditRatio}
            title="Adjust Risk-to-Reward ratio"
            className="px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            R:R 1:{drawing.riskRewardRatio || 2}
          </button>
        </>
      )}

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 shrink-0" />

      {/* ── 🗑️ ONE-CLICK DELETE BUTTON ── */}
      <button
        type="button"
        onClick={() => onDeleteDrawing(drawing.id)}
        title="Delete this drawing (or press Delete key)"
        className="w-6 h-6 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/15 hover:text-rose-600 transition-all cursor-pointer font-bold shrink-0"
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
        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs shrink-0"
      >
        ×
      </button>
    </div>
  );
}
