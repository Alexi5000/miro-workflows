import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeMiroOAuthClient, HttpMiroOAuthClient, pickOAuthClient } from "./oauthClient";

afterEach(() => vi.unstubAllEnvs());

function transport(body: object, status = 200) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));
  return { fetchImpl, client: new HttpMiroOAuthClient({ baseUrl: "https://oauth.test", fetchImpl, clientId: "client" }) };
}

const credentials = { clientId: "client", clientSecret: "test-secret", deviceCode: "device", intervalSec: 5 };

describe("OAuth HTTP boundary", () => {
  it("maps device codes and sends the configured scope and client", async () => {
    const { client, fetchImpl } = transport({ device_code: "d", user_code: "u", verification_uri: "https://verify.test", expires_in: 60, interval: 5 });
    expect(await client.requestDeviceCode({ scope: "boards:read" })).toEqual({ deviceCode: "d", userCode: "u", verificationUri: "https://verify.test", expiresIn: 60, interval: 5 });
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({ client_id: "client", scope: "boards:read" });
  });

  it("uses environment defaults and rejects failed device requests", async () => {
    vi.stubEnv("MIRO_OAUTH_CLIENT_ID", "environment-client");
    vi.stubEnv("MIRO_OAUTH_BASE_URL", "https://env.test");
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json({}, { status: 503 }));
    await expect(new HttpMiroOAuthClient({ fetchImpl }).requestDeviceCode()).rejects.toThrow("503");
    expect(fetchImpl.mock.calls[0][0]).toBe("https://env.test/oauth/device/code");
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body)).client_id).toBe("environment-client");
  });

  it.each([
    ["authorization_pending", "pending"], ["slow_down", "slow_down"],
    ["expired_token", "expired"], ["access_denied", "denied"],
  ])("handles provider state %s", async (error, status) => {
    expect(await transport({ error }, 400).client.pollForToken(credentials)).toEqual({ status });
  });

  it("rejects unknown provider errors", async () => {
    await expect(transport({ error: "invalid_client" }, 401).client.pollForToken(credentials)).rejects.toThrow("401");
  });

  it("maps successful poll tokens and optional fields", async () => {
    const { client, fetchImpl } = transport({ access_token: "access", refresh_token: "refresh", expires_in: 90, scope: "read" });
    expect(await client.pollForToken(credentials)).toEqual({ status: "ok", tokens: { accessToken: "access", refreshToken: "refresh", expiresIn: 90, scope: "read", tokenType: "Bearer" } });
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body)).client_secret).toBe("test-secret");
    expect(await transport({}).client.pollForToken(credentials)).toEqual({ status: "ok", tokens: { accessToken: "", refreshToken: null, expiresIn: 3600, scope: "", tokenType: "Bearer" } });
  });

  it("refreshes tokens with complete and minimal provider responses", async () => {
    const opts = { clientId: "client", clientSecret: "test-secret", refreshToken: "old" };
    const { client, fetchImpl } = transport({ access_token: "new", refresh_token: "renewed", expires_in: 90, scope: "read" });
    expect(await client.refresh(opts)).toEqual({ accessToken: "new", refreshToken: "renewed", expiresIn: 90, scope: "read", tokenType: "Bearer" });
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body)).grant_type).toBe("refresh_token");
    expect(await transport({ access_token: "new" }).client.refresh(opts)).toEqual({ accessToken: "new", refreshToken: null, expiresIn: 3600, scope: "", tokenType: "Bearer" });
    await expect(transport({}, 403).client.refresh(opts)).rejects.toThrow("403");
  });

  it("selects demo unless live configuration is present", () => {
    vi.stubEnv("MIRO_OAUTH_DEMO", "1");
    expect(pickOAuthClient()).toBeInstanceOf(FakeMiroOAuthClient);
    vi.stubEnv("MIRO_OAUTH_DEMO", "0");
    vi.stubEnv("MIRO_OAUTH_CLIENT_ID", "client");
    expect(pickOAuthClient()).toBeInstanceOf(HttpMiroOAuthClient);
    vi.stubEnv("MIRO_OAUTH_CLIENT_ID", "");
    expect(pickOAuthClient()).toBeInstanceOf(FakeMiroOAuthClient);
  });
});
