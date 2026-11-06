// ═══════════════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE AI (MI-007) — ORDER FLOW FOOTPRINT CANVAS RENDERER
// ═══════════════════════════════════════════════════════════════════════════
// High-performance HTML5 Canvas renderer for:
// - Multi-LOD Footprint (Bid x Ask text, split volume profile, delta heatmap)
// - Point of Control (POC) & Configurable Value Area (VAH / VAL) Highlights
// - Diagonal Buy / Sell Imbalance Highlighting (Pill markers)
// - Passive Absorption Target Halos & Exhaustion Extreme Markers
// - Stacked Imbalance & Absorption Order Flow Zones with Retest tracking
// - Delta Summary Footers (Total Volume, Bar Delta, Min/Max Delta, Cumulative Delta + Session Resets)
// - Order Flow Signal Badges with Target & Invalidation lines
// - Data Source Integrity Watermark (Verified L2 vs Inferred Microstructure)
// ═══════════════════════════════════════════════════════════════════════════

import { Candle } from '../types';
import {
  CandleFootprint,
  OrderFlowConfig,
  OrderFlowSignal,
  PriceLevelFootprint,
  StackedImbalanceZone,
} from './types';

export interface OrderFlowRenderOptions {
  ctx: CanvasRenderingContext2D;
  candles: Candle[];
  footprints: CandleFootprint[];
  activeZones: StackedImbalanceZone[];
  signals: OrderFlowSignal[];
  config: OrderFlowConfig;
  priceToY: (price: number) => number;
  safeStart: number;
  safeEnd: number;
  startIdx: number;
  candleW: number;
  chartW: number;
  chartH: number;
  dpr: number;
  isDark: boolean;
  tickSize: number;
}

// ── Number Formatter Utility ───────────────────────────────────────────────

export function formatVol(n: number, compact = false): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(compact || n >= 10_000 ? 0 : 1) + 'k';
  if (compact && n >= 100) return Math.round(n).toString();
  return Math.round(n).toString();
}

export function formatDelta(n: number, compact = false): string {
  const sign = n > 0 ? '+' : '';
  if (Math.abs(n) >= 1_000_000) return sign + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return sign + (n / 1_000).toFixed(compact || n >= 10_000 ? 0 : 1) + 'k';
  return sign + Math.round(n).toString();
}

// ── Master Footprint Render Function ──────────────────────────────────────

export function renderOrderFlowFootprint(options: OrderFlowRenderOptions): void {
  const {
    ctx,
    candles,
    footprints,
    activeZones,
    signals,
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
    tickSize,
  } = options;

  if (!config.enabled || !footprints || footprints.length === 0) return;

  ctx.save();

  // Determine Level of Detail (LOD) based on horizontal candle width and selected viewMode
  const effectiveW = candleW / dpr;
  const viewMode = config.viewMode || 'BID_ASK';
  // Allow Bid × Ask numbers whenever candle width is >= 18px!
  const showBidAskText = viewMode === 'BID_ASK' && effectiveW >= 18;
  // If narrower than 18px down to 10px, or if viewMode is DELTA, show clear delta numbers!
  const showDeltaText = (viewMode === 'DELTA' || (viewMode === 'BID_ASK' && !showBidAskText)) && effectiveW >= 10;
  const showSplitBars =
    (viewMode === 'PROFILE' && effectiveW >= 8) ||
    (!showBidAskText && !showDeltaText && effectiveW >= 6);

  // Palette definitions
  const buyImbalanceBg = isDark ? 'rgba(16, 185, 129, 0.40)' : 'rgba(5, 150, 105, 0.35)';
  const buyImbalanceText = isDark ? '#34D399' : '#047857';
  const sellImbalanceBg = isDark ? 'rgba(239, 68, 68, 0.40)' : 'rgba(220, 38, 38, 0.35)';
  const sellImbalanceText = isDark ? '#F87171' : '#B91C1C';

  const neutralBidText = isDark ? 'rgba(248, 113, 113, 0.85)' : 'rgba(185, 28, 28, 0.9)';
  const neutralAskText = isDark ? 'rgba(52, 211, 153, 0.85)' : 'rgba(4, 120, 87, 0.9)';

  const pocBorder = '#F59E0B'; // Vivid Amber
  const pocBg = isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.15)';
  const valueAreaTint = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';

  // ── 1. Render Order Flow Zones (Stacked Imbalances) ────────
  const shouldShowZones = config.showStackedImbalances ?? config.showOrderFlowZones;
  if (shouldShowZones && activeZones.length > 0) {
    for (const zone of activeZones) {
      if (zone.endIndex < safeStart || zone.startIndex >= safeEnd) continue;

      const zStartLi = Math.max(0, zone.startIndex - startIdx);
      const zEndLi = Math.min(safeEnd - startIdx, zone.endIndex - startIdx);

      const x1 = zStartLi * candleW;
      const x2 = (zEndLi + 1) * candleW;
      const yTop = priceToY(zone.topPrice);
      const yBottom = priceToY(zone.bottomPrice);

      const zoneH = Math.max(2 * dpr, Math.abs(yBottom - yTop));
      const zoneY = Math.min(yTop, yBottom);

      const fillCol = zone.isBuy
        ? zone.isMitigated
          ? isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)'
          : isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.16)'
        : zone.isMitigated
          ? isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)'
          : isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.16)';

      const borderCol = zone.isBuy
        ? zone.isMitigated ? 'rgba(16, 185, 129, 0.35)' : '#10B981'
        : zone.isMitigated ? 'rgba(239, 68, 68, 0.35)' : '#EF4444';

      ctx.fillStyle = fillCol;
      ctx.fillRect(x1, zoneY, x2 - x1, zoneH);

      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1 * dpr;
      if (zone.isMitigated) {
        ctx.setLineDash([3 * dpr, 3 * dpr]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.strokeRect(x1, zoneY, x2 - x1, zoneH);
      ctx.setLineDash([]);

      // Zone Label
      if (x2 - x1 > 40 * dpr && zoneH >= 10 * dpr) {
        ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono", monospace`;
        ctx.fillStyle = borderCol;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const labelText = zone.isBuy
          ? `BUY IMBALANCE (${zone.levelCount})`
          : `SELL IMBALANCE (${zone.levelCount})`;
        ctx.fillText(labelText, x1 + 4 * dpr, zoneY + 2 * dpr);
      }
    }
  }

  // ── 2. Render Footprint Candles ──────────────────────────────────────────
  for (let i = safeStart; i < safeEnd; i++) {
    const fp = footprints[i];
    if (!fp) continue;

    const li = i - startIdx;
    const barLeft = li * candleW;
    const barMidX = barLeft + candleW / 2;
    const barRight = barLeft + candleW;
    const barBodyW = candleW - 2 * dpr;

    // A. Render Candle High/Low Wicks
    const yHigh = priceToY(fp.high);
    const yLow = priceToY(fp.low);

    ctx.strokeStyle = fp.close >= fp.open
      ? isDark ? '#34D399' : '#059669'
      : isDark ? '#F87171' : '#DC2626';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(barMidX, yHigh);
    ctx.lineTo(barMidX, yLow);
    ctx.stroke();

    // B. Render Price-Level Slices
    const levels = fp.sortedLevels;
    if (levels.length === 0) continue;

    // Find max level volume in this candle for relative bar scaling
    let maxLevelVol = 1;
    for (const lvl of levels) {
      if (lvl.totalVolume > maxLevelVol) maxLevelVol = lvl.totalVolume;
    }

    const sampleH = Math.max(1 * dpr, Math.abs(priceToY(levels[0].price + tickSize / 2) - priceToY(levels[0].price - tickSize / 2)) - 0.5 * dpr);
    const cellStride = Math.max(1, Math.ceil(9 * dpr / Math.max(1, sampleH)));

    for (let lvlIdx = 0; lvlIdx < levels.length; lvlIdx++) {
      const lvl = levels[lvlIdx];
      const topY = priceToY(lvl.price + tickSize / 2);
      const bottomY = priceToY(lvl.price - tickSize / 2);
      const cellY = Math.min(topY, bottomY);
      const cellH = Math.max(1 * dpr, Math.abs(bottomY - topY) - 0.5 * dpr);

      // Value Area tinting
      if (config.showValueArea && lvl.isValueArea) {
        ctx.fillStyle = valueAreaTint;
        ctx.fillRect(barLeft + 1 * dpr, cellY, barBodyW, cellH);
      }

      // Point of Control (POC) highlight
      if (config.showPoc && lvl.isPoc) {
        ctx.fillStyle = pocBg;
        ctx.fillRect(barLeft + 1 * dpr, cellY, barBodyW, cellH);
        ctx.strokeStyle = pocBorder;
        ctx.lineWidth = 1.5 * dpr;
        ctx.strokeRect(barLeft + 1 * dpr, cellY, barBodyW, cellH);
      }

      const shouldDrawText = lvl.isPoc || lvl.hasBuyImbalance || lvl.hasSellImbalance || (lvlIdx % cellStride === 0);

      // --- Mode A1: Detailed Bid × Ask Numeric Text ---
      if (showBidAskText) {
        const halfW = barBodyW / 2;

        // Bid Side (Left)
        if (config.showImbalances && lvl.hasSellImbalance) {
          ctx.fillStyle = sellImbalanceBg;
          ctx.fillRect(barLeft + 1 * dpr, cellY, halfW, cellH);
        }

        // Ask Side (Right)
        if (config.showImbalances && lvl.hasBuyImbalance) {
          ctx.fillStyle = buyImbalanceBg;
          ctx.fillRect(barMidX, cellY, halfW, cellH);
        }

        if (shouldDrawText) {
          const isCompact = effectiveW < 28;
          const fontSize = Math.max(7 * dpr, Math.min(10.5 * dpr, Math.max(cellH * 0.75, 7.5 * dpr)));
          ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
          ctx.textBaseline = 'middle';

          // Render Bid Text
          ctx.fillStyle = lvl.hasSellImbalance ? sellImbalanceText : neutralBidText;
          ctx.textAlign = 'right';
          const bidStr = formatVol(lvl.bidVolume, isCompact);
          ctx.fillText(bidStr, barMidX - 2 * dpr, cellY + cellH / 2);

          // Render Ask Text
          ctx.fillStyle = lvl.hasBuyImbalance ? buyImbalanceText : neutralAskText;
          ctx.textAlign = 'left';
          const askStr = formatVol(lvl.askVolume, isCompact);
          ctx.fillText(askStr, barMidX + 2 * dpr, cellY + cellH / 2);
        }

        // Center separator divider
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 0.8 * dpr;
        ctx.beginPath();
        ctx.moveTo(barMidX, cellY);
        ctx.lineTo(barMidX, cellY + cellH);
        ctx.stroke();
      }
      // --- Mode A2: Delta Profile Numeric Mode ---
      else if (showDeltaText) {
        const deltaFraction = lvl.totalVolume > 0 ? lvl.delta / lvl.totalVolume : 0;
        const absDelta = Math.abs(deltaFraction);
        const alpha = Math.min(0.55, Math.max(0.10, absDelta * 0.65));
        ctx.fillStyle = lvl.delta >= 0
          ? `rgba(16, 185, 129, ${alpha})`
          : `rgba(239, 68, 68, ${alpha})`;
        ctx.fillRect(barLeft + 1 * dpr, cellY, barBodyW, cellH);

        if (shouldDrawText) {
          const fontSize = Math.max(7 * dpr, Math.min(10 * dpr, Math.max(cellH * 0.75, 7.5 * dpr)));
          ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillStyle = lvl.delta >= 0 ? buyImbalanceText : sellImbalanceText;
          ctx.fillText(formatDelta(lvl.delta, true), barMidX, cellY + cellH / 2);
        }
      }
      // --- Mode B: Dual Split Volume Profile Bars (Medium Zoom or PROFILE mode) ---
      else if (showSplitBars) {
        const halfMaxW = (barBodyW / 2) * 0.92;
        const bidBarW = Math.max(1, (lvl.bidVolume / maxLevelVol) * halfMaxW);
        const askBarW = Math.max(1, (lvl.askVolume / maxLevelVol) * halfMaxW);

        // Bid Bar (extends left from center)
        ctx.fillStyle = lvl.hasSellImbalance ? sellImbalanceText : isDark ? 'rgba(239, 68, 68, 0.55)' : 'rgba(220, 38, 38, 0.5)';
        ctx.fillRect(barMidX - bidBarW, cellY, bidBarW, cellH);

        // Ask Bar (extends right from center)
        ctx.fillStyle = lvl.hasBuyImbalance ? buyImbalanceText : isDark ? 'rgba(16, 185, 129, 0.55)' : 'rgba(5, 150, 105, 0.5)';
        ctx.fillRect(barMidX, cellY, askBarW, cellH);
      }
      // --- Mode C: Compact Delta Heatmap (Standard Zoom or HEATMAP mode) ---
      else {
        const deltaFraction = lvl.totalVolume > 0 ? lvl.delta / lvl.totalVolume : 0;
        const absDelta = Math.abs(deltaFraction);
        const alpha = Math.min(0.85, Math.max(0.15, absDelta * 0.9));

        ctx.fillStyle = lvl.delta >= 0
          ? `rgba(16, 185, 129, ${alpha})`
          : `rgba(239, 68, 68, ${alpha})`;
        ctx.fillRect(barLeft + 1 * dpr, cellY, barBodyW, cellH);
      }
    }

    // B2. Render Passive Absorption Marker (Target Halo / Concentric Rings)
    if (config.showAbsorption && fp.absorption) {
      const absY = priceToY(fp.absorption.price);
      const isBull = fp.absorption.isBullish;
      const absCol = isBull ? '#06B6D4' : '#A855F7'; // Cyan (Bull) / Violet (Bear)

      // Outer Halo Ring
      ctx.strokeStyle = absCol;
      ctx.lineWidth = 1.8 * dpr;
      ctx.beginPath();
      ctx.arc(barMidX, absY, 5.5 * dpr, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Target Dot
      ctx.fillStyle = absCol;
      ctx.beginPath();
      ctx.arc(barMidX, absY, 2.2 * dpr, 0, Math.PI * 2);
      ctx.fill();

      // Small 'ABS' tag if wide enough
      if (effectiveW >= 36) {
        ctx.font = `bold ${7 * dpr}px "JetBrains Mono", monospace`;
        ctx.fillStyle = absCol;
        ctx.textAlign = 'center';
        ctx.textBaseline = isBull ? 'top' : 'bottom';
        ctx.fillText('ABS', barMidX, isBull ? absY + 7 * dpr : absY - 7 * dpr);
      }
    }

    // B3. Render Exhaustion Marker (Drying up of aggressive orders at extremes)
    if (config.showExhaustion && fp.exhaustion) {
      const exhY = priceToY(fp.exhaustion.price);
      const isBull = fp.exhaustion.isBullish;
      const exhCol = isBull ? '#38BDF8' : '#FB923C'; // Sky Blue (Low) / Orange (High)

      // Hollow Diamond Marker
      const dSize = 4 * dpr;
      ctx.strokeStyle = exhCol;
      ctx.lineWidth = 1.6 * dpr;
      ctx.beginPath();
      ctx.moveTo(barMidX, exhY - dSize);
      ctx.lineTo(barMidX + dSize, exhY);
      ctx.lineTo(barMidX, exhY + dSize);
      ctx.lineTo(barMidX - dSize, exhY);
      ctx.closePath();
      ctx.stroke();

      // Small 'EXH' tag if wide enough
      if (effectiveW >= 36) {
        ctx.font = `bold ${7 * dpr}px "JetBrains Mono", monospace`;
        ctx.fillStyle = exhCol;
        ctx.textAlign = 'center';
        ctx.textBaseline = isBull ? 'top' : 'bottom';
        ctx.fillText('EXH', barMidX, isBull ? exhY + 6 * dpr : exhY - 6 * dpr);
      }
    }

    // C. Render Unfinished Business markers
    if (fp.unfinishedBusiness.high) {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(barMidX, yHigh - 3 * dpr, 2 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    if (fp.unfinishedBusiness.low) {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(barMidX, yLow + 3 * dpr, 2 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // D. Render Delta Footer Metrics below candle
    if (config.showDeltaSummary) {
      const footerY = chartH - 42 * dpr;
      ctx.font = `bold ${8 * dpr}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Total Volume
      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
      ctx.fillText(formatVol(fp.totalVolume), barMidX, footerY);

      // Delta (+ / -)
      ctx.fillStyle = fp.totalDelta >= 0 ? '#10B981' : '#EF4444';
      ctx.fillText(formatDelta(fp.totalDelta), barMidX, footerY + 10 * dpr);

      // Cumulative Volume Delta (CVD) with session reset flag
      if (effectiveW >= 24) {
        ctx.font = `${7 * dpr}px "JetBrains Mono", monospace`;
        ctx.fillStyle = fp.cumDelta >= 0 ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626');
        const cvdText = `${fp.isNewSession ? '↺ ' : ''}${formatDelta(fp.cumDelta)}`;
        ctx.fillText(cvdText, barMidX, footerY + 20 * dpr);
      }

      // Min / Max Delta (only if candle width permits)
      if (effectiveW >= 32) {
        ctx.font = `${6.5 * dpr}px "JetBrains Mono", monospace`;
        ctx.fillStyle = isDark ? '#64748B' : '#94A3B8';
        ctx.fillText(`${formatDelta(fp.minDelta)}/${formatDelta(fp.maxDelta)}`, barMidX, footerY + 30 * dpr);
      }
    }
  }

  // ── 3. Render Order Flow Signals (Badges & Invalidation/Target guides) ──
  if (config.showSignals && signals.length > 0) {
    for (const sig of signals) {
      if (sig.candleIndex < safeStart || sig.candleIndex >= safeEnd) continue;
      const sigCandle = candles[sig.candleIndex];
      if (!sigCandle) continue;

      const li = sig.candleIndex - startIdx;
      const x = li * candleW + candleW / 2;
      const y = priceToY(sig.price);

      const isBull = sig.isBullish;
      const badgeY = isBull ? priceToY(sigCandle.low) + 14 * dpr : priceToY(sigCandle.high) - 14 * dpr;

      // Color and Title by Signal Type
      let bgCol = isBull ? '#10B981' : '#EF4444';
      let badgeText = isBull ? '▲ OF BUY' : '▼ OF SELL';

      if (sig.type === 'BULLISH_ABSORPTION') {
        bgCol = '#06B6D4';
        badgeText = '▲ ABSORPTION';
      } else if (sig.type === 'BEARISH_ABSORPTION') {
        bgCol = '#A855F7';
        badgeText = '▼ ABSORPTION';
      } else if (sig.type === 'BULLISH_EXHAUSTION') {
        bgCol = '#38BDF8';
        badgeText = '▲ EXHAUSTION';
      } else if (sig.type === 'BEARISH_EXHAUSTION') {
        bgCol = '#FB923C';
        badgeText = '▼ EXHAUSTION';
      }

      ctx.font = `bold ${8 * dpr}px "JetBrains Mono", monospace`;
      const textW = ctx.measureText(badgeText).width;
      const padX = 4 * dpr;

      ctx.fillStyle = bgCol;
      ctx.beginPath();
      const rx = x - textW / 2 - padX;
      const ry = badgeY - 6 * dpr;
      const rw = textW + padX * 2;
      const rh = 12 * dpr;
      ctx.roundRect ? ctx.roundRect(rx, ry, rw, rh, 3 * dpr) : ctx.rect(rx, ry, rw, rh);
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
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  // ── 4. Footprint Data Source Watermark Badge ──────────────────────────────
  // Critical requirement: Distinguish verified exchange L2 vs inferred microstructure
  const isVerified = config.dataSource === 'VERIFIED_L2';
  const badgeText = isVerified
    ? '● ORDER FLOW: L2 VERIFIED TRADES (EXCHANGE AGGRESSOR)'
    : '◌ ORDER FLOW: INFERRED MICROSTRUCTURE (ESTIMATED — NO L2 AGGRESSOR FEED)';

  ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = isVerified
    ? isDark ? 'rgba(16, 185, 129, 0.85)' : 'rgba(5, 150, 105, 0.9)'
    : isDark ? 'rgba(245, 158, 11, 0.85)' : 'rgba(217, 119, 6, 0.9)';
  ctx.fillText(badgeText, 14 * dpr, chartH - 6 * dpr);

  ctx.restore();
}
