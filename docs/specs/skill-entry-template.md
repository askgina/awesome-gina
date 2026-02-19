# Community Entry Template (v0)

Use this for every community entry page under `skills/<category>/<entry-slug>.md`.

This template is an authoring projection of the canonical schema in
`capability-schema.md`. Field names and enums should stay aligned.

Canonical type semantics:
- `capability-schema.md#canonical-submission-type-definitions-source-of-truth`

Worked examples:
- `worked-submission-examples.md`

## Naming Convention

- Folder: `skills/<category>/`
- File: `<entry-slug>.md`
- Slug style: lowercase, hyphenated, stable identifier.

## Frontmatter (Recommended)

```yaml
---
id: strategy-limit-order-alert
name: Limit Order Alert Strategy
type: strategy
summary: Alert when target prices hit.
category: strategies/alerts
status: active
owner: org-or-user
repo: https://github.com/owner/repo
homepage: https://example.com
license: MIT
verification:
  tier: unverified
  lastVerifiedAt: null
tags: [alerts, automation]
---
```

- `type`: `strategy` | `recipe` | `workflow` | `skill` | `filesystem`
- `status`: `active` | `experimental` | `archived`
- At least one of `repo` or `homepage` is required.
- `verification.tier`: `unverified` | `verified`
- `verification.lastVerifiedAt` is required when `verification.tier = verified`.

## Body Template

```md
# Human Entry Name

One-line value proposition.

## What it does
- Core capability 1
- Core capability 2

## Capability contract
- Trigger: ...
- Inputs: ...
- Outputs: ...
- Side effects: ...
- Failure modes: ...
- Strategy state transitions (if applicable): ...

## Setup
1. ...
2. ...

## Quick Copy Prompt (Ask Gina)
~~~text
promptText:
Create a scheduled recipe:
- Name: <recipe name>
- Execute with agent: <gina (spot) | predictions | perps>
- Schedule: <cron>
- Timezone: <timezone>
- Task: <plain-English instruction to run each time>
- Amount/rules: <size and decision rules>

Then return:
- Ready-to-run recipe config
- Quick preflight checklist
~~~

## Security and permissions
- Required permissions: ...

## Evidence
- Setup guide: ...
- Example run: ...

## Backlinks
- [Category](../../docs/categories/skills.md)
- [Awesome Gina Index](../../README.md)
```

## Required Fields

- `id`
- `name`
- `type`
- `summary`
- `category`
- `status`
- `repo` or `homepage` (at least one)
- `license`
- `verification.tier`
- `tags`
- `security.permissions` (in body)

## Type-Specific Notes

- `strategy`, `recipe`, `workflow`: full capability contract is required.
- `recipe`: include a `Quick Copy Prompt (Ask Gina)` section with a `promptText` fenced `text` code block for one-click reuse, including an explicit Execute with agent enum line sourced from lib/ai/agents/index.ts (gina, predictions, perps).
- `skill`, `filesystem`: concise capability contract is acceptable, but setup and side effects must still be explicit.

## Skill Content Format (Community Digest)

When `type: skill`, also include a "Skill Spec" block in the body.

Reference source: `https://agentskills.io/specification`.
This spec uses a simplified community projection of that format.

### Skill Spec Block (required for `type: skill`)

```md
## Skill Spec (Agent Skills aligned)
- Skill name: pnl-alerts
- Skill description: Detects PnL anomalies and explains when to act.
- Compatibility: Requires network access and predictions MCP connection.
- Allowed tools: predictions-mcp filesystem
- SKILL.md path in source repo: skills/pnl-alerts/SKILL.md
- Optional directories used: scripts/, references/, assets/
```

### Skill Field Rules

- Skill name:
  - 1-64 chars
  - lowercase letters, numbers, hyphens only
  - no leading/trailing hyphen
  - no consecutive hyphens
  - should match the skill folder name
- Skill description:
  - non-empty, practical "what it does + when to use"
  - keep under 1024 chars
- Allowed tools:
  - optional
  - space-delimited list of approved tools
- Compatibility:
  - optional
  - state key runtime assumptions (network, packages, target platform)

### Source Layout Guidance

For source repos that publish skill code, use:

```text
<skill-root>/
  SKILL.md
  scripts/      # optional
  references/   # optional
  assets/       # optional
```

- Keep `SKILL.md` focused (prefer under ~500 lines).
- Move deep reference material to `references/`.
- Use shallow relative file references from `SKILL.md` (avoid deep chains).

### Skill Body Minimum Sections

- What it does
- When to use / when not to use
- Inputs and outputs
- Failure modes
- Setup
- Security and permissions
- Evidence

## Tiering Rule

- `unverified`: listed but not validated end-to-end by maintainers.
- `verified`: validated by maintainers with a recent `verification.lastVerifiedAt`.
