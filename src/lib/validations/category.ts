import { z } from "zod";

export const CategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must not exceed 50 characters"),
});

// Used for POST — name required
export type CategoryInput = z.infer<typeof CategorySchema>;

// Used for PUT — all fields optional
export type CategoryUpdateInput = z.infer<
  ReturnType<typeof CategorySchema.partial>
>;
