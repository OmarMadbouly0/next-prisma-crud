import { CategorySchema } from "@/lib/validations/category";
import { categoryService } from "@/services/category.service";
import { handleError, parseBody } from "@/lib/http";

// GET /api/categories — list all categories
export async function GET() {
  try {
    const categories = await categoryService.list();
    return Response.json(categories);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/categories — create a new category
export async function POST(request: Request) {
  try {
    const data = await parseBody(request, CategorySchema);
    const category = await categoryService.create(data);
    return Response.json(category, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
