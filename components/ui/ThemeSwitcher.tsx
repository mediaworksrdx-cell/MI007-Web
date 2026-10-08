'use client';

import React, { useState } from 'react';
import { useAppTheme, THEMES, AppTheme } from '@/lib/themeContext';

export function ThemeSwitcher() {
  const { theme, setTheme } = useAppTheme();
  const [isOpen, setIsOpen] = useState(true);

  const themeList = Object.values(THEMES);

  return (
    <aside
      aria-label="Theme Customizer"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end pointer-events-auto select-none"
    >
      {/* Expanded Theme Selection Card */}
      {isOpen ? (
        <div className="w-[330px] sm:w-[360px] rounded-2xl p-3.5 backdrop-blur-2xl shadow-2xl transition-all duration-300 theme-switcher-panel animate-in fade-in slide-in-from-bottom-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 theme-switcher-border">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="mono text-[11px] font-black uppercase tracking-wider text-inherit">
                🎨 Palette Studio
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                2 BRIGHT · 2 DARK
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
              title="Minimize theme switcher"
              aria-label="Minimize"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] leading-snug mb-2.5 opacity-75 font-sans">
            Compare 2 high-contrast Bright and 2 Dark institutional colorways:
          </p>

          <div className="space-y-2.5">
            {/* Bright Section */}
            <div>
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400/90">
                  ☀️ Bright Palettes (Light Blue & Ivory)
                </span>
                <span className="text-[9px] font-mono opacity-60">2 Options</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[THEMES.arctic, THEMES.ivory].map((t) => {
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all duration-200 text-left ${
                        isActive
                          ? 'theme-switcher-item-active shadow-md ring-1 ring-sky-400/50'
                          : 'theme-switcher-item-inactive hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center -space-x-1 shrink-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
                            style={{ backgroundColor: t.palette.bg }}
                            title={`Background: ${t.palette.bg}`}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs z-10"
                            style={{ backgroundColor: t.palette.accent }}
                            title={`Accent: ${t.palette.accent}`}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs z-20"
                            style={{ backgroundColor: t.palette.bull }}
                            title={`Bull/Gain: ${t.palette.bull}`}
                          />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-bold tracking-tight truncate">
                              {t.name}
                            </span>
                            <span className="text-[8.5px] px-1 py-0.2 rounded font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              {t.badge}
                            </span>
                          </div>
                          <span className="text-[10px] opacity-70 truncate font-mono">
                            {t.tagline}
                          </span>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="shrink-0 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-emerald-500 text-black text-[10px] font-black">
                          ✓
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity">
                          Apply
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dark Section */}
            <div>
              <div className="flex items-center justify-between mb-1 px-1 pt-1 border-t border-white/5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  🌑 Dark Palettes (Institutional Graphite & AI Capital)
                </span>
                <span className="text-[9px] font-mono opacity-60">2 Options</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {[THEMES.graphite, THEMES.capital].map((t) => {
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`group relative flex items-center justify-between p-2 rounded-xl border transition-all duration-200 text-left ${
                        isActive
                          ? 'theme-switcher-item-active shadow-md ring-1 ring-cyan-400/50'
                          : 'theme-switcher-item-inactive hover:scale-[1.01]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center -space-x-1 shrink-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
                            style={{ backgroundColor: t.palette.bg }}
                            title={`Background: ${t.palette.bg}`}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs z-10"
                            style={{ backgroundColor: t.palette.accent }}
                            title={`Accent: ${t.palette.accent}`}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs z-20"
                            style={{ backgroundColor: t.palette.bull }}
                            title={`Bull/Gain: ${t.palette.bull}`}
                          />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-bold tracking-tight truncate">
                              {t.name}
                            </span>
                            <span className="text-[8.5px] px-1 py-0.2 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {t.badge}
                            </span>
                          </div>
                          <span className="text-[10px] opacity-70 truncate font-mono">
                            {t.tagline}
                          </span>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="shrink-0 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-emerald-500 text-black text-[10px] font-black">
                          ✓
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity">
                          Apply
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] opacity-60 font-mono">
            <span>Client Selection Mode</span>
            <span>Saved to LocalStorage</span>
          </div>
        </div>
      ) : (
        /* Minimized Floating Trigger Button */
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full backdrop-blur-xl shadow-xl border transition-all duration-200 hover:scale-105 active:scale-95 theme-switcher-minimized-btn"
          title="Open Theme Studio"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="mono text-[12px] font-extrabold uppercase tracking-wider">
            🎨 Palette: <span className="capitalize">{THEMES[theme]?.name || theme}</span>
          </span>
          <span className="flex items-center -space-x-1">
            <span
              className="w-3 h-3 rounded-full border border-black/40"
              style={{ backgroundColor: THEMES[theme]?.palette.bg }}
            />
            <span
              className="w-3 h-3 rounded-full border border-black/40"
              style={{ backgroundColor: THEMES[theme]?.palette.accent }}
            />
          </span>
        </button>
      )}
    </aside>
  );
}
