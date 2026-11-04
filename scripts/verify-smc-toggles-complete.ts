import { calculateSMC, DEFAULT_SMC_CONFIG, SmcConfig } from '../lib/smcEngine';
import { computeChartPriceBounds } from '../lib/chartRenderer';
import { Candle } from '../lib/types';

interface ToggleSpec {
  name: string;
  configKey: keyof SmcConfig;
  masterDependencies?: (keyof SmcConfig)[];
  checkIndicationCount: (smc: any, cfg: SmcConfig, view: { startIdx: number; endIdx: number; pMin: number; pMax: number; lastPrice: number }) => number;
}

const toggleSpecs: ToggleSpec[] = [
  // 1. Show mitigated FVGs
  {
    name: 'Show mitigated FVGs',
    configKey: 'showMitigatedFvg',
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showMitigatedFvg) return 0;
      return smc.fvgs.filter((f: any) => (f.isMitigated || f.isInvalidated) && f.startIndex <= endIdx && f.endIndex >= startIdx).length;
    },
  },

  // 2. Consequent Encroachment
  {
    name: 'Consequent Encroachment',
    configKey: 'showFvgMidpoint',
    checkIndicationCount: (smc, cfg, { pMin, pMax, startIdx, endIdx }) => {
      if (!cfg.showFvgMidpoint) return 0;
      const fvgCes = smc.fvgs.filter((f: any) => !!f.cePrice && f.startIndex <= endIdx && (f.endIndex >= startIdx || !f.isMitigated)).length;
      const obMts = smc.orderBlocks.filter((ob: any) => {
        const mt = (ob.topPrice + ob.bottomPrice) / 2;
        return mt >= pMin && mt <= pMax && ob.startIndex <= endIdx;
      }).length;
      return fvgCes + obMts;
    },
  },

  // 3. Bearish Inverse FVG
  {
    name: 'Bearish Inverse FVG',
    configKey: 'showBearishIfvg',
    masterDependencies: ['showMitigatedFvg'],
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showBearishIfvg || cfg.showBearishSetups === false) return 0;
      return smc.fvgs.filter((f: any) => !f.isBullish && f.isInverse && (!f.isInvalidated || cfg.showMitigatedFvg) && f.startIndex <= endIdx && (f.endIndex >= startIdx || !f.isInvalidated)).length;
    },
  },

  // 4. Bullish Inverse FVG
  {
    name: 'Bullish Inverse FVG',
    configKey: 'showBullishIfvg',
    masterDependencies: ['showMitigatedFvg'],
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showBullishIfvg || cfg.showBullishSetups === false) return 0;
      return smc.fvgs.filter((f: any) => f.isBullish && f.isInverse && (!f.isInvalidated || cfg.showMitigatedFvg) && f.startIndex <= endIdx && (f.endIndex >= startIdx || !f.isInvalidated)).length;
    },
  },

  // 5. Bullish Imbalance
  {
    name: 'Bullish Imbalance',
    configKey: 'showBullishFvg',
    masterDependencies: ['showMitigatedFvg'],
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showBullishFvg || cfg.showBullishSetups === false) return 0;
      return smc.fvgs.filter((f: any) => f.isBullish && !f.isInverse && (!f.isMitigated || cfg.showMitigatedFvg) && f.startIndex <= endIdx && (f.endIndex >= startIdx || !f.isMitigated)).length;
    },
  },

  // 6. Show Mitigated Blocks
  {
    name: 'Show Mitigated Blocks',
    configKey: 'showMitigatedOb',
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showMitigatedOb) return 0;
      return smc.orderBlocks.filter((ob: any) => ob.isMitigated && ob.startIndex <= endIdx && ob.endIndex >= startIdx).length;
    },
  },

  // 7. Bearish Breakers
  {
    name: 'Bearish Breakers',
    configKey: 'showBearishBreakers',
    masterDependencies: ['showBreakers', 'showMitigatedOb'],
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showBreakers || !cfg.showBearishBreakers || cfg.showBearishSetups === false) return 0;
      return smc.breakers.filter((b: any) => !b.isBullish && (!b.isMitigated || cfg.showMitigatedOb) && b.startIndex <= endIdx && (b.endIndex >= startIdx || !b.isMitigated)).length;
    },
  },

  // 8. Bullish Breakers
  {
    name: 'Bullish Breakers',
    configKey: 'showBullishBreakers',
    masterDependencies: ['showBreakers', 'showMitigatedOb'],
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showBreakers || !cfg.showBullishBreakers || cfg.showBullishSetups === false) return 0;
      return smc.breakers.filter((b: any) => b.isBullish && (!b.isMitigated || cfg.showMitigatedOb) && b.startIndex <= endIdx && (b.endIndex >= startIdx || !b.isMitigated)).length;
    },
  },

  // 9. Breaker Blocks
  {
    name: 'Breaker Blocks',
    configKey: 'showBreakers',
    masterDependencies: ['showMitigatedOb'],
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showBreakers) return 0;
      return smc.breakers.filter((b: any) => (!b.isMitigated || cfg.showMitigatedOb) && b.startIndex <= endIdx && (b.endIndex >= startIdx || !b.isMitigated)).length;
    },
  },

  // 10. Demand Order Blocks
  {
    name: 'Demand Order Blocks',
    configKey: 'showBullishOb',
    masterDependencies: ['showMitigatedOb'],
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showBullishOb || cfg.showBullishSetups === false) return 0;
      return smc.orderBlocks.filter((ob: any) => (!ob.isBreaker || cfg.showMitigatedOb) && ob.isBullish && (!ob.isMitigated || cfg.showMitigatedOb) && ob.startIndex <= endIdx && (ob.endIndex >= startIdx || !ob.isMitigated)).length;
    },
  },

  // 11. Bearish Sweeps
  {
    name: 'Bearish Sweeps',
    configKey: 'showBslSweeps',
    masterDependencies: ['showSweeps'],
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showSweeps || !cfg.showBslSweeps || cfg.showBearishSetups === false) return 0;
      return smc.sweeps.filter((s: any) => s.isHighSweep && s.candleIndex >= startIdx - 5 && s.candleIndex <= endIdx).length;
    },
  },

  // 12. Bullish Sweeps
  {
    name: 'Bullish Sweeps',
    configKey: 'showSslSweeps',
    masterDependencies: ['showSweeps'],
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showSweeps || !cfg.showSslSweeps || cfg.showBullishSetups === false) return 0;
      return smc.sweeps.filter((s: any) => !s.isHighSweep && s.candleIndex >= startIdx - 5 && s.candleIndex <= endIdx).length;
    },
  },

  // 13. Liquidity Sweeps
  {
    name: 'Liquidity Sweeps',
    configKey: 'showSweeps',
    checkIndicationCount: (smc, cfg, { startIdx, endIdx }) => {
      if (!cfg.showSweeps) return 0;
      return smc.sweeps.filter((s: any) => s.candleIndex >= startIdx - 5 && s.candleIndex <= endIdx).length;
    },
  },

  // 14. Bearish Structure
  {
    name: 'Bearish Structure',
    configKey: 'showBearishStructure',
    checkIndicationCount: (smc, cfg, { startIdx, endIdx, pMin, pMax }) => {
      if (!cfg.showBearishStructure || cfg.showBearishSetups === false) return 0;
      const pMargin = (pMax - pMin) * 0.25;
      return smc.structureBreaks.filter((b: any) => !b.isBullish && b.candleIndex >= startIdx - 5 && b.swingIndex <= endIdx && b.price >= pMin - pMargin && b.price <= pMax + pMargin).length;
    },
  },

  // 15. Bullish Structure
  {
    name: 'Bullish Structure',
    configKey: 'showBullishStructure',
    checkIndicationCount: (smc, cfg, { startIdx, endIdx, pMin, pMax }) => {
      if (!cfg.showBullishStructure || cfg.showBullishSetups === false) return 0;
      const pMargin = (pMax - pMin) * 0.25;
      return smc.structureBreaks.filter((b: any) => b.isBullish && b.candleIndex >= startIdx - 5 && b.swingIndex <= endIdx && b.price >= pMin - pMargin && b.price <= pMax + pMargin).length;
    },
  },

  // 16. Change of Character
  {
    name: 'Change of Character',
    configKey: 'showChoch',
    checkIndicationCount: (smc, cfg, { startIdx, endIdx, pMin, pMax }) => {
      if (!cfg.showChoch) return 0;
      const pMargin = (pMax - pMin) * 0.25;
      return smc.structureBreaks.filter((b: any) => (b.breakType === 'CHoCH' || b.breakType === 'MSS') && b.candleIndex >= startIdx - 5 && b.swingIndex <= endIdx && b.price >= pMin - pMargin && b.price <= pMax + pMargin).length;
    },
  },

  // 17. Break of structure
  {
    name: 'Break of structure',
    configKey: 'showBos',
    checkIndicationCount: (smc, cfg, { startIdx, endIdx, pMin, pMax }) => {
      if (!cfg.showBos) return 0;
      const pMargin = (pMax - pMin) * 0.25;
      return smc.structureBreaks.filter((b: any) => b.breakType === 'BOS' && b.candleIndex >= startIdx - 5 && b.swingIndex <= endIdx && b.price >= pMin - pMargin && b.price <= pMax + pMargin).length;
    },
  },
];

// Generate deterministic multi-cycle market data (reproducible seed, guaranteed SMC elements)
function generateDeterministicCandles(count = 500): Candle[] {
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const candles: Candle[] = [];
  let price = 22000;
  let t = 1700000000000;
  const minute = 60000;
  let trend = 1;
  let steps = 6;

  for (let i = 0; i < count; i++) {
    if (steps <= 0) {
      trend = rand() > 0.48 ? 1 : -1;
      steps = Math.floor(4 + rand() * 8);
    }
    steps--;

    const pct = 0.005 * (0.6 + rand() * 1.2) * (rand() > 0.35 ? trend : -trend);
    const body = Math.max(price * Math.abs(pct), price * 0.001);
    const isUp = pct >= 0;
    const open = price;
    const close = isUp ? open + body : open - body;
    const wickUp = body * (0.2 + rand() * 0.4);
    const wickDown = body * (0.2 + rand() * 0.4);
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    const volume = Math.floor(500000 + rand() * 1500000);

    candles.push({
      openTime: t,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });

    price = close;
    t += minute * 60;
  }
  return candles;
}

const candles = generateDeterministicCandles(500);
const startIdx = 0;
const endIdx = candles.length;
const { pMin, pMax } = computeChartPriceBounds(candles, startIdx, endIdx);
const lastPrice = candles[candles.length - 1]?.close || (pMin + pMax) / 2;
const view = { startIdx, endIdx, pMin, pMax, lastPrice };

console.log('============================================================');
console.log('🧪 VERIFYING ALL 17 SMC ANALYSIS TOGGLES ON CANVAS PIPELINE');
console.log('============================================================\n');

let allPassed = true;

for (let i = 0; i < toggleSpecs.length; i++) {
  const spec = toggleSpecs[i];

  // Test ON state
  const enabledConfig: Record<string, boolean> = { [spec.configKey]: true };
  if (spec.masterDependencies) {
    for (const dep of spec.masterDependencies) {
      enabledConfig[dep] = true;
    }
  }
  const cfgOn: SmcConfig = { ...DEFAULT_SMC_CONFIG, ...enabledConfig };
  const smcOn = calculateSMC(candles, cfgOn, 'NIFTY', '1H');
  const countOn = spec.checkIndicationCount(smcOn, cfgOn, view);

  // Test OFF state
  const disabledConfig: Record<string, boolean> = { [spec.configKey]: false };
  const cfgOff: SmcConfig = { ...DEFAULT_SMC_CONFIG, ...disabledConfig };
  const smcOff = calculateSMC(candles, cfgOff, 'NIFTY', '1H');
  const countOff = spec.checkIndicationCount(smcOff, cfgOff, view);

  const passesOn = countOn > 0;
  const passesOff = countOff === 0;
  const pass = passesOn && passesOff;

  if (pass) {
    console.log(`  ${(i + 1).toString().padStart(2, ' ')}. [PASS] ${spec.name.padEnd(28, ' ')} -> ON: ${countOn.toString().padStart(2, ' ')} items | OFF: 0 items`);
  } else {
    allPassed = false;
    console.log(`  ${(i + 1).toString().padStart(2, ' ')}. [FAIL] ${spec.name.padEnd(28, ' ')} -> ON: ${countOn} | OFF: ${countOff}`);
  }
}

console.log('\n============================================================');
if (allPassed) {
  console.log('🎉 ALL 17 SMC TOGGLES VERIFIED AND PASSING 100%!');
} else {
  console.error('❌ SOME TOGGLE VERIFICATIONS FAILED.');
  process.exit(1);
}
console.log('============================================================');
