// ─── Institutional Dealer Gamma Exposure (GEX) & Zero-Gamma Flip Engine ──────
// Estimates contract-weighted dealer gamma exposure across strikes, identifies
// Call/Put Gamma Walls (distinct from raw OI magnets), and dynamically reprices
// option Gamma across candidate spot prices to locate Zero-Gamma Flip levels.

import { OptionChainData } from './fnoTypes';
import { calculateBSGreeksUnrounded } from './blackScholes';
import { parseExpiryDaysToExpiry } from './fnoDataService';

export type DealerPositioningAssumption =
  | 'DEALER_LONG_CALL_SHORT_PUT'
  | 'DEALER_SHORT_CALL_LONG_PUT'
  | 'DEALER_SHORT_ALL';

export interface DealerAssumptionMeta {
  id: DealerPositioningAssumption;
  label: string;
  shortLabel: string;
  callSign: 1 | -1;
  putSign: 1 | -1;
  description: string;
}

export const DEALER_POSITIONING_ASSUMPTIONS: Record<
  DealerPositioningAssumption,
  DealerAssumptionMeta
> = {
  DEALER_LONG_CALL_SHORT_PUT: {
    id: 'DEALER_LONG_CALL_SHORT_PUT',
    label: 'Institutional Hedging Flow (Dealer +Call / -Put)',
    shortLabel: 'Dealer +CE / -PE',
    callSign: 1,
    putSign: -1,
    description:
      'Assumes customers overwrite OTM Calls and buy OTM Puts for downside protection, leaving dealers Long Call Gamma (+GEX) and Short Put Gamma (-GEX).',
  },
  DEALER_SHORT_CALL_LONG_PUT: {
    id: 'DEALER_SHORT_CALL_LONG_PUT',
    label: 'Retail Speculative / Put-Write Flow (Dealer -Call / +Put)',
    shortLabel: 'Dealer -CE / +PE',
    callSign: -1,
    putSign: 1,
    description:
      'Assumes customers buy OTM Calls and write OTM Puts, leaving dealers Short Call Gamma (-GEX) above spot and Long Put Gamma (+GEX) below spot.',
  },
  DEALER_SHORT_ALL: {
    id: 'DEALER_SHORT_ALL',
    label: 'Pure Customer Long-Vol Flow (Dealer -Call / -Put)',
    shortLabel: 'Dealer -CE / -PE',
    callSign: -1,
    putSign: -1,
    description:
      'Assumes customers are net buyers of both Calls and Puts across the chain, leaving dealers net short gamma everywhere (no zero-gamma crossing).',
  },
};

export interface StrikeGexPoint {
  strike: number;
  callOI: number;
  putOI: number;
  callGamma: number;
  putGamma: number;
  /** Signed Call GEX (notional currency per 1% underlying move) */
  callGex: number;
  /** Signed Put GEX (notional currency per 1% underlying move) */
  putGex: number;
  /** Net GEX = callGex + putGex at this strike */
  netGex: number;
  /** Absolute gamma concentration for wall ranking */
  absCallGex: number;
  absPutGex: number;
}

export interface RepricedGexCurvePoint {
  spotPrice: number;
  netGex: number;
  callGex: number;
  putGex: number;
}

export type ZeroGammaFlipStatus =
  | 'SINGLE_CROSSING'
  | 'MULTIPLE_CROSSINGS'
  | 'NO_CROSSING'
  | 'INSUFFICIENT_DATA';

export interface DealerExposureProfile {
  underlyingSymbol: string;
  spotPrice: number;
  expiry: string;
  daysToExpiry: number;
  assumption: DealerAssumptionMeta;
  /** Total Net GEX at current spot price (in currency units per 1% move) */
  totalNetGex: number;
  totalCallGex: number;
  totalPutGex: number;
  regime: 'POSITIVE_GAMMA_PINNING' | 'NEGATIVE_GAMMA_ACCELERATION' | 'NEUTRAL_GAMMA';
  regimeSummary: string;
  /** Strike with strongest Call Gamma Exposure (distinct from raw Call OI magnet) */
  callGammaWallStrike: number;
  callGammaWallValue: number;
  /** Strike with strongest Put Gamma Exposure (distinct from raw Put OI magnet) */
  putGammaWallStrike: number;
  putGammaWallValue: number;
  /** Raw OI magnets for explicit comparison against Gamma Walls */
  highestCallOIStrike: number;
  highestPutOIStrike: number;
  /** Primary Zero-Gamma Flip level (closest to spot), or null if no valid crossing exists */
  zeroGammaFlip: number | null;
  allZeroCrossings: number[];
  flipStatus: ZeroGammaFlipStatus;
  flipMessage: string;
  strikes: StrikeGexPoint[];
  repricedSpotCurve: RepricedGexCurvePoint[];
  scalingConvention: string;
  timestamp: string;
  disclaimer: string;
}

/**
 * Evaluates aggregate Net Dealer GEX at an arbitrary candidate underlying price S_cand
 * by dynamically repricing Black-Scholes-Merton Gamma at S_cand for every strike in the chain.
 */
export function evaluateRepricedNetGexAtSpot(
  chain: OptionChainData,
  candidateSpot: number,
  timeYears: number,
  callSign: 1 | -1,
  putSign: 1 | -1,
  rate = 0.068,
  dividendYield = 0.0
): RepricedGexCurvePoint {
  if (candidateSpot <= 0 || chain.strikes.length === 0) {
    return { spotPrice: candidateSpot, netGex: 0, callGex: 0, putGex: 0 };
  }

  // Notional GEX per 1% move in underlying: OI_qty * Gamma(S_cand) * S_cand^2 * 0.01
  // Note: chain.strikes[*].call.openInterest is already in total share/unit quantity
  // (not lots), so we multiply by 1.0 unit multiplier to prevent double-counting lotSize.
  const spotSquaredOnePct = candidateSpot * candidateSpot * 0.01;
  let totalCallGex = 0;
  let totalPutGex = 0;

  for (const row of chain.strikes) {
    const callIV = Math.max(0.05, (row.call.impliedVolatility || 14.5) / 100.0);
    const putIV = Math.max(0.05, (row.put.impliedVolatility || 14.5) / 100.0);

    const callGreeks = calculateBSGreeksUnrounded('CE', {
      spot: candidateSpot,
      strike: row.strike,
      timeYears,
      volatility: callIV,
      rate,
      dividendYield,
    });

    const putGreeks = calculateBSGreeksUnrounded('PE', {
      spot: candidateSpot,
      strike: row.strike,
      timeYears,
      volatility: putIV,
      rate,
      dividendYield,
    });

    totalCallGex += callSign * row.call.openInterest * callGreeks.gamma * spotSquaredOnePct;
    totalPutGex += putSign * row.put.openInterest * putGreeks.gamma * spotSquaredOnePct;
  }

  return {
    spotPrice: Math.round(candidateSpot * 100) / 100,
    netGex: totalCallGex + totalPutGex,
    callGex: totalCallGex,
    putGex: totalPutGex,
  };
}

/**
 * Computes the complete Dealer Gamma Exposure (GEX) profile, Call/Put Gamma Walls,
 * and dynamically repriced Zero-Gamma Flip level.
 */
export function calculateDealerExposure(
  chain: OptionChainData,
  assumptionId: DealerPositioningAssumption = 'DEALER_LONG_CALL_SHORT_PUT'
): DealerExposureProfile {
  const assumption = DEALER_POSITIONING_ASSUMPTIONS[assumptionId];
  const spot = chain.spotPrice;
  const daysToExpiry = chain.daysToExpiry ?? parseExpiryDaysToExpiry(chain.expiry);
  const timeYears = Math.max(0.002, daysToExpiry / 365.0);

  if (!chain.strikes || chain.strikes.length === 0 || spot <= 0) {
    return {
      underlyingSymbol: chain.underlyingSymbol,
      spotPrice: spot,
      expiry: chain.expiry,
      daysToExpiry,
      assumption,
      totalNetGex: 0,
      totalCallGex: 0,
      totalPutGex: 0,
      regime: 'NEUTRAL_GAMMA',
      regimeSummary: 'Unavailable — option chain has no valid strikes.',
      callGammaWallStrike: spot,
      callGammaWallValue: 0,
      putGammaWallStrike: spot,
      putGammaWallValue: 0,
      highestCallOIStrike: chain.highestCallOIStrike || spot,
      highestPutOIStrike: chain.highestPutOIStrike || spot,
      zeroGammaFlip: null,
      allZeroCrossings: [],
      flipStatus: 'INSUFFICIENT_DATA',
      flipMessage: 'No valid zero-gamma crossing under current assumptions (insufficient strike data).',
      strikes: [],
      repricedSpotCurve: [],
      scalingConvention: 'GEX = Signed_OI_Qty × Gamma × Spot² × 0.01 (Notional Hedge per 1% Spot Move)',
      timestamp: chain.timestamp,
      disclaimer:
        'Estimated from Open Interest under explicit dealer-positioning assumptions. Does not represent verified dealer inventory.',
    };
  }

  const spotSquaredOnePct = spot * spot * 0.01;
  const strikes: StrikeGexPoint[] = [];

  let totalCallGex = 0;
  let totalPutGex = 0;

  let maxAbsCallGex = -1;
  let callGammaWallStrike = chain.strikes[0].strike;
  let callGammaWallValue = 0;

  let maxAbsPutGex = -1;
  let putGammaWallStrike = chain.strikes[0].strike;
  let putGammaWallValue = 0;

  for (const row of chain.strikes) {
    const callIV = Math.max(0.05, (row.call.impliedVolatility || 14.5) / 100.0);
    const putIV = Math.max(0.05, (row.put.impliedVolatility || 14.5) / 100.0);

    const callGreeks = calculateBSGreeksUnrounded('CE', {
      spot,
      strike: row.strike,
      timeYears,
      volatility: callIV,
    });
    const putGreeks = calculateBSGreeksUnrounded('PE', {
      spot,
      strike: row.strike,
      timeYears,
      volatility: putIV,
    });

    const callGex = assumption.callSign * row.call.openInterest * callGreeks.gamma * spotSquaredOnePct;
    const putGex = assumption.putSign * row.put.openInterest * putGreeks.gamma * spotSquaredOnePct;
    const netGex = callGex + putGex;

    const absCallGex = Math.abs(callGex);
    const absPutGex = Math.abs(putGex);

    if (absCallGex > maxAbsCallGex) {
      maxAbsCallGex = absCallGex;
      callGammaWallStrike = row.strike;
      callGammaWallValue = callGex;
    }

    if (absPutGex > maxAbsPutGex) {
      maxAbsPutGex = absPutGex;
      putGammaWallStrike = row.strike;
      putGammaWallValue = putGex;
    }

    totalCallGex += callGex;
    totalPutGex += putGex;

    strikes.push({
      strike: row.strike,
      callOI: row.call.openInterest,
      putOI: row.put.openInterest,
      callGamma: callGreeks.gamma,
      putGamma: putGreeks.gamma,
      callGex,
      putGex,
      netGex,
      absCallGex,
      absPutGex,
    });
  }

  const totalNetGex = totalCallGex + totalPutGex;

  // Evaluate dynamically repriced GEX curve across candidate spot prices
  const minStrike = chain.strikes[0].strike;
  const maxStrike = chain.strikes[chain.strikes.length - 1].strike;
  const gridSteps = 60;
  const stepSize = (maxStrike - minStrike) / gridSteps;

  const repricedSpotCurve: RepricedGexCurvePoint[] = [];
  const allZeroCrossings: number[] = [];

  for (let i = 0; i <= gridSteps; i++) {
    const candSpot = minStrike + i * stepSize;
    const pt = evaluateRepricedNetGexAtSpot(
      chain,
      candSpot,
      timeYears,
      assumption.callSign,
      assumption.putSign
    );
    repricedSpotCurve.push(pt);

    if (i > 0) {
      const prev = repricedSpotCurve[i - 1];
      if (
        (prev.netGex <= 0 && pt.netGex >= 0) ||
        (prev.netGex >= 0 && pt.netGex <= 0)
      ) {
        if (Math.abs(pt.netGex - prev.netGex) > 1e-6) {
          // Refine root with 8-step bisection using dynamic repricing
          let lo = prev.spotPrice;
          let hi = pt.spotPrice;
          let fLo = prev.netGex;
          for (let b = 0; b < 8; b++) {
            const mid = 0.5 * (lo + hi);
            const fMid = evaluateRepricedNetGexAtSpot(
              chain,
              mid,
              timeYears,
              assumption.callSign,
              assumption.putSign
            ).netGex;
            if ((fLo <= 0 && fMid >= 0) || (fLo >= 0 && fMid <= 0)) {
              hi = mid;
            } else {
              lo = mid;
              fLo = fMid;
            }
          }
          const crossing = Math.round(((lo + hi) * 0.5) * 100) / 100;
          allZeroCrossings.push(crossing);
        }
      }
    }
  }

  let zeroGammaFlip: number | null = null;
  let flipStatus: ZeroGammaFlipStatus = 'NO_CROSSING';
  let flipMessage = 'No valid zero-gamma crossing under current assumptions.';

  if (allZeroCrossings.length === 1) {
    zeroGammaFlip = allZeroCrossings[0];
    flipStatus = 'SINGLE_CROSSING';
    flipMessage = `Unique Zero-Gamma Flip at ${zeroGammaFlip.toLocaleString()} (dynamically repriced across ${chain.expiry}).`;
  } else if (allZeroCrossings.length > 1) {
    // Choose crossing closest to current spot
    const sorted = [...allZeroCrossings].sort(
      (a, b) => Math.abs(a - spot) - Math.abs(b - spot)
    );
    zeroGammaFlip = sorted[0];
    flipStatus = 'MULTIPLE_CROSSINGS';
    flipMessage = `Primary Zero-Gamma Flip at ${zeroGammaFlip.toLocaleString()} (${allZeroCrossings.length} crossings detected across range).`;
  }

  const regime: DealerExposureProfile['regime'] =
    totalNetGex > spotSquaredOnePct * 0.01
      ? 'POSITIVE_GAMMA_PINNING'
      : totalNetGex < -spotSquaredOnePct * 0.01
      ? 'NEGATIVE_GAMMA_ACCELERATION'
      : 'NEUTRAL_GAMMA';

  const regimeSummary =
    regime === 'POSITIVE_GAMMA_PINNING'
      ? 'Positive Net Dealer Gamma (+GEX): Dealer delta-hedging dampens realized volatility (sell rallies, buy dips).'
      : regime === 'NEGATIVE_GAMMA_ACCELERATION'
      ? 'Negative Net Dealer Gamma (-GEX): Dealer delta-hedging amplifies directional moves (buy rallies, sell dips).'
      : 'Near-Zero Net Dealer Gamma: Balanced positioning near transition zone.';

  return {
    underlyingSymbol: chain.underlyingSymbol,
    spotPrice: spot,
    expiry: chain.expiry,
    daysToExpiry,
    assumption,
    totalNetGex,
    totalCallGex,
    totalPutGex,
    regime,
    regimeSummary,
    callGammaWallStrike,
    callGammaWallValue,
    putGammaWallStrike,
    putGammaWallValue,
    highestCallOIStrike: chain.highestCallOIStrike,
    highestPutOIStrike: chain.highestPutOIStrike,
    zeroGammaFlip,
    allZeroCrossings,
    flipStatus,
    flipMessage,
    strikes,
    repricedSpotCurve,
    scalingConvention:
      'GEX = Signed_OI_Qty × Gamma(S) × S² × 0.01 (Notional Delta-Hedge per 1% Spot Move; OI is in share/contract units, avoiding lot-size double counting)',
    timestamp: chain.timestamp,
    disclaimer:
      'Exchange Open Interest does not disclose participant side. GEX, Gamma Walls, and Zero-Gamma Flip are model estimates conditioned on the selected dealer-positioning assumption.',
  };
}
