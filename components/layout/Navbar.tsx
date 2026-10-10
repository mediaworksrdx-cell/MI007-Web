'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MarketToggle } from '@/components/market/MarketToggle';
import { TickerTape } from '@/components/market/TickerTape';
import { MarketType } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';
import { useAppTheme, THEMES, ThemeConfig } from '@/lib/themeContext';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';

interface NavbarProps {
  market?: MarketType;
  onMarketChange?: (m: MarketType) => void;
}

const NAV_LINKS = [
  { href: '/',          label: 'Home' },
  { href: '/about',     label: 'About' },
  { href: '/contact',   label: 'Contact' },
];

export function Navbar({ market: propMarket, onMarketChange: propOnMarketChange }: NavbarProps) {
  const pathname = usePathname();
  const context = useMarket();
  const { theme, setTheme, currentThemeConfig } = useAppTheme();
  const market = propMarket ?? context.market ?? 'USA';
  const isTerminalOrDashboard = pathname.startsWith('/terminal') || pathname.startsWith('/dashboard');

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [userSession, setUserSession] = useState<{ name: string; role: string; deskId: string } | null>(null);

  const [brandHovered, setBrandHovered] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mi007_user_session');
      if (stored) {
        setUserSession(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Click outside & Escape key handler to close Account/Settings dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };

    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

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
      <div className="mx-auto flex h-16 sm:h-18 max-w-[1600px] items-center justify-between px-4 lg:px-6">
        {/* ── Cyber Falcon Logo with Interactive 3D Pop-Up (Zero Background) ── */}
        <Link
          href="/"
          className="flex items-center gap-2.5 sm:gap-3.5 select-none group min-w-0"
          onMouseEnter={() => setBrandHovered(true)}
          onMouseLeave={() => setBrandHovered(false)}
        >
          <div className="relative z-50 h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 flex-shrink-0 flex items-center justify-center overflow-visible">
            <Falcon3DLogo
              src="/images/logo-falcon-transparent.png"
              alt="Market Intelligence MI- 007"
              width={48}
              height={48}
              priority
              className="w-full h-full object-contain"
              popoutScale={1.05}
              isNavbar={true}
              isHoveredExternal={brandHovered}
            />
          </div>
          <div className="flex flex-col leading-tight min-w-0 justify-center">
            <span className="text-[9px] sm:text-[10px] font-mono font-black text-emerald-500 tracking-[0.25em] uppercase leading-none mb-0.5">
              MI-007
            </span>
            <div>
              <span className="navbar-brand-title font-black text-[14px] xs:text-[15px] sm:text-[17px] tracking-tight uppercase font-sans whitespace-nowrap">
                MARKET INTELLIGENCE
              </span>
            </div>
            <span className="navbar-brand-subtitle hidden xs:block text-[8.5px] sm:text-[10px] tracking-[0.16em] sm:tracking-[0.18em] font-extrabold uppercase font-mono mt-0.5 whitespace-nowrap">
              Intelligence Beyond the Noise
            </span>
          </div>
        </Link>

        {/* ── Desktop Nav Links (High Contrast, Clear Active State) ── */}
        <nav className="hidden md:flex items-center gap-1.5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3.5 py-1.5 rounded-lg text-[14px] font-bold transition-all duration-150 ${
                  isActive ? 'nav-link-active' : 'nav-link-inactive'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Top-Right Institutional Cluster: MarketToggle + Single Terminal CTA + 1 Unified Account/Settings Icon ── */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isTerminalOrDashboard && (
            <MarketToggle
              selected={market}
              onChange={handleMarketChange}
              className="hidden sm:flex"
            />
          )}

          {/* ── Exactly 1 Single Launch Terminal Button ── */}
          {!isTerminalOrDashboard && (
            <Link
              href="/terminal"
              className="launch-terminal-btn hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-mono font-bold tracking-wide transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span className="text-amber-300">⚡</span>
              <span>LAUNCH TERMINAL</span>
            </Link>
          )}

          {/* ── 1 Unified Icon for Settings & Login (Like Top Platforms) ── */}
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              className={`account-menu-btn relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-all duration-200 cursor-pointer shadow-xs active:scale-95 ${
                accountMenuOpen ? 'ring-2 ring-emerald-500' : ''
              }`}
              title={userSession ? `${userSession.name} · Settings & Themes` : 'Account, Settings & Themes'}
              aria-label="Account, Settings and Themes"
              aria-expanded={accountMenuOpen}
            >
              {/* Institutional User Profile Silhouette */}
              <svg
                className="w-5 h-5 transition-transform duration-200"
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
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-xs ${
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
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-base shrink-0 shadow-xs">
                      👤
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

                {/* Divider */}
                <div className="w-full h-px opacity-20 bg-current my-0.5" />

                {/* 3. Settings Modal Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="account-dropdown-settings-btn w-full p-2 rounded-lg border flex items-center justify-between text-left transition-all cursor-pointer opacity-85 hover:opacity-100 group"
                >
                  <div className="flex items-center gap-2 text-[12px] font-mono font-bold">
                    <span>⚙️</span>
                    <span>System Settings & Audio</span>
                  </div>
                  <span className="text-xs font-mono opacity-60 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger - 44x44px minimum touch target for iOS & Android */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl touch-manipulation cursor-pointer opacity-80 hover:opacity-100"
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
        <div className="md:hidden mobile-drawer-panel border-t px-4 py-3 pb-6 safe-bottom flex flex-col gap-2 shadow-xl max-h-[calc(100dvh-5.5rem)] overflow-y-auto">
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
              <span>⚙️</span>
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
              <span>👤</span>
              <span className="truncate">{userSession ? userSession.name : 'Client Login'}</span>
            </button>
          </div>

          {isTerminalOrDashboard && (
            <MarketToggle selected={market} onChange={handleMarketChange} className="w-full justify-center mb-2" />
          )}

          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3.5 py-3 rounded-xl text-[16px] font-bold min-h-[44px] flex items-center transition-colors ${
                pathname === href ? 'nav-link-active' : 'nav-link-inactive'
              }`}
            >
              {label}
            </Link>
          ))}

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
