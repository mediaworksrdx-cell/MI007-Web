'use client';

import { useRef, useEffect, useCallback, useState, useLayoutEffect, useMemo } from 'react';
import type { Candle, ChartType, IndicatorType, IndicatorConfig, FnoOverlayLevels, StrategyPayoffOverlay, MagnetReticle, ScaleState } from '@/lib/types';
import { isOverlay, CHART_RIGHT_MARGIN, CHART_BOTTOM_MARGIN } from '@/lib/types';
import type { DrawingItem, DrawingToolType, DrawingPoint } from '@/lib/drawingTypes';
import { renderChart, renderOverlay, resolveDrawingPointIndex, computeChartPriceBounds } from '@/lib/chartRenderer';
import { DrawingQuickBar } from './DrawingQuickBar';
import { DrawingSettingsModal } from './DrawingSettingsModal';
import { DrawingContextMenu } from './DrawingContextMenu';
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
  onOpenObjectTree?: () => void;
  onHoverCandle?: (candle: Candle | null) => void;
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
    case 'PIVOT_POINTS': return '#EAB308';
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
  onOpenObjectTree,
  onHoverCandle,
}: CandlestickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [drawingInProgress, setDrawingInProgress] = useState<DrawingItem | null>(null);
  const [quickBarPos, setQuickBarPos] = useState<{ x: number; y: number } | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuDrawing, setContextMenuDrawing] = useState<DrawingItem | null>(null);
  const [dpr, setDpr] = useState(1);
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedDrawingRef = useRef(false);
  const committedPointsRef = useRef<Array<{ index: number; time: number; price: number }>>([]);
  const isBrushingRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [clockTick, setClockTick] = useState(0);

  // ── In-Chart Text Annotation Inline Editor ──
  interface InlineTextEditorState {
    isOpen: boolean;
    mode: 'create' | 'edit';
    drawingId?: string;
    tool: DrawingToolType;
    point: DrawingPoint;
    calloutAnchor?: DrawingPoint;
    x: number;
    y: number;
    initialText: string;
  }
  const [inlineTextEditor, setInlineTextEditor] = useState<InlineTextEditorState | null>(null);
  const [inlineTextValue, setInlineTextValue] = useState('');
  const inlineInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inlineTextEditor?.isOpen) {
      const timer = setTimeout(() => {
        if (inlineInputRef.current) {
          inlineInputRef.current.focus();
          inlineInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [inlineTextEditor]);

  const handleCommitInlineText = useCallback(() => {
    if (!inlineTextEditor) return;
    const trimmed = inlineTextValue.trim();
    if (!trimmed) {
      setInlineTextEditor(null);
      if (!isDrawingModeLocked && inlineTextEditor.mode === 'create') {
        onDrawingToolChange?.('NONE');
      }
      return;
    }

    if (inlineTextEditor.mode === 'create') {
      const newId = `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newDrawing: DrawingItem = {
        id: newId,
        tool: inlineTextEditor.tool,
        points: inlineTextEditor.calloutAnchor
          ? [inlineTextEditor.calloutAnchor, inlineTextEditor.point]
          : [inlineTextEditor.point],
        text: trimmed,
        color: inlineTextEditor.tool === 'CALLOUT' ? '#0284C7' : '#1E293B',
        lineWidth: 1,
        fontSize: 13,
        completed: true,
      };
      onAddDrawing?.(newDrawing);
      onSelectDrawing?.(newId);
      if (!isDrawingModeLocked) {
        onDrawingToolChange?.('NONE');
      }
    } else if (inlineTextEditor.mode === 'edit' && inlineTextEditor.drawingId) {
      const target = drawings.find(d => d.id === inlineTextEditor.drawingId);
      if (target) {
        onUpdateDrawing?.({
          ...target,
          text: trimmed,
        });
      }
    }

    setInlineTextEditor(null);
  }, [inlineTextEditor, inlineTextValue, onAddDrawing, onSelectDrawing, onUpdateDrawing, isDrawingModeLocked, onDrawingToolChange, drawings]);

  const handleCancelInlineText = useCallback(() => {
    setInlineTextEditor(null);
    if (!isDrawingModeLocked && inlineTextEditor?.mode === 'create') {
      onDrawingToolChange?.('NONE');
    }
  }, [inlineTextEditor, isDrawingModeLocked, onDrawingToolChange]);

  // ── High-Performance 120 FPS Interaction & Overlay Refs ──
  const crosshairRef = useRef<{ x: number; y: number } | null>(null);
  const magnetReticleRef = useRef<MagnetReticle | null>(null);
  const isShiftHeldRef = useRef(false);

  // Animation frame coalescing refs (guarantees 120 FPS V-Sync alignment)
  const panRafIdRef = useRef<number | null>(null);
  const pendingScrollRef = useRef<number | null>(null);
  const scaleRafIdRef = useRef<number | null>(null);
  const pendingScaleRatioRef = useRef<number | null>(null);
  const zoomRafIdRef = useRef<number | null>(null);
  const pendingZoomRef = useRef<number | null>(null);
  const wheelRafIdRef = useRef<number | null>(null);
  const pendingWheelDeltaRef = useRef<{ scroll: number; zoomMult: number }>({ scroll: 0, zoomMult: 1 });
  const chartRafIdRef = useRef<number | null>(null);
  const overlayRafIdRef = useRef<number | null>(null);

  // Deduplication refs for hover states (prevents redundant React reconciliations)
  const hoverDrawingZoneRef = useRef<'none' | 'drawing' | 'endpoint'>('none');
  const hoverScaleZoneRef = useRef<'none' | 'price' | 'time'>('none');

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
      if (e.key === 'Shift') {
        setIsShiftHeld(true);
        isShiftHeldRef.current = true;
      }
    };
    const handleShiftUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftHeld(false);
        isShiftHeldRef.current = false;
        magnetReticleRef.current = null;
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
      if (movingDrawingRef.current) {
        movingDrawingRef.current = null;
        setIsMovingDrawing(false);
      }
      adjustingRef.current = null;
      setIsAdjustingDrawing(false);
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

  // Defensive auto-healing: only fix truly corrupt data (NaN, zero, negative, impossible OHLC)
  const cleanCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    return candles.map(c => {
      if (!c) return c;
      // Fix NaN / zero / negative values by falling back to close, then prior candle-safe defaults
      let o = (Number.isFinite(c.open) && c.open > 0) ? c.open : c.close;
      let h = (Number.isFinite(c.high) && c.high > 0) ? c.high : c.close;
      let l = (Number.isFinite(c.low) && c.low > 0) ? c.low : c.close;
      const cl = (Number.isFinite(c.close) && c.close > 0) ? c.close : o;
      // Ensure high >= max(open, close) and low <= min(open, close)
      h = Math.max(h, o, cl);
      l = Math.min(l, o, cl);
      if (o === c.open && h === c.high && l === c.low && cl === c.close) return c;
      return { ...c, open: o, high: h, low: l, close: cl };
    });
  }, [candles]);

  // Viewport calculation with responsive zoom, dynamic candle scaling,
  // and a forward projection empty space buffer of 6 bars (~35-50px) to the right of the latest candle
  const RIGHT_BUFFER_BARS = 6;
  const baseVisible = size.w < 640 ? 55 : size.w < 1024 ? 90 : 140;
  const visibleCount = Math.max(8, Math.round(baseVisible / zoom));
  const maxScrollOffset = Math.max(0, cleanCandles.length - 8);
  const minScrollOffset = -RIGHT_BUFFER_BARS * 2;
  const effectiveScroll = Math.max(minScrollOffset, Math.min(maxScrollOffset, scrollOffset));
  const endIdx = Math.round(cleanCandles.length + RIGHT_BUFFER_BARS - effectiveScroll);
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
    const rawIdx = startIdx + offsetIdx;
    const candleIdx = Math.min(cleanCandles.length - 1, Math.max(0, rawIdx));

    // Apply shared unified price scale calculation
    const { pMin, pMax, pRange } = computeChartPriceBounds(
      cleanCandles,
      startIdx,
      endIdx,
      currentPriceOverride,
      priceOffset,
      priceScaleRatio
    );

    const clampedY = Math.max(0, Math.min(chartH, y));
    let price = pMax - (clampedY / chartH) * pRange;
    let finalX = x;

    // Smart Magnet snapping (OHLC wicks) - only snaps when hovering over real candle bars
    let reticle: MagnetReticle | null = null;
    if (snapMagnet && (isMagnetActive || isShiftHeld) && rawIdx <= cleanCandles.length - 1) {
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
    magnetReticleRef.current = reticle;

    // Support forward projected timestamps for drawings placed in the buffer zone
    let time = cleanCandles[candleIdx]?.openTime || Date.now();
    if (rawIdx > cleanCandles.length - 1 && cleanCandles.length > 0) {
      const lastBar = cleanCandles[cleanCandles.length - 1];
      const prevBar = cleanCandles[cleanCandles.length - 2];
      const barDuration = (prevBar && lastBar.openTime > prevBar.openTime)
        ? (lastBar.openTime - prevBar.openTime)
        : 86_400_000;
      time = lastBar.openTime + (rawIdx - (cleanCandles.length - 1)) * barDuration;
    }
    return { index: rawIdx, time, price, x: finalX, y };
  }, [cleanCandles, startIdx, endIdx, visibleCount, indicators, isMagnetActive, isShiftHeld, priceOffset, priceScaleRatio, showVolumePanel, size, currentPriceOverride]);

  const handleCloneDrawing = useCallback((drawingToClone: DrawingItem) => {
    const cloned: DrawingItem = {
      ...drawingToClone,
      id: `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      points: drawingToClone.points.map(p => ({
        ...p,
        price: p.price * 1.005,
        index: p.index + 2,
      })),
    };
    onAddDrawing?.(cloned);
    onSelectDrawing?.(cloned.id);
  }, [onAddDrawing, onSelectDrawing]);

  const findDrawingAtCoords = useCallback((x: number, y: number): DrawingItem | null => {
    if (!drawings || drawings.length === 0 || cleanCandles.length === 0) return null;

    const panelInds = indicators.filter(i => !isOverlay(i.type) && i.enabled);
    const totalPanels = panelInds.length + (showVolumePanel ? 1 : 0);
    const panelH = totalPanels === 0 ? 0 : Math.min(size.h * 0.38, totalPanels * 95);
    const chartH = size.h - panelH - CHART_BOTTOM_MARGIN;
    const chartW = size.w - CHART_RIGHT_MARGIN;
    const visCnt = visibleCount;
    const candleW = visCnt > 0 ? chartW / visCnt : 1;

    const { pMin, pRange } = computeChartPriceBounds(
      cleanCandles,
      startIdx,
      endIdx,
      currentPriceOverride,
      priceOffset,
      priceScaleRatio
    );

    for (let di = drawings.length - 1; di >= 0; di--) {
      const d = drawings[di];
      if (d.hidden || !d.points || d.points.length === 0) continue;
      const pts = d.points.map(p => {
        const idx = resolveDrawingPointIndex(p, cleanCandles);
        return {
          x: (idx - startIdx) * candleW + candleW / 2,
          y: chartH * (1 - (p.price - pMin) / pRange),
          rawPrice: p.price,
        };
      });

      // 1. Anchor point check
      for (const ptItem of pts) {
        if (Math.hypot(x - ptItem.x, y - ptItem.y) <= 22) {
          return d;
        }
      }

      const p1 = pts[0];

      // 1.5 Text Annotations / Anchored Text / Price Label
      if (d.tool === 'TEXT' || d.tool === 'ANCHORED_TEXT' || d.tool === 'PRICE_LABEL') {
        const textLen = (d.text || 'Annotation').length;
        const boxW = Math.max(50, textLen * 9 + 20);
        const boxH = 28;
        if (x >= p1.x - 8 && x <= p1.x + boxW + 8 && y >= p1.y - boxH - 8 && y <= p1.y + 12) {
          return d;
        }
      }

      // Callout Balloon Box
      if (d.tool === 'CALLOUT' && pts.length >= 2) {
        const p2 = pts[1];
        const textLen = (d.text || 'Note').length;
        const boxW = Math.max(50, textLen * 9 + 20);
        const boxH = 26;
        if (x >= p2.x - 8 && x <= p2.x + boxW + 8 && y >= p2.y - boxH && y <= p2.y + boxH) {
          return d;
        }
      }

      // 2. Horizontal / Vertical Lines
      if (d.tool === 'HORIZONTAL') {
        if (Math.abs(y - p1.y) <= 18) return d;
      } else if (d.tool === 'HORIZONTAL_RAY') {
        if (Math.abs(y - p1.y) <= 18 && x >= p1.x - 12) return d;
      } else if (d.tool === 'VERTICAL_LINE') {
        if (Math.abs(x - p1.x) <= 18) return d;
      } else if (d.tool === 'CROSS_LINE') {
        if (Math.abs(y - p1.y) <= 18 || Math.abs(x - p1.x) <= 18) return d;
      }

      // 3. Fibonacci Retracement
      if (d.tool === 'FIBONACCI' && pts.length >= 2) {
        const p2 = pts[1];
        const minX = Math.min(p1.x, p2.x), maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y), maxY = Math.max(p1.y, p2.y);
        if (x >= minX - 18 && x <= maxX + 18) {
          const fibLvls = [0.0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618, 2.618];
          let hitFib = false;
          for (const fl of fibLvls) {
            const ly = p1.y + (p2.y - p1.y) * fl;
            if (Math.abs(y - ly) <= 18) { hitFib = true; break; }
          }
          if (hitFib || (y >= minY - 10 && y <= maxY + 10)) {
            return d;
          }
        }
      }

      // 4. Fibonacci Extension
      if (d.tool === 'FIBONACCI_EXTENSION' && pts.length >= 2) {
        const p2 = pts[1];
        const p3 = pts[2] || p2;
        const minX = Math.min(p1.x, p2.x);
        const baseRange = p2.rawPrice - p1.rawPrice;
        if (x >= minX - 18) {
          const extLvls = [0.0, 0.618, 1.0, 1.618, 2.618];
          for (const el of extLvls) {
            const targetP = p3.rawPrice + baseRange * el;
            const ly = chartH * (1 - (targetP - pMin) / pRange);
            if (Math.abs(y - ly) <= 18) return d;
          }
        }
      }

      // 4.5 Pivot Points (Fibonacci)
      if (d.tool === 'PIVOT_POINTS' && pts.length >= 2) {
        const p2 = pts[1];
        const minX = Math.min(p1.x, p2.x);
        if (x >= minX - 18) {
          const high = Math.max(p1.rawPrice, p2.rawPrice);
          const low = Math.min(p1.rawPrice, p2.rawPrice);
          const rng = high - low;
          const p = (high + low) / 2;
          const pivotLvls = [p + rng, p + 0.618 * rng, p + 0.382 * rng, p, p - 0.382 * rng, p - 0.618 * rng, p - rng];
          for (const pl of pivotLvls) {
            const ly = chartH * (1 - (pl - pMin) / pRange);
            if (Math.abs(y - ly) <= 18) return d;
          }
        }
      }

      // 5. Line segments
      if (pts.length >= 2) {
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
            if (Math.hypot(x - px, y - py) <= 20) {
              return d;
            }
          }
        }

        // 6. Area bounding for 2D shapes
        if (d.tool === 'CIRCLE' && pts.length >= 2) {
          const center = pts[0];
          const edge = pts[1];
          const r = Math.hypot(edge.x - center.x, edge.y - center.y);
          const dist = Math.hypot(x - center.x, y - center.y);
          if (dist <= r + 8) {
            return d;
          }
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const ptItem of pts) {
          if (ptItem.x < minX) minX = ptItem.x;
          if (ptItem.x > maxX) maxX = ptItem.x;
          if (ptItem.y < minY) minY = ptItem.y;
          if (ptItem.y > maxY) maxY = ptItem.y;
        }
        const isAreaTool = [
          'RECTANGLE', 'ROTATED_RECTANGLE', 'ELLIPSE', 'TRIANGLE',
          'CHANNEL', 'DISJOINT_CHANNEL', 'FIB_CHANNEL', 'GANN_BOX', 'GANN_FAN',
          'RISK_REWARD_LONG', 'RISK_REWARD_SHORT', 'PRICE_RANGE', 'DATE_RANGE', 'MEASURE',
          'XABCD_PATTERN', 'ABCD_PATTERN', 'HEAD_AND_SHOULDERS', 'ELLIOTT_IMPULSE', 'ELLIOTT_CORRECTION'
        ].includes(d.tool);
        if (isAreaTool && x >= minX - 12 && x <= maxX + 12 && y >= minY - 12 && y <= maxY + 12) {
          return d;
        }
      } else if (pts.length === 1) {
        if (Math.hypot(x - p1.x, y - p1.y) <= 26) {
          return d;
        }
      }
    }
    return null;
  }, [drawings, cleanCandles, indicators, showVolumePanel, size.h, size.w, visibleCount, startIdx, endIdx, currentPriceOverride, priceOffset, priceScaleRatio]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    const canvas = overlayCanvasRef.current || canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Dismiss floating quickbar on right click
    setQuickBarPos(null);

    const hit = findDrawingAtCoords(x, y) || (selectedDrawingId ? drawings.find(d => d.id === selectedDrawingId) : null);
    if (hit) {
      onSelectDrawing?.(hit.id);
      setContextMenuDrawing(hit);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      setContextMenuPos(null);
      setContextMenuDrawing(null);
    }
  }, [drawings, findDrawingAtCoords, onSelectDrawing, selectedDrawingId]);

  // ── Sync latest props and states to refs for direct 120 FPS overlay rendering ──
  const cleanCandlesRef = useRef(cleanCandles);
  cleanCandlesRef.current = cleanCandles;
  const chartTypeRef = useRef(chartType);
  chartTypeRef.current = chartType;
  const showVolumeRef = useRef(showVolume);
  showVolumeRef.current = showVolume;
  const showVolumePanelRef = useRef(showVolumePanel);
  showVolumePanelRef.current = showVolumePanel;
  const showSmcOverlayRef = useRef(showSmcOverlay);
  showSmcOverlayRef.current = showSmcOverlay;
  const showVolumeProfileRef = useRef(showVolumeProfile);
  showVolumeProfileRef.current = showVolumeProfile;
  const indicatorsRef = useRef(indicators);
  indicatorsRef.current = indicators;
  const indicatorResultsRef = useRef(indicatorResults);
  indicatorResultsRef.current = indicatorResults;
  const currentPriceOverrideRef = useRef(currentPriceOverride);
  currentPriceOverrideRef.current = currentPriceOverride;
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;
  const cursorModeRef = useRef(cursorMode);
  cursorModeRef.current = cursorMode;
  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;
  const drawingInProgressRef = useRef(drawingInProgress);
  drawingInProgressRef.current = drawingInProgress;
  const selectedDrawingIdRef = useRef(selectedDrawingId);
  selectedDrawingIdRef.current = selectedDrawingId;
  const isAllDrawingsHiddenRef = useRef(isAllDrawingsHidden);
  isAllDrawingsHiddenRef.current = isAllDrawingsHidden;
  const priceScaleRatioRef = useRef(priceScaleRatio);
  priceScaleRatioRef.current = priceScaleRatio;
  const priceOffsetRef = useRef(priceOffset);
  priceOffsetRef.current = priceOffset;
  const startIdxRef = useRef(startIdx);
  startIdxRef.current = startIdx;
  const endIdxRef = useRef(endIdx);
  endIdxRef.current = endIdx;
  const dprRef = useRef(dpr);
  dprRef.current = dpr;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // ── Direct 120 FPS Overlay Canvas Render (Bypasses React Re-renders on Pointer Move) ──
  const renderOverlayNow = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || sizeRef.current.w === 0 || cleanCandlesRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ch = crosshairRef.current;
    const chCoord = (ch && cursorModeRef.current !== 'pan')
      ? { x: ch.x * dprRef.current, y: ch.y * dprRef.current }
      : null;

    renderOverlay(
      ctx,
      cleanCandlesRef.current,
      {
        chartType: chartTypeRef.current,
        showVolume: showVolumeRef.current,
        showVolumePanel: showVolumePanelRef.current,
        showSmcOverlay: showSmcOverlayRef.current,
        showVolumeProfile: showVolumeProfileRef.current,
        indicators: indicatorsRef.current,
        indicatorResults: indicatorResultsRef.current,
        currentPriceOverride: currentPriceOverrideRef.current,
        timeframe: timeframeRef.current,
        cursorMode: cursorModeRef.current,
        drawings: isAllDrawingsHiddenRef.current ? [] : drawingsRef.current,
        activeDrawing: isAllDrawingsHiddenRef.current ? null : drawingInProgressRef.current,
        selectedDrawingId: isAllDrawingsHiddenRef.current ? null : selectedDrawingIdRef.current,
        scaleState: { priceScaleRatio: priceScaleRatioRef.current, priceOffset: priceOffsetRef.current },
      },
      { startIdx: startIdxRef.current, endIdx: endIdxRef.current },
      chCoord,
      dprRef.current,
      magnetReticleRef.current
    );
  }, []);

  const requestOverlayRender = useCallback(() => {
    if (overlayRafIdRef.current !== null) return;
    overlayRafIdRef.current = requestAnimationFrame(() => {
      overlayRafIdRef.current = null;
      renderOverlayNow();
    });
  }, [renderOverlayNow]);

  // Keep overlay canvas synchronized whenever React props or states change
  useEffect(() => {
    requestOverlayRender();
  });

  // ── LAYER 1: Background Canvas Render (Candles, Indicators, SMC, Volumes) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || cleanCandles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (chartRafIdRef.current !== null) {
      cancelAnimationFrame(chartRafIdRef.current);
    }

    chartRafIdRef.current = requestAnimationFrame(() => {
      chartRafIdRef.current = null;
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
    });

    return () => {
      if (chartRafIdRef.current !== null) {
        cancelAnimationFrame(chartRafIdRef.current);
        chartRafIdRef.current = null;
      }
    };
  }, [cleanCandles, chartType, showVolume, showVolumePanel, showSmcOverlay, showVolumeProfile,
      showFnoOverlay, fnoLevels, strategyOverlay,
      indicators, indicatorResults, currentPriceOverride, timeframe,
      drawings, isAllDrawingsHidden, startIdx, endIdx, priceScaleRatio, priceOffset, size, dpr, clockTick]);

  // Global cleanup of all animation frames on unmount
  useEffect(() => {
    return () => {
      if (overlayRafIdRef.current !== null) cancelAnimationFrame(overlayRafIdRef.current);
      if (panRafIdRef.current !== null) cancelAnimationFrame(panRafIdRef.current);
      if (scaleRafIdRef.current !== null) cancelAnimationFrame(scaleRafIdRef.current);
      if (zoomRafIdRef.current !== null) cancelAnimationFrame(zoomRafIdRef.current);
      if (wheelRafIdRef.current !== null) cancelAnimationFrame(wheelRafIdRef.current);
      if (chartRafIdRef.current !== null) cancelAnimationFrame(chartRafIdRef.current);
    };
  }, []);

  // Mouse dragging and endpoint adjustment refs
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartScrollRef = useRef<number>(0);
  const adjustingRef = useRef<{ drawingId: string; pointIdx: number } | null>(null);
  const movingDrawingRef = useRef<{
    drawingId: string;
    startPt: { index: number; price: number };
    initialPoints: { index: number; time?: number; price: number }[];
  } | null>(null);
  const [isMovingDrawing, setIsMovingDrawing] = useState(false);
  const [isAdjustingDrawing, setIsAdjustingDrawing] = useState(false);
  const [hoverDrawingZone, setHoverDrawingZone] = useState<'none' | 'drawing' | 'endpoint'>('none');

  // Pointer events
  // Pointer events with Interactive Axis Dragging & 120 FPS Precision
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
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
        setIsAdjustingDrawing(false);
      }
      if (movingDrawingRef.current) {
        movingDrawingRef.current = null;
        setIsMovingDrawing(false);
      }
      if (dragScaleModeRef.current !== 'none') {
        dragScaleModeRef.current = 'none';
      }

      // Detect hover over drawing or endpoint for cursor icon updates
      if (!activeDrawingTool || activeDrawingTool === 'NONE') {
        const panelInds = indicators.filter(i => !isOverlay(i.type) && i.enabled);
        const totalPanels = panelInds.length + (showVolumePanel ? 1 : 0);
        const panelH = totalPanels === 0 ? 0 : Math.min(size.h * 0.38, totalPanels * 95);
        const chartH = size.h - panelH - CHART_BOTTOM_MARGIN;
        const chartW = size.w - CHART_RIGHT_MARGIN;
        const visCnt = visibleCount;
        const candleW = visCnt > 0 ? chartW / visCnt : 1;

        const { pMin, pRange } = computeChartPriceBounds(
          cleanCandles,
          startIdx,
          endIdx,
          currentPriceOverride,
          priceOffset,
          priceScaleRatio
        );

        let hoveredEndpoint = false;
        let hoveredBody = false;

        for (const d of drawings) {
          if (d.hidden || !d.points || d.points.length === 0) continue;
          const pts = d.points.map(p => {
            const idx = resolveDrawingPointIndex(p, cleanCandles);
            return {
              x: (idx - startIdx) * candleW + candleW / 2,
              y: chartH * (1 - (p.price - pMin) / pRange),
            };
          });

          // Check endpoints (radius 24px)
          for (const ep of pts) {
            if (Math.hypot(x - ep.x, y - ep.y) <= 24) {
              hoveredEndpoint = true;
              break;
            }
          }
          if (hoveredEndpoint) break;

          // Check body (radius 18px)
          const p1 = pts[0];
          if (pts.length === 1) {
            if (d.tool === 'HORIZONTAL' && Math.abs(y - p1.y) <= 18) hoveredBody = true;
            else if (d.tool === 'HORIZONTAL_RAY' && Math.abs(y - p1.y) <= 18 && x >= p1.x - 8) hoveredBody = true;
            else if (d.tool === 'VERTICAL_LINE' && Math.abs(x - p1.x) <= 18) hoveredBody = true;
            else if (d.tool === 'CROSS_LINE' && (Math.abs(y - p1.y) <= 18 || Math.abs(x - p1.x) <= 18)) hoveredBody = true;
            else if (Math.hypot(x - p1.x, y - p1.y) <= 24) hoveredBody = true;
          } else {
            for (let si = 0; si < pts.length - 1; si++) {
              const pa = pts[si], pb = pts[si + 1];
              const dx = pb.x - pa.x, dy = pb.y - pa.y;
              const lenSq = dx * dx + dy * dy;
              if (lenSq > 0) {
                let t = ((x - pa.x) * dx + (y - pa.y) * dy) / lenSq;
                if (d.tool === 'RAY' && si === pts.length - 2) t = Math.max(0, t);
                else t = Math.max(0, Math.min(1, t));
                const px = pa.x + t * dx, py = pa.y + t * dy;
                if (Math.hypot(x - px, y - py) <= 18) {
                  hoveredBody = true;
                  break;
                }
              }
            }
            if (!hoveredBody) {
              if (d.tool === 'CIRCLE' && pts.length >= 2) {
                const center = pts[0];
                const edge = pts[1];
                const r = Math.hypot(edge.x - center.x, edge.y - center.y);
                const dist = Math.hypot(x - center.x, y - center.y);
                if (dist <= r + 8) {
                  hoveredBody = true;
                }
              }
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              for (const ptItem of pts) {
                if (ptItem.x < minX) minX = ptItem.x;
                if (ptItem.x > maxX) maxX = ptItem.x;
                if (ptItem.y < minY) minY = ptItem.y;
                if (ptItem.y > maxY) maxY = ptItem.y;
              }
              const isAreaTool = [
                'RECTANGLE', 'ROTATED_RECTANGLE', 'ELLIPSE', 'TRIANGLE',
                'CHANNEL', 'DISJOINT_CHANNEL', 'FIB_CHANNEL', 'GANN_BOX',
                'RISK_REWARD_LONG', 'RISK_REWARD_SHORT', 'PRICE_RANGE', 'DATE_RANGE', 'MEASURE',
                'XABCD_PATTERN', 'ABCD_PATTERN'
              ].includes(d.tool);
              if (isAreaTool && x >= minX - 10 && x <= maxX + 10 && y >= minY - 10 && y <= maxY + 10) {
                hoveredBody = true;
              }
            }
          }
          if (hoveredBody) break;
        }

        const nextHoverDrawingZone = hoveredEndpoint ? 'endpoint' : hoveredBody ? 'drawing' : 'none';
        if (hoverDrawingZoneRef.current !== nextHoverDrawingZone) {
          hoverDrawingZoneRef.current = nextHoverDrawingZone;
          setHoverDrawingZone(nextHoverDrawingZone);
        }
      } else {
        if (hoverDrawingZoneRef.current !== 'none') {
          hoverDrawingZoneRef.current = 'none';
          setHoverDrawingZone('none');
        }
      }
    }

    // Detect hover zone over price or time scales (Deduplicated)
    const nextHoverScaleZone = (x >= size.w - CHART_RIGHT_MARGIN && y < size.h - CHART_BOTTOM_MARGIN)
      ? 'price'
      : (y >= size.h - CHART_BOTTOM_MARGIN && x < size.w - CHART_RIGHT_MARGIN)
      ? 'time'
      : 'none';
    if (hoverScaleZoneRef.current !== nextHoverScaleZone) {
      hoverScaleZoneRef.current = nextHoverScaleZone;
      setHoverScaleZone(nextHoverScaleZone);
    }

    // 0. Interactive Price Scale Dragging (Vertical Stretch / Compress with rAF)
    if (dragScaleModeRef.current === 'price') {
      const dy = e.clientY - dragScaleStartYRef.current;
      const factor = Math.max(0.1, Math.min(10, dragScaleStartRatioRef.current * (1 + dy / 180)));
      pendingScaleRatioRef.current = +factor.toFixed(3);
      if (scaleRafIdRef.current === null) {
        scaleRafIdRef.current = requestAnimationFrame(() => {
          scaleRafIdRef.current = null;
          if (pendingScaleRatioRef.current !== null) {
            setPriceScaleRatio(pendingScaleRatioRef.current);
            pendingScaleRatioRef.current = null;
          }
        });
      }
      return;
    }

    // 0.5. Interactive Time Scale Dragging (Horizontal Spacing Adjustment with rAF)
    if (dragScaleModeRef.current === 'time') {
      const dx = e.clientX - dragScaleStartXRef.current;
      const factor = Math.max(0.2, Math.min(5, dragScaleStartZoomRef.current * (1 - dx / 250)));
      pendingZoomRef.current = +factor.toFixed(2);
      if (zoomRafIdRef.current === null) {
        zoomRafIdRef.current = requestAnimationFrame(() => {
          zoomRafIdRef.current = null;
          if (pendingZoomRef.current !== null) {
            setZoom(pendingZoomRef.current);
            pendingZoomRef.current = null;
          }
        });
      }
      return;
    }

    // Direct 120 FPS Crosshair tracking — zero React state overhead
    crosshairRef.current = { x, y };
    if (isMagnetActive || isShiftHeld) {
      getPointFromEvent(e.clientX, e.clientY);
    } else {
      magnetReticleRef.current = null;
    }
    requestOverlayRender();

    // Notify hovered candle for OHLC display
    const chartW = size.w - CHART_RIGHT_MARGIN;
    const visCnt = visibleCount;
    if (visCnt > 0 && chartW > 0 && cleanCandles.length > 0) {
      const candleW = chartW / visCnt;
      const offsetIdx = Math.floor(x / candleW);
      const rawIdx = startIdx + offsetIdx;
      if (rawIdx >= 0 && rawIdx < cleanCandles.length) {
        onHoverCandle?.(cleanCandles[rawIdx]);
      } else {
        onHoverCandle?.(null);
      }
    }

    // 1. If currently adjusting an existing drawing endpoint
    if (adjustingRef.current) {
      if (!hasDraggedDrawingRef.current) {
        if (Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y) < 4) {
          return;
        }
        hasDraggedDrawingRef.current = true;
      }
      const pt = getPointFromEvent(e.clientX, e.clientY);
      if (pt) {
        const target = drawings.find(d => d.id === adjustingRef.current!.drawingId);
        if (target && !target.locked && !isAllDrawingsLocked) {
          const updatedPoints = target.points.map((p, pIdx) => {
            if (pIdx === adjustingRef.current!.pointIdx) {
              return {
                index: pt.index,
                time: pt.time,
                price: pt.price,
              };
            }
            return {
              ...p,
              index: resolveDrawingPointIndex(p, cleanCandles),
            };
          });
          onUpdateDrawing?.({ ...target, points: updatedPoints });
          setQuickBarPos({ x, y });
        }
      }
      return;
    }

    // 1.5. If currently dragging / moving an entire drawing across price & time
    if (movingDrawingRef.current) {
      if (!hasDraggedDrawingRef.current) {
        if (Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y) < 4) {
          return;
        }
        hasDraggedDrawingRef.current = true;
      }
      const pt = getPointFromEvent(e.clientX, e.clientY);
      if (pt) {
        const target = drawings.find(d => d.id === movingDrawingRef.current!.drawingId);
        if (target && !target.locked && !isAllDrawingsLocked) {
          const deltaIdx = pt.index - movingDrawingRef.current.startPt.index;
          const deltaPrice = pt.price - movingDrawingRef.current.startPt.price;

          const updatedPoints = movingDrawingRef.current.initialPoints.map(p => {
            const newIdx = Math.max(0, Math.min(cleanCandles.length - 1, p.index + deltaIdx));
            const newTime = cleanCandles[newIdx]?.openTime || (p.time ? p.time + deltaIdx * 60000 : Date.now());
            const newPrice = Number((p.price + deltaPrice).toFixed(4));
            return {
              ...p,
              index: newIdx,
              time: newTime,
              price: newPrice,
            };
          });
          onUpdateDrawing?.({ ...target, points: updatedPoints });
          setQuickBarPos({ x, y });
        }
      }
      return;
    }

    // 2. If currently dragging mouse to pan chart (Coalesced via rAF for 120 FPS fluid pan)
    if (isDraggingRef.current && (!activeDrawingTool || activeDrawingTool === 'NONE')) {
      const dx = e.clientX - dragStartXRef.current;
      const visCnt = visibleCount;
      const candlePixels = Math.max(1, (size.w - CHART_RIGHT_MARGIN) / visCnt);
      const deltaCandleCount = dx / candlePixels;
      const maxScroll = Math.max(0, cleanCandles.length - 8);
      const minScroll = -RIGHT_BUFFER_BARS * 2;
      const newScroll = Math.max(minScroll, Math.min(maxScroll, dragStartScrollRef.current + deltaCandleCount));
      pendingScrollRef.current = newScroll;
      if (panRafIdRef.current === null) {
        panRafIdRef.current = requestAnimationFrame(() => {
          panRafIdRef.current = null;
          if (pendingScrollRef.current !== null) {
            setScrollOffset(pendingScrollRef.current);
            pendingScrollRef.current = null;
          }
        });
      }
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
  }, [activeDrawingTool, visibleCount, cleanCandles, drawings, drawingInProgress, getPointFromEvent, onUpdateDrawing, size.h, size.w, startIdx, endIdx, priceOffset, priceScaleRatio, showVolumePanel, indicators, isMagnetActive, isShiftHeld, requestOverlayRender]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    // Flush any pending scale or pan animations
    if (panRafIdRef.current !== null) {
      cancelAnimationFrame(panRafIdRef.current);
      panRafIdRef.current = null;
    }
    if (pendingScrollRef.current !== null) {
      setScrollOffset(pendingScrollRef.current);
      pendingScrollRef.current = null;
    }
    if (scaleRafIdRef.current !== null) {
      cancelAnimationFrame(scaleRafIdRef.current);
      scaleRafIdRef.current = null;
    }
    if (pendingScaleRatioRef.current !== null) {
      setPriceScaleRatio(pendingScaleRatioRef.current);
      pendingScaleRatioRef.current = null;
    }
    if (zoomRafIdRef.current !== null) {
      cancelAnimationFrame(zoomRafIdRef.current);
      zoomRafIdRef.current = null;
    }
    if (pendingZoomRef.current !== null) {
      setZoom(pendingZoomRef.current);
      pendingZoomRef.current = null;
    }

    if (dragScaleModeRef.current !== 'none') {
      dragScaleModeRef.current = 'none';
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    if (adjustingRef.current) {
      if (hasDraggedDrawingRef.current) {
        const pt = getPointFromEvent(e.clientX, e.clientY);
        if (pt) {
          const target = drawings.find(d => d.id === adjustingRef.current!.drawingId);
          if (target && !target.locked && !isAllDrawingsLocked) {
            const updatedPoints = target.points.map((p, pIdx) => {
              if (pIdx === adjustingRef.current!.pointIdx) {
                return { index: pt.index, time: pt.time, price: pt.price };
              }
              return { ...p, index: resolveDrawingPointIndex(p, cleanCandles) };
            });
            onUpdateDrawing?.({ ...target, points: updatedPoints });
          }
        }
      }
      adjustingRef.current = null;
      hasDraggedDrawingRef.current = false;
      setIsAdjustingDrawing(false);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    if (movingDrawingRef.current) {
      movingDrawingRef.current = null;
      hasDraggedDrawingRef.current = false;
      setIsMovingDrawing(false);
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
            const newDrawingId = drawingInProgress.id;
            const canvas = overlayCanvasRef.current || canvasRef.current;
            const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            if (activeDrawingTool === 'CALLOUT') {
              setInlineTextEditor({
                isOpen: true,
                mode: 'create',
                tool: 'CALLOUT',
                point: { index: pt.index, time: pt.time, price: pt.price },
                calloutAnchor: committedPointsRef.current[0],
                x: clickX,
                y: clickY,
                initialText: '',
              });
              setInlineTextValue('');
              committedPointsRef.current = [];
              setDrawingInProgress(null);
              return;
            } else {
              onAddDrawing?.({
                ...drawingInProgress,
                points: finalPoints,
                completed: true,
              });
              onSelectDrawing?.(newDrawingId);
              setQuickBarPos({ x: clickX, y: clickY });
              committedPointsRef.current = [];
              setDrawingInProgress(null);
              if (!isDrawingModeLocked) onDrawingToolChange?.('NONE');
              return;
            }
          }
        }
      } else if (reqPoints >= 3 && committedPointsRef.current.length === 1) {
        const dist = Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y);
        // If user dragged to place Point 2 of a 3-point tool (e.g. Fib Channel / Parallel Channel), commit Point 2
        if (dist > 20) {
          const pt = getPointFromEvent(e.clientX, e.clientY);
          if (pt) {
            committedPointsRef.current.push({ index: pt.index, time: pt.time, price: pt.price });
            setDrawingInProgress(prev => prev ? ({
              ...prev,
              points: [...committedPointsRef.current],
            }) : null);
          }
        }
      }
    }
  }, [activeDrawingTool, drawingInProgress, getPointFromEvent, isDrawingModeLocked, onAddDrawing, onDrawingToolChange]);

  const handlePointerLeave = useCallback((e?: React.PointerEvent<HTMLElement>) => {
    // If pointer moves onto a child element within container (e.g. zoom controls dock), do not clear crosshair
    if (e && e.relatedTarget && containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    crosshairRef.current = null;
    magnetReticleRef.current = null;
    onHoverCandle?.(null);
    requestOverlayRender();
    if (hoverScaleZoneRef.current !== 'none') {
      hoverScaleZoneRef.current = 'none';
      setHoverScaleZone('none');
    }
    if (hoverDrawingZoneRef.current !== 'none') {
      hoverDrawingZoneRef.current = 'none';
      setHoverDrawingZone('none');
    }
  }, [requestOverlayRender]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
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
    } else {
      const hit = findDrawingAtCoords(x, y);
      if (hit) {
        onSelectDrawing?.(hit.id);
        if (hit.locked || isAllDrawingsLocked) {
          return;
        }
        if (hit.tool === 'TEXT' || hit.tool === 'ANCHORED_TEXT' || hit.tool === 'CALLOUT') {
          const lastPt = hit.points[hit.points.length - 1];
          setInlineTextEditor({
            isOpen: true,
            mode: 'edit',
            drawingId: hit.id,
            tool: hit.tool,
            point: lastPt,
            calloutAnchor: hit.points.length > 1 ? hit.points[0] : undefined,
            x,
            y,
            initialText: hit.text || '',
          });
          setInlineTextValue(hit.text || '');
          return;
        }
        setIsSettingsModalOpen(true);
      }
    }
  }, [activeDrawingTool, drawingInProgress, isDrawingModeLocked, onAddDrawing, onDrawingToolChange, size, findDrawingAtCoords, onSelectDrawing]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    // If inline text editor is already open and user clicks chart, commit it
    if (inlineTextEditor) {
      handleCommitInlineText();
      return;
    }

    // Ignore right-click in pointerDown (contextmenu handles right-click)
    if (e.button === 2) {
      setQuickBarPos(null);
      return;
    }
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedDrawingRef.current = false;
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

      const { pMin, pRange } = computeChartPriceBounds(
        cleanCandles,
        startIdx,
        endIdx,
        currentPriceOverride,
        priceOffset,
        priceScaleRatio
      );

      // 1. Check if clicking near any existing drawing endpoint to adjust it
      let targetAdjust: { drawingId: string; pointIdx: number } | null = null;
      let minAdjustDist = 24;

      // Prioritize selected drawing's points first so clicking its anchors always adjusts them
      const prioritizedDrawings = selectedDrawingId
        ? [...drawings.filter(d => d.id === selectedDrawingId), ...drawings.filter(d => d.id !== selectedDrawingId)]
        : drawings;

      for (const d of prioritizedDrawings) {
        if (d.locked || d.hidden) continue;
        for (let i = 0; i < d.points.length; i++) {
          const p = d.points[i];
          const idx = resolveDrawingPointIndex(p, cleanCandles);
          const ptX = (idx - startIdx) * candleW + candleW / 2;
          const ptY = chartH * (1 - (p.price - pMin) / pRange);
          const dist = Math.hypot(x - ptX, y - ptY);
          if (dist <= minAdjustDist) {
            minAdjustDist = dist;
            targetAdjust = { drawingId: d.id, pointIdx: i };
          }
        }
        if (targetAdjust && d.id === selectedDrawingId) break;
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
          setIsAdjustingDrawing(true);
          try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
        }
        onSelectDrawing?.(targetAdjust.drawingId);
        setQuickBarPos({ x, y });
        return;
      }

      // 2. Universal Hit-Testing for All Drawing Tools
      const hitDrawing = findDrawingAtCoords(x, y);
      const clickedDrawingId: string | null = hitDrawing ? hitDrawing.id : null;

      if (clickedDrawingId) {
        const target = drawings.find(d => d.id === clickedDrawingId);
        if (cursorMode === 'eraser' && !isAllDrawingsLocked && !target?.locked) {
          onDeleteDrawing?.(clickedDrawingId);
          onSelectDrawing?.(null);
          setQuickBarPos(null);
          return;
        }
        onSelectDrawing?.(clickedDrawingId);
        setQuickBarPos({ x, y });

        // Start dragging the entire drawing!
        if (target && !target.locked && !isAllDrawingsLocked) {
          movingDrawingRef.current = {
            drawingId: target.id,
            startPt: { index: pt.index, price: pt.price },
            initialPoints: target.points.map(p => ({
              ...p,
              index: resolveDrawingPointIndex(p, cleanCandles),
            })),
          };
          setIsMovingDrawing(true);
          try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
        }
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
        setInlineTextEditor({
          isOpen: true,
          mode: 'create',
          tool: activeDrawingTool,
          point: { index: pt.index, time: pt.time, price: pt.price },
          x,
          y,
          initialText: '',
        });
        setInlineTextValue('');
        committedPointsRef.current = [];
        setDrawingInProgress(null);
        return;
      } else {
        const newId = `draw_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        onAddDrawing?.({
          id: newId,
          tool: activeDrawingTool,
          points: [{ index: pt.index, time: pt.time, price: pt.price }],
          color: getDefaultToolColor(activeDrawingTool),
          lineWidth: 2,
          completed: true,
        });
        onSelectDrawing?.(newId);
        setQuickBarPos({ x, y });
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
        if (activeDrawingTool === 'CALLOUT') {
          setInlineTextEditor({
            isOpen: true,
            mode: 'create',
            tool: 'CALLOUT',
            point: { index: pt.index, time: pt.time, price: pt.price },
            calloutAnchor: committedPointsRef.current[0],
            x,
            y,
            initialText: '',
          });
          setInlineTextValue('');
          committedPointsRef.current = [];
          setDrawingInProgress(null);
          return;
        } else {
          const finalPoints = [...committedPointsRef.current, { index: pt.index, time: pt.time, price: pt.price }];
          const newDrawingId = drawingInProgress!.id;
          onAddDrawing?.({
            ...drawingInProgress!,
            points: finalPoints,
            completed: true,
          });
          onSelectDrawing?.(newDrawingId);
          setQuickBarPos({ x, y });
          committedPointsRef.current = [];
          setDrawingInProgress(null);
          if (!isDrawingModeLocked) onDrawingToolChange?.('NONE');
        }
      } else {
        // Append point and wait for remaining points
        committedPointsRef.current.push({ index: pt.index, time: pt.time, price: pt.price });
        setDrawingInProgress(prev => prev ? ({
          ...prev,
          points: [...committedPointsRef.current],
        }) : null);
      }
    }
  }, [activeDrawingTool, cleanCandles, endIdx, startIdx, cursorMode, drawings, drawingInProgress, getPointFromEvent, indicators, isAllDrawingsHidden, isAllDrawingsLocked, isDrawingModeLocked, onDeleteDrawing, onAddDrawing, onDrawingToolChange, onSelectDrawing, priceOffset, priceScaleRatio, scrollOffset, showVolumePanel, size, visibleCount, inlineTextEditor, handleCommitInlineText]);

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
        if (selectedDrawingId && !isAllDrawingsLocked) {
          const selObj = drawings.find(d => d.id === selectedDrawingId);
          if (!selObj?.locked) {
            onDeleteDrawing?.(selectedDrawingId);
            onSelectDrawing?.(null);
            setQuickBarPos(null);
          }
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
        else if (e.key === 's' || e.key === 'S') { e.preventDefault(); onExportSnapshot?.('download'); }
      } else if (e.key === ' ') {
        e.preventDefault();
        setScrollOffset(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawingTool, drawingInProgress, isDrawingModeLocked, onAddDrawing, onDrawingToolChange, onUndoDrawing, onDeleteDrawing, onSelectDrawing, selectedDrawingId, onExportSnapshot]);

  // Wheel zoom + scroll attached to foreground overlay canvas (rAF-coalesced for 120 FPS trackpads)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.shiftKey) {
      const delta = e.deltaY > 0 ? -4 : 4;
      pendingWheelDeltaRef.current.scroll += delta;
    } else {
      const mult = e.deltaY < 0 ? 1.12 : 0.89;
      pendingWheelDeltaRef.current.zoomMult *= mult;
    }

    if (wheelRafIdRef.current === null) {
      wheelRafIdRef.current = requestAnimationFrame(() => {
        wheelRafIdRef.current = null;
        const { scroll, zoomMult } = pendingWheelDeltaRef.current;
        pendingWheelDeltaRef.current = { scroll: 0, zoomMult: 1 };

        if (scroll !== 0) {
          const maxScroll = Math.max(0, cleanCandles.length - 8);
          const minScroll = -RIGHT_BUFFER_BARS * 2;
          setScrollOffset(s => Math.max(minScroll, Math.min(maxScroll, s + scroll)));
        }
        if (zoomMult !== 1) {
          setZoom(z => Math.max(0.15, Math.min(6.0, +(z * zoomMult).toFixed(2))));
        }
      });
    }
  }, [cleanCandles.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Multi-Touch Pinch-to-Zoom & Long-Press Crosshair ──
  const lastTouchX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
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
          crosshairRef.current = { x: pt.x, y: pt.y };
          requestOverlayRender();
        }
      }, 350);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
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
      const minScroll = -RIGHT_BUFFER_BARS * 2;
      setScrollOffset(s => Math.max(minScroll, Math.min(maxScroll, s + deltaCandleCount)));
      lastTouchX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (crosshairRef.current !== null) {
      crosshairRef.current = null;
      magnetReticleRef.current = null;
      onHoverCandle?.(null);
      requestOverlayRender();
    }
    touchStartDistRef.current = null;
    lastTouchX.current = null;
  };

  const canvasCursor = useMemo(() => {
    if (hoverScaleZone === 'price') return 'cursor-ns-resize';
    if (hoverScaleZone === 'time') return 'cursor-ew-resize';
    if (cursorMode === 'eraser') return 'cursor-not-allowed';
    if (activeDrawingTool && activeDrawingTool !== 'NONE') return 'cursor-crosshair';
    if (isMovingDrawing || isDragging) return 'cursor-grabbing';
    if (isAdjustingDrawing || hoverDrawingZone === 'endpoint') return 'cursor-crosshair';
    if (hoverDrawingZone === 'drawing') return 'cursor-move';
    if (cursorMode === 'pan') return 'cursor-grab';
    if (cursorMode === 'arrow') return 'cursor-default';
    return 'cursor-crosshair';
  }, [activeDrawingTool, cursorMode, hoverDrawingZone, hoverScaleZone, isAdjustingDrawing, isDragging, isMovingDrawing]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden tabular-nums ${className}`}>
      {/* ── Layer 1: Background Canvas (Candles, Indicators, Grids, SMC, Volume Profile) ── */}
      <canvas
        ref={canvasRef}
        className="chart-bg absolute inset-0 block w-full h-full pointer-events-none select-none"
      />

      {/* ── Layer 2: Interactive Event Surface (Drag, Pan, Scale, Drawings, ContextMenu) ── */}
      <div
        className={`chart-event-surface absolute inset-0 block w-full h-full select-none z-10 ${canvasCursor}`}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* ── Layer 3: Floating Chart Controls Dock (Zoom Only: + and -) ── */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-full shadow-md shadow-slate-900/10 px-1.5 py-1 select-none transition-all opacity-80 hover:opacity-100 hover:bg-white dark:hover:bg-slate-900"
        onPointerMove={(e) => handlePointerMove(e as unknown as React.PointerEvent<HTMLElement>)}
      >
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

        <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

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
      </div>

      {/* ── Layer 4: Foreground Overlay Canvas (120 FPS Crosshair, Anchors, Magnet, Events) ── */}
      <canvas
        ref={overlayCanvasRef}
        className="chart-overlay absolute inset-0 block w-full h-full pointer-events-none select-none z-30"
      />

      {Math.abs(scrollOffset) > 5 && (
        <button
          onClick={() => setScrollOffset(0)}
          className="absolute bottom-8 right-20 rounded-full border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 hover:border-emerald-500 transition-all font-mono shadow-md cursor-pointer z-20"
        >
          »» LATEST
        </button>
      )}

      {/* Floating Drawing Quick Actions Bar (hidden when context menu is active) */}
      {selectedDrawing && quickBarPos && !contextMenuPos && (
        <DrawingQuickBar
          drawing={selectedDrawing}
          position={quickBarPos}
          containerWidth={size.w}
          containerHeight={size.h}
          isAllDrawingsLocked={isAllDrawingsLocked}
          onUpdateDrawing={(updated) => onUpdateDrawing?.(updated)}
          onDeleteDrawing={(id) => {
            if (selectedDrawing.locked || isAllDrawingsLocked) return;
            onDeleteDrawing?.(id);
            onSelectDrawing?.(null);
            setQuickBarPos(null);
          }}
          onOpenSettings={() => {
            if (selectedDrawing.locked || isAllDrawingsLocked) return;
            setIsSettingsModalOpen(true);
          }}
          onOpenContextMenu={(pos) => {
            setContextMenuDrawing(selectedDrawing);
            setContextMenuPos(pos);
            setQuickBarPos(null);
          }}
          onClose={() => {
            onSelectDrawing?.(null);
            setQuickBarPos(null);
          }}
        />
      )}

      {/* TradingView Clean Settings Modal (Coordinates / Style / Text / Visibility) */}
      <DrawingSettingsModal
        isOpen={isSettingsModalOpen}
        drawing={selectedDrawing || null}
        candles={cleanCandles}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={(updated) => {
          // Re-sync timestamps with cleanCandles to guarantee 100% exact alignment
          const syncedPoints = updated.points.map(p => {
            let time = p.time;
            if (cleanCandles.length > 0) {
              if (p.index >= 0 && p.index < cleanCandles.length) {
                time = cleanCandles[p.index].openTime;
              } else if (p.index >= cleanCandles.length) {
                const lastBar = cleanCandles[cleanCandles.length - 1];
                const prevBar = cleanCandles[cleanCandles.length - 2];
                const barDuration = (prevBar && lastBar.openTime > prevBar.openTime)
                  ? (lastBar.openTime - prevBar.openTime)
                  : 86_400_000;
                time = lastBar.openTime + (p.index - (cleanCandles.length - 1)) * barDuration;
              } else {
                const firstBar = cleanCandles[0];
                const secondBar = cleanCandles[1];
                const barDuration = (secondBar && secondBar.openTime > firstBar.openTime)
                  ? (secondBar.openTime - firstBar.openTime)
                  : 86_400_000;
                time = firstBar.openTime + p.index * barDuration;
              }
            }
            return { ...p, time };
          });
          onUpdateDrawing?.({ ...updated, points: syncedPoints });
        }}
      />

      {/* TradingView Context Menu */}
      {contextMenuDrawing && contextMenuPos && (
        <DrawingContextMenu
          isOpen={Boolean(contextMenuPos)}
          position={contextMenuPos}
          drawing={contextMenuDrawing}
          isAllDrawingsLocked={isAllDrawingsLocked}
          onClose={() => {
            setContextMenuPos(null);
            setContextMenuDrawing(null);
          }}
          onOpenSettings={() => {
            if (contextMenuDrawing.locked || isAllDrawingsLocked) return;
            setIsSettingsModalOpen(true);
          }}
          onClone={() => {
            handleCloneDrawing(contextMenuDrawing);
          }}
          onToggleLock={() => {
            onUpdateDrawing?.({ ...contextMenuDrawing, locked: !contextMenuDrawing.locked });
          }}
          onToggleHide={() => {
            onUpdateDrawing?.({ ...contextMenuDrawing, hidden: !contextMenuDrawing.hidden });
            onSelectDrawing?.(null);
          }}
          onDelete={() => {
            if (contextMenuDrawing.locked || isAllDrawingsLocked) return;
            onDeleteDrawing?.(contextMenuDrawing.id);
            onSelectDrawing?.(null);
            setQuickBarPos(null);
          }}
          onOpenObjectTree={onOpenObjectTree}
        />
      )}
      {/* ── Layer 5: In-Chart Floating Text Editor (TradingView Parity) ── */}
      {inlineTextEditor && (
        <div
          className="absolute z-40 rounded-xl bg-white dark:bg-[#0C121D] border-2 border-emerald-500 shadow-2xl p-2.5 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100 select-none"
          style={{
            left: `${Math.max(8, Math.min(size.w - CHART_RIGHT_MARGIN - 270, inlineTextEditor.x))}px`,
            top: `${Math.max(8, Math.min(size.h - CHART_BOTTOM_MARGIN - 115, inlineTextEditor.y - 50))}px`,
            width: '260px',
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="font-bold">T</span>
              <span>{inlineTextEditor.tool === 'CALLOUT' ? 'Callout Note' : inlineTextEditor.tool === 'ANCHORED_TEXT' ? 'Anchored Note' : 'Text Annotation'}</span>
            </span>
            <span className="text-[10px] text-slate-400">Esc to cancel</span>
          </div>

          <textarea
            ref={inlineInputRef}
            value={inlineTextValue}
            onChange={(e) => setInlineTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommitInlineText();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelInlineText();
              }
            }}
            placeholder="Type your note inside the chart..."
            rows={2}
            className="w-full resize-none text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2 font-sans focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-950 placeholder-slate-400"
          />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[9.5px] font-mono text-slate-400">
              ↵ Enter to save
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancelInlineText}
                className="px-2 py-1 rounded text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitInlineText}
                className="px-3 py-1 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span>✓</span>
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
