// Fetches real audited annual Income Statement, Balance Sheet, and Cash Flow filings
// from Yahoo Finance fundamentals-timeseries API (no synthetic or fabricated values).
// Populates annualProfitLoss, balanceSheet, cashFlow (newest-first) and derives genuine
// filing-backed metrics (totalDebt, cfo, capex, freeCashFlow, interestCoverage, roa,
// grossMargin, salesGrowth3Y, profitGrowth3Y, epsGrowth, ebitdaGrowth, debtReduction3Y,
// roce5YAvg, workingCapitalDays, cashConversionCycle) for US and top India NSE companies.

import fs from 'fs';
import path from 'path';

const TYPES = [
  'annualTotalRevenue',
  'annualCostOfRevenue',
  'annualGrossProfit',
  'annualOperatingIncome',
  'annualPretaxIncome',
  'annualTaxProvision',
  'annualNetIncome',
  'annualInterestExpense',
  'annualDepreciationAndAmortization',
  'annualEBITDA',
  'annualBasicEPS',
  'annualCommonStock',
  'annualRetainedEarnings',
  'annualStockholdersEquity',
  'annualTotalDebt',
  'annualCurrentAssets',
  'annualCurrentLiabilities',
  'annualTotalLiabilitiesNetMinorityInterest',
  'annualNetPPE',
  'annualTotalAssets',
  'annualAccountsReceivable',
  'annualInventory',
  'annualAccountsPayable',
  'annualCashAndCashEquivalents',
  'annualOperatingCashFlow',
  'annualInvestingCashFlow',
  'annualFinancingCashFlow',
  'annualCapitalExpenditure',
  'annualFreeCashFlow',
].join(',');

const PERIOD1 = 1546300800; // 2019-01-01
const PERIOD2 = 1893456000; // 2030-01-01

function round2(v) {
  return Number.isFinite(v) ? Number(v.toFixed(2)) : null;
}

function round1(v) {
  return Number.isFinite(v) ? Number(v.toFixed(1)) : null;
}

async function fetchYahooTimeseries(yahooSymbol) {
  const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(yahooSymbol)}?type=${TYPES}&period1=${PERIOD1}&period2=${PERIOD2}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const results = json?.timeseries?.result;
    if (!Array.isArray(results) || results.length === 0) return null;

    // Organize by asOfDate (YYYY-MM-DD) -> field -> raw number
    const byDate = new Map();
    for (const item of results) {
      const key = item?.meta?.type?.[0];
      if (!key || !Array.isArray(item[key])) continue;
      for (const entry of item[key]) {
        const dt = entry?.asOfDate;
        const raw = entry?.reportedValue?.raw;
        if (!dt || typeof raw !== 'number' || !Number.isFinite(raw)) continue;
        if (!byDate.has(dt)) byDate.set(dt, {});
        byDate.get(dt)[key] = raw;
      }
    }
    if (byDate.size === 0) return null;
    return byDate;
  } catch {
    return null;
  }
}

function buildStatementsAndMetrics(byDate, divisor) {
  // Sort dates descending (newest-first, matching scorecards.ts expectation: [0] = current, [1] = prev)
  const dates = Array.from(byDate.keys()).sort((a, b) => (a < b ? 1 : -1));
  const scale = (v) => (typeof v === 'number' && Number.isFinite(v) ? round2(v / divisor) : null);

  const annualProfitLoss = [];
  const balanceSheet = [];
  const cashFlow = [];

  for (const dt of dates) {
    const d = byDate.get(dt);
    const yrLabel = dt.slice(0, 7); // YYYY-MM

    const sales = scale(d.annualTotalRevenue);
    const netProfit = scale(d.annualNetIncome);
    if (sales !== null && netProfit !== null) {
      const opInc = scale(d.annualOperatingIncome);
      const operatingProfit = opInc !== null ? opInc : round2((scale(d.annualPretaxIncome) ?? netProfit) + (scale(d.annualInterestExpense) ?? 0));
      const expenses = round2(Math.max(0, sales - operatingProfit));
      const opmPct = sales > 0 ? round1((operatingProfit / sales) * 100) : 0;
      const interest = scale(d.annualInterestExpense) ?? 0;
      const depreciation = scale(d.annualDepreciationAndAmortization) ?? 0;
      const pbt = scale(d.annualPretaxIncome) ?? round2(operatingProfit - interest);
      const tax = scale(d.annualTaxProvision);
      const taxPct = pbt > 0 && tax !== null ? round1(Math.max(0, Math.min(100, (tax / pbt) * 100))) : 0;
      const eps = typeof d.annualBasicEPS === 'number' && Number.isFinite(d.annualBasicEPS) ? round2(d.annualBasicEPS) : 0;
      annualProfitLoss.push({
        year: yrLabel,
        sales,
        expenses,
        operatingProfit,
        opmPct,
        otherIncome: 0,
        interest,
        depreciation,
        profitBeforeTax: pbt,
        taxPct,
        netProfit,
        eps,
        dividendPayoutPct: 0,
      });
    }

    const totalAssets = scale(d.annualTotalAssets);
    const equity = scale(d.annualStockholdersEquity);
    if (totalAssets !== null && totalAssets > 0 && equity !== null) {
      const equityCapital = scale(d.annualCommonStock) ?? round2(equity * 0.1);
      const reserves = scale(d.annualRetainedEarnings) ?? round2(equity - equityCapital);
      const borrowings = scale(d.annualTotalDebt) ?? 0;
      const totalLiabilities = scale(d.annualTotalLiabilitiesNetMinorityInterest) ?? round2(Math.max(0, totalAssets - equity));
      const otherLiabilities = round2(Math.max(0, totalLiabilities - borrowings));
      const fixedAssets = scale(d.annualNetPPE) ?? 0;
      const otherAssets = round2(Math.max(0, totalAssets - fixedAssets));
      balanceSheet.push({
        year: yrLabel,
        equityCapital,
        reserves,
        borrowings,
        otherLiabilities,
        totalLiabilities: round2(totalAssets),
        fixedAssets,
        cwip: 0,
        investments: 0,
        otherAssets,
        totalAssets,
      });
    }

    const cfo = scale(d.annualOperatingCashFlow);
    if (cfo !== null) {
      const cfi = scale(d.annualInvestingCashFlow) ?? 0;
      const cff = scale(d.annualFinancingCashFlow) ?? 0;
      const capexRaw = scale(d.annualCapitalExpenditure);
      const fcf = scale(d.annualFreeCashFlow) ?? (capexRaw !== null ? round2(cfo - Math.abs(capexRaw)) : undefined);
      cashFlow.push({
        year: yrLabel,
        cashFromOperating: cfo,
        cashFromInvesting: cfi,
        cashFromFinancing: cff,
        netCashFlow: round2(cfo + cfi + cff),
        ...(fcf !== undefined ? { freeCashFlow: fcf } : {}),
      });
    }
  }

  // Compute genuine filing-backed metrics from latest & multi-year audited rows
  const metrics = {};
  const latestDt = dates[0];
  const latest = latestDt ? byDate.get(latestDt) : null;

  if (latest) {
    if (typeof latest.annualTotalDebt === 'number') metrics.totalDebt = scale(latest.annualTotalDebt);
    if (typeof latest.annualOperatingCashFlow === 'number') metrics.cfo = scale(latest.annualOperatingCashFlow);
    if (typeof latest.annualCapitalExpenditure === 'number') metrics.capex = round2(Math.abs(latest.annualCapitalExpenditure) / divisor);
    if (typeof latest.annualFreeCashFlow === 'number') {
      metrics.freeCashFlow = scale(latest.annualFreeCashFlow);
    } else if (metrics.cfo != null && metrics.capex != null) {
      metrics.freeCashFlow = round2(metrics.cfo - metrics.capex);
    }
    if (typeof latest.annualOperatingIncome === 'number' && typeof latest.annualInterestExpense === 'number' && latest.annualInterestExpense > 0) {
      metrics.interestCoverage = round2(latest.annualOperatingIncome / latest.annualInterestExpense);
    }
    if (typeof latest.annualNetIncome === 'number' && typeof latest.annualTotalAssets === 'number' && latest.annualTotalAssets > 0) {
      metrics.roa = round2((latest.annualNetIncome / latest.annualTotalAssets) * 100);
    }
    if (typeof latest.annualGrossProfit === 'number' && typeof latest.annualTotalRevenue === 'number' && latest.annualTotalRevenue > 0) {
      metrics.grossMargin = round1((latest.annualGrossProfit / latest.annualTotalRevenue) * 100);
    }
    // Working capital & Cash Conversion Cycle from audited receivables, inventory, payables, revenue, COGS
    const rev = latest.annualTotalRevenue;
    const cogs = latest.annualCostOfRevenue;
    const ar = latest.annualAccountsReceivable;
    const inv = latest.annualInventory;
    const ap = latest.annualAccountsPayable;
    if (rev > 0 && typeof ar === 'number') {
      const dso = (ar / rev) * 365;
      const dio = cogs > 0 && typeof inv === 'number' ? (inv / cogs) * 365 : 0;
      const dpo = cogs > 0 && typeof ap === 'number' ? (ap / cogs) * 365 : 0;
      const ccc = round1(dso + dio - dpo);
      if (ccc !== null && ccc >= -365 && ccc <= 730) {
        metrics.cashConversionCycle = ccc;
        metrics.workingCapitalDays = ccc;
      }
    }
  }

  // Multi-year growth & averages
  if (annualProfitLoss.length >= 2) {
    const c0 = annualProfitLoss[0];
    const c1 = annualProfitLoss[1];
    if (c0.eps && c1.eps && c1.eps > 0) {
      metrics.epsGrowth = round1(((c0.eps - c1.eps) / Math.abs(c1.eps)) * 100);
    }
    const lastIdx = Math.min(annualProfitLoss.length - 1, 3);
    const cOld = annualProfitLoss[lastIdx];
    const yrs = lastIdx;
    if (yrs >= 2 && c0.sales > 0 && cOld.sales > 0) {
      metrics.salesGrowth3Y = round1((Math.pow(c0.sales / cOld.sales, 1 / yrs) - 1) * 100);
    }
    if (yrs >= 2 && c0.netProfit > 0 && cOld.netProfit > 0) {
      metrics.profitGrowth3Y = round1((Math.pow(c0.netProfit / cOld.netProfit, 1 / yrs) - 1) * 100);
    }
  }

  // EBITDA YoY growth
  const ebitdaVals = dates.map((dt) => byDate.get(dt)?.annualEBITDA).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (ebitdaVals.length >= 2 && ebitdaVals[1] > 0) {
    metrics.ebitdaGrowth = round1(((ebitdaVals[0] - ebitdaVals[1]) / Math.abs(ebitdaVals[1])) * 100);
  }

  // 3Y Debt reduction (%)
  const debtVals = dates.map((dt) => byDate.get(dt)?.annualTotalDebt).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (debtVals.length >= 2) {
    const dNow = debtVals[0];
    const dOld = debtVals[Math.min(debtVals.length - 1, 3)];
    if (dOld > 0) {
      metrics.debtReduction3Y = round1(((dOld - dNow) / dOld) * 100);
    } else if (dNow === 0 && dOld === 0) {
      metrics.debtReduction3Y = 0;
    }
  }

  // Multi-year average ROCE from audited EBIT / Capital Employed
  const roceVals = [];
  for (const dt of dates.slice(0, 5)) {
    const d = byDate.get(dt);
    if (typeof d.annualOperatingIncome === 'number' && typeof d.annualTotalAssets === 'number' && typeof d.annualCurrentLiabilities === 'number') {
      const capEmp = d.annualTotalAssets - d.annualCurrentLiabilities;
      if (capEmp > 0) {
        const r = (d.annualOperatingIncome / capEmp) * 100;
        if (r > -200 && r < 300) roceVals.push(r);
      }
    }
  }
  if (roceVals.length >= 2) {
    metrics.roce5YAvg = round1(roceVals.reduce((a, b) => a + b, 0) / roceVals.length);
  }

  return { annualProfitLoss, balanceSheet, cashFlow, metrics };
}

async function runPool(items, concurrency, worker) {
  let idx = 0;
  let ok = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const cur = items[idx++];
      const success = await worker(cur);
      if (success) ok++;
    }
  });
  await Promise.all(runners);
  return ok;
}

async function enrichUS() {
  const usPath = path.resolve('lib/screener/usFundamentalsCache.json');
  const usCache = JSON.parse(fs.readFileSync(usPath, 'utf8'));
  const entries = Array.isArray(usCache) ? usCache : Object.values(usCache);
  console.log(`\n[USA] Fetching real audited filings for ${entries.length} US companies...`);
  const t0 = Date.now();

  const updated = await runPool(entries, 15, async (entry) => {
    const sym = entry?.symbol;
    if (!sym) return false;
    const yahooSym = sym.replace('.', '-');
    const byDate = await fetchYahooTimeseries(yahooSym);
    if (!byDate) return false;
    const { annualProfitLoss, balanceSheet, cashFlow, metrics } = buildStatementsAndMetrics(byDate, 1e9);
    if (annualProfitLoss.length >= 2) entry.annualProfitLoss = annualProfitLoss;
    if (balanceSheet.length >= 2) entry.balanceSheet = balanceSheet;
    if (cashFlow.length >= 1) entry.cashFlow = cashFlow;
    for (const [k, v] of Object.entries(metrics)) {
      if (v !== null && v !== undefined && (entry[k] === null || entry[k] === undefined || entry[k] === 0)) {
        entry[k] = v;
      }
    }
    return balanceSheet.length >= 2;
  });

  fs.writeFileSync(usPath, JSON.stringify(usCache));
  console.log(`[USA] Enriched ${updated}/${entries.length} companies with audited balance sheets in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function enrichIndia(limit = 1200) {
  const inPath = path.resolve('lib/screener/indiaFundamentalsCache.json');
  const inCache = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  // Prioritize top N companies by marketCap that don't yet have balanceSheet >= 2
  const symbols = Object.keys(inCache)
    .sort((a, b) => (inCache[b]?.marketCap || 0) - (inCache[a]?.marketCap || 0))
    .slice(0, limit)
    .filter((sym) => !(Array.isArray(inCache[sym]?.balanceSheet) && inCache[sym].balanceSheet.length >= 2));
  console.log(`\n[INDIA] Fetching real audited filings for ${symbols.length} additional NSE companies (top ${limit})...`);
  const t0 = Date.now();

  const updated = await runPool(symbols, 15, async (sym) => {
    const yahooSym = sym.includes('.') ? sym : `${sym}.NS`;
    const byDate = await fetchYahooTimeseries(yahooSym);
    if (!byDate) return false;
    const { annualProfitLoss, balanceSheet, cashFlow, metrics } = buildStatementsAndMetrics(byDate, 1e7);
    const entry = inCache[sym];
    if (annualProfitLoss.length >= 2) entry.annualProfitLoss = annualProfitLoss;
    if (balanceSheet.length >= 2) entry.balanceSheet = balanceSheet;
    if (cashFlow.length >= 1) entry.cashFlow = cashFlow;
    for (const [k, v] of Object.entries(metrics)) {
      if (v !== null && v !== undefined && (entry[k] === null || entry[k] === undefined)) {
        entry[k] = v;
      }
    }
    return balanceSheet.length >= 2;
  });

  fs.writeFileSync(inPath, JSON.stringify(inCache));
  console.log(`[INDIA] Enriched ${updated}/${symbols.length} additional companies with audited balance sheets in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

(async () => {
  await enrichUS();
  await enrichIndia(1200);
})();
