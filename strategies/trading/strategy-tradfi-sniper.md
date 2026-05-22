---
id: strategy-tradfi-sniper
slug: tradfi-sniper-strat
name: TradFi Sniper Strat
type: strategy
summary: Rotate TradFi daily Up/Down Struct hooks and buy one qualifying 65-99% side per market.
category: strategies/trading
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
    - read-public-web-data
    - manage-scheduled-prompts
    - place-prediction-trade
    - write-local-state-file
relationships:
  recipeIds:
    - recipe-tradfi-sniper-rotator
  workflowIds:
    - tradfi-sniper
evidence:
  setup: strategies/trading/strategy-tradfi-sniper.md#setup
  example: strategies/trading/strategy-tradfi-sniper.md#evidence
tags: [strategy, tradfi, predictions, polymarket, struct, close-to-bond]
---

# TradFi Sniper Strat

Daily TradFi Up/Down strategy that separates scheduled watcher rotation from condition-scoped webhook execution.

## Bundle map

- `tradfi-sniper` ([file](../../workflows/tradfi-sniper/README.md))
- `recipe-tradfi-sniper-rotator` ([file](../../recipes/predictions/recipe-tradfi-sniper-rotator.md))

## Capability contract

- Trigger:
  - rotator recipe at `0 13-20 * * 1-5` in UTC
  - Struct webhook mode when a condition-scoped `close_to_bond` hook fires
- Inputs:
  - built-in TradFi daily asset universe or `assetSymbols` subset
  - Up and Down probability bands, defaulting to 65-99%
  - optional price-delta threshold versus price-to-beat
  - fixed trade notional, defaulting to 10 USD
- Outputs:
  - refreshed watcher inventory
  - skipped asset diagnostics
  - webhook trade, dry-run, or skip decision
- Side effects:
  - creates and refreshes Struct watcher scheduled prompts
  - places qualifying prediction trades
  - writes one-trade-per-market claim state
- Failure modes:
  - market discovery or helper price-source failure
  - Struct payload mismatch against encoded condition, event, or side
  - no qualifying probability in the configured band
  - market already claimed before the opposite side fires
  - trade rejection after claim
- Strategy state transitions:
  - idle -> rotation at each weekday UTC schedule tick
  - rotation -> watching when asset/side hooks are refreshed
  - watching -> webhook-evaluation when Struct fires a hook
  - webhook-evaluation -> bought when guards pass and trade succeeds
  - webhook-evaluation -> skipped when guards fail or market is already claimed
  - bought or skipped -> waiting for next rotation

## Setup

1. Install the workflow artifact from `workflows/tradfi-sniper/references/tradfi-sniper@latest.ts`.
2. Create the rotator recipe from `recipes/predictions/recipe-tradfi-sniper-rotator.md`.
3. Keep `managedBy: tradfi-sniper` so repeated runs refresh the same watcher family.
4. Confirm prediction-trading limits before setting `dryRun: false`.
5. Monitor `/workspace/outputs/tradfi_sniper_trades.json` when checking duplicate-side protection.

## Security and permissions

- Requires scheduled-prompt management and prediction-trading permission.
- Uses exact condition/event/side guards before trading webhook payloads.
- Claims are intentionally fail-closed to prevent buying both sides of the same market.

## Evidence

- `workflows/tradfi-sniper/references/tradfi-sniper@latest.ts`
- `recipes/predictions/recipe-tradfi-sniper-rotator.md`

## Backlinks

- [Category](../../docs/categories/strategies.md)
- [Awesome Gina Index](../../README.md)
