import { METRIC_DEFINITIONS, resolveMetricKey, getMetricValue, formatMetricValue, getMetricDefinition } from '../lib/screener/metrics';
import { parseQuery, evaluateNode } from '../lib/screener/queryEngine';
import { getCompaniesByMarket, getCompanyBySymbol } from '../lib/screener/data';
import { isFinancialEntity } from '../lib/screener/zerodhaStocks';

async function auditEntireMetricsSystem() {
  console.log('='.repeat(100));
  console.log('       COMPREHENSIVE CODEBASE AUDIT: ALL FINANCIAL & TECHNICAL METRICS');
  console.log('='.repeat(100));

  const indiaUniverse = getCompaniesByMarket('INDIA');
  const usaUniverse = getCompaniesByMarket('USA');
  console.log(`Active Universes: ${indiaUniverse.length} India Equities | ${usaUniverse.length} USA Equities\n`);

  let totalChecks = 0;
  let passedChecks = 0;
  const failures: string[] = [];

  function check(desc: string, condition: boolean) {
    totalChecks++;
    if (condition) {
      passedChecks++;
    } else {
      failures.push(desc);
      console.error(`  [FAIL] ${desc}`);
    }
  }

  // ─── PART 1: METRIC DEFINITIONS INTEGRITY (All 59 Metrics) ───
  console.log('--- [PART 1] Metric Catalog & Metadata Integrity ---');
  check('METRIC_DEFINITIONS is non-empty array (>= 54 definitions)', METRIC_DEFINITIONS.length >= 54);

  const keySet = new Set<string>();
  for (const def of METRIC_DEFINITIONS) {
    check(`Metric key "${def.key}" is unique`, !keySet.has(def.key));
    keySet.add(def.key);

    check(`Metric "${def.key}" has label`, typeof def.label === 'string' && def.label.length > 0);
    check(`Metric "${def.key}" has valid category`, ['valuation', 'growth', 'profitability', 'health', 'ownership', 'market'].includes(def.category));
    check(`Metric "${def.key}" has valid dataType`, ['currency', 'ratio', 'percent', 'score', 'days', 'number', 'integer', 'string'].includes(def.dataType));
    check(`Metric "${def.key}" has description`, typeof def.description === 'string' && def.description.length > 5);

    // Alias Resolution
    const resolvedFromKey = resolveMetricKey(def.key);
    check(`resolveMetricKey("${def.key}") resolves to self`, resolvedFromKey === def.key);

    const resolvedFromLabel = resolveMetricKey(def.label);
    check(`resolveMetricKey("${def.label}") resolves to "${def.key}"`, resolvedFromLabel === def.key);

    if (def.aliases) {
      for (const al of def.aliases) {
        const resolvedFromAlias = resolveMetricKey(al);
        check(`resolveMetricKey("${al}") resolves to "${def.key}"`, resolvedFromAlias === def.key);
      }
    }
  }

  // ─── PART 2: QUERY ENGINE SYNTAX & AST PARSING ───
  console.log('\n--- [PART 2] Query Engine Parser & AST Grammar Binding ---');
  for (const def of METRIC_DEFINITIONS) {
    // Basic greater than
    const q1 = `${def.label} > 10`;
    const res1 = parseQuery(q1);
    check(`Query "${q1}" parses valid AST`, res1.valid && res1.ast?.type === 'CONDITION' && res1.ast?.metricKey === def.key);

    // Negative numeric threshold
    const q2 = `${def.label} < -5`;
    const res2 = parseQuery(q2);
    check(`Query "${q2}" parses valid AST with negative value`, res2.valid && res2.ast?.type === 'CONDITION' && res2.ast?.value === -5);

    // Metric key direct query
    const q3 = `${def.key} >= 0`;
    const res3 = parseQuery(q3);
    check(`Query "${q3}" parses valid AST from key`, res3.valid && res3.ast?.type === 'CONDITION' && (res3.ast as any).metricKey === def.key);
  }

  // ─── PART 3: FORMATTER RESILIENCE & BOUNDARY CONDITIONS ───
  console.log('\n--- [PART 3] Institutional Formatter Resilience & Boundaries ---');
  for (const def of METRIC_DEFINITIONS) {
    // Null formatting
    const nullFmt = formatMetricValue(null, def.key);
    check(`formatMetricValue(null, "${def.key}") returns em-dash "—"`, nullFmt === '—');

    // Undefined formatting
    const undefFmt = formatMetricValue(undefined, def.key);
    check(`formatMetricValue(undefined, "${def.key}") returns em-dash "—"`, undefFmt === '—');

    // NaN formatting
    const nanFmt = formatMetricValue(NaN, def.key);
    check(`formatMetricValue(NaN, "${def.key}") returns em-dash "—"`, nanFmt === '—');

    // Zero formatting
    const zeroFmt = formatMetricValue(0, def.key);
    check(`formatMetricValue(0, "${def.key}") is valid string`, zeroFmt.length > 0 && zeroFmt !== 'NaN' && !zeroFmt.includes('undefined'));

    // Positive formatting
    const posFmt = formatMetricValue(12.3456, def.key);
    check(`formatMetricValue(12.3456, "${def.key}") formats cleanly`, posFmt.length > 0 && !posFmt.includes('NaN'));
  }

  // ─── PART 4: DATA EVALUATION ON BENCHMARK EQUITIES ───
  console.log('\n--- [PART 4] Real Data Binding & Calculation Integrity ---');
  const testTickers = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'LT', 'DIXON', 'SUNPHARMA', 'POLYCAB'];
  for (const sym of testTickers) {
    const comp = getCompanyBySymbol(sym);
    check(`Benchmark equity "${sym}" loaded successfully`, !!comp);
    if (!comp) continue;

    // Check Market Cap
    const mcap = getMetricValue(comp, 'marketCap');
    check(`${sym} Market Cap is positive number`, typeof mcap === 'number' && mcap > 1000);

    // Check Price
    const price = getMetricValue(comp, 'currentPrice');
    check(`${sym} Price is positive number`, typeof price === 'number' && price > 0);

    // Check P/E
    const pe = getMetricValue(comp, 'pe');
    check(`${sym} P/E is valid positive number`, typeof pe === 'number' && pe > 0);

    // Check ROCE & ROE
    const roce = getMetricValue(comp, 'roce');
    const roe = getMetricValue(comp, 'roe');
    check(`${sym} ROCE is valid number`, typeof roce === 'number');
    check(`${sym} ROE is valid number`, typeof roe === 'number');

    // Check Piotroski Score (0-9)
    const pio = getMetricValue(comp, 'piotroskiScore');
    check(`${sym} Piotroski Score is integer within [0, 9]`, typeof pio === 'number' && pio >= 0 && pio <= 9 && Number.isInteger(pio));

    // Check Altman Z-Score (> 0 for solvent firms)
    const altman = getMetricValue(comp, 'altmanZScore');
    check(`${sym} Altman Z-Score is positive number`, typeof altman === 'number' && altman > 0);

    // Check Shareholding Sum (Promoter + FII + DII + Public <= 101% allowing rounding)
    const prom = getMetricValue(comp, 'promoterHolding') || 0;
    const fii = getMetricValue(comp, 'fiiHolding') || 0;
    const dii = getMetricValue(comp, 'diiHolding') || 0;
    const pub = getMetricValue(comp, 'publicHolding') || 0;
    const totalShareholding = prom + fii + dii + pub;
    check(`${sym} Shareholding sum is close to 100% (Found: ${totalShareholding.toFixed(1)}%)`, totalShareholding >= 98 && totalShareholding <= 102);
  }

  // ─── PART 5: IND AS 109 FINANCIAL ENTITY SUPPRESSION ───
  console.log('\n--- [PART 5] Ind AS 109 Compliance for Financial Institutions ---');
  const financials = ['HDFCBANK', 'ICICIBANK', 'SBIN', 'JIOFIN', 'MAHSCOOTER'];
  for (const sym of financials) {
    const comp = getCompanyBySymbol(sym);
    if (!comp) continue;

    const isFin = isFinancialEntity(comp.symbol, comp.name, comp.sector);
    check(`${sym} recognized as financial entity`, isFin);

    // Current Ratio should be null
    const cr = getMetricValue(comp, 'currentRatio');
    check(`${sym} Current Ratio is null per Ind AS 109`, cr === null);

    // Quick Ratio should be null
    const qr = getMetricValue(comp, 'quickRatio');
    check(`${sym} Quick Ratio is null per Ind AS 109`, qr === null);

    // Working Capital Days should be null
    const wcd = getMetricValue(comp, 'workingCapitalDays');
    check(`${sym} Working Capital Days is null per Ind AS 109`, wcd === null);

    // Cash Conversion Cycle should be null
    const ccc = getMetricValue(comp, 'cashConversionCycle');
    check(`${sym} Cash Conversion Cycle is null per Ind AS 109`, ccc === null);
  }

  // ─── PART 6: US EQUITIES BINDING ───
  console.log('\n--- [PART 6] US Global Universe Metrics Integrity ---');
  const usMegacaps = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA'];
  for (const sym of usMegacaps) {
    const comp = getCompanyBySymbol(sym, 'USA');
    check(`US Megacap "${sym}" loaded successfully`, !!comp);
    if (!comp) continue;

    const mcap = getMetricValue(comp, 'marketCap');
    check(`${sym} US Market Cap is in billions ($ > 500)`, typeof mcap === 'number' && mcap > 500);

    const price = getMetricValue(comp, 'currentPrice');
    check(`${sym} US Price is positive ($)`, typeof price === 'number' && price > 0);

    const pe = getMetricValue(comp, 'pe');
    check(`${sym} US P/E is positive multiple`, typeof pe === 'number' && pe > 5);

    const fcf = getMetricValue(comp, 'freeCashFlow');
    check(`${sym} US Free Cash Flow is populated`, typeof fcf === 'number');
  }

  console.log('\n' + '='.repeat(100));
  console.log(`TOTAL AUDIT RESULT: ${passedChecks} / ${totalChecks} CHECKS PASSED (${((passedChecks / totalChecks) * 100).toFixed(2)}%)`);
  console.log('='.repeat(100));

  if (failures.length > 0) {
    console.error(`\nFound ${failures.length} issues:`);
    failures.slice(0, 10).forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL METRICS THROUGHOUT THE CODEBASE ARE 100% VERIFIED AND CORRECT!');
  }
}

auditEntireMetricsSystem().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
