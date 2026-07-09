import { CategorySchema } from "@/lib/validations/category";
import { categoryService } from "@/services/category.service";
import { handleError, parseBody, parseId } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/categories/:id — fetch one category
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const category = await categoryService.getById(parseId(id));
    return Response.json(category);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/categories/:id — update a category name
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const categoryId = parseId(id);
    const data = await parseBody(request, CategorySchema.partial(), {
      rejectEmpty: true,
    });
    const category = await categoryService.update(categoryId, data);
    return Response.json(category);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/categories/:id — delete a category
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    await categoryService.delete(parseId(id));
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}
