# MI-007 Web — Locked Architecture, Feature & Engineering Specification

> **LOCKED GOVERNANCE NOTICE:**
> This document defines the **non-negotiable product features, mathematical invariants, UI contracts, and data-integrity rules** of `mediaworksrdx-cell/MI007-Web`.
> **No developer or automated agent may override, remove, dilute, or regress any specification below without explicit written approval from the repository owner.**

---

## 1. Locked Technology Stack

| Layer | Locked Technology | Guardrail |
|---|---|---|
| **Framework** | Next.js `16.4.6` (App Router + Turbopack) | Do not downgrade or swap routing architecture. |
| **Language** | TypeScript `5.x` (strict) | Zero TS errors required on all modified files. |
| **Styling** | Tailwind CSS `4.x` | Light & Dark theme compatibility required on all UI/canvas overlays. |
| **Charting Engine** | Custom High-DPI HTML5 Canvas 2D (`lib/chartRenderer.ts`, `lib/mi007/mi007Renderer.ts`, `components/chart/CandlestickCanvas.tsx`) | Do not replace with third-party iframe widgets that remove SMC/MI-007 canvas control. |
| **Regression Runner** | Node.js + `scripts/ts-loader.cjs` + `npm run test:mi007` | Must remain wired into `package.json` `"test"` and `.github/workflows/ci.yml`. |
| **Alerts Delivery** | Browser Notifications, WhatsApp (CallMeBot / Meta Cloud API / Twilio), Gmail SMTP (`nodemailer`) | Preserve all 5 lifecycle trigger stages. |

---

## 2. Locked Chart Toolbar & UI Contracts (DO NOT OVERRIDE)

### 2.1 Top Bar Controls
1. **`SMC Analysis` Dropdown (`components/chart/ChartToolbar.tsx`):**
   - Must remain simplified into **2 clean groups**: `1. Core SMC` (6 toggles) and `2. Optional` (4 toggles).
   - Auto-deduplicates trade setup brackets when `MI-007` owns an active tradeable bracket.
2. **`MI-007` Strategy Control (`components/chart/ChartToolbar.tsx`):**
   - Exact naming: **`MI-007`** (Quantum AI is **permanently removed** — do not re-introduce).
   - Exact toggle hierarchy: **1 Main Toggle (`MI-007`) + 3 Sub-Toggles (`SMC`, `Vol Pro`, `Fibo`)**.
   - Enabling `MI-007` + `SMC` sub-toggle automatically renders the SMC overlay layer (`BOS`, `CHoCH`, `Swings`, `OB`, `FVG`) even if the standalone `SMC Analysis` button is OFF.
3. **`📅 Go to` Date & Time Navigator (`components/chart/ChartToolbar.tsx`, `ChartContainer.tsx`, `CandlestickCanvas.tsx`):**
   - Must stay positioned **directly next to `Template`** in the top bar.
   - Must provide **Date From**, **Date Till**, **Time From**, **Time Till**, **Go to Range**, and **Reset** controls that zoom, scroll, and auto-fit the Y-axis to the requested range.
4. **Dashboard `🔔 ALERTS` Tab (`app/terminal/page.tsx`, `components/alerts/SmcAlertsTabView.tsx`):**
   - Selective SMC instrument alerts with all 5 lifecycle stages enabled by default and Browser / WhatsApp / Gmail delivery.

---

## 3. Locked SMC Engine Specification (`lib/smcEngine.ts`)

1. **Zero Repainting & Strict Causality:**
   - Dual timestamps (`formationTime` vs `confirmationTime`) on all swing points.
   - Closed-candle gating (`isCandleClosed`) on structure breaks, swings, and setups.
   - Point-in-time confluence scoring (`zoneActiveAt`, `prevDayLevelsAt`) — zero look-ahead bias.
   - Verified `0` break mutations across walk-forward partial vs. full runs.
2. **Flat / Circuit-Locked Bar Guard (`detectSwingPoints`):**
   - Strictly requires at least one lower neighbor on both left and right for a swing high (and strictly higher neighbor on both sides for a swing low). Flat bars (`high === low`) must produce **`0` phantom swings**.
3. **Sideways Chop Bias Filter (`computeStructureBias`):**
   - Low directional efficiency (`htfEfficiency < 0.18` near SMA) must classify `htfBias = 'RANGE'` rather than falsely forcing directional bias.
4. **Multi-Day `1H+` Swing Lifecycle:**
   - Single-day intraday expiry (`isIntradaySession`) applies **strictly to `< 1H`** (`1m`, `3m`, `5m`, `15m`, `30m`). Timeframes `1H` and above run as multi-day swing setups.
5. **Unbiased `setupHistory` (`SMC-A`):**
   - `SmcAnalysis` must always expose `setupHistory` containing **all validated setups** including stopped-out (`INVALIDATED`) and `EXPIRED` outcomes so no win-rate or backtest calculation suffers survivorship bias.
6. **Chart Rendering Rules (`lib/chartRenderer.ts`):**
   - **Full history across all timeframes** for `BOS`, `CHoCH`, `Swings (HH/HL/LH/LL)`, `FVGs`, and `Order Blocks` (filtered/ranked by visible viewport `(pMin + pMax) / 2`, no 90-bar cutoff).
   - **Single active Trade Setup bracket** only (no historical trade setup clutter), dynamically expanding to the latest live candle, at **100% solid opacity** for live setups/unmitigated zones, and automatically filtering out any SL-violated dead setups (`isSlViolatedByPrice`).

---

## 4. Locked Unified Volume Profile Specification (`lib/volumeProfile.ts`)

Both **Chart VPVR** (`calculateVolumeProfile` in `lib/chartRenderer.ts`) and **MI-007** (`buildRangeProfile` in `lib/mi007/mi007Engine.ts`) **MUST** share the single canonical `computeVolumeProfile()` implementation:

1. **Zero Fabricated Volume (`VP1`):**
   - Never invent synthetic `range × 1000` volume on zero-volume feeds.
   - When `totalVolume <= 0`, return `hasVolume: false`, `pocPrice: 0`, `buckets: []` (never collapse POC to bin 0).
2. **Volume Quality & Estimated Bar Exclusion (`Critical 01`):**
   - Any individual candle flagged `volumeEstimated === true` is **100% excluded** from `detectVolumeQuality` counts, Volume Profile bucket accumulation, and Volume Bubbles.
   - Preserve fractional precision (`Number(c.volume.toFixed(4))`) for Crypto feeds (e.g. `0.528 BTC`).
   - Require `≥ 35%` verified non-estimated positive bars with diverse non-constant volumes (accommodates COMEX Gold / futures overnight 0-volume rollover bars while strictly rejecting all-zero indices/forex and estimated feeds).
3. **Flat-Bar Volume Conservation (`VP3`):**
   - Bars with `high === low` deposit **100%** of their volume into their exact containing bucket (`100.00%` conservation).
4. **Axis-Padding Independence (`VP5`):**
   - Buckets (`40` default) are built strictly from actual candle highs and lows, never from padded viewport `[pMin, pMax]`.
5. **2-Row 70% Value Area & Transparent Metadata (`VP6`, `Critical 03`):**
   - Standard outward 2-row comparison adding both rows on the heavier side until `70%` of total volume is captured (`VAH` & `VAL`).
   - Always expose `distributionModel: 'OHLCV_UNIFORM_APPROXIMATION'` and `estimatedDelta: true`.

---

## 5. Locked MI-007 Strategy Engine & Renderer (`lib/mi007/*`)

1. **Visual Layers Under `MI-007`:**
   - **`Vol Pro` Sub-Toggle:**
     - Right-docked **Split Volume Profile** (Blue 70% VA / Slate outside / Gold POC) + **Estimated Delta Profile** (Green/Red, explicitly labeled `EST. DELTA | VOL PRO`) + Gold `POC`, Yellow `PD-POC` (exchange-session aligned via `getSmcTradingDayKey`), Blue `VAH`/`VAL`.
     - **Full-History Order Flow Volume Bubbles** (`O(N)` trailing 20-bar SMA across 100% of loaded candles, `≥ 1.75×` volume surge, bright Gold outer ring on passive absorption `≥ 2.0×` + compact body/wick, strictly gated on non-estimated actual volume).
   - **`Fibo` Sub-Toggle:**
     - **Thick Black Lines Only** (`2.2px` solid key levels, `1.5px` dashed intermediate/extensions, black dashed diagonal anchor line, crisp black-on-white labels — **no colored shaded bands**).
     - **Strictly Immutable Confirmed-Swing Anchors:** Priority-1 BOS/MSS impulse leg only activates once a confirmed post-origin `majorSwing` exists (no unconfirmed raw-candle scanning); Priority-2 fallback anchors strictly to confirmed `majorSwings`.
     - **Standard Convention (`FB1`):** `0.00` at impulse termination, `1.00` at impulse origin (`61.8% = 138.2` on a `100 → 200` move). Manual chart Fibonacci tool (`FIBONACCI` in `lib/chartRenderer.ts`) uses the **exact same default orientation** (with `reverse`, `extendLeft`/`extendRight`, `0.618–0.786` enabled-only golden pocket, and `1.272` extension).
     - Negative Fibonacci extensions (`≤ 0`) are never emitted.
   - **`SMC` Sub-Toggle & HUD Card:**
     - **1:1 SMC Engine Alignment:** Entry, SL, TP1, and TP2 lock directly to our main SMC Engine's active setup (`smc.confirmedSetups`) when present.
     - **Directional Volume Profile Confluence:** Bullish support must be at/below entry (`≤ entry + 0.35 ATR`); bearish resistance must be at/above entry (`≥ entry - 0.35 ATR`).
     - **100-Point Scoring Integrity:** `score` is computed strictly as `checklist.reduce((s, i) => s + i.awarded, 0)`. Order Flow is transparently labeled `Order Flow (OHLCV Delta Proxy)`.
     - **Strict Execution Gate (`isTradeable` & `status`):**
       - Requires `score ≥ 60`, `R:R ≥ 1:2.0`, strictly positive ordered targets with `≥ 0.8R` TP1/TP2 separation, non-stale entry (not past TP1, not SL-violated, within `4.5 ATR` & `12%`), **directional closed-candle confirmation** (`close > open` for bullish, `close < open` for bearish), AND **non-bypassable actual Volume Profile confluence** (`hasActualVp && vpEntryAligned`).
       - `status === 'ACTIVE'` **iff** `isTradeable === true`.
       - When `!isTradeable`, HUD explicitly labels levels **`INDICATIVE ONLY (NO TRADE)`** (`REF ENTRY / REF SL / REF TP1 / REF TP2`).

---

## 6. Locked Fundamentals & Screener Data Integrity

1. **Zero Fabricated Metrics (`scripts/enrich-all-universe-fundamentals.ts`, `scripts/scrub-fundamentals-cache.mjs`):**
   - Never synthesize `0.32×CFO` / `0.08×CFO` CapEx or FCF.
   - Never synthesize `currentRatio` / `quickRatio` from hardcoded D/E buckets.
   - Return `null` (rendered as `—` in UI) when no real value exists.
2. **Currency Mismatch Sanity Check (`scripts/sync-real-filings.mjs`):**
   - Reject statements where `marketCap / latestNetProfit` diverges from reported `pe` by `> 10×`.
3. **Statement Reconciliation & Provenance:**
   - Balance Sheet `otherLiabilities` includes minority interest so `Liabilities === Assets` (100% reconciliation).
   - Never zero-fill missing `otherIncome`, `cwip`, `investments`, `dividendPayoutPct`, or `interest` (when debt > 0).
   - Label Yahoo Finance data accurately as **`Yahoo Finance Reported Financials`** (never `"Audited SEC Filings"`).

---

## 7. Mandatory Verification & CI Gate

Before **any** commit to `main` touching charts, SMC, Volume Profile, Fibonacci, or MI-007:

```bash
npm run test:mi007
```

All **11 unconditional regression tests** in `scripts/test-audit-round2-regressions.cjs` must pass (`PASS [1/11]` through `PASS [11/11]`), enforced automatically by GitHub Actions in `.github/workflows/ci.yml`:

1. Zero-volume guard (`VP1 + VP2`)
2. 100% volume conservation with 20% flat bars (`VP3`)
3. Unified Chart VPVR === MI-007 profile parity (`VP4`)
4. Axis-padding independence (`VP5`)
5. Manual & MI-007 Fibonacci orientation parity (`FB1`)
6. Crash test positive targets & stale-setup guard (`FB2`)
7. Unbiased SMC `setupHistory` preserving stopped-out/expired setups (`SMC-A`)
8. Estimated-volume feed guard & non-bypassable VP gate (`Critical 01 + Important 06`)
9. Unconditional `status`/`isTradeable` parity, checklist sum parity & directional close confirmation (`Important 3 + 5`)
10. Numerical Order Flow `barDelta` / `cvdTrend` accuracy & OHLCV proxy metadata (`Critical 02 + 03`)
11. Individual `volumeEstimated` bar exclusion & confirmed-swing Fibonacci anchor stability (`Critical 1 + 2`)
