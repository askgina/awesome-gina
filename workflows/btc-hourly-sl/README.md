---
id: btc-hourly-sl
slug: btc-hourly-sl
name: BTC Hourly Stop-Loss Workflow
type: workflow
summary: Run BTC hourly entry and stop-loss logic from minutes 45-58 each hour.
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
    - place-prediction-trade
    - close-prediction-position
    - write-local-state-file
evidence:
  setup: workflows/btc-hourly-sl/README.md#setup
  example: workflows/btc-hourly-sl/README.md#evidence
tags: [workflows, trading, btc, hourly, stop-loss]
---

# BTC Hourly Stop-Loss Workflow

Workflow submission with artifact at `workflows/btc-hourly-sl/references/btc-hourly-sl@latest.ts`.

## What it does

- Checks current BTC hourly market probabilities.
- Enters when exactly one side is in configured entry band.
- Monitors open state and exits when held-side probability drops below stop-loss threshold.
- Persists state in `/workspace/scratch/btc_hourly` for cross-run continuity.

## Capability contract

- Trigger: Recurring schedule `45-58 * * * *` (UTC).
- Inputs:
  - `stakeUsd` (number)
  - `entryMinProb` (number)
  - `entryMaxProb` (number)
  - `slProbThreshold` (number)
- Outputs:
  - action decision (`ENTRY`, `HOLD`, `SL_EXIT`, `STOP`, `CLOSE_FILE`)
  - trade attempts and retry metadata
  - updated state-file line when state changes
- Side effects:
  - places buy/sell prediction trades
  - reads positions for share reconciliation
  - writes `/workspace/scratch/btc_hourly`
- Failure modes:
  - market lookup failure for current BTC hourly market
  - trade placement errors (FOK, balance, allowance)
  - state-file parse or write failures
  - no matching position during stop-loss exit

## Workflow steps

1. `check_state`: load and parse state file.
2. `fetch_market`: fetch active BTC hourly market and outcome prices.
3. `evaluate_action`: choose entry/hold/exit behavior from market + state.
4. `execute_trade`: place trade for entry or stop-loss path.
5. `update_file`: persist open/closed state transitions.

## Setup

1. Keep artifact at `workflows/btc-hourly-sl/references/btc-hourly-sl@latest.ts`.
2. Install as `/workspace/.harness/workflows/btc-hourly-sl@latest.ts`.
3. Configure schedule at `45-58 * * * *` in UTC.
4. Run with production-style inputs:
   - `{"stakeUsd":100,"entryMinProb":0.8,"entryMaxProb":0.93,"slProbThreshold":0.72}`
5. Confirm logs include deterministic action output per run.

## Security and permissions

- Requires market/position reads and real order execution rights.
- Uses force-execution market orders; apply strict account risk limits.
- Writes local state file under `/workspace/scratch/`.

## Evidence

- Source artifact: `workflows/btc-hourly-sl/references/btc-hourly-sl@latest.ts`
- Live schedule target: `45-58 * * * *` (UTC)
- Companion force-sell workflow: `workflows/btc-hourly-sell/references/btc-hourly-sell@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
