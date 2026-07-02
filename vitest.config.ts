import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",

    // Run test files one at a time — they share a DB so parallel = data races
    fileParallelism: false,

    // Runs once before ALL test files — starts the Postgres container
    globalSetup: "./vitest.global-setup.ts",

    // Runs before EACH test file — cleans the DB between tests
    setupFiles: ["./vitest.setup.ts"],

    // Testcontainers can take 10-30s to start on first pull
    testTimeout: 60000,
    hookTimeout: 60000,
  },
  resolve: {
    alias: {
      // Map @/ to src/ — same as your tsconfig.json paths
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
