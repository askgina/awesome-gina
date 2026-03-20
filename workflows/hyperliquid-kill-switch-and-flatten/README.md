---
id: hyperliquid-kill-switch-and-flatten
slug: hyperliquid-kill-switch-and-flatten
name: Hyperliquid Kill Switch and Flatten Workflow
type: workflow
summary: Cancel open orders and flatten allowed Hyperliquid positions under an operator-controlled emergency policy.
category: workflows/trading
status: experimental
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
    - read-account
    - read-position
    - read-open-orders
    - cancel-order
    - place-order
    - read/write-kv
evidence:
  setup: workflows/hyperliquid-kill-switch-and-flatten/README.md#setup
  example: null
tags: [workflows, trading, hyperliquid, kill-switch, flatten, emergency]
---

# Hyperliquid Kill Switch and Flatten Workflow

Workflow submission with artifact at `workflows/hyperliquid-kill-switch-and-flatten/references/hyperliquid-kill-switch-and-flatten@latest.ts`.

## What it does

- Reads account, open-order, and live-position state for the configured universe.
- Builds an emergency flatten plan that cancels open orders first, then exits allowed positions.
- Supports explicit operator acknowledgement plus dry-run mode before any live flattening is performed.
- Persists the emergency action snapshot so repeated kill-switch triggers remain auditable.

## Capability contract

- Trigger: Manual run only for normal operations; schedule use should be reserved for a separately governed emergency path.
- Inputs:
  - `coinUniverse` (string; optional comma-separated allowlist)
  - `flattenAll` (boolean, default `false`)
  - `operatorAck` (string; required for live execution)
  - `dryRun` (boolean, default `true`)
- Outputs:
  - current order and position inventory for the selected scope
  - flatten plan listing cancellations and exit actions by symbol
  - execution summary for canceled orders, closed positions, and residual exposure
- Side effects:
  - reads Hyperliquid account, positions, and open orders
  - may cancel all open orders in scope
  - may place offsetting exit orders to flatten positions when `dryRun=false` and acknowledgement is present
  - writes kill-switch state for auditability and repeated-run suppression
- Failure modes:
  - missing or invalid operator acknowledgement blocks live execution
  - partial closes leave residual exposure after flatten attempt
  - manual operator activity races with emergency cancellation and close logic
  - universe scoping errors flatten less or more than intended

## Workflow steps

1. `fetch_emergency_state`: load positions and open orders in scope.
2. `build_flatten_plan`: derive the cancellation and flatten sequence, enforcing acknowledgement policy.
3. `execute_flatten`: cancel orders and flatten positions unless `dryRun=true`.
4. `persist_kill_switch_state`: record the emergency action summary.

## Setup

1. Keep artifact at `workflows/hyperliquid-kill-switch-and-flatten/references/hyperliquid-kill-switch-and-flatten@latest.ts`.
2. Install it as `/workspace/.harness/workflows/hyperliquid-kill-switch-and-flatten@latest.ts`.
3. Validate with `workflow validate hyperliquid-kill-switch-and-flatten`.
4. Start with `{"dryRun":true,"flattenAll":false,"coinUniverse":"BTC,ETH"}`.
5. Require a non-empty `operatorAck` string before any live run.

## Security and permissions

- This is an emergency workflow and should be treated as such.
- Keep it manual by default and gate live use behind explicit acknowledgement and access controls.
- Audit every live invocation and verify scope before flattening.

## Evidence

- `evidence.setup`: `workflows/hyperliquid-kill-switch-and-flatten/README.md#setup`
- `evidence.example`: null
- Workflow artifact: `workflows/hyperliquid-kill-switch-and-flatten/references/hyperliquid-kill-switch-and-flatten@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
