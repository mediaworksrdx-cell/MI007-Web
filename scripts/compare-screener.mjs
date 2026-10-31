import fs from 'fs';
import { getCompaniesByMarket } from '../lib/screener/data.ts';

const list = getCompaniesByMarket('INDIA');

async function parseScreenerIn(sym) {
  const querySym = sym === 'ZOMATO' ? 'ETERNAL' : sym;
  let url = `https://www.screener.in/company/${encodeURIComponent(querySym)}/consolidated/`;
  let res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    }
  });
  let html = await res.text();

  const ratios = {};
  const liRegex = /<li[^>]*class="[^"]*flex flex-space-between[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = liRegex.exec(html)) !== null) {
    const block = m[1];
    const nameMatch = block.match(/<span class="name">\s*([\s\S]*?)\s*<\/span>/);
    const numMatches = [...block.matchAll(/<span class="number">([\s\S]*?)<\/span>/g)].map(x => x[1].replace(/,/g, '').trim());
    if (nameMatch && numMatches.length > 0) {
      const k = nameMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      ratios[k] = numMatches.length === 1 ? numMatches[0] : numMatches.join(' / ');
    }
  }

  // If no ROCE/ROE on consolidated, try standalone
  if (!ratios['ROCE'] || !ratios['ROE']) {
    url = `https://www.screener.in/company/${encodeURIComponent(querySym)}/`;
    res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    html = await res.text();
    while ((m = liRegex.exec(html)) !== null) {
      const block = m[1];
      const nameMatch = block.match(/<span class="name">\s*([\s\S]*?)\s*<\/span>/);
      const numMatches = [...block.matchAll(/<span class="number">([\s\S]*?)<\/span>/g)].map(x => x[1].replace(/,/g, '').trim());
      if (nameMatch && numMatches.length > 0) {
        const k = nameMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (!ratios[k]) ratios[k] = numMatches.length === 1 ? numMatches[0] : numMatches.join(' / ');
      }
    }
  }

  // Ranges table
  const rangesRegex = /<table class="ranges-table">([\s\S]*?)<\/table>/g;
  let rm;
  while ((rm = rangesRegex.exec(html)) !== null) {
    const tblock = rm[1];
    const thMatch = tblock.match(/<th[^>]*>([\s\S]*?)<\/th>/);
    if (!thMatch) continue;
    const title = thMatch[1].replace(/<[^>]+>/g, '').trim();
    const rowRegex = /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g;
    let rowm;
    const sub = {};
    while ((rowm = rowRegex.exec(tblock)) !== null) {
      const period = rowm[1].replace(/:/g, '').trim();
      const val = rowm[2].replace(/%/g, '').trim();
      sub[period] = val;
    }
    ratios[title] = sub;
  }

  // Profit loss OPM
  const plSectionMatch = html.match(/<section id="profit-loss"[\s\S]*?<\/section>/);
  if (plSectionMatch) {
    const plHtml = plSectionMatch[0];
    const opmRowMatch = plHtml.match(/(?:OPM|Financing Margin)\s*%[\s\S]*?<\/tr>/i);
    if (opmRowMatch) {
      const tds = [...opmRowMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => x[1].replace(/%/g, '').trim());
      if (tds.length > 1) {
        ratios['OPM'] = tds[tds.length - 1];
      }
    }
  }

  // Balance sheet Borrowings & Equity
  const bsSectionMatch = html.match(/<section id="balance-sheet"[\s\S]*?<\/section>/);
  if (bsSectionMatch) {
    const bsHtml = bsSectionMatch[0];
    const getLastRowVal = (labelPattern) => {
      const rMatch = bsHtml.match(new RegExp(labelPattern + '[\\s\\S]*?<\\/tr>', 'i'));
      if (!rMatch) return null;
      const tds = [...rMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => parseFloat(x[1].replace(/,/g, ''))).filter(x => !isNaN(x));
      return tds.length > 0 ? tds[tds.length - 1] : null;
    };
    const eqCap = getLastRowVal('Equity Capital');
    const reserves = getLastRowVal('Reserves');
    const borrowings = getLastRowVal('Borrowings');
    if (eqCap !== null && reserves !== null && borrowings !== null && (eqCap + reserves) > 0) {
      ratios['D/E'] = +(borrowings / (eqCap + reserves)).toFixed(2);
    }
  }

  return ratios;
}

const symbols = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'BHARTIARTL', 'ICICIBANK',
  'INFY', 'SBIN', 'ITC', 'HINDUNILVR', 'LT',
  'HCLTECH', 'BAJFINANCE', 'SUNPHARMA', 'NTPC', 'MARUTI',
  'TATAMOTORS', 'TITAN', 'KOTAKBANK', 'AXISBANK', 'ADANIENT'
];

console.log('Fetching Screener.in metrics...');
const results = [];
for (const sym of symbols) {
  try {
    const scr = await parseScreenerIn(sym);
    const our = list.find(x => x.symbol === sym) || {};
    results.push({
      sym,
      our: {
        price: our.currentPrice,
        mcap: our.marketCap,
        pe: our.pe,
        roce: our.roce,
        roe: our.roe,
        sales3Y: our.salesGrowth3Y,
        profit3Y: our.profitGrowth3Y,
        de: our.debtToEquity,
        div: our.dividendYield,
        opm: our.opm,
      },
      screener: {
        price: scr['Current Price'],
        mcap: scr['Market Cap'],
        pe: scr['Stock P/E'],
        roce: scr['ROCE'],
        roe: scr['ROE'],
        sales3Y: scr['Compounded Sales Growth']?.['3 Years'],
        profit3Y: scr['Compounded Profit Growth']?.['3 Years'],
        de: scr['D/E'],
        div: scr['Dividend Yield'],
        opm: scr['OPM'],
      }
    });
    console.log(`✓ Fetched ${sym}`);
    await new Promise(r => setTimeout(r, 200));
  } catch (err) {
    console.error(`Error on ${sym}:`, err.message);
  }
}

fs.writeFileSync('scripts/comparison-results.json', JSON.stringify(results, null, 2), 'utf8');
console.log('Saved comparison results to scripts/comparison-results.json');
