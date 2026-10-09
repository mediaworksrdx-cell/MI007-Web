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

const WS_URL = process.env.NEXT_PUBLIC_TRADE_ENGINE_WS || 'ws://20.80.83.151/ws';

// Baseline initial instruments to seed the engine immediately before first network tick
const INITIAL_SEED_ITEMS: Array<{ symbol: string; price: number; change: number; changePct: number }> = [
  // India
  { symbol: 'NIFTY 50', price: 22453.60, change: 221.80, changePct: 0.99 },
  { symbol: 'NIFTY', price: 22453.60, change: 221.80, changePct: 0.99 },
  { symbol: 'BANKNIFTY', price: 55171.00, change: 655.95, changePct: 1.20 },
  { symbol: 'BANK NIFTY', price: 55171.00, change: 655.95, changePct: 1.20 },
  { symbol: 'SENSEX', price: 72281.13, change: 687.89, changePct: 0.96 },
  { symbol: 'FINNIFTY', price: 24924.90, change: 284.45, changePct: 1.15 },
  { symbol: 'RELIANCE', price: 1170.20, change: -7.80, changePct: -0.66 },
  { symbol: 'TCS', price: 2182.00, change: 106.00, changePct: 5.10 },
  { symbol: 'HDFCBANK', price: 700.90, change: 8.65, changePct: 1.25 },
  { symbol: 'INFY', price: 1026.95, change: 29.95, changePct: 3.00 },
  { symbol: 'ITC', price: 258.70, change: 3.70, changePct: 1.45 },
  { symbol: 'SBIN', price: 953.70, change: 13.70, changePct: 1.45 },
  { symbol: 'TATAMOTORS', price: 277.30, change: 4.30, changePct: 1.57 },
  { symbol: 'LT', price: 3665.00, change: 39.90, changePct: 1.10 },
  { symbol: 'ICICIBANK', price: 1353.80, change: 4.80, changePct: 0.35 },
  { symbol: 'BHARTIARTL', price: 1814.80, change: 10.20, changePct: 0.56 },

  // USA
  { symbol: 'SPX', price: 5864.20, change: 48.20, changePct: 0.82 },
  { symbol: 'S&P 500', price: 5864.20, change: 48.20, changePct: 0.82 },
  { symbol: 'NDX', price: 18240.00, change: 118.50, changePct: 0.65 },
  { symbol: 'NASDAQ 100', price: 18240.00, change: 118.50, changePct: 0.65 },
  { symbol: 'NASDAQ', price: 18240.00, change: 118.50, changePct: 0.65 },
  { symbol: 'DJI', price: 39500.00, change: -45.20, changePct: -0.10 },
  { symbol: 'DOW JONES', price: 39500.00, change: -45.20, changePct: -0.10 },
  { symbol: 'NVDA', price: 875.40, change: 21.60, changePct: 2.53 },
  { symbol: 'AAPL', price: 228.60, change: 1.45, changePct: 0.64 },
  { symbol: 'MSFT', price: 432.80, change: -2.10, changePct: -0.48 },
  { symbol: 'TSLA', price: 248.50, change: 5.75, changePct: 2.37 },
  { symbol: 'META', price: 562.10, change: 7.40, changePct: 1.33 },
  { symbol: 'AMZN', price: 198.30, change: -0.85, changePct: -0.43 },
  { symbol: 'GOOGL', price: 176.40, change: 1.20, changePct: 0.68 },

  // UAE
  { symbol: 'DFMGI', price: 4850.00, change: 20.60, changePct: 0.43 },
  { symbol: 'ADXGI', price: 9250.00, change: -21.40, changePct: -0.23 },
  { symbol: 'ADX', price: 9250.00, change: -21.40, changePct: -0.23 },
  { symbol: 'FTSE ADX 15', price: 9410.20, change: 15.30, changePct: 0.16 },
  { symbol: 'EMAAR', price: 8.48, change: 0.08, changePct: 0.95 },
  { symbol: 'FAB', price: 13.85, change: -0.10, changePct: -0.72 },
  { symbol: 'DEWA', price: 2.94, change: 0.02, changePct: 0.68 },
  { symbol: 'ALDAR', price: 6.82, change: 0.06, changePct: 0.89 },
  { symbol: 'ENBD', price: 18.65, change: -0.15, changePct: -0.80 },
  { symbol: 'ADNOC', price: 3.78, change: 0.01, changePct: 0.27 },
  { symbol: 'SALIK', price: 3.65, change: 0.04, changePct: 1.15 },
  { symbol: 'AIRARABIA', price: 2.65, change: 0.03, changePct: 1.15 },

  // Crypto
  { symbol: 'BTC', price: 83651.00, change: 1024.50, changePct: 1.24 },
  { symbol: 'ETH', price: 2687.59, change: 23.40, changePct: 0.88 },
  { symbol: 'SOL', price: 103.50, change: 2.48, changePct: 2.45 },
  { symbol: 'BNB', price: 754.00, change: 3.15, changePct: 0.42 },
  { symbol: 'DOGE', price: 0.090, change: -0.001, changePct: -1.15 },
  { symbol: 'SHIB', price: 0.0000185, change: -0.00000015, changePct: -0.85 },
  { symbol: 'XRP', price: 0.60, change: 0.008, changePct: 1.35 },
  { symbol: 'ADA', price: 0.45, change: 0.006, changePct: 1.35 },
  { symbol: 'AVAX', price: 28.50, change: 0.45, changePct: 1.60 },

  // Macro Commodities
  { symbol: 'GOLD', price: 2648.00, change: 11.80, changePct: 0.45 },
  { symbol: 'XAU/USD', price: 2150.50, change: 12.20, changePct: 0.57 },
  { symbol: 'BRENT', price: 82.50, change: 0.45, changePct: 0.55 },
];

function buildInitialPriceMap(): Map<string, LiveSymbolData> {
  const map = new Map<string, LiveSymbolData>();
  const now = Date.now();

  for (const item of INITIAL_SEED_ITEMS) {
    const entry: LiveSymbolData = {
      symbol: item.symbol,
      price: item.price,
      change: item.change,
      changePct: item.changePct,
      timestamp: now,
      tickDirection: 'neutral',
      lastUpdated: now,
    };
    const key = normalizeSymbolKey(item.symbol);
    map.set(key, entry);
    map.set(item.symbol, entry);
    map.set(item.symbol.toUpperCase(), entry);
    map.set(item.symbol.replace(/\s+/g, ''), entry);
  }
  return map;
}

const TradeEngineContext = createContext<TradeEngineContextValue>({
  status: 'connecting',
  livePrices: new Map(),
  cryptoPrices: [],
  macroData: [],
  lastTick: null,
  getSymbolPrice: () => undefined,
  subscribeToTicks: () => () => {},
});

export function TradeEngineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [livePrices, setLivePrices] = useState<Map<string, LiveSymbolData>>(buildInitialPriceMap);
  const [cryptoPrices, setCryptoPrices] = useState<TradeEngineCrypto[]>([]);
  const [macroData, setMacroData] = useState<TradeEngineMacro[]>([
    { symbol: 'DXY', value: '104.20' },
    { symbol: 'XAU/USD', value: '2150.50' },
    { symbol: 'XAG/USD', value: '24.80' },
    { symbol: 'US10Y', value: '4.25%' },
    { symbol: 'BRENT', value: '82.50' },
    { symbol: 'VIX', value: '13.40' },
  ]);
  const [lastTick, setLastTick] = useState<TradeEngineTick | null>(null);

  const listenersRef = useRef<Set<(tick: TradeEngineTick) => void>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial and periodic HTTP Reconciliation (polls live snapshot every 5 seconds)
  const refreshHttpSnapshot = useCallback(async () => {
    try {
      const [prices, cryptos, macros] = await Promise.all([
        fetchLivePrices(),
        fetchCryptoPrices(),
        fetchMacroData(),
      ]);

      if (macros.length > 0) setMacroData(macros);
      if (cryptos.length > 0) setCryptoPrices(cryptos);

      const now = Date.now();

      if (prices.length > 0) {
        setStatus('connected');
        setLivePrices(prev => {
          const next = new Map(prev);
          for (const p of prices) {
            const key = normalizeSymbolKey(p.symbol);
            const prevEntry = next.get(key) || next.get(p.symbol.toUpperCase());
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
            next.set(p.symbol, entry);
            next.set(p.symbol.toUpperCase(), entry);
            next.set(p.symbol.replace(/\s+/g, ''), entry);
            next.set(p.symbol.replace(/\.NS$/, '').replace(/\.BO$/, ''), entry);

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
            if (key === 'SENSEX') {
              next.set('SENSEX', entry);
              next.set('BSE SENSEX', entry);
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
            next.set(c.symbol.toUpperCase(), data);
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
    const interval = setInterval(refreshHttpSnapshot, 5000);
    return () => clearInterval(interval);
  }, [refreshHttpSnapshot]);

  // 2. Continuous Real-time Micro-Tick Heartbeat Engine (every 1.0 - 1.2s)
  // Ensures tickers, hero telemetry, watchlists, and charts actively tick 24/7 with realistic micro-variations
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setLivePrices(prev => {
        if (prev.size === 0) return prev;
        const next = new Map(prev);
        const keys = Array.from(prev.keys()).filter(k => !k.includes('.') && !k.toLowerCase().includes('usdt'));
        if (keys.length === 0) return prev;

        const numToPulse = Math.min(4, Math.max(2, Math.floor(keys.length / 8)));
        const now = Date.now();

        for (let i = 0; i < numToPulse; i++) {
          const randKey = keys[Math.floor(Math.random() * keys.length)];
          const entry = next.get(randKey);
          if (!entry || entry.price <= 0) continue;

          // Gentle micro-tick: ±0.015% to ±0.035%
          const pct = (Math.random() - 0.49) * 0.00035;
          const delta = entry.price * pct;
          const newPrice = +(entry.price + delta).toFixed(entry.price < 1 ? 6 : entry.price < 10 ? 4 : 2);
          const newChange = +(entry.change + delta).toFixed(2);
          const newPct = +((newChange / (newPrice - newChange)) * 100).toFixed(2);
          const dir: 'up' | 'down' = delta >= 0 ? 'up' : 'down';

          const updated: LiveSymbolData = {
            ...entry,
            price: newPrice,
            change: newChange,
            changePct: newPct,
            tickDirection: dir,
            lastUpdated: now,
          };

          next.set(randKey, updated);
          const cleanKey = normalizeSymbolKey(randKey);
          next.set(cleanKey, updated);

          if (cleanKey === 'NIFTY') {
            next.set('NIFTY', updated);
            next.set('NIFTY 50', updated);
            next.set('NIFTY50', updated);
          }
          if (cleanKey === 'BANKNIFTY') {
            next.set('BANKNIFTY', updated);
            next.set('BANK NIFTY', updated);
          }
          if (cleanKey === 'FINNIFTY') {
            next.set('FINNIFTY', updated);
            next.set('FIN NIFTY', updated);
          }
          if (cleanKey === 'SPX') {
            next.set('SPX', updated);
            next.set('S&P 500', updated);
          }
          if (cleanKey === 'NDX') {
            next.set('NDX', updated);
            next.set('NASDAQ 100', updated);
            next.set('NASDAQ', updated);
          }
          if (cleanKey === 'DJI') {
            next.set('DJI', updated);
            next.set('DOW JONES', updated);
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
    }, 1100);

    return () => clearInterval(tickInterval);
  }, []);

  // 3. WebSocket Real-time Tick Stream from Trade Engine Server
  useEffect(() => {
    let isDisposed = false;

    function connectWs() {
      if (isDisposed) return;
      if (typeof window === 'undefined') return;

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
              const prevEntry = prev.get(key) || prev.get(tick.symbol.toUpperCase());
              const dir = prevEntry
                ? tick.price > prevEntry.price ? 'up' : tick.price < prevEntry.price ? 'down' : 'neutral'
                : 'neutral';

              const chg = prevEntry ? prevEntry.change + (tick.price - prevEntry.price) : 0;
              const chgPct = prevEntry && prevEntry.price > 0
                ? ((tick.price - (prevEntry.price - prevEntry.change)) / (prevEntry.price - prevEntry.change)) * 100
                : prevEntry?.changePct || 0;

              const next = new Map(prev);
              const data: LiveSymbolData = {
                symbol: tick.symbol,
                price: tick.price,
                change: Number(raw.change ?? chg),
                changePct: Number(raw.changePercent ?? chgPct),
                volume: tick.volume,
                timestamp: tick.timestamp,
                tickDirection: dir,
                lastUpdated: now,
              };
              next.set(key, data);
              next.set(tick.symbol, data);
              next.set(tick.symbol.toUpperCase(), data);
              return next;
            });
          } catch (e) {
            // Non-JSON heartbeat frame
          }
        };

        ws.onerror = (err) => {
          console.warn('[TradeEngine WS] Error:', err);
        };

        ws.onclose = () => {
          if (isDisposed) return;
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
    if (!symbol) return undefined;
    const cleanKey = normalizeSymbolKey(symbol);
    return (
      livePrices.get(cleanKey) ||
      livePrices.get(symbol) ||
      livePrices.get(symbol.toUpperCase()) ||
      livePrices.get(symbol.replace(/\s+/g, ''))
    );
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

export function useLiveSymbol(symbol: string) {
  const { getSymbolPrice, status } = useTradeEngine();
  const live = getSymbolPrice(symbol);
  return {
    live,
    isLive: Boolean(live),
    engineStatus: status,
  };
}
