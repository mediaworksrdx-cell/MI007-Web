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

  const themeList: {
    id: AppTheme;
    name: string;
    category: 'LIGHT' | 'DARK';
    badge: string;
    feel: string;
    accentHex: string;
    bgHex: string;
    panelHex: string;
    bullHex: string;
  }[] = [
    {
      id: 'arctic',
      name: 'Arctic Intelligence',
      category: 'LIGHT',
      badge: 'Light 1',
      feel: 'Clean, analytical institutional research terminal',
      accentHex: '#0891B2',
      bgHex: '#EDF5FA',
      panelHex: '#FFFFFF',
      bullHex: '#059669',
    },
    {
      id: 'ivory',
      name: 'Executive Ivory',
      category: 'LIGHT',
      badge: 'Light 2',
      feel: 'Luxury investment bank, executive research platform',
      accentHex: '#166534',
      bgHex: '#F7F4EB',
      panelHex: '#FFFFFF',
      bullHex: '#15803D',
    },
    {
      id: 'graphite',
      name: 'Institutional Graphite',
      category: 'DARK',
      badge: 'Dark 1',
      feel: 'Bloomberg-style institutional terminal, technical & serious',
      accentHex: '#10B981',
      bgHex: '#181C24',
      panelHex: '#222733',
      bullHex: '#10B981',
    },
    {
      id: 'capital',
      name: 'AI Capital',
      category: 'DARK',
      badge: 'Dark 2',
      feel: 'Advanced AI financial intelligence, futuristic & institutional',
      accentHex: '#2563EB',
      bgHex: '#0B132B',
      panelHex: '#131E3D',
      bullHex: '#10B981',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-[560px] rounded-2xl border border-slate-700/80 bg-slate-900/98 text-slate-100 p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-lg shrink-0">
            ⚙️
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white font-sans flex items-center gap-2">
              Platform Settings & Display
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Select institutional theme, configure telemetry feed and acoustic alerts
            </p>
          </div>
        </div>

        {/* ── Enterprise Design-System Theme Selector ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-slate-300">
                Institutional Theme
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              4 DESIGN PRESETS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {themeList.map((t) => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-slate-800/95 border-emerald-500/80 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Top Bar: Swatch Pill & Status Badge */}
                  <div className="flex items-center justify-between w-full mb-2.5">
                    {/* Swatch Pill */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 border border-slate-700/80">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                        style={{ backgroundColor: t.bgHex }}
                        title={`Background: ${t.bgHex}`}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                        style={{ backgroundColor: t.panelHex }}
                        title={`Panels: ${t.panelHex}`}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs"
                        style={{ backgroundColor: t.accentHex }}
                        title={`Accent: ${t.accentHex}`}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-xs ml-0.5"
                        style={{ backgroundColor: t.bullHex }}
                        title={`Semantic Bull: ${t.bullHex}`}
                      />
                    </div>

                    {/* Active / Select Badge */}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300">
                        {t.category}
                      </span>
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-bold text-white tracking-tight">
                        {t.name}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400 font-sans line-clamp-2">
                      {t.feel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Operational Preferences ── */}
        <div className="mb-6 pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Acoustic Telemetry Alerts</span>
              <span className="text-[11px] text-slate-400 font-sans">
                Real-time audio notification on institutional liquidity blocks & breakout sweeps
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAudioFx(!audioFx)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                audioFx ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Sub-Second Order Flow DOM</span>
              <span className="text-[11px] text-slate-400 font-sans">
                Accelerate 60fps real-time limit orderbook depth streaming
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHighSpeedDOM(!highSpeedDOM)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                highSpeedDOM ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        {/* Close / Apply Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-all border border-slate-700 cursor-pointer text-center"
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
