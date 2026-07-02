import { z } from "zod";

export const ProductSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must not exceed 100 characters"),

  price: z
    .number()
    .positive("Price must be greater than 0")
    .max(999999, "Price must not exceed 999,999")
    .refine(
      (val) => Math.round(val * 100) === val * 100,
      "Price must have at most 2 decimal places"
    ),

  category: z
    .string()
    .min(3, "Category must be at least 3 characters")
    .max(100, "Category must not exceed 100 characters"),
});

// Used for POST — all fields required
export type ProductInput = z.infer<typeof ProductSchema>;

// Used for PUT — all fields optional
export type ProductUpdateInput = z.infer<ReturnType<typeof ProductSchema.partial>>;
