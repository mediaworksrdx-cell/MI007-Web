'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MarketType, MARKETS, INSTRUMENTS } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';
import { useTradeEngine } from '@/lib/tradeEngineContext';

// ─── India watchlist ───────────────────────────────────────────────────────
const INDIA_INDICES = [
  { symbol: 'NIFTY', name: 'NIFTY 50',    base: 22421.95 },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', base: 54358.9 },
  { symbol: 'SENSEX', name: 'SENSEX',     base: 71753.99 },
  { symbol: 'FINNIFTY', name: 'NIFTY FINANCIAL', base: 24468.6 },
];
const INDIA_WATCHLIST = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', base: 1167.3, sector: 'Energy' },
  { symbol: 'TCS',      name: 'Tata Consultancy',    base: 2075.3, sector: 'IT' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank',           base: 717.2,  sector: 'Banking' },
  { symbol: 'INFY',     name: 'Infosys',             base: 1022.7, sector: 'IT' },
  { symbol: 'ITC',      name: 'ITC Ltd',             base: 255.7,  sector: 'FMCG' },
  { symbol: 'SBIN',     name: 'State Bank of India', base: 950.9,  sector: 'Banking' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors',       base: 277.15, sector: 'Auto' },
  { symbol: 'LT',       name: 'Larsen & Toubro',     base: 3677.2, sector: 'Infra' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank',         base: 1312.7, sector: 'Banking' },
];
const CRYPTO = [
  { symbol: 'BTC', name: 'Bitcoin',  base: 83651.0 },
  { symbol: 'ETH', name: 'Ethereum', base: 2687.59 },
  { symbol: 'SOL', name: 'Solana',   base: 103.5   },
  { symbol: 'BNB', name: 'BNB',      base: 754.0   },
  { symbol: 'DOGE', name: 'Dogecoin', base: 0.090  },
  { symbol: 'SHIB', name: 'Shiba Inu', base: 0.0000185 },
];

// USA watchlist
const USA_INDICES = [
  { symbol: 'SPX',  name: 'S&P 500',     base: 5500.0 },
  { symbol: 'NDX',  name: 'NASDAQ 100',  base: 19200.0 },
  { symbol: 'DJI',  name: 'DOW JONES',   base: 39500.0 },
];
const USA_WATCHLIST = [
  { symbol: 'AAPL', name: 'Apple Inc.',   base: 225.0, sector: 'Tech' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', base: 118.0, sector: 'Semis' },
  { symbol: 'MSFT', name: 'Microsoft',    base: 420.0, sector: 'Tech' },
  { symbol: 'TSLA', name: 'Tesla Inc.',   base: 210.0, sector: 'EV' },
  { symbol: 'AMZN', name: 'Amazon',       base: 175.0, sector: 'eCommerce' },
];

// UAE watchlist
const UAE_INDICES = [
  { symbol: 'DFMGI', name: 'DFM General',  base: 4850.0 },
  { symbol: 'ADX',   name: 'ADX General',  base: 9250.0 },
];
const UAE_WATCHLIST = [
  { symbol: 'EMAAR', name: 'Emaar Properties',    base: 8.45,  sector: 'Real Estate' },
  { symbol: 'FAB',   name: 'First Abu Dhabi Bank',base: 13.20, sector: 'Banking' },
  { symbol: 'DEWA',  name: 'Dubai Electricity',   base: 2.45,  sector: 'Utilities' },
  { symbol: 'SALIK', name: 'Salik Company',       base: 3.65,  sector: 'Transport' },
];

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
  const { getSymbolPrice } = useTradeEngine();
  const live = getSymbolPrice(symbol);
  const price = live && live.price > 0 ? live.price : base;
  const changePct = live ? live.changePct : 0.45;
  const up = changePct >= 0;

  return (
    <Link
      href={`/chart/${symbol}?market=${market}`}
      className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-md p-3.5 flex flex-col gap-1.5 hover:border-emerald-500 hover:bg-white/80 hover:shadow-md transition-all shadow-sm group"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="mono text-[16px] font-black text-black group-hover:text-emerald-600 transition-colors tracking-wide">{symbol}</span>
            {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          </div>
          <div className="text-[14px] text-slate-700 font-bold">{name}</div>
        </div>
        <Sparkline up={up} />
      </div>
      <div className="flex items-end justify-between mt-1">
        <span className="mono text-[17px] font-black text-slate-900">
          {currency}{price.toLocaleString(undefined, { minimumFractionDigits: price < 10 ? 2 : 2, maximumFractionDigits: 2 })}
        </span>
        <span className={`mono text-[14px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
          {up ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
        </span>
      </div>
    </Link>
  );
}

// ─── Watchlist Row ────────────────────────────────────────────────────────
function WatchlistRow({ symbol, name, base, sector, currency, market }: { symbol: string; name: string; base: number; sector: string; currency: string; market: MarketType }) {
  const { getSymbolPrice } = useTradeEngine();
  const live = getSymbolPrice(symbol);
  const price = live && live.price > 0 ? live.price : base;
  const changePct = live ? live.changePct : 0.25;
  const up = changePct >= 0;

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
        <div className="flex items-center gap-1.5">
          <span className="mono text-[16px] font-black text-black group-hover:text-emerald-600 transition-colors truncate">{symbol}</span>
          {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </div>
        <div className="text-[14px] text-slate-700 font-bold truncate">{name}</div>
      </div>

      <div className="hidden sm:block">
        <span className="rounded px-2.5 py-0.5 text-[13px] font-black text-black border border-slate-300 bg-white/70 mono">{sector}</span>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="mono text-[16px] font-black text-slate-900">
          {currency}{price.toLocaleString(undefined, { minimumFractionDigits: price < 10 ? 2 : 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`mono text-[14px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
          {up ? '+' : ''}{changePct.toFixed(2)}%
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
  const { status, getSymbolPrice } = useTradeEngine();

  // Market data per region
  const indices = market === 'INDIA' ? INDIA_INDICES : market === 'USA' ? USA_INDICES : UAE_INDICES;
  const watchlist = market === 'INDIA' ? INDIA_WATCHLIST : market === 'USA' ? USA_WATCHLIST : UAE_WATCHLIST;

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="min-h-screen pt-28 sm:pt-32 relative z-20 bg-transparent pb-20">
        {/* ── Master Cockpit Layer ── */}
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 relative z-20 isolate">
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
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[15px] mono text-slate-900 font-bold shadow-xs">
                  <span>{MARKETS[market].flag}</span>
                  <span className="text-slate-900 font-black">{MARKETS[market].label}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/90 text-[13px] mono text-emerald-700 font-bold shadow-xs">
                  <span className={`h-2 w-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  <span>{status === 'connected' ? 'TRADE ENGINE ONLINE' : 'ENGINE CONNECTING'}</span>
                </div>
              </div>
            </div>

            {/* ── Core Indices Grid ── */}
            <SectionHeader title="Core Indices" badge={`${indices.length} ACTIVE`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
              {indices.map(idx => (
                <IndexTile key={idx.symbol} symbol={idx.symbol} name={idx.name} base={idx.base} currency={currency} market={market} />
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
                  currency={currency}
                  market={market}
                />
              ))}
            </div>

            {/* ── Crypto Section ── */}
            <SectionHeader title="Crypto Intelligence" badge="24/7 GLOBAL" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {CRYPTO.map(c => {
                const live = getSymbolPrice(c.symbol);
                const price = live && live.price > 0 ? live.price : c.base;
                const changePct = live ? live.changePct : 0.85;
                const up = changePct >= 0;
                return (
                  <Link
                    key={c.symbol}
                    href={`/chart/${c.symbol}`}
                    className="rounded-xl border border-white/60 bg-white/60 backdrop-blur-md p-3 hover:border-emerald-500 hover:bg-white/80 transition-all shadow-sm flex flex-col gap-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="mono text-[14px] font-black text-black group-hover:text-emerald-600 transition-colors">{c.symbol}</span>
                      {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </div>
                    <div className="text-[12px] text-slate-600 font-bold truncate">{c.name}</div>
                    <div className="mono text-[14px] font-black text-slate-900 mt-1">
                      ${price.toLocaleString(undefined, { minimumFractionDigits: price < 1 ? 4 : 2, maximumFractionDigits: price < 1 ? 7 : 2 })}
                    </div>
                    <div className={`mono text-[12px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {up ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
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
