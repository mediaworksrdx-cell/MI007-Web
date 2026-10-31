// ─── Dedicated F&O Engine Configuration ──────────────────────────────────────
// Powered entirely by the Institutional Trade Engine backend.
// Zero client-side keys or third-party API exposure.

export interface FnoConfig {
  /** Active Trade Engine plan tier: venture | pro | basic | free */
  plan: 'venture' | 'pro' | 'basic' | 'free';
  /** True when Trade Engine backend is running with institutional access */
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
  return {
    plan: 'venture',
    isVentureReady: true,
    callsPerMinuteLimit: 600,
    spotCacheTtlMs: 1500,
    chainCacheTtlMs: 3000,
    isIsolated: true,
  };
}
