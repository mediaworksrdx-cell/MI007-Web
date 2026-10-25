// ═══════════════════════════════════════════════════════════════════════════
// MI-007 — SMART MONEY CONCEPTS (SMC) ENGINE VERIFICATION TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════
// Validates pure mathematical correctness, mitigation rules, dealing ranges,
// structure shifts, liquidity sweeps, and scanner setup generation.
// ═══════════════════════════════════════════════════════════════════════════

import {
  calculateSMC,
  detectSwingPoints,
  detectStructureBreaks,
  detectLiquidity,
  detectOrderBlocksAndBreakers,
  detectFairValueGaps,
  detectDealingRange,
  detectSessionLevels,
  DEFAULT_SMC_CONFIG,
} from '../lib/smcEngine';
import { Candle } from '../lib/types';

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
  return { openTime, open, high, low, close, volume };
}

console.log('\n============================================================');
console.log('🧪 RUNNING MI-007 INSTITUTIONAL SMC ENGINE VERIFICATION SUITE');
console.log('============================================================\n');

// ── Test 1: Configuration & Default Integrity ──
console.log('--- Test 1: Configuration & Default Integrity ---');
assert(DEFAULT_SMC_CONFIG.enabled === true, 'SMC master toggle defaults to enabled');
assert(DEFAULT_SMC_CONFIG.showBos === true, 'showBos default is true');
assert(DEFAULT_SMC_CONFIG.showChoch === true, 'showChoch default is true');
assert(DEFAULT_SMC_CONFIG.showSwings === true, 'showSwings default is true');
assert(DEFAULT_SMC_CONFIG.showSweeps === true, 'showSweeps default is true');
assert(DEFAULT_SMC_CONFIG.showBullishOb === true, 'showBullishOb default is true');
assert(DEFAULT_SMC_CONFIG.showBearishOb === true, 'showBearishOb default is true');
assert(DEFAULT_SMC_CONFIG.showBreakers === true, 'showBreakers default is true');
assert(DEFAULT_SMC_CONFIG.showBullishFvg === true, 'showBullishFvg default is true');
assert(DEFAULT_SMC_CONFIG.showFvgMidpoint === true, 'showFvgMidpoint (50% CE) default is true');
assert(DEFAULT_SMC_CONFIG.showPremiumDiscount === true, 'showPremiumDiscount default is true');
assert(DEFAULT_SMC_CONFIG.showEquilibrium === true, 'showEquilibrium (50% EQ) default is true');

// ── Test 2: Swing Highs and Swing Lows (HH, HL, LH, LL) ──
console.log('\n--- Test 2: Swing Points (HH, HL, LH, LL) Detection ---');
{
  const t0 = 1700000000000;
  const minute = 60000;
  const candles: Candle[] = [
    makeCandle(t0, 100, 102, 98, 101),
    makeCandle(t0 + minute, 101, 104, 100, 103),
    makeCandle(t0 + minute * 2, 103, 106, 102, 105),
    makeCandle(t0 + minute * 3, 105, 115, 104, 114), // Swing High 1 (115)
    makeCandle(t0 + minute * 4, 114, 112, 108, 109),
    makeCandle(t0 + minute * 5, 109, 110, 105, 106),
    makeCandle(t0 + minute * 6, 106, 108, 95, 96),   // Swing Low 1 (95)
    makeCandle(t0 + minute * 7, 96, 102, 96, 101),
    makeCandle(t0 + minute * 8, 101, 107, 100, 106),
    makeCandle(t0 + minute * 9, 106, 122, 105, 120), // Swing High 2 (122 > 115 => HH)
    makeCandle(t0 + minute * 10, 120, 118, 112, 114),
    makeCandle(t0 + minute * 11, 114, 115, 108, 110),
    makeCandle(t0 + minute * 12, 110, 111, 100, 102), // Swing Low 2 (100 > 95 => HL)
    makeCandle(t0 + minute * 13, 102, 108, 102, 107),
    makeCandle(t0 + minute * 14, 107, 112, 106, 111),
    makeCandle(t0 + minute * 15, 111, 114, 110, 113),
  ];

  const swings = detectSwingPoints(candles, 3);
  assert(swings.length >= 3, `Detected ${swings.length} confirmed swing points`);
  const highs = swings.filter((s) => s.isHigh);
  const lows = swings.filter((s) => !s.isHigh);
  assert(highs.some((h) => h.price === 115), 'Identified Swing High 1 at 115');
  assert(lows.some((l) => l.price === 95), 'Identified Swing Low 1 at 95');
  assert(highs.some((h) => h.price === 122 && h.type === 'HH'), 'Identified Higher High (HH) at 122');
  assert(lows.some((l) => l.price === 100 && l.type === 'HL'), 'Identified Higher Low (HL) at 100');
}

// ── Test 3: Fair Value Gap (FVG) and 50% Consequent Encroachment (CE) ──
console.log('\n--- Test 3: Fair Value Gap (FVG) & 50% CE Midline ---');
{
  const t0 = 1700000000000;
  const minute = 60000;
  const candles: Candle[] = [
    makeCandle(t0, 100, 105, 98, 104),              // C1: High = 105
    makeCandle(t0 + minute, 104, 120, 103, 119),     // C2: Impulse displacement bar
    makeCandle(t0 + minute * 2, 119, 130, 112, 128), // C3: Low = 112
    makeCandle(t0 + minute * 3, 128, 129, 118, 122), // C4: Stays above FVG
    makeCandle(t0 + minute * 4, 122, 124, 108, 115), // C5: Low = 108 taps into FVG (CE = (105+112)/2 = 108.5)
    makeCandle(t0 + minute * 5, 115, 118, 104, 110), // C6: Low = 104 fills below 105 => full mitigation
  ];

  const fvgs = detectFairValueGaps(candles);
  assert(fvgs.length === 1, `Detected exactly 1 Bullish FVG (found: ${fvgs.length})`);
  const fvg = fvgs[0];
  assert(fvg.isBullish === true, 'FVG is classified as Bullish (+FVG)');
  assert(fvg.bottomPrice === 105, `FVG bottom boundary is C1 High (105, got: ${fvg.bottomPrice})`);
  assert(fvg.topPrice === 112, `FVG top boundary is C3 Low (112, got: ${fvg.topPrice})`);
  assert(fvg.cePrice === 108.5, `FVG Consequent Encroachment (50% CE) is 108.5 (got: ${fvg.cePrice})`);
  assert(fvg.isMitigated === true, 'FVG correctly transitioned to mitigated when price reached bottom boundary');
  assert(fvg.mitigationIndex === 5, `FVG mitigation index is C6 index 5 (got: ${fvg.mitigationIndex})`);
}

// ── Test 4: Order Blocks (Demand / Supply) & Breaker Transition ──
console.log('\n--- Test 4: Order Blocks (OB) & Breaker Blocks ---');
{
  const t0 = 1700000000000;
  const minute = 60000;
  const candles: Candle[] = [
    makeCandle(t0, 100, 101, 99, 100, 500000),
    makeCandle(t0 + minute, 100, 101, 98, 99, 500000),
    makeCandle(t0 + minute * 2, 99, 100, 96, 97, 600000),     // C2: Bearish candle (OB candidate) High=100, Low=96
    makeCandle(t0 + minute * 3, 97, 110, 97, 109, 2500000),   // C3: Massive impulse (2.5M vol > 1.15x MA), breaks 100 high
    makeCandle(t0 + minute * 4, 109, 112, 106, 111, 800000),
    makeCandle(t0 + minute * 5, 111, 113, 98, 105, 900000),   // C5: Low=98 taps into OB [96, 100] (Mitigation)
  ];

  const { orderBlocks } = detectOrderBlocksAndBreakers(candles, []);
  assert(orderBlocks.length >= 1, `Detected ${orderBlocks.length} order blocks`);
  const bullOb = orderBlocks.find((ob) => ob.isBullish);
  assert(bullOb !== undefined, 'Detected Bullish Demand Order Block');
  assert(bullOb!.topPrice === 100, `Bullish OB top boundary matches candle high (100, got: ${bullOb?.topPrice})`);
  assert(bullOb!.bottomPrice === 96, `Bullish OB bottom boundary matches candle low (96, got: ${bullOb?.bottomPrice})`);
  assert(bullOb!.isMitigated === true, 'Order block correctly marked as mitigated after tap');

  // Test Breaker Block conversion (violated demand becomes bearish breaker)
  const violatedCandles: Candle[] = [
    ...candles.slice(0, 5),
    makeCandle(t0 + minute * 5, 109, 110, 94, 94, 1200000), // Closes at 94 < 96 (violates OB bottom)
  ];
  const { breakers } = detectOrderBlocksAndBreakers(violatedCandles, []);
  assert(breakers.length >= 1, `Detected ${breakers.length} breaker blocks`);
  assert(breakers[0].isBreaker === true, 'Violated OB converted to Breaker Block');
}

// ── Test 5: Liquidity Pools & Sweeps (BSL / SSL / EQH / EQL) ──
console.log('\n--- Test 5: Liquidity Pools & Sweeps ---');
{
  const t0 = 1700000000000;
  const minute = 60000;
  const candles: Candle[] = [
    makeCandle(t0, 100, 110, 99, 105),
    makeCandle(t0 + minute, 105, 118, 104, 115),
    makeCandle(t0 + minute * 2, 115, 125, 114, 120),
    makeCandle(t0 + minute * 3, 120, 130, 119, 122), // Pivot High at 130
    makeCandle(t0 + minute * 4, 122, 126, 118, 120),
    makeCandle(t0 + minute * 5, 120, 122, 110, 112),
    makeCandle(t0 + minute * 6, 112, 115, 105, 108),
    makeCandle(t0 + minute * 7, 108, 120, 108, 118),
    makeCandle(t0 + minute * 8, 118, 128, 116, 124),
    makeCandle(t0 + minute * 9, 124, 134, 122, 128), // Wick up to 134 (> 130), but close is 128 (< 130) -> BSL Sweep!
  ];

  const swings = detectSwingPoints(candles, 3);
  const { levels, sweeps } = detectLiquidity(candles, swings);

  assert(levels.some((l) => l.type === 'BSL'), 'Buy-Side Liquidity (BSL) level registered');
  assert(sweeps.length >= 1, `Detected ${sweeps.length} liquidity sweeps`);
  const bslSweep = sweeps.find((s) => s.isHighSweep);
  assert(bslSweep !== undefined, 'Confirmed BSL Liquidity Sweep above 130 level');
  assert(bslSweep!.price === 134, `BSL sweep price recorded at wick peak (134, got: ${bslSweep?.price})`);
}

// ── Test 6: Premium & Discount Dealing Range ──
console.log('\n--- Test 6: Dealing Range, Equilibrium & OTE ---');
{
  const t0 = 1700000000000;
  const candles: Candle[] = [
    makeCandle(t0, 100, 200, 100, 150),
    makeCandle(t0 + 60000, 150, 180, 120, 160),
  ];
  const dr = detectDealingRange(candles, []);
  assert(dr.highPrice === 200, `Dealing range high is 200 (got: ${dr.highPrice})`);
  assert(dr.lowPrice === 100, `Dealing range low is 100 (got: ${dr.lowPrice})`);
  assert(dr.equilibriumPrice === 150, `Equilibrium (50% EQ) is 150 (got: ${dr.equilibriumPrice})`);
  assert(dr.premiumRange[0] === 150 && dr.premiumRange[1] === 200, 'Premium range is [150, 200]');
  assert(dr.discountRange[0] === 100 && dr.discountRange[1] === 150, 'Discount range is [100, 150]');
  assert(dr.oteRange[0] === 161.8 && dr.oteRange[1] === 178.6, `OTE range is [161.8, 178.6] (got: [${dr.oteRange[0]}, ${dr.oteRange[1]}])`);
}

// ── Test 7: Master calculateSMC Pipeline & Scanner Setup Generation ──
console.log('\n--- Test 7: Master calculateSMC Output & Scanner Setups ---');
{
  const t0 = 1700000000000;
  const minute = 60000;
  const candles: Candle[] = [];
  let price = 100;
  for (let i = 0; i < 60; i++) {
    const high = price + 2 + (i % 3);
    const low = price - 2 - (i % 2);
    const close = i % 2 === 0 ? price + 1.5 : price - 1.2;
    candles.push(makeCandle(t0 + i * minute, price, high, low, close, 1000000 + i * 20000));
    price = close;
  }

  const analysis = calculateSMC(candles);
  assert(Array.isArray(analysis.swings), 'Swings array returned');
  assert(Array.isArray(analysis.structureBreaks), 'Structure breaks array returned');
  assert(Array.isArray(analysis.liquidityLevels), 'Liquidity levels array returned');
  assert(Array.isArray(analysis.sweeps), 'Sweeps array returned');
  assert(Array.isArray(analysis.orderBlocks), 'Order blocks array returned');
  assert(Array.isArray(analysis.fvgs), 'Fair value gaps array returned');
  assert(analysis.dealingRange.equilibriumPrice > 0, 'Equilibrium price is valid positive number');
  assert(Array.isArray(analysis.confirmedSetups), 'Confirmed setups array returned for scanner consumption');
}

console.log('\n============================================================');
console.log('🎉 ALL MI-007 INSTITUTIONAL SMC ENGINE TESTS PASSED (100%)');
console.log('============================================================\n');
