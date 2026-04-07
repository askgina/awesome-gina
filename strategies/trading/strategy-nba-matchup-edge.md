---
id: strategy-nba-matchup-edge
slug: nba-matchup-edge
name: NBA Matchup Edge Strat
type: strategy
summary: Generate a daily NBA edge report and execute only strong report-backed Polymarket bets 30 minutes later.
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
    - read-public-web-data
    - read-workflow-files
    - place-prediction-trade
    - delete-workflow-files
    - write-run-artifacts
relationships:
  recipeIds:
    - recipe-nba-matchup-edge-executor
  workflowIds:
    - nba-matchup-edge-report
evidence:
  setup: strategies/trading/strategy-nba-matchup-edge.md#setup
  example: strategies/trading/strategy-nba-matchup-edge.md#evidence
tags: [strategy, nba, polymarket, daily, edge-report]
---

# NBA Matchup Edge Strat

Daily NBA strategy that stages a report build first, then executes small Polymarket bets from the report under fixed filters.

## Bundle map

- `nba-matchup-edge-report` ([file](../../workflows/nba-matchup-edge-report/README.md))
- `recipe-nba-matchup-edge-executor` ([file](../../recipes/daily-sports/recipe-nba-matchup-edge-executor.md))

## Capability contract

- Trigger:
  - report workflow at `0 16 * * *` in `Europe/London`
  - executor recipe at `30 16 * * *` in `Europe/London`
- Inputs:
  - public NBA schedule, stats, and injury sources
  - same-day Polymarket NBA markets
  - fixed trade size of 5 USD
- Outputs:
  - markdown matchup report
  - qualifying trade list from report + price filters
  - report cleanup confirmation after execution
- Side effects:
  - writes `/workspace/nba_matchup_edge_report.md`
  - places qualifying NBA prediction trades
  - deletes the local report after use
- Failure modes:
  - upstream report generation fails or writes no usable report
  - no qualifying games meet edge-level, edge-gap, and price filters
  - trade execution fails after qualification
- Strategy state transitions:
  - idle -> report-generation at 4:00 PM Europe/London
  - report-generation -> waiting-for-execution when the markdown report exists
  - waiting-for-execution -> executing at 4:30 PM Europe/London
  - executing -> placed-bets when one or more games qualify
  - executing -> skipped when no game qualifies
  - placed-bets or skipped -> cleaned-up after report deletion

## Setup

1. Install the workflow artifact from `workflows/nba-matchup-edge-report/references/nba-matchup-edge-report@latest.ts`.
2. Schedule the workflow for `0 16 * * *` in `Europe/London`.
3. Create the executor recipe with the prompt text in `recipes/daily-sports/recipe-nba-matchup-edge-executor.md`.
4. Schedule the executor recipe for `30 16 * * *` in `Europe/London`.
5. Keep both pieces on the same workspace and verify the report file is created before the executor runs.

## Security and permissions

- Requires public data fetches for report generation and real trade execution for the executor.
- Deletes the local report file after the execution pass, so recovery depends on rerunning the workflow.

## Evidence

- `workflows/nba-matchup-edge-report/references/nba-matchup-edge-report@latest.ts`
- `recipes/daily-sports/recipe-nba-matchup-edge-executor.md`

## Backlinks

- [Category](../../docs/categories/strategies.md)
- [Awesome Gina Index](../../README.md)
