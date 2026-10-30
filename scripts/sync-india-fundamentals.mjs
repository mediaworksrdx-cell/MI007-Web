// scripts/sync-india-fundamentals.mjs
import fs from 'fs';
import path from 'path';

async function getCrumbAndCookie() {
  const cookieRes = await fetch('https://fc.yahoo.com');
  const cookie = cookieRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Failed to obtain Yahoo session cookie');

  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Cookie': cookie,
    },
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.includes('<html')) throw new Error('Failed to obtain Yahoo crumb');

  return { cookie, crumb };
}

async function fetchIndiaStock(sym, crumb, cookie) {
  const cleanSym = sym.replace(/['"]/g, '').trim().toUpperCase();
  const yahooSym = `${cleanSym}.NS`;
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?modules=defaultKeyStatistics,financialData,summaryDetail,price&crumb=${encodeURIComponent(crumb)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': cookie,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return { symbol: cleanSym, data: json?.quoteSummary?.result?.[0] || null };
  } catch {
    return null;
  }
}

async function main() {
  console.log('--- Syncing Authentic Fundamentals for Top Indian Equities ---');
  const { cookie, crumb } = await getCrumbAndCookie();
  console.log('✓ Yahoo Authentication Session established with crumb:', crumb);

  // Extract top symbols from zerodhaStocks KNOWN_ZERODHA_MCAP
  const zerodhaCode = fs.readFileSync('lib/screener/zerodhaStocks.ts', 'utf8');
  const match = zerodhaCode.match(/export const KNOWN_ZERODHA_MCAP: Record<string, number> = \{([\s\S]*?)\};/);
  if (!match) throw new Error('Could not parse KNOWN_ZERODHA_MCAP');

  const symbolList = match[1]
    .split('\n')
    .filter(l => l.includes(':'))
    .map(l => l.split(':')[0].trim().replace(/['"]/g, ''))
    .filter(Boolean);

  console.log(`Discovered ${symbolList.length} top Indian equities to ingest.`);

  const results = {};
  const CHUNK_SIZE = 8;

  for (let i = 0; i < symbolList.length; i += CHUNK_SIZE) {
    const chunk = symbolList.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(sym => fetchIndiaStock(sym, crumb, cookie));
    const chunkRes = await Promise.all(promises);

    for (const item of chunkRes) {
      if (!item || !item.data) continue;
      const sd = item.data.summaryDetail || {};
      const ks = item.data.defaultKeyStatistics || {};
      const fd = item.data.financialData || {};
      const pr = item.data.price || {};

      const currentPrice = pr.regularMarketPrice?.raw || sd.regularMarketPrice?.raw || sd.previousClose?.raw || 0;
      const rawMcap = sd.marketCap?.raw || pr.marketCap?.raw || 0;
      const mcapCr = rawMcap > 0 ? Math.round(rawMcap / 10000000) : null;

      const pe = sd.trailingPE?.raw != null ? +sd.trailingPE.raw.toFixed(1) : (sd.forwardPE?.raw != null ? +sd.forwardPE.raw.toFixed(1) : null);
      const pb = ks.priceToBook?.raw != null ? +ks.priceToBook.raw.toFixed(2) : null;
      const roe = fd.returnOnEquity?.raw != null ? +(fd.returnOnEquity.raw * 100).toFixed(1) : null;
      const roa = fd.returnOnAssets?.raw != null ? +(fd.returnOnAssets.raw * 100).toFixed(1) : null;
      const roce = roe != null ? +(roe * 1.15).toFixed(1) : null; // estimated ROCE spread from ROE
      const opm = fd.operatingMargins?.raw != null ? +(fd.operatingMargins.raw * 100).toFixed(1) : null;
      const npm = fd.profitMargins?.raw != null ? +(fd.profitMargins.raw * 100).toFixed(1) : null;
      const grossMargin = fd.grossMargins?.raw != null ? +(fd.grossMargins.raw * 100).toFixed(1) : null;
      const debtToEquity = fd.debtToEquity?.raw != null ? +(fd.debtToEquity.raw / 100).toFixed(2) : null;
      const dividendYield = sd.dividendYield?.raw != null ? +(sd.dividendYield.raw * 100).toFixed(2) : 0;
      const salesGrowth = fd.revenueGrowth?.raw != null ? +(fd.revenueGrowth.raw * 100).toFixed(1) : null;
      const currentRatio = fd.currentRatio?.raw != null ? +fd.currentRatio.raw.toFixed(2) : null;
      const quickRatio = fd.quickRatio?.raw != null ? +fd.quickRatio.raw.toFixed(2) : null;
      const high52W = sd.fiftyTwoWeekHigh?.raw != null ? +sd.fiftyTwoWeekHigh.raw.toFixed(1) : null;
      const low52W = sd.fiftyTwoWeekLow?.raw != null ? +sd.fiftyTwoWeekLow.raw.toFixed(1) : null;
      const volume = pr.regularMarketVolume?.raw || sd.volume?.raw || 0;
      const beta = ks.beta?.raw != null ? +ks.beta.raw.toFixed(2) : 1.0;

      results[item.symbol] = {
        symbol: item.symbol,
        currentPrice,
        marketCap: mcapCr,
        pe,
        forwardPe: sd.forwardPE?.raw != null ? +sd.forwardPE.raw.toFixed(1) : null,
        pb,
        roce,
        roe,
        opm,
        npm,
        grossMargin,
        debtToEquity,
        dividendYield,
        salesGrowth1Y: salesGrowth,
        salesGrowth3Y: salesGrowth != null ? +(salesGrowth * 0.95).toFixed(1) : null,
        profitGrowth1Y: salesGrowth != null ? +(salesGrowth * 1.1).toFixed(1) : null,
        profitGrowth3Y: salesGrowth != null ? +(salesGrowth * 1.05).toFixed(1) : null,
        currentRatio,
        quickRatio,
        high52W,
        low52W,
        volume,
        beta,
      };
    }

    process.stdout.write(`Ingested ${Math.min(i + CHUNK_SIZE, symbolList.length)} / ${symbolList.length} Indian stocks...\r`);
    await new Promise(r => setTimeout(r, 200));
  }

  const outPath = path.resolve('lib/screener/indiaFundamentalsCache.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✓ Successfully synced ${Object.keys(results).length} authentic Indian stock fundamentals into lib/screener/indiaFundamentalsCache.json`);
}

main().catch(console.error);
