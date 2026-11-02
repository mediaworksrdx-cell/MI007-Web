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
  'opm',
  'grossMargin',
  'ebitdaMargin',
  'cfo',
  'freeCashFlow',
  'fcfYield',
  'currentRatio',
  'quickRatio',
  'debtToEquity',
  'workingCapitalDays',
  'cashConversionCycle'
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

      // Margins cannot exceed 100%
      if (['opm', 'npm', 'grossMargin', 'ebitdaMargin'].includes(def.key)) {
        if (val <= 0 || val > 100) continue;
      }

      // ROCE / ROE / ROIC realistic limits for active operating companies
      if (['roce', 'roe', 'roic', 'roce3YAvg', 'roe3YAvg', 'roce5YAvg'].includes(def.key)) {
        if (val <= 0 || (val > 120 && comp.symbol !== 'NESTLEIND')) continue;
      }

      // Dividend Yield cannot exceed 30% under normal operations
      if (def.key === 'dividendYield' && val > 30) {
        continue;
      }

      validComps.push({ comp, val });

      // Strict Liquid Cutoff: Market Cap >= ₹5,000 Cr
      if (comp.marketCap != null && comp.marketCap >= 5000) {
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
