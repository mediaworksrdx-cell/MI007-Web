'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MarketType, MARKETS } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';

const PILLARS = [
  {
    icon: '⚡',
    title: 'Real-Time Tick Aggregation',
    desc: 'Proprietary tick simulation and aggregation pipeline achieving sub-millisecond latency across 1m to 1W timeframe aggregations with adaptive VWAP normalization.',
    color: '#00E676',
  },
  {
    icon: '📐',
    title: 'Vectorized Technical Math',
    desc: 'Precision technical indicator computation using vectorized EMA smoothing kernels, dynamic volatility bands, momentum oscillators, and Smart Money Concepts detection algorithms.',
    color: '#00B0FF',
  },
  {
    icon: '🔍',
    title: 'Multi-Layer Chart Rendering',
    desc: '10-layer Canvas rendering architecture: Grid → Volume Profile → SMC → Volume Bars → Candles → Price Line → Indicator Overlays → Sub-Panels → Crosshair → Drawing Tools.',
    color: '#FFD600',
  },
  {
    icon: '🌐',
    title: 'High-Availability Infrastructure',
    desc: 'Distributed edge deployment with regional nodes co-located with NSE (Chennai/Mumbai) and DFM (Dubai) data centers for minimal round-trip latency.',
    color: '#AB47BC',
  },
];

const REGIONS = [
  {
    flag: '🇮🇳',
    name: 'India — NSE / BSE (HQ)',
    city: 'Chennai, Tamil Nadu',
    description: 'Global headquarters in Chennai with full coverage of the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE), including all F&O instruments, NIFTY 50, BANK NIFTY, MIDCAP 150, and sectoral indices.',
    instruments: 'NIFTY 50, BANK NIFTY, SENSEX, NIFTY IT, NIFTY PHARMA, NIFTY AUTO',
    color: '#FF9800',
  },
  {
    flag: '🇦🇪',
    name: 'UAE — DFM / ADX',
    city: 'Dubai, UAE',
    description: 'Comprehensive coverage of the Dubai Financial Market (DFM) and Abu Dhabi Securities Exchange (ADX), including GCC blue chips and DIFC-listed instruments.',
    instruments: 'DFMGI, ADXGI, EMAAR, FAB, DEWA, ALDAR, ETISALAT',
    color: '#00E676',
  },
];

const TEAM = [
  { role: 'Chief Architect', title: 'Quantitative Systems Engineering', desc: 'Designed the multi-layer chart rendering engine and tick aggregation pipeline.' },
  { role: 'Head of Analytics', title: 'Technical Indicator Research', desc: 'Developed vectorized implementations of 15+ institutional-grade technical indicators.' },
  { role: 'Infrastructure Lead', title: 'Distributed Systems & Edge Compute', desc: 'Built the multi-region infrastructure ensuring <10ms latency for all three market zones.' },
];

export default function AboutPage() {
  const { market, setMarket } = useMarket();

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="min-h-screen pt-[88px] relative z-10 bg-transparent">
        {/* ── Hero ── */}
        <section className="border-b border-slate-200 bg-slate-50/70 backdrop-blur-sm py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-slate-800 text-xs font-bold mono tracking-widest uppercase">A Synthetix Analytics Product</span>
            </div>
            <h1 className="mb-6 text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Built for the{' '}
              <span className="text-emerald-700">Next Generation</span>{' '}
              of Institutional Traders
            </h1>
            <p className="text-black text-base md:text-lg leading-relaxed max-w-2xl mx-auto font-medium">
              Market Intelligence AI — MI007 bridges mathematical rigor, low-latency financial engineering,
              and multi-market microstructure to deliver an autonomous trading analytics platform
              accessible to every serious market participant.
            </p>
          </div>
        </section>

        {/* ── Engineering Pillars ── */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Engineering Architecture</h2>
            <p className="text-black text-sm font-semibold">The technical foundation powering Market Intelligence AI — MI007.</p>
            <div className="glow-divider mx-auto mt-5 max-w-xs" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PILLARS.map(({ icon, title, desc, color }) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white/90 p-6 hover:border-slate-300 transition-all shadow-sm">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border text-xl"
                    style={{ borderColor: color + '50', backgroundColor: color + '15' }}
                  >
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-[15px]">{title}</h3>
                    <p className="text-[13px] text-black leading-relaxed font-medium">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Market Coverage ── */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-black text-slate-900 mb-2 text-center">Multi-Region Coverage</h2>
          <p className="text-slate-600 text-sm text-center mb-10 font-normal">Co-located infrastructure across Indian and Gulf financial hubs.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {REGIONS.map(({ flag, name, city, description, instruments, color }) => (
              <div key={name} className="rounded-xl border border-slate-200 bg-white/90 p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{flag}</span>
                  <div>
                    <div className="font-bold text-slate-900 text-[15px]">{name}</div>
                    <div className="text-[11px] text-slate-500 mono font-medium">📍 {city}</div>
                  </div>
                </div>
                <p className="text-[12.5px] text-slate-600 leading-relaxed">{description}</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-500 font-bold mono tracking-widest uppercase mb-1.5">Instruments</div>
                  <div className="text-[12px] text-slate-900 mono font-medium leading-relaxed">{instruments}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quant Philosophy ── */}
        <section className="border-t border-slate-200 bg-slate-50/70 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <div className="mb-5 flex justify-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/80 border-2 border-amber-400 flex items-center justify-center p-2 shadow-lg shadow-amber-500/20">
                <Image
                  src="/images/logo-falcon-transparent.png"
                  alt="Market Intelligence AI — MI007"
                  width={54}
                  height={54}
                  className="drop-shadow-[0_2px_8px_rgba(180,83,9,0.3)] object-contain"
                />
              </div>
            </div>
            <blockquote className="text-lg md:text-xl italic font-semibold text-slate-800 leading-relaxed">
              &ldquo;The best trading decisions are made not on emotion, but on the precise mathematical
              analysis of price, volume, and order flow — across every market on earth.&rdquo;
            </blockquote>
            <p className="mt-4 text-slate-500 text-sm font-medium">— Market Intelligence AI — MI007 Engineering Team</p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
