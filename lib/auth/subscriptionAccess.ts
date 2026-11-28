import { getUserAccount, UserAccount } from './userAccount';

export type SubscriptionTier = 'GUEST' | 'UNSUBSCRIBED' | 'TRIAL' | 'PULSE' | 'PRO' | 'MASTER_PRO';

export interface ActiveSubscriptionRecord {
  planId: 'TRIAL' | 'PULSE' | 'PRO' | 'MASTER_PRO';
  billingCycle: 'TRIAL_15D' | 'MONTHLY' | 'ANNUAL';
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
  hasClaimedTrial: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isLockedOut: boolean;
  daysRemaining: number;
  user: UserAccount | null;
  subscription: ActiveSubscriptionRecord | null;
  limits: TierLimits;
}

const SUB_STORAGE_KEY = 'mi007_active_subscription_v1';
const TRIAL_CLAIMED_PREFIX = 'mi007_trial_claimed_v1_';
export const FREE_LOOK_IN_DAYS = 15;

export function getStoredPaidSubscription(): ActiveSubscriptionRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SUB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSubscriptionRecord;
    if (!parsed || !parsed.planId || !parsed.validUntil) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function activateFreeLookInTrial(user: UserAccount): ActiveSubscriptionRecord {
  const now = Date.now();
  const validUntil = new Date(now + FREE_LOOK_IN_DAYS * 86_400_000).toISOString();
  const rec: ActiveSubscriptionRecord = {
    planId: 'TRIAL',
    billingCycle: 'TRIAL_15D',
    paymentId: `trial_${now.toString(36)}`,
    status: 'ACTIVE',
    activatedAt: new Date(now).toISOString(),
    validUntil,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(SUB_STORAGE_KEY, JSON.stringify(rec));
    localStorage.setItem(`${TRIAL_CLAIMED_PREFIX}${user.email || user.id}`, 'true');
    window.dispatchEvent(new Event('mi007-user-updated'));
  }
  return rec;
}

export function clearActiveSubscription(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SUB_STORAGE_KEY);
    window.dispatchEvent(new Event('mi007-user-updated'));
  }
}

export function evaluateSubscriptionAccess(): SubscriptionAccessState {
  const rawUser = getUserAccount();
  // Demo user does not bypass subscription gate
  const user = rawUser && rawUser.id !== 'ACC-DEMO-007' ? rawUser : null;

  const lockedLimits: TierLimits = {
    maxPortfolioTrades: 0,
    allowUnlimitedBacktest: false,
    allowOptionsAlgorithm: false,
    allowFullStrategyBuilder: false,
    allowLiveHistoricalToi: false,
    feedMode: 'DELAYED_15M',
  };

  if (!user) {
    return {
      tier: 'GUEST',
      tierLabel: 'Guest (Sign-In Required)',
      isSignedIn: false,
      hasClaimedTrial: false,
      isTrialActive: false,
      isTrialExpired: false,
      isLockedOut: true,
      daysRemaining: 0,
      user: null,
      subscription: null,
      limits: lockedLimits,
    };
  }

  const hasClaimedTrial =
    typeof window !== 'undefined' &&
    localStorage.getItem(`${TRIAL_CLAIMED_PREFIX}${user.email || user.id}`) === 'true';

  const sub = getStoredPaidSubscription();
  if (!sub) {
    return {
      tier: 'UNSUBSCRIBED',
      tierLabel: 'No Active Subscription',
      isSignedIn: true,
      hasClaimedTrial,
      isTrialActive: false,
      isTrialExpired: hasClaimedTrial,
      isLockedOut: true,
      daysRemaining: 0,
      user,
      subscription: null,
      limits: lockedLimits,
    };
  }

  const msLeft = new Date(sub.validUntil).getTime() - Date.now();
  if (msLeft <= 0 || sub.status === 'EXPIRED') {
    return {
      tier: 'UNSUBSCRIBED',
      tierLabel: sub.planId === 'TRIAL' ? '15-Day Free Trial Expired' : 'Subscription Expired',
      isSignedIn: true,
      hasClaimedTrial: true,
      isTrialActive: false,
      isTrialExpired: sub.planId === 'TRIAL',
      isLockedOut: true,
      daysRemaining: 0,
      user,
      subscription: sub,
      limits: lockedLimits,
    };
  }

  const daysRemaining = Math.max(1, Math.ceil(msLeft / 86_400_000));

  if (sub.planId === 'MASTER_PRO') {
    return {
      tier: 'MASTER_PRO',
      tierLabel: 'MARKET MASTER PRO (Ultra Alpha)',
      isSignedIn: true,
      hasClaimedTrial,
      isTrialActive: false,
      isTrialExpired: false,
      isLockedOut: false,
      daysRemaining,
      user,
      subscription: sub,
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

  if (sub.planId === 'PRO') {
    return {
      tier: 'PRO',
      tierLabel: 'MARKET PRO (Edge Pro)',
      isSignedIn: true,
      hasClaimedTrial,
      isTrialActive: false,
      isTrialExpired: false,
      isLockedOut: false,
      daysRemaining,
      user,
      subscription: sub,
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

  if (sub.planId === 'PULSE') {
    return {
      tier: 'PULSE',
      tierLabel: 'MARKET PULSE (Pulse Basic)',
      isSignedIn: true,
      hasClaimedTrial,
      isTrialActive: false,
      isTrialExpired: false,
      isLockedOut: false,
      daysRemaining,
      user,
      subscription: sub,
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

  // Explicitly activated 15-Day Free Look-In Trial
  return {
    tier: 'TRIAL',
    tierLabel: `15-Day Free Look-In Trial (${daysRemaining}d left)`,
    isSignedIn: true,
    hasClaimedTrial: true,
    isTrialActive: true,
    isTrialExpired: false,
    isLockedOut: false,
    daysRemaining,
    user,
    subscription: sub,
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
