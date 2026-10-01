'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Candle, IndicatorResult, IndicatorType, Timeframe, MarketType, INSTRUMENTS } from '@/lib/types';
import { getMockCandles, getMockQuote } from '@/lib/mockData';
import { calculateEMA, calculateSMA, calculateBollinger, calculateVWAP, calculateRSI, calculateMACD } from '@/lib/indicators';
import { TickSimulator } from '@/lib/tickSimulator';
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
  const [chartType, setChartType] = useState<'CANDLESTICK' | 'LINE' | 'AREA' | 'HEIKIN_ASHI'>('CANDLESTICK');
  const [showVolume, setShowVolume] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(['EMA']);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>();

  const currency = instruments[0].currency;

  // Reset symbol when market changes
  useEffect(() => {
    setSelectedSymbol(INSTRUMENTS[market][0].symbol);
  }, [market]);

  // Load candles on symbol/timeframe change
  useEffect(() => {
    const data = getMockCandles(market, selectedSymbol, timeframe, 300);
    setCandles(data);
    setCurrentPrice(data[data.length - 1]?.close);
  }, [market, selectedSymbol, timeframe]);

  // Live tick simulator
  useEffect(() => {
    if (candles.length === 0) return;
    const sim = new TickSimulator({
      market,
      symbol: selectedSymbol,
      timeframeMs: TIMEFRAME_MS[timeframe] ?? TIMEFRAME_MS['1H'],
      intervalMs: 1200,
      onTick: (updatedCandle, isNew) => {
        setCurrentPrice(updatedCandle.close);
        setCandles(prev => {
          if (prev.length === 0) return prev;
          if (isNew) return [...prev, updatedCandle];
          const next = [...prev];
          next[next.length - 1] = updatedCandle;
          return next;
        });
      },
    });
    sim.start(candles);
    return () => sim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, selectedSymbol, timeframe]);

  // Compute indicators
  const indicators: IndicatorResult[] = useMemo(() => {
    const results: IndicatorResult[] = [];
    for (const name of activeIndicators) {
      if (name === 'EMA') {
        results.push({ type: 'EMA', values: calculateEMA(candles, 21) });
        results.push({ type: 'EMA', values: calculateEMA(candles, 9) });
      } else if (name === 'SMA') {
        results.push({ type: 'SMA', values: calculateSMA(candles, 20) });
      } else if (name === 'BOLLINGER') {
        const b = calculateBollinger(candles, 20, 2);
        results.push({ type: 'BOLLINGER', values: b.upper, values2: b.lower, values3: b.middle });
      } else if (name === 'VWAP') {
        results.push({ type: 'VWAP', values: calculateVWAP(candles) });
      } else if (name === 'RSI') {
        results.push({ type: 'RSI', values: calculateRSI(candles, 14) });
      } else if (name === 'MACD') {
        const m = calculateMACD(candles, 12, 26, 9);
        results.push({ type: 'MACD', values: m.macd, values2: m.signal, values3: m.histogram });
      }
    }
    return results;
  }, [candles, activeIndicators]);

  const toggleIndicator = useCallback((name: string) => {
    setActiveIndicators(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }, []);

  const lastCandle = candles[candles.length - 1] ?? null;
  const quote = useMemo(() => getMockQuote(market, selectedSymbol), [market, selectedSymbol]);

  return (
    <div className="flex flex-col h-full rounded-xl border border-border-navy bg-surface-card overflow-hidden shadow-card">
      {/* ── Instrument Tabs ── */}
      <div className="flex items-center gap-0.5 border-b border-border-navy px-2 pt-2 overflow-x-auto">
        {instruments.map(inst => {
          const isSelected = inst.symbol === selectedSymbol;
          return (
            <button
              key={inst.symbol}
              onClick={() => setSelectedSymbol(inst.symbol)}
              className={`flex-shrink-0 px-3.5 py-1.5 text-[14px] font-bold mono rounded-t border transition-all ${
                isSelected
                  ? 'border-border-navy border-b-surface-card bg-surface-card text-mint-green -mb-px'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {inst.symbol}
            </button>
          );
        })}

        {/* Live quote on the right */}
        {lastCandle && (
          <div className="ml-auto flex items-center gap-3 px-3 pb-1.5 flex-shrink-0">
            <span className="mono text-[16px] font-black text-text-primary">
              {currency}{(currentPrice ?? lastCandle.close).toLocaleString()}
            </span>
            <span className={`mono text-[14px] font-bold ${quote.change >= 0 ? 'text-mint-green' : 'text-crimson-red'}`}>
              {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePct.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* ── Toolbar ── */}
      <ChartToolbar
        timeframe={timeframe}
        chartType={chartType}
        showVolume={showVolume}
        activeIndicators={activeIndicators}
        onTimeframeChange={setTimeframe}
        onChartTypeChange={ct => setChartType(ct as typeof chartType)}
        onToggleVolume={() => setShowVolume(v => !v)}
        onToggleIndicator={toggleIndicator}
      />

      {/* ── OHLCV Header ── */}
      <OHLCVHeader
        candle={lastCandle}
        currency={currency}
        timeframe={timeframe}
        currentPrice={currentPrice}
      />

      {/* ── Chart ── */}
      <div className="flex-1 min-h-0 bg-white">
        <CandlestickCanvas
          candles={candles}
          chartType={chartType}
          showVolume={showVolume}
          indicators={indicators}
          currentPrice={currentPrice}
          timeframe={timeframe}
          className="h-full bg-white"
        />
      </div>

      {/* ── Active Indicator Badges ── */}
      {activeIndicators.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border-navy px-3 py-2 bg-slate-50/50">
          {activeIndicators.map(name => (
            <div key={name} className="flex items-center gap-1.5 rounded-full border border-border-navy bg-white px-2.5 py-1 text-[13px] mono shadow-xs">
              <span className="w-2 h-2 rounded-full bg-mint-green" />
              <span className="text-text-secondary font-bold">{name}</span>
              <button
                onClick={() => toggleIndicator(name)}
                className="ml-0.5 text-text-muted hover:text-crimson-red transition-colors font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
