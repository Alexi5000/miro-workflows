# ADR-0010: Drop hand-rolled JSON-Schema emitter for `zod-to-json-schema`

- Status: Accepted
- Date: 2026-07-06

## Context

The foundation shipped a 129-line hand-rolled JSON-Schema emitter in
`shared/contracts/json-schema.ts` that duck-typed zod's internal `_def`
field. This was deliberately chosen to avoid a new dependency, but it
left:
- 4 `as unknown as` casts in production hot paths
- A risk that any zod minor release would silently break schema generation
- An inconsistent treatment of `.default()` and `.optional()` fields

The team's tolerance for the `as unknown as` casts in `shared/contracts/`
(flagged in the foundation review) is low; production code should not
have them.

## Decision

- Replace the hand-rolled emitter with `zod-to-json-schema` (the
  well-tested upstream package).
- Add a small `envelope()` wrapper in `shared/contracts/json-schema.ts`
  that:
  - Sets the JSON-Schema 2020-12 dialect + `$id` + `title`.
  - Forces `additionalProperties: false` on object schemas (matches the
    OpenAPI convention).
  - Reshapes `required` into a proper array.
- Build every contract artifact from this single helper.
- Re-export all `build*JsonSchema()` functions from
  `shared/contracts/index.ts`.
- Add tests that exercise each builder (`shared/contracts/json-schema.test.ts`).

## Consequences

- ✅ Zero `as unknown as` casts in `shared/contracts/json-schema.ts`.
- ✅ One small dependency (`zod-to-json-schema@^3.25`) replaces 129 lines
  of hand-rolled code.
- ✅ The OpenAPI generator (`scripts/generate_openapi.ts`) consumes the
  same builders; no second implementation to maintain.
- ⚠️ `zod-to-json-schema` may emit slightly different JSON-Schema than
  the previous emitter. Tests cover the contract: required-field presence,
  enum values, and additionalProperties.

## Alternatives considered

- **`@asteasolutions/zod-to-openapi`**: considered. Rejected — it builds
  OpenAPI directly but uses its own zod-internals approach. Our hand-rolled
  OpenAPI generator is small and stable.
- **Keep the hand-rolled emitter + write more tests**: rejected — the
  test coverage cannot compensate for a fundamentally fragile approach.
