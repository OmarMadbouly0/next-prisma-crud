import { ProductSchema } from "@/lib/validations/product";
import { productService } from "@/services/product.service";
import { handleError, parseBody, parseId } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/products/:id — fetch a single product with its category
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const product = await productService.getById(parseId(id));
    return Response.json(product);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/products/:id — update an existing product
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const productId = parseId(id);
    const data = await parseBody(request, ProductSchema.partial(), {
      rejectEmpty: true,
    });
    const product = await productService.update(productId, data);
    return Response.json(product);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/products/:id — delete a product
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    await productService.delete(parseId(id));
    return Response.json({ message: "Product deleted successfully" });
  } catch (error) {
    return handleError(error);
  }
}
