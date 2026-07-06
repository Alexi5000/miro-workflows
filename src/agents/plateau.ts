/**
 * src/agents/plateau.ts — Plateau-detection scorer wrapper (Pillar 6).
 *
 * `withPlateauDetection(scorer, opts)` composes around any function with
 * the shape `(input) => Promise<number | {composite: number}>` and watches
 * for stalls, regressions, or convergence across calls.
 */
import type { GraderScores } from "./types.js";

export interface PlateauOptions {
  /** Sliding window size. Default 3. */
  window?: number;
  /** Max rounds. Default 5. */
  maxRounds?: number;
  /** Stop when score delta over the window is below this. Default 1e-3. */
  epsilon?: number;
  /** Stop when a single round regresses by this much. Default 0.05. */
  regressionDelta?: number;
  /** Optional callback invoked after every round. */
  onObserve?: (round: number, observation: PlateauObservation) => void;
}

export interface PlateauObservation {
  round: number;
  /** Score from `scorer`, normalized to [0, 1]. */
  score: number;
  /** Mean score across the sliding window. */
  movingAverage: number;
  /** Variance across the sliding window. */
  variance: number;
  /** Status of this round. */
  status: "improving" | "plateau" | "regressing" | "converged";
  /** Full recent window. */
  window: number[];
}

export interface PlateauResult<T> {
  value: T;
  observations: PlateauObservation[];
  /** Final status after `maxRounds`. */
  finalStatus: PlateauObservation["status"];
  roundsTaken: number;
}

type Scorer<T> = (input: T) => Promise<number | { composite: number }>;

const DEFAULT_OPTS: Required<Omit<PlateauOptions, "onObserve">> = {
  window: 3,
  maxRounds: 5,
  epsilon: 1e-3,
  regressionDelta: 0.05,
};

/**
 * Wrap any `scorer` so that successive invocations are observed for
 * plateau / regression / convergence.
 *
 * The wrapped scorer runs `scorer` against the SAME input on every round —
 * callers are responsible for providing a mutating context (e.g. an
 * artifact that evolves between rounds). The wrapper's job is purely to
 * signal "stop iterating" to the orchestrator.
 */
export async function withPlateauDetection<T>(
  input: T,
  scorer: Scorer<T>,
  opts: PlateauOptions = {},
): Promise<PlateauResult<T>> {
  const o = { ...DEFAULT_OPTS, ...opts };
  const observations: PlateauObservation[] = [];
  const scoreWindow: number[] = [];
  let lastScore = -Infinity;

  for (let round = 0; round < o.maxRounds; round++) {
    const raw = await scorer(input);
    const score = typeof raw === "number" ? raw : clampUnit(raw.composite);
    scoreWindow.push(score);
    if (scoreWindow.length > o.window) scoreWindow.shift();
    const { mean, variance } = stats(scoreWindow);
    const delta = score - lastScore;
    const status: PlateauObservation["status"] = round === 0
      ? "improving"
      : delta <= -o.regressionDelta
        ? "regressing"
        : Math.abs(delta) < o.epsilon && variance < o.epsilon
          ? "converged"
          : plateauOrImproving(scoreWindow, o.epsilon);

    const obs: PlateauObservation = { round, score, movingAverage: round_(mean), variance: round_(variance), status, window: [...scoreWindow] };
    observations.push(obs);
    o.onObserve?.(round, obs);

    if (status === "converged" || status === "regressing") return { value: input, observations, finalStatus: status, roundsTaken: round + 1 };
    lastScore = score;
  }
  return { value: input, observations, finalStatus: observations[observations.length - 1]?.status ?? "improving", roundsTaken: observations.length };
}

function stats(values: number[]): { mean: number; variance: number } {
  if (values.length === 0) return { mean: 0, variance: 0 };
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return { mean, variance };
}

function plateauOrImproving(window: number[], epsilon: number): PlateauObservation["status"] {
  if (window.length < 2) return "improving";
  const delta = window[window.length - 1] - window[0];
  if (Math.abs(delta) < epsilon) return "plateau";
  return delta > 0 ? "improving" : "plateau";
}

function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round_(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Convenience: turn any sequence of `GraderScores` into the score stream
 * used by the harness. The "plateau input" is the composite of all axes
 * using the same weights the offline grader uses by default.
 */
export function gragerStream(): (s: GraderScores) => number {
  const w = { correctness: 0.4, safety: 0.2, completeness: 0.3, quality: 0.1 };
  return (s) => s.correctness * w.correctness + s.safety * w.safety + s.completeness * w.completeness + s.quality * w.quality;
}
