'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MarketToggle } from '@/components/market/MarketToggle';
import { TickerTape } from '@/components/market/TickerTape';
import { MarketType } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';

interface NavbarProps {
  market?: MarketType;
  onMarketChange?: (m: MarketType) => void;
}

const NAV_LINKS = [
  { href: '/',          label: 'Home' },
  { href: '/terminal',  label: 'Terminal' },
  { href: '/about',     label: 'About' },
  { href: '/contact',   label: 'Contact' },
];

export function Navbar({ market: propMarket, onMarketChange: propOnMarketChange }: NavbarProps) {
  const pathname = usePathname();
  const context = useMarket();
  const market = propMarket ?? context.market ?? 'INDIA';
  const isTerminalOrDashboard = pathname.startsWith('/terminal') || pathname.startsWith('/dashboard');

  const handleMarketChange = (m: MarketType) => {
    if (propOnMarketChange) {
      propOnMarketChange(m);
    }
    context.setMarket(m);
  };

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        {/* ── Logo with Luxury Gold Crest Background Badge (Larger size) ── */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 select-none group min-w-0">
          <div className="relative h-11 w-11 sm:h-13 sm:w-13 md:h-14 md:w-14 flex-shrink-0 flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/80 border-2 border-amber-400 shadow-[0_4px_16px_rgba(217,119,6,0.22)] p-1 group-hover:border-amber-500 group-hover:scale-105 transition-all">
            <Image
              src="/images/logo-falcon-transparent.png"
              alt="Market Intelligence AI — MI007"
              width={52}
              height={52}
              className="object-contain drop-shadow-[0_2px_8px_rgba(180,83,9,0.3)]"
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

        {/* ── Market Toggle + CTA ── */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isTerminalOrDashboard && (
            <MarketToggle
              selected={market}
              onChange={handleMarketChange}
              className="hidden sm:flex"
            />
          )}
          <Link
            href="/terminal"
            className="hidden sm:flex items-center gap-1.5 rounded-md border border-emerald-600/30 bg-emerald-50 px-3.5 py-1.5 text-[14px] font-bold text-emerald-700 transition-all duration-200 hover:bg-emerald-100 hover:border-emerald-600/50 mono tracking-wide"
          >
            ⚡ LAUNCH TERMINAL
          </Link>

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
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl px-4 py-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] flex flex-col gap-2 shadow-xl max-h-[calc(100dvh-5.5rem)] overflow-y-auto">
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
          <Link
            href="/terminal"
            onClick={() => setMenuOpen(false)}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-50 px-3.5 py-3 text-[15px] font-bold text-emerald-700 mono min-h-[44px] active:bg-emerald-100"
          >
            ⚡ LAUNCH TERMINAL
          </Link>
        </div>
      )}
    </header>
  );
}
