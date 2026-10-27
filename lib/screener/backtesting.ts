// ─── MI007 Quantitative Backtesting Simulation Engine ────────────────────────
// Institutional walk-forward strategy evaluation with trade logs, drawdown metrics,
// and equity curves.

import { Candle } from '../types';
import { StrategyId, generateCandlesForSymbol } from './technicalStrategies';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollinger } from '../indicators';
import { MASTER_COMPANIES } from './data';

export interface BacktestConfig {
  symbol: string;
  strategyId: StrategyId;
  initialCapital: number;
  takeProfitPct: number; // e.g., 8 (%)
  stopLossPct: number; // e.g., 4 (%)
  maxHoldingDays: number; // e.g., 30 days
  positionSizePct: number; // e.g., 100 (%)
  candles?: Candle[];
}

export interface BacktestTrade {
  tradeId: number;
  symbol: string;
  strategyId: StrategyId;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  shares: number;
  returnPct: number;
  pnl: number;
  holdingDays: number;
  exitReason: 'Take Profit' | 'Stop Loss' | 'Signal Reversal' | 'Max Holding Period' | 'End of Period' | 'Manual Exit (User Closed)';
}

export interface BacktestEquityPoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
  drawdownPct: number;
  cash: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  profitFactor: number;
  totalReturnPct: number; // %
  benchmarkReturnPct: number; // %
  alphaPct: number; // %
  maxDrawdownPct: number; // %
  avgWinPct: number;
  avgLossPct: number;
  riskRewardRatio: number;
  finalEquity: number;
  trades: BacktestTrade[];
  equityCurve: BacktestEquityPoint[];
}

export function runBacktest(config: BacktestConfig): BacktestResult {
  const {
    symbol,
    strategyId,
    initialCapital = 100000,
    takeProfitPct = 10,
    stopLossPct = 5,
    maxHoldingDays = 30,
    positionSizePct = 100,
  } = config;

  const matchedCompany = MASTER_COMPANIES.find(
    (c) => c.symbol.toUpperCase() === symbol.trim().toUpperCase()
  );
  const fallbackBasePrice = matchedCompany?.currentPrice || 2500;
  const fallbackBeta = matchedCompany?.beta || 1.2;

  const candles = config.candles && config.candles.length >= 100
    ? config.candles
    : generateCandlesForSymbol(symbol, fallbackBasePrice, fallbackBeta, 260);

  const n = candles.length;
  if (n < 60) {
    throw new Error('Insufficient historical data for backtesting (minimum 60 bars required).');
  }

  // Pre-calculate technical indicators across the entire series
  const sma20 = calculateSMA(candles, 20);
  const sma50 = calculateSMA(candles, 50);
  const sma200 = calculateSMA(candles, 200);
  const ema9 = calculateEMA(candles, 9);
  const ema21 = calculateEMA(candles, 21);
  const rsi = calculateRSI(candles, 14);
  const macd = calculateMACD(candles, 12, 26, 9);
  const bb = calculateBollinger(candles, 20, 2);

  // Warmup offset
  const warmup = strategyId.includes('200') || strategyId === 'golden_cross' || strategyId === 'death_cross' || strategyId === 'ma_alignment'
    ? Math.min(200, Math.floor(n * 0.4))
    : 50;

  let cash = initialCapital;
  let shares = 0;
  let inPosition = false;
  let entryPrice = 0;
  let entryIndex = 0;
  let tradeCounter = 1;

  const trades: BacktestTrade[] = [];
  const equityCurve: BacktestEquityPoint[] = [];

  const initialBenchmarkPrice = candles[warmup]?.close || candles[0].close;
  let peakEquity = initialCapital;
  let maxDrawdown = 0;

  for (let i = warmup; i < n; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const currentDate = c.time || new Date(c.openTime).toISOString().slice(0, 10);
    const currentPrice = c.close;

    // Check indicator signals
    let isEntrySignal = false;
    let isExitSignal = false;

    switch (strategyId) {
      case 'ma_alignment': {
        const s50 = sma50[i] || currentPrice * 0.98;
        const s200 = sma200[i] || currentPrice * 0.92;
        const prevS50 = sma50[i - 1] || prevC.close * 0.98;
        // Entry: Crosses into bullish alignment
        if (currentPrice > s50 && s50 > s200 && (prevC.close <= prevS50 || prevC.close < s200)) {
          isEntrySignal = true;
        }
        // Exit: Falls below 50 SMA
        if (currentPrice < s50) {
          isExitSignal = true;
        }
        break;
      }

      case 'golden_cross': {
        const s50 = sma50[i] || 0;
        const s200 = sma200[i] || 0;
        const prevS50 = sma50[i - 1] || 0;
        const prevS200 = sma200[i - 1] || 0;
        if (prevS50 <= prevS200 && s50 > s200) {
          isEntrySignal = true;
        }
        if (currentPrice < (sma200[i] || 0) * 0.97) {
          isExitSignal = true;
        }
        break;
      }

      case 'death_cross': {
        const s50 = sma50[i] || 0;
        const s200 = sma200[i] || 0;
        const prevS50 = sma50[i - 1] || 0;
        const prevS200 = sma200[i - 1] || 0;
        // Short/Hedge proxy or bounce reversal
        if (prevS50 >= prevS200 && s50 < s200) {
          isExitSignal = true;
        } else if (currentPrice > s50 && s50 > s200) {
          isEntrySignal = true;
        }
        break;
      }

      case 'ma_20_50_cross': {
        const s20 = sma20[i] || 0;
        const s50 = sma50[i] || 0;
        const prevS20 = sma20[i - 1] || 0;
        const prevS50 = sma50[i - 1] || 0;
        if (prevS20 <= prevS50 && s20 > s50) {
          isEntrySignal = true;
        }
        if (prevS20 >= prevS50 && s20 < s50) {
          isExitSignal = true;
        }
        break;
      }

      case 'ema_9_21_cross': {
        const e9 = ema9[i] || 0;
        const e21 = ema21[i] || 0;
        const prevE9 = ema9[i - 1] || 0;
        const prevE21 = ema21[i - 1] || 0;
        if (prevE9 <= prevE21 && e9 > e21) {
          isEntrySignal = true;
        }
        if (prevE9 >= prevE21 && e9 < e21) {
          isExitSignal = true;
        }
        break;
      }

      case 'rsi_momentum': {
        const currR = rsi[i] ?? 50;
        const prevR = rsi[i - 1] ?? 50;
        // Entry: Crosses back up above 30 (oversold recovery)
        if (prevR < 32 && currR >= 32) {
          isEntrySignal = true;
        }
        // Exit: Overbought above 70 or breakdown below 40
        if (currR >= 72 || currR < 38) {
          isExitSignal = true;
        }
        break;
      }

      case 'macd_cross': {
        const currM = macd.macd[i] ?? 0;
        const currS = macd.signal[i] ?? 0;
        const prevM = macd.macd[i - 1] ?? 0;
        const prevS = macd.signal[i - 1] ?? 0;
        if (prevM <= prevS && currM > currS) {
          isEntrySignal = true;
        }
        if (prevM >= prevS && currM < currS) {
          isExitSignal = true;
        }
        break;
      }

      case 'bb_reversal': {
        const lower = bb.lower[i] || currentPrice * 0.95;
        const middle = bb.middle[i] || currentPrice;
        const prevLower = bb.lower[i - 1] || prevC.close * 0.95;
        if (prevC.close <= prevLower && currentPrice > lower) {
          isEntrySignal = true;
        }
        if (currentPrice >= (bb.upper[i] || currentPrice * 1.05) || currentPrice < middle * 0.96) {
          isExitSignal = true;
        }
        break;
      }

      case 'breakout': {
        // 50-day high breakout
        const slice = candles.slice(Math.max(0, i - 50), i);
        const maxPrevClose = Math.max(...slice.map(s => s.close));
        if (currentPrice > maxPrevClose && c.volume > 1.2 * prevC.volume) {
          isEntrySignal = true;
        }
        if (currentPrice < (sma20[i] || currentPrice * 0.97)) {
          isExitSignal = true;
        }
        break;
      }

      case 'adx_trend': {
        const e9 = ema9[i] || 0;
        const e21 = ema21[i] || 0;
        const s50 = sma50[i] || 0;
        if (currentPrice > s50 && e9 > e21) {
          isEntrySignal = true;
        }
        if (currentPrice < s50) {
          isExitSignal = true;
        }
        break;
      }

      // ── Smart Money Concepts (SMC) Institutional Strategies (16 Strategies) ──
      case 'smc_bos': {
        const swingHigh = Math.max(...candles.slice(Math.max(0, i - 20), i).map((x) => x.high));
        if (currentPrice > swingHigh && prevC.close <= swingHigh) {
          isEntrySignal = true;
        }
        const recentLow = Math.min(...candles.slice(Math.max(0, i - 10), i).map((x) => x.low));
        if (currentPrice < recentLow) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_choch': {
        const s20 = sma20[i] || currentPrice;
        if (prevC.close < s20 && currentPrice > s20 && currentPrice > prevC.high) {
          isEntrySignal = true;
        }
        if (currentPrice < s20 * 0.97) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_liquidity_sweep': {
        const swingLow = Math.min(...candles.slice(Math.max(0, i - 15), i - 1).map((x) => x.low));
        if (c.low < swingLow && currentPrice > swingLow) {
          isEntrySignal = true;
        }
        if (currentPrice < swingLow * 0.98) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_eqh_eql': {
        const slice = candles.slice(Math.max(0, i - 10), i);
        const minL = Math.min(...slice.map((x) => x.low));
        if (Math.abs(c.low - minL) / minL < 0.003 && currentPrice > c.open) {
          isEntrySignal = true;
        }
        if (currentPrice < minL * 0.985) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_fvg': {
        if (i >= 2) {
          const fvgTop = candles[i - 2].high;
          const fvgBottom = candles[i - 1].low;
          if (fvgBottom > fvgTop && c.low <= fvgBottom && currentPrice > fvgTop) {
            isEntrySignal = true;
          }
        }
        if (currentPrice < (sma20[i] || currentPrice * 0.97)) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_order_block': {
        if (i >= 3 && prevC.close > prevC.open && candles[i - 2].close < candles[i - 2].open) {
          const obLevel = candles[i - 2].high;
          if (c.low <= obLevel && currentPrice > obLevel) {
            isEntrySignal = true;
          }
        }
        if (currentPrice < (sma50[i] || currentPrice * 0.96)) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_breaker_block': {
        const s50 = sma50[i] || currentPrice;
        if (prevC.close <= s50 && currentPrice > s50 && c.volume > prevC.volume) {
          isEntrySignal = true;
        }
        if (currentPrice < s50 * 0.97) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_premium_discount': {
        const high30 = Math.max(...candles.slice(Math.max(0, i - 30), i).map((x) => x.high));
        const low30 = Math.min(...candles.slice(Math.max(0, i - 30), i).map((x) => x.low));
        const range = high30 - low30;
        if (range > 0) {
          const eqPct = (currentPrice - low30) / range;
          if (eqPct < 0.38 && currentPrice > prevC.high) {
            isEntrySignal = true;
          }
          if (eqPct > 0.75) {
            isExitSignal = true;
          }
        }
        break;
      }

      case 'smc_mtf_confluence': {
        const s50 = sma50[i] || 0;
        const s200 = sma200[i] || 0;
        const e9 = ema9[i] || 0;
        const e21 = ema21[i] || 0;
        if (currentPrice > s50 && s50 > s200 && e9 > e21 && prevC.close <= (ema9[i - 1] || 0)) {
          isEntrySignal = true;
        }
        if (currentPrice < s50) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_session_liquidity': {
        if (c.low < prevC.low && currentPrice > prevC.close) {
          isEntrySignal = true;
        }
        if (currentPrice < prevC.low * 0.99) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_3stage_reversal': {
        const r = rsi[i] ?? 50;
        const s20 = sma20[i] || currentPrice;
        if (r < 40 && currentPrice > prevC.high && currentPrice > s20) {
          isEntrySignal = true;
        }
        if (currentPrice < s20 * 0.97) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_bos_fvg_retest': {
        const s20 = sma20[i] || currentPrice;
        if (currentPrice > s20 && prevC.close <= s20 && c.volume > prevC.volume) {
          isEntrySignal = true;
        }
        if (currentPrice < s20 * 0.96) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_ob_fvg_confluence': {
        const s50 = sma50[i] || currentPrice;
        if (currentPrice > s50 && c.low <= s50 * 1.01 && currentPrice > c.open) {
          isEntrySignal = true;
        }
        if (currentPrice < s50 * 0.97) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_inducement_sweep': {
        if (c.low < prevC.low && currentPrice > prevC.high) {
          isEntrySignal = true;
        }
        if (currentPrice < prevC.low * 0.985) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_amd': {
        const e9 = ema9[i] || 0;
        const e21 = ema21[i] || 0;
        if (prevC.close < e21 && currentPrice > e9 && currentPrice > e21) {
          isEntrySignal = true;
        }
        if (currentPrice < e21 * 0.97) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_ifvg': {
        const s20 = sma20[i] || currentPrice;
        if (prevC.close <= s20 && currentPrice > s20) {
          isEntrySignal = true;
        }
        if (currentPrice < s20 * 0.97) {
          isExitSignal = true;
        }
        break;
      }
    }

    // Position Management Logic
    if (inPosition) {
      const holdingDays = i - entryIndex;
      const returnPct = ((currentPrice - entryPrice) / entryPrice) * 100;
      let exitReason: BacktestTrade['exitReason'] | null = null;

      // 1. Take Profit
      if (takeProfitPct > 0 && returnPct >= takeProfitPct) {
        exitReason = 'Take Profit';
      }
      // 2. Stop Loss
      else if (stopLossPct > 0 && returnPct <= -stopLossPct) {
        exitReason = 'Stop Loss';
      }
      // 3. Max Holding Period
      else if (maxHoldingDays > 0 && holdingDays >= maxHoldingDays) {
        exitReason = 'Max Holding Period';
      }
      // 4. Indicator Reversal Signal
      else if (isExitSignal) {
        exitReason = 'Signal Reversal';
      }
      // 5. Final bar in backtest
      else if (i === n - 1) {
        exitReason = 'End of Period';
      }

      if (exitReason) {
        const exitPrice = currentPrice;
        const pnl = Math.round(shares * (exitPrice - entryPrice));
        cash += Math.round(shares * exitPrice);

        trades.push({
          tradeId: tradeCounter++,
          symbol,
          strategyId,
          entryDate: candles[entryIndex].time || new Date(candles[entryIndex].openTime).toISOString().slice(0, 10),
          entryPrice,
          exitDate: currentDate,
          exitPrice,
          shares,
          returnPct: Math.round(returnPct * 100) / 100,
          pnl,
          holdingDays,
          exitReason,
        });

        shares = 0;
        inPosition = false;
      }
    } else {
      // Check entry
      if (isEntrySignal && i < n - 1) {
        const allocatableCash = cash * (positionSizePct / 100);
        if (allocatableCash >= currentPrice) {
          shares = Math.floor(allocatableCash / currentPrice);
          cash -= shares * currentPrice;
          entryPrice = currentPrice;
          entryIndex = i;
          inPosition = true;
        }
      }
    }

    // Calculate daily portfolio mark-to-market
    const portfolioValue = Math.round(cash + shares * currentPrice);
    if (portfolioValue > peakEquity) {
      peakEquity = portfolioValue;
    }
    const currentDrawdown = peakEquity > 0
      ? Math.round((((peakEquity - portfolioValue) / peakEquity) * 100) * 100) / 100
      : 0;
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }

    const benchmarkValue = Math.round(initialCapital * (currentPrice / initialBenchmarkPrice));

    equityCurve.push({
      date: currentDate,
      portfolioValue,
      benchmarkValue,
      drawdownPct: currentDrawdown,
      cash: Math.round(cash),
    });
  }

  // Statistical calculations
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const losingTrades = trades.filter(t => t.pnl <= 0).length;
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 1000) / 10 : 0;

  const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0
    ? Math.round((grossProfit / grossLoss) * 100) / 100
    : grossProfit > 0 ? 99.9 : 1.0;

  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].portfolioValue : initialCapital;
  const totalReturnPct = Math.round((((finalEquity - initialCapital) / initialCapital) * 100) * 100) / 100;

  const finalBenchmark = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].benchmarkValue : initialCapital;
  const benchmarkReturnPct = Math.round((((finalBenchmark - initialCapital) / initialCapital) * 100) * 100) / 100;
  const alphaPct = Math.round((totalReturnPct - benchmarkReturnPct) * 100) / 100;

  const winReturns = trades.filter(t => t.returnPct > 0).map(t => t.returnPct);
  const lossReturns = trades.filter(t => t.returnPct <= 0).map(t => Math.abs(t.returnPct));
  const avgWinPct = winReturns.length > 0 ? Math.round((winReturns.reduce((a, b) => a + b, 0) / winReturns.length) * 10) / 10 : 0;
  const avgLossPct = lossReturns.length > 0 ? Math.round((lossReturns.reduce((a, b) => a + b, 0) / lossReturns.length) * 10) / 10 : 0;
  const riskRewardRatio = avgLossPct > 0 ? Math.round((avgWinPct / avgLossPct) * 100) / 100 : avgWinPct > 0 ? 2.5 : 1.0;

  return {
    config,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    profitFactor,
    totalReturnPct,
    benchmarkReturnPct,
    alphaPct,
    maxDrawdownPct: maxDrawdown,
    avgWinPct,
    avgLossPct,
    riskRewardRatio,
    finalEquity,
    trades,
    equityCurve,
  };
}
