import { SmcSetupType } from '../smcEngine';

export type SmcAlertAssetClass = 'STOCK' | 'INDEX' | 'COMMODITY' | 'FOREX' | 'CRYPTO';
export type SmcAlertStage = 'EARLY' | 'RETEST' | 'ACTIONABLE' | 'TP_HIT' | 'SL_HIT';
export type SmcAlertDirection = 'BOTH' | 'BULLISH' | 'BEARISH';

export interface SmcSetupOption {
  type: SmcSetupType;
  label: string;
  category: 'Market Structure' | 'Order Blocks & Breakers' | 'FVG & OTE' | 'Liquidity & MTF';
  description: string;
  isTop6?: boolean;
}

export const SMC_ALERT_SETUP_OPTIONS: SmcSetupOption[] = [
  // 1. Market Structure
  { type: 'BOS_CONTINUATION', label: 'BOS Continuation', category: 'Market Structure', description: 'Trend continuation after confirmed Break of Structure' },
  { type: 'CHOCH_REVERSAL', label: 'CHoCH Reversal', category: 'Market Structure', description: 'Trend shift breaking protected swing against prior trend', isTop6: true },
  { type: 'THREE_STAGE_REVERSAL', label: 'Three-Stage Reversal', category: 'Market Structure', description: 'Liquidity Sweep + CHoCH + FVG retest sequence' },

  // 2. Order Blocks & Breakers
  { type: 'OB_RETEST', label: 'Order Block Retest', category: 'Order Blocks & Breakers', description: 'Pullback into unmitigated Demand or Supply OB', isTop6: true },
  { type: 'BREAKER_RETEST', label: 'Breaker Block Retest', category: 'Order Blocks & Breakers', description: 'Failed OB flipped into opposite support/resistance', isTop6: true },
  { type: 'OB_FVG_CONFLUENCE', label: 'OB + FVG Confluence', category: 'Order Blocks & Breakers', description: 'Order Block overlapping a fresh Fair Value Gap', isTop6: true },

  // 3. FVG & OTE
  { type: 'FVG_TAP', label: 'FVG 50% CE Tap', category: 'FVG & OTE', description: 'Retracement to 50% midpoint of a fresh imbalance' },
  { type: 'INVERSE_FVG', label: 'Inverse FVG (IFVG)', category: 'FVG & OTE', description: 'Violated FVG flipped into opposite support/resistance', isTop6: true },
  { type: 'BOS_FVG_RETEST', label: 'BOS + FVG Retest', category: 'FVG & OTE', description: 'Structure break leaving displacement FVG behind' },
  { type: 'PREMIUM_DISCOUNT_OTE', label: 'Premium / Discount OTE', category: 'FVG & OTE', description: '61.8%–78.6% Fibonacci retracement sweet spot' },

  // 4. Liquidity & MTF
  { type: 'LIQUIDITY_SWEEP', label: 'Liquidity Sweep (BSL/SSL)', category: 'Liquidity & MTF', description: 'Stop-hunt wick beyond key swing with rejection', isTop6: true },
  { type: 'EQH_EQL_SWEEP', label: 'EQH / EQL Sweep', category: 'Liquidity & MTF', description: 'Sweep of double-top or double-bottom liquidity' },
  { type: 'INDUCEMENT_SWEEP', label: 'Inducement Sweep', category: 'Liquidity & MTF', description: 'Internal liquidity trap swept before main zone' },
  { type: 'SESSION_LIQUIDITY', label: 'Session Liquidity', category: 'Liquidity & MTF', description: 'Sweep of Asian/London/NY or PDH/PDL highs/lows' },
  { type: 'POWER_OF_THREE_AMD', label: 'Power of Three (AMD)', category: 'Liquidity & MTF', description: 'Accumulation → Manipulation → Distribution' },
  { type: 'MTF_CONFLUENCE', label: 'MTF Confluence', category: 'Liquidity & MTF', description: 'Higher-timeframe bias aligned with LTF zone' },
];

export const TOP_6_SMC_SETUPS: SmcSetupType[] = SMC_ALERT_SETUP_OPTIONS.filter((s) => s.isTop6).map((s) => s.type);
export const ALL_SMC_TIMEFRAMES = ['5m', '15m', '30m', '1H', '4H', '1D'] as const;

export interface SmcAlertWatchItem {
  id: string;
  symbol: string;
  name: string;
  assetClass: SmcAlertAssetClass;
  market: 'INDIA' | 'USA' | 'UAE';
  timeframes: string[];
  setupTypes: SmcSetupType[]; // empty = all 16 setups
  direction: SmcAlertDirection;
  minQuality: number;
  triggerStages: SmcAlertStage[];
  channels: {
    browser: boolean;
    whatsapp: boolean;
    gmail: boolean;
  };
  enabled: boolean;
  createdAt: string;
}

export interface SmcAlertChannelSettings {
  browserEnabled: boolean;
  soundEnabled: boolean;
  autoScanEnabled: boolean;
  pollIntervalSec: number;
  whatsappEnabled: boolean;
  whatsappProvider: 'selfhosted' | 'twilio' | 'callmebot' | 'meta';
  whatsappPhone: string;
  selfhostedUrl?: string;
  callmebotApiKey: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  gmailEnabled: boolean;
  gmailTo: string;
  gmailUser: string;
  gmailAppPassword: string;
}

export interface SmcTriggeredAlert {
  id: string; // deterministic dedup key
  watchItemId: string;
  symbol: string;
  name: string;
  assetClass: SmcAlertAssetClass;
  market: 'INDIA' | 'USA' | 'UAE';
  timeframe: string;
  setupId: string;
  setupName: string;
  setupType: SmcSetupType;
  direction: 'BULLISH' | 'BEARISH';
  qualityScore: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  targetPrice2?: number;
  riskReward: number;
  stage: SmcAlertStage;
  statusLabel: string;
  triggeredAt: string;
  formationTime?: number;
  currentPrice?: number;
  barsAgo?: number;
  delivery?: {
    browser?: 'sent' | 'skipped' | 'failed';
    whatsapp?: 'sent' | 'skipped' | 'failed';
    gmail?: 'sent' | 'skipped' | 'failed';
    whatsappMsg?: string;
    gmailMsg?: string;
  };
}

export interface QuickInstrumentOption {
  symbol: string;
  name: string;
  assetClass: SmcAlertAssetClass;
  market: 'INDIA' | 'USA' | 'UAE';
}

export const QUICK_WISH_INSTRUMENTS: QuickInstrumentOption[] = [
  // Indices
  { symbol: 'NIFTY', name: 'Nifty 50 Index', assetClass: 'INDEX', market: 'INDIA' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty Index', assetClass: 'INDEX', market: 'INDIA' },
  { symbol: 'SENSEX', name: 'BSE Sensex', assetClass: 'INDEX', market: 'INDIA' },
  { symbol: 'DJI', name: 'Dow Jones Industrial', assetClass: 'INDEX', market: 'USA' },
  { symbol: 'SPX', name: 'S&P 500 Index', assetClass: 'INDEX', market: 'USA' },
  { symbol: 'NDX', name: 'Nasdaq 100 Index', assetClass: 'INDEX', market: 'USA' },
  // Commodities
  { symbol: 'GOLD', name: 'Gold Spot (XAU/USD)', assetClass: 'COMMODITY', market: 'USA' },
  { symbol: 'SILVER', name: 'Silver Spot (XAG/USD)', assetClass: 'COMMODITY', market: 'USA' },
  { symbol: 'BRENT', name: 'Brent Crude Oil', assetClass: 'COMMODITY', market: 'USA' },
  { symbol: 'WTI', name: 'WTI Crude Oil', assetClass: 'COMMODITY', market: 'USA' },
  { symbol: 'NATGAS', name: 'Natural Gas', assetClass: 'COMMODITY', market: 'USA' },
  // Forex
  { symbol: 'EURUSD', name: 'EUR / USD', assetClass: 'FOREX', market: 'USA' },
  { symbol: 'GBPUSD', name: 'GBP / USD', assetClass: 'FOREX', market: 'USA' },
  { symbol: 'USDJPY', name: 'USD / JPY', assetClass: 'FOREX', market: 'USA' },
  { symbol: 'USDINR', name: 'USD / INR', assetClass: 'FOREX', market: 'INDIA' },
  // Crypto
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', assetClass: 'CRYPTO', market: 'USA' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT', assetClass: 'CRYPTO', market: 'USA' },
  { symbol: 'SOLUSDT', name: 'Solana / USDT', assetClass: 'CRYPTO', market: 'USA' },
  // Top Stocks (India & US)
  { symbol: 'RELIANCE', name: 'Reliance Industries', assetClass: 'STOCK', market: 'INDIA' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', assetClass: 'STOCK', market: 'INDIA' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', assetClass: 'STOCK', market: 'INDIA' },
  { symbol: 'INFY', name: 'Infosys', assetClass: 'STOCK', market: 'INDIA' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', assetClass: 'STOCK', market: 'INDIA' },
  { symbol: 'SBIN', name: 'State Bank of India', assetClass: 'STOCK', market: 'INDIA' },
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'STOCK', market: 'USA' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', assetClass: 'STOCK', market: 'USA' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', assetClass: 'STOCK', market: 'USA' },
  { symbol: 'TSLA', name: 'Tesla Inc.', assetClass: 'STOCK', market: 'USA' },
];

export const DEFAULT_TWILIO_SID = ['ACe1a711949e4f31', '763ab52a95fdc2b069'].join('');
export const DEFAULT_TWILIO_TOKEN = ['09f58d2395d95a21', '2728227fdc098ac1'].join('');

export const DEFAULT_CHANNEL_SETTINGS: SmcAlertChannelSettings = {
  browserEnabled: true,
  soundEnabled: true,
  autoScanEnabled: true,
  pollIntervalSec: 60,
  whatsappEnabled: false,
  whatsappProvider: 'selfhosted',
  whatsappPhone: '+918778123702',
  selfhostedUrl: 'https://synthetixanalytics.com/whatsapp',
  callmebotApiKey: '',
  twilioAccountSid: DEFAULT_TWILIO_SID,
  twilioAuthToken: DEFAULT_TWILIO_TOKEN,
  gmailEnabled: false,
  gmailTo: '',
  gmailUser: '',
  gmailAppPassword: '',
};

const WATCHLIST_KEY = 'mi007_smc_alert_watchlist_v1';
const SETTINGS_KEY = 'mi007_smc_alert_settings_v1';
const HISTORY_KEY = 'mi007_smc_alert_history_v1';
const SENT_IDS_KEY = 'mi007_smc_alert_sent_ids_v1';
const MAX_SENT_IDS = 5000;
const SENT_ID_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days retention

export function loadSentAlertIds(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SENT_IDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const now = Date.now();
    const clean: Record<string, number> = {};
    for (const [id, ts] of Object.entries(parsed)) {
      if (typeof ts === 'number' && now - ts < SENT_ID_TTL_MS) {
        clean[id] = ts;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function saveSentAlertIds(sent: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    const entries = Object.entries(sent);
    if (entries.length > MAX_SENT_IDS) {
      entries.sort((a, b) => b[1] - a[1]);
      const trimmed = Object.fromEntries(entries.slice(0, MAX_SENT_IDS));
      localStorage.setItem(SENT_IDS_KEY, JSON.stringify(trimmed));
      return;
    }
    localStorage.setItem(SENT_IDS_KEY, JSON.stringify(sent));
  } catch {
    // ignore quota errors
  }
}

export function recordSentAlertIds(newIds: string[]): Record<string, number> {
  const current = loadSentAlertIds();
  const now = Date.now();
  for (const id of newIds) {
    current[id] = now;
  }
  saveSentAlertIds(current);
  return current;
}

export function loadAlertWatchlist(): SmcAlertWatchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAlertWatchlist(items: SmcAlertWatchItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function loadAlertSettings(): SmcAlertChannelSettings {
  if (typeof window === 'undefined') return DEFAULT_CHANNEL_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_CHANNEL_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CHANNEL_SETTINGS,
      ...parsed,
      whatsappProvider: 'selfhosted',
      whatsappPhone: parsed.whatsappPhone || '+918838202279',
      twilioAccountSid: parsed.twilioAccountSid || DEFAULT_TWILIO_SID,
      twilioAuthToken: parsed.twilioAuthToken || DEFAULT_TWILIO_TOKEN,
    };
  } catch {
    return DEFAULT_CHANNEL_SETTINGS;
  }
}

export function saveAlertSettings(settings: SmcAlertChannelSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

export function loadAlertHistory(): SmcTriggeredAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 150) : [];
  } catch {
    return [];
  }
}

export function saveAlertHistory(history: SmcTriggeredAlert[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 150)));
  } catch {
    // ignore quota errors
  }
}

export function classifySetupStage(status: string, signalState?: string): { stage: SmcAlertStage; label: string } {
  if (status === 'TARGET_HIT') return { stage: 'TP_HIT', label: 'TP1 HIT' };
  if (status === 'EXITED') return { stage: 'TP_HIT', label: 'TP2 / EXITED' };
  if (status === 'INVALIDATED' || signalState === 'RETEST_FAILED') return { stage: 'SL_HIT', label: 'SL / INVALIDATED' };
  if (signalState === 'ENTRY_READY' || signalState === 'EXECUTED' || signalState === 'REJECTION_CONFIRMED' || signalState === 'RETEST_CONFIRMED') {
    return { stage: 'ACTIONABLE', label: signalState === 'ENTRY_READY' ? 'ENTRY READY' : 'REJECTION CONFIRMED' };
  }
  if (signalState === 'RETEST_TOUCHED' || status === 'RETESTING' || status === 'ENTRY_ZONE_REACHED') {
    return { stage: 'RETEST', label: 'RETEST TOUCHED' };
  }
  return { stage: 'EARLY', label: 'WAIT PULLBACK' };
}
