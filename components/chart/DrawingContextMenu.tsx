'use client';

import React, { useEffect, useRef } from 'react';
import type { DrawingItem } from '@/lib/drawingTypes';

interface DrawingContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  drawing: DrawingItem;
  isAllDrawingsLocked?: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onClone: () => void;
  onToggleLock: () => void;
  onToggleHide: () => void;
  onDelete: () => void;
  onOpenObjectTree?: () => void;
}

export function DrawingContextMenu({
  isOpen,
  position,
  drawing,
  isAllDrawingsLocked = false,
  onClose,
  onOpenSettings,
  onClone,
  onToggleLock,
  onToggleHide,
  onDelete,
  onOpenObjectTree,
}: DrawingContextMenuProps) {
  const isLocked = Boolean(drawing.locked || isAllDrawingsLocked);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compact viewport clamping
  const menuWidth = 155;
  const menuHeight = 190;
  const left = Math.min(position.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - menuWidth - 12);
  const top = Math.min(position.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - menuHeight - 12);

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-[9998] min-w-[150px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#1e222d]/95 backdrop-blur-md text-slate-800 dark:text-slate-200 shadow-xl py-0.5 text-[11px] select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Tool Name Title (Compact) */}
      <div className="px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="truncate">{drawing.tool.replace(/_/g, ' ')}</span>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: drawing.color }} />
      </div>

      {/* Settings Action */}
      <button
        type="button"
        disabled={isLocked}
        onClick={() => {
          if (isLocked) return;
          onOpenSettings();
          onClose();
        }}
        className={`w-full px-2.5 py-1 flex items-center gap-2 text-left transition-colors font-medium ${
          isLocked
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:bg-blue-50 dark:hover:bg-blue-600/15 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'
        }`}
      >
        <svg className="w-3 h-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Settings...</span>
      </button>

      {/* Clone Action */}
      <button
        type="button"
        onClick={() => {
          onClone();
          onClose();
        }}
        className="w-full px-2.5 py-1 flex items-center gap-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
      >
        <svg className="w-3 h-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>Clone</span>
      </button>

      {/* Lock / Unlock */}
      <button
        type="button"
        onClick={() => {
          onToggleLock();
          onClose();
        }}
        className="w-full px-2.5 py-1 flex items-center gap-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
      >
        {drawing.locked ? (
          <>
            <svg className="w-3 h-3 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-amber-500 font-semibold">Unlock</span>
          </>
        ) : (
          <>
            <svg className="w-3 h-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
            <span>Lock</span>
          </>
        )}
      </button>

      {/* Hide / Show */}
      <button
        type="button"
        onClick={() => {
          onToggleHide();
          onClose();
        }}
        className="w-full px-2.5 py-1 flex items-center gap-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
      >
        <svg className="w-3 h-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{drawing.hidden ? 'Show' : 'Hide'}</span>
      </button>

      {/* Object Tree */}
      {onOpenObjectTree && (
        <button
          type="button"
          onClick={() => {
            onOpenObjectTree();
            onClose();
          }}
          className="w-full px-2.5 py-1 flex items-center gap-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-medium"
        >
          <svg className="w-3 h-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span>Object tree...</span>
        </button>
      )}

      {/* Separator */}
      <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5" />

      {/* Remove / Delete */}
      <button
        type="button"
        disabled={isLocked}
        onClick={() => {
          if (isLocked) return;
          onDelete();
          onClose();
        }}
        title={isLocked ? 'Drawing is locked — unlock to remove' : 'Remove drawing'}
        className={`w-full px-2.5 py-1 flex items-center gap-2 text-left transition-colors font-semibold ${
          isLocked
            ? 'text-slate-400 opacity-40 cursor-not-allowed'
            : 'hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 cursor-pointer'
        }`}
      >
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <span>Remove</span>
      </button>
    </div>
  );
}
