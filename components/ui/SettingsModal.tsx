'use client';

import React, { useEffect, useState } from 'react';
import { useAppTheme, THEMES, AppTheme } from '@/lib/themeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useAppTheme();
  const [audioFx, setAudioFx] = useState(true);
  const [highSpeedDOM, setHighSpeedDOM] = useState(true);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-[520px] rounded-3xl border border-slate-700/80 bg-slate-900/98 text-slate-100 p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.65)] backdrop-blur-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-cyan-500/10 blur-2xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close Settings"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xl shrink-0">
            ⚙️
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white font-sans flex items-center gap-2">
              System Settings & Preferences
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Customize visual theme palettes, telemetry streaming, and platform audio
            </p>
          </div>
        </div>

        {/* ── Theme Section (Housing the 4 Themes) ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🎨</span>
              <span className="text-xs font-mono uppercase font-black tracking-wider text-slate-200">
                Display Theme Palettes
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              4 PRO PALETTES
            </span>
          </div>

          <div className="space-y-3.5">
            {/* ☀️ 2 Bright Palettes */}
            <div>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-amber-400 block mb-1.5 flex items-center gap-1.5">
                <span>☀️</span> 2 Bright Palettes (High Vibrancy)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[THEMES.lightblue, THEMES.ivory].map((t) => {
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`group relative flex flex-col justify-between p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center -space-x-1">
                          <span
                            className="w-4 h-4 rounded-full border border-black/30 shadow-xs"
                            style={{ backgroundColor: t.palette.bg }}
                            title={`Background: ${t.palette.bg}`}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/30 shadow-xs z-10"
                            style={{ backgroundColor: t.palette.accent }}
                            title={`Accent: ${t.palette.accent}`}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/30 shadow-xs z-20"
                            style={{ backgroundColor: t.palette.bull }}
                            title={`Bull: ${t.palette.bull}`}
                          />
                        </div>
                        {isActive ? (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black">
                            ✓
                          </span>
                        ) : (
                          <span className="text-[10px] mono text-slate-500 group-hover:text-slate-300">
                            Apply
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-white tracking-tight">{t.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {t.badge}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 mono line-clamp-1">{t.tagline}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 🌑 2 Dark Palettes */}
            <div>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-cyan-400 block mb-1.5 flex items-center gap-1.5">
                <span>🌑</span> 2 Dark Palettes (Lighter Institutional Tones)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[THEMES.metallic, THEMES.techno].map((t) => {
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`group relative flex flex-col justify-between p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-slate-800/90 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <div className="flex items-center -space-x-1">
                          <span
                            className="w-4 h-4 rounded-full border border-black/30 shadow-xs"
                            style={{ backgroundColor: t.palette.bg }}
                            title={`Background: ${t.palette.bg}`}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/30 shadow-xs z-10"
                            style={{ backgroundColor: t.palette.accent }}
                            title={`Accent: ${t.palette.accent}`}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-black/30 shadow-xs z-20"
                            style={{ backgroundColor: t.palette.bull }}
                            title={`Bull: ${t.palette.bull}`}
                          />
                        </div>
                        {isActive ? (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black">
                            ✓
                          </span>
                        ) : (
                          <span className="text-[10px] mono text-slate-500 group-hover:text-slate-300">
                            Apply
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold text-white tracking-tight">{t.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {t.badge}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 mono line-clamp-1">{t.tagline}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Audio & Telemetry Preferences ── */}
        <div className="mb-6 pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">🔊 Audio Telemetry Feedback</span>
              <span className="text-[11px] text-slate-400 font-sans">
                Acoustic alerts on abnormal liquidity routing & volume breakouts
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAudioFx(!audioFx)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                audioFx ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">⚡ Sub-Second Live DOM Feed</span>
              <span className="text-[11px] text-slate-400 font-sans">
                Real-time depth-of-market orderbook stream acceleration
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHighSpeedDOM(!highSpeedDOM)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                highSpeedDOM ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-all border border-slate-700 cursor-pointer text-center"
          >
            ✓ Done & Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
