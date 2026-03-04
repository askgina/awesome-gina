---
id: recipe-btc-hourly-sl
name: BTC Hourly SL
type: recipe
summary: Run BTC hourly entry and stop-loss checks from minutes 45 through 58 each hour.
category: recipes/hourly-ops
status: active
owner: askgina
repo: https://github.com/askgina/awesome-gina
license: NOASSERTION
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
evidence:
  setup: recipes/hourly-ops/recipe-btc-hourly-sl.md#setup
  example: recipes/hourly-ops/recipe-btc-hourly-sl.md#evidence
tags: [btc, hourly, stop-loss, recipe, predictions]
---

# BTC Hourly SL

Scheduled recipe that runs the `btc-hourly-sl` workflow before expiry to manage entry/hold/stop-loss behavior.

## What it does

- Runs every minute from `:45` through `:58` each hour.
- Uses probability-band entry rules and stop-loss exit logic.
- Persists state to support deterministic follow-up by the force-sell recipe.

## Capability contract

- Trigger: cron `45-58 * * * *`.
- Inputs:
  - `stakeUsd`: 100
  - `entryMinProb`: 0.8
  - `entryMaxProb`: 0.93
  - `slProbThreshold`: 0.72
- Outputs:
  - per-run decision/action summary from workflow
  - entry/exit attempt metadata
  - updated state-file status
- Side effects:
  - may place buy and sell prediction orders
  - writes execution logs and state file
- Failure modes:
  - no valid market or no entry candidate
  - retry exhaustion on order placement
  - position mismatch or missing shares on SL exit
- Strategy state transitions:
  - idle -> entry-check at trigger minute
  - entry-check -> open-position when one side is in range
  - open-position -> hold when held probability stays above threshold
  - open-position -> stop-loss-exit when held probability drops below threshold
  - stop-loss-exit -> closed after confirmed trade and state update

## Setup

1. Install workflow artifact: `workflows/btc-hourly-sl/references/btc-hourly-sl@latest.ts`.
2. Create scheduled recipe at `45-58 * * * *` in UTC.
3. Pass inputs:
   - `{"stakeUsd":100,"entryMinProb":0.8,"entryMaxProb":0.93,"slProbThreshold":0.72}`
4. Confirm companion force-sell recipe is scheduled at `59 * * * *`.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: BTC Hourly SL
- Execute with agent: predictions
- Schedule: 45-58 * * * *
- Timezone: UTC
- Task: Run workflow btc-hourly-sl each minute from :45 to :58 with fixed risk inputs.
- Amount/rules: stakeUsd=100, entryMinProb=0.8, entryMaxProb=0.93, slProbThreshold=0.72.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- `security.permissions`: read-market-data, read-position, place-prediction-trade, close-prediction-position, write-run-artifacts, write-local-state-file.

## Evidence

- Workflow artifact: `workflows/btc-hourly-sl/references/btc-hourly-sl@latest.ts`
- Trigger window: `45-58 * * * *` UTC
- Companion workflow recipe: `recipes/hourly-ops/recipe-btc-hourly-force-sell.md`

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
