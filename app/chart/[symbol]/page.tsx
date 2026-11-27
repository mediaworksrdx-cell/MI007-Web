'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { TerminalAccessGate } from '@/components/auth/TerminalAccessGate';
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
    of?: string;
    orderflow?: string;
    setupId?: string;
    tf?: string;
    time?: string;
    entry?: string;
    sl?: string;
    tp?: string;
    dir?: string;
    setupName?: string;
  }>;
}

const CRYPTO_SET = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'SHIB', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC', 'POL', 'BTCUSD', 'BTCUSDT', 'ETHUSD', 'ETHUSDT', 'SOLUSD', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT']);
const COMMODITIES_SET = new Set(['GOLD', 'XAU', 'XAUUSD', 'SILVER', 'XAG', 'XAGUSD', 'CRUDEOIL', 'CRUDE', 'OIL', 'BRENT', 'WTI', 'NATGAS', 'NATURALGAS', 'COPPER', 'PLATINUM']);
const FOREX_SET = new Set(['EURUSD', 'GBPUSD', 'USDJPY', 'USDINR', 'USDAED', 'AUDUSD', 'USDCAD', 'AUDCAD', 'UADCAD', 'USDCHF', 'NZDUSD']);
const USA_SET = new Set([
  'SPX', 'NDX', 'NASDAQ', 'DJI', 'VIX', 'VIXY', 'QQQ', 'RUT', 'SPY', 'DIA',
  'AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'GOOG', 'AMD', 'NFLX', 'INTC',
  'S&P 500', 'NASDAQ 100', 'DOW JONES'
]);
const UAE_SET = new Set(['DFMGI', 'ADXGI', 'ADX', 'EMAAR', 'FAB', 'DEWA', 'ALDAR', 'ENBD', 'ADNOC', 'AIRARABIA', 'DFM GENERAL', 'ADX GENERAL', 'FTSE ADX 15', 'SALIK', 'DFM']);

function ChartPageContent({ params, searchParams }: ChartPageProps) {
  const unwrappedParams = use(params);
  const unwrappedSearchParams = use(searchParams);
  const symbol = unwrappedParams?.symbol || 'NIFTY';
  const resolvedSearchParams = unwrappedSearchParams || {};
  const { market: marketParam, from } = resolvedSearchParams;
  const isFromScreener = from === 'screener';

  const cleanSym = symbol.toUpperCase().replace(/[\s\/-]+/g, '');
  const isCrypto = CRYPTO_SET.has(cleanSym) || cleanSym.endsWith('USDT') || cleanSym.endsWith('USD');
  const isCommodity = COMMODITIES_SET.has(cleanSym);
  const isForex = FOREX_SET.has(cleanSym) || /^(EUR|GBP|USD|AUD|NZD|CAD|CHF|JPY|INR|AED){2}$/.test(cleanSym);

  const validMarkets: MarketType[] = ['INDIA', 'USA', 'UAE'];
  let defaultMarket: MarketType = 'INDIA';

  // Strict market precedence: Global asset classes (Forex, Commodities, Crypto, US stocks) must always route to USA
  if (isCrypto || isCommodity || isForex || USA_SET.has(cleanSym)) {
    defaultMarket = 'USA';
  } else if (UAE_SET.has(cleanSym)) {
    defaultMarket = 'UAE';
  } else if (marketParam && validMarkets.includes(marketParam as MarketType)) {
    defaultMarket = marketParam as MarketType;
  }

  const [market, setMarket] = useState<MarketType>(defaultMarket);
  const [returnTab, setReturnTab] = useState<string>('analysis');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('mi007_return_tab');
        if (stored) setReturnTab(stored);
      } catch {}
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

      <main className="pt-[84px] sm:pt-[88px] h-[100dvh] max-h-[100dvh] flex flex-col bg-transparent relative z-10 overflow-hidden">
        <TerminalAccessGate showStatusBanner={false}>
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
            initialTime={resolvedSearchParams.time}
            initialEntry={resolvedSearchParams.entry}
            initialSl={resolvedSearchParams.sl}
            initialTp={resolvedSearchParams.tp}
            initialDir={resolvedSearchParams.dir}
            initialSetupName={resolvedSearchParams.setupName}
          />
        </div>
        </TerminalAccessGate>
      </main>
    </>
  );
}

export default function ChartPage(props: ChartPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060A11] text-slate-200 flex flex-col items-center justify-center p-6 font-mono select-none">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading terminal stream...</span>
          </div>
        </div>
      }
    >
      <ChartPageContent {...props} />
    </Suspense>
  );
}
