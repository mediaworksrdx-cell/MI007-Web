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
  calculateEmaRibbon, calculatePivotPoints, calculateDonchian, calculateHMA, calculateCMF,
} from '@/lib/chartRenderer';
import { getMockCandles, getMockQuote } from '@/lib/mockData';
import { fetchCandles, areSymbolsEqual } from '@/lib/tradeEngineClient';
import { useTradeEngine } from '@/lib/tradeEngineContext';
import { loadStoredCandles, saveStoredCandles, mergeCandleArrays, purgeStoredCandles } from '@/lib/candleStorage';
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
import { DrawingToolbar } from './DrawingToolbar';
import { DrawingsManagerModal } from './DrawingsManagerModal';
import { IndicatorsModal } from './IndicatorsModal';
import { ChartHotkeysModal } from './ChartHotkeysModal';

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

  // Case A: Rebase series if the baseline diverges from target price by > 4%
  const seriesRatio = targetPrice / medianPrice;
  let rebased = valid;
  if (seriesRatio < 0.96 || seriesRatio > 1.04) {
    rebased = valid.map(c => ({
      ...c,
      open: Number((c.open * seriesRatio).toFixed(2)),
      high: Number((c.high * seriesRatio).toFixed(2)),
      low: Number((c.low * seriesRatio).toFixed(2)),
      close: Number((c.close * seriesRatio).toFixed(2)),
    }));
  }

  // Case B: Filter out individual rogue outlier candles and repair Frankenstein spikes
  // Acceptable price corridor: ±15% of target price
  const minAcceptable = targetPrice * 0.85;
  const maxAcceptable = targetPrice * 1.15;

  const filtered = rebased.filter(c => {
    // Both open and close must be within realistic boundary
    if (c.open < minAcceptable || c.open > maxAcceptable) return false;
    if (c.close < minAcceptable || c.close > maxAcceptable) return false;
    return true;
  });

  // Self-heal Frankenstein spikes & wide bars: clamp bar range to 3.5% and wicks to 1.5%
  return filtered.map(c => {
    const top = Math.max(c.open, c.close);
    const bottom = Math.min(c.open, c.close);
    const maxBarRange = top * 0.035;
    const safeOpen = Math.abs(c.open - c.close) > maxBarRange
      ? (c.open > c.close ? Number((c.close + maxBarRange).toFixed(2)) : Number((c.close - maxBarRange).toFixed(2)))
      : c.open;
    const bodyTop = Math.max(safeOpen, c.close);
    const bodyBot = Math.min(safeOpen, c.close);
    const safeHigh = Math.min(Math.max(c.high, bodyTop), Number((bodyTop + bodyTop * 0.015).toFixed(2)));
    const safeLow = Math.max(Math.min(c.low, bodyBot), Number(Math.max(1, bodyBot - bodyBot * 0.015).toFixed(2)));
    return {
      ...c,
      open: safeOpen,
      close: c.close,
      high: safeHigh,
      low: safeLow,
    };
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
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [isDrawingsManagerOpen, setIsDrawingsManagerOpen] = useState(false);
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState(false);
  const [isMagnetActive, setIsMagnetActive] = useState(false);
  const [isHotkeysModalOpen, setIsHotkeysModalOpen] = useState(false);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

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

      // 1. Instant load from IndexedDB cache with auto-purge of corrupted scale data
      let rawCached = await loadStoredCandles(selectedSymbol, timeframe);
      if (rawCached && rawCached.length > 0) {
        const sortedCloses = rawCached.filter(c => c && c.close > 0).map(c => c.close).sort((a, b) => a - b);
        const cachedMed = sortedCloses[Math.floor(sortedCloses.length / 2)] || 0;
        const hasSpike = rawCached.some(c => (c.high - c.low) / Math.max(1, c.low) > 0.08);
        const isScaleDislocated = cachedMed > 0 && (Math.abs(cachedMed - expectedPrice) / expectedPrice > 0.12);
        if (hasSpike || isScaleDislocated) {
          console.warn(`[ChartContainer] Auto-purging corrupted cache for ${selectedSymbol} (cachedMed: ${cachedMed}, expected: ${expectedPrice})`);
          await purgeStoredCandles(selectedSymbol, timeframe);
          rawCached = null;
        }
      }

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
                if (ratio >= 0.95 && ratio <= 1.05) {
                  const liveClose = prevLast.close;
                  const preservedMerged = [...sanitizedMerged];
                  preservedMerged[preservedMerged.length - 1] = {
                    ...mergedLast,
                    close: liveClose,
                    high: Math.min(Math.max(mergedLast.high, liveClose), Number((liveClose * 1.02).toFixed(2))),
                    low: Math.max(Math.min(mergedLast.low, liveClose), Number((liveClose * 0.98).toFixed(2))),
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
            if (ratio < 0.95 || ratio > 1.05) {
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
            const rawOpen = currentLast.open;
            const safeOpen = (rawOpen <= 0 || Math.abs(rawOpen - tick.price) / tick.price > 0.025)
              ? tick.price
              : rawOpen;
            const top = Math.max(safeOpen, tick.price);
            const bot = Math.min(safeOpen, tick.price);
            const rawHigh = currentLast.high;
            const safeHigh = Math.min(Math.max(rawHigh, top), Number((top * 1.01).toFixed(2)));
            const rawLow = currentLast.low;
            const safeLow = Math.max(Math.min(rawLow, bot), Number((bot * 0.99).toFixed(2)));
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
            const safeOpen = (currentLast.close <= 0 || Math.abs(currentLast.close - tick.price) / tick.price > 0.025)
              ? tick.price
              : currentLast.close;
            const top = Math.max(safeOpen, tick.price);
            const bot = Math.min(safeOpen, tick.price);
            const newBar: Candle = {
              openTime: currentBucketOpenTime,
              open: safeOpen,
              high: Number((top * 1.005).toFixed(2)),
              low: Number((bot * 0.995).toFixed(2)),
              close: tick.price,
              volume: tick.volume > 0 ? tick.volume : 1,
            };
            next = [...baseCandles.slice(-999), newBar];
          } else {
            // Case 3: Prior/matching sub-bucket update
            const top = Math.max(currentLast.open, tick.price);
            const bot = Math.min(currentLast.open, tick.price);
            const safeHigh = Math.min(Math.max(currentLast.high, top), Number((top * 1.01).toFixed(2)));
            const safeLow = Math.max(Math.min(currentLast.low, bot), Number((bot * 0.99).toFixed(2)));
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
        case 'EMA_RIBBON': map.set('EMA_RIBBON', calculateEmaRibbon(candles)); break;
        case 'PIVOT_POINTS': map.set('PIVOT_POINTS', calculatePivotPoints(candles)); break;
        case 'DONCHIAN': map.set('DONCHIAN', calculateDonchian(candles, cfg.period)); break;
        case 'HMA': map.set('HMA', calculateHMA(candles, cfg.period)); break;
        case 'CMF': map.set('CMF', calculateCMF(candles, cfg.period)); break;
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
    setSelectedDrawingId(null);
    try {
      localStorage.removeItem(`mi007_drawings_${selectedSymbol}`);
    } catch {}
  }, [selectedSymbol]);

  const handleDeleteDrawing = useCallback((id: string) => {
    setDrawings(prev => {
      const next = prev.filter(d => d.id !== id);
      try {
        localStorage.setItem(`mi007_drawings_${selectedSymbol}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    setSelectedDrawingId(curr => curr === id ? null : curr);
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
  const rawDisplayPrice = currentPrice ?? livePriceData?.price ?? lastCandle?.close ?? 0;
  const expectedBenchmarkPrice = useMemo(() => {
    const live = getSymbolPrice(selectedSymbol);
    return (live && live.price > 0) ? live.price : getExpectedPrice(market, selectedSymbol);
  }, [market, selectedSymbol, getSymbolPrice]);
  const safeDisplayPrice = (rawDisplayPrice > 0 && Math.abs(rawDisplayPrice - expectedBenchmarkPrice) / expectedBenchmarkPrice <= 0.15)
    ? rawDisplayPrice
    : expectedBenchmarkPrice;
  const displayPrice = safeDisplayPrice;
  const displayChange = livePriceData?.change ?? quote.change;
  const displayChangePct = livePriceData?.changePct ?? quote.changePct;



  const handleExportSnapshot = useCallback((mode: 'download' | 'clipboard' = 'download') => {
    if (!chartWrapperRef.current) return;
    const canvases = chartWrapperRef.current.querySelectorAll('canvas');
    if (canvases.length < 2) return;

    const bgCanvas = canvases[0];
    const fgCanvas = canvases[1];

    const srcW = bgCanvas.width;
    const srcH = bgCanvas.height;
    if (!srcW || !srcH) return;

    // Scaling proportional to canvas pixel density
    const dpr = Math.max(1, Math.round(srcW / (chartWrapperRef.current.clientWidth || 1)));
    const outerPad = Math.round(20 * dpr);
    const headerH = Math.round(68 * dpr);
    const footerH = Math.round(36 * dpr);

    const totalW = srcW + outerPad * 2;
    const totalH = srcH + headerH + footerH + outerPad * 2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = totalW;
    exportCanvas.height = totalH;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // 1. Institutional Card Background (Executive Obsidian Slate #0B0F19)
    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(0, 0, totalW, totalH);

    // Card Outer Border
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeRect(outerPad / 2, outerPad / 2, totalW - outerPad, totalH - outerPad);

    // 2. Executive Header
    const hX = outerPad;
    const hY = outerPad;

    // Glowing Live Accent Dot + Brand Title
    ctx.beginPath();
    ctx.arc(hX + 6 * dpr, hY + 14 * dpr, 3.5 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#10B981';
    ctx.fill();

    ctx.font = `bold ${Math.round(11 * dpr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#10B981';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MARKET INTELLIGENCE AI', hX + 16 * dpr, hY + 14 * dpr);

    // Symbol Name
    ctx.font = `900 ${Math.round(22 * dpr)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(selectedSymbol, hX, hY + 44 * dpr);
    const symWidth = ctx.measureText(selectedSymbol).width;

    // Timeframe Badge
    const tfX = hX + symWidth + 12 * dpr;
    const tfY = hY + 33 * dpr;
    const tfW = 40 * dpr;
    const tfH = 20 * dpr;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fillRect(tfX, tfY, tfW, tfH);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(tfX, tfY, tfW, tfH);
    ctx.font = `bold ${Math.round(11 * dpr)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#34D399';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeframe, tfX + tfW / 2, tfY + tfH / 2);

    // Market Badge
    const mktX = tfX + tfW + 8 * dpr;
    const mktW = 64 * dpr;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.fillRect(mktX, tfY, mktW, tfH);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.strokeRect(mktX, tfY, mktW, tfH);
    ctx.font = `bold ${Math.round(10 * dpr)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#60A5FA';
    ctx.fillText(market.toUpperCase(), mktX + mktW / 2, tfY + tfH / 2);

    // Header Right: Price + Delta %
    const rightX = totalW - outerPad;
    if (displayPrice !== undefined && displayPrice > 0) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(22 * dpr)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#F8FAFC';
      const priceStr = `${currency}${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      ctx.fillText(priceStr, rightX, hY + 44 * dpr);

      if (displayChangePct !== undefined) {
        const isUp = (displayChangePct >= 0);
        const chgColor = isUp ? '#10B981' : '#F43F5E';
        ctx.font = `bold ${Math.round(12 * dpr)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = chgColor;
        const chgStr = `${isUp ? '+' : ''}${displayChangePct.toFixed(2)}% ${isUp ? '▲' : '▼'}`;
        ctx.fillText(chgStr, rightX, hY + 14 * dpr);
      }
    }

    // 3. Main Chart Canvas Area (Framed within card with zero cutoffs)
    const chartCanvasY = hY + headerH;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(outerPad, chartCanvasY, srcW, srcH);

    // Draw background layer (candles, indicators, grids, VPVR, SMC)
    ctx.drawImage(bgCanvas, outerPad, chartCanvasY, srcW, srcH);

    // Draw foreground layer (drawings, annotations)
    ctx.drawImage(fgCanvas, outerPad, chartCanvasY, srcW, srcH);

    // Crisp card inner border around chart
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(outerPad, chartCanvasY, srcW, srcH);

    // 4. Executive Footer Bar
    const fY = chartCanvasY + srcH + 12 * dpr;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(10.5 * dpr)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillStyle = '#94A3B8';
    const activeIndNames = indicatorConfigs.map(c => `${INDICATOR_DEFAULTS[c.type].label}(${c.period})`);
    if (showSmcOverlay) activeIndNames.push('SMC Pro');
    if (showVolumeProfile) activeIndNames.push('VPVR');
    const indString = activeIndNames.length > 0 ? `Active: ${activeIndNames.join(' · ')}` : 'Clean Technical View';
    ctx.fillText(indString, outerPad, fY + 10 * dpr);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748B';
    const timestampStr = `${new Date().toUTCString()} · Institutional Engine`;
    ctx.fillText(timestampStr, rightX, fY + 10 * dpr);

    // Output Image File or Blob
    if (mode === 'download') {
      const dataUrl = exportCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${selectedSymbol}_${timeframe}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (mode === 'clipboard') {
      exportCanvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          } catch (e) {
            console.warn('Clipboard write failed, downloading instead:', e);
            const dataUrl = exportCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${selectedSymbol}_${timeframe}.png`;
            a.click();
          }
        }
      }, 'image/png');
    }
  }, [selectedSymbol, timeframe, market, currency, displayPrice, displayChangePct, indicatorConfigs, showSmcOverlay, showVolumeProfile]);

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
        onOpenIndicatorsModal={() => setIsIndicatorsModalOpen(true)}
        onExportSnapshot={handleExportSnapshot}
      />

      {/* ── OHLCV Bar with Symbol context ── */}
      <OHLCVHeader
        symbol={selectedSymbol}
        candle={lastCandle}
        currency={currency}
        timeframe={timeframe}
        currentPrice={displayPrice}
      />

      {/* ── Main Chart Workspace: Left Institutional Drawing Toolbar + Canvas Area ── */}
      <div className="flex-1 min-h-0 flex flex-row relative bg-white overflow-hidden">
        {/* Left Vertical Institutional Drawing Toolbar */}
        <DrawingToolbar
          activeDrawingTool={activeDrawingTool}
          onDrawingToolChange={setActiveDrawingTool}
          onClearDrawings={handleClearDrawings}
          onUndoDrawing={handleUndoDrawing}
          onOpenObjectsTree={() => setIsDrawingsManagerOpen(true)}
          isMagnetActive={isMagnetActive}
          onToggleMagnet={() => setIsMagnetActive(m => !m)}
          onOpenHotkeys={() => setIsHotkeysModalOpen(true)}
          drawingsCount={drawings.length}
        />

        {/* Chart Canvas Area */}
        <div ref={chartWrapperRef} className="flex-1 min-h-0 relative bg-white overflow-hidden">
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
            selectedDrawingId={selectedDrawingId}
            isMagnetActive={isMagnetActive}
            onAddDrawing={handleAddDrawing}
            onUpdateDrawing={handleUpdateDrawing}
            onDeleteDrawing={handleDeleteDrawing}
            onSelectDrawing={setSelectedDrawingId}
            onUndoDrawing={handleUndoDrawing}
            onDrawingToolChange={setActiveDrawingTool}
            onToggleMagnet={() => setIsMagnetActive(m => !m)}
            onOpenHotkeys={() => setIsHotkeysModalOpen(true)}
            onExportSnapshot={handleExportSnapshot}
            className="h-full"
          />
        </div>
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

      {/* ── Drawings Manager / Objects Tree Modal ── */}
      <DrawingsManagerModal
        isOpen={isDrawingsManagerOpen}
        onClose={() => setIsDrawingsManagerOpen(false)}
        drawings={drawings}
        selectedDrawingId={selectedDrawingId}
        onSelectDrawing={(id) => {
          setSelectedDrawingId(id);
          setIsDrawingsManagerOpen(false);
        }}
        onUpdateDrawing={handleUpdateDrawing}
        onDeleteDrawing={handleDeleteDrawing}
        onClearAllDrawings={handleClearDrawings}
      />

      {/* ── Categorized ƒx Indicators Modal ── */}
      <IndicatorsModal
        isOpen={isIndicatorsModalOpen}
        onClose={() => setIsIndicatorsModalOpen(false)}
        activeIndicators={activeIndicators}
        onToggleIndicator={toggleIndicator}
        onOpenSettings={(type) => {
          setEditingIndicator(type);
          setIsIndicatorsModalOpen(false);
        }}
        onClearAll={handleClearAllIndicators}
      />

      {/* ── Institutional Hotkeys Cheat Sheet Modal ── */}
      <ChartHotkeysModal
        isOpen={isHotkeysModalOpen}
        onClose={() => setIsHotkeysModalOpen(false)}
      />
    </div>
  );
}
