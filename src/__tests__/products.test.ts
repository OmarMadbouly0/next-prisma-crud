import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/products/route";
import { prisma } from "@/app/lib/prisma";

// ─── Mock the entire Prisma module ───────────────────────────────────────────
// We don't want tests touching the real database.
// vi.mock() replaces @/app/lib/prisma with a fake version.
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// ─── Helper: build a fake Request object ─────────────────────────────────────
function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

// ─── Test Suite: GET /api/products ───────────────────────────────────────────
describe("GET /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // reset mocks between each test
  });

  it("returns all products when no query param is given", async () => {
    // ARRANGE: tell the mock what to return
    const fakeProducts = [
      { id: 1, name: "Laptop", price: 999, category: "electronics", createdAt: new Date() },
      { id: 2, name: "Phone", price: 499, category: "electronics", createdAt: new Date() },
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(fakeProducts);

    // ACT: call the handler with a request that has no query params
    const request = makeRequest("http://localhost:3000/api/products");
    const response = await GET(request);
    const body = await response.json();

    // ASSERT: check we got back what we expected
    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {}, // no filter applied
    });
  });

  it("filters products by category when ?category= is provided", async () => {
    // ARRANGE
    const fakeProducts = [
      { id: 1, name: "Laptop", price: 999, category: "electronics", createdAt: new Date() },
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(fakeProducts);

    // ACT: request with ?category=electronics
    const request = makeRequest("http://localhost:3000/api/products?category=electronics");
    const response = await GET(request);
    const body = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { category: "electronics" }, // filter was applied
    });
  });
});

// ─── Test Suite: POST /api/products ──────────────────────────────────────────
describe("POST /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates and returns a new product", async () => {
    // ARRANGE
    const newProduct = { id: 3, name: "Tablet", price: 299, category: "electronics", createdAt: new Date() };
    vi.mocked(prisma.product.create).mockResolvedValue(newProduct);

    // ACT: POST with a JSON body
    const request = makeRequest("http://localhost:3000/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Tablet", price: 299, category: "electronics" }),
    });
    const response = await POST(request);
    const body = await response.json();

    // ASSERT
    expect(response.status).toBe(200);
    expect(body.name).toBe("Tablet");
    expect(body.price).toBe(299);
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: { name: "Tablet", price: 299, category: "electronics" },
    });
  });
});
