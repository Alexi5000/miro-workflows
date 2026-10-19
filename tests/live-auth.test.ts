import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { startServer } from "../server/bootstrap.js";
import { repository } from "../server/db/database.js";
import { issueToken, verifyBearer } from "../server/services/authService.js";
import { seedBoards, seedTemplates, seedWorkspaces } from "../shared/seedData.js";

let server: Server;
let base: string;
let own: string;
let foreign: Awaited<ReturnType<typeof issueToken>>;
const scopes = ["dashboard:read", "dashboard:write", "workspaces:read", "credentials:write", "runs:read", "runs:write", "audit:read", "webhooks:write"] as const;
beforeAll(async () => {
  await repository.migrate();
  for (const w of seedWorkspaces) await repository.upsertWorkspace(w);
  for (const b of seedBoards) await repository.upsertBoard(b);
  for (const t of seedTemplates) await repository.upsertTemplate(t);
  own = (await issueToken({ workspaceId: "tenant-isolated", label: "isolated", scopes: [...scopes], ttlSeconds: 3600 })).plaintext;
  foreign = await issueToken({ workspaceId: seedWorkspaces[0].id, label: "foreign", scopes: [...scopes], ttlSeconds: 3600 });
  process.env.MIRO_PROVIDER_MODE = "miro";
  server = await startServer({ port: 0 });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  delete process.env.MIRO_PROVIDER_MODE;
  await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
});
const call = (path: string, method = "GET", body?: unknown, token = own) => fetch(base + path, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
describe("live tenant authorization", () => {
  it.each(["/api/summary", "/api/workspaces", "/api/boards", "/api/templates", "/api/runs", "/api/audit-events", "/metrics"])("requires bearer on %s", async (path) => {
    expect((await fetch(base + path)).status).toBe(401);
  });
  it.each(["/api/runs", "/api/sync/boards"])("requires bearer before writes to %s", async (path) => {
    expect((await fetch(base + path, { method: "POST" })).status).toBe(401);
  });
  it.each(["/api/workspaces", "/api/boards", "/api/templates", "/api/runs", "/api/audit-events"])("does not leak foreign data on %s", async (path) => {
    const response = await call(path);
    expect(response.status).toBe(200);
    const data = (await response.json()).data;
    if (path === "/api/audit-events") expect(data.every((event: { workspaceId: string }) => event.workspaceId === "tenant-isolated")).toBe(true);
    else expect(data).toEqual([]);
  });
  it("does not expose global metrics to tenant credentials", async () => {
    const response = await call("/metrics");
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("/api/runs/");
  });
  it("scopes summary totals and lists", async () => {
    const body = await (await call("/api/summary")).json();
    expect(Object.values(body.totals)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(body.recentRuns).toEqual([]);
  });
  it("rejects foreign template execution before provider side effects", async () => {
    expect((await call("/api/runs", "POST", { templateSlug: seedTemplates[0].slug, triggeredBy: "test" })).status).toBe(403);
  });
  it("does not sync foreign boards", async () => {
    expect((await (await call("/api/sync/boards", "POST")).json()).data).toEqual([]);
  });
  it("hides foreign board items and templates", async () => {
    expect((await call(`/api/boards/${seedBoards[0].id}/items`)).status).toBe(404);
    expect((await call(`/api/templates/${seedTemplates[0].slug}`)).status).toBe(404);
  });
  it("prevents cross-tenant token revocation", async () => {
    expect((await call(`/api/auth/tokens/${foreign.id}`, "DELETE")).status).toBe(404);
    expect((await verifyBearer(`Bearer ${foreign.plaintext}`)).status).toBe("ok");
  });
  it("prevents granting scopes absent from issuer", async () => {
    expect((await call("/api/auth/tokens", "POST", { workspaceId: "tenant-isolated", label: "escalated", scopes: ["credentials:read"], ttlSeconds: 3600 })).status).toBe(403);
  });
  it("rejects foreign OAuth workspace", async () => {
    expect((await call(`/api/workspaces/${seedWorkspaces[0].id}/oauth/device-code`, "POST")).status).toBe(403);
  });
  it("does not pretend live credential revocation is implemented", async () => {
    expect((await call("/api/credentials/example", "DELETE")).status).toBe(501);
  });
});
