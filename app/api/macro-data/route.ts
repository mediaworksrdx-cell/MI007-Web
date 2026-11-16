import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const macros = [
    { symbol: 'DXY', value: '104.20', change: 0.12, changePercent: 0.11 },
    { symbol: 'XAU/USD', value: '2650.50', change: 12.20, changePercent: 0.57 },
    { symbol: 'XAG/USD', value: '31.50', change: 0.35, changePercent: 1.12 },
    { symbol: 'US10Y', value: '4.25%', change: 0.02, changePercent: 0.47 },
    { symbol: 'BRENT', value: '74.50', change: 0.45, changePercent: 0.55 },
    { symbol: 'VIX', value: '18.56', change: 0.85, changePercent: 4.80 },
    { symbol: 'EUR/USD', value: '1.1151', change: -0.0030, changePercent: -0.27 },
    { symbol: 'GBP/USD', value: '1.3388', change: 0.0013, changePercent: 0.10 },
    { symbol: 'USD/JPY', value: '157.28', change: -0.37, changePercent: -0.23 },
    { symbol: 'USD/INR', value: '94.94', change: -0.27, changePercent: -0.28 },
    { symbol: 'GOLD', value: '2650.50', change: 11.80, changePercent: 0.45 },
    { symbol: 'SILVER', value: '31.50', change: 0.35, changePercent: 1.12 },
  ];

  return NextResponse.json(macros);
}
