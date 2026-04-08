---
id: strategy-btc-hourly-entry-stop-loss
slug: btc-hourly-entry-stop-loss
name: BTC Hourly Entry + Stop-Loss
type: strategy
summary: Bundle BTC hourly entry checks, active stop-loss monitoring, and minute-59 forced close into a single hourly strategy.
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
    - place-prediction-trade
    - close-prediction-position
    - write-run-artifacts
    - write-local-state-file
relationships:
  recipeIds:
    - recipe-btc-hourly-sl
    - recipe-btc-hourly-force-sell
  workflowIds:
    - btc-hourly-sl
    - btc-hourly-sell
evidence:
  setup: strategies/trading/strategy-btc-hourly-entry-stop-loss.md#setup
  example: strategies/trading/strategy-btc-hourly-entry-stop-loss.md#evidence
tags: [strategy, btc, hourly, stop-loss, forced-close]
---

# BTC Hourly Entry + Stop-Loss

BTC-only hourly strategy bundle for pre-expiry entry checks, stop-loss monitoring, and forced close before the contract rolls.

## Bundle map

- `recipe-btc-hourly-sl` ([file](../../recipes/predictions/recipe-btc-hourly-sl.md))
- `recipe-btc-hourly-force-sell` ([file](../../recipes/predictions/recipe-btc-hourly-force-sell.md))

## Capability contract

- Trigger:
  - pre-expiry entry and stop-loss loop from `recipe-btc-hourly-sl` during minutes `:45` through `:58`
  - terminal forced-close sweep from `recipe-btc-hourly-force-sell` at minute `:59`
- Inputs:
  - BTC hourly market odds and fixed risk inputs
  - stop-loss threshold configuration
  - shared local state file tracking the active hourly position
- Outputs:
  - hourly entry, hold, and stop-loss decision records
  - forced-close execution summary and cleanup status
  - deterministic state-file status for the next hourly cycle
- Side effects:
  - may place BTC hourly prediction trades
  - may close prediction positions on stop-loss or terminal forced close
  - writes run artifacts and local state
- Failure modes:
  - no valid BTC hourly market or no qualifying entry window
  - order placement or exit failure
  - stale or missing local state during the forced-close pass
- Strategy state transitions:
  - idle -> entry-check during the minute `:45-:58` monitoring window
  - entry-check -> open-position when one side qualifies
  - open-position -> hold while the stop-loss threshold remains intact
  - open-position -> stop-loss-exit when the held probability falls through the configured threshold
  - hold or stop-loss-exit -> forced-close at minute `:59` when residual exposure remains
  - forced-close -> reset for the next hourly cycle once cleanup is confirmed

## Setup

1. Enable bundled recipes:
   - `recipes/predictions/recipe-btc-hourly-sl.md`
   - `recipes/predictions/recipe-btc-hourly-force-sell.md`
2. Keep both schedules in `UTC` so the entry window and the `:59` forced-close sweep stay aligned.
3. Use the same local state path/config across both recipes so the forced-close step reads the exact position state created by the stop-loss loop.
4. Wire strategy route in app CMS:
   - set `publicUrl` to the shared page URL when published (typically `https://askgina.ai/recipe/<uuid>`)

## Security and permissions

- Requires market and position reads plus prediction-trade execution and local state write access.
- Should run with explicit hourly risk caps and a deterministic cleanup policy at minute `:59`.

## Evidence

- `recipes/predictions/recipe-btc-hourly-sl.md`
- `recipes/predictions/recipe-btc-hourly-force-sell.md`

## Backlinks

- [Category](../../docs/categories/strategies.md)
- [Awesome Gina Index](../../README.md)
