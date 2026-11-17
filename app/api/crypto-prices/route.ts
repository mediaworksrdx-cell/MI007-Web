import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface BaseCrypto {
  id: string;
  symbol: string;
  name: string;
  binanceSym: string;
  fallbackPrice: number;
  fallbackPct: number;
  market_cap: number;
}

const TRACKED_CRYPTOS: BaseCrypto[] = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', binanceSym: 'BTCUSDT', fallbackPrice: 65046.00, fallbackPct: 1.28, market_cap: 1610000000000 },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', binanceSym: 'ETHUSDT', fallbackPrice: 1821.72, fallbackPct: 1.07, market_cap: 289000000000 },
  { id: 'solana', symbol: 'sol', name: 'Solana', binanceSym: 'SOLUSDT', fallbackPrice: 74.02, fallbackPct: 4.27, market_cap: 49000000000 },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', binanceSym: 'BNBUSDT', fallbackPrice: 593.38, fallbackPct: 1.21, market_cap: 106000000000 },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', binanceSym: 'XRPUSDT', fallbackPrice: 0.9711, fallbackPct: 2.24, market_cap: 74000000000 },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', binanceSym: 'DOGEUSDT', fallbackPrice: 0.05937, fallbackPct: 1.77, market_cap: 11500000000 },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', binanceSym: 'ADAUSDT', fallbackPrice: 0.1547, fallbackPct: 2.31, market_cap: 7800000000 },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', binanceSym: 'AVAXUSDT', fallbackPrice: 7.22, fallbackPct: 1.91, market_cap: 3900000000 },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink', binanceSym: 'LINKUSDT', fallbackPrice: 9.26, fallbackPct: 1.99, market_cap: 7200000000 },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot', binanceSym: 'DOTUSDT', fallbackPrice: 0.7380, fallbackPct: 1.79, market_cap: 1700000000 },
  { id: 'polygon-ecosystem-token', symbol: 'matic', name: 'Polygon', binanceSym: 'POLUSDT', fallbackPrice: 0.08207, fallbackPct: 4.53, market_cap: 1250000000 },
  { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu', binanceSym: 'SHIBUSDT', fallbackPrice: 0.00000387, fallbackPct: 1.04, market_cap: 10900000000 },
];

export async function GET() {
  const binanceMap = new Map<string, { price: number; changePct: number }>();
  const symbols = TRACKED_CRYPTOS.map(c => c.binanceSym);

  const binanceUrls = [
    `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`,
    `https://api.binance.us/api/v3/ticker/24hr`
  ];

  for (const bUrl of binanceUrls) {
    try {
      const res = await fetch(bUrl, {
        cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(3000) : undefined,
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          for (const item of data) {
            const sym = String(item.symbol || '').toUpperCase();
            const price = parseFloat(item.lastPrice);
            const changePct = parseFloat(item.priceChangePercent);
            if (!isNaN(price) && price > 0) {
              binanceMap.set(sym, {
                price,
                changePct: !isNaN(changePct) ? +changePct.toFixed(2) : 0,
              });
            }
          }
          if (binanceMap.size >= 5) break; // Successfully fetched from Binance
        }
      }
    } catch (_err) {
      // Try next endpoint
    }
  }

  const cryptos = TRACKED_CRYPTOS.map((c) => {
    const live = binanceMap.get(c.binanceSym) || binanceMap.get(c.symbol.toUpperCase() + 'USDT');
    const rawPrice = live ? live.price : c.fallbackPrice;
    const changePct = live ? live.changePct : c.fallbackPct;
    const decimals = rawPrice < 0.01 ? 8 : rawPrice < 2 ? 4 : rawPrice < 20 ? 3 : 2;

    return {
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      current_price: +rawPrice.toFixed(decimals),
      price_change_percentage_24h: changePct,
      market_cap: c.market_cap,
    };
  });

  return NextResponse.json(cryptos);
}
