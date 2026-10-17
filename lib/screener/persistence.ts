// ─── Screener Persistence & Storage Engine ──────────────────────────────────
// Manages local state, synchronization, and persistent storage for Saved Screens,
// Watchlists, Custom Financial Formulas, and Screening Alerts.

import { SavedScreen, Watchlist, CustomRatio, ScreeningAlert, MarketRegion } from './types';
import { PREDEFINED_SCREENS } from './templates';
import { DEFAULT_CUSTOM_RATIOS } from './customRatios';

const KEYS = {
  SCREENS: 'mi007_screener_saved_screens',
  WATCHLISTS: 'mi007_screener_watchlists',
  CUSTOM_RATIOS: 'mi007_screener_custom_ratios',
  ALERTS: 'mi007_screener_alerts',
  COLUMNS: 'mi007_screener_columns_pref',
};

// ── Saved Screens Management ─────────────────────────────────────────────────
export function deduplicateScreens(screens: SavedScreen[]): SavedScreen[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const result: SavedScreen[] = [];

  for (const s of screens) {
    if (!s || !s.id) continue;
    const cleanName = (s.name || '').trim().toLowerCase();
    if (seenIds.has(s.id)) continue;
    if (cleanName && seenNames.has(cleanName)) continue;
    seenIds.add(s.id);
    if (cleanName) seenNames.add(cleanName);
    result.push(s);
  }
  return result;
}

export function getSavedScreens(): SavedScreen[] {
  if (typeof window === 'undefined') {
    return PREDEFINED_SCREENS;
  }

  try {
    const raw = localStorage.getItem(KEYS.SCREENS);
    if (!raw) {
      return PREDEFINED_SCREENS;
    }
    const userScreens: SavedScreen[] = JSON.parse(raw);
    const combined = [...userScreens, ...PREDEFINED_SCREENS];
    return deduplicateScreens(combined);
  } catch (err) {
    console.warn('[Persistence] Error loading saved screens:', err);
    return PREDEFINED_SCREENS;
  }
}

export function saveUserScreen(screen: SavedScreen): SavedScreen[] {
  if (typeof window === 'undefined') return [];
  try {
    const all = getSavedScreens();
    const existingIndex = all.findIndex(
      (s) => s.id === screen.id || s.name.trim().toLowerCase() === screen.name.trim().toLowerCase()
    );
    let updated: SavedScreen[];

    if (existingIndex >= 0) {
      updated = [...all];
      updated[existingIndex] = {
        ...screen,
        id: all[existingIndex].id,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = [
        {
          ...screen,
          id: screen.id || `screen-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...all,
      ];
    }

    const deduplicated = deduplicateScreens(updated);
    // Persist only non-predefined screens to localStorage
    const onlyUser = deduplicated.filter((s) => !s.isPredefined);
    localStorage.setItem(KEYS.SCREENS, JSON.stringify(onlyUser));
    return deduplicated;
  } catch (err) {
    console.error('[Persistence] Error saving screen:', err);
    return getSavedScreens();
  }
}

export function deleteSavedScreen(screenId: string): SavedScreen[] {
  if (typeof window === 'undefined') return [];
  try {
    const all = getSavedScreens();
    // Do not delete if predefined
    const target = all.find((s) => s.id === screenId);
    if (target?.isPredefined) {
      return all;
    }
    const remaining = all.filter((s) => s.id !== screenId);
    const onlyUser = remaining.filter((s) => !s.isPredefined);
    localStorage.setItem(KEYS.SCREENS, JSON.stringify(onlyUser));
    return remaining;
  } catch (err) {
    console.error('[Persistence] Error deleting screen:', err);
    return getSavedScreens();
  }
}

// ── Watchlists Management ────────────────────────────────────────────────────
const DEFAULT_WATCHLISTS: Watchlist[] = [
  {
    id: 'wl-core',
    name: 'Institutional High Conviction',
    description: 'Long-term compounding businesses with robust competitive moats and low debt.',
    symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'TITAN', 'AAPL', 'MSFT', 'EMAAR'],
    market: 'INDIA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wl-growth',
    name: 'High-Alpha Midcap Compounders',
    description: 'Rapid top-line and profit growth candidates in manufacturing, EMS, and digital niches.',
    symbols: ['POLYCAB', 'DIXON', 'CDSL', 'DEEPAKNTR', 'NVDA', 'SALIK'],
    market: 'INDIA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getWatchlists(): Watchlist[] {
  if (typeof window === 'undefined') return DEFAULT_WATCHLISTS;
  try {
    const raw = localStorage.getItem(KEYS.WATCHLISTS);
    if (!raw) {
      localStorage.setItem(KEYS.WATCHLISTS, JSON.stringify(DEFAULT_WATCHLISTS));
      return DEFAULT_WATCHLISTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Persistence] Error loading watchlists:', err);
    return DEFAULT_WATCHLISTS;
  }
}

export function saveWatchlist(watchlist: Watchlist): Watchlist[] {
  if (typeof window === 'undefined') return [];
  try {
    const all = getWatchlists();
    const idx = all.findIndex((w) => w.id === watchlist.id);
    let updated: Watchlist[];

    if (idx >= 0) {
      updated = [...all];
      updated[idx] = { ...watchlist, updatedAt: new Date().toISOString() };
    } else {
      updated = [
        ...all,
        {
          ...watchlist,
          id: watchlist.id || `wl-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    localStorage.setItem(KEYS.WATCHLISTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('[Persistence] Error saving watchlist:', err);
    return getWatchlists();
  }
}

export function toggleSymbolInWatchlist(watchlistId: string, symbol: string): Watchlist[] {
  const all = getWatchlists();
  const target = all.find((w) => w.id === watchlistId);
  if (!target) return all;

  const clean = symbol.trim().toUpperCase();
  const exists = target.symbols.includes(clean);
  const newSymbols = exists
    ? target.symbols.filter((s) => s !== clean)
    : [...target.symbols, clean];

  return saveWatchlist({
    ...target,
    symbols: newSymbols,
  });
}

// ── Custom Ratios Management ─────────────────────────────────────────────────
export function getCustomRatios(): CustomRatio[] {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_RATIOS;
  try {
    const raw = localStorage.getItem(KEYS.CUSTOM_RATIOS);
    if (!raw) return DEFAULT_CUSTOM_RATIOS;
    const userRatios: CustomRatio[] = JSON.parse(raw);
    const userIds = new Set(userRatios.map((r) => r.id));
    return [...userRatios, ...DEFAULT_CUSTOM_RATIOS.filter((r) => !userIds.has(r.id))];
  } catch (err) {
    console.warn('[Persistence] Error loading custom ratios:', err);
    return DEFAULT_CUSTOM_RATIOS;
  }
}

export function saveCustomRatio(ratio: CustomRatio): CustomRatio[] {
  if (typeof window === 'undefined') return [];
  try {
    const all = getCustomRatios();
    const idx = all.findIndex((r) => r.id === ratio.id);
    let updated: CustomRatio[];

    if (idx >= 0) {
      updated = [...all];
      updated[idx] = ratio;
    } else {
      updated = [
        ...all,
        {
          ...ratio,
          id: ratio.id || `cr-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    localStorage.setItem(KEYS.CUSTOM_RATIOS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('[Persistence] Error saving custom ratio:', err);
    return getCustomRatios();
  }
}

export function deleteCustomRatio(ratioId: string): CustomRatio[] {
  if (typeof window === 'undefined') return [];
  try {
    const all = getCustomRatios();
    const remaining = all.filter((r) => r.id !== ratioId);
    localStorage.setItem(KEYS.CUSTOM_RATIOS, JSON.stringify(remaining));
    return remaining;
  } catch (err) {
    console.error('[Persistence] Error deleting custom ratio:', err);
    return getCustomRatios();
  }
}

// ── Screening Alerts Management ──────────────────────────────────────────────
const DEFAULT_ALERTS: ScreeningAlert[] = [
  {
    id: 'alert-quality-entrants',
    name: 'Quality Compounders New Entrants',
    screenId: 'quality-compounders',
    screenName: 'Quality Compounders (High ROCE + Low Debt)',
    enabled: true,
    triggerType: 'SCREEN_ENTRY_EXIT',
    frequency: 'STATEMENT_RELEASE',
    lastTriggered: '2025-01-20T10:30:00Z',
    createdAt: new Date().toISOString(),
    recentTriggers: [
      {
        timestamp: '2025-01-20 10:30 IST',
        symbol: 'POLYCAB',
        message: 'Polycab India entered Quality Compounders: ROCE expanded to 32.5% and Debt/Equity dropped to 0.04.',
      },
      {
        timestamp: '2025-01-18 14:15 IST',
        symbol: 'CDSL',
        message: 'CDSL reconfirmed in Quality Compounders with 0 debt and 42.5% ROCE.',
      },
      {
        timestamp: '2025-01-22 16:00 EST',
        symbol: 'NVDA',
        message: 'NVIDIA Corp reconfirmed in Quality Compounders with 72.8% ROCE and exceptional free cash flow.',
      },
      {
        timestamp: '2025-01-21 12:00 GST',
        symbol: 'SALIK',
        message: 'Salik Company PJSC entered Quality Compounders: Net margin 41.2% with steady cash generation.',
      },
    ],
  },
  {
    id: 'alert-roce-cross',
    name: 'High ROCE (> 30%) Alert',
    metricKey: 'roce',
    operator: '>',
    threshold: 30,
    enabled: true,
    triggerType: 'METRIC_CROSS',
    frequency: 'STATEMENT_RELEASE',
    lastTriggered: '2025-01-22T09:00:00Z',
    createdAt: new Date().toISOString(),
    recentTriggers: [
      {
        timestamp: '2025-01-22 09:00 IST',
        symbol: 'DIXON',
        message: 'Dixon Technologies ROCE reached 34.8% on Q3 results release.',
      },
      {
        timestamp: '2025-01-22 17:30 EST',
        symbol: 'AAPL',
        message: 'Apple Inc ROCE sustained above 54.2% on record services revenue.',
      },
    ],
  },
];

export function getScreeningAlerts(): ScreeningAlert[] {
  if (typeof window === 'undefined') return DEFAULT_ALERTS;
  try {
    const raw = localStorage.getItem(KEYS.ALERTS);
    if (!raw) {
      localStorage.setItem(KEYS.ALERTS, JSON.stringify(DEFAULT_ALERTS));
      return DEFAULT_ALERTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Persistence] Error loading alerts:', err);
    return DEFAULT_ALERTS;
  }
}

export function saveScreeningAlert(alert: ScreeningAlert): ScreeningAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const all = getScreeningAlerts();
    const idx = all.findIndex((a) => a.id === alert.id);
    let updated: ScreeningAlert[];

    if (idx >= 0) {
      updated = [...all];
      updated[idx] = alert;
    } else {
      updated = [
        ...all,
        {
          ...alert,
          id: alert.id || `alert-${Date.now()}`,
          createdAt: new Date().toISOString(),
          recentTriggers: alert.recentTriggers || [],
        },
      ];
    }

    localStorage.setItem(KEYS.ALERTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('[Persistence] Error saving alert:', err);
    return getScreeningAlerts();
  }
}

export function toggleAlertStatus(alertId: string): ScreeningAlert[] {
  const all = getScreeningAlerts();
  const target = all.find((a) => a.id === alertId);
  if (!target) return all;
  return saveScreeningAlert({
    ...target,
    enabled: !target.enabled,
  });
}

// ── Column Preferences ───────────────────────────────────────────────────────
export const DEFAULT_COLUMNS = [
  'marketCap',
  'currentPrice',
  'pe',
  'roce',
  'roe',
  'salesGrowth3Y',
  'profitGrowth3Y',
  'debtToEquity',
  'dividendYield',
  'opm',
];

export function getColumnPreferences(): string[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS;
  try {
    const raw = localStorage.getItem(KEYS.COLUMNS);
    if (!raw) return DEFAULT_COLUMNS;
    const cols = JSON.parse(raw);
    return Array.isArray(cols) && cols.length > 0 ? cols : DEFAULT_COLUMNS;
  } catch {
    return DEFAULT_COLUMNS;
  }
}

export function saveColumnPreferences(columns: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEYS.COLUMNS, JSON.stringify(columns));
  } catch {}
}
