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

    // Build evaluation jobs: (item, timeframe), capped to 30 pairs per request
    const rawJobs: Array<{ item: SmcAlertWatchItem; timeframe: string }> = [];
    for (const item of enabledItems) {
      for (const tf of item.timeframes) {
        rawJobs.push({ item, timeframe: tf });
      }
    }
    const jobs = rawJobs.slice(0, 30);

    const isInitialSeed = Boolean(body?.isInitialSeed);
    const baselineIds: string[] = [];
    const triggered: SmcTriggeredAlert[] = [];
    const pairStatuses: Array<{ symbol: string; timeframe: string; status: 'ok' | 'no_data' | 'insufficient_candles'; count: number }> = [];
    const concurrency = 6;
    let cursor = 0;

    const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        const { item, timeframe } = job;
        const candles = await loadRealCandles(item.symbol, timeframe, item.market || 'INDIA', origin);
        if (candles.length < 30) {
          pairStatuses.push({
            symbol: item.symbol.toUpperCase(),
            timeframe,
            status: candles.length === 0 ? 'no_data' : 'insufficient_candles',
            count: candles.length,
          });
          continue;
        }

        pairStatuses.push({
          symbol: item.symbol.toUpperCase(),
          timeframe,
          status: 'ok',
          count: candles.length,
        });

        const smc = calculateSMC(candles, { enabled: true }, item.symbol, timeframe);
        // AL4: Include setupHistory so stopped-out (INVALIDATED) setups are evaluated for SL_HIT
        const candidates = [
          ...(smc.confirmedSetups || []),
          ...(smc.allSetups || []),
          ...(smc.setupHistory || []),
        ];
        const seenSetupIds = new Set<string>();
        const seenZones = new Map<string, number>(); // Cluster deduplication by price level
        const lastBarIdx = candles.length - 1;
        const lastClose = candles[lastBarIdx]?.close ?? 0;

        for (const st of candidates) {
          if (!st || seenSetupIds.has(st.id)) continue;
          seenSetupIds.add(st.id);

          const barsAgo = lastBarIdx - st.candleIndex;

          // Quality filter (AL13: allow 0 quality)
          const qual = st.qualityScore ?? 0;
          if (qual < (item.minQuality ?? 60)) continue;

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

          // Strict Freshness Gate (avoids blasting ancient historical setups)
          if (!isInitialSeed) {
            if (stage === 'EARLY') {
              // Early setup must be formed in the last 4 candles
              if (barsAgo > 4) continue;
            } else if (stage === 'RETEST') {
              // Retest must be active within last 10 candles
              if (barsAgo > 10) continue;
            } else if (stage === 'ACTIONABLE') {
              // Actionable entry: formed within last 15 candles OR actively interacting with entry zone
              const zoneTolerance = Math.max(Math.abs(st.entryPrice - st.stopLoss) * 1.5, st.entryPrice * 0.005);
              const isNearZone = Math.abs(lastClose - st.entryPrice) <= zoneTolerance;
              if (barsAgo > 15 && !isNearZone) continue;
            } else if (stage === 'TP_HIT') {
              // Target hit must be recent (within last 3 candles of hit index or formation)
              const hitIdx = st.tp1HitIndex ?? st.tp2HitIndex ?? st.candleIndex;
              if (lastBarIdx - hitIdx > 3) continue;
            } else if (stage === 'SL_HIT') {
              // Invalidation must be fresh (within last 6 candles)
              if (barsAgo > 6) continue;
            }
          }

          // AL2: Deterministic, immutable deduplication key based on formation timestamp (openTime)
          // NEVER embeds shifting candle array index so dedupe survives rolling bar windows.
          const formationTime = candles[st.candleIndex]?.openTime || st.formationTime || st.time || 0;
          const dedupId = `${item.symbol.toUpperCase()}|${timeframe}|${st.setupType}|${st.direction}|${formationTime}|${stage}`;
          baselineIds.push(dedupId);

          if (isInitialSeed) {
            alreadySent.add(dedupId);
            continue;
          }

          if (alreadySent.has(dedupId)) continue;

          // Zone Clustering: Deduplicate concurrent overlapping setups on the same price level
          const clusterUnit = Math.max(0.001, st.entryPrice * 0.002);
          const zoneKey = `${item.symbol}|${timeframe}|${st.direction}|${Math.round(st.entryPrice / clusterUnit)}|${stage}`;
          const existingQual = seenZones.get(zoneKey);
          if (existingQual !== undefined && existingQual >= qual) {
            continue;
          }
          seenZones.set(zoneKey, qual);
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
            formationTime,
            currentPrice: lastClose,
            barsAgo,
            triggeredAt: new Date().toISOString(),
          });
        }
      }
    });

    await Promise.all(workers);

    return NextResponse.json({
      triggered: isInitialSeed ? [] : triggered,
      baselineIds: isInitialSeed ? baselineIds : undefined,
      evaluatedPairs: jobs.length,
      pairStatuses,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to evaluate SMC alert watchlist' },
      { status: 500 }
    );
  }
}
