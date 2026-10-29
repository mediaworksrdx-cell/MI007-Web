'use client';

import { useState, useEffect, use } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { ChartContainer } from '@/components/chart/ChartContainer';
import { MarketType } from '@/lib/types';

interface ChartPageProps {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{
    market?: string;
    from?: string;
    strategies?: string;
    indicators?: string;
    smc?: string;
    setupId?: string;
    tf?: string;
  }>;
}

const CRYPTO_SET = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC']);
const COMMODITIES_SET = new Set(['GOLD', 'XAUUSD', 'SILVER', 'XAGUSD', 'CRUDEOIL', 'BRENT', 'WTI', 'NATGAS', 'COPPER', 'PLATINUM']);
const FOREX_SET = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'USDINR', 'USDAED', 'AUDUSD', 'USDCAD', 'AUDCAD', 'UADCAD', 'USDCHF', 'NZDUSD']);
const USA_SET = new Set([
  'SPX', 'NDX', 'DJI', 'VIX', 'VIXY', 'QQQ',
  'AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'GOOG',
  'S&P 500', 'NASDAQ 100', 'DOW JONES'
]);
const UAE_SET = new Set(['DFMGI', 'ADXGI', 'ADX', 'EMAAR', 'FAB', 'DEWA', 'ALDAR', 'ENBD', 'ADNOC', 'AIRARABIA', 'DFM GENERAL', 'ADX GENERAL', 'FTSE ADX 15']);

export default function ChartPage({ params, searchParams }: ChartPageProps) {
  const { symbol } = use(params);
  const resolvedSearchParams = use(searchParams);
  const { market: marketParam, from } = resolvedSearchParams;
  const isFromScreener = from === 'screener';

  const cleanSym = symbol.toUpperCase().replace(/[\s\/-]+/g, '');
  const isCrypto = CRYPTO_SET.has(cleanSym);
  const isCommodity = COMMODITIES_SET.has(cleanSym);
  const isForex = FOREX_SET.has(cleanSym);

  const validMarkets: MarketType[] = ['INDIA', 'USA', 'UAE'];
  let defaultMarket: MarketType = 'INDIA';

  if (marketParam && validMarkets.includes(marketParam as MarketType)) {
    defaultMarket = marketParam as MarketType;
  } else if (USA_SET.has(cleanSym)) {
    defaultMarket = 'USA';
  } else if (UAE_SET.has(cleanSym)) {
    defaultMarket = 'UAE';
  } else if (isCrypto || isCommodity || isForex) {
    defaultMarket = 'USA';
  }

  const [market, setMarket] = useState<MarketType>(defaultMarket);
  const [returnTab, setReturnTab] = useState<string>('analysis');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('mi007_return_tab');
      if (stored) setReturnTab(stored);
    }
  }, []);

  let backHref = '/terminal';
  let backLabel = 'BACK TO TERMINAL';

  if (isFromScreener) {
    if (returnTab === 'smcScanner') {
      backHref = '/terminal/screener?tab=smcScanner';
      backLabel = 'BACK TO SMC SCANNER';
    } else if (returnTab === 'technicalScreener') {
      backHref = '/terminal/screener?tab=technicalScreener';
      backLabel = 'BACK TO STRATEGIES';
    } else if (returnTab === 'watchlists') {
      backHref = '/terminal/screener?tab=watchlists';
      backLabel = 'BACK TO WATCHLISTS';
    } else {
      backHref = `/terminal/screener?tab=analysis&symbol=${cleanSym}`;
      backLabel = `BACK TO ${cleanSym}`;
    }
  }

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="pt-[89px] sm:pt-[93px] h-screen flex flex-col bg-transparent relative z-10 overflow-hidden">
        {/* ── Full Chart Terminal ── */}
        <div className="flex-1 min-h-0 w-full h-full p-0">
          <ChartContainer
            market={market}
            defaultSymbol={cleanSym}
            backHref={backHref}
            backLabel={backLabel}
            isStandalone={true}
            initialStrategies={resolvedSearchParams.strategies}
            initialIndicatorsParam={resolvedSearchParams.indicators}
            initialSmcParam={resolvedSearchParams.smc}
            initialSetupId={resolvedSearchParams.setupId}
            initialTfParam={resolvedSearchParams.tf}
          />
        </div>
      </main>
    </>
  );
}
