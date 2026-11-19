import { Candle } from '../types';

interface CacheEntry {
  candles: Candle[];
  fetchedAt: number;
  countRequested: number;
}

const CLIENT_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_CACHE_ENTRIES = 300;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Candle[]>>();

function makeKey(symbol: string, timeframe: string, market: string): string {
  return `${symbol.toUpperCase().trim()}|${timeframe}|${market.toUpperCase().trim()}`;
}

function pruneCacheIfNeeded() {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const oldestKey = cache.keys().next().value;
  if (oldestKey) cache.delete(oldestKey);
}

/**
 * Shared client-side candle fetcher with TTL caching and in-flight request deduplication.
 * Prevents redundant /api/candles requests when switching screener tabs or re-running scans.
 */
export async function fetchCachedCandles(
  symbol: string,
  timeframe: string = '1D',
  market: string = 'INDIA',
  count: number = 500,
  signal?: AbortSignal
): Promise<Candle[]> {
  const key = makeKey(symbol, timeframe, market);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.fetchedAt < CLIENT_CACHE_TTL_MS && (hit.candles.length >= count || hit.countRequested >= count)) {
    return hit.candles.length > count ? hit.candles.slice(-count) : hit.candles;
  }

  const existing = inFlight.get(key);
  if (existing) {
    const res = await existing;
    return res.length > count ? res.slice(-count) : res;
  }

  const reqCount = Math.max(count, 260);
  const promise = (async (): Promise<Candle[]> => {
    try {
      const url = `/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&market=${encodeURIComponent(market)}&count=${reqCount}`;
      const res = await fetch(url, { signal });
      if (!res.ok) return [];
      const json = await res.json();
      const arr: Candle[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.candles)
        ? json.candles
        : [];
      if (arr.length > 0) {
        pruneCacheIfNeeded();
        cache.set(key, { candles: arr, fetchedAt: Date.now(), countRequested: reqCount });
      }
      return arr;
    } catch {
      return [];
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  const candles = await promise;
  return candles.length > count ? candles.slice(-count) : candles;
}

/**
 * Concurrency-limited batch candle fetcher for screener strategy tabs.
 */
export async function fetchCandlesBatch(
  items: Array<{ symbol: string; market?: string }>,
  timeframe: string = '1D',
  count: number = 260,
  concurrency: number = 6,
  signal?: AbortSignal
): Promise<Map<string, Candle[]>> {
  const result = new Map<string, Candle[]>();
  const queue = [...items];
  const workerCount = Math.max(1, Math.min(concurrency, queue.length));

  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      if (signal?.aborted) break;
      const item = queue.shift();
      if (!item) break;
      const candles = await fetchCachedCandles(
        item.symbol,
        timeframe,
        item.market || 'INDIA',
        count,
        signal
      );
      if (candles.length >= 30) {
        result.set(item.symbol, candles);
      }
    }
  });

  await Promise.all(workers);
  return result;
}
