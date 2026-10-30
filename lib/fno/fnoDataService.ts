// ─── F&O Market Data & Analytics Service ────────────────────────────────────
// Real-time Option Chain, Term Structure, Buildup Scanner & Greeks Aggregator.

import {
  FnoInstrument,
  OptionChainData,
  OptionChainStrikeRow,
  OptionContract,
  FutureContract,
  FuturesTermStructure,
  BuildupRecord,
  BuildupType,
  MarketRegimeType,
} from './fnoTypes';
import { calculateBSPrice, calculateBSGreeks } from './blackScholes';
import { MarketType } from '@/lib/types';
import {
  searchZerodhaStocks,
  findZerodhaStockBySymbol,
  ZerodhaStockItem,
  KNOWN_ZERODHA_PRICES,
} from '@/lib/screener/zerodhaStocks';

export const SUPPORTED_FNO_INSTRUMENTS: FnoInstrument[] = [
  // ── Indian Indices ──
  {
    symbol: 'NIFTY 50',
    name: 'NIFTY 50 Index',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 65,
    tickSize: 0.05,
    strikeStep: 50,
    spotPrice: 22687.65,
    change: -201.25,
    changePct: -0.88,
    sector: 'Broad Market Index',
    expiries: ['29 OCT 2026', '05 NOV 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'BANKNIFTY',
    name: 'NIFTY Bank Index',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 30,
    tickSize: 0.05,
    strikeStep: 100,
    spotPrice: 54925.70,
    change: -562.40,
    changePct: -1.01,
    sector: 'Banking Index',
    expiries: ['29 OCT 2026', '05 NOV 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'FINNIFTY',
    name: 'NIFTY Financial Services',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 65,
    tickSize: 0.05,
    strikeStep: 50,
    spotPrice: 24657.70,
    change: -188.50,
    changePct: -0.76,
    sector: 'Financial Index',
    expiries: ['27 OCT 2026', '03 NOV 2026', '24 NOV 2026', '29 DEC 2026'],
    currentExpiry: '27 OCT 2026',
  },
  {
    symbol: 'MIDCPNIFTY',
    name: 'NIFTY Midcap Select',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 120,
    tickSize: 0.05,
    strikeStep: 25,
    spotPrice: 12808.30,
    change: -42.10,
    changePct: -0.33,
    sector: 'Midcap Index',
    expiries: ['26 OCT 2026', '02 NOV 2026', '23 NOV 2026', '28 DEC 2026'],
    currentExpiry: '26 OCT 2026',
  },
  {
    symbol: 'SENSEX',
    name: 'BSE SENSEX Index',
    exchange: 'BSE',
    market: 'INDIA',
    lotSize: 20,
    tickSize: 0.05,
    strikeStep: 100,
    spotPrice: 73249.39,
    change: -870.61,
    changePct: -1.17,
    sector: 'Broad Market Index',
    expiries: ['30 OCT 2026', '06 NOV 2026', '27 NOV 2026', '25 DEC 2026'],
    currentExpiry: '30 OCT 2026',
  },
  {
    symbol: 'BANKEX',
    name: 'BSE BANKEX Index',
    exchange: 'BSE',
    market: 'INDIA',
    lotSize: 30,
    tickSize: 0.05,
    strikeStep: 100,
    spotPrice: 62150.00,
    change: 110.20,
    changePct: 0.18,
    sector: 'Banking Index',
    expiries: ['30 OCT 2026', '06 NOV 2026', '27 NOV 2026', '25 DEC 2026'],
    currentExpiry: '30 OCT 2026',
  },

  // ── Indian Heavyweight F&O Equities ──
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 250,
    tickSize: 0.05,
    strikeStep: 20,
    spotPrice: 1184.50,
    change: -19.50,
    changePct: -1.62,
    sector: 'Oil & Gas / Energy',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 550,
    tickSize: 0.05,
    strikeStep: 10,
    spotPrice: 694.05,
    change: -12.90,
    changePct: -1.82,
    sector: 'Banking - Private',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 175,
    tickSize: 0.05,
    strikeStep: 20,
    spotPrice: 2506.90,
    change: 22.40,
    changePct: 0.90,
    sector: 'Information Technology',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 400,
    tickSize: 0.05,
    strikeStep: 20,
    spotPrice: 1153.35,
    change: -15.80,
    changePct: -1.35,
    sector: 'Information Technology',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 700,
    tickSize: 0.05,
    strikeStep: 10,
    spotPrice: 1398.50,
    change: 14.20,
    changePct: 1.03,
    sector: 'Banking - Private',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 750,
    tickSize: 0.05,
    strikeStep: 5,
    spotPrice: 970.00,
    change: 8.50,
    changePct: 0.88,
    sector: 'Banking - PSU',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 1425,
    tickSize: 0.05,
    strikeStep: 5,
    spotPrice: 270.00,
    change: -4.80,
    changePct: -1.75,
    sector: 'Automobile',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 475,
    tickSize: 0.05,
    strikeStep: 10,
    spotPrice: 1895.00,
    change: 12.20,
    changePct: 0.65,
    sector: 'Telecommunication',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'AXISBANK',
    name: 'Axis Bank Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 625,
    tickSize: 0.05,
    strikeStep: 10,
    spotPrice: 1184.50,
    change: 14.20,
    changePct: 1.21,
    sector: 'Banking - Private',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 400,
    tickSize: 0.05,
    strikeStep: 10,
    spotPrice: 1780.20,
    change: 8.40,
    changePct: 0.47,
    sector: 'Banking - Private',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 175,
    tickSize: 0.05,
    strikeStep: 20,
    spotPrice: 3638.30,
    change: 28.50,
    changePct: 0.79,
    sector: 'Infrastructure & Capital Goods',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 125,
    tickSize: 0.05,
    strikeStep: 50,
    spotPrice: 7120.40,
    change: -32.20,
    changePct: -0.45,
    sector: 'Financial Services - NBFC',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'TITAN',
    name: 'Titan Company Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 175,
    tickSize: 0.05,
    strikeStep: 20,
    spotPrice: 3480.00,
    change: 72.00,
    changePct: 2.10,
    sector: 'Consumer & Jewelry',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'ZOMATO',
    name: 'Zomato Ltd (Eternal)',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 2200,
    tickSize: 0.05,
    strikeStep: 5,
    spotPrice: 268.40,
    change: 5.65,
    changePct: 2.15,
    sector: 'Consumer Internet / Quick Commerce',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'TATASTEEL',
    name: 'Tata Steel Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 5500,
    tickSize: 0.05,
    strikeStep: 2.5,
    spotPrice: 154.20,
    change: 1.30,
    changePct: 0.85,
    sector: 'Metals & Mining',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'ADANIENT',
    name: 'Adani Enterprises Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 300,
    tickSize: 0.05,
    strikeStep: 50,
    spotPrice: 2980.50,
    change: -19.50,
    changePct: -0.65,
    sector: 'Diversified Conglomerate',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'BEL',
    name: 'Bharat Electronics Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 1900,
    tickSize: 0.05,
    strikeStep: 5,
    spotPrice: 295.40,
    change: 5.20,
    changePct: 1.80,
    sector: 'Aerospace & Defense',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'HAL',
    name: 'Hindustan Aeronautics Ltd',
    exchange: 'NSE',
    market: 'INDIA',
    lotSize: 150,
    tickSize: 0.05,
    strikeStep: 50,
    spotPrice: 4420.00,
    change: 41.50,
    changePct: 0.95,
    sector: 'Aerospace & Defense',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },

  // ── Global & US Derivatives ──
  {
    symbol: 'SPX',
    name: 'S&P 500 Index',
    exchange: 'CBOE',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.1,
    strikeStep: 25,
    spotPrice: 7650.00,
    change: -103.80,
    changePct: -1.34,
    sector: 'US Broad Market',
    expiries: ['29 OCT 2026', '05 NOV 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'NDX',
    name: 'Nasdaq 100 Index',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.25,
    strikeStep: 50,
    spotPrice: 20520.40,
    change: 238.10,
    changePct: 1.17,
    sector: 'US Technology',
    expiries: ['29 OCT 2026', '05 NOV 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.01,
    strikeStep: 5,
    spotPrice: 142.50,
    change: 3.10,
    changePct: 2.22,
    sector: 'Semiconductors',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.01,
    strikeStep: 5,
    spotPrice: 232.80,
    change: -1.20,
    changePct: -0.51,
    sector: 'Consumer Electronics',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.01,
    strikeStep: 5,
    spotPrice: 428.50,
    change: 4.85,
    changePct: 1.15,
    sector: 'Enterprise Software & Cloud',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.01,
    strikeStep: 5,
    spotPrice: 260.40,
    change: 8.70,
    changePct: 3.45,
    sector: 'Automotive & AI',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.01,
    strikeStep: 2.5,
    spotPrice: 188.60,
    change: 1.60,
    changePct: 0.85,
    sector: 'E-Commerce & Cloud Computing',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.01,
    strikeStep: 2.5,
    spotPrice: 166.20,
    change: -2.10,
    changePct: -1.25,
    sector: 'Search & Digital Media',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.01,
    strikeStep: 5,
    spotPrice: 595.00,
    change: 10.50,
    changePct: 1.80,
    sector: 'Social Media & AI',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.01,
    strikeStep: 2.5,
    spotPrice: 156.30,
    change: -2.95,
    changePct: -1.85,
    sector: 'Semiconductors',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'NFLX',
    name: 'Netflix Inc',
    exchange: 'NASDAQ',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.05,
    strikeStep: 10,
    spotPrice: 755.20,
    change: 4.90,
    changePct: 0.65,
    sector: 'Digital Entertainment',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co',
    exchange: 'NYSE',
    market: 'USA',
    lotSize: 100,
    tickSize: 0.01,
    strikeStep: 2.5,
    spotPrice: 222.40,
    change: -0.90,
    changePct: -0.40,
    sector: 'Investment Banking & Finance',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },

  // ── UAE & Middle East Derivatives ──
  {
    symbol: 'DFMGI',
    name: 'DFM General Index',
    exchange: 'DFM',
    market: 'UAE',
    lotSize: 50,
    tickSize: 0.1,
    strikeStep: 25,
    spotPrice: 4485.30,
    change: 18.90,
    changePct: 0.42,
    sector: 'UAE Broad Market',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'EMAAR',
    name: 'Emaar Properties PJSC',
    exchange: 'DFM',
    market: 'UAE',
    lotSize: 500,
    tickSize: 0.01,
    strikeStep: 0.1,
    spotPrice: 8.75,
    change: 0.12,
    changePct: 1.39,
    sector: 'Real Estate',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'FAB',
    name: 'First Abu Dhabi Bank PJSC',
    exchange: 'ADX',
    market: 'UAE',
    lotSize: 200,
    tickSize: 0.02,
    strikeStep: 0.2,
    spotPrice: 13.40,
    change: -0.10,
    changePct: -0.74,
    sector: 'Banking - UAE',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'DEWA',
    name: 'Dubai Electricity & Water Authority',
    exchange: 'DFM',
    market: 'UAE',
    lotSize: 1000,
    tickSize: 0.01,
    strikeStep: 0.05,
    spotPrice: 2.48,
    change: 0.01,
    changePct: 0.40,
    sector: 'Utilities & Infrastructure',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'ALDAR',
    name: 'Aldar Properties PJSC',
    exchange: 'ADX',
    market: 'UAE',
    lotSize: 500,
    tickSize: 0.01,
    strikeStep: 0.1,
    spotPrice: 6.85,
    change: 0.11,
    changePct: 1.63,
    sector: 'Real Estate & Development',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'AIRARABIA',
    name: 'Air Arabia PJSC',
    exchange: 'DFM',
    market: 'UAE',
    lotSize: 1000,
    tickSize: 0.01,
    strikeStep: 0.05,
    spotPrice: 2.92,
    change: -0.02,
    changePct: -0.68,
    sector: 'Aviation & Travel',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'ETISALAT',
    name: 'e& Emirates Telecommunications',
    exchange: 'ADX',
    market: 'UAE',
    lotSize: 200,
    tickSize: 0.02,
    strikeStep: 0.25,
    spotPrice: 18.20,
    change: 0.10,
    changePct: 0.55,
    sector: 'Telecommunications & Tech',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
  {
    symbol: 'EMIRATESNBD',
    name: 'Emirates NBD Bank PJSC',
    exchange: 'DFM',
    market: 'UAE',
    lotSize: 200,
    tickSize: 0.02,
    strikeStep: 0.25,
    spotPrice: 19.50,
    change: -0.20,
    changePct: -1.02,
    sector: 'Banking & Financials',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
  },
];

/** Top Indian equity prices for realistic Zerodha Kite integration */
export { KNOWN_ZERODHA_PRICES } from '@/lib/screener/zerodhaStocks';

/** Calculates standard NSE strike intervals based on price tier */
export function calculateRealisticStrikeStep(spot: number): number {
  if (spot >= 25000) return 500;
  if (spot >= 10000) return 200;
  if (spot >= 5000) return 100;
  if (spot >= 2500) return 50;
  if (spot >= 1000) return 20;
  if (spot >= 500) return 10;
  if (spot >= 200) return 5;
  if (spot >= 100) return 2.5;
  if (spot >= 50) return 1;
  return 0.5;
}

/** Calculates standard NSE lot sizes aiming for ₹7.5 Lakhs contract value */
export function calculateRealisticLotSize(spot: number): number {
  const targetContractValue = 750000;
  if (spot <= 0) return 100;
  const rawLot = targetContractValue / spot;
  if (rawLot >= 5000) return Math.min(10000, Math.round(rawLot / 500) * 500);
  if (rawLot >= 2000) return Math.round(rawLot / 250) * 250;
  if (rawLot >= 1000) return Math.round(rawLot / 100) * 100;
  if (rawLot >= 500) return Math.round(rawLot / 50) * 50;
  if (rawLot >= 200) return Math.round(rawLot / 25) * 25;
  if (rawLot >= 100) return Math.round(rawLot / 25) * 25;
  if (rawLot >= 50) return Math.round(rawLot / 10) * 10;
  return Math.max(5, Math.round(rawLot / 5) * 5);
}

function getDeterministicSpotPrice(item: ZerodhaStockItem): number {
  if (item.lastPrice && item.lastPrice > 0) return item.lastPrice;
  const sym = item.symbol.toUpperCase();
  if (KNOWN_ZERODHA_PRICES[sym]) return KNOWN_ZERODHA_PRICES[sym];

  let hash = 0;
  const str = `${item.symbol}-${item.token || 1000}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const tiers = [
    { min: 45, max: 280 },
    { min: 280, max: 950 },
    { min: 950, max: 2400 },
    { min: 2400, max: 4800 },
  ];
  const tier = tiers[abs % tiers.length];
  const price = tier.min + (abs % (tier.max - tier.min)) + ((abs % 90) + 10) / 100;
  return Math.round(price * 100) / 100;
}

function getDeterministicDailyChange(
  item: ZerodhaStockItem,
  spot: number
): { change: number; changePct: number } {
  let hash = 0;
  const str = `change-${item.symbol}-${item.token || 500}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  const pct = Math.round((((abs % 700) - 330) / 100) * 100) / 100;
  const change = Math.round(spot * (pct / 100) * 100) / 100;
  return { change, changePct: pct };
}

/** Convert a Zerodha catalog stock into an institutional FnoInstrument */
export function convertZerodhaToFnoInstrument(
  item: ZerodhaStockItem,
  livePrice?: number
): FnoInstrument {
  const spot = livePrice && livePrice > 0 ? livePrice : getDeterministicSpotPrice(item);
  const strikeStep = calculateRealisticStrikeStep(spot);
  const lotSize = calculateRealisticLotSize(spot);
  const { change, changePct } = getDeterministicDailyChange(item, spot);

  return {
    symbol: item.symbol.toUpperCase(),
    name: item.name || item.symbol,
    exchange: item.exchange || 'NSE',
    market: 'INDIA',
    lotSize,
    tickSize: 0.05,
    strikeStep,
    spotPrice: spot,
    change,
    changePct,
    sector: item.sector || 'Indian Equity',
    expiries: ['29 OCT 2026', '26 NOV 2026', '31 DEC 2026'],
    currentExpiry: '29 OCT 2026',
    isZerodha: true,
    token: item.token,
  };
}

/** Lookup an instrument by symbol across curated list and 3,800+ Zerodha Kite catalog */
export function findFnoInstrument(symbol: string): FnoInstrument {
  if (!symbol) return SUPPORTED_FNO_INSTRUMENTS[0];
  const norm = symbol.trim().toUpperCase();

  // 1. Direct match in curated instruments
  const exact = SUPPORTED_FNO_INSTRUMENTS.find((i) => i.symbol.toUpperCase() === norm);
  if (exact) return exact;

  // 2. Direct Zerodha catalog lookup (prevents partial match collision where LTIM/LTTS matched LT)
  const zItem = findZerodhaStockBySymbol(norm);
  if (zItem) {
    return convertZerodhaToFnoInstrument(zItem);
  }

  // 3. Partial match in curated instruments
  const partial = SUPPORTED_FNO_INSTRUMENTS.find(
    (i) =>
      i.name.toUpperCase().includes(norm) ||
      (i.symbol.length >= 4 && norm.includes(i.symbol.toUpperCase()))
  );
  if (partial) return partial;

  return SUPPORTED_FNO_INSTRUMENTS[0]; // fallback to NIFTY 50
}

/**
 * Searches instruments scoped to active market.
 * For INDIA, seamlessly aggregates curated derivatives with 3,800+ Zerodha Kite NSE stocks.
 */
export function searchFnoInstruments(
  query: string,
  market: MarketType,
  limit: number = 50
): FnoInstrument[] {
  const q = (query || '').trim().toUpperCase();

  // Non-Indian markets: strictly return assets from that market
  if (market !== 'INDIA') {
    const marketList = SUPPORTED_FNO_INSTRUMENTS.filter((i) => i.market === market);
    if (!q) return marketList;
    return marketList.filter(
      (i) =>
        i.symbol.toUpperCase().includes(q) ||
        i.name.toUpperCase().includes(q) ||
        i.sector.toUpperCase().includes(q)
    );
  }

  // INDIA Market:
  const curatedIndia = SUPPORTED_FNO_INSTRUMENTS.filter((i) => i.market === 'INDIA');
  const seenSymbols = new Set<string>();
  const results: FnoInstrument[] = [];

  // Match against curated list first
  const curatedMatches = q
    ? curatedIndia.filter(
        (i) =>
          i.symbol.toUpperCase().includes(q) ||
          i.name.toUpperCase().includes(q) ||
          i.sector.toUpperCase().includes(q)
      )
    : curatedIndia;

  for (const inst of curatedMatches) {
    seenSymbols.add(inst.symbol.toUpperCase());
    results.push(inst);
    if (results.length >= limit) return results;
  }

  // Aggregate with 3,800+ Zerodha Kite stocks
  const zerodhaMatches = searchZerodhaStocks(query, limit);
  for (const zItem of zerodhaMatches) {
    const sym = zItem.symbol.toUpperCase();
    if (!seenSymbols.has(sym)) {
      seenSymbols.add(sym);
      results.push(convertZerodhaToFnoInstrument(zItem));
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Resolves the primary weekly and monthly expiries for an instrument
 */
export function getWeeklyAndMonthlyExpiries(expiries: string[]): { weeklyExpiry: string; monthlyExpiry: string } {
  if (!expiries || expiries.length === 0) {
    return { weeklyExpiry: '', monthlyExpiry: '' };
  }
  const weeklyExpiry = expiries[0];
  const monthlyExpiry = expiries.length >= 3 ? expiries[2] : (expiries[1] || expiries[0]);
  return { weeklyExpiry, monthlyExpiry };
}

/**
 * Deterministic helper to resolve calendar days to expiry from an expiry date string
 * (e.g. '29 OCT 2026', '05 NOV 2026', '12 NOV 2026', '26 NOV 2026', '31 DEC 2026').
 */
export function parseExpiryDaysToExpiry(expiry: string): number {
  const parsedExpiry = Date.parse(expiry);
  let daysToExpiry = expiry.includes('OCT') ? 7 : expiry.includes('NOV') ? 28 : 63;
  if (!Number.isNaN(parsedExpiry)) {
    const refNow = new Date('2026-10-22T09:15:00+05:30').getTime();
    const diffDays = Math.round((parsedExpiry - refNow) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 365) {
      daysToExpiry = diffDays;
    }
  }
  return daysToExpiry;
}

/**
 * Generates an institutional-grade option chain around spot price.
 */
export function generateOptionChain(
  symbol: string,
  selectedExpiry?: string,
  liveSpot?: number
): OptionChainData {
  const inst = findFnoInstrument(symbol);
  const hasLiveSpot = Boolean(liveSpot && liveSpot > 0);
  const spot = hasLiveSpot ? (liveSpot as number) : inst.spotPrice;
  const expiry = selectedExpiry || inst.currentExpiry;
  const step = inst.strikeStep;
  const atmStrike = Math.round(spot / step) * step;

  const daysToExpiry = parseExpiryDaysToExpiry(expiry);
  const timeYears = Math.max(0.002, daysToExpiry / 365.0);

  // Generate 27 strikes around ATM (-13 to +13 steps)
  const strikeCount = 13;
  const strikes: OptionChainStrikeRow[] = [];

  let totalCallOI = 0;
  let totalPutOI = 0;
  let totalCallVolume = 0;
  let totalPutVolume = 0;

  for (let i = -strikeCount; i <= strikeCount; i++) {
    const strike = Math.round((atmStrike + i * step) * 100) / 100;
    const isATM = strike === atmStrike;
    const moneyness = (strike - spot) / spot; // negative = strike below spot

    // Realistic volatility smile / skew
    // Puts have higher IV due to downside crash protection demand (skew)
    const baseIV = 0.145; // 14.5% base
    const skew = -moneyness * 0.12; // lower strikes have higher IV
    const smile = moneyness * moneyness * 0.45;
    const callIV = Math.max(0.08, baseIV + skew * 0.5 + smile);
    const putIV = Math.max(0.08, baseIV - skew * 1.2 + smile);

    // Theoretical prices
    const callLtpRaw = calculateBSPrice('CE', {
      spot,
      strike,
      timeYears,
      volatility: callIV,
    });
    const putLtpRaw = calculateBSPrice('PE', {
      spot,
      strike,
      timeYears,
      volatility: putIV,
    });

    const callLtp = Math.max(0.05, Math.round(callLtpRaw * 20) / 20);
    const putLtp = Math.max(0.05, Math.round(putLtpRaw * 20) / 20);

    // Greeks
    const callGreeks = calculateBSGreeks('CE', {
      spot,
      strike,
      timeYears,
      volatility: callIV,
    });
    const putGreeks = calculateBSGreeks('PE', {
      spot,
      strike,
      timeYears,
      volatility: putIV,
    });

    // Realistic OI distribution: Higher concentration near round ATM/OTM strikes
    const strikeRoundFactor = strike % (step * 2) === 0 ? 1.4 : 1.0;
    const distFromAtm = Math.abs(i);
    const decayFactor = Math.exp(-0.15 * distFromAtm);

    // Differentiate Weekly vs Monthly OI volume & structure
    const isMonthly = daysToExpiry > 14;
    const oiScale = isMonthly ? 2.6 : 1.0;

    // Call OI peaks at resistance (OTM Calls: strike > spot)
    const callOIWeight = isMonthly ? (i >= 1 ? 1.35 : 0.65) : (i >= 0 ? 1.2 : 0.6);
    const callOI = Math.round((120000 * oiScale * decayFactor * strikeRoundFactor * callOIWeight) / 100) * 100;
    const callChgOI = Math.round((callOI * 0.08 * (i >= 0 ? 1 : -0.5)) / 50) * 50;
    const callVol = Math.round(callOI * (isMonthly ? 0.35 : 0.45));

    // Put OI peaks at support (OTM Puts: strike < spot)
    const putOIWeight = isMonthly ? (i <= -1 ? 1.4 : 0.55) : (i <= 0 ? 1.3 : 0.5);
    const putOI = Math.round((140000 * oiScale * decayFactor * strikeRoundFactor * putOIWeight) / 100) * 100;
    const putChgOI = Math.round((putOI * 0.07 * (i <= 0 ? 1 : -0.4)) / 50) * 50;
    const putVol = Math.round(putOI * (isMonthly ? 0.32 : 0.42));

    totalCallOI += callOI;
    totalPutOI += putOI;
    totalCallVolume += callVol;
    totalPutVolume += putVol;

    // Spreads
    const callSpread = Math.max(0.05, Math.round(callLtp * 0.005 * 20) / 20);
    const putSpread = Math.max(0.05, Math.round(putLtp * 0.005 * 20) / 20);

    const callContract: OptionContract = {
      strike,
      type: 'CE',
      symbol: `${inst.symbol} ${expiry} ${strike} CE`,
      ltp: callLtp,
      change: Math.round((inst.change * callGreeks.delta) * 100) / 100,
      changePct: Math.round(((inst.change * callGreeks.delta) / Math.max(1, callLtp)) * 10000) / 100,
      bid: Math.max(0.05, Math.round((callLtp - callSpread) * 20) / 20),
      ask: Math.round((callLtp + callSpread) * 20) / 20,
      bidQty: Math.round(callVol * 0.02) * inst.lotSize,
      askQty: Math.round(callVol * 0.02) * inst.lotSize,
      volume: callVol,
      openInterest: callOI,
      changeInOI: callChgOI,
      impliedVolatility: Math.round(callIV * 1000) / 10,
      greeks: callGreeks,
      isITM: strike < spot,
      isATM,
      isOTM: strike > spot,
    };

    const putContract: OptionContract = {
      strike,
      type: 'PE',
      symbol: `${inst.symbol} ${expiry} ${strike} PE`,
      ltp: putLtp,
      change: Math.round((inst.change * putGreeks.delta) * 100) / 100,
      changePct: Math.round(((inst.change * putGreeks.delta) / Math.max(1, putLtp)) * 10000) / 100,
      bid: Math.max(0.05, Math.round((putLtp - putSpread) * 20) / 20),
      ask: Math.round((putLtp + putSpread) * 20) / 20,
      bidQty: Math.round(putVol * 0.02) * inst.lotSize,
      askQty: Math.round(putVol * 0.02) * inst.lotSize,
      volume: putVol,
      openInterest: putOI,
      changeInOI: putChgOI,
      impliedVolatility: Math.round(putIV * 1000) / 10,
      greeks: putGreeks,
      isITM: strike > spot,
      isATM,
      isOTM: strike < spot,
    };

    strikes.push({
      strike,
      call: callContract,
      put: putContract,
      isATM,
    });
  }

  // Put-Call Ratio
  const pcr = totalCallOI > 0 ? Math.round((totalPutOI / totalCallOI) * 100) / 100 : 1.0;

  // Max Pain Calculation: Strike where total payout to buyers is minimized
  let minTotalLoss = Infinity;
  let maxPainStrike = atmStrike;

  for (const candidate of strikes) {
    const k = candidate.strike;
    let totalLoss = 0;
    for (const s of strikes) {
      // Call intrinsic loss
      if (k > s.strike) {
        totalLoss += (k - s.strike) * s.call.openInterest;
      }
      // Put intrinsic loss
      if (k < s.strike) {
        totalLoss += (s.strike - k) * s.put.openInterest;
      }
    }
    if (totalLoss < minTotalLoss) {
      minTotalLoss = totalLoss;
      maxPainStrike = k;
    }
  }

  // Support & Resistance (OI Magnets)
  let highestCallOI = -1;
  let highestCallStrike = atmStrike;
  let highestPutOI = -1;
  let highestPutStrike = atmStrike;

  for (const s of strikes) {
    if (s.call.openInterest > highestCallOI) {
      highestCallOI = s.call.openInterest;
      highestCallStrike = s.strike;
    }
    if (s.put.openInterest > highestPutOI) {
      highestPutOI = s.put.openInterest;
      highestPutStrike = s.strike;
    }
  }

  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });

  return {
    underlyingSymbol: inst.symbol,
    spotPrice: spot,
    expiry,
    expiries: inst.expiries,
    lotSize: inst.lotSize,
    strikes,
    totalCallOI,
    totalPutOI,
    totalCallVolume,
    totalPutVolume,
    pcr,
    maxPain: maxPainStrike,
    highestCallOIStrike: highestCallStrike,
    highestPutOIStrike: highestPutStrike,
    timestamp,
    daysToExpiry,
    provenance: {
      spotSource: hasLiveSpot ? 'LIVE_OBSERVED' : 'CACHED_REFERENCE',
      chainSource: 'MODEL_SYNTHESIZED_BSM',
      ivSurfaceSource: 'PARAMETRIC_SKEW_MODEL',
      oiSource: 'PARAMETRIC_PROFILE',
      pricingModel: 'BLACK_SCHOLES_MERTON_EUROPEAN',
      riskFreeRate: 0.068,
      dividendYield: 0.0,
      calculationTimestamp: timestamp,
      disclaimer:
        'Option strikes, IV skew, and OI profiles are model-synthesized around the underlying reference price via Black-Scholes-Merton. Dealer GEX is assumption-dependent and does not represent verified exchange dealer inventory.',
    },
  };
}

/**
 * Futures Term Structure for an instrument
 */
export function getFuturesTermStructure(
  symbol: string,
  liveSpot?: number,
  liveChange?: number,
  liveChangePct?: number
): FuturesTermStructure {
  const inst = findFnoInstrument(symbol);
  const spot = liveSpot && liveSpot > 0 ? liveSpot : inst.spotPrice;
  const change = liveChange !== undefined ? liveChange : inst.change;
  const changePct = liveChangePct !== undefined ? liveChangePct : inst.changePct;

  const contracts: FutureContract[] = [
    {
      expiry: '29 OCT 2026',
      ltp: Math.round((spot * 1.0022) * 20) / 20,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      openInterest: 11450000,
      changeInOI: 345000,
      volume: 4890000,
      basis: Math.round((spot * 0.0022) * 20) / 20,
      vwap: Math.round((spot * 1.0018) * 20) / 20,
    },
    {
      expiry: '26 NOV 2026',
      ltp: Math.round((spot * 1.0055) * 20) / 20,
      change: Math.round(change * 1.02 * 100) / 100,
      changePct: Math.round((changePct + 0.04) * 100) / 100,
      openInterest: 3280000,
      changeInOI: 182000,
      volume: 1240000,
      basis: Math.round((spot * 0.0055) * 20) / 20,
      vwap: Math.round((spot * 1.0048) * 20) / 20,
    },
    {
      expiry: '31 DEC 2026',
      ltp: Math.round((spot * 1.0095) * 20) / 20,
      change: Math.round(change * 1.05 * 100) / 100,
      changePct: Math.round((changePct + 0.08) * 100) / 100,
      openInterest: 1420000,
      changeInOI: 45000,
      volume: 410000,
      basis: Math.round((spot * 0.0095) * 20) / 20,
      vwap: Math.round((spot * 1.0088) * 20) / 20,
    },
  ];

  return {
    underlyingSymbol: inst.symbol,
    spotPrice: spot,
    contracts,
  };
}

/**
 * 4-Quadrant Institutional Buildup Universe Scanner Data.
 */
const INDIA_BUILDUP: BuildupRecord[] = [
  {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    spotPrice: 1161.20,
    priceChangePct: 2.14,
    openInterest: 24500000,
    oiChangePct: 8.45,
    volume: 18200000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'IT',
    lotSize: 400,
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    spotPrice: 2465.00,
    priceChangePct: 1.59,
    openInterest: 14200000,
    oiChangePct: 6.20,
    volume: 9400000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'IT',
    lotSize: 175,
  },
  {
    symbol: 'LT',
    name: 'Larsen & Toubro Ltd',
    spotPrice: 3620.00,
    priceChangePct: 1.17,
    openInterest: 8400000,
    oiChangePct: 5.80,
    volume: 4500000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'Capital Goods',
    lotSize: 175,
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd',
    spotPrice: 1690.50,
    priceChangePct: 1.09,
    openInterest: 18900000,
    oiChangePct: 4.70,
    volume: 8200000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'Telecom',
    lotSize: 475,
  },
  {
    symbol: 'TITAN',
    name: 'Titan Company Ltd',
    spotPrice: 3480.00,
    priceChangePct: 2.10,
    openInterest: 6400000,
    oiChangePct: 5.12,
    volume: 3800000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'Consumer',
    lotSize: 175,
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd',
    spotPrice: 283.70,
    priceChangePct: -1.17,
    openInterest: 42100000,
    oiChangePct: 9.30,
    volume: 24500000,
    buildupType: 'SHORT_BUILDUP',
    sentiment: 'Strong Bearish',
    sector: 'Automobile',
    lotSize: 1425,
  },
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    spotPrice: 1211.20,
    priceChangePct: -1.01,
    openInterest: 38500000,
    oiChangePct: 6.80,
    volume: 16800000,
    buildupType: 'SHORT_BUILDUP',
    sentiment: 'Strong Bearish',
    sector: 'Energy',
    lotSize: 250,
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    spotPrice: 865.40,
    priceChangePct: -0.53,
    openInterest: 29800000,
    oiChangePct: 4.25,
    volume: 14200000,
    buildupType: 'SHORT_BUILDUP',
    sentiment: 'Strong Bearish',
    sector: 'Banking',
    lotSize: 750,
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    spotPrice: 728.85,
    priceChangePct: 0.58,
    openInterest: 48900000,
    oiChangePct: -3.85,
    volume: 22400000,
    buildupType: 'SHORT_COVERING',
    sentiment: 'Moderate Bullish',
    sector: 'Banking',
    lotSize: 550,
  },
  {
    symbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank',
    spotPrice: 1780.20,
    priceChangePct: 0.47,
    openInterest: 16200000,
    oiChangePct: -4.10,
    volume: 6800000,
    buildupType: 'SHORT_COVERING',
    sentiment: 'Moderate Bullish',
    sector: 'Banking',
    lotSize: 400,
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    spotPrice: 1383.00,
    priceChangePct: -0.46,
    openInterest: 31200000,
    oiChangePct: -5.20,
    volume: 11200000,
    buildupType: 'LONG_UNWINDING',
    sentiment: 'Weakening',
    sector: 'Banking',
    lotSize: 700,
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Ltd',
    spotPrice: 7120.40,
    priceChangePct: -0.45,
    openInterest: 7900000,
    oiChangePct: -3.40,
    volume: 3200000,
    buildupType: 'LONG_UNWINDING',
    sentiment: 'Weakening',
    sector: 'Financial Services',
    lotSize: 125,
  },
];

const USA_BUILDUP: BuildupRecord[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    spotPrice: 142.50,
    priceChangePct: 2.22,
    openInterest: 4850000,
    oiChangePct: 7.80,
    volume: 8200000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'Semiconductors',
    lotSize: 100,
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc',
    spotPrice: 260.40,
    priceChangePct: 3.45,
    openInterest: 5400000,
    oiChangePct: 9.10,
    volume: 9800000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'Automotive & AI',
    lotSize: 100,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    spotPrice: 428.50,
    priceChangePct: 1.15,
    openInterest: 2900000,
    oiChangePct: 5.40,
    volume: 3800000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'Enterprise Cloud',
    lotSize: 100,
  },
  {
    symbol: 'SPX',
    name: 'S&P 500 Index',
    spotPrice: 7650.00,
    priceChangePct: -1.34,
    openInterest: 11450000,
    oiChangePct: 3.10,
    volume: 4890000,
    buildupType: 'SHORT_BUILDUP',
    sentiment: 'Strong Bearish',
    sector: 'US Broad Market',
    lotSize: 100,
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc',
    spotPrice: 232.80,
    priceChangePct: -0.51,
    openInterest: 3200000,
    oiChangePct: 4.20,
    volume: 4100000,
    buildupType: 'SHORT_BUILDUP',
    sentiment: 'Strong Bearish',
    sector: 'Consumer Electronics',
    lotSize: 100,
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc',
    spotPrice: 166.20,
    priceChangePct: -1.25,
    openInterest: 2100000,
    oiChangePct: 3.80,
    volume: 2900000,
    buildupType: 'SHORT_BUILDUP',
    sentiment: 'Strong Bearish',
    sector: 'Internet & Search',
    lotSize: 100,
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc',
    spotPrice: 188.60,
    priceChangePct: 0.85,
    openInterest: 2600000,
    oiChangePct: -3.20,
    volume: 3200000,
    buildupType: 'SHORT_COVERING',
    sentiment: 'Moderate Bullish',
    sector: 'E-Commerce / Cloud',
    lotSize: 100,
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc',
    spotPrice: 595.00,
    priceChangePct: 1.80,
    openInterest: 1950000,
    oiChangePct: -4.50,
    volume: 2700000,
    buildupType: 'SHORT_COVERING',
    sentiment: 'Moderate Bullish',
    sector: 'Social Media / AI',
    lotSize: 100,
  },
  {
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    spotPrice: 156.30,
    priceChangePct: -1.85,
    openInterest: 3100000,
    oiChangePct: -5.80,
    volume: 4200000,
    buildupType: 'LONG_UNWINDING',
    sentiment: 'Weakening',
    sector: 'Semiconductors',
    lotSize: 100,
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co',
    spotPrice: 222.40,
    priceChangePct: -0.40,
    openInterest: 1800000,
    oiChangePct: -2.80,
    volume: 2100000,
    buildupType: 'LONG_UNWINDING',
    sentiment: 'Weakening',
    sector: 'Investment Banking',
    lotSize: 100,
  },
];

const UAE_BUILDUP: BuildupRecord[] = [
  {
    symbol: 'DFMGI',
    name: 'DFM General Index',
    spotPrice: 4485.30,
    priceChangePct: 0.42,
    openInterest: 480000,
    oiChangePct: 3.40,
    volume: 620000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'Broad Market Index',
    lotSize: 50,
  },
  {
    symbol: 'EMAAR',
    name: 'Emaar Properties PJSC',
    spotPrice: 8.75,
    priceChangePct: 1.39,
    openInterest: 12500000,
    oiChangePct: 6.20,
    volume: 8400000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'Real Estate',
    lotSize: 500,
  },
  {
    symbol: 'ALDAR',
    name: 'Aldar Properties PJSC',
    spotPrice: 6.85,
    priceChangePct: 1.63,
    openInterest: 9400000,
    oiChangePct: 4.80,
    volume: 5100000,
    buildupType: 'LONG_BUILDUP',
    sentiment: 'Strong Bullish',
    sector: 'Real Estate',
    lotSize: 500,
  },
  {
    symbol: 'FAB',
    name: 'First Abu Dhabi Bank PJSC',
    spotPrice: 13.40,
    priceChangePct: -0.74,
    openInterest: 6800000,
    oiChangePct: 4.10,
    volume: 3900000,
    buildupType: 'SHORT_BUILDUP',
    sentiment: 'Strong Bearish',
    sector: 'Banking',
    lotSize: 200,
  },
  {
    symbol: 'EMIRATESNBD',
    name: 'Emirates NBD Bank PJSC',
    spotPrice: 19.50,
    priceChangePct: -1.02,
    openInterest: 3800000,
    oiChangePct: 5.60,
    volume: 2800000,
    buildupType: 'SHORT_BUILDUP',
    sentiment: 'Strong Bearish',
    sector: 'Banking',
    lotSize: 200,
  },
  {
    symbol: 'DEWA',
    name: 'Dubai Electricity & Water Authority',
    spotPrice: 2.48,
    priceChangePct: 0.40,
    openInterest: 14200000,
    oiChangePct: -2.80,
    volume: 7200000,
    buildupType: 'SHORT_COVERING',
    sentiment: 'Moderate Bullish',
    sector: 'Utilities',
    lotSize: 1000,
  },
  {
    symbol: 'ETISALAT',
    name: 'e& Emirates Telecommunications',
    spotPrice: 18.20,
    priceChangePct: 0.55,
    openInterest: 4200000,
    oiChangePct: -3.10,
    volume: 2200000,
    buildupType: 'SHORT_COVERING',
    sentiment: 'Moderate Bullish',
    sector: 'Telecom',
    lotSize: 200,
  },
  {
    symbol: 'AIRARABIA',
    name: 'Air Arabia PJSC',
    spotPrice: 2.92,
    priceChangePct: -0.68,
    openInterest: 5800000,
    oiChangePct: -4.20,
    volume: 3100000,
    buildupType: 'LONG_UNWINDING',
    sentiment: 'Weakening',
    sector: 'Aviation',
    lotSize: 1000,
  },
];

export function getBuildupScannerData(market: MarketType = 'INDIA'): BuildupRecord[] {
  if (market === 'USA') return USA_BUILDUP;
  if (market === 'UAE') return UAE_BUILDUP;
  return INDIA_BUILDUP;
}

/**
 * Classifies market regime based on PCR and Option Chain volatility
 */
export function classifyMarketRegime(
  pcr: number,
  iv: number,
  chain: OptionChainData
): {
  regime: MarketRegimeType;
  title: string;
  bias: string;
  rationale: string;
} {
  const inst = findFnoInstrument(chain.underlyingSymbol);
  const curr = inst.market === 'USA' ? '$' : inst.market === 'UAE' ? 'AED ' : '₹';

  if (iv > 24.0) {
    return {
      regime: 'VOLATILITY_EXPANSION',
      title: 'High Volatility Expansion',
      bias: 'Non-Directional / Long Vol',
      rationale:
        'Elevated implied volatility suggests strong pricing for option writing risk. Straddles and Strangles reflect event-driven expansion.',
    };
  }

  if (pcr > 1.25) {
    return {
      regime: 'TRENDING_UP',
      title: 'Strong Bullish Bias',
      bias: 'Bullish (Aggressive Put Writing)',
      rationale:
        `PCR is elevated at ${pcr.toFixed(2)}, demonstrating heavy put accumulation beneath spot and firm floor at support strike ${curr}${chain.highestPutOIStrike}.`,
    };
  }

  if (pcr < 0.75) {
    return {
      regime: 'TRENDING_DOWN',
      title: 'Bearish Distribution',
      bias: 'Bearish (Call Writing Overhead)',
      rationale:
        `PCR is compressed at ${pcr.toFixed(2)}, indicating significant call selling overhead capped at resistance strike ${curr}${chain.highestCallOIStrike}.`,
    };
  }

  return {
    regime: 'RANGE_BOUND',
    title: 'Range-Bound Equilibrium',
    bias: 'Neutral / Range-Bound',
    rationale:
      `Balanced derivatives flow with PCR at ${pcr.toFixed(2)} and spot anchored near Max Pain ${curr}${chain.maxPain}. Theta-positive structures (Iron Condor, Credit Spreads) favored.`,
  };
}
