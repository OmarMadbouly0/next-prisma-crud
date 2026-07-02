import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/products/route";
import { prisma } from "@/app/lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGetRequest(queryString = "") {
  return new Request(`http://localhost/api/products${queryString}`);
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

// Every test that creates products needs a category first (FK constraint)
// We create one before each test and use its id
let categoryId: number;

beforeEach(async () => {
  const category = await prisma.category.create({ data: { name: "Electronics" } });
  categoryId = category.id;
});

// ─── GET /api/products ────────────────────────────────────────────────────────
describe("GET /api/products", () => {
  it("returns 200 and an empty array when no products exist", async () => {
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it("returns products with the correct shape (id, name, price, categoryId, category, createdAt)", async () => {
    await POST(makePostRequest({ name: "Laptop", price: 999.99, categoryId }));

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("price");
    expect(data[0]).toHaveProperty("categoryId");
    expect(data[0]).toHaveProperty("createdAt");
    // category is now an embedded object (from include: { category: true })
    expect(data[0]).toHaveProperty("category");
    expect(data[0].category).toHaveProperty("name", "Electronics");
  });

  it("filters by ?category= name when provided", async () => {
    const booksCategory = await prisma.category.create({ data: { name: "Books" } });
    await POST(makePostRequest({ name: "Laptop", price: 999, categoryId }));
    await POST(makePostRequest({ name: "Novel", price: 15, categoryId: booksCategory.id }));

    const res = await GET(makeGetRequest("?category=Electronics"));
    const data = await res.json();

    expect(data).toHaveLength(1);
    expect(data[0].category.name).toBe("Electronics");
  });

  it("returns 400 when ?category= is an empty string", async () => {
    const res = await GET(makeGetRequest("?category="));
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/products ───────────────────────────────────────────────────────
describe("POST /api/products", () => {
  it("returns 201 with valid body", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", price: 999.99, categoryId }));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.name).toBe("Laptop");
    expect(data.categoryId).toBe(categoryId);
    // Should embed the category object
    expect(data.category.name).toBe("Electronics");
  });

  // ── Name Validation ──
  it("returns 400 when name is missing", async () => {
    const res = await POST(makePostRequest({ price: 99, categoryId }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is less than 3 characters", async () => {
    const res = await POST(makePostRequest({ name: "AB", price: 99, categoryId }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name exceeds 100 characters", async () => {
    const res = await POST(makePostRequest({ name: "A".repeat(101), price: 99, categoryId }));
    expect(res.status).toBe(400);
  });

  // ── Price Validation ──
  it("returns 400 when price is missing", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", categoryId }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price is 0", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", price: 0, categoryId }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price is negative", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", price: -5, categoryId }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price exceeds 999,999", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", price: 1000000, categoryId }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price has more than 2 decimal places", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", price: 9.999, categoryId }));
    expect(res.status).toBe(400);
  });

  it("accepts price with exactly 2 decimal places", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", price: 9.99, categoryId }));
    expect(res.status).toBe(201);
  });

  // ── Category Validation ──
  it("returns 400 when categoryId is missing", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", price: 99 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when categoryId is not an integer", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", price: 99, categoryId: 1.5 }));
    expect(res.status).toBe(400);
  });
});
