// ─── Real-Time Notifications API Route ────────────────────────────────────────
// Aggregates real-time Breaking News, High-Impact Macro Economic Calendar releases,
// and Institutional Market Signals into a unified notification feed.

import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveMarketNews } from '@/lib/terminal/marketNewsData';
import { fetchLiveEconomicCalendar } from '@/lib/terminal/economicCalendarData';
import { AppNotification, BASELINE_SIGNALS } from '@/lib/terminal/notificationTypes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'ALL'; // 'ALL' | 'NEWS' | 'CALENDAR' | 'SIGNAL'
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    // Fetch news & calendar concurrently with graceful error handling
    const [newsResult, calendarResult] = await Promise.allSettled([
      fetchLiveMarketNews(),
      fetchLiveEconomicCalendar(),
    ]);

    const newsItems = newsResult.status === 'fulfilled' ? newsResult.value : [];
    const calendarItems = calendarResult.status === 'fulfilled' ? calendarResult.value : [];

    const aggregated: AppNotification[] = [];

    // 1. Convert Live News to Notifications
    for (const n of newsItems.slice(0, 10)) {
      const pubTime = new Date(n.publishedAt).getTime();
      const validTimestamp = isNaN(pubTime) ? Date.now() : pubTime;

      aggregated.push({
        id: `notif-news-${n.id}`,
        type: 'NEWS',
        icon: n.isBreaking ? '⚡' : '📰',
        badge: n.isBreaking ? 'BREAKING NEWS' : `LIVE ${n.category}`,
        title: n.title,
        desc: n.summary.length > 180 ? n.summary.substring(0, 177) + '...' : n.summary,
        time: n.timeAgo,
        timestamp: validTimestamp,
        market: n.market,
        symbol: n.tickers[0] || (n.market === 'INDIA' ? 'NIFTY' : 'SPX'),
        href: n.tickers[0] ? `/news?ticker=${encodeURIComponent(n.tickers[0])}` : '/news',
        isBreaking: n.isBreaking,
        priority: n.isBreaking ? 'HIGH' : 'MEDIUM',
      });
    }

    // 2. Convert High & Medium Impact Calendar Events to Notifications
    const highImpactCalendar = calendarItems
      .filter((e) => e.impact === 'HIGH' || e.impact === 'MEDIUM')
      .slice(0, 8);

    for (const c of highImpactCalendar) {
      const isPastOrReleased = !!c.actual;
      const descText = isPastOrReleased
        ? `Actual: ${c.actual} vs Forecast: ${c.forecast || 'N/A'} (Prior: ${c.previous || 'N/A'})${c.isBeat === true ? ' — Beat consensus' : c.isBeat === false ? ' — Missed consensus' : ''}`
        : `Scheduled: ${c.dateStr} at ${c.timeStr} · Forecast: ${c.forecast || 'N/A'} (Prior: ${c.previous || 'N/A'})`;

      aggregated.push({
        id: `notif-cal-${c.id}`,
        type: 'CALENDAR',
        icon: c.flag || '📅',
        badge: `${c.impact} IMPACT MACRO`,
        title: `${c.countryCode}: ${c.event}`,
        desc: descText,
        time: c.dateStr === new Date().toISOString().split('T')[0] ? `Today ${c.timeStr}` : `${c.dateStr} ${c.timeStr}`,
        timestamp: c.timestamp || Date.now(),
        market: c.country,
        symbol: c.country === 'INDIA' ? 'RBI / IN' : c.country === 'USA' ? 'FED / US' : `${c.countryCode} MACRO`,
        href: `/calendar?region=${c.country}`,
        priority: c.impact === 'HIGH' ? 'HIGH' : 'MEDIUM',
      });
    }

    // 3. Include Institutional Signals
    aggregated.push(...BASELINE_SIGNALS);

    // Filter by type if requested
    let filtered = aggregated;
    if (type !== 'ALL') {
      filtered = filtered.filter((item) => item.type === type);
    }

    // Sort: Breaking/High priority first, then chronologically by timestamp
    filtered.sort((a, b) => {
      if (a.isBreaking && !b.isBreaking) return -1;
      if (!a.isBreaking && b.isBreaking) return 1;
      return b.timestamp - a.timestamp;
    });

    const result = filtered.slice(0, limit);

    return NextResponse.json({
      success: true,
      total: result.length,
      counts: {
        all: aggregated.length,
        news: aggregated.filter((a) => a.type === 'NEWS').length,
        calendar: aggregated.filter((a) => a.type === 'CALENDAR').length,
        signals: aggregated.filter((a) => a.type === 'SIGNAL').length,
      },
      notifications: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to aggregate notifications: ${msg}` },
      { status: 500 }
    );
  }
}
