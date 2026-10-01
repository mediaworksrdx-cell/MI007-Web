// ─── Market Intelligence 007 — Core TypeScript Types ───────────────────────

export type MarketType = 'INDIA' | 'USA' | 'UAE';
export type ChartType = 'CANDLESTICK' | 'LINE' | 'AREA' | 'HEIKIN_ASHI';
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Instrument {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  market: MarketType;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  open: number;
}

export interface IndicatorConfig {
  type: IndicatorType;
  period: number;
  period2?: number;
  period3?: number;
  multiplier?: number;
  color: string;
  enabled: boolean;
}

export type IndicatorType =
  | 'EMA'
  | 'SMA'
  | 'BOLLINGER'
  | 'VWAP'
  | 'RSI'
  | 'MACD'
  | 'VOLUME';

export interface IndicatorResult {
  type: IndicatorType;
  values: (number | null)[];
  values2?: (number | null)[]; // secondary line (e.g., MACD signal)
  values3?: (number | null)[]; // histogram
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePct: number;
}

export const MARKETS: Record<MarketType, { label: string; flag: string; currency: string; indices: string[] }> = {
  INDIA: {
    label: 'INDIA',
    flag: '🇮🇳',
    currency: '₹',
    indices: ['NIFTY 50', 'BANKNIFTY', 'SENSEX'],
  },
  USA: {
    label: 'USA',
    flag: '🇺🇸',
    currency: '$',
    indices: ['S&P 500', 'NASDAQ 100', 'DOW JONES'],
  },
  UAE: {
    label: 'UAE',
    flag: '🇦🇪',
    currency: 'AED',
    indices: ['DFM GENERAL', 'ADX GENERAL', 'FTSE ADX 15'],
  },
};

export const INSTRUMENTS: Record<MarketType, Instrument[]> = {
  INDIA: [
    { symbol: 'NIFTY', name: 'NIFTY 50', exchange: 'NSE', currency: '₹', market: 'INDIA' },
    { symbol: 'BANKNIFTY', name: 'BANK NIFTY', exchange: 'NSE', currency: '₹', market: 'INDIA' },
    { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', currency: '₹', market: 'INDIA' },
    { symbol: 'TCS', name: 'Tata Consultancy', exchange: 'NSE', currency: '₹', market: 'INDIA' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', currency: '₹', market: 'INDIA' },
  ],
  USA: [
    { symbol: 'SPX', name: 'S&P 500', exchange: 'NYSE', currency: '$', market: 'USA' },
    { symbol: 'NDX', name: 'NASDAQ 100', exchange: 'NASDAQ', currency: '$', market: 'USA' },
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: '$', market: 'USA' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', currency: '$', market: 'USA' },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', currency: '$', market: 'USA' },
  ],
  UAE: [
    { symbol: 'DFMGI', name: 'DFM General Index', exchange: 'DFM', currency: 'AED', market: 'UAE' },
    { symbol: 'ADXGI', name: 'ADX General Index', exchange: 'ADX', currency: 'AED', market: 'UAE' },
    { symbol: 'EMAAR', name: 'Emaar Properties', exchange: 'DFM', currency: 'AED', market: 'UAE' },
    { symbol: 'FAB', name: 'First Abu Dhabi Bank', exchange: 'ADX', currency: 'AED', market: 'UAE' },
    { symbol: 'DEWA', name: 'Dubai Electricity & Water', exchange: 'DFM', currency: 'AED', market: 'UAE' },
  ],
};
