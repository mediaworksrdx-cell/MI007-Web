import fs from 'fs';

const cachePath = 'lib/screener/indiaFundamentalsCache.json';
const compResultsPath = 'scripts/comparison-results.json';

const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const compResults = JSON.parse(fs.readFileSync(compResultsPath, 'utf8'));

let updatedCount = 0;

for (const item of compResults) {
  const sym = item.sym;
  const scr = item.screener;
  if (!scr) continue;

  if (!cache[sym]) {
    cache[sym] = {};
  }

  const c = cache[sym];

  // Align PE
  const scrPe = parseFloat(scr['Stock P/E'] || scr.pe);
  if (!isNaN(scrPe) && scrPe > 0) {
    c.pe = +(scrPe.toFixed(1));
  }

  // Align ROCE (Crucial fix for banks where ROCE was inflated to ROE)
  const scrRoce = parseFloat(scr['ROCE'] || scr.roce);
  if (!isNaN(scrRoce)) {
    c.roce = +(scrRoce.toFixed(1));
    c.roce3YAvg = +(scrRoce.toFixed(1));
  }

  // Align ROE
  const scrRoe = parseFloat(scr['ROE'] || scr.roe);
  if (!isNaN(scrRoe)) {
    c.roe = +(scrRoe.toFixed(1));
    c.roe3YAvg = +(scrRoe.toFixed(1));
  }

  // Align 3Y Sales Growth
  const scrSales3Y = parseFloat(scr.sales3Y || scr['Compounded Sales Growth']?.['3 Years']);
  if (!isNaN(scrSales3Y)) {
    c.salesGrowth3Y = +(scrSales3Y.toFixed(1));
  }

  // Align 3Y Profit Growth
  const scrProfit3Y = parseFloat(scr.profit3Y || scr['Compounded Profit Growth']?.['3 Years']);
  if (!isNaN(scrProfit3Y)) {
    c.profitGrowth3Y = +(scrProfit3Y.toFixed(1));
  }

  // Align Debt to Equity
  const scrDe = parseFloat(scr.de || scr['D/E']);
  if (!isNaN(scrDe)) {
    c.debtToEquity = +(scrDe.toFixed(2));
  }

  // Align Dividend Yield
  const scrDiv = parseFloat(scr.div || scr['Dividend Yield']);
  if (!isNaN(scrDiv)) {
    c.dividendYield = +(scrDiv.toFixed(2));
  }

  // Align OPM (for non-financials)
  const scrOpm = parseFloat(scr.opm || scr['OPM']);
  if (!isNaN(scrOpm)) {
    c.opm = +(scrOpm.toFixed(1));
  }

  // Re-calculate Price to Sales using audited sales if available
  if (c.marketCap && c.revenue && c.revenue > 0) {
    c.priceToSales = +(c.marketCap / c.revenue).toFixed(2);
  }

  updatedCount++;
}

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
console.log(`Successfully aligned ${updatedCount} bellwether companies with Screener.in official figures.`);
