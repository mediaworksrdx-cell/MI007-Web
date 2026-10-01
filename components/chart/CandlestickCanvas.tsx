'use client';

import { useRef, useEffect, useCallback, useState, useLayoutEffect } from 'react';
import type { Candle, ChartType, IndicatorType, IndicatorConfig } from '@/lib/types';
import { isOverlay } from '@/lib/types';
import type { DrawingItem, DrawingToolType } from '@/lib/drawingTypes';
import { renderChart } from '@/lib/chartRenderer';

interface CandlestickCanvasProps {
  candles: Candle[];
  chartType: ChartType;
  showVolume: boolean;
  showVolumePanel: boolean;
  showSmcOverlay: boolean;
  showVolumeProfile: boolean;
  indicators: IndicatorConfig[];
  indicatorResults: Map<IndicatorType, unknown>;
  currentPriceOverride?: number;
  timeframe: string;
  className?: string;
  activeDrawingTool?: DrawingToolType;
  drawings?: DrawingItem[];
  onAddDrawing?: (drawing: DrawingItem) => void;
  onUndoDrawing?: () => void;
}

const VISIBLE_CANDLES_BASE = 60;

export function CandlestickCanvas({
  candles, chartType, showVolume, showVolumePanel,
  showSmcOverlay, showVolumeProfile,
  indicators, indicatorResults,
  currentPriceOverride, timeframe, className = '',
  activeDrawingTool = 'NONE',
  drawings = [],
  onAddDrawing,
  onUndoDrawing,
}: CandlestickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [drawingInProgress, setDrawingInProgress] = useState<DrawingItem | null>(null);
  const [dpr, setDpr] = useState(1);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => { setDpr(window.devicePixelRatio || 1); }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0) return;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
  }, [size, dpr]);

  // Cancel drawing in progress if user switches back to pointer/cursor mode
  useEffect(() => {
    if (activeDrawingTool === 'NONE') {
      setDrawingInProgress(null);
    }
  }, [activeDrawingTool]);

  // Viewport calculation
  const visibleCount = Math.max(8, Math.round(VISIBLE_CANDLES_BASE / zoom));
  const endIdx = Math.max(visibleCount, candles.length - Math.round(scrollOffset));
  const clampedEnd = Math.min(endIdx, candles.length);
  const clampedStart = Math.max(0, clampedEnd - visibleCount);

  // Helper to map mouse coordinate to price and candle
  const getPointFromEvent = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0 || candles.length === 0) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const panelInds = indicators.filter(i => !isOverlay(i.type) && i.enabled);
    const totalPanels = panelInds.length + (showVolumePanel ? 1 : 0);
    const panelH = totalPanels === 0 ? 0 : Math.min(size.h * 0.38, totalPanels * 95);
    const chartH = size.h - panelH - 22;
    const chartW = size.w - 58;

    const visCnt = clampedEnd - clampedStart;
    if (visCnt <= 0) return null;
    const candleW = chartW / visCnt;
    const offsetIdx = Math.floor(x / candleW);
    const candleIdx = Math.min(candles.length - 1, Math.max(0, clampedStart + offsetIdx));

    let pMin = Infinity, pMax = -Infinity;
    for (let i = clampedStart; i < Math.min(clampedEnd, candles.length); i++) {
      pMin = Math.min(pMin, candles[i].low);
      pMax = Math.max(pMax, candles[i].high);
    }
    const pad = (pMax - pMin) * 0.05 || 1;
    pMin -= pad; pMax += pad;
    const pRange = pMax - pMin;

    const clampedY = Math.max(0, Math.min(chartH, y));
    const price = pMax - (clampedY / chartH) * pRange;
    const time = candles[candleIdx]?.openTime || Date.now();

    return { index: candleIdx, time, price, x, y };
  }, [candles, clampedStart, clampedEnd, indicators, showVolumePanel, size]);

  // Render chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderChart(
      ctx,
      candles,
      {
        chartType, showVolume, showVolumePanel,
        showSmcOverlay, showVolumeProfile,
        indicators, indicatorResults,
        currentPriceOverride, timeframe,
        drawings,
        activeDrawing: drawingInProgress,
      },
      { startIdx: clampedStart, endIdx: clampedEnd },
      crosshair ? { x: crosshair.x * dpr, y: crosshair.y * dpr } : null,
      dpr
    );
  }, [candles, chartType, showVolume, showVolumePanel, showSmcOverlay, showVolumeProfile,
      indicators, indicatorResults, currentPriceOverride, timeframe,
      drawings, drawingInProgress,
      clampedStart, clampedEnd, crosshair, size, dpr]);

  // Pointer events
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrosshair({ x, y });

    if (drawingInProgress && activeDrawingTool !== 'NONE') {
      const pt = getPointFromEvent(e.clientX, e.clientY);
      if (pt) {
        setDrawingInProgress(prev => prev ? {
          ...prev,
          points: [prev.points[0], { index: pt.index, time: pt.time, price: pt.price }],
        } : null);
      }
    }
  }, [drawingInProgress, activeDrawingTool, getPointFromEvent]);

  const handlePointerLeave = useCallback(() => {
    setCrosshair(null);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeDrawingTool || activeDrawingTool === 'NONE') return;
    const pt = getPointFromEvent(e.clientX, e.clientY);
    if (!pt) return;

    if (activeDrawingTool === 'HORIZONTAL') {
      onAddDrawing?.({
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tool: 'HORIZONTAL',
        points: [{ index: pt.index, time: pt.time, price: pt.price }],
        color: '#2563EB',
        lineWidth: 2,
        completed: true,
      });
      return;
    }

    // Two-point tools: TRENDLINE, RECTANGLE, FIBONACCI
    if (!drawingInProgress) {
      setDrawingInProgress({
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tool: activeDrawingTool,
        points: [{ index: pt.index, time: pt.time, price: pt.price }],
        color: activeDrawingTool === 'RECTANGLE' ? '#059669' : '#2563EB',
        lineWidth: 2,
        completed: false,
      });
    } else {
      const finished: DrawingItem = {
        ...drawingInProgress,
        points: [drawingInProgress.points[0], { index: pt.index, time: pt.time, price: pt.price }],
        completed: true,
      };
      onAddDrawing?.(finished);
      setDrawingInProgress(null);
    }
  }, [activeDrawingTool, drawingInProgress, getPointFromEvent, onAddDrawing]);

  // Cancel drawing on Escape or Undo on Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawingInProgress(null);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        onUndoDrawing?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndoDrawing]);

  // Wheel zoom + scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setZoom(z => Math.max(0.2, Math.min(5, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    } else {
      const delta = e.deltaY > 0 ? -3 : 3;
      setScrollOffset(s => Math.max(0, Math.min(candles.length - visibleCount, s - delta)));
    }
  }, [candles.length, visibleCount]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Touch pan
  const lastTouchX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { lastTouchX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (lastTouchX.current === null) return;
    const dx = e.touches[0].clientX - lastTouchX.current;
    const candlePixels = (size.w - 58) / visibleCount;
    const deltaCandleCount = -dx / candlePixels;
    setScrollOffset(s => Math.max(0, Math.min(candles.length - visibleCount, s + deltaCandleCount)));
    lastTouchX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => { lastTouchX.current = null; };

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="chart block w-full h-full select-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {scrollOffset > 5 && (
        <button
          onClick={() => setScrollOffset(0)}
          className="absolute bottom-8 right-20 rounded-full border border-slate-300 bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-700 hover:text-emerald-600 hover:border-emerald-500 transition-all font-mono shadow-md"
        >
          »» LIVE
        </button>
      )}
    </div>
  );
}
