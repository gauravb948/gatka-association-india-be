import { z } from "zod";

export const createTrainingCenterSchema = z.object({
  name: z.string().min(1),
  isEnabled: z.boolean().optional(),
});

export const patchTrainingCenterSchema = z.object({
  name: z.string().optional(),
  isEnabled: z.boolean().optional(),
});
