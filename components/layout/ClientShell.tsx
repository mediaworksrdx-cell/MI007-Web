'use client';

import { useMarket } from '@/lib/marketContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export function ClientShell({ children }: { children: React.ReactNode }) {
  const { market, setMarket } = useMarket();

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />
      <main className="min-h-screen pt-[88px] pb-0">
        {children}
      </main>
      <Footer />
    </>
  );
}
