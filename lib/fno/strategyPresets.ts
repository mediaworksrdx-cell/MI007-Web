// ─── Institutional Strategy Presets Library ──────────────────────────────────
// 24 Pre-engineered options architectures mapped to market regimes (Opstra Definedge Compatible).

import {
  OptionStrategyPreset,
  StrategyLeg,
} from './fnoTypes';
import { calculateBSPrice, calculateBSGreeks } from './blackScholes';
import { parseExpiryDaysToExpiry } from './fnoDataService';

export const INSTITUTIONAL_STRATEGY_PRESETS: OptionStrategyPreset[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // ── 1. BULLISH STRATEGIES ──
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'long-call',
    name: 'Long Call',
    category: 'BULLISH',
    contractComposition: 'ATM / ITM / OTM',
    compositionVariants: [
      { label: 'ATM Call', offsets: [0], description: 'At-The-Money Call (High delta sensitivity)' },
      { label: 'ITM Call', offsets: [-1], description: 'In-The-Money Call (High delta > 0.65, lower theta decay)' },
      { label: 'OTM Call', offsets: [1], description: 'Out-of-The-Money Call (Low cost, high leverage)' },
    ],
    description: 'Pure directional debit: Buy ATM/OTM Call option. Unlimited upside with risk strictly limited to premium paid.',
    outlook: 'Aggressively Bullish with expectation of strong momentum.',
    payoffSvgPath: 'M 6 32 L 30 32 L 54 8',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    id: 'short-put',
    name: 'Short Put (Bull Put / Naked Put)',
    category: 'BULLISH',
    contractComposition: 'ATM / OTM',
    compositionVariants: [
      { label: 'OTM Put', offsets: [-1], description: 'Out-of-The-Money Put (High probability credit)' },
      { label: 'ATM Put', offsets: [0], description: 'At-The-Money Put (Maximum premium collection)' },
    ],
    description: 'High probability credit: Sell OTM Put option. Collect full premium if stock stays above strike.',
    outlook: 'Moderately Bullish to Neutral with high win rate.',
    payoffSvgPath: 'M 6 32 L 30 12 L 54 12',
    legsTemplate: [
      { action: 'SELL', instrument: 'PE', strikeOffset: -1, lots: 1 },
    ],
  },
  {
    id: 'bull-call-spread',
    name: 'Bull Call Spread',
    category: 'BULLISH',
    contractComposition: 'ITM & OTM / ATM & OTM',
    compositionVariants: [
      { label: 'ATM & OTM', offsets: [0, 2], description: 'Buy ATM Call (0) + Sell OTM Call (+2)' },
      { label: 'ITM & OTM', offsets: [-1, 1], description: 'Buy ITM Call (-1) + Sell OTM Call (+1)' },
    ],
    description: 'Debit spread: Buy ATM Call and Sell OTM Call. Caps upside while drastically reducing cost basis and theta decay.',
    outlook: 'Moderately Bullish with defined risk and capped return.',
    payoffSvgPath: 'M 6 30 L 22 30 L 38 10 L 54 10',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'CE', strikeOffset: 2, lots: 1 },
    ],
  },
  {
    id: 'bull-put-spread',
    name: 'Bull Put Spread',
    category: 'BULLISH',
    contractComposition: 'OTM & OTM / ATM & OTM',
    compositionVariants: [
      { label: 'OTM & OTM', offsets: [-1, -3], description: 'Sell OTM Put (-1) + Buy Further OTM Put (-3)' },
      { label: 'ATM & OTM', offsets: [0, -2], description: 'Sell ATM Put (0) + Buy OTM Put (-2)' },
    ],
    description: 'Credit spread: Sell higher strike Put and Buy lower strike Put for downside protection. Benefits from time decay.',
    outlook: 'Moderately Bullish to Neutral. Profitable as long as underlying stays above sold strike.',
    payoffSvgPath: 'M 6 30 L 22 30 L 38 10 L 54 10',
    legsTemplate: [
      { action: 'SELL', instrument: 'PE', strikeOffset: -1, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -3, lots: 1 },
    ],
  },
  {
    id: 'call-ratio-backspread',
    name: 'Call Ratio Back Spread',
    category: 'BULLISH',
    contractComposition: 'ATM & OTM / ITM & OTM',
    compositionVariants: [
      { label: 'ATM & OTM', offsets: [0, 2], description: 'Sell 1 ATM Call (0) + Buy 2 OTM Calls (+2)' },
      { label: 'ITM & OTM', offsets: [-1, 1], description: 'Sell 1 ITM Call (-1) + Buy 2 OTM Calls (+1)' },
    ],
    description: 'Sell 1 ATM Call and Buy 2 OTM Calls. Generates explosive unlimited profit during massive bull breakouts.',
    outlook: 'Highly Bullish breakout or non-directional with strong upside skew.',
    payoffSvgPath: 'M 6 22 L 22 22 L 34 32 L 54 8',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 2 },
    ],
  },
  {
    id: 'long-synthetic',
    name: 'Long Synthetic (Synthetic Long Stock)',
    category: 'BULLISH',
    contractComposition: 'ATM',
    compositionVariants: [
      { label: 'ATM', offsets: [0, 0], description: 'Buy ATM Call (0) + Sell ATM Put (0)' },
    ],
    description: 'Synthetic Future: Buy ATM Call and Sell ATM Put. Perfectly mimics long future exposure at lower capital.',
    outlook: 'Pure Bullish mirroring synthetic long underlying position.',
    payoffSvgPath: 'M 6 34 L 54 8',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    id: 'range-forward',
    name: 'Range Forward (Risk Reversal)',
    category: 'BULLISH',
    contractComposition: 'OTM',
    compositionVariants: [
      { label: 'OTM', offsets: [-2, 2], description: 'Sell OTM Put (-2) + Buy OTM Call (+2)' },
    ],
    description: 'Zero-cost risk reversal: Sell OTM Put and Buy OTM Call. Participates in rally above call with downside risk below put.',
    outlook: 'Bullish collar structure with zero or minimal initial premium outlay.',
    payoffSvgPath: 'M 6 34 L 22 20 L 38 20 L 54 8',
    legsTemplate: [
      { action: 'SELL', instrument: 'PE', strikeOffset: -2, lots: 1 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 1 },
    ],
  },
  {
    id: 'bullish-butterfly',
    name: 'Bullish Butterfly',
    category: 'BULLISH',
    contractComposition: 'ITM, ATM & OTM',
    compositionVariants: [
      { label: 'ITM, ATM & OTM', offsets: [-1, 0, 1], description: 'Buy 1 ITM Call (-1), Sell 2 ATM Calls (0), Buy 1 OTM Call (+1)' },
      { label: 'OTM Wing Butterfly', offsets: [1, 3, 5], description: 'Buy 1 OTM Call (+1), Sell 2 OTM Calls (+3), Buy 1 OTM Call (+5)' },
    ],
    description: 'Targeted upward pin: Buy 1 ITM/OTM Call, Sell 2 Higher Calls, and Buy 1 Furthest Call. High asymmetric reward.',
    outlook: 'Bullish move targeting a specific resistance level.',
    payoffSvgPath: 'M 6 30 L 22 30 L 34 10 L 46 30 L 54 30',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: -1, lots: 1 },
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 2 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 1, lots: 1 },
    ],
  },
  {
    id: 'bullish-condor',
    name: 'Bullish Condor',
    category: 'BULLISH',
    contractComposition: 'ITM, ATM & OTM',
    compositionVariants: [
      { label: 'ITM, ATM & OTM', offsets: [-1, 0, 2, 3], description: 'Buy 1 ITM (-1), Sell 1 ATM (0), Sell 1 OTM (+2), Buy 1 OTM (+3)' },
      { label: 'OTM Channel Condor', offsets: [1, 2, 4, 5], description: 'Buy 1 OTM (+1), Sell 1 OTM (+2), Sell 1 OTM (+4), Buy 1 OTM (+5)' },
    ],
    description: 'Wider peak target: Buy 1 Call, Sell 1 Call, Sell 1 Higher Call, Buy 1 Furthest Call. Wider sweet spot than butterfly.',
    outlook: 'Bullish consolidation in upper price channel.',
    payoffSvgPath: 'M 6 30 L 20 30 L 30 10 L 42 10 L 52 30',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: -1, lots: 1 },
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 3, lots: 1 },
    ],
  },
  {
    id: 'covered-call',
    name: 'Covered Call',
    category: 'BULLISH',
    contractComposition: 'OTM / ATM',
    compositionVariants: [
      { label: 'OTM Call', offsets: [0, 2], description: 'Long Future (0) + Sell OTM Call (+2)' },
      { label: 'ATM Call', offsets: [0, 0], description: 'Long Future (0) + Sell ATM Call (0)' },
    ],
    description: 'Income generation: Long Future / Stock position covered by selling an OTM Call against it.',
    outlook: 'Mildly Bullish to Neutral. Enhances yield on underlying inventory.',
    payoffSvgPath: 'M 6 34 L 38 12 L 54 12',
    legsTemplate: [
      { action: 'BUY', instrument: 'FUT', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'CE', strikeOffset: 2, lots: 1 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ── 2. BEARISH STRATEGIES ──
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'long-put',
    name: 'Long Put',
    category: 'BEARISH',
    contractComposition: 'ATM / ITM / OTM',
    compositionVariants: [
      { label: 'ATM Put', offsets: [0], description: 'At-The-Money Put (Balanced delta & gamma)' },
      { label: 'ITM Put', offsets: [1], description: 'In-The-Money Put (Higher delta, lower theta decay)' },
      { label: 'OTM Put', offsets: [-1], description: 'Out-of-The-Money Put (Low capital, high downside leverage)' },
    ],
    description: 'Pure directional debit: Buy ATM/OTM Put. High leverage for sudden downside market drops.',
    outlook: 'Aggressively Bearish. Maximum profit reached as price approaches zero.',
    payoffSvgPath: 'M 6 8 L 30 32 L 54 32',
    legsTemplate: [
      { action: 'BUY', instrument: 'PE', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    id: 'short-call',
    name: 'Short Call (Naked Call)',
    category: 'BEARISH',
    contractComposition: 'ATM / OTM',
    compositionVariants: [
      { label: 'OTM Call', offsets: [1], description: 'Out-of-The-Money Call (High probability credit)' },
      { label: 'ATM Call', offsets: [0], description: 'At-The-Money Call (Maximum premium collection)' },
    ],
    description: 'High probability credit: Sell OTM Call. Earns full credit if underlying stays below sold strike.',
    outlook: 'Moderately Bearish to Neutral. High win rate from theta decay.',
    payoffSvgPath: 'M 6 12 L 30 12 L 54 32',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 1, lots: 1 },
    ],
  },
  {
    id: 'bear-put-spread',
    name: 'Bear Put Spread',
    category: 'BEARISH',
    contractComposition: 'ITM & OTM / ATM & OTM',
    compositionVariants: [
      { label: 'ATM & OTM', offsets: [0, -2], description: 'Buy ATM Put (0) + Sell OTM Put (-2)' },
      { label: 'ITM & OTM', offsets: [1, -1], description: 'Buy ITM Put (+1) + Sell OTM Put (-1)' },
    ],
    description: 'Debit spread: Buy ATM Put and Sell OTM Put. Provides downside profit with protection against volatility collapse.',
    outlook: 'Moderately Bearish with controlled risk.',
    payoffSvgPath: 'M 6 10 L 22 10 L 38 30 L 54 30',
    legsTemplate: [
      { action: 'BUY', instrument: 'PE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: -2, lots: 1 },
    ],
  },
  {
    id: 'bear-call-spread',
    name: 'Bear Call Spread',
    category: 'BEARISH',
    contractComposition: 'OTM & OTM / ATM & OTM',
    compositionVariants: [
      { label: 'OTM & OTM', offsets: [1, 3], description: 'Sell OTM Call (+1) + Buy Further OTM Call (+3)' },
      { label: 'ATM & OTM', offsets: [0, 2], description: 'Sell ATM Call (0) + Buy OTM Call (+2)' },
    ],
    description: 'Credit spread: Sell lower strike Call and Buy higher strike Call. Earns full credit if underlying stays below sold strike.',
    outlook: 'Moderately Bearish to Neutral. High probability of profit with theta working in favor.',
    payoffSvgPath: 'M 6 10 L 22 10 L 38 30 L 54 30',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 1, lots: 1 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 3, lots: 1 },
    ],
  },
  {
    id: 'put-ratio-backspread',
    name: 'Put Ratio Back Spread',
    category: 'BEARISH',
    contractComposition: 'ATM & OTM / ITM & OTM',
    compositionVariants: [
      { label: 'ATM & OTM', offsets: [0, -2], description: 'Sell 1 ATM Put (0) + Buy 2 OTM Puts (-2)' },
      { label: 'ITM & OTM', offsets: [1, -1], description: 'Sell 1 ITM Put (+1) + Buy 2 OTM Puts (-1)' },
    ],
    description: 'Sell 1 ATM Put and Buy 2 OTM Puts. Uncapped explosive profit during rapid market crashes.',
    outlook: 'Violent downside crash expected.',
    payoffSvgPath: 'M 6 8 L 26 32 L 38 20 L 54 20',
    legsTemplate: [
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -2, lots: 2 },
    ],
  },
  {
    id: 'short-synthetic',
    name: 'Short Synthetic (Synthetic Short Stock)',
    category: 'BEARISH',
    contractComposition: 'ATM',
    compositionVariants: [
      { label: 'ATM', offsets: [0, 0], description: 'Sell ATM Call (0) + Buy ATM Put (0)' },
    ],
    description: 'Synthetic Short Future: Sell ATM Call and Buy ATM Put. Replicates short future position with pure downside profit.',
    outlook: 'Strongly Bearish mirroring synthetic short underlying exposure.',
    payoffSvgPath: 'M 6 8 L 54 34',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    id: 'bearish-butterfly',
    name: 'Bearish Butterfly',
    category: 'BEARISH',
    contractComposition: 'ITM, ATM & OTM',
    compositionVariants: [
      { label: 'ITM, ATM & OTM', offsets: [1, 0, -1], description: 'Buy 1 ITM Put (+1), Sell 2 ATM Puts (0), Buy 1 OTM Put (-1)' },
      { label: 'OTM Wing Butterfly', offsets: [-1, -3, -5], description: 'Buy 1 OTM Put (-1), Sell 2 OTM Puts (-3), Buy 1 OTM Put (-5)' },
    ],
    description: 'Targeted downward pin: Buy 1 ITM/OTM Put, Sell 2 Lower Puts, and Buy 1 Furthest Put.',
    outlook: 'Bearish move targeting specific support floor.',
    payoffSvgPath: 'M 6 30 L 14 30 L 26 10 L 38 30 L 54 30',
    legsTemplate: [
      { action: 'BUY', instrument: 'PE', strikeOffset: 1, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 2 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -1, lots: 1 },
    ],
  },
  {
    id: 'bearish-condor',
    name: 'Bearish Condor',
    category: 'BEARISH',
    contractComposition: 'ITM, ATM & OTM',
    compositionVariants: [
      { label: 'ITM, ATM & OTM', offsets: [1, 0, -2, -3], description: 'Buy 1 ITM (+1), Sell 1 ATM (0), Sell 1 OTM (-2), Buy 1 OTM (-3)' },
      { label: 'OTM Channel Condor', offsets: [-1, -2, -4, -5], description: 'Buy 1 OTM (-1), Sell 1 OTM (-2), Sell 1 OTM (-4), Buy 1 OTM (-5)' },
    ],
    description: 'Wider downward plateau: Buy 1 Put, Sell 1 Put, Sell 1 Lower Put, Buy 1 Furthest Put.',
    outlook: 'Bearish consolidation in lower price channel.',
    payoffSvgPath: 'M 6 30 L 18 30 L 28 10 L 40 10 L 50 30',
    legsTemplate: [
      { action: 'BUY', instrument: 'PE', strikeOffset: 1, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: -2, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -3, lots: 1 },
    ],
  },
  {
    id: 'protective-put',
    name: 'Protective Put (Married Put)',
    category: 'BEARISH',
    contractComposition: 'ATM / OTM',
    compositionVariants: [
      { label: 'OTM Put', offsets: [0, -1], description: 'Long Future (0) + Buy Protective OTM Put (-1)' },
      { label: 'ATM Put', offsets: [0, 0], description: 'Long Future (0) + Buy Protective ATM Put (0)' },
    ],
    description: 'Portfolio insurance: Long Future hedged with a protective ATM/OTM Put.',
    outlook: 'Long inventory protection against tail-risk market crashes.',
    payoffSvgPath: 'M 6 24 L 26 24 L 54 8',
    legsTemplate: [
      { action: 'BUY', instrument: 'FUT', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -1, lots: 1 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ── 3. NON-DIRECTIONAL STRATEGIES ──
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'short-straddle',
    name: 'Short Straddle',
    category: 'NEUTRAL',
    contractComposition: 'ATM',
    compositionVariants: [
      { label: 'ATM', offsets: [0, 0], description: 'Sell ATM Call (0) + Sell ATM Put (0)' },
    ],
    description: 'Pure theta harvest: Sell ATM Call and ATM Put simultaneously. Maximum profit if asset expires exactly at ATM strike.',
    outlook: 'Range-bound with sharp volatility contraction expected.',
    payoffSvgPath: 'M 6 32 L 30 10 L 54 32',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    id: 'short-strangle',
    name: 'Short Strangle',
    category: 'NEUTRAL',
    contractComposition: 'OTM',
    compositionVariants: [
      { label: 'OTM', offsets: [2, -2], description: 'Sell OTM Call (+2) + Sell OTM Put (-2)' },
    ],
    description: 'Wider breakeven zone: Sell OTM Call and Sell OTM Put. Higher win rate than straddle with comfortable buffer.',
    outlook: 'Strictly Range-bound within support and resistance boundaries.',
    payoffSvgPath: 'M 6 32 L 20 12 L 40 12 L 54 32',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: -2, lots: 1 },
    ],
  },
  {
    id: 'iron-condor',
    name: 'Iron Condor',
    category: 'NEUTRAL',
    contractComposition: 'OTM',
    compositionVariants: [
      { label: 'OTM', offsets: [2, 4, -2, -4], description: 'Sell OTM CE (+2) / Buy OTM CE (+4) + Sell OTM PE (-2) / Buy OTM PE (-4)' },
    ],
    description: 'Defined-risk institutional staple: Combine an OTM Bear Call credit spread with an OTM Bull Put credit spread.',
    outlook: 'Range-bound. Best executed when IV Rank is elevated.',
    payoffSvgPath: 'M 6 28 L 18 28 L 26 12 L 34 12 L 42 28 L 54 28',
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
    contractComposition: 'ATM & OTM',
    compositionVariants: [
      { label: 'ATM & OTM', offsets: [0, 0, 2, -2], description: 'Sell ATM CE (0) & ATM PE (0) + Buy OTM CE (+2) & OTM PE (-2)' },
    ],
    description: 'Wing-protected straddle: Sell ATM Call & Put, hedged by buying wings at OTM strikes. High return on risk.',
    outlook: 'Pinning at ATM strike with predefined catastrophic protection.',
    payoffSvgPath: 'M 6 28 L 18 28 L 30 10 L 42 28 L 54 28',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -2, lots: 1 },
    ],
  },
  {
    id: 'calendar-spread',
    name: 'Calendar Spread (Time Spread)',
    category: 'NEUTRAL',
    contractComposition: 'ATM / OTM',
    compositionVariants: [
      { label: 'ATM', offsets: [0, 0], description: 'Sell Near ATM Call (0) + Buy Far ATM Call (0)' },
      { label: 'OTM', offsets: [1, 1], description: 'Sell Near OTM Call (+1) + Buy Far OTM Call (+1)' },
    ],
    description: 'Time decay differential: Sell near-expiry option and Buy far-expiry option at the same strike.',
    outlook: 'Neutral consolidation with expectations of rising IV.',
    payoffSvgPath: 'M 6 30 L 22 24 L 30 12 L 38 24 L 54 30',
    legsTemplate: [
      { action: 'SELL', instrument: 'CE', strikeOffset: 0, lots: 1, expiryIndexOffset: 0 },
      { action: 'BUY', instrument: 'CE', strikeOffset: 0, lots: 1, expiryIndexOffset: 1 },
    ],
  },
  {
    id: 'reverse-iron-condor',
    name: 'Reverse Iron Condor',
    category: 'VOLATILE',
    contractComposition: 'OTM',
    compositionVariants: [
      { label: 'OTM', offsets: [2, 4, -2, -4], description: 'Buy OTM CE (+2) / Sell OTM CE (+4) + Buy OTM PE (-2) / Sell OTM PE (-4)' },
    ],
    description: 'Defined-risk breakout: Buy OTM Call spread and Buy OTM Put spread simultaneously.',
    outlook: 'High volatility breakout beyond either wing with strictly capped loss.',
    payoffSvgPath: 'M 6 12 L 18 12 L 26 28 L 34 28 L 42 12 L 54 12',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'SELL', instrument: 'CE', strikeOffset: 4, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -2, lots: 1 },
      { action: 'SELL', instrument: 'PE', strikeOffset: -4, lots: 1 },
    ],
  },
  {
    id: 'long-straddle',
    name: 'Long Straddle',
    category: 'VOLATILE',
    contractComposition: 'ATM',
    compositionVariants: [
      { label: 'ATM', offsets: [0, 0], description: 'Buy ATM Call (0) + Buy ATM Put (0)' },
    ],
    description: 'Direction-neutral volatility play: Buy ATM Call and Buy ATM Put. Wins on massive move in either direction.',
    outlook: 'Huge price swing expected (e.g. Budget, Earnings, Geopolitical event).',
    payoffSvgPath: 'M 6 10 L 30 32 L 54 10',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 0, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: 0, lots: 1 },
    ],
  },
  {
    id: 'long-strangle',
    name: 'Long Strangle',
    category: 'VOLATILE',
    contractComposition: 'OTM',
    compositionVariants: [
      { label: 'OTM', offsets: [2, -2], description: 'Buy OTM Call (+2) + Buy OTM Put (-2)' },
    ],
    description: 'Lower cost breakout play: Buy OTM Call and Buy OTM Put. Requires larger move than straddle but costs less.',
    outlook: 'Violent breakout expected with low initial premium outlay.',
    payoffSvgPath: 'M 6 10 L 20 28 L 40 28 L 54 10',
    legsTemplate: [
      { action: 'BUY', instrument: 'CE', strikeOffset: 2, lots: 1 },
      { action: 'BUY', instrument: 'PE', strikeOffset: -2, lots: 1 },
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
  lotSize: number,
  overrideOffsets?: number[],
  overrideLots?: number,
  availableExpiries?: string[]
): StrategyLeg[] {
  const atmStrike = Math.round((spotPrice / strikeStep)) * strikeStep;
  const baseIV = 0.145;
  const defaultExpiries = availableExpiries && availableExpiries.length > 0
    ? availableExpiries
    : ['29 OCT 2026', '05 NOV 2026', '26 NOV 2026', '31 DEC 2026'];
  const baseExpiryIdx = Math.max(0, defaultExpiries.indexOf(expiry));

  return preset.legsTemplate.map((tmpl, index) => {
    const offset = overrideOffsets && overrideOffsets[index] !== undefined
      ? overrideOffsets[index]
      : tmpl.strikeOffset;
    const strike = Math.round((atmStrike + offset * strikeStep) * 100) / 100;
    const lots = overrideLots !== undefined ? overrideLots : tmpl.lots;

    const expiryOffset = tmpl.expiryIndexOffset ?? 0;
    const legExpiry = expiryOffset > 0
      ? (defaultExpiries[Math.min(defaultExpiries.length - 1, baseExpiryIdx + expiryOffset)] || '26 NOV 2026')
      : expiry;
    const legDte = parseExpiryDaysToExpiry(legExpiry);
    const timeYears = Math.max(0.002, legDte / 365.0);

    let entryPrice = 100.0;
    let legIvDecimal = baseIV;
    let greeks = { delta: 0.5, gamma: 0.001, theta: -10, vega: 12, vanna: 0, charm: 0, vomma: 0 };

    if (tmpl.instrument === 'FUT') {
      entryPrice = spotPrice;
      greeks = { delta: 1.0, gamma: 0, theta: 0, vega: 0, vanna: 0, charm: 0, vomma: 0 };
    } else {
      const moneyness = (strike - spotPrice) / spotPrice;
      const skew = -moneyness * 0.12;
      const smile = moneyness * moneyness * 0.45;
      legIvDecimal = Math.max(
        0.08,
        baseIV + (tmpl.instrument === 'CE' ? skew * 0.5 : -skew * 1.2) + smile
      );
      entryPrice = Math.max(0.05, Math.round(calculateBSPrice(tmpl.instrument, {
        spot: spotPrice,
        strike,
        timeYears,
        volatility: legIvDecimal,
      }) * 20) / 20);

      const calcGreeks = calculateBSGreeks(tmpl.instrument, {
        spot: spotPrice,
        strike,
        timeYears,
        volatility: legIvDecimal,
      });
      greeks = {
        ...calcGreeks,
        vanna: calcGreeks.vanna ?? 0,
        charm: calcGreeks.charm ?? 0,
        vomma: calcGreeks.vomma ?? 0,
      };
    }

    return {
      id: `leg-${preset.id}-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: tmpl.action,
      instrument: tmpl.instrument,
      strike,
      expiry: legExpiry,
      lots,
      lotSize,
      entryPrice,
      currentPrice: entryPrice,
      iv: Math.round(legIvDecimal * 1000) / 10,
      greeks,
      disabled: false,
    };
  });
}
