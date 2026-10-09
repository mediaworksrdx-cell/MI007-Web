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
      className="relative min-h-screen flex flex-col items-center justify-center bg-transparent z-10 px-6 py-28 overflow-hidden"
    >
      {/* Clean Ambient Obsidian Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.06)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-3xl mx-auto w-full relative z-10 p-10 sm:p-16 rounded-3xl border final-cta-card shadow-xl"
      >
        {/* Falcon Emblem Logo with Interactive 3D Pop-Up (Zero Background) */}
        <div className="mb-6 relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 flex items-center justify-center overflow-visible">
          <Falcon3DLogo
            src="/images/logo-falcon-transparent.png"
            alt="Market Intelligence MI- 007"
            width={112}
            height={112}
            className="w-full h-full object-contain"
            popoutScale={1.1}
          />
        </div>

        <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-4 final-cta-title flex flex-col items-center justify-center gap-1">
          <span>Step Into</span>
          <span className="whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
            Market Intelligence MI- 007
          </span>
        </h2>

        <p className="text-[17px] sm:text-[19px] max-w-lg mb-8 font-medium leading-relaxed final-cta-subtitle">
          <strong className="font-bold text-emerald-400">Intelligence Beyond the Noise.</strong> Join quantitative desks and algorithmic traders operating at sub-millisecond precision.
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

        <p className="mt-8 text-[13px] font-mono font-bold uppercase tracking-widest final-cta-badge-note">
          Sub-millisecond execution · Institutional Grade · Live Tri-Market Execution
        </p>
      </motion.div>
    </section>
  );
}
