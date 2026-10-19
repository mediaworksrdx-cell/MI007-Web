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

const WS_URL = process.env.NEXT_PUBLIC_TRADE_ENGINE_WS || 'ws://138.91.105.85/ws';

// Baseline initial instruments to seed the engine immediately before first network tick
const INITIAL_SEED_ITEMS: Array<{ symbol: string; price: number; change: number; changePct: number }> = [
  // India (Zerodha Kite Connected Live Tickers)
  { symbol: 'NIFTY 50', price: 23146.15, change: 148.80, changePct: 0.65 },
  { symbol: 'NIFTY', price: 23146.15, change: 148.80, changePct: 0.65 },
  { symbol: 'BANKNIFTY', price: 55844.00, change: 33.50, changePct: 0.06 },
  { symbol: 'BANK NIFTY', price: 55844.00, change: 33.50, changePct: 0.06 },
  { symbol: 'SENSEX', price: 74729.27, change: 413.66, changePct: 0.56 },
  { symbol: 'FINNIFTY', price: 25480.00, change: -24.50, changePct: -0.10 },
  { symbol: 'RELIANCE', price: 1211.20, change: -12.40, changePct: -1.01 },
  { symbol: 'TCS', price: 2465.00, change: 38.50, changePct: 1.59 },
  { symbol: 'HDFCBANK', price: 728.85, change: 4.20, changePct: 0.58 },
  { symbol: 'INFY', price: 1161.20, change: 24.30, changePct: 2.14 },
  { symbol: 'TITAN', price: 3480.00, change: 71.60, changePct: 2.10 },
  { symbol: 'BAJFINANCE', price: 7120.40, change: -32.20, changePct: -0.45 },
  { symbol: 'POLYCAB', price: 5840.20, change: 184.00, changePct: 3.25 },
  { symbol: 'DIXON', price: 13950.00, change: 549.00, changePct: 4.10 },
  { symbol: 'CDSL', price: 1580.40, change: 28.70, changePct: 1.85 },
  { symbol: 'DEEPAKNTR', price: 2280.00, change: -14.90, changePct: -0.65 },
  { symbol: 'ITC', price: 485.50, change: -2.30, changePct: -0.47 },
  { symbol: 'SBIN', price: 865.40, change: -4.60, changePct: -0.53 },
  { symbol: 'TATAMOTORS', price: 283.70, change: -3.35, changePct: -1.17 },
  { symbol: 'LT', price: 3749.10, change: 18.00, changePct: 0.48 },
  { symbol: 'ICICIBANK', price: 1383.00, change: -6.40, changePct: -0.46 },
  { symbol: 'BHARTIARTL', price: 1882.80, change: 28.80, changePct: 1.55 },

  // USA
  { symbol: 'SPX', price: 7703.58, change: 44.14, changePct: 0.58 },
  { symbol: 'S&P 500', price: 7703.58, change: 44.14, changePct: 0.58 },
  { symbol: 'NDX', price: 29630.77, change: 443.22, changePct: 1.52 },
  { symbol: 'NASDAQ 100', price: 29630.77, change: 443.22, changePct: 1.52 },
  { symbol: 'NASDAQ', price: 29630.77, change: 443.22, changePct: 1.52 },
  { symbol: 'DJI', price: 51964.04, change: -38.37, changePct: -0.07 },
  { symbol: 'DOW JONES', price: 51964.04, change: -38.37, changePct: -0.07 },
  { symbol: 'VIX', price: 18.56, change: -1.43, changePct: -7.15 },
  { symbol: 'QQQ', price: 717.71, change: 7.88, changePct: 1.11 },
  { symbol: 'NVDA', price: 214.10, change: 3.80, changePct: 1.81 },
  { symbol: 'AAPL', price: 343.50, change: 2.20, changePct: 0.64 },
  { symbol: 'MSFT', price: 529.00, change: -2.60, changePct: -0.49 },
  { symbol: 'TSLA', price: 354.70, change: 8.20, changePct: 2.37 },
  { symbol: 'META', price: 733.40, change: 9.60, changePct: 1.33 },
  { symbol: 'AMZN', price: 250.00, change: -1.05, changePct: -0.42 },
  { symbol: 'GOOGL', price: 340.60, change: 2.30, changePct: 0.68 },

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
  { symbol: 'XRP', price: 0.60, change: 0.008, changePct: 1.35 },
  { symbol: 'ADA', price: 0.45, change: 0.006, changePct: 1.35 },
  { symbol: 'AVAX', price: 28.50, change: 0.45, changePct: 1.60 },

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
    { symbol: 'XAU/USD', value: '2650.50' },
    { symbol: 'XAG/USD', value: '31.50' },
    { symbol: 'US10Y', value: '4.25%' },
    { symbol: 'BRENT', value: '74.50' },
    { symbol: 'VIX', value: '18.56' },
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

      // Also index commodities, forex, and macro into livePrices map
      if (macros.length > 0) {
        setLivePrices(prev => {
          const next = new Map(prev);
          for (const m of macros) {
            const numVal = parseFloat(String(m.value).replace(/[%$,]/g, ''));
            if (!isNaN(numVal) && numVal > 0) {
              const key = normalizeSymbolKey(m.symbol);
              const prevEntry = next.get(key) || next.get(m.symbol);
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

              next.set(key, data);
              next.set(m.symbol, data);
              next.set(m.symbol.toUpperCase(), data);
              next.set(m.symbol.replace('/', ''), data);
              next.set(m.symbol.replace(/\s+/g, ''), data);

              if (m.symbol === 'XAU/USD' || m.symbol === 'GOLD') {
                next.set('GOLD', data);
                next.set('XAU', data);
                next.set('XAUUSD', data);
              }
              if (m.symbol === 'XAG/USD' || m.symbol === 'SILVER') {
                next.set('SILVER', data);
                next.set('XAG', data);
                next.set('XAGUSD', data);
              }
              if (m.symbol === 'BRENT' || m.symbol === 'CRUDEOIL') {
                next.set('BRENT', data);
                next.set('CRUDEOIL', data);
                next.set('OIL', data);
              }
              if (m.symbol === 'WTI') {
                next.set('WTI', data);
                next.set('CRUDE_WTI', data);
              }
              if (m.symbol === 'NATGAS') {
                next.set('NATGAS', data);
                next.set('NATURALGAS', data);
              }
              if (m.symbol === 'COPPER') {
                next.set('COPPER', data);
              }
              if (m.symbol === 'USD/INR' || m.symbol === 'USDINR') {
                next.set('USDINR', data);
                next.set('USD/INR', data);
              }
              if (m.symbol === 'EUR/USD' || m.symbol === 'EURUSD') {
                next.set('EURUSD', data);
                next.set('EUR/USD', data);
              }
              if (m.symbol === 'GBP/USD' || m.symbol === 'GBPUSD') {
                next.set('GBPUSD', data);
                next.set('GBP/USD', data);
              }
              if (m.symbol === 'USD/JPY' || m.symbol === 'USDJPY') {
                next.set('USDJPY', data);
                next.set('USD/JPY', data);
              }
              if (m.symbol === 'USD/CHF' || m.symbol === 'USDCHF') {
                next.set('USDCHF', data);
                next.set('USD/CHF', data);
              }
              if (m.symbol === 'AUD/USD' || m.symbol === 'AUDUSD') {
                next.set('AUDUSD', data);
                next.set('AUD/USD', data);
              }
            }
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
    // Steady update cadence: polls snapshots every 30 seconds without frequent jitter
    const interval = setInterval(refreshHttpSnapshot, 30000);
    return () => clearInterval(interval);
  }, [refreshHttpSnapshot]);

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
    const upper = symbol.toUpperCase().trim();
    return (
      livePrices.get(cleanKey) ||
      livePrices.get(symbol) ||
      livePrices.get(upper) ||
      livePrices.get(`${cleanKey}.NS`) ||
      livePrices.get(`${upper}.NS`) ||
      livePrices.get(symbol.replace(/\s+/g, '')) ||
      livePrices.get(symbol.replace(/\.NS$/, ''))
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
