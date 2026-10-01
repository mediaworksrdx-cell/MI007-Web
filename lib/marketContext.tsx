'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MarketType, MARKETS } from './types';

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
      if (saved && ['INDIA', 'USA', 'UAE'].includes(saved)) {
        setMarketState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setMarket = (m: MarketType) => {
    setMarketState(m);
    try {
      localStorage.setItem('mi007_market', m);
    } catch {
      // ignore
    }
  };

  const currency = MARKETS[market]?.currency || '₹';

  return (
    <MarketContext.Provider value={{ market, setMarket, currency }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  return useContext(MarketContext);
}
