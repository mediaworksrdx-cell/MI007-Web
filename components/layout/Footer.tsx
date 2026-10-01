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
              <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 shadow-md flex-shrink-0">
                <Image
                  src="/images/logo-falcon-transparent.png"
                  alt="Market Intelligence AI — MI007"
                  width={46}
                  height={46}
                  className="object-contain drop-shadow-[0_0_8px_rgba(0,255,136,0.25)]"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 leading-none">
                  <span className="font-extrabold text-[16px] text-slate-950 uppercase font-sans">
                    Market Intelligence <span className="text-emerald-600 font-black">AI</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10.5px] mono font-black bg-slate-950 text-amber-400 border border-amber-500/30">
                    MI007
                  </span>
                </div>
                <div className="text-[11px] tracking-[0.18em] text-slate-700 uppercase font-extrabold font-mono mt-1">
                  Autonomous Market Intelligence
                </div>
              </div>
            </div>
            <p className="text-[14px] text-black font-medium leading-relaxed">
              Institutional-grade quantitative analytics across Indian and Gulf financial markets by Synthetix Analytics.
            </p>
            <div className="flex gap-2 mt-1">
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
                { href: '/terminal', label: 'Terminal' },
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
