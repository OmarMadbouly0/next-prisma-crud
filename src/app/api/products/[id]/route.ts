import { prisma } from "@/app/lib/prisma";
import { ProductSchema } from "@/lib/validations/product";

// Reusable helper — parse and validate the :id URL param
function parseId(id: string) {
  const numericId = parseInt(id);
  return isNaN(numericId) ? null : numericId;
}

// GET /api/products/:id — fetch a single product by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseId(id);

  // Validate: id must be a real number
  if (numericId === null) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: numericId },
  });

  // Validate: product must exist
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

  // Validate: id must be a real number
  if (numericId === null) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await request.json();

  // Validate body with Zod — .partial() makes all fields optional for updates
  const result = ProductSchema.partial().safeParse(body);

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten() },
      { status: 400 }
    );
  }

  // Also guard: at least one field must be provided
  if (Object.keys(result.data).length === 0) {
    return Response.json(
      { error: "Provide at least one field to update" },
      { status: 400 }
    );
  }

  // Guard: check product exists before updating
  // prisma.update() throws (not returns null) if record not found
  const existing = await prisma.product.findUnique({
    where: { id: numericId },
  });

  if (!existing) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const product = await prisma.product.update({
    where: { id: numericId },
    data: result.data,
  });

  return Response.json(product);
}

// DELETE /api/products/:id — delete a product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseId(id);

  // Validate: id must be a real number
  if (numericId === null) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  // Guard: check it exists before deleting
  const existing = await prisma.product.findUnique({
    where: { id: numericId },
  });

  if (!existing) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.product.delete({
    where: { id: numericId },
  });

  return Response.json({ message: "Product deleted successfully" });
}
