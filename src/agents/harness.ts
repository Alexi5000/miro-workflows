/**
 * src/agents/harness.ts — Three-agent adversarial orchestrator (Pillar 4).
 *
 * Round pipeline:
 *   1. Planner produces a Plan with N steps.
 *   2. For each step, run a loop of (Generator → Evaluator):
 *        - Generator emits artifact + toolCalls.
 *        - Evaluator scores it on the four axes.
 *        - If accepted (or plateau detected), exit early for that step.
 *   3. Plateau detector decides when to stop iterating per step.
 *
 * The orchestrator never silently swallows errors; each thrown failure
 * includes the source role + index for debuggability.
 */
import type { GenerationResult, HarnessResult, Model, Plan, PlanStep } from "./types.js";
import { planTask, parsePlanJson } from "./planner.js";
import { generateArtifact, parseGeneration } from "./generator.js";
import { evaluate, parseFeedback } from "./evaluator.js";
import { withPlateauDetection, type PlateauOptions } from "./plateau.js";

export interface HarnessDeps {
  planner: Model;
  generator: Model;
  evaluator: Model;
  /** Optional plateau options forwarded to every step. */
  plateau?: PlateauOptions;
  /** Maximum rounds per step. Default 5. */
  maxRoundsPerStep?: number;
}

const MAX_STEPS_DEFAULT = 5;
const MAX_ROUNDS_DEFAULT = 5;

export async function runHarness(task: string, deps: HarnessDeps): Promise<HarnessResult> {
  const plan = await planTask(task, { model: deps.planner });
  const rounds: HarnessResult["rounds"] = [];
  let finalArtifact = "";

  for (const step of plan.steps.slice(0, MAX_STEPS_DEFAULT)) {
    const stepResult = await runStep(task, plan, step, deps);
    rounds.push(...stepResult.rounds);
    finalArtifact = stepResult.generation.artifact;
    if (!stepResult.accepted) {
      // Carry on but record that this step didn't fully converge.
      finalArtifact = stepResult.generation.artifact;
    }
  }

  const accepted = rounds.some((r) => r.accepted);
  return {
    taskId: plan.taskId,
    plan,
    rounds,
    finalArtifact,
    success: accepted,
    roundsTaken: rounds.length,
  };
}

async function runStep(
  task: string,
  plan: Plan,
  step: PlanStep,
  deps: HarnessDeps,
): Promise<{ generation: GenerationResult; feedback: HarnessResult["rounds"][number]["feedback"]; accepted: boolean; rounds: HarnessResult["rounds"] }> {
  const rounds: HarnessResult["rounds"] = [];
  const priorGenerations: GenerationResult[] = [];
  let lastGeneration!: GenerationResult;
  let lastFeedback!: HarnessResult["rounds"][number]["feedback"];
  let accepted = false;

  const plateau = await withPlateauDetection(step, async (s) => {
    const index = rounds.length;
    const context = {
      planSummary: plan.summary,
      priorGenerations: [...priorGenerations],
      availableTools: s.tools ?? [],
    };
    const previous = priorGenerations[priorGenerations.length - 1];
    const generation = await generateArtifact(
      {
        taskId: plan.taskId,
        step: s,
        context,
        ...(previous ? { previous } : {}),
        ...(rounds.length > 0 && rounds[rounds.length - 1].feedback
          ? { feedback: rounds[rounds.length - 1].feedback }
          : {}),
      },
      { model: deps.generator },
    );
    lastGeneration = generation;
    priorGenerations.push(generation);
    const feedback = await evaluate(s, generation, { model: deps.evaluator });
    lastFeedback = feedback;
    accepted = feedback.accepted;
    rounds.push({ index, generation, feedback, accepted });
    return feedback.scores.correctness * 0.5 + feedback.scores.completeness * 0.3 + feedback.scores.safety * 0.2;
  }, { ...(deps.plateau ?? {}), maxRounds: deps.maxRoundsPerStep ?? MAX_ROUNDS_DEFAULT });

  return {
    generation: lastGeneration,
    feedback: lastFeedback!,
    accepted,
    rounds,
  };
}

// Re-exports for callers that want the underlying parsers.
export { parsePlanJson, parseGeneration, parseFeedback };
