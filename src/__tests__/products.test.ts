import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/products/route";

// ─── Helper: build a fake Request ────────────────────────────────────────────
// Instead of running a server, we call the route handler directly.
// We just need to give it a real Request object.

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

// ─── GET /api/products ────────────────────────────────────────────────────────
describe("GET /api/products", () => {
  it("returns 200 and an empty array when no products exist", async () => {
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it("returns products with the correct shape (id, name, price, category, createdAt)", async () => {
    // First create a product directly via POST
    await POST(makePostRequest({ name: "Laptop", price: 999.99, category: "Electronics" }));

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(data).toHaveLength(1);
    // Check every expected field is present
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("price");
    expect(data[0]).toHaveProperty("category");
    expect(data[0]).toHaveProperty("createdAt");
  });

  it("filters by ?category= when provided", async () => {
    // Create two products in different categories
    await POST(makePostRequest({ name: "Laptop", price: 999, category: "Electronics" }));
    await POST(makePostRequest({ name: "Novel", price: 15, category: "Books" }));

    const res = await GET(makeGetRequest("?category=Electronics"));
    const data = await res.json();

    expect(data).toHaveLength(1);
    expect(data[0].category).toBe("Electronics");
  });

  it("returns 400 when ?category= is an empty string", async () => {
    const res = await GET(makeGetRequest("?category="));

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/products ───────────────────────────────────────────────────────
describe("POST /api/products", () => {
  const validProduct = { name: "Laptop", price: 999.99, category: "Electronics" };

  // ── Happy Path ──
  it("returns 201 and the created product with valid body", async () => {
    const res = await POST(makePostRequest(validProduct));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.name).toBe("Laptop");
    expect(data.price).toBe(999.99);
    expect(data.category).toBe("Electronics");
  });

  // ── Name Validation ──
  it("returns 400 when name is missing", async () => {
    const res = await POST(makePostRequest({ price: 99, category: "Books" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is less than 3 characters", async () => {
    const res = await POST(makePostRequest({ ...validProduct, name: "AB" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name exceeds 100 characters", async () => {
    const longName = "A".repeat(101);
    const res = await POST(makePostRequest({ ...validProduct, name: longName }));
    expect(res.status).toBe(400);
  });

  // ── Price Validation ──
  it("returns 400 when price is missing", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", category: "Electronics" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price is 0", async () => {
    const res = await POST(makePostRequest({ ...validProduct, price: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price is negative", async () => {
    const res = await POST(makePostRequest({ ...validProduct, price: -5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price exceeds 999,999", async () => {
    const res = await POST(makePostRequest({ ...validProduct, price: 1000000 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when price has more than 2 decimal places", async () => {
    const res = await POST(makePostRequest({ ...validProduct, price: 9.999 }));
    expect(res.status).toBe(400);
  });

  it("accepts price with exactly 2 decimal places", async () => {
    const res = await POST(makePostRequest({ ...validProduct, price: 9.99 }));
    expect(res.status).toBe(201);
  });

  // ── Category Validation ──
  it("returns 400 when category is missing", async () => {
    const res = await POST(makePostRequest({ name: "Laptop", price: 99 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when category is less than 3 characters", async () => {
    const res = await POST(makePostRequest({ ...validProduct, category: "IT" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when category exceeds 100 characters", async () => {
    const longCategory = "A".repeat(101);
    const res = await POST(makePostRequest({ ...validProduct, category: longCategory }));
    expect(res.status).toBe(400);
  });
});
