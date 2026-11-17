import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MACRO_YAHOO_MAP: Record<string, string> = {
  'DXY': 'DX-Y.NYB',
  'XAU/USD': 'GC=F',
  'GOLD': 'GC=F',
  'XAG/USD': 'SI=F',
  'SILVER': 'SI=F',
  'US10Y': '^TNX',
  'BRENT': 'BZ=F',
  'WTI': 'CL=F',
  'NATGAS': 'NG=F',
  'COPPER': 'HG=F',
  'VIX': '^VIX',
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'USD/JPY': 'JPY=X',
  'USD/INR': 'INR=X',
  'USD/CAD': 'CAD=X',
  'AUD/CAD': 'AUDCAD=X',
  'USD/CHF': 'CHF=X',
  'AUD/USD': 'AUDUSD=X',
};

const BASELINE_MACROS: Array<{ symbol: string; value: string; change: number; changePercent: number }> = [
  { symbol: 'DXY', value: '104.43', change: 0.12, changePercent: 0.11 },
  { symbol: 'XAU/USD', value: '3854.30', change: 1.30, changePercent: 0.03 },
  { symbol: 'GOLD', value: '3854.30', change: 1.30, changePercent: 0.03 },
  { symbol: 'XAG/USD', value: '47.36', change: 0.58, changePercent: 1.23 },
  { symbol: 'SILVER', value: '47.36', change: 0.58, changePercent: 1.23 },
  { symbol: 'US10Y', value: '4.24%', change: 0.01, changePercent: 0.24 },
  { symbol: 'BRENT', value: '93.56', change: 1.12, changePercent: 1.21 },
  { symbol: 'WTI', value: '86.81', change: 1.09, changePercent: 1.27 },
  { symbol: 'NATGAS', value: '3.10', change: -0.02, changePercent: -0.67 },
  { symbol: 'COPPER', value: '5.97', change: -0.03, changePercent: -0.45 },
  { symbol: 'VIX', value: '23.04', change: 0.13, changePercent: 0.57 },
  { symbol: 'EUR/USD', value: '1.0981', change: -0.0044, changePercent: -0.40 },
  { symbol: 'GBP/USD', value: '1.3178', change: -0.0038, changePercent: -0.29 },
  { symbol: 'USD/JPY', value: '159.37', change: -0.40, changePercent: -0.25 },
  { symbol: 'USD/INR', value: '93.46', change: -0.78, changePercent: -0.83 },
  { symbol: 'USD/CAD', value: '1.4304', change: 0.0035, changePercent: 0.25 },
  { symbol: 'AUD/CAD', value: '0.9620', change: -0.0051, changePercent: -0.53 },
  { symbol: 'USD/CHF', value: '0.8410', change: 0.0019, changePercent: 0.23 },
  { symbol: 'AUD/USD', value: '0.6729', change: -0.0050, changePercent: -0.74 },
];

let cachedPayload: any[] | null = null;
let lastCacheTs = 0;
const CACHE_TTL_MS = 15_000;

export async function GET() {
  const now = Date.now();
  if (cachedPayload && now - lastCacheTs < CACHE_TTL_MS) {
    return NextResponse.json(cachedPayload);
  }

  const resultMap = new Map<string, any>();
  BASELINE_MACROS.forEach(m => resultMap.set(m.symbol, { ...m }));

  // Query Yahoo Finance for all Macro & Commodity & Forex benchmarks
  const fetches = Object.entries(MACRO_YAHOO_MAP).map(async ([symbol, yahooSym]) => {
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=2d`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
      });
      if (!res.ok) return;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;

      const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes = quotes?.close ? quotes.close.filter((x: any) => typeof x === 'number' && !isNaN(x)) : [];
      const ltp = meta.regularMarketPrice;
      const prev = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose || ltp);
      const isForex = yahooSym.includes('=X');
      const isPercent = symbol === 'US10Y';
      const decimals = isForex ? (ltp < 2 ? 4 : 2) : (isPercent ? 2 : 2);

      const chg = +(ltp - prev).toFixed(decimals);
      const chgPct = +(((ltp - prev) / Math.max(0.0001, prev)) * 100).toFixed(2);
      const formattedVal = isPercent ? `${ltp.toFixed(2)}%` : ltp.toFixed(decimals);

      resultMap.set(symbol, {
        symbol,
        value: formattedVal,
        change: chg,
        changePercent: chgPct,
      });
    } catch (_err) {}
  });

  await Promise.all(fetches);

  const result = Array.from(resultMap.values());
  cachedPayload = result;
  lastCacheTs = Date.now();

  return NextResponse.json(result);
}
