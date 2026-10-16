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

/** Tokenize a formula like "Free Cash Flow / Market Capitalization * 100" */
export function tokenizeFormula(formulaStr: string): { tokens: RatioToken[]; error?: string } {
  const str = formulaStr.trim();
  const tokens: RatioToken[] = [];
  let i = 0;

  while (i < str.length) {
    if (/\s/.test(str[i])) {
      i++;
      continue;
    }

    if (str[i] === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }

    if (str[i] === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }

    if (['+', '-', '*', '/'].includes(str[i])) {
      tokens.push({ type: 'OPERATOR', value: str[i] });
      i++;
      continue;
    }

    // Number literal
    const numMatch = str.slice(i).match(/^-?\d+(\.\d+)?/);
    if (numMatch && (i === 0 || /[\s(+\-*/]/.test(str[i - 1]))) {
      const numVal = parseFloat(numMatch[0]);
      tokens.push({ type: 'NUMBER', value: numVal });
      i += numMatch[0].length;
      continue;
    }

    // Metric text
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
      const val = getMetricValue(company, token.metricKey || '');
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
    formula: 'Cash from Operations / Net Profit Margin',
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
