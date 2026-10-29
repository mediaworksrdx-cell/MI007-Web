#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
QUANTUM AI MULTI-TIMEFRAME SMC & PROPRIETARY STRATEGIES BACKTESTING ENGINE
═══════════════════════════════════════════════════════════════════════════════
Market Intelligence MI-007 Flagship Quantitative Simulation Engine.

Supports all 7 Proprietary MI-007 Flagship Algorithms:
1. quantum_smc: Quantum AI Multi-Timeframe SMC & Resonance
2. order_flow: Institutional Order Flow & Absorption Matrix
3. volatility_squeeze: Volatility Squeeze & Liquidity Breakout
4. ml_momentum: Machine Learning Momentum Trend Engine
5. stat_mean_reversion: Statistical Mean Reversion & Liquidity Grab
6. 3stage_reversal: Smart Money 3-Stage Institutional Reversal
7. amd: Institutional AMD (Accumulation -> Manipulation -> Distribution)
═══════════════════════════════════════════════════════════════════════════════
"""

import sys
import math
import random
import argparse
from typing import List, Dict, Any, Optional

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

class Candle:
    def __init__(self, time: int, open_: float, high: float, low: float, close: float, volume: float):
        self.time = time
        self.open = open_
        self.high = high
        self.low = low
        self.close = close
        self.volume = volume

class Trade:
    def __init__(self, entry_bar: int, entry_time: int, symbol: str, direction: str,
                 entry_price: float, sl: float, tp: float, size: float, resonance_score: int):
        self.entry_bar = entry_bar
        self.entry_time = entry_time
        self.symbol = symbol
        self.direction = direction # 'LONG' | 'SHORT'
        self.entry_price = entry_price
        self.sl = sl
        self.tp = tp
        self.size = size
        self.resonance_score = resonance_score
        self.exit_bar: Optional[int] = None
        self.exit_time: Optional[int] = None
        self.exit_price: Optional[float] = None
        self.exit_reason: Optional[str] = None # 'TP' | 'SL'
        self.pnl: float = 0.0
        self.pnl_pct: float = 0.0

def generate_synthetic_market_data(symbol: str, num_bars: int = 500, initial_price: float = 2400.0) -> List[Candle]:
    """Generates realistic market candles with volatility clustering and regime shifts."""
    random.seed(42)
    candles = []
    current_price = initial_price
    base_time = 1700000000 # Unix timestamp

    trend_regime = 0.0003
    volatility = 0.012

    for i in range(num_bars):
        if i % 70 == 0:
            trend_regime = random.choice([0.0008, -0.0006, 0.0002, -0.0004])

        pct_change = random.gauss(trend_regime, volatility)
        open_price = current_price
        close_price = open_price * (1.0 + pct_change)
        high_price = max(open_price, close_price) * (1.0 + abs(random.gauss(0, 0.004)))
        low_price = min(open_price, close_price) * (1.0 - abs(random.gauss(0, 0.004)))
        volume = abs(random.gauss(50000, 25000)) + 10000

        candles.append(Candle(
            time=base_time + (i * 3600),
            open_=round(open_price, 2),
            high=round(high_price, 2),
            low=round(low_price, 2),
            close=round(close_price, 2),
            volume=round(volume, 0)
        ))
        current_price = close_price

    return candles

class QuantumSmcResonanceBacktester:
    def __init__(self, symbol: str = "RELIANCE", strategy: str = "quantum_smc",
                 initial_capital: float = 100000.0, min_resonance: int = 75,
                 slippage_pct: float = 0.0005, fee_pct: float = 0.0003):
        self.symbol = symbol
        self.strategy = strategy.lower()
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.min_resonance = min_resonance
        self.slippage_pct = slippage_pct
        self.fee_pct = fee_pct
        self.trades: List[Trade] = []
        self.equity_curve: List[float] = [initial_capital]

    def run(self, candles: List[Candle]) -> Dict[str, Any]:
        """Runs chronological zero look-ahead backtest simulation."""
        n = len(candles)
        active_trade: Optional[Trade] = None
        start_idx = 45

        for i in range(start_idx, n):
            c = candles[i]
            prev = candles[i - 1]

            # ── 1. Check Exit for Active Trade ──
            if active_trade is not None:
                is_long = active_trade.direction == 'LONG'
                hit_sl = False
                hit_tp = False

                if is_long:
                    if c.low <= active_trade.sl:
                        hit_sl = True
                    if c.high >= active_trade.tp:
                        hit_tp = True
                else: # SHORT
                    if c.high >= active_trade.sl:
                        hit_sl = True
                    if c.low <= active_trade.tp:
                        hit_tp = True

                # Conservative intra-bar conflict resolution
                if hit_sl and hit_tp:
                    hit_tp = False

                if hit_sl:
                    exit_price = active_trade.sl * (1.0 - self.slippage_pct if is_long else 1.0 + self.slippage_pct)
                    pnl_raw = (exit_price - active_trade.entry_price) * active_trade.size if is_long else (active_trade.entry_price - exit_price) * active_trade.size
                    fee = (active_trade.entry_price + exit_price) * active_trade.size * self.fee_pct
                    pnl = pnl_raw - fee
                    active_trade.exit_bar = i
                    active_trade.exit_time = c.time
                    active_trade.exit_price = exit_price
                    active_trade.exit_reason = 'SL'
                    active_trade.pnl = pnl
                    active_trade.pnl_pct = (pnl / (active_trade.entry_price * active_trade.size)) * 100
                    self.capital += pnl
                    self.trades.append(active_trade)
                    active_trade = None

                elif hit_tp:
                    exit_price = active_trade.tp * (1.0 - self.slippage_pct if is_long else 1.0 + self.slippage_pct)
                    pnl_raw = (exit_price - active_trade.entry_price) * active_trade.size if is_long else (active_trade.entry_price - exit_price) * active_trade.size
                    fee = (active_trade.entry_price + exit_price) * active_trade.size * self.fee_pct
                    pnl = pnl_raw - fee
                    active_trade.exit_bar = i
                    active_trade.exit_time = c.time
                    active_trade.exit_price = exit_price
                    active_trade.exit_reason = 'TP'
                    active_trade.pnl = pnl
                    active_trade.pnl_pct = (pnl / (active_trade.entry_price * active_trade.size)) * 100
                    self.capital += pnl
                    self.trades.append(active_trade)
                    active_trade = None

            self.equity_curve.append(self.capital)

            if active_trade is not None:
                continue

            # ── 2. Strategy Signal Detection ──
            risk_capital = self.capital * 0.02 # 2% risk per trade

            # Common Indicator Math
            closes_20 = [x.close for x in candles[i - 20 : i]]
            sma20 = sum(closes_20) / len(closes_20)
            avg_vol = sum([x.volume for x in candles[i - 20 : i]]) / 20.0
            recent_lows = [x.low for x in candles[i - 15 : i - 1]]
            recent_highs = [x.high for x in candles[i - 15 : i - 1]]
            min_low = min(recent_lows) if recent_lows else c.low
            max_high = max(recent_highs) if recent_highs else c.high

            # HTF Range (40 bars)
            htf_window = candles[i - 40 : i]
            htf_max = max([x.high for x in htf_window])
            htf_min = min([x.low for x in htf_window])
            htf_eq = (htf_max + htf_min) / 2.0

            candle_range = c.high - c.low if (c.high - c.low) > 0 else 1.0
            lower_wick = min(c.open, c.close) - c.low
            upper_wick = c.high - max(c.open, c.close)

            # Strategy Branches
            long_trigger = False
            short_trigger = False
            score = 75
            entry_price = c.close
            sl = c.low * 0.996
            tp = c.close * 1.04

            if self.strategy == "order_flow":
                # Order Flow Absorption
                bull_abs = c.volume > (avg_vol * 1.4) and (lower_wick > candle_range * 0.40) and c.close >= c.open
                bear_abs = c.volume > (avg_vol * 1.4) and (upper_wick > candle_range * 0.40) and c.close <= c.open
                if bull_abs:
                    long_trigger = True
                    score = 82
                    entry_price = c.close * (1.0 + self.slippage_pct)
                    sl = c.low * 0.995
                    tp = entry_price + (entry_price - sl) * 3.0
                elif bear_abs:
                    short_trigger = True
                    score = 82
                    entry_price = c.close * (1.0 - self.slippage_pct)
                    sl = c.high * 1.005
                    tp = entry_price - (sl - entry_price) * 3.0

            elif self.strategy == "volatility_squeeze":
                # Volatility Squeeze Release
                var_dev = math.sqrt(sum((x - sma20) ** 2 for x in closes_20) / len(closes_20))
                is_squeeze_breakout = (var_dev < sma20 * 0.015) and (c.volume > avg_vol * 1.35)
                if is_squeeze_breakout and c.close > sma20:
                    long_trigger = True
                    score = 80
                    entry_price = c.close * (1.0 + self.slippage_pct)
                    sl = sma20 * 0.996
                    tp = entry_price + (entry_price - sl) * 3.0
                elif is_squeeze_breakout and c.close < sma20:
                    short_trigger = True
                    score = 80
                    entry_price = c.close * (1.0 - self.slippage_pct)
                    sl = sma20 * 1.004
                    tp = entry_price - (sl - entry_price) * 3.0

            elif self.strategy == "ml_momentum":
                # Multi-tier trend momentum
                closes_50 = [x.close for x in candles[i - 40 : i]]
                sma50 = sum(closes_50) / len(closes_50)
                if c.close > sma20 and sma20 > sma50 and c.volume > avg_vol:
                    long_trigger = True
                    score = 85
                    entry_price = c.close * (1.0 + self.slippage_pct)
                    sl = sma20 * 0.995
                    tp = entry_price + (entry_price - sl) * 3.5
                elif c.close < sma20 and sma20 < sma50 and c.volume > avg_vol:
                    short_trigger = True
                    score = 85
                    entry_price = c.close * (1.0 - self.slippage_pct)
                    sl = sma20 * 1.005
                    tp = entry_price - (sl - entry_price) * 3.5

            elif self.strategy == "stat_mean_reversion":
                # Statistical 2.0-Sigma Reversion
                var_dev = math.sqrt(sum((x - sma20) ** 2 for x in closes_20) / len(closes_20))
                lower_band = sma20 - (2.0 * var_dev)
                upper_band = sma20 + (2.0 * var_dev)
                if c.low < lower_band and c.close > lower_band:
                    long_trigger = True
                    score = 78
                    entry_price = c.close * (1.0 + self.slippage_pct)
                    sl = c.low * 0.995
                    tp = sma20 # Target central equilibrium
                elif c.high > upper_band and c.close < upper_band:
                    short_trigger = True
                    score = 78
                    entry_price = c.close * (1.0 - self.slippage_pct)
                    sl = c.high * 1.005
                    tp = sma20

            elif self.strategy == "3stage_reversal" or self.strategy == "amd":
                # Liquidity Sweep -> Reversal
                ssl_sweep = c.low < min_low and c.close > min_low and lower_wick > candle_range * 0.35
                bsl_sweep = c.high > max_high and c.close < max_high and upper_wick > candle_range * 0.35
                if ssl_sweep:
                    long_trigger = True
                    score = 86
                    entry_price = c.close * (1.0 + self.slippage_pct)
                    sl = min_low * 0.995
                    tp = entry_price + (entry_price - sl) * 3.5
                elif bsl_sweep:
                    short_trigger = True
                    score = 86
                    entry_price = c.close * (1.0 - self.slippage_pct)
                    sl = max_high * 1.005
                    tp = entry_price - (sl - entry_price) * 3.5

            else: # Default: quantum_smc
                is_uptrend = c.close > sma20
                in_discount = c.close < htf_eq
                in_premium = c.close > htf_eq
                ssl_sweep = c.low < min_low and c.close > min_low and (c.close - c.low) > (c.high - c.low) * 0.30
                bsl_sweep = c.high > max_high and c.close < max_high and (c.high - c.close) > (c.high - c.low) * 0.30
                c_prev2 = candles[i - 2]
                bull_fvg = c.low > c_prev2.high
                bear_fvg = c.high < c_prev2.low

                bull_score = (20 if is_uptrend and in_discount else 12) + (20 if ssl_sweep else 0) + (15 if c.close > prev.high else 0) + (15 if bull_fvg else 0) + (15 if c.volume > avg_vol * 1.3 else 5)
                bear_score = (20 if not is_uptrend and in_premium else 12) + (20 if bsl_sweep else 0) + (15 if c.close < prev.low else 0) + (15 if bear_fvg else 0) + (15 if c.volume > avg_vol * 1.3 else 5)

                if bull_score >= self.min_resonance and (ssl_sweep or bull_fvg):
                    long_trigger = True
                    score = bull_score
                    entry_price = c.close * (1.0 + self.slippage_pct)
                    sl = min_low * 0.996
                    tp = entry_price + (entry_price - sl) * 3.2
                elif bear_score >= self.min_resonance and (bsl_sweep or bear_fvg):
                    short_trigger = True
                    score = bear_score
                    entry_price = c.close * (1.0 - self.slippage_pct)
                    sl = max_high * 1.004
                    tp = entry_price - (sl - entry_price) * 3.2

            # Execute Trade Entry
            if long_trigger:
                risk_per_share = entry_price - sl
                if risk_per_share > 0:
                    shares = math.floor(risk_capital / risk_per_share)
                    if shares > 0 and (shares * entry_price) <= self.capital:
                        active_trade = Trade(
                            entry_bar=i, entry_time=c.time, symbol=self.symbol, direction='LONG',
                            entry_price=entry_price, sl=sl, tp=tp, size=shares, resonance_score=score
                        )

            elif short_trigger:
                risk_per_share = sl - entry_price
                if risk_per_share > 0:
                    shares = math.floor(risk_capital / risk_per_share)
                    if shares > 0 and (shares * entry_price) <= self.capital:
                        active_trade = Trade(
                            entry_bar=i, entry_time=c.time, symbol=self.symbol, direction='SHORT',
                            entry_price=entry_price, sl=sl, tp=tp, size=shares, resonance_score=score
                        )

        return self.compute_metrics()

    def compute_metrics(self) -> Dict[str, Any]:
        """Calculates institutional backtesting performance statistics."""
        total_trades = len(self.trades)
        if total_trades == 0:
            return {
                "symbol": self.symbol,
                "strategy": self.strategy,
                "initial_capital": self.initial_capital,
                "final_capital": self.capital,
                "net_profit": 0.0,
                "net_profit_pct": 0.0,
                "total_trades": 0,
                "win_rate": 0.0,
                "profit_factor": 0.0,
                "max_drawdown_pct": 0.0,
                "sharpe_ratio": 0.0,
                "expectancy": 0.0,
                "trades": []
            }

        wins = [t for t in self.trades if t.pnl > 0]
        losses = [t for t in self.trades if t.pnl <= 0]

        total_gain = sum(t.pnl for t in wins)
        total_loss = abs(sum(t.pnl for t in losses))

        win_rate = (len(wins) / total_trades) * 100.0
        profit_factor = (total_gain / total_loss) if total_loss > 0 else 999.0
        net_profit = self.capital - self.initial_capital
        net_profit_pct = (net_profit / self.initial_capital) * 100.0

        avg_win = (total_gain / len(wins)) if wins else 0.0
        avg_loss = (total_loss / len(losses)) if losses else 0.0
        expectancy = ((win_rate / 100.0) * avg_win) - (((100.0 - win_rate) / 100.0) * avg_loss)

        peak = self.initial_capital
        max_dd = 0.0
        for eq in self.equity_curve:
            if eq > peak:
                peak = eq
            dd = (peak - eq) / peak * 100.0
            if dd > max_dd:
                max_dd = dd

        returns = [t.pnl_pct for t in self.trades]
        mean_ret = sum(returns) / len(returns) if returns else 0.0
        var_ret = sum((r - mean_ret) ** 2 for r in returns) / len(returns) if returns else 0.0
        std_ret = math.sqrt(var_ret) if var_ret > 0 else 1.0
        sharpe = (mean_ret / std_ret) * math.sqrt(len(returns)) if std_ret > 0 else 0.0

        return {
            "symbol": self.symbol,
            "strategy": self.strategy,
            "initial_capital": round(self.initial_capital, 2),
            "final_capital": round(self.capital, 2),
            "net_profit": round(net_profit, 2),
            "net_profit_pct": round(net_profit_pct, 2),
            "total_trades": total_trades,
            "winning_trades": len(wins),
            "losing_trades": len(losses),
            "win_rate": round(win_rate, 2),
            "profit_factor": round(profit_factor, 2),
            "max_drawdown_pct": round(max_dd, 2),
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "expectancy": round(expectancy, 2),
            "sharpe_ratio": round(sharpe, 2),
            "trades": [
                {
                    "bar": t.entry_bar,
                    "direction": t.direction,
                    "entry": round(t.entry_price, 2),
                    "exit": round(t.exit_price or 0, 2),
                    "pnl": round(t.pnl, 2),
                    "pnl_pct": round(t.pnl_pct, 2),
                    "reason": t.exit_reason,
                    "resonance": t.resonance_score
                }
                for t in self.trades
            ]
        }

def print_ascii_report(results: Dict[str, Any]):
    """Renders high-visibility institutional ASCII performance dashboard."""
    print("═" * 72)
    print(f"  MI-007 QUANTITATIVE ENGINE — STRATEGY: {results['strategy'].upper()}")
    print(f"  Asset: {results['symbol']} | Initial Capital: ₹{results['initial_capital']:,}")
    print("═" * 72)
    print(f"  Net Profit:            ₹{results['net_profit']:+,.2f} ({results['net_profit_pct']:+.2f}%)")
    print(f"  Ending Capital:        ₹{results['final_capital']:,}")
    print(f"  Total Trades:          {results['total_trades']} ({results['winning_trades']} Won / {results['losing_trades']} Lost)")
    print(f"  Win Rate:              {results['win_rate']:.1f}%")
    print(f"  Profit Factor:         {results['profit_factor']:.2f}")
    print(f"  Max Drawdown:          {results['max_drawdown_pct']:.2f}%")
    print(f"  Expectancy Per Trade:  ₹{results['expectancy']:+,.2f}")
    print(f"  Sharpe Ratio:          {results['sharpe_ratio']:.2f}")
    print("─" * 72)
    if results['trades']:
        print("  RECENT EXECUTIONS:")
        print(f"  {'Type':<6} {'Entry':<10} {'Exit':<10} {'PnL (₹)':<12} {'Return':<8} {'Score':<6} {'Result'}")
        print("─" * 72)
        for t in results['trades'][-8:]:
            res_tag = "WIN" if t['pnl'] > 0 else "LOSS"
            print(f"  {t['direction']:<6} {t['entry']:<10.2f} {t['exit']:<10.2f} {t['pnl']:<+12.2f} {t['pnl_pct']:<+7.2f}% {t['resonance']:<6}% {res_tag}")
    else:
        print("  No executions triggered with current parameters.")
    print("═" * 72)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MI-007 Quantitative Strategies Backtester")
    parser.add_argument("--symbol", type=str, default="RELIANCE", help="Ticker symbol")
    parser.add_argument("--strategy", type=str, default="quantum_smc",
                        choices=["quantum_smc", "order_flow", "volatility_squeeze", "ml_momentum", "stat_mean_reversion", "3stage_reversal", "amd"],
                        help="Proprietary strategy model to backtest")
    parser.add_argument("--bars", type=int, default=600, help="Number of candles")
    parser.add_argument("--capital", type=float, default=100000.0, help="Initial capital in INR")
    parser.add_argument("--resonance", type=int, default=75, help="Minimum resonance score")
    args = parser.parse_args()

    candles = generate_synthetic_market_data(args.symbol, args.bars, 2450.0)
    backtester = QuantumSmcResonanceBacktester(
        symbol=args.symbol,
        strategy=args.strategy,
        initial_capital=args.capital,
        min_resonance=args.resonance
    )
    results = backtester.run(candles)
    print_ascii_report(results)
