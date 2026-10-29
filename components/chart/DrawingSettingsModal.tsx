'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { DrawingItem, FibLevelItem } from '@/lib/drawingTypes';
import type { Candle } from '@/lib/types';
import { resolveDrawingPointIndex } from '@/lib/chartRenderer';

interface DrawingSettingsModalProps {
  isOpen: boolean;
  drawing: DrawingItem | null;
  candles?: Candle[];
  onClose: () => void;
  onSave: (updated: DrawingItem) => void;
}

const DEFAULT_FIB_LEVELS: FibLevelItem[] = [
  { lvl: 0.0,   color: '#EF4444', label: '0.0 (0%)', enabled: true },
  { lvl: 0.236, color: '#F97316', label: '0.236 (23.6%)', enabled: true },
  { lvl: 0.382, color: '#F59E0B', label: '0.382 (38.2%)', enabled: true },
  { lvl: 0.5,   color: '#10B981', label: '0.5 (50.0%)', enabled: true },
  { lvl: 0.618, color: '#06B6D4', label: '0.618 (61.8%)', enabled: true },
  { lvl: 0.786, color: '#8B5CF6', label: '0.786 (78.6%)', enabled: true },
  { lvl: 1.0,   color: '#EF4444', label: '1.0 (100.0%)', enabled: true },
  { lvl: 1.618, color: '#F59E0B', label: '1.618 (161.8%)', enabled: false },
  { lvl: 2.618, color: '#EF4444', label: '2.618 (261.8%)', enabled: false },
];

const PRESET_COLORS = [
  '#2563EB', '#3B82F6', '#06B6D4', '#10B981', '#84CC16',
  '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#64748B',
  '#0F172A', '#FFFFFF'
];

export function DrawingSettingsModal({
  isOpen,
  drawing,
  candles,
  onClose,
  onSave,
}: DrawingSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'style' | 'text' | 'coordinates' | 'visibility'>('style');
  const [mounted, setMounted] = useState(false);

  // Form state
  const [color, setColor] = useState('#2563EB');
  const [lineWidth, setLineWidth] = useState(2);
  const [lineStyle, setLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [fillColor, setFillColor] = useState('rgba(37, 99, 235, 0.15)');
  const [extendLeft, setExtendLeft] = useState(false);
  const [extendRight, setExtendRight] = useState(false);
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(13);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [riskRewardRatio, setRiskRewardRatio] = useState<string>('2.0');
  const [fibLevels, setFibLevels] = useState<FibLevelItem[]>(DEFAULT_FIB_LEVELS);
  
  // Coordinates state (exact price & index for each point)
  const [pointCoords, setPointCoords] = useState<{ price: string; index: string; priceEdited?: boolean; indexEdited?: boolean }[]>([]);

  // Track modal open session so live candles streaming doesn't wipe out user's edits while modal is open
  const wasOpenRef = useRef(false);
  const lastInitIdRef = useRef<string | null>(null);

  // Helper: Find the candle index that matches an entered price (exact OHLC match or containing [low, high] range)
  const findMatchingCandleIndex = (targetPrice: number, currentIdx: number, barList?: Candle[]): number => {
    if (!barList || barList.length === 0 || !Number.isFinite(targetPrice)) return currentIdx;
    const clampedCurrent = Math.min(Math.max(0, currentIdx), barList.length - 1);
    const tol = Math.max(0.055, Math.abs(targetPrice) * 0.00015);

    const matchesOHLC = (c: Candle) =>
      Math.abs(c.open - targetPrice) <= tol ||
      Math.abs(c.high - targetPrice) <= tol ||
      Math.abs(c.low - targetPrice) <= tol ||
      Math.abs(c.close - targetPrice) <= tol;

    // 1. If the current bar already matches one of its OHLC values, keep it
    if (currentIdx >= 0 && currentIdx < barList.length && matchesOHLC(barList[currentIdx])) {
      return currentIdx;
    }

    // 2. Search for the closest candle whose Open, High, Low, or Close matches the entered price
    let bestOhlcIdx = -1;
    let bestOhlcDist = Infinity;
    for (let i = 0; i < barList.length; i++) {
      const c = barList[i];
      const minDiff = Math.min(
        Math.abs(c.open - targetPrice),
        Math.abs(c.high - targetPrice),
        Math.abs(c.low - targetPrice),
        Math.abs(c.close - targetPrice)
      );
      if (minDiff <= tol) {
        const barDist = Math.abs(i - clampedCurrent);
        // Score combines price precision and proximity to the drawn anchor bar
        const score = barDist + (minDiff / tol) * 2;
        if (score < bestOhlcDist) {
          bestOhlcDist = score;
          bestOhlcIdx = i;
        }
      }
    }
    if (bestOhlcIdx !== -1) {
      return bestOhlcIdx;
    }

    // 3. If currentIdx is out of bounds (e.g. in right-hand buffer) or targetPrice is outside current candle's [low, high],
    // find the nearest candle whose [low, high] wicks contain targetPrice
    const curCandle = currentIdx >= 0 && currentIdx < barList.length ? barList[currentIdx] : null;
    if (!curCandle || targetPrice < curCandle.low - tol || targetPrice > curCandle.high + tol) {
      let bestRangeIdx = -1;
      let bestRangeDist = Infinity;
      for (let i = 0; i < barList.length; i++) {
        const c = barList[i];
        if (targetPrice >= c.low - tol && targetPrice <= c.high + tol) {
          const dist = Math.abs(i - clampedCurrent);
          if (dist < bestRangeDist) {
            bestRangeDist = dist;
            bestRangeIdx = i;
          }
        }
      }
      if (bestRangeIdx !== -1) {
        return bestRangeIdx;
      }
    }

    return currentIdx >= 0 && currentIdx < barList.length ? currentIdx : clampedCurrent;
  };

  // Timeframe visibility
  const [visSeconds, setVisSeconds] = useState(true);
  const [visMinutes, setVisMinutes] = useState(true);
  const [visHours, setVisHours] = useState(true);
  const [visDays, setVisDays] = useState(true);
  const [visWeeks, setVisWeeks] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !drawing) {
      wasOpenRef.current = false;
      lastInitIdRef.current = null;
      return;
    }

    // Initialize every time the modal transitions from closed -> open, or when switching drawings
    if (wasOpenRef.current && lastInitIdRef.current === drawing.id) return;
    wasOpenRef.current = true;
    lastInitIdRef.current = drawing.id;

    setColor(drawing.color || '#2563EB');
    setLineWidth(drawing.lineWidth || 2);
    setLineStyle(drawing.lineStyle || 'solid');
    setFillColor(drawing.fillColor || 'rgba(37, 99, 235, 0.15)');
    setExtendLeft(Boolean(drawing.extendLeft));
    setExtendRight(Boolean(drawing.extendRight));
    setText(drawing.text || '');
    setFontSize(drawing.fontSize || 13);
    setTextAlign(drawing.textAlign || 'left');
    setRiskRewardRatio(String(drawing.riskRewardRatio || 2.0));
    setFibLevels(drawing.fibLevels && drawing.fibLevels.length > 0 ? drawing.fibLevels : DEFAULT_FIB_LEVELS);

    if (drawing.points && drawing.points.length > 0) {
      const pts = drawing.tool === 'PIVOT_POINTS' ? [drawing.points[0]] : drawing.points;
      setPointCoords(
        pts.map((p) => {
          const resolvedIdx = (candles && candles.length > 0)
            ? resolveDrawingPointIndex(p, candles)
            : p.index;
          return {
            price: p.price != null ? String(Number(p.price.toFixed(2))) : '0',
            index: String(resolvedIdx ?? 0),
            priceEdited: false,
            indexEdited: false,
          };
        })
      );
    } else {
      setPointCoords([]);
    }
  }, [isOpen, drawing, candles]);

  if (!isOpen || !drawing || !mounted) return null;

  const isFibTool = drawing.tool === 'FIBONACCI' || drawing.tool === 'FIBONACCI_EXTENSION' || drawing.tool === 'FIB_CHANNEL';
  const isLineTool = [
    'TRENDLINE', 'RAY', 'INFO_LINE', 'EXTENDED_LINE', 'TREND_ANGLE',
    'HORIZONTAL', 'HORIZONTAL_RAY', 'VERTICAL_LINE', 'CROSS_LINE', 'CHANNEL'
  ].includes(drawing.tool);
  const isRiskRewardTool = drawing.tool === 'RISK_REWARD_LONG' || drawing.tool === 'RISK_REWARD_SHORT';
  const hasTextSupport = true; // All drawings can have custom notes/labels

  const handlePriceChange = (index: number, val: string) => {
    setPointCoords((prev) => {
      const next = [...prev];
      if (next[index]) {
        const cleanVal = String(val).replace(/,/g, '').trim();
        const parsedPrice = parseFloat(cleanVal);
        let nextIndexStr = next[index].index;
        if (!next[index].indexEdited && !isNaN(parsedPrice) && candles && candles.length > 0) {
          const origPt = drawing?.points?.[index];
          const baseIdx = origPt
            ? resolveDrawingPointIndex(origPt, candles)
            : parseInt(next[index].index, 10) || 0;
          const matchedIdx = findMatchingCandleIndex(parsedPrice, baseIdx, candles);
          nextIndexStr = String(matchedIdx);
        }
        next[index] = { ...next[index], price: val, index: nextIndexStr, priceEdited: true };
      }
      return next;
    });
  };

  const handleIndexChange = (index: number, val: string) => {
    setPointCoords((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], index: val, indexEdited: true };
      }
      return next;
    });
  };

  const handleFibLevelToggle = (lvlIndex: number) => {
    setFibLevels((prev) =>
      prev.map((item, idx) => (idx === lvlIndex ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleFibLevelColor = (lvlIndex: number, newColor: string) => {
    setFibLevels((prev) =>
      prev.map((item, idx) => (idx === lvlIndex ? { ...item, color: newColor } : item))
    );
  };

  const handleFibLevelRatio = (lvlIndex: number, newRatio: number) => {
    setFibLevels((prev) =>
      prev.map((item, idx) => (idx === lvlIndex ? { ...item, lvl: newRatio } : item))
    );
  };

  const handleSave = () => {
    if (!drawing) return;

    // Apply exact prices and coordinates back to drawing points
    const pointsSource = drawing.tool === 'PIVOT_POINTS' ? [drawing.points[0]] : drawing.points;
    const updatedPoints = pointsSource.map((p, idx) => {
      const coord = pointCoords[idx];
      if (!coord) return p;
      const cleanPriceStr = String(coord.price).replace(/,/g, '').trim();
      const parsedPrice = parseFloat(cleanPriceStr);
      const parsedIndex = parseInt(coord.index, 10);
      const finalPrice = !isNaN(parsedPrice) ? parsedPrice : p.price;
      const resolvedOrigIdx = (candles && candles.length > 0)
        ? resolveDrawingPointIndex(p, candles)
        : p.index;
      let finalIndex = !isNaN(parsedIndex) ? parsedIndex : resolvedOrigIdx;

      // If user edited Price without manually overriding Bar #, ensure finalIndex is synced with the matching candle
      if (coord.priceEdited && !coord.indexEdited && candles && candles.length > 0) {
        finalIndex = findMatchingCandleIndex(finalPrice, resolvedOrigIdx, candles);
      }

      // If finalPrice matches one of the target candle's OHLC values within rounding tolerance (0.015),
      // snap to the exact unrounded OHLC value of that candle for 100% sub-pixel alignment
      let alignedPrice = finalPrice;
      if (candles && finalIndex >= 0 && finalIndex < candles.length) {
        const targetCandle = candles[finalIndex];
        const ohlcCandidates = [targetCandle.open, targetCandle.high, targetCandle.low, targetCandle.close];
        let minDiff = 0.015;
        for (const val of ohlcCandidates) {
          const diff = Math.abs(val - finalPrice);
          if (diff <= minDiff) {
            minDiff = diff;
            alignedPrice = val;
          }
        }
      }

      // Crucial: Calculate exact timestamp for finalIndex using candles
      // so resolveDrawingPointIndex will never overwrite or revert the user's coordinate!
      let newTime = p.time;
      if (Number.isFinite(finalIndex) && candles && candles.length > 0) {
        if (finalIndex >= 0 && finalIndex < candles.length) {
          newTime = candles[finalIndex].openTime;
        } else if (finalIndex >= candles.length) {
          const lastBar = candles[candles.length - 1];
          const prevBar = candles[candles.length - 2];
          const barDuration = (prevBar && lastBar.openTime > prevBar.openTime)
            ? (lastBar.openTime - prevBar.openTime)
            : 86_400_000;
          newTime = lastBar.openTime + (finalIndex - (candles.length - 1)) * barDuration;
        } else {
          const firstBar = candles[0];
          const secondBar = candles[1];
          const barDuration = (secondBar && secondBar.openTime > firstBar.openTime)
            ? (secondBar.openTime - firstBar.openTime)
            : 86_400_000;
          newTime = firstBar.openTime + finalIndex * barDuration;
        }
      }

      return {
        ...p,
        price: alignedPrice,
        index: finalIndex,
        time: newTime,
      };
    });

    const updatedDrawing: DrawingItem = {
      ...drawing,
      points: updatedPoints,
      color,
      lineWidth,
      lineStyle,
      fillColor,
      extendLeft,
      extendRight,
      text: text.trim() || undefined,
      fontSize,
      textAlign,
      entryPrice: updatedPoints[0]?.price,
      stopPrice: updatedPoints[1]?.price,
      riskRewardRatio: isRiskRewardTool ? (Number.isFinite(parseFloat(riskRewardRatio)) && parseFloat(riskRewardRatio) > 0 ? parseFloat(riskRewardRatio) : 2.0) : drawing.riskRewardRatio,
      fibLevels: isFibTool ? fibLevels : drawing.fibLevels,
      visibilityIntervals: [
        ...(visSeconds ? ['1s'] : []),
        ...(visMinutes ? ['1m', '5m', '15m'] : []),
        ...(visHours ? ['1h', '4h'] : []),
        ...(visDays ? ['1D'] : []),
        ...(visWeeks ? ['1W'] : []),
      ],
    };

    onSave(updatedDrawing);
    onClose();
  };

  const handleReset = () => {
    setColor('#2563EB');
    setLineWidth(2);
    setLineStyle('solid');
    setExtendLeft(false);
    setExtendRight(false);
    setText('');
    setFibLevels(DEFAULT_FIB_LEVELS);
    setRiskRewardRatio('2.0');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in duration-100"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[480px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131722] text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1e222d]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 shrink-0"
              style={{ backgroundColor: color }}
            />
            <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {drawing.tool.replace(/_/g, ' ')} Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation (TradingView Tabs) */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-5 gap-6 text-xs font-semibold shrink-0 bg-white dark:bg-[#131722]">
          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'style'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Style
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'text'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coordinates')}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'coordinates'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Coordinates
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visibility')}
            className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'visibility'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Visibility
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* ════ TAB 1: COORDINATES (Exact Price Inputs) ════ */}
          {activeTab === 'coordinates' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg p-3 text-[11.5px] text-blue-800 dark:text-blue-300">
                Enter exact numerical price levels below to position the drawing with pinpoint accuracy.
              </div>

              {pointCoords.map((coord, idx) => {
                const bIdx = parseInt(coord.index, 10);
                let barTimeLabel: string | null = null;
                if (!isNaN(bIdx) && candles && candles.length > 0) {
                  if (bIdx >= 0 && bIdx < candles.length) {
                    const d = new Date(candles[bIdx].openTime);
                    barTimeLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                  } else if (bIdx >= candles.length) {
                    barTimeLabel = `+${bIdx - candles.length + 1} bars ahead (Future Projection)`;
                  }
                }

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5"
                  >
                    <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{drawing.tool === 'PIVOT_POINTS' ? 'Pivot Coordinates' : `Point ${idx + 1} Coordinates`}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {drawing.tool === 'PIVOT_POINTS' ? 'Anchor' : `Anchor #${idx + 1}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Exact Price Input */}
                      <div>
                        <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          {drawing.tool === 'PIVOT_POINTS' ? 'Pivot Price' : `Price ${idx + 1}`}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={coord.price}
                          onChange={(e) => handlePriceChange(idx, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e222d] text-slate-900 dark:text-slate-100 font-mono font-bold text-xs focus:outline-hidden focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Bar # / Time index */}
                      <div>
                        <label className="block text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          {drawing.tool === 'PIVOT_POINTS' ? 'Bar #' : `Bar #${idx + 1}`}
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={coord.index}
                          onChange={(e) => handleIndexChange(idx, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e222d] text-slate-900 dark:text-slate-100 font-mono font-bold text-xs focus:outline-hidden focus:border-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {barTimeLabel && (
                      <div className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1.5 pt-0.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="opacity-70">Candle:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{barTimeLabel}</span>
                        </div>
                        {candles && bIdx >= 0 && bIdx < candles.length && (
                          <div className="flex items-center gap-1">
                            {([
                              { k: 'O', v: candles[bIdx].open },
                              { k: 'H', v: candles[bIdx].high },
                              { k: 'L', v: candles[bIdx].low },
                              { k: 'C', v: candles[bIdx].close },
                            ] as const).map((item) => (
                              <button
                                key={item.k}
                                type="button"
                                onClick={() => {
                                  setPointCoords((prev) => {
                                    const next = [...prev];
                                    if (next[idx]) {
                                      next[idx] = { ...next[idx], price: String(Number(item.v.toFixed(2))), priceEdited: true };
                                    }
                                    return next;
                                  });
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-[9.5px] font-bold transition-colors cursor-pointer"
                                title={`Snap Price ${idx + 1} to Candle ${item.k}: ${item.v.toFixed(2)}`}
                              >
                                {item.k}: {item.v.toFixed(2)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* For Risk-Reward: Target Ratio Input */}
              {isRiskRewardTool && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                    Risk to Reward Ratio (R:R)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={riskRewardRatio}
                    placeholder="2.0"
                    onChange={(e) => setRiskRewardRatio(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e222d] text-slate-900 dark:text-slate-100 font-mono font-bold text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 2: STYLE ════ */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              {/* Color Swatches */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Line Color
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-md border transition-transform cursor-pointer ${
                        color === c
                          ? 'scale-115 border-blue-600 ring-2 ring-blue-500/40'
                          : 'border-slate-300 dark:border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <input
                    type="color"
                    value={color.startsWith('#') && color.length === 7 ? color : '#2563EB'}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 cursor-pointer p-0 bg-transparent"
                    title="Custom Color"
                  />
                </div>
              </div>

              {/* Line Width */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Line Width
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setLineWidth(w)}
                      className={`flex-1 py-1.5 rounded-lg border font-mono font-bold text-xs transition-colors cursor-pointer ${
                        lineWidth === w
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Style (Solid, Dashed, Dotted) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Line Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setLineStyle(style)}
                      className={`py-1.5 rounded-lg border font-semibold text-xs capitalize transition-colors cursor-pointer ${
                        lineStyle === style
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extend Left / Right (for Lines, Rays, Channels) */}
              {isLineTool && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Line Extension
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={extendLeft}
                        onChange={(e) => setExtendLeft(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Extend Left</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={extendRight}
                        onChange={(e) => setExtendRight(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Extend Right</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Fibonacci Level Settings Table */}
              {isFibTool && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Fibonacci Levels & Colors
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {fibLevels.map((fib, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fib.enabled}
                            onChange={() => handleFibLevelToggle(idx)}
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                          />
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {fib.lvl}
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={fib.color}
                            onChange={(e) => handleFibLevelColor(idx, e.target.value)}
                            className="w-5 h-5 rounded border border-slate-300 dark:border-slate-700 cursor-pointer p-0 bg-transparent"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 3: TEXT ════ */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Annotation Text / Label
                </label>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type notes or level description (e.g. Breakout Support, 0.618 Pocket)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e222d] text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Font Size
                </label>
                <div className="flex items-center gap-2">
                  {[10, 12, 14, 16, 20].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setFontSize(sz)}
                      className={`flex-1 py-1 rounded border font-mono font-bold text-xs transition-colors cursor-pointer ${
                        fontSize === sz
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Text Alignment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setTextAlign(align)}
                      className={`py-1.5 rounded-lg border font-semibold text-xs capitalize transition-colors cursor-pointer ${
                        textAlign === align
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB 4: VISIBILITY ════ */}
          {activeTab === 'visibility' && (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Show drawing on the following chart timeframes:
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={visSeconds}
                  onChange={(e) => setVisSeconds(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                />
                <span>Seconds (1s, 5s, 15s)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={visMinutes}
                  onChange={(e) => setVisMinutes(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                />
                <span>Minutes (1m, 3m, 5m, 15m, 30m)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={visHours}
                  onChange={(e) => setVisHours(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                />
                <span>Hours (1h, 2h, 4h)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={visDays}
                  onChange={(e) => setVisDays(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                />
                <span>Days (1D, Daily)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={visWeeks}
                  onChange={(e) => setVisWeeks(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                />
                <span>Weeks & Months (1W, 1M)</span>
              </label>
            </div>
          )}
        </div>

        {/* Modal Footer (TradingView Reset Defaults / Cancel / Ok) */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1e222d]/50 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Reset
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
