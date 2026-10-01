'use client';

import { Candle, IndicatorResult } from '@/lib/types';

// ─── Color constants matching crisp white theme ───────────────────────────
const C = {
  bg: '#FFFFFF',
  grid: 'rgba(0,0,0,0.06)',
  border: 'rgba(0,0,0,0.1)',
  bullish: '#10B981',
  bearish: '#EF4444',
  bullishBody: '#10B981',
  bearishBody: '#EF4444',
  priceAxis: '#64748B',
  crosshair: 'rgba(15,23,42,0.35)',
  crosshairLabel: '#FFFFFF',
  ohlcPositive: '#059669',
  ohlcNegative: '#DC2626',
  volumeUp: 'rgba(16,185,129,0.22)',
  volumeDown: 'rgba(239,68,68,0.22)',
  currentPrice: '#059669',
  emaColors: ['#0284C7', '#EA580C', '#7C3AED'],
  bollinger: '#7C3AED',
  vwap: '#D97706',
  rsi: '#7C3AED',
  macd: '#0284C7',
  macdSignal: '#EA580C',
  macdHistUp: 'rgba(16,185,129,0.7)',
  macdHistDown: 'rgba(239,68,68,0.7)',
};

const RIGHT_MARGIN = 64;
const BOTTOM_MARGIN = 22;

export interface ChartOptions {
  chartType: 'CANDLESTICK' | 'LINE' | 'AREA' | 'HEIKIN_ASHI';
  showVolume: boolean;
  indicators: IndicatorResult[];
  currentPrice?: number;
  timeframe: string;
}

/** Render a complete chart on the given canvas */
export function renderChart(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  options: ChartOptions,
  viewState: { startIdx: number; endIdx: number; zoom: number },
  crosshair: { x: number; y: number } | null,
  devicePixelRatio: number = 1
) {
  const { width, height } = ctx.canvas;
  const dpr = devicePixelRatio;

  if (candles.length === 0) {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const hasVolPanel = options.showVolume;
  const hasPanelIndicators = options.indicators.some(i => i.type === 'RSI' || i.type === 'MACD');
  const panelCount = (hasVolPanel ? 0 : 0) + (options.indicators.filter(i => i.type === 'RSI' || i.type === 'MACD').length);
  const panelFraction = panelCount === 0 ? 0 : panelCount === 1 ? 0.22 : 0.34;

  const chartW = width - RIGHT_MARGIN * dpr;
  const panelH = height * panelFraction;
  const chartH = height - panelH - BOTTOM_MARGIN * dpr;

  const { startIdx, endIdx } = viewState;
  const visible = candles.slice(startIdx, endIdx);
  if (visible.length === 0) return;

  let rawMin = Math.min(...visible.map(c => c.low));
  let rawMax = Math.max(...visible.map(c => c.high));
  if (options.currentPrice) {
    rawMin = Math.min(rawMin, options.currentPrice);
    rawMax = Math.max(rawMax, options.currentPrice);
  }
  // Include overlay indicator bounds
  for (const ind of options.indicators) {
    if (ind.type === 'EMA' || ind.type === 'SMA' || ind.type === 'BOLLINGER' || ind.type === 'VWAP') {
      for (let i = startIdx; i < endIdx; i++) {
        const v = ind.values[i];
        if (v != null) { rawMin = Math.min(rawMin, v); rawMax = Math.max(rawMax, v); }
        if (ind.values2) {
          const v2 = ind.values2[i];
          if (v2 != null) { rawMin = Math.min(rawMin, v2); rawMax = Math.max(rawMax, v2); }
        }
      }
    }
  }
  const pad = Math.max((rawMax - rawMin) * 0.06, rawMin * 0.001);
  const priceMin = rawMin - pad;
  const priceMax = rawMax + pad;
  const priceRange = priceMax - priceMin || 1;

  const candleW = chartW / visible.length;
  const toY = (price: number) => chartH - ((price - priceMin) / priceRange) * chartH;
  const toX = (i: number) => i * candleW + candleW / 2;

  // ── Clear ──
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, width, height);

  // ── Layer 1: Grid ──────────────────────────────────────────────────────────
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 0.5 * dpr;
  ctx.setLineDash([2 * dpr, 4 * dpr]);
  const gridRows = 6;
  for (let row = 0; row <= gridRows; row++) {
    const y = (chartH / gridRows) * row;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartW, y);
    ctx.stroke();
  }
  const gridCols = Math.min(visible.length, 8);
  for (let col = 0; col <= gridCols; col++) {
    const x = (chartW / gridCols) * col;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, chartH);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // ── Layer 2: Volume bars (behind candles) ─────────────────────────────────
  if (options.showVolume) {
    const maxVol = Math.max(...visible.map(c => c.volume));
    const volH = chartH * 0.15;
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i];
      const barH = (c.volume / maxVol) * volH;
      const x = toX(i) - candleW * 0.4;
      ctx.fillStyle = c.close >= c.open ? C.volumeUp : C.volumeDown;
      ctx.fillRect(x, chartH - barH, candleW * 0.8, barH);
    }
  }

  // ── Clip to chart area ────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, chartW, chartH);
  ctx.clip();

  // ── Layer 3: Bollinger Band fill ──────────────────────────────────────────
  const bollInd = options.indicators.find(i => i.type === 'BOLLINGER');
  if (bollInd) {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < visible.length; i++) {
      const upper = bollInd.values[startIdx + i];
      if (upper == null) continue;
      const x = toX(i);
      const y = toY(upper);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      const lower = bollInd.values2?.[startIdx + i];
      if (lower == null) continue;
      ctx.lineTo(toX(i), toY(lower));
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(156,39,176,0.08)';
    ctx.fill();

    // Upper / lower / middle lines
    for (const [vals, col] of [
      [bollInd.values, C.bollinger],
      [bollInd.values2, C.bollinger],
      [bollInd.values3, '#9C27B0'],
    ] as [Array<number | null>, string][]) {
      if (!vals) continue;
      ctx.strokeStyle = col;
      ctx.lineWidth = 0.8 * dpr;
      ctx.setLineDash(vals === bollInd.values3 ? [3 * dpr, 3 * dpr] : []);
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < visible.length; i++) {
        const v = vals[startIdx + i];
        if (v == null) { first = true; continue; }
        const x = toX(i); const y = toY(v);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── Layer 4: Overlay line indicators (EMA, SMA, VWAP) ────────────────────
  const overlayColors: Record<string, string> = { EMA: C.emaColors[0], SMA: '#FF9800', VWAP: C.vwap };
  let emaIdx = 0;
  for (const ind of options.indicators) {
    if (ind.type !== 'EMA' && ind.type !== 'SMA' && ind.type !== 'VWAP') continue;
    const color = ind.type === 'EMA' ? C.emaColors[emaIdx++ % 3] : overlayColors[ind.type];
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < visible.length; i++) {
      const v = ind.values[startIdx + i];
      if (v == null) { first = true; continue; }
      const x = toX(i); const y = toY(v);
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ── Layer 5: Candles ──────────────────────────────────────────────────────
  const visCandles = options.chartType === 'HEIKIN_ASHI'
    ? toHeikinAshi(visible)
    : visible;

  if (options.chartType === 'LINE') {
    ctx.strokeStyle = C.bullish;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    visCandles.forEach((c, i) => {
      const x = toX(i); const y = toY(c.close);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  } else if (options.chartType === 'AREA') {
    ctx.beginPath();
    visCandles.forEach((c, i) => {
      const x = toX(i); const y = toY(c.close);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(toX(visCandles.length - 1), chartH);
    ctx.lineTo(toX(0), chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, chartH);
    grad.addColorStop(0, 'rgba(0,230,118,0.28)');
    grad.addColorStop(1, 'rgba(0,230,118,0.02)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = C.bullish;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    visCandles.forEach((c, i) => {
      const x = toX(i); const y = toY(c.close);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  } else {
    // Candlestick / Heikin-Ashi
    const bodyW = Math.max(candleW * 0.55, 1.5 * dpr);
    for (let i = 0; i < visCandles.length; i++) {
      const c = visCandles[i];
      const isBull = c.close >= c.open;
      const color = isBull ? C.bullish : C.bearish;
      const x = toX(i);
      const openY = toY(c.open);
      const closeY = toY(c.close);
      const highY = toY(c.high);
      const lowY = toY(c.low);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.8 * dpr, 1);
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1.5 * dpr);
      ctx.fillStyle = isBull
        ? (options.chartType === 'HEIKIN_ASHI' ? color : color)
        : color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyHeight);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();

  // ── Layer 6: Current price line ──────────────────────────────────────────
  const lastClose = options.currentPrice ?? candles[candles.length - 1].close;
  const priceY = toY(lastClose);
  if (priceY >= 0 && priceY <= chartH) {
    ctx.strokeStyle = C.currentPrice;
    ctx.lineWidth = 0.8 * dpr;
    ctx.setLineDash([4 * dpr, 3 * dpr]);
    ctx.beginPath();
    ctx.moveTo(0, priceY);
    ctx.lineTo(chartW, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price badge on right axis
    const label = lastClose.toFixed(2);
    const badgeW = 62 * dpr;
    const badgeH = 18 * dpr;
    ctx.fillStyle = C.currentPrice;
    ctx.fillRect(chartW, priceY - badgeH / 2, badgeW, badgeH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${12 * dpr}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, chartW + badgeW / 2, priceY);
  }

  // ── Layer 7: Price axis (right margin) ───────────────────────────────────
  ctx.font = `${12 * dpr}px JetBrains Mono, monospace`;
  ctx.fillStyle = C.priceAxis;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const gridSteps = 6;
  for (let step = 0; step <= gridSteps; step++) {
    const price = priceMin + (priceRange / gridSteps) * step;
    const y = toY(price);
    if (y < 0 || y > chartH) continue;
    ctx.fillText(price.toFixed(price > 1000 ? 0 : 2), chartW + 4 * dpr, y);
  }

  // ── Layer 8: Time axis ───────────────────────────────────────────────────
  ctx.fillStyle = C.priceAxis;
  ctx.font = `${11 * dpr}px JetBrains Mono, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const step = Math.max(1, Math.floor(visible.length / 6));
  for (let i = 0; i < visible.length; i += step) {
    const c = visible[i];
    const x = toX(i);
    if (x < 0 || x > chartW) continue;
    const date = new Date(c.openTime);
    const label = formatTimeLabel(date, options.timeframe);
    ctx.fillText(label, x, chartH + 4 * dpr);
  }

  // ── Layer 9: Sub-panel indicators (RSI, MACD) ───────────────────────────
  if (panelH > 0) {
    const panelInds = options.indicators.filter(i => i.type === 'RSI' || i.type === 'MACD');
    const perPanelH = panelH / panelInds.length;
    panelInds.forEach((ind, pi) => {
      const panelTop = height - panelH + pi * perPanelH;
      // Panel background
      ctx.fillStyle = 'rgba(248, 250, 252, 0.95)';
      ctx.fillRect(0, panelTop, chartW, perPanelH);
      // Divider
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 0.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, panelTop);
      ctx.lineTo(chartW, panelTop);
      ctx.stroke();

      if (ind.type === 'RSI') {
        renderRSIPanel(ctx, ind, startIdx, visible.length, panelTop, perPanelH, chartW, dpr, toX);
      } else if (ind.type === 'MACD') {
        renderMACDPanel(ctx, ind, startIdx, visible.length, panelTop, perPanelH, chartW, dpr, toX);
      }

      // Label
      const labelColor = ind.type === 'RSI' ? C.rsi : C.macd;
      ctx.fillStyle = labelColor;
      ctx.font = `bold ${11 * dpr}px JetBrains Mono, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(ind.type, 6 * dpr, panelTop + 8 * dpr);
    });
  }

  // ── Layer 10: Crosshair ───────────────────────────────────────────────────
  if (crosshair) {
    ctx.strokeStyle = C.crosshair;
    ctx.lineWidth = 0.5 * dpr;
    ctx.setLineDash([3 * dpr, 3 * dpr]);
    // Vertical
    ctx.beginPath();
    ctx.moveTo(crosshair.x, 0);
    ctx.lineTo(crosshair.x, chartH);
    ctx.stroke();
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(0, crosshair.y);
    ctx.lineTo(chartW, crosshair.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label on axis
    if (crosshair.y >= 0 && crosshair.y <= chartH) {
      const crossPrice = priceMax - (crosshair.y / chartH) * priceRange;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(chartW, crosshair.y - 9 * dpr, 62 * dpr, 18 * dpr);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${12 * dpr}px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(crossPrice.toFixed(2), chartW + 31 * dpr, crosshair.y);
    }
  }
}

function renderRSIPanel(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorResult,
  startIdx: number,
  visLen: number,
  panelTop: number,
  panelH: number,
  chartW: number,
  dpr: number,
  toX: (i: number) => number
) {
  const candleW = chartW / visLen;
  const toY = (v: number) => panelTop + panelH - (v / 100) * panelH;

  // Overbought/oversold guides
  ctx.strokeStyle = 'rgba(255,23,68,0.3)';
  ctx.lineWidth = 0.5 * dpr;
  ctx.setLineDash([2 * dpr, 3 * dpr]);
  ctx.beginPath();
  ctx.moveTo(0, toY(70)); ctx.lineTo(chartW, toY(70));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,230,118,0.3)';
  ctx.beginPath();
  ctx.moveTo(0, toY(30)); ctx.lineTo(chartW, toY(30));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = '#AB47BC';
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  let first = true;
  for (let i = 0; i < visLen; i++) {
    const v = ind.values[startIdx + i];
    if (v == null) { first = true; continue; }
    const x = toX(i); const y = toY(v);
    if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // RSI value labels
  ctx.fillStyle = '#64748B';
  ctx.font = `${10 * dpr}px JetBrains Mono, monospace`;
  ctx.textAlign = 'right';
  ctx.fillText('70', chartW - 2 * dpr, toY(70) - 4 * dpr);
  ctx.fillText('30', chartW - 2 * dpr, toY(30) - 4 * dpr);
}

function renderMACDPanel(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorResult,
  startIdx: number,
  visLen: number,
  panelTop: number,
  panelH: number,
  chartW: number,
  dpr: number,
  toX: (i: number) => number
) {
  const hist = ind.values3;
  const macd = ind.values;
  const signal = ind.values2;

  const vals = [
    ...macd.slice(startIdx, startIdx + visLen),
    ...(signal?.slice(startIdx, startIdx + visLen) ?? []),
    ...(hist?.slice(startIdx, startIdx + visLen) ?? []),
  ].filter((v): v is number => v != null);

  if (vals.length === 0) return;
  const absMax = Math.max(Math.abs(Math.min(...vals)), Math.abs(Math.max(...vals)));
  const panelRange = absMax * 2 || 1;
  const zero = panelTop + panelH / 2;
  const toY = (v: number) => zero - (v / (panelRange / 2)) * (panelH / 2);

  // Zero line
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 0.5 * dpr;
  ctx.beginPath();
  ctx.moveTo(0, zero); ctx.lineTo(chartW, zero);
  ctx.stroke();

  // Histogram bars
  if (hist) {
    const barW = Math.max((chartW / visLen) * 0.6, 1 * dpr);
    for (let i = 0; i < visLen; i++) {
      const v = hist[startIdx + i];
      if (v == null) continue;
      const x = toX(i);
      ctx.fillStyle = v >= 0 ? C.macdHistUp : C.macdHistDown;
      ctx.fillRect(x - barW / 2, Math.min(zero, toY(v)), barW, Math.abs(toY(v) - zero));
    }
  }

  // MACD line
  ctx.strokeStyle = C.macd;
  ctx.lineWidth = 1.2 * dpr;
  ctx.beginPath();
  let first = true;
  for (let i = 0; i < visLen; i++) {
    const v = macd[startIdx + i];
    if (v == null) { first = true; continue; }
    const x = toX(i); const y = toY(v);
    if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Signal line
  if (signal) {
    ctx.strokeStyle = C.macdSignal;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    first = true;
    for (let i = 0; i < visLen; i++) {
      const v = signal[startIdx + i];
      if (v == null) { first = true; continue; }
      const x = toX(i); const y = toY(v);
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function toHeikinAshi(candles: Candle[]): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0
      ? (c.open + c.close) / 2
      : (result[i - 1].open + result[i - 1].close) / 2;
    result.push({
      ...c,
      open: haOpen,
      high: Math.max(c.high, haOpen, haClose),
      low: Math.min(c.low, haOpen, haClose),
      close: haClose,
    });
  }
  return result;
}

function formatTimeLabel(date: Date, timeframe: string): string {
  if (timeframe === '1D' || timeframe === '1W') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
