'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MarketToggle } from '@/components/market/MarketToggle';
import { TickerTape } from '@/components/market/TickerTape';
import { MarketType } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';
import { useAppTheme, THEMES, AppTheme } from '@/lib/themeContext';

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
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm'
          : 'bg-white/90 backdrop-blur-sm border-b border-slate-200/60'
      }`}
    >
      <div className="mx-auto flex h-16 sm:h-18 max-w-[1600px] items-center justify-between px-4 lg:px-6">
        {/* ── Recreated Cyber Falcon Logo with Light Blur Gradient Badge ── */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 select-none group min-w-0">
          <div className="relative h-11 w-11 sm:h-13 sm:w-13 md:h-14 md:w-14 flex-shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl overflow-hidden border border-sky-300/80 shadow-[0_4px_16px_rgba(14,165,233,0.18)] group-hover:border-sky-400 group-hover:scale-105 transition-all">
            <Image
              src="/images/logo-falcon-gradient.png"
              alt="Market Intelligence AI — MI007"
              width={56}
              height={56}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-[14px] xs:text-[15px] sm:text-[17px] tracking-tight text-slate-950 uppercase font-sans truncate">
                Market Intelligence <span className="text-emerald-600 font-black">AI</span>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10.5px] sm:text-[11px] mono font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 tracking-wider shadow-xs border border-amber-400/80 shrink-0">
                MI007
              </span>
            </div>
            <span className="hidden xs:block text-[9px] sm:text-[11px] tracking-[0.15em] sm:tracking-[0.2em] text-slate-700 font-extrabold uppercase font-mono mt-0.5 truncate">
              Autonomous Market Intelligence
            </span>
          </div>
        </Link>

        {/* ── Desktop Nav Links ── */}
        <nav className="hidden md:flex items-center gap-1.5">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3.5 py-1.5 rounded-md text-[15px] font-bold transition-all duration-150 ${
                  isActive
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : 'text-black hover:text-black hover:bg-slate-100'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── Market Toggle + Theme Quick Switch + CTA ── */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* ── Prominent Theme Selector Dropdown ── */}
          <div className="relative" ref={themeDropdownRef}>
            <button
              type="button"
              onClick={() => setThemeDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 bg-white/95 hover:bg-slate-50 text-slate-900 text-[12px] sm:text-[13px] font-mono font-bold shadow-xs transition-all hover:border-slate-400 active:scale-95"
              title="Click to change theme palette"
              aria-label="Theme selector"
            >
              <span className="text-sm">🎨</span>
              <span className="hidden sm:inline font-bold">Theme:</span>
              <span className="capitalize text-emerald-700 font-black">{currentThemeConfig.name.split(' ')[0]}</span>
              <span
                className="w-2.5 h-2.5 rounded-full ring-1 ring-black/20 shrink-0 ml-0.5"
                style={{ backgroundColor: currentThemeConfig.palette.accent }}
              />
              <svg
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${themeDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1 mb-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500 font-bold uppercase">
                  <span>Select Theme</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-black">4 Styles</span>
                </div>
                <div className="flex flex-col gap-1">
                  {(Object.values(THEMES) as typeof currentThemeConfig[]).map((t) => {
                    const isActive = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTheme(t.id);
                          setThemeDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                          isActive
                            ? 'bg-emerald-50/80 font-bold text-slate-950 border border-emerald-300 shadow-2xs'
                            : 'hover:bg-slate-50 text-slate-700 font-medium border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex items-center -space-x-1 shrink-0">
                            <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: t.palette.bg }} />
                            <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: t.palette.accent }} />
                            <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: t.palette.bull }} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate">{t.name}</span>
                            <span className="text-[10px] text-slate-500 truncate mono">{t.tagline}</span>
                          </div>
                        </div>
                        {isActive && (
                          <span className="text-emerald-600 text-xs font-black">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {isTerminalOrDashboard && (
            <MarketToggle
              selected={market}
              onChange={handleMarketChange}
              className="hidden sm:flex"
            />
          )}
          {!isTerminalOrDashboard && (
            <Link
              href="/terminal"
              className="hidden sm:flex items-center gap-1.5 rounded-md border border-emerald-600/30 bg-emerald-50 px-3.5 py-1.5 text-[14px] font-bold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 hover:border-emerald-600/50 mono tracking-wide"
            >
              ⚡ LAUNCH TERMINAL
            </Link>
          )}

          {/* Mobile hamburger - 44x44px minimum touch target for iOS & Android */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-slate-700 hover:text-slate-950 rounded-xl active:bg-slate-100 touch-manipulation cursor-pointer"
            onClick={() => setMenuOpen(v => !v)}
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

      {/* ── Seamless Horizontal Micro Ticker Ribbon Loop (Synchronized with Market Toggle) ── */}
      <TickerTape market={market} />

      {/* ── Mobile Menu with iOS Safe Area Handling ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-3 pb-6 safe-bottom flex flex-col gap-2 shadow-xl max-h-[calc(100dvh-5.5rem)] overflow-y-auto">
          {/* Mobile Theme Selector Bar */}
          <div className="py-2 border-b border-slate-200/80 mb-1">
            <span className="text-[11px] font-mono uppercase font-bold tracking-wider opacity-70 block mb-1.5">
              🎨 Candidate Theme
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.values(THEMES) as typeof currentThemeConfig[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[12px] font-mono font-bold transition-all text-left ${
                    theme === t.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-200/70 hover:bg-slate-100/50'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.palette.accent }}
                  />
                  <span className="truncate">{t.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
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
                pathname === href
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                  : 'text-black hover:text-black hover:bg-slate-50 active:bg-slate-100'
              }`}
            >
              {label}
            </Link>
          ))}
          {!isTerminalOrDashboard && (
            <Link
              href="/terminal"
              onClick={() => setMenuOpen(false)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-3 text-[15px] font-bold text-emerald-700 mono min-h-[44px] active:bg-emerald-100"
            >
              ⚡ LAUNCH TERMINAL
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
