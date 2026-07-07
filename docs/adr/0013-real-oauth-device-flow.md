# ADR-0013: Real Miro OAuth 2.0 device-flow round-trip

- Status: Accepted
- Date: 2026-07-07

## Context

The v1.0 OAuth device flow is a **demo stub** (returns a fake `userCode`).
The v1.0 dashboard's "Start flow" button works end-to-end inside the
repo, but does not actually exchange a user code for a Miro access
token. Production launches require the real round-trip.

## Decision

Implement Miro's OAuth 2.0 device authorization grant
(https://developers.miro.com/docs/getting-started-with-oauth) properly.

### Round-trip

1. `POST /v1/oauth/device/code` (Miro) → `{ device_code, user_code, verification_uri, expires_in, interval }`.
2. Operator authorizes on `verification_uri` with `user_code`.
3. Server polls `POST /v1/oauth/token` every `interval` seconds.
4. First response is `authorization_pending`; on success, Miro returns
   `{ access_token, refresh_token, expires_in, scope, token_type }`.
5. We encrypt the tokens with AES-256-GCM (see ADR-0014) and store
   the digests + metadata in `auth_tokens`.
6. `refresh_token` is rotated on every refresh; the previous
   `refresh_token` is invalidated.

### Endpoints

- `POST /api/workspaces/:id/oauth/device-code` — kicks off the flow,
  stores a pending row, returns `{ userCode, verificationUri, expiresIn, interval }`.
- `POST /api/auth/tokens/complete-device-flow` — frontend hits this
  after the user authorises; the server polls Miro, persists the
  encrypted token, and returns the bearer in plaintext once.

### Configuration

- `MIRO_OAUTH_CLIENT_ID` — required in live mode.
- `MIRO_OAUTH_CLIENT_SECRET` — required in live mode.
- `MIRO_OAUTH_REDIRECT_URL` — defaults to `http://localhost:8787/api/oauth/callback`.
- `MIRO_OAUTH_BASE_URL` — defaults to `https://api.miro.com/v1`.
- `MIRO_OAUTH_DEMO=1` — enables the v1.0 demo stub. **Default**.

### Test isolation

- A `FakeMiroOAuthClient` returns deterministic responses; the
  `OAuthClient` interface is the boundary that tests assert against.
- Live mode is exercised in **integration** tests only and is skipped
  when `MIRO_OAUTH_CLIENT_ID` is unset.
- The polling loop is bounded by `expires_in`; aborts after 10 minutes
  with `oauth_flow_expired` and an audit event.

## Consequences

- ✅ Real access + refresh tokens are stored encrypted.
- ✅ Operator can fully wire a Miro workspace in production by setting
  three env vars.
- ⚠️ CI must not hit real Miro. Tests default to `MIRO_OAUTH_DEMO=1`.
- ⚠️ Polling is a small server load. We cap concurrent flows per
  workspace (5) and per IP (10/min).

## Alternatives considered

- **Authorization Code (with PKCE) for a web-only flow**: rejected —
  the dashboard surfaces the user-code via the device flow because the
  operator often runs the dashboard on a different machine from where
  they authorise (mobile, etc.). Device flow handles that.
- **Direct API key with no OAuth**: rejected — the security boundary
  is per-workspace, and Miro has phased out long-lived static keys.
