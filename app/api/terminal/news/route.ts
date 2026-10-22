// ─── Real-Time Market News API Route ──────────────────────────────────────────
// Aggregates verified financial news, automatic ticker tagging, and sentiment scoring.

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchLiveMarketNews,
  filterMarketNews,
  NewsCategory,
} from '@/lib/terminal/marketNewsData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = (searchParams.get('category') || 'ALL') as NewsCategory;
    const market = (searchParams.get('market') || 'ALL') as 'ALL' | 'INDIA' | 'USA' | 'UAE' | 'GLOBAL';
    const search = searchParams.get('q') || '';
    const ticker = searchParams.get('ticker') || '';
    const limit = parseInt(searchParams.get('limit') || '40', 10);

    const allNews = await fetchLiveMarketNews();

    const filtered = filterMarketNews(allNews, {
      category,
      market,
      search,
      ticker,
      limit,
    });

    const breakingNews = allNews.filter(n => n.isBreaking);

    return NextResponse.json({
      success: true,
      isLive: true,
      source: 'LIVE_FEED_AGGREGATOR',
      total: filtered.length,
      category,
      market,
      breaking: breakingNews.slice(0, 3),
      news: filtered,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch market news: ${msg}` },
      { status: 500 }
    );
  }
}
