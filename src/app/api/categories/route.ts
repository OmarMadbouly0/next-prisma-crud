import { prisma } from "@/app/lib/prisma";
import { CategorySchema } from "@/lib/validations/category";
import {
  errorResponse,
  isCategoryNameTaken,
  validateBody,
} from "@/lib/api-helpers";

// GET /api/categories — list all categories
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(categories);
}

// POST /api/categories — create a new category
export async function POST(request: Request) {
  const data = await validateBody(request, CategorySchema);
  if (data instanceof Response) return data;

  if (await isCategoryNameTaken(data.name)) {
    return errorResponse("A category with this name already exists", 409);
  }

  const category = await prisma.category.create({
    data,
  });

  return Response.json(category, { status: 201 });
}
