# OAuth — Status, Scope, and Demo Caveats

**TL;DR.** The dashboard's `Credentials → Start flow for {workspace}` button currently runs against a **demo stub** of Miro's OAuth 2.0 device authorization grant. It exercises the UI end-to-end and writes an audit row, but it does NOT exchange the user code for a real access token. Treat this view as **demo mode only** until a backend integration ships.

## What the stub does today

`POST /api/workspaces/:id/oauth/device-code` returns:

```json
{ "userCode": "ABCD-EFGH", "verificationUri": "https://miro.com/oauth/device", "expiresIn": 600 }
```

- The `userCode` is a deterministic-ish random string (not cryptographically secure).
- No call to Miro's `/oauth/device/code` is made.
- The `verificationUri` is the real Miro URL, but pressing **Complete** in the UI just attaches a metadata-only credential to the workspace.
- An `oauth.device_flow.started` audit event is recorded for every start.

See [`server/bootstrap.ts`](../server/bootstrap.ts) (search `oauth/device-code`).

## Why a stub?

The full device-flow round trip requires:

1. Server-side credentials (client id + secret).
2. A registered `redirect_uri` Miro can return users to.
3. A polling endpoint (`POST /v1/oauth/token`) that the dashboard can hit while the user authorizes.
4. Token storage — never in plaintext; in our case the SQLite `integration_credentials` row holds only metadata (scopes + expiry), never the token.

We deferred items 1–3 because they require a registered Miro OAuth app per installing team. The stub keeps the UX testable in CI and offline.

## What needs to change for live mode

1. Register a Miro OAuth app in the developer console; capture `client_id`, `client_secret`, `redirect_uri`.
2. Set `MIRO_CLIENT_ID`, `MIRO_CLIENT_SECRET`, `MIRO_REDIRECT_URL` in `.env`.
3. Replace the stub in `server/bootstrap.ts` with a real `fetch("https://api.miro.com/v1/oauth/device/code", …)` call.
4. Add a polling endpoint `POST /api/credentials/complete-device-flow` that POSTs the user code to `/v1/oauth/token` and stores the refresh token.
5. Refresh the token automatically before `expiresAt`.
6. Update the `MCP` factory to pass the token, not the env var.

## Security notes

- Never persist raw tokens in SQLite. Only metadata.
- The `userCode` is short-lived; a real implementation must expire it after `expiresIn` seconds.
- Disable the device-flow button in production until items 1–5 above are wired.
