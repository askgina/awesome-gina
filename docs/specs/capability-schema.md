# Capability Schema (v1 Dual Contribution Scope)

This schema is intentionally small and matches what is actually shippable now.

## Current Reality

- Contributions are submitted through manual PR flow in `this repository`.
- This repo is used as a CMS source for public `recipe`, `strategy`, and `workflow` entries.
- `skills/*` lanes remain active for `skill`/`filesystem` submissions and ClawHub sync/export.
- Runtime publication is still app-controlled, but metadata contract is validated in CI.

## Supported Submission Types (Shareable Now)

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
| `strategy` | The primary shareable outcome is decision logic and bundle coordination across recipes/workflows. | Purely mechanical step-by-step automation with no strategy logic. |
| `recipe` | You are sharing a directly executable automation artifact users can run as-is (prompt-based today, optionally invoking workflows). | High-level strategy narratives without concrete execution shape. |
| `workflow` | You are sharing orchestration code across multiple execution steps/tools/services. | Single-action automations that do not need orchestration. |
| `skill` | You are sharing reusable agent capability instructions/tooling conventions. | End-user automations that should be runnable as recipes/workflows. |
| `filesystem` | You are sharing file structure/templates/assets as the main value. | Behavior-first automations where files are secondary. |

## Canonical Object (v1)

```json
{
  "id": "strategy-limit-order-alert",
  "slug": "limit-order-alert",
  "name": "Limit Order Alert Strategy",
  "type": "strategy",
  "summary": "Alert target prices hit.",
  "category": "strategies/alerts",
  "repo": "https://github.com/user/repo",
  "homepage": "https://example.com",
  "license": "MIT",
  "version": "1.0.0",
  "visibility": "public",
  "publicUrl": "https://askgina.ai/recipe/b6e02727-b83a-4402-99bf-5640cc276e3e",
  "status": "active",
  "verification": {
    "tier": "unverified",
    "lastVerifiedAt": null
  },
  "relationships": {
    "recipeIds": ["recipe-btc-daily-buy-75-95"],
    "workflowIds": ["btc-hourly-sl"]
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
    "permissions": ["read-market-data", "send-message"]
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
- `slug`
- `category`
- `repo` or `homepage` (at least one)
- `license`
- `version`
- `visibility`
- `publicUrl` when `visibility = public`
- `status`
- `verification.tier`
- `security.permissions`
- `tags`

## Type-Specific Requirements

- `strategy`, `recipe`, `workflow`:
  - `capability.trigger`, `capability.inputs`, `capability.outputs`, `capability.sideEffects`
  - `relationships` for cross-linking:
    - `strategy`: non-empty `relationships.recipeIds`, optional `relationships.workflowIds`
    - `recipe`, `workflow`: optional `relationships.strategyIds`
- `skill`, `filesystem`:
  - concise interface description in `summary`
  - reproducible setup in `evidence.setup`
  - explicit side effects in `capability.sideEffects` (if any)

## Source Layout Guidance

- Canonical CMS primitive paths:
  - `strategy`: `strategies/<subcategory>/<entry-slug>.md`
  - `recipe`: `recipes/<subcategory>/<entry-slug>.md`
  - `workflow`: `workflows/<workflow-folder>/README.md`
- Workflow submissions should keep docs and runnable artifacts colocated:
  - `workflows/<workflow-folder>/README.md`
  - `workflows/<workflow-folder>/references/<artifact>@latest.ts`
  - optional additional docs under `workflows/<workflow-folder>/references/` for deep implementation notes
- Workflow artifact filenames must not start with `workflow-`.
- For optional directory conventions, align with the workflow skill guidance in `skills/official/sandbox/workflows/SKILL.md`.
- Skill/filesystem lane paths (sync model unchanged):
  - `skills/community/<category>/<entry-slug>.md` (non-synced default)
  - `skills/official/<category>/<entry-slug>.md` (synced/exported)

## Public URL Guidance

- `publicUrl` should point to the share page used by the main app/CMS.
- Current shared entries are typically under `https://askgina.ai/recipe/<uuid>`.
- If a share URL does not exist yet, keep `visibility: unlisted` and set `publicUrl: null`.

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
- Recipes can invoke workflow code as part of execution; workflows are implementation primitives that may be scheduled directly or run by recipes.
- Markov-chain-like transition framing is acceptable when it improves clarity.
- Recipes can be submitted as top-level entries and can also be referenced as implementation primitives inside strategy entries.

## Diagram Guidance

- Mermaid diagrams are recommended for `strategy`, `recipe`, and `workflow` entries when they make review easier. They are not a validation requirement.
- Good strategy diagrams show bundle coordination, state transitions, decision gates, risk gates, and links between recipes/workflows.
- Good recipe diagrams show schedule or trigger flow into runnable actions, default safety posture, and any handoff to workflow code.
- Good workflow diagrams show orchestration branches, tool/service boundaries, state or artifact outputs, and blocked/failure paths.
- Prefer `flowchart TD`, `stateDiagram-v2`, or `sequenceDiagram` based on what is clearest. Keep node labels short, public, and secret-free.
- Do not use a diagram as a substitute for the required Trigger, Inputs, Outputs, Side effects, and Failure modes sections.

## Validation Rules

Automated checks in
`.github/workflows/validate-primitives.yml`:

- `id` must be lowercase kebab-case.
- `type` must be one of the supported submission types.
- `slug` must be lowercase kebab-case.
- `version` must be semver.
- `visibility` must be one of: `public`, `unlisted`, `private`.
- `publicUrl` is required when `visibility = public`.
- `publicUrl`, when present, must be absolute (`https://...`) or app-relative (`/...`).
- `status` must be one of: `active`, `experimental`, `archived`.
- primitive `id` values must be globally unique.
- strategy relationship targets must exist and match type:
  - `relationships.recipeIds[]` -> existing `recipe` ids
  - `relationships.workflowIds[]` -> existing `workflow` ids
- recipe/workflow `relationships.strategyIds[]` targets must reference existing `strategy` ids.

## Why This Is Small

- It matches what users can submit and maintainers can review now.
- It avoids promising automation that is not implemented yet.
- It can be expanded further after submission quality is stable.
