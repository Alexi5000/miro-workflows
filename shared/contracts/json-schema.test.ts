import { describe, it, expect } from "vitest";
import { buildSprintJsonSchema, buildAuditJsonSchema } from "./json-schema.js";

describe("JSON-Schema emitter", () => {
  it("builds a draft-2020-12 sprint schema with required fields", () => {
    const schema = buildSprintJsonSchema();
    expect(schema.$schema).toMatch(/draft\/2020-12/);
    expect(schema.required ?? []).toEqual(expect.arrayContaining(["templateSlug", "triggeredBy"]));
    expect(schema.properties).toHaveProperty("templateSlug");
    expect(schema.properties).toHaveProperty("parameters");
  });

  it("builds an audit schema with the severity enum", () => {
    const schema = buildAuditJsonSchema();
    expect(schema.properties).toHaveProperty("severity");
    const severity = schema.properties.severity as { enum?: string[] };
    expect(severity.enum).toEqual(["info", "warning", "error"]);
    expect(schema.required).toEqual(expect.arrayContaining(["workspaceId", "eventType", "message"]));
  });
});
