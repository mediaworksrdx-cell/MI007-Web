'use client';

import React, { useEffect, useRef } from 'react';

interface HeroCanvasFXProps {
  mouseOffset: { x: number; y: number }; // x from -0.5 (left/bull) to +0.5 (right/bear)
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  side: 'green' | 'red';
  color: string;
  wobbleSpeed: number;
  wobbleAmp: number;
}

interface Arc {
  points: { x: number; y: number }[];
  alpha: number;
  color: string;
}

export default function HeroCanvasFX({ mouseOffset }: HeroCanvasFXProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);

    const particles: Particle[] = [];
    const arcs: Arc[] = [];
    let lastArcTime = 0;

    // Palette: Glowing Green and Red
    const greenColors = ['#10B981', '#059669', '#047857', '#34D399'];
    const redColors = ['#EF4444', '#DC2626', '#E11D48', '#F87171'];

    const spawnParticle = (side: 'green' | 'red') => {
      const isGreen = side === 'green';
      const x = isGreen
        ? Math.random() * (width * 0.48) + width * 0.02
        : width * 0.50 + Math.random() * (width * 0.48);
      
      const y = height * 0.35 + Math.random() * (height * 0.6);
      const size = Math.random() * 3.2 + 1.6;
      const maxLife = Math.random() * 140 + 90;
      const colors = isGreen ? greenColors : redColors;
      const color = colors[Math.floor(Math.random() * colors.length)];

      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.6 + (isGreen ? -0.15 : 0.15),
        vy: -(Math.random() * 1.4 + 0.6),
        size,
        alpha: 0,
        maxAlpha: 0.35, // Exactly 35% opacity
        life: 0,
        maxLife,
        side,
        color,
        wobbleSpeed: Math.random() * 0.06 + 0.02,
        wobbleAmp: Math.random() * 1.5 + 0.5,
      });
    };

    // Pre-populate particles
    for (let i = 0; i < 70; i++) {
      spawnParticle(i % 2 === 0 ? 'green' : 'red');
    }

    const spawnLightningArc = (now: number) => {
      if (now - lastArcTime < 2400) return;
      if (Math.random() > 0.03) return;

      lastArcTime = now;
      const startX = width * 0.48 + (Math.random() - 0.5) * (width * 0.08);
      const startY = height * 0.3 + Math.random() * (height * 0.3);
      const segments = 6;
      const points = [{ x: startX, y: startY }];

      let cx = startX;
      let cy = startY;

      for (let i = 0; i < segments; i++) {
        cx += (Math.random() - 0.5) * 35;
        cy += (Math.random() * 25 + 15);
        points.push({ x: cx, y: cy });
      }

      arcs.push({
        points,
        alpha: 0.35, // 35% opacity
        color: Math.random() > 0.5 ? '#10B981' : '#EF4444',
      });
    };

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Mouse influence
      const greenBonus = Math.max(0, -mouseOffset.x * 2);
      const redBonus = Math.max(0, mouseOffset.x * 2);

      // Spawn new particles according to bias
      if (particles.length < 110) {
        if (Math.random() < 0.35 + greenBonus * 0.3) spawnParticle('green');
        if (Math.random() < 0.35 + redBonus * 0.3) spawnParticle('red');
      }

      // Check lightning arcs
      spawnLightningArc(time);

      // Draw and update arcs
      for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        arc.alpha -= dt * 3.5;

        if (arc.alpha <= 0) {
          arcs.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 15;
        ctx.globalAlpha = arc.alpha;

        ctx.beginPath();
        arc.points.forEach((pt, pIdx) => {
          if (pIdx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Draw and update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;

        // Fade in and fade out curve
        const progress = p.life / p.maxLife;
        if (progress < 0.2) {
          p.alpha = (progress / 0.2) * p.maxAlpha;
        } else if (progress > 0.7) {
          p.alpha = ((1 - progress) / 0.3) * p.maxAlpha;
        } else {
          p.alpha = p.maxAlpha;
        }

        // Wobble physics
        p.x += p.vx + Math.sin(p.life * p.wobbleSpeed) * p.wobbleAmp;
        p.y += p.vy;

        // Draw particle with green / red blur 10 glow at 35% opacity
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(0.35, p.alpha));
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Remove dead particles
        if (p.life >= p.maxLife || p.y < -10 || p.x < 0 || p.x > width) {
          particles.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mouseOffset.x]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
}
