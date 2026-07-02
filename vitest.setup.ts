import { prisma } from "@/app/lib/prisma";
import { afterAll, beforeEach } from "vitest";

/**
 * Setup file — runs before EACH test file.
 *
 * beforeEach: Wipes all products so tests don't affect each other.
 * This is called "test isolation" — each test starts with a clean slate.
 *
 * afterAll: Disconnects Prisma to avoid open connection warnings.
 */
beforeEach(async () => {
  await prisma.product.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
