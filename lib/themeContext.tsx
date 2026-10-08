'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'arctic' | 'ivory' | 'graphite' | 'capital';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  tagline: string;
  badge: string;
  mode: 'light' | 'dark';
  palette: {
    bg: string;
    card: string;
    surface: string;
    accent: string;
    accentSecondary: string;
    text: string;
    textMuted: string;
    bull: string;
    bear: string;
    border: string;
  };
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  arctic: {
    id: 'arctic',
    name: 'Arctic Intelligence',
    tagline: 'Light Background · Dark Navy Cards · Light Text',
    badge: 'Light Theme',
    mode: 'light',
    palette: {
      bg: '#EDF5FA',
      card: '#0E1726',
      surface: '#162238',
      accent: '#0891B2',
      accentSecondary: '#0F2744',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      bull: '#10B981',
      bear: '#F43F5E',
      border: 'rgba(30, 58, 95, 0.65)',
    },
  },
  ivory: {
    id: 'ivory',
    name: 'Executive Ivory',
    tagline: 'Ivory Background · Deep Charcoal Cards · Light Text',
    badge: 'Light Theme',
    mode: 'light',
    palette: {
      bg: '#F7F4EB',
      card: '#18221D',
      surface: '#222E27',
      accent: '#166534',
      accentSecondary: '#C5A059',
      text: '#FDFCFA',
      textMuted: '#A8A29E',
      bull: '#22C55E',
      bear: '#EF4444',
      border: 'rgba(34, 60, 48, 0.65)',
    },
  },
  graphite: {
    id: 'graphite',
    name: 'Institutional Graphite',
    tagline: 'Graphite Background · Light Silver Cards · Dark Text',
    badge: 'Dark Theme',
    mode: 'dark',
    palette: {
      bg: '#181C24',
      card: '#F1F4F9',
      surface: '#E2E8F0',
      accent: '#0D9488',
      accentSecondary: '#64748B',
      text: '#0F172A',
      textMuted: '#475569',
      bull: '#059669',
      bear: '#DC2626',
      border: 'rgba(148, 163, 184, 0.45)',
    },
  },
  capital: {
    id: 'capital',
    name: 'AI Capital',
    tagline: 'Midnight Background · Light Blue-Gray Cards · Dark Text',
    badge: 'Dark Theme',
    mode: 'dark',
    palette: {
      bg: '#0B132B',
      card: '#EAF1FA',
      surface: '#D9E6F5',
      accent: '#2563EB',
      accentSecondary: '#0284C7',
      text: '#0A1931',
      textMuted: '#3B5278',
      bull: '#059669',
      bear: '#DC2626',
      border: 'rgba(37, 99, 235, 0.28)',
    },
  },
};

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  currentThemeConfig: ThemeConfig;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'mi007_active_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('arctic');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read stored theme from localStorage or document attribute with legacy migration
    const stored = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null);
    let initialTheme: AppTheme = 'arctic';
    if (stored && THEMES[stored as AppTheme]) {
      initialTheme = stored as AppTheme;
    } else if (stored === 'lightblue' || stored === 'quartz') {
      initialTheme = 'arctic';
    } else if (stored === 'champagne' || stored === 'falcon') {
      initialTheme = 'ivory';
    } else if (stored === 'metallic' || stored === 'obsidian') {
      initialTheme = 'graphite';
    } else if (stored === 'techno' || stored === 'cyberpunk') {
      initialTheme = 'capital';
    }

    setThemeState(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
    setMounted(true);
  }, []);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const currentThemeConfig = THEMES[theme] || THEMES.arctic;
  const isDark = currentThemeConfig.mode === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentThemeConfig, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
