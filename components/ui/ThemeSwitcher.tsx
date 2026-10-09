'use client';

import React, { useState } from 'react';
import { useAppTheme, THEMES, AppTheme } from '@/lib/themeContext';

export function ThemeSwitcher() {
  const { theme, setTheme } = useAppTheme();
  const [isOpen, setIsOpen] = useState(true);

  // Four Distinct Premium Themes
  const themeList = [
    THEMES.arctic,
    THEMES.ivory,
    THEMES.graphite,
    THEMES.capital,
  ];

  const currentTheme = THEMES[theme] || THEMES.arctic;

  return (
    <aside
      aria-label="Theme Customizer"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col items-end pointer-events-auto select-none font-sans"
    >
      {/* Expanded Theme Selection Card */}
      {isOpen ? (
        <div className="w-[330px] sm:w-[370px] rounded-2xl p-4 backdrop-blur-2xl shadow-2xl transition-all duration-300 theme-switcher-panel animate-in fade-in slide-in-from-bottom-3 border border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 theme-switcher-border">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="mono text-[11px] font-black uppercase tracking-wider text-inherit">
                🎨 MI007 Palette Studio
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                4 DISTINCT THEMES
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs cursor-pointer"
              title="Minimize theme switcher"
              aria-label="Minimize"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] leading-snug mb-3 opacity-80 font-medium">
            Four coordinated colorways with harmonized background, card, and accent identities:
          </p>

          {/* Theme List */}
          <div className="grid grid-cols-1 gap-2">
            {themeList.map((t) => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 text-left cursor-pointer ${
                    isActive
                      ? 'theme-switcher-item-active shadow-md ring-2 ring-emerald-400/60 scale-[1.01]'
                      : 'theme-switcher-item-inactive hover:scale-[1.01] hover:border-white/20'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)',
                    borderColor: isActive ? t.palette.accent : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Tri-Color Swatch: Background, Card, Accent */}
                    <div className="flex items-center -space-x-1 shrink-0">
                      <span
                        className="w-4 h-4 rounded-full border border-black/40 shadow-xs"
                        style={{ backgroundColor: t.palette.bg }}
                        title={`Background: ${t.palette.bg}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/40 shadow-xs z-10"
                        style={{ backgroundColor: t.palette.card }}
                        title={`Card: ${t.palette.card}`}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-black/40 shadow-xs z-20"
                        style={{ backgroundColor: t.palette.accent }}
                        title={`Accent: ${t.palette.accent}`}
                      />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-extrabold tracking-tight truncate text-inherit">
                          {t.name}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border"
                          style={{
                            color: t.palette.accent,
                            borderColor: `${t.palette.accent}60`,
                            backgroundColor: `${t.palette.accent}15`,
                          }}
                        >
                          {t.badge}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-75 truncate font-mono">
                        {t.tagline}
                      </span>
                    </div>
                  </div>

                  {isActive ? (
                    <span
                      className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-black text-[11px] font-black shadow-sm"
                      style={{ backgroundColor: t.palette.accent }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono opacity-0 group-hover:opacity-70 transition-opacity">
                      Apply
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] opacity-65 font-mono">
            <span>Coordinated Colorways</span>
            <span>Saved to LocalStorage</span>
          </div>
        </div>
      ) : (
        /* Minimized Floating Trigger Button */
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full backdrop-blur-xl shadow-2xl border transition-all duration-200 hover:scale-105 active:scale-95 theme-switcher-minimized-btn cursor-pointer"
          style={{
            backgroundColor: currentTheme.palette.card,
            borderColor: currentTheme.palette.accent,
            color: currentTheme.palette.text,
          }}
          title="Open Theme Palette Studio"
        >
          <span
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: currentTheme.palette.accent }}
          />
          <span className="mono text-[12px] font-black uppercase tracking-wider">
            Palette: {currentTheme.name}
          </span>
          <span className="flex items-center -space-x-1">
            <span
              className="w-3.5 h-3.5 rounded-full border border-black/40"
              style={{ backgroundColor: currentTheme.palette.bg }}
            />
            <span
              className="w-3.5 h-3.5 rounded-full border border-black/40"
              style={{ backgroundColor: currentTheme.palette.accent }}
            />
          </span>
        </button>
      )}
    </aside>
  );
}
