import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@shared": resolve(here, "shared"),
      "@server": resolve(here, "server"),
      "@scripts": resolve(here, "scripts"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts", "shared/**/*.test.ts", "server/**/*.test.ts", "scripts/**/*.test.ts", "src/agents/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["server/services/**/*.ts", "server/providers/**/*.ts", "server/config.ts", "server/db/database.ts", "shared/contracts/**/*.ts", "scripts/check_contract_versions.ts", "scripts/build_contracts.ts", "src/agents/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts", "**/types.ts", "src/agents/cli.ts", "src/agents/prompts/**/*.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 65,
        statements: 80,
      },
    },
  },
});
