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
  | 'NUMBER'
  | 'LPAREN'
  | 'RPAREN'
  | 'BETWEEN'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
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

    // One-char comparison ops (>, <, =)
    if (['>', '<', '='].includes(text[i])) {
      tokens.push({ type: 'OPERATOR', value: text[i] === '=' ? '==' : text[i], start: i, end: i + 1 });
      i++;
      continue;
    }

    // Numbers (positive or negative, integers or floating point)
    // Note: check if it's a number token (digits, decimal, or leading minus followed immediately by digit)
    const numMatch = text.slice(i).match(/^-?\d+(\.\d+)?/);
    if (numMatch && (i === 0 || /[\s(>=<!=]/.test(text[i - 1]))) {
      const numStr = numMatch[0];
      tokens.push({
        type: 'NUMBER',
        value: numStr,
        start: i,
        end: i + numStr.length,
      });
      i += numStr.length;
      continue;
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
  // andExpr    -> primary ( "AND" primary )*
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
    let expr = this.primary();

    while (this.peek().type === 'LOGICAL' && this.peek().value === 'AND') {
      this.advance();
      const right = this.primary();
      expr = {
        type: 'LOGICAL',
        operator: 'AND',
        left: expr,
        right,
      };
    }

    return expr;
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
      const val1 = parseFloat(this.previous().value);

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
      const val2 = parseFloat(this.previous().value);

      return {
        type: 'CONDITION',
        metricKey,
        operator: 'BETWEEN',
        value: val1,
        value2: val2,
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

    const val = parseFloat(this.previous().value);

    return {
      type: 'CONDITION',
      metricKey,
      operator,
      value: val,
      rawMetricName: metricToken.value,
    };
  }
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

/** Evaluate AST condition against a single company fundamental record */
export function evaluateNode(node: QueryNode, company: CompanyFundamental): boolean {
  if (node.type === 'CONDITION') {
    const actual = getMetricValue(company, node.metricKey);
    if (actual === null || actual === undefined) {
      return false; // missing data does not satisfy condition
    }

    switch (node.operator) {
      case '>':
        return actual > node.value;
      case '<':
        return actual < node.value;
      case '>=':
        return actual >= node.value;
      case '<=':
        return actual <= node.value;
      case '==':
      case '=':
        return Math.abs(actual - node.value) < 0.0001;
      case '!=':
        return Math.abs(actual - node.value) >= 0.0001;
      case 'BETWEEN':
        if (node.value2 !== undefined) {
          const min = Math.min(node.value, node.value2);
          const max = Math.max(node.value, node.value2);
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
    return !evaluateNode(node.node, company);
  }

  return true;
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
