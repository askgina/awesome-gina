---
id: strategy-tradfi-sniper
slug: strategy-tradfi-sniper
name: TradFi Sniper Strat
type: strategy
summary: Bundle the TradFi Sniper rotator recipe and workflow for guarded daily TradFi prediction-market entries.
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
    - manage-scheduled-prompts
    - place-prediction-trade
    - write-run-artifacts
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

Strategy bundle for arming Struct watchers across daily TradFi Up/Down markets and entering only when the fired side passes the configured guards.

## Bundle map

- `recipe-tradfi-sniper-rotator` ([file](../../recipes/predictions/recipe-tradfi-sniper-rotator.md))
- `tradfi-sniper` ([file](../../workflows/tradfi-sniper/README.md))

## Capability contract

- Trigger:
  - rotator recipe on cron `0 13-20 * * 1-5` in UTC
  - Struct child watcher webhooks when a condition-scoped `close_to_bond` event fires
- Inputs:
  - TradFi asset universe or `assetSymbols` subset
  - probability bands for Up and Down outcomes
  - optional `minPriceDeltaPct` gate
  - notional and watcher TTL settings
- Outputs:
  - watcher create/update summaries
  - per-webhook skip, dry-run, buy, or failure result
  - persisted market claim state for one-trade-per-market enforcement
- Side effects:
  - creates and updates managed scheduled prompts
  - may place real prediction-market buy orders
  - writes run artifacts and local trade-claim state
- Failure modes:
  - no active markets during the scheduled scan
  - market identity or price-source lookup failure
  - Struct webhook mismatch against encoded guards
  - duplicate market claim
  - trade-tool rejection or insufficient balance
- Strategy state transitions:
  - idle -> rotator-scan at each weekday hourly trigger
  - rotator-scan -> watchers-armed after active market resolution
  - watchers-armed -> webhook-evaluation when Struct fires
  - webhook-evaluation -> bought after all guards pass and order execution succeeds
  - webhook-evaluation -> skipped when probability, side, condition, price-delta, or claim guards fail

## Setup

1. Install workflow artifact: `workflows/tradfi-sniper/references/tradfi-sniper@latest.ts`.
2. Create the scheduled recipe from `recipes/predictions/recipe-tradfi-sniper-rotator.md`.
3. Use agent `predictions` and cron `0 13-20 * * 1-5` in UTC.
4. Confirm live-risk inputs before enabling:
   - `dryRun=false`
   - `notionalUsd=10`
   - `minProbability=0.65`
   - `maxProbability=0.99`
   - `minNoProbability=0.65`
   - `maxNoProbability=0.99`
5. Use a small `assetSymbols` subset for setup checks before scanning the full universe.

## Security and permissions

- Requires scheduled-prompt management and real prediction-market trade permissions.
- Child watchers are scoped to a single condition id and side.
- One-trade-per-market state is fail-closed and blocks the opposite side after a claim.
- Keep account-level risk controls aligned with `notionalUsd` and the number of selected assets.

## Evidence

- Recipe: `recipes/predictions/recipe-tradfi-sniper-rotator.md`
- Workflow: `workflows/tradfi-sniper/README.md`
- Source artifact: `workflows/tradfi-sniper/references/tradfi-sniper@latest.ts`
- Rotator payload: `workflows/tradfi-sniper/references/tradfi-sniper-rotator.recipe.json`

## Backlinks

- [Category](../../docs/categories/strategies.md)
- [Awesome Gina Index](../../README.md)
