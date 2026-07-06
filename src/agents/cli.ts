#!/usr/bin/env tsx
/**
 * src/agents/cli.ts — Invoke the three-agent harness from a script.
 *
 * Usage:
 *   pnpm run agent:run -- "Build a sprint planning board with 6 columns"
 *
 * When no `LLM_*` env vars are set, falls back to a deterministic stub
 * Model so the harness runs offline (useful in CI).
 */
import { runHarness } from "./harness.js";
import { gradeArtifact } from "./grader.js";
import type { Model } from "./types.js";

interface CliEnv {
  planner?: Model;
  generator?: Model;
  evaluator?: Model;
}

async function loadModels(env: CliEnv = {}): Promise<Required<Pick<CliEnv, "planner" | "generator" | "evaluator">>> {
  if (env.planner && env.generator && env.evaluator) {
    return env as Required<CliEnv>;
  }
  // No live LLM configured — use deterministic stubs based on the offline grader.
  const stub: Model = async (messages) => {
    const userMsg = messages[messages.length - 1]?.content ?? "";
    if (messages[0]?.content.startsWith("You are the Planner")) {
      // Mimic a minimal valid plan.
      return JSON.stringify({
        taskId: "stub-task",
        summary: "Stub plan for offline harness runs.",
        steps: [
          {
            id: "step-1",
            intent: "Create a board with a centered title frame.",
            acceptance: ["title frame visible", "board has at least one frame"],
            tools: ["create_board", "create_frame", "create_text"],
          },
        ],
      });
    }
    if (messages[0]?.content.startsWith("You are the Generator")) {
      return JSON.stringify({
        taskId: "stub-task",
        stepId: "step-1",
        artifact: "Title frame with rubric. Mentions frame, sticky-note, and connector.",
        toolCalls: [{ tool: "create_frame", params: { board_id: "x", title: "T", x: 0, y: 0, width: 600, height: 800 }, result: { id: "f1" } }],
        notes: "Offline stub.",
      });
    }
    if (messages[0]?.content.startsWith("You are the Evaluator")) {
      const artifact = userMsg.split("Artifact:\n")[1] ?? "";
      const score = gradeArtifact(artifact);
      return JSON.stringify({
        scores: {
          correctness: score.correctness,
          safety: score.safety,
          completeness: score.completeness,
          quality: score.quality,
        },
        rationale: score.rationale,
        suggestions: score.flags.length ? score.flags : [],
        accepted: score.correctness >= 0.8 && score.safety >= 0.8 && score.completeness >= 0.7,
      });
    }
    return "{}";
  };
  return { planner: stub, generator: stub, evaluator: stub };
}

async function main() {
  const args = process.argv.slice(2);
  const task = args.join(" ").trim() || "Build a sprint planning board with 6 columns";
  const models = await loadModels({});
  const result = await runHarness(task, models);
  console.log(JSON.stringify({
    taskId: result.taskId,
    success: result.success,
    rounds: result.rounds.length,
    finalArtifact: result.finalArtifact.slice(0, 800),
    steps: result.plan.steps.length,
  }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Agent harness failed:", err);
    process.exit(1);
  });
}
