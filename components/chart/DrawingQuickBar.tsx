'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { DrawingItem } from '@/lib/drawingTypes';

interface DrawingQuickBarProps {
  drawing: DrawingItem;
  position: { x: number; y: number };
  containerWidth?: number;
  containerHeight?: number;
  isAllDrawingsLocked?: boolean;
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
  isAllDrawingsLocked = false,
  onUpdateDrawing,
  onDeleteDrawing,
  onOpenSettings,
  onOpenContextMenu,
  onClose,
}: DrawingQuickBarProps) {
  const isLocked = Boolean(drawing.locked || isAllDrawingsLocked);
  const barRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0, initialLeft: 0, initialTop: 0 });

  // Popover menus state inside quickbar
  const [activePopover, setActivePopover] = useState<'color' | 'width' | 'style' | null>(null);

  // 4-side clamped position
  const [coords, setCoords] = useState<{ left: number; top: number }>({
    left: Math.max(56, position.x - 110),
    top: Math.max(48, position.y - 42),
  });

  // Calculate clamped position with exact pixel bounds for all 4 sides
  const updatePosition = () => {
    if (!barRef.current) return;
    const parent = barRef.current.parentElement;
    const parentW = containerWidth || parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1000);
    const parentH = containerHeight || parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
    const barRect = barRef.current.getBoundingClientRect();

    const barW = Math.ceil(barRect.width) || 210;
    const barH = Math.ceil(barRect.height) || 28;

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
    let targetY = dragOffset ? dragOffset.y : position.y - barH - 12;
    // If too close to top edge, flip to render below anchor
    if (!dragOffset && targetY < TOP_MARGIN) {
      targetY = position.y + 20;
    }

    const maxTop = Math.max(TOP_MARGIN, parentH - BOTTOM_MARGIN - barH - 8);
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
    if (isLocked) return;
    onUpdateDrawing({ ...drawing, color });
    setActivePopover(null);
  };

  const handleWidthChange = (lineWidth: number) => {
    if (isLocked) return;
    onUpdateDrawing({ ...drawing, lineWidth });
    setActivePopover(null);
  };

  const handleStyleChange = (lineStyle: 'solid' | 'dashed' | 'dotted') => {
    if (isLocked) return;
    onUpdateDrawing({ ...drawing, lineStyle });
    setActivePopover(null);
  };

  const handleToggleLock = () => {
    onUpdateDrawing({ ...drawing, locked: !drawing.locked });
    setActivePopover(null);
  };

  const handleEditText = () => {
    if (isLocked) return;
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
      className="absolute z-40 flex items-center gap-0.5 bg-white/95 dark:bg-[#1e222d]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-md shadow-lg shadow-slate-900/15 px-1 py-0.5 select-none animate-in fade-in zoom-in-95 duration-100 max-w-[calc(100%-85px)] text-slate-700 dark:text-slate-200 pointer-events-auto"
      onClick={() => setActivePopover(null)}
    >
      {/* 1. Drag Grip Handle (Compact 6-dots⠿) */}
      <div
        onPointerDown={handleDragStart}
        title="Drag toolbar"
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center px-0.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="8" cy="6" r="1.5" />
          <circle cx="16" cy="6" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="16" cy="12" r="1.5" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="16" cy="18" r="1.5" />
        </svg>
      </div>

      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5" />

      {/* 2. Color Swatch & Dropdown */}
      <div className="relative shrink-0">
        <button
          type="button"
          disabled={isLocked}
          onClick={(e) => {
            e.stopPropagation();
            if (isLocked) return;
            setActivePopover(activePopover === 'color' ? null : 'color');
          }}
          title={isLocked ? 'Drawing is locked' : 'Line color'}
          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
            isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
          }`}
        >
          <span
            className="w-3 h-3 rounded-full ring-1 ring-black/10 shadow-xs"
            style={{ backgroundColor: drawing.color || '#2563EB' }}
          />
        </button>

        {activePopover === 'color' && !isLocked && (
          <div
            className="absolute left-0 top-full mt-1 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e222d] shadow-xl z-50 grid grid-cols-5 gap-1 w-32 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {PALETTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleColorChange(c)}
                className={`w-4.5 h-4.5 rounded border transition-transform cursor-pointer ${
                  drawing.color === c
                    ? 'scale-115 border-blue-600 ring-1 ring-blue-500/40'
                    : 'border-slate-300 dark:border-slate-600 hover:scale-105'
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
        disabled={isLocked}
        onClick={handleEditText}
        title={isLocked ? 'Drawing is locked' : 'Edit text / annotation'}
        className={`w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold transition-colors shrink-0 font-serif ${
          isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
        }`}
      >
        T
      </button>

      {/* 4. Stroke Width Dropdown (1px - 4px) */}
      <div className="relative shrink-0">
        <button
          type="button"
          disabled={isLocked}
          onClick={(e) => {
            e.stopPropagation();
            if (isLocked) return;
            setActivePopover(activePopover === 'width' ? null : 'width');
          }}
          title={isLocked ? 'Drawing is locked' : 'Line thickness'}
          className={`px-1 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
            isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
          }`}
        >
          {drawing.lineWidth || 2}px
        </button>

        {activePopover === 'width' && !isLocked && (
          <div
            className="absolute left-0 top-full mt-1 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e222d] shadow-xl z-50 flex flex-col gap-0.5 w-16 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => handleWidthChange(w)}
                className={`px-1.5 py-0.5 text-left rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
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
          disabled={isLocked}
          onClick={(e) => {
            e.stopPropagation();
            if (isLocked) return;
            setActivePopover(activePopover === 'style' ? null : 'style');
          }}
          title={isLocked ? 'Drawing is locked' : 'Line style'}
          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
            isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
          }`}
        >
          {drawing.lineStyle === 'dashed' ? (
            <span className="font-mono text-[10px] tracking-tighter">--</span>
          ) : drawing.lineStyle === 'dotted' ? (
            <span className="font-mono text-[10px] tracking-widest leading-none">···</span>
          ) : (
            <span className="font-bold text-[11px]">—</span>
          )}
        </button>

        {activePopover === 'style' && !isLocked && (
          <div
            className="absolute left-0 top-full mt-1 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e222d] shadow-xl z-50 flex flex-col gap-0.5 w-20 animate-in fade-in zoom-in-95 duration-100 text-[11px]"
            onClick={(e) => e.stopPropagation()}
          >
            {(['solid', 'dashed', 'dotted'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStyleChange(st)}
                className={`px-1.5 py-0.5 text-left rounded capitalize font-medium transition-colors cursor-pointer ${
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

      <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5" />

      {/* 6. Settings Modal Trigger (TradingView Gear ⚙️) */}
      {onOpenSettings && (
        <button
          type="button"
          disabled={isLocked}
          onClick={() => {
            if (isLocked) return;
            onOpenSettings();
          }}
          title={isLocked ? 'Drawing is locked — unlock to edit settings' : 'Settings (Coordinates, Style, Visibility)'}
          className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${
            isLocked
              ? 'text-slate-400 opacity-40 cursor-not-allowed'
              : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
          }`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        className={`w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
          drawing.locked
            ? 'text-amber-500 bg-amber-500/10'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {drawing.locked ? (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        )}
      </button>

      {/* 8. Delete Button (🗑️) */}
      <button
        type="button"
        disabled={isLocked}
        onClick={() => {
          if (isLocked) return;
          onDeleteDrawing(drawing.id);
        }}
        title={isLocked ? 'Drawing is locked — unlock to delete' : 'Delete this drawing (Delete key)'}
        className={`w-5 h-5 rounded flex items-center justify-center transition-all font-bold shrink-0 ${
          isLocked
            ? 'text-slate-400 opacity-35 cursor-not-allowed'
            : 'text-rose-500 hover:bg-rose-500/15 hover:text-rose-600 cursor-pointer'
        }`}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 font-bold text-[11px]"
        >
          ···
        </button>
      )}
    </div>
  );
}
