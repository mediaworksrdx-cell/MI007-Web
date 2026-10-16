// ─── Automated Verification Test Suite for MI007 Screener Engine ─────────────
import { tokenize, parseQuery, evaluateNode } from '../lib/screener/queryEngine.ts';
import { validateFormula, evaluateCustomRatio } from '../lib/screener/customRatios.ts';
import { MASTER_COMPANIES } from '../lib/screener/data.ts';
import { PREDEFINED_SCREENS } from '../lib/screener/templates.ts';
import { METRIC_DEFINITIONS, resolveMetricKey, getMetricValue, formatMetricValue } from '../lib/screener/metrics.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('MI-007 INSTITUTIONAL SCREENER — AUTOMATED VERIFICATION');
console.log('======================================================\n');

// ── TEST 1: Metric Aliases & Resolvers ───────────────────────────────────────
console.log('[1] Testing Metric Alias & Registry Lookups:');
assert(resolveMetricKey('Market Capitalization') === 'marketCap', 'Resolves "Market Capitalization" -> marketCap');
assert(resolveMetricKey('Market Cap') === 'marketCap', 'Resolves "Market Cap" -> marketCap');
assert(resolveMetricKey('MCAP') === 'marketCap', 'Resolves "MCAP" -> marketCap');
assert(resolveMetricKey('P/E') === 'pe', 'Resolves "P/E" -> pe');
assert(resolveMetricKey('Price to Earning') === 'pe', 'Resolves "Price to Earning" -> pe');
assert(resolveMetricKey('ROCE') === 'roce', 'Resolves "ROCE" -> roce');
assert(resolveMetricKey('Debt to Equity') === 'debtToEquity', 'Resolves "Debt to Equity" -> debtToEquity');
assert(resolveMetricKey('D/E') === 'debtToEquity', 'Resolves "D/E" -> debtToEquity');
assert(resolveMetricKey('Sales Growth 5Y') === 'salesGrowth5Y', 'Resolves "Sales Growth 5Y" -> salesGrowth5Y');
assert(resolveMetricKey('Free Cash Flow') === 'freeCashFlow', 'Resolves "Free Cash Flow" -> freeCashFlow');
assert(resolveMetricKey('Pledged Promoter Shares %') === 'pledgedPct', 'Resolves "Pledged Promoter Shares %" -> pledgedPct');

// ── TEST 2: Query Parser & Operators ─────────────────────────────────────────
console.log('\n[2] Testing Query Parser & Logical Operators:');
const q1 = 'Market Capitalization > 5000 AND ROCE > 18';
const r1 = parseQuery(q1);
assert(r1.valid === true, `Valid query parses cleanly: "${q1}"`);
assert(r1.ast.type === 'LOGICAL' && r1.ast.operator === 'AND', 'Generates correct AND logical node');

const q2 = '(ROCE > 25 OR Return on Equity > 25) AND Debt to Equity < 0.3';
const r2 = parseQuery(q2);
assert(r2.valid === true, `Nested parentheses parse cleanly: "${q2}"`);

const q3 = 'Price to Earning BETWEEN 15 AND 35';
const r3 = parseQuery(q3);
assert(r3.valid === true, `BETWEEN range operator parses cleanly: "${q3}"`);
assert(r3.ast.operator === 'BETWEEN' && r3.ast.value === 15 && r3.ast.value2 === 35, 'BETWEEN bounds stored correctly');

// ── TEST 3: Syntax Error Detection ──────────────────────────────────────────
console.log('\n[3] Testing Syntax Error Handling & Boundary Feedback:');
const bad1 = 'ROCE >'; // Missing value
const resBad1 = parseQuery(bad1);
assert(resBad1.valid === false, 'Detects missing numeric value');

const bad2 = 'FakeMetricName > 10'; // Unknown metric
const resBad2 = parseQuery(bad2);
assert(resBad2.valid === false, 'Rejects unrecognized metric identifiers');

const bad3 = '(ROCE > 15 AND Debt to Equity < 0.5'; // Missing closing parenthesis
const resBad3 = parseQuery(bad3);
assert(resBad3.valid === false, 'Detects unclosed parenthesis');

// ── TEST 4: Query Evaluation Against Real Companies ─────────────────────────
console.log('\n[4] Testing Screen Execution Against Master Company Dataset:');
const tcs = MASTER_COMPANIES.find((c) => c.symbol === 'TCS');
const reliance = MASTER_COMPANIES.find((c) => c.symbol === 'RELIANCE');
const dixon = MASTER_COMPANIES.find((c) => c.symbol === 'DIXON');

assert(tcs !== undefined && reliance !== undefined && dixon !== undefined, 'Target test companies loaded');

// TCS has ROCE 58.2% and D/E 0.08
const qTCS = 'ROCE > 30 AND Debt to Equity < 0.2';
const rTCS = parseQuery(qTCS);
assert(evaluateNode(rTCS.ast, tcs) === true, 'TCS satisfies high ROCE + low debt screen');

// Reliance has ROCE 12.4% -> should fail ROCE > 30
assert(evaluateNode(rTCS.ast, reliance) === false, 'Reliance correctly does not match ROCE > 30');

// Range evaluation: TCS PE is 28.5
const qRange = 'Price to Earning BETWEEN 20 AND 35';
const rRange = parseQuery(qRange);
assert(evaluateNode(rRange.ast, tcs) === true, 'TCS PE (28.5) is within 20..35');

// ── TEST 5: Custom Ratio Formula Evaluator (Shunting-Yard) ───────────────────
console.log('\n[5] Testing Custom Financial Ratios Engine:');
const formula1 = 'Free Cash Flow / Market Capitalization * 100';
const v1 = validateFormula(formula1);
assert(v1.valid === true, `Custom ratio formula validated: "${formula1}"`);

const customRatio1 = {
  id: 'cr-1',
  name: 'FCF Yield',
  code: 'FCF_YIELD',
  formula: formula1,
  unit: '%',
  decimals: 2,
  description: '',
  createdAt: '',
};

const fcfYieldTCS = evaluateCustomRatio(customRatio1, tcs);
assert(typeof fcfYieldTCS === 'number' && fcfYieldTCS > 0, `Evaluates TCS FCF Yield: ${fcfYieldTCS?.toFixed(2)}%`);

// Division by zero safe guard
const divZeroFormula = 'Free Cash Flow / 0';
const customRatioZero = { ...customRatio1, formula: divZeroFormula };
const zeroRes = evaluateCustomRatio(customRatioZero, tcs);
assert(zeroRes === null, 'Division by zero safely evaluates to null (no Infinity or crash)');

// ── TEST 6: Predefined Templates Validity ────────────────────────────────────
console.log('\n[6] Verifying all 14 Predefined Institutional Screen Templates:');
let templatesValid = 0;
for (const tmpl of PREDEFINED_SCREENS) {
  const parsed = parseQuery(tmpl.query);
  if (parsed.valid) {
    templatesValid++;
  } else {
    console.error(`  ✕ Invalid template: "${tmpl.name}" -> ${parsed.error}`);
  }
}
assert(templatesValid === PREDEFINED_SCREENS.length, `All ${PREDEFINED_SCREENS.length} predefined templates parse with 100% validity`);

// ── TEST 7: Number Formatter & Unavailable Data Handling ─────────────────────
console.log('\n[7] Testing Number Formatter & Null/Missing Data Handling:');
assert(formatMetricValue(null, 'pe') === '—', 'Missing value formats as "—"');
assert(formatMetricValue(undefined, 'roce') === '—', 'Undefined value formats as "—"');
assert(formatMetricValue(24.5, 'roce') === '24.5%', 'ROCE percentage formats with % symbol');
assert(formatMetricValue(28.5, 'pe') === '28.5x', 'P/E ratio formats with x suffix');
assert(formatMetricValue(1712450, 'marketCap', '₹').includes('Cr'), 'Market Cap formats in Cr with currency');

console.log('\n======================================================');
console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
