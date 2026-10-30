// ─── Screener Master Workspace Cockpit ───────────────────────────────────────
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMarket } from '@/lib/marketContext';
import { MARKETS } from '@/lib/types';
import { MarketRegion, CompanyFundamental, SavedScreen, CustomRatio, Watchlist, ScreeningAlert } from '@/lib/screener/types';
import {
  MASTER_COMPANIES,
  getCompaniesByMarket,
  getAllCompanies,
  getCompanyBySymbol,
  getSectors,
} from '@/lib/screener/data';
import { findZerodhaStockBySymbol, generateFundamentalFromZerodha } from '@/lib/screener/zerodhaStocks';
import { parseQuery, evaluateNode } from '@/lib/screener/queryEngine';
import {
  getSavedScreens,
  saveUserScreen,
  deleteSavedScreen,
  getWatchlists,
  saveWatchlist,
  toggleSymbolInWatchlist,
  addSymbolToWatchlist,
  getCustomRatios,
  saveCustomRatio,
  deleteCustomRatio,
  getScreeningAlerts,
  saveScreeningAlert,
  toggleAlertStatus,
  getColumnPreferences,
  saveColumnPreferences,
  DEFAULT_COLUMNS,
} from '@/lib/screener/persistence';
import { PREDEFINED_SCREENS } from '@/lib/screener/templates';
import { useTradeEngine } from '@/lib/tradeEngineContext';
import { workspaceSync } from '@/lib/workspaceSync';
import { TopToolbar } from './TopToolbar';
import { QueryEditor } from './QueryEditor';
import { ResultsTable, TableViewPreset } from './ResultsTable';
import { ColumnSelectorModal } from './ColumnSelectorModal';
import { CompanySearchModal } from './CompanySearchModal';
import { CompanyAnalysisView } from './CompanyAnalysisView';
import { DiscoverScreensView } from './DiscoverScreensView';
import { CustomQueryBuilderView } from './CustomQueryBuilderView';
import { WatchlistsView } from './WatchlistsView';
import { PeerComparisonView } from './PeerComparisonView';
import { ScreeningAlertsView } from './ScreeningAlertsView';
import { TechnicalStrategyScreenerView } from './TechnicalStrategyScreenerView';
import { SmcScannerView } from './SmcScannerView';
import { BacktestingView } from './BacktestingView';
import { SaveScreenModal } from './SaveScreenModal';
import { CustomRatioModal } from './CustomRatioModal';
import { StrategyId } from '@/lib/screener/technicalStrategies';

const DEFAULT_PEER_SYMBOLS: Record<MarketRegion, string[]> = {
  INDIA: ['TCS', 'INFY'],
  USA: ['AAPL', 'MSFT'],
  UAE: ['EMAAR', 'ALDAR'],
};

export function ScreenerWorkspace() {
  const searchParams = useSearchParams();
  const urlSymbol = searchParams?.get('symbol')?.toUpperCase();
  const urlTab = searchParams?.get('tab') as any;

  const { market: globalMarket, setMarket: setGlobalMarket } = useMarket();
  const [market, setMarket] = useState<MarketRegion>((globalMarket as MarketRegion) || 'INDIA');
  const [activeTab, setActiveTab] = useState<
    | 'screener'
    | 'smcScanner'
    | 'technicalScreener'
    | 'backtesting'
    | 'queryBuilder'
    | 'discover'
    | 'watchlists'
    | 'analysis'
    | 'peers'
    | 'alerts'
  >(
    urlTab && ['screener', 'smcScanner', 'technicalScreener', 'backtesting', 'queryBuilder', 'discover', 'watchlists', 'analysis', 'peers', 'alerts'].includes(urlTab)
      ? (urlTab as any)
      : urlTab === 'saved'
      ? 'discover'
      : 'screener'
  );
  const [activeViewPreset, setActiveViewPreset] = useState<TableViewPreset>('overview');

  // Zerodha Kite Trade Engine Integration
  const { getSymbolPrice, status: tradeEngineStatus } = useTradeEngine();

  // Query State
  const defaultScreen = PREDEFINED_SCREENS[0];
  const [currentQuery, setCurrentQuery] = useState<string>(defaultScreen.query);
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [sortColumn, setSortColumn] = useState<string>('marketCap');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);

  // Active Company Selection (Starts unselected, resets on market/country switch)
  const [selectedSymbol, setSelectedSymbol] = useState<string>(urlSymbol || '');
  const [peerSymbols, setPeerSymbols] = useState<string[]>(
    DEFAULT_PEER_SYMBOLS[(globalMarket as MarketRegion) || 'INDIA'] || ['TCS', 'INFY']
  );
  const prevMarketRef = React.useRef<MarketRegion>(market);

  // Modals & Navigation Parameters State
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [saveScreenModalOpen, setSaveScreenModalOpen] = useState(false);
  const [customRatioModalOpen, setCustomRatioModalOpen] = useState(false);
  const [backtestParams, setBacktestParams] = useState<{ symbol: string; strategyId: StrategyId } | null>(null);

  // Persistence State
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [customRatios, setCustomRatios] = useState<CustomRatio[]>([]);
  const [alerts, setAlerts] = useState<ScreeningAlert[]>([]);

  // Sync tab and symbol from URL parameters or session storage return flags
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    const symbolParam = searchParams?.get('symbol');
    if (symbolParam) {
      const clean = symbolParam.toUpperCase();
      setSelectedSymbol(clean);
      const comp = getCompanyBySymbol(clean);
      if (comp && comp.market) {
        setMarket(comp.market);
        prevMarketRef.current = comp.market;
      }
    }
    if (tabParam) {
      setActiveTab(tabParam === 'saved' ? 'discover' : (tabParam as any));
    }
    const queryParam = searchParams?.get('q');
    if (queryParam) {
      setCurrentQuery(queryParam);
    } else if (typeof window !== 'undefined') {
      const cmdQuery = sessionStorage.getItem('mi007_cmd_query');
      if (cmdQuery) {
        setCurrentQuery(cmdQuery);
        sessionStorage.removeItem('mi007_cmd_query');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const handleReturnToScreener = () => {
      if (typeof window !== 'undefined') {
        const returnTab = sessionStorage.getItem('mi007_return_tab');
        const returnSymbol = sessionStorage.getItem('mi007_return_symbol');
        if (returnSymbol) {
          const clean = returnSymbol.toUpperCase();
          setSelectedSymbol(clean);
          sessionStorage.removeItem('mi007_return_symbol');
          const comp = getCompanyBySymbol(clean);
          if (comp && comp.market) {
            setMarket(comp.market);
            prevMarketRef.current = comp.market;
          }
        }
        if (returnTab) {
          sessionStorage.removeItem('mi007_return_tab');
          setActiveTab(returnTab === 'saved' ? 'discover' : (returnTab as any));
        }
      }
    };

    handleReturnToScreener();
    window.addEventListener('popstate', handleReturnToScreener);
    window.addEventListener('pageshow', handleReturnToScreener);
    return () => {
      window.removeEventListener('popstate', handleReturnToScreener);
      window.removeEventListener('pageshow', handleReturnToScreener);
    };
  }, []);

  // Sync with client-side localStorage and multi-tab BroadcastChannel
  useEffect(() => {
    setSavedScreens(getSavedScreens());
    setWatchlists(getWatchlists());
    setCustomRatios(getCustomRatios());
    setAlerts(getScreeningAlerts());
    setSelectedColumns(getColumnPreferences());

    const unsub = workspaceSync.subscribe((ev) => {
      if (ev.type === 'WATCHLIST_UPDATED') {
        setWatchlists(getWatchlists());
      } else if (ev.type === 'SCREENS_UPDATED') {
        setSavedScreens(getSavedScreens());
      } else if (ev.type === 'ALERTS_UPDATED') {
        setAlerts(getScreeningAlerts());
      }
    });
    return () => unsub();
  }, []);

  // Update market only when user actually switches the global market from the navbar
  useEffect(() => {
    if (globalMarket && ['INDIA', 'USA', 'UAE'].includes(globalMarket) && globalMarket !== prevMarketRef.current) {
      prevMarketRef.current = globalMarket as MarketRegion;
      setMarket(globalMarket as MarketRegion);

      // Reset selected company and sector so no country data stays stuck across countries
      setSectorFilter('ALL');
      setSelectedSymbol('');
      setPeerSymbols(DEFAULT_PEER_SYMBOLS[globalMarket as MarketRegion] || ['TCS', 'INFY']);
    }
  }, [globalMarket]);

  const handleMarketChange = (newMarket: MarketRegion) => {
    prevMarketRef.current = newMarket;
    setMarket(newMarket);
    setGlobalMarket(newMarket);
    setSectorFilter('ALL');
    // Reset selected company so no company stays stuck across countries
    setSelectedSymbol('');
    setPeerSymbols(DEFAULT_PEER_SYMBOLS[newMarket] || ['TCS', 'INFY']);
  };

  // Keyboard shortcut '/' to open company search modal (Ctrl+K opens Global Command Palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !searchModalOpen) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setSearchModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen]);

  // Companies for current market enriched with live Zerodha Kite streaming ticks
  const marketCompanies = useMemo(() => {
    const base = getCompaniesByMarket(market);
    return base.map((comp) => {
      const live = getSymbolPrice(comp.symbol);
      if (!live || !live.price) return comp;

      const currentPrice = live.price;
      const priceChangePct = live.changePct ?? comp.priceChangePct;

      // Dynamically calculate live P/E if annual EPS is available
      const latestEps = comp.annualProfitLoss && comp.annualProfitLoss[0]?.eps;
      const pe = latestEps && latestEps > 0
        ? Math.round((currentPrice / latestEps) * 10) / 10
        : comp.pe;

      // Scaled Market Cap based on live price ratio
      const originalPrice = comp.currentPrice || currentPrice;
      const marketCap = Math.round(comp.marketCap * (currentPrice / originalPrice));

      return {
        ...comp,
        currentPrice,
        priceChangePct,
        pe,
        marketCap,
        tickDirection: live.tickDirection,
        lastUpdated: new Date(live.lastUpdated).toLocaleTimeString(),
        isLiveTick: true,
      };
    });
  }, [market, getSymbolPrice]);

  // Master list of all companies enriched with live Zerodha Kite ticks
  const allCompaniesEnriched = useMemo(() => {
    return getAllCompanies().map((comp) => {
      const live = getSymbolPrice(comp.symbol);
      if (!live || !live.price) return comp;

      const currentPrice = live.price;
      const priceChangePct = live.changePct ?? comp.priceChangePct;
      const latestEps = comp.annualProfitLoss && comp.annualProfitLoss[0]?.eps;
      const pe = latestEps && latestEps > 0
        ? Math.round((currentPrice / latestEps) * 10) / 10
        : comp.pe;
      const originalPrice = comp.currentPrice || currentPrice;
      const marketCap = Math.round(comp.marketCap * (currentPrice / originalPrice));

      return {
        ...comp,
        currentPrice,
        priceChangePct,
        pe,
        marketCap,
        tickDirection: live.tickDirection,
        lastUpdated: new Date(live.lastUpdated).toLocaleTimeString(),
        isLiveTick: true,
      };
    });
  }, [getSymbolPrice]);

  const availableSectors = useMemo(() => {
    return getSectors(market);
  }, [market]);

  // Execute Query in Real Time
  const { filteredCompanies, executionTimeMs, queryValid } = useMemo(() => {
    const start = performance.now();
    let comps = marketCompanies;

    if (sectorFilter && sectorFilter !== 'ALL') {
      comps = comps.filter((c) => c.sector.toLowerCase() === sectorFilter.toLowerCase());
    }

    let parsedAst: any = null;
    let isValid = true;

    if (currentQuery && currentQuery.trim()) {
      const res = parseQuery(currentQuery);
      if (res.valid && res.ast) {
        parsedAst = res.ast;
      } else {
        isValid = res.valid;
      }
    }

    if (parsedAst) {
      comps = comps.filter((c) => evaluateNode(parsedAst, c));
    }

    // Sort
    const sorted = [...comps].sort((a, b) => {
      const valA = (a as any)[sortColumn] ?? -Infinity;
      const valB = (b as any)[sortColumn] ?? -Infinity;
      if (sortDirection === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });

    const elapsed = Math.round((performance.now() - start) * 10) / 10;
    return {
      filteredCompanies: sorted,
      executionTimeMs: elapsed,
      queryValid: isValid,
    };
  }, [marketCompanies, sectorFilter, currentQuery, sortColumn, sortDirection]);

  // Sort handler
  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('desc');
    }
  };

  // Run screen from predefined or saved
  const handleRunSavedScreen = (screen: SavedScreen) => {
    setCurrentQuery(screen.query);
    if (screen.columns && screen.columns.length > 0) {
      setSelectedColumns(screen.columns);
    }
    if (screen.sortColumn) {
      setSortColumn(screen.sortColumn);
      setSortDirection(screen.sortDirection || 'desc');
    }
    if (screen.market && screen.market !== market) {
      handleMarketChange(screen.market);
    }
    setActiveTab('screener');
  };

  // Open Company Analysis View
  const handleOpenCompanyAnalysis = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('analysis');
  };

  // Open Peer Comparison
  const handleOpenPeerComparison = (symbols: string | string[]) => {
    if (Array.isArray(symbols)) {
      setPeerSymbols(symbols);
    } else {
      const comp = getCompanyBySymbol(symbols);
      if (comp) {
        const sectorPeers = getCompaniesByMarket(comp.market).filter(
          (c) => c.sector === comp.sector && c.symbol !== symbols
        ).map((c) => c.symbol);
        setPeerSymbols([symbols, ...(sectorPeers.slice(0, 4))]);
      } else {
        setPeerSymbols([symbols]);
      }
    }
    setActiveTab('peers');
  };

  // Watchlist Actions
  const currentWatchlist = watchlists[0];
  const watchlistSymbols = currentWatchlist?.symbols || [];

  const handleToggleWatchlist = (symbol: string) => {
    if (!currentWatchlist) return;
    const updated = toggleSymbolInWatchlist(currentWatchlist.id, symbol);
    setWatchlists(updated);
  };

  // Selected Company for Analysis View
  const targetCompany = useMemo(() => {
    if (!selectedSymbol) return null;
    const cleanSym = selectedSymbol.toUpperCase().trim();
    const found = allCompaniesEnriched.find((c) => c.symbol.toUpperCase() === cleanSym);
    if (found) return found;

    // Resilient fallback for any Zerodha 3,800+ stock
    const zd = findZerodhaStockBySymbol(cleanSym);
    if (zd) {
      const live = getSymbolPrice(zd.symbol);
      const price = (live && live.price > 0) ? live.price : (zd.lastPrice || 250);
      const generated = generateFundamentalFromZerodha(zd, price);
      return {
        ...generated,
        currentPrice: price,
        priceChangePct: live?.changePct ?? 0,
        isLiveTick: Boolean(live),
        lastUpdated: live ? new Date(live.lastUpdated).toLocaleTimeString() : generated.lastUpdated,
      };
    }

    return null;
  }, [selectedSymbol, allCompaniesEnriched, getSymbolPrice]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Toolbar ── */}
      <TopToolbar
        market={market}
        onChangeMarket={handleMarketChange}
        sector={sectorFilter}
        onChangeSector={setSectorFilter}
        availableSectors={availableSectors}
        savedScreens={savedScreens}
        onSelectSavedScreen={handleRunSavedScreen}
        onOpenSearchModal={() => setSearchModalOpen(true)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        selectedSymbol={selectedSymbol}
        tradeEngineStatus={tradeEngineStatus}
      />

      {/* ── 1. Stock Screener Workspace ── */}
      {activeTab === 'screener' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Direct Expression Editor */}
          <QueryEditor
            query={currentQuery}
            onChangeQuery={setCurrentQuery}
            onRunScreen={() => {
              if (typeof document !== 'undefined') {
                const el = document.getElementById('screener-results-table');
                el?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            onResetQuery={() => {
              setCurrentQuery('');
              setSectorFilter('ALL');
            }}
            onOpenSaveScreen={() => setSaveScreenModalOpen(true)}
            matchCount={filteredCompanies.length}
          />

          {/* Screening Results Table */}
          <ResultsTable
            companies={filteredCompanies}
            columns={selectedColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onOpenColumnSelector={() => setColumnModalOpen(true)}
            onSelectCompany={handleOpenCompanyAnalysis}
            onToggleWatchlist={handleToggleWatchlist}
            watchlistSymbols={watchlistSymbols}
            totalMatches={marketCompanies.length}
            executionTimeMs={executionTimeMs}
            dataFreshness={targetCompany?.dataFreshness}
            tradeEngineStatus={tradeEngineStatus}
            activePreset={activeViewPreset}
            onSelectPreset={(p, cols) => {
              setActiveViewPreset(p);
              setSelectedColumns(cols);
            }}
          />
        </div>
      )}

      {/* ── 2. Smart Money Concepts (SMC) Institutional Scanner ── */}
      {activeTab === 'smcScanner' && (
        <SmcScannerView
          companies={marketCompanies}
          market={market}
          onSelectCompany={handleOpenCompanyAnalysis}
          onBackToScreener={() => setActiveTab('screener')}
        />
      )}

      {/* ── 3. Technical Strategy Screener (14 Quantitative Models) ── */}
      {activeTab === 'technicalScreener' && (
        <TechnicalStrategyScreenerView
          companies={marketCompanies}
          market={market}
          onSelectCompany={handleOpenCompanyAnalysis}
          onOpenBacktest={(sym, stratId) => {
            setBacktestParams({ symbol: sym, strategyId: stratId });
            setActiveTab('backtesting');
          }}
          onBackToScreener={() => setActiveTab('screener')}
        />
      )}

      {/* ── 2b. Quantitative Strategy Backtesting Laboratory ── */}
      {activeTab === 'backtesting' && (
        <BacktestingView
          companies={marketCompanies}
          initialSymbol={backtestParams?.symbol || marketCompanies[0]?.symbol || 'RELIANCE'}
          initialStrategyId={backtestParams?.strategyId || 'ma_alignment'}
          onBackToScreener={() => setActiveTab('technicalScreener')}
          onSelectCompany={handleOpenCompanyAnalysis}
        />
      )}

      {/* ── 3. Custom Query Builder Diagnostic Lab ── */}
      {activeTab === 'queryBuilder' && (
        <CustomQueryBuilderView
          initialQuery={currentQuery}
          onApplyQuery={(q) => {
            setCurrentQuery(q);
            setActiveTab('screener');
          }}
          onSaveStrategy={(newScreen) => {
            const updated = saveUserScreen(newScreen);
            setSavedScreens(updated);
          }}
          onDeleteSavedScreen={(id) => {
            const updated = deleteSavedScreen(id);
            setSavedScreens(updated);
          }}
          onBackToScreener={() => setActiveTab('screener')}
          onNavigateToDiscover={() => setActiveTab('discover')}
          companies={marketCompanies}
          savedScreens={savedScreens}
          market={market}
          onSelectCompany={handleOpenCompanyAnalysis}
        />
      )}

      {/* ── 4. Discover Screens Workspace (Includes Curated and User-Saved Strategies) ── */}
      {activeTab === 'discover' && (
        <DiscoverScreensView
          screens={savedScreens}
          market={market}
          onRunScreen={handleRunSavedScreen}
          onCustomizeScreen={(s) => {
            setCurrentQuery(s.query);
            setActiveTab('queryBuilder');
          }}
          onEditScreen={(s) => {
            setCurrentQuery(s.query);
            setActiveTab('queryBuilder');
          }}
          onDuplicateScreen={(s) => {
            const copy: SavedScreen = {
              ...s,
              id: `screen-${Date.now()}`,
              name: `${s.name} (Copy)`,
              isPredefined: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            const updated = saveUserScreen(copy);
            setSavedScreens(updated);
          }}
          onDeleteScreen={(id) => {
            const updated = deleteSavedScreen(id);
            setSavedScreens(updated);
          }}
          onBackToScreener={() => setActiveTab('screener')}
          onOpenQueryBuilder={() => setActiveTab('queryBuilder')}
        />
      )}

      {/* ── 5. Watchlists Workspace ── */}
      {activeTab === 'watchlists' && (
        <WatchlistsView
          watchlists={watchlists}
          companies={allCompaniesEnriched}
          onSelectCompany={handleOpenCompanyAnalysis}
          onBackToScreener={() => setActiveTab('screener')}
          onRemoveSymbol={(wlId, sym) => {
            const updated = toggleSymbolInWatchlist(wlId, sym);
            setWatchlists(updated);
          }}
          onAddSymbol={(wlId, sym) => {
            const updated = addSymbolToWatchlist(wlId, sym);
            setWatchlists(updated);
          }}
          onCreateWatchlist={(name, desc) => {
            const newWl: Watchlist = {
              id: `wl-${Date.now()}`,
              name,
              description: desc,
              symbols: [],
              market,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            const updated = saveWatchlist(newWl);
            setWatchlists(updated);
          }}
          onOpenPeerComparison={(syms) => handleOpenPeerComparison(syms)}
        />
      )}

      {/* ── 6. Company Analysis Workspace ── */}
      {activeTab === 'analysis' && (
        targetCompany ? (
          <CompanyAnalysisView
            company={targetCompany}
            onBackToScreener={() => setActiveTab('screener')}
            onOpenPeerComparison={(sym) => handleOpenPeerComparison(sym)}
            onToggleWatchlist={handleToggleWatchlist}
            isInWatchlist={watchlistSymbols.includes(targetCompany.symbol)}
            onSelectCompany={handleOpenCompanyAnalysis}
            onOpenBacktest={(sym) => {
              setBacktestParams({ symbol: sym, strategyId: 'ma_alignment' });
              setActiveTab('backtesting' as any);
            }}
          />
        ) : (
          <div className="rounded-2xl border-2 terminal-page-panel p-6 sm:p-10 bg-[var(--theme-card-bg)] text-center flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <h2 className="mono text-[18px] sm:text-[20px] font-black inst-card-text">
                Select a Company for Fundamental Analysis
              </h2>
              <p className="text-[13px] sm:text-[14px] text-[var(--theme-card-text-muted)] font-medium mt-1 max-w-lg">
                Click <span className="font-bold text-emerald-400">Analyze</span> on any company in Screeners or choose from the top {MARKETS[market]?.label || market} companies below.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2 max-w-2xl">
              {marketCompanies.slice(0, 8).map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => handleOpenCompanyAnalysis(comp.symbol)}
                  className="px-3.5 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500 hover:text-emerald-400 transition-all flex items-center gap-2 mono text-[13px] font-bold cursor-pointer group shadow-xs"
                >
                  <span className="text-emerald-400 font-black">{comp.symbol}</span>
                  <span className="text-[12px] text-[var(--theme-card-text-muted)] group-hover:text-[var(--theme-card-text)] truncate max-w-[140px]">{comp.name}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setSearchModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-emerald-500 bg-emerald-500/15 text-emerald-400 mono text-[13px] font-bold hover:bg-emerald-500/25 transition-all cursor-pointer"
              >
                🔍 Search All Companies
              </button>
              <button
                onClick={() => setActiveTab('screener')}
                className="px-4 py-2 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[var(--theme-card-text)] mono text-[13px] font-bold hover:border-slate-500 transition-all cursor-pointer"
              >
                ← Return to Screener
              </button>
            </div>
          </div>
        )
      )}

      {/* ── 8. Peer Comparison Workspace ── */}
      {activeTab === 'peers' && (
        <PeerComparisonView
          initialSymbols={peerSymbols}
          onSelectCompany={handleOpenCompanyAnalysis}
          onBackToScreener={() => setActiveTab('screener')}
          companies={allCompaniesEnriched}
        />
      )}

      {/* ── 9. Screening Alerts Workspace ── */}
      {activeTab === 'alerts' && (
        <ScreeningAlertsView
          alerts={alerts}
          market={market}
          onBackToScreener={() => setActiveTab('screener')}
          onToggleAlert={(id) => {
            const updated = toggleAlertStatus(id);
            setAlerts(updated);
          }}
          onCreateAlert={(newAlert) => {
            const full: ScreeningAlert = {
              id: newAlert.id || `alert-${Date.now()}`,
              name: newAlert.name || 'New Fundamental Alert',
              enabled: true,
              triggerType: newAlert.triggerType || 'SCREEN_ENTRY_EXIT',
              frequency: newAlert.frequency || 'STATEMENT_RELEASE',
              createdAt: new Date().toISOString(),
              recentTriggers: newAlert.recentTriggers || [],
              metricKey: newAlert.metricKey,
              threshold: newAlert.threshold,
            };
            const updated = saveScreeningAlert(full);
            setAlerts(updated);
          }}
          onSelectCompany={handleOpenCompanyAnalysis}
        />
      )}

      {/* ── Column Customizer Modal ── */}
      <ColumnSelectorModal
        isOpen={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        selectedColumns={selectedColumns}
        onChangeColumns={(cols) => {
          setSelectedColumns(cols);
          saveColumnPreferences(cols);
        }}
        onResetDefault={() => {
          setSelectedColumns(DEFAULT_COLUMNS);
          saveColumnPreferences(DEFAULT_COLUMNS);
        }}
        onOpenCustomRatio={() => setCustomRatioModalOpen(true)}
      />

      {/* ── Quick Search Modal ── */}
      <CompanySearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectCompany={handleOpenCompanyAnalysis}
        companies={allCompaniesEnriched}
      />

      {/* ── Save Screen Modal ── */}
      <SaveScreenModal
        isOpen={saveScreenModalOpen}
        onClose={() => setSaveScreenModalOpen(false)}
        onSave={(screen) => {
          const updated = saveUserScreen(screen);
          setSavedScreens(updated);
        }}
        currentQuery={currentQuery}
        selectedColumns={selectedColumns}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        market={market}
        matchCount={filteredCompanies.length}
      />

      {/* ── Custom Ratio Creator Modal ── */}
      <CustomRatioModal
        isOpen={customRatioModalOpen}
        onClose={() => setCustomRatioModalOpen(false)}
        onSave={(ratio) => {
          const updated = saveCustomRatio(ratio);
          setCustomRatios(updated);
        }}
        marketCompanies={marketCompanies}
      />
    </div>
  );
}
