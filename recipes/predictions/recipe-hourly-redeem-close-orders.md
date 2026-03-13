---
id: recipe-hourly-redeem-close-orders
slug: recipe-hourly-redeem-close-orders
name: Hourly Redeem and Close Orders
type: recipe
summary: Redeem all redeemable positions, sell leftovers, and cancel open limit orders at minute 30 hourly.
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
    - redeem-position
    - place-order
    - cancel-order
    - write-run-artifacts
evidence:
  setup: recipes/predictions/recipe-hourly-redeem-close-orders.md#setup
  example: recipes/predictions/recipe-hourly-redeem-close-orders.md#evidence
tags: [hourly, redeem, close, cancel-orders, operations]
relationships:
  strategyIds:
    - strategy-hourly-crypto-markets
---

# Hourly Redeem and Close Orders

Performs a cleanup pass every hour to normalize exposure and clear stale orders.

## What it does

- Redeems all redeemable positions at minute 30 each hour.
- Sells remaining shares after redemption.
- Cancels all open limit orders with no confirmation prompt.

## Capability contract

- Trigger: cron 30 * * * *.
- Inputs:
  - positionSource: redeemable and open positions
  - orderSource: all open limit orders
  - confirmationRequired: false
- Outputs:
  - redemption summary
  - sell execution summary
  - canceled-order count
- Side effects:
  - redeems all redeemable positions
  - submits sell orders for remaining shares
  - cancels open limit orders
  - writes run/execution logs
- Failure modes:
  - redeem call succeeds but sell call partially fails
  - cancel-order API timeout
  - stale order book causing leftover orders
- Strategy state transitions:
  - idle -> redeeming at trigger minute
  - redeeming -> selling-remainders when shares remain
  - selling-remainders -> canceling-orders
  - canceling-orders -> complete when no open limits remain
  - any -> partial-complete when one cleanup stage fails

## Setup

1. Configure the scheduler for minute 30 each hour.
2. Ensure account scopes include redemption, sell, and order-cancel actions.
3. Enable no-confirmation mode only for trusted operator environments.
4. Review post-run logs for partial completion states.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: Hourly Redeem and Close Orders
- Execute with agent: predictions
- Schedule: 30 * * * *
- Timezone: UTC (or my scheduler default)
- Task: Redeem all redeemable positions, sell remaining shares, and cancel open limit orders.
- Amount/rules: No confirmation prompt; return redeemed, sold, canceled, and leftover counts.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-position, redeem-position, place-order, cancel-order, write-run-artifacts.

## Evidence

- Source notes: gina-recipes.md (user-provided notes).
- Run count observed in notes: 126.
- Created date from notes: February 13, 2026.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
