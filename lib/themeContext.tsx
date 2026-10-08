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
    tagline: 'Modern Institutional Research Terminal',
    badge: 'Institutional Light',
    mode: 'light',
    palette: {
      bg: '#EDF5FA',
      card: '#FFFFFF',
      surface: '#F4F9FD',
      accent: '#0891B2',
      accentSecondary: '#0F2744',
      text: '#0B192C',
      textMuted: '#475569',
      bull: '#059669',
      bear: '#DC2626',
      border: 'rgba(8, 145, 178, 0.18)',
    },
  },
  ivory: {
    id: 'ivory',
    name: 'Executive Ivory',
    tagline: 'Luxury Investment Banking & Research',
    badge: 'Executive Light',
    mode: 'light',
    palette: {
      bg: '#F7F4EB',
      card: '#FFFFFF',
      surface: '#FAF7F0',
      accent: '#166534',
      accentSecondary: '#C5A059',
      text: '#1A1A1A',
      textMuted: '#525252',
      bull: '#15803D',
      bear: '#B91C1C',
      border: 'rgba(22, 101, 52, 0.16)',
    },
  },
  graphite: {
    id: 'graphite',
    name: 'Institutional Graphite',
    tagline: 'Bloomberg-Style Institutional Terminal',
    badge: 'Institutional Dark',
    mode: 'dark',
    palette: {
      bg: '#181C24',
      card: '#222733',
      surface: '#282F3E',
      accent: '#10B981',
      accentSecondary: '#94A3B8',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      bull: '#10B981',
      bear: '#F43F5E',
      border: 'rgba(148, 163, 184, 0.18)',
    },
  },
  capital: {
    id: 'capital',
    name: 'AI Capital',
    tagline: 'Advanced AI Financial Intelligence Platform',
    badge: 'AI Capital Dark',
    mode: 'dark',
    palette: {
      bg: '#0B132B',
      card: '#131E3D',
      surface: '#18264D',
      accent: '#2563EB',
      accentSecondary: '#06B6D4',
      text: '#FFFFFF',
      textMuted: '#94A3B8',
      bull: '#10B981',
      bear: '#EF4444',
      border: 'rgba(37, 99, 235, 0.22)',
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
