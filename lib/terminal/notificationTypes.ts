// ─── Notification Types & Engine Definitions ────────────────────────────────

export type NotificationType = 'ALL' | 'NEWS' | 'CALENDAR' | 'SIGNAL';

export interface AppNotification {
  id: string;
  type: 'NEWS' | 'CALENDAR' | 'SIGNAL';
  icon: string;
  badge: string;
  title: string;
  desc: string;
  time: string;
  timestamp: number;
  market: 'INDIA' | 'USA' | 'EUROPE' | 'GLOBAL' | 'UAE';
  symbol?: string;
  href: string;
  isBreaking?: boolean;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

// In live production, no fabricated signals are pushed. Signals originate strictly from real market alerts.
export const BASELINE_SIGNALS: AppNotification[] = [];
