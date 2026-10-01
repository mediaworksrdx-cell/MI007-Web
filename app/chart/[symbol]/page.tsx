'use client';

import { useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ChartContainer } from '@/components/chart/ChartContainer';
import { MarketType, MARKETS } from '@/lib/types';

interface ChartPageProps {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ market?: string }>;
}

export default function ChartPage({ params, searchParams }: ChartPageProps) {
  const { symbol } = use(params);
  const { market: marketParam } = use(searchParams);

  const validMarkets: MarketType[] = ['INDIA', 'USA', 'UAE'];
  const defaultMarket: MarketType = validMarkets.includes(marketParam as MarketType)
    ? (marketParam as MarketType)
    : 'INDIA';

  const [market, setMarket] = useState<MarketType>(defaultMarket);
  const currency = MARKETS[market].currency;

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="pt-28 h-screen flex flex-col bg-transparent relative z-10">
        {/* ── Breadcrumb / Back nav ── */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-2.5 flex-shrink-0 shadow-xs">
          <Link
            href="/terminal"
            className="flex items-center gap-1.5 text-[14px] mono font-bold text-black hover:text-black transition-colors"
          >
            ← TERMINAL
          </Link>
          <span className="text-slate-400 font-bold">|</span>
          <span className="mono text-[14px] font-black text-emerald-700 tracking-widest">{symbol.toUpperCase()}</span>
          <span className="mono text-[13px] text-black font-bold">{MARKETS[market].flag} {MARKETS[market].label}</span>

          {/* Live badge */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="mono text-[12px] text-emerald-700 font-bold tracking-widest">LIVE CHART</span>
          </div>
        </div>

        {/* ── Full Chart Terminal ── */}
        <div className="flex-1 min-h-0 p-3">
          <ChartContainer market={market} defaultSymbol={symbol.toUpperCase()} />
        </div>
      </main>

      <Footer />
    </>
  );
}
