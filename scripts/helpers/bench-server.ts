/**
 * scripts/helpers/bench-server.ts — bring up the HTTP API on an ephemeral
 * port and seed it for benchmarks.
 */
import { startServer } from "../../server/bootstrap.js";
import { repository } from "../../server/db/database.js";
import { seedBoards, seedCredentials, seedTemplates, seedWorkspaces } from "../../shared/seedData.js";
import type { AddressInfo, Server } from "node:net";

export async function bootstrapServerForBench(): Promise<{ server: Server; baseUrl: string }> {
  await repository.migrate();
  for (const workspace of seedWorkspaces) await repository.upsertWorkspace(workspace);
  for (const credential of seedCredentials) await repository.upsertCredential(credential);
  for (const board of seedBoards) await repository.upsertBoard(board);
  for (const template of seedTemplates) await repository.upsertTemplate(template);
  const server = await startServer({ port: 0 });
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  }
  const addr = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}
