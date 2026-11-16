import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseCryptos = [
    { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 82010.0, price_change_percentage_24h: 1.14, market_cap: 1610000000000 },
    { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 2403.0, price_change_percentage_24h: 1.54, market_cap: 289000000000 },
    { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 104.37, price_change_percentage_24h: 2.31, market_cap: 49000000000 },
    { id: 'binancecoin', symbol: 'bnb', name: 'BNB', current_price: 727.0, price_change_percentage_24h: 2.16, market_cap: 106000000000 },
    { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 1.31, price_change_percentage_24h: 1.15, market_cap: 74000000000 },
    { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', current_price: 0.079, price_change_percentage_24h: 2.31, market_cap: 11500000000 },
    { id: 'cardano', symbol: 'ada', name: 'Cardano', current_price: 0.218, price_change_percentage_24h: 0.92, market_cap: 7800000000 },
    { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', current_price: 9.60, price_change_percentage_24h: 1.26, market_cap: 3900000000 },
    { id: 'chainlink', symbol: 'link', name: 'Chainlink', current_price: 12.09, price_change_percentage_24h: 1.51, market_cap: 7200000000 },
    { id: 'polkadot', symbol: 'dot', name: 'Polkadot', current_price: 1.16, price_change_percentage_24h: -0.85, market_cap: 1700000000 },
    { id: 'polygon-ecosystem-token', symbol: 'matic', name: 'Polygon', current_price: 0.126, price_change_percentage_24h: 0.80, market_cap: 1250000000 },
    { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu', current_price: 0.0000185, price_change_percentage_24h: -0.85, market_cap: 10900000000 },
  ];

  const cryptos = baseCryptos.map((c) => {
    const jitter = (Math.random() - 0.49) * 0.0008 * c.current_price;
    const decimals = c.current_price < 0.01 ? 7 : c.current_price < 2 ? 4 : c.current_price < 20 ? 3 : 2;
    return {
      ...c,
      current_price: +(c.current_price + jitter).toFixed(decimals),
    };
  });

  return NextResponse.json(cryptos);
}
