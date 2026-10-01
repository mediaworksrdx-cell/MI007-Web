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
} from './tradeEngineClient';

export interface LiveSymbolData {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  volume?: number;
  timestamp: number;
  tickDirection: 'up' | 'down' | 'neutral';
  lastUpdated: number;
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
  return <>{children}</>;
}

function _legacyUnusedEngine() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [livePrices, setLivePrices] = useState<Map<string, LiveSymbolData>>(new Map());
  const [cryptoPrices, setCryptoPrices] = useState<TradeEngineCrypto[]>([]);
  const [macroData, setMacroData] = useState<TradeEngineMacro[]>([]);
  const [lastTick, setLastTick] = useState<TradeEngineTick | null>(null);

  const listenersRef = useRef<Set<(tick: TradeEngineTick) => void>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial and periodic HTTP Reconciliation (polls live snapshot every 6 seconds)
  const refreshHttpSnapshot = useCallback(async () => {
    try {
      const [prices, cryptos, macros] = await Promise.all([
        fetchLivePrices(),
        fetchCryptoPrices(),
        fetchMacroData(),
      ]);

      if (cryptos.length > 0) setCryptoPrices(cryptos);
      if (macros.length > 0) setMacroData(macros);

      const now = Date.now();

      if (prices.length > 0) {
        setLivePrices(prev => {
          const next = new Map(prev);
          for (const p of prices) {
            const key = normalizeSymbolKey(p.symbol);
            const prevEntry = next.get(key);
            const tickDirection = prevEntry
              ? p.ltp > prevEntry.price ? 'up' : p.ltp < prevEntry.price ? 'down' : 'neutral'
              : 'neutral';

            const entry: LiveSymbolData = {
              symbol: p.symbol,
              price: p.ltp,
              change: p.change,
              changePct: p.changePercent,
              timestamp: p.timestamp || now,
              tickDirection,
              lastUpdated: now,
            };
            next.set(key, entry);
            next.set(p.symbol.toUpperCase(), entry);
            if (key === 'NIFTY') {
              next.set('NIFTY', entry);
              next.set('NIFTY 50', entry);
              next.set('NIFTY50', entry);
            }
            if (key === 'BANKNIFTY') {
              next.set('BANKNIFTY', entry);
              next.set('BANK NIFTY', entry);
            }
            if (key === 'FINNIFTY') {
              next.set('FINNIFTY', entry);
              next.set('FIN NIFTY', entry);
            }
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
              timestamp: now,
              tickDirection,
              lastUpdated: now,
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
    const interval = setInterval(refreshHttpSnapshot, 6000);
    return () => clearInterval(interval);
  }, [refreshHttpSnapshot]);

  // 2. Continuous Real-time Micro-Tick Heartbeat Engine (1.2s intervals)
  // Ensures tickers and candles actively pulse with realistic micro-ticks anchored around the real LTP
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setLivePrices(prev => {
        if (prev.size === 0) return prev;
        const next = new Map(prev);
        const keys = Array.from(prev.keys());
        // Pick 2-3 random instruments to pulse
        const numToPulse = Math.min(3, keys.length);
        const now = Date.now();

        for (let i = 0; i < numToPulse; i++) {
          const randKey = keys[Math.floor(Math.random() * keys.length)];
          const entry = next.get(randKey);
          if (!entry || entry.price <= 0) continue;

          // Gentle micro-tick: ±0.015% to ±0.03%
          const pct = (Math.random() - 0.49) * 0.00035;
          const delta = entry.price * pct;
          const newPrice = +(entry.price + delta).toFixed(entry.price < 10 ? 4 : 2);
          const newChange = +(entry.change + delta).toFixed(2);
          const newPct = +((newChange / (newPrice - newChange)) * 100).toFixed(2);
          const dir = delta >= 0 ? 'up' : 'down';

          const updated: LiveSymbolData = {
            ...entry,
            price: newPrice,
            change: newChange,
            changePct: newPct,
            tickDirection: dir,
            lastUpdated: now,
          };

          next.set(randKey, updated);
          if (randKey === 'NIFTY' || randKey === 'NIFTY50' || randKey === 'NIFTY 50') {
            next.set('NIFTY', updated);
            next.set('NIFTY 50', updated);
            next.set('NIFTY50', updated);
          }
          if (randKey === 'BANKNIFTY' || randKey === 'BANK NIFTY') {
            next.set('BANKNIFTY', updated);
            next.set('BANK NIFTY', updated);
          }
          if (randKey === 'FINNIFTY' || randKey === 'FIN NIFTY') {
            next.set('FINNIFTY', updated);
            next.set('FIN NIFTY', updated);
          }

          const tick: TradeEngineTick = {
            symbol: entry.symbol,
            price: newPrice,
            volume: +(Math.random() * 5 + 1).toFixed(2),
            timestamp: now,
          };

          setLastTick(tick);
          listenersRef.current.forEach(cb => {
            try { cb(tick); } catch (e) { console.error(e); }
          });
        }
        return next;
      });
    }, 1200);

    return () => clearInterval(tickInterval);
  }, []);

  // 3. WebSocket Real-time Tick Stream from Trade Engine Server
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

            const tick: TradeEngineTick = {
              symbol: String(raw.symbol || ''),
              price: Number(raw.price || raw.ltp || 0),
              volume: Number(raw.volume || 0),
              timestamp: Number(raw.timestamp || Date.now()),
            };

            if (!tick.symbol || tick.price <= 0) return;

            setLastTick(tick);

            listenersRef.current.forEach(listener => {
              try { listener(tick); } catch (e) { console.error(e); }
            });

            const key = normalizeSymbolKey(tick.symbol);
            const now = Date.now();
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
                lastUpdated: now,
              });
              return next;
            });
          } catch (e) {
            // Heartbeat frame
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
      {null}
    </TradeEngineContext.Provider>
  );
}

const EMPTY_VALUE: TradeEngineContextValue = {
  status: 'disconnected',
  livePrices: new Map(),
  cryptoPrices: [],
  macroData: [],
  lastTick: null,
  getSymbolPrice: () => undefined,
  subscribeToTicks: () => () => {},
};

export function useTradeEngine() {
  return EMPTY_VALUE;
}

export function useLiveSymbol(symbol: string) {
  return { live: undefined, isLive: false, engineStatus: 'disconnected' as const };
}
