---
id: recipe-xrp-hourly-buy-75-95
name: XRP Hourly Buy (75-95 Odds)
type: recipe
summary: Buy XRP hourly Up/Down winner at 75-95% odds and hand off to hourly exit automations.
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
  setup: recipes/hourly-momentum/recipe-xrp-hourly-buy-75-95.md#setup
  example: recipes/hourly-momentum/recipe-xrp-hourly-buy-75-95.md#evidence
tags: [xrp, hourly, momentum, buy, odds-band]
---

# XRP Hourly Buy (75-95 Odds)

Buys the high-probability XRP side twice per hour using aggressive fills.

## What it does

- Evaluates XRP Up/Down market odds at minute 42 and minute 47 each hour.
- Buys the side in the 75-95% band with a fixed 60 USD notional.
- Uses series 10123 context from source notes.

## Capability contract

- Trigger: cron 42,47 * * * *.
- Inputs:
  - market: XRP hourly Up/Down market (series 10123)
  - targetOddsBand: 75-95%
  - betSizeUsd: 60
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

1. Configure the recipe scheduler for minute 42 and minute 47 each hour.
2. Bind the XRP hourly Up/Down market source (series 10123 where applicable).
3. Set target odds band to 75-95 and bet size to 60 USD.
4. Ensure hourly exit recipes are enabled if you expect short holds.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: XRP Hourly Buy (75-95 Odds)
- Execute with agent: predictions
- Schedule: 42,47 * * * *
- Timezone: UTC (or my scheduler default)
- Task: Buy the XRP hourly Up/Down side in the 75-95% odds band.
- Amount/rules: Bet size 60 USD; series context 10123; skip and log when no side qualifies.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-market-data, place-order, read-position, write-run-artifacts.

## Evidence

- Source notes: gina-recipes.md (user-provided notes).
- Run count observed in notes: 365.
- Created date from notes: February 10, 2026.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
