import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type ProviderMode = "demo" | "miro";

export interface AppConfig {
  port: number;
  databasePath: string;
  /** "miro" when MIRO_ACCESS_TOKEN is present, otherwise "demo".
   *  May be overridden by MIRO_PROVIDER_MODE=demo even if a token is set. */
  providerMode: ProviderMode;
  miroAccessToken: string;
  corsOrigin: string;
}

function readProviderMode(token: string | undefined): ProviderMode {
  const explicit = process.env.MIRO_PROVIDER_MODE?.toLowerCase();
  if (explicit === "demo" || explicit === "miro") return explicit;
  return token ? "miro" : "demo";
}

function readDatabasePath(): string {
  const urlPath = process.env.DATABASE_URL?.replace(/^sqlite:\/\//, "");
  if (urlPath) return resolve(urlPath);
  const legacy = process.env.DATABASE_PATH;
  if (legacy) return resolve(legacy);
  return resolve("data/miro-workflows.sqlite");
}

export function getConfig(): AppConfig {
  const databasePath = readDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });
  const token = process.env.MIRO_ACCESS_TOKEN || "";
  return {
    port: Number(process.env.PORT || 8787),
    databasePath,
    providerMode: readProviderMode(token),
    miroAccessToken: token,
    corsOrigin: process.env.CORS_ORIGIN || "*",
  };
}

/** Pre-rename OAuth variable names and their current replacements. */
const LEGACY_OAUTH_ENV: ReadonlyArray<[legacy: string, current: string]> = [
  ["MIRO_CLIENT_ID", "MIRO_OAUTH_CLIENT_ID"],
  ["MIRO_CLIENT_SECRET", "MIRO_OAUTH_CLIENT_SECRET"],
];

/** Warnings for legacy OAuth env names that are set while the name the
 *  server actually reads is not. Without the current name, the server falls
 *  back to the demo OAuth client, so surface it at startup. */
export function legacyOAuthEnvWarnings(env: NodeJS.ProcessEnv = process.env): string[] {
  return LEGACY_OAUTH_ENV
    .filter(([legacy, current]) => env[legacy] && !env[current])
    .map(([legacy, current]) => `${legacy} is set but ignored; rename it to ${current}.`);
}
