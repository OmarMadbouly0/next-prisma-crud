import { productRepository } from "@/repositories/product.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { ConflictError, NotFoundError, hasErrorCode } from "@/lib/errors";
import type {
  ProductInput,
  ProductUpdateInput,
} from "@/lib/validations/product";
import type { Pagination } from "@/lib/http";

/**
 * Product business logic. Enforces the domain rules (referenced category must
 * exist, name must be unique within its category) and throws domain errors —
 * it neither parses HTTP requests nor touches Prisma directly.
 */
export const productService = {
  // Paged list: returns the page plus the total for client-side page controls.
  async list(categoryName: string | undefined, page: Pagination) {
    const where = categoryName
      ? { category: { name: categoryName } }
      : undefined;

    const [data, total] = await Promise.all([
      productRepository.findMany(where, page),
      productRepository.count(where),
    ]);

    return { data, total, limit: page.limit, offset: page.offset };
  },

  // Fetching a single product counts as a view: atomically increment the
  // counter and return the updated row (so the response reflects this view).
  async getById(id: number) {
    try {
      return await productRepository.incrementViews(id);
    } catch (error) {
      // Prisma P2025: no row with this id to update.
      if (hasErrorCode(error, "P2025")) {
        throw new NotFoundError("Product not found");
      }
      throw error;
    }
  },

  async create(input: ProductInput) {
    if (!(await categoryRepository.exists(input.categoryId))) {
      throw new NotFoundError("Category not found");
    }

    if (
      await productRepository.existsByNameInCategory(
        input.name,
        input.categoryId
      )
    ) {
      throw new ConflictError(
        "A product with this name already exists in this category"
      );
    }

    return productRepository.create(input);
  },

  async update(id: number, input: ProductUpdateInput) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Product not found");
    }

    if (
      input.categoryId !== undefined &&
      !(await categoryRepository.exists(input.categoryId))
    ) {
      throw new NotFoundError("Category not found");
    }

    // Re-check name uniqueness against the resulting (name, category) pair.
    if (input.name !== undefined || input.categoryId !== undefined) {
      const name = input.name ?? existing.name;
      const categoryId = input.categoryId ?? existing.categoryId;

      if (
        await productRepository.existsByNameInCategory(name, categoryId, id)
      ) {
        throw new ConflictError(
          "A product with this name already exists in this category"
        );
      }
    }

    return productRepository.update(id, input);
  },

  async delete(id: number) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Product not found");
    }
    await productRepository.delete(id);
  },
};
