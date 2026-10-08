'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAppTheme } from '@/lib/themeContext';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  signal?: 'BUY' | 'SELL';
  pattern?: string;
  aiInsight?: {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    conviction: number;
    title: string;
    details: string;
    institutionalAction: string;
  };
}

const SYMBOLS_DATA = [
  {
    name: 'S&P 500',
    basePrice: 5864.2,
    spread: 0.25,
    currency: '$',
    change: '+0.82%',
    isPositive: true,
  },
  {
    name: 'NIFTY 50',
    basePrice: 24842.5,
    spread: 0.5,
    currency: '₹',
    change: '+1.40%',
    isPositive: true,
  },
  {
    name: 'DFM GENERAL',
    basePrice: 4921.1,
    spread: 0.1,
    currency: 'AED ',
    change: '+1.15%',
    isPositive: true,
  },
  {
    name: 'BTC/USD',
    basePrice: 68410.0,
    spread: 5.0,
    currency: '$',
    change: '+3.24%',
    isPositive: true,
  },
];

export default function MarketTerminalSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme, isDark } = useAppTheme();

  const [activeSymbolIdx, setActiveSymbolIdx] = useState(0);
  const [timeframe, setTimeframe] = useState('15m');
  const [showRsi, setShowRsi] = useState(true);
  const [showMacd, setShowMacd] = useState(true);
  const [showPatterns, setShowPatterns] = useState(true);
  const [showSignals, setShowSignals] = useState(true);

  // Interactive Hover Inspection State
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [pinnedCandle, setPinnedCandle] = useState<CandleData | null>(null);

  // Candlestick Array
  const [candles, setCandles] = useState<CandleData[]>([]);
  const activeSymbol = SYMBOLS_DATA[activeSymbolIdx];

  // Generate synthetic candles for the selected symbol
  const generateInitialData = useCallback((base: number) => {
    const list: CandleData[] = [];
    let price = base * 0.985;
    const now = Date.now();

    for (let i = 0; i < 65; i++) {
      const timeStr = new Date(now - (65 - i) * 15 * 60 * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const drift = (Math.random() - 0.47) * (base * 0.0035);
      const open = price;
      const close = price + drift;
      const wick1 = Math.random() * (base * 0.002);
      const wick2 = Math.random() * (base * 0.002);
      const high = Math.max(open, close) + wick1;
      const low = Math.min(open, close) - wick2;
      const volume = Math.floor(1200 + Math.random() * 4500);

      let signal: 'BUY' | 'SELL' | undefined;
      let pattern: string | undefined;
      let aiInsight = undefined;

      // Smart annotations at pivot intervals
      if (i === 18) {
        signal = 'BUY';
        pattern = 'Bullish Order Block (OB)';
        aiInsight = {
          sentiment: 'BULLISH' as const,
          conviction: 94,
          title: 'Order Block Re-accumulation',
          details: 'Institutional absorption detected. Buy-side liquidity swept before continuation.',
          institutionalAction: 'Aggressive Spot & Futures Long delta',
        };
      } else if (i === 34) {
        pattern = 'Fair Value Gap (FVG)';
        aiInsight = {
          sentiment: 'BULLISH' as const,
          conviction: 88,
          title: 'Imbalance Fill & Rebound',
          details: 'Price retested liquidity void cleanly with zero slippage.',
          institutionalAction: 'Passive limit replenishment',
        };
      } else if (i === 48) {
        signal = 'SELL';
        pattern = 'Liquidity Sweep (Highs)';
        aiInsight = {
          sentiment: 'BEARISH' as const,
          conviction: 82,
          title: 'Resistance Rejection',
          details: 'Stop hunts above recent pivot cleared; short delta buildup.',
          institutionalAction: 'Gamma hedging & profit realization',
        };
      } else if (i === 58) {
        signal = 'BUY';
        pattern = 'Break of Structure (BOS)';
        aiInsight = {
          sentiment: 'BULLISH' as const,
          conviction: 96,
          title: 'Structural Bullish Breakout',
          details: 'Multi-timeframe momentum alignment with expanding volume profile.',
          institutionalAction: 'Smart money block absorption',
        };
      } else {
        aiInsight = {
          sentiment: close >= open ? ('BULLISH' as const) : ('BEARISH' as const),
          conviction: Math.floor(70 + Math.random() * 25),
          title: close >= open ? 'Bullish Drift' : 'Pullback Consolidation',
          details: `Microstructure volume: ${volume.toLocaleString()} contracts. Normal variance.`,
          institutionalAction: 'Balanced algorithmic two-way market',
        };
      }

      list.push({ time: timeStr, open, high, low, close, volume, signal, pattern, aiInsight });
      price = close;
    }
    return list;
  }, []);

  // Reset candles when symbol changes
  useEffect(() => {
    const data = generateInitialData(activeSymbol.basePrice);
    setCandles(data);
    setHoveredCandle(data[data.length - 1]);
  }, [activeSymbolIdx, activeSymbol.basePrice, generateInitialData]);

  // Live real-time tick pulse simulator
  useEffect(() => {
    if (!isInView || candles.length === 0) return;

    const interval = setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = { ...prev[prev.length - 1] };
        const tick = (Math.random() - 0.48) * (activeSymbol.basePrice * 0.0006);
        last.close = Number((last.close + tick).toFixed(2));
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        last.volume += Math.floor(10 + Math.random() * 45);

        const next = [...prev];
        next[next.length - 1] = last;
        return next;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [isInView, candles.length, activeSymbol.basePrice]);

  // Canvas Render Loop
  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Panel heights
    const subH = (showRsi ? 60 : 0) + (showMacd ? 60 : 0);
    const mainH = h - subH - 30; // 30px bottom time axis
    const rsiY = mainH;
    const macdY = mainH + (showRsi ? 60 : 0);

    ctx.clearRect(0, 0, w, h);

    // ── 1. Themed Chart Surface ──
    const chartBg = isDark
      ? theme === 'capital'
        ? '#0B132B'
        : '#181C24' // graphite
      : theme === 'ivory'
      ? '#F7F4EB'
      : '#EDF5FA'; // arctic

    ctx.fillStyle = chartBg;
    ctx.fillRect(0, 0, w, h);

    // Subtle horizontal price level references only
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    for (let step = 1; step <= 4; step++) {
      const y = (mainH / 5) * step;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w - 70, y);
      ctx.stroke();
    }

    // Right axis boundary line
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.moveTo(w - 70, 0);
    ctx.lineTo(w - 70, h);
    ctx.stroke();

    const n = candles.length;
    const candleW = (w - 70) / n; // 70px right price axis
    const pad = candleW * 0.22;
    const bodyW = Math.max(2.5, candleW - pad * 2);

    const minP = Math.min(...candles.map((c) => c.low));
    const maxP = Math.max(...candles.map((c) => c.high));
    const range = maxP - minP || 1;
    const getY = (p: number) => 24 + (1 - (p - minP) / range) * (mainH - 48);

    // ── 2. Support & Resistance Zones ──
    const supP = minP + range * 0.16;
    const resP = minP + range * 0.84;

    // Support Band
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(0, getY(supP) - 10, w - 70, 20);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, getY(supP));
    ctx.lineTo(w - 70, getY(supP));
    ctx.stroke();
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.fillText(`KEY SUPPORT // ${supP.toFixed(1)}`, 14, getY(supP) - 4);

    // Resistance Band
    ctx.fillStyle = 'rgba(225, 29, 72, 0.08)';
    ctx.fillRect(0, getY(resP) - 10, w - 70, 20);
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, getY(resP));
    ctx.lineTo(w - 70, getY(resP));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#E11D48';
    ctx.fillText(`LIQUIDITY CEILING // ${resP.toFixed(1)}`, 14, getY(resP) - 4);

    // ── 3. Pattern Recognition Overlay Zones ──
    if (showPatterns) {
      // Order Block (around index 18)
      if (candles[18]) {
        const obX = 16 * candleW;
        const obW = 12 * candleW;
        const obY = getY(candles[18].low);
        ctx.fillStyle = 'rgba(2, 132, 199, 0.09)';
        ctx.fillRect(obX, obY - 14, obW, 28);
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.5)';
        ctx.strokeRect(obX, obY - 14, obW, 28);
        ctx.fillStyle = '#0284C7';
        ctx.font = 'bold 12px JetBrains Mono, monospace';
        ctx.fillText('H4 BULLISH ORDER BLOCK', obX + 6, obY - 2);
      }

      // Fair Value Gap (around index 34)
      if (candles[34]) {
        const fvgX = 33 * candleW;
        const fvgW = 10 * candleW;
        const fvgY = getY(candles[34].high);
        ctx.fillStyle = 'rgba(217, 119, 6, 0.09)';
        ctx.fillRect(fvgX, fvgY - 10, fvgW, 20);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.5)';
        ctx.strokeRect(fvgX, fvgY - 10, fvgW, 20);
        ctx.fillStyle = '#B45309';
        ctx.font = 'bold 12px JetBrains Mono, monospace';
        ctx.fillText('FVG (IMBALANCE)', fvgX + 6, fvgY - 1);
      }
    }

    // ── 4. Volume Bars & Candlesticks ──
    const maxVol = Math.max(...candles.map((c) => c.volume));
    candles.forEach((c, i) => {
      const x = i * candleW + pad;
      const isBull = c.close >= c.open;
      const color = isBull ? '#10B981' : '#EF4444';

      // Volume bar
      const volH = (c.volume / maxVol) * (mainH * 0.16);
      ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(x, mainH - volH, bodyW, volH);

      // Candlestick Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x + bodyW / 2, getY(c.high));
      ctx.lineTo(x + bodyW / 2, getY(c.low));
      ctx.stroke();

      // Candlestick Body
      ctx.fillStyle = isBull ? '#10B981' : '#EF4444';
      const yOpen = getY(c.open);
      const yClose = getY(c.close);
      ctx.fillRect(x, Math.min(yOpen, yClose), bodyW, Math.max(1.8, Math.abs(yOpen - yClose)));

      // Signal Arrows (Buy / Sell)
      if (showSignals && c.signal) {
        if (c.signal === 'BUY') {
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          ctx.moveTo(x + bodyW / 2, getY(c.low) + 14);
          ctx.lineTo(x + bodyW / 2 - 4, getY(c.low) + 22);
          ctx.lineTo(x + bodyW / 2 + 4, getY(c.low) + 22);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#DC2626';
          ctx.beginPath();
          ctx.moveTo(x + bodyW / 2, getY(c.high) - 14);
          ctx.lineTo(x + bodyW / 2 - 4, getY(c.high) - 22);
          ctx.lineTo(x + bodyW / 2 + 4, getY(c.high) - 22);
          ctx.closePath();
          ctx.fill();
        }
      }
    });

    // ── 5. EMA 21 Dynamic Overlaid Line ──
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    candles.forEach((c, i) => {
      const x = i * candleW + candleW / 2;
      const y = getY(c.close) + Math.sin(i * 0.3) * 3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // ── 6. Subpanels: RSI (14) & MACD ──
    const subBg = isDark
      ? theme === 'capital'
        ? '#131E3D'
        : '#222733' // graphite
      : theme === 'ivory'
      ? '#FAF7F0'
      : '#F4F9FD'; // arctic
    const subBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    const textSub = isDark ? '#94A3B8' : '#475569';

    if (showRsi) {
      ctx.fillStyle = subBg;
      ctx.fillRect(0, rsiY, w - 70, 58);
      ctx.strokeStyle = subBorder;
      ctx.beginPath();
      ctx.moveTo(0, rsiY);
      ctx.lineTo(w - 70, rsiY);
      ctx.stroke();

      ctx.fillStyle = textSub;
      ctx.font = 'bold 12px monospace';
      ctx.fillText('RSI (14)', 12, rsiY + 16);
      ctx.fillStyle = '#0284C7';
      ctx.fillText('62.8', 75, rsiY + 16);

      // Oversold / Overbought levels
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, rsiY + 18);
      ctx.lineTo(w - 70, rsiY + 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, rsiY + 42);
      ctx.lineTo(w - 70, rsiY + 42);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#7C3AED';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      candles.forEach((_, i) => {
        const x = i * candleW + candleW / 2;
        const val = 50 + Math.sin(i * 0.22) * 20;
        const y = rsiY + (1 - val / 100) * 56;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    if (showMacd) {
      ctx.fillStyle = subBg;
      ctx.fillRect(0, macdY, w - 70, 58);
      ctx.strokeStyle = subBorder;
      ctx.beginPath();
      ctx.moveTo(0, macdY);
      ctx.lineTo(w - 70, macdY);
      ctx.stroke();

      ctx.fillStyle = textSub;
      ctx.font = 'bold 12px monospace';
      ctx.fillText('MACD (12, 26, 9)', 12, macdY + 16);

      const zeroY = macdY + 30;
      candles.forEach((_, i) => {
        const x = i * candleW + pad;
        const hist = Math.sin(i * 0.25) * 16;
        ctx.fillStyle = hist >= 0 ? '#10B981' : '#EF4444';
        ctx.fillRect(x, hist >= 0 ? zeroY - hist : zeroY, bodyW, Math.abs(hist));
      });
    }

    // ── 7. Current Price Beacon Line on Right Axis ──
    const last = candles[candles.length - 1];
    const lastY = getY(last.close);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, lastY);
    ctx.lineTo(w - 70, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price Badge on Right
    ctx.fillStyle = '#10B981';
    ctx.fillRect(w - 68, lastY - 10, 66, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(last.close.toFixed(1), w - 35, lastY + 4);

    // ── 8. Interactive Cursor Crosshair ──
    if (hoverPosition && hoverPosition.x <= w - 70) {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoverPosition.x, 0);
      ctx.lineTo(hoverPosition.x, h - 30);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hoverPosition.y);
      ctx.lineTo(w - 70, hoverPosition.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Axis Price Tag on Cursor Y
      if (hoverPosition.y <= mainH) {
        const cursorPrice = maxP - (hoverPosition.y / (mainH - 48)) * range;
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(w - 68, hoverPosition.y - 9, 66, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px JetBrains Mono, monospace';
        ctx.fillText(cursorPrice.toFixed(1), w - 35, hoverPosition.y + 4);
      }
    }

    // ── 9. Right Price Axis Labels ──
    ctx.fillStyle = '#64748B';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    for (let step = 0; step <= 5; step++) {
      const p = minP + (range / 5) * step;
      const y = getY(p);
      ctx.fillText(p.toFixed(p > 1000 ? 0 : 2), w - 62, y + 4);
    }
  }, [candles, showRsi, showMacd, showPatterns, showSignals, hoverPosition, theme, isDark]);

  // Handle pointer hover on canvas
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverPosition({ x, y });

    const candleW = (rect.width - 70) / candles.length;
    const idx = Math.floor(x / candleW);
    if (idx >= 0 && idx < candles.length) {
      setHoveredCandle(candles[idx]);
    }
  };

  const handlePointerLeave = () => {
    setHoverPosition(null);
  };

  const activeInsight = hoveredCandle || pinnedCandle || candles[candles.length - 1];

  return (
    <section
      ref={containerRef}
      id="terminal"
      className="relative min-h-screen py-24 bg-transparent z-10 flex flex-col justify-center overflow-hidden pointer-events-none"
    >
      <div className="max-w-[1550px] mx-auto px-4 w-full pointer-events-auto">
        {/* Section Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-800 text-[13px] font-mono mb-3 uppercase tracking-widest font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            05 // MARKET INTELLIGENCE AI — MI007 TERMINAL
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">
            The Living Product Terminal
          </h2>
          <p className="text-[17px] sm:text-[19px] text-black font-medium max-w-xl mx-auto">
            Interactive candlestick intelligence with real-time liquidity sweep detection, automated pattern recognition, and instantaneous AI microstructure inspection.
          </p>
        </div>

        {/* ── Main Terminal Frame ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="w-full rounded-2xl overflow-hidden border-2 border-slate-200 bg-white/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.06)] flex flex-col relative"
        >
          {/* Top Control Bar: Symbols + Toggles + Live Status */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-4 border-b border-slate-200 bg-slate-50/90 text-[13px] sm:text-[14px] font-mono">
            {/* Symbol Switchers */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
              {SYMBOLS_DATA.map((sym, idx) => (
                <button
                  key={sym.name}
                  onClick={() => setActiveSymbolIdx(idx)}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[13px] sm:text-[14px] font-bold transition-all shrink-0 ${
                    activeSymbolIdx === idx
                      ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-500 shadow-xs'
                      : 'border border-slate-200 text-black hover:text-black hover:border-slate-400 bg-white'
                  }`}
                >
                  {sym.name}
                </button>
              ))}
            </div>

            {/* Indicator Toggles */}
            <div className="flex items-center flex-wrap gap-1.5 text-[11px] sm:text-[13px]">
              <button
                onClick={() => setShowPatterns((p) => !p)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg border font-bold transition-colors ${
                  showPatterns ? 'border-sky-500 text-sky-700 bg-sky-50' : 'border-slate-200 text-black bg-white hover:bg-slate-50'
                }`}
              >
                PATTERNS {showPatterns ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setShowSignals((s) => !s)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg border font-bold transition-colors ${
                  showSignals ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-black bg-white hover:bg-slate-50'
                }`}
              >
                SIGNALS {showSignals ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setShowRsi((r) => !r)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg border font-bold transition-colors ${
                  showRsi ? 'border-purple-500 text-purple-700 bg-purple-50' : 'border-slate-200 text-black bg-white hover:bg-slate-50'
                }`}
              >
                RSI
              </button>
              <button
                onClick={() => setShowMacd((m) => !m)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg border font-bold transition-colors ${
                  showMacd ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-slate-200 text-black bg-white hover:bg-slate-50'
                }`}
              >
                MACD
              </button>
            </div>

            {/* Live Symbol Price */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="text-slate-900 font-bold text-[15px] sm:text-[17px]">
                {activeSymbol.currency}
                {candles[candles.length - 1]?.close.toLocaleString() || activeSymbol.basePrice}
              </span>
              <span className="text-emerald-700 font-bold text-[13px] sm:text-[14px]">
                {activeSymbol.change}
              </span>
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-600 animate-ping" />
            </div>
          </div>

          {/* Terminal Body: Chart + Live Dynamic AI Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px] sm:min-h-[580px]">
            {/* Chart Area (9 Cols) */}
            <div className="lg:col-span-9 relative w-full h-[360px] sm:h-[460px] lg:h-auto bg-white">
              <canvas
                ref={canvasRef}
                className="w-full h-full block cursor-crosshair bg-white"
                style={{ touchAction: 'pan-y' }}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
              />

              {/* Floating Tooltip following cursor */}
              {hoverPosition && hoveredCandle && (
                <div
                  className="absolute pointer-events-none z-30 px-3.5 py-2.5 rounded-xl bg-white/95 border-2 border-slate-200 backdrop-blur-xl shadow-xl font-mono text-[13px] space-y-1.5"
                  style={{
                    left: Math.min(hoverPosition.x + 15, 680),
                    top: Math.max(hoverPosition.y - 70, 15),
                  }}
                >
                  <div className="text-black border-b border-slate-200 pb-1.5 flex justify-between gap-4 font-bold">
                    <span>TIME: {hoveredCandle.time}</span>
                    <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {hoveredCandle.close >= hoveredCandle.open ? '▲ BULL' : '▼ BEAR'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-black font-semibold">
                    <span>O: <strong className="text-black font-black">{hoveredCandle.open.toFixed(1)}</strong></span>
                    <span>H: <strong className="text-black font-black">{hoveredCandle.high.toFixed(1)}</strong></span>
                    <span>L: <strong className="text-black font-black">{hoveredCandle.low.toFixed(1)}</strong></span>
                    <span>C: <strong className="text-black font-black">{hoveredCandle.close.toFixed(1)}</strong></span>
                  </div>
                  <div className="text-black pt-0.5 font-bold">
                    VOL: <strong className="text-sky-700 font-black">{hoveredCandle.volume.toLocaleString()}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Contextual AI Analysis Inspector (3 Cols) */}
            <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/80 p-5 font-mono text-[14px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                  <span className="text-[13px] text-black tracking-wider font-black">AI MICROSTRUCTURE RADAR</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[12px] font-extrabold">
                    LIVE
                  </span>
                </div>

                {activeInsight?.aiInsight && (
                  <div className="space-y-4">
                    {/* Sentiment & Conviction */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                      <div className="text-[12px] text-black uppercase tracking-widest font-black mb-1">
                        FORMATION DETECTION
                      </div>
                      <div className="text-black font-black text-[16px] mb-2 font-sans">
                        {activeInsight.pattern || activeInsight.aiInsight.title}
                      </div>
                      <div className="flex items-center justify-between text-[13px] mb-1.5 font-sans">
                        <span className="text-black font-bold">MODEL CONVICTION:</span>
                        <span className="text-emerald-700 font-extrabold">
                          {activeInsight.aiInsight.conviction}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-300"
                          style={{ width: `${activeInsight.aiInsight.conviction}%` }}
                        />
                      </div>
                    </div>

                    {/* Synthesis Insight */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
                      <div className="text-[12px] text-black uppercase tracking-widest font-black">
                        MICROSTRUCTURE ANALYSIS
                      </div>
                      <p className="text-black text-[14px] leading-relaxed font-sans font-medium">
                        {activeInsight.aiInsight.details}
                      </p>
                    </div>

                    {/* Institutional Orderflow Behavior */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs">
                      <div className="text-[12px] text-black uppercase tracking-widest font-black mb-1">
                        INSTITUTIONAL FOOTPRINT
                      </div>
                      <span className="text-sky-700 font-bold text-[14px]">
                        {activeInsight.aiInsight.institutionalAction}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Telemetry Note */}
              <div className="pt-3 border-t border-slate-200 text-[12px] text-black font-semibold">
                <span>Hover cursor or tap candles to trigger real-time AI node inspection.</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
