import { z } from "zod";

export const r2PresignPutSchema = z.object({
  fileName: z.string().min(1).max(200).optional(),
  contentType: z.string().min(3).max(120),
  prefix: z.string().min(1).max(60).optional(),
});

