'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MarketType, MARKETS, INSTRUMENTS } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';

// ─── India watchlist with stable realistic closing data ────────────────────────
const INDIA_INDICES = [
  { symbol: 'NIFTY', name: 'NIFTY 50', base: 22421.95, changePct: -0.87 },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', base: 54358.90, changePct: -0.33 },
  { symbol: 'SENSEX', name: 'SENSEX', base: 71753.99, changePct: -0.79 },
  { symbol: 'FINNIFTY', name: 'NIFTY FINANCIAL', base: 24468.60, changePct: -0.38 },
];
const INDIA_WATCHLIST = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', base: 1167.30, sector: 'Energy', changePct: -1.63 },
  { symbol: 'TCS', name: 'Tata Consultancy', base: 2075.30, sector: 'IT', changePct: 1.19 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', base: 721.20, sector: 'Banking', changePct: 1.76 },
  { symbol: 'INFY', name: 'Infosys', base: 1022.70, sector: 'IT', changePct: 2.88 },
  { symbol: 'ITC', name: 'ITC Ltd', base: 255.70, sector: 'FMCG', changePct: -2.61 },
  { symbol: 'SBIN', name: 'State Bank of India', base: 950.90, sector: 'Banking', changePct: -0.56 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', base: 277.15, sector: 'Auto', changePct: -0.82 },
  { symbol: 'LT', name: 'Larsen & Toubro', base: 3677.20, sector: 'Infra', changePct: 0.94 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', base: 1312.70, sector: 'Banking', changePct: -0.84 },
];
const CRYPTO = [
  { symbol: 'BTC', name: 'Bitcoin', base: 83651.0, changePct: 1.24 },
  { symbol: 'ETH', name: 'Ethereum', base: 2687.59, changePct: 0.88 },
  { symbol: 'SOL', name: 'Solana', base: 103.50, changePct: 2.45 },
  { symbol: 'BNB', name: 'BNB', base: 754.00, changePct: 0.42 },
  { symbol: 'DOGE', name: 'Dogecoin', base: 0.090, changePct: -1.15 },
  { symbol: 'SHIB', name: 'Shiba Inu', base: 0.0000185, changePct: -0.85 },
];

// USA watchlist
const USA_INDICES = [
  { symbol: 'SPX', name: 'S&P 500', base: 5500.0, changePct: 0.44 },
  { symbol: 'NDX', name: 'NASDAQ 100', base: 19200.0, changePct: 0.78 },
  { symbol: 'DJI', name: 'DOW JONES', base: 39500.0, changePct: -0.10 },
];
const USA_WATCHLIST = [
  { symbol: 'AAPL', name: 'Apple Inc.', base: 228.60, sector: 'Tech', changePct: 0.64 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', base: 875.40, sector: 'Semis', changePct: 2.53 },
  { symbol: 'MSFT', name: 'Microsoft', base: 432.80, sector: 'Tech', changePct: -0.48 },
  { symbol: 'TSLA', name: 'Tesla Inc.', base: 248.50, sector: 'EV', changePct: 2.37 },
  { symbol: 'AMZN', name: 'Amazon', base: 198.30, sector: 'eCommerce', changePct: -0.43 },
];

// UAE watchlist
const UAE_INDICES = [
  { symbol: 'DFMGI', name: 'DFM General', base: 4850.0, changePct: 0.43 },
  { symbol: 'ADX', name: 'ADX General', base: 9250.0, changePct: -0.23 },
];
const UAE_WATCHLIST = [
  { symbol: 'EMAAR', name: 'Emaar Properties', base: 8.45, sector: 'Real Estate', changePct: 0.95 },
  { symbol: 'FAB', name: 'First Abu Dhabi Bank', base: 13.20, sector: 'Banking', changePct: -0.72 },
  { symbol: 'DEWA', name: 'Dubai Electricity', base: 2.45, sector: 'Utilities', changePct: 0.68 },
  { symbol: 'SALIK', name: 'Salik Company', base: 3.65, sector: 'Transport', changePct: 1.15 },
];

// ─── 100% Deterministic, Static Mini Sparkline (Never Moves or Twitches) ────
function Sparkline({ symbol, up }: { symbol?: string; up: boolean }) {
  const seed = (symbol || 'SYM').split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
  const pts = Array.from({ length: 12 }, (_, i) => {
    const pseudo = Math.sin(seed * (i + 1) * 0.73) * 3.2;
    const trend = up ? (i / 11) * 14 : ((11 - i) / 11) * 14;
    return 18 - trend + pseudo;
  });
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const path = pts
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts.length - 1)) * 64},${22 - ((v - min) / range) * 18}`)
    .join(' ');

  return (
    <svg width="64" height="28" viewBox="0 0 64 28" className="opacity-90 flex-shrink-0">
      <path
        d={path}
        fill="none"
        stroke={up ? '#059669' : '#E11D48'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IndexTile({
  symbol,
  name,
  base,
  changePct = 0.45,
  currency,
  market,
}: {
  symbol: string;
  name: string;
  base: number;
  changePct?: number;
  currency: string;
  market: MarketType;
}) {
  const up = changePct >= 0;

  return (
    <Link
      href={`/chart/${symbol}?market=${market}`}
      className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-md p-3.5 flex flex-col gap-1.5 hover:border-emerald-500 hover:bg-white/80 hover:shadow-md transition-all shadow-sm group"
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="mono text-[16px] font-black text-black group-hover:text-emerald-600 transition-colors tracking-wide">
            {symbol}
          </span>
          <div className="text-[14px] text-slate-700 font-bold">{name}</div>
        </div>
        <Sparkline symbol={symbol} up={up} />
      </div>
      <div className="flex items-end justify-between mt-1">
        <span className="mono text-[17px] font-black text-slate-900">
          {currency}{base.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className={`mono text-[14px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
          {up ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
        </span>
      </div>
    </Link>
  );
}

// ─── Watchlist Row ────────────────────────────────────────────────────────
function WatchlistRow({
  symbol,
  name,
  base,
  sector,
  changePct = 0.25,
  currency,
  market,
}: {
  symbol: string;
  name: string;
  base: number;
  sector: string;
  changePct?: number;
  currency: string;
  market: MarketType;
}) {
  const up = changePct >= 0;

  return (
    <Link
      href={`/chart/${symbol}?market=${market}`}
      className="flex items-center gap-2 sm:gap-3.5 px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/60 bg-white/60 backdrop-blur-md hover:border-emerald-500 hover:bg-white/80 hover:shadow-md transition-all shadow-sm group min-w-0"
    >
      {/* Symbol badge */}
      <div className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/80 shadow-xs">
        <span className="mono text-[12px] sm:text-[13px] font-black text-black group-hover:text-emerald-600 transition-colors">{symbol.slice(0, 3)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <span className="mono text-[14px] sm:text-[16px] font-black text-black group-hover:text-emerald-600 transition-colors truncate block">{symbol}</span>
        <div className="text-[12px] sm:text-[14px] text-slate-700 font-bold truncate">{name}</div>
      </div>

      <div className="hidden md:block">
        <span className="rounded px-2.5 py-0.5 text-[12px] font-black text-black border border-slate-300 bg-white/70 mono">{sector}</span>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="mono text-[14px] sm:text-[16px] font-black text-slate-900">
          {currency}{base.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`mono text-[12px] sm:text-[14px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
          {up ? '+' : ''}{changePct.toFixed(2)}%
        </div>
      </div>

      <div className="hidden xs:block flex-shrink-0">
        <Sparkline symbol={symbol} up={up} />
      </div>

      {/* Chart arrow */}
      <div className="flex-shrink-0 text-black group-hover:text-emerald-600 transition-colors text-base font-black pl-0.5">›</div>
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

      <main className="min-h-screen pt-28 sm:pt-32 relative z-20 bg-transparent pb-20">
        {/* ── Master Cockpit Layer ── */}
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-8 relative z-20 isolate">
          <div className="relative rounded-2xl border-2 border-slate-200/80 bg-white/50 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.1),0_0_0_1px_rgba(0,0,0,0.03)] p-3.5 sm:p-6 lg:p-9 overflow-hidden">
            {/* Top Outer Hairline Accent */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 pointer-events-none" />

            {/* ── Outer Bezel Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-slate-200 relative z-10">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <div className="flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950 shadow-md p-1 sm:p-1.5 flex-shrink-0">
                  <Image
                    src="/images/logo-falcon-transparent.png"
                    alt="Market Intelligence AI — MI007"
                    width={44}
                    height={44}
                    className="object-contain drop-shadow-[0_0_8px_rgba(0,255,136,0.3)]"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="mono text-[16px] sm:text-[23px] font-black text-slate-900 tracking-wider uppercase truncate">
                    Market Intelligence AI <span className="text-amber-600">MI007</span>
                  </h1>
                  <p className="text-[12px] sm:text-[14px] text-slate-600 font-medium mt-0.5 truncate">Autonomous Market Intelligence & Quantitative Microstructure</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border border-slate-200 bg-white text-[13px] sm:text-[15px] mono text-slate-900 font-bold shadow-xs">
                  <span>{MARKETS[market].flag}</span>
                  <span className="text-slate-900 font-black">{MARKETS[market].label}</span>
                </div>
              </div>
            </div>

            {/* ── Core Indices Grid ── */}
            <SectionHeader title="Core Indices" badge={`${indices.length} ACTIVE`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
              {indices.map(idx => (
                <IndexTile
                  key={idx.symbol}
                  symbol={idx.symbol}
                  name={idx.name}
                  base={idx.base}
                  changePct={idx.changePct}
                  currency={currency}
                  market={market}
                />
              ))}
            </div>

            {/* ── Strategic Watchlist ── */}
            <SectionHeader title={`${MARKETS[market].label} Strategic Watchlist`} badge={`${watchlist.length} MONITORED`} />
            <div className="flex flex-col gap-2.5 mb-6">
              {watchlist.map(item => (
                <WatchlistRow
                  key={item.symbol}
                  symbol={item.symbol}
                  name={item.name}
                  base={item.base}
                  sector={item.sector}
                  changePct={item.changePct}
                  currency={currency}
                  market={market}
                />
              ))}
            </div>

            {/* ── Crypto Section ── */}
            <SectionHeader title="Crypto Intelligence" badge="24/7 GLOBAL" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {CRYPTO.map(c => {
                const up = c.changePct >= 0;
                return (
                  <Link
                    key={c.symbol}
                    href={`/chart/${c.symbol}`}
                    className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-md p-3 hover:border-emerald-500 hover:bg-white/80 transition-all shadow-sm flex flex-col gap-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="mono text-[14px] font-black text-black group-hover:text-emerald-600 transition-colors">{c.symbol}</span>
                    </div>
                    <div className="text-[12px] text-slate-600 font-bold truncate">{c.name}</div>
                    <div className="mono text-[14px] font-black text-slate-900 mt-1">
                      ${c.base.toLocaleString(undefined, { minimumFractionDigits: c.base < 1 ? 4 : 2, maximumFractionDigits: c.base < 1 ? 7 : 2 })}
                    </div>
                    <div className={`mono text-[12px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {up ? '▲' : '▼'} {Math.abs(c.changePct).toFixed(2)}%
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
