import { prisma } from "@/app/lib/prisma";
import { ProductSchema } from "@/lib/validations/product";
import { Prisma } from "@prisma/client";

//Get All
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Still filter by category NAME — but now we traverse the relation
  const category = searchParams.get("category");

  if (category !== null && category.trim() === "") {
    return Response.json(
      { error: "category query param cannot be empty" },
      { status: 400 }
    );
  }

  const products = await prisma.product.findMany({
    // include: embed the full category object in each product
    include: { category: true },
    where: {
      // Filter by category name via the relation — Prisma handles the JOIN
      ...(category ? { category: { name: category } } : {}),
    },
  });

  return Response.json(products);
}

//Create One
export async function POST(request: Request) {
  const body = await request.json();
  const result = ProductSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const product = await prisma.product.create({
      data: result.data, // { name, price, categoryId }
      include: { category: true }, // embed category in response
    });

    return Response.json(product, { status: 201 });
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