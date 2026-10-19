'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MarketToggle } from '@/components/market/MarketToggle';
import { MarketType, MARKETS } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';
import { useTradeEngine } from '@/lib/tradeEngineContext';
import { searchZerodhaStocks, findZerodhaStockBySymbol } from '@/lib/screener/zerodhaStocks';
import { ChartContainer } from '@/components/chart/ChartContainer';

// ─── Default Master Catalogs ──────────────────────────────────────────────────
export interface IndexItem {
  symbol: string;
  name: string;
  base: number;
  changePct: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  base: number;
  sector: string;
  changePct: number;
}

export interface CryptoItem {
  symbol: string;
  name: string;
  base: number;
  changePct: number;
}

export interface CommodityItem {
  symbol: string;
  name: string;
  base: number;
  unit: string;
  category: string;
  changePct: number;
}

export interface ForexItem {
  symbol: string;
  name: string;
  base: number;
  pair: string;
  pipSpread?: string;
  changePct: number;
}

const DEFAULT_INDIA_INDICES: IndexItem[] = [
  { symbol: 'NIFTY', name: 'NIFTY 50', base: 23146.15, changePct: 0.65 },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', base: 55844.00, changePct: 0.06 },
  { symbol: 'SENSEX', name: 'SENSEX', base: 74729.27, changePct: 0.56 },
  { symbol: 'FINNIFTY', name: 'NIFTY FINANCIAL', base: 25480.00, changePct: -0.10 },
];

const DEFAULT_INDIA_WATCHLIST: WatchlistItem[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', base: 1211.20, sector: 'Energy', changePct: -1.01 },
  { symbol: 'TCS', name: 'Tata Consultancy', base: 2465.00, sector: 'IT', changePct: 1.59 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', base: 728.85, sector: 'Banking', changePct: 0.58 },
  { symbol: 'INFY', name: 'Infosys', base: 1161.20, sector: 'IT', changePct: 2.14 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', base: 1383.00, sector: 'Banking', changePct: -0.46 },
  { symbol: 'ITC', name: 'ITC Ltd', base: 485.50, sector: 'FMCG', changePct: -0.47 },
  { symbol: 'SBIN', name: 'State Bank of India', base: 865.40, sector: 'Banking', changePct: -0.53 },
];

const DEFAULT_USA_INDICES: IndexItem[] = [
  { symbol: 'SPX', name: 'S&P 500', base: 7659.40, changePct: 0.51 },
  { symbol: 'NDX', name: 'NASDAQ 100', base: 29187.50, changePct: 0.57 },
  { symbol: 'DJI', name: 'DOW JONES', base: 52002.40, changePct: -0.16 },
  { symbol: 'VIX', name: 'Volatility Index', base: 18.40, changePct: -1.25 },
];

const DEFAULT_USA_WATCHLIST: WatchlistItem[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', base: 214.10, sector: 'Semis & AI', changePct: 1.81 },
  { symbol: 'AAPL', name: 'Apple Inc.', base: 343.50, sector: 'Consumer Tech', changePct: 0.64 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', base: 529.00, sector: 'Enterprise & Cloud', changePct: -0.49 },
  { symbol: 'TSLA', name: 'Tesla Inc.', base: 354.70, sector: 'EV & Autonomous', changePct: 2.37 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', base: 250.00, sector: 'eCommerce & AWS', changePct: -0.42 },
  { symbol: 'META', name: 'Meta Platforms Inc.', base: 733.40, sector: 'Social & AI', changePct: 1.33 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', base: 340.60, sector: 'Search & Cloud', changePct: 0.68 },
];

const DEFAULT_UAE_INDICES: IndexItem[] = [
  { symbol: 'DFMGI', name: 'DFM General', base: 4850.0, changePct: 0.43 },
  { symbol: 'ADX', name: 'ADX General', base: 9250.0, changePct: -0.23 },
  { symbol: 'FTSE ADX 15', name: 'FTSE ADX 15', base: 9410.20, changePct: 0.35 },
];

const DEFAULT_UAE_WATCHLIST: WatchlistItem[] = [
  { symbol: 'EMAAR', name: 'Emaar Properties', base: 8.45, sector: 'Real Estate', changePct: 0.95 },
  { symbol: 'FAB', name: 'First Abu Dhabi Bank', base: 13.20, sector: 'Banking', changePct: -0.72 },
  { symbol: 'DEWA', name: 'Dubai Electricity', base: 2.45, sector: 'Utilities', changePct: 0.68 },
  { symbol: 'SALIK', name: 'Salik Company', base: 3.65, sector: 'Transport', changePct: 1.15 },
  { symbol: 'ALDAR', name: 'Aldar Properties', base: 6.82, sector: 'Real Estate', changePct: 0.55 },
  { symbol: 'ENBD', name: 'Emirates NBD', base: 18.65, sector: 'Banking', changePct: -0.30 },
];

const DEFAULT_CRYPTO: CryptoItem[] = [
  { symbol: 'BTC', name: 'Bitcoin', base: 83651.0, changePct: 1.24 },
  { symbol: 'ETH', name: 'Ethereum', base: 2687.59, changePct: 0.88 },
  { symbol: 'SOL', name: 'Solana', base: 103.50, changePct: 2.45 },
  { symbol: 'BNB', name: 'BNB', base: 754.00, changePct: 0.42 },
  { symbol: 'DOGE', name: 'Dogecoin', base: 0.090, changePct: -1.15 },
  { symbol: 'SHIB', name: 'Shiba Inu', base: 0.0000185, changePct: -0.85 },
];

const DEFAULT_COMMODITIES: CommodityItem[] = [
  { symbol: 'GOLD', name: 'Gold Bullion', base: 2735.40, unit: 'USD / oz', category: 'Precious Metals', changePct: 0.65 },
  { symbol: 'SILVER', name: 'Silver Spot', base: 31.85, unit: 'USD / oz', category: 'Precious Metals', changePct: 1.20 },
  { symbol: 'CRUDEOIL', name: 'Brent Crude', base: 74.20, unit: 'USD / bbl', category: 'Energy', changePct: -0.45 },
  { symbol: 'NATGAS', name: 'Natural Gas', base: 2.85, unit: 'USD / MMBtu', category: 'Energy', changePct: 2.15 },
  { symbol: 'COPPER', name: 'High Grade Copper', base: 4.38, unit: 'USD / lb', category: 'Industrial Metals', changePct: 0.82 },
  { symbol: 'PLATINUM', name: 'Platinum Spot', base: 1024.50, unit: 'USD / oz', category: 'Precious Metals', changePct: -0.30 },
];

const DEFAULT_FOREX: ForexItem[] = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', pair: 'EUR / USD', base: 1.0845, pipSpread: '0.8 pips', changePct: 0.18 },
  { symbol: 'GBPUSD', name: 'British Pound / USD', pair: 'GBP / USD', base: 1.2980, pipSpread: '1.0 pips', changePct: 0.22 },
  { symbol: 'USDJPY', name: 'USD / Japanese Yen', pair: 'USD / JPY', base: 152.40, pipSpread: '0.9 pips', changePct: -0.35 },
  { symbol: 'USDINR', name: 'USD / Indian Rupee', pair: 'USD / INR', base: 84.08, pipSpread: '1.2 pips', changePct: 0.05 },
  { symbol: 'USDAED', name: 'USD / UAE Dirham', pair: 'USD / AED', base: 3.6725, pipSpread: '0.5 pips', changePct: 0.00 },
  { symbol: 'AUDUSD', name: 'Australian Dollar / USD', pair: 'AUD / USD', base: 0.6650, pipSpread: '1.1 pips', changePct: 0.40 },
];

// Predefined catalog of recognized indices & cryptos for instantaneous auto-detection
const KNOWN_INDICES: Record<string, { name: string; base: number; market: MarketType }> = {
  NIFTY: { name: 'NIFTY 50', base: 23146.15, market: 'INDIA' },
  BANKNIFTY: { name: 'BANK NIFTY', base: 55844.00, market: 'INDIA' },
  SENSEX: { name: 'BSE SENSEX', base: 74729.27, market: 'INDIA' },
  FINNIFTY: { name: 'NIFTY FINANCIAL', base: 25480.00, market: 'INDIA' },
  MIDCPNIFTY: { name: 'NIFTY MIDCAP SELECT', base: 12450.00, market: 'INDIA' },
  BANKEX: { name: 'BSE BANKEX', base: 59800.00, market: 'INDIA' },
  NIFTYNXT50: { name: 'NIFTY NEXT 50', base: 67200.00, market: 'INDIA' },
  SPX: { name: 'S&P 500', base: 7659.40, market: 'USA' },
  NDX: { name: 'NASDAQ 100', base: 29187.50, market: 'USA' },
  DJI: { name: 'DOW JONES', base: 52002.40, market: 'USA' },
  VIX: { name: 'Volatility Index', base: 18.40, market: 'USA' },
  RUT: { name: 'Russell 2000', base: 2280.00, market: 'USA' },
  DFMGI: { name: 'DFM General', base: 4850.0, market: 'UAE' },
  ADX: { name: 'ADX General', base: 9250.0, market: 'UAE' },
  'FTSE ADX 15': { name: 'FTSE ADX 15', base: 9410.20, market: 'UAE' },
};

const KNOWN_CRYPTOS: Record<string, { name: string; base: number }> = {
  BTC: { name: 'Bitcoin', base: 83651.0 },
  ETH: { name: 'Ethereum', base: 2687.59 },
  SOL: { name: 'Solana', base: 103.50 },
  BNB: { name: 'BNB', base: 754.00 },
  DOGE: { name: 'Dogecoin', base: 0.090 },
  SHIB: { name: 'Shiba Inu', base: 0.0000185 },
  XRP: { name: 'Ripple XRP', base: 0.60 },
  ADA: { name: 'Cardano', base: 0.38 },
  AVAX: { name: 'Avalanche', base: 28.50 },
  DOT: { name: 'Polkadot', base: 6.80 },
  LINK: { name: 'Chainlink', base: 14.50 },
  MATIC: { name: 'Polygon', base: 0.42 },
};

const KNOWN_COMMODITIES: Record<string, { name: string; base: number; unit: string; category: string }> = {
  GOLD: { name: 'Gold Bullion', base: 2735.40, unit: 'USD / oz', category: 'Precious Metals' },
  SILVER: { name: 'Silver Spot', base: 31.85, unit: 'USD / oz', category: 'Precious Metals' },
  CRUDEOIL: { name: 'Brent Crude', base: 74.20, unit: 'USD / bbl', category: 'Energy' },
  BRENT: { name: 'Brent Crude', base: 74.20, unit: 'USD / bbl', category: 'Energy' },
  WTI: { name: 'WTI Light Crude', base: 70.80, unit: 'USD / bbl', category: 'Energy' },
  NATGAS: { name: 'Natural Gas', base: 2.85, unit: 'USD / MMBtu', category: 'Energy' },
  COPPER: { name: 'High Grade Copper', base: 4.38, unit: 'USD / lb', category: 'Industrial Metals' },
  PLATINUM: { name: 'Platinum Spot', base: 1024.50, unit: 'USD / oz', category: 'Precious Metals' },
};

const KNOWN_FOREX: Record<string, { name: string; base: number; pair: string; pipSpread: string }> = {
  EURUSD: { name: 'Euro / US Dollar', pair: 'EUR / USD', base: 1.0845, pipSpread: '0.8 pips' },
  GBPUSD: { name: 'British Pound / USD', pair: 'GBP / USD', base: 1.2980, pipSpread: '1.0 pips' },
  USDJPY: { name: 'USD / Japanese Yen', pair: 'USD / JPY', base: 152.40, pipSpread: '0.9 pips' },
  USDINR: { name: 'USD / Indian Rupee', pair: 'USD / INR', base: 84.08, pipSpread: '1.2 pips' },
  USDAED: { name: 'USD / UAE Dirham', pair: 'USD / AED', base: 3.6725, pipSpread: '0.5 pips' },
  AUDUSD: { name: 'Australian Dollar / USD', pair: 'AUD / USD', base: 0.6650, pipSpread: '1.1 pips' },
};

const KNOWN_US_STOCKS: Record<string, { name: string; base: number; sector: string }> = {
  NVDA: { name: 'NVIDIA Corporation', base: 214.10, sector: 'Semis & AI' },
  AAPL: { name: 'Apple Inc.', base: 343.50, sector: 'Consumer Tech' },
  MSFT: { name: 'Microsoft Corporation', base: 529.00, sector: 'Enterprise & Cloud' },
  TSLA: { name: 'Tesla Inc.', base: 354.70, sector: 'EV & Autonomous' },
  AMZN: { name: 'Amazon.com Inc.', base: 250.00, sector: 'eCommerce & AWS' },
  META: { name: 'Meta Platforms Inc.', base: 733.40, sector: 'Social & AI' },
  GOOGL: { name: 'Alphabet Inc.', base: 340.60, sector: 'Search & Cloud' },
  AMD: { name: 'Advanced Micro Devices', base: 168.50, sector: 'Semiconductors' },
  NFLX: { name: 'Netflix Inc.', base: 685.00, sector: 'Media & Streaming' },
  INTC: { name: 'Intel Corporation', base: 28.40, sector: 'Semiconductors' },
};

const KNOWN_UAE_STOCKS: Record<string, { name: string; base: number; sector: string }> = {
  EMAAR: { name: 'Emaar Properties', base: 8.45, sector: 'Real Estate' },
  FAB: { name: 'First Abu Dhabi Bank', base: 13.20, sector: 'Banking' },
  DEWA: { name: 'Dubai Electricity', base: 2.45, sector: 'Utilities' },
  SALIK: { name: 'Salik Company', base: 3.65, sector: 'Transport' },
  ALDAR: { name: 'Aldar Properties', base: 6.82, sector: 'Real Estate' },
  ENBD: { name: 'Emirates NBD', base: 18.65, sector: 'Banking' },
  ADNOC: { name: 'ADNOC Distribution', base: 3.75, sector: 'Energy' },
  AIRARABIA: { name: 'Air Arabia', base: 2.65, sector: 'Aviation' },
};

// ─── Trend-Accurate Financial Mini Sparkline ──────────────────────────────
function Sparkline({ symbol, up, changePct }: { symbol?: string; up?: boolean; changePct?: number }) {
  const isUp = up !== undefined ? up : (changePct ? changePct >= 0 : true);
  const sym = symbol || 'INDEX';

  let seedVal = sym.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1) * 31, 101);
  const nextRand = () => {
    seedVal = (seedVal * 9301 + 49297) % 233280;
    return seedVal / 233280;
  };

  const numPts = 14;
  const pts: number[] = [];
  const pctVal = changePct ?? (isUp ? 0.75 : -0.75);
  const moveSlope = (isUp ? 1 : -1) * Math.max(8, Math.min(22, Math.abs(pctVal) * 9));

  const startBase = 50;
  for (let i = 0; i < numPts; i++) {
    const t = i / (numPts - 1);
    const trendOffset = moveSlope * Math.pow(t, 0.9);
    const noise = (nextRand() - 0.49) * 2.8;
    pts.push(startBase + trendOffset + noise);
  }

  if (isUp) {
    if (pts[numPts - 1] <= pts[0]) {
      pts[numPts - 1] = pts[0] + 12;
    }
  } else {
    if (pts[numPts - 1] >= pts[0]) {
      pts[numPts - 1] = pts[0] - 12;
    }
  }

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;

  const W = 64;
  const H = 26;
  const padTop = 3;
  const plotH = 20;

  const coords = pts.map((p, idx) => {
    const x = (idx / (numPts - 1)) * W;
    const y = padTop + (1 - (p - min) / range) * plotH;
    return { x: +x.toFixed(1), y: +y.toFixed(1) };
  });

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;
  const lastPt = coords[coords.length - 1];
  const strokeColor = isUp ? '#10b981' : '#f43f5e';
  const cleanSymId = sym.replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `spark-grad-${cleanSymId}-${isUp ? 'up' : 'dn'}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.2" fill={strokeColor} />
    </svg>
  );
}

// ─── Index Tile with Delete Support ───────────────────────────────────────────
function IndexTile({
  symbol,
  name,
  base,
  changePct = 0.45,
  currency,
  market,
  isEditing,
  onDelete,
}: {
  symbol: string;
  name: string;
  base: number;
  changePct?: number;
  currency: string;
  market: MarketType;
  isEditing?: boolean;
  onDelete?: () => void;
}) {
  const { getSymbolPrice } = useTradeEngine();
  const live = getSymbolPrice(symbol);
  const price = live ? live.price : base;
  const currentPct = live ? live.changePct : changePct;
  const up = currentPct >= 0;

  return (
    <div className="relative group">
      <Link
        href={`/chart/${symbol}?market=${market}`}
        className="rounded-xl border inst-subcard p-3.5 flex flex-col gap-1.5 hover:border-emerald-500 hover:shadow-md transition-all shadow-sm group block min-h-[96px]"
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-4">
            <span className="mono text-[16px] font-black inst-card-text group-hover:text-emerald-500 transition-colors tracking-wide truncate block">
              {symbol}
            </span>
            <div className="text-[13px] sm:text-[14px] inst-card-text-muted font-bold truncate">{name}</div>
          </div>
          <Sparkline symbol={symbol} up={up} changePct={currentPct} />
        </div>
        <div className="flex items-end justify-between mt-1">
          <span className="mono text-[16px] sm:text-[17px] font-black inst-card-text">
            {currency}{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`mono text-[13px] sm:text-[14px] font-bold ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
            {up ? '▲' : '▼'} {Math.abs(currentPct).toFixed(2)}%
          </span>
        </div>
      </Link>
      {isEditing && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white hover:bg-rose-600 border border-white/20 flex items-center justify-center text-xs font-black shadow-md z-30 transition-transform active:scale-90 cursor-pointer"
          title={`Delete ${symbol} from Indices`}
          aria-label={`Delete ${symbol}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Watchlist Row with Delete Support ────────────────────────────────────────
function WatchlistRow({
  symbol,
  name,
  base,
  sector,
  changePct = 0.25,
  currency,
  market,
  isEditing,
  onDelete,
}: {
  symbol: string;
  name: string;
  base: number;
  sector: string;
  changePct?: number;
  currency: string;
  market: MarketType;
  isEditing?: boolean;
  onDelete?: () => void;
}) {
  const { getSymbolPrice } = useTradeEngine();
  const live = getSymbolPrice(symbol);
  const price = live ? live.price : base;
  const currentPct = live ? live.changePct : changePct;
  const up = currentPct >= 0;

  return (
    <div className="relative group">
      <Link
        href={`/chart/${symbol}?market=${market}`}
        className="flex items-center gap-2 sm:gap-3.5 px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl border inst-subcard hover:border-emerald-500 hover:shadow-md transition-all shadow-sm group min-w-0"
      >
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
          <span className="mono text-[12px] sm:text-[13px] font-black inst-card-text group-hover:text-emerald-500 transition-colors">{symbol.slice(0, 3)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <span className="mono text-[14px] sm:text-[16px] font-black inst-card-text group-hover:text-emerald-500 transition-colors truncate block">{symbol}</span>
          <div className="text-[12px] sm:text-[14px] inst-card-text-muted font-bold truncate">{name}</div>
        </div>

        <div className="hidden md:block">
          <span className="rounded px-2.5 py-0.5 text-[12px] font-bold inst-card-text border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] mono">{sector}</span>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="mono text-[14px] sm:text-[16px] font-black inst-card-text">
            {currency}{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`mono text-[12px] sm:text-[14px] font-bold ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
            {up ? '+' : ''}{currentPct.toFixed(2)}%
          </div>
        </div>

        <div className="hidden xs:block flex-shrink-0">
          <Sparkline symbol={symbol} up={up} changePct={currentPct} />
        </div>

        <div className="flex-shrink-0 inst-card-text group-hover:text-emerald-500 transition-colors text-base font-black pl-0.5">›</div>
      </Link>
      {isEditing && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 border border-white/20 flex items-center gap-1 text-xs mono font-black shadow-md z-30 transition-transform active:scale-95 cursor-pointer"
          title={`Delete ${symbol} from Watchlist`}
          aria-label={`Delete ${symbol}`}
        >
          <span>✕</span>
          <span className="hidden sm:inline">DELETE</span>
        </button>
      )}
    </div>
  );
}

// ─── Section Header with Interactive Edit Button ───────────────────────────────
function SectionHeader({
  title,
  badge,
  isEditing,
  onToggleEdit,
  onResetDefaults,
}: {
  title: string;
  badge?: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  onResetDefaults: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3 mt-6">
      <div className="flex items-center gap-2">
        <span className="mono text-[15px] sm:text-[16px] font-black inst-card-text tracking-widest uppercase">{title}</span>
        {badge && <span className="rounded-full border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] px-2.5 py-0.5 text-[11.5px] sm:text-[12.5px] mono font-bold inst-card-text">{badge}</span>}
      </div>
      <div className="flex items-center gap-2">
        {isEditing && (
          <button
            type="button"
            onClick={onResetDefaults}
            className="px-2.5 py-1 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-[11.5px] mono font-bold transition-all cursor-pointer shadow-xs"
            title="Reset this section to default items"
          >
            Reset Defaults
          </button>
        )}
        <button
          type="button"
          onClick={onToggleEdit}
          className={`px-3 py-1 rounded-lg text-[12px] sm:text-[13px] mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
            isEditing
              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 ring-2 ring-emerald-400/50'
              : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400'
          }`}
          title={isEditing ? 'Save and exit edit mode' : 'Edit Dashboard: Add or Remove Items'}
        >
          <span>{isEditing ? '✓' : '✏️'}</span>
          <span>{isEditing ? 'DONE' : 'EDIT'}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard Search & Add Bar Component ─────────────────────────────────────
interface SearchSuggestion {
  symbol: string;
  name: string;
  category: 'STOCK' | 'INDEX' | 'COMMODITY' | 'FOREX' | 'CRYPTO';
  sector?: string;
  base: number;
}

export default function TerminalPage() {
  const { market, setMarket, currency } = useMarket();
  const { getSymbolPrice } = useTradeEngine();

  // Active terminal module tab: 'all' (Full Dashboard) | 'commodities' | 'forex' | 'charts'
  const [activeTab, setActiveTab] = useState<'all' | 'commodities' | 'forex' | 'charts'>('all');

  // State: Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);

  // State: Dynamic instrument lists initialized from localStorage or defaults
  const [indices, setIndices] = useState<IndexItem[]>(() => {
    return market === 'INDIA' ? DEFAULT_INDIA_INDICES : market === 'USA' ? DEFAULT_USA_INDICES : DEFAULT_UAE_INDICES;
  });

  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    return market === 'INDIA' ? DEFAULT_INDIA_WATCHLIST : market === 'USA' ? DEFAULT_USA_WATCHLIST : DEFAULT_UAE_WATCHLIST;
  });

  const [crypto, setCrypto] = useState<CryptoItem[]>(DEFAULT_CRYPTO);
  const [commodities, setCommodities] = useState<CommodityItem[]>(DEFAULT_COMMODITIES);
  const [forex, setForex] = useState<ForexItem[]>(DEFAULT_FOREX);

  // Read URL query/hash on mount and load saved commodities/forex
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || params.get('tab');
      if (view === 'commodities' || window.location.hash === '#commodities') {
        setActiveTab('commodities');
        setTargetCategory('COMMODITY');
      } else if (view === 'forex' || window.location.hash === '#forex') {
        setActiveTab('forex');
        setTargetCategory('FOREX');
      } else if (view === 'charts' || window.location.hash === '#charts') {
        setActiveTab('charts');
      }

      try {
        const savedComm = localStorage.getItem('mi007_dashboard_commodities');
        if (savedComm) setCommodities(JSON.parse(savedComm));

        const savedFx = localStorage.getItem('mi007_dashboard_forex');
        if (savedFx) setForex(JSON.parse(savedFx));
      } catch {}
    }
  }, []);

  // Sync state when market changes or load from localStorage
  useEffect(() => {
    try {
      const savedIndices = localStorage.getItem(`mi007_dashboard_indices_${market}`);
      if (savedIndices) {
        setIndices(JSON.parse(savedIndices));
      } else {
        setIndices(market === 'INDIA' ? DEFAULT_INDIA_INDICES : market === 'USA' ? DEFAULT_USA_INDICES : DEFAULT_UAE_INDICES);
      }

      const savedWatchlist = localStorage.getItem(`mi007_dashboard_watchlist_${market}`);
      if (savedWatchlist) {
        setWatchlist(JSON.parse(savedWatchlist));
      } else {
        setWatchlist(market === 'INDIA' ? DEFAULT_INDIA_WATCHLIST : market === 'USA' ? DEFAULT_USA_WATCHLIST : DEFAULT_UAE_WATCHLIST);
      }

      const savedCrypto = localStorage.getItem('mi007_dashboard_crypto');
      if (savedCrypto) {
        setCrypto(JSON.parse(savedCrypto));
      } else {
        setCrypto(DEFAULT_CRYPTO);
      }
    } catch {
      // Fallback to defaults
    }
  }, [market]);

  // Persist indices to localStorage
  const updateIndices = (newList: IndexItem[]) => {
    setIndices(newList);
    try {
      localStorage.setItem(`mi007_dashboard_indices_${market}`, JSON.stringify(newList));
    } catch {}
  };

  // Persist watchlist to localStorage
  const updateWatchlist = (newList: WatchlistItem[]) => {
    setWatchlist(newList);
    try {
      localStorage.setItem(`mi007_dashboard_watchlist_${market}`, JSON.stringify(newList));
    } catch {}
  };

  // Persist crypto to localStorage
  const updateCrypto = (newList: CryptoItem[]) => {
    setCrypto(newList);
    try {
      localStorage.setItem('mi007_dashboard_crypto', JSON.stringify(newList));
    } catch {}
  };

  // Persist commodities to localStorage
  const updateCommodities = (newList: CommodityItem[]) => {
    setCommodities(newList);
    try {
      localStorage.setItem('mi007_dashboard_commodities', JSON.stringify(newList));
    } catch {}
  };

  // Persist forex to localStorage
  const updateForex = (newList: ForexItem[]) => {
    setForex(newList);
    try {
      localStorage.setItem('mi007_dashboard_forex', JSON.stringify(newList));
    } catch {}
  };

  // ─── Delete Handlers ───
  const handleDeleteIndex = (symbol: string) => {
    const updated = indices.filter(i => i.symbol.toUpperCase() !== symbol.toUpperCase());
    updateIndices(updated);
    showToast(`Removed ${symbol} from Core Indices`);
  };

  const handleDeleteWatchlist = (symbol: string) => {
    const updated = watchlist.filter(w => w.symbol.toUpperCase() !== symbol.toUpperCase());
    updateWatchlist(updated);
    showToast(`Removed ${symbol} from Strategic Watchlist`);
  };

  const handleDeleteCrypto = (symbol: string) => {
    const updated = crypto.filter(c => c.symbol.toUpperCase() !== symbol.toUpperCase());
    updateCrypto(updated);
    showToast(`Removed ${symbol} from Crypto Intelligence`);
  };

  const handleDeleteCommodity = (symbol: string) => {
    const updated = commodities.filter(c => c.symbol.toUpperCase() !== symbol.toUpperCase());
    updateCommodities(updated);
    showToast(`Removed ${symbol} from Commodities Intelligence`);
  };

  const handleDeleteForex = (symbol: string) => {
    const updated = forex.filter(f => f.symbol.toUpperCase() !== symbol.toUpperCase());
    updateForex(updated);
    showToast(`Removed ${symbol} from Forex Intelligence`);
  };

  const handleResetDefaults = () => {
    const defInd = market === 'INDIA' ? DEFAULT_INDIA_INDICES : market === 'USA' ? DEFAULT_USA_INDICES : DEFAULT_UAE_INDICES;
    const defWat = market === 'INDIA' ? DEFAULT_INDIA_WATCHLIST : market === 'USA' ? DEFAULT_USA_WATCHLIST : DEFAULT_UAE_WATCHLIST;
    updateIndices(defInd);
    updateWatchlist(defWat);
    updateCrypto(DEFAULT_CRYPTO);
    updateCommodities(DEFAULT_COMMODITIES);
    updateForex(DEFAULT_FOREX);
    try {
      localStorage.removeItem('mi007_dashboard_commodities');
      localStorage.removeItem('mi007_dashboard_forex');
    } catch {}
    showToast(`Reset ${MARKETS[market].label} dashboard to factory defaults`);
  };

  // ─── Search & Add System ───
  const [searchQuery, setSearchQuery] = useState('');
  const [targetCategory, setTargetCategory] = useState<'AUTO' | 'STOCK' | 'INDEX' | 'COMMODITY' | 'FOREX' | 'CRYPTO'>('AUTO');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, isError = false) => {
    setFeedbackToast({ message, isError });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live search suggestions across Indices, Cryptos, Commodities, Forex, US/UAE stocks, and 3,800+ Zerodha NSE stocks
  const searchSuggestions: SearchSuggestion[] = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (!q) return [];

    const results: SearchSuggestion[] = [];

    // 1. Check known cryptos
    Object.entries(KNOWN_CRYPTOS).forEach(([sym, data]) => {
      if (sym.includes(q) || data.name.toUpperCase().includes(q)) {
        results.push({ symbol: sym, name: data.name, category: 'CRYPTO', base: data.base });
      }
    });

    // 2. Check known commodities
    Object.entries(KNOWN_COMMODITIES).forEach(([sym, data]) => {
      if (sym.includes(q) || data.name.toUpperCase().includes(q)) {
        results.push({ symbol: sym, name: data.name, category: 'COMMODITY', base: data.base });
      }
    });

    // 3. Check known forex
    Object.entries(KNOWN_FOREX).forEach(([sym, data]) => {
      if (sym.includes(q) || data.name.toUpperCase().includes(q) || data.pair.toUpperCase().includes(q)) {
        results.push({ symbol: sym, name: `${data.name} (${data.pair})`, category: 'FOREX', base: data.base });
      }
    });

    // 4. Check known indices
    Object.entries(KNOWN_INDICES).forEach(([sym, data]) => {
      if (sym.includes(q) || data.name.toUpperCase().includes(q)) {
        results.push({ symbol: sym, name: data.name, category: 'INDEX', base: data.base });
      }
    });

    // 5. Check USA stocks
    Object.entries(KNOWN_US_STOCKS).forEach(([sym, data]) => {
      if (sym.includes(q) || data.name.toUpperCase().includes(q)) {
        results.push({ symbol: sym, name: data.name, category: 'STOCK', sector: data.sector, base: data.base });
      }
    });

    // 6. Check UAE stocks
    Object.entries(KNOWN_UAE_STOCKS).forEach(([sym, data]) => {
      if (sym.includes(q) || data.name.toUpperCase().includes(q)) {
        results.push({ symbol: sym, name: data.name, category: 'STOCK', sector: data.sector, base: data.base });
      }
    });

    // 7. Check 3,800+ Indian Zerodha catalog
    if (market === 'INDIA' || results.length < 6) {
      const zerodhaMatches = searchZerodhaStocks(q, 10);
      zerodhaMatches.forEach((z) => {
        if (!results.some(r => r.symbol === z.symbol)) {
          results.push({
            symbol: z.symbol,
            name: z.name,
            category: 'STOCK',
            sector: z.sector || 'Equities',
            base: z.lastPrice && z.lastPrice > 0 ? z.lastPrice : 500,
          });
        }
      });
    }

    // Filter by selected category if user specified one
    if (targetCategory !== 'AUTO') {
      return results.filter(r => r.category === targetCategory).slice(0, 10);
    }

    return results.slice(0, 10);
  }, [searchQuery, targetCategory, market]);

  // Execute Add to Dashboard
  const handleAddInstrument = (item?: SearchSuggestion) => {
    const rawSym = (item?.symbol || searchQuery).trim().toUpperCase();
    if (!rawSym) return;

    let targetCat: 'STOCK' | 'INDEX' | 'COMMODITY' | 'FOREX' | 'CRYPTO' = 'STOCK';

    if (targetCategory !== 'AUTO') {
      targetCat = targetCategory;
    } else if (item) {
      targetCat = item.category;
    } else if (KNOWN_CRYPTOS[rawSym]) {
      targetCat = 'CRYPTO';
    } else if (KNOWN_COMMODITIES[rawSym]) {
      targetCat = 'COMMODITY';
    } else if (KNOWN_FOREX[rawSym]) {
      targetCat = 'FOREX';
    } else if (KNOWN_INDICES[rawSym]) {
      targetCat = 'INDEX';
    }

    // Add to Crypto
    if (targetCat === 'CRYPTO') {
      if (crypto.some(c => c.symbol.toUpperCase() === rawSym)) {
        showToast(`${rawSym} is already in Crypto Intelligence`, true);
        return;
      }
      const cryptData = KNOWN_CRYPTOS[rawSym] || { name: item?.name || `${rawSym} Coin`, base: item?.base || 1.0 };
      const newCryptoItem: CryptoItem = {
        symbol: rawSym,
        name: cryptData.name,
        base: cryptData.base,
        changePct: +(Math.random() * 2 - 0.5).toFixed(2),
      };
      updateCrypto([...crypto, newCryptoItem]);
      showToast(`✓ Added ${rawSym} to Crypto Intelligence`);
      setSearchQuery('');
      setIsDropdownOpen(false);
      return;
    }

    // Add to Commodities
    if (targetCat === 'COMMODITY') {
      if (commodities.some(c => c.symbol.toUpperCase() === rawSym)) {
        showToast(`${rawSym} is already in Commodities Intelligence`, true);
        return;
      }
      const commData = KNOWN_COMMODITIES[rawSym] || { name: item?.name || `${rawSym} Commodity`, base: item?.base || 100.0, unit: 'USD / contract', category: 'Commodities' };
      const newCommItem: CommodityItem = {
        symbol: rawSym,
        name: commData.name,
        base: commData.base,
        unit: commData.unit,
        category: commData.category,
        changePct: +(Math.random() * 2 - 0.7).toFixed(2),
      };
      updateCommodities([...commodities, newCommItem]);
      showToast(`✓ Added ${rawSym} to Commodities Intelligence`);
      setSearchQuery('');
      setIsDropdownOpen(false);
      return;
    }

    // Add to Forex
    if (targetCat === 'FOREX') {
      if (forex.some(f => f.symbol.toUpperCase() === rawSym)) {
        showToast(`${rawSym} is already in Forex Intelligence`, true);
        return;
      }
      const fxData = KNOWN_FOREX[rawSym] || { name: item?.name || `${rawSym} FX Pair`, base: item?.base || 1.0, pair: rawSym.length === 6 ? `${rawSym.slice(0, 3)} / ${rawSym.slice(3)}` : rawSym, pipSpread: '1.0 pips' };
      const newForexItem: ForexItem = {
        symbol: rawSym,
        name: fxData.name,
        pair: fxData.pair,
        base: fxData.base,
        pipSpread: fxData.pipSpread,
        changePct: +(Math.random() * 0.8 - 0.4).toFixed(2),
      };
      updateForex([...forex, newForexItem]);
      showToast(`✓ Added ${rawSym} to Forex Intelligence`);
      setSearchQuery('');
      setIsDropdownOpen(false);
      return;
    }

    // Add to Core Indices
    if (targetCat === 'INDEX') {
      if (indices.some(i => i.symbol.toUpperCase() === rawSym)) {
        showToast(`${rawSym} is already in Core Indices`, true);
        return;
      }
      const indexData = KNOWN_INDICES[rawSym] || { name: item?.name || `${rawSym} Index`, base: item?.base || 10000.0 };
      const newIndexItem: IndexItem = {
        symbol: rawSym,
        name: indexData.name,
        base: indexData.base,
        changePct: +(Math.random() * 1.5 - 0.4).toFixed(2),
      };
      updateIndices([...indices, newIndexItem]);
      showToast(`✓ Added ${rawSym} to Core Indices`);
      setSearchQuery('');
      setIsDropdownOpen(false);
      return;
    }

    // Add to Strategic Watchlist
    if (watchlist.some(w => w.symbol.toUpperCase() === rawSym)) {
      showToast(`${rawSym} is already in Strategic Watchlist`, true);
      return;
    }

    // Resolve name, sector, and base price from catalogs
    let stockName = item?.name;
    let stockSector = item?.sector || 'Equities';
    let stockBase = item?.base || 500.0;

    const zStock = findZerodhaStockBySymbol(rawSym);
    if (zStock) {
      stockName = zStock.name;
      stockSector = zStock.sector || 'Equities';
      stockBase = zStock.lastPrice && zStock.lastPrice > 0 ? zStock.lastPrice : 500;
    } else if (KNOWN_US_STOCKS[rawSym]) {
      stockName = KNOWN_US_STOCKS[rawSym].name;
      stockSector = KNOWN_US_STOCKS[rawSym].sector;
      stockBase = KNOWN_US_STOCKS[rawSym].base;
    } else if (KNOWN_UAE_STOCKS[rawSym]) {
      stockName = KNOWN_UAE_STOCKS[rawSym].name;
      stockSector = KNOWN_UAE_STOCKS[rawSym].sector;
      stockBase = KNOWN_UAE_STOCKS[rawSym].base;
    }

    const newWatchlistItem: WatchlistItem = {
      symbol: rawSym,
      name: stockName || `${rawSym} Ltd`,
      sector: stockSector,
      base: stockBase,
      changePct: +(Math.random() * 2 - 0.8).toFixed(2),
    };

    updateWatchlist([newWatchlistItem, ...watchlist]);
    showToast(`✓ Added ${rawSym} to Strategic Watchlist`);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const defaultChartSym = market === 'INDIA' ? 'NIFTY' : market === 'USA' ? 'SPX' : 'DFMGI';

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="min-h-screen pt-28 sm:pt-32 relative z-20 bg-transparent pb-20">
        {/* ── Master Dashboard Layer ── */}
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-8 relative z-20 isolate">
          <div className="relative rounded-2xl border-2 terminal-page-panel shadow-xl p-3.5 sm:p-6 lg:p-9 overflow-hidden">
            {/* Top Outer Hairline Accent */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 pointer-events-none" />

            {/* ── Outer Bezel Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-[var(--theme-card-border)] relative z-40">
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                <Link
                  href="/"
                  className="px-3 py-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] hover:border-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-2 mono text-[12px] font-bold shadow-xs shrink-0 group"
                  title="Return to Home"
                >
                  <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                  <span className="font-black">HOME</span>
                </Link>

                <div className="flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center flex-shrink-0 overflow-visible">
                  <Falcon3DLogo
                    src="/images/logo-falcon-transparent.png"
                    alt="MARKET INTELLIGENCE MI-007"
                    width={52}
                    height={52}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="mono text-[17px] sm:text-[23px] font-black inst-card-text tracking-wider uppercase whitespace-nowrap">
                    MARKET INTELLIGENCE MI-007
                  </h1>
                  <p className="text-[12px] sm:text-[14px] inst-card-text-muted font-medium mt-0.5 truncate">
                    Intelligence Beyond the Noise
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <MarketToggle selected={market} onChange={setMarket} />
              </div>
            </div>

            {/* ── Module Tabs: Centered segmented bar with no unwanted box space ── */}
            <div className="flex justify-center mb-6">
              <div className="w-full sm:w-fit inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('all');
                    setTargetCategory('AUTO');
                  }}
                  className={`px-4 py-2 rounded-lg mono text-[13px] tracking-wide text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'font-bold text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-slate-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>⚡</span>
                  <span>DASHBOARD</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('commodities');
                    setTargetCategory('COMMODITY');
                  }}
                  className={`px-4 py-2 rounded-lg mono text-[13px] tracking-wide text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'commodities'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'font-bold text-[var(--theme-card-text-muted)] hover:text-emerald-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>🛢️</span>
                  <span>COMMODITIES</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forex');
                    setTargetCategory('FOREX');
                  }}
                  className={`px-4 py-2 rounded-lg mono text-[13px] tracking-wide text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'forex'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'font-bold text-[var(--theme-card-text-muted)] hover:text-emerald-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>💱</span>
                  <span>FOREX</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('charts')}
                  className={`px-4 py-2 rounded-lg mono text-[13px] tracking-wide text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'charts'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'font-bold text-[var(--theme-card-text-muted)] hover:text-emerald-400 hover:bg-slate-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  <span>📈</span>
                  <span>CHARTS</span>
                </button>
                <Link
                  href="/terminal/screener"
                  className="px-4 py-2 rounded-lg mono text-[13px] font-bold tracking-wide text-center transition-all text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)] hover:bg-slate-200/50 dark:hover:bg-white/5 flex items-center justify-center gap-2"
                >
                  <span>🔍</span>
                  <span>SCREENERS</span>
                </Link>
              </div>
            </div>



            {/* ── Search Bar with Add Button for Stocks, Index, Commodities, Forex, or Crypto (Dashboard, Commodities, and Forex tabs) ── */}
            {activeTab !== 'charts' && (
              <div className="p-4 sm:p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] shadow-md mb-6 relative z-30" ref={searchContainerRef}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="mono text-[13px] sm:text-[14px] font-black inst-card-text uppercase tracking-wider">
                      {activeTab === 'commodities'
                        ? 'Add Commodity to Commodities Intelligence'
                        : activeTab === 'forex'
                        ? 'Add Currency Pair to Forex Intelligence'
                        : 'Add New Instrument to Dashboard'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['AUTO', 'STOCK', 'INDEX', 'COMMODITY', 'FOREX', 'CRYPTO'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setTargetCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg mono text-[11px] font-bold transition-all cursor-pointer ${
                          targetCategory === cat
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                            : 'border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
                        }`}
                      >
                        {cat === 'AUTO' ? 'Auto-Detect' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input + Add Button row */}
                <div className="flex items-center gap-2.5 relative">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (searchSuggestions.length > 0) {
                            handleAddInstrument(searchSuggestions[0]);
                          } else {
                            handleAddInstrument();
                          }
                        }
                      }}
                      placeholder={
                        activeTab === 'commodities'
                          ? 'Search commodities (GOLD, CRUDEOIL, SILVER, NATGAS) to add...'
                          : activeTab === 'forex'
                          ? 'Search major currency pairs (EURUSD, GBPUSD, USDJPY, USDINR) to add...'
                          : market === 'INDIA'
                          ? 'Search from 3,800+ Zerodha stocks, indices, or crypto...'
                          : 'Search stocks, indices, or crypto...'
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] placeholder-slate-400 mono text-[13px] font-medium focus:outline-none focus:border-emerald-500 shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsDropdownOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--theme-card-text)] font-mono text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddInstrument(searchSuggestions[0])}
                    disabled={!searchQuery.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed mono text-[13px] font-black tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                  >
                    <span>+</span>
                    <span>ADD</span>
                  </button>
                </div>

                {/* Floating Dropdown Suggestions */}
                {isDropdownOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute top-full left-4 right-4 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-2xl z-50 divide-y divide-[var(--theme-card-border)]/50">
                    {searchSuggestions.length === 0 ? (
                      <div className="p-4 text-center mono text-xs text-[var(--theme-card-text-muted)]">
                        No matching catalog items found. Click <strong className="text-emerald-500">+ ADD</strong> to register <span className="font-bold text-[var(--theme-card-text)]">{searchQuery.toUpperCase()}</span> directly.
                      </div>
                    ) : (
                      searchSuggestions.map((item) => (
                        <div
                          key={`${item.category}-${item.symbol}`}
                          onClick={() => handleAddInstrument(item)}
                          className="px-4 py-2.5 flex items-center justify-between hover:bg-emerald-500/10 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="mono text-[13px] font-black text-emerald-500 dark:text-emerald-400 group-hover:underline">
                              {item.symbol}
                            </span>
                            <span className="text-[12px] text-[var(--theme-card-text)] truncate max-w-xs sm:max-w-md">
                              {item.name}
                            </span>
                            {item.sector && (
                              <span className="hidden sm:inline-block mono text-[10px] px-1.5 py-0.5 rounded border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)]">
                                {item.sector}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-[var(--theme-card-surface)] text-[var(--theme-card-text-muted)] border border-[var(--theme-card-border)]">
                              {item.category}
                            </span>
                            <span className="mono text-[11px] font-bold text-emerald-500 group-hover:translate-x-0.5 transition-transform">
                              + ADD
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Feedback Toast */}
                {feedbackToast && (
                  <div
                    className={`mt-2 px-3 py-1.5 rounded-lg mono text-[12px] font-bold flex items-center gap-2 animate-in fade-in ${
                      feedbackToast.isError
                        ? 'bg-rose-500/15 border border-rose-500/40 text-rose-500 dark:text-rose-400'
                        : 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    <span>{feedbackToast.isError ? '⚠️' : '✓'}</span>
                    <span>{feedbackToast.message}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Charts Module (Shown on CHARTS tab) ── */}
            {activeTab === 'charts' && (
              <div className="w-full rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xl overflow-hidden min-h-[780px] h-[calc(100vh-13rem)] flex flex-col mb-8 animate-in fade-in duration-150">
                <ChartContainer market={market} defaultSymbol={defaultChartSym} />
              </div>
            )}

            {/* ── Core Indices Grid (Shown on Full Dashboard) ── */}
            {activeTab === 'all' && (
              <>
                <SectionHeader
                  title="Core Indices"
                  badge={`${indices.length} ACTIVE`}
                  isEditing={isEditing}
                  onToggleEdit={() => setIsEditing(v => !v)}
                  onResetDefaults={handleResetDefaults}
                />
                {indices.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--theme-card-border)] text-center mono text-xs text-[var(--theme-card-text-muted)] mb-6">
                    No indices in this section. Use the search bar above or click Reset Defaults.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
                    {indices.map(idx => (
                      <IndexTile
                        key={idx.symbol}
                        symbol={idx.symbol}
                        name={idx.name}
                        base={idx.base}
                        changePct={idx.changePct}
                        currency={currency}
                        market={market}
                        isEditing={isEditing}
                        onDelete={() => handleDeleteIndex(idx.symbol)}
                      />
                    ))}
                  </div>
                )}

                {/* ── Strategic Watchlist ── */}
                <SectionHeader
                  title={`${MARKETS[market].label} Strategic Watchlist`}
                  badge={`${watchlist.length} MONITORED`}
                  isEditing={isEditing}
                  onToggleEdit={() => setIsEditing(v => !v)}
                  onResetDefaults={handleResetDefaults}
                />
                {watchlist.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--theme-card-border)] text-center mono text-xs text-[var(--theme-card-text-muted)] mb-6">
                    No stocks in this watchlist. Use the search bar above to add stocks or click Reset Defaults.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 mb-6">
                    {watchlist.map(item => (
                      <WatchlistRow
                        key={item.symbol}
                        symbol={item.symbol}
                        name={item.name}
                        base={item.base}
                        sector={item.sector}
                        changePct={item.changePct}
                        currency={currency}
                        market={market}
                        isEditing={isEditing}
                        onDelete={() => handleDeleteWatchlist(item.symbol)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Commodities Intelligence (Shown only on Commodities tab) ── */}
            {activeTab === 'commodities' && (
              <>
                <SectionHeader
                  title="Commodities Intelligence"
                  badge={`${commodities.length} GLOBAL BENCHMARKS`}
                  isEditing={isEditing}
                  onToggleEdit={() => setIsEditing(v => !v)}
                  onResetDefaults={handleResetDefaults}
                />
                {commodities.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--theme-card-border)] text-center mono text-xs text-[var(--theme-card-text-muted)] mb-6">
                    No commodities in this section. Use the search bar above or click Reset Defaults.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {commodities.map(c => {
                      const live = getSymbolPrice(c.symbol);
                      const price = live ? live.price : c.base;
                      const currentPct = live ? live.changePct : c.changePct;
                      const up = currentPct >= 0;
                      return (
                        <div key={c.symbol} className="relative group">
                          <Link
                            href={`/chart/${c.symbol}?market=USA`}
                            className="rounded-xl border inst-subcard p-3 hover:border-emerald-500 transition-all shadow-sm flex flex-col gap-1 group block min-h-[96px]"
                            title={`Open ${c.name} Interactive Chart`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 pr-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="mono text-[14px] font-black inst-card-text group-hover:text-emerald-500 transition-colors truncate">
                                    {c.symbol}
                                  </span>
                                  <span className="mono text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-500 font-bold shrink-0">
                                    {c.category}
                                  </span>
                                </div>
                                <div className="text-[11px] inst-card-text-muted font-bold truncate max-w-[110px]" title={c.name}>
                                  {c.name}
                                </div>
                              </div>
                              <div className="scale-90 origin-top-right shrink-0">
                                <Sparkline symbol={c.symbol} up={up} changePct={currentPct} />
                              </div>
                            </div>
                            <div className="flex items-end justify-between mt-2 pt-1 border-t border-[var(--theme-card-border)]/40">
                              <div>
                                <span className="mono text-[13px] sm:text-[13.5px] font-black inst-card-text">
                                  ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-[var(--theme-card-text-muted)] font-mono ml-1">
                                  {c.unit.includes('/') ? `/${c.unit.split('/')[1].trim()}` : ''}
                                </span>
                              </div>
                              <span className={`mono text-[11.5px] sm:text-[12px] font-bold ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {up ? '▲' : '▼'} {Math.abs(currentPct).toFixed(2)}%
                              </span>
                            </div>
                          </Link>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteCommodity(c.symbol);
                              }}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white hover:bg-rose-600 border border-white/20 flex items-center justify-center text-[10px] font-black shadow-md z-30 transition-transform active:scale-90 cursor-pointer"
                              title={`Delete ${c.symbol} from Commodities`}
                              aria-label={`Delete ${c.symbol}`}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Forex Intelligence (Shown only on Forex tab) ── */}
            {activeTab === 'forex' && (
              <>
                <SectionHeader
                  title="Forex Intelligence"
                  badge={`${forex.length} MAJOR PAIRS`}
                  isEditing={isEditing}
                  onToggleEdit={() => setIsEditing(v => !v)}
                  onResetDefaults={handleResetDefaults}
                />
                {forex.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--theme-card-border)] text-center mono text-xs text-[var(--theme-card-text-muted)] mb-6">
                    No forex pairs in this section. Use the search bar above or click Reset Defaults.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {forex.map(f => {
                      const live = getSymbolPrice(f.symbol);
                      const price = live ? live.price : f.base;
                      const currentPct = live ? live.changePct : f.changePct;
                      const up = currentPct >= 0;
                      return (
                        <div key={f.symbol} className="relative group">
                          <Link
                            href={`/chart/${f.symbol}?market=USA`}
                            className="rounded-xl border inst-subcard p-3 hover:border-emerald-500 transition-all shadow-sm flex flex-col gap-1 group block min-h-[96px]"
                            title={`Open ${f.name} Interactive Chart`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 pr-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="mono text-[14px] font-black inst-card-text group-hover:text-emerald-500 transition-colors truncate">
                                    {f.pair}
                                  </span>
                                  <span className="mono text-[9px] px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-500 font-bold shrink-0">
                                    FX
                                  </span>
                                </div>
                                <div className="text-[11px] inst-card-text-muted font-bold truncate max-w-[110px]" title={f.name}>
                                  {f.name}
                                </div>
                              </div>
                              <div className="scale-90 origin-top-right shrink-0">
                                <Sparkline symbol={f.symbol} up={up} changePct={currentPct} />
                              </div>
                            </div>
                            <div className="flex items-end justify-between mt-2 pt-1 border-t border-[var(--theme-card-border)]/40">
                              <div>
                                <span className="mono text-[13px] sm:text-[13.5px] font-black inst-card-text">
                                  {price.toFixed(price < 2 ? 4 : 2)}
                                </span>
                                {f.pipSpread && (
                                  <span className="text-[9.5px] text-[var(--theme-card-text-muted)] font-mono ml-1 hidden sm:inline">
                                    ({f.pipSpread})
                                  </span>
                                )}
                              </div>
                              <span className={`mono text-[11.5px] sm:text-[12px] font-bold ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {up ? '▲' : '▼'} {Math.abs(currentPct).toFixed(2)}%
                              </span>
                            </div>
                          </Link>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteForex(f.symbol);
                              }}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white hover:bg-rose-600 border border-white/20 flex items-center justify-center text-[10px] font-black shadow-md z-30 transition-transform active:scale-90 cursor-pointer"
                              title={`Delete ${f.symbol} from Forex`}
                              aria-label={`Delete ${f.symbol}`}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── Crypto Section (Shown on Full Dashboard) ── */}
            {activeTab === 'all' && (
              <>
                <SectionHeader
                  title="Crypto Intelligence"
                  badge={`${crypto.length} GLOBAL`}
                  isEditing={isEditing}
                  onToggleEdit={() => setIsEditing(v => !v)}
                  onResetDefaults={handleResetDefaults}
                />
                {crypto.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--theme-card-border)] text-center mono text-xs text-[var(--theme-card-text-muted)] mb-6">
                    No cryptos in this section. Use the search bar above to add crypto or click Reset Defaults.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {crypto.map(c => {
                      const live = getSymbolPrice(c.symbol);
                      const price = live ? live.price : c.base;
                      const currentPct = live ? live.changePct : c.changePct;
                      const up = currentPct >= 0;
                      return (
                        <div key={c.symbol} className="relative group">
                          <Link
                            href={`/chart/${c.symbol}`}
                            className="rounded-xl border inst-subcard p-3 hover:border-emerald-500 transition-all shadow-sm flex flex-col gap-1 group block min-h-[88px]"
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 pr-4">
                                <span className="mono text-[14px] font-black inst-card-text group-hover:text-emerald-500 transition-colors truncate block">
                                  {c.symbol}
                                </span>
                                <div className="text-[11px] inst-card-text-muted font-bold truncate max-w-[70px]">{c.name}</div>
                              </div>
                              <div className="scale-90 origin-top-right">
                                <Sparkline symbol={c.symbol} up={up} changePct={currentPct} />
                              </div>
                            </div>
                            <div className="flex items-end justify-between mt-2">
                              <span className="mono text-[13px] sm:text-[13.5px] font-black inst-card-text">
                                ${price.toLocaleString(undefined, { minimumFractionDigits: price < 1 ? 4 : 2, maximumFractionDigits: price < 1 ? 7 : 2 })}
                              </span>
                              <span className={`mono text-[11.5px] sm:text-[12px] font-bold ${up ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {up ? '▲' : '▼'} {Math.abs(currentPct).toFixed(2)}%
                              </span>
                            </div>
                          </Link>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteCrypto(c.symbol);
                              }}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white hover:bg-rose-600 border border-white/20 flex items-center justify-center text-[10px] font-black shadow-md z-30 transition-transform active:scale-90 cursor-pointer"
                              title={`Delete ${c.symbol} from Crypto`}
                              aria-label={`Delete ${c.symbol}`}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
