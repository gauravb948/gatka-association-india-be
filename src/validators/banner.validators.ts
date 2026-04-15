import { z } from "zod";

export const bannerCreateBodySchema = z.object({
  imageUrl: z.string().min(1),
  title: z.string().min(1).max(120).optional().nullable(),
  subtitle: z.string().min(1).max(220).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const bannerPatchBodySchema = z.object({
  imageUrl: z.string().min(1).optional(),
  title: z.string().min(1).max(120).optional().nullable(),
  subtitle: z.string().min(1).max(220).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

