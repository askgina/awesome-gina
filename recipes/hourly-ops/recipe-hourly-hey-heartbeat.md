---
id: recipe-hourly-hey-heartbeat
name: Hourly Hey Heartbeat
type: recipe
summary: Send a simple hey heartbeat at minute 52 each hour in Europe/London timezone.
category: recipes/hourly-ops
status: active
owner: askgina
repo: https://github.com/askgina/awesome-gina
license: NOASSERTION
verification:
  tier: unverified
  lastVerifiedAt: null
security:
  permissions:
    - send-message
    - write-run-artifacts
evidence:
  setup: recipes/hourly-ops/recipe-hourly-hey-heartbeat.md#setup
  example: recipes/hourly-ops/recipe-hourly-hey-heartbeat.md#evidence
tags: [hourly, heartbeat, messaging, test, london-timezone]
---

# Hourly Hey Heartbeat

Sends a minimal heartbeat message for scheduler and channel liveness checks.

## What it does

- Sends the message "hey" at minute 52 every hour.
- Uses Europe/London timezone from source notes.
- Functions as a lightweight heartbeat/test automation.

## Capability contract

- Trigger: cron 52 * * * * in Europe/London timezone.
- Inputs:
  - messageText: hey
  - destination: configured heartbeat channel
  - timezone: Europe/London
- Outputs:
  - delivery attempt record
  - send status (success/failure)
- Side effects:
  - emits heartbeat message to configured destination
  - writes run/execution logs
- Failure modes:
  - destination channel unavailable
  - message-send provider timeout
  - scheduler timezone mismatch
- Strategy state transitions:
  - idle -> sending at trigger minute
  - sending -> delivered on success
  - sending -> failed on provider error
  - failed -> idle on next scheduled retry

## Setup

1. Configure the scheduler for minute 52 each hour with Europe/London timezone.
2. Bind a destination channel intended for heartbeat/test traffic.
3. Keep log retention enabled for liveness trend checks.

## Quick Copy Prompt (Ask Gina)

~~~text
promptText:
Create a scheduled recipe:
- Name: Hourly Hey Heartbeat
- Execute with agent: predictions
- Schedule: 52 * * * *
- Timezone: Europe/London
- Task: Send the message hey to the configured heartbeat destination every run.
- Amount/rules: Log success or failure for each send attempt.

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions

- security.permissions: send-message, write-run-artifacts.

## Evidence

- Source notes: gina-recipes.md (user-provided notes).
- Run count observed in notes: 2.
- Created date from notes: February 18, 2026.
- Timezone from notes: Europe/London.

## Backlinks

- [Category](../../docs/categories/recipes.md)
- [Awesome Gina Index](../../README.md)
