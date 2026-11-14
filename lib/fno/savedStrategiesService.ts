// ─── Tracked & Saved Options Strategies Service ───────────────────────────────
// Manages local persistence and live simulation tracking for built strategies.

import { TrackedStrategy, StrategyLeg, StrategyCategory } from './fnoTypes';

const STORAGE_KEY = 'mi007_fno_tracked_strategies';

const DEFAULT_SEEDED_STRATEGIES: TrackedStrategy[] = [
  {
    id: 'strat-seed-1',
    name: 'NIFTY Iron Condor (Weekly)',
    category: 'NEUTRAL',
    underlyingSymbol: 'NIFTY 50',
    spotPriceAtCreation: 22687.65,
    currentSpotPrice: 22687.65,
    createdAt: '2026-11-13',
    expiry: '26 NOV 2026',
    legs: [
      {
        id: 'l1',
        action: 'SELL',
        instrument: 'CE',
        strike: 22850,
        expiry: '26 NOV 2026',
        lots: 1,
        lotSize: 65,
        entryPrice: 58.40,
        currentPrice: 52.10,
        iv: 13.8,
        greeks: { delta: 0.22, gamma: 0.0008, theta: -8.5, vega: 11.2 },
      },
      {
        id: 'l2',
        action: 'BUY',
        instrument: 'CE',
        strike: 23000,
        expiry: '26 NOV 2026',
        lots: 1,
        lotSize: 65,
        entryPrice: 22.10,
        currentPrice: 18.40,
        iv: 14.2,
        greeks: { delta: 0.11, gamma: 0.0005, theta: -4.2, vega: 6.8 },
      },
      {
        id: 'l3',
        action: 'SELL',
        instrument: 'PE',
        strike: 22500,
        expiry: '26 NOV 2026',
        lots: 1,
        lotSize: 65,
        entryPrice: 64.20,
        currentPrice: 59.80,
        iv: 14.9,
        greeks: { delta: -0.24, gamma: 0.0009, theta: -9.1, vega: 12.4 },
      },
      {
        id: 'l4',
        action: 'BUY',
        instrument: 'PE',
        strike: 22350,
        expiry: '26 NOV 2026',
        lots: 1,
        lotSize: 65,
        entryPrice: 26.50,
        currentPrice: 23.20,
        iv: 15.6,
        greeks: { delta: -0.12, gamma: 0.0006, theta: -4.8, vega: 7.2 },
      },
    ],
    entryNetCost: 4810, // Net credit received: (58.4 - 22.1 + 64.2 - 26.5) * 65
    currentPnl: 240,
    probabilityOfProfit: 71.5,
    maxProfit: 4810,
    maxLoss: -4940,
    breakevens: [22426, 22924],
    isUnlimitedRisk: false,
    riskClassification: 'DEFINED_RISK',
    unlimitedRiskSide: 'NONE',
  },
  {
    id: 'strat-seed-2',
    name: 'BANKNIFTY Bull Call Spread',
    category: 'BULLISH',
    underlyingSymbol: 'BANKNIFTY',
    spotPriceAtCreation: 54925.70,
    currentSpotPrice: 54925.70,
    createdAt: '2026-11-13',
    expiry: '26 NOV 2026',
    legs: [
      {
        id: 'l5',
        action: 'BUY',
        instrument: 'CE',
        strike: 54900,
        expiry: '26 NOV 2026',
        lots: 1,
        lotSize: 30,
        entryPrice: 380.00,
        currentPrice: 395.00,
        iv: 15.2,
        greeks: { delta: 0.52, gamma: 0.0006, theta: -24.5, vega: 22.8 },
      },
      {
        id: 'l6',
        action: 'SELL',
        instrument: 'CE',
        strike: 55300,
        expiry: '26 NOV 2026',
        lots: 1,
        lotSize: 30,
        entryPrice: 195.00,
        currentPrice: 202.00,
        iv: 14.8,
        greeks: { delta: 0.32, gamma: 0.0005, theta: -16.2, vega: 15.4 },
      },
    ],
    entryNetCost: -5550, // Net debit paid
    currentPnl: 240,
    probabilityOfProfit: 58.2,
    maxProfit: 6450,
    maxLoss: -5550,
    breakevens: [55085],
    isUnlimitedRisk: false,
    riskClassification: 'DEFINED_RISK',
    unlimitedRiskSide: 'NONE',
  },
];

export const FNO_STRATEGIES_UPDATE_EVENT = 'mi007_fno_strategies_updated';

function broadcastStrategiesUpdated(strategies: TrackedStrategy[]): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(FNO_STRATEGIES_UPDATE_EVENT, { detail: strategies })
    );
  }
}

export function subscribeToStrategiesUpdates(
  callback: (strategies: TrackedStrategy[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent<TrackedStrategy[]>).detail;
    if (Array.isArray(detail)) {
      callback(detail);
    } else {
      callback(getTrackedStrategies());
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getTrackedStrategies());
    }
  };

  window.addEventListener(FNO_STRATEGIES_UPDATE_EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(FNO_STRATEGIES_UPDATE_EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

export function getTrackedStrategies(): TrackedStrategy[] {
  if (typeof window === 'undefined') return DEFAULT_SEEDED_STRATEGIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEEDED_STRATEGIES));
      return DEFAULT_SEEDED_STRATEGIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return DEFAULT_SEEDED_STRATEGIES;
  }
}

export function saveTrackedStrategy(strat: TrackedStrategy): TrackedStrategy[] {
  if (typeof window === 'undefined') return [];
  const current = getTrackedStrategies();
  const exists = current.some((s) => s.id === strat.id);
  const updated = exists
    ? current.map((s) => (s.id === strat.id ? strat : s))
    : [strat, ...current];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    broadcastStrategiesUpdated(updated);
  } catch {
    // ignore
  }
  return updated;
}

export function renameTrackedStrategy(id: string, newName: string): TrackedStrategy[] {
  if (typeof window === 'undefined') return [];
  const trimmed = newName.trim();
  if (!trimmed) return getTrackedStrategies();
  const current = getTrackedStrategies();
  const updated = current.map((s) => (s.id === id ? { ...s, name: trimmed } : s));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    broadcastStrategiesUpdated(updated);
  } catch {
    // ignore
  }
  return updated;
}

export function deleteTrackedStrategy(id: string): TrackedStrategy[] {
  if (typeof window === 'undefined') return [];
  const current = getTrackedStrategies();
  const updated = current.filter((s) => s.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    broadcastStrategiesUpdated(updated);
  } catch {
    // ignore
  }
  return updated;
}

export function clearAllTrackedStrategies(): TrackedStrategy[] {
  if (typeof window === 'undefined') return [];
  const updated: TrackedStrategy[] = [];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    broadcastStrategiesUpdated(updated);
  } catch {
    // ignore
  }
  return updated;
}
