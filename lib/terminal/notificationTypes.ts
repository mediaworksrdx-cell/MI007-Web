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

export const BASELINE_SIGNALS: AppNotification[] = [
  {
    id: 'sig-nifty-breakout',
    type: 'SIGNAL',
    icon: '⚡',
    badge: 'TECHNICAL BREAKOUT',
    title: 'NIFTY 50 Structural Resistance Sweep',
    desc: 'Broke above 24,580 structural resistance with 1.8x institutional volume surge.',
    time: '4m ago',
    timestamp: Date.now() - 4 * 60 * 1000,
    symbol: 'NIFTY',
    market: 'INDIA',
    href: '/chart/NIFTY?market=INDIA',
    priority: 'HIGH',
  },
  {
    id: 'sig-gold-absorption',
    type: 'SIGNAL',
    icon: '🛢️',
    badge: 'ORDER FLOW ABSORPTION',
    title: 'Gold Spot Limit Absorption',
    desc: 'XAU/USD holding $2,653 support block with aggressive institutional limit bid stacking.',
    time: '18m ago',
    timestamp: Date.now() - 18 * 60 * 1000,
    symbol: 'GOLD',
    market: 'USA',
    href: '/chart/GOLD?market=USA',
    priority: 'MEDIUM',
  },
  {
    id: 'sig-eurusd-liquidity',
    type: 'SIGNAL',
    icon: '💱',
    badge: 'FOREX SPREAD',
    title: 'EUR/USD Interbank Spread Tightening',
    desc: 'Interbank spread narrowed to 0.8 pips at 1.0845 on London/NY market overlap flow.',
    time: '35m ago',
    timestamp: Date.now() - 35 * 60 * 1000,
    symbol: 'EURUSD',
    market: 'USA',
    href: '/chart/EURUSD?market=USA',
    priority: 'LOW',
  },
];
