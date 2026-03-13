---
id: recipe-asset-screener
slug: recipe-asset-screener
name: Asset Screener
type: recipe
summary: Generate a daily 9:00 AM spot-market screener covering the top 5 Ethereum, Solana, and Base tokens by 24-hour volume, with pricing, liquidity, and actionable trade ideas.
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
  setup: recipes/starter-pack/recipe-asset-screener.md#setup
  example: recipes/starter-pack/recipe-asset-screener.md#evidence
tags: [spot, crypto, daily, report, ethereum, solana, base]
---

# Asset Screener

Generates a concise morning spot-market report for the most active tokens across Ethereum, Solana, and Base.

## What it does

- Identifies the top 5 tokens across Ethereum, Solana, and Base by 24-hour trading volume.
- Reports token name, symbol, current USD price, 24-hour volume, liquidity, and 24-hour price change.
- Adds a brief actionable recommendation for each token, such as a conditional buy/sell idea, monitoring trigger, or warning.
- Formats the result as a table for fast morning review.

## Capability contract

- Trigger: cron 0 9 * * * in the scheduler's local timezone.
- Inputs:
  - networkUniverse: Ethereum, Solana, Base
  - rankingMetric: 24-hour trading volume in USD
  - tokenCount: top 5
  - requiredFields: token name, symbol, current price USD, 24-hour trading volume USD, liquidity USD, 24-hour price change percentage
  - recommendationStyle: brief, actionable, profit-oriented spot-trading ideas
  - outputFormat: table
  - deliveryTarget: configured report destination
- Outputs:
  - table of the top 5 spot tokens across the selected networks by 24-hour trading volume
  - one actionable recommendation per token
  - run summary with timestamp and data-source coverage notes when needed
- Side effects:
  - reads cross-chain spot-market data for ranking, pricing, volume, liquidity, and 24-hour change
  - sends the report to the configured destination
  - writes run/execution logs and report artifacts
- Failure modes:
  - incomplete or stale market data across one or more target networks
  - token rankings change during collection, causing minor snapshot drift
  - liquidity or volume metrics unavailable for some candidates
  - scheduler timezone mismatch causing off-hours delivery
- Strategy state transitions:
  - idle -> scanning-markets at trigger time
  - scanning-markets -> ranking-tokens when market data loads successfully
  - ranking-tokens -> drafting-recommendations when the top 5 list is finalized
  - drafting-recommendations -> reporting when the table is assembled
  - reporting -> complete on successful delivery
  - scanning-markets -> failed on upstream data error

## Setup

1. Configure the recipe scheduler for 9:00 AM daily in the timezone where you want the report delivered.
2. Connect the spot-market data source Gina should use for Ethereum, Solana, and Base token rankings.
3. Confirm the report should use 24-hour trading volume in USD to rank tokens across all three networks.
4. Bind a delivery target such as your morning channel, inbox, or dashboard destination.
5. Decide whether you want strictly concise recommendations or slightly more tactical trade notes per token.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: Asset Screener
- Execute with agent: gina (spot)
- Schedule: 0 9 * * *
- Timezone: my scheduler's local timezone
- Task: Generate a Daily Crypto Market Activity Report. Identify the top 5 tokens across Ethereum, Solana, and Base networks by 24-hour trading volume. For each of the top 5 tokens, provide token name and symbol, current price in USD, 24-hour trading volume in USD, liquidity in USD, and 24-hour price change in percent. For each token, provide a brief actionable recommendation for a potential profit-making strategy. Present the report clearly in a table format.
- Amount/rules: Run every day at 9:00 AM local time; rank by 24-hour volume in USD across Ethereum, Solana, and Base; include exactly 5 tokens; keep recommendations brief and actionable for spot trading.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: read-market-data, send-message, write-run-artifacts.

## Evidence

- Source request: user-provided GINA_TASK Daily Crypto Market Activity Report brief.
- Drafted date: March 13, 2026.
- Assumption: morning delivery means 9:00 AM in the scheduler's intended local timezone, since no specific timezone was provided.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
