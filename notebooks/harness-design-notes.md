---
title: Harness Design Notes
kind: design-log
status: active
last_revised: 2026-07-05
---

# Harness Design Notes

Why the three-agent harness in `src/agents/` is structured the way it is.

## Goals

1. **Deterministic in CI.** No LLM HTTP calls from CI; the harness must
   run offline against a stubbed `Model`. Verified by
   `src/agents/harness.test.ts`.
2. **Composable.** The four-axis grader (`src/agents/grader.ts`) and the
   plateau detector (`src/agents/plateau.ts`) are independently testable and
   reusable.
3. **Honest.** Scores are clamped to `[0, 1]`, forbidden patterns reduce
   `safety` sharply, and missing substrings reduce `completeness`. No
   silent fudging.

## Non-goals

- We do NOT optimize for lowest latency. The harness is for **planning** —
  the dashboard or MCP server call that follows it owns the actual writes.
- We do NOT pretend the harness is autonomous. Every step requires a
  user-confirmed `Plan` before execution.

## Decisions

- **One pass per round.** The orchestrator wraps a single step in
  `withPlateauDetection` rather than spinning a global loop; this keeps
  per-step state small and debuggable.
- **JSON-tolerant parsers.** Every agent output is wrapped in fenced or
  bare-JSON-tolerant parsing; failures bubble up immediately.
- **Default weights.** `correctness=0.4`, `safety=0.2`, `completeness=0.3`,
  `quality=0.1`. Tunable per task via `grader.test.ts`.
- **Max rounds.** 5 per step, 5 steps per harness — the orchestrator caps
  blast radius.

## Open questions

- Should we store `Plan + rounds` as audit events in the SQLite layer? (Yes,
  pinned for next iteration.)
- Should `withPlateauDetection` mutate the artifact between rounds? Today
  the caller is expected to pass a mutating context; the wrapper itself
  is pure.
