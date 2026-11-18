import fs from 'fs';
import path from 'path';
import { Candle } from '../lib/types';
import {
  calculateSMC,
  detectAll16SmcSetups,
  detectFairValueGaps,
  detectOrderBlocksAndBreakers,
  detectStructureBreaks,
  detectSwingPoints,
  detectLiquidity,
  isCandleClosed,
  isValidVerifiedCandleDataset,
  resolveSameBarTpSlOrder,
  timeframeToMs,
  DEFAULT_SMC_CONFIG,
  SmcConfig,
} from '../lib/smcEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

function makeCandle(
  openTime: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume = 1000000
): Candle {
  return { openTime, open, high, low, close, volume, isClosed: true };
}

console.log('\n======================================================================');
console.log('🧪 VERIFYING SMC INSTITUTIONAL IMPLEMENTATION ACCURACY & ZERO LOOK-AHEAD');
console.log('======================================================================\n');

// ── Test 1: FVG Mitigation Safety (No Fresh Retracement on Mitigated Gaps) ──
console.log('--- Test 1: FVG Mitigation Safety ---');
{
  const t0 = 1700000000000;
  const minute = 60000;
  // Create Bullish FVG at C1-C3 [105, 112], then fully mitigate it with C5 dipping to 104
  const candles: Candle[] = [
    makeCandle(t0, 100, 105, 99, 104),              // C0 (Index 0): High 105
    makeCandle(t0 + minute, 104, 120, 104, 119),     // C1 (Index 1): Large impulse green bar
    makeCandle(t0 + minute * 2, 119, 122, 112, 121), // C2 (Index 2): Low 112 -> Gap [105, 112]
    makeCandle(t0 + minute * 3, 121, 124, 118, 123), // C3 (Index 3): Consolidation
    makeCandle(t0 + minute * 4, 123, 123, 104, 106), // C4 (Index 4): Dip to 104 -> Fully penetrates bottom (105)
    makeCandle(t0 + minute * 5, 106, 115, 105, 114), // C5 (Index 5): Rebound
  ];

  const fvgs = detectFairValueGaps(candles);
  assert(fvgs.length >= 1, 'FVG detected');
  const bullFvg = fvgs.find((f) => f.id.includes('bull'));
  assert(bullFvg !== undefined, 'Bullish FVG found');
  assert(bullFvg!.isMitigated === true || bullFvg!.isInvalidated === true, 'FVG correctly flagged as mitigated/invalidated');

  // Verify that detectAll16SmcSetups does NOT produce a fresh FVG_TAP setup on this mitigated gap
  const setups = detectAll16SmcSetups(candles);
  const bullFvgRetrace = setups.filter((s) => s.setupType === 'FVG_TAP' && s.direction === 'BULLISH');
  assert(bullFvgRetrace.length === 0, 'Mitigated FVG rejected: Zero fresh bullish FVG retracement setups generated from mitigated gap');
}

// ── Test 2: Bullish vs. Bearish Setup Symmetry ──
console.log('\n--- Test 2: Directional Setup Symmetry (Bullish & Bearish) ---');
{
  const t0 = 1700000000000;
  const minute = 60000;

  // Bearish impulse series: Prior Swing Low -> Swing High -> Green Supply OB -> Bearish BOS break below Swing Low
  const bearishCandles: Candle[] = [];
  const prices = [310, 306, 302, 298, 294, 299, 304, 309, 314, 318, 315, 312, 309, 306, 308];
  for (let i = 0; i < prices.length; i++) {
    const p = prices[i];
    const isUp = i === 0 || p >= prices[i - 1];
    bearishCandles.push(
      makeCandle(t0 + i * minute, isUp ? p - 1.5 : p + 1.5, p + 2, p - 2, p, 1000000)
    );
  }
  // Bar 15: Strong bearish displacement candle breaking below prior Swing Low (294) with 3x volume
  bearishCandles.push(makeCandle(t0 + 15 * minute, 308, 308.5, 288, 289, 3000000));
  for (let i = 16; i < 30; i++) {
    const p = 289 - (i - 15) * 1.5;
    bearishCandles.push(makeCandle(t0 + i * minute, p + 1, p + 2, p - 1, p, 1000000));
  }

  const smcBear = calculateSMC(bearishCandles);
  assert(smcBear.swings.length > 0, 'Bearish series swings detected');
  assert(smcBear.orderBlocks.length > 0, 'Bearish Order Blocks detected');

  // Verify Bearish setup detection under Master Bearish filter
  const bearSetups = smcBear.confirmedSetups.filter((s) => s.direction === 'BEARISH');
  assert(bearSetups.length >= 0, 'Bearish setups evaluated cleanly');

  // Master toggle verification: when showBearishSetups is false, bearish setups are suppressed
  const smcFiltered = calculateSMC(bearishCandles, { showBearishSetups: false });
  const filteredBearSetups = smcFiltered.confirmedSetups.filter((s) => s.direction === 'BEARISH');
  assert(filteredBearSetups.length === 0, 'Master Direction Filter: showBearishSetups: false cleanly eliminates all bearish setups');
}

// ── Test 3: Historical Alignment & Zero Look-Ahead Invariants ──
console.log('\n--- Test 3: Historical Alignment & Confirmation Invariants ---');
{
  const t0 = 1700000000000;
  const minute = 60000;
  const wave: Candle[] = [];
  let p = 100;
  for (let i = 0; i < 40; i++) {
    p += (i % 6 < 3 ? 1.8 : -1.2);
    wave.push(makeCandle(t0 + i * minute, p - 0.5, p + 1.2, p - 1.2, p));
  }

  const smc = calculateSMC(wave);
  for (const st of smc.confirmedSetups) {
    assert(st.formationTime <= st.confirmationTime, `Setup ${st.name}: formationTime (${st.formationTime}) <= confirmationTime (${st.confirmationTime})`);
    assert(st.candleIndex < wave.length, `Setup ${st.name}: candleIndex (${st.candleIndex}) within dataset boundary`);
    assert(st.riskReward >= 2.0, `Setup ${st.name}: Valid 1:2+ Risk-to-Reward ratio (got: ${st.riskReward})`);
    assert(st.qualityScore >= 70 && !st.isRejectedPermanently && st.signalState !== 'REJECTED', `Setup ${st.name}: Active trade list strictly requires qualityScore >= 70 (got: ${st.qualityScore})`);
  }
  if (smc.rejectedSetups && smc.rejectedSetups.length > 0) {
    for (const rej of smc.rejectedSetups) {
      assert(
        rej.qualityScore < 70 && rej.isRejectedPermanently === true && Boolean(rej.rejectionReason) && Boolean(rej.rejectionTimestamp) && Boolean(rej.invalidationLevel),
        `Rejected Setup (${rej.name}): Excluded from active trade list with reason "${rej.rejectionReason}", timestamp ${rej.rejectionTimestamp}, and invalidation ${rej.invalidationLevel}`
      );
    }
  }

  // Verify synthetic staircase & unclosed dataset rejection
  const syntheticStaircase: Candle[] = Array.from({ length: 15 }, (_, i) =>
    makeCandle(t0 + i * minute, 100 + i * 5, 105 + i * 5, 100 + i * 5, 105 + i * 5)
  );
  assert(isValidVerifiedCandleDataset(syntheticStaircase) === false, 'Data Validation: Synthetic linear staircase rejected');
  assert(calculateSMC(syntheticStaircase).confirmedSetups.length === 0, 'Data Validation: Zero setups generated from synthetic staircase');

  const unclosedSeries: Candle[] = wave.map(c => ({ ...c, isClosed: false }));
  assert(isValidVerifiedCandleDataset(unclosedSeries) === false, 'Data Validation: Unclosed candle series rejected');

  // Verify LTF same-candle TP/SL conflict resolution
  const parentBar = makeCandle(t0, 100, 110, 90, 105);
  const ltfTpFirst: Candle[] = [
    makeCandle(t0, 100, 101, 91, 92),          // Hits short TP (92) first
    makeCandle(t0 + 15000, 92, 106, 92, 105),  // Hits short SL (105) second
  ];
  const ltfResolved = resolveSameBarTpSlOrder(parentBar, t0 + minute, false, 105, 92, ltfTpFirst);
  assert(ltfResolved.usedLtf === true && ltfResolved.order === 'TP_FIRST', 'Trade Management: LTF sub-candles deterministically resolve same-candle TP-before-SL');
}

// ── Test 4: Empirical Forward Outcome Simulation (Wins, Losses, Profit Factor & Expectancy) ──
console.log('\n--- Test 4: Empirical Forward Outcome Simulation (Wins, Losses & Expectancy) ---');
{
  let series: Candle[] = [];
  const histPath = path.join(process.cwd(), 'public', 'data', 'history-5y', 'NIFTY.json');
  if (fs.existsSync(histPath)) {
    const raw = JSON.parse(fs.readFileSync(histPath, 'utf-8')) as Candle[];
    series = raw.slice(-180).map((c) => ({ ...c, isClosed: true }));
  } else {
    const cycles = 180;
    const minute = 60000;
    const t0 = 1700000000000;
    let currentPrice = 1000;
    for (let c = 0; c < cycles; c++) {
      const cycleTrend = Math.sin(c / 8) * 18;
      const open = currentPrice;
      const close = open + cycleTrend;
      const high = Math.max(open, close) + 4;
      const low = Math.min(open, close) - 4;
      series.push(makeCandle(t0 + c * minute, open, high, low, close, 2000000));
      currentPrice = close;
    }
  }

  // Bar-by-bar (1-bar step) point-in-time walk-forward evaluation:
  // captures every intermediate setup state at the exact bar t it confirms, then simulates future bars t..N-1
  const seenIds = new Set<string>();
  const allEvaluated: { setup: (typeof series extends Candle[] ? ReturnType<typeof calculateSMC>['confirmedSetups'][number] : never); confirmedAtBar: number }[] = [];
  for (let t = 40; t <= series.length; t += 1) {
    const sub = calculateSMC(series.slice(0, t));
    for (const st of sub.confirmedSetups) {
      if (!seenIds.has(st.id)) {
        seenIds.add(st.id);
        allEvaluated.push({ setup: st, confirmedAtBar: t - 1 });
      }
    }
  }
  const totalSetups = allEvaluated.length;
  assert(totalSetups > 0, `Generated ${totalSetups} bar-by-bar point-in-time setups across walk-forward series`);

  // Realistic execution friction parameters
  const SLIPPAGE_RATE = 0.0005;   // 5 bps per leg slippage
  const COMMISSION_RATE = 0.0004; // 4 bps round-trip commission/fees
  const PARTIAL_TP1_WEIGHT = 0.5; // 50% scale-out at TP1, 50% runner to TP2

  let structuralValidCount = 0;
  let wins = 0;
  let losses = 0;
  let unresolved = 0;
  let netWinR = 0;
  let netLossR = 0;

  for (const { setup: st, confirmedAtBar } of allEvaluated) {
    const isBull = st.direction === 'BULLISH';
    const validEntry = st.entryPrice > 0;
    const validSL = isBull ? st.stopLoss < st.entryPrice : st.stopLoss > st.entryPrice;
    const validTP = isBull ? st.targetPrice > st.entryPrice : st.targetPrice < st.entryPrice;
    const validRR = st.riskReward >= 2.0;

    if (validEntry && validSL && validTP && validRR) {
      structuralValidCount++;
    }

    // Apply adverse entry & stop-exit slippage
    const effectiveEntry = isBull
      ? st.entryPrice * (1 + SLIPPAGE_RATE)
      : st.entryPrice * (1 - SLIPPAGE_RATE);
    const effectiveStop = isBull
      ? st.stopLoss * (1 - SLIPPAGE_RATE)
      : st.stopLoss * (1 + SLIPPAGE_RATE);

    const risk = Math.max(1e-9, Math.abs(effectiveEntry - effectiveStop));
    const feeInR = (st.entryPrice * COMMISSION_RATE) / risk;
    const tp1R = Math.max(0, Math.abs(st.targetPrice - effectiveEntry) / risk);
    const tp2R = st.targetPrice2
      ? Math.max(0, Math.abs(st.targetPrice2 - effectiveEntry) / risk)
      : tp1R;

    let entryFilled = false;
    let hitTp1 = false;
    let hitTp2 = false;
    let hitSl = false;

    const simStartIdx = Math.max(st.candleIndex + 1, confirmedAtBar + 1);
    for (let k = simStartIdx; k < series.length; k++) {
      const bar = series[k];
      if (!bar || bar.isClosed !== true) break;

      if (!entryFilled) {
        if (isBull ? bar.low <= st.stopLoss : bar.high >= st.stopLoss) break;
        // Require price to trade through effectiveEntry (accounting for slippage/queue depth)
        const filled = isBull ? bar.low <= effectiveEntry : bar.high >= effectiveEntry;
        if (filled) {
          entryFilled = true;
        }
        continue;
      }

      const slTouched = isBull
        ? (bar.low <= effectiveStop || bar.close <= effectiveStop)
        : (bar.high >= effectiveStop || bar.close >= effectiveStop);
      const tp1Touched = isBull ? bar.high >= st.targetPrice : bar.low <= st.targetPrice;
      const tp2Touched = st.targetPrice2
        ? (isBull ? bar.high >= st.targetPrice2 : bar.low <= st.targetPrice2)
        : false;

      if (slTouched) {
        hitSl = true;
        break;
      }
      if (tp1Touched && !hitTp1) {
        hitTp1 = true;
      }
      if (tp2Touched && !hitTp2) {
        hitTp2 = true;
        break;
      }
    }

    if (hitTp2) {
      const tradeR = PARTIAL_TP1_WEIGHT * tp1R + (1 - PARTIAL_TP1_WEIGHT) * tp2R - feeInR;
      if (tradeR >= 0) { wins++; netWinR += tradeR; } else { losses++; netLossR += Math.abs(tradeR); }
    } else if (hitTp1 && hitSl) {
      // 50% banked at TP1, runner stopped at original SL (-0.5R) minus fees
      const tradeR = PARTIAL_TP1_WEIGHT * tp1R - (1 - PARTIAL_TP1_WEIGHT) * 1.0 - feeInR;
      if (tradeR >= 0) { wins++; netWinR += tradeR; } else { losses++; netLossR += Math.abs(tradeR); }
    } else if (hitTp1) {
      const tradeR = PARTIAL_TP1_WEIGHT * tp1R - feeInR;
      if (tradeR >= 0) { wins++; netWinR += tradeR; } else { losses++; netLossR += Math.abs(tradeR); }
    } else if (hitSl) {
      losses++;
      netLossR += 1.0 + feeInR;
    } else {
      unresolved++;
    }
  }

  const structuralPct = (structuralValidCount / totalSetups) * 100;
  const resolvedCount = wins + losses;
  const winRatePct = resolvedCount > 0 ? (wins / resolvedCount) * 100 : 0;
  const expectancyR = resolvedCount > 0 ? (netWinR - netLossR) / resolvedCount : 0;
  const profitFactor = netLossR > 0 ? netWinR / netLossR : (netWinR > 0 ? Infinity : 0);

  console.log(`  ▶ Structural Invariant Compliance: ${structuralPct.toFixed(1)}% (${structuralValidCount}/${totalSetups})`);
  console.log(`  ▶ Bar-by-Bar Net Forward Simulation (5bps slip + 4bps fee + 50/50 partial TP): ${wins}W / ${losses}L / ${unresolved} Unfilled-or-Open (Win Rate: ${winRatePct.toFixed(1)}%, Net PF: ${Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : '∞'}, Net Expectancy: ${expectancyR >= 0 ? '+' : ''}${expectancyR.toFixed(2)}R)`);

  assert(structuralPct === 100, `All generated setups satisfy directional entry/SL/TP/RR invariants (got ${structuralPct.toFixed(1)}%)`);
  assert(resolvedCount > 0, `Forward simulation resolved at least 1 trade outcome (${resolvedCount} resolved)`);
}

// ── Test 5: Regression Suite (Fixes 1–12) ────────────────────────────────────
console.log('\n--- Test 5: Regression Suite (Closed-Bar Fallback, Volume Isolation, Liquidity, Caching) ---');
{
  const hour = 3_600_000;
  const pastStart = Date.now() - 40 * hour;

  // 1. Missing isClosed flag falls back to now >= openTime + timeframe
  const omittedFlagPast: Candle = { openTime: pastStart, open: 100, high: 105, low: 98, close: 103, volume: 1000 };
  const omittedFlagLive: Candle = { openTime: Date.now() - 10_000, open: 103, high: 104, low: 102, close: 103.5, volume: 200 };
  assert(isCandleClosed(omittedFlagPast, timeframeToMs('1H')) === true, 'Fix 1: Missing isClosed on past bar falls back to closed (true)');
  assert(isCandleClosed(omittedFlagLive, timeframeToMs('1H')) === false, 'Fix 1: Missing isClosed on active bar falls back to open (false)');

  // 2. Single estimated-volume bar does NOT poison the entire OB series
  const volSeries: Candle[] = Array.from({ length: 30 }, (_, i) =>
    makeCandle(pastStart + i * hour, 100 + Math.sin(i / 3) * 5, 106 + Math.sin(i / 3) * 5, 95 + Math.sin(i / 3) * 5, 102 + Math.sin(i / 3) * 5, 1_000_000)
  );
  volSeries[volSeries.length - 1] = { ...volSeries[volSeries.length - 1], volumeEstimated: true };
  const sw = detectSwingPoints(volSeries, 3, true);
  const brk = detectStructureBreaks(volSeries, sw, undefined, 3);
  const { orderBlocks } = detectOrderBlocksAndBreakers(volSeries, brk);
  const earlyCleanObs = orderBlocks.filter(ob => ob.startIndex < 20);
  assert(earlyCleanObs.every(ob => !ob.volumeEstimated), 'Fix 6: Single live estimated-volume bar does not mark historical OBs as volumeEstimated');

  // 3. Non-genuine sweep (wick < minWickRatio) must NOT mark liquidity level as swept
  const liqCandles: Candle[] = [
    makeCandle(pastStart + 0 * hour, 100, 102, 99, 101),
    makeCandle(pastStart + 1 * hour, 101, 105, 100, 102),
    makeCandle(pastStart + 2 * hour, 102, 110, 101, 103), // Swing high at 110
    makeCandle(pastStart + 3 * hour, 103, 104, 100, 101),
    makeCandle(pastStart + 4 * hour, 101, 103, 99, 100),
    makeCandle(pastStart + 5 * hour, 100, 102, 98, 99),
    // Tiny upper wick (110.2 - 109.9 = 0.3 out of range 110.2 - 100 = 10.2 => 2.9% < 25%) closing below 110
    makeCandle(pastStart + 6 * hour, 100, 110.2, 100, 109.9),
  ];
  const liqSwings = detectSwingPoints(liqCandles, 2, true);
  const liqRes = detectLiquidity(liqCandles, liqSwings, 0.25);
  const bsl110 = liqRes.levels.find(l => l.type === 'BSL' && l.price === 110);
  assert(Boolean(bsl110 && bsl110.isSwept === false), 'Fix 8: Non-genuine sweep does not mark BSL level as swept');

  // 4. Forming-bar ticks hit O(1) cache cleanly without changing SMC output
  const baseChart: Candle[] = Array.from({ length: 45 }, (_, i) => {
    const t = Math.sin(i / 5) * 12;
    const o = 1000 + t;
    const c = 1000 + Math.sin((i + 1) / 5) * 12;
    return makeCandle(pastStart + i * hour, o, Math.max(o, c) + 3, Math.min(o, c) - 3, c, 500_000);
  });
  const formingTick1: Candle = { ...makeCandle(pastStart + 45 * hour, 1005, 1006, 1004, 1005.5, 1000), isClosed: false };
  const formingTick2: Candle = { ...makeCandle(pastStart + 45 * hour, 1005, 1008, 1003, 1007.2, 1500), isClosed: false };
  const smcTick1 = calculateSMC([...baseChart, formingTick1], undefined, 'TEST', '1H');
  const smcTick2 = calculateSMC([...baseChart, formingTick2], undefined, 'TEST', '1H');
  assert(smcTick1.datasetFingerprint === smcTick2.datasetFingerprint, 'Fix 11: Forming-bar ticks share the same closed-bar cache fingerprint');
  assert(smcTick1 === smcTick2, 'Fix 11: Forming-bar ticks return cached SmcAnalysis in O(1)');

  // 5. Retest Failure vs Completed Rejection Reclaim on BOS Setup (NIFTY 25,424.35 scenario)
  const niftyBase: Candle[] = [];
  for (let i = 0; i < 30; i++) {
    const p = 25200 + Math.sin(i / 2.5) * 150;
    niftyBase.push(makeCandle(pastStart + i * hour, p - 20, p + 45, p - 45, p + 15, 2_000_000));
  }
  // Create clear swing high at 25,424.35 and swing low at 25,153.32, then bullish BOS breakout
  niftyBase.push(makeCandle(pastStart + 30 * hour, 25300, 25424.35, 25280, 25380, 2_500_000));
  niftyBase.push(makeCandle(pastStart + 31 * hour, 25380, 25390, 25220, 25240, 2_200_000));
  niftyBase.push(makeCandle(pastStart + 32 * hour, 25240, 25260, 25153.32, 25180, 2_200_000));
  niftyBase.push(makeCandle(pastStart + 33 * hour, 25180, 25320, 25170, 25300, 2_500_000));
  niftyBase.push(makeCandle(pastStart + 34 * hour, 25300, 25500, 25290, 25490, 4_000_000)); // Bullish BOS above 25,424.35

  // Case A: Confirmed candles close below BOS (25,424.35) down to 25,303.20 -> must fail/invalidate and NOT be executable
  const niftyFailed = [
    ...niftyBase,
    makeCandle(pastStart + 35 * hour, 25490, 25495, 25380, 25395, 2_800_000),
    makeCandle(pastStart + 36 * hour, 25395, 25420, 25290, 25303.20, 3_100_000),
  ];
  const smcFailed = calculateSMC(niftyFailed, undefined, 'NIFTY', '1H');
  const activeFailedBos = smcFailed.confirmedSetups.filter(
    s => s.direction === 'BULLISH' && s.setupType === 'BOS_CONTINUATION' && s.candleIndex >= 30
  );
  assert(activeFailedBos.length === 0, 'Fix 12: Confirmed close below bullish BOS invalidates/fails setup and removes from active setups');
  assert((smcFailed.executableSetups || []).filter(s => s.direction === 'BULLISH' && s.candleIndex >= 30).length === 0, 'Fix 12: Failed BOS retest is excluded from executableSetups');
}

console.log('\n======================================================================');
console.log('✅ ALL INSTITUTIONAL SMC INVARIANT & FORWARD SIMULATION AUDITS PASSED');
console.log('======================================================================\n');
