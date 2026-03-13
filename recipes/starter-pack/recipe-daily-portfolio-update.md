---
id: recipe-daily-portfolio-update
slug: recipe-daily-portfolio-update
name: Daily Portfolio Update
type: recipe
summary: Generate a daily 9:00 AM portfolio update with total AUM in USD, large-asset movers, and relevant news for top holdings.
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
    - read-news
    - send-message
    - write-run-artifacts
evidence:
  setup: recipes/starter-pack/recipe-daily-portfolio-update.md#setup
  example: recipes/starter-pack/recipe-daily-portfolio-update.md#evidence
tags: [portfolio, daily, report, morning, news]
---

# Daily Portfolio Update

Generates a concise morning portfolio summary covering AUM, large-asset moves, and holding-specific news.

## What it does

- Calculates total portfolio AUM in USD once per day.
- Highlights the biggest up and down percentage moves across the largest holdings by USD value.
- Pulls relevant recent news tied to the top holdings in the portfolio.
- Delivers the result as a morning-ready report message and stores run artifacts.

## Capability contract

- Trigger: cron 0 9 * * * in the scheduler's local timezone.
- Inputs:
  - portfolioSource: current portfolio holdings and balances
  - reportingCurrency: USD
  - largeAssetSelection: largest holdings by USD notional, excluding dust balances
  - movementLookback: latest daily move or equivalent 24h percentage change
  - newsLookback: recent news window for top holdings
  - deliveryTarget: configured report destination
- Outputs:
  - morning portfolio report with total AUM in USD
  - ranked list of top large-asset movers with up/down percentages
  - concise relevant news summary for top holdings
- Side effects:
  - reads portfolio, position, market, and news data
  - sends the report to the configured destination
  - writes run/execution logs and report artifacts
- Failure modes:
  - portfolio snapshot unavailable or stale at run time
  - market data missing for one or more major holdings
  - news provider timeout, rate limit, or empty result set
  - scheduler timezone mismatch causing off-hours delivery
- Strategy state transitions:
  - idle -> collecting-portfolio at trigger time
  - collecting-portfolio -> ranking-movers when holdings load successfully
  - ranking-movers -> enriching-news when top holdings are identified
  - enriching-news -> reporting when summary content is assembled
  - reporting -> complete on successful delivery
  - collecting-portfolio -> failed on upstream data error

## Setup

1. Configure the recipe scheduler for 9:00 AM daily in the timezone where you want the morning report delivered.
2. Connect the portfolio/account source Gina should use for balances and positions.
3. Confirm the report should be denominated in USD for total AUM and mover calculations.
4. Bind a delivery target such as your report channel, inbox, or dashboard destination.
5. Keep a recent-news source enabled for the holdings you want covered each morning.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: Daily Portfolio Update
- Execute with agent: gina (spot)
- Schedule: 0 9 * * *
- Timezone: my scheduler's local timezone
- Task: Give me a breakdown of my portfolio with total AUM in $, top movements on large assets (up or down %), and any relevant news related to my top holdings.
- Amount/rules: Run every day at 9:00 AM local time; report in USD; focus on the largest holdings by USD value; keep the summary concise and useful.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-portfolio, read-position, read-market-data, read-news, send-message, write-run-artifacts.

## Evidence

- Source request: user-provided Daily Portfolio Update brief.
- Drafted date: March 13, 2026.
- Assumption: 9:00 AM means the scheduler's intended local timezone, since no specific timezone was provided.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
