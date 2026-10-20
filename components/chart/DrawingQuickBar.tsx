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
  onOpenSettings?: () => void;
  onOpenContextMenu?: (pos: { x: number; y: number }) => void;
  onClose: () => void;
}

const PALETTE_COLORS = [
  '#2563EB', '#3B82F6', '#06B6D4', '#10B981',
  '#F59E0B', '#EF4444', '#8B5CF6', '#64748B',
  '#0F172A', '#FFFFFF'
];

export function DrawingQuickBar({
  drawing,
  position,
  containerWidth,
  containerHeight,
  onUpdateDrawing,
  onDeleteDrawing,
  onOpenSettings,
  onOpenContextMenu,
  onClose,
}: DrawingQuickBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0, initialLeft: 0, initialTop: 0 });

  // Popover menus state inside quickbar
  const [activePopover, setActivePopover] = useState<'color' | 'width' | 'style' | null>(null);

  // 4-side clamped position
  const [coords, setCoords] = useState<{ left: number; top: number }>({
    left: Math.max(56, position.x - 160),
    top: Math.max(48, position.y - 52),
  });

  // Calculate clamped position with exact pixel bounds for all 4 sides
  const updatePosition = () => {
    if (!barRef.current) return;
    const parent = barRef.current.parentElement;
    const parentW = containerWidth || parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1000);
    const parentH = containerHeight || parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
    const barRect = barRef.current.getBoundingClientRect();

    const barW = Math.ceil(barRect.width) || 320;
    const barH = Math.ceil(barRect.height) || 40;

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

  // Reset drag offset and popovers if selecting a different drawing
  useEffect(() => {
    setDragOffset(null);
    setActivePopover(null);
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
    setActivePopover(null);
  };

  const handleWidthChange = (lineWidth: number) => {
    onUpdateDrawing({ ...drawing, lineWidth });
    setActivePopover(null);
  };

  const handleStyleChange = (lineStyle: 'solid' | 'dashed' | 'dotted') => {
    onUpdateDrawing({ ...drawing, lineStyle });
    setActivePopover(null);
  };

  const handleToggleLock = () => {
    onUpdateDrawing({ ...drawing, locked: !drawing.locked });
  };

  const handleEditText = () => {
    const current = drawing.text || '';
    const updated = window.prompt('Enter annotation label / text:', current);
    if (updated !== null) {
      onUpdateDrawing({ ...drawing, text: updated.trim() || undefined });
    }
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onOpenContextMenu?.({ x: rect.right, y: rect.bottom + 4 });
  };

  return (
    <div
      ref={barRef}
      style={{ left: `${coords.left}px`, top: `${coords.top}px` }}
      className="absolute z-40 flex items-center gap-1 bg-white/95 dark:bg-[#1e222d]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-lg shadow-xl shadow-slate-900/15 px-2 py-1 select-none animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100%-85px)] text-slate-700 dark:text-slate-200 pointer-events-auto"
      onClick={() => setActivePopover(null)}
    >
      {/* 1. Drag Grip Handle (TradingView 6-dots⠿) */}
      <div
        onPointerDown={handleDragStart}
        title="Drag toolbar"
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center px-1 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
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

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 shrink-0" />

      {/* 2. Color Swatch & Dropdown */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover(activePopover === 'color' ? null : 'color');
          }}
          title="Line color"
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span
            className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 shadow-xs"
            style={{ backgroundColor: drawing.color || '#2563EB' }}
          />
        </button>

        {activePopover === 'color' && (
          <div
            className="absolute left-0 top-full mt-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e222d] shadow-xl z-50 grid grid-cols-5 gap-1.5 w-36 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {PALETTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleColorChange(c)}
                className={`w-5 h-5 rounded-md border transition-transform cursor-pointer ${
                  drawing.color === c
                    ? 'scale-115 border-blue-600 ring-2 ring-blue-500/30'
                    : 'border-slate-300 dark:border-slate-600 hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. Text Button ('T') */}
      <button
        type="button"
        onClick={handleEditText}
        title="Edit text / annotation"
        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 font-serif"
      >
        T
      </button>

      {/* 4. Stroke Width Dropdown (1px - 4px) */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover(activePopover === 'width' ? null : 'width');
          }}
          title="Line thickness"
          className="px-1.5 h-6 rounded flex items-center justify-center text-[11px] font-mono font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {drawing.lineWidth || 2}px
        </button>

        {activePopover === 'width' && (
          <div
            className="absolute left-0 top-full mt-1.5 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e222d] shadow-xl z-50 flex flex-col gap-1 w-20 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => handleWidthChange(w)}
                className={`px-2 py-1 text-left rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  (drawing.lineWidth || 2) === w
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                {w} px
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. Line Style Dropdown (Solid, Dashed, Dotted) */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActivePopover(activePopover === 'style' ? null : 'style');
          }}
          title="Line style"
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {drawing.lineStyle === 'dashed' ? (
            <span className="font-mono text-xs tracking-tighter">--</span>
          ) : drawing.lineStyle === 'dotted' ? (
            <span className="font-mono text-xs tracking-widest leading-none">···</span>
          ) : (
            <span className="font-bold text-xs">—</span>
          )}
        </button>

        {activePopover === 'style' && (
          <div
            className="absolute left-0 top-full mt-1.5 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e222d] shadow-xl z-50 flex flex-col gap-1 w-24 animate-in fade-in zoom-in-95 duration-100 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {(['solid', 'dashed', 'dotted'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStyleChange(st)}
                className={`px-2 py-1 text-left rounded capitalize font-medium transition-colors cursor-pointer ${
                  (drawing.lineStyle || 'solid') === st
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 shrink-0" />

      {/* 6. Settings Modal Trigger (TradingView Gear ⚙️) */}
      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          title="Settings (Coordinates, Style, Visibility)"
          className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}

      {/* 7. Lock / Unlock */}
      <button
        type="button"
        onClick={handleToggleLock}
        title={drawing.locked ? 'Unlock drawing' : 'Lock drawing'}
        className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
          drawing.locked
            ? 'text-amber-500 bg-amber-500/10'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {drawing.locked ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        )}
      </button>

      {/* 8. Delete Button (🗑️) */}
      <button
        type="button"
        onClick={() => onDeleteDrawing(drawing.id)}
        title="Delete this drawing (Delete key)"
        className="w-6 h-6 rounded flex items-center justify-center text-rose-500 hover:bg-rose-500/15 hover:text-rose-600 transition-all cursor-pointer font-bold shrink-0"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>

      {/* 9. More Options Button (···) */}
      {onOpenContextMenu && (
        <button
          type="button"
          onClick={handleMoreClick}
          title="More actions"
          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 font-bold"
        >
          ···
        </button>
      )}

      {/* 10. Close / Deselect (×) */}
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
