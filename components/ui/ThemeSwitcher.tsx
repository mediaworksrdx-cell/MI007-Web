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
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 theme-switcher-border">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="mono text-[11px] font-black uppercase tracking-wider text-inherit">
                🎨 Theme Review Studio
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                4 CANDIDATES
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

          <p className="text-[11.5px] leading-snug mb-3 opacity-75 font-sans">
            Select a candidate color palette to inspect how the charts, terminal, and HUD respond:
          </p>

          {/* Theme Buttons Grid */}
          <div className="grid grid-cols-1 gap-2">
            {themeList.map((t) => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 text-left ${
                    isActive
                      ? 'theme-switcher-item-active shadow-lg'
                      : 'theme-switcher-item-inactive hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Color Swatch Dots */}
                    <div className="flex items-center -space-x-1 shrink-0">
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
                        title={`Bull/Gain: ${t.palette.bull}`}
                      />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold tracking-tight truncate">
                          {t.name}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded font-mono font-medium opacity-80 border border-current/20">
                          {t.badge}
                        </span>
                      </div>
                      <span className="text-[10.5px] opacity-70 truncate font-mono">
                        {t.tagline}
                      </span>
                    </div>
                  </div>

                  {/* Active Indicator check */}
                  {isActive ? (
                    <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-black text-[11px] font-black">
                      ✓
                    </span>
                  ) : (
                    <span className="text-[11px] opacity-0 group-hover:opacity-60 transition-opacity">
                      Apply
                    </span>
                  )}
                </button>
              );
            })}
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
