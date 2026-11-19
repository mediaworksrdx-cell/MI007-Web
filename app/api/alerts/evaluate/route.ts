import { NextRequest, NextResponse } from 'next/server';
import { calculateSMC } from '@/lib/smcEngine';
import {
  SmcAlertWatchItem,
  SmcTriggeredAlert,
  classifySetupStage,
} from '@/lib/alerts/smcAlerts';
import { GET as getCandlesRoute } from '../../candles/route';
import { Candle } from '@/lib/types';

async function loadRealCandles(symbol: string, timeframe: string, market: string, origin: string): Promise<Candle[]> {
  try {
    const url = `${origin}/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&market=${encodeURIComponent(market)}&count=260`;
    const subReq = new NextRequest(url);
    const res = await getCandlesRoute(subReq);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: SmcAlertWatchItem[] = Array.isArray(body?.items) ? body.items : [];
    const alreadySent = new Set<string>(Array.isArray(body?.alreadySentIds) ? body.alreadySentIds : []);
    const origin = req.nextUrl.origin || 'http://localhost:3000';

    const enabledItems = items.filter((it) => it && it.enabled && it.symbol && Array.isArray(it.timeframes) && it.timeframes.length > 0);
    if (enabledItems.length === 0) {
      return NextResponse.json({ triggered: [], evaluatedPairs: 0, checkedAt: new Date().toISOString() });
    }

    // Build evaluation jobs: (item, timeframe)
    const jobs: Array<{ item: SmcAlertWatchItem; timeframe: string }> = [];
    for (const item of enabledItems) {
      for (const tf of item.timeframes) {
        jobs.push({ item, timeframe: tf });
      }
    }

    const triggered: SmcTriggeredAlert[] = [];
    const concurrency = 6;
    let cursor = 0;

    const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        const { item, timeframe } = job;
        const candles = await loadRealCandles(item.symbol, timeframe, item.market || 'INDIA', origin);
        if (candles.length < 30) continue;

        const smc = calculateSMC(candles, { enabled: true }, item.symbol, timeframe);
        const candidates = [...(smc.confirmedSetups || []), ...(smc.allSetups || [])];
        const seenSetupIds = new Set<string>();
        const lastBarIdx = candles.length - 1;

        for (const st of candidates) {
          if (!st || seenSetupIds.has(st.id)) continue;
          seenSetupIds.add(st.id);

          // Only alert on recent setups (within last 60 bars)
          if (lastBarIdx - st.candleIndex > 60) continue;

          // Quality filter
          const qual = st.qualityScore ?? 0;
          if (qual < (item.minQuality || 60)) continue;

          // Direction filter
          if (item.direction === 'BULLISH' && st.direction !== 'BULLISH') continue;
          if (item.direction === 'BEARISH' && st.direction !== 'BEARISH') continue;

          // Setup type filter (empty = all 16 setups)
          if (Array.isArray(item.setupTypes) && item.setupTypes.length > 0 && !item.setupTypes.includes(st.setupType)) {
            continue;
          }

          // Stage filter
          const { stage, label } = classifySetupStage(st.status, st.signalState);
          if (Array.isArray(item.triggerStages) && item.triggerStages.length > 0 && !item.triggerStages.includes(stage)) {
            continue;
          }

          // Deterministic deduplication key so the same setup+stage never spams twice
          const dedupId = `${item.symbol.toUpperCase()}|${timeframe}|${st.id}|${stage}|${label}`;
          if (alreadySent.has(dedupId)) continue;
          alreadySent.add(dedupId);

          const riskDist = Math.max(1e-9, Math.abs(st.entryPrice - st.stopLoss));
          const rr = Number((Math.abs(st.targetPrice - st.entryPrice) / riskDist).toFixed(2));

          triggered.push({
            id: dedupId,
            watchItemId: item.id,
            symbol: item.symbol.toUpperCase(),
            name: item.name || item.symbol.toUpperCase(),
            assetClass: item.assetClass,
            market: item.market || 'INDIA',
            timeframe,
            setupId: st.id,
            setupName: st.name,
            setupType: st.setupType,
            direction: st.direction,
            qualityScore: Math.round(qual),
            entryPrice: st.entryPrice,
            stopLoss: st.stopLoss,
            targetPrice: st.targetPrice,
            targetPrice2: st.targetPrice2,
            riskReward: rr,
            stage,
            statusLabel: label,
            triggeredAt: new Date().toISOString(),
          });
        }
      }
    });

    await Promise.all(workers);

    return NextResponse.json({
      triggered,
      evaluatedPairs: jobs.length,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to evaluate SMC alert watchlist' },
      { status: 500 }
    );
  }
}
