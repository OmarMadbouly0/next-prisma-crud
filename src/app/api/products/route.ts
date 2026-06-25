import { prisma } from "@/app/lib/prisma";


export async function GET() {
  const products = await prisma.product.findMany();

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