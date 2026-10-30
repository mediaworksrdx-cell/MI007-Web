// ─── Dedicated F&O Engine Configuration ──────────────────────────────────────
// Completely isolated from the main Trade Engine, terminal, and charts.
// Ready for Twelve Data Venture account activation.

export interface FnoConfig {
  /** Dedicated Twelve Data API Key exclusively for F&O */
  twelveDataApiKey: string;
  /** Active Twelve Data account tier: venture | pro | basic | free */
  plan: 'venture' | 'pro' | 'basic' | 'free';
  /** True when a dedicated Venture key is configured or plan is set to venture */
  isVentureReady: boolean;
  /** Calls per minute limit allocated specifically to F&O */
  callsPerMinuteLimit: number;
  /** In-memory cache TTL for spot quotes (ms) */
  spotCacheTtlMs: number;
  /** In-memory cache TTL for option chains (ms) */
  chainCacheTtlMs: number;
  /** Whether the F&O engine runs in isolated mode */
  isIsolated: boolean;
}

export function getFnoConfig(): FnoConfig {
  const apiKey = process.env.TWELVE_DATA_API_KEY || '3925d32210e845e087ea7b75b1b7720b';
  const planEnv = (process.env.TWELVE_DATA_FNO_PLAN?.trim().toLowerCase() || 'venture') as 'venture' | 'pro' | 'basic' | 'free';
  const isVenture = planEnv === 'venture';

  return {
    twelveDataApiKey: apiKey,
    plan: isVenture ? 'venture' : planEnv,
    isVentureReady: isVenture,
    callsPerMinuteLimit: isVenture ? 600 : 8,
    spotCacheTtlMs: isVenture ? 1500 : 30000,
    chainCacheTtlMs: isVenture ? 3000 : 60000,
    isIsolated: true,
  };
}
