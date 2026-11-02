import fs from 'fs';
import { METRIC_DEFINITIONS, getMetricValue, formatMetricValue } from '../lib/screener/metrics';
import { buildIndiaUniverse } from '../lib/screener/data';
import { isFinancialEntity } from '../lib/screener/zerodhaStocks';

interface RankedCompany {
  symbol: string;
  name: string;
  sector: string;
  mcap: number;
  value: number;
  formatted: string;
}

interface MetricTop3Result {
  num: number;
  key: string;
  label: string;
  category: string;
  unit: string;
  higherIsBetter: boolean;
  totalPopulated: number;
  liquidTop3: RankedCompany[];
  universeTop3: RankedCompany[];
}

const BFSI_EXCLUDED_METRICS = [
  'enterpriseValue',
  'evToEbitda',
  'evToEbit',
  'priceToSales',
  'earningsYield',
  'opm',
  'npm',
  'grossMargin',
  'ebitdaMargin',
  'cfo',
  'freeCashFlow',
  'fcfYield',
  'currentRatio',
  'quickRatio',
  'debtToEquity',
  'workingCapitalDays',
  'cashConversionCycle',
  'piotroskiScore',
  'altmanZScore'
];

async function run() {
  const universe = buildIndiaUniverse();
  console.log(`Loaded active universe of ${universe.length} companies.\n`);

  const results: MetricTop3Result[] = [];

  for (let i = 0; i < METRIC_DEFINITIONS.length; i++) {
    const def = METRIC_DEFINITIONS[i];
    const isBfsiExcluded = BFSI_EXCLUDED_METRICS.includes(def.key);

    const validComps: { comp: any; val: number }[] = [];
    const liquidComps: { comp: any; val: number }[] = [];

    for (const comp of universe) {
      // 0. Exclude non-corporate tokens, unlisted placeholders, and ETF/INAV tokens
      if (!comp.name || comp.marketCap == null || comp.marketCap <= 0) {
        continue;
      }
      const symUpper = comp.symbol.toUpperCase();
      if (symUpper.includes('INAV') || symUpper.includes('BEES') || symUpper.includes('CASE') || symUpper === 'GROWW') {
        continue;
      }

      // 1. BFSI Accounting Exclusion
      if (isBfsiExcluded && isFinancialEntity(comp.symbol, comp.name, comp.sector)) {
        continue;
      }

      const val = getMetricValue(comp, def.key);
      if (val === null || val === undefined || Number.isNaN(val) || !Number.isFinite(val)) {
        continue;
      }

      // 2. Realistic Bounds on Ratios and Multiples
      if (['pe', 'forwardPe', 'pb', 'priceToSales', 'evToEbitda', 'evToEbit', 'pegRatio'].includes(def.key)) {
        if (val <= 0 || val > 1500) continue; // Exclude negative or infinite multiples
      }

      // Forward PE must be an authentic forward analyst estimate, not an unforecasted fallback to trailing PE
      if (def.key === 'forwardPe') {
        const trailingPe = getMetricValue(comp, 'pe');
        if (trailingPe != null && Math.abs(val - trailingPe) < 0.01) continue;
      }

      // Margins cannot exceed 100% and gross margin cannot be pure pass-through service artifact (>= 99.5%)
      if (['opm', 'npm', 'grossMargin', 'ebitdaMargin'].includes(def.key)) {
        if (val <= 0 || val > 100) continue;
      }
      if (def.key === 'grossMargin' && (val <= 0 || val >= 99.5)) {
        continue;
      }

      // ROCE / ROE / ROIC realistic limits: Filter out penny stubs with negative/eroded equity (> 160%)
      if (['roce', 'roe', 'roic', 'roce3YAvg', 'roe3YAvg', 'roce5YAvg'].includes(def.key)) {
        if (val <= 0 || val > 160) continue;
      }

      // Dividend Yield cannot exceed 30% under normal operations
      if (def.key === 'dividendYield') {
        if (val <= 0 || val > 30) continue;
      }

      // Earnings Yield & FCF Yield bounds: Cap at 50% to exclude one-off court settlements / penny stub bases
      if (['earningsYield', 'fcfYield'].includes(def.key)) {
        if (val <= 0 || val > 50) continue;
      }

      // Growth rate bounds: Filter out micro-penny stub denominators (e.g. ₹0.001 Cr turnover jumps)
      if (['salesGrowth1Y', 'salesGrowth3Y', 'salesGrowth5Y', 'salesGrowth10Y', 'qtrSalesGrowthYoY', 'profitGrowth1Y', 'profitGrowth3Y', 'profitGrowth5Y', 'profitGrowth10Y', 'epsGrowth', 'ebitdaGrowth', 'qtrProfitGrowthYoY'].includes(def.key)) {
        if (val > 5000) continue;
      }

      // Lowest pledge requirement: Only evaluate companies with actual promoter skin-in-the-game (promoterHolding > 0)
      if (def.key === 'pledgedPct') {
        if (comp.promoterHolding == null || comp.promoterHolding <= 0) continue;
      }

      // Institutional Liquid Leaders require distinct quarterly disclosures (not duplicated from annual 1Y)
      let isLiquidEligible = comp.marketCap != null && comp.marketCap >= 5000;
      if (isLiquidEligible && ['qtrSalesGrowthYoY', 'qtrProfitGrowthYoY'].includes(def.key)) {
        const annualKey = def.key === 'qtrSalesGrowthYoY' ? 'salesGrowth1Y' : 'profitGrowth1Y';
        const annualVal = getMetricValue(comp, annualKey);
        if (annualVal != null && Math.abs(val - annualVal) < 0.01) {
          isLiquidEligible = false;
        }
      }

      validComps.push({ comp, val });
      if (isLiquidEligible) {
        liquidComps.push({ comp, val });
      }
    }

    // 3. Institutional Sorting with Deterministic Market-Cap Tie-Breakers
    const sortFunction = (a: { comp: any; val: number }, b: { comp: any; val: number }) => {
      // Metric-specific sort rules:
      if (def.key === 'pledgedPct') {
        // Lowest pledge is best: 0.00% first, then tie-break by largest Market Cap
        if (a.val !== b.val) return a.val - b.val;
        return (b.comp.marketCap || 0) - (a.comp.marketCap || 0);
      }

      if (def.key === 'promoterHoldingChange3Y') {
        // Highest positive promoter increase, tie-break by Market Cap
        if (a.val !== b.val) return b.val - a.val;
        return (b.comp.marketCap || 0) - (a.comp.marketCap || 0);
      }

      if (def.key === 'piotroskiScore') {
        // Highest score (9/9), tie-break by Market Cap
        if (a.val !== b.val) return b.val - a.val;
        return (b.comp.marketCap || 0) - (a.comp.marketCap || 0);
      }

      // General case: Sort descending by value; if equal, tie-break by Market Cap
      if (b.val !== a.val) {
        return b.val - a.val;
      }
      return (b.comp.marketCap || 0) - (a.comp.marketCap || 0);
    };

    validComps.sort(sortFunction);
    liquidComps.sort(sortFunction);

    const mapRanked = (items: { comp: any; val: number }[]): RankedCompany[] =>
      items.slice(0, 3).map(item => ({
        symbol: item.comp.symbol,
        name: item.comp.name,
        sector: item.comp.sector,
        mcap: item.comp.marketCap || 0,
        value: item.val,
        formatted: formatMetricValue(item.val, def.key, '₹')
      }));

    results.push({
      num: i + 1,
      key: def.key,
      label: def.label,
      category: def.category,
      unit: def.unit || '',
      higherIsBetter: !!def.higherIsBetter,
      totalPopulated: validComps.length,
      liquidTop3: mapRanked(liquidComps),
      universeTop3: mapRanked(validComps)
    });
  }

  fs.writeFileSync('scripts/top3-metrics-result.json', JSON.stringify(results, null, 2), 'utf8');
  console.log(`Successfully generated verified institutional top 3 companies for all ${results.length} metrics.`);
}

run().catch(console.error);
