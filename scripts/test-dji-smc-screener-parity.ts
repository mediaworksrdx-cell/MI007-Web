import { calculateSMC, detectDealingRange } from '../lib/smcEngine';
import { generateMockCandles } from '../lib/mockData';
import { evaluateSmcStrategiesForStock, evaluateCombinedStrategiesForStock } from '../lib/screener/technicalStrategies';
import { Candle } from '../lib/types';

function runDjiScreenerParityTest() {
  console.log('============================================================');
  console.log('🧪 VERIFYING DJI 1H SMC ENGINE, ACTIVE RANGE & SCREENER PARITY');
  console.log('============================================================\n');

  // 1. Generate DJI 1H candles
  const dji1HCandles = generateMockCandles('USA', 'DJI', 800, 3600000);
  const terminalPrice = dji1HCandles[dji1HCandles.length - 1].close;
  console.log(`Loaded ${dji1HCandles.length} DJI 1H candles. Terminal price: ${terminalPrice}`);

  // Test 1: Dynamic Active Dealing Range Expansion
  const smc = calculateSMC(dji1HCandles, undefined, 'DJI', '1h');
  const dr = smc.dealingRange;
  console.log(`Active Dealing Range: [Low: ${dr.lowPrice}, High: ${dr.highPrice}], Equilibrium: ${dr.equilibriumPrice}`);

  if (terminalPrice > dr.highPrice) {
    throw new Error(`FAIL: Dealing range high (${dr.highPrice}) is stale; terminal price (${terminalPrice}) is above it!`);
  }
  if (terminalPrice < dr.lowPrice) {
    throw new Error(`FAIL: Dealing range low (${dr.lowPrice}) is stale; terminal price (${terminalPrice}) is below it!`);
  }
  console.log('  ✓ PASS: Dealing range dynamically encapsulates active market expansion (never stale)');

  // Verify Active Context Classification (Premium vs Discount)
  const isAboveEq = terminalPrice >= dr.equilibriumPrice;
  console.log(`  ✓ Current price ${terminalPrice} is ${isAboveEq ? 'ABOVE' : 'BELOW'} Equilibrium (${dr.equilibriumPrice}) -> Active Context: ${isAboveEq ? 'PREMIUM (Sell Zone)' : 'DISCOUNT (Buy Zone)'}`);

  // Test 2: Mitigated FVG Safety Check
  const mitigatedFvgs = smc.fvgs.filter((f) => f.isMitigated || f.isInvalidated);
  console.log(`Detected ${smc.fvgs.length} total FVGs (${mitigatedFvgs.length} mitigated/invalidated).`);
  for (const st of smc.confirmedSetups) {
    if (st.setupType === 'FVG_TAP') {
      const parentFvg = smc.fvgs.find((f) => st.id.includes(f.id));
      if (parentFvg && (parentFvg.isMitigated || parentFvg.isInvalidated)) {
        throw new Error(`FAIL: Setup ${st.id} was generated from a mitigated or invalidated FVG!`);
      }
    }
  }
  console.log('  ✓ PASS: Zero fresh entry setups generated from mitigated or invalidated FVGs');

  // Test 3: Active Setup Directional Price Ordering
  const activeSetups = smc.confirmedSetups.filter(
    (s) => s.status === 'CONFIRMED' || s.status === 'RETESTING' || s.status === 'ENTRY_ZONE_REACHED'
  );
  console.log(`Active setups available for chart bracket: ${activeSetups.length}`);
  for (const s of activeSetups) {
    if (s.direction === 'BULLISH') {
      if (!(s.stopLoss < s.entryPrice && s.entryPrice < s.targetPrice && (!s.targetPrice2 || s.targetPrice < s.targetPrice2))) {
        throw new Error(`FAIL: Bullish setup ${s.id} violates SL < Entry < TP1 < TP2 ordering!`);
      }
    } else {
      if (!(s.stopLoss > s.entryPrice && s.entryPrice > s.targetPrice && (!s.targetPrice2 || s.targetPrice > s.targetPrice2))) {
        throw new Error(`FAIL: Bearish setup ${s.id} violates SL > Entry > TP1 > TP2 ordering!`);
      }
    }
  }
  console.log('  ✓ PASS: All active setups guarantee strict mathematical directional ordering (SL < Entry < TP1 < TP2 for Long, SL > Entry > TP1 > TP2 for Short)');

  // Test 4: DJI Screener Parity & Currency Verification
  console.log('\n--- Evaluating DJI Screener Synchronization ---');
  const screenerResults = evaluateSmcStrategiesForStock('DJI', 'Dow Jones Industrial Average', 'USA', terminalPrice, dji1HCandles);
  console.log(`Evaluated ${screenerResults.length} SMC screener strategies for DJI.`);

  for (const res of screenerResults) {
    // Currency symbol must be '$' for USA (never hardcoded '₹')
    const entryMetric = String(res.keyMetrics['Entry Level'] || '');
    if (entryMetric && !entryMetric.startsWith('$')) {
      throw new Error(`FAIL: Screener metric for DJI USA uses incorrect currency symbol: "${entryMetric}" (expected $)`);
    }
    const eqMetric = String(res.keyMetrics['Equilibrium (50%)'] || '');
    if (eqMetric && !eqMetric.startsWith('$')) {
      throw new Error(`FAIL: Equilibrium metric for DJI USA uses incorrect currency symbol: "${eqMetric}" (expected $)`);
    }

    // If signal triggered, verify exact match with SMC engine setup
    if (res.signalTriggered) {
      const match = smc.allSetups.find((s) => s.name === res.strategyName && Math.abs(s.entryPrice - res.triggerPrice) < 0.01);
      if (!match) {
        throw new Error(`FAIL: Triggered screener signal ${res.strategyName} at ${res.triggerPrice} not found in authoritative SMC engine setups!`);
      }
      console.log(`  ✓ Screener strategy "${res.strategyName}" perfectly synchronizes with Chart Setup (Entry: $${res.triggerPrice}, Direction: ${res.direction})`);
    }
  }
  console.log('  ✓ PASS: DJI screener currency formatting ($) and values perfectly match chart SMC engine');

  // Test 5: 26 Combined Strategies Evaluation
  const combined = evaluateCombinedStrategiesForStock('DJI', 'Dow Jones Industrial Average', 'USA', terminalPrice, dji1HCandles);
  if (combined.length !== 26) {
    throw new Error(`FAIL: Expected 26 combined strategies, got ${combined.length}`);
  }
  console.log(`  ✓ PASS: All 26 quantitative strategies evaluated cleanly (10 classic + 16 SMC).`);

  console.log('\n============================================================');
  console.log('🎉 ALL DJI 1H SMC & SCREENER PARITY AUDITS PASSED (100%)');
  console.log('============================================================\n');
}

runDjiScreenerParityTest();
