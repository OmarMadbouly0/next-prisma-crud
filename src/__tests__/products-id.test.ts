import { describe, it, expect } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/products/[id]/route";
import { POST } from "@/app/api/products/route";
import { prisma } from "@/app/lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Creates a params argument — mimics how Next.js passes route params
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

// Seed helper: inserts one product directly into DB and returns it
async function createProduct(overrides = {}) {
  return prisma.product.create({
    data: {
      name: "Test Laptop",
      price: 799.99,
      category: "Electronics",
      ...overrides,
    },
  });
}

// ─── GET /api/products/:id ────────────────────────────────────────────────────
describe("GET /api/products/:id", () => {
  it("returns 200 and the product when it exists", async () => {
    const product = await createProduct();

    const res = await GET(makeGetRequest(String(product.id)), makeParams(String(product.id)));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(product.id);
    expect(data.name).toBe("Test Laptop");
  });

  it("returns 404 when product does not exist", async () => {
    const res = await GET(makeGetRequest("99999"), makeParams("99999"));

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  it("returns 400 when id is not a number", async () => {
    const res = await GET(makeGetRequest("abc"), makeParams("abc"));

    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/products/:id ────────────────────────────────────────────────────
describe("PUT /api/products/:id", () => {
  it("returns 200 and updates the product with valid partial body", async () => {
    const product = await createProduct();

    const res = await PUT(
      makePutRequest(String(product.id), { price: 599.99 }),
      makeParams(String(product.id))
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.price).toBe(599.99);
    // Name should be unchanged
    expect(data.name).toBe("Test Laptop");
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

    const res = await PUT(
      makePutRequest(String(product.id), {}),
      makeParams(String(product.id))
    );

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

  it("returns 400 when price has more than 2 decimal places", async () => {
    const product = await createProduct();

    const res = await PUT(
      makePutRequest(String(product.id), { price: 9.999 }),
      makeParams(String(product.id))
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too short", async () => {
    const product = await createProduct();

    const res = await PUT(
      makePutRequest(String(product.id), { name: "AB" }),
      makeParams(String(product.id))
    );

    expect(res.status).toBe(400);
  });

  it("does NOT update id or createdAt even if sent in body", async () => {
    const product = await createProduct();
    const originalId = product.id;
    const originalCreatedAt = product.createdAt.toISOString();

    // Attempt to change id and createdAt — Zod schema strips them
    await PUT(
      makePutRequest(String(product.id), {
        id: 9999,
        createdAt: "2000-01-01T00:00:00.000Z",
        name: "Updated Name",
      }),
      makeParams(String(product.id))
    );

    // Fetch fresh from DB and verify id and createdAt are unchanged
    const updated = await prisma.product.findUnique({ where: { id: originalId } });
    expect(updated!.id).toBe(originalId);
    expect(updated!.createdAt.toISOString()).toBe(originalCreatedAt);
    expect(updated!.name).toBe("Updated Name");
  });
});

// ─── DELETE /api/products/:id ─────────────────────────────────────────────────
describe("DELETE /api/products/:id", () => {
  it("returns 200 and deletes the product when it exists", async () => {
    const product = await createProduct();

    const res = await DELETE(makeDeleteRequest(String(product.id)), makeParams(String(product.id)));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("Product deleted successfully");

    // Verify it's actually gone from the DB
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
