import { describe, it, expect } from "vitest";
import { runHarness } from "./harness.js";
import { gradeArtifact } from "./grader.js";
import type { Model } from "./types.js";

function makeEchoModel(): Model {
  return async (messages) => {
    const system = messages[0]?.content ?? "";
    if (system.startsWith("You are the Planner")) {
      return JSON.stringify({
        taskId: "demo",
        summary: "Echo-model demo plan.",
        steps: [
          {
            id: "step-1",
            intent: "Lay out a frame with a title and three stickies.",
            acceptance: ["frame present", "stickies present", "title present"],
            tools: ["create_frame", "create_sticky_note", "create_text"],
          },
          {
            id: "step-2",
            intent: "Connect the three stickies into a flow.",
            acceptance: ["two connectors present"],
            tools: ["create_connector"],
          },
        ],
      });
    }
    if (system.startsWith("You are the Generator")) {
      return JSON.stringify({
        taskId: "demo",
        stepId: "step-1",
        artifact: "Title frame with three sticky-note cells; text title at top.",
        toolCalls: [
          { tool: "create_frame", params: {}, result: { id: "f" } },
          { tool: "create_sticky_note", params: {}, result: { id: "s1" } },
          { tool: "create_text", params: {}, result: { id: "t1" } },
        ],
        notes: "demo",
      });
    }
    if (system.startsWith("You are the Evaluator")) {
      const artifact = messages[messages.length - 1]?.content.split("Artifact:\n")[1] ?? "";
      const score = gradeArtifact(artifact, {
        requiredSubstrings: ["frame", "sticky-note", "title"],
      });
      return JSON.stringify({
        scores: {
          correctness: score.correctness,
          safety: score.safety,
          completeness: score.completeness,
          quality: score.quality,
        },
        rationale: score.rationale,
        suggestions: score.flags,
        accepted: score.composite >= 0.7,
      });
    }
    return "{}";
  };
}

describe("three-agent harness (Pillar 4)", () => {
  it("plans, generates, and evaluates a Miro board task end-to-end", async () => {
    const model = makeEchoModel();
    const result = await runHarness("Demo task", { planner: model, generator: model, evaluator: model });
    expect(result.plan.steps.length).toBeGreaterThanOrEqual(1);
    expect(result.rounds.length).toBeGreaterThanOrEqual(1);
    expect(result.finalArtifact.length).toBeGreaterThan(0);
    expect(result.success).toBe(true);
  });

  it("records the round-by-round feedback", async () => {
    const model = makeEchoModel();
    const result = await runHarness("Demo task", { planner: model, generator: model, evaluator: model });
    for (const round of result.rounds) {
      expect(round.feedback.scores).toBeDefined();
      expect(round.index).toBeGreaterThanOrEqual(0);
    }
  });

  it("planner output is rejected when JSON is malformed", async () => {
    const bad: Model = async () => "not json at all";
    await expect(runHarness("x", { planner: bad, generator: bad, evaluator: bad })).rejects.toThrow(/Planner/);
  });
});
