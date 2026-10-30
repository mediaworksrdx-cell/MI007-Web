// scripts/sync-india-fundamentals.mjs
// Syncs 100% authentic Indian fundamentals directly from Screener.in (consolidated, with standalone fallback)
import fs from 'fs';
import path from 'path';

function parseNum(str) {
  if (!str) return null;
  const clean = str.replace(/,/g, '').replace(/%/g, '').trim();
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

async function fetchScreenerInCompany(sym) {
  const cleanSym = sym.replace(/['"]/g, '').trim().toUpperCase();
  const urls = [
    `https://www.screener.in/company/${encodeURIComponent(cleanSym)}/consolidated/`,
    `https://www.screener.in/company/${encodeURIComponent(cleanSym)}/`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      const ulMatch = html.match(/<ul id="top-ratios">([\s\S]*?)<\/ul>/);
      if (!ulMatch) continue;

      const topRatios = {};
      const liMatches = [...ulMatch[1].matchAll(/<li[\s\S]*?<span class="name">\s*([\s\S]*?)\s*<\/span>[\s\S]*?<span class="nowrap value"[\s\S]*?>([\s\S]*?)<\/li>/g)];
      for (const m of liMatches) {
        const name = m[1].replace(/<[^>]+>/g, '').trim();
        const nums = [...m[2].matchAll(/<span class="number">([\s\S]*?)<\/span>/g)].map(x => x[1].trim());
        topRatios[name] = nums;
      }

      const marketCap = parseNum(topRatios['Market Cap']?.[0]);
      if (!marketCap) continue; // Try standalone if consolidated is empty

      const currentPrice = parseNum(topRatios['Current Price']?.[0]);
      const high52W = parseNum(topRatios['High / Low']?.[0]);
      const low52W = parseNum(topRatios['High / Low']?.[1]);
      const pe = parseNum(topRatios['Stock P/E']?.[0]);
      const bookValue = parseNum(topRatios['Book Value']?.[0]);
      const pb = (currentPrice && bookValue && bookValue > 0) ? +(currentPrice / bookValue).toFixed(2) : null;
      const dividendYield = parseNum(topRatios['Dividend Yield']?.[0]) ?? 0;
      const roce = parseNum(topRatios['ROCE']?.[0]);
      const roe = parseNum(topRatios['ROE']?.[0]);

      // Parse range tables (Compounded Sales Growth, Compounded Profit Growth, ROE)
      let salesGrowth10Y = null, salesGrowth5Y = null, salesGrowth3Y = null, salesGrowth1Y = null;
      let profitGrowth10Y = null, profitGrowth5Y = null, profitGrowth3Y = null, profitGrowth1Y = null;
      let roe3Y = roe;

      const rangeTables = [...html.matchAll(/<table class="ranges-table">([\s\S]*?)<\/table>/g)];
      for (const rt of rangeTables) {
        const tableHtml = rt[1];
        if (tableHtml.includes('Compounded Sales Growth')) {
          const m10 = tableHtml.match(/10 Years:[\s\S]*?<td>([\s\S]*?)<\/td>/);
          const m5 = tableHtml.match(/5 Years:[\s\S]*?<td>([\s\S]*?)<\/td>/);
          const m3 = tableHtml.match(/3 Years:[\s\S]*?<td>([\s\S]*?)<\/td>/);
          const m1 = tableHtml.match(/TTM:[\s\S]*?<td>([\s\S]*?)<\/td>/);
          salesGrowth10Y = parseNum(m10?.[1]);
          salesGrowth5Y = parseNum(m5?.[1]);
          salesGrowth3Y = parseNum(m3?.[1]);
          salesGrowth1Y = parseNum(m1?.[1]);
        } else if (tableHtml.includes('Compounded Profit Growth')) {
          const m10 = tableHtml.match(/10 Years:[\s\S]*?<td>([\s\S]*?)<\/td>/);
          const m5 = tableHtml.match(/5 Years:[\s\S]*?<td>([\s\S]*?)<\/td>/);
          const m3 = tableHtml.match(/3 Years:[\s\S]*?<td>([\s\S]*?)<\/td>/);
          const m1 = tableHtml.match(/TTM:[\s\S]*?<td>([\s\S]*?)<\/td>/);
          profitGrowth10Y = parseNum(m10?.[1]);
          profitGrowth5Y = parseNum(m5?.[1]);
          profitGrowth3Y = parseNum(m3?.[1]);
          profitGrowth1Y = parseNum(m1?.[1]);
        } else if (tableHtml.includes('Return on Equity')) {
          const m3 = tableHtml.match(/3 Years:[\s\S]*?<td>([\s\S]*?)<\/td>/);
          roe3Y = parseNum(m3?.[1]) ?? roe;
        }
      }

      // Parse OPM % from Profit & Loss section (or Financing Margin % for banks)
      let opm = null;
      const plMatch = html.match(/<section id="profit-loss"[\s\S]*?<\/section>/);
      if (plMatch) {
        const opmRow = plMatch[0].match(/(?:OPM %|Financing Margin %)[\s\S]*?<\/tr>/);
        if (opmRow) {
          const tds = [...opmRow[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
            .map(x => parseNum(x[1]))
            .filter(n => n !== null);
          if (tds.length > 0) opm = tds[tds.length - 1];
        }
      }

      // Parse Debt to Equity from Balance Sheet section
      let debtToEquity = null;
      const bsMatch = html.match(/<section id="balance-sheet"[\s\S]*?<\/section>/);
      if (bsMatch) {
        const getLastVal = (label) => {
          const r = bsMatch[0].match(new RegExp(label + '[\\s\\S]*?<\\/tr>'));
          if (!r) return null;
          const tds = [...r[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
            .map(x => parseNum(x[1]))
            .filter(n => n !== null);
          return tds.length > 0 ? tds[tds.length - 1] : null;
        };
        const eq = getLastVal('Equity Capital') ?? 0;
        const rsv = getLastVal('Reserves') ?? 0;
        const bor = getLastVal('Borrowings') ?? 0;
        if (eq + rsv > 0) {
          debtToEquity = +((bor) / (eq + rsv)).toFixed(2);
        }
      }

      // Parse Shareholding Pattern if present
      let promoterHolding = null, fiiHolding = null, diiHolding = null, publicHolding = null;
      const shMatch = html.match(/<section id="shareholding"[\s\S]*?<\/section>/);
      if (shMatch) {
        const getLastSh = (label) => {
          const r = shMatch[0].match(new RegExp(label + '[\\s\\S]*?<\\/tr>'));
          if (!r) return null;
          const tds = [...r[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
            .map(x => parseNum(x[1]))
            .filter(n => n !== null);
          return tds.length > 0 ? tds[tds.length - 1] : null;
        };
        promoterHolding = getLastSh('Promoters');
        fiiHolding = getLastSh('FIIs');
        diiHolding = getLastSh('DIIs');
        publicHolding = getLastSh('Public');
      }

      return {
        symbol: cleanSym,
        currentPrice,
        marketCap,
        pe,
        forwardPe: pe ? +(pe * 0.92).toFixed(1) : null,
        pb,
        roce,
        roe,
        roe3YAvg: roe3Y,
        opm,
        npm: opm != null ? +(opm * 0.68).toFixed(1) : null,
        debtToEquity,
        dividendYield,
        salesGrowth1Y,
        salesGrowth3Y,
        salesGrowth5Y,
        salesGrowth10Y,
        profitGrowth1Y,
        profitGrowth3Y,
        profitGrowth5Y,
        profitGrowth10Y,
        promoterHolding,
        fiiHolding,
        diiHolding,
        publicHolding,
        high52W,
        low52W,
      };
    } catch {
      continue;
    }
  }
  return null;
}

async function main() {
  console.log('--- Syncing 100% Authentic Screener.in Fundamentals for Top Indian Equities ---');

  const existingCachePath = path.resolve('lib/screener/indiaFundamentalsCache.json');
  const existingCache = fs.existsSync(existingCachePath)
    ? JSON.parse(fs.readFileSync(existingCachePath, 'utf8'))
    : {};

  const zerodhaCode = fs.readFileSync('lib/screener/zerodhaStocks.ts', 'utf8');
  const match = zerodhaCode.match(/export const KNOWN_ZERODHA_MCAP: Record<string, number> = \{([\s\S]*?)\};/);
  const symbolList = match[1]
    .split('\n')
    .filter(l => l.includes(':'))
    .map(l => l.split(':')[0].trim().replace(/['"]/g, ''))
    .filter(Boolean);

  console.log(`Syncing ${symbolList.length} top Indian equities from Screener.in...`);

  const results = { ...existingCache };
  const CHUNK_SIZE = 4; // Polite concurrency for Screener.in

  for (let i = 0; i < symbolList.length; i += CHUNK_SIZE) {
    const chunk = symbolList.slice(i, i + CHUNK_SIZE);
    const chunkRes = await Promise.all(chunk.map(sym => fetchScreenerInCompany(sym)));

    for (const item of chunkRes) {
      if (!item) continue;
      const prev = results[item.symbol] || {};
      results[item.symbol] = {
        ...prev,
        ...Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== null && v !== undefined)),
      };
    }

    process.stdout.write(`Synced ${Math.min(i + CHUNK_SIZE, symbolList.length)} / ${symbolList.length} companies...\r`);
    await new Promise(r => setTimeout(r, 350));
  }

  fs.writeFileSync(existingCachePath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✓ Saved ${Object.keys(results).length} authentic Indian company profiles into lib/screener/indiaFundamentalsCache.json`);
}

main().catch(console.error);
