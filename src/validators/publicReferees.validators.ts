import { z } from "zod";

export const publicRefereesListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type PublicRefereesListQuery = z.infer<typeof publicRefereesListQuerySchema>;
