'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TickerTape } from '@/components/market/TickerTape';
import { MarketType } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';
import { useAppTheme, THEMES, ThemeConfig } from '@/lib/themeContext';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';
import {
  AppNotification,
  NotificationType,
  BASELINE_SIGNALS,
} from '@/lib/terminal/notificationTypes';

interface NavbarProps {
  market?: MarketType;
  onMarketChange?: (m: MarketType) => void;
}

const PUBLIC_NAV_LINKS = [
  { href: '/',        label: 'Home' },
  { href: '/about',   label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const TERMINAL_NAV_LINKS = [
  { href: '/terminal',          label: 'Dashboard' },
  { href: '/chart/NIFTY',       label: 'Charts' },
  { href: '/terminal/screener', label: 'Screeners' },
  { href: '/academy',           label: 'Academy' },
  { href: '/calendar',          label: 'Calendar' },
  { href: '/news',              label: 'News' },
];

export function Navbar({ market: propMarket, onMarketChange: propOnMarketChange }: NavbarProps) {
  const pathname = usePathname();
  const context = useMarket();
  const { theme, setTheme, currentThemeConfig } = useAppTheme();
  const market = propMarket ?? context.market ?? 'USA';
  const isTerminalOrDashboard =
    pathname.startsWith('/terminal') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/chart') ||
    pathname.startsWith('/screener') ||
    pathname.startsWith('/academy') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/news');

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);

  // ── Unified Notification Centre State (Real-Time News, Calendar, Signals) ──
  const [notifications, setNotifications] = useState<AppNotification[]>(BASELINE_SIGNALS);
  const [notifFilter, setNotifFilter] = useState<NotificationType>('ALL');
  const [notifLoading, setNotifLoading] = useState(false);
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState(false);

  const unreadCount = notifications.length;
  const [userSession, setUserSession] = useState<{ name: string; role: string; deskId: string } | null>(null);

  const [brandHovered, setBrandHovered] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  // Load real-time aggregated notifications from API
  const loadNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setNotifLoading(true);
      const res = await fetch('/api/terminal/notifications');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          let dismissed: Set<string> = new Set();
          try {
            const raw = localStorage.getItem('mi007_dismissed_notifications');
            if (raw) dismissed = new Set(JSON.parse(raw));
          } catch {}

          const active = data.notifications.filter((n: AppNotification) => !dismissed.has(n.id));
          setNotifications(active);
        }
      }
    } catch (err) {
      console.warn('[Navbar] Failed to load live notifications:', err);
    } finally {
      if (!silent) setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(false);
    // Poll every 45s for fresh alerts
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Check desktop browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDesktopAlertsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setDesktopAlertsEnabled(perm === 'granted');
        if (perm === 'granted') {
          new Notification('MI-007 Notifications Activated', {
            body: 'You will receive real-time alerts for Breaking Market News and High-Impact Economic releases.',
            icon: '/favicon.ico',
          });
        }
      } catch (err) {
        console.warn('Desktop notification error:', err);
      }
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    try {
      const raw = localStorage.getItem('mi007_dismissed_notifications');
      const currentList: string[] = raw ? JSON.parse(raw) : [];
      if (!currentList.includes(id)) {
        currentList.push(id);
        localStorage.setItem('mi007_dismissed_notifications', JSON.stringify(currentList));
      }
    } catch {}
  };

  const clearAllNotifications = () => {
    const allIds = notifications.map((n) => n.id);
    setNotifications([]);
    try {
      const raw = localStorage.getItem('mi007_dismissed_notifications');
      const currentList: string[] = raw ? JSON.parse(raw) : [];
      const updated = Array.from(new Set([...currentList, ...allIds]));
      localStorage.setItem('mi007_dismissed_notifications', JSON.stringify(updated));
    } catch {}
  };

  const restoreDismissedAlerts = () => {
    try {
      localStorage.removeItem('mi007_dismissed_notifications');
    } catch {}
    loadNotifications(false);
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'ALL') return notifications;
    return notifications.filter((n) => n.type === notifFilter);
  }, [notifications, notifFilter]);

  // Category counts
  const notifCounts = useMemo(() => {
    return {
      all: notifications.length,
      news: notifications.filter((n) => n.type === 'NEWS').length,
      calendar: notifications.filter((n) => n.type === 'CALENDAR').length,
      signal: notifications.filter((n) => n.type === 'SIGNAL').length,
    };
  }, [notifications]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mi007_user_session');
      if (stored) {
        setUserSession(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Click outside & Escape key handler to close Account/Settings & Notification dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(e.target as Node)) {
        setNotificationMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountMenuOpen(false);
        setNotificationMenuOpen(false);
      }
    };

    if (accountMenuOpen || notificationMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen, notificationMenuOpen]);

  const handleMarketChange = (m: MarketType) => {
    if (propOnMarketChange) {
      propOnMarketChange(m);
    }
    context.setMarket(m);
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled ? 'shadow-sm backdrop-blur-md' : 'backdrop-blur-sm'
      }`}
    >
      <div className="mx-auto flex h-13 sm:h-14 max-w-[1600px] items-center justify-between px-4 lg:px-6">
        {/* ── Cyber Falcon Logo with Interactive 3D Pop-Up (Zero Background) ── */}
        <Link
          href="/"
          className="flex items-center gap-2.5 sm:gap-3.5 select-none group min-w-0"
          onMouseEnter={() => setBrandHovered(true)}
          onMouseLeave={() => setBrandHovered(false)}
        >
          <div className="relative z-50 h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 flex items-center justify-center overflow-visible">
            <Falcon3DLogo
              src="/images/logo-falcon-transparent.png"
              alt="MARKET INTELLIGENCE MI-007"
              width={40}
              height={40}
              priority
              className="w-full h-full object-contain"
              popoutScale={1.12}
              isNavbar={true}
              isHoveredExternal={brandHovered}
            />
          </div>
          <div className="flex flex-col leading-tight min-w-0 justify-center">
            <span className="navbar-brand-title font-black text-[12px] xs:text-[13.5px] sm:text-[15px] md:text-[16px] tracking-tight uppercase font-sans truncate sm:whitespace-nowrap">
              MARKET INTELLIGENCE MI-007
            </span>
            {/* Tagline Always Visible on screens >= xs */}
            <span className="navbar-brand-subtitle text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] tracking-[0.14em] sm:tracking-[0.16em] font-extrabold uppercase font-mono mt-0.5 truncate hidden xs:block">
              Intelligence Beyond the Noise
            </span>
          </div>
        </Link>

        {/* ── Desktop Nav Links (High Contrast, Clear Active State) ── */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5">
          {(isTerminalOrDashboard ? TERMINAL_NAV_LINKS : PUBLIC_NAV_LINKS).map(({ href, label }) => {
            const isActive =
              pathname === href ||
              (href === '/chart/NIFTY' && pathname.startsWith('/chart')) ||
              (href === '/terminal' && (pathname === '/terminal' || pathname === '/dashboard')) ||
              (href === '/terminal/screener' && (pathname.startsWith('/terminal/screener') || pathname.startsWith('/screener'))) ||
              (href === '/academy' && (pathname.startsWith('/academy') || pathname.startsWith('/terminal/academy'))) ||
              (href === '/calendar' && pathname.startsWith('/calendar')) ||
              (href === '/news' && pathname.startsWith('/news'));
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1 rounded-lg text-[13px] sm:text-[13.5px] font-bold transition-all duration-150 ${
                  isActive ? 'nav-link-active' : 'nav-link-inactive'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Top-Right Institutional Cluster: Single Terminal CTA + 1 Unified Account/Settings Icon ── */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* ── Exactly 1 Single Launch Terminal Button ── */}
          {!isTerminalOrDashboard && (
            <Link
              href="/terminal"
              className="launch-terminal-btn hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[12px] font-mono font-bold tracking-wide transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-300">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>LAUNCH TERMINAL</span>
            </Link>
          )}

          {/* ── Notification Bell Icon with Live Alerts Flyout ── */}
          <div className="relative" ref={notificationMenuRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationMenuOpen((v) => !v);
                setAccountMenuOpen(false);
              }}
              className={`relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg border transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
                notificationMenuOpen ? 'ring-2 ring-emerald-500' : 'opacity-85 hover:opacity-100 hover:border-emerald-500/40'
              }`}
              title="Market Alerts & Notifications"
              aria-label="Market Notifications"
              aria-expanded={notificationMenuOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-slate-950 font-mono shadow-xs animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Flyout Menu */}
            {notificationMenuOpen && (
              <div className="account-settings-dropdown absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl p-3 flex flex-col gap-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xl">
                {/* Header with Title, Count, Sync & Clear */}
                <div className="flex items-center justify-between px-2 py-1 border-b border-current/15 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-mono font-black uppercase tracking-wider">
                      Signals & Newsfeed
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                      {notifCounts.all} LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadNotifications(false)}
                      disabled={notifLoading}
                      className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 cursor-pointer disabled:opacity-40 transition-colors"
                      title="Sync live alerts"
                    >
                      <span className={`inline-block text-xs ${notifLoading ? 'animate-spin' : ''}`}>🔄</span>
                    </button>
                    {notifCounts.all > 0 && (
                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        className="text-[11px] font-mono text-emerald-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-black/20 text-[11px] font-mono font-bold">
                  {(
                    [
                      { id: 'ALL', label: `All (${notifCounts.all})` },
                      { id: 'NEWS', label: `News (${notifCounts.news})` },
                      { id: 'CALENDAR', label: `Macro (${notifCounts.calendar})` },
                      { id: 'SIGNAL', label: `Signals (${notifCounts.signal})` },
                    ] as const
                  ).map((tab) => {
                    const active = notifFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setNotifFilter(tab.id)}
                        className={`py-1 rounded-md text-[10px] sm:text-[10.5px] truncate transition-all cursor-pointer ${
                          active
                            ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                            : 'text-[var(--theme-card-text-muted)] hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Notifications List */}
                <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-0.5">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-6 px-4 text-center flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                      <div className="text-xs font-mono font-bold">All caught up</div>
                      <p className="text-[11px] opacity-60">
                        {notifFilter === 'ALL'
                          ? 'No pending alerts. Monitoring live news wires, RBI/Fed macro releases, and order flow breaks.'
                          : `No unread ${notifFilter.toLowerCase()} alerts right now.`}
                      </p>
                      <button
                        type="button"
                        onClick={restoreDismissedAlerts}
                        className="mt-1 text-[11px] font-mono font-bold text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                      >
                        Restore Dismissed Alerts
                      </button>
                    </div>
                  ) : (
                    filteredNotifications.map((n) => {
                      const typeStyles = {
                        NEWS: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                        CALENDAR: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
                        SIGNAL: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
                      }[n.type];

                      return (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => setNotificationMenuOpen(false)}
                          className="group relative p-2.5 rounded-xl border border-current/10 bg-current/5 hover:border-emerald-500/40 transition-all flex items-start gap-2.5 text-left cursor-pointer"
                        >
                          <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              {n.isBreaking && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-mono font-black uppercase tracking-wider animate-pulse">
                                  BREAKING
                                </span>
                              )}
                              <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono font-bold uppercase tracking-wider ${typeStyles}`}>
                                {n.badge}
                              </span>
                              <span className="text-[10px] font-mono opacity-50 ml-auto shrink-0">{n.time}</span>
                            </div>

                            <div className="text-xs font-bold font-mono leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                              {n.title}
                            </div>
                            <p className="text-[11px] opacity-75 leading-snug mt-1 line-clamp-2">{n.desc}</p>

                            <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-current/10 text-[10px] font-mono font-bold text-emerald-400">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15">{n.market}</span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                Open {n.type === 'CALENDAR' ? 'Calendar' : n.type === 'NEWS' ? 'News' : 'Chart'} →
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              dismissNotification(n.id);
                            }}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-current/10 transition-all text-xs font-mono cursor-pointer"
                            title="Dismiss notification"
                            aria-label="Dismiss notification"
                          >
                            ✕
                          </button>
                        </Link>
                      );
                    })
                  )}
                </div>

                {/* Footer with Quick Links & Desktop Notification Toggle */}
                <div className="border-t border-current/15 pt-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                    <Link
                      href="/terminal/screener"
                      onClick={() => setNotificationMenuOpen(false)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group"
                    >
                      <span>⚡ Screeners</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </Link>
                    <Link
                      href="/academy"
                      onClick={() => setNotificationMenuOpen(false)}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 group"
                    >
                      <span>🎓 Academy</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </Link>
                    <Link
                      href="/calendar"
                      onClick={() => setNotificationMenuOpen(false)}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 group"
                    >
                      <span>📅 Calendar</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </Link>
                    <Link
                      href="/news"
                      onClick={() => setNotificationMenuOpen(false)}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
                    >
                      <span>📰 Newsroom</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </Link>
                  </div>

                  {/* Browser Desktop Notification Activation */}
                  <div className="pt-1.5 border-t border-current/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={requestDesktopPermission}
                      className="text-[10px] font-mono opacity-70 hover:opacity-100 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{desktopAlertsEnabled ? '✅' : '🔔'}</span>
                      <span>{desktopAlertsEnabled ? 'Desktop alerts enabled' : 'Enable browser alerts'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationMenuOpen(false)}
                      className="text-[10px] font-mono opacity-50 hover:opacity-100 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── 1 Unified Icon for Settings & Login (Like Top Platforms) ── */}
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              className={`account-menu-btn relative flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-lg border transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
                accountMenuOpen ? 'ring-2 ring-emerald-500' : ''
              }`}
              title={userSession ? `${userSession.name} · Settings & Themes` : 'Account, Settings & Themes'}
              aria-label="Account, Settings and Themes"
              aria-expanded={accountMenuOpen}
            >
              {/* Institutional User Profile Silhouette */}
              <svg
                className="w-4.5 h-4.5 transition-transform duration-200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>

              {/* Status / Active Theme Pip */}
              <span
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs ${
                  userSession ? 'bg-emerald-500 animate-pulse' : ''
                }`}
                style={!userSession ? { backgroundColor: currentThemeConfig.palette.accent } : undefined}
                title={userSession ? `Connected: ${userSession.name}` : `Theme: ${currentThemeConfig.name}`}
              />
            </button>

            {/* ── Unified Account, Settings & Themes Dropdown Menu ── */}
            {accountMenuOpen && (
              <div className="account-settings-dropdown absolute right-0 mt-2.5 w-72 sm:w-80 rounded-2xl p-3 flex flex-col gap-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* 1. Account / Session Section */}
                {userSession ? (
                  <div className="account-dropdown-user-card p-3 rounded-xl border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        DESK CONNECTED
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-500">
                        {userSession.deskId}
                      </span>
                    </div>
                    <div className="font-extrabold text-[15px] truncate">{userSession.name}</div>
                    <div className="text-[11px] font-mono opacity-70 truncate">{userSession.role}</div>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('mi007_user_session');
                        setUserSession(null);
                      }}
                      className="mt-2.5 w-full py-1.5 px-3 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-mono font-bold transition-all text-center cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setLoginOpen(true);
                    }}
                    className="account-dropdown-login-btn w-full p-2.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shrink-0 shadow-xs">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[13px] tracking-tight group-hover:text-emerald-500 transition-colors">
                          Client Portal Login
                        </span>
                        <span className="text-xs font-mono opacity-60">→</span>
                      </div>
                      <p className="text-[11px] opacity-70 leading-tight mt-0.5">
                        Access proprietary quant desk
                      </p>
                    </div>
                  </button>
                )}

                {/* Divider */}
                <div className="w-full h-px opacity-20 bg-current my-0.5" />

                {/* 2. Theme & Appearance (Quick 4-Theme Selector) */}
                <div>
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-60">
                      THEME & APPEARANCE
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-current opacity-70">
                      {currentThemeConfig.mode.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.values(THEMES) as ThemeConfig[]).map((t) => {
                      const isActive = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isActive
                              ? 'account-theme-active font-extrabold border-emerald-500 ring-1 ring-emerald-500'
                              : 'account-theme-inactive border-transparent hover:border-current opacity-80 hover:opacity-100'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/30 shadow-2xs"
                            style={{ backgroundColor: t.palette.bg }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11.5px] leading-tight truncate">{t.name}</div>
                            <div className="text-[9.5px] font-mono opacity-60">{t.mode}</div>
                          </div>
                          {isActive && <span className="text-emerald-500 text-xs font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger - 44x44px minimum touch target for iOS & Android */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            className="lg:hidden flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl touch-manipulation cursor-pointer opacity-80 hover:opacity-100"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
              {menuOpen ? (
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── Seamless Horizontal Micro Ticker Ribbon Loop ── */}
      <TickerTape market={market} />

      {/* ── Mobile Menu with iOS Safe Area Handling ── */}
      {menuOpen && (
        <div className="lg:hidden mobile-drawer-panel border-t px-4 py-3 pb-6 safe-bottom flex flex-col gap-2 shadow-xl max-h-[calc(100dvh-5.5rem)] overflow-y-auto">
          {/* Mobile Quick Action Buttons: Combined Settings & Login */}
          <div className="py-2.5 border-b border-current opacity-90 mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-current text-[13px] font-mono font-bold active:scale-95 cursor-pointer opacity-80 hover:opacity-100"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings & Themes</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setLoginOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 text-[13px] font-mono font-black shadow-xs active:scale-95 cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="truncate">{userSession ? userSession.name : 'Client Login'}</span>
            </button>
          </div>

          {(isTerminalOrDashboard ? TERMINAL_NAV_LINKS : PUBLIC_NAV_LINKS).map(({ href, label }) => {
            const isActive =
              pathname === href ||
              (href === '/chart/NIFTY' && pathname.startsWith('/chart')) ||
              (href === '/terminal' && (pathname === '/terminal' || pathname === '/dashboard')) ||
              (href === '/terminal/screener' && (pathname.startsWith('/terminal/screener') || pathname.startsWith('/screener'))) ||
              (href === '/academy' && (pathname.startsWith('/academy') || pathname.startsWith('/terminal/academy'))) ||
              (href === '/calendar' && pathname.startsWith('/calendar')) ||
              (href === '/news' && pathname.startsWith('/news'));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3.5 py-3 rounded-xl text-[16px] font-bold min-h-[44px] flex items-center transition-colors ${
                  isActive ? 'nav-link-active' : 'nav-link-inactive'
                }`}
              >
                {label}
              </Link>
            );
          })}

          {!isTerminalOrDashboard && (
            <Link
              href="/terminal"
              onClick={() => setMenuOpen(false)}
              className="launch-terminal-btn mt-1 flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-3 text-[15px] font-bold mono min-h-[44px]"
            >
              <span className="text-amber-300">⚡</span>
              <span>LAUNCH TERMINAL</span>
            </Link>
          )}
        </div>
      )}

      {/* ── Settings Modal & Login Modal ── */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={(u) => setUserSession(u)}
      />
    </header>
  );
}
