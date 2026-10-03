// ─── Market Intelligence 007 — Core TypeScript Types ───────────────────────

export type MarketType = 'USA' | 'INDIA' | 'UAE';
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1H' | '4H' | '1D' | '1W' | '1M';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartType = 'CANDLESTICK' | 'LINE' | 'AREA' | 'HEIKIN_ASHI' | 'HOLLOW_CANDLE';

export type IndicatorType =
  | 'SMA' | 'EMA' | 'BOLLINGER_BANDS' | 'VWAP' | 'SUPERTREND' | 'ICHIMOKU' | 'PARABOLIC_SAR'
  | 'RSI' | 'MACD' | 'STOCHASTIC' | 'ATR' | 'CVD' | 'ADX' | 'OBV' | 'CCI' | 'WILLIAMS_R' | 'MFI';

export const OVERLAY_TYPES: IndicatorType[] = [
  'SMA', 'EMA', 'BOLLINGER_BANDS', 'VWAP', 'SUPERTREND', 'ICHIMOKU', 'PARABOLIC_SAR',
];

export const PANEL_TYPES: IndicatorType[] = [
  'RSI', 'MACD', 'STOCHASTIC', 'ATR', 'CVD', 'ADX', 'OBV', 'CCI', 'WILLIAMS_R', 'MFI',
];

export function isOverlay(t: IndicatorType): boolean {
  return OVERLAY_TYPES.includes(t);
}

export interface IndicatorConfig {
  type: IndicatorType;
  period: number;
  secondaryPeriod: number;
  tertiaryPeriod: number;
  color: string;
  secondaryColor: string;
  tertiaryColor: string;
  enabled: boolean;
  multiplier: number;
}

export interface MACDResult {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export interface SupertrendResult {
  values: (number | null)[];
  directions: (boolean | null)[];
}

export interface StochasticResult {
  kLine: (number | null)[];
  dLine: (number | null)[];
}

export interface IchimokuResult {
  tenkanSen: (number | null)[];
  kijunSen: (number | null)[];
  senkouSpanA: (number | null)[];
  senkouSpanB: (number | null)[];
  chikouSpan: (number | null)[];
}

export interface AdxResult {
  plusDI: (number | null)[];
  minusDI: (number | null)[];
  adx: (number | null)[];
}

export interface CvdResult {
  cvdLine: (number | null)[];
  deltaBars: (number | null)[];
}

export interface VolumeProfileBucket {
  priceLow: number;
  priceHigh: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
}

export interface VolumeProfileData {
  buckets: VolumeProfileBucket[];
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  maxBucketVolume: number;
}

export interface SmcFvg {
  startIndex: number;
  endIndex: number;
  topPrice: number;
  bottomPrice: number;
  isBullish: boolean;
  isMitigated: boolean;
}

export interface SmcLiquiditySweep {
  candleIndex: number;
  price: number;
  isHighSweep: boolean;
  label: string;
}

export interface SmcOrderBlock {
  startIndex: number;
  endIndex: number;
  topPrice: number;
  bottomPrice: number;
  isBullish: boolean;
  isMitigated: boolean;
  volumeRatio?: number;
}

export interface SmcStructureBreak {
  candleIndex: number;
  price: number;
  isBullish: boolean;
  type: string; // 'BOS ↑' | 'BOS ↓' | 'CHoCH ↑' | 'CHoCH ↓'
}

export interface SmcAnalysis {
  fvgs: SmcFvg[];
  sweeps: SmcLiquiditySweep[];
  orderBlocks: SmcOrderBlock[];
  structureBreaks: SmcStructureBreak[];
  equilibriumPrice: number;
}

export interface FnoOverlayLevels {
  callWall?: number;
  putWall?: number;
  gammaFlip?: number;
  maxPain?: number;
  callWallGex?: number;
  putWallGex?: number;
  totalNetGex?: number;
  enabled: boolean;
}

export interface StrategyPayoffOverlay {
  enabled: boolean;
  strategyName: string;
  breakevenPoints: number[];
  maxProfitZone?: { low: number; high: number };
  maxLossZone?: { low: number; high: number };
  maxProfit?: number;
  maxLoss?: number;
  targetPrice?: number;
}

export interface ChartOptions {
  chartType: ChartType;
  showVolume: boolean;
  showVolumePanel: boolean;
  showSmcOverlay: boolean;
  showVolumeProfile: boolean;
  showFnoOverlay?: boolean;
  fnoLevels?: FnoOverlayLevels;
  strategyOverlay?: StrategyPayoffOverlay;
  indicators: IndicatorConfig[];
  indicatorResults: Map<IndicatorType, unknown>;
  currentPriceOverride?: number;
  timeframe: string;
  drawings?: import('./drawingTypes').DrawingItem[];
  activeDrawing?: import('./drawingTypes').DrawingItem | null;
}


export interface ViewState {
  startIdx: number;
  endIdx: number;
}

export interface Crosshair {
  x: number;
  y: number;
}

export const INDICATOR_DEFAULTS: Record<
  IndicatorType,
  {
    period: number;
    secondaryPeriod: number;
    tertiaryPeriod: number;
    color: string;
    secondaryColor: string;
    tertiaryColor: string;
    multiplier: number;
    label: string;
  }
> = {
  SMA:             { period: 20, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#FF9800', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'SMA' },
  EMA:             { period: 21, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#2196F3', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'EMA' },
  BOLLINGER_BANDS: { period: 20, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#9C27B0', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 2, label: 'Bollinger' },
  VWAP:            { period: 1,  secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#FFEB3B', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'VWAP' },
  SUPERTREND:      { period: 10, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#00E676', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 3, label: 'Supertrend' },
  ICHIMOKU:        { period: 9,  secondaryPeriod: 26, tertiaryPeriod: 52, color: '#26A69A', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'Ichimoku' },
  PARABOLIC_SAR:   { period: 0,  secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#D32F2F', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'SAR' },
  RSI:             { period: 14, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#AB47BC', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'RSI' },
  MACD:            { period: 12, secondaryPeriod: 26, tertiaryPeriod: 9,  color: '#29B6F6', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'MACD' },
  STOCHASTIC:      { period: 14, secondaryPeriod: 3,  tertiaryPeriod: 0,  color: '#FF7043', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'Stochastic' },
  ATR:             { period: 14, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#78909C', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'ATR' },
  CVD:             { period: 14, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#00E5FF', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'CVD' },
  ADX:             { period: 14, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#8E24AA', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'ADX' },
  OBV:             { period: 0,  secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#43A047', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'OBV' },
  CCI:             { period: 20, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#00ACC1', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'CCI' },
  WILLIAMS_R:      { period: 14, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#FDD835', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'Williams %R' },
  MFI:             { period: 14, secondaryPeriod: 0,  tertiaryPeriod: 0,  color: '#3949AB', secondaryColor: '#42A5F5', tertiaryColor: '#EF5350', multiplier: 1, label: 'MFI' },
};

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

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePct: number;
}

export const MARKETS: Record<MarketType, { label: string; flag: string; currency: string; indices: string[] }> = {
  USA: {
    label: 'USA',
    flag: '🇺🇸',
    currency: '$',
    indices: ['S&P 500', 'NASDAQ 100', 'DOW JONES'],
  },
  INDIA: {
    label: 'INDIA',
    flag: '🇮🇳',
    currency: '₹',
    indices: ['NIFTY 50', 'BANKNIFTY', 'SENSEX'],
  },
  UAE: {
    label: 'UAE',
    flag: '🇦🇪',
    currency: 'AED',
    indices: ['DFM GENERAL', 'ADX GENERAL', 'FTSE ADX 15'],
  },
};

export const INSTRUMENTS: Record<MarketType, Instrument[]> = {
  USA: [
    { symbol: 'SPX', name: 'S&P 500', exchange: 'NYSE', currency: '$', market: 'USA' },
    { symbol: 'NDX', name: 'NASDAQ 100', exchange: 'NASDAQ', currency: '$', market: 'USA' },
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: '$', market: 'USA' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ', currency: '$', market: 'USA' },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', currency: '$', market: 'USA' },
  ],
  INDIA: [
    { symbol: 'NIFTY', name: 'NIFTY 50', exchange: 'NSE', currency: '₹', market: 'INDIA' },
    { symbol: 'BANKNIFTY', name: 'BANK NIFTY', exchange: 'NSE', currency: '₹', market: 'INDIA' },
    { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', currency: '₹', market: 'INDIA' },
    { symbol: 'TCS', name: 'Tata Consultancy', exchange: 'NSE', currency: '₹', market: 'INDIA' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', currency: '₹', market: 'INDIA' },
  ],
  UAE: [
    { symbol: 'DFMGI', name: 'DFM General Index', exchange: 'DFM', currency: 'AED', market: 'UAE' },
    { symbol: 'ADXGI', name: 'ADX General Index', exchange: 'ADX', currency: 'AED', market: 'UAE' },
    { symbol: 'EMAAR', name: 'Emaar Properties', exchange: 'DFM', currency: 'AED', market: 'UAE' },
    { symbol: 'FAB', name: 'First Abu Dhabi Bank', exchange: 'ADX', currency: 'AED', market: 'UAE' },
    { symbol: 'DEWA', name: 'Dubai Electricity & Water', exchange: 'DFM', currency: 'AED', market: 'UAE' },
  ],
};
