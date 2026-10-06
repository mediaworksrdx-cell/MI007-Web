'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'obsidian' | 'quartz' | 'cyberpunk' | 'falcon';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  tagline: string;
  badge: string;
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
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Terminal',
    tagline: 'Deep Institutional Dark',
    badge: 'Institutional Pro',
    palette: {
      bg: '#060A11',
      card: '#0D1524',
      accent: '#00D8F6',
      bull: '#00E699',
      bear: '#FF3B69',
      border: 'rgba(255,255,255,0.08)',
    },
  },
  quartz: {
    id: 'quartz',
    name: 'Fintech Quartz',
    tagline: 'Clean Modern Luxe Light',
    badge: 'Modern Light',
    palette: {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      accent: '#0284C7',
      bull: '#059669',
      bear: '#DC2626',
      border: 'rgba(0,0,0,0.08)',
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Matrix',
    tagline: 'High-Frequency Neon DeFi',
    badge: 'DeFi / Crypto',
    palette: {
      bg: '#050508',
      card: '#0E0E17',
      accent: '#EC4899',
      bull: '#10B981',
      bear: '#F43F5E',
      border: 'rgba(168,85,247,0.25)',
    },
  },
  falcon: {
    id: 'falcon',
    name: 'Royal Falcon',
    tagline: 'Midnight Navy & Champagne Gold',
    badge: 'Wealth & Macro',
    palette: {
      bg: '#070D18',
      card: '#0F1A2E',
      accent: '#F59E0B',
      bull: '#10B981',
      bear: '#EF4444',
      border: 'rgba(245,158,11,0.25)',
    },
  },
};

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  currentThemeConfig: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'mi007_active_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('obsidian');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read stored theme from localStorage or document attribute
    const stored = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) as AppTheme | null;
    const initialTheme: AppTheme = (stored && THEMES[stored]) ? stored : 'obsidian';
    
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

  const currentThemeConfig = THEMES[theme] || THEMES.obsidian;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentThemeConfig }}>
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
