// ─── Derivatives Analytics Route ─────────────────────────────────────────────
'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useMarket } from '@/lib/marketContext';
import { FnoWorkspace } from '@/components/fno/FnoWorkspace';

export default function FnoAnalyticsPage() {
  const { market, setMarket } = useMarket();

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />
      <main className="min-h-screen pt-[86px] sm:pt-[92px] relative z-20 bg-transparent pb-12">
        <FnoWorkspace initialTab="analytics" />
      </main>
    </>
  );
}
