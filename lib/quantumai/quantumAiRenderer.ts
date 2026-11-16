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
      if (ob.endIndex < safeStart && ob.isMitigated) continue;
      if (ob.startIndex >= safeEnd) continue;

      const zStartLi = Math.max(0, ob.startIndex - startIdx);
      const zEndLi = ob.isMitigated ? Math.min(safeEnd - startIdx, ob.endIndex - startIdx) : (safeEnd - startIdx);

      const x1 = zStartLi * candleW;
      const x2 = ob.isMitigated ? (zEndLi + 1) * candleW : chartW;
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
      const blockW = x2 - x1;
      if (blockW > 25 * dpr) {
        ctx.font = `bold ${8 * dpr}px "JetBrains Mono", monospace`;
        ctx.fillStyle = borderCol;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const label = ob.isBullish ? 'BULL OB' : 'BEAR OB';
        if (obH >= 8 * dpr) {
          ctx.fillText(label, x1 + 3 * dpr, obY + 2 * dpr);
        }

        // Visible price numbers directly on the block
        const topStr = ob.top.toFixed(1);
        const btmStr = ob.bottom.toFixed(1);
        const spreadStr = Math.abs(ob.top - ob.bottom).toFixed(1);
        const priceText = `${topStr} - ${btmStr} (${spreadStr} pts)`;
        ctx.font = `bold ${8 * dpr}px "JetBrains Mono", monospace`;

        if (blockW > 80 * dpr && obH >= 9 * dpr) {
          ctx.textAlign = 'right';
          ctx.fillStyle = isDark ? '#E2E8F0' : '#1E293B';
          ctx.fillText(priceText, x2 - 4 * dpr, obY + 2 * dpr);
        } else if (!ob.isMitigated && x2 >= chartW - 10 * dpr) {
          // Draw neat badge pinned at the right edge for live institutional order blocks
          const badgeW = 94 * dpr;
          const badgeH = Math.max(12 * dpr, Math.min(obH - 2 * dpr, 16 * dpr));
          const badgeX = chartW - badgeW - 4 * dpr;
          const badgeY = obY + (obH - badgeH) / 2;
          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)';
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = borderCol;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
          ctx.fillStyle = borderCol;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`₹${topStr} - ₹${btmStr}`, badgeX + badgeW / 2, badgeY + badgeH / 2);
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

  // ── 5. Render Trade Setups (Signal Badges) ───────────────────────────
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
    }
  }

  // ── 5b. Automated Risk & Execution Levels (Entry, SL, TP1, TP2, TP3) ────────
  if (config.showExecutionLevels) {
    const lastBarIdx = candles.length - 1;
    // Pick the most relevant ACTIVE setup within recent 20 bars (never pick ancient historical setups)
    let activeSetup = analysis.setups && analysis.setups.length > 0
      ? analysis.setups.find((s) => s.status === 'ACTIVE' && (lastBarIdx - s.candleIndex <= 20))
      : undefined;

    // If no recent setup met the threshold, dynamically synthesize execution levels from the latest market state / dealing range
    if (!activeSetup && candles.length >= 5) {
      const lastC = candles[candles.length - 1];
      const prevC = candles[candles.length - 2] || lastC;
      const isBull = (analysis.dashboard && analysis.dashboard.bullScore > analysis.dashboard.bearScore) || lastC.close >= prevC.close;
      const entry = lastC.close;
      const recentHigh = Math.max(...candles.slice(-15).map(c => c.high));
      const recentLow = Math.min(...candles.slice(-15).map(c => c.low));
      const atrEst = Math.max(0.008 * entry, (recentHigh - recentLow) / 3);
      const sl = isBull ? Math.max(0.01, +(entry - atrEst * 1.5).toFixed(2)) : +(entry + atrEst * 1.5).toFixed(2);
      const risk = Math.max(0.01, Math.abs(entry - sl));

      activeSetup = {
        id: 'live-execution-bracket',
        isBullish: isBull,
        candleIndex: candles.length - 1,
        time: lastC.openTime,
        entryPrice: entry,
        stopLossPrice: sl,
        initialRisk: risk,
        tp1Price: isBull ? +(entry + risk * 1.5).toFixed(2) : +(entry - risk * 1.5).toFixed(2),
        tp2Price: isBull ? +(entry + risk * 2.5).toFixed(2) : +(entry - risk * 2.5).toFixed(2),
        tp3Price: isBull ? +(entry + risk * 4.0).toFixed(2) : +(entry - risk * 4.0).toFixed(2),
        confluenceScore: 7.5,
        isBreakEvenActivated: false,
        status: 'ACTIVE',
        conditions: ['Live Market Institutional Risk Bracket', '1:1.5 / 1:2.5 / 1:4.0 Asymmetric Targets'],
      };
    }

    if (activeSetup) {
      const isBull = activeSetup.isBullish;
      const maxLifespan = 18;
      let endIdx = Math.min(candles.length - 1, activeSetup.candleIndex + maxLifespan);
      let isTradeOver = false;

      // Track whether trade hit target, hit stop, or exceeded maximum lifespan
      for (let ci = activeSetup.candleIndex + 1; ci < candles.length; ci++) {
        const c = candles[ci];
        if (!c) continue;
        if (isBull) {
          if (c.high >= activeSetup.tp1Price || c.low <= activeSetup.stopLossPrice) {
            endIdx = ci;
            isTradeOver = true;
            break;
          }
        } else {
          if (c.low <= activeSetup.tp1Price || c.high >= activeSetup.stopLossPrice) {
            endIdx = ci;
            isTradeOver = true;
            break;
          }
        }
        if (ci >= activeSetup.candleIndex + maxLifespan) {
          endIdx = ci;
          isTradeOver = true;
          break;
        }
      }

      // If trade concluded prior to visible viewport, skip drawing
      if (!(isTradeOver && endIdx < startIdx)) {
        const li = activeSetup.candleIndex - startIdx;
        const rawX = li * candleW + candleW / 2;
        const xStart = Math.max(10 * dpr, Math.min(chartW - 60 * dpr, rawX));
        const rawEndX = (endIdx - startIdx) * candleW + candleW / 2;

        // If timeframe is over, stop drawing at resolution candle! Do not project across newer candles
        const xEnd = isTradeOver
          ? Math.min(chartW - 5 * dpr, Math.max(xStart + 30 * dpr, rawEndX))
          : chartW - 5 * dpr;

      ctx.save();
      const levels = [
        { label: 'ENTRY', price: activeSetup.entryPrice, color: '#3B82F6', dash: [4 * dpr, 3 * dpr] },
        { label: 'STOP LOSS', price: activeSetup.stopLossPrice, color: '#EF4444', dash: [4 * dpr, 2 * dpr] },
        { label: 'TP1 (1.5R)', price: activeSetup.tp1Price, color: '#10B981', dash: [3 * dpr, 3 * dpr] },
        { label: 'TP2 (2.5R)', price: activeSetup.tp2Price, color: '#14B8A6', dash: [3 * dpr, 3 * dpr] },
        { label: 'TP3 (4.0R)', price: activeSetup.tp3Price, color: '#06B6D4', dash: [3 * dpr, 3 * dpr] },
      ];

      for (const lvl of levels) {
        if (!lvl.price || lvl.price <= 0) continue;
        const y = priceToY(lvl.price);
        if (y < 0 || y > chartH) continue;

        // Draw horizontal execution ray
        ctx.strokeStyle = lvl.color;
        ctx.lineWidth = 1.3 * dpr;
        ctx.setLineDash(lvl.dash);
        ctx.beginPath();
        ctx.moveTo(xStart, y);
        ctx.lineTo(xEnd, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Right margin pill badge with exact price
        const txt = `${lvl.label}: ${lvl.price.toFixed(2)}`;
        ctx.font = `bold ${8 * dpr}px "JetBrains Mono", monospace`;
        const tw = ctx.measureText(txt).width;
        const bw = tw + 8 * dpr;
        const bh = 14 * dpr;
        const bx = xEnd - bw;
        const by = y - bh / 2;

        ctx.fillStyle = isDark ? 'rgba(11, 15, 25, 0.90)' : 'rgba(255, 255, 255, 0.92)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = lvl.color;
        ctx.lineWidth = 1 * dpr;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = lvl.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, bx + bw / 2, y);
      }

      // Risk/Reward Bracket shaded box between Entry and SL
      const yE = priceToY(activeSetup.entryPrice);
      const yS = priceToY(activeSetup.stopLossPrice);
      const yT = priceToY(activeSetup.tp1Price);
      const riskH = Math.abs(yE - yS);
      const rewardH = Math.abs(yE - yT);

      // Shaded Risk Box
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.fillRect(xStart, Math.min(yE, yS), xEnd - xStart, riskH);

      // Shaded Reward Box
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(xStart, Math.min(yE, yT), xEnd - xStart, rewardH);

      ctx.restore();
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
