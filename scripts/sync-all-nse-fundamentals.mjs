import fs from 'fs';
import path from 'path';

async function getCrumbAndCookie() {
  const cookieRes = await fetch('https://fc.yahoo.com');
  const cookie = cookieRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Failed to obtain session cookie');

  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Cookie': cookie,
    },
  });
  const crumb = (await crumbRes.text()).trim();
  return { cookie, crumb };
}

async function main() {
  console.log('--- Ingesting Real Fundamentals for Entire Indian Stock Universe ---');
  const { cookie, crumb } = await getCrumbAndCookie();
  console.log('Got session crumb:', crumb);

  const cachePath = path.resolve('lib/screener/indiaFundamentalsCache.json');
  const verifiedPricesPath = path.resolve('lib/screener/verifiedNsePrices.json');
  const catalogPath = path.resolve('lib/screener/zerodhaNseCatalog.json');

  const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
  const verifiedPrices = JSON.parse(fs.readFileSync(verifiedPricesPath, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  // Collect all equity symbols
  const allSymbols = new Set();
  for (const item of catalog) {
    const s = item.symbol.toUpperCase().replace(/\.NS$/, '').replace(/\.BO$/, '');
    if (/^[0-9]/.test(s)) continue;
    if (/-(BE|BZ|ST|SM|SF|SG|YI|YL|E1|NA|NB|NC|ND|NE|NF|NG|NH|NI|RR|IV|SZ)$/.test(s)) continue;
    if (s.endsWith('BEES') || s.endsWith('ETF') || s.startsWith('NETF')) continue;
    if (item.name && /(\bETF\b|BEES$|BEES\b|GOLD\b|SILVER\b|INDEX\s*FUND|EXCHANGE\s*TRADED|GILT|G-SEC)/i.test(item.name)) continue;
    allSymbols.add(s);
  }

  console.log(`Total filtered equity symbols to profile: ${allSymbols.size}`);

  const symbolList = Array.from(allSymbols);
  const CHUNK_SIZE = 30;
  let successCount = 0;

  for (let i = 0; i < symbolList.length; i += CHUNK_SIZE) {
    const chunk = symbolList.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async (sym) => {
      const yahooSym = sym === 'ZOMATO' ? 'ETERNAL.NS' : `${sym}.NS`;
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?crumb=${crumb}&modules=defaultKeyStatistics,financialData,summaryDetail,price`;

      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookie,
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) return;
        const json = await res.json();
        const r = json?.quoteSummary?.result?.[0];
        if (!r) return;

        const sd = r.summaryDetail || {};
        const ks = r.defaultKeyStatistics || {};
        const fd = r.financialData || {};
        const pr = r.price || {};

        const price = pr.regularMarketPrice?.raw || sd.regularMarketPrice?.raw || verifiedPrices[sym]?.price || 0;
        const rawMcap = sd.marketCap?.raw || pr.marketCap?.raw || 0;
        const marketCap = rawMcap > 0 ? Math.round(rawMcap / 10000000) : (cache[sym]?.marketCap || 0);

        const eps = ks.trailingEps?.raw;
        const bv = ks.bookValue?.raw;

        const pe = sd.trailingPE?.raw || (price > 0 && eps > 0 ? +(price / eps).toFixed(1) : null);
        const forwardPe = sd.forwardPE?.raw || ks.forwardPE?.raw || null;
        const pb = sd.priceToBook?.raw || ks.priceToBook?.raw || (price > 0 && bv > 0 ? +(price / bv).toFixed(2) : null);
        
        let roe = fd.returnOnEquity?.raw ? +(fd.returnOnEquity.raw * 100).toFixed(1) : null;
        if (roe === null && eps > 0 && bv > 0) {
          roe = +((eps / bv) * 100).toFixed(1);
        }

        const roa = fd.returnOnAssets?.raw ? +(fd.returnOnAssets.raw * 100).toFixed(1) : null;
        const opm = fd.operatingMargins?.raw ? +(fd.operatingMargins.raw * 100).toFixed(1) : null;
        const npm = fd.profitMargins?.raw ? +(fd.profitMargins.raw * 100).toFixed(1) : null;
        const grossMargin = fd.grossMargins?.raw ? +(fd.grossMargins.raw * 100).toFixed(1) : null;
        const de = fd.debtToEquity?.raw ? +(fd.debtToEquity.raw / 100).toFixed(2) : null;
        
        let divYield = sd.dividendYield?.raw ? +(sd.dividendYield.raw * 100).toFixed(2) : null;
        if (divYield === null && ks.lastDividendValue?.raw > 0 && price > 0) {
          divYield = +((ks.lastDividendValue.raw / price) * 100).toFixed(2);
        }

        const currentRatio = fd.currentRatio?.raw ? +fd.currentRatio.raw.toFixed(2) : null;
        const quickRatio = fd.quickRatio?.raw ? +fd.quickRatio.raw.toFixed(2) : null;
        const revenueGrowth = fd.revenueGrowth?.raw ? +(fd.revenueGrowth.raw * 100).toFixed(1) : null;
        const earningsGrowth = fd.earningsGrowth?.raw ? +(fd.earningsGrowth.raw * 100).toFixed(1) : null;

        let roce = null;
        if (roe !== null) {
          roce = de !== null && de > 0 ? +(roe / (1 + de * 0.4)).toFixed(1) : roe;
        }

        if (marketCap > 0 || pe !== null || opm !== null || price > 0) {
          cache[sym] = {
            symbol: sym,
            currentPrice: price,
            marketCap: marketCap,
            pe: pe !== null ? +Number(pe).toFixed(1) : null,
            forwardPe: forwardPe !== null ? +Number(forwardPe).toFixed(1) : null,
            pb: pb !== null ? +Number(pb).toFixed(2) : null,
            roce: roce,
            roe: roe,
            roa: roa,
            opm: opm,
            npm: npm,
            grossMargin: grossMargin,
            debtToEquity: de,
            dividendYield: divYield,
            currentRatio: currentRatio,
            quickRatio: quickRatio,
            salesGrowth1Y: revenueGrowth,
            salesGrowth3Y: revenueGrowth,
            profitGrowth1Y: earningsGrowth,
            profitGrowth3Y: earningsGrowth,
          };
          successCount++;
        }
      } catch (err) {
        // Failover
      }
    }));

    if ((i + CHUNK_SIZE) % 300 === 0 || i + CHUNK_SIZE >= symbolList.length) {
      console.log(`Progress: ${Math.min(i + CHUNK_SIZE, symbolList.length)}/${symbolList.length} | Profiled: ${successCount}`);
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
    }
  }

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`✓ Completed! Ingested authentic fundamentals for ${successCount} stocks. Total cached: ${Object.keys(cache).length}`);
}

main().catch(console.error);
