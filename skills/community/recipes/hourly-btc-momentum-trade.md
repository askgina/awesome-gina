---
id: recipe-hourly-btc-momentum-trade
name: Hourly BTC Momentum Trade
type: recipe
summary: Auto-trade BTC hourly based on momentum signals from the predictions agent.
category: recipes/momentum
status: experimental
owner: gina-community
repo: https://github.com/askgina/awesome-gina
license: MIT
verification:
  tier: unverified
  lastVerifiedAt: null
tags: [btc, momentum, hourly, auto-trade, predictions]
---

# Hourly BTC Momentum Trade

Executes BTC trades every hour based on momentum signal evaluation from the predictions agent.

## What it does
- Runs at :45 past every hour
- Fetches the current BTC hourly up/down prediction market
- Checks if either outcome has probability between 75% and 95%
- Bets $150 on the qualifying side with aggressive fill
- Skips the trade if neither side is in the 75%-95% window

## Capability contract
- Trigger: cron `45 * * * *`
- Inputs:
  - token: BTC
  - market: hourly up/down
  - betSize: $150
  - probabilityFloor: 75%
  - probabilityCeiling: 95%
  - fillMode: aggressive
- Outputs:
  - tradeDecision: bet on favored side | skip
  - orderPayload (when trade is placed): size, side, probability
- Side effects:
  - places bet on the predictions market
  - appends run logs per execution
- Failure modes:
  - predictions agent timeout or unavailable
  - no side meets 75%-95% probability window (skips trade)
  - insufficient balance for $150 bet
  - market closed or unavailable
- Strategy state transitions:
  - idle -> evaluating on each cron tick
  - evaluating -> placing-bet when one side is between 75%-95%
  - evaluating -> idle when neither side qualifies
  - placing-bet -> idle after fill confirmation

## Setup
1. Ensure the predictions agent is connected and accessible.
2. Fund your predictions account with sufficient balance for $150 bets.
3. Deploy the recipe with the cron schedule.

## Quick Copy Prompt (Ask Gina)
~~~text
promptText:
Create a scheduled recipe:
- Name: Hourly BTC Momentum Trade
- Execute with agent: predictions
- Schedule: 45 * * * *
- Timezone: UTC
- Task: Get me the current BTC hourly up/down market. See which of the 2 outcomes has >75% chance and under 95% chance. Bet $150 on that outcome. Aggressive Fill. if none of the 2 sides have this set up, don't trade
- Amount/rules: $150 per trade, only when one side is between 75%-95% probability

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions
- Required permissions: read-market-data, place-order, read-position, read-balance

## Evidence
- Setup guide: https://github.com/askgina/awesome-gina
- Example run: pending first community verification

## Backlinks
- [Recipes Category](../../docs/categories/skills.md)
- [Awesome Gina Index](../../README.md)
