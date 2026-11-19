import { Candle } from '../types';
import { Mi007AnalysisResult } from './types';

export interface RenderMi007Params {
  ctx: CanvasRenderingContext2D;
  data: Mi007AnalysisResult;
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

  ctx.save();

  // ── 1. Institutional Volume Profile (Fixed Range Histogram + POC / VAH / VAL) ──
  const vp = data.volumeProfile;
  if (vp.bins.length > 0 && vp.fixedRange.totalVolume > 0) {
    const maxBinVol = Math.max(...vp.bins.map((b) => b.volume), 1);
    const maxBarW = Math.min(92 * dpr, chartW * 0.14);
    const rightEdge = chartW - 2 * dpr;

    for (const bin of vp.bins) {
      const yTop = priceToY(bin.priceHigh);
      const yBot = priceToY(bin.priceLow);
      if (yBot < 0 || yTop > chartH) continue;
      const barH = Math.max(1.5 * dpr, Math.abs(yBot - yTop) - 0.8 * dpr);
      const barW = (bin.volume / maxBinVol) * maxBarW;
      const inVa = bin.priceMid >= vp.fixedRange.val && bin.priceMid <= vp.fixedRange.vah;

      ctx.fillStyle = bin.isHvn
        ? (isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(2, 132, 199, 0.22)')
        : bin.isLvn
        ? (isDark ? 'rgba(251, 191, 36, 0.16)' : 'rgba(217, 119, 6, 0.14)')
        : inVa
        ? (isDark ? 'rgba(148, 163, 184, 0.20)' : 'rgba(100, 116, 139, 0.16)')
        : (isDark ? 'rgba(100, 116, 139, 0.10)' : 'rgba(148, 163, 184, 0.10)');
      ctx.fillRect(rightEdge - barW, Math.min(yTop, yBot), barW, barH);
    }

    // POC, VAH, VAL horizontal lines
    const drawVpLine = (price: number, label: string, color: string, dashed: boolean) => {
      if (!price || price <= 0) return;
      const y = priceToY(price);
      if (y < 10 * dpr || y > chartH - 10 * dpr) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 0.9 * dpr : 1.3 * dpr;
      if (dashed) ctx.setLineDash([4 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.moveTo(chartW * 0.45, y);
      ctx.lineTo(rightEdge, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, rightEdge - 4 * dpr, y - 2 * dpr);
      ctx.restore();
    };

    drawVpLine(vp.fixedRange.poc, `POC ${formatPrice(vp.fixedRange.poc)}`, '#F59E0B', false);
    drawVpLine(vp.fixedRange.vah, `VAH`, 'rgba(148, 163, 184, 0.75)', true);
    drawVpLine(vp.fixedRange.val, `VAL`, 'rgba(148, 163, 184, 0.75)', true);
  }

  // ── 2. Fibonacci Confluence (Confirmed Major Swing Anchor + OTE Zone) ─────────
  const fib = data.fibonacci;
  if (fib) {
    const anchorStartIdx = Math.min(fib.swingHigh.index, fib.swingLow.index);
    const fibStartX = Math.max(8 * dpr, (anchorStartIdx - startIdx) * candleW + candleW / 2);
    const fibEndX = Math.min(chartW - 4 * dpr, (candles.length - 1 - startIdx) * candleW + candleW * 0.5);

    if (fibEndX > fibStartX + 20 * dpr) {
      // Soft OTE Zone fill (0.618 – 0.786)
      const yOteTop = priceToY(fib.oteZone[1]);
      const yOteBot = priceToY(fib.oteZone[0]);
      if (yOteBot > 0 && yOteTop < chartH) {
        ctx.fillStyle = fib.direction === 'BULLISH' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(244, 63, 94, 0.06)';
        ctx.fillRect(fibStartX, Math.max(0, yOteTop), fibEndX - fibStartX, Math.min(chartH, yOteBot) - Math.max(0, yOteTop));
      }

      // Draw key Fibonacci levels (0.50, 0.618, 0.705, 0.786, 1.272, 1.618)
      ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
      for (const lvl of fib.levels) {
        if (lvl.ratio === 1.0) continue; // avoid cluttering swing extreme
        const y = priceToY(lvl.price);
        if (y < 10 * dpr || y > chartH - 12 * dpr) continue;
        ctx.strokeStyle = lvl.isOte
          ? 'rgba(245, 158, 11, 0.55)'
          : lvl.isExtension
          ? 'rgba(16, 185, 129, 0.45)'
          : 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = lvl.ratio === 0.705 ? 1.1 * dpr : 0.8 * dpr;
        ctx.setLineDash([3 * dpr, 3 * dpr]);
        ctx.beginPath();
        ctx.moveTo(fibStartX, y);
        ctx.lineTo(fibEndX, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = lvl.isOte
          ? (isDark ? '#FBBF24' : '#B45309')
          : lvl.isExtension
          ? (isDark ? '#34D399' : '#047857')
          : (isDark ? '#94A3B8' : '#64748B');
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${lvl.label}`, fibStartX + 3 * dpr, y - 1.5 * dpr);
      }
    }
  }

  // ── 3. Active Institutional Setup Bracket (Entry / SL / TP1 / TP2 / TP3) ──────
  const st = data.activeSetup;
  if (st && st.isTradeable) {
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

  if (chartW >= 360 * dpr && chartH >= cardY + cardH + 20 * dpr) {
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
    ctx.fillText('MI007 INSTITUTIONAL SETUP', cardX + pad, cy);

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
