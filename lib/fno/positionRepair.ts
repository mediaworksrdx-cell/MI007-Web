// ─── Institutional Position Repair & Dynamic Delta-Hedging Engine ────────────
// Generates previewable, reversible position repair and delta-hedging adjustments
// with exact lot-size rounding, residual Delta reporting, and Before/After payoff comparison.
// Strictly analytical decision-support — never submits automated broker orders.

import {
  OptionChainData,
  StrategyCategory,
  StrategyLeg,
  StrategyPayoff,
} from './fnoTypes';
import { calculateBSGreeks, calculateBSPrice } from './blackScholes';
import { parseExpiryDaysToExpiry } from './fnoDataService';
import { calculateStrategyPayoff } from './payoffEngine';

export type RepairActionType =
  | 'NEUTRALIZE_DELTA_FUT'
  | 'NEUTRALIZE_DELTA_OPTION'
  | 'ROLL_UNTESTED_WING'
  | 'CAP_TAIL_RISK'
  | 'CONVERT_TO_IRON_FLY';

export interface PositionRepairProposal {
  id: RepairActionType;
  title: string;
  badge: string;
  summary: string;
  tradesDescription: string[];
  isApplicable: boolean;
  unavailableReason?: string;
  beforeLegs: StrategyLeg[];
  afterLegs: StrategyLeg[];
  beforePayoff: StrategyPayoff;
  afterPayoff: StrategyPayoff;
  beforeDelta: number;
  afterDelta: number;
  residualDelta: number;
  deltaReductionPct: number;
  beforeTheta: number;
  afterTheta: number;
  beforeMaxLoss: number | 'UNLIMITED';
  afterMaxLoss: number | 'UNLIMITED';
  incrementalCashFlow: number; // positive = net credit collected from adjustment
}

function priceStrikeFromChainOrBsm(
  chain: OptionChainData,
  strike: number,
  instrument: 'CE' | 'PE',
  spotPrice: number,
  daysToExpiry: number
): { price: number; iv: number; greeks: StrategyLeg['greeks'] } {
  const row = chain.strikes.find((r) => Math.abs(r.strike - strike) < 0.01);
  if (row) {
    const c = instrument === 'CE' ? row.call : row.put;
    return {
      price: c.ltp,
      iv: c.impliedVolatility,
      greeks: c.greeks,
    };
  }

  const timeYears = Math.max(0.002, daysToExpiry / 365.0);
  const ivDec = 0.145;
  const price = Math.max(
    0.05,
    Math.round(
      calculateBSPrice(instrument, {
        spot: spotPrice,
        strike,
        timeYears,
        volatility: ivDec,
      }) * 20
    ) / 20
  );
  const greeks = calculateBSGreeks(instrument, {
    spot: spotPrice,
    strike,
    timeYears,
    volatility: ivDec,
  });
  return { price, iv: 14.5, greeks };
}

function buildProposalMetrics(params: {
  id: RepairActionType;
  title: string;
  badge: string;
  summary: string;
  tradesDescription: string[];
  isApplicable: boolean;
  unavailableReason?: string;
  beforeLegs: StrategyLeg[];
  afterLegs: StrategyLeg[];
  spotPrice: number;
  referenceSpot: number;
  daysToExpiry: number;
  timeShiftDays: number;
  ivShiftPct: number;
  strategyName: string;
  category: StrategyCategory;
}): PositionRepairProposal {
  const beforePayoff = calculateStrategyPayoff(
    params.beforeLegs,
    params.spotPrice,
    params.strategyName,
    params.category,
    {
      daysToExpiry: params.daysToExpiry,
      timeShiftDays: params.timeShiftDays,
      ivShiftPct: params.ivShiftPct,
      baseSpotPrice: params.referenceSpot,
    }
  );

  const afterPayoff = calculateStrategyPayoff(
    params.afterLegs,
    params.spotPrice,
    `${params.strategyName} (${params.badge})`,
    params.category,
    {
      daysToExpiry: params.daysToExpiry,
      timeShiftDays: params.timeShiftDays,
      ivShiftPct: params.ivShiftPct,
      baseSpotPrice: params.referenceSpot,
    }
  );

  const beforeDelta = beforePayoff.netGreeks.delta;
  const afterDelta = afterPayoff.netGreeks.delta;
  const residualDelta = afterDelta;
  const deltaReductionPct =
    Math.abs(beforeDelta) > 0.05
      ? Math.round(
          ((Math.abs(beforeDelta) - Math.abs(afterDelta)) / Math.abs(beforeDelta)) * 1000
        ) / 10
      : 0;

  return {
    id: params.id,
    title: params.title,
    badge: params.badge,
    summary: params.summary,
    tradesDescription: params.tradesDescription,
    isApplicable: params.isApplicable,
    unavailableReason: params.unavailableReason,
    beforeLegs: params.beforeLegs,
    afterLegs: params.afterLegs,
    beforePayoff,
    afterPayoff,
    beforeDelta,
    afterDelta,
    residualDelta,
    deltaReductionPct,
    beforeTheta: beforePayoff.netGreeks.theta,
    afterTheta: afterPayoff.netGreeks.theta,
    beforeMaxLoss: beforePayoff.maxLoss,
    afterMaxLoss: afterPayoff.maxLoss,
    incrementalCashFlow: afterPayoff.netDebitCredit - beforePayoff.netDebitCredit,
  };
}

/**
 * Generates all 4 institutional position-repair and delta-hedging proposals for the active strategy.
 */
export function generatePositionRepairProposals(params: {
  legs: StrategyLeg[];
  chain: OptionChainData;
  simulatedSpot: number;
  referenceSpot: number;
  strikeStep: number;
  daysToExpiry?: number;
  timeShiftDays?: number;
  ivShiftPct?: number;
  strategyName?: string;
  category?: StrategyCategory;
}): PositionRepairProposal[] {
  const {
    legs,
    chain,
    simulatedSpot,
    referenceSpot,
    strikeStep,
    timeShiftDays = 0,
    ivShiftPct = 0,
    strategyName = 'Active Strategy',
    category = 'NEUTRAL',
  } = params;

  const activeLegs = (legs || []).filter((l) => !l.disabled);
  const dte = params.daysToExpiry ?? chain.daysToExpiry ?? parseExpiryDaysToExpiry(chain.expiry);
  const lotSize = chain.lotSize || (activeLegs[0]?.lotSize ?? 75);
  const atmStrike = Math.round(simulatedSpot / strikeStep) * strikeStep;

  const basePayoff = calculateStrategyPayoff(activeLegs, simulatedSpot, strategyName, category, {
    daysToExpiry: dte,
    timeShiftDays,
    ivShiftPct,
    baseSpotPrice: referenceSpot,
  });

  const currentDelta = basePayoff.netGreeks.delta;
  const proposals: PositionRepairProposal[] = [];

  // ───────────────────────────────────────────────────────────────────────────
  // 1. NEUTRALIZE DELTA (Futures / ATM Option Lot-Rounded Hedge)
  // ───────────────────────────────────────────────────────────────────────────
  const exactFutLots = Math.abs(currentDelta) / lotSize;
  const roundedFutLots = Math.round(exactFutLots);

  if (roundedFutLots >= 1) {
    const hedgeAction: 'BUY' | 'SELL' = currentDelta < 0 ? 'BUY' : 'SELL';
    const futLeg: StrategyLeg = {
      id: `repair-fut-hedge-${Date.now()}`,
      action: hedgeAction,
      instrument: 'FUT',
      strike: Math.round(simulatedSpot * 100) / 100,
      expiry: chain.expiry,
      lots: roundedFutLots,
      lotSize,
      entryPrice: Math.round(simulatedSpot * 100) / 100,
      currentPrice: Math.round(simulatedSpot * 100) / 100,
      iv: 0,
      greeks: { delta: 1, gamma: 0, theta: 0, vega: 0, rho: 0, vanna: 0, charm: 0, vomma: 0 },
      disabled: false,
    };

    proposals.push(
      buildProposalMetrics({
        id: 'NEUTRALIZE_DELTA_FUT',
        title: 'Neutralize Delta (Futures Overlay)',
        badge: 'Delta Hedge',
        summary: `Offsets ${currentDelta > 0 ? '+' : ''}${currentDelta.toFixed(1)} portfolio Delta using ${roundedFutLots} lot(s) of ${chain.underlyingSymbol} Futures (lot size ${lotSize}).`,
        tradesDescription: [
          `${hedgeAction} ${roundedFutLots}x ${chain.underlyingSymbol} ${chain.expiry} FUT @ ${simulatedSpot.toLocaleString()}`,
        ],
        isApplicable: true,
        beforeLegs: activeLegs,
        afterLegs: [...activeLegs, futLeg],
        spotPrice: simulatedSpot,
        referenceSpot,
        daysToExpiry: dte,
        timeShiftDays,
        ivShiftPct,
        strategyName,
        category,
      })
    );
  } else {
    // Sub-lot Delta: use ATM Option (~0.50 Delta per share => ~0.5 * lotSize Delta per lot)
    const atmUnitDelta = 0.5 * lotSize;
    const optLots = Math.max(1, Math.round(Math.abs(currentDelta) / atmUnitDelta));
    const isDeltaAlmostZero = Math.abs(currentDelta) < lotSize * 0.15;
    // Sell or Buy ATM option to neutralize fractional-lot delta without adding futures
    const optInstrument: 'CE' | 'PE' = currentDelta < 0 ? 'CE' : 'PE';
    const priced = priceStrikeFromChainOrBsm(chain, atmStrike, optInstrument, simulatedSpot, dte);

    const optHedgeLeg: StrategyLeg = {
      id: `repair-opt-hedge-${Date.now()}`,
      action: 'BUY',
      instrument: optInstrument,
      strike: atmStrike,
      expiry: chain.expiry,
      lots: optLots,
      lotSize,
      entryPrice: priced.price,
      currentPrice: priced.price,
      iv: priced.iv,
      greeks: priced.greeks,
      disabled: false,
    };

    proposals.push(
      buildProposalMetrics({
        id: 'NEUTRALIZE_DELTA_OPTION',
        title: 'Neutralize Sub-Lot Delta (ATM Option)',
        badge: 'Fractional Delta Hedge',
        summary: isDeltaAlmostZero
          ? `Portfolio Delta (${currentDelta.toFixed(1)}) is already near-neutral (<15% of 1 lot=${lotSize}). Preview shows 1-lot ATM ${optInstrument} fine-tune.`
          : `Sub-lot Delta (${currentDelta.toFixed(1)}) is smaller than 1 Futures lot (${lotSize}); hedges with ${optLots}x ATM ${atmStrike} ${optInstrument}.`,
        tradesDescription: [
          `BUY ${optLots}x ${atmStrike} ${optInstrument} @ ${priced.price.toFixed(2)}`,
        ],
        isApplicable: !isDeltaAlmostZero,
        unavailableReason: isDeltaAlmostZero
          ? 'Portfolio is already Delta-neutral within discrete lot tolerances.'
          : undefined,
        beforeLegs: activeLegs,
        afterLegs: [...activeLegs, optHedgeLeg],
        spotPrice: simulatedSpot,
        referenceSpot,
        daysToExpiry: dte,
        timeShiftDays,
        ivShiftPct,
        strategyName,
        category,
      })
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ROLL UNTESTED WING (Roll Untested Short Leg 1 Step Closer to Spot)
  // ───────────────────────────────────────────────────────────────────────────
  const shortOptionLegs = activeLegs.filter(
    (l) => l.action === 'SELL' && (l.instrument === 'CE' || l.instrument === 'PE')
  );

  if (shortOptionLegs.length > 0) {
    // Pick the short option leg that is furthest OTM relative to simulatedSpot (the untested side)
    const sortedByUntestedDist = [...shortOptionLegs].sort((a, b) => {
      const distA = a.instrument === 'CE' ? a.strike - simulatedSpot : simulatedSpot - a.strike;
      const distB = b.instrument === 'CE' ? b.strike - simulatedSpot : simulatedSpot - b.strike;
      return distB - distA;
    });
    const targetShort = sortedByUntestedDist[0];
    const rollDirection = targetShort.instrument === 'CE' ? -1 : 1; // Move closer to spot
    const newStrike =
      Math.round((targetShort.strike + rollDirection * strikeStep) * 100) / 100;
    const pricedNew = priceStrikeFromChainOrBsm(
      chain,
      newStrike,
      targetShort.instrument as 'CE' | 'PE',
      simulatedSpot,
      dte
    );

    const rolledLegs = activeLegs.map((l) => {
      if (l.id === targetShort.id) {
        return {
          ...l,
          strike: newStrike,
          entryPrice: pricedNew.price,
          currentPrice: pricedNew.price,
          iv: pricedNew.iv,
          greeks: pricedNew.greeks,
        };
      }
      return l;
    });

    proposals.push(
      buildProposalMetrics({
        id: 'ROLL_UNTESTED_WING',
        title: `Roll Untested ${targetShort.strike} ${targetShort.instrument} → ${newStrike}`,
        badge: 'Roll Untested Side',
        summary: `Rolls the untested short ${targetShort.strike} ${targetShort.instrument} closer to spot (${newStrike}) to harvest extra premium credit and widen the tested breakeven.`,
        tradesDescription: [
          `BUY to Close ${targetShort.lots}x ${targetShort.strike} ${targetShort.instrument}`,
          `SELL to Open ${targetShort.lots}x ${newStrike} ${targetShort.instrument} @ ${pricedNew.price.toFixed(2)}`,
        ],
        isApplicable: Math.abs(newStrike - targetShort.strike) > 0,
        beforeLegs: activeLegs,
        afterLegs: rolledLegs,
        spotPrice: simulatedSpot,
        referenceSpot,
        daysToExpiry: dte,
        timeShiftDays,
        ivShiftPct,
        strategyName,
        category,
      })
    );
  } else {
    proposals.push(
      buildProposalMetrics({
        id: 'ROLL_UNTESTED_WING',
        title: 'Roll Untested Short Wing',
        badge: 'Roll Wing',
        summary: 'Requires at least one short Call or Put leg to roll.',
        tradesDescription: [],
        isApplicable: false,
        unavailableReason: 'No short option legs present in current strategy.',
        beforeLegs: activeLegs,
        afterLegs: activeLegs,
        spotPrice: simulatedSpot,
        referenceSpot,
        daysToExpiry: dte,
        timeShiftDays,
        ivShiftPct,
        strategyName,
        category,
      })
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CAP TAIL RISK (Add Protective OTM Wing to Unhedged Short Legs)
  // ───────────────────────────────────────────────────────────────────────────
  const unhedgedShorts = shortOptionLegs.filter((shortLeg) => {
    if (shortLeg.instrument === 'CE') {
      return !activeLegs.some(
        (l) => l.action === 'BUY' && l.instrument === 'CE' && l.strike > shortLeg.strike
      );
    }
    return !activeLegs.some(
      (l) => l.action === 'BUY' && l.instrument === 'PE' && l.strike < shortLeg.strike
    );
  });

  if (unhedgedShorts.length > 0) {
    const protectiveLegs: StrategyLeg[] = [];
    const descriptions: string[] = [];

    unhedgedShorts.forEach((shortLeg, idx) => {
      const wingStrike =
        shortLeg.instrument === 'CE'
          ? shortLeg.strike + 2 * strikeStep
          : Math.max(strikeStep, shortLeg.strike - 2 * strikeStep);
      const pricedWing = priceStrikeFromChainOrBsm(
        chain,
        wingStrike,
        shortLeg.instrument as 'CE' | 'PE',
        simulatedSpot,
        dte
      );

      protectiveLegs.push({
        id: `repair-wing-${idx}-${Date.now()}`,
        action: 'BUY',
        instrument: shortLeg.instrument,
        strike: wingStrike,
        expiry: shortLeg.expiry,
        lots: shortLeg.lots,
        lotSize: shortLeg.lotSize,
        entryPrice: pricedWing.price,
        currentPrice: pricedWing.price,
        iv: pricedWing.iv,
        greeks: pricedWing.greeks,
        disabled: false,
      });
      descriptions.push(
        `BUY ${shortLeg.lots}x ${wingStrike} ${shortLeg.instrument} @ ${pricedWing.price.toFixed(2)} (Tail Protection)`
      );
    });

    proposals.push(
      buildProposalMetrics({
        id: 'CAP_TAIL_RISK',
        title: 'Cap Tail Risk (Buy Protective OTM Wings)',
        badge: 'Define Risk',
        summary: `Eliminates unlimited tail risk on ${unhedgedShorts.length} unhedged short leg(s) by purchasing ±2-step OTM protective wings.`,
        tradesDescription: descriptions,
        isApplicable: true,
        beforeLegs: activeLegs,
        afterLegs: [...activeLegs, ...protectiveLegs],
        spotPrice: simulatedSpot,
        referenceSpot,
        daysToExpiry: dte,
        timeShiftDays,
        ivShiftPct,
        strategyName,
        category,
      })
    );
  } else {
    // If already defined risk, offer tightening the protective wings by 1 step to reduce max loss
    const longOptions = activeLegs.filter(
      (l) => l.action === 'BUY' && (l.instrument === 'CE' || l.instrument === 'PE')
    );
    const tightenedLegs = activeLegs.map((l) => {
      if (l.action === 'BUY' && l.instrument === 'CE' && l.strike > simulatedSpot + strikeStep) {
        const nextK = l.strike - strikeStep;
        const p = priceStrikeFromChainOrBsm(chain, nextK, 'CE', simulatedSpot, dte);
        return { ...l, strike: nextK, entryPrice: p.price, currentPrice: p.price, iv: p.iv, greeks: p.greeks };
      }
      if (l.action === 'BUY' && l.instrument === 'PE' && l.strike < simulatedSpot - strikeStep) {
        const nextK = l.strike + strikeStep;
        const p = priceStrikeFromChainOrBsm(chain, nextK, 'PE', simulatedSpot, dte);
        return { ...l, strike: nextK, entryPrice: p.price, currentPrice: p.price, iv: p.iv, greeks: p.greeks };
      }
      return l;
    });

    proposals.push(
      buildProposalMetrics({
        id: 'CAP_TAIL_RISK',
        title: 'Tighten Protective Wings (Reduce Max Loss)',
        badge: 'Compress CVaR',
        summary:
          'Strategy is already defined-risk; moves OTM protective wings 1 strike closer to compress worst-case CVaR(99%) loss.',
        tradesDescription:
          longOptions.length > 0
            ? ['Roll OTM protective wing(s) 1 strike step closer to ATM']
            : [],
        isApplicable: longOptions.length > 0,
        beforeLegs: activeLegs,
        afterLegs: tightenedLegs,
        spotPrice: simulatedSpot,
        referenceSpot,
        daysToExpiry: dte,
        timeShiftDays,
        ivShiftPct,
        strategyName,
        category,
      })
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CONVERT TO DEFINED-RISK IRON BUTTERFLY AROUND CURRENT SPOT
  // ───────────────────────────────────────────────────────────────────────────
  const baseLots = activeLegs[0]?.lots ?? 1;
  const ceAtm = priceStrikeFromChainOrBsm(chain, atmStrike, 'CE', simulatedSpot, dte);
  const peAtm = priceStrikeFromChainOrBsm(chain, atmStrike, 'PE', simulatedSpot, dte);
  const ceWingStrike = atmStrike + 3 * strikeStep;
  const peWingStrike = Math.max(strikeStep, atmStrike - 3 * strikeStep);
  const ceWing = priceStrikeFromChainOrBsm(chain, ceWingStrike, 'CE', simulatedSpot, dte);
  const peWing = priceStrikeFromChainOrBsm(chain, peWingStrike, 'PE', simulatedSpot, dte);

  const ironFlyLegs: StrategyLeg[] = [
    {
      id: `ifly-ce-short-${Date.now()}`,
      action: 'SELL',
      instrument: 'CE',
      strike: atmStrike,
      expiry: chain.expiry,
      lots: baseLots,
      lotSize,
      entryPrice: ceAtm.price,
      currentPrice: ceAtm.price,
      iv: ceAtm.iv,
      greeks: ceAtm.greeks,
      disabled: false,
    },
    {
      id: `ifly-pe-short-${Date.now()}`,
      action: 'SELL',
      instrument: 'PE',
      strike: atmStrike,
      expiry: chain.expiry,
      lots: baseLots,
      lotSize,
      entryPrice: peAtm.price,
      currentPrice: peAtm.price,
      iv: peAtm.iv,
      greeks: peAtm.greeks,
      disabled: false,
    },
    {
      id: `ifly-ce-wing-${Date.now()}`,
      action: 'BUY',
      instrument: 'CE',
      strike: ceWingStrike,
      expiry: chain.expiry,
      lots: baseLots,
      lotSize,
      entryPrice: ceWing.price,
      currentPrice: ceWing.price,
      iv: ceWing.iv,
      greeks: ceWing.greeks,
      disabled: false,
    },
    {
      id: `ifly-pe-wing-${Date.now()}`,
      action: 'BUY',
      instrument: 'PE',
      strike: peWingStrike,
      expiry: chain.expiry,
      lots: baseLots,
      lotSize,
      entryPrice: peWing.price,
      currentPrice: peWing.price,
      iv: peWing.iv,
      greeks: peWing.greeks,
      disabled: false,
    },
  ];

  proposals.push(
    buildProposalMetrics({
      id: 'CONVERT_TO_IRON_FLY',
      title: `Re-Center into ${atmStrike} Iron Butterfly`,
      badge: 'Structure Conversion',
      summary: `Re-centers the position into a delta-neutral, defined-risk ${peWingStrike}/${atmStrike}/${ceWingStrike} Iron Butterfly anchored at current spot.`,
      tradesDescription: [
        `SELL ${baseLots}x ${atmStrike} CE & ${atmStrike} PE (ATM Straddle Core)`,
        `BUY ${baseLots}x ${ceWingStrike} CE & ${peWingStrike} PE (±3 Step Wings)`,
      ],
      isApplicable: true,
      beforeLegs: activeLegs,
      afterLegs: ironFlyLegs,
      spotPrice: simulatedSpot,
      referenceSpot,
      daysToExpiry: dte,
      timeShiftDays,
      ivShiftPct,
      strategyName,
      category: 'NEUTRAL',
    })
  );

  return proposals;
}
