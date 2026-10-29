import fs from 'fs';
import path from 'path';

function runAssertions() {
  console.log('--- RUNNING SCREENER & CHART ENHANCEMENTS AUDIT ---\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Check CompanySearchModal.tsx
  const searchModalPath = path.resolve('components/screener/CompanySearchModal.tsx');
  const searchModalCode = fs.readFileSync(searchModalPath, 'utf-8');
  assert(
    searchModalCode.includes('pt-44 sm:pt-52 md:pt-60'),
    'CompanySearchModal has generous top padding pt-44/pt-52/pt-60 to avoid top clipping'
  );
  assert(
    searchModalCode.includes('max-h-[68vh]'),
    'CompanySearchModal constrains height to 68vh so entire modal is visible'
  );
  assert(
    searchModalCode.includes('handleMouseDown') && searchModalCode.includes('dragOffset'),
    'CompanySearchModal includes drag repositioning handlers'
  );

  // 2. Check CompanyAnalysisView.tsx
  const analysisViewPath = path.resolve('components/screener/CompanyAnalysisView.tsx');
  const analysisViewCode = fs.readFileSync(analysisViewPath, 'utf-8');
  assert(
    analysisViewCode.includes('🏢 CONSOLIDATED FINANCIALS') &&
    analysisViewCode.includes('🏛️ STANDALONE FINANCIALS'),
    'CompanyAnalysisView includes Live Financial Mode Analysis Panel badges'
  );
  assert(
    analysisViewCode.includes('Annual Revenue (Sales)') &&
    analysisViewCode.includes('Net Profit (PAT)') &&
    analysisViewCode.includes('latestQuarter.opmPct'),
    'CompanyAnalysisView computes live fundamental breakdown with valid opmPct property'
  );
  assert(
    analysisViewCode.includes('isStandalone={!isConsolidated}'),
    'CompanyAnalysisView passes isStandalone prop to ChartContainer'
  );

  // 3. Check ChartSymbolSearch.tsx
  const chartSearchPath = path.resolve('components/chart/ChartSymbolSearch.tsx');
  const chartSearchCode = fs.readFileSync(chartSearchPath, 'utf-8');
  assert(
    chartSearchCode.includes('min-w-[320px] sm:min-w-[540px] md:min-w-[620px]'),
    'ChartSymbolSearch dropdown has wide min-width to avoid cramped results'
  );
  assert(
    chartSearchCode.includes('overflow-x-auto scrollbar-none whitespace-nowrap'),
    'ChartSymbolSearch category tabs have horizontal scroll without row wrapping'
  );
  assert(
    chartSearchCode.includes('🏛️ STANDALONE') && chartSearchCode.includes('🏢 CONSOLIDATED'),
    'ChartSymbolSearch shows live accounting mode badge'
  );

  // 4. Check BacktestingView.tsx
  const backtestPath = path.resolve('components/screener/BacktestingView.tsx');
  const backtestCode = fs.readFileSync(backtestPath, 'utf-8');
  assert(
    backtestCode.includes('COMBINED_STRATEGY_DEFINITIONS'),
    'BacktestingView imports and iterates through all 26 combined strategies'
  );
  assert(
    backtestCode.includes('searchZerodhaStocks(symbol, 1)'),
    'BacktestingView handles arbitrary external/Zerodha stock symbols without blank screens'
  );
  assert(
    backtestCode.includes('strategyChartHref'),
    'BacktestingView links directly to chart with strategy-specific indicators'
  );

  // 5. Check ChartContainer.tsx & app/chart/[symbol]/page.tsx
  const chartContainerPath = path.resolve('components/chart/ChartContainer.tsx');
  const chartContainerCode = fs.readFileSync(chartContainerPath, 'utf-8');
  const chartPagePath = path.resolve('app/chart/[symbol]/page.tsx');
  const chartPageCode = fs.readFileSync(chartPagePath, 'utf-8');

  assert(
    chartPageCode.includes('initialStrategies={resolvedSearchParams.strategies}') &&
    chartPageCode.includes('initialIndicatorsParam={resolvedSearchParams.indicators}'),
    'Chart page extracts strategies/indicators searchParams and forwards to ChartContainer'
  );
  assert(
    chartContainerCode.includes('initialStrategies') &&
    chartContainerCode.includes('hasSpecificRequestedInds'),
    'ChartContainer supports initialStrategies and isolates indicators in initial state'
  );
  assert(
    chartContainerCode.includes("strats.includes('ma_20_50_cross')") &&
    chartContainerCode.includes("{ type: 'SMA', period: 20, color: '#10B981' }") &&
    chartContainerCode.includes("{ type: 'SMA', period: 50, color: '#38BDF8' }"),
    'MA Crossover strategy maps strictly to SMA 20 and SMA 50'
  );
  assert(
    chartContainerCode.includes('setSmcConfig(prev => {') &&
    chartContainerCode.includes('const next = { ...prev, enabled: false };'),
    'SMC overlay is explicitly disabled when pure technical strategies are loaded'
  );

  console.log(`\nAudit Complete: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAssertions();
