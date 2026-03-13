---
id: recipe-hourly-sell-all-positions
slug: recipe-hourly-sell-all-positions
name: Hourly Sell All Positions
type: recipe
summary: Aggressively sell all open positions and redeem expired positions at minute 58 each hour.
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
    - read-position
    - place-order
    - redeem-position
    - write-run-artifacts
evidence:
  setup: recipes/predictions/recipe-hourly-sell-all-positions.md#setup
  example: recipes/predictions/recipe-hourly-sell-all-positions.md#evidence
tags: [hourly, exit, sell-all, redeem, operations]
relationships:
  strategyIds:
    - strategy-hourly-crypto-markets
---

# Hourly Sell All Positions

Executes an aggressive all-position unwind near the top of each hour.

## What it does

- At minute 58 each hour, sells all remaining open positions.
- Redeems all expired positions in the same run.
- Runs without confirmation prompts.

## Capability contract

- Trigger: cron 58 * * * *.
- Inputs:
  - positionSource: all open and expired positions
  - confirmationRequired: false
  - orderStyle: aggressive
- Outputs:
  - sell and redemption execution summary
  - residual position count after attempt
- Side effects:
  - submits marketable sell orders across held positions
  - redeems all redeemable/expired holdings
  - writes run/execution logs
- Failure modes:
  - partial fills before hour rollover
  - redemption API/tool transient failure
  - one or more sell orders rejected
- Strategy state transitions:
  - idle -> inventory-scan at trigger minute
  - inventory-scan -> liquidation when open positions exist
  - liquidation -> redeeming when expired positions exist
  - redeeming -> complete when no positions remain
  - liquidation -> partial-complete when residual positions remain

## Setup

1. Configure the scheduler for minute 58 each hour.
2. Ensure this recipe can enumerate all open and expired positions.
3. Confirm aggressive sell behavior is acceptable for your risk profile.
4. Keep post-run logs enabled for residual inventory checks.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: Hourly Sell All Positions
- Execute with agent: predictions
- Schedule: 58 * * * *
- Timezone: UTC (or my scheduler default)
- Task: Sell all open positions aggressively and redeem expired positions each run.
- Amount/rules: No confirmation prompt; log residual positions and partial fills.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-position, place-order, redeem-position, write-run-artifacts.

## Evidence

- Source notes: gina-recipes.md (user-provided notes).
- Run count observed in notes: 687.
- Created date from notes: January 20, 2026.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
