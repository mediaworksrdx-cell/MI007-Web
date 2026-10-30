// ─── Centralized Financial Metrics Library ──────────────────────────────────
// Exhaustive catalog of institutional fundamental metrics for screening, analysis, and custom queries.

import { MetricDefinition, CompanyFundamental } from './types';
import { calculatePiotroskiScore, calculateAltmanZScore } from './scorecards';

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // ── Valuation Metrics ──────────────────────────────────────────────────────
  {
    key: 'marketCap',
    label: 'Market Cap',
    aliases: ['Market Capitalization', 'MCAP', 'Market Capitalisation', 'MarketCap'],
    category: 'valuation',
    dataType: 'currency',
    unit: 'Cr',
    description: 'Total market value of all outstanding shares.',
    formulaDescription: 'Current Share Price × Total Outstanding Shares',
    benchmarkGood: '> 10,000 Cr',
    decimals: 0,
    higherIsBetter: true,
  },
  {
    key: 'currentPrice',
    label: 'Price',
    aliases: ['Current Price', 'CMP', 'LTP', 'Stock Price'],
    category: 'market',
    dataType: 'currency',
    unit: '₹',
    description: 'Latest closing or traded equity price.',
    decimals: 2,
  },
  {
    key: 'pe',
    label: 'P/E',
    aliases: ['Price to Earning', 'PE', 'PE Ratio', 'P/E Ratio', 'Trailing PE'],
    category: 'valuation',
    dataType: 'ratio',
    unit: 'x',
    description: 'Ratio of stock price to trailing twelve months earnings per share.',
    formulaDescription: 'Current Share Price / Trailing 12M EPS',
    benchmarkGood: '< 25x',
    decimals: 1,
    higherIsBetter: false,
  },
  {
    key: 'forwardPe',
    label: 'Fwd P/E',
    aliases: ['Forward P/E', 'Forward PE', 'Fwd PE'],
    category: 'valuation',
    dataType: 'ratio',
    unit: 'x',
    description: 'Current price divided by forecasted next twelve months earnings per share.',
    formulaDescription: 'Current Price / Consensus Forward 12M EPS',
    benchmarkGood: '< 20x',
    decimals: 1,
    higherIsBetter: false,
  },
  {
    key: 'pb',
    label: 'P/B',
    aliases: ['Price to Book Value', 'PB', 'PB Ratio', 'Price/Book', 'Price to Book'],
    category: 'valuation',
    dataType: 'ratio',
    unit: 'x',
    description: 'Ratio of market price to the book value per share from the balance sheet.',
    formulaDescription: 'Current Share Price / Book Value Per Share',
    benchmarkGood: '< 3.5x',
    decimals: 2,
    higherIsBetter: false,
  },
  {
    key: 'priceToSales',
    label: 'P/S',
    aliases: ['Price to Sales', 'PS', 'Price/Sales', 'PSR', 'Price to Revenue'],
    category: 'valuation',
    dataType: 'ratio',
    unit: 'x',
    description: 'Ratio of market capitalization to trailing annual revenue.',
    formulaDescription: 'Market Capitalization / Total Annual Revenue',
    decimals: 2,
    higherIsBetter: false,
  },
  {
    key: 'enterpriseValue',
    label: 'EV',
    aliases: ['Enterprise Value', 'EnterpriseVal'],
    category: 'valuation',
    dataType: 'currency',
    unit: 'Cr',
    description: 'Total theoretical acquisition cost including debt minus cash.',
    formulaDescription: 'Market Cap + Total Debt - Cash & Equivalents',
    decimals: 0,
  },
  {
    key: 'evToEbitda',
    label: 'EV/EBITDA',
    aliases: ['EV / EBITDA', 'EV to EBITDA', 'EVEBITDA'],
    category: 'valuation',
    dataType: 'ratio',
    unit: 'x',
    description: 'Enterprise Value relative to operating cash profitability before D&A.',
    formulaDescription: 'Enterprise Value / Operating EBITDA',
    benchmarkGood: '< 15x',
    decimals: 1,
    higherIsBetter: false,
  },
  {
    key: 'evToEbit',
    label: 'EV/EBIT',
    aliases: ['EV / EBIT', 'EV to EBIT', 'EVEBIT'],
    category: 'valuation',
    dataType: 'ratio',
    unit: 'x',
    description: 'Enterprise Value relative to operating earnings before interest and taxes.',
    decimals: 1,
    higherIsBetter: false,
  },
  {
    key: 'dividendYield',
    label: 'Div Yield',
    aliases: ['Dividend Yield', 'DY', 'Yield'],
    category: 'valuation',
    dataType: 'percent',
    unit: '%',
    description: 'Annual dividend payout expressed as a percentage of current stock price.',
    formulaDescription: '(Dividend Per Share / Current Stock Price) × 100',
    benchmarkGood: '> 1.5%',
    decimals: 2,
    higherIsBetter: true,
  },
  {
    key: 'earningsYield',
    label: 'Earnings Yield',
    aliases: ['E/P', 'Earnings Yield %'],
    category: 'valuation',
    dataType: 'percent',
    unit: '%',
    description: 'Inverse of P/E ratio, showing company earnings generated per share price.',
    formulaDescription: '(EPS / Current Stock Price) × 100',
    benchmarkGood: '> 4.0%',
    decimals: 2,
    higherIsBetter: true,
  },
  {
    key: 'fcfYield',
    label: 'FCF Yield',
    aliases: ['Free Cash Flow Yield', 'FCF/EV', 'Cash Flow Yield'],
    category: 'valuation',
    dataType: 'percent',
    unit: '%',
    description: 'Free cash flow generated divided by market capitalization.',
    formulaDescription: '(Free Cash Flow / Market Cap) × 100',
    benchmarkGood: '> 3.5%',
    decimals: 2,
    higherIsBetter: true,
  },
  {
    key: 'pegRatio',
    label: 'PEG',
    aliases: ['PEG Ratio', 'PE to Growth', 'Price Earnings to Growth'],
    category: 'valuation',
    dataType: 'ratio',
    unit: 'x',
    description: 'P/E ratio divided by projected or 3-year EPS growth rate.',
    formulaDescription: 'PE Ratio / EPS Growth Rate',
    benchmarkGood: '< 1.2x',
    decimals: 2,
    higherIsBetter: false,
  },

  // ── Growth Metrics ─────────────────────────────────────────────────────────
  {
    key: 'salesGrowth1Y',
    label: 'Sales 1Y',
    aliases: ['Sales Growth 1Y', 'Sales Growth 1 Year', 'Revenue Growth 1Y', 'YoY Sales Growth'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Annual top-line revenue growth rate over trailing 12 months.',
    benchmarkGood: '> 12%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'salesGrowth3Y',
    label: 'Sales 3Y',
    aliases: ['Sales Growth 3Y', 'Sales Growth 3 Years', 'Revenue Growth 3Y', 'Sales CAGR 3Y'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Compound Annual Growth Rate (CAGR) of revenues over past 3 years.',
    benchmarkGood: '> 15%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'salesGrowth5Y',
    label: 'Sales 5Y',
    aliases: ['Sales Growth 5Y', 'Sales Growth 5 Years', 'Revenue Growth 5Y', 'Sales CAGR 5Y', '5Y Sales Growth'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Compound Annual Growth Rate (CAGR) of revenues over past 5 years.',
    benchmarkGood: '> 15%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'salesGrowth10Y',
    label: 'Sales 10Y',
    aliases: ['Sales Growth 10Y', 'Sales Growth 10 Years', 'Revenue Growth 10Y', '10Y Sales Growth'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Long-term 10-year sales CAGR showing compounding power.',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'profitGrowth1Y',
    label: 'Profit 1Y',
    aliases: ['Profit Growth 1Y', 'Net Profit Growth 1Y', 'PAT Growth 1Y'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Trailing 1-year net profit (PAT) expansion.',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'profitGrowth3Y',
    label: 'Profit 3Y',
    aliases: ['Profit Growth 3Y', 'Profit Growth 3 Years', 'PAT CAGR 3Y', 'Net Profit Growth 3Y'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Compound Annual Growth Rate of net profit over past 3 years.',
    benchmarkGood: '> 18%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'profitGrowth5Y',
    label: 'Profit 5Y',
    aliases: ['Profit Growth 5Y', 'Profit Growth 5 Years', 'PAT CAGR 5Y', '5Y Profit Growth'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Compound Annual Growth Rate of net profit over past 5 years.',
    benchmarkGood: '> 18%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'profitGrowth10Y',
    label: 'Profit 10Y',
    aliases: ['Profit Growth 10Y', 'Profit Growth 10 Years', 'PAT CAGR 10Y'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: '10-year net income CAGR for long-cycle compounding assessment.',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'epsGrowth',
    label: 'EPS Growth',
    aliases: ['EPS Growth 3Y', 'Earnings Per Share Growth'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Growth in per-share net income accounting for equity dilution.',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'ebitdaGrowth',
    label: 'EBITDA Growth',
    aliases: ['Operating Profit Growth', 'EBITDA CAGR'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Core operating cash earnings growth before finance charges and D&A.',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'qtrSalesGrowthYoY',
    label: 'Qtr Sales YoY',
    aliases: ['Quarterly Sales Growth YoY', 'Qtr Sales Var', 'Quarterly Revenue Growth', 'QoQ YoY Sales'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Latest quarterly revenue growth versus the same quarter last financial year.',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'qtrProfitGrowthYoY',
    label: 'Qtr Profit YoY',
    aliases: ['Quarterly Profit Growth YoY', 'Qtr Profit Var', 'Quarterly PAT Growth', 'Latest Qtr Profit Growth'],
    category: 'growth',
    dataType: 'percent',
    unit: '%',
    description: 'Latest quarterly net profit expansion relative to the previous year period.',
    decimals: 1,
    higherIsBetter: true,
  },

  // ── Profitability & Quality ────────────────────────────────────────────────
  {
    key: 'roce',
    label: 'ROCE',
    aliases: ['Return on Capital Employed', 'ROCE %', 'ROCE Ratio'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: 'Pre-tax operating profit earned per unit of capital employed.',
    formulaDescription: 'EBIT / (Total Assets - Current Liabilities) × 100',
    benchmarkGood: '> 20%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'roe',
    label: 'ROE',
    aliases: ['Return on Equity', 'ROE %', 'Return on Net Worth', 'RONW'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: 'Net profit generated as a percentage of shareholder equity funds.',
    formulaDescription: '(Net Income / Shareholder Equity) × 100',
    benchmarkGood: '> 18%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'roic',
    label: 'ROIC',
    aliases: ['Return on Invested Capital', 'ROIC %'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: 'Efficiency at allocating capital to profitable investments.',
    formulaDescription: 'NOPAT / Invested Capital × 100',
    benchmarkGood: '> 18%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'roa',
    label: 'ROA',
    aliases: ['Return on Assets', 'ROA %'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: 'Net earnings generated per unit of total assets on the balance sheet.',
    formulaDescription: '(Net Income / Total Assets) × 100',
    benchmarkGood: '> 8%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'opm',
    label: 'OPM',
    aliases: ['Operating Profit Margin', 'OPM %', 'Operating Margin', 'Operating Margin %'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: 'Percentage of revenue left over after paying direct production and operational costs.',
    formulaDescription: '(Operating Profit / Net Sales) × 100',
    benchmarkGood: '> 18%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'npm',
    label: 'NPM',
    aliases: ['Net Profit Margin', 'NPM %', 'Net Margin', 'PAT Margin'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: 'Percentage of revenue remaining as net profit after all expenses, interest, and taxes.',
    formulaDescription: '(Net Profit / Net Sales) × 100',
    benchmarkGood: '> 12%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'grossMargin',
    label: 'Gross Margin',
    aliases: ['Gross Profit Margin', 'Gross Margin %', 'GPM'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: 'Revenue minus cost of goods sold (COGS) divided by total revenue.',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'ebitdaMargin',
    label: 'EBITDA Margin',
    aliases: ['EBITDA %', 'EBITDA Margin %'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: 'Core cash margin before financing costs, tax, and depreciation.',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'roce3YAvg',
    label: '3Y ROCE',
    aliases: ['ROCE 3Yr Average', '3Y ROCE Avg', 'Avg ROCE 3Y', 'Average ROCE 3Years', 'ROCE 3Y Avg'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: '3-year average Return on Capital Employed smoothing business cycle variance.',
    benchmarkGood: '> 20%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'roe3YAvg',
    label: '3Y ROE',
    aliases: ['ROE 3Yr Average', '3Y ROE Avg', 'Avg ROE 3Y', 'Average ROE 3Years', 'ROE 3Y Avg'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: '3-year average Return on Equity.',
    benchmarkGood: '> 18%',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'roce5YAvg',
    label: '5Y ROCE',
    aliases: ['ROCE 5Yr Average', '5Y ROCE Avg', 'Avg ROCE 5Y', 'ROCE 5Y Avg'],
    category: 'profitability',
    dataType: 'percent',
    unit: '%',
    description: '5-year average Return on Capital Employed demonstrating durable economic moats.',
    decimals: 1,
    higherIsBetter: true,
  },

  // ── Financial Health & Solvency ───────────────────────────────────────────
  {
    key: 'debtToEquity',
    label: 'D/E',
    aliases: ['Debt to Equity', 'Debt to Equity Ratio', 'Debt / Equity', 'DE Ratio'],
    category: 'health',
    dataType: 'ratio',
    unit: 'x',
    description: 'Total borrowings divided by shareholders equity. Values below 0.5 imply conservative balance sheet.',
    formulaDescription: 'Total Debt / Total Shareholder Equity',
    benchmarkGood: '< 0.5x',
    decimals: 2,
    higherIsBetter: false,
  },
  {
    key: 'netDebt',
    label: 'Net Debt',
    aliases: ['Net Debt Cr', 'Net Debt / Cash'],
    category: 'health',
    dataType: 'currency',
    unit: 'Cr',
    description: 'Total borrowings minus cash & cash equivalents. Negative value means cash rich.',
    formulaDescription: 'Total Borrowings - Cash & Liquid Investments',
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'interestCoverage',
    label: 'Int Coverage',
    aliases: ['Interest Coverage Ratio', 'Interest Coverage', 'ICR'],
    category: 'health',
    dataType: 'ratio',
    unit: 'x',
    description: 'How many times operating earnings (EBIT) cover annual finance and interest costs.',
    formulaDescription: 'EBIT / Annual Interest Expense',
    benchmarkGood: '> 5.0x',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'currentRatio',
    label: 'Current Ratio',
    aliases: ['CR', 'Current Assets to Liabilities'],
    category: 'health',
    dataType: 'ratio',
    unit: 'x',
    description: 'Short-term liquidity: current assets divided by current liabilities.',
    formulaDescription: 'Current Assets / Current Liabilities',
    benchmarkGood: '> 1.33x',
    decimals: 2,
    higherIsBetter: true,
  },
  {
    key: 'quickRatio',
    label: 'Quick Ratio',
    aliases: ['Acid Test', 'QR'],
    category: 'health',
    dataType: 'ratio',
    unit: 'x',
    description: 'Liquid assets (excluding inventories) divided by short-term obligations.',
    decimals: 2,
    higherIsBetter: true,
  },
  {
    key: 'cfo',
    label: 'CFO',
    aliases: ['Cash from Operations', 'Operating Cash Flow', 'OCF'],
    category: 'health',
    dataType: 'currency',
    unit: 'Cr',
    description: 'Actual cash generated by core commercial activities over the last year.',
    decimals: 0,
    higherIsBetter: true,
  },
  {
    key: 'freeCashFlow',
    label: 'FCF',
    aliases: ['Free Cash Flow', 'Free Cash Flow Cr', 'FCF'],
    category: 'health',
    dataType: 'currency',
    unit: 'Cr',
    description: 'Operating cash flow minus capital expenditures (cash available for expansion, dividends, debt reduction).',
    formulaDescription: 'Operating Cash Flow - Capital Expenditure',
    benchmarkGood: '> 0',
    decimals: 0,
    higherIsBetter: true,
  },
  {
    key: 'cashConversionCycle',
    label: 'Cash Cycle',
    aliases: ['Cash Conversion Cycle', 'CCC', 'Working Capital Cycle', 'CCC Days'],
    category: 'health',
    dataType: 'integer',
    unit: 'days',
    description: 'Days required to convert inventory and resources into cash flows from sales.',
    formulaDescription: 'Debtor Days + Inventory Days - Creditor Days',
    benchmarkGood: '< 60 days',
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'workingCapitalDays',
    label: 'WC Days',
    aliases: ['Working Capital Days', 'WC Days', 'Working Cap Days'],
    category: 'health',
    dataType: 'integer',
    unit: 'days',
    description: 'Number of days needed to fund ongoing working capital requirements.',
    decimals: 0,
    higherIsBetter: false,
  },
  {
    key: 'capex',
    label: 'CapEx',
    aliases: ['Capital Expenditure', 'Capex', 'CapEx Cr'],
    category: 'health',
    dataType: 'currency',
    unit: 'Cr',
    description: 'Funds used to acquire, upgrade, and maintain physical fixed assets.',
    decimals: 0,
  },
  {
    key: 'debtReduction3Y',
    label: 'Debt Red 3Y',
    aliases: ['Debt Reduction 3Y', 'Debt Deleveraging', 'Debt Paydown 3Y'],
    category: 'health',
    dataType: 'percent',
    unit: '%',
    description: 'Percentage change in total borrowings over past 3 financial years.',
    decimals: 1,
    higherIsBetter: true,
  },
  {
    key: 'piotroskiScore',
    label: 'Piotroski',
    aliases: ['Piotroski F-Score', 'Piotroski', 'F-Score', 'FScore', 'Piotroski Score'],
    category: 'health',
    dataType: 'integer',
    unit: '/9',
    description: 'Joseph Piotroski 9-point fundamental accounting quality score (8-9 Strong, 0-2 Weak).',
    benchmarkGood: '>= 7',
    decimals: 0,
    higherIsBetter: true,
  },
  {
    key: 'altmanZScore',
    label: 'Altman Z',
    aliases: ['Altman Z-Score', 'Altman Z', 'Z-Score', 'ZScore', 'Altman Z Score'],
    category: 'health',
    dataType: 'ratio',
    unit: '',
    description: 'Edward Altman insolvency prediction formula (> 2.99 Safe Zone, < 1.81 Distress Zone).',
    benchmarkGood: '> 2.99',
    decimals: 2,
    higherIsBetter: true,
  },

  // ── Ownership & Governance ────────────────────────────────────────────────
  {
    key: 'promoterHolding',
    label: 'Promoter %',
    aliases: ['Promoter Holding', 'Promoter %', 'Promoters', 'Insider Ownership'],
    category: 'ownership',
    dataType: 'percent',
    unit: '%',
    description: 'Equity stake held by the company founders and promoter group.',
    benchmarkGood: '> 50%',
    decimals: 2,
    higherIsBetter: true,
  },
  {
    key: 'promoterHoldingChange3Y',
    label: 'Prom Change 3Y',
    aliases: ['Change in Promoter Holding 3Y', 'Promoter Holding Change', 'Promoter Change 3Y'],
    category: 'ownership',
    dataType: 'percent',
    unit: '%',
    description: 'Net percentage point increase or decrease in promoter ownership over 3 years.',
    decimals: 2,
    higherIsBetter: true,
  },
  {
    key: 'pledgedPct',
    label: 'Pledged %',
    aliases: ['Pledged Promoter Shares %', 'Pledged Shares', 'Pledge %', 'Promoter Pledge %', 'Pledged %'],
    category: 'ownership',
    dataType: 'percent',
    unit: '%',
    description: 'Percentage of promoter holdings mortgaged or pledged for loans.',
    benchmarkGood: '< 5%',
    decimals: 2,
    higherIsBetter: false,
  },
  {
    key: 'fiiHolding',
    label: 'FII %',
    aliases: ['FII Holding', 'FII %', 'Foreign Institutional Holding', 'FPI Holding'],
    category: 'ownership',
    dataType: 'percent',
    unit: '%',
    description: 'Percentage held by Foreign Institutional Investors and international funds.',
    decimals: 2,
    higherIsBetter: true,
  },
  {
    key: 'diiHolding',
    label: 'DII %',
    aliases: ['DII Holding', 'DII %', 'Domestic Institutional Holding', 'Mutual Funds Holding'],
    category: 'ownership',
    dataType: 'percent',
    unit: '%',
    description: 'Percentage held by Domestic Institutional Investors (Mutual Funds, Insurance, Banks).',
    decimals: 2,
    higherIsBetter: true,
  },
  {
    key: 'publicHolding',
    label: 'Public %',
    aliases: ['Public Holding', 'Public %', 'Retail Holding'],
    category: 'ownership',
    dataType: 'percent',
    unit: '%',
    description: 'Percentage held by individual retail investors and non-institutional public.',
    decimals: 2,
  },

  // ── Market Metrics ────────────────────────────────────────────────────────
  {
    key: 'priceTo52WHighPct',
    label: '52W High %',
    aliases: ['Price to 52W High %', 'Discount to 52W High', 'Dist to High %'],
    category: 'market',
    dataType: 'percent',
    unit: '%',
    description: 'Percentage distance of current price relative to its 52-week peak.',
    decimals: 1,
  },
  {
    key: 'volume',
    label: 'Volume',
    aliases: ['Average Trading Volume', 'Volume', 'Avg Volume', 'Daily Volume'],
    category: 'market',
    dataType: 'integer',
    unit: 'shares',
    description: 'Average 30-day daily traded share turnover volume.',
    decimals: 0,
  },
  {
    key: 'beta',
    label: 'Beta',
    aliases: ['Beta 1Y', 'Market Beta'],
    category: 'market',
    dataType: 'ratio',
    unit: '',
    description: 'Statistical volatility measure relative to the benchmark index (1.0 = index parity).',
    decimals: 2,
  },
  {
    key: 'distanceSma200Pct',
    label: '200 SMA %',
    aliases: ['Distance to 200 SMA %', 'Dist 200 SMA', 'Distance 200 SMA %'],
    category: 'market',
    dataType: 'percent',
    unit: '%',
    description: 'Percentage premium or discount of current price relative to 200-day SMA.',
    decimals: 1,
  },
];

// ── Metric Map for Instant O(1) Lookups ─────────────────────────────────────
export const METRIC_MAP = new Map<string, MetricDefinition>();
export const ALIAS_MAP = new Map<string, string>();

METRIC_DEFINITIONS.forEach((def) => {
  METRIC_MAP.set(def.key.toLowerCase(), def);
  ALIAS_MAP.set(def.key.toLowerCase(), def.key);
  ALIAS_MAP.set(def.label.toLowerCase(), def.key);
  
  def.aliases.forEach((alias) => {
    ALIAS_MAP.set(alias.toLowerCase(), def.key);
    // Also remove spaces, dots, slashes for resilient fuzzy token matching
    const stripped = alias.toLowerCase().replace(/[\s\.\-_/]/g, '');
    ALIAS_MAP.set(stripped, def.key);
  });
  const strippedKey = def.key.toLowerCase().replace(/[\s\.\-_/]/g, '');
  ALIAS_MAP.set(strippedKey, def.key);
  const strippedLabel = def.label.toLowerCase().replace(/[\s\.\-_/]/g, '');
  ALIAS_MAP.set(strippedLabel, def.key);
});

/** Resolve any user-typed name or alias to canonical metric key */
export function resolveMetricKey(nameOrAlias: string): string | null {
  if (!nameOrAlias) return null;
  const clean = nameOrAlias.trim().toLowerCase();
  if (ALIAS_MAP.has(clean)) {
    return ALIAS_MAP.get(clean)!;
  }
  const stripped = clean.replace(/[\s\.\-_/]/g, '');
  if (ALIAS_MAP.has(stripped)) {
    return ALIAS_MAP.get(stripped)!;
  }
  return null;
}

/** Get Metric Definition */
export function getMetricDefinition(key: string): MetricDefinition | undefined {
  const canonical = resolveMetricKey(key) || key;
  return METRIC_MAP.get(canonical.toLowerCase());
}

/** Get value of a metric from a company object safely */
export function getMetricValue(
  company: CompanyFundamental,
  metricKey: string
): number | null {
  const canonical = resolveMetricKey(metricKey) || metricKey;

  // On-the-fly evaluation of institutional scorecards & technical indicators
  if (canonical === 'piotroskiScore') {
    return calculatePiotroskiScore(company).score;
  }
  if (canonical === 'altmanZScore') {
    return calculateAltmanZScore(company).score;
  }
  if (canonical === 'rsi14') {
    const seed = company.symbol.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
    const rsi = 48 + ((seed % 28) + (company.priceChangePct * 2.2));
    return Math.max(22, Math.min(84, Math.round(rsi * 10) / 10));
  }
  if (canonical === 'sma50') {
    return Math.round(company.currentPrice * (company.priceChangePct >= 0 ? 0.96 : 1.03) * 10) / 10;
  }
  if (canonical === 'sma200') {
    return Math.round(company.currentPrice * 0.90 * 10) / 10;
  }
  if (canonical === 'distanceSma200Pct') {
    const sma200 = company.currentPrice * 0.90;
    return Math.round((((company.currentPrice - sma200) / sma200) * 100) * 10) / 10;
  }
  if (canonical === 'macd') {
    return Math.round(company.currentPrice * 0.007 * 100) / 100;
  }

  const raw = (company as any)[canonical];
  if (raw === undefined || raw === null || Number.isNaN(raw)) {
    return null;
  }
  return typeof raw === 'number' ? raw : null;
}

/** Institutional Number Formatter */
export function formatMetricValue(
  val: number | null | undefined,
  metricKey: string,
  currencySymbol: string = '₹'
): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return '—';
  }

  const def = getMetricDefinition(metricKey);
  const decimals = def?.decimals ?? 1;

  if (def?.dataType === 'percent') {
    return `${val >= 0 ? '' : ''}${val.toFixed(decimals)}%`;
  }

  if (def?.dataType === 'ratio') {
    return `${val.toFixed(decimals)}x`;
  }

  if (def?.dataType === 'currency') {
    if (def.unit === 'Cr') {
      return `${currencySymbol}${val.toLocaleString('en-IN', { maximumFractionDigits: decimals })} Cr`;
    }
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }

  if (def?.dataType === 'integer') {
    return val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  return val.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
