'use client';

import React, { useMemo } from 'react';
import { MarketType, MARKETS } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';
import { useTradeEngine } from '@/lib/tradeEngineContext';
import { getTickerData } from '@/lib/mockData';

interface TickerTapeProps {
  market?: MarketType;
  currency?: string;
}

export function TickerTape({ market: propMarket, currency: propCurrency }: TickerTapeProps) {
  const context = useMarket();
  const activeMarket = propMarket ?? context.market ?? 'INDIA';
  const currency = propCurrency ?? context.currency ?? MARKETS[activeMarket]?.currency ?? '₹';

  const { livePrices, macroData, status } = useTradeEngine();

  // Combine real TradeEngine prices with base market instruments
  const displayItems = useMemo(() => {
    const baseList = getTickerData(activeMarket);

    // Merge in live prices from TradeEngine if available
    const merged = baseList.map(item => {
      // Find matching live price
      let live = livePrices.get(item.symbol.toUpperCase());
      if (!live && item.symbol === 'NIFTY') live = livePrices.get('NIFTY50') || livePrices.get('NIFTY');
      if (!live && item.symbol === 'BANKNIFTY') live = livePrices.get('BANKNIFTY');
      if (!live) {
        // Try symbol.NS
        live = livePrices.get(`${item.symbol.toUpperCase()}.NS`);
      }

      if (live && live.price > 0) {
        return {
          symbol: item.symbol,
          price: live.price,
          change: live.change,
          changePct: live.changePct,
        };
      }
      return item;
    });

    // Also include live macro benchmarks if available
    const macroItems = (macroData.length > 0 ? macroData : [
      { symbol: 'DXY', value: '104.20' },
      { symbol: 'XAU/USD', value: '2,150.50' },
      { symbol: 'US10Y', value: '4.25%' },
      { symbol: 'BRENT', value: '82.50' },
      { symbol: 'VIX', value: '13.40' },
    ]).map(m => ({
      symbol: m.symbol,
      price: parseFloat(m.value.replace(/[^0-9.]/g, '')) || 0,
      change: 0,
      changePct: 0,
      isMacro: true,
      displayVal: m.value,
    }));

    return [...merged, ...macroItems];
  }, [activeMarket, livePrices, macroData]);

  // Duplicate data array for seamless 50% translation marquee
  const items = [...displayItems, ...displayItems];

  return (
    <div
      className="w-full overflow-hidden border-b border-slate-200 bg-white/95 backdrop-blur-md select-none relative z-40 flex items-center shadow-sm"
      style={{
        height: '36px',
        maxHeight: '36px',
        minHeight: '36px',
      }}
    >
      {/* Strict inline CSS: guaranteed non-wrapping horizontal ribbon marquee */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes tickerMarqueeRoll {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .ticker-ribbon-belt {
              display: flex !important;
              flex-direction: row !important;
              flex-wrap: nowrap !important;
              align-items: center !important;
              white-space: nowrap !important;
              width: max-content !important;
              will-change: transform;
              animation: tickerMarqueeRoll 42s linear infinite !important;
            }
            .ticker-ribbon-belt:hover {
              animation-play-state: paused !important;
            }
          `,
        }}
      />

      {/* Engine Status indicator badge pinned at left */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center px-2.5 bg-slate-900 text-white text-[11px] font-mono font-bold tracking-wider border-r border-slate-700">
        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <span>{status === 'connected' ? 'LIVE' : 'SYNCING'}</span>
      </div>

      {/* Edge gradient fade masks for smooth ribbon entry/exit */}
      <div className="absolute left-16 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      {/* Rolling Ribbon Belt */}
      <div className="ticker-ribbon-belt ml-20">
        {items.map((item, idx) => (
          <div
            key={`${item.symbol}-${idx}`}
            className="inline-flex items-center gap-2 px-3 text-[14px] mono shrink-0 whitespace-nowrap cursor-default hover:bg-slate-100 transition-colors rounded py-0.5"
          >
            <span className="font-black text-black tracking-wider">
              {item.symbol}
            </span>
            <span className="font-extrabold text-slate-900">
              {(item as any).displayVal ? (item as any).displayVal : `${currency}${item.price.toLocaleString(undefined, { minimumFractionDigits: item.price < 10 ? 2 : 2, maximumFractionDigits: 2 })}`}
            </span>
            {!(item as any).isMacro && (
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  item.change >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {item.change >= 0 ? '▲' : '▼'}
                {Math.abs(item.changePct).toFixed(2)}%
              </span>
            )}
            <span className="text-slate-300 ml-2 font-normal">|</span>
          </div>
        ))}
      </div>
    </div>
  );
}
