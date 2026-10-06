'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'quartz' | 'champagne' | 'obsidian' | 'cyberpunk';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  tagline: string;
  badge: string;
  mode: 'light' | 'dark';
  palette: {
    bg: string;
    card: string;
    accent: string;
    bull: string;
    bear: string;
    border: string;
  };
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  quartz: {
    id: 'quartz',
    name: 'Fintech Quartz',
    tagline: 'Clean Cool Daylight Luxe',
    badge: 'Bright 1',
    mode: 'light',
    palette: {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      accent: '#0284C7',
      bull: '#059669',
      bear: '#DC2626',
      border: 'rgba(0, 0, 0, 0.08)',
    },
  },
  champagne: {
    id: 'champagne',
    name: 'Champagne Gold',
    tagline: 'Warm Ivory & Sovereign Gold',
    badge: 'Bright 2',
    mode: 'light',
    palette: {
      bg: '#FAF7F2',
      card: '#FFFFFF',
      accent: '#D97706',
      bull: '#15803D',
      bear: '#B91C1C',
      border: 'rgba(217, 119, 6, 0.18)',
    },
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Terminal',
    tagline: 'Deep Institutional Dark Pro',
    badge: 'Dark 1',
    mode: 'dark',
    palette: {
      bg: '#060A11',
      card: '#0D1524',
      accent: '#00D8F6',
      bull: '#00E699',
      bear: '#FF3B69',
      border: 'rgba(255, 255, 255, 0.08)',
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Matrix',
    tagline: 'Neon Violet & Synthetic Pink',
    badge: 'Dark 2',
    mode: 'dark',
    palette: {
      bg: '#0A0612',
      card: '#130C22',
      accent: '#EC4899',
      bull: '#10B981',
      bear: '#F43F5E',
      border: 'rgba(236, 72, 153, 0.25)',
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
  const [theme, setThemeState] = useState<AppTheme>('quartz');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read stored theme from localStorage or document attribute
    const stored = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null);
    let initialTheme: AppTheme = 'quartz';
    if (stored && THEMES[stored as AppTheme]) {
      initialTheme = stored as AppTheme;
    } else if (stored === 'falcon') {
      initialTheme = 'champagne';
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

  const currentThemeConfig = THEMES[theme] || THEMES.quartz;
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
