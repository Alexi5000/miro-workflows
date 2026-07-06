import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@shared": resolve(here, "shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/dom-setup.ts"],
    include: ["src/**/*.dom.test.{ts,tsx}", "tests/ui/**/*.test.{ts,tsx}", "tests/e2e/**/*.test.{ts,tsx}"],
    css: true,
  },
});
