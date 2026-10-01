'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Timeframe, MarketType, INSTRUMENTS } from '@/lib/types';
import type { Candle, ChartType, IndicatorType, IndicatorConfig } from '@/lib/types';
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

interface ChartContainerProps {
  market: MarketType;
  defaultSymbol?: string;
}

const TIMEFRAME_MS: Record<string, number> = {
  '1m': 60_000, '5m': 300_000, '15m': 900_000, '30m': 1_800_000,
  '1H': 3_600_000, '4H': 14_400_000, '1D': 86_400_000, '1W': 604_800_000,
};

export function ChartContainer({ market, defaultSymbol }: ChartContainerProps) {
  const instruments = INSTRUMENTS[market];
  const [selectedSymbol, setSelectedSymbol] = useState(
    defaultSymbol ?? instruments[0].symbol
  );
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [chartType, setChartType] = useState<ChartType>('CANDLESTICK');
  const [showVolume, setShowVolume] = useState(true);
  const [showVolumePanel, setShowVolumePanel] = useState(false);
  const [showSmcOverlay, setShowSmcOverlay] = useState(true);
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<IndicatorType[]>(['EMA']);
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

  const allTabs = useMemo(() => {
    const list = [...instruments];
    const exists = list.some(inst => areSymbolsEqual(inst.symbol, selectedSymbol));
    if (!exists && selectedSymbol) {
      list.unshift({
        symbol: selectedSymbol,
        name: selectedSymbol,
        exchange: isCryptoSymbol ? 'CRYPTO' : (market === 'USA' ? 'NASDAQ' : market === 'UAE' ? 'DFM' : 'NSE'),
        currency: isCryptoSymbol ? '$' : (instruments[0]?.currency ?? '₹'),
        market,
      });
    }
    return list;
  }, [instruments, selectedSymbol, isCryptoSymbol, market]);

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

  // Build IndicatorConfig array from active indicator types
  const indicatorConfigs: IndicatorConfig[] = useMemo(() => {
    return activeIndicators.map(t => {
      const d = INDICATOR_DEFAULTS[t];
      return {
        type: t, period: d.period, secondaryPeriod: d.secondaryPeriod,
        tertiaryPeriod: d.tertiaryPeriod, color: d.color,
        secondaryColor: d.secondaryColor, tertiaryColor: d.tertiaryColor,
        enabled: true, multiplier: d.multiplier,
      };
    });
  }, [activeIndicators]);

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

  const lastCandle = candles[candles.length - 1] ?? null;
  const quote = useMemo(() => getMockQuote(market, selectedSymbol), [market, selectedSymbol]);

  // Live snapshot details from context
  const livePriceData = getSymbolPrice(selectedSymbol);
  const displayPrice = currentPrice ?? livePriceData?.price ?? lastCandle?.close ?? 0;
  const displayChange = livePriceData?.change ?? quote.change;
  const displayChangePct = livePriceData?.changePct ?? quote.changePct;

  return (
    <div className="flex flex-col h-full rounded-xl border border-border-navy bg-surface-card overflow-hidden shadow-card">
      {/* ── Instrument Tabs & Live Engine Status ── */}
      <div className="flex items-center gap-0.5 border-b border-border-navy px-2 pt-2 overflow-x-auto scrollbar-none">
        {allTabs.map(inst => {
          const isSelected = inst.symbol === selectedSymbol;
          return (
            <button key={inst.symbol} onClick={() => setSelectedSymbol(inst.symbol)}
              className={`flex-shrink-0 px-3 py-1.5 text-[12px] font-bold mono rounded-t border transition-all ${
                isSelected
                  ? 'border-border-navy border-b-surface-card bg-surface-card text-mint-green -mb-px'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}>{inst.symbol}</button>
          );
        })}

        {/* Live Trade Engine Beacon */}
        <div className="ml-auto flex items-center gap-3 px-3 pb-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border-navy bg-bg-midnight/70 text-[10px] mono">
            <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-mint-green animate-pulse' : 'bg-cyber-gold'}`} />
            <span className="text-text-muted font-bold">
              {status === 'connected' ? (isLiveFromEngine ? 'TRADE ENGINE LIVE' : 'ENGINE CONNECTED') : 'RECONNECTING'}
            </span>
          </div>

          {lastCandle && (
            <div className="flex items-center gap-2">
              <span className="mono text-[14px] font-black text-text-primary">
                {currency}{displayPrice.toLocaleString(undefined, { minimumFractionDigits: displayPrice < 10 ? 2 : 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`mono text-[12px] font-bold ${displayChange >= 0 ? 'text-mint-green' : 'text-crimson-red'}`}>
                {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)} ({displayChange >= 0 ? '+' : ''}{displayChangePct.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <ChartToolbar
        timeframe={timeframe} chartType={chartType}
        showVolume={showVolume} showVolumePanel={showVolumePanel}
        showSmcOverlay={showSmcOverlay} showVolumeProfile={showVolumeProfile}
        activeIndicators={activeIndicators}
        onTimeframeChange={setTimeframe}
        onChartTypeChange={setChartType}
        onToggleVolume={() => setShowVolume(v => !v)}
        onToggleVolumePanel={() => setShowVolumePanel(v => !v)}
        onToggleSmcOverlay={() => setShowSmcOverlay(v => !v)}
        onToggleVolumeProfile={() => setShowVolumeProfile(v => !v)}
        onToggleIndicator={toggleIndicator}
      />

      {/* ── OHLCV Header ── */}
      <OHLCVHeader candle={lastCandle} currency={currency} timeframe={timeframe} currentPrice={displayPrice} />

      {/* ── Chart Canvas ── */}
      <div className="flex-1 min-h-0 relative">
        {isLoadingCandles && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg-midnight/40 backdrop-blur-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-navy bg-surface-card text-text-secondary text-[12px] mono font-bold">
              <span className="w-3 h-3 rounded-full border-2 border-mint-green border-t-transparent animate-spin" />
              <span>STREAMING FROM TRADE ENGINE...</span>
            </div>
          </div>
        )}
        <CandlestickCanvas
          candles={candles} chartType={chartType}
          showVolume={showVolume} showVolumePanel={showVolumePanel}
          showSmcOverlay={showSmcOverlay} showVolumeProfile={showVolumeProfile}
          indicators={indicatorConfigs} indicatorResults={indicatorResults}
          currentPriceOverride={displayPrice} timeframe={timeframe}
          className="h-full"
        />
      </div>

      {/* ── Active Indicator Badges ── */}
      {activeIndicators.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-border-navy px-3 py-1.5 bg-bg-midnight/30">
          {activeIndicators.map(t => (
            <div key={t} className="flex items-center gap-1 rounded-full border border-border-navy px-2 py-0.5 text-[10px] mono">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: INDICATOR_DEFAULTS[t].color }} />
              <span className="text-text-secondary font-bold">{INDICATOR_DEFAULTS[t].label}</span>
              <button onClick={() => toggleIndicator(t)}
                className="ml-0.5 text-text-muted hover:text-crimson-red transition-colors font-bold">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
