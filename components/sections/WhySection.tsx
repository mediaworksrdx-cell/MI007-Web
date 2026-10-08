'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect, useCallback } from 'react';

interface TokenDetail {
  title: string;
  category: string;
  categoryColor: string;
  description: string;
  signal: string;
  formulaOrRule: string;
}

const TOKEN_EXPLANATIONS: Record<string, TokenDetail> = {
  'PRICE ACTION': {
    title: 'Price Action Geometry',
    category: 'MICROSTRUCTURE',
    categoryColor: 'text-slate-200 border-slate-500/60 bg-slate-800/80',
    description: 'Raw candlestick range, wick rejection, and market structure analysis without lagging indicators. Detects real-time continuous auction imbalances between aggressive buyers and sellers.',
    signal: 'Bullish wick rejection confirming liquidity defense at structural swing pivot.',
    formulaOrRule: 'Auction Price Delivery & Swing High/Low Range',
  },
  'RSI 64.2': {
    title: 'Relative Strength Index (RSI)',
    category: 'MOMENTUM OSCILLATOR',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Momentum oscillator measuring the velocity and magnitude of directional price movements on a 0–100 scale. At 64.2, momentum exhibits firm institutional buying velocity before the overbought threshold (70+).',
    signal: 'Bullish momentum acceleration holding strong above the 50 median centerline.',
    formulaOrRule: 'RSI = 100 - [100 / (1 + RS)] · 14 Periods',
  },
  'EMA 21 CROSS': {
    title: '21 Exponential Moving Average Cross',
    category: 'TREND FOLLOWING',
    categoryColor: 'text-blue-200 border-blue-500/60 bg-blue-950/80',
    description: 'Dynamic 21-period EMA trend boundary. When fast price action crosses and sustains above EMA 21, it confirms short-term order flow has overpowered baseline multi-session distribution.',
    signal: 'Confirmed bullish continuation vector above dynamic equilibrium.',
    formulaOrRule: 'EMA = Price(t) × k + EMA(y) × (1 - k), k = 2/(N+1)',
  },
  'MACD HIST': {
    title: 'MACD Histogram Delta',
    category: 'VELOCITY DELTA',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Differential divergence between the 12-day fast EMA and 26-day slow EMA signal line. Expanding green histogram bars indicate accelerating institutional accumulation velocity.',
    signal: 'Expanding positive momentum delta accelerating through zero-line.',
    formulaOrRule: 'Histogram = MACD Line (12-26) - Signal Line (9 EMA)',
  },
  'VOLUME 3.4M': {
    title: 'Aggregated Tape Volume (3.4M)',
    category: 'LIQUIDITY DEPTH',
    categoryColor: 'text-purple-200 border-purple-500/60 bg-purple-950/80',
    description: 'Multi-exchange consolidated transaction volume (3.4 Million units) validating directional price breakout. High volume confirms institutional commitment and invalidates false retail breakouts.',
    signal: 'Institutional participation confirmed: 184% above 20-day rolling baseline.',
    formulaOrRule: 'Consolidated L1 + L2 Order Fill Aggregation',
  },
  'BULL DELTA': {
    title: 'Cumulative Buyer Delta (CVD)',
    category: 'ORDER FLOW',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Cumulative Volume Delta (CVD) tracking aggressive market orders hitting the ask versus passive limits. Heavy Bull Delta signifies institutional market orders aggressively sweeping supply.',
    signal: 'Aggressive buy delta dominant (+62% net aggressive buyer volume).',
    formulaOrRule: 'Delta = Aggressive Ask Volume - Aggressive Bid Volume',
  },
  'BEAR SWEEP': {
    title: 'Liquidity Bear Sweep',
    category: 'SMART MONEY / RUN',
    categoryColor: 'text-rose-200 border-rose-500/60 bg-rose-950/80',
    description: 'Algorithmic manipulation event where price intentionally penetrates below structural support to trigger retail stop-loss orders and capture deep buy-side liquidity before rapid mean reversion.',
    signal: 'Short-trap completed: resting stops cleared, liquidity absorbed by institutions.',
    formulaOrRule: 'Stop Run below Prior Swing Low + Immediate Reclaim',
  },
  'SUPPORT 24.8K': {
    title: 'Macro High-Volume Support (24.8K)',
    category: 'KEY LEVEL / POC',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'High-timeframe Point of Control (POC) and structural demand zone anchored at 24,800. Represents a heavy historical volume node where smart money defends inventory with resting limit buy bids.',
    signal: 'Critical floor: high concentration of resting limit buy bids.',
    formulaOrRule: 'Volume Profile Point of Control (POC) & Value Area Low',
  },
  'TREND +1.40%': {
    title: 'Session Trend Velocity (+1.40%)',
    category: 'SESSION STATS',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'Intraday directional statistical expansion. A +1.40% continuous advance with compressed volatility indicates steady institutional accumulation rather than speculative spikes.',
    signal: 'Strong directional bias holding above volume-weighted average price (VWAP).',
    formulaOrRule: 'Normalized Return = (P_current - P_open) / P_open',
  },
  'MOMENTUM AI': {
    title: 'Proprietary Quantitative AI Score',
    category: 'SYNTHETIX QUANT',
    categoryColor: 'text-cyan-200 border-cyan-500/60 bg-cyan-950/80',
    description: 'Synthetix 007 proprietary multi-dimensional machine learning score synthesizing tape velocity, order book imbalance, volatility smile, and sentiment vectors into a unified index.',
    signal: 'Quant confidence index: 94.2% directional conviction score.',
    formulaOrRule: 'Multi-Factor Neural Tensor across 40+ Micro-Indicators',
  },
  'ORDER BLOCK': {
    title: 'Institutional Order Block',
    category: 'SMART MONEY CONCEPTS',
    categoryColor: 'text-amber-200 border-amber-500/60 bg-amber-950/80',
    description: 'The final counter-trend candle before an aggressive institutional impulse move. Represents unfilled institutional limit orders waiting to be mitigated upon price retest.',
    signal: 'Prime re-entry zone: high probability liquidity mitigation target.',
    formulaOrRule: 'Last Down-Candle before Bullish Break of Structure (BOS)',
  },
  'FVG GAP ZONE': {
    title: 'Fair Value Gap (FVG Zone)',
    category: 'IMBALANCE / VOID',
    categoryColor: 'text-emerald-200 border-emerald-500/60 bg-emerald-950/80',
    description: 'A 3-candle price delivery imbalance where one-sided aggressive buying left a void between Candle 1 high and Candle 3 low. Acts as a magnetic algorithmic rebalance target.',
    signal: 'Inefficiency magnet: algorithmic models trigger mean-reversion rebalance.',
    formulaOrRule: 'Fair Value Gap = Candle 1 Wick High < Candle 3 Wick Low Void',
  },
};

const tokenTypes = [
  { text: 'PRICE ACTION', color: 'token-chip-txt-white' },
  { text: 'RSI 64.2', color: 'token-chip-txt-cyan' },
  { text: 'EMA 21 CROSS', color: 'token-chip-txt-blue' },
  { text: 'MACD HIST', color: 'token-chip-txt-green' },
  { text: 'VOLUME 3.4M', color: 'token-chip-txt-purple' },
  { text: 'BULL DELTA', color: 'token-chip-txt-green' },
  { text: 'BEAR SWEEP', color: 'token-chip-txt-red' },
  { text: 'SUPPORT 24.8K', color: 'token-chip-txt-amber' },
  { text: 'TREND +1.40%', color: 'token-chip-txt-green' },
  { text: 'MOMENTUM AI', color: 'token-chip-txt-teal' },
  { text: 'ORDER BLOCK', color: 'token-chip-txt-amber' },
  { text: 'FVG GAP ZONE', color: 'token-chip-txt-green' },
];

interface ActiveTokenInfo {
  id: number;
  text: string;
  color: string;
  rect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
}

export default function WhySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-100px' });
  const [tokens, setTokens] = useState<any[]>([]);
  const [activeToken, setActiveToken] = useState<ActiveTokenInfo | null>(null);
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800,
      });
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setActiveToken(null);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const list = Array.from({ length: 48 }).map((_, i) => {
      const type = tokenTypes[i % tokenTypes.length];
      const startX = (Math.random() > 0.5 ? 1 : -1) * (window.innerWidth * 0.6);
      const startY = (Math.random() > 0.5 ? 1 : -1) * (window.innerHeight * 0.4);

      return {
        id: i,
        ...type,
        startX,
        startY,
        delay: (i % 8) * 0.08,
      };
    });
    setTokens(list);
  }, []);

  const handleTokenHover = useCallback((token: any, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveToken({
      id: token.id,
      text: token.text,
      color: token.color,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    });
  }, []);

  const handleTokenLeave = useCallback(() => {
    setActiveToken(null);
  }, []);

  const handleTokenClick = useCallback((token: any, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveToken((prev) =>
      prev?.id === token.id
        ? null
        : {
            id: token.id,
            text: token.text,
            color: token.color,
            rect: {
              top: rect.top,
              bottom: rect.bottom,
              left: rect.left,
              right: rect.right,
              width: rect.width,
              height: rect.height,
            },
          }
    );
  }, []);

  // Compute pop-up positioning
  const popoverWidth = Math.min(340, viewport.width - 32);
  const popoverLeft = activeToken
    ? Math.max(16, Math.min(viewport.width - popoverWidth - 16, activeToken.rect.left + activeToken.rect.width / 2 - popoverWidth / 2))
    : 16;
  const isAbove = activeToken ? activeToken.rect.top > 320 : true;

  const activeDetail = activeToken ? TOKEN_EXPLANATIONS[activeToken.text] : null;

  return (
    <section
      ref={containerRef}
      id="market-intelligence"
      className="relative min-h-screen bg-transparent z-10 py-28 flex flex-col items-center justify-center overflow-visible"
    >
      <div className="max-w-5xl mx-auto px-6 w-full text-center relative z-10 mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border page-section-pill mb-3 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="mono text-[13px] tracking-[0.25em] uppercase font-black page-section-pill-text whitespace-nowrap">
            06 // MARKET INTELLIGENCE - 007
          </span>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 25 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 page-heading"
        >
          Convergence Into a <span className="font-extrabold text-emerald-600">Singular Layer</span>
        </motion.h2>
        <p className="text-[17px] sm:text-[19px] font-medium max-w-xl mx-auto leading-relaxed page-subtitle mb-4">
          Where thousands of isolated micro-signals unite into one coherent, institutional-grade perspective.
        </p>

        {/* Interactive guidance tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-600 text-[11.5px] font-mono font-semibold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Hover or tap any market token below for institutional explanation</span>
        </div>
      </div>

      {/* Synchronized Token Cloud (Interactive Uniform Grid) */}
      <div className="relative w-full max-w-6xl mx-auto flex items-center justify-center px-4 sm:px-6 my-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3 w-full">
          {tokens.map((token) => {
            const isHovered = activeToken?.id === token.id;

            return (
              <motion.button
                key={token.id}
                type="button"
                initial={{ x: token.startX, y: token.startY, opacity: 0, scale: 0.5 }}
                animate={isInView ? { x: 0, y: 0, opacity: 1, scale: 1 } : {}}
                transition={{
                  duration: 0.9,
                  delay: token.delay,
                  ease: 'easeOut',
                }}
                onMouseEnter={(e) => handleTokenHover(token, e)}
                onMouseLeave={handleTokenLeave}
                onClick={(e) => handleTokenClick(token, e)}
                className={`w-full h-11 flex items-center justify-center px-1.5 sm:px-2.5 rounded-xl border why-token-chip text-[10.5px] sm:text-[11.5px] lg:text-[12px] font-mono font-bold tracking-tight whitespace-nowrap text-center shadow-xs transition-all cursor-pointer relative group select-none ${
                  isHovered
                    ? 'ring-2 ring-emerald-400 border-emerald-400 scale-[1.06] shadow-lg shadow-emerald-500/20 z-20'
                    : 'hover:scale-[1.03] hover:border-emerald-500/60 hover:shadow-md'
                }`}
              >
                <span className={token.color}>{token.text}</span>
                {/* Visual hint indicator dot */}
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500/60 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Global Interactive Floating Explanation Pop-up */}
      <AnimatePresence>
        {activeToken && activeDetail && (
          <div className="fixed inset-0 pointer-events-none z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: isAbove ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: `${popoverLeft}px`,
                ...(isAbove
                  ? { bottom: `${viewport.height - activeToken.rect.top + 10}px` }
                  : { top: `${activeToken.rect.bottom + 10}px` }),
                width: `${popoverWidth}px`,
              }}
              className="pointer-events-auto rounded-xl border border-emerald-500/50 bg-slate-950/95 text-white p-4 shadow-2xl shadow-black/90 backdrop-blur-2xl ring-1 ring-white/20"
            >
              {/* Header row: category badge + live indicator */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold tracking-wider ${activeDetail.categoryColor}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeDetail.category}
                </span>
                <span className="text-[11px] font-mono font-extrabold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded">
                  {activeToken.text}
                </span>
              </div>

              {/* Title */}
              <h4 className="text-[15px] font-black text-white tracking-tight leading-snug">
                {activeDetail.title}
              </h4>

              {/* Detailed Description */}
              <p className="text-[12px] text-slate-300 leading-relaxed font-sans mt-1.5">
                {activeDetail.description}
              </p>

              {/* Signal telemetry box */}
              <div className="mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  Telemetry Signal / Bias
                </div>
                <p className="text-[11.5px] font-medium text-slate-200 mt-1 leading-snug">
                  {activeDetail.signal}
                </p>
              </div>

              {/* Rule / Formula footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10.5px] font-mono text-slate-400 gap-2">
                <span className="text-slate-500 uppercase tracking-wider text-[9.5px] flex-shrink-0">
                  Rule / Engine:
                </span>
                <span className="text-slate-300 font-semibold truncate text-right">
                  {activeDetail.formulaOrRule}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Atmospheric Conclusion */}
      <div className="max-w-2xl mx-auto px-6 w-full text-center mt-12 relative z-10">
        <div className="text-3xl sm:text-4xl md:text-5xl font-light page-heading flex flex-col gap-2">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            One market.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="font-semibold"
          >
            Multiple dimensions.
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.4, duration: 0.6 }}
            className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-500"
          >
            One living intelligence system.
          </motion.div>
        </div>
      </div>
    </section>
  );
}
