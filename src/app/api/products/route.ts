import { ProductSchema } from "@/lib/validations/product";
import { productService } from "@/services/product.service";
import { handleError, parseBody, parsePagination } from "@/lib/http";

// GET /api/products — paged list ({ data, total, limit, offset }),
// optionally filtered by ?category=<name>
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (category !== null && category.trim() === "") {
      return Response.json(
        { error: "category query param cannot be empty" },
        { status: 400 }
      );
    }

    const page = parsePagination(searchParams);
    const result = await productService.list(category ?? undefined, page);
    return Response.json(result);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/products — create a product
export async function POST(request: Request) {
  try {
    const data = await parseBody(request, ProductSchema);
    const product = await productService.create(data);
    return Response.json(product, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
