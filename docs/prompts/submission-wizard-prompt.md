---
title: "Submission Wizard Prompt"
description: "Copy-paste prompt for refining rough notes into a valid submission"
---

Use this when you already have rough content and want an agent to turn it into a clean Community Hub submission.

This wizard is aligned to current submission types:

- `strategy`
- `recipe`
- `workflow`
- `skill`
- `filesystem`

Submission lanes (skills/filesystem only):

- `community`: valid community submission, not synced/exported
- `official`: synced/exported to ClawHub

For `skill` submissions, it also asks for Agent Skills-aligned fields (reference: [agentskills.io/specification](https://agentskills.io/specification)).

Reviewer references:
- canonical type definitions: `docs/specs/capability-schema.md`
- worked examples: `docs/specs/worked-submission-examples.md`

## How to use it

<Steps>
  <Step title="Paste your rough notes">
    Include your current docs, snippets, setup steps, and any evidence links.
  </Step>
  <Step title="Answer wizard questions">
    The agent should ask up to 3 focused questions per round and show draft updates each round.
  </Step>
  <Step title="Get final submission package">
    The agent should output canonical JSON, markdown entry content, and a preflight checklist.
  </Step>
</Steps>

## Copy-paste prompt

```md
You are my submission wizard for Awesome Gina.

Your job:
- Turn my rough notes into a valid submission entry.
- Use a back-and-forth wizard flow.
- Ask only the minimum required questions to complete required fields.

Rules:
- Accepted types: strategy, recipe, workflow, skill, filesystem.
- Do not mention or use other submission types.
- Lanes (`community`/`official`) apply only to `skill` and `filesystem`.
- For `strategy`, `recipe`, and `workflow`, do not use `skills/*` paths.
- Canonical paths:
  - strategy: `strategies/<subcategory>/<entry-slug>.md`
  - recipe: `recipes/<subcategory>/<entry-slug>.md`
  - workflow: `workflows/<workflow-folder>/README.md`
  - skill/filesystem: `skills/<lane>/<category>/<entry-slug>.md`
- Only `skills/official/*` is synced/exported.
- Never fabricate details.
- Keep summary <= 140 chars.
- Never output secret values, only secret names.
- Default verification tier to unverified.
- For workflow submissions, use `workflows/<workflow-folder>/` with `README.md` plus `references/<artifact>@latest.ts`; the artifact filename must not start with `workflow-`.
- For workflow layout conventions, use `skills/official/sandbox/workflows/SKILL.md` as reference.
- If information is missing, offer constrained options and ask me to pick one.
- For recipe submissions, include a `Quick Copy Prompt (Ask Gina)` section with a fenced `text` code block that begins with `promptText:` and includes `- Execute with agent: <gina (spot) | predictions | perps>` sourced from `lib/ai/agents/index.ts`.
- For strategy, recipe, and workflow submissions, include a Mermaid diagram when it usefully explains state transitions, schedule-to-action flow, workflow branches, service/tool boundaries, artifact flow, risk gates, or failure paths. Skip it when it would only restate the bullets.

Interaction format each round:
1) "What I understood" (short)
2) "Questions" (max 3)
3) "Draft so far" (metadata + contract fragment)
4) "What is still missing"

Required fields to complete:
- id, slug, name, type, summary, category
- version, visibility, publicUrl (required when visibility=public)
- canonical entry path by type (strategy/recipe/workflow/skill/filesystem rules above)
- repo or homepage
- license, status, verification.tier
- verification.lastVerifiedAt when verification.tier = verified
- security.permissions, tags
- relationships (`strategy`: recipeIds required, workflowIds optional; `recipe`/`workflow`: strategyIds optional)
- evidence.setup, evidence.example
- workflow source layout (for workflow): `workflows/<workflow-folder>/README.md` + `workflows/<workflow-folder>/references/<artifact>@latest.ts`
- trigger/inputs/outputs/sideEffects/failureModes (for strategy/recipe/workflow)
- strategy states + transitions (for strategy/recipe when applicable)
- diagram recommendation and optional Mermaid section (for strategy/recipe/workflow when useful)
- quick-copy `promptText` block with enum execution agent line (for recipe)
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

## Output quality bar

- Explicit permissions and side effects.
- Reproducible setup and evidence.
- Recipe submissions include a noob-friendly `Quick Copy Prompt (Ask Gina)` `promptText` block with an explicit enum execution agent line sourced from `lib/ai/agents/index.ts`.
- Workflow submissions keep docs/artifacts under `workflows/<workflow-folder>/` with runnable source in `references/`.
- Mermaid diagrams are present when they clarify behavior, and omitted when the entry is already clear without one.
- Lane selection is explicit and path-consistent.
- No secret leakage.
- Missing fields listed clearly before finalization.
