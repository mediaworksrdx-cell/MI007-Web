import * as fs from 'fs';
import { buildIndiaUniverse } from '../lib/screener/data';
import { isFinancialEntity } from '../lib/screener/zerodhaStocks';

async function deepAuditAllFields() {
  const universe = buildIndiaUniverse();
  console.log(`Auditing all fields across ${universe.length} companies...`);

  const issues: string[] = [];

  for (const c of universe) {
    const isFin = isFinancialEntity(c.symbol, c.name, c.sector);

    // 1. Shareholding sum
    if (c.promoterHolding != null && c.fiiHolding != null && c.diiHolding != null && c.publicHolding != null) {
      const sum = c.promoterHolding + c.fiiHolding + c.diiHolding + c.publicHolding;
      if (sum < 95.0 || sum > 105.0) {
        issues.push(`${c.symbol}: Shareholding sum = ${sum.toFixed(1)}% (P:${c.promoterHolding}, F:${c.fiiHolding}, D:${c.diiHolding}, Pub:${c.publicHolding})`);
      }
    }

    // 2. Promoter pledge
    if (c.pledgedPct != null && (c.pledgedPct < 0 || c.pledgedPct > 100)) {
      issues.push(`${c.symbol}: Invalid pledgedPct = ${c.pledgedPct}`);
    }

    // 3. Current ratio vs Quick ratio
    // Quick assets = Current assets - Inventory. Therefore Quick ratio <= Current ratio!
    if (!isFin && c.currentRatio != null && c.quickRatio != null) {
      if (c.quickRatio > c.currentRatio + 0.05) {
        issues.push(`${c.symbol}: Quick Ratio (${c.quickRatio}) > Current Ratio (${c.currentRatio})`);
      }
    }

    // 4. Valuation multiples
    if (c.pe != null && c.pe < 0) {
      issues.push(`${c.symbol}: Negative PE = ${c.pe}`);
    }
    if (c.pb != null && c.pb < 0) {
      issues.push(`${c.symbol}: Negative PB = ${c.pb}`);
    }

    // 5. Net debt vs Total debt
    // Net debt = Total debt - Cash. Net debt can be negative (net cash).
    // But Net debt cannot exceed Total debt (since cash cannot be negative)!
    if (!isFin && c.netDebt != null && c.totalDebt != null) {
      if (c.netDebt > c.totalDebt + 1.0) { // allow small 1 Cr margin for rounding
        issues.push(`${c.symbol}: Net Debt (${c.netDebt}) > Total Debt (${c.totalDebt})`);
      }
    }
  }

  console.log(`Found ${issues.length} potential accounting/data issues:`);
  issues.slice(0, 40).forEach((iss, i) => console.log(`[${i + 1}] ${iss}`));
}

deepAuditAllFields().catch(console.error);
