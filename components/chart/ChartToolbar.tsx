'use client';

import { Timeframe, IndicatorType, INDICATOR_DEFAULTS, OVERLAY_TYPES, PANEL_TYPES } from '@/lib/types';
import type { ChartType } from '@/lib/types';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'];
const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'CANDLESTICK',   label: 'Candle' },
  { value: 'HOLLOW_CANDLE', label: 'Hollow' },
  { value: 'LINE',          label: 'Line'   },
  { value: 'AREA',          label: 'Area'   },
  { value: 'HEIKIN_ASHI',   label: 'H-Ashi' },
];

interface ChartToolbarProps {
  timeframe: Timeframe;
  chartType: ChartType;
  showVolume: boolean;
  showVolumePanel: boolean;
  showSmcOverlay: boolean;
  showVolumeProfile: boolean;
  activeIndicators: IndicatorType[];
  onTimeframeChange: (tf: Timeframe) => void;
  onChartTypeChange: (type: ChartType) => void;
  onToggleVolume: () => void;
  onToggleVolumePanel: () => void;
  onToggleSmcOverlay: () => void;
  onToggleVolumeProfile: () => void;
  onToggleIndicator: (type: IndicatorType) => void;
}

export function ChartToolbar({
  timeframe, chartType, showVolume, showVolumePanel, showSmcOverlay, showVolumeProfile,
  activeIndicators, onTimeframeChange, onChartTypeChange, onToggleVolume,
  onToggleVolumePanel, onToggleSmcOverlay, onToggleVolumeProfile, onToggleIndicator,
}: ChartToolbarProps) {
  const isActive = (t: IndicatorType) => activeIndicators.includes(t);

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border-navy bg-surface-card px-3 py-2">
      {/* ── Timeframes ── */}
      <div className="flex items-center gap-0.5 rounded-md border border-border-navy/50 bg-bg-midnight p-0.5">
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => onTimeframeChange(tf)}
            className={`px-2 py-1 rounded text-[11px] font-bold mono transition-all ${
              timeframe === tf ? 'bg-surface-variant text-mint-green' : 'text-text-muted hover:text-text-primary'
            }`}>{tf}</button>
        ))}
      </div>

      <div className="h-4 w-px bg-border-navy" />

      {/* ── Chart Types ── */}
      <div className="flex items-center gap-0.5 rounded-md border border-border-navy/50 bg-bg-midnight p-0.5">
        {CHART_TYPES.map(ct => (
          <button key={ct.value} onClick={() => onChartTypeChange(ct.value)}
            className={`px-2 py-1 rounded text-[11px] font-bold mono transition-all ${
              chartType === ct.value ? 'bg-surface-variant text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}>{ct.label}</button>
        ))}
      </div>

      <div className="h-4 w-px bg-border-navy" />

      {/* ── Feature Toggles ── */}
      <span className="text-[9px] text-text-muted font-black tracking-widest uppercase">Features</span>
      {[
        { label: 'VOL', active: showVolume, onClick: onToggleVolume, color: 'mint-green' },
        { label: 'VOL Panel', active: showVolumePanel, onClick: onToggleVolumePanel, color: 'accent-cyan' },
        { label: 'SMC', active: showSmcOverlay, onClick: onToggleSmcOverlay, color: 'cyber-gold' },
        { label: 'VPVR', active: showVolumeProfile, onClick: onToggleVolumeProfile, color: 'accent-cyan' },
      ].map(f => (
        <button key={f.label} onClick={f.onClick}
          className={`px-2 py-0.5 rounded border text-[10px] font-bold mono transition-all ${
            f.active
              ? `border-${f.color}/60 bg-${f.color}/10 text-${f.color}`
              : 'border-border-navy/50 text-text-muted hover:text-text-secondary'
          }`}>{f.label}</button>
      ))}

      <div className="h-4 w-px bg-border-navy" />

      {/* ── Overlay Indicators ── */}
      <span className="text-[9px] text-text-muted font-black tracking-widest uppercase">Overlay</span>
      {OVERLAY_TYPES.map(t => (
        <button key={t} onClick={() => onToggleIndicator(t)}
          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold mono transition-all ${
            isActive(t)
              ? 'border-mint-green/60 bg-mint-green/10 text-mint-green'
              : 'border-border-navy/50 text-text-muted hover:text-text-secondary'
          }`}>{INDICATOR_DEFAULTS[t].label}</button>
      ))}

      <div className="h-4 w-px bg-border-navy" />

      {/* ── Panel Indicators ── */}
      <span className="text-[9px] text-text-muted font-black tracking-widest uppercase">Panel</span>
      {PANEL_TYPES.map(t => (
        <button key={t} onClick={() => onToggleIndicator(t)}
          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold mono transition-all ${
            isActive(t)
              ? 'border-accent-cyan/60 bg-accent-cyan/10 text-accent-cyan'
              : 'border-border-navy/50 text-text-muted hover:text-text-secondary'
          }`}>{INDICATOR_DEFAULTS[t].label}</button>
      ))}
    </div>
  );
}
