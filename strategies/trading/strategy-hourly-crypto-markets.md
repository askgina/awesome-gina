---
id: strategy-hourly-crypto-markets
slug: hourly-crypto-markets
name: Hourly Crypto Markets Strat
type: strategy
summary: Bundle hourly BTC/ETH/SOL/XRP momentum entries with hourly cleanup recipes.
category: strategies/trading
status: active
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
    - read-position
    - place-order
    - redeem-position
    - cancel-order
    - write-run-artifacts
relationships:
  recipeIds:
    - recipe-btc-hourly-buy-75-95
    - recipe-eth-hourly-buy-75-95
    - recipe-sol-hourly-buy-75-95
    - recipe-xrp-hourly-buy-75-95
    - recipe-hourly-sell-all-positions
    - recipe-hourly-redeem-close-orders
evidence:
  setup: strategies/trading/strategy-hourly-crypto-markets.md#setup
  example: strategies/trading/strategy-hourly-crypto-markets.md#evidence
tags: [strategy, hourly, crypto, momentum, cleanup]
---

# Hourly Crypto Markets Strat

Hourly multi-asset strategy bundle combining momentum entries with recurrent cleanup operations.

## Bundle map

- `recipe-btc-hourly-buy-75-95` ([file](../../recipes/predictions/recipe-btc-hourly-buy-75-95.md))
- `recipe-eth-hourly-buy-75-95` ([file](../../recipes/predictions/recipe-eth-hourly-buy-75-95.md))
- `recipe-sol-hourly-buy-75-95` ([file](../../recipes/predictions/recipe-sol-hourly-buy-75-95.md))
- `recipe-xrp-hourly-buy-75-95` ([file](../../recipes/predictions/recipe-xrp-hourly-buy-75-95.md))
- `recipe-hourly-sell-all-positions` ([file](../../recipes/predictions/recipe-hourly-sell-all-positions.md))
- `recipe-hourly-redeem-close-orders` ([file](../../recipes/predictions/recipe-hourly-redeem-close-orders.md))

## Capability contract

- Trigger:
  - asset-specific hourly momentum entry windows from the four momentum recipes
  - cleanup windows at minute `:30` and `:58` from ops recipes
- Inputs:
  - per-asset hourly odds and stake configurations
  - open position inventory and redeemable inventory
  - open order inventory for cancel/cleanup
- Outputs:
  - per-asset entry and skip decisions
  - hourly cleanup action summaries
  - liquidation/redeem/cancel status records
- Side effects:
  - places hourly momentum orders
  - sells/redeems positions during cleanup windows
  - cancels open limit orders
  - writes run artifacts
- Failure modes:
  - unavailable or stale odds feeds
  - order placement/redeem/cancel failures
  - residual positions not fully cleared in a cycle
- Strategy state transitions:
  - idle -> entry-evaluation at each momentum trigger
  - entry-evaluation -> open-positions when qualifying odds exist
  - open-positions -> mid-hour-cleanup at minute `:30`
  - mid-hour-cleanup -> terminal-cleanup at minute `:58`
  - terminal-cleanup -> reset for next hourly cycle

## Setup

1. Enable bundled recipes:
   - `recipes/predictions/recipe-btc-hourly-buy-75-95.md`
   - `recipes/predictions/recipe-eth-hourly-buy-75-95.md`
   - `recipes/predictions/recipe-sol-hourly-buy-75-95.md`
   - `recipes/predictions/recipe-xrp-hourly-buy-75-95.md`
   - `recipes/predictions/recipe-hourly-sell-all-positions.md`
   - `recipes/predictions/recipe-hourly-redeem-close-orders.md`
2. Keep scheduler timezone consistent across all six recipes.
3. Wire strategy route in app CMS:
   - set `publicUrl` to the shared page URL when published (typically `https://askgina.ai/recipe/<uuid>`)

## Security and permissions

- Requires market/position reads plus order execution, redemption, and cancel-order permissions.
- Should run with explicit rate limits and per-asset risk caps.

## Evidence

- `recipes/predictions/recipe-btc-hourly-buy-75-95.md`
- `recipes/predictions/recipe-eth-hourly-buy-75-95.md`
- `recipes/predictions/recipe-sol-hourly-buy-75-95.md`
- `recipes/predictions/recipe-xrp-hourly-buy-75-95.md`
- `recipes/predictions/recipe-hourly-sell-all-positions.md`
- `recipes/predictions/recipe-hourly-redeem-close-orders.md`

## Backlinks

- [Category](../../docs/categories/strategies.md)
- [Awesome Gina Index](../../README.md)
