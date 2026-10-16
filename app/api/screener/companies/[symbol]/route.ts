// ─── Single Company Detailed Fundamentals API Route ──────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getCompanyBySymbol } from '@/lib/screener/data';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await context.params;
  const company = getCompanyBySymbol(symbol);

  if (!company) {
    return NextResponse.json(
      { error: `Company with symbol '${symbol}' not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(company);
}
