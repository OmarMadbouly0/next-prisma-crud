import { prisma } from "@/app/lib/prisma";
import { ProductSchema } from "@/lib/validations/product";
import {
  categoryExists,
  errorResponse,
  isProductNameTaken,
  validateBody,
  withEntity,
} from "@/lib/api-helpers";

const findProduct = (id: number) =>
  prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

// GET /api/products/:id — fetch a single product with its category
export const GET = withEntity("Product", findProduct, async ({ entity }) =>
  Response.json(entity)
);

// PUT /api/products/:id — update an existing product
export const PUT = withEntity(
  "Product",
  findProduct,
  async ({ id, entity, request }) => {
    const data = await validateBody(request, ProductSchema.partial(), {
      rejectEmpty: true,
    });
    if (data instanceof Response) return data;

    const { name, price, categoryId } = data;

    if (categoryId !== undefined && !(await categoryExists(categoryId))) {
      return errorResponse("Category not found", 404);
    }

    if (name !== undefined || categoryId !== undefined) {
      const mergedName = name ?? entity.name;
      const mergedCategoryId = categoryId ?? entity.categoryId;

      if (await isProductNameTaken(mergedName, mergedCategoryId, id)) {
        return errorResponse(
          "A product with this name already exists in this category",
          409
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: { name, price, categoryId },
      include: { category: true },
    });

    return Response.json(product);
  }
);

// DELETE /api/products/:id — delete a product
export const DELETE = withEntity("Product", findProduct, async ({ id }) => {
  await prisma.product.delete({ where: { id } });
  return Response.json({ message: "Product deleted successfully" });
});
