/**
 * src/agents/planner.ts — Planner role.
 *
 * Decomposes a user task into a Plan with checkable acceptance criteria.
 * Returns a Plan; throws on malformed model output.
 */
import type { Model, Plan } from "./types.js";
import { PLANNER_SYSTEM_PROMPT } from "./prompts/planner.js";

export interface PlannerDeps {
  model: Model;
  /** Max planning rounds — kept small because the Planner is single-pass. */
  maxTokens?: number;
}

/**
 * Generate a Plan for a free-form Miro Workflows task.
 *
 * The function is purposefully tiny: one model call, one JSON parse.
 * The Generator and Evaluator do the iterative work.
 */
export async function planTask(task: string, deps: PlannerDeps): Promise<Plan> {
  const raw = await deps.model([
    { role: "system", content: PLANNER_SYSTEM_PROMPT },
    { role: "user", content: `Task: ${task}\n\nReturn strict JSON plan only.` },
  ]);
  const parsed = parsePlanJson(raw);
  return parsed;
}

/**
 * JSON-tolerant extractor: handles fenced ```json ... ``` blocks as well as
 * bare JSON.
 */
export function parsePlanJson(raw: string): Plan {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  let value: unknown;
  try {
    value = JSON.parse(candidate);
  } catch (err) {
    throw new Error(`Planner returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!value || typeof value !== "object") throw new Error("Planner output is not an object.");
  const obj = value as Record<string, unknown>;
  const taskId = typeof obj.taskId === "string" ? obj.taskId : slugify(String(obj.summary ?? "task"));
  const summary = String(obj.summary ?? "").slice(0, 240);
  const stepsRaw = Array.isArray(obj.steps) ? obj.steps : [];
  if (stepsRaw.length === 0) throw new Error("Planner must return at least one step.");
  const steps = stepsRaw.map((rawStep, i) => normalizeStep(rawStep, i));
  return { taskId, summary, steps };
}

function normalizeStep(raw: unknown, index: number): Plan["steps"][number] {
  if (!raw || typeof raw !== "object") throw new Error(`Step ${index} is not an object.`);
  const s = raw as Record<string, unknown>;
  const id = typeof s.id === "string" ? s.id : `step-${index + 1}`;
  const intent = String(s.intent ?? "").trim();
  if (!intent) throw new Error(`Step ${index} is missing an intent.`);
  const acceptance = Array.isArray(s.acceptance) ? s.acceptance.map((a) => String(a)) : [];
  const expectedArtifact = typeof s.expectedArtifact === "string" ? s.expectedArtifact : undefined;
  const tools = Array.isArray(s.tools) ? s.tools.map((t) => String(t)) : [];
  return { id, intent, acceptance, expectedArtifact, tools };
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "task";
}
