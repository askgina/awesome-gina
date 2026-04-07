---
id: nba-matchup-edge-report
slug: nba-matchup-edge-report
name: NBA Matchup Edge Report Workflow
type: workflow
summary: Generate a daily NBA matchup edge report markdown file for downstream Polymarket execution.
category: workflows/market-data
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
    - write-run-artifacts
evidence:
  setup: workflows/nba-matchup-edge-report/README.md#setup
  example: workflows/nba-matchup-edge-report/README.md#evidence
tags: [workflows, nba, polymarket, market-data, edge-report]
relationships:
  strategyIds:
    - strategy-nba-matchup-edge
---

# NBA Matchup Edge Report Workflow

Workflow submission with artifact at `workflows/nba-matchup-edge-report/references/nba-matchup-edge-report@latest.ts`.

## What it does

- Fetches today's NBA slate from public sources.
- Scores each matchup across team strength, recent form, four factors, defense, and injuries.
- Writes a markdown report to `/workspace/nba_matchup_edge_report.md` for later execution logic.
- Produces transparent summary rows so the downstream recipe can filter only approved edges.

## Capability contract

- Trigger: recurring schedule `0 16 * * *` in `Europe/London`.
- Inputs:
  - none required; the workflow derives the current NBA slate from public sources
- Outputs:
  - markdown report at `/workspace/nba_matchup_edge_report.md`
  - matchup summary rows with edge team, edge level, edge gap, and reason text
  - source summary for fetched public data
- Side effects:
  - fetches public NBA schedule, stats, and injury data
  - writes `/workspace/nba_matchup_edge_report.md`
- Failure modes:
  - no games found for today's NBA slate
  - public source fetch or parse failure
  - markdown report write failure

## Workflow steps

1. `fetch_schedule`: load today's NBA slate and normalize team names.
2. `fetch_overall_strength`: fetch team-strength data with fallback sources.
3. `fetch_recent_form`: compute recent-form inputs from public results.
4. `fetch_four_factors`: load four-factors data when available.
5. `fetch_defense`: load opponent-shooting or defense context when available.
6. `fetch_injuries`: build injury burden from official and backup sources.
7. `score_and_write_report`: score matchups and write the markdown report file.

## Setup

1. Keep artifact at `workflows/nba-matchup-edge-report/references/nba-matchup-edge-report@latest.ts`.
2. Install as `/workspace/.harness/workflows/nba-matchup-edge-report@latest.ts`.
3. Schedule the workflow for `0 16 * * *` in `Europe/London`.
4. Confirm the output file path is `/workspace/nba_matchup_edge_report.md`.
5. Ensure the downstream executor recipe runs at `30 16 * * *` in `Europe/London`.

## Security and permissions

- Requires public web fetch access and the ability to write a local markdown artifact.
- Produces data and scoring only; it does not place trades.

## Evidence

- Workflow artifact: `workflows/nba-matchup-edge-report/references/nba-matchup-edge-report@latest.ts`
- Output file: `/workspace/nba_matchup_edge_report.md`
- Intended downstream consumer: `recipes/daily-sports/recipe-nba-matchup-edge-executor.md`

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
