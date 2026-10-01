'use client';

import { MarketType, MARKETS } from '@/lib/types';

interface MarketToggleProps {
  selected: MarketType;
  onChange: (market: MarketType) => void;
  className?: string;
}

const markets: { key: MarketType; label: string; flag: string }[] = [
  { key: 'INDIA', label: 'INDIA', flag: '🇮🇳' },
  { key: 'USA',   label: 'USA',   flag: '🇺🇸' },
  { key: 'UAE',   label: 'UAE',   flag: '🇦🇪' },
];

export function MarketToggle({ selected, onChange, className = '' }: MarketToggleProps) {
  return (
    <div
      className={`flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 ${className}`}
    >
      {markets.map(({ key, label, flag }) => {
        const isActive = selected === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`
              relative flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[14px] font-bold
              transition-all duration-200 font-mono tracking-wide
              ${isActive
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                : 'text-black font-bold hover:text-black hover:bg-slate-200/50'
              }
            `}
          >
            <span>{flag}</span>
            <span>{label}</span>
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-emerald-600"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
