import { prisma } from "@/app/lib/prisma";
import { CategorySchema } from "@/lib/validations/category";
import {
  categoryHasProducts,
  errorResponse,
  isCategoryNameTaken,
  validateBody,
  withEntity,
} from "@/lib/api-helpers";

const findCategory = (id: number) =>
  prisma.category.findUnique({ where: { id } });

// GET /api/categories/:id — fetch one category
export const GET = withEntity("Category", findCategory, async ({ entity }) =>
  Response.json(entity)
);

// PUT /api/categories/:id — update a category name
export const PUT = withEntity(
  "Category",
  findCategory,
  async ({ id, request }) => {
    const data = await validateBody(request, CategorySchema.partial(), {
      rejectEmpty: true,
    });
    if (data instanceof Response) return data;

    if (
      data.name !== undefined &&
      (await isCategoryNameTaken(data.name, id))
    ) {
      return errorResponse("A category with this name already exists", 409);
    }

    const category = await prisma.category.update({
      where: { id },
      data,
    });

    return Response.json(category);
  }
);

// DELETE /api/categories/:id — delete a category
export const DELETE = withEntity("Category", findCategory, async ({ id }) => {
  if (await categoryHasProducts(id)) {
    return errorResponse(
      "Cannot delete category: it still has products assigned to it",
      409
    );
  }

  await prisma.category.delete({ where: { id } });
  return Response.json({ message: "Category deleted successfully" });
});
