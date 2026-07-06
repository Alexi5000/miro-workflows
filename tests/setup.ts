/**
 * Vitest setup — run before every test file.
 *
 * - Forces demo mode for server tests (no Miro network calls).
 * - Routes the SQL.js database to an in-memory location.
 * - Clears `MIRO_*` env vars so any leaked credentials don't go live.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";

delete process.env.MIRO_ACCESS_TOKEN;
delete process.env.MIRO_PROVIDER_MODE;
delete process.env.MIRO_CLIENT_ID;
delete process.env.MIRO_CLIENT_SECRET;

process.env.PORT = "0"; // ephemeral
process.env.DATABASE_URL = `sqlite://${join(tmpdir(), `miro-test-${process.pid}-${Date.now()}.sqlite`)}`;
process.env.CORS_ORIGIN = "http://localhost";
