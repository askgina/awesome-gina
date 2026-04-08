---
id: btc-hourly-sell
slug: btc-hourly-sell
name: BTC Hourly Force Sell Workflow
type: workflow
summary: Force-close BTC hourly positions at minute 59 and clear state on confirmed exit.
category: workflows/trading
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
    - write-local-state-file
evidence:
  setup: workflows/btc-hourly-sell/README.md#setup
  example: workflows/btc-hourly-sell/README.md#evidence
tags: [workflows, trading, btc, hourly, sell]
---

# BTC Hourly Force Sell Workflow

Workflow submission with artifact at `workflows/btc-hourly-sell/references/btc-hourly-sell@latest.ts`.

## What it does

- Reads BTC hourly state from `/workspace/outputs/btc_hourly`.
- Resolves held side and `conditionId` from the state file.
- Force-sells matching position shares near expiry with retries.
- Clears state file only after confirmed sell/stop/no-position outcomes.

## Capability contract

- Trigger: Recurring schedule `59 * * * *` (UTC).
- Inputs: none.
- Outputs:
  - sell decision (`SELL`, `STOP`, `NO_POSITION`)
  - sell attempt metadata and errors
  - cleanup result (`fileDeleted` true/false)
- Side effects:
  - places aggressive sell orders
  - reads current positions for share size
  - truncates `/workspace/outputs/btc_hourly` on successful cleanup path
- Failure modes:
  - missing or malformed state file
  - no active BTC hourly market in lookup step
  - trade placement errors across retries
  - cleanup skipped when sell was not confirmed

## Workflow steps

1. `check_and_fetch`: read state and gather side/condition data.
2. `force_sell`: find matching position and execute sell with retries.
3. `delete_file`: clear state file only on safe terminal outcomes.

## Setup

1. Keep artifact at `workflows/btc-hourly-sell/references/btc-hourly-sell@latest.ts`.
2. Install as `/workspace/.harness/workflows/btc-hourly-sell@latest.ts`.
3. Configure schedule at `59 * * * *` in UTC.
4. Confirm it runs after stop-loss workflow (`45-58 * * * *`).

## Security and permissions

- Executes real sell orders using aggressive market behavior.
- Should run only with explicit liquidation policy and account controls.
- State file is preserved when sell fails to support retry/reconciliation.

## Evidence

- Source artifact: `workflows/btc-hourly-sell/references/btc-hourly-sell@latest.ts`
- Live schedule target: `59 * * * *` (UTC)
- Companion stop-loss workflow: `workflows/btc-hourly-sl/references/btc-hourly-sl@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
