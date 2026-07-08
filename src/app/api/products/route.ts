import { prisma } from "@/app/lib/prisma";
import { ProductSchema } from "@/lib/validations/product";
import {
  categoryExists,
  errorResponse,
  isProductNameTaken,
  validateBody,
} from "@/lib/api-helpers";

//Get All
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Still filter by category NAME — but now we traverse the relation
  const category = searchParams.get("category");

  if (category !== null && category.trim() === "") {
    return errorResponse("category query param cannot be empty", 400);
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
  const data = await validateBody(request, ProductSchema);
  if (data instanceof Response) return data;

  const { name, price, categoryId } = data;

  if (!(await categoryExists(categoryId))) {
    return errorResponse("Category not found", 404);
  }

  if (await isProductNameTaken(name, categoryId)) {
    return errorResponse(
      "A product with this name already exists in this category",
      409
    );
  }

  const product = await prisma.product.create({
    data: { name, price, categoryId },
    include: { category: true }, // embed category in response
  });

  return Response.json(product, { status: 201 });
}
