# ADR-0006: Three-agent Planner → Generator → Evaluator harness

- Status: Accepted
- Date: 2026-07-05

## Context

The MCP server exposes 20 deterministic tools, but **deciding what to do**
with them for an open-ended user prompt ("build a sprint planning board for
Q3 with risks surfaced") is harder than calling the tools. We need a
planner that decomposes a task into checkable steps and a generator that
emits the artifacts, with a reviewer that catches both unsafe and
incomplete work.

Critically: a coding agent may not have an LLM during CI, so the harness
must be **model-agnostic** and deterministic against a stub.

## Decision

Build a small, composable three-agent harness under `src/agents/`:

- `types.ts` — shared types (`Model`, `Plan`, `GenerationResult`,
  `EvaluatorFeedback`, `GraderScores`).
- `planner.ts` — single-shot LLM call → `Plan` with `steps[]`, each with
  `acceptance` strings the Evaluator can check.
- `generator.ts` — per-step generator that accepts a `PlanStep`, prior
  generations, and the Evaluator's feedback from the previous round.
- `evaluator.ts` — per-step evaluator that scores four axes:
  `correctness`, `safety`, `completeness`, `quality`.
- `grader.ts` — pure-function four-axis scorer (offline, deterministic).
- `plateau.ts` — `withPlateauDetection(scorer, opts)` composable wrapper.
- `harness.ts` — orchestrator: per step, run a Generator ↔ Evaluator loop
  inside `withPlateauDetection`.
- `prompts/planner.ts` — system prompts for all three roles.
- `cli.ts` — `pnpm run agent:run -- "task"` invocation.

Every component is `Model`-shaped (`(messages) => Promise<string>`) so a
test can swap a stub. JSON parsing is tolerant of fences.

## Consequences

- ✅ Test-friendly: 12 unit tests cover parse, plateau, grading, harness
  end-to-end with deterministic stubs.
- ✅ Composable: `withPlateauDetection` is a higher-order function around
  any scorer; CI can wrap the offline grader.
- ✅ Honest: scores clamp to `[0, 1]`; forbidden-pattern hits reduce
  `safety` sharply; missing substrings reduce `completeness`.
- ⚠️ The harness is NOT autonomous. The user is expected to confirm the
  `Plan` before any MCP tool dispatch.
- ⚠️ We do NOT measure live LLM cost here — that requires a real model
  in the loop, which is documented as NOT measured in `docs/BENCHMARK.md`.

## Alternatives considered

- **Single-shot Model call**: rejected — no iteration, no safety review.
- **External agents framework (LangGraph, Autogen)**: rejected — adds
  framework commitment; our own is ~280 LoC.
- **Built-in retries inside the MCP tool handlers**: rejected — those are
  for transient I/O failures, not for adversarial review of an artifact.
