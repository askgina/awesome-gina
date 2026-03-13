---
id: recipe-daily-btc-stop-loss
slug: recipe-daily-btc-stop-loss
name: Daily BTC Stop Loss
type: recipe
summary: Stop-loss sell for BTC Daily market positions valued at $70 or below, checked hourly between 2-5 PM Europe/London.
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
    - read-market-data
    - write-run-artifacts
evidence:
  setup: recipes/predictions/recipe-daily-btc-stop-loss.md#setup
  example: recipes/predictions/recipe-daily-btc-stop-loss.md#evidence
tags: [btc, daily, stop-loss, sell, operations]
relationships:
  strategyIds:
    - strategy-daily-btc-markets
---

# Daily BTC Stop Loss

Checks BTC Daily market positions and aggressively sells when value drops to $70 or below.

## What it does

- Checks prediction market positions for the current BTC Daily market at :30 past each hour between 2:00 PM and 4:59 PM Europe/London.
- Sells the entire position immediately with aggressive fill if the position value is $70 or below.
- Skips execution when position value is above the threshold.

## Capability contract

- Trigger: cron 30 14-16 * * * (Europe/London).
- Inputs:
  - market: BTC Daily market (current series)
  - stopLossThresholdUsd: 70
  - fillMode: aggressive
- Outputs:
  - sell execution receipt when position value is at or below threshold
  - skip reason when position value is above threshold
- Side effects:
  - submits aggressive sell order for full position
  - writes run/execution logs
- Failure modes:
  - position data unavailable or stale
  - order rejection or insufficient liquidity
  - position value between checks drops below zero recovery
- Strategy state transitions:
  - idle -> position-check at trigger time
  - position-check -> selling when value <= $70
  - position-check -> skipped when value > $70
  - selling -> exited on accepted order
  - selling -> failed on order rejection

## Setup

1. Configure the recipe scheduler for minute 30 of hours 14-16 Europe/London daily.
2. Bind the BTC Daily market position source used by your Gina environment.
3. Set the stop-loss threshold to $70.
4. Ensure the companion BTC Daily Buy recipe is active so this recipe has positions to monitor.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: Daily BTC Stop Loss
- Execute with agent: predictions
- Schedule: 30 14-16 * * *
- Timezone: Europe/London
- Task: Check my prediction market positions for the current BTC Daily market. See if the value of my position is $70 or below. If so, sell all of it immediately. Aggressive fill.
- Amount/rules: Sell entire position when value <= $70; aggressive fill; skip and log when above threshold.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-position, place-order, read-market-data, write-run-artifacts.

## Evidence

- Source notes: gina-recipes.md (user-provided notes).
- Max runs configured: 500.
- Created date from notes: February 2026.
- Companion recipe: recipe-btc-daily-buy-75-95.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
