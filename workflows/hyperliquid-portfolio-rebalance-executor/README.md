---
id: hyperliquid-portfolio-rebalance-executor
slug: hyperliquid-portfolio-rebalance-executor
name: Portfolio Rebalancer Workflow
type: workflow
summary: Trim Hyperliquid exposure back toward target leverage and concentration bands.
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
    - read-portfolio
    - read-position
    - read-open-orders
    - read-market-data
    - place-order
    - cancel-order
    - read/write-kv
evidence:
  setup: workflows/hyperliquid-portfolio-rebalance-executor/README.md#setup
  example: null
tags: [workflows, trading, hyperliquid, rebalance, leverage, portfolio, executes-trades]
---

# Portfolio Rebalancer Workflow

Workflow submission with artifact at `workflows/hyperliquid-portfolio-rebalance-executor/references/hyperliquid-portfolio-rebalance-executor@latest.ts`.

## What it does

- Reads account, portfolio, positions, prices, and open-order state for the configured universe.
- Builds a bounded rebalance plan focused on leverage reduction, concentration trims, and side-balance cleanup.
- Cancels conflicting open orders before placing trim or reduce-only orders.
- Supports dry-run review before any live rebalance path is enabled.

## Capability contract

- Trigger: Manual run; schedule-ready for periodic portfolio hygiene or post-signal rebalance execution.
- Inputs:
  - `riskProfile` (string, default `BALANCED`)
  - `coinUniverse` (string; optional comma-separated allowlist)
  - `maxTrimPctPerRun` (number, default `0.2`)
  - `maxOrders` (number, default `4`)
  - `dryRun` (boolean, default `true`)
- Outputs:
  - current exposure summary with gross leverage, concentration, and side imbalance
  - bounded action plan with per-position trim percentages and max notional targets
  - execution summary covering canceled orders, submitted reductions, and skipped items
- Side effects:
  - reads Hyperliquid account, portfolio, position, open-order, and price state
  - may cancel stale or conflicting open orders for positions selected for trimming
  - may place live reduce-only orders when `dryRun=false`
  - writes dedupe state for the latest executed rebalance intent
- Failure modes:
  - portfolio state fetch failure or stale price context
  - rebalance plan exceeds configured order or trim limits and is partially skipped
  - reduce-only orders remain unfilled, leaving residual concentration risk
  - repeated runs without updated state produce duplicate-intent conflicts

## Workflow steps

1. `fetch_portfolio_state`: collect account, portfolio, positions, orders, and prices for the active universe.
2. `plan_rebalance`: derive bounded trim targets from leverage, concentration, and profile limits.
3. `execute_rebalance`: cancel conflicts and submit reduce-only orders unless `dryRun=true`.
4. `persist_rebalance_state`: record the executed or proposed intent for operator review and dedupe.

## Setup

1. Keep artifact at `workflows/hyperliquid-portfolio-rebalance-executor/references/hyperliquid-portfolio-rebalance-executor@latest.ts`.
2. Install it as `/workspace/.harness/workflows/hyperliquid-portfolio-rebalance-executor@latest.ts`.
3. Validate with `workflow validate hyperliquid-portfolio-rebalance-executor`.
4. Start with `{"riskProfile":"BALANCED","dryRun":true,"coinUniverse":"BTC,ETH,SOL"}`.
5. Review the generated action plan before any live run.

## Security and permissions

- This workflow is not read-only when `dryRun=false`; it can cancel orders and place reduce-only rebalancing orders.
- Keep ticker allowlists, max-order limits, and operator review in place before unattended scheduling.
- Treat it as a controlled portfolio-ops tool, not a discovery or signal-generation workflow.

## Evidence

- `evidence.setup`: `workflows/hyperliquid-portfolio-rebalance-executor/README.md#setup`
- `evidence.example`: null
- Workflow artifact: `workflows/hyperliquid-portfolio-rebalance-executor/references/hyperliquid-portfolio-rebalance-executor@latest.ts`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
