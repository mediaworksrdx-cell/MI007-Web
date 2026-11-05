// ═══════════════════════════════════════════════════════════════════════════
// QUANTUM AI — MULTI-TIMEFRAME SMC & RESONANCE TRADING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
// Core Strategy Architecture Types:
// 1. Smart Money Concepts (SMC) & Multi-Timeframe Structure (BOS / CHoCH)
// 2. Bullish & Bearish Order Blocks with Invalidation & Retest tracking
// 3. Liquidity Pools & Sweeps
// 4. Premium, Discount & Equilibrium Zones (EQ = (SwingHigh + SwingLow) / 2)
// 5. Volatility Squeeze & Expansion (Bollinger Bands 20/2.0 inside Keltner 20/1.5)
// 6. Momentum Analysis (LinReg(Close - SMA20, 20, 0))
// 7. Trend Strength (ADX 14 with +DI / -DI directional alignment)
// 8. EMA Confirmation (EMA 20)
// 9. Confluence Scoring Engine (Max 9.5, Threshold 7.0)
// 10. Multi-Timeframe Resonance Engine (HTF Bias, MTF Structure, LTF Trigger)
// 11. Automated Risk Management (Entry, SL, TP1 1:1.5, TP2 1:2.5, TP3 1:4.0, Break-Even)
// 12. Quantitative Backtesting & Statistical Performance Reporting
// ═══════════════════════════════════════════════════════════════════════════

export type QuantumMarketRegime = 'TRENDING' | 'RANGING';
export type QuantumVolatilityState = 'SQUEEZE' | 'EXPANSION';
export type QuantumMarketZone = 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
export type QuantumPositionStatus = 'LONG' | 'SHORT' | 'WAIT';

export interface QuantumSwingPoint {
  index: number;
  time: number;
  price: number;
  isHigh: boolean;
  isConfirmed: boolean;
}

export interface QuantumStructureBreak {
  id: string;
  type: 'BOS' | 'CHOCH';
  isBullish: boolean;
  candleIndex: number;
  time: number;
  breakPrice: number;
  originIndex: number;
  originPrice: number;
}

export interface QuantumOrderBlock {
  id: string;
  isBullish: boolean;
  startIndex: number;
  endIndex: number;
  time: number;
  top: number;
  bottom: number;
  impulseVolume: number;
  isMitigated: boolean;
  mitigationIndex?: number;
  isInvalidated: boolean;
  invalidationIndex?: number;
}

export interface QuantumLiquidityPool {
  id: string;
  isHigh: boolean; // High = Buy-Side Liquidity (BSL), Low = Sell-Side Liquidity (SSL)
  price: number;
  candleIndex: number;
  time: number;
  isSwept: boolean;
  sweepIndex?: number;
  sweepPrice?: number;
}

export interface QuantumDealingRange {
  swingHigh: number;
  swingLow: number;
  equilibrium: number; // (SwingHigh + SwingLow) / 2
  currentZone: QuantumMarketZone;
}

export interface QuantumVolatilityMetrics {
  bbUpper: number;
  bbLower: number;
  bbBasis: number;
  kcUpper: number;
  kcLower: number;
  kcBasis: number;
  isSqueeze: boolean;
  squeezeLength: number;
}

export interface QuantumMomentumMetrics {
  rawDiff: number; // Close - SMA20
  linRegMomentum: number; // LinReg(Close - SMA20, 20, 0)
  isPositive: boolean;
}

export interface QuantumTrendMetrics {
  adx: number;
  plusDI: number;
  minusDI: number;
  isTrending: boolean; // ADX >= 25
  directionalAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface QuantumConfluenceScore {
  bullScore: number; // 0 to 9.5
  bearScore: number; // 0 to 9.5
  maxScore: 9.5;
  threshold: number; // default 7.0
  isLongQualified: boolean;
  isShortQualified: boolean;
  breakdown: {
    discountOrPremium: { bull: number; bear: number; weight: 2.0 };
    orderBlock: { bull: number; bear: number; weight: 3.0 };
    momentum: { bull: number; bear: number; weight: 2.0 };
    ema20: { bull: number; bear: number; weight: 1.5 };
    adxTrend: { bull: number; bear: number; weight: 1.0 };
  };
}

export interface QuantumTimeframeLayer {
  timeframe: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  zone: QuantumMarketZone;
  structure: 'BOS_BULL' | 'BOS_BEAR' | 'CHOCH_BULL' | 'CHOCH_BEAR' | 'CONSOLIDATION';
  score: number;
}

export interface QuantumResonanceMetrics {
  htf: QuantumTimeframeLayer; // Higher Timeframe (e.g. 1D / 4H)
  mtf: QuantumTimeframeLayer; // Intermediate Timeframe (e.g. 1H / 15m)
  ltf: QuantumTimeframeLayer; // Lower Timeframe (e.g. 5m / 1m)
  resonancePct: number;       // 0 to 100% cross-timeframe alignment
  overallAlignment: 'STRONG_BULLISH' | 'MODERATE_BULLISH' | 'NEUTRAL' | 'MODERATE_BEARISH' | 'STRONG_BEARISH';
}

export interface QuantumTradeSetup {
  id: string;
  isBullish: boolean;
  candleIndex: number;
  time: number;
  entryPrice: number;
  stopLossPrice: number;
  initialRisk: number; // Math.abs(entry - stopLoss)
  tp1Price: number;    // Entry +/- 1.5 * Risk (33% exit)
  tp2Price: number;    // Entry +/- 2.5 * Risk (33% exit)
  tp3Price: number;    // Entry +/- 4.0 * Risk (34% exit)
  confluenceScore: number;
  isBreakEvenActivated: boolean;
  status: 'PENDING' | 'ACTIVE' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'STOPPED_OUT' | 'CANCELLED';
  conditions: string[];
}

export interface QuantumBacktestTrade {
  id: string;
  type: 'LONG' | 'SHORT';
  entryIndex: number;
  entryTime: number;
  entryPrice: number;
  slPrice: number;
  tp1Price: number;
  tp2Price: number;
  tp3Price: number;
  exitIndex: number;
  exitTime: number;
  exitPrice: number;
  exitReason: 'SL' | 'BREAK_EVEN' | 'TP1' | 'TP2' | 'TP3';
  returnR: number;     // Return measured in initial R units
  profitPct: number;   // Realized percentage return
  realizedPnL: number; // Dollar / currency P&L
  status: 'WIN' | 'LOSS' | 'BREAK_EVEN';
}

export interface QuantumBacktestMetrics {
  initialCapital: number;
  endingCapital: number;
  netProfit: number;
  returnPct: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  breakEvenCount: number;
  winRate: number;      // Percentage
  profitFactor: number; // Gross Profit / Gross Loss
  maxDrawdown: number;  // Currency
  maxDrawdownPct: number;
  averageR: number;     // Average return in initial risk units
  expectancy: number;   // Average expected P&L per trade
  trades: QuantumBacktestTrade[];
}

export interface QuantumStrategyDashboard {
  strategy: 'Quantum AI';
  marketRegime: QuantumMarketRegime;
  volatility: QuantumVolatilityState;
  marketZone: QuantumMarketZone;
  adxValue: number;
  orderBlockStatus: 'Bullish OB' | 'Bearish OB' | 'None';
  bullScore: number;
  bearScore: number;
  position: QuantumPositionStatus;
  resonancePct: number;
}

export interface QuantumAiConfig {
  enabled: boolean;
  confluenceThreshold: number; // default 7.0 (out of 9.5)
  showDashboard: boolean;      // Top-corner visual HUD
  showOrderBlocks: boolean;
  showStructure: boolean;        // BOS and CHoCH lines
  showLiquidity: boolean;        // Liquidity pools & sweeps
  showDealingRange: boolean;   // Premium / Discount / EQ
  showSignals: boolean;        // Buy / Sell entries
  showExecutionLevels: boolean;// Entry, SL, TP1, TP2, TP3 targets
  showEma20: boolean;
  riskReward1: number;         // 1.5
  riskReward2: number;         // 2.5
  riskReward3: number;         // 4.0
  enableBreakEven: boolean;    // Move SL to entry upon TP1 hit
  activeSubTab: QuantumAiSubTab;
}

export type QuantumAiSubTab =
  | 'smc'
  | 'structure'
  | 'orderblocks'
  | 'liquidity'
  | 'premium-discount'
  | 'volatility-momentum'
  | 'resonance'
  | 'confluence'
  | 'signals'
  | 'risk-mgmt'
  | 'backtesting';

export const DEFAULT_QUANTUM_AI_CONFIG: QuantumAiConfig = {
  enabled: false,
  confluenceThreshold: 7.0,
  showDashboard: true,
  showOrderBlocks: true,
  showStructure: true,
  showLiquidity: true,
  showDealingRange: true,
  showSignals: true,
  showExecutionLevels: true,
  showEma20: true,
  riskReward1: 1.5,
  riskReward2: 2.5,
  riskReward3: 4.0,
  enableBreakEven: true,
  activeSubTab: 'smc',
};

export interface QuantumAiAnalysisResult {
  config: QuantumAiConfig;
  dealingRange: QuantumDealingRange;
  volatility: QuantumVolatilityMetrics;
  momentum: QuantumMomentumMetrics;
  trend: QuantumTrendMetrics;
  confluence: QuantumConfluenceScore;
  resonance: QuantumResonanceMetrics;
  orderBlocks: QuantumOrderBlock[];
  structures: QuantumStructureBreak[];
  liquidityPools: QuantumLiquidityPool[];
  setups: QuantumTradeSetup[];
  dashboard: QuantumStrategyDashboard;
  backtest: QuantumBacktestMetrics;
  ema20Series: (number | null)[];
}
