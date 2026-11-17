import assert from 'node:assert/strict';
import { Candle } from '../lib/types';
import {
  DEFAULT_QUANTUM_AI_CONFIG,
  QuantumAiConfig,
} from '../lib/quantumai/types';
import {
  analyzeQuantumAi,
  calculateMomentum,
  detectSwings,
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
    const full = generateRandomWalk(220, 4242, 500, 0.01);
    const prefixN = 150;
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
      `Closed trade count changed with future bars: ${closedPrefix.length} vs ${closedFullBeforeN.length}`
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
    console.log(`[Test 2] Point-in-Time Invariance: ${closedPrefix.length} closed trades & ${swingsPrefix.length} swings identical`);
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

  console.log('\nALL AUDIT REGRESSION TESTS PASSED.');
}

runTests();
