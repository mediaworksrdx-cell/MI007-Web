'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAppTheme } from '@/lib/themeContext';

// Dynamically import Three.js 3D Canvas Scene with SSR disabled
const DynamicFalcon3DCanvas = dynamic(
  () => import('./Falcon3DCanvasWrapper'),
  { ssr: false }
);

export interface Falcon3DLogoProps {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  popoutScale?: number;
  isHoveredExternal?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  isNavbar?: boolean;
}

export function Falcon3DLogo({
  src = '/images/logo-falcon-transparent.png',
  alt = 'Market Intelligence MI- 007 Falcon',
  width = 64,
  height = 64,
  priority = false,
  className = 'w-full h-full object-contain',
  containerClassName = '',
  popoutScale = 1.35,
  isHoveredExternal,
  onHoverChange,
  isNavbar = false,
}: Falcon3DLogoProps) {
  const [internalHovered, setInternalHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useAppTheme();

  // Combine external or internal hover state
  const isHovered = isHoveredExternal !== undefined ? isHoveredExternal : internalHovered;

  // Mount on client side immediately so 3D Canvas is warm and ready
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Theme-coordinated rim glow
  const accentColor =
    theme === 'ivory'
      ? '#B79A63' // muted gold
      : theme === 'graphite'
      ? '#70B7A0' // muted emerald
      : theme === 'capital'
      ? '#65B9D8' // cyan
      : '#65A9D6'; // arctic sky blue

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to +1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to +1
    setMousePos({ x, y });
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setInternalHovered(true);
    onHoverChange?.(true);
    handleMouseMove(e);
  }, [handleMouseMove, onHoverChange]);

  const handleMouseLeave = useCallback(() => {
    setInternalHovered(false);
    onHoverChange?.(false);
    setMousePos({ x: 0, y: 0 });
  }, [onHoverChange]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none cursor-pointer group flex items-center justify-center bg-transparent ${containerClassName}`}
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
      title="Hover to activate MI007 3D Falcon Hologram"
    >
      {/* ── Base 2D Logo Image (Transparent Falcon, zero background) ── */}
      <div
        className={`w-full h-full flex items-center justify-center transition-all duration-300 pointer-events-none bg-transparent ${
          isHovered
            ? 'opacity-0 scale-110 drop-shadow-[0_16px_32px_rgba(14,165,233,0.45)]'
            : 'opacity-100 scale-100'
        }`}
        style={{
          transform: isHovered
            ? (isNavbar
                ? `scale(${popoutScale}) translateY(3px) rotateY(${mousePos.x * 12}deg)`
                : `scale(${popoutScale}) translateZ(35px) rotateY(${mousePos.x * 20}deg) rotateX(${-mousePos.y * 15}deg)`)
            : 'scale(1) translateZ(0px)',
          transformOrigin: isNavbar ? 'top center' : 'center center',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          className={className}
        />
      </div>

      {/* ── True 3D Volumetric Pop-Up Model (Pre-mounted WebGL, Zero background) ── */}
      {isMounted && (
        <div
          className={`absolute pointer-events-none transition-all duration-300 z-50 flex items-center justify-center bg-transparent ${
            isHovered
              ? 'opacity-100 drop-shadow-[0_16px_36px_rgba(14,165,233,0.45)]'
              : 'opacity-0 pointer-events-none'
          }`}
          style={
            isNavbar
              ? {
                  top: '0px',
                  left: '50%',
                  transform: isHovered
                    ? `translateX(-50%) translateY(3px) scale(${popoutScale})`
                    : 'translateX(-50%) translateY(0px) scale(0.9)',
                  transformOrigin: 'top center',
                  width: '110px',
                  height: '110px',
                }
              : {
                  inset: 0,
                  transform: isHovered
                    ? `scale(${popoutScale}) translateZ(45px)`
                    : 'scale(0.85) translateZ(0px)',
                  transformOrigin: 'center center',
                }
          }
        >
          {/* Expanded 3D Canvas Box for zero-clipping 360 spin */}
          <div
            className="relative flex items-center justify-center bg-transparent pointer-events-none"
            style={
              isNavbar
                ? {
                    width: '100%',
                    height: '100%',
                  }
                : {
                    width: '200%',
                    height: '200%',
                    minWidth: '140px',
                    minHeight: '140px',
                  }
            }
          >
            <DynamicFalcon3DCanvas
              isHovered={isHovered}
              mousePos={mousePos}
              accentColor={accentColor}
              isNavbar={isNavbar}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Falcon3DLogo;
