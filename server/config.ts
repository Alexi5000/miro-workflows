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
