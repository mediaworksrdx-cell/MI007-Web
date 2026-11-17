// ═══════════════════════════════════════════════════════════════════════════
// QUANTUM AI — QUANTITATIVE BACKTESTING & PERFORMANCE ANALYTICS ENGINE
// ═══════════════════════════════════════════════════════════════════════════

import { Candle } from '../types';
import {
  QuantumAiConfig,
  QuantumBacktestMetrics,
  QuantumBacktestTrade,
} from './types';
import {
  calculateAtr,
  calculateDealingRange,
  calculateMomentum,
  calculateAdx,
  calculateEma,
  detectSwings,
  detectStructureBreaks,
  detectOrderBlocks,
  calculateConfluence,
} from './quantumAiEngine';

export interface QuantumBacktestCosts {
  commissionPct?: number; // per side (default 0.0004 = 4 bps)
  slippagePct?: number;   // per side (default 0.0005 = 5 bps)
}

export function runQuantumBacktest(
  rawCandles: Candle[],
  config: QuantumAiConfig,
  initialCapital: number = 100000,
  riskPerTradePct: number = 0.01, // 1% risk per trade
  costs: QuantumBacktestCosts = {}
): QuantumBacktestMetrics {
  const commissionPct = costs.commissionPct ?? 0.0004;
  const slippagePct = costs.slippagePct ?? 0.0005;
  const candles = (rawCandles || []).filter(c => c && c.isClosed !== false);

  const emptyMetrics: QuantumBacktestMetrics = {
    initialCapital,
    endingCapital: initialCapital,
    netProfit: 0,
    returnPct: 0,
    totalTrades: 0,
    winCount: 0,
    lossCount: 0,
    breakEvenCount: 0,
    winRate: 0,
    profitFactor: 1.0,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    averageR: 0,
    expectancy: 0,
    trades: [],
  };

  if (!candles || candles.length < 30) return emptyMetrics;

  const closes = candles.map(c => c.close);
  const ema20Series = calculateEma(closes, 20);
  const atrSeries = calculateAtr(candles, 14);
  const swings = detectSwings(candles, 5);
  // Q2: Uncapped structure breaks & order blocks so full history is backtested
  const structures = detectStructureBreaks(candles, swings, null);
  const orderBlocks = detectOrderBlocks(candles, structures, null);

  let capital = initialCapital;
  let peakCapital = initialCapital;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  let totalCostsPaid = 0;

  const updateDrawdown = (equity: number) => {
    if (equity > peakCapital) peakCapital = equity;
    const dd = peakCapital - equity;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPct = peakCapital > 0 ? +((dd / peakCapital) * 100).toFixed(2) : 0;
    }
  };

  const trades: QuantumBacktestTrade[] = [];
  let inPosition: {
    type: 'LONG' | 'SHORT';
    entryIndex: number;
    entryTime: number;
    entryPrice: number;
    slPrice: number;
    tp1Price: number;
    tp2Price: number;
    tp3Price: number;
    initialRisk: number;
    shares: number;
    tp1Hit: boolean;
    tp2Hit: boolean;
    realizedPnL: number;
  } | null = null;

  for (let i = 25; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    // ── Manage Open Position ──
    if (inPosition) {
      const pos = inPosition;
      let exitPrice = 0;
      let exitReason: 'SL' | 'BREAK_EVEN' | 'TP1' | 'TP2' | 'TP3' | 'OPEN_MTM' | null = null;

      // Track intrabar worst-case equity drawdown while position is open
      const remFracBefore = 1 - (pos.tp1Hit ? 0.33 : 0) - (pos.tp2Hit ? 0.33 : 0);
      const worstUnrealized = pos.type === 'LONG'
        ? (c.low - pos.entryPrice) * (pos.shares * remFracBefore)
        : (pos.entryPrice - c.high) * (pos.shares * remFracBefore);
      updateDrawdown(capital + worstUnrealized);

      if (pos.type === 'LONG') {
        // 1. Check Stop Loss first (worst-case intrabar ordering)
        if (c.low <= pos.slPrice) {
          exitPrice = pos.slPrice * (1 - slippagePct);
          exitReason = pos.tp1Hit && config.enableBreakEven ? 'BREAK_EVEN' : 'SL';
        } else {
          // 2. Process targets sequentially in one bar (if, not else if) with explicit 33/33/34 tranche sizing
          if (!pos.tp1Hit && c.high >= pos.tp1Price) {
            pos.tp1Hit = true;
            const trancheShares = pos.shares * 0.33;
            const execPrice = pos.tp1Price * (1 - slippagePct);
            const fee = execPrice * trancheShares * commissionPct;
            totalCostsPaid += fee;
            const pnl1 = (execPrice - pos.entryPrice) * trancheShares - fee;
            pos.realizedPnL += pnl1;
            capital += pnl1;
            if (config.enableBreakEven) {
              pos.slPrice = pos.entryPrice;
            }
          }
          if (!pos.tp2Hit && c.high >= pos.tp2Price) {
            pos.tp2Hit = true;
            const trancheShares = pos.shares * 0.33;
            const execPrice = pos.tp2Price * (1 - slippagePct);
            const fee = execPrice * trancheShares * commissionPct;
            totalCostsPaid += fee;
            const pnl2 = (execPrice - pos.entryPrice) * trancheShares - fee;
            pos.realizedPnL += pnl2;
            capital += pnl2;
          }
          if (c.high >= pos.tp3Price) {
            exitPrice = pos.tp3Price * (1 - slippagePct);
            exitReason = 'TP3';
          }
        }
      } else {
        // SHORT Position
        if (c.high >= pos.slPrice) {
          exitPrice = pos.slPrice * (1 + slippagePct);
          exitReason = pos.tp1Hit && config.enableBreakEven ? 'BREAK_EVEN' : 'SL';
        } else {
          if (!pos.tp1Hit && c.low <= pos.tp1Price) {
            pos.tp1Hit = true;
            const trancheShares = pos.shares * 0.33;
            const execPrice = pos.tp1Price * (1 + slippagePct);
            const fee = execPrice * trancheShares * commissionPct;
            totalCostsPaid += fee;
            const pnl1 = (pos.entryPrice - execPrice) * trancheShares - fee;
            pos.realizedPnL += pnl1;
            capital += pnl1;
            if (config.enableBreakEven) {
              pos.slPrice = pos.entryPrice;
            }
          }
          if (!pos.tp2Hit && c.low <= pos.tp2Price) {
            pos.tp2Hit = true;
            const trancheShares = pos.shares * 0.33;
            const execPrice = pos.tp2Price * (1 + slippagePct);
            const fee = execPrice * trancheShares * commissionPct;
            totalCostsPaid += fee;
            const pnl2 = (pos.entryPrice - execPrice) * trancheShares - fee;
            pos.realizedPnL += pnl2;
            capital += pnl2;
          }
          if (c.low <= pos.tp3Price) {
            exitPrice = pos.tp3Price * (1 + slippagePct);
            exitReason = 'TP3';
          }
        }
      }

      // Close remaining shares if stopped out or TP3 hit
      if (exitReason) {
        const remainingFrac = 1 - (pos.tp1Hit ? 0.33 : 0) - (pos.tp2Hit ? 0.33 : 0);
        const remainingShares = pos.shares * remainingFrac;
        const exitFee = exitPrice * remainingShares * commissionPct;
        totalCostsPaid += exitFee;
        const finalPnL = (pos.type === 'LONG'
          ? (exitPrice - pos.entryPrice) * remainingShares
          : (pos.entryPrice - exitPrice) * remainingShares) - exitFee;

        const totalPnL = pos.realizedPnL + finalPnL;
        capital += finalPnL;

        const riskDollars = Math.max(1e-9, pos.initialRisk * pos.shares);
        const returnR = +(totalPnL / riskDollars).toFixed(4);
        const profitPct = +((totalPnL / initialCapital) * 100).toFixed(2);

        trades.push({
          id: `trade-${pos.entryIndex}`,
          type: pos.type,
          entryIndex: pos.entryIndex,
          entryTime: pos.entryTime,
          entryPrice: pos.entryPrice,
          slPrice: pos.slPrice,
          tp1Price: pos.tp1Price,
          tp2Price: pos.tp2Price,
          tp3Price: pos.tp3Price,
          exitIndex: i,
          exitTime: c.openTime,
          exitPrice,
          exitReason,
          returnR: +returnR.toFixed(2),
          profitPct,
          realizedPnL: +totalPnL.toFixed(4),
          status: returnR > 0.05 ? 'WIN' : returnR < -0.05 ? 'LOSS' : 'BREAK_EVEN',
        });

        updateDrawdown(capital);
        inPosition = null;
      }
    }

    // ── Evaluate New Entry if flat ──
    if (!inPosition && i < candles.length - 1) {
      const subCandles = candles.slice(0, i + 1);
      const dRange = calculateDealingRange(subCandles, 40);
      const mom = calculateMomentum(subCandles);
      const trend = calculateAdx(subCandles, 14);
      // Q1: Strict point-in-time OB filter (alive at bar i by construction, zero future hindsight)
      const subOBs = orderBlocks
        .filter(o => (o.confirmationIndex ?? o.startIndex + 1) < i)
        .filter(o => o.invalidationIndex === undefined || o.invalidationIndex > i)
        .map(o => ({
          ...o,
          isInvalidated: false,
          isMitigated: o.mitigationIndex !== undefined && o.mitigationIndex < i,
        }));

      const conf = calculateConfluence(subCandles, dRange, subOBs, mom, trend, ema20Series[i], config.confluenceThreshold, atrSeries[i]);
      const atrPad = Math.max((atrSeries[i] ?? 0) * 0.25, c.close * 0.0005);

      // Long Entry: Bullish qualification & prior candle was red
      if (conf.isLongQualified && prevC.close <= prevC.open) {
        const recentLow = Math.min(...subCandles.slice(-10).map(b => b.low));
        const entry = c.close * (1 + slippagePct);
        const sl = recentLow - atrPad;
        const initialRisk = entry - sl;

        if (initialRisk > 0) {
          const dollarRisk = capital * riskPerTradePct;
          const shares = Math.max(1e-6, dollarRisk / initialRisk);
          const entryFee = entry * shares * commissionPct;
          totalCostsPaid += entryFee;
          capital -= entryFee;
          inPosition = {
            type: 'LONG',
            entryIndex: i,
            entryTime: c.openTime,
            entryPrice: entry,
            slPrice: sl,
            tp1Price: entry + initialRisk * config.riskReward1,
            tp2Price: entry + initialRisk * config.riskReward2,
            tp3Price: entry + initialRisk * config.riskReward3,
            initialRisk,
            shares,
            tp1Hit: false,
            tp2Hit: false,
            realizedPnL: -entryFee,
          };
        }
      }
      // Short Entry: Bearish qualification & prior candle was green
      else if (conf.isShortQualified && prevC.close >= prevC.open) {
        const recentHigh = Math.max(...subCandles.slice(-10).map(b => b.high));
        const entry = c.close * (1 - slippagePct);
        const sl = recentHigh + atrPad;
        const initialRisk = sl - entry;

        if (initialRisk > 0) {
          const dollarRisk = capital * riskPerTradePct;
          const shares = Math.max(1e-6, dollarRisk / initialRisk);
          const entryFee = entry * shares * commissionPct;
          totalCostsPaid += entryFee;
          capital -= entryFee;
          inPosition = {
            type: 'SHORT',
            entryIndex: i,
            entryTime: c.openTime,
            entryPrice: entry,
            slPrice: sl,
            tp1Price: entry - initialRisk * config.riskReward1,
            tp2Price: entry - initialRisk * config.riskReward2,
            tp3Price: entry - initialRisk * config.riskReward3,
            initialRisk,
            shares,
            tp1Hit: false,
            tp2Hit: false,
            realizedPnL: -entryFee,
          };
        }
      }
    }
  }

  // Q3: Close / mark-to-market any open position at the final closed bar so sum(trade.realizedPnL) === netProfit
  if (inPosition) {
    const pos = inPosition;
    const lastIdx = candles.length - 1;
    const lastBar = candles[lastIdx];
    const remainingFrac = 1 - (pos.tp1Hit ? 0.33 : 0) - (pos.tp2Hit ? 0.33 : 0);
    const remainingShares = pos.shares * remainingFrac;
    const mtmExitPrice = pos.type === 'LONG'
      ? lastBar.close * (1 - slippagePct)
      : lastBar.close * (1 + slippagePct);
    const exitFee = mtmExitPrice * remainingShares * commissionPct;
    totalCostsPaid += exitFee;
    const finalPnL = (pos.type === 'LONG'
      ? (mtmExitPrice - pos.entryPrice) * remainingShares
      : (pos.entryPrice - mtmExitPrice) * remainingShares) - exitFee;
    const totalPnL = pos.realizedPnL + finalPnL;
    capital += finalPnL;

    const riskDollars = Math.max(1e-9, pos.initialRisk * pos.shares);
    const returnR = +(totalPnL / riskDollars).toFixed(4);
    trades.push({
      id: `trade-${pos.entryIndex}`,
      type: pos.type,
      entryIndex: pos.entryIndex,
      entryTime: pos.entryTime,
      entryPrice: pos.entryPrice,
      slPrice: pos.slPrice,
      tp1Price: pos.tp1Price,
      tp2Price: pos.tp2Price,
      tp3Price: pos.tp3Price,
      exitIndex: lastIdx,
      exitTime: lastBar.openTime,
      exitPrice: mtmExitPrice,
      exitReason: 'OPEN_MTM',
      returnR: +returnR.toFixed(2),
      profitPct: +((totalPnL / initialCapital) * 100).toFixed(2),
      realizedPnL: +totalPnL.toFixed(4),
      status: returnR > 0.05 ? 'WIN' : returnR < -0.05 ? 'LOSS' : 'BREAK_EVEN',
    });
    updateDrawdown(capital);
    inPosition = null;
  }

  // Final Summary Calculations
  const totalTrades = trades.length;
  const winCount = trades.filter(t => t.status === 'WIN').length;
  const lossCount = trades.filter(t => t.status === 'LOSS').length;
  const breakEvenCount = trades.filter(t => t.status === 'BREAK_EVEN').length;

  const winRate = totalTrades > 0 ? +((winCount / totalTrades) * 100).toFixed(1) : 0;
  const netProfit = +(capital - initialCapital).toFixed(2);
  const returnPct = +((netProfit / initialCapital) * 100).toFixed(2);

  const grossProfit = trades.filter(t => t.realizedPnL > 0).reduce((acc, t) => acc + t.realizedPnL, 0);
  const grossLoss = Math.abs(trades.filter(t => t.realizedPnL < 0).reduce((acc, t) => acc + t.realizedPnL, 0));
  const profitFactor = grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 99.0 : 1.0;

  const averageR = totalTrades > 0
    ? +(trades.reduce((acc, t) => acc + t.returnR, 0) / totalTrades).toFixed(2)
    : 0;

  const expectancy = totalTrades > 0 ? +(netProfit / totalTrades).toFixed(2) : 0;

  return {
    initialCapital,
    endingCapital: +capital.toFixed(2),
    netProfit,
    returnPct,
    totalTrades,
    winCount,
    lossCount,
    breakEvenCount,
    winRate,
    profitFactor,
    maxDrawdown: +maxDrawdown.toFixed(2),
    maxDrawdownPct,
    averageR,
    expectancy,
    trades: trades.reverse(), // Newest first
    tradedStartTime: candles[25]?.openTime,
    tradedEndTime: candles[candles.length - 1]?.openTime,
    totalCostsPaid: +totalCostsPaid.toFixed(2),
  };
}

// ── Pine Script v5 Code Generator ──────────────────────────────────────────

export function generatePineScriptCode(config: QuantumAiConfig): string {
  return `//@version=5
strategy("Quantitative SMC Rule Engine (1% Risk)", overlay=true, initial_capital=100000, default_qty_type=strategy.percent_of_equity, default_qty_value=1, commission_type=strategy.commission.percent, commission_value=0.04, slippage=1)

// ═══════════════════════════════════════════════════════════════════════════
// 1. INPUT PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════
threshold = input.float(${config.confluenceThreshold.toFixed(1)}, "Confluence Threshold (out of 9.5)", minval=5.0, maxval=9.5)
rr1 = input.float(${config.riskReward1.toFixed(1)}, "TP1 Risk-Reward Ratio", minval=1.0)
rr2 = input.float(${config.riskReward2.toFixed(1)}, "TP2 Risk-Reward Ratio", minval=2.0)
rr3 = input.float(${config.riskReward3.toFixed(1)}, "TP3 Risk-Reward Ratio", minval=3.0)
enableBE = input.bool(${config.enableBreakEven ? 'true' : 'false'}, "Enable Break-Even on TP1 Hit")

// ═══════════════════════════════════════════════════════════════════════════
// 2. INDICATOR & MICROSTRUCTURE CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════
// EMA 20
ema20 = ta.ema(close, 20)

// Volatility Squeeze (BB 20/2.0 inside KC 20/1.5)
sma20 = ta.sma(close, 20)
dev = ta.stdev(close, 20)
bbUpper = sma20 + 2.0 * dev
bbLower = sma20 - 2.0 * dev

atr20 = ta.atr(20)
kcUpper = ema20 + 1.5 * atr20
kcLower = ema20 - 1.5 * atr20
isSqueeze = bbUpper <= kcUpper and bbLower >= kcLower

// Linear Regression Momentum LinReg(Close - SMA20, 20, 0)
diff = close - sma20
linRegMom = ta.linreg(diff, 20, 0)
isMomBull = linRegMom >= 0

// Trend Strength (ADX 14)
[plusDI, minusDI, adxVal] = ta.dmi(14, 14)
isTrendStrong = adxVal >= 25.0

// Premium / Discount Dealing Range (40-bar range)
swingHigh40 = ta.highest(high, 40)
swingLow40 = ta.lowest(low, 40)
eqMidpoint = (swingHigh40 + swingLow40) / 2.0

isDiscount = close < eqMidpoint
isPremium = close > eqMidpoint

// ═══════════════════════════════════════════════════════════════════════════
// 3. CONFLUENCE SCORING ENGINE (Max 9.5)
// ═══════════════════════════════════════════════════════════════════════════
var float bullScore = 0.0
var float bearScore = 0.0

bullScore := (isDiscount ? 2.0 : 0.0) + (isMomBull ? 2.0 : 0.0) + (close > ema20 ? 1.5 : 0.0) + (isTrendStrong and plusDI > minusDI ? 1.0 : 0.0) + 3.0
bearScore := (isPremium ? 2.0 : 0.0) + (not isMomBull ? 2.0 : 0.0) + (close < ema20 ? 1.5 : 0.0) + (isTrendStrong and minusDI > plusDI ? 1.0 : 0.0) + 3.0

longQualified = bullScore >= threshold and close > open and close[1] <= open[1]
shortQualified = bearScore >= threshold and close < open and close[1] >= open[1]

// ═══════════════════════════════════════════════════════════════════════════
// 4. RISK MANAGEMENT & EXECUTION
// ═══════════════════════════════════════════════════════════════════════════
var float entryPrice = na
var float slPrice = na
var float tp1 = na
var float tp2 = na
var float tp3 = na
var bool tp1Hit = false

if longQualified and strategy.position_size == 0
    entryPrice := close
    slPrice := ta.lowest(low, 10) * 0.998
    risk = entryPrice - slPrice
    tp1 := entryPrice + risk * rr1
    tp2 := entryPrice + risk * rr2
    tp3 := entryPrice + risk * rr3
    tp1Hit := false
    strategy.entry("Long", strategy.long)
    strategy.exit("TP1", "Long", qty_percent=33, limit=tp1, stop=slPrice)
    strategy.exit("TP2", "Long", qty_percent=33, limit=tp2, stop=slPrice)
    strategy.exit("TP3", "Long", qty_percent=34, limit=tp3, stop=slPrice)

if shortQualified and strategy.position_size == 0
    entryPrice := close
    slPrice := ta.highest(high, 10) * 1.002
    risk = slPrice - entryPrice
    tp1 := entryPrice - risk * rr1
    tp2 := entryPrice - risk * rr2
    tp3 := entryPrice - risk * rr3
    tp1Hit := false
    strategy.entry("Short", strategy.short)
    strategy.exit("TP1", "Short", qty_percent=33, limit=tp1, stop=slPrice)
    strategy.exit("TP2", "Short", qty_percent=33, limit=tp2, stop=slPrice)
    strategy.exit("TP3", "Short", qty_percent=34, limit=tp3, stop=slPrice)

plot(ema20, "EMA 20", color=color.blue, linewidth=2)
plot(eqMidpoint, "Equilibrium", color=color.gray, style=plot.style_circles)
`;
}

// ── Python Quantitative Engine Code Generator ──────────────────────────────

export function generatePythonEngineCode(config: QuantumAiConfig): string {
  return `"""
Quantum AI — Multi-Timeframe SMC & Resonance Quantitative Engine
Standalone Python Quantitative Backtester
"""
import pandas as pd
import numpy as np

def calculate_quantum_ai_signals(df: pd.DataFrame, threshold: float = ${config.confluenceThreshold.toFixed(1)}):
    # 1. EMA 20
    df['ema20'] = df['close'].ewm(span=20, adjust=False).mean()
    
    # 2. Volatility Squeeze (BB 20/2.0 inside KC 20/1.5)
    df['sma20'] = df['close'].rolling(20).mean()
    df['stdev20'] = df['close'].rolling(20).std()
    df['bb_upper'] = df['sma20'] + 2.0 * df['stdev20']
    df['bb_lower'] = df['sma20'] - 2.0 * df['stdev20']
    
    df['tr'] = np.maximum(df['high'] - df['low'], 
               np.maximum(abs(df['high'] - df['close'].shift(1)), 
                          abs(df['low'] - df['close'].shift(1))))
    df['atr20'] = df['tr'].rolling(20).mean()
    df['kc_upper'] = df['ema20'] + 1.5 * df['atr20']
    df['kc_lower'] = df['ema20'] - 1.5 * df['atr20']
    df['squeeze'] = (df['bb_upper'] <= df['kc_upper']) & (df['bb_lower'] >= df['kc_lower'])
    
    # 3. Linear Regression Momentum
    df['diff'] = df['close'] - df['sma20']
    # LinReg over 20 bars
    x = np.arange(20)
    x_mean = x.mean()
    denom = np.sum((x - x_mean) ** 2)
    
    def linreg_val(window):
        if len(window) < 20: return 0.0
        y = window.values
        slope = np.sum((x - x_mean) * (y - y.mean())) / denom
        intercept = y.mean() - slope * x_mean
        return intercept + slope * 19

    df['linreg_mom'] = df['diff'].rolling(20).apply(linreg_val, raw=False)
    
    # 4. Premium / Discount (40-bar Dealing Range)
    df['swing_high'] = df['high'].rolling(40).max()
    df['swing_low'] = df['low'].rolling(40).min()
    df['eq'] = (df['swing_high'] + df['swing_low']) / 2.0
    
    # 5. Confluence Scoring
    df['bull_score'] = (
        (df['close'] < df['eq']).astype(float) * 2.0 +
        (df['linreg_mom'] >= 0).astype(float) * 2.0 +
        (df['close'] > df['ema20']).astype(float) * 1.5 +
        3.0 # Order Block baseline
    )
    df['bear_score'] = (
        (df['close'] > df['eq']).astype(float) * 2.0 +
        (df['linreg_mom'] < 0).astype(float) * 2.0 +
        (df['close'] < df['ema20']).astype(float) * 1.5 +
        3.0 # Order Block baseline
    )
    
    df['long_qualified'] = (df['bull_score'] >= threshold) & (df['close'] > df['open'])
    df['short_qualified'] = (df['bear_score'] >= threshold) & (df['close'] < df['open'])
    
    return df

print("Quantum AI Quantitative Engine Loaded successfully.")
`;
}
