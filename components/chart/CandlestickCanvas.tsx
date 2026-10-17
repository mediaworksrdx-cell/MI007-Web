'use client';

import { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo } from 'react';
import type { Candle, ChartType, IndicatorType, IndicatorConfig, FnoOverlayLevels, StrategyPayoffOverlay, MagnetReticle, ScaleState } from '@/lib/types';
import { isOverlay } from '@/lib/types';
import type { DrawingItem, DrawingToolType } from '@/lib/drawingTypes';
import { renderChart, renderOverlay } from '@/lib/chartRenderer';
import { DrawingQuickBar } from './DrawingQuickBar';

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
  selectedDrawingId?: string | null;
  isMagnetActive?: boolean;
  onAddDrawing?: (drawing: DrawingItem) => void;
  onUpdateDrawing?: (drawing: DrawingItem) => void;
  onDeleteDrawing?: (drawingId: string) => void;
  onSelectDrawing?: (id: string | null) => void;
  onUndoDrawing?: () => void;
  onDrawingToolChange?: (tool: DrawingToolType) => void;
  onToggleMagnet?: () => void;
  onOpenHotkeys?: () => void;
  onExportSnapshot?: (mode: 'download' | 'clipboard') => void;
}

const VISIBLE_CANDLES_BASE = 60;

export function CandlestickCanvas({
  candles, chartType, showVolume, showVolumePanel,
  showSmcOverlay, showVolumeProfile, showFnoOverlay, fnoLevels, strategyOverlay,
  indicators, indicatorResults,
  currentPriceOverride, timeframe, className = '',
  activeDrawingTool = 'NONE',
  drawings = [],
  selectedDrawingId = null,
  isMagnetActive = false,
  onAddDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
  onSelectDrawing,
  onUndoDrawing,
  onDrawingToolChange,
  onToggleMagnet,
  onOpenHotkeys,
  onExportSnapshot,
}: CandlestickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<'crosshair' | 'pan'>('crosshair');
  const [isDragging, setIsDragging] = useState(false);
  const [drawingInProgress, setDrawingInProgress] = useState<DrawingItem | null>(null);
  const [quickBarPos, setQuickBarPos] = useState<{ x: number; y: number } | null>(null);
  const [dpr, setDpr] = useState(1);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [clockTick, setClockTick] = useState(0);

  // ── Pillar 2: Interactive Price & Time Scale Stretch/Compress ──
  const [priceScaleRatio, setPriceScaleRatio] = useState(1.0);
  const [priceOffset, setPriceOffset] = useState(0);
  const dragScaleModeRef = useRef<'none' | 'price' | 'time'>('none');
  const dragScaleStartYRef = useRef(0);
  const dragScaleStartXRef = useRef(0);
  const dragScaleStartRatioRef = useRef(1.0);
  const dragScaleStartOffsetRef = useRef(0);
  const dragScaleStartZoomRef = useRef(1.0);
  const [hoverScaleZone, setHoverScaleZone] = useState<'none' | 'price' | 'time'>('none');

  // ── Pillar 3: Smart Magnet Mode (Snapping to OHLC wicks) ──
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const [magnetReticle, setMagnetReticle] = useState<MagnetReticle | null>(null);

  // ── Pillar 6: Mobile Touch Gestures & Pinch-to-Zoom ──
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedDrawing = useMemo(() => {
    return drawings.find(d => d.id === selectedDrawingId) || null;
  }, [drawings, selectedDrawingId]);

  // Track Shift key for instantaneous magnet snap
  useEffect(() => {
    const handleShiftDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftHeld(true);
    };
    const handleShiftUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftHeld(false);
        setMagnetReticle(null);
      }
    };
    window.addEventListener('keydown', handleShiftDown);
    window.addEventListener('keyup', handleShiftUp);
    return () => {
      window.removeEventListener('keydown', handleShiftDown);
      window.removeEventListener('keyup', handleShiftUp);
    };
  }, []);

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

  // Sync dimensions across both Background and Overlay canvases
  useEffect(() => {
    for (const canvas of [canvasRef.current, overlayCanvasRef.current]) {
      if (!canvas || size.w === 0) continue;
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;
    }
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
    const minAcceptable = referencePrice * 0.85;
    const maxAcceptable = referencePrice * 1.15;

    return candles.map(c => {
      if (!c) return c;
      const safeClose = (c.close >= minAcceptable && c.close <= maxAcceptable) ? c.close : referencePrice;
      let safeOpen = (c.open >= minAcceptable && c.open <= maxAcceptable) ? c.open : safeClose;
      // Clamp open within ±3% of close so candles never deform into vertical columns
      if (Math.abs(safeOpen - safeClose) > safeClose * 0.03) {
        safeOpen = safeClose + (safeOpen > safeClose ? 1 : -1) * safeClose * 0.02;
      }
      const top = Math.max(safeOpen, safeClose);
      const bottom = Math.min(safeOpen, safeClose);
      const maxWick = top * 0.015;
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
  const maxScrollOffset = Math.max(0, cleanCandles.length - 8);
  const effectiveScroll = Math.max(0, Math.min(maxScrollOffset, scrollOffset));
  const endIdx = Math.round(cleanCandles.length - effectiveScroll);
  const clampedEnd = Math.max(8, Math.min(cleanCandles.length, endIdx));
  const clampedStart = Math.max(0, clampedEnd - visibleCount);

  // Helper to map mouse coordinate to price and candle with Smart Magnet & Axis Scale support
  const getPointFromEvent = useCallback((clientX: number, clientY: number, snapMagnet = true) => {
    const canvas = overlayCanvasRef.current || canvasRef.current;
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

    // Apply interactive price scale stretch/compress
    const center = (pMax + pMin) / 2 + priceOffset;
    const scaledRange = (pMax - pMin) * priceScaleRatio;
    pMin = center - scaledRange / 2;
    pMax = center + scaledRange / 2;
    const pRange = Math.max(pMax - pMin, 0.01);

    const clampedY = Math.max(0, Math.min(chartH, y));
    let price = pMax - (clampedY / chartH) * pRange;
    let finalX = x;

    // Smart Magnet snapping (OHLC wicks)
    let reticle: MagnetReticle | null = null;
    if (snapMagnet && (isMagnetActive || isShiftHeld)) {
      const c = cleanCandles[candleIdx];
      if (c) {
        const candidates: { type: 'OPEN' | 'HIGH' | 'LOW' | 'CLOSE'; val: number }[] = [
          { type: 'HIGH', val: c.high },
          { type: 'LOW', val: c.low },
          { type: 'OPEN', val: c.open },
          { type: 'CLOSE', val: c.close },
        ];
        let best = candidates[0];
        let bestDiff = Math.abs(candidates[0].val - price);
        for (let i = 1; i < candidates.length; i++) {
          const diff = Math.abs(candidates[i].val - price);
          if (diff < bestDiff) {
            bestDiff = diff;
            best = candidates[i];
          }
        }
        price = best.val;
        finalX = (candleIdx - clampedStart) * candleW + candleW / 2;
        const snapY = chartH * (1 - (best.val - pMin) / pRange);
        reticle = { x: finalX, y: snapY, price: best.val, type: best.type };
      }
    }
    setMagnetReticle(reticle);

    const time = cleanCandles[candleIdx]?.openTime || Date.now();
    return { index: candleIdx, time, price, x: finalX, y };
  }, [cleanCandles, clampedStart, clampedEnd, indicators, isMagnetActive, isShiftHeld, priceOffset, priceScaleRatio, showVolumePanel, size]);

  // ── LAYER 1: Background Canvas Render (Candles, Indicators, SMC, Volumes) ──
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
        activeDrawing: null, // Overlay canvas handles active drawing rubber-band
        selectedDrawingId: null, // Overlay canvas handles selection rings
        scaleState: { priceScaleRatio, priceOffset },
        skipCrosshair: true, // Overlay canvas handles crosshair at 120 FPS
      },
      { startIdx: clampedStart, endIdx: clampedEnd },
      null,
      dpr
    );
  }, [cleanCandles, chartType, showVolume, showVolumePanel, showSmcOverlay, showVolumeProfile,
      showFnoOverlay, fnoLevels, strategyOverlay,
      indicators, indicatorResults, currentPriceOverride, timeframe,
      drawings, clampedStart, clampedEnd, priceScaleRatio, priceOffset, size, dpr, clockTick]);

  // ── LAYER 2: Foreground Overlay Canvas Render (120 FPS Crosshair, Anchors, Magnet Reticle) ──
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || size.w === 0 || cleanCandles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderOverlay(
      ctx,
      cleanCandles,
      {
        chartType, showVolume, showVolumePanel,
        showSmcOverlay, showVolumeProfile,
        indicators, indicatorResults,
        currentPriceOverride, timeframe,
        drawings,
        activeDrawing: drawingInProgress,
        selectedDrawingId,
        scaleState: { priceScaleRatio, priceOffset },
      },
      { startIdx: clampedStart, endIdx: clampedEnd },
      (crosshair && interactionMode === 'crosshair') ? { x: crosshair.x * dpr, y: crosshair.y * dpr } : null,
      dpr,
      magnetReticle
    );
  }, [cleanCandles, chartType, showVolume, showVolumePanel, showSmcOverlay, showVolumeProfile,
      indicators, indicatorResults, currentPriceOverride, timeframe,
      drawings, drawingInProgress, selectedDrawingId,
      clampedStart, clampedEnd, crosshair, interactionMode, priceScaleRatio, priceOffset, size, dpr, magnetReticle]);

  // Mouse dragging and endpoint adjustment refs
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartScrollRef = useRef<number>(0);
  const adjustingRef = useRef<{ drawingId: string; pointIdx: number } | null>(null);

  // Pointer events
  // Pointer events with Interactive Axis Dragging & 120 FPS Precision
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current || canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Detect hover zone over price or time scales
    if (x >= size.w - 58 && y < size.h - 22) {
      setHoverScaleZone('price');
    } else if (y >= size.h - 22 && x < size.w - 58) {
      setHoverScaleZone('time');
    } else {
      setHoverScaleZone('none');
    }

    // 0. Interactive Price Scale Dragging (Vertical Stretch / Compress)
    if (dragScaleModeRef.current === 'price') {
      const dy = e.clientY - dragScaleStartYRef.current;
      const factor = Math.max(0.1, Math.min(10, dragScaleStartRatioRef.current * (1 + dy / 180)));
      setPriceScaleRatio(+factor.toFixed(3));
      return;
    }

    // 0.5. Interactive Time Scale Dragging (Horizontal Spacing Adjustment)
    if (dragScaleModeRef.current === 'time') {
      const dx = e.clientX - dragScaleStartXRef.current;
      const factor = Math.max(0.2, Math.min(5, dragScaleStartZoomRef.current * (1 - dx / 250)));
      setZoom(+factor.toFixed(2));
      return;
    }

    if (interactionMode === 'crosshair') {
      setCrosshair({ x, y });
    }

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
      const visCnt = Math.max(1, clampedEnd - clampedStart);
      const candlePixels = Math.max(1, (size.w - 58) / visCnt);
      const deltaCandleCount = dx / candlePixels;
      const maxScroll = Math.max(0, cleanCandles.length - 8);
      const newScroll = Math.max(0, Math.min(maxScroll, dragStartScrollRef.current + deltaCandleCount));
      setScrollOffset(newScroll);
      return;
    }

    // 3. Freehand Brush continuous path
    if (drawingInProgress && activeDrawingTool === 'BRUSH') {
      const pt = getPointFromEvent(e.clientX, e.clientY);
      if (pt) {
        setDrawingInProgress(prev => {
          if (!prev) return null;
          return {
            ...prev,
            points: [...prev.points, { index: pt.index, time: pt.time, price: pt.price }],
          };
        });
      }
      return;
    }

    // 4. In-progress drawing preview rubber-band
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
  }, [activeDrawingTool, clampedEnd, clampedStart, cleanCandles.length, drawings, drawingInProgress, getPointFromEvent, interactionMode, onUpdateDrawing, size.h, size.w]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragScaleModeRef.current !== 'none') {
      dragScaleModeRef.current = 'none';
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    if (adjustingRef.current) {
      adjustingRef.current = null;
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    if (drawingInProgress && activeDrawingTool === 'BRUSH') {
      if (drawingInProgress.points.length > 1) {
        onAddDrawing?.({ ...drawingInProgress, completed: true });
      }
      setDrawingInProgress(null);
      onDrawingToolChange?.('NONE');
    }
  }, [activeDrawingTool, drawingInProgress, onAddDrawing, onDrawingToolChange]);

  const handlePointerLeave = useCallback(() => {
    if (!isDraggingRef.current && !adjustingRef.current && dragScaleModeRef.current === 'none') {
      setCrosshair(null);
      setMagnetReticle(null);
      setHoverScaleZone('none');
    }
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current || canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= size.w - 58) {
      // Double click on right price scale: auto-fit price scale
      setPriceScaleRatio(1.0);
      setPriceOffset(0);
    } else if (y >= size.h - 22) {
      // Double click on bottom time scale: reset zoom & snap to live
      setZoom(1.0);
      setScrollOffset(0);
    }
  }, [size]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current || canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // A. Check if clicking on right price scale (x >= size.w - 58, y < size.h - 22)
    if (x >= size.w - 58 && y < size.h - 22) {
      dragScaleModeRef.current = 'price';
      dragScaleStartYRef.current = e.clientY;
      dragScaleStartRatioRef.current = priceScaleRatio;
      dragScaleStartOffsetRef.current = priceOffset;
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      return;
    }

    // B. Check if clicking on bottom time scale (y >= size.h - 22, x < size.w - 58)
    if (y >= size.h - 22 && x < size.w - 58) {
      dragScaleModeRef.current = 'time';
      dragScaleStartXRef.current = e.clientX;
      dragScaleStartZoomRef.current = zoom;
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      return;
    }

    const pt = getPointFromEvent(e.clientX, e.clientY);
    if (!pt) return;

    if (!activeDrawingTool || activeDrawingTool === 'NONE') {
      const panelInds = indicators.filter(i => !isOverlay(i.type) && i.enabled);
      const totalPanels = panelInds.length + (showVolumePanel ? 1 : 0);
      const panelH = totalPanels === 0 ? 0 : Math.min(size.h * 0.38, totalPanels * 95);
      const chartH = size.h - panelH - 22;
      const chartW = size.w - 58;
      const visCnt = clampedEnd - clampedStart;
      const candleW = visCnt > 0 ? chartW / visCnt : 1;

      let pMin = Infinity, pMax = -Infinity;
      for (let i = clampedStart; i < Math.min(clampedEnd, cleanCandles.length); i++) {
        pMin = Math.min(pMin, cleanCandles[i].low);
        pMax = Math.max(pMax, cleanCandles[i].high);
      }
      const pad = (pMax - pMin) * 0.05 || 1;
      pMin -= pad; pMax += pad;

      const center = (pMax + pMin) / 2 + priceOffset;
      const scaledRange = (pMax - pMin) * priceScaleRatio;
      pMin = center - scaledRange / 2;
      pMax = center + scaledRange / 2;
      const pRange = Math.max(pMax - pMin, 0.01);

      // 1. Check if clicking near any existing drawing endpoint to adjust it
      let targetAdjust: { drawingId: string; pointIdx: number } | null = null;
      for (const d of drawings) {
        if (d.locked || d.hidden) continue;
        for (let i = 0; i < d.points.length; i++) {
          const p = d.points[i];
          let idx = p.index;
          if (p.time && cleanCandles[idx]?.openTime !== p.time) {
            for (let ci = 0; ci < cleanCandles.length; ci++) {
              if (cleanCandles[ci].openTime === p.time) { idx = ci; break; }
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
        onSelectDrawing?.(targetAdjust.drawingId);
        setQuickBarPos({ x: e.clientX, y: e.clientY });
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
        return;
      }

      // 2. Interactive Selection: Check if clicking anywhere on an existing drawing
      let clickedDrawingId: string | null = null;
      for (const d of drawings) {
        if (d.hidden || !d.points || d.points.length === 0) continue;
        const p1 = d.points[0];
        let idx1 = p1.index;
        if (p1.time && cleanCandles[idx1]?.openTime !== p1.time) {
          for (let ci = 0; ci < cleanCandles.length; ci++) {
            if (cleanCandles[ci].openTime === p1.time) { idx1 = ci; break; }
          }
        }
        const ptX1 = (idx1 - clampedStart) * candleW + candleW / 2;
        const ptY1 = chartH * (1 - (p1.price - pMin) / pRange);

        if (d.tool === 'HORIZONTAL') {
          if (Math.abs(y - ptY1) <= 12) { clickedDrawingId = d.id; break; }
        } else if (d.tool === 'HORIZONTAL_RAY') {
          if (Math.abs(y - ptY1) <= 12 && x >= ptX1 - 5) { clickedDrawingId = d.id; break; }
        } else if (d.tool === 'VERTICAL_LINE') {
          if (Math.abs(x - ptX1) <= 12) { clickedDrawingId = d.id; break; }
        } else if (d.tool === 'TEXT') {
          if (Math.abs(x - ptX1) <= 50 && Math.abs(y - ptY1) <= 20) { clickedDrawingId = d.id; break; }
        } else if (d.points.length >= 2) {
          const p2 = d.points[1];
          let idx2 = p2.index;
          if (p2.time && cleanCandles[idx2]?.openTime !== p2.time) {
            for (let ci = 0; ci < cleanCandles.length; ci++) {
              if (cleanCandles[ci].openTime === p2.time) { idx2 = ci; break; }
            }
          }
          const ptX2 = (idx2 - clampedStart) * candleW + candleW / 2;
          const ptY2 = chartH * (1 - (p2.price - pMin) / pRange);

          if (d.tool === 'TRENDLINE' || d.tool === 'RAY' || d.tool === 'EXTENDED_LINE' || d.tool === 'CALLOUT') {
            const dx = ptX2 - ptX1, dy = ptY2 - ptY1;
            const lenSq = dx * dx + dy * dy;
            if (lenSq > 0) {
              let t = ((x - ptX1) * dx + (y - ptY1) * dy) / lenSq;
              if (d.tool === 'TRENDLINE' || d.tool === 'CALLOUT') t = Math.max(0, Math.min(1, t));
              else if (d.tool === 'RAY') t = Math.max(0, t);
              const px = ptX1 + t * dx, py = ptY1 + t * dy;
              if (Math.hypot(x - px, y - py) <= 14) { clickedDrawingId = d.id; break; }
            }
          } else if (d.tool === 'RECTANGLE' || d.tool === 'MEASURE' || d.tool === 'RISK_REWARD_LONG' || d.tool === 'RISK_REWARD_SHORT') {
            const minX = Math.min(ptX1, ptX2), maxX = Math.max(ptX1, ptX2);
            const minY = Math.min(ptY1, ptY2), maxY = Math.max(ptY1, ptY2);
            if (x >= minX - 8 && x <= maxX + 8 && y >= minY - 8 && y <= maxY + 8) {
              clickedDrawingId = d.id;
              break;
            }
          } else if (d.tool === 'CIRCLE') {
            const radius = Math.hypot(ptX2 - ptX1, ptY2 - ptY1);
            const dist = Math.hypot(x - ptX1, y - ptY1);
            if (Math.abs(dist - radius) <= 14 || dist <= radius) {
              clickedDrawingId = d.id;
              break;
            }
          } else if (d.tool === 'CHANNEL' || d.tool === 'FIBONACCI' || d.tool === 'FIBONACCI_EXTENSION') {
            const minX = Math.min(ptX1, ptX2), maxX = Math.max(ptX1, ptX2);
            const minY = Math.min(ptY1, ptY2), maxY = Math.max(ptY1, ptY2);
            if (x >= minX - 10 && x <= maxX + 10 && y >= minY - 15 && y <= maxY + 15) {
              clickedDrawingId = d.id;
              break;
            }
          }
        }
      }

      if (clickedDrawingId) {
        onSelectDrawing?.(clickedDrawingId);
        setQuickBarPos({ x: e.clientX, y: e.clientY });
        return;
      }

      // 3. Otherwise clicked empty canvas: clear selection and start mouse pan drag
      onSelectDrawing?.(null);
      setQuickBarPos(null);
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartXRef.current = e.clientX;
      dragStartScrollRef.current = scrollOffset;
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      return;
    }

    // ── Tool Creation Handling ──
    // 1-Point Tools: HORIZONTAL, HORIZONTAL_RAY, VERTICAL_LINE
    if (activeDrawingTool === 'HORIZONTAL' || activeDrawingTool === 'HORIZONTAL_RAY' || activeDrawingTool === 'VERTICAL_LINE') {
      onAddDrawing?.({
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tool: activeDrawingTool,
        points: [{ index: pt.index, time: pt.time, price: pt.price }],
        color: activeDrawingTool === 'HORIZONTAL' ? '#2563EB' : activeDrawingTool === 'HORIZONTAL_RAY' ? '#0284C7' : '#9333EA',
        lineWidth: 2,
        completed: true,
      });
      onDrawingToolChange?.('NONE');
      return;
    }

    // Freehand Brush Tool
    if (activeDrawingTool === 'BRUSH') {
      const newBrush: DrawingItem = {
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tool: 'BRUSH',
        points: [{ index: pt.index, time: pt.time, price: pt.price }],
        color: '#2563EB',
        lineWidth: 2.5,
        completed: false,
      };
      setDrawingInProgress(newBrush);
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      return;
    }

    // Text Annotation Tool
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
      }
      onDrawingToolChange?.('NONE');
      return;
    }

    // Callout with Arrow
    if (activeDrawingTool === 'CALLOUT' && drawingInProgress) {
      const text = window.prompt('Enter callout annotation note:', 'Key Pivot');
      if (text && text.trim()) {
        onAddDrawing?.({
          ...drawingInProgress,
          points: [drawingInProgress.points[0], { index: pt.index, time: pt.time, price: pt.price }],
          text: text.trim(),
          completed: true,
        });
      }
      setDrawingInProgress(null);
      onDrawingToolChange?.('NONE');
      return;
    }

    const is3PointTool = activeDrawingTool === 'CHANNEL' || activeDrawingTool === 'FIBONACCI_EXTENSION';

    if (!drawingInProgress) {
      // First point
      const defaultColor =
        activeDrawingTool === 'RECTANGLE' ? '#059669' :
        activeDrawingTool === 'RISK_REWARD_LONG' ? '#10B981' :
        activeDrawingTool === 'RISK_REWARD_SHORT' ? '#EF4444' :
        activeDrawingTool === 'CHANNEL' ? '#4F46E5' :
        activeDrawingTool === 'FIBONACCI_EXTENSION' ? '#D97706' :
        activeDrawingTool === 'MEASURE' ? '#0284C7' :
        activeDrawingTool === 'RAY' || activeDrawingTool === 'EXTENDED_LINE' ? '#EA580C' : '#2563EB';

      setDrawingInProgress({
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tool: activeDrawingTool,
        points: [{ index: pt.index, time: pt.time, price: pt.price }],
        color: defaultColor,
        lineWidth: 2,
        completed: false,
        riskRewardRatio: (activeDrawingTool === 'RISK_REWARD_LONG' || activeDrawingTool === 'RISK_REWARD_SHORT') ? 2.0 : undefined,
      });
    } else {
      if (is3PointTool && drawingInProgress.points.length === 1) {
        // Second point of 3-point tool
        setDrawingInProgress({
          ...drawingInProgress,
          points: [drawingInProgress.points[0], { index: pt.index, time: pt.time, price: pt.price }],
        });
      } else {
        // Final point
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
  }, [activeDrawingTool, cleanCandles, clampedEnd, clampedStart, drawings, drawingInProgress, getPointFromEvent, indicators, onAddDrawing, onDrawingToolChange, onSelectDrawing, scrollOffset, showVolumePanel, size]);

  // ── Keyboard Shortcuts (Alt+Tool, Space to Live, ?, Undo, Delete) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        setDrawingInProgress(null);
        onDrawingToolChange?.('NONE');
        onSelectDrawing?.(null);
        setQuickBarPos(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedDrawingId) {
          onDeleteDrawing?.(selectedDrawingId);
          onSelectDrawing?.(null);
          setQuickBarPos(null);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        onUndoDrawing?.();
      } else if (e.altKey) {
        if (e.key === 't' || e.key === 'T') { e.preventDefault(); onDrawingToolChange?.('TRENDLINE'); }
        else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); onDrawingToolChange?.('HORIZONTAL'); }
        else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); onDrawingToolChange?.('RAY'); }
        else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); onDrawingToolChange?.('FIBONACCI'); }
        else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); onDrawingToolChange?.('RECTANGLE'); }
        else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); onDrawingToolChange?.('CHANNEL'); }
        else if (e.key === 'm' || e.key === 'M') { e.preventDefault(); onDrawingToolChange?.('MEASURE'); }
        else if (e.key === 's' || e.key === 'S') { e.preventDefault(); onExportSnapshot?.('download'); }
      } else if (e.key === ' ') {
        e.preventDefault();
        setScrollOffset(0);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onOpenHotkeys?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDrawingToolChange, onUndoDrawing, onDeleteDrawing, onSelectDrawing, selectedDrawingId, onOpenHotkeys, onExportSnapshot]);

  // Wheel zoom + scroll attached to foreground overlay canvas
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setZoom(z => Math.max(0.2, Math.min(5, +(z * (e.deltaY < 0 ? 1.15 : 0.87)).toFixed(2))));
    } else {
      const maxScroll = Math.max(0, cleanCandles.length - 8);
      const delta = e.deltaY > 0 ? -3 : 3;
      setScrollOffset(s => Math.max(0, Math.min(maxScroll, s + delta)));
    }
  }, [cleanCandles.length]);

  useEffect(() => {
    const el = overlayCanvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Multi-Touch Pinch-to-Zoom & Long-Press Crosshair ──
  const lastTouchX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
      return;
    }
    if (e.touches.length === 1) {
      lastTouchX.current = e.touches[0].clientX;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      longPressTimerRef.current = setTimeout(() => {
        const pt = getPointFromEvent(touchX, touchY);
        if (pt) {
          setCrosshair({ x: pt.x, y: pt.y });
        }
      }, 350);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const scale = dist / touchStartDistRef.current;
      const newZoom = Math.max(0.2, Math.min(5, +(touchStartZoomRef.current * scale).toFixed(2)));
      setZoom(newZoom);
      return;
    }
    if (e.touches.length === 1 && lastTouchX.current !== null) {
      const dx = e.touches[0].clientX - lastTouchX.current;
      const visCnt = Math.max(1, clampedEnd - clampedStart);
      const candlePixels = Math.max(1, (size.w - 58) / visCnt);
      const deltaCandleCount = dx / candlePixels;
      const maxScroll = Math.max(0, cleanCandles.length - 8);
      setScrollOffset(s => Math.max(0, Math.min(maxScroll, s + deltaCandleCount)));
      lastTouchX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartDistRef.current = null;
    lastTouchX.current = null;
  };

  const canvasCursor = useMemo(() => {
    if (hoverScaleZone === 'price') return 'cursor-ns-resize';
    if (hoverScaleZone === 'time') return 'cursor-ew-resize';
    if (activeDrawingTool && activeDrawingTool !== 'NONE') return 'cursor-crosshair';
    if (isDragging) return 'cursor-grabbing';
    if (interactionMode === 'pan') return 'cursor-grab';
    return 'cursor-crosshair';
  }, [activeDrawingTool, hoverScaleZone, isDragging, interactionMode]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* ── Layer 1: Background Canvas (Candles, Indicators, Grids, SMC, Volume Profile) ── */}
      <canvas
        ref={canvasRef}
        className="chart-bg absolute inset-0 block w-full h-full pointer-events-none select-none"
      />

      {/* ── Layer 2: Foreground Overlay Canvas (120 FPS Crosshair, Anchors, Magnet, Events) ── */}
      <canvas
        ref={overlayCanvasRef}
        className={`chart-overlay absolute inset-0 block w-full h-full select-none ${canvasCursor}`}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {/* ── Floating Chart Controls Dock (Separate Crosshair, Pan & Zoom Controls) ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-full shadow-lg shadow-slate-900/10 px-2 py-1 select-none transition-all">
        {/* Dedicated Crosshair Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInteractionMode('crosshair');
          }}
          title="Crosshair Tool (Inspect prices & time coordinates)"
          aria-label="Crosshair mode"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
            interactionMode === 'crosshair'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="3" x2="12" y2="7" />
            <line x1="12" y1="17" x2="12" y2="21" />
            <line x1="3" y1="12" x2="7" y2="12" />
            <line x1="17" y1="12" x2="21" y2="12" />
          </svg>
          <span>Crosshair</span>
        </button>

        {/* Dedicated Pan Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInteractionMode('pan');
          }}
          title="Pan Mode (Drag chart to scroll history)"
          aria-label="Pan mode"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
            interactionMode === 'pan'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
          <span>Pan</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

        {/* Step Pan Left (◀) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setScrollOffset(s => Math.min(Math.max(0, cleanCandles.length - 8), s + 15));
          }}
          title="Pan left (earlier candles)"
          aria-label="Pan left"
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer font-bold"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Zoom Out (-) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(z => Math.max(0.2, +(z / 1.25).toFixed(2)));
          }}
          title="Zoom out (-)"
          aria-label="Zoom out"
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer font-bold"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Zoom Reset (100%) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(1);
            setScrollOffset(0);
          }}
          title="Reset zoom to 100% and jump to live"
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
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer font-bold"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Step Pan Right (▶) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setScrollOffset(s => Math.max(0, s - 15));
          }}
          title="Pan right (later candles)"
          aria-label="Pan right"
          className="w-7 h-7 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer font-bold"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Price Scale Auto-Fit Reset Button */}
        {(Math.abs(priceScaleRatio - 1.0) > 0.001 || Math.abs(priceOffset) > 0.001) && (
          <>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPriceScaleRatio(1.0);
                setPriceOffset(0);
              }}
              title="Reset price scale to auto-fit (or double-click price axis)"
              aria-label="Auto fit price scale"
              className="px-2 h-7 flex items-center gap-1 text-[10px] font-mono font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-full transition-all cursor-pointer shadow-xs border border-amber-500/20"
            >
              AUTO
            </button>
          </>
        )}

        {/* Snap to Live Button (when scrolled) */}
        {scrollOffset > 2 && (
          <>
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setScrollOffset(0);
              }}
              title="Jump to live candles"
              className="px-2 h-7 flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition-all cursor-pointer animate-pulse"
            >
              »» LIVE
            </button>
          </>
        )}
      </div>

      {scrollOffset > 5 && (
        <button
          onClick={() => setScrollOffset(0)}
          className="absolute bottom-8 right-20 rounded-full border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 hover:border-emerald-500 transition-all font-mono shadow-md cursor-pointer z-20"
        >
          »» LIVE
        </button>
      )}

      {/* Floating Drawing Quick Actions Bar (Color, Width, RR ratio, Delete) */}
      {selectedDrawing && quickBarPos && (
        <DrawingQuickBar
          drawing={selectedDrawing}
          position={quickBarPos}
          onUpdateDrawing={(updated) => onUpdateDrawing?.(updated)}
          onDeleteDrawing={(id) => {
            onDeleteDrawing?.(id);
            onSelectDrawing?.(null);
            setQuickBarPos(null);
          }}
          onClose={() => {
            onSelectDrawing?.(null);
            setQuickBarPos(null);
          }}
        />
      )}
    </div>
  );
}
