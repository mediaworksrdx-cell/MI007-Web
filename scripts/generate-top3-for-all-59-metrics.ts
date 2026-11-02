import fs from 'fs';
import { METRIC_DEFINITIONS, getMetricValue, formatMetricValue } from '../lib/screener/metrics';
import { buildIndiaUniverse } from '../lib/screener/data';

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
  universeTop3: RankedCompany[];
  liquidTop3: RankedCompany[];
}

async function run() {
  const universe = buildIndiaUniverse();
  console.log(`Loaded active universe of ${universe.length} companies.\n`);

  const results: MetricTop3Result[] = [];

  for (let i = 0; i < METRIC_DEFINITIONS.length; i++) {
    const def = METRIC_DEFINITIONS[i];

    // Filter companies with valid numeric metric value
    const validComps: { comp: any; val: number }[] = [];
    const liquidComps: { comp: any; val: number }[] = [];

    for (const comp of universe) {
      const val = getMetricValue(comp, def.key);
      if (val !== null && val !== undefined && !Number.isNaN(val) && Number.isFinite(val)) {
        // Exclude nonsensical zero/negative valuation multiples
        if (['pe', 'forwardPe', 'pb', 'priceToSales', 'evToEbitda', 'evToEbit', 'pegRatio'].includes(def.key)) {
          if (val <= 0) continue;
        }

        validComps.push({ comp, val });

        if (comp.marketCap && comp.marketCap >= 5000) {
          liquidComps.push({ comp, val });
        }
      }
    }

    // Sort descending by value (Top 3 highest)
    validComps.sort((a, b) => b.val - a.val);
    liquidComps.sort((a, b) => b.val - a.val);

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
      universeTop3: mapRanked(validComps),
      liquidTop3: mapRanked(liquidComps)
    });
  }

  fs.writeFileSync('scripts/top3-metrics-result.json', JSON.stringify(results, null, 2), 'utf8');
  console.log(`Successfully generated dual-universe top 3 companies for all ${results.length} metrics.`);
}

run().catch(console.error);
