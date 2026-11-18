// ─── Custom Financial Ratios Engine ─────────────────────────────────────────
// Allows institutional investors to define mathematical custom financial formulas safely.
// Evaluates arithmetic operations (+, -, *, /) with metric references and parenthesis grouping.

import { CustomRatio, CompanyFundamental } from './types';
import { resolveMetricKey, getMetricValue, METRIC_DEFINITIONS } from './metrics';

export interface RatioToken {
  type: 'OPERATOR' | 'NUMBER' | 'METRIC' | 'LPAREN' | 'RPAREN';
  value: string | number;
  metricKey?: string;
}

export interface FormulaValidationResult {
  valid: boolean;
  error?: string;
  referencedMetrics: string[];
}

// Build a longest-first list of known metric names and aliases so names containing
// "/" or "-" (e.g. "P/E", "P/B", "EV/EBITDA", "Debt-to-Equity") are matched intact
// before arithmetic operators split them.
const SORTED_METRIC_ALIASES: { aliasLower: string; key: string }[] = (() => {
  const entries: { aliasLower: string; key: string }[] = [];
  const seen = new Set<string>();
  const add = (alias: string | undefined, key: string) => {
    if (!alias || typeof alias !== 'string') return;
    const clean = alias.trim().toLowerCase();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    entries.push({ aliasLower: clean, key });
  };
  for (const m of METRIC_DEFINITIONS) {
    add(m.key, m.key);
    add((m as any).name || m.label, m.key);
    add((m as any).shortName, m.key);
    if (Array.isArray(m.aliases)) {
      for (const a of m.aliases) add(a, m.key);
    }
  }
  const extraAliases: [string, string][] = [
    ['p/e', 'pe'],
    ['p/b', 'pb'],
    ['p/s', 'ps'],
    ['ev/ebitda', 'evEbitda'],
    ['ev/ebit', 'evEbitda'],
    ['debt-to-equity', 'debtToEquity'],
    ['debt/equity', 'debtToEquity'],
    ['debt to equity', 'debtToEquity'],
    ['net profit', 'netProfit'],
    ['pat', 'netProfit'],
    ['profit after tax', 'netProfit'],
    ['annual net profit', 'netProfit'],
  ];
  for (const [a, k] of extraAliases) add(a, k);
  entries.sort((a, b) => b.aliasLower.length - a.aliasLower.length);
  return entries;
})();

/** Tokenize a formula like "Free Cash Flow / Market Capitalization * 100" */
export function tokenizeFormula(formulaStr: string): { tokens: RatioToken[]; error?: string } {
  const str = formulaStr.trim();
  const tokens: RatioToken[] = [];
  let i = 0;
  let expectOperand = true;

  while (i < str.length) {
    if (/\s/.test(str[i])) {
      i++;
      continue;
    }

    if (str[i] === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      expectOperand = true;
      continue;
    }

    if (str[i] === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      expectOperand = false;
      continue;
    }

    // Unary plus/minus when an operand is expected (e.g. "-5 + ROE", "ROE - -5", "-ROE")
    if (expectOperand && (str[i] === '-' || str[i] === '+')) {
      const sign = str[i] === '-' ? -1 : 1;
      const unaryNumMatch = str.slice(i + 1).match(/^\s*(\d+(\.\d+)?)/);
      if (unaryNumMatch) {
        const numVal = sign * parseFloat(unaryNumMatch[1]);
        tokens.push({ type: 'NUMBER', value: numVal });
        i += 1 + unaryNumMatch[0].length;
        expectOperand = false;
        continue;
      }
      if (sign === -1) {
        tokens.push({ type: 'NUMBER', value: 0 });
        tokens.push({ type: 'OPERATOR', value: '-' });
      }
      i++;
      expectOperand = true;
      continue;
    }

    if (!expectOperand && ['+', '-', '*', '/'].includes(str[i])) {
      tokens.push({ type: 'OPERATOR', value: str[i] });
      i++;
      expectOperand = true;
      continue;
    }

    // Number literal
    const numMatch = str.slice(i).match(/^\d+(\.\d+)?/);
    if (numMatch && expectOperand) {
      const numVal = parseFloat(numMatch[0]);
      tokens.push({ type: 'NUMBER', value: numVal });
      i += numMatch[0].length;
      expectOperand = false;
      continue;
    }

    // Try longest-match known metric name/alias first (handles P/E, Debt-to-Equity, etc.)
    const remainingLower = str.slice(i).toLowerCase();
    let matchedAlias: { aliasLower: string; key: string } | null = null;
    for (const cand of SORTED_METRIC_ALIASES) {
      if (remainingLower.startsWith(cand.aliasLower)) {
        const afterIdx = i + cand.aliasLower.length;
        if (
          afterIdx >= str.length ||
          /\s/.test(str[afterIdx]) ||
          ['(', ')', '+', '-', '*', '/'].includes(str[afterIdx])
        ) {
          matchedAlias = cand;
          break;
        }
      }
    }

    if (matchedAlias) {
      const rawText = str.slice(i, i + matchedAlias.aliasLower.length).trim();
      tokens.push({
        type: 'METRIC',
        value: rawText,
        metricKey: matchedAlias.key,
      });
      i += matchedAlias.aliasLower.length;
      expectOperand = false;
      continue;
    }

    if (['+', '-', '*', '/'].includes(str[i])) {
      tokens.push({ type: 'OPERATOR', value: str[i] });
      i++;
      expectOperand = true;
      continue;
    }

    // Fallback metric text up to next operator/paren
    let metricBuffer = '';
    while (i < str.length && !['(', ')', '+', '-', '*', '/'].includes(str[i])) {
      metricBuffer += str[i];
      i++;
    }

    const trimmed = metricBuffer.trim();
    const key = resolveMetricKey(trimmed);
    if (!key) {
      return {
        tokens: [],
        error: `Unknown financial metric: "${trimmed}"`,
      };
    }

    tokens.push({
      type: 'METRIC',
      value: trimmed,
      metricKey: key,
    });
    expectOperand = false;
  }

  return { tokens };
}

/** Validate custom ratio formula */
export function validateFormula(formulaStr: string): FormulaValidationResult {
  if (!formulaStr || !formulaStr.trim()) {
    return { valid: false, error: 'Formula cannot be empty', referencedMetrics: [] };
  }

  const { tokens, error } = tokenizeFormula(formulaStr);
  if (error || tokens.length === 0) {
    return { valid: false, error: error || 'Empty expression', referencedMetrics: [] };
  }

  const referencedMetrics: string[] = [];
  let parenDepth = 0;
  let expectOperand = true;

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];

    if (t.type === 'LPAREN') {
      parenDepth++;
      continue;
    }

    if (t.type === 'RPAREN') {
      parenDepth--;
      if (parenDepth < 0) {
        return { valid: false, error: 'Mismatched parentheses: unexpected ")"', referencedMetrics };
      }
      expectOperand = false;
      continue;
    }

    if (expectOperand) {
      if (t.type === 'NUMBER' || t.type === 'METRIC') {
        if (t.metricKey) referencedMetrics.push(t.metricKey);
        expectOperand = false;
      } else {
        return { valid: false, error: `Expected metric or number, got '${t.value}'`, referencedMetrics };
      }
    } else {
      if (t.type === 'OPERATOR') {
        expectOperand = true;
      } else {
        return { valid: false, error: `Expected operator (+, -, *, /) after '${tokens[idx - 1].value}'`, referencedMetrics };
      }
    }
  }

  if (parenDepth !== 0) {
    return { valid: false, error: 'Unclosed parenthesis in formula', referencedMetrics };
  }

  if (expectOperand) {
    return { valid: false, error: 'Formula cannot end with an operator', referencedMetrics };
  }

  return { valid: true, referencedMetrics: Array.from(new Set(referencedMetrics)) };
}

/** Evaluate custom ratio for a company safely */
export function evaluateCustomRatio(
  ratio: CustomRatio,
  company: CompanyFundamental
): number | null {
  const { tokens, error } = tokenizeFormula(ratio.formula);
  if (error || tokens.length === 0) return null;

  // Shunting-yard algorithm to convert infix to postfix (RPN)
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const outputQueue: RatioToken[] = [];
  const operatorStack: RatioToken[] = [];

  for (const token of tokens) {
    if (token.type === 'NUMBER' || token.type === 'METRIC') {
      outputQueue.push(token);
    } else if (token.type === 'OPERATOR') {
      const op1 = token.value as string;
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type === 'OPERATOR' &&
        precedence[operatorStack[operatorStack.length - 1].value as string] >= precedence[op1]
      ) {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.push(token);
    } else if (token.type === 'LPAREN') {
      operatorStack.push(token);
    } else if (token.type === 'RPAREN') {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type !== 'LPAREN'
      ) {
        outputQueue.push(operatorStack.pop()!);
      }
      operatorStack.pop(); // remove LPAREN
    }
  }

  while (operatorStack.length > 0) {
    outputQueue.push(operatorStack.pop()!);
  }

  // Evaluate RPN
  const evalStack: number[] = [];

  for (const token of outputQueue) {
    if (token.type === 'NUMBER') {
      evalStack.push(Number(token.value));
    } else if (token.type === 'METRIC') {
      let val: number | null | undefined = null;
      if (token.metricKey === 'netProfit') {
        const reportedPat = company.annualProfitLoss?.[0]?.netProfit;
        if (typeof reportedPat === 'number' && Number.isFinite(reportedPat) && reportedPat !== 0) {
          val = reportedPat;
        } else if (
          typeof company.marketCap === 'number' &&
          company.marketCap > 0 &&
          typeof company.pe === 'number' &&
          company.pe > 0
        ) {
          val = Number((company.marketCap / company.pe).toFixed(2));
        } else if (
          typeof (company as any).revenue === 'number' &&
          typeof company.npm === 'number'
        ) {
          val = Number(((((company as any).revenue ?? 0) * company.npm) / 100).toFixed(2));
        }
      } else {
        val = getMetricValue(company, token.metricKey || '');
      }
      if (val === null || val === undefined) {
        return null; // Missing metric data returns null
      }
      evalStack.push(val);
    } else if (token.type === 'OPERATOR') {
      if (evalStack.length < 2) return null;
      const b = evalStack.pop()!;
      const a = evalStack.pop()!;
      let result = 0;

      switch (token.value) {
        case '+':
          result = a + b;
          break;
        case '-':
          result = a - b;
          break;
        case '*':
          result = a * b;
          break;
        case '/':
          if (Math.abs(b) < 1e-9) {
            return null; // Zero denominator division handled cleanly
          }
          result = a / b;
          break;
        default:
          return null;
      }
      evalStack.push(result);
    }
  }

  if (evalStack.length !== 1) return null;
  const finalVal = evalStack[0];
  return Number.isFinite(finalVal) ? finalVal : null;
}

// ── Default Preset Custom Ratios ─────────────────────────────────────────────
export const DEFAULT_CUSTOM_RATIOS: CustomRatio[] = [
  {
    id: 'fcf-yield',
    name: 'FCF Yield',
    code: 'FCF_YIELD',
    formula: 'Free Cash Flow / Market Capitalization * 100',
    unit: '%',
    decimals: 2,
    description: 'Free cash flow as percentage of total market capitalization.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cfo-to-pat',
    name: 'CFO to Net Profit',
    code: 'CFO_PAT',
    formula: 'Cash from Operations / Net Profit',
    unit: 'x',
    decimals: 2,
    description: 'Quality of earnings: measures cash generation against accounting book profit.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'graham-val',
    name: 'Valuation Multiple Product',
    code: 'PE_PB_PRODUCT',
    formula: 'Price to Earning * Price to Book Value',
    unit: 'x',
    decimals: 1,
    description: 'Benjamin Graham multiple: PE × PB should ideally be under 22.5.',
    createdAt: new Date().toISOString(),
  },
];
