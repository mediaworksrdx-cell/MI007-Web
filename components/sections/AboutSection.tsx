'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Icon3D, Icon3DName } from '@/components/ui/Icon3D';

const forces: {
  id: string;
  desc: string;
  color: string;
  icon3d: Icon3DName;
  glow: string;
}[] = [
  { id: 'LIQUIDITY', desc: 'Hidden buy & sell pools swept by institutional algorithms', color: 'text-mint-green', icon3d: 'wave', glow: 'rgba(6, 182, 212, 0.4)' },
  { id: 'MOMENTUM', desc: 'Velocity of price displacement across micro-timeframes', color: 'text-accent-cyan', icon3d: 'lightning', glow: 'rgba(245, 158, 11, 0.4)' },
  { id: 'ABSORPTION', desc: 'Large limit orders holding key structural levels', color: 'text-cyber-gold', icon3d: 'shield', glow: 'rgba(16, 185, 129, 0.4)' },
  { id: 'STRUCTURE', desc: 'Higher timeframe order blocks guiding directional bias', color: 'text-purple-600', icon3d: 'pattern', glow: 'rgba(168, 85, 247, 0.4)' },
  { id: 'INTELLIGENCE', desc: 'Synthesized probability vectors informing execution', color: 'text-emerald-700', icon3d: 'robot', glow: 'rgba(16, 185, 129, 0.4)' },
];

export default function AboutSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [activeZone, setActiveZone] = useState<'support' | 'resistance' | 'breakout' | null>(null);

  return (
    <section
      ref={containerRef}
      id="movement"
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
            <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />
            <span className="mono text-[13px] tracking-[0.25em] uppercase font-black page-section-pill-text">
              02 // THE EXECUTION HIGHWAY — MI007
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 page-heading">
            The Infinite <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-700 to-rose-600">Candlestick Avenue</span>
          </h2>
          <p className="text-[17px] sm:text-[19px] max-w-2xl mx-auto leading-relaxed font-medium page-subtitle">
            Price action unfolds along structured corridors of liquidity. High-frequency algorithms sweep stops and test resistance along the market highway.
          </p>
        </motion.div>

        {/* ── PROCEDURAL LIQUIDITY HIGHWAY CORRIDOR (Major Institutional Panel) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative w-full h-[400px] md:h-[440px] rounded-3xl overflow-hidden border-2 highway-corridor-panel shadow-xl mb-12 p-6 flex flex-col justify-between group"
        >
          {/* Subtle Ambient Radial Gradients */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-rose-500/[0.04] rounded-full blur-3xl pointer-events-none" />

          {/* Perspective SVG Algorithmic Liquidity Corridor */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" preserveAspectRatio="none" viewBox="0 0 1000 400">
            {/* Receding Perspective Guide Lines */}
            <line x1="100" y1="400" x2="480" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="300" y1="400" x2="495" y2="180" stroke="rgba(5,150,105,0.3)" strokeWidth="1.5" />
            <line x1="700" y1="400" x2="505" y2="180" stroke="rgba(225,29,72,0.3)" strokeWidth="1.5" />
            <line x1="900" y1="400" x2="520" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />

            {/* Resistance Channel (Top) */}
            <line x1="50" y1="100" x2="950" y2="100" stroke="rgba(225,29,72,0.4)" strokeWidth="1.5" strokeDasharray="6,6" />
            {/* Support Channel (Bottom) */}
            <line x1="50" y1="310" x2="950" y2="310" stroke="rgba(5,150,105,0.4)" strokeWidth="1.5" strokeDasharray="6,6" />

            {/* Clean Price Vector Trajectory */}
            <path
              d="M 80 250 C 220 290, 350 200, 480 140 S 750 120, 920 180"
              fill="none"
              stroke="#0284C7"
              strokeWidth="2.5"
              strokeDasharray="6,6"
              opacity="0.8"
            />
          </svg>

          {/* Top Corridor HUD Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-2xl border highway-hud-bar text-[12px] sm:text-[14px] font-mono shadow-xs">
            <div className="flex items-center gap-1.5 sm:gap-2 text-cyan-400 font-bold truncate">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span>ALGORITHMIC EXECUTION CORRIDOR <span className="hidden sm:inline">// STRUCTURAL PRICE ACTION</span></span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 font-semibold text-[11px] sm:text-[14px]">
              <span>SWEEP DEPTH: <strong className="text-emerald-400 font-black">89.4%</strong></span>
              <span>|</span>
              <span>VOLATILITY: <strong className="text-amber-400 font-black">OPTIMAL</strong></span>
            </div>
          </div>

          {/* Interactive Floating HUD Callouts */}
          <div className="relative z-10 w-full h-[220px]">
            {/* Breakout Tag (Top Left) */}
            <div
              onMouseEnter={() => setActiveZone('breakout')}
              onMouseLeave={() => setActiveZone(null)}
              className="absolute top-[10%] sm:top-[18%] left-[2%] sm:left-[16%] px-2.5 sm:px-4 py-1 sm:py-2 rounded-full border-2 border-emerald-500 highway-callout-tag shadow-md cursor-pointer transition-transform hover:scale-105"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mono text-[11px] sm:text-[14px] font-black text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>BREAKOUT 82%</span>
              </div>
            </div>

            {/* Resistance Tag (Top Right) */}
            <div
              onMouseEnter={() => setActiveZone('resistance')}
              onMouseLeave={() => setActiveZone(null)}
              className="absolute top-[10%] sm:top-[18%] right-[2%] sm:right-[16%] px-2.5 sm:px-4 py-1 sm:py-2 rounded-full border-2 border-rose-500 highway-callout-tag shadow-md cursor-pointer transition-transform hover:scale-105"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mono text-[11px] sm:text-[14px] font-black text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>RESISTANCE 25,240</span>
              </div>
            </div>

            {/* Support Tag (Bottom Left) */}
            <div
              onMouseEnter={() => setActiveZone('support')}
              onMouseLeave={() => setActiveZone(null)}
              className="absolute bottom-[16%] sm:bottom-[22%] left-[2%] sm:left-[20%] px-2.5 sm:px-4 py-1 sm:py-2 rounded-full border-2 border-emerald-500 highway-callout-tag shadow-md cursor-pointer transition-transform hover:scale-105"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mono text-[11px] sm:text-[14px] font-black text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>SUPPORT 24,580</span>
              </div>
            </div>

            {/* Rejection / Downtrend Tag (Bottom Right) */}
            <div className="absolute bottom-[16%] sm:bottom-[22%] right-[2%] sm:right-[20%] px-2.5 sm:px-4 py-1 sm:py-2 rounded-full border-2 border-rose-500 highway-callout-tag shadow-md cursor-pointer">
              <div className="flex items-center gap-1.5 sm:gap-2 mono text-[11px] sm:text-[14px] font-black text-rose-400">
                <span>REJECTION 75%<span className="hidden sm:inline"> // DOWNTREND -4.23%</span></span>
              </div>
            </div>
          </div>

          {/* Active Zone Detail Flyout */}
          {activeZone ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 p-3.5 rounded-xl border highway-detail-box shadow-md mono text-[14px] flex items-center gap-3 justify-center"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold">
                {activeZone === 'breakout' && 'Aggressive buyer imbalance pushing through structural supply.'}
                {activeZone === 'resistance' && 'Institutional limit orders capping upward price discovery at 25,240.'}
                {activeZone === 'support' && 'Deep liquidity absorption defending structural floor at 24,580.'}
              </span>
            </motion.div>
          ) : (
            <div className="relative z-10 p-3 rounded-xl border highway-detail-box mono text-[14px] text-center font-bold">
              Hover over liquidity zones (Support, Resistance, Breakout) to inspect structural order flow metrics.
            </div>
          )}
        </motion.div>

        {/* 5-Stage Forces Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {forces.map((force, i) => (
            <motion.div
              key={force.id}
              initial={{ opacity: 0, y: 25 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="flex flex-col p-5 rounded-2xl border forces-card shadow-xs hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="mono text-[13px] forces-card-idx font-black">0{i + 1}</span>
                <Icon3D name={force.icon3d} size="sm" glowColor={force.glow} />
              </div>
              <h3 className={`text-[15px] font-mono font-bold tracking-widest ${force.color} mb-2 uppercase`}>
                {force.id}
              </h3>
              <p className="text-[14px] font-medium leading-relaxed font-sans forces-card-desc">
                {force.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
