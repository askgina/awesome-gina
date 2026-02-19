---
id: recipe-btc-hourly-buy-75-95
name: BTC Hourly Buy (75-95 Odds)
type: recipe
summary: Buy BTC hourly Up/Down winner at 75-95% odds and hand off to hourly exit automations.
category: recipes/hourly-momentum
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
    - place-order
    - read-position
    - write-run-artifacts
evidence:
  setup: recipes/hourly-momentum/recipe-btc-hourly-buy-75-95.md#setup
  example: recipes/hourly-momentum/recipe-btc-hourly-buy-75-95.md#evidence
tags: [btc, hourly, momentum, buy, odds-band]
---

# BTC Hourly Buy (75-95 Odds)

Buys the high-probability BTC side twice per hour using aggressive fills.

## What it does

- Evaluates BTC Up/Down market odds at minute 45 and minute 52 each hour.
- Buys the side in the 75-95% band with a fixed 150 USD notional.
- Skips execution when neither side qualifies.

## Capability contract

- Trigger: cron 45,52 * * * *.
- Inputs:
  - market: BTC hourly Up/Down market
  - targetOddsBand: 75-95%
  - betSizeUsd: 150
  - fillMode: aggressive
- Outputs:
  - placed order receipt when a qualifying side exists
  - skip reason when no side is in range
- Side effects:
  - submits buy order(s) on qualifying side
  - writes run/execution logs
- Failure modes:
  - neither side in 75-95% band
  - stale odds at evaluation time
  - order rejection or insufficient balance
- Strategy state transitions:
  - idle -> evaluating at trigger minute
  - evaluating -> buying when one side is in target band
  - evaluating -> skipped when no side qualifies
  - buying -> open-position on accepted order
  - open-position -> exited by downstream hourly exit recipes

## Setup

1. Configure the recipe scheduler for minute 45 and minute 52 each hour.
2. Bind the BTC hourly Up/Down market source used by your Gina environment.
3. Set target odds band to 75-95 and bet size to 150 USD.
4. Ensure hourly exit recipes are enabled if you expect short holds.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: BTC Hourly Buy (75-95 Odds)
- Execute with agent: predictions
- Schedule: 45,52 * * * *
- Timezone: UTC (or my scheduler default)
- Task: Buy the BTC hourly Up/Down side in the 75-95% odds band.
- Amount/rules: Bet size 150 USD; skip and log when neither side qualifies.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-market-data, place-order, read-position, write-run-artifacts.

## Evidence

- Source notes: gina-recipes.md (user-provided notes).
- Run count observed in notes: 1018.
- Created date from notes: January 20, 2026.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
