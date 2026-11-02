import { TRADING_STRATEGIES, INVESTMENT_STRATEGIES } from '../lib/screener/strategiesCatalog';
import { STRATEGY_DEFINITIONS, StrategyDefinition } from '../lib/screener/technicalStrategies';

console.log('Trading strategies count:', TRADING_STRATEGIES?.length || 0);
console.log('Investment strategies count:', INVESTMENT_STRATEGIES?.length || 0);
console.log('Technical strategies count:', STRATEGY_DEFINITIONS?.length || 0);

if (INVESTMENT_STRATEGIES) {
  console.log('\n--- Investment Strategies ---');
  INVESTMENT_STRATEGIES.forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.id}] ${s.name} (${s.category})`);
  });
}

if (TRADING_STRATEGIES) {
  console.log('\n--- Trading Strategies ---');
  TRADING_STRATEGIES.forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.id}] ${s.name} (${s.category})`);
  });
}

if (STRATEGY_DEFINITIONS) {
  console.log('\n--- Technical Strategies ---');
  STRATEGY_DEFINITIONS.forEach((s: StrategyDefinition, idx: number) => {
    console.log(`${idx + 1}. [${s.id}] ${s.name}`);
  });
}
