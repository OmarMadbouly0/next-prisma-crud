import { describe, it, expect, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/products/[id]/route";
import { prisma } from "@/app/lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest(id: string) {
  return new Request(`http://localhost/api/products/${id}`);
}

function makePutRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string) {
  return new Request(`http://localhost/api/products/${id}`, {
    method: "DELETE",
  });
}

// ─── Seed Helpers ─────────────────────────────────────────────────────────────

let defaultCategoryId: number;

beforeEach(async () => {
  const category = await prisma.category.create({ data: { name: "Electronics" } });
  defaultCategoryId = category.id;
});

async function createProduct(overrides = {}) {
  return prisma.product.create({
    data: {
      name: "Test Laptop",
      price: 799.99,
      categoryId: defaultCategoryId,
      ...overrides,
    },
  });
}

// ─── GET /api/products/:id ────────────────────────────────────────────────────
describe("GET /api/products/:id", () => {
  it("returns 200 and the product with its category", async () => {
    const product = await createProduct();

    const res = await GET(makeGetRequest(String(product.id)), makeParams(String(product.id)));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(product.id);
    // Category is embedded in the response
    expect(data.category).toHaveProperty("name", "Electronics");
  });

  it("returns 404 when product does not exist", async () => {
    const res = await GET(makeGetRequest("99999"), makeParams("99999"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await GET(makeGetRequest("abc"), makeParams("abc"));
    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
describe("PUT /api/products/:id", () => {
  it("returns 200 and updates the product price", async () => {
    const product = await createProduct();

    const res = await PUT(
      makePutRequest(String(product.id), { price: 599.99 }),
      makeParams(String(product.id))
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.price).toBe(599.99);
    expect(data.name).toBe("Test Laptop"); // unchanged
  });

  it("can update categoryId to reassign a product", async () => {
    const product = await createProduct();
    const newCategory = await prisma.category.create({ data: { name: "Computers" } });

    const res = await PUT(
      makePutRequest(String(product.id), { categoryId: newCategory.id }),
      makeParams(String(product.id))
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.category.name).toBe("Computers");
  });

  it("returns 404 when product does not exist", async () => {
    const res = await PUT(
      makePutRequest("99999", { price: 100 }),
      makeParams("99999")
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await PUT(makePutRequest("abc", { price: 100 }), makeParams("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is empty", async () => {
    const product = await createProduct();
    const res = await PUT(makePutRequest(String(product.id), {}), makeParams(String(product.id)));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price is invalid (negative)", async () => {
    const product = await createProduct();
    const res = await PUT(
      makePutRequest(String(product.id), { price: -1 }),
      makeParams(String(product.id))
    );
    expect(res.status).toBe(400);
  });

  it("does NOT update id or createdAt even if sent in body", async () => {
    const product = await createProduct();
    const originalId = product.id;
    const originalCreatedAt = product.createdAt.toISOString();

    await PUT(
      makePutRequest(String(product.id), {
        id: 9999,
        createdAt: "2000-01-01T00:00:00.000Z",
        name: "Updated Name",
      }),
      makeParams(String(product.id))
    );

    const updated = await prisma.product.findUnique({ where: { id: originalId } });
    expect(updated!.id).toBe(originalId);
    expect(updated!.createdAt.toISOString()).toBe(originalCreatedAt);
    expect(updated!.name).toBe("Updated Name");
  });
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
describe("DELETE /api/products/:id", () => {
  it("returns 200 and actually removes the product", async () => {
    const product = await createProduct();

    const res = await DELETE(makeDeleteRequest(String(product.id)), makeParams(String(product.id)));

    expect(res.status).toBe(200);
    const gone = await prisma.product.findUnique({ where: { id: product.id } });
    expect(gone).toBeNull();
  });

  it("returns 404 when product does not exist", async () => {
    const res = await DELETE(makeDeleteRequest("99999"), makeParams("99999"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await DELETE(makeDeleteRequest("abc"), makeParams("abc"));
    expect(res.status).toBe(400);
  });
});
