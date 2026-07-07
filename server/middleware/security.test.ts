import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, _resetRateLimit, verifyCsrf, checkWebhookTimestamp, markWebhookSignatureSeen, _resetReplayCache } from "./security.js";
import { createHmac } from "node:crypto";

describe("rateLimit", () => {
  beforeEach(() => _resetRateLimit());
  it("allows up to RATE_CAPACITY requests per key", () => {
    const key = "k1";
    for (let i = 0; i < 60; i++) expect(rateLimit(key).ok).toBe(true);
    expect(rateLimit(key).ok).toBe(false);
  });
  it("isolates per key", () => {
    for (let i = 0; i < 60; i++) rateLimit("a");
    expect(rateLimit("b").ok).toBe(true);
  });
});

describe("verifyCsrf", () => {
  const SECRET = "csrf-secret-1";
  const HEADER = createHmac("sha256", SECRET).update("miro_csrf").digest("hex");
  it("accepts the matching token", () => {
    expect(verifyCsrf({ "x-miro-csrf-token": HEADER }, SECRET)).toBe(true);
  });
  it("rejects a wrong token", () => {
    expect(verifyCsrf({ "x-miro-csrf-token": "deadbeef" }, SECRET)).toBe(false);
  });
  it("rejects when missing", () => {
    expect(verifyCsrf({}, SECRET)).toBe(false);
  });
});

describe("webhook replay protection", () => {
  beforeEach(() => _resetReplayCache());
  it("rejects timestamps outside the window", () => {
    const now = 1_000_000;
    expect(checkWebhookTimestamp({ "x-miro-timestamp": String(now - 10 * 60 * 1000) }, now).ok).toBe(false);
    expect(checkWebhookTimestamp({ "x-miro-timestamp": String(now + 10 * 60 * 1000) }, now).ok).toBe(false);
  });
  it("accepts a fresh timestamp", () => {
    const now = Date.now();
    expect(checkWebhookTimestamp({ "x-miro-timestamp": String(now) }, now).ok).toBe(true);
  });
  it("rejects a duplicated signature inside the window", () => {
    const now = Date.now();
    expect(markWebhookSignatureSeen("sig-1", now)).toBe(true);
    expect(markWebhookSignatureSeen("sig-1", now + 1000)).toBe(false);
  });
});
