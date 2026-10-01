'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MarketToggle } from '@/components/market/MarketToggle';
import { MarketType, MARKETS, INSTRUMENTS } from '@/lib/types';
import { getMockQuote } from '@/lib/mockData';
import { useMarket } from '@/lib/marketContext';

// ─── Macro data (DXY, Gold, US10Y, Brent, VIX) ────────────────────────────
const MACRO = [
  { sym: 'DXY', val: '104.32', chg: '-0.18%', up: false },
  { sym: 'XAU/USD', val: '2,387.5', chg: '+0.42%', up: true },
  { sym: 'US10Y', val: '4.318%', chg: '+0.03%', up: true },
  { sym: 'BRENT', val: '82.40', chg: '-0.76%', up: false },
  { sym: 'VIX', val: '14.82', chg: '+0.55%', up: true },
  { sym: 'BTC/USD', val: '67,240', chg: '+1.24%', up: true },
  { sym: 'ETH/USD', val: '3,512', chg: '+0.88%', up: true },
];

// ─── India watchlist ───────────────────────────────────────────────────────
const INDIA_INDICES = [
  { symbol: 'NIFTY', name: 'NIFTY 50',    base: 24850 },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', base: 53200 },
  { symbol: 'SENSEX', name: 'SENSEX',     base: 82400 },
  { symbol: 'MIDCAP150', name: 'NIFTY MIDCAP 150', base: 19200 },
];
const INDIA_WATCHLIST = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', base: 2980, sector: 'Energy' },
  { symbol: 'TCS',      name: 'Tata Consultancy',    base: 4250, sector: 'IT' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank',           base: 1785, sector: 'Banking' },
  { symbol: 'INFY',     name: 'Infosys',             base: 1920, sector: 'IT' },
  { symbol: 'ITC',      name: 'ITC Ltd',             base: 488,  sector: 'FMCG' },
  { symbol: 'WIPRO',    name: 'Wipro',               base: 542,  sector: 'IT' },
];
const CRYPTO = [
  { symbol: 'BTC', name: 'Bitcoin',  base: 67240 },
  { symbol: 'ETH', name: 'Ethereum', base: 3512  },
  { symbol: 'SOL', name: 'Solana',   base: 158   },
  { symbol: 'BNB', name: 'BNB',      base: 595   },
];

// USA watchlist
const USA_INDICES = [
  { symbol: 'SPX',  name: 'S&P 500',     base: 5480 },
  { symbol: 'NDX',  name: 'NASDAQ 100',  base: 19200 },
  { symbol: 'DJI',  name: 'DOW JONES',   base: 43100 },
  { symbol: 'RUT',  name: 'RUSSELL 2000',base: 2180 },
];
const USA_WATCHLIST = [
  { symbol: 'AAPL', name: 'Apple Inc.',   base: 228, sector: 'Tech' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', base: 875, sector: 'Semis' },
  { symbol: 'MSFT', name: 'Microsoft',    base: 432, sector: 'Tech' },
  { symbol: 'TSLA', name: 'Tesla Inc.',   base: 248, sector: 'EV' },
  { symbol: 'META', name: 'Meta Platforms',base: 562, sector: 'Social' },
  { symbol: 'AMZN', name: 'Amazon',       base: 198, sector: 'eCommerce' },
];

// UAE watchlist
const UAE_INDICES = [
  { symbol: 'DFMGI', name: 'DFM General',  base: 4320 },
  { symbol: 'ADXGI', name: 'ADX General',  base: 9850 },
  { symbol: 'FADX15',name: 'FTSE ADX 15',  base: 12600 },
];
const UAE_WATCHLIST = [
  { symbol: 'EMAAR', name: 'Emaar Properties',    base: 8.45,  sector: 'Real Estate' },
  { symbol: 'FAB',   name: 'First Abu Dhabi Bank',base: 13.80, sector: 'Banking' },
  { symbol: 'DEWA',  name: 'Dubai Electricity',   base: 2.92,  sector: 'Utilities' },
  { symbol: 'ALDAR', name: 'Aldar Properties',    base: 5.18,  sector: 'Real Estate' },
  { symbol: 'DU',    name: 'Emirates Integrated', base: 8.30,  sector: 'Telecom' },
];

function fakeQuote(base: number) {
  const chg = (Math.random() - 0.47) * base * 0.015;
  return {
    price: +(base + chg).toFixed(2),
    change: +chg.toFixed(2),
    changePct: +((chg / base) * 100).toFixed(2),
  };
}

// ─── Mini sparkline ───────────────────────────────────────────────────────
function Sparkline({ up }: { up: boolean }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const noise = (Math.random() - (up ? 0.35 : 0.65)) * 8;
    return 24 - (up ? i * 1.5 : -i * 1.5) + noise;
  });
  const max = Math.max(...pts); const min = Math.min(...pts);
  const range = max - min || 1;
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts.length - 1)) * 64},${24 - ((v - min) / range) * 24}`).join(' ');
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" className="opacity-90">
      <path d={path} fill="none" stroke={up ? '#059669' : '#E11D48'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IndexTile({ symbol, name, base, currency, market }: { symbol: string; name: string; base: number; currency: string; market: MarketType }) {
  const q = fakeQuote(base);
  const up = q.change >= 0;
  return (
    <Link
      href={`/chart/${symbol}?market=${market}`}
      className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-md p-3.5 flex flex-col gap-1.5 hover:border-emerald-500 hover:bg-white/80 hover:shadow-md transition-all shadow-sm group"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="mono text-[16px] font-black text-black group-hover:text-emerald-600 transition-colors tracking-wide">{symbol}</div>
          <div className="text-[14px] text-black font-bold">{name}</div>
        </div>
        <Sparkline up={up} />
      </div>
      <div className="flex items-end justify-between mt-1">
        <span className="mono text-[17px] font-black text-black">{currency}{q.price.toLocaleString()}</span>
        <span className={`mono text-[14px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
          {up ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
        </span>
      </div>
    </Link>
  );
}

// ─── Watchlist Row ────────────────────────────────────────────────────────
function WatchlistRow({ symbol, name, base, sector, currency, market }: { symbol: string; name: string; base: number; sector: string; currency: string; market: MarketType }) {
  const q = fakeQuote(base);
  const up = q.change >= 0;
  return (
    <Link
      href={`/chart/${symbol}?market=${market}`}
      className="flex items-center gap-3.5 px-4 py-3 rounded-xl border border-white/60 bg-white/60 backdrop-blur-md hover:border-emerald-500 hover:bg-white/80 hover:shadow-md transition-all shadow-sm group"
    >
      {/* Symbol badge */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/80 shadow-xs">
        <span className="mono text-[13px] font-black text-black group-hover:text-emerald-600 transition-colors">{symbol.slice(0, 3)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="mono text-[16px] font-black text-black group-hover:text-emerald-600 transition-colors truncate">{symbol}</div>
        <div className="text-[14px] text-black font-bold truncate">{name}</div>
      </div>

      <div className="hidden sm:block">
        <span className="rounded px-2.5 py-0.5 text-[13px] font-black text-black border border-slate-300 bg-white/70 mono">{sector}</span>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="mono text-[16px] font-black text-black">{currency}{q.price.toLocaleString()}</div>
        <div className={`mono text-[14px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
          {up ? '+' : ''}{q.changePct.toFixed(2)}%
        </div>
      </div>

      <Sparkline up={up} />

      {/* Chart arrow */}
      <div className="flex-shrink-0 text-black group-hover:text-emerald-600 transition-colors text-base font-black">›</div>
    </Link>
  );
}

// ─── Section header ───────────────────────────────────────────────────────
function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between mb-3 mt-6">
      <div className="flex items-center gap-2">
        <span className="mono text-[16px] font-black text-black tracking-widest uppercase">{title}</span>
        {badge && <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[12.5px] mono font-bold text-black">{badge}</span>}
      </div>
      <span className="text-[14px] mono font-bold text-emerald-600 hover:text-emerald-700 transition-colors tracking-wider cursor-pointer">DETAILED VIEW</span>
    </div>
  );
}

export default function TerminalPage() {
  const { market, setMarket, currency } = useMarket();

  // Market data per region
  const indices = market === 'INDIA' ? INDIA_INDICES : market === 'USA' ? USA_INDICES : UAE_INDICES;
  const watchlist = market === 'INDIA' ? INDIA_WATCHLIST : market === 'USA' ? USA_WATCHLIST : UAE_WATCHLIST;

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="min-h-screen pt-[88px] relative z-20 bg-transparent pb-20">
        {/* ── Macro Ticker Bar ────────────────── */}
        <div className="border-b border-slate-200 bg-slate-50/90 backdrop-blur-sm overflow-hidden shadow-xs">
          <div className="flex items-center gap-6 px-4 py-2 overflow-x-auto scrollbar-none max-w-7xl mx-auto">
            {MACRO.map(m => (
              <span key={m.sym} className="flex items-center gap-2 flex-shrink-0 text-[14px] mono">
                <span className="text-slate-600 font-bold">{m.sym}</span>
                <span className="text-slate-900 font-extrabold">{m.val}</span>
                <span className={`font-bold ${m.up ? 'text-emerald-600' : 'text-rose-600'}`}>{m.chg}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Master 50% Opacity White Outer Cockpit Layer (Background Particles Visible Beneath) ── */}
        <div className="mx-auto max-w-7xl px-4 py-8 relative z-20 isolate">
          <div className="relative rounded-2xl border-2 border-slate-200/80 bg-white/50 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.1),0_0_0_1px_rgba(0,0,0,0.03)] p-6 sm:p-9 overflow-hidden">
            {/* Top Outer Hairline Accent */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 pointer-events-none" />

            {/* ── Outer Bezel Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 shadow-md p-1.5 flex-shrink-0">
                  <Image
                    src="/images/logo-falcon-transparent.png"
                    alt="Market Intelligence AI — MI007"
                    width={48}
                    height={48}
                    className="object-contain drop-shadow-[0_0_8px_rgba(0,255,136,0.3)]"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="mono text-[20px] sm:text-[23px] font-black text-slate-900 tracking-wider uppercase">
                      Market Intelligence AI <span className="text-amber-600">MI007</span>
                    </h1>
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-50/90 shadow-xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="mono text-[12.5px] text-emerald-700 font-black tracking-widest">LIVE DESK</span>
                    </div>
                  </div>
                  <p className="text-[14px] text-slate-600 font-medium mt-0.5">Autonomous Market Intelligence & Quantitative Microstructure</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MarketToggle selected={market} onChange={setMarket} />
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/90 text-[14px] mono text-emerald-700 font-bold shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Real-time Simulation Active
                </div>
              </div>
            </div>

            {/* ── Search Bar ── */}
            <div className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white/70 backdrop-blur-md px-4 py-3.5 mb-5 cursor-text hover:border-slate-300 focus-within:border-emerald-600 transition-colors shadow-xs relative z-10">
              <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[16px] text-slate-700 font-medium tracking-wide">Search & Add (NIFTY, RELIANCE, AAPL, EMAAR...)</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-2 relative z-10">
              {/* ── Left column: Indices + Watchlist ────────────────────────── */}
              <div className="xl:col-span-2 flex flex-col">
                {/* Core Indices Grid */}
                <SectionHeader title="Core Indices" badge={`${indices.length} tracked`} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 xl:grid-cols-2 2xl:grid-cols-4">
                  {indices.map(idx => (
                    <IndexTile key={idx.symbol} {...idx} currency={currency} market={market} />
                  ))}
                </div>

                {/* Strategic Watchlist */}
                <SectionHeader title="Strategic Watchlist" badge={`${watchlist.length}`} />
                <div className="flex flex-col gap-2.5">
                  {watchlist.map(s => (
                    <WatchlistRow key={s.symbol} {...s} currency={currency} market={market} />
                  ))}
                </div>
              </div>

              {/* ── Right column: Crypto + Quick Links ──────────────────────── */}
              <div className="flex flex-col">
                {/* Crypto Intelligence */}
                <SectionHeader title="Crypto Intelligence" badge={`${CRYPTO.length}`} />
                <div className="flex flex-col gap-2.5 mb-6">
                  {CRYPTO.map(c => {
                    const q = fakeQuote(c.base);
                    const up = q.change >= 0;
                    return (
                      <Link
                        key={c.symbol}
                        href={`/chart/${c.symbol}?market=${market}`}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/60 bg-white/60 backdrop-blur-md hover:border-cyan-500 hover:bg-white/80 hover:shadow-md transition-all shadow-sm group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300 bg-cyan-50/90 shadow-xs">
                          <span className="mono text-[11.5px] font-black text-cyan-700">{c.symbol.slice(0, 3)}</span>
                        </div>
                        <div className="flex-1">
                          <div className="mono text-[15px] font-black text-black group-hover:text-cyan-700 transition-colors">{c.symbol}</div>
                          <div className="text-[14px] text-black font-bold">{c.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="mono text-[15px] font-black text-black">${q.price.toLocaleString()}</div>
                          <div className={`mono text-[13.5px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {up ? '+' : ''}{q.changePct.toFixed(2)}%
                          </div>
                        </div>
                        <Sparkline up={up} />
                      </Link>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-md p-4 shadow-sm">
                  <div className="mono text-[15px] font-black text-black tracking-widest uppercase mb-3">Quick Actions</div>
                  <div className="flex flex-col gap-2.5">
                    <Link href="/chart/NIFTY?market=INDIA" className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 backdrop-blur-sm px-3.5 py-3 hover:border-emerald-500 hover:bg-white hover:shadow-xs transition-all group">
                      <span className="text-emerald-600 text-base">📈</span>
                      <div className="flex-1">
                        <div className="text-[15px] font-bold text-black group-hover:text-emerald-600 transition-colors">Open Chart Terminal</div>
                        <div className="text-[14px] text-black font-medium">Full analysis with indicators</div>
                      </div>
                      <span className="text-black group-hover:text-emerald-600 transition-colors text-sm font-black">›</span>
                    </Link>
                    <Link href="/about" className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 backdrop-blur-sm px-3.5 py-3 hover:border-cyan-500 hover:bg-white hover:shadow-xs transition-all group">
                      <span className="text-cyan-600 text-base">🔬</span>
                      <div className="flex-1">
                        <div className="text-[15px] font-bold text-black group-hover:text-cyan-600 transition-colors">Architecture Deep Dive</div>
                        <div className="text-[14px] text-black font-medium">10-layer chart engine docs</div>
                      </div>
                      <span className="text-black group-hover:text-cyan-600 transition-colors text-sm font-black">›</span>
                    </Link>
                    <Link href="/contact" className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/75 backdrop-blur-sm px-3.5 py-3 hover:border-amber-500 hover:bg-white hover:shadow-xs transition-all group">
                      <span className="text-amber-600 text-base">⚡</span>
                      <div className="flex-1">
                        <div className="text-[15px] font-bold text-black group-hover:text-amber-600 transition-colors">Institutional Inquiry</div>
                        <div className="text-[14px] text-black font-medium">API / enterprise access</div>
                      </div>
                      <span className="text-black group-hover:text-amber-600 transition-colors text-xs font-black">›</span>
                    </Link>
                  </div>
                </div>

                {/* System status */}
                <div className="mt-4 rounded-2xl border border-white/60 bg-white/50 backdrop-blur-md p-4 flex flex-col gap-2.5 shadow-sm">
                  <div className="mono text-[14px] font-black text-slate-900 tracking-widest uppercase mb-1">System Status</div>
                  {[
                    { label: 'India Feed', ok: true },
                    { label: 'US Feed', ok: true },
                    { label: 'UAE Feed', ok: true },
                    { label: 'Chart Engine', ok: true },
                  ].map(({ label, ok }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                      <span className="text-[15px] text-slate-800 mono font-bold">{label}</span>
                      <span className="ml-auto text-[13px] mono text-emerald-600 font-black">{ok ? 'LIVE' : 'DOWN'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
