/**
 * server/services/tokenCipher.ts — AES-256-GCM authenticated encryption
 * for stored OAuth tokens.
 *
 * See ADR-0014.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class TokenCipherError extends Error {
  constructor(public readonly code: "invalid_key" | "decrypt_failed" | "short_ciphertext", message: string) {
    super(message);
    this.name = "TokenCipherError";
  }
}

function loadKey(): Buffer {
  const raw = process.env.MIRO_TOKEN_ENCRYPTION_KEY;
  if (raw && raw.length > 0) {
    const key = Buffer.from(raw, "base64");
    if (key.length !== KEY_BYTES) {
      throw new TokenCipherError("invalid_key", `MIRO_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes; got ${key.length}.`);
    }
    return key;
  }
  if (process.env.NODE_ENV === "production") {
    throw new TokenCipherError("invalid_key", "MIRO_TOKEN_ENCRYPTION_KEY is unset in production. Refusing to encrypt with a fallback key.");
  }
  // Dev fallback: deterministic 32-byte key derived from a stable string.
  // Loud warning in console.
  // eslint-disable-next-line no-console
  console.warn("[tokenCipher] MIRO_TOKEN_ENCRYPTION_KEY unset — using dev fallback. SET IT BEFORE PRODUCTION.");
  return Buffer.alloc(KEY_BYTES, "dev-fallback-do-not-use-in-production-");
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = loadKey();
  return cachedKey;
}

/** Reset the cached key. Exposed for tests that swap env vars. */
export function resetTokenCipher(): void {
  cachedKey = null;
}

export interface Encrypted {
  ciphertext: Buffer;
  iv: Buffer;
}

export function encryptToken(plaintext: string, aad: string): Encrypted {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key(), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext: Buffer.concat([ct, cipher.getAuthTag()]), iv };
}

export function decryptToken(ciphertext: Buffer, iv: Buffer, aad: string): string {
  if (ciphertext.length < 16) throw new TokenCipherError("short_ciphertext", "ciphertext shorter than the GCM tag");
  const body = ciphertext.subarray(0, ciphertext.length - 16);
  const tag = ciphertext.subarray(ciphertext.length - 16);
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch (err) {
    throw new TokenCipherError("decrypt_failed", `AES-GCM decrypt failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
