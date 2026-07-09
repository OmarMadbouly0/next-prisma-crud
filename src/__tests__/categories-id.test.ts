import { describe, it, expect } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/categories/[id]/route";
import { prisma } from "@/app/lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest(id: string) {
  return new Request(`http://localhost/api/categories/${id}`);
}

function makePutRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(id: string) {
  return new Request(`http://localhost/api/categories/${id}`, {
    method: "DELETE",
  });
}

// ─── Seed Helpers ─────────────────────────────────────────────────────────────

async function createCategory(name = "Electronics") {
  return prisma.category.create({ data: { name } });
}

// ─── GET /api/categories/:id ──────────────────────────────────────────────────
describe("GET /api/categories/:id", () => {
  it("returns 200 and the category", async () => {
    const category = await createCategory();

    const res = await GET(
      makeGetRequest(String(category.id)),
      makeParams(String(category.id))
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(category.id);
    expect(data.name).toBe("Electronics");
  });

  it("returns 404 when category does not exist", async () => {
    const res = await GET(makeGetRequest("99999"), makeParams("99999"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await GET(makeGetRequest("abc"), makeParams("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when id is a negative number", async () => {
    const res = await GET(makeGetRequest("-1"), makeParams("-1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when id has trailing characters (123abc)", async () => {
    const res = await GET(makeGetRequest("123abc"), makeParams("123abc"));
    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/categories/:id ──────────────────────────────────────────────────
describe("PUT /api/categories/:id", () => {
  it("returns 200 and updates the category name", async () => {
    const category = await createCategory();

    const res = await PUT(
      makePutRequest(String(category.id), { name: "Gadgets" }),
      makeParams(String(category.id))
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Gadgets");
  });

  it("returns 404 when category does not exist", async () => {
    const res = await PUT(
      makePutRequest("99999", { name: "Gadgets" }),
      makeParams("99999")
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await PUT(
      makePutRequest("abc", { name: "Gadgets" }),
      makeParams("abc")
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is empty", async () => {
    const category = await createCategory();
    const res = await PUT(
      makePutRequest(String(category.id), {}),
      makeParams(String(category.id))
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is too short", async () => {
    const category = await createCategory();
    const res = await PUT(
      makePutRequest(String(category.id), { name: "A" }),
      makeParams(String(category.id))
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when name exceeds 50 characters", async () => {
    const category = await createCategory();
    const res = await PUT(
      makePutRequest(String(category.id), { name: "A".repeat(51) }),
      makeParams(String(category.id))
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when renaming to a name taken by another category", async () => {
    await createCategory("Books");
    const category = await createCategory("Electronics");

    const res = await PUT(
      makePutRequest(String(category.id), { name: "Books" }),
      makeParams(String(category.id))
    );

    expect(res.status).toBe(409);
  });

  it("returns 200 when renaming a category to its own current name", async () => {
    const category = await createCategory("Electronics");

    const res = await PUT(
      makePutRequest(String(category.id), { name: "Electronics" }),
      makeParams(String(category.id))
    );

    expect(res.status).toBe(200);
  });

  it("does NOT update id or createdAt even if sent in body", async () => {
    const category = await createCategory();
    const originalId = category.id;
    const originalCreatedAt = category.createdAt.toISOString();

    await PUT(
      makePutRequest(String(category.id), {
        id: 9999,
        createdAt: "2000-01-01T00:00:00.000Z",
        name: "Updated Name",
      }),
      makeParams(String(category.id))
    );

    const updated = await prisma.category.findUnique({ where: { id: originalId } });
    expect(updated!.id).toBe(originalId);
    expect(updated!.createdAt.toISOString()).toBe(originalCreatedAt);
    expect(updated!.name).toBe("Updated Name");
  });
});

// ─── DELETE /api/categories/:id ───────────────────────────────────────────────
describe("DELETE /api/categories/:id", () => {
  it("returns 204 and actually removes the category", async () => {
    const category = await createCategory();

    const res = await DELETE(
      makeDeleteRequest(String(category.id)),
      makeParams(String(category.id))
    );

    expect(res.status).toBe(204);
    const gone = await prisma.category.findUnique({ where: { id: category.id } });
    expect(gone).toBeNull();
  });

  it("returns 404 when category does not exist", async () => {
    const res = await DELETE(makeDeleteRequest("99999"), makeParams("99999"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await DELETE(makeDeleteRequest("abc"), makeParams("abc"));
    expect(res.status).toBe(400);
  });

  it("returns 409 when the category still has products assigned", async () => {
    const category = await createCategory();
    await prisma.product.create({
      data: { name: "Laptop", price: 999.99, categoryId: category.id },
    });

    const res = await DELETE(
      makeDeleteRequest(String(category.id)),
      makeParams(String(category.id))
    );

    expect(res.status).toBe(409);
    // Category must still exist
    const stillThere = await prisma.category.findUnique({
      where: { id: category.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it("returns 204 once the category's products have been removed", async () => {
    const category = await createCategory();
    const product = await prisma.product.create({
      data: { name: "Laptop", price: 999.99, categoryId: category.id },
    });
    await prisma.product.delete({ where: { id: product.id } });

    const res = await DELETE(
      makeDeleteRequest(String(category.id)),
      makeParams(String(category.id))
    );

    expect(res.status).toBe(204);
  });
});
