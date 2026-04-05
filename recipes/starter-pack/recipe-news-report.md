---
id: recipe-news-report
slug: recipe-news-report
name: News Report
type: recipe
summary: Generate a daily news report covering key portfolio assets and the broader crypto market, highlighting events most likely to affect holdings and industry conditions.
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
  setup: recipes/starter-pack/recipe-news-report.md#setup
  example: recipes/starter-pack/recipe-news-report.md#evidence
tags: [news, portfolio, crypto, daily, report, macro]
---

# News Report

Generates a concise news report for the assets that matter most in the portfolio, plus the broader crypto industry backdrop.

## What it does

- Tracks the key assets in the portfolio based on size, exposure, or watchlist priority.
- Pulls the most relevant recent news for those assets and for major crypto market themes.
- Ranks the top developments by likely impact on the portfolio and the wider industry.
- Delivers the result as a neat report with asset-specific and market-wide sections.

## Capability contract

- Trigger: cron 0 9 * * * in the scheduler's local timezone.
- Inputs:
  - portfolioSource: current portfolio balances, positions, and tracked assets
  - keyAssetSelection: top holdings plus explicitly watched symbols
  - macroCoverage: major crypto assets, exchange and infrastructure developments, regulation, and market structure news
  - newsLookback: recent news window or since last successful run
  - impactLens: relevance to current holdings, sector exposure, and overall crypto conditions
  - deliveryTarget: configured report destination
- Outputs:
  - prioritized news summary for key portfolio assets
  - broader crypto market and industry summary
  - impact notes explaining why each event may matter to the portfolio
  - clean report structure with sections for holdings, macro, and watch items
- Side effects:
  - reads portfolio, position, market, and news data
  - sends the report to the configured destination
  - writes run/execution logs and report artifacts
- Failure modes:
  - portfolio snapshot unavailable or outdated
  - news provider timeout, rate limit, or low-coverage result set
  - impact ranking becomes noisy when many events land at once
  - scheduler timezone mismatch causing off-hours delivery
- Strategy state transitions:
  - idle -> loading-context at trigger time
  - loading-context -> selecting-assets when holdings load successfully
  - selecting-assets -> fetching-news when the watch universe is finalized
  - fetching-news -> ranking-impact when relevant headlines are assembled
  - ranking-impact -> reporting when the summary is drafted
  - reporting -> complete on successful delivery
  - loading-context -> failed on upstream data error

## Setup

1. Configure the recipe scheduler for daily delivery in the timezone where you want the report sent.
2. Connect the portfolio/account source Gina should use to identify key assets and exposures.
3. Keep a news provider enabled for asset-specific and crypto-industry coverage.
4. Decide whether the watch universe should include only top holdings or also manually tracked names.
5. Bind a delivery target such as your inbox, channel, or dashboard destination.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: News Report
- Execute with agent: gina
- Schedule: 0 9 * * *
- Timezone: my scheduler's local timezone
- Task: Track the key assets in my portfolio as well as the broader crypto market and send me a neat news report of the top events that may impact my portfolio and the industry.
- Amount/rules: Prioritize the assets that matter most in my portfolio; include both asset-specific and market-wide developments; keep the summary concise but explain why each event matters.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-portfolio, read-position, read-market-data, read-news, send-message, write-run-artifacts.

## Evidence

- Source request: user-provided Starter Pack News Report brief.
- Drafted date: March 23, 2026.
- Assumption: this report runs daily at 9:00 AM local time for consistency with the starter-pack morning-report pattern.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
