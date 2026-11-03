import * as fs from 'fs';
import * as path from 'path';
import { buildIndiaUniverse } from '../lib/screener/data';
import { isFinancialEntity } from '../lib/screener/zerodhaStocks';
import { calculateAltmanZScore, calculatePiotroskiScore } from '../lib/screener/scorecards';
import { getMetricValue } from '../lib/screener/metrics';

interface Discrepancy {
  symbol: string;
  name: string;
  sector?: string;
  rule: string;
  issue: string;
  value: any;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

async function runUniverseForensics() {
  console.log('======================================================================');
  console.log('DEEP FORENSIC INTEGRITY AUDIT ACROSS ALL 2,336 UNIVERSE COMPANIES');
  console.log('======================================================================\n');

  const universe = buildIndiaUniverse();
  console.log(`Loaded ${universe.length} companies from universe cache.\n`);

  const discrepancies: Discrepancy[] = [];

  let bfsiCount = 0;
  let nonBfsiCount = 0;

  for (const comp of universe) {
    const isBfsi = isFinancialEntity(comp.sector, comp.symbol);
    if (isBfsi) {
      bfsiCount++;
      // Rule 1: BFSI entities must have null for manufacturing / non-applicable ratios
      const invalidBfsiFields = [
        { key: 'altmanZScore', val: comp.altmanZScore },
        { key: 'workingCapitalDays', val: comp.workingCapitalDays },
        { key: 'cashConversionCycle', val: comp.cashConversionCycle },
        { key: 'currentRatio', val: comp.currentRatio },
        { key: 'quickRatio', val: comp.quickRatio },
        { key: 'cfo', val: comp.cfo },
        { key: 'freeCashFlow', val: comp.freeCashFlow },
        { key: 'fcfYield', val: comp.fcfYield },
        { key: 'debtToEquity', val: comp.debtToEquity },
        { key: 'interestCoverage', val: comp.interestCoverage },
        { key: 'grossMargin', val: comp.grossMargin },
        { key: 'ebitdaMargin', val: comp.ebitdaMargin },
        { key: 'evToEbitda', val: comp.evToEbitda },
        { key: 'evToEbit', val: comp.evToEbit },
        { key: 'capex', val: comp.capex },
      ];

      for (const field of invalidBfsiFields) {
        if (field.val !== null && field.val !== undefined) {
          discrepancies.push({
            symbol: comp.symbol,
            name: comp.name,
            sector: comp.sector,
            rule: 'BFSI Non-Applicability',
            issue: `Financial company has non-null value for ${field.key}`,
            value: field.val,
            severity: 'HIGH',
          });
        }
      }

      // Check Altman score calculation
      const zResult = calculateAltmanZScore(comp);
      if (zResult.score !== null) {
        discrepancies.push({
          symbol: comp.symbol,
          name: comp.name,
          sector: comp.sector,
          rule: 'BFSI Altman Z Exemption',
          issue: `calculateAltmanZScore returned non-null score (${zResult.score}) for BFSI entity`,
          value: zResult.score,
          severity: 'HIGH',
        });
      }
    } else {
      nonBfsiCount++;

      // Rule 2: Gross Margin >= OPM invariant (for non-financials where both are positive numbers)
      // Note: If raw materials are zero or direct costs equal zero, gross margin equals 100 or OPM
      if (
        comp.grossMargin !== null &&
        comp.grossMargin !== undefined &&
        comp.opm !== null &&
        comp.opm !== undefined &&
        comp.opm > 0 &&
        comp.grossMargin > 0
      ) {
        // Gross margin should not be strictly less than OPM minus floating point epsilon
        if (comp.grossMargin < comp.opm - 0.5) {
          discrepancies.push({
            symbol: comp.symbol,
            name: comp.name,
            sector: comp.sector,
            rule: 'Gross Margin >= OPM Invariant',
            issue: `Gross Margin (${comp.grossMargin}%) is lower than Operating Margin (${comp.opm}%)`,
            value: { grossMargin: comp.grossMargin, opm: comp.opm },
            severity: 'MEDIUM',
          });
        }
      }

      // Rule 3: Working Capital vs CCC consistency
      // CCC = DIO + DSO - DPO. If DIO, DSO, DPO exist in balanceSheet or metrics
      // Ensure CCC is not NaN or Infinity
      if (comp.cashConversionCycle !== null && comp.cashConversionCycle !== undefined) {
        if (!Number.isFinite(comp.cashConversionCycle)) {
          discrepancies.push({
            symbol: comp.symbol,
            name: comp.name,
            sector: comp.sector,
            rule: 'CCC Finite Check',
            issue: `Cash Conversion Cycle is non-finite: ${comp.cashConversionCycle}`,
            value: comp.cashConversionCycle,
            severity: 'HIGH',
          });
        }
      }

      // Rule 4: Return ratio bound checks (ROE, ROCE)
      // Any company with ROCE > 160% or ROE > 160% with normal leverage should be scrutinized
      if (comp.roce && comp.roce > 200) {
        discrepancies.push({
          symbol: comp.symbol,
          name: comp.name,
          sector: comp.sector,
          rule: 'Extreme ROCE (>200%)',
          issue: `Extreme ROCE indicates near-zero capital employed denominator`,
          value: comp.roce,
          severity: 'LOW',
        });
      }
    }

    // Rule 5: Dividend Yield Sanity Check
    if (comp.dividendYield && comp.dividendYield > 20) {
      discrepancies.push({
        symbol: comp.symbol,
        name: comp.name,
        sector: comp.sector,
        rule: 'Suspicious Dividend Yield (>20%)',
        issue: `Dividend Yield is abnormally high (${comp.dividendYield}%). May be stale dividend or capital restructuring.`,
        value: comp.dividendYield,
        severity: 'MEDIUM',
      });
    }

    // Rule 6: Market Cap Sanity Check (Listed public equities must have positive Market Cap)
    const isUnlistedPreIpo = ['ATHERENERG', 'LENSKART', 'GROWW', 'AEQUS', 'AMAGI'].includes(comp.symbol);
    if (!isUnlistedPreIpo && (!comp.marketCap || comp.marketCap <= 0)) {
      discrepancies.push({
        symbol: comp.symbol,
        name: comp.name,
        sector: comp.sector,
        rule: 'Invalid Market Cap',
        issue: `Market Cap is missing or <= 0`,
        value: comp.marketCap,
        severity: 'HIGH',
      });
    }

    // Rule 7: Piotroski score range
    if (comp.piotroskiScore !== null && comp.piotroskiScore !== undefined) {
      if (comp.piotroskiScore < 0 || comp.piotroskiScore > 9 || !Number.isInteger(comp.piotroskiScore)) {
        discrepancies.push({
          symbol: comp.symbol,
          name: comp.name,
          sector: comp.sector,
          rule: 'Piotroski Score Invariant',
          issue: `Piotroski score outside [0, 9] integer range`,
          value: comp.piotroskiScore,
          severity: 'HIGH',
        });
      }
    }

    // Rule 8: Promoter Pledge Bounds [0, 100]
    if (comp.pledgedPct !== null && comp.pledgedPct !== undefined) {
      if (comp.pledgedPct < 0 || comp.pledgedPct > 100) {
        discrepancies.push({
          symbol: comp.symbol,
          name: comp.name,
          sector: comp.sector,
          rule: 'Promoter Pledge Bounds',
          issue: `Promoter pledge percentage outside [0, 100]%`,
          value: comp.pledgedPct,
          severity: 'HIGH',
        });
      }
    }
  }

  console.log(`Audited ${universe.length} companies (${bfsiCount} BFSI / Financials, ${nonBfsiCount} Corporates).`);
  console.log(`Total Discrepancies Found: ${discrepancies.length}\n`);

  const highSeverity = discrepancies.filter((d) => d.severity === 'HIGH');
  const medSeverity = discrepancies.filter((d) => d.severity === 'MEDIUM');
  const lowSeverity = discrepancies.filter((d) => d.severity === 'LOW');

  console.log(`- HIGH Severity: ${highSeverity.length}`);
  console.log(`- MEDIUM Severity: ${medSeverity.length}`);
  console.log(`- LOW Severity: ${lowSeverity.length}\n`);

  if (discrepancies.length > 0) {
    console.log('Top Discrepancies Sample:');
    discrepancies.slice(0, 30).forEach((d, i) => {
      console.log(`[${i + 1}] [${d.severity}] ${d.symbol} (${d.name}) | Rule: ${d.rule} | Issue: ${d.issue} | Val:`, d.value);
    });
  }

  fs.writeFileSync(
    path.join(__dirname, 'universe-forensic-report.json'),
    JSON.stringify(
      {
        totalAudited: universe.length,
        bfsiCount,
        nonBfsiCount,
        discrepanciesCount: discrepancies.length,
        highCount: highSeverity.length,
        medCount: medSeverity.length,
        lowCount: lowSeverity.length,
        discrepancies,
      },
      null,
      2
    )
  );

  console.log('\nFull report saved to scripts/universe-forensic-report.json');
}

runUniverseForensics().catch(console.error);
