---
id: recipe-btc-hourly-force-sell
slug: recipe-btc-hourly-force-sell
name: BTC Hourly Force Sell
type: recipe
summary: Force-sell BTC hourly position at minute 59 and clear state after confirmed terminal action.
category: recipes/predictions
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
    - close-prediction-position
    - write-run-artifacts
    - write-local-state-file
evidence:
  setup: recipes/predictions/recipe-btc-hourly-force-sell.md#setup
  example: recipes/predictions/recipe-btc-hourly-force-sell.md#evidence
tags: [btc, hourly, sell, recipe, predictions]
---

# BTC Hourly Force Sell

Scheduled recipe that runs `btc-hourly-sell` at minute `:59` to close residual hourly exposure.

## What it does

- Runs once per hour at `:59` UTC.
- Reads state and force-sells matching BTC hourly position if present.
- Clears state file only when sell/stop/no-position path is confirmed.

## Capability contract

- Trigger: cron `59 * * * *`.
- Inputs: none.
- Outputs:
  - sell action summary and retry metadata
  - cleanup status (`fileDeleted` true/false)
- Side effects:
  - sends aggressive sell orders when position exists
  - truncates local state file when safe to do so
  - writes run artifacts
- Failure modes:
  - missing/legacy state file data
  - no market/position mapping for side + condition
  - sell failures that preserve state for next retry
- Strategy state transitions:
  - idle -> state-check at minute :59
  - state-check -> liquidation when open position exists
  - liquidation -> complete on confirmed sell
  - state-check -> complete when no position exists
  - liquidation -> retry-pending when sell is not confirmed

## Setup

1. Install workflow artifact: `workflows/btc-hourly-sell/references/btc-hourly-sell@latest.ts`.
2. Create scheduled recipe at `59 * * * *` in UTC.
3. Keep stop-loss recipe scheduled earlier at `45-58 * * * *`.
4. Verify state file cleanup happens only after confirmed terminal actions.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: BTC Hourly Force Sell
- Execute with agent: predictions
- Schedule: 59 * * * *
- Timezone: UTC
- Task: Run workflow btc-hourly-sell at minute :59 to force-close remaining BTC hourly position and clean state only on confirmed terminal action.
- Amount/rules: No input overrides; preserve state on failed sell for retry.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- `security.permissions`: read-market-data, read-position, close-prediction-position, write-run-artifacts, write-local-state-file.

## Evidence

- Workflow artifact: `workflows/btc-hourly-sell/references/btc-hourly-sell@latest.ts`
- Trigger time: `59 * * * *` UTC
- Companion workflow recipe: `recipes/predictions/recipe-btc-hourly-sl.md`

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
