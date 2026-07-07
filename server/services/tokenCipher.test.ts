import { describe, it, expect, beforeAll } from "vitest";
import { decryptToken, encryptToken, resetTokenCipher, TokenCipherError } from "./tokenCipher.js";

describe("tokenCipher (AES-256-GCM)", () => {
  beforeAll(() => {
    process.env.MIRO_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    resetTokenCipher();
  });

  it("round-trips a plaintext token", () => {
    const { ciphertext, iv } = encryptToken("access-token-xyz", "row-1");
    expect(ciphertext.length).toBeGreaterThan(16); // tag included
    expect(iv.length).toBe(12);
    expect(decryptToken(ciphertext, iv, "row-1")).toBe("access-token-xyz");
  });

  it("rejects a wrong AAD (row-1 vs row-2)", () => {
    const { ciphertext, iv } = encryptToken("token", "row-1");
    expect(() => decryptToken(ciphertext, iv, "row-2")).toThrow(TokenCipherError);
  });

  it("rejects truncated ciphertext", () => {
    const { iv } = encryptToken("token", "row-1");
    expect(() => decryptToken(Buffer.alloc(8), iv, "row-1")).toThrow(TokenCipherError);
  });

  it("rejects invalid key length", () => {
    const original = process.env.MIRO_TOKEN_ENCRYPTION_KEY;
    process.env.MIRO_TOKEN_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
    resetTokenCipher();
    expect(() => encryptToken("token", "row-1")).toThrow(TokenCipherError);
    process.env.MIRO_TOKEN_ENCRYPTION_KEY = original;
    resetTokenCipher();
  });
});
