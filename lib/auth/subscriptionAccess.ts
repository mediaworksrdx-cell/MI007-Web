import { getUserAccount, UserAccount } from './userAccount';

export type SubscriptionTier = 'GUEST' | 'TRIAL' | 'PULSE' | 'PRO' | 'MASTER_PRO';

export interface ActiveSubscriptionRecord {
  planId: 'PULSE' | 'PRO' | 'MASTER_PRO';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  paymentId?: string;
  orderId?: string;
  status: 'ACTIVE' | 'EXPIRED';
  activatedAt: string;
  validUntil: string;
}

export interface TierLimits {
  maxPortfolioTrades: number;       // 4 for PULSE/TRIAL, 8 for PRO, 999 for MASTER_PRO
  allowUnlimitedBacktest: boolean;  // true only for MASTER_PRO
  allowOptionsAlgorithm: boolean;   // true only for MASTER_PRO
  allowFullStrategyBuilder: boolean;// true for PRO & MASTER_PRO
  allowLiveHistoricalToi: boolean;  // true for MASTER_PRO
  feedMode: 'LIVE' | 'DELAYED_15M';
}

export interface SubscriptionAccessState {
  tier: SubscriptionTier;
  tierLabel: string;
  isSignedIn: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isLockedOut: boolean;
  daysRemaining: number;
  user: UserAccount | null;
  limits: TierLimits;
}

const SUB_STORAGE_KEY = 'mi007_active_subscription_v1';
const TRIAL_START_KEY = 'mi007_trial_started_at_v1';
const FREE_LOOK_IN_DAYS = 3;

const ADMIN_EMAILS = new Set([
  'trader@synthetixanalytics.com',
  'admin@synthetixanalytics.com',
  'support@synthetixanalytics.com',
  'admin@marketintelligence-007.com',
]);

function isOwnerOrAdmin(user: UserAccount | null): boolean {
  if (!user || !user.email) return false;
  const email = user.email.trim().toLowerCase();
  if (ADMIN_EMAILS.has(email)) return true;
  if (email.endsWith('@synthetixanalytics.com') || email.endsWith('@marketintelligence-007.com')) {
    return true;
  }
  return false;
}

export function getStoredPaidSubscription(): ActiveSubscriptionRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SUB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSubscriptionRecord;
    if (!parsed || !parsed.planId || !parsed.validUntil) return null;
    if (new Date(parsed.validUntil).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function evaluateSubscriptionAccess(): SubscriptionAccessState {
  const user = getUserAccount();

  if (!user) {
    return {
      tier: 'GUEST',
      tierLabel: 'Guest (Not Signed In)',
      isSignedIn: false,
      isTrialActive: false,
      isTrialExpired: false,
      isLockedOut: true,
      daysRemaining: 0,
      user: null,
      limits: {
        maxPortfolioTrades: 0,
        allowUnlimitedBacktest: false,
        allowOptionsAlgorithm: false,
        allowFullStrategyBuilder: false,
        allowLiveHistoricalToi: false,
        feedMode: 'DELAYED_15M',
      },
    };
  }

  // 1. Admin / Institutional Desk Bypass -> Permanent MASTER_PRO
  if (isOwnerOrAdmin(user)) {
    return {
      tier: 'MASTER_PRO',
      tierLabel: 'MARKET MASTER PRO (Institutional Desk)',
      isSignedIn: true,
      isTrialActive: false,
      isTrialExpired: false,
      isLockedOut: false,
      daysRemaining: 365,
      user,
      limits: {
        maxPortfolioTrades: 999,
        allowUnlimitedBacktest: true,
        allowOptionsAlgorithm: true,
        allowFullStrategyBuilder: true,
        allowLiveHistoricalToi: true,
        feedMode: 'LIVE',
      },
    };
  }

  // 2. Active Paid Razorpay Subscription
  const paid = getStoredPaidSubscription();
  if (paid) {
    const msLeft = Math.max(0, new Date(paid.validUntil).getTime() - Date.now());
    const daysRemaining = Math.max(1, Math.ceil(msLeft / 86_400_000));

    if (paid.planId === 'MASTER_PRO') {
      return {
        tier: 'MASTER_PRO',
        tierLabel: 'MARKET MASTER PRO (Ultra Alpha)',
        isSignedIn: true,
        isTrialActive: false,
        isTrialExpired: false,
        isLockedOut: false,
        daysRemaining,
        user,
        limits: {
          maxPortfolioTrades: 999,
          allowUnlimitedBacktest: true,
          allowOptionsAlgorithm: true,
          allowFullStrategyBuilder: true,
          allowLiveHistoricalToi: true,
          feedMode: 'LIVE',
        },
      };
    }

    if (paid.planId === 'PRO') {
      return {
        tier: 'PRO',
        tierLabel: 'MARKET PRO (Edge Pro)',
        isSignedIn: true,
        isTrialActive: false,
        isTrialExpired: false,
        isLockedOut: false,
        daysRemaining,
        user,
        limits: {
          maxPortfolioTrades: 8,
          allowUnlimitedBacktest: false,
          allowOptionsAlgorithm: false,
          allowFullStrategyBuilder: true,
          allowLiveHistoricalToi: false,
          feedMode: 'LIVE',
        },
      };
    }

    return {
      tier: 'PULSE',
      tierLabel: 'MARKET PULSE (Pulse Basic)',
      isSignedIn: true,
      isTrialActive: false,
      isTrialExpired: false,
      isLockedOut: false,
      daysRemaining,
      user,
      limits: {
        maxPortfolioTrades: 4,
        allowUnlimitedBacktest: false,
        allowOptionsAlgorithm: false,
        allowFullStrategyBuilder: false,
        allowLiveHistoricalToi: false,
        feedMode: 'LIVE',
      },
    };
  }

  // 3. Free Look-In Trial (3 Days from user.createdAt or first terminal visit)
  let trialStartMs = user.createdAt ? new Date(user.createdAt).getTime() : NaN;
  if (!Number.isFinite(trialStartMs) && typeof window !== 'undefined') {
    const storedStart = localStorage.getItem(TRIAL_START_KEY);
    if (storedStart && Number.isFinite(Number(storedStart))) {
      trialStartMs = Number(storedStart);
    } else {
      trialStartMs = Date.now();
      localStorage.setItem(TRIAL_START_KEY, String(trialStartMs));
    }
  }

  const trialEndMs = trialStartMs + FREE_LOOK_IN_DAYS * 86_400_000;
  const msRemaining = trialEndMs - Date.now();
  const isTrialActive = msRemaining > 0;
  const daysRemaining = isTrialActive ? Math.max(1, Math.ceil(msRemaining / 86_400_000)) : 0;

  return {
    tier: 'TRIAL',
    tierLabel: isTrialActive
      ? `Free Look-In Trial (${daysRemaining}d left · Pulse Limits)`
      : 'Free Look-In Trial Expired',
    isSignedIn: true,
    isTrialActive,
    isTrialExpired: !isTrialActive,
    isLockedOut: !isTrialActive,
    daysRemaining,
    user,
    limits: {
      maxPortfolioTrades: 4,
      allowUnlimitedBacktest: false,
      allowOptionsAlgorithm: false,
      allowFullStrategyBuilder: false,
      allowLiveHistoricalToi: false,
      feedMode: isTrialActive ? 'LIVE' : 'DELAYED_15M',
    },
  };
}
