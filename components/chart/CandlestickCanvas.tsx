'use client';

import { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo } from 'react';
import type { Candle, ChartType, IndicatorType, IndicatorConfig, FnoOverlayLevels, StrategyPayoffOverlay } from '@/lib/types';
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
  showFnoOverlay?: boolean;
  fnoLevels?: FnoOverlayLevels;
  strategyOverlay?: StrategyPayoffOverlay;
  indicators: IndicatorConfig[];
  indicatorResults: Map<IndicatorType, unknown>;
  currentPriceOverride?: number;
  timeframe: string;
  className?: string;
  activeDrawingTool?: DrawingToolType;
  drawings?: DrawingItem[];
  onAddDrawing?: (drawing: DrawingItem) => void;
  onUpdateDrawing?: (drawing: DrawingItem) => void;
  onUndoDrawing?: () => void;
  onDrawingToolChange?: (tool: DrawingToolType) => void;
}

const VISIBLE_CANDLES_BASE = 60;

export function CandlestickCanvas({
  candles, chartType, showVolume, showVolumePanel,
  showSmcOverlay, showVolumeProfile, showFnoOverlay, fnoLevels, strategyOverlay,
  indicators, indicatorResults,
  currentPriceOverride, timeframe, className = '',
  activeDrawingTool = 'NONE',
  drawings = [],
  onAddDrawing,
  onUpdateDrawing,
  onUndoDrawing,
  onDrawingToolChange,
}: CandlestickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [drawingInProgress, setDrawingInProgress] = useState<DrawingItem | null>(null);
  const [dpr, setDpr] = useState(1);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [clockTick, setClockTick] = useState(0);

  // 1-second tick for real-time countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick(c => (c + 1) % 10000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Defensive auto-healing: sanitize any cached Frankenstein wicks or dislocated bars before rendering
  const cleanCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const referencePrice = (currentPriceOverride && currentPriceOverride > 0)
      ? currentPriceOverride
      : (candles[candles.length - 1]?.close || 1000);
    const minAcceptable = referencePrice * 0.75;
    const maxAcceptable = referencePrice * 1.30;

    return candles.map(c => {
      if (!c) return c;
      const safeClose = (c.close >= minAcceptable && c.close <= maxAcceptable) ? c.close : referencePrice;
      const safeOpen = (c.open >= minAcceptable && c.open <= maxAcceptable) ? c.open : safeClose;
      const top = Math.max(safeOpen, safeClose);
      const bottom = Math.min(safeOpen, safeClose);
      const maxWick = top * 0.035;
      const safeHigh = Math.min(Math.max(c.high, top), Number((top + maxWick).toFixed(2)));
      const safeLow = Math.max(Math.min(c.low, bottom), Number(Math.max(1, bottom - maxWick).toFixed(2)));
      return {
        ...c,
        open: safeOpen,
        close: safeClose,
        high: safeHigh,
        low: safeLow,
      };
    });
  }, [candles, currentPriceOverride]);

  // Viewport calculation
  const visibleCount = Math.max(8, Math.round(VISIBLE_CANDLES_BASE / zoom));
  const endIdx = Math.max(visibleCount, cleanCandles.length - Math.round(scrollOffset));
  const clampedEnd = Math.min(endIdx, cleanCandles.length);
  const clampedStart = Math.max(0, clampedEnd - visibleCount);

  // Helper to map mouse coordinate to price and candle
  const getPointFromEvent = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || size.h === 0 || cleanCandles.length === 0) return null;
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
    const candleIdx = Math.min(cleanCandles.length - 1, Math.max(0, clampedStart + offsetIdx));

    let pMin = Infinity, pMax = -Infinity;
    for (let i = clampedStart; i < Math.min(clampedEnd, cleanCandles.length); i++) {
      pMin = Math.min(pMin, cleanCandles[i].low);
      pMax = Math.max(pMax, cleanCandles[i].high);
    }
    const pad = (pMax - pMin) * 0.05 || 1;
    pMin -= pad; pMax += pad;
    const pRange = pMax - pMin;

    const clampedY = Math.max(0, Math.min(chartH, y));
    const price = pMax - (clampedY / chartH) * pRange;
    const time = cleanCandles[candleIdx]?.openTime || Date.now();

    return { index: candleIdx, time, price, x, y };
  }, [cleanCandles, clampedStart, clampedEnd, indicators, showVolumePanel, size]);

  // Render chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || cleanCandles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderChart(
      ctx,
      cleanCandles,
      {
        chartType, showVolume, showVolumePanel,
        showSmcOverlay, showVolumeProfile,
        showFnoOverlay, fnoLevels,
        strategyOverlay,
        indicators, indicatorResults,
        currentPriceOverride, timeframe,
        drawings,
        activeDrawing: drawingInProgress,
      },
      { startIdx: clampedStart, endIdx: clampedEnd },
      crosshair ? { x: crosshair.x * dpr, y: crosshair.y * dpr } : null,
      dpr
    );
  }, [cleanCandles, chartType, showVolume, showVolumePanel, showSmcOverlay, showVolumeProfile,
      showFnoOverlay, fnoLevels, strategyOverlay,
      indicators, indicatorResults, currentPriceOverride, timeframe,
      drawings, drawingInProgress,
      clampedStart, clampedEnd, crosshair, size, dpr, clockTick]);

  // Mouse dragging and endpoint adjustment refs
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartScrollRef = useRef<number>(0);
  const adjustingRef = useRef<{ drawingId: string; pointIdx: number } | null>(null);

  // Pointer events
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrosshair({ x, y });

    // 1. If currently adjusting an existing drawing endpoint
    if (adjustingRef.current) {
      const pt = getPointFromEvent(e.clientX, e.clientY);
      if (pt) {
        const target = drawings.find(d => d.id === adjustingRef.current!.drawingId);
        if (target) {
          const updatedPoints = [...target.points];
          updatedPoints[adjustingRef.current.pointIdx] = {
            index: pt.index,
            time: pt.time,
            price: pt.price,
          };
          onUpdateDrawing?.({ ...target, points: updatedPoints });
        }
      }
      return;
    }

    // 2. If currently dragging mouse to pan chart
    if (isDraggingRef.current && (!activeDrawingTool || activeDrawingTool === 'NONE')) {
      const dx = e.clientX - dragStartXRef.current;
      const candlePixels = Math.max(1, (size.w - 58) / visibleCount);
      const deltaCandleCount = -dx / candlePixels;
      setScrollOffset(Math.max(0, Math.min(candles.length - visibleCount, dragStartScrollRef.current + deltaCandleCount)));
      return;
    }

    // 3. If in-progress drawing preview rubber-band
    if (drawingInProgress && activeDrawingTool !== 'NONE') {
      const pt = getPointFromEvent(e.clientX, e.clientY);
      if (pt) {
        setDrawingInProgress(prev => {
          if (!prev) return null;
          const is3Point = prev.tool === 'CHANNEL' || prev.tool === 'FIBONACCI_EXTENSION';
          if (is3Point && prev.points.length >= 2) {
            return {
              ...prev,
              points: [prev.points[0], prev.points[1], { index: pt.index, time: pt.time, price: pt.price }],
            };
          }
          return {
            ...prev,
            points: [prev.points[0], { index: pt.index, time: pt.time, price: pt.price }],
          };
        });
      }
    }
  }, [activeDrawingTool, candles.length, drawings, drawingInProgress, getPointFromEvent, onUpdateDrawing, size.w, visibleCount]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (adjustingRef.current) {
      adjustingRef.current = null;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (!isDraggingRef.current && !adjustingRef.current) {
      setCrosshair(null);
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getPointFromEvent(e.clientX, e.clientY);
    if (!pt) return;

    if (!activeDrawingTool || activeDrawingTool === 'NONE') {
      // 1. Check if clicking near any existing drawing endpoint to adjust it
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const panelInds = indicators.filter(i => !isOverlay(i.type) && i.enabled);
      const totalPanels = panelInds.length + (showVolumePanel ? 1 : 0);
      const panelH = totalPanels === 0 ? 0 : Math.min(size.h * 0.38, totalPanels * 95);
      const chartH = size.h - panelH - 22;
      const chartW = size.w - 58;
      const visCnt = clampedEnd - clampedStart;
      const candleW = visCnt > 0 ? chartW / visCnt : 1;

      let pMin = Infinity, pMax = -Infinity;
      for (let i = clampedStart; i < Math.min(clampedEnd, candles.length); i++) {
        pMin = Math.min(pMin, candles[i].low);
        pMax = Math.max(pMax, candles[i].high);
      }
      const pad = (pMax - pMin) * 0.05 || 1;
      pMin -= pad; pMax += pad;
      const pRange = pMax - pMin;

      let targetAdjust: { drawingId: string; pointIdx: number } | null = null;
      for (const d of drawings) {
        for (let i = 0; i < d.points.length; i++) {
          const p = d.points[i];
          let idx = p.index;
          if (p.time && candles[idx]?.openTime !== p.time) {
            for (let ci = 0; ci < candles.length; ci++) {
              if (candles[ci].openTime === p.time) { idx = ci; break; }
            }
          }
          const ptX = (idx - clampedStart) * candleW + candleW / 2;
          const ptY = chartH * (1 - (p.price - pMin) / pRange);
          if (Math.hypot(x - ptX, y - ptY) <= 15) {
            targetAdjust = { drawingId: d.id, pointIdx: i };
            break;
          }
        }
        if (targetAdjust) break;
      }

      if (targetAdjust) {
        adjustingRef.current = targetAdjust;
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
        return;
      }

      // 2. Otherwise start mouse pan drag
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragStartScrollRef.current = scrollOffset;
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      return;
    }

    // 1-Point Tools: HORIZONTAL, VERTICAL_LINE, TEXT
    if (activeDrawingTool === 'HORIZONTAL' || activeDrawingTool === 'VERTICAL_LINE') {
      onAddDrawing?.({
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tool: activeDrawingTool,
        points: [{ index: pt.index, time: pt.time, price: pt.price }],
        color: activeDrawingTool === 'HORIZONTAL' ? '#2563EB' : '#9333EA',
        lineWidth: 2,
        completed: true,
      });
      onDrawingToolChange?.('NONE');
      return;
    }

    if (activeDrawingTool === 'TEXT') {
      const text = window.prompt('Enter annotation text:', 'Key Level');
      if (text && text.trim()) {
        onAddDrawing?.({
          id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          tool: 'TEXT',
          points: [{ index: pt.index, time: pt.time, price: pt.price }],
          text: text.trim(),
          color: '#1E293B',
          lineWidth: 1,
          completed: true,
        });
        onDrawingToolChange?.('NONE');
      }
      return;
    }

    const is3PointTool = activeDrawingTool === 'CHANNEL' || activeDrawingTool === 'FIBONACCI_EXTENSION';

    if (!drawingInProgress) {
      // First point
      setDrawingInProgress({
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tool: activeDrawingTool,
        points: [{ index: pt.index, time: pt.time, price: pt.price }],
        color: activeDrawingTool === 'RECTANGLE' ? '#059669' :
               activeDrawingTool === 'CHANNEL' ? '#4F46E5' :
               activeDrawingTool === 'FIBONACCI_EXTENSION' ? '#D97706' :
               activeDrawingTool === 'MEASURE' ? '#0284C7' :
               activeDrawingTool === 'RAY' ? '#EA580C' : '#2563EB',
        lineWidth: 2,
        completed: false,
      });
    } else {
      if (is3PointTool && drawingInProgress.points.length === 1) {
        // Second point of 3-point tool
        setDrawingInProgress({
          ...drawingInProgress,
          points: [drawingInProgress.points[0], { index: pt.index, time: pt.time, price: pt.price }],
        });
      } else {
        // Final point (point 2 for 2-point tools, point 3 for 3-point tools)
        const newPoints = is3PointTool
          ? [drawingInProgress.points[0], drawingInProgress.points[1], { index: pt.index, time: pt.time, price: pt.price }]
          : [drawingInProgress.points[0], { index: pt.index, time: pt.time, price: pt.price }];

        const finished: DrawingItem = {
          ...drawingInProgress,
          points: newPoints,
          completed: true,
        };
        onAddDrawing?.(finished);
        setDrawingInProgress(null);
        onDrawingToolChange?.('NONE');
      }
    }
  }, [activeDrawingTool, candles, clampedEnd, clampedStart, drawings, drawingInProgress, getPointFromEvent, indicators, onAddDrawing, onDrawingToolChange, scrollOffset, showVolumePanel, size]);

  // Cancel drawing on Escape or Undo on Ctrl+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawingInProgress(null);
        onDrawingToolChange?.('NONE');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        onUndoDrawing?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDrawingToolChange, onUndoDrawing]);

  // Wheel zoom + scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setZoom(z => Math.max(0.2, Math.min(5, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    } else {
      const delta = e.deltaY > 0 ? -3 : 3;
      setScrollOffset(s => Math.max(0, Math.min(cleanCandles.length - visibleCount, s - delta)));
    }
  }, [cleanCandles.length, visibleCount]);

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
    setScrollOffset(s => Math.max(0, Math.min(cleanCandles.length - visibleCount, s + deltaCandleCount)));
    lastTouchX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => { lastTouchX.current = null; };

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="chart block w-full h-full select-none cursor-crosshair"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {/* ── Zerodha Kite-style Floating Bottom-Center Zoom Controls Dock ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-full shadow-lg shadow-slate-900/5 px-1 py-0.5 select-none transition-all">
        {/* Zoom Out (-) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(z => Math.max(0.2, +(z / 1.25).toFixed(2)));
          }}
          title="Zoom out (-)"
          aria-label="Zoom out"
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer font-bold"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Zoom Level Indicator / Reset */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(1);
            setScrollOffset(0);
          }}
          title="Reset zoom to 100% and scroll to live"
          aria-label="Reset zoom"
          className="px-2 h-7 flex items-center justify-center text-[10px] font-mono font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer"
        >
          {Math.round(zoom * 100)}%
        </button>

        {/* Zoom In (+) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(z => Math.min(5, +(z * 1.25).toFixed(2)));
          }}
          title="Zoom in (+)"
          aria-label="Zoom in"
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer font-bold"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {scrollOffset > 5 && (
        <button
          onClick={() => setScrollOffset(0)}
          className="absolute bottom-8 right-20 rounded-full border border-slate-300 bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-700 hover:text-emerald-600 hover:border-emerald-500 transition-all font-mono shadow-md cursor-pointer"
        >
          »» LIVE
        </button>
      )}
    </div>
  );
}
