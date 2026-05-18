import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface AppConfig {
  port: number;
  databasePath: string;
  providerMode: "demo" | "miro";
  miroAccessToken: string;
  corsOrigin: string;
}

export function getConfig(): AppConfig {
  const databasePath = resolve(process.env.DATABASE_URL?.replace(/^sqlite:\/\//, "") || "data/miro-workflows.sqlite");
  mkdirSync(dirname(databasePath), { recursive: true });
  return {
    port: Number(process.env.PORT || 8787),
    databasePath,
    providerMode: process.env.MIRO_ACCESS_TOKEN ? "miro" : "demo",
    miroAccessToken: process.env.MIRO_ACCESS_TOKEN || "",
    corsOrigin: process.env.CORS_ORIGIN || "*",
  };
}
