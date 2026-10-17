'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Timeframe, MarketType, INSTRUMENTS } from '@/lib/types';
import type { Candle, ChartType, IndicatorType, IndicatorConfig } from '@/lib/types';
import type { DrawingItem, DrawingToolType } from '@/lib/drawingTypes';
import {
  INDICATOR_DEFAULTS,
  calculateSMA, calculateEMA, calculateRSI, calculateMACD,
  calculateBollingerBands, calculateVWAP, calculateSupertrend,
  calculateATR, calculateStochastic, calculateIchimoku,
  calculateCVD, calculateParabolicSAR, calculateADX,
  calculateOBV, calculateCCI, calculateWilliamsR, calculateMFI,
} from '@/lib/chartRenderer';
import { getMockCandles, getMockQuote } from '@/lib/mockData';
import { fetchCandles, areSymbolsEqual } from '@/lib/tradeEngineClient';
import { useTradeEngine } from '@/lib/tradeEngineContext';
import { loadStoredCandles, saveStoredCandles, mergeCandleArrays } from '@/lib/candleStorage';
import {
  ChartTemplate,
  getStoredTemplates,
  saveTemplate,
  renameTemplate,
  removeTemplate,
  getActiveTemplateId,
  setActiveTemplateId,
} from '@/lib/chartTemplates';
import { ChartToolbar } from './ChartToolbar';
import { CandlestickCanvas } from './CandlestickCanvas';
import { OHLCVHeader } from './OHLCVHeader';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';

interface ChartContainerProps {
  market: MarketType;
  defaultSymbol?: string;
}

const TIMEFRAME_MS: Record<string, number> = {
  '1m': 60_000, '5m': 300_000, '15m': 900_000, '30m': 1_800_000,
  '1H': 3_600_000, '4H': 14_400_000, '1D': 86_400_000, '1W': 604_800_000,
  '1M': 30 * 86_400_000,
};

function getExpectedPrice(market: MarketType, symbol: string): number {
  try {
    const q = getMockQuote(market, symbol);
    if (q && q.price > 0) return q.price;
  } catch {}
  return 1000;
}

function sanitizeCandleScale(candles: Candle[], targetPrice: number): Candle[] {
  if (!candles || candles.length === 0 || targetPrice <= 0) return candles;
  
  // Filter out any corrupted or zero-price candles
  const valid = candles.filter(c => c && c.close > 0 && c.open > 0 && c.high > 0 && c.low > 0);
  if (valid.length === 0) return [];

  // Determine median price to establish baseline scale
  const sortedCloses = [...valid].map(c => c.close).sort((a, b) => a - b);
  const medianPrice = sortedCloses[Math.floor(sortedCloses.length / 2)];

  // Case A: Rebase series if the baseline diverges from target price by > 10%
  const seriesRatio = targetPrice / medianPrice;
  let rebased = valid;
  if (seriesRatio < 0.85 || seriesRatio > 1.18) {
    rebased = valid.map(c => ({
      ...c,
      open: Number((c.open * seriesRatio).toFixed(2)),
      high: Number((c.high * seriesRatio).toFixed(2)),
      low: Number((c.low * seriesRatio).toFixed(2)),
      close: Number((c.close * seriesRatio).toFixed(2)),
    }));
  }

  // Case B: Filter out individual rogue outlier candles and repair Frankenstein spikes
  // Acceptable price corridor: ±25% of target price
  const minAcceptable = targetPrice * 0.75;
  const maxAcceptable = targetPrice * 1.30;

  const filtered = rebased.filter(c => {
    // Both open and close must be within realistic boundary
    if (c.open < minAcceptable || c.open > maxAcceptable) return false;
    if (c.close < minAcceptable || c.close > maxAcceptable) return false;
    // Discard any candle whose low or high is wildly detached
    if (c.low < minAcceptable * 0.85 || c.high > maxAcceptable * 1.15) return false;
    return true;
  });

  // Self-heal Frankenstein spikes: if (high - low) / low exceeds 12%, clamp wicks to candle body ± 2%
  return filtered.map(c => {
    const spread = (c.high - c.low) / Math.max(1, c.low);
    if (spread > 0.12) {
      const top = Math.max(c.open, c.close);
      const bottom = Math.min(c.open, c.close);
      const maxWick = top * 0.02;
      return {
        ...c,
        high: Number((top + maxWick).toFixed(2)),
        low: Number(Math.max(1, bottom - maxWick).toFixed(2)),
      };
    }
    return c;
  });
}

export function ChartContainer({ market, defaultSymbol }: ChartContainerProps) {
  const instruments = INSTRUMENTS[market];
  const [selectedSymbol, setSelectedSymbol] = useState(
    defaultSymbol ?? instruments[0].symbol
  );
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [chartType, setChartType] = useState<ChartType>('CANDLESTICK');
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>('NONE');
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);

  // Default clean view: Volume on, but all indicators and overlays off initially
  const [showVolume, setShowVolume] = useState(true);
  const [showVolumePanel, setShowVolumePanel] = useState(false);
  const [showSmcOverlay, setShowSmcOverlay] = useState(false);
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>([]);
  const [customConfigs, setCustomConfigs] = useState<Partial<Record<IndicatorType, Partial<IndicatorConfig>>>>({});
  const [editingIndicator, setEditingIndicator] = useState<IndicatorType | null>(null);

  // Template System: 5 renameable slots with persistent storage
  const [templates, setTemplates] = useState<ChartTemplate[]>(() => getStoredTemplates());
  const [activeTemplateId, setActiveTemplateIdState] = useState<string>(() => getActiveTemplateId());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mi007_indicator_configs');
      if (saved) setCustomConfigs(JSON.parse(saved));
    } catch {}
  }, []);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>();
  const [isLoadingCandles, setIsLoadingCandles] = useState(true);
  const [isLiveFromEngine, setIsLiveFromEngine] = useState(false);

  const { status, getSymbolPrice, subscribeToTicks } = useTradeEngine();

  // Sync with defaultSymbol whenever URL/prop changes
  useEffect(() => {
    if (defaultSymbol) {
      setSelectedSymbol(defaultSymbol);
    }
  }, [defaultSymbol]);

  // Only reset symbol when the market truly changes (NOT on initial mount)
  const isFirstMount = useRef(true);
  const prevMarketRef = useRef(market);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (prevMarketRef.current !== market) {
      prevMarketRef.current = market;
      setSelectedSymbol(INSTRUMENTS[market][0].symbol);
    }
  }, [market]);

  const isCryptoSymbol = ['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX'].includes(selectedSymbol.toUpperCase());
  const currency = isCryptoSymbol ? '$' : (instruments[0]?.currency ?? '₹');

  // Load candles from cache first, then reconcile with Trade Engine
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingCandles(true);

    async function loadCandles() {
      const live = getSymbolPrice(selectedSymbol);
      const expectedPrice = (live && live.price > 0) ? live.price : getExpectedPrice(market, selectedSymbol);

      const tfMs = TIMEFRAME_MS[timeframe] || TIMEFRAME_MS['1H'];

      // 1. Instant load from IndexedDB cache with scale sanitization & bucket deduplication
      const rawCached = await loadStoredCandles(selectedSymbol, timeframe);
      const sanitizedRawCached = sanitizeCandleScale(rawCached || [], expectedPrice);
      const cached = mergeCandleArrays([], sanitizedRawCached, tfMs);

      if (!isCancelled && cached && cached.length > 0) {
        setCandles(cached);
        const lastC = cached[cached.length - 1];
        setCurrentPrice(lastC?.close);
        setIsLoadingCandles(false);
      }

      // 2. Fetch latest candles from Trade Engine API with scale sanitization
      const rawEngine = await fetchCandles(selectedSymbol, timeframe);
      const sanitizedRawEngine = sanitizeCandleScale(rawEngine || [], expectedPrice);
      const engineCandles = mergeCandleArrays([], sanitizedRawEngine, tfMs);

      if (!isCancelled) {
        if (engineCandles && engineCandles.length > 5) {
          const merged = mergeCandleArrays(cached || [], engineCandles, tfMs);
          const sanitizedMerged = sanitizeCandleScale(merged, expectedPrice);
          setCandles(prev => {
            if (prev && prev.length > 0) {
              const prevLast = prev[prev.length - 1];
              const mergedLast = sanitizedMerged[sanitizedMerged.length - 1];
              // If prev has an active live candle for the same bucket, preserve the live close/high/low only if on matching scale
              if (prevLast && mergedLast && prevLast.openTime === mergedLast.openTime && prevLast.close > 0) {
                const ratio = prevLast.close / mergedLast.close;
                if (ratio >= 0.85 && ratio <= 1.18) {
                  const liveClose = prevLast.close;
                  const preservedMerged = [...sanitizedMerged];
                  preservedMerged[preservedMerged.length - 1] = {
                    ...mergedLast,
                    close: liveClose,
                    high: Math.min(Math.max(mergedLast.high, liveClose), Number((liveClose * 1.05).toFixed(2))),
                    low: Math.max(Math.min(mergedLast.low, liveClose), Number((liveClose * 0.95).toFixed(2))),
                  };
                  return preservedMerged;
                }
              }
            }
            return sanitizedMerged;
          });
          const lastC = sanitizedMerged[sanitizedMerged.length - 1];
          setCurrentPrice(prev => (prev && prev > 0 ? prev : lastC?.close));
          setIsLiveFromEngine(true);
          // Persist sanitized dataset to IndexedDB
          saveStoredCandles(selectedSymbol, timeframe, sanitizedMerged);
        } else if (!cached || cached.length === 0) {
          // Fallback to high-quality generator if offline or empty
          const fallback = getMockCandles(market, selectedSymbol, timeframe, 300);
          const sanitizedFallback = sanitizeCandleScale(fallback, expectedPrice);
          const cleanFallback = mergeCandleArrays([], sanitizedFallback, tfMs);
          setCandles(cleanFallback);
          setCurrentPrice(cleanFallback[cleanFallback.length - 1]?.close);
          setIsLiveFromEngine(false);
          saveStoredCandles(selectedSymbol, timeframe, cleanFallback);
        }
        setIsLoadingCandles(false);
      }
    }

    loadCandles();

    return () => {
      isCancelled = true;
    };
  }, [market, selectedSymbol, timeframe]);

  // Track last save timestamp to throttle IndexedDB writes during active ticks
  const lastSaveTimeRef = useRef<number>(0);

  // Sync current price immediately from Trade Engine if available
  useEffect(() => {
    const live = getSymbolPrice(selectedSymbol);
    if (live && live.price > 0) {
      setCurrentPrice(live.price);
      setIsLiveFromEngine(true);
    }
  }, [selectedSymbol, getSymbolPrice]);

  // Listen to live WebSocket ticks from the Trade Engine with clock-aligned candle formation
  useEffect(() => {
    const unsub = subscribeToTicks((tick) => {
      if (areSymbolsEqual(tick.symbol, selectedSymbol)) {
        setIsLiveFromEngine(true);
        setCurrentPrice(tick.price);

        setCandles(prev => {
          if (prev.length === 0) return prev;
          const tfMs = TIMEFRAME_MS[timeframe] || TIMEFRAME_MS['1H'];
          const now = tick.timestamp || Date.now();
          // True interval binning: calculate the bucket openTime for the current time
          const currentBucketOpenTime = Math.floor(now / tfMs) * tfMs;
          const lastCandle = prev[prev.length - 1];

          // Scale guard: if existing candles are dislocated from live tick price
          let baseCandles = prev;
          if (lastCandle && lastCandle.close > 0 && tick.price > 0) {
            const ratio = tick.price / lastCandle.close;
            if (ratio < 0.85 || ratio > 1.18) {
              baseCandles = prev.map(c => ({
                ...c,
                open: Number((c.open * ratio).toFixed(2)),
                high: Number((c.high * ratio).toFixed(2)),
                low: Number((c.low * ratio).toFixed(2)),
                close: Number((c.close * ratio).toFixed(2)),
              }));
            }
          }

          const currentLast = baseCandles[baseCandles.length - 1];
          let next: Candle[];

          // Case 1: Tick falls into currently active bucket
          if (currentLast.openTime === currentBucketOpenTime) {
            const rawLow = currentLast.low;
            const safeLow = (rawLow <= 0 || rawLow < tick.price * 0.85 || rawLow > tick.price * 1.18)
              ? tick.price
              : Math.max(Math.min(rawLow, tick.price), Number((tick.price * 0.95).toFixed(2)));
            const rawHigh = currentLast.high;
            const safeHigh = (rawHigh <= 0 || rawHigh < tick.price * 0.85 || rawHigh > tick.price * 1.18)
              ? tick.price
              : Math.min(Math.max(rawHigh, tick.price), Number((tick.price * 1.05).toFixed(2)));
            const rawOpen = currentLast.open;
            const safeOpen = (rawOpen <= 0 || rawOpen < tick.price * 0.85 || rawOpen > tick.price * 1.18) ? tick.price : rawOpen;
            const updated: Candle = {
              ...currentLast,
              open: safeOpen,
              close: tick.price,
              high: safeHigh,
              low: safeLow,
              volume: currentLast.volume + (tick.volume > 0 ? tick.volume : 1),
            };
            next = [...baseCandles];
            next[next.length - 1] = updated;
          } else if (currentBucketOpenTime > currentLast.openTime) {
            // Case 2: New time bucket started — start ONE single new candle stamped at currentBucketOpenTime
            const safeOpen = (currentLast.close <= 0 || currentLast.close < tick.price * 0.85 || currentLast.close > tick.price * 1.18) ? tick.price : currentLast.close;
            const newBar: Candle = {
              openTime: currentBucketOpenTime,
              open: safeOpen,
              high: Math.min(Math.max(safeOpen, tick.price), Number((tick.price * 1.05).toFixed(2))),
              low: Math.max(Math.min(safeOpen, tick.price), Number((tick.price * 0.95).toFixed(2))),
              close: tick.price,
              volume: tick.volume > 0 ? tick.volume : 1,
            };
            next = [...baseCandles.slice(-999), newBar];
          } else {
            // Case 3: Prior/matching sub-bucket update
            const rawLow = currentLast.low;
            const safeLow = (rawLow <= 0 || rawLow < tick.price * 0.85 || rawLow > tick.price * 1.18) ? tick.price : Math.min(rawLow, tick.price);
            const rawHigh = currentLast.high;
            const safeHigh = (rawHigh <= 0 || rawHigh < tick.price * 0.85 || rawHigh > tick.price * 1.18) ? tick.price : Math.max(rawHigh, tick.price);
            const updated: Candle = {
              ...currentLast,
              close: tick.price,
              high: safeHigh,
              low: safeLow,
            };
            next = [...baseCandles];
            next[next.length - 1] = updated;
          }

          // Throttle save to storage every 4 seconds or on new candle
          const nowTime = Date.now();
          if (nowTime - lastSaveTimeRef.current > 4000) {
            lastSaveTimeRef.current = nowTime;
            saveStoredCandles(selectedSymbol, timeframe, next);
          }

          return next;
        });
      }
    });

    return () => unsub();
  }, [selectedSymbol, timeframe, subscribeToTicks]);


  // Build IndicatorConfig array from active indicator types + user customizations
  const indicatorConfigs: IndicatorConfig[] = useMemo(() => {
    return activeIndicators.map(t => {
      const d = INDICATOR_DEFAULTS[t];
      const custom = customConfigs[t];
      return {
        type: t,
        period: custom?.period ?? d.period,
        secondaryPeriod: custom?.secondaryPeriod ?? d.secondaryPeriod,
        tertiaryPeriod: custom?.tertiaryPeriod ?? d.tertiaryPeriod,
        color: custom?.color ?? d.color,
        secondaryColor: custom?.secondaryColor ?? d.secondaryColor,
        tertiaryColor: custom?.tertiaryColor ?? d.tertiaryColor,
        enabled: true,
        multiplier: custom?.multiplier ?? d.multiplier,
      };
    });
  }, [activeIndicators, customConfigs]);

  // Currently editing indicator config
  const currentEditingConfig: IndicatorConfig | null = useMemo(() => {
    if (!editingIndicator) return null;
    const existing = indicatorConfigs.find(c => c.type === editingIndicator);
    if (existing) return existing;
    const d = INDICATOR_DEFAULTS[editingIndicator];
    const custom = customConfigs[editingIndicator];
    return {
      type: editingIndicator,
      period: custom?.period ?? d.period,
      secondaryPeriod: custom?.secondaryPeriod ?? d.secondaryPeriod,
      tertiaryPeriod: custom?.tertiaryPeriod ?? d.tertiaryPeriod,
      color: custom?.color ?? d.color,
      secondaryColor: custom?.secondaryColor ?? d.secondaryColor,
      tertiaryColor: custom?.tertiaryColor ?? d.tertiaryColor,
      enabled: true,
      multiplier: custom?.multiplier ?? d.multiplier,
    };
  }, [editingIndicator, indicatorConfigs, customConfigs]);

  // Compute indicator results
  const indicatorResults = useMemo(() => {
    const map = new Map<IndicatorType, unknown>();
    for (const cfg of indicatorConfigs) {
      switch (cfg.type) {
        case 'SMA': map.set('SMA', calculateSMA(candles, cfg.period)); break;
        case 'EMA': map.set('EMA', calculateEMA(candles, cfg.period)); break;
        case 'RSI': map.set('RSI', calculateRSI(candles, cfg.period)); break;
        case 'MACD': map.set('MACD', calculateMACD(candles, cfg.period, cfg.secondaryPeriod, cfg.tertiaryPeriod)); break;
        case 'BOLLINGER_BANDS': map.set('BOLLINGER_BANDS', calculateBollingerBands(candles, cfg.period, cfg.multiplier)); break;
        case 'VWAP': map.set('VWAP', calculateVWAP(candles)); break;
        case 'SUPERTREND': map.set('SUPERTREND', calculateSupertrend(candles, cfg.period, cfg.multiplier)); break;
        case 'ICHIMOKU': map.set('ICHIMOKU', calculateIchimoku(candles, cfg.period, cfg.secondaryPeriod, cfg.tertiaryPeriod)); break;
        case 'ATR': map.set('ATR', calculateATR(candles, cfg.period)); break;
        case 'STOCHASTIC': map.set('STOCHASTIC', calculateStochastic(candles, cfg.period, cfg.secondaryPeriod)); break;
        case 'CVD': map.set('CVD', calculateCVD(candles)); break;
        case 'PARABOLIC_SAR': map.set('PARABOLIC_SAR', calculateParabolicSAR(candles)); break;
        case 'ADX': map.set('ADX', calculateADX(candles, cfg.period)); break;
        case 'OBV': map.set('OBV', calculateOBV(candles)); break;
        case 'CCI': map.set('CCI', calculateCCI(candles, cfg.period)); break;
        case 'WILLIAMS_R': map.set('WILLIAMS_R', calculateWilliamsR(candles, cfg.period)); break;
        case 'MFI': map.set('MFI', calculateMFI(candles, cfg.period)); break;
      }
    }
    return map;
  }, [candles, indicatorConfigs]);

  const toggleIndicator = useCallback((type: IndicatorType) => {
    setActiveIndicators(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const handleSaveIndicatorConfig = useCallback((updated: IndicatorConfig) => {
    setCustomConfigs(prev => {
      const next = { ...prev, [updated.type]: updated };
      try {
        localStorage.setItem('mi007_indicator_configs', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Load drawings from localStorage per symbol
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mi007_drawings_${selectedSymbol}`);
      if (saved) {
        setDrawings(JSON.parse(saved));
      } else {
        setDrawings([]);
      }
    } catch {
      setDrawings([]);
    }
  }, [selectedSymbol]);

  const handleAddDrawing = useCallback((item: DrawingItem) => {
    setDrawings(prev => {
      const next = [...prev, item];
      try {
        localStorage.setItem(`mi007_drawings_${selectedSymbol}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    // Auto-revert back to Cursor / Pan & Crosshair mode
    setActiveDrawingTool('NONE');
  }, [selectedSymbol]);

  const handleUpdateDrawing = useCallback((item: DrawingItem) => {
    setDrawings(prev => {
      const next = prev.map(d => d.id === item.id ? item : d);
      try {
        localStorage.setItem(`mi007_drawings_${selectedSymbol}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [selectedSymbol]);

  const handleClearDrawings = useCallback(() => {
    setDrawings([]);
    try {
      localStorage.removeItem(`mi007_drawings_${selectedSymbol}`);
    } catch {}
  }, [selectedSymbol]);

  const handleUndoDrawing = useCallback(() => {
    setDrawings(prev => {
      const next = prev.slice(0, -1);
      try {
        localStorage.setItem(`mi007_drawings_${selectedSymbol}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [selectedSymbol]);

  // Chart Template Action Handlers
  const handleSelectTemplate = useCallback((tpl: ChartTemplate) => {
    setActiveTemplateIdState(tpl.id);
    setActiveTemplateId(tpl.id);
    setTimeframe(tpl.timeframe);
    setChartType(tpl.chartType);
    setActiveIndicators(tpl.activeIndicators);
    setShowSmcOverlay(tpl.showSmcOverlay);
    setShowVolumeProfile(tpl.showVolumeProfile);
    setShowVolume(tpl.showVolume);
  }, []);

  const handleSaveToTemplate = useCallback((slotId: string) => {
    const existing = templates.find(t => t.id === slotId);
    const slotNum = existing?.slotNumber || parseInt(slotId.replace('tpl_', ''), 10) || 1;
    const updated: ChartTemplate = {
      id: slotId,
      slotNumber: slotNum,
      name: existing?.name || `Template ${slotNum}`,
      timeframe,
      chartType,
      activeIndicators,
      showSmcOverlay,
      showVolumeProfile,
      showVolume,
      updatedAt: Date.now(),
    };
    const savedList = saveTemplate(updated);
    setTemplates(savedList);
    setActiveTemplateIdState(slotId);
    setActiveTemplateId(slotId);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [timeframe, chartType, activeIndicators, showSmcOverlay, showVolumeProfile, showVolume, templates]);

  const handleSaveChartLayout = useCallback(() => {
    const slotId = activeTemplateId || 'tpl_1';
    handleSaveToTemplate(slotId);
  }, [activeTemplateId, handleSaveToTemplate]);

  const handleRenameTemplate = useCallback((slotId: string, newName: string) => {
    const updatedList = renameTemplate(slotId, newName);
    setTemplates(updatedList);
  }, []);

  const handleRemoveTemplate = useCallback((slotId: string) => {
    const updatedList = removeTemplate(slotId);
    setTemplates(updatedList);
  }, []);

  const handleClearAllIndicators = useCallback(() => {
    setActiveIndicators([]);
    setShowSmcOverlay(false);
    setShowVolumeProfile(false);
  }, []);

  const lastCandle = candles[candles.length - 1] ?? null;
  const quote = useMemo(() => getMockQuote(market, selectedSymbol), [market, selectedSymbol]);

  // Live snapshot details from context
  const livePriceData = getSymbolPrice(selectedSymbol);
  const displayPrice = currentPrice ?? livePriceData?.price ?? lastCandle?.close ?? 0;
  const displayChange = livePriceData?.change ?? quote.change;
  const displayChangePct = livePriceData?.changePct ?? quote.changePct;



  return (
    <div className="flex flex-col h-full rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs relative">
      {/* ── Top Dropdown Toolbar ── */}
      <ChartToolbar
        timeframe={timeframe}
        chartType={chartType}
        activeDrawingTool={activeDrawingTool}
        showVolume={showVolume}
        showVolumePanel={showVolumePanel}
        showSmcOverlay={showSmcOverlay}
        showVolumeProfile={showVolumeProfile}
        activeIndicators={activeIndicators}
        engineStatus={status}
        isLiveFromEngine={isLiveFromEngine}
        currency={currency}
        displayPrice={displayPrice}
        displayChange={displayChange}
        displayChangePct={displayChangePct}
        templates={templates}
        activeTemplateId={activeTemplateId}
        saveStatus={saveStatus}
        onTimeframeChange={setTimeframe}
        onChartTypeChange={setChartType}
        onDrawingToolChange={setActiveDrawingTool}
        onClearDrawings={handleClearDrawings}
        onUndoDrawing={handleUndoDrawing}
        onToggleVolume={() => setShowVolume(v => !v)}
        onToggleVolumePanel={() => setShowVolumePanel(v => !v)}
        onToggleSmcOverlay={() => setShowSmcOverlay(v => !v)}
        onToggleVolumeProfile={() => setShowVolumeProfile(v => !v)}
        onToggleIndicator={toggleIndicator}
        onOpenIndicatorSettings={t => setEditingIndicator(t)}
        onSelectTemplate={handleSelectTemplate}
        onSaveToTemplate={handleSaveToTemplate}
        onRenameTemplate={handleRenameTemplate}
        onRemoveTemplate={handleRemoveTemplate}
        onSaveChartLayout={handleSaveChartLayout}
        onClearAllIndicators={handleClearAllIndicators}
      />

      {/* ── OHLCV Bar with Symbol context ── */}
      <OHLCVHeader
        symbol={selectedSymbol}
        candle={lastCandle}
        currency={currency}
        timeframe={timeframe}
        currentPrice={displayPrice}
      />

      {/* ── Chart Canvas with Overlay Badges ── */}
      <div className="flex-1 min-h-0 relative bg-white">
        {/* Top-Left Active Indicator Legend overlay */}
        {indicatorConfigs.length > 0 && (
          <div className="absolute top-2 left-3 z-10 flex flex-wrap items-center gap-1.5 pointer-events-auto">
            {indicatorConfigs.map(cfg => (
              <div
                key={cfg.type}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/95 border border-slate-200 shadow-xs text-[11px] font-mono text-slate-700 backdrop-blur-xs group hover:border-slate-300 transition-colors"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                <span className="font-bold">
                  {INDICATOR_DEFAULTS[cfg.type].label} ({cfg.period})
                </span>
                <button
                  onClick={() => setEditingIndicator(cfg.type)}
                  title="Settings"
                  className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
                <button
                  onClick={() => toggleIndicator(cfg.type)}
                  title="Remove"
                  className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors font-bold text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {isLoadingCandles && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[12px] mono font-bold shadow-md">
              <span className="w-3 h-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <span>STREAMING FROM TRADE ENGINE...</span>
            </div>
          </div>
        )}

        <CandlestickCanvas
          candles={candles}
          chartType={chartType}
          showVolume={showVolume}
          showVolumePanel={showVolumePanel}
          showSmcOverlay={showSmcOverlay}
          showVolumeProfile={showVolumeProfile}
          showFnoOverlay={false}
          fnoLevels={undefined}
          strategyOverlay={undefined}
          indicators={indicatorConfigs}
          indicatorResults={indicatorResults}
          currentPriceOverride={displayPrice}
          timeframe={timeframe}
          activeDrawingTool={activeDrawingTool}
          drawings={drawings}
          onAddDrawing={handleAddDrawing}
          onUpdateDrawing={handleUpdateDrawing}
          onUndoDrawing={handleUndoDrawing}
          onDrawingToolChange={setActiveDrawingTool}
          className="h-full"
        />
      </div>

      {/* ── Indicator Settings Modal ── */}
      {currentEditingConfig && (
        <IndicatorSettingsModal
          key={currentEditingConfig.type}
          indicator={currentEditingConfig}
          isOpen={!!editingIndicator}
          onClose={() => setEditingIndicator(null)}
          onSave={handleSaveIndicatorConfig}
        />
      )}
    </div>
  );
}
