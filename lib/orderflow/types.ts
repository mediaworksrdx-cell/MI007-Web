// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE AI (MI-007) — ORDER FLOW FOOTPRINT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type FootprintViewMode = 'BID_ASK' | 'DELTA' | 'PROFILE' | 'HEATMAP';

export type FootprintDataSource = 'VERIFIED_L2' | 'SIMULATED_MICROSTRUCTURE';

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
  description: string;
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
  unfinishedBusiness: {
    high: boolean; // non-zero bid at candle high
    low: boolean;  // non-zero ask at candle low
  };
}

export type OrderFlowSignalType =
  | 'BULLISH_ABSORPTION'
  | 'BEARISH_ABSORPTION'
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
  showPoc: boolean;
  showValueArea: boolean;             // 70% Value Area
  showImbalances: boolean;
  showStackedImbalances: boolean;
  showAbsorption: boolean;
  showOrderFlowZones: boolean;
  showDeltaSummary: boolean;          // Bar footer: Total Vol, Delta, Min/Max
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
  showPoc: true,
  showValueArea: true,
  showImbalances: true,
  showStackedImbalances: true,
  showAbsorption: true,
  showOrderFlowZones: true,
  showDeltaSummary: true,
  showSignals: true,
  dataSource: 'SIMULATED_MICROSTRUCTURE',
};

export interface OrderFlowAnalysisResult {
  footprints: CandleFootprint[];
  activeZones: StackedImbalanceZone[];
  signals: OrderFlowSignal[];
  dataSource: FootprintDataSource;
  tickSizeUsed: number;
}
