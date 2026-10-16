// ─── Screener Master Workspace Cockpit ───────────────────────────────────────
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMarket } from '@/lib/marketContext';
import { MarketRegion, CompanyFundamental, SavedScreen, VisualFilter, CustomRatio, Watchlist, ScreeningAlert } from '@/lib/screener/types';
import { MASTER_COMPANIES, getCompaniesByMarket, getSectors } from '@/lib/screener/data';
import { parseQuery, evaluateNode, visualFiltersToQuery } from '@/lib/screener/queryEngine';
import {
  getSavedScreens,
  saveUserScreen,
  deleteSavedScreen,
  getWatchlists,
  saveWatchlist,
  toggleSymbolInWatchlist,
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
import { TopToolbar } from './TopToolbar';
import { QueryEditor } from './QueryEditor';
import { VisualFilterBuilder } from './VisualFilterBuilder';
import { ResultsTable, TableViewPreset } from './ResultsTable';
import { ColumnSelectorModal } from './ColumnSelectorModal';
import { SaveScreenModal } from './SaveScreenModal';
import { CustomRatioModal } from './CustomRatioModal';
import { CompanySearchModal } from './CompanySearchModal';
import { CompanyAnalysisView } from './CompanyAnalysisView';
import { DiscoverScreensView } from './DiscoverScreensView';
import { CustomQueryBuilderView } from './CustomQueryBuilderView';
import { SavedScreensView } from './SavedScreensView';
import { WatchlistsView } from './WatchlistsView';
import { PeerComparisonView } from './PeerComparisonView';
import { ScreeningAlertsView } from './ScreeningAlertsView';
import { TechnicalStrategyScreenerView } from './TechnicalStrategyScreenerView';
import { TechnicalAnalysisView } from './TechnicalAnalysisView';
import { BacktestingView } from './BacktestingView';
import { StrategyId } from '@/lib/screener/technicalStrategies';

export function ScreenerWorkspace() {
  const { market: globalMarket, setMarket: setGlobalMarket } = useMarket();
  const [market, setMarket] = useState<MarketRegion>((globalMarket as MarketRegion) || 'INDIA');
  const [activeTab, setActiveTab] = useState<
    | 'screener'
    | 'technicalScreener'
    | 'queryBuilder'
    | 'discover'
    | 'saved'
    | 'watchlists'
    | 'analysis'
    | 'technicalAnalysis'
    | 'peers'
    | 'backtesting'
    | 'alerts'
  >('screener');
  const [activeViewPreset, setActiveViewPreset] = useState<TableViewPreset>('overview');
  const [backtestStrategyId, setBacktestStrategyId] = useState<StrategyId>('ma_alignment');

  // Zerodha Kite Trade Engine Integration
  const { getSymbolPrice, status: tradeEngineStatus } = useTradeEngine();

  // Query and Visual Filters State
  const defaultScreen = PREDEFINED_SCREENS[0];
  const [currentQuery, setCurrentQuery] = useState<string>(defaultScreen.query);
  const [visualFilters, setVisualFilters] = useState<VisualFilter[]>([
    { id: 'vf-1', metricKey: 'roce', operator: '>', value: 18 },
    { id: 'vf-2', metricKey: 'debtToEquity', operator: '<', value: 0.5 },
  ]);
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');
  const [sortColumn, setSortColumn] = useState<string>('marketCap');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);

  // Active Company Selection
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE');
  const [peerSymbols, setPeerSymbols] = useState<string[]>(['TCS', 'INFY']);

  // Modals State
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [customRatioModalOpen, setCustomRatioModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Persistence State
  const [savedScreens, setSavedScreens] = useState<SavedScreen[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [customRatios, setCustomRatios] = useState<CustomRatio[]>([]);
  const [alerts, setAlerts] = useState<ScreeningAlert[]>([]);

  const searchParams = useSearchParams();

  // Sync tab and symbol from URL parameters or session storage return flags
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    const symbolParam = searchParams?.get('symbol');
    if (symbolParam) {
      setSelectedSymbol(symbolParam.toUpperCase());
    }
    if (tabParam) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleReturnToScreener = () => {
      if (typeof window !== 'undefined') {
        const returnTab = sessionStorage.getItem('mi007_return_tab');
        const returnSymbol = sessionStorage.getItem('mi007_return_symbol');
        if (returnSymbol) {
          setSelectedSymbol(returnSymbol.toUpperCase());
          sessionStorage.removeItem('mi007_return_symbol');
        }
        if (returnTab) {
          sessionStorage.removeItem('mi007_return_tab');
          setActiveTab(returnTab as any);
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

  // Sync with client-side localStorage
  useEffect(() => {
    setSavedScreens(getSavedScreens());
    setWatchlists(getWatchlists());
    setCustomRatios(getCustomRatios());
    setAlerts(getScreeningAlerts());
    setSelectedColumns(getColumnPreferences());
  }, []);

  // Update market when global market switches
  useEffect(() => {
    if (globalMarket && ['INDIA', 'USA', 'UAE'].includes(globalMarket)) {
      setMarket(globalMarket as MarketRegion);
      // Pick sensible default symbol per market
      if (globalMarket === 'INDIA') setSelectedSymbol('RELIANCE');
      else if (globalMarket === 'USA') setSelectedSymbol('AAPL');
      else if (globalMarket === 'UAE') setSelectedSymbol('EMAAR');
    }
  }, [globalMarket]);

  const handleMarketChange = (newMarket: MarketRegion) => {
    setMarket(newMarket);
    setGlobalMarket(newMarket);
    setSectorFilter('ALL');
    const comps = getCompaniesByMarket(newMarket);
    if (comps.length > 0) {
      setSelectedSymbol(comps[0].symbol);
    }
  };

  // Keyboard shortcut '/' or 'Ctrl+K' to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !searchModalOpen) {
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
    return MASTER_COMPANIES.map((comp) => {
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
      const comp = MASTER_COMPANIES.find((c) => c.symbol === symbols);
      if (comp) {
        const sectorPeers = MASTER_COMPANIES.filter(
          (c) => c.sector === comp.sector && c.symbol !== symbols
        ).map((c) => c.symbol);
        setPeerSymbols([symbols, ...(sectorPeers.slice(0, 2))]);
      } else {
        setPeerSymbols([symbols]);
      }
    }
    setActiveTab('peers');
  };

  // Open Technical Analysis View
  const handleOpenTechnicalAnalysis = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('technicalAnalysis');
  };

  // Open Backtesting View
  const handleOpenBacktest = (symbol: string, strategy?: StrategyId) => {
    setSelectedSymbol(symbol);
    if (strategy) setBacktestStrategyId(strategy);
    setActiveTab('backtesting');
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
    return (
      allCompaniesEnriched.find((c) => c.symbol.toUpperCase() === selectedSymbol.toUpperCase()) ||
      marketCompanies[0] ||
      allCompaniesEnriched[0]
    );
  }, [selectedSymbol, allCompaniesEnriched, marketCompanies]);

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
        onOpenSaveModal={() => setSaveModalOpen(true)}
        onOpenCustomRatioModal={() => setCustomRatioModalOpen(true)}
        onOpenSearchModal={() => setSearchModalOpen(true)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        selectedSymbol={selectedSymbol}
        tradeEngineStatus={tradeEngineStatus}
      />

      {/* ── 1. Stock Screener Workspace ── */}
      {activeTab === 'screener' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-150">
          {/* Query Builders Grid: Direct Expression Editor + Visual Filter Builder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QueryEditor
              query={currentQuery}
              onChangeQuery={setCurrentQuery}
              onRunScreen={() => {}}
              onResetQuery={() => setCurrentQuery('')}
              matchCount={filteredCompanies.length}
            />

            <VisualFilterBuilder
              filters={visualFilters}
              onChangeFilters={setVisualFilters}
              onApplyFilters={() => {
                const generated = visualFiltersToQuery(visualFilters);
                setCurrentQuery(generated);
              }}
              onClearFilters={() => setVisualFilters([])}
            />
          </div>

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

      {/* ── 2. Technical Strategy Screener Workspace ── */}
      {activeTab === 'technicalScreener' && (
        <TechnicalStrategyScreenerView
          companies={marketCompanies}
          market={market}
          onSelectCompany={handleOpenCompanyAnalysis}
          onOpenBacktest={handleOpenBacktest}
          onBackToScreener={() => setActiveTab('screener')}
        />
      )}

      {/* ── 3. Discover Screens Workspace ── */}
      {activeTab === 'discover' && (
        <DiscoverScreensView
          onRunScreen={handleRunSavedScreen}
          onCustomizeScreen={(s) => {
            setCurrentQuery(s.query);
            setActiveTab('screener');
          }}
          onBackToScreener={() => setActiveTab('screener')}
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
          onBackToScreener={() => setActiveTab('screener')}
          companies={marketCompanies}
        />
      )}

      {/* ── 4. Saved Screens Management ── */}
      {activeTab === 'saved' && (
        <SavedScreensView
          screens={savedScreens}
          onRunScreen={handleRunSavedScreen}
          onEditScreen={(s) => {
            setCurrentQuery(s.query);
            setActiveTab('screener');
          }}
          onBackToScreener={() => setActiveTab('screener')}
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
      {activeTab === 'analysis' && targetCompany && (
        <CompanyAnalysisView
          company={targetCompany}
          onBackToScreener={() => setActiveTab('screener')}
          onOpenPeerComparison={(sym) => handleOpenPeerComparison(sym)}
          onToggleWatchlist={handleToggleWatchlist}
          isInWatchlist={watchlistSymbols.includes(targetCompany.symbol)}
        />
      )}

      {/* ── 8. Technical Analysis Charting Workspace ── */}
      {activeTab === 'technicalAnalysis' && targetCompany && (
        <TechnicalAnalysisView
          company={targetCompany}
          allCompanies={allCompaniesEnriched}
          onSelectCompany={(sym) => setSelectedSymbol(sym)}
          onBackToScreener={() => setActiveTab('screener')}
          onOpenBacktest={(sym) => handleOpenBacktest(sym)}
        />
      )}

      {/* ── 9. Peer Comparison Workspace ── */}
      {activeTab === 'peers' && (
        <PeerComparisonView
          initialSymbols={peerSymbols}
          onSelectCompany={handleOpenCompanyAnalysis}
          onBackToScreener={() => setActiveTab('screener')}
          companies={allCompaniesEnriched}
        />
      )}

      {/* ── 10. Quantitative Backtesting Workspace ── */}
      {activeTab === 'backtesting' && (
        <BacktestingView
          companies={marketCompanies}
          initialSymbol={selectedSymbol}
          initialStrategyId={backtestStrategyId}
          onBackToScreener={() => setActiveTab('screener')}
          onSelectCompany={handleOpenCompanyAnalysis}
        />
      )}

      {/* ── 11. Screening Alerts Workspace ── */}
      {activeTab === 'alerts' && (
        <ScreeningAlertsView
          alerts={alerts}
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
      />

      {/* ── Save Screen Modal ── */}
      <SaveScreenModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={(newScreen) => {
          const updated = saveUserScreen(newScreen);
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
        onSave={(newRatio) => {
          const updated = saveCustomRatio(newRatio);
          setCustomRatios(updated);
        }}
        marketCompanies={marketCompanies}
      />

      {/* ── Quick Search Modal ── */}
      <CompanySearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectCompany={handleOpenCompanyAnalysis}
        companies={allCompaniesEnriched}
      />
    </div>
  );
}
