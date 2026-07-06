/**
 * src/agents/grader.ts — Four-axis grader (Pillar 5).
 *
 * Composable: accept any model + step + artifact and return `{correctness,
 * safety, completeness, quality}` in [0,1] with rationales.
 *
 * Used by the harness (Evaluator role) and by `withPlateauDetection` (Pillar 6).
 */
import type { GraderScores, Model } from "./types.js";

export interface GraderInput {
  /** Optional free-text the Evaluator consults. */
  context?: string;
  /** Optional list of forbidden patterns (regex). Hits reduce `safety` sharply. */
  forbiddenPatterns?: RegExp[];
  /** Required substrings for `completeness`. */
  requiredSubstrings?: string[];
  /** Optional scoring weights (sum need not be 1). */
  weights?: Partial<GraderScores>;
}

export interface GraderScore extends GraderScores {
  /** Weighted total in [0, 1]. */
  composite: number;
  rationale: Record<keyof GraderScores, string>;
  flags: string[];
}

const DEFAULT_WEIGHTS: GraderScores = {
  correctness: 0.4,
  safety: 0.2,
  completeness: 0.3,
  quality: 0.1,
};

/**
 * Pure-function four-axis grader that does NOT call a model.
 *
 * Useful as a deterministic signal source for CI, plateau detection, and
 * tests. For rich reasoning, use the Model-backed Evaluator instead.
 */
export function gradeArtifact(artifact: string, input: GraderInput = {}): GraderScore {
  const flags: string[] = [];
  const weights = { ...DEFAULT_WEIGHTS, ...(input.weights ?? {}) };

  const forbidden = input.forbiddenPatterns ?? [];
  const forbiddenHits = forbidden.filter((re) => re.test(artifact));
  for (const _ of forbiddenHits) flags.push(`forbidden-pattern:${_.source}`);

  const required = input.requiredSubstrings ?? [];
  const missingRequired = required.filter((s) => !artifact.toLowerCase().includes(s.toLowerCase()));
  for (const m of missingRequired) flags.push(`missing-required:${m}`);

  const lengthPenalty = artifact.trim().length < 20 ? 0.5 : 1.0;

  const correctnessScore = lengthPenalty * (forbiddenHits.length === 0 ? 1 : Math.max(0, 1 - forbiddenHits.length * 0.3));
  const safetyScore = forbiddenHits.length === 0 ? 1 : Math.max(0, 1 - forbiddenHits.length * 0.5);
  const completenessScore = required.length === 0
    ? 1
    : Math.max(0, 1 - missingRequired.length / required.length);
  const qualityScore = qualityHeuristic(artifact);

  const scores: GraderScores = {
    correctness: round(correctnessScore),
    safety: round(safetyScore),
    completeness: round(completenessScore),
    quality: round(qualityScore),
  };

  const composite = round(
    scores.correctness * weights.correctness +
    scores.safety * weights.safety +
    scores.completeness * weights.completeness +
    scores.quality * weights.quality,
  );

  return {
    ...scores,
    composite,
    rationale: {
      correctness: forbiddenHits.length
        ? `forbidden-pattern hits=${forbiddenHits.length}`
        : `lengthOk=${lengthPenalty === 1}, no forbidden matches`,
      safety: forbiddenHits.length ? `forbidden-pattern hits=${forbiddenHits.length}` : "no forbidden-pattern hits",
      completeness: missingRequired.length
        ? `missing ${missingRequired.length} of ${required.length}`
        : `all ${required.length} required substrings present`,
      quality: `heuristic composite=${qualityScore}`,
    },
    flags,
  };
}

function qualityHeuristic(artifact: string): number {
  // Naive signal: has structured headings, balanced paragraphs, no run-on lines.
  const lines = artifact.split(/\r?\n/);
  const hasHeadings = lines.some((l) => /^#{1,6}\s/.test(l));
  const avgLineLen = lines.reduce((acc, l) => acc + l.length, 0) / Math.max(1, lines.length);
  const linePenalty = avgLineLen > 280 ? 0.7 : 1.0;
  return round(0.5 + 0.5 * (hasHeadings ? 1 : 0)) * linePenalty;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Build a `Model`-shaped grader that wraps `gradeArtifact`.
 * Useful for tests + composability with `withPlateauDetection`.
 */
export function offlineGraderModel(input: GraderInput = {}): Model {
  return async () => {
    const score = gradeArtifact("", input);
    return JSON.stringify(score);
  };
}
