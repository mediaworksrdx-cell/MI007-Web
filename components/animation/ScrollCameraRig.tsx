'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface ScrollCameraRigProps {
  onProgressChange: (progress: number) => void;
}

export default function ScrollCameraRig({ onProgressChange }: ScrollCameraRigProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (!containerRef.current) return;

    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      onUpdate: (self) => {
        onProgressChange(self.progress);
        
        const vh = self.progress * 700;
        const dispatchIfCrossed = (val: number, name: string) => {
          if (Math.abs(vh - val) < 6) {
            window.dispatchEvent(new CustomEvent(name));
          }
        };

        dispatchIfCrossed(100, 'section-movement');
        dispatchIfCrossed(200, 'section-ai-analysis');
        dispatchIfCrossed(350, 'section-intelligence-engine');
        dispatchIfCrossed(500, 'section-terminal');
        dispatchIfCrossed(600, 'section-market-intelligence');
        dispatchIfCrossed(680, 'section-cta');
      },
    });

    return () => {
      st.kill();
    };
  }, [onProgressChange]);

  return (
    <div
      ref={containerRef}
      style={{
        height: '700vh',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <div data-section="hero" style={{ height: '100vh' }} />
      <div data-section="movement" style={{ height: '100vh' }} />
      <div data-section="ai-analysis" style={{ height: '100vh' }} />
      <div data-section="intelligence-engine" style={{ height: '100vh' }} />
      <div data-section="terminal" style={{ height: '100vh' }} />
      <div data-section="market-intelligence" style={{ height: '100vh' }} />
      <div data-section="final-cta" style={{ height: '100vh' }} />
    </div>
  );
}
