'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'ocean' | 'violet' | 'cream' | 'sky';

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
  ocean: {
    id: 'ocean',
    name: 'Deep Ocean & Turquoise',
    tagline: 'Deep Ocean · Turquoise Glow · Sky Blue Accents',
    badge: 'Ocean Turquoise',
    mode: 'dark',
    palette: {
      bg: '#071322',
      card: '#0E233D',
      surface: '#142F50',
      accent: '#00E5FF',
      accentSecondary: '#38BDF8',
      text: '#F0FDF4',
      textMuted: '#7DD3FC',
      bull: '#00F59B',
      bear: '#FF4D4D',
      border: '#1B3B60',
    },
  },
  violet: {
    id: 'violet',
    name: 'Royal Violet & Parrot Green',
    tagline: 'Royal Violet Obsidian · Parrot Green Accents 🦜 · Amethyst Cards',
    badge: 'Violet & Parrot 🦜',
    mode: 'dark',
    palette: {
      bg: '#0F081D',
      card: '#1A0F30',
      surface: '#251644',
      accent: '#22E555',
      accentSecondary: '#A855F7',
      text: '#FAF5FF',
      textMuted: '#C084FC',
      bull: '#22E555',
      bear: '#FF4D6D',
      border: '#3B1F6A',
    },
  },
  cream: {
    id: 'cream',
    name: 'Light & White Cream (Excel Green)',
    tagline: 'Warm Cream Canvas · Pure White Cards · Excel Icon Green',
    badge: 'Excel Cream',
    mode: 'light',
    palette: {
      bg: '#F9F7F2',
      card: '#FFFFFF',
      surface: '#F2EEE4',
      accent: '#107C41',
      accentSecondary: '#15803D',
      text: '#0F172A',
      textMuted: '#52525B',
      bull: '#107C41',
      bear: '#DC2626',
      border: '#E5E0D8',
    },
  },
  sky: {
    id: 'sky',
    name: 'Sky Blue & Turquoise Breeze',
    tagline: 'Sky Blue Mist · Pure White Cards · Turquoise & Parrot Accents',
    badge: 'Sky Breeze',
    mode: 'light',
    palette: {
      bg: '#E8F3FA',
      card: '#FFFFFF',
      surface: '#DDF0FA',
      accent: '#0284C7',
      accentSecondary: '#00B4D8',
      text: '#0F172A',
      textMuted: '#64748B',
      bull: '#22C55E',
      bear: '#EF4444',
      border: '#BAE6FD',
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
  const [theme, setThemeState] = useState<AppTheme>('ocean');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read stored theme from localStorage or document attribute with legacy migration
    const stored = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null);
    let initialTheme: AppTheme = 'ocean';
    if (stored && (THEMES as Record<string, ThemeConfig>)[stored]) {
      initialTheme = stored as AppTheme;
    } else if (stored === 'arctic' || stored === 'lightblue' || stored === 'quartz') {
      initialTheme = 'sky';
    } else if (stored === 'ivory' || stored === 'champagne' || stored === 'falcon') {
      initialTheme = 'cream';
    } else if (stored === 'graphite' || stored === 'metallic' || stored === 'obsidian') {
      initialTheme = 'ocean';
    } else if (stored === 'capital' || stored === 'azure' || stored === 'techno' || stored === 'cyberpunk') {
      initialTheme = 'violet';
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

  const currentThemeConfig = THEMES[theme] || THEMES.ocean;
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
