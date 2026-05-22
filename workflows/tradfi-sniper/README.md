---
id: tradfi-sniper
slug: tradfi-sniper
name: TradFi Sniper Workflow
type: workflow
summary: Rotate Struct close_to_bond hooks for configured TradFi Up/Down markets and buy qualifying prediction outcomes.
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
    - read-market-data
    - manage-scheduled-prompts
    - place-prediction-trade
    - write-local-state-file
evidence:
  setup: workflows/tradfi-sniper/README.md#setup
  example: workflows/tradfi-sniper/README.md#evidence
tags: [workflows, trading, predictions, polymarket, struct, tradfi]
relationships:
  strategyIds:
    - strategy-tradfi-sniper
---

# TradFi Sniper Workflow

Workflow submission with artifact at `workflows/tradfi-sniper/references/tradfi-sniper@latest.ts`.

## What it does

- Scans the built-in TradFi daily Up/Down asset universe by deterministic Polymarket series ID.
- Creates or updates per-asset/per-side Struct `close_to_bond` conditional watchers.
- Runs webhook mode only when Struct sends a matching `close_to_bond` payload.
- Validates condition id, expected side, probability band, optional price delta, and one-trade-per-market state before buying.
- Persists market claims in `/workspace/outputs/tradfi_sniper_trades.json` so the opposite side cannot buy the same market later.

## Capability contract

- Trigger: manual workflow run, scheduled rotator, or Struct webhook payload.
- Inputs:
  - `mode`: `rotator` for scheduled setup runs; webhook mode is inferred from `trigger.payload`.
  - `assetSymbols`: optional comma-separated subset; blank scans all configured assets.
  - `activeWindowMinutes`: final-window gate; `0` arms all currently active daily markets.
  - `minProbability` and `maxProbability`: Up probability band, default `0.65-0.99`.
  - `minNoProbability` and `maxNoProbability`: Down probability band, default `0.65-0.99`.
  - `minPriceDeltaPct`: optional underlying price-distance gate; `0` disables it.
  - `notionalUsd`: prediction-market buy amount per fired hook.
  - `watcherTtlMinutes`: Struct watcher lifetime, capped by market end time.
  - `dryRun`: validate without calling `tradePredictionMarket`.
- Outputs:
  - rotator status, asset count, refreshed watcher count, skipped assets
  - webhook buy, dry-run, skip, or failure status
  - condition id, market slug, event slug, outcome, probability, and trade summary when present
- Side effects:
  - creates or updates scheduled Struct watcher prompts
  - deletes stale managed prompts only when replacement scope is known
  - may submit real prediction-market buy orders
  - writes `/workspace/outputs/tradfi_sniper_trades.json`
- Failure modes:
  - no selected assets or no active asset window
  - market identity resolution failure
  - malformed or mismatched Struct webhook payload
  - probability or side outside configured guardrails
  - missing price source when a positive price-delta gate is enabled
  - order rejection, insufficient balance, or trade-tool failure

## Workflow steps

1. `rotator`: resolve active configured TradFi daily markets.
2. `rotator`: build Up and Down condition-scoped watcher targets for each eligible market.
3. `rotator`: create or update managed Struct `close_to_bond` watchers with `maxExecutions: 1`.
4. `webhook`: parse Struct payload and reject mismatched event type, condition id, side, or probability.
5. `webhook`: enforce optional price-delta and one-trade-per-market guards.
6. `webhook`: call `tradePredictionMarket` unless `dryRun` is true.

## Asset universe

Leaving `assetSymbols` blank scans these configured daily series:

| Symbol | Asset | Series ID |
| --- | --- | --- |
| SPY | SPY | 11303 |
| WTI | WTI Crude Oil | 11309 |
| SPX | S&P 500 | 10383 |
| NIK | Nikkei 225 | 10382 |
| XAUUSD | Gold | 11307 |
| NVDA | NVIDIA | 10374 |
| ABNB | Airbnb | 10394 |
| AMZN | Amazon | 10378 |
| NFLX | Netflix | 10390 |
| XAGUSD | Silver | 11308 |
| AAPL | Apple | 10380 |
| GOOGL | Google | 10377 |
| EWY | EWY | 11304 |
| MSFT | Microsoft | 10379 |
| TSLA | Tesla | 10375 |
| NG | Natural Gas | 11311 |
| PLTR | Palantir | 10391 |
| HOOD | Robinhood | 10944 |

## Setup

1. Keep artifact at `workflows/tradfi-sniper/references/tradfi-sniper@latest.ts`.
2. Use `workflows/tradfi-sniper/references/tradfi-sniper-rotator.recipe.json` as the rotator recipe payload.
3. Schedule the rotator with cron `0 13-20 * * 1-5` in UTC.
4. Execute with agent `predictions`.
5. Start with `dryRun: true` or a small `assetSymbols` subset when validating watcher creation.
6. Keep `minPriceDeltaPct: 0` unless a reliable underlying price source is available for every selected asset.

## Security and permissions

- Requires market data reads, scheduled-prompt management, local state writes, and real prediction order execution.
- Each child watcher is condition-scoped by market condition id, event slug, outcome label, outcome index, and probability band.
- The one-trade guard is fail-closed: once a condition id is claimed, the opposite side is blocked even if the first trade later fails.
- SPX and NIK currently need a separate equity price source before they can pass a positive `minPriceDeltaPct` gate.

## Evidence

- Source artifact: `workflows/tradfi-sniper/references/tradfi-sniper@latest.ts`
- Rotator recipe payload: `workflows/tradfi-sniper/references/tradfi-sniper-rotator.recipe.json`
- Trade claim state: `/workspace/outputs/tradfi_sniper_trades.json`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Strategy](../../strategies/trading/strategy-tradfi-sniper.md)
- [Awesome Gina Index](../../README.md)
