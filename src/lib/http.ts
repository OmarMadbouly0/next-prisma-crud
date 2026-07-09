import type { ZodType } from "zod";
import { AppError, ValidationError, hasErrorCode } from "@/lib/errors";

/**
 * HTTP-layer helpers shared by the route controllers.
 * Everything web-specific (request parsing, error → Response mapping) lives here.
 */

// Postgres INTEGER (Int4) upper bound — ids beyond this can't exist in the DB.
const MAX_INT4 = 2147483647;

// Parse a route param into a positive integer, or reject the request.
// Bounds-checked so oversized values fail here (400) instead of at the DB.
export function parseId(id: string): number {
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("Invalid ID");
  }
  const parsed = parseInt(id, 10);
  if (!Number.isSafeInteger(parsed) || parsed > MAX_INT4) {
    throw new ValidationError("Invalid ID");
  }
  return parsed;
}

// Pagination bounds: default page size 20, hard cap 100 so a single request
// can never pull an unbounded slice of the table.
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export type Pagination = { limit: number; offset: number };

// Parse ?limit= & ?offset= into a bounded Pagination, or reject with 400.
export function parsePagination(searchParams: URLSearchParams): Pagination {
  const rawLimit = searchParams.get("limit");
  const rawOffset = searchParams.get("offset");

  let limit = DEFAULT_LIMIT;
  if (rawLimit !== null) {
    if (!/^\d+$/.test(rawLimit)) {
      throw new ValidationError("limit must be a non-negative integer");
    }
    limit = parseInt(rawLimit, 10);
    if (limit < 1 || limit > MAX_LIMIT) {
      throw new ValidationError(`limit must be between 1 and ${MAX_LIMIT}`);
    }
  }

  let offset = 0;
  if (rawOffset !== null) {
    if (!/^\d+$/.test(rawOffset) || !Number.isSafeInteger(parseInt(rawOffset, 10))) {
      throw new ValidationError("offset must be a non-negative integer");
    }
    offset = parseInt(rawOffset, 10);
  }

  return { limit, offset };
}

// Parse + validate the JSON body against a Zod schema, returning typed data.
// Throws ValidationError (carrying the flattened issues) on failure.
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
  options?: { rejectEmpty?: boolean }
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten());
  }

  if (options?.rejectEmpty && Object.keys(result.data as object).length === 0) {
    throw new ValidationError("Provide at least one field to update");
  }

  return result.data;
}

// Translate any thrown error into an HTTP Response.
// Known domain errors map to their status; anything else is an unexpected 500.
export function handleError(error: unknown): Response {
  if (error instanceof ValidationError && error.details !== undefined) {
    return Response.json({ errors: error.details }, { status: error.status });
  }

  if (error instanceof AppError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  // Prisma errors that escape the service checks (check-then-act races):
  // P2003 — FK constraint violated (e.g. row referenced/created concurrently).
  if (hasErrorCode(error, "P2003")) {
    return Response.json(
      { error: "Operation conflicts with related data" },
      { status: 409 }
    );
  }
  // P2025 — target row vanished between the existence check and the write.
  if (hasErrorCode(error, "P2025")) {
    return Response.json({ error: "Resource not found" }, { status: 404 });
  }

  console.error("Unhandled error in API route:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
