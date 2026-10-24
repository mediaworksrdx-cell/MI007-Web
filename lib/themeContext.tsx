'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { workspaceSync } from './workspaceSync';

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
    name: 'Institutional Navy (Dark)',
    tagline: 'Deep Institutional Slate · Crisp White Type · Emerald & Blue Accents',
    badge: 'Pro Navy',
    mode: 'dark',
    palette: {
      bg: '#080E1A',
      card: '#0F172A',
      surface: '#1E293B',
      accent: '#3B82F6',
      accentSecondary: '#10B981',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      bull: '#10B981',
      bear: '#EF4444',
      border: '#1E293B',
    },
  },
  violet: {
    id: 'violet',
    name: 'Obsidian Terminal (Dark)',
    tagline: 'Carbon Obsidian · Neutral Slate Hierarchy · Institutional Emerald',
    badge: 'Pro Obsidian',
    mode: 'dark',
    palette: {
      bg: '#090B10',
      card: '#11151F',
      surface: '#181E2C',
      accent: '#10B981',
      accentSecondary: '#6366F1',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      bull: '#10B981',
      bear: '#F43F5E',
      border: '#22293A',
    },
  },
  cream: {
    id: 'cream',
    name: 'Institutional Ivory (Light)',
    tagline: 'Warm Paper Canvas · Pure White Cards · Deep Forest & Slate Type',
    badge: 'Pro Ivory',
    mode: 'light',
    palette: {
      bg: '#F8F7F4',
      card: '#FFFFFF',
      surface: '#F1EFEA',
      accent: '#059669',
      accentSecondary: '#047857',
      text: '#0F172A',
      textMuted: '#475569',
      bull: '#059669',
      bear: '#DC2626',
      border: '#E2E8F0',
    },
  },
  sky: {
    id: 'sky',
    name: 'Ice Slate Daylight (Light)',
    tagline: 'Cool Daylight Slate · Pure White Cards · Crisp Royal Blue & Emerald',
    badge: 'Pro Daylight',
    mode: 'light',
    palette: {
      bg: '#F1F5F9',
      card: '#FFFFFF',
      surface: '#F8FAFC',
      accent: '#2563EB',
      accentSecondary: '#0284C7',
      text: '#0F172A',
      textMuted: '#475569',
      bull: '#059669',
      bear: '#DC2626',
      border: '#CBD5E1',
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

    // Subscribe to multi-tab theme synchronization
    const unsub = workspaceSync.subscribe((event) => {
      if (event.type === 'THEME_CHANGED' && (THEMES as Record<string, ThemeConfig>)[event.theme]) {
        const synced = event.theme as AppTheme;
        setThemeState(synced);
        document.documentElement.setAttribute('data-theme', synced);
      }
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && (THEMES as Record<string, ThemeConfig>)[e.newValue]) {
        const synced = e.newValue as AppTheme;
        setThemeState(synced);
        document.documentElement.setAttribute('data-theme', synced);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      workspaceSync.broadcast({ type: 'THEME_CHANGED', theme: newTheme, timestamp: Date.now() });
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
