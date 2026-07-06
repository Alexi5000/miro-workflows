/**
 * src/agents/evaluator.ts — Evaluator role.
 *
 * Scores a GenerationResult against the plan step's acceptance criteria,
 * returning structured four-axis feedback the harness + Generator consume.
 */
import { GRADER_AXES, type EvaluatorFeedback, type GenerationResult, type Model, type PlanStep } from "./types.js";
import { EVALUATOR_SYSTEM_PROMPT } from "./prompts/planner.js";

export interface EvaluatorDeps {
  model: Model;
}

export async function evaluate(
  step: PlanStep,
  artifact: GenerationResult,
  deps: EvaluatorDeps,
): Promise<EvaluatorFeedback> {
  const raw = await deps.model([
    { role: "system", content: EVALUATOR_SYSTEM_PROMPT },
    { role: "user", content: buildEvaluatorPrompt(step, artifact) },
  ]);
  return parseFeedback(raw);
}

function buildEvaluatorPrompt(step: PlanStep, result: GenerationResult): string {
  return [
    `Step id: ${step.id}`,
    `Intent: ${step.intent}`,
    `Acceptance: ${step.acceptance.map((a) => `- ${a}`).join("\n")}`,
    `Artifact:\n${result.artifact}`,
    result.notes ? `Generator notes:\n${result.notes}` : "",
    "Return STRICT JSON only.",
  ].filter(Boolean).join("\n\n");
}

export function parseFeedback(raw: string): EvaluatorFeedback {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  let value: unknown;
  try {
    value = JSON.parse(candidate);
  } catch (err) {
    throw new Error(`Evaluator returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!value || typeof value !== "object") throw new Error("Evaluator output is not an object.");
  const obj = value as Record<string, unknown>;
  const scoreObj = (obj.scores && typeof obj.scores === "object" ? obj.scores : {}) as Record<string, unknown>;
  const rationaleObj = (obj.rationale && typeof obj.rationale === "object" ? obj.rationale : {}) as Record<string, unknown>;
  const scores = {
    correctness: clampUnit(scoreObj.correctness),
    safety: clampUnit(scoreObj.safety),
    completeness: clampUnit(scoreObj.completeness),
    quality: clampUnit(scoreObj.quality),
  };
  const rationale = {
    correctness: String(rationaleObj.correctness ?? ""),
    safety: String(rationaleObj.safety ?? ""),
    completeness: String(rationaleObj.completeness ?? ""),
    quality: String(rationaleObj.quality ?? ""),
  };
  for (const axis of GRADER_AXES) if (!rationale[axis]) rationale[axis] = "(no rationale)";
  const suggestions = Array.isArray(obj.suggestions) ? obj.suggestions.map((s) => String(s)) : [];
  const accepted = typeof obj.accepted === "boolean"
    ? obj.accepted
    : scores.correctness >= 0.8 && scores.safety >= 0.8 && scores.completeness >= 0.7;
  return { scores, rationale, suggestions, accepted };
}

function clampUnit(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
