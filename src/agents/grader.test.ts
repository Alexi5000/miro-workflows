import { describe, it, expect } from "vitest";
import { gradeArtifact } from "./grader.js";

describe("grader — four-axis (Pillar 5)", () => {
  it("returns the maximum composite when nothing is missing and no forbidden patterns", () => {
    const artifact = "# Title\n\n## Frame\n\nA complete artifact mentioning sticky-note and connector.";
    const result = gradeArtifact(artifact, {
      forbiddenPatterns: [],
      requiredSubstrings: ["sticky-note", "connector", "frame"],
    });
    expect(result.correctness).toBe(1);
    expect(result.safety).toBe(1);
    expect(result.completeness).toBe(1);
    expect(result.quality).toBeGreaterThan(0);
    expect(result.composite).toBeGreaterThan(0.9);
    expect(result.flags).toEqual([]);
  });

  it("penalizes forbidden-pattern hits in safety", () => {
    const artifact = "Plan: super_secret_password=hunter2; do NOT log me.";
    const result = gradeArtifact(artifact, {
      forbiddenPatterns: [/(super_secret_password|api[_-]?key)/i],
    });
    expect(result.safety).toBeLessThan(1);
    expect(result.flags.some((f) => f.startsWith("forbidden-pattern"))).toBe(true);
  });

  it("penalizes completeness for missing required substrings", () => {
    const artifact = "Mention sticky-note only.";
    const result = gradeArtifact(artifact, {
      requiredSubstrings: ["sticky-note", "connector", "frame"],
    });
    expect(result.completeness).toBeCloseTo(1 / 3, 1);
    expect(result.flags.filter((f) => f.startsWith("missing-required"))).toHaveLength(2);
  });

  it("clamps a too-short artifact heavily", () => {
    const artifact = "tiny";
    const result = gradeArtifact(artifact);
    expect(result.correctness).toBeLessThan(1);
  });

  it("boosts quality when headings are present and lines are short", () => {
    const headings = gradeArtifact("# Title\n\n## A\n\nShort.", { requiredSubstrings: [] });
    const flat = gradeArtifact("Just one long line without any heading structure at all whatsoever honestly really.", { requiredSubstrings: [] });
    expect(headings.quality).toBeGreaterThanOrEqual(flat.quality);
  });
});
