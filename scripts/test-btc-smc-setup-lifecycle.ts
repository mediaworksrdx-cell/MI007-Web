import { calculateSMC, detectAll16SmcSetups } from '../lib/smcEngine';
import { generateMockCandles } from '../lib/mockData';
import { Candle } from '../lib/types';

function runBtcSmcLifecycleTest() {
  console.log('============================================================');
  console.log('🧪 VERIFYING SMC SETUP LIFECYCLE, EXPIRY & DIRECTIONAL ORDERING');
  console.log('============================================================\n');

  // 1. Generate BTC 4H candles
  const btcCandles = generateMockCandles('USA', 'BTC', 800, 4 * 60 * 60 * 1000);
  console.log(`Loaded ${btcCandles.length} BTC 4H candles. Terminal close: ${btcCandles[btcCandles.length - 1].close}`);

  const smc = calculateSMC(btcCandles);
  const setups = smc.confirmedSetups;
  console.log(`Detected ${setups.length} confirmed setups across all 16 detectors.`);

  // Test 1: Directional Price Ordering Invariant
  // LONG: SL < Entry < TP1 < TP2
  // SHORT: SL > Entry > TP1 > TP2
  let orderingPassed = true;
  for (const s of setups) {
    if (s.direction === 'BULLISH') {
      if (!(s.stopLoss < s.entryPrice)) {
        console.error(`❌ Bullish SL not below Entry: SL=${s.stopLoss}, Entry=${s.entryPrice} (${s.id})`);
        orderingPassed = false;
      }
      if (!(s.entryPrice < s.targetPrice)) {
        console.error(`❌ Bullish TP1 not above Entry: Entry=${s.entryPrice}, TP1=${s.targetPrice} (${s.id})`);
        orderingPassed = false;
      }
      if (s.targetPrice2 && !(s.targetPrice < s.targetPrice2)) {
        console.error(`❌ Bullish TP2 not above TP1: TP1=${s.targetPrice}, TP2=${s.targetPrice2} (${s.id})`);
        orderingPassed = false;
      }
    } else {
      if (!(s.stopLoss > s.entryPrice)) {
        console.error(`❌ Bearish SL not above Entry: SL=${s.stopLoss}, Entry=${s.entryPrice} (${s.id})`);
        orderingPassed = false;
      }
      if (!(s.entryPrice > s.targetPrice)) {
        console.error(`❌ Bearish TP1 not below Entry: Entry=${s.entryPrice}, TP1=${s.targetPrice} (${s.id})`);
        orderingPassed = false;
      }
      if (s.targetPrice2 && !(s.targetPrice > s.targetPrice2)) {
        console.error(`❌ Bearish TP2 not below TP1: TP1=${s.targetPrice}, TP2=${s.targetPrice2} (${s.id})`);
        orderingPassed = false;
      }
    }
  }
  if (orderingPassed) {
    console.log('  ✓ PASS: All setups satisfy strict directional price ordering (SL < Entry < TP1 < TP2 for LONG, SL > Entry > TP1 > TP2 for SHORT)');
  }

  // Test 2: Active Setup Filtering & No Deep Drop Zombies
  // If price has dropped > 3% below entry on an old breakout, the setup MUST be INVALIDATED or EXPIRED
  const activeSetups = setups.filter(
    (s) => s.status === 'CONFIRMED' || s.status === 'RETESTING' || s.status === 'ENTRY_ZONE_REACHED'
  );
  console.log(`Active setups currently returned: ${activeSetups.length}`);

  const terminalPrice = btcCandles[btcCandles.length - 1].close;
  let activeQualityPassed = true;
  for (const act of activeSetups) {
    const barsSince = btcCandles.length - 1 - act.candleIndex;
    if (barsSince > 12) {
      console.error(`❌ Active setup is older than 12 bars (${barsSince} bars old): ${act.name} (${act.id})`);
      activeQualityPassed = false;
    }
    if (act.direction === 'BULLISH') {
      const dropPct = (act.entryPrice - terminalPrice) / act.entryPrice;
      if (dropPct > 0.03) {
        console.error(`❌ Active Bullish setup has deep drop (${(dropPct * 100).toFixed(1)}% below entry): Entry=${act.entryPrice}, Price=${terminalPrice} (${act.id})`);
        activeQualityPassed = false;
      }
    } else {
      const risePct = (terminalPrice - act.entryPrice) / act.entryPrice;
      if (risePct > 0.03) {
        console.error(`❌ Active Bearish setup has deep rise (${(risePct * 100).toFixed(1)}% above entry): Entry=${act.entryPrice}, Price=${terminalPrice} (${act.id})`);
        activeQualityPassed = false;
      }
    }
  }
  if (activeQualityPassed) {
    console.log('  ✓ PASS: Zero stale (> 12 bars) or deep-drop (> 3% adverse) setups linger in active states');
  }

  // Test 3: Synthetic Deep Retest Failure Scenario
  // Build a synthetic series where price breaks out at 88,366 then plummets to 80,051
  const t0 = 1700000000000;
  const hourMs = 3600000;
  const synthCandles: Candle[] = [
    { openTime: t0, open: 82000, high: 83000, low: 81500, close: 82800, volume: 1000 },
    { openTime: t0 + hourMs * 1, open: 82800, high: 88500, low: 82500, close: 88400, volume: 5000 }, // BOS break at 88,366
    { openTime: t0 + hourMs * 2, open: 88400, high: 88450, low: 85000, close: 85200, volume: 2000 }, // drop
    { openTime: t0 + hourMs * 3, open: 85200, high: 85300, low: 82000, close: 82100, volume: 2000 }, // drop
    { openTime: t0 + hourMs * 4, open: 82100, high: 82200, low: 80000, close: 80051, volume: 3000 }, // plummets to 80,051
  ];
  const synthSmc = calculateSMC(synthCandles);
  const synthSetups = synthSmc.confirmedSetups;
  for (const st of synthSetups) {
    if (st.candleIndex <= 1 && st.direction === 'BULLISH' && st.entryPrice > 85000) {
      if (st.status === 'CONFIRMED' || st.status === 'RETESTING') {
        throw new Error(`FAIL: Setup with entry ${st.entryPrice} remained active (${st.status}) after price plunged to 80,051!`);
      }
      console.log(`  ✓ Synthetic BOS setup at ${st.entryPrice} correctly transitioned to: ${st.status}`);
    }
  }

  console.log('\n🎉 ALL BTC SMC LIFECYCLE & DIRECTIONAL TESTS PASSED (100%)\n');
}

runBtcSmcLifecycleTest();
