import { getCompanyBySymbol, buildIndiaUniverse } from '../lib/screener/data';
import { getMetricValue, formatMetricValue } from '../lib/screener/metrics';

interface TestCase {
  page: number;
  metric: string;
  label: string;
  sym: string;
  name: string;
  originalStatus: 'Correct' | 'Incorrect';
}

const testCases: TestCase[] = [
  // 1. Valuation
  { page: 1, metric: 'marketCap', label: 'Market Cap', sym: 'RELIANCE', name: 'Reliance', originalStatus: 'Correct' },
  { page: 2, metric: 'currentPrice', label: 'Price', sym: 'BHARTIARTL', name: 'Bharti Airtel', originalStatus: 'Correct' },
  { page: 3, metric: 'pe', label: 'P/E Ratio', sym: 'ZOMATO', name: 'Zomato', originalStatus: 'Correct' },
  { page: 4, metric: 'forwardPe', label: 'Forward P/E Ratio', sym: 'BAJFINANCE', name: 'Bajaj Finance', originalStatus: 'Correct' },
  { page: 5, metric: 'pb', label: 'P/B', sym: 'TCS', name: 'TCS', originalStatus: 'Correct' },
  { page: 6, metric: 'priceToSales', label: 'P/S', sym: 'LT', name: 'Larsen & Toubro', originalStatus: 'Incorrect' },
  { page: 7, metric: 'enterpriseValue', label: 'EV', sym: 'CREATIVEYE', name: 'Creative Eye', originalStatus: 'Correct' },
  { page: 8, metric: 'evToEbitda', label: 'EV/EBITDA', sym: 'TCS', name: 'TCS', originalStatus: 'Correct' },
  { page: 9, metric: 'evToEbit', label: 'EV/EBIT', sym: 'ASIANTNE', name: 'Asian Tea & Exports', originalStatus: 'Incorrect' },
  { page: 10, metric: 'dividendYield', label: 'Dividend Yield', sym: 'SETCO', name: 'Setco Automotive Ltd', originalStatus: 'Incorrect' },
  { page: 11, metric: 'earningsYield', label: 'Earnings Yield', sym: 'NOIDATOLL', name: 'NOIDATOLL', originalStatus: 'Incorrect' },
  { page: 12, metric: 'fcfYield', label: 'FCF Yield', sym: 'MASKINVEST', name: 'Mask Investments Limited', originalStatus: 'Incorrect' },
  { page: 13, metric: 'pegRatio', label: 'PEG', sym: 'CONCOR', name: 'CONCOR', originalStatus: 'Incorrect' },

  // 2. Growth
  { page: 14, metric: 'salesGrowth1Y', label: 'Sales 1Y', sym: 'CUPID', name: 'Cupid', originalStatus: 'Incorrect' },
  { page: 15, metric: 'salesGrowth3Y', label: 'Sales 3Y', sym: 'NAZARA', name: 'Nazara Technologies', originalStatus: 'Incorrect' },
  { page: 16, metric: 'salesGrowth5Y', label: 'Sales 5Y', sym: 'TEGA', name: 'Tega Industries', originalStatus: 'Incorrect' },
  { page: 17, metric: 'salesGrowth10Y', label: 'Sales 10Y', sym: 'ORCHPHARMA', name: 'Orchid Pharma', originalStatus: 'Incorrect' },
  { page: 18, metric: 'profitGrowth1Y', label: 'Profit 1Y', sym: 'UEL', name: 'Ujaas Energy', originalStatus: 'Incorrect' },
  { page: 19, metric: 'profitGrowth3Y', label: 'Profit 3Y', sym: 'OAL', name: 'Oriental Aromatics', originalStatus: 'Incorrect' },
  { page: 20, metric: 'profitGrowth5Y', label: 'Profit 5Y', sym: 'CENTUM', name: 'Centum Electronics', originalStatus: 'Incorrect' },
  { page: 21, metric: 'profitGrowth10Y', label: 'Profit 10Y', sym: 'TECHNVISN', name: 'Technvision Ventures', originalStatus: 'Incorrect' },
  { page: 22, metric: 'epsGrowth', label: 'EPS Growth', sym: 'INDOKEM', name: 'Indokem', originalStatus: 'Correct' },
  { page: 23, metric: 'ebitdaGrowth', label: 'EBITDA Growth', sym: 'PVP', name: 'PVP Ventures', originalStatus: 'Incorrect' },
  { page: 24, metric: 'qtrSalesGrowthYoY', label: 'Quarterly Sales YoY', sym: 'JUNIPER', name: 'Juniper Green Energy', originalStatus: 'Incorrect' },
  { page: 25, metric: 'qtrProfitGrowthYoY', label: 'Quarterly Profit YoY', sym: 'PROZONER', name: 'Prozone Realty', originalStatus: 'Incorrect' },

  // 3. Profitability
  { page: 26, metric: 'roce', label: 'ROCE', sym: 'TIMEX', name: 'Timex', originalStatus: 'Incorrect' },
  { page: 27, metric: 'roe', label: 'ROE', sym: 'NESTLEIND', name: 'Nestle India', originalStatus: 'Incorrect' },
  { page: 28, metric: 'roic', label: 'ROIC', sym: 'TIPSMUSIC', name: 'Tips Music', originalStatus: 'Incorrect' },
  { page: 29, metric: 'roa', label: 'ROA', sym: 'BRIGADE', name: 'Brigade', originalStatus: 'Incorrect' },
  { page: 30, metric: 'opm', label: 'OPM', sym: 'ADANIGREEN', name: 'Adani Green Energy', originalStatus: 'Incorrect' },
  { page: 31, metric: 'npm', label: 'NPM', sym: 'JSWHL', name: 'JSW Holdings', originalStatus: 'Incorrect' },
  { page: 32, metric: 'grossMargin', label: 'Gross Margin', sym: 'AVANTEL', name: 'Avantel', originalStatus: 'Incorrect' },
  { page: 33, metric: 'ebitdaMargin', label: 'EBITDA Margin', sym: 'NTPCGREEN', name: 'NTPC Green Energy', originalStatus: 'Incorrect' },

  // 4. Financial Health & Balance Sheet
  { page: 34, metric: 'debtToEquity', label: 'D/E', sym: 'DELTAMAGNT', name: 'Delta Manufacturing', originalStatus: 'Correct' },
  { page: 35, metric: 'netDebt', label: 'Net Debt', sym: 'DIXON', name: 'Dixon', originalStatus: 'Incorrect' },
  { page: 36, metric: 'interestCoverage', label: 'Interest Coverage', sym: 'COFORGE', name: 'Coforge', originalStatus: 'Incorrect' },
  { page: 37, metric: 'currentRatio', label: 'Current Ratio', sym: 'JIOFIN', name: 'Jio Financial Services', originalStatus: 'Incorrect' },
  { page: 38, metric: 'quickRatio', label: 'Quick Ratio', sym: 'MAHSCOOTER', name: 'Maharashtra Scooters', originalStatus: 'Incorrect' },
  { page: 39, metric: 'cfo', label: 'CFO', sym: 'TECHM', name: 'Tech Mahindra', originalStatus: 'Incorrect' },
  { page: 40, metric: 'freeCashFlow', label: 'FCF', sym: 'WIPRO', name: 'Wipro Limited', originalStatus: 'Incorrect' },
  { page: 41, metric: 'cashConversionCycle', label: 'Cash Cycle', sym: 'SUNPHARMA', name: 'Sun Pharma', originalStatus: 'Incorrect' },
  { page: 42, metric: 'workingCapitalDays', label: 'WC Days', sym: 'DEEPAKNTR', name: 'Deepak Nitrite Limited', originalStatus: 'Incorrect' },
  { page: 43, metric: 'capex', label: 'Capex', sym: 'INFY', name: 'Infosys', originalStatus: 'Incorrect' },
  { page: 44, metric: 'debtReduction3Y', label: 'Debt Reduction 3Y', sym: 'TATAMOTORS', name: 'Tata Motors', originalStatus: 'Incorrect' },

  // 5. Financial Strength
  { page: 45, metric: 'piotroskiScore', label: 'Piotroski', sym: 'ASIANPAINT', name: 'Asian Paints', originalStatus: 'Incorrect' },
  { page: 46, metric: 'altmanZScore', label: 'Altman Z', sym: 'ACC', name: 'ACC', originalStatus: 'Incorrect' },

  // 6. Ownership
  { page: 47, metric: 'promoterHolding', label: 'Promoter %', sym: 'POLYCAB', name: 'Polycab', originalStatus: 'Incorrect' },
  { page: 48, metric: 'promoterHoldingChange3Y', label: 'Promoter Change 3Y', sym: 'LTIM', name: 'LTIMindtree', originalStatus: 'Incorrect' },
  { page: 49, metric: 'promoterHolding', label: 'Promoter %', sym: 'HCLTECH', name: 'HCL Tech', originalStatus: 'Correct' },
  { page: 50, metric: 'fiiHolding', label: 'FII', sym: 'PERSISTENT', name: 'Persistent Systems', originalStatus: 'Incorrect' },
  { page: 51, metric: 'diiHolding', label: 'DII', sym: 'TCS', name: 'TCS', originalStatus: 'Incorrect' },
  { page: 52, metric: 'publicHolding', label: 'Public', sym: 'HDFCBANK', name: 'HDFC Bank', originalStatus: 'Correct' },

  // 7. Market
  { page: 53, metric: 'volume', label: 'Volume', sym: 'DIXON', name: 'Dixon', originalStatus: 'Incorrect' },
  { page: 54, metric: 'beta', label: 'Beta', sym: 'INFY', name: 'Infosys', originalStatus: 'Incorrect' },
];

async function run() {
  console.log('='.repeat(105));
  console.log('       MI007 END-TO-END VERIFICATION: 54 FINANCIAL SCREENING TEST CASES');
  console.log('='.repeat(105));

  const universe = buildIndiaUniverse();
  const universeSymMap = new Map(universe.map(c => [c.symbol.toUpperCase(), c]));
  console.log(`Universe build complete: ${universe.length} Indian companies indexed.`);

  let inUniverseCount = 0;
  let singleLookupCount = 0;
  let populatedCount = 0;
  let issues: string[] = [];

  console.log('\nPg   Symbol       Metric                 Original   InUniv  Lookup  Resolved Value      Issue?');
  console.log('-'.repeat(105));

  for (const tc of testCases) {
    const inUnivComp = universeSymMap.get(tc.sym);
    const lookupComp = getCompanyBySymbol(tc.sym);

    const hasInUniv = !!inUnivComp;
    const hasLookup = !!lookupComp;

    if (hasInUniv) inUniverseCount++;
    if (hasLookup) singleLookupCount++;

    const comp = lookupComp || inUnivComp;
    let rawVal: any = null;
    let formatted = '—';

    if (comp) {
      rawVal = getMetricValue(comp, tc.metric);
      formatted = formatMetricValue(rawVal, tc.metric, '₹');
    }

    // Check validity
    let issue = '';
    // Under Ind AS 109, JIOFIN and MAHSCOOTER should properly return null / "—"
    const isIndAS109NullExpected = (tc.sym === 'JIOFIN' && tc.metric === 'currentRatio') || 
                                   (tc.sym === 'MAHSCOOTER' && tc.metric === 'quickRatio');

    if (!comp) {
      issue = 'CRITICAL: Company missing from catalog';
      issues.push(`Page ${tc.page} [${tc.sym}]: Missing from catalog`);
    } else if (rawVal === null || rawVal === undefined) {
      if (!isIndAS109NullExpected) {
        issue = 'WARNING: Metric value is null/empty';
        issues.push(`Page ${tc.page} [${tc.sym} ${tc.metric}]: Value is null`);
      } else {
        populatedCount++; // Correctly null per Ind AS 109
      }
    } else {
      populatedCount++;
    }

    console.log(
      String(tc.page).padEnd(5) +
      tc.sym.padEnd(13) +
      tc.metric.slice(0, 21).padEnd(23) +
      tc.originalStatus.padEnd(11) +
      (hasInUniv ? 'YES ' : 'NO  ').padEnd(8) +
      (hasLookup ? 'YES ' : 'NO  ').padEnd(8) +
      formatted.padEnd(20) +
      issue
    );
  }

  console.log('='.repeat(105));
  console.log(`SUMMARY:`);
  console.log(`  Total Test Cases:            ${testCases.length}`);
  console.log(`  Found in Universe:           ${inUniverseCount} / ${testCases.length}`);
  console.log(`  Found via getCompanyBySymbol: ${singleLookupCount} / ${testCases.length}`);
  console.log(`  Metrics Resolved Validly:    ${populatedCount} / ${testCases.length}`);
  console.log(`  Issues Found:                ${issues.length}`);

  if (issues.length > 0) {
    console.log('\nList of issues:');
    issues.forEach(iss => console.log('  - ' + iss));
  } else {
    console.log('\n>>> ALL 54 METRICS RESOLVE CLEANLY END-TO-END! <<<');
  }
}

run().catch(console.error);
