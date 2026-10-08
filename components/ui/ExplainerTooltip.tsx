'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ExplainerTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  underline?: boolean;
}

export function ExplainerTooltip({
  children,
  title,
  description,
  badge,
  position = 'top',
  className = '',
  underline = false,
}: ExplainerTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(true), 120);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(false), 100);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Position coordinates & arrow styling
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2.5',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent border-t-[6px] border-x-[6px] border-b-0',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent border-b-[6px] border-x-[6px] border-t-0',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent border-l-[6px] border-y-[6px] border-r-0',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent border-r-[6px] border-y-[6px] border-l-0',
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsOpen((prev) => !prev)}
      role="tooltip"
      aria-expanded={isOpen}
    >
      <div
        className={`cursor-help transition-all duration-150 ${
          underline
            ? 'underline decoration-dotted decoration-emerald-500/60 underline-offset-4 hover:decoration-emerald-400'
            : ''
        }`}
      >
        {children}
      </div>

      {isOpen && (
        <div
          className={`absolute ${positionClasses[position]} z-[999] w-64 sm:w-72 p-3 sm:p-3.5 rounded-xl border border-emerald-500/40 bg-slate-900/98 text-white shadow-[0_12px_36px_rgba(0,0,0,0.65)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none select-none`}
        >
          {/* Header Strip with Badge */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-extrabold text-[12.5px] text-white tracking-tight flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {title}
            </span>
            {badge && (
              <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                {badge}
              </span>
            )}
          </div>

          {/* Description Body */}
          <p className="text-[11px] sm:text-[11.5px] text-slate-200 leading-relaxed font-normal">
            {description}
          </p>

          {/* Triangular Arrow Pointer */}
          <div
            className={`absolute w-0 h-0 pointer-events-none ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

export default ExplainerTooltip;
