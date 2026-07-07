import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startOAuthDeviceFlow, pollOAuthDeviceFlow } from "./authService.js";
import { repository } from "../db/database.js";
import { seedBoards, seedCredentials, seedTemplates, seedWorkspaces } from "../../shared/seedData.js";

describe("OAuth device-flow round-trip (demo)", () => {
  beforeAll(async () => {
    process.env.MIRO_OAUTH_DEMO = "1";
    process.env.MIRO_WORKFLOWS_TOKEN_SECRET = "test-secret-test-secret-test-secret-32";
    process.env.MIRO_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    await repository.migrate();
    for (const w of seedWorkspaces) await repository.upsertWorkspace(w);
    for (const c of seedCredentials) await repository.upsertCredential(c);
    for (const b of seedBoards) await repository.upsertBoard(b);
    for (const t of seedTemplates) await repository.upsertTemplate(t);
  });
  afterAll(async () => {
    // noop — tests share the in-memory db; leave it.
  });

  it("starts a flow and round-trips a credential", async () => {
    const wsId = seedWorkspaces[0].id;
    const start = await startOAuthDeviceFlow({ workspaceId: wsId });
    expect(start.userCode).toBe("DEMO-CODE");
    expect(start.verificationUri).toMatch(/miro\.com/);

    const polled = await pollOAuthDeviceFlow(start.flowId);
    expect(polled.status).toBe("ok");
    if (polled.status === "ok") {
      expect(polled.credentialId).toBeTruthy();
      const creds = repository.listCredentialsByWorkspace(wsId);
      const created = creds.find((c) => c.id === polled.credentialId);
      expect(created?.fromOAuthDeviceFlow).toBe(true);
    }
  });

  it("returns 'expired' for a non-existent flowId", async () => {
    const result = await pollOAuthDeviceFlow("nonexistent-flow");
    expect(result.status).toBe("expired");
  });
});
