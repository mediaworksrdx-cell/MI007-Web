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
  const clean = sym
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\.NS$/, '')
    .replace(/\.BO$/, '')
    .replace(/-USD$/, '')
    .replace(/USDT$/, '');

  // Canonical index mappings
  if (clean === 'NIFTY50' || clean === 'NIFTY_50' || clean === 'CNXNIFTY' || clean === 'NIFTY') {
    return 'NIFTY';
  }
  if (clean === 'BANKNIFTY' || clean === 'NIFTYBANK' || clean === 'BANK_NIFTY') {
    return 'BANKNIFTY';
  }
  if (clean === 'FINNIFTY' || clean === 'CNXFINANCE' || clean === 'NIFTYFINSERVICE' || clean === 'FIN_NIFTY') {
    return 'FINNIFTY';
  }
  if (clean === 'MIDCPNIFTY' || clean === 'NIFTYMIDCAPSELECT' || clean === 'NIFTYMIDSELECT') {
    return 'MIDCPNIFTY';
  }
  if (clean === 'SENSEX' || clean === 'BSESENSEX' || clean === 'BSE30') {
    return 'SENSEX';
  }
  if (clean === 'BANKEX' || clean === 'BSEBANKEX') {
    return 'BANKEX';
  }
  if (clean === 'TATAMOTORS' || clean === 'TATA_MOTORS' || clean === 'TMPV' || clean === 'TMCV') {
    return 'TATAMOTORS';
  }
  if (clean === 'ZOMATO' || clean === 'ETERNAL') {
    return 'ZOMATO';
  }
  if (clean === 'LTIM' || clean === 'LTIMINDTREE' || clean === 'LTI') {
    return 'LTIM';
  }
  if (clean === 'MIDCAP150' || clean === 'NIFTYMIDCAP150') {
    return 'MIDCAP150';
  }
  if (clean === 'SPX' || clean === 'S&P500' || clean === 'SP500') {
    return 'SPX';
  }
  if (clean === 'NDX' || clean === 'NASDAQ100' || clean === 'NASDAQ') {
    return 'NDX';
  }
  if (clean === 'DJI' || clean === 'DOWJONES' || clean === 'DOW') {
    return 'DJI';
  }
  if (clean === 'VIX' || clean === 'VOLATILITY' || clean === 'VIXY') {
    return 'VIX';
  }
  if (clean === 'QQQ' || clean === 'INVESCOQQQ') {
    return 'QQQ';
  }
  if (clean === 'BTC' || clean === 'BITCOIN') {
    return 'BTC';
  }
  if (clean === 'ETH' || clean === 'ETHEREUM') {
    return 'ETH';
  }
  if (clean === 'SOL' || clean === 'SOLANA') {
    return 'SOL';
  }
  if (clean === 'BNB' || clean === 'BINANCECOIN') {
    return 'BNB';
  }
  if (clean === 'DOGE' || clean === 'DOGECOIN') {
    return 'DOGE';
  }
  if (clean === 'SHIB' || clean === 'SHIBAINU') {
    return 'SHIB';
  }
  if (clean === 'XRP' || clean === 'RIPPLE') {
    return 'XRP';
  }
  if (clean === 'ADA' || clean === 'CARDANO') {
    return 'ADA';
  }
  if (clean === 'AVAX' || clean === 'AVALANCHE') {
    return 'AVAX';
  }
  if (clean === 'DOT' || clean === 'POLKADOT') {
    return 'DOT';
  }
  if (clean === 'LINK' || clean === 'CHAINLINK') {
    return 'LINK';
  }
  if (clean === 'MATIC' || clean === 'POLYGON' || clean === 'POL') {
    return 'MATIC';
  }

  return clean;
}

/** Check if two symbol representations refer to the same instrument */
export function areSymbolsEqual(symA: string, symB: string): boolean {
  return normalizeSymbolKey(symA) === normalizeSymbolKey(symB);
}

// ── API Fetchers ─────────────────────────────────────────────────────────────

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.TRADE_ENGINE_URL || 'http://138.91.105.85';
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

/** Fetch live quote for any single stock or index on-demand */
export async function fetchQuote(symbol: string): Promise<TradeEngineLivePrice | null> {
  if (!symbol) return null;
  try {
    const res = await fetch(`${getApiBaseUrl()}/quote?symbol=${encodeURIComponent(symbol)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.ltp === 'number') return data;
    return null;
  } catch {
    return null;
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
    if (data && Array.isArray(data.value)) return data.value;
    return [];
  } catch (err) {
    console.warn('[TradeEngineClient] fetchMacroData error:', err);
    return [];
  }
}
