'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { MarketType, MARKETS } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';
import { getTickerData } from '@/lib/mockData';

interface TickerTapeProps {
  market?: MarketType;
  currency?: string;
}

const MACRO_ITEMS = [
  { symbol: 'DXY', displayVal: '104.20', isMacro: true, change: 0, changePct: 0, price: 104.20 },
  { symbol: 'XAU/USD', displayVal: '2,150.50', isMacro: true, change: 0, changePct: 0, price: 2150.50 },
  { symbol: 'US10Y', displayVal: '4.25%', isMacro: true, change: 0, changePct: 0, price: 4.25 },
  { symbol: 'BRENT', displayVal: '$82.50', isMacro: true, change: 0, changePct: 0, price: 82.50 },
  { symbol: 'VIX', displayVal: '13.40', isMacro: true, change: 0, changePct: 0, price: 13.40 },
];

export function TickerTape({ market: propMarket, currency: propCurrency }: TickerTapeProps) {
  const context = useMarket();
  const activeMarket = propMarket ?? context.market ?? 'USA';
  const currency = propCurrency ?? context.currency ?? MARKETS[activeMarket]?.currency ?? '$';

  // Stable, static market data without random fluctuations
  const displayItems = useMemo(() => {
    const baseList = getTickerData(activeMarket);
    return [...baseList, ...MACRO_ITEMS];
  }, [activeMarket]);

  // Duplicate data array for seamless 50% translation marquee
  const items = [...displayItems, ...displayItems];

  return (
    <div
      className="w-full overflow-hidden border-b select-none relative z-40 flex items-center shadow-xs ticker-tape-container"
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

      {/* Marquee viewport container spanning full ribbon */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        {/* Edge gradient fade masks for smooth ribbon entry/exit */}
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none ticker-tape-fade-left" />
        <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none ticker-tape-fade-right" />

        {/* Rolling Ribbon Belt */}
        <div className="ticker-ribbon-belt pl-3">
          {items.map((item, idx) => {
            const isMacro = (item as any).isMacro;
            const displayVal = (item as any).displayVal;
            const isUp = item.change >= 0;
            const cleanSym = item.symbol.replace(/\s+/g, '');
            const href = `/chart/${cleanSym}?market=${activeMarket}`;

            return (
              <Link
                key={`${item.symbol}-${idx}`}
                href={isMacro ? '#' : href}
                className={`inline-flex items-center gap-2 px-3 text-[14px] mono shrink-0 whitespace-nowrap transition-colors rounded py-0.5 ticker-tape-item ${
                  isMacro ? 'cursor-default' : 'cursor-pointer hover:opacity-80 hover:scale-[1.02]'
                }`}
              >
                <span className="font-black tracking-wider ticker-tape-sym">
                  {item.symbol}
                </span>

                <span className="font-black ticker-tape-val">
                  {displayVal
                    ? displayVal
                    : `${currency}${item.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
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
                <span className="ticker-tape-pipe ml-2 font-normal">|</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
