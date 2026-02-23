# Capability Schema (v0 Implemented Scope)

This schema is intentionally small and matches what is actually shippable now.

## Current Reality

- Community entries are submitted through manual PR flow in `this repository`.
- Manual PR submission is the default path; API-based publishing is optional.
- Submission lanes:
  - `skills/community/*` is valid for non-synced community submissions.
  - `skills/official/*` is for synced/exported entries (ClawHub).
- This schema is for docs quality and moderation consistency, not runtime storage yet.

## Supported v0 Submission Types (Shareable Now)

- `strategy`
- `recipe`
- `workflow`
- `skill`
- `filesystem`

## Canonical Submission Type Definitions (Source of Truth)

Use this block as the only canonical definition set for submission types.
Other docs should reference this section instead of redefining type semantics.

| Type | Use when | Not for |
| --- | --- | --- |
| `strategy` | The primary shareable outcome is decision logic and state transitions. | Purely mechanical step-by-step automation with no strategy logic. |
| `recipe` | You are sharing a directly executable automation artifact users can run as-is. | High-level strategy narratives without concrete execution shape. |
| `workflow` | You are sharing orchestration flow across multiple steps/tools/services. | Single-action automations that do not need orchestration. |
| `skill` | You are sharing reusable agent capability instructions/tooling conventions. | End-user automations that should be runnable as recipes/workflows. |
| `filesystem` | You are sharing file structure/templates/assets as the main value. | Behavior-first automations where files are secondary. |

## Canonical Object (v0)

```json
{
  "id": "strategy-limit-order-alert",
  "name": "Limit Order Alert Strategy",
  "type": "strategy",
  "summary": "Alert target prices hit.",
  "category": "strategies/alerts",
  "repo": "https://github.com/user/repo",
  "homepage": "https://example.com",
  "license": "MIT",
  "status": "active",
  "verification": {
    "tier": "unverified",
    "lastVerifiedAt": null
  },
  "capability": {
    "trigger": "price-threshold",
    "inputs": [{ "name": "token", "type": "string", "required": true }],
    "outputs": [{ "name": "alertSent", "type": "boolean" }],
    "sideEffects": ["writes-file"],
    "failureModes": ["rate-limit", "invalid-symbol"],
    "implementation": {
      "primitives": ["recipe", "workflow"],
      "notes": "Optional decomposition of how the strategy is implemented."
    }
  },
  "security": {
    "permissions": ["read-market-data", "send-message"],
  },
  "evidence": {
    "setup": "https://...",
    "example": "https://..."
  },
  "tags": ["alerts", "automation"]
}
```

## Required Fields

- `id`, `name`, `type`, `summary`
- `category`
- `repo` or `homepage` (at least one)
- `license`
- `status`
- `verification.tier`
- `security.permissions`
- `tags`

## Type-Specific Requirements

- `strategy`, `recipe`, `workflow`:
  - `capability.trigger`, `capability.inputs`, `capability.outputs`, `capability.sideEffects`
- `skill`, `filesystem`:
  - concise interface description in `summary`
  - reproducible setup in `evidence.setup`
  - explicit side effects in `capability.sideEffects` (if any)

## Source Layout Guidance

- Entry markdown files should live in one of these lanes:
  - `skills/community/<category>/<entry-slug>.md` (valid, non-synced community lane)
  - `skills/official/<category>/<entry-slug>.md` (synced/exported lane)
- `workflow` submissions should keep docs and runnable artifacts colocated:
  - `workflows/<workflow-folder>/README.md`
  - `workflows/<workflow-folder>/references/<artifact>@latest.ts`
  - optional additional docs under `workflows/<workflow-folder>/references/` for deep implementation notes
- Workflow artifact filenames must not start with `workflow-`.
- For optional directory conventions, align with the workflow skill guidance in `skills/official/sandbox/workflows/SKILL.md`.

### Skill Content Addendum (for `type: skill`)

- Include a `Skill Spec` section in the markdown body (see `skill-entry-template.md`).
- Align fields with Agent Skills conventions (`https://agentskills.io/specification`):
  - skill name (lowercase-hyphen, 1-64 chars)
  - skill description (what it does + when to use)
  - optional compatibility notes
  - optional allowed-tools list
  - `SKILL.md` path in source repo

## Strategy/Recipe Behavior Note

- Strategy entries should describe states and transitions when behavior changes over time.
- Recipe entries should describe states and transitions when behavior changes over time.
- Markov-chain-like transition framing is acceptable when it improves clarity.
- Recipes can be submitted as top-level entries and can also be referenced as implementation primitives inside strategy entries.

## Validation Rules

Automated checks in current v0 workflow template
(`.github/workflows/validate-metadata.yml`):

- `id` must be lowercase kebab-case.
- `type` must be one of the v0 supported submission types.
- `status` must be one of: `active`, `experimental`, `archived`.
- `summary` max length: 140 chars.
- `verification.tier` must be `unverified` or `verified`.
- If `verification.tier = verified`, `verification.lastVerifiedAt` is required.
- For `strategy`, `recipe`, `workflow`: body must include
  Trigger/Inputs/Outputs/Side effects/Failure modes sections.

Manual review policy checks in v0 (not fully automated yet):

- `id` should be globally unique.
- `tags` should have a max count of 12.
- `security.permissions` should be explicit; no wildcard strings.
- `workflow` submissions should follow the source layout guidance above and keep path references valid.
- Entry file lane should match sync intent (`skills/community/*` for non-synced, `skills/official/*` for synced/exported).

## Why This Is Small

- It matches what users can submit and maintainers can review now.
- It avoids promising automation that is not implemented yet.
- It can be expanded after v0 submission quality is stable.
