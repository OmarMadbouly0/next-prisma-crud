import { productRepository } from "@/repositories/product.repository";
import { categoryRepository } from "@/repositories/category.repository";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type {
  ProductInput,
  ProductUpdateInput,
} from "@/lib/validations/product";

/**
 * Product business logic. Enforces the domain rules (referenced category must
 * exist, name must be unique within its category) and throws domain errors —
 * it neither parses HTTP requests nor touches Prisma directly.
 */
export const productService = {
  list(categoryName?: string) {
    return productRepository.findMany(
      categoryName ? { category: { name: categoryName } } : undefined
    );
  },

  async getById(id: number) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    return product;
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
