import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "@/app/api/products/[id]/route";
import { prisma } from "@/app/lib/prisma";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// ─── Helper: build a fake dynamic-route context ───────────────────────────────
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(url: string, options?: RequestInit) {
  return new Request(url, options);
}

// ─── Test Suite: GET /api/products/:id ───────────────────────────────────────
describe("GET /api/products/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 and the product when found", async () => {
    const fakeProduct = { id: 1, name: "Laptop", price: 999, category: "electronics", createdAt: new Date() };
    vi.mocked(prisma.product.findUnique).mockResolvedValue(fakeProduct);

    const request = makeRequest("http://localhost:3000/api/products/1");
    const response = await GET(request, makeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(1);
    expect(body.name).toBe("Laptop");
    expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("returns 404 when product is not found", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);

    const request = makeRequest("http://localhost:3000/api/products/999");
    const response = await GET(request, makeParams("999"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Product not found");
  });
});

// ─── Test Suite: PUT /api/products/:id ───────────────────────────────────────
describe("PUT /api/products/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates and returns the product", async () => {
    const updated = { id: 1, name: "Gaming Laptop", price: 1299, category: "electronics", createdAt: new Date() };
    vi.mocked(prisma.product.update).mockResolvedValue(updated);

    const request = makeRequest("http://localhost:3000/api/products/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gaming Laptop", price: 1299, category: "electronics" }),
    });
    const response = await PUT(request, makeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe("Gaming Laptop");
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: "Gaming Laptop", price: 1299, category: "electronics" },
    });
  });
});

// ─── Test Suite: DELETE /api/products/:id ────────────────────────────────────
describe("DELETE /api/products/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the product and returns success message", async () => {
    vi.mocked(prisma.product.delete).mockResolvedValue({
      id: 1, name: "Laptop", price: 999, category: "electronics", createdAt: new Date(),
    });

    const request = makeRequest("http://localhost:3000/api/products/1", { method: "DELETE" });
    const response = await DELETE(request, makeParams("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Product deleted successfully");
    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
