import { generateFundamentalFromZerodha } from '../lib/screener/zerodhaStocks';
import { getMetricValue } from '../lib/screener/metrics';
import { calculateAltmanZScore } from '../lib/screener/scorecards';

const testItems = [
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Financial Services', exchange: 'NSE', token: 492033 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Limited', sector: 'Financial Services', exchange: 'NSE', token: 81153 },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', sector: 'Automobile', exchange: 'NSE', token: 519937 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', sector: 'Metals & Mining', exchange: 'NSE', token: 6401 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Healthcare', exchange: 'NSE', token: 857857 },
  { symbol: 'AQYLON', name: 'Aqylon Industries', sector: 'Industrials', exchange: 'NSE', token: 9999 },
  { symbol: 'ITC', name: 'ITC Limited', sector: 'Consumer Goods', exchange: 'NSE', token: 424961 },
  { symbol: 'NESTLEIND', name: 'Nestle India', sector: 'Consumer Goods', exchange: 'NSE', token: 457537 },
  { symbol: 'DIXON', name: 'Dixon Technologies', sector: 'Consumer Durables', exchange: 'NSE', token: 574209 },
  { symbol: 'SUZLON', name: 'Suzlon Energy', sector: 'Capital Goods', exchange: 'NSE', token: 1044481 },
];

console.log('════════════════════════════════════════════════════════════════════════');
console.log('REMEDIATED PIPELINE VERIFICATION RESULTS');
console.log('════════════════════════════════════════════════════════════════════════\n');

for (const item of testItems) {
  const fund = generateFundamentalFromZerodha(item);
  const altmanObj = calculateAltmanZScore(fund);
  console.log(`[${fund.symbol}] - ${fund.name}`);
  console.log(`  Sector: ${fund.sector}`);
  console.log(`  Altman Z (Metric): ${getMetricValue(fund, 'altmanZScore') ?? 'N/A (Excluded)'} | Scorecard: ${altmanObj.score ?? 'N/A'} (${altmanObj.zone})`);
  console.log(`  Cash Conversion Cycle: ${getMetricValue(fund, 'cashConversionCycle') ?? 'N/A'} days`);
  console.log(`  Working Capital Days: ${getMetricValue(fund, 'workingCapitalDays') ?? 'N/A'} days`);
  console.log(`  Gross Margin: ${getMetricValue(fund, 'grossMargin') != null ? `${getMetricValue(fund, 'grossMargin')}%` : 'N/A'}`);
  console.log(`  Dividend Yield: ${getMetricValue(fund, 'dividendYield') != null ? `${getMetricValue(fund, 'dividendYield')}%` : 'N/A'}`);
  console.log(`  CFO: ${getMetricValue(fund, 'cfo') != null ? `₹${getMetricValue(fund, 'cfo')} Cr` : 'N/A'}`);
  console.log(`  Free Cash Flow: ${getMetricValue(fund, 'freeCashFlow') != null ? `₹${getMetricValue(fund, 'freeCashFlow')} Cr` : 'N/A'}`);
  console.log(`  FCF Yield: ${getMetricValue(fund, 'fcfYield') != null ? `${getMetricValue(fund, 'fcfYield')}%` : 'N/A'}`);
  console.log(`  Profit Growth 3Y: ${getMetricValue(fund, 'profitGrowth3Y') != null ? `${getMetricValue(fund, 'profitGrowth3Y')}%` : 'N/A'}`);
  console.log(`  Profit Growth 10Y: ${getMetricValue(fund, 'profitGrowth10Y') != null ? `${getMetricValue(fund, 'profitGrowth10Y')}%` : 'N/A'}`);
  console.log(`  EBITDA Growth: ${getMetricValue(fund, 'ebitdaGrowth') != null ? `${getMetricValue(fund, 'ebitdaGrowth')}%` : 'N/A'}`);
  console.log('');
}
