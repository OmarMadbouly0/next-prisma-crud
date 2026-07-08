import { z } from "zod";

export const ProductSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must not exceed 100 characters"),

  price: z
    .number({ message: "Price is required" })
    .positive("Price must be greater than 0")
    .max(999999, "Price must not exceed 999,999")
    .refine(
      (val) => Math.abs(Math.round(val * 100) - val * 100) < 1e-9,
      "Price must have at most 2 decimal places"
    ),

  // categoryId replaces the old "category" string field
  // It's a foreign key — must reference an existing Category row
  categoryId: z
    .number({ message: "Category ID is required" })
    .int("Category ID must be an integer")
    .positive("Category ID must be a positive number"),
});

// Used for POST — all fields required
export type ProductInput = z.infer<typeof ProductSchema>;

// Used for PUT — all fields optional
export type ProductUpdateInput = z.infer<ReturnType<typeof ProductSchema.partial>>;
