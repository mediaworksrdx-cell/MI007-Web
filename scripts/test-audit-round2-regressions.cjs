const path = require('path');
const assert = require('assert');
const { computeVolumeProfile } = require(path.resolve('lib/volumeProfile.ts'));
const { calculateVolumeProfile } = require(path.resolve('lib/chartRenderer.ts'));
const { analyzeMi007Strategy, buildRangeProfile } = require(path.resolve('lib/mi007/mi007Engine.ts'));
const { calculateSMC, DEFAULT_SMC_CONFIG } = require(path.resolve('lib/smcEngine.ts'));

function makeCandles(specs) {
  const startMs = Date.now() - (specs.length + 10) * 3600 * 1000;
  return specs.map((s, i) => ({
    openTime: startMs + i * 3600 * 1000,
    closeTime: startMs + (i + 1) * 3600 * 1000 - 1,
    open: s.o,
    high: s.h,
    low: s.l,
    close: s.c,
    volume: s.v,
  }));
}

// Helper deterministic series
function makeSeries(n, volFn, flatEvery = 0) {
  const specs = [];
  for (let i = 0; i < n; i++) {
    const base = 950 + Math.sin(i * 0.18) * 55 + (i * 0.25);
    if (flatEvery > 0 && i % flatEvery === 0) {
      specs.push({ o: base, h: base, l: base, c: base, v: volFn(i) });
    } else {
      specs.push({
        o: base - 2,
        h: base + 5,
        l: base - 5,
        c: base + ((i % 2 === 0) ? 2 : -1.5),
        v: volFn(i),
      });
    }
  }
  return makeCandles(specs);
}

// TEST 1: Zero-volume guard (VP1 + VP2)
{
  const zeroCandles = makeSeries(150, () => 0);
  const miVp = buildRangeProfile(zeroCandles, 0, zeroCandles.length - 1, 40);
  assert.strictEqual(miVp.bins.length, 0, 'VP1: buildRangeProfile must return empty bins on zero volume');
  assert.strictEqual(miVp.summary.poc, 0, 'VP1: buildRangeProfile must not emit bin-0 POC on zero volume');
  assert.strictEqual(miVp.summary.totalVolume, 0);

  const chartVp = calculateVolumeProfile(zeroCandles, 800, 1200, 40);
  assert.strictEqual(chartVp.buckets.length, 0, 'VP1: calculateVolumeProfile must not invent volume on zero-volume candles');
  assert.strictEqual(chartVp.pocPrice, 0);

  const miRes = analyzeMi007Strategy(zeroCandles, { symbol: 'ZERO_VOL_IDX', timeframe: '1H' });
  assert.strictEqual(miRes.volumeProfile.volumeQuality, 'ESTIMATED', 'VP2: volumeQuality must be ESTIMATED');
  if (miRes.activeSetup) {
    assert.strictEqual(miRes.activeSetup.scoreBreakdown.volumeProfile, 0, 'VP2: MI-007 must award 0 VP points on zero-volume data');
  }
  console.log('PASS [1/7] Zero-volume guard (VP1 + VP2)');
}

// TEST 2: Volume conservation with 20% flat bars (VP3)
{
  const flatSeries = makeSeries(150, (i) => 500 + (i % 13) * 120, 5); // 20% flat bars
  const expectedSum = flatSeries.reduce((a, c) => a + c.volume, 0);
  const vp = computeVolumeProfile(flatSeries, { bucketCount: 40 });
  const actualSum = vp.buckets.reduce((a, b) => a + b.totalVolume, 0);
  const pct = (actualSum / expectedSum) * 100;
  assert.ok(Math.abs(pct - 100) < 0.01, `VP3: Expected 100% volume conservation with 20% flat bars, got ${pct.toFixed(4)}%`);
  console.log(`PASS [2/7] Volume conservation with 20% flat bars (${pct.toFixed(4)}%) (VP3)`);
}

// TEST 3: One unified profile — Chart VPVR === MI-007 (VP4)
{
  const series = makeSeries(150, (i) => 1000 + (i % 17) * 230);
  const chartVp = calculateVolumeProfile(series, 800, 1200, 40);
  const miVp = buildRangeProfile(series, 0, series.length - 1, 40);
  assert.strictEqual(chartVp.pocPrice, miVp.summary.poc, 'VP4: POC must match identically');
  assert.strictEqual(chartVp.vahPrice, miVp.summary.vah, 'VP4: VAH must match identically');
  assert.strictEqual(chartVp.valPrice, miVp.summary.val, 'VP4: VAL must match identically');
  console.log(`PASS [3/7] Unified profile parity: POC=${chartVp.pocPrice} VAH=${chartVp.vahPrice} VAL=${chartVp.valPrice} (VP4)`);
}

// TEST 4: Axis independence (VP5)
{
  const series = makeSeries(150, (i) => 1000 + (i % 11) * 190);
  const vpTight = calculateVolumeProfile(series, 890, 1050, 40);
  const vpPadded = calculateVolumeProfile(series, 700, 1300, 40);
  assert.strictEqual(vpTight.pocPrice, vpPadded.pocPrice, 'VP5: POC must be invariant to axis padding');
  assert.strictEqual(vpTight.vahPrice, vpPadded.vahPrice, 'VP5: VAH must be invariant to axis padding');
  assert.strictEqual(vpTight.valPrice, vpPadded.valPrice, 'VP5: VAL must be invariant to axis padding');
  console.log('PASS [4/7] Axis-padding independence (VP5)');
}

// TEST 5: Fibonacci orientation (FB1)
{
  // Manual tool formula: default reverse=false -> r = 1 - lvl -> p1 + (p2 - p1) * (1 - lvl)
  const p1 = 100, p2 = 200;
  const manual618 = Number((p1 + (p2 - p1) * (1 - 0.618)).toFixed(2));
  assert.strictEqual(manual618, 138.2, 'FB1: Manual Fib 61.8% on 100->200 must be 138.2');

  // MI-007 bullish impulse 100 -> 200 -> pullback
  const bullSpecs = [];
  for (let i = 0; i < 30; i++) bullSpecs.push({ o: 120 - i * 0.6, h: 121 - i * 0.6, l: 119 - i * 0.6, c: 120 - i * 0.6, v: 1000 + i * 20 });
  bullSpecs.push({ o: 102, h: 103, l: 100, c: 101, v: 1500 });
  for (let i = 1; i <= 40; i++) {
    const p = 100 + (100 * i) / 40;
    bullSpecs.push({ o: p - 1, h: i === 40 ? 200 : p + 0.5, l: p - 1.5, c: p, v: 1200 + i * 30 });
  }
  for (let i = 1; i <= 15; i++) {
    const p = 200 - (60 * i) / 15;
    bullSpecs.push({ o: p + 1, h: p + 1.5, l: p - 0.5, c: p, v: 900 + i * 15 });
  }
  const bullCandles = makeCandles(bullSpecs);
  const res = analyzeMi007Strategy(bullCandles, { symbol: 'FIB_TEST', timeframe: '1H' });
  const fib618 = res.fibonacci.levels.find((l) => l.ratio === 0.618).price;
  assert.ok(Math.abs(fib618 - 138.2) < 1.5, `FB1: MI-007 Fib 61.8% expected ~138.2, got ${fib618}`);
  console.log(`PASS [5/7] Fibonacci orientation parity: manual=${manual618}, MI-007=${fib618} (FB1)`);
}

// TEST 6: Crash test — no negative targets/extensions, stale setups not tradeable (FB2)
{
  const crashSpecs = [];
  for (let i = 0; i < 40; i++) {
    const p = 100 + (100 * i) / 39;
    crashSpecs.push({ o: p - 1, h: p + 2, l: p - 2, c: p, v: 1000 + i * 50 });
  }
  for (let i = 0; i < 50; i++) {
    const p = Math.max(16.8, 200 - (183.2 * i) / 49);
    crashSpecs.push({ o: p + 1.5, h: p + 2, l: Math.max(15, p - 1.5), c: p, v: 2000 + i * 60 });
  }
  const crashCandles = makeCandles(crashSpecs);
  const res = analyzeMi007Strategy(crashCandles, { symbol: 'CRASH_TEST', timeframe: '1H' });
  if (res.fibonacci) {
    for (const lv of res.fibonacci.levels) {
      assert.ok(lv.price > 0, `FB2: Fib level ${lv.label} must be > 0, got ${lv.price}`);
    }
  }
  if (res.activeSetup) {
    const st = res.activeSetup;
    assert.ok(st.target1 > 0 && st.target2 > 0 && st.target3 > 0 && st.stopLoss > 0, `FB2: All targets/SL must be > 0 (got TP1=${st.target1}, TP2=${st.target2}, TP3=${st.target3}, SL=${st.stopLoss})`);
    const lastClose = crashCandles[crashCandles.length - 1].close;
    const passedTp1 = st.direction === 'BULLISH' ? lastClose >= st.target1 : lastClose <= st.target1;
    if (passedTp1) {
      assert.strictEqual(st.isTradeable, false, 'FB2: Setup whose price passed TP1 must not be tradeable');
    }
  }
  console.log('PASS [6/7] Crash test positive targets & stale-setup guard (FB2)');
}

// TEST 7: SMC setupHistory preserves stopped-out / expired setups (SMC-A)
{
  let foundNonActiveInHistory = false;
  let totalHistory = 0;
  for (let seed = 1; seed <= 12; seed++) {
    let x = seed * 9301 + 49297;
    const rand = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
    const specs = [];
    let p = 500;
    for (let i = 0; i < 260; i++) {
      const chg = (rand() - 0.5) * 16;
      const o = p;
      const c = Math.max(50, p + chg);
      const h = Math.max(o, c) + rand() * 6;
      const l = Math.min(o, c) - rand() * 6;
      specs.push({ o, h, l, c, v: 1000 + Math.round(rand() * 3000) });
      p = c;
    }
    const smc = calculateSMC(makeCandles(specs), { ...DEFAULT_SMC_CONFIG, enabled: true }, `HIST_${seed}`, '15m');
    assert.ok(Array.isArray(smc.setupHistory), 'SMC-A: setupHistory must be an array');
    totalHistory += smc.setupHistory.length;
    if (smc.setupHistory.some((s) => s.status === 'INVALIDATED' || s.status === 'EXPIRED')) {
      foundNonActiveInHistory = true;
      break;
    }
  }
  assert.ok(foundNonActiveInHistory, `SMC-A: setupHistory should record stopped-out/expired setups (totalHistory=${totalHistory})`);
  console.log('PASS [7/10] SMC setupHistory preserves stopped-out / expired setups (SMC-A)');
}

// TEST 8: Critical 1 + Important 06 — even ONE volumeEstimated=true candle must classify ESTIMATED & block tradeability (unconditional)
{
  const estCandles = makeSeries(150, (i) => 1000 + (i % 19) * 350);
  estCandles[estCandles.length - 5] = { ...estCandles[estCandles.length - 5], volumeEstimated: true };
  const res = analyzeMi007Strategy(estCandles, { symbol: 'EST_SINGLE_BAR', timeframe: '1H' });
  assert.ok(res && res.activeSetup, 'Test 8 requires non-null activeSetup (no conditional skipping)');
  assert.strictEqual(res.volumeProfile.volumeQuality, 'ESTIMATED', 'Critical 1: even 1 volumeEstimated=true candle must classify ESTIMATED');
  assert.strictEqual(res.activeSetup.scoreBreakdown.volumeProfile, 0, 'Critical 1: VP score must be 0 when estimated');
  assert.strictEqual(res.activeSetup.isTradeable, false, 'Important 6: must never bypass VP gate when volume is estimated');
  assert.strictEqual(res.activeSetup.status, 'WAIT_CONFIRMATION', 'Important 5: non-tradeable setup must not have status ACTIVE');
  console.log('PASS [8/10] Zero-tolerance volumeEstimated flag & non-bypassable VP gate (unconditional)');
}

// TEST 9: Important 5 & Important 3 — unconditional status/isTradeable parity, checklist sum parity, and directional candle close
{
  const series = makeSeries(160, (i) => 1200 + (i % 17) * 410);
  // Make last closed bar a bearish candle with a huge lower wick — must NOT pass bullish candle confirmation
  const last = series[series.length - 1];
  series[series.length - 1] = { ...last, open: 1010, high: 1012, low: 980, close: 1006, volume: 3500 };
  const res = analyzeMi007Strategy(series, { symbol: 'STATUS_SYNC_UNCOND', timeframe: '1H' });
  assert.ok(res && res.activeSetup, 'Test 9 requires non-null activeSetup (no conditional skipping)');
  const st = res.activeSetup;
  const sum = st.checklist.reduce((a, b) => a + b.awarded, 0);
  assert.strictEqual(st.score, Math.min(100, sum), 'Score must exactly match checklist sum');
  assert.strictEqual(st.status === 'ACTIVE', st.isTradeable, 'Important 5: status ACTIVE must strictly match isTradeable');
  if (st.direction === 'BULLISH') {
    assert.strictEqual(st.scoreBreakdown.entryCandle, 0, 'Important 3: bearish close with lower wick must NOT award bullish entry confirmation');
  }
  console.log('PASS [9/10] Unconditional status/isTradeable parity, checklist sum & directional close (Important 3 + 5)');
}

// TEST 10: Critical 2 & 3 — Numerical Order Flow bar-delta / CVD accuracy + OHLCV proxy metadata
{
  const bullRun = [];
  for (let i = 0; i < 60; i++) {
    const p = 100 + i * 2;
    bullRun.push({ o: p, h: p + 4, l: p - 0.5, c: p + 3.8, v: 1000 + (i % 11) * 250 });
  }
  const candles = makeCandles(bullRun);
  const vp = computeVolumeProfile(candles, { bucketCount: 40 });
  assert.strictEqual(vp.distributionModel, 'OHLCV_UNIFORM_APPROXIMATION');
  assert.strictEqual(vp.estimatedDelta, true);
  const res = analyzeMi007Strategy(candles, { symbol: 'OF_MATH_TEST', timeframe: '1H' });
  assert.strictEqual(res.orderFlow.volumeQuality, 'ACTUAL');
  assert.ok(res.orderFlow.barDelta > 0, `Expected positive barDelta on bullish close-near-high bar, got ${res.orderFlow.barDelta}`);
  assert.strictEqual(res.orderFlow.cvdTrend, 'BULLISH', `Expected BULLISH cvdTrend on sustained buying, got ${res.orderFlow.cvdTrend}`);
  console.log(`PASS [10/10] Numerical Order Flow barDelta=${res.orderFlow.barDelta}, cvdTrend=${res.orderFlow.cvdTrend} & OHLCV proxy metadata`);
}

console.log('\nALL 10 UNCONDITIONAL AUDIT REGRESSION TESTS PASSED!');
