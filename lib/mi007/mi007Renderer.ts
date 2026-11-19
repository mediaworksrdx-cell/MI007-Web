import { Candle } from '../types';
import { Mi007AnalysisResult, Mi007Config } from './types';

export interface RenderMi007Params {
  ctx: CanvasRenderingContext2D;
  data: Mi007AnalysisResult;
  config?: Mi007Config;
  candles: Candle[];
  startIdx: number;
  endIdx: number;
  chartW: number;
  chartH: number;
  candleW: number;
  dpr: number;
  isDark: boolean;
  priceToY: (p: number) => number;
  formatPrice: (p: number) => string;
}

export function renderMi007Overlay({
  ctx,
  data,
  config,
  candles,
  startIdx,
  endIdx,
  chartW,
  chartH,
  candleW,
  dpr,
  isDark,
  priceToY,
  formatPrice,
}: RenderMi007Params) {
  if (!data || candles.length === 0) return;

  const showSmc = config?.showSmc !== false;
  const showFibo = config?.showFibo !== false;
  const vp = data.volumeProfile;

  ctx.save();

  // ── 1. Volume Profile is rendered via the chart's native VPVR layer (LAYER 2) when MI-007 Vol Pro is ON ──

  // ── 2. Fibonacci Confluence (TradingView-style Shaded Bands + Swing Anchor + OTE Zone) ──
  const fib = data.fibonacci;
  if (showFibo && fib && fib.levels.length > 0) {
    const highX = (fib.swingHigh.index - startIdx) * candleW + candleW / 2;
    const lowX = (fib.swingLow.index - startIdx) * candleW + candleW / 2;
    const highY = priceToY(fib.swingHigh.price);
    const lowY = priceToY(fib.swingLow.price);

    const anchorStartIdx = Math.min(fib.swingHigh.index, fib.swingLow.index);
    const rawFibStartX = (anchorStartIdx - startIdx) * candleW + candleW / 2;
    const fibStartX = Math.max(8 * dpr, Math.min(rawFibStartX, chartW - 80 * dpr));
    const fibEndX = chartW - 4 * dpr;

    if (fibEndX > fibStartX + 20 * dpr) {
      const levelByRatio = new Map<number, number>();
      for (const lv of fib.levels) levelByRatio.set(lv.ratio, lv.price);

      // Shaded horizontal Fibonacci bands (TradingView style, high visibility in Light & Dark)
      const bandSpecs: Array<{ r1: number; r2: number; darkFill: string; lightFill: string }> = [
        { r1: 0.0,   r2: 0.236, darkFill: 'rgba(148, 163, 184, 0.08)', lightFill: 'rgba(100, 116, 139, 0.09)' },
        { r1: 0.236, r2: 0.382, darkFill: 'rgba(56, 189, 248, 0.10)',  lightFill: 'rgba(2, 132, 199, 0.10)' },
        { r1: 0.382, r2: 0.5,   darkFill: 'rgba(16, 185, 129, 0.10)',  lightFill: 'rgba(5, 150, 105, 0.10)' },
        { r1: 0.5,   r2: 0.618, darkFill: 'rgba(245, 158, 11, 0.12)',  lightFill: 'rgba(217, 119, 6, 0.11)' },
        { r1: 0.618, r2: 0.786, darkFill: 'rgba(250, 204, 21, 0.22)',  lightFill: 'rgba(234, 179, 8, 0.22)' }, // OTE Golden Zone
        { r1: 0.786, r2: 1.0,   darkFill: 'rgba(244, 63, 94, 0.11)',   lightFill: 'rgba(225, 29, 72, 0.10)' },
      ];

      for (const b of bandSpecs) {
        const p1 = levelByRatio.get(b.r1);
        const p2 = levelByRatio.get(b.r2);
        if (p1 === undefined || p2 === undefined) continue;
        const y1 = priceToY(p1);
        const y2 = priceToY(p2);
        const top = Math.max(0, Math.min(y1, y2));
        const bot = Math.min(chartH, Math.max(y1, y2));
        if (bot > top) {
          ctx.fillStyle = isDark ? b.darkFill : b.lightFill;
          ctx.fillRect(fibStartX, top, fibEndX - fibStartX, bot - top);
        }
      }

      // OTE Golden Zone watermark inside 0.618 – 0.786 band (with VP HVN/POC Confluence detection)
      const yOteTop = priceToY(fib.oteZone[1]);
      const yOteBot = priceToY(fib.oteZone[0]);
      const oteMidY = (yOteTop + yOteBot) / 2;
      if (Math.abs(yOteBot - yOteTop) >= 14 * dpr && oteMidY > 16 * dpr && oteMidY < chartH - 16 * dpr) {
        const hasVpOteConfluence =
          (vp.fixedRange.poc >= fib.oteZone[0] && vp.fixedRange.poc <= fib.oteZone[1]) ||
          vp.hvnPrices.some((p) => p >= fib.oteZone[0] && p <= fib.oteZone[1]);
        const hudClearX = showSmc ? Math.min(272 * dpr, chartW * 0.36) : 14 * dpr;
        const oteLabelX = Math.max(fibStartX + 8 * dpr, hudClearX);
        ctx.save();
        ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = isDark ? 'rgba(253, 224, 71, 0.95)' : 'rgba(146, 64, 14, 0.95)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          hasVpOteConfluence ? `★ OTE + VP CONFLUENCE (0.618 – 0.786)` : `★ OTE ZONE (0.618 – 0.786)`,
          oteLabelX,
          oteMidY
        );
        ctx.restore();
      }

      // Diagonal anchor trendline connecting confirmed Swing Low <-> Swing High
      ctx.save();
      ctx.strokeStyle = fib.direction === 'BULLISH'
        ? (isDark ? 'rgba(16, 185, 129, 0.92)' : 'rgba(5, 150, 105, 0.92)')
        : (isDark ? 'rgba(244, 63, 94, 0.92)' : 'rgba(225, 29, 72, 0.92)');
      ctx.lineWidth = 2.0 * dpr;
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(lowX, lowY);
      ctx.lineTo(highX, highY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ringed anchor dots + Swing Low / Swing High tags
      for (const pt of [
        { x: lowX, y: lowY, col: '#10B981', tag: fib.direction === 'BULLISH' ? 'FIB 1.00 LOW' : 'FIB 0.00 LOW', below: true },
        { x: highX, y: highY, col: '#F43F5E', tag: fib.direction === 'BULLISH' ? 'FIB 0.00 HIGH' : 'FIB 1.00 HIGH', below: false },
      ]) {
        if (pt.x >= 0 && pt.x <= chartW && pt.y >= 0 && pt.y <= chartH) {
          ctx.fillStyle = pt.col;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.5 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isDark ? '#0F172A' : '#FFFFFF';
          ctx.lineWidth = 1.6 * dpr;
          ctx.stroke();

          ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
          const tw = ctx.measureText(pt.tag).width + 8 * dpr;
          const th = 12 * dpr;
          const bx = Math.max(6 * dpr, Math.min(pt.x - tw / 2, chartW - tw - 6 * dpr));
          const by = pt.below ? Math.min(chartH - th - 4 * dpr, pt.y + 7 * dpr) : Math.max(4 * dpr, pt.y - th - 7 * dpr);
          ctx.fillStyle = pt.col;
          ctx.beginPath();
          ctx.roundRect(bx, by, tw, th, 3 * dpr);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pt.tag, bx + tw / 2, by + th / 2);
        }
      }
      ctx.restore();

      // Horizontal Fibonacci lines + high-contrast pill labels
      const hudClearX = showSmc ? Math.min(272 * dpr, chartW * 0.36) : 14 * dpr;
      const labelX = Math.min(fibEndX - 135 * dpr, Math.max(fibStartX + 6 * dpr, hudClearX));
      ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;

      for (const lvl of fib.levels) {
        const y = priceToY(lvl.price);
        if (y < 8 * dpr || y > chartH - 8 * dpr) continue;

        const isAnchor = lvl.ratio === 0.0 || lvl.ratio === 1.0;
        const isEq = lvl.ratio === 0.5;
        const isShallow = lvl.ratio === 0.236 || lvl.ratio === 0.382;

        const lineColor = isAnchor
          ? (isDark ? 'rgba(226, 232, 240, 0.90)' : 'rgba(15, 23, 42, 0.85)')
          : lvl.isOte
          ? (isDark ? 'rgba(251, 191, 36, 0.95)' : 'rgba(180, 83, 9, 0.95)')
          : isEq
          ? (isDark ? 'rgba(52, 211, 153, 0.90)' : 'rgba(5, 150, 105, 0.90)')
          : lvl.isExtension
          ? (isDark ? 'rgba(192, 132, 252, 0.90)' : 'rgba(126, 34, 206, 0.88)')
          : isShallow
          ? (isDark ? 'rgba(56, 189, 248, 0.65)' : 'rgba(2, 132, 199, 0.68)')
          : (isDark ? 'rgba(148, 163, 184, 0.78)' : 'rgba(71, 85, 105, 0.78)');

        ctx.save();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = (isAnchor || lvl.ratio === 0.618 || lvl.ratio === 0.786 || isEq) ? 1.6 * dpr : 1.15 * dpr;
        ctx.setLineDash(isAnchor || lvl.ratio === 0.618 || lvl.ratio === 0.786 ? [] : [5 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(fibStartX, y);
        ctx.lineTo(fibEndX, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pill background behind Fib label so it never disappears into candles/white bg
        const text = `${lvl.label} (${formatPrice(lvl.price)})`;
        const padX = 4 * dpr;
        const pillW = ctx.measureText(text).width + padX * 2;
        const pillH = 12 * dpr;
        const px = Math.max(fibStartX + 4 * dpr, labelX);
        const py = y - pillH - 1 * dpr;

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.84)' : 'rgba(255, 255, 255, 0.90)';
        ctx.beginPath();
        ctx.roundRect(px, py, pillW, pillH, 2.5 * dpr);
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 0.75 * dpr;
        ctx.stroke();

        ctx.fillStyle = lineColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, px + padX, py + pillH / 2);
        ctx.restore();
      }
    }
  }

  // ── 3. Active Institutional Setup Bracket (Entry / SL / TP1 / TP2 / TP3) ──────
  const st = data.activeSetup;
  if (showSmc && st && st.isTradeable) {
    const isBull = st.direction === 'BULLISH';
    const lastCandleIdx = Math.min(endIdx - 1, candles.length - 1);
    const currentCandleX = (lastCandleIdx - startIdx) * candleW + candleW / 2;
    const rawStartX = (st.candleIndex - startIdx) * candleW + candleW / 2;
    const minW = Math.max(44 * dpr, candleW * 3);
    const x = Math.max(10 * dpr, Math.min(rawStartX, chartW - minW - 6 * dpr));
    const rightBound = Math.min(chartW - 4 * dpr, Math.max(x + minW, currentCandleX + candleW * 0.5));
    const boxW = rightBound - x;

    // Supporting Order Block highlight
    if (st.supportingOb) {
      const ob = st.supportingOb;
      const obX1 = Math.max(0, (ob.startIndex - startIdx) * candleW);
      const obY1 = priceToY(ob.topPrice);
      const obY2 = priceToY(ob.bottomPrice);
      ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.14)' : 'rgba(244, 63, 94, 0.14)';
      ctx.fillRect(obX1, Math.min(obY1, obY2), Math.max(candleW * 2, rightBound - obX1), Math.max(3 * dpr, Math.abs(obY2 - obY1)));
    }

    const yEntry = priceToY(st.entryPrice);
    const ySL = priceToY(st.stopLoss);
    const yTP1 = priceToY(st.target1);
    const yTP2 = priceToY(st.target2);
    const yTP3 = priceToY(st.target3);

    // Reward Zone (Entry -> TP1) & Risk Zone (Entry -> SL)
    const tpTop = Math.max(0, Math.min(yEntry, yTP1));
    const tpBot = Math.min(chartH, Math.max(yEntry, yTP1));
    if (tpBot > tpTop) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
      ctx.fillRect(x, tpTop, boxW, tpBot - tpTop);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([4 * dpr, 3 * dpr]);
      ctx.strokeRect(x, tpTop, boxW, tpBot - tpTop);
      ctx.setLineDash([]);
    }

    const slTop = Math.max(0, Math.min(yEntry, ySL));
    const slBot = Math.min(chartH, Math.max(yEntry, ySL));
    if (slBot > slTop) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.10)';
      ctx.fillRect(x, slTop, boxW, slBot - slTop);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([4 * dpr, 3 * dpr]);
      ctx.strokeRect(x, slTop, boxW, slBot - slTop);
      ctx.setLineDash([]);
    }

    // Entry, TP2, TP3 lines
    ctx.strokeStyle = isDark ? '#E2E8F0' : '#0F172A';
    ctx.lineWidth = 1.3 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, yEntry);
    ctx.lineTo(rightBound, yEntry);
    ctx.stroke();

    for (const yT of [yTP2, yTP3]) {
      if (yT >= 4 * dpr && yT <= chartH - 4 * dpr) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
        ctx.lineWidth = 0.9 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(x, yT);
        ctx.lineTo(rightBound, yT);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Non-overlapping right-edge badges (SL, Entry, TP1, TP2, TP3)
    const minY = 16 * dpr;
    const maxY = chartH - 26 * dpr;
    const badgeH = 14 * dpr;
    const minGap = 16 * dpr;
    const clamp = (v: number) => Math.max(minY, Math.min(maxY, v));

    const badges = [
      { y: clamp(ySL), text: `SL: ${formatPrice(st.stopLoss)}`, bg: 'rgba(220, 38, 38, 0.94)', fg: '#FFFFFF' },
      { y: clamp(yEntry), text: `ENTRY: ${formatPrice(st.entryPrice)}`, bg: isDark ? 'rgba(30, 41, 59, 0.96)' : 'rgba(15, 23, 42, 0.92)', fg: '#FFFFFF' },
      { y: clamp(yTP1), text: `TP1 (1:${st.riskReward1.toFixed(1)}): ${formatPrice(st.target1)}`, bg: 'rgba(16, 185, 129, 0.94)', fg: '#FFFFFF' },
      { y: clamp(yTP2), text: `TP2 (1:${st.riskReward2.toFixed(1)}): ${formatPrice(st.target2)}`, bg: 'rgba(5, 150, 105, 0.90)', fg: '#FFFFFF' },
    ];
    if (yTP3 >= 0 && yTP3 <= chartH) {
      badges.push({ y: clamp(yTP3), text: `TP3 (1:${st.riskReward3.toFixed(1)}): ${formatPrice(st.target3)}`, bg: 'rgba(4, 120, 87, 0.88)', fg: '#FFFFFF' });
    }

    badges.sort((a, b) => a.y - b.y);
    for (let i = 1; i < badges.length; i++) {
      if (badges[i].y - badges[i - 1].y < minGap) badges[i].y = badges[i - 1].y + minGap;
    }
    if (badges[badges.length - 1].y > maxY) {
      badges[badges.length - 1].y = maxY;
      for (let i = badges.length - 2; i >= 0; i--) {
        if (badges[i + 1].y - badges[i].y < minGap) badges[i].y = Math.max(minY, badges[i + 1].y - minGap);
      }
    }

    ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
    for (const b of badges) {
      const tw = ctx.measureText(b.text).width + 10 * dpr;
      const bx = Math.max(8 * dpr, rightBound - tw);
      ctx.fillStyle = b.bg;
      ctx.fillRect(bx, b.y - badgeH / 2, tw, badgeH);
      ctx.fillStyle = b.fg;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, bx + 5 * dpr, b.y);
    }
  }

  // ── 4. Section 8: Required MI007 Institutional Setup & Checklist HUD Card ─────
  const cardW = Math.min(252 * dpr, chartW * 0.34);
  const pad = 9 * dpr;
  const lineH = 13 * dpr;
  const setup = data.activeSetup;
  const checklistCount = setup ? setup.checklist.length : 0;
  const cardH = (setup ? 104 + checklistCount * 13 : 66) * dpr;
  const cardX = 12 * dpr;
  const cardY = 34 * dpr;

  if (showSmc && chartW >= 360 * dpr && chartH >= cardY + cardH + 20 * dpr) {
    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.9)' : 'rgba(203, 213, 225, 0.95)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 8 * dpr);
    ctx.fill();
    ctx.stroke();

    // Header row
    let cy = cardY + pad + 5 * dpr;
    ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
    ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MI-007 INSTITUTIONAL SETUP', cardX + pad, cy);

    if (setup) {
      const isBull = setup.direction === 'BULLISH';
      const dirText = setup.isTradeable ? setup.direction : 'NO TRADE';
      const dirColor = !setup.isTradeable ? '#94A3B8' : isBull ? '#10B981' : '#F43F5E';
      ctx.fillStyle = dirColor;
      ctx.textAlign = 'right';
      ctx.fillText(`${dirText} • ${setup.score}/100`, cardX + cardW - pad, cy);

      cy += lineH;
      ctx.font = `600 ${7 * dpr}px "JetBrains Mono",monospace`;
      ctx.fillStyle = isDark ? '#CBD5E1' : '#334155';
      ctx.textAlign = 'left';
      ctx.fillText(`${setup.classification} • ${data.regime.regime.replace('_', ' ')}`, cardX + pad, cy);

      // Price Grid (ENTRY, SL, TP1, TP2)
      cy += lineH + 3 * dpr;
      const colW = (cardW - pad * 2) / 2;
      const drawKv = (col: number, rowOffset: number, k: string, v: string, vColor: string) => {
        const kx = cardX + pad + col * colW;
        const ky = cy + rowOffset * (lineH + 2 * dpr);
        ctx.font = `600 ${6.8 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
        ctx.textAlign = 'left';
        ctx.fillText(k, kx, ky);
        ctx.font = `bold ${7.5 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = vColor;
        ctx.textAlign = 'right';
        ctx.fillText(v, kx + colW - 6 * dpr, ky);
      };

      drawKv(0, 0, 'ENTRY', formatPrice(setup.entryPrice), isDark ? '#F8FAFC' : '#0F172A');
      drawKv(1, 0, 'STOP LOSS', formatPrice(setup.stopLoss), '#F43F5E');
      drawKv(0, 1, 'TARGET 1', formatPrice(setup.target1), '#10B981');
      drawKv(1, 1, 'TARGET 2', formatPrice(setup.target2), '#10B981');

      // Divider
      cy += (lineH + 2 * dpr) * 2 + 2 * dpr;
      ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(226, 232, 240, 0.9)';
      ctx.beginPath();
      ctx.moveTo(cardX + pad, cy);
      ctx.lineTo(cardX + cardW - pad, cy);
      ctx.stroke();

      // Confirmation Checklist Header
      cy += 9 * dpr;
      ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
      ctx.textAlign = 'left';
      ctx.fillText('CONFIRMATION CHECKLIST', cardX + pad, cy);
      ctx.textAlign = 'right';
      ctx.fillText(`VOL: ${data.volumeProfile.volumeQuality}`, cardX + cardW - pad, cy);

      // Checklist Items
      for (const item of setup.checklist) {
        cy += lineH;
        const badgeColor =
          item.status === 'Confirmed'
            ? '#10B981'
            : item.status === 'Pending'
            ? '#F59E0B'
            : '#64748B';
        ctx.font = `bold ${6.6 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = badgeColor;
        ctx.textAlign = 'left';
        const tag = item.status === 'Confirmed' ? '✓' : item.status === 'Pending' ? '◐' : '○';
        ctx.fillText(`${tag} ${item.label}`, cardX + pad, cy);

        ctx.textAlign = 'right';
        ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
        ctx.fillText(`${item.awarded}/${item.weight}`, cardX + cardW - pad, cy);
      }
    } else {
      cy += lineH + 4 * dpr;
      ctx.font = `600 ${7.5 * dpr}px "JetBrains Mono",monospace`;
      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
      ctx.textAlign = 'left';
      ctx.fillText('Awaiting closed-candle institutional confluence...', cardX + pad, cy);
    }
  }

  ctx.restore();
}
