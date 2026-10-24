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
  // India (Zerodha Kite Connected Live Tickers)
  { symbol: 'NIFTY 50', price: 22687.65, change: -201.25, changePct: -0.88 },
  { symbol: 'NIFTY', price: 22687.65, change: -201.25, changePct: -0.88 },
  { symbol: 'BANKNIFTY', price: 54925.70, change: -562.40, changePct: -1.01 },
  { symbol: 'BANK NIFTY', price: 54925.70, change: -562.40, changePct: -1.01 },
  { symbol: 'SENSEX', price: 73249.39, change: -870.61, changePct: -1.17 },
  { symbol: 'FINNIFTY', price: 24657.70, change: -188.50, changePct: -0.76 },
  { symbol: 'RELIANCE', price: 1184.50, change: -19.50, changePct: -1.62 },
  { symbol: 'TCS', price: 2506.90, change: 22.40, changePct: 0.90 },
  { symbol: 'HDFCBANK', price: 694.05, change: -12.90, changePct: -1.82 },
  { symbol: 'INFY', price: 1153.35, change: -15.80, changePct: -1.35 },
  { symbol: 'TITAN', price: 3480.00, change: 71.60, changePct: 2.10 },
  { symbol: 'BAJFINANCE', price: 7120.40, change: -32.20, changePct: -0.45 },
  { symbol: 'POLYCAB', price: 5840.20, change: 184.00, changePct: 3.25 },
  { symbol: 'DIXON', price: 13950.00, change: 549.00, changePct: 4.10 },
  { symbol: 'CDSL', price: 1580.40, change: 28.70, changePct: 1.85 },
  { symbol: 'DEEPAKNTR', price: 2280.00, change: -14.90, changePct: -0.65 },
  { symbol: 'SBIN', price: 970.00, change: 8.50, changePct: 0.88 },
  { symbol: 'TATAMOTORS', price: 270.00, change: -4.80, changePct: -1.75 },
  { symbol: 'ZOMATO', price: 248.50, change: 4.20, changePct: 1.72 },
  { symbol: 'ETERNAL', price: 248.50, change: 4.20, changePct: 1.72 },
  { symbol: 'LTIM', price: 5420.00, change: 82.50, changePct: 1.55 },
  { symbol: 'MIDCPNIFTY', price: 12958.45, change: 42.10, changePct: 0.33 },
  { symbol: 'BANKEX', price: 61083.33, change: -682.67, changePct: -1.10 },
  { symbol: 'JIOFIN', price: 203.59, change: -12.66, changePct: -5.85 },
  { symbol: 'TATASTEEL', price: 151.80, change: 1.20, changePct: 0.80 },
  { symbol: 'ADANIENT', price: 2515.00, change: 35.40, changePct: 1.43 },
  { symbol: 'HAL', price: 4795.80, change: -193.20, changePct: -3.87 },
  { symbol: 'IRFC', price: 135.40, change: -1.10, changePct: -0.81 },
  { symbol: 'VEDL', price: 485.60, change: 6.20, changePct: 1.29 },
  { symbol: 'BEL', price: 295.40, change: 3.80, changePct: 1.30 },
  { symbol: 'LT', price: 3638.30, change: 28.50, changePct: 0.79 },
  { symbol: 'ICICIBANK', price: 1398.50, change: 14.20, changePct: 1.03 },
  { symbol: 'BHARTIARTL', price: 1895.00, change: 12.20, changePct: 0.65 },

  // USA
  { symbol: 'SPX', price: 7690.73, change: 31.29, changePct: 0.41 },
  { symbol: 'S&P 500', price: 7690.73, change: 31.29, changePct: 0.41 },
  { symbol: 'NDX', price: 29529.34, change: 341.80, changePct: 1.17 },
  { symbol: 'NASDAQ 100', price: 29529.34, change: 341.80, changePct: 1.17 },
  { symbol: 'NASDAQ', price: 29529.34, change: 341.80, changePct: 1.17 },
  { symbol: 'DJI', price: 51966.03, change: -36.38, changePct: -0.07 },
  { symbol: 'DOW JONES', price: 51966.03, change: -36.38, changePct: -0.07 },
  { symbol: 'VIX', price: 18.44, change: -1.55, changePct: -7.75 },
  { symbol: 'QQQ', price: 718.36, change: 8.56, changePct: 1.21 },
  { symbol: 'NVDA', price: 217.09, change: 2.96, changePct: 1.38 },
  { symbol: 'AAPL', price: 342.94, change: -0.52, changePct: -0.15 },
  { symbol: 'MSFT', price: 533.52, change: 4.47, changePct: 0.84 },
  { symbol: 'TSLA', price: 368.06, change: 13.34, changePct: 3.76 },
  { symbol: 'META', price: 705.44, change: -3.89, changePct: -0.55 },
  { symbol: 'AMZN', price: 262.45, change: 12.45, changePct: 4.98 },
  { symbol: 'GOOGL', price: 344.18, change: 3.59, changePct: 1.05 },

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
  const storeRef = useRef<SymbolPriceStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new SymbolPriceStore(buildInitialPriceMap());
  }
  const [livePrices, setLivePrices] = useState<Map<string, LiveSymbolData>>(() => storeRef.current!.getMap());
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
      if (storeRef.current) {
        setLivePrices(storeRef.current.getMap());
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
        if (storeRef.current) {
          setLivePrices(storeRef.current.getMap());
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

      const changed = storeRef.current?.updateBatch((prev) => {
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

      if (changed && storeRef.current) {
        scheduleLivePricesUpdate();
      }
    } catch (err) {
      console.warn('[TradeEngineProvider] syncLivePrices error:', err);
    }
  }, [scheduleLivePricesUpdate]);

  // 2. Background Macro, Forex, Commodities & Crypto Polling (every 15 minutes = 900,000ms)
  const syncCryptoAndMacro = useCallback(async () => {
    try {
      const [cryptos, macros] = await Promise.all([
        fetchCryptoPrices(),
        fetchMacroData(),
      ]);

      if (macros.length > 0) setMacroData(macros);
      if (cryptos.length > 0) setCryptoPrices(cryptos);

      const now = Date.now();

      // Index cryptos into livePrices map
      if (cryptos.length > 0) {
        const changed = storeRef.current?.updateBatch((prev) => {
          const next = new Map(prev);
          const changedKeys = new Set<string>();
          for (const c of cryptos) {
            const key = normalizeSymbolKey(c.symbol);
            const prevEntry = next.get(key);
            if (prevEntry && prevEntry.price === c.current_price) continue;
            const tickDirection = prevEntry
              ? c.current_price > prevEntry.price ? 'up' : c.current_price < prevEntry.price ? 'down' : 'neutral'
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
            changedKeys.add(key);
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
        if (changed) {
          scheduleLivePricesUpdate();
        }
      }

      // Index commodities, forex, and macro into livePrices map
      if (macros.length > 0) {
        const changed = storeRef.current?.updateBatch((prev) => {
          const next = new Map(prev);
          const changedKeys = new Set<string>();
          for (const m of macros) {
            const numVal = parseFloat(String(m.value).replace(/[%$,]/g, ''));
            if (!isNaN(numVal) && numVal > 0) {
              const key = normalizeSymbolKey(m.symbol);
              const prevEntry = next.get(key) || next.get(m.symbol);
              if (prevEntry && prevEntry.price === numVal) continue;
              const tickDirection = prevEntry
                ? numVal > prevEntry.price ? 'up' : numVal < prevEntry.price ? 'down' : 'neutral'
                : 'neutral';

              const chg = typeof (m as any).change === 'number' ? (m as any).change : (prevEntry?.change || 0);
              const chgPct = typeof (m as any).changePercent === 'number' ? (m as any).changePercent : (prevEntry?.changePct || 0);

              const data: LiveSymbolData = {
                symbol: m.symbol,
                price: numVal,
                change: chg,
                changePct: chgPct,
                timestamp: now,
                tickDirection,
                lastUpdated: now,
              };

              changedKeys.add(key);
              next.set(key, data);
              next.set(m.symbol, data);
              next.set(m.symbol.toUpperCase(), data);
              next.set(m.symbol.replace('/', ''), data);
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
      }
    } catch (err) {
      console.warn('[TradeEngineProvider] syncCryptoAndMacro error:', err);
    }
  }, [scheduleLivePricesUpdate]);

  useEffect(() => {
    // Initial immediate pull
    syncLivePrices();
    syncCryptoAndMacro();

    // Fast 2-second polling strictly for live Indian equities & indices (Zerodha Kite)
    const pricesInterval = setInterval(syncLivePrices, 2000);
    // User-configured 15-minute polling cadence for US stocks, crypto, commodities, and forex (15 * 60 * 1000 = 900,000ms)
    const macroInterval = setInterval(syncCryptoAndMacro, 15 * 60 * 1000);

    // Refresh immediately when window regain visibility
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncLivePrices();
        syncCryptoAndMacro();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      clearInterval(pricesInterval);
      clearInterval(macroInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [syncLivePrices, syncCryptoAndMacro]);

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
            const changed = storeRef.current?.updateBatch((prev) => {
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

    return () => {
      isDisposed = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (throttleLivePricesTimeoutRef.current) clearTimeout(throttleLivePricesTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [scheduleLivePricesUpdate]);

  const pendingQuoteFetches = useRef<Set<string>>(new Set());

  const getSymbolPrice = useCallback((symbol: string): LiveSymbolData | undefined => {
    if (!symbol) return undefined;
    return storeRef.current?.getSymbol(symbol);
  }, []);

  const requestQuoteFetch = useCallback((symbol: string) => {
    if (!symbol) return;
    const cleanKey = normalizeSymbolKey(symbol);
    if (storeRef.current?.getSymbol(symbol)) return;
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
          storeRef.current?.updateBatch((prev) => {
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
    if (!storeRef.current) return () => {};
    return storeRef.current.subscribeSymbol(symbol, callback);
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
