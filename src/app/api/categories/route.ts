import { CategorySchema } from "@/lib/validations/category";
import { categoryService } from "@/services/category.service";
import { handleError, parseBody, parsePagination } from "@/lib/http";

// GET /api/categories — paged list ({ data, total, limit, offset })
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parsePagination(searchParams);
    const result = await categoryService.list(page);
    return Response.json(result);
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
