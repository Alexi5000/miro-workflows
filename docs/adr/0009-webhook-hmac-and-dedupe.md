# ADR-0009: Webhook ingestion with HMAC + idempotent dedupe

- Status: Accepted
- Date: 2026-07-06

## Context

The dashboard displays the OAuth device flow user-code + verification URL,
but does not yet receive the actual Miro webhook that fires when the user
authorizes on miro.com. When that lands we need:
- Authentication: only Miro (or trusted proxies) can POST to us.
- Idempotency: retries from Miro must not double-credit.
- Observability: every delivery is auditable.

## Decision

- `POST /api/webhooks/miro` accepts a JSON body plus an
  `X-Miro-Signature` header (HMAC-SHA256 of the raw body, hex digest).
- Signature is verified against `MIRO_WEBHOOK_SECRET` (env, 32+ bytes in
  prod). A dev fallback is used in test/development and a loud warning
  is logged at boot (added in v1.1).
- Every delivery is recorded in `webhook_deliveries` with a
  `UNIQUE(source, external_id)` constraint. Duplicate inserts return
  `200 { status: "duplicate" }`; new ones return `202 { status: "received" }`.
- Each delivery emits an `audit_event` of type `webhook.received` or
  `webhook.duplicate` and increments `miro_workflows_webhook_deliveries_total`.
- The endpoint requires `webhooks:write` scope (auth wall from ADR-0007).

## Consequences

- ✅ Duplicates do not double-count.
- ✅ Replays of the same `id` from Miro are observable in the audit log.
- ✅ Auth + signature prevent unauthenticated POSTs.
- ⚠️ Body is read twice (once for HMAC, once for JSON parse). v1.1
  switches to a single read with a buffer.

## Alternatives considered

- **HMAC at the load balancer**: rejected for foundation; the in-process
  check is enough. When we add an edge proxy in v1.1, the in-process
  check becomes belt-and-suspenders.
- **Per-IP rate limiting**: out of scope; v1.1 work item.
- **Replay protection with timestamp + nonce**: deferred. Miro's webhook
  contract is "id" based; we lean on that plus the unique constraint.
