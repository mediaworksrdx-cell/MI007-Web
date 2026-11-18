// ─── Institutional Financial Query Engine & AST Parser ─────────────────────
// Deterministic, secure tokenizer and AST parser for Screener expressions.
// Pure AST execution — never executes arbitrary code or dangerous evals.

import {
  QueryNode,
  QueryParseResult,
  VisualFilter,
  ComparisonOperator,
  CompanyFundamental,
} from './types';
import { resolveMetricKey, getMetricValue, METRIC_DEFINITIONS } from './metrics';

// ── Tokenizer ────────────────────────────────────────────────────────────────
export type TokenType =
  | 'METRIC'
  | 'OPERATOR'
  | 'LOGICAL'
  | 'NOT'
  | 'NUMBER'
  | 'LPAREN'
  | 'RPAREN'
  | 'BETWEEN'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  unitSuffix?: string;
  start: number;
  end: number;
  canonicalKey?: string;
}

const COMPARISON_OPS = ['>=', '<=', '!=', '==', '>', '<', '='];

export function tokenize(queryText: string): { tokens: Token[]; error?: string; errorPos?: number } {
  const text = queryText.trim();
  const tokens: Token[] = [];
  let i = 0;

  while (i < text.length) {
    // Skip whitespace & newlines
    if (/\s/.test(text[i])) {
      i++;
      continue;
    }

    // Parentheses
    if (text[i] === '(') {
      tokens.push({ type: 'LPAREN', value: '(', start: i, end: i + 1 });
      i++;
      continue;
    }
    if (text[i] === ')') {
      tokens.push({ type: 'RPAREN', value: ')', start: i, end: i + 1 });
      i++;
      continue;
    }

    // Two-char comparison ops (>=, <=, ==, !=)
    const twoChars = text.slice(i, i + 2);
    if (['>=', '<=', '==', '!='].includes(twoChars)) {
      tokens.push({ type: 'OPERATOR', value: twoChars, start: i, end: i + 2 });
      i += 2;
      continue;
    }

    // One-char comparison ops (>, <, =) or unary !
    if (['>', '<', '='].includes(text[i])) {
      tokens.push({ type: 'OPERATOR', value: text[i] === '=' ? '==' : text[i], start: i, end: i + 1 });
      i++;
      continue;
    }
    if (text[i] === '!') {
      tokens.push({ type: 'NOT', value: 'NOT', start: i, end: i + 1 });
      i++;
      continue;
    }

    // Numbers (positive or negative, integers or floating point, with optional leading dot or unit suffix)
    // Note: Do not treat leading digits as a number if the upcoming phrase matches a registered metric (e.g. "200 SMA %", "3Y ROCE")
    const toComparator = text.slice(i).split(/([><=!]|(?:\s+BETWEEN\s+))/i)[0].trim();
    const isUpcomingMetric = Boolean(toComparator && resolveMetricKey(toComparator));

    const numMatch = text.slice(i).match(/^-?(\d+(\.\d+)?|\.\d+)/);
    if (!isUpcomingMetric && numMatch && (i === 0 || /[\s(>=<!=]/.test(text[i - 1]))) {
      const numStr = numMatch[0];
      let endIdx = i + numStr.length;

      // Check for optional unit suffix (e.g. "0.5x", "0.5 x", "50%", "50 %", "1000 Cr", "5000Cr", "10B")
      const remainder = text.slice(endIdx);
      const unitMatch = remainder.match(/^(\s*)(%|x\b|X\b|cr\b|Cr\b|CR\b|crores?\b|lakhs?\b|Lakhs?\b|b\b|B\b|bn\b|Bn\b|billions?\b|m\b|M\b|mn\b|Mn\b|millions?\b|t\b|T\b|trillions?\b|times\b|Times\b|pct\b|percent\b)/i);

      let unitSuffix: string | undefined;
      if (unitMatch) {
        unitSuffix = unitMatch[2];
        endIdx += unitMatch[0].length;
      }

      const charAfter = text[endIdx];
      if (!charAfter || !/[a-zA-Z_]/.test(charAfter)) {
        tokens.push({
          type: 'NUMBER',
          value: numStr,
          unitSuffix,
          start: i,
          end: endIdx,
        });
        i = endIdx;
        continue;
      }
    }

    // Words / Identifiers (Can be metric names, AND, OR, NOT, BETWEEN)
    // Metric names can span multiple words (e.g. "Market Capitalization", "Debt to Equity")
    let wordBuffer = '';
    const wordStart = i;

    while (
      i < text.length &&
      !['(', ')', '>', '<', '=', '!'].includes(text[i])
    ) {
      wordBuffer += text[i];
      i++;

      // Check if the current accumulated text is an exact recognized keyword or operator
      const trimmed = wordBuffer.trim().toUpperCase();
      if (['AND', 'OR', 'NOT', 'BETWEEN'].includes(trimmed)) {
        // Ensure word boundary ahead
        const nextChar = text[i];
        if (!nextChar || /\s|\(/.test(nextChar)) {
          break;
        }
      }
    }

    const trimmedWord = wordBuffer.trim();
    const upperWord = trimmedWord.toUpperCase();

    if (upperWord === 'AND' || upperWord === 'OR') {
      tokens.push({
        type: 'LOGICAL',
        value: upperWord,
        start: wordStart,
        end: i,
      });
      continue;
    }

    if (upperWord === 'NOT') {
      tokens.push({
        type: 'NOT',
        value: 'NOT',
        start: wordStart,
        end: i,
      });
      continue;
    }

    if (upperWord === 'BETWEEN') {
      tokens.push({
        type: 'BETWEEN',
        value: 'BETWEEN',
        start: wordStart,
        end: i,
      });
      continue;
    }

    // Try resolving as a metric name
    const resolvedKey = resolveMetricKey(trimmedWord);
    if (resolvedKey) {
      tokens.push({
        type: 'METRIC',
        value: trimmedWord,
        canonicalKey: resolvedKey,
        start: wordStart,
        end: i,
      });
      continue;
    }

    // If multi-word buffer has trailing words that might belong to the next token, backtrack
    // e.g. "Sales Growth 5Y AND"
    const splitWords = trimmedWord.split(/\s+/);
    let matchedMetric = false;

    for (let splitIndex = splitWords.length - 1; splitIndex >= 1; splitIndex--) {
      const subMetric = splitWords.slice(0, splitIndex).join(' ');
      const key = resolveMetricKey(subMetric);
      if (key) {
        // Found metric prefix!
        tokens.push({
          type: 'METRIC',
          value: subMetric,
          canonicalKey: key,
          start: wordStart,
          end: wordStart + subMetric.length,
        });
        // Reset pointer to after subMetric
        i = wordStart + subMetric.length;
        matchedMetric = true;
        break;
      }
    }

    if (matchedMetric) {
      continue;
    }

    return {
      tokens,
      error: `Unrecognized financial metric or identifier: "${trimmedWord}"`,
      errorPos: wordStart,
    };
  }

  tokens.push({ type: 'EOF', value: '', start: i, end: i });
  return { tokens };
}

// ── Recursive Descent AST Parser ─────────────────────────────────────────────
class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', start: 0, end: 0 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.peek().type === type) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  public parse(): QueryParseResult {
    try {
      if (this.isAtEnd()) {
        return { valid: true };
      }
      const ast = this.expression();
      if (!this.isAtEnd()) {
        const unexpected = this.peek();
        return {
          valid: false,
          error: `Unexpected token '${unexpected.value}' at position ${unexpected.start}`,
          errorPosition: unexpected.start,
        };
      }
      return { valid: true, ast };
    } catch (err: any) {
      return {
        valid: false,
        error: err.message || 'Syntax parse error',
        errorPosition: err.position || this.peek().start,
      };
    }
  }

  // Grammar:
  // expression -> orExpr
  // orExpr     -> andExpr ( "OR" andExpr )*
  // andExpr    -> unary ( "AND" unary )*
  // unary      -> "NOT" unary | primary
  // primary    -> "(" expression ")" | condition

  private expression(): QueryNode {
    return this.orExpr();
  }

  private orExpr(): QueryNode {
    let expr = this.andExpr();

    while (this.peek().type === 'LOGICAL' && this.peek().value === 'OR') {
      this.advance();
      const right = this.andExpr();
      expr = {
        type: 'LOGICAL',
        operator: 'OR',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private andExpr(): QueryNode {
    let expr = this.unary();

    while (this.peek().type === 'LOGICAL' && this.peek().value === 'AND') {
      this.advance();
      const right = this.unary();
      expr = {
        type: 'LOGICAL',
        operator: 'AND',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private unary(): QueryNode {
    if (this.match('NOT')) {
      return {
        type: 'NOT',
        node: this.unary(),
      };
    }
    return this.primary();
  }

  private primary(): QueryNode {
    if (this.match('LPAREN')) {
      const expr = this.expression();
      if (!this.match('RPAREN')) {
        const err: any = new Error("Expected closing ')'");
        err.position = this.peek().start;
        throw err;
      }
      return expr;
    }

    return this.condition();
  }

  private condition(): QueryNode {
    if (!this.match('METRIC')) {
      const token = this.peek();
      const err: any = new Error(
        token.type === 'EOF'
          ? 'Expected a metric condition before end of query'
          : `Expected financial metric name, found '${token.value}'`
      );
      err.position = token.start;
      throw err;
    }

    const metricToken = this.previous();
    const metricKey = metricToken.canonicalKey || metricToken.value;

    // Check for BETWEEN operator: e.g. "ROCE BETWEEN 15 AND 30"
    if (this.match('BETWEEN')) {
      if (!this.match('NUMBER')) {
        const err: any = new Error(`Expected numeric lower bound after BETWEEN for '${metricToken.value}'`);
        err.position = this.peek().start;
        throw err;
      }
      const num1 = this.previous();
      const raw1 = parseFloat(num1.value);
      const val1 = scaleValueForMetricAndMarket(raw1, metricKey, num1.unitSuffix, 'INDIA');

      if (!this.match('LOGICAL') || this.previous().value !== 'AND') {
        const err: any = new Error("Expected 'AND' between range values in BETWEEN clause");
        err.position = this.peek().start;
        throw err;
      }

      if (!this.match('NUMBER')) {
        const err: any = new Error(`Expected numeric upper bound after AND in BETWEEN clause`);
        err.position = this.peek().start;
        throw err;
      }
      const num2 = this.previous();
      const raw2 = parseFloat(num2.value);
      const val2 = scaleValueForMetricAndMarket(raw2, metricKey, num2.unitSuffix, 'INDIA');

      return {
        type: 'CONDITION',
        metricKey,
        operator: 'BETWEEN',
        value: val1,
        value2: val2,
        rawValue: raw1,
        rawValue2: raw2,
        unitSuffix: num1.unitSuffix,
        unitSuffix2: num2.unitSuffix,
        rawMetricName: metricToken.value,
      };
    }

    // Standard comparison operator
    if (!this.match('OPERATOR')) {
      const err: any = new Error(
        `Expected comparison operator (>, <, >=, <=, =, !=) after '${metricToken.value}'`
      );
      err.position = this.peek().start;
      throw err;
    }

    const opToken = this.previous();
    const operator = (opToken.value === '=' ? '==' : opToken.value) as ComparisonOperator;

    if (!this.match('NUMBER')) {
      const err: any = new Error(
        `Expected numeric value after operator '${opToken.value}' for metric '${metricToken.value}'`
      );
      err.position = this.peek().start;
      throw err;
    }

    const numToken = this.previous();
    const rawVal = parseFloat(numToken.value);
    const val = scaleValueForMetricAndMarket(rawVal, metricKey, numToken.unitSuffix, 'INDIA');

    return {
      type: 'CONDITION',
      metricKey,
      operator,
      value: val,
      rawValue: rawVal,
      unitSuffix: numToken.unitSuffix,
      rawMetricName: metricToken.value,
    };
  }
}

/**
 * SC6: Scales a parsed numeric literal according to its unit suffix and the target market's storage unit.
 * - For ratio metrics: 'x%' -> x / 100 (with no > 1 guard, so 1% -> 0.01)
 * - For currency metrics stored in 'Cr' (India) vs 'B' (USA/UAE):
 *   India (Cr): cr/crore=1, lakh/lakhs=0.01, m/mn/million=0.1, b/bn/billion=100, t/trillion=100000
 *   USA/UAE (B): b/bn/billion=1, m/mn/million=0.001, t/trillion=1000, cr/crore=0.01, lakh/lakhs=0.0001
 */
export function scaleValueForMetricAndMarket(
  rawVal: number,
  metricKey: string,
  unitSuffix?: string,
  market: string = 'INDIA'
): number {
  const def = METRIC_DEFINITIONS.find((m) => m.key === metricKey);
  const u = (unitSuffix || '').trim().toLowerCase();
  const isIndia = (market || 'INDIA').toUpperCase() === 'INDIA';

  if (u === '%' || u === 'pct' || u === 'percent') {
    if (def?.dataType === 'ratio') {
      return rawVal / 100;
    }
    return rawVal;
  }

  if (def?.dataType === 'currency' && def.unit === 'Cr') {
    if (u) {
      if (isIndia) {
        const SCALE_CR: Record<string, number> = {
          cr: 1,
          crore: 1,
          crores: 1,
          lakh: 0.01,
          lakhs: 0.01,
          m: 0.1,
          mn: 0.1,
          million: 0.1,
          millions: 0.1,
          b: 100,
          bn: 100,
          billion: 100,
          billions: 100,
          t: 100000,
          trillion: 100000,
          trillions: 100000,
        };
        if (SCALE_CR[u] !== undefined) return rawVal * SCALE_CR[u];
      } else {
        const SCALE_B: Record<string, number> = {
          b: 1,
          bn: 1,
          billion: 1,
          billions: 1,
          m: 0.001,
          mn: 0.001,
          million: 0.001,
          millions: 0.001,
          t: 1000,
          trillion: 1000,
          trillions: 1000,
          cr: 0.01,
          crore: 0.01,
          crores: 0.01,
          lakh: 0.0001,
          lakhs: 0.0001,
        };
        if (SCALE_B[u] !== undefined) return rawVal * SCALE_B[u];
      }
    } else if (!isIndia && Math.abs(rawVal) >= 1e6) {
      // Raw USD/AED value (e.g. 1000000000) compared against Billions storage unit
      return rawVal / 1e9;
    }
  }

  return rawVal;
}

/** Parse query string into AST */
export function parseQuery(queryText: string): QueryParseResult {
  if (!queryText || !queryText.trim()) {
    return { valid: true };
  }

  const { tokens, error, errorPos } = tokenize(queryText);
  if (error) {
    return {
      valid: false,
      error,
      errorPosition: errorPos,
    };
  }

  const parser = new Parser(tokens);
  return parser.parse();
}

function hasMissingMetricInSubtree(node: QueryNode, company: CompanyFundamental): boolean {
  if (node.type === 'CONDITION') {
    const v = getMetricValue(company, node.metricKey);
    return v === null || v === undefined || Number.isNaN(v);
  }
  if (node.type === 'NOT') {
    return hasMissingMetricInSubtree(node.node, company);
  }
  if (node.type === 'LOGICAL') {
    if (node.operator === 'AND') {
      return hasMissingMetricInSubtree(node.left, company) || hasMissingMetricInSubtree(node.right, company);
    }
    return hasMissingMetricInSubtree(node.left, company) && hasMissingMetricInSubtree(node.right, company);
  }
  return false;
}

/** Evaluate AST condition against a single company fundamental record */
export function evaluateNode(node: QueryNode, company: CompanyFundamental): boolean {
  if (node.type === 'CONDITION') {
    const actual = getMetricValue(company, node.metricKey);
    if (actual === null || actual === undefined || Number.isNaN(actual)) {
      return false; // missing data does not satisfy condition
    }

    const mkt = company.market || 'INDIA';
    const targetVal =
      node.rawValue !== undefined
        ? scaleValueForMetricAndMarket(node.rawValue, node.metricKey, node.unitSuffix, mkt)
        : node.value;

    switch (node.operator) {
      case '>':
        return actual > targetVal;
      case '<':
        return actual < targetVal;
      case '>=':
        return actual >= targetVal;
      case '<=':
        return actual <= targetVal;
      case '==':
      case '=':
        return Math.abs(actual - targetVal) < 0.0001;
      case '!=':
        return Math.abs(actual - targetVal) >= 0.0001;
      case 'BETWEEN':
        if (node.value2 !== undefined) {
          const targetVal2 =
            node.rawValue2 !== undefined
              ? scaleValueForMetricAndMarket(node.rawValue2, node.metricKey, node.unitSuffix2, mkt)
              : node.value2;
          const min = Math.min(targetVal, targetVal2);
          const max = Math.max(targetVal, targetVal2);
          return actual >= min && actual <= max;
        }
        return false;
      default:
        return false;
    }
  }

  if (node.type === 'LOGICAL') {
    if (node.operator === 'AND') {
      return evaluateNode(node.left, company) && evaluateNode(node.right, company);
    }
    if (node.operator === 'OR') {
      return evaluateNode(node.left, company) || evaluateNode(node.right, company);
    }
  }

  if (node.type === 'NOT') {
    if (hasMissingMetricInSubtree(node.node, company)) {
      return false;
    }
    return !evaluateNode(node.node, company);
  }

  return true;
}

/** Collect all canonical metric keys referenced in a QueryNode AST */
export function collectQueryMetrics(node?: QueryNode): string[] {
  if (!node) return [];
  if (node.type === 'CONDITION') return [node.metricKey];
  if (node.type === 'NOT') return collectQueryMetrics(node.node);
  if (node.type === 'LOGICAL') {
    return Array.from(new Set([...collectQueryMetrics(node.left), ...collectQueryMetrics(node.right)]));
  }
  return [];
}

/**
 * SC6: Computes how many companies in the universe were excluded for missing data per metric in the query.
 */
export function computeExcludedForMissingData(
  node: QueryNode | undefined,
  companies: CompanyFundamental[]
): { excludedForMissingData: Record<string, number>; totalExcludedForMissingData: number } {
  const keys = collectQueryMetrics(node);
  const excludedForMissingData: Record<string, number> = {};
  if (keys.length === 0) {
    return { excludedForMissingData, totalExcludedForMissingData: 0 };
  }
  let totalExcludedForMissingData = 0;
  for (const key of keys) {
    excludedForMissingData[key] = 0;
  }
  for (const comp of companies) {
    let anyMissing = false;
    for (const key of keys) {
      const val = getMetricValue(comp, key);
      if (val === null || val === undefined || Number.isNaN(val)) {
        excludedForMissingData[key]++;
        anyMissing = true;
      }
    }
    if (anyMissing) totalExcludedForMissingData++;
  }
  return { excludedForMissingData, totalExcludedForMissingData };
}

/** Convert visual filters array into canonical text query */
export function visualFiltersToQuery(filters: VisualFilter[]): string {
  if (!filters || filters.length === 0) return '';
  return filters
    .map((f) => {
      const def = METRIC_DEFINITIONS.find((m) => m.key === f.metricKey);
      const name = def?.label || f.metricKey;
      if (f.operator === 'BETWEEN' && f.value2 !== undefined) {
        return `${name} BETWEEN ${f.value} AND ${f.value2}`;
      }
      return `${name} ${f.operator} ${f.value}`;
    })
    .join('\nAND ');
}

/** Convert visual filters directly into QueryNode AST */
export function visualFiltersToAST(filters: VisualFilter[]): QueryNode | undefined {
  if (!filters || filters.length === 0) return undefined;

  let current: QueryNode = {
    type: 'CONDITION',
    metricKey: filters[0].metricKey,
    operator: filters[0].operator,
    value: filters[0].value,
    value2: filters[0].value2,
    rawMetricName: filters[0].metricKey,
  };

  for (let i = 1; i < filters.length; i++) {
    const next: QueryNode = {
      type: 'CONDITION',
      metricKey: filters[i].metricKey,
      operator: filters[i].operator,
      value: filters[i].value,
      value2: filters[i].value2,
      rawMetricName: filters[i].metricKey,
    };
    current = {
      type: 'LOGICAL',
      operator: 'AND',
      left: current,
      right: next,
    };
  }

  return current;
}
