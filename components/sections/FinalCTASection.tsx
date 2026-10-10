'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';

export default function FinalCTASection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={containerRef}
      id="final-cta"
      className="relative min-h-screen flex flex-col items-center justify-center bg-transparent z-10 px-4 sm:px-6 py-12 sm:py-16"
    >
      {/* Clean Ambient Obsidian Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.06)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-3xl mx-auto w-full relative z-10 p-8 sm:p-12 md:p-14 rounded-3xl border final-cta-card shadow-xl my-auto"
      >
        {/* Falcon Emblem Logo Composed Neatly Into Card */}
        <div className="mb-4 sm:mb-5 relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 flex items-center justify-center">
          <Falcon3DLogo
            src="/images/logo-falcon-transparent.png"
            alt="Market Intelligence MI- 007"
            width={96}
            height={96}
            className="w-full h-full object-contain"
            popoutScale={1.08}
          />
        </div>

        <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-2 sm:mb-3 final-cta-title flex flex-col items-center justify-center gap-1">
          <span className="mono text-[11px] sm:text-[13px] tracking-[0.3em] uppercase font-black text-emerald-400 mb-0.5">
            MI-007
          </span>
          <span>Step Into</span>
          <span className="whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
            Market Intelligence
          </span>
        </h2>

        <div className="mono text-[11px] sm:text-[13px] font-extrabold uppercase tracking-[0.22em] text-emerald-400 mb-2 sm:mb-3">
          Intelligence Beyond the Noise
        </div>

        <p className="text-[14px] sm:text-[16px] max-w-lg mb-6 sm:mb-8 font-medium leading-relaxed final-cta-subtitle">
          Join quantitative desks and algorithmic traders operating at sub-millisecond precision.
        </p>

        {/* Clean Glowing CTA Button */}
        <Link
          href="/terminal"
          className="group px-8 py-3.5 sm:px-9 sm:py-4 bg-emerald-600 text-white rounded-xl text-[14px] sm:text-[16px] font-mono font-black uppercase tracking-widest shadow-md hover:bg-emerald-500 hover:shadow-lg hover:scale-[1.03] transition-all duration-300 inline-flex items-center gap-2"
        >
          <span>⚡ ENTER THE SYSTEM</span>
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>

        <p className="mt-6 sm:mt-8 text-[12px] sm:text-[13px] font-mono font-bold uppercase tracking-widest final-cta-badge-note">
          Sub-millisecond execution · Institutional Grade · Live Tri-Market Execution
        </p>
      </motion.div>
    </section>
  );
}
