---
name: miro-board-design
description: Composition patterns for building clear Miro boards — grids, swimlanes, mind-maps, retros, and ER diagrams.
---

# miro-board-design

Use this skill when a prompt asks you to **design or lay out a Miro board**.
The MCP makes every item-placement call stateless; consistent geometry is what
makes a board readable.

## Layout primitives

| Pattern | Geometry | When to use |
| --- | --- | --- |
| **3×3 grid** | spacing 360 × 240, origin top-left | Sprint boards, kanban templates |
| **Swimlanes** | horizontal lanes 800 × 240, items 200×200 | Process flows, lifecycle diagrams |
| **Mind-map** | center node at (0, 0), satellites radius 600 | Brainstorms |
| **ER / node graph** | frames 1100×700 containing nodes 280×140 @ 80 pitch | Data models |
| **Retro** | four frames in 2×2, each 700×500 with 3–5 stickies | Retros, workshops |

## Do

- Pick a **frame for every named section** before placing stickies.
- Use **consistent color semantics** (yellow = opinion, blue = fact, pink = risk, green = action).
- Place a **title text** at `(0, 0)` for every board.
- Cap boards at 60 items before suggesting a second board; recommend splitting.
- Add a **legend frame** in the bottom-right when using ≥3 colors.

## Do not

- Do not place items at coordinates `(0, 0)` without a frame — they will overlap.
- Do not create shapes larger than 600×600 — readability suffers.
- Do not exceed 20 connectors per board — use sticky labels instead.

## Examples

See `examples/sample_prompts.md` for canonical prompts that yield each pattern.
See `docs/PROMPTS.md` for the curated prompt library.

## References

- `miro-custom-mcp/src/tools/` — every layout primitive is a tool.
- `miro-custom-mcp/EXAMPLES.md` — copy-pastable prompt + tool-call examples.
