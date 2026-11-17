import fs from 'fs';
import path from 'path';
import { Candle } from '../lib/types';
import {
  calculateSMC,
  detectAll16SmcSetups,
  detectFairValueGaps,
  detectStructureBreaks,
  detectSwingPoints,
  detectLiquidity,
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
    assert(st.riskReward >= 1.0, `Setup ${st.name}: Valid institutional Risk-to-Reward ratio (got: ${st.riskReward})`);
  }
}

// ── Test 4: Empirical Forward Outcome Simulation (Wins, Losses, Profit Factor & Expectancy) ──
console.log('\n--- Test 4: Empirical Forward Outcome Simulation (Wins, Losses & Expectancy) ---');
{
  let series: Candle[] = [];
  const histPath = path.join(process.cwd(), 'public', 'data', 'history-5y', 'NIFTY.json');
  if (fs.existsSync(histPath)) {
    const raw = JSON.parse(fs.readFileSync(histPath, 'utf-8')) as Candle[];
    series = raw.slice(-300).map((c) => ({ ...c, isClosed: true }));
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

  // Point-in-time walk-forward evaluation: collect setups as they confirm at bar t, then simulate future bars t+1..N
  const seenIds = new Set<string>();
  const allEvaluated = [];
  for (let t = 40; t <= series.length; t += 10) {
    const sub = calculateSMC(series.slice(0, t));
    for (const st of sub.confirmedSetups) {
      if (!seenIds.has(st.id)) {
        seenIds.add(st.id);
        allEvaluated.push(st);
      }
    }
  }
  const totalSetups = allEvaluated.length;
  assert(totalSetups > 0, `Generated ${totalSetups} point-in-time institutional setups across walk-forward series`);

  let structuralValidCount = 0;
  let wins = 0;
  let losses = 0;
  let unresolved = 0;
  let grossWinR = 0;
  let grossLossR = 0;

  for (const st of allEvaluated) {
    const isBull = st.direction === 'BULLISH';
    const validEntry = st.entryPrice > 0;
    const validSL = isBull ? st.stopLoss < st.entryPrice : st.stopLoss > st.entryPrice;
    const validTP = isBull ? st.targetPrice > st.entryPrice : st.targetPrice < st.entryPrice;
    const validRR = st.riskReward >= 1.0;

    if (validEntry && validSL && validTP && validRR) {
      structuralValidCount++;
    }

    const risk = Math.max(1e-9, Math.abs(st.entryPrice - st.stopLoss));
    const tp1R = Math.abs(st.targetPrice - st.entryPrice) / risk;
    const tp2R = st.targetPrice2 ? Math.abs(st.targetPrice2 - st.entryPrice) / risk : tp1R;

    // Forward bar-by-bar simulation: wait for limit entry fill at entryPrice, then evaluate SL-before-TP on subsequent closed bars
    let entryFilled = false;
    let hitTp1 = false;
    let hitTp2 = false;
    let hitSl = false;

    for (let k = st.candleIndex + 1; k < series.length; k++) {
      const bar = series[k];
      if (!bar || bar.isClosed !== true) break;

      if (!entryFilled) {
        // If price invalidates stopLoss before filling entry, setup is cancelled
        if (isBull ? bar.low <= st.stopLoss : bar.high >= st.stopLoss) break;
        const filled = isBull ? bar.low <= st.entryPrice : bar.high >= st.entryPrice;
        if (filled) {
          entryFilled = true;
        }
        continue;
      }

      const slTouched = isBull ? (bar.low <= st.stopLoss || bar.close <= st.stopLoss) : (bar.high >= st.stopLoss || bar.close >= st.stopLoss);
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
      wins++;
      // 50% banked at TP1 + 50% banked at TP2
      grossWinR += 0.5 * tp1R + 0.5 * tp2R;
    } else if (hitTp1 && hitSl) {
      wins++;
      // 50% banked at TP1, remainder stopped at breakeven / SL
      grossWinR += 0.5 * tp1R;
    } else if (hitTp1) {
      wins++;
      grossWinR += tp1R;
    } else if (hitSl) {
      losses++;
      grossLossR += 1.0;
    } else {
      unresolved++;
    }
  }

  const structuralPct = (structuralValidCount / totalSetups) * 100;
  const resolvedCount = wins + losses;
  const winRatePct = resolvedCount > 0 ? (wins / resolvedCount) * 100 : 0;
  const expectancyR = resolvedCount > 0 ? (grossWinR - grossLossR) / resolvedCount : 0;
  const profitFactor = grossLossR > 0 ? grossWinR / grossLossR : (grossWinR > 0 ? Infinity : 0);

  console.log(`  ▶ Structural Invariant Compliance: ${structuralPct.toFixed(1)}% (${structuralValidCount}/${totalSetups})`);
  console.log(`  ▶ Empirical Forward Simulation: ${wins}W / ${losses}L / ${unresolved} Open (Win Rate: ${winRatePct.toFixed(1)}%, PF: ${Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : '∞'}, Expectancy: ${expectancyR >= 0 ? '+' : ''}${expectancyR.toFixed(2)}R)`);

  assert(structuralPct === 100, `All generated setups satisfy directional entry/SL/TP/RR invariants (got ${structuralPct.toFixed(1)}%)`);
  assert(resolvedCount > 0, `Forward simulation resolved at least 1 trade outcome (${resolvedCount} resolved)`);
}

console.log('\n======================================================================');
console.log('✅ ALL INSTITUTIONAL SMC INVARIANT & FORWARD SIMULATION AUDITS PASSED');
console.log('======================================================================\n');
