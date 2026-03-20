---
id: hyperliquid-trailing-stop-maintainer
slug: hyperliquid-trailing-stop-maintainer
name: Hyperliquid Trailing Stop Maintainer Workflow
type: workflow
summary: Move and repair protective stops for open Hyperliquid positions using configurable trailing rules.
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
    - read-position
    - read-open-orders
    - read-market-data
    - cancel-order
    - place-stop-order
    - read/write-kv
evidence:
  setup: workflows/hyperliquid-trailing-stop-maintainer/README.md#setup
  example: null
tags: [workflows, trading, hyperliquid, trailing-stop, risk-management]
---

# Hyperliquid Trailing Stop Maintainer Workflow

Workflow submission with artifact at `workflows/hyperliquid-trailing-stop-maintainer/references/hyperliquid-trailing-stop-maintainer@latest.ts`.

## What it does

- Reads open positions, existing stop orders, prices, and recent candles for the configured universe.
- Computes desired stop levels from configurable breakeven and trailing-distance rules.
- Cancels stale or duplicate stops and proposes replacement protective orders.
- Supports dry-run review before modifying any live protective order state.

## Capability contract

- Trigger: Manual run; schedule-ready for high-frequency protective maintenance after entries are open.
- Inputs:
  - `coinUniverse` (string; optional comma-separated allowlist)
  - `breakevenTriggerPct` (number, default `0.015`)
  - `trailDistancePct` (number, default `0.01`)
  - `maxStopUpdatesPerRun` (number, default `6`)
  - `dryRun` (boolean, default `true`)
- Outputs:
  - current stop coverage map per live position
  - proposed stop updates with old/new trigger prices and rationale
  - execution summary for canceled and newly placed stop orders
- Side effects:
  - reads Hyperliquid position, open-order, price, and candle data
  - may cancel outdated protective stops
  - may place replacement stop-loss orders when `dryRun=false`
  - writes latest stop intent snapshot for dedupe and auditability
- Failure modes:
  - missing position fill context yields conservative or skipped stop updates
  - market gaps can invalidate calculated trigger prices before replacement
  - duplicate stop orders remain if cancellations partially fail
  - overly tight trailing settings can churn protective orders

## Workflow steps

1. `fetch_stop_context`: load positions, stops, prices, and recent candles.
2. `plan_stop_updates`: compute desired trigger prices and identify stale or duplicate stops.
3. `apply_stop_updates`: cancel and replace protective stops unless `dryRun=true`.
4. `persist_stop_state`: record the latest proposed or executed stop map.

## Setup

1. Keep artifact at `workflows/hyperliquid-trailing-stop-maintainer/references/hyperliquid-trailing-stop-maintainer@latest.ts`.
2. Install it as `/workspace/.harness/workflows/hyperliquid-trailing-stop-maintainer@latest.ts`.
3. Validate with `workflow validate hyperliquid-trailing-stop-maintainer`.
4. Start with `{"dryRun":true,"coinUniverse":"BTC,ETH","trailDistancePct":0.01}`.
5. Review duplicate-stop detection before enabling live stop replacement.

## Security and permissions

- This workflow only manages protective stops; it should not be used to open or add to exposure.
- Keep it on a tight universe and update budget to avoid excessive order churn.
- Pair it with operator monitoring when used on unattended schedules.

## Evidence

- `evidence.setup`: `workflows/hyperliquid-trailing-stop-maintainer/README.md#setup`
- `evidence.example`: null
- Workflow artifact: `workflows/hyperliquid-trailing-stop-maintainer/references/hyperliquid-trailing-stop-maintainer@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
