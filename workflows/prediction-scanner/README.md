---
id: prediction-scanner
name: Prediction Scanner Workflow
type: workflow
summary: Scan active prediction markets, rank high-signal candidates, and persist shortlist snapshots.
category: workflows/market-data
status: experimental
owner: askgina
repo: https://github.com/askgina/awesome-gina
license: NOASSERTION
verification:
  tier: unverified
  lastVerifiedAt: null
security:
  permissions:
    - read-market-data
    - read-workflow-files
    - write-run-artifacts
    - read/write-kv
evidence:
  setup: workflows/prediction-scanner/README.md#setup
  example: null
tags: [workflows, prediction-markets, market-data, scanner]
---

# Prediction Scanner Workflow

Workflow submission with a concrete artifact at workflows/prediction-scanner/references/prediction-scanner@latest.ts.

## What it does

- Fetches active prediction-market rows and registers a queryable SQL table.
- Scores markets using urgency, activity, and liquidity-thinness signals.
- Produces a ranked shortlist plus run-over-run new/dropped market deltas.
- Emits submission-ready JSON and markdown artifacts for review.

## Capability contract

- Trigger: Manual run and schedule-ready recurring execution.
- Inputs:
  - limit (rows fetched from market provider)
  - minHoursUntilEnd and maxHoursUntilEnd (time window filter)
  - minLiquidityUsd (liquidity floor)
  - shortlistSize (top-N ranked rows)
  - snapshotPrefix (KV namespace for run history)
- Outputs:
  - ranked shortlist with score, volume/liquidity ratio, and time-to-end
  - scan counts (scanned, shortlisted, new, dropped)
  - submission artifact JSON plus human-readable summary markdown
- Side effects:
  - reads market data via fetchPolymarketData
  - writes run artifacts under /workspace/outputs/
  - writes KV snapshots under prediction-scanner:
- Failure modes:
  - upstream market-tool timeout or malformed payload
  - numeric cast and parse errors on provider fields
  - missing or stale prior snapshots reducing diff quality

## Workflow steps

1. Fetch market rows with fetchPolymarketData and register prediction_scan_raw.
2. Filter/score candidates and persist current shortlist snapshot to KV.
3. Compare against previous snapshot and emit submission/summary artifacts.

## Setup

1. Use workflows/prediction-scanner/references/prediction-scanner@latest.ts as the source artifact.
2. Validate definition with workflow validate prediction-scanner.
3. Execute with workflow run prediction-scanner and review outputs.
4. Confirm KV history with prediction-scanner: prefix keys.
5. Compare shortlist deltas before promoting any downstream automation.

## Security and permissions

- security.permissions: read-market-data, read-workflow-files, write-run-artifacts, read/write-kv.
- Scope controls: keep host-tool access allowlisted and avoid wildcard permissions.

## Evidence

- evidence.setup: workflows/prediction-scanner/README.md#setup
- evidence.example: missing (add a committed run artifact path or URL before claiming PR-ready verification)
- Workflow artifact: workflows/prediction-scanner/references/prediction-scanner@latest.ts

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
