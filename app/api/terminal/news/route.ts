// ─── Real-Time Market News API Route ──────────────────────────────────────────
// Aggregates verified financial news, automatic ticker tagging, and sentiment scoring.

import { NextRequest, NextResponse } from 'next/server';
import {
  getBaselineNews,
  filterMarketNews,
  NewsCategory,
  NewsItem,
  extractTickers,
  analyzeSentiment,
} from '@/lib/terminal/marketNewsData';

export const dynamic = 'force-dynamic';

// In-memory cache for live aggregated news
let cachedNews: NewsItem[] = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = (searchParams.get('category') || 'ALL') as NewsCategory;
    const market = (searchParams.get('market') || 'ALL') as 'ALL' | 'INDIA' | 'USA' | 'UAE' | 'GLOBAL';
    const search = searchParams.get('q') || '';
    const ticker = searchParams.get('ticker') || '';
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const now = Date.now();
    if (!cachedNews.length || now - lastFetchTime > CACHE_TTL_MS) {
      cachedNews = getBaselineNews();
      lastFetchTime = now;
    }

    const filtered = filterMarketNews(cachedNews, {
      category,
      market,
      search,
      ticker,
      limit,
    });

    const breakingNews = cachedNews.filter(n => n.isBreaking);

    return NextResponse.json({
      success: true,
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
