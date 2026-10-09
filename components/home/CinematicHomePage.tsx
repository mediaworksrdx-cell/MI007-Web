'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useMarket } from '@/lib/marketContext';
import HeroSection from '../sections/HeroSection';
import AboutSection from '../sections/AboutSection';
import HowItWorksSection from '../sections/HowItWorksSection';
import CapabilitiesSection from '../sections/CapabilitiesSection';
import MarketTerminalSection from '../sections/MarketTerminalSection';
import WhySection from '../sections/WhySection';
import FinalCTASection from '../sections/FinalCTASection';

export default function CinematicHomePage() {
  const { market, setMarket } = useMarket();

  return (
    <div className="relative min-h-screen bg-transparent text-slate-900 overflow-x-hidden font-sans">
      {/* Institutional Top Navbar */}
      <Navbar market={market} onMarketChange={setMarket} />

      {/* 7 Connected Cinematic Sections Flow */}
      <div className="relative w-full z-10">
        {/* 01. Hero — Includes opening cinematic video & live telemetry */}
        <div id="hero" style={{ minHeight: '100vh', pointerEvents: 'auto' }}>
          <HeroSection />
        </div>

        {/* 02. Market Movement — The Infinite Candlestick Avenue */}
        <div id="movement" className="bg-transparent" style={{ minHeight: '100vh', pointerEvents: 'auto' }}>
          <AboutSection />
        </div>

        {/* 03. AI Analysis — Bull Acceleration vs Bear Capitulation */}
        <div id="ai-analysis" className="bg-transparent" style={{ minHeight: '100vh', pointerEvents: 'auto' }}>
          <HowItWorksSection />
        </div>

        {/* 04. Intelligence Engine — The 8 Algorithmic Modules */}
        <div id="intelligence-engine" className="bg-transparent" style={{ minHeight: '100vh', pointerEvents: 'auto' }}>
          <CapabilitiesSection />
        </div>

        {/* 05. Interactive Terminal — Real-time Multi-Exchange Execution */}
        <div id="terminal" className="bg-transparent" style={{ minHeight: '100vh', pointerEvents: 'auto' }}>
          <MarketTerminalSection />
        </div>

        {/* 06. Market Intelligence — Quantitative Microstructure Reasoning */}
        <div id="market-intelligence" className="bg-transparent" style={{ minHeight: '100vh', pointerEvents: 'auto' }}>
          <WhySection />
        </div>

        {/* 07. Final CTA — Institutional Access */}
        <div id="final-cta" className="bg-transparent" style={{ minHeight: '100vh', pointerEvents: 'auto' }}>
          <FinalCTASection />
        </div>

        {/* Footer */}
        <div style={{ pointerEvents: 'auto' }}>
          <Footer />
        </div>
      </div>
    </div>
  );
}
