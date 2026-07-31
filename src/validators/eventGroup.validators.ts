import { z } from "zod";

export const eventGroupBodySchema = z.object({
  segment: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "BOYS", "GIRLS"]),
  ageCategoryId: z.string(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const eventBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  minPlayers: z.number().int().min(0).optional(),
  maxPlayers: z.number().int().min(0).optional(),
  optionalPlayers: z.number().int().min(0).optional(),
  totalPlayers: z.number().int().min(0).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
