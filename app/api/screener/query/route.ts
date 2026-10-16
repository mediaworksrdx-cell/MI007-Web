// ─── Screener Query Execution API Route ──────────────────────────────────────
// Server-side evaluation of financial screening expressions and visual filters

import { NextRequest, NextResponse } from 'next/server';
import { parseQuery, evaluateNode } from '@/lib/screener/queryEngine';
import { MASTER_COMPANIES } from '@/lib/screener/data';
import { CompanyFundamental, MarketRegion } from '@/lib/screener/types';
import { getMetricValue } from '@/lib/screener/metrics';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const {
      query = '',
      market = 'INDIA',
      sector = '',
      industry = '',
      sortColumn = 'marketCap',
      sortDirection = 'desc',
      page = 1,
      pageSize = 50,
    } = body;

    // Filter by market
    let companies: CompanyFundamental[] = MASTER_COMPANIES.filter(
      (c) => !market || c.market === market
    );

    // Filter by sector if provided
    if (sector && sector !== 'ALL') {
      companies = companies.filter((c) => c.sector.toLowerCase() === sector.toLowerCase());
    }

    // Filter by industry if provided
    if (industry && industry !== 'ALL') {
      companies = companies.filter((c) => c.industry.toLowerCase() === industry.toLowerCase());
    }

    // Parse query expression
    let parsedAst: any = null;
    let queryValid = true;
    let parseError = '';

    if (query && query.trim()) {
      const parseRes = parseQuery(query);
      if (!parseRes.valid) {
        return NextResponse.json(
          {
            error: parseRes.error || 'Invalid query expression',
            errorPosition: parseRes.errorPosition,
            valid: false,
          },
          { status: 400 }
        );
      }
      parsedAst = parseRes.ast;
    }

    // Evaluate against each company
    let matches = companies;
    if (parsedAst) {
      matches = companies.filter((comp) => evaluateNode(parsedAst, comp));
    }

    // Sort matches
    if (sortColumn) {
      matches.sort((a, b) => {
        const valA = getMetricValue(a, sortColumn) ?? -Infinity;
        const valB = getMetricValue(b, sortColumn) ?? -Infinity;
        if (sortDirection === 'asc') {
          return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else {
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
      });
    }

    // Pagination
    const totalMatches = matches.length;
    const startIndex = (page - 1) * pageSize;
    const paginated = matches.slice(startIndex, startIndex + pageSize);

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json({
      valid: true,
      totalMatches,
      page,
      pageSize,
      executionTimeMs,
      companies: paginated,
      dataTimestamp: 'Live / Synchronized Fundamental Feed',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Server error executing screen' },
      { status: 500 }
    );
  }
}
