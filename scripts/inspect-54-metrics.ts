import { generateFundamentalFromZerodha, findZerodhaStockBySymbol } from '../lib/screener/zerodhaStocks';
import { getMetricValue, formatMetricValue } from '../lib/screener/metrics';

interface TestCase {
  page: number;
  metric: string;
  label: string;
  sym: string;
  name: string;
  expected: string;
  originalStatus: 'Correct' | 'Incorrect';
}

const testCases: TestCase[] = [
  // 1. Valuation
  { page: 1, metric: 'marketCap', label: 'Market Cap', sym: 'RELIANCE', name: 'Reliance', expected: '₹15,76,398 Cr', originalStatus: 'Correct' },
  { page: 2, metric: 'currentPrice', label: 'Price', sym: 'BHARTIARTL', name: 'Bharti Airtel', expected: '₹1,973.70', originalStatus: 'Correct' },
  { page: 3, metric: 'pe', label: 'P/E Ratio', sym: 'ZOMATO', name: 'Zomato', expected: '648.4x', originalStatus: 'Correct' },
  { page: 4, metric: 'forwardPe', label: 'Forward P/E Ratio', sym: 'BAJFINANCE', name: 'Bajaj Finance', expected: '18.7x', originalStatus: 'Correct' },
  { page: 5, metric: 'pb', label: 'P/B', sym: 'TCS', name: 'TCS', expected: '7.61x', originalStatus: 'Correct' },
  { page: 6, metric: 'priceToSales', label: 'P/S', sym: 'LT', name: 'Larsen & Toubro', expected: '2.41x', originalStatus: 'Incorrect' },
  { page: 7, metric: 'enterpriseValue', label: 'EV', sym: 'CREATIVEYE', name: 'Creative Eye', expected: '₹12 Cr', originalStatus: 'Correct' },
  { page: 8, metric: 'evToEbitda', label: 'EV/EBITDA', sym: 'TCS', name: 'TCS', expected: '12.6x', originalStatus: 'Correct' },
  { page: 9, metric: 'evToEbit', label: 'EV/EBIT', sym: 'ASIANTNE', name: 'Asian Tea & Exports', expected: '17.5x', originalStatus: 'Incorrect' },
  { page: 10, metric: 'dividendYield', label: 'Dividend Yield', sym: 'SETCO', name: 'Setco Automotive Ltd', expected: '0.00%', originalStatus: 'Incorrect' },
  { page: 11, metric: 'earningsYield', label: 'Earnings Yield', sym: 'NOIDATOLL', name: 'NOIDATOLL', expected: '0.00%', originalStatus: 'Incorrect' },
  { page: 12, metric: 'fcfYield', label: 'FCF Yield', sym: 'MASKINVEST', name: 'Mask Investments Limited', expected: '0.00%', originalStatus: 'Incorrect' },
  { page: 13, metric: 'pegRatio', label: 'PEG', sym: 'CONCOR', name: 'CONCOR', expected: '2.41x', originalStatus: 'Incorrect' },

  // 2. Growth
  { page: 14, metric: 'salesGrowth1Y', label: 'Sales 1Y', sym: 'CUPID', name: 'Cupid', expected: '94.3%', originalStatus: 'Incorrect' },
  { page: 15, metric: 'salesGrowth3Y', label: 'Sales 3Y', sym: 'NAZARA', name: 'Nazara Technologies', expected: '18.8%', originalStatus: 'Incorrect' },
  { page: 16, metric: 'salesGrowth5Y', label: 'Sales 5Y', sym: 'TEGA', name: 'Tega Industries', expected: '15.8%', originalStatus: 'Incorrect' },
  { page: 17, metric: 'salesGrowth10Y', label: 'Sales 10Y', sym: 'ORCHPHARMA', name: 'Orchid Pharma', expected: '-12.4%', originalStatus: 'Incorrect' },
  { page: 18, metric: 'profitGrowth1Y', label: 'Profit 1Y', sym: 'UEL', name: 'Ujaas Energy', expected: '-64.3%', originalStatus: 'Incorrect' },
  { page: 19, metric: 'profitGrowth3Y', label: 'Profit 3Y', sym: 'OAL', name: 'Oriental Aromatics', expected: '-44.9%', originalStatus: 'Incorrect' },
  { page: 20, metric: 'profitGrowth5Y', label: 'Profit 5Y', sym: 'CENTUM', name: 'Centum Electronics', expected: '14.2%', originalStatus: 'Incorrect' },
  { page: 21, metric: 'profitGrowth10Y', label: 'Profit 10Y', sym: 'TECHNVISN', name: 'Technvision Ventures', expected: '18.5%', originalStatus: 'Incorrect' },
  { page: 22, metric: 'epsGrowth', label: 'EPS Growth', sym: 'INDOKEM', name: 'Indokem', expected: '-41.0%', originalStatus: 'Correct' },
  { page: 23, metric: 'ebitdaGrowth', label: 'EBITDA Growth', sym: 'PVP', name: 'PVP Ventures', expected: '4500.0%', originalStatus: 'Incorrect' },
  { page: 24, metric: 'qtrSalesGrowthYoY', label: 'Quarterly Sales YoY', sym: 'JUNIPER', name: 'Juniper Green Energy', expected: '19.4%', originalStatus: 'Incorrect' },
  { page: 25, metric: 'qtrProfitGrowthYoY', label: 'Quarterly Profit YoY', sym: 'PROZONER', name: 'Prozone Realty', expected: '32.6%', originalStatus: 'Incorrect' },

  // 3. Profitability
  { page: 26, metric: 'roce', label: 'ROCE', sym: 'TIMEX', name: 'Timex', expected: '64.8%', originalStatus: 'Incorrect' },
  { page: 27, metric: 'roe', label: 'ROE', sym: 'NESTLEIND', name: 'Nestle India', expected: '99.2%', originalStatus: 'Incorrect' },
  { page: 28, metric: 'roic', label: 'ROIC', sym: 'TIPSMUSIC', name: 'Tips Music', expected: '68.4%', originalStatus: 'Incorrect' },
  { page: 29, metric: 'roa', label: 'ROA', sym: 'BRIGADE', name: 'Brigade', expected: '3.2%', originalStatus: 'Incorrect' },
  { page: 30, metric: 'opm', label: 'OPM', sym: 'ADANIGREEN', name: 'Adani Green Energy', expected: '91.1%', originalStatus: 'Incorrect' },
  { page: 31, metric: 'npm', label: 'NPM', sym: 'JSWHL', name: 'JSW Holdings', expected: '81.7%', originalStatus: 'Incorrect' },
  { page: 32, metric: 'grossMargin', label: 'Gross Margin', sym: 'AVANTEL', name: 'Avantel', expected: '49.5%', originalStatus: 'Incorrect' },
  { page: 33, metric: 'ebitdaMargin', label: 'EBITDA Margin', sym: 'NTPCGREEN', name: 'NTPC Green Energy', expected: '88.5%', originalStatus: 'Incorrect' },

  // 4. Financial Health & Balance Sheet
  { page: 34, metric: 'debtToEquity', label: 'D/E', sym: 'DELTAMAGNT', name: 'Delta Manufacturing', expected: '17.33x', originalStatus: 'Correct' },
  { page: 35, metric: 'netDebt', label: 'Net Debt', sym: 'DIXON', name: 'Dixon', expected: '₹640 Cr', originalStatus: 'Incorrect' },
  { page: 36, metric: 'interestCoverage', label: 'Interest Coverage', sym: 'COFORGE', name: 'Coforge', expected: '9.4x', originalStatus: 'Incorrect' },
  { page: 37, metric: 'currentRatio', label: 'Current Ratio', sym: 'JIOFIN', name: 'Jio Financial Services', expected: '—', originalStatus: 'Incorrect' },
  { page: 38, metric: 'quickRatio', label: 'Quick Ratio', sym: 'MAHSCOOTER', name: 'Maharashtra Scooters', expected: '—', originalStatus: 'Incorrect' },
  { page: 39, metric: 'cfo', label: 'CFO', sym: 'TECHM', name: 'Tech Mahindra', expected: '₹3,890 Cr', originalStatus: 'Incorrect' },
  { page: 40, metric: 'freeCashFlow', label: 'FCF', sym: 'WIPRO', name: 'Wipro Limited', expected: '₹16,200 Cr', originalStatus: 'Incorrect' },
  { page: 41, metric: 'cashConversionCycle', label: 'Cash Cycle', sym: 'SUNPHARMA', name: 'Sun Pharma', expected: '195', originalStatus: 'Incorrect' },
  { page: 42, metric: 'workingCapitalDays', label: 'WC Days', sym: 'DEEPAKNTR', name: 'Deepak Nitrite Limited', expected: '72', originalStatus: 'Incorrect' },
  { page: 43, metric: 'capex', label: 'Capex', sym: 'INFY', name: 'Infosys', expected: '₹4,530 Cr', originalStatus: 'Incorrect' },
  { page: 44, metric: 'debtReduction3Y', label: 'Debt Reduction 3Y', sym: 'TATAMOTORS', name: 'Tata Motors', expected: '58.5%', originalStatus: 'Incorrect' },

  // 5. Financial Strength
  { page: 45, metric: 'piotroskiScore', label: 'Piotroski', sym: 'ASIANPAINT', name: 'Asian Paints', expected: '8', originalStatus: 'Incorrect' },
  { page: 46, metric: 'altmanZScore', label: 'Altman Z', sym: 'ACC', name: 'ACC', expected: '5.21x', originalStatus: 'Incorrect' },

  // 6. Ownership
  { page: 47, metric: 'promoterHolding', label: 'Promoter %', sym: 'POLYCAB', name: 'Polycab', expected: '64.24%', originalStatus: 'Incorrect' },
  { page: 48, metric: 'promoterHoldingChange3Y', label: 'Promoter Change 3Y', sym: 'LTIM', name: 'LTIMindtree', expected: '-0.05%', originalStatus: 'Incorrect' },
  { page: 49, metric: 'promoterHolding', label: 'Promoter %', sym: 'HCLTECH', name: 'HCL Tech', expected: '62.76%', originalStatus: 'Correct' },
  { page: 50, metric: 'fiiHolding', label: 'FII', sym: 'PERSISTENT', name: 'Persistent Systems', expected: '23.85%', originalStatus: 'Incorrect' },
  { page: 51, metric: 'diiHolding', label: 'DII', sym: 'TCS', name: 'TCS', expected: '10.82%', originalStatus: 'Incorrect' },
  { page: 52, metric: 'publicHolding', label: 'Public', sym: 'HDFCBANK', name: 'HDFC Bank', expected: '17.45%', originalStatus: 'Correct' },

  // 7. Market
  { page: 53, metric: 'volume', label: 'Volume', sym: 'DIXON', name: 'Dixon', expected: '3,28,520', originalStatus: 'Incorrect' },
  { page: 54, metric: 'beta', label: 'Beta', sym: 'INFY', name: 'Infosys', expected: '0.76x', originalStatus: 'Incorrect' },
];

console.log('='.repeat(95));
console.log('       MI007 SCREENER: 54 FINANCIAL SCREENING TEST CASES VERIFICATION SUITE');
console.log('='.repeat(95));
console.log(
  'Pg'.padEnd(5) +
  'Metric'.padEnd(22) +
  'Company'.padEnd(24) +
  'Symbol'.padEnd(12) +
  'Expected'.padEnd(16) +
  'Resolved'.padEnd(16) +
  'Status'
);
console.log('─'.repeat(95));

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const zd = findZerodhaStockBySymbol(tc.sym) || { symbol: tc.sym, name: tc.name, token: 1000, exchange: 'NSE', sector: 'Diversified' };
  const fundamental = generateFundamentalFromZerodha(zd);
  const rawVal = getMetricValue(fundamental, tc.metric);
  const formatted = formatMetricValue(rawVal, tc.metric, '₹');
  const isMatch = formatted === tc.expected;

  if (isMatch) {
    passed++;
  } else {
    failed++;
  }

  console.log(
    String(tc.page).padEnd(5) +
    tc.label.padEnd(22) +
    tc.name.slice(0, 22).padEnd(24) +
    tc.sym.padEnd(12) +
    tc.expected.padEnd(16) +
    formatted.padEnd(16) +
    (isMatch ? '✓ PASS' : '✗ FAIL')
  );
}

console.log('='.repeat(95));
console.log(`TOTAL RESULT: ${passed} PASSED, ${failed} FAILED out of ${testCases.length} test cases.`);
if (failed === 0) {
  console.log('🎉 100% AUDIT ACCURACY: ALL 54 TEST CASES MATCH AUDITED VALUES EXACTLY!');
} else {
  console.error(`FAILED: ${failed} test case discrepancies detected.`);
  process.exit(1);
}
