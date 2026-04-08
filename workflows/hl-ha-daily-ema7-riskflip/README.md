---
id: hl-ha-daily-ema7-riskflip
slug: hl-ha-daily-ema7-riskflip
name: Daily Trend Reversal Workflow
type: workflow
summary: Trade daily Hyperliquid trend reversals with bounded sizing, stale-order cleanup, and protective stops.
category: workflows/trading
status: experimental
owner: askgina
repo: https://github.com/askgina/awesome-gina
license: NOASSERTION
version: 0.1.0
visibility: unlisted
publicUrl: null
verification:
  tier: unverified
  lastVerifiedAt: null
security:
  permissions:
    - read-market-data
    - read-account
    - read-position
    - read-open-orders
    - place-order
    - cancel-order
    - place-stop-order
    - read/write-kv
evidence:
  setup: workflows/hl-ha-daily-ema7-riskflip/README.md#setup
  example: null
tags: [workflows, trading, hyperliquid, heikin-ashi, ema, risk-management, executes-trades]
---

# Daily Trend Reversal Workflow

Workflow submission with artifact at `workflows/hl-ha-daily-ema7-riskflip/references/hl-ha-daily-ema7-riskflip@latest.ts`.

## What it does

- Computes finalized-bar Heikin Ashi closes and EMA(7) crossover direction from Hyperliquid candles.
- Waits until the configured post-close buffer has passed before acting on the latest daily bar.
- Sizes the trade from account value, configured risk percentage, and stop distance.
- Cancels stale open orders, flips an existing opposite-side position when needed, then opens the new side.
- Places a protective stop-loss order and records the processed bar in KV to avoid duplicate execution.

## Capability contract

- Trigger: Manual run; schedule-ready for once-per-day execution after the target bar closes and `postCloseDelayMin` has elapsed.
- Inputs:
  - `ticker` (required string)
  - `interval` (string, default `1d`)
  - `emaLength` (number, default `7`)
  - `riskPct` (number, default `0.02`)
  - `postCloseDelayMin` (number, default `3`)
  - `slippage` (number, default `0.01`)
  - `minStopDistancePct` / `maxStopDistancePct` (numbers, default `0.001` / `0.15`)
  - `minBars` (number, default `30`)
  - `minOrderSize` (number, default `0`)
  - `sizeDecimals` / `priceDecimals` (numbers, default `4` / `4`)
  - `maxSpreadPct` (number, default `0.005`)
  - `forceAfterClose` (boolean, default `false`)
- Outputs:
  - signal diagnostics for the latest finalized bar, including crossover direction and spread guard state
  - trade plan with current position, risk budget, stop price, order size, and cancellation targets
  - execution result covering cancellations, optional flip-close, entry order, and stop placement
  - dedupe state persisted for the processed bar/action pair
- Side effects:
  - reads Hyperliquid account, position, order book, open-order, asset, and candle data
  - cancels existing Hyperliquid orders for the configured ticker before a fresh execution path
  - may close an opposite-side live position, then open a new live position on Hyperliquid
  - places a live stop-loss order sized to the new position
  - writes KV state under `workflow:hl-ha-daily-ema7-riskflip:<TICKER>`
- Failure modes:
  - insufficient candles or EMA series unavailable for the latest bar
  - latest bar not past the configured close buffer yet
  - spread guard breach, invalid stop distance, or order size below limits
  - account value, live price, or asset sizing metadata unavailable
  - flip-close remains partially open, blocking the new entry
  - duplicate run for the same bar/action blocked by KV dedupe state

## Workflow steps

1. `compute_signal`: fetch candles/order book/price, build Heikin Ashi bars, compute EMA crossover, and enforce post-close readiness.
2. `plan_trade`: inspect account value, current position, open orders, and sizing constraints to decide hold/open/flip behavior.
3. `dedupe_gate`: compare the candidate execution against stored KV state for the latest processed bar.
4. `execute_trade`: cancel stale orders, optionally close the opposite position, place the new market order, and place the stop-loss order.
5. `persist_run_state`: write the processed bar/action metadata back to KV after successful execution or same-direction hold.

## Setup

1. Keep artifact at `workflows/hl-ha-daily-ema7-riskflip/references/hl-ha-daily-ema7-riskflip@latest.ts`.
2. Install it as `/workspace/.harness/workflows/hl-ha-daily-ema7-riskflip@latest.ts`.
3. Validate with `workflow validate hl-ha-daily-ema7-riskflip`.
4. Start with manual runs on a single ticker and conservative inputs, for example:
   - `{"ticker":"BTC","riskPct":0.005,"postCloseDelayMin":3,"slippage":0.01}`
5. Only schedule it once the account is explicitly authorized for live Hyperliquid order placement and reversal handling.
6. If scheduling, run it once per target bar after the bar close plus the configured post-close buffer.

## Security and permissions

- This workflow can cancel orders, close an existing position, open a new position, and place a protective stop on Hyperliquid.
- It is not read-only automation; it performs live trading actions when its guards pass.
- Use tight account-level risk limits, ticker allowlists, and operational monitoring before any unattended schedule.
- KV dedupe protects against repeat processing of the same bar/action, but it does not replace portfolio-level risk controls.

## Evidence

- `evidence.setup`: `workflows/hl-ha-daily-ema7-riskflip/README.md#setup`
- `evidence.example`: null
- Workflow artifact: `workflows/hl-ha-daily-ema7-riskflip/references/hl-ha-daily-ema7-riskflip@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
