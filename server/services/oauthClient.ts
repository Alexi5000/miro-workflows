/**
 * server/services/oauthClient.ts — Miro OAuth 2.0 device-flow transport.
 *
 * The interface is small. The default implementation hits Miro's real
 * endpoints; `FakeMiroOAuthClient` returns deterministic responses for
 * CI / demo mode (the v1.0 demo stub is preserved as `MIRO_OAUTH_DEMO=1`).
 */
export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope: string;
  tokenType: "Bearer";
}

export type PollResult =
  | { status: "pending" }
  | { status: "slow_down" }
  | { status: "expired" }
  | { status: "denied" }
  | { status: "ok"; tokens: TokenResponse };

export interface MiroOAuthClient {
  /** Request a new device code from the provider. */
  requestDeviceCode(opts: { clientId: string; scope?: string }): Promise<DeviceCodeResponse>;
  /** Poll for the user to complete authorization. */
  pollForToken(opts: { clientId: string; clientSecret: string; deviceCode: string; intervalSec: number }): Promise<PollResult>;
  /** Refresh an access token before expiry. */
  refresh(opts: { clientId: string; clientSecret: string; refreshToken: string }): Promise<TokenResponse>;
}

const DEFAULT_BASE_URL = "https://api.miro.com/v1";
const DEFAULT_SCOPE = "boards:read boards:write";

/** Live Miro client. Reads `MIRO_OAUTH_CLIENT_ID` and `_SECRET` from env. */
export class HttpMiroOAuthClient implements MiroOAuthClient {
  constructor(private readonly opts: { baseUrl?: string; fetchImpl?: typeof fetch; clientId?: string; clientSecret?: string } = {}) {}

  private get baseUrl(): string { return this.opts.baseUrl ?? process.env.MIRO_OAUTH_BASE_URL ?? DEFAULT_BASE_URL; }
  private get id(): string { return this.opts.clientId ?? process.env.MIRO_OAUTH_CLIENT_ID ?? ""; }
  private get secret(): string { return this.opts.clientId ?? process.env.MIRO_OAUTH_CLIENT_SECRET ?? ""; }
  private get fetchImpl(): typeof fetch { return this.opts.fetchImpl ?? fetch; }

  async requestDeviceCode(opts: { clientId?: string; scope?: string } = {}): Promise<DeviceCodeResponse> {
    const id = opts.clientId ?? this.id;
    const res = await this.fetchImpl(`${this.baseUrl}/oauth/device/code`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_id: id, scope: opts.scope ?? DEFAULT_SCOPE }),
    });
    if (!res.ok) throw new Error(`Miro device code request failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { device_code: string; user_code: string; verification_uri: string; expires_in: number; interval: number };
    return {
      deviceCode: data.device_code,
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      expiresIn: data.expires_in,
      interval: data.interval,
    };
  }

  async pollForToken(opts: { clientId: string; clientSecret: string; deviceCode: string; intervalSec: number }): Promise<PollResult> {
    const res = await this.fetchImpl(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        device_code: opts.deviceCode,
      }),
    });
    const data = await res.json() as { error?: string; access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
    if (res.ok) {
      return {
        status: "ok",
        tokens: {
          accessToken: data.access_token ?? "",
          refreshToken: data.refresh_token ?? null,
          expiresIn: data.expires_in ?? 3600,
          scope: data.scope ?? "",
          tokenType: "Bearer",
        },
      };
    }
    switch (data.error) {
      case "authorization_pending": return { status: "pending" };
      case "slow_down": return { status: "slow_down" };
      case "expired_token": return { status: "expired" };
      case "access_denied": return { status: "denied" };
      default: throw new Error(`Miro token poll failed: ${res.status} ${JSON.stringify(data)}`);
    }
  }

  async refresh(opts: { clientId: string; clientSecret: string; refreshToken: string }): Promise<TokenResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        refresh_token: opts.refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`Miro token refresh failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: data.expires_in ?? 3600,
      scope: data.scope ?? "",
      tokenType: "Bearer",
    };
  }
}

/** Demo client: deterministic, in-process. CI + tests + dev usage. */
export class FakeMiroOAuthClient implements MiroOAuthClient {
  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    return {
      deviceCode: `dev-${Math.random().toString(36).slice(2, 10)}`,
      userCode: "DEMO-CODE",
      verificationUri: "https://miro.com/oauth/device",
      expiresIn: 600,
      interval: 5,
    };
  }
  async pollForToken(): Promise<PollResult> {
    return {
      status: "ok",
      tokens: {
        accessToken: "demo-access-token-not-valid",
        refreshToken: "demo-refresh-token-not-valid",
        expiresIn: 3600,
        scope: "boards:read boards:write",
        tokenType: "Bearer",
      },
    };
  }
  async refresh(): Promise<TokenResponse> {
    return {
      accessToken: "demo-access-token-not-valid",
      refreshToken: "demo-refresh-token-not-valid",
      expiresIn: 3600,
      scope: "boards:read boards:write",
      tokenType: "Bearer",
    };
  }
}

/** Select the demo client unless live credentials are configured. */
export function pickOAuthClient(): MiroOAuthClient {
  const demo = process.env.MIRO_OAUTH_DEMO === "1" || !process.env.MIRO_OAUTH_CLIENT_ID;
  return demo ? new FakeMiroOAuthClient() : new HttpMiroOAuthClient();
}
