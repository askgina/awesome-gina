---
id: hyperliquid-multi-asset-trend-basket
slug: hyperliquid-multi-asset-trend-basket
name: Hyperliquid Multi Asset Trend Basket Workflow
type: workflow
summary: Build and execute a bounded multi-asset Hyperliquid trend basket instead of a single-ticker flip.
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
    - place-order
    - cancel-order
    - place-stop-order
    - read/write-kv
evidence:
  setup: workflows/hyperliquid-multi-asset-trend-basket/README.md#setup
  example: null
tags: [workflows, trading, hyperliquid, basket, trend, portfolio]
---

# Hyperliquid Multi Asset Trend Basket Workflow

Workflow submission with artifact at `workflows/hyperliquid-multi-asset-trend-basket/references/hyperliquid-multi-asset-trend-basket@latest.ts`.

## What it does

- Scans a configured Hyperliquid universe for trend-aligned candidates using candles, price, and book context.
- Ranks symbols and builds a bounded basket with per-position risk caps and correlation-aware slot limits.
- Cancels conflicting orders, optionally flips existing exposure, and places new basket entries with protective stops.
- Persists the selected basket and bar-level dedupe state to avoid duplicate execution on the same signal set.

## Capability contract

- Trigger: Manual run; schedule-ready after bar close for recurring multi-asset execution.
- Inputs:
  - `coinUniverse` (required string)
  - `interval` (string, default `4h`)
  - `maxPositions` (number, default `3`)
  - `riskPctPerPosition` (number, default `0.0075`)
  - `dryRun` (boolean, default `true`)
- Outputs:
  - ranked candidate basket with signal diagnostics
  - selected execution set with sizing, stop, and correlation notes
  - execution summary for cancellations, entries, flips, and protective stops
- Side effects:
  - reads Hyperliquid account, position, order, price, order-book, and candle data
  - may cancel conflicting open orders and flip existing opposite exposure
  - may place live entry and stop orders when `dryRun=false`
  - writes basket selection and dedupe metadata to KV
- Failure modes:
  - insufficient candles or stale price/book context for ranking
  - too many correlated candidates leave the basket underfilled
  - partial fills produce uneven risk allocation
  - repeated runs on the same bar create duplicate selection conflicts without correct dedupe state

## Workflow steps

1. `scan_universe`: fetch candles, prices, and order-book context for the configured universe.
2. `select_basket`: rank candidates and choose a bounded basket with sizing and stop plans.
3. `execute_basket`: cancel conflicts and place entry plus protective orders unless `dryRun=true`.
4. `persist_basket_state`: record the selected basket and execution intent.

## Setup

1. Keep artifact at `workflows/hyperliquid-multi-asset-trend-basket/references/hyperliquid-multi-asset-trend-basket@latest.ts`.
2. Install it as `/workspace/.harness/workflows/hyperliquid-multi-asset-trend-basket@latest.ts`.
3. Validate with `workflow validate hyperliquid-multi-asset-trend-basket`.
4. Start with `{"coinUniverse":"BTC,ETH,SOL,XRP","maxPositions":2,"dryRun":true}`.
5. Review ranking and correlation notes before any live execution.

## Security and permissions

- This workflow can open, flip, and protect multiple live positions when `dryRun=false`.
- Keep per-position risk small and basket slot count bounded.
- Treat it as a higher-complexity execution workflow than the single-ticker flip, with stronger operator controls.

## Evidence

- `evidence.setup`: `workflows/hyperliquid-multi-asset-trend-basket/README.md#setup`
- `evidence.example`: null
- Workflow artifact: `workflows/hyperliquid-multi-asset-trend-basket/references/hyperliquid-multi-asset-trend-basket@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
