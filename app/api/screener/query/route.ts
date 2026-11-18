// ─── Screener Query Execution API Route ──────────────────────────────────────
// Server-side evaluation of financial screening expressions and visual filters

import { NextRequest, NextResponse } from 'next/server';
import { parseQuery, evaluateNode, computeExcludedForMissingData } from '@/lib/screener/queryEngine';
import { getCompaniesByMarket } from '@/lib/screener/data';
import { CompanyFundamental, MarketRegion } from '@/lib/screener/types';
import { getMetricValue, resolveMetricKey, computeMetricCoverage } from '@/lib/screener/metrics';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const {
      query = '',
      market = 'INDIA',
      index = '',
      sector = '',
      industry = '',
      sortColumn = 'marketCap',
      sortDirection = 'desc',
      page = 1,
      pageSize = 50,
    } = body;

    // Filter by market (work on a fresh copy so shared cache is never mutated)
    let companies: CompanyFundamental[] = [...getCompaniesByMarket((market || 'INDIA') as any)];

    // Filter by index (e.g. SP500, NASDAQ100, DOW30)
    if (index && index !== 'ALL') {
      companies = companies.filter((c) => {
        const ind = (c as any).indices;
        return Array.isArray(ind) && ind.includes(index);
      });
    }

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

    // Evaluate against each company (on a fresh copy)
    let matches = [...companies];
    let excludedInfo = { excludedForMissingData: {} as Record<string, number>, totalExcludedForMissingData: 0 };
    if (parsedAst) {
      matches = companies.filter((comp) => evaluateNode(parsedAst, comp));
      excludedInfo = computeExcludedForMissingData(parsedAst, companies);
    }

    // Validate sortColumn against known metrics
    const validSortKey = sortColumn ? resolveMetricKey(String(sortColumn)) : 'marketCap';
    const safeSortDirection = sortDirection === 'asc' ? 'asc' : 'desc';

    if (validSortKey) {
      matches.sort((a, b) => {
        const valA = getMetricValue(a, validSortKey) ?? -Infinity;
        const valB = getMetricValue(b, validSortKey) ?? -Infinity;
        if (safeSortDirection === 'asc') {
          return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else {
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
      });
    }

    // Clamp pagination parameters (SC9: page >= 1, 1 <= pageSize <= 200)
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safePageSize = Math.max(1, Math.min(200, Math.floor(Number(pageSize) || 50)));

    const totalMatches = matches.length;
    const startIndex = (safePage - 1) * safePageSize;
    const paginated = matches.slice(startIndex, startIndex + safePageSize);

    const executionTimeMs = Date.now() - startTime;
    const asOfDate = companies[0]?.asOfDate || '2026-10-31';

    return NextResponse.json({
      valid: true,
      totalMatches,
      totalUniverse: companies.length,
      excludedForMissingData: excludedInfo.excludedForMissingData,
      totalExcludedForMissingData: excludedInfo.totalExcludedForMissingData,
      metricCoverage: computeMetricCoverage(companies),
      page: safePage,
      pageSize: safePageSize,
      executionTimeMs,
      companies: paginated,
      asOfDate,
      isStale: true,
      dataTimestamp: `Cached Fundamentals (as of ${asOfDate})`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Server error executing screen' },
      { status: 500 }
    );
  }
}
