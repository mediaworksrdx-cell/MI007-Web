'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MarketType } from '@/lib/types';
import { searchZerodhaStocks } from '@/lib/screener/zerodhaStocks';

export interface ChartInstrumentItem {
  symbol: string;
  name: string;
  category: 'STOCK' | 'INDEX' | 'COMMODITY' | 'FOREX' | 'CRYPTO';
  market?: MarketType;
  exchange: string;
  currency: string;
  flag: string;
  basePrice: number;
  sector?: string;
}

export const MASTER_CHART_INSTRUMENTS: ChartInstrumentItem[] = [
  // ─── INDICES ───
  { symbol: 'NIFTY', name: 'NIFTY 50', category: 'INDEX', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 23146.15, sector: 'Benchmark Index' },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', category: 'INDEX', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 55844.00, sector: 'Banking Index' },
  { symbol: 'SENSEX', name: 'BSE SENSEX', category: 'INDEX', market: 'INDIA', exchange: 'BSE', currency: '₹', flag: '🇮🇳', basePrice: 74729.27, sector: 'Benchmark Index' },
  { symbol: 'FINNIFTY', name: 'NIFTY Financial Services', category: 'INDEX', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 25480.00, sector: 'Financials Index' },
  { symbol: 'MIDCPNIFTY', name: 'NIFTY Midcap Select', category: 'INDEX', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 12480.00, sector: 'Midcap Benchmark' },
  { symbol: 'BANKEX', name: 'BSE BANKEX Index', category: 'INDEX', market: 'INDIA', exchange: 'BSE', currency: '₹', flag: '🇮🇳', basePrice: 62450.00, sector: 'Banking Benchmark' },
  { symbol: 'SPX', name: 'S&P 500 Index', category: 'INDEX', market: 'USA', exchange: 'NYSE', currency: '$', flag: '🇺🇸', basePrice: 7703.58, sector: 'US Benchmark' },
  { symbol: 'NDX', name: 'NASDAQ 100 Index', category: 'INDEX', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 29630.77, sector: 'US Tech Benchmark' },
  { symbol: 'DJI', name: 'Dow Jones Industrial', category: 'INDEX', market: 'USA', exchange: 'NYSE', currency: '$', flag: '🇺🇸', basePrice: 51964.04, sector: 'US Bluechips' },
  { symbol: 'VIX', name: 'CBOE Volatility Index', category: 'INDEX', market: 'USA', exchange: 'CBOE', currency: '$', flag: '🇺🇸', basePrice: 18.56, sector: 'Market Volatility' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'INDEX', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 717.71, sector: 'Tech ETF' },
  { symbol: 'RUT', name: 'Russell 2000 Index', category: 'INDEX', market: 'USA', exchange: 'NYSE', currency: '$', flag: '🇺🇸', basePrice: 2721.37, sector: 'US Small-Cap Benchmark' },
  { symbol: 'DFMGI', name: 'DFM General Index', category: 'INDEX', market: 'UAE', exchange: 'DFM', currency: 'AED', flag: '🇦🇪', basePrice: 4850.00, sector: 'Dubai Benchmark' },
  { symbol: 'ADXGI', name: 'ADX General Index', category: 'INDEX', market: 'UAE', exchange: 'ADX', currency: 'AED', flag: '🇦🇪', basePrice: 9250.00, sector: 'Abu Dhabi Benchmark' },
  { symbol: 'FTSE ADX 15', name: 'FTSE ADX 15 Index', category: 'INDEX', market: 'UAE', exchange: 'ADX', currency: 'AED', flag: '🇦🇪', basePrice: 9410.20, sector: 'UAE Top 15' },

  // ─── COMMODITIES ───
  { symbol: 'GOLD', name: 'Gold Bullion Spot (XAU/USD)', category: 'COMMODITY', exchange: 'COMEX', currency: '$', flag: '🛢️', basePrice: 2735.40, sector: 'Precious Metals' },
  { symbol: 'SILVER', name: 'Silver Spot (XAG/USD)', category: 'COMMODITY', exchange: 'COMEX', currency: '$', flag: '🛢️', basePrice: 31.85, sector: 'Precious Metals' },
  { symbol: 'CRUDEOIL', name: 'Brent Crude Oil', category: 'COMMODITY', exchange: 'ICE', currency: '$', flag: '🛢️', basePrice: 74.20, sector: 'Energy' },
  { symbol: 'WTI', name: 'WTI Light Sweet Crude', category: 'COMMODITY', exchange: 'NYMEX', currency: '$', flag: '🛢️', basePrice: 70.80, sector: 'Energy' },
  { symbol: 'NATGAS', name: 'Natural Gas Henry Hub', category: 'COMMODITY', exchange: 'NYMEX', currency: '$', flag: '🛢️', basePrice: 2.85, sector: 'Energy' },
  { symbol: 'COPPER', name: 'High Grade Copper', category: 'COMMODITY', exchange: 'COMEX', currency: '$', flag: '🛢️', basePrice: 4.38, sector: 'Industrial Metals' },
  { symbol: 'PLATINUM', name: 'Platinum Spot', category: 'COMMODITY', exchange: 'NYMEX', currency: '$', flag: '🛢️', basePrice: 1024.50, sector: 'Precious Metals' },

  // ─── FOREX ───
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'FOREX', exchange: 'FOREX', currency: '$', flag: '💱', basePrice: 1.0845, sector: 'Major Currency' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'FOREX', exchange: 'FOREX', currency: '$', flag: '💱', basePrice: 1.2980, sector: 'Major Currency' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'FOREX', exchange: 'FOREX', currency: '$', flag: '💱', basePrice: 152.40, sector: 'Major Currency' },
  { symbol: 'USDINR', name: 'US Dollar / Indian Rupee', category: 'FOREX', exchange: 'FOREX', currency: '₹', flag: '💱', basePrice: 84.08, sector: 'Emerging Pair' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'FOREX', exchange: 'FOREX', currency: '$', flag: '💱', basePrice: 1.4092, sector: 'Major Currency' },
  { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar', category: 'FOREX', exchange: 'FOREX', currency: '$', flag: '💱', basePrice: 0.9838, sector: 'Commodity Currency' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'FOREX', exchange: 'FOREX', currency: '$', flag: '💱', basePrice: 0.8850, sector: 'Safe Haven' },
  { symbol: 'USDAED', name: 'US Dollar / UAE Dirham', category: 'FOREX', exchange: 'FOREX', currency: 'AED', flag: '💱', basePrice: 3.6725, sector: 'Pegged Currency' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / USD', category: 'FOREX', exchange: 'FOREX', currency: '$', flag: '💱', basePrice: 0.6650, sector: 'Commodity Currency' },

  // ─── CRYPTO ───
  { symbol: 'BTC', name: 'Bitcoin', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 82010.00, sector: 'Store of Value' },
  { symbol: 'ETH', name: 'Ethereum', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 2403.00, sector: 'Smart Contracts' },
  { symbol: 'SOL', name: 'Solana', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 104.37, sector: 'Layer 1' },
  { symbol: 'BNB', name: 'Binance Coin', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 727.00, sector: 'Exchange Ecosystem' },
  { symbol: 'DOGE', name: 'Dogecoin', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 0.079, sector: 'Meme & Payment' },
  { symbol: 'SHIB', name: 'Shiba Inu', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 0.0000185, sector: 'Meme Ecosystem' },
  { symbol: 'XRP', name: 'Ripple XRP', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 1.31, sector: 'Cross-Border Payments' },
  { symbol: 'ADA', name: 'Cardano', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 0.218, sector: 'Proof of Stake L1' },
  { symbol: 'AVAX', name: 'Avalanche', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 9.60, sector: 'Layer 1' },
  { symbol: 'DOT', name: 'Polkadot', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 1.16, sector: 'Interoperability' },
  { symbol: 'LINK', name: 'Chainlink', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 12.09, sector: 'Oracle Network' },
  { symbol: 'MATIC', name: 'Polygon', category: 'CRYPTO', exchange: 'CRYPTO', currency: '$', flag: '🪙', basePrice: 0.126, sector: 'Ethereum L2' },

  // ─── US STOCKS ───
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 214.10, sector: 'Technology' },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 343.50, sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 529.00, sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 354.70, sector: 'Consumer Cyclical' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 250.00, sector: 'Consumer Cyclical' },
  { symbol: 'META', name: 'Meta Platforms Inc.', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 733.40, sector: 'Communication Services' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Google)', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 340.60, sector: 'Communication Services' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 168.50, sector: 'Technology' },
  { symbol: 'NFLX', name: 'Netflix Inc.', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 685.00, sector: 'Communication Services' },
  { symbol: 'INTC', name: 'Intel Corporation', category: 'STOCK', market: 'USA', exchange: 'NASDAQ', currency: '$', flag: '🇺🇸', basePrice: 28.40, sector: 'Technology' },

  // ─── UAE STOCKS ───
  { symbol: 'EMAAR', name: 'Emaar Properties PJSC', category: 'STOCK', market: 'UAE', exchange: 'DFM', currency: 'AED', flag: '🇦🇪', basePrice: 8.45, sector: 'Real Estate' },
  { symbol: 'FAB', name: 'First Abu Dhabi Bank', category: 'STOCK', market: 'UAE', exchange: 'ADX', currency: 'AED', flag: '🇦🇪', basePrice: 13.20, sector: 'Banking' },
  { symbol: 'DEWA', name: 'Dubai Electricity & Water', category: 'STOCK', market: 'UAE', exchange: 'DFM', currency: 'AED', flag: '🇦🇪', basePrice: 2.45, sector: 'Utilities' },
  { symbol: 'SALIK', name: 'Salik Company PJSC', category: 'STOCK', market: 'UAE', exchange: 'DFM', currency: 'AED', flag: '🇦🇪', basePrice: 3.65, sector: 'Toll & Transport' },
  { symbol: 'ALDAR', name: 'Aldar Properties PJSC', category: 'STOCK', market: 'UAE', exchange: 'ADX', currency: 'AED', flag: '🇦🇪', basePrice: 6.82, sector: 'Real Estate' },
  { symbol: 'ENBD', name: 'Emirates NBD Bank', category: 'STOCK', market: 'UAE', exchange: 'DFM', currency: 'AED', flag: '🇦🇪', basePrice: 18.65, sector: 'Banking' },
  { symbol: 'ADNOC', name: 'ADNOC Distribution', category: 'STOCK', market: 'UAE', exchange: 'ADX', currency: 'AED', flag: '🇦🇪', basePrice: 3.75, sector: 'Energy & Retail' },
  { symbol: 'AIRARABIA', name: 'Air Arabia PJSC', category: 'STOCK', market: 'UAE', exchange: 'DFM', currency: 'AED', flag: '🇦🇪', basePrice: 2.65, sector: 'Aviation' },

  // ─── INDIA STOCKS (TOP EQUITIES) ───
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 1211.20, sector: 'Energy & Retail' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 2465.00, sector: 'IT Services' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 728.85, sector: 'Banking & Financials' },
  { symbol: 'INFY', name: 'Infosys Limited', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 1161.20, sector: 'IT Services' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 1383.00, sector: 'Banking' },
  { symbol: 'ITC', name: 'ITC Limited', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 485.50, sector: 'FMCG & Conglomerate' },
  { symbol: 'SBIN', name: 'State Bank of India', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 865.40, sector: 'Public Banking' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 1882.80, sector: 'Telecom' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 283.70, sector: 'Automotive & EV' },
  { symbol: 'ZOMATO', name: 'Zomato (Eternal)', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 248.50, sector: 'Food Delivery & Quick Commerce' },
  { symbol: 'LTIM', name: 'LTIMindtree Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 5420.00, sector: 'IT Services' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 3749.10, sector: 'Infrastructure' },
  { symbol: 'TITAN', name: 'Titan Company Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 3480.00, sector: 'Consumer Luxury' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 7120.40, sector: 'Consumer Finance' },
  { symbol: 'DIXON', name: 'Dixon Technologies Ltd.', category: 'STOCK', market: 'INDIA', exchange: 'NSE', currency: '₹', flag: '🇮🇳', basePrice: 13950.00, sector: 'Electronics Mfg' },
];

interface ChartSymbolSearchProps {
  selectedSymbol: string;
  market: MarketType;
  onSelectInstrument: (item: ChartInstrumentItem) => void;
}

export function ChartSymbolSearch({
  selectedSymbol,
  market: _market,
  onSelectInstrument,
}: ChartSymbolSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'STOCKS' | 'INDICES' | 'COMMODITIES' | 'FOREX' | 'CRYPTO'>('ALL');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Find active instrument metadata
  const currentInstrument = useMemo(() => {
    const clean = selectedSymbol.toUpperCase().replace(/[\s\/-]+/g, '');
    const found = MASTER_CHART_INSTRUMENTS.find(
      (i) => i.symbol.toUpperCase().replace(/[\s\/-]+/g, '') === clean
    );
    if (found) return found;

    // Fallback: Check Zerodha stocks
    const zd = searchZerodhaStocks(clean, 1)[0];
    if (zd) {
      return {
        symbol: zd.symbol,
        name: zd.name,
        category: 'STOCK' as const,
        market: 'INDIA' as const,
        exchange: zd.exchange || 'NSE',
        currency: '₹',
        flag: '🇮🇳',
        basePrice: zd.lastPrice || 1000,
        sector: zd.sector || 'Indian Equity',
      };
    }

    return {
      symbol: selectedSymbol,
      name: selectedSymbol,
      category: 'STOCK' as const,
      exchange: 'GLOBAL',
      currency: '₹',
      flag: '📈',
      basePrice: 1000,
    };
  }, [selectedSymbol]);

  // Compute live filtered suggestions
  const searchResults = useMemo(() => {
    const q = query.trim().toUpperCase();
    let pool = MASTER_CHART_INSTRUMENTS;

    // Filter by asset class
    if (categoryFilter === 'STOCKS') {
      pool = pool.filter((i) => i.category === 'STOCK');
    } else if (categoryFilter === 'INDICES') {
      pool = pool.filter((i) => i.category === 'INDEX');
    } else if (categoryFilter === 'COMMODITIES') {
      pool = pool.filter((i) => i.category === 'COMMODITY');
    } else if (categoryFilter === 'FOREX') {
      pool = pool.filter((i) => i.category === 'FOREX');
    } else if (categoryFilter === 'CRYPTO') {
      pool = pool.filter((i) => i.category === 'CRYPTO');
    }

    let results: ChartInstrumentItem[] = [];

    if (!q) {
      results = pool.slice(0, 16);
    } else {
      // Direct matches from master catalog (with typo tolerance for UAD -> USD / AUD)
      results = pool.filter(
        (i) =>
          i.symbol.toUpperCase().includes(q) ||
          i.name.toUpperCase().includes(q) ||
          (i.sector && i.sector.toUpperCase().includes(q)) ||
          (q.includes('UAD') && (i.symbol.includes('USD') || i.symbol.includes('AUD')))
      );

      // Deep match across 3,820+ Zerodha Kite stocks & indices
      if (categoryFilter === 'ALL' || categoryFilter === 'STOCKS' || categoryFilter === 'INDICES') {
        const zdMatches = searchZerodhaStocks(q, 35);
        const existingSyms = new Set(results.map((r) => r.symbol.toUpperCase()));
        for (const zd of zdMatches) {
          if (!existingSyms.has(zd.symbol.toUpperCase())) {
            const isIdx = zd.sector?.includes('Index') || zd.name?.includes('INDEX');
            if (categoryFilter === 'INDICES' && !isIdx) continue;
            if (categoryFilter === 'STOCKS' && isIdx) continue;

            results.push({
              symbol: zd.symbol,
              name: zd.name,
              category: isIdx ? 'INDEX' : 'STOCK',
              market: 'INDIA',
              exchange: zd.exchange || 'NSE',
              currency: '₹',
              flag: '🇮🇳',
              basePrice: zd.lastPrice || 1000,
              sector: zd.sector || (isIdx ? 'Benchmark Index' : 'Indian Equity'),
            });
          }
        }
      }
    }

    return results.slice(0, 36);
  }, [query, categoryFilter]);

  // Auto-reset highlight index on search change
  useEffect(() => {
    setHighlightIndex(0);
  }, [query, categoryFilter]);

  const handleSelect = (item: ChartInstrumentItem) => {
    onSelectInstrument(item);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1 < searchResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[highlightIndex]) {
        handleSelect(searchResults[highlightIndex]);
      } else if (query.trim()) {
        handleSelect({
          symbol: query.trim().toUpperCase(),
          name: query.trim().toUpperCase(),
          category: 'STOCK',
          exchange: 'CUSTOM',
          currency: '₹',
          flag: '📈',
          basePrice: 1000,
        });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative z-50 flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#070A12] backdrop-blur-md"
    >
      {/* ── Left side: Active Symbol Badge & Quick Search Trigger ── */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {/* Active Symbol Display */}
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono cursor-pointer transition-all shrink-0 shadow-2xs group"
          title="Click to search instruments"
        >
          <span className="text-sm shrink-0">{currentInstrument.flag}</span>
          <span className="font-black text-xs sm:text-[13px] tracking-wider truncate">
            {currentInstrument.symbol}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hidden sm:inline-block">
            {currentInstrument.category}
          </span>
        </div>

        {/* ── Prominent Search Input Box ── */}
        <div className="relative flex-1 max-w-xl">
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none text-xs">
              🔍
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search all instruments (Stocks, Indices, Commodities, Forex, Crypto)..."
              className="w-full pl-8 pr-14 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0E1526] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
            />
            <div className="absolute right-2.5 flex items-center gap-1">
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs px-1 cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-400 dark:text-slate-500 font-bold">
                  /
                </kbd>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Asset Class Shortcuts ── */}
      <div className="hidden lg:flex items-center gap-1 shrink-0">
        {(['ALL', 'STOCKS', 'INDICES', 'COMMODITIES', 'FOREX', 'CRYPTO'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setCategoryFilter(cat);
              setIsOpen(true);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
              categoryFilter === cat
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Expandable Floating Search Dropdown (Institutional TV Style) ── */}
      {isOpen && (
        <div className="absolute top-full left-3 right-3 mt-1.5 max-h-96 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/98 dark:bg-[#0A0E1A]/98 backdrop-blur-xl shadow-2xl z-[120] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-100">
          {/* Category Tabs Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 px-3 py-2 flex-wrap gap-1.5">
            <div className="flex items-center gap-1">
              {(['ALL', 'STOCKS', 'INDICES', 'COMMODITIES', 'FOREX', 'CRYPTO'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-medium">
              {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'} · Use ↑↓ and Enter
            </div>
          </div>

          {/* Search Result Items */}
          <div ref={listRef} className="overflow-y-auto max-h-80 divide-y divide-slate-100 dark:divide-slate-800/60">
            {searchResults.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  No predefined instrument found matching &ldquo;<span className="font-bold text-slate-800 dark:text-slate-200">{query}</span>&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handleSelect({
                      symbol: query.trim().toUpperCase(),
                      name: query.trim().toUpperCase(),
                      category: 'STOCK',
                      exchange: 'CUSTOM',
                      currency: '₹',
                      flag: '📈',
                      basePrice: 1000,
                    })
                  }
                  className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-mono text-xs font-black shadow-xs hover:bg-emerald-400 cursor-pointer"
                >
                  Load Chart for &ldquo;{query.trim().toUpperCase()}&rdquo; →
                </button>
              </div>
            ) : (
              searchResults.map((item, idx) => {
                const isSelected = item.symbol.toUpperCase() === selectedSymbol.toUpperCase();
                const isHighlighted = idx === highlightIndex;
                return (
                  <div
                    key={`${item.category}-${item.symbol}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`flex items-center justify-between px-3.5 py-2.5 transition-colors cursor-pointer ${
                      isHighlighted
                        ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
                        : isSelected
                        ? 'bg-emerald-500/5'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-base shrink-0">{item.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs sm:text-[13px] text-slate-900 dark:text-slate-100">
                            {item.symbol}
                          </span>
                          <span
                            className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              item.category === 'INDEX'
                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                : item.category === 'COMMODITY'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : item.category === 'FOREX'
                                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                : item.category === 'CRYPTO'
                                ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {item.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            {item.exchange}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                          {item.name} {item.sector ? `· ${item.sector}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <div className="font-mono font-bold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100">
                        {item.currency}
                        {item.basePrice.toLocaleString(undefined, {
                          minimumFractionDigits: item.basePrice < 2 ? 4 : 2,
                          maximumFractionDigits: item.basePrice < 2 ? 4 : 2,
                        })}
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-mono font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                          <span>ACTIVE</span>
                          <span>✓</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
