'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MarketType, MARKETS } from './types';
import { workspaceSync } from './workspaceSync';

interface MarketContextType {
  market: MarketType;
  setMarket: (market: MarketType) => void;
  currency: string;
}

const MarketContext = createContext<MarketContextType>({
  market: 'INDIA',
  setMarket: () => {},
  currency: '₹',
});

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [market, setMarketState] = useState<MarketType>('INDIA');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mi007_market') as MarketType;
      if (saved && ['USA', 'INDIA', 'UAE'].includes(saved)) {
        setMarketState(saved);
      }
    } catch {
      // ignore
    }

    // Listen for cross-tab market switches via BroadcastChannel & storage events
    const unsub = workspaceSync.subscribe((event) => {
      if (event.type === 'MARKET_CHANGED' && ['USA', 'INDIA', 'UAE'].includes(event.market)) {
        setMarketState(event.market);
      }
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mi007_market' && e.newValue && ['USA', 'INDIA', 'UAE'].includes(e.newValue)) {
        setMarketState(e.newValue as MarketType);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setMarket = (m: MarketType) => {
    setMarketState(m);
    try {
      localStorage.setItem('mi007_market', m);
      workspaceSync.broadcast({ type: 'MARKET_CHANGED', market: m, timestamp: Date.now() });
    } catch {
      // ignore
    }
  };

  const currency = MARKETS[market]?.currency || '$';

  return (
    <MarketContext.Provider value={{ market, setMarket, currency }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  return useContext(MarketContext);
}
