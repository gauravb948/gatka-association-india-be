import { z } from "zod";

export const messageCreateSchema = z.object({
  imageUrl: z.string().url().optional(),
  name: z.string().min(1),
  message: z.string().min(1),
  designation: z.string().optional(),
  stateId: z.string().min(1),
});

export const messagePatchSchema = z.object({
  imageUrl: z.string().url().nullable().optional(),
  name: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  designation: z.string().nullable().optional(),
});
