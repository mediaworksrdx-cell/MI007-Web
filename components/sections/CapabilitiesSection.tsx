'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';

const engines = [
  { id: '01', title: 'Pattern Recognition', icon: '◈', color: '#00FF88', desc: 'Real-time detection of Order Blocks, FVGs, and Liquidity Sweeps.' },
  { id: '02', title: 'Technical Indicators', icon: '📊', color: '#00E5FF', desc: 'Adaptive EMAs, VWAP bands, RSI dynamic zones, and MACD divergence.' },
  { id: '03', title: 'Trend Topology', icon: '↗', color: '#FFD600', desc: 'Quantifying trend persistence and momentum acceleration vectors.' },
  { id: '04', title: 'Volume Footprint', icon: '▦', color: '#B388FF', desc: 'Decomposing buying vs. selling delta across individual candle bars.' },
  { id: '05', title: 'Support & Resistance', icon: '⬡', color: '#00FF88', desc: 'Automated high-timeframe structural pivots and defense zones.' },
  { id: '06', title: 'Market Microstructure', icon: '◎', color: '#00E5FF', desc: 'Level 2 depth aggregation and passive limit replenishment analysis.' },
  { id: '07', title: 'Bull / Bear Delta', icon: '⚖', color: '#FFD600', desc: 'Real-time directional pressure measuring aggressive market orders.' },
  { id: '08', title: 'Risk Probability', icon: '⛊', color: '#FF5252', desc: 'Dynamic stop-loss and take-profit invalidation modeling.' },
];

export default function CapabilitiesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section
      ref={containerRef}
      id="intelligence-engine"
      className="relative min-h-screen bg-transparent z-10 py-28 flex flex-col justify-center overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border page-section-pill mb-3 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="mono text-[13px] tracking-[0.25em] uppercase font-black page-section-pill-text">
              04 // MARKET INTELLIGENCE - 007 ENGINES
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 page-heading">
            The Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-700">Algorithmic Core</span>
          </h2>
          <p className="text-[17px] sm:text-[19px] font-medium max-w-xl mx-auto leading-relaxed page-subtitle">
            Institution-Grade Intelligence for a Smarter Tomorrow. Eight specialized quantitative engines operating simultaneously across global financial exchanges.
          </p>
        </motion.div>

        {/* 8 Engine Modular Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {engines.map((eng, idx) => (
            <motion.div
              key={eng.id}
              initial={{ opacity: 0, y: 25 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: idx * 0.05, duration: 0.5 }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="p-5 rounded-2xl border engine-card flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group overflow-hidden shadow-xs"
              style={{
                boxShadow: hoveredIdx === idx ? `0 0 25px ${eng.color}25` : undefined,
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="mono text-[13px] font-black engine-mod-id">MOD // {eng.id}</span>
                  <span className="text-lg" style={{ color: eng.color }}>{eng.icon}</span>
                </div>
                <h3 className="text-[17px] font-bold mb-2 tracking-wide font-sans engine-card-title">
                  {eng.title}
                </h3>
                <p className="text-[14px] font-medium leading-relaxed font-sans engine-card-desc">
                  {eng.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[13px] mono font-bold">
                <span className="opacity-70">STATUS</span>
                <span className="text-emerald-500 font-bold">ONLINE</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
