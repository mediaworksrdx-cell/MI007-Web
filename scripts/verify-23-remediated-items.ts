import { generateFundamentalFromZerodha } from '../lib/screener/zerodhaStocks';
import { getMetricValue } from '../lib/screener/metrics';
import { calculateAltmanZScore } from '../lib/screener/scorecards';

interface TestItem {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  metricKey: string;
  metricLabel: string;
  expectedDescription: string;
  validator: (val: any, fund: any) => { pass: boolean; display: string };
}

const auditList: TestItem[] = [
  {
    id: 1,
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel',
    sector: 'Telecommunications',
    metricKey: 'evToEbit',
    metricLabel: 'EV/EBIT',
    expectedDescription: '~17.66x (Consolidated lease-adjusted EV)',
    validator: (val) => ({ pass: Math.abs(val - 17.7) < 0.5, display: `${val}x` }),
  },
  {
    id: 2,
    symbol: 'AQYLON',
    name: 'Aqylon Industries',
    sector: 'Industrials',
    metricKey: 'dividendYield',
    metricLabel: 'Dividend Yield',
    expectedDescription: '0.00% (Post-NCLT insolvency capital reduction)',
    validator: (val) => ({ pass: val === 0.0, display: `${val}%` }),
  },
  {
    id: 3,
    symbol: 'ITC',
    name: 'ITC Limited',
    sector: 'Consumer Goods',
    metricKey: 'fcfYield',
    metricLabel: 'FCF Yield',
    expectedDescription: '4.41% – 5.01% (Audited CFO ₹19.2k Cr, Capex ₹3.1k Cr)',
    validator: (val) => ({ pass: Math.abs(val - 4.84) < 0.5, display: `${val}%` }),
  },
  {
    id: 4,
    symbol: 'ASIANPAINT',
    name: 'Asian Paints',
    sector: 'Consumer Goods',
    metricKey: 'pegRatio',
    metricLabel: 'PEG Ratio',
    expectedDescription: '~7.13x (Consensus forward normalized growth)',
    validator: (val) => ({ pass: Math.abs(val - 7.13) < 0.5, display: `${val}x` }),
  },
  {
    id: 5,
    symbol: 'NESTLEIND',
    name: 'Nestle India',
    sector: 'Consumer Goods',
    metricKey: 'profitGrowth3Y',
    metricLabel: 'Profit Growth 3Y',
    expectedDescription: '11.71% (Audited 3-year trailing profit CAGR)',
    validator: (val) => ({ pass: Math.abs(val - 11.7) < 0.5, display: `${val}%` }),
  },
  {
    id: 6,
    symbol: 'DIXON',
    name: 'Dixon Technologies',
    sector: 'Consumer Durables',
    metricKey: 'profitGrowth10Y',
    metricLabel: 'Profit Growth 10Y',
    expectedDescription: '57.24% (10-year compound profit expansion)',
    validator: (val) => ({ pass: Math.abs(val - 57.2) < 0.5, display: `${val}%` }),
  },
  {
    id: 7,
    symbol: 'SUZLON',
    name: 'Suzlon Energy',
    sector: 'Capital Goods',
    metricKey: 'ebitdaGrowth',
    metricLabel: 'EBITDA Growth',
    expectedDescription: '18.91% (Normalized annual EBITDA expansion)',
    validator: (val) => ({ pass: Math.abs(val - 18.9) < 0.5, display: `${val}%` }),
  },
  {
    id: 8,
    symbol: 'BRITANNIA',
    name: 'Britannia Industries',
    sector: 'Consumer Goods',
    metricKey: 'roce',
    metricLabel: 'ROCE',
    expectedDescription: '56.48% (Audited capital efficiency)',
    validator: (val) => ({ pass: Math.abs(val - 56.5) < 0.5, display: `${val}%` }),
  },
  {
    id: 9,
    symbol: 'COLPAL',
    name: 'Colgate Palmolive',
    sector: 'Consumer Goods',
    metricKey: 'roic',
    metricLabel: 'ROIC',
    expectedDescription: '83.66% (Asset-light return on invested capital)',
    validator: (val) => ({ pass: Math.abs(val - 83.7) < 0.5, display: `${val}%` }),
  },
  {
    id: 10,
    symbol: 'ADANIPORTS',
    name: 'Adani Ports & SEZ',
    sector: 'Services',
    metricKey: 'opm',
    metricLabel: 'Operating Margin (OPM)',
    expectedDescription: '~59.0% (Port operations core operating margin)',
    validator: (val) => ({ pass: Math.abs(val - 59.0) < 0.5, display: `${val}%` }),
  },
  {
    id: 11,
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical',
    sector: 'Healthcare',
    metricKey: 'grossMargin',
    metricLabel: 'Gross Margin',
    expectedDescription: '80.8% (Audited COGS excluding operating R&D/SG&A)',
    validator: (val) => ({ pass: Math.abs(val - 80.8) < 0.5, display: `${val}%` }),
  },
  {
    id: 12,
    symbol: 'ADANIPORTS',
    name: 'Adani Ports & SEZ',
    sector: 'Services',
    metricKey: 'ebitdaMargin',
    metricLabel: 'EBITDA Margin',
    expectedDescription: '~59.5% (Port operations cash EBITDA margin)',
    validator: (val) => ({ pass: Math.abs(val - 59.5) < 0.5, display: `${val}%` }),
  },
  {
    id: 13,
    symbol: 'PAGEIND',
    name: 'Page Industries',
    sector: 'Textiles',
    metricKey: 'roce3YAvg',
    metricLabel: '3Y Avg ROCE',
    expectedDescription: '~63.89% (3-year trailing average capital efficiency)',
    validator: (val) => ({ pass: Math.abs(val - 63.9) < 0.5, display: `${val}%` }),
  },
  {
    id: 14,
    symbol: 'GILLETTE',
    name: 'Gillette India',
    sector: 'Consumer Goods',
    metricKey: 'roe3YAvg',
    metricLabel: '3Y Avg ROE',
    expectedDescription: '49.0% – 51.05% (Audited return on equity)',
    validator: (val) => ({ pass: Math.abs(val - 50.2) < 1.0, display: `${val}%` }),
  },
  {
    id: 15,
    symbol: 'JSWSTEEL',
    name: 'JSW Steel',
    sector: 'Metals & Mining',
    metricKey: 'roce5YAvg',
    metricLabel: '5Y Avg ROCE',
    expectedDescription: '11.0% (Normalized cyclical trough return)',
    validator: (val) => ({ pass: Math.abs(val - 11.0) < 0.5, display: `${val}%` }),
  },
  {
    id: 16,
    symbol: 'ADANIENT',
    name: 'Adani Enterprises',
    sector: 'Metals & Mining',
    metricKey: 'netDebt',
    metricLabel: 'Net Debt',
    expectedDescription: '₹64,051 Cr (Excluding statutory airport lease liabilities)',
    validator: (val) => ({ pass: val === 64051, display: `₹${val.toLocaleString('en-IN')} Cr` }),
  },
  {
    id: 17,
    symbol: 'PCJEWELLER',
    name: 'PC Jeweller',
    sector: 'Consumer Durables',
    metricKey: 'currentRatio',
    metricLabel: 'Current Ratio',
    expectedDescription: '7.05x (Audited liquidity ratio)',
    validator: (val) => ({ pass: Math.abs(val - 7.05) < 0.5, display: `${val}x` }),
  },
  {
    id: 18,
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Limited',
    sector: 'Financial Services',
    metricKey: 'cfo',
    metricLabel: 'Cash From Operations (CFO)',
    expectedDescription: 'N/A (Excluded per Ind AS 109 / RBI lending book)',
    validator: (val) => ({ pass: val === null, display: val === null ? 'N/A (Excluded)' : `₹${val} Cr` }),
  },
  {
    id: 19,
    symbol: 'M&M',
    name: 'Mahindra & Mahindra',
    sector: 'Automobile',
    metricKey: 'cashConversionCycle',
    metricLabel: 'Cash Conversion Cycle (CCC)',
    expectedDescription: 'Negative -23 to -42 days (Supplier-funded float)',
    validator: (val) => ({ pass: val < 0 && Math.abs(val - (-38)) < 5, display: `${val} days` }),
  },
  {
    id: 20,
    symbol: 'ADANIENT',
    name: 'Adani Enterprises',
    sector: 'Metals & Mining',
    metricKey: 'workingCapitalDays',
    metricLabel: 'Working Capital Days',
    expectedDescription: '261 days (Consolidated trading & infrastructure cycle)',
    validator: (val) => ({ pass: val === 261, display: `${val} days` }),
  },
  {
    id: 21,
    symbol: 'ULTRACEMCO',
    name: 'UltraTech Cement',
    sector: 'Materials',
    metricKey: 'capex',
    metricLabel: 'Annual CapEx',
    expectedDescription: '₹9,450 Cr (Audited property/plant PPE expenditure)',
    validator: (val) => ({ pass: val === 9450, display: `₹${val.toLocaleString('en-IN')} Cr` }),
  },
  {
    id: 22,
    symbol: 'COALINDIA',
    name: 'Coal India',
    sector: 'Energy',
    metricKey: 'piotroskiScore',
    metricLabel: 'Piotroski Score',
    expectedDescription: '5–6 / 9 (Reflecting quarterly margin/sales deceleration)',
    validator: (val) => ({ pass: val <= 6 && val >= 5, display: `${val}/9` }),
  },
  {
    id: 23,
    symbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank',
    sector: 'Financial Services',
    metricKey: 'altmanZScore',
    metricLabel: 'Altman Z-Score',
    expectedDescription: 'N/A (Excluded: invalid for deposit-taking commercial banks)',
    validator: (val, fund) => {
      const zObj = calculateAltmanZScore(fund);
      const pass = val === null && zObj.score === null && zObj.zone === 'Not Applicable (Financial Institution)';
      return { pass, display: val === null ? 'N/A (Excluded)' : `${val} (${zObj.zone})` };
    },
  },
];

console.log('════════════════════════════════════════════════════════════════════════');
console.log('VERIFICATION OF THE 23 REMEDIATED DEFECTS');
console.log('════════════════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

for (const item of auditList) {
  const fund = generateFundamentalFromZerodha({
    symbol: item.symbol,
    name: item.name,
    sector: item.sector,
    exchange: 'NSE',
    token: 1000 + item.id,
  });

  const val = getMetricValue(fund, item.metricKey);
  const result = item.validator(val, fund);

  if (result.pass) {
    passCount++;
    console.log(`[PASS] #${item.id} ${item.name} (${item.symbol}) - ${item.metricLabel}`);
    console.log(`       App Value: ${result.display} | Expected: ${item.expectedDescription}`);
  } else {
    failCount++;
    console.error(`[FAIL] #${item.id} ${item.name} (${item.symbol}) - ${item.metricLabel}`);
    console.error(`       App Value: ${result.display} | Expected: ${item.expectedDescription}`);
  }
}

console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`AUDIT SCORECARD: ${passCount} / ${auditList.length} REMEDIATED CHECKS PASSED (${failCount} FAILED)`);
console.log('════════════════════════════════════════════════════════════════════════');

if (failCount > 0) {
  process.exit(1);
}
