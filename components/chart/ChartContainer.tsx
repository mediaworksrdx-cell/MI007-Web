'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Timeframe, MarketType, INSTRUMENTS } from '@/lib/types';
import type { Candle, ChartType, IndicatorType, IndicatorConfig } from '@/lib/types';
import type { DrawingItem, DrawingToolType } from '@/lib/drawingTypes';
import {
  INDICATOR_DEFAULTS,
  formatIndicatorBadgeLabel,
  calculateSMA, calculateEMA, calculateRSI, calculateMACD,
  calculateBollingerBands, calculateVWAP, calculateSupertrend,
  calculateATR, calculateStochastic, calculateIchimoku,
  calculateCVD, calculateParabolicSAR, calculateADX,
  calculateOBV, calculateCCI, calculateWilliamsR, calculateMFI,
  calculateEmaRibbon, calculatePivotPoints, calculateDonchian, calculateHMA, calculateCMF,
} from '@/lib/chartRenderer';
import { getMockCandles, getMockQuote } from '@/lib/mockData';
import { findZerodhaStockBySymbol, KNOWN_ZERODHA_PRICES, getZerodhaStockPrice } from '@/lib/screener/zerodhaStocks';
import { fetchCandles, areSymbolsEqual } from '@/lib/tradeEngineClient';
import { useTradeEngine, useLiveSymbol } from '@/lib/tradeEngineContext';
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
import { SmcConfig, DEFAULT_SMC_CONFIG, getStoredSmcConfig, saveStoredSmcConfig } from '@/lib/smcEngine';
import { OrderFlowConfig, DEFAULT_ORDER_FLOW_CONFIG } from '@/lib/orderflow/types';
import { analyzeOrderFlow } from '@/lib/orderflow/orderFlowEngine';
import { OrderFlowSignalsModal } from './OrderFlowSignalsModal';
import { ChartToolbar } from './ChartToolbar';
import { CandlestickCanvas } from './CandlestickCanvas';
import { OHLCVHeader } from './OHLCVHeader';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';
import { DrawingToolbar, type CursorMode } from './DrawingToolbar';
import { DrawingsManagerModal } from './DrawingsManagerModal';
import { ChartSymbolSearch, type ChartInstrumentItem } from './ChartSymbolSearch';

interface ChartContainerProps {
  market: MarketType;
  defaultSymbol?: string;
  backHref?: string;
  backLabel?: string;
  isStandalone?: boolean;
  initialStrategies?: string;
  initialIndicatorsParam?: string;
  initialSmcParam?: string;
  initialSetupId?: string;
  initialTfParam?: string;
}

const TIMEFRAME_MS: Record<string, number> = {
  '1m': 60_000, '5m': 300_000, '15m': 900_000, '30m': 1_800_000,
  '1H': 3_600_000, '4H': 14_400_000, '1D': 86_400_000, '1W': 604_800_000,
  '1M': 30 * 86_400_000,
};

const DEFAULT_PERIOD_PROGRESSIONS: Partial<Record<IndicatorType, number[]>> = {
  EMA: [9, 21, 50, 200, 100],
  SMA: [20, 50, 200, 100],
  RSI: [14, 7, 21],
  BOLLINGER_BANDS: [20, 50],
  SUPERTREND: [10, 14],
  ATR: [14, 20],
  MACD: [12, 8],
  STOCHASTIC: [14, 21],
  HMA: [9, 21],
  DONCHIAN: [20, 50],
};

const DEFAULT_COLOR_PROGRESSIONS: Partial<Record<IndicatorType, string[]>> = {
  EMA: ['#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6'], // Blue, Amber, Emerald, Pink, Violet
  SMA: ['#6366F1', '#EC4899', '#14B8A6', '#F97316', '#06B6D4'], // Indigo, Pink, Teal, Orange, Cyan
  RSI: ['#8B5CF6', '#EC4899', '#06B6D4'],
  BOLLINGER_BANDS: ['#6366F1', '#3B82F6'],
  SUPERTREND: ['#10B981', '#059669'],
};

function getExpectedPrice(market: MarketType, symbol: string): number {
  try {
    const symClean = symbol.toUpperCase().replace(/[\s\/-]+/g, '');
    const INDEX_BASES: Record<string, number> = {
      MIDCPNIFTY: 12950,
      NIFTYMIDSELECT: 12950,
      BANKEX: 61080,
      BSEBANKEX: 61080,
      NIFTY: 22880,
      NIFTY50: 22880,
      BANKNIFTY: 55480,
      FINNIFTY: 24840,
      SENSEX: 73850,
      INDIAVIX: 14.5,
      SPX: 7690,
      NDX: 29529,
      DJI: 51966,
      VIX: 18.4,
      QQQ: 718,
      DFMGI: 5820,
      ADXGI: 9340,
    };
    if (INDEX_BASES[symClean]) return INDEX_BASES[symClean];

    const zd = findZerodhaStockBySymbol(symClean);
    if (zd && zd.lastPrice && zd.lastPrice > 0) return zd.lastPrice;
    if (KNOWN_ZERODHA_PRICES[symClean]) return KNOWN_ZERODHA_PRICES[symClean];

    const q = getMockQuote(market, symbol);
    if (q && q.price > 0) return q.price;
  } catch {}
  return getZerodhaStockPrice(symbol);
}

function validateAndCleanCandles(candles: Candle[], timeframe?: string): Candle[] {
  if (!candles || candles.length === 0) return [];

  const valid = candles
    .filter(c => c && Number.isFinite(c.openTime) && c.close > 0)
    .map(c => {
      const close = Number(c.close);
      const open = (Number.isFinite(c.open) && c.open > 0) ? Number(c.open) : close;
      const rawHigh = (Number.isFinite(c.high) && c.high > 0) ? Number(c.high) : close;
      const rawLow = (Number.isFinite(c.low) && c.low > 0) ? Number(c.low) : close;
      const high = Math.max(rawHigh, open, close);
      const low = Math.min(rawLow, open, close);
      const volume = (Number.isFinite(c.volume) && c.volume >= 0) ? Number(c.volume) : 0;

      return {
        openTime: c.openTime,
        open,
        high,
        low,
        close,
        volume,
      };
    })
    .sort((a, b) => a.openTime - b.openTime);

  if (valid.length <= 1) return valid;

  // Deduplicate same-day duplicate candles on daily view (e.g. UTC midnight duplicate vs market midnight)
  if (timeframe === '1D') {
    const merged: Candle[] = [];
    for (let i = 0; i < valid.length; i++) {
      const c = valid[i];
      const prev = merged[merged.length - 1];
      if (prev) {
        const pDate = new Date(prev.openTime);
        const cDate = new Date(c.openTime);
        const isSameCalendarDay = (
          (pDate.getFullYear() === cDate.getFullYear() && pDate.getMonth() === cDate.getMonth() && pDate.getDate() === cDate.getDate()) ||
          (pDate.getUTCFullYear() === cDate.getUTCFullYear() && pDate.getUTCMonth() === cDate.getUTCMonth() && pDate.getUTCDate() === cDate.getUTCDate()) ||
          (Math.abs(c.openTime - prev.openTime) < 86_400_000 && Math.abs(c.openTime - prev.openTime) <= 6 * 3600_000)
        );
        if (isSameCalendarDay) {
          prev.high = Math.max(prev.high, c.high);
          prev.low = Math.min(prev.low, c.low);
          prev.close = c.close;
          prev.volume += c.volume;
          continue;
        }
      }
      merged.push({ ...c });
    }
    return merged;
  }

  return valid;
}

export function ChartContainer({
  market,
  defaultSymbol,
  backHref,
  backLabel,
  isStandalone = false,
  initialStrategies,
  initialIndicatorsParam,
  initialSmcParam,
  initialSetupId,
  initialTfParam,
}: ChartContainerProps) {
  const instruments = INSTRUMENTS[market];
  const [selectedSymbol, setSelectedSymbol] = useState(
    defaultSymbol ?? instruments[0].symbol
  );
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [chartType, setChartType] = useState<ChartType>('CANDLESTICK');
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>('NONE');
  const [cursorMode, setCursorMode] = useState<CursorMode>('crosshair');
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [isDrawingsManagerOpen, setIsDrawingsManagerOpen] = useState(false);
  const [isMagnetActive, setIsMagnetActive] = useState(false);
  const [isDrawingModeLocked, setIsDrawingModeLocked] = useState(false);
  const [isAllDrawingsLocked, setIsAllDrawingsLocked] = useState(false);
  const [isAllDrawingsHidden, setIsAllDrawingsHidden] = useState(false);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const drawingHistoryRef = useRef<DrawingItem[][]>([]);
  const lastUsedDrawingToolRef = useRef<DrawingToolType>('TRENDLINE');

  const handleSelectDrawingTool = useCallback((tool: DrawingToolType) => {
    if (tool !== 'NONE') {
      lastUsedDrawingToolRef.current = tool;
    }
    setActiveDrawingTool(tool);
  }, []);

  const handleToggleDrawingModeLock = useCallback(() => {
    setIsDrawingModeLocked(prev => {
      const next = !prev;
      if (!next) {
        // When Stay in Drawing Mode is turned OFF, immediately exit active drawing tool
        setActiveDrawingTool('NONE');
      } else {
        // When Stay in Drawing Mode is turned ON, activate the current or last used drawing tool
        setActiveDrawingTool(curr => (curr === 'NONE' ? lastUsedDrawingToolRef.current : curr));
      }
      return next;
    });
  }, []);

  // Default clean view: Volume on, but all indicators and overlays off initially
  const [showVolume, setShowVolume] = useState(true);
  const [showVolumePanel, setShowVolumePanel] = useState(false);
  const [smcConfig, setSmcConfig] = useState<SmcConfig>(() => {
    const stored = getStoredSmcConfig();
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const smcParam = sp.get('smc');
      if (smcParam === '1' || smcParam === 'true') {
        return { ...stored, enabled: true };
      }
      if (smcParam === '0' || smcParam === 'false') {
        return { ...stored, enabled: false };
      }
      const stratParam = sp.get('strategies');
      if (stratParam) {
        const hasSmc = decodeURIComponent(stratParam).split(',').some(s => s.startsWith('smc_'));
        return { ...stored, enabled: hasSmc };
      }
    }
    return stored;
  });
  const showSmcOverlay = smcConfig.enabled;
  const setShowSmcOverlay = useCallback((valOrFn: boolean | ((prev: boolean) => boolean)) => {
    setSmcConfig(prev => {
      const nextEnabled = typeof valOrFn === 'function' ? valOrFn(prev.enabled) : valOrFn;
      const updated = { ...prev, enabled: nextEnabled };
      saveStoredSmcConfig(updated);
      return updated;
    });
  }, []);

  const handleSmcConfigChange = useCallback((newCfg: SmcConfig) => {
    setSmcConfig(newCfg);
    saveStoredSmcConfig(newCfg);
  }, []);

  // Order Flow Footprint configuration and live signal state
  const [orderFlowConfig, setOrderFlowConfig] = useState<OrderFlowConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mi007_orderflow_config');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return DEFAULT_ORDER_FLOW_CONFIG;
  });
  const [isOfSignalsOpen, setIsOfSignalsOpen] = useState(false);

  const handleOrderFlowConfigChange = useCallback((newCfg: OrderFlowConfig) => {
    setOrderFlowConfig(newCfg);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mi007_orderflow_config', JSON.stringify(newCfg));
      } catch (e) {}
    }
  }, []);

  const [targetCandleTime, setTargetCandleTime] = useState<number | undefined>();
  const [targetSetupId, setTargetSetupId] = useState<string | undefined>();

  // Detect URL parameter for initial SMC mode activation (e.g. from SMC scanner or screener)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const smcParam = initialSmcParam !== undefined ? initialSmcParam : sp.get('smc');
      const strategiesParam = initialStrategies !== undefined ? initialStrategies : sp.get('strategies');
      const indicatorsParam = initialIndicatorsParam !== undefined ? initialIndicatorsParam : sp.get('indicators');

      const hasSmcStrat = strategiesParam
        ? decodeURIComponent(strategiesParam).split(',').some(s => s.startsWith('smc_'))
        : false;

      if (smcParam === '1' || smcParam === 'true' || hasSmcStrat) {
        setSmcConfig(prev => {
          const next = { ...prev, enabled: true };
          saveStoredSmcConfig(next);
          return next;
        });
      } else if (smcParam === '0' || smcParam === 'false' || strategiesParam || indicatorsParam) {
        // Explicitly disable SMC overlay for pure technical strategies
        setSmcConfig(prev => {
          const next = { ...prev, enabled: false };
          saveStoredSmcConfig(next);
          return next;
        });
      }

      const tfParam = sp.get('tf') as Timeframe;
      if (tfParam && ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W', '1M'].includes(tfParam)) {
        setTimeframe(tfParam);
      }
      const timeParam = sp.get('time');
      if (timeParam) {
        const parsedTime = Number(timeParam);
        if (!Number.isNaN(parsedTime) && parsedTime > 0) {
          setTargetCandleTime(parsedTime);
        }
      }
      const setupIdParam = sp.get('setupId');
      if (setupIdParam) {
        setTargetSetupId(setupIdParam);
      }

      // Read indicators and strategies from URL parameters (e.g. from Screener Actions)
      const hasStrategyOrIndParams = Boolean(
        (indicatorsParam && indicatorsParam !== '') || (strategiesParam && strategiesParam !== '')
      );
      if (hasStrategyOrIndParams) {
        const activeTypes: { type: IndicatorType; period?: number; color?: string }[] = [];

        // Parse strategiesParam
        if (strategiesParam) {
          const strats = decodeURIComponent(strategiesParam).split(',');
          if (strats.includes('ma_alignment') || strats.includes('golden_cross') || strats.includes('death_cross')) {
            activeTypes.push({ type: 'SMA', period: 50, color: '#38BDF8' });
            activeTypes.push({ type: 'SMA', period: 200, color: '#F59E0B' });
          }
          if (strats.includes('ma_20_50_cross')) {
            activeTypes.push({ type: 'SMA', period: 20, color: '#10B981' });
            activeTypes.push({ type: 'SMA', period: 50, color: '#38BDF8' });
          }
          if (strats.includes('ema_9_21_cross')) {
            activeTypes.push({ type: 'EMA', period: 9, color: '#A855F7' });
            activeTypes.push({ type: 'EMA', period: 21, color: '#EC4899' });
          }
          if (strats.includes('rsi_momentum')) {
            activeTypes.push({ type: 'RSI', period: 14, color: '#818CF8' });
          }
          if (strats.includes('macd_cross')) {
            activeTypes.push({ type: 'MACD', color: '#38BDF8' });
          }
          if (strats.includes('bb_reversal')) {
            activeTypes.push({ type: 'BOLLINGER_BANDS', period: 20, color: '#6366F1' });
          }
          if (strats.includes('breakout')) {
            activeTypes.push({ type: 'DONCHIAN', period: 20, color: '#F97316' });
          }
          if (strats.includes('adx_trend')) {
            activeTypes.push({ type: 'ADX', period: 14, color: '#EAB308' });
            activeTypes.push({ type: 'EMA', period: 9, color: '#A855F7' });
            activeTypes.push({ type: 'EMA', period: 21, color: '#EC4899' });
          }
        }

        // Parse direct indicatorsParam
        if (indicatorsParam) {
          const inds = decodeURIComponent(indicatorsParam).split(',');
          inds.forEach((ind) => {
            const clean = ind.trim().toLowerCase();
            if (clean === 'sma50' && !activeTypes.some((t) => t.type === 'SMA' && t.period === 50)) {
              activeTypes.push({ type: 'SMA', period: 50, color: '#38BDF8' });
            } else if (clean === 'sma200' && !activeTypes.some((t) => t.type === 'SMA' && t.period === 200)) {
              activeTypes.push({ type: 'SMA', period: 200, color: '#F59E0B' });
            } else if (clean === 'sma20' && !activeTypes.some((t) => t.type === 'SMA' && t.period === 20)) {
              activeTypes.push({ type: 'SMA', period: 20, color: '#10B981' });
            } else if (clean === 'ema9' && !activeTypes.some((t) => t.type === 'EMA' && t.period === 9)) {
              activeTypes.push({ type: 'EMA', period: 9, color: '#A855F7' });
            } else if (clean === 'ema21' && !activeTypes.some((t) => t.type === 'EMA' && t.period === 21)) {
              activeTypes.push({ type: 'EMA', period: 21, color: '#EC4899' });
            } else if (clean === 'rsi' && !activeTypes.some((t) => t.type === 'RSI')) {
              activeTypes.push({ type: 'RSI', period: 14, color: '#818CF8' });
            } else if (clean === 'macd' && !activeTypes.some((t) => t.type === 'MACD')) {
              activeTypes.push({ type: 'MACD', color: '#38BDF8' });
            } else if (clean === 'bollinger' && !activeTypes.some((t) => t.type === 'BOLLINGER_BANDS')) {
              activeTypes.push({ type: 'BOLLINGER_BANDS', period: 20, color: '#6366F1' });
            } else if (clean === 'donchian' && !activeTypes.some((t) => t.type === 'DONCHIAN')) {
              activeTypes.push({ type: 'DONCHIAN', period: 20, color: '#F97316' });
            } else if (clean === 'adx' && !activeTypes.some((t) => t.type === 'ADX')) {
              activeTypes.push({ type: 'ADX', period: 14, color: '#EAB308' });
            }
          });
        }

        // Set strictly to the strategy's corresponding indicators (empty if none requested)
        const generatedConfigs: IndicatorConfig[] = activeTypes.map((item, idx) => {
          const def = INDICATOR_DEFAULTS[item.type] || INDICATOR_DEFAULTS.SMA;
          return {
            ...def,
            id: `${item.type.toLowerCase()}-${item.period || 'def'}-${idx}`,
            type: item.type,
            period: item.period ?? def.period,
            color: item.color ?? def.color,
            enabled: true,
          };
        });

        setIndicatorConfigs(generatedConfigs);
        localStorage.setItem('mi007_chart_indicators_v2', JSON.stringify(generatedConfigs));
      }
    }
  }, []);

  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [indicatorConfigs, setIndicatorConfigs] = useState<IndicatorConfig[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const sp = new URLSearchParams(window.location.search);
      const indParam = initialIndicatorsParam !== undefined ? initialIndicatorsParam : sp.get('indicators');
      const stratParam = initialStrategies !== undefined ? initialStrategies : sp.get('strategies');

      // If URL/props specified indicators or strategies, strictly isolate to ONLY those indicators
      const hasSpecificRequestedInds = Boolean(
        (indParam && indParam !== '') || (stratParam && stratParam !== '')
      );
      if (hasSpecificRequestedInds) {
        const initialTypes: { type: IndicatorType; period?: number; color?: string }[] = [];
        if (stratParam) {
          const strats = decodeURIComponent(stratParam).split(',');
          if (strats.includes('ma_alignment') || strats.includes('golden_cross') || strats.includes('death_cross')) {
            initialTypes.push({ type: 'SMA', period: 50, color: '#38BDF8' });
            initialTypes.push({ type: 'SMA', period: 200, color: '#F59E0B' });
          }
          if (strats.includes('ma_20_50_cross')) {
            initialTypes.push({ type: 'SMA', period: 20, color: '#10B981' });
            initialTypes.push({ type: 'SMA', period: 50, color: '#38BDF8' });
          }
          if (strats.includes('ema_9_21_cross')) {
            initialTypes.push({ type: 'EMA', period: 9, color: '#A855F7' });
            initialTypes.push({ type: 'EMA', period: 21, color: '#EC4899' });
          }
          if (strats.includes('rsi_momentum')) {
            initialTypes.push({ type: 'RSI', period: 14, color: '#818CF8' });
          }
          if (strats.includes('macd_cross')) {
            initialTypes.push({ type: 'MACD', color: '#38BDF8' });
          }
          if (strats.includes('bb_reversal')) {
            initialTypes.push({ type: 'BOLLINGER_BANDS', period: 20, color: '#6366F1' });
          }
          if (strats.includes('breakout')) {
            initialTypes.push({ type: 'DONCHIAN', period: 20, color: '#F97316' });
          }
          if (strats.includes('adx_trend')) {
            initialTypes.push({ type: 'ADX', period: 14, color: '#EAB308' });
            initialTypes.push({ type: 'EMA', period: 9, color: '#A855F7' });
            initialTypes.push({ type: 'EMA', period: 21, color: '#EC4899' });
          }
        }
        if (indParam) {
          const inds = decodeURIComponent(indParam).split(',');
          inds.forEach((ind) => {
            const clean = ind.trim().toLowerCase();
            if (clean === 'sma50' && !initialTypes.some((t) => t.type === 'SMA' && t.period === 50)) {
              initialTypes.push({ type: 'SMA', period: 50, color: '#38BDF8' });
            } else if (clean === 'sma200' && !initialTypes.some((t) => t.type === 'SMA' && t.period === 200)) {
              initialTypes.push({ type: 'SMA', period: 200, color: '#F59E0B' });
            } else if (clean === 'sma20' && !initialTypes.some((t) => t.type === 'SMA' && t.period === 20)) {
              initialTypes.push({ type: 'SMA', period: 20, color: '#10B981' });
            } else if (clean === 'ema9' && !initialTypes.some((t) => t.type === 'EMA' && t.period === 9)) {
              initialTypes.push({ type: 'EMA', period: 9, color: '#A855F7' });
            } else if (clean === 'ema21' && !initialTypes.some((t) => t.type === 'EMA' && t.period === 21)) {
              initialTypes.push({ type: 'EMA', period: 21, color: '#EC4899' });
            } else if (clean === 'rsi' && !initialTypes.some((t) => t.type === 'RSI')) {
              initialTypes.push({ type: 'RSI', period: 14, color: '#818CF8' });
            } else if (clean === 'macd' && !initialTypes.some((t) => t.type === 'MACD')) {
              initialTypes.push({ type: 'MACD', color: '#38BDF8' });
            } else if (clean === 'bollinger' && !initialTypes.some((t) => t.type === 'BOLLINGER_BANDS')) {
              initialTypes.push({ type: 'BOLLINGER_BANDS', period: 20, color: '#6366F1' });
            } else if (clean === 'donchian' && !initialTypes.some((t) => t.type === 'DONCHIAN')) {
              initialTypes.push({ type: 'DONCHIAN', period: 20, color: '#F97316' });
            } else if (clean === 'adx' && !initialTypes.some((t) => t.type === 'ADX')) {
              initialTypes.push({ type: 'ADX', period: 14, color: '#EAB308' });
            }
          });
        }
        return initialTypes.map((item, idx) => {
          const def = INDICATOR_DEFAULTS[item.type] || INDICATOR_DEFAULTS.SMA;
          return {
            ...def,
            id: `${item.type.toLowerCase()}-${item.period || 'def'}-${idx}`,
            type: item.type,
            period: item.period ?? def.period,
            color: item.color ?? def.color,
            enabled: true,
          };
        });
      }

      const savedV2 = localStorage.getItem('mi007_chart_indicators_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed)) {
          return parsed.map((item: Partial<IndicatorConfig> & { type: IndicatorType }, idx: number): IndicatorConfig => {
            const def = INDICATOR_DEFAULTS[item.type as IndicatorType] || INDICATOR_DEFAULTS.SMA;
            const validPeriod = (def && def.period > 0 && (!item.period || item.period <= 0))
              ? def.period
              : (item.period ?? def?.period ?? 14);
            return {
              ...def,
              ...item,
              id: item.id || `${item.type.toLowerCase()}-${Date.now()}-${idx}`,
              type: item.type,
              period: validPeriod,
              step: item.step ?? def?.step ?? 0.02,
              maxAf: item.maxAf ?? def?.maxAf ?? 0.20,
              enabled: item.enabled ?? true,
            };
          });
        }
      }
      // Migration from legacy mi007_active_indicators / mi007_indicator_configs if any
      const legacyTypes = localStorage.getItem('mi007_active_indicators');
      if (legacyTypes) {
        const types: IndicatorType[] = JSON.parse(legacyTypes);
        const legacyCustom = localStorage.getItem('mi007_indicator_configs');
        const customMap = legacyCustom ? JSON.parse(legacyCustom) : {};
        if (Array.isArray(types) && types.length > 0) {
          const list: IndicatorConfig[] = [];
          types.forEach((t, idx) => {
            const d = INDICATOR_DEFAULTS[t];
            if (!d) return;
            const c = customMap[t] || {};
            list.push({
              id: `${t.toLowerCase()}-${Date.now()}-${idx}`,
              type: t,
              period: c.period ?? d.period,
              secondaryPeriod: c.secondaryPeriod ?? d.secondaryPeriod,
              tertiaryPeriod: c.tertiaryPeriod ?? d.tertiaryPeriod,
              multiplier: c.multiplier ?? d.multiplier,
              color: c.color ?? d.color,
              secondaryColor: c.secondaryColor ?? d.secondaryColor,
              tertiaryColor: c.tertiaryColor ?? d.tertiaryColor,
              enabled: true,
            });
          });
          return list;
        }
      }
    } catch {}
    return [];
  });
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);

  // Template System: 5 renameable slots with persistent storage
  const [templates, setTemplates] = useState<ChartTemplate[]>(() => getStoredTemplates());
  const [activeTemplateId, setActiveTemplateIdState] = useState<string>(() => getActiveTemplateId());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // Active indicator types set (for backward compatibility)
  const activeIndicators = useMemo(() => {
    return Array.from(new Set(indicatorConfigs.filter(c => c.enabled).map(c => c.type)));
  }, [indicatorConfigs]);

  const [candles, setCandles] = useState<Candle[]>([]);

  const orderFlowData = useMemo(() => {
    if (!orderFlowConfig.enabled || candles.length === 0) return undefined;
    return analyzeOrderFlow(candles, orderFlowConfig);
  }, [candles, orderFlowConfig]);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>();
  const [isLoadingCandles, setIsLoadingCandles] = useState(true);
  const [isLiveFromEngine, setIsLiveFromEngine] = useState(false);

  // Fullscreen container support
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = useCallback(() => {
    const el = fullscreenContainerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(err => {
          console.warn('[ChartContainer] Fullscreen error:', err);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn('[ChartContainer] Exit fullscreen error:', err);
        });
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcut 'F' to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleFullscreen]);

  const { status, getSymbolPrice, subscribeToTicks } = useTradeEngine();
  const { live: liveSymbolData } = useLiveSymbol(selectedSymbol);

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

  const currency = useMemo(() => {
    const sym = selectedSymbol.toUpperCase().replace(/[\s\/-]+/g, '');
    if (['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX', 'LINK', 'MATIC', 'DOT'].includes(sym)) return '$';
    if (['GOLD', 'XAU', 'XAUUSD', 'SILVER', 'XAG', 'XAGUSD', 'CRUDEOIL', 'BRENT', 'WTI', 'NATGAS', 'COPPER', 'PLATINUM'].includes(sym)) return '$';
    if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'AUDCAD', 'UADCAD', 'USDCHF', 'NZDUSD'].includes(sym)) return '$';
    if (['USDINR'].includes(sym)) return '₹';
    if (['USDAED'].includes(sym)) return 'AED ';
    if (['DFMGI', 'ADXGI', 'EMAAR', 'FAB', 'DEWA', 'ALDAR', 'ENBD', 'ADNOC', 'AIRARABIA', 'SALIK'].includes(sym)) return 'AED ';
    if (['SPX', 'NDX', 'DJI', 'VIX', 'QQQ', 'NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'AMD', 'NFLX', 'INTC'].includes(sym)) return '$';
    return instruments[0]?.currency ?? '₹';
  }, [selectedSymbol, instruments]);

  // Load candles from cache first, then reconcile with Trade Engine
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingCandles(true);
    setCandles([]);
    setCurrentPrice(undefined);

    async function loadCandles() {
      try {
        const live = getSymbolPrice(selectedSymbol);
        const expectedPrice = (live && live.price > 0) ? live.price : getExpectedPrice(market, selectedSymbol);
        const tfMs = TIMEFRAME_MS[timeframe] || TIMEFRAME_MS['1H'];

        // 1. Instant load from IndexedDB cache with purge of dislocated historical data
        let rawCached = await loadStoredCandles(selectedSymbol, timeframe);
        if (rawCached && rawCached.length > 0) {
          const lastC = rawCached[rawCached.length - 1];
          // If cached dataset has scale dislocation from live/expected price (> 20%), purge it
          if (expectedPrice > 0 && lastC && lastC.close > 0) {
            const dislocation = Math.abs(lastC.close - expectedPrice) / expectedPrice;
            if (dislocation > 0.20) {
              console.warn(`[ChartContainer] Auto-purging dislocated cache for ${selectedSymbol} (cached: ${lastC.close}, expected: ${expectedPrice})`);
              await purgeStoredCandles(selectedSymbol, timeframe);
              rawCached = null;
            }
          }
        }

        const cleanCached = validateAndCleanCandles(rawCached || [], timeframe);

        if (!isCancelled && cleanCached.length > 0) {
          setCandles(cleanCached);
          const lastC = cleanCached[cleanCached.length - 1];
          setCurrentPrice(lastC?.close);
          setIsLoadingCandles(false);
        }

        // 2. Fetch latest candles from Trade Engine API
        const rawEngine = await fetchCandles(selectedSymbol, timeframe);
        let cleanEngine = validateAndCleanCandles(rawEngine || [], timeframe);

        // Universal scale reconciliation across all markets (Forex, Commodities, Indices, Stocks):
        // Only scale if expectedPrice is an explicitly verified real-time tick, NOT an unverified fallback
        const isVerifiedLivePrice = Boolean(live && live.price > 0);
        if (isVerifiedLivePrice && expectedPrice > 0 && cleanEngine.length > 0) {
          const engineLast = cleanEngine[cleanEngine.length - 1];
          if (engineLast && engineLast.close > 0) {
            const dislocation = Math.abs(engineLast.close - expectedPrice) / expectedPrice;
            if (dislocation > 0.20) {
              const scaleMultiplier = expectedPrice / engineLast.close;
              const decimals = expectedPrice < 2 ? 4 : expectedPrice < 10 ? 3 : 2;
              cleanEngine = cleanEngine.map(c => ({
                ...c,
                open: +(c.open * scaleMultiplier).toFixed(decimals),
                high: +(c.high * scaleMultiplier).toFixed(decimals),
                low: +(c.low * scaleMultiplier).toFixed(decimals),
                close: +(c.close * scaleMultiplier).toFixed(decimals),
              }));
            }
          }
        }

        if (!isCancelled) {
          if (cleanEngine.length > 0) {
            let finalCandles: Candle[];
            // Only merge older cached candles if they are on a continuous price scale with engine data
            if (cleanCached.length > 0 && cleanCached[cleanCached.length - 1].openTime < cleanEngine[0].openTime) {
              const cachedLast = cleanCached[cleanCached.length - 1].close;
              const engineFirst = cleanEngine[0].open;
              const scaleDiff = Math.abs(cachedLast - engineFirst) / Math.max(1, engineFirst);
              if (scaleDiff < 0.15) {
                finalCandles = mergeCandleArrays(cleanCached, cleanEngine, tfMs);
              } else {
                finalCandles = cleanEngine;
                purgeStoredCandles(selectedSymbol, timeframe);
              }
            } else {
              finalCandles = mergeCandleArrays(cleanCached, cleanEngine, tfMs);
            }

            const cleanMerged = validateAndCleanCandles(finalCandles, timeframe);

            setCandles(cleanMerged);
            const lastC = cleanMerged[cleanMerged.length - 1];
            if (lastC?.close) {
              setCurrentPrice(lastC.close);
            }
            setIsLiveFromEngine(true);
            saveStoredCandles(selectedSymbol, timeframe, cleanMerged);
          } else if (cleanCached.length === 0) {
            // Fallback to mock data ONLY in-memory (never pollute persistent storage with mock candles)
            const fallback = getMockCandles(market, selectedSymbol, timeframe, 800);
            const cleanFallback = validateAndCleanCandles(fallback, timeframe);
            setCandles(cleanFallback);
            setCurrentPrice(cleanFallback[cleanFallback.length - 1]?.close);
            setIsLiveFromEngine(false);
          }
        }
      } catch (err) {
        console.error('[ChartContainer] loadCandles error:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingCandles(false);
        }
      }
    }

    loadCandles();

    return () => {
      isCancelled = true;
    };
  }, [market, selectedSymbol, timeframe]);

  // Track last save timestamp to throttle IndexedDB writes during active ticks
  const lastSaveTimeRef = useRef<number>(0);

  // Sync current price immediately from Trade Engine if available (with scale dislocation protection)
  useEffect(() => {
    const live = liveSymbolData || getSymbolPrice(selectedSymbol);
    if (live && live.price > 0) {
      if (candles.length > 0) {
        const lastC = candles[candles.length - 1];
        if (lastC && lastC.close > 0) {
          const dis = Math.abs(live.price - lastC.close) / lastC.close;
          if (dis > 0.25) {
            // Re-anchor candles to verified live price scale
            const ratio = live.price / lastC.close;
            setCandles(cPrev => cPrev.map(c => ({
              ...c,
              open: +(c.open * ratio).toFixed(2),
              high: +(c.high * ratio).toFixed(2),
              low: +(c.low * ratio).toFixed(2),
              close: +(c.close * ratio).toFixed(2),
            })));
          }
        }
      }
      setCurrentPrice(live.price);
      setIsLiveFromEngine(true);
    }
  }, [selectedSymbol, liveSymbolData, getSymbolPrice, candles]);

  // Listen to live WebSocket ticks from the Trade Engine with robust session-aware candle formation
  useEffect(() => {
    const unsub = subscribeToTicks((tick) => {
      if (areSymbolsEqual(tick.symbol, selectedSymbol) && tick.price > 0) {
        setCandles(prev => {
          if (prev.length === 0) return prev;
          const currentLast = prev[prev.length - 1];
          if (!currentLast || currentLast.close <= 0) return prev;

          // Scale dislocation guard: re-anchor candles if arriving tick is verified on authentic scale
          const dislocation = Math.abs(tick.price - currentLast.close) / currentLast.close;
          if (dislocation > 0.25) {
            const ratio = tick.price / currentLast.close;
            return prev.map(c => ({
              ...c,
              open: +(c.open * ratio).toFixed(2),
              high: +(c.high * ratio).toFixed(2),
              low: +(c.low * ratio).toFixed(2),
              close: +(c.close * ratio).toFixed(2),
            }));
          }

          setIsLiveFromEngine(true);
          setCurrentPrice(tick.price);

          const tfMs = TIMEFRAME_MS[timeframe] || TIMEFRAME_MS['1H'];
          const now = tick.timestamp || Date.now();

          // Check if tick belongs to currently active candle bucket (handling UTC vs local market midnight)
          let isSameBucket = false;
          if (timeframe === '1D') {
            const cDate = new Date(currentLast.openTime);
            const tDate = new Date(now);
            if ((cDate.getFullYear() === tDate.getFullYear() && cDate.getMonth() === tDate.getMonth() && cDate.getDate() === tDate.getDate()) ||
                (cDate.getUTCFullYear() === tDate.getUTCFullYear() && cDate.getUTCMonth() === tDate.getUTCMonth() && cDate.getUTCDate() === tDate.getUTCDate()) ||
                (now >= currentLast.openTime && now < currentLast.openTime + tfMs)) {
              isSameBucket = true;
            }
          } else if (timeframe === '1W') {
            isSameBucket = now >= currentLast.openTime && now < currentLast.openTime + 7 * 86_400_000;
          } else if (timeframe === '1M') {
            const cDate = new Date(currentLast.openTime);
            const tDate = new Date(now);
            isSameBucket = cDate.getFullYear() === tDate.getFullYear() && cDate.getMonth() === tDate.getMonth();
          } else {
            isSameBucket = now >= currentLast.openTime && now < currentLast.openTime + tfMs;
          }

          let next: Candle[];

          if (isSameBucket) {
            // Case 1: Update active candle in place
            const open = currentLast.open > 0 ? currentLast.open : tick.price;
            const updated: Candle = {
              ...currentLast,
              open,
              close: tick.price,
              high: Math.max(currentLast.high, tick.price),
              low: currentLast.low > 0 ? Math.min(currentLast.low, tick.price) : tick.price,
              volume: currentLast.volume + (tick.volume > 0 ? tick.volume : 1),
            };
            next = [...prev];
            next[next.length - 1] = updated;
          } else if (now >= currentLast.openTime + tfMs) {
            // Case 2: Genuine new time bucket started (e.g. next day or next hour)
            const newBarOpenTime = timeframe === '1D'
              ? currentLast.openTime + tfMs
              : Math.floor(now / tfMs) * tfMs;
            const newBar: Candle = {
              openTime: newBarOpenTime,
              open: tick.price,
              high: tick.price,
              low: tick.price,
              close: tick.price,
              volume: tick.volume > 0 ? tick.volume : 1,
            };
            next = [...prev.slice(-999), newBar];
          } else {
            // Case 3: Matching sub-bucket update
            const updated: Candle = {
              ...currentLast,
              close: tick.price,
              high: Math.max(currentLast.high, tick.price),
              low: currentLast.low > 0 ? Math.min(currentLast.low, tick.price) : tick.price,
            };
            next = [...prev];
            next[next.length - 1] = updated;
          }

          // Throttle save to storage every 4 seconds
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


  // Currently editing indicator config by unique instance ID
  const currentEditingConfig: IndicatorConfig | null = useMemo(() => {
    if (!editingIndicatorId) return null;
    return indicatorConfigs.find(c => (c.id || c.type) === editingIndicatorId) || null;
  }, [editingIndicatorId, indicatorConfigs]);

  const quote = useMemo(() => getMockQuote(market, selectedSymbol), [market, selectedSymbol]);

  // Live price and display price resolution
  const livePriceData = getSymbolPrice(selectedSymbol);
  const rawDisplayPrice = currentPrice ?? livePriceData?.price ?? candles[candles.length - 1]?.close ?? 0;
  const expectedBenchmarkPrice = useMemo(() => {
    const live = getSymbolPrice(selectedSymbol);
    return (live && live.price > 0) ? live.price : getExpectedPrice(market, selectedSymbol);
  }, [market, selectedSymbol, getSymbolPrice]);
  const safeDisplayPrice = (rawDisplayPrice > 0)
    ? rawDisplayPrice
    : expectedBenchmarkPrice;
  const displayPrice = safeDisplayPrice;
  const displayChange = livePriceData?.change ?? (candles.length >= 2 ? +(candles[candles.length - 1].close - candles[candles.length - 2].close).toFixed(2) : quote.change);
  const displayChangePct = livePriceData?.changePct ?? (candles.length >= 2 && candles[candles.length - 2].close > 0 ? +(((candles[candles.length - 1].close - candles[candles.length - 2].close) / candles[candles.length - 2].close) * 100).toFixed(2) : quote.changePct);

  // Synchronize terminal candle with live tick price for continuous edge-to-edge tracking
  const activeCandles = useMemo(() => {
    if (!candles || candles.length === 0) return candles;
    const targetClose = (displayPrice && displayPrice > 0) ? displayPrice : currentPrice;
    if (!targetClose || targetClose <= 0) return candles;
    const last = candles[candles.length - 1];
    if (!last || last.close === targetClose) return candles;

    // Safety guard: If targetClose has massive scale dislocation from last bar (> 25%), do not distort the candle
    const dislocation = Math.abs(targetClose - last.close) / Math.max(last.close, 0.0001);
    if (dislocation > 0.25) {
      return candles;
    }

    const updated = [...candles];
    updated[updated.length - 1] = {
      ...last,
      close: targetClose,
      high: Math.max(last.high, targetClose),
      low: (last.low > 0) ? Math.min(last.low, targetClose) : targetClose,
    };
    return updated;
  }, [candles, currentPrice, displayPrice]);

  const lastCandle = activeCandles[activeCandles.length - 1] ?? null;

  // Compute indicator results on active synchronized candles with warmup history
  const indicatorResults = useMemo(() => {
    const map = new Map<string, unknown>();
    for (const cfg of indicatorConfigs) {
      if (!cfg.enabled) continue;
      const key = cfg.id || cfg.type;
      let res: unknown = null;
      switch (cfg.type) {
        case 'SMA': res = calculateSMA(activeCandles, cfg.period); break;
        case 'EMA': res = calculateEMA(activeCandles, cfg.period); break;
        case 'RSI': res = calculateRSI(activeCandles, cfg.period); break;
        case 'MACD': res = calculateMACD(activeCandles, cfg.period, cfg.secondaryPeriod, cfg.tertiaryPeriod); break;
        case 'BOLLINGER_BANDS': res = calculateBollingerBands(activeCandles, cfg.period, cfg.multiplier); break;
        case 'VWAP': res = calculateVWAP(activeCandles); break;
        case 'SUPERTREND': res = calculateSupertrend(activeCandles, cfg.period, cfg.multiplier); break;
        case 'ICHIMOKU': res = calculateIchimoku(activeCandles, cfg.period, cfg.secondaryPeriod, cfg.tertiaryPeriod); break;
        case 'ATR': res = calculateATR(activeCandles, cfg.period); break;
        case 'STOCHASTIC': res = calculateStochastic(activeCandles, cfg.period, cfg.secondaryPeriod); break;
        case 'CVD': res = calculateCVD(activeCandles); break;
        case 'PARABOLIC_SAR': res = calculateParabolicSAR(activeCandles, cfg.step ?? 0.02, cfg.maxAf ?? 0.20); break;
        case 'ADX': res = calculateADX(activeCandles, cfg.period); break;
        case 'OBV': res = calculateOBV(activeCandles); break;
        case 'CCI': res = calculateCCI(activeCandles, cfg.period); break;
        case 'WILLIAMS_R': res = calculateWilliamsR(activeCandles, cfg.period); break;
        case 'MFI': res = calculateMFI(activeCandles, cfg.period); break;
        case 'EMA_RIBBON': res = calculateEmaRibbon(activeCandles, cfg.period || 20, cfg.secondaryPeriod || 50, cfg.multiplier || 100, cfg.tertiaryPeriod || 200); break;
        case 'PIVOT_POINTS': res = calculatePivotPoints(activeCandles, cfg.period || 15); break;
        case 'DONCHIAN': res = calculateDonchian(activeCandles, cfg.period); break;
        case 'HMA': res = calculateHMA(activeCandles, cfg.period); break;
        case 'CMF': res = calculateCMF(activeCandles, cfg.period); break;
      }
      if (res !== null) {
        map.set(key, res);
        // Fallback key by type if not already populated
        if (cfg.id && !map.has(cfg.type)) {
          map.set(cfg.type, res);
        }
      }
    }
    return map;
  }, [activeCandles, indicatorConfigs]);

  const handleAddIndicator = useCallback((type: IndicatorType) => {
    setIndicatorConfigs(prev => {
      const existingCount = prev.filter(c => c.type === type).length;
      const d = INDICATOR_DEFAULTS[type];
      const periods = DEFAULT_PERIOD_PROGRESSIONS[type] || [];
      const colors = DEFAULT_COLOR_PROGRESSIONS[type] || [];

      const period = existingCount < periods.length ? periods[existingCount] : d.period;
      const color = existingCount < colors.length ? colors[existingCount] : d.color;

      const newId = `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newConfig: IndicatorConfig = {
        id: newId,
        type,
        period,
        secondaryPeriod: d.secondaryPeriod,
        tertiaryPeriod: d.tertiaryPeriod,
        multiplier: d.multiplier,
        step: d.step ?? 0.02,
        maxAf: d.maxAf ?? 0.20,
        color,
        secondaryColor: d.secondaryColor,
        tertiaryColor: d.tertiaryColor,
        enabled: true,
      };

      const next = [...prev, newConfig];
      try {
        localStorage.setItem('mi007_chart_indicators_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleRemoveIndicator = useCallback((idOrType: string) => {
    setIndicatorConfigs(prev => {
      const hasExactId = prev.some(c => c.id === idOrType);
      const next = hasExactId
        ? prev.filter(c => c.id !== idOrType)
        : prev.filter(c => c.type !== idOrType);
      try {
        localStorage.setItem('mi007_chart_indicators_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
    setEditingIndicatorId(curr => (curr === idOrType ? null : curr));
  }, []);

  const handleToggleIndicatorVisibility = useCallback((idOrType: string) => {
    setIndicatorConfigs(prev => {
      const hasExactId = prev.some(c => c.id === idOrType);
      const next = prev.map(c => {
        const match = hasExactId ? c.id === idOrType : c.type === idOrType;
        if (match) {
          return { ...c, enabled: !c.enabled };
        }
        return c;
      });
      try {
        localStorage.setItem('mi007_chart_indicators_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleIndicator = useCallback((type: IndicatorType) => {
    setIndicatorConfigs(prev => {
      const exists = prev.some(c => c.type === type);
      let next: IndicatorConfig[];
      if (exists) {
        next = prev.filter(c => c.type !== type);
      } else {
        const d = INDICATOR_DEFAULTS[type];
        next = [
          ...prev,
          {
            id: `${type.toLowerCase()}-${Date.now()}`,
            type,
            period: d.period,
            secondaryPeriod: d.secondaryPeriod,
            tertiaryPeriod: d.tertiaryPeriod,
            multiplier: d.multiplier,
            color: d.color,
            secondaryColor: d.secondaryColor,
            tertiaryColor: d.tertiaryColor,
            enabled: true,
          },
        ];
      }
      try {
        localStorage.setItem('mi007_chart_indicators_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleSaveIndicatorConfig = useCallback((updated: IndicatorConfig) => {
    setIndicatorConfigs(prev => {
      const targetId = updated.id || updated.type;
      const next = prev.map(c => {
        if ((c.id && c.id === targetId) || (!c.id && c.type === targetId)) {
          return { ...c, ...updated };
        }
        return c;
      });
      try {
        localStorage.setItem('mi007_chart_indicators_v2', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Load drawings from localStorage per symbol
  useEffect(() => {
    drawingHistoryRef.current = [];
    try {
      const saved = localStorage.getItem(`mi007_drawings_${selectedSymbol}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(d => d && d.id && d.tool && Array.isArray(d.points) && d.points.length > 0);
          setDrawings(valid);
        } else {
          setDrawings([]);
        }
      } else {
        setDrawings([]);
      }
    } catch {
      setDrawings([]);
    }
  }, [selectedSymbol]);

  const pushDrawingHistory = useCallback((snapshot: DrawingItem[]) => {
    const cloned = snapshot.map(d => ({
      ...d,
      points: d.points.map(p => ({ ...p })),
    }));
    drawingHistoryRef.current = [...drawingHistoryRef.current.slice(-49), cloned];
  }, []);

  const handleAddDrawing = useCallback((item: DrawingItem) => {
    setDrawings(prev => {
      pushDrawingHistory(prev);
      const next = [...prev, item];
      try {
        localStorage.setItem(`mi007_drawings_${selectedSymbol}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    // Auto-revert back to Cursor / Pan & Crosshair mode if not locked
    if (!isDrawingModeLocked) {
      setActiveDrawingTool('NONE');
    }
  }, [selectedSymbol, isDrawingModeLocked, pushDrawingHistory]);

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
    if (isAllDrawingsLocked) return;
    setDrawings(prev => {
      const unlockedCount = prev.filter(d => !d.locked).length;
      if (unlockedCount === 0) return prev;
      pushDrawingHistory(prev);
      const remaining = prev.filter(d => d.locked);
      try {
        if (remaining.length > 0) {
          localStorage.setItem(`mi007_drawings_${selectedSymbol}`, JSON.stringify(remaining));
        } else {
          localStorage.removeItem(`mi007_drawings_${selectedSymbol}`);
        }
      } catch {}
      return remaining;
    });
    setSelectedDrawingId(null);
  }, [selectedSymbol, isAllDrawingsLocked, pushDrawingHistory]);

  const handleDeleteDrawing = useCallback((id: string) => {
    if (isAllDrawingsLocked) return;
    let wasDeleted = false;
    setDrawings(prev => {
      const target = prev.find(d => d.id === id);
      if (!target || target.locked) return prev;
      wasDeleted = true;
      pushDrawingHistory(prev);
      const next = prev.filter(d => d.id !== id);
      try {
        localStorage.setItem(`mi007_drawings_${selectedSymbol}`, JSON.stringify(next));
      } catch {}
      return next;
    });
    if (wasDeleted) {
      setSelectedDrawingId(curr => curr === id ? null : curr);
    }
  }, [selectedSymbol, isAllDrawingsLocked, pushDrawingHistory]);

  const handleUndoDrawing = useCallback(() => {
    setDrawings(prev => {
      if (drawingHistoryRef.current.length > 0) {
        const previousSnapshot = drawingHistoryRef.current[drawingHistoryRef.current.length - 1];
        drawingHistoryRef.current = drawingHistoryRef.current.slice(0, -1);
        try {
          localStorage.setItem(`mi007_drawings_${selectedSymbol}`, JSON.stringify(previousSnapshot));
        } catch {}
        return previousSnapshot;
      }
      if (isAllDrawingsLocked || prev.length === 0) return prev;
      // Fallback: remove last unlocked drawing
      const lastUnlockedIdx = [...prev].map((d, i) => (!d.locked ? i : -1)).filter(i => i !== -1).pop();
      if (lastUnlockedIdx === undefined) return prev;
      const next = prev.filter((_, idx) => idx !== lastUnlockedIdx);
      try {
        localStorage.setItem(`mi007_drawings_${selectedSymbol}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [selectedSymbol, isAllDrawingsLocked]);

  // Chart Template Action Handlers
  const handleSelectTemplate = useCallback((tpl: ChartTemplate) => {
    setActiveTemplateIdState(tpl.id);
    setActiveTemplateId(tpl.id);
    setTimeframe(tpl.timeframe);
    setChartType(tpl.chartType);
    setShowSmcOverlay(tpl.showSmcOverlay);
    if (tpl.smcConfig) setSmcConfig(tpl.smcConfig);
    setShowVolumeProfile(tpl.showVolumeProfile);
    setShowVolume(tpl.showVolume);

    if (tpl.indicatorConfigs && tpl.indicatorConfigs.length > 0) {
      const normalized = tpl.indicatorConfigs.map((cfg, idx) => ({
        ...cfg,
        id: cfg.id || `${cfg.type.toLowerCase()}-${Date.now()}-${idx}`,
        enabled: cfg.enabled ?? true,
      }));
      setIndicatorConfigs(normalized);
      try {
        localStorage.setItem('mi007_chart_indicators_v2', JSON.stringify(normalized));
      } catch {}
    } else if (tpl.activeIndicators && tpl.activeIndicators.length > 0) {
      const migrated: IndicatorConfig[] = tpl.activeIndicators.map((t, idx) => {
        const d = INDICATOR_DEFAULTS[t];
        const custom = tpl.customConfigs?.[t];
        return {
          id: `${t.toLowerCase()}-${Date.now()}-${idx}`,
          type: t,
          period: custom?.period ?? d.period,
          secondaryPeriod: custom?.secondaryPeriod ?? d.secondaryPeriod,
          tertiaryPeriod: custom?.tertiaryPeriod ?? d.tertiaryPeriod,
          multiplier: custom?.multiplier ?? d.multiplier,
          color: custom?.color ?? d.color,
          secondaryColor: custom?.secondaryColor ?? d.secondaryColor,
          tertiaryColor: custom?.tertiaryColor ?? d.tertiaryColor,
          enabled: true,
        };
      });
      setIndicatorConfigs(migrated);
      try {
        localStorage.setItem('mi007_chart_indicators_v2', JSON.stringify(migrated));
      } catch {}
    } else {
      setIndicatorConfigs([]);
      try {
        localStorage.removeItem('mi007_chart_indicators_v2');
      } catch {}
    }
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
      indicatorConfigs,
      showSmcOverlay,
      smcConfig,
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
  }, [timeframe, chartType, activeIndicators, indicatorConfigs, showSmcOverlay, smcConfig, showVolumeProfile, showVolume, templates]);

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
    setIndicatorConfigs([]);
    setShowSmcOverlay(false);
    setShowVolumeProfile(false);
    try {
      localStorage.removeItem('mi007_chart_indicators_v2');
    } catch {}
  }, []);

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
    const activeIndNames = indicatorConfigs.map(c => `${INDICATOR_DEFAULTS[c.type]?.label || c.type}(${c.period})`);
    if (showSmcOverlay) activeIndNames.push('SMC Pro');
    if (showVolumeProfile) activeIndNames.push('VPVR');
    const indString = activeIndNames.length > 0 ? `Active: ${activeIndNames.join(' · ')}` : 'Clean Technical View';
    ctx.fillText(indString, outerPad, fY + 10 * dpr);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#64748B';
    const timestampStr = `${new Date().toUTCString()} · Synthetix Analytics`;
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
    <div
      ref={fullscreenContainerRef}
      className={`flex flex-col h-full bg-white dark:bg-[#0B0F19] overflow-hidden relative transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] rounded-none border-none shadow-none w-screen h-screen'
          : isStandalone
          ? 'w-full h-full rounded-none border-none shadow-none'
          : 'rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs'
      }`}
    >
      {/* ── Top Instrument Search Bar ── */}
      <ChartSymbolSearch
        selectedSymbol={selectedSymbol}
        market={market}
        backHref={backHref}
        backLabel={backLabel}
        isStandalone={isStandalone}
        onSelectInstrument={(item: ChartInstrumentItem) => {
          setSelectedSymbol(item.symbol);
          if (typeof window !== 'undefined' && window.location.pathname.startsWith('/chart/')) {
            const url = new URL(window.location.href);
            url.pathname = `/chart/${item.symbol}`;
            if (item.market) {
              url.searchParams.set('market', item.market);
            }
            window.history.pushState(null, '', url.toString());
          }
        }}
      />

      {/* ── Top Dropdown Toolbar ── */}
      <ChartToolbar
        timeframe={timeframe}
        chartType={chartType}
        showVolume={showVolume}
        showVolumePanel={showVolumePanel}
        showSmcOverlay={showSmcOverlay}
        smcConfig={smcConfig}
        onSmcConfigChange={handleSmcConfigChange}
        showOrderFlow={orderFlowConfig.enabled}
        orderFlowConfig={orderFlowConfig}
        onToggleOrderFlow={() => handleOrderFlowConfigChange({ ...orderFlowConfig, enabled: !orderFlowConfig.enabled })}
        onOrderFlowConfigChange={handleOrderFlowConfigChange}
        orderFlowSignalsCount={orderFlowData?.signals.length || 0}
        onOpenOrderFlowSignals={() => setIsOfSignalsOpen(true)}
        showVolumeProfile={showVolumeProfile}
        activeIndicators={activeIndicators}
        indicators={indicatorConfigs}
        engineStatus={status}
        isLiveFromEngine={isLiveFromEngine}
        currency={currency}
        displayPrice={displayPrice}
        displayChange={displayChange}
        displayChangePct={displayChangePct}
        templates={templates}
        activeTemplateId={activeTemplateId}
        saveStatus={saveStatus}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onTimeframeChange={setTimeframe}
        onChartTypeChange={setChartType}
        onToggleVolume={() => setShowVolume(v => !v)}
        onToggleVolumePanel={() => setShowVolumePanel(v => !v)}
        onToggleSmcOverlay={() => setShowSmcOverlay(v => !v)}
        onToggleVolumeProfile={() => setShowVolumeProfile(v => !v)}
        onToggleIndicator={toggleIndicator}
        onAddIndicator={handleAddIndicator}
        onRemoveIndicator={handleRemoveIndicator}
        onToggleIndicatorVisibility={handleToggleIndicatorVisibility}
        onOpenIndicatorSettings={(idOrType) => setEditingIndicatorId(idOrType)}
        onSelectTemplate={handleSelectTemplate}
        onSaveToTemplate={handleSaveToTemplate}
        onRenameTemplate={handleRenameTemplate}
        onRemoveTemplate={handleRemoveTemplate}
        onSaveChartLayout={handleSaveChartLayout}
        onClearAllIndicators={handleClearAllIndicators}
        onExportSnapshot={handleExportSnapshot}
      />

      {/* ── OHLCV Bar with Symbol context ── */}
      <OHLCVHeader
        symbol={selectedSymbol}
        candle={hoveredCandle || lastCandle}
        currency={currency}
        timeframe={timeframe}
        currentPrice={hoveredCandle ? hoveredCandle.close : displayPrice}
      />

      {/* ── Main Chart Workspace: Left Institutional Drawing Toolbar + Canvas Area ── */}
      <div className="flex-1 min-h-0 flex flex-row relative bg-white">
        {/* Left Vertical Institutional Drawing Toolbar */}
        <DrawingToolbar
          activeDrawingTool={activeDrawingTool}
          cursorMode={cursorMode}
          onDrawingToolChange={handleSelectDrawingTool}
          onCursorModeChange={setCursorMode}
          onClearDrawings={handleClearDrawings}
          onUndoDrawing={handleUndoDrawing}
          onOpenObjectsTree={() => setIsDrawingsManagerOpen(true)}
          isMagnetActive={isMagnetActive}
          onToggleMagnet={() => setIsMagnetActive(m => !m)}
          isDrawingModeLocked={isDrawingModeLocked}
          onToggleDrawingModeLock={handleToggleDrawingModeLock}
          isAllDrawingsLocked={isAllDrawingsLocked}
          onToggleLockAllDrawings={() => setIsAllDrawingsLocked(l => !l)}
          isAllDrawingsHidden={isAllDrawingsHidden}
          onToggleHideAllDrawings={() => setIsAllDrawingsHidden(h => !h)}
          drawingsCount={drawings.length}
        />

        {/* Chart Canvas Area */}
        <div ref={chartWrapperRef} className="flex-1 min-h-0 relative bg-white overflow-hidden">
          {isLoadingCandles && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-xs pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[12px] mono font-bold shadow-md">
                <span className="w-3 h-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                <span>STREAMING FROM TRADE ENGINE...</span>
              </div>
            </div>
          )}

          <CandlestickCanvas
            candles={activeCandles}
            chartType={chartType}
            showVolume={showVolume}
            showVolumePanel={showVolumePanel}
            showSmcOverlay={showSmcOverlay}
            smcConfig={smcConfig}
            showOrderFlow={orderFlowConfig.enabled}
            orderFlowConfig={orderFlowConfig}
            orderFlowData={orderFlowData}
            showVolumeProfile={showVolumeProfile}
            showFnoOverlay={false}
            fnoLevels={undefined}
            strategyOverlay={undefined}
            indicators={indicatorConfigs}
            indicatorResults={indicatorResults}
            currentPriceOverride={displayPrice}
            timeframe={timeframe}
            targetCandleTime={targetCandleTime}
            targetSetupId={targetSetupId}
            activeDrawingTool={activeDrawingTool}
            cursorMode={cursorMode}
            drawings={drawings}
            selectedDrawingId={selectedDrawingId}
            isMagnetActive={isMagnetActive}
            isDrawingModeLocked={isDrawingModeLocked}
            isAllDrawingsLocked={isAllDrawingsLocked}
            isAllDrawingsHidden={isAllDrawingsHidden}
            onAddDrawing={handleAddDrawing}
            onUpdateDrawing={handleUpdateDrawing}
            onDeleteDrawing={handleDeleteDrawing}
            onSelectDrawing={setSelectedDrawingId}
            onUndoDrawing={handleUndoDrawing}
            onDrawingToolChange={handleSelectDrawingTool}
            onToggleMagnet={() => setIsMagnetActive(m => !m)}
            onToggleDrawingModeLock={handleToggleDrawingModeLock}
            onToggleLockAllDrawings={() => setIsAllDrawingsLocked(l => !l)}
            onToggleHideAllDrawings={() => setIsAllDrawingsHidden(h => !h)}
            onExportSnapshot={handleExportSnapshot}
            onOpenObjectTree={() => setIsDrawingsManagerOpen(true)}
            onHoverCandle={setHoveredCandle}
            className="h-full"
          />

          {/* Top-Left Inside Chart: Synthetix Analytics Brand & Active Indicator Legend */}
          <div
            className="absolute top-2 left-3 z-40 flex flex-wrap items-center gap-1.5 pointer-events-auto max-w-[calc(100%-90px)]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Synthetix Analytics Brand Pill */}
            <div className="flex items-center px-2.5 py-0.5 rounded-md bg-white/95 border border-slate-200 text-slate-800 font-mono text-[11px] font-black tracking-wider select-none shadow-xs pointer-events-none">
              <span>SYNTHETIX ANALYTICS</span>
            </div>

            {indicatorConfigs.map(cfg => {
                const instanceId = cfg.id || cfg.type;
                const isVis = cfg.enabled !== false;
                return (
                  <div
                    key={instanceId}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingIndicatorId(instanceId);
                    }}
                    title="Double-click to open settings"
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border shadow-sm text-[11px] font-mono group transition-colors cursor-pointer select-none ${
                      isVis
                        ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        : 'bg-white/70 border-slate-200/70 text-slate-400 line-through'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${!isVis ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="font-bold select-none">
                      {formatIndicatorBadgeLabel(cfg)}
                    </span>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleIndicatorVisibility(instanceId);
                      }}
                      title={isVis ? 'Hide Indicator' : 'Show Indicator'}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-[10px] cursor-pointer"
                    >
                      {isVis ? '👁' : '👁‍🗨'}
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingIndicatorId(instanceId);
                      }}
                      title="Settings"
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveIndicator(instanceId);
                      }}
                      title="Remove"
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors font-bold text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
        </div>
      </div>

      {/* ── Indicator Settings Modal ── */}
      {currentEditingConfig && (
        <IndicatorSettingsModal
          key={currentEditingConfig.id || currentEditingConfig.type}
          indicator={currentEditingConfig}
          isOpen={!!editingIndicatorId}
          onClose={() => setEditingIndicatorId(null)}
          onSave={handleSaveIndicatorConfig}
        />
      )}

      {/* ── Drawings Manager / Objects Tree Modal ── */}
      <DrawingsManagerModal
        isOpen={isDrawingsManagerOpen}
        onClose={() => setIsDrawingsManagerOpen(false)}
        drawings={drawings}
        selectedDrawingId={selectedDrawingId}
        isAllDrawingsLocked={isAllDrawingsLocked}
        onSelectDrawing={(id) => {
          setSelectedDrawingId(id);
        }}
        onUpdateDrawing={handleUpdateDrawing}
        onDeleteDrawing={handleDeleteDrawing}
        onClearAllDrawings={handleClearDrawings}
      />

      {/* ── Order Flow Signals & Setups Inspector Modal ── */}
      <OrderFlowSignalsModal
        isOpen={isOfSignalsOpen}
        onClose={() => setIsOfSignalsOpen(false)}
        signals={orderFlowData?.signals || []}
        symbol={selectedSymbol}
      />
    </div>
  );
}
