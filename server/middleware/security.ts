/**
 * server/middleware/security.ts — v1.1 hardening.
 *
 *  - Token-bucket rate limiting (per IP, in-memory; Redis-friendly shim).
 *  - CSRF check on state-changing requests.
 *  - Webhook replay-protection window.
 *
 * For v1.1 these run **in-process** in the foundation. v1.2 moves the
 * rate-limiter to Redis (a separate ADR) and the CSRF check to a shared
 * session-cookie issuance.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const CSRF_HEADER = "x-miro-csrf-token";
const CSRF_COOKIE = "miro_csrf";
const REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface Bucket {
  tokens: number;
  refillAt: number;
}

const _buckets = new Map<string, Bucket>();
const RATE_CAPACITY = 60;
const RATE_REFILL_TOKENS = 1;
const RATE_REFILL_MS = 1000;

/**
 * Token-bucket rate limiter, in-memory.
 * `key` is typically the caller's IP; in v1.1 we keep it simple.
 */
export function rateLimit(key: string): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  let b = _buckets.get(key);
  if (!b) {
    b = { tokens: RATE_CAPACITY, refillAt: now + RATE_REFILL_MS };
    _buckets.set(key, b);
  }
  if (b.refillAt <= now) {
    const elapsed = now - b.refillAt;
    const refill = Math.floor(elapsed / RATE_REFILL_MS) * RATE_REFILL_TOKENS;
    b.tokens = Math.min(RATE_CAPACITY, b.tokens + refill);
    b.refillAt = now + RATE_REFILL_MS;
  }
  if (b.tokens <= 0) {
    return { ok: false, retryAfterMs: RATE_REFILL_MS };
  }
  b.tokens -= 1;
  return { ok: true, retryAfterMs: 0 };
}

/** Reset the in-memory state — exposed for tests. */
export function _resetRateLimit(): void {
  _buckets.clear();
}

/**
 * Verify a CSRF token against a session-bound secret.
 * The session secret is provided by the auth wall when the user holds a
 * bearer token (i.e. API clients). The browser flow uses a SameSite=Strict
 * cookie + header (skipped here because v1.1 is API-only).
 *
 * Contract: the header value MUST equal `HMAC(secret, "miro_csrf")`.
 */
export function verifyCsrf(headers: Record<string, string | string[] | undefined>, secret: string): boolean {
  const header = headers[CSRF_HEADER] ?? headers["x-csrftoken"];
  if (typeof header !== "string") return false;
  const expected = createHmac("sha256", secret).update(CSRF_COOKIE).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(header, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Webhook replay-protection: an X-Miro-Timestamp must be within window. */
const seenSignatures = new Map<string, number>(); // signature -> seenAtMs

export function checkWebhookTimestamp(headers: Record<string, string | string[] | undefined>, now: number = Date.now()): { ok: boolean; reason?: string } {
  const tsHeader = headers["x-miro-timestamp"];
  if (typeof tsHeader !== "string") return { ok: false, reason: "missing X-Miro-Timestamp" };
  const ts = Number(tsHeader);
  if (!Number.isFinite(ts)) return { ok: false, reason: "X-Miro-Timestamp is not a number" };
  if (Math.abs(now - ts) > REPLAY_WINDOW_MS) return { ok: false, reason: "X-Miro-Timestamp outside replay window" };
  return { ok: true };
}

export function markWebhookSignatureSeen(signature: string, now: number = Date.now()): boolean {
  const last = seenSignatures.get(signature);
  if (last !== undefined && now - last < REPLAY_WINDOW_MS) return false; // already seen inside window
  seenSignatures.set(signature, now);
  // garbage-collect old entries
  for (const [sig, ts] of seenSignatures) if (now - ts > REPLAY_WINDOW_MS) seenSignatures.delete(sig);
  return true;
}

export function _resetReplayCache(): void {
  seenSignatures.clear();
}
