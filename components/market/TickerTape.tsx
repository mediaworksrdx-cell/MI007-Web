'use client';

import React, { useState, useEffect } from 'react';
import { MarketType, MARKETS } from '@/lib/types';
import { getTickerData } from '@/lib/mockData';
import { useMarket } from '@/lib/marketContext';

interface TickerTapeProps {
  market?: MarketType;
  currency?: string;
}

export function TickerTape({ market: propMarket, currency: propCurrency }: TickerTapeProps) {
  const context = useMarket();
  const activeMarket = propMarket ?? context.market ?? 'INDIA';
  const currency = propCurrency ?? context.currency ?? MARKETS[activeMarket]?.currency ?? '₹';

  const [data, setData] = useState(() => getTickerData(activeMarket));

  // Sync data whenever activeMarket switches
  useEffect(() => {
    setData(getTickerData(activeMarket));
  }, [activeMarket]);

  // Client-side live simulation: gentle tick variations without SSR mismatch
  useEffect(() => {
    const timer = setInterval(() => {
      setData(prev =>
        prev.map(item => {
          if (Math.random() > 0.4) return item;
          const jitter = (Math.random() - 0.49) * item.price * 0.0006;
          const newPrice = +(item.price + jitter).toFixed(item.price < 10 ? 2 : 2);
          const newChange = +(item.change + jitter).toFixed(2);
          const newPct = +((newChange / (newPrice - newChange)) * 100).toFixed(2);
          return {
            ...item,
            price: newPrice,
            change: newChange,
            changePct: newPct,
          };
        })
      );
    }, 2800);
    return () => clearInterval(timer);
  }, [activeMarket]);

  // Duplicate data array for seamless 50% translation marquee
  const items = [...data, ...data];

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
              animation: tickerMarqueeRoll 36s linear infinite !important;
            }
            .ticker-ribbon-belt:hover {
              animation-play-state: paused !important;
            }
          `,
        }}
      />

      {/* Edge gradient fade masks for smooth ribbon entry/exit */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      {/* Rolling Ribbon Belt */}
      <div className="ticker-ribbon-belt">
        {items.map((item, idx) => (
          <div
            key={`${item.symbol}-${idx}`}
            className="inline-flex items-center gap-2 px-3 text-[14px] mono shrink-0 whitespace-nowrap cursor-default hover:bg-slate-100 transition-colors rounded py-0.5"
          >
            <span className="font-black text-black tracking-wider">
              {item.symbol}
            </span>
            <span className="font-extrabold text-slate-900">
              {currency}{item.price.toLocaleString(undefined, { minimumFractionDigits: item.price < 10 ? 2 : 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`font-bold flex items-center gap-0.5 ${
                item.change >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {item.change >= 0 ? '▲' : '▼'}
              {Math.abs(item.changePct).toFixed(2)}%
            </span>
            <span className="text-slate-300 ml-2 font-normal">|</span>
          </div>
        ))}
      </div>
    </div>
  );
}
