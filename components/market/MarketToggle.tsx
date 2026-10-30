'use client';

import { useState, useRef, useEffect } from 'react';
import { MarketType } from '@/lib/types';

interface MarketToggleProps {
  selected?: MarketType;
  market?: MarketType;
  onChange?: (market: MarketType) => void;
  onMarketChange?: (market: MarketType) => void;
  className?: string;
}

const MARKET_OPTIONS: {
  key: MarketType;
  label: string;
  currency: string;
  exchanges: string;
}[] = [
  { key: 'INDIA', label: 'INDIA', currency: '₹', exchanges: 'NSE · BSE' },
  { key: 'USA',   label: 'USA',   currency: '$', exchanges: 'NYSE · NASDAQ · CBOE' },
  { key: 'UAE',   label: 'UAE',   currency: 'AED', exchanges: 'DFM · ADX' },
];

export function MarketToggle({
  selected,
  market,
  onChange,
  onMarketChange,
  className = '',
}: MarketToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMarket: MarketType = selected || market || 'INDIA';
  const activeMarket = MARKET_OPTIONS.find((m) => m.key === currentMarket) || MARKET_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (key: MarketType) => {
    onChange?.(key);
    onMarketChange?.(key);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${isOpen ? 'z-[110]' : 'z-30'} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Select Market"
        className={`
          flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg border font-mono font-bold
          transition-all duration-150 cursor-pointer select-none
          border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)]
          hover:border-emerald-500/60 hover:text-emerald-500
          focus:outline-none focus:ring-2 focus:ring-emerald-500/40
          shadow-xs text-[13px] sm:text-[14px]
          ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/30' : ''}
        `}
      >
        <span className="font-mono font-black tracking-wide">{activeMarket.label}</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-500' : 'text-slate-400'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 z-[150] w-56 sm:w-60 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--theme-card-text-muted)] border-b border-[var(--theme-card-border)] mb-1">
            Active Market Region
          </div>
          <div className="flex flex-col gap-1">
            {MARKET_OPTIONS.map(({ key, label, currency, exchanges }) => {
              const isActive = currentMarket === key;
              return (
                <button
                  key={key}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(key)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-mono
                    transition-all duration-150 cursor-pointer
                    ${isActive
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/30'
                      : 'text-[var(--theme-card-text)] hover:bg-slate-200/50 dark:hover:bg-white/5 font-semibold border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <div>
                      <div className="text-[13px] font-bold tracking-wide flex items-center gap-1.5">
                        <span>{label}</span>
                        <span className="text-[11px] font-normal opacity-70">({currency})</span>
                      </div>
                      <div className="text-[10px] text-[var(--theme-card-text-muted)] font-mono">
                        {exchanges}
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
