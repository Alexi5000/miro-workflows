import { describe, it, expect, beforeAll } from "vitest";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { repository } from "../server/db/database.js";
import { seedBoards, seedCredentials, seedTemplates, seedWorkspaces } from "../shared/seedData.js";
import { startServer } from "../server/bootstrap.js";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await repository.migrate();
  for (const workspace of seedWorkspaces) await repository.upsertWorkspace(workspace);
  for (const credential of seedCredentials) await repository.upsertCredential(credential);
  for (const board of seedBoards) await repository.upsertBoard(board);
  for (const template of seedTemplates) await repository.upsertTemplate(template);

  server = await startServer({ port: 0 });
  await new Promise<void>((resolve) => {
    if (server.listening) return resolve();
    server.once("listening", () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

describe("HTTP API", () => {
  it("GET /api/health returns 200 with mode", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.mode).toBe("demo");
  });

  it("GET /api/summary returns totals and demo integration", async () => {
    const res = await fetch(`${baseUrl}/api/summary`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totals.templates).toBeGreaterThan(0);
    expect(body.integration.mode).toBe("demo");
  });

  it("GET /api/templates lists the seeded templates", async () => {
    const res = await fetch(`${baseUrl}/api/templates`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.some((t: { slug: string }) => t.slug === "prd-to-board")).toBe(true);
  });

  it("POST /api/runs with valid payload returns 201 + detail", async () => {
    const res = await fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateSlug: "sprint-retro-system", triggeredBy: "vitest-http" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("completed");
    expect(body.id).toMatch(/^run-/);
  });

  it("POST /api/runs with invalid payload returns 400", async () => {
    const res = await fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/sprint contract/i);
  });

  it("POST /api/sync/boards returns one result per board", async () => {
    const res = await fetch(`${baseUrl}/api/sync/boards`, { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});
