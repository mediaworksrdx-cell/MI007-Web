'use client';

import React, { useEffect, useRef } from 'react';

interface CandlestickParticle {
  type: 'candle';
  x: number;
  y: number;
  width: number;
  bodyHeight: number;
  upperWick: number;
  lowerWick: number;
  vy: number;
  vx: number;
  side: 'green' | 'red';
  color: string;
  borderColor: string;
  glowColor: string;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  depth: number;
}

interface PriceBadgeParticle {
  type: 'badge';
  x: number;
  y: number;
  label: string;
  vy: number;
  vx: number;
  side: 'green' | 'red';
  textColor: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  depth: number;
  badgeWidth: number;
  badgeHeight: number;
}

interface ArrowParticle {
  type: 'arrow';
  x: number;
  y: number;
  size: number;
  vy: number;
  vx: number;
  side: 'green' | 'red';
  color: string;
  glowColor: string;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  depth: number;
}

interface GlowOrbParticle {
  type: 'orb';
  x: number;
  y: number;
  radius: number;
  vy: number;
  vx: number;
  side: 'green' | 'red';
  color: string;
  glowColor: string;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  depth: number;
}

type MarketParticle = CandlestickParticle | PriceBadgeParticle | ArrowParticle | GlowOrbParticle;

const GREEN_LABELS = [
  '+3.42% ▲',
  '24,850 ▲',
  'L3 SWEEP',
  '+1.85% ▲',
  'BUY BLOCK',
  'BID +420',
  'VOL ▲',
  'ORDER FLOW',
  '+0.92% ▲',
  'BREAKOUT ▲',
  '+4.15% ▲',
];

const RED_LABELS = [
  '-2.18% ▼',
  '24,790 ▼',
  'LIQ HUNT',
  '-1.42% ▼',
  'SELL WALL',
  'ASK -350',
  'VOL ▼',
  'DELTA SWEEP',
  '-0.75% ▼',
  'REJECTION ▼',
  '-3.05% ▼',
];

export default function GlobalMarketCanvasFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollRef = useRef({ y: 0, prevY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / width - 0.5) * 40;
      mouseRef.current.targetY = (e.clientY / height - 0.5) * 40;
    };

    const onScroll = () => {
      scrollRef.current.y = window.scrollY;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    const particles: MarketParticle[] = [];

    // Helper: spawn a candlestick particle (Green or Red)
    const createCandle = (side?: 'green' | 'red', customY?: number): CandlestickParticle => {
      const actualSide = side || (Math.random() > 0.5 ? 'green' : 'red');
      const isGreen = actualSide === 'green';
      const depth = 0.4 + Math.random() * 0.7;
      const w = Math.round((3.5 + Math.random() * 3.5) * depth);
      const h = Math.round((12 + Math.random() * 24) * depth);
      const upperW = Math.round((5 + Math.random() * 12) * depth);
      const lowerW = Math.round((5 + Math.random() * 12) * depth);

      const x = isGreen
        ? Math.random() * (width * 0.46) + width * 0.02
        : width * 0.52 + Math.random() * (width * 0.46);

      const y = customY !== undefined ? customY : isGreen ? height + 25 : -25;
      const speed = (0.35 + Math.random() * 0.55) * depth;

      return {
        type: 'candle',
        x,
        y,
        width: w,
        bodyHeight: h,
        upperWick: upperW,
        lowerWick: lowerW,
        vy: isGreen ? -speed : speed,
        vx: (Math.random() - 0.5) * 0.25,
        side: actualSide,
        color: isGreen ? '#10B981' : '#EF4444',
        borderColor: isGreen ? '#059669' : '#DC2626',
        glowColor: isGreen ? '#10B981' : '#EF4444',
        alpha: 0,
        maxAlpha: 0.35, // Exactly 35% opacity
        life: 0,
        maxLife: 320 + Math.random() * 260,
        depth,
      };
    };

    // Helper: spawn a price badge particle (Green or Red)
    const createBadge = (side?: 'green' | 'red', customY?: number): PriceBadgeParticle => {
      const actualSide = side || (Math.random() > 0.5 ? 'green' : 'red');
      const isGreen = actualSide === 'green';
      const labels = isGreen ? GREEN_LABELS : RED_LABELS;
      const label = labels[Math.floor(Math.random() * labels.length)];
      const depth = 0.6 + Math.random() * 0.6;

      const x = isGreen
        ? Math.random() * (width * 0.44) + width * 0.03
        : width * 0.53 + Math.random() * (width * 0.44);

      const y = customY !== undefined ? customY : isGreen ? height + 30 : -30;
      const speed = (0.30 + Math.random() * 0.50) * depth;

      return {
        type: 'badge',
        x,
        y,
        label,
        vy: isGreen ? -speed : speed,
        vx: (Math.random() - 0.5) * 0.2,
        side: actualSide,
        textColor: isGreen ? '#065F46' : '#991B1B',
        bgColor: isGreen ? 'rgba(209, 250, 229, 0.92)' : 'rgba(254, 226, 226, 0.92)',
        borderColor: isGreen ? '#059669' : '#DC2626',
        glowColor: isGreen ? '#10B981' : '#EF4444',
        alpha: 0,
        maxAlpha: 0.35, // Exactly 35% opacity
        life: 0,
        maxLife: 360 + Math.random() * 280,
        depth,
        badgeWidth: label.length * 7.5 + 18,
        badgeHeight: 22,
      };
    };

    // Helper: spawn directional arrow (Green or Red)
    const createArrow = (side?: 'green' | 'red', customY?: number): ArrowParticle => {
      const actualSide = side || (Math.random() > 0.5 ? 'green' : 'red');
      const isGreen = actualSide === 'green';
      const depth = 0.6 + Math.random() * 0.6;
      const size = (8 + Math.random() * 6) * depth;

      const x = isGreen
        ? Math.random() * (width * 0.45) + width * 0.03
        : width * 0.52 + Math.random() * (width * 0.45);

      const y = customY !== undefined ? customY : isGreen ? height + 20 : -20;
      const speed = (0.42 + Math.random() * 0.70) * depth;

      return {
        type: 'arrow',
        x,
        y,
        size,
        vy: isGreen ? -speed : speed,
        vx: (Math.random() - 0.5) * 0.25,
        side: actualSide,
        color: isGreen ? '#10B981' : '#EF4444',
        glowColor: isGreen ? '#10B981' : '#EF4444',
        alpha: 0,
        maxAlpha: 0.35, // Exactly 35% opacity
        life: 0,
        maxLife: 280 + Math.random() * 220,
        depth,
      };
    };

    // Helper: spawn floating luminous glowing orb (Green or Red)
    const createOrb = (side?: 'green' | 'red', customY?: number): GlowOrbParticle => {
      const actualSide = side || (Math.random() > 0.5 ? 'green' : 'red');
      const isGreen = actualSide === 'green';
      const depth = 0.5 + Math.random() * 0.7;
      const radius = (3.0 + Math.random() * 4.5) * depth;

      const x = Math.random() * width;
      const y = customY !== undefined ? customY : Math.random() * height;
      const speed = (0.28 + Math.random() * 0.65) * depth;

      return {
        type: 'orb',
        x,
        y,
        radius,
        vy: isGreen ? -speed : speed * 0.85,
        vx: (Math.random() - 0.5) * 0.40,
        side: actualSide,
        color: isGreen ? '#10B981' : '#EF4444',
        glowColor: isGreen ? '#10B981' : '#EF4444',
        alpha: 0,
        maxAlpha: 0.35, // Exactly 35% opacity
        life: 0,
        maxLife: 350 + Math.random() * 300,
        depth,
      };
    };

    // Pre-populate particles distributed across whole height
    const initialCandles = 32;
    const initialBadges = 18;
    const initialArrows = 26;
    const initialOrbs = 50;

    for (let i = 0; i < initialCandles; i++) {
      const p = createCandle(i % 2 === 0 ? 'green' : 'red', Math.random() * height);
      p.life = Math.random() * p.maxLife * 0.8;
      particles.push(p);
    }

    for (let i = 0; i < initialBadges; i++) {
      const p = createBadge(i % 2 === 0 ? 'green' : 'red', Math.random() * height);
      p.life = Math.random() * p.maxLife * 0.8;
      particles.push(p);
    }

    for (let i = 0; i < initialArrows; i++) {
      const p = createArrow(i % 2 === 0 ? 'green' : 'red', Math.random() * height);
      p.life = Math.random() * p.maxLife * 0.8;
      particles.push(p);
    }

    for (let i = 0; i < initialOrbs; i++) {
      const p = createOrb(i % 2 === 0 ? 'green' : 'red', Math.random() * height);
      p.life = Math.random() * p.maxLife * 0.8;
      particles.push(p);
    }

    // Main 60fps render loop
    const render = () => {
      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Scroll delta parallax
      const scrollDelta = scrollRef.current.y - scrollRef.current.prevY;
      scrollRef.current.prevY = scrollRef.current.y;

      ctx.clearRect(0, 0, width, height);

      // Subtle ambient Green and Red background glows
      const gradGreen = ctx.createRadialGradient(
        width * 0.18 + mouseRef.current.x * 2,
        height * 0.40 + mouseRef.current.y * 2,
        25,
        width * 0.18,
        height * 0.40,
        width * 0.48
      );
      gradGreen.addColorStop(0, 'rgba(16, 185, 129, 0.06)');
      gradGreen.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradGreen;
      ctx.fillRect(0, 0, width, height);

      const gradRed = ctx.createRadialGradient(
        width * 0.82 - mouseRef.current.x * 2,
        height * 0.50 - mouseRef.current.y * 2,
        25,
        width * 0.82,
        height * 0.50,
        width * 0.48
      );
      gradRed.addColorStop(0, 'rgba(239, 68, 68, 0.06)');
      gradRed.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradRed;
      ctx.fillRect(0, 0, width, height);

      // Iterate and draw each particle
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        // Fade in and out with peak steady opacity at 35% (0.35)
        if (p.life < 30) {
          p.alpha = (p.life / 30) * p.maxAlpha;
        } else if (p.life > p.maxLife - 30) {
          p.alpha = ((p.maxLife - p.life) / 30) * p.maxAlpha;
        } else {
          p.alpha = p.maxAlpha;
        }

        // Apply motion + scroll delta + mouse parallax
        p.x += p.vx + (mouseRef.current.x * 0.015 * p.depth);
        p.y += p.vy - (scrollDelta * 0.15 * p.depth);

        // Respawn if expired or out of bounds
        const isOutOfBounds =
          p.y < -60 || p.y > height + 60 || p.x < -40 || p.x > width + 40 || p.life >= p.maxLife;

        if (isOutOfBounds) {
          particles.splice(i, 1);
          if (p.type === 'candle') {
            particles.push(createCandle(p.side));
          } else if (p.type === 'badge') {
            particles.push(createBadge(p.side));
          } else if (p.type === 'arrow') {
            particles.push(createArrow(p.side));
          } else {
            particles.push(createOrb(p.side));
          }
          continue;
        }

        ctx.save();
        // ── 35% OPACITY ──
        ctx.globalAlpha = Math.max(0, Math.min(0.35, p.alpha));

        // ── BLUR 10 GLOW (GREEN AND RED) ──
        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = 10;

        if (p.type === 'candle') {
          // ── Draw Candlestick with 10px blur glow ──
          ctx.strokeStyle = p.borderColor;
          ctx.fillStyle = p.color;
          ctx.lineWidth = 1.6;

          // Upper wick
          ctx.beginPath();
          ctx.moveTo(p.x + p.width / 2, p.y - p.upperWick);
          ctx.lineTo(p.x + p.width / 2, p.y);
          ctx.stroke();

          // Body
          ctx.fillRect(p.x, p.y, p.width, p.bodyHeight);
          ctx.strokeRect(p.x, p.y, p.width, p.bodyHeight);

          // Lower wick
          ctx.beginPath();
          ctx.moveTo(p.x + p.width / 2, p.y + p.bodyHeight);
          ctx.lineTo(p.x + p.width / 2, p.y + p.bodyHeight + p.lowerWick);
          ctx.stroke();

        } else if (p.type === 'badge') {
          // ── Draw Price Movement Micro-Badge with 10px blur glow ──
          const bw = p.badgeWidth;
          const bh = p.badgeHeight;
          const r = 5;

          // Rounded Rect Background
          ctx.fillStyle = p.bgColor;
          ctx.strokeStyle = p.borderColor;
          ctx.lineWidth = 1.4;

          ctx.beginPath();
          ctx.roundRect(p.x, p.y, bw, bh, r);
          ctx.fill();
          ctx.stroke();

          // Badge Text
          ctx.fillStyle = p.textColor;
          ctx.font = '700 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.label, p.x + bw / 2, p.y + bh / 2);

        } else if (p.type === 'arrow') {
          // ── Draw Directional Arrow with 10px blur glow ──
          ctx.fillStyle = p.color;
          ctx.beginPath();
          const s = p.size;
          if (p.side === 'green') {
            // Up Arrow ▲
            ctx.moveTo(p.x, p.y - s);
            ctx.lineTo(p.x - s * 0.75, p.y + s * 0.75);
            ctx.lineTo(p.x + s * 0.75, p.y + s * 0.75);
          } else {
            // Down Arrow ▼
            ctx.moveTo(p.x, p.y + s);
            ctx.lineTo(p.x - s * 0.75, p.y - s * 0.75);
            ctx.lineTo(p.x + s * 0.75, p.y - s * 0.75);
          }
          ctx.closePath();
          ctx.fill();

        } else if (p.type === 'orb') {
          // ── Draw Glowing Spherical Orb with 10px blur glow ──
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] w-full h-full"
    />
  );
}
