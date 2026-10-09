import Link from 'next/link';
import Image from 'next/image';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';

export function Footer() {
  return (
    <footer className="border-t footer-panel mt-auto">
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Column */}
          <div className="md:col-span-1 flex flex-col gap-3">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 flex items-center justify-center overflow-visible">
                <Falcon3DLogo
                  src="/images/logo-falcon-transparent.png"
                  alt="Market Intelligence MI- 007"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  popoutScale={1.08}
                />
              </div>
              <div>
                <div className="leading-none">
                  <span className="font-extrabold text-[16px] uppercase font-sans tracking-tight footer-brand-title text-white whitespace-nowrap">
                    MARKET INTELLIGENCE MI- 007
                  </span>
                </div>

                <div className="text-[11px] tracking-[0.18em] uppercase font-extrabold font-mono mt-1 footer-brand-subtitle text-slate-200 whitespace-nowrap">
                  <span>Intelligence Beyond the Noise</span>
                </div>

                <div className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider mono mt-1">
                  <span>A Synthetix Analytics Product</span>
                </div>
              </div>
            </div>

            {/* Market Regional Chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="footer-chip rounded-md px-2.5 py-1 text-[11px] font-bold font-mono tracking-wide shadow-2xs border text-white">
                🇺🇸 NYSE/NASDAQ
              </span>
              <span className="footer-chip rounded-md px-2.5 py-1 text-[11px] font-bold font-mono tracking-wide shadow-2xs border text-white">
                🇮🇳 NSE/BSE (HQ)
              </span>
              <span className="footer-chip rounded-md px-2.5 py-1 text-[11px] font-bold font-mono tracking-wide shadow-2xs border text-white">
                🇦🇪 DFM/ADX
              </span>
            </div>
          </div>

          {/* Platform Column */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white">
              Platform
            </h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/" className="text-[15px] font-semibold footer-link text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-[15px] font-semibold footer-link text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-[15px] font-semibold footer-link text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Coverage Column */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white">
              Coverage
            </h4>
            <ul className="flex flex-col gap-2 text-[15px] font-semibold footer-list text-white">
              <li>
                <span>🇺🇸 S&P 500 · NASDAQ 100 · DOW JONES</span>
              </li>
              <li>
                <span>🇮🇳 NIFTY 50 · BANKNIFTY · SENSEX</span>
              </li>
              <li>
                <span>🇦🇪 DFMGI · ADXGI · FTSE ADX 15</span>
              </li>
              <li className="flex items-center gap-2">
                <span>🇪🇺 DAX · FTSE 100 · CAC 40</span>
                <span className="footer-coming-soon text-[10px] mono font-bold px-1.5 py-0.5 rounded">
                  COMING SOON
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span>🇦🇺 ASX 200 · SPI 200</span>
                <span className="footer-coming-soon text-[10px] mono font-bold px-1.5 py-0.5 rounded">
                  COMING SOON
                </span>
              </li>
            </ul>
          </div>

          {/* Legal / Compliance Column */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white">
              Legal
            </h4>
            <ul className="flex flex-col gap-2 text-[15px] font-semibold leading-relaxed footer-list text-white">
              <li>
                <span>For informational purposes only.</span>
              </li>
              <li>
                <span>Not financial or investment advice.</span>
              </li>
              <li>
                <span>Market data may be delayed.</span>
              </li>
              <li>
                <span>Trade responsibly.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="h-[1px] w-full border-t border-white/20 mt-8 mb-4" />
        <div className="text-[13px] font-semibold text-center sm:text-left footer-copy text-slate-300 flex items-center justify-between flex-wrap gap-2">
          <span>© 2026 Synthetix Analytics</span>
        </div>
      </div>
    </footer>
  );
}
