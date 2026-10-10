'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useMarket } from '@/lib/marketContext';
import { Icon3D } from '@/components/ui/Icon3D';

export default function ContactPage() {
  const { market, setMarket } = useMarket();

  const [form, setForm] = useState({
    name: '',
    email: '',
    org: '',
    marketFocus: 'INDIA',
    message: '',
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
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border page-section-pill mb-3 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="mono text-[13px] tracking-[0.25em] uppercase font-black page-section-pill-text">
                01 // INSTITUTIONAL INQUIRIES &amp; LICENSING
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 page-heading">
              Contact <span className="font-extrabold text-emerald-600">Synthetix Analytics</span>
            </h1>
            <p className="text-[17px] sm:text-[19px] max-w-2xl mx-auto leading-relaxed font-medium page-subtitle">
              <strong className="font-bold text-emerald-500">Intelligence Beyond the Noise.</strong> Market Intelligence MI- 007 institutional licensing, API integration, quantitative research partnerships, and enterprise deployments.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 py-6 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Form Outer Chassis ── */}
          <div className="lg:col-span-3">
            <div className="relative rounded-2xl border-2 inst-card shadow-xl p-6 sm:p-8">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />

              <h2 className="text-xl sm:text-2xl font-black inst-card-text mb-6">Send an Institutional Inquiry</h2>

              {submitted ? (
                <div className="rounded-xl border border-emerald-500/40 inst-subcard p-8 text-center flex flex-col items-center">
                  <div className="mb-4">
                    <Icon3D name="shield" size="lg" glowColor="rgba(16, 185, 129, 0.45)" />
                  </div>
                  <h3 className="font-bold text-emerald-500 text-lg mb-2">Inquiry Received</h3>
                  <p className="inst-card-text-muted text-sm font-medium">
                    Your inquiry has been submitted. A member of the Synthetix Analytics institutional desk will respond within 1–2 business days.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', org: '', marketFocus: 'INDIA', message: '' });
                    }}
                    className="mt-6 rounded-md border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] px-4 py-2 text-[12px] font-bold inst-card-text hover:border-emerald-500 transition-all shadow-xs cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black inst-card-text mono tracking-wide uppercase">
                        Full Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Arjun Sharma"
                        className="rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] px-4 py-2.5 text-[13px] inst-card-text font-semibold placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black inst-card-text mono tracking-wide uppercase">
                        Institutional Email *
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="arjun@institution.com"
                        className="rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] px-4 py-2.5 text-[13px] inst-card-text font-semibold placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black inst-card-text mono tracking-wide uppercase">
                        Organization / Fund
                      </label>
                      <input
                        type="text"
                        value={form.org}
                        onChange={(e) => setForm((f) => ({ ...f, org: e.target.value }))}
                        placeholder="Institutional Capital Management"
                        className="rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] px-4 py-2.5 text-[13px] inst-card-text font-semibold placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black inst-card-text mono tracking-wide uppercase">
                        Market Focus
                      </label>
                      <select
                        value={form.marketFocus}
                        onChange={(e) => setForm((f) => ({ ...f, marketFocus: e.target.value }))}
                        className="rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] px-4 py-2.5 text-[13px] inst-card-text font-semibold outline-none focus:border-emerald-500 transition-all shadow-xs"
                      >
                        <option value="INDIA">🇮🇳 India — NSE / BSE (HQ)</option>
                        <option value="USA">🇺🇸 USA — NYSE / NASDAQ</option>
                        <option value="UAE">🇦🇪 UAE — DFM / ADX</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-black inst-card-text mono tracking-wide uppercase">
                      Message / Feature Request *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Describe your inquiry, integration requirements, or research partnership request..."
                      className="rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] px-4 py-3 text-[13px] inst-card-text font-medium placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none shadow-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-6 py-3 text-[13px] font-bold text-white hover:bg-emerald-500 hover:shadow-md transition-all mono tracking-wide cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>SUBMIT INQUIRY</span>
                  </button>

                  <p className="text-[11px] inst-card-text-muted text-center mt-1">
                    We respond within 1–2 business days. Enterprise requests within 24 hours.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* ── Regional Desks & Direct Contact ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* ── HQ & Direct Contact Card ── */}
            <div className="rounded-2xl border-2 inst-card p-6 sm:p-7 flex flex-col gap-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />

              {/* CHENNAI — HQ */}
              <div>
                <div className="mono text-[11px] font-bold inst-card-text-muted uppercase tracking-widest mb-1.5">
                  CHENNAI — HQ
                </div>
                <div className="text-[17px] font-bold inst-card-text leading-tight">
                  Chennai, Tamil Nadu
                </div>
                <div className="text-[17px] font-bold inst-card-text">
                  India
                </div>
              </div>

              {/* DIRECT CONTACT */}
              <div>
                <div className="mono text-[11px] font-bold inst-card-text-muted uppercase tracking-widest mb-1.5">
                  DIRECT CONTACT
                </div>
                <div className="flex flex-col gap-1">
                  <a
                    href="mailto:care@synthetixanalytics.com"
                    className="text-[15px] sm:text-[17px] font-bold inst-card-text hover:text-emerald-500 transition-colors break-all"
                  >
                    care@synthetixanalytics.com
                  </a>
                  <a
                    href="tel:+918838202279"
                    className="text-[15px] sm:text-[17px] font-bold inst-card-text hover:text-emerald-500 transition-colors"
                  >
                    +91 8838202279
                  </a>
                </div>
              </div>

              {/* SECURITY NOTICE BOX */}
              <div className="rounded-xl border border-[var(--theme-card-border)] inst-subcard p-4">
                <div className="mono text-[11px] font-black tracking-widest text-amber-500 uppercase mb-2">
                  SECURITY NOTICE
                </div>
                <p className="text-[13px] inst-card-text-muted leading-relaxed font-normal">
                  All communications are encrypted using bank-grade protocols. Your data is isolated according to institutional privacy standards.
                </p>
              </div>
            </div>

            {/* UAE Desk */}
            <div className="rounded-xl border-2 inst-card p-5 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇦🇪</span>
                <div>
                  <div className="font-bold inst-card-text text-[14px]">Dubai Desk (UAE)</div>
                  <div className="text-[10px] inst-card-text-muted mono">GST (UTC+4)</div>
                </div>
                <div className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] inst-card-text-muted mono leading-relaxed">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Dubai International Financial Centre (DIFC), Dubai, UAE</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] inst-card-text-muted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Mon–Fri: 10:00–14:00 GST</span>
              </div>
              <div className="rounded-md border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] px-3 py-2 text-[11px] inst-card-text mono font-medium">
                DFM · ADX · MENA Equities · Gulf Markets
              </div>
            </div>

            {/* Support SLA */}
            <div className="rounded-xl border border-amber-500/40 inst-subcard p-5 shadow-xs">
              <h3 className="mono text-[12px] font-bold text-amber-500 mb-3 tracking-widest uppercase flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Enterprise SLA</span>
              </h3>
              <ul className="flex flex-col gap-2 text-[11px] inst-card-text-muted">
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
