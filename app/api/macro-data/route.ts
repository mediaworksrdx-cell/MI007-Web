import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GCP_TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'https://synthetixanalytics.com';

const BASELINE_MACROS = [
  { symbol: 'DXY', value: '104.43', change: 0.12, changePercent: 0.11 },
  { symbol: 'XAU/USD', value: '3856.74', change: -7.69, changePercent: -0.20 },
  { symbol: 'XAG/USD', value: '42.39', change: -0.42, changePercent: -0.98 },
  { symbol: 'US10Y', value: '4.24%', change: 0.01, changePercent: 0.24 },
  { symbol: 'BRENT', value: '58.67', change: 0.45, changePercent: 0.55 },
  { symbol: 'VIX', value: '22.91', change: 3.61, changePercent: 18.70 },
  { symbol: 'EUR/USD', value: '1.0997', change: -0.0007, changePercent: -0.06 },
  { symbol: 'GBP/USD', value: '1.3388', change: 0.0013, changePct: 0.10 },
  { symbol: 'USD/JPY', value: '157.28', change: -0.37, changePercent: -0.23 },
  { symbol: 'USD/INR', value: '84.15', change: 0.05, changePercent: 0.06 },
  { symbol: 'GOLD', value: '3856.74', change: -7.69, changePercent: -0.20 },
  { symbol: 'SILVER', value: '42.39', change: -0.42, changePercent: -0.98 },
];

export async function GET() {
  try {
    const res = await fetch(`${GCP_TRADE_ENGINE_URL}/macro-data`, {
      cache: 'no-store',
      signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(2000) : undefined,
    });

    if (res.ok) {
      const gcpMacros = await res.json();
      if (Array.isArray(gcpMacros) && gcpMacros.length > 0) {
        // Merge GCP Twelve Data values into full baseline set
        const map = new Map<string, any>();
        BASELINE_MACROS.forEach(m => map.set(m.symbol, m));
        gcpMacros.forEach((gm: any) => {
          if (gm.symbol && gm.value) {
            const existing = map.get(gm.symbol) || {};
            map.set(gm.symbol, {
              ...existing,
              symbol: gm.symbol,
              value: gm.value,
            });
          }
        });
        return NextResponse.json(Array.from(map.values()));
      }
    }
  } catch (_err) {
    // Fall through to baseline
  }

  return NextResponse.json(BASELINE_MACROS);
}
