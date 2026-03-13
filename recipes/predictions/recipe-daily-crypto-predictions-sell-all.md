---
id: recipe-daily-crypto-predictions-sell-all
slug: recipe-daily-crypto-predictions-sell-all
name: Daily Crypto Predictions Sell All
type: recipe
summary: Aggressively sell all prediction positions and redeem expired positions daily at 4:58 PM UTC.
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
  setup: recipes/predictions/recipe-daily-crypto-predictions-sell-all.md#setup
  example: recipes/predictions/recipe-daily-crypto-predictions-sell-all.md#evidence
tags: [crypto, daily, sell-all, redeem, operations]
relationships:
  strategyIds:
    - strategy-daily-btc-markets
---

# Daily Crypto Predictions Sell All

Aggressively liquidates all prediction positions and redeems expired positions once per day.

## What it does

- At 4:58 PM UTC daily, sells all open prediction positions with aggressive fill.
- Prioritises execution speed over slippage tolerance.
- Redeems all expired positions in the same run.
- Runs without follow-up questions or confirmation prompts.

## Capability contract

- Trigger: cron 58 16 * * *.
- Inputs:
  - positionSource: all open prediction positions
  - confirmationRequired: false
  - orderStyle: aggressive
  - redeemExpired: true
- Outputs:
  - sell and redemption execution summary
  - residual position count after attempt
- Side effects:
  - submits aggressive sell orders across all held prediction positions
  - redeems all redeemable/expired holdings
  - writes run/execution logs
- Failure modes:
  - partial fills before market close
  - redemption API/tool transient failure
  - one or more sell orders rejected
  - high slippage on illiquid positions
- Strategy state transitions:
  - idle -> inventory-scan at trigger time
  - inventory-scan -> liquidation when open positions exist
  - liquidation -> redeeming when expired positions exist
  - redeeming -> complete when no positions remain
  - liquidation -> partial-complete when residual positions remain

## Setup

1. Configure the recipe scheduler for 4:58 PM UTC daily.
2. Ensure this recipe can enumerate all open and expired prediction positions.
3. Confirm aggressive sell behavior is acceptable for your risk profile.
4. Keep post-run logs enabled for residual inventory checks.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: Daily Crypto Predictions Sell All
- Execute with agent: predictions
- Schedule: 58 16 * * *
- Timezone: UTC
- Task: Sell all of my prediction positions. Aggressive fill. Even if slippage is high focus on executing now. JUST GET out of them. Don't ask follow up questions. Redeem all expired positions as well.
- Amount/rules: Sell all positions; aggressive fill; no confirmation prompts; redeem expired.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-position, place-order, redeem-position, write-run-artifacts.

## Evidence

- Source notes: gina-recipes.md (user-provided notes).
- Max runs configured: 500.
- Created date from notes: February 2026.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
