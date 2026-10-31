import { getCompaniesByMarket } from '../lib/screener/data.ts';

const list = getCompaniesByMarket('INDIA');
const sorted = [...list].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

console.log('Top 60 by Market Cap in MI-007:');
sorted.slice(0, 60).forEach((c, idx) => {
  console.log(
    `${String(idx + 1).padStart(2)}. ${c.symbol.padEnd(12)} | ₹${String(c.currentPrice).padEnd(8)} | MCap: ₹${String(c.marketCap).padEnd(8)} Cr | P/E: ${String(c.pe).padEnd(6)} | ROCE: ${String(c.roce).padEnd(6)}% | ROE: ${String(c.roe).padEnd(6)}% | Sales3Y: ${String(c.salesGrowth3Y).padEnd(6)}% | Profit3Y: ${String(c.profitGrowth3Y).padEnd(6)}% | D/E: ${String(c.debtToEquity).padEnd(5)} | Div: ${String(c.dividendYield).padEnd(5)}% | OPM: ${String(c.opm)}%`
  );
});
