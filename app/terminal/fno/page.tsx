// ─── MI007 F&O Intelligence Hub Terminal Page ───────────────────────────────
'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useMarket } from '@/lib/marketContext';
import { FnoWorkspace, FnoTabId } from '@/components/fno/FnoWorkspace';

function FnoPageContent() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') as FnoTabId) || 'overview';

  return <FnoWorkspace initialTab={tabParam} />;
}

export default function FnoTerminalPage() {
  const { market, setMarket } = useMarket();

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="min-h-screen pt-32 sm:pt-36 relative z-20 bg-transparent pb-24">
        <Suspense
          fallback={
            <div className="mx-auto max-w-[1700px] px-4 py-20 text-center mono text-emerald-400">
              Initializing F&amp;O Derivatives Engine...
            </div>
          }
        >
          <FnoPageContent />
        </Suspense>
      </main>
    </>
  );
}
