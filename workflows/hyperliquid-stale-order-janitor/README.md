---
id: hyperliquid-stale-order-janitor
slug: hyperliquid-stale-order-janitor
name: Stale Order Cleanup Workflow
type: workflow
summary: Cancel stale, duplicate, and orphaned Hyperliquid orders that no longer match live exposure.
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
    - read/write-kv
evidence:
  setup: workflows/hyperliquid-stale-order-janitor/README.md#setup
  example: null
tags: [workflows, trading, hyperliquid, stale-orders, cleanup, ops, order-management]
---

# Stale Order Cleanup Workflow

Workflow submission with artifact at `workflows/hyperliquid-stale-order-janitor/references/hyperliquid-stale-order-janitor@latest.ts`.

## What it does

- Reads open orders, live positions, and price context for the configured universe.
- Flags orphaned stop orders, duplicated protective orders, and entry orders that exceed their freshness window.
- Produces a cancellation plan with explicit reasons before any live cleanup path runs.
- Supports dry-run mode so operators can review cleanup behavior before enabling order cancellation.

## Capability contract

- Trigger: Manual run; schedule-ready for recurring order hygiene.
- Inputs:
  - `coinUniverse` (string; optional comma-separated allowlist)
  - `maxOrderAgeMinutes` (number, default `90`)
  - `cancelDuplicateStops` (boolean, default `true`)
  - `dryRun` (boolean, default `true`)
- Outputs:
  - classified order inventory with `orphaned`, `duplicate`, `stale-entry`, or `keep`
  - cancellation plan with order ids and reasons
  - execution summary for canceled orders and skipped items
- Side effects:
  - reads Hyperliquid positions, open orders, and current prices
  - may cancel orders selected by the cleanup policy when `dryRun=false`
  - writes the latest cleanup intent snapshot for auditability
- Failure modes:
  - order metadata lacks timestamps or side/context, reducing classification quality
  - manual strategy logic intentionally keeps an order that janitor policy would classify as stale
  - cancellations partially succeed, leaving residual duplicates
  - repeated runs without cooldown churn identical cleanup attempts

## Workflow steps

1. `fetch_order_inventory`: collect open orders, positions, and price context.
2. `classify_orders`: identify orphaned, duplicate, and stale orders against live exposure.
3. `apply_cleanup`: cancel selected orders unless `dryRun=true`.
4. `persist_cleanup_state`: store the latest cleanup proposal and results.

## Setup

1. Keep artifact at `workflows/hyperliquid-stale-order-janitor/references/hyperliquid-stale-order-janitor@latest.ts`.
2. Install it as `/workspace/.harness/workflows/hyperliquid-stale-order-janitor@latest.ts`.
3. Validate with `workflow validate hyperliquid-stale-order-janitor`.
4. Start with `{"dryRun":true,"maxOrderAgeMinutes":90}` and inspect the classification output.
5. Review duplicate-stop policy before using it on live stop ladders.

## Security and permissions

- This workflow should only reduce operational clutter; it must not widen or create exposure.
- Keep it in dry-run until order classification matches your trading conventions.
- Use coin allowlists if different sub-strategies share the same account.

## Evidence

- `evidence.setup`: `workflows/hyperliquid-stale-order-janitor/README.md#setup`
- `evidence.example`: null
- Workflow artifact: `workflows/hyperliquid-stale-order-janitor/references/hyperliquid-stale-order-janitor@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
