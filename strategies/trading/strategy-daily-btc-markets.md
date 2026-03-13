---
id: strategy-daily-btc-markets
slug: daily-btc-markets
name: Daily BTC Markets Strat
type: strategy
summary: Bundle BTC daily entry, stop-loss, and end-of-window liquidation recipes.
category: strategies/trading
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
    - read-position
    - place-order
    - redeem-position
    - write-run-artifacts
relationships:
  recipeIds:
    - recipe-btc-daily-buy-75-95
    - recipe-daily-btc-stop-loss
    - recipe-daily-crypto-predictions-sell-all
evidence:
  setup: strategies/trading/strategy-daily-btc-markets.md#setup
  example: strategies/trading/strategy-daily-btc-markets.md#evidence
tags: [strategy, btc, daily, momentum, stop-loss, liquidation]
---

# Daily BTC Markets Strat

Daily strategy bundle for BTC entry, risk control, and terminal daily cleanup.

## Bundle map

- `recipe-btc-daily-buy-75-95` ([file](../../recipes/predictions/recipe-btc-daily-buy-75-95.md))
- `recipe-daily-btc-stop-loss` ([file](../../recipes/predictions/recipe-daily-btc-stop-loss.md))
- `recipe-daily-crypto-predictions-sell-all` ([file](../../recipes/predictions/recipe-daily-crypto-predictions-sell-all.md))

## Capability contract

- Trigger:
  - daily entry window via `recipe-btc-daily-buy-75-95`
  - intraday stop-loss window via `recipe-daily-btc-stop-loss`
  - terminal cleanup via `recipe-daily-crypto-predictions-sell-all`
- Inputs:
  - daily BTC market odds and fixed notional settings
  - stop-loss threshold configuration
  - open/expired position inventory for liquidation
- Outputs:
  - daily entry/skip decision records
  - stop-loss action summaries
  - liquidation and redemption run summaries
- Side effects:
  - places and closes daily market orders
  - redeems expired positions
  - writes run artifacts
- Failure modes:
  - stale or unavailable market data
  - order execution failures
  - inventory mismatch during liquidation/redeem
- Strategy state transitions:
  - idle -> entry-evaluation at scheduled daily entry trigger
  - entry-evaluation -> open-position when odds qualify
  - open-position -> risk-monitor during stop-loss window
  - risk-monitor -> stop-loss-exit when threshold is breached
  - risk-monitor -> terminal-liquidation at daily cleanup trigger
  - terminal-liquidation -> closed on confirmed cleanup completion

## Setup

1. Enable bundled recipes:
   - `recipes/predictions/recipe-btc-daily-buy-75-95.md`
   - `recipes/predictions/recipe-daily-btc-stop-loss.md`
   - `recipes/predictions/recipe-daily-crypto-predictions-sell-all.md`
2. Keep timezone handling consistent across the bundle (`UTC` and `Europe/London` schedule boundaries must be intentional).
3. Wire strategy route in app CMS:
   - set `publicUrl` to the shared page URL when published (typically `https://askgina.ai/recipe/<uuid>`)

## Security and permissions

- Requires market and position reads plus order execution and redemption permissions.
- Should run under explicit position-size and loss limits.

## Evidence

- `recipes/predictions/recipe-btc-daily-buy-75-95.md`
- `recipes/predictions/recipe-daily-btc-stop-loss.md`
- `recipes/predictions/recipe-daily-crypto-predictions-sell-all.md`

## Backlinks

- [Category](../../docs/categories/strategies.md)
- [Awesome Gina Index](../../README.md)
