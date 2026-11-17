import fs from 'fs';
import path from 'path';

interface CandleRecord {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean;
}

interface InstrumentMeta {
  symbol: string;
  name: string;
  market: 'INDIA' | 'USA';
  yahoo: string;
  category: 'INDEX' | 'STOCK' | 'CRYPTO' | 'COMMODITY' | 'FOREX';
}

const INSTRUMENTS: InstrumentMeta[] = [
  // ── Indian Benchmark Indices ──
  { symbol: 'BANKNIFTY', name: 'Nifty Bank Index', market: 'INDIA', yahoo: '^NSEBANK', category: 'INDEX' },
  { symbol: 'NIFTY', name: 'Nifty 50 Index', market: 'INDIA', yahoo: '^NSEI', category: 'INDEX' },
  { symbol: 'FINNIFTY', name: 'Nifty Financial Services', market: 'INDIA', yahoo: 'NIFTY_FIN_SERVICE.NS', category: 'INDEX' },
  { symbol: 'SENSEX', name: 'BSE Sensex Index', market: 'INDIA', yahoo: '^BSESN', category: 'INDEX' },
  { symbol: 'MIDCPNIFTY', name: 'Nifty Midcap 50', market: 'INDIA', yahoo: '^NSEMDCP50', category: 'INDEX' },
  { symbol: 'INDIAVIX', name: 'India Volatility Index', market: 'INDIA', yahoo: '^INDIAVIX', category: 'INDEX' },

  // ── Indian Bluechip Equities ──
  { symbol: 'RELIANCE', name: 'Reliance Industries', market: 'INDIA', yahoo: 'RELIANCE.NS', category: 'STOCK' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', market: 'INDIA', yahoo: 'TCS.NS', category: 'STOCK' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', market: 'INDIA', yahoo: 'HDFCBANK.NS', category: 'STOCK' },
  { symbol: 'INFY', name: 'Infosys Ltd', market: 'INDIA', yahoo: 'INFY.NS', category: 'STOCK' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', market: 'INDIA', yahoo: 'ICICIBANK.NS', category: 'STOCK' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', market: 'INDIA', yahoo: 'TMPV.NS', category: 'STOCK' },
  { symbol: 'SBIN', name: 'State Bank of India', market: 'INDIA', yahoo: 'SBIN.NS', category: 'STOCK' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', market: 'INDIA', yahoo: 'BHARTIARTL.NS', category: 'STOCK' },
  { symbol: 'ITC', name: 'ITC Ltd', market: 'INDIA', yahoo: 'ITC.NS', category: 'STOCK' },
  { symbol: 'LT', name: 'Larsen & Toubro', market: 'INDIA', yahoo: 'LT.NS', category: 'STOCK' },

  // ── USA Benchmark Indices ──
  { symbol: 'SPX', name: 'S&P 500 Index', market: 'USA', yahoo: '^GSPC', category: 'INDEX' },
  { symbol: 'DJI', name: 'Dow Jones Industrial Average', market: 'USA', yahoo: '^DJI', category: 'INDEX' },
  { symbol: 'NASDAQ', name: 'Nasdaq Composite', market: 'USA', yahoo: '^IXIC', category: 'INDEX' },
  { symbol: 'NDX', name: 'Nasdaq 100 Index', market: 'USA', yahoo: '^NDX', category: 'INDEX' },
  { symbol: 'VIX', name: 'CBOE Volatility Index', market: 'USA', yahoo: '^VIX', category: 'INDEX' },

  // ── USA Tech & Strategic Watchlist ──
  { symbol: 'NVDA', name: 'NVIDIA Corporation', market: 'USA', yahoo: 'NVDA', category: 'STOCK' },
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'USA', yahoo: 'AAPL', category: 'STOCK' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', market: 'USA', yahoo: 'MSFT', category: 'STOCK' },
  { symbol: 'TSLA', name: 'Tesla Inc.', market: 'USA', yahoo: 'TSLA', category: 'STOCK' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', market: 'USA', yahoo: 'AMZN', category: 'STOCK' },
  { symbol: 'META', name: 'Meta Platforms Inc.', market: 'USA', yahoo: 'META', category: 'STOCK' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', market: 'USA', yahoo: 'GOOGL', category: 'STOCK' },

  // ── Cryptocurrencies (24/7/365) ──
  { symbol: 'BTC', name: 'Bitcoin', market: 'USA', yahoo: 'BTC-USD', category: 'CRYPTO' },
  { symbol: 'ETH', name: 'Ethereum', market: 'USA', yahoo: 'ETH-USD', category: 'CRYPTO' },
  { symbol: 'SOL', name: 'Solana', market: 'USA', yahoo: 'SOL-USD', category: 'CRYPTO' },
  { symbol: 'BNB', name: 'Binance Coin', market: 'USA', yahoo: 'BNB-USD', category: 'CRYPTO' },
  { symbol: 'DOGE', name: 'Dogecoin', market: 'USA', yahoo: 'DOGE-USD', category: 'CRYPTO' },
  { symbol: 'XRP', name: 'Ripple', market: 'USA', yahoo: 'XRP-USD', category: 'CRYPTO' },
  { symbol: 'ADA', name: 'Cardano', market: 'USA', yahoo: 'ADA-USD', category: 'CRYPTO' },
  { symbol: 'AVAX', name: 'Avalanche', market: 'USA', yahoo: 'AVAX-USD', category: 'CRYPTO' },

  // ── Commodities & Foreign Exchange ──
  { symbol: 'GOLD', name: 'Gold Continuous Contract', market: 'USA', yahoo: 'GC=F', category: 'COMMODITY' },
  { symbol: 'SILVER', name: 'Silver Continuous Contract', market: 'USA', yahoo: 'SI=F', category: 'COMMODITY' },
  { symbol: 'BRENT', name: 'Brent Crude Oil', market: 'USA', yahoo: 'BZ=F', category: 'COMMODITY' },
  { symbol: 'CRUDEOIL', name: 'WTI Crude Oil', market: 'USA', yahoo: 'CL=F', category: 'COMMODITY' },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', market: 'USA', yahoo: 'EURUSD=X', category: 'FOREX' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', market: 'USA', yahoo: 'GBPUSD=X', category: 'FOREX' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', market: 'USA', yahoo: 'JPY=X', category: 'FOREX' },
  { symbol: 'USDINR', name: 'US Dollar / Indian Rupee', market: 'USA', yahoo: 'INR=X', category: 'FOREX' },
];

async function fetch5YrDailyHistory(meta: InstrumentMeta): Promise<CandleRecord[] | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(meta.yahoo)}?interval=1d&range=5y`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(6000) : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const closes: (number | null)[] = quote.close || [];
    const volumes: (number | null)[] = quote.volume || [];

    const candles: CandleRecord[] = [];
    const now = Date.now();

    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (o == null || h == null || l == null || c == null || isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) {
        continue;
      }
      const openTime = timestamps[i] * 1000;
      if (openTime > now + 86400000) continue;

      candles.push({
        openTime,
        open: +o.toFixed(2),
        high: +Math.max(h, o, c).toFixed(2),
        low: +Math.min(l, o, c).toFixed(2),
        close: +c.toFixed(2),
        volume: volumes[i] ? Math.round(volumes[i]!) : 0,
        isClosed: i < timestamps.length - 1,
      });
    }

    return candles.length > 0 ? candles : null;
  } catch (err) {
    console.warn(`[Pull5Yr] Error for ${meta.symbol}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function main() {
  const outputDir = path.join(process.cwd(), 'public', 'data', 'history-5y');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Starting 5-Year Historical Candle Pull for ${INSTRUMENTS.length} instruments...`);
  console.log(`Output Directory: ${outputDir}\n`);

  const results: { symbol: string; count: number; from: string; to: string; status: string }[] = [];

  for (const inst of INSTRUMENTS) {
    const candles = await fetch5YrDailyHistory(inst);
    if (candles && candles.length > 0) {
      const filePath = path.join(outputDir, `${inst.symbol}.json`);
      fs.writeFileSync(filePath, JSON.stringify(candles, null, 2), 'utf-8');

      const fromDate = new Date(candles[0].openTime).toISOString().slice(0, 10);
      const toDate = new Date(candles[candles.length - 1].openTime).toISOString().slice(0, 10);

      results.push({
        symbol: inst.symbol,
        count: candles.length,
        from: fromDate,
        to: toDate,
        status: 'SUCCESS',
      });
      console.log(`✓ ${inst.symbol.padEnd(12)} -> ${String(candles.length).padStart(4)} daily bars (${fromDate} to ${toDate})`);
    } else {
      results.push({
        symbol: inst.symbol,
        count: 0,
        from: 'N/A',
        to: 'N/A',
        status: 'FAILED',
      });
      console.log(`✗ ${inst.symbol.padEnd(12)} -> FAILED`);
    }
    // Polite 80ms throttle between Yahoo requests
    await new Promise((r) => setTimeout(r, 80));
  }

  // Write manifest index file
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalInstruments: results.length,
    successfulInstruments: results.filter((r) => r.status === 'SUCCESS').length,
    instruments: results,
  }, null, 2), 'utf-8');

  console.log(`\nManifest saved to ${manifestPath}`);
  console.log(`Successfully pulled and cached 5-year history for ${results.filter((r) => r.status === 'SUCCESS').length} / ${results.length} instruments.`);
}

main().catch(console.error);
