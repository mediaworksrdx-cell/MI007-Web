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

  const { livePrices, macroData, status, getSymbolPrice } = useTradeEngine();

  // Combine real TradeEngine prices with base market instruments
  const displayItems = useMemo(() => {
    const baseList = getTickerData(activeMarket);

    // Merge in live prices from TradeEngine
    const merged = baseList.map(item => {
      let live = getSymbolPrice(item.symbol);
      if (!live) {
        live = livePrices.get(item.symbol.toUpperCase()) ||
               livePrices.get(item.symbol.replace(/\s+/g, '').toUpperCase()) ||
               livePrices.get(`${item.symbol.toUpperCase()}.NS`);
      }

      if (live && live.price > 0) {
        return {
          symbol: item.symbol,
          price: live.price,
          change: live.change,
          changePct: live.changePct,
          direction: live.tickDirection,
          lastUpdated: live.lastUpdated,
        };
      }
      return {
        ...item,
        direction: 'neutral' as const,
        lastUpdated: 0,
      };
    });

    // Also include live macro benchmarks
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
      direction: 'neutral' as const,
      lastUpdated: 0,
    }));

    return [...merged, ...macroItems];
  }, [activeMarket, livePrices, macroData]);

  // Duplicate data array for seamless 50% translation marquee
  const items = [...displayItems, ...displayItems];

  return (
    <div
      className="w-full overflow-hidden border-b border-slate-200 bg-white/95 backdrop-blur-md select-none relative z-40 flex items-center shadow-xs"
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
              animation: tickerMarqueeRoll 40s linear infinite !important;
            }
            .ticker-ribbon-belt:hover {
              animation-play-state: paused !important;
            }
          `,
        }}
      />

      {/* Pinned Engine Status Badge — Flex item, NEVER overlaps marquee belt */}
      <div className="flex-shrink-0 z-30 flex items-center gap-1.5 px-3 h-full bg-slate-950 text-white text-[11px] font-mono font-bold tracking-wider border-r border-slate-800 shadow-md">
        <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        <span>LIVE</span>
        <span className="text-slate-600 font-normal">|</span>
        <span className="text-emerald-400 font-bold">ENGINE</span>
      </div>

      {/* Marquee viewport container strictly starting AFTER the badge */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        {/* Edge gradient fade masks for smooth ribbon entry/exit */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Rolling Ribbon Belt */}
        <div className="ticker-ribbon-belt pl-2">
          {items.map((item, idx) => {
            const isMacro = (item as any).isMacro;
            const displayVal = (item as any).displayVal;
            const isUp = item.change >= 0;

            return (
              <div
                key={`${item.symbol}-${idx}`}
                className="inline-flex items-center gap-2 px-3 text-[14px] mono shrink-0 whitespace-nowrap cursor-default hover:bg-slate-100 transition-colors rounded py-0.5"
              >
                <span className="font-black text-black tracking-wider">
                  {item.symbol}
                </span>

                <span
                  className={`font-extrabold transition-colors duration-300 ${
                    item.direction === 'up'
                      ? 'text-emerald-600'
                      : item.direction === 'down'
                      ? 'text-rose-600'
                      : 'text-slate-900'
                  }`}
                >
                  {displayVal
                    ? displayVal
                    : `${currency}${item.price.toLocaleString(undefined, {
                        minimumFractionDigits: item.price < 10 ? 2 : 2,
                        maximumFractionDigits: 2,
                      })}`}
                </span>

                {!isMacro && (
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      isUp ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isUp ? '▲' : '▼'}
                    {Math.abs(item.changePct).toFixed(2)}%
                  </span>
                )}
                <span className="text-slate-300 ml-2 font-normal">|</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
