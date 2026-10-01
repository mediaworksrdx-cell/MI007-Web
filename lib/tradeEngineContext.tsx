'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  TradeEngineLivePrice,
  TradeEngineCrypto,
  TradeEngineMacro,
  TradeEngineTick,
  fetchLivePrices,
  fetchCryptoPrices,
  fetchMacroData,
  normalizeSymbolKey,
  areSymbolsEqual,
} from './tradeEngineClient';

export interface LiveSymbolData {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  volume?: number;
  timestamp: number;
  tickDirection: 'up' | 'down' | 'neutral';
}

interface TradeEngineContextValue {
  status: 'connected' | 'connecting' | 'disconnected';
  livePrices: Map<string, LiveSymbolData>;
  cryptoPrices: TradeEngineCrypto[];
  macroData: TradeEngineMacro[];
  lastTick: TradeEngineTick | null;
  getSymbolPrice: (symbol: string) => LiveSymbolData | undefined;
  subscribeToTicks: (callback: (tick: TradeEngineTick) => void) => () => void;
}

const TradeEngineContext = createContext<TradeEngineContextValue>({
  status: 'disconnected',
  livePrices: new Map(),
  cryptoPrices: [],
  macroData: [],
  lastTick: null,
  getSymbolPrice: () => undefined,
  subscribeToTicks: () => () => {},
});

const WS_URL = process.env.NEXT_PUBLIC_TRADE_ENGINE_WS || 'ws://20.80.83.151/ws';

export function TradeEngineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [livePrices, setLivePrices] = useState<Map<string, LiveSymbolData>>(new Map());
  const [cryptoPrices, setCryptoPrices] = useState<TradeEngineCrypto[]>([]);
  const [macroData, setMacroData] = useState<TradeEngineMacro[]>([]);
  const [lastTick, setLastTick] = useState<TradeEngineTick | null>(null);

  const listenersRef = useRef<Set<(tick: TradeEngineTick) => void>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial and periodic HTTP Reconciliation (polls live snapshot every 8 seconds)
  const refreshHttpSnapshot = useCallback(async () => {
    try {
      const [prices, cryptos, macros] = await Promise.all([
        fetchLivePrices(),
        fetchCryptoPrices(),
        fetchMacroData(),
      ]);

      if (cryptos.length > 0) setCryptoPrices(cryptos);
      if (macros.length > 0) setMacroData(macros);

      if (prices.length > 0) {
        setLivePrices(prev => {
          const next = new Map(prev);
          for (const p of prices) {
            const key = normalizeSymbolKey(p.symbol);
            const prevEntry = next.get(key);
            const tickDirection = prevEntry
              ? p.ltp > prevEntry.price ? 'up' : p.ltp < prevEntry.price ? 'down' : 'neutral'
              : 'neutral';

            next.set(key, {
              symbol: p.symbol,
              price: p.ltp,
              change: p.change,
              changePct: p.changePercent,
              timestamp: p.timestamp,
              tickDirection,
            });
          }
          return next;
        });
      }

      // Also index cryptos into livePrices map
      if (cryptos.length > 0) {
        setLivePrices(prev => {
          const next = new Map(prev);
          for (const c of cryptos) {
            const key = normalizeSymbolKey(c.symbol);
            const prevEntry = next.get(key);
            const tickDirection = prevEntry
              ? c.current_price > prevEntry.price ? 'up' : c.current_price < prevEntry.price ? 'down' : 'neutral'
              : 'neutral';

            const data: LiveSymbolData = {
              symbol: c.symbol.toUpperCase(),
              price: c.current_price,
              change: (c.current_price * c.price_change_percentage_24h) / 100,
              changePct: c.price_change_percentage_24h,
              timestamp: Date.now(),
              tickDirection,
            };
            next.set(key, data);
            next.set(c.id.toLowerCase(), data);
            next.set(`${c.symbol.toUpperCase()}USDT`, data);
          }
          return next;
        });
      }
    } catch (err) {
      console.warn('[TradeEngineProvider] Reconciliation error:', err);
    }
  }, []);

  useEffect(() => {
    refreshHttpSnapshot();
    const interval = setInterval(refreshHttpSnapshot, 8000);
    return () => clearInterval(interval);
  }, [refreshHttpSnapshot]);

  // 2. WebSocket Real-time Tick Stream
  useEffect(() => {
    let isDisposed = false;

    function connectWs() {
      if (isDisposed) return;
      setStatus('connecting');

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) { ws.close(); return; }
          console.log('[TradeEngine WS] Connected to:', WS_URL);
          setStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            if (!raw || typeof raw !== 'object') return;

            // Handle incoming Tick or LivePrice frame
            const tick: TradeEngineTick = {
              symbol: String(raw.symbol || ''),
              price: Number(raw.price || raw.ltp || 0),
              volume: Number(raw.volume || 0),
              timestamp: Number(raw.timestamp || Date.now()),
            };

            if (!tick.symbol || tick.price <= 0) return;

            setLastTick(tick);

            // Notify all registered subscriber callbacks (e.g. active chart)
            listenersRef.current.forEach(listener => {
              try { listener(tick); } catch (e) { console.error(e); }
            });

            // Update livePrices map
            const key = normalizeSymbolKey(tick.symbol);
            setLivePrices(prev => {
              const prevEntry = prev.get(key);
              const dir = prevEntry
                ? tick.price > prevEntry.price ? 'up' : tick.price < prevEntry.price ? 'down' : 'neutral'
                : 'neutral';

              const chg = prevEntry ? prevEntry.change + (tick.price - prevEntry.price) : 0;
              const chgPct = prevEntry && prevEntry.price > 0
                ? ((tick.price - (prevEntry.price - prevEntry.change)) / (prevEntry.price - prevEntry.change)) * 100
                : prevEntry?.changePct || 0;

              const next = new Map(prev);
              next.set(key, {
                symbol: tick.symbol,
                price: tick.price,
                change: Number(raw.change ?? chg),
                changePct: Number(raw.changePercent ?? chgPct),
                volume: tick.volume,
                timestamp: tick.timestamp,
                tickDirection: dir,
              });
              return next;
            });
          } catch (e) {
            // Non-JSON frame (e.g. heartbeat ping/pong)
          }
        };

        ws.onerror = (err) => {
          console.warn('[TradeEngine WS] Error:', err);
        };

        ws.onclose = () => {
          if (isDisposed) return;
          console.log('[TradeEngine WS] Disconnected. Reconnecting in 3s...');
          setStatus('disconnected');
          reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
        };
      } catch (err) {
        console.warn('[TradeEngine WS] Connection creation failed:', err);
        setStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(connectWs, 4000);
      }
    }

    connectWs();

    return () => {
      isDisposed = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  const getSymbolPrice = useCallback((symbol: string): LiveSymbolData | undefined => {
    const key = normalizeSymbolKey(symbol);
    return livePrices.get(key);
  }, [livePrices]);

  const subscribeToTicks = useCallback((callback: (tick: TradeEngineTick) => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  return (
    <TradeEngineContext.Provider
      value={{
        status,
        livePrices,
        cryptoPrices,
        macroData,
        lastTick,
        getSymbolPrice,
        subscribeToTicks,
      }}
    >
      {children}
    </TradeEngineContext.Provider>
  );
}

export function useTradeEngine() {
  return useContext(TradeEngineContext);
}

/** Hook for listening to live updates of a specific symbol */
export function useLiveSymbol(symbol: string) {
  const { getSymbolPrice, status } = useTradeEngine();
  const live = getSymbolPrice(symbol);
  return { live, isLive: status === 'connected' && !!live, engineStatus: status };
}
