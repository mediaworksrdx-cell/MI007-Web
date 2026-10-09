'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Timeframe, MarketType, INSTRUMENTS } from '@/lib/types';
import type { Candle, ChartType, IndicatorType, IndicatorConfig, FnoOverlayLevels, StrategyPayoffOverlay } from '@/lib/types';
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

export function ChartContainer({ market, defaultSymbol }: ChartContainerProps) {
  const instruments = INSTRUMENTS[market];
  const [selectedSymbol, setSelectedSymbol] = useState(
    defaultSymbol ?? instruments[0].symbol
  );
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [chartType, setChartType] = useState<ChartType>('CANDLESTICK');
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>('NONE');
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);

  const [showVolume, setShowVolume] = useState(true);
  const [showVolumePanel, setShowVolumePanel] = useState(false);
  const [showSmcOverlay, setShowSmcOverlay] = useState(true);
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [showFnoOverlay, setShowFnoOverlay] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('NONE');
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>(['EMA']);
  const [customConfigs, setCustomConfigs] = useState<Partial<Record<IndicatorType, Partial<IndicatorConfig>>>>({});
  const [editingIndicator, setEditingIndicator] = useState<IndicatorType | null>(null);

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
      // 1. Instant load from IndexedDB cache
      const cached = await loadStoredCandles(selectedSymbol, timeframe);
      if (!isCancelled && cached && cached.length > 0) {
        setCandles(cached);
        const lastC = cached[cached.length - 1];
        setCurrentPrice(lastC?.close);
        setIsLoadingCandles(false);
      }

      // 2. Fetch latest candles from Trade Engine API
      const engineCandles = await fetchCandles(selectedSymbol, timeframe);

      if (!isCancelled) {
        if (engineCandles && engineCandles.length > 5) {
          const merged = mergeCandleArrays(cached || [], engineCandles);
          setCandles(merged);
          const lastC = merged[merged.length - 1];
          setCurrentPrice(lastC?.close);
          setIsLiveFromEngine(true);
          // Persist merged dataset to IndexedDB
          saveStoredCandles(selectedSymbol, timeframe, merged);
        } else if (!cached || cached.length === 0) {
          // Fallback to high-quality generator if offline or empty
          const fallback = getMockCandles(market, selectedSymbol, timeframe, 300);
          setCandles(fallback);
          setCurrentPrice(fallback[fallback.length - 1]?.close);
          setIsLiveFromEngine(false);
          saveStoredCandles(selectedSymbol, timeframe, fallback);
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

          let next: Candle[];

          // Case 1: Tick falls into currently active bucket
          if (lastCandle.openTime === currentBucketOpenTime) {
            const updated: Candle = {
              ...lastCandle,
              close: tick.price,
              high: Math.max(lastCandle.high, tick.price),
              low: Math.min(lastCandle.low, tick.price),
              volume: lastCandle.volume + (tick.volume > 0 ? tick.volume : 1),
            };
            next = [...prev];
            next[next.length - 1] = updated;
          } else if (currentBucketOpenTime > lastCandle.openTime) {
            // Case 2: New time bucket started — start ONE single new candle stamped at currentBucketOpenTime
            const newBar: Candle = {
              openTime: currentBucketOpenTime,
              open: lastCandle.close,
              high: Math.max(lastCandle.close, tick.price),
              low: Math.min(lastCandle.close, tick.price),
              close: tick.price,
              volume: tick.volume > 0 ? tick.volume : 1,
            };
            next = [...prev.slice(-999), newBar];
          } else {
            // Case 3: Prior/matching sub-bucket update
            const updated: Candle = {
              ...lastCandle,
              close: tick.price,
              high: Math.max(lastCandle.high, tick.price),
              low: Math.min(lastCandle.low, tick.price),
            };
            next = [...prev];
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

  // Sync snapshot price if available from trade engine
  useEffect(() => {
    const live = getSymbolPrice(selectedSymbol);
    if (live && live.price > 0) {
      setCurrentPrice(live.price);
      setIsLiveFromEngine(true);
    }
  }, [selectedSymbol, getSymbolPrice]);

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

  const lastCandle = candles[candles.length - 1] ?? null;
  const quote = useMemo(() => getMockQuote(market, selectedSymbol), [market, selectedSymbol]);

  // Live snapshot details from context
  const livePriceData = getSymbolPrice(selectedSymbol);
  const displayPrice = currentPrice ?? livePriceData?.price ?? lastCandle?.close ?? 0;
  const displayChange = livePriceData?.change ?? quote.change;
  const displayChangePct = livePriceData?.changePct ?? quote.changePct;

  // Institutional Options Dealer Walls (Call Wall, Put Wall, Gamma Flip, Max Pain — Parity with Android FnoOverlayLayer)
  const fnoLevels: FnoOverlayLevels = useMemo(() => {
    const price = displayPrice || lastCandle?.close || 1000;
    const strikeStep = price > 50000 ? 1000 : price > 10000 ? 100 : price > 2000 ? 50 : price > 500 ? 20 : price > 100 ? 5 : 1;
    const baseStrike = Math.round(price / strikeStep) * strikeStep;

    return {
      callWall: baseStrike + strikeStep * 3,
      putWall: baseStrike - strikeStep * 3,
      gammaFlip: baseStrike - strikeStep * 0.5,
      maxPain: baseStrike - strikeStep,
      callWallGex: 1.45e9,
      putWallGex: -1.18e9,
      totalNetGex: 2.7e8,
      enabled: showFnoOverlay,
    };
  }, [displayPrice, lastCandle?.close, showFnoOverlay]);

  // Options Strategy Payoff Overlay (Bull Call Spread, Bear Put Spread, Long Straddle, Iron Condor — Parity with Android FnoOverlayLayer)
  const strategyOverlay: StrategyPayoffOverlay | undefined = useMemo(() => {
    if (!selectedStrategy || selectedStrategy === 'NONE') return undefined;
    const price = displayPrice || lastCandle?.close || 1000;
    const step = price > 50000 ? 1000 : price > 10000 ? 100 : price > 2000 ? 50 : price > 500 ? 20 : price > 100 ? 5 : 1;
    const atm = Math.round(price / step) * step;

    if (selectedStrategy === 'BULL_CALL_SPREAD') {
      return {
        enabled: true,
        strategyName: 'Bull Call Spread',
        breakevenPoints: [atm + step * 0.4],
        maxProfitZone: { low: atm + step, high: atm + step * 4 },
        maxLossZone: { low: atm - step * 4, high: atm },
      };
    } else if (selectedStrategy === 'BEAR_PUT_SPREAD') {
      return {
        enabled: true,
        strategyName: 'Bear Put Spread',
        breakevenPoints: [atm - step * 0.4],
        maxProfitZone: { low: atm - step * 4, high: atm - step },
        maxLossZone: { low: atm, high: atm + step * 4 },
      };
    } else if (selectedStrategy === 'LONG_STRADDLE') {
      return {
        enabled: true,
        strategyName: 'Long Straddle',
        breakevenPoints: [atm - step * 1.5, atm + step * 1.5],
        maxProfitZone: { low: atm + step * 2, high: atm + step * 5 },
        maxLossZone: { low: atm - step * 0.8, high: atm + step * 0.8 },
      };
    } else if (selectedStrategy === 'IRON_CONDOR') {
      return {
        enabled: true,
        strategyName: 'Iron Condor',
        breakevenPoints: [atm - step * 1.2, atm + step * 1.2],
        maxProfitZone: { low: atm - step, high: atm + step },
        maxLossZone: { low: atm - step * 4, high: atm - step * 2 },
      };
    }
    return undefined;
  }, [selectedStrategy, displayPrice, lastCandle?.close]);

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
        showFnoOverlay={showFnoOverlay}
        selectedStrategy={selectedStrategy}
        activeIndicators={activeIndicators}
        engineStatus={status}
        isLiveFromEngine={isLiveFromEngine}
        currency={currency}
        displayPrice={displayPrice}
        displayChange={displayChange}
        displayChangePct={displayChangePct}
        onTimeframeChange={setTimeframe}
        onChartTypeChange={setChartType}
        onDrawingToolChange={setActiveDrawingTool}
        onClearDrawings={handleClearDrawings}
        onUndoDrawing={handleUndoDrawing}
        onToggleVolume={() => setShowVolume(v => !v)}
        onToggleVolumePanel={() => setShowVolumePanel(v => !v)}
        onToggleSmcOverlay={() => setShowSmcOverlay(v => !v)}
        onToggleVolumeProfile={() => setShowVolumeProfile(v => !v)}
        onToggleFnoOverlay={() => setShowFnoOverlay(v => !v)}
        onSelectStrategy={setSelectedStrategy}
        onToggleIndicator={toggleIndicator}
        onOpenIndicatorSettings={t => setEditingIndicator(t)}
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
                  ⚙️
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
          showFnoOverlay={showFnoOverlay}
          fnoLevels={fnoLevels}
          strategyOverlay={strategyOverlay}
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
