// ─── Economic Calendar API Route ──────────────────────────────────────────────
// Serves global macroeconomic indicators, scheduled central bank meetings,
// and real-time beat/miss data for India, USA, Europe, and UAE.

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchLiveEconomicCalendar,
  filterEconomicEvents,
  EventRegion,
} from '@/lib/terminal/economicCalendarData';

const TRADE_ENGINE_URL = process.env.TRADE_ENGINE_URL || 'http://138.91.105.85';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get('range') || 'all') as 'today' | 'tomorrow' | 'week' | 'all';
    const region = (searchParams.get('region') || 'ALL') as EventRegion;
    const impact = (searchParams.get('impact') || 'ALL') as 'ALL' | 'HIGH' | 'MEDIUM';
    const search = searchParams.get('q') || '';

    // 1. Primary: Query Kotlin JVM Trade Engine
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const remoteRes = await fetch(`${TRADE_ENGINE_URL}/economic-calendar?${searchParams.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (remoteRes.ok) {
        const remoteEvents = await remoteRes.json();
        if (Array.isArray(remoteEvents) && remoteEvents.length > 0) {
          const now = Date.now();
          const upcomingHighImpact = remoteEvents
            .filter((e: any) => e.impact === 'HIGH' && e.timestamp > now)
            .sort((a: any, b: any) => a.timestamp - b.timestamp)[0] || null;

          return NextResponse.json({
            success: true,
            isLive: true,
            source: 'TRADE_ENGINE_KOTLIN',
            total: remoteEvents.length,
            range,
            region,
            impact,
            nextHighImpact: upcomingHighImpact,
            events: remoteEvents,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch {}

    // 2. Secondary Failover: Local In-Memory Macro Feed
    const allEvents = await fetchLiveEconomicCalendar();
    const filtered = filterEconomicEvents(allEvents, {
      range,
      region,
      impact,
      search,
    });

    // Find next upcoming high-impact event for countdown display
    const now = Date.now();
    const upcomingHighImpact = allEvents
      .filter(e => e.impact === 'HIGH' && e.timestamp > now)
      .sort((a, b) => a.timestamp - b.timestamp)[0] || null;

    return NextResponse.json({
      success: true,
      isLive: true,
      source: 'LIVE_MACRO_FEED',
      total: filtered.length,
      range,
      region,
      impact,
      nextHighImpact: upcomingHighImpact,
      events: filtered,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, error: `Failed to fetch economic calendar: ${msg}` },
      { status: 500 }
    );
  }
}
