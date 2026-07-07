/**
 * server/db/database.ts — backwards-compatible re-export shim.
 *
 * v1.1 split the single repository into two adapters
 * (`SqlJsRepository`, `PgRepository`) under a shared `Repository` interface.
 * The `repository` named export is preserved here for the v1.0 consumer
 * surface (it now resolves to the sql.js adapter by default; the
 * `getRepository()` selector picks the postgres adapter when
 * `DATABASE_URL` is a postgres URL).
 *
 * v1.2 may deprecate this shim in favor of explicit
 * `import { getRepository } from "./db/repository.js"`.
 */
import { getRepository } from "./repository.js";
import { _resetSqlJsForTests } from "./sqlJsRepository.js";

/** Returns the singleton repository (sql.js by default, postgres if
 *  DATABASE_URL points at a postgres:// endpoint). */
export const repository = getRepository();

/** Test helper exposed for the existing test suite. */
export function _resetForTests(): void {
  _resetSqlJsForTests();
}
