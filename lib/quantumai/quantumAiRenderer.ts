// ═══════════════════════════════════════════════════════════════════════════
// QUANTUM AI — MULTI-TIMEFRAME SMC & RESONANCE CANVAS RENDERER
// ═══════════════════════════════════════════════════════════════════════════

import { Candle } from '../types';
import {
  QuantumAiAnalysisResult,
  QuantumAiConfig,
} from './types';

export interface QuantumAiRenderOptions {
  ctx: CanvasRenderingContext2D;
  candles: Candle[];
  analysis: QuantumAiAnalysisResult;
  config: QuantumAiConfig;
  priceToY: (price: number) => number;
  safeStart: number;
  safeEnd: number;
  startIdx: number;
  candleW: number;
  chartW: number;
  chartH: number;
  dpr: number;
  isDark: boolean;
}

export function renderQuantumAiOverlays(options: QuantumAiRenderOptions): void {
  const {
    ctx,
    candles,
    analysis,
    config,
    priceToY,
    safeStart,
    safeEnd,
    startIdx,
    candleW,
    chartW,
    chartH,
    dpr,
    isDark,
  } = options;

  if (!config.enabled || !analysis || candles.length === 0) return;

  ctx.save();

  // ── 1. Render Premium, Discount & Equilibrium Dealing Range ──────────────
  if (config.showDealingRange && analysis.dealingRange.swingHigh > 0) {
    const dr = analysis.dealingRange;
    const yHigh = priceToY(dr.swingHigh);
    const yLow = priceToY(dr.swingLow);
    const yEq = priceToY(dr.equilibrium);

    // Subtle shaded background zones
    const xLeft = 0;
    const xRight = chartW;

    // Premium Zone Shading (Upper Half)
    ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.035)' : 'rgba(220, 38, 38, 0.025)';
    ctx.fillRect(xLeft, yHigh, xRight, Math.abs(yEq - yHigh));

    // Discount Zone Shading (Lower Half)
    ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.035)' : 'rgba(5, 150, 105, 0.025)';
    ctx.fillRect(xLeft, yEq, xRight, Math.abs(yLow - yEq));

    // Equilibrium (EQ) Line
    ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.5)';
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(xLeft, yEq);
    ctx.lineTo(xRight, yEq);
    ctx.stroke();
    ctx.setLineDash([]);

    // Equilibrium Label
    ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono", monospace`;
    ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`EQ ${dr.equilibrium}`, 14 * dpr, yEq - 2 * dpr);
  }

  // ── 2. Render Order Block Zones ──────────────────────────────────────────
  if (config.showOrderBlocks && analysis.orderBlocks.length > 0) {
    for (const ob of analysis.orderBlocks) {
      if (ob.endIndex < safeStart || ob.startIndex >= safeEnd) continue;

      const zStartLi = Math.max(0, ob.startIndex - startIdx);
      const zEndLi = Math.min(safeEnd - startIdx, ob.endIndex - startIdx);

      const x1 = zStartLi * candleW;
      const x2 = (zEndLi + 1) * candleW;
      const yTop = priceToY(ob.top);
      const yBottom = priceToY(ob.bottom);

      const obH = Math.max(2 * dpr, Math.abs(yBottom - yTop));
      const obY = Math.min(yTop, yBottom);

      const fillCol = ob.isBullish
        ? ob.isMitigated
          ? isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)'
          : isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.18)'
        : ob.isMitigated
          ? isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)'
          : isDark ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.18)';

      const borderCol = ob.isBullish
        ? ob.isMitigated ? 'rgba(16, 185, 129, 0.4)' : '#10B981'
        : ob.isMitigated ? 'rgba(239, 68, 68, 0.4)' : '#EF4444';

      ctx.fillStyle = fillCol;
      ctx.fillRect(x1, obY, x2 - x1, obH);

      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1 * dpr;
      if (ob.isMitigated) {
        ctx.setLineDash([3 * dpr, 3 * dpr]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.strokeRect(x1, obY, x2 - x1, obH);
      ctx.setLineDash([]);

      // Label and numbers inside Order Block
      if (x2 - x1 > 35 * dpr && obH >= 9 * dpr) {
        ctx.font = `bold ${8 * dpr}px "JetBrains Mono", monospace`;
        ctx.fillStyle = borderCol;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const label = ob.isBullish ? 'BULL OB' : 'BEAR OB';
        ctx.fillText(label, x1 + 3 * dpr, obY + 2 * dpr);

        // Visible price numbers directly on the right side of the block
        if (x2 - x1 > 85 * dpr && obH >= 11 * dpr) {
          const topStr = ob.top.toFixed(2);
          const btmStr = ob.bottom.toFixed(2);
          const spreadStr = (ob.top - ob.bottom).toFixed(2);
          const priceText = `${topStr} - ${btmStr} (${spreadStr} pts)`;
          ctx.textAlign = 'right';
          ctx.fillStyle = isDark ? '#E2E8F0' : '#1E293B';
          ctx.fillText(priceText, x2 - 4 * dpr, obY + 2 * dpr);
        }
      }
    }
  }

  // ── 3. Render Market Structure Breaks (BOS / CHoCH) ──────────────────────
  if (config.showStructure && analysis.structures.length > 0) {
    for (const brk of analysis.structures) {
      if (brk.candleIndex < safeStart || brk.originIndex >= safeEnd) continue;

      const x1 = (brk.originIndex - startIdx) * candleW + candleW / 2;
      const x2 = (brk.candleIndex - startIdx) * candleW + candleW / 2;
      const y = priceToY(brk.breakPrice);

      const col = brk.isBullish ? '#10B981' : '#EF4444';

      ctx.strokeStyle = col;
      ctx.lineWidth = 1.2 * dpr;
      ctx.setLineDash([2 * dpr, 2 * dpr]);
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Badge label
      const tagText = brk.type === 'CHOCH' ? 'CHoCH' : 'BOS';
      ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono", monospace`;
      const textW = ctx.measureText(tagText).width;
      const midX = (x1 + x2) / 2;

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(midX - textW / 2 - 2 * dpr, y - 5 * dpr, textW + 4 * dpr, 10 * dpr, 2 * dpr)
        : ctx.rect(midX - textW / 2 - 2 * dpr, y - 5 * dpr, textW + 4 * dpr, 10 * dpr);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, midX, y);
    }
  }

  // ── 4. Render Liquidity Sweeps ───────────────────────────────────────────
  if (config.showLiquidity && analysis.liquidityPools.length > 0) {
    for (const pool of analysis.liquidityPools) {
      if (!pool.isSwept || !pool.sweepIndex) continue;
      if (pool.sweepIndex < safeStart || pool.sweepIndex >= safeEnd) continue;

      const li = pool.sweepIndex - startIdx;
      const x = li * candleW + candleW / 2;
      const y = priceToY(pool.sweepPrice || pool.price);

      // Hollow sweep circle
      ctx.strokeStyle = pool.isHigh ? '#F59E0B' : '#06B6D4';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(x, y, 4 * dpr, 0, Math.PI * 2);
      ctx.stroke();

      // Sweep Label
      ctx.font = `bold ${7 * dpr}px "JetBrains Mono", monospace`;
      ctx.fillStyle = pool.isHigh ? '#F59E0B' : '#06B6D4';
      ctx.textAlign = 'center';
      ctx.textBaseline = pool.isHigh ? 'bottom' : 'top';
      ctx.fillText('SWEEP', x, pool.isHigh ? y - 6 * dpr : y + 6 * dpr);
    }
  }

  // ── 5. Render Trade Setups & Execution Targets ───────────────────────────
  if (config.showSignals && analysis.setups.length > 0) {
    for (const setup of analysis.setups) {
      if (setup.candleIndex < safeStart || setup.candleIndex >= safeEnd) continue;

      const c = candles[setup.candleIndex];
      if (!c) continue;

      const li = setup.candleIndex - startIdx;
      const x = li * candleW + candleW / 2;
      const isBull = setup.isBullish;

      // Signal Pill Badge
      const bgCol = isBull ? '#8B5CF6' : '#EC4899'; // Purple for Quantum AI
      const badgeText = isBull ? '⚡ QUANTUM BUY' : '⚡ QUANTUM SELL';
      const badgeY = isBull ? priceToY(c.low) + 16 * dpr : priceToY(c.high) - 16 * dpr;

      ctx.font = `bold ${8 * dpr}px "JetBrains Mono", monospace`;
      const textW = ctx.measureText(badgeText).width;
      const padX = 4 * dpr;

      ctx.fillStyle = bgCol;
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(x - textW / 2 - padX, badgeY - 6 * dpr, textW + padX * 2, 12 * dpr, 3 * dpr)
        : ctx.rect(x - textW / 2 - padX, badgeY - 6 * dpr, textW + padX * 2, 12 * dpr);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, x, badgeY);

      // Connecting guide line to execution level
      ctx.strokeStyle = bgCol;
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, badgeY + (isBull ? -6 * dpr : 6 * dpr));
      ctx.lineTo(x, priceToY(setup.entryPrice));
      ctx.stroke();

      // Render Execution Horizontal Target Rays if active & enabled
      if (config.showExecutionLevels && setup.status === 'ACTIVE') {
        const xExtend = Math.min(chartW, x + 80 * dpr);

        // Entry
        const yEntry = priceToY(setup.entryPrice);
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([3 * dpr, 2 * dpr]);
        ctx.beginPath();
        ctx.moveTo(x, yEntry);
        ctx.lineTo(xExtend, yEntry);
        ctx.stroke();

        // SL
        const ySl = priceToY(setup.stopLossPrice);
        ctx.strokeStyle = '#EF4444';
        ctx.beginPath();
        ctx.moveTo(x, ySl);
        ctx.lineTo(xExtend, ySl);
        ctx.stroke();

        // TP1
        const yTp1 = priceToY(setup.tp1Price);
        ctx.strokeStyle = '#10B981';
        ctx.beginPath();
        ctx.moveTo(x, yTp1);
        ctx.lineTo(xExtend, yTp1);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // ── 6. Quantum AI Strategy Dashboard (HUD Overlay) ─────────────────────────
  if (config.showDashboard) {
    const d = analysis.dashboard;
    const hudW = 195 * dpr;
    const hudH = 135 * dpr;
    const hudX = 14 * dpr;
    const hudY = 14 * dpr;

    // HUD Box Background
    ctx.fillStyle = isDark ? 'rgba(11, 15, 25, 0.85)' : 'rgba(255, 255, 255, 0.90)';
    ctx.strokeStyle = isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(139, 92, 246, 0.40)';
    ctx.lineWidth = 1.2 * dpr;

    ctx.beginPath();
    ctx.roundRect
      ? ctx.roundRect(hudX, hudY, hudW, hudH, 6 * dpr)
      : ctx.rect(hudX, hudY, hudW, hudH);
    ctx.fill();
    ctx.stroke();

    // HUD Header
    ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono", monospace`;
    ctx.fillStyle = isDark ? '#A78BFA' : '#7C3AED';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('⚡ QUANTUM AI — SMC & RESONANCE', hudX + 8 * dpr, hudY + 7 * dpr);

    // Separator
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 0.8 * dpr;
    ctx.beginPath();
    ctx.moveTo(hudX + 8 * dpr, hudY + 20 * dpr);
    ctx.lineTo(hudX + hudW - 8 * dpr, hudY + 20 * dpr);
    ctx.stroke();

    // Metric Rows
    const rows: [string, string, string][] = [
      ['Regime / Vol:', `${d.marketRegime} / ${d.volatility}`, d.volatility === 'SQUEEZE' ? '#F59E0B' : '#10B981'],
      ['Market Zone:', d.marketZone, d.marketZone === 'DISCOUNT' ? '#10B981' : d.marketZone === 'PREMIUM' ? '#EF4444' : '#94A3B8'],
      ['ADX (Trend):', `${d.adxValue} (${d.adxValue >= 25 ? 'Strong' : 'Ranging'})`, d.adxValue >= 25 ? '#10B981' : '#94A3B8'],
      ['Order Block:', d.orderBlockStatus, d.orderBlockStatus.includes('Bullish') ? '#10B981' : d.orderBlockStatus.includes('Bearish') ? '#EF4444' : '#94A3B8'],
      ['Confluence:', `Bull ${d.bullScore} | Bear ${d.bearScore}`, d.bullScore >= 7.0 ? '#10B981' : d.bearScore >= 7.0 ? '#EF4444' : '#94A3B8'],
      ['Position / Res:', `${d.position} (${d.resonancePct}% Match)`, d.position === 'LONG' ? '#10B981' : d.position === 'SHORT' ? '#EF4444' : '#94A3B8'],
    ];

    let rowY = hudY + 26 * dpr;
    for (const [label, val, valCol] of rows) {
      ctx.font = `${7.5 * dpr}px "JetBrains Mono", monospace`;
      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
      ctx.textAlign = 'left';
      ctx.fillText(label, hudX + 8 * dpr, rowY);

      ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono", monospace`;
      ctx.fillStyle = valCol;
      ctx.textAlign = 'right';
      ctx.fillText(val, hudX + hudW - 8 * dpr, rowY);

      rowY += 16 * dpr;
    }
  }

  ctx.restore();
}
