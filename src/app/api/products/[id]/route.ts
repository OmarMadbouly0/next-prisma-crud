import { prisma } from "@/app/lib/prisma";

// GET /api/products/:id — fetch a single product by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseInt(id);

  const product = await prisma.product.findUnique({
    where: { id: numericId },
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
  const numericId = parseInt(id);
  const body = await request.json();

  const product = await prisma.product.update({
    where: { id: numericId },
    data: {
      name: body.name,
      price: body.price,
      category: body.category,
    },
  });

  return Response.json(product);
}

// DELETE /api/products/:id — delete a product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseInt(id);

  await prisma.product.delete({
    where: { id: numericId },
  });

  return Response.json({ message: "Product deleted successfully" });
}
