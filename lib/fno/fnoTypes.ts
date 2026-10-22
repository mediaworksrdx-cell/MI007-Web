// ─── F&O Intelligence Hub — Core TypeScript Interfaces ───────────────────────

export type OptionType = 'CE' | 'PE';
export type TradeAction = 'BUY' | 'SELL';
export type InstrumentType = 'CE' | 'PE' | 'FUT';
export type StrategyCategory = 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';

export type BuildupType =
  | 'LONG_BUILDUP'
  | 'SHORT_BUILDUP'
  | 'SHORT_COVERING'
  | 'LONG_UNWINDING'
  | 'NEUTRAL';

export type MarketRegimeType =
  | 'TRENDING_UP'
  | 'TRENDING_DOWN'
  | 'RANGE_BOUND'
  | 'VOLATILITY_EXPANSION'
  | 'EVENT_RISK';

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
}

export interface FnoInstrument {
  symbol: string;
  name: string;
  exchange: string;
  market: 'INDIA' | 'USA' | 'UAE';
  lotSize: number;
  tickSize: number;
  strikeStep: number;
  spotPrice: number;
  change: number;
  changePct: number;
  sector: string;
  expiries: string[];
  currentExpiry: string;
  isZerodha?: boolean;
  token?: number;
}

export interface OptionContract {
  strike: number;
  type: OptionType;
  symbol: string;
  ltp: number;
  change: number;
  changePct: number;
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  volume: number;
  openInterest: number;
  changeInOI: number;
  impliedVolatility: number;
  greeks: Greeks;
  isITM: boolean;
  isATM: boolean;
  isOTM: boolean;
}

export interface OptionChainStrikeRow {
  strike: number;
  call: OptionContract;
  put: OptionContract;
  isATM: boolean;
}

export interface OptionChainData {
  underlyingSymbol: string;
  spotPrice: number;
  expiry: string;
  expiries: string[];
  lotSize: number;
  strikes: OptionChainStrikeRow[];
  totalCallOI: number;
  totalPutOI: number;
  totalCallVolume: number;
  totalPutVolume: number;
  pcr: number;
  maxPain: number;
  highestCallOIStrike: number;
  highestPutOIStrike: number;
  timestamp: string;
}

export interface FutureContract {
  expiry: string;
  ltp: number;
  change: number;
  changePct: number;
  openInterest: number;
  changeInOI: number;
  volume: number;
  basis: number;
  vwap: number;
}

export interface FuturesTermStructure {
  underlyingSymbol: string;
  spotPrice: number;
  contracts: FutureContract[];
}

export interface BuildupRecord {
  symbol: string;
  name: string;
  spotPrice: number;
  priceChangePct: number;
  openInterest: number;
  oiChangePct: number;
  volume: number;
  buildupType: BuildupType;
  sentiment: 'Strong Bullish' | 'Strong Bearish' | 'Moderate Bullish' | 'Weakening' | 'Neutral';
  sector: string;
  lotSize: number;
}

export interface StrategyLeg {
  id: string;
  action: TradeAction;
  instrument: InstrumentType;
  strike: number;
  expiry: string;
  lots: number;
  lotSize: number;
  entryPrice: number;
  currentPrice: number;
  iv: number;
  greeks: Greeks;
  disabled?: boolean;
}

export interface PayoffPoint {
  price: number;
  pnl: number;
}

export interface StrategyPayoff {
  strategyName: string;
  category: StrategyCategory;
  spotPrice: number;
  maxProfit: number | 'UNLIMITED';
  maxLoss: number | 'UNLIMITED';
  breakevens: number[];
  probabilityOfProfit: number;
  netDebitCredit: number; // positive = net credit, negative = net debit
  riskRewardRatio: string;
  netGreeks: Greeks;
  capitalRequired: number;
  marginRequired: number;
  expiryPoints: PayoffPoint[];
  todayPoints: PayoffPoint[];
}

export interface OptionStrategyPreset {
  id: string;
  name: string;
  category: StrategyCategory;
  description: string;
  outlook: string;
  payoffSvgPath?: string;
  legsTemplate: Array<{
    action: TradeAction;
    instrument: InstrumentType;
    strikeOffset: number; // relative to ATM in strike steps (e.g. 0 = ATM, +1 = 1 strike OTM, -1 = 1 strike ITM)
    lots: number;
  }>;
}

export interface TrackedStrategy {
  id: string;
  name: string;
  category: StrategyCategory;
  underlyingSymbol: string;
  spotPriceAtCreation: number;
  currentSpotPrice: number;
  createdAt: string;
  expiry: string;
  legs: StrategyLeg[];
  entryNetCost: number;
  currentPnl: number;
  probabilityOfProfit: number;
  maxProfit: number | 'UNLIMITED';
  maxLoss: number | 'UNLIMITED';
  breakevens: number[];
}
