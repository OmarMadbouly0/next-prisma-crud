import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/categories/route";
import { prisma } from "@/app/lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGetRequest(queryString = "") {
  return new Request(`http://localhost/api/categories${queryString}`);
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── GET /api/categories ──────────────────────────────────────────────────────
describe("GET /api/categories", () => {
  it("returns 200 and an empty page when no categories exist", async () => {
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const { data, total } = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
    expect(total).toBe(0);
  });

  it("returns categories with the correct shape (id, name, createdAt)", async () => {
    await POST(makePostRequest({ name: "Electronics" }));

    const res = await GET(makeGetRequest());
    const { data } = await res.json();

    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("name", "Electronics");
    expect(data[0]).toHaveProperty("createdAt");
  });

  it("returns categories sorted by name ascending", async () => {
    await POST(makePostRequest({ name: "Toys" }));
    await POST(makePostRequest({ name: "Books" }));
    await POST(makePostRequest({ name: "Electronics" }));

    const res = await GET(makeGetRequest());
    const { data } = await res.json();

    expect(data.map((c: { name: string }) => c.name)).toEqual([
      "Books",
      "Electronics",
      "Toys",
    ]);
  });

  it("respects ?limit= and ?offset= and reports the true total", async () => {
    await POST(makePostRequest({ name: "Books" }));
    await POST(makePostRequest({ name: "Electronics" }));
    await POST(makePostRequest({ name: "Toys" }));

    const res = await GET(makeGetRequest("?limit=2&offset=1"));
    const { data, total, limit, offset } = await res.json();

    expect(data.map((c: { name: string }) => c.name)).toEqual([
      "Electronics",
      "Toys",
    ]);
    expect(total).toBe(3);
    expect(limit).toBe(2);
    expect(offset).toBe(1);
  });

  it("returns 400 for an invalid limit", async () => {
    expect((await GET(makeGetRequest("?limit=0"))).status).toBe(400);
    expect((await GET(makeGetRequest("?limit=101"))).status).toBe(400);
    expect((await GET(makeGetRequest("?limit=abc"))).status).toBe(400);
    expect((await GET(makeGetRequest("?offset=-1"))).status).toBe(400);
  });
});

// ─── POST /api/categories ─────────────────────────────────────────────────────
describe("POST /api/categories", () => {
  it("returns 201 with valid body", async () => {
    const res = await POST(makePostRequest({ name: "Electronics" }));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.name).toBe("Electronics");
    expect(data).toHaveProperty("createdAt");
  });

  // ── Name Validation ──
  it("returns 400 when name is missing", async () => {
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it("trims whitespace, so ' Books ' conflicts with existing 'Books'", async () => {
    await POST(makePostRequest({ name: "Books" }));

    const res = await POST(makePostRequest({ name: "  Books  " }));
    expect(res.status).toBe(409);

    const count = await prisma.category.count();
    expect(count).toBe(1);
  });

  it("returns 400 when name is not a string", async () => {
    const res = await POST(makePostRequest({ name: 123 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is less than 2 characters", async () => {
    const res = await POST(makePostRequest({ name: "A" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name exceeds 50 characters", async () => {
    const res = await POST(makePostRequest({ name: "A".repeat(51) }));
    expect(res.status).toBe(400);
  });

  it("accepts a name of exactly 2 characters", async () => {
    const res = await POST(makePostRequest({ name: "TV" }));
    expect(res.status).toBe(201);
  });

  it("accepts a name of exactly 50 characters", async () => {
    const res = await POST(makePostRequest({ name: "A".repeat(50) }));
    expect(res.status).toBe(201);
  });

  // ── Uniqueness ──
  it("returns 409 when a category with the same name already exists", async () => {
    await POST(makePostRequest({ name: "Electronics" }));

    const res = await POST(makePostRequest({ name: "Electronics" }));

    expect(res.status).toBe(409);
    // Make sure no duplicate row was created
    const count = await prisma.category.count({ where: { name: "Electronics" } });
    expect(count).toBe(1);
  });
});
