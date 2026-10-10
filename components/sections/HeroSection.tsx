'use client';

import { motion } from 'framer-motion';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';
import { useTradeEngine } from '@/lib/tradeEngineContext';

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [bullDelta, setBullDelta] = useState(12.48);
  const [bearDelta, setBearDelta] = useState(-8.24);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const { getSymbolPrice } = useTradeEngine();

  const nifty = getSymbolPrice('NIFTY') || getSymbolPrice('NIFTY 50');
  const sp500 = getSymbolPrice('SPX') || getSymbolPrice('S&P 500');
  const btc = getSymbolPrice('BTC');
  const nasdaq = getSymbolPrice('NDX') || getSymbolPrice('NASDAQ 100') || getSymbolPrice('NASDAQ');
  const gold = getSymbolPrice('GOLD') || getSymbolPrice('XAU/USD');

  const niftyPrice = nifty ? nifty.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '22,453.60';
  const niftyChg = nifty ? nifty.changePct : 0.99;

  const spPrice = sp500 ? sp500.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '5,864.20';
  const spChg = sp500 ? sp500.changePct : 0.82;

  const btcPrice = btc ? `$${btc.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$83,651';
  const btcChg = btc ? btc.changePct : 1.24;

  const ndxPrice = nasdaq ? nasdaq.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '18,240';
  const ndxChg = nasdaq ? nasdaq.changePct : 0.65;

  const goldPrice = gold ? `$${gold.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$2,648';
  const goldChg = gold ? gold.changePct : 0.45;

  const heroStreamItems = useMemo(() => [
    { symbol: 'NIFTY 50', price: niftyPrice, chg: niftyChg },
    { symbol: 'S&P 500', price: spPrice, chg: spChg },
    { symbol: 'BTC', price: btcPrice, chg: btcChg },
    { symbol: 'NASDAQ', price: ndxPrice, chg: ndxChg },
    { symbol: 'GOLD', price: goldPrice, chg: goldChg },
  ], [niftyPrice, niftyChg, spPrice, spChg, btcPrice, btcChg, ndxPrice, ndxChg, goldPrice, goldChg]);

  // Live Micro-Telemetry Ticks
  useEffect(() => {
    const timer = setInterval(() => {
      setBullDelta(+(12.48 + (Math.random() - 0.48) * 0.35).toFixed(2));
      setBearDelta(+(-8.24 + (Math.random() - 0.52) * 0.25).toFixed(2));
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // 3D Parallax Tilt with Mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  const toggleSound = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen flex flex-col justify-between items-center bg-transparent z-10 px-0 pt-36 sm:pt-40 md:pt-44 pb-16 select-none overflow-hidden"
    >
      {/* Subtle Top Radial Ambient Light (Midnight Blue & Emerald) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[520px] bg-gradient-to-b from-mint-green/[0.07] via-accent-cyan/[0.03] to-transparent blur-3xl pointer-events-none hero-theatre-gutter" />

      {/* ── 1. CINEMATIC THEATRE VIDEO (EXACT 1.5-INCH MARGIN LEFT & RIGHT) ── */}
      <div className="w-full relative z-20 pointer-events-auto hero-theatre-gutter">
        <div
          className="relative w-full h-[250px] xs:h-[300px] sm:h-[420px] md:h-[500px] lg:h-[580px] xl:h-[620px] overflow-hidden bg-slate-950 group shadow-[0_25px_70px_-15px_rgba(0,0,0,0.35)] rounded-[24px] xs:rounded-[32px] sm:rounded-[52px] md:rounded-[68px] lg:rounded-[80px] border border-slate-200/90"
        >
          {/* 10-Second Looping Video Playing in Heavily Rounded Rectangle Frame (Zero head crop) */}
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="auto"
            poster="/images/cinematic/hero_clash_hd.jpg"
            className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500"
            style={{
              filter: 'contrast(1.06) brightness(0.98) saturate(1.08)',
              objectPosition: 'center 12%',
              transform: 'scale(1.06) translateY(-16px)',
              transformOrigin: 'center top',
            }}
          >
            <source src="/Video/Market%20AI.mp4" type="video/mp4" />
            <source src="/Video/Market AI.mp4" type="video/mp4" />
          </video>

          {/* Interactive Dual-Spectrum Atmospheric Aura (Emerald Left, Crimson Right) */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-500"
            style={{
              background: `
                radial-gradient(circle at 18% 50%, rgba(0, 255, 136, ${0.16 + Math.max(0, -mouseOffset.x) * 0.25}) 0%, transparent 60%),
                radial-gradient(circle at 82% 50%, rgba(255, 23, 68, ${0.16 + Math.max(0, mouseOffset.x) * 0.25}) 0%, transparent 60%)
              `,
            }}
          />



          {/* Video Audio & Playback Controls Floating on Video Bottom-Right */}
          <div className="absolute bottom-3 sm:bottom-7 right-3 sm:right-9 z-20 flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto">
            <button
              onClick={toggleSound}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border backdrop-blur-xl text-xs sm:text-sm font-mono font-bold hover:border-[#00FF88] transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-xl video-overlay-ctrl min-h-[38px] sm:min-h-[44px]"
            >
              <span>{isMuted ? '🔇' : '🔊'}</span>
              <span className="text-white tracking-wider font-black hidden xs:inline">{isMuted ? 'SOUND OFF' : 'SOUND ON'}</span>
            </button>

            <button
              onClick={togglePlay}
              title={isPlaying ? 'Pause Video' : 'Play Video'}
              className="p-1.5 px-2.5 sm:px-4 sm:py-2 rounded-xl border backdrop-blur-xl text-xs sm:text-sm font-mono font-bold hover:border-[#00FF88] transition-all cursor-pointer shadow-xl flex items-center gap-1.5 sm:gap-2 video-overlay-ctrl min-h-[38px] sm:min-h-[44px]"
            >
              <span>{isPlaying ? '⏸' : '▶'}</span>
              <span className="text-white tracking-wider font-black hidden xs:inline">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. LIVE STATS & TELEMETRY BAR (IMMEDIATELY BELOW VIDEO - SINGLE UNIFIED BAR) ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="w-full relative z-20 pointer-events-auto hero-theatre-gutter mt-7 mb-12 sm:mb-16"
      >
        <div className="w-full rounded-2xl border-2 hero-stats-panel px-4 sm:px-8 py-3 sm:py-4 shadow-lg flex flex-col xl:flex-row items-center justify-between gap-3 sm:gap-4 xl:gap-6 mono overflow-hidden relative">
          {/* Left: Momentum Telemetry (Static High-Priority) */}
          <div className="flex items-center flex-wrap sm:flex-nowrap justify-center xl:justify-start gap-3 sm:gap-6 shrink-0 text-center sm:text-left">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-[12px] xs:text-[14px] sm:text-[15px] tracking-wide hero-stats-label">BULL MOMENTUM:</span>
              <strong className="font-mono font-black text-emerald-500 text-[14px] xs:text-[16px] sm:text-[18px]">+{bullDelta}%</strong>
            </div>
            <span className="hero-stats-pipe font-bold hidden sm:inline text-lg">|</span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-[12px] xs:text-[14px] sm:text-[15px] tracking-wide hero-stats-label">BEAR RESISTANCE:</span>
              <strong className="font-mono font-black text-rose-500 text-[14px] xs:text-[16px] sm:text-[18px]">{bearDelta}%</strong>
            </div>
            <span className="hero-stats-pipe font-bold hidden md:inline text-lg">|</span>
            <div className="hidden md:flex items-center gap-2">
              <span className="font-extrabold text-[14px] sm:text-[15px] tracking-wide hero-stats-label">EQUILIBRIUM:</span>
              <strong className="font-mono font-black text-[16px] sm:text-[18px] hero-stats-val">{niftyPrice}</strong>
            </div>
          </div>

          {/* Central Divider */}
          <div className="hidden xl:block w-px h-8 hero-stats-divider shrink-0" />

          {/* Right: Global L3 Feed with Infinite Marquee (Contained, Never Overflows) */}
          <div className="w-full xl:w-auto xl:flex-1 min-w-0 flex items-center gap-3 sm:gap-4 overflow-hidden relative">
            <div className="flex items-center gap-2 text-emerald-500 text-[14px] sm:text-[15px] font-black tracking-wide shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>GLOBAL L3 FEED</span>
            </div>

            {/* Edge fade masks */}
            <div className="absolute left-[130px] sm:left-[150px] top-0 bottom-0 w-6 z-10 pointer-events-none hidden sm:block hero-marquee-fade-left" />
            <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none hidden sm:block hero-marquee-fade-right" />

            {/* Scrolling Ticker Stream (Contained within boundaries) */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="l3-marquee-track flex items-center gap-6 whitespace-nowrap text-[14px] sm:text-[15px] font-semibold hero-l3-stream">
                {/* Loop Sequence 1 */}
                {heroStreamItems.map((item, i) => {
                  const isUp = item.chg >= 0;
                  return (
                    <React.Fragment key={`seq1-${item.symbol}-${i}`}>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="hero-stats-label font-bold">{item.symbol}</span>
                        <span className="hero-stats-val font-black">{item.price}</span>{' '}
                        <span className={`font-black ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isUp ? '+' : ''}{item.chg.toFixed(2)}%
                        </span>
                      </div>
                      <span className="hero-stats-pipe font-bold">•</span>
                    </React.Fragment>
                  );
                })}

                {/* Loop Sequence 2 (Seamless duplication) */}
                {heroStreamItems.map((item, i) => {
                  const isUp = item.chg >= 0;
                  return (
                    <React.Fragment key={`seq2-${item.symbol}-${i}`}>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="hero-stats-label font-bold">{item.symbol}</span>
                        <span className="hero-stats-val font-black">{item.price}</span>{' '}
                        <span className={`font-black ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isUp ? '+' : ''}{item.chg.toFixed(2)}%
                        </span>
                      </div>
                      <span className="hero-stats-pipe font-bold">•</span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 3. MARKET INTELLIGENCE AI TEXT NARRATIVE (BELOW STATS BAR) ── */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center relative z-20 px-4 sm:px-6 pointer-events-auto">
        {/* A Synthetix Analytics Product */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="w-full flex justify-center mb-4 sm:mb-5"
        >
          <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1 shadow-xs backdrop-blur-xs hero-brand-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="mono text-[11px] font-bold tracking-widest uppercase hero-brand-pill-text">
              A Synthetix Analytics Product
            </span>
          </div>
        </motion.div>

        {/* Cyber-Falcon Emblem Logo with Light Blur Gradient */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full flex justify-center mb-6"
        >
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex items-center justify-center overflow-visible">
            <Falcon3DLogo
              src="/images/logo-falcon-transparent.png"
              alt="Market Intelligence MI- 007"
              width={112}
              height={112}
              priority
              className="w-full h-full object-contain"
              popoutScale={1.1}
            />
          </div>
        </motion.div>

        {/* MI-007 Top Header Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          className="mono text-[12px] xs:text-[13px] sm:text-[16px] md:text-[18px] lg:text-[20px] font-black tracking-[0.35em] sm:tracking-[0.4em] uppercase text-emerald-500 mb-2 sm:mb-3"
        >
          MI-007
        </motion.div>

        {/* MARKET INTELLIGENCE (Same Row) */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-[-0.02em] leading-tight page-heading"
        >
          <span className="hero-title-gradient whitespace-nowrap inline-block">
            MARKET INTELLIGENCE
          </span>
        </motion.h1>

        {/* Tagline down below Market Intelligence */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.38 }}
          className="mono text-[11px] xs:text-[12px] sm:text-[15px] md:text-[17px] font-extrabold uppercase tracking-[0.22em] sm:tracking-[0.28em] text-emerald-500 mt-2.5 sm:mt-3.5 mb-3 sm:mb-5"
        >
          Intelligence Beyond the Noise
        </motion.div>

        {/* Subtitle / Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.42 }}
          className="text-[15px] sm:text-[18px] md:text-[20px] font-medium max-w-3xl mx-auto mb-6 sm:mb-10 leading-relaxed px-2 sm:px-0 page-subtitle"
        >
          Multi-dimensional technical synthesis and real-time liquidity sweep detection engineered for institutional execution.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-8 w-full max-w-md sm:max-w-none mx-auto"
        >
          <Link
            href="/terminal"
            className="w-full sm:w-auto px-6 sm:px-9 py-3.5 sm:py-4 min-h-[48px] rounded-xl border border-emerald-600 bg-emerald-600 text-white font-mono text-[14px] sm:text-[17px] font-extrabold tracking-widest uppercase shadow-md hover:bg-emerald-500 hover:scale-[1.03] transition-all duration-300 text-center cursor-pointer flex items-center justify-center gap-2 group active:bg-emerald-700"
          >
            <span>⚡ ENTER THE SYSTEM</span>
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </Link>

          <a
            href="#movement"
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 min-h-[48px] rounded-xl border hero-secondary-btn font-mono text-[14px] sm:text-[17px] font-bold tracking-widest uppercase backdrop-blur-xl transition-all duration-300 text-center cursor-pointer shadow-sm flex items-center justify-center"
          >
            DISCOVER THE FORCES
          </a>
        </motion.div>
      </div>
    </section>
  );
}
