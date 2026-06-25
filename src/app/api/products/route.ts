import { prisma } from "@/app/lib/prisma";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category");

  const products = await prisma.product.findMany({
    where: {
      ...(category ? { category } : {}),
    },
  });

  return Response.json(products);
}

export async function POST(request: Request) {
  const body = await request.json();

  const product = await prisma.product.create({
    data: {
      name: body.name,
      price: body.price,
      category: body.category,
    },
  });

  return Response.json(product);
}