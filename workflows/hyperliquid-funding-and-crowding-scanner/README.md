---
id: hyperliquid-funding-and-crowding-scanner
slug: hyperliquid-funding-and-crowding-scanner
name: Hyperliquid Funding and Crowding Scanner Workflow
type: workflow
summary: Scan Hyperliquid books, asset metadata, and held exposure for crowding, spread, and funding-pressure signals.
category: workflows/market-data
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
    - write-run-artifacts
    - read/write-kv
evidence:
  setup: workflows/hyperliquid-funding-and-crowding-scanner/README.md#setup
  example: null
tags: [workflows, market-data, hyperliquid, funding, crowding, scanner]
---

# Hyperliquid Funding and Crowding Scanner Workflow

Workflow submission with artifact at `workflows/hyperliquid-funding-and-crowding-scanner/references/hyperliquid-funding-and-crowding-scanner@latest.ts`.

## What it does

- Reads Hyperliquid asset metadata, order-book context, current positions, and price state for a configured universe.
- Scores each symbol for crowding pressure using spread, directional skew, and asset-data fields such as funding or carry when available.
- Emits a ranked watchlist with held-position overlays so operators can see where current exposure conflicts with crowded conditions.
- Writes scan artifacts and snapshots for run-over-run comparison.

## Capability contract

- Trigger: Manual run; schedule-ready for periodic signal and risk review.
- Inputs:
  - `coinUniverse` (string; optional comma-separated allowlist)
  - `topN` (number, default `10`)
  - `maxSpreadPct` (number, default `0.008`)
  - `snapshotPrefix` (string, default `hyperliquid-funding-crowding:`)
- Outputs:
  - ranked crowding watchlist with signal scores and breach reasons
  - held-position overlay showing symbols already in the book
  - summary artifact suitable for operator review or downstream alerting
- Side effects:
  - reads Hyperliquid asset, price, order-book, position, and open-order state
  - writes run artifacts and a watchlist snapshot to KV
- Failure modes:
  - asset metadata omits funding-like fields, degrading signal richness
  - stale or partial order-book snapshots distort spread-based scoring
  - missing prior snapshots reduce delta quality
  - large universes create slow scan windows if not explicitly bounded

## Workflow steps

1. `fetch_market_context`: load asset metadata, order books, positions, and prices for the active universe.
2. `score_crowding`: compute crowding and spread scores, then rank the watchlist.
3. `emit_scan_artifacts`: write a summary artifact and snapshot the ranked list for comparison.

## Setup

1. Keep artifact at `workflows/hyperliquid-funding-and-crowding-scanner/references/hyperliquid-funding-and-crowding-scanner@latest.ts`.
2. Install it as `/workspace/.harness/workflows/hyperliquid-funding-and-crowding-scanner@latest.ts`.
3. Validate with `workflow validate hyperliquid-funding-and-crowding-scanner`.
4. Start with `{"coinUniverse":"BTC,ETH,SOL","topN":5}`.
5. Compare ranked deltas before using the output in any automated execution lane.

## Security and permissions

- This workflow is read-only and should remain that way.
- Use it to inform operator review, ranking, or downstream alerting, not direct order placement.
- Keep snapshot prefixes stable if you want meaningful run-over-run comparisons.

## Evidence

- `evidence.setup`: `workflows/hyperliquid-funding-and-crowding-scanner/README.md#setup`
- `evidence.example`: null
- Workflow artifact: `workflows/hyperliquid-funding-and-crowding-scanner/references/hyperliquid-funding-and-crowding-scanner@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
