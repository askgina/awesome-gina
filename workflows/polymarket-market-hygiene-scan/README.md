---
id: polymarket-market-hygiene-scan
name: Polymarket Market Hygiene Scan Workflow
type: workflow
summary: Scan active Polymarket markets for deduplication and thin-book hygiene before downstream actions.
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
  setup: workflows/polymarket-market-hygiene-scan/README.md#setup
  example: null
tags: [workflows, polymarket, market-data, hygiene, dedup]
---

# Polymarket Market Hygiene Scan Workflow

Workflow submission with a concrete artifact at workflows/polymarket-market-hygiene-scan/references/polymarket-market-hygiene-scan@latest.ts.

## What it does

- Collects active Polymarket rows and normalizes fields for analysis.
- Deduplicates related markets using slug and question-text heuristics.
- Flags thin books using volume-to-liquidity ratios.
- Persists snapshots for historical diffing between scans.

## Capability contract

- Trigger: Manual run and scheduled scan cadence.
- Inputs:
  - market fetch scope and limit
  - dedup mode (slug-only or slug-plus-question)
  - thin-book threshold (default ratio > 20)
  - snapshot key prefix (default scanner:)
- Outputs:
  - filtered deduplicated market list
  - thin-book flagged market subset
  - scan summary counts and snapshot metadata
- Side effects:
  - reads market data via host tools
  - writes run artifacts under /workspace/.harness/runs/
  - writes snapshot state to KV keys under scanner:
- Failure modes:
  - host tool timeout or unavailable provider
  - schema drift in market payload fields
  - false dedup grouping from heuristic collisions
  - numeric cast errors when computing ratio metrics

## Workflow steps

1. Fetch market rows with fetchPolymarketData and register polymarket_raw.
2. Normalize rows and cast numeric text fields for SQL calculations.
3. Derive event keys from slug normalization and question normalization.
4. Compute vol_liq_ratio and tag thin books when ratio exceeds 20.
5. Write scanner snapshots to KV and diff against previous run keys.
6. Emit machine-readable and human-readable run artifacts.

## Setup

1. Use workflows/polymarket-market-hygiene-scan/references/polymarket-market-hygiene-scan@latest.ts as the source artifact.
2. Validate workflow definition with workflow validate polymarket-market-hygiene-scan and run with workflow run polymarket-market-hygiene-scan.
3. Ensure kv.list parsing treats entries as {key, value} objects.
4. Exclude resolved markets with CAST(hours_until_end AS REAL) > 0.
5. Evaluate and compare against baseline before promoting changes.

## Security and permissions

- security.permissions: read-market-data, read-workflow-files, write-run-artifacts, read/write-kv.
- Scope controls: allowlist host tools per step and avoid wildcard permissions.

## Evidence

- evidence.setup: workflows/polymarket-market-hygiene-scan/README.md#setup
- evidence.example: missing (add a committed run artifact path or URL before claiming PR-ready verification)
- Workflow artifact: workflows/polymarket-market-hygiene-scan/references/polymarket-market-hygiene-scan@latest.ts
- Setup guide reference: skills/official/workflows/SKILL.md
- Implementation details: skills/official/workflows/references/polymarket-patterns.md

## Backlinks

- [Category](../../docs/categories/workflows.md)
- [Awesome Gina Index](../../README.md)
