import { describe, it, expect } from "vitest";
import {
  buildSprintJsonSchema,
  buildAuditJsonSchema,
  buildRunResultJsonSchema,
  buildStartRunRequestJsonSchema,
  buildUpsertCredentialRequestJsonSchema,
  buildIssueTokenJsonSchema,
} from "./json-schema.js";

describe("JSON-Schema emitter (zod-to-json-schema)", () => {
  it("sprint schema: draft-2020-12, required templateSlug", () => {
    const s = buildSprintJsonSchema();
    expect(s.$schema).toMatch(/draft\/2020-12/);
    expect((s.required ?? [])).toContain("templateSlug");
    expect(s.properties).toHaveProperty("templateSlug");
  });

  it("audit schema: severity enum is info|warning|error, required fields present", () => {
    const s = buildAuditJsonSchema();
    expect(s.properties).toHaveProperty("severity");
    const severity = s.properties.severity as { enum?: string[] };
    expect(severity.enum).toEqual(["info", "warning", "error"]);
    expect((s.required ?? [])).toEqual(expect.arrayContaining(["workspaceId", "eventType", "message"]));
  });

  it("run-result schema: includes metrics + status enum", () => {
    const s = buildRunResultJsonSchema();
    expect(s.properties).toHaveProperty("metrics");
    expect(s.properties).toHaveProperty("status");
  });

  it("start-run request: required templateSlug", () => {
    const s = buildStartRunRequestJsonSchema();
    expect((s.required ?? [])).toContain("templateSlug");
  });

  it("upsert-credential request: required workspaceId, additionalProperties false", () => {
    const s = buildUpsertCredentialRequestJsonSchema();
    expect((s.required ?? [])).toContain("workspaceId");
    expect(s.additionalProperties).toBe(false);
  });

  it("issue-token auth: required label + scopes", () => {
    const s = buildIssueTokenJsonSchema();
    expect((s.required ?? [])).toEqual(expect.arrayContaining(["label", "scopes"]));
  });
});
