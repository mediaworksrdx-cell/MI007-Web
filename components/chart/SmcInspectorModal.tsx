'use client';

import React from 'react';

export interface SmcInspectorData {
  title: string;
  type: string;
  timeframe: string;
  direction?: 'BULLISH' | 'BEARISH';
  htfBias?: 'BULLISH' | 'BEARISH' | 'RANGE';
  ltfBias?: 'BULLISH' | 'BEARISH' | 'RANGE';
  entryPrice?: number | string;
  stopLoss?: number | string;
  target1?: number | string; // RR 1:1.5
  target2?: number | string; // RR 1:2.0
  riskDistance?: number | string;
  rewardDistance?: number | string;
  confluenceScore?: number;
  setupStatus?: 'Active' | 'Invalidated' | 'Target Hit' | 'Stop Hit';
  // Backwards-compatible fields
  formationTime?: string;
  priceBoundaries?: string;
  detectionRule?: string;
  currentStatus?: string;
  invalidation?: string;
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
    data.direction === 'BULLISH' ||
    data.title.toLowerCase().includes('bull') ||
    data.title.toLowerCase().includes('+bos') ||
    data.title.toLowerCase().includes('+choch') ||
    data.title.toLowerCase().includes('demand') ||
    data.title.toLowerCase().includes('ssl') ||
    data.type.toLowerCase().includes('bull') ||
    data.type.toLowerCase().includes('long');

  const htfBias = data.htfBias || (isBullish ? 'BULLISH' : 'BEARISH');
  const setupStatus = data.setupStatus || (
    data.currentStatus?.includes('Target') ? 'Target Hit' :
    data.currentStatus?.includes('Invalid') ? 'Invalidated' :
    data.currentStatus?.includes('Stop') ? 'Stop Hit' : 'Active'
  );

  const confluenceScore = typeof data.confluenceScore === 'number'
    ? Math.min(100, Math.max(0, data.confluenceScore))
    : 85;

  return (
    <div
      className="absolute bottom-12 left-4 z-50 w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md shadow-2xl p-4 text-xs animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono font-black text-[10px] px-2 py-0.5 rounded border uppercase tracking-wide ${
              isBullish
                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            {isBullish ? '▲ LONG' : '▼ SHORT'}
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

      {/* Institutional Trade Setup Grid (10 Parameters) */}
      <div className="py-2.5 space-y-2 text-[11px]">
        {/* Direction & Status */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Direction</span>
            <span className={`font-mono font-bold text-xs mt-0.5 ${isBullish ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isBullish ? 'BULLISH (LONG)' : 'BEARISH (SHORT)'}
            </span>
          </div>
          <div className="flex flex-col bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Setup Status</span>
            <span className={`font-mono font-bold text-xs mt-0.5 ${
              setupStatus === 'Target Hit' ? 'text-emerald-600 dark:text-emerald-400' :
              setupStatus === 'Stop Hit' || setupStatus === 'Invalidated' ? 'text-rose-600 dark:text-rose-400' :
              'text-cyan-600 dark:text-cyan-400'
            }`}>
              {setupStatus}
            </span>
          </div>
        </div>

        {/* Higher-Timeframe Bias */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Higher-Timeframe Bias:</span>
          <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
            htfBias === 'BULLISH' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' :
            htfBias === 'BEARISH' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' :
            'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          }`}>
            {htfBias}
          </span>
        </div>

        {/* Entry Price & Stop Loss */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Entry Price</span>
            <span className="font-mono font-bold text-xs mt-0.5 text-slate-900 dark:text-slate-100">
              {data.entryPrice ?? (data.priceBoundaries ? data.priceBoundaries.split('|')[0]?.replace('Entry:', '').trim() : 'N/A')}
            </span>
          </div>
          <div className="flex flex-col p-2 rounded-lg bg-rose-50/40 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20">
            <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider">Stop Loss</span>
            <span className="font-mono font-bold text-xs mt-0.5 text-rose-600 dark:text-rose-400">
              {data.stopLoss ?? (data.priceBoundaries ? data.priceBoundaries.split('|')[1]?.replace('SL:', '').trim() : 'N/A')}
            </span>
          </div>
        </div>

        {/* Target 1 (RR 1:1.5) & Target 2 (RR 1:2.0) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col p-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20">
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Target 1 (RR 1:1.5)</span>
            <span className="font-mono font-bold text-xs mt-0.5 text-emerald-700 dark:text-emerald-300">
              {data.target1 ?? (data.target ? data.target.split('|')[0]?.replace('TP1:', '').trim() : 'N/A')}
            </span>
          </div>
          <div className="flex flex-col p-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20">
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Target 2 (RR 1:2.0)</span>
            <span className="font-mono font-bold text-xs mt-0.5 text-emerald-700 dark:text-emerald-300">
              {data.target2 ?? (data.target && data.target.includes('TP2') ? data.target.split('|')[1]?.replace('TP2:', '').trim() : 'N/A')}
            </span>
          </div>
        </div>

        {/* Risk Distance & Reward Distance */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Risk Distance:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {data.riskDistance ? `${data.riskDistance} pts` : 'Calculated'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reward Distance:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {data.rewardDistance ? `${data.rewardDistance} pts` : 'Calculated'}
            </span>
          </div>
        </div>

        {/* Setup Quality Score (Progress bar 0-100) */}
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Setup Quality Score (Not Win Prob)</span>
            <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
              {confluenceScore} / 100
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                confluenceScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                confluenceScore >= 60 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                'bg-gradient-to-r from-amber-500 to-orange-400'
              }`}
              style={{ width: `${confluenceScore}%` }}
            />
          </div>
        </div>

        {/* Structural Invalidation Note */}
        {data.invalidation && (
          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic px-1">
            ⚠ Invalidation: {data.invalidation}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <span>Institutional Clean SMC Engine</span>
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
