// ─── Option Chain Route ─────────────────────────────────────────────────────
'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useMarket } from '@/lib/marketContext';
import { FnoWorkspace } from '@/components/fno/FnoWorkspace';

export default function FnoChainPage() {
  const { market, setMarket } = useMarket();

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />
      <main className="min-h-screen pt-28 sm:pt-32 relative z-20 bg-transparent pb-24">
        <FnoWorkspace initialTab="chain" />
      </main>
    </>
  );
}
