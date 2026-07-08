import type { ZodType } from "zod";
import { AppError, ValidationError } from "@/lib/errors";

/**
 * HTTP-layer helpers shared by the route controllers.
 * Everything web-specific (request parsing, error → Response mapping) lives here.
 */

// Parse a route param into a positive integer, or reject the request.
export function parseId(id: string): number {
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("Invalid ID");
  }
  return parseInt(id, 10);
}

// Parse + validate the JSON body against a Zod schema, returning typed data.
// Throws ValidationError (carrying the flattened issues) on failure.
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
  options?: { rejectEmpty?: boolean }
): Promise<T> {
  const body = await request.json();
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

  console.error("Unhandled error in API route:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
