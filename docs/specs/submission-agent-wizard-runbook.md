# Submission Agent Wizard Runbook (v0)

This runbook gives users a copy-paste prompt they can send to any agent to refine rough content into a standard submission.

## Goal

- Help a contributor move from messy notes to a valid community entry.
- Keep the process wizard-like: short Q&A rounds until required fields are complete.
- Enforce the v0 standard used by maintainers.

## Current Reality

- Submission path is manual PR to `this repository`.
- No live in-app publish API is required for this flow.
- Submission lanes:
  - `community` for valid non-synced submissions
  - `official` for synced/exported submissions
- Accepted submission types are only:
  - `strategy`
  - `recipe`
  - `workflow`
  - `skill`
  - `filesystem`

## Required Data Standard

The wizard must collect and normalize these fields:

Reference anchors:
- canonical type definitions: `capability-schema.md#canonical-submission-type-definitions-source-of-truth`
- worked examples: `worked-submission-examples.md`

- `id`, `name`, `type`, `summary`
- `category`
- `repo` or `homepage` (at least one)
- `license`
- `status`
- `verification.tier` (default `unverified`)
- `security.permissions`
- `tags`
- `lane` (`community` or `official`)
- entry path: `skills/<lane>/<category>/<entry-slug>.md`

For `workflow` submissions, also collect source layout details:

- workflow folder path under `workflows/<workflow-folder>/`
- colocated `README.md`
- `references/<artifact>@latest.ts` (artifact filename must not start with `workflow-`)
- optional additional docs under `references/` for deeper implementation details
- optional layout conventions should follow `skills/official/sandbox/workflows/SKILL.md`

For `strategy`, `recipe`, and `workflow`, require:

- `trigger`
- `inputs`
- `outputs`
- `sideEffects`
- `failureModes`

For `strategy` and `recipe`, also capture strategy behavior:

- strategy states
- transition conditions (Markov-chain-like framing is acceptable)

For `skill` and `filesystem`, require:

- interface summary (commands/tools/files exposed)
- setup requirements
- side effects and permission scope

For `skill`, also capture Agent Skills-aligned content fields:

- skill name (lowercase-hyphen, 1-64 chars)
- skill description (what + when to use)
- compatibility notes (optional)
- allowed tools list (optional, space-delimited)
- `SKILL.md` path and optional `scripts/`, `references/`, `assets/`

## Wizard Interaction Contract (For Agents)

Use this fixed interaction style:

1. Confirm what was understood from user input (2-4 lines).
2. Ask up to 3 high-value questions in the current round.
3. Show an updated draft fragment after each round.
4. Repeat until all required fields are complete.
5. End with a final packaged output (see "Final Output Contract").

Quality rules:

- Do not invent facts; ask when missing.
- Keep summaries under 140 chars.
- Ask for explicit permissions, not vague text.
- Never include secret values, only secret names.
- If user is unsure, provide constrained options and ask them to pick one.

## Wizard Question Flow

### Step 1: Classify and Scope

- Which type is this: `strategy`, `recipe`, `workflow`, `skill`, or `filesystem`?
- What user outcome does it produce in one sentence?
- Is this active, experimental, or archived?

### Step 2: Capability Contract

- What triggers execution?
- What are the required inputs and expected outputs?
- What side effects happen?
- What are common failure modes?

### Step 3: Strategy Layer (Strategy/Recipe)

- What states does the strategy move through?
- What condition causes each transition?
- What happens on uncertainty or missing data?

### Step 4: Security and Permissions

- What exact permissions are required?

### Step 4b: Skill Content Profile (Skill Only)

- What is the skill name in lowercase-hyphen form?
- What is the concise skill description ("what it does + when to use")?
- What is the `SKILL.md` path in the source repo?
- Are `scripts/`, `references/`, or `assets/` used?
- Any compatibility constraints or pre-approved tools?

### Step 5: Evidence and Repro

- Setup guide link or steps?
- Example run link/log/screenshot?
- What can a reviewer reproduce in under 10 minutes?

### Step 6: Metadata and Publishing

- Stable slug/id in kebab-case?
- Category path (example: `strategies/alerts` or `recipes/alerts`)?
- Repo/homepage and license confirmed?
- Which lane should this use: `community` (default, non-synced) or `official` (synced/exported)?
- Does entry path match `skills/<lane>/<category>/<entry-slug>.md`?
- For workflow submissions, does source layout match `workflows/<workflow-folder>/README.md` + `workflows/<workflow-folder>/references/<artifact>@latest.ts`?

## Final Output Contract

When all required data is collected, the agent must output:

1. Canonical JSON object aligned with `capability-schema.md`.
2. Markdown submission page aligned with `skill-entry-template.md`.
3. Entry path and lane decision summary.
4. Maintainer preflight checklist:
   - required fields complete
   - no secrets exposed
   - side effects + permissions explicit
   - evidence is reproducible

If anything is missing, include a `Missing Info` block and stop before finalizing.

## Copy-Paste Prompt for Users

```md
You are my submission wizard for Awesome Gina.

Your job:
- Turn my rough notes into a valid submission entry.
- Use a back-and-forth wizard flow.
- Ask only the minimum required questions to complete required fields.

Rules:
- Accepted types: strategy, recipe, workflow, skill, filesystem.
- Do not mention or use other submission types.
- Accepted lanes: community, official.
- Default lane to community unless the user explicitly asks for synced/exported placement.
- Entry path format: `skills/<lane>/<category>/<entry-slug>.md`.
- Only `skills/official/*` is synced/exported.
- Never fabricate details.
- Keep summary <= 140 chars.
- Never output secret values, only secret names.
- Default verification tier to unverified.
- For workflow submissions, use `workflows/<workflow-folder>/` with `README.md` plus `references/<artifact>@latest.ts`; the artifact filename must not start with `workflow-`.
- For workflow layout conventions, use `skills/official/sandbox/workflows/SKILL.md` as reference.
- If information is missing, offer constrained options and ask me to pick one.

Interaction format each round:
1) "What I understood" (short)
2) "Questions" (max 3)
3) "Draft so far" (metadata + contract fragment)
4) "What is still missing"

Required fields to complete:
- lane, id, name, type, summary, category
- entry path: `skills/<lane>/<category>/<entry-slug>.md`
- repo or homepage
- license, status, verification.tier
- verification.lastVerifiedAt when verification.tier = verified
- security.permissions, tags
- evidence.setup, evidence.example
- workflow source layout (for workflow): `workflows/<workflow-folder>/README.md` + `workflows/<workflow-folder>/references/<artifact>@latest.ts`
- trigger/inputs/outputs/sideEffects/failureModes (for strategy/recipe/workflow)
- strategy states + transitions (for strategy/recipe when applicable)
- interface summary + setup + side effects + permission scope (for skill/filesystem)
- skill name/description + SKILL.md path (+ optional compatibility/allowed tools) for skill

Once complete, output exactly:
1) Canonical JSON object
2) Markdown entry (frontmatter + body)
3) Entry path and lane decision summary
4) Preflight checklist for PR readiness

If anything is missing, include a `Missing Info` block and stop before finalizing.

My initial notes:
<PASTE NOTES HERE>
```

## Reviewer Acceptance Criteria

- Prompt produces iterative Q&A instead of one-shot assumptions.
- Final output conforms to the schema/template files above.
- Prompt never routes users into unsupported submission types.
- Strategy and recipe submissions include transition logic when relevant.
- Workflow submissions enforce the colocated directory pattern and path references resolve.
- Lane selection is explicit and entry path matches lane intent.
