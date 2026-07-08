import { prisma } from "@/app/lib/prisma";
import type { ZodType } from "zod";

// Parses a route param into a positive integer ID, or null if it isn't one.
export function parseId(id: string): number | null {
  return /^\d+$/.test(id) ? parseInt(id, 10) : null;
}

export function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type IdRouteContext = { params: Promise<{ id: string }> };

// Wraps a /:id route handler with the shared boilerplate:
// parse the ID (400 if malformed), load the entity (404 if missing),
// then hand off to the entity-specific logic.
export function withEntity<T>(
  entityName: string,
  findById: (id: number) => Promise<T | null>,
  handler: (ctx: { id: number; entity: T; request: Request }) => Promise<Response>
) {
  return async (request: Request, { params }: IdRouteContext): Promise<Response> => {
    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (id === null) {
      return errorResponse("Invalid ID", 400);
    }

    const entity = await findById(id);

    if (!entity) {
      return errorResponse(`${entityName} not found`, 404);
    }

    return handler({ id, entity, request });
  };
}

// Parses the request body against a Zod schema.
// Returns the validated data, or a ready-to-send 400 Response on failure.
export async function validateBody<T>(
  request: Request,
  schema: ZodType<T>,
  options?: { rejectEmpty?: boolean }
): Promise<T | Response> {
  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 });
  }

  if (options?.rejectEmpty && Object.keys(result.data as object).length === 0) {
    return errorResponse("Provide at least one field to update", 400);
  }

  return result.data;
}

export async function categoryExists(categoryId: number): Promise<boolean> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  return category !== null;
}

export async function categoryHasProducts(categoryId: number): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: { categoryId },
    select: { id: true },
  });
  return product !== null;
}

export async function isCategoryNameTaken(
  name: string,
  excludeId?: number
): Promise<boolean> {
  const existing = await prisma.category.findFirst({
    where: {
      name,
      ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
}

export async function isProductNameTaken(
  name: string,
  categoryId: number,
  excludeId?: number
): Promise<boolean> {
  const existing = await prisma.product.findFirst({
    where: {
      name,
      categoryId,
      ...(excludeId !== undefined ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
}
