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
import { isSymbolMarketOpen } from './marketHours';

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

const WS_URL = process.env.NEXT_PUBLIC_TRADE_ENGINE_WS || 'wss://synthetixanalytics.com/ws';

import { INITIAL_SEED_ITEMS } from '@/lib/seedData';
export { INITIAL_SEED_ITEMS };

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

const BINANCE_WS_MAP: Record<string, string> = {
  'BTCUSDT': 'BTC',
  'ETHUSDT': 'ETH',
  'SOLUSDT': 'SOL',
  'BNBUSDT': 'BNB',
  'XRPUSDT': 'XRP',
  'DOGEUSDT': 'DOGE',
  'ADAUSDT': 'ADA',
  'AVAXUSDT': 'AVAX',
  'LINKUSDT': 'LINK',
  'DOTUSDT': 'DOT',
  'POLUSDT': 'MATIC',
  'SHIBUSDT': 'SHIB',
};

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/solusdt@ticker/bnbusdt@ticker/xrpusdt@ticker/dogeusdt@ticker/adausdt@ticker/avaxusdt@ticker/linkusdt@ticker/dotusdt@ticker/polusdt@ticker/shibusdt@ticker';

export function TradeEngineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const latencyMsRef = useRef<number>(18);
  // Stable store instance (lazy useState init avoids reading refs during render)
  const [store] = useState<SymbolPriceStore>(() => new SymbolPriceStore(buildInitialPriceMap()));
  const [livePrices, setLivePrices] = useState<Map<string, LiveSymbolData>>(() => store.getMap());
  const [cryptoPrices, setCryptoPrices] = useState<TradeEngineCrypto[]>([]);
  const [macroData, setMacroData] = useState<TradeEngineMacro[]>([
    { symbol: 'DXY', value: '104.43' },
    { symbol: 'XAU/USD', value: '3856.74' },
    { symbol: 'XAG/USD', value: '42.39' },
    { symbol: 'US10Y', value: '4.24%' },
    { symbol: 'BRENT', value: '58.67' },
    { symbol: 'VIX', value: '22.91' },
  ]);
  const [lastTick, setLastTick] = useState<TradeEngineTick | null>(null);
  const lastTickRef = useRef<TradeEngineTick | null>(null);

  const listenersRef = useRef<Set<(tick: TradeEngineTick) => void>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const wsCryptoLastSeenRef = useRef<Map<string, number>>(new Map());
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
          const isOpen = isSymbolMarketOpen(p.symbol);
          const tickDirection = (isOpen && prevEntry)
            ? p.ltp > prevEntry.price ? 'up' : p.ltp < prevEntry.price ? 'down' : 'neutral'
            : 'neutral';

          const effectiveChange = (p.change !== 0 || p.changePercent !== 0)
            ? p.change
            : (prevEntry?.change ?? p.change);
          const effectiveChangePct = (p.change !== 0 || p.changePercent !== 0)
            ? p.changePercent
            : (prevEntry?.changePct ?? p.changePercent);

          const entry: LiveSymbolData = {
            symbol: p.symbol,
            price: p.ltp,
            change: effectiveChange,
            changePct: effectiveChangePct,
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

          // Emit ticks ONLY when the official market for this symbol is actively OPEN
          if (isOpen && (!prevEntry || prevEntry.price !== p.ltp)) {
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

          // Do not overwrite symbols actively streaming real-time ticks & 24h open from Coinbase WebSocket
          const lastWsTickAt = wsCryptoLastSeenRef.current.get(key) || 0;
          if (now - lastWsTickAt < 20_000) {
            continue;
          }

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

            // Guard: If symbol was recently updated by live exchange quote or tick stream (< 90s), do not overwrite with static baseline
            if (prevEntry && now - prevEntry.lastUpdated < 90_000 && Math.abs(prevEntry.price - numVal) > 0.0001) {
              continue;
            }

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

    // Institutional 4-second cadence for equities & indices quote reconciliation
    const pricesInterval = setInterval(syncLivePrices, 4000);
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

  // 3. WebSocket Real-time Tick Streams (Trade Engine + Binance Crypto Multi-Stream)
  useEffect(() => {
    let isDisposed = false;
    let cryptoWs: WebSocket | null = null;
    let cryptoReconnectTimer: NodeJS.Timeout | null = null;

    function connectCryptoWs() {
      if (isDisposed) return;
      if (typeof window === 'undefined') return;

      try {
        const cWs = new WebSocket(BINANCE_WS_URL);
        cryptoWs = cWs;

        cWs.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            const d = raw?.data;
            if (!d || !d.s || !d.c) return;

            const binanceSym = d.s;
            const sym = BINANCE_WS_MAP[binanceSym] || binanceSym.replace('USDT', '');
            const price = parseFloat(d.c);
            if (isNaN(price) || price <= 0) return;

            const change = parseFloat(d.p) || 0;
            const changePct = parseFloat(d.P) || 0;
            const volume = parseFloat(d.v) || 0;
            const now = Date.now();

            const tick: TradeEngineTick = {
              symbol: sym,
              price,
              volume,
              timestamp: now,
            };

            lastTickRef.current = tick;
            listenersRef.current.forEach((listener) => {
              try { listener(tick); } catch (e) { console.error(e); }
            });

            const key = normalizeSymbolKey(sym);
            wsCryptoLastSeenRef.current.set(key, now);
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
                change: +change.toFixed(price < 2 ? 4 : 2),
                changePct: +changePct.toFixed(2),
                volume,
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

            // Reject rogue mock crypto ticks from Synthetix WS; Coinbase WebSocket & Binance provide authentic crypto pricing
            const isCryptoSymbol = /^(BTC|ETH|SOL|BNB|DOGE|SHIB|XRP|ADA|AVAX|DOT|LINK|MATIC)/i.test(tick.symbol);
            if (isCryptoSymbol) {
              return;
            }

            // Discard wild outlier single-tick jumps (>35% dislocation)
            const key = normalizeSymbolKey(tick.symbol);
            const prevEntryCheck = store?.getMap().get(key);
            if (prevEntryCheck && prevEntryCheck.price > 0 && Math.abs(tick.price - prevEntryCheck.price) / prevEntryCheck.price > 0.35) {
              console.warn(`[TradeEngine WS] Discarding outlier tick for ${tick.symbol}: ${tick.price} vs current ${prevEntryCheck.price}`);
              return;
            }

            lastTickRef.current = tick;

            listenersRef.current.forEach(listener => {
              try { listener(tick); } catch (e) { console.error(e); }
            });

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
  }, [livePrices]);

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
