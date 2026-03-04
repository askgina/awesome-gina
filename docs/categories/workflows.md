# Workflows

Up: [Awesome Gina Index](../../README.md)

## Market Data

- [Polymarket Market Hygiene Scan Workflow](../../workflows/polymarket-market-hygiene-scan/README.md) - Scan active markets, deduplicate event variants, and flag thin liquidity books.
- [Polymarket Signal Scanner Workflow](../../workflows/polymarket-signal-scanner/README.md) - Scan active Polymarket markets, rank high-signal candidates, and track shortlist deltas.

## Trading

- [Signal Prediction Stop-Loss v2 Workflow](../../workflows/signal-prediction-stoploss-v2/README.md) - Attempt 15m BTC signal trades and monitor filled positions with stop-loss logic.
- [BTC Hourly Stop-Loss Workflow](../../workflows/btc-hourly-sl/README.md) - Run BTC hourly entry/stop-loss logic from :45 through :58 each hour (UTC).
- [BTC Hourly Force Sell Workflow](../../workflows/btc-hourly-sell/README.md) - Force-close BTC hourly position at :59 each hour and clear state on confirmed exit.

[Back to Contents](../../README.md)
