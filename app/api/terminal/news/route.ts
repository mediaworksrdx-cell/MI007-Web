// ─── Real-Time Market News API Route ──────────────────────────────────────────
// Aggregates verified financial news, automatic ticker tagging, and sentiment scoring.

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchLiveMarketNews,
  filterMarketNews,
  NewsCategory,
} from '@/lib/terminal/marketNewsData';

const TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'http://138.91.105.85';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = (searchParams.get('category') || 'ALL') as NewsCategory;
    const market = (searchParams.get('market') || 'ALL') as 'ALL' | 'INDIA' | 'USA' | 'UAE' | 'GLOBAL';
    const search = searchParams.get('q') || '';
    const ticker = searchParams.get('ticker') || '';
    const limit = parseInt(searchParams.get('limit') || '40', 10);

    // 1. Primary: Query Kotlin JVM Trade Engine
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const remoteRes = await fetch(`${TRADE_ENGINE_URL}/news?${searchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (remoteRes.ok) {
        const remoteNews = await remoteRes.json();
        if (Array.isArray(remoteNews) && remoteNews.length > 0) {
          const breaking = remoteNews.filter((n: any) => n.isBreaking);
          return NextResponse.json({
            success: true,
            isLive: true,
            source: 'TRADE_ENGINE_KOTLIN',
            total: remoteNews.length,
            category,
            market,
            breaking: breaking.slice(0, 3),
            news: remoteNews,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch {}

    // 2. Secondary Failover: Local In-Memory Live Feed Aggregator
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
