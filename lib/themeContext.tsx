'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'arctic' | 'ivory' | 'graphite' | 'capital' | 'azure';

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

export const THEMES: Record<string, ThemeConfig> = {
  arctic: {
    id: 'arctic',
    name: 'Arctic Sky',
    tagline: 'Soft Sky Blue · Deep Navy Cards · Soft Ivory Text',
    badge: 'Sky Palette',
    mode: 'light',
    palette: {
      bg: '#DCEAF2',
      card: '#17365C',
      surface: '#204470',
      accent: '#65A9D6',
      accentSecondary: '#17365C',
      text: '#F2F0E8',
      textMuted: '#A6BED8',
      bull: '#059669',
      bear: '#DC2626',
      border: '#204470',
    },
  },
  ivory: {
    id: 'ivory',
    name: 'Executive Ivory',
    tagline: 'Warm Ivory · Forest Green Cards · Cream Text',
    badge: 'Forest Palette',
    mode: 'light',
    palette: {
      bg: '#F5F0E5',
      card: '#244832',
      surface: '#2F593F',
      accent: '#B79A63',
      accentSecondary: '#244832',
      text: '#F8F3E9',
      textMuted: '#A8C2B1',
      bull: '#10B981',
      bear: '#E11D48',
      border: '#2F593F',
    },
  },
  graphite: {
    id: 'graphite',
    name: 'Institutional Graphite',
    tagline: 'Silver Gray · Graphite Cards · Cool Silver Text',
    badge: 'Graphite Palette',
    mode: 'light',
    palette: {
      bg: '#E3E5E7',
      card: '#303943',
      surface: '#3C4753',
      accent: '#70B7A0',
      accentSecondary: '#303943',
      text: '#E9EDF0',
      textMuted: '#9DA9B5',
      bull: '#059669',
      bear: '#DC2626',
      border: '#3C4753',
    },
  },
  capital: {
    id: 'capital',
    name: 'Midnight Azure',
    tagline: 'Midnight Navy · Warm Champagne Cards · Slate Navy Text',
    badge: 'Midnight Palette',
    mode: 'dark',
    palette: {
      bg: '#14243A',
      card: '#E8DFCD',
      surface: '#DED3BE',
      accent: '#65B9D8',
      accentSecondary: '#3E86A8',
      text: '#26374A',
      textMuted: '#4B6178',
      bull: '#059669',
      bear: '#DC2626',
      border: '#DED3BE',
    },
  },
  azure: {
    id: 'capital',
    name: 'Midnight Azure',
    tagline: 'Midnight Navy · Warm Champagne Cards · Slate Navy Text',
    badge: 'Midnight Palette',
    mode: 'dark',
    palette: {
      bg: '#14243A',
      card: '#E8DFCD',
      surface: '#DED3BE',
      accent: '#65B9D8',
      accentSecondary: '#3E86A8',
      text: '#26374A',
      textMuted: '#4B6178',
      bull: '#059669',
      bear: '#DC2626',
      border: '#DED3BE',
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
    if (stored && THEMES[stored]) {
      initialTheme = (stored === 'azure' ? 'capital' : stored) as AppTheme;
    } else if (stored === 'lightblue' || stored === 'quartz') {
      initialTheme = 'arctic';
    } else if (stored === 'champagne' || stored === 'falcon') {
      initialTheme = 'ivory';
    } else if (stored === 'metallic' || stored === 'obsidian') {
      initialTheme = 'graphite';
    } else if (stored === 'techno' || stored === 'cyberpunk' || stored === 'azure') {
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
