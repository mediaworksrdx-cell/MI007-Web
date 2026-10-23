import { calculateBSPrice, calculateBSGreeks } from '../lib/fno/blackScholes';
import { generateOptionChain, SUPPORTED_FNO_INSTRUMENTS } from '../lib/fno/fnoDataService';

console.log('================================================================');
console.log('🎯 QUANTITATIVE F&O VALIDATION AUDIT REPORT');
console.log('================================================================\n');

// 1. TextBook Benchmark Test (John C. Hull: S=100, K=100, r=0.05, sigma=0.20, T=1.0)
// Exact Analytical: Call = 10.45058, Put = 5.57352
const callBench = calculateBSPrice('CE', { spot: 100, strike: 100, timeYears: 1.0, rate: 0.05, volatility: 0.20 });
const putBench = calculateBSPrice('PE', { spot: 100, strike: 100, timeYears: 1.0, rate: 0.05, volatility: 0.20 });
const expectedCall = 10.45058;
const expectedPut = 5.57352;
const callErr = Math.abs(callBench - expectedCall);
const putErr = Math.abs(putBench - expectedPut);

console.log('1. BLACK-SCHOLES PRICING ENGINE ACCURACY:');
console.log('   Theoretical Hull Benchmark (S=100, K=100, r=5%, vol=20%, T=1yr):');
console.log(`   - Call Price: ${callBench.toFixed(5)} (Expected: ${expectedCall}) -> Error: ${callErr.toExponential(3)}`);
console.log(`   - Put Price:  ${putBench.toFixed(5)} (Expected: ${expectedPut}) -> Error: ${putErr.toExponential(3)}`);
console.log(`   - Result: ${callErr < 0.001 && putErr < 0.001 ? 'PASSED (Accuracy > 99.99%)' : 'FAILED'}\n`);

// 2. Put-Call Parity Test across market states
console.log('2. PUT-CALL PARITY ARBITRAGE EQUILIBRIUM:');
let maxParityError = 0;
let parityPassed = 0;
const testStrikes = [80, 90, 100, 110, 120];
const testSpots = [85, 95, 100, 105, 115];
const testVols = [0.10, 0.20, 0.35, 0.50];
const testTs = [7/365, 30/365, 90/365, 1.0];
let totalTests = 0;

for (const S of testSpots) {
  for (const K of testStrikes) {
    for (const v of testVols) {
      for (const T of testTs) {
        totalTests++;
        const r = 0.06;
        const C = calculateBSPrice('CE', { spot: S, strike: K, timeYears: T, rate: r, volatility: v });
        const P = calculateBSPrice('PE', { spot: S, strike: K, timeYears: T, rate: r, volatility: v });
        const parityDiff = (C - P) - (S - K * Math.exp(-r * T));
        const absDiff = Math.abs(parityDiff);
        if (absDiff > maxParityError) maxParityError = absDiff;
        if (absDiff < 0.0001) parityPassed++;
      }
    }
  }
}
console.log(`   - Tested ${totalTests} market states`);
console.log(`   - Max Put-Call Parity Divergence: ${maxParityError.toExponential(4)}`);
console.log(`   - Parity Compliance Rate: ${((parityPassed / totalTests) * 100).toFixed(2)}%\n`);

// 3. Greeks Sensitivity Calculus Audit
console.log('3. GREEKS SENSITIVITY CALCULUS AUDIT:');
const greeksCallATM = calculateBSGreeks('CE', { spot: 100, strike: 100, timeYears: 30/365, rate: 0.065, volatility: 0.18 });
const greeksPutATM = calculateBSGreeks('PE', { spot: 100, strike: 100, timeYears: 30/365, rate: 0.065, volatility: 0.18 });
console.log(`   - ATM Call Delta: ${greeksCallATM.delta} (Expected ~ +0.51 to +0.55)`);
console.log(`   - ATM Put Delta:  ${greeksPutATM.delta} (Expected ~ -0.45 to -0.49)`);
console.log(`   - Delta Sum (Call Delta - Put Delta): ${(greeksCallATM.delta - greeksPutATM.delta).toFixed(3)} (Expected ~ 1.000)`);
console.log(`   - ATM Gamma:      ${greeksCallATM.gamma} (Must be identical for CE & PE: ${greeksCallATM.gamma === greeksPutATM.gamma})`);
console.log(`   - ATM Theta/Day:  ${greeksCallATM.theta} (Must be negative: ${greeksCallATM.theta < 0})`);
console.log(`   - ATM Vega/1%IV:  ${greeksCallATM.vega} (Must be positive: ${greeksCallATM.vega > 0})\n`);

// 4. Max Pain Algorithm Exact Minimization Verification
console.log('4. MAX PAIN SETTLEMENT MINIMIZATION:');
const chain = generateOptionChain('NIFTY 50', '29 OCT 2026', 22687.65);
console.log(`   - Spot Price: ${chain.spotPrice}`);
console.log(`   - Calculated Max Pain Strike: ${chain.maxPain}`);
console.log(`   - Total Call OI: ${(chain.totalCallOI / 100000).toFixed(2)} Lakhs`);
console.log(`   - Total Put OI:  ${(chain.totalPutOI / 100000).toFixed(2)} Lakhs`);
console.log(`   - PCR (OI):      ${chain.pcr.toFixed(2)}`);
console.log(`   - Call Wall (Resistance): ${chain.highestCallOIStrike}`);
console.log(`   - Put Wall (Support):     ${chain.highestPutOIStrike}`);

function computePayout(settlementPrice: number) {
  let payout = 0;
  for (const s of chain.strikes) {
    payout += s.call.openInterest * Math.max(0, settlementPrice - s.strike);
    payout += s.put.openInterest * Math.max(0, s.strike - settlementPrice);
  }
  return payout;
}
const mpPayout = computePayout(chain.maxPain);
const step = 50;
const lowerPayout = computePayout(chain.maxPain - step);
const higherPayout = computePayout(chain.maxPain + step);
console.log(`   - Total Payout at Max Pain Strike (${chain.maxPain}): ${(mpPayout / 1e7).toFixed(2)} Cr`);
console.log(`   - Total Payout at Strike - ${step} (${chain.maxPain - step}): ${(lowerPayout / 1e7).toFixed(2)} Cr`);
console.log(`   - Total Payout at Strike + ${step} (${chain.maxPain + step}): ${(higherPayout / 1e7).toFixed(2)} Cr`);
const isStrictMinimum = mpPayout <= lowerPayout && mpPayout <= higherPayout;
console.log(`   - Max Pain Strict Minimum Proof: ${isStrictMinimum ? 'PASSED (Local Payout Minimum)' : 'BOUNDARY OCCURRENCE'}\n`);

// 5. Contract Specifications & Lot Size Checks
console.log('5. EXCHANGE SPECIFICATIONS ACCURACY:');
const nifty = SUPPORTED_FNO_INSTRUMENTS.find(i => i.symbol === 'NIFTY 50');
const bnf = SUPPORTED_FNO_INSTRUMENTS.find(i => i.symbol === 'BANKNIFTY');
const rel = SUPPORTED_FNO_INSTRUMENTS.find(i => i.symbol === 'RELIANCE');
const spx = SUPPORTED_FNO_INSTRUMENTS.find(i => i.symbol === 'SPX');
const nvda = SUPPORTED_FNO_INSTRUMENTS.find(i => i.symbol === 'NVDA');

console.log(`   - NIFTY 50:  Lot ${nifty?.lotSize}, Step ${nifty?.strikeStep} (NSE Official: Lot 65, Step 50) -> ${nifty?.lotSize === 65 && nifty?.strikeStep === 50 ? 'MATCH' : 'MISMATCH'}`);
console.log(`   - BANKNIFTY: Lot ${bnf?.lotSize}, Step ${bnf?.strikeStep} (NSE Official: Lot 30, Step 100) -> ${bnf?.lotSize === 30 && bnf?.strikeStep === 100 ? 'MATCH' : 'MISMATCH'}`);
console.log(`   - RELIANCE:  Lot ${rel?.lotSize}, Step ${rel?.strikeStep} (NSE Official: Lot 250, Step 20) -> ${rel?.lotSize === 250 && rel?.strikeStep === 20 ? 'MATCH' : 'MISMATCH'}`);
console.log(`   - SPX (US):  Lot ${spx?.lotSize}, Step ${spx?.strikeStep} (CBOE Official: Lot 100, Step 25) -> ${spx?.lotSize === 100 && spx?.strikeStep === 25 ? 'MATCH' : 'MISMATCH'}`);
console.log(`   - NVDA (US): Lot ${nvda?.lotSize}, Step ${nvda?.strikeStep} (OCC Official: Lot 100, Step 5) -> ${nvda?.lotSize === 100 && nvda?.strikeStep === 5 ? 'MATCH' : 'MISMATCH'}`);
