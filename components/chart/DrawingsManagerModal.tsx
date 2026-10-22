'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { DrawingItem } from '@/lib/drawingTypes';
import { formatPrice } from '@/lib/chartRenderer';

interface DrawingsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawings: DrawingItem[];
  selectedDrawingId?: string | null;
  isAllDrawingsLocked?: boolean;
  onSelectDrawing: (id: string | null) => void;
  onUpdateDrawing: (drawing: DrawingItem) => void;
  onDeleteDrawing: (drawingId: string) => void;
  onClearAllDrawings: () => void;
}

export function DrawingsManagerModal({
  isOpen,
  onClose,
  drawings,
  selectedDrawingId,
  isAllDrawingsLocked = false,
  onSelectDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
  onClearAllDrawings,
}: DrawingsManagerModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!isOpen || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A]/80 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <h3 className="font-mono text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">
              Drawings Manager ({drawings.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-lg"
          >
            ×
          </button>
        </div>

        {/* List of Drawings */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {drawings.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <div className="text-3xl mb-2">✎</div>
              <p className="text-xs font-mono font-medium">No active drawings on chart.</p>
              <p className="text-[11px] text-slate-500 mt-1">Select any drawing tool from the left toolbar to draw lines, channels, or zones.</p>
            </div>
          ) : (
            drawings.map((d, idx) => {
              const isSelected = selectedDrawingId === d.id;
              const p1 = d.points[0];
              const p2 = d.points[1];
              const priceInfo = p1
                ? p2
                  ? `${formatPrice(p1.price)} → ${formatPrice(p2.price)}`
                  : `${formatPrice(p1.price)}`
                : '';

              return (
                <div
                  key={d.id}
                  onClick={() => onSelectDrawing(isSelected ? null : d.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-500/10 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  {/* Left: Color dot & Tool Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex-shrink-0 border border-black/10 ${d.hidden ? 'opacity-35' : ''}`}
                      style={{ backgroundColor: d.color || '#2563EB' }}
                    />
                    <div className="min-w-0">
                      <div className={`text-xs font-mono font-bold truncate flex items-center gap-1.5 ${d.hidden ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                        <span>{idx + 1}. {d.tool.replace(/_/g, ' ')}</span>
                        {d.text && <span className="font-normal text-slate-500 italic">"{d.text}"</span>}
                        {d.locked && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[9px] font-bold uppercase no-underline">
                            Locked
                          </span>
                        )}
                        {d.hidden && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 text-[9px] font-bold uppercase no-underline">
                            Hidden
                          </span>
                        )}
                      </div>
                      {priceInfo && (
                        <div className="text-[10.5px] font-mono text-slate-400 truncate">
                          {priceInfo}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Hide, Lock, Delete */}
                  <div
                    className="flex items-center gap-1 flex-shrink-0 ml-2"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {/* Hide / Show Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateDrawing({ ...d, hidden: !d.hidden });
                      }}
                      title={d.hidden ? 'Show drawing on chart' : 'Hide drawing on chart'}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                        d.hidden
                          ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 hover:text-blue-500'
                          : 'text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {d.hidden ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>

                    {/* Lock Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateDrawing({ ...d, locked: !d.locked });
                      }}
                      title={d.locked ? 'Unlock drawing' : 'Lock drawing'}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                        d.locked
                          ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {d.locked ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                        </svg>
                      )}
                    </button>

                    {/* 🗑️ Individual Delete Button */}
                    <button
                      type="button"
                      disabled={Boolean(d.locked || isAllDrawingsLocked)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (d.locked || isAllDrawingsLocked) return;
                        onDeleteDrawing(d.id);
                      }}
                      title={d.locked || isAllDrawingsLocked ? 'Drawing is locked — unlock to delete' : 'Delete this drawing'}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                        d.locked || isAllDrawingsLocked
                          ? 'text-slate-400 opacity-35 cursor-not-allowed'
                          : 'text-rose-500 hover:bg-rose-500/15 hover:text-rose-600 cursor-pointer'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {drawings.length > 0 && (
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">
              Click any item to highlight on chart
            </span>
            <button
              type="button"
              disabled={isAllDrawingsLocked || drawings.every((d) => d.locked)}
              onClick={() => {
                if (isAllDrawingsLocked || drawings.every((d) => d.locked)) return;
                if (window.confirm('Delete all unlocked drawings on this chart?')) {
                  onClearAllDrawings();
                  onClose();
                }
              }}
              title={isAllDrawingsLocked || drawings.every((d) => d.locked) ? 'All drawings are locked — unlock to clear' : 'Clear all unlocked drawings'}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-1.5 ${
                isAllDrawingsLocked || drawings.every((d) => d.locked)
                  ? 'text-slate-400 opacity-40 cursor-not-allowed'
                  : 'text-rose-600 hover:bg-rose-500/15 cursor-pointer'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Clear All ({drawings.length})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
