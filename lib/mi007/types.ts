import { SmcAnalysis, SmcOrderBlock, SmcFvg, SmcStructureBreak, SmcLiquiditySweep, SmcSwingPoint } from '../smcEngine';

export interface Mi007Config {
  enabled: boolean;
  showSmc: boolean;
  showVolPro: boolean;
  showFibo: boolean;
  showTrendFibo?: boolean;
  showHud?: boolean;
}

export const DEFAULT_MI007_CONFIG: Mi007Config = {
  enabled: true,
  showSmc: true,
  showVolPro: true,
  showFibo: true,
  showTrendFibo: true,
  showHud: false,
};

export type Mi007RegimeType = 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING';
export type Mi007VolatilityState = 'LOW' | 'NORMAL' | 'HIGH';
export type Mi007Bias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type Mi007VolumeQuality = 'ACTUAL' | 'ESTIMATED';

export type Mi007Classification =
  | 'No trade'
  | 'Weak setup'
  | 'Valid setup'
  | 'Strong setup'
  | 'High-confluence setup';

export interface Mi007MarketRegime {
  regime: Mi007RegimeType;
  volatility: Mi007VolatilityState;
  htfBias: Mi007Bias;
  ltfBias: Mi007Bias;
  atr: number;
  atrPct: number;
  timestamp: number;
}

export interface Mi007VolumeBin {
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  isHvn: boolean;
  isLvn: boolean;
}

export interface Mi007ProfileSummary {
  poc: number;
  vah: number;
  val: number;
  totalVolume: number;
  startIndex: number;
  endIndex: number;
}

export interface Mi007VolumeProfile {
  volumeQuality: Mi007VolumeQuality;
  fixedRange: Mi007ProfileSummary;
  session: Mi007ProfileSummary | null;
  daily: Mi007ProfileSummary | null;
  weekly: Mi007ProfileSummary | null;
  anchored: Mi007ProfileSummary | null;
  pocMigration: 'UP' | 'DOWN' | 'FLAT';
  hvnPrices: number[];
  lvnPrices: number[];
  bins: Mi007VolumeBin[];
  developingPoc: number[]; // causal running POC for recent bars
}

export interface Mi007FibLevel {
  ratio: number;
  label: string;
  price: number;
  isExtension: boolean;
  isOte: boolean;
}

export interface Mi007FibonacciConfluence {
  direction: 'BULLISH' | 'BEARISH';
  swingHigh: { index: number; price: number; time: number };
  swingLow: { index: number; price: number; time: number };
  levels: Mi007FibLevel[];
  equilibrium: number; // 0.50
  oteZone: [number, number]; // [0.618, 0.786]
  oteMid: number; // 0.705
  ext1272: number;
  ext1618: number;
  inPremium: boolean;
  inDiscount: boolean;
  inOteZone: boolean;
}

export interface Mi007TrendFiboPoint {
  index: number;
  price: number;
  time: number;
}

export interface Mi007TrendFiboExtension {
  direction: 'BULLISH' | 'BEARISH';
  pointA: Mi007TrendFiboPoint;
  pointB: Mi007TrendFiboPoint;
  pointC: Mi007TrendFiboPoint;
  entryZone: [number, number];
  levels: Array<{ ratio: number; label: string; price: number }>;
  targetZone: [number, number];
  stopLoss: number;
  channel?: {
    upperStart: Mi007TrendFiboPoint;
    upperEnd: Mi007TrendFiboPoint;
    lowerStart: Mi007TrendFiboPoint;
    lowerEnd: Mi007TrendFiboPoint;
  };
}

export interface Mi007VolumeBubble {
  candleIndex: number;
  time: number;
  price: number;
  volume: number;
  relVolume: number;       // volume / SMA(volume, 20)
  side: 'BUY' | 'SELL';    // Estimated aggressive flow direction from bar delta
  isAbsorption: boolean;   // High volume + rejection wick / small body (passive absorption)
}

export interface Mi007OrderFlowConfirmation {
  volumeQuality: Mi007VolumeQuality;
  confirmed: boolean;
  direction: Mi007Bias;
  barDelta: number;
  cvdTrend: Mi007Bias;
  absorptionDetected: boolean;
  imbalanceDetected: boolean;
  note: string;
}

export interface Mi007ChecklistItem {
  id: string;
  label: string;
  status: 'Confirmed' | 'Pending' | 'Unconfirmed';
  weight: number;
  awarded: number;
  detail: string;
}

export interface Mi007TradeSetup {
  id: string;
  direction: 'BULLISH' | 'BEARISH';
  score: number; // 0..100
  classification: Mi007Classification;
  isTradeable: boolean; // score >= 60 && rr >= 2.0
  entryPrice: number;
  stopLoss: number;
  target1: number; // Nearest opposing liquidity (>= 1:2 RR)
  target2: number; // Next significant liquidity pool
  target3: number; // HTF objective or Fib 1.272/1.618 extension
  riskReward1: number;
  riskReward2: number;
  riskReward3: number;
  candleIndex: number; // Locked confirmation bar index
  timestamp: number;
  status: 'ACTIVE' | 'WAIT_CONFIRMATION' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'SL_HIT';
  outcomeIndex?: number;
  checklist: Mi007ChecklistItem[];
  scoreBreakdown: {
    htfStructure: number;       // max 15
    liquiditySweep: number;     // max 15
    bosMss: number;             // max 15
    orderBlockFvg: number;      // max 15
    volumeProfile: number;      // max 15
    fibonacci: number;          // max 10
    orderFlow: number;          // max 10
    entryCandle: number;        // max 5
  };
  supportingOb?: SmcOrderBlock;
  supportingFvg?: SmcFvg;
  supportingBreak?: SmcStructureBreak;
  supportingSweep?: SmcLiquiditySweep;
}

export interface Mi007AnalysisResult {
  symbol: string;
  timeframe: string;
  computedAt: number;
  closedBarCount: number;
  regime: Mi007MarketRegime;
  smc: SmcAnalysis;
  volumeProfile: Mi007VolumeProfile;
  fibonacci: Mi007FibonacciConfluence | null;
  trendFibo?: Mi007TrendFiboExtension | null;
  orderFlow: Mi007OrderFlowConfirmation;
  volumeBubbles: Mi007VolumeBubble[];
  activeSetup: Mi007TradeSetup | null;
  swings: SmcSwingPoint[];
}
