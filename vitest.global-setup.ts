import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "child_process";

/**
 * Global Setup — runs ONCE before all test files in a separate process.
 *
 * What it does:
 * 1. Spins up a real Postgres container (via Docker) just for tests
 * 2. Sets DATABASE_URL env var so Prisma connects to it
 * 3. Runs prisma migrate deploy to create the schema
 *
 * Why testcontainers instead of your dev DB?
 * → Tests are fully isolated — they never touch your real data
 * → No need to manually start/stop anything
 * → Works in CI/CD pipelines automatically
 */
export async function setup() {
  console.log("\n🐳 Starting Postgres test container...");

  const container = await new PostgreSqlContainer("postgres:17")
    .withDatabase("testdb")
    .withUsername("testuser")
    .withPassword("testpass")
    .start();

  const databaseUrl = container.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;

  console.log("✅ Container started. Running migrations...");

  // Run Prisma migrations against the test container
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  console.log("✅ Migrations done. Running tests...\n");

  // Save reference so teardown can stop it
  (globalThis as Record<string, unknown>).__TEST_CONTAINER__ = container;
}

/**
 * Teardown — runs ONCE after all test files finish.
 * Stops and removes the Postgres container.
 */
export async function teardown() {
  const container = (globalThis as Record<string, unknown>).__TEST_CONTAINER__;
  if (container) {
    await (container as { stop: () => Promise<void> }).stop();
    console.log("\n🛑 Test container stopped.");
  }
}
