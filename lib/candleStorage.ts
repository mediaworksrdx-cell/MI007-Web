import { Candle } from './types';

const DB_NAME = 'MI007_MarketData';
const DB_VERSION = 1;
const STORE_NAME = 'candles';

function getStorageKey(symbol: string, timeframe: string): string {
  return `${symbol.trim().toUpperCase()}_${timeframe.trim()}`;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[CandleStorage] IndexedDB open error, falling back to localStorage');
          resolve(null);
        };
      } catch (e) {
        console.warn('[CandleStorage] IndexedDB init exception:', e);
        resolve(null);
      }
    });
  }

  return dbPromise;
}

/** Load cached candles from IndexedDB with fallback to localStorage */
export async function loadStoredCandles(symbol: string, timeframe: string): Promise<Candle[] | null> {
  const key = getStorageKey(symbol, timeframe);

  try {
    const db = await getDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => {
            const res = req.result;
            if (res && Array.isArray(res.candles) && res.candles.length > 0) {
              resolve(res.candles);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    // Fallback: localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(`mi007_candles_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (err) {
    console.warn(`[CandleStorage] Error loading candles for ${key}:`, err);
  }

  return null;
}

/** Save candles to IndexedDB with fallback to localStorage (caps at max 1000 candles) */
export async function saveStoredCandles(symbol: string, timeframe: string, candles: Candle[]): Promise<void> {
  if (!candles || candles.length === 0) return;
  const key = getStorageKey(symbol, timeframe);
  // Keep the most recent 1000 candles to optimize disk & memory
  const trimmed = candles.slice(-1000);

  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put({ key, candles: trimmed, updatedAt: Date.now() });
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
      return;
    }

    // Fallback: localStorage (keep recent 300 for quota safety)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`mi007_candles_${key}`, JSON.stringify(trimmed.slice(-300)));
    }
  } catch (err) {
    console.warn(`[CandleStorage] Error saving candles for ${key}:`, err);
  }
}

/** Purge cached candles for a specific symbol/timeframe or all symbols */
export async function purgeStoredCandles(symbol?: string, timeframe?: string): Promise<void> {
  try {
    const db = await getDB();
    if (symbol && timeframe) {
      const key = getStorageKey(symbol, timeframe);
      if (db) {
        await new Promise<void>((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch { resolve(); }
        });
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`mi007_candles_${key}`);
      }
    } else if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch { resolve(); }
      });
    }
  } catch (err) {
    console.warn('[CandleStorage] Error purging stored candles:', err);
  }
}

/**
 * Merges two arrays of candles:
 * - Deduplicates on openTime
 * - Sorts in ascending chronological order
 * - Keeps incoming candle values for identical timestamps (updates closing prices)
 */
export function mergeCandleArrays(base: Candle[], incoming: Candle[], timeframeMs?: number): Candle[] {
  if (!base || base.length === 0) return (incoming || []).slice(-1000);
  if (!incoming || incoming.length === 0) return (base || []).slice(-1000);

  // Infer timeframe interval from candles if not explicitly supplied
  let inferredMs = timeframeMs;
  if (!inferredMs || inferredMs <= 0) {
    if (incoming.length > 1) {
      inferredMs = Math.abs(incoming[1].openTime - incoming[0].openTime);
    } else if (base.length > 1) {
      inferredMs = Math.abs(base[1].openTime - base[0].openTime);
    }
  }
  const bucketMs = (inferredMs && inferredMs >= 60_000) ? inferredMs : 3_600_000;

  const candleMap = new Map<number, Candle>();
  const getBucket = (ts: number) => Math.floor(ts / bucketMs) * bucketMs;

  // Insert base candles mapped to their calendar interval bucket
  for (const c of base) {
    if (c && typeof c.openTime === 'number' && !isNaN(c.openTime) && c.close > 0) {
      const bTime = getBucket(c.openTime);
      candleMap.set(bTime, { ...c, openTime: bTime });
    }
  }

  // Merge incoming candles into the same buckets
  for (const c of incoming) {
    if (c && typeof c.openTime === 'number' && !isNaN(c.openTime) && c.close > 0) {
      const bTime = getBucket(c.openTime);
      const existing = candleMap.get(bTime);
      if (existing) {
        // Guard against scale mismatch: if existing and incoming prices diverge by > 5% or existing is corrupt,
        // incoming authoritative candle overwrites existing completely instead of combining with Math.max/min
        const divergence = existing.close > 0 ? Math.abs(c.close - existing.close) / existing.close : 1;
        const isExistingCorrupt = (existing.high - existing.low) / Math.max(1, existing.low) > 0.08;
        if (divergence > 0.05 || isExistingCorrupt) {
          candleMap.set(bTime, { ...c, openTime: bTime });
        } else {
          const top = Math.max(existing.open, c.close);
          const bot = Math.min(existing.open, c.close);
          const maxWick = top * 0.02;
          candleMap.set(bTime, {
            openTime: bTime,
            open: existing.open > 0 ? existing.open : c.open,
            close: c.close,
            high: Math.min(Math.max(existing.high, c.high, top), Number((top + maxWick).toFixed(2))),
            low: Math.max(Math.min(existing.low, c.low, bot), Number(Math.max(1, bot - maxWick).toFixed(2))),
            volume: Math.max(existing.volume, c.volume),
          });
        }
      } else {
        candleMap.set(bTime, { ...c, openTime: bTime });
      }
    }
  }

  const merged = Array.from(candleMap.values()).sort((a, b) => a.openTime - b.openTime);
  return merged.slice(-1000);
}
