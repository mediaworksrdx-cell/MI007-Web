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
  sm: { box: 36, icon: 22 },
  md: { box: 48, icon: 30 },
  lg: { box: 60, icon: 38 },
  xl: { box: 74, icon: 48 },
};

export function Icon3D({ name, size = 'md', className = '', glowColor }: Icon3DProps) {
  const { box, icon } = SIZE_MAP[size];

  // Unique ID prefix for SVG filters & gradients to prevent collision
  const uid = `i3d-${name}-${size}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl select-none transition-transform duration-300 hover:scale-110 hover:-translate-y-1 ${className}`}
      style={{
        width: box,
        height: box,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%)',
        boxShadow: `
          0 10px 25px -5px rgba(0, 0, 0, 0.35),
          inset 0 1.5px 1.5px rgba(255, 255, 255, 0.35),
          inset 0 -2px 4px rgba(0, 0, 0, 0.3),
          0 0 16px ${glowColor || 'rgba(16, 185, 129, 0.22)'}
        `,
        border: '1px solid rgba(255, 255, 255, 0.18)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* 3D Top-Light Specular Highlight Glare */}
      <div
        className="absolute top-0 left-1.5 right-1.5 h-[35%] rounded-t-xl pointer-events-none opacity-40"
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.7), transparent)',
        }}
      />

      {/* Volumetric 3D Rendered SVG Graphic */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-md"
      >
        <defs>
          {/* Shared Ambient Drop Shadow Filter */}
          <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.45" />
          </filter>

          {/* Glowing Flare Filter */}
          <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── 1. 3D GLOBAL COVERAGE (Holographic Earth Orb) ── */}
        {(name === 'globe' || name === 'network') && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <radialGradient id={`${uid}-globe-sphere`} cx="38%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#67E8F9" />
                <stop offset="25%" stopColor="#06B6D4" />
                <stop offset="65%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#082F49" />
              </radialGradient>
              <linearGradient id={`${uid}-globe-ring`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#A7F3D0" />
                <stop offset="50%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#064E3B" />
              </linearGradient>
            </defs>
            {/* Base 3D Sphere */}
            <circle cx="32" cy="32" r="24" fill={`url(#${uid}-globe-sphere)`} />
            {/* Latitude / Longitude 3D Rings */}
            <ellipse cx="32" cy="32" rx="23.5" ry="10" stroke="#E0F2FE" strokeWidth="1.6" strokeDasharray="2 3" opacity="0.65" />
            <ellipse cx="32" cy="32" rx="10" ry="23.5" stroke="#E0F2FE" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.65" />
            <line x1="32" y1="8" x2="32" y2="56" stroke="#BAE6FD" strokeWidth="1.5" opacity="0.75" />
            <line x1="8" y1="32" x2="56" y2="32" stroke="#BAE6FD" strokeWidth="1.5" opacity="0.75" />
            {/* Continents / Geometric Floating Nodes */}
            <circle cx="24" cy="22" r="3" fill="#34D399" filter={`url(#${uid}-glow)`} />
            <circle cx="42" cy="26" r="2.5" fill="#38BDF8" filter={`url(#${uid}-glow)`} />
            <circle cx="34" cy="40" r="3.2" fill="#FBBF24" filter={`url(#${uid}-glow)`} />
            {/* Outer Orbiting Data Ring (Isometric Tilt) */}
            <ellipse cx="32" cy="32" rx="28" ry="12" stroke={`url(#${uid}-globe-ring)`} strokeWidth="2.5" transform="rotate(-25 32 32)" />
            <circle cx="10" cy="20" r="2.5" fill="#FFFFFF" />
            {/* Specular Highlight Dome */}
            <ellipse cx="26" cy="20" rx="9" ry="5" fill="#FFFFFF" opacity="0.45" transform="rotate(-30 26 20)" />
          </g>
        )}

        {/* ── 2. 3D AI-DRIVEN ROBOT / NEURAL CORE ── */}
        {name === 'robot' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-bot-face`} x1="12" y1="14" x2="52" y2="54" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F1F5F9" />
                <stop offset="30%" stopColor="#CBD5E1" />
                <stop offset="70%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id={`${uid}-bot-screen`} x1="18" y1="22" x2="46" y2="46" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#052E16" />
                <stop offset="60%" stopColor="#064E3B" />
                <stop offset="100%" stopColor="#022C22" />
              </linearGradient>
            </defs>
            {/* Robot Head Outer Beveled Shell */}
            <rect x="12" y="16" width="40" height="34" rx="10" fill={`url(#${uid}-bot-face)`} />
            <rect x="13.5" y="17.5" width="37" height="31" rx="8.5" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.6" />
            {/* Floating Top Antenna / Transmitter */}
            <rect x="30" y="7" width="4" height="9" rx="2" fill="#94A3B8" />
            <circle cx="32" cy="7" r="4.5" fill="#10B981" filter={`url(#${uid}-glow)`} />
            <circle cx="32" cy="7" r="2" fill="#FFFFFF" />
            {/* Side Ear Nodes */}
            <rect x="7" y="27" width="5" height="12" rx="2.5" fill="#0EA5E9" />
            <rect x="52" y="27" width="5" height="12" rx="2.5" fill="#0EA5E9" />
            {/* Inner Cyber Screen Visor */}
            <rect x="17" y="22" width="30" height="22" rx="6" fill={`url(#${uid}-bot-screen)`} />
            <rect x="17" y="22" width="30" height="22" rx="6" stroke="#10B981" strokeWidth="1.2" opacity="0.7" />
            {/* Glowing Dual AI Scanner Eyes */}
            <ellipse cx="25" cy="32" rx="3.5" ry="4" fill="#34D399" filter={`url(#${uid}-glow)`} />
            <circle cx="26" cy="31" r="1.2" fill="#FFFFFF" />
            <ellipse cx="39" cy="32" rx="3.5" ry="4" fill="#34D399" filter={`url(#${uid}-glow)`} />
            <circle cx="40" cy="31" r="1.2" fill="#FFFFFF" />
            {/* Neural Mouth Equalizer Pulse */}
            <path d="M24 39H27M29 39H35M37 39H40" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
            {/* Top Gloss Glare */}
            <ellipse cx="32" cy="19" rx="14" ry="2.5" fill="#FFFFFF" opacity="0.5" />
          </g>
        )}

        {/* ── 3. 3D BATTLE-TESTED SHIELD ── */}
        {name === 'shield' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-shield-outer`} x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="35%" stopColor="#059669" />
                <stop offset="70%" stopColor="#047857" />
                <stop offset="100%" stopColor="#064E3B" />
              </linearGradient>
              <linearGradient id={`${uid}-shield-core`} x1="20" y1="16" x2="44" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FCD34D" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
            </defs>
            {/* 3D Outer Shield Shell */}
            <path
              d="M32 8L14 15V32C14 43.5 21.8 53.8 32 57C42.2 53.8 50 43.5 50 32V15L32 8Z"
              fill={`url(#${uid}-shield-outer)`}
            />
            {/* Beveled Edge Reflection */}
            <path
              d="M32 10L16 16.5V32C16 42.2 23 51.5 32 54.5V10Z"
              fill="#FFFFFF"
              opacity="0.22"
            />
            {/* Inner Crest Shield */}
            <path
              d="M32 16L20 21.5V33C20 40.5 25.2 47.5 32 50C38.8 47.5 44 40.5 44 33V21.5L32 16Z"
              fill={`url(#${uid}-shield-core)`}
            />
            {/* Institutional Monogram Check / Star */}
            <path
              d="M26 32L30 36L38 27"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${uid}-glow)`}
            />
            {/* Top Gloss */}
            <path d="M18 19L32 14L46 19" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
          </g>
        )}

        {/* ── 4. 3D UNFAIR ADVANTAGE (Volumetric Lightning Bolt) ── */}
        {name === 'lightning' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-bolt-main`} x1="16" y1="8" x2="48" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FEF08A" />
                <stop offset="30%" stopColor="#FACC15" />
                <stop offset="70%" stopColor="#EAB308" />
                <stop offset="100%" stopColor="#CA8A04" />
              </linearGradient>
              <linearGradient id={`${uid}-bolt-facet`} x1="28" y1="12" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            {/* 3D Depth Shadow Extrusion */}
            <path
              d="M38 6L18 32H32L24 58L48 28H34L42 6H38Z"
              fill="#713F12"
              transform="translate(2, 3)"
              opacity="0.6"
            />
            {/* Main Lightning Body */}
            <path
              d="M36 6L16 32H30L22 58L46 28H32L40 6H36Z"
              fill={`url(#${uid}-bolt-main)`}
            />
            {/* Left Beveled Facet (Light Catcher) */}
            <path
              d="M36 6L16 32H30L22 58L32 29L30 32H16L36 6Z"
              fill={`url(#${uid}-bolt-facet)`}
              opacity="0.75"
            />
            {/* Ambient Energy Flare */}
            <circle cx="31" cy="30" r="14" fill="#FACC15" opacity="0.25" filter={`url(#${uid}-glow)`} />
            {/* Specular Edge Highlights */}
            <path d="M36 7L18 31H29" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}

        {/* ── 5. 3D HIGH-SPEED SCALPING (Chrono Tachymeter) ── */}
        {name === 'clock' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-chrono-bezel`} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#E2E8F0" />
                <stop offset="40%" stopColor="#94A3B8" />
                <stop offset="80%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
              <radialGradient id={`${uid}-chrono-dial`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#042F2E" />
                <stop offset="60%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
            </defs>
            {/* Top Chrono Pusher Buttons */}
            <rect x="30" y="5" width="4" height="6" rx="1.5" fill="#CBD5E1" />
            <rect x="42" y="8" width="4" height="5" rx="1" transform="rotate(30 42 8)" fill="#0EA5E9" />
            {/* Outer Bezel (Dimensional Chrome Ring) */}
            <circle cx="32" cy="34" r="23" fill={`url(#${uid}-chrono-bezel)`} />
            <circle cx="32" cy="34" r="20" fill={`url(#${uid}-chrono-dial)`} />
            <circle cx="32" cy="34" r="19.5" stroke="#10B981" strokeWidth="1.2" opacity="0.65" />
            {/* Tachymeter Tick Marks */}
            <line x1="32" y1="17" x2="32" y2="21" stroke="#38BDF8" strokeWidth="2" />
            <line x1="32" y1="47" x2="32" y2="51" stroke="#38BDF8" strokeWidth="1.5" />
            <line x1="17" y1="34" x2="21" y2="34" stroke="#38BDF8" strokeWidth="1.5" />
            <line x1="43" y1="34" x2="47" y2="34" stroke="#38BDF8" strokeWidth="2" />
            {/* Sub-Dial */}
            <circle cx="32" cy="40" r="5" stroke="#64748B" strokeWidth="1" />
            {/* High-Speed Orange Chrono Needle (Sub-Minute) */}
            <line x1="32" y1="34" x2="42" y2="24" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" filter={`url(#${uid}-glow)`} />
            <circle cx="32" cy="34" r="3" fill="#FFFFFF" />
            {/* Specular Glare Arc */}
            <path d="M19 23C22 19 27 16 32 16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </g>
        )}

        {/* ── 6. 3D INTRADAY MOMENTUM (Volumetric Bar Chart) ── */}
        {name === 'chart' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-bar1`} x1="12" y1="34" x2="22" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0369A1" />
              </linearGradient>
              <linearGradient id={`${uid}-bar2`} x1="26" y1="20" x2="36" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id={`${uid}-bar3`} x1="40" y1="10" x2="50" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#A78BFA" />
                <stop offset="100%" stopColor="#6D28D9" />
              </linearGradient>
            </defs>
            {/* Base Grid Platform */}
            <path d="M8 52H56" stroke="#64748B" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            {/* Bar 1 (Left - Cyan) */}
            <rect x="12" y="34" width="10" height="18" rx="2" fill={`url(#${uid}-bar1)`} />
            <ellipse cx="17" cy="34" rx="5" ry="1.8" fill="#BAE6FD" />
            {/* Bar 2 (Middle - Emerald Growth) */}
            <rect x="26" y="20" width="10" height="32" rx="2" fill={`url(#${uid}-bar2)`} />
            <ellipse cx="31" cy="20" rx="5" ry="1.8" fill="#A7F3D0" />
            {/* Bar 3 (Right - Mega Breakout Purple) */}
            <rect x="40" y="10" width="10" height="42" rx="2" fill={`url(#${uid}-bar3)`} />
            <ellipse cx="45" cy="10" rx="5" ry="1.8" fill="#DDD6FE" />
            {/* Ascending Golden Trend Arrow Ribbon */}
            <path
              d="M14 38L27 24L41 12L52 8"
              stroke="#FBBF24"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${uid}-glow)`}
            />
            <path d="M46 8H52V14" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* ── 7. 3D SWING TRADING (Volumetric Sine Wave Ribbon) ── */}
        {name === 'wave' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-wave-grad`} x1="8" y1="16" x2="56" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="35%" stopColor="#10B981" />
                <stop offset="70%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
            </defs>
            {/* Background Echo Wave (Depth Layer) */}
            <path
              d="M8 38C14 26 22 26 28 38C34 50 42 50 48 38C52 30 56 30 58 34"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              transform="translate(0, 5)"
            />
            {/* Main Thick 3D Liquid Wave Ribbon */}
            <path
              d="M8 32C14 18 22 18 28 32C34 46 42 46 48 32C52 22 56 22 58 26"
              stroke={`url(#${uid}-wave-grad)`}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
            {/* Top Light Highlight Sheen */}
            <path
              d="M9 31C14 19 21 19 27 31C33 45 41 45 47 31"
              stroke="#FFFFFF"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.75"
            />
            {/* Crest & Trough Energy Markers */}
            <circle cx="18" cy="20" r="3.5" fill="#34D399" filter={`url(#${uid}-glow)`} />
            <circle cx="38" cy="44" r="3.5" fill="#38BDF8" filter={`url(#${uid}-glow)`} />
          </g>
        )}

        {/* ── 8. 3D OPTIONS ARCHITECTURE (Holographic Target Reticle) ── */}
        {name === 'target' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-target-ring`} x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F43F5E" />
                <stop offset="50%" stopColor="#FB7185" />
                <stop offset="100%" stopColor="#BE123C" />
              </linearGradient>
            </defs>
            {/* Outer Concentric Depth Ring */}
            <circle cx="32" cy="32" r="23" stroke={`url(#${uid}-target-ring)`} strokeWidth="2.5" opacity="0.8" />
            {/* Middle Segmented Ring */}
            <circle cx="32" cy="32" r="16" stroke="#38BDF8" strokeWidth="2" strokeDasharray="6 4" />
            {/* Inner Ring */}
            <circle cx="32" cy="32" r="9" stroke="#FBBF24" strokeWidth="2.5" />
            {/* Central High-Intensity Laser Core */}
            <circle cx="32" cy="32" r="4.5" fill="#F43F5E" filter={`url(#${uid}-glow)`} />
            <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
            {/* Crosshair Cardinal Reticle Axes */}
            <line x1="32" y1="5" x2="32" y2="13" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="32" y1="51" x2="32" y2="59" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="5" y1="32" x2="13" y2="32" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="51" y1="32" x2="59" y2="32" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* ── 9. 3D LONG-TERM ALPHA (Faceted Brilliant Diamond) ── */}
        {name === 'diamond' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-gem-top`} x1="16" y1="14" x2="48" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#A5F3FC" />
                <stop offset="50%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <linearGradient id={`${uid}-gem-facet1`} x1="12" y1="26" x2="32" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#0369A1" />
              </linearGradient>
              <linearGradient id={`${uid}-gem-facet2`} x1="32" y1="26" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <linearGradient id={`${uid}-gem-center`} x1="22" y1="26" x2="42" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#E0F2FE" />
                <stop offset="50%" stopColor="#7DD3FC" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
            </defs>
            {/* Diamond Crown (Top Trapezoid) */}
            <polygon points="22,14 42,14 52,26 12,26" fill={`url(#${uid}-gem-top)`} />
            <polygon points="26,14 38,14 42,26 22,26" fill="#F0FDFA" opacity="0.6" />
            {/* Diamond Pavilion Lower Facets */}
            <polygon points="12,26 24,26 32,52" fill={`url(#${uid}-gem-facet1)`} />
            <polygon points="40,26 52,26 32,52" fill={`url(#${uid}-gem-facet2)`} />
            <polygon points="24,26 40,26 32,52" fill={`url(#${uid}-gem-center)`} />
            {/* Light Flare Starburst on Crown */}
            <circle cx="28" cy="18" r="2.5" fill="#FFFFFF" filter={`url(#${uid}-glow)`} />
            <line x1="28" y1="13" x2="28" y2="23" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
            <line x1="23" y1="18" x2="33" y2="18" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
          </g>
        )}

        {/* ── 10. 3D PATTERN RECOGNITION (Isometric Matrix Cube) ── */}
        {name === 'pattern' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-cube-top`} x1="16" y1="12" x2="48" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
              <linearGradient id={`${uid}-cube-left`} x1="16" y1="28" x2="32" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#065F46" />
              </linearGradient>
              <linearGradient id={`${uid}-cube-right`} x1="32" y1="28" x2="48" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#047857" />
                <stop offset="100%" stopColor="#022C22" />
              </linearGradient>
            </defs>
            {/* Isometric Cube Top Face */}
            <polygon points="32,10 50,20 32,30 14,20" fill={`url(#${uid}-cube-top)`} />
            {/* Left Face */}
            <polygon points="14,20 32,30 32,52 14,42" fill={`url(#${uid}-cube-left)`} />
            {/* Right Face */}
            <polygon points="32,30 50,20 50,42 32,52" fill={`url(#${uid}-cube-right)`} />
            {/* Center Neural Node */}
            <circle cx="32" cy="30" r="3.5" fill="#FFFFFF" filter={`url(#${uid}-glow)`} />
            {/* Beveled Highlights */}
            <line x1="32" y1="10" x2="32" y2="30" stroke="#A7F3D0" strokeWidth="1.2" opacity="0.7" />
            <line x1="14" y1="20" x2="32" y2="30" stroke="#A7F3D0" strokeWidth="1.2" opacity="0.7" />
          </g>
        )}

        {/* ── 11. 3D TREND TOPOLOGY (Curved Ascending Vector) ── */}
        {name === 'trend' && (
          <g filter={`url(#${uid}-shadow)`}>
            <defs>
              <linearGradient id={`${uid}-trend-vector`} x1="10" y1="50" x2="54" y2="12" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#FEF08A" />
              </linearGradient>
            </defs>
            {/* 3D Extruded Ribbon Path */}
            <path
              d="M10 48C20 48 24 38 32 30C40 22 44 18 52 12"
              stroke="#78350F"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              transform="translate(1, 3)"
              opacity="0.5"
            />
            <path
              d="M10 48C20 48 24 38 32 30C40 22 44 18 52 12"
              stroke={`url(#${uid}-trend-vector)`}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M10 47C20 47 24 37 32 29C40 21 44 17 50 12"
              stroke="#FFFFFF"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* Arrowhead Cap */}
            <polygon points="54,10 44,11 49,20" fill="#FEF08A" filter={`url(#${uid}-glow)`} />
          </g>
        )}

        {/* ── 12. 3D VOLUME FOOTPRINT (Order-Flow Depth Blocks) ── */}
        {name === 'footprint' && (
          <g filter={`url(#${uid}-shadow)`}>
            {/* Stacked volumetric depth blocks */}
            <rect x="12" y="14" width="22" height="9" rx="2" fill="#A855F7" />
            <rect x="36" y="14" width="16" height="9" rx="2" fill="#3B82F6" />
            <rect x="12" y="26" width="28" height="9" rx="2" fill="#8B5CF6" />
            <rect x="42" y="26" width="10" height="9" rx="2" fill="#60A5FA" />
            <rect x="12" y="38" width="18" height="9" rx="2" fill="#7C3AED" />
            <rect x="32" y="38" width="20" height="9" rx="2" fill="#2563EB" />
            {/* Specular Edge Highlights */}
            <line x1="12" y1="15" x2="34" y2="15" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
            <line x1="12" y1="27" x2="40" y2="27" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
            <line x1="12" y1="39" x2="30" y2="39" stroke="#FFFFFF" strokeWidth="1" opacity="0.6" />
          </g>
        )}

        {/* ── 13. 3D SUPPORT & RESISTANCE (Hexagonal Pillar) ── */}
        {name === 'support' && (
          <g filter={`url(#${uid}-shadow)`}>
            <polygon points="32,8 50,18 50,42 32,52 14,42 14,18" fill="#10B981" />
            <polygon points="32,8 50,18 32,28 14,18" fill="#34D399" />
            <polygon points="14,18 32,28 32,52 14,42" fill="#059669" />
            <polygon points="32,28 50,18 50,42 32,52" fill="#047857" />
            <circle cx="32" cy="28" r="4" fill="#FFFFFF" opacity="0.8" filter={`url(#${uid}-glow)`} />
          </g>
        )}

        {/* ── 14. 3D MICROSTRUCTURE (L2 Radar Aperture) ── */}
        {name === 'microstructure' && (
          <g filter={`url(#${uid}-shadow)`}>
            <circle cx="32" cy="32" r="22" stroke="#0284C7" strokeWidth="3" />
            <circle cx="32" cy="32" r="16" stroke="#06B6D4" strokeWidth="2" strokeDasharray="4 3" />
            <circle cx="32" cy="32" r="10" stroke="#38BDF8" strokeWidth="2" />
            <circle cx="32" cy="32" r="4" fill="#38BDF8" filter={`url(#${uid}-glow)`} />
            <path d="M32 10L32 54" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
            <path d="M10 32L54 32" stroke="#0284C7" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          </g>
        )}

        {/* ── 15. 3D BULL / BEAR BALANCE SCALE ── */}
        {name === 'scale' && (
          <g filter={`url(#${uid}-shadow)`}>
            {/* Central Pillar */}
            <rect x="30" y="16" width="4" height="34" rx="1.5" fill="#CBD5E1" />
            <circle cx="32" cy="16" r="4" fill="#FBBF24" />
            {/* Tilted Beam */}
            <line x1="14" y1="20" x2="50" y2="28" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
            {/* Left Pan (Bullish Green) */}
            <line x1="14" y1="21" x2="14" y2="34" stroke="#94A3B8" strokeWidth="1.5" />
            <path d="M7 34C7 38 21 38 21 34Z" fill="#10B981" filter={`url(#${uid}-glow)`} />
            {/* Right Pan (Bearish Red) */}
            <line x1="50" y1="29" x2="50" y2="42" stroke="#94A3B8" strokeWidth="1.5" />
            <path d="M43 42C43 46 57 46 57 42Z" fill="#F43F5E" />
            {/* Base Stand */}
            <rect x="22" y="49" width="20" height="4" rx="2" fill="#64748B" />
          </g>
        )}

        {/* ── 16. 3D RISK PROBABILITY (Defense Fortress Prism) ── */}
        {name === 'risk' && (
          <g filter={`url(#${uid}-shadow)`}>
            <polygon points="32,8 52,48 12,48" fill="#DC2626" />
            <polygon points="32,10 50,46 32,46" fill="#EF4444" opacity="0.75" />
            <polygon points="32,10 32,46 14,46" fill="#B91C1C" />
            {/* Exclamation / Shield Core */}
            <rect x="30.5" y="22" width="3" height="12" rx="1.5" fill="#FFFFFF" />
            <circle cx="32" cy="39" r="2" fill="#FFFFFF" />
            <polygon points="32,12 47,44 17,44" stroke="#FECACA" strokeWidth="1" fill="none" opacity="0.6" />
          </g>
        )}

        {/* ── 17. 3D INFO / NOTICE ── */}
        {name === 'info' && (
          <g filter={`url(#${uid}-shadow)`}>
            <circle cx="32" cy="32" r="22" fill="#0284C7" />
            <circle cx="32" cy="32" r="20" stroke="#38BDF8" strokeWidth="1.5" opacity="0.8" />
            <rect x="30" y="27" width="4" height="15" rx="2" fill="#FFFFFF" />
            <circle cx="32" cy="20" r="3" fill="#FFFFFF" />
            <ellipse cx="26" cy="18" rx="8" ry="4" fill="#FFFFFF" opacity="0.35" transform="rotate(-30 26 18)" />
          </g>
        )}
      </svg>
    </div>
  );
}
