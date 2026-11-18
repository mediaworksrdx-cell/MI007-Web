import assert from 'node:assert/strict';
import { Candle } from '../lib/types';
import {
  DEFAULT_QUANTUM_AI_CONFIG,
  QuantumAiConfig,
} from '../lib/quantumai/types';
import {
  analyzeQuantumAi,
  aggregateSessionAwareHtf,
  calculateMomentum,
  detectSwings,
  detectStructureBreaks,
  detectOrderBlocks,
} from '../lib/quantumai/quantumAiEngine';
import { runQuantumBacktest } from '../lib/quantumai/quantumAiBacktest';
import { DEFAULT_ORDER_FLOW_CONFIG, ExchangeTradeTick, PriceLevelFootprint } from '../lib/orderflow/types';
import {
  analyzeOrderFlow,
  calculateAdaptiveTickSize,
  calculateDiagonalImbalances,
  isNewMarketSession,
} from '../lib/orderflow/orderFlowEngine';

// Deterministic PRNG (Mulberry32) so tests are 100% reproducible
function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRandomWalk(
  count: number,
  seed: number,
  startPrice = 100,
  stepPct = 0.005,
  startTime = Date.UTC(2026, 0, 1, 9, 0)
): Candle[] {
  const rand = createRng(seed);
  const candles: Candle[] = [];
  let price = startPrice;
  for (let i = 0; i < count; i++) {
    const open = price;
    const u = rand() + rand() + rand() - 1.5;
    const change = open * stepPct * u;
    const close = Math.max(startPrice * 0.1, open + change);
    const wickUp = Math.abs(rand() * open * stepPct * 0.8);
    const wickDown = Math.abs(rand() * open * stepPct * 0.8);
    const high = Math.max(open, close) + wickUp;
    const low = Math.max(startPrice * 0.05, Math.min(open, close) - wickDown);
    const volume = Math.round(1000 + rand() * 9000);
    candles.push({
      openTime: startTime + i * 3600_000,
      open,
      high,
      low,
      close,
      volume,
      isClosed: true,
    });
    price = close;
  }
  return candles;
}

function runTests() {
  console.log('Running Order Flow & Quantum AI Audit Regression Suite...\n');

  // ── Test 1: No-Edge Random Walk Test (Q1, Q2, Q3) ─────────────────────────
  {
    let totalTrades = 0;
    let totalWins = 0;
    let sumR = 0;
    const cfg: QuantumAiConfig = {
      ...DEFAULT_QUANTUM_AI_CONFIG,
      confluenceThreshold: 4.5,
    };

    for (let s = 1; s <= 200; s++) {
      const rw = generateRandomWalk(180, 1000 + s, 1000, 0.008);
      const res = runQuantumBacktest(rw, cfg, 100000, 0.01, { commissionPct: 0, slippagePct: 0 });
      for (const t of res.trades) {
        totalTrades++;
        if (t.status === 'WIN') totalWins++;
        sumR += t.returnR;
      }
    }

    const avgR = totalTrades > 0 ? sumR / totalTrades : 0;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    console.log(
      `[Test 1] Random Walk (200 series): trades=${totalTrades}, winRate=${winRate.toFixed(2)}%, avgR=${avgR.toFixed(4)}`
    );
    assert.ok(totalTrades > 0, 'Expected some trades across 200 random walks');
    assert.ok(avgR <= 0.25 && avgR >= -0.5, `Unexpected avgR=${avgR.toFixed(4)} on random walk`);
    assert.ok(winRate <= 55, `Look-ahead bias suspected: winRate=${winRate.toFixed(2)}% on random walk`);
  }

  // ── Test 2: Point-in-Time Prefix Invariance (N vs N+K) (Q1, Q8) ───────────
  {
    // Stronger version: 40 independent series, prefix N=600 vs full N+K=800
    let totalCompared = 0;
    let totalSwings = 0;
    for (let seed = 0; seed < 40; seed++) {
    const full = generateRandomWalk(800, 4242 + seed, 500, 0.01);
    const prefixN = 600;
    const prefix = full.slice(0, prefixN);

    const cfg: QuantumAiConfig = {
      ...DEFAULT_QUANTUM_AI_CONFIG,
      confluenceThreshold: 4.5,
    };

    const resPrefix = runQuantumBacktest(prefix, cfg);
    const resFull = runQuantumBacktest(full, cfg);

    const cutoffTime = prefix[prefix.length - 1].openTime;
    const closedPrefix = resPrefix.trades.filter(t => t.exitReason !== 'OPEN_MTM');
    const closedFullBeforeN = resFull.trades.filter(
      t => t.exitReason !== 'OPEN_MTM' && (t.exitTime ?? Infinity) <= cutoffTime
    );

    assert.equal(
      closedPrefix.length,
      closedFullBeforeN.length,
      `Seed ${seed}: closed trade count changed with future bars: ${closedPrefix.length} vs ${closedFullBeforeN.length}`
    );

    for (let i = 0; i < closedPrefix.length; i++) {
      assert.equal(closedPrefix[i].entryTime, closedFullBeforeN[i].entryTime);
      assert.equal(closedPrefix[i].exitTime, closedFullBeforeN[i].exitTime);
      assert.equal(closedPrefix[i].type, closedFullBeforeN[i].type);
      assert.ok(
        Math.abs(closedPrefix[i].realizedPnL - closedFullBeforeN[i].realizedPnL) < 1e-6,
        'Trade PnL changed with future bars'
      );
    }

    const swingsPrefix = detectSwings(prefix);
    const swingsFull = detectSwings(full).filter(
      s => (s.confirmationIndex ?? s.index) < prefixN
    );
    assert.equal(swingsPrefix.length, swingsFull.length, 'Confirmed swings changed with future bars');
    totalCompared += closedPrefix.length;
    totalSwings += swingsPrefix.length;
    }
    assert.ok(totalCompared >= 50, `Point-in-time test too weak: only ${totalCompared} trades compared`);
    console.log(`[Test 2] Point-in-Time Invariance (40 series): ${totalCompared} closed trades & ${totalSwings} swings identical`);
  }

  // ── Test 3: Accounting Identity (sum(trade P&L) == netProfit) (Q3, Q4) ─────
  {
    const candles = generateRandomWalk(200, 9999, 2500, 0.012);
    const cfg: QuantumAiConfig = {
      ...DEFAULT_QUANTUM_AI_CONFIG,
      confluenceThreshold: 4.5,
    };
    const res = runQuantumBacktest(candles, cfg);
    const sumTradePnl = res.trades.reduce((acc, t) => acc + t.realizedPnL, 0);
    const diff = Math.abs(sumTradePnl - res.netProfit);
    const capDiff = Math.abs(res.endingCapital - res.initialCapital - res.netProfit);
    console.log(
      `[Test 3] Accounting Identity: trades=${res.trades.length}, sumPnL=${sumTradePnl.toFixed(2)}, netProfit=${res.netProfit.toFixed(2)}`
    );
    assert.ok(diff < 0.5, `Accounting mismatch: sum(trades)=${sumTradePnl} vs netProfit=${res.netProfit}`);
    assert.ok(capDiff < 0.05, `Capital mismatch: ending-initial=${res.endingCapital - res.initialCapital}`);
  }

  // ── Test 4: Multi-Target Single Bar Crossing TP1 + TP2 (Q3) ───────────────
  {
    const base: Candle[] = [];
    const t0 = Date.UTC(2026, 0, 1, 9, 0);
    const pushBar = (idx: number, o: number, h: number, l: number, c: number, v = 5000) => {
      base.push({
        openTime: t0 + idx * 3600_000,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v,
        isClosed: true,
      });
    };
    for (let i = 0; i < 26; i++) {
      // Keep bars 0..25 slightly red so SHORT never triggers before bar 27 LONG entry
      pushBar(i, 100.2, 100.6, 99.4, 99.9, 5000);
    }
    // Bar 26: red bar; Bar 27: green bar -> triggers LONG entry at 100.4 with confluenceThreshold = 0
    pushBar(26, 100.4, 100.5, 99.5, 99.8, 5000);
    pushBar(27, 99.8, 100.6, 99.7, 100.4, 8000);
    // Bar 28: single huge bar that clears TP1, TP2, TP3 without touching SL (99.5)
    pushBar(28, 100.4, 150.0, 100.3, 148.0, 20000);
    pushBar(29, 148.0, 149.0, 147.0, 148.5, 5000);

    const cfg: QuantumAiConfig = { ...DEFAULT_QUANTUM_AI_CONFIG, confluenceThreshold: 0 };
    const res = runQuantumBacktest(base, cfg, 100000, 0.01, { commissionPct: 0, slippagePct: 0 });
    const multiHitTrade = res.trades.find(t => t.exitReason === 'TP3');
    console.log(
      `[Test 4] Multi-Target Single Bar: trades=${res.trades.length}, exitReason=${multiHitTrade?.exitReason}, r=${multiHitTrade?.returnR ?? 'N/A'}`
    );
    assert.ok(multiHitTrade, 'Expected a trade where single bar crossed TP1, TP2, and TP3');
    assert.ok(
      Math.abs(multiHitTrade.returnR - 2.68) < 0.05,
      `Expected combined 33/33/34 tranche R ~ 2.68, got ${multiHitTrade.returnR}`
    );
  }

  // ── Test 5: Low-Price FX (EURUSD) Momentum & Tick Size (Q5, OF4) ──────────
  {
    const fxCandles = generateRandomWalk(120, 31415, 1.085, 0.0015);
    let posCount = 0;
    let negCount = 0;
    for (let i = 30; i < fxCandles.length; i++) {
      const mom = calculateMomentum(fxCandles.slice(0, i + 1));
      if (mom.isPositive) posCount++;
      else if (mom.linRegMomentum < 0) negCount++;
    }
    const fxTick = calculateAdaptiveTickSize(fxCandles, 'auto', 'EURUSD');
    const qai = analyzeQuantumAi(fxCandles, DEFAULT_QUANTUM_AI_CONFIG);
    console.log(
      `[Test 5] Low-Price EURUSD: posMom=${posCount}, negMom=${negCount}, adaptiveTick=${fxTick}, strategy=${qai.dashboard.strategy}`
    );
    assert.ok(posCount > 0 && negCount > 0, `EURUSD momentum collapsed: pos=${posCount}, neg=${negCount}`);
    assert.ok(fxTick < 0.001, `EURUSD adaptive tick too coarse: ${fxTick}`);
  }

  // ── Test 6: Order Flow Feed Label & Inferred Signal Gating (OF1, OF2) ─────
  {
    const candles = generateRandomWalk(801, 555, 100, 0.005);
    const ticksMap = new Map<number, ExchangeTradeTick[]>();
    const lastBar = candles[candles.length - 1];
    ticksMap.set(lastBar.openTime, [
      { price: lastBar.open, volume: lastBar.volume * 0.5, timestamp: lastBar.openTime },
      { price: lastBar.close, volume: lastBar.volume * 0.5, timestamp: lastBar.openTime + 1000 },
    ]);

    const resTickRule = analyzeOrderFlow(candles, DEFAULT_ORDER_FLOW_CONFIG, ticksMap, 'RELIANCE', 'INDIA');
    assert.equal(
      resTickRule.feedClassification,
      'INFERRED_ESTIMATE',
      '800 inferred + 1 tick-rule bar must NOT be VERIFIED_EXCHANGE_DATA'
    );
    assert.equal(resTickRule.signals.length, 0, 'Inferred bars must NOT emit order flow trade signals');

    ticksMap.set(lastBar.openTime, [
      { price: lastBar.open, volume: lastBar.volume * 0.5, timestamp: lastBar.openTime, side: 'BUY' },
      { price: lastBar.close, volume: lastBar.volume * 0.5, timestamp: lastBar.openTime + 1000, side: 'SELL' },
    ]);
    const resMixed = analyzeOrderFlow(candles, DEFAULT_ORDER_FLOW_CONFIG, ticksMap, 'RELIANCE', 'INDIA');
    assert.equal(
      resMixed.feedClassification,
      'INFERRED_ESTIMATE',
      '800 inferred + 1 verified bar must NOT label whole chart VERIFIED_EXCHANGE_DATA'
    );
    console.log('[Test 6] Order Flow Label & Gating: passed (INFERRED_ESTIMATE, 0 inferred signals)');
  }

  // ── Test 7: Diagonal Imbalances Across Price Gaps & Zero Side (OF3) ───────
  {
    const levels: PriceLevelFootprint[] = [
      {
        price: 100,
        bidVolume: 10,
        askVolume: 50,
        totalVolume: 60,
        delta: 40,
        hasBuyImbalance: false,
        hasSellImbalance: false,
        imbalanceRatio: 1,
        isPoc: false,
        isValueArea: false,
      },
      {
        price: 103,
        bidVolume: 5,
        askVolume: 100,
        totalVolume: 105,
        delta: 95,
        hasBuyImbalance: false,
        hasSellImbalance: false,
        imbalanceRatio: 1,
        isPoc: true,
        isValueArea: true,
      },
      {
        price: 104,
        bidVolume: 2,
        askVolume: 50,
        totalVolume: 52,
        delta: 48,
        hasBuyImbalance: false,
        hasSellImbalance: false,
        imbalanceRatio: 1,
        isPoc: false,
        isValueArea: false,
      },
    ];
    const imb = calculateDiagonalImbalances(levels, 0, Date.UTC(2026, 0, 1), DEFAULT_ORDER_FLOW_CONFIG, 1);
    assert.ok(!imb.buyImbalances.includes(103), 'Price level 103 must NOT be compared across gap to 100');
    assert.ok(imb.buyImbalances.includes(104), 'Adjacent level 104 (50 vs 5) SHOULD be a buy imbalance');
    console.log(`[Test 7] Imbalance Price-Gap Check: buyImbalances=${JSON.stringify(imb.buyImbalances)}`);
  }

  // ── Bonus Sanity: OF5 Session Reset & OF6 Exhaustion Rate ─────────────────
  {
    const nyMorning = Date.UTC(2026, 6, 15, 13, 29);
    const nyOpen = Date.UTC(2026, 6, 15, 13, 30);
    assert.equal(isNewMarketSession(nyOpen, nyMorning, 'USA'), true, 'USA 09:30 EDT open should reset session');
    assert.equal(isNewMarketSession(nyOpen, nyMorning, 'CRYPTO'), false, 'Crypto 24/7 should not reset at 09:30 EDT');

    const candles = generateRandomWalk(200, 888, 100, 0.005);
    const ofRes = analyzeOrderFlow(candles, DEFAULT_ORDER_FLOW_CONFIG, undefined, 'AAPL', 'USA');
    const exhCount = ofRes.footprints.filter(f => f.exhaustion !== null).length;
    const exhPct = (exhCount / ofRes.footprints.length) * 100;
    console.log(`[Bonus] Exhaustion rate on 200 random bars: ${exhCount}/200 (${exhPct.toFixed(1)}%)`);
    assert.ok(exhPct < 10, `Exhaustion firing too frequently: ${exhPct.toFixed(1)}%`);
  }

  // ── Re-test follow-ups ────────────────────────────────────────────────────
  {
    // R1: OB is usable only from the bar of its first qualifying structure break
    const candles = generateRandomWalk(2000, 2024, 1000, 0.01);
    const swings = detectSwings(candles);
    const breaks = detectStructureBreaks(candles, swings, null);
    const obs = detectOrderBlocks(candles, breaks, null);
    let early = 0;
    for (const ob of obs) {
      const impulseIdx = ob.startIndex + 1;
      const firstBreak = breaks.find(
        b => b.isBullish === ob.isBullish && b.candleIndex >= impulseIdx && b.candleIndex <= impulseIdx + 8
      );
      assert.ok(firstBreak, `OB ${ob.id} has no linked structure break`);
      if ((ob.confirmationIndex ?? -1) < firstBreak.candleIndex) early++;
    }
    assert.equal(early, 0, `${early} order blocks confirmed before their structure break`);
    assert.equal(detectOrderBlocks(candles, [], null).length, 0, 'No breaks must mean no order blocks');
    console.log(`[R1] OB confirmation at break bar: ${obs.length} OBs, 0 early`);

    // R2: Inferred footprints draw no imbalances, zones, absorption or exhaustion
    const of = analyzeOrderFlow(generateRandomWalk(800, 321, 100, 0.005), DEFAULT_ORDER_FLOW_CONFIG, undefined, 'AAPL', 'USA');
    const imbBars = of.footprints.filter(
      f => f.buyImbalancePrices.length + f.sellImbalancePrices.length > 0 || f.absorption || f.exhaustion
    ).length;
    assert.equal(imbBars, 0, `${imbBars} inferred bars still carry imbalances/absorption/exhaustion`);
    assert.equal(of.activeZones.length, 0, 'Inferred data must not create stacked zones');
    console.log('[R2] Inferred footprints: 0 imbalance/absorption/exhaustion bars, 0 zones');

    // R3: Real HTF candles change the resonance label; without them it stays Single-TF
    const chart = generateRandomWalk(200, 99, 100, 0.005);
    const htf: Candle[] = [];
    for (let k = 0; k + 4 <= chart.length; k += 4) {
      const g = chart.slice(k, k + 4);
      htf.push({
        openTime: g[0].openTime, open: g[0].open, close: g[3].close, volume: 0, isClosed: true,
        high: Math.max(...g.map(x => x.high)), low: Math.min(...g.map(x => x.low)),
      });
    }
    const single = analyzeQuantumAi(chart, DEFAULT_QUANTUM_AI_CONFIG);
    const multi = analyzeQuantumAi(chart, DEFAULT_QUANTUM_AI_CONFIG, { htfCandles: htf });
    const singleLabel = JSON.stringify(single.resonance);
    const multiLabel = JSON.stringify(multi.resonance);
    assert.ok(singleLabel.includes('Single-TF'), 'Without HTF candles resonance must be labelled Single-TF');
    assert.ok(multiLabel.includes('HTF:'), 'With HTF candles resonance must use the real HTF layer');
    console.log('[R3] Resonance HTF wiring: Single-TF without HTF, real HTF layer with HTF candles');

    // R4: Session-aware HTF aggregation across Crypto 1H, NSE 15m, Weekday Daily, NSE 1H (:45), US 1H (:30)
    const mkBar = (t: number): Candle => ({
      openTime: t, open: 100, high: 101, low: 99, close: 100.5, volume: 1000, isClosed: true,
    });
    // 1) Crypto 1H 24/7: 300 bars -> 75 buckets
    const crypto1H = Array.from({ length: 300 }, (_, i) => mkBar(Date.UTC(2026, 0, 1, 0, 0) + i * 3600_000));
    const aggCrypto = aggregateSessionAwareHtf(crypto1H, 'CRYPTO');
    assert.equal(aggCrypto.candles.length, 75, `Crypto 1H expected 75 buckets, got ${aggCrypto.candles.length}`);

    // 2) NSE 15m: 20 trading days * 25 bars (03:45 UTC = 09:15 IST) = 500 bars -> 120 buckets
    const nse15m: Candle[] = [];
    for (let d = 0; d < 28 && nse15m.length < 500; d++) {
      const day0 = Date.UTC(2026, 0, 5 + d, 3, 45);
      const dow = new Date(day0).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      for (let b = 0; b < 25; b++) nse15m.push(mkBar(day0 + b * 15 * 60_000));
    }
    const aggNse15m = aggregateSessionAwareHtf(nse15m, 'INDIA');
    assert.equal(aggNse15m.candles.length, 120, `NSE 15m expected 120 buckets, got ${aggNse15m.candles.length}`);

    // 3) Weekday-only Daily: 60 weeks * 5 days = 300 bars -> 60 weekly buckets (not 30)
    const dailyWk: Candle[] = [];
    for (let w = 0; w < 60; w++) {
      for (let d = 0; d < 5; d++) {
        dailyWk.push(mkBar(Date.UTC(2025, 0, 6 + w * 7 + d, 0, 0)));
      }
    }
    const aggDaily = aggregateSessionAwareHtf(dailyWk, 'USA');
    assert.equal(aggDaily.candles.length, 60, `Weekday daily expected 60 weekly buckets, got ${aggDaily.candles.length}`);

    // 4) NSE 1H (:45 start, 20 days * 7 bars = 140 bars) -> 40 session-4H buckets (2 per day)
    const nse1H: Candle[] = [];
    for (let d = 0; d < 28 && nse1H.length < 140; d++) {
      const day0 = Date.UTC(2026, 0, 5 + d, 3, 45);
      const dow = new Date(day0).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      for (let b = 0; b < 7; b++) nse1H.push(mkBar(day0 + b * 3600_000));
    }
    const aggNse1H = aggregateSessionAwareHtf(nse1H, 'INDIA');
    assert.equal(aggNse1H.candles.length, 40, `NSE 1H expected 40 session-4H buckets, got ${aggNse1H.candles.length}`);

    // 5) US 1H (:30 start, 20 days * 7 bars = 140 bars) -> 40 session-4H buckets (2 per day)
    const us1H: Candle[] = [];
    for (let d = 0; d < 28 && us1H.length < 140; d++) {
      const day0 = Date.UTC(2026, 0, 5 + d, 14, 30);
      const dow = new Date(day0).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      for (let b = 0; b < 7; b++) us1H.push(mkBar(day0 + b * 3600_000));
    }
    const aggUs1H = aggregateSessionAwareHtf(us1H, 'USA');
    assert.equal(aggUs1H.candles.length, 40, `US 1H expected 40 session-4H buckets, got ${aggUs1H.candles.length}`);

    // 6) Gapped Crypto 1H (296 bars: 300 bars minus a 4-hour stretch at bars 80..83)
    const gappedCrypto = crypto1H.filter((_, idx) => idx < 80 || idx >= 84);
    assert.equal(gappedCrypto.length, 296);
    const aggGappedCrypto = aggregateSessionAwareHtf(gappedCrypto, 'CRYPTO');
    const aggGappedAsUsa = aggregateSessionAwareHtf(gappedCrypto, 'USA');
    assert.equal(aggGappedCrypto.candles.length, 74, `Gapped Crypto expected 74 buckets, got ${aggGappedCrypto.candles.length}`);
    assert.equal(aggGappedAsUsa.candles.length, 74, `Gapped 24h series under USA expected 74 buckets, got ${aggGappedAsUsa.candles.length}`);
    assert.ok(aggGappedCrypto.candles.every(c => c.volume === 4000), 'Every gapped crypto HTF candle must merge exactly 4 bars');

    // 7) Forex 1H with weekend gaps (12 trading days * 24 bars = 288 bars -> 72 4H buckets)
    const fx1H: Candle[] = [];
    for (let d = 0; d < 20 && fx1H.length < 288; d++) {
      const day0 = Date.UTC(2026, 0, 5 + d, 0, 0);
      const dow = new Date(day0).getUTCDay();
      if (dow === 0 || dow === 6) continue;
      for (let b = 0; b < 24; b++) fx1H.push(mkBar(day0 + b * 3600_000));
    }
    const aggFx = aggregateSessionAwareHtf(fx1H, 'FOREX');
    const aggFxUsa = aggregateSessionAwareHtf(fx1H, 'USA');
    assert.equal(aggFx.candles.length, 72, `Forex 1H with weekends expected 72 buckets, got ${aggFx.candles.length}`);
    assert.equal(aggFxUsa.candles.length, 72, `Forex 1H under USA expected 72 buckets, got ${aggFxUsa.candles.length}`);
    assert.ok(aggFx.candles.every(c => c.volume === 4000), 'Every Forex HTF candle must merge exactly 4 bars');

    console.log(
      `[R4] Session HTF buckets: Crypto1H=${aggCrypto.candles.length}, GappedCrypto=${aggGappedCrypto.candles.length}, FX1H=${aggFx.candles.length}, NSE15m=${aggNse15m.candles.length}, Daily=${aggDaily.candles.length}, NSE1H=${aggNse1H.candles.length}, US1H=${aggUs1H.candles.length}`
    );
  }

  console.log('\nALL AUDIT REGRESSION TESTS PASSED.');
}

runTests();
