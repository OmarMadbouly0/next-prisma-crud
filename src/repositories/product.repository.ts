import { prisma } from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Product data access. This layer knows only how to read/write the Product
 * table via Prisma — no business rules, no HTTP concerns.
 */
export const productRepository = {
  findMany(where?: Prisma.ProductWhereInput) {
    return prisma.product.findMany({
      where,
      include: { category: true },
    });
  },

  findById(id: number) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
  },

  create(data: Prisma.ProductUncheckedCreateInput) {
    return prisma.product.create({
      data,
      include: { category: true },
    });
  },

  update(id: number, data: Prisma.ProductUncheckedUpdateInput) {
    return prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });
  },

  delete(id: number) {
    return prisma.product.delete({ where: { id } });
  },

  // Does a product with this name already exist in this category?
  // `excludeId` skips a specific row (used when updating that same product).
  async existsByNameInCategory(
    name: string,
    categoryId: number,
    excludeId?: number
  ): Promise<boolean> {
    const found = await prisma.product.findFirst({
      where: {
        name,
        categoryId,
        ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  },

  // Are there any products assigned to this category?
  async existsByCategory(categoryId: number): Promise<boolean> {
    const found = await prisma.product.findFirst({
      where: { categoryId },
      select: { id: true },
    });
    return found !== null;
  },
};
