import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Category data access. Reads/writes the Category table only —
 * no business rules, no HTTP concerns.
 */
export const categoryRepository = {
  findMany(page?: { limit: number; offset: number }) {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
      ...(page ? { take: page.limit, skip: page.offset } : {}),
    });
  },

  count() {
    return prisma.category.count();
  },

  findById(id: number) {
    return prisma.category.findUnique({ where: { id } });
  },

  create(data: Prisma.CategoryCreateInput) {
    return prisma.category.create({ data });
  },

  update(id: number, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({ where: { id }, data });
  },

  delete(id: number) {
    return prisma.category.delete({ where: { id } });
  },

  async exists(id: number): Promise<boolean> {
    const found = await prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    return found !== null;
  },

  // Is this name already taken? `excludeId` skips a row (used when renaming it).
  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const found = await prisma.category.findFirst({
      where: {
        name,
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  },
};
