// scripts/build-us-catalog.mjs
import fs from 'fs';
import path from 'path';

// 30 Dow Jones Industrial Average Constituents (Official 2026)
const DOW30_SYMBOLS = new Set([
  'AAPL', 'AMGN', 'AMZN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS',
  'GS', 'HD', 'HON', 'IBM', 'JNJ', 'JPM', 'KO', 'MCD', 'MMM', 'MRK',
  'MSFT', 'NKE', 'NVDA', 'PG', 'SHW', 'TRV', 'UNH', 'V', 'VZ', 'WMT'
]);

// 101 NASDAQ 100 Constituents (Official 2026)
const NASDAQ100_SYMBOLS = new Set([
  'AAPL', 'ABNB', 'ADBE', 'ADI', 'ADP', 'ADSK', 'AEP', 'AMAT', 'AMD', 'AMGN',
  'AMZN', 'ANSS', 'APP', 'ARM', 'ASML', 'AVGO', 'AXON', 'AZN', 'BIIB', 'BKNG',
  'BKR', 'CCEP', 'CDNS', 'CDW', 'CEG', 'CHTR', 'CPRT', 'CRWD', 'CSCO', 'CSGP',
  'CSX', 'CTAS', 'CTSH', 'DASH', 'DDOG', 'DLTR', 'DXCM', 'EA', 'EXC', 'FANG',
  'FAST', 'FTNT', 'GEHC', 'GFS', 'GILD', 'GOOG', 'GOOGL', 'HON', 'IDXX', 'INTC',
  'INTU', 'ISRG', 'KDP', 'KHC', 'KLAC', 'LIN', 'LRCX', 'LULU', 'MAR', 'MCHP',
  'MDLZ', 'MELI', 'META', 'MNST', 'MRNA', 'MRVL', 'MSFT', 'MSTR', 'MU', 'NFLX',
  'NVDA', 'NXPI', 'ODFL', 'ON', 'ORLY', 'PANW', 'PAYX', 'PCAR', 'PDD', 'PEP',
  'PLTR', 'PYPL', 'QCOM', 'REGN', 'ROP', 'ROST', 'SBUX', 'SNPS', 'TEAM', 'TMUS',
  'TSLA', 'TTD', 'TTWO', 'TXN', 'VRSK', 'VRTX', 'WBD', 'WDAY', 'XEL', 'ZS'
]);

async function fetchSp500Wikipedia() {
  try {
    const res = await fetch('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const tableMatch = html.match(/<table[^>]*id="constituents"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) throw new Error('Could not find constituents table');
    
    const rows = tableMatch[1].match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const companies = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = [...row.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)].map(m => {
        return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\n/g, '').trim();
      });
      if (cells.length >= 4) {
        const symbol = cells[0].replace(/\./g, '-'); // e.g. BRK.B -> BRK-B or BRK.B
        const name = cells[1];
        const sector = cells[2] || 'Diversified';
        const industry = cells[3] || sector;
        if (symbol) {
          companies.push({ symbol: symbol.replace('-', '.'), rawSymbol: symbol, name, sector, industry });
        }
      }
    }
    return companies;
  } catch (err) {
    console.error('Wikipedia fetch error:', err.message);
    return [];
  }
}

async function run() {
  console.log('Fetching S&P 500 constituents from official Wikipedia source...');
  let sp500 = await fetchSp500Wikipedia();
  console.log(`Retrieved ${sp500.length} S&P 500 constituents.`);

  if (sp500.length === 0) {
    console.error('Failed to retrieve S&P 500 constituents.');
    process.exit(1);
  }

  // Deduplicate and merge indices
  const catalogMap = new Map();

  for (const c of sp500) {
    const sym = c.symbol.toUpperCase();
    const indices = ['SP500'];
    if (NASDAQ100_SYMBOLS.has(sym)) indices.push('NASDAQ100');
    if (DOW30_SYMBOLS.has(sym)) indices.push('DOW30');

    catalogMap.set(sym, {
      symbol: sym,
      name: c.name,
      sector: c.sector,
      industry: c.industry,
      indices,
      exchange: sym.length <= 3 && !['AMD', 'EA', 'KHC'].includes(sym) ? 'NYSE' : 'NASDAQ',
      country: 'United States',
      currency: 'USD',
    });
  }

  // Add any NASDAQ 100 or DOW 30 symbols not in S&P 500
  for (const sym of NASDAQ100_SYMBOLS) {
    if (!catalogMap.has(sym)) {
      catalogMap.set(sym, {
        symbol: sym,
        name: sym,
        sector: 'Information Technology',
        industry: 'Technology',
        indices: ['NASDAQ100'],
        exchange: 'NASDAQ',
        country: 'United States',
        currency: 'USD',
      });
    }
  }

  for (const sym of DOW30_SYMBOLS) {
    if (!catalogMap.has(sym)) {
      catalogMap.set(sym, {
        symbol: sym,
        name: sym,
        sector: 'Industrial',
        industry: 'Conglomerate',
        indices: ['DOW30'],
        exchange: 'NYSE',
        country: 'United States',
        currency: 'USD',
      });
    }
  }

  const catalog = Array.from(catalogMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
  console.log(`Total Deduplicated US Index Universe: ${catalog.length} stocks`);

  const sp500Count = catalog.filter(c => c.indices.includes('SP500')).length;
  const ndxCount = catalog.filter(c => c.indices.includes('NASDAQ100')).length;
  const dowCount = catalog.filter(c => c.indices.includes('DOW30')).length;

  console.log(`- S&P 500: ${sp500Count} stocks`);
  console.log(`- NASDAQ 100: ${ndxCount} stocks`);
  console.log(`- Dow Jones 30: ${dowCount} stocks`);

  const outPath = path.resolve('lib/screener/usIndexCatalog.json');
  fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`Successfully wrote catalog to ${outPath}`);
}

run();
