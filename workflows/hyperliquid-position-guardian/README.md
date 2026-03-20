---
id: hyperliquid-position-guardian
slug: hyperliquid-position-guardian
name: Hyperliquid Position Guardian Workflow
type: workflow
summary: Watch Hyperliquid positions for liquidation-distance, spread, and stop-health breaches and cut risk when needed.
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
    - read-position
    - read-open-orders
    - read-market-data
    - cancel-order
    - place-order
    - place-stop-order
    - read/write-kv
evidence:
  setup: workflows/hyperliquid-position-guardian/README.md#setup
  example: null
tags: [workflows, trading, hyperliquid, guardrails, liquidation, stop-loss]
---

# Hyperliquid Position Guardian Workflow

Workflow submission with artifact at `workflows/hyperliquid-position-guardian/references/hyperliquid-position-guardian@latest.ts`.

## What it does

- Reads live positions, open orders, order-book context, and current prices for the configured universe.
- Scores each position for liquidation proximity, stop coverage, and spread or volatility stress.
- Produces a remediation plan that can reduce size, flatten exposure, or refresh missing stops.
- Supports dry-run mode for operator-only review before enabling live safeguards.

## Capability contract

- Trigger: Manual run; schedule-ready for frequent intraday monitoring.
- Inputs:
  - `coinUniverse` (string; optional comma-separated allowlist)
  - `minLiquidationBufferPct` (number, default `0.08`)
  - `maxSpreadPct` (number, default `0.006`)
  - `maxReductionPct` (number, default `0.5`)
  - `dryRun` (boolean, default `true`)
- Outputs:
  - per-position guard score and breach reasons
  - remediation plan with `hold`, `reduce`, `flatten`, or `repair-stop` actions
  - execution summary for canceled orders, refreshed stops, and reductions
- Side effects:
  - reads Hyperliquid account, position, open-order, price, and order-book state
  - may cancel stale protective orders and replace them
  - may place reduce-only orders or flatten a position when `dryRun=false`
  - writes guard snapshots for repeated-run comparison
- Failure modes:
  - missing liquidation or stop metadata creates degraded guard scoring
  - rapid price movement makes remediation stale before execution
  - conflicting manual actions race with guardian decisions
  - repeated breach loops without cooldown create noisy or duplicate actions

## Workflow steps

1. `fetch_live_state`: collect positions, orders, prices, and order-book snapshots.
2. `evaluate_guardrails`: score each position for liquidation, spread, and stop-health risk.
3. `execute_remediation`: refresh stops or reduce/flatten positions when guards breach and `dryRun=false`.
4. `persist_guard_state`: store the latest breach and remediation snapshot.

## Setup

1. Keep artifact at `workflows/hyperliquid-position-guardian/references/hyperliquid-position-guardian@latest.ts`.
2. Install it as `/workspace/.harness/workflows/hyperliquid-position-guardian@latest.ts`.
3. Validate with `workflow validate hyperliquid-position-guardian`.
4. Start with `{"dryRun":true,"coinUniverse":"BTC,ETH"}` and inspect the guard summary.
5. Only enable live remediation after defining cooldowns and operator escalation policy.

## Security and permissions

- This workflow can become a live protective control when `dryRun=false`.
- Keep strict allowlists and reduction caps so it cannot widen exposure.
- Use it to defend positions, not to open new speculative trades.

## Evidence

- `evidence.setup`: `workflows/hyperliquid-position-guardian/README.md#setup`
- `evidence.example`: null
- Workflow artifact: `workflows/hyperliquid-position-guardian/references/hyperliquid-position-guardian@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
