# ADR-0014: Token encryption-at-rest (AES-256-GCM)

- Status: Accepted
- Date: 2026-07-07

## Context

v1.0 stores the **HMAC-SHA256 digest** of bearer tokens. That is enough
to verify a presented token, but the OAuth round-trip in v1.1 needs to
store the **actual access + refresh tokens** so we can call Miro on
the user's behalf. A DB breach would leak raw tokens.

## Decision

Encrypt tokens with **AES-256-GCM** before persisting them.

### Key management

- Master key: `MIRO_TOKEN_ENCRYPTION_KEY` (base64, 32 bytes).
- A missing key falls back to a deterministic dev key with a loud
  warning on boot. Production launches **must** set the env var.
- Future v1.2: KMS-backed (AWS KMS, GCP KMS) — same interface, the
  `TokenCipher` class.

### Per-token IV

- A 12-byte IV is generated with `crypto.randomBytes(12)` per write.
- The IV is stored in the row alongside the ciphertext (separate
  `encryption_iv BLOB` column).
- AAD (additional authenticated data) is the auth-token's `id` —
  prevents an attacker from swapping ciphertext between rows.

### Schema

```sql
ALTER TABLE auth_tokens
  ADD COLUMN access_token_cipher BLOB,        -- 16-byte GCM tag prefix
  ADD COLUMN access_token_iv     BLOB,        -- 12-byte IV
  ADD COLUMN refresh_token_cipher BLOB,
  ADD COLUMN refresh_token_iv    BLOB,
  ADD COLUMN last_refreshed_at    TEXT;       -- ISO
```

### Code

A `TokenCipher` class (`server/services/tokenCipher.ts`) with:
- `encrypt(plaintext: string, aad: string): { ciphertext: Buffer, iv: Buffer }`.
- `decrypt(ciphertext: Buffer, iv: Buffer, aad: string): string`.

Errors are typed (not raw `Error`) so callers can distinguish
`InvalidKeyError` from `DecryptionFailedError` and the auth wall can
return 401 (not 500) on a bad key.

## Consequences

- ✅ A DB dump alone is useless without the key.
- ✅ Per-token IV prevents ciphertext substitution.
- ⚠️ The master key is in env. v1.2 moves to KMS.
- ⚠️ A compromised env (= compromised key) breaks confidentiality.
  This is documented in `SECURITY.md`.

## Alternatives considered

- **AES-CBC**: rejected — GCM provides authenticated encryption (AEAD).
- **Plaintext storage with row-level encryption at the DB layer**:
  rejected for v1.1; Postgres TDE (transparent data encryption) is
  database-specific and not portable to sql.js for tests.
- **HMAC only (no encryption)**: rejected — v1.0 already does this; we
  need reversible encryption for the round-trip.
