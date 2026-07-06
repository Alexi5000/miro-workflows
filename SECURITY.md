# Security

**Reporting vulnerabilities:** email `security@<domain>`.  
Please **DO NOT** open a public issue for security reports.

## Status

- **Demo mode is unauthenticated by design** (no Miro token → no real data is written).
- **Production deploy requires v1.1+** for the bearer-token auth wall (see [ROADMAP.md](./ROADMAP.md)).
- **OAuth device flow is currently a demo stub** — see [docs/OAUTH.md](./docs/OAUTH.md).

## Hardening already in place (foundation)

- **Body-size cap (1 MiB)** on every POST/PUT (`server/bootstrap.ts`).
- **Sanitized 500 responses**: server logs the full error, client receives a generic `"Internal server error"` message.
- **No token persistence**: only credential metadata in SQLite.
- **Typed, versioned contracts** (`shared/contracts/`) act as a request-validation firewall at every endpoint.
- **MCP client** distinguishes `MiroAuthError` (401) and `MiroRateLimitError` (429) and surfaces them via `isError: true`.
- **Demo mode** is the default; live Miro requires an explicit `MIRO_PROVIDER_MODE=miro` + `MIRO_ACCESS_TOKEN`.

## Reporting timeline

| Stage | SLA |
| --- | --- |
| Acknowledgement | 48 hours |
| Triage + severity | 5 business days |
| Patch | coordinated disclosure (default 30 days) |

## Supported versions

| Version | Supported |
| --- | --- |
| `feature/fde-foundation-pr` (v1.0.0-fde-foundation) | Yes — foundation tag |
| `master` | pre-foundation, no support |

## PGP key

> _Paste the public-key fingerprint here once the maintainer generates a keypair._ Until then, please use the email reporting channel above.

## Out-of-scope for now

- Penetration testing (planned for v1.1.0).
- SOC 2 / ISO 27001 documentation (planned for v1.4+).
- Bug-bounty program (planned for v1.5+).
