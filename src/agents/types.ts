/**
 * src/agents/types.ts — shared types for the three-agent harness.
 *
 * The harness is intentionally model-agnostic: any function with the
 * `Model` shape — real LLM client, stubbed callable, or record-playback —
 * can drive Planner / Generator / Evaluator.
 */

export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * A `Model` is anything that takes a list of messages and returns a reply.
 * Strictly typed `(messages: ModelMessage[]) => Promise<string>` so it can
 * be stubbed in unit tests without HTTP.
 */
export type Model = (messages: ModelMessage[]) => Promise<string>;

export interface PlanStep {
  id: string;
  intent: string;
  /** Acceptance criteria the Evaluator will check. */
  acceptance: string[];
  /** Optional expected artifact shape (e.g. "Miro board layout with N frames"). */
  expectedArtifact?: string;
  /** Optional tools / functions the Generator can call for this step. */
  tools?: string[];
}

export interface Plan {
  taskId: string;
  summary: string;
  steps: PlanStep[];
}

export interface GenerationRequest {
  taskId: string;
  step: PlanStep;
  /** Context the Generator may consult (plan summary, prior generations). */
  context: GenerationContext;
  /** Previous candidate if Evaluator asked for a revision (else undefined). */
  previous?: GenerationResult;
  /** Feedback from the Evaluator on the previous attempt. */
  feedback?: EvaluatorFeedback;
}

export interface GenerationContext {
  planSummary: string;
  priorGenerations: GenerationResult[];
  availableTools: string[];
}

export interface GenerationResult {
  taskId: string;
  stepId: string;
  /** The artifact — Markdown, JSON, code, or anything string-serializable. */
  artifact: string;
  /** Which tools the Generator dispatched. */
  toolCalls: Array<{ tool: string; params: Record<string, unknown>; result: unknown }>;
  /** Free-form notes on decisions / confidence. */
  notes: string;
}

export interface EvaluatorFeedback {
  /** Per-axis grade in [0, 1]. */
  scores: GraderScores;
  /** One-paragraph rationale per axis. */
  rationale: Record<keyof GraderScores, string>;
  /** Concrete suggestions the Generator should incorporate next pass. */
  suggestions: string[];
  /** True when the artifact meets the acceptance criteria. */
  accepted: boolean;
}

export interface GenerationRound {
  index: number;
  generation: GenerationResult;
  feedback: EvaluatorFeedback;
  accepted: boolean;
}

export interface HarnessResult {
  taskId: string;
  plan: Plan;
  rounds: GenerationRound[];
  finalArtifact: string;
  /** True if any round was accepted. */
  success: boolean;
  /** Number of rounds taken (>= 1). */
  roundsTaken: number;
}

export interface GraderScores {
  correctness: number;
  safety: number;
  completeness: number;
  quality: number;
}

export const GRADER_AXES = ["correctness", "safety", "completeness", "quality"] as const;

export function emptyScores(): GraderScores {
  return { correctness: 0, safety: 0, completeness: 0, quality: 0 };
}
