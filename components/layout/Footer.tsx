import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/70 mt-auto">
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1 flex flex-col gap-3">
            <div className="flex items-center gap-3.5">
              <div className="h-14 w-14 rounded-2xl border border-amber-400 bg-gradient-to-b from-amber-50 via-amber-100/90 to-amber-200/80 flex items-center justify-center p-1.5 shadow-md shadow-amber-500/15 flex-shrink-0">
                <Image
                  src="/images/logo-falcon-transparent.png"
                  alt="Market Intelligence AI — MI007"
                  width={46}
                  height={46}
                  className="object-contain drop-shadow-[0_2px_8px_rgba(180,83,9,0.3)]"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 leading-none">
                  <span className="font-extrabold text-[16px] text-slate-950 uppercase font-sans">
                    Market Intelligence <span className="text-emerald-600 font-black">AI</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] mono font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border border-amber-400/80">
                    MI007
                  </span>
                </div>
                <div className="text-[11px] tracking-[0.18em] text-slate-700 uppercase font-extrabold font-mono mt-1">
                  Autonomous Market Intelligence
                </div>
                <div className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider mono mt-1">
                  A Synthetix Analytics Product
                </div>
              </div>
            </div>
            <p className="text-[14px] text-black font-medium leading-relaxed">
              Institutional-grade quantitative analytics across US, Indian, and Gulf financial markets.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="rounded-sm border border-slate-300 bg-white px-2 py-0.5 text-[12px] text-black font-bold font-mono tracking-wide shadow-xs">🇺🇸 NYSE/NASDAQ</span>
              <span className="rounded-sm border border-slate-300 bg-white px-2 py-0.5 text-[12px] text-black font-bold font-mono tracking-wide shadow-xs">🇮🇳 NSE/BSE (HQ)</span>
              <span className="rounded-sm border border-slate-300 bg-white px-2 py-0.5 text-[12px] text-black font-bold font-mono tracking-wide shadow-xs">🇦🇪 DFM/ADX</span>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest text-black uppercase mb-3">Platform</h4>
            <ul className="flex flex-col gap-2">
              {[
                { href: '/', label: 'Home' },
                { href: '/about', label: 'About Us' },
                { href: '/contact', label: 'Contact' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-[15px] text-black font-semibold hover:text-emerald-700 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Markets */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest text-black uppercase mb-3">Coverage</h4>
            <ul className="flex flex-col gap-2 text-[15px] text-black font-medium">
              <li>🇮🇳 NIFTY 50 · BANKNIFTY · SENSEX</li>
              <li>🇦🇪 DFMGI · ADXGI · FTSE ADX 15</li>
            </ul>
          </div>

          {/* Legal / Compliance */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest text-black uppercase mb-3">Legal</h4>
            <ul className="flex flex-col gap-2 text-[15px] text-black font-medium leading-relaxed">
              <li>For informational purposes only.</li>
              <li>Not financial or investment advice.</li>
              <li>Market data may be delayed.</li>
              <li>Trade responsibly.</li>
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="h-[1px] w-full bg-slate-200 mt-8 mb-4" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[13px] text-black font-semibold">
          <span>© 2026 Synthetix Analytics · Market Intelligence AI (MI007). Chennai — HQ.</span>
          <div className="flex items-center gap-1 mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>System Operational · Multi-Region Infrastructure</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
