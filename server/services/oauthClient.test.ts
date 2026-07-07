import { describe, it, expect } from "vitest";
import { FakeMiroOAuthClient, HttpMiroOAuthClient } from "./oauthClient.js";

describe("FakeMiroOAuthClient (demo)", () => {
  it("returns a deterministic device code", async () => {
    const client = new FakeMiroOAuthClient();
    const r1 = await client.requestDeviceCode();
    const r2 = await client.requestDeviceCode();
    expect(r1.userCode).toBe("DEMO-CODE");
    expect(r2.userCode).toBe("DEMO-CODE");
    expect(r1.deviceCode).toMatch(/^dev-/);
  });

  it("returns ok on the first poll (demo mode short-circuits the round-trip)", async () => {
    const client = new FakeMiroOAuthClient();
    const result = await client.pollForToken();
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.tokens.accessToken).toMatch(/^demo-/);
  });
});

describe("HttpMiroOAuthClient (network errors surface clearly)", () => {
  it("surfaces non-2xx device-code requests", async () => {
    const client = new HttpMiroOAuthClient({
      baseUrl: "https://example.invalid",
      fetchImpl: (async () => new Response("nope", { status: 500 })) as typeof fetch,
    });
    await expect(client.requestDeviceCode({ clientId: "x" })).rejects.toThrow(/500/);
  });
});
