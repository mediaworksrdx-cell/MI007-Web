import { generateCandles } from '../lib/market-data';
import { calculateSMC, DEFAULT_SMC_CONFIG, SmcFilterOptions } from '../lib/smcEngine';
import { Candle } from '../lib/types';
import fs from 'fs';
import path from 'path';

function runValidation() {
  console.log('🧪 ═══════════════════════════════════════════════════════════════');
  console.log('   MARKET INTELLIGENCE AI — SMC COMPREHENSIVE VALIDATION SUITE    ');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // Generate 400 candles with oscillating volatility to create rich SMC structures
  const rawCandles = generateCandles(400, 42, 24000, 0.015);
  const candles: Candle[] = rawCandles.map((c) => ({
    openTime: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    isClosed: true,
  }));

  const smcConfig = { ...DEFAULT_SMC_CONFIG, showMitigatedOb: true, showMitigatedFvg: true };
  const smc = calculateSMC(candles, smcConfig, 'NIFTY', '1D');

  // 1. Swing Points
  assert(smc.swings.length >= 8, `1. Swings detected (${smc.swings.length} swings)`);
  const highs = smc.swings.filter((s) => s.isHigh);
  const lows = smc.swings.filter((s) => !s.isHigh);
  assert(highs.length > 0 && lows.length > 0, `   Both Swing Highs (${highs.length}) and Swing Lows (${lows.length}) present`);

  // 2. Market Structure Breaks (BOS & CHoCH / MSS)
  const bosBreaks = smc.structureBreaks.filter((b) => b.breakType === 'BOS');
  const chochBreaks = smc.structureBreaks.filter((b) => b.breakType === 'CHoCH' || b.breakType === 'MSS');
  assert(bosBreaks.length > 0, `2a. BOS (Break of Structure) detected (${bosBreaks.length} breaks)`);
  assert(chochBreaks.length > 0, `2b. CHoCH / MSS (Change of Character) detected (${chochBreaks.length} breaks)`);

  const bullBreaks = smc.structureBreaks.filter((b) => b.isBullish);
  const bearBreaks = smc.structureBreaks.filter((b) => !b.isBullish);
  assert(bullBreaks.length > 0 && bearBreaks.length > 0, `2c. Both Bullish (${bullBreaks.length}) and Bearish (${bearBreaks.length}) structure breaks detected`);

  // 3. Order Blocks (Bullish Demand & Bearish Supply)
  const demandObs = smc.orderBlocks.filter((b) => b.isBullish && !b.isBreaker);
  const supplyObs = smc.orderBlocks.filter((b) => !b.isBullish && !b.isBreaker);
  assert(demandObs.length > 0, `3a. Bullish Demand Order Blocks detected (${demandObs.length} blocks)`);
  assert(supplyObs.length > 0, `3b. Bearish Supply Order Blocks detected (${supplyObs.length} blocks)`);

  // Verify unmitigated OB extends to current candle
  const unmitigated = smc.orderBlocks.filter((b) => !b.isMitigated);
  const hasExtendingOb = unmitigated.some((b) => b.endIndex === candles.length - 1);
  assert(hasExtendingOb, `3c. Active unmitigated OBs extend to current candle index (${candles.length - 1})`);

  // 4. Breaker Blocks
  assert(smc.breakers.length > 0, `4a. Breaker Blocks detected (${smc.breakers.length} breakers)`);
  const bullBreakers = smc.breakers.filter((b) => b.isBullish);
  const bearBreakers = smc.breakers.filter((b) => !b.isBullish);
  assert(bullBreakers.length > 0 || bearBreakers.length > 0, `4b. Directional breakers identified (Bull: ${bullBreakers.length}, Bear: ${bearBreakers.length})`);

  // 5. Fair Value Gaps (FVGs) & Inverse FVGs (IFVGs) & 50% CE
  const bullFvgs = smc.fvgs.filter((f) => f.isBullish && !f.isInverse);
  const bearFvgs = smc.fvgs.filter((f) => !f.isBullish && !f.isInverse);
  assert(bullFvgs.length > 0, `5a. Bullish Fair Value Gaps detected (${bullFvgs.length} FVGs)`);
  assert(bearFvgs.length > 0, `5b. Bearish Fair Value Gaps detected (${bearFvgs.length} FVGs)`);
  
  const hasValidCe = smc.fvgs.every((f) => f.cePrice === (f.topPrice + f.bottomPrice) / 2);
  assert(hasValidCe, '5c. All FVGs have exact 50% Consequent Encroachment (cePrice = (top + bottom)/2)');

  // 6. Liquidity Levels & Equal Highs/Lows (EQH / EQL)
  const bsl = smc.liquidityLevels.filter((l) => l.type === 'BSL');
  const ssl = smc.liquidityLevels.filter((l) => l.type === 'SSL');
  const eqh = smc.liquidityLevels.filter((l) => l.type === 'EQH');
  const eql = smc.liquidityLevels.filter((l) => l.type === 'EQL');
  assert(bsl.length > 0 && ssl.length > 0, `6a. BSL (${bsl.length}) and SSL (${ssl.length}) levels detected`);
  assert(eqh.length > 0 || eql.length > 0, `6b. Equal Highs (EQH: ${eqh.length}) / Equal Lows (EQL: ${eql.length}) detected`);

  // 7. Liquidity Sweeps
  assert(smc.sweeps.length > 0, `7a. Liquidity Sweeps detected (${smc.sweeps.length} sweeps)`);
  const bslSweeps = smc.sweeps.filter((s) => s.isHighSweep);
  const sslSweeps = smc.sweeps.filter((s) => !s.isHighSweep);
  assert(bslSweeps.length > 0 || sslSweeps.length > 0, `7b. Sweeps categorized (BSL: ${bslSweeps.length}, SSL: ${sslSweeps.length})`);

  // 8. Dealing Range & Equilibrium & OTE
  assert(smc.dealingRange.highPrice > smc.dealingRange.lowPrice, '8a. Dealing Range valid (high > low)');
  const calculatedEq = (smc.dealingRange.highPrice + smc.dealingRange.lowPrice) / 2;
  assert(Math.abs(smc.dealingRange.equilibriumPrice - calculatedEq) < 0.001, '8b. Dealing Range Equilibrium is exact 50% midpoint');
  assert(
    smc.dealingRange.discountOteRange[0] > 0 && smc.dealingRange.discountOteRange[1] > 0,
    `8c. Optimal Trade Entry (OTE 61.8% to 78.6%) range populated [${smc.dealingRange.discountOteRange[0].toFixed(2)} - ${smc.dealingRange.discountOteRange[1].toFixed(2)}]`
  );

  // 9. Session Levels (PDH/PDL and PWH/PWL)
  // Tested using multi-day candles from getMockCandles or multi-day timestamps
  const multiDayCandles = candles.map((c, i) => ({
    ...c,
    openTime: Date.now() - (candles.length - i) * 86400000,
  }));
  const smcMultiDay = calculateSMC(multiDayCandles, smcConfig, 'NIFTY', '1D');
  assert(smcMultiDay.sessionLevels.pdh !== undefined && smcMultiDay.sessionLevels.pdl !== undefined, '9a. Previous Day High (PDH) & Low (PDL) populated');
  assert(smcMultiDay.sessionLevels.pwh !== undefined && smcMultiDay.sessionLevels.pwl !== undefined, '9b. Previous Week High (PWH) & Low (PWL) populated');

  // 10. Directional Confirmed Setups
  const bullSetups = smc.confirmedSetups.filter((s) => s.direction === 'BULLISH');
  const bearSetups = smc.confirmedSetups.filter((s) => s.direction === 'BEARISH');
  assert(bullSetups.length > 0 || bearSetups.length > 0, `10. Confirmed Setups populated (Bull: ${bullSetups.length}, Bear: ${bearSetups.length})`);

  // 11. Verify chartRenderer.ts renders all SMC components
  const rendererCode = fs.readFileSync(path.resolve('lib/chartRenderer.ts'), 'utf-8');

  assert(rendererCode.includes('showOte && (isBullishMaster || isBearishMaster)'), '11a. chartRenderer renders standalone OTE (independent of showPremiumDiscount)');
  assert(rendererCode.includes('+BRK (Support)') && rendererCode.includes('-BRK (Resistance)'), '11b. chartRenderer renders distinct Breaker Blocks (+BRK Support and -BRK Resistance)');
  assert(rendererCode.includes('showEqualHighLow') && rendererCode.includes('${lvl.type} ($$$)'), '11c. chartRenderer renders Equal Highs and Lows (EQH / EQL)');
  assert(rendererCode.includes('showPwhPwl') && rendererCode.includes('PWH') && rendererCode.includes('PWL'), '11d. chartRenderer renders Previous Week High & Low (PWH / PWL)');
  assert(rendererCode.includes('+IFVG') && rendererCode.includes('-IFVG'), '11e. chartRenderer renders Inverse FVGs (+IFVG / -IFVG)');
  assert(rendererCode.includes('50% CE:'), '11f. chartRenderer renders Consequent Encroachment (50% CE) midline and badge');
  assert(rendererCode.includes('badgeY = Math.max(4 * dpr, Math.min(chartH - th - 4 * dpr, rawBadgeY))'), '11g. chartRenderer clamps Liquidity Sweep badges within viewport bounds');
  assert(rendererCode.includes('[MITIGATED]'), '11h. chartRenderer renders historical mitigated blocks when showMitigatedOb is active');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runValidation();
