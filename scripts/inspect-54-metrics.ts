import { generateFundamentalFromZerodha, findZerodhaStockBySymbol } from '../lib/screener/zerodhaStocks';
import { getMetricValue, formatMetricValue, resolveMetricKey } from '../lib/screener/metrics';

const testCases = [
  // 1. Valuation
  { page: 1, metric: 'marketCap', label: 'Market Cap', sym: 'RELIANCE', name: 'Reliance' },
  { page: 2, metric: 'currentPrice', label: 'Price', sym: 'BHARTIARTL', name: 'Bharti Airtel' },
  { page: 3, metric: 'pe', label: 'P/E Ratio', sym: 'ZOMATO', name: 'Zomato' },
  { page: 4, metric: 'forwardPe', label: 'Forward P/E Ratio', sym: 'BAJFINANCE', name: 'Bajaj Finance' },
  { page: 5, metric: 'pb', label: 'P/B', sym: 'TCS', name: 'TCS' },
  { page: 6, metric: 'priceToSales', label: 'P/S', sym: 'LT', name: 'Larsen & Toubro' },
  { page: 7, metric: 'enterpriseValue', label: 'EV', sym: 'CREATIVEYE', name: 'Creative Eye' },
  { page: 8, metric: 'evToEbitda', label: 'EV/EBITDA', sym: 'TCS', name: 'TCS (EV/EBITDA benchmark)' },
  { page: 9, metric: 'evToEbit', label: 'EV/EBIT', sym: 'ASIANTNE', name: 'Asian Tea & Exports' },
  { page: 10, metric: 'dividendYield', label: 'Dividend Yield', sym: 'SETCO', name: 'Setco Automotive Ltd' },
  { page: 11, metric: 'earningsYield', label: 'Earnings Yield', sym: 'NOIDATOLL', name: 'NOIDATOLL' },
  { page: 12, metric: 'fcfYield', label: 'FCF Yield', sym: 'MASKINVEST', name: 'Mask Investments Limited' },
  { page: 13, metric: 'pegRatio', label: 'PEG', sym: 'CONCOR', name: 'CONCOR' },

  // 2. Growth
  { page: 14, metric: 'salesGrowth1Y', label: 'Sales 1Y', sym: 'CUPID', name: 'Cupid' },
  { page: 15, metric: 'salesGrowth3Y', label: 'Sales 3Y', sym: 'NAZARA', name: 'Nazara Technologies' },
  { page: 16, metric: 'salesGrowth5Y', label: 'Sales 5Y', sym: 'TEGA', name: 'Tega Industries' },
  { page: 17, metric: 'salesGrowth10Y', label: 'Sales 10Y', sym: 'ORCHPHARMA', name: 'Orchid Pharma' },
  { page: 18, metric: 'profitGrowth1Y', label: 'Profit 1Y', sym: 'UEL', name: 'Ujaas Energy' },
  { page: 19, metric: 'profitGrowth3Y', label: 'Profit 3Y', sym: 'OAL', name: 'Oriental Aromatics' },
  { page: 20, metric: 'profitGrowth5Y', label: 'Profit 5Y', sym: 'CENTUM', name: 'Centum Electronics' },
  { page: 21, metric: 'profitGrowth10Y', label: 'Profit 10Y', sym: 'TECHNVISN', name: 'Technvision Ventures' },
  { page: 22, metric: 'epsGrowth', label: 'EPS Growth', sym: 'INDOKEM', name: 'Indokem' },
  { page: 23, metric: 'ebitdaGrowth', label: 'EBITDA Growth', sym: 'PVP', name: 'PVP Ventures' },
  { page: 24, metric: 'qtrSalesGrowthYoY', label: 'Quarterly Sales YoY', sym: 'JUNIPER', name: 'Juniper Green Energy' },
  { page: 25, metric: 'qtrProfitGrowthYoY', label: 'Quarterly Profit YoY', sym: 'PROZONER', name: 'Prozone Realty' },

  // 3. Profitability
  { page: 26, metric: 'roce', label: 'ROCE', sym: 'TIMEX', name: 'Timex' },
  { page: 27, metric: 'roe', label: 'ROE', sym: 'NESTLEIND', name: 'Nestle India' },
  { page: 28, metric: 'roic', label: 'ROIC', sym: 'TIPSMUSIC', name: 'Tips Music' },
  { page: 29, metric: 'roa', label: 'ROA', sym: 'BRIGADE', name: 'Brigade' },
  { page: 30, metric: 'opm', label: 'OPM', sym: 'ADANIGREEN', name: 'Adani Green Energy' },
  { page: 31, metric: 'npm', label: 'NPM', sym: 'JSWHL', name: 'JSW Holdings' },
  { page: 32, metric: 'grossMargin', label: 'Gross Margin', sym: 'AVANTEL', name: 'Avantel' },
  { page: 33, metric: 'ebitdaMargin', label: 'EBITDA Margin', sym: 'NTPCGREEN', name: 'NTPC Green Energy' },

  // 4. Financial Health & Balance Sheet
  { page: 34, metric: 'debtToEquity', label: 'D/E', sym: 'DELTAMAGNT', name: 'Delta Manufacturing' },
  { page: 35, metric: 'netDebt', label: 'Net Debt', sym: 'DIXON', name: 'Dixon' },
  { page: 36, metric: 'interestCoverage', label: 'Interest Coverage', sym: 'COFORGE', name: 'Coforge' },
  { page: 37, metric: 'currentRatio', label: 'Current Ratio', sym: 'JIOFIN', name: 'Jio Financial Services' },
  { page: 38, metric: 'quickRatio', label: 'Quick Ratio', sym: 'MAHSCOOTER', name: 'Maharashtra Scooters' },
  { page: 39, metric: 'cfo', label: 'CFO', sym: 'TECHM', name: 'Tech Mahindra' },
  { page: 40, metric: 'freeCashFlow', label: 'FCF', sym: 'WIPRO', name: 'Wipro Limited' },
  { page: 41, metric: 'cashConversionCycle', label: 'Cash Cycle', sym: 'SUNPHARMA', name: 'Sun Pharma' },
  { page: 42, metric: 'workingCapitalDays', label: 'WC Days', sym: 'DEEPAKNTR', name: 'Deepak Nitrite Limited' },
  { page: 43, metric: 'capex', label: 'Capex', sym: 'INFY', name: 'Infosys' },
  { page: 44, metric: 'debtReduction3Y', label: 'Debt Reduction 3Y', sym: 'TATAMOTORS', name: 'Tata Motors' },

  // 5. Financial Strength
  { page: 45, metric: 'piotroskiScore', label: 'Piotroski', sym: 'ASIANPAINT', name: 'Asian Paints' },
  { page: 46, metric: 'altmanZScore', label: 'Altman Z', sym: 'ACC', name: 'ACC' },

  // 6. Ownership
  { page: 47, metric: 'promoterHolding', label: 'Promoter %', sym: 'POLYCAB', name: 'Polycab' },
  { page: 48, metric: 'promoterHoldingChange3Y', label: 'Promoter Change 3Y', sym: 'LTIM', name: 'LTIMindtree' },
  { page: 49, metric: 'promoterHolding', label: 'Promoter %', sym: 'HCLTECH', name: 'HCL Tech' },
  { page: 50, metric: 'fiiHolding', label: 'FII', sym: 'PERSISTENT', name: 'Persistent Systems' },
  { page: 51, metric: 'diiHolding', label: 'DII', sym: 'TCS', name: 'TCS' },
  { page: 52, metric: 'publicHolding', label: 'Public', sym: 'HDFCBANK', name: 'HDFC Bank' },

  // 7. Market
  { page: 53, metric: 'volume', label: 'Volume', sym: 'DIXON', name: 'Dixon' },
  { page: 54, metric: 'beta', label: 'Beta', sym: 'INFY', name: 'Infosys' },
];

console.log('Page'.padEnd(6) + 'Metric'.padEnd(22) + 'Company'.padEnd(25) + 'Symbol'.padEnd(12) + 'Resolved Value');
console.log('─'.repeat(80));

for (const tc of testCases) {
  const zd = findZerodhaStockBySymbol(tc.sym) || { symbol: tc.sym, name: tc.name, token: 1000, exchange: 'NSE', sector: 'Diversified' };
  const fundamental = generateFundamentalFromZerodha(zd);
  const rawVal = getMetricValue(fundamental, tc.metric);
  const formatted = formatMetricValue(rawVal, tc.metric, '₹');
  console.log(
    String(tc.page).padEnd(6) +
    tc.label.padEnd(22) +
    tc.name.slice(0, 23).padEnd(25) +
    tc.sym.padEnd(12) +
    formatted
  );
}
