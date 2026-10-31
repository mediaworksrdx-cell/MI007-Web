import { getCompaniesByMarket } from '../lib/screener/data.ts';

const list = getCompaniesByMarket('INDIA');
console.log('Total India companies:', list.length);
for (const sym of ['RELIANCE', 'TCS', 'HDFCBANK', 'BHARTIARTL', 'ICICIBANK', 'INFY', 'SBIN', 'ITC', 'HINDUNILVR', 'LT', 'HCLTECH', 'BAJFINANCE', 'SUNPHARMA', 'NTPC']) {
  const c = list.find(x => x.symbol === sym);
  if (c) {
    console.log(sym.padEnd(12), '| Price:', String(c.currentPrice).padEnd(8), '| MCap:', String(c.marketCap).padEnd(8), '| PE:', String(c.pe).padEnd(6), '| ROCE:', String(c.roce).padEnd(6), '| ROE:', String(c.roe).padEnd(6), '| Sales3Y:', String(c.salesGrowth3Y).padEnd(6), '| Profit3Y:', String(c.profitGrowth3Y).padEnd(6), '| DE:', String(c.debtToEquity).padEnd(6), '| DivY:', String(c.dividendYield).padEnd(6), '| OPM:', String(c.opm));
  } else {
    console.log(sym, 'NOT FOUND');
  }
}
