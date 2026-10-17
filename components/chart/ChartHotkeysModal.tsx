'use client';

import React from 'react';

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
    title: 'Drawing Tools Quick Access',
    icon: '✎',
    items: [
      { keys: ['Alt', 'T'], label: 'Trendline', desc: 'Connect 2 price pivots' },
      { keys: ['Alt', 'H'], label: 'Horizontal Line', desc: 'Place full-width support / resistance level' },
      { keys: ['Alt', 'R'], label: 'Extended Ray', desc: 'Ray projecting indefinitely to the right' },
      { keys: ['Alt', 'F'], label: 'Fibonacci Retracement', desc: '0.236, 0.382, 0.5, 0.618 golden pocket' },
      { keys: ['Alt', 'B'], label: 'Support / Resistance Box', desc: 'Frame consolidation zones and order blocks' },
      { keys: ['Alt', 'C'], label: 'Parallel Channel', desc: '3-point ascending / descending trend channel' },
      { keys: ['Alt', 'M'], label: 'Measure Tool', desc: 'Calculate price change %, delta, and bar count' },
    ],
  },
  {
    title: 'Precision & Object Controls',
    icon: '🧲',
    items: [
      { keys: ['Shift'], label: 'Magnet Snap (Hold)', desc: 'Automatically snap drawing vertices to nearest candle Open, High, Low, Close' },
      { keys: ['Delete'], label: 'Delete Selected Drawing', desc: 'Instantly delete the active drawing or zone' },
      { keys: ['Ctrl', 'Z'], label: 'Undo Drawing', desc: 'Revert the most recently added drawing' },
      { keys: ['Esc'], label: 'Cancel / Deselect', desc: 'Exit active tool back to cursor & deselect' },
    ],
  },
  {
    title: 'Navigation & Axis Zoom',
    icon: '🧭',
    items: [
      { keys: ['Space'], label: 'Jump to Live', desc: 'Instantly snap chart viewport to live real-time candle' },
      { keys: ['Drag Y-Axis'], label: 'Stretch / Compress Price', desc: 'Click & drag right price scale vertically' },
      { keys: ['Drag X-Axis'], label: 'Adjust Candle Spacing', desc: 'Click & drag bottom time scale horizontally' },
      { keys: ['Double Click Axis'], label: 'Reset Auto-Scale', desc: 'Double click price or time axis to auto-fit' },
      { keys: ['Wheel'], label: 'Scroll / Pan', desc: 'Pan through historical candles horizontally' },
      { keys: ['Ctrl', 'Wheel'], label: 'Zoom Viewport', desc: 'Expand or contract visible candle range' },
    ],
  },
  {
    title: 'Terminal Sharing & Utilities',
    icon: '📸',
    items: [
      { keys: ['Alt', 'S'], label: 'Chart Snapshot', desc: 'Export high-res PNG with symbol, timeframe & watermark' },
      { keys: ['?'], label: 'Shortcuts Cheat Sheet', desc: 'Open this institutional keyboard reference' },
    ],
  },
];

export function ChartHotkeysModal({ isOpen, onClose }: ChartHotkeysModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-sm">
              ⌨
            </div>
            <div>
              <h3 className="font-mono text-sm font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">
                Institutional Keyboard Shortcuts
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                TradingView-compatible hotkeys for rapid execution & analysis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-lg font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span>{sec.icon}</span>
                <span>{sec.title}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sec.items.map((it) => (
                  <div
                    key={it.label}
                    className="flex items-start justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {it.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {it.desc}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {it.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 shadow-xs"
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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between text-xs text-slate-500">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] font-bold">Esc</kbd> anytime to dismiss</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
