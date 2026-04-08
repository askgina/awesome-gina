# Workflows

Up: [Awesome Gina Index](../../README.md)

## Market Data

- [Polymarket Market Hygiene Scan Workflow](../../workflows/polymarket-market-hygiene-scan/README.md) - Scan active markets, deduplicate event variants, and flag thin liquidity books.
- [Polymarket Signal Scanner Workflow](../../workflows/polymarket-signal-scanner/README.md) - Scan active Polymarket markets, rank high-signal candidates, and track shortlist deltas.
- [Crowded Trade Scanner Workflow](../../workflows/hyperliquid-funding-and-crowding-scanner/README.md) - Rank crowded Hyperliquid perp setups using funding, spread, and held-exposure pressure.
- [NBA Matchup Edge Report Workflow](../../workflows/nba-matchup-edge-report/README.md) - Build the daily NBA matchup edge markdown report used by the downstream executor.

## Trading

- [Signal Prediction Stop-Loss v2 Workflow](../../workflows/signal-prediction-stoploss-v2/README.md) - Attempt 15m BTC signal trades and monitor filled positions with stop-loss logic.
- [BTC Hourly Stop-Loss Workflow](../../workflows/btc-hourly-sl/README.md) - Run BTC hourly entry/stop-loss logic from :45 through :58 each hour (UTC).
- [BTC Hourly Force Sell Workflow](../../workflows/btc-hourly-sell/README.md) - Force-close BTC hourly position at :59 each hour and clear state on confirmed exit.
- [Daily Trend Reversal Workflow](../../workflows/hl-ha-daily-ema7-riskflip/README.md) - Trade daily Hyperliquid trend reversals with bounded sizing, stale-order cleanup, and protective stops.
- [Risk Budget Planner Workflow](../../workflows/hyperliquid-portfolio-risk-calibrator/README.md) - Read Hyperliquid portfolio state and output risk budgets, leverage caps, and rebalance guidance.
- [Portfolio Rebalancer Workflow](../../workflows/hyperliquid-portfolio-rebalance-executor/README.md) - Trim Hyperliquid exposure back toward target leverage and concentration bands.
- [Position Risk Watcher Workflow](../../workflows/hyperliquid-position-guardian/README.md) - Watch Hyperliquid positions for liquidation, spread, and stop-health risk and cut exposure when needed.
- [Auto Trailing Stops Workflow](../../workflows/hyperliquid-trailing-stop-maintainer/README.md) - Move and repair Hyperliquid protective stops using configurable trailing rules.
- [Stale Order Cleanup Workflow](../../workflows/hyperliquid-stale-order-janitor/README.md) - Cancel stale, duplicate, and orphaned Hyperliquid orders that no longer match live exposure.
- [Trend Basket Trader Workflow](../../workflows/hyperliquid-multi-asset-trend-basket/README.md) - Build and execute a bounded multi-asset Hyperliquid trend basket when momentum aligns.
- [Emergency Risk Exit Workflow](../../workflows/hyperliquid-kill-switch-and-flatten/README.md) - Cancel open orders and flatten Hyperliquid exposure when emergency guardrails are breached.

[Back to Contents](../../README.md)
