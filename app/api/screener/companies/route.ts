// ─── Screener Companies Search & Catalog API Route ───────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesByMarket, getAllCompanies } from '@/lib/screener/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const market = searchParams.get('market') || 'INDIA';
  const query = searchParams.get('q') || '';
  const sector = searchParams.get('sector') || '';
  const index = searchParams.get('index') || '';

  let list = (market && market !== 'ALL') ? getCompaniesByMarket(market as any) : getAllCompanies();

  if (index && index !== 'ALL') {
    list = list.filter((c) => {
      const ind = (c as any).indices;
      return Array.isArray(ind) && ind.includes(index);
    });
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
      indices: (c as any).indices || [],
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
