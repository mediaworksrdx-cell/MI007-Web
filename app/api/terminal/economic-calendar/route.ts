// ─── Economic Calendar API Route ──────────────────────────────────────────────
// Serves global macroeconomic indicators, scheduled central bank meetings,
// and real-time beat/miss data for India, USA, Europe, and UAE.

import { NextRequest, NextResponse } from 'next/server';
import {
  getBaselineEconomicEvents,
  filterEconomicEvents,
  EventRegion,
} from '@/lib/terminal/economicCalendarData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get('range') || 'all') as 'today' | 'tomorrow' | 'week' | 'all';
    const region = (searchParams.get('region') || 'ALL') as EventRegion;
    const impact = (searchParams.get('impact') || 'ALL') as 'ALL' | 'HIGH' | 'MEDIUM';
    const search = searchParams.get('q') || '';

    const allEvents = getBaselineEconomicEvents();
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
