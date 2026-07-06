/**
 * src/agents/generator.ts — Generator role.
 *
 * Produces a single `GenerationResult` for a plan step. Optionally consumes
 * the previous attempt + Evaluator feedback to revise.
 */
import type { GenerationRequest, GenerationResult, Model } from "./types.js";
import { GENERATOR_SYSTEM_PROMPT } from "./prompts/planner.js";

export interface GeneratorDeps {
  model: Model;
}

export async function generateArtifact(req: GenerationRequest, deps: GeneratorDeps): Promise<GenerationResult> {
  const userPrompt = buildUserPrompt(req);
  const raw = await deps.model([
    { role: "system", content: GENERATOR_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);
  return parseGeneration(raw, req);
}

function buildUserPrompt(req: GenerationRequest): string {
  const { taskId, step, context, previous, feedback } = req;
  const sections: string[] = [];
  sections.push(`Plan taskId: ${taskId}`);
  sections.push(`Step id: ${step.id}`);
  sections.push(`Intent: ${step.intent}`);
  if (step.acceptance.length) sections.push(`Acceptance: ${step.acceptance.map((a) => `- ${a}`).join("\n")}`);
  if (step.expectedArtifact) sections.push(`Expected artifact: ${step.expectedArtifact}`);
  sections.push(`Available tools: ${(step.tools ?? []).join(", ") || "(any)"}`);
  sections.push(`Plan summary: ${context.planSummary}`);
  if (context.priorGenerations.length) {
    sections.push("Prior generations:\n" + context.priorGenerations.map((g, i) => `[${i + 1}] step=${g.stepId}\n${g.artifact}`).join("\n\n"));
  }
  if (previous) {
    sections.push(`Previous attempt artifact:\n${previous.artifact}`);
  }
  if (feedback) {
    sections.push(`Evaluator feedback (scores=${JSON.stringify(feedback.scores)}):\n${feedback.rationale}\nSuggestions:\n${feedback.suggestions.map((s) => `- ${s}`).join("\n")}`);
  }
  sections.push("Return STRICT JSON only.");
  return sections.join("\n\n");
}

export function parseGeneration(raw: string, req: GenerationRequest): GenerationResult {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  let value: unknown;
  try {
    value = JSON.parse(candidate);
  } catch (err) {
    throw new Error(`Generator returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!value || typeof value !== "object") throw new Error("Generator output is not an object.");
  const obj = value as Record<string, unknown>;
  const artifact = typeof obj.artifact === "string" ? obj.artifact : "";
  if (!artifact) throw new Error("Generator returned empty artifact.");
  const toolCalls = Array.isArray(obj.toolCalls) ? obj.toolCalls.map(normalizeToolCall) : [];
  const notes = typeof obj.notes === "string" ? obj.notes : "";
  return { taskId: req.taskId, stepId: req.step.id, artifact, toolCalls, notes };
}

function normalizeToolCall(raw: unknown): GenerationResult["toolCalls"][number] {
  if (!raw || typeof raw !== "object") return { tool: "unknown", params: {}, result: undefined };
  const r = raw as Record<string, unknown>;
  return {
    tool: String(r.tool ?? "unknown"),
    params: (r.params && typeof r.params === "object" ? r.params : {}) as Record<string, unknown>,
    result: r.result,
  };
}
