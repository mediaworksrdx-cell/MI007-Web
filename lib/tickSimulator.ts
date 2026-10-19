// ─── Market Intelligence MI- 007 — Real-Time Tick Simulator ─────────────────
import { Candle, MarketType } from './types';

export type TickCallback = (candle: Candle, isNew: boolean) => void;

interface TickSimulatorOptions {
  market: MarketType;
  symbol: string;
  timeframeMs: number;
  intervalMs?: number; // tick frequency in ms
  onTick: TickCallback;
}

export class TickSimulator {
  private timer: ReturnType<typeof setInterval> | null = null;
  private currentCandle: Candle | null = null;
  private options: TickSimulatorOptions;
  private lastPrice: number;

  constructor(options: TickSimulatorOptions) {
    this.options = options;
    this.lastPrice = this.getBasePrice();
    this.currentCandle = this.newCandle(this.lastPrice);
  }

  private getBasePrice(): number {
    const prices: Record<MarketType, Record<string, number>> = {
      INDIA: { NIFTY: 23146, BANKNIFTY: 55844, RELIANCE: 1211, TCS: 2465, HDFCBANK: 729 },
      USA: { SPX: 7659.40, NDX: 29187.50, DJI: 52002.40, QQQ: 715.20, VIX: 18.40, AAPL: 343.50, NVDA: 214.10, TSLA: 354.70 },
      UAE: { DFMGI: 4850, ADXGI: 9250, EMAAR: 8.45, FAB: 13.80, DEWA: 2.92 },
    };
    return prices[this.options.market]?.[this.options.symbol] ?? 1000;
  }

  private newCandle(open: number): Candle {
    const now = Date.now();
    const alignedTime = Math.floor(now / this.options.timeframeMs) * this.options.timeframeMs;
    return {
      openTime: alignedTime,
      open: +open.toFixed(2),
      high: +open.toFixed(2),
      low: +open.toFixed(2),
      close: +open.toFixed(2),
      volume: 0,
    };
  }

  start(seedCandles: Candle[]): void {
    if (seedCandles.length > 0) {
      this.lastPrice = seedCandles[seedCandles.length - 1].close;
      this.currentCandle = { ...seedCandles[seedCandles.length - 1] };
    }

    this.timer = setInterval(() => {
      if (!this.currentCandle) return;

      const base = this.lastPrice;
      const vol = base * 0.0003;
      const tick = (Math.random() - 0.495) * vol * 2;
      this.lastPrice = +(base + tick).toFixed(2);

      const now = Date.now();
      const alignedTime = Math.floor(now / this.options.timeframeMs) * this.options.timeframeMs;
      const isNew = alignedTime > this.currentCandle.openTime;

      if (isNew) {
        // Start new candle
        this.currentCandle = this.newCandle(this.lastPrice);
        this.options.onTick({ ...this.currentCandle }, true);
      } else {
        // Update current candle
        this.currentCandle = {
          ...this.currentCandle,
          high: Math.max(this.currentCandle.high, this.lastPrice),
          low: Math.min(this.currentCandle.low, this.lastPrice),
          close: this.lastPrice,
          volume: this.currentCandle.volume + Math.floor(base * (5 + Math.random() * 20)),
        };
        this.options.onTick({ ...this.currentCandle }, false);
      }
    }, this.options.intervalMs ?? 800);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
