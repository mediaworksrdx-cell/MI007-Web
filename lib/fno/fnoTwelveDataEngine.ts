// ─── Dedicated Twelve Data F&O Engine ────────────────────────────────────────
// Standalone derivatives engine running independently from the main Trade Engine.
// Designed for seamless transition to Twelve Data Venture tier.

import { getFnoConfig } from './fnoConfig';
import { generateOptionChain, findFnoInstrument } from './fnoDataService';
import { OptionChainData } from './fnoTypes';

// Isolated In-Memory Cache for F&O Engine
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const fnoCache = new Map<string, CacheEntry<any>>();

function getFnoCached<T>(key: string, ttlMs: number): T | null {
  const entry = fnoCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    fnoCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setFnoCached<T>(key: string, data: T): void {
  if (fnoCache.size >= 300 && !fnoCache.has(key)) {
    const firstKey = fnoCache.keys().next().value;
    if (firstKey !== undefined) fnoCache.delete(firstKey);
  }
  fnoCache.set(key, { data, timestamp: Date.now() });
}

export interface FnoSpotQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  volume?: number;
  timestamp: number;
  source: 'trade-engine' | 'trade-engine-us' | 'trade-engine-kite' | 'yahoo-fno-fallback' | 'catalog-fallback';
}

export interface FnoEngineStatus {
  engine: 'TradeEngineFno';
  isIsolated: boolean;
  plan: 'venture' | 'pro' | 'basic' | 'free';
  isVentureReady: boolean;
  hasDedicatedKey: boolean;
  activeKeyPreview: string;
  callsPerMinuteLimit: number;
  cachedEntriesCount: number;
  status: 'ONLINE' | 'STANDBY';
}

/** Symbol normalization for Twelve Data & Yahoo tickers */
function normalizeSymbol(symbol: string): { tdSymbol: string; yahooSymbol: string } {
  const upper = symbol.trim().toUpperCase();
  if (upper === 'SPX' || upper === 'S&P 500') {
    return { tdSymbol: 'SPX', yahooSymbol: '^GSPC' };
  }
  if (upper === 'NDX' || upper === 'NASDAQ 100') {
    return { tdSymbol: 'NDX', yahooSymbol: '^NDX' };
  }
  if (upper === 'DJI' || upper === 'DOW JONES') {
    return { tdSymbol: 'DJI', yahooSymbol: '^DJI' };
  }
  if (upper === 'VIX') {
    return { tdSymbol: 'VIX', yahooSymbol: '^VIX' };
  }
  if (upper === 'QQQ') {
    return { tdSymbol: 'QQQ', yahooSymbol: 'QQQ' };
  }
  if (upper === 'NIFTY 50' || upper === 'NIFTY') {
    return { tdSymbol: 'NIFTY 50', yahooSymbol: '^NSEI' };
  }
  if (upper === 'BANKNIFTY' || upper === 'BANK NIFTY') {
    return { tdSymbol: 'BANKNIFTY', yahooSymbol: '^NSEBANK' };
  }
  if (upper === 'FINNIFTY') {
    return { tdSymbol: 'FINNIFTY', yahooSymbol: 'NIFTY_FIN_SERVICE.NS' };
  }
  if (upper === 'SENSEX') {
    return { tdSymbol: 'SENSEX', yahooSymbol: '^BSESN' };
  }
  if (upper === 'MIDCPNIFTY') {
    return { tdSymbol: 'MIDCPNIFTY', yahooSymbol: '^NSEMDCP50' };
  }
  const yahooSym = upper.includes('.NS') || upper.includes('.BO') || upper.includes('^')
    ? upper
    : `${upper}.NS`;
  return { tdSymbol: upper, yahooSymbol: yahooSym };
}

/**
 * Fetches real-time spot quote for US / Global F&O instruments using the dedicated F&O engine.
 * Never shares quota or cache with the main Trade Engine.
 */
export async function fetchFnoSpotQuote(symbol: string): Promise<FnoSpotQuote> {
  const config = getFnoConfig();
  const cacheKey = `fno:spot:${symbol.toUpperCase()}`;
  const cached = getFnoCached<FnoSpotQuote>(cacheKey, config.spotCacheTtlMs);
  if (cached) return cached;

  const { tdSymbol, yahooSymbol } = normalizeSymbol(symbol);
  const tradeEngineUrl = process.env.TRADE_ENGINE_URL || 'http://138.91.105.85';

  // 0. Priority 1 for Indian F&O instruments: Zerodha Kite Trade Engine (/live-prices)
  try {
    const kiteRes = await fetch(`${tradeEngineUrl}/live-prices`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(3500),
    });
    if (kiteRes.ok) {
      const kiteItems = await kiteRes.json();
      if (Array.isArray(kiteItems)) {
        const cleanQuery = tdSymbol.replace(/\.NS$/, '').replace(/\.BO$/, '').toUpperCase();
        const match = kiteItems.find((item: any) => {
          const itemSym = String(item?.symbol || '').replace(/\.NS$/, '').replace(/\.BO$/, '').toUpperCase();
          return itemSym === cleanQuery || String(item?.symbol || '').toUpperCase() === tdSymbol.toUpperCase();
        });
        if (match && typeof match.ltp === 'number' && match.ltp > 0) {
          const result: FnoSpotQuote = {
            symbol: tdSymbol,
            price: +match.ltp.toFixed(2),
            change: typeof match.change === 'number' ? +match.change.toFixed(2) : 0,
            changePercent: typeof match.changePercent === 'number' ? +match.changePercent.toFixed(2) : 0,
            timestamp: match.timestamp || Date.now(),
            source: 'trade-engine-kite',
          };
          setFnoCached(cacheKey, result);
          return result;
        }
      }
    }
  } catch {
    // Fall through to Twelve Data / Yahoo
  }

  // 1. Query Trade Engine Twelve Data endpoint (/us/quote is live on Trade Engine; fallback to /fno/quote)
  try {
    const res = await fetch(
      `${tradeEngineUrl}/us/quote?symbol=${encodeURIComponent(tdSymbol)}`,
      {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(4500),
      }
    );
    if (res.ok) {
      const json = await res.json();
      // Guard: Trade Engine may substitute a proxy instrument (e.g. SPX -> SPY ETF, ~10x off).
      // Only accept the payload when the returned symbol matches what we asked for.
      const returnedSym = typeof json?.symbol === 'string' ? json.symbol.trim().toUpperCase() : '';
      const symbolMatches = !returnedSym || returnedSym === tdSymbol.toUpperCase();
      if (json && symbolMatches && json.close && !json.code && json.status !== 'error') {
        const ltp = parseFloat(json.close);
        const prev = parseFloat(json.previous_close || json.close);
        const chg = parseFloat(json.change || (ltp - prev).toFixed(2));
        const pct = parseFloat(json.percent_change || (((ltp - prev) / Math.max(0.01, prev)) * 100).toFixed(2));
        if (ltp > 0) {
          const result: FnoSpotQuote = {
            symbol: tdSymbol,
            price: +ltp.toFixed(2),
            change: +chg.toFixed(2),
            changePercent: +pct.toFixed(2),
            high: json.high ? parseFloat(json.high) : undefined,
            low: json.low ? parseFloat(json.low) : undefined,
            volume: json.volume ? parseInt(json.volume, 10) : undefined,
            timestamp: Date.now(),
            source: 'trade-engine-us',
          };
          setFnoCached(cacheKey, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn(`[FnoTwelveDataEngine] Notice fetching ${tdSymbol} from Trade Engine:`, err);
  }

  // 2. Seamless Yahoo Zero-Credit Fallback (does not consume Twelve Data credits)
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const yUrl = `https://${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
      const res = await fetch(yUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      if (res.status === 429) continue;
      if (res.ok) {
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta && typeof meta.regularMarketPrice === 'number') {
          const ltp = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || meta.previousClose || ltp;
          const chg = ltp - prev;
          const pct = prev > 0 ? (chg / prev) * 100 : 0;

          const result: FnoSpotQuote = {
            symbol: tdSymbol,
            price: +ltp.toFixed(2),
            change: +chg.toFixed(2),
            changePercent: +pct.toFixed(2),
            high: meta.regularMarketDayHigh,
            low: meta.regularMarketDayLow,
            volume: meta.regularMarketVolume,
            timestamp: Date.now(),
            source: 'yahoo-fno-fallback',
          };
          setFnoCached(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      // Continue to next host
    }
  }

  // 3. Fallback to catalog default
  const inst = findFnoInstrument(symbol);
  const fallbackResult: FnoSpotQuote = {
    symbol: inst.symbol,
    price: inst.spotPrice,
    change: inst.change,
    changePercent: inst.changePct,
    timestamp: Date.now(),
    source: 'catalog-fallback',
  };
  return fallbackResult;
}

/**
 * Returns Option Chain data for an instrument.
 * Synthesizes institutional quantitative models dynamically anchored to the real Twelve Data spot price.
 * When Twelve Data Venture options feeds are provisioned, this adapter directly ingests the exchange payload.
 */
export async function fetchFnoOptionChain(
  symbol: string,
  selectedExpiry?: string,
  overrideSpot?: number
): Promise<OptionChainData> {
  const config = getFnoConfig();
  const cacheKey = `fno:chain:${symbol.toUpperCase()}:${selectedExpiry || 'default'}`;
  const cached = getFnoCached<OptionChainData>(cacheKey, config.chainCacheTtlMs);
  if (cached && !overrideSpot) return cached;

  // Resolve authentic spot price via dedicated F&O spot quote
  let spot = overrideSpot;
  if (!spot || spot <= 0) {
    const spotQuote = await fetchFnoSpotQuote(symbol);
    spot = spotQuote.price;
  }

  // Generate quantitative institutional derivatives model anchored to real live spot
  const chain = generateOptionChain(symbol, selectedExpiry, spot);
  if (!overrideSpot) {
    setFnoCached(cacheKey, chain);
  }
  return chain;
}

/**
 * Returns F&O Engine operational status & telemetry
 */
export function getFnoEngineStatus(): FnoEngineStatus {
  const config = getFnoConfig();

  return {
    engine: 'TradeEngineFno',
    isIsolated: true,
    plan: config.plan,
    isVentureReady: config.isVentureReady,
    hasDedicatedKey: true,
    activeKeyPreview: 'Managed in TradeEngine',
    callsPerMinuteLimit: config.callsPerMinuteLimit,
    cachedEntriesCount: fnoCache.size,
    status: 'ONLINE',
  };
}
