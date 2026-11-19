import fs from 'fs';
import path from 'path';

function round2(v) {
  return Number.isFinite(v) ? Number(v.toFixed(2)) : null;
}

const DE_BUCKET_PAIRS = [
  [1.85, 1.42],
  [1.45, 1.1],
  [1.15, 0.82],
];

function isDeBucketConstant(cr, qr) {
  if (typeof cr !== 'number' || typeof qr !== 'number') return false;
  return DE_BUCKET_PAIRS.some(([a, b]) => Math.abs(cr - a) < 0.005 && Math.abs(qr - b) < 0.005);
}

function isFabricatedCapexRatio(cfo, capex) {
  if (typeof cfo !== 'number' || typeof capex !== 'number' || cfo === 0) return false;
  const r = Math.abs(capex / cfo);
  return Math.abs(r - 0.32) < 0.015 || Math.abs(r - 0.08) < 0.008;
}

function scrubCache(filePath, label) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const isArr = Array.isArray(raw);
  const entries = isArr ? raw : Object.values(raw);

  const stats = {
    total: entries.length,
    currencyMismatchesCleared: [],
    cfoSyncedFromStatements: 0,
    fabricatedCapexCleared: 0,
    deBucketRatiosCleared: 0,
    bsLiabilitiesFixed: 0,
    zeroPlaceholdersNulled: 0,
    phantomInterestCovCleared: 0,
  };

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const sym = entry.symbol || '?';

    // 1. Detect & clear currency-mismatched statements (implied PE vs reported PE off by > 10x)
    const latestPl = Array.isArray(entry.annualProfitLoss) ? entry.annualProfitLoss[0] : null;
    if (
      latestPl &&
      typeof latestPl.netProfit === 'number' &&
      latestPl.netProfit > 0 &&
      typeof entry.marketCap === 'number' &&
      entry.marketCap > 0 &&
      typeof entry.pe === 'number' &&
      entry.pe > 0
    ) {
      const impliedPe = entry.marketCap / latestPl.netProfit;
      const ratio = impliedPe / entry.pe;
      if (ratio > 10 || ratio < 0.1) {
        stats.currencyMismatchesCleared.push(`${sym} (impliedPE=${impliedPe.toFixed(1)} vs pe=${entry.pe})`);
        delete entry.annualProfitLoss;
        delete entry.balanceSheet;
        delete entry.cashFlow;
        entry.cfo = null;
        entry.capex = null;
        entry.freeCashFlow = null;
        entry.fcfYield = null;
      }
    }

    // 2. Sync CFO / FCF / CapEx strictly from real cashFlow[0] when present; scrub fabricated 0.32x/0.08x CFO capex
    const latestCf = Array.isArray(entry.cashFlow) ? entry.cashFlow[0] : null;
    if (latestCf && typeof latestCf.cashFromOperating === 'number') {
      if (entry.cfo !== latestCf.cashFromOperating) {
        entry.cfo = latestCf.cashFromOperating;
        stats.cfoSyncedFromStatements++;
      }
      if (typeof latestCf.freeCashFlow === 'number') {
        entry.freeCashFlow = latestCf.freeCashFlow;
        entry.capex = round2(Math.abs(latestCf.cashFromOperating - latestCf.freeCashFlow));
      } else if (isFabricatedCapexRatio(entry.cfo, entry.capex)) {
        entry.capex = null;
        entry.freeCashFlow = null;
        entry.fcfYield = null;
        stats.fabricatedCapexCleared++;
      }
    } else if (isFabricatedCapexRatio(entry.cfo, entry.capex)) {
      entry.capex = null;
      entry.freeCashFlow = null;
      entry.fcfYield = null;
      stats.fabricatedCapexCleared++;
    }

    // Recompute fcfYield cleanly if freeCashFlow & marketCap exist
    if (typeof entry.freeCashFlow === 'number' && typeof entry.marketCap === 'number' && entry.marketCap > 0) {
      entry.fcfYield = Number(((entry.freeCashFlow / entry.marketCap) * 100).toFixed(2));
    }

    // 3. Scrub hardcoded D/E-bucket currentRatio / quickRatio constants
    if (isDeBucketConstant(entry.currentRatio, entry.quickRatio)) {
      entry.currentRatio = null;
      entry.quickRatio = null;
      stats.deBucketRatiosCleared++;
    }

    // 4. Reconcile Balance Sheet Liabilities side 100% & stop zero-filling missing cwip / investments
    if (Array.isArray(entry.balanceSheet)) {
      let fixedAny = false;
      for (const row of entry.balanceSheet) {
        if (!row) continue;
        if (typeof row.totalAssets === 'number' && row.totalAssets > 0) {
          const eq = typeof row.equityCapital === 'number' ? row.equityCapital : 0;
          const res = typeof row.reserves === 'number' ? row.reserves : 0;
          const bor = typeof row.borrowings === 'number' ? row.borrowings : 0;
          const expectedOther = round2(row.totalAssets - eq - res - bor);
          if (Math.abs((row.otherLiabilities ?? 0) - expectedOther) > 0.05) {
            row.otherLiabilities = expectedOther;
            row.totalLiabilities = round2(row.totalAssets);
            fixedAny = true;
          }
        }
        if (row.cwip === 0) { row.cwip = null; stats.zeroPlaceholdersNulled++; }
        if (row.investments === 0) { row.investments = null; stats.zeroPlaceholdersNulled++; }
      }
      if (fixedAny) stats.bsLiabilitiesFixed++;
    }

    // 5. Stop zero-filling missing P&L placeholders (otherIncome, dividendPayoutPct, and interest when debt > 0)
    const latestBs = Array.isArray(entry.balanceSheet) ? entry.balanceSheet[0] : null;
    const hasDebt = (typeof entry.totalDebt === 'number' && entry.totalDebt > 0) || (latestBs && typeof latestBs.borrowings === 'number' && latestBs.borrowings > 0);
    if (Array.isArray(entry.annualProfitLoss)) {
      for (let i = 0; i < entry.annualProfitLoss.length; i++) {
        const row = entry.annualProfitLoss[i];
        if (!row) continue;
        if (row.otherIncome === 0) { row.otherIncome = null; stats.zeroPlaceholdersNulled++; }
        if (row.dividendPayoutPct === 0) { row.dividendPayoutPct = null; stats.zeroPlaceholdersNulled++; }
        if (row.interest === 0 && hasDebt) {
          row.interest = null;
          stats.zeroPlaceholdersNulled++;
        }
      }
      const pl0 = entry.annualProfitLoss[0];
      if (pl0 && (pl0.interest === null || pl0.interest === 0) && entry.interestCoverage != null) {
        entry.interestCoverage = null;
        stats.phantomInterestCovCleared++;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(raw));
  console.log(`\n=== ${label} SCRUB SUMMARY ===`);
  console.log(JSON.stringify(stats, null, 2));
}

scrubCache(path.resolve('lib/screener/indiaFundamentalsCache.json'), 'INDIA');
scrubCache(path.resolve('lib/screener/usFundamentalsCache.json'), 'USA');
