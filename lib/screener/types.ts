// ─── MI007 Institutional Stock Screener — Type Definitions ──────────────────
// Architecture inspired by Screener.in's documented capabilities & institutional equity workflows.

export type MarketRegion = 'INDIA' | 'USA' | 'UAE';

export type MetricCategory = 
  | 'valuation'
  | 'growth'
  | 'profitability'
  | 'health'
  | 'ownership'
  | 'market'
  | 'custom';

export type MetricDataType = 'number' | 'currency' | 'percent' | 'ratio' | 'integer' | 'string';

export interface MetricDefinition {
  key: string;
  label: string;
  aliases: string[];
  category: MetricCategory;
  dataType: MetricDataType;
  unit: string;
  description: string;
  formulaDescription?: string;
  benchmarkGood?: string;
  decimals?: number;
  higherIsBetter?: boolean;
}

// ── Financial Statement Row ──────────────────────────────────────────────────
export interface FinancialPeriodData {
  period: string; // e.g. "Mar 2026", "Sep 2026", "FY26"
  [metricKey: string]: number | string | null;
}

export interface QuarterlyResult {
  quarter: string; // e.g. "Sep 2026"
  sales: number;
  expenses: number;
  operatingProfit: number;
  opmPct: number;
  otherIncome: number;
  interest: number;
  depreciation: number;
  profitBeforeTax: number;
  taxPct: number;
  netProfit: number;
  eps: number;
}

export interface AnnualPL {
  year: string; // e.g. "Mar 2024"
  sales: number;
  salesGrowthPct?: number;
  expenses: number;
  operatingProfit: number;
  opmPct: number;
  otherIncome: number;
  interest: number;
  depreciation: number;
  profitBeforeTax: number;
  taxPct: number;
  netProfit: number;
  eps: number;
  dividendPayoutPct: number;
}

export interface BalanceSheetYear {
  year: string; // e.g. "Mar 2024"
  equityCapital: number;
  reserves: number;
  borrowings: number;
  otherLiabilities: number;
  totalLiabilities: number;
  fixedAssets: number;
  cwip: number; // Capital Work In Progress
  investments: number;
  otherAssets: number;
  totalAssets: number;
}

export interface CashFlowYear {
  year: string; // e.g. "Mar 2024"
  cashFromOperating: number;
  cashFromInvesting: number;
  cashFromFinancing: number;
  netCashFlow: number;
  freeCashFlow?: number;
}

export interface HistoricalRatiosYear {
  year: string; // e.g. "Mar 2024"
  rocePct: number;
  roePct: number;
  debtorDays: number;
  inventoryDays: number;
  daysPayable: number;
  cashConversionCycle: number;
  workingCapitalDays: number;
}

export interface ShareholdingQuarter {
  quarter: string; // e.g. "Dec 2024"
  promoter: number;
  fii: number;
  dii: number;
  government: number;
  public: number;
  pledgedPct: number;
}

// ── Complete Company Fundamental Model ─────────────────────────────────────────
export interface CompanyFundamental {
  id: string;
  symbol: string;
  name: string;
  exchange: string; // NSE, BSE, NASDAQ, NYSE, DFM, ADX
  market: MarketRegion;
  country: string;
  currency: string;
  currencySymbol: string;
  sector: string;
  industry: string;
  marketCapCategory: 'Mega' | 'Large' | 'Mid' | 'Small' | 'Micro';
  isConsolidated: boolean;
  about: string;
  website: string;
  dataFreshness: string; // e.g. "Q2 FY27 (Sep 2026)"
  lastUpdated: string;

  // Valuation
  currentPrice: number;
  priceChangePct: number;
  marketCap: number; // In Crores for INDIA, Billions for USA/UAE
  enterpriseValue: number;
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  priceToSales: number | null;
  evToEbitda: number | null;
  evToEbit: number | null;
  earningsYield: number | null;
  dividendYield: number | null;
  fcfYield: number | null;
  pegRatio: number | null;

  // Growth
  salesGrowth1Y: number | null;
  salesGrowth3Y: number | null;
  salesGrowth5Y: number | null;
  salesGrowth10Y: number | null;
  profitGrowth1Y: number | null;
  profitGrowth3Y: number | null;
  profitGrowth5Y: number | null;
  profitGrowth10Y: number | null;
  epsGrowth: number | null;
  ebitdaGrowth: number | null;
  qtrSalesGrowthYoY: number | null;
  qtrProfitGrowthYoY: number | null;

  // Profitability & Quality
  roce: number | null;
  roe: number | null;
  roic: number | null;
  roa: number | null;
  opm: number | null; // Operating profit margin %
  npm: number | null; // Net profit margin %
  grossMargin: number | null;
  ebitdaMargin: number | null;
  roce3YAvg: number | null;
  roe3YAvg: number | null;
  roce5YAvg: number | null;

  // Financial Health & Solvency
  debtToEquity: number | null;
  netDebt: number | null;
  interestCoverage: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  cfo: number | null; // Cash from Operations
  freeCashFlow: number | null;
  cashConversionCycle: number | null;
  capex: number | null;
  workingCapitalDays: number | null;
  debtReduction3Y: number | null;
  piotroskiScore?: number | null;
  altmanZScore?: number | null;

  // Ownership & Governance
  promoterHolding: number | null;
  promoterHoldingChange3Y: number | null;
  pledgedPct: number | null;
  fiiHolding: number | null;
  diiHolding: number | null;
  publicHolding: number | null;

  // Market & Technical
  high52W: number;
  low52W: number;
  priceTo52WHighPct: number;
  priceReturn1M: number;
  priceReturn1Y: number;
  volume: number;
  beta: number | null;

  // Automated Institutional Insights (Screener.in style)
  pros: string[];
  cons: string[];

  // Detailed Historical Statement Series
  quarterlyResults: QuarterlyResult[];
  annualProfitLoss: AnnualPL[];
  balanceSheet: BalanceSheetYear[];
  cashFlow: CashFlowYear[];
  historicalRatios: HistoricalRatiosYear[];
  shareholdingPattern: ShareholdingQuarter[];
}

// ── Query Engine AST & Types ─────────────────────────────────────────────────
export type ComparisonOperator = 
  | '>'
  | '<'
  | '>='
  | '<='
  | '=='
  | '='
  | '!='
  | 'BETWEEN';

export type LogicalOperator = 'AND' | 'OR';

export interface VisualFilter {
  id: string;
  metricKey: string;
  operator: ComparisonOperator;
  value: number;
  value2?: number; // for BETWEEN
}

export type QueryNode =
  | {
      type: 'CONDITION';
      metricKey: string;
      operator: ComparisonOperator;
      value: number;
      value2?: number;
      rawMetricName: string;
    }
  | {
      type: 'LOGICAL';
      operator: LogicalOperator;
      left: QueryNode;
      right: QueryNode;
    }
  | {
      type: 'NOT';
      node: QueryNode;
    };

export interface QueryParseResult {
  valid: boolean;
  ast?: QueryNode;
  error?: string;
  errorPosition?: number;
  warnings?: string[];
  canonicalQuery?: string;
}

// ── Saved Screen & Custom Formulas ───────────────────────────────────────────
export interface SavedScreen {
  id: string;
  name: string;
  description: string;
  query: string;
  visualFilters?: VisualFilter[];
  columns: string[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  market: MarketRegion;
  sectorFilter?: string;
  industryFilter?: string;
  isPredefined?: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
  matchCount?: number;
}

export interface CustomRatio {
  id: string;
  name: string;
  code: string; // Identifier e.g. "FCF_YIELD"
  formula: string; // e.g. "Free Cash Flow / Market Capitalization * 100"
  unit: string;
  decimals: number;
  description: string;
  createdAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string;
  symbols: string[];
  market: MarketRegion;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningAlert {
  id: string;
  name: string;
  screenId?: string;
  screenName?: string;
  symbol?: string;
  metricKey?: string;
  operator?: ComparisonOperator;
  threshold?: number;
  enabled: boolean;
  triggerType: 'SCREEN_ENTRY_EXIT' | 'METRIC_CROSS';
  frequency: 'DAILY' | 'WEEKLY' | 'STATEMENT_RELEASE';
  lastTriggered?: string;
  createdAt: string;
  recentTriggers: {
    timestamp: string;
    symbol: string;
    message: string;
  }[];
}

export interface ScreenExecutionResult {
  companies: CompanyFundamental[];
  totalMatches: number;
  executionTimeMs: number;
  queryParsed: boolean;
  activeFiltersCount: number;
  dataTimestamp: string;
}
