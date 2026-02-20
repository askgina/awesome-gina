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

## 2) Author Your Entry

Create a file at one of:

- skills/community/<category>/<entry-slug>.md
- skills/official/<category>/<entry-slug>.md

Category roots:

- strategy -> strategies
- recipe -> recipes
- workflow -> workflows
- skill -> skills
- filesystem -> filesystem

Lane rules:

- `skills/community/*` is for valid community submissions that are not synced/exported.
- `skills/official/*` is the synced source for ClawHub ingestion.
- Maintainers can promote entries from `skills/community/*` to `skills/official/*` when ready.

Use:

- docs/specs/skill-entry-template.md for structure
- docs/specs/worked-submission-examples.md for examples

Required frontmatter fields:

- id, name, type, summary, category
- status, license
- repo or homepage (at least one)
- verification.tier
- tags

Required body content for strategy, recipe, workflow:

- Trigger
- Inputs
- Outputs
- Side effects
- Failure modes

## 3) Safety And Policy

Before opening a PR:

- Remove all secret values (include names only).
- Declare side effects and permission scope explicitly.
- Add setup/evidence links.
- Confirm ownership/license of shared content.

Policy reference: docs/specs/security-legal-and-abuse-policy.md.

## 4) Pull Request Rules

- One submission concern per PR.
- Keep changes scoped and reviewable.
- Use the PR template.
- Expect unverified as default merged status.
- Verified is maintainer-assigned after validation.

Moderation runbook: docs/specs/pr-generation-and-moderation-runbook.md.

## 5) Labels

Maintainers use:

- needs-info
- verified
- unverified
- stale
- security-review
- abuse-report
