// ─── Market Intelligence Academy Data Models & Datasets ──────────────────

export type MarketCode = 'IN' | 'US' | 'UAE';

export enum EngineInitStatus {
  IDLE = 'IDLE',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export enum AcademyEngineType {
  INSTITUTIONAL_SIMULATION = 'INSTITUTIONAL_SIMULATION',
  NIFTY_50_DYNAMICS = 'NIFTY_50_DYNAMICS',
  BEHAVIORAL_BIAS = 'BEHAVIORAL_BIAS',
  RISK_DISCIPLINE = 'RISK_DISCIPLINE',
  GENERAL = 'GENERAL',
}

export interface TrainingModule {
  id: string;
  title: string;
  duration: string;
  locked: boolean;
  topics: string[];
  description?: string;
  engineType?: AcademyEngineType;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface OptionLeg {
  optionSymbol: string;
  type: 'CE' | 'PE';
  strike: number;
  expiry: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  premium: number;
}

export interface RiskParameters {
  positionSize: number;
  capitalRequired: number;
  marginRequired: number;
  maxLoss: number;
}

export interface AiTradeSignal {
  underlyingSymbol: string;
  strategyName: string;
  marketRegime: string;
  optionLegs: OptionLeg[];
  entryPrice: number;
  target: number;
  stopLoss: number;
  confidenceScore: number;
  riskParameters: RiskParameters;
}

export interface ScannerSignalInfo {
  symbol: string;
  timeframe: string;
  bias: string;
  rationale: string;
  entryPrice: number;
  stopLoss: number;
  target: number;
  confidence: number;
}

export interface NiftyConstituentItem {
  name: string;
  sector: string;
  weight: number;
  currentChangePct: number;
  isSimulatedBullish: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  isMentor: boolean;
  timestamp: string;
}

// ── Modules Catalog by Market ──
export const ACADEMY_MODULES_BY_MARKET: Record<MarketCode, TrainingModule[]> = {
  IN: [
    {
      id: '1',
      title: 'Institutional Simulation Engine',
      duration: '2h',
      locked: false,
      topics: ['Market Intelligence Theory', 'Execution', 'Historical Replay', 'Order Flow Drills'],
      description: 'Institutional-grade order book replay and real-time Greek delta-neutral hedging simulation on NIFTY 50 options.',
      engineType: AcademyEngineType.INSTITUTIONAL_SIMULATION,
    },
    {
      id: '2',
      title: 'NIFTY 50 Dynamics',
      duration: '1h 30m',
      locked: false,
      topics: ['Index Correlation', 'SMC & Liquidity Pools', 'Heavyweight Weightings', 'FII Futures Flow'],
      description: 'Deconstruct constituent sector beta, FII futures positioning, and calculate point impacts of index heavyweights.',
      engineType: AcademyEngineType.NIFTY_50_DYNAMICS,
    },
    {
      id: '3',
      title: 'Behavioral Bias Detection',
      duration: '1h',
      locked: false,
      topics: ['Retail Traps', 'Loss Aversion', 'Volume Analysis', 'Discipline Scoring'],
      description: 'Cognitive distortion scanner with live emotion shield, revenge trading lockout, and real-time discipline scoring.',
      engineType: AcademyEngineType.BEHAVIORAL_BIAS,
    },
    {
      id: '4',
      title: 'Risk Discipline Engine',
      duration: '2h',
      locked: false,
      topics: ['1% Capital Rule', 'Position Sizing', 'Drawdown Kill-Switch', 'MAE / R:R Matrix'],
      description: 'Mathematical position sizing calculator with automated 3.0% daily drawdown circuit breaker trip.',
      engineType: AcademyEngineType.RISK_DISCIPLINE,
    },
  ],
  US: [
    {
      id: '5',
      title: 'Institutional Playbook Library',
      duration: '3h',
      locked: false,
      topics: ['Wall St Tactics', 'Dark Pools', 'VWAP Footprints'],
      description: 'Wall Street institutional volume profiling, lit exchange routing vs off-exchange dark pool blocks.',
      engineType: AcademyEngineType.GENERAL,
    },
    {
      id: '6',
      title: 'Fed Policy Impact',
      duration: '2h',
      locked: false,
      topics: ['Macro Context', 'Interest Rates', 'FOMC Dot Plot'],
      description: 'Federal Reserve balance sheet expansion, quantitative tightening impact, and yield curve inversion models.',
      engineType: AcademyEngineType.GENERAL,
    },
    {
      id: '7',
      title: 'Cross-Asset Context',
      duration: '1h 30m',
      locked: false,
      topics: ['DXY Correlation', '10Y Yields', 'VIX Regimes'],
      description: 'US Dollar Index inverse equity correlations and cross-market flight to quality mechanics.',
      engineType: AcademyEngineType.GENERAL,
    },
    {
      id: '8',
      title: 'Scenario Stress Testing',
      duration: '4h',
      locked: true,
      topics: ['Black Swan Prep', 'Liquidity Shocks', 'Tail-Risk Hedging'],
      description: 'Stress testing institutional portfolios against flash crashes, liquidity freezes, and extreme tail-risk events.',
      engineType: AcademyEngineType.GENERAL,
    },
  ],
  UAE: [
    {
      id: '9',
      title: 'Market Regime Intelligence',
      duration: '1h 30m',
      locked: false,
      topics: ['Volatility Index', 'ADX Regime', 'DFM Microstructure'],
      description: 'Regime classification models for low-volatility sovereign wealth markets and ADX/DFM index telemetry.',
      engineType: AcademyEngineType.GENERAL,
    },
    {
      id: '10',
      title: 'Oil & Real Estate Correlation',
      duration: '2h',
      locked: false,
      topics: ['Sector Flow', 'Macro UAE', 'Brent Crude Beta'],
      description: 'Analyzing Brent crude spot correlations with GCC banking and blue-chip real estate leaders (Emaar, Aldar).',
      engineType: AcademyEngineType.GENERAL,
    },
    {
      id: '11',
      title: 'Governance & Audit',
      duration: '1h',
      locked: false,
      topics: ['Audit Layer', 'Risk Protocol', 'Institutional Compliance'],
      description: 'Sovereign fund audit layers, margin constraints, and regional exchange settlement compliance protocols.',
      engineType: AcademyEngineType.GENERAL,
    },
    {
      id: '12',
      title: 'Outcome Attribution',
      duration: '2h',
      locked: true,
      topics: ['Performance Metrics', 'Sharpe Analysis', 'Alpha Decomposition'],
      description: 'Institutional alpha decomposition, Information Ratio calculation, and transaction cost analysis.',
      engineType: AcademyEngineType.GENERAL,
    },
  ],
};

export function defaultNiftyConstituents(): NiftyConstituentItem[] {
  return [
    { name: 'HDFC Bank', sector: 'BANKING', weight: 13.5, currentChangePct: 1.20, isSimulatedBullish: true },
    { name: 'Reliance Ind', sector: 'OIL & GAS', weight: 9.8, currentChangePct: 0.65, isSimulatedBullish: true },
    { name: 'ICICI Bank', sector: 'BANKING', weight: 8.2, currentChangePct: 1.45, isSimulatedBullish: true },
    { name: 'Infosys', sector: 'IT', weight: 5.9, currentChangePct: -0.40, isSimulatedBullish: false },
    { name: 'TCS', sector: 'IT', weight: 4.1, currentChangePct: 0.15, isSimulatedBullish: true },
    { name: 'Larsen & Toubro', sector: 'INFRA', weight: 3.8, currentChangePct: 0.90, isSimulatedBullish: true },
    { name: 'Kotak Bank', sector: 'BANKING', weight: 3.4, currentChangePct: 0.50, isSimulatedBullish: true },
    { name: 'Axis Bank', sector: 'BANKING', weight: 3.2, currentChangePct: 1.10, isSimulatedBullish: true },
  ];
}

export function defaultFeaturedFnoSignal(): AiTradeSignal {
  return {
    underlyingSymbol: 'NIFTY 50',
    strategyName: 'Bull Call Spread',
    marketRegime: 'TRENDING_BULLISH',
    optionLegs: [
      {
        optionSymbol: 'NIFTY 23600 CE',
        type: 'CE',
        strike: 23600,
        expiry: 'CURRENT',
        action: 'BUY',
        quantity: 50,
        premium: 142.0,
      },
      {
        optionSymbol: 'NIFTY 23750 CE',
        type: 'CE',
        strike: 23750,
        expiry: 'CURRENT',
        action: 'SELL',
        quantity: 50,
        premium: 68.0,
      },
    ],
    entryPrice: 74.0,
    target: 145.0,
    stopLoss: 38.0,
    confidenceScore: 86.5,
    riskParameters: {
      positionSize: 1,
      capitalRequired: 3700.0,
      marginRequired: 18500.0,
      maxLoss: 3700.0,
    },
  };
}

export function defaultScannerSignals(): ScannerSignalInfo[] {
  return [
    {
      symbol: 'RELIANCE',
      timeframe: '1H',
      bias: 'BULLISH',
      rationale: 'Institutional Order Block mitigation at ₹2,940 with volume delta expansion and liquidity pool absorption.',
      entryPrice: 2942.50,
      stopLoss: 2918.00,
      target: 3010.00,
      confidence: 88,
    },
    {
      symbol: 'HDFCBANK',
      timeframe: '15m',
      bias: 'BULLISH',
      rationale: 'Fair Value Gap (FVG) retest at ₹1,648 after liquidity sweep of equal lows with Bullish RSI divergence.',
      entryPrice: 1650.00,
      stopLoss: 1638.00,
      target: 1682.00,
      confidence: 85,
    },
    {
      symbol: 'TCS',
      timeframe: '4H',
      bias: 'BEARISH',
      rationale: 'Change of Character (CHoCH) breakdown at ₹4,120 resistance with aggressive sell-side imbalance.',
      entryPrice: 4115.00,
      stopLoss: 4155.00,
      target: 4020.00,
      confidence: 82,
    },
    {
      symbol: 'NIFTY 50',
      timeframe: '1H',
      bias: 'BULLISH',
      rationale: 'Gamma hedge zone confluence with 23,800 PE put wall open interest buildup.',
      entryPrice: 23820.00,
      stopLoss: 23740.00,
      target: 23980.00,
      confidence: 91,
    },
  ];
}

export const SUGGESTED_MENTOR_QUESTIONS = [
  'Explain Smart Money Concepts (SMC) & Liquidity Pools',
  'How do NIFTY 50 heavyweight weights drive index points?',
  'What is the 1% Capital Allocation Rule and Position Sizing?',
  'How do I detect and neutralize FOMO & Revenge Trading?',
  'Explain Option Greeks: Delta, Gamma, Theta, and Vega',
];
