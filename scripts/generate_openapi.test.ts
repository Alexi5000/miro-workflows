import { describe, it, expect } from "vitest";
import { generateOpenApi } from "./generate_openapi.js";

describe("OpenAPI 3.1 generator", () => {
  it("produces a valid OpenAPI 3.1 document", () => {
    const spec = generateOpenApi() as { openapi: string; info: { title: string; version: string }; paths: Record<string, unknown>; components: { securitySchemes: unknown } };
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("Miro Workflows API");
    expect(spec.info.version).toBe("1.0.0");
    expect(Object.keys(spec.paths).length).toBeGreaterThan(10);
    expect(spec.components.securitySchemes).toHaveProperty("bearerAuth");
  });

  it("includes the canonical 12-pillar surface (workspaces, boards, runs, audit, credentials, auth, webhooks, metrics)", () => {
    const spec = generateOpenApi() as { paths: Record<string, Record<string, unknown>> };
    const expectPresent = [
      "/api/health",
      "/api/summary",
      "/api/workspaces",
      "/api/boards",
      "/api/runs",
      "/api/audit-events",
      "/api/credentials",
      "/api/auth/tokens",
      "/api/webhooks/miro",
      "/metrics",
    ];
    for (const p of expectPresent) expect(spec.paths).toHaveProperty(p);
  });
});
