---
title: Board Design Patterns
kind: catalog
status: active
last_revised: 2026-07-05
---

# Board Design Patterns

Recorded compositions the team and agents reach for first. Each pattern has a
geometry, an example board, and the Miro tools to compose it.

## 3×3 kanban grid

```
+----------+----------+----------+
| Backlog  | Ready    | In Prog  |
+----------+----------+----------+
| Review   | Testing  | Done     |
+----------+----------+----------+
| Blocked  | Carry    | Ideas    |
+----------+----------+----------+
```

- 9 frames, each 360×240, top-left origin, 24px gutter.
- Stickies 200×200, evenly distributed inside each frame.
- Use `create_frame` then three `batch_create_items` calls per row.

## Two-lane swimlanes

- Top lane: user actions, 800×240.
- Bottom lane: system responses, 800×240.
- `create_connector` between matching steps, elbowed.

## Mind-map

- Center node at (0, 0).
- 6 satellites at 600px radius, 60° apart.
- Use `create_shape` for circles + `create_text` for labels.

## ER diagram

- One frame 1100×700 per entity, 80px pitch between attribute nodes.
- 280×140 cards inside each frame.

## Retro (4 quadrants)

- 2×2 frame grid, each 700×500.
- Each quadrant holds 3 stickies (write/done/learn/action).

> See `.agents/skills/miro-board-design/SKILL.md` for the agent-side
> version of these patterns.
