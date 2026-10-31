'use client';

import React from 'react';

export interface SmcInspectorData {
  title: string;
  type: string;
  timeframe: string;
  formationTime: string;
  priceBoundaries: string;
  detectionRule: string;
  currentStatus: string;
  invalidation: string;
  target?: string;
  riskReward?: string;
}

interface SmcInspectorModalProps {
  data: SmcInspectorData | null;
  onClose: () => void;
}

export function SmcInspectorModal({ data, onClose }: SmcInspectorModalProps) {
  if (!data) return null;

  const isBullish =
    data.title.toLowerCase().includes('bull') ||
    data.title.toLowerCase().includes('+bos') ||
    data.title.toLowerCase().includes('+choch') ||
    data.title.toLowerCase().includes('demand') ||
    data.title.toLowerCase().includes('ssl') ||
    data.type.toLowerCase().includes('bull') ||
    data.type.toLowerCase().includes('long');

  return (
    <div
      className="absolute bottom-12 left-4 z-50 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md shadow-2xl p-4 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono font-black text-[10px] px-1.5 py-0.5 rounded border ${
              isBullish
                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            SMC
          </span>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
              {data.title}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {data.type} • {data.timeframe}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
        >
          ✕
        </button>
      </div>

      {/* Body details */}
      <div className="py-2.5 space-y-2 text-[11px]">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Current Status:</span>
          <span
            className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
              data.currentStatus.includes('Active') || data.currentStatus.includes('Confirmed')
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
            }`}
          >
            {data.currentStatus}
          </span>
        </div>

        {/* Price Boundaries */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Price Boundaries:</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {data.priceBoundaries}
          </span>
        </div>

        {/* Formation Time */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Formation Time:</span>
          <span className="font-mono text-[10.5px] text-slate-700 dark:text-slate-300">
            {data.formationTime}
          </span>
        </div>

        {/* Detection Rule */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            Detection Rule
          </div>
          <div className="text-[10.5px] text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            {data.detectionRule}
          </div>
        </div>

        {/* Invalidation Conditions */}
        <div className="pt-1">
          <div className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-0.5">
            Invalidation Condition
          </div>
          <div className="text-[10.5px] text-slate-700 dark:text-slate-300 leading-relaxed bg-rose-50/40 dark:bg-rose-500/10 p-2 rounded-lg border border-rose-200/50 dark:border-rose-500/20">
            {data.invalidation}
          </div>
        </div>

        {data.target && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500 dark:text-slate-400">Target / R:R:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {data.target} {data.riskReward ? `(${data.riskReward})` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>Click anywhere to dismiss</span>
        <button
          type="button"
          onClick={onClose}
          className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
