'use client';

import React from 'react';

export type Icon3DName =
  | 'globe'
  | 'robot'
  | 'shield'
  | 'network'
  | 'lightning'
  | 'clock'
  | 'chart'
  | 'wave'
  | 'target'
  | 'diamond'
  | 'pattern'
  | 'trend'
  | 'footprint'
  | 'support'
  | 'microstructure'
  | 'scale'
  | 'risk'
  | 'info';

interface Icon3DProps {
  name: Icon3DName;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glowColor?: string;
}

const SIZE_MAP = {
  sm: { box: 36, icon: 20, radius: 'rounded-xl' },
  md: { box: 48, icon: 26, radius: 'rounded-2xl' },
  lg: { box: 60, icon: 32, radius: 'rounded-2xl' },
  xl: { box: 72, icon: 38, radius: 'rounded-3xl' },
};

export function Icon3D({ name, size = 'md', className = '' }: Icon3DProps) {
  const { box, icon, radius } = SIZE_MAP[size];
  const uid = `i2d-${name}-${size}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${radius} select-none transition-all duration-300 hover:scale-105 hover:-translate-y-0.5
        bg-white/80 dark:bg-slate-900/60
        border border-black/[0.08] dark:border-white/[0.12]
        shadow-[0_2px_8px_-1px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.85)]
        dark:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)]
        backdrop-blur-md
        hover:border-emerald-500/40 dark:hover:border-emerald-400/40
        hover:shadow-md
        ${className}`}
      style={{
        width: box,
        height: box,
      }}
    >
      {/* Delicate Glass Top Specular Sheen */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/50 via-transparent to-black/[0.02] dark:from-white/10 dark:to-transparent pointer-events-none" />

      {/* 2D Polished Vector Icon */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-300 group-hover:scale-110"
      >
        <defs>
          <linearGradient id={`${uid}-cyan`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <linearGradient id={`${uid}-emerald`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <linearGradient id={`${uid}-amber`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <linearGradient id={`${uid}-purple`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          <linearGradient id={`${uid}-rose`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>

          <linearGradient id={`${uid}-blue`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          <linearGradient id={`${uid}-indigo`} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4338CA" />
          </linearGradient>
        </defs>

        {/* ── 1. GLOBAL-MARKET COVERAGE / WORLD GLOBE ── */}
        {(name === 'globe' || name === 'network') && (
          <g>
            {/* Outer World Sphere */}
            <circle
              cx="12"
              cy="12"
              r="9.2"
              stroke={`url(#${uid}-cyan)`}
              strokeWidth="1.9"
              fill={`url(#${uid}-cyan)`}
              fillOpacity="0.14"
            />
            {/* Longitude Meridian Ellipse */}
            <ellipse
              cx="12"
              cy="12"
              rx="4.4"
              ry="9.2"
              stroke={`url(#${uid}-cyan)`}
              strokeWidth="1.6"
            />
            {/* Central Prime Meridian */}
            <line
              x1="12"
              y1="2.8"
              x2="12"
              y2="21.2"
              stroke="#0284C7"
              strokeWidth="1.3"
              strokeOpacity="0.55"
            />
            {/* Equator & Latitude Parallels */}
            <line
              x1="2.8"
              y1="12"
              x2="21.2"
              y2="12"
              stroke="#0284C7"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M4.2 8.2C7 9.4 17 9.4 19.8 8.2"
              stroke="#0284C7"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M4.2 15.8C7 14.6 17 14.6 19.8 15.8"
              stroke="#0284C7"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            {/* Global Exchange Hub Nodes (US / India / UAE) */}
            <circle cx="8" cy="8.8" r="1.4" fill="#06B6D4" />
            <circle cx="15.8" cy="12" r="1.4" fill="#0284C7" />
            <circle cx="12" cy="15.2" r="1.4" fill="#06B6D4" />
          </g>
        )}

        {/* ── 2. AI-DRIVEN ANALYTICS / MACHINE LEARNING NEURAL CHART ── */}
        {name === 'robot' && (
          <g>
            {/* AI Neural Core / Analytics Frame */}
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="4.5"
              fill={`url(#${uid}-emerald)`}
              fillOpacity="0.14"
              stroke={`url(#${uid}-emerald)`}
              strokeWidth="1.8"
            />
            {/* Ascending Analytics Bars inside AI Core */}
            <rect x="6.5" y="13.5" width="2.2" height="4" rx="0.8" fill="#10B981" fillOpacity="0.65" />
            <rect x="10.2" y="11" width="2.2" height="6.5" rx="0.8" fill="#10B981" fillOpacity="0.85" />
            <rect x="13.9" y="8.5" width="2.2" height="9" rx="0.8" fill="#059669" />
            {/* Neural Predictive Trend Trajectory */}
            <path
              d="M6.5 11.2L10.5 8.2L13.5 9.6L17.5 5.8"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Neural Nodes */}
            <circle cx="6.5" cy="11.2" r="1.4" fill="#10B981" />
            <circle cx="10.5" cy="8.2" r="1.4" fill="#10B981" />
            <circle cx="17.5" cy="5.8" r="1.6" fill="#059669" />
            {/* AI Sparkle Star (Top Left) */}
            <path
              d="M7.5 4.8L8 6.1L9.3 6.6L8 7.1L7.5 8.4L7 7.1L5.7 6.6L7 6.1L7.5 4.8Z"
              fill="#10B981"
            />
          </g>
        )}

        {/* ── 3. ABSORPTION / SHIELD ── */}
        {name === 'shield' && (
          <g>
            <path
              d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
              fill={`url(#${uid}-emerald)`}
              fillOpacity="0.18"
              stroke="#10B981"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 12L11 14L15 9.5"
              stroke="#10B981"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* ── 4. MOMENTUM / LIGHTNING ── */}
        {name === 'lightning' && (
          <g>
            <path
              d="M13 2L4 13.5H12L11 22L20 10.5H12L13 2Z"
              fill={`url(#${uid}-amber)`}
              fillOpacity="0.22"
              stroke="#F59E0B"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* ── 5. STRUCTURE / PATTERN ── */}
        {name === 'pattern' && (
          <g>
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              fill={`url(#${uid}-purple)`}
              fillOpacity="0.25"
              stroke="#A855F7"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="#A855F7"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="#A855F7"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* ── 6. LIQUIDITY / WAVE ── */}
        {name === 'wave' && (
          <g>
            <path
              d="M2 12C5 6 7 6 10 12C13 18 15 18 18 12C19.5 9 21 9 22 10.5"
              stroke="#06B6D4"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 16.5C5 11 7 11 10 16.5C13 22 15 22 18 16.5C19.5 13.5 21 13.5 22 15"
              stroke="#06B6D4"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.45"
            />
            <circle cx="10" cy="12" r="2.2" fill="#06B6D4" />
            <circle cx="18" cy="12" r="2.2" fill="#06B6D4" />
          </g>
        )}

        {/* ── 7. TIME / CLOCK ── */}
        {name === 'clock' && (
          <g>
            <circle cx="12" cy="12" r="9" stroke="#3B82F6" strokeWidth="1.8" fill={`url(#${uid}-blue)`} fillOpacity="0.12" />
            <polyline points="12 7 12 12 15 15" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="1.5" fill="#3B82F6" />
          </g>
        )}

        {/* ── 8. TECHNICAL INDICATORS / CHART ── */}
        {name === 'chart' && (
          <g>
            <path d="M3 3V21H21" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="7" y="11" width="3" height="7" rx="1" fill="#10B981" fillOpacity="0.8" />
            <rect x="12" y="7" width="3" height="11" rx="1" fill="#0EA5E9" fillOpacity="0.8" />
            <rect x="17" y="4" width="3" height="14" rx="1" fill="#F59E0B" fillOpacity="0.8" />
            <path d="M6 14L11 9L15 12L21 5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* ── 9. TARGET / EXECUTION ── */}
        {name === 'target' && (
          <g>
            <circle cx="12" cy="12" r="9" stroke="#EF4444" strokeWidth="1.8" fill={`url(#${uid}-rose)`} fillOpacity="0.12" />
            <circle cx="12" cy="12" r="5" stroke="#EF4444" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="2" fill="#EF4444" />
            <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* ── 10. DIAMOND / EDGE ── */}
        {name === 'diamond' && (
          <g>
            <path
              d="M6 3H18L22 9L12 21L2 9L6 3Z"
              fill={`url(#${uid}-indigo)`}
              fillOpacity="0.18"
              stroke="#6366F1"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M2 9H22M12 21L8 9L10 3M12 21L16 9L14 3" stroke="#6366F1" strokeWidth="1.4" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* ── 11. TREND TOPOLOGY ── */}
        {name === 'trend' && (
          <g>
            <path d="M22 6L13.5 14.5L8.5 9.5L2 16" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="16 6 22 6 22 12" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 20H22" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
          </g>
        )}

        {/* ── 12. FOOTPRINT / DELTA ── */}
        {name === 'footprint' && (
          <g>
            <rect x="4" y="4" width="6.5" height="4.5" rx="1.2" fill="#10B981" fillOpacity="0.8" />
            <rect x="13.5" y="4" width="6.5" height="4.5" rx="1.2" fill="#EF4444" fillOpacity="0.5" />
            <rect x="4" y="10" width="7.5" height="4.5" rx="1.2" fill="#10B981" fillOpacity="0.9" />
            <rect x="12.5" y="10" width="7.5" height="4.5" rx="1.2" fill="#EF4444" fillOpacity="0.4" />
            <rect x="4" y="16" width="5" height="4" rx="1.2" fill="#10B981" fillOpacity="0.4" />
            <rect x="15" y="16" width="5" height="4" rx="1.2" fill="#EF4444" fillOpacity="0.9" />
            <line x1="12" y1="2" x2="12" y2="22" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="2 2" />
          </g>
        )}

        {/* ── 13. SUPPORT & RESISTANCE ── */}
        {name === 'support' && (
          <g>
            <line x1="2" y1="5" x2="22" y2="5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            <line x1="2" y1="19" x2="22" y2="19" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 19L9 8L15 15L20 5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="8" r="2" fill="#EF4444" />
            <circle cx="15" cy="15" r="2" fill="#10B981" />
          </g>
        )}

        {/* ── 14. MICROSTRUCTURE ── */}
        {name === 'microstructure' && (
          <g>
            <rect x="3" y="4" width="18" height="3" rx="1" fill="#0EA5E9" fillOpacity="0.8" />
            <rect x="5" y="9" width="14" height="3" rx="1" fill="#0EA5E9" fillOpacity="0.6" />
            <rect x="7" y="14" width="10" height="3" rx="1" fill="#0EA5E9" fillOpacity="0.45" />
            <rect x="9" y="19" width="6" height="3" rx="1" fill="#0EA5E9" fillOpacity="0.3" />
          </g>
        )}

        {/* ── 15. BULL / BEAR SCALE ── */}
        {name === 'scale' && (
          <g>
            <path d="M12 3V21M3 8L12 5L21 8M3 8L6 14M21 8L18 14" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14H8C8 16 6 17 6 17C6 17 4 16 4 14ZM16 14H20C20 16 18 17 18 17C18 17 16 16 16 14Z" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="1.5" />
            <path d="M8 21H16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* ── 16. RISK / INVALIDATION ── */}
        {name === 'risk' && (
          <g>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={`url(#${uid}-rose)`} fillOpacity="0.15" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.3" fill="#EF4444" />
          </g>
        )}

        {/* ── 17. INFO ── */}
        {name === 'info' && (
          <g>
            <circle cx="12" cy="12" r="9" fill={`url(#${uid}-blue)`} fillOpacity="0.12" stroke="#0284C7" strokeWidth="1.8" />
            <line x1="12" y1="11" x2="12" y2="16.5" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="12" cy="7.5" r="1.4" fill="#0284C7" />
          </g>
        )}
      </svg>
    </div>
  );
}
