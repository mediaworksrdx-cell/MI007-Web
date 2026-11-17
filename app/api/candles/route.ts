import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MarketType, Candle, getInstrumentDecimals } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC', 'POL',
  'BTCUSD', 'BTCUSDT', 'ETHUSD', 'ETHUSDT', 'SOLUSD', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT',
]);
const USA_SYMBOLS = new Set([
  'SPX', 'NDX', 'NASDAQ', 'DJI', 'VIX', 'QQQ', 'SPY', 'DIA',
  'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'GOOG', 'AMD', 'NFLX', 'INTC', 'JPM', 'V', 'WMT', 'DIS',
]);
const UAE_SYMBOLS = new Set(['DFMGI', 'ADXGI', 'ADX', 'EMAAR', 'FAB', 'DEWA', 'ALDAR', 'ENBD', 'ADNOC', 'AIRARABIA', 'SALIK', 'DFM']);
const COMMODITY_FOREX_SYMBOLS = new Set([
  'GOLD', 'SILVER', 'BRENT', 'CRUDEOIL', 'WTI', 'NATGAS', 'COPPER', 'PLATINUM', 'XAUUSD', 'XAGUSD',
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDINR', 'USDCAD', 'UADCAD', 'AUDCAD', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDAED',
]);

const YAHOO_GLOBAL_MAP: Record<string, string> = {
  // Indian Indices
  'NIFTY': '^NSEI',
  'NIFTY 50': '^NSEI',
  'NIFTY50': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'BANK NIFTY': '^NSEBANK',
  'NIFTYBANK': '^NSEBANK',
  'SENSEX': '^BSESN',
  'BSE SENSEX': '^BSESN',
  'BSESENSEX': '^BSESN',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
  'NIFTY FINANCIAL': 'NIFTY_FIN_SERVICE.NS',
  'NIFTY FINANCIAL SERVICES': 'NIFTY_FIN_SERVICE.NS',
  'NIFTYFINSERVICE': 'NIFTY_FIN_SERVICE.NS',
  'MIDCPNIFTY': 'NIFTY_MID_SELECT.NS',
  'NIFTY MIDCAP SELECT': 'NIFTY_MID_SELECT.NS',
  'NIFTYMIDSELECT': 'NIFTY_MID_SELECT.NS',
  'BANKEX': 'BSE-BANK.BO',
  'BSE BANKEX': 'BSE-BANK.BO',
  'INDIA VIX': '^INDIAVIX',
  'INDIAVIX': '^INDIAVIX',

  // US Cash Indices
  'SPX': '^GSPC',
  'S&P 500': '^GSPC',
  'SP500': '^GSPC',
  'DJI': '^DJI',
  'DOW JONES': '^DJI',
  'DOW': '^DJI',
  'NASDAQ': '^IXIC',
  'NDX': '^NDX',
  'NASDAQ 100': '^NDX',
  'VIX': '^VIX',

  // UAE Indices & Equities
  'DFMGI': 'DFMGI.AE',
  'ADXGI': 'FADGI.FGI',
  'ADX': 'FADGI.FGI',
  'EMAAR': 'EMAAR.AE',
  'DEWA': 'DEWA.AE',
  'ENBD': 'EMIRATESNBD.AE',
  'AIRARABIA': 'AIRARABIA.AE',
  'SALIK': 'SALIK.AE',
  'DFM': 'DFM.AE',

  // Crypto (Yahoo fallback)
  'BTC': 'BTC-USD',
  'BTCUSD': 'BTC-USD',
  'BTCUSDT': 'BTC-USD',
  'ETH': 'ETH-USD',
  'ETHUSD': 'ETH-USD',
  'ETHUSDT': 'ETH-USD',
  'SOL': 'SOL-USD',
  'SOLUSD': 'SOL-USD',
  'SOLUSDT': 'SOL-USD',
  'BNB': 'BNB-USD',
  'BNBUSDT': 'BNB-USD',
  'DOGE': 'DOGE-USD',
  'DOGEUSDT': 'DOGE-USD',
  'SHIB': 'SHIB-USD',
  'SHIBUSDT': 'SHIB-USD',
  'XRP': 'XRP-USD',
  'XRPUSDT': 'XRP-USD',
  'ADA': 'ADA-USD',
  'ADAUSDT': 'ADA-USD',
  'AVAX': 'AVAX-USD',
  'AVAXUSDT': 'AVAX-USD',
  'DOT': 'DOT-USD',
  'DOTUSDT': 'DOT-USD',
  'LINK': 'LINK-USD',
  'LINKUSDT': 'LINK-USD',
  'MATIC': 'POL-USD',
  'POL': 'POL-USD',

  // Commodities & Forex
  'GOLD': 'GC=F',
  'XAU': 'GC=F',
  'XAUUSD': 'GC=F',
  'XAU/USD': 'GC=F',
  'SILVER': 'SI=F',
  'XAG': 'SI=F',
  'XAGUSD': 'SI=F',
  'XAG/USD': 'SI=F',
  'BRENT': 'BZ=F',
  'BRENT CRUDE': 'BZ=F',
  'CRUDEOIL': 'CL=F',
  'CRUDE OIL': 'CL=F',
  'WTI': 'CL=F',
  'WTI CRUDE': 'CL=F',
  'NATGAS': 'NG=F',
  'NATURAL GAS': 'NG=F',
  'COPPER': 'HG=F',
  'PLATINUM': 'PL=F',
  'EURUSD': 'EURUSD=X',
  'EUR/USD': 'EURUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USDJPY': 'JPY=X',
  'USD/JPY': 'JPY=X',
  'USDINR': 'INR=X',
  'USD/INR': 'INR=X',
  'USDCAD': 'CAD=X',
  'USD/CAD': 'CAD=X',
  'UADCAD': 'CAD=X',
  'AUDCAD': 'AUDCAD=X',
  'AUD/CAD': 'AUDCAD=X',
  'USDCHF': 'CHF=X',
  'USD/CHF': 'CHF=X',
  'AUDUSD': 'AUDUSD=X',
  'AUD/USD': 'AUDUSD=X',
  'NZDUSD': 'NZDUSD=X',
  'NZD/USD': 'NZDUSD=X',
  'USDAED': 'AED=X',
  'USD/AED': 'AED=X',

  // Top Indian Equities
  'RELIANCE': 'RELIANCE.NS',
  'TCS': 'TCS.NS',
  'HDFCBANK': 'HDFCBANK.NS',
  'INFY': 'INFY.NS',
  'ICICIBANK': 'ICICIBANK.NS',
  'TATAMOTORS': 'TMPV.NS',
  'SBIN': 'SBIN.NS',
  'BHARTIARTL': 'BHARTIARTL.NS',
  'ITC': 'ITC.NS',
  'LT': 'LT.NS',
};

function getIntervalSeconds(timeframe: string): number {
  switch (timeframe) {
    case '1m': return 60;
    case '5m': return 300;
    case '15m': return 900;
    case '30m': return 1800;
    case '1H': return 3600;
    case '4H': return 14400;
    case '1D': return 86400;
    case '1W': return 604800;
    case '1M': return 2592000;
    default: return 86400;
  }
}

function getCandleCloseTime(openTime: number, timeframe: string): number {
  if (timeframe === '1M') {
    const d = new Date(openTime);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  return openTime + getIntervalSeconds(timeframe) * 1000;
}

const tzPartsCache = new Map<string, Intl.DateTimeFormat>();
function getLocalExchangeParts(ts: number, timeZone: string): { dateKey: string; hourDec: number } {
  let fmt = tzPartsCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    tzPartsCache.set(timeZone, fmt);
  }
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(ts))) {
    parts[p.type] = p.value;
  }
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hourDec: Number(parts.hour) + Number(parts.minute) / 60,
  };
}

function getBinanceInterval(timeframe: string): string {
  switch (timeframe) {
    case '1m': return '1m';
    case '5m': return '5m';
    case '15m': return '15m';
    case '30m': return '30m';
    case '1H': return '1h';
    case '4H': return '4h';
    case '1D': return '1d';
    case '1W': return '1w';
    case '1M': return '1M';
    default: return '1h';
  }
}

function getYahooParams(timeframe: string, rangeOverride?: string | null): { interval: string; range: string; aggregate4H?: boolean } {
  if (rangeOverride) {
    switch (timeframe) {
      case '1m': return { interval: '1m', range: rangeOverride };
      case '5m': return { interval: '5m', range: rangeOverride };
      case '15m': return { interval: '15m', range: rangeOverride };
      case '30m': return { interval: '30m', range: rangeOverride };
      case '1H': return { interval: '1h', range: rangeOverride };
      case '4H': return { interval: '1h', range: rangeOverride, aggregate4H: true };
      case '1D': return { interval: '1d', range: rangeOverride };
      case '1W': return { interval: '1wk', range: rangeOverride };
      case '1M': return { interval: '1mo', range: rangeOverride };
      default: return { interval: '1d', range: rangeOverride };
    }
  }

  switch (timeframe) {
    case '1m': return { interval: '1m', range: '5d' };
    case '5m': return { interval: '5m', range: '60d' };
    case '15m': return { interval: '15m', range: '60d' };
    case '30m': return { interval: '30m', range: '60d' };
    case '1H': return { interval: '1h', range: '1y' };
    case '4H': return { interval: '1h', range: '1y', aggregate4H: true };
    case '1D': return { interval: '1d', range: '10y' };
    case '1W': return { interval: '1wk', range: '10y' };
    case '1M': return { interval: '1mo', range: '10y' };
    default: return { interval: '1d', range: '10y' };
  }
}

/**
 * Session-aligned 4H aggregation. Hourly candles are grouped per trading
 * session (a new session starts after any gap > 2h, e.g. overnight/weekend), and
 * 4-bar buckets are counted from each session's first bar rather than from the
 * start of the array.
 */
/**
 * Exchange-session-aligned 4H aggregation:
 * - 24/7 Crypto & 24/5 Forex/Commodities: aligned to fixed 4-hour UTC epoch boundaries (no artificial UTC-midnight split).
 * - Cash Equities/Indices (INDIA IST 09:15-15:30, UAE GST 10:00-15:00, USA ET 09:30-16:00):
 *   grouped per local exchange session day from the session open; partial final session buckets
 *   close strictly once the exchange's official closing bell has passed.
 */
function aggregateTo4H(
  candles: Candle[],
  symbol: string,
  market: MarketType,
  now: number = Date.now()
): Candle[] {
  if (candles.length === 0) return [];
  const cleanSym = symbol.toUpperCase().replace(/[\s\/-]+/g, '');
  const isContinuous24h = CRYPTO_SYMBOLS.has(cleanSym) || COMMODITY_FOREX_SYMBOLS.has(cleanSym);
  const FOUR_HOURS_MS = 4 * 3600_000;

  if (isContinuous24h) {
    const result: Candle[] = [];
    let chunk: Candle[] = [];
    let currentBucketStart = -1;
    const flushContinuous = () => {
      if (chunk.length === 0) return;
      const first = chunk[0];
      const last = chunk[chunk.length - 1];
      const allBarsClosed = chunk.every(c => c.isClosed === true);
      const bucketEnd = currentBucketStart + FOUR_HOURS_MS;
      const isClosed = allBarsClosed && (now >= bucketEnd || now - last.openTime > 6 * 3600_000);
      result.push({
        openTime: first.openTime,
        open: first.open,
        high: Math.max(...chunk.map(c => c.high)),
        low: Math.min(...chunk.map(c => c.low)),
        close: last.close,
        volume: chunk.reduce((acc, c) => acc + c.volume, 0),
        isClosed,
        ...(chunk.some(c => c.volumeEstimated) ? { volumeEstimated: true } : {}),
      });
      chunk = [];
    };
    for (const c of candles) {
      const bStart = Math.floor(c.openTime / FOUR_HOURS_MS) * FOUR_HOURS_MS;
      if (currentBucketStart !== -1 && bStart !== currentBucketStart) {
        flushContinuous();
      }
      currentBucketStart = bStart;
      chunk.push(c);
    }
    flushContinuous();
    return result;
  }

  // Cash market IANA timeZone & session close hour (handles DST automatically for America/New_York)
  const timeZone = market === 'INDIA'
    ? 'Asia/Kolkata'
    : market === 'UAE'
    ? 'Asia/Dubai'
    : 'America/New_York';
  const sessionCloseHourLocal = market === 'INDIA' ? 15.5 : market === 'UAE' ? 15.0 : 16.0;

  const result: Candle[] = [];
  let chunk: Candle[] = [];
  let chunkDateKey = '';

  const flushSession = (closedByNextSession: boolean) => {
    if (chunk.length === 0) return;
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const allBarsClosed = chunk.every(c => c.isClosed === true);
    const nowLocal = getLocalExchangeParts(now, timeZone);
    const isPastSessionClose = nowLocal.dateKey > chunkDateKey || (nowLocal.dateKey === chunkDateKey && nowLocal.hourDec >= sessionCloseHourLocal);
    const bucketClosed = chunk.length === 4
      ? allBarsClosed && now >= first.openTime + FOUR_HOURS_MS
      : allBarsClosed && (closedByNextSession || isPastSessionClose);

    result.push({
      openTime: first.openTime,
      open: first.open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: last.close,
      volume: chunk.reduce((acc, c) => acc + c.volume, 0),
      isClosed: bucketClosed,
      ...(chunk.some(c => c.volumeEstimated) ? { volumeEstimated: true } : {}),
    });
    chunk = [];
  };

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const { dateKey } = getLocalExchangeParts(c.openTime, timeZone);
    if (chunk.length > 0 && dateKey !== chunkDateKey) {
      flushSession(true);
    }
    chunkDateKey = dateKey;
    chunk.push(c);
    if (chunk.length === 4) {
      flushSession(false);
    }
  }
  if (chunk.length > 0) {
    flushSession(false);
  }
  return result;
}

/** Detects artificial synthetic linear staircase ramps */
function isArtificialLinearStaircase(candles: Candle[]): boolean {
  if (!candles || candles.length < 6) return false;
  let matchingDeltas = 0;
  for (let i = 2; i < Math.min(25, candles.length); i++) {
    const d1 = candles[i].close - candles[i - 1].close;
    const d2 = candles[i - 1].close - candles[i - 2].close;
    if (Math.abs(d1 - d2) < 0.25 && Math.abs(d1) > 0.05) {
      matchingDeltas++;
    }
  }
  return matchingDeltas >= 4;
}

function getSynthesizedVolume(
  symbol: string,
  timeframe: string,
  open: number,
  high: number,
  low: number,
  close: number,
  openTime: number
): number {
  const clean = symbol.toUpperCase().replace(/[\s\/-]+/g, '');
  const typicalPrice = (high + low + close) / 3;
  const candleRange = Math.max(high - low, Math.abs(close - open), typicalPrice * 0.0006);
  const movePct = candleRange / Math.max(1, typicalPrice);

  let baseVol = 50_000;
  if (clean.includes('NIFTY') && !clean.includes('BANK')) {
    baseVol = 24_000_000;
  } else if (clean.includes('BANK')) {
    baseVol = 9_500_000;
  } else if (clean.includes('SENSEX')) {
    baseVol = 18_000_000;
  } else if (clean.includes('FINNIFTY') || clean.includes('MIDCP')) {
    baseVol = 6_500_000;
  } else if (['EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'USDCHF', 'AUDUSD', 'NZDUSD'].includes(clean)) {
    baseVol = 28_000;
  } else if (clean.includes('INR')) {
    baseVol = 45_000;
  } else if (open > 5000) {
    baseVol = 120_000;
  } else if (open > 500) {
    baseVol = 850_000;
  } else {
    baseVol = Math.round(Math.max(10_000, 1_500_000 / Math.max(1, open)));
  }

  const tfSec = getIntervalSeconds(timeframe);
  const tfScale = Math.max(0.04, Math.min(24, tfSec / 3600));
  const expectedMove = 0.0035;
  const rangeFactor = Math.max(0.35, Math.min(3.2, Math.sqrt(movePct / expectedMove)));
  const pseudoSeed = Math.abs(Math.sin(openTime / 86400000 + (openTime % 86400000) * 0.0001));
  const jitter = 0.82 + pseudoSeed * 0.36;
  const d = new Date(openTime);
  const hour = d.getUTCHours();
  const sessionMultiplier = (hour === 9 || hour === 14 || hour === 15) ? 1.30 : (hour === 11 || hour === 12) ? 0.78 : 1.0;

  return Math.max(10, Math.round(baseVol * tfScale * rangeFactor * jitter * sessionMultiplier));
}

function loadPrecomputed5YrHistory(cleanSym: string, timeframe: string = '1D'): Candle[] | null {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'history-5y', `${cleanSym}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const now = Date.now();
        const tfMs = getIntervalSeconds(timeframe) * 1000;
        for (let i = 0; i < parsed.length; i++) {
          const c = parsed[i];
          if (!c.volume || c.volume <= 0) {
            c.volume = getSynthesizedVolume(cleanSym, timeframe, c.open, c.high, c.low, c.close, c.openTime);
            c.volumeEstimated = true;
          }
          if (typeof c.isClosed !== 'boolean') {
            c.isClosed = c.openTime > 0 && now >= c.openTime + tfMs;
          }
        }
        return parsed;
      }
    }
  } catch {}
  return null;
}

/** Fetches exact exchange historical candlestick data for Crypto from Binance (paginated beyond 1,000 bars, preserving float volume) */
async function fetchBinanceCandles(symbol: string, timeframe: string): Promise<Candle[] | null> {
  const clean = symbol.toUpperCase().replace(/[\s\/-]+/g, '').replace(/USD$/, '');
  const baseCoin = clean.replace(/USDT$/, '') === 'MATIC' ? 'POL' : clean.replace(/USDT$/, '');
  const pair = `${baseCoin}USDT`;
  const interval = getBinanceInterval(timeframe);
  const limit = 1000;
  const maxPages = 2; // Up to 2,000 bars
  const endpoints = ['https://api.binance.com/api/v3', 'https://api.binance.us/api/v3'];
  const now = Date.now();

  const mapRaw = (raw: any[]): Candle[] =>
    raw.map((k: any) => {
      const openTime = Number(k[0]);
      const open = parseFloat(k[1]);
      const high = parseFloat(k[2]);
      const low = parseFloat(k[3]);
      const close = parseFloat(k[4]);
      const volume = parseFloat(k[5] || '0');
      const closeTime = Number(k[6] || 0);
      const dec = getInstrumentDecimals(symbol, close);
      return {
        openTime,
        open: +open.toFixed(dec),
        high: +Math.max(high, open, close).toFixed(dec),
        low: +Math.min(low, open, close).toFixed(dec),
        close: +close.toFixed(dec),
        volume: Number.isFinite(volume) ? Number(volume.toFixed(6)) : 0,
        isClosed: closeTime > 0 ? now >= closeTime : now >= getCandleCloseTime(openTime, timeframe),
      };
    }).filter(c => Number.isFinite(c.openTime) && c.close > 0);

  for (const baseUrl of endpoints) {
    try {
      const allByOpenTime = new Map<number, Candle>();
      let endTime: number | undefined;

      for (let page = 0; page < maxPages; page++) {
        const endParam = endTime !== undefined ? `&endTime=${endTime}` : '';
        const url = `${baseUrl}/klines?symbol=${encodeURIComponent(pair)}&interval=${interval}&limit=${limit}${endParam}`;
        const res = await fetch(url, {
          cache: 'no-store',
          signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(4000) : undefined,
        });
        if (!res.ok) break;
        const raw = await res.json();
        if (!Array.isArray(raw) || raw.length === 0) break;

        const batch = mapRaw(raw);
        for (const c of batch) allByOpenTime.set(c.openTime, c);
        if (raw.length < limit) break;
        const earliestOpen = Number(raw[0]?.[0]);
        if (!Number.isFinite(earliestOpen) || earliestOpen <= 0) break;
        endTime = earliestOpen - 1;
      }

      if (allByOpenTime.size > 0) {
        return Array.from(allByOpenTime.values()).sort((a, b) => a.openTime - b.openTime);
      }
    } catch {}
  }
  return null;
}

/** Fetches authentic exchange historical candlestick data from Yahoo Finance */
async function fetchYahooFinanceCandles(symbol: string, timeframe: string, market: MarketType, rangeOverride?: string | null): Promise<Candle[] | null> {
  const cleanSym = symbol.toUpperCase().replace(/[\s\/-]+/g, '');
  let yahooSym = YAHOO_GLOBAL_MAP[cleanSym] || YAHOO_GLOBAL_MAP[symbol.toUpperCase()];

  if (!yahooSym) {
    if (cleanSym.includes('.')) {
      yahooSym = cleanSym;
    } else if (market === 'INDIA') {
      yahooSym = `${cleanSym}.NS`;
    } else if (market === 'USA') {
      yahooSym = cleanSym;
    } else if (market === 'UAE') {
      yahooSym = `${cleanSym}.AE`;
    } else {
      return null;
    }
  }

  const { interval, range, aggregate4H } = getYahooParams(timeframe, rangeOverride);
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];

  for (const host of hosts) {
    const url = `https://${host}/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=${interval}&range=${range}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(4500) : undefined,
      });
      if (!res.ok) continue;

      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;

      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const opens: (number | null)[] = quote.open || [];
      const highs: (number | null)[] = quote.high || [];
      const lows: (number | null)[] = quote.low || [];
      const closes: (number | null)[] = quote.close || [];
      const volumes: (number | null)[] = quote.volume || [];

      if (timestamps.length === 0) continue;

      const intervalSec = getIntervalSeconds(timeframe);
      const now = Date.now();
      let candles: Candle[] = [];

      const nonZeroVolumes = volumes.filter((v): v is number => v !== null && v > 0);
      const hasAuthenticVolume = nonZeroVolumes.length >= Math.max(1, Math.floor(timestamps.length * 0.15));
      const avgAuthenticVol = hasAuthenticVolume
        ? nonZeroVolumes.reduce((acc: number, v: number) => acc + v, 0) / nonZeroVolumes.length
        : 0;

      for (let i = 0; i < timestamps.length; i++) {
        const o = opens[i];
        const h = highs[i];
        const l = lows[i];
        const c = closes[i];
        if (o == null || h == null || l == null || c == null || isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) {
          continue;
        }
        const openTime = timestamps[i] * 1000;
        if (openTime > now + 300_000) continue;

        const closeTime = getCandleCloseTime(openTime, aggregate4H ? '1H' : timeframe);
        const isClosed = now >= closeTime;

        const sampleClose = Number(c || 0);
        const dec = getInstrumentDecimals(symbol, sampleClose);

        let finalVol = 0;
        let volEstimated = false;
        if (hasAuthenticVolume && volumes[i] && volumes[i]! > 0) {
          finalVol = Math.round(volumes[i]!);
        } else if (hasAuthenticVolume) {
          const rangeVal = Math.max(h - l, Math.abs(c - o), o * 0.0005);
          finalVol = Math.round(avgAuthenticVol * Math.max(0.35, Math.min(2.5, rangeVal / Math.max(0.001, o * 0.003))));
          volEstimated = true;
        } else {
          finalVol = getSynthesizedVolume(symbol, timeframe, o, h, l, c, openTime);
          volEstimated = true;
        }

        candles.push({
          openTime,
          open: +o.toFixed(dec),
          high: +Math.max(h, o, c).toFixed(dec),
          low: +Math.min(l, o, c).toFixed(dec),
          close: +c.toFixed(dec),
          volume: finalVol,
          isClosed,
          ...(volEstimated ? { volumeEstimated: true } : {}),
        });
      }

      if (candles.length === 0) continue;

      // Sync latest forming candle's close with real-time exchange quote
      const meta = result.meta;
      if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
        const dec = getInstrumentDecimals(symbol, meta.regularMarketPrice);
        const ltp = +meta.regularMarketPrice.toFixed(dec);
        const last = candles[candles.length - 1];
        if (now - last.openTime < intervalSec * 2500) {
          last.close = ltp;
          last.high = Math.max(last.high, ltp);
          last.low = Math.min(last.low, ltp);
        }
      }

      if (aggregate4H) {
        candles = aggregateTo4H(candles, symbol, market, now);
      }

      if (candles.length > 0) return candles;
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbol = searchParams.get('symbol') || 'NIFTY';
  const symbol = rawSymbol.toUpperCase().trim();
  const timeframe = searchParams.get('timeframe') || '1H';
  const rangeParam = searchParams.get('range');
  const marketParam = searchParams.get('market')?.toUpperCase() as MarketType | undefined;
  const cleanSym = symbol.replace(/[\s\/-]+/g, '');

  const isCrypto = CRYPTO_SYMBOLS.has(cleanSym) || symbol.endsWith('USDT') || symbol.endsWith('-USD');

  let market: MarketType = marketParam === 'USA' || marketParam === 'INDIA' || marketParam === 'UAE' ? marketParam : 'INDIA';
  if (isCrypto || USA_SYMBOLS.has(cleanSym) || COMMODITY_FOREX_SYMBOLS.has(cleanSym)) {
    market = 'USA';
  } else if (UAE_SYMBOLS.has(cleanSym)) {
    market = 'UAE';
  }

  // 1. Crypto -> Direct Binance Spot Exchange Klines (matches live Binance ticker & WebSocket)
  if (isCrypto) {
    const binanceCandles = await fetchBinanceCandles(symbol, timeframe);
    if (binanceCandles && binanceCandles.length > 0) {
      return NextResponse.json(binanceCandles);
    }
  }

  // 2. All Markets (US, India, UAE, Forex, Commodities, & Crypto fallback) -> Direct Yahoo Finance Exchange OHLCV
  const yahooCandles = await fetchYahooFinanceCandles(symbol, timeframe, market, rangeParam);
  if (yahooCandles && yahooCandles.length > 0) {
    return NextResponse.json(yahooCandles);
  }

  // 3. Offline fallback ONLY for 5Y/1D if Yahoo Finance is unreachable
  if (timeframe === '1D' || rangeParam === '5y') {
    const precomputed = loadPrecomputed5YrHistory(cleanSym);
    if (precomputed && precomputed.length > 0) {
      return NextResponse.json(precomputed);
    }
  }

  return NextResponse.json([], {
    headers: { 'X-MI007-Data-Warning': 'NO_REAL_DATA_AVAILABLE' },
  });
}
