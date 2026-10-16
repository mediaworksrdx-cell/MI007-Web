// ─── Screener Companies Search & Catalog API Route ───────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { MASTER_COMPANIES } from '@/lib/screener/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const market = searchParams.get('market') || 'INDIA';
  const query = searchParams.get('q') || '';
  const sector = searchParams.get('sector') || '';

  let list = MASTER_COMPANIES;

  if (market && market !== 'ALL') {
    list = list.filter((c) => c.market === market);
  }

  if (sector && sector !== 'ALL') {
    list = list.filter((c) => c.sector.toLowerCase() === sector.toLowerCase());
  }

  if (query) {
    const q = query.toLowerCase().trim();
    list = list.filter(
      (c) =>
        c.symbol.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    count: list.length,
    companies: list.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      exchange: c.exchange,
      market: c.market,
      sector: c.sector,
      industry: c.industry,
      marketCap: c.marketCap,
      currentPrice: c.currentPrice,
      priceChangePct: c.priceChangePct,
      pe: c.pe,
      roce: c.roce,
      roe: c.roe,
      debtToEquity: c.debtToEquity,
      dividendYield: c.dividendYield,
    })),
  });
}
