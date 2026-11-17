// ─────────────────────────────────────────────────────────────────────────────
// Smart Chart Annotation Manager (Institutional SMC Visualization Engine)
// ─────────────────────────────────────────────────────────────────────────────
// Responsibilities:
// 1. Label collision detection & intelligent automatic repositioning (AABB)
// 2. Duplicate signal elimination & nearby liquidity level consolidation
// 3. Liquidity sweep event aggregation (prevents stacked sweep badges)
// 4. Age-dependent historical annotation fading (dim historical structure)
// 5. Right-scale price-axis badge collision management
// 6. Interactive zone indexing for clean on-hover telemetry tooltips
// ─────────────────────────────────────────────────────────────────────────────

import { SmcLiquidityLevel, SmcLiquiditySweep } from '../smcEngine';

export type SmcVisualizationMode = 'clean' | 'advanced' | 'analysis';

export interface AnnotationBox {
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  priority: number; // Higher numbers render first, or displace lower priority items
}

export interface PriceAxisBadge {
  id?: string;
  originalY: number;
  y: number;
  text: string;
  color: string;
  bg: string;
  border: string;
  priority: number;
}

export interface ConsolidatedLiquidityLevel {
  id: string;
  price: number;
  type: 'BSL' | 'SSL' | 'EQH' | 'EQL';
  label: string;
  count: number;
  isSwept: boolean;
  candleIndices: number[];
}

export interface ConsolidatedSweep {
  candleIndex: number;
  price: number;
  sweptLevelPrice: number;
  isHighSweep: boolean;
  count: number;
  label: string;
  time?: number;
}

export interface ExclusionZone {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  reason?: string;
}

export interface InteractiveZone {
  id: string;
  type: 'OB' | 'BREAKER' | 'FVG' | 'IFVG' | 'DEALING_RANGE';
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  title: string;
  subtitle: string;
  details: string[];
}

export class SmartAnnotationManager {
  private placedLabels: AnnotationBox[] = [];
  private priceBadges: PriceAxisBadge[] = [];
  private interactiveZones: InteractiveZone[] = [];
  private exclusionZones: ExclusionZone[] = [];
  private dpr: number = 1;

  constructor(dpr: number = 1) {
    this.dpr = dpr;
  }

  public reset(dpr: number = 1): void {
    this.placedLabels = [];
    this.priceBadges = [];
    this.interactiveZones = [];
    this.exclusionZones = [];
    this.dpr = dpr;
  }

  /** Registers a protected area where no annotations or text badges may be placed (e.g. current candle, live price marker) */
  public addExclusionZone(zone: ExclusionZone): void {
    this.exclusionZones.push(zone);
  }

  // ── 1. Label Collision Detection & Nudging ──────────────────────────────────
  public canPlaceLabel(box: AnnotationBox, padding: number = 2): boolean {
    const pad = padding * this.dpr;
    const bLeft = box.x - pad;
    const bRight = box.x + box.w + pad;
    const bTop = box.y - pad;
    const bBottom = box.y + box.h + pad;

    // Check against absolute exclusion zones first (e.g. current candle wicks/body)
    for (const ez of this.exclusionZones) {
      const ezOverlapX = bLeft < ez.x2 && bRight > ez.x1;
      const ezOverlapY = bTop < ez.y2 && bBottom > ez.y1;
      if (ezOverlapX && ezOverlapY) {
        return false;
      }
    }

    for (const p of this.placedLabels) {
      const pLeft = p.x;
      const pRight = p.x + p.w;
      const pTop = p.y;
      const pBottom = p.y + p.h;

      const xOverlap = bLeft < pRight && bRight > pLeft;
      const yOverlap = bTop < pBottom && bBottom > pTop;

      if (xOverlap && yOverlap) {
        return false;
      }
    }
    return true;
  }

  /**
   * Attempts to place a label box at its preferred (x, y).
   * If collision occurs, tests vertical nudges (+dy, -dy, +2dy, -2dy).
   * Returns { placed: true, x, y } if placed, or { placed: false, ... } if fully blocked.
   */
  public tryPlaceLabel(
    box: AnnotationBox,
    nudgeStep: number = 14,
    maxNudges: number = 2
  ): { placed: boolean; x: number; y: number } {
    const step = nudgeStep * this.dpr;

    // Test primary position first
    if (this.canPlaceLabel(box)) {
      this.placedLabels.push(box);
      return { placed: true, x: box.x, y: box.y };
    }

    // Try vertical offsets: [-step, +step, -2step, +2step]
    const offsets: number[] = [];
    for (let i = 1; i <= maxNudges; i++) {
      offsets.push(-i * step);
      offsets.push(i * step);
    }

    for (const dy of offsets) {
      const testBox: AnnotationBox = {
        ...box,
        y: box.y + dy,
      };
      if (this.canPlaceLabel(testBox)) {
        this.placedLabels.push(testBox);
        return { placed: true, x: testBox.x, y: testBox.y };
      }
    }

    // CH-012: Horizontal placement fallback when vertical lanes are saturated
    const hStep = Math.max(24 * this.dpr, box.w + 8 * this.dpr);
    for (const dx of [-hStep, hStep]) {
      const testBox: AnnotationBox = { ...box, x: box.x + dx };
      if (this.canPlaceLabel(testBox)) {
        this.placedLabels.push(testBox);
        return { placed: true, x: testBox.x, y: testBox.y };
      }
    }

    // If candidate has very high priority (>= 80), displace colliding lower-priority boxes
    // and attempt to re-place them via vertical/horizontal nudging instead of dropping them (CH-011)
    if (box.priority >= 80) {
      const colliders = this.placedLabels.filter(p => {
        const xOverlap = box.x < p.x + p.w && box.x + box.w > p.x;
        const yOverlap = box.y < p.y + p.h && box.y + box.h > p.y;
        return xOverlap && yOverlap;
      });

      const allLower = colliders.every(c => c.priority < box.priority);
      if (allLower && colliders.length <= 2) {
        this.placedLabels = this.placedLabels.filter(p => !colliders.includes(p));
        this.placedLabels.push(box);
        for (const displaced of colliders) {
          this.tryPlaceLabel(displaced, nudgeStep, 1);
        }
        return { placed: true, x: box.x, y: box.y };
      }
    }

    return { placed: false, x: box.x, y: box.y };
  }

  // ── 2. Right-Axis Price Badge Collision Management ─────────────────────────
  public registerPriceBadge(badge: PriceAxisBadge): void {
    this.priceBadges.push(badge);
  }

  public layoutPriceBadges(
    minY: number,
    maxY: number,
    badgeH: number = 14,
    currentPriceY?: number,
    maxBadges: number = 4
  ): PriceAxisBadge[] {
    if (this.priceBadges.length === 0) return [];

    const bh = badgeH * this.dpr;
    const minGap = bh + 3 * this.dpr;
    const livePriceProtectionGap = 16 * this.dpr;

    // Filter out badges that collide with the current live price beacon
    let candidates = this.priceBadges.filter(b => {
      if (currentPriceY != null && currentPriceY > 0) {
        if (Math.abs(b.originalY - currentPriceY) < livePriceProtectionGap) {
          return false;
        }
      }
      return true;
    });

    // Sort by priority descending and cap at maxBadges
    candidates.sort((a, b) => b.priority - a.priority);
    candidates = candidates.slice(0, maxBadges);

    // Sort by desired original Y coordinate ascending for layout
    const sorted = [...candidates].sort((a, b) => a.originalY - b.originalY);
    const resolved: PriceAxisBadge[] = [];

    for (const b of sorted) {
      let targetY = Math.max(minY, Math.min(maxY - bh, b.originalY));

      if (currentPriceY != null && currentPriceY > 0) {
        if (Math.abs(targetY - currentPriceY) < livePriceProtectionGap) {
          if (targetY < currentPriceY) {
            targetY = currentPriceY - livePriceProtectionGap - bh;
          } else {
            targetY = currentPriceY + livePriceProtectionGap;
          }
        }
      }

      if (resolved.length > 0) {
        const last = resolved[resolved.length - 1];
        if (targetY < last.y + minGap) {
          targetY = last.y + minGap;
        }
      }

      if (targetY >= minY && targetY <= maxY - bh) {
        resolved.push({
          ...b,
          y: targetY,
        });
      }
    }

    return resolved;
  }

  // ── 3. Liquidity Level Consolidation ───────────────────────────────────────
  /**
   * Combines nearby equal highs and lows into consolidated zones.
   * e.g. 2 BSL levels within 0.25% distance -> 1 BSL (x2) level
   */
  public consolidateLiquidityLevels(
    levels: SmcLiquidityLevel[],
    currentPrice: number,
    thresholdPct: number = 0.0025
  ): ConsolidatedLiquidityLevel[] {
    if (!levels || levels.length === 0) return [];

    const sorted = [...levels].sort((a, b) => a.price - b.price);
    const groups: SmcLiquidityLevel[][] = [];

    for (const lvl of sorted) {
      if (groups.length === 0) {
        groups.push([lvl]);
        continue;
      }

      const currentGroup = groups[groups.length - 1];
      const avgPrice = currentGroup.reduce((sum, l) => sum + l.price, 0) / currentGroup.length;
      const distPct = Math.abs(lvl.price - avgPrice) / Math.max(1, avgPrice);

      // Same category (high side vs low side) and within threshold proximity
      const isHighGroup = currentGroup[0].type === 'BSL' || currentGroup[0].type === 'EQH';
      const isHighLvl = lvl.type === 'BSL' || lvl.type === 'EQH';

      if (isHighGroup === isHighLvl && distPct <= thresholdPct) {
        currentGroup.push(lvl);
      } else {
        groups.push([lvl]);
      }
    }

    return groups.map((grp) => {
      const avgPrice = grp.reduce((sum, l) => sum + l.price, 0) / grp.length;
      const count = grp.length;
      const hasEqh = grp.some(l => l.type === 'EQH');
      const hasBsl = grp.some(l => l.type === 'BSL');
      const hasEql = grp.some(l => l.type === 'EQL');
      const hasSsl = grp.some(l => l.type === 'SSL');

      let primaryType: 'BSL' | 'SSL' | 'EQH' | 'EQL' = grp[0].type;
      let baseLabel: string = primaryType;

      if (hasEqh && hasBsl) {
        primaryType = 'BSL';
        baseLabel = count > 2 ? `BSL / EQH (x${count})` : 'BSL / EQH';
      } else if (hasEql && hasSsl) {
        primaryType = 'SSL';
        baseLabel = count > 2 ? `SSL / EQL (x${count})` : 'SSL / EQL';
      } else if (count > 1) {
        baseLabel = `${primaryType} (x${count})`;
      } else {
        baseLabel = grp[0].label || primaryType;
      }

      const allSwept = grp.every(l => l.isSwept);
      const allCandleIndices = Array.from(new Set(grp.flatMap(l => l.candleIndices || [])));

      return {
        id: `consolidated-liq-${grp.map(g => g.id).join('-')}`,
        price: avgPrice,
        type: primaryType,
        label: baseLabel,
        count,
        isSwept: allSwept,
        candleIndices: allCandleIndices,
      };
    });
  }

  // ── 4. Liquidity Sweep Aggregation ─────────────────────────────────────────
  /**
   * Aggregates multiple sweeps occurring within close bar proximity into one primary badge.
   */
  public aggregateSweeps(
    sweeps: SmcLiquiditySweep[],
    barWindow: number = 4
  ): ConsolidatedSweep[] {
    if (!sweeps || sweeps.length === 0) return [];

    const sorted = [...sweeps].sort((a, b) => a.candleIndex - b.candleIndex);
    const clusters: SmcLiquiditySweep[][] = [];

    for (const sw of sorted) {
      if (clusters.length === 0) {
        clusters.push([sw]);
        continue;
      }

      const curCluster = clusters[clusters.length - 1];
      const lastSw = curCluster[curCluster.length - 1];

      if (sw.isHighSweep === lastSw.isHighSweep && (sw.candleIndex - lastSw.candleIndex) <= barWindow) {
        curCluster.push(sw);
      } else {
        clusters.push([sw]);
      }
    }

    return clusters.map((clust) => {
      const mainSw = clust[clust.length - 1]; // Latest sweep in cluster takes prominence
      const count = clust.length;
      const isHigh = mainSw.isHighSweep;
      const prefix = isHigh ? '▼ BSL SWEEP' : '▲ SSL SWEEP';
      const label = count > 1 ? `${prefix} (x${count})` : prefix;

      return {
        candleIndex: mainSw.candleIndex,
        price: mainSw.price,
        sweptLevelPrice: mainSw.sweptLevelPrice,
        isHighSweep: isHigh,
        count,
        label,
        time: mainSw.time,
      };
    });
  }

  // ── 5. Historical Annotation Fading Factor ──────────────────────────────────
  /**
   * Computes an alpha multiplier [0.15 to 1.0] based on how far in the past an element is.
   * Institutional visual rule: Historical information must not compete with current price action.
   */
  public computeHistoricalAlpha(
    candleIndex: number,
    currentBarIndex: number,
    mode: SmcVisualizationMode = 'clean',
    isMitigated: boolean = false
  ): number {
    const age = Math.max(0, currentBarIndex - candleIndex);

    let baseAlpha = 1.0;
    if (mode === 'clean') {
      if (age <= 20) {
        baseAlpha = 1.0;
      } else if (age <= 60) {
        // Smooth linear falloff from 1.0 down to 0.40
        baseAlpha = 1.0 - ((age - 20) / 40) * 0.60;
      } else {
        baseAlpha = 0.25; // Quiet structural watermark
      }
    } else if (mode === 'advanced') {
      if (age <= 35) {
        baseAlpha = 1.0;
      } else if (age <= 90) {
        baseAlpha = 1.0 - ((age - 35) / 55) * 0.45;
      } else {
        baseAlpha = 0.40;
      }
    } else {
      // Analysis mode keeps uniform contrast
      baseAlpha = age > 80 ? 0.60 : 0.90;
    }

    if (isMitigated) {
      baseAlpha *= 0.55; // Additional dampener for consumed zones
    }

    return Math.max(0.15, Math.min(1.0, baseAlpha));
  }

  // ── 6. Interactive Telemetry Tooltips ───────────────────────────────────────
  public registerInteractiveZone(zone: InteractiveZone): void {
    this.interactiveZones.push(zone);
  }

  public getZoneAtPoint(px: number, py: number): InteractiveZone | null {
    // Search in reverse order (topmost first)
    for (let i = this.interactiveZones.length - 1; i >= 0; i--) {
      const z = this.interactiveZones[i];
      if (px >= z.x1 && px <= z.x2 && py >= z.y1 && py <= z.y2) {
        return z;
      }
    }
    return null;
  }
}
