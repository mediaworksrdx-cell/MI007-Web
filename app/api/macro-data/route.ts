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
  { symbol: 'XAU/USD', value: '3859.30', change: -26.00, changePercent: -0.67 },
  { symbol: 'GOLD', value: '3859.30', change: -26.00, changePercent: -0.67 },
  { symbol: 'XAG/USD', value: '47.56', change: -2.41, changePercent: -4.83 },
  { symbol: 'SILVER', value: '47.56', change: -2.41, changePercent: -4.83 },
  { symbol: 'US10Y', value: '4.24%', change: 0.01, changePercent: 0.24 },
  { symbol: 'BRENT', value: '93.25', change: -2.57, changePercent: -2.68 },
  { symbol: 'WTI', value: '86.40', change: -2.34, changePercent: -2.64 },
  { symbol: 'NATGAS', value: '3.15', change: -0.20, changePercent: -5.84 },
  { symbol: 'COPPER', value: '5.98', change: -0.20, changePercent: -3.26 },
  { symbol: 'VIX', value: '22.91', change: 3.61, changePercent: 18.70 },
  { symbol: 'EUR/USD', value: '1.0990', change: -0.0179, changePercent: -1.60 },
  { symbol: 'GBP/USD', value: '1.3188', change: -0.0162, changePercent: -1.21 },
  { symbol: 'USD/JPY', value: '159.33', change: 0.62, changePercent: 0.39 },
  { symbol: 'USD/INR', value: '93.46', change: -0.47, changePercent: -0.50 },
  { symbol: 'USD/CAD', value: '1.4298', change: 0.0112, changePercent: 0.79 },
  { symbol: 'AUD/CAD', value: '0.9621', change: -0.0123, changePercent: -1.26 },
  { symbol: 'USD/CHF', value: '0.8405', change: 0.0156, changePercent: 1.89 },
  { symbol: 'AUD/USD', value: '0.6731', change: -0.0139, changePercent: -2.02 },
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
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=5d`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
      });
      if (!res.ok) return;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== 'number' || meta.regularMarketPrice <= 0) return;

      const ltp = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose || ltp;
      const isForex = yahooSym.includes('=X');
      const isPercent = symbol === 'US10Y';
      const decimals = isForex ? (ltp < 2 ? 4 : 2) : (isPercent ? 2 : 2);

      const chg = +(ltp - prev).toFixed(decimals);
      const chgPct = +(((ltp - prev) / Math.max(0.001, prev)) * 100).toFixed(2);
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
