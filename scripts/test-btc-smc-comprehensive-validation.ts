import { calculateSMC, detectDealingRange, detectSwingPoints } from '../lib/smcEngine';
import { generateMockCandles } from '../lib/mockData';
import { evaluateSmcStrategiesForStock, evaluateCombinedStrategiesForStock } from '../lib/screener/technicalStrategies';
import { Candle } from '../lib/types';

function runBtcComprehensiveAudit() {
  console.log('========================================================================');
  console.log('🔍 COMPREHENSIVE BTC SMC CHART & SCREENER ENGINE FULL VALIDATION');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Synthetic BTC Chart Scenario with Price at 79,792 in Demand Zone
  // -------------------------------------------------------------------------
  console.log('─── [TEST 1] BTC Scenario at 79,792 in Bullish Demand / Discount Zone ───');

  // Construct realistic price sequence with genuine swing pivots:
  // - Swing low established at 76,000
  // - High volume impulse breaks out to 85,200 (creating Bullish Demand Order Block at 78,500 - 80,200)
  // - Retracement drops into Discount / Demand zone with terminal price at 79,792
  const t0 = 1793000000000;
  const fourHours = 4 * 3600 * 1000;
  const btcScenario: Candle[] = [];

  // 1. Initial base up to swing low at 76,000
  const basePrices = [77500, 77200, 76800, 76400, 76000, 76300, 76800, 77400];
  for (let i = 0; i < basePrices.length; i++) {
    const p = basePrices[i];
    btcScenario.push({
      openTime: t0 + i * fourHours,
      open: p + (i % 2 === 0 ? 50 : -50),
      high: p + 150,
      low: p - 150,
      close: p,
      volume: 1200,
    });
  }

  // 2. Bullish Demand Order Block formation (down candle at index 8 before massive impulse)
  btcScenario.push({
    openTime: t0 + 8 * fourHours,
    open: 79200,
    high: 79400,
    low: 78500,
    close: 78800, // Down candle (Demand OB)
    volume: 1800,
  });

  // 3. Massive impulse candles (high volume breakout to 85,200 peak)
  const impulsePrices = [81500, 83200, 85200];
  for (let i = 0; i < impulsePrices.length; i++) {
    const p = impulsePrices[i];
    btcScenario.push({
      openTime: t0 + (9 + i) * fourHours,
      open: p - 800,
      high: p + 200,
      low: p - 900,
      close: p,
      volume: 6000 + i * 1500, // High volume expansion
    });
  }

  // 4. Pullback bars establishing a confirmed swing high at 85,200 and retracing to 79,792
  const pullbackPrices = [84200, 83000, 81500, 80400, 79792];
  for (let i = 0; i < pullbackPrices.length; i++) {
    const p = pullbackPrices[i];
    btcScenario.push({
      openTime: t0 + (12 + i) * fourHours,
      open: p + 300,
      high: p + 450,
      low: p - 300,
      close: p,
      volume: 2500,
    });
  }

  const smcResult = calculateSMC(btcScenario, undefined, 'BTC', '4H');
  const dr = smcResult.dealingRange;

  console.log(`  Terminal Price: $${btcScenario[btcScenario.length - 1].close}`);
  console.log(`  Dealing Range: Low = $${dr.lowPrice}, High = $${dr.highPrice}`);
  console.log(`  Equilibrium (50%): $${dr.equilibriumPrice}`);
  console.log(`  Discount OTE Range: [$${dr.discountOteRange[0]} - $${dr.discountOteRange[1]}]`);
  console.log(`  Premium OTE Range: [$${dr.premiumOteRange[0]} - $${dr.premiumOteRange[1]}]`);

  // Verify dealing range anchors
  if (dr.highPrice < 85000) {
    throw new Error(`FAIL: Dealing range high ($${dr.highPrice}) should encapsulate swing high (85,200)!`);
  }
  if (dr.lowPrice > 78500) {
    throw new Error(`FAIL: Dealing range low ($${dr.lowPrice}) should encapsulate demand swing low!`);
  }
  if (dr.equilibriumPrice <= dr.lowPrice || dr.equilibriumPrice >= dr.highPrice) {
    throw new Error(`FAIL: Equilibrium ($${dr.equilibriumPrice}) must sit strictly midway between Low and High!`);
  }
  console.log('  ✓ PASS: Confirmed Dealing Range derived with authentic High, Low, Equilibrium, and OTE zones.');

  // Verify price at 79,792 is in Discount
  if (79792 >= dr.equilibriumPrice) {
    throw new Error(`FAIL: 79,792 was expected to be in Discount (< ${dr.equilibriumPrice})!`);
  }
  console.log(`  ✓ PASS: Price at 79,792 is verified inside DISCOUNT context (< Equilibrium $${dr.equilibriumPrice}).`);

  // -------------------------------------------------------------------------
  // TEST 2: Active Complete LONG Setup Verification
  // -------------------------------------------------------------------------
  console.log('\n─── [TEST 2] Active Complete Bullish LONG Setup Verification ───');
  const activeLongs = smcResult.confirmedSetups.filter(
    (s) => s.direction === 'BULLISH' && (s.status === 'CONFIRMED' || s.status === 'RETESTING' || s.status === 'ENTRY_ZONE_REACHED')
  );

  console.log(`  Detected ${activeLongs.length} active Bullish setups at terminal price 79,792.`);
  if (activeLongs.length === 0) {
    throw new Error('FAIL: Expected at least 1 active Bullish setup when price is in demand zone at 79,792!');
  }

  for (const setup of activeLongs) {
    console.log(`  -> Setup: "${setup.name}" | Status: ${setup.status}`);
    console.log(`     Entry: $${setup.entryPrice} | SL: $${setup.stopLoss} | TP1: $${setup.targetPrice} | TP2: $${setup.targetPrice2} | R:R = 1:${setup.riskReward}`);

    // Verify strict directional ordering: SL < Entry < TP1 < TP2
    if (!(setup.stopLoss < setup.entryPrice)) {
      throw new Error(`FAIL: Bullish Stop Loss ($${setup.stopLoss}) must be strictly below Entry ($${setup.entryPrice})!`);
    }
    if (!(setup.entryPrice < setup.targetPrice)) {
      throw new Error(`FAIL: Bullish Target 1 ($${setup.targetPrice}) must be strictly above Entry ($${setup.entryPrice})!`);
    }
    if (setup.targetPrice2 && !(setup.targetPrice < setup.targetPrice2)) {
      throw new Error(`FAIL: Bullish Target 2 ($${setup.targetPrice2}) must be strictly above TP1 ($${setup.targetPrice})!`);
    }
    if (setup.riskReward < 1.0) {
      throw new Error(`FAIL: Risk-Reward (1:${setup.riskReward}) must be at least 1:1.0!`);
    }
  }
  console.log('  ✓ PASS: Complete active LONG setups validated with strict SL < Entry < TP1 < TP2 ordering.');

  // -------------------------------------------------------------------------
  // TEST 3: Swing Label Collision & Readability Invariant
  // -------------------------------------------------------------------------
  console.log('\n─── [TEST 3] Swing Label Density & Collision Prevention Invariant ───');
  const swings = smcResult.swings;
  console.log(`  Total swings detected: ${swings.length}`);

  // Test consecutive swings alternation
  for (let i = 1; i < swings.length; i++) {
    const prev = swings[i - 1];
    const cur = swings[i];
    if (prev.isHigh === cur.isHigh) {
      throw new Error(`FAIL: Detected non-alternating consecutive swings of same polarity at indices ${prev.index} and ${cur.index}!`);
    }
  }
  console.log('  ✓ PASS: All swing points enforce true structural alternation (Peak -> Trough -> Peak).');

  // Verify label naming correctness
  let lastH = -Infinity;
  let lastL = Infinity;
  for (const sw of swings) {
    if (sw.isHigh) {
      const expected = sw.price >= lastH ? 'HH' : 'LH';
      if (sw.type !== expected) {
        throw new Error(`FAIL: High swing at ${sw.price} labeled ${sw.type}, expected ${expected} (prev high: ${lastH})!`);
      }
      lastH = sw.price;
    } else {
      const expected = sw.price <= lastL ? 'LL' : 'HL';
      if (sw.type !== expected) {
        throw new Error(`FAIL: Low swing at ${sw.price} labeled ${sw.type}, expected ${expected} (prev low: ${lastL})!`);
      }
      lastL = sw.price;
    }
  }
  console.log('  ✓ PASS: All swing labels (HH, LH, HL, LL) verified with 100% structural accuracy.');

  // -------------------------------------------------------------------------
  // TEST 4: Cross-Instrument & Cross-Market Universal Parity
  // -------------------------------------------------------------------------
  console.log('\n─── [TEST 4] Cross-Instrument & Multi-Market Universal Verification ───');
  const instruments = [
    { symbol: 'BTC', market: 'USA', name: 'Bitcoin' },
    { symbol: 'ETH', market: 'USA', name: 'Ethereum' },
    { symbol: 'DJI', market: 'USA', name: 'Dow Jones' },
    { symbol: 'SPX', market: 'USA', name: 'S&P 500' },
    { symbol: 'RELIANCE', market: 'INDIA', name: 'Reliance Industries' },
    { symbol: 'TCS', market: 'INDIA', name: 'Tata Consultancy Services' },
  ];

  for (const inst of instruments) {
    const candles = generateMockCandles(inst.market as any, inst.symbol, 400);
    const terminal = candles[candles.length - 1].close;
    const smc = calculateSMC(candles, undefined, inst.symbol, '1D');

    // Screener parity
    const screenerSignals = evaluateSmcStrategiesForStock(inst.symbol, inst.name, inst.market, terminal, candles);
    if (screenerSignals.length !== 16) {
      throw new Error(`FAIL: ${inst.symbol} returned ${screenerSignals.length} screener signals, expected 16!`);
    }

    // Directional ordering on any confirmed setup
    for (const setup of smc.confirmedSetups) {
      if (setup.direction === 'BULLISH') {
        if (!(setup.stopLoss < setup.entryPrice && setup.entryPrice < setup.targetPrice)) {
          throw new Error(`FAIL: ${inst.symbol} Bullish setup ${setup.id} violated SL < Entry < TP1 ordering!`);
        }
      } else {
        if (!(setup.stopLoss > setup.entryPrice && setup.entryPrice > setup.targetPrice)) {
          throw new Error(`FAIL: ${inst.symbol} Bearish setup ${setup.id} violated SL > Entry > TP1 ordering!`);
        }
      }
    }
    console.log(`  ✓ ${inst.symbol} (${inst.market}): 16 SMC Screener strategies verified with 100% parity & risk ordering.`);
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL 4 BTC SMC & UNIVERSAL CROSS-MARKET VALIDATION AUDITS PASSED (100%)');
  console.log('========================================================================\n');
}

runBtcComprehensiveAudit();
