'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  TradeEngineLivePrice,
  TradeEngineCrypto,
  TradeEngineMacro,
  TradeEngineTick,
  fetchLivePrices,
  fetchCryptoPrices,
  fetchMacroData,
  fetchQuote,
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

// ── Granular Per-Symbol External Store for Zero-Lag High-Frequency Updates ────
class SymbolPriceStore {
  private map: Map<string, LiveSymbolData>;
  private symbolListeners = new Map<string, Set<() => void>>();

  constructor(initial: Map<string, LiveSymbolData>) {
    this.map = initial;
  }

  public getMap(): Map<string, LiveSymbolData> {
    return this.map;
  }

  public getSymbol(symbol: string): LiveSymbolData | undefined {
    if (!symbol) return undefined;
    const cleanKey = normalizeSymbolKey(symbol);
    const upper = symbol.toUpperCase().trim();
    return (
      this.map.get(cleanKey) ||
      this.map.get(symbol) ||
      this.map.get(upper) ||
      this.map.get(`${cleanKey}.NS`) ||
      this.map.get(`${upper}.NS`) ||
      this.map.get(symbol.replace(/\s+/g, '')) ||
      this.map.get(symbol.replace(/\.NS$/, ''))
    );
  }

  public updateBatch(updater: (prev: Map<string, LiveSymbolData>) => { next: Map<string, LiveSymbolData>; changedKeys: Set<string> }): boolean {
    const { next, changedKeys } = updater(this.map);
    if (changedKeys.size === 0) return false;
    this.map = next;
    changedKeys.forEach((key) => {
      const subs = this.symbolListeners.get(key);
      if (subs) {
        subs.forEach((cb) => {
          try { cb(); } catch {}
        });
      }
    });
    return true;
  }

  public subscribeSymbol(symbol: string, callback: () => void): () => void {
    const key = normalizeSymbolKey(symbol);
    if (!this.symbolListeners.has(key)) {
      this.symbolListeners.set(key, new Set());
    }
    this.symbolListeners.get(key)!.add(callback);
    return () => {
      const set = this.symbolListeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.symbolListeners.delete(key);
      }
    };
  }
}

interface TradeEngineContextValue {
  status: 'connected' | 'connecting' | 'disconnected';
  latencyMs: number;
  livePrices: Map<string, LiveSymbolData>;
  cryptoPrices: TradeEngineCrypto[];
  macroData: TradeEngineMacro[];
  lastTick: TradeEngineTick | null;
  getSymbolPrice: (symbol: string) => LiveSymbolData | undefined;
  requestQuoteFetch: (symbol: string) => void;
  subscribeToTicks: (callback: (tick: TradeEngineTick) => void) => () => void;
  subscribeToSymbol: (symbol: string, callback: () => void) => () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_TRADE_ENGINE_WS || 'ws://138.91.105.85/ws';

// Baseline initial instruments to seed the engine immediately before first network tick
const INITIAL_SEED_ITEMS: Array<{ symbol: string; price: number; change: number; changePct: number }> = [
  // India (Zerodha Kite Connected Live Tickers - synced with Trade Engine Kite)
  { symbol: 'NIFTY 50', price: 23053.10, change: 116.50, changePct: 0.51 },
  { symbol: 'NIFTY', price: 23053.10, change: 116.50, changePct: 0.51 },
  { symbol: 'BANKNIFTY', price: 54686.95, change: -225.40, changePct: -0.41 },
  { symbol: 'BANK NIFTY', price: 54686.95, change: -225.40, changePct: -0.41 },
  { symbol: 'SENSEX', price: 74459.53, change: 311.20, changePct: 0.42 },
  { symbol: 'FINNIFTY', price: 24712.20, change: 7.40, changePct: 0.03 },
  { symbol: 'RELIANCE', price: 1164.90, change: -2.45, changePct: -0.21 },
  { symbol: 'TCS', price: 2502.60, change: 24.55, changePct: 0.99 },
  { symbol: 'HDFCBANK', price: 692.80, change: 9.50, changePct: 1.39 },
  { symbol: 'INFY', price: 1185.00, change: 38.50, changePct: 3.36 },
  { symbol: 'TITAN', price: 3811.70, change: 42.10, changePct: 1.12 },
  { symbol: 'BAJFINANCE', price: 939.10, change: 6.40, changePct: 0.69 },
  { symbol: 'POLYCAB', price: 5840.20, change: 184.00, changePct: 3.25 },
  { symbol: 'DIXON', price: 13950.00, change: 549.00, changePct: 4.10 },
  { symbol: 'CDSL', price: 1580.40, change: 28.70, changePct: 1.85 },
  { symbol: 'DEEPAKNTR', price: 2280.00, change: -14.90, changePct: -0.65 },
  { symbol: 'SBIN', price: 961.85, change: -10.00, changePct: -1.03 },
  { symbol: 'TATAMOTORS', price: 265.40, change: -0.60, changePct: -0.23 },
  { symbol: 'ZOMATO', price: 214.07, change: 2.10, changePct: 0.99 },
  { symbol: 'ETERNAL', price: 214.07, change: 2.10, changePct: 0.99 },
  { symbol: 'LTIM', price: 4200.60, change: 45.20, changePct: 1.09 },
  { symbol: 'MIDCPNIFTY', price: 12958.45, change: 42.10, changePct: 0.33 },
  { symbol: 'BANKEX', price: 61083.33, change: -682.67, changePct: -1.10 },
  { symbol: 'JIOFIN', price: 247.30, change: 2.30, changePct: 0.94 },
  { symbol: 'TATASTEEL', price: 154.06, change: 1.20, changePct: 0.79 },
  { symbol: 'ADANIENT', price: 2059.50, change: 18.40, changePct: 0.90 },
  { symbol: 'HAL', price: 3934.00, change: -45.20, changePct: -1.14 },
  { symbol: 'IRFC', price: 128.40, change: -0.80, changePct: -0.62 },
  { symbol: 'VEDL', price: 465.20, change: 5.10, changePct: 1.11 },
  { symbol: 'BEL', price: 394.40, change: 4.80, changePct: 1.23 },
  { symbol: 'LT', price: 3871.70, change: 34.50, changePct: 0.90 },
  { symbol: 'ICICIBANK', price: 1398.00, change: 11.40, changePct: 0.82 },
  { symbol: 'BHARTIARTL', price: 1973.70, change: 1.60, changePct: 0.08 },
  { symbol: 'ITC', price: 265.60, change: 0.60, changePct: 0.23 },
  { symbol: 'HINDUNILVR', price: 2171.90, change: 12.40, changePct: 0.57 },
  { symbol: 'HCLTECH', price: 1428.10, change: 15.20, changePct: 1.08 },
  { symbol: 'SUNPHARMA', price: 1777.70, change: 11.30, changePct: 0.64 },
  { symbol: 'NTPC', price: 356.20, change: 2.80, changePct: 0.79 },

  // USA
  { symbol: 'SPX', price: 7626.75, change: -93.64, changePct: -1.21 },
  { symbol: 'S&P 500', price: 7626.75, change: -93.64, changePct: -1.21 },
  { symbol: 'NDX', price: 28636.47, change: -766.04, changePct: -2.61 },
  { symbol: 'NASDAQ 100', price: 28636.47, change: -766.04, changePct: -2.61 },
  { symbol: 'NASDAQ', price: 28636.47, change: -766.04, changePct: -2.61 },
  { symbol: 'DJI', price: 52129.31, change: -213.25, changePct: -0.41 },
  { symbol: 'DOW JONES', price: 52129.31, change: -213.25, changePct: -0.41 },
  { symbol: 'VIX', price: 18.92, change: 1.72, changePct: 10.00 },
  { symbol: 'QQQ', price: 696.86, change: -18.48, changePct: -2.58 },
  { symbol: 'NVDA', price: 207.12, change: -6.54, changePct: -3.06 },
  { symbol: 'AAPL', price: 345.51, change: -3.40, changePct: -0.97 },
  { symbol: 'MSFT', price: 522.50, change: -7.64, changePct: -1.44 },
  { symbol: 'TSLA', price: 393.50, change: -9.80, changePct: -2.43 },
  { symbol: 'META', price: 618.50, change: -6.02, changePct: -0.96 },
  { symbol: 'AMZN', price: 239.28, change: -4.51, changePct: -1.85 },
  { symbol: 'GOOGL', price: 280.94, change: -2.88, changePct: -1.01 },

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
  { symbol: 'BTC', price: 82010.00, change: 922.33, changePct: 1.14 },
  { symbol: 'ETH', price: 2403.00, change: 36.38, changePct: 1.54 },
  { symbol: 'SOL', price: 104.37, change: 2.36, changePct: 2.31 },
  { symbol: 'BNB', price: 727.00, change: 15.40, changePct: 2.16 },
  { symbol: 'DOGE', price: 0.079, change: 0.0018, changePct: 2.31 },
  { symbol: 'SHIB', price: 0.0000185, change: -0.00000015, changePct: -0.85 },
  { symbol: 'XRP', price: 1.31, change: 0.015, changePct: 1.15 },
  { symbol: 'ADA', price: 0.218, change: 0.002, changePct: 0.92 },
  { symbol: 'AVAX', price: 9.60, change: 0.12, changePct: 1.26 },
  { symbol: 'DOT', price: 1.16, change: -0.01, changePct: -0.85 },
  { symbol: 'LINK', price: 12.09, change: 0.18, changePct: 1.51 },
  { symbol: 'MATIC', price: 0.126, change: 0.001, changePct: 0.80 },

  // Macro Commodities
  { symbol: 'GOLD', price: 2650.50, change: 11.80, changePct: 0.45 },
  { symbol: 'XAU/USD', price: 2650.50, change: 12.20, changePct: 0.57 },
  { symbol: 'BRENT', price: 74.50, change: 0.45, changePct: 0.55 },

  // Forex Major Pairs (Live Market Benchmarks)
  { symbol: 'EUR/USD', price: 1.1151, change: -0.0030, changePct: -0.27 },
  { symbol: 'EURUSD', price: 1.1151, change: -0.0030, changePct: -0.27 },
  { symbol: 'GBP/USD', price: 1.3388, change: 0.0013, changePct: 0.10 },
  { symbol: 'GBPUSD', price: 1.3388, change: 0.0013, changePct: 0.10 },
  { symbol: 'USD/JPY', price: 157.28, change: -0.37, changePct: -0.23 },
  { symbol: 'USDJPY', price: 157.28, change: -0.37, changePct: -0.23 },
  { symbol: 'USD/INR', price: 94.94, change: -0.27, changePct: -0.28 },
  { symbol: 'USDINR', price: 94.94, change: -0.27, changePct: -0.28 },
  { symbol: 'USD/CAD', price: 1.3960, change: -0.0027, changePct: -0.19 },
  { symbol: 'USDCAD', price: 1.3960, change: -0.0027, changePct: -0.19 },
  { symbol: 'AUD/CAD', price: 0.9816, change: -0.0013, changePct: -0.13 },
  { symbol: 'AUDCAD', price: 0.9816, change: -0.0013, changePct: -0.13 },
  { symbol: 'USD/CHF', price: 0.8248, change: 0.0010, changePct: 0.12 },
  { symbol: 'USDCHF', price: 0.8248, change: 0.0010, changePct: 0.12 },
  { symbol: 'AUD/USD', price: 0.7034, change: 0.0003, changePct: 0.04 },
  { symbol: 'AUDUSD', price: 0.7034, change: 0.0003, changePct: 0.04 },
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
  latencyMs: 18,
  livePrices: new Map(),
  cryptoPrices: [],
  macroData: [],
  lastTick: null,
  getSymbolPrice: () => undefined,
  requestQuoteFetch: () => {},
  subscribeToTicks: () => () => {},
  subscribeToSymbol: () => () => {},
});

export function TradeEngineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const latencyMsRef = useRef<number>(18);
  // Stable store instance (lazy useState init avoids reading refs during render)
  const [store] = useState<SymbolPriceStore>(() => new SymbolPriceStore(buildInitialPriceMap()));
  const [livePrices, setLivePrices] = useState<Map<string, LiveSymbolData>>(() => store.getMap());
  const [cryptoPrices, setCryptoPrices] = useState<TradeEngineCrypto[]>([]);
  const [macroData, setMacroData] = useState<TradeEngineMacro[]>([
    { symbol: 'DXY', value: '104.20' },
    { symbol: 'XAU/USD', value: '2650.50' },
    { symbol: 'XAG/USD', value: '31.50' },
    { symbol: 'US10Y', value: '4.25%' },
    { symbol: 'BRENT', value: '74.50' },
    { symbol: 'VIX', value: '18.56' },
  ]);
  const [lastTick, setLastTick] = useState<TradeEngineTick | null>(null);
  const lastTickRef = useRef<TradeEngineTick | null>(null);

  const listenersRef = useRef<Set<(tick: TradeEngineTick) => void>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const throttleLivePricesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLivePricesUpdateRef = useRef<number>(0);

  const scheduleLivePricesUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastLivePricesUpdateRef.current >= 2000) {
      lastLivePricesUpdateRef.current = now;
      if (store) {
        setLivePrices(new Map(store.getMap()));
      }
      if (lastTickRef.current) {
        setLastTick(lastTickRef.current);
      }
      return;
    }
    if (!throttleLivePricesTimeoutRef.current) {
      throttleLivePricesTimeoutRef.current = setTimeout(() => {
        throttleLivePricesTimeoutRef.current = null;
        lastLivePricesUpdateRef.current = Date.now();
        if (store) {
          setLivePrices(new Map(store.getMap()));
        }
        if (lastTickRef.current) {
          setLastTick(lastTickRef.current);
        }
      }, 2000);
    }
  }, []);

  // 1. High-frequency Real-Time Equities & Indices Polling (every 2 seconds)
  const syncLivePrices = useCallback(async () => {
    try {
      const t0 = performance.now();
      const prices = await fetchLivePrices();
      const rtt = Math.max(4, Math.round(performance.now() - t0));
      if (Math.abs(rtt - latencyMsRef.current) > 35) {
        latencyMsRef.current = rtt;
        setLatencyMs(rtt);
      }
      if (!prices || prices.length === 0) return;

      const now = Date.now();
      setStatus('connected');

      let mostRecentTick: TradeEngineTick | null = null;

      const changed = store?.updateBatch((prev) => {
        const next = new Map(prev);
        const changedKeys = new Set<string>();
        for (const p of prices) {
          if (!p.symbol || typeof p.ltp !== 'number' || p.ltp <= 0) continue;
          const key = normalizeSymbolKey(p.symbol);
          const prevEntry = next.get(key) || next.get(p.symbol.toUpperCase());
          if (prevEntry && prevEntry.price === p.ltp && prevEntry.changePct === p.changePercent) {
            continue;
          }
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

          changedKeys.add(key);
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

          if (!prevEntry || prevEntry.price !== p.ltp) {
            const tick: TradeEngineTick = {
              symbol: p.symbol,
              price: p.ltp,
              volume: 0,
              timestamp: p.timestamp || now,
            };
            mostRecentTick = tick;
            listenersRef.current.forEach(listener => {
              try { listener(tick); } catch (e) { console.error(e); }
            });
          }
        }
        return { next, changedKeys };
      });

      if (mostRecentTick) {
        lastTickRef.current = mostRecentTick;
      }

      if (changed && store) {
        scheduleLivePricesUpdate();
      }
    } catch (err) {
      console.warn('[TradeEngineProvider] syncLivePrices error:', err);
    }
  }, [scheduleLivePricesUpdate]);

  // 2. High-Frequency Crypto Polling (every 5 seconds)
  const syncCryptoPrices = useCallback(async () => {
    try {
      const cryptos = await fetchCryptoPrices();
      if (!cryptos || cryptos.length === 0) return;

      setCryptoPrices(cryptos);
      const now = Date.now();
      let mostRecentTick: TradeEngineTick | null = null;

      // Index cryptos into livePrices map
      const changed = store?.updateBatch((prev) => {
        const next = new Map(prev);
        const changedKeys = new Set<string>();
        for (const c of cryptos) {
          if (!c.symbol || typeof c.current_price !== 'number' || c.current_price <= 0) continue;
          const key = normalizeSymbolKey(c.symbol);
          const prevEntry = next.get(key);
          const isPriceDifferent = !prevEntry || prevEntry.price !== c.current_price;
          const tickDirection = prevEntry
            ? c.current_price > prevEntry.price ? 'up' : c.current_price < prevEntry.price ? 'down' : prevEntry.tickDirection
            : 'neutral';

          const chgPct = Number.isFinite(c.price_change_percentage_24h) ? Number(c.price_change_percentage_24h) : 0;
          const data: LiveSymbolData = {
            symbol: c.symbol.toUpperCase(),
            price: c.current_price,
            change: (c.current_price * chgPct) / 100,
            changePct: chgPct,
            timestamp: now,
            tickDirection,
            lastUpdated: now,
          };

          if (isPriceDifferent || !prevEntry) {
            changedKeys.add(key);
            changedKeys.add(c.symbol.toUpperCase());
            changedKeys.add(`${c.symbol.toUpperCase()}USDT`);
            changedKeys.add(`${c.symbol.toUpperCase()}-USD`);

            const tick: TradeEngineTick = {
              symbol: c.symbol.toUpperCase(),
              price: c.current_price,
              volume: 0,
              timestamp: now,
            };
            mostRecentTick = tick;
            listenersRef.current.forEach((listener) => {
              try { listener(tick); } catch (e) { console.error(e); }
            });
          }

          next.set(key, data);
          next.set(c.symbol.toUpperCase(), data);
          next.set(c.symbol.toLowerCase(), data);
          next.set(c.id.toLowerCase(), data);
          next.set(`${c.symbol.toUpperCase()}USDT`, data);
          next.set(`${c.symbol.toUpperCase()}-USD`, data);
          next.set(`${c.symbol.toUpperCase()}/USD`, data);
        }
        return { next, changedKeys };
      });

      if (mostRecentTick) {
        lastTickRef.current = mostRecentTick;
      }

      if (changed) {
        scheduleLivePricesUpdate();
      }
    } catch (err) {
      console.warn('[TradeEngineProvider] syncCryptoPrices error:', err);
    }
  }, [scheduleLivePricesUpdate]);

  // 3. Background Macro, Forex & Commodities Polling (every 60 seconds)
  const syncMacroData = useCallback(async () => {
    try {
      const macros = await fetchMacroData();
      if (!macros || macros.length === 0) return;

      setMacroData(macros);
      const now = Date.now();

      // Index commodities, forex, and macro into livePrices map
      const changed = store?.updateBatch((prev) => {
        const next = new Map(prev);
        const changedKeys = new Set<string>();
        for (const m of macros) {
          const numVal = parseFloat(String(m.value).replace(/[%$,]/g, ''));
          if (!isNaN(numVal) && numVal > 0) {
            const key = normalizeSymbolKey(m.symbol);
            const prevEntry = next.get(key) || next.get(m.symbol);

            const chg = typeof (m as any).change === 'number' ? (m as any).change : (prevEntry?.change || 0);
            const chgPct = typeof (m as any).changePercent === 'number' ? (m as any).changePercent : (prevEntry?.changePct || 0);

            if (prevEntry && prevEntry.price === numVal && prevEntry.changePct === chgPct && prevEntry.change === chg) continue;
            const tickDirection = prevEntry
              ? numVal > prevEntry.price ? 'up' : numVal < prevEntry.price ? 'down' : (chgPct >= 0 ? 'up' : 'down')
              : (chgPct >= 0 ? 'up' : 'down');

            const data: LiveSymbolData = {
              symbol: m.symbol,
              price: numVal,
              change: chg,
              changePct: chgPct,
              timestamp: now,
              tickDirection,
              lastUpdated: now,
            };

            const unslashed = m.symbol.replace(/[\/-]/g, '');
            changedKeys.add(key);
            changedKeys.add(m.symbol);
            changedKeys.add(unslashed);
            next.set(key, data);
            next.set(m.symbol, data);
            next.set(m.symbol.toUpperCase(), data);
            next.set(unslashed, data);
            next.set(m.symbol.replace(/\s+/g, ''), data);

            if (m.symbol === 'XAU/USD' || m.symbol === 'GOLD') {
              changedKeys.add('GOLD');
              next.set('GOLD', data);
              next.set('XAU', data);
              next.set('XAUUSD', data);
            }
            if (m.symbol === 'XAG/USD' || m.symbol === 'SILVER') {
              changedKeys.add('SILVER');
              next.set('SILVER', data);
              next.set('XAG', data);
              next.set('XAGUSD', data);
            }
            if (m.symbol === 'BRENT' || m.symbol === 'CRUDEOIL') {
              changedKeys.add('BRENT');
              changedKeys.add('CRUDEOIL');
              next.set('BRENT', data);
              next.set('CRUDEOIL', data);
              next.set('OIL', data);
            }
            if (m.symbol === 'WTI') {
              changedKeys.add('WTI');
              next.set('WTI', data);
              next.set('CRUDE_WTI', data);
            }
            if (m.symbol === 'NATGAS') {
              changedKeys.add('NATGAS');
              next.set('NATGAS', data);
              next.set('NATURALGAS', data);
            }
            if (m.symbol === 'COPPER') {
              changedKeys.add('COPPER');
              next.set('COPPER', data);
            }
            if (m.symbol === 'USD/INR' || m.symbol === 'USDINR') {
              changedKeys.add('USDINR');
              next.set('USDINR', data);
              next.set('USD/INR', data);
            }
            if (m.symbol === 'EUR/USD' || m.symbol === 'EURUSD') {
              changedKeys.add('EURUSD');
              next.set('EURUSD', data);
              next.set('EUR/USD', data);
            }
            if (m.symbol === 'GBP/USD' || m.symbol === 'GBPUSD') {
              changedKeys.add('GBPUSD');
              next.set('GBPUSD', data);
              next.set('GBP/USD', data);
            }
            if (m.symbol === 'USD/JPY' || m.symbol === 'USDJPY') {
              changedKeys.add('USDJPY');
              next.set('USDJPY', data);
              next.set('USD/JPY', data);
            }
            if (m.symbol === 'USD/CHF' || m.symbol === 'USDCHF') {
              changedKeys.add('USDCHF');
              next.set('USDCHF', data);
              next.set('USD/CHF', data);
            }
            if (m.symbol === 'USD/CAD' || m.symbol === 'USDCAD' || m.symbol === 'UADCAD' || m.symbol === 'UAD/CAD') {
              changedKeys.add('USDCAD');
              next.set('USDCAD', data);
              next.set('USD/CAD', data);
            }
            if (m.symbol === 'AUD/CAD' || m.symbol === 'AUDCAD') {
              changedKeys.add('AUDCAD');
              next.set('AUDCAD', data);
              next.set('AUD/CAD', data);
            }
            if (m.symbol === 'AUD/USD' || m.symbol === 'AUDUSD') {
              changedKeys.add('AUDUSD');
              next.set('AUDUSD', data);
              next.set('AUD/USD', data);
            }
          }
        }
        return { next, changedKeys };
      });
      if (changed) {
        scheduleLivePricesUpdate();
      }
    } catch (err) {
      console.warn('[TradeEngineProvider] syncMacroData error:', err);
    }
  }, [scheduleLivePricesUpdate]);

  useEffect(() => {
    // Initial immediate pull
    syncLivePrices();
    syncCryptoPrices();
    syncMacroData();

    // Fast 2-second polling strictly for live Indian equities & indices (Zerodha Kite)
    const pricesInterval = setInterval(syncLivePrices, 2000);
    // 5-second polling strictly for live Crypto prices (CoinGecko / Trade Engine / Yahoo failover)
    const cryptoInterval = setInterval(syncCryptoPrices, 5000);
    // 60-second polling cadence for macro, commodities, and forex
    const macroInterval = setInterval(syncMacroData, 60 * 1000);

    // Refresh immediately when window regain visibility
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncLivePrices();
        syncCryptoPrices();
        syncMacroData();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      clearInterval(pricesInterval);
      clearInterval(cryptoInterval);
      clearInterval(macroInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [syncLivePrices, syncCryptoPrices, syncMacroData]);

  // 3. WebSocket Real-time Tick Streams (Trade Engine + Coinbase Crypto)
  useEffect(() => {
    let isDisposed = false;
    let cryptoWs: WebSocket | null = null;
    let cryptoReconnectTimer: NodeJS.Timeout | null = null;

    function connectCryptoWs() {
      if (isDisposed) return;
      if (typeof window === 'undefined') return;

      try {
        const cWs = new WebSocket('wss://ws-feed.exchange.coinbase.com');
        cryptoWs = cWs;

        cWs.onopen = () => {
          if (isDisposed) { cWs.close(); return; }
          cWs.send(JSON.stringify({
            type: 'subscribe',
            product_ids: [
              'BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD', 'SHIB-USD',
              'XRP-USD', 'ADA-USD', 'AVAX-USD', 'DOT-USD', 'LINK-USD'
            ],
            channels: ['ticker'],
          }));
        };

        cWs.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type !== 'ticker' || !msg.product_id || !msg.price) return;

            const sym = msg.product_id.replace('-USD', '').toUpperCase();
            const price = parseFloat(msg.price);
            if (isNaN(price) || price <= 0) return;

            const open24h = parseFloat(msg.open_24h || 0);
            const change = open24h > 0 ? +(price - open24h).toFixed(2) : 0;
            const changePct = open24h > 0 ? +(((price - open24h) / open24h) * 100).toFixed(2) : 0;
            const now = Date.now();

            const tick: TradeEngineTick = {
              symbol: sym,
              price,
              volume: parseFloat(msg.last_size || 0) || 0,
              timestamp: now,
            };

            lastTickRef.current = tick;
            listenersRef.current.forEach((listener) => {
              try { listener(tick); } catch (e) { console.error(e); }
            });

            const key = normalizeSymbolKey(sym);
            const changed = store?.updateBatch((prev) => {
              const prevEntry = prev.get(key) || prev.get(sym);
              const dir = prevEntry
                ? price > prevEntry.price ? 'up' : price < prevEntry.price ? 'down' : prevEntry.tickDirection
                : 'neutral';

              const next = new Map(prev);
              const changedKeys = new Set<string>([key, sym, `${sym}USDT`, `${sym}-USD`]);
              const data: LiveSymbolData = {
                symbol: sym,
                price,
                change,
                changePct,
                volume: tick.volume,
                timestamp: now,
                tickDirection: dir,
                lastUpdated: now,
              };
              next.set(key, data);
              next.set(sym, data);
              next.set(sym.toLowerCase(), data);
              next.set(`${sym}USDT`, data);
              next.set(`${sym}-USD`, data);
              return { next, changedKeys };
            });

            if (changed) {
              scheduleLivePricesUpdate();
            }
          } catch {}
        };

        cWs.onerror = () => {};

        cWs.onclose = () => {
          if (isDisposed) return;
          cryptoReconnectTimer = setTimeout(connectCryptoWs, 5000);
        };
      } catch {
        if (!isDisposed) {
          cryptoReconnectTimer = setTimeout(connectCryptoWs, 5000);
        }
      }
    }

    function connectWs() {
      if (isDisposed) return;
      if (typeof window === 'undefined') return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) { ws.close(); return; }
          console.log('[TradeEngine WS] Connected to:', WS_URL);
          reconnectAttemptRef.current = 0;
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

            lastTickRef.current = tick;

            listenersRef.current.forEach(listener => {
              try { listener(tick); } catch (e) { console.error(e); }
            });

            const key = normalizeSymbolKey(tick.symbol);
            const now = Date.now();
            const changed = store?.updateBatch((prev) => {
              const prevEntry = prev.get(key) || prev.get(tick.symbol.toUpperCase());
              const dir = prevEntry
                ? tick.price > prevEntry.price ? 'up' : tick.price < prevEntry.price ? 'down' : 'neutral'
                : 'neutral';

              const chg = prevEntry ? prevEntry.change + (tick.price - prevEntry.price) : 0;
              const chgPct = prevEntry && prevEntry.price > 0
                ? ((tick.price - (prevEntry.price - prevEntry.change)) / (prevEntry.price - prevEntry.change)) * 100
                : prevEntry?.changePct || 0;

              const next = new Map(prev);
              const changedKeys = new Set<string>([key]);
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
              return { next, changedKeys };
            });

            if (changed) {
              scheduleLivePricesUpdate();
            }
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
          const attempt = reconnectAttemptRef.current++;
          const backoff = Math.min(15000, 2000 * Math.pow(1.5, attempt)) + Math.floor(Math.random() * 600);
          reconnectTimeoutRef.current = setTimeout(connectWs, backoff);
        };
      } catch (err) {
        console.warn('[TradeEngine WS] Connection creation failed:', err);
        setStatus('disconnected');
        const attempt = reconnectAttemptRef.current++;
        const backoff = Math.min(15000, 3000 * Math.pow(1.5, attempt));
        reconnectTimeoutRef.current = setTimeout(connectWs, backoff);
      }
    }

    connectWs();
    connectCryptoWs();

    return () => {
      isDisposed = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (cryptoReconnectTimer) clearTimeout(cryptoReconnectTimer);
      if (throttleLivePricesTimeoutRef.current) clearTimeout(throttleLivePricesTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (cryptoWs) {
        cryptoWs.onclose = null;
        cryptoWs.close();
      }
    };
  }, [scheduleLivePricesUpdate]);

  const pendingQuoteFetches = useRef<Set<string>>(new Set());

  const getSymbolPrice = useCallback((symbol: string): LiveSymbolData | undefined => {
    if (!symbol) return undefined;
    return store?.getSymbol(symbol);
  }, []);

  const requestQuoteFetch = useCallback((symbol: string) => {
    if (!symbol) return;
    const cleanKey = normalizeSymbolKey(symbol);
    if (store?.getSymbol(symbol)) return;
    if (pendingQuoteFetches.current.has(cleanKey)) return;

    pendingQuoteFetches.current.add(cleanKey);
    fetchQuote(cleanKey)
      .then((q) => {
        if (q && q.ltp > 0) {
          const entry: LiveSymbolData = {
            symbol: q.symbol,
            price: q.ltp,
            change: q.change,
            changePct: q.changePercent,
            timestamp: q.timestamp || Date.now(),
            tickDirection: 'neutral',
            lastUpdated: Date.now(),
          };
          store?.updateBatch((prev) => {
            const next = new Map(prev);
            const changedKeys = new Set<string>();
            changedKeys.add(cleanKey);
            next.set(cleanKey, entry);
            next.set(q.symbol, entry);
            next.set(q.symbol.toUpperCase(), entry);
            next.set(`${cleanKey}.NS`, entry);
            return { next, changedKeys };
          });
          scheduleLivePricesUpdate();
        }
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => pendingQuoteFetches.current.delete(cleanKey), 10000);
      });
  }, [scheduleLivePricesUpdate]);

  const subscribeToTicks = useCallback((callback: (tick: TradeEngineTick) => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const subscribeToSymbol = useCallback((symbol: string, callback: () => void) => {
    if (!store) return () => {};
    return store.subscribeSymbol(symbol, callback);
  }, []);

  const contextValue = useMemo<TradeEngineContextValue>(
    () => ({
      status,
      latencyMs,
      livePrices,
      cryptoPrices,
      macroData,
      lastTick,
      getSymbolPrice,
      requestQuoteFetch,
      subscribeToTicks,
      subscribeToSymbol,
    }),
    [
      status,
      latencyMs,
      livePrices,
      cryptoPrices,
      macroData,
      lastTick,
      getSymbolPrice,
      requestQuoteFetch,
      subscribeToTicks,
      subscribeToSymbol,
    ]
  );

  return (
    <TradeEngineContext.Provider value={contextValue}>
      {children}
    </TradeEngineContext.Provider>
  );
}

export function useTradeEngine() {
  return useContext(TradeEngineContext);
}

export function useLiveSymbol(symbol: string) {
  const { getSymbolPrice, subscribeToSymbol, requestQuoteFetch, status, latencyMs } = useTradeEngine();
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToSymbol(symbol, onStoreChange),
    [subscribeToSymbol, symbol]
  );
  const getSnapshot = useCallback(() => getSymbolPrice(symbol), [getSymbolPrice, symbol]);
  const live = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (symbol && !live) {
      requestQuoteFetch(symbol);
    }
  }, [symbol, live, requestQuoteFetch]);

  return {
    live,
    isLive: Boolean(live),
    engineStatus: status,
    latencyMs,
  };
}
