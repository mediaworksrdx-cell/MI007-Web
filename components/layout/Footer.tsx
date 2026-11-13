'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';

export function Footer() {
  const [brandHovered, setBrandHovered] = useState(false);

  return (
    <footer className="border-t footer-panel mt-auto">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-6 sm:py-8">
        {/* Responsive Grid: Stacks cleanly on mobile, 2 cols on tablet, 12 cols on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-start">
          {/* 1. Brand Column: Spans 5 cols on lg for logo branding & identity */}
          <div className="sm:col-span-2 lg:col-span-5 flex flex-col gap-3">
            <Link
              href="/"
              className="group flex items-center gap-3.5 flex-shrink-0 select-none min-w-0"
              onMouseEnter={() => setBrandHovered(true)}
              onMouseLeave={() => setBrandHovered(false)}
            >
              {/* Scaled Falcon Emblem Logo with 3D Pop-Up Animation */}
              <div
                className="relative z-10 flex-shrink-0 flex items-center justify-center overflow-visible"
                style={{
                  width: '72px',
                  height: '72px',
                  minWidth: '72px',
                  minHeight: '72px',
                }}
              >
                <Falcon3DLogo
                  src="/images/logo-falcon-transparent.png"
                  alt="MARKET INTELLIGENCE MI-007"
                  width={72}
                  height={72}
                  priority
                  className="w-full h-full object-contain drop-shadow-[0_4px_20px_rgba(16,185,129,0.35)]"
                  popoutScale={1.12}
                  isNavbar={false}
                  isHoveredExternal={brandHovered}
                />
              </div>
              <div className="min-w-0 flex flex-col justify-center">
                <div className="leading-tight">
                  <span
                    className="text-[17px] sm:text-[18px] md:text-[20px] font-bold font-caveat footer-brand-title text-white whitespace-nowrap flex items-center gap-1.5 group-hover:text-emerald-400 transition-colors"
                    style={{ color: '#FFFFFF' }}
                  >
                    <span className="text-white font-caveat">Market Intelligence</span>
                    <span className="brand-accent-green font-caveat">MI-007</span>
                  </span>
                </div>

                <div
                  className="text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-extrabold font-mono mt-0.5 footer-brand-subtitle text-slate-300"
                  style={{ color: '#CBD5E1' }}
                >
                  <span>Intelligence Beyond the Noise</span>
                </div>

                <div
                  className="text-[9.5px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-wider mono mt-0.5"
                  style={{ color: '#34D399' }}
                >
                  <span>A Synthetix Analytics Product</span>
                </div>
              </div>
            </Link>

            <p className="text-[11.5px] sm:text-[12px] text-slate-400 max-w-md leading-relaxed">
              Institutional quantitative telemetry, options microstructure analytics, and algorithmic execution intelligence across Indian, US, and Middle Eastern financial markets.
            </p>

            {/* Market Regional Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className="footer-chip rounded-md px-2.5 py-1 text-[10px] font-bold font-mono tracking-wide shadow-2xs border text-white flex items-center gap-1.5"
                style={{ color: '#FFFFFF' }}
              >
                <span>🇮🇳</span>
                <span>NSE / BSE (Primary HQ)</span>
              </span>
              <span
                className="footer-chip rounded-md px-2.5 py-1 text-[10px] font-bold font-mono tracking-wide shadow-2xs border text-white flex items-center gap-1.5"
                style={{ color: '#FFFFFF' }}
              >
                <span>🇺🇸</span>
                <span>NYSE / NASDAQ</span>
              </span>
              <span
                className="footer-chip rounded-md px-2.5 py-1 text-[10px] font-bold font-mono tracking-wide shadow-2xs border text-white flex items-center gap-1.5"
                style={{ color: '#FFFFFF' }}
              >
                <span>🇦🇪</span>
                <span>DFM / ADX</span>
              </span>
            </div>
          </div>

          {/* 2. Platform & Derivatives Intelligence (Spans 3 cols on lg) */}
          <div className="sm:col-span-1 lg:col-span-3 flex flex-col">
            <h4
              className="text-[12px] font-black tracking-widest uppercase mb-3 footer-heading text-white"
              style={{ color: '#FFFFFF' }}
            >
              Platform &amp; Terminal
            </h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  href="/terminal"
                  className="text-[12.5px] sm:text-[13px] font-semibold footer-link text-white/90 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Dashboard (Fingen IQ)</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terminal/fno"
                  className="text-[12.5px] sm:text-[13px] font-semibold footer-link text-white/90 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>⛓️</span>
                  <span>F&amp;O Intelligence Terminal</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/chart/NIFTY"
                  className="text-[12.5px] sm:text-[13px] font-semibold footer-link text-white/90 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>📊</span>
                  <span>Interactive Charts &amp; SMC</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/terminal/screener"
                  className="text-[12.5px] sm:text-[13px] font-semibold footer-link text-white/90 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>📡</span>
                  <span>Institutional Stock Screener</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/academy"
                  className="text-[12.5px] sm:text-[13px] font-semibold footer-link text-white/90 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>🧠</span>
                  <span>Aarka AI &amp; Academy</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. Resources & Platform (Spans 2 cols on lg) */}
          <div className="sm:col-span-1 lg:col-span-2 flex flex-col">
            <h4
              className="text-[12px] font-black tracking-widest uppercase mb-3 footer-heading text-white"
              style={{ color: '#FFFFFF' }}
            >
              Resources
            </h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  href="/calendar"
                  className="text-[12.5px] sm:text-[13px] font-semibold footer-link text-white/90 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>📅</span>
                  <span>Economic Calendar</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/news"
                  className="text-[12.5px] sm:text-[13px] font-semibold footer-link text-white/90 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>📰</span>
                  <span>Global Market News</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-[12.5px] sm:text-[13px] font-semibold footer-link text-white/90 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>ℹ️</span>
                  <span>About Us</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[12.5px] sm:text-[13px] font-semibold footer-link text-white/90 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span>✉️</span>
                  <span>Contact Desk</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. Connect / Socials Column (Spans 2 cols on lg) */}
          <div className="sm:col-span-2 lg:col-span-2 flex flex-col sm:items-start lg:items-end">
            <h4
              className="text-[12px] font-black tracking-widest uppercase mb-3 footer-heading text-white"
              style={{ color: '#FFFFFF' }}
            >
              Connect
            </h4>
            <div className="flex items-center gap-2.5">
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                title="LinkedIn"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-[#0A66C2] text-slate-300 hover:text-white border border-white/10 hover:border-transparent flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.65 1.65 0 0 0 1.66-1.66 1.66 1.66 0 0 0-1.66-1.66 1.65 1.65 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66m1.4 9.74v-8.37H5.06v8.37h2.8z" />
                </svg>
              </a>

              {/* X (Twitter) */}
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                title="X"
                aria-label="X"
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white text-slate-300 hover:text-black border border-white/10 hover:border-transparent flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/mediaworksrdx-cell/MI007-Web"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub Repository"
                aria-label="GitHub"
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 hover:border-transparent flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </div>

            <div className="mt-3 text-[11px] mono text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Telemetry Active</span>
            </div>
          </div>
        </div>

        {/* Regulatory & Risk Disclosure */}
        <div className="h-[1px] w-full border-t border-white/10 mt-6 mb-4" />
        <p className="text-[10px] sm:text-[10.5px] leading-relaxed text-slate-400 mb-3">
          <strong className="text-slate-300">Regulatory &amp; Risk Disclosure:</strong> Market Intelligence MI-007 is an analytical and quantitative telemetry platform and is not a SEBI-registered investment adviser or broker-dealer. Financial derivatives (Futures &amp; Options) involve substantial risk of capital loss. Per SEBI disclosures, 9 out of 10 individual traders in equity F&amp;O incur net losses. Content provided is strictly for educational and market research purposes and does not constitute personalized investment advice.
        </p>

        {/* Bottom Bar: Responsive Stacking */}
        <div
          className="text-[11.5px] sm:text-[12px] font-semibold text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-white/5"
          style={{ color: '#CBD5E1' }}
        >
          <span>© 2026 Synthetix Analytics. All Rights Reserved.</span>
          <div className="flex items-center gap-3 text-[10.5px] font-mono">
            <span className="text-emerald-400">● Systems Nominal</span>
            <span className="opacity-60">·</span>
            <span className="opacity-80">MI-007 v2.5 Institutional</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
