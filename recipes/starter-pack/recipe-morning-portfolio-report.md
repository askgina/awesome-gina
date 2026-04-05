---
id: recipe-morning-portfolio-report
slug: recipe-morning-portfolio-report
name: Morning Portfolio Report
type: recipe
summary: Generate a neat daily morning portfolio report with total AUM, top holdings, 24-hour performance, and balance breakdown across spot, predictions, and perps.
category: recipes/starter-pack
status: active
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
    - read-portfolio
    - read-position
    - read-market-data
    - send-message
    - write-run-artifacts
evidence:
  setup: recipes/starter-pack/recipe-morning-portfolio-report.md#setup
  example: recipes/starter-pack/recipe-morning-portfolio-report.md#evidence
tags: [portfolio, daily, morning, report, aum, balances]
---

# Morning Portfolio Report

Generates a neat morning portfolio report with total AUM, bucketed balances, and top-asset performance.

## What it does

- Reads all portfolio assets and computes total AUM in USD.
- Breaks balances into spot, predictions, and perps, then sums them into a single total.
- Highlights the largest assets by current USD value and reports each asset's latest 24-hour performance.
- Delivers the result as a clean, easy-to-scan report with headline totals and ranked holdings.

## Capability contract

- Trigger: cron 0 9 * * * in the scheduler's local timezone.
- Inputs:
  - portfolioSource: current portfolio balances, holdings, and positions
  - reportingCurrency: USD
  - balanceBuckets: spot, predictions, perps
  - topAssetSelection: largest assets by USD value, excluding dust balances
  - performanceWindow: latest 24-hour percentage change
  - deliveryTarget: configured report destination
- Outputs:
  - morning report with total AUM in USD
  - balance breakdown for spot, predictions, perps, and combined total
  - ranked top-asset list with current USD value and 24-hour performance
  - short portfolio snapshot notes for concentration or major movers
- Side effects:
  - reads portfolio, position, and market data
  - sends the report to the configured destination
  - writes run/execution logs and report artifacts
- Failure modes:
  - portfolio snapshot unavailable or stale at run time
  - asset classification missing for one or more balances
  - 24-hour market data unavailable for part of the holdings set
  - scheduler timezone mismatch causing off-hours delivery
- Strategy state transitions:
  - idle -> collecting-balances at trigger time
  - collecting-balances -> classifying-buckets when balances load successfully
  - classifying-buckets -> ranking-assets when bucket totals are computed
  - ranking-assets -> drafting-report when top assets and 24-hour moves are assembled
  - drafting-report -> reporting when the final layout is ready
  - reporting -> complete on successful delivery
  - collecting-balances -> failed on upstream data error

## Setup

1. Configure the recipe scheduler for 9:00 AM daily in the timezone where you want the report delivered.
2. Connect the portfolio/account source Gina should use for balances, holdings, and positions.
3. Confirm the report should normalize values to USD for AUM, bucket totals, and ranking.
4. Make sure balances can be mapped into spot, predictions, and perps buckets.
5. Bind a delivery target such as your inbox, channel, or dashboard destination.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: Portfolio Report
- Execute with agent: gina
- Schedule: 0 9 * * *
- Timezone: my scheduler's local timezone
- Task: Get all assets in my portfolio and create a neat portfolio report with total AUM in USD, my top assets and their 24-hour performance, and a balance breakdown for spot, predictions, and perps. Sum the balances into a clear grand total and make the report easy to scan.
- Amount/rules: Report in USD; exclude dust balances from the top-assets section; include exact subtotals for spot, predictions, perps, and total portfolio value.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-portfolio, read-position, read-market-data, send-message, write-run-artifacts.

## Evidence

- Source request: user-provided Starter Pack Morning Portfolio Report brief.
- Drafted date: March 23, 2026.
- Assumption: morning delivery defaults to 9:00 AM in the scheduler's intended local timezone.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
