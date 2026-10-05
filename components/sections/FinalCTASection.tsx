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
        {/* Recreated Falcon Emblem Logo with Light Blur Gradient */}
        <div className="mb-6 relative h-28 w-28 sm:h-32 sm:w-32 rounded-3xl overflow-hidden border border-sky-300/80 shadow-2xl shadow-sky-500/20 flex-shrink-0 flex items-center justify-center">
          <Image
            src="/images/logo-falcon-gradient.png"
            alt="Market Intelligence AI — MI007"
            width={128}
            height={128}
            className="w-full h-full object-cover"
          />
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
