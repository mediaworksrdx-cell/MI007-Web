'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const tokenTypes = [
  { text: 'PRICE ACTION', color: 'text-slate-900 font-bold' },
  { text: 'RSI 64.2', color: 'text-cyan-700' },
  { text: 'EMA 21 CROSS', color: 'text-blue-700' },
  { text: 'MACD HIST', color: 'text-emerald-700' },
  { text: 'VOLUME 3.4M', color: 'text-purple-700' },
  { text: 'BULL DELTA', color: 'text-emerald-700' },
  { text: 'BEAR SWEEP', color: 'text-rose-700' },
  { text: 'SUPPORT 24.8K', color: 'text-amber-700' },
  { text: 'TREND +1.40%', color: 'text-emerald-700' },
  { text: 'MOMENTUM AI', color: 'text-cyan-700' },
  { text: 'ORDER BLOCK', color: 'text-amber-700' },
  { text: 'FVG GAP ZONE', color: 'text-emerald-700' },
];

export default function WhySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [tokens, setTokens] = useState<any[]>([]);

  useEffect(() => {
    const list = Array.from({ length: 48 }).map((_, i) => {
      const type = tokenTypes[i % tokenTypes.length];
      const startX = (Math.random() > 0.5 ? 1 : -1) * (window.innerWidth * 0.6);
      const startY = (Math.random() > 0.5 ? 1 : -1) * (window.innerHeight * 0.4);

      return {
        id: i,
        ...type,
        startX,
        startY,
        delay: (i % 8) * 0.08,
      };
    });
    setTokens(list);
  }, []);

  return (
    <section
      ref={containerRef}
      id="market-intelligence"
      className="relative min-h-screen bg-transparent z-10 py-28 flex flex-col items-center justify-center overflow-hidden pointer-events-none"
    >
      <div className="max-w-5xl mx-auto px-6 w-full text-center relative z-10 mb-12 pointer-events-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-200 bg-slate-100 backdrop-blur-md mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="mono text-[13px] tracking-[0.25em] text-black uppercase font-black">
            06 // MARKET INTELLIGENCE AI — MI007
          </span>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4"
        >
          Convergence Into a <span className="font-extrabold text-emerald-700">Singular Layer</span>
        </motion.h2>
        <p className="text-[17px] sm:text-[19px] text-black font-medium max-w-xl mx-auto leading-relaxed">
          Where thousands of isolated micro-signals unite into one coherent, institutional-grade perspective.
        </p>
      </div>

      {/* Synchronized Token Cloud (Even Uniform Grid) */}
      <div className="relative w-full max-w-6xl mx-auto flex items-center justify-center pointer-events-auto px-4 sm:px-6 my-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3 w-full">
          {tokens.map((token) => (
            <motion.div
              key={token.id}
              initial={{ x: token.startX, y: token.startY, opacity: 0, scale: 0.5 }}
              animate={isInView ? { x: 0, y: 0, opacity: 1, scale: 1 } : {}}
              transition={{
                duration: 0.9,
                delay: token.delay,
                ease: 'easeOut',
              }}
              className="w-full h-11 flex items-center justify-center px-1.5 sm:px-2.5 rounded-xl border border-slate-200/90 bg-white/95 backdrop-blur-md text-[10.5px] sm:text-[11.5px] lg:text-[12px] font-mono font-bold tracking-tight whitespace-nowrap text-center shadow-xs hover:border-emerald-500/60 hover:shadow-md transition-all overflow-hidden"
            >
              <span className={token.color}>{token.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Atmospheric Conclusion */}
      <div className="max-w-2xl mx-auto px-6 w-full text-center mt-12 relative z-10 pointer-events-auto">
        <div className="text-3xl sm:text-4xl md:text-5xl font-light text-slate-900 flex flex-col gap-2">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            One market.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="text-black font-semibold"
          >
            Multiple dimensions.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900"
          >
            One living intelligence system.
          </motion.div>
        </div>
      </div>
    </section>
  );
}
