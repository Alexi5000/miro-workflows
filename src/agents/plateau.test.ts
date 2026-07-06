import { describe, it, expect } from "vitest";
import { withPlateauDetection } from "./plateau.js";

describe("plateau — detection wrapper (Pillar 6)", () => {
  it("stops early on convergence when the scorer returns identical scores", async () => {
    const observations: number[] = [];
    const result = await withPlateauDetection("input", async () => 0.8, {
      maxRounds: 10,
      window: 3,
      epsilon: 1e-3,
      regressionDelta: 0.05,
      onObserve: (_round, obs) => observations.push(obs.score),
    });
    expect(result.roundsTaken).toBeLessThan(10);
    expect(result.finalStatus).toBe("converged");
    expect(observations.length).toBeGreaterThanOrEqual(2);
  });

  it("flags regression and exits", async () => {
    let n = 0;
    const result = await withPlateauDetection("input", async () => {
      n++;
      // Drop sharply after the first observation.
      return n === 1 ? 1 : 0.5;
    }, { maxRounds: 8, window: 3, regressionDelta: 0.05 });
    expect(result.finalStatus).toBe("regressing");
    expect(result.roundsTaken).toBeLessThanOrEqual(3);
  });

  it("keeps iterating while the streak is improving", async () => {
    const scores = [0.1, 0.3, 0.5, 0.7, 0.9];
    let i = 0;
    const result = await withPlateauDetection("input", async () => {
      const value = scores[i] ?? 0.95;
      i++;
      return value;
    }, { maxRounds: 5, window: 2, epsilon: 1e-3 });
    expect(result.roundsTaken).toBe(5);
  });

  it("is composable around any scorer — including a throwing one", async () => {
    await expect(
      withPlateauDetection("input", async () => {
        throw new Error("upstream blip");
      }, { maxRounds: 1 }),
    ).rejects.toThrow(/upstream blip/);
  });
});
