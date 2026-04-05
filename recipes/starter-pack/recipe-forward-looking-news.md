---
id: recipe-forward-looking-news
slug: recipe-forward-looking-news
name: Forward Looking News
type: recipe
summary: Generate a daily 9:00 AM forward-looking report by synthesizing trending Polymarket markets across categories into a probability-based outlook.
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
    - read-market-data
    - send-message
    - write-run-artifacts
evidence:
  setup: recipes/starter-pack/recipe-forward-looking-news.md#setup
  example: recipes/starter-pack/recipe-forward-looking-news.md#evidence
tags: [polymarket, daily, report, probabilities, macro, prediction-markets]
---

# Forward Looking News

Generates a daily forward-looking report based on what trending Polymarket markets imply is becoming more likely or less likely.

## What it does

- Pulls the top trending Polymarket markets from multiple categories such as commodities, finance, politics, crypto, and culture.
- Selects the most relevant and active markets in each category for the current snapshot.
- Synthesizes implied odds into plain-English forward-looking takeaways about what is becoming more likely or less likely.
- Delivers the result as a 9:00 AM report with category sections, odds highlights, and cross-market themes.

## Capability contract

- Trigger: cron 0 9 * * * in the scheduler's local timezone.
- Inputs:
  - marketSource: Polymarket trending market feed
  - categoryUniverse: commodities, finance, politics, crypto, culture, plus any other active categories worth including
  - selectionPolicy: top trending and sufficiently active markets per category
  - probabilityLens: current market odds or implied probabilities
  - synthesisStyle: concise forward-looking briefing with category sections and cross-market themes
  - deliveryTarget: configured report destination
- Outputs:
  - daily 9:00 AM forward-looking report
  - category-organized set of notable markets with current odds context
  - synthesis of what appears more likely and less likely based on market pricing
  - caveat notes when category coverage, liquidity, or recency is weak
- Side effects:
  - reads prediction-market and market-trend data
  - sends the report to the configured destination
  - writes run/execution logs and report artifacts
- Failure modes:
  - trending market feed unavailable or stale
  - category coverage too thin to produce a balanced snapshot
  - market odds move materially during collection
  - low-liquidity markets introduce noisy signals
  - scheduler timezone mismatch causing off-hours delivery
- Strategy state transitions:
  - idle -> fetching-trends at trigger time
  - fetching-trends -> selecting-markets when trending rows load successfully
  - selecting-markets -> grouping-categories when the daily market set is finalized
  - grouping-categories -> synthesizing-outlook when odds summaries are assembled
  - synthesizing-outlook -> reporting when the briefing is drafted
  - reporting -> complete on successful delivery
  - fetching-trends -> failed on upstream data error

## Setup

1. Configure the recipe scheduler for 9:00 AM daily in the timezone where you want the report delivered.
2. Connect the Polymarket or prediction-market source Gina should use for trending market data.
3. Confirm the report should cover multiple categories, including commodities, finance, politics, crypto, and culture when available.
4. Decide whether to suppress thin or illiquid markets from the final report.
5. Bind a delivery target such as your inbox, channel, or dashboard destination.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: Forward Looking News
- Execute with agent: gina
- Schedule: 0 9 * * *
- Timezone: my scheduler's local timezone
- Task: Get the top trending markets on Polymarket across commodities, finance, politics, crypto, culture, and other relevant categories. Synthesize them into a forward-looking news report on what is becoming more likely or less likely based on market odds.
- Amount/rules: Use trending markets from multiple categories; prioritize liquid and active markets; translate odds into plain-English takeaways; call out uncertainty when the signal is thin or noisy.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-market-data, send-message, write-run-artifacts.

## Evidence

- Source request: user-provided Starter Pack Forward Looking News brief.
- Drafted date: March 23, 2026.
- Assumption: the requested 9:00 AM report should run in the scheduler's intended local timezone.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
