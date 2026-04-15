import { z } from "zod";

export const galleryImageCreateSchema = z.object({
  imageUrl: z.string().url(),
  stateId: z.string().min(1),
  caption: z.string().optional(),
});
