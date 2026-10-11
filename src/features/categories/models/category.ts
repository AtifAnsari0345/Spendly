import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(40),
  slug: z.string().trim().min(1).max(48),
  icon: z.string().trim().min(1).max(24),
  colorToken: z.string().trim().min(1).max(32),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Category = z.infer<typeof CategorySchema>;
