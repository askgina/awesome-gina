# Contributing To Awesome Gina

Use this guide for all submissions.

## 1) Choose Submission Type

Allowed types:

- strategy
- recipe
- workflow
- skill
- filesystem

Canonical definitions: docs/specs/capability-schema.md.

## 2) Choose Canonical Location

For `recipe`, `strategy`, and `workflow`, this repository acts as the CMS source of truth:

- `recipe` -> `recipes/<subcategory>/<entry-slug>.md`
- `strategy` -> `strategies/<subcategory>/<entry-slug>.md`
- `workflow` -> `workflows/<workflow-folder>/README.md`
  - Keep runnable artifacts under `workflows/<workflow-folder>/references/<artifact>@latest.ts`

For `skill` and `filesystem`, use lanes under `skills/`:

- `skills/community/<category>/<entry-slug>.md` (default, non-synced)
- `skills/official/<category>/<entry-slug>.md` (synced/exported)

Lane rules for skills/filesystem:

- `skills/community/*` is for valid community submissions that are not synced/exported.
- `skills/official/*` is the synced source for ClawHub ingestion.
- Maintainers can promote entries from `skills/community/*` to `skills/official/*` when ready.

## 3) Author Your Entry

Use:

- docs/specs/skill-entry-template.md for structure
- docs/specs/worked-submission-examples.md for examples

Required frontmatter fields:

- id, name, type, summary, category
- slug, version, visibility
- publicUrl (required when `visibility: public`)
- status, license
- repo or homepage (at least one)
- verification.tier
- tags

Required metadata for primitive cross-linking:

- `strategy`: `relationships.recipeIds` (required), `relationships.workflowIds` (optional)
- `recipe` and `workflow`: `relationships.strategyIds` (optional)

Required body content for `strategy`, `recipe`, `workflow`:

- Trigger
- Inputs
- Outputs
- Side effects
- Failure modes
- Strategy-linked workflow READMEs must include a /create-compatible recurring
  schedule line, such as
  `- Trigger: recurring schedule \`7 */2 * * *\` in \`Europe/London\`.`

Recommended visual aids for `strategy`, `recipe`, and `workflow`:

- Add a concise Mermaid diagram when it clarifies behavior that bullets make hard to scan.
- Useful diagrams show state transitions, schedule-to-action flow, workflow branches, actor/service boundaries, data or artifact flow, risk gates, and failure paths.
- Skip diagrams that merely restate the capability contract; keep labels brief and avoid secrets or user-specific values.

## 4) Validate Before PR

Run:

- `ruby scripts/validate_primitives.rb`

This validates primitive metadata, strategy/recipe/workflow ID references, and
/create-compatible recurring schedules for strategy-linked workflows.

## 5) Safety And Policy

Before opening a PR:

- Remove all secret values (include names only).
- Declare side effects and permission scope explicitly.
- Add setup/evidence links.
- Confirm ownership/license of shared content.

Policy reference: docs/specs/security-legal-and-abuse-policy.md.

## 6) Pull Request Rules

- One submission concern per PR.
- Keep changes scoped and reviewable.
- Use the PR template.
- Expect unverified as default merged status.
- Verified is maintainer-assigned after validation.

Moderation runbook: docs/specs/pr-generation-and-moderation-runbook.md.

## 7) Labels

Maintainers use:

- needs-info
- verified
- unverified
- stale
- security-review
- abuse-report
