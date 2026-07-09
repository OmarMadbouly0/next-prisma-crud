/**
 * Domain error hierarchy — HTTP-agnostic.
 *
 * Services throw these to signal *what* went wrong; the HTTP layer
 * (lib/http.ts) is solely responsible for translating them into responses.
 * This keeps services free of any web/framework concerns.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

// 400 — the request itself is malformed (bad id, failed schema, empty patch).
export class ValidationError extends AppError {
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message, 400);
    this.details = details;
  }
}

// 404 — a referenced resource does not exist.
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

// 409 — the request conflicts with current state (duplicate, in-use FK).
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

// Structural check for coded errors (e.g. Prisma's P2003/P2025), avoiding a
// runtime dependency on the Prisma error classes outside the data layer.
export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}
