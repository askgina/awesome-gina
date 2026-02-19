---
id: signal-trading-stoploss-v2
name: Signal Trading Stop-Loss v2 Workflow
type: workflow
summary: Attempt 15m BTC signal trades and monitor filled positions with stop-loss exits.
category: workflows/trading
status: experimental
owner: askgina
repo: https://github.com/askgina/awesome-gina
license: NOASSERTION
verification:
  tier: unverified
  lastVerifiedAt: null
security:
  permissions:
    - read-market-data
    - place-prediction-trade
    - close-prediction-position
evidence:
  setup: workflows/signal-trading-stoploss-v2/README.md#setup
  example: null
tags: [workflows, trading, stop-loss, btc, signal]
---

# Signal Trading Stop-Loss v2 Workflow

Workflow submission with a concrete artifact at workflows/signal-trading-stoploss-v2/references/signal-trading-stoploss-v2@latest.ts.

## What it does

- Pulls recent 1m candles and order book snapshots for the selected asset.
- Generates a directional signal (UP/DOWN/NONE) from VWAP, momentum, and order book imbalance.
- Places an aggressive prediction-market buy only when confidence passes threshold.
- If a bet is placed, monitors position price on an interval and executes stop-loss exits when threshold is breached.
- Emits a final run summary covering skipped, failed, held, or stop-loss-exit outcomes.

## Capability contract

- Trigger: Manual run; schedule-ready for recurring 15-minute signal checks.
- Inputs:
  - asset (default BTC)
  - amountUsd (default 6)
  - minConfidence (default 0.80)
  - slippageTolerance (default 0.10)
  - stopLossThreshold (default 0.50)
- Outputs:
  - candle + order book fetch results
  - generated signal and confidence
  - bet placement result and retry metadata
  - monitor step snapshots and final summary action
- Side effects:
  - sends buy orders to tradePredictionMarket
  - may send sell orders to exit on stop-loss
- Failure modes:
  - missing/empty market data from upstream tools
  - no active prediction market for selected timeframe
  - order placement failures after retry limits
  - monitored market disappearing before exit

## Workflow steps

1. fetch_candles: load recent 1m candles.
2. fetch_orderbook: fetch bid/ask depth and midpoint.
3. generate_signal: compute signal and confidence from VWAP, momentum, and imbalance.
4. get_market: resolve active 15m prediction market and prices.
5. place_bet: place aggressive buy with retries when confidence threshold is met.
6. monitor_*: repeatedly poll market outcome price and trigger stop-loss exit when needed.
7. summary: emit a consolidated final run result.

## Setup

1. Use workflows/signal-trading-stoploss-v2/references/signal-trading-stoploss-v2@latest.ts as the source artifact.
2. Validate with workflow validate signal-trading-stoploss-v2.
3. Execute with workflow run signal-trading-stoploss-v2.
4. Start with minimal amountUsd and confirm stop-loss behavior before larger sizes.
5. Review final summary action and monitor-step outputs after each run.

## Security and permissions

- security.permissions: read-market-data, place-prediction-trade, close-prediction-position.
- This workflow can place and close real market positions; run only with explicit risk limits and preconfigured account controls.

## Evidence

- evidence.setup: workflows/signal-trading-stoploss-v2/README.md#setup
- evidence.example: missing (add run log/artifact URL before claiming verified status)
- Workflow artifact: workflows/signal-trading-stoploss-v2/references/signal-trading-stoploss-v2@latest.ts

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
