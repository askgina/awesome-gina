---
id: recipe-tradfi-sniper-rotator
slug: recipe-tradfi-sniper-rotator
name: TradFi Sniper Rotator
type: recipe
summary: Run TradFi Sniper hourly on weekdays to arm Struct watchers for daily TradFi prediction markets.
category: recipes/predictions
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
evidence:
  setup: recipes/predictions/recipe-tradfi-sniper-rotator.md#setup
  example: recipes/predictions/recipe-tradfi-sniper-rotator.md#evidence
tags: [tradfi, predictions, polymarket, struct, rotator, close-to-bond]
relationships:
  strategyIds:
    - strategy-tradfi-sniper
---

# TradFi Sniper Rotator

Scheduled recipe that runs the `tradfi-sniper` workflow through the weekday TradFi window.

## What it does

- Runs hourly from 13:00 through 20:00 UTC on weekdays.
- Scans all configured TradFi daily Up/Down series unless `assetSymbols` is set.
- Arms or refreshes Struct `close_to_bond` hooks for each eligible asset side.
- Leaves webhook-mode buying to condition-scoped child watcher executions.

## Capability contract

- Trigger: cron `0 13-20 * * 1-5`.
- Inputs:
  - `mode`: `rotator`
  - `sniperName`: `TradFi Sniper`
  - `assetSymbols`: blank for full configured universe
  - `activeWindowMinutes`: `0`
  - `minPriceDeltaPct`: `0`
  - `minProbability`: `0.65`
  - `maxProbability`: `0.99`
  - `minNoProbability`: `0.65`
  - `maxNoProbability`: `0.99`
  - `notionalUsd`: `10`
  - `watcherTtlMinutes`: `1440`
  - `dryRun`: `false`
  - `managedBy`: `tradfi-sniper`
- Outputs:
  - rotator status and refreshed watcher count
  - skipped asset list and reasons
  - watcher create/update results
- Side effects:
  - creates or updates managed child Struct watchers
  - child watchers may later place real prediction-market buy orders
  - writes run artifacts and trade-claim state
- Failure modes:
  - no active assets in the configured window
  - no watchers armed after filtering
  - market identity lookup failures
  - scheduled-prompt creation/update failures
  - webhook buy failures in downstream child runs
- Strategy state transitions:
  - idle -> rotator-scan at the scheduled hour
  - rotator-scan -> watchers-armed when active assets resolve
  - watchers-armed -> webhook-triggered when Struct fires a child watcher
  - webhook-triggered -> bought when all guards pass and trade succeeds
  - webhook-triggered -> skipped when guards fail or market is already claimed

## Setup

1. Install workflow artifact: `workflows/tradfi-sniper/references/tradfi-sniper@latest.ts`.
2. Create scheduled recipe from `workflows/tradfi-sniper/references/tradfi-sniper-rotator.recipe.json`.
3. Use agent `predictions`.
4. Schedule with cron `0 13-20 * * 1-5` in UTC.
5. Confirm `dryRun` and `notionalUsd` match the intended risk level before enabling live webhook buys.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: TradFi Sniper Rotator
- Execute with agent: predictions
- Schedule: 0 13-20 * * 1-5
- Timezone: UTC
- Task: Run workflow tradfi-sniper in rotator mode to arm or refresh Struct close_to_bond watchers for configured TradFi daily Up/Down markets.
- Amount/rules: notionalUsd=10, minProbability=0.65, maxProbability=0.99, minNoProbability=0.65, maxNoProbability=0.99, activeWindowMinutes=0, minPriceDeltaPct=0, watcherTtlMinutes=1440, dryRun=false.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- `security.permissions`: read-market-data, manage-scheduled-prompts, place-prediction-trade, write-run-artifacts, write-local-state-file.
- Live webhook mode is enabled by default in the imported payload. Set `dryRun: true` for setup tests.
- Repeated rotator runs update the same managed child hooks instead of creating unmanaged duplicates.

## Evidence

- Workflow artifact: `workflows/tradfi-sniper/references/tradfi-sniper@latest.ts`
- Rotator payload: `workflows/tradfi-sniper/references/tradfi-sniper-rotator.recipe.json`
- Source schedule: `0 13-20 * * 1-5` UTC

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Strategy](../../strategies/trading/strategy-tradfi-sniper.md)
- [Awesome Gina Index](../../README.md)
