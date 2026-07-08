import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/categories/route";
import { prisma } from "@/app/lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── GET /api/categories ──────────────────────────────────────────────────────
describe("GET /api/categories", () => {
  it("returns 200 and an empty array when no categories exist", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it("returns categories with the correct shape (id, name, createdAt)", async () => {
    await POST(makePostRequest({ name: "Electronics" }));

    const res = await GET();
    const data = await res.json();

    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("name", "Electronics");
    expect(data[0]).toHaveProperty("createdAt");
  });

  it("returns categories sorted by name ascending", async () => {
    await POST(makePostRequest({ name: "Toys" }));
    await POST(makePostRequest({ name: "Books" }));
    await POST(makePostRequest({ name: "Electronics" }));

    const res = await GET();
    const data = await res.json();

    expect(data.map((c: { name: string }) => c.name)).toEqual([
      "Books",
      "Electronics",
      "Toys",
    ]);
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
