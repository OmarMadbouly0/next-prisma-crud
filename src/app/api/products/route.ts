import { prisma } from "@/app/lib/prisma";
import { ProductSchema } from "@/lib/validations/product";

export async function GET(request: Request) {
  // Parse query params from the URL
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  // Validate: if category is provided, it must not be an empty string
  if (category !== null && category.trim() === "") {
    return Response.json(
      { error: "category query param cannot be empty" },
      { status: 400 }
    );
  }

  const products = await prisma.product.findMany({
    where: {
      ...(category ? { category } : {}),
    },
  });

  return Response.json(products);
}

export async function POST(request: Request) {
  const body = await request.json();

  const result =
    ProductSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten(), }, { status: 400, }
    );
  }

  const product = await prisma.product.create({
    data: result.data,
  });

  return Response.json(product, {
    status: 201,
  });
}