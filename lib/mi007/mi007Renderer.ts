import { Candle } from '../types';
import { Mi007AnalysisResult, Mi007Config } from './types';

export interface RenderMi007Params {
  ctx: CanvasRenderingContext2D;
  data: Mi007AnalysisResult;
  config?: Mi007Config;
  hudCollapsed?: boolean;
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
  hudCollapsed = false,
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
  const showVolPro = config?.showVolPro !== false;
  const showFibo = config?.showFibo !== false;
  const vp = data.volumeProfile;

  ctx.save();

  // ── 1A. Left-Docked Split Volume Profile (Blue/White 70% VA) + Estimated Delta Profile (Green/Red) ──
  const hasLeftVolPro = Boolean(showVolPro && vp.bins.length > 0 && vp.fixedRange.totalVolume > 0);
  const volMaxW = Math.min(72 * dpr, chartW * 0.10);
  const deltaMaxW = Math.min(46 * dpr, chartW * 0.065);
  const leftEdge = 2 * dpr;
  if (hasLeftVolPro) {
    const maxBinVol = Math.max(...vp.bins.map((b) => b.volume), 1);
    const maxDelta = Math.max(...vp.bins.map((b) => Math.abs(b.buyVolume - b.sellVolume)), 1);
    const spineX = leftEdge + deltaMaxW;

    // Subtle vertical spine separating Estimated Delta Profile (left) and Volume Profile (right)
    ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(71, 85, 105, 0.22)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(spineX, 16 * dpr);
    ctx.lineTo(spineX, chartH - 16 * dpr);
    ctx.stroke();

    for (const bin of vp.bins) {
      const yTop = priceToY(bin.priceHigh);
      const yBot = priceToY(bin.priceLow);
      if (yBot < 0 || yTop > chartH) continue;
      const barH = Math.max(1.8 * dpr, Math.abs(yBot - yTop) - 0.8 * dpr);
      const yRect = Math.min(yTop, yBot);
      const inVa = bin.priceMid >= vp.fixedRange.val && bin.priceMid <= vp.fixedRange.vah;
      const isPocBin = Math.abs(bin.priceMid - vp.fixedRange.poc) <= (bin.priceHigh - bin.priceLow) * 0.6;

      // Right of spine: Volume Profile (Blue inside 70% VA, White/Slate outside VA, Gold on POC)
      const vW = (bin.volume / maxBinVol) * volMaxW;
      if (vW > 0.5) {
        ctx.fillStyle = isPocBin
          ? '#F59E0B'
          : inVa
          ? (isDark ? 'rgba(14, 165, 233, 0.78)' : 'rgba(2, 132, 199, 0.72)')
          : (isDark ? 'rgba(226, 232, 240, 0.35)' : 'rgba(100, 116, 139, 0.28)');
        ctx.fillRect(spineX, yRect, vW, barH);
      }

      // Left of spine: Estimated Delta Profile (Green positive delta, Red/Orange negative delta)
      const delta = bin.buyVolume - bin.sellVolume;
      const dW = (Math.abs(delta) / maxDelta) * deltaMaxW;
      if (dW > 0.5) {
        ctx.fillStyle = delta >= 0
          ? (isDark ? 'rgba(16, 185, 129, 0.78)' : 'rgba(5, 150, 105, 0.72)')
          : (isDark ? 'rgba(249, 115, 22, 0.82)' : 'rgba(225, 29, 72, 0.74)');
        ctx.fillRect(spineX - dW, yRect, dW, barH);
      }
    }

    // Header micro-label above split profile (transparently marks Estimated Delta)
    ctx.font = `bold ${7 * dpr}px "JetBrains Mono",monospace`;
    ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.85)' : 'rgba(71, 85, 105, 0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const profileLabel = vp.volumeQuality === 'ACTUAL' ? 'EST. DELTA | VOL PRO' : 'EST. DELTA | VOL PRO (EST)';
    ctx.fillText(profileLabel, leftEdge + 2 * dpr, 6 * dpr);

    // Key Institutional Horizontal Bands: POC (Gold), Prior Daily POC (Yellow), VAH & VAL
    // De-collided vertical badges + subtle secondary dashed lines to keep candlesticks uncluttered
    const vpLevels: Array<{ price: number; label: string; color: string; dashed: boolean; thick: boolean; y: number; badgeY: number }> = [];
    const pushVpLevel = (price: number, label: string, color: string, dashed: boolean, thick = false) => {
      if (!price || price <= 0) return;
      const y = priceToY(price);
      if (y < 14 * dpr || y > chartH - 14 * dpr) return;
      vpLevels.push({ price, label, color, dashed, thick, y, badgeY: y });
    };

    pushVpLevel(vp.fixedRange.poc, `POC ${formatPrice(vp.fixedRange.poc)}`, '#F59E0B', false, true);
    if (vp.daily && vp.daily.poc > 0 && Math.abs(vp.daily.poc - vp.fixedRange.poc) > (vp.fixedRange.vah - vp.fixedRange.val) * 0.05) {
      pushVpLevel(vp.daily.poc, `PD-POC ${formatPrice(vp.daily.poc)}`, '#EAB308', true, false);
    }
    pushVpLevel(vp.fixedRange.vah, `VAH ${formatPrice(vp.fixedRange.vah)}`, isDark ? '#38BDF8' : '#0284C7', true, false);
    pushVpLevel(vp.fixedRange.val, `VAL ${formatPrice(vp.fixedRange.val)}`, isDark ? '#38BDF8' : '#0284C7', true, false);

    // 1. Draw lines first (subtler opacity on secondary dashed levels so candles breathe)
    for (const lv of vpLevels) {
      ctx.save();
      ctx.globalAlpha = lv.thick ? 0.85 : 0.42;
      ctx.strokeStyle = lv.color;
      ctx.lineWidth = lv.thick ? 1.8 * dpr : 1.0 * dpr;
      if (lv.dashed) ctx.setLineDash([5 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(leftEdge, lv.y);
      ctx.lineTo(lv.thick ? chartW * 0.82 : chartW * 0.55, lv.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 2. Vertically de-collide left-edge VP badges so VAH / PD-POC / POC / VAL never overlap
    vpLevels.sort((a, b) => a.badgeY - b.badgeY);
    const vpMinGap = 16 * dpr;
    const vpMinY = 24 * dpr;
    const vpMaxY = chartH - 16 * dpr;
    for (let i = 1; i < vpLevels.length; i++) {
      if (vpLevels[i].badgeY - vpLevels[i - 1].badgeY < vpMinGap) {
        vpLevels[i].badgeY = vpLevels[i - 1].badgeY + vpMinGap;
      }
    }
    if (vpLevels.length > 0 && vpLevels[vpLevels.length - 1].badgeY > vpMaxY) {
      vpLevels[vpLevels.length - 1].badgeY = vpMaxY;
      for (let i = vpLevels.length - 2; i >= 0; i--) {
        if (vpLevels[i + 1].badgeY - vpLevels[i].badgeY < vpMinGap) {
          vpLevels[i].badgeY = Math.max(vpMinY, vpLevels[i + 1].badgeY - vpMinGap);
        }
      }
    }

    for (const lv of vpLevels) {
      ctx.save();
      ctx.font = `bold ${7.8 * dpr}px "JetBrains Mono",monospace`;
      const padX = 4 * dpr;
      const tw = ctx.measureText(lv.label).width + padX * 2;
      const th = 13 * dpr;
      const bx = leftEdge + 3 * dpr;
      const by = Math.max(vpMinY - th / 2, Math.min(vpMaxY - th / 2, lv.badgeY - th / 2));
      ctx.fillStyle = lv.thick ? lv.color : (isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.94)');
      ctx.beginPath();
      ctx.roundRect(bx, by, tw, th, 2.5 * dpr);
      ctx.fill();
      if (!lv.thick) {
        ctx.strokeStyle = lv.color;
        ctx.lineWidth = 0.85 * dpr;
        ctx.stroke();
      }
      ctx.fillStyle = lv.thick ? '#0F172A' : lv.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lv.label, bx + padX, by + th / 2);
      ctx.restore();
    }
  }

  // ── 1B. Order Flow Volume Bubbles (Big Trades + Gold Ring on Passive Absorption) ──
  // Permanent across 100% of historical candles (volume surge >= 1.75x, gold ring on absorption >= 2.0x)
  if (data.volumeBubbles && data.volumeBubbles.length > 0) {
    ctx.save();
    for (const b of data.volumeBubbles) {
      if (b.candleIndex < startIdx || b.candleIndex >= endIdx) continue;
      const bx = (b.candleIndex - startIdx) * candleW + candleW / 2;
      const by = priceToY(b.price);
      if (by < 8 * dpr || by > chartH - 8 * dpr) continue;

      const radius = Math.max(4.5 * dpr, Math.min(15 * dpr, (3.5 + b.relVolume * 2.4) * dpr));
      const isBuy = b.side === 'BUY';

      ctx.fillStyle = isBuy
        ? (isDark ? 'rgba(16, 185, 129, 0.42)' : 'rgba(5, 150, 105, 0.36)')
        : (isDark ? 'rgba(244, 63, 94, 0.46)' : 'rgba(225, 29, 72, 0.38)');
      ctx.beginPath();
      ctx.arc(bx, by, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = b.isAbsorption
        ? '#FACC15'
        : isBuy
        ? (isDark ? 'rgba(52, 211, 153, 0.90)' : 'rgba(4, 120, 87, 0.85)')
        : (isDark ? 'rgba(251, 113, 133, 0.90)' : 'rgba(190, 18, 60, 0.85)');
      ctx.lineWidth = b.isAbsorption ? 2.0 * dpr : 1.1 * dpr;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── 2. Fibonacci Retracement & Extension (Clean Thick Black Lines Only — No Color Fills) ──
  const fib = data.fibonacci;
  if (showFibo && fib && fib.levels.length > 0) {
    const highX = (fib.swingHigh.index - startIdx) * candleW + candleW / 2;
    const lowX = (fib.swingLow.index - startIdx) * candleW + candleW / 2;
    const highY = priceToY(fib.swingHigh.price);
    const lowY = priceToY(fib.swingLow.price);

    const anchorStartIdx = Math.min(fib.swingHigh.index, fib.swingLow.index);
    const rawFibStartX = (anchorStartIdx - startIdx) * candleW + candleW / 2;
    // Keep Fibonacci lines clear of the left-docked Volume Profile histogram
    const fibLeftFloor = hasLeftVolPro ? leftEdge + deltaMaxW + volMaxW + 10 * dpr : 10 * dpr;
    const fibStartX = Math.max(fibLeftFloor, Math.min(rawFibStartX, chartW - 80 * dpr));
    const fibEndX = chartW - 4 * dpr;

    if (fibEndX > fibStartX + 20 * dpr) {
      const ink = isDark ? '#F8FAFC' : '#000000';
      const pillBg = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)';

      // Thick black dashed diagonal anchor line connecting Swing Low <-> Swing High
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.0 * dpr;
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(lowX, lowY);
      ctx.lineTo(highX, highY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Black anchor dots on confirmed swing extremes
      for (const pt of [
        { x: lowX, y: lowY, tag: fib.direction === 'BULLISH' ? '1.00 LOW' : '0.00 LOW', below: true },
        { x: highX, y: highY, tag: fib.direction === 'BULLISH' ? '0.00 HIGH' : '1.00 HIGH', below: false },
      ]) {
        if (pt.x >= 0 && pt.x <= chartW && pt.y >= 0 && pt.y <= chartH) {
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4.2 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isDark ? '#0F172A' : '#FFFFFF';
          ctx.lineWidth = 1.4 * dpr;
          ctx.stroke();

          ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
          const tw = ctx.measureText(pt.tag).width + 8 * dpr;
          const th = 13 * dpr;
          const bx = Math.max(6 * dpr, Math.min(pt.x - tw / 2, chartW - tw - 6 * dpr));
          const by = pt.below ? Math.min(chartH - th - 4 * dpr, pt.y + 7 * dpr) : Math.max(4 * dpr, pt.y - th - 7 * dpr);
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.roundRect(bx, by, tw, th, 2.5 * dpr);
          ctx.fill();
          ctx.fillStyle = isDark ? '#0F172A' : '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pt.tag, bx + tw / 2, by + th / 2);
        }
      }
      ctx.restore();

      // Thick black horizontal Fibonacci lines (crisp key levels, subtler minor retracements)
      for (const lvl of fib.levels) {
        const y = priceToY(lvl.price);
        if (y < 8 * dpr || y > chartH - 8 * dpr) continue;

        const isKey = lvl.ratio === 0.0 || lvl.ratio === 0.5 || lvl.ratio === 0.618 || lvl.ratio === 0.786 || lvl.ratio === 1.0;

        ctx.save();
        ctx.globalAlpha = isKey ? 0.85 : 0.36;
        ctx.strokeStyle = ink;
        ctx.lineWidth = isKey ? 2.2 * dpr : 1.5 * dpr;
        ctx.setLineDash(isKey ? [] : [5 * dpr, 4 * dpr]);
        ctx.beginPath();
        ctx.moveTo(fibStartX, y);
        ctx.lineTo(fibEndX, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Clean right-edge anti-collision badge layout (keeps candles in center completely unobstructed)
      ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;

      const visibleFibLevels = fib.levels
        .map(lvl => ({
          ...lvl,
          y: priceToY(lvl.price),
          badgeY: priceToY(lvl.price),
          isKey: lvl.ratio === 0.0 || lvl.ratio === 0.5 || lvl.ratio === 0.618 || lvl.ratio === 0.786 || lvl.ratio === 1.0 || lvl.ratio === 1.272 || lvl.ratio === 1.618,
        }))
        .filter(l => l.y >= 10 * dpr && l.y <= chartH - 10 * dpr)
        .sort((a, b) => a.y - b.y);

      const minGapY = 16 * dpr;
      const placedFibs: typeof visibleFibLevels = [];
      for (const lvl of visibleFibLevels) {
        const prev = placedFibs[placedFibs.length - 1];
        if (prev && Math.abs(lvl.badgeY - prev.badgeY) < minGapY) {
          if (!lvl.isKey) continue; // Skip minor intermediate label when tightly packed
          lvl.badgeY = prev.badgeY + minGapY;
        }
        placedFibs.push(lvl);
      }

      const maxFibY = chartH - 12 * dpr;
      if (placedFibs.length > 0 && placedFibs[placedFibs.length - 1].badgeY > maxFibY) {
        placedFibs[placedFibs.length - 1].badgeY = maxFibY;
        for (let i = placedFibs.length - 2; i >= 0; i--) {
          if (placedFibs[i + 1].badgeY - placedFibs[i].badgeY < minGapY) {
            placedFibs[i].badgeY = Math.max(12 * dpr, placedFibs[i + 1].badgeY - minGapY);
          }
        }
      }

      for (const lvl of placedFibs) {
        const text = `${lvl.label} (${formatPrice(lvl.price)})`;
        const padX = 4 * dpr;
        const pillW = ctx.measureText(text).width + padX * 2;
        const pillH = 13 * dpr;
        const px = Math.max(fibStartX + 4 * dpr, fibEndX - pillW - 4 * dpr);
        const py = Math.max(4 * dpr, Math.min(chartH - pillH - 4 * dpr, lvl.badgeY - pillH / 2));

        ctx.save();
        ctx.globalAlpha = lvl.isKey ? 0.96 : 0.78;
        ctx.fillStyle = pillBg;
        ctx.beginPath();
        ctx.roundRect(px, py, pillW, pillH, 2.5 * dpr);
        ctx.fill();
        ctx.strokeStyle = isDark ? '#475569' : '#94A3B8';
        ctx.lineWidth = 0.85 * dpr;
        ctx.stroke();

        ctx.fillStyle = ink;
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
  const cardW = Math.min(286 * dpr, chartW * 0.36);
  const pad = 10 * dpr;
  const lineH = 15 * dpr;
  const setup = data.activeSetup;
  const checklistCount = setup ? setup.checklist.length : 0;
  const cardH = hudCollapsed
    ? 28 * dpr
    : (setup ? 116 + checklistCount * 15 : 72) * dpr;
  // Clear the left-docked Volume Profile when Vol Pro is active so neither overlaps the other
  const leftVolClearX = hasLeftVolPro ? leftEdge + deltaMaxW + volMaxW + 10 * dpr : 12 * dpr;
  const cardX = Math.min(leftVolClearX, Math.max(12 * dpr, chartW - cardW - 12 * dpr));
  const cardY = 34 * dpr;

  if (showSmc && chartW >= 360 * dpr && chartH >= cardY + cardH + 20 * dpr) {
    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.90)';
    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.85)' : 'rgba(203, 213, 225, 0.85)';
    ctx.lineWidth = 1.0 * dpr;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 8 * dpr);
    ctx.fill();
    ctx.stroke();

    // Header row (leave 22*dpr on right for collapse/expand toggle button)
    let cy = cardY + (hudCollapsed ? cardH / 2 : pad + 6 * dpr);
    ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono",monospace`;
    ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(hudCollapsed ? 'MI-007 SETUP' : 'MI-007 INSTITUTIONAL SETUP', cardX + pad, cy);

    if (setup) {
      const isBull = setup.direction === 'BULLISH';
      const dirText = setup.isTradeable ? setup.direction : 'NO TRADE';
      const dirColor = !setup.isTradeable ? '#64748B' : isBull ? '#059669' : '#E11D48';
      ctx.fillStyle = dirColor;
      ctx.textAlign = 'right';
      ctx.fillText(`${dirText} • ${setup.score}/100`, cardX + cardW - pad - 20 * dpr, cy);

      if (hudCollapsed) {
        ctx.restore();
        return;
      }

      cy += lineH;
      ctx.font = `600 ${8 * dpr}px "JetBrains Mono",monospace`;
      ctx.fillStyle = isDark ? '#CBD5E1' : '#334155';
      ctx.textAlign = 'left';
      const subHeader = setup.isTradeable
        ? `${setup.classification} • ${data.regime.regime.replace('_', ' ')}`
        : `INDICATIVE ONLY (NO TRADE) • ${data.regime.regime.replace('_', ' ')}`;
      ctx.fillText(subHeader, cardX + pad, cy);

      // Price Grid (labeled explicitly as INDICATIVE when !setup.isTradeable)
      cy += lineH + 3 * dpr;
      const colW = (cardW - pad * 2) / 2;
      const drawKv = (col: number, rowOffset: number, k: string, v: string, vColor: string) => {
        const kx = cardX + pad + col * colW;
        const ky = cy + rowOffset * (lineH + 2 * dpr);
        ctx.font = `600 ${7.8 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
        ctx.textAlign = 'left';
        ctx.fillText(k, kx, ky);
        ctx.font = `bold ${8.5 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = setup.isTradeable ? vColor : (isDark ? '#64748B' : '#94A3B8');
        ctx.textAlign = 'right';
        ctx.fillText(v, kx + colW - 6 * dpr, ky);
      };

      drawKv(0, 0, setup.isTradeable ? 'ENTRY' : 'REF ENTRY', formatPrice(setup.entryPrice), isDark ? '#F8FAFC' : '#0F172A');
      drawKv(1, 0, setup.isTradeable ? 'STOP LOSS' : 'REF SL', formatPrice(setup.stopLoss), '#F43F5E');
      drawKv(0, 1, setup.isTradeable ? 'TARGET 1' : 'REF TP1', formatPrice(setup.target1), '#10B981');
      drawKv(1, 1, setup.isTradeable ? 'TARGET 2' : 'REF TP2', formatPrice(setup.target2), '#10B981');

      // Divider
      cy += (lineH + 2 * dpr) * 2 + 2 * dpr;
      ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(226, 232, 240, 0.9)';
      ctx.beginPath();
      ctx.moveTo(cardX + pad, cy);
      ctx.lineTo(cardX + cardW - pad, cy);
      ctx.stroke();

      // Confirmation Checklist Header
      cy += 9 * dpr;
      ctx.font = `bold ${8 * dpr}px "JetBrains Mono",monospace`;
      ctx.fillStyle = isDark ? '#94A3B8' : '#475569';
      ctx.textAlign = 'left';
      ctx.fillText('CONFIRMATION CHECKLIST', cardX + pad, cy);
      ctx.textAlign = 'right';
      ctx.fillText(`VOL: ${data.volumeProfile.volumeQuality}`, cardX + cardW - pad, cy);

      // Checklist Items
      for (const item of setup.checklist) {
        cy += lineH;
        const badgeColor =
          item.status === 'Confirmed'
            ? '#059669'
            : item.status === 'Pending'
            ? '#D97706'
            : '#64748B';
        ctx.font = `bold ${7.8 * dpr}px "JetBrains Mono",monospace`;
        ctx.fillStyle = badgeColor;
        ctx.textAlign = 'left';
        const tag = item.status === 'Confirmed' ? '✓' : item.status === 'Pending' ? '◐' : '○';
        ctx.fillText(`${tag} ${item.label}`, cardX + pad, cy);

        ctx.textAlign = 'right';
        ctx.fillStyle = isDark ? '#CBD5E1' : '#334155';
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
