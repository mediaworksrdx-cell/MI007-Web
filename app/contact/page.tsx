'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MarketType, MARKETS } from '@/lib/types';
import { useMarket } from '@/lib/marketContext';

const DESKS = [
  {
    flag: '🇮🇳',
    city: 'Mumbai',
    address: 'Bandra-Kurla Complex (BKC), Mumbai, Maharashtra 400051',
    zone: 'IST (UTC+5:30)',
    hours: 'Mon–Fri: 09:00–16:30 IST',
    focus: 'NSE/BSE Equities · Nifty F&O · Currency Derivatives',
    color: '#FF9800',
  },
  {
    flag: '🇺🇸',
    city: 'New York',
    address: 'One World Trade Center, New York, NY 10007',
    zone: 'EST (UTC-5)',
    hours: 'Mon–Fri: 09:30–16:00 EST',
    focus: 'S&P 500 · NASDAQ · US Equities · Options',
    color: '#00B0FF',
  },
  {
    flag: '🇦🇪',
    city: 'Dubai',
    address: 'Dubai International Financial Centre (DIFC), Dubai, UAE',
    zone: 'GST (UTC+4)',
    hours: 'Mon–Fri: 10:00–14:00 GST',
    focus: 'DFM · ADX · MENA Equities · Gulf Markets',
    color: '#00E676',
  },
];

export default function ContactPage() {
  const { market, setMarket } = useMarket();

  const [form, setForm] = useState({
    name: '', email: '', org: '', marketFocus: 'INDIA', message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <Navbar market={market} onMarketChange={setMarket} />

      <main className="min-h-screen pt-[88px] relative z-10 bg-transparent pb-16">
        {/* ── Hero ── */}
        <section className="border-b border-slate-200 bg-slate-50/70 py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-50 px-4 py-1.5 shadow-xs">
              <span className="mono text-[11px] font-bold tracking-widest text-cyan-800 uppercase">Institutional Inquiries</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              Contact <span className="text-emerald-700">Market Intelligence AI — MI007</span>
            </h1>
            <p className="text-black text-base leading-relaxed font-medium">
              API integration requests, institutional licensing, quantitative research partnerships,
              and enterprise deployments — reach the right desk for your market.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Form Outer Chassis ── */}
          <div className="lg:col-span-3">
            <div className="relative rounded-2xl border border-slate-200 bg-white/95 shadow-md p-6 sm:p-8">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />

              <h2 className="text-xl font-black text-slate-900 mb-6">Send a Message</h2>

              {submitted ? (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 p-8 text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="font-bold text-emerald-800 text-lg mb-2">Message Received</h3>
                  <p className="text-black text-sm font-medium">
                    Your inquiry has been submitted. A member of the Market Intelligence AI — MI007 institutional desk will
                    respond within 1–2 business days.
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name: '', email: '', org: '', marketFocus: 'INDIA', message: '' }); }}
                    className="mt-6 rounded-md border border-slate-300 bg-white px-4 py-2 text-[12px] font-bold text-black hover:border-emerald-600 transition-all shadow-xs"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black text-black mono tracking-wide uppercase">Full Name *</label>
                      <input
                        required
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Arjun Sharma"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[13px] text-black font-semibold placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all shadow-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black text-black mono tracking-wide uppercase">Institutional Email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="arjun@institution.com"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[13px] text-black font-semibold placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black text-black mono tracking-wide uppercase">Organization / Fund</label>
                      <input
                        type="text"
                        value={form.org}
                        onChange={e => setForm(f => ({ ...f, org: e.target.value }))}
                        placeholder="Institutional Capital Management"
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[13px] text-black font-semibold placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all shadow-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black text-black mono tracking-wide uppercase">Market Focus</label>
                      <select
                        value={form.marketFocus}
                        onChange={e => setForm(f => ({ ...f, marketFocus: e.target.value }))}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[13px] text-black font-semibold outline-none focus:border-emerald-600 transition-all shadow-xs"
                      >
                        <option value="INDIA">🇮🇳 India — NSE / BSE</option>
                        <option value="USA">🇺🇸 USA — NYSE / NASDAQ</option>
                        <option value="UAE">🇦🇪 UAE — DFM / ADX</option>
                        <option value="MULTI">🌐 Multi-Market</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-700 mono tracking-wide uppercase">Message / Feature Request *</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Describe your inquiry, integration requirements, or research partnership request..."
                      className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-[13px] text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all resize-none shadow-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-6 py-3 text-[13px] font-bold text-white hover:bg-emerald-500 hover:shadow-md transition-all mono tracking-wide"
                  >
                    ⚡ SUBMIT INQUIRY
                  </button>

                  <p className="text-[11px] text-slate-500 text-center mt-1">
                    We respond within 1–2 business days. Enterprise requests within 24 hours.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* ── Regional Desks ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-xl font-black text-slate-900 mb-2">Global Desks</h2>

            {DESKS.map(({ flag, city, address, zone, hours, focus, color }) => (
              <div key={city} className="rounded-xl border border-slate-200 bg-white/95 p-5 flex flex-col gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{flag}</span>
                  <div>
                    <div className="font-bold text-slate-900 text-[14px]">{city} Desk</div>
                    <div className="text-[10px] text-slate-500 mono">{zone}</div>
                  </div>
                  <div className="ml-auto h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                </div>
                <p className="text-[11px] text-slate-600 mono leading-relaxed">📍 {address}</p>
                <p className="text-[11px] text-slate-500">🕐 {hours}</p>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-800 mono font-medium">
                  {focus}
                </div>
              </div>
            ))}

            {/* Support SLA */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-5 shadow-xs">
              <h3 className="mono text-[12px] font-bold text-amber-800 mb-3 tracking-widest uppercase">
                ⚡ Enterprise SLA
              </h3>
              <ul className="flex flex-col gap-2 text-[11px] text-slate-700">
                <li>• Standard inquiries: 1–2 business days</li>
                <li>• Enterprise / API integration: within 24 hours</li>
                <li>• Critical technical support: within 4 hours</li>
                <li>• Research partnerships: scheduled within 48 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
