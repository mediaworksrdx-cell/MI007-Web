// ─── Institutional Strategy Presets Library ──────────────────────────────────
// 16+ Pre-engineered options architectures mapped to market regimes.

import {
  OptionStrategyPreset,
  StrategyLeg,
  StrategyCategory,
} from './fnoTypes';
import { calculateBSPrice, calculateBSGreeks } from './blackScholes';

export const INSTITUTIONAL_STRATEGY_PRESETS: OptionStrategyPreset[] = [
  // ── 1. Bullish Strategies ──
  {
    id: 'bull-call-spread',
    name: 'Bull Call Spread',
    category: 'BULLISH',
    description: 'Debit spread: Buy ATM Call and Sell OTM Call. Caps upside while drastically reducing cost basis and theta decay.',
    outlook: 'Moderately Bullish with defined risk and capped return.',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'CE', strikeOffset: 2, lots: 1 },
    ],
  },
  {
    id: 'bull-put-spread',
    name: 'Bull Put Spread',
    category: 'BULLISH',
    description: 'Credit spread: Sell higher strike Put and Buy lower strike Put for downside protection. Benefits from time decay.',
    outlook: 'Moderately Bullish to Neutral. Profitable as long as underlying stays above sold strike.',
    legsTemplate: [
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -2, lots: 1 },
    ],
  },
  {
    id: 'long-call',
    name: 'Long Call',
    category: 'BULLISH',
    description: 'Pure directional debit: Buy slightly OTM Call option. Unlimited upside with risk strictly limited to premium paid.',
    outlook: 'Aggressively Bullish with expectation of strong momentum.',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 1, lots: 1 },
    ],
  },
  {
    id: 'covered-call',
    name: 'Covered Call',
    category: 'BULLISH',
    description: 'Income generation: Long Future / Stock position covered by selling an OTM Call against it.',
    outlook: 'Mildly Bullish to Neutral. Enhances yield on underlying inventory.',
    legsTemplate: [
      { action: 'BUY', instrument: 'FUT', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'CE', strikeOffset: 2, lots: 1 },
    ],
  },
  {
    id: 'call-ratio-backspread',
    name: 'Call Ratio Backspread (1x2)',
    category: 'BULLISH',
    description: 'Sell 1 ATM Call and Buy 2 OTM Calls. Generates explosive unlimited profit during massive bull breakouts.',
    outlook: 'Highly Bullish breakout or non-directional with strong upside skew.',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 2 },
    ],
  },

  // ── 2. Bearish Strategies ──
  {
    id: 'bear-put-spread',
    name: 'Bear Put Spread',
    category: 'BEARISH',
    description: 'Debit spread: Buy ATM Put and Sell OTM Put. Provides downside profit with protection against volatility collapse.',
    outlook: 'Moderately Bearish with controlled risk.',
    legsTemplate: [
      { action: 'BUY', instrument: 'PE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: -2, lots: 1 },
    ],
  },
  {
    id: 'bear-call-spread',
    name: 'Bear Call Spread',
    category: 'BEARISH',
    description: 'Credit spread: Sell lower strike Call and Buy higher strike Call. Earns full credit if underlying stays below sold strike.',
    outlook: 'Moderately Bearish to Neutral. High probability of profit with theta working in favor.',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 1 },
    ],
  },
  {
    id: 'long-put',
    name: 'Long Put',
    category: 'BEARISH',
    description: 'Pure directional debit: Buy slightly OTM Put. High leverage for sudden downside market drops.',
    outlook: 'Aggressively Bearish. Maximum profit reached as price approaches zero.',
    legsTemplate: [
      { action: 'BUY', instrument: 'PE', strikeOffset: -1, lots: 1 },
    ],
  },
  {
    id: 'protective-put',
    name: 'Protective Put (Synthetic Call)',
    category: 'BEARISH',
    description: 'Portfolio insurance: Long Future hedged with a protective ATM/OTM Put.',
    outlook: 'Long inventory protection against tail-risk market crashes.',
    legsTemplate: [
      { action: 'BUY', instrument: 'FUT', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -1, lots: 1 },
    ],
  },
  {
    id: 'put-ratio-backspread',
    name: 'Put Ratio Backspread (1x2)',
    category: 'BEARISH',
    description: 'Sell 1 ATM Put and Buy 2 OTM Puts. Uncapped explosive profit during rapid market crashes.',
    outlook: 'Violent downside crash expected.',
    legsTemplate: [
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -2, lots: 2 },
    ],
  },

  // ── 3. Neutral & Range-Bound Strategies ──
  {
    id: 'short-straddle',
    name: 'Short Straddle',
    category: 'NEUTRAL',
    description: 'Pure theta harvest: Sell ATM Call and ATM Put simultaneously. Maximum profit if asset expires exactly at ATM strike.',
    outlook: 'Range-bound with sharp volatility contraction expected.',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    id: 'short-strangle',
    name: 'Short Strangle',
    category: 'NEUTRAL',
    description: 'Wider breakeven zone: Sell OTM Call and Sell OTM Put. Higher win rate than straddle with comfortable buffer.',
    outlook: 'Strictly Range-bound within support and resistance boundaries.',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: -2, lots: 1 },
    ],
  },
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    category: 'NEUTRAL',
    description: 'Defined-risk institutional staple: Combine an OTM Bear Call credit spread with an OTM Bull Put credit spread.',
    outlook: 'Range-bound. Best executed when IV Rank is elevated.',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 4, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: -2, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -4, lots: 1 },
    ],
  },
  {
    id: 'iron-butterfly',
    name: 'Iron Butterfly',
    category: 'NEUTRAL',
    description: 'Wing-protected straddle: Sell ATM Call & Put, hedged by buying wings at OTM strikes. High return on risk.',
    outlook: 'Pinning at ATM strike with predefined catastrophic protection.',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -2, lots: 1 },
    ],
  },

  // ── 4. Volatile Strategies ──
  {
    id: 'long-straddle',
    name: 'Long Straddle',
    category: 'VOLATILE',
    description: 'Direction-neutral volatility play: Buy ATM Call and Buy ATM Put. Wins on massive move in either direction.',
    outlook: 'Huge price swing expected (e.g. Budget, Earnings, Geopolitical event).',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    id: 'long-strangle',
    name: 'Long Strangle',
    category: 'VOLATILE',
    description: 'Lower cost breakout play: Buy OTM Call and Buy OTM Put. Requires larger move than straddle but costs less.',
    outlook: 'Violent breakout expected with low initial premium outlay.',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -2, lots: 1 },
    ],
  },
  {
    id: 'reverse-iron-condor',
    name: 'Reverse Iron Condor',
    category: 'VOLATILE',
    description: 'Defined-risk breakout: Buy OTM Call spread and Buy OTM Put spread simultaneously.',
    outlook: 'High volatility breakout beyond either wing with strictly capped loss.',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'SELL', instrument: 'CE', strikeOffset: 4, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -2, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: -4, lots: 1 },
    ],
  },
];

/**
 * Builds actual StrategyLeg instances from a template preset.
 */
export function buildLegsFromPreset(
  preset: OptionStrategyPreset,
  spotPrice: number,
  strikeStep: number,
  expiry: string,
  lotSize: number
): StrategyLeg[] {
  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;
  const timeYears = 7 / 365.0; // 7 days baseline
  const baseIV = 0.145;

  return preset.legsTemplate.map((tmpl, index) => {
    const strike = atmStrike + tmpl.strikeOffset * strikeStep;
    let entryPrice = 100.0;
    let greeks = { delta: 0.5, gamma: 0.001, theta: -10, vega: 12 };

    if (tmpl.instrument === 'FUT') {
      entryPrice = spotPrice;
      greeks = { delta: 1.0, gamma: 0, theta: 0, vega: 0 };
    } else {
      const moneyness = (strike - spotPrice) / spotPrice;
      const iv = Math.max(0.08, baseIV + (tmpl.instrument === 'PE' ? -moneyness * 0.12 : moneyness * 0.05));
      entryPrice = Math.max(0.05, Math.round(calculateBSPrice(tmpl.instrument, {
        spot: spotPrice,
        strike,
        timeYears,
        volatility: iv,
      }) * 20) / 20);

      greeks = calculateBSGreeks(tmpl.instrument, {
        spot: spotPrice,
        strike,
        timeYears,
        volatility: iv,
      });
    }

    return {
      id: `leg-${preset.id}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: tmpl.action,
      instrument: tmpl.instrument,
      strike,
      expiry,
      lots: tmpl.lots,
      lotSize,
      entryPrice,
      currentPrice: entryPrice,
      iv: Math.round(baseIV * 1000) / 10,
      greeks,
    };
  });
}
