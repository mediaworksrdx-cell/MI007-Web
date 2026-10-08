import Link from 'next/link';
import Image from 'next/image';
import { ExplainerTooltip } from '@/components/ui/ExplainerTooltip';

export function Footer() {
  return (
    <footer className="border-t footer-panel mt-auto">
      <div className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Column */}
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
                  <ExplainerTooltip
                    title="Market Intelligence - 007"
                    description="Institutional quantitative financial intelligence engine providing real-time microstructure analytics, order flow detection, and multi-market algorithmic telemetry."
                    badge="SYSTEM"
                    position="top"
                    underline
                  >
                    <span className="font-extrabold text-[16px] uppercase font-sans tracking-tight footer-brand-title text-white">
                      Market Intelligence - 007
                    </span>
                  </ExplainerTooltip>
                </div>

                <div className="text-[11px] tracking-[0.18em] uppercase font-extrabold font-mono mt-1 footer-brand-subtitle text-slate-200">
                  <ExplainerTooltip
                    title="Autonomous Engine"
                    description="Continuous algorithmic ingestion analyzing Level-3 order books, liquidity sweeps, and price equilibrium without human emotional bias."
                    badge="AI ENGINE"
                    position="top"
                    underline
                  >
                    <span>Autonomous Market Intelligence</span>
                  </ExplainerTooltip>
                </div>

                <div className="text-[10.5px] font-bold text-emerald-400 uppercase tracking-wider mono mt-1">
                  <ExplainerTooltip
                    title="Synthetix Analytics Research"
                    description="Global institutional quantitative engineering laboratory and microstructure financial computing division."
                    badge="LABS"
                    position="top"
                    underline
                  >
                    <span>A Synthetix Analytics Product</span>
                  </ExplainerTooltip>
                </div>
              </div>
            </div>

            {/* Market Regional Chips with Explanations */}
            <div className="flex flex-wrap gap-2 mt-2">
              <ExplainerTooltip
                title="United States Exchanges"
                description="Primary continuous auction liquidity venues covering continuous trading sessions for S&P 500, Nasdaq 100, and US equity derivatives."
                badge="US MARKET"
                position="top"
              >
                <span className="footer-chip rounded-md px-2.5 py-1 text-[11px] font-bold font-mono tracking-wide shadow-2xs border text-white">
                  🇺🇸 NYSE/NASDAQ
                </span>
              </ExplainerTooltip>

              <ExplainerTooltip
                title="India Exchanges (Global HQ)"
                description="National Stock Exchange & Bombay Stock Exchange — Global headquarters desk tracking Nifty 50, Bank Nifty, and index derivatives."
                badge="HQ DESK"
                position="top"
              >
                <span className="footer-chip rounded-md px-2.5 py-1 text-[11px] font-bold font-mono tracking-wide shadow-2xs border text-white">
                  🇮🇳 NSE/BSE (HQ)
                </span>
              </ExplainerTooltip>

              <ExplainerTooltip
                title="UAE Capital Corridor"
                description="Dubai Financial Market and Abu Dhabi Securities Exchange — Tracking Gulf sovereign capital, real estate, energy, and banking flows."
                badge="GULF CORRIDOR"
                position="top"
              >
                <span className="footer-chip rounded-md px-2.5 py-1 text-[11px] font-bold font-mono tracking-wide shadow-2xs border text-white">
                  🇦🇪 DFM/ADX
                </span>
              </ExplainerTooltip>
            </div>
          </div>

          {/* Platform Column */}
          <div>
            <h4 className="text-[14px] font-black tracking-widest uppercase mb-3 footer-heading text-white">
              Platform
            </h4>
            <ul className="flex flex-col gap-2">
              <li>
                <ExplainerTooltip
                  title="Terminal Gateway"
                  description="Return to the cinematic clash theater, real-time momentum telemetry, and multi-market index summary."
                  badge="NAV"
                  position="right"
                  underline
                >
                  <Link href="/" className="text-[15px] font-semibold footer-link text-white transition-colors">
                    Home
                  </Link>
                </ExplainerTooltip>
              </li>
              <li>
                <ExplainerTooltip
                  title="Institutional Mission"
                  description="Read our engineering origins, mathematical philosophy, leadership principles, and regulatory boundaries."
                  badge="NAV"
                  position="right"
                  underline
                >
                  <Link href="/about" className="text-[15px] font-semibold footer-link text-white transition-colors">
                    About Us
                  </Link>
                </ExplainerTooltip>
              </li>
              <li>
                <ExplainerTooltip
                  title="Direct Desk Inquiries"
                  description="Direct channel for institutional licensing, custom API connections, enterprise deployments, and support."
                  badge="NAV"
                  position="right"
                  underline
                >
                  <Link href="/contact" className="text-[15px] font-semibold footer-link text-white transition-colors">
                    Contact
                  </Link>
                </ExplainerTooltip>
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
                <ExplainerTooltip
                  title="US Benchmark Suite"
                  description="Live ingestion tape covering 500 mega-cap equities, semiconductor order-flow delta, and industrial capital velocity."
                  badge="US EQUITIES"
                  position="top"
                  underline
                >
                  <span>🇺🇸 S&P 500 · NASDAQ 100 · DOW JONES</span>
                </ExplainerTooltip>
              </li>
              <li>
                <ExplainerTooltip
                  title="India Benchmark Suite"
                  description="Live tracking of top 50 blue-chips, major banking liquidity, and options open interest delta."
                  badge="INDIA EQUITIES"
                  position="top"
                  underline
                >
                  <span>🇮🇳 NIFTY 50 · BANKNIFTY · SENSEX</span>
                </ExplainerTooltip>
              </li>
              <li>
                <ExplainerTooltip
                  title="UAE Benchmark Suite"
                  description="Real-time coverage of the UAE sovereign index and top 15 liquid listings across banking, energy, and real estate."
                  badge="GULF EQUITIES"
                  position="top"
                  underline
                >
                  <span>🇦🇪 DFMGI · ADXGI · FTSE ADX 15</span>
                </ExplainerTooltip>
              </li>
              <li className="flex items-center gap-2">
                <ExplainerTooltip
                  title="European Benchmark Pipeline"
                  description="Frankfurt DAX, London FTSE 100, and Paris CAC 40 benchmarks. Ingestion models currently in final sandbox testing."
                  badge="COMING SOON"
                  position="top"
                  underline
                >
                  <span>🇪🇺 DAX · FTSE 100 · CAC 40</span>
                </ExplainerTooltip>
                <span className="footer-coming-soon text-[10px] mono font-bold px-1.5 py-0.5 rounded">
                  COMING SOON
                </span>
              </li>
              <li className="flex items-center gap-2">
                <ExplainerTooltip
                  title="Asia-Pacific Benchmark Pipeline"
                  description="Australian Securities Exchange 200 and overnight SPI futures. APAC market opening integration currently under development."
                  badge="COMING SOON"
                  position="top"
                  underline
                >
                  <span>🇦🇺 ASX 200 · SPI 200</span>
                </ExplainerTooltip>
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
                <ExplainerTooltip
                  title="Study & Research Purpose"
                  description="All telemetry, indicators, and algorithms are engineered solely for mathematical study, education, and market structure analysis."
                  badge="PURPOSE"
                  position="left"
                  underline
                >
                  <span>For informational purposes only.</span>
                </ExplainerTooltip>
              </li>
              <li>
                <ExplainerTooltip
                  title="No Fiduciary Advisory"
                  description="MI007 does not provide regulated broker, financial advisory, or security recommendation services. Always consult licensed professionals."
                  badge="ADVISORY"
                  position="left"
                  underline
                >
                  <span>Not financial or investment advice.</span>
                </ExplainerTooltip>
              </li>
              <li>
                <ExplainerTooltip
                  title="Exchange Data Latency"
                  description="Public exchange feeds may carry standard 15-20 min latency. Direct sub-millisecond execution is reserved for connected desks."
                  badge="LATENCY"
                  position="left"
                  underline
                >
                  <span>Market data may be delayed.</span>
                </ExplainerTooltip>
              </li>
              <li>
                <ExplainerTooltip
                  title="Capital Risk Warning"
                  description="Trading derivatives, options, and leveraged instruments involves significant mathematical risk of partial or total capital loss."
                  badge="RISK"
                  position="left"
                  underline
                >
                  <span>Trade responsibly.</span>
                </ExplainerTooltip>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="h-[1px] w-full border-t border-white/20 mt-8 mb-4" />
        <div className="text-[13px] font-semibold text-center sm:text-left footer-copy text-slate-300 flex items-center justify-between flex-wrap gap-2">
          <ExplainerTooltip
            title="Synthetix Analytics IP"
            description="All proprietary algorithms, visualization architectures, and telemetry trademarks are protected by international copyright laws."
            badge="INTELLECTUAL PROPERTY"
            position="top"
            underline
          >
            <span>© 2026 Synthetix Analytics</span>
          </ExplainerTooltip>
          <span className="text-[11px] font-mono text-slate-400">
            Hover cursor over any item for institutional documentation
          </span>
        </div>
      </div>
    </footer>
  );
}
