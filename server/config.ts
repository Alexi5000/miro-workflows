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

export function getConfig(): AppConfig {
  const databasePath = resolve(process.env.DATABASE_URL?.replace(/^sqlite:\/\//, "") || "data/miro-workflows.sqlite");
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
