import { createHmac } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer } from "../server/bootstrap.js";

let server: Server;
let baseUrl: string;
const secret = "csrf-test-configured-server-secret";
const previous = process.env.MIRO_CSRF_SECRET;

beforeAll(async () => {
  process.env.MIRO_CSRF_SECRET = secret;
  server = await startServer({ port: 0 });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  if (previous === undefined) delete process.env.MIRO_CSRF_SECRET;
  else process.env.MIRO_CSRF_SECRET = previous;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe("server-configured CSRF protection", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])("rejects %s without cookies or a CSRF token", async (method) => {
    expect((await fetch(`${baseUrl}/unknown-route`, { method })).status).toBe(403);
  });
  it("rejects missing tokens when cookies are present", async () => {
    expect((await fetch(`${baseUrl}/unknown-route`, { method: "POST", headers: { cookie: "session=untrusted" } })).status).toBe(403);
  });
  it("rejects the former public fallback secret", async () => {
    const token = createHmac("sha256", "csrf-secret-1").update("miro_csrf").digest("hex");
    expect((await fetch(`${baseUrl}/unknown-route`, { method: "POST", headers: { "x-miro-csrf-token": token } })).status).toBe(403);
  });
  it("accepts the configured token and reaches routing", async () => {
    const token = createHmac("sha256", secret).update("miro_csrf").digest("hex");
    expect((await fetch(`${baseUrl}/unknown-route`, { method: "POST", headers: { "x-miro-csrf-token": token } })).status).toBe(404);
  });
  it("preserves read-only health checks", async () => {
    expect((await fetch(`${baseUrl}/api/health`)).status).toBe(200);
  });
});
