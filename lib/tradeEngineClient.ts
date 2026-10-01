import { Candle } from './types';

export interface TradeEngineLivePrice {
  instrumentToken: number;
  symbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface TradeEngineCrypto {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
}

export interface TradeEngineMacro {
  symbol: string;
  value: string;
}

export interface TradeEngineTick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}

// ── Symbol Normalizer ────────────────────────────────────────────────────────
export function normalizeSymbolKey(sym: string): string {
  if (!sym) return '';
  return sym
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\.NS$/, '')
    .replace(/\.BO$/, '')
    .replace(/-USD$/, '')
    .replace(/USDT$/, '');
}

/** Check if two symbol representations refer to the same instrument */
export function areSymbolsEqual(symA: string, symB: string): boolean {
  return normalizeSymbolKey(symA) === normalizeSymbolKey(symB);
}

// ── API Fetchers ─────────────────────────────────────────────────────────────

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.TRADE_ENGINE_URL || 'http://20.80.83.151';
  }
  return '/api/trade-engine';
}

/** Fetch current live prices for Indian stocks, indices, and active tickers */
export async function fetchLivePrices(): Promise<TradeEngineLivePrice[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/live-prices`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.warn('[TradeEngineClient] fetchLivePrices error:', err);
    return [];
  }
}

/** Fetch historical & active candles for any stock, index, or crypto */
export async function fetchCandles(
  symbol: string,
  timeframe: string = '1D',
  from?: number,
  to?: number
): Promise<Candle[]> {
  try {
    const params = new URLSearchParams();
    params.set('symbol', symbol);
    params.set('timeframe', timeframe);
    if (from) params.set('from', String(from));
    if (to) params.set('to', String(to));

    const res = await fetch(`${getApiBaseUrl()}/candles?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    if (!Array.isArray(raw)) return [];

    return raw.map((item: any) => ({
      openTime: Number(item.openTime || item.timestamp || 0),
      open: Number(item.open || 0),
      high: Number(item.high || 0),
      low: Number(item.low || 0),
      close: Number(item.close || 0),
      volume: Number(item.volume || 0),
    }));
  } catch (err) {
    console.warn(`[TradeEngineClient] fetchCandles error for ${symbol}:`, err);
    return [];
  }
}

/** Fetch live crypto prices from CoinGecko via Trade Engine */
export async function fetchCryptoPrices(): Promise<TradeEngineCrypto[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/crypto-prices`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.warn('[TradeEngineClient] fetchCryptoPrices error:', err);
    return [];
  }
}

/** Fetch macro benchmark indicators (DXY, XAU/USD, US10Y, BRENT, VIX) */
export async function fetchMacroData(): Promise<TradeEngineMacro[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/macro-data`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.warn('[TradeEngineClient] fetchMacroData error:', err);
    return [];
  }
}
