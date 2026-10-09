// ─── Theme 3D Adapter: Synchronizes Web Themes with 3D Environment ───
import * as THREE from 'three';
import { AppTheme } from '@/lib/themeContext';

export interface Theme3DSettings {
  clearColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  ambientIntensity: number;
  ambientColor: string;
  keyLightColor: string;
  keyLightIntensity: number;
  fillLightColor: string;
  fillLightIntensity: number;
  bullColor: string;
  bearColor: string;
  accentCyan: string;
  accentGold: string;
  terrainBase: string;
  terrainPeak: string;
  terrainValley: string;
  terrainGrid: string;
  reflectiveFloorColor: string;
  reflectiveFloorRoughness: number;
  reflectiveFloorMetalness: number;
  isDark: boolean;
}

export const THEME_3D_CONFIGS: Record<string, Theme3DSettings> = {
  // 1. Arctic Sky: Soft sky blue (#DCEAF2) · Deep navy (#17365C) · Soft ivory (#F2F0E8) · Sky blue accent (#65A9D6)
  arctic: {
    clearColor: '#0E233D',
    fogColor: '#0E233D',
    fogNear: 25,
    fogFar: 140,
    ambientIntensity: 0.65,
    ambientColor: '#DCEAF2',
    keyLightColor: '#FFFFFF',
    keyLightIntensity: 1.5,
    fillLightColor: '#65A9D6',
    fillLightIntensity: 0.85,
    bullColor: '#059669',
    bearColor: '#DC2626',
    accentCyan: '#65A9D6',
    accentGold: '#F2F0E8',
    terrainBase: '#17365C',
    terrainPeak: '#65A9D6',
    terrainValley: '#0C1C30',
    terrainGrid: '#2B5383',
    reflectiveFloorColor: '#0F2540',
    reflectiveFloorRoughness: 0.12,
    reflectiveFloorMetalness: 0.88,
    isDark: false,
  },

  // 2. Executive Ivory: Warm ivory (#F5F0E5) · Forest green (#244832) · Cream (#F8F3E9) · Muted gold accent (#B79A63)
  ivory: {
    clearColor: '#12261A',
    fogColor: '#12261A',
    fogNear: 22,
    fogFar: 135,
    ambientIntensity: 0.6,
    ambientColor: '#F5F0E5',
    keyLightColor: '#FFFDF7',
    keyLightIntensity: 1.45,
    fillLightColor: '#B79A63',
    fillLightIntensity: 0.8,
    bullColor: '#10B981',
    bearColor: '#E11D48',
    accentCyan: '#B79A63',
    accentGold: '#D4AF37',
    terrainBase: '#244832',
    terrainPeak: '#B79A63',
    terrainValley: '#0E1F15',
    terrainGrid: '#3A6B4C',
    reflectiveFloorColor: '#162C1E',
    reflectiveFloorRoughness: 0.14,
    reflectiveFloorMetalness: 0.86,
    isDark: false,
  },

  // 3. Institutional Graphite: Silver gray (#E3E5E7) · Graphite (#303943) · Cool silver (#E9EDF0) · Muted emerald accent (#70B7A0)
  graphite: {
    clearColor: '#1A2027',
    fogColor: '#1A2027',
    fogNear: 20,
    fogFar: 130,
    ambientIntensity: 0.6,
    ambientColor: '#E3E5E7',
    keyLightColor: '#F8FAFC',
    keyLightIntensity: 1.6,
    fillLightColor: '#70B7A0',
    fillLightIntensity: 0.75,
    bullColor: '#059669',
    bearColor: '#DC2626',
    accentCyan: '#70B7A0',
    accentGold: '#E9EDF0',
    terrainBase: '#303943',
    terrainPeak: '#70B7A0',
    terrainValley: '#141A20',
    terrainGrid: '#4B5765',
    reflectiveFloorColor: '#202730',
    reflectiveFloorRoughness: 0.11,
    reflectiveFloorMetalness: 0.92,
    isDark: false,
  },

  // 4. Midnight Azure: Midnight navy (#14243A) · Warm champagne (#E8DFCD) · Slate navy (#26374A) · Controlled cyan accent (#65B9D8)
  capital: {
    clearColor: '#0E1929',
    fogColor: '#0E1929',
    fogNear: 20,
    fogFar: 145,
    ambientIntensity: 0.7,
    ambientColor: '#65B9D8',
    keyLightColor: '#65B9D8',
    keyLightIntensity: 1.8,
    fillLightColor: '#E8DFCD',
    fillLightIntensity: 0.95,
    bullColor: '#00E599',
    bearColor: '#FF3355',
    accentCyan: '#65B9D8',
    accentGold: '#E8DFCD',
    terrainBase: '#14243A',
    terrainPeak: '#65B9D8',
    terrainValley: '#08101C',
    terrainGrid: '#26374A',
    reflectiveFloorColor: '#0E1A2B',
    reflectiveFloorRoughness: 0.09,
    reflectiveFloorMetalness: 0.93,
    isDark: true,
  },

  azure: {
    clearColor: '#0E1929',
    fogColor: '#0E1929',
    fogNear: 20,
    fogFar: 145,
    ambientIntensity: 0.7,
    ambientColor: '#65B9D8',
    keyLightColor: '#65B9D8',
    keyLightIntensity: 1.8,
    fillLightColor: '#E8DFCD',
    fillLightIntensity: 0.95,
    bullColor: '#00E599',
    bearColor: '#FF3355',
    accentCyan: '#65B9D8',
    accentGold: '#E8DFCD',
    terrainBase: '#14243A',
    terrainPeak: '#65B9D8',
    terrainValley: '#08101C',
    terrainGrid: '#26374A',
    reflectiveFloorColor: '#0E1A2B',
    reflectiveFloorRoughness: 0.09,
    reflectiveFloorMetalness: 0.93,
    isDark: true,
  },
};

export function getTheme3DSettings(theme: AppTheme): Theme3DSettings {
  return THEME_3D_CONFIGS[theme] || THEME_3D_CONFIGS.arctic;
}
