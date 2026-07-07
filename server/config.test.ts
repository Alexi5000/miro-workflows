import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getConfig } from "./config.js";

let TMP_ROOT = "";

describe("config", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_PATH;
    delete process.env.MIRO_ACCESS_TOKEN;
    delete process.env.MIRO_PROVIDER_MODE;
    delete process.env.PORT;
    delete process.env.CORS_ORIGIN;
    TMP_ROOT = mkdtempSync(join(tmpdir(), "miro-config-"));
  });
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_PATH;
    if (TMP_ROOT) rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  it("defaults to demo mode without a token", () => {
    const cfg = getConfig();
    expect(cfg.providerMode).toBe("demo");
    expect(cfg.miroAccessToken).toBe("");
    expect(cfg.databasePath).toMatch(/miro-workflows\.sqlite$/);
    expect(cfg.port).toBe(8787);
  });

  it("honors DATABASE_URL when set", () => {
    process.env.DATABASE_URL = `sqlite://${TMP_ROOT}/x.sqlite`;
    expect(getConfig().databasePath).toMatch(/x\.sqlite$/);
  });

  it("honors legacy DATABASE_PATH when set (back-compat)", () => {
    process.env.DATABASE_PATH = join(TMP_ROOT, "legacy-x.sqlite");
    expect(getConfig().databasePath).toMatch(/legacy-x\.sqlite$/);
  });

  it("DATABASE_URL beats DATABASE_PATH", () => {
    process.env.DATABASE_URL = `sqlite://${TMP_ROOT}/url/x.sqlite`;
    process.env.DATABASE_PATH = join(TMP_ROOT, "legacy/x.sqlite");
    expect(getConfig().databasePath).toMatch(/url[\\/]x\.sqlite$/);
  });

  it("MIRO_PROVIDER_MODE=demo overrides a present token", () => {
    process.env.MIRO_ACCESS_TOKEN = "tok";
    process.env.MIRO_PROVIDER_MODE = "demo";
    expect(getConfig().providerMode).toBe("demo");
  });

  it("MIRO_ACCESS_TOKEN alone switches provider to miro", () => {
    process.env.MIRO_ACCESS_TOKEN = "tok";
    expect(getConfig().providerMode).toBe("miro");
  });
});
