// ─── Zerodha Kite Stocks Catalog API Route ───────────────────────────────────
// Pulls, searches, and synchronizes all 3,800+ NSE equity stocks directly from Zerodha Kite.

import { NextRequest, NextResponse } from 'next/server';
import {
  getZerodhaCatalog,
  searchZerodhaStocks,
  findZerodhaStockBySymbol,
  fetchLiveZerodhaInstruments,
  getZerodhaStocksCount,
} from '@/lib/screener/zerodhaStocks';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const refresh = searchParams.get('refresh');
  const query = searchParams.get('q') || '';
  const symbol = searchParams.get('symbol') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  // 1. Live synchronization action: Pull latest from Zerodha Kite endpoint
  if (action === 'sync' || refresh === 'true') {
    const syncResult = await fetchLiveZerodhaInstruments();
    return NextResponse.json({
      ...syncResult,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Fetch specific symbol
  if (symbol) {
    const item = findZerodhaStockBySymbol(symbol);
    if (!item) {
      return NextResponse.json({ error: `Stock ${symbol} not found in Zerodha catalog` }, { status: 404 });
    }
    return NextResponse.json(item);
  }

  // 3. Search query across 3,800+ Zerodha stocks
  if (query) {
    const matches = searchZerodhaStocks(query, Math.min(limit, 200));
    return NextResponse.json({
      totalCatalogCount: getZerodhaStocksCount(),
      matchCount: matches.length,
      companies: matches,
    });
  }

  // 4. Default: Return sample of catalog + total count
  const catalog = getZerodhaCatalog();
  return NextResponse.json({
    totalCatalogCount: catalog.length,
    sampleCount: Math.min(limit, catalog.length),
    companies: catalog.slice(0, limit),
    source: 'Zerodha Kite Connect (NSE Instruments)',
  });
}

export async function POST(_request: NextRequest) {
  // Trigger fresh pull from Zerodha
  const syncResult = await fetchLiveZerodhaInstruments();
  return NextResponse.json({
    ...syncResult,
    timestamp: new Date().toISOString(),
  });
}
