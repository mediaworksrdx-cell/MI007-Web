// ─── Dedicated F&O Engine API Route ──────────────────────────────────────────
// Route: /api/fno
// Provides isolated derivatives feeds powered directly by the Trade Engine backend.
// Completely separated from /api/trade-engine to guarantee non-disturbance.

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchFnoSpotQuote,
  fetchFnoOptionChain,
  getFnoEngineStatus,
} from '@/lib/fno/fnoTwelveDataEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';
  const symbol = searchParams.get('symbol') || 'SPX';
  const expiry = searchParams.get('expiry') || undefined;
  const spotParam = searchParams.get('spot');
  const overrideSpot = spotParam ? parseFloat(spotParam) : undefined;

  try {
    switch (action) {
      case 'spot': {
        const quote = await fetchFnoSpotQuote(symbol);
        return NextResponse.json(quote, {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'X-Fno-Engine': 'TradeEngine-Isolated',
          },
        });
      }

      case 'chain': {
        const chain = await fetchFnoOptionChain(symbol, expiry, overrideSpot);
        return NextResponse.json(chain, {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'X-Fno-Engine': 'TradeEngine-Isolated',
          },
        });
      }

      case 'status': {
        const status = getFnoEngineStatus();
        return NextResponse.json(status, {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'X-Fno-Engine': 'TradeEngine-Isolated',
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Supported actions: spot, chain, status` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[API /api/fno] Error:', error);
    return NextResponse.json(
      { error: 'Fno Engine internal error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
