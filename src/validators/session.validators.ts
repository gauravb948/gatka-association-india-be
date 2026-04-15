import { z } from "zod";

export const sessionBodySchema = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().optional(),
});
