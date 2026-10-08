import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t footer-panel mt-auto">
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1 flex flex-col gap-3">
            <div className="flex items-center gap-3.5">
              <div className="h-14 w-14 rounded-2xl border border-sky-300/80 overflow-hidden shadow-md shadow-sky-500/15 flex-shrink-0 flex items-center justify-center">
                <Image
                  src="/images/logo-falcon-gradient.png"
                  alt="Market Intelligence - 007"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="leading-none">
                  <span className="font-extrabold text-[16px] uppercase font-sans tracking-tight footer-brand-title text-white">
                    Market Intelligence - 007
                  </span>
                </div>
                <div className="text-[11px] tracking-[0.18em] uppercase font-extrabold font-mono mt-1 footer-brand-subtitle text-slate-200">
                  Autonomous Market Intelligence
                </div>
                <div className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider mono mt-1">
                  A Synthetix Analytics Product
                </div>
              </div>
            </div>
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

          {/* Platform */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white">Platform</h4>
            <ul className="flex flex-col gap-2">
              {[
                { href: '/', label: 'Home' },
                { href: '/about', label: 'About Us' },
                { href: '/contact', label: 'Contact' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-[15px] font-semibold footer-link text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Markets */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white">Coverage</h4>
            <ul className="flex flex-col gap-2 text-[15px] font-semibold footer-list text-white">
              <li>🇺🇸 S&P 500 · NASDAQ 100 · DOW JONES</li>
              <li>🇮🇳 NIFTY 50 · BANKNIFTY · SENSEX</li>
              <li>🇦🇪 DFMGI · ADXGI · FTSE ADX 15</li>
              <li className="flex items-center gap-2">
                <span>🇪🇺 DAX · FTSE 100 · CAC 40</span>
                <span className="footer-coming-soon text-[10px] mono font-bold px-1.5 py-0.5 rounded">COMING SOON</span>
              </li>
              <li className="flex items-center gap-2">
                <span>🇦🇺 ASX 200 · SPI 200</span>
                <span className="footer-coming-soon text-[10px] mono font-bold px-1.5 py-0.5 rounded">COMING SOON</span>
              </li>
            </ul>
          </div>

          {/* Legal / Compliance */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white">Legal</h4>
            <ul className="flex flex-col gap-2 text-[15px] font-semibold leading-relaxed footer-list text-white">
              <li>For informational purposes only.</li>
              <li>Not financial or investment advice.</li>
              <li>Market data may be delayed.</li>
              <li>Trade responsibly.</li>
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="h-[1px] w-full border-t border-white/20 mt-8 mb-4" />
        <div className="text-[13px] font-semibold text-center sm:text-left footer-copy text-slate-300">
          <span>© 2026 Synthetix Analytics</span>
        </div>
      </div>
    </footer>
  );
}
