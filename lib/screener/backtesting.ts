// ─── MI007 Quantitative Backtesting Simulation Engine ────────────────────────
// Institutional walk-forward strategy evaluation with trade logs, drawdown metrics,
// and equity curves.

import { Candle } from '../types';
import { StrategyId, generateCandlesForSymbol } from './technicalStrategies';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollinger } from '../indicators';
import { calculateSMC } from '../smcEngine';
import { MASTER_COMPANIES, getCompanyBySymbol } from './data';

export interface BacktestConfig {
  symbol: string;
  strategyId: StrategyId;
  initialCapital: number;
  takeProfitPct: number; // e.g., 8 (%)
  stopLossPct: number; // e.g., 4 (%)
  maxHoldingDays: number; // e.g., 30 days
  positionSizePct: number; // e.g., 100 (%)
  candles?: Candle[];
  allowSyntheticDemo?: boolean;
  commissionPct?: number; // per-side fraction, default 0.001 (0.10%)
  slippagePct?: number; // per-side fraction, default 0.0005 (0.05%)
}

export interface BacktestTrade {
  tradeId: number;
  symbol: string;
  strategyId: StrategyId;
  entryDate: string;
  entryIndex?: number;
  entryPrice: number;
  exitDate: string;
  exitIndex?: number;
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
  sharpeRatio: number;
  totalCostsPaid: number;
  lowSampleWarning: boolean;
  sampleWarningReason?: string;
  dataProvenance: 'real' | 'demo_synthetic' | 'missing';
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
    commissionPct = 0.001,
    slippagePct = 0.0005,
  } = config;

  const perSideCostRate = Math.max(0, commissionPct) + Math.max(0, slippagePct);

  const matchedCompany = getCompanyBySymbol(symbol) || MASTER_COMPANIES.find(
    (c) => c.symbol.toUpperCase() === symbol.trim().toUpperCase()
  );
  const fallbackBasePrice = matchedCompany?.currentPrice || 2500;
  const fallbackChangePct = matchedCompany?.priceChangePct ?? 0.5;
  const marketType = (matchedCompany?.market || 'INDIA') as any;

  const hasProvidedCandles = Boolean(config.candles && config.candles.length >= 30);
  const candles = hasProvidedCandles
    ? config.candles!
    : generateCandlesForSymbol(symbol, fallbackBasePrice, fallbackChangePct, 500, marketType, {
        allowSyntheticDemo: config.allowSyntheticDemo,
      });

  const n = candles.length;
  if (n < 30) {
    return {
      config,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalReturnPct: 0,
      benchmarkReturnPct: 0,
      alphaPct: 0,
      maxDrawdownPct: 0,
      avgWinPct: 0,
      avgLossPct: 0,
      riskRewardRatio: 0,
      sharpeRatio: 0,
      totalCostsPaid: 0,
      lowSampleWarning: true,
      dataProvenance: 'missing',
      finalEquity: initialCapital,
      trades: [],
      equityCurve: [],
    };
  }

  const dataProvenance: BacktestResult['dataProvenance'] = hasProvidedCandles
    ? 'real'
    : 'demo_synthetic';

  // Pre-calculate technical indicators across the entire series
  const sma20 = calculateSMA(candles, 20);
  const sma50 = calculateSMA(candles, 50);
  const sma200 = calculateSMA(candles, 200);
  const ema9 = calculateEMA(candles, 9);
  const ema21 = calculateEMA(candles, 21);
  const rsi = calculateRSI(candles, 14);
  const macd = calculateMACD(candles, 12, 26, 9);
  const bb = calculateBollinger(candles, 20, 2);
  const smcAnalysis = strategyId.startsWith('smc_') ? calculateSMC(candles, undefined, symbol, '1D') : null;

  const isSma200Strategy =
    strategyId.includes('200') ||
    strategyId === 'golden_cross' ||
    strategyId === 'death_cross' ||
    strategyId === 'ma_alignment' ||
    strategyId === 'smc_mtf_confluence';

  // Warmup offset: For any strategy using SMA200, warmup MUST be at least 200 so bar 199 is never entered without valid indicator history
  const warmup = isSma200Strategy
    ? 200
    : Math.min(50, Math.max(15, Math.floor(n * 0.2)));

  if (n <= warmup) {
    return {
      config,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      totalReturnPct: 0,
      benchmarkReturnPct: 0,
      alphaPct: 0,
      maxDrawdownPct: 0,
      avgWinPct: 0,
      avgLossPct: 0,
      riskRewardRatio: 0,
      sharpeRatio: 0,
      totalCostsPaid: 0,
      finalEquity: initialCapital,
      trades: [],
      equityCurve: [],
      dataProvenance,
      lowSampleWarning: true,
      sampleWarningReason: `Insufficient candle history (${n} bars). Strategy "${strategyId}" requires at least ${warmup + 1} bars for indicator warmup.`,
    };
  }

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
        const s50 = sma50[i];
        const s200 = sma200[i];
        const prevS50 = sma50[i - 1];
        const prevS200 = sma200[i - 1];
        // Skip bars where SMA50 or SMA200 is null (never fall back to 0 or fabricated price)
        if (s50 === null || s200 === null || prevS50 === null || prevS200 === null) {
          break;
        }
        // Entry: Crosses into bullish alignment OR pullbacks to 50 SMA in confirmed trend
        if (
          (currentPrice > s50 && s50 > s200 && (prevC.close <= prevS50 || prevC.close < s200)) ||
          (s50 > s200 && prevC.close <= s50 && currentPrice > s50) ||
          (i === warmup && currentPrice > s50 && s50 > s200)
        ) {
          isEntrySignal = true;
        }
        if (currentPrice < s50 * 0.985) {
          isExitSignal = true;
        }
        break;
      }

      case 'golden_cross': {
        const s50 = sma50[i];
        const s200 = sma200[i];
        const prevS50 = sma50[i - 1];
        const prevS200 = sma200[i - 1];
        if (s50 === null || s200 === null || prevS50 === null || prevS200 === null) {
          break;
        }
        if (
          (prevS50 <= prevS200 && s50 > s200) ||
          (s50 > s200 && prevC.close <= s50 && currentPrice > s50) ||
          (i === warmup && s50 > s200 && currentPrice > s50)
        ) {
          isEntrySignal = true;
        }
        if (currentPrice < s200 * 0.97) {
          isExitSignal = true;
        }
        break;
      }

      case 'death_cross': {
        const s50 = sma50[i];
        const s200 = sma200[i];
        const prevS50 = sma50[i - 1];
        const prevS200 = sma200[i - 1];
        if (s50 === null || s200 === null || prevS50 === null || prevS200 === null) {
          break;
        }
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
        if (
          (prevS20 <= prevS50 && s20 > s50) ||
          (s20 > s50 && prevC.close <= s20 && currentPrice > s20) ||
          (i === warmup && s20 > s50 && currentPrice > s20)
        ) {
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

      // ── Smart Money Concepts (SMC) Institutional Strategies (Unified & Confluence) ──
      case 'smc_master': {
        const swingHigh = Math.max(...candles.slice(Math.max(0, i - 12), i).map((x) => x.high));
        const swingLow = Math.min(...candles.slice(Math.max(0, i - 12), i).map((x) => x.low));
        if ((currentPrice >= swingHigh * 0.998 && prevC.close < swingHigh) || (c.low < swingLow && currentPrice > swingLow)) {
          isEntrySignal = true;
        }
        if (currentPrice < swingLow * 0.99) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_fibonacci': {
        const slice = candles.slice(Math.max(0, i - 25), i);
        const sHigh = Math.max(...slice.map((x) => x.high));
        const sLow = Math.min(...slice.map((x) => x.low));
        const sSpan = sHigh - sLow || 1;
        const ote618 = sHigh - sSpan * 0.618;
        const ote786 = sHigh - sSpan * 0.786;
        if (currentPrice >= ote786 && currentPrice <= ote618 && currentPrice > c.open) {
          isEntrySignal = true;
        }
        if (currentPrice < sLow * 0.995 || currentPrice >= sHigh) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_volume_profile': {
        const slice = candles.slice(Math.max(0, i - 30), i);
        const sLow = Math.min(...slice.map((x) => x.low));
        const sHigh = Math.max(...slice.map((x) => x.high));
        const val = sLow + (sHigh - sLow) * 0.30;
        const poc = sLow + (sHigh - sLow) * 0.50;
        if (c.low <= val * 1.01 && currentPrice > val) {
          isEntrySignal = true;
        }
        if (currentPrice >= poc || currentPrice < sLow * 0.99) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_pivot_points': {
        const slice = candles.slice(Math.max(0, i - 20), i);
        const pH = Math.max(...slice.map((x) => x.high));
        const pL = Math.min(...slice.map((x) => x.low));
        const pC = slice[slice.length - 1].close;
        const P = (pH + pL + pC) / 3;
        const S1 = 2 * P - pH;
        if (c.low <= S1 * 1.008 && currentPrice > S1) {
          isEntrySignal = true;
        }
        if (currentPrice >= P || currentPrice < (P - (pH - pL)) * 0.995) {
          isExitSignal = true;
        }
        break;
      }

      // ── Legacy Aliases & Genuine SMC Structural Strategies ──
      case 'smc_bos': {
        const bosBreak = smcAnalysis?.structureBreaks.some(
          (sb) => sb.breakType === 'BOS' && sb.isBullish && sb.candleIndex === i
        );
        const swingHigh = Math.max(...candles.slice(Math.max(0, i - 12), i).map((x) => x.high));
        const priorSwingHigh = Math.max(...candles.slice(Math.max(0, i - 24), Math.max(1, i - 12)).map((x) => x.high));
        if (bosBreak || (swingHigh > priorSwingHigh && prevC.close <= swingHigh && currentPrice > swingHigh)) {
          isEntrySignal = true;
        }
        const recentLow = Math.min(...candles.slice(Math.max(0, i - 10), i).map((x) => x.low));
        if (currentPrice < recentLow) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_choch': {
        // Genuine CHoCH (Change of Character): first bullish break of a lower-high swing after a downtrend
        const chochBreak = smcAnalysis?.structureBreaks.some(
          (sb) => sb.breakType === 'CHoCH' && sb.isBullish && sb.candleIndex === i
        );
        const recentWindow = candles.slice(Math.max(0, i - 10), i);
        const priorWindow = candles.slice(Math.max(0, i - 20), Math.max(1, i - 10));
        const recentLow = recentWindow.length > 0 ? Math.min(...recentWindow.map((x) => x.low)) : currentPrice;
        const priorLow = priorWindow.length > 0 ? Math.min(...priorWindow.map((x) => x.low)) : currentPrice;
        const recentSwingHigh = recentWindow.length > 0 ? Math.max(...recentWindow.map((x) => x.high)) : currentPrice;
        if (
          chochBreak ||
          (recentLow < priorLow && prevC.close <= recentSwingHigh && currentPrice > recentSwingHigh)
        ) {
          isEntrySignal = true;
        }
        const bearishChoch = smcAnalysis?.structureBreaks.some(
          (sb) => sb.breakType === 'CHoCH' && !sb.isBullish && sb.candleIndex === i
        );
        if (bearishChoch || currentPrice < recentLow) {
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
        // Genuine 3-candle Bullish Fair Value Gap (candle[k-2].high < candle[k].low) mitigated at bar i
        let fvgRetest = false;
        let activeFvgBottom = 0;
        for (let k = Math.max(2, i - 15); k < i; k++) {
          const gapBottom = candles[k - 2].high;
          const gapTop = candles[k].low;
          if (gapTop > gapBottom * 1.001) {
            if (c.low <= gapTop && currentPrice >= gapBottom && currentPrice > c.open) {
              fvgRetest = true;
              activeFvgBottom = gapBottom;
              break;
            }
          }
        }
        if (fvgRetest) {
          isEntrySignal = true;
        }
        if (activeFvgBottom > 0 && currentPrice < activeFvgBottom * 0.99) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_order_block': {
        // Genuine Bullish Order Block: last bearish candle before a displacement break, retested at bar i
        const obRetest = smcAnalysis?.orderBlocks.some(
          (ob) =>
            ob.isBullish &&
            !ob.isBreaker &&
            ob.startIndex < i &&
            i - ob.startIndex <= 25 &&
            c.low <= ob.topPrice &&
            currentPrice >= ob.bottomPrice &&
            currentPrice > c.open
        );
        if (obRetest) {
          isEntrySignal = true;
        }
        const obBroken = smcAnalysis?.orderBlocks.some(
          (ob) => ob.isBullish && ob.startIndex < i && currentPrice < ob.bottomPrice * 0.99
        );
        if (obBroken) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_breaker_block': {
        // Genuine Bullish Breaker Block: failed bearish order block reclaimed as support
        const breakerHit = smcAnalysis?.orderBlocks.some(
          (ob) =>
            ob.isBreaker &&
            ob.isBullish &&
            (ob.startIndex === i ||
              (ob.startIndex < i && c.low <= ob.topPrice && currentPrice >= ob.bottomPrice))
        );
        if (breakerHit) {
          isEntrySignal = true;
        }
        if (currentPrice < (sma50[i] || currentPrice * 0.97) * 0.97) {
          isExitSignal = true;
        }
        break;
      }

      case 'smc_premium_discount': {
        const high25 = Math.max(...candles.slice(Math.max(0, i - 25), i).map((x) => x.high));
        const low25 = Math.min(...candles.slice(Math.max(0, i - 25), i).map((x) => x.low));
        const range = high25 - low25;
        if (range > 0) {
          const eqPct = (currentPrice - low25) / range;
          if (eqPct <= 0.52 && currentPrice > prevC.close) {
            isEntrySignal = true;
          }
          if (eqPct > 0.75) {
            isExitSignal = true;
          }
        }
        break;
      }

      case 'smc_mtf_confluence': {
        const s50 = sma50[i];
        const s200 = sma200[i];
        const e9 = ema9[i];
        const e21 = ema21[i];
        const prevE9 = ema9[i - 1];
        if (s50 === null || s200 === null || e9 === null || e21 === null || prevE9 === null) {
          break;
        }
        if (currentPrice > s50 && s50 > s200 && e9 > e21 && prevC.close <= prevE9) {
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
        const prevR = rsi[i - 1] ?? 50;
        if ((prevR < 50 && r > prevR && currentPrice > prevC.close) || (c.low < prevC.low && currentPrice > prevC.close && r > 40)) {
          isEntrySignal = true;
        }
        const s20 = sma20[i] || currentPrice;
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
        const swingLow = Math.min(...candles.slice(Math.max(0, i - 10), i).map((x) => x.low));
        if ((c.low <= swingLow && currentPrice > prevC.close) || (c.low < prevC.low && currentPrice > c.open)) {
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
        // Genuine Inverse Fair Value Gap (IFVG): a prior Bearish 3-candle FVG (candles[k-2].low > candles[k].high)
        // is inverted upward when bar i closes above the bearish gap's top boundary.
        let invertedBearishFvg = false;
        let invertedGapBottom = 0;
        for (let k = Math.max(2, i - 20); k < i; k++) {
          const bearGapTop = candles[k - 2].low;
          const bearGapBottom = candles[k].high;
          if (bearGapTop > bearGapBottom * 1.001) {
            if (prevC.close <= bearGapTop && currentPrice > bearGapTop) {
              invertedBearishFvg = true;
              invertedGapBottom = bearGapBottom;
              break;
            }
          }
        }
        if (invertedBearishFvg) {
          isEntrySignal = true;
        }
        if (invertedGapBottom > 0 && currentPrice < invertedGapBottom) {
          isExitSignal = true;
        }
        break;
      }
    }

    // Position Management Logic (SC10: Intrabar Stop Loss / Take Profit & Trading Costs)
    if (inPosition) {
      const holdingDays = i - entryIndex;
      const stopPrice = stopLossPct > 0 ? entryPrice * (1 - stopLossPct / 100) : 0;
      const targetPrice = takeProfitPct > 0 ? entryPrice * (1 + takeProfitPct / 100) : Infinity;

      let exitReason: BacktestTrade['exitReason'] | null = null;
      let rawExitPrice = currentPrice;

      // 1. Intrabar Stop Loss (checked first for conservative tie-break when both SL and TP are touched)
      if (stopLossPct > 0 && c.low <= stopPrice) {
        exitReason = 'Stop Loss';
        rawExitPrice = c.open < stopPrice ? c.open : stopPrice;
      }
      // 2. Intrabar Take Profit
      else if (takeProfitPct > 0 && c.high >= targetPrice) {
        exitReason = 'Take Profit';
        rawExitPrice = c.open > targetPrice ? c.open : targetPrice;
      }
      // 3. Max Holding Period
      else if (maxHoldingDays > 0 && holdingDays >= maxHoldingDays) {
        exitReason = 'Max Holding Period';
        rawExitPrice = currentPrice;
      }
      // 4. Indicator Reversal Signal
      else if (isExitSignal) {
        exitReason = 'Signal Reversal';
        rawExitPrice = currentPrice;
      }
      // 5. Final bar in backtest
      else if (i === n - 1) {
        exitReason = 'End of Period';
        rawExitPrice = currentPrice;
      }

      if (exitReason) {
        const entryCost = shares * entryPrice * perSideCostRate;
        const exitCost = shares * rawExitPrice * perSideCostRate;
        const tradeCost = entryCost + exitCost;
        const effectiveEntry = entryPrice * (1 + perSideCostRate);
        const effectiveExit = rawExitPrice * (1 - perSideCostRate);
        const netReturnPct = ((effectiveExit - effectiveEntry) / effectiveEntry) * 100;
        const pnl = Math.round((shares * (effectiveExit - effectiveEntry)) * 100) / 100;
        cash += shares * rawExitPrice - exitCost;

        trades.push({
          tradeId: tradeCounter++,
          symbol,
          strategyId,
          entryDate: candles[entryIndex].time || new Date(candles[entryIndex].openTime).toISOString().slice(0, 10),
          entryIndex,
          entryPrice: Number(entryPrice.toFixed(2)),
          exitDate: currentDate,
          exitIndex: i,
          exitPrice: Number(rawExitPrice.toFixed(2)),
          shares,
          returnPct: Math.round(netReturnPct * 100) / 100,
          pnl,
          holdingDays,
          exitReason,
        });

        shares = 0;
        inPosition = false;
        (trades[trades.length - 1] as any)._costPaid = tradeCost;
      }
    } else {
      // Check entry
      if (isEntrySignal && i < n - 1) {
        const allocatableCash = cash * (positionSizePct / 100);
        const unitCostWithFee = currentPrice * (1 + perSideCostRate);
        if (allocatableCash >= unitCostWithFee) {
          shares = Math.floor(allocatableCash / unitCostWithFee);
          const entryCost = shares * currentPrice * perSideCostRate;
          cash -= shares * currentPrice + entryCost;
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

  // Statistical calculations (SC10: no fabricated trades when trades.length === 0)
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const losingTrades = trades.filter(t => t.pnl <= 0).length;
  const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 1000) / 10 : 0;

  const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0
    ? Math.round((grossProfit / grossLoss) * 100) / 100
    : grossProfit > 0 ? 99.9 : 0.0;

  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].portfolioValue : initialCapital;
  const totalReturnPct = Math.round((((finalEquity - initialCapital) / initialCapital) * 100) * 100) / 100;

  const finalBenchmark = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].benchmarkValue : initialCapital;
  const benchmarkReturnPct = Math.round((((finalBenchmark - initialCapital) / initialCapital) * 100) * 100) / 100;
  const alphaPct = Math.round((totalReturnPct - benchmarkReturnPct) * 100) / 100;

  const winReturns = trades.filter(t => t.returnPct > 0).map(t => t.returnPct);
  const lossReturns = trades.filter(t => t.returnPct <= 0).map(t => Math.abs(t.returnPct));
  const avgWinPct = winReturns.length > 0 ? Math.round((winReturns.reduce((a, b) => a + b, 0) / winReturns.length) * 10) / 10 : 0;
  const avgLossPct = lossReturns.length > 0 ? Math.round((lossReturns.reduce((a, b) => a + b, 0) / lossReturns.length) * 10) / 10 : 0;
  const riskRewardRatio = avgLossPct > 0 ? Math.round((avgWinPct / avgLossPct) * 100) / 100 : avgWinPct > 0 ? 2.5 : 0.0;

  // Total costs paid across all closed trades
  const totalCostsPaid = Number(
    trades.reduce((sum, t) => sum + ((t as any)._costPaid || 0), 0).toFixed(2)
  );

  // Annualized Sharpe Ratio from daily equity curve returns
  let sharpeRatio = 0;
  if (equityCurve.length >= 2) {
    const dailyReturns: number[] = [];
    for (let k = 1; k < equityCurve.length; k++) {
      const prevEq = equityCurve[k - 1].portfolioValue;
      const currEq = equityCurve[k].portfolioValue;
      if (prevEq > 0) {
        dailyReturns.push((currEq - prevEq) / prevEq);
      }
    }
    if (dailyReturns.length >= 2) {
      const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
      const variance =
        dailyReturns.reduce((acc, r) => acc + (r - mean) * (r - mean), 0) / (dailyReturns.length - 1);
      const std = Math.sqrt(variance);
      if (std > 1e-9) {
        sharpeRatio = Number(((mean / std) * Math.sqrt(252)).toFixed(2));
      }
    }
  }

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
    sharpeRatio,
    totalCostsPaid,
    lowSampleWarning: totalTrades < 30,
    dataProvenance,
    finalEquity,
    trades,
    equityCurve,
  };
}
