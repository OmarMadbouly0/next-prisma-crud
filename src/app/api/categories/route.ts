import { prisma } from "@/app/lib/prisma";
import { CategorySchema } from "@/lib/validations/category";
import { Prisma } from "@prisma/client";

// GET /api/categories — list all categories
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(categories);
}

// POST /api/categories — create a new category
export async function POST(request: Request) {
  const body = await request.json();
  const result = CategorySchema.safeParse(body);

  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 });
  }

  try {
    const category = await prisma.category.create({
      data: result.data,
    });

    return Response.json(category, { status: 201 });
  } catch (error) {
    // Prisma error code P2002 = unique constraint violation
    // This fires when you try to create a category with a name that already exists
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "A category with this name already exists" },
        { status: 409 } // 409 Conflict
      );
    }
    throw error;
  }
}
