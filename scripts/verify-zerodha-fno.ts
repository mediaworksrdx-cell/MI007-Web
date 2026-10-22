import {
  findFnoInstrument,
  searchFnoInstruments,
  generateOptionChain,
  getFuturesTermStructure,
} from '../lib/fno/fnoDataService';

console.log('======================================================');
console.log('VERIFYING ZERODHA KITE INTEGRATION IN F&O HUB');
console.log('======================================================');

// 1. Resolve curated heavyweight
const reliance = findFnoInstrument('RELIANCE');
console.log('1. Curated Instrument RELIANCE:', {
  symbol: reliance.symbol,
  spot: reliance.spotPrice,
  market: reliance.market,
  lotSize: reliance.lotSize,
});
if (reliance.symbol !== 'RELIANCE') throw new Error('Failed to resolve RELIANCE');

// 2. Resolve stock from Zerodha Catalog (not in curated list)
const suzlon = findFnoInstrument('SUZLON');
console.log('2. Zerodha Stock SUZLON:', {
  symbol: suzlon.symbol,
  name: suzlon.name,
  spot: suzlon.spotPrice,
  strikeStep: suzlon.strikeStep,
  lotSize: suzlon.lotSize,
  market: suzlon.market,
  isZerodha: suzlon.isZerodha,
});
if (suzlon.symbol !== 'SUZLON' || suzlon.spotPrice !== 65.8) {
  throw new Error('Failed to resolve SUZLON from Zerodha catalog');
}

// 3. Resolve long-tail stock from Zerodha catalog
const zItem = findFnoInstrument('CENTENKA');
console.log('3. Long-tail Zerodha Stock CENTENKA:', {
  symbol: zItem.symbol,
  name: zItem.name,
  spot: zItem.spotPrice,
  lotSize: zItem.lotSize,
  strikeStep: zItem.strikeStep,
});
if (zItem.symbol !== 'CENTENKA' || zItem.spotPrice <= 0) {
  throw new Error('Failed to resolve CENTENKA');
}

// 4. Generate Option Chain for Zerodha stock
const suzlonChain = generateOptionChain('SUZLON');
console.log('4. Option Chain for SUZLON:', {
  strikesCount: suzlonChain.strikes.length,
  atmStrike: suzlonChain.strikes.find((s) => s.isATM)?.strike,
  maxPain: suzlonChain.maxPain,
  pcr: suzlonChain.pcr,
  totalCallOI: suzlonChain.totalCallOI,
  totalPutOI: suzlonChain.totalPutOI,
});
if (!suzlonChain.strikes.length || isNaN(suzlonChain.maxPain) || isNaN(suzlonChain.pcr)) {
  throw new Error('Option Chain computation failed for SUZLON');
}

// 5. Generate Futures Term Structure for Zerodha stock
const term = getFuturesTermStructure('SUZLON');
console.log('5. Term Structure for SUZLON:', {
  underlying: term.underlyingSymbol,
  contractsCount: term.contracts.length,
  nearExpiry: term.contracts[0]?.expiry,
  nearLtp: term.contracts[0]?.ltp,
});
if (term.contracts.length !== 3 || term.contracts[0].ltp <= 0) {
  throw new Error('Futures Term Structure failed for SUZLON');
}

// 6. Search across Zerodha Universe (India)
const indiaResults = searchFnoInstruments('PAYTM', 'INDIA', 10);
console.log('6. India Search PAYTM:', indiaResults.map((r) => `${r.symbol} (₹${r.spotPrice})`));
if (!indiaResults.some((r) => r.symbol === 'PAYTM')) {
  throw new Error('PAYTM not found in India search');
}

// 7. Verify Market Isolation (No Indian stocks in USA or UAE)
const usaSuzlon = searchFnoInstruments('SUZLON', 'USA', 10);
console.log('7. USA Search SUZLON (should be 0):', usaSuzlon.length);
if (usaSuzlon.length !== 0) {
  throw new Error('Indian stock leaked into USA market search!');
}

const uaePaytm = searchFnoInstruments('PAYTM', 'UAE', 10);
console.log('8. UAE Search PAYTM (should be 0):', uaePaytm.length);
if (uaePaytm.length !== 0) {
  throw new Error('Indian stock leaked into UAE market search!');
}

// 8. Verify USA Instruments
const nvda = findFnoInstrument('NVDA');
console.log('9. USA Instrument NVDA:', {
  symbol: nvda.symbol,
  market: nvda.market,
  spot: nvda.spotPrice,
});
if (nvda.symbol !== 'NVDA' || nvda.market !== 'USA') {
  throw new Error('NVDA resolution failed');
}

console.log('======================================================');
console.log('ALL 9 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
console.log('======================================================');
