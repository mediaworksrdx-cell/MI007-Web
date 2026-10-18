'use client';

import { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo } from 'react';
import type { Candle, ChartType, IndicatorType, IndicatorConfig, FnoOverlayLevels, StrategyPayoffOverlay, MagnetReticle, ScaleState } from '@/lib/types';
import { isOverlay, CHART_RIGHT_MARGIN, CHART_BOTTOM_MARGIN } from '@/lib/types';
import type { DrawingItem, DrawingToolType } from '@/lib/drawingTypes';
import { renderChart, renderOverlay } from '@/lib/chartRenderer';
import { DrawingQuickBar } from './DrawingQuickBar';
import type { CursorMode } from './DrawingToolbar';

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
  cursorMode?: CursorMode;
  drawings?: DrawingItem[];
  selectedDrawingId?: string | null;
  isMagnetActive?: boolean;
  isDrawingModeLocked?: boolean;
  isAllDrawingsLocked?: boolean;
  isAllDrawingsHidden?: boolean;
  onAddDrawing?: (drawing: DrawingItem) => void;
  onUpdateDrawing?: (drawing: DrawingItem) => void;
  onDeleteDrawing?: (drawingId: string) => void;
  onSelectDrawing?: (id: string | null) => void;
  onUndoDrawing?: () => void;
  onDrawingToolChange?: (tool: DrawingToolType) => void;
  onToggleMagnet?: () => void;
  onToggleDrawingModeLock?: () => void;
  onToggleLockAllDrawings?: () => void;
  onToggleHideAllDrawings?: () => void;
  onExportSnapshot?: (mode: 'download' | 'clipboard') => void;
}

export function getToolRequiredPoints(tool: DrawingToolType): number {
  switch (tool) {
    case 'HORIZONTAL':
    case 'HORIZONTAL_RAY':
    case 'VERTICAL_LINE':
    case 'CROSS_LINE':
    case 'TEXT':
    case 'ANCHORED_TEXT':
    case 'PRICE_LABEL':
    case 'ARROW_UP':
    case 'ARROW_DOWN':
    case 'FLAG':
      return 1;

    case 'CHANNEL':
    case 'DISJOINT_CHANNEL':
    case 'FIBONACCI_EXTENSION':
    case 'FIB_CHANNEL':
    case 'ROTATED_RECTANGLE':
    case 'TRIANGLE':
    case 'CURVE':
    case 'ELLIOTT_CORRECTION':
      return 3;

    case 'ABCD_PATTERN':
      return 4;

    case 'HEAD_AND_SHOULDERS':
    case 'ELLIOTT_IMPULSE':
    case 'XABCD_PATTERN':
      return 5;

    case 'BRUSH':
    case 'HIGHLIGHTER':
    case 'POLYLINE':
      return -1; // Multi-point or continuous

    default:
      return 2;
  }
}

export function getDefaultToolColor(tool: DrawingToolType): string {
  switch (tool) {
    case 'HORIZONTAL': return '#2563EB';
    case 'HORIZONTAL_RAY': return '#0284C7';
    case 'VERTICAL_LINE': return '#9333EA';
    case 'CROSS_LINE': return '#64748B';
    case 'RECTANGLE': return '#059669';
    case 'ROTATED_RECTANGLE': return '#0D9488';
    case 'CIRCLE': return '#3B82F6';
    case 'ELLIPSE': return '#6366F1';
    case 'TRIANGLE': return '#8B5CF6';
    case 'POLYLINE': return '#EC4899';
    case 'CURVE': return '#06B6D4';
    case 'BRUSH': return '#2563EB';
    case 'HIGHLIGHTER': return 'rgba(251, 191, 36, 0.4)';
    case 'RISK_REWARD_LONG': return '#10B981';
    case 'RISK_REWARD_SHORT': return '#EF4444';
    case 'PRICE_RANGE': return '#0EA5E9';
    case 'DATE_RANGE': return '#8B5CF6';
    case 'MEASURE': return '#0284C7';
    case 'BARS_PATTERN': return '#3B82F6';
    case 'CHANNEL': return '#4F46E5';
    case 'DISJOINT_CHANNEL': return '#6366F1';
    case 'FIBONACCI': return '#D97706';
    case 'FIBONACCI_EXTENSION': return '#B45309';
    case 'FIB_CHANNEL': return '#F59E0B';
    case 'FIB_TIME_ZONE': return '#84CC16';
    case 'GANN_BOX': return '#14B8A6';
    case 'GANN_FAN': return '#06B6D4';
    case 'HEAD_AND_SHOULDERS': return '#EC4899';
    case 'ELLIOTT_IMPULSE': return '#3B82F6';
    case 'ELLIOTT_CORRECTION': return '#8B5CF6';
    case 'XABCD_PATTERN': return '#10B981';
    case 'ABCD_PATTERN': return '#F59E0B';
    case 'RAY':
    case 'EXTENDED_LINE': return '#EA580C';
    case 'INFO_LINE': return '#2563EB';
    case 'TREND_ANGLE': return '#0284C7';
    case 'PRICE_LABEL': return '#1E293B';
    case 'ARROW_UP': return '#16A34A';
    case 'ARROW_DOWN': return '#DC2626';
    case 'FLAG': return '#E11D48';
    case 'ANCHORED_TEXT':
    case 'TEXT': return '#1E293B';
    case 'CALLOUT': return '#0284C7';
    default: return '#2563EB';
  }
}

const VISIBLE_CANDLES_BASE = 60;

export function CandlestickCanvas({
  candles, chartType, showVolume, showVolumePanel,
  showSmcOverlay, showVolumeProfile, showFnoOverlay, fnoLevels, strategyOverlay,
  indicators, indicatorResults,
  currentPriceOverride, timeframe, className = '',
  activeDrawingTool = 'NONE',
  cursorMode = 'crosshair',
  drawings = [],
  selectedDrawingId = null,
  isMagnetActive = false,
  isDrawingModeLocked = false,
  isAllDrawingsLocked = false,
  isAllDrawingsHidden = false,
  onAddDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
  onSelectDrawing,
  onUndoDrawing,
  onDrawingToolChange,
  onToggleMagnet,
  onToggleDrawingModeLock,
  onToggleLockAllDrawings,
  onToggleHideAllDrawings,
  onExportSnapshot,
}: CandlestickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [drawingInProgress, setDrawingInProgress] = useState<DrawingItem | null>(null);
  const [quickBarPos, setQuickBarPos] = useState<{ x: number; y: number } | null>(null);
  const [dpr, setDpr] = useState(1);
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const committedPointsRef = useRef<Array<{ index: number; time: number; price: number }>>([]);
  const isBrushingRef = useRef(false);
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

  // Global release listener so panning or drag states can never get stuck if mouse leaves window
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
      adjustingRef.current = null;
      dragScaleModeRef.current = 'none';
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
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
      committedPointsRef.current = [];
      isBrushingRef.current = false;
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
      // Gently clamp open if an extreme outlier exceeds 6% of price
      if (Math.abs(safeOpen - safeClose) > safeClose * 0.06) {
        safeOpen = safeClose + (safeOpen > safeClose ? 1 : -1) * safeClose * 0.04;
      }
      const top = Math.max(safeOpen, safeClose);
      const bottom = Math.min(safeOpen, safeClose);
      const bodyH = Math.abs(safeClose - safeOpen);
      // Realistic wick envelope: maximum 2.5x body or 0.5% price
      const maxWick = Math.max(bodyH * 2.5, top * 0.005);
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

  // Viewport calculation with responsive zoom and dynamic candle scaling
  const visibleCount = Math.max(8, Math.round(VISIBLE_CANDLES_BASE / zoom));
  const maxScrollOffset = Math.max(0, cleanCandles.length - 8);
  const effectiveScroll = Math.max(0, Math.min(maxScrollOffset, scrollOffset));
  const endIdx = Math.round(cleanCandles.length - effectiveScroll);
  const startIdx = endIdx - visibleCount;

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
    const chartH = size.h - panelH - CHART_BOTTOM_MARGIN;
    const chartW = size.w - CHART_RIGHT_MARGIN;

    const visCnt = visibleCount;
    if (visCnt <= 0) return null;
    const candleW = chartW / visCnt;
    const offsetIdx = Math.floor(x / candleW);
    const candleIdx = Math.min(cleanCandles.length - 1, Math.max(0, startIdx + offsetIdx));

    let pMin = Infinity, pMax = -Infinity;
    for (let i = Math.max(0, startIdx); i < Math.min(endIdx, cleanCandles.length); i++) {
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
        finalX = (candleIdx - startIdx) * candleW + candleW / 2;
        const snapY = chartH * (1 - (best.val - pMin) / pRange);
        reticle = { x: finalX, y: snapY, price: best.val, type: best.type };
      }
    }
    setMagnetReticle(reticle);

    const time = cleanCandles[candleIdx]?.openTime || Date.now();
    return { index: candleIdx, time, price, x: finalX, y };
  }, [cleanCandles, startIdx, endIdx, visibleCount, indicators, isMagnetActive, isShiftHeld, priceOffset, priceScaleRatio, showVolumePanel, size]);

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
        drawings: isAllDrawingsHidden ? [] : drawings,
        activeDrawing: null, // Overlay canvas handles active drawing rubber-band
        selectedDrawingId: null, // Overlay canvas handles selection rings
        scaleState: { priceScaleRatio, priceOffset },
        skipCrosshair: true, // Overlay canvas handles crosshair at 120 FPS
      },
      { startIdx, endIdx },
      null,
      dpr
    );
  }, [cleanCandles, chartType, showVolume, showVolumePanel, showSmcOverlay, showVolumeProfile,
      showFnoOverlay, fnoLevels, strategyOverlay,
      indicators, indicatorResults, currentPriceOverride, timeframe,
      drawings, isAllDrawingsHidden, startIdx, endIdx, priceScaleRatio, priceOffset, size, dpr, clockTick]);

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
        drawings: isAllDrawingsHidden ? [] : drawings,
        activeDrawing: isAllDrawingsHidden ? null : drawingInProgress,
        selectedDrawingId: isAllDrawingsHidden ? null : selectedDrawingId,
        scaleState: { priceScaleRatio, priceOffset },
      },
      { startIdx, endIdx },
      (crosshair && cursorMode !== 'arrow' && cursorMode !== 'pan') ? { x: crosshair.x * dpr, y: crosshair.y * dpr } : null,
      dpr,
      magnetReticle
    );
  }, [cleanCandles, chartType, showVolume, showVolumePanel, showSmcOverlay, showVolumeProfile,
      indicators, indicatorResults, currentPriceOverride, timeframe,
      drawings, drawingInProgress, selectedDrawingId, isAllDrawingsHidden,
      startIdx, endIdx, crosshair, cursorMode, priceScaleRatio, priceOffset, size, dpr, magnetReticle]);

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

    // Safety check: if no mouse buttons are pressed, clear any dragging/scaling/adjusting states
    if (e.buttons === 0) {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
      if (adjustingRef.current) {
        adjustingRef.current = null;
      }
      if (dragScaleModeRef.current !== 'none') {
        dragScaleModeRef.current = 'none';
      }
    }

    // Detect hover zone over price or time scales
    if (x >= size.w - CHART_RIGHT_MARGIN && y < size.h - CHART_BOTTOM_MARGIN) {
      setHoverScaleZone('price');
    } else if (y >= size.h - CHART_BOTTOM_MARGIN && x < size.w - CHART_RIGHT_MARGIN) {
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

    // Always update crosshair position smoothly
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
      const visCnt = visibleCount;
      const candlePixels = Math.max(1, (size.w - CHART_RIGHT_MARGIN) / visCnt);
      const deltaCandleCount = dx / candlePixels;
      const maxScroll = Math.max(0, cleanCandles.length - 8);
      const newScroll = Math.max(0, Math.min(maxScroll, dragStartScrollRef.current + deltaCandleCount));
      setScrollOffset(newScroll);
      return;
    }

    // 3. Freehand Brush & Highlighter continuous path
    if (isBrushingRef.current && (activeDrawingTool === 'BRUSH' || activeDrawingTool === 'HIGHLIGHTER')) {
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

    // 4. In-progress drawing preview rubber-band (multi-point tools)
    if (committedPointsRef.current.length > 0 && activeDrawingTool !== 'NONE') {
      const pt = getPointFromEvent(e.clientX, e.clientY);
      if (pt) {
        setDrawingInProgress(prev => {
          if (!prev) return null;
          return {
            ...prev,
            points: [...committedPointsRef.current, { index: pt.index, time: pt.time, price: pt.price }],
          };
        });
      }
    }
  }, [activeDrawingTool, visibleCount, cleanCandles.length, drawings, drawingInProgress, getPointFromEvent, onUpdateDrawing, size.h, size.w]);

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

    // Handle completed drawings
    if (isBrushingRef.current) {
      isBrushingRef.current = false;
      if (drawingInProgress && drawingInProgress.points.length > 1) {
        onAddDrawing?.({ ...drawingInProgress, completed: true });
      }
      setDrawingInProgress(null);
      committedPointsRef.current = [];
      if (!isDrawingModeLocked) onDrawingToolChange?.('NONE');
    } else if (drawingInProgress && activeDrawingTool !== 'NONE') {
      const reqPoints = getToolRequiredPoints(activeDrawingTool);
      if (reqPoints === 2 && committedPointsRef.current.length === 1) {
        const dist = Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y);
        // If dragged more than 20px, finalize on mouse up
        if (dist > 20) {
          const pt = getPointFromEvent(e.clientX, e.clientY);
          if (pt) {
            const finalPoints = [committedPointsRef.current[0], { index: pt.index, time: pt.time, price: pt.price }];
            if (activeDrawingTool === 'CALLOUT') {
              const text = window.prompt('Enter callout annotation note:', 'Key Pivot');
              onAddDrawing?.({
                ...drawingInProgress,
                points: finalPoints,
                text: text?.trim() || 'Key Pivot',
                completed: true,
              });
            } else {
              onAddDrawing?.({
                ...drawingInProgress,
                points: finalPoints,
                completed: true,
              });
            }
            committedPointsRef.current = [];
            setDrawingInProgress(null);
            if (!isDrawingModeLocked) onDrawingToolChange?.('NONE');
          }
        }
      }
    }
  }, [activeDrawingTool, drawingInProgress, getPointFromEvent, isDrawingModeLocked, onAddDrawing, onDrawingToolChange]);

  const handlePointerLeave = useCallback(() => {
    setCrosshair(null);
    setMagnetReticle(null);
    setHoverScaleZone('none');
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Finish Polyline on double click
    if (activeDrawingTool === 'POLYLINE' && committedPointsRef.current.length >= 2) {
      if (drawingInProgress) {
        onAddDrawing?.({
          ...drawingInProgress,
          points: [...committedPointsRef.current],
          completed: true,
        });
      }
      committedPointsRef.current = [];
      setDrawingInProgress(null);
      if (!isDrawingModeLocked) onDrawingToolChange?.('NONE');
      return;
    }

    const canvas = overlayCanvasRef.current || canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= size.w - CHART_RIGHT_MARGIN) {
      // Double click on right price scale: auto-fit price scale
      setPriceScaleRatio(1.0);
      setPriceOffset(0);
    } else if (y >= size.h - CHART_BOTTOM_MARGIN) {
      // Double click on bottom time scale: reset zoom & snap to live
      setZoom(1.0);
      setScrollOffset(0);
    }
  }, [activeDrawingTool, drawingInProgress, isDrawingModeLocked, onAddDrawing, onDrawingToolChange, size]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    const canvas = overlayCanvasRef.current || canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // A. Check if clicking on right price scale
    if (x >= size.w - CHART_RIGHT_MARGIN && y < size.h - CHART_BOTTOM_MARGIN) {
      dragScaleModeRef.current = 'price';
      dragScaleStartYRef.current = e.clientY;
      dragScaleStartRatioRef.current = priceScaleRatio;
      dragScaleStartOffsetRef.current = priceOffset;
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      return;
    }

    // B. Check if clicking on bottom time scale
    if (y >= size.h - CHART_BOTTOM_MARGIN && x < size.w - CHART_RIGHT_MARGIN) {
      dragScaleModeRef.current = 'time';
      dragScaleStartXRef.current = e.clientX;
      dragScaleStartZoomRef.current = zoom;
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      return;
    }

    const pt = getPointFromEvent(e.clientX, e.clientY);
    if (!pt) return;

    if (!activeDrawingTool || activeDrawingTool === 'NONE') {
      if (isAllDrawingsHidden) {
        onSelectDrawing?.(null);
        setQuickBarPos(null);
        isDraggingRef.current = true;
        setIsDragging(true);
        dragStartXRef.current = e.clientX;
        dragStartScrollRef.current = scrollOffset;
        try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
        return;
      }

      const panelInds = indicators.filter(i => !isOverlay(i.type) && i.enabled);
      const totalPanels = panelInds.length + (showVolumePanel ? 1 : 0);
      const panelH = totalPanels === 0 ? 0 : Math.min(size.h * 0.38, totalPanels * 95);
      const chartH = size.h - panelH - CHART_BOTTOM_MARGIN;
      const chartW = size.w - CHART_RIGHT_MARGIN;
      const visCnt = visibleCount;
      const candleW = visCnt > 0 ? chartW / visCnt : 1;

      let pMin = Infinity, pMax = -Infinity;
      for (let i = Math.max(0, startIdx); i < Math.min(endIdx, cleanCandles.length); i++) {
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
          const ptX = (idx - startIdx) * candleW + candleW / 2;
          const ptY = chartH * (1 - (p.price - pMin) / pRange);
          if (Math.hypot(x - ptX, y - ptY) <= 15) {
            targetAdjust = { drawingId: d.id, pointIdx: i };
            break;
          }
        }
        if (targetAdjust) break;
      }

      if (targetAdjust) {
        if (cursorMode === 'eraser' && !isAllDrawingsLocked) {
          onDeleteDrawing?.(targetAdjust.drawingId);
          onSelectDrawing?.(null);
          setQuickBarPos(null);
          return;
        }
        if (!isAllDrawingsLocked) {
          adjustingRef.current = targetAdjust;
          try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
        }
        onSelectDrawing?.(targetAdjust.drawingId);
        setQuickBarPos({ x: e.clientX, y: e.clientY });
        return;
      }

      // 2. Universal Hit-Testing for All 38 Tools
      let clickedDrawingId: string | null = null;
      for (const d of drawings) {
        if (d.hidden || !d.points || d.points.length === 0) continue;
        const pts = d.points.map(p => {
          let idx = p.index;
          if (p.time && cleanCandles[idx]?.openTime !== p.time) {
            for (let ci = 0; ci < cleanCandles.length; ci++) {
              if (cleanCandles[ci].openTime === p.time) { idx = ci; break; }
            }
          }
          return {
            x: (idx - startIdx) * candleW + candleW / 2,
            y: chartH * (1 - (p.price - pMin) / pRange),
          };
        });

        const p1 = pts[0];
        if (d.points.length === 1) {
          if (d.tool === 'HORIZONTAL') {
            if (Math.abs(y - p1.y) <= 12) { clickedDrawingId = d.id; break; }
          } else if (d.tool === 'HORIZONTAL_RAY') {
            if (Math.abs(y - p1.y) <= 12 && x >= p1.x - 5) { clickedDrawingId = d.id; break; }
          } else if (d.tool === 'VERTICAL_LINE') {
            if (Math.abs(x - p1.x) <= 12) { clickedDrawingId = d.id; break; }
          } else if (d.tool === 'CROSS_LINE') {
            if (Math.abs(y - p1.y) <= 12 || Math.abs(x - p1.x) <= 12) { clickedDrawingId = d.id; break; }
          } else {
            // Anchor point hit test for 1-point markers (TEXT, ANCHORED_TEXT, PRICE_LABEL, ARROW_UP, ARROW_DOWN, FLAG)
            if (Math.hypot(x - p1.x, y - p1.y) <= 22) { clickedDrawingId = d.id; break; }
          }
        } else if (pts.length >= 2) {
          // Distance to any line segment between consecutive points
          let hitSegment = false;
          for (let si = 0; si < pts.length - 1; si++) {
            const pa = pts[si], pb = pts[si + 1];
            const dx = pb.x - pa.x, dy = pb.y - pa.y;
            const lenSq = dx * dx + dy * dy;
            if (lenSq > 0) {
              let t = ((x - pa.x) * dx + (y - pa.y) * dy) / lenSq;
              if (d.tool === 'RAY' && si === pts.length - 2) {
                t = Math.max(0, t);
              } else if (d.tool === 'EXTENDED_LINE') {
                // infinite
              } else {
                t = Math.max(0, Math.min(1, t));
              }
              const px = pa.x + t * dx, py = pa.y + t * dy;
              if (Math.hypot(x - px, y - py) <= 14) {
                hitSegment = true;
                break;
              }
            }
          }
          if (hitSegment) {
            clickedDrawingId = d.id;
            break;
          }

          // Area bounding test for box-like / polygon shapes
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          for (const ptItem of pts) {
            if (ptItem.x < minX) minX = ptItem.x;
            if (ptItem.x > maxX) maxX = ptItem.x;
            if (ptItem.y < minY) minY = ptItem.y;
            if (ptItem.y > maxY) maxY = ptItem.y;
          }
          const isAreaTool = [
            'RECTANGLE', 'ROTATED_RECTANGLE', 'CIRCLE', 'ELLIPSE', 'TRIANGLE',
            'CHANNEL', 'DISJOINT_CHANNEL', 'FIB_CHANNEL', 'GANN_BOX',
            'RISK_REWARD_LONG', 'RISK_REWARD_SHORT', 'PRICE_RANGE', 'DATE_RANGE', 'MEASURE',
            'XABCD_PATTERN', 'ABCD_PATTERN'
          ].includes(d.tool);
          if (isAreaTool && x >= minX - 10 && x <= maxX + 10 && y >= minY - 10 && y <= maxY + 10) {
            clickedDrawingId = d.id;
            break;
          }
        }
      }

      if (clickedDrawingId) {
        if (cursorMode === 'eraser' && !isAllDrawingsLocked) {
          onDeleteDrawing?.(clickedDrawingId);
          onSelectDrawing?.(null);
          setQuickBarPos(null);
          return;
        }
        onSelectDrawing?.(clickedDrawingId);
        setQuickBarPos({ x: e.clientX, y: e.clientY });
        return;
      }

      // 3. Clicked empty canvas: clear selection and start mouse pan drag
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
    const reqPoints = getToolRequiredPoints(activeDrawingTool);

    // 1-Point Instant Tools
    if (reqPoints === 1) {
      if (activeDrawingTool === 'TEXT' || activeDrawingTool === 'ANCHORED_TEXT') {
        const text = window.prompt(activeDrawingTool === 'ANCHORED_TEXT' ? 'Enter anchored note text:' : 'Enter annotation text:', 'Key Level');
        if (text && text.trim()) {
          onAddDrawing?.({
            id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            tool: activeDrawingTool,
            points: [{ index: pt.index, time: pt.time, price: pt.price }],
            text: text.trim(),
            color: '#1E293B',
            lineWidth: 1,
            completed: true,
          });
        }
      } else {
        onAddDrawing?.({
          id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          tool: activeDrawingTool,
          points: [{ index: pt.index, time: pt.time, price: pt.price }],
          color: getDefaultToolColor(activeDrawingTool),
          lineWidth: 2,
          completed: true,
        });
      }
      committedPointsRef.current = [];
      setDrawingInProgress(null);
      if (!isDrawingModeLocked) onDrawingToolChange?.('NONE');
      return;
    }

    // Freehand Brush & Highlighter
    if (activeDrawingTool === 'BRUSH' || activeDrawingTool === 'HIGHLIGHTER') {
      isBrushingRef.current = true;
      const newBrush: DrawingItem = {
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tool: activeDrawingTool,
        points: [{ index: pt.index, time: pt.time, price: pt.price }],
        color: getDefaultToolColor(activeDrawingTool),
        lineWidth: activeDrawingTool === 'HIGHLIGHTER' ? 14 : 2.5,
        completed: false,
      };
      setDrawingInProgress(newBrush);
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      return;
    }

    // Multi-Point Tools (2-point, 3-point, 4-point, 5-point, polyline)
    if (committedPointsRef.current.length === 0) {
      // First point clicked
      committedPointsRef.current = [{ index: pt.index, time: pt.time, price: pt.price }];
      const defaultColor = getDefaultToolColor(activeDrawingTool);
      setDrawingInProgress({
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tool: activeDrawingTool,
        points: [...committedPointsRef.current],
        color: defaultColor,
        lineWidth: 2,
        completed: false,
        riskRewardRatio: (activeDrawingTool === 'RISK_REWARD_LONG' || activeDrawingTool === 'RISK_REWARD_SHORT') ? 2.0 : undefined,
      });
    } else {
      // Check if this click satisfies the required points
      if (reqPoints > 0 && committedPointsRef.current.length + 1 >= reqPoints) {
        // Final point!
        const finalPoints = [...committedPointsRef.current, { index: pt.index, time: pt.time, price: pt.price }];
        if (activeDrawingTool === 'CALLOUT') {
          const text = window.prompt('Enter callout annotation note:', 'Key Pivot');
          onAddDrawing?.({
            ...drawingInProgress!,
            points: finalPoints,
            text: text?.trim() || 'Key Pivot',
            completed: true,
          });
        } else {
          onAddDrawing?.({
            ...drawingInProgress!,
            points: finalPoints,
            completed: true,
          });
        }
        committedPointsRef.current = [];
        setDrawingInProgress(null);
        if (!isDrawingModeLocked) onDrawingToolChange?.('NONE');
      } else {
        // Append point and wait for remaining points
        committedPointsRef.current.push({ index: pt.index, time: pt.time, price: pt.price });
        setDrawingInProgress(prev => prev ? ({
          ...prev,
          points: [...committedPointsRef.current],
        }) : null);
      }
    }
  }, [activeDrawingTool, cleanCandles, endIdx, startIdx, cursorMode, drawings, drawingInProgress, getPointFromEvent, indicators, isAllDrawingsHidden, isAllDrawingsLocked, isDrawingModeLocked, onDeleteDrawing, onAddDrawing, onDrawingToolChange, onSelectDrawing, priceOffset, priceScaleRatio, scrollOffset, showVolumePanel, size, visibleCount]);

  // ── Keyboard Shortcuts (Alt+Tool, Space to Live, ?, Undo, Delete) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        committedPointsRef.current = [];
        isBrushingRef.current = false;
        setDrawingInProgress(null);
        onDrawingToolChange?.('NONE');
        onSelectDrawing?.(null);
        setQuickBarPos(null);
      } else if (e.key === 'Enter') {
        if (activeDrawingTool === 'POLYLINE' && committedPointsRef.current.length >= 2) {
          if (drawingInProgress) {
            onAddDrawing?.({
              ...drawingInProgress,
              points: [...committedPointsRef.current],
              completed: true,
            });
          }
          committedPointsRef.current = [];
          setDrawingInProgress(null);
          if (!isDrawingModeLocked) onDrawingToolChange?.('NONE');
        }
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawingTool, drawingInProgress, isDrawingModeLocked, onAddDrawing, onDrawingToolChange, onUndoDrawing, onDeleteDrawing, onSelectDrawing, selectedDrawingId, onExportSnapshot]);

  // Wheel zoom + scroll attached to foreground overlay canvas
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      const maxScroll = Math.max(0, cleanCandles.length - 8);
      const delta = e.deltaY > 0 ? -4 : 4;
      setScrollOffset(s => Math.max(0, Math.min(maxScroll, s + delta)));
    } else {
      setZoom(z => Math.max(0.15, Math.min(6.0, +(z * (e.deltaY < 0 ? 1.15 : 0.87)).toFixed(2))));
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
      const newZoom = Math.max(0.15, Math.min(6.0, +(touchStartZoomRef.current * scale).toFixed(2)));
      setZoom(newZoom);
      return;
    }
    if (e.touches.length === 1 && lastTouchX.current !== null) {
      const dx = e.touches[0].clientX - lastTouchX.current;
      const visCnt = visibleCount;
      const candlePixels = Math.max(1, (size.w - CHART_RIGHT_MARGIN) / visCnt);
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
    if (cursorMode === 'eraser') return 'cursor-not-allowed';
    if (activeDrawingTool && activeDrawingTool !== 'NONE') return 'cursor-crosshair';
    if (isDragging) return 'cursor-grabbing';
    if (cursorMode === 'pan') return 'cursor-grab';
    if (cursorMode === 'arrow') return 'cursor-default';
    return 'cursor-crosshair';
  }, [activeDrawingTool, cursorMode, hoverScaleZone, isDragging]);

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
      {/* ── Floating Chart Controls Dock (Zoom & Pan Navigation) ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-full shadow-lg shadow-slate-900/10 px-2.5 py-1 select-none transition-all">
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
            setZoom(z => Math.max(0.15, +(z / 1.25).toFixed(2)));
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
            setZoom(z => Math.min(6.0, +(z * 1.25).toFixed(2)));
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
