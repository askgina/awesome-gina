---
id: recipe-nba-matchup-edge-executor
slug: recipe-nba-matchup-edge-executor
name: NBA Matchup Edge Executor
type: recipe
summary: Read the daily NBA matchup edge report, trade qualifying strong edges on Polymarket, and delete the report file.
category: recipes/daily-sports
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
    - read-workflow-files
    - place-prediction-trade
    - delete-workflow-files
    - write-run-artifacts
evidence:
  setup: recipes/daily-sports/recipe-nba-matchup-edge-executor.md#setup
  example: recipes/daily-sports/recipe-nba-matchup-edge-executor.md#evidence
tags: [nba, polymarket, daily, edge-report, recipe]
relationships:
  strategyIds:
    - strategy-nba-matchup-edge
---

# NBA Matchup Edge Executor

Scheduled prompt-based recipe that runs after the report workflow and places small NBA trades only when the report and Polymarket prices both qualify.

## What it does

- Runs daily at 4:30 PM `Europe/London`.
- Reads `/workspace/nba_matchup_edge_report.md` produced by the 4:00 PM workflow.
- Filters for games marked `very strong` or `strong`, with edge above 8 and edge-side price between 0.55 and 0.75.
- Bets 5 USD on each qualifying side, then deletes `nba_matchup_edge_report.md`.

## Capability contract

- Trigger: cron `30 16 * * *` in `Europe/London`.
- Inputs:
  - Polymarket NBA games for today
  - report file at `/workspace/nba_matchup_edge_report.md`
  - fixed stake size: 5 USD per qualifying bet
- Outputs:
  - qualifying trade list
  - executed or skipped action summary
  - confirmation that the report file was deleted after evaluation
- Side effects:
  - reads local report file
  - places prediction trades on qualifying NBA markets
  - deletes `nba_matchup_edge_report.md`
- Failure modes:
  - report file missing at execution time
  - no `strong` or `very strong` rows with edge above 8
  - edge-side Polymarket price outside 0.55 to 0.75
  - trade placement failure or insufficient balance

## Setup

1. Schedule the report workflow first at `0 16 * * *` in `Europe/London`.
2. Schedule this recipe at `30 16 * * *` in `Europe/London`.
3. Keep both automations on the same workspace so the recipe can read `/workspace/nba_matchup_edge_report.md`.
4. Use fixed stake size 5 USD and do not widen the edge or price filters unless you intentionally change the strategy.

## Prompt Text

~~~text
Get me NBA games today from polymarket, and then read /workspace/nba_matchup_edge_report.md to determine which games in the very strong or strong and with edge above 8 and the edge side price between 0.55 to 0.75 are worth investing in and bet $5 USD on that. Then delete the file: nba_matchup_edge_report.md
~~~

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: NBA Matchup Edge Executor
- Execute with agent: predictions
- Schedule: 30 16 * * *
- Timezone: Europe/London
- Task: Get me NBA games today from polymarket, and then read /workspace/nba_matchup_edge_report.md to determine which games in the very strong or strong and with edge above 8 and the edge side price between 0.55 to 0.75 are worth investing in and bet $5 USD on that. Then delete the file: nba_matchup_edge_report.md
- Amount/rules: Bet 5 USD per qualifying side only after the report workflow has already run at 4:00 PM Europe/London.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- `security.permissions`: read-market-data, read-workflow-files, place-prediction-trade, delete-workflow-files, write-run-artifacts.

## Evidence

- Upstream workflow: `workflows/nba-matchup-edge-report/references/nba-matchup-edge-report@latest.ts`
- Expected input file: `/workspace/nba_matchup_edge_report.md`
- Schedule chain: 4:00 PM report, 4:30 PM execution, both in `Europe/London`

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
