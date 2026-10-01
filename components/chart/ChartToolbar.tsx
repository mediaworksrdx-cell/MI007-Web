'use client';

import { Timeframe } from '@/lib/types';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'];
const CHART_TYPES = [
  { value: 'CANDLESTICK', label: 'Candle' },
  { value: 'LINE',        label: 'Line'   },
  { value: 'AREA',        label: 'Area'   },
  { value: 'HEIKIN_ASHI', label: 'H-Ashi' },
] as const;

interface ChartToolbarProps {
  timeframe: Timeframe;
  chartType: string;
  showVolume: boolean;
  activeIndicators: string[];
  onTimeframeChange: (tf: Timeframe) => void;
  onChartTypeChange: (type: string) => void;
  onToggleVolume: () => void;
  onToggleIndicator: (name: string) => void;
}

const OVERLAYS = ['EMA', 'SMA', 'BOLLINGER', 'VWAP'];
const PANELS   = ['RSI', 'MACD'];

export function ChartToolbar({
  timeframe, chartType, showVolume, activeIndicators,
  onTimeframeChange, onChartTypeChange, onToggleVolume, onToggleIndicator,
}: ChartToolbarProps) {
  const isActive = (name: string) =>
    name === 'VOLUME' ? showVolume : activeIndicators.includes(name);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-navy bg-surface-card px-3 py-2.5">
      {/* ── Timeframes ── */}
      <div className="flex items-center gap-0.5 rounded-md border border-border-navy/50 bg-bg-midnight p-0.5">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className={`px-2.5 py-1 rounded text-[13px] font-bold mono transition-all ${
              timeframe === tf
                ? 'bg-surface-variant text-mint-green'
                : 'text-black hover:text-black hover:bg-slate-100'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border-navy" />

      {/* ── Chart Types ── */}
      <div className="flex items-center gap-0.5 rounded-md border border-border-navy/50 bg-bg-midnight p-0.5">
        {CHART_TYPES.map(ct => (
          <button
            key={ct.value}
            onClick={() => onChartTypeChange(ct.value)}
            className={`px-2.5 py-1 rounded text-[13px] font-bold mono transition-all ${
              chartType === ct.value
                ? 'bg-surface-variant text-text-primary'
                : 'text-black hover:text-black hover:bg-slate-100'
            }`}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border-navy" />

      {/* ── Overlays ── */}
      <span className="text-[12px] text-black font-black tracking-widest uppercase">Overlay</span>
      {OVERLAYS.map(name => (
        <button
          key={name}
          onClick={() => onToggleIndicator(name)}
          className={`px-2.5 py-1 rounded border text-[13px] font-bold mono transition-all ${
            isActive(name)
              ? 'border-mint-green/60 bg-mint-green/10 text-mint-green'
              : 'border-border-navy/50 text-black hover:text-black hover:border-slate-400 bg-white'
          }`}
        >
          {name}
        </button>
      ))}

      {/* Divider */}
      <div className="h-5 w-px bg-border-navy" />

      {/* ── Sub-panels ── */}
      <span className="text-[12px] text-black font-black tracking-widest uppercase">Panel</span>
      <button
        onClick={onToggleVolume}
        className={`px-2.5 py-1 rounded border text-[13px] font-bold mono transition-all ${
          showVolume
            ? 'border-mint-green/60 bg-mint-green/10 text-mint-green'
            : 'border-border-navy/50 text-black hover:text-black bg-white'
        }`}
      >
        VOL
      </button>
      {PANELS.map(name => (
        <button
          key={name}
          onClick={() => onToggleIndicator(name)}
          className={`px-2.5 py-1 rounded border text-[13px] font-bold mono transition-all ${
            isActive(name)
              ? 'border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan'
              : 'border-border-navy/50 text-black hover:text-black bg-white'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
