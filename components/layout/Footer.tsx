import Link from 'next/link';
import Image from 'next/image';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';

export function Footer() {
  return (
    <footer className="border-t footer-panel mt-auto">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 py-10 sm:py-12">
        {/* Responsive Grid: Stacks cleanly on mobile, dedicated top brand banner on tablet, 12-col layout on desktop */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand Column: Spans full width on tablet (sm:col-span-2) so it NEVER squishes the links, and 4 cols on lg */}
          <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
              <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 flex-shrink-0 flex items-center justify-center overflow-visible">
                <Falcon3DLogo
                  src="/images/logo-falcon-transparent.png"
                  alt="MARKET INTELLIGENCE MI-007"
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                  popoutScale={1.1}
                />
              </div>
              <div className="min-w-0">
                <div className="leading-tight">
                  <span
                    className="font-extrabold text-[15px] sm:text-[17px] md:text-[18px] uppercase font-sans tracking-tight footer-brand-title text-white block"
                    style={{ color: '#FFFFFF' }}
                  >
                    MARKET INTELLIGENCE MI-007
                  </span>
                </div>

                <div
                  className="text-[10.5px] sm:text-[11.5px] md:text-[12px] tracking-[0.16em] uppercase font-extrabold font-mono mt-1 footer-brand-subtitle text-slate-200"
                  style={{ color: '#E2E8F0' }}
                >
                  <span>Intelligence Beyond the Noise</span>
                </div>

                <div
                  className="text-[10px] sm:text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider mono mt-1"
                  style={{ color: '#34D399' }}
                >
                  <span>A Synthetix Analytics Product</span>
                </div>
              </div>
            </div>

            {/* Market Regional Chips */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                className="footer-chip rounded-md px-2.5 py-1 text-[11px] font-bold font-mono tracking-wide shadow-2xs border text-white"
                style={{ color: '#FFFFFF' }}
              >
                🇺🇸 NYSE/NASDAQ
              </span>
              <span
                className="footer-chip rounded-md px-2.5 py-1 text-[11px] font-bold font-mono tracking-wide shadow-2xs border text-white"
                style={{ color: '#FFFFFF' }}
              >
                🇮🇳 NSE/BSE (HQ)
              </span>
              <span
                className="footer-chip rounded-md px-2.5 py-1 text-[11px] font-bold font-mono tracking-wide shadow-2xs border text-white"
                style={{ color: '#FFFFFF' }}
              >
                🇦🇪 DFM/ADX
              </span>
            </div>
          </div>

          {/* Platform Column */}
          <div className="sm:col-span-1 lg:col-span-2">
            <h4
              className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white"
              style={{ color: '#FFFFFF' }}
            >
              Platform
            </h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  href="/"
                  className="text-[14px] sm:text-[15px] font-semibold footer-link text-white transition-colors"
                  style={{ color: '#FFFFFF' }}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-[14px] sm:text-[15px] font-semibold footer-link text-white transition-colors"
                  style={{ color: '#FFFFFF' }}
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[14px] sm:text-[15px] font-semibold footer-link text-white transition-colors"
                  style={{ color: '#FFFFFF' }}
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Coverage Column */}
          <div className="sm:col-span-1 lg:col-span-3">
            <h4
              className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white"
              style={{ color: '#FFFFFF' }}
            >
              Coverage
            </h4>
            <ul className="flex flex-col gap-2 text-[14px] sm:text-[15px] font-semibold footer-list text-white">
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
                  className="footer-coming-soon text-[10px] mono font-bold px-1.5 py-0.5 rounded"
                  style={{ color: '#FBBF24' }}
                >
                  COMING SOON
                </span>
              </li>
              <li className="flex items-center gap-2 flex-wrap">
                <span style={{ color: '#F1F5F9' }}>🇦🇺 ASX 200 · SPI 200</span>
                <span
                  className="footer-coming-soon text-[10px] mono font-bold px-1.5 py-0.5 rounded"
                  style={{ color: '#FBBF24' }}
                >
                  COMING SOON
                </span>
              </li>
            </ul>
          </div>

          {/* Social Media & Contact Column */}
          <div className="sm:col-span-2 lg:col-span-3">
            <h4
              className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white"
              style={{ color: '#FFFFFF' }}
            >
              Social & Contact
            </h4>

            {/* Social Media Channels: LinkedIn, X, Facebook, Instagram */}
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[13px] font-semibold text-slate-200 hover:text-white hover:bg-[#0A66C2]/20 hover:border-[#0A66C2]/50 transition-all group"
              >
                <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-slate-200 group-hover:bg-[#0A66C2] group-hover:text-white transition-all shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.65 1.65 0 0 0 1.66-1.66 1.66 1.66 0 0 0-1.66-1.66 1.65 1.65 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66m1.4 9.74v-8.37H5.06v8.37h2.8z" />
                  </svg>
                </span>
                <span className="truncate">LinkedIn</span>
              </a>

              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[13px] font-semibold text-slate-200 hover:text-white hover:bg-white/20 hover:border-white/50 transition-all group"
              >
                <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-slate-200 group-hover:bg-white group-hover:text-black transition-all shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </span>
                <span className="truncate">X</span>
              </a>

              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[13px] font-semibold text-slate-200 hover:text-white hover:bg-[#1877F2]/20 hover:border-[#1877F2]/50 transition-all group"
              >
                <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-slate-200 group-hover:bg-[#1877F2] group-hover:text-white transition-all shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                  </svg>
                </span>
                <span className="truncate">Facebook</span>
              </a>

              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[13px] font-semibold text-slate-200 hover:text-white hover:bg-[#E4405F]/20 hover:border-[#E4405F]/50 transition-all group"
              >
                <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-slate-200 group-hover:bg-gradient-to-tr group-hover:from-[#F58529] group-hover:via-[#DD2A7B] group-hover:to-[#8134AF] group-hover:text-white transition-all shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </span>
                <span className="truncate">Instagram</span>
              </a>
            </div>

            {/* Direct Contact Channels */}
            <div className="mt-3.5 pt-3 border-t border-white/15 flex flex-col gap-1.5">
              <a
                href="mailto:care@synthetixanalytics.com"
                className="text-[12.5px] sm:text-[13px] font-semibold text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-2 group"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 6L2 7" />
                </svg>
                <span className="truncate">care@synthetixanalytics.com</span>
              </a>
              <a
                href="tel:+918838202279"
                className="text-[12.5px] sm:text-[13px] font-semibold text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-2 group"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>+91 8838202279</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="h-[1px] w-full border-t border-white/20 mt-8 mb-4" />
        <div
          className="text-[13px] font-semibold text-center sm:text-left footer-copy text-slate-300 flex items-center justify-between flex-wrap gap-2"
          style={{ color: '#CBD5E1' }}
        >
          <span>© 2026 Synthetix Analytics. All Rights Reserved.</span>
        </div>
      </div>
    </footer>
  );
}
