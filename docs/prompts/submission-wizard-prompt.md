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
- Never fabricate details.
- Keep summary <= 140 chars.
- Never output secret values, only secret names.
- Default verification tier to unverified.
- If information is missing, offer constrained options and ask me to pick one.

Interaction format each round:
1) "What I understood" (short)
2) "Questions" (max 3)
3) "Draft so far" (metadata + contract fragment)
4) "What is still missing"

Required fields to complete:
- id, name, type, summary, category
- repo or homepage
- license, status, verification.tier
- verification.lastVerifiedAt when verification.tier = verified
- security.permissions, tags
- evidence.setup, evidence.example
- trigger/inputs/outputs/sideEffects/failureModes (for strategy/recipe/workflow)
- strategy states + transitions (for strategy/recipe when applicable)
- interface summary + setup + side effects + permission scope (for skill/filesystem)
- skill name/description + SKILL.md path (+ optional compatibility/allowed tools) for skill

Once complete, output exactly:
1) Canonical JSON object
2) Markdown entry (frontmatter + body)
3) Preflight checklist for PR readiness

If anything is missing, include a `Missing Info` block and stop before finalizing.

My initial notes:
<PASTE NOTES HERE>
```

## Output quality bar

- Explicit permissions and side effects.
- Reproducible setup and evidence.
- No secret leakage.
- Missing fields listed clearly before finalization.
