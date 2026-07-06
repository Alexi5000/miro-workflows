# Skills — agent-loadable instruction packs

`.agents/skills/` holds **authoring-time** instructions for coding agents.
They are **not** consumed at runtime.

A skill is a `SKILL.md` with a YAML front-matter descriptor:

```yaml
---
name: <kebab-name>
description: <one-line, machine-readable summary>
---
```

followed by markdown instructions.

## Authored skills

| Skill | Purpose |
| --- | --- |
| [`miro-board-design`](../.agents/skills/miro-board-design/SKILL.md) | Layout primitives for clear Miro boards. |
| [`mcp-tool-authoring`](../.agents/skills/mcp-tool-authoring/SKILL.md) | How to add a new tool to the MCP server. |
| [`fde-pillar-review`](../.agents/skills/fde-pillar-review/SKILL.md) | 12-pillar audit checklist. |

## Authoring a new skill

1. Pick a kebab-case name.
2. Create `.agents/skills/<name>/SKILL.md`.
3. Cap at ~120 lines. Sections should be:
   - **Do**
   - **Do not**
   - **Examples**
   - **References** to actual repo files
4. Reference the canonical docs (`README.md`, `AGENTS.md`, the matching
   pillar's ADRs).
5. Open a PR. CI does not lint skill contents — keep them short and opinionated.

## Do not

- Do not add a skill that imports runtime code.
- Do not put secrets in skills.
- Do not duplicate the contents of `docs/` — link instead.
