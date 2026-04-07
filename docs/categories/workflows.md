# Workflows

Up: [Awesome Gina Index](../../README.md)

## Market Data

- [Polymarket Market Hygiene Scan Workflow](../../workflows/polymarket-market-hygiene-scan/README.md) - Scan active markets, deduplicate event variants, and flag thin liquidity books.
- [Polymarket Signal Scanner Workflow](../../workflows/polymarket-signal-scanner/README.md) - Scan active Polymarket markets, rank high-signal candidates, and track shortlist deltas.
- [Hyperliquid Funding and Crowding Scanner Workflow](../../workflows/hyperliquid-funding-and-crowding-scanner/README.md) - Scan Hyperliquid books, asset metadata, and held exposure for crowding, spread, and funding-pressure signals.
- [NBA Matchup Edge Report Workflow](../../workflows/nba-matchup-edge-report/README.md) - Build the daily NBA matchup edge markdown report used by the downstream executor.

## Trading

- [Signal Prediction Stop-Loss v2 Workflow](../../workflows/signal-prediction-stoploss-v2/README.md) - Attempt 15m BTC signal trades and monitor filled positions with stop-loss logic.
- [BTC Hourly Stop-Loss Workflow](../../workflows/btc-hourly-sl/README.md) - Run BTC hourly entry/stop-loss logic from :45 through :58 each hour (UTC).
- [BTC Hourly Force Sell Workflow](../../workflows/btc-hourly-sell/README.md) - Force-close BTC hourly position at :59 each hour and clear state on confirmed exit.
- [Hyperliquid Daily Heikin Ashi EMA7 Risk Flip Workflow](../../workflows/hl-ha-daily-ema7-riskflip/README.md) - Trade daily Hyperliquid HA EMA(7) reversals with flip, cancel, sizing, and stop logic.
- [Hyperliquid Portfolio Risk Calibrator Workflow](../../workflows/hyperliquid-portfolio-risk-calibrator/README.md) - Read Hyperliquid portfolio state and emit leverage, sizing, and rebalance guidance.
- [Hyperliquid Portfolio Rebalance Executor Workflow](../../workflows/hyperliquid-portfolio-rebalance-executor/README.md) - Execute bounded leverage and concentration trims from a portfolio rebalance plan.
- [Hyperliquid Position Guardian Workflow](../../workflows/hyperliquid-position-guardian/README.md) - Watch live positions for liquidation-distance, spread, and stop-health breaches and cut risk when needed.
- [Hyperliquid Trailing Stop Maintainer Workflow](../../workflows/hyperliquid-trailing-stop-maintainer/README.md) - Move and repair protective stops for open Hyperliquid positions using configured trailing rules.
- [Hyperliquid Stale Order Janitor Workflow](../../workflows/hyperliquid-stale-order-janitor/README.md) - Cancel orphaned, duplicate, and stale Hyperliquid orders that no longer match live exposure.
- [Hyperliquid Multi Asset Trend Basket Workflow](../../workflows/hyperliquid-multi-asset-trend-basket/README.md) - Build and execute a bounded multi-asset trend basket instead of a single-ticker flip.
- [Hyperliquid Kill Switch and Flatten Workflow](../../workflows/hyperliquid-kill-switch-and-flatten/README.md) - Cancel open orders and flatten allowed Hyperliquid positions under an operator-controlled emergency policy.

[Back to Contents](../../README.md)
