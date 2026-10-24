'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';

export function Footer() {
  const [brandHovered, setBrandHovered] = useState(false);

  return (
    <footer className="border-t footer-panel mt-auto">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-4 sm:py-5">
        {/* Responsive Grid: Stacks cleanly on mobile, 4 aligned columns on desktop */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12 lg:gap-7 items-start">
          {/* 1. Brand Column: Spans 5 cols on lg for logo branding & identity */}
          <div className="sm:col-span-2 lg:col-span-5 flex flex-col gap-2.5">
            <Link
              href="/"
              className="group flex items-center gap-3 sm:gap-4 flex-shrink-0 select-none min-w-0"
              onMouseEnter={() => setBrandHovered(true)}
              onMouseLeave={() => setBrandHovered(false)}
            >
              {/* Scaled Falcon Emblem Logo (84px) with 3D Pop-Up Animation */}
              <div
                className="relative z-10 flex-shrink-0 flex items-center justify-center overflow-visible"
                style={{
                  width: '87px',
                  height: '87px',
                  minWidth: '87px',
                  minHeight: '87px',
                }}
              >
                <Falcon3DLogo
                  src="/images/logo-falcon-transparent.png"
                  alt="MARKET INTELLIGENCE MI-007"
                  width={87}
                  height={87}
                  priority
                  className="w-full h-full object-contain drop-shadow-[0_4px_20px_rgba(16,185,129,0.4)]"
                  popoutScale={1.12}
                  isNavbar={false}
                  isHoveredExternal={brandHovered}
                />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <div className="leading-tight">
                  <span
                    className="font-black text-[15px] sm:text-[16px] md:text-[17px] uppercase font-sans tracking-tight footer-brand-title text-white block group-hover:text-emerald-400 transition-colors"
                    style={{ color: '#FFFFFF' }}
                  >
                    MARKET INTELLIGENCE MI-007
                  </span>
                </div>

                <div
                  className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-extrabold font-mono mt-1 footer-brand-subtitle text-slate-300"
                  style={{ color: '#CBD5E1' }}
                >
                  <span>Intelligence Beyond the Noise</span>
                </div>

                <div
                  className="text-[9.5px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-wider mono mt-1"
                  style={{ color: '#34D399' }}
                >
                  <span>A Synthetix Analytics Product</span>
                </div>
              </div>
            </Link>

            {/* Market Regional Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span
                className="footer-chip rounded-md px-2 py-0.5 text-[10px] font-bold font-mono tracking-wide shadow-2xs border text-white"
                style={{ color: '#FFFFFF' }}
              >
                🇺🇸 NYSE/NASDAQ
              </span>
              <span
                className="footer-chip rounded-md px-2 py-0.5 text-[10px] font-bold font-mono tracking-wide shadow-2xs border text-white"
                style={{ color: '#FFFFFF' }}
              >
                🇮🇳 NSE/BSE (HQ)
              </span>
              <span
                className="footer-chip rounded-md px-2 py-0.5 text-[10px] font-bold font-mono tracking-wide shadow-2xs border text-white"
                style={{ color: '#FFFFFF' }}
              >
                🇦🇪 DFM/ADX
              </span>
            </div>
          </div>

          {/* 2. Platform Column */}
          <div className="sm:col-span-1 lg:col-span-2 flex flex-col">
            <h4
              className="text-[12.5px] font-black tracking-widest uppercase mb-2 footer-heading text-white"
              style={{ color: '#FFFFFF' }}
            >
              Platform
            </h4>
            <ul className="flex flex-col gap-1.5">
              <li>
                <Link
                  href="/"
                  className="text-[13px] sm:text-[13.5px] font-semibold footer-link text-white transition-colors"
                  style={{ color: '#FFFFFF' }}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-[13px] sm:text-[13.5px] font-semibold footer-link text-white transition-colors"
                  style={{ color: '#FFFFFF' }}
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[13px] sm:text-[13.5px] font-semibold footer-link text-white transition-colors"
                  style={{ color: '#FFFFFF' }}
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. Coverage Column */}
          <div className="sm:col-span-1 lg:col-span-3 flex flex-col">
            <h4
              className="text-[12.5px] font-black tracking-widest uppercase mb-2 footer-heading text-white"
              style={{ color: '#FFFFFF' }}
            >
              Coverage
            </h4>
            <ul className="flex flex-col gap-1.5 text-[12.5px] sm:text-[13px] font-semibold footer-list text-white">
              <li>
                <span style={{ color: '#F1F5F9' }}>🇺🇸 S&P 500 · NASDAQ 100 · DOW JONES</span>
              </li>
              <li>
                <span style={{ color: '#F1F5F9' }}>🇮🇳 NIFTY 50 · BANKNIFTY · SENSEX</span>
              </li>
              <li>
                <span style={{ color: '#F1F5F9' }}>🇦🇪 DFMGI · ADXGI · FTSE ADX 15</span>
              </li>
              <li className="flex items-center gap-2 flex-wrap">
                <span style={{ color: '#F1F5F9' }}>🇪🇺 DAX · FTSE 100 · CAC 40</span>
                <span
                  className="footer-coming-soon text-[9.5px] mono font-bold px-1.5 py-0.2 rounded"
                  style={{ color: '#FBBF24' }}
                >
                  COMING SOON
                </span>
              </li>
              <li className="flex items-center gap-2 flex-wrap">
                <span style={{ color: '#F1F5F9' }}>🇦🇺 ASX 200 · SPI 200</span>
                <span
                  className="footer-coming-soon text-[9.5px] mono font-bold px-1.5 py-0.2 rounded"
                  style={{ color: '#FBBF24' }}
                >
                  COMING SOON
                </span>
              </li>
            </ul>
          </div>

          {/* 4. Connect / Socials Column */}
          <div className="sm:col-span-2 lg:col-span-2 flex flex-col sm:items-start lg:items-end">
            <h4
              className="text-[12.5px] font-black tracking-widest uppercase mb-2 footer-heading text-white"
              style={{ color: '#FFFFFF' }}
            >
              Connect
            </h4>
            <div className="flex items-center gap-2">
              {/* 1. LinkedIn */}
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                title="LinkedIn"
                aria-label="LinkedIn"
                className="w-8.5 h-8.5 rounded-lg bg-white/[0.06] hover:bg-[#0A66C2] text-slate-300 hover:text-white border border-white/10 hover:border-transparent flex items-center justify-center transition-all duration-200 cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.65 1.65 0 0 0 1.66-1.66 1.66 1.66 0 0 0-1.66-1.66 1.65 1.65 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66m1.4 9.74v-8.37H5.06v8.37h2.8z" />
                </svg>
              </a>

              {/* 2. X (Twitter) */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                title="X"
                aria-label="X"
                className="w-8.5 h-8.5 rounded-lg bg-white/[0.06] hover:bg-white text-slate-300 hover:text-black border border-white/10 hover:border-transparent flex items-center justify-center transition-all duration-200 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* 3. Facebook */}
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Facebook"
                aria-label="Facebook"
                className="w-8.5 h-8.5 rounded-lg bg-white/[0.06] hover:bg-[#1877F2] text-slate-300 hover:text-white border border-white/10 hover:border-transparent flex items-center justify-center transition-all duration-200 cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
              </a>

              {/* 4. Instagram */}
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
                aria-label="Instagram"
                className="w-8.5 h-8.5 rounded-lg bg-white/[0.06] hover:bg-gradient-to-tr hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] text-slate-300 hover:text-white border border-white/10 hover:border-transparent flex items-center justify-center transition-all duration-200 cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Regulatory & Risk Disclosure */}
        <div className="h-[1px] w-full border-t border-white/15 mt-3 mb-2" />
        <p className="text-[10.5px] leading-relaxed text-slate-400 mb-2">
          <strong className="text-slate-300">Regulatory &amp; Derivatives Risk Disclosure:</strong> Market Intelligence MI-007 is an analytical and educational market intelligence platform and is not a SEBI-registered investment adviser or research analyst. Per SEBI study disclosures, 9 out of 10 individual traders in equity Futures and Options Segment incurred net losses. Nothing on this platform constitutes personalized investment, legal, or tax advice.
        </p>
        <div
          className="text-[12px] font-semibold text-center sm:text-left footer-copy text-slate-300 flex items-center justify-between flex-wrap gap-2"
          style={{ color: '#CBD5E1' }}
        >
          <span>© 2026 Synthetix Analytics. All Rights Reserved.</span>
          <span className="text-[11px] font-mono opacity-80">MI-007 Platform v2.4</span>
        </div>
      </div>
    </footer>
  );
}
