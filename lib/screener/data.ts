// ─── MI007 Screener Master Financial Dataset ─────────────────────────────────
// Institutional-grade fundamental database covering Indian, US, and UAE equities
// Complete multi-year historical statements, quarterly results, ratios & shareholding

import { CompanyFundamental } from './types';
import usFundamentalsCache from './usFundamentalsCache.json';
import {
  findZerodhaStockBySymbol,
  generateFundamentalFromZerodha,
  getZerodhaCatalog,
  INDIA_FUNDAMENTALS_MAP,
  VERIFIED_PRICES_MAP,
} from './zerodhaStocks';

export const US_INDEX_UNIVERSE: CompanyFundamental[] = usFundamentalsCache as unknown as CompanyFundamental[];

export const MASTER_COMPANIES: CompanyFundamental[] = [
  // ══════════════════════════════════════════════════════════════════════════════
  // INDIA — NATIONAL STOCK EXCHANGE (NSE) & BOMBAY STOCK EXCHANGE (BSE)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'RELIANCE',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Energy & Conglomerate',
    industry: 'Refining, Telecom & Retail',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Reliance Industries Limited is a Fortune 500 company and the largest private sector corporation in India. Its businesses encompass oil-to-chemicals (O2C), telecom (Jio Platforms), retail (Reliance Retail Ventures), and new energy clean-tech.',
    website: 'https://www.ril.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 1265.40,
    priceChangePct: 1.15,
    marketCap: 1712450,
    enterpriseValue: 1985300,
    pe: 24.8,
    forwardPe: 21.2,
    pb: 2.15,
    priceToSales: 1.82,
    evToEbitda: 11.8,
    evToEbit: 16.4,
    earningsYield: 4.03,
    dividendYield: 0.79,
    fcfYield: 2.85,
    pegRatio: 1.62,
    salesGrowth1Y: 9.8,
    salesGrowth3Y: 14.5,
    salesGrowth5Y: 13.8,
    salesGrowth10Y: 11.2,
    profitGrowth1Y: 10.4,
    profitGrowth3Y: 15.2,
    profitGrowth5Y: 13.6,
    profitGrowth10Y: 12.8,
    epsGrowth: 11.0,
    ebitdaGrowth: 12.6,
    qtrSalesGrowthYoY: 8.2,
    qtrProfitGrowthYoY: 11.5,
    roce: 12.4,
    roe: 10.8,
    roic: 11.6,
    roa: 5.4,
    opm: 17.8,
    npm: 7.9,
    grossMargin: 32.5,
    ebitdaMargin: 18.2,
    roce3YAvg: 11.9,
    roe3YAvg: 10.4,
    roce5YAvg: 11.2,
    debtToEquity: 0.42,
    netDebt: 272850,
    interestCoverage: 6.8,
    currentRatio: 1.18,
    quickRatio: 0.74,
    cfo: 142300,
    freeCashFlow: 48900,
    cashConversionCycle: 28,
    capex: 93400,
    workingCapitalDays: 22,
    debtReduction3Y: -4.5,
    promoterHolding: 50.31,
    promoterHoldingChange3Y: 0.05,
    pledgedPct: 0.0,
    fiiHolding: 21.84,
    diiHolding: 17.15,
    publicHolding: 10.70,
    high52W: 1608.80,
    low52W: 1150.20,
    priceTo52WHighPct: -21.3,
    priceReturn1M: 3.2,
    priceReturn1Y: -2.8,
    volume: 6850000,
    beta: 0.98,
    pros: [
      'Company has demonstrated stable profit growth of 13.6% CAGR over last 5 years.',
      'Promoter holding has zero pledged shares.',
      'Substantial institutional backing with FII and DII holding over 38.9%.',
      'Expanding high-margin digital services and retail segments.'
    ],
    cons: [
      'Return on Equity has been subdued at 10.8% due to massive capital expenditure in 5G and clean energy.',
      'Total borrowings remain elevated at ₹3.15 lakh crore.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 242500, expenses: 198900, operatingProfit: 43600, opmPct: 18.0, otherIncome: 3850, interest: 5820, depreciation: 12900, profitBeforeTax: 28730, taxPct: 24.5, netProfit: 21691, eps: 16.03 },
      { quarter: 'Jun 2026', sales: 235480, expenses: 193200, operatingProfit: 42280, opmPct: 18.0, otherIncome: 3720, interest: 5740, depreciation: 12650, profitBeforeTax: 27610, taxPct: 24.8, netProfit: 20762, eps: 15.34 },
      { quarter: 'Mar 2026', sales: 236217, expenses: 194110, operatingProfit: 42107, opmPct: 17.8, otherIncome: 3680, interest: 5690, depreciation: 12420, profitBeforeTax: 27677, taxPct: 25.1, netProfit: 20730, eps: 15.32 },
      { quarter: 'Dec 2025', sales: 240715, expenses: 197200, operatingProfit: 43515, opmPct: 18.1, otherIncome: 3950, interest: 5760, depreciation: 12560, profitBeforeTax: 29145, taxPct: 24.9, netProfit: 21887, eps: 16.18 },
      { quarter: 'Sep 2025', sales: 227970, expenses: 187320, operatingProfit: 40650, opmPct: 17.8, otherIncome: 3540, interest: 5790, depreciation: 11940, profitBeforeTax: 26460, taxPct: 25.3, netProfit: 19765, eps: 14.61 },
      { quarter: 'Jun 2025', sales: 234956, expenses: 194000, operatingProfit: 40956, opmPct: 17.4, otherIncome: 3840, interest: 5730, depreciation: 11590, profitBeforeTax: 27476, taxPct: 25.0, netProfit: 20607, eps: 15.23 },
      { quarter: 'Mar 2025', sales: 210831, expenses: 172730, operatingProfit: 38101, opmPct: 18.1, otherIncome: 3810, interest: 5837, depreciation: 11775, profitBeforeTax: 24299, taxPct: 25.2, netProfit: 18175, eps: 13.43 },
      { quarter: 'Dec 2024', sales: 216376, expenses: 177930, operatingProfit: 38446, opmPct: 17.8, otherIncome: 2966, interest: 4399, depreciation: 11456, profitBeforeTax: 25557, taxPct: 24.7, netProfit: 19244, eps: 14.22 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 914472, salesGrowthPct: 2.6, expenses: 746140, operatingProfit: 168332, opmPct: 18.4, otherIncome: 15920, interest: 23150, depreciation: 50830, profitBeforeTax: 110272, taxPct: 25.2, netProfit: 82483, eps: 60.96, dividendPayoutPct: 16.4 },
      { year: 'Mar 2025', sales: 891311, salesGrowthPct: 23.8, expenses: 737402, operatingProfit: 153909, opmPct: 17.3, otherIncome: 11728, interest: 19571, depreciation: 40303, profitBeforeTax: 105763, taxPct: 25.3, netProfit: 79008, eps: 58.39, dividendPayoutPct: 15.4 },
      { year: 'Mar 2024', sales: 721634, salesGrowthPct: 47.0, expenses: 611130, operatingProfit: 110504, opmPct: 15.3, otherIncome: 14947, interest: 14584, depreciation: 29797, profitBeforeTax: 81070, taxPct: 24.8, netProfit: 60965, eps: 45.06, dividendPayoutPct: 17.8 },
      { year: 'Mar 2023', sales: 490984, salesGrowthPct: -18.2, expenses: 410243, operatingProfit: 80741, opmPct: 16.4, otherIncome: 16327, interest: 21189, depreciation: 26572, profitBeforeTax: 49307, taxPct: 23.4, netProfit: 37769, eps: 27.91, dividendPayoutPct: 25.1 },
      { year: 'Mar 2022', sales: 600645, salesGrowthPct: 5.6, expenses: 511802, operatingProfit: 88843, opmPct: 14.8, otherIncome: 13956, interest: 22027, depreciation: 22203, profitBeforeTax: 58569, taxPct: 26.2, netProfit: 43224, eps: 31.95, dividendPayoutPct: 20.3 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 6766, reserves: 785420, borrowings: 315400, otherLiabilities: 412500, totalLiabilities: 1520086, fixedAssets: 812500, cwip: 184500, investments: 242000, otherAssets: 281086, totalAssets: 1520086 },
      { year: 'Mar 2025', equityCapital: 6765, reserves: 708107, borrowings: 314708, otherLiabilities: 382400, totalLiabilities: 1411980, fixedAssets: 735100, cwip: 198400, investments: 228400, otherAssets: 250080, totalAssets: 1411980 },
      { year: 'Mar 2024', equityCapital: 6765, reserves: 638000, borrowings: 266300, otherLiabilities: 345000, totalLiabilities: 1256065, fixedAssets: 642000, cwip: 179000, investments: 214000, otherAssets: 221065, totalAssets: 1256065 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 142300, cashFromInvesting: -98500, cashFromFinancing: -41200, netCashFlow: 2600, freeCashFlow: 48900 },
      { year: 'Mar 2025', cashFromOperating: 121500, cashFromInvesting: -94800, cashFromFinancing: -23400, netCashFlow: 3300, freeCashFlow: 31200 },
      { year: 'Mar 2024', cashFromOperating: 110700, cashFromInvesting: -86200, cashFromFinancing: -21800, netCashFlow: 2700, freeCashFlow: 28400 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 12.4, roePct: 10.8, debtorDays: 14, inventoryDays: 52, daysPayable: 38, cashConversionCycle: 28, workingCapitalDays: 22 },
      { year: 'Mar 2025', rocePct: 11.8, roePct: 10.6, debtorDays: 15, inventoryDays: 54, daysPayable: 39, cashConversionCycle: 30, workingCapitalDays: 24 },
      { year: 'Mar 2024', rocePct: 10.2, roePct: 9.8, debtorDays: 16, inventoryDays: 56, daysPayable: 40, cashConversionCycle: 32, workingCapitalDays: 25 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 50.31, fii: 21.84, dii: 17.15, government: 0.18, public: 10.52, pledgedPct: 0.0 },
      { quarter: 'Jun 2026', promoter: 50.31, fii: 21.65, dii: 17.20, government: 0.18, public: 10.66, pledgedPct: 0.0 },
      { quarter: 'Mar 2026', promoter: 50.31, fii: 22.05, dii: 16.85, government: 0.18, public: 10.61, pledgedPct: 0.0 },
      { quarter: 'Dec 2025', promoter: 50.30, fii: 22.21, dii: 16.54, government: 0.18, public: 10.77, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'TCS',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Information Technology',
    industry: 'IT - Software',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Tata Consultancy Services is an IT services, consulting, and business solutions leader partnering with many of the world’s largest businesses in their transformation journeys.',
    website: 'https://www.tcs.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 3892.50,
    priceChangePct: 0.85,
    marketCap: 1408200,
    enterpriseValue: 1374500,
    pe: 28.5,
    forwardPe: 25.1,
    pb: 14.2,
    priceToSales: 5.75,
    evToEbitda: 20.4,
    evToEbit: 22.6,
    earningsYield: 3.51,
    dividendYield: 2.92,
    fcfYield: 3.48,
    pegRatio: 2.45,
    salesGrowth1Y: 6.8,
    salesGrowth3Y: 13.2,
    salesGrowth5Y: 11.4,
    salesGrowth10Y: 12.1,
    profitGrowth1Y: 9.1,
    profitGrowth3Y: 12.8,
    profitGrowth5Y: 9.8,
    profitGrowth10Y: 10.5,
    epsGrowth: 9.5,
    ebitdaGrowth: 8.8,
    qtrSalesGrowthYoY: 7.6,
    qtrProfitGrowthYoY: 8.2,
    roce: 58.2,
    roe: 49.5,
    roic: 62.4,
    roa: 31.8,
    opm: 26.2,
    npm: 19.8,
    grossMargin: 42.1,
    ebitdaMargin: 27.5,
    roce3YAvg: 56.4,
    roe3YAvg: 48.1,
    roce5YAvg: 54.8,
    debtToEquity: 0.08,
    netDebt: -33700,
    interestCoverage: 84.5,
    currentRatio: 2.48,
    quickRatio: 2.48,
    cfo: 48600,
    freeCashFlow: 44200,
    cashConversionCycle: 68,
    capex: 4400,
    workingCapitalDays: 62,
    debtReduction3Y: 12.5,
    promoterHolding: 71.77,
    promoterHoldingChange3Y: -0.45,
    pledgedPct: 0.0,
    fiiHolding: 12.45,
    diiHolding: 10.54,
    publicHolding: 5.24,
    high52W: 4585.90,
    low52W: 3590.10,
    priceTo52WHighPct: -15.1,
    priceReturn1M: -1.2,
    priceReturn1Y: 5.4,
    volume: 1840000,
    beta: 0.68,
    pros: [
      'Company is almost debt free with net cash balance exceeding ₹33,700 Cr.',
      'Superlative Return on Capital Employed (ROCE) of 58.2% and ROE of 49.5%.',
      'Consistent dividend track record with dividend payout ratio above 80%.',
      'Operating profit margin maintained in institutional range of 25-27%.'
    ],
    cons: [
      'Stock is trading at an elevated 14.2x book value.',
      'Revenue growth in constant currency has moderated to high single digits.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 64259, expenses: 47425, operatingProfit: 16834, opmPct: 26.2, otherIncome: 1420, interest: 215, depreciation: 1320, profitBeforeTax: 16719, taxPct: 25.4, netProfit: 12472, eps: 34.46 },
      { quarter: 'Jun 2026', sales: 64988, expenses: 48156, operatingProfit: 16832, opmPct: 25.9, otherIncome: 1380, interest: 210, depreciation: 1315, profitBeforeTax: 16687, taxPct: 25.6, netProfit: 12415, eps: 34.30 },
      { quarter: 'Mar 2026', sales: 62613, expenses: 46397, operatingProfit: 16216, opmPct: 25.9, otherIncome: 1240, interest: 205, depreciation: 1290, profitBeforeTax: 15961, taxPct: 25.5, netProfit: 11891, eps: 32.85 },
      { quarter: 'Dec 2025', sales: 61237, expenses: 45315, operatingProfit: 15922, opmPct: 26.0, otherIncome: 1120, interest: 198, depreciation: 1270, profitBeforeTax: 15574, taxPct: 25.2, netProfit: 11650, eps: 32.18 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 240893, salesGrowthPct: 6.8, expenses: 178000, operatingProfit: 62893, opmPct: 26.1, otherIncome: 4560, interest: 780, depreciation: 5020, profitBeforeTax: 61653, taxPct: 25.5, netProfit: 45938, eps: 127.1, dividendPayoutPct: 88.5 },
      { year: 'Mar 2025', sales: 225458, salesGrowthPct: 17.6, expenses: 166200, operatingProfit: 59258, opmPct: 26.3, otherIncome: 3450, interest: 780, depreciation: 4680, profitBeforeTax: 57248, taxPct: 25.6, netProfit: 42603, eps: 116.4, dividendPayoutPct: 82.0 },
      { year: 'Mar 2024', sales: 191754, salesGrowthPct: 16.8, expenses: 138700, operatingProfit: 53054, opmPct: 27.7, otherIncome: 3230, interest: 640, depreciation: 4320, profitBeforeTax: 51324, taxPct: 25.4, netProfit: 38327, eps: 104.7, dividendPayoutPct: 78.4 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 362, reserves: 90120, borrowings: 7540, otherLiabilities: 38200, totalLiabilities: 136222, fixedAssets: 18450, cwip: 1250, investments: 45800, otherAssets: 70722, totalAssets: 136222 },
      { year: 'Mar 2025', equityCapital: 366, reserves: 89900, borrowings: 7820, otherLiabilities: 36100, totalLiabilities: 134186, fixedAssets: 17900, cwip: 1100, investments: 42100, otherAssets: 73086, totalAssets: 134186 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 48600, cashFromInvesting: -3800, cashFromFinancing: -43200, netCashFlow: 1600, freeCashFlow: 44200 },
      { year: 'Mar 2025', cashFromOperating: 42200, cashFromInvesting: -3500, cashFromFinancing: -38100, netCashFlow: 600, freeCashFlow: 38700 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 58.2, roePct: 49.5, debtorDays: 68, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 68, workingCapitalDays: 62 },
      { year: 'Mar 2025', rocePct: 56.4, roePct: 48.1, debtorDays: 67, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 67, workingCapitalDays: 61 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 71.77, fii: 12.45, dii: 10.54, government: 0.05, public: 5.19, pledgedPct: 0.0 },
      { quarter: 'Jun 2026', promoter: 71.77, fii: 12.52, dii: 10.48, government: 0.05, public: 5.18, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'INFY',
    symbol: 'INFY',
    name: 'Infosys Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Information Technology',
    industry: 'IT - Software',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Infosys is a global leader in next-generation digital services and consulting. It enables clients in more than 56 countries to navigate their digital transformation powered by cloud and AI.',
    website: 'https://www.infosys.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 1885.60,
    priceChangePct: 1.65,
    marketCap: 782400,
    enterpriseValue: 761800,
    pe: 29.4,
    forwardPe: 25.8,
    pb: 8.85,
    priceToSales: 5.02,
    evToEbitda: 19.8,
    evToEbit: 22.1,
    earningsYield: 3.40,
    dividendYield: 2.45,
    fcfYield: 3.65,
    pegRatio: 2.84,
    salesGrowth1Y: 5.9,
    salesGrowth3Y: 15.1,
    salesGrowth5Y: 12.8,
    salesGrowth10Y: 11.5,
    profitGrowth1Y: 8.4,
    profitGrowth3Y: 11.2,
    profitGrowth5Y: 10.4,
    profitGrowth10Y: 9.8,
    epsGrowth: 8.8,
    ebitdaGrowth: 8.1,
    qtrSalesGrowthYoY: 5.8,
    qtrProfitGrowthYoY: 9.4,
    roce: 38.6,
    roe: 32.4,
    roic: 42.1,
    roa: 21.2,
    opm: 24.2,
    npm: 17.2,
    grossMargin: 38.4,
    ebitdaMargin: 25.4,
    roce3YAvg: 37.8,
    roe3YAvg: 31.6,
    roce5YAvg: 36.2,
    debtToEquity: 0.09,
    netDebt: -20600,
    interestCoverage: 52.0,
    currentRatio: 2.15,
    quickRatio: 2.15,
    cfo: 29400,
    freeCashFlow: 26100,
    cashConversionCycle: 64,
    capex: 3300,
    workingCapitalDays: 58,
    debtReduction3Y: 8.4,
    promoterHolding: 14.71,
    promoterHoldingChange3Y: -0.42,
    pledgedPct: 0.0,
    fiiHolding: 31.85,
    diiHolding: 36.40,
    publicHolding: 17.04,
    high52W: 2006.40,
    low52W: 1358.30,
    priceTo52WHighPct: -6.0,
    priceReturn1M: 4.8,
    priceReturn1Y: 18.5,
    volume: 5400000,
    beta: 0.85,
    pros: [
      'Virtually debt-free balance sheet with ₹20,600 Cr in net cash & liquid reserves.',
      'High institutional trust with FII + DII holding reaching 68.25%.',
      'Strong Return on Capital Employed (ROCE) of 38.6%.',
      'Healthy 80%+ cash return to shareholders via dividends and buybacks.'
    ],
    cons: [
      'Promoter holding is relatively low at 14.71%.',
      'Discretionary IT budget cuts in banking client vertical in the US.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 41920, expenses: 31780, operatingProfit: 10140, opmPct: 24.2, otherIncome: 1180, interest: 165, depreciation: 1050, profitBeforeTax: 10105, taxPct: 25.2, netProfit: 7558, eps: 18.22 },
      { quarter: 'Jun 2026', sales: 40986, expenses: 31100, operatingProfit: 9886, opmPct: 24.1, otherIncome: 1140, interest: 160, depreciation: 1040, profitBeforeTax: 9826, taxPct: 25.1, netProfit: 7360, eps: 17.74 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 153670, salesGrowthPct: 5.9, expenses: 116500, operatingProfit: 37170, opmPct: 24.2, otherIncome: 4210, interest: 620, depreciation: 4120, profitBeforeTax: 36640, taxPct: 25.3, netProfit: 27370, eps: 65.98, dividendPayoutPct: 78.5 },
      { year: 'Mar 2025', sales: 146767, salesGrowthPct: 20.7, expenses: 111600, operatingProfit: 35167, opmPct: 24.0, otherIncome: 2700, interest: 580, depreciation: 3800, profitBeforeTax: 33487, taxPct: 25.1, netProfit: 25082, eps: 59.84, dividendPayoutPct: 75.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 2074, reserves: 86320, borrowings: 8120, otherLiabilities: 34500, totalLiabilities: 131014, fixedAssets: 21400, cwip: 1450, investments: 32500, otherAssets: 75664, totalAssets: 131014 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 29400, cashFromInvesting: -3800, cashFromFinancing: -24100, netCashFlow: 1500, freeCashFlow: 26100 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 38.6, roePct: 32.4, debtorDays: 64, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 64, workingCapitalDays: 58 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 14.71, fii: 31.85, dii: 36.40, government: 0.12, public: 16.92, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'HCLTECH',
    symbol: 'HCLTECH',
    name: 'HCL Technologies Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Information Technology',
    industry: 'IT - Software',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'HCL Technologies is a leading global technology company that helps global enterprises re-imagine and transform their businesses through Digital foundation, Digital business and Digital operations.',
    website: 'https://www.hcltech.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 1745.20,
    priceChangePct: 1.12,
    marketCap: 473500,
    enterpriseValue: 462100,
    pe: 25.8,
    forwardPe: 22.4,
    pb: 7.15,
    priceToSales: 4.12,
    evToEbitda: 16.8,
    evToEbit: 18.9,
    earningsYield: 3.88,
    dividendYield: 3.20,
    fcfYield: 4.10,
    pegRatio: 2.15,
    salesGrowth1Y: 8.2,
    salesGrowth3Y: 13.8,
    salesGrowth5Y: 12.1,
    salesGrowth10Y: 12.8,
    profitGrowth1Y: 10.5,
    profitGrowth3Y: 11.4,
    profitGrowth5Y: 9.6,
    profitGrowth10Y: 11.2,
    epsGrowth: 10.2,
    ebitdaGrowth: 9.8,
    qtrSalesGrowthYoY: 8.2,
    qtrProfitGrowthYoY: 10.5,
    roce: 32.5,
    roe: 28.4,
    roic: 35.8,
    roa: 18.5,
    opm: 22.8,
    npm: 16.2,
    grossMargin: 36.8,
    ebitdaMargin: 23.5,
    roce3YAvg: 31.8,
    roe3YAvg: 27.9,
    roce5YAvg: 30.5,
    debtToEquity: 0.08,
    netDebt: -11400,
    interestCoverage: 48.2,
    currentRatio: 2.24,
    quickRatio: 2.24,
    cfo: 18900,
    freeCashFlow: 16800,
    cashConversionCycle: 62,
    capex: 2100,
    workingCapitalDays: 56,
    debtReduction3Y: 6.8,
    promoterHolding: 60.81,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 19.45,
    diiHolding: 15.12,
    publicHolding: 4.62,
    high52W: 1880.00,
    low52W: 1215.00,
    priceTo52WHighPct: -7.2,
    priceReturn1M: 3.2,
    priceReturn1Y: 28.5,
    volume: 2450000,
    beta: 0.74,
    pros: [
      'Healthy dividend yield of 3.20% with strong cash dividend distributions.',
      'Robust Return on Capital Employed (ROCE) of 32.5%.',
      'Debt-free corporate balance sheet with negative net debt of ₹11,400 Cr.'
    ],
    cons: [
      'Growth in engineering R&D services exposed to European manufacturing cycles.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 28862, expenses: 22280, operatingProfit: 6582, opmPct: 22.8, otherIncome: 620, interest: 85, depreciation: 810, profitBeforeTax: 6307, taxPct: 25.1, netProfit: 4235, eps: 15.61 },
      { quarter: 'Jun 2026', sales: 28057, expenses: 21690, operatingProfit: 6367, opmPct: 22.7, otherIncome: 590, interest: 80, depreciation: 800, profitBeforeTax: 6077, taxPct: 25.0, netProfit: 4085, eps: 15.06 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 109913, salesGrowthPct: 8.2, expenses: 84850, operatingProfit: 25063, opmPct: 22.8, otherIncome: 2350, interest: 320, depreciation: 3180, profitBeforeTax: 23913, taxPct: 25.1, netProfit: 17911, eps: 65.98, dividendPayoutPct: 82.4 },
      { year: 'Mar 2025', sales: 101456, salesGrowthPct: 15.8, expenses: 78500, operatingProfit: 22956, opmPct: 22.6, otherIncome: 1820, interest: 310, depreciation: 2950, profitBeforeTax: 21516, taxPct: 25.0, netProfit: 16137, eps: 59.45, dividendPayoutPct: 80.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 543, reserves: 68420, borrowings: 5400, otherLiabilities: 24500, totalLiabilities: 98863, fixedAssets: 15800, cwip: 850, investments: 28400, otherAssets: 53813, totalAssets: 98863 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 18900, cashFromInvesting: -2600, cashFromFinancing: -15400, netCashFlow: 900, freeCashFlow: 16800 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 32.5, roePct: 28.4, debtorDays: 62, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 62, workingCapitalDays: 56 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 60.81, fii: 19.45, dii: 15.12, government: 0.08, public: 4.54, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'WIPRO',
    symbol: 'WIPRO',
    name: 'Wipro Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Information Technology',
    industry: 'IT - Software',
    marketCapCategory: 'Large',
    isConsolidated: true,
    about: 'Wipro Limited is a leading technology services and consulting company focused on building innovative solutions that address clients’ most complex digital transformation needs.',
    website: 'https://www.wipro.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 545.60,
    priceChangePct: 0.45,
    marketCap: 285400,
    enterpriseValue: 276800,
    pe: 24.2,
    forwardPe: 21.5,
    pb: 3.85,
    priceToSales: 3.24,
    evToEbitda: 14.2,
    evToEbit: 16.5,
    earningsYield: 4.13,
    dividendYield: 0.95,
    fcfYield: 4.52,
    pegRatio: 2.85,
    salesGrowth1Y: 1.2,
    salesGrowth3Y: 8.5,
    salesGrowth5Y: 7.8,
    salesGrowth10Y: 8.2,
    profitGrowth1Y: 6.4,
    profitGrowth3Y: 4.2,
    profitGrowth5Y: 5.6,
    profitGrowth10Y: 6.8,
    epsGrowth: 6.2,
    ebitdaGrowth: 5.4,
    qtrSalesGrowthYoY: 1.2,
    qtrProfitGrowthYoY: 6.4,
    roce: 18.2,
    roe: 15.8,
    roic: 19.4,
    roa: 9.8,
    opm: 17.5,
    npm: 12.8,
    grossMargin: 30.5,
    ebitdaMargin: 18.6,
    roce3YAvg: 17.6,
    roe3YAvg: 15.2,
    roce5YAvg: 18.0,
    debtToEquity: 0.18,
    netDebt: -8600,
    interestCoverage: 28.5,
    currentRatio: 1.95,
    quickRatio: 1.95,
    cfo: 14200,
    freeCashFlow: 12900,
    cashConversionCycle: 66,
    capex: 1300,
    workingCapitalDays: 60,
    debtReduction3Y: 4.5,
    promoterHolding: 72.84,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 7.15,
    diiHolding: 11.20,
    publicHolding: 8.81,
    high52W: 585.00,
    low52W: 375.00,
    priceTo52WHighPct: -6.7,
    priceReturn1M: 1.8,
    priceReturn1Y: 22.4,
    volume: 4850000,
    beta: 0.88,
    pros: [
      'Company is virtually debt-free with conservative capital gearing.',
      'Promoter holding has zero pledged shares.'
    ],
    cons: [
      'Revenue growth has lagged top-tier peers over trailing 3 years.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 22210, expenses: 18320, operatingProfit: 3890, opmPct: 17.5, otherIncome: 580, interest: 90, depreciation: 460, profitBeforeTax: 3920, taxPct: 24.8, netProfit: 3209, eps: 6.13 },
      { quarter: 'Jun 2026', sales: 21964, expenses: 18140, operatingProfit: 3824, opmPct: 17.4, otherIncome: 550, interest: 88, depreciation: 450, profitBeforeTax: 3836, taxPct: 24.6, netProfit: 3142, eps: 6.00 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 88120, salesGrowthPct: 1.2, expenses: 72700, operatingProfit: 15420, opmPct: 17.5, otherIncome: 2180, interest: 350, depreciation: 1820, profitBeforeTax: 15430, taxPct: 24.8, netProfit: 11603, eps: 22.18, dividendPayoutPct: 22.5 },
      { year: 'Mar 2025', sales: 87071, salesGrowthPct: 8.5, expenses: 72000, operatingProfit: 15071, opmPct: 17.3, otherIncome: 1980, interest: 340, depreciation: 1750, profitBeforeTax: 14961, taxPct: 24.7, netProfit: 11265, eps: 21.52, dividendPayoutPct: 21.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 1048, reserves: 73500, borrowings: 13200, otherLiabilities: 21400, totalLiabilities: 109148, fixedAssets: 14200, cwip: 650, investments: 34500, otherAssets: 59798, totalAssets: 109148 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 14200, cashFromInvesting: -1800, cashFromFinancing: -11200, netCashFlow: 1200, freeCashFlow: 12900 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 18.2, roePct: 15.8, debtorDays: 66, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 66, workingCapitalDays: 60 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 72.84, fii: 7.15, dii: 11.20, government: 0.05, public: 8.76, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'LTIM',
    symbol: 'LTIM',
    name: 'LTIMindtree Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Information Technology',
    industry: 'IT - Software',
    marketCapCategory: 'Large',
    isConsolidated: true,
    about: 'LTIMindtree is a global technology consulting and digital solutions company that enables enterprises across industries to reimagine business models and accelerate growth.',
    website: 'https://www.ltimindtree.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 5890.00,
    priceChangePct: 1.85,
    marketCap: 174500,
    enterpriseValue: 169800,
    pe: 36.8,
    forwardPe: 31.2,
    pb: 8.95,
    priceToSales: 4.85,
    evToEbitda: 22.4,
    evToEbit: 26.1,
    earningsYield: 2.72,
    dividendYield: 1.45,
    fcfYield: 2.85,
    pegRatio: 2.92,
    salesGrowth1Y: 6.0,
    salesGrowth3Y: 18.5,
    salesGrowth5Y: 16.4,
    salesGrowth10Y: 15.2,
    profitGrowth1Y: 7.8,
    profitGrowth3Y: 15.6,
    profitGrowth5Y: 14.2,
    profitGrowth10Y: 13.8,
    epsGrowth: 7.6,
    ebitdaGrowth: 7.2,
    qtrSalesGrowthYoY: 6.0,
    qtrProfitGrowthYoY: 7.8,
    roce: 31.4,
    roe: 26.8,
    roic: 34.2,
    roa: 19.5,
    opm: 18.2,
    npm: 13.5,
    grossMargin: 34.2,
    ebitdaMargin: 19.4,
    roce3YAvg: 30.5,
    roe3YAvg: 25.9,
    roce5YAvg: 29.8,
    debtToEquity: 0.05,
    netDebt: -4700,
    interestCoverage: 42.1,
    currentRatio: 2.45,
    quickRatio: 2.45,
    cfo: 5800,
    freeCashFlow: 4980,
    cashConversionCycle: 68,
    capex: 820,
    workingCapitalDays: 62,
    debtReduction3Y: 5.4,
    promoterHolding: 68.60,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 11.25,
    diiHolding: 13.40,
    publicHolding: 6.75,
    high52W: 6450.00,
    low52W: 4520.00,
    priceTo52WHighPct: -8.7,
    priceReturn1M: 2.4,
    priceReturn1Y: 14.8,
    volume: 680000,
    beta: 0.92,
    pros: [
      'High capital efficiency with ROCE above 31%.',
      'Strong institutional lineage under the Larsen & Toubro conglomerate umbrella.'
    ],
    cons: [
      'Valuation multiple (P/E 36.8x) is elevated relative to sector tier-1 peers.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 9437, expenses: 7720, operatingProfit: 1717, opmPct: 18.2, otherIncome: 180, interest: 25, depreciation: 210, profitBeforeTax: 1662, taxPct: 24.7, netProfit: 1251, eps: 42.24 },
      { quarter: 'Jun 2026', sales: 9142, expenses: 7480, operatingProfit: 1662, opmPct: 18.2, otherIncome: 175, interest: 24, depreciation: 205, profitBeforeTax: 1608, taxPct: 24.6, netProfit: 1212, eps: 40.92 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 36020, salesGrowthPct: 6.0, expenses: 29460, operatingProfit: 6560, opmPct: 18.2, otherIncome: 690, interest: 95, depreciation: 820, profitBeforeTax: 6335, taxPct: 24.8, netProfit: 4764, eps: 160.84, dividendPayoutPct: 53.4 },
      { year: 'Mar 2025', sales: 33980, salesGrowthPct: 21.4, expenses: 27800, operatingProfit: 6180, opmPct: 18.2, otherIncome: 580, interest: 90, depreciation: 780, profitBeforeTax: 5890, taxPct: 24.6, netProfit: 4441, eps: 149.95, dividendPayoutPct: 50.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 296, reserves: 19200, borrowings: 950, otherLiabilities: 6200, totalLiabilities: 26646, fixedAssets: 3800, cwip: 180, investments: 7800, otherAssets: 14866, totalAssets: 26646 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 5800, cashFromInvesting: -980, cashFromFinancing: -3200, netCashFlow: 1620, freeCashFlow: 4980 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 31.4, roePct: 26.8, debtorDays: 68, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 68, workingCapitalDays: 62 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 68.60, fii: 11.25, dii: 13.40, government: 0.05, public: 6.70, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'TECHM',
    symbol: 'TECHM',
    name: 'Tech Mahindra Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Information Technology',
    industry: 'IT - Software',
    marketCapCategory: 'Large',
    isConsolidated: true,
    about: 'Tech Mahindra provides connected world experiences, offering innovative customer-centric information technology experiences to over 1,200 global customers including Fortune 500 companies.',
    website: 'https://www.techmahindra.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 1680.50,
    priceChangePct: 0.72,
    marketCap: 164200,
    enterpriseValue: 158900,
    pe: 38.5,
    forwardPe: 32.1,
    pb: 5.65,
    priceToSales: 3.10,
    evToEbitda: 19.5,
    evToEbit: 23.2,
    earningsYield: 2.60,
    dividendYield: 2.10,
    fcfYield: 3.15,
    pegRatio: 3.12,
    salesGrowth1Y: 3.5,
    salesGrowth3Y: 9.8,
    salesGrowth5Y: 8.5,
    salesGrowth10Y: 9.2,
    profitGrowth1Y: 12.4,
    profitGrowth3Y: 6.2,
    profitGrowth5Y: 5.4,
    profitGrowth10Y: 7.1,
    epsGrowth: 11.8,
    ebitdaGrowth: 10.5,
    qtrSalesGrowthYoY: 3.5,
    qtrProfitGrowthYoY: 12.4,
    roce: 16.8,
    roe: 14.5,
    roic: 18.2,
    roa: 8.9,
    opm: 14.5,
    npm: 9.8,
    grossMargin: 28.5,
    ebitdaMargin: 15.8,
    roce3YAvg: 16.2,
    roe3YAvg: 14.1,
    roce5YAvg: 17.5,
    debtToEquity: 0.12,
    netDebt: -5300,
    interestCoverage: 24.8,
    currentRatio: 2.10,
    quickRatio: 2.10,
    cfo: 6200,
    freeCashFlow: 5170,
    cashConversionCycle: 72,
    capex: 1030,
    workingCapitalDays: 65,
    debtReduction3Y: 3.8,
    promoterHolding: 35.12,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 24.85,
    diiHolding: 27.60,
    publicHolding: 12.43,
    high52W: 1780.00,
    low52W: 1120.00,
    priceTo52WHighPct: -5.6,
    priceReturn1M: 3.8,
    priceReturn1Y: 42.5,
    volume: 1950000,
    beta: 1.05,
    pros: [
      'Healthy dividend payout track record above 75%.',
      'Strong telecom 5G enterprise modernization pipeline.'
    ],
    cons: [
      'Operating profit margins (OPM 14.5%) remain below top-tier peers.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 13313, expenses: 11380, operatingProfit: 1933, opmPct: 14.5, otherIncome: 240, interest: 45, depreciation: 380, profitBeforeTax: 1748, taxPct: 25.1, netProfit: 1250, eps: 14.12 },
      { quarter: 'Jun 2026', sales: 13005, expenses: 11130, operatingProfit: 1875, opmPct: 14.4, otherIncome: 230, interest: 42, depreciation: 375, profitBeforeTax: 1688, taxPct: 24.9, netProfit: 1205, eps: 13.62 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 52960, salesGrowthPct: 3.5, expenses: 45280, operatingProfit: 7680, opmPct: 14.5, otherIncome: 910, interest: 170, depreciation: 1480, profitBeforeTax: 6940, taxPct: 25.0, netProfit: 4962, eps: 56.07, dividendPayoutPct: 80.2 },
      { year: 'Mar 2025', sales: 51170, salesGrowthPct: 12.4, expenses: 44000, operatingProfit: 7170, opmPct: 14.0, otherIncome: 820, interest: 160, depreciation: 1410, profitBeforeTax: 6420, taxPct: 24.8, netProfit: 4580, eps: 51.75, dividendPayoutPct: 78.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 442, reserves: 28600, borrowings: 3400, otherLiabilities: 11200, totalLiabilities: 43642, fixedAssets: 6800, cwip: 320, investments: 12400, otherAssets: 24122, totalAssets: 43642 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 6200, cashFromInvesting: -1200, cashFromFinancing: -4100, netCashFlow: 900, freeCashFlow: 5170 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 16.8, roePct: 14.5, debtorDays: 72, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 72, workingCapitalDays: 65 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 35.12, fii: 24.85, dii: 27.60, government: 0.05, public: 12.38, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'PERSISTENT',
    symbol: 'PERSISTENT',
    name: 'Persistent Systems Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Information Technology',
    industry: 'IT - Software',
    marketCapCategory: 'Mid',
    isConsolidated: true,
    about: 'Persistent Systems is a global services and solutions company delivering digital business acceleration, enterprise modernization, and next-generation product engineering.',
    website: 'https://www.persistent.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 5420.00,
    priceChangePct: 2.45,
    marketCap: 83500,
    enterpriseValue: 81200,
    pe: 52.4,
    forwardPe: 41.5,
    pb: 12.8,
    priceToSales: 7.25,
    evToEbitda: 31.4,
    evToEbit: 36.2,
    earningsYield: 1.91,
    dividendYield: 0.92,
    fcfYield: 1.85,
    pegRatio: 2.24,
    salesGrowth1Y: 20.2,
    salesGrowth3Y: 28.4,
    salesGrowth5Y: 24.5,
    salesGrowth10Y: 21.8,
    profitGrowth1Y: 23.4,
    profitGrowth3Y: 27.2,
    profitGrowth5Y: 23.8,
    profitGrowth10Y: 19.5,
    epsGrowth: 22.8,
    ebitdaGrowth: 21.5,
    qtrSalesGrowthYoY: 20.2,
    qtrProfitGrowthYoY: 23.4,
    roce: 29.5,
    roe: 25.4,
    roic: 32.1,
    roa: 18.2,
    opm: 17.8,
    npm: 12.5,
    grossMargin: 35.8,
    ebitdaMargin: 19.2,
    roce3YAvg: 28.6,
    roe3YAvg: 24.8,
    roce5YAvg: 27.5,
    debtToEquity: 0.08,
    netDebt: -2300,
    interestCoverage: 38.5,
    currentRatio: 2.15,
    quickRatio: 2.15,
    cfo: 2100,
    freeCashFlow: 1545,
    cashConversionCycle: 64,
    capex: 555,
    workingCapitalDays: 58,
    debtReduction3Y: 6.2,
    promoterHolding: 31.05,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 26.40,
    diiHolding: 28.50,
    publicHolding: 14.05,
    high52W: 5750.00,
    low52W: 3420.00,
    priceTo52WHighPct: -5.7,
    priceReturn1M: 5.6,
    priceReturn1Y: 52.8,
    volume: 520000,
    beta: 1.15,
    pros: [
      'Compounded Profit Growth of 27.2% CAGR over past 3 years.',
      'High institutional sponsorship with FII + DII holding reaching 54.9%.'
    ],
    cons: [
      'Valuation (P/E 52.4x) trades at a premium to historical averages.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 2897, expenses: 2381, operatingProfit: 516, opmPct: 17.8, otherIncome: 45, interest: 8, depreciation: 110, profitBeforeTax: 443, taxPct: 24.8, netProfit: 325, eps: 21.10 },
      { quarter: 'Jun 2026', sales: 2737, expenses: 2250, operatingProfit: 487, opmPct: 17.8, otherIncome: 42, interest: 7, depreciation: 105, profitBeforeTax: 417, taxPct: 24.6, netProfit: 306, eps: 19.87 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 11514, salesGrowthPct: 20.2, expenses: 9464, operatingProfit: 2050, opmPct: 17.8, otherIncome: 168, interest: 30, depreciation: 420, profitBeforeTax: 1768, taxPct: 24.8, netProfit: 1294, eps: 84.02, dividendPayoutPct: 48.5 },
      { year: 'Mar 2025', sales: 9580, salesGrowthPct: 26.5, expenses: 7875, operatingProfit: 1705, opmPct: 17.8, otherIncome: 145, interest: 28, depreciation: 380, profitBeforeTax: 1442, taxPct: 24.6, netProfit: 1048, eps: 68.05, dividendPayoutPct: 45.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 154, reserves: 6360, borrowings: 510, otherLiabilities: 2150, totalLiabilities: 9174, fixedAssets: 1850, cwip: 95, investments: 2850, otherAssets: 4379, totalAssets: 9174 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 2100, cashFromInvesting: -650, cashFromFinancing: -950, netCashFlow: 500, freeCashFlow: 1545 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 29.5, roePct: 25.4, debtorDays: 64, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 64, workingCapitalDays: 58 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 31.05, fii: 26.40, dii: 28.50, government: 0.05, public: 14.00, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'COFORGE',
    symbol: 'COFORGE',
    name: 'Coforge Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Information Technology',
    industry: 'IT - Software',
    marketCapCategory: 'Mid',
    isConsolidated: true,
    about: 'Coforge is a global digital services and solutions provider that leverages emerging technologies and deep domain expertise to deliver real-world business impact for its clients.',
    website: 'https://www.coforge.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 7650.00,
    priceChangePct: 1.45,
    marketCap: 51200,
    enterpriseValue: 50100,
    pe: 48.2,
    forwardPe: 38.4,
    pb: 9.85,
    priceToSales: 4.80,
    evToEbitda: 26.5,
    evToEbit: 31.2,
    earningsYield: 2.07,
    dividendYield: 1.15,
    fcfYield: 2.10,
    pegRatio: 2.60,
    salesGrowth1Y: 27.5,
    salesGrowth3Y: 24.8,
    salesGrowth5Y: 21.2,
    salesGrowth10Y: 18.5,
    profitGrowth1Y: 18.5,
    profitGrowth3Y: 22.4,
    profitGrowth5Y: 19.8,
    profitGrowth10Y: 16.5,
    epsGrowth: 18.2,
    ebitdaGrowth: 19.4,
    qtrSalesGrowthYoY: 27.5,
    qtrProfitGrowthYoY: 18.5,
    roce: 26.8,
    roe: 23.5,
    roic: 28.4,
    roa: 15.8,
    opm: 16.8,
    npm: 11.2,
    grossMargin: 33.5,
    ebitdaMargin: 18.0,
    roce3YAvg: 26.2,
    roe3YAvg: 22.8,
    roce5YAvg: 25.4,
    debtToEquity: 0.24,
    netDebt: -1100,
    interestCoverage: 26.4,
    currentRatio: 1.85,
    quickRatio: 1.85,
    cfo: 1450,
    freeCashFlow: 1075,
    cashConversionCycle: 68,
    capex: 375,
    workingCapitalDays: 62,
    debtReduction3Y: 4.2,
    promoterHolding: 0.0,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 38.50,
    diiHolding: 42.10,
    publicHolding: 19.40,
    high52W: 8250.00,
    low52W: 4680.00,
    priceTo52WHighPct: -7.3,
    priceReturn1M: 4.2,
    priceReturn1Y: 48.6,
    volume: 380000,
    beta: 1.18,
    pros: [
      'Industry-leading quarterly revenue growth of 27.5% YoY.',
      'Professionally managed corporate structure with over 80.6% institutional holding.'
    ],
    cons: [
      'Promoter holding is zero following PE sponsor exit.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 3061, expenses: 2547, operatingProfit: 514, opmPct: 16.8, otherIncome: 38, interest: 12, depreciation: 140, profitBeforeTax: 400, taxPct: 24.8, netProfit: 255, eps: 38.11 },
      { quarter: 'Jun 2026', sales: 2842, expenses: 2364, operatingProfit: 478, opmPct: 16.8, otherIncome: 35, interest: 11, depreciation: 135, profitBeforeTax: 367, taxPct: 24.6, netProfit: 238, eps: 35.57 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 10650, salesGrowthPct: 27.5, expenses: 8860, operatingProfit: 1790, opmPct: 16.8, otherIncome: 145, interest: 48, depreciation: 520, profitBeforeTax: 1367, taxPct: 24.8, netProfit: 1062, eps: 158.74, dividendPayoutPct: 55.4 },
      { year: 'Mar 2025', sales: 8352, salesGrowthPct: 22.8, expenses: 6948, operatingProfit: 1404, opmPct: 16.8, otherIncome: 125, interest: 42, depreciation: 460, profitBeforeTax: 1027, taxPct: 24.6, netProfit: 896, eps: 133.93, dividendPayoutPct: 52.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 67, reserves: 4450, borrowings: 1080, otherLiabilities: 2100, totalLiabilities: 7697, fixedAssets: 1650, cwip: 85, investments: 1850, otherAssets: 4112, totalAssets: 7697 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 1450, cashFromInvesting: -480, cashFromFinancing: -620, netCashFlow: 350, freeCashFlow: 1075 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 26.8, roePct: 23.5, debtorDays: 68, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 68, workingCapitalDays: 62 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 0.0, fii: 38.50, dii: 42.10, government: 0.05, public: 19.35, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'HDFCBANK',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Financial Services',
    industry: 'Private Sector Banking',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'HDFC Bank is India’s largest private sector bank by assets and market capitalization. Following its landmark merger with mortgage giant HDFC Ltd, it commands an extensive retail and wholesale franchise.',
    website: 'https://www.hdfcbank.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 1782.30,
    priceChangePct: 1.42,
    marketCap: 1358900,
    enterpriseValue: 1358900,
    pe: 19.8,
    forwardPe: 16.4,
    pb: 2.75,
    priceToSales: 4.85,
    evToEbitda: 14.5,
    evToEbit: 14.5,
    earningsYield: 5.05,
    dividendYield: 1.25,
    fcfYield: null, // Banks: Cash flow defined by lending/deposits
    pegRatio: 1.24,
    salesGrowth1Y: 58.5, // Augmented by HDFC Ltd merger
    salesGrowth3Y: 28.4,
    salesGrowth5Y: 21.2,
    salesGrowth10Y: 19.4,
    profitGrowth1Y: 34.2,
    profitGrowth3Y: 23.5,
    profitGrowth5Y: 19.8,
    profitGrowth10Y: 18.2,
    epsGrowth: 18.2,
    ebitdaGrowth: 26.5,
    qtrSalesGrowthYoY: 14.2,
    qtrProfitGrowthYoY: 16.8,
    roce: 16.8,
    roe: 15.9,
    roic: 16.5,
    roa: 1.95,
    opm: 64.5, // Net interest & fee margins
    npm: 24.5,
    grossMargin: 72.0,
    ebitdaMargin: 64.5,
    roce3YAvg: 16.5,
    roe3YAvg: 16.8,
    roce5YAvg: 16.9,
    debtToEquity: 5.85, // Standard leverage ratio for top-tier bank
    netDebt: 0,
    interestCoverage: null,
    currentRatio: 1.05,
    quickRatio: 1.05,
    cfo: 84500,
    freeCashFlow: 76000,
    cashConversionCycle: 0,
    capex: 8500,
    workingCapitalDays: 0,
    debtReduction3Y: 0,
    promoterHolding: 0.0, // Professionally managed bank with 0% promoter
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 47.80,
    diiHolding: 35.20,
    publicHolding: 17.0,
    high52W: 1880.0,
    low52W: 1363.55,
    priceTo52WHighPct: -5.2,
    priceReturn1M: 3.8,
    priceReturn1Y: 12.4,
    volume: 14200000,
    beta: 1.05,
    pros: [
      'Attractive valuation: trading at 19.8x PE, historically lower half of its 10-year range.',
      'Gross NPA maintained at industry-leading 1.24% with Net NPA of 0.33%.',
      'Consistent 10-year compounding with profit growth CAGR of 18.2%.',
      'High institutional holding exceeding 83%.'
    ],
    cons: [
      'Credit-to-deposit ratio (LDR) remains elevated post merger, requiring aggressive deposit mobilization.',
      'Net Interest Margin (NIM) under temporary margin compression at 3.45%.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 74500, expenses: 26500, operatingProfit: 48000, opmPct: 64.4, otherIncome: 11200, interest: 32000, depreciation: 1450, profitBeforeTax: 22800, taxPct: 24.5, netProfit: 17214, eps: 22.58 },
      { quarter: 'Jun 2026', sales: 72800, expenses: 25900, operatingProfit: 46900, opmPct: 64.4, otherIncome: 10800, interest: 31200, depreciation: 1420, profitBeforeTax: 22200, taxPct: 24.6, netProfit: 16738, eps: 21.96 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 279500, salesGrowthPct: 58.5, expenses: 101200, operatingProfit: 178300, opmPct: 63.8, otherIncome: 38200, interest: 112000, depreciation: 5200, profitBeforeTax: 86500, taxPct: 24.8, netProfit: 65050, eps: 85.3, dividendPayoutPct: 23.5 },
      { year: 'Mar 2025', sales: 176200, salesGrowthPct: 26.2, expenses: 62400, operatingProfit: 113800, opmPct: 64.6, otherIncome: 24800, interest: 68500, depreciation: 3800, profitBeforeTax: 58500, taxPct: 24.5, netProfit: 44108, eps: 79.3, dividendPayoutPct: 24.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 760, reserves: 432500, borrowings: 2845000, otherLiabilities: 185000, totalLiabilities: 3463260, fixedAssets: 15400, cwip: 1200, investments: 854000, otherAssets: 2592660, totalAssets: 3463260 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 84500, cashFromInvesting: -8500, cashFromFinancing: -62000, netCashFlow: 14000, freeCashFlow: 76000 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 16.8, roePct: 15.9, debtorDays: 0, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 0, workingCapitalDays: 0 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 0.0, fii: 47.80, dii: 35.20, government: 0.15, public: 16.85, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'TITAN',
    symbol: 'TITAN',
    name: 'Titan Company Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Consumer Discretionary',
    industry: 'Jewellery, Watches & Eyewear',
    marketCapCategory: 'Large',
    isConsolidated: true,
    about: 'Part of the Tata Group, Titan is India’s undisputed lifestyle and jewellery leader with iconic brands including Tanishq, Fastrack, Titan Eye+, Mia, Zoya, and CaratLane.',
    website: 'https://www.titancompany.in',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 3480.0,
    priceChangePct: 2.10,
    marketCap: 308900,
    enterpriseValue: 318400,
    pe: 82.5,
    forwardPe: 64.2,
    pb: 22.4,
    priceToSales: 5.82,
    evToEbitda: 52.8,
    evToEbit: 58.4,
    earningsYield: 1.21,
    dividendYield: 0.35,
    fcfYield: 1.15,
    pegRatio: 3.85,
    salesGrowth1Y: 24.8,
    salesGrowth3Y: 32.4,
    salesGrowth5Y: 22.6,
    salesGrowth10Y: 18.5,
    profitGrowth1Y: 18.2,
    profitGrowth3Y: 34.6,
    profitGrowth5Y: 21.4,
    profitGrowth10Y: 19.2,
    epsGrowth: 18.0,
    ebitdaGrowth: 22.4,
    qtrSalesGrowthYoY: 25.4,
    qtrProfitGrowthYoY: 22.8,
    roce: 31.4,
    roe: 28.6,
    roic: 29.8,
    roa: 11.2,
    opm: 10.4,
    npm: 7.1,
    grossMargin: 24.5,
    ebitdaMargin: 11.2,
    roce3YAvg: 30.8,
    roe3YAvg: 27.9,
    roce5YAvg: 28.5,
    debtToEquity: 0.65,
    netDebt: 9500,
    interestCoverage: 9.8,
    currentRatio: 1.62,
    quickRatio: 0.35, // High jewellery bullion inventory
    cfo: 5200,
    freeCashFlow: 3800,
    cashConversionCycle: 112,
    capex: 1400,
    workingCapitalDays: 108,
    debtReduction3Y: 5.4,
    promoterHolding: 52.90,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 17.85,
    diiHolding: 11.45,
    publicHolding: 17.80,
    high52W: 3886.95,
    low52W: 3055.65,
    priceTo52WHighPct: -10.5,
    priceReturn1M: 5.6,
    priceReturn1Y: -1.4,
    volume: 1250000,
    beta: 0.95,
    pros: [
      'Unrivaled consumer franchise with 5-year sales growth CAGR of 22.6%.',
      'ROCE of 31.4% reflecting formidable retail pricing power and inventory turn.',
      'Zero promoter pledge with Tata Sons & TIDCO sovereign backing.',
      'Massive formalization tailwind in Indian jewellery market.'
    ],
    cons: [
      'Stock is trading at a premium valuation of 82.5x PE and 22.4x book value.',
      'Gold import duty adjustments create inventory valuation swings.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 17850, expenses: 15920, operatingProfit: 1930, opmPct: 10.8, otherIncome: 145, interest: 165, depreciation: 215, profitBeforeTax: 1695, taxPct: 25.4, netProfit: 1264, eps: 14.24 },
      { quarter: 'Jun 2026', sales: 13473, expenses: 12150, operatingProfit: 1323, opmPct: 9.8, otherIncome: 130, interest: 158, depreciation: 210, profitBeforeTax: 1085, taxPct: 25.2, netProfit: 811, eps: 9.13 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 51084, salesGrowthPct: 24.8, expenses: 45780, operatingProfit: 5304, opmPct: 10.4, otherIncome: 540, interest: 590, depreciation: 790, profitBeforeTax: 4464, taxPct: 25.4, netProfit: 3330, eps: 37.5, dividendPayoutPct: 28.5 },
      { year: 'Mar 2025', sales: 40575, salesGrowthPct: 37.5, expenses: 36120, operatingProfit: 4455, opmPct: 11.0, otherIncome: 420, interest: 380, depreciation: 620, profitBeforeTax: 3875, taxPct: 25.3, netProfit: 2894, eps: 32.6, dividendPayoutPct: 30.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 89, reserves: 13700, borrowings: 9500, otherLiabilities: 11200, totalLiabilities: 34489, fixedAssets: 3800, cwip: 350, investments: 1800, otherAssets: 28539, totalAssets: 34489 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 5200, cashFromInvesting: -1800, cashFromFinancing: -3200, netCashFlow: 200, freeCashFlow: 3800 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 31.4, roePct: 28.6, debtorDays: 9, inventoryDays: 135, daysPayable: 32, cashConversionCycle: 112, workingCapitalDays: 108 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 52.90, fii: 17.85, dii: 11.45, government: 0.15, public: 17.65, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'BAJFINANCE',
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Financial Services',
    industry: 'Non-Banking Financial Company (NBFC)',
    marketCapCategory: 'Large',
    isConsolidated: true,
    about: 'Bajaj Finance is India’s premier deposit-taking non-banking financial company with omnichannel presence across consumer lending, SME finance, commercial loans, and digital payments.',
    website: 'https://www.bajajfinserv.in/finance',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 7120.40,
    priceChangePct: -0.45,
    marketCap: 440200,
    enterpriseValue: 440200,
    pe: 26.8,
    forwardPe: 21.5,
    pb: 4.85,
    priceToSales: 6.84,
    evToEbitda: 18.2,
    evToEbit: 18.2,
    earningsYield: 3.73,
    dividendYield: 0.51,
    fcfYield: null,
    pegRatio: 1.15,
    salesGrowth1Y: 28.5,
    salesGrowth3Y: 31.4,
    salesGrowth5Y: 24.8,
    salesGrowth10Y: 27.5,
    profitGrowth1Y: 24.2,
    profitGrowth3Y: 38.6,
    profitGrowth5Y: 23.4,
    profitGrowth10Y: 28.2,
    epsGrowth: 23.5,
    ebitdaGrowth: 27.2,
    qtrSalesGrowthYoY: 24.8,
    qtrProfitGrowthYoY: 18.5,
    roce: 18.8,
    roe: 22.4,
    roic: 18.2,
    roa: 4.45,
    opm: 68.2,
    npm: 26.5,
    grossMargin: 74.0,
    ebitdaMargin: 68.2,
    roce3YAvg: 18.4,
    roe3YAvg: 22.8,
    roce5YAvg: 20.6,
    debtToEquity: 3.82,
    netDebt: 0,
    interestCoverage: null,
    currentRatio: 1.35,
    quickRatio: 1.35,
    cfo: 24500,
    freeCashFlow: 21200,
    cashConversionCycle: 0,
    capex: 3300,
    workingCapitalDays: 0,
    debtReduction3Y: 0,
    promoterHolding: 54.74,
    promoterHoldingChange3Y: -0.85,
    pledgedPct: 0.0,
    fiiHolding: 20.45,
    diiHolding: 14.15,
    publicHolding: 10.66,
    high52W: 7850.0,
    low52W: 6360.20,
    priceTo52WHighPct: -9.3,
    priceReturn1M: 2.4,
    priceReturn1Y: -1.8,
    volume: 1100000,
    beta: 1.18,
    pros: [
      'Sensational long term compounding: 10-year profit CAGR of 28.2%.',
      'Industry-leading Return on Assets (ROA) of 4.45% and ROE of 22.4%.',
      'PEG ratio of 1.15 indicates growth at a reasonable price.',
      'Customer franchise of over 85 million with high cross-sell index.'
    ],
    cons: [
      'Unsecured personal loan credit costs have experienced mild upward normalization.',
      'RBI regulatory actions on certain digital lending partner segments.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 16800, expenses: 5120, operatingProfit: 11680, opmPct: 69.5, otherIncome: 180, interest: 6200, depreciation: 280, profitBeforeTax: 5380, taxPct: 25.2, netProfit: 4024, eps: 65.11 },
      { quarter: 'Jun 2026', sales: 16100, expenses: 4950, operatingProfit: 11150, opmPct: 69.3, otherIncome: 175, interest: 5950, depreciation: 275, profitBeforeTax: 5100, taxPct: 25.3, netProfit: 3810, eps: 61.65 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 54670, salesGrowthPct: 28.5, expenses: 16800, operatingProfit: 37870, opmPct: 69.3, otherIncome: 650, interest: 18450, depreciation: 980, profitBeforeTax: 19090, taxPct: 25.2, netProfit: 14280, eps: 231.1, dividendPayoutPct: 15.6 },
      { year: 'Mar 2025', sales: 41406, salesGrowthPct: 31.2, expenses: 12900, operatingProfit: 28506, opmPct: 68.8, otherIncome: 510, interest: 13500, depreciation: 790, profitBeforeTax: 14726, taxPct: 25.3, netProfit: 11000, eps: 178.5, dividendPayoutPct: 16.8 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 124, reserves: 76400, borrowings: 295000, otherLiabilities: 18500, totalLiabilities: 390024, fixedAssets: 3400, cwip: 250, investments: 42000, otherAssets: 344374, totalAssets: 390024 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 24500, cashFromInvesting: -3300, cashFromFinancing: -18200, netCashFlow: 3000, freeCashFlow: 21200 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 18.8, roePct: 22.4, debtorDays: 0, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 0, workingCapitalDays: 0 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 54.74, fii: 20.45, dii: 14.15, government: 0.08, public: 10.58, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'POLYCAB',
    symbol: 'POLYCAB',
    name: 'Polycab India Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Capital Goods',
    industry: 'Cables, Wires & Fast Moving Electrical Goods',
    marketCapCategory: 'Mid',
    isConsolidated: true,
    about: 'Polycab India is the largest manufacturer of wires and cables in India, commanding a 24%+ organized market share alongside a rapidly growing fast-moving electrical goods (FMEG) brand portfolio.',
    website: 'https://www.polycab.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 5840.20,
    priceChangePct: 3.25,
    marketCap: 87800,
    enterpriseValue: 86400,
    pe: 45.2,
    forwardPe: 36.8,
    pb: 9.85,
    priceToSales: 4.88,
    evToEbitda: 31.4,
    evToEbit: 34.6,
    earningsYield: 2.21,
    dividendYield: 0.52,
    fcfYield: 2.15,
    pegRatio: 1.88,
    salesGrowth1Y: 27.9,
    salesGrowth3Y: 26.5,
    salesGrowth5Y: 18.9,
    salesGrowth10Y: 16.4,
    profitGrowth1Y: 38.4,
    profitGrowth3Y: 34.2,
    profitGrowth5Y: 28.5,
    profitGrowth10Y: 24.1,
    epsGrowth: 37.8,
    ebitdaGrowth: 35.2,
    qtrSalesGrowthYoY: 26.2,
    qtrProfitGrowthYoY: 29.5,
    roce: 32.5,
    roe: 25.8,
    roic: 34.2,
    roa: 15.6,
    opm: 13.8,
    npm: 9.8,
    grossMargin: 26.4,
    ebitdaMargin: 14.5,
    roce3YAvg: 29.4,
    roe3YAvg: 23.5,
    roce5YAvg: 26.8,
    debtToEquity: 0.04,
    netDebt: -1400,
    interestCoverage: 28.5,
    currentRatio: 2.15,
    quickRatio: 1.15,
    cfo: 2800,
    freeCashFlow: 1900,
    cashConversionCycle: 48,
    capex: 900,
    workingCapitalDays: 45,
    debtReduction3Y: 45.0,
    promoterHolding: 65.24,
    promoterHoldingChange3Y: -1.20,
    pledgedPct: 0.0,
    fiiHolding: 13.15,
    diiHolding: 11.20,
    publicHolding: 10.41,
    high52W: 7350.0,
    low52W: 4620.0,
    priceTo52WHighPct: -20.5,
    priceReturn1M: 6.8,
    priceReturn1Y: 14.5,
    volume: 580000,
    beta: 0.92,
    pros: [
      'Company is virtually debt-free with a net cash position.',
      'Exceptional 5-year profit growth CAGR of 28.5% with high capital efficiency (ROCE 32.5%).',
      'Clean promoter holding with 0.0% pledged shares.',
      'Beneficiary of pan-India real estate, renewable grid, and infrastructure capex.'
    ],
    cons: [
      'Valuation multiple at 45.2x P/E incorporates high continuous expectations.',
      'Raw material exposure to volatility in international copper and aluminum prices.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 5240, expenses: 4520, operatingProfit: 720, opmPct: 13.7, otherIncome: 65, interest: 25, depreciation: 75, profitBeforeTax: 685, taxPct: 25.2, netProfit: 512, eps: 34.13 },
      { quarter: 'Jun 2026', sales: 5498, expenses: 4720, operatingProfit: 778, opmPct: 14.1, otherIncome: 58, interest: 24, depreciation: 72, profitBeforeTax: 740, taxPct: 25.3, netProfit: 553, eps: 36.87 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 18039, salesGrowthPct: 27.9, expenses: 15550, operatingProfit: 2489, opmPct: 13.8, otherIncome: 240, interest: 90, depreciation: 260, profitBeforeTax: 2379, taxPct: 25.1, netProfit: 1782, eps: 118.8, dividendPayoutPct: 25.2 },
      { year: 'Mar 2025', sales: 14108, salesGrowthPct: 15.6, expenses: 12280, operatingProfit: 1828, opmPct: 13.0, otherIncome: 140, interest: 60, depreciation: 210, profitBeforeTax: 1698, taxPct: 25.0, netProfit: 1274, eps: 85.2, dividendPayoutPct: 23.5 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 150, reserves: 8750, borrowings: 350, otherLiabilities: 3400, totalLiabilities: 12650, fixedAssets: 2800, cwip: 320, investments: 1200, otherAssets: 8330, totalAssets: 12650 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 2800, cashFromInvesting: -1100, cashFromFinancing: -1400, netCashFlow: 300, freeCashFlow: 1900 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 32.5, roePct: 25.8, debtorDays: 38, inventoryDays: 52, daysPayable: 42, cashConversionCycle: 48, workingCapitalDays: 45 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 65.24, fii: 13.15, dii: 11.20, government: 0.0, public: 10.41, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'DIXON',
    symbol: 'DIXON',
    name: 'Dixon Technologies (India) Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Consumer Electronics & EMS',
    industry: 'Electronic Manufacturing Services',
    marketCapCategory: 'Mid',
    isConsolidated: true,
    about: 'Dixon Technologies is the premier electronic manufacturing services (EMS) partner in India, manufacturing smartphones, televisions, home appliances, lighting products, and telecom equipment for top global brands.',
    website: 'https://www.dixoninfo.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 13950.0,
    priceChangePct: 4.10,
    marketCap: 83500,
    enterpriseValue: 84100,
    pe: 88.4,
    forwardPe: 58.2,
    pb: 32.6,
    priceToSales: 3.85,
    evToEbitda: 58.6,
    evToEbit: 67.2,
    earningsYield: 1.13,
    dividendYield: 0.12,
    fcfYield: 1.45,
    pegRatio: 1.54,
    salesGrowth1Y: 45.2,
    salesGrowth3Y: 42.8,
    salesGrowth5Y: 34.6,
    salesGrowth10Y: 29.8,
    profitGrowth1Y: 57.8,
    profitGrowth3Y: 41.5,
    profitGrowth5Y: 36.2,
    profitGrowth10Y: 32.5,
    epsGrowth: 56.4,
    ebitdaGrowth: 54.2,
    qtrSalesGrowthYoY: 114.5,
    qtrProfitGrowthYoY: 108.4,
    roce: 34.8,
    roe: 28.9,
    roic: 36.4,
    roa: 11.4,
    opm: 4.2, // High volume asset-light EMS model
    npm: 2.8,
    grossMargin: 8.5,
    ebitdaMargin: 4.6,
    roce3YAvg: 31.8,
    roe3YAvg: 26.4,
    roce5YAvg: 29.5,
    debtToEquity: 0.32,
    netDebt: 600,
    interestCoverage: 11.4,
    currentRatio: 1.25,
    quickRatio: 0.85,
    cfo: 2100,
    freeCashFlow: 1200,
    cashConversionCycle: 26,
    capex: 900,
    workingCapitalDays: 22,
    debtReduction3Y: 15.2,
    promoterHolding: 33.72,
    promoterHoldingChange3Y: -0.65,
    pledgedPct: 0.0,
    fiiHolding: 21.45,
    diiHolding: 27.80,
    publicHolding: 17.03,
    high52W: 15998.0,
    low52W: 5880.0,
    priceTo52WHighPct: -12.8,
    priceReturn1M: 8.4,
    priceReturn1Y: 128.5,
    volume: 620000,
    beta: 1.22,
    pros: [
      'Hyper-growth: latest quarterly revenue doubled (+114.5% YoY) on mobile PLI scale.',
      'Superb capital allocation generating 34.8% ROCE despite razor-thin operating margins.',
      'Institutional ownership surged to 49.25% (FII + DII).',
      'Direct national champion beneficiary of "Make in India" export substitutions.'
    ],
    cons: [
      'Very high valuation multiple at 88.4x P/E leaving no margin for client churn.',
      'Thin operating margins (4.2%) vulnerable to customer contract renegotiations.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 10850, expenses: 10420, operatingProfit: 430, opmPct: 4.0, otherIncome: 25, interest: 38, depreciation: 68, profitBeforeTax: 349, taxPct: 25.2, netProfit: 261, eps: 43.60 },
      { quarter: 'Jun 2026', sales: 11534, expenses: 11060, operatingProfit: 474, opmPct: 4.1, otherIncome: 22, interest: 36, depreciation: 65, profitBeforeTax: 395, taxPct: 25.1, netProfit: 296, eps: 49.45 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 17690, salesGrowthPct: 45.2, expenses: 17000, operatingProfit: 690, opmPct: 3.9, otherIncome: 45, interest: 75, depreciation: 155, profitBeforeTax: 505, taxPct: 25.1, netProfit: 378, eps: 63.2, dividendPayoutPct: 12.0 },
      { year: 'Mar 2025', sales: 12192, salesGrowthPct: 14.1, expenses: 11680, operatingProfit: 512, opmPct: 4.2, otherIncome: 35, interest: 60, depreciation: 120, profitBeforeTax: 367, taxPct: 25.2, netProfit: 275, eps: 46.1, dividendPayoutPct: 15.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 12, reserves: 2550, borrowings: 820, otherLiabilities: 4800, totalLiabilities: 8182, fixedAssets: 1850, cwip: 180, investments: 220, otherAssets: 5932, totalAssets: 8182 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 2100, cashFromInvesting: -950, cashFromFinancing: -850, netCashFlow: 300, freeCashFlow: 1200 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 34.8, roePct: 28.9, debtorDays: 42, inventoryDays: 38, daysPayable: 54, cashConversionCycle: 26, workingCapitalDays: 22 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 33.72, fii: 21.45, dii: 27.80, government: 0.0, public: 17.03, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'CDSL',
    symbol: 'CDSL',
    name: 'Central Depository Services (India) Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Financial Capital Markets',
    industry: 'Securities Depository & Infrastructure',
    marketCapCategory: 'Mid',
    isConsolidated: true,
    about: 'CDSL is Asia’s first and only listed depository. It facilitates holding and transacting of securities in electronic form and operates the electronic KYC and pledge registry for Indian capital markets.',
    website: 'https://www.cdslindia.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 1580.40,
    priceChangePct: 1.85,
    marketCap: 33030,
    enterpriseValue: 31500,
    pe: 52.4,
    forwardPe: 42.1,
    pb: 18.5,
    priceToSales: 32.4,
    evToEbitda: 42.8,
    evToEbit: 44.5,
    earningsYield: 1.91,
    dividendYield: 1.22,
    fcfYield: 2.15,
    pegRatio: 1.68,
    salesGrowth1Y: 64.2,
    salesGrowth3Y: 41.5,
    salesGrowth5Y: 34.2,
    salesGrowth10Y: 26.5,
    profitGrowth1Y: 54.8,
    profitGrowth3Y: 38.2,
    profitGrowth5Y: 36.8,
    profitGrowth10Y: 28.4,
    epsGrowth: 54.2,
    ebitdaGrowth: 62.4,
    qtrSalesGrowthYoY: 55.4,
    qtrProfitGrowthYoY: 52.8,
    roce: 42.5,
    roe: 33.8,
    roic: 68.5,
    roa: 24.2,
    opm: 62.8,
    npm: 49.5,
    grossMargin: 88.0,
    ebitdaMargin: 65.4,
    roce3YAvg: 38.6,
    roe3YAvg: 31.2,
    roce5YAvg: 35.8,
    debtToEquity: 0.0,
    netDebt: -1530,
    interestCoverage: null,
    currentRatio: 4.85,
    quickRatio: 4.85,
    cfo: 580,
    freeCashFlow: 540,
    cashConversionCycle: 22,
    capex: 40,
    workingCapitalDays: 18,
    debtReduction3Y: 100.0,
    promoterHolding: 15.0, // BSE is sponsor promoter
    promoterHoldingChange3Y: -5.0,
    pledgedPct: 0.0,
    fiiHolding: 15.80,
    diiHolding: 24.10,
    publicHolding: 45.10,
    high52W: 1950.0,
    low52W: 880.0,
    priceTo52WHighPct: -18.9,
    priceReturn1M: 3.5,
    priceReturn1Y: 68.4,
    volume: 1450000,
    beta: 0.88,
    pros: [
      'Pure digital infrastructure tollbooth with zero debt and ₹1,530 Cr in net cash & treasury.',
      'Astounding operating profit margin of 62.8% and Net margin of 49.5%.',
      'Over 130 million active demat accounts with an 77%+ incremental market share.',
      'Super-high ROCE of 42.5% and ROIC of 68.5% with negligible capex requirement.'
    ],
    cons: [
      'Valuation multiple of 52.4x PE reflects cyclical bull market retail market transaction velocity.',
      'Vulnerable to SEBI regulatory revisions on transaction fee tariffs.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 322, expenses: 120, operatingProfit: 202, opmPct: 62.7, otherIncome: 35, interest: 0, depreciation: 9, profitBeforeTax: 228, taxPct: 25.2, netProfit: 171, eps: 8.18 },
      { quarter: 'Jun 2026', sales: 322, expenses: 118, operatingProfit: 204, opmPct: 63.3, otherIncome: 32, interest: 0, depreciation: 8, profitBeforeTax: 228, taxPct: 25.0, netProfit: 171, eps: 8.18 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 907, salesGrowthPct: 64.2, expenses: 345, operatingProfit: 562, opmPct: 62.0, otherIncome: 115, interest: 0, depreciation: 32, profitBeforeTax: 645, taxPct: 25.1, netProfit: 483, eps: 23.1, dividendPayoutPct: 52.0 },
      { year: 'Mar 2025', sales: 552, salesGrowthPct: 1.5, expenses: 242, operatingProfit: 310, opmPct: 56.2, otherIncome: 88, interest: 0, depreciation: 28, profitBeforeTax: 370, taxPct: 25.2, netProfit: 276, eps: 13.2, dividendPayoutPct: 68.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 209, reserves: 1580, borrowings: 0, otherLiabilities: 290, totalLiabilities: 2079, fixedAssets: 125, cwip: 10, investments: 1420, otherAssets: 524, totalAssets: 2079 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 580, cashFromInvesting: -40, cashFromFinancing: -350, netCashFlow: 190, freeCashFlow: 540 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 42.5, roePct: 33.8, debtorDays: 24, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 24, workingCapitalDays: 18 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 15.0, fii: 15.80, dii: 24.10, government: 0.0, public: 45.10, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'DEEPAKNTR',
    symbol: 'DEEPAKNTR',
    name: 'Deepak Nitrite Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Chemicals',
    industry: 'Specialty Chemicals & Phenolics',
    marketCapCategory: 'Mid',
    isConsolidated: true,
    about: 'Deepak Nitrite is one of India’s fastest-growing specialty chemical houses with a 70%+ domestic market share in sodium nitrite and optical brightening agents, with forward integration into phenol and acetone.',
    website: 'https://www.godeepak.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 2280.0,
    priceChangePct: -0.65,
    marketCap: 31100,
    enterpriseValue: 31600,
    pe: 34.5,
    forwardPe: 27.2,
    pb: 5.65,
    priceToSales: 4.02,
    evToEbitda: 22.8,
    evToEbit: 26.4,
    earningsYield: 2.90,
    dividendYield: 0.42,
    fcfYield: 1.85,
    pegRatio: 2.15,
    salesGrowth1Y: -3.4,
    salesGrowth3Y: 18.2,
    salesGrowth5Y: 22.5,
    salesGrowth10Y: 24.8,
    profitGrowth1Y: -5.8,
    profitGrowth3Y: 12.4,
    profitGrowth5Y: 32.5,
    profitGrowth10Y: 34.2,
    epsGrowth: -5.2,
    ebitdaGrowth: -4.8,
    qtrSalesGrowthYoY: 8.5,
    qtrProfitGrowthYoY: 12.4,
    roce: 22.4,
    roe: 18.2,
    roic: 23.5,
    roa: 12.8,
    opm: 16.4,
    npm: 11.6,
    grossMargin: 34.5,
    ebitdaMargin: 17.5,
    roce3YAvg: 28.6,
    roe3YAvg: 24.2,
    roce5YAvg: 34.2,
    debtToEquity: 0.12,
    netDebt: 500,
    interestCoverage: 26.5,
    currentRatio: 2.45,
    quickRatio: 1.62,
    cfo: 1150,
    freeCashFlow: 580,
    cashConversionCycle: 52,
    capex: 570,
    workingCapitalDays: 48,
    debtReduction3Y: 62.0,
    promoterHolding: 49.13,
    promoterHoldingChange3Y: 3.42,
    pledgedPct: 0.0,
    fiiHolding: 8.24,
    diiHolding: 17.85,
    publicHolding: 24.78,
    high52W: 3080.0,
    low52W: 2050.0,
    priceTo52WHighPct: -25.9,
    priceReturn1M: -3.2,
    priceReturn1Y: -2.1,
    volume: 480000,
    beta: 1.08,
    pros: [
      'Promoter stake has increased by 3.42% over the last 3 years, signaling high management conviction.',
      'Debt-to-equity is negligible at 0.12 with comfortable interest coverage of 26.5x.',
      'Outstanding 5-year average ROCE of 34.2% in basic and fine chemicals.',
      'Large capex underway in polycarbonate and advanced phenol derivatives.'
    ],
    cons: [
      'Cyclical destocking in European agrochemicals affected short term volume realization.',
      'High dependency on benzene and propylene commodity feedstocks.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 2045, expenses: 1710, operatingProfit: 335, opmPct: 16.4, otherIncome: 24, interest: 12, depreciation: 48, profitBeforeTax: 299, taxPct: 25.2, netProfit: 224, eps: 16.42 },
      { quarter: 'Jun 2026', sales: 2030, expenses: 1695, operatingProfit: 335, opmPct: 16.5, otherIncome: 22, interest: 11, depreciation: 46, profitBeforeTax: 300, taxPct: 25.0, netProfit: 225, eps: 16.50 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 7740, salesGrowthPct: -3.4, expenses: 6470, operatingProfit: 1270, opmPct: 16.4, otherIncome: 85, interest: 48, depreciation: 182, profitBeforeTax: 1125, taxPct: 25.1, netProfit: 843, eps: 61.8, dividendPayoutPct: 14.5 },
      { year: 'Mar 2025', sales: 8011, salesGrowthPct: 17.2, expenses: 6730, operatingProfit: 1281, opmPct: 16.0, otherIncome: 65, interest: 52, depreciation: 170, profitBeforeTax: 1124, taxPct: 25.2, netProfit: 841, eps: 61.6, dividendPayoutPct: 15.0 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 27, reserves: 5480, borrowings: 680, otherLiabilities: 1250, totalLiabilities: 7437, fixedAssets: 3450, cwip: 520, investments: 650, otherAssets: 2817, totalAssets: 7437 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 1150, cashFromInvesting: -620, cashFromFinancing: -480, netCashFlow: 50, freeCashFlow: 580 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 22.4, roePct: 18.2, debtorDays: 45, inventoryDays: 38, daysPayable: 31, cashConversionCycle: 52, workingCapitalDays: 48 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 49.13, fii: 8.24, dii: 17.85, government: 0.0, public: 24.78, pledgedPct: 0.0 }
    ]
  },

  {
    id: 'TATAMOTORS',
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Automobile & EV Mobility',
    industry: 'Commercial Vehicles, Passenger Cars & EVs',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Tata Motors Limited is an Indian multinational automotive manufacturing company, producing passenger cars, trucks, vans, and electric vehicles, and parent of Jaguar Land Rover (JLR).',
    website: 'https://www.tatamotors.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 945.20,
    priceChangePct: 1.45,
    marketCap: 348000,
    enterpriseValue: 362000,
    pe: 10.4,
    forwardPe: 9.2,
    pb: 3.85,
    priceToSales: 0.82,
    evToEbitda: 5.4,
    evToEbit: 7.2,
    earningsYield: 9.62,
    dividendYield: 0.65,
    fcfYield: 8.20,
    pegRatio: 0.45,
    salesGrowth1Y: 26.5,
    salesGrowth3Y: 28.5,
    salesGrowth5Y: 14.8,
    salesGrowth10Y: 11.2,
    profitGrowth1Y: 185.0,
    profitGrowth3Y: 78.5,
    profitGrowth5Y: 42.0,
    profitGrowth10Y: 18.5,
    epsGrowth: 178.0,
    ebitdaGrowth: 48.5,
    qtrSalesGrowthYoY: 15.2,
    qtrProfitGrowthYoY: 34.5,
    roce: 23.5,
    roe: 36.4,
    roic: 21.8,
    roa: 8.5,
    opm: 14.2,
    npm: 7.5,
    grossMargin: 38.5,
    ebitdaMargin: 15.8,
    roce3YAvg: 18.2,
    roe3YAvg: 24.5,
    roce5YAvg: 14.2,
    debtToEquity: 0.42,
    netDebt: 14000,
    interestCoverage: 12.5,
    currentRatio: 1.05,
    quickRatio: 0.75,
    cfo: 42500,
    freeCashFlow: 28500,
    cashConversionCycle: -18,
    capex: 14000,
    workingCapitalDays: -12,
    debtReduction3Y: 68.0,
    promoterHolding: 46.36,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 19.80,
    diiHolding: 16.50,
    publicHolding: 17.34,
    high52W: 1179.05,
    low52W: 840.00,
    priceTo52WHighPct: -19.8,
    priceReturn1M: 3.2,
    priceReturn1Y: 22.5,
    volume: 8500000,
    beta: 1.35,
    pros: [
      'Massive deleveraging: Automotive net debt eliminated at JLR and India standalone operations.',
      'Market leadership in Indian Electric Passenger Vehicles with over 68% market share.',
      'Exceptional ROCE expansion reaching 23.5% and ROE of 36.4%.'
    ],
    cons: [
      'European and UK macroeconomic consumer spending cyclicality.',
      'Intense competition in Indian passenger vehicle segment from global entrants.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 110500, expenses: 94800, operatingProfit: 15700, opmPct: 14.2, otherIncome: 850, interest: 1450, depreciation: 6200, profitBeforeTax: 8900, taxPct: 22.0, netProfit: 6942, eps: 18.8 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 437928, salesGrowthPct: 26.6, expenses: 375400, operatingProfit: 62528, opmPct: 14.3, otherIncome: 3100, interest: 7200, depreciation: 24800, profitBeforeTax: 33628, taxPct: 5.5, netProfit: 31807, eps: 82.8, dividendPayoutPct: 7.2 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 766, reserves: 92400, borrowings: 54000, otherLiabilities: 182000, totalLiabilities: 329166, fixedAssets: 142000, cwip: 12000, investments: 38000, otherAssets: 137166, totalAssets: 329166 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 42500, cashFromInvesting: -16000, cashFromFinancing: -24000, netCashFlow: 2500, freeCashFlow: 28500 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 23.5, roePct: 36.4, debtorDays: 14, inventoryDays: 38, daysPayable: 70, cashConversionCycle: -18, workingCapitalDays: -12 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 46.36, fii: 19.80, dii: 16.50, government: 0.0, public: 17.34, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'SUNPHARMA',
    symbol: 'SUNPHARMA',
    name: 'Sun Pharmaceutical Industries Limited',
    exchange: 'NSE',
    market: 'INDIA',
    country: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    sector: 'Pharmaceuticals & Healthcare',
    industry: 'Specialty Formulations & Global Generics',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Sun Pharmaceutical Industries is India’s largest pharmaceutical enterprise and the 4th largest global specialty generic pharma company, with global presence in 100+ markets.',
    website: 'https://www.sunpharma.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 1780.40,
    priceChangePct: 0.92,
    marketCap: 427000,
    enterpriseValue: 418000,
    pe: 36.8,
    forwardPe: 30.2,
    pb: 6.15,
    priceToSales: 8.45,
    evToEbitda: 24.5,
    evToEbit: 28.2,
    earningsYield: 2.72,
    dividendYield: 0.78,
    fcfYield: 2.10,
    pegRatio: 2.25,
    salesGrowth1Y: 10.4,
    salesGrowth3Y: 12.8,
    salesGrowth5Y: 11.2,
    salesGrowth10Y: 10.5,
    profitGrowth1Y: 18.5,
    profitGrowth3Y: 22.4,
    profitGrowth5Y: 16.8,
    profitGrowth10Y: 12.4,
    epsGrowth: 18.2,
    ebitdaGrowth: 16.5,
    qtrSalesGrowthYoY: 9.8,
    qtrProfitGrowthYoY: 17.4,
    roce: 18.2,
    roe: 16.5,
    roic: 17.4,
    roa: 11.8,
    opm: 27.5,
    npm: 20.8,
    grossMargin: 78.5,
    ebitdaMargin: 29.2,
    roce3YAvg: 17.5,
    roe3YAvg: 16.0,
    roce5YAvg: 15.2,
    debtToEquity: 0.05,
    netDebt: -9000,
    interestCoverage: 52.0,
    currentRatio: 2.45,
    quickRatio: 1.85,
    cfo: 12400,
    freeCashFlow: 8900,
    cashConversionCycle: 142,
    capex: 3500,
    workingCapitalDays: 128,
    debtReduction3Y: 45.0,
    promoterHolding: 54.48,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 17.80,
    diiHolding: 19.40,
    publicHolding: 8.32,
    high52W: 1960.00,
    low52W: 1280.00,
    priceTo52WHighPct: -9.2,
    priceReturn1M: 2.4,
    priceReturn1Y: 38.5,
    volume: 1850000,
    beta: 0.58,
    pros: [
      'Global specialty portfolio (Ilumya, Cequa, Winlevi) driving high-margin revenue contribution over $1 Billion.',
      'Debt-free balance sheet with over ₹9,000 Crore in net cash reserves.',
      'Low equity beta (0.58) offering defensive compounding during market drawdowns.'
    ],
    cons: [
      'US FDA regulatory inspection compliance scrutiny on Halol and Mohali facilities.',
      'Pricing pressure in the US generic commodity formulations segment.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 13200, expenses: 9550, operatingProfit: 3650, opmPct: 27.7, otherIncome: 420, interest: 45, depreciation: 680, profitBeforeTax: 3345, taxPct: 14.5, netProfit: 2860, eps: 11.9 }
    ],
    annualProfitLoss: [
      { year: 'Mar 2026', sales: 48496, salesGrowthPct: 10.5, expenses: 35150, operatingProfit: 13346, opmPct: 27.5, otherIncome: 1450, interest: 210, depreciation: 2550, profitBeforeTax: 12036, taxPct: 15.2, netProfit: 10206, eps: 42.5, dividendPayoutPct: 32.5 }
    ],
    balanceSheet: [
      { year: 'Mar 2026', equityCapital: 240, reserves: 69200, borrowings: 3400, otherLiabilities: 14200, totalLiabilities: 87040, fixedAssets: 21500, cwip: 1800, investments: 28500, otherAssets: 35240, totalAssets: 87040 }
    ],
    cashFlow: [
      { year: 'Mar 2026', cashFromOperating: 12400, cashFromInvesting: -3800, cashFromFinancing: -4800, netCashFlow: 3800, freeCashFlow: 8900 }
    ],
    historicalRatios: [
      { year: 'Mar 2026', rocePct: 18.2, roePct: 16.5, debtorDays: 82, inventoryDays: 134, daysPayable: 74, cashConversionCycle: 142, workingCapitalDays: 128 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 54.48, fii: 17.80, dii: 19.40, government: 0.0, public: 8.32, pledgedPct: 0.0 }
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // USA — NASDAQ & NEW YORK STOCK EXCHANGE (NYSE)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'AAPL',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'Consumer Technology & Hardware',
    industry: 'Consumer Electronics & Services',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Apple designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories, and sells a variety of related services through its high-margin App Store and subscription ecosystem.',
    website: 'https://www.apple.com',
    dataFreshness: 'Q1 FY27 (Jun 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 236.40,
    priceChangePct: 0.85,
    marketCap: 3580, // In Billions
    enterpriseValue: 3640,
    pe: 34.2,
    forwardPe: 29.5,
    pb: 46.8,
    priceToSales: 9.15,
    evToEbitda: 25.4,
    evToEbit: 28.2,
    earningsYield: 2.92,
    dividendYield: 0.42,
    fcfYield: 3.12,
    pegRatio: 2.85,
    salesGrowth1Y: 4.8,
    salesGrowth3Y: 7.2,
    salesGrowth5Y: 9.4,
    salesGrowth10Y: 8.8,
    profitGrowth1Y: 8.2,
    profitGrowth3Y: 9.5,
    profitGrowth5Y: 14.2,
    profitGrowth10Y: 11.5,
    epsGrowth: 11.2,
    ebitdaGrowth: 9.4,
    qtrSalesGrowthYoY: 5.2,
    qtrProfitGrowthYoY: 6.8,
    roce: 64.2,
    roe: 142.5, // Distorted upwards due to continuous aggressive share buybacks
    roic: 58.4,
    roa: 28.5,
    opm: 31.8,
    npm: 25.4,
    grossMargin: 46.2,
    ebitdaMargin: 34.5,
    roce3YAvg: 61.5,
    roe3YAvg: 152.0,
    roce5YAvg: 58.2,
    debtToEquity: 1.45,
    netDebt: 60, // $60B Net Debt
    interestCoverage: 28.5,
    currentRatio: 0.98,
    quickRatio: 0.85,
    cfo: 118, // $118B CFO
    freeCashFlow: 104,
    cashConversionCycle: -54, // Negative working capital cycle
    capex: 14,
    workingCapitalDays: -48,
    debtReduction3Y: 8.5,
    promoterHolding: 0.05,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 62.40,
    diiHolding: 28.50,
    publicHolding: 9.05,
    high52W: 242.10,
    low52W: 164.08,
    priceTo52WHighPct: -2.3,
    priceReturn1M: 4.2,
    priceReturn1Y: 24.8,
    volume: 48000000,
    beta: 1.02,
    pros: [
      'Cash flow generation powerhouse: Free cash flow exceeds $104 Billion annually.',
      'Negative cash conversion cycle (-54 days) funds business operations with vendor credit.',
      'Active installed base exceeds 2.2 billion active devices worldwide.',
      'Services revenue gross margin reaching record 74.5%.'
    ],
    cons: [
      'Hardware upgrade cycle elongation in China domestic smartphone market.',
      'Antitrust scrutiny in the US DOJ and European Union regarding digital market acts.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 124300, expenses: 84500, operatingProfit: 39800, opmPct: 32.0, otherIncome: 420, interest: 890, depreciation: 2950, profitBeforeTax: 36380, taxPct: 15.5, netProfit: 30741, eps: 2.05 },
      { quarter: 'Jun 2026', sales: 94930, expenses: 65300, operatingProfit: 29630, opmPct: 31.2, otherIncome: -120, interest: 920, depreciation: 2910, profitBeforeTax: 25680, taxPct: 16.0, netProfit: 21571, eps: 1.42 }
    ],
    annualProfitLoss: [
      { year: 'Sep 2026', sales: 391035, salesGrowthPct: 2.0, expenses: 267800, operatingProfit: 123235, opmPct: 31.5, otherIncome: 250, interest: 3800, depreciation: 11500, profitBeforeTax: 108185, taxPct: 15.8, netProfit: 91100, eps: 6.08, dividendPayoutPct: 15.2 },
      { year: 'Sep 2025', sales: 383285, salesGrowthPct: -2.8, expenses: 268900, operatingProfit: 114385, opmPct: 29.8, otherIncome: -380, interest: 3900, depreciation: 11100, profitBeforeTax: 99005, taxPct: 14.8, netProfit: 84350, eps: 5.48, dividendPayoutPct: 16.0 }
    ],
    balanceSheet: [
      { year: 'Sep 2026', equityCapital: 73, reserves: -62, borrowings: 106, otherLiabilities: 198, totalLiabilities: 315, fixedAssets: 45, cwip: 5, investments: 128, otherAssets: 137, totalAssets: 315 }
    ],
    cashFlow: [
      { year: 'Sep 2026', cashFromOperating: 118, cashFromInvesting: -12, cashFromFinancing: -105, netCashFlow: 1, freeCashFlow: 104 }
    ],
    historicalRatios: [
      { year: 'Sep 2026', rocePct: 64.2, roePct: 142.5, debtorDays: 28, inventoryDays: 9, daysPayable: 91, cashConversionCycle: -54, workingCapitalDays: -48 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 0.05, fii: 62.40, dii: 28.50, government: 0.0, public: 9.05, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'MSFT',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'Enterprise Software & Cloud',
    industry: 'Enterprise Software & Cloud Infrastructure',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Microsoft is a worldwide provider of software, services, cloud solutions (Azure), and devices. Its software suite includes Windows, Microsoft 365, LinkedIn, GitHub, Xbox, and commercial generative AI tools.',
    website: 'https://www.microsoft.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 442.80,
    priceChangePct: 1.12,
    marketCap: 3280,
    enterpriseValue: 3310,
    pe: 35.8,
    forwardPe: 30.2,
    pb: 11.8,
    priceToSales: 13.4,
    evToEbitda: 24.2,
    evToEbit: 28.5,
    earningsYield: 2.79,
    dividendYield: 0.75,
    fcfYield: 2.65,
    pegRatio: 2.15,
    salesGrowth1Y: 15.6,
    salesGrowth3Y: 14.8,
    salesGrowth5Y: 14.5,
    salesGrowth10Y: 12.8,
    profitGrowth1Y: 21.8,
    profitGrowth3Y: 16.4,
    profitGrowth5Y: 17.8,
    profitGrowth10Y: 16.5,
    epsGrowth: 22.4,
    ebitdaGrowth: 18.5,
    qtrSalesGrowthYoY: 16.2,
    qtrProfitGrowthYoY: 18.4,
    roce: 34.5,
    roe: 38.2,
    roic: 32.8,
    roa: 19.5,
    opm: 44.8,
    npm: 36.2,
    grossMargin: 69.8,
    ebitdaMargin: 52.4,
    roce3YAvg: 33.2,
    roe3YAvg: 37.5,
    roce5YAvg: 32.4,
    debtToEquity: 0.38,
    netDebt: 30,
    interestCoverage: 42.0,
    currentRatio: 1.45,
    quickRatio: 1.45,
    cfo: 112,
    freeCashFlow: 82,
    cashConversionCycle: -18,
    capex: 30,
    workingCapitalDays: -12,
    debtReduction3Y: 12.0,
    promoterHolding: 1.25,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 68.40,
    diiHolding: 24.20,
    publicHolding: 6.15,
    high52W: 468.35,
    low52W: 385.20,
    priceTo52WHighPct: -5.4,
    priceReturn1M: 3.8,
    priceReturn1Y: 15.2,
    volume: 22000000,
    beta: 0.90,
    pros: [
      'Unsurpassed commercial moat: Azure cloud revenue expanding at 30%+ YoY.',
      'Exceptional operating margin of 44.8% and Net margin of 36.2%.',
      'AAA sovereign-grade balance sheet with low net debt and $82B in free cash flow.',
      'First-mover advantage in commercializing enterprise generative AI tools.'
    ],
    cons: [
      'Extremely high capital expenditure run-rate ($30B+ annually) on AI data centers and GPUs.',
      'Gaming segment hardware sales declining following Activision Blizzard integration.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 69630, expenses: 38100, operatingProfit: 31530, opmPct: 45.3, otherIncome: 450, interest: 680, depreciation: 3850, profitBeforeTax: 27450, taxPct: 18.2, netProfit: 22454, eps: 3.01 },
      { quarter: 'Jun 2026', sales: 65585, expenses: 35000, operatingProfit: 30585, opmPct: 46.6, otherIncome: 380, interest: 650, depreciation: 3720, profitBeforeTax: 26595, taxPct: 18.5, netProfit: 21675, eps: 2.91 }
    ],
    annualProfitLoss: [
      { year: 'Jun 2026', sales: 245122, salesGrowthPct: 15.6, expenses: 135600, operatingProfit: 109522, opmPct: 44.7, otherIncome: 1250, interest: 2800, depreciation: 14200, profitBeforeTax: 93772, taxPct: 18.4, netProfit: 76520, eps: 10.28, dividendPayoutPct: 28.5 }
    ],
    balanceSheet: [
      { year: 'Jun 2026', equityCapital: 98, reserves: 170, borrowings: 98, otherLiabilities: 145, totalLiabilities: 511, fixedAssets: 185, cwip: 25, investments: 120, otherAssets: 181, totalAssets: 511 }
    ],
    cashFlow: [
      { year: 'Jun 2026', cashFromOperating: 112, cashFromInvesting: -38, cashFromFinancing: -72, netCashFlow: 2, freeCashFlow: 82 }
    ],
    historicalRatios: [
      { year: 'Jun 2026', rocePct: 34.5, roePct: 38.2, debtorDays: 52, inventoryDays: 0, daysPayable: 70, cashConversionCycle: -18, workingCapitalDays: -12 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 1.25, fii: 68.40, dii: 24.20, government: 0.0, public: 6.15, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'NVDA',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'Semiconductors & AI Silicon',
    industry: 'Accelerated Computing & AI Silicon',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'NVIDIA is the pioneer of GPU-accelerated computing. It creates specialized hardware and CUDA software architectures powering global AI training, inference, high-performance computing, and autonomous machines.',
    website: 'https://www.nvidia.com',
    dataFreshness: 'Q3 FY27 (Oct 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 138.50,
    priceChangePct: 3.45,
    marketCap: 3390,
    enterpriseValue: 3360,
    pe: 51.2,
    forwardPe: 34.5,
    pb: 44.8,
    priceToSales: 28.4,
    evToEbitda: 42.5,
    evToEbit: 45.8,
    earningsYield: 1.95,
    dividendYield: 0.08,
    fcfYield: 1.85,
    pegRatio: 0.85,
    salesGrowth1Y: 122.4,
    salesGrowth3Y: 88.5,
    salesGrowth5Y: 62.4,
    salesGrowth10Y: 42.5,
    profitGrowth1Y: 184.2,
    profitGrowth3Y: 125.4,
    profitGrowth5Y: 84.5,
    profitGrowth10Y: 58.2,
    epsGrowth: 180.5,
    ebitdaGrowth: 175.2,
    qtrSalesGrowthYoY: 94.2,
    qtrProfitGrowthYoY: 109.2,
    roce: 88.5,
    roe: 92.4,
    roic: 94.2,
    roa: 54.8,
    opm: 64.8,
    npm: 55.4,
    grossMargin: 75.2,
    ebitdaMargin: 66.8,
    roce3YAvg: 64.2,
    roe3YAvg: 68.5,
    roce5YAvg: 48.2,
    debtToEquity: 0.18,
    netDebt: -30,
    interestCoverage: 85.0,
    currentRatio: 4.25,
    quickRatio: 3.45,
    cfo: 65,
    freeCashFlow: 58,
    cashConversionCycle: 68,
    capex: 7,
    workingCapitalDays: 62,
    debtReduction3Y: 28.0,
    promoterHolding: 3.85,
    promoterHoldingChange3Y: -0.45,
    pledgedPct: 0.0,
    fiiHolding: 64.80,
    diiHolding: 25.40,
    publicHolding: 5.95,
    high52W: 153.20,
    low52W: 68.50,
    priceTo52WHighPct: -9.6,
    priceReturn1M: 6.8,
    priceReturn1Y: 132.5,
    volume: 52000000,
    beta: 1.68,
    pros: [
      'Unsurpassed growth velocity: 1Y profit growth of 184.2% and gross margin above 75%.',
      'PEG ratio under 1.0 (0.85) signals compelling valuation relative to triple-digit net income expansion.',
      'Unassailable software moat through CUDA software developer lock-in.',
      'Superlative Return on Capital Employed of 88.5% with $30B net cash balance.'
    ],
    cons: [
      'High customer concentration: top 4 cloud hyperscalers account for over 40% of sales.',
      'Strict US export control restrictions on advanced AI silicon shipments to China.'
    ],
    quarterlyResults: [
      { quarter: 'Jul 2026', sales: 35082, expenses: 13200, operatingProfit: 21882, opmPct: 62.4, otherIncome: 340, interest: 65, depreciation: 520, profitBeforeTax: 21637, taxPct: 10.5, netProfit: 19365, eps: 0.78 },
      { quarter: 'Apr 2026', sales: 30040, expenses: 11400, operatingProfit: 18640, opmPct: 62.0, otherIncome: 290, interest: 62, depreciation: 480, profitBeforeTax: 18388, taxPct: 10.4, netProfit: 16475, eps: 0.67 }
    ],
    annualProfitLoss: [
      { year: 'Jan 2026', sales: 60922, salesGrowthPct: 122.4, expenses: 28000, operatingProfit: 32922, opmPct: 54.0, otherIncome: 850, interest: 250, depreciation: 1450, profitBeforeTax: 32072, taxPct: 11.5, netProfit: 28383, eps: 1.15, dividendPayoutPct: 2.5 }
    ],
    balanceSheet: [
      { year: 'Jan 2026', equityCapital: 43, reserves: 12, borrowings: 11, otherLiabilities: 15, totalLiabilities: 81, fixedAssets: 12, cwip: 1, investments: 28, otherAssets: 40, totalAssets: 81 }
    ],
    cashFlow: [
      { year: 'Jan 2026', cashFromOperating: 28, cashFromInvesting: -12, cashFromFinancing: -15, netCashFlow: 1, freeCashFlow: 24 }
    ],
    historicalRatios: [
      { year: 'Jan 2026', rocePct: 88.5, roePct: 92.4, debtorDays: 54, inventoryDays: 52, daysPayable: 38, cashConversionCycle: 68, workingCapitalDays: 62 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 3.85, fii: 64.80, dii: 25.40, government: 0.0, public: 5.95, pledgedPct: 0.0 }
    ]
  },

  {
    id: 'AMZN',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    exchange: 'NASDAQ',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'E-Commerce & Digital Platforms',
    industry: 'Online Retail, Cloud Platforms (AWS) & Advertising',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Amazon is a global technology enterprise operating the world’s largest e-commerce marketplace, leading cloud infrastructure provider AWS, and digital advertising network.',
    website: 'https://www.amazon.com',
    dataFreshness: 'Q4 FY26 (Dec 2025)',
    lastUpdated: '2026-10-23',
    currentPrice: 212.50,
    priceChangePct: 1.42,
    marketCap: 2210,
    enterpriseValue: 2260,
    pe: 41.2,
    forwardPe: 32.5,
    pb: 8.4,
    priceToSales: 3.55,
    evToEbitda: 20.8,
    evToEbit: 26.5,
    earningsYield: 2.42,
    dividendYield: 0.0,
    fcfYield: 2.25,
    pegRatio: 1.65,
    salesGrowth1Y: 11.8,
    salesGrowth3Y: 12.4,
    salesGrowth5Y: 18.2,
    salesGrowth10Y: 22.4,
    profitGrowth1Y: 84.5,
    profitGrowth3Y: 34.5,
    profitGrowth5Y: 28.2,
    profitGrowth10Y: 32.0,
    epsGrowth: 81.2,
    ebitdaGrowth: 38.5,
    qtrSalesGrowthYoY: 11.2,
    qtrProfitGrowthYoY: 52.4,
    roce: 22.5,
    roe: 24.2,
    roic: 19.8,
    roa: 10.4,
    opm: 11.2,
    npm: 8.8,
    grossMargin: 49.5,
    ebitdaMargin: 17.5,
    roce3YAvg: 18.5,
    roe3YAvg: 19.2,
    roce5YAvg: 16.8,
    debtToEquity: 0.48,
    netDebt: 24,
    interestCoverage: 18.4,
    currentRatio: 1.08,
    quickRatio: 0.88,
    cfo: 112,
    freeCashFlow: 49,
    cashConversionCycle: -24,
    capex: 63,
    workingCapitalDays: -18,
    debtReduction3Y: 12.0,
    promoterHolding: 9.20,
    promoterHoldingChange3Y: -1.2,
    pledgedPct: 0.0,
    fiiHolding: 61.50,
    diiHolding: 21.80,
    publicHolding: 7.50,
    high52W: 232.00,
    low52W: 168.00,
    priceTo52WHighPct: -8.4,
    priceReturn1M: 3.8,
    priceReturn1Y: 28.5,
    volume: 38500000,
    beta: 1.15,
    pros: [
      'AWS cloud operating profit margin accelerating above 38%.',
      'High-margin retail digital advertising revenue compounding above 20% YoY.',
      'Record annual cash flow from operations exceeding $112 Billion.'
    ],
    cons: [
      'Aggressive generative AI infrastructure capex exceeding $60 Billion annually.',
      'Antitrust litigation with the Federal Trade Commission ongoing.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 187800, expenses: 166600, operatingProfit: 21200, opmPct: 11.3, otherIncome: 450, interest: 820, depreciation: 14200, profitBeforeTax: 20830, taxPct: 18.5, netProfit: 16976, eps: 1.62 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2025', sales: 620130, salesGrowthPct: 11.8, expenses: 550700, operatingProfit: 69430, opmPct: 11.2, otherIncome: 1200, interest: 3200, depreciation: 52400, profitBeforeTax: 67430, taxPct: 19.2, netProfit: 54483, eps: 5.18, dividendPayoutPct: 0.0 }
    ],
    balanceSheet: [
      { year: 'Dec 2025', equityCapital: 120, reserves: 245000, borrowings: 118000, otherLiabilities: 182000, totalLiabilities: 545120, fixedAssets: 285000, cwip: 18000, investments: 62000, otherAssets: 180120, totalAssets: 545120 }
    ],
    cashFlow: [
      { year: 'Dec 2025', cashFromOperating: 112, cashFromInvesting: -65, cashFromFinancing: -35, netCashFlow: 12, freeCashFlow: 49 }
    ],
    historicalRatios: [
      { year: 'Dec 2025', rocePct: 22.5, roePct: 24.2, debtorDays: 22, inventoryDays: 34, daysPayable: 80, cashConversionCycle: -24, workingCapitalDays: -18 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 9.20, fii: 61.50, dii: 21.80, government: 0.0, public: 7.50, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'TSLA',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    exchange: 'NASDAQ',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'Automotive & Clean Energy',
    industry: 'Electric Vehicles, Megapack Energy & Autonomous AI',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Tesla designs, manufactures, and deploys electric vehicles, commercial battery storage units (Megapack), and autonomous driving full-stack AI robotics.',
    website: 'https://www.tesla.com',
    dataFreshness: 'Q4 FY26 (Dec 2025)',
    lastUpdated: '2026-10-23',
    currentPrice: 248.50,
    priceChangePct: 2.15,
    marketCap: 792,
    enterpriseValue: 770,
    pe: 74.5,
    forwardPe: 62.0,
    pb: 11.2,
    priceToSales: 7.85,
    evToEbitda: 42.5,
    evToEbit: 58.2,
    earningsYield: 1.34,
    dividendYield: 0.0,
    fcfYield: 1.15,
    pegRatio: 3.85,
    salesGrowth1Y: 3.5,
    salesGrowth3Y: 28.5,
    salesGrowth5Y: 42.1,
    salesGrowth10Y: 52.0,
    profitGrowth1Y: -22.5,
    profitGrowth3Y: 18.5,
    profitGrowth5Y: 62.4,
    profitGrowth10Y: null,
    epsGrowth: -20.5,
    ebitdaGrowth: -8.5,
    qtrSalesGrowthYoY: 7.8,
    qtrProfitGrowthYoY: 14.5,
    roce: 16.5,
    roe: 18.2,
    roic: 14.8,
    roa: 8.5,
    opm: 8.8,
    npm: 7.5,
    grossMargin: 19.8,
    ebitdaMargin: 14.2,
    roce3YAvg: 22.4,
    roe3YAvg: 24.5,
    roce5YAvg: 18.2,
    debtToEquity: 0.08,
    netDebt: -28,
    interestCoverage: 32.5,
    currentRatio: 1.85,
    quickRatio: 1.45,
    cfo: 14.2,
    freeCashFlow: 4.8,
    cashConversionCycle: 18,
    capex: 9.4,
    workingCapitalDays: 14,
    debtReduction3Y: 25.0,
    promoterHolding: 12.80,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 48.50,
    diiHolding: 24.20,
    publicHolding: 14.50,
    high52W: 358.64,
    low52W: 138.80,
    priceTo52WHighPct: -30.7,
    priceReturn1M: -4.5,
    priceReturn1Y: 18.2,
    volume: 68000000,
    beta: 2.15,
    pros: [
      'Pristine net cash balance sheet holding over $28 Billion in cash and zero net borrowings.',
      'Energy generation and storage Megapack revenues doubling year-over-year.',
      'Proprietary Dojo and autonomous Robotaxi fleet network monetization potential.'
    ],
    cons: [
      'Automotive gross margins under pressure from low-cost Chinese EV competitors.',
      'Key person dependency and regulatory hurdles for full driverless approval.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 25800, expenses: 23600, operatingProfit: 2200, opmPct: 8.5, otherIncome: 350, interest: 85, depreciation: 1300, profitBeforeTax: 2465, taxPct: 15.0, netProfit: 2095, eps: 0.65 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2025', sales: 97800, salesGrowthPct: 1.0, expenses: 88900, operatingProfit: 8900, opmPct: 9.1, otherIncome: 1100, interest: 320, depreciation: 4800, profitBeforeTax: 9680, taxPct: 14.2, netProfit: 8305, eps: 2.58, dividendPayoutPct: 0.0 }
    ],
    balanceSheet: [
      { year: 'Dec 2025', equityCapital: 32, reserves: 68500, borrowings: 5400, otherLiabilities: 38000, totalLiabilities: 111932, fixedAssets: 34000, cwip: 3500, investments: 32000, otherAssets: 42432, totalAssets: 111932 }
    ],
    cashFlow: [
      { year: 'Dec 2025', cashFromOperating: 14.2, cashFromInvesting: -9.4, cashFromFinancing: -1.2, netCashFlow: 3.6, freeCashFlow: 4.8 }
    ],
    historicalRatios: [
      { year: 'Dec 2025', rocePct: 16.5, roePct: 18.2, debtorDays: 12, inventoryDays: 52, daysPayable: 46, cashConversionCycle: 18, workingCapitalDays: 14 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 12.80, fii: 48.50, dii: 24.20, government: 0.0, public: 14.50, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'GOOGL',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    exchange: 'NASDAQ',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'Communication & Interactive Media',
    industry: 'Search Engine, YouTube Streaming & Gemini AI Platforms',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Alphabet is the global parent holding company of Google, YouTube, Android, Google Cloud, and Waymo, providing search infrastructure, digital video, and frontier AI.',
    website: 'https://abc.xyz',
    dataFreshness: 'Q4 FY26 (Dec 2025)',
    lastUpdated: '2026-10-23',
    currentPrice: 182.40,
    priceChangePct: 1.12,
    marketCap: 2240,
    enterpriseValue: 2150,
    pe: 23.5,
    forwardPe: 19.8,
    pb: 6.8,
    priceToSales: 6.45,
    evToEbitda: 16.2,
    evToEbit: 19.5,
    earningsYield: 4.25,
    dividendYield: 0.44,
    fcfYield: 3.10,
    pegRatio: 1.25,
    salesGrowth1Y: 15.2,
    salesGrowth3Y: 11.5,
    salesGrowth5Y: 17.5,
    salesGrowth10Y: 18.8,
    profitGrowth1Y: 34.5,
    profitGrowth3Y: 18.2,
    profitGrowth5Y: 22.4,
    profitGrowth10Y: 21.0,
    epsGrowth: 38.5,
    ebitdaGrowth: 28.5,
    qtrSalesGrowthYoY: 14.8,
    qtrProfitGrowthYoY: 28.4,
    roce: 35.2,
    roe: 31.8,
    roic: 32.5,
    roa: 21.5,
    opm: 32.2,
    npm: 27.8,
    grossMargin: 58.2,
    ebitdaMargin: 36.5,
    roce3YAvg: 31.5,
    roe3YAvg: 28.4,
    roce5YAvg: 29.8,
    debtToEquity: 0.09,
    netDebt: -92,
    interestCoverage: 48.0,
    currentRatio: 2.10,
    quickRatio: 1.95,
    cfo: 108,
    freeCashFlow: 69,
    cashConversionCycle: 14,
    capex: 39,
    workingCapitalDays: 12,
    debtReduction3Y: 5.0,
    promoterHolding: 11.50,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 64.20,
    diiHolding: 18.50,
    publicHolding: 5.80,
    high52W: 193.31,
    low52W: 130.66,
    priceTo52WHighPct: -5.6,
    priceReturn1M: 2.8,
    priceReturn1Y: 32.4,
    volume: 22500000,
    beta: 1.05,
    pros: [
      'Fortress balance sheet with $92 Billion in net cash and zero solvency risk.',
      'Google Cloud operating profits quadrupling with 35% annual top-line growth.',
      'Superior ROCE (35.2%) supported by YouTube and search advertising pricing power.'
    ],
    cons: [
      'DOJ search distribution antitrust remedy proceedings pending.',
      'Potential search query volume disruption from conversational AI tools.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 96500, expenses: 65400, operatingProfit: 31100, opmPct: 32.2, otherIncome: 820, interest: 180, depreciation: 4200, profitBeforeTax: 31740, taxPct: 15.5, netProfit: 26820, eps: 2.15 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2025', sales: 350000, salesGrowthPct: 15.2, expenses: 237300, operatingProfit: 112700, opmPct: 32.2, otherIncome: 2400, interest: 650, depreciation: 15800, profitBeforeTax: 114450, taxPct: 15.0, netProfit: 97282, eps: 7.78, dividendPayoutPct: 5.2 }
    ],
    balanceSheet: [
      { year: 'Dec 2025', equityCapital: 12, reserves: 310000, borrowings: 28000, otherLiabilities: 78000, totalLiabilities: 416012, fixedAssets: 145000, cwip: 8500, investments: 125000, otherAssets: 137512, totalAssets: 416012 }
    ],
    cashFlow: [
      { year: 'Dec 2025', cashFromOperating: 108, cashFromInvesting: -42, cashFromFinancing: -55, netCashFlow: 11, freeCashFlow: 69 }
    ],
    historicalRatios: [
      { year: 'Dec 2025', rocePct: 35.2, roePct: 31.8, debtorDays: 42, inventoryDays: 0, daysPayable: 28, cashConversionCycle: 14, workingCapitalDays: 12 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 11.50, fii: 64.20, dii: 18.50, government: 0.0, public: 5.80, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'JPM',
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    exchange: 'NYSE',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'Financial Services & Banking',
    industry: 'Universal Banking, Global Asset Management & Capital Markets',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'JPMorgan Chase is the largest financial institution in the United States and a global leader in investment banking, financial services for consumers and small businesses, commercial banking, and asset management.',
    website: 'https://www.jpmorganchase.com',
    dataFreshness: 'Q4 FY26 (Dec 2025)',
    lastUpdated: '2026-10-23',
    currentPrice: 224.80,
    priceChangePct: -0.45,
    marketCap: 642,
    enterpriseValue: 710,
    pe: 12.2,
    forwardPe: 11.5,
    pb: 1.85,
    priceToSales: 3.85,
    evToEbitda: 9.8,
    evToEbit: 11.2,
    earningsYield: 8.20,
    dividendYield: 2.15,
    fcfYield: 7.45,
    pegRatio: 1.45,
    salesGrowth1Y: 10.2,
    salesGrowth3Y: 16.5,
    salesGrowth5Y: 11.8,
    salesGrowth10Y: 8.5,
    profitGrowth1Y: 12.5,
    profitGrowth3Y: 14.8,
    profitGrowth5Y: 12.2,
    profitGrowth10Y: 9.5,
    epsGrowth: 15.2,
    ebitdaGrowth: 14.2,
    qtrSalesGrowthYoY: 9.5,
    qtrProfitGrowthYoY: 8.4,
    roce: 18.5,
    roe: 18.2,
    roic: 16.5,
    roa: 1.45,
    opm: 38.5,
    npm: 31.5,
    grossMargin: 65.2,
    ebitdaMargin: 42.5,
    roce3YAvg: 17.5,
    roe3YAvg: 17.2,
    roce5YAvg: 16.0,
    debtToEquity: 1.25,
    netDebt: 85,
    interestCoverage: 12.5,
    currentRatio: 1.15,
    quickRatio: 1.15,
    cfo: 58,
    freeCashFlow: 48,
    cashConversionCycle: 0,
    capex: 10,
    workingCapitalDays: 0,
    debtReduction3Y: 4.5,
    promoterHolding: 0.12,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 58.40,
    diiHolding: 32.50,
    publicHolding: 8.98,
    high52W: 248.00,
    low52W: 172.50,
    priceTo52WHighPct: -9.4,
    priceReturn1M: 1.2,
    priceReturn1Y: 34.5,
    volume: 9200000,
    beta: 1.08,
    pros: [
      'Unsurpassed balance sheet scale with CET1 capital ratio above 15.3%.',
      'Consistent ROTCE above 20% across varying interest rate cycles.',
      'Record annual net income exceeding $57 Billion.'
    ],
    cons: [
      'Net interest margin compression as global central banks reduce short-term interest rates.',
      'Federal banking capital surcharge regulations.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 42200, expenses: 25800, operatingProfit: 16400, opmPct: 38.9, otherIncome: 120, interest: 850, depreciation: 920, profitBeforeTax: 14750, taxPct: 18.5, netProfit: 12021, eps: 4.25 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2025', sales: 168500, salesGrowthPct: 10.2, expenses: 103600, operatingProfit: 64900, opmPct: 38.5, otherIncome: 450, interest: 3200, depreciation: 3600, profitBeforeTax: 58550, taxPct: 18.2, netProfit: 47894, eps: 16.85, dividendPayoutPct: 26.5 }
    ],
    balanceSheet: [
      { year: 'Dec 2025', equityCapital: 28, reserves: 348000, borrowings: 435000, otherLiabilities: 3350000, totalLiabilities: 4133028, fixedAssets: 28000, cwip: 2500, investments: 850000, otherAssets: 3252528, totalAssets: 4133028 }
    ],
    cashFlow: [
      { year: 'Dec 2025', cashFromOperating: 58, cashFromInvesting: -18, cashFromFinancing: -28, netCashFlow: 12, freeCashFlow: 48 }
    ],
    historicalRatios: [
      { year: 'Dec 2025', rocePct: 18.5, roePct: 18.2, debtorDays: 0, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 0, workingCapitalDays: 0 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 0.12, fii: 58.40, dii: 32.50, government: 0.0, public: 8.98, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'LLY',
    symbol: 'LLY',
    name: 'Eli Lilly and Company',
    exchange: 'NYSE',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'Healthcare & Pharmaceuticals',
    industry: 'Metabolic Incretin Therapies (GLP-1), Oncology & Neuroscience',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Eli Lilly is an elite global pharmaceutical manufacturer spearheading therapeutic breakthroughs with blockbuster incretin drugs Mounjaro and Zepbound for metabolic diseases and obesity.',
    website: 'https://www.lilly.com',
    dataFreshness: 'Q4 FY26 (Dec 2025)',
    lastUpdated: '2026-10-23',
    currentPrice: 825.40,
    priceChangePct: 1.85,
    marketCap: 785,
    enterpriseValue: 815,
    pe: 58.2,
    forwardPe: 34.5,
    pb: 48.5,
    priceToSales: 17.5,
    evToEbitda: 41.5,
    evToEbit: 48.2,
    earningsYield: 1.72,
    dividendYield: 0.65,
    fcfYield: 1.58,
    pegRatio: 1.62,
    salesGrowth1Y: 32.5,
    salesGrowth3Y: 22.4,
    salesGrowth5Y: 18.5,
    salesGrowth10Y: 11.2,
    profitGrowth1Y: 82.5,
    profitGrowth3Y: 42.5,
    profitGrowth5Y: 24.5,
    profitGrowth10Y: 18.5,
    epsGrowth: 85.2,
    ebitdaGrowth: 74.2,
    qtrSalesGrowthYoY: 42.5,
    qtrProfitGrowthYoY: 94.2,
    roce: 28.4,
    roe: 78.5,
    roic: 26.5,
    roa: 18.5,
    opm: 34.2,
    npm: 28.5,
    grossMargin: 81.2,
    ebitdaMargin: 38.5,
    roce3YAvg: 26.5,
    roe3YAvg: 68.2,
    roce5YAvg: 24.2,
    debtToEquity: 1.95,
    netDebt: 28,
    interestCoverage: 24.5,
    currentRatio: 1.35,
    quickRatio: 0.95,
    cfo: 16.5,
    freeCashFlow: 12.4,
    cashConversionCycle: 68,
    capex: 4.1,
    workingCapitalDays: 52,
    debtReduction3Y: 8.5,
    promoterHolding: 0.08,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 68.40,
    diiHolding: 22.50,
    publicHolding: 9.02,
    high52W: 972.53,
    low52W: 550.00,
    priceTo52WHighPct: -15.1,
    priceReturn1M: 6.8,
    priceReturn1Y: 48.5,
    volume: 3200000,
    beta: 0.72,
    pros: [
      'Unprecedented global demand for tirzepatide with peak annual sales forecasted over $50 Billion.',
      'Industry-leading gross profit margin of 81.2%.',
      'Massive pipeline optionality in oral GLP-1 (orforglipron) and Alzheimer therapeutics (donanemab).'
    ],
    cons: [
      'Stringent automated fill-finish capacity constraints worldwide.',
      'Valuation multiple (P/E 58x) discounts multi-year rapid operational execution.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 13500, expenses: 8850, operatingProfit: 4650, opmPct: 34.4, otherIncome: 120, interest: 180, depreciation: 520, profitBeforeTax: 4070, taxPct: 14.5, netProfit: 3480, eps: 3.85 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2025', sales: 45200, salesGrowthPct: 32.5, expenses: 29750, operatingProfit: 15450, opmPct: 34.2, otherIncome: 350, interest: 620, depreciation: 1850, profitBeforeTax: 13330, taxPct: 14.2, netProfit: 11437, eps: 12.65, dividendPayoutPct: 38.5 }
    ],
    balanceSheet: [
      { year: 'Dec 2025', equityCapital: 9, reserves: 16500, borrowings: 32000, otherLiabilities: 28000, totalLiabilities: 76509, fixedAssets: 24000, cwip: 6500, investments: 12000, otherAssets: 34009, totalAssets: 76509 }
    ],
    cashFlow: [
      { year: 'Dec 2025', cashFromOperating: 16.5, cashFromInvesting: -5.2, cashFromFinancing: -8.8, netCashFlow: 2.5, freeCashFlow: 12.4 }
    ],
    historicalRatios: [
      { year: 'Dec 2025', rocePct: 28.4, roePct: 78.5, debtorDays: 58, inventoryDays: 78, daysPayable: 68, cashConversionCycle: 68, workingCapitalDays: 52 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 0.08, fii: 68.40, dii: 22.50, government: 0.0, public: 9.02, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'XOM',
    symbol: 'XOM',
    name: 'Exxon Mobil Corporation',
    exchange: 'NYSE',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'Energy & Petroleum',
    industry: 'Integrated Exploration, Offshore Production & Refining',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Exxon Mobil is one of the world’s foremost integrated oil and energy companies, developing prolific deepwater discoveries in Guyana and low-cost unconventional oil in the Permian Basin.',
    website: 'https://corporate.exxonmobil.com',
    dataFreshness: 'Q4 FY26 (Dec 2025)',
    lastUpdated: '2026-10-23',
    currentPrice: 118.60,
    priceChangePct: 0.42,
    marketCap: 472,
    enterpriseValue: 508,
    pe: 13.8,
    forwardPe: 12.2,
    pb: 2.15,
    priceToSales: 1.35,
    evToEbitda: 7.2,
    evToEbit: 9.4,
    earningsYield: 7.25,
    dividendYield: 3.32,
    fcfYield: 6.78,
    pegRatio: 1.85,
    salesGrowth1Y: 4.2,
    salesGrowth3Y: 18.5,
    salesGrowth5Y: 8.5,
    salesGrowth10Y: 2.4,
    profitGrowth1Y: -11.5,
    profitGrowth3Y: 24.5,
    profitGrowth5Y: 16.5,
    profitGrowth10Y: 4.2,
    epsGrowth: -8.5,
    ebitdaGrowth: -5.2,
    qtrSalesGrowthYoY: 2.8,
    qtrProfitGrowthYoY: 5.4,
    roce: 16.2,
    roe: 17.5,
    roic: 15.8,
    roa: 9.2,
    opm: 16.5,
    npm: 10.8,
    grossMargin: 34.2,
    ebitdaMargin: 21.5,
    roce3YAvg: 19.5,
    roe3YAvg: 21.2,
    roce5YAvg: 14.8,
    debtToEquity: 0.18,
    netDebt: 36,
    interestCoverage: 28.5,
    currentRatio: 1.45,
    quickRatio: 1.15,
    cfo: 55,
    freeCashFlow: 32,
    cashConversionCycle: 18,
    capex: 23,
    workingCapitalDays: 14,
    debtReduction3Y: 34.0,
    promoterHolding: 0.05,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 56.50,
    diiHolding: 31.80,
    publicHolding: 11.65,
    high52W: 126.34,
    low52W: 98.20,
    priceTo52WHighPct: -6.1,
    priceReturn1M: 1.8,
    priceReturn1Y: 14.2,
    volume: 14500000,
    beta: 0.88,
    pros: [
      'Break-even crude production costs below $35 per barrel in offshore Guyana deepwater.',
      'Generous 3.32% dividend yield supported by 42 consecutive years of payout growth.',
      'Pioneer Natural Resources acquisition doubling premier Permian Basin inventory.'
    ],
    cons: [
      'Direct correlation to international Brent crude oil benchmark prices.',
      'Refining crack spread cyclicality.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 88500, expenses: 73800, operatingProfit: 14700, opmPct: 16.6, otherIncome: 350, interest: 480, depreciation: 5200, profitBeforeTax: 9370, taxPct: 22.0, netProfit: 7308, eps: 1.82 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2025', sales: 349500, salesGrowthPct: 4.2, expenses: 291800, operatingProfit: 57700, opmPct: 16.5, otherIncome: 1400, interest: 1800, depreciation: 20500, profitBeforeTax: 36800, taxPct: 21.5, netProfit: 28888, eps: 7.22, dividendPayoutPct: 45.0 }
    ],
    balanceSheet: [
      { year: 'Dec 2025', equityCapital: 42, reserves: 218000, borrowings: 41000, otherLiabilities: 112000, totalLiabilities: 371042, fixedAssets: 245000, cwip: 18000, investments: 38000, otherAssets: 70042, totalAssets: 371042 }
    ],
    cashFlow: [
      { year: 'Dec 2025', cashFromOperating: 55, cashFromInvesting: -25, cashFromFinancing: -27, netCashFlow: 3, freeCashFlow: 32 }
    ],
    historicalRatios: [
      { year: 'Dec 2025', rocePct: 16.2, roePct: 17.5, debtorDays: 24, inventoryDays: 16, daysPayable: 22, cashConversionCycle: 18, workingCapitalDays: 14 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 0.05, fii: 56.50, dii: 31.80, government: 0.0, public: 11.65, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'COST',
    symbol: 'COST',
    name: 'Costco Wholesale Corporation',
    exchange: 'NASDAQ',
    market: 'USA',
    country: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    sector: 'Consumer Staples & Retail',
    industry: 'Membership Wholesale Warehouses & Global Merchandising',
    marketCapCategory: 'Mega',
    isConsolidated: true,
    about: 'Costco operates a premier international network of membership-only warehouse clubs providing brand-name merchandise at substantial discounts supported by recurring membership fee income.',
    website: 'https://www.costco.com',
    dataFreshness: 'Q1 FY27 (Jun 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 924.30,
    priceChangePct: 0.75,
    marketCap: 410,
    enterpriseValue: 402,
    pe: 54.2,
    forwardPe: 46.5,
    pb: 16.8,
    priceToSales: 1.58,
    evToEbitda: 31.5,
    evToEbit: 38.2,
    earningsYield: 1.85,
    dividendYield: 0.52,
    fcfYield: 1.65,
    pegRatio: 3.85,
    salesGrowth1Y: 8.6,
    salesGrowth3Y: 10.2,
    salesGrowth5Y: 11.5,
    salesGrowth10Y: 9.4,
    profitGrowth1Y: 14.5,
    profitGrowth3Y: 12.8,
    profitGrowth5Y: 15.2,
    profitGrowth10Y: 12.5,
    epsGrowth: 15.2,
    ebitdaGrowth: 13.8,
    qtrSalesGrowthYoY: 7.5,
    qtrProfitGrowthYoY: 13.2,
    roce: 29.5,
    roe: 28.4,
    roic: 26.8,
    roa: 11.2,
    opm: 3.8,
    npm: 2.9,
    grossMargin: 12.5,
    ebitdaMargin: 4.8,
    roce3YAvg: 28.5,
    roe3YAvg: 27.5,
    roce5YAvg: 26.4,
    debtToEquity: 0.28,
    netDebt: -8,
    interestCoverage: 45.0,
    currentRatio: 1.05,
    quickRatio: 0.45,
    cfo: 11.2,
    freeCashFlow: 6.8,
    cashConversionCycle: 4,
    capex: 4.4,
    workingCapitalDays: -2,
    debtReduction3Y: 14.0,
    promoterHolding: 0.15,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 62.80,
    diiHolding: 26.40,
    publicHolding: 10.65,
    high52W: 968.00,
    low52W: 660.00,
    priceTo52WHighPct: -4.5,
    priceReturn1M: 4.2,
    priceReturn1Y: 41.5,
    volume: 1850000,
    beta: 0.78,
    pros: [
      '93% membership renewal rate providing unbreakable, highly predictable recurring cash inflows.',
      'Inventory turns rapidly with negative cash-funded working capital cycles.',
      'High return on capital employed (29.5%) driven by extreme store-level sales efficiency.'
    ],
    cons: [
      'Valuation multiple (P/E 54x) leaves little buffer for operational disappointments.',
      'Low dividend payout yield compared to standard retail consumer staples.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 62500, expenses: 60100, operatingProfit: 2400, opmPct: 3.8, otherIncome: 110, interest: 45, depreciation: 520, profitBeforeTax: 1945, taxPct: 24.5, netProfit: 1468, eps: 3.32 }
    ],
    annualProfitLoss: [
      { year: 'Sep 2026', sales: 254450, salesGrowthPct: 8.6, expenses: 244800, operatingProfit: 9650, opmPct: 3.8, otherIncome: 420, interest: 180, depreciation: 2100, profitBeforeTax: 7790, taxPct: 24.2, netProfit: 5904, eps: 13.32, dividendPayoutPct: 34.5 }
    ],
    balanceSheet: [
      { year: 'Sep 2026', equityCapital: 5, reserves: 24500, borrowings: 6800, otherLiabilities: 38000, totalLiabilities: 69305, fixedAssets: 28000, cwip: 1800, investments: 12000, otherAssets: 27505, totalAssets: 69305 }
    ],
    cashFlow: [
      { year: 'Sep 2026', cashFromOperating: 11.2, cashFromInvesting: -4.8, cashFromFinancing: -5.8, netCashFlow: 0.6, freeCashFlow: 6.8 }
    ],
    historicalRatios: [
      { year: 'Sep 2026', rocePct: 29.5, roePct: 28.4, debtorDays: 4, inventoryDays: 32, daysPayable: 32, cashConversionCycle: 4, workingCapitalDays: -2 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 0.15, fii: 62.80, dii: 26.40, government: 0.0, public: 10.65, pledgedPct: 0.0 }
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // UAE — DUBAI FINANCIAL MARKET (DFM) & ABU DHABI SECURITIES EXCHANGE (ADX)
  // ══════════════════════════════════════════════════════════════════════════════
  {
    id: 'EMAAR',
    symbol: 'EMAAR',
    name: 'Emaar Properties PJSC',
    exchange: 'DFM',
    market: 'UAE',
    country: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED ',
    sector: 'Real Estate & Master Development',
    industry: 'Master Development, Hospitality & Malls',
    marketCapCategory: 'Large',
    isConsolidated: true,
    about: 'Emaar Properties is the master developer behind Downtown Dubai, Burj Khalifa, and Dubai Mall. It operates across prime residential property, retail malls, commercial assets, and international hospitality.',
    website: 'https://www.emaar.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 8.92,
    priceChangePct: 1.45,
    marketCap: 78.5, // Billion AED
    enterpriseValue: 84.2,
    pe: 7.2,
    forwardPe: 6.5,
    pb: 0.98,
    priceToSales: 2.85,
    evToEbitda: 5.8,
    evToEbit: 6.5,
    earningsYield: 13.88,
    dividendYield: 5.60,
    fcfYield: 11.20,
    pegRatio: 0.45,
    salesGrowth1Y: 28.5,
    salesGrowth3Y: 22.4,
    salesGrowth5Y: 16.8,
    salesGrowth10Y: 14.2,
    profitGrowth1Y: 34.5,
    profitGrowth3Y: 42.5,
    profitGrowth5Y: 22.4,
    profitGrowth10Y: 18.5,
    epsGrowth: 34.0,
    ebitdaGrowth: 32.5,
    qtrSalesGrowthYoY: 32.4,
    qtrProfitGrowthYoY: 38.5,
    roce: 18.5,
    roe: 16.8,
    roic: 17.2,
    roa: 9.4,
    opm: 48.5,
    npm: 38.2,
    grossMargin: 56.4,
    ebitdaMargin: 50.2,
    roce3YAvg: 16.2,
    roe3YAvg: 14.8,
    roce5YAvg: 14.5,
    debtToEquity: 0.18,
    netDebt: 5.7,
    interestCoverage: 18.4,
    currentRatio: 1.85,
    quickRatio: 1.15,
    cfo: 12.8,
    freeCashFlow: 8.8,
    cashConversionCycle: 145,
    capex: 4.0,
    workingCapitalDays: 130,
    debtReduction3Y: 48.0,
    promoterHolding: 24.0, // Sovereign wealth fund Investment Corporation of Dubai (ICD)
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 38.50,
    diiHolding: 22.10,
    publicHolding: 15.40,
    high52W: 9.45,
    low52W: 7.15,
    priceTo52WHighPct: -5.6,
    priceReturn1M: 5.2,
    priceReturn1Y: 24.5,
    volume: 18500000,
    beta: 1.12,
    pros: [
      'Very attractive deep value metrics: trading below book value (0.98x PB) and at just 7.2x PE.',
      'Sovereign backing by Dubai Government (ICD) with massive 5.60% dividend yield.',
      'Record property backlog revenue exceeding AED 80 Billion providing multi-year earnings visibility.',
      'Aggressive balance sheet deleveraging: net debt reduced by 48% over 3 years.'
    ],
    cons: [
      'Cyclical exposure to geopolitical stability and regional real estate supply in the GCC.',
      'Foreign ownership limit restrictions and fluctuating mortgage interest rates.'
    ],
    quarterlyResults: [
      { quarter: 'Jun 2026', sales: 8450, expenses: 4320, operatingProfit: 4130, opmPct: 48.9, otherIncome: 180, interest: 210, depreciation: 380, profitBeforeTax: 3720, taxPct: 9.0, netProfit: 3385, eps: 0.38 },
      { quarter: 'Mar 2026', sales: 7850, expenses: 4050, operatingProfit: 3800, opmPct: 48.4, otherIncome: 160, interest: 215, depreciation: 375, profitBeforeTax: 3370, taxPct: 9.0, netProfit: 3067, eps: 0.35 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2024', sales: 26748, salesGrowthPct: 7.0, expenses: 13850, operatingProfit: 12898, opmPct: 48.2, otherIncome: 520, interest: 890, depreciation: 1420, profitBeforeTax: 11108, taxPct: 0.0, netProfit: 11108, eps: 1.26, dividendPayoutPct: 40.0 }
    ],
    balanceSheet: [
      { year: 'Dec 2024', equityCapital: 8.8, reserves: 71.5, borrowings: 14.5, otherLiabilities: 38.2, totalLiabilities: 133.0, fixedAssets: 38.5, cwip: 6.2, investments: 18.5, otherAssets: 69.8, totalAssets: 133.0 }
    ],
    cashFlow: [
      { year: 'Dec 2024', cashFromOperating: 12.8, cashFromInvesting: -3.8, cashFromFinancing: -7.5, netCashFlow: 1.5, freeCashFlow: 8.8 }
    ],
    historicalRatios: [
      { year: 'Dec 2024', rocePct: 18.5, roePct: 16.8, debtorDays: 28, inventoryDays: 165, daysPayable: 48, cashConversionCycle: 145, workingCapitalDays: 130 }
    ],
    shareholdingPattern: [
      { quarter: 'Jun 2026', promoter: 24.0, fii: 38.50, dii: 22.10, government: 0.0, public: 15.40, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'SALIK',
    symbol: 'SALIK',
    name: 'Salik Company PJSC',
    exchange: 'DFM',
    market: 'UAE',
    country: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED ',
    sector: 'Transportation & Toll Infrastructure',
    industry: 'Toll Operations & Smart Mobility',
    marketCapCategory: 'Mid',
    isConsolidated: true,
    about: 'Salik is Dubai’s exclusive toll gate operator, operating 100% automated toll collection gates across the emirate of Dubai with a 49-year concession agreement from the Roads and Transport Authority (RTA).',
    website: 'https://www.salik.ae',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 4.15,
    priceChangePct: 0.95,
    marketCap: 31.1,
    enterpriseValue: 34.2,
    pe: 26.5,
    forwardPe: 22.8,
    pb: 32.5,
    priceToSales: 14.8,
    evToEbitda: 21.4,
    evToEbit: 23.5,
    earningsYield: 3.77,
    dividendYield: 4.15,
    fcfYield: 3.95,
    pegRatio: 1.85,
    salesGrowth1Y: 12.4,
    salesGrowth3Y: 11.8,
    salesGrowth5Y: null,
    salesGrowth10Y: null,
    profitGrowth1Y: 14.8,
    profitGrowth3Y: 13.5,
    profitGrowth5Y: null,
    profitGrowth10Y: null,
    epsGrowth: 14.2,
    ebitdaGrowth: 13.8,
    qtrSalesGrowthYoY: 13.5,
    qtrProfitGrowthYoY: 15.2,
    roce: 85.2,
    roe: 115.0,
    roic: 92.0,
    roa: 38.5,
    opm: 65.8,
    npm: 52.4,
    grossMargin: 92.5,
    ebitdaMargin: 67.5,
    roce3YAvg: 82.0,
    roe3YAvg: 112.0,
    roce5YAvg: null,
    debtToEquity: 3.25,
    netDebt: 3.1,
    interestCoverage: 16.5,
    currentRatio: 1.45,
    quickRatio: 1.45,
    cfo: 1.45,
    freeCashFlow: 1.25,
    cashConversionCycle: 12,
    capex: 0.20,
    workingCapitalDays: 8,
    debtReduction3Y: 0.0,
    promoterHolding: 75.0, // Government of Dubai (Dubai Investment Fund)
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 12.40,
    diiHolding: 8.50,
    publicHolding: 4.10,
    high52W: 4.45,
    low52W: 3.12,
    priceTo52WHighPct: -6.7,
    priceReturn1M: 4.5,
    priceReturn1Y: 28.5,
    volume: 8500000,
    beta: 0.72,
    pros: [
      'Natural toll monopoly: Exclusive 49-year concession in the fastest-growing transit hub in MENA.',
      'Attractive 100% net profit dividend payout policy with current dividend yield of 4.15%.',
      'Astronomical capital return metrics: ROCE 85.2% and Net profit margin 52.4%.',
      'Two new toll gates activated in Business Bay and Al Safa South expanding total toll run rate.'
    ],
    cons: [
      'Concession fee liabilities payable to RTA on gate additions.',
      'Public transport shift subsidies or congestion road pricing regulation limits.'
    ],
    quarterlyResults: [
      { quarter: 'Jun 2026', sales: 585, expenses: 198, operatingProfit: 387, opmPct: 66.1, otherIncome: 12, interest: 28, depreciation: 24, profitBeforeTax: 347, taxPct: 9.0, netProfit: 316, eps: 0.042 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2024', sales: 2109, salesGrowthPct: 11.4, expenses: 720, operatingProfit: 1389, opmPct: 65.8, otherIncome: 35, interest: 98, depreciation: 85, profitBeforeTax: 1241, taxPct: 0.0, netProfit: 1241, eps: 0.165, dividendPayoutPct: 100.0 }
    ],
    balanceSheet: [
      { year: 'Dec 2024', equityCapital: 0.075, reserves: 0.95, borrowings: 3.95, otherLiabilities: 0.85, totalLiabilities: 5.825, fixedAssets: 3.8, cwip: 0.05, investments: 0.2, otherAssets: 1.775, totalAssets: 5.825 }
    ],
    cashFlow: [
      { year: 'Dec 2024', cashFromOperating: 1.45, cashFromInvesting: -0.2, cashFromFinancing: -1.2, netCashFlow: 0.05, freeCashFlow: 1.25 }
    ],
    historicalRatios: [
      { year: 'Dec 2024', rocePct: 85.2, roePct: 115.0, debtorDays: 14, inventoryDays: 0, daysPayable: 2, cashConversionCycle: 12, workingCapitalDays: 8 }
    ],
    shareholdingPattern: [
      { quarter: 'Jun 2026', promoter: 75.0, fii: 12.40, dii: 8.50, government: 0.0, public: 4.10, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'FAB',
    symbol: 'FAB',
    name: 'First Abu Dhabi Bank PJSC',
    exchange: 'ADX',
    market: 'UAE',
    country: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED ',
    sector: 'Financial Services & Banking',
    industry: 'Commercial, Retail & Sovereign Corporate Banking',
    marketCapCategory: 'Large',
    isConsolidated: true,
    about: 'First Abu Dhabi Bank (FAB) is the largest bank in the UAE and one of the largest and safest financial institutions in the Middle East, with total assets exceeding 1.2 Trillion AED.',
    website: 'https://www.bankfab.com',
    dataFreshness: 'Q4 FY26 (Dec 2025)',
    lastUpdated: '2026-10-23',
    currentPrice: 14.80,
    priceChangePct: 0.68,
    marketCap: 165,
    enterpriseValue: 182,
    pe: 9.8,
    forwardPe: 8.8,
    pb: 1.35,
    priceToSales: 5.2,
    evToEbitda: 8.2,
    evToEbit: 9.4,
    earningsYield: 10.2,
    dividendYield: 4.85,
    fcfYield: 5.15,
    pegRatio: 1.15,
    salesGrowth1Y: 14.2,
    salesGrowth3Y: 16.5,
    salesGrowth5Y: 12.8,
    salesGrowth10Y: 11.5,
    profitGrowth1Y: 18.5,
    profitGrowth3Y: 19.2,
    profitGrowth5Y: 14.5,
    profitGrowth10Y: 12.2,
    epsGrowth: 18.2,
    ebitdaGrowth: 17.5,
    qtrSalesGrowthYoY: 12.8,
    qtrProfitGrowthYoY: 15.4,
    roce: 16.5,
    roe: 15.8,
    roic: 15.2,
    roa: 1.55,
    opm: 52.4,
    npm: 44.2,
    grossMargin: 74.2,
    ebitdaMargin: 56.5,
    roce3YAvg: 15.8,
    roe3YAvg: 15.2,
    roce5YAvg: 14.5,
    debtToEquity: 1.85,
    netDebt: 18,
    interestCoverage: 8.5,
    currentRatio: 1.25,
    quickRatio: 1.25,
    cfo: 14.5,
    freeCashFlow: 8.5,
    cashConversionCycle: 0,
    capex: 1.2,
    workingCapitalDays: 0,
    debtReduction3Y: 0.0,
    promoterHolding: 52.40,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 24.50,
    diiHolding: 15.20,
    publicHolding: 7.90,
    high52W: 16.20,
    low52W: 12.40,
    priceTo52WHighPct: -8.6,
    priceReturn1M: 2.1,
    priceReturn1Y: 14.8,
    volume: 5400000,
    beta: 0.82,
    pros: [
      'Strong sovereign backing with majority ownership by Abu Dhabi government entities.',
      'Attractive 4.85% dividend yield supported by 50% net profit distribution policy.',
      'Lowest non-performing loan ratio (NPL < 3.2%) in the UAE banking sector.'
    ],
    cons: [
      'Net interest margin compression as regional central banks follow Fed rate cuts.',
      'Higher wholesale funding proportion compared to domestic retail peers.'
    ],
    quarterlyResults: [
      { quarter: 'Sep 2026', sales: 7850, expenses: 3720, operatingProfit: 4130, opmPct: 52.6, otherIncome: 180, interest: 450, depreciation: 180, profitBeforeTax: 3680, taxPct: 9.0, netProfit: 3348, eps: 0.30 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2025', sales: 30450, salesGrowthPct: 14.2, expenses: 14500, operatingProfit: 15950, opmPct: 52.4, otherIncome: 750, interest: 1650, depreciation: 680, profitBeforeTax: 14370, taxPct: 9.0, netProfit: 13076, eps: 1.18, dividendPayoutPct: 50.0 }
    ],
    balanceSheet: [
      { year: 'Dec 2025', equityCapital: 11.0, reserves: 105.0, borrowings: 198.0, otherLiabilities: 885.0, totalLiabilities: 1199.0, fixedAssets: 12.0, cwip: 0.5, investments: 285.0, otherAssets: 901.5, totalAssets: 1199.0 }
    ],
    cashFlow: [
      { year: 'Dec 2025', cashFromOperating: 14.5, cashFromInvesting: -2.5, cashFromFinancing: -8.5, netCashFlow: 3.5, freeCashFlow: 8.5 }
    ],
    historicalRatios: [
      { year: 'Dec 2025', rocePct: 16.5, roePct: 15.8, debtorDays: 0, inventoryDays: 0, daysPayable: 0, cashConversionCycle: 0, workingCapitalDays: 0 }
    ],
    shareholdingPattern: [
      { quarter: 'Sep 2026', promoter: 52.40, fii: 24.50, dii: 15.20, government: 0.0, public: 7.90, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'DEWA',
    symbol: 'DEWA',
    name: 'Dubai Electricity and Water Authority PJSC',
    exchange: 'DFM',
    market: 'UAE',
    country: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED ',
    sector: 'Utilities & Clean Energy',
    industry: 'Power Generation, Clean Solar Parks & Water Desalination',
    marketCapCategory: 'Large',
    isConsolidated: true,
    about: 'DEWA is the exclusive provider of electricity and potable water to Dubai’s 3.6 million residents, operating the Mohammed bin Rashid Al Maktoum Solar Park, the largest single-site solar park in the world.',
    website: 'https://www.dewa.gov.ae',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 2.45,
    priceChangePct: 0.41,
    marketCap: 122,
    enterpriseValue: 148,
    pe: 15.2,
    forwardPe: 13.8,
    pb: 1.48,
    priceToSales: 3.85,
    evToEbitda: 9.8,
    evToEbit: 12.4,
    earningsYield: 6.58,
    dividendYield: 5.12,
    fcfYield: 5.58,
    pegRatio: 1.85,
    salesGrowth1Y: 7.5,
    salesGrowth3Y: 11.2,
    salesGrowth5Y: 8.8,
    salesGrowth10Y: null,
    profitGrowth1Y: 6.2,
    profitGrowth3Y: 12.4,
    profitGrowth5Y: 9.5,
    profitGrowth10Y: null,
    epsGrowth: 6.5,
    ebitdaGrowth: 8.4,
    qtrSalesGrowthYoY: 6.2,
    qtrProfitGrowthYoY: 7.4,
    roce: 14.8,
    roe: 13.5,
    roic: 13.2,
    roa: 6.8,
    opm: 38.6,
    npm: 26.4,
    grossMargin: 48.2,
    ebitdaMargin: 42.5,
    roce3YAvg: 14.2,
    roe3YAvg: 13.0,
    roce5YAvg: null,
    debtToEquity: 0.65,
    netDebt: 26,
    interestCoverage: 12.4,
    currentRatio: 1.15,
    quickRatio: 0.95,
    cfo: 14.8,
    freeCashFlow: 6.8,
    cashConversionCycle: 24,
    capex: 8.0,
    workingCapitalDays: 18,
    debtReduction3Y: 5.0,
    promoterHolding: 82.00,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 9.50,
    diiHolding: 5.80,
    publicHolding: 2.70,
    high52W: 2.68,
    low52W: 2.22,
    priceTo52WHighPct: -8.6,
    priceReturn1M: 1.2,
    priceReturn1Y: 4.8,
    volume: 12400000,
    beta: 0.45,
    pros: [
      'Guaranteed sovereign minimum dividend commitment of 6.2 Billion AED per annum (5.12% yield).',
      'Exclusive monopoly utility operator for Dubai’s booming population and economy.',
      'Aggressive high-margin solar energy transition lowering long-term marginal cost of power.'
    ],
    cons: [
      'Substantial ongoing capital expenditures for seawater reverse osmosis plants.',
      'Utility tariff pricing regulated by the Dubai Supreme Council of Energy.'
    ],
    quarterlyResults: [
      { quarter: 'Jun 2026', sales: 9850, expenses: 6050, operatingProfit: 3800, opmPct: 38.6, otherIncome: 120, interest: 320, depreciation: 750, profitBeforeTax: 2850, taxPct: 9.0, netProfit: 2593, eps: 0.052 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2024', sales: 29200, salesGrowthPct: 7.2, expenses: 17950, operatingProfit: 11250, opmPct: 38.5, otherIncome: 350, interest: 1100, depreciation: 2800, profitBeforeTax: 7700, taxPct: 0.0, netProfit: 7700, eps: 0.154, dividendPayoutPct: 80.5 }
    ],
    balanceSheet: [
      { year: 'Dec 2024', equityCapital: 2.5, reserves: 85.0, borrowings: 32.0, otherLiabilities: 45.0, totalLiabilities: 164.5, fixedAssets: 115.0, cwip: 12.0, investments: 18.0, otherAssets: 19.5, totalAssets: 164.5 }
    ],
    cashFlow: [
      { year: 'Dec 2024', cashFromOperating: 14.8, cashFromInvesting: -8.5, cashFromFinancing: -5.8, netCashFlow: 0.5, freeCashFlow: 6.8 }
    ],
    historicalRatios: [
      { year: 'Dec 2024', rocePct: 14.8, roePct: 13.5, debtorDays: 45, inventoryDays: 18, daysPayable: 39, cashConversionCycle: 24, workingCapitalDays: 18 }
    ],
    shareholdingPattern: [
      { quarter: 'Jun 2026', promoter: 82.00, fii: 9.50, dii: 5.80, government: 0.0, public: 2.70, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'EAND',
    symbol: 'EAND',
    name: 'e& (Emirates Telecommunications Group)',
    exchange: 'ADX',
    market: 'UAE',
    country: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED ',
    sector: 'Telecommunications & Technology',
    industry: '5G Infrastructure, Enterprise Cloud & Digital Platforms',
    marketCapCategory: 'Large',
    isConsolidated: true,
    about: 'e& (formerly Etisalat) is the premier global telecommunications and tech conglomerate of the UAE, operating across 16 countries in the Middle East, Asia, and Europe.',
    website: 'https://www.eand.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 17.60,
    priceChangePct: 0.85,
    marketCap: 154,
    enterpriseValue: 188,
    pe: 14.5,
    forwardPe: 13.2,
    pb: 2.85,
    priceToSales: 2.75,
    evToEbitda: 7.2,
    evToEbit: 10.4,
    earningsYield: 6.90,
    dividendYield: 4.55,
    fcfYield: 4.68,
    pegRatio: 1.65,
    salesGrowth1Y: 6.8,
    salesGrowth3Y: 7.5,
    salesGrowth5Y: 5.8,
    salesGrowth10Y: 4.8,
    profitGrowth1Y: 8.4,
    profitGrowth3Y: 9.5,
    profitGrowth5Y: 7.2,
    profitGrowth10Y: 6.5,
    epsGrowth: 8.2,
    ebitdaGrowth: 7.4,
    qtrSalesGrowthYoY: 5.8,
    qtrProfitGrowthYoY: 7.8,
    roce: 19.5,
    roe: 22.4,
    roic: 18.2,
    roa: 7.8,
    opm: 32.4,
    npm: 21.8,
    grossMargin: 64.2,
    ebitdaMargin: 48.5,
    roce3YAvg: 18.8,
    roe3YAvg: 21.5,
    roce5YAvg: 19.2,
    debtToEquity: 0.85,
    netDebt: 34,
    interestCoverage: 11.2,
    currentRatio: 1.05,
    quickRatio: 0.85,
    cfo: 18.5,
    freeCashFlow: 7.2,
    cashConversionCycle: -8,
    capex: 11.3,
    workingCapitalDays: -6,
    debtReduction3Y: 2.0,
    promoterHolding: 60.00,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 18.50,
    diiHolding: 12.50,
    publicHolding: 9.00,
    high52W: 20.40,
    low52W: 15.80,
    priceTo52WHighPct: -13.7,
    priceReturn1M: 3.2,
    priceReturn1Y: 6.5,
    volume: 3800000,
    beta: 0.65,
    pros: [
      'Uncontested 5G mobile and fiber-to-the-home broadband market share across the UAE.',
      'Dependable 4.55% dividend payout backed by defensive recurring consumer subscriptions.',
      'Significant strategic minority stake in global telecom titan Vodafone Group.'
    ],
    cons: [
      'Intensifying competition from du in enterprise government digital contracts.',
      'Foreign currency translation volatility from overseas operations in Egypt and Pakistan.'
    ],
    quarterlyResults: [
      { quarter: 'Jun 2026', sales: 14400, expenses: 9750, operatingProfit: 4650, opmPct: 32.3, otherIncome: 180, interest: 480, depreciation: 1450, profitBeforeTax: 2900, taxPct: 9.0, netProfit: 2639, eps: 0.30 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2024', sales: 53800, salesGrowthPct: 2.5, expenses: 36400, operatingProfit: 17400, opmPct: 32.3, otherIncome: 650, interest: 1750, depreciation: 5200, profitBeforeTax: 11100, taxPct: 0.0, netProfit: 10300, eps: 1.18, dividendPayoutPct: 68.0 }
    ],
    balanceSheet: [
      { year: 'Dec 2024', equityCapital: 8.7, reserves: 48.0, borrowings: 48.0, otherLiabilities: 38.0, totalLiabilities: 142.7, fixedAssets: 62.0, cwip: 6.5, investments: 42.0, otherAssets: 32.2, totalAssets: 142.7 }
    ],
    cashFlow: [
      { year: 'Dec 2024', cashFromOperating: 18.5, cashFromInvesting: -12.0, cashFromFinancing: -7.5, netCashFlow: -1.0, freeCashFlow: 7.2 }
    ],
    historicalRatios: [
      { year: 'Dec 2024', rocePct: 19.5, roePct: 22.4, debtorDays: 52, inventoryDays: 6, daysPayable: 66, cashConversionCycle: -8, workingCapitalDays: -6 }
    ],
    shareholdingPattern: [
      { quarter: 'Jun 2026', promoter: 60.00, fii: 18.50, dii: 12.50, government: 0.0, public: 9.00, pledgedPct: 0.0 }
    ]
  },
  {
    id: 'ALDAR',
    symbol: 'ALDAR',
    name: 'Aldar Properties PJSC',
    exchange: 'ADX',
    market: 'UAE',
    country: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED ',
    sector: 'Commercial & Waterfront Assets',
    industry: 'Master Planning, Waterfront Real Estate & Hospitality',
    marketCapCategory: 'Mid',
    isConsolidated: true,
    about: 'Aldar Properties is the leading real estate master developer and manager in Abu Dhabi, developing world-class waterfront communities on Yas Island, Saadiyat Island, and Al Reem Island.',
    website: 'https://www.aldar.com',
    dataFreshness: 'Q2 FY27 (Sep 2026)',
    lastUpdated: '2026-10-23',
    currentPrice: 7.35,
    priceChangePct: 1.25,
    marketCap: 58,
    enterpriseValue: 68,
    pe: 13.2,
    forwardPe: 11.5,
    pb: 1.65,
    priceToSales: 3.45,
    evToEbitda: 11.5,
    evToEbit: 13.2,
    earningsYield: 7.58,
    dividendYield: 3.25,
    fcfYield: 6.55,
    pegRatio: 0.85,
    salesGrowth1Y: 24.2,
    salesGrowth3Y: 22.5,
    salesGrowth5Y: 18.2,
    salesGrowth10Y: 12.5,
    profitGrowth1Y: 38.5,
    profitGrowth3Y: 28.5,
    profitGrowth5Y: 21.2,
    profitGrowth10Y: 14.2,
    epsGrowth: 36.5,
    ebitdaGrowth: 34.2,
    qtrSalesGrowthYoY: 28.5,
    qtrProfitGrowthYoY: 42.5,
    roce: 15.6,
    roe: 16.8,
    roic: 14.5,
    roa: 7.5,
    opm: 34.5,
    npm: 28.4,
    grossMargin: 46.5,
    ebitdaMargin: 38.2,
    roce3YAvg: 14.2,
    roe3YAvg: 15.0,
    roce5YAvg: 13.5,
    debtToEquity: 0.38,
    netDebt: 10,
    interestCoverage: 15.4,
    currentRatio: 1.65,
    quickRatio: 1.25,
    cfo: 5.8,
    freeCashFlow: 3.8,
    cashConversionCycle: 42,
    capex: 2.0,
    workingCapitalDays: 32,
    debtReduction3Y: 8.0,
    promoterHolding: 51.50,
    promoterHoldingChange3Y: 0.0,
    pledgedPct: 0.0,
    fiiHolding: 28.50,
    diiHolding: 12.50,
    publicHolding: 7.50,
    high52W: 8.10,
    low52W: 5.20,
    priceTo52WHighPct: -9.2,
    priceReturn1M: 5.2,
    priceReturn1Y: 38.5,
    volume: 8200000,
    beta: 0.95,
    pros: [
      'Record development sales backlog surpassing 38 Billion AED with international buyer share exceeding 60%.',
      'Preferred master developer status with sovereign land pipeline allocations across Abu Dhabi.',
      'Rapidly compounding recurring revenue from Grade-A commercial offices and Yas Mall retail.'
    ],
    cons: [
      'Construction raw material and subcontractor cost inflation.',
      'Macroeconomic interest rate sensitivity for mortgage home buyers.'
    ],
    quarterlyResults: [
      { quarter: 'Jun 2026', sales: 4850, expenses: 3180, operatingProfit: 1670, opmPct: 34.4, otherIncome: 120, interest: 140, depreciation: 210, profitBeforeTax: 1440, taxPct: 9.0, netProfit: 1310, eps: 0.165 }
    ],
    annualProfitLoss: [
      { year: 'Dec 2024', sales: 14160, salesGrowthPct: 26.5, expenses: 9350, operatingProfit: 4810, opmPct: 34.0, otherIncome: 350, interest: 480, depreciation: 720, profitBeforeTax: 3960, taxPct: 0.0, netProfit: 3960, eps: 0.504, dividendPayoutPct: 35.0 }
    ],
    balanceSheet: [
      { year: 'Dec 2024', equityCapital: 7.9, reserves: 27.5, borrowings: 14.5, otherLiabilities: 21.0, totalLiabilities: 70.9, fixedAssets: 28.5, cwip: 3.2, investments: 12.0, otherAssets: 27.2, totalAssets: 70.9 }
    ],
    cashFlow: [
      { year: 'Dec 2024', cashFromOperating: 5.8, cashFromInvesting: -2.8, cashFromFinancing: -2.2, netCashFlow: 0.8, freeCashFlow: 3.8 }
    ],
    historicalRatios: [
      { year: 'Dec 2024', rocePct: 15.6, roePct: 16.8, debtorDays: 48, inventoryDays: 58, daysPayable: 64, cashConversionCycle: 42, workingCapitalDays: 32 }
    ],
    shareholdingPattern: [
      { quarter: 'Jun 2026', promoter: 51.50, fii: 28.50, dii: 12.50, government: 0.0, public: 7.50, pledgedPct: 0.0 }
    ]
  },
];

let cachedIndiaUniverse: CompanyFundamental[] | null = null;

function enrichCuratedIndianCompany(comp: CompanyFundamental): CompanyFundamental {
  if (comp.market !== 'INDIA') return comp;
  const sym = comp.symbol.toUpperCase();
  const f = INDIA_FUNDAMENTALS_MAP?.[sym];
  const vQuote = VERIFIED_PRICES_MAP?.[sym];

  const currentPrice = vQuote && vQuote.price > 0 ? vQuote.price : (f?.currentPrice || comp.currentPrice);
  const prevClose = vQuote && vQuote.prev > 0 ? vQuote.prev : currentPrice;
  const priceChangePct = prevClose > 0 && currentPrice !== prevClose
    ? Math.round(((currentPrice - prevClose) / prevClose) * 10000) / 100
    : comp.priceChangePct;

  if (!f) {
    return {
      ...comp,
      currentPrice,
      priceChangePct,
    };
  }

  return {
    ...comp,
    currentPrice,
    priceChangePct,
    marketCap: (f.marketCap && f.marketCap > 0) ? f.marketCap : comp.marketCap,
    pe: f.pe ?? comp.pe,
    pb: f.pb ?? comp.pb,
    roce: f.roce ?? comp.roce,
    roe: f.roe ?? comp.roe,
    roa: f.roa ?? comp.roa,
    opm: f.opm ?? comp.opm,
    npm: f.npm ?? comp.npm,
    debtToEquity: f.debtToEquity ?? comp.debtToEquity,
    dividendYield: f.dividendYield ?? comp.dividendYield,
    salesGrowth1Y: f.salesGrowth1Y ?? comp.salesGrowth1Y,
    salesGrowth3Y: f.salesGrowth3Y ?? comp.salesGrowth3Y,
    salesGrowth5Y: f.salesGrowth5Y ?? comp.salesGrowth5Y,
    salesGrowth10Y: f.salesGrowth10Y ?? comp.salesGrowth10Y,
    profitGrowth1Y: f.profitGrowth1Y ?? comp.profitGrowth1Y,
    profitGrowth3Y: f.profitGrowth3Y ?? comp.profitGrowth3Y,
    profitGrowth5Y: f.profitGrowth5Y ?? comp.profitGrowth5Y,
    profitGrowth10Y: f.profitGrowth10Y ?? comp.profitGrowth10Y,
    promoterHolding: f.promoterHolding ?? comp.promoterHolding,
    fiiHolding: f.fiiHolding ?? comp.fiiHolding,
    diiHolding: f.diiHolding ?? comp.diiHolding,
    publicHolding: f.publicHolding ?? comp.publicHolding,
  };
}

/** Build or retrieve cached comprehensive universe of Indian equities (3,800+ Zerodha Kite stocks) */
export function buildIndiaUniverse(): CompanyFundamental[] {
  if (cachedIndiaUniverse) return cachedIndiaUniverse;

  const curatedIndia = MASTER_COMPANIES.filter((c) => c.market === 'INDIA').map(enrichCuratedIndianCompany);
  const curatedSymbolSet = new Set(curatedIndia.map((c) => c.symbol.toUpperCase()));

  const zerodhaList = getZerodhaCatalog();
  const additional: CompanyFundamental[] = [];

  for (const item of zerodhaList) {
    const sym = item.symbol.toUpperCase();
    if (curatedSymbolSet.has(sym)) continue;
    // Exclude indices and volatility gauges from equity screener
    if (item.sector && (item.sector.includes('Index') || item.sector.includes('Volatility'))) continue;

    // Filter out ETFs, Index funds, Gold/Silver BeES, and INAV series from common equity screener
    const isEtf = 
      /(\b(ETF|INAV|FOF)\b|BEES$|BEES\b|GOLD\b|SILVER\b|NIFTY\s*50\s*ETF|LIQUID\b|INDEX\s*FUND|EXCHANGE\s*TRADED)/i.test(item.name || '') ||
      /(BEES|ETF|INAV)$/i.test(sym) ||
      sym.startsWith('NETF');
    if (isEtf) continue;

    // Filter out non-equity debt instruments, bonds, SGBs, illiquid series
    if (/^[0-9]/.test(sym)) continue; // Starts with digit (e.g. 903SFL28-YI, 865IRFC29-NA, 10IIFL28A-NE)
    if (/-(BE|BZ|ST|SM|SF|SG|YI|YL|E1|NA|NB|NC|ND|NE|NF|NG|NH|NI|RR|IV|SZ)$/.test(sym)) continue; // Bond / debt series
    if (!item.name || item.name.trim() === '') continue;
    if (/\b(BOND|DEBENTURE|SGB|G-SEC|GSEC|GOVT|GILT|TREASURY|SDL|SOVEREIGN)\b/i.test(item.name || '') || /^(GSEC|GS\d|TBILL|SGB)/i.test(sym) || /GSEC/i.test(sym)) continue;

    additional.push(generateFundamentalFromZerodha(item));
  }

  cachedIndiaUniverse = [...curatedIndia, ...additional];
  return cachedIndiaUniverse;
}

/** Fetch all companies for a given market region */
export function getCompaniesByMarket(market: 'INDIA' | 'USA' | 'UAE'): CompanyFundamental[] {
  if (market === 'INDIA') {
    return buildIndiaUniverse();
  }
  if (market === 'USA') {
    return US_INDEX_UNIVERSE;
  }
  return MASTER_COMPANIES.filter((c) => c.market === market);
}

/** Fetch all companies across all markets (India, USA, UAE) */
export function getAllCompanies(): CompanyFundamental[] {
  return [
    ...getCompaniesByMarket('INDIA'),
    ...getCompaniesByMarket('USA'),
    ...getCompaniesByMarket('UAE'),
  ];
}

/** Find company by symbol */
export function getCompanyBySymbol(symbol: string): CompanyFundamental | undefined {
  if (!symbol) return undefined;
  const clean = symbol.trim().toUpperCase().replace(/\.NS$/, '').replace(/\.BO$/, '');

  // 1. Check curated master companies (Reliance, TCS, HDFC, Infosys, Apple, Microsoft, etc.)
  const existing = MASTER_COMPANIES.find(
    (c) => c.symbol.toUpperCase() === clean || c.id.toUpperCase() === clean
  );
  if (existing) return enrichCuratedIndianCompany(existing);

  // 2. Check US 3-index universe if symbol matches
  const fromUs = US_INDEX_UNIVERSE.find(
    (c) => c.symbol.toUpperCase() === clean || c.id.toUpperCase() === clean
  );
  if (fromUs) return fromUs;

  // 3. Check cached India universe if initialized
  if (cachedIndiaUniverse) {
    const fromUniv = cachedIndiaUniverse.find(
      (c) => c.symbol.toUpperCase() === clean || c.id.toUpperCase() === clean
    );
    if (fromUniv) return fromUniv;
  }

  // 4. Resolve dynamically from full Zerodha Kite catalog (3,800+ stocks)
  const zerodhaStock = findZerodhaStockBySymbol(clean);
  if (zerodhaStock) {
    return generateFundamentalFromZerodha(zerodhaStock);
  }

  return undefined;
}

/** Get all sectors in a market */
export function getSectors(market: 'INDIA' | 'USA' | 'UAE'): string[] {
  const comps = getCompaniesByMarket(market);
  return Array.from(new Set(comps.map((c) => c.sector))).sort();
}

/** Get all industries in a sector */
export function getIndustries(market: 'INDIA' | 'USA' | 'UAE', sector?: string): string[] {
  const comps = getCompaniesByMarket(market).filter((c) => !sector || c.sector === sector);
  return Array.from(new Set(comps.map((c) => c.industry))).sort();
}
