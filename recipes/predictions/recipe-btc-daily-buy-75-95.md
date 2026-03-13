---
id: recipe-btc-daily-buy-75-95
slug: recipe-btc-daily-buy-75-95
name: BTC Daily Buy (75-95 Odds)
type: recipe
summary: Buy BTC daily Up/Down winner at 75-95% odds with aggressive fill and hand off to exit automations.
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
    - place-order
    - read-position
    - write-run-artifacts
evidence:
  setup: recipes/predictions/recipe-btc-daily-buy-75-95.md#setup
  example: recipes/predictions/recipe-btc-daily-buy-75-95.md#evidence
tags: [btc, daily, momentum, buy, odds-band]
relationships:
  strategyIds:
    - strategy-daily-btc-markets
---

# BTC Daily Buy (75-95 Odds)

Buys the high-probability BTC daily side once per day using aggressive fills.

## What it does

- Evaluates BTC Daily Up/Down market (series 41) once per day at 4:39 PM UTC.
- Buys the side in the 75-95% band with a fixed 500 USD notional.
- Skips execution when neither side qualifies.

## Capability contract

- Trigger: cron 39 16 * * *.
- Inputs:
  - market: BTC daily Up/Down market (series 41)
  - targetOddsBand: 75-95%
  - betSizeUsd: 500
  - fillMode: aggressive
- Outputs:
  - placed order receipt when a qualifying side exists
  - skip reason when no side is in range
- Side effects:
  - submits buy order on qualifying side
  - writes run/execution logs
- Failure modes:
  - neither side in 75-95% band
  - stale odds at evaluation time
  - order rejection or insufficient balance
- Strategy state transitions:
  - idle -> evaluating at trigger time
  - evaluating -> buying when one side is in target band
  - evaluating -> skipped when no side qualifies
  - buying -> open-position on accepted order
  - open-position -> exited by downstream exit recipes

## Setup

1. Configure the recipe scheduler for 4:39 PM UTC daily.
2. Bind the BTC daily Up/Down market source (series 41) used by your Gina environment.
3. Set target odds band to 75-95 and bet size to 500 USD.
4. Set fill mode to aggressive.
5. Ensure exit recipes are enabled if you expect automated position close-out.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: BTC Daily Buy (75-95 Odds)
- Execute with agent: predictions
- Schedule: 39 16 * * *
- Timezone: UTC
- Task: Get me the current BTC (Bitcoin) Daily up/down market (series 41). See which of the 2 outcomes has >75% chance and under 95% chance. Bet $500 on that outcome. Aggressive Fill. If none of the 2 sides have this set up, don't trade.
- Amount/rules: Bet size 500 USD; aggressive fill; skip and log when neither side qualifies.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-market-data, place-order, read-position, write-run-artifacts.

## Evidence

- Source notes: gina-recipes.md (user-provided notes).
- Max runs configured: 500.
- Created date from notes: February 2026.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
