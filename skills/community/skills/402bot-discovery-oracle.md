---
id: skill-402-bot-discovery-oracle
slug: 402bot-discovery-oracle
name: 402.bot Discovery Oracle
type: skill
summary: Discover live x402 endpoints, inspect trust before spending, and submit providers to the 402.bot public directory.
category: skills/skills
status: active
owner: sam00101011
repo: https://github.com/sam00101011/402.bot
homepage: https://402.bot
license: UNLICENSED
version: 1.0.0
visibility: unlisted
publicUrl: null
verification:
  tier: unverified
  lastVerifiedAt: null
tags:
  - x402
  - mcp
  - discovery
  - providers
  - base
---

# 402.bot Discovery Oracle

Remote MCP skill for finding live x402-capable APIs, checking whether they are trustworthy enough to use, and turning provider metadata into a public 402.bot profile.

## What it does

- Searches ranked live x402 endpoints by capability, network, source, and pricing hints.
- Inspects endpoint trust, freshness, routing history, and readiness before a wallet spends.
- Supports provider verification flows that publish a public profile and badge through 402.bot.

## When to use / when not to use

- Use this when an operator or agent needs live x402 endpoint discovery on Base, wants a trust review before paying, or wants to verify a provider in the 402.bot directory.
- Do not use this for generic web browsing, local filesystem tasks, or workflows that do not depend on x402-capable endpoints.

## Capability contract

- Trigger: Need live x402 endpoint discovery, endpoint trust inspection, paid-route benchmarking, or provider verification.
- Inputs: capability query, network preference, optional budget guardrails, endpoint id or URL, and provider metadata for submissions.
- Outputs: ranked endpoint candidates, inspection summaries, readiness recommendations, route request ids, and provider profile URLs.
- Side effects: outbound MCP/API calls to 402.bot; optional `POST /v1/provider-submissions`; optional paid requests through `POST /v1/route` if the operator chooses to spend.
- Failure modes: remote MCP client lacks streamable HTTP support, discovery results can age out between ranking and execution, paid-route benchmarking requires a funded Base wallet, and provider submissions may return remediation blockers before listing goes live.

## Inputs and outputs

- Primary inputs: capability prompt, endpoint id, provider fields such as homepage/docs/resource URLs, and optional `campaignId`.
- Primary outputs: `discover_endpoints` results, `inspect_endpoint` trust summaries, readiness guidance, provider profile URLs, and badge/share-kit links when a provider submission succeeds.

## Setup

1. Add `https://api.402.bot/mcp` as a remote MCP server in your client.
2. If the client needs setup help, use `https://api.402.bot/mcp/setup` or `https://api.402.bot/mcp/setup.md`.
3. For provider verification, send provider metadata to `https://api.402.bot/v1/provider-submissions`.
4. For paid-route benchmarking, use `POST https://api.402.bot/v1/route` with a funded Base wallet and a conservative spend cap.

## Skill Spec (Agent Skills aligned)

- Skill name: 402bot-discovery-oracle
- Skill description: Remote MCP capability for discovering live x402 endpoints, inspecting trust before spending, and submitting providers to the 402.bot public directory.
- Compatibility: Requires network access and an MCP client that supports remote streamable HTTP servers; paid-route benchmarking also requires Base wallet funds.
- Allowed tools: remote-mcp http
- SKILL.md path in source repo: community/openclaw/402bot-discovery-oracle/SKILL.md
- Optional directories used: references/

## Security and permissions

- Required permissions: outbound network access to `https://api.402.bot/mcp`, `https://api.402.bot/v1/route`, and `https://api.402.bot/v1/provider-submissions`.
- Sensitive actions: paid-route benchmarking can spend wallet funds; provider submission writes public metadata into the 402.bot directory.
- Data exposure: prompts, endpoint ids, and provider metadata sent to 402.bot should be treated as external service inputs.

## Evidence

- Setup guide: https://api.402.bot/mcp/setup
- Runtime endpoint: https://api.402.bot/mcp
- Provider directory: https://402.bot/providers
- Smithery listing: https://smithery.ai/servers/bot402/discovery-oracle
- MCP Registry listing: https://registry.modelcontextprotocol.io/v0.1/servers/bot.402%2Fdiscovery-oracle/versions/latest

## Backlinks

- [Category](../../../docs/categories/skills.md)
- [Awesome Gina Index](../../../README.md)
