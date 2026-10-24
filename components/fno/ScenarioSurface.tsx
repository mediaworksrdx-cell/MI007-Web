'use client';

import React, { useMemo, useState } from 'react';
import { StrategyLeg } from '@/lib/fno/fnoTypes';
import {
  ScenarioCell,
  ScenarioMatrixMode,
  computeScenarioMatrix,
  exportScenarioMatrixToCsv,
} from '@/lib/fno/scenarioEngine';
import { VolSurfaceConfig } from '@/lib/fno/volatilitySurface';

interface ScenarioSurfaceProps {
  legs: StrategyLeg[];
  referenceSpot: number;
  frontDaysToExpiry: number;
  timeShiftDays: number;
  ivShiftPct: number;
  volSurfaceConfig?: Partial<VolSurfaceConfig>;
  currencySymbol?: string;
}

export default function ScenarioSurface({
  legs,
  referenceSpot,
  frontDaysToExpiry,
  timeShiftDays,
  ivShiftPct,
  volSurfaceConfig,
  currencySymbol = '₹',
}: ScenarioSurfaceProps) {
  const [mode, setMode] = useState<ScenarioMatrixMode>('SPOT_TIME');
  const [displayMetric, setDisplayMetric] = useState<'PNL' | 'ROI'>('PNL');
  const [showSweetSpot, setShowSweetSpot] = useState<boolean>(true);
  const [selectedCell, setSelectedCell] = useState<ScenarioCell | null>(null);

  const matrix = useMemo(
    () =>
      computeScenarioMatrix({
        legs,
        referenceSpot,
        frontDaysToExpiry,
        mode,
        baseTimeShiftDays: timeShiftDays,
        baseIvShiftPct: ivShiftPct,
        volSurfaceConfig,
      }),
    [legs, referenceSpot, frontDaysToExpiry, mode, timeShiftDays, ivShiftPct, volSurfaceConfig]
  );

  const activeCell =
    selectedCell ||
    matrix.cells[0]?.[Math.floor((matrix.spotShocksPct.length || 1) / 2)] ||
    null;

  const formatCompactPnl = (val: number) => {
    const abs = Math.abs(val);
    const sign = val > 0 ? '+' : val < 0 ? '-' : '';
    if (abs >= 100000) {
      return `${sign}${currencySymbol}${(abs / 100000).toFixed(2)}L`;
    }
    if (abs >= 1000) {
      return `${sign}${currencySymbol}${(abs / 1000).toFixed(1)}k`;
    }
    return `${sign}${currencySymbol}${Math.round(abs)}`;
  };

  const handleExportCsv = () => {
    const csv = exportScenarioMatrixToCsv(matrix, displayMetric);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi007-scenario-${mode.toLowerCase()}-${displayMetric.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxAbsPnl = Math.max(1, Math.abs(matrix.maxPnl), Math.abs(matrix.minPnl));

  return (
    <div className="space-y-3">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--theme-card-surface)] p-2.5 rounded-xl border border-[var(--theme-card-border)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('SPOT_TIME');
              setSelectedCell(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'SPOT_TIME'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--theme-card-text)] opacity-75 hover:opacity-100 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]'
            }`}
          >
            <span>⊞</span>
            Spot × Time Horizon
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('SPOT_IV');
              setSelectedCell(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              mode === 'SPOT_IV'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--theme-card-text)] opacity-75 hover:opacity-100 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]'
            }`}
          >
            <span>🌊</span>
            Spot × Implied Vol
          </button>

          <div className="h-4 w-px bg-[var(--theme-card-border)] mx-1" />

          <button
            type="button"
            onClick={() => setDisplayMetric(displayMetric === 'PNL' ? 'ROI' : 'PNL')}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] hover:border-blue-500/50 transition-all cursor-pointer"
          >
            Metric: <span className="text-blue-500">{displayMetric === 'PNL' ? `P&L (${currencySymbol})` : 'ROI (%)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSweetSpot(!showSweetSpot)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              showSweetSpot
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/40'
                : 'bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] opacity-70 border-[var(--theme-card-border)]'
            }`}
            title="Highlights analytical cells where daily Theta carry exceeds 1-sigma Gamma curvature cost"
          >
            <span>🔥</span>
            Theta Sweet-Spot
          </button>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] hover:border-blue-500/50 flex items-center gap-1.5 cursor-pointer"
        >
          <span className="text-blue-500">⬇</span>
          Export CSV
        </button>
      </div>

      {/* 2D Matrix Grid */}
      <div className="overflow-x-auto rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]">
        <table className="w-full border-collapse text-right font-mono text-[11px] tabular-nums">
          <thead>
            <tr className="bg-[var(--theme-card-surface)] border-b border-[var(--theme-card-border)]">
              <th className="py-2 px-2.5 text-left font-sans text-[10px] font-extrabold uppercase tracking-wider text-slate-400 sticky left-0 bg-[var(--theme-card-surface)] z-10 border-r border-[var(--theme-card-border)]">
                {mode === 'SPOT_TIME' ? 'Horizon \\ Spot' : 'IV Shift \\ Spot'}
              </th>
              {matrix.spotShocksPct.map((pct, idx) => (
                <th
                  key={pct}
                  className={`py-1.5 px-2 text-center font-bold border-r border-[var(--theme-card-border)]/50 ${
                    pct === 0 ? 'bg-blue-500/10 text-blue-500' : 'text-[var(--theme-card-text)]'
                  }`}
                >
                  <div className="text-[11px] font-extrabold">
                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                  </div>
                  <div className="text-[9px] text-slate-400 font-normal">
                    {matrix.spotPrices[idx].toLocaleString()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.cells.map((row, rIdx) => (
              <tr
                key={matrix.rowLabels[rIdx]}
                className="border-b border-[var(--theme-card-border)]/60 last:border-b-0"
              >
                <td className="py-2 px-2.5 text-left font-sans text-[10px] font-bold text-[var(--theme-card-text)] whitespace-nowrap sticky left-0 bg-[var(--theme-card-surface)] z-10 border-r border-[var(--theme-card-border)]">
                  {matrix.rowLabels[rIdx]}
                </td>
                {row.map((cell) => {
                  const intensity = Math.min(1, Math.abs(cell.pnl) / maxAbsPnl);
                  const isPositive = cell.pnl >= 0;
                  const bgStyle = isPositive
                    ? { backgroundColor: `rgba(16, 185, 129, ${0.08 + intensity * 0.34})` }
                    : { backgroundColor: `rgba(244, 63, 94, ${0.08 + intensity * 0.34})` };
                  const isSelected =
                    activeCell?.rowIndex === cell.rowIndex &&
                    activeCell?.colIndex === cell.colIndex;

                  return (
                    <td
                      key={`${cell.rowIndex}-${cell.colIndex}`}
                      onClick={() => setSelectedCell(cell)}
                      onMouseEnter={() => setSelectedCell(cell)}
                      style={bgStyle}
                      className={`py-2 px-2 text-center cursor-pointer transition-all relative border-r border-[var(--theme-card-border)]/40 ${
                        isSelected ? 'ring-2 ring-inset ring-blue-500 z-10' : ''
                      } ${
                        showSweetSpot && cell.isThetaSweetSpot
                          ? 'outline outline-1 -outline-offset-2 outline-amber-400/80'
                          : ''
                      }`}
                    >
                      <div
                        className={`font-bold text-[11px] ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-300'
                            : 'text-rose-600 dark:text-rose-300'
                        }`}
                      >
                        {displayMetric === 'PNL'
                          ? formatCompactPnl(cell.pnl)
                          : `${cell.roiPct >= 0 ? '+' : ''}${cell.roiPct.toFixed(1)}%`}
                      </div>
                      {showSweetSpot && cell.isThetaSweetSpot && (
                        <span
                          className="inline-block text-[8px] font-sans font-extrabold uppercase tracking-wider px-1 rounded bg-amber-500/20 text-amber-500 mt-0.5"
                          title={`Theta/Gamma Ratio: ${cell.thetaGammaRatio}x`}
                        >
                          θ/{cell.thetaGammaRatio}x
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Cell Second-Order Greeks & Carry Inspector */}
      {activeCell && (
        <div className="p-3 rounded-xl bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
              <span>Scenario Cell Inspector</span>
              <span className="text-slate-400">•</span>
              <span>{activeCell.rowLabel}</span>
              <span className="text-slate-400">@</span>
              <span>
                Spot {currencySymbol}
                {activeCell.spotPrice.toLocaleString()} ({activeCell.colLabel})
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="text-amber-500 shrink-0">ⓘ</span>
              <span>{matrix.sweetSpotFormulaNote}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] tabular-nums">
            <div className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
              <span className="text-slate-400 text-[9px] uppercase block">P&L / ROI</span>
              <span
                className={`font-extrabold ${
                  activeCell.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {formatCompactPnl(activeCell.pnl)} ({activeCell.roiPct >= 0 ? '+' : ''}
                {activeCell.roiPct}%)
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
              <span className="text-slate-400 text-[9px] uppercase block">Delta / Gamma</span>
              <span className="font-bold text-[var(--theme-card-text)]">
                {activeCell.netGreeks.delta} / {activeCell.netGreeks.gamma.toFixed(4)}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
              <span className="text-slate-400 text-[9px] uppercase block">Theta / Vega</span>
              <span className="font-bold text-[var(--theme-card-text)]">
                {activeCell.netGreeks.theta} / {activeCell.netGreeks.vega}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
              <span className="text-slate-400 text-[9px] uppercase block">
                Vanna / Charm / Vomma
              </span>
              <span className="font-bold text-indigo-400">
                {activeCell.netGreeks.vanna} / {activeCell.netGreeks.charm} /{' '}
                {activeCell.netGreeks.vomma}
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]">
              <span className="text-slate-400 text-[9px] uppercase block">θ/Γ Carry Ratio</span>
              <span
                className={`font-extrabold ${
                  activeCell.isThetaSweetSpot ? 'text-amber-500' : 'text-[var(--theme-card-text)]'
                }`}
              >
                {activeCell.thetaGammaRatio}x
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
