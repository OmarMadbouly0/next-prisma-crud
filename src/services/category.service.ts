import { categoryRepository } from "@/repositories/category.repository";
import { productRepository } from "@/repositories/product.repository";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type {
  CategoryInput,
  CategoryUpdateInput,
} from "@/lib/validations/category";
import type { Pagination } from "@/lib/http";

/**
 * Category business logic. Enforces unique names and the "can't delete a
 * category that still owns products" rule, throwing domain errors — no HTTP
 * or Prisma details leak in here.
 */
export const categoryService = {
  // Paged list: returns the page plus the total for client-side page controls.
  async list(page: Pagination) {
    const [data, total] = await Promise.all([
      categoryRepository.findMany(page),
      categoryRepository.count(),
    ]);

    return { data, total, limit: page.limit, offset: page.offset };
  },

  async getById(id: number) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError("Category not found");
    }
    return category;
  },

  async create(input: CategoryInput) {
    if (await categoryRepository.existsByName(input.name)) {
      throw new ConflictError("A category with this name already exists");
    }
    return categoryRepository.create(input);
  },

  async update(id: number, input: CategoryUpdateInput) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Category not found");
    }

    if (
      input.name !== undefined &&
      (await categoryRepository.existsByName(input.name, id))
    ) {
      throw new ConflictError("A category with this name already exists");
    }

    return categoryRepository.update(id, input);
  },

  async delete(id: number) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Category not found");
    }

    if (await productRepository.existsByCategory(id)) {
      throw new ConflictError(
        "Cannot delete category: it still has products assigned to it"
      );
    }

    await categoryRepository.delete(id);
  },
};
