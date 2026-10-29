'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ChartHotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HotkeyItem {
  keys: string[];
  label: string;
  desc: string;
}

interface HotkeySection {
  title: string;
  icon: string;
  items: HotkeyItem[];
}

const SECTIONS: HotkeySection[] = [
  {
    title: 'Drawing Tools',
    icon: '✎',
    items: [
      { keys: ['Alt', 'T'], label: 'Trendline', desc: 'Connect 2 price pivots' },
      { keys: ['Alt', 'H'], label: 'Horizontal Line', desc: 'Full-width S/R level' },
      { keys: ['Alt', 'R'], label: 'Extended Ray', desc: 'Ray projecting rightward' },
      { keys: ['Alt', 'F'], label: 'Fibonacci Retracement', desc: '0.618 golden pocket' },
      { keys: ['Alt', 'C'], label: 'Parallel Channel', desc: '3-point trend channel' },
      { keys: ['Alt', 'M'], label: 'Measure Tool', desc: 'Price % delta & bars' },
    ],
  },
  {
    title: 'Precision & Object Controls',
    icon: '🧲',
    items: [
      { keys: ['Shift'], label: 'Magnet Snap (Hold)', desc: 'Snap to OHLC wicks' },
      { keys: ['Delete'], label: 'Delete Selected', desc: 'Remove active drawing' },
      { keys: ['Ctrl', 'Z'], label: 'Undo Drawing', desc: 'Revert last drawing' },
      { keys: ['Esc'], label: 'Cancel / Deselect', desc: 'Return to cursor mode' },
    ],
  },
  {
    title: 'Navigation & Axis Zoom',
    icon: '🧭',
    items: [
      { keys: ['Space'], label: 'Jump to Live', desc: 'Snap to live candle' },
      { keys: ['Drag Y-Axis'], label: 'Stretch Price', desc: 'Drag right price axis' },
      { keys: ['Drag X-Axis'], label: 'Candle Spacing', desc: 'Drag bottom time axis' },
      { keys: ['Double Click'], label: 'Auto-Fit Axis', desc: 'Reset price/time scale' },
      { keys: ['Wheel'], label: 'Pan Chart', desc: 'Scroll historical candles' },
      { keys: ['Ctrl', 'Wheel'], label: 'Zoom Viewport', desc: 'Expand/contract candle count' },
    ],
  },
  {
    title: 'Terminal Utilities',
    icon: '📸',
    items: [
      { keys: ['F'], label: 'Toggle Full Screen', desc: 'Expand chart to full screen' },
      { keys: ['Alt', 'S'], label: 'Chart Snapshot', desc: 'High-res card export' },
      { keys: ['?'], label: 'Cheat Sheet', desc: 'Toggle hotkeys guide' },
    ],
  },
];

export function ChartHotkeysModal({ isOpen, onClose }: ChartHotkeysModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 dark:bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col max-h-[84vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A]/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-sm border border-emerald-500/30">
              ⌨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">
                  Keyboard Shortcuts
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  TradingView Grade
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Fast keyboard execution for institutional chart navigation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span>{sec.icon}</span>
                <span>{sec.title}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {sec.items.map((it) => (
                  <div
                    key={it.label}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/80 dark:bg-[#131B2E]/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#131B2E] transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {it.label}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight truncate">
                        {it.desc}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {it.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A]/80 shrink-0 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 text-[11px]">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-bold">Esc</kbd>
            <span>or click outside to dismiss</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black transition-colors cursor-pointer shadow-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
