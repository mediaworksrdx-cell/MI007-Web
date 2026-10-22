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
  activeSymbolRef.current = symbol;

  // Fetch status once on mount
  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      try {
        let res = await fetch('/api/trade-engine/fno/status');
        if (!res.ok) {
          res = await fetch('/api/fno?action=status');
        }
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
  const fetchSpot = useCallback(async () => {
    const sym = activeSymbolRef.current;
    if (!sym) return;

    try {
      setIsLoading(true);
      let res = await fetch(`/api/trade-engine/fno/quote?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) {
        res = await fetch(`/api/fno?action=spot&symbol=${encodeURIComponent(sym)}`);
      }
      if (res.ok) {
        const data: FnoSpotQuote = await res.json();
        if (data && typeof data.price === 'number' && data.price > 0) {
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
    fetchSpot();
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
    refetch: fetchSpot,
  };
}
