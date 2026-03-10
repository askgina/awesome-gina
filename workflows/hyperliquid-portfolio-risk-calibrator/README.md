---
id: hyperliquid-portfolio-risk-calibrator
slug: hyperliquid-portfolio-risk-calibrator
name: Hyperliquid Portfolio Risk Calibrator Workflow
type: workflow
summary: Read Hyperliquid portfolio state and emit risk budgets, leverage caps, and rebalance guidance.
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
    - read-account
    - read-portfolio
    - read-position
    - read-open-orders
    - read-market-data
evidence:
  setup: workflows/hyperliquid-portfolio-risk-calibrator/README.md#setup
  example: null
tags: [workflows, trading, hyperliquid, portfolio, risk, calibration]
---

# Hyperliquid Portfolio Risk Calibrator Workflow

Workflow submission with artifact at `workflows/hyperliquid-portfolio-risk-calibrator/references/hyperliquid-portfolio-risk-calibrator@latest.ts`.

## What it does

- Reads Hyperliquid account, portfolio, positions, open orders, prices, and recent candles.
- Builds a portfolio-level exposure view including gross leverage, long/short split, and concentration.
- Applies a configurable risk profile plus optional JSON overrides to derive leverage caps and risk budgets.
- Scores each live position with VPVR-style context and side-aware penalties/boosts.
- Emits read-only rebalance guidance and per-position trim/risk targets; it does not place or cancel trades.

## Capability contract

- Trigger: Manual run; schedule-ready for periodic portfolio review or pre-trade calibration.
- Inputs:
  - `riskProfile` (string, default `BALANCED`; supported profiles include `DEFENSIVE`, `BALANCED`, and `AGGRESSIVE`)
  - `coinUniverse` (comma-delimited string; optional explicit asset list)
  - `profileOverrideJson` (string; optional JSON object merged onto the selected profile)
- Outputs:
  - portfolio snapshot metadata including account value, daily PnL, current positions, open-order count, and fetched market context
  - risk posture summary with selected profile, gross leverage, concentration, and leverage/risk-budget limits
  - `actions` guidance array for trimming leverage, reducing concentration, or maintaining current posture
  - `perPositionPlan` with VPVR-derived scores, allocated risk budget, suggested max notional, and trim guidance per coin
- Side effects:
  - reads Hyperliquid account, portfolio, position, open-order, price, and candle data
  - computes inline guidance only; no files, KV entries, order placement, order cancellation, or position mutations
- Failure modes:
  - Hyperliquid state fetch failure or upstream tool timeout
  - no usable account value, positions, or price/candle context for calibration
  - schema drift in account/portfolio/position payloads producing degraded scoring inputs
  - invalid `profileOverrideJson` ignored, leaving the base profile in effect
  - empty `coinUniverse` with no open positions limits forward-looking calibration coverage

## Workflow steps

1. `fetch_portfolio_state`: read account, portfolio, positions, open orders, prices, and lookback candles for the chosen universe.
2. `calibrate_risk`: apply the selected profile, compute portfolio exposures, derive risk limits, score positions, and emit guidance.

## Setup

1. Keep artifact at `workflows/hyperliquid-portfolio-risk-calibrator/references/hyperliquid-portfolio-risk-calibrator@latest.ts`.
2. Install it as `/workspace/.harness/workflows/hyperliquid-portfolio-risk-calibrator@latest.ts`.
3. Validate with `workflow validate hyperliquid-portfolio-risk-calibrator`.
4. Start with a manual review run, for example:
   - `{"riskProfile":"BALANCED","coinUniverse":"BTC,ETH,SOL"}`
5. If you use `profileOverrideJson`, keep it to non-secret numeric config overrides and review the merged limits before acting on them.
6. Compare the emitted `actions` and `perPositionPlan` against current book context before using the output for any live rebalance decisions.

## Security and permissions

- This workflow is read-oriented. It reads portfolio/account/market state and returns guidance; it does not place, cancel, close, or open Hyperliquid orders.
- Treat the output as risk guidance, not verified execution advice. It is still marked `experimental` and `unverified`.
- If you schedule it, route the results to an operator review loop rather than directly wiring it into live execution without an additional decision layer.

## Evidence

- `evidence.setup`: `workflows/hyperliquid-portfolio-risk-calibrator/README.md#setup`
- `evidence.example`: null
- Workflow artifact: `workflows/hyperliquid-portfolio-risk-calibrator/references/hyperliquid-portfolio-risk-calibrator@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
