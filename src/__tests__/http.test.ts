import { describe, it, expect } from "vitest";
import { handleError, parseId } from "@/lib/http";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors";

// Prisma known-request errors carry a `code` property; these races can't be
// triggered deterministically through the routes, so we exercise the mapping
// directly with synthetic errors shaped like Prisma's.
function prismaError(code: string) {
  const err = new Error(`Synthetic Prisma error ${code}`);
  (err as Error & { code: string }).code = code;
  return err;
}

describe("handleError", () => {
  it("maps ValidationError to 400", async () => {
    const res = handleError(new ValidationError("bad input"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad input");
  });

  it("maps NotFoundError to 404", () => {
    expect(handleError(new NotFoundError("nope")).status).toBe(404);
  });

  it("maps ConflictError to 409", () => {
    expect(handleError(new ConflictError("dupe")).status).toBe(409);
  });

  it("maps Prisma P2003 (FK violation race) to 409, not 500", async () => {
    const res = handleError(prismaError("P2003"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(
      "Operation conflicts with related data"
    );
  });

  it("maps Prisma P2025 (row vanished race) to 404, not 500", async () => {
    const res = handleError(prismaError("P2025"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Resource not found");
  });

  it("maps unknown errors to 500 without leaking details", async () => {
    const res = handleError(new Error("secret internal detail"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Internal server error");
  });
});

describe("parseId", () => {
  it("parses a normal id", () => {
    expect(parseId("42")).toBe(42);
  });

  it("accepts the Int4 max", () => {
    expect(parseId("2147483647")).toBe(2147483647);
  });

  it("rejects non-numeric, negative, and overflowing ids", () => {
    for (const bad of [
      "abc",
      "-1",
      "1.5",
      "2147483648", // Int4 max + 1
      "99999999999999999999", // beyond safe integer precision
    ]) {
      expect(() => parseId(bad), bad).toThrow(ValidationError);
    }
  });
});
