'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function FinalCTASection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={containerRef}
      id="final-cta"
      className="relative min-h-screen flex flex-col items-center justify-center bg-transparent z-10 px-6 py-28 overflow-hidden"
    >
      {/* Clean Ambient Obsidian Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.06)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-3xl mx-auto w-full relative z-10 p-10 sm:p-16 rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-2xl shadow-xl"
      >
        {/* Falcon Emblem Logo on Midnight Blue Background */}
        <div className="mb-6 relative h-28 w-28 rounded-3xl bg-[#0A192F] border border-blue-900/60 flex items-center justify-center p-3 shadow-2xl shadow-blue-950/30 flex-shrink-0">
          <Image
            src="/images/logo-falcon-transparent.png"
            alt="Market Intelligence AI — MI007"
            width={96}
            height={96}
            className="object-contain drop-shadow-[0_0_20px_rgba(0,255,136,0.35)]"
          />
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-800 text-[13px] font-mono mb-6 uppercase tracking-widest font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          MARKET INTELLIGENCE AI — MI007
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight mb-4">
          Step Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-800 to-emerald-700">Market Intelligence AI</span>
          <span className="block mt-2 font-mono text-2xl sm:text-3xl font-extrabold text-amber-600">MI007</span>
        </h2>

        <p className="text-[17px] sm:text-[19px] text-black max-w-lg mb-8 font-medium leading-relaxed">
          Institution-Grade Intelligence for a Smarter Tomorrow. Join quantitative desks and algorithmic traders operating at sub-millisecond precision.
        </p>

        {/* Clean Glowing CTA Button */}
        <Link
          href="/terminal"
          className="group px-9 py-4 bg-emerald-600 text-white rounded-xl text-[15px] sm:text-[17px] font-mono font-black uppercase tracking-widest shadow-md hover:bg-emerald-500 hover:shadow-lg hover:scale-[1.03] transition-all duration-300 inline-flex items-center gap-2"
        >
          <span>⚡ ENTER THE SYSTEM</span>
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>

        <p className="mt-8 text-[13px] font-mono text-black font-bold uppercase tracking-widest">
          Sub-millisecond execution · Institutional Grade · Live Tri-Market Execution
        </p>
      </motion.div>
    </section>
  );
}
