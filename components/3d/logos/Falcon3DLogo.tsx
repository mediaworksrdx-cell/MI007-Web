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
  popoutScale = 1.08,
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
      className={`relative select-none cursor-pointer group flex items-center justify-center bg-transparent w-full h-full ${containerClassName}`}
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* ── Base 2D Logo Image (Transparent Falcon, zero background) ── */}
      <div
        className={`w-full h-full flex items-center justify-center transition-all duration-300 pointer-events-none bg-transparent ${
          isHovered ? 'opacity-0 scale-102' : 'opacity-100 scale-100'
        }`}
        style={{
          transformOrigin: 'center center',
          transition: 'transform 0.25s ease, opacity 0.2s ease',
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

      {/* ── True 3D Volumetric Pop-Up Model (Composed 100% into placeholder) ── */}
      {isMounted && (
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-300 z-50 flex items-center justify-center bg-transparent ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            transform: isHovered
              ? (isNavbar ? 'scale(1.04)' : `scale(${Math.min(popoutScale, 1.1)}) translateZ(12px)`)
              : 'scale(1) translateZ(0px)',
            transformOrigin: 'center center',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
          }}
        >
          <div className="w-full h-full relative flex items-center justify-center bg-transparent pointer-events-none">
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
