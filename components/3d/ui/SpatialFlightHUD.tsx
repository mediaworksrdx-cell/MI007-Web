// ─── Spatial Flight HUD ───
// Multi-scale resolution indicator, Temporal replay bar, Spatial instrument search, and inspection HUD
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpatialCandle } from '../market/ProceduralCandleEngine';
import { LiquidityPoolInfo } from '../liquidity/VolumetricLiquidityEngine';
import { SpatialEngineModule } from '../engines/EightEnginesNetwork';
import { MarketSignalObject } from '../intelligence/AISignalPhysics';
import { ComputationalLayerInfo } from '../intelligence/AICoreComputationalWorld';
import { ReasoningStageInfo } from '../intelligence/AIReasoningPathway';

interface SpatialFlightHUDProps {
  scrollProgress: number;
  cameraState: string;
  selectedCandle: SpatialCandle | null;
  selectedPool: LiquidityPoolInfo | null;
  selectedEngine: SpatialEngineModule | null;
  selectedSignal: MarketSignalObject | null;
  selectedLayer: ComputationalLayerInfo | null;
  selectedStage: ReasoningStageInfo | null;
  isFreeOrbit: boolean;
  onToggleFreeOrbit: () => void;
  replayProgress: number;
  onReplayChange: (progress: number) => void;
  isPlayingReplay: boolean;
  onTogglePlayReplay: () => void;
  replaySpeed: number;
  onSetReplaySpeed: (speed: number) => void;
  onSearchSelect: (symbol: string) => void;
}

const MULTI_SCALE_LEVELS = [
  { level: 0, label: 'L0 // Global Market Regime', range: [0, 0.15] },
  { level: 1, label: 'L1 // Multi-Market Instruments', range: [0.15, 0.28] },
  { level: 2, label: 'L2 // Macro Market Structure', range: [0.28, 0.40] },
  { level: 3, label: 'L3 // Candlestick Avenue', range: [0.40, 0.52] },
  { level: 4, label: 'L4 // Technical Indicators', range: [0.52, 0.62] },
  { level: 5, label: 'L5 // Volumetric Liquidity', range: [0.62, 0.72] },
  { level: 6, label: 'L6 // 8 Intelligence Engines', range: [0.72, 0.82] },
  { level: 7, label: 'L7 // AI Computational Core', range: [0.82, 0.90] },
  { level: 8, label: 'L8 // Spatial Command Terminal', range: [0.90, 0.97] },
  { level: 9, label: 'L9 // Institutional Execution', range: [0.97, 1.0] },
];

export default function SpatialFlightHUD({
  scrollProgress,
  cameraState,
  selectedCandle,
  selectedPool,
  selectedEngine,
  selectedSignal,
  selectedLayer,
  selectedStage,
  isFreeOrbit,
  onToggleFreeOrbit,
  replayProgress,
  onReplayChange,
  isPlayingReplay,
  onTogglePlayReplay,
  replaySpeed,
  onSetReplaySpeed,
  onSearchSelect,
}: SpatialFlightHUDProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Active Multi-Scale World Level
  const currentLevel = React.useMemo(() => {
    const found = MULTI_SCALE_LEVELS.find(
      (l) => scrollProgress >= l.range[0] && scrollProgress <= l.range[1]
    );
    return found || MULTI_SCALE_LEVELS[0];
  }, [scrollProgress]);

  const searchableSymbols = [
    'NIFTY 50',
    'S&P 500',
    'BTC/USD',
    'NASDAQ 100',
    'DFM GENERAL',
    'RELIANCE',
    'NVDA',
    'AAPL',
    'EMAAR',
  ];

  const filteredSymbols = searchableSymbols.filter((s) =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none overflow-hidden font-mono">
      {/* ── 1. Top HUD Bar (Right below Navbar) ── */}
      <div className="absolute top-20 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Multi-Scale World Level & Camera State */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-xs text-white shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">{currentLevel.label}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 font-semibold tracking-wider">STATE: {cameraState}</span>
        </div>

        {/* Right: Spatial Search & Orbit Toggle */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Spatial Instrument Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="SEARCH INSTRUMENT..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDrop(true);
              }}
              onFocus={() => setShowSearchDrop(true)}
              className="bg-slate-950/80 backdrop-blur-md border border-slate-700/80 focus:border-emerald-400 px-3 py-1.5 rounded-xl text-xs text-white placeholder-slate-400 w-44 sm:w-56 outline-none transition-all"
            />
            {showSearchDrop && searchQuery.length > 0 && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-slate-950/95 border border-slate-700 rounded-xl overflow-hidden shadow-2xl py-1 z-40">
                {filteredSymbols.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      onSearchSelect(sym);
                      setSearchQuery('');
                      setShowSearchDrop(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-300 flex items-center justify-between"
                  >
                    <span>{sym}</span>
                    <span className="text-[10px] text-emerald-400">NAVIGATE →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Camera Flight Mode Toggle */}
          <button
            onClick={onToggleFreeOrbit}
            title={isFreeOrbit ? 'Switch to Cinematic Scroll Director' : 'Switch to Free Spatial Orbit'}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xl flex items-center gap-1.5 ${
              isFreeOrbit
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-950/80 border-slate-700/80 text-slate-300 hover:border-slate-500'
            }`}
          >
            <span>{isFreeOrbit ? '🌐 FREE ORBIT' : '🎬 SCROLL DIRECTOR'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Bottom Right: Live Contextual Inspector HUD ── */}
      <AnimatePresence>
        {(selectedCandle || selectedPool || selectedEngine || selectedSignal || selectedLayer || selectedStage) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto absolute bottom-24 right-4 max-w-sm w-full bg-slate-950/90 backdrop-blur-xl border-2 border-emerald-500/50 rounded-2xl p-4 text-xs text-white shadow-2xl space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-emerald-400 tracking-wider">
                SPATIAL INSPECTION TELEMETRY
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                LIVE
              </span>
            </div>

            {/* Candle Inspection */}
            {selectedCandle && (
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-300">
                  <span>TIME: {selectedCandle.time}</span>
                  <span className={selectedCandle.isBull ? 'text-emerald-400' : 'text-rose-400'}>
                    {selectedCandle.regime}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                  <div>OPEN: <span className="text-white">{selectedCandle.open}</span></div>
                  <div>HIGH: <span className="text-white">{selectedCandle.high}</span></div>
                  <div>LOW: <span className="text-white">{selectedCandle.low}</span></div>
                  <div>CLOSE: <span className="text-white font-bold">{selectedCandle.close}</span></div>
                </div>
                <div className="text-[11px] text-slate-400">
                  VOLUME: <span className="text-emerald-300">{selectedCandle.volume.toLocaleString()} UNITS</span>
                </div>
                {selectedCandle.signal && (
                  <div className="mt-1 p-1 bg-cyan-950/60 border border-cyan-500/40 rounded text-cyan-300 text-center font-bold">
                    SIGNAL DETECTED: {selectedCandle.signal}
                  </div>
                )}
              </div>
            )}

            {/* Liquidity Wall Inspection */}
            {selectedPool && (
              <div className="space-y-1">
                <div className="font-bold text-cyan-300">{selectedPool.label}</div>
                <div className="text-slate-300">DEPTH: {selectedPool.depth}</div>
                <div className="text-slate-400">VOLUME: {selectedPool.volume}</div>
                <div className="text-emerald-400 text-[11px]">RATE: {selectedPool.absorptionRate}</div>
              </div>
            )}

            {/* Engine Inspection */}
            {selectedEngine && (
              <div className="space-y-1">
                <div className="flex justify-between font-bold" style={{ color: selectedEngine.color }}>
                  <span>MOD // {selectedEngine.modNum}</span>
                  <span>{selectedEngine.metric}</span>
                </div>
                <div className="text-white font-bold">{selectedEngine.title}</div>
                <div className="text-slate-400 text-[11px]">{selectedEngine.desc}</div>
              </div>
            )}

            {/* Signal Inspection */}
            {selectedSignal && (
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-emerald-400">
                  <span>{selectedSignal.type}</span>
                  <span>{selectedSignal.confidence}% CONVICTION</span>
                </div>
                <div className="text-white font-bold">{selectedSignal.symbol} @ {selectedSignal.price}</div>
              </div>
            )}

            {/* Layer Inspection */}
            {selectedLayer && (
              <div className="space-y-1">
                <div className="font-bold text-cyan-300">{selectedLayer.id} // {selectedLayer.name}</div>
                <div className="text-slate-300">{selectedLayer.subtitle}</div>
                <div className="text-slate-400 text-[11px]">THROUGHPUT: {selectedLayer.tensors} · LATENCY: {selectedLayer.latency}</div>
              </div>
            )}

            {/* Reasoning Stage Inspection */}
            {selectedStage && (
              <div className="space-y-1">
                <div className="font-bold text-amber-300">STAGE {selectedStage.step}: {selectedStage.name}</div>
                <div className="text-emerald-400 font-bold">{selectedStage.metric}</div>
                <div className="text-slate-300 text-[11px]">{selectedStage.details}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. Bottom Left: Temporal Market Replay Controls ── */}
      <div className="pointer-events-auto absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 text-xs text-white shadow-2xl flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            TEMPORAL MARKET REPLAY
          </span>
          <span>{Math.round(replayProgress * 100)}% PLAYBACK</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Play / Pause Button */}
          <button
            onClick={onTogglePlayReplay}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-black text-white transition-colors"
          >
            {isPlayingReplay ? '⏸ PAUSE' : '▶ PLAY'}
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => onSetReplaySpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  replaySpeed === spd ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}X
              </button>
            ))}
          </div>

          {/* Scrubber slider */}
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.01}
            value={replayProgress}
            onChange={(e) => onReplayChange(parseFloat(e.target.value))}
            className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
