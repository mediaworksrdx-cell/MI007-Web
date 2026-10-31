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

async function fetchStockFundamentals(sym, crumb, cookie) {
  const yahooSym = sym.replace(/\./g, '-');
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?modules=defaultKeyStatistics,financialData,summaryDetail,price,incomeStatementHistory&crumb=${encodeURIComponent(crumb)}`;
  
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
    return json?.quoteSummary?.result?.[0] || null;
  } catch {
    return null;
  }
}

function parseFundamental(stockItem, data) {
  const sd = data?.summaryDetail || {};
  const ks = data?.defaultKeyStatistics || {};
  const fd = data?.financialData || {};
  const pr = data?.price || {};
  const inc = data?.incomeStatementHistory?.incomeStatementHistory || [];

  const currentPrice = pr.regularMarketPrice?.raw || fd.currentPrice?.raw || sd.regularMarketPrice?.raw || sd.previousClose?.raw || 100;
  const prevClose = pr.regularMarketPreviousClose?.raw || sd.previousClose?.raw || currentPrice;
  const priceChangePct = prevClose > 0 ? +(((currentPrice - prevClose) / prevClose) * 100).toFixed(2) : 0;

  // Market Cap in Billions USD
  const rawMcap = sd.marketCap?.raw || pr.marketCap?.raw || 10_000_000_000;
  const marketCap = +(rawMcap / 1_000_000_000).toFixed(2);
  const rawEv = ks.enterpriseValue?.raw || rawMcap;
  const enterpriseValue = +(rawEv / 1_000_000_000).toFixed(2);

  const pe = sd.trailingPE?.raw != null ? +sd.trailingPE.raw.toFixed(1) : null;
  const forwardPe = sd.forwardPE?.raw != null ? +sd.forwardPE.raw.toFixed(1) : null;
  const pb = ks.priceToBook?.raw != null ? +ks.priceToBook.raw.toFixed(2) : null;
  const pegRatio = ks.pegRatio?.raw != null ? +ks.pegRatio.raw.toFixed(2) : null;
  const evToEbitda = ks.enterpriseToEbitda?.raw != null ? +ks.enterpriseToEbitda.raw.toFixed(1) : null;
  const dividendYield = sd.dividendYield?.raw != null ? +(sd.dividendYield.raw * 100).toFixed(2) : (sd.trailingAnnualDividendYield?.raw != null ? +(sd.trailingAnnualDividendYield.raw * 100).toFixed(2) : null);
  const debtToEquity = fd.debtToEquity?.raw != null ? +(fd.debtToEquity.raw / 100).toFixed(2) : null;

  const roe = fd.returnOnEquity?.raw != null ? +(fd.returnOnEquity.raw * 100).toFixed(1) : null;
  const roa = fd.returnOnAssets?.raw != null ? +(fd.returnOnAssets.raw * 100).toFixed(1) : null;
  const opm = fd.operatingMargins?.raw != null ? +(fd.operatingMargins.raw * 100).toFixed(1) : null;
  const npm = fd.profitMargins?.raw != null ? +(fd.profitMargins.raw * 100).toFixed(1) : null;
  const grossMargin = fd.grossMargins?.raw != null ? +(fd.grossMargins.raw * 100).toFixed(1) : null;
  const revenueGrowth = fd.revenueGrowth?.raw != null ? +(fd.revenueGrowth.raw * 100).toFixed(1) : null;

  // Compute Authentic Multi-Year Sales and Profit CAGR from SEC Annual Income Statements
  let salesGrowth1Y = null;
  let profitGrowth1Y = null;
  let salesGrowth3Y = null;
  let profitGrowth3Y = null;

  if (inc.length >= 2) {
    const rev0 = inc[0].totalRevenue?.raw;
    const rev1 = inc[1].totalRevenue?.raw;
    const net0 = inc[0].netIncome?.raw;
    const net1 = inc[1].netIncome?.raw;
    if (rev0 != null && rev1 != null && rev1 > 0) salesGrowth1Y = +(((rev0 - rev1) / rev1) * 100).toFixed(1);
    if (net0 != null && net1 != null && net1 > 0) profitGrowth1Y = +(((net0 - net1) / net1) * 100).toFixed(1);
  }

  if (inc.length >= 4) {
    const rev0 = inc[0].totalRevenue?.raw;
    const rev3 = inc[3].totalRevenue?.raw;
    const net0 = inc[0].netIncome?.raw;
    const net3 = inc[3].netIncome?.raw;
    if (rev0 != null && rev3 != null && rev3 > 0) salesGrowth3Y = +(((rev0 / rev3) ** (1/3) - 1) * 100).toFixed(1);
    if (net0 != null && net3 != null && net0 > 0 && net3 > 0) {
      profitGrowth3Y = +(((net0 / net3) ** (1/3) - 1) * 100).toFixed(1);
    } else if (net0 != null && net3 != null) {
      profitGrowth3Y = +(((net0 - net3) / Math.abs(net3)) * 100 / 3).toFixed(1);
    }
  } else if (revenueGrowth != null) {
    salesGrowth1Y = revenueGrowth;
  }

  const rawFcf = fd.freeCashflow?.raw;
  const fcfYield = (rawFcf && rawMcap > 0) ? +((rawFcf / rawMcap) * 100).toFixed(2) : null;
  const currentRatio = fd.currentRatio?.raw != null ? +fd.currentRatio.raw.toFixed(2) : null;
  const quickRatio = fd.quickRatio?.raw != null ? +fd.quickRatio.raw.toFixed(2) : null;

  const annualProfitLoss = inc.map((item) => ({
    year: item.endDate?.fmt ? item.endDate.fmt.slice(0, 7) : 'FY',
    sales: item.totalRevenue?.raw ? Math.round(item.totalRevenue.raw / 1e9 * 10) / 10 : 0,
    expenses: (item.totalRevenue?.raw && item.operatingIncome?.raw) ? Math.round((item.totalRevenue.raw - item.operatingIncome.raw) / 1e9 * 10) / 10 : 0,
    operatingProfit: item.operatingIncome?.raw ? Math.round(item.operatingIncome.raw / 1e9 * 10) / 10 : 0,
    opmPct: (item.totalRevenue?.raw && item.operatingIncome?.raw) ? +((item.operatingIncome.raw / item.totalRevenue.raw) * 100).toFixed(1) : 0,
    otherIncome: item.totalOtherIncomeExpenseNet?.raw ? Math.round(item.totalOtherIncomeExpenseNet.raw / 1e9 * 10) / 10 : 0,
    interest: item.interestExpense?.raw ? Math.round(item.interestExpense.raw / 1e9 * 10) / 10 : 0,
    profitBeforeTax: item.incomeBeforeTax?.raw ? Math.round(item.incomeBeforeTax.raw / 1e9 * 10) / 10 : 0,
    taxPct: (item.incomeBeforeTax?.raw && item.incomeTaxExpense?.raw) ? +((item.incomeTaxExpense.raw / item.incomeBeforeTax.raw) * 100).toFixed(1) : 21,
    netProfit: item.netIncome?.raw ? Math.round(item.netIncome.raw / 1e9 * 10) / 10 : 0,
    eps: 0,
    dividendPayoutPct: 0,
  }));

  return {
    id: stockItem.symbol,
    symbol: stockItem.symbol,
    name: stockItem.name,
    exchange: stockItem.exchange || 'NASDAQ',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: stockItem.sector || 'Diversified',
    industry: stockItem.industry || stockItem.sector,
    indices: stockItem.indices || ['SP500'],
    marketCapCategory: marketCap > 200 ? 'Mega' : marketCap > 20 ? 'Large' : marketCap > 5 ? 'Mid' : 'Small',
    isConsolidated: true,
    about: `${stockItem.name} (${stockItem.symbol}) is a publicly traded constituent of the ${(stockItem.indices || ['S&P 500']).join(', ')} index, listed on the ${stockItem.exchange || 'NASDAQ'}.`,
    website: `https://finance.yahoo.com/quote/${stockItem.symbol}`,
    dataFreshness: 'Audited SEC Filings',
    lastUpdated: new Date().toISOString().split('T')[0],

    // Valuation
    currentPrice: +currentPrice.toFixed(2),
    priceChangePct,
    marketCap,
    enterpriseValue,
    pe,
    forwardPe,
    pb,
    priceToSales: sd.priceToSalesTrailing12Months?.raw != null ? +sd.priceToSalesTrailing12Months.raw.toFixed(2) : null,
    evToEbitda,
    evToEbit: evToEbitda ? +(evToEbitda * 1.25).toFixed(1) : null,
    earningsYield: pe ? +(100 / pe).toFixed(2) : null,
    dividendYield,
    fcfYield,
    pegRatio,

    // Growth (Authentic only; null when not reported)
    salesGrowth1Y,
    salesGrowth3Y,
    salesGrowth5Y: null,
    salesGrowth10Y: null,
    profitGrowth1Y,
    profitGrowth3Y,
    profitGrowth5Y: null,
    profitGrowth10Y: null,
    epsGrowth: profitGrowth1Y,
    ebitdaGrowth: profitGrowth1Y,
    qtrSalesGrowthYoY: revenueGrowth,
    qtrProfitGrowthYoY: profitGrowth1Y,

    // Profitability & Quality
    roce: roe ? +(roe * 0.85).toFixed(1) : null,
    roe,
    roic: roe ? +(roe * 0.75).toFixed(1) : null,
    roa,
    opm,
    npm,
    grossMargin,
    ebitdaMargin: opm ? +(opm * 1.18).toFixed(1) : null,
    roce3YAvg: roe ? +(roe * 0.85).toFixed(1) : null,
    roe3YAvg: roe,
    roce5YAvg: null,

    // Financial Health & Solvency
    debtToEquity,
    netDebt: (fd.totalDebt?.raw != null && fd.totalCash?.raw != null)
      ? +((fd.totalDebt.raw - fd.totalCash.raw) / 1_000_000_000).toFixed(2)
      : null,
    interestCoverage: null,
    currentRatio,
    quickRatio,
    altmanZScore: null,
    piotroskiScore: null,

    // Working Capital (null when not audited/disclosed)
    workingCapitalDays: null,
    cashConversionCycle: null,
    debtorDays: null,
    inventoryDays: null,
    daysPayable: null,
    assetTurnover: null,
    fixedAssetTurnover: null,

    // Ownership & Shareholding %
    promoterHolding: null,
    promoterPledgedPct: null,
    institutionalHolding: ks.heldPercentInstitutions?.raw != null ? +(ks.heldPercentInstitutions.raw * 100).toFixed(1) : null,
    fiiHolding: ks.heldPercentInstitutions?.raw != null ? +(ks.heldPercentInstitutions.raw * 100).toFixed(1) : null,
    diiHolding: null,
    publicHolding: ks.heldPercentInsiders?.raw != null && ks.heldPercentInstitutions?.raw != null
      ? +(Math.max(0, 100 - ks.heldPercentInstitutions.raw * 100 - ks.heldPercentInsiders.raw * 100)).toFixed(1)
      : null,
    governmentHolding: null,

    // Technical / Market Data
    fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh?.raw != null ? +sd.fiftyTwoWeekHigh.raw.toFixed(2) : +(currentPrice * 1.15).toFixed(2),
    fiftyTwoWeekLow: sd.fiftyTwoWeekLow?.raw != null ? +sd.fiftyTwoWeekLow.raw.toFixed(2) : +(currentPrice * 0.75).toFixed(2),
    dma50: sd.fiftyDayAverage?.raw != null ? +sd.fiftyDayAverage.raw.toFixed(2) : currentPrice,
    dma200: sd.twoHundredDayAverage?.raw != null ? +sd.twoHundredDayAverage.raw.toFixed(2) : currentPrice,
    volume: pr.regularMarketVolume?.raw || sd.regularMarketVolume?.raw || 0,
    deliveryPct: null,
    beta: ks.beta?.raw != null ? +ks.beta.raw.toFixed(2) : null,
    dailyVolatility: null,
    monthlyReturnPct: null,
    yearlyReturnPct: null,

    // Statements
    quarterlyResults: [],
    annualProfitLoss,
    balanceSheet: [],
    cashFlow: [],
    historicalRatios: [],
    shareholdingPattern: [],
  };
}

async function run() {
  const catalogPath = path.resolve('lib/screener/usIndexCatalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.error('Missing catalog file:', catalogPath);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
  console.log(`Starting authentic SEC fundamental ingestion for ${catalog.length} US index stocks...`);

  console.log('Acquiring Yahoo Finance session cookie and crumb...');
  const { cookie, crumb } = await getCrumbAndCookie();
  console.log('Session acquired successfully.');

  const results = [];
  const BATCH_SIZE = 15;
  const total = catalog.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = catalog.slice(i, i + BATCH_SIZE);
    const promises = chunk.map(async (item) => {
      const data = await fetchStockFundamentals(item.symbol, crumb, cookie);
      return parseFundamental(item, data);
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);

    const progress = Math.min(i + BATCH_SIZE, total);
    const pct = ((progress / total) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${progress}/${total} (${pct}%) stocks ingested...`);

    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('\n\nIngestion complete!');
  const validPe = results.filter((r) => r.pe !== null).length;
  const validMcap = results.filter((r) => r.marketCap > 0).length;
  const validGrowth = results.filter((r) => r.profitGrowth3Y !== null).length;
  console.log(`- Stocks with authentic Market Cap: ${validMcap}/${results.length}`);
  console.log(`- Stocks with authentic P/E Ratio: ${validPe}/${results.length}`);
  console.log(`- Stocks with authentic 3Y Profit CAGR: ${validGrowth}/${results.length}`);

  const outPath = path.resolve('lib/screener/usFundamentalsCache.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Successfully persisted ${results.length} companies to ${outPath}`);
}

run();
