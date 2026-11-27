'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';

type PlanId = 'PULSE' | 'PRO' | 'MASTER_PRO';

interface PlanDef {
  id: PlanId;
  badge: string;
  title: string;
  subtitle: string;
  monthlyInr: number;
  popular?: boolean;
  highlights: string[];
}

const PLANS: PlanDef[] = [
  {
    id: 'PULSE',
    badge: 'PULSE BASIC',
    title: 'MARKET PULSE',
    subtitle: 'Essential multi-market terminal, F&O data & up to 4 options portfolios.',
    monthlyInr: 599,
    highlights: [
      '6 Global Markets (India, USA, UAE, Commodity, FX, Crypto)',
      'Options Portfolio: Up to 4 trades across portfolios',
      'Live Options & Futures Open Interest, PCR & Heat Map',
      'FII/DII Cash & Derivatives Data',
      'Results Calendar & Historical Results',
    ],
  },
  {
    id: 'PRO',
    badge: 'PRO PLUS · EDGE',
    title: 'MARKET PRO',
    subtitle: 'Expanded options portfolios, live Greeks chain, and active trader analytics.',
    monthlyInr: 999,
    popular: true,
    highlights: [
      'Everything in Market Pulse + Priority Live Feed',
      'Options Portfolio: Up to 8 trades across portfolios',
      'Live Option Chain with Greeks, IV Charts & Volatility Skew',
      'Strategy Charts, Builder & Futures Buildup',
      'SMC & Technical Screener Alerts',
    ],
  },
  {
    id: 'MASTER_PRO',
    badge: 'ULTRA PLUS · ALPHA',
    title: 'MARKET MASTER PRO',
    subtitle: 'Full institutional suite with unlimited backtesting, algorithms & MI-007 AI Lab.',
    monthlyInr: 1299,
    highlights: [
      'Unlimited Options Portfolios, Backtesting & Simulator',
      'Full Options Algorithm & All Strategy Builder Templates',
      'Live Historical TOI, Put-Call OI Dynamics & Unlimited Straddles',
      'MI-007 AI Market Intelligence & Multi-Timeframe SMC Engine',
      'Dedicated Desk Priority Support',
    ],
  },
];

type ComparisonRow =
  | { section: string }
  | { feature: string; pulse: string; pro: string; master: string };

const COMPARISON_ROWS: ComparisonRow[] = [
  { section: 'GLOBAL MARKETS COVERAGE' },
  { feature: 'INDIA (NSE / BSE)', pulse: 'YES', pro: 'YES', master: 'YES' },
  { feature: 'USA (NASDAQ / NYSE / S&P 500)', pulse: 'YES', pro: 'YES', master: 'YES' },
  { feature: 'UAE (DFM / ADX)', pulse: 'YES', pro: 'YES', master: 'YES' },
  { feature: 'COMMODITY BENCHMARKS', pulse: 'YES', pro: 'YES', master: 'YES' },
  { feature: 'FX MAJOR PAIRS', pulse: 'YES', pro: 'YES', master: 'YES' },
  { feature: 'CRYPTO MAJOR ASSETS', pulse: 'YES', pro: 'YES', master: 'YES' },

  { section: 'OPTIONS ANALYTICS & STRATEGY SUITE' },
  {
    feature: 'Options Portfolio',
    pulse: 'Maximum of 4 trades across all portfolios',
    pro: 'Maximum of 8 trades across all portfolios',
    master: 'Unlimited',
  },
  { feature: 'Options Backtesting', pulse: 'Limited', pro: 'Limited', master: 'Unlimited' },
  { feature: 'Options Simulator', pulse: 'Limited', pro: 'Limited', master: 'Yes' },
  { feature: 'Options Algorithm', pulse: 'Limited', pro: 'Limited', master: 'YES' },
  { feature: 'Options Dashboard', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'IV Charts', pulse: 'Intraday', pro: 'Intraday', master: 'Intraday' },
  { feature: 'Volatility Skew', pulse: 'Yes', pro: 'Yes', master: 'Yes' },
  { feature: 'Strategy Charts', pulse: 'Yes', pro: 'Yes', master: 'Yes' },
  { feature: 'Strategy Builder', pulse: 'Limited', pro: 'Limited', master: 'All' },
  { feature: 'Results Calendar', pulse: 'Yes', pro: 'Yes', master: 'Yes' },
  { feature: 'Historical Results', pulse: 'Yes', pro: 'Yes', master: 'YES' },

  { section: 'OPTIONS DATA' },
  { feature: 'Options Open Interest', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'Total Open Interest', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'Historical TOI', pulse: 'Yes', pro: 'Yes', master: 'Live' },
  { feature: 'Put Call OI Dynamics', pulse: 'Yes', pro: 'Yes', master: 'Live' },
  { feature: 'Open Interest Charts', pulse: 'Yes', pro: 'Yes', master: 'Live' },
  { feature: 'PCR (Put-Call Ratio)', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'Straddles', pulse: 'Limited', pro: 'Limited', master: 'Unlimited' },
  { feature: 'Option Chain with Greeks', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'Options Activity', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'Futures Dashboard', pulse: 'Live', pro: 'Live', master: 'Yes' },

  { section: 'FUTURES DATA' },
  { feature: 'Futures Open Interest', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'Futures Intraday', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'Futures Buildup', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'Heat Map', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'Moving Averages', pulse: 'Live', pro: 'Live', master: 'Live' },
  { feature: 'MWPL (Market Wide Position Limit)', pulse: 'Live', pro: 'Live', master: 'Live' },

  { section: 'FII / DII INSTITUTIONAL DATA' },
  { feature: 'FII/DII Cash Market', pulse: 'Yes', pro: 'Yes', master: 'Yes' },
  { feature: 'FII/DII Derivatives', pulse: 'Yes', pro: 'Yes', master: 'Yes' },

  { section: 'PRICING & OFFERS' },
  { feature: 'Base Monthly Price', pulse: '₹599/pm + GST', pro: '₹999/pm + GST', master: '₹1,299/pm + GST' },
  {
    feature: 'Annual Subscription Offer',
    pulse: '10% discount on Annual subscription',
    pro: '10% discount on Annual subscription',
    master: '10% discount on Annual subscription',
  },
  {
    feature: 'New Launch Offer (Limited Time)',
    pulse: '15% extra discount on advertised price',
    pro: '15% extra discount on advertised price',
    master: '15% extra discount on advertised price',
  },
];

const FAQS = [
  {
    q: 'Are the data updates real-time?',
    a: 'For paid subscribers, market data runs on our live streaming feed as per exchange data protocols, with Open Interest updating every 3 minutes and intraday IV/Greeks calculated continuously. For basic/free users, data feeds are delayed by 15 minutes.',
  },
  {
    q: 'Data for which market segments is available on MI-007?',
    a: 'On Market Intelligence MI-007 by Synthetix Analytics (marketintelligence-007.com / synthetixanalytics.com), you get NSE & BSE Futures & Options (F&O) analytics alongside India, USA, UAE equities, Global Commodities, Major Forex pairs, and Major Crypto benchmarks.',
  },
  {
    q: 'What is the difference among the 3 Portfolios in MI-007?',
    a: 'There is no structural difference between the portfolios—they are separated for clean categorization of your saved paper, hedged, and live options strategies.',
  },
  {
    q: 'How to download invoice?',
    a: 'Please log in to https://marketintelligence-007.com (or https://synthetixanalytics.com), navigate to your Account / Payment History tab, and click Download GST Invoice.',
  },
  {
    q: 'Whom should I write to in case of further queries?',
    a: 'Please write to our Synthetix Analytics support desk at support@synthetixanalytics.com (or via the Contact page on marketintelligence-007.com) if you have any billing or technical queries.',
  },
  {
    q: 'How many tickers are supported in Options Backtesting?',
    a: 'We support around 53 high-liquidity F&O tickers and exclude illiquid tickers where wide bid-ask spreads in options could produce unreliable backtesting results. (Note: All tickers remain available in the Strategy Builder to create and analyze live strategies.)',
  },
  {
    q: 'Where do I see my subscription details?',
    a: 'To check the active tier and validity of your subscription, visit https://marketintelligence-007.com/pricing or open your Account Profile menu in the top-right navigation bar.',
  },
  {
    q: 'How many markets are available on MI-007?',
    a: 'India (NSE, BSE) and USA (NASDAQ, DOW, S&P 500), UAE (DFM, ADX), Global Commodities, FX Majors, and Crypto Majors are supported with live feeds during market open hours. Off-market hours allow full Options strategy preparation and portfolio saving.',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('razorpay-checkout-js')) return;
    const s = document.createElement('script');
    s.id = 'razorpay-checkout-js';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const computeDisplayPrice = (monthlyInr: number) => {
    const afterAnnual = billingCycle === 'ANNUAL' ? Math.round(monthlyInr * 0.9) : monthlyInr;
    const launchDiscounted = Math.round(afterAnnual * 0.85); // 15% launch offer
    return {
      originalMonthly: monthlyInr,
      effectiveMonthly: launchDiscounted,
      totalBilledBase: billingCycle === 'ANNUAL' ? launchDiscounted * 12 : launchDiscounted,
    };
  };

  const handleSubscribe = async (plan: PlanDef) => {
    setLoadingPlan(plan.id);
    setToastMsg(null);
    try {
      const res = await fetch('/api/v1/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
          applyLaunchOffer: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setToastMsg({ text: data.error || 'Could not initialize Razorpay checkout.', isError: true });
        setLoadingPlan(null);
        return;
      }

      const RazorpayCtor = (window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } }).Razorpay;

      if (RazorpayCtor && data.keyId && data.keyId !== 'rzp_test_mi007_placeholder') {
        const rzp = new RazorpayCtor({
          key: data.keyId,
          amount: data.amountPaise,
          currency: data.currency || 'INR',
          name: 'Market Intelligence MI-007',
          description: `${plan.title} (${billingCycle}) — 15% Launch Offer`,
          order_id: data.mode === 'LIVE' ? data.orderId : undefined,
          handler: async (response: Record<string, string>) => {
            const verifyRes = await fetch('/api/v1/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                planId: plan.id,
                billingCycle,
              }),
            });
            const verifyData = await verifyRes.json().catch(() => ({}));
            if (verifyRes.ok && verifyData.ok) {
              localStorage.setItem('mi007_active_subscription_v1', JSON.stringify(verifyData.subscription));
              setToastMsg({ text: `✓ ${plan.title} activated! Payment ID: ${response.razorpay_payment_id}` });
            } else {
              setToastMsg({ text: verifyData.error || 'Payment verification failed.', isError: true });
            }
          },
          theme: { color: '#10B981' },
        });
        rzp.open();
      } else {
        setToastMsg({
          text: `Order ${data.orderId} ready (₹${data.breakdown.totalInr} incl. 18% GST). Add RAZORPAY_KEY_ID in .env.local to open live Razorpay gateway.`,
        });
      }
    } catch {
      setToastMsg({ text: 'Network error initializing Razorpay checkout.', isError: true });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-card-text)]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Launch Offer Banner */}
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 p-4 text-center shadow-md">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black bg-amber-400 text-slate-950 mr-2">
            NEW LAUNCH OFFER
          </span>
          <span className="text-xs sm:text-sm font-bold">
            <span className="text-emerald-400 font-black">15-Day Free Look-In Trial</span> + Limited-Time <span className="text-amber-400 font-black">15% Discount</span> Across All Subscriptions + Extra <span className="text-emerald-400 font-black">10% Off</span> on Annual Plans!
          </span>
        </div>

        {/* Hero Heading & Billing Toggle */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mono">
            Market Intelligence <span className="text-emerald-400">MI-007</span> Plans
          </h1>
          <p className="text-sm text-[var(--theme-card-text-muted)] max-w-2xl mx-auto">
            Institutional Smart Money Concepts, Live F&amp;O Open Interest &amp; Greeks, Multi-Market Coverage, and Strategy Backtesting — powered by Razorpay Instant Checkout.
          </p>

          <div className="inline-flex items-center p-1 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-xs">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                billingCycle === 'MONTHLY'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
              }`}
            >
              Monthly Billing (15% Launch Off)
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('ANNUAL')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                billingCycle === 'ANNUAL'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-[var(--theme-card-text-muted)] hover:text-[var(--theme-card-text)]'
              }`}
            >
              Annual Billing (10% + 15% Off)
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {toastMsg && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm font-mono font-bold text-center ${
              toastMsg.isError
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {toastMsg.text}
          </div>
        )}

        {/* 3 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = computeDisplayPrice(plan.monthlyInr);
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col justify-between bg-[var(--theme-card-bg)] shadow-xl transition-transform hover:-translate-y-0.5 ${
                  plan.popular
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-[var(--theme-card-border)]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 right-5 px-3 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500 text-slate-950 shadow-xs">
                    MOST POPULAR
                  </div>
                )}

                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {plan.badge}
                  </span>
                  <h2 className="text-xl font-black mono mt-2">{plan.title}</h2>
                  <p className="text-xs text-[var(--theme-card-text-muted)] mt-1 leading-relaxed">
                    {plan.subtitle}
                  </p>

                  <div className="mt-5 pb-5 border-b border-[var(--theme-card-border)]">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black mono text-emerald-400">
                        ₹{price.effectiveMonthly}
                      </span>
                      <span className="text-sm line-through text-[var(--theme-card-text-muted)] mono">
                        ₹{price.originalMonthly}
                      </span>
                      <span className="text-xs text-[var(--theme-card-text-muted)] mono">
                        / month + GST
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-400 font-mono font-bold mt-1">
                      Includes 15% New Launch Discount {billingCycle === 'ANNUAL' ? '+ 10% Annual Discount' : ''}
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2.5 text-xs">
                    {plan.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={loadingPlan === plan.id}
                  onClick={() => handleSubscribe(plan)}
                  className={`mt-6 w-full py-3 px-4 rounded-xl mono text-xs font-black tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                      : 'bg-slate-800 hover:bg-emerald-500 text-white hover:text-slate-950 border border-slate-700'
                  }`}
                >
                  <span>⚡</span>
                  <span>
                    {loadingPlan === plan.id
                      ? 'Initializing Razorpay...'
                      : `Subscribe with Razorpay · ₹${price.effectiveMonthly}/mo + GST`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Full Feature Comparison Matrix */}
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]">
            <h2 className="text-lg font-black mono">Complete Plan Comparison Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--theme-card-border)] bg-[var(--theme-card-surface)]/60 mono text-xs uppercase">
                  <th className="py-3.5 px-4 font-black">Feature / Market Segment</th>
                  <th className="py-3.5 px-4 font-black text-center">MARKET PULSE (₹599)</th>
                  <th className="py-3.5 px-4 font-black text-center text-emerald-400">MARKET PRO (₹999)</th>
                  <th className="py-3.5 px-4 font-black text-center text-amber-400">MARKET MASTER PRO (₹1,299)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)]/50">
                {COMPARISON_ROWS.map((row, idx) =>
                  'section' in row ? (
                    <tr key={idx} className="bg-emerald-500/10">
                      <td colSpan={4} className="py-2.5 px-4 mono text-xs font-black text-emerald-400 tracking-wider">
                        {row.section}
                      </td>
                    </tr>
                  ) : (
                    <tr key={idx} className="hover:bg-[var(--theme-card-surface)]/40">
                      <td className="py-2.5 px-4 font-semibold">{row.feature}</td>
                      <td className="py-2.5 px-4 text-center mono text-xs">{row.pulse}</td>
                      <td className="py-2.5 px-4 text-center mono text-xs font-bold text-emerald-400">{row.pro}</td>
                      <td className="py-2.5 px-4 text-center mono text-xs font-bold text-amber-400">{row.master}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription Terms Notice */}
        <div className="p-4 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-center text-xs mono text-[var(--theme-card-text-muted)] space-y-1">
          <p className="font-bold text-[var(--theme-card-text)]">
            After the free look-in period, the subscription shall be upgraded as per the selected plan on automatic payment via Razorpay.
          </p>
          <p className="text-rose-400 font-bold">
            All subscriptions are NON-REFUNDABLE. Please read the FAQs carefully before subscribing.
          </p>
        </div>

        {/* Frequently Asked Questions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black mono text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] shadow-sm space-y-2"
              >
                <h3 className="text-sm font-black mono text-emerald-400">
                  Q{idx + 1}. {item.q}
                </h3>
                <p className="text-xs leading-relaxed text-[var(--theme-card-text-muted)]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
