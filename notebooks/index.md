---
title: Miro Workflows Notebooks
kind: index
status: active
last_revised: 2026-07-05
---

# Notebooks

> Authoring surface for **human** decision logs. Notebooks are **never**
> imported by runtime code — they exist so the team and coding agents have a
> shared place to reason about why decisions were made.

## Reading order

1. [[sprint-retro-template]] — the canonical retrospective template.
2. [[board-design-patterns]] — recorded patterns for laying out boards.
3. [[harness-design-notes]] — the reasoning behind the three-agent harness.

## Conventions

- One file per concept, linked by `[[wiki-style]]` cross-references.
- Every notebook has YAML front-matter with `title`, `kind`, `status`,
  `last_revised`.
- Notebooks should be ≤ 200 lines unless they're literal transcripts.
- Never copy secrets into a notebook.

## When to write one

- You make a load-bearing decision outside the codebase (e.g. we chose to
  demo-first instead of full OAuth).
- You discover a pattern that future agents/humans will need (e.g. "3×3
  grid for kanban with 360×240 spacing").
- You run a customer-facing session and want to capture the outcome.
