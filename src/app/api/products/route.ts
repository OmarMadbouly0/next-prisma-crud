import { prisma } from "@/app/lib/prisma";
import { ProductSchema } from "@/lib/validations/product";

export async function GET() {
  const products = await prisma.product.findMany();

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