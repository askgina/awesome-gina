---
id: strategy-weather-bond-rotator
slug: weather-bond-rotator
name: Weather Bond Rotator Strategy
type: strategy
summary: Rotate exact Polymarket weather-market watchers and gate close-to-bond order intents behind proof and dry-run controls.
category: strategies/trading
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
    - read-market-data
    - manage-struct-watchers
    - read-orderbook
    - write-run-artifacts
    - write-agentfs-state
    - place-prediction-trade
relationships:
  recipeIds:
    - recipe-weather-bond-rotator
  workflowIds:
    - weather-bond-rotator
evidence:
  setup: strategies/trading/strategy-weather-bond-rotator.md#setup
  example: workflows/weather-bond-rotator/README.md#evidence
tags: [strategy, weather, polymarket, close-to-bond, dry-run]
---

# Weather Bond Rotator Strategy

Weather Bond Rotator is a conservative Polymarket weather-market strategy for observing close-to-bond opportunities across exact daily city weather series. It keeps broad keyword search out of the trading path, rotates Struct watchers over an explicit series registry, and treats live order submission as an opt-in path after identity, orderbook, idempotency, and exposure gates pass.

## Bundle map

- `recipe-weather-bond-rotator` ([file](../../recipes/predictions/recipe-weather-bond-rotator.md))
- `weather-bond-rotator` ([workflow](../../workflows/weather-bond-rotator/README.md))

## Capability contract

- Trigger:
  - scheduled rotator runs that refresh allowed weather-series watchers
  - Struct `close_to_bond` webhook callbacks for managed candidates
- Inputs:
  - exact Gamma weather series registry and enabled series flags
  - probability bands for YES/NO near-bond candidates
  - orderbook freshness, spread, slippage, and notional caps
  - `dryRun` control, defaulting to `true`
- Outputs:
  - selected event and candidate inventory per series
  - watcher mutation summary and stale-watcher cleanup results
  - replayable live-corpus proof for webhook callbacks
  - dry-run, blocked, or ready-to-trade order-intent records
- Side effects:
  - creates, updates, and deletes managed Struct watchers
  - reads Polymarket Gamma and CLOB/orderbook data
  - writes AgentFS state tables and run artifacts
  - may submit a prediction-market order only when explicitly armed with `dryRun: false` and all readiness gates pass
- Failure modes:
  - no active event for an enabled series
  - stale or missing orderbook proof
  - callback payload does not match the allowed exact candidate
  - spread, slippage, or exposure cap blocks execution
  - provider timeout or schema drift in Gamma, Struct, or CLOB responses
- Strategy state transitions:
  - idle -> rotator-discovery on scheduled runs
  - rotator-discovery -> watcher-managed after exact series/event candidates are selected
  - watcher-managed -> webhook-proof when Struct reports a close-to-bond candidate
  - webhook-proof -> dry-run-intent when `dryRun` is true
  - webhook-proof -> blocked when identity, orderbook, or exposure gates fail
  - webhook-proof -> ready-to-trade only when explicitly armed and all gates pass

## Setup

1. Install the workflow artifact at `workflows/weather-bond-rotator/references/weather-bond-rotator@latest.ts`.
2. Create the companion recipe from `recipes/predictions/recipe-weather-bond-rotator.md`.
3. Start with `dryRun: true`, `notionalUsd: 5`, and the default enabled primary daily weather series.
4. Review `/workspace/outputs/weather_bond_state.json` and `/workspace/outputs/weather_bond_live_corpus.json` after rotator and webhook runs.
5. Do not promote to live-money execution until the operator has reviewed dry-run proof, orderbook freshness, exposure controls, and account limits.

## Security and permissions

- Requires market-data reads, Struct watcher management, orderbook reads, AgentFS state writes, and run-artifact writes.
- The workflow artifact includes a trade-capable path, but the default recipe keeps `dryRun: true`.
- Production live trading should remain blocked unless explicitly authorized outside this unverified submission.
- Do not persist Privy tokens, auth headers, private keys, raw webhook secrets, or raw secret-bearing provider logs.

## Evidence

- Workflow artifact: `workflows/weather-bond-rotator/references/weather-bond-rotator@latest.ts`
- Workflow documentation: `workflows/weather-bond-rotator/README.md`
- Recipe wrapper: `recipes/predictions/recipe-weather-bond-rotator.md`
- Submission status: unverified; local source tests in the originating Gina app covered dry-run gates, AgentFS state tables, and replay corpus paths before this Awesome Gina submission was prepared.

## Backlinks

- [Category](../../docs/categories/strategies.md)
- [Awesome Gina Index](../../README.md)
