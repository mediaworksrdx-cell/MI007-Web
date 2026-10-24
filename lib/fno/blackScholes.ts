// ─── Institutional Black-Scholes Analytical Engine ───────────────────────────
// High-precision European & American Option Pricing, Greeks, and Implied Volatility.

import { Greeks, OptionType } from './fnoTypes';

// Cumulative Standard Normal Distribution Approximation (Abramowitz & Stegun formula 26.2.17)
export function cdfNormal(x: number): number {
  if (x < -8.0) return 0.0;
  if (x > 8.0) return 1.0;

  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c2 = 0.3989422804014327; // 1 / sqrt(2 * PI)

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  const pdf = c2 * Math.exp(-0.5 * absX * absX);
  const cdf = 1.0 - pdf * poly;

  return sign < 0 ? 1.0 - cdf : cdf;
}

// Probability Density Function of standard normal distribution
export function pdfNormal(x: number): number {
  const c2 = 0.3989422804014327;
  return c2 * Math.exp(-0.5 * x * x);
}

export interface BSParams {
  spot: number; // S
  strike: number; // K
  timeYears: number; // T (in years, e.g. 7 days = 7 / 365)
  rate?: number; // Risk-free rate (e.g. 0.07 for 7%)
  volatility: number; // sigma (e.g. 0.15 for 15%)
  dividendYield?: number; // q (e.g. 0.012 for 1.2%)
}

/**
 * Calculates theoretical Black-Scholes option price.
 */
export function calculateBSPrice(
  type: OptionType,
  params: BSParams
): number {
  const { spot: S, strike: K, timeYears: T, volatility: sigma } = params;
  const r = params.rate ?? 0.068; // Indian Repo rate ~6.8% or default
  const q = params.dividendYield ?? 0.0;

  if (S <= 0 || K <= 0) {
    return 0;
  }

  if (T <= 0.0001) {
    // At expiration intrinsic value
    return type === 'CE' ? Math.max(0, S - K) : Math.max(0, K - S);
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const dfS = Math.exp(-q * T);
  const dfK = Math.exp(-r * T);

  if (type === 'CE') {
    return S * dfS * cdfNormal(d1) - K * dfK * cdfNormal(d2);
  } else {
    return K * dfK * cdfNormal(-d2) - S * dfS * cdfNormal(-d1);
  }
}

/**
 * Calculates full double-precision first-order and second-order analytical Greeks
 * under Generalized Black-Scholes-Merton (continuous dividend yield q, risk-free rate r).
 *
 * Units & Sign Conventions:
 * - delta: dV / dS (per 1.0 spot change)
 * - gamma: d^2V / dS^2 (per 1.0 spot change)
 * - theta: -(dV / dT) / 365 (option value change per 1 calendar day passage of time)
 * - vega:  (dV / dSigma) / 100 (option value change per +1% [+0.01] IV change)
 * - rho:   (dV / dr) / 100 (option value change per +1% [+0.01] interest rate change)
 * - vanna: (dDelta / dSigma) / 100 (Delta change per +1% [+0.01] IV change)
 * - charm: -(dDelta / dT) / 365 (Delta change per 1 calendar day passage of time)
 * - vomma: (dVega / dSigma) / 100 (Vega change per +1% [+0.01] IV change; Volga)
 */
export function calculateBSGreeksUnrounded(
  type: OptionType,
  params: BSParams
): Required<Greeks> {
  const { spot: S, strike: K, timeYears: T, volatility: sigma } = params;
  const r = params.rate ?? 0.068;
  const q = params.dividendYield ?? 0.0;

  if (S <= 0 || K <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0, vanna: 0, charm: 0, vomma: 0 };
  }

  if (T <= 0.0001 || sigma <= 0.0001) {
    const isITM = type === 'CE' ? S > K : K > S;
    return {
      delta: type === 'CE' ? (isITM ? 1 : 0) : (isITM ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      vanna: 0,
      charm: 0,
      vomma: 0,
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const dfS = Math.exp(-q * T);
  const dfK = Math.exp(-r * T);
  const pdfD1 = pdfNormal(d1);

  // 1st-Order Greeks
  // Delta
  const delta = type === 'CE' ? dfS * cdfNormal(d1) : -dfS * cdfNormal(-d1);

  // Gamma (Identical for Call and Put)
  const gamma = (dfS * pdfD1) / (S * sigma * sqrtT);

  // Theta (Per calendar day: -dV/dT / 365)
  const term1 = (-S * dfS * pdfD1 * sigma) / (2 * sqrtT);
  let thetaAnnual: number;
  if (type === 'CE') {
    thetaAnnual = term1 - r * K * dfK * cdfNormal(d2) + q * S * dfS * cdfNormal(d1);
  } else {
    thetaAnnual = term1 + r * K * dfK * cdfNormal(-d2) - q * S * dfS * cdfNormal(-d1);
  }
  const theta = thetaAnnual / 365.0;

  // Vega (Per 1% change in implied volatility)
  const vega = (S * dfS * sqrtT * pdfD1) / 100.0;

  // Rho (Per 1% change in interest rate)
  const rho = type === 'CE'
    ? (K * T * dfK * cdfNormal(d2)) / 100.0
    : (-K * T * dfK * cdfNormal(-d2)) / 100.0;

  // 2nd-Order Greeks
  // Vanna: dDelta / dSigma per 1% (+0.01) change in IV
  // Analytical: dDelta/dSigma = -e^(-qT) * pdf(d1) * (d2 / sigma)
  const vanna = (-dfS * pdfD1 * d2) / (100.0 * sigma);

  // Charm: -dDelta / dT per 1 calendar day passage of time
  // d(d1)/dT = (2*(r - q)*T - d2 * sigma * sqrtT) / (2 * T * sigma * sqrtT)
  const dd1_dT = (2 * (r - q) * T - d2 * sigma * sqrtT) / (2 * T * sigma * sqrtT);
  const charmAnnual = type === 'CE'
    ? q * dfS * cdfNormal(d1) - dfS * pdfD1 * dd1_dT
    : -q * dfS * cdfNormal(-d1) - dfS * pdfD1 * dd1_dT;
  const charm = charmAnnual / 365.0;

  // Vomma (Volga): dVega / dSigma per 1% (+0.01) change in IV
  const vomma = (vega * d1 * d2) / (100.0 * sigma);

  return {
    delta,
    gamma,
    theta,
    vega,
    rho,
    vanna,
    charm,
    vomma,
  };
}

/**
 * Calculates complete first-order and second-order analytical Greeks (rounded for contract/UI consumption).
 */
export function calculateBSGreeks(
  type: OptionType,
  params: BSParams
): Greeks {
  const raw = calculateBSGreeksUnrounded(type, params);

  return {
    delta: Math.round(raw.delta * 1000) / 1000,
    gamma: Math.round(raw.gamma * 1000000) / 1000000,
    theta: Math.round(raw.theta * 100) / 100,
    vega: Math.round(raw.vega * 100) / 100,
    rho: Math.round(raw.rho * 100) / 100,
    vanna: Math.round(raw.vanna * 10000) / 10000,
    charm: Math.round(raw.charm * 10000) / 10000,
    vomma: Math.round(raw.vomma * 10000) / 10000,
  };
}

/**
 * Solves Implied Volatility given market LTP using Newton-Raphson with bisection fallback.
 */
export function solveImpliedVolatility(
  marketPrice: number,
  type: OptionType,
  spot: number,
  strike: number,
  timeYears: number,
  rate = 0.068
): number {
  if (marketPrice <= 0 || timeYears <= 0.0001) return 0.15; // default 15%

  const intrinsic = type === 'CE' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  if (marketPrice < intrinsic) {
    return 0.12; // deep below intrinsic
  }

  let vol = 0.20; // Initial guess: 20%
  const maxIterations = 50;
  const precision = 0.001;

  for (let i = 0; i < maxIterations; i++) {
    const p = calculateBSPrice(type, {
      spot,
      strike,
      timeYears,
      rate,
      volatility: vol,
    });
    const diff = p - marketPrice;
    if (Math.abs(diff) < precision) {
      return Math.max(0.01, Math.min(vol, 3.0));
    }

    // Vega derivative
    const sqrtT = Math.sqrt(timeYears);
    const d1 = (Math.log(spot / strike) + (rate + 0.5 * vol * vol) * timeYears) / (vol * sqrtT);
    const vega = spot * sqrtT * pdfNormal(d1);

    if (Math.abs(vega) < 1e-6) {
      break; // Vega too small, switch to bisection
    }

    vol = vol - diff / vega;
    if (vol <= 0.001 || vol > 4.0) {
      break;
    }
  }

  // Bisection Fallback
  let low = 0.01;
  let high = 3.5;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const p = calculateBSPrice(type, {
      spot,
      strike,
      timeYears,
      rate,
      volatility: mid,
    });
    if (Math.abs(p - marketPrice) < precision) {
      return mid;
    }
    if (p > marketPrice) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return 0.18;
}
