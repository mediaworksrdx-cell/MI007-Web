import { Candle } from '../types';
import {
  calculateSMC,
  computeAtrSeries,
  resolveSameBarTpSlOrder,
  SmcConfirmedSetup,
  timeframeToMs,
  isCandleClosed,
  inferCandleIntervalMs,
} from '../smcEngine';
import { analyzeMi007Strategy } from './mi007Engine';

export type BacktestStrategyId =
  | 'MI007_CONFLUENCE'
  | 'SMC_OB_FVG'
  | 'SMC_SWEEP_CHOCH'
  | 'SMC_BREAKER_IFVG';

export interface BacktestConfig {
  symbol?: string;
  timeframe?: string;
  strategyId?: BacktestStrategyId;
  directionFilter?: 'BOTH' | 'BULLISH' | 'BEARISH';
  /** Target Risk-to-Reward multiple (e.g. 2.0, 3.0, 4.0) */
  targetRR?: number;
  /** Initial account equity for drawdown & return calculation */
  initialCapital?: number;
  /** Risk per trade as % of equity (e.g. 1.0 = 1%) */
  riskPerTradePct?: number;
  /** Brokerage fee per side in basis points (e.g. 5 bps = 0.05%) */
  brokerageBps?: number;
  /** Estimated slippage per side in basis points (e.g. 5 bps = 0.05%) */
  slippageBps?: number;
  /** Transaction tax / statutory levy on exit in basis points */
  transactionCostBps?: number;
  /** Max bars to hold an open trade before time-expiry */
  maxHoldBars?: number;
  /** Walk-forward evaluation step (1 = every bar, 2 = every 2nd bar for speed) */
  stepBars?: number;
}

export interface BacktestTrade {
  id: string;
  strategyId: BacktestStrategyId;
  direction: 'BULLISH' | 'BEARISH';
  signalIndex: number;
  entryIndex: number;
  exitIndex: number;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number;
  outcome: 'WIN' | 'LOSS' | 'EXPIRED';
  grossR: number;
  netR: number;
  costR: number;
  pnlAbs: number;
  marketCondition: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING';
  volatilityState: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface MarketConditionStats {
  condition: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING';
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  netR: number;
}

export interface Mi007BacktestResult {
  symbol: string;
  timeframe: string;
  strategyId: BacktestStrategyId;
  targetRR: number;
  barsSimulated: number;
  initialCapital: number;
  finalCapital: number;
  netReturnPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  expiredTrades: number;
  winRate: number;       // 0..100
  lossRate: number;      // 0..100
  profitFactor: number;
  maxDrawdownPct: number;
  maxDrawdownAbs: number;
  averageRR: number;
  expectancyR: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  totalCostsAbs: number;
  bullishStats: { trades: number; winRate: number; netR: number };
  bearishStats: { trades: number; winRate: number; netR: number };
  conditionBreakdown: MarketConditionStats[];
  trades: BacktestTrade[];
  equityCurve: Array<{ index: number; time: number; equity: number }>;
}

export interface StrategyRankingEntry {
  rank: number;
  strategyId: BacktestStrategyId;
  label: string;
  targetRR: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  expectancyR: number;
  maxDrawdownPct: number;
  netReturnPct: number;
  compositeScore: number;
}

const STRATEGY_LABELS: Record<BacktestStrategyId, string> = {
  MI007_CONFLUENCE: 'MI-007 Full Confluence',
  SMC_OB_FVG: 'SMC Order Block + FVG',
  SMC_SWEEP_CHOCH: 'SMC Liquidity Sweep + CHoCH',
  SMC_BREAKER_IFVG: 'SMC Breaker + Inverse FVG',
};

function classifyRegimeAt(
  candles: Candle[],
  idx: number,
  atrSeries: number[],
  smcBias: 'BULLISH' | 'BEARISH' | 'RANGE'
): { condition: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING'; vol: 'LOW' | 'NORMAL' | 'HIGH' } {
  const condition: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' =
    smcBias === 'BULLISH' ? 'TRENDING_UP' : smcBias === 'BEARISH' ? 'TRENDING_DOWN' : 'RANGING';

  const price = Math.max(1e-9, candles[idx]?.close ?? 1);
  const atr = atrSeries[idx] ?? 0;
  const atrPct = (atr / price) * 100;
  const vol: 'LOW' | 'NORMAL' | 'HIGH' =
    atrPct < 0.8 ? 'LOW' : atrPct > 2.2 ? 'HIGH' : 'NORMAL';

  return { condition, vol };
}

function selectSetupForStrategy(
  strategyId: BacktestStrategyId,
  slice: Candle[],
  symbol: string,
  timeframe: string
): {
  direction: 'BULLISH' | 'BEARISH';
  entryPrice: number;
  stopLoss: number;
  bias: 'BULLISH' | 'BEARISH' | 'RANGE';
} | null {
  if (strategyId === 'MI007_CONFLUENCE') {
    const res = analyzeMi007Strategy(slice, { symbol, timeframe });
    if (!res || !res.activeSetup || !res.activeSetup.isTradeable) return null;
    return {
      direction: res.activeSetup.direction,
      entryPrice: res.activeSetup.entryPrice,
      stopLoss: res.activeSetup.stopLoss,
      bias: res.smc.ltfBias ?? 'RANGE',
    };
  }

  const smc = calculateSMC(slice, { enabled: true }, symbol, timeframe);
  const setups: SmcConfirmedSetup[] = smc.confirmedSetups || [];
  const bias = smc.ltfBias ?? 'RANGE';

  let match: SmcConfirmedSetup | undefined;
  if (strategyId === 'SMC_OB_FVG') {
    match = setups.find((s) =>
      s.setupType.includes('OB') || s.setupType.includes('FVG')
    );
  } else if (strategyId === 'SMC_SWEEP_CHOCH') {
    match = setups.find((s) =>
      s.setupType.includes('SWEEP') || s.setupType.includes('CHOCH') || s.setupType.includes('LIQUIDITY')
    );
  } else if (strategyId === 'SMC_BREAKER_IFVG') {
    match = setups.find((s) =>
      s.setupType.includes('BREAKER') || s.setupType.includes('IFVG')
    );
  }

  if (!match) return null;
  return {
    direction: match.direction,
    entryPrice: match.entryPrice,
    stopLoss: match.stopLoss,
    bias,
  };
}

/**
 * Run a causal, candle-by-candle historical backtest for MI-007 & SMC strategies.
 * Strictly avoids look-ahead bias, uses conservative same-bar SL-first resolution,
 * and deducts brokerage, slippage, and transaction costs.
 */
export function runMi007Backtest(
  candles: Candle[],
  config: BacktestConfig = {}
): Mi007BacktestResult {
  const symbol = config.symbol || 'UNKNOWN';
  const timeframe = config.timeframe || '1D';
  const strategyId: BacktestStrategyId = config.strategyId || 'MI007_CONFLUENCE';
  const directionFilter = config.directionFilter || 'BOTH';
  const targetRR = Math.max(1.0, config.targetRR ?? 2.5);
  const initialCapital = Math.max(100, config.initialCapital ?? 100_000);
  const riskPerTradePct = Math.max(0.1, Math.min(10, config.riskPerTradePct ?? 1.0));
  const brokerageBps = Math.max(0, config.brokerageBps ?? 5);
  const slippageBps = Math.max(0, config.slippageBps ?? 5);
  const transactionCostBps = Math.max(0, config.transactionCostBps ?? 3);
  const maxHoldBars = Math.max(5, config.maxHoldBars ?? 40);
  const stepBars = Math.max(1, config.stepBars ?? 2);

  const tfMs = config.timeframe ? timeframeToMs(config.timeframe) : inferCandleIntervalMs(candles);
  const nowMs = Date.now();
  const closed = candles.filter((c) => isCandleClosed(c, tfMs, nowMs));

  const emptyResult: Mi007BacktestResult = {
    symbol,
    timeframe,
    strategyId,
    targetRR,
    barsSimulated: closed.length,
    initialCapital,
    finalCapital: initialCapital,
    netReturnPct: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    expiredTrades: 0,
    winRate: 0,
    lossRate: 0,
    profitFactor: 0,
    maxDrawdownPct: 0,
    maxDrawdownAbs: 0,
    averageRR: 0,
    expectancyR: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    totalCostsAbs: 0,
    bullishStats: { trades: 0, winRate: 0, netR: 0 },
    bearishStats: { trades: 0, winRate: 0, netR: 0 },
    conditionBreakdown: [],
    trades: [],
    equityCurve: [{ index: 0, time: closed[0]?.openTime ?? 0, equity: initialCapital }],
  };

  if (closed.length < 60) return emptyResult;

  const atrSeries = computeAtrSeries(closed, 14);
  const trades: BacktestTrade[] = [];
  const equityCurve: Array<{ index: number; time: number; equity: number }> = [
    { index: 49, time: closed[49].openTime, equity: initialCapital },
  ];

  let equity = initialCapital;
  let peakEquity = initialCapital;
  let maxDrawdownAbs = 0;
  let maxDrawdownPct = 0;
  let totalCostsAbs = 0;

  // Round-trip cost rate in decimal (entry brokerage+slippage + exit brokerage+slippage+tax)
  const totalCostRate = (2 * brokerageBps + 2 * slippageBps + transactionCostBps) / 10_000;

  let i = 50;
  while (i < closed.length - 2) {
    const slice = closed.slice(0, i + 1);
    const signal = selectSetupForStrategy(strategyId, slice, symbol, timeframe);

    if (!signal) {
      i += stepBars;
      continue;
    }

    if (directionFilter !== 'BOTH' && signal.direction !== directionFilter) {
      i += stepBars;
      continue;
    }

    const isBull = signal.direction === 'BULLISH';
    const rawEntry = signal.entryPrice;
    const sl = signal.stopLoss;
    const riskDist = isBull ? rawEntry - sl : sl - rawEntry;

    if (!Number.isFinite(riskDist) || riskDist <= 0 || rawEntry <= 0) {
      i += stepBars;
      continue;
    }

    // Apply entry slippage
    const slipFrac = slippageBps / 10_000;
    const entryPrice = isBull ? rawEntry * (1 + slipFrac) : rawEntry * (1 - slipFrac);
    const takeProfit = isBull ? entryPrice + riskDist * targetRR : entryPrice - riskDist * targetRR;
    if (takeProfit <= 0 || sl <= 0) {
      i += stepBars;
      continue;
    }

    // Wait up to 8 bars for entry fill (or immediate market fill if price is already within 0.25 ATR)
    const atrNow = atrSeries[i] || riskDist;
    let entryIndex = -1;
    for (let k = i + 1; k <= Math.min(closed.length - 1, i + 8); k++) {
      const bar = closed[k];
      const touched = isBull ? bar.low <= rawEntry : bar.high >= rawEntry;
      const near = Math.abs(bar.open - rawEntry) <= atrNow * 0.25;
      if (touched || near) {
        entryIndex = k;
        break;
      }
    }

    if (entryIndex === -1 || entryIndex >= closed.length - 1) {
      i += stepBars;
      continue;
    }

    // Simulate bar-by-bar exit from entryIndex + 1
    let exitIndex = Math.min(closed.length - 1, entryIndex + maxHoldBars);
    let exitPrice = closed[exitIndex].close;
    let outcome: 'WIN' | 'LOSS' | 'EXPIRED' = 'EXPIRED';

    for (let k = entryIndex + 1; k <= Math.min(closed.length - 1, entryIndex + maxHoldBars); k++) {
      const bar = closed[k];
      const hitTp = isBull ? bar.high >= takeProfit : bar.low <= takeProfit;
      const hitSl = isBull ? bar.low <= sl : bar.high >= sl;

      if (hitTp && hitSl) {
        const nextOpen = closed[k + 1]?.openTime ?? bar.openTime + tfMs;
        const res = resolveSameBarTpSlOrder(bar, nextOpen, isBull, sl, takeProfit);
        if (res.order === 'TP_FIRST') {
          outcome = 'WIN';
          exitPrice = takeProfit;
        } else {
          outcome = 'LOSS';
          exitPrice = sl;
        }
        exitIndex = k;
        break;
      } else if (hitSl) {
        outcome = 'LOSS';
        exitPrice = sl;
        exitIndex = k;
        break;
      } else if (hitTp) {
        outcome = 'WIN';
        exitPrice = takeProfit;
        exitIndex = k;
        break;
      }
    }

    const grossR = isBull
      ? (exitPrice - entryPrice) / riskDist
      : (entryPrice - exitPrice) / riskDist;

    const riskDollars = equity * (riskPerTradePct / 100);
    const positionNotional = (riskDollars / riskDist) * entryPrice;
    const tradeCostAbs = positionNotional * totalCostRate;
    const costR = riskDollars > 0 ? tradeCostAbs / riskDollars : 0;
    const netR = grossR - costR;
    const pnlAbs = netR * riskDollars;

    equity = Math.max(0, equity + pnlAbs);
    totalCostsAbs += tradeCostAbs;

    if (equity > peakEquity) peakEquity = equity;
    const ddAbs = peakEquity - equity;
    const ddPct = peakEquity > 0 ? (ddAbs / peakEquity) * 100 : 0;
    if (ddAbs > maxDrawdownAbs) maxDrawdownAbs = ddAbs;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

    const { condition, vol } = classifyRegimeAt(closed, entryIndex, atrSeries, signal.bias);

    trades.push({
      id: `bt-${strategyId}-${trades.length + 1}`,
      strategyId,
      direction: signal.direction,
      signalIndex: i,
      entryIndex,
      exitIndex,
      entryTime: closed[entryIndex].openTime,
      exitTime: closed[exitIndex].openTime,
      entryPrice: Number(entryPrice.toFixed(4)),
      stopLoss: Number(sl.toFixed(4)),
      takeProfit: Number(takeProfit.toFixed(4)),
      exitPrice: Number(exitPrice.toFixed(4)),
      outcome,
      grossR: Number(grossR.toFixed(3)),
      netR: Number(netR.toFixed(3)),
      costR: Number(costR.toFixed(3)),
      pnlAbs: Number(pnlAbs.toFixed(2)),
      marketCondition: condition,
      volatilityState: vol,
    });

    equityCurve.push({
      index: exitIndex,
      time: closed[exitIndex].openTime,
      equity: Number(equity.toFixed(2)),
    });

    // Advance past exitIndex to avoid overlapping duplicate signals
    i = exitIndex + 1;
  }

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.netR > 0).length;
  const losingTrades = trades.filter((t) => t.netR <= 0).length;
  const expiredTrades = trades.filter((t) => t.outcome === 'EXPIRED').length;
  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(2)) : 0;
  const lossRate = totalTrades > 0 ? Number(((losingTrades / totalTrades) * 100).toFixed(2)) : 0;

  const grossWinsR = trades.filter((t) => t.netR > 0).reduce((s, t) => s + t.netR, 0);
  const grossLossesR = Math.abs(trades.filter((t) => t.netR <= 0).reduce((s, t) => s + t.netR, 0));
  const profitFactor =
    grossLossesR > 0 ? Number((grossWinsR / grossLossesR).toFixed(2)) : grossWinsR > 0 ? 99.99 : 0;

  const totalNetR = trades.reduce((s, t) => s + t.netR, 0);
  const expectancyR = totalTrades > 0 ? Number((totalNetR / totalTrades).toFixed(3)) : 0;
  const avgWinR = winningTrades > 0 ? grossWinsR / winningTrades : 0;
  const avgLossR = losingTrades > 0 ? grossLossesR / losingTrades : 1;
  const averageRR = avgLossR > 0 ? Number((avgWinR / avgLossR).toFixed(2)) : Number(avgWinR.toFixed(2));

  let curWins = 0;
  let curLosses = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  for (const t of trades) {
    if (t.netR > 0) {
      curWins++;
      curLosses = 0;
      if (curWins > maxConsecutiveWins) maxConsecutiveWins = curWins;
    } else {
      curLosses++;
      curWins = 0;
      if (curLosses > maxConsecutiveLosses) maxConsecutiveLosses = curLosses;
    }
  }

  const dirStats = (dir: 'BULLISH' | 'BEARISH') => {
    const sub = trades.filter((t) => t.direction === dir);
    const w = sub.filter((t) => t.netR > 0).length;
    return {
      trades: sub.length,
      winRate: sub.length > 0 ? Number(((w / sub.length) * 100).toFixed(2)) : 0,
      netR: Number(sub.reduce((s, t) => s + t.netR, 0).toFixed(2)),
    };
  };

  const conditions: Array<'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING'> = [
    'TRENDING_UP',
    'TRENDING_DOWN',
    'RANGING',
  ];
  const conditionBreakdown: MarketConditionStats[] = conditions.map((cond) => {
    const sub = trades.filter((t) => t.marketCondition === cond);
    const w = sub.filter((t) => t.netR > 0).length;
    const l = sub.length - w;
    const gw = sub.filter((t) => t.netR > 0).reduce((s, t) => s + t.netR, 0);
    const gl = Math.abs(sub.filter((t) => t.netR <= 0).reduce((s, t) => s + t.netR, 0));
    return {
      condition: cond,
      trades: sub.length,
      wins: w,
      losses: l,
      winRate: sub.length > 0 ? Number(((w / sub.length) * 100).toFixed(2)) : 0,
      profitFactor: gl > 0 ? Number((gw / gl).toFixed(2)) : gw > 0 ? 99.99 : 0,
      netR: Number(sub.reduce((s, t) => s + t.netR, 0).toFixed(2)),
    };
  });

  const netReturnPct = Number((((equity - initialCapital) / initialCapital) * 100).toFixed(2));

  return {
    symbol,
    timeframe,
    strategyId,
    targetRR,
    barsSimulated: closed.length,
    initialCapital,
    finalCapital: Number(equity.toFixed(2)),
    netReturnPct,
    totalTrades,
    winningTrades,
    losingTrades,
    expiredTrades,
    winRate,
    lossRate,
    profitFactor,
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    maxDrawdownAbs: Number(maxDrawdownAbs.toFixed(2)),
    averageRR,
    expectancyR,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    totalCostsAbs: Number(totalCostsAbs.toFixed(2)),
    bullishStats: dirStats('BULLISH'),
    bearishStats: dirStats('BEARISH'),
    conditionBreakdown,
    trades,
    equityCurve,
  };
}

/**
 * Compare and rank all 4 MI-007 & SMC strategies across the given historical dataset.
 */
export function compareMi007Strategies(
  candles: Candle[],
  baseConfig: Omit<BacktestConfig, 'strategyId'> = {}
): {
  rankings: StrategyRankingEntry[];
  results: Record<BacktestStrategyId, Mi007BacktestResult>;
} {
  const ids: BacktestStrategyId[] = [
    'MI007_CONFLUENCE',
    'SMC_OB_FVG',
    'SMC_SWEEP_CHOCH',
    'SMC_BREAKER_IFVG',
  ];

  const results = {} as Record<BacktestStrategyId, Mi007BacktestResult>;
  const entries: Omit<StrategyRankingEntry, 'rank'>[] = [];

  for (const id of ids) {
    const res = runMi007Backtest(candles, { ...baseConfig, strategyId: id });
    results[id] = res;
    // Composite institutional score: balances expectancy, profit factor, win rate, and low drawdown
    const compositeScore =
      res.totalTrades === 0
        ? 0
        : Number(
            (
              res.expectancyR * 35 +
              Math.min(res.profitFactor, 5) * 12 +
              res.winRate * 0.35 -
              res.maxDrawdownPct * 0.8
            ).toFixed(2)
          );

    entries.push({
      strategyId: id,
      label: STRATEGY_LABELS[id],
      targetRR: res.targetRR,
      totalTrades: res.totalTrades,
      winRate: res.winRate,
      profitFactor: res.profitFactor,
      expectancyR: res.expectancyR,
      maxDrawdownPct: res.maxDrawdownPct,
      netReturnPct: res.netReturnPct,
      compositeScore,
    });
  }

  entries.sort((a, b) => b.compositeScore - a.compositeScore);
  const rankings: StrategyRankingEntry[] = entries.map((e, idx) => ({
    rank: idx + 1,
    ...e,
  }));

  return { rankings, results };
}
