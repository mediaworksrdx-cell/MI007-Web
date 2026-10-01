'use client';

import {
  useRef, useEffect, useCallback, useState, useLayoutEffect
} from 'react';
import { Candle, IndicatorResult } from '@/lib/types';
import { renderChart, ChartOptions } from '@/lib/chartRenderer';

interface CandlestickCanvasProps extends ChartOptions {
  candles: Candle[];
  className?: string;
}

const VISIBLE_CANDLES_BASE = 60;

export function CandlestickCanvas({
  candles,
  chartType,
  showVolume,
  indicators,
  currentPrice,
  timeframe,
  className = '',
}: CandlestickCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0); // candles from right
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [dpr, setDpr] = useState(1);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Detect device pixel ratio
  useLayoutEffect(() => {
    setDpr(window.devicePixelRatio || 1);
  }, []);

  // Resize observer
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

  // Set canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0) return;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
  }, [size, dpr]);

  // Compute viewport
  const visibleCount = Math.max(8, Math.round(VISIBLE_CANDLES_BASE / zoom));
  const endIdx = Math.max(
    visibleCount,
    candles.length - Math.round(scrollOffset)
  );
  const clampedEnd = Math.min(endIdx, candles.length);
  const clampedStart = Math.max(0, clampedEnd - visibleCount);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w === 0 || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderChart(
      ctx,
      candles,
      { chartType, showVolume, indicators, currentPrice, timeframe },
      { startIdx: clampedStart, endIdx: clampedEnd, zoom },
      crosshair ? { x: crosshair.x * dpr, y: crosshair.y * dpr } : null,
      dpr
    );
  }, [candles, chartType, showVolume, indicators, currentPrice, timeframe,
      clampedStart, clampedEnd, zoom, crosshair, size, dpr]);

  // Pointer events
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    setCrosshair({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);
  const handlePointerLeave = useCallback(() => setCrosshair(null), []);

  // Wheel zoom + scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      setZoom(z => Math.max(0.2, Math.min(5, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    } else {
      const delta = e.deltaY > 0 ? -3 : 3;
      setScrollOffset(s => Math.max(0, Math.min(candles.length - visibleCount, s - delta)));
    }
  }, [candles.length, visibleCount]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Touch pan
  const lastTouchX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    lastTouchX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (lastTouchX.current === null) return;
    const dx = e.touches[0].clientX - lastTouchX.current;
    const candlePixels = (size.w - 64) / visibleCount;
    const deltaCandleCount = -dx / candlePixels;
    setScrollOffset(s => Math.max(0, Math.min(candles.length - visibleCount, s + deltaCandleCount)));
    lastTouchX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => { lastTouchX.current = null; };

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="chart block w-full h-full select-none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {/* Scroll-to-live button */}
      {scrollOffset > 5 && (
        <button
          onClick={() => setScrollOffset(0)}
          className="absolute bottom-8 right-20 rounded-full border border-border-navy bg-surface-card/90 px-2.5 py-1 text-[11px] font-bold text-text-secondary hover:text-mint-green hover:border-mint-green transition-all mono"
        >
          »» LIVE
        </button>
      )}
    </div>
  );
}
