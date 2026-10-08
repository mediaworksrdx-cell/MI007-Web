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

const CRYPTO_SET = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX']);
const USA_SET = new Set(['SPX', 'NDX', 'DJI', 'AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'S&P 500', 'NASDAQ 100', 'DOW JONES']);
const UAE_SET = new Set(['DFMGI', 'ADXGI', 'ADX', 'EMAAR', 'FAB', 'DEWA', 'ALDAR', 'ENBD', 'ADNOC', 'AIRARABIA', 'DFM GENERAL', 'ADX GENERAL', 'FTSE ADX 15']);

export default function ChartPage({ params, searchParams }: ChartPageProps) {
  const { symbol } = use(params);
  const { market: marketParam } = use(searchParams);

  const cleanSym = symbol.toUpperCase();
  const isCrypto = CRYPTO_SET.has(cleanSym);

  const validMarkets: MarketType[] = ['INDIA', 'USA', 'UAE'];
  let defaultMarket: MarketType = 'INDIA';

  if (marketParam && validMarkets.includes(marketParam as MarketType)) {
    defaultMarket = marketParam as MarketType;
  } else if (USA_SET.has(cleanSym)) {
    defaultMarket = 'USA';
  } else if (UAE_SET.has(cleanSym)) {
    defaultMarket = 'UAE';
  } else if (isCrypto) {
    defaultMarket = 'USA';
  }

  const [market, setMarket] = useState<MarketType>(defaultMarket);

  const marketBadge = isCrypto ? '🌐 24/7 CRYPTO' : `${MARKETS[market].flag} ${MARKETS[market].label}`;

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="pt-28 h-screen flex flex-col bg-transparent relative z-10">
        {/* ── Breadcrumb / Back nav ── */}
        <div className="flex items-center gap-3 border-b border-[var(--theme-page-border)] bg-[var(--theme-ticker-bg)] px-4 py-2.5 flex-shrink-0 shadow-xs">
          <Link
            href="/terminal"
            className="flex items-center gap-1.5 text-[14px] mono font-bold text-[var(--theme-page-text)] hover:text-emerald-500 transition-colors"
          >
            ← TERMINAL
          </Link>
          <span className="text-[var(--theme-page-border)] font-bold">|</span>
          <span className="mono text-[14px] font-black text-emerald-500 tracking-widest">{cleanSym}</span>
          <span className="mono text-[13px] text-[var(--theme-page-text)] font-bold">{marketBadge}</span>

          {/* Live badge */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="mono text-[12px] text-emerald-500 font-bold tracking-widest">LIVE CHART</span>
          </div>
        </div>

        {/* ── Full Chart Terminal ── */}
        <div className="flex-1 min-h-0 p-3">
          <ChartContainer market={market} defaultSymbol={cleanSym} />
        </div>
      </main>

      <Footer />
    </>
  );
}
