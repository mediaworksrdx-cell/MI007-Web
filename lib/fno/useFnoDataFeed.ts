// ─── useFnoDataFeed React Hook ───────────────────────────────────────────────
// Connects the F&O Workspace to the dedicated F&O Twelve Data engine.
// Completely decouples F&O updates from the main Trade Engine socket.

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FnoSpotQuote, FnoEngineStatus } from './fnoTwelveDataEngine';

interface UseFnoDataFeedProps {
  symbol: string;
  market: 'INDIA' | 'USA' | 'UAE';
  fallbackSpot: number;
}

export interface FnoDataFeedState {
  liveSpot: number;
  spotQuote: FnoSpotQuote | null;
  engineStatus: FnoEngineStatus | null;
  isLoading: boolean;
  lastUpdated: number;
  refetch: () => void;
}

export function useFnoDataFeed({
  symbol,
  market,
  fallbackSpot,
}: UseFnoDataFeedProps): FnoDataFeedState {
  const [liveSpot, setLiveSpot] = useState<number>(fallbackSpot);
  const [spotQuote, setSpotQuote] = useState<FnoSpotQuote | null>(null);
  const [engineStatus, setEngineStatus] = useState<FnoEngineStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const activeSymbolRef = useRef(symbol);
  useEffect(() => {
    activeSymbolRef.current = symbol;
  }, [symbol]);

  // Fetch status once on mount
  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      try {
        // Upstream /fno/status does not exist on the Trade Engine (404) — use dedicated route directly
        const res = await fetch('/api/fno?action=status');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setEngineStatus(data);
        }
      } catch (err) {
        // Soft fallback
      }
    }
    loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch live spot quote for the selected instrument
  const fetchSpot = useCallback(async (symOverride?: string) => {
    const sym = symOverride || activeSymbolRef.current;
    if (!sym) return;
    activeSymbolRef.current = sym;

    try {
      setIsLoading(true);
      // Upstream /fno/quote does not exist on the Trade Engine (404) — use dedicated route directly
      const res = await fetch(`/api/fno?action=spot&symbol=${encodeURIComponent(sym)}`);
      if (res.ok) {
        const data: FnoSpotQuote = await res.json();
        if (activeSymbolRef.current === sym && data && typeof data.price === 'number' && data.price > 0) {
          setLiveSpot(data.price);
          setSpotQuote(data);
          setLastUpdated(Date.now());
        }
      }
    } catch (err) {
      // Fallback stays on fallbackSpot
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger fetch whenever symbol changes
  useEffect(() => {
    setLiveSpot(fallbackSpot);
    fetchSpot(symbol);
  }, [symbol, fallbackSpot, fetchSpot]);

  // Periodic polling interval
  // If Venture tier, poll faster (e.g. 5-10s); if standard, poll every 30s
  useEffect(() => {
    const isVenture = engineStatus?.plan === 'venture';
    const intervalMs = isVenture ? 8000 : 30000;

    const timer = setInterval(() => {
      fetchSpot();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [fetchSpot, engineStatus?.plan]);

  return {
    liveSpot,
    spotQuote,
    engineStatus,
    isLoading,
    lastUpdated,
    refetch: () => { fetchSpot(); },
  };
}
