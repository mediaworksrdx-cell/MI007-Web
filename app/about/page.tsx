'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MarketType, MARKETS } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';

const MI_EDGE = [
  {
    icon: '🛡️',
    title: 'Battle-Tested DNA',
    tag: '30+ Years Heritage',
    desc: 'Built on three decades of institutional trading, risk management, and quantitative strategy.',
    border: 'border-emerald-200/80',
    bg: 'from-emerald-50/80 to-emerald-100/30',
  },
  {
    icon: '🌐',
    title: '3-Market Dominance',
    tag: 'US, India & UAE',
    desc: 'Instant, AI-driven cross-border intelligence bridging US, Indian, and UAE equities.',
    border: 'border-sky-200/80',
    bg: 'from-sky-50/80 to-sky-100/30',
  },
  {
    icon: '⚡',
    title: 'Unfair Advantage',
    tag: 'Alpha Detection',
    desc: 'High-precision algorithmic insights that detect alpha before the retail market even wakes up.',
    border: 'border-amber-200/80',
    bg: 'from-amber-50/80 to-amber-100/30',
  },
];

const TRADING_STYLES = [
  {
    icon: '⚡',
    title: 'High-Speed Scalping',
    badge: 'Sub-Minute Execution',
    desc: 'Sub-minute liquidity routing and immediate order-book anomaly detection.',
  },
  {
    icon: '📊',
    title: 'Intraday Momentum',
    badge: '3 Time Zones',
    desc: 'Real-time volume spikes and volatility breakouts across all three execution time zones.',
  },
  {
    icon: '🌊',
    title: 'Swing Trading',
    badge: 'Multi-Day Forecasts',
    desc: 'Multi-day trend predictions driven by macro sentiment shifts and machine learning.',
  },
  {
    icon: '🎯',
    title: 'Options Architecture',
    badge: 'Derivatives & IV',
    desc: 'Advanced implied volatility analytics, unusual options activity tracking, and dynamic spread modeling.',
  },
  {
    icon: '💎',
    title: 'Long-Term Alpha',
    badge: 'Fundamental AI',
    desc: 'Algorithmic fundamental screening to identify deeply mispriced, high-growth equity assets.',
  },
];

const REGIONS = [
  {
    flag: '🇺🇸',
    name: 'USA — NYSE / NASDAQ',
    city: 'New York, USA',
    description: 'Direct optical interconnects to Wall Street and New Jersey data centers with institutional microstructure coverage across the NYSE, NASDAQ, S&P 500, NASDAQ 100, and mega-cap equity derivatives.',
    instruments: 'S&P 500, NASDAQ 100, DOW JONES, NVDA, AAPL, MSFT, TSLA, AMZN',
    color: '#0284C7',
  },
  {
    flag: '🇮🇳',
    name: 'India — NSE / BSE (HQ)',
    city: 'Chennai, Tamil Nadu',
    description: 'Global engineering headquarters in Chennai with full coverage of the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE), including all F&O instruments, NIFTY 50, BANK NIFTY, MIDCAP 150, and sectoral indices.',
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

export default function AboutPage() {
  const { market, setMarket } = useMarket();

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="min-h-screen pt-[88px] relative z-10 bg-transparent">
        {/* ── Hero ── */}
        <section className="border-b border-slate-200 bg-slate-50/70 backdrop-blur-sm py-20 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-slate-800 text-xs font-bold mono tracking-widest uppercase">
                Autonomous Market Intelligence
              </span>
            </div>
            
            <h1 className="mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-800 to-emerald-700">MI-007</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-900 leading-relaxed font-semibold max-w-3xl mx-auto mb-5">
              The premier market intelligence platform engineered to revolutionize how you navigate the US, Indian, and UAE stock markets.
            </p>

            <p className="text-black text-base md:text-lg leading-relaxed max-w-3xl mx-auto font-medium">
              We bridge the gap between complex financial data and actionable trading clarity. By fusing cutting-edge artificial intelligence with deep financial expertise, MI-007 delivers institutional-grade market intelligence directly to retail investors, day traders, and portfolio managers worldwide.
            </p>
          </div>
        </section>

        {/* ── Founder Story & Mission ── */}
        <section className="mx-auto max-w-5xl px-6 py-20 border-b border-slate-200/80">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 sm:p-12 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-sky-100/50 via-cyan-50/30 to-transparent pointer-events-none rounded-bl-full" />
            
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-md bg-amber-100 border border-amber-300/80 px-3 py-1 text-xs font-bold text-amber-950 mono uppercase tracking-wider mb-5">
                30+ Years Market Lineage
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-5 leading-snug">
                Forged on the Front Lines of Institutional Trading
              </h2>
              <p className="text-base sm:text-lg text-slate-800 font-medium leading-relaxed mb-6">
                Forged by founders with over 30 years of raw, front-line experience in the US and Indian stock markets, MI-007 is a high-octane market intelligence platform designed for those who refuse to settle for lagging indicators and institutional scraps.
              </p>
              <p className="text-base sm:text-lg text-slate-800 font-medium leading-relaxed">
                We don’t just aggregate data; we weaponize advanced artificial intelligence to decode complex global financial ecosystems, turning chaotic market noise into asymmetric trading advantages.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-200">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="mono text-2xl sm:text-3xl font-black text-slate-950">30+ Years</div>
                <div className="text-xs text-slate-600 font-bold uppercase tracking-wider mt-1">Front-Line Experience</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="mono text-2xl sm:text-3xl font-black text-emerald-700">3 Markets</div>
                <div className="text-xs text-slate-600 font-bold uppercase tracking-wider mt-1">US • India • UAE</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="mono text-2xl sm:text-3xl font-black text-sky-700">Sub-ms Alpha</div>
                <div className="text-xs text-slate-600 font-bold uppercase tracking-wider mt-1">Pre-Market Advantage</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── The MI-007 Edge ── */}
        <section className="mx-auto max-w-6xl px-6 py-20 border-b border-slate-200/80">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-1 shadow-xs mb-3">
              <span className="text-slate-800 text-xs font-bold mono tracking-widest uppercase">Proprietary Advantage</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">The MI-007 Edge</h2>
            <p className="text-black text-sm sm:text-base font-semibold max-w-xl mx-auto mt-2">
              Three core pillars that separate institutional-grade alpha from everyday market noise.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MI_EDGE.map(({ icon, title, tag, desc, border, bg }) => (
              <div
                key={title}
                className={`rounded-2xl border ${border} bg-gradient-to-b ${bg} p-7 hover:shadow-md transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{icon}</span>
                    <span className="text-[11px] mono font-bold px-2.5 py-0.5 rounded-full bg-white/90 border border-slate-200 text-slate-800 shadow-2xs">
                      {tag}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-950 text-xl mb-3 tracking-tight">{title}</h3>
                  <p className="text-[14px] text-slate-800 leading-relaxed font-medium">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Supported Trading Styles ── */}
        <section className="mx-auto max-w-6xl px-6 py-20 border-b border-slate-200/80">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-1 shadow-xs mb-3">
              <span className="text-slate-800 text-xs font-bold mono tracking-widest uppercase">Multi-Horizon Execution</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Supported Trading Styles</h2>
            <p className="text-black text-sm sm:text-base font-semibold max-w-xl mx-auto mt-2">
              Whether executing sub-minute liquidity routing or long-term algorithmic alpha, MI-007 is calibrated for your strategy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TRADING_STYLES.map(({ icon, title, badge, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white/95 p-6 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-100 border border-slate-200/70 inline-flex items-center justify-center">
                      {icon}
                    </span>
                    <span className="text-[10.5px] mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{title}</h3>
                  <p className="text-[13.5px] text-slate-700 leading-relaxed font-medium">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Multi-Region Coverage ── */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Multi-Region Coverage</h2>
            <p className="text-slate-600 text-sm font-normal">
              Co-located infrastructure across US, Indian, and Gulf financial hubs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {REGIONS.map(({ flag, name, city, description, instruments }) => (
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
              <div className="h-16 w-16 rounded-2xl border border-sky-300/80 overflow-hidden shadow-lg shadow-sky-500/20 flex items-center justify-center">
                <Image
                  src="/images/logo-falcon-gradient.png"
                  alt="Market Intelligence AI — MI007"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <blockquote className="text-lg md:text-xl italic font-semibold text-slate-800 leading-relaxed">
              &ldquo;The best trading decisions are made not on emotion, but on the precise mathematical
              analysis of price, volume, and order flow — across every market on earth.&rdquo;
            </blockquote>
            <p className="mt-4 text-slate-500 text-sm font-medium">— Market Intelligence AI — MI-007 Leadership Team</p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
