import { z } from "zod";

export const weaponCreateSchema = z.object({
  name: z.string().min(1).max(120),
  namePa: z.string().max(120).optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const weaponPatchSchema = weaponCreateSchema.partial();
