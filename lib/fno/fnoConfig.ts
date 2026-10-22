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
  // Check dedicated F&O key first; fallback to general Twelve Data key if not yet set
  const dedicatedKey = process.env.TWELVE_DATA_FNO_API_KEY?.trim() || '';
  const fallbackKey = process.env.TWELVE_DATA_API_KEY?.trim() || process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY?.trim() || '';
  const apiKey = dedicatedKey || fallbackKey;

  const planEnv = (process.env.TWELVE_DATA_FNO_PLAN?.trim().toLowerCase() || 'basic') as 'venture' | 'pro' | 'basic' | 'free';
  const isVenture = planEnv === 'venture' || (Boolean(dedicatedKey) && planEnv !== 'free' && planEnv !== 'basic');

  return {
    twelveDataApiKey: apiKey,
    plan: isVenture ? 'venture' : planEnv,
    isVentureReady: isVenture || Boolean(dedicatedKey),
    // Venture accounts allow 600 - 1200+ RPM; free/basic is kept to a strict conservative budget
    callsPerMinuteLimit: isVenture ? 600 : 8,
    // Venture tier gets ultra-low 1.5s caching; basic gets 30s-60s
    spotCacheTtlMs: isVenture ? 1500 : 30000,
    chainCacheTtlMs: isVenture ? 3000 : 60000,
    isIsolated: true,
  };
}
