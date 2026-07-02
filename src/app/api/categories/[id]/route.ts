import { prisma } from "@/app/lib/prisma";
import { CategorySchema } from "@/lib/validations/category";
import { Prisma } from "@prisma/client";

function parseId(id: string) {
  const numericId = parseInt(id);
  return isNaN(numericId) ? null : numericId;
}

// GET /api/categories/:id — fetch one category with its products
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseId(id);

  if (numericId === null) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: numericId },
    // include: { products: true } ← include products if you want to see them
  });

  if (!category) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }

  return Response.json(category);
}

// PUT /api/categories/:id — update a category name
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseId(id);

  if (numericId === null) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();
  const result = CategorySchema.partial().safeParse(body);

  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 });
  }

  if (Object.keys(result.data).length === 0) {
    return Response.json(
      { error: "Provide at least one field to update" },
      { status: 400 }
    );
  }

  const existing = await prisma.category.findUnique({
    where: { id: numericId },
  });

  if (!existing) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }

  try {
    const category = await prisma.category.update({
      where: { id: numericId },
      data: result.data,
    });

    return Response.json(category);
  } catch (error) {
    // Catch duplicate name on update
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }
    throw error;
  }
}

// DELETE /api/categories/:id — delete a category
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseId(id);

  if (numericId === null) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({
    where: { id: numericId },
  });

  if (!existing) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }

  try {
    await prisma.category.delete({ where: { id: numericId } });
    return Response.json({ message: "Category deleted successfully" });
  } catch (error) {
    // Prisma P2003 = foreign key constraint violation
    // ON DELETE RESTRICT means you can't delete a category that still has products
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return Response.json(
        { error: "Cannot delete category: it still has products assigned to it" },
        { status: 409 }
      );
    }
    throw error;
  }
}
