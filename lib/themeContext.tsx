'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'lightblue' | 'ivory' | 'metallic' | 'techno';

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
  lightblue: {
    id: 'lightblue',
    name: 'Light Blue',
    tagline: 'Vibrant Arctic Sky Blue & Electric Cerulean',
    badge: 'Bright 1',
    mode: 'light',
    palette: {
      bg: '#E0F2FE',
      card: '#FFFFFF',
      accent: '#0284C7',
      bull: '#059669',
      bear: '#DC2626',
      border: 'rgba(2, 132, 199, 0.32)',
    },
  },
  ivory: {
    id: 'ivory',
    name: 'Ivory',
    tagline: 'Warm Radiant Ivory & Sovereign Honey Gold',
    badge: 'Bright 2',
    mode: 'light',
    palette: {
      bg: '#FAF0DB',
      card: '#FFFFFF',
      accent: '#D97706',
      bull: '#15803D',
      bear: '#B91C1C',
      border: 'rgba(217, 119, 6, 0.35)',
    },
  },
  metallic: {
    id: 'metallic',
    name: 'Metallic Grey',
    tagline: 'Light Gunmetal Slate & Brushed Platinum',
    badge: 'Dark 1',
    mode: 'dark',
    palette: {
      bg: '#232B3A',
      card: '#303B4F',
      accent: '#CBD5E1',
      bull: '#10B981',
      bear: '#F43F5E',
      border: 'rgba(203, 213, 225, 0.30)',
    },
  },
  techno: {
    id: 'techno',
    name: 'Techno Blue',
    tagline: 'Luminous Cobalt Blue & Electric Neon Cyan',
    badge: 'Dark 2',
    mode: 'dark',
    palette: {
      bg: '#122347',
      card: '#1A3366',
      accent: '#00F0FF',
      bull: '#00E699',
      bear: '#FF3B69',
      border: 'rgba(0, 240, 255, 0.38)',
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
  const [theme, setThemeState] = useState<AppTheme>('lightblue');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read stored theme from localStorage or document attribute with legacy migration
    const stored = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null);
    let initialTheme: AppTheme = 'lightblue';
    if (stored && THEMES[stored as AppTheme]) {
      initialTheme = stored as AppTheme;
    } else if (stored === 'quartz') {
      initialTheme = 'lightblue';
    } else if (stored === 'champagne' || stored === 'falcon') {
      initialTheme = 'ivory';
    } else if (stored === 'obsidian') {
      initialTheme = 'metallic';
    } else if (stored === 'cyberpunk') {
      initialTheme = 'techno';
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

  const currentThemeConfig = THEMES[theme] || THEMES.lightblue;
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
