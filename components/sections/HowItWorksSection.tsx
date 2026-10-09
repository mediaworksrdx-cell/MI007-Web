'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';

export default function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [selectedSide, setSelectedSide] = useState<'bull' | 'bear'>('bull');

  return (
    <section
      ref={containerRef}
      id="ai-analysis"
      className="relative min-h-screen bg-transparent z-10 py-28 flex flex-col justify-center overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6 w-full">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border page-section-pill mb-3 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="mono text-[13px] tracking-[0.25em] uppercase font-black page-section-pill-text whitespace-nowrap">
              03 // MARKET INTELLIGENCE MI- 007 ANALYSIS
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 page-heading">
            Bull Acceleration <span className="opacity-50 font-light">vs.</span> Bear Capitulation
          </h2>
          <p className="text-[17px] sm:text-[19px] max-w-xl mx-auto leading-relaxed font-normal page-subtitle">
            AI constantly measures the tug-of-war between aggressive market buyers and defensive institutional sellers.
          </p>
        </motion.div>

        {/* ── INSTITUTIONAL DUAL SPLIT-SCREEN QUANT PANELS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* 🐂 Bull Expansion Panel */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15 }}
            onClick={() => setSelectedSide('bull')}
            className={`relative rounded-3xl border-2 transition-all duration-300 cursor-pointer group shadow-lg flex flex-col justify-between p-4 sm:p-7 min-h-[380px] overflow-hidden quant-split-panel quant-panel-bull ${
              selectedSide === 'bull' ? 'quant-panel-active-bull' : ''
            }`}
          >
            {/* Ambient Background Gradient Accent */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top Badge & Metric */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-white/10">
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-emerald-500 bg-emerald-500/10 text-emerald-400 mono text-[12px] sm:text-[14px] font-bold flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>BULL ACCUMULATION // +12.48% ▲</span>
              </div>
              <div className="text-left sm:text-right">
                <span className="mono text-[11px] sm:text-[13px] opacity-70 font-black block">BUY DELTA</span>
                <span className="mono text-[15px] sm:text-[17px] text-emerald-400 font-black">+4.8M TENSORS</span>
              </div>
            </div>

            {/* Live Quantitative Flow Matrix */}
            <div className="relative z-10 py-4 sm:py-6 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3.5 rounded-xl border quant-metric-box shadow-xs">
                  <span className="text-[11px] sm:text-[13px] mono opacity-70 font-bold block mb-1">MOMENTUM</span>
                  <span className="text-[14px] sm:text-[17px] font-mono font-bold">+8.32%</span>
                </div>
                <div className="p-2.5 sm:p-3.5 rounded-xl border quant-metric-box shadow-xs">
                  <span className="text-[11px] sm:text-[13px] mono opacity-70 font-bold block mb-1">IMBALANCE</span>
                  <span className="text-[14px] sm:text-[17px] font-mono font-bold text-emerald-400">3.8 : 1</span>
                </div>
                <div className="p-2.5 sm:p-3.5 rounded-xl border quant-metric-box shadow-xs">
                  <span className="text-[11px] sm:text-[13px] mono opacity-70 font-bold block mb-1">VWAP BIAS</span>
                  <span className="text-[14px] sm:text-[17px] font-mono font-bold text-cyan-400">+3.4° UP</span>
                </div>
              </div>

              {/* Order Book Liquidity Depth Bars */}
              <div className="space-y-1.5 pt-1 sm:pt-2">
                <div className="flex justify-between text-[12px] sm:text-[14px] mono font-bold">
                  <span className="truncate pr-2">BUY WALL DEPTH (24,800 - 24,840)</span>
                  <span className="text-emerald-400 font-bold shrink-0">84% ABSORPTION</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/20 overflow-hidden flex gap-1 p-0.5">
                  <div className="h-full bg-emerald-500 rounded-full w-[84%]" />
                  <div className="h-full bg-white/10 rounded-full w-[16%]" />
                </div>
              </div>
            </div>

            {/* Bottom Insight Card */}
            <div className="relative z-10 p-3.5 sm:p-4 rounded-2xl border quant-insight-box shadow-md space-y-2 mt-auto">
              <div className="flex items-center justify-between text-[13px] sm:text-[14px] font-mono">
                <span className="font-bold opacity-80">SMART MONEY:</span>
                <span className="text-emerald-400 font-black text-[14px] sm:text-[15px]">96.4% CONVICTION</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden">
                <div className="h-full bg-emerald-500 w-[96.4%]" />
              </div>
              <p className="text-[13px] sm:text-[14px] font-medium leading-relaxed font-sans pt-1 opacity-90">
                Aggressive buying volume breaking overhead liquidity blocks. Higher-low structural formation confirmed on H4 timeframe.
              </p>
            </div>
          </motion.div>

          {/* 🐻 Bear Distribution Panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.25 }}
            onClick={() => setSelectedSide('bear')}
            className={`relative rounded-3xl border-2 transition-all duration-300 cursor-pointer group shadow-lg flex flex-col justify-between p-4 sm:p-7 min-h-[380px] overflow-hidden quant-split-panel quant-panel-bear ${
              selectedSide === 'bear' ? 'quant-panel-active-bear' : ''
            }`}
          >
            {/* Ambient Background Gradient Accent */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top Badge & Metric */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 sm:pb-6 border-b border-white/10">
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-rose-500 bg-rose-500/10 text-rose-400 mono text-[12px] sm:text-[14px] font-bold flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>BEAR DISTRIBUTION // -8.24% ▼</span>
              </div>
              <div className="text-left sm:text-right">
                <span className="mono text-[11px] sm:text-[13px] opacity-70 font-black block">SELL DELTA</span>
                <span className="mono text-[15px] sm:text-[17px] text-rose-400 font-black">-3.9M TENSORS</span>
              </div>
            </div>

            {/* Live Quantitative Flow Matrix */}
            <div className="relative z-10 py-4 sm:py-6 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3.5 rounded-xl border quant-metric-box shadow-xs">
                  <span className="text-[11px] sm:text-[13px] mono opacity-70 font-bold block mb-1">RESISTANCE</span>
                  <span className="text-[14px] sm:text-[17px] font-mono font-bold">25,320</span>
                </div>
                <div className="p-2.5 sm:p-3.5 rounded-xl border quant-metric-box shadow-xs">
                  <span className="text-[11px] sm:text-[13px] mono opacity-70 font-bold block mb-1">DRAIN VELOCITY</span>
                  <span className="text-[14px] sm:text-[17px] font-mono font-bold text-rose-400">-5.17%</span>
                </div>
                <div className="p-2.5 sm:p-3.5 rounded-xl border quant-metric-box shadow-xs">
                  <span className="text-[11px] sm:text-[13px] mono opacity-70 font-bold block mb-1">SUPPLY WALL</span>
                  <span className="text-[14px] sm:text-[17px] font-mono font-bold text-amber-400">ACTIVE</span>
                </div>
              </div>

              {/* Order Book Liquidity Depth Bars */}
              <div className="space-y-1.5 pt-1 sm:pt-2">
                <div className="flex justify-between text-[12px] sm:text-[14px] mono font-bold">
                  <span className="truncate pr-2">SELL SUPPLY DUMP (25,280 - 25,320)</span>
                  <span className="text-rose-400 font-bold shrink-0">92% EXHAUSTION</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/20 overflow-hidden flex gap-1 p-0.5">
                  <div className="h-full bg-rose-500 rounded-full w-[92%]" />
                  <div className="h-full bg-white/10 rounded-full w-[8%]" />
                </div>
              </div>
            </div>

            {/* Bottom Insight Card */}
            <div className="relative z-10 p-3.5 sm:p-4 rounded-2xl border quant-insight-box shadow-md space-y-2 mt-auto">
              <div className="flex items-center justify-between text-[13px] sm:text-[14px] font-mono">
                <span className="font-bold opacity-80">RESISTANCE:</span>
                <span className="text-rose-400 font-black text-[14px] sm:text-[15px]">92.1% CONVICTION</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden">
                <div className="h-full bg-rose-500 w-[92.1%]" />
              </div>
              <p className="text-[13px] sm:text-[14px] font-medium leading-relaxed font-sans pt-1 opacity-90">
                Institutional supply dumping into bid absorption pools. Exhaustion detected at 25,320 resistance with negative delta velocity.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Telemetry Footer */}
        <div className="p-4 rounded-2xl border quant-summary-bar flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold opacity-80">AI SYNTHESIS:</span>
            <strong className="font-black">NET ORDER FLOW CONVERGENCE</strong>
          </div>
          <div className="flex items-center gap-6 text-[11px] font-bold">
            <span>DELTA RATIO: <strong className="text-emerald-400">+1.42</strong></span>
            <span>|</span>
            <span>ABSORPTION STATUS: <strong className="text-cyan-400">DEFENDING 24,780</strong></span>
            <span>|</span>
            <span>EXECUTION RECOMMENDATION: <strong className="text-emerald-400">LONG BIAS</strong></span>
          </div>
        </div>
      </div>
    </section>
  );
}
