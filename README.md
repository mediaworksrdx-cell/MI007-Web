# Market Intelligence MI-007

Multi-market institutional charting, Smart Money Concepts (SMC) analysis, Order Flow, and Options/F&O analytics web application built with Next.js.

## Features
- **Live Market Charts & Quotes**: Real exchange OHLCV data and live quotes across India (NSE/BSE), USA (NYSE/NASDAQ), UAE (DFM/ADX), Crypto (Binance Spot), Commodities, and Forex.
- **Smart Money Concepts (SMC) Engine** (`lib/smcEngine.ts`): Closed-candle swing structure (`BOS` / `CHoCH`), liquidity sweeps (`BSL`/`SSL`/`EQH`/`EQL`), Order Blocks, Breakers, Fair Value Gaps (`FVG`/`IFVG`), session levels, and 16 institutional setup scanners offloaded to a Web Worker (`lib/smc.worker.ts`).
- **SMC Scanner & Screeners** (`components/screener/SmcScannerView.tsx`): Real-time `/api/candles`-backed multi-symbol SMC setup scanning with `>= 70` quality filtering.
- **F&O & Options Analytics**: Option chains, payoff diagrams, strategy optimizer, and spot-anchored candlestick overlays.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npx tsx scripts/verify-smc-accuracy.ts
npx tsc --noEmit
```
