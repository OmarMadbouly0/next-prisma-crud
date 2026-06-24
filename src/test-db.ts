import { prisma } from "@/app/lib/prisma";

async function test() {
  const result = await prisma.product.findMany();
  console.log(result);
}

test();
