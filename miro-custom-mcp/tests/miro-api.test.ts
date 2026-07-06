import { describe, it, expect, vi } from "vitest";
import { MiroApiClient, MiroAuthError, MiroRateLimitError } from "../src/miro-api.js";

class FakeResponse {
  status: number;
  ok: boolean;
  private _headers: Map<string, string>;
  private _body: unknown;
  constructor(status: number, body: unknown, headers: Record<string, string> = {}) {
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this._body = body;
    this._headers = new Map(Object.entries(headers));
  }
  headers = {
    get: (key: string): string | null => this._headers.get(key.toLowerCase()) ?? null,
  };
  async text() { return typeof this._body === "string" ? this._body : JSON.stringify(this._body); }
  async json() { return this._body; }
}

function fetchMock(responses: FakeResponse[]): typeof fetch {
  let i = 0;
  return (async () => {
    const r = responses[i++] ?? responses[responses.length - 1];
    return r as unknown as Response;
  }) as unknown as typeof fetch;
}

describe("MiroApiClient — auth/rate/error mapping", () => {
  it("throws MiroAuthError on 401 and does not retry", async () => {
    const client = new MiroApiClient("test-token", { fetchImpl: fetchMock([new FakeResponse(401, "nope")]), timeoutMs: 1000 });
    await expect(client.getBoard("b")).rejects.toBeInstanceOf(MiroAuthError);
  });

  it("retries on 429 with backoff and reports MiroRateLimitError when exhausted", async () => {
    const fetchImpl = vi.fn(fetchMock([new FakeResponse(429, "slow", { "retry-after": "0" })]));
    // Use very small delays so the test finishes quickly.
    const client = new MiroApiClient("test-token", { fetchImpl, maxRetries: 2, baseDelayMs: 1, maxDelayMs: 4 });
    await expect(client.getBoard("b")).rejects.toBeInstanceOf(MiroRateLimitError);
    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("surfaces 500 errors after a single retry", async () => {
    const fetchImpl = vi.fn(fetchMock([new FakeResponse(500, "boom")]));
    const client = new MiroApiClient("test-token", { fetchImpl, maxRetries: 3, baseDelayMs: 1, maxDelayMs: 2 });
    await expect(client.getBoard("b")).rejects.toThrow(/500/);
    // 500 path retries once before bubbling.
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("rejects empty/placeholder tokens at construction", () => {
    expect(() => new MiroApiClient("")).toThrow(/MIRO_ACCESS_TOKEN/);
    expect(() => new MiroApiClient("your_token_here")).toThrow(/MIRO_ACCESS_TOKEN/);
  });
});

