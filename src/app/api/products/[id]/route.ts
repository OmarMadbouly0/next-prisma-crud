import { prisma } from "@/app/lib/prisma";
import { ProductSchema } from "@/lib/validations/product";
import { Prisma } from "@prisma/client";

function parseId(id: string) {
  const numericId = parseInt(id);
  return isNaN(numericId) ? null : numericId;
}

// GET /api/products/:id — fetch a single product with its category
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseId(id);

  if (numericId === null) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: numericId },
    include: { category: true },
  });

  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  return Response.json(product);
}

// PUT /api/products/:id — update an existing product
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
  const result = ProductSchema.partial().safeParse(body);

  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 });
  }

  if (Object.keys(result.data).length === 0) {
    return Response.json(
      { error: "Provide at least one field to update" },
      { status: 400 }
    );
  }

  const existing = await prisma.product.findUnique({
    where: { id: numericId },
  });

  if (!existing) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  try {
    const product = await prisma.product.update({
      where: { id: numericId },
      data: result.data,
      include: { category: true },
    });

    return Response.json(product);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === "P2003") {
        return Response.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
      if (error.code === "P2002") {
        return Response.json(
          { error: "A product with this name already exists in this category" },
          { status: 409 }
        );
      }
    }
    throw error;
  }
}

// DELETE /api/products/:id — delete a product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseId(id);

  if (numericId === null) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({
    where: { id: numericId },
  });

  if (!existing) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id: numericId } });

  return Response.json({ message: "Product deleted successfully" });
}
