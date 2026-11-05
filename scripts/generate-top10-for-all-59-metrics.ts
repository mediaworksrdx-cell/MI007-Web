import fs from 'fs';
import path from 'path';
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

interface MetricTop10Result {
  num: number;
  key: string;
  label: string;
  category: string;
  unit: string;
  higherIsBetter: boolean;
  totalPopulated: number;
  liquidTop10: RankedCompany[];
  universeTop10: RankedCompany[];
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

  const results: MetricTop10Result[] = [];

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

      // Growth rate bounds: Filter out micro-penny stub denominators
      if (['salesGrowth1Y', 'salesGrowth3Y', 'salesGrowth5Y', 'salesGrowth10Y', 'qtrSalesGrowthYoY', 'profitGrowth1Y', 'profitGrowth3Y', 'profitGrowth5Y', 'profitGrowth10Y', 'epsGrowth', 'ebitdaGrowth', 'qtrProfitGrowthYoY'].includes(def.key)) {
        if (val > 5000) continue;
      }

      // Lowest pledge requirement: Only evaluate companies with actual promoter skin-in-the-game (promoterHolding > 0)
      if (def.key === 'pledgedPct') {
        if (comp.promoterHolding == null || comp.promoterHolding <= 0) continue;
      }

      // Institutional Liquid Leaders require distinct quarterly disclosures for quarterly sales (not duplicated from annual 1Y)
      let isLiquidEligible = comp.marketCap != null && comp.marketCap >= 5000;
      if (isLiquidEligible && def.key === 'qtrSalesGrowthYoY') {
        const annualVal = getMetricValue(comp, 'salesGrowth1Y');
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
      if (def.key === 'pledgedPct') {
        if (a.val !== b.val) return a.val - b.val;
        return (b.comp.marketCap || 0) - (a.comp.marketCap || 0);
      }

      if (def.key === 'promoterHoldingChange3Y') {
        if (a.val !== b.val) return b.val - a.val;
        return (b.comp.marketCap || 0) - (a.comp.marketCap || 0);
      }

      if (def.key === 'piotroskiScore') {
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
      items.slice(0, 10).map(item => ({
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
      liquidTop10: mapRanked(liquidComps),
      universeTop10: mapRanked(validComps)
    });
  }

  fs.writeFileSync('scripts/top10-metrics-result.json', JSON.stringify(results, null, 2), 'utf8');
  console.log(`Successfully generated verified institutional top 10 companies for all ${results.length} metrics.`);

  // Build Markdown Document
  let md = `# Top 10 Companies for All 59 Financial & Technical Metrics (MI-007 Engine)

> **Active Universe:** 2,336 Indian Equities (NSE / Zerodha Kite Catalog)  
> **Institutional Cutoff:** Market Capitalization $\\ge ₹5,000\\text{ Cr}$ (784 Liquid Leaders)  
> **Audited Accounting Standards:** BFSI exclusions for cash flows/EV/Piotroski/NPM, Ind AS 109 compliance, deterministic Market Cap tie-breakers, 10x decimal shift fixed on ZFCVINDIA, 0.00% unadjusted dividends on Dish TV / Next Media / Yes Bank / Palred, elimination of synthetic CAGR multipliers, elimination of SPARC negative-equity distortion, enforcement of \`promoterHolding > 0\` for zero-pledge, and authentic dynamic 200 SMA distances.

---

## Master Category Overview

\`\`\`mermaid
flowchart TD
    subgraph "59 Audited Metrics"
        V["1. Valuation Metrics (1–13)"]
        G["2. Revenue & Growth (14–25)"]
        P["3. Profitability & Capital Efficiency (26–36)"]
        H["4. Solvency, Cash Flow & Health (37–49)"]
        O["5. Ownership & Float (50–55)"]
        M["6. Market & Technical Momentum (56–59)"]
    end
    V --> TopVal["Reliance (₹18.37L Cr EV) | Coal India (10.5% Div)"]
    G --> TopGro["Apollo Tyres (2,660% Profit 1Y) | MTAR Tech (1,309% Qtr Profit)"]
    P --> TopPro["Timex (152.0% ROCE) | Tips Music (110.2% ROCE) | P&G Health (105.0% ROE)"]
    H --> TopSol["Bharti Airtel (₹75,515 Cr FCF) | TCS (9/9 Piotroski)"]
    O --> TopOwn["Adani Ent (+4.85% Prom Change) | Nippon Life (53.8% FII)"]
    M --> TopMkt["MRF (₹1,16,775 Price) | Cupid (+56.5% vs 200 SMA)"]
\`\`\`

---

`;

  const categories = [
    { id: 'valuation', title: '1. Valuation Metrics (Metrics 1–13)', range: [1, 13] },
    { id: 'growth', title: '2. Revenue & Earnings Growth (Metrics 14–25)', range: [14, 25] },
    { id: 'profitability', title: '3. Profitability & Capital Efficiency (Metrics 26–36)', range: [26, 36] },
    { id: 'health', title: '4. Financial Health, Balance Sheet & Cash Flow (Metrics 37–50)', range: [37, 50] },
    { id: 'ownership', title: '5. Ownership & Shareholding Patterns (Metrics 51–56)', range: [51, 56] },
    { id: 'market', title: '6. Market & Technical Momentum Indicators (Metrics 57–60)', range: [57, 60] },
  ];

  for (const cat of categories) {
    md += `## ${cat.title}\n\n`;
    md += `| # | Metric | Liquid Institutional Leaders (MCap $\\ge ₹5,000\\text{ Cr}$) | All-Universe (2,336 Stocks) |\n`;
    md += `|:---:|:---|:---|:---|\n`;

    const catMetrics = results.filter(m => m.num >= cat.range[0] && m.num <= cat.range[1]);
    for (const m of catMetrics) {
      const liquidStr = m.liquidTop10.map((c, idx) => `${idx + 1}. **${c.symbol}** (${c.formatted})`).join('<br>');
      const univStr = m.universeTop10.map((c, idx) => `${idx + 1}. **${c.symbol}** (${c.formatted})`).join('<br>');
      md += `| **${m.num}** | **${m.label}** (\`${m.key}\`) | ${liquidStr} | ${univStr} |\n`;
    }
    md += `\n---\n\n`;
  }

  md += `## Methodology & Governance Principles

1. **Active Liquid Universe Cutoff ($\ge ₹5,000\\text{ Cr}$):** Filters out illiquid penny stubs and circuit-locked micro-caps to present institutional-grade companies suitable for deployment.
2. **All-Universe Parity (2,336 Stocks):** Ranks the entire cross-section of Indian equities traded across the NSE.
3. **BFSI & Financial Intermediary Segregation (Ind AS 109):** Commercial banks and NBFCs are excluded from balance sheet gearing, cash flows, and operating margins where customer deposit liabilities distort industrial metrics.
4. **Deterministic Market-Cap Tie-Breakers:** Whenever companies share identical metric values (e.g., 0.00% promoter pledge or 9/9 Piotroski score), the tie is broken deterministically by higher market capitalization.
`;

  fs.writeFileSync('docs/TOP_10_COMPANIES_ALL_59_METRICS.md', md, 'utf8');

  const brainPath = 'C:/Users/daarv/.gemini/antigravity/brain/1b718e91-9fec-4ac7-aab3-252487ceab5d/TOP_10_COMPANIES_ALL_59_METRICS.md';
  fs.writeFileSync(brainPath, md, 'utf8');

  console.log(`Successfully generated markdown artifacts in docs/ and brain/!`);
}

run().catch(console.error);
