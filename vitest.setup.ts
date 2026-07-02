import { prisma } from "@/app/lib/prisma";
import { afterAll, beforeEach } from "vitest";

/**
 * Cleanup runs before EACH test.
 *
 * ORDER MATTERS — Products must be deleted before Categories
 * because Product.categoryId has a foreign key pointing to Category.
 * If you delete Category first, the DB throws a constraint violation.
 */
beforeEach(async () => {
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
