// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE AI (MI-007) — ORDER FLOW FOOTPRINT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type FootprintViewMode = 'BID_ASK' | 'DELTA' | 'PROFILE' | 'HEATMAP';

export type FootprintDataSource =
  | 'VERIFIED_L2'
  | 'INFERRED_MICROSTRUCTURE'
  | 'SIMULATED_MICROSTRUCTURE'; // Backward compatibility alias

export type AggressorSide = 'BUY' | 'SELL';

export type TradeClassificationMethod =
  | 'EXCHANGE_FLAG'
  | 'QUOTE_MIDPOINT'
  | 'TICK_RULE'
  | 'INFERRED';

export type FeedClassification =
  | 'VERIFIED_EXCHANGE_DATA'
  | 'INFERRED_ESTIMATE';

export interface ExchangeTradeTick {
  price: number;
  volume: number;
  timestamp: number; // Unix timestamp in ms
  side?: AggressorSide; // Explicit exchange aggressor flag if provided
  bid?: number; // Top of book bid price at execution
  ask?: number; // Top of book ask price at execution
}

export interface PriceLevelFootprint {
  price: number;
  bidVolume: number; // Aggressive sell volume hitting bid
  askVolume: number; // Aggressive buy volume lifting ask
  totalVolume: number;
  delta: number;      // askVolume - bidVolume
  hasBuyImbalance: boolean;  // Ask >= Bid(below) * ratio
  hasSellImbalance: boolean; // Bid >= Ask(above) * ratio
  imbalanceRatio: number;
  isPoc: boolean;
  isValueArea: boolean;
}

export interface StackedImbalanceZone {
  id: string;
  startIndex: number;
  endIndex: number;
  openTime: number;
  topPrice: number;
  bottomPrice: number;
  isBuy: boolean;
  levelCount: number;
  totalVolume: number;
  isMitigated: boolean;
  mitigationIndex?: number;
}

export interface AbsorptionEvent {
  candleIndex: number;
  time: number;
  price: number;
  isBullish: boolean;
  volume: number;
  delta: number;
  aggressiveVolume: number;
  displacementRatio: number; // Price travel / aggressive volume (near 0 indicates strong absorption)
  absorptionRatio: number;   // Quantitative score
  description: string;
}

export interface ExhaustionEvent {
  candleIndex: number;
  time: number;
  price: number;
  isBullish: boolean;        // Bullish exhaustion (sellers dried up at low) or Bearish exhaustion (buyers dried up at high)
  extremeVolume: number;
  avgLevelVolume: number;
  volumeDropPct: number;
  description: string;
}

export interface FootprintDataValidation {
  reconciled: boolean;
  exchangeVolume: number;
  footprintVolume: number;
  discrepancy: number;
  discrepancyPct: number;
  classification: FeedClassification;
}

export interface CandleFootprint {
  candleIndex: number;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  totalVolume: number;
  totalDelta: number;
  minDelta: number;
  maxDelta: number;
  cumDelta: number;
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  levels: Map<number, PriceLevelFootprint>;
  sortedLevels: PriceLevelFootprint[]; // Sorted high to low for top-down rendering
  buyImbalancePrices: number[];
  sellImbalancePrices: number[];
  stackedZones: StackedImbalanceZone[];
  absorption: AbsorptionEvent | null;
  exhaustion: ExhaustionEvent | null;
  validation: FootprintDataValidation;
  isNewSession: boolean;
  sessionDate: string;
  classification: FeedClassification;
  unfinishedBusiness: {
    high: boolean; // non-zero bid at candle high
    low: boolean;  // non-zero ask at candle low
  };
}

export type OrderFlowSignalType =
  | 'BULLISH_ABSORPTION'
  | 'BEARISH_ABSORPTION'
  | 'BULLISH_EXHAUSTION'
  | 'BEARISH_EXHAUSTION'
  | 'BULLISH_STACKED_IMBALANCE'
  | 'BEARISH_STACKED_IMBALANCE'
  | 'CVD_DIVERGENCE_BULL'
  | 'CVD_DIVERGENCE_BEAR';

export interface OrderFlowSignal {
  id: string;
  type: OrderFlowSignalType;
  title: string;
  isBullish: boolean;
  candleIndex: number;
  time: number;
  price: number;
  entryPrice: number;
  invalidationPrice: number;
  targetPrice: number;
  riskReward: number;
  conditions: string[];
}

export interface OrderFlowConfig {
  enabled: boolean;
  viewMode: FootprintViewMode;
  imbalanceRatio: number;             // e.g. 3.0 = 300%
  minImbalanceVolume: number;         // e.g. 5
  stackedImbalanceThreshold: number;  // e.g. 3 consecutive levels
  tickSize: number | 'auto';
  valueAreaPct: number;               // Configurable Value Area %: default 70
  sessionReset: 'DAILY' | 'NONE';     // Session cumulative delta reset mode
  showPoc: boolean;
  showValueArea: boolean;             // Value Area (VAH / VAL)
  showImbalances: boolean;
  showStackedImbalances: boolean;
  showAbsorption: boolean;
  showExhaustion: boolean;
  showOrderFlowZones: boolean;
  showDeltaSummary: boolean;          // Bar footer: Total Vol, Delta, Min/Max, CVD
  showSignals: boolean;
  dataSource: FootprintDataSource;
}

export const DEFAULT_ORDER_FLOW_CONFIG: OrderFlowConfig = {
  enabled: false,
  viewMode: 'BID_ASK',
  imbalanceRatio: 3.0,
  minImbalanceVolume: 5,
  stackedImbalanceThreshold: 3,
  tickSize: 'auto',
  valueAreaPct: 70,
  sessionReset: 'DAILY',
  showPoc: true,
  showValueArea: true,
  showImbalances: true,
  showStackedImbalances: true,
  showAbsorption: true,
  showExhaustion: true,
  showOrderFlowZones: true,
  showDeltaSummary: true,
  showSignals: true,
  dataSource: 'INFERRED_MICROSTRUCTURE',
};

export interface OrderFlowAnalysisResult {
  footprints: CandleFootprint[];
  activeZones: StackedImbalanceZone[];
  signals: OrderFlowSignal[];
  dataSource: FootprintDataSource;
  tickSizeUsed: number;
  feedClassification: FeedClassification;
}
