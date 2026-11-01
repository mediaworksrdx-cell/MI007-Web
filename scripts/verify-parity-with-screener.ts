import fs from 'fs';
import { getCompanyBySymbol } from '../lib/screener/data';

interface CompData {
  sym: string;
  name: string;
  our: any;
  screener: any;
}

const symbols = [
  { sym: 'RELIANCE', name: 'Reliance Industries' },
  { sym: 'TCS', name: 'Tata Consultancy Services' },
  { sym: 'HDFCBANK', name: 'HDFC Bank' },
  { sym: 'BHARTIARTL', name: 'Bharti Airtel' },
  { sym: 'ICICIBANK', name: 'ICICI Bank' },
  { sym: 'INFY', name: 'Infosys' },
  { sym: 'SBIN', name: 'State Bank of India' },
  { sym: 'LT', name: 'Larsen & Toubro' },
  { sym: 'HINDUNILVR', name: 'Hindustan Unilever' },
  { sym: 'ITC', name: 'ITC Limited' }
];

async function run() {
  const compResults = JSON.parse(fs.readFileSync('scripts/comparison-results.json', 'utf8'));

  console.log('='.repeat(100));
  console.log('           BENCHMARK PARITY AUDIT: MI007 vs SCREENER.IN (OFFICIAL BSE/NSE FILINGS)');
  console.log('='.repeat(100));

  for (const item of symbols) {
    const miComp = getCompanyBySymbol(item.sym);
    const scrComp = compResults.find((c: any) => c.sym === item.sym)?.screener || {};

    console.log(`\n>>> [${item.sym}] ${item.name}`);
    console.log('-'.repeat(80));
    console.log('Metric'.padEnd(20) + 'MI007'.padEnd(20) + 'Screener.in'.padEnd(20) + 'Variance / Parity');
    console.log('-'.repeat(80));

    const check = (label: string, miVal: any, scrVal: any, suffix = '') => {
      const miStr = miVal != null ? `${miVal}${suffix}` : '—';
      const scrStr = scrVal != null && scrVal !== '' ? `${scrVal}${suffix}` : '—';
      let parity = 'MATCH';
      if (miStr === '—' && scrStr === '—') parity = 'MATCH (N/A)';
      else if (miStr === '—' || scrStr === '—') parity = 'NOTE (Standard diff)';
      else {
        const numMi = parseFloat(String(miVal).replace(/[^0-9.-]/g, ''));
        const numScr = parseFloat(String(scrVal).replace(/[^0-9.-]/g, ''));
        if (!isNaN(numMi) && !isNaN(numScr)) {
          const diff = Math.abs(numMi - numScr);
          const pct = numScr !== 0 ? (diff / Math.abs(numScr)) * 100 : 0;
          parity = pct < 5 ? 'EXACT / TIGHT ( <5% )' : `VARIANCE (${pct.toFixed(1)}%)`;
        }
      }
      console.log(label.padEnd(20) + miStr.padEnd(20) + scrStr.padEnd(20) + parity);
    };

    check('Price (₹)', miComp?.currentPrice, scrComp['price']);
    check('Market Cap (₹ Cr)', miComp?.marketCap, scrComp['mcap']);
    check('P/E Ratio', miComp?.pe, scrComp['pe'], 'x');
    check('ROCE', miComp?.roce, scrComp['roce'], '%');
    check('ROE', miComp?.roe, scrComp['roe'], '%');
    check('Sales 3Y CAGR', miComp?.salesGrowth3Y, scrComp['sales3Y'], '%');
    check('Profit 3Y CAGR', miComp?.profitGrowth3Y, scrComp['profit3Y'], '%');
    check('Debt to Equity', miComp?.debtToEquity, scrComp['de'], 'x');
    check('Dividend Yield', miComp?.dividendYield, scrComp['div'], '%');
  }
}

run().catch(console.error);
